"""Database migration system that runs on startup."""
import asyncio
from datetime import datetime
from typing import List, Dict, Any
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine
import logging

logger = logging.getLogger(__name__)


class Migration:
    """Base class for migrations."""
    
    def __init__(self, version: str, description: str):
        self.version = version
        self.description = description
    
    async def up(self, engine: AsyncEngine):
        """Apply the migration."""
        raise NotImplementedError
    
    async def down(self, engine: AsyncEngine):
        """Rollback the migration (optional)."""
        pass


class MigrationRunner:
    """Handles running migrations on application startup."""
    
    def __init__(self, engine: AsyncEngine):
        self.engine = engine
        self.migrations: List[Migration] = []
    
    def add_migration(self, migration: Migration):
        """Add a migration to be run."""
        self.migrations.append(migration)
    
    async def init_migration_table(self):
        """Create the migrations tracking table if it doesn't exist."""
        async with self.engine.begin() as conn:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS _migrations (
                    version VARCHAR(50) PRIMARY KEY,
                    description TEXT,
                    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))
            logger.info("Migration table initialized")
    
    async def get_applied_migrations(self) -> List[str]:
        """Get list of already applied migration versions."""
        async with self.engine.connect() as conn:
            result = await conn.execute(text("SELECT version FROM _migrations"))
            return [row[0] for row in result]
    
    async def mark_migration_applied(self, migration: Migration):
        """Mark a migration as applied."""
        async with self.engine.begin() as conn:
            await conn.execute(
                text("""
                    INSERT INTO _migrations (version, description) 
                    VALUES (:version, :description)
                """),
                {"version": migration.version, "description": migration.description}
            )
    
    async def run_migrations(self):
        """Run all pending migrations."""
        try:
            # Initialize migration table
            await self.init_migration_table()
            
            # Get already applied migrations
            applied = await self.get_applied_migrations()
            
            # Sort migrations by version
            self.migrations.sort(key=lambda m: m.version)
            
            # Run pending migrations
            for migration in self.migrations:
                if migration.version not in applied:
                    logger.info(f"Running migration {migration.version}: {migration.description}")
                    try:
                        await migration.up(self.engine)
                        await self.mark_migration_applied(migration)
                        logger.info(f"Migration {migration.version} completed successfully")
                    except Exception as e:
                        logger.error(f"Migration {migration.version} failed: {str(e)}")
                        raise
                else:
                    logger.debug(f"Migration {migration.version} already applied, skipping")
            
            logger.info("All migrations completed successfully")
            
        except Exception as e:
            logger.error(f"Migration runner failed: {str(e)}")
            raise


# Define migrations
class AddProductVendorFields(Migration):
    """Add vendor-specific fields to products table."""
    
    def __init__(self):
        super().__init__(
            version="20241702_001_add_vendor_fields",
            description="Add vendor-specific fields to products table"
        )
    
    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add new columns
            await conn.execute(text("""
                ALTER TABLE products 
                ADD COLUMN IF NOT EXISTS productdescription TEXT,
                ADD COLUMN IF NOT EXISTS countryoforigin VARCHAR(100),
                ADD COLUMN IF NOT EXISTS countryofpreparation VARCHAR(100),
                ADD COLUMN IF NOT EXISTS fpakk VARCHAR(20),
                ADD COLUMN IF NOT EXISTS dpakk VARCHAR(20),
                ADD COLUMN IF NOT EXISTS pall VARCHAR(20),
                ADD COLUMN IF NOT EXISTS created VARCHAR(50),
                ADD COLUMN IF NOT EXISTS updated VARCHAR(50)
            """))
            
            # Add unique constraint on GTIN if not exists
            await conn.execute(text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'products_gtin_key'
                    ) THEN
                        ALTER TABLE products 
                        ADD CONSTRAINT products_gtin_key UNIQUE (gtin);
                    END IF;
                END $$
            """))
            
            # Add index on GTIN for faster lookups
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_products_gtin ON products(gtin)
            """))


