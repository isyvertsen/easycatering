"""Seed data for E2E tests."""
import asyncio
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import text

from app.models.produkter import Produkter
from app.models.matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient
from app.models.leverandorer import Leverandorer
from app.models.kategorier import Kategorier
from app.infrastructure.database.session import Base


# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://catering_user:change_me_in_production@localhost:15432/catering_test"


async def create_test_database():
    """Create test database if it doesn't exist."""
    # Connect to default postgres database
    admin_url = "postgresql+asyncpg://catering_user:change_me_in_production@localhost:15432/postgres"
    admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")

    async with admin_engine.connect() as conn:
        # Check if database exists
        result = await conn.execute(
            text("SELECT 1 FROM pg_database WHERE datname='catering_test'")
        )
        exists = result.scalar()

        if not exists:
            await conn.execute(text("CREATE DATABASE catering_test"))
            print("✓ Created test database: catering_test")
        else:
            print("✓ Test database already exists: catering_test")

    await admin_engine.dispose()


async def drop_test_database():
    """Drop test database."""
    # Connect to default postgres database
    admin_url = "postgresql+asyncpg://catering_user:change_me_in_production@localhost:15432/postgres"
    admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")

    async with admin_engine.connect() as conn:
        # Terminate existing connections
        await conn.execute(text("""
            SELECT pg_terminate_backend(pg_stat_activity.pid)
            FROM pg_stat_activity
            WHERE pg_stat_activity.datname = 'catering_test'
            AND pid <> pg_backend_pid()
        """))

        # Drop database
        await conn.execute(text("DROP DATABASE IF EXISTS catering_test"))
        print("✓ Dropped test database: catering_test")

    await admin_engine.dispose()


async def create_tables(engine):
    """Create all tables in test database."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

        # Create pg_trgm extension for fuzzy search
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))

    print("✓ Created all tables and extensions")


async def seed_leverandorer(session: AsyncSession):
    """Seed leverandorer (suppliers)."""
    leverandorer = [
        Leverandorer(
            leverandorid=1,
            refkundenummer="TINE-001",
            leverandornavn="Tine SA",
            adresse="Dronning Eufemias gate 6",
            e_post="kundeservice@tine.no",
            postnummer="0191",
            poststed="Oslo",
            telefonnummer="815 00 200",
            bestillingsnr="TINE-ORDER",
            utgatt=False,
            webside="https://www.tine.no"
        ),
        Leverandorer(
            leverandorid=2,
            refkundenummer="HOUSE-001",
            leverandornavn="Eget Kjøkken",
            adresse="Larvik Kommune",
            e_post="kjokken@larvik.kommune.no",
            postnummer="3256",
            poststed="Larvik",
            telefonnummer="33 18 90 00",
            utgatt=False,
            webside="https://www.larvik.kommune.no"
        ),
        Leverandorer(
            leverandorid=3,
            refkundenummer="KAVLI-001",
            leverandornavn="Kavli AS",
            adresse="Bøgesvingen 11",
            e_post="kundeservice@kavli.no",
            postnummer="3480",
            poststed="Drøbak",
            telefonnummer="64 90 40 00",
            utgatt=False,
            webside="https://www.kavli.no"
        ),
    ]

    session.add_all(leverandorer)
    await session.commit()
    print(f"✓ Seeded {len(leverandorer)} leverandorer")


async def seed_kategorier(session: AsyncSession):
    """Seed kategorier (categories)."""
    kategorier = [
        Kategorier(
            kategoriid=10,
            kategorinavn="Meieriprodukter",
            beskrivelse="Melk, ost, yoghurt, smør"
        ),
        Kategorier(
            kategoriid=11,
            kategorinavn="Ost",
            beskrivelse="Ulike typer ost"
        ),
        Kategorier(
            kategoriid=12,
            kategorinavn="Fisk og Sjømat",
            beskrivelse="Ferskt og hermetisk"
        ),
        Kategorier(
            kategoriid=20,
            kategorinavn="Kjøtt og Kjøttprodukter",
            beskrivelse="Kjøtt og bearbeidede kjøttprodukter"
        ),
        Kategorier(
            kategoriid=30,
            kategorinavn="Grønnsaker",
            beskrivelse="Ferske grønnsaker og salat"
        ),
    ]

    session.add_all(kategorier)
    await session.commit()
    print(f"✓ Seeded {len(kategorier)} kategorier")


async def seed_produkter(session: AsyncSession):
    """Seed produkter (internal products)."""
    produkter = [
        # Products with GTIN
        Produkter(
            produktid=1001,
            produktnavn="Tine Helmelk 1L",
            leverandorsproduktnr="TINE-001",
            antalleht=1.0,
            pakningstype="kartong",
            pakningsstorrelse="1L",
            pris=25.90,
            paknpris="25.90",
            levrandorid=1,
            kategoriid=10,
            lagermengde=100.0,
            bestillingsgrense=20.0,
            bestillingsmengde=50.0,
            ean_kode="7038010000997",  # Valid GTIN with Matinfo match
            utgatt=False,
            oppdatert=True,
            webshop=True,
            mvaverdi=15.0,
            lagerid=1.0,
            utregningsfaktor=1.0,
            utregnetpris=25.90,
            visningsnavn="Helmelk 1L",
            visningsnavn2="Tine Helmelk"
        ),
        Produkter(
            produktid=1002,
            produktnavn="Norvegia Ost 500g",
            leverandorsproduktnr="TINE-002",
            antalleht=1.0,
            pakningstype="pakke",
            pakningsstorrelse="500g",
            pris=89.90,
            paknpris="89.90",
            levrandorid=1,
            kategoriid=11,
            lagermengde=50.0,
            bestillingsgrense=10.0,
            bestillingsmengde=20.0,
            ean_kode="7038010005084",  # Valid GTIN with Matinfo match
            utgatt=False,
            oppdatert=True,
            webshop=True,
            mvaverdi=15.0,
            lagerid=1.0,
            utregningsfaktor=1.0,
            utregnetpris=89.90,
            visningsnavn="Norvegia 500g",
            visningsnavn2="Norvegia Ost"
        ),
        # Products without GTIN
        Produkter(
            produktid=1003,
            produktnavn="Hjemmelaget Kjøttboller",
            leverandorsproduktnr="HOUSE-001",
            antalleht=1.0,
            pakningstype="portion",
            pakningsstorrelse="200g",
            pris=45.00,
            paknpris="45.00",
            levrandorid=2,
            kategoriid=20,
            lagermengde=30.0,
            bestillingsgrense=10.0,
            bestillingsmengde=20.0,
            ean_kode=None,  # No GTIN
            utgatt=False,
            oppdatert=True,
            webshop=True,
            mvaverdi=15.0,
            lagerid=1.0,
            utregningsfaktor=1.0,
            utregnetpris=45.00,
            visningsnavn="Kjøttboller 200g",
            visningsnavn2="Hjemmelagde Kjøttboller"
        ),
        Produkter(
            produktid=1004,
            produktnavn="Fersk Salat Mix",
            leverandorsproduktnr="HOUSE-002",
            antalleht=1.0,
            pakningstype="bakke",
            pakningsstorrelse="250g",
            pris=35.00,
            paknpris="35.00",
            levrandorid=2,
            kategoriid=30,
            lagermengde=25.0,
            bestillingsgrense=5.0,
            bestillingsmengde=15.0,
            ean_kode=None,  # No GTIN
            utgatt=False,
            oppdatert=True,
            webshop=True,
            mvaverdi=15.0,
            lagerid=1.0,
            utregningsfaktor=1.0,
            utregnetpris=35.00,
            visningsnavn="Salat Mix 250g",
            visningsnavn2="Fersk Salat"
        ),
        Produkter(
            produktid=1005,
            produktnavn="Kavli Makrell i Tomat 190g",
            leverandorsproduktnr="KAVLI-001",
            antalleht=1.0,
            pakningstype="boks",
            pakningsstorrelse="190g",
            pris=32.90,
            paknpris="32.90",
            levrandorid=3,
            kategoriid=12,
            lagermengde=80.0,
            bestillingsgrense=15.0,
            bestillingsmengde=30.0,
            ean_kode="7023300023003",  # Valid GTIN with Matinfo match
            utgatt=False,
            oppdatert=True,
            webshop=True,
            mvaverdi=15.0,
            lagerid=1.0,
            utregningsfaktor=1.0,
            utregnetpris=32.90,
            visningsnavn="Makrell i Tomat",
            visningsnavn2="Kavli Makrell"
        ),
    ]

    session.add_all(produkter)
    await session.commit()
    print(f"✓ Seeded {len(produkter)} produkter (3 with GTIN, 2 without)")


async def seed_matinfo_products(session: AsyncSession):
    """Seed Matinfo products with allergens and nutrients."""

    # Product 1: Tine Helmelk
    product1 = MatinfoProduct(
        id=2001,
        gtin="7038010000997",
        name="Tine Helmelk",
        item_number="10000997",
        producer_name="Tine SA",
        provider_name="Tine SA",
        brand_name="Tine",
        ingredient_statement="Pasteurisert helmelk",
        product_description="Helmelk 3,5% fett",
        country_of_origin="Norge",
        fpakk="1L",
        matinfo_created="2023-01-15",
        matinfo_updated="2024-06-20"
    )
    session.add(product1)
    await session.flush()

    # Allergens for Helmelk
    allergens1 = [
        MatinfoAllergen(
            product_id=product1.id,
            gtin=product1.gtin,
            code="MILK",
            name="Melk",
            level="CONTAINS"
        ),
        MatinfoAllergen(
            product_id=product1.id,
            gtin=product1.gtin,
            code="LACTOSE",
            name="Laktose",
            level="CONTAINS"
        ),
    ]
    session.add_all(allergens1)

    # Nutrients for Helmelk
    nutrients1 = [
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="ENERC_KCAL",
            name="Energi",
            measurement=64,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="FAT",
            name="Fett",
            measurement=3.5,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="FASAT",
            name="Mettet fett",
            measurement=2.3,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="CHO-",
            name="Karbohydrater",
            measurement=4.7,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="SUGAR",
            name="Sukkerarter",
            measurement=4.7,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="PROCNT",
            name="Protein",
            measurement=3.4,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
        MatinfoNutrient(
            product_id=product1.id,
            gtin=product1.gtin,
            code="SALTEQ",
            name="Salt",
            measurement=0.1,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 ml"
        ),
    ]
    session.add_all(nutrients1)

    # Product 2: Norvegia Ost
    product2 = MatinfoProduct(
        id=2002,
        gtin="7038010005084",
        name="Norvegia Original",
        item_number="10005084",
        producer_name="Tine SA",
        provider_name="Tine SA",
        brand_name="Norvegia",
        ingredient_statement="Pasteurisert melk, salt, melkesyrekultur, ostløpe",
        product_description="Gulost med mild smak",
        country_of_origin="Norge",
        fpakk="500g",
        matinfo_created="2023-01-15",
        matinfo_updated="2024-06-20"
    )
    session.add(product2)
    await session.flush()

    # Allergens for Norvegia
    allergens2 = [
        MatinfoAllergen(
            product_id=product2.id,
            gtin=product2.gtin,
            code="MILK",
            name="Melk",
            level="CONTAINS"
        ),
        MatinfoAllergen(
            product_id=product2.id,
            gtin=product2.gtin,
            code="LACTOSE",
            name="Laktose",
            level="CONTAINS"
        ),
    ]
    session.add_all(allergens2)

    # Nutrients for Norvegia
    nutrients2 = [
        MatinfoNutrient(
            product_id=product2.id,
            gtin=product2.gtin,
            code="ENERC_KCAL",
            name="Energi",
            measurement=357,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product2.id,
            gtin=product2.gtin,
            code="FAT",
            name="Fett",
            measurement=27,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product2.id,
            gtin=product2.gtin,
            code="FASAT",
            name="Mettet fett",
            measurement=17,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product2.id,
            gtin=product2.gtin,
            code="CHO-",
            name="Karbohydrater",
            measurement=0.1,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product2.id,
            gtin=product2.gtin,
            code="PROCNT",
            name="Protein",
            measurement=27,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product2.id,
            gtin=product2.gtin,
            code="SALTEQ",
            name="Salt",
            measurement=1.5,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
    ]
    session.add_all(nutrients2)

    # Product 3: Kavli Makrell
    product3 = MatinfoProduct(
        id=2003,
        gtin="7023300023003",
        name="Kavli Makrell i Tomat",
        item_number="23003",
        producer_name="Kavli AS",
        provider_name="Kavli AS",
        brand_name="Kavli",
        ingredient_statement="Makrell (70%), tomatsaus (vann, tomatpuré, sukker, modifisert maisstivelse, salt, eddik)",
        product_description="Makrell i tomatsaus",
        country_of_origin="Norge",
        fpakk="190g",
        matinfo_created="2023-01-15",
        matinfo_updated="2024-06-20"
    )
    session.add(product3)
    await session.flush()

    # Allergens for Makrell
    allergens3 = [
        MatinfoAllergen(
            product_id=product3.id,
            gtin=product3.gtin,
            code="FISH",
            name="Fisk",
            level="CONTAINS"
        ),
    ]
    session.add_all(allergens3)

    # Nutrients for Makrell
    nutrients3 = [
        MatinfoNutrient(
            product_id=product3.id,
            gtin=product3.gtin,
            code="ENERC_KCAL",
            name="Energi",
            measurement=205,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product3.id,
            gtin=product3.gtin,
            code="FAT",
            name="Fett",
            measurement=14,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product3.id,
            gtin=product3.gtin,
            code="FASAT",
            name="Mettet fett",
            measurement=3.5,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product3.id,
            gtin=product3.gtin,
            code="CHO-",
            name="Karbohydrater",
            measurement=3.5,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product3.id,
            gtin=product3.gtin,
            code="PROCNT",
            name="Protein",
            measurement=16,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product3.id,
            gtin=product3.gtin,
            code="SALTEQ",
            name="Salt",
            measurement=0.9,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
    ]
    session.add_all(nutrients3)

    # Additional searchable products (without matching produkter)
    product4 = MatinfoProduct(
        id=2004,
        gtin="7035620030956",
        name="Q-meieriene Yoghurt Naturell",
        item_number="30956",
        producer_name="Q-meieriene",
        provider_name="Q-meieriene",
        brand_name="Q",
        ingredient_statement="Melk, melkesyrekultur",
        product_description="Yoghurt naturell",
        country_of_origin="Norge",
        fpakk="1kg",
        matinfo_created="2023-01-15",
        matinfo_updated="2024-06-20"
    )
    session.add(product4)
    await session.flush()

    allergens4 = [
        MatinfoAllergen(
            product_id=product4.id,
            gtin=product4.gtin,
            code="MILK",
            name="Melk",
            level="CONTAINS"
        ),
    ]
    session.add_all(allergens4)

    nutrients4 = [
        MatinfoNutrient(
            product_id=product4.id,
            gtin=product4.gtin,
            code="ENERC_KCAL",
            name="Energi",
            measurement=66,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product4.id,
            gtin=product4.gtin,
            code="FAT",
            name="Fett",
            measurement=3.5,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
        MatinfoNutrient(
            product_id=product4.id,
            gtin=product4.gtin,
            code="PROCNT",
            name="Protein",
            measurement=3.5,
            measurement_precision="APPROXIMATE",
            measurement_type="per 100 g"
        ),
    ]
    session.add_all(nutrients4)

    await session.commit()
    print(f"✓ Seeded 4 Matinfo products with allergens and nutrients")


async def seed_all():
    """Seed all test data."""
    print("=" * 60)
    print("SEEDING TEST DATABASE")
    print("=" * 60)

    # Create test database
    await create_test_database()

    # Create engine and session
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)

    # Create tables
    await create_tables(engine)

    # Create session
    SessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with SessionLocal() as session:
        # Seed data in correct order (foreign key dependencies)
        await seed_leverandorer(session)
        await seed_kategorier(session)
        await seed_produkter(session)
        await seed_matinfo_products(session)

    await engine.dispose()

    print("=" * 60)
    print("✓ ALL SEED DATA COMPLETED")
    print("=" * 60)
    print("\nTest Data Summary:")
    print("  - 3 leverandorer")
    print("  - 5 kategorier")
    print("  - 5 produkter (3 with GTIN, 2 without)")
    print("  - 4 Matinfo products with allergens and nutrients")
    print("  - Ready for E2E testing")


async def reset_database():
    """Reset test database (drop and recreate)."""
    print("=" * 60)
    print("RESETTING TEST DATABASE")
    print("=" * 60)

    await drop_test_database()
    await seed_all()


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--reset":
        asyncio.run(reset_database())
    else:
        asyncio.run(seed_all())
