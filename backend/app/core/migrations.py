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
        migration_runner.add_migration(CreateActivityLogsTable())
        migration_runner.add_migration(CreateAppLogsTable())
        migration_runner.add_migration(AddPickingStatusToOrders())
        migration_runner.add_migration(AddKundeIdToUsers())
        migration_runner.add_migration(DropSsmaTimestampColumns())
        migration_runner.add_migration(AddBestiltAvToOrders())
        migration_runner.add_migration(AddPlukketAntallToOrderDetails())
        migration_runner.add_migration(AddPerformanceIndexes())
        migration_runner.add_migration(CreateSystemSettingsTable())
        migration_runner.add_migration(AddWebshopSortingIndexes())
        migration_runner.add_migration(MakeMenygruppeNullable())
        migration_runner.add_migration(AddSequenceToTblmeny())
        migration_runner.add_migration(AddMultiLevelGtinToTblprodukter())
        migration_runner.add_migration(BackfillGtinFromMatinfo())
        migration_runner.add_migration(CreateUserKunderJunctionTable())
        migration_runner.add_migration(AddSequenceToTblansatte())
        migration_runner.add_migration(DropKundeidFromUsers())
        migration_runner.add_migration(CreateProduksjonssystemTables())
        migration_runner.add_migration(CreateWorkflowAutomationTables())
    return migration_runner


class CreateAppLogsTable(Migration):
    """Create app_logs table for application logging (errors, warnings, info)."""

    def __init__(self):
        super().__init__(
            version="20260112_002_app_logs",
            description="Create app_logs table for application logging"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create app_logs table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS app_logs (
                    id BIGSERIAL PRIMARY KEY,

                    -- Log level and message
                    level VARCHAR(20) NOT NULL,
                    logger_name VARCHAR(255),
                    message TEXT NOT NULL,

                    -- Exception info
                    exception_type VARCHAR(255),
                    exception_message TEXT,
                    traceback TEXT,

                    -- Context
                    module VARCHAR(255),
                    function_name VARCHAR(255),
                    line_number INTEGER,
                    path VARCHAR(500),

                    -- Request context (if available)
                    request_id VARCHAR(100),
                    user_id INTEGER,
                    user_email VARCHAR(255),
                    ip_address VARCHAR(45),
                    endpoint VARCHAR(500),
                    http_method VARCHAR(10),

                    -- Extra data
                    extra JSONB,

                    -- Timestamps
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_app_logs_logger_name ON app_logs(logger_name)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_app_logs_exception_type ON app_logs(exception_type)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_app_logs_filters
                ON app_logs(created_at, level, logger_name)
            """))


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


class CreateActivityLogsTable(Migration):
    """Create activity_logs table for audit trail and API metrics."""

    def __init__(self):
        super().__init__(
            version="20260112_001_activity_logs",
            description="Create activity_logs table for audit trail and API metrics"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create activity_logs table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id BIGSERIAL PRIMARY KEY,

                    -- User information (denormalized for retention)
                    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                    user_email VARCHAR(255),
                    user_name VARCHAR(255),

                    -- Action details
                    action VARCHAR(100) NOT NULL,
                    resource_type VARCHAR(100) NOT NULL,
                    resource_id VARCHAR(100),

                    -- Request context
                    http_method VARCHAR(10),
                    endpoint VARCHAR(500),
                    ip_address VARCHAR(45),
                    user_agent TEXT,

                    -- API metrics
                    response_status INTEGER,
                    response_time_ms INTEGER,

                    -- Additional data
                    details JSONB,

                    -- Timestamps
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
                )
            """))

            # Create indexes for common queries
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_activity_logs_resource_type ON activity_logs(resource_type)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_activity_logs_response_status ON activity_logs(response_status)
            """))
            # Composite index for common filter combinations
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_activity_logs_filters
                ON activity_logs(created_at, user_id, action, resource_type)
            """))