class AddMissingNutrientColumns(Migration):
    """Ensure nutrients table has all required columns."""

    def __init__(self):
        super().__init__(
            version="20241702_002_add_nutrient_columns",
            description="Add missing columns to nutrients table"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Check if measurementtype column exists
            result = await conn.execute(text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_name = 'nutrients'
                AND column_name = 'measurementtype'
            """))

            if not result.first():
                await conn.execute(text("""
                    ALTER TABLE nutrients
                    ADD COLUMN measurementtype VARCHAR(50)
                """))


class AddUniqueConstraintToGTIN(Migration):
    """Add unique constraint to GTIN column and remove duplicates."""

    def __init__(self):
        super().__init__(
            version="20250929_002_gtin_unique_constraint",
            description="Add unique constraint to GTIN column in matinfo_gtin_updates"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # First, check if the table exists
            result = await conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables
                    WHERE table_name = 'matinfo_gtin_updates'
                )
            """))
            table_exists = result.scalar()

            if table_exists:
                # Remove duplicates, keeping the most recent one
                await conn.execute(text("""
                    DELETE FROM matinfo_gtin_updates
                    WHERE id NOT IN (
                        SELECT MAX(id)
                        FROM matinfo_gtin_updates
                        GROUP BY gtin
                    )
                """))

                # Drop old index if exists
                await conn.execute(text("""
                    DROP INDEX IF EXISTS idx_matinfo_gtin
                """))

                # Create unique index
                await conn.execute(text("""
                    CREATE UNIQUE INDEX IF NOT EXISTS idx_matinfo_gtin_unique ON matinfo_gtin_updates(gtin)
                """))


class CreateMatinfoTrackingTables(Migration):
    """Create tables for tracking Matinfo GTIN updates."""

    def __init__(self):
        super().__init__(
            version="20250929_001_matinfo_tracking",
            description="Create Matinfo GTIN tracking tables"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create matinfo_gtin_updates table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS matinfo_gtin_updates (
                    id SERIAL PRIMARY KEY,
                    gtin VARCHAR(20) NOT NULL,
                    update_date TIMESTAMP NOT NULL,
                    sync_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    synced BOOLEAN DEFAULT FALSE,
                    sync_status VARCHAR(50),
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))

            # Create indexes and unique constraint for matinfo_gtin_updates
            await conn.execute(text("""
                CREATE UNIQUE INDEX IF NOT EXISTS idx_matinfo_gtin_unique ON matinfo_gtin_updates(gtin)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_matinfo_sync_status ON matinfo_gtin_updates(sync_status)
            """))

            # Create matinfo_sync_logs table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS matinfo_sync_logs (
                    id SERIAL PRIMARY KEY,
                    sync_type VARCHAR(50),
                    start_date TIMESTAMP NOT NULL,
                    end_date TIMESTAMP,
                    since_date TIMESTAMP,
                    total_gtins INTEGER DEFAULT 0,
                    synced_count INTEGER DEFAULT 0,
                    failed_count INTEGER DEFAULT 0,
                    status VARCHAR(50),
                    error_message TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for matinfo_sync_logs
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_sync_log_status ON matinfo_sync_logs(status)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_sync_log_created ON matinfo_sync_logs(created_at)
            """))


class AddRettKomponentField(Migration):
    """Add rett_komponent field to tblprodukter table."""

    def __init__(self):
        super().__init__(
            version="20251022_001_add_rett_komponent",
            description="Add rett_komponent boolean field to tblprodukter table"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add rett_komponent column with default value FALSE
            await conn.execute(text("""
                ALTER TABLE tblprodukter
                ADD COLUMN IF NOT EXISTS rett_komponent BOOLEAN DEFAULT FALSE
            """))

            # Add index for faster filtering
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tblprodukter_rett_komponent
                ON tblprodukter(rett_komponent)
            """))


class CreateCombinedDishTables(Migration):
    """Create tables for storing combined dishes."""

    def __init__(self):
        super().__init__(
            version="20251023_001_combined_dishes",
            description="Create combined_dishes, combined_dish_recipes, and combined_dish_products tables"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create combined_dishes table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS combined_dishes (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    created_by_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL
                )
            """))

            # Create index on name for faster searches
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_combined_dishes_name ON combined_dishes(name)
            """))

            # Create combined_dish_recipes table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS combined_dish_recipes (
                    id SERIAL PRIMARY KEY,
                    combined_dish_id INTEGER NOT NULL REFERENCES combined_dishes(id) ON DELETE CASCADE,
                    kalkylekode INTEGER NOT NULL REFERENCES tbl_rpkalkyle(kalkylekode),
                    amount_grams FLOAT NOT NULL
                )
            """))

            # Create index on combined_dish_id for faster lookups
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_combined_dish_recipes_dish_id
                ON combined_dish_recipes(combined_dish_id)
            """))

            # Create combined_dish_products table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS combined_dish_products (
                    id SERIAL PRIMARY KEY,
                    combined_dish_id INTEGER NOT NULL REFERENCES combined_dishes(id) ON DELETE CASCADE,
                    produktid INTEGER NOT NULL REFERENCES tblprodukter(produktid),
                    amount_grams FLOAT NOT NULL
                )
            """))

            # Create index on combined_dish_id for faster lookups
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_combined_dish_products_dish_id
                ON combined_dish_products(combined_dish_id)
            """))


