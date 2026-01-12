import asyncio
import os
import json
from datetime import datetime
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import inspect, text
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def get_database_schema():
    """Retrieve all tables, columns, and relationships from the database"""
    
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not found in environment variables")
    
    # Create async engine
    engine = create_async_engine(database_url)
    
    schema_info = {}
    
    async with engine.connect() as conn:
        # Get all table names
        result = await conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        """))
        table_names = [row[0] for row in result]
        
        for table_name in table_names:
            schema_info[table_name] = {
                'columns': [],
                'foreign_keys': [],
                'primary_key': [],
                'indexes': [],
                'unique_constraints': []
            }
            
            # Get columns
            result = await conn.execute(text("""
                SELECT 
                    column_name,
                    data_type,
                    character_maximum_length,
                    is_nullable,
                    column_default,
                    ordinal_position,
                    udt_name
                FROM information_schema.columns
                WHERE table_schema = 'public' 
                AND table_name = :table_name
                ORDER BY ordinal_position;
            """), {"table_name": table_name})
            
            columns = result.fetchall()
            for col in columns:
                # Format data type
                data_type = col[1]
                if col[2]:  # character_maximum_length
                    data_type = f"{data_type}({col[2]})"
                elif col[6] and col[6] != col[1]:  # udt_name different from data_type
                    data_type = col[6]
                
                col_info = {
                    'name': col[0],
                    'type': data_type,
                    'nullable': col[3] == 'YES',
                    'default': col[4],
                    'position': col[5]
                }
                schema_info[table_name]['columns'].append(col_info)
            
            # Get primary key
            result = await conn.execute(text("""
                SELECT a.attname
                FROM pg_index i
                JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
                JOIN pg_class c ON c.oid = i.indrelid
                WHERE c.relname = :table_name
                AND i.indisprimary;
            """), {"table_name": table_name})
            
            pk_columns = [row[0] for row in result]
            if pk_columns:
                schema_info[table_name]['primary_key'] = pk_columns
            
            # Get foreign keys
            result = await conn.execute(text("""
                SELECT
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM information_schema.table_constraints AS tc
                JOIN information_schema.key_column_usage AS kcu
                    ON tc.constraint_name = kcu.constraint_name
                    AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                    ON ccu.constraint_name = tc.constraint_name
                    AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY'
                AND tc.table_name = :table_name;
            """), {"table_name": table_name})
            
            fks = result.fetchall()
            fk_dict = {}
            for fk in fks:
                constraint_name = fk[0]
                if constraint_name not in fk_dict:
                    fk_dict[constraint_name] = {
                        'constraint_name': constraint_name,
                        'columns': [],
                        'references_table': fk[2],
                        'references_columns': []
                    }
                fk_dict[constraint_name]['columns'].append(fk[1])
                fk_dict[constraint_name]['references_columns'].append(fk[3])
            
            schema_info[table_name]['foreign_keys'] = list(fk_dict.values())
            
            # Get indexes
            result = await conn.execute(text("""
                SELECT
                    i.relname as index_name,
                    a.attname as column_name,
                    ix.indisunique as is_unique
                FROM pg_class t, pg_class i, pg_index ix, pg_attribute a
                WHERE t.oid = ix.indrelid
                AND i.oid = ix.indexrelid
                AND a.attrelid = t.oid
                AND a.attnum = ANY(ix.indkey)
                AND t.relkind = 'r'
                AND t.relname = :table_name
                ORDER BY t.relname, i.relname, a.attnum;
            """), {"table_name": table_name})
            
            indexes = result.fetchall()
            idx_dict = {}
            for idx in indexes:
                index_name = idx[0]
                if index_name not in idx_dict:
                    idx_dict[index_name] = {
                        'name': index_name,
                        'columns': [],
                        'unique': idx[2]
                    }
                idx_dict[index_name]['columns'].append(idx[1])
            
            schema_info[table_name]['indexes'] = list(idx_dict.values())
    
    await engine.dispose()
    return schema_info

def create_markdown_checklist(schema_info):
    """Create a markdown checklist for all tables and columns"""
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    markdown = f"""# Database Schema Cleanup Checklist
Generated: {timestamp}

## Instructions
1. Mark columns you want to **REMOVE** with [x]
2. Add new table names in parentheses after current names
3. Add any notes about data migration in the comments section
4. Tables marked with [x] will be DROPPED entirely

## Summary
- Total Tables: {len(schema_info)}
- Total Columns: {sum(len(table['columns']) for table in schema_info.values())}

---

## Tables to Drop

"""
    
    # Add table checklist
    for table_name in sorted(schema_info.keys()):
        markdown += f"- [ ] `{table_name}`\n"
    
    markdown += "\n---\n\n"
    
    # Add detailed table information
    for table_name, table_info in sorted(schema_info.items()):
        # Table header
        markdown += f"## Table: `{table_name}` → (new name: _______________)\n\n"
        
        # Table metadata
        if table_info['primary_key']:
            markdown += f"**Primary Key:** {', '.join(table_info['primary_key'])}\n\n"
        
        if table_info['foreign_keys']:
            markdown += "**Foreign Keys:**\n"
            for fk in table_info['foreign_keys']:
                markdown += f"- `{', '.join(fk['columns'])}` → `{fk['references_table']}({', '.join(fk['references_columns'])})` "
                if fk['constraint_name']:
                    markdown += f"[{fk['constraint_name']}]"
                markdown += "\n"
            markdown += "\n"
        
        if table_info['indexes']:
            markdown += "**Indexes:**\n"
            for idx in table_info['indexes']:
                unique = " (UNIQUE)" if idx['unique'] else ""
                markdown += f"- `{idx['name']}` on ({', '.join(idx['columns'])}){unique}\n"
            markdown += "\n"
        
        # Columns checklist
        markdown += "### Columns to Remove:\n\n"
        for col in table_info['columns']:
            nullable = "NULL" if col['nullable'] else "NOT NULL"
            default = f", DEFAULT: {col['default']}" if col['default'] else ""
            
            markdown += f"- [ ] `{col['name']}` - {col['type']}, {nullable}{default}\n"
        
        markdown += "\n### Column Mapping (old → new):\n"
        markdown += "```\n"
        for col in table_info['columns']:
            markdown += f"{col['name']} → \n"
        markdown += "```\n\n"
        
        markdown += "### Migration Notes:\n"
        markdown += "_____________________________\n\n"
        markdown += "---\n\n"
    
    # Add migration strategy section
    markdown += """## Migration Strategy

### Step 1: Create New Schema
```sql
-- Create new tables with desired structure
-- Example:
CREATE TABLE new_table_name (
    id SERIAL PRIMARY KEY,
    -- columns from mapping above
);
```

### Step 2: Data Migration Scripts
```sql
-- Transfer data with column mapping
-- Example:
INSERT INTO new_table_name (new_col1, new_col2)
SELECT old_col1, old_col2
FROM old_table_name
WHERE -- any conditions;
```

### Step 3: Update Foreign Keys
```sql
-- Re-establish relationships
ALTER TABLE new_table_name
ADD CONSTRAINT fk_name
FOREIGN KEY (column_name)
REFERENCES other_table(column_name);
```

### Step 4: Verification
- [ ] Row counts match
- [ ] Data integrity verified
- [ ] Foreign key relationships work
- [ ] Application tests pass

### Step 5: Cleanup
```sql
-- Drop old tables
DROP TABLE IF EXISTS old_table_name CASCADE;
```

### Notes:
_____________________________

## Related Tables Analysis

### Tables with Foreign Key Dependencies:
"""
    
    # Analyze table dependencies
    dependencies = {}
    for table_name, table_info in schema_info.items():
        if table_info['foreign_keys']:
            if table_name not in dependencies:
                dependencies[table_name] = {'references': [], 'referenced_by': []}
            
            for fk in table_info['foreign_keys']:
                ref_table = fk['references_table']
                dependencies[table_name]['references'].append(ref_table)
                
                if ref_table not in dependencies:
                    dependencies[ref_table] = {'references': [], 'referenced_by': []}
                dependencies[ref_table]['referenced_by'].append(table_name)
    
    for table, deps in sorted(dependencies.items()):
        if deps['references'] or deps['referenced_by']:
            markdown += f"\n**{table}:**\n"
            if deps['references']:
                markdown += f"  - References: {', '.join(set(deps['references']))}\n"
            if deps['referenced_by']:
                markdown += f"  - Referenced by: {', '.join(set(deps['referenced_by']))}\n"
    
    return markdown

async def main():
    print("Analyzing database schema...")
    schema_info = await get_database_schema()
    
    print(f"Found {len(schema_info)} tables")
    
    # Create markdown checklist
    checklist = create_markdown_checklist(schema_info)
    
    # Save to file
    output_file = "database_cleanup_checklist.md"
    with open(output_file, 'w') as f:
        f.write(checklist)
    
    print(f"✓ Checklist saved to {output_file}")
    
    # Also save raw schema data as JSON
    json_file = "database_schema.json"
    with open(json_file, 'w') as f:
        json.dump(schema_info, f, indent=2, default=str)
    
    print(f"✓ Raw schema data saved to {json_file}")
    
    # Print summary
    total_columns = sum(len(table['columns']) for table in schema_info.values())
    total_fks = sum(len(table['foreign_keys']) for table in schema_info.values())
    print(f"\nSummary:")
    print(f"- Tables: {len(schema_info)}")
    print(f"- Total columns: {total_columns}")
    print(f"- Foreign key relationships: {total_fks}")

if __name__ == "__main__":
    asyncio.run(main())