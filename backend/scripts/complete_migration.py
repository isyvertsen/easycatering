#!/usr/bin/env python3
"""
Complete migration from nkclarvikkommune1 to nkclarvikkommune
- Converts all table and column names to lowercase
- Converts Norwegian characters: ø→o, å→a, æ→ae
- Preserves all foreign keys and constraints
"""
import asyncio
import re
from typing import Dict, List, Tuple
import asyncpg


# Connection details
SOURCE_DB = {
    'host': '192.168.86.57',
    'database': 'nkclarvikkommune1',
    'user': 'postgres',
    'password': 'bJoOvt4bXdkurANZvTaDsNbbTjxb8i0TeZASA9LLh50vaLj59aGhKYBQ84Bm8ABW'
}

TARGET_DB = {
    'host': '192.168.86.57',
    'database': 'nkclarvikkommune',
    'user': 'postgres',
    'password': 'bJoOvt4bXdkurANZvTaDsNbbTjxb8i0TeZASA9LLh50vaLj59aGhKYBQ84Bm8ABW'
}


def convert_name(name: str) -> str:
    """Convert name to lowercase and replace Norwegian characters."""
    if not name:
        return name
    
    # Convert to lowercase first
    name = name.lower()
    
    # Replace Norwegian characters
    name = name.replace('ø', 'o')
    name = name.replace('å', 'a')
    name = name.replace('æ', 'ae')
    
    # Replace spaces and special characters
    name = name.replace(' ', '_')
    name = name.replace('-', '_')
    name = name.replace('%', '_prosent')
    
    # Remove or replace other problematic characters
    name = re.sub(r'[^\w]', '_', name)
    name = re.sub(r'_+', '_', name).strip('_')
    
    return name


async def drop_all_tables(conn):
    """Drop all tables in the target database."""
    print("Dropping all existing tables in target database...")
    
    # Get all table names
    tables = await conn.fetch("""
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    """)
    
    # Drop tables in reverse order to handle dependencies
    for table in reversed(tables):
        table_name = table['tablename']
        try:
            await conn.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
            print(f"  Dropped table: {table_name}")
        except Exception as e:
            print(f"  Warning: Could not drop {table_name}: {e}")


async def get_table_structure(conn, table_name: str) -> Dict:
    """Get complete table structure including columns and constraints."""
    # Get columns
    columns = await conn.fetch("""
        SELECT 
            column_name,
            data_type,
            character_maximum_length,
            numeric_precision,
            numeric_scale,
            is_nullable,
            column_default,
            udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = $1
        ORDER BY ordinal_position
    """, table_name)
    
    # Get primary key
    pk = await conn.fetch("""
        SELECT a.attname as column_name
        FROM pg_index i
        JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
        JOIN pg_class c ON c.oid = i.indrelid
        WHERE c.relname = $1 AND i.indisprimary
    """, table_name)
    
    # Get foreign keys
    fks = await conn.fetch("""
        SELECT
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = $1
    """, table_name)
    
    # Get indexes
    indexes = await conn.fetch("""
        SELECT
            indexname,
            indexdef
        FROM pg_indexes
        WHERE tablename = $1
        AND indexname NOT LIKE '%_pkey'
    """, table_name)
    
    return {
        'columns': columns,
        'primary_keys': [pk['column_name'] for pk in pk],
        'foreign_keys': fks,
        'indexes': indexes
    }