class AddPreparationInstructionsToCombinedDishes(Migration):
    """Add preparation_instructions field to combined_dishes table."""

    def __init__(self):
        super().__init__(
            version="20251023_002_add_preparation_instructions",
            description="Add preparation_instructions text field to combined_dishes table"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add preparation_instructions column
            await conn.execute(text("""
                ALTER TABLE combined_dishes
                ADD COLUMN IF NOT EXISTS preparation_instructions TEXT
            """))


class CreatePreparationInstructionsTable(Migration):
    """Create table for managing preparation instructions."""

    def __init__(self):
        super().__init__(
            version="20251023_003_preparation_instructions_table",
            description="Create preparation_instructions table with predefined instructions"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS preparation_instructions (
                    id SERIAL PRIMARY KEY,
                    text VARCHAR(500) NOT NULL,
                    is_active BOOLEAN DEFAULT TRUE NOT NULL,
                    ai_enhanced BOOLEAN DEFAULT FALSE NOT NULL,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create index on is_active for faster filtering
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_preparation_instructions_active
                ON preparation_instructions(is_active)
            """))

            # Seed with initial instructions
            await conn.execute(text("""
                INSERT INTO preparation_instructions (text, is_active, ai_enhanced)
                VALUES
                    ('Varmes i ovn 180°C i 15-20 minutter', TRUE, FALSE),
                    ('Varmes i mikrobølgeovn på full effekt i 3-4 minutter', TRUE, FALSE),
                    ('Serveres kald', TRUE, FALSE),
                    ('Varmes forsiktig under omrøring', TRUE, FALSE),
                    ('Tines i kjøleskap over natten', TRUE, FALSE),
                    ('Oppvarmes til minimum 75°C', TRUE, FALSE),
                    ('Varmes i vannbad i 10 minutter', TRUE, FALSE)
                ON CONFLICT DO NOTHING
            """))


# Create singleton migration runner
migration_runner = None


def get_migration_runner(engine: AsyncEngine) -> MigrationRunner:
    """Get or create the migration runner."""
    global migration_runner
    if migration_runner is None:
        migration_runner = MigrationRunner(engine)
        # Add all migrations
        migration_runner.add_migration(AddProductVendorFields())
        migration_runner.add_migration(AddMissingNutrientColumns())
        migration_runner.add_migration(CreateMatinfoTrackingTables())
        migration_runner.add_migration(AddUniqueConstraintToGTIN())
        migration_runner.add_migration(CreateMatinfoProductTables())
        migration_runner.add_migration(AddRettKomponentField())
        migration_runner.add_migration(CreateCombinedDishTables())
        migration_runner.add_migration(AddPreparationInstructionsToCombinedDishes())
        migration_runner.add_migration(CreatePreparationInstructionsTable())
        migration_runner.add_migration(CreateLabelTemplateTables())
        migration_runner.add_migration(AddPrinterConfigToLabelTemplates())
        migration_runner.add_migration(AddAnsattIdAndRolleToUsers())
        migration_runner.add_migration(AddSequenceToTblperiode())
        migration_runner.add_migration(AddSequenceToTblordrer())
        migration_runner.add_migration(CreateCustomerAccessTokensTable())
    return migration_runner


class CreateMatinfoProductTables(Migration):
    """Create tables for storing Matinfo product data."""

    def __init__(self):
        super().__init__(
            version="20250929_003_matinfo_products",
            description="Create Matinfo product, nutrient, and allergen tables"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create matinfo_products table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS matinfo_products (
                    id SERIAL PRIMARY KEY,
                    gtin VARCHAR(20) NOT NULL UNIQUE,
                    name VARCHAR(255),
                    item_number VARCHAR(50),
                    epd_number VARCHAR(50),
                    producer_name VARCHAR(255),
                    provider_name VARCHAR(255),
                    brand_name VARCHAR(255),
                    ingredient_statement TEXT,
                    product_url VARCHAR(500),
                    product_description TEXT,
                    country_of_origin VARCHAR(100),
                    country_of_preparation VARCHAR(100),
                    fpakk VARCHAR(20),
                    dpakk VARCHAR(20),
                    pall VARCHAR(20),
                    matinfo_created VARCHAR(50),
                    matinfo_updated VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))

            # Create indexes for matinfo_products
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_matinfo_products_gtin ON matinfo_products(gtin)
            """))

            # Create matinfo_nutrients table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS matinfo_nutrients (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES matinfo_products(id) ON DELETE CASCADE,
                    gtin VARCHAR(20),
                    code VARCHAR(50),
                    name VARCHAR(255),
                    measurement NUMERIC(10, 2),
                    measurement_precision VARCHAR(50),
                    measurement_type VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for matinfo_nutrients
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_matinfo_nutrients_product_id ON matinfo_nutrients(product_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_matinfo_nutrients_gtin ON matinfo_nutrients(gtin)
            """))

            # Create matinfo_allergens table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS matinfo_allergens (
                    id SERIAL PRIMARY KEY,
                    product_id INTEGER NOT NULL REFERENCES matinfo_products(id) ON DELETE CASCADE,
                    gtin VARCHAR(20),
                    code VARCHAR(50),
                    name VARCHAR(255),
                    level VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for matinfo_allergens
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_matinfo_allergens_product_id ON matinfo_allergens(product_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_matinfo_allergens_gtin ON matinfo_allergens(gtin)
            """))