class AddKundeIdToUsers(Migration):
    """Add kundeid foreign key to users table for webshop access."""

    def __init__(self):
        super().__init__(
            version="20260112_004_users_kundeid",
            description="Add kundeid (FK to tblkunder) to users table for webshop customer access"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add kundeid column with foreign key to tblkunder
            await conn.execute(text("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS kundeid BIGINT REFERENCES tblkunder(kundeid)
            """))

            # Create index on kundeid for faster lookups
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_users_kundeid ON users(kundeid)
            """))


class DropSsmaTimestampColumns(Migration):
    """Remove legacy ssma_timestamp columns from all tables.

    These columns were created by SQL Server Migration Assistant (SSMA)
    during the SQL Server to PostgreSQL migration and are no longer needed.
    """

    def __init__(self):
        super().__init__(
            version="20260113_001_drop_ssma_timestamp",
            description="Remove legacy ssma_timestamp columns from all tables"
        )

    async def up(self, engine: AsyncEngine):
        tables = [
            "tblansatte",
            "tblkategorier",
            "tblkunder",
            "tblleverandorer",
            "tblordredetaljer",
            "tblordrer",
            "tblprodukter"
        ]

        async with engine.begin() as conn:
            for table in tables:
                # Check if column exists before dropping
                await conn.execute(text(f"""
                    DO $$
                    BEGIN
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = '{table}'
                            AND column_name = 'ssma_timestamp'
                        ) THEN
                            ALTER TABLE {table} DROP COLUMN ssma_timestamp;
                        END IF;
                    END $$
                """))


class AddPickingStatusToOrders(Migration):
    """Add picking status fields to tblordrer for warehouse workflow."""

    def __init__(self):
        super().__init__(
            version="20260112_003_picking_status",
            description="Add plukkstatus, plukket_dato, and plukket_av fields to tblordrer"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add plukkstatus column
            await conn.execute(text("""
                ALTER TABLE tblordrer
                ADD COLUMN IF NOT EXISTS plukkstatus VARCHAR(50) DEFAULT NULL
            """))

            # Add plukket_dato column
            await conn.execute(text("""
                ALTER TABLE tblordrer
                ADD COLUMN IF NOT EXISTS plukket_dato TIMESTAMP DEFAULT NULL
            """))

            # Add plukket_av column (user who picked)
            await conn.execute(text("""
                ALTER TABLE tblordrer
                ADD COLUMN IF NOT EXISTS plukket_av INTEGER REFERENCES users(id) ON DELETE SET NULL
            """))

            # Add pakkseddel_skrevet column
            await conn.execute(text("""
                ALTER TABLE tblordrer
                ADD COLUMN IF NOT EXISTS pakkseddel_skrevet TIMESTAMP DEFAULT NULL
            """))

            # Create index on plukkstatus for faster filtering
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tblordrer_plukkstatus ON tblordrer(plukkstatus)
            """))

            # Create composite index for common picking queries
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tblordrer_picking_workflow
                ON tblordrer(plukkstatus, leveringsdato, kansellertdato)
            """))


