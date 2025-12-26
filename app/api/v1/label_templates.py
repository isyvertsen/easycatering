"""Label template API endpoints."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.services.label_template_service import label_template_service
from app.schemas.label_template import (
    LabelTemplate, LabelTemplateCreate, LabelTemplateUpdate, LabelTemplateList,
    TemplateShare, TemplateShareCreate,
    PrintHistory, PrintHistoryCreate,
    PreviewLabelRequest, GenerateLabelRequest, BatchGenerateRequest,
)

router = APIRouter()


# ============ Template CRUD ============

@router.get("/", response_model=List[LabelTemplate])
async def get_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    include_global: bool = Query(True, description="Include global templates"),
    search: Optional[str] = Query(None, description="Search in name and description"),
) -> List[LabelTemplate]:
    """Get all label templates accessible to the current user."""
    templates = await label_template_service.get_user_templates(
        db=db,
        user_id=current_user.id,
        include_global=include_global,
        search=search,
        skip=skip,
        limit=limit
    )
    return templates


@router.get("/{template_id}", response_model=LabelTemplate)
async def get_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplate:
    """Get a label template by ID."""
    template = await label_template_service.get_template(
        db=db,
        template_id=template_id,
        user_id=current_user.id
    )

    if not template:
        raise HTTPException(status_code=404, detail="Mal ikke funnet")

    return template


@router.post("/", response_model=LabelTemplate)
async def create_template(
    data: LabelTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplate:
    """Create a new label template."""
    template = await label_template_service.create_template(
        db=db,
        data=data,
        owner_id=current_user.id
    )
    return template


@router.put("/{template_id}", response_model=LabelTemplate)
async def update_template(
    template_id: int,
    data: LabelTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LabelTemplate:
    """Update a label template."""
    template = await label_template_service.update_template(
        db=db,
        template_id=template_id,
        data=data,
        user_id=current_user.id
    )

    if not template:
        raise HTTPException(
            status_code=404,
            detail="Mal ikke funnet eller du har ikke tilgang til å redigere"
        )

    return template


@router.delete("/{template_id}")
async def delete_template(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Delete a label template."""
    success = await label_template_service.delete_template(
        db=db,
        template_id=template_id,
        user_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Mal ikke funnet eller du har ikke tilgang til å slette"
        )

    return {"message": "Mal slettet"}


# ============ Sharing ============