class CreateLabelTemplateTables(Migration):
    """Create tables for label template designer."""

    def __init__(self):
        super().__init__(
            version="20251224_001_label_templates",
            description="Create label template, parameter, share, and print history tables"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create label_templates table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS label_templates (
                    id BIGSERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    template_json JSONB NOT NULL,
                    width_mm NUMERIC(10, 2) DEFAULT 100,
                    height_mm NUMERIC(10, 2) DEFAULT 50,
                    owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    is_global BOOLEAN DEFAULT FALSE,
                    thumbnail_url VARCHAR(500),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP
                )
            """))

            # Create indexes for label_templates
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_label_templates_owner_id ON label_templates(owner_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_label_templates_is_global ON label_templates(is_global)
            """))

            # Create template_parameters table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS template_parameters (
                    id BIGSERIAL PRIMARY KEY,
                    template_id BIGINT NOT NULL REFERENCES label_templates(id) ON DELETE CASCADE,
                    field_name VARCHAR(100) NOT NULL,
                    display_name VARCHAR(255) NOT NULL,
                    parameter_type VARCHAR(50) DEFAULT 'text',
                    source_type VARCHAR(50) DEFAULT 'manual',
                    source_config JSONB,
                    is_required BOOLEAN DEFAULT TRUE,
                    default_value TEXT,
                    validation_regex VARCHAR(500),
                    sort_order INTEGER DEFAULT 0
                )
            """))

            # Create index for template_parameters
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_template_parameters_template_id ON template_parameters(template_id)
            """))

            # Create template_shares table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS template_shares (
                    id BIGSERIAL PRIMARY KEY,
                    template_id BIGINT NOT NULL REFERENCES label_templates(id) ON DELETE CASCADE,
                    shared_with_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    permission VARCHAR(20) DEFAULT 'view',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_template_share UNIQUE (template_id, shared_with_user_id)
                )
            """))

            # Create indexes for template_shares
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_template_shares_template_id ON template_shares(template_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_template_shares_shared_with ON template_shares(shared_with_user_id)
            """))

            # Create print_history table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS print_history (
                    id BIGSERIAL PRIMARY KEY,
                    template_id BIGINT REFERENCES label_templates(id) ON DELETE SET NULL,
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    printer_name VARCHAR(255),
                    input_data JSONB,
                    copies INTEGER DEFAULT 1,
                    status VARCHAR(50),
                    error_message TEXT,
                    printed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for print_history
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_print_history_template_id ON print_history(template_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_print_history_user_id ON print_history(user_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_print_history_printed_at ON print_history(printed_at)
            """))


class AddPrinterConfigToLabelTemplates(Migration):
    """Add printer_config JSONB column to label_templates table."""

    def __init__(self):
        super().__init__(
            version="20251227_001_printer_config",
            description="Add printer_config JSONB column to label_templates for Zebra printer settings"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add printer_config column
            await conn.execute(text("""
                ALTER TABLE label_templates
                ADD COLUMN IF NOT EXISTS printer_config JSONB
            """))


class AddAnsattIdAndRolleToUsers(Migration):
    """Add ansattid foreign key and rolle column to users table."""

    def __init__(self):
        super().__init__(
            version="20260108_001_users_ansatt_rolle",
            description="Add ansattid (FK to tblansatte) and rolle columns to users table"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add ansattid column with foreign key to tblansatte
            await conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS ansattid BIGINT REFERENCES tblansatte(ansattid)
            """))

            # Add rolle column with default 'bruker'
            await conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS rolle VARCHAR(50) DEFAULT 'bruker'
            """))

            # Create index on ansattid for faster lookups
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_ansattid ON users(ansattid)
            """))

            # Create index on rolle for filtering
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_rolle ON users(rolle)
            """))


class AddSequenceToTblperiode(Migration):
    """Add sequence for menyperiodeid in tblperiode."""

    def __init__(self):
        super().__init__(
            version="20260108_002_periode_sequence",
            description="Add auto-increment sequence to tblperiode.menyperiodeid"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create sequence starting from max id + 1
            await conn.execute(text("""
                DO $$
                DECLARE
                    max_id INTEGER;
                BEGIN
                    SELECT COALESCE(MAX(menyperiodeid), 0) + 1 INTO max_id FROM tblperiode;

                    -- Create sequence if not exists
                    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tblperiode_menyperiodeid_seq') THEN
                        EXECUTE format('CREATE SEQUENCE tblperiode_menyperiodeid_seq START WITH %s', max_id);
                    END IF;
                END $$
            """))

            # Set column default to use sequence
            await conn.execute(text("""
                ALTER TABLE tblperiode
                ALTER COLUMN menyperiodeid SET DEFAULT nextval('tblperiode_menyperiodeid_seq')
            """))


class AddSequenceToTblordrer(Migration):
    """Add sequence for ordreid in tblordrer."""

    def __init__(self):
        super().__init__(
            version="20260108_003_ordrer_sequence",
            description="Add auto-increment sequence to tblordrer.ordreid"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create sequence starting from max id + 1
            await conn.execute(text("""
                DO $$
                DECLARE
                    max_id INTEGER;
                BEGIN
                    SELECT COALESCE(MAX(ordreid), 0) + 1 INTO max_id FROM tblordrer;

                    -- Create sequence if not exists
                    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tblordrer_ordreid_seq') THEN
                        EXECUTE format('CREATE SEQUENCE tblordrer_ordreid_seq START WITH %s', max_id);
                    END IF;
                END $$
            """))

            # Set column default to use sequence
            await conn.execute(text("""
                ALTER TABLE tblordrer
                ALTER COLUMN ordreid SET DEFAULT nextval('tblordrer_ordreid_seq')
            """))


class CreateCustomerAccessTokensTable(Migration):
    """Create table for customer access tokens."""

    def __init__(self):
        super().__init__(
            version="20260108_003_customer_access_tokens",
            description="Create customer_access_tokens table for self-service ordering"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create customer_access_tokens table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS customer_access_tokens (
                    id SERIAL PRIMARY KEY,
                    kundeid BIGINT NOT NULL REFERENCES tblkunder(kundeid),
                    token VARCHAR(255) UNIQUE NOT NULL,
                    expires_at TIMESTAMP NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_by INTEGER REFERENCES users(id),
                    used_count INTEGER DEFAULT 0,
                    last_used_at TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                )
            """))

            # Create indexes
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_customer_access_tokens_kundeid
                ON customer_access_tokens(kundeid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_customer_access_tokens_token
                ON customer_access_tokens(token)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_customer_access_tokens_expires
                ON customer_access_tokens(expires_at)
            """))


async def run_migrations(engine: AsyncEngine):
    """Run all pending migrations."""
    runner = get_migration_runner(engine)
    await runner.run_migrations()