class AddBestiltAvToOrders(Migration):
    """Add bestilt_av field to tblordrer to track who placed webshop orders."""

    def __init__(self):
        super().__init__(
            version="20260113_002_bestilt_av",
            description="Add bestilt_av field to tblordrer for tracking webshop order creator"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add bestilt_av column (user who placed the order)
            await conn.execute(text("""
                ALTER TABLE tblordrer
                ADD COLUMN IF NOT EXISTS bestilt_av INTEGER REFERENCES users(id) ON DELETE SET NULL
            """))


class AddPlukketAntallToOrderDetails(Migration):
    """Add plukket_antall field to tblordredetaljer for tracking picked quantities."""

    def __init__(self):
        super().__init__(
            version="20260113_003_plukket_antall",
            description="Add plukket_antall field to tblordredetaljer for pick registration"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add plukket_antall column
            await conn.execute(text("""
                ALTER TABLE tblordredetaljer
                ADD COLUMN IF NOT EXISTS plukket_antall FLOAT DEFAULT NULL
            """))


class AddPerformanceIndexes(Migration):
    """Add indexes for search and foreign key columns to improve query performance."""

    def __init__(self):
        super().__init__(
            version="20260114_001_performance_indexes",
            description="Add indexes for product search (trigram) and foreign key columns"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Enable pg_trgm extension for fuzzy/ILIKE search
            await conn.execute(text("""
                CREATE EXTENSION IF NOT EXISTS pg_trgm
            """))

            # Product search indexes (for ILIKE queries)
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produkter_produktnavn
                ON tblprodukter(produktnavn)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produkter_ean_kode
                ON tblprodukter(ean_kode)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produkter_leverandorsproduktnr
                ON tblprodukter(leverandorsproduktnr)
            """))
            # Trigram index for fuzzy search on product name
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produkter_produktnavn_trgm
                ON tblprodukter USING gin(produktnavn gin_trgm_ops)
            """))

            # Orders FK indexes
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ordrer_kundeid
                ON tblordrer(kundeid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ordrer_dato
                ON tblordrer(ordredato)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ordrer_leveringsdato
                ON tblordrer(leveringsdato)
            """))

            # Order details FK indexes
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ordredetaljer_ordreid
                ON tblordredetaljer(ordreid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ordredetaljer_produktid
                ON tblordredetaljer(produktid)
            """))

            # Periode-meny FK indexes (columns are part of primary key, already indexed)

            # Customer search index
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_kunder_kundenavn
                ON tblkunder(kundenavn)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_kunder_kundenavn_trgm
                ON tblkunder USING gin(kundenavn gin_trgm_ops)
            """))


class CreateSystemSettingsTable(Migration):
    """Create system_settings table for key-value configuration."""

    def __init__(self):
        super().__init__(
            version="20260114_002_system_settings",
            description="Create system_settings table for application configuration"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create system_settings table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS system_settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value JSONB NOT NULL,
                    description TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
                )
            """))

            # Seed default webshop category order
            await conn.execute(text("""
                INSERT INTO system_settings (key, value, description)
                VALUES (
                    'webshop_category_order',
                    '[1, 2, 14]',
                    'Kategori-IDer i visningsrekkefølge for webshop smart sortering'
                )
                ON CONFLICT (key) DO NOTHING
            """))


class AddWebshopSortingIndexes(Migration):
    """Add indexes for webshop smart sorting queries."""

    def __init__(self):
        super().__init__(
            version="20260114_003_webshop_sorting_indexes",
            description="Add composite index for order frequency calculation"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Composite index for order frequency by customer in date range
            # Partial index excludes cancelled orders (status 98, 99)
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_ordrer_kundeid_ordredato_status
                ON tblordrer(kundeid, ordredato)
                WHERE ordrestatusid NOT IN (98, 99)
            """))


class MakeMenygruppeNullable(Migration):
    """Make menygruppe column nullable in tblmeny table."""

    def __init__(self):
        super().__init__(
            version="20260117_001_menygruppe_nullable",
            description="Make menygruppe column nullable to allow menu creation without group"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Make menygruppe column nullable
            await conn.execute(text("""
                ALTER TABLE tblmeny
                ALTER COLUMN menygruppe DROP NOT NULL
            """))


class AddSequenceToTblmeny(Migration):
    """Add sequence for menyid in tblmeny."""

    def __init__(self):
        super().__init__(
            version="20260117_002_meny_sequence",
            description="Add auto-increment sequence to tblmeny.menyid"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create sequence starting from max id + 1
            await conn.execute(text("""
                DO $$
                DECLARE
                    max_id INTEGER;
                BEGIN
                    SELECT COALESCE(MAX(menyid), 0) + 1 INTO max_id FROM tblmeny;

                    -- Create sequence if not exists
                    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tblmeny_menyid_seq') THEN
                        EXECUTE format('CREATE SEQUENCE tblmeny_menyid_seq START WITH %s', max_id);
                    END IF;
                END $$
            """))

            # Set column default to use sequence
            await conn.execute(text("""
                ALTER TABLE tblmeny
                ALTER COLUMN menyid SET DEFAULT nextval('tblmeny_menyid_seq')
            """))


class AddMultiLevelGtinToTblprodukter(Migration):
    """Add F-pak, D-pak, and Pall GTIN columns to tblprodukter."""

    def __init__(self):
        super().__init__(
            version="20260117_003_multi_level_gtin",
            description="Add F-pak, D-pak, and Pall GTIN columns to tblprodukter"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Add columns
            await conn.execute(text("""
                ALTER TABLE tblprodukter
                ADD COLUMN IF NOT EXISTS gtin_fpak VARCHAR(20),
                ADD COLUMN IF NOT EXISTS gtin_dpak VARCHAR(20),
                ADD COLUMN IF NOT EXISTS gtin_pall VARCHAR(20)
            """))

            # Add partial indexes (only index non-null values)
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tblprodukter_gtin_fpak
                ON tblprodukter(gtin_fpak) WHERE gtin_fpak IS NOT NULL
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tblprodukter_gtin_dpak
                ON tblprodukter(gtin_dpak) WHERE gtin_dpak IS NOT NULL
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tblprodukter_gtin_pall
                ON tblprodukter(gtin_pall) WHERE gtin_pall IS NOT NULL
            """))