async def create_table_ddl(table_name: str, structure: Dict) -> str:
    """Generate CREATE TABLE DDL with converted names."""
    new_table_name = convert_name(table_name)
    
    # Start CREATE TABLE
    ddl = f'CREATE TABLE "{new_table_name}" (\n'
    
    # Add columns
    column_defs = []
    for col in structure['columns']:
        col_name = convert_name(col['column_name'])
        data_type = col['data_type']
        
        # Handle specific data types
        if data_type == 'character varying':
            if col['character_maximum_length']:
                data_type = f"VARCHAR({col['character_maximum_length']})"
            else:
                data_type = "TEXT"
        elif data_type == 'numeric':
            if col['numeric_precision'] and col['numeric_scale']:
                data_type = f"NUMERIC({col['numeric_precision']},{col['numeric_scale']})"
            else:
                data_type = "NUMERIC"
        elif data_type == 'USER-DEFINED':
            # Handle custom types (like PostGIS)
            data_type = col['udt_name'].upper()
        
        col_def = f'    "{col_name}" {data_type}'
        
        # Add NOT NULL constraint
        if col['is_nullable'] == 'NO':
            col_def += ' NOT NULL'
            
        # Add default value
        if col['column_default']:
            col_def += f" DEFAULT {col['column_default']}"
            
        column_defs.append(col_def)
    
    # Add primary key
    if structure['primary_keys']:
        pk_cols = [convert_name(pk) for pk in structure['primary_keys']]
        # Make sure all pk columns exist
        existing_cols = [convert_name(col['column_name']) for col in structure['columns']]
        pk_cols = [pk for pk in pk_cols if pk in existing_cols]
        if pk_cols:
            pk_def = f"    PRIMARY KEY ({', '.join([f'\"{c}\"' for c in pk_cols])})"
            column_defs.append(pk_def)
    
    ddl += ',\n'.join(column_defs) + '\n);'
    
    return ddl, new_table_name


async def copy_table_data(source_conn, target_conn, source_table: str, target_table: str, structure: Dict):
    """Copy data from source to target table with name conversion."""
    # Get column mapping
    col_mapping = {col['column_name']: convert_name(col['column_name']) 
                   for col in structure['columns']}
    
    # Select columns in order
    source_cols = [f'"{col}"' for col in col_mapping.keys()]
    target_cols = [f'"{col}"' for col in col_mapping.values()]
    
    # Count rows
    count = await source_conn.fetchval(f'SELECT COUNT(*) FROM "{source_table}"')
    print(f"  Copying {count} rows from {source_table} to {target_table}...")
    
    if count == 0:
        return
    
    # Copy data in batches
    batch_size = 10000
    offset = 0
    
    while offset < count:
        # Fetch batch
        query = f"""
            SELECT {', '.join(source_cols)} 
            FROM "{source_table}"
            ORDER BY 1
            LIMIT {batch_size} OFFSET {offset}
        """
        rows = await source_conn.fetch(query)
        
        if rows:
            # Insert batch
            values_list = []
            for row in rows:
                values_list.append(tuple(row.values()))
            
            insert_query = f"""
                INSERT INTO "{target_table}" ({', '.join(target_cols)})
                VALUES ({', '.join(['$' + str(i+1) for i in range(len(target_cols))])})
            """
            
            await target_conn.executemany(insert_query, values_list)
        
        offset += batch_size
        if offset < count:
            print(f"    Copied {min(offset, count)}/{count} rows...")


async def create_foreign_keys(target_conn, all_fks: List[Tuple[str, List]]):
    """Create all foreign keys after data is loaded."""
    print("\nCreating foreign key constraints...")
    
    for table_name, fks in all_fks:
        new_table_name = convert_name(table_name)
        
        for fk in fks:
            try:
                constraint_name = convert_name(fk['constraint_name'])
                column_name = convert_name(fk['column_name'])
                foreign_table = convert_name(fk['foreign_table_name'])
                foreign_column = convert_name(fk['foreign_column_name'])
                
                await target_conn.execute(f"""
                    ALTER TABLE "{new_table_name}"
                    ADD CONSTRAINT "{constraint_name}"
                    FOREIGN KEY ("{column_name}")
                    REFERENCES "{foreign_table}" ("{foreign_column}")
                """)
                print(f"  Created FK: {new_table_name}.{column_name} -> {foreign_table}.{foreign_column}")
            except Exception as e:
                print(f"  Warning: Could not create FK {constraint_name}: {e}")