@router.post("/{template_id}/share", response_model=TemplateShare)
async def share_template(
    template_id: int,
    data: TemplateShareCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TemplateShare:
    """Share a template with another user."""
    share = await label_template_service.share_template(
        db=db,
        template_id=template_id,
        share_data=data,
        owner_id=current_user.id
    )

    if not share:
        raise HTTPException(
            status_code=404,
            detail="Mal ikke funnet eller du har ikke tilgang til å dele"
        )

    return share


@router.get("/{template_id}/shares", response_model=List[TemplateShare])
async def get_template_shares(
    template_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[TemplateShare]:
    """Get all shares for a template."""
    shares = await label_template_service.get_template_shares(
        db=db,
        template_id=template_id,
        user_id=current_user.id
    )
    return shares


@router.delete("/{template_id}/shares/{user_id}")
async def remove_template_share(
    template_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Remove a share from a template."""
    success = await label_template_service.remove_share(
        db=db,
        template_id=template_id,
        shared_with_user_id=user_id,
        owner_id=current_user.id
    )

    if not success:
        raise HTTPException(
            status_code=404,
            detail="Deling ikke funnet eller du har ikke tilgang"
        )

    return {"message": "Deling fjernet"}


# ============ Print History ============

@router.post("/print-history", response_model=PrintHistory)
async def log_print(
    data: PrintHistoryCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PrintHistory:
    """Log a print event."""
    history = await label_template_service.log_print(
        db=db,
        data=data,
        user_id=current_user.id
    )
    return history


@router.get("/print-history/", response_model=List[PrintHistory])
async def get_print_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    template_id: Optional[int] = Query(None, description="Filter by template ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> List[PrintHistory]:
    """Get print history for the current user."""
    history = await label_template_service.get_print_history(
        db=db,
        user_id=current_user.id,
        template_id=template_id,
        skip=skip,
        limit=limit
    )
    return history


# ============ Data Sources ============

@router.get("/sources/tables", response_model=List[str])
async def get_available_tables(
    current_user: User = Depends(get_current_user),
) -> List[str]:
    """Get available tables for parameter data binding."""
    # Whitelist of tables that can be used as data sources
    return [
        "tblprodukter",
        "tblkunder",
        "tblansatte",
        "tblkategorier",
        "tblleverandorer",
    ]


@router.get("/sources/columns")
async def get_table_columns(
    table: str = Query(..., description="Table name"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    """Get columns for a table."""
    # Column mappings for each allowed table
    column_mappings = {
        "tblprodukter": [
            {"name": "produktnavn", "type": "text"},
            {"name": "visningsnavn", "type": "text"},
            {"name": "ean_kode", "type": "text"},
            {"name": "pris", "type": "number"},
            {"name": "lagermengde", "type": "number"},
        ],
        "tblkunder": [
            {"name": "kundenavn", "type": "text"},
            {"name": "adresse", "type": "text"},
            {"name": "postnr", "type": "text"},
            {"name": "poststed", "type": "text"},
            {"name": "telefon", "type": "text"},
        ],
        "tblansatte": [
            {"name": "fornavn", "type": "text"},
            {"name": "etternavn", "type": "text"},
            {"name": "tittel", "type": "text"},
            {"name": "avdeling", "type": "text"},
        ],
        "tblkategorier": [
            {"name": "kategorinavn", "type": "text"},
        ],
        "tblleverandorer": [
            {"name": "leverandornavn", "type": "text"},
            {"name": "adresse", "type": "text"},
            {"name": "telefon", "type": "text"},
        ],
    }

    if table not in column_mappings:
        raise HTTPException(status_code=400, detail="Ugyldig tabell")

    return column_mappings[table]


@router.get("/sources/data")
async def search_source_data(
    table: str = Query(..., description="Table name"),
    column: str = Query(..., description="Column name"),
    search: str = Query("", description="Search term"),
    limit: int = Query(50, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[dict]:
    """Search data in a source table."""
    from sqlalchemy import text

    # Validate table is in whitelist
    allowed_tables = ["tblprodukter", "tblkunder", "tblansatte", "tblkategorier", "tblleverandorer"]
    if table not in allowed_tables:
        raise HTTPException(status_code=400, detail="Ugyldig tabell")

    # Build safe query with parameterized values
    # Note: column name is validated against known columns
    column_mappings = {
        "tblprodukter": ["produktid", "produktnavn", "visningsnavn", "ean_kode", "pris", "lagermengde"],
        "tblkunder": ["kundeid", "kundenavn", "adresse", "postnr", "poststed", "telefon"],
        "tblansatte": ["ansattid", "fornavn", "etternavn", "tittel", "avdeling"],
        "tblkategorier": ["kategoriid", "kategorinavn"],
        "tblleverandorer": ["leverandorid", "leverandornavn", "adresse", "telefon"],
    }

    if column not in column_mappings.get(table, []):
        raise HTTPException(status_code=400, detail="Ugyldig kolonne")

    # Get primary key column
    pk_columns = {
        "tblprodukter": "produktid",
        "tblkunder": "kundeid",
        "tblansatte": "ansattid",
        "tblkategorier": "kategoriid",
        "tblleverandorer": "leverandorid",
    }
    pk_col = pk_columns[table]

    # Safe query using text with proper escaping
    query = text(f"""
        SELECT {pk_col} as id, {column} as value
        FROM {table}
        WHERE {column}::text ILIKE :search
        LIMIT :limit
    """)

    result = await db.execute(query, {"search": f"%{search}%", "limit": limit})
    rows = result.fetchall()

    return [{"id": row.id, "value": row.value, "display": str(row.value)} for row in rows]