class BackfillGtinFromMatinfo(Migration):
    """Backfill F-pak, D-pak, Pall GTINs from matinfo_products."""

    def __init__(self):
        super().__init__(
            version="20260117_004_backfill_gtin_from_matinfo",
            description="Backfill F-pak, D-pak, Pall GTINs from matinfo_products"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Update products that have matching Matinfo data via ean_kode
            await conn.execute(text("""
                UPDATE tblprodukter p
                SET
                    gtin_fpak = m.fpakk,
                    gtin_dpak = m.dpakk,
                    gtin_pall = m.pall
                FROM matinfo_products m
                WHERE p.ean_kode = m.gtin
                  AND (m.fpakk IS NOT NULL OR m.dpakk IS NOT NULL OR m.pall IS NOT NULL)
            """))


class AddSequenceToTblansatte(Migration):
    """Add sequence for ansattid in tblansatte."""

    def __init__(self):
        super().__init__(
            version="20260117_006_ansatte_sequence",
            description="Add auto-increment sequence to tblansatte.ansattid"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create sequence starting from max id + 1
            await conn.execute(text("""
                DO $$
                DECLARE
                    max_id BIGINT;
                BEGIN
                    SELECT COALESCE(MAX(ansattid), 0) + 1 INTO max_id FROM tblansatte;

                    -- Create sequence if not exists
                    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'tblansatte_ansattid_seq') THEN
                        EXECUTE format('CREATE SEQUENCE tblansatte_ansattid_seq START WITH %s', max_id);
                    END IF;
                END $$
            """))

            # Set column default to use sequence
            await conn.execute(text("""
                ALTER TABLE tblansatte
                ALTER COLUMN ansattid SET DEFAULT nextval('tblansatte_ansattid_seq')
            """))


class CreateUserKunderJunctionTable(Migration):
    """Create junction table for user-customer many-to-many relationship."""

    def __init__(self):
        super().__init__(
            version="20260117_005_user_kunder_junction",
            description="Create user_kunder junction table for many-to-many relationship"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Create user_kunder junction table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS user_kunder (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    kundeid BIGINT NOT NULL REFERENCES tblkunder(kundeid) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT uq_user_kunde UNIQUE(user_id, kundeid)
                )
            """))

            # Create indexes for faster lookups
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_kunder_user_id ON user_kunder(user_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_user_kunder_kundeid ON user_kunder(kundeid)
            """))


class DropKundeidFromUsers(Migration):
    """Remove legacy kundeid column from users table.

    Now using user_kunder junction table for user-customer relationships.
    """

    def __init__(self):
        super().__init__(
            version="20260117_007_drop_users_kundeid",
            description="Remove legacy kundeid column from users table"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # Drop the foreign key constraint first (if exists)
            await conn.execute(text("""
                ALTER TABLE users
                DROP CONSTRAINT IF EXISTS users_kundeid_fkey
            """))

            # Drop the index (if exists)
            await conn.execute(text("""
                DROP INDEX IF EXISTS ix_users_kundeid
            """))

            # Drop the column
            await conn.execute(text("""
                ALTER TABLE users
                DROP COLUMN IF EXISTS kundeid
            """))


class CreateProduksjonssystemTables(Migration):
    """Create production template system and update existing production tables.

    This migration:
    1. Creates new template tables (tbl_produksjonstemplate, tbl_produksjonstemplate_detaljer)
    2. Updates existing tbl_rpproduksjon with status workflow and order transfer fields
    3. Updates existing tbl_rpproduksjondetaljer with kalkyleid support

    This is a pre-order system that allows:
    - Admin creates production templates
    - Templates are distributed to all customers in group 12
    - Customers fill out quantities (webshop-like interface)
    - Admin approves orders
    - Approved orders are transferred to tblordrer
    """

    def __init__(self):
        super().__init__(
            version="20260118_001_produksjonssystem",
            description="Create production template system and update existing tables"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # 1. Create tbl_produksjonstemplate (NEW - template definition)
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tbl_produksjonstemplate (
                    template_id SERIAL PRIMARY KEY,
                    template_navn VARCHAR(255) NOT NULL,
                    beskrivelse TEXT,
                    kundegruppe INTEGER DEFAULT 12,
                    gyldig_fra DATE,
                    gyldig_til DATE,
                    aktiv BOOLEAN DEFAULT TRUE,
                    opprettet_dato TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    opprettet_av INTEGER REFERENCES users(id) ON DELETE SET NULL
                )
            """))

            # Create indexes for tbl_produksjonstemplate
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produksjonstemplate_aktiv
                ON tbl_produksjonstemplate(aktiv)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produksjonstemplate_kundegruppe
                ON tbl_produksjonstemplate(kundegruppe)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produksjonstemplate_gyldig
                ON tbl_produksjonstemplate(gyldig_fra, gyldig_til)
            """))

            # 2. Create tbl_produksjonstemplate_detaljer (NEW - products in template)
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS tbl_produksjonstemplate_detaljer (
                    template_detaljid SERIAL PRIMARY KEY,
                    template_id INTEGER NOT NULL REFERENCES tbl_produksjonstemplate(template_id) ON DELETE CASCADE,
                    produktid INTEGER REFERENCES tblprodukter(produktid) ON DELETE CASCADE,
                    kalkyleid INTEGER REFERENCES tbl_rpkalkyle(kalkylekode) ON DELETE CASCADE,
                    standard_antall INTEGER,
                    maks_antall INTEGER,
                    paakrevd BOOLEAN DEFAULT FALSE,
                    linje_nummer INTEGER,
                    CONSTRAINT check_template_produkt_or_kalkyle CHECK (produktid IS NOT NULL OR kalkyleid IS NOT NULL)
                )
            """))

            # Create indexes for tbl_produksjonstemplate_detaljer
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produksjonstemplate_detaljer_template
                ON tbl_produksjonstemplate_detaljer(template_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produksjonstemplate_detaljer_produkt
                ON tbl_produksjonstemplate_detaljer(produktid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_produksjonstemplate_detaljer_kalkyle
                ON tbl_produksjonstemplate_detaljer(kalkyleid)
            """))

            # 3. UPDATE existing tbl_rpproduksjon table with new fields
            # Add template_id for linking to template
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjon
                ADD COLUMN IF NOT EXISTS template_id INTEGER REFERENCES tbl_produksjonstemplate(template_id) ON DELETE SET NULL
            """))

            # Add periodeid for period tracking
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjon
                ADD COLUMN IF NOT EXISTS periodeid INTEGER REFERENCES tblperiode(menyperiodeid) ON DELETE SET NULL
            """))

            # Add status workflow
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjon
                ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
                ADD CONSTRAINT check_rpproduksjon_status CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'transferred', 'produced'))
            """))

            # Add opprettet_av (creator tracking)
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjon
                ADD COLUMN IF NOT EXISTS opprettet_av INTEGER REFERENCES users(id) ON DELETE SET NULL
            """))

            # Add workflow timestamps
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjon
                ADD COLUMN IF NOT EXISTS oppdatert_dato TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                ADD COLUMN IF NOT EXISTS innsendt_dato TIMESTAMP,
                ADD COLUMN IF NOT EXISTS godkjent_dato TIMESTAMP,
                ADD COLUMN IF NOT EXISTS godkjent_av INTEGER REFERENCES users(id) ON DELETE SET NULL
            """))

            # Add order transfer fields (Phase 6)
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjon
                ADD COLUMN IF NOT EXISTS ordre_id BIGINT REFERENCES tblordrer(ordreid) ON DELETE SET NULL,
                ADD COLUMN IF NOT EXISTS overfort_dato TIMESTAMP,
                ADD COLUMN IF NOT EXISTS overfort_av INTEGER REFERENCES users(id) ON DELETE SET NULL
            """))

            # Create indexes for tbl_rpproduksjon
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjon_kunde ON tbl_rpproduksjon(kundeid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjon_status ON tbl_rpproduksjon(status)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjon_template ON tbl_rpproduksjon(template_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjon_periode ON tbl_rpproduksjon(periodeid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjon_ordre ON tbl_rpproduksjon(ordre_id) WHERE ordre_id IS NOT NULL
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjon_kunde_status ON tbl_rpproduksjon(kundeid, status)
            """))

            # 4. UPDATE existing tbl_rpproduksjondetaljer table
            # Add kalkyleid for recipe support
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjondetaljer
                ADD COLUMN IF NOT EXISTS kalkyleid INTEGER REFERENCES tbl_rpkalkyle(kalkylekode) ON DELETE CASCADE
            """))

            # Add kommentar field
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjondetaljer
                ADD COLUMN IF NOT EXISTS kommentar TEXT
            """))

            # Add linje_nummer for sorting
            await conn.execute(text("""
                ALTER TABLE tbl_rpproduksjondetaljer
                ADD COLUMN IF NOT EXISTS linje_nummer INTEGER
            """))

            # Create indexes for tbl_rpproduksjondetaljer
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjondetaljer_produksjon ON tbl_rpproduksjondetaljer(produksjonskode)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjondetaljer_produkt ON tbl_rpproduksjondetaljer(produktid)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_rpproduksjondetaljer_kalkyle ON tbl_rpproduksjondetaljer(kalkyleid)
            """))