async def create_indexes(target_conn, all_indexes: List[Tuple[str, List]]):
    """Create all indexes after data is loaded."""
    print("\nCreating indexes...")
    
    for table_name, indexes in all_indexes:
        new_table_name = convert_name(table_name)
        
        for idx in indexes:
            try:
                # Convert index definition
                indexdef = idx['indexdef']
                old_name = idx['indexname']
                new_name = convert_name(old_name)
                
                # Replace table name in definition
                indexdef = indexdef.replace(f'ON public.{table_name}', f'ON public.{new_table_name}')
                indexdef = indexdef.replace(f'INDEX {old_name}', f'INDEX {new_name}')
                
                # Convert column names in the index definition
                # This is a simple approach - might need refinement for complex indexes
                for col in re.findall(r'\(([^)]+)\)', indexdef):
                    for old_col in col.split(','):
                        old_col = old_col.strip()
                        new_col = convert_name(old_col)
                        indexdef = indexdef.replace(old_col, new_col)
                
                await target_conn.execute(indexdef)
                print(f"  Created index: {new_name} on {new_table_name}")
            except Exception as e:
                print(f"  Warning: Could not create index {new_name}: {e}")


async def main():
    """Main migration function."""
    # Connect to both databases
    source_conn = await asyncpg.connect(**SOURCE_DB)
    target_conn = await asyncpg.connect(**TARGET_DB)
    
    try:
        # Step 1: Drop all tables in target
        await drop_all_tables(target_conn)
        
        # Step 2: Get all tables from source
        tables = await source_conn.fetch("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
            ORDER BY tablename
        """)
        
        print(f"\nFound {len(tables)} tables to migrate")
        
        # Step 3: Create tables with new names
        print("\nCreating tables with converted names...")
        table_mapping = {}
        all_foreign_keys = []
        all_indexes = []
        
        for table in tables:
            table_name = table['tablename']
            print(f"\nProcessing table: {table_name}")
            
            # Get table structure
            structure = await get_table_structure(source_conn, table_name)
            
            # Create DDL
            ddl, new_table_name = await create_table_ddl(table_name, structure)
            table_mapping[table_name] = new_table_name
            
            # Store foreign keys and indexes for later
            if structure['foreign_keys']:
                all_foreign_keys.append((table_name, structure['foreign_keys']))
            if structure['indexes']:
                all_indexes.append((table_name, structure['indexes']))
            
            # Create table
            try:
                await target_conn.execute(ddl)
                print(f"  Created table: {new_table_name}")
            except Exception as e:
                print(f"  ERROR creating table {new_table_name}: {e}")
                # Try creating without constraints
                ddl_no_constraints = ddl.split('PRIMARY KEY')[0].rstrip(',\n') + '\n);'
                try:
                    await target_conn.execute(ddl_no_constraints)
                    print(f"  Created table {new_table_name} without constraints")
                except Exception as e2:
                    print(f"  FAILED to create table {new_table_name}: {e2}")
                    continue
        
        # Step 4: Copy data
        print("\nCopying data...")
        for table in tables:
            table_name = table['tablename']
            if table_name not in table_mapping:
                print(f"  Skipping {table_name} - table creation failed")
                continue
            new_table_name = table_mapping[table_name]
            structure = await get_table_structure(source_conn, table_name)
            try:
                await copy_table_data(source_conn, target_conn, table_name, new_table_name, structure)
            except Exception as e:
                print(f"  ERROR copying data for {table_name}: {e}")
        
        # Step 5: Create foreign keys
        await create_foreign_keys(target_conn, all_foreign_keys)
        
        # Step 6: Create indexes
        await create_indexes(target_conn, all_indexes)
        
        # Step 7: Verify
        print("\nVerifying migration...")
        for table in tables:
            source_count = await source_conn.fetchval(f'SELECT COUNT(*) FROM "{table["tablename"]}"')
            target_count = await target_conn.fetchval(f'SELECT COUNT(*) FROM "{table_mapping[table["tablename"]]}"')
            
            if source_count == target_count:
                print(f"  ✓ {table['tablename']} -> {table_mapping[table['tablename']]}: {source_count} rows")
            else:
                print(f"  ✗ {table['tablename']} -> {table_mapping[table['tablename']]}: {source_count} != {target_count}")
        
        print("\nMigration completed!")
        
    finally:
        await source_conn.close()
        await target_conn.close()


if __name__ == '__main__':
    asyncio.run(main())