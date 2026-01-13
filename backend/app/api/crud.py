"""Generic CRUD endpoints for all tables."""
import re
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import inspect, select, text, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import class_mapper

from app.infrastructure.database.session import get_db, engine
from app.api.deps import get_current_active_user
from app.schemas.common import PaginatedResponse
from app.domain.entities.user import User

router = APIRouter()

# Regex for valid SQL identifiers (alphanumeric and underscore only)
VALID_IDENTIFIER_PATTERN = re.compile(r'^[a-zA-Z_][a-zA-Z0-9_]*$')


def validate_sql_identifier(identifier: str, identifier_type: str = "identifier") -> str:
    """
    Validate that an identifier is safe to use in SQL queries.

    Args:
        identifier: The identifier to validate (table name, column name, etc.)
        identifier_type: Description for error messages

    Returns:
        The validated identifier

    Raises:
        HTTPException: If the identifier contains invalid characters
    """
    if not identifier or not VALID_IDENTIFIER_PATTERN.match(identifier):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid {identifier_type}: '{identifier}'. Only alphanumeric characters and underscores are allowed."
        )
    return identifier


async def get_table_metadata():
    """Get metadata for all tables."""
    async with engine.begin() as conn:
        # Get all table names
        result = await conn.execute(
            text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
        )
        tables = [row[0] for row in result]
        
        # Get column information for each table
        metadata = {}
        for table in tables:
            col_result = await conn.execute(
                text(f"""
                    SELECT 
                        column_name,
                        data_type,
                        is_nullable,
                        column_default,
                        character_maximum_length
                    FROM information_schema.columns
                    WHERE table_schema = 'public' 
                    AND table_name = :table_name
                    ORDER BY ordinal_position
                """),
                {"table_name": table}
            )
            
            columns = []
            for col in col_result:
                columns.append({
                    "name": col[0],
                    "type": col[1],
                    "nullable": col[2] == "YES",
                    "default": col[3],
                    "max_length": col[4]
                })
            
            metadata[table] = {
                "name": table,
                "columns": columns
            }
    
    return metadata


@router.get("/tables", response_model=List[str])
async def list_tables(
    _: User = Depends(get_current_active_user),
):
    """List all available tables."""
    metadata = await get_table_metadata()
    return list(metadata.keys())


@router.get("/tables/{table_name}/schema")
async def get_table_schema(
    table_name: str,
    _: User = Depends(get_current_active_user),
):
    """Get schema information for a specific table."""
    metadata = await get_table_metadata()
    if table_name not in metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )
    return metadata[table_name]


@router.get("/tables/{table_name}")
async def list_records(
    table_name: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: Optional[str] = None,
    sort_desc: bool = False,
    search: Optional[str] = None,
):
    """List records from a table with pagination."""
    # Validate table name format to prevent SQL injection
    validate_sql_identifier(table_name, "table name")

    # Validate table exists in database
    metadata = await get_table_metadata()
    if table_name not in metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )

    # Get valid column names for this table
    valid_columns = {col["name"] for col in metadata[table_name]["columns"]}

    # Build base query (table_name is now validated)
    query = f"SELECT * FROM {table_name}"
    count_query = f"SELECT COUNT(*) FROM {table_name}"
    params = {}

    # Add search if provided
    if search:
        # Search across all text columns (column names come from metadata, so they're safe)
        text_columns = [
            col["name"] for col in metadata[table_name]["columns"]
            if col["type"] in ["character varying", "text", "character"]
        ]
        if text_columns:
            search_conditions = " OR ".join([
                f"LOWER({col}) LIKE :search" for col in text_columns
            ])
            query += f" WHERE {search_conditions}"
            count_query += f" WHERE {search_conditions}"
            params["search"] = f"%{search.lower()}%"

    # Add sorting (validate sort_by is a valid column)
    if sort_by:
        validate_sql_identifier(sort_by, "sort column")
        if sort_by not in valid_columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid sort column: '{sort_by}'"
            )
        query += f" ORDER BY {sort_by} {'DESC' if sort_desc else 'ASC'}"
    
    # Add pagination
    offset = (page - 1) * page_size
    query += f" LIMIT :limit OFFSET :offset"
    params["limit"] = page_size
    params["offset"] = offset
    
    # Execute queries
    result = await db.execute(text(query), params)
    count_result = await db.execute(text(count_query), {k: v for k, v in params.items() if k != "limit" and k != "offset"})
    
    # Format results
    rows = []
    for row in result:
        rows.append(dict(row._mapping))
    
    total = count_result.scalar()
    
    return PaginatedResponse(
        data=rows,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size
    )