class CreateWorkflowAutomationTables(Migration):
    """Create workflow automation system tables.

    This migration creates the foundation for the workflow automation system:
    1. workflow_definitions - Main workflow configuration
    2. workflow_steps - Individual steps in a workflow
    3. workflow_schedules - When workflows should run
    4. workflow_executions - Records of workflow runs
    5. workflow_action_logs - Detailed logs of each action

    Enables automated workflows like:
    - Scheduled email sending (weekly orders, reminders)
    - Conditional checks (missing orders, low inventory)
    - Multi-step automations with branching logic
    """

    def __init__(self):
        super().__init__(
            version="20260118_002_workflow_automation",
            description="Create workflow automation system tables"
        )

    async def up(self, engine: AsyncEngine):
        async with engine.begin() as conn:
            # 1. Create workflow_definitions table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS workflow_definitions (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    workflow_type VARCHAR(50) NOT NULL DEFAULT 'scheduled',
                    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
                    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    CONSTRAINT check_workflow_type CHECK (workflow_type IN ('scheduled', 'event_based'))
                )
            """))

            # Create indexes for workflow_definitions
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_definitions_active
                ON workflow_definitions(is_active)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_definitions_created_by
                ON workflow_definitions(created_by)
            """))

            # 2. Create workflow_steps table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS workflow_steps (
                    id SERIAL PRIMARY KEY,
                    workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
                    step_order INTEGER NOT NULL,
                    step_type VARCHAR(100) NOT NULL,
                    trigger_type VARCHAR(50) NOT NULL,
                    trigger_config JSONB,
                    action_config JSONB,
                    condition_config JSONB,
                    is_active BOOLEAN NOT NULL DEFAULT TRUE,
                    CONSTRAINT check_step_type CHECK (step_type IN (
                        'send_email', 'check_condition', 'create_order', 'wait_until',
                        'send_notification', 'generate_report', 'custom_action'
                    )),
                    CONSTRAINT check_trigger_type CHECK (trigger_type IN (
                        'time_based', 'condition_based', 'immediate'
                    ))
                )
            """))

            # Create indexes for workflow_steps
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow
                ON workflow_steps(workflow_id, step_order)
            """))

            # 3. Create workflow_schedules table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS workflow_schedules (
                    id SERIAL PRIMARY KEY,
                    workflow_id INTEGER NOT NULL UNIQUE REFERENCES workflow_definitions(id) ON DELETE CASCADE,
                    schedule_type VARCHAR(50) NOT NULL,
                    schedule_config JSONB NOT NULL,
                    next_run TIMESTAMP,
                    last_run TIMESTAMP,
                    CONSTRAINT check_schedule_type CHECK (schedule_type IN (
                        'daily', 'weekly', 'monthly', 'cron'
                    ))
                )
            """))

            # Create indexes for workflow_schedules
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_schedules_next_run
                ON workflow_schedules(next_run)
                WHERE next_run IS NOT NULL
            """))

            # 4. Create workflow_executions table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS workflow_executions (
                    id SERIAL PRIMARY KEY,
                    workflow_id INTEGER NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
                    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    completed_at TIMESTAMP,
                    status VARCHAR(50) NOT NULL DEFAULT 'running',
                    current_step INTEGER,
                    error_message TEXT,
                    CONSTRAINT check_execution_status CHECK (status IN (
                        'running', 'completed', 'failed', 'paused'
                    ))
                )
            """))

            # Create indexes for workflow_executions
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow
                ON workflow_executions(workflow_id, started_at DESC)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_executions_status
                ON workflow_executions(status)
            """))

            # 5. Create workflow_action_logs table
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS workflow_action_logs (
                    id SERIAL PRIMARY KEY,
                    execution_id INTEGER NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
                    step_id INTEGER NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
                    action_type VARCHAR(100) NOT NULL,
                    target_id INTEGER,
                    target_type VARCHAR(50),
                    performed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50) NOT NULL DEFAULT 'success',
                    result_data JSONB,
                    error_message TEXT,
                    CONSTRAINT check_action_status CHECK (status IN (
                        'success', 'failed', 'skipped'
                    ))
                )
            """))

            # Create indexes for workflow_action_logs
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_action_logs_execution
                ON workflow_action_logs(execution_id, performed_at)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_action_logs_step
                ON workflow_action_logs(step_id)
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_workflow_action_logs_target
                ON workflow_action_logs(target_type, target_id)
                WHERE target_id IS NOT NULL
            """))


async def run_migrations(engine: AsyncEngine):
    """Run all pending migrations."""
    runner = get_migration_runner(engine)
    await runner.run_migrations()