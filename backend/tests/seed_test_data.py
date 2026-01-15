"""
Comprehensive seed data script for E2E and integration tests.

This script creates all necessary test data for:
- User authentication
- Webshop functionality
- Orders management
- Menu management
- Product management

Usage:
    DATABASE_URL=postgresql+asyncpg://... uv run python tests/seed_test_data.py
"""

import asyncio
import os
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
import bcrypt

# Database URL - can be overridden by environment variable
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://catering_user:change_me_in_production@localhost:15432/catering_test"
)

# Test user password (hashed)
TEST_PASSWORD_HASH = bcrypt.hashpw(b"test123", bcrypt.gensalt()).decode()


async def create_extension(conn):
    """Create required PostgreSQL extensions."""
    try:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
        print("  - pg_trgm extension created")
    except Exception as e:
        print(f"  - Extension creation skipped: {e}")


async def seed_kundegruppe(conn):
    """Seed customer groups with webshop access."""
    print("\nSeeding kundegruppe...")

    # Check if groups exist
    result = await conn.execute(text("SELECT COUNT(*) FROM tblkundgruppe"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} kundegruppe already exist, skipping")
        return

    groups = [
        (1, 'Sykehjem Beboere', False, False),
        (2, 'Til eget lager', False, False),
        (3, 'Hjemmeboende', False, False),
        (4, 'Dagsenter', False, False),
        (5, 'CateringEkstern', False, True),
        (6, 'Sykehjem', True, True),
        (7, 'Eldresenter/Kantine', True, True),
        (12, 'Mottakkjøkken Produksjon', True, False),
    ]

    for gruppeid, gruppe, webshop, autofaktura in groups:
        await conn.execute(
            text("""
                INSERT INTO tblkundgruppe (gruppeid, gruppe, webshop, autofaktura)
                VALUES (:gruppeid, :gruppe, :webshop, :autofaktura)
                ON CONFLICT (gruppeid) DO NOTHING
            """),
            {"gruppeid": gruppeid, "gruppe": gruppe, "webshop": webshop, "autofaktura": autofaktura}
        )

    print(f"  - Created {len(groups)} kundegrupper")


async def seed_ansatte(conn):
    """Seed employees."""
    print("\nSeeding ansatte...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblansatte"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} ansatte already exist, skipping")
        return

    employees = [
        (1, 'Admin', 'User', 'Administrator', 'admin@test.no'),
        (2, 'Test', 'Employee', 'Ansatt', 'employee@test.no'),
        (10, 'Webshop', 'User', 'Kunde', 'webshop@test.no'),
    ]

    for ansattid, fornavn, etternavn, tittel, epost in employees:
        await conn.execute(
            text("""
                INSERT INTO tblansatte (ansattid, fornavn, etternavn, tittel, e_postjobb, sluttet)
                VALUES (:ansattid, :fornavn, :etternavn, :tittel, :epost, false)
                ON CONFLICT (ansattid) DO NOTHING
            """),
            {"ansattid": ansattid, "fornavn": fornavn, "etternavn": etternavn, "tittel": tittel, "epost": epost}
        )

    print(f"  - Created {len(employees)} ansatte")


async def seed_kunder(conn):
    """Seed customers with webshop access."""
    print("\nSeeding kunder...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblkunder"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} kunder already exist, skipping")
        return

    customers = [
        (921, 'Test Sykehjem Mottakkjøkken', 'Testveien 1', '3256', 'LARVIK', 12, 'test@sykehjem.no'),
        (922, 'Test Eldresenter', 'Testveien 2', '3256', 'LARVIK', 7, 'test@eldresenter.no'),
        (923, 'Test Sykehjem', 'Testveien 3', '3256', 'LARVIK', 6, 'test@sykehjem2.no'),
    ]

    for kundeid, kundenavn, adresse, postnr, sted, kundegruppe, epost in customers:
        await conn.execute(
            text("""
                INSERT INTO tblkunder (kundeid, kundenavn, adresse, postnr, sted, kundegruppe, e_post, kundeinaktiv)
                VALUES (:kundeid, :kundenavn, :adresse, :postnr, :sted, :kundegruppe, :epost, false)
                ON CONFLICT (kundeid) DO NOTHING
            """),
            {"kundeid": kundeid, "kundenavn": kundenavn, "adresse": adresse,
             "postnr": postnr, "sted": sted, "kundegruppe": kundegruppe, "epost": epost}
        )

    print(f"  - Created {len(customers)} kunder")


async def seed_users(conn):
    """Seed users table with test users."""
    print("\nSeeding users...")

    result = await conn.execute(text("SELECT COUNT(*) FROM users"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} users already exist, skipping")
        return

    users = [
        # Admin user with superuser access
        (1, 'admin@test.no', TEST_PASSWORD_HASH, 'Admin User', True, True, 1, 'admin', None),
        # Employee user
        (2, 'employee@test.no', TEST_PASSWORD_HASH, 'Test Employee', True, False, 2, 'bruker', None),
        # Webshop user with customer linkage
        (3, 'webshop@test.no', TEST_PASSWORD_HASH, 'Webshop User', True, False, 10, 'bruker', 921),
        # Additional webshop user
        (4, 'customer@test.no', TEST_PASSWORD_HASH, 'Customer User', True, False, None, 'bruker', 922),
    ]

    for user_id, email, password, name, active, superuser, ansattid, rolle, kundeid in users:
        await conn.execute(
            text("""
                INSERT INTO users (id, email, hashed_password, full_name, is_active, is_superuser, ansattid, rolle, kundeid, created_at, updated_at)
                VALUES (:id, :email, :password, :name, :active, :superuser, :ansattid, :rolle, :kundeid, :now, :now)
                ON CONFLICT (id) DO NOTHING
            """),
            {
                "id": user_id, "email": email, "password": password, "name": name,
                "active": active, "superuser": superuser, "ansattid": ansattid,
                "rolle": rolle, "kundeid": kundeid, "now": datetime.utcnow()
            }
        )

    print(f"  - Created {len(users)} users")


async def seed_kategorier(conn):
    """Seed product categories."""
    print("\nSeeding kategorier...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblkategorier"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} kategorier already exist, skipping")
        return

    categories = [
        (1, 'Meieriprodukter'),
        (2, 'Kjøtt og fisk'),
        (3, 'Frukt og grønt'),
        (4, 'Bakervarer'),
        (5, 'Tørrvarer'),
        (6, 'Drikkevarer'),
        (7, 'Frossenvarer'),
    ]

    for kategoriid, kategorinavn in categories:
        await conn.execute(
            text("""
                INSERT INTO tblkategorier (kategoriid, kategorinavn)
                VALUES (:kategoriid, :kategorinavn)
                ON CONFLICT (kategoriid) DO NOTHING
            """),
            {"kategoriid": kategoriid, "kategorinavn": kategorinavn}
        )

    print(f"  - Created {len(categories)} kategorier")


async def seed_leverandorer(conn):
    """Seed suppliers."""
    print("\nSeeding leverandorer...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblleverandorer"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} leverandorer already exist, skipping")
        return

    suppliers = [
        (1, 'ASKO', 'Askoveien 1', '3000', 'Drammen', 'kontakt@asko.no'),
        (2, 'Tine', 'Tineveien 1', '0001', 'Oslo', 'kontakt@tine.no'),
        (3, 'Nortura', 'Norturavägen 1', '0002', 'Oslo', 'kontakt@nortura.no'),
    ]

    for levid, navn, adresse, postnr, sted, epost in suppliers:
        await conn.execute(
            text("""
                INSERT INTO tblleverandorer (levandorid, leverandornavn, adresse, postnr, poststed, e_post)
                VALUES (:levid, :navn, :adresse, :postnr, :sted, :epost)
                ON CONFLICT (levandorid) DO NOTHING
            """),
            {"levid": levid, "navn": navn, "adresse": adresse, "postnr": postnr, "sted": sted, "epost": epost}
        )

    print(f"  - Created {len(suppliers)} leverandorer")


async def seed_produkter(conn):
    """Seed products with webshop enabled."""
    print("\nSeeding produkter...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblprodukter"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} produkter already exist, skipping")
        return

    products = [
        (1, 'Melk Helmelk 1L', 'MELK-001', 1, 'Kartong', '1L', 19.90, 1, 1, True, '7038010000997', 'Helmelk 1 liter'),
        (2, 'Smør Meierismør 500g', 'SMOR-001', 1, 'Pakke', '500g', 45.90, 1, 1, True, '7038010001000', 'Meierismør'),
        (3, 'Ost Norvegia 1kg', 'OST-001', 1, 'Blokk', '1kg', 109.90, 1, 1, True, '7038010001017', 'Norvegia ost'),
        (4, 'Brød Grovbrød', 'BROD-001', 1, 'Stk', '750g', 35.90, 4, 1, True, '7038010001024', 'Grovbrød'),
        (5, 'Kyllingfilet 1kg', 'KYL-001', 1, 'Pakke', '1kg', 129.90, 2, 3, True, '7038010001031', 'Kyllingfilet'),
        (6, 'Laks Fersk 500g', 'LAKS-001', 1, 'Pakke', '500g', 89.90, 2, 3, True, '7038010001048', 'Fersk laks'),
        (7, 'Eple Røde 1kg', 'EPLE-001', 1, 'Pose', '1kg', 29.90, 3, 1, True, '7038010001055', 'Røde epler'),
        (8, 'Banan 1kg', 'BANAN-001', 1, 'Klase', '1kg', 24.90, 3, 1, True, '7038010001062', 'Bananer'),
        (9, 'Appelsinjuice 1L', 'JUICE-001', 1, 'Kartong', '1L', 32.90, 6, 1, True, '7038010001079', 'Appelsinjuice'),
        (10, 'Kaffe Filterkaffe 500g', 'KAFFE-001', 1, 'Pakke', '500g', 59.90, 6, 1, True, '7038010001086', 'Filterkaffe'),
    ]

    for prod in products:
        produktid, produktnavn, levproduktnr, antalleht, pakningstype, pakningsstorrelse, pris, kategoriid, levandorid, webshop, ean, visningsnavn = prod
        await conn.execute(
            text("""
                INSERT INTO tblprodukter (produktid, produktnavn, leverandorsproduktnr, antalleht, pakningstype,
                    pakningsstorrelse, pris, kategoriid, levrandorid, webshop, utgatt, ean_kode, visningsnavn)
                VALUES (:produktid, :produktnavn, :levproduktnr, :antalleht, :pakningstype,
                    :pakningsstorrelse, :pris, :kategoriid, :levandorid, :webshop, false, :ean, :visningsnavn)
                ON CONFLICT (produktid) DO NOTHING
            """),
            {
                "produktid": produktid, "produktnavn": produktnavn, "levproduktnr": levproduktnr,
                "antalleht": antalleht, "pakningstype": pakningstype, "pakningsstorrelse": pakningsstorrelse,
                "pris": pris, "kategoriid": kategoriid, "levandorid": levandorid, "webshop": webshop,
                "ean": ean, "visningsnavn": visningsnavn
            }
        )

    print(f"  - Created {len(products)} produkter")


async def seed_menygrupper(conn):
    """Seed menu groups."""
    print("\nSeeding menygrupper...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblmenygruppe"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} menygrupper already exist, skipping")
        return

    groups = [
        (1, 'Frokost'),
        (2, 'Lunsj'),
        (3, 'Middag'),
        (4, 'Kveldsmat'),
    ]

    for gruppeid, beskrivelse in groups:
        await conn.execute(
            text("""
                INSERT INTO tblmenygruppe (gruppeid, beskrivelse)
                VALUES (:gruppeid, :beskrivelse)
                ON CONFLICT (gruppeid) DO NOTHING
            """),
            {"gruppeid": gruppeid, "beskrivelse": beskrivelse}
        )

    print(f"  - Created {len(groups)} menygrupper")


async def seed_menyer(conn):
    """Seed menus."""
    print("\nSeeding menyer...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblmeny"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} menyer already exist, skipping")
        return

    menus = [
        (1, 'Standard frokostmeny', 1),
        (2, 'Standard lunsjmeny', 2),
        (3, 'Standard middagsmeny', 3),
        (4, 'Vegetarmeny middag', 3),
        (5, 'Allergitilpasset meny', 2),
    ]

    for menyid, beskrivelse, menygruppe in menus:
        await conn.execute(
            text("""
                INSERT INTO tblmeny (menyid, beskrivelse, menygruppe)
                VALUES (:menyid, :beskrivelse, :menygruppe)
                ON CONFLICT (menyid) DO NOTHING
            """),
            {"menyid": menyid, "beskrivelse": beskrivelse, "menygruppe": menygruppe}
        )

    print(f"  - Created {len(menus)} menyer")


async def seed_ordrer(conn):
    """Seed orders."""
    print("\nSeeding ordrer...")

    result = await conn.execute(text("SELECT COUNT(*) FROM tblordrer"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} ordrer already exist, skipping")
        return

    today = datetime.now().date()
    orders = [
        (1, 921, today + timedelta(days=1), today, 20, 'Test ordre 1'),  # Status 20 = Godkjent
        (2, 922, today + timedelta(days=2), today, 15, 'Test ordre 2'),  # Status 15 = Bestilt
        (3, 921, today + timedelta(days=3), today, 10, 'Test ordre 3'),  # Status 10 = Startet
    ]

    for ordreid, kundeid, leveringsdato, ordredato, status, merknad in orders:
        await conn.execute(
            text("""
                INSERT INTO tblordrer (ordreid, kundeid, leveringsdato, ordredato, status, merknad)
                VALUES (:ordreid, :kundeid, :leveringsdato, :ordredato, :status, :merknad)
                ON CONFLICT (ordreid) DO NOTHING
            """),
            {
                "ordreid": ordreid, "kundeid": kundeid, "leveringsdato": leveringsdato,
                "ordredato": ordredato, "status": status, "merknad": merknad
            }
        )

    print(f"  - Created {len(orders)} ordrer")


async def seed_label_templates(conn):
    """Seed label templates."""
    print("\nSeeding label templates...")

    result = await conn.execute(text("SELECT COUNT(*) FROM label_templates"))
    count = result.scalar()

    if count > 0:
        print(f"  - {count} label templates already exist, skipping")
        return

    templates = [
        ('Standard Etikett', 'Standard etikett for produkter',
         '{"width": 62, "height": 29, "elements": [{"type": "text", "x": 5, "y": 5, "content": "{{produktnavn}}"}]}',
         '{"produktnavn": "Eksempel produkt"}'),
        ('Strekkode Etikett', 'Etikett med strekkode',
         '{"width": 62, "height": 29, "elements": [{"type": "barcode", "x": 5, "y": 5, "content": "{{ean}}"}]}',
         '{"ean": "7038010000997"}'),
    ]

    for name, description, template_json, default_params in templates:
        await conn.execute(
            text("""
                INSERT INTO label_templates (name, description, template_json, default_params, created_at, updated_at)
                VALUES (:name, :description, :template_json, :default_params, :now, :now)
            """),
            {
                "name": name, "description": description, "template_json": template_json,
                "default_params": default_params, "now": datetime.utcnow()
            }
        )

    print(f"  - Created {len(templates)} label templates")


async def seed_all():
    """Run all seed functions."""
    print("=" * 60)
    print("SEEDING TEST DATABASE")
    print("=" * 60)
    print(f"Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else DATABASE_URL}")

    engine = create_async_engine(DATABASE_URL)

    async with engine.begin() as conn:
        await create_extension(conn)
        await seed_kundegruppe(conn)
        await seed_ansatte(conn)
        await seed_kunder(conn)
        await seed_users(conn)
        await seed_kategorier(conn)
        await seed_leverandorer(conn)
        await seed_produkter(conn)
        await seed_menygrupper(conn)
        await seed_menyer(conn)
        await seed_ordrer(conn)
        await seed_label_templates(conn)

    await engine.dispose()

    print("\n" + "=" * 60)
    print("SEEDING COMPLETE")
    print("=" * 60)
    print("\nTest users created:")
    print("  - admin@test.no / test123 (superuser)")
    print("  - employee@test.no / test123 (employee)")
    print("  - webshop@test.no / test123 (webshop user, kundeid=921)")
    print("  - customer@test.no / test123 (customer, kundeid=922)")


if __name__ == "__main__":
    asyncio.run(seed_all())