@router.get("/tables/{table_name}/{record_id}")
async def get_record(
    table_name: str,
    record_id: Any,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Get a single record by ID."""
    # Validate table name format to prevent SQL injection
    validate_sql_identifier(table_name, "table name")

    # Validate table exists
    metadata = await get_table_metadata()
    if table_name not in metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )
    
    # Find primary key column
    pk_result = await db.execute(
        text("""
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_schema = 'public' 
            AND table_name = :table_name
            AND constraint_name LIKE '%_pkey'
            LIMIT 1
        """),
        {"table_name": table_name}
    )
    pk_column = pk_result.scalar()
    
    if not pk_column:
        # Fallback to common ID column names
        id_columns = ["id", "ID", table_name[:-1] + "ID" if table_name.endswith("s") else table_name + "ID"]
        for col in metadata[table_name]["columns"]:
            if col["name"] in id_columns:
                pk_column = col["name"]
                break
    
    if not pk_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No primary key found for table '{table_name}'"
        )
    
    # Get record
    query = f"SELECT * FROM {table_name} WHERE {pk_column} = :id"
    result = await db.execute(text(query), {"id": record_id})
    row = result.first()
    
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Record not found"
        )
    
    return dict(row._mapping)


@router.post("/tables/{table_name}")
async def create_record(
    table_name: str,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Create a new record."""
    # Validate table name format to prevent SQL injection
    validate_sql_identifier(table_name, "table name")

    # Validate table exists
    metadata = await get_table_metadata()
    if table_name not in metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )

    # Validate columns exist in table and have valid format
    table_columns = {col["name"] for col in metadata[table_name]["columns"]}
    for col_name in data.keys():
        validate_sql_identifier(col_name, "column name")
    invalid_columns = set(data.keys()) - table_columns
    if invalid_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid columns: {', '.join(invalid_columns)}"
        )

    # Build insert query (all identifiers are now validated)
    columns = list(data.keys())
    values = list(data.values())
    placeholders = [f":{i}" for i in range(len(values))]

    query = f"""
        INSERT INTO {table_name} ({', '.join(columns)})
        VALUES ({', '.join(placeholders)})
        RETURNING *
    """
    
    params = {str(i): v for i, v in enumerate(values)}
    
    try:
        result = await db.execute(text(query), params)
        await db.commit()
        row = result.first()
        return dict(row._mapping)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put("/tables/{table_name}/{record_id}")
async def update_record(
    table_name: str,
    record_id: Any,
    data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Update an existing record."""
    # Validate table name format to prevent SQL injection
    validate_sql_identifier(table_name, "table name")

    # Validate table exists
    metadata = await get_table_metadata()
    if table_name not in metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )

    # Find primary key column
    pk_result = await db.execute(
        text("""
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_schema = 'public'
            AND table_name = :table_name
            AND constraint_name LIKE '%_pkey'
            LIMIT 1
        """),
        {"table_name": table_name}
    )
    pk_column = pk_result.scalar()

    if not pk_column:
        # Fallback to common ID column names
        id_columns = ["id", "ID", table_name[:-1] + "ID" if table_name.endswith("s") else table_name + "ID"]
        for col in metadata[table_name]["columns"]:
            if col["name"] in id_columns:
                pk_column = col["name"]
                break

    if not pk_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No primary key found for table '{table_name}'"
        )

    # Validate columns exist in table and have valid format
    table_columns = {col["name"] for col in metadata[table_name]["columns"]}
    for col_name in data.keys():
        validate_sql_identifier(col_name, "column name")
    invalid_columns = set(data.keys()) - table_columns
    if invalid_columns:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid columns: {', '.join(invalid_columns)}"
        )

    # Build update query (all identifiers are now validated)
    set_clauses = [f"{col} = :{i}" for i, col in enumerate(data.keys())]

    query = f"""
        UPDATE {table_name}
        SET {', '.join(set_clauses)}
        WHERE {pk_column} = :id
        RETURNING *
    """
    
    params = {str(i): v for i, v in enumerate(data.values())}
    params["id"] = record_id
    
    try:
        result = await db.execute(text(query), params)
        await db.commit()
        row = result.first()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found"
            )
        
        return dict(row._mapping)
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/tables/{table_name}/{record_id}")
async def delete_record(
    table_name: str,
    record_id: Any,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_active_user),
):
    """Delete a record."""
    # Validate table name format to prevent SQL injection
    validate_sql_identifier(table_name, "table name")

    # Validate table exists
    metadata = await get_table_metadata()
    if table_name not in metadata:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Table '{table_name}' not found"
        )

    # Find primary key column
    pk_result = await db.execute(
        text("""
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_schema = 'public'
            AND table_name = :table_name
            AND constraint_name LIKE '%_pkey'
            LIMIT 1
        """),
        {"table_name": table_name}
    )
    pk_column = pk_result.scalar()

    if not pk_column:
        # Fallback to common ID column names
        id_columns = ["id", "ID", table_name[:-1] + "ID" if table_name.endswith("s") else table_name + "ID"]
        for col in metadata[table_name]["columns"]:
            if col["name"] in id_columns:
                pk_column = col["name"]
                break

    if not pk_column:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No primary key found for table '{table_name}'"
        )

    # Delete record (table_name and pk_column are validated)
    query = f"DELETE FROM {table_name} WHERE {pk_column} = :id RETURNING {pk_column}"
    
    try:
        result = await db.execute(text(query), {"id": record_id})
        await db.commit()
        
        if not result.first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Record not found"
            )
        
        return {"message": "Record deleted successfully"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )