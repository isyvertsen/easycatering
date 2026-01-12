"""Create initial admin user."""
import asyncio
import asyncpg
from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin_user():
    """Create initial admin user."""
    # Connection to database
    conn = await asyncpg.connect(
        "postgresql://postgres:gNh93csf8Erst6RcO6oNFcdYiQcA59OR@norskmatlevering.no:5432/catering_db_full"
    )
    
    try:
        # Admin user details
        email = "admin@larvikkommune.no"
        password = "admin123"  # Change this in production!
        full_name = "System Administrator"
        
        # Check if admin already exists
        existing = await conn.fetchval(
            "SELECT id FROM users WHERE email = $1",
            email
        )
        
        if existing:
            print(f"Admin user already exists with ID: {existing}")
            return
        
        # Hash password
        hashed_password = pwd_context.hash(password)
        
        # Create admin user
        user_id = await conn.fetchval('''
            INSERT INTO users (email, hashed_password, full_name, is_active, is_superuser)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
        ''', email, hashed_password, full_name, True, True)
        
        print(f"✓ Admin user created successfully!")
        print(f"  ID: {user_id}")
        print(f"  Email: {email}")
        print(f"  Password: {password}")
        print(f"  Full Name: {full_name}")
        print("\n⚠️  Please change the password after first login!")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")
        raise
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(create_admin_user())