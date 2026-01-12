"""Create user tables in the database."""
import asyncio
import asyncpg
from datetime import datetime

async def create_user_tables():
    """Create user tables with proper schema."""
    # Connection to target database
    conn = await asyncpg.connect(
        "postgresql://postgres:bJoOvt4bXdkurANZvTaDsNbbTjxb8i0TeZASA9LLh50vaLj59aGhKYBQ84Bm8ABW@192.168.86.57:5432/nkclarvikkommune"
    )
    
    try:
        # Create users table
        print("Creating users table...")
        await conn.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                hashed_password VARCHAR(255),
                full_name VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                is_superuser BOOLEAN DEFAULT FALSE,
                google_id VARCHAR(255) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Create indexes
        print("Creating indexes...")
        await conn.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
        await conn.execute('CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)')
        
        # Create updated_at trigger function
        print("Creating updated_at trigger...")
        await conn.execute('''
            CREATE OR REPLACE FUNCTION update_updated_at_column()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ language 'plpgsql';
        ''')
        
        # Create trigger for updated_at
        await conn.execute('''
            DROP TRIGGER IF EXISTS update_users_updated_at ON users;
            CREATE TRIGGER update_users_updated_at 
            BEFORE UPDATE ON users 
            FOR EACH ROW 
            EXECUTE PROCEDURE update_updated_at_column();
        ''')
        
        # Verify table creation
        table_exists = await conn.fetchval('''
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            )
        ''')
        
        if table_exists:
            print("✓ Users table created successfully")
            
            # Get column information
            columns = await conn.fetch('''
                SELECT column_name, data_type, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position
            ''')
            
            print("\nTable schema:")
            for col in columns:
                nullable = "NULL" if col['is_nullable'] == 'YES' else "NOT NULL"
                default = f"DEFAULT {col['column_default']}" if col['column_default'] else ""
                print(f"  - {col['column_name']}: {col['data_type']} {nullable} {default}")
        else:
            print("✗ Failed to create users table")
            
    except Exception as e:
        print(f"Error creating user tables: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_user_tables())