"""Script to import customer data from XML file to tblkunder."""

import asyncio
import re
from datetime import datetime
from pathlib import Path

from sqlalchemy import select, update

# Add parent to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.infrastructure.database.session import get_session_factory
from app.models.ansatte import Ansatte
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe
from app.domain.entities.user import User

# Suppress unused import warnings - needed for SQLAlchemy relationships
_ = Ansatte, Kundegruppe, User


# Mapping from XML tags to database columns
XML_TO_DB_MAPPING = {
    "KundeID": "kundeid",
    "Kundenavn": "kundenavn",
    "Avdeling": "avdeling",
    "KontaktID": "kontaktid",
    "Telefonnummer": "telefonnummer",
    "BestillerNr": "bestillernr",
    "LøpeNr": "lopenr",
    "Merknad": "merknad",
    "Adresse": "adresse",
    "Postboks": "postboks",
    "PostNR": "postnr",
    "Sted": "sted",
    "VelgSone": "velgsone",
    "Leveringsdag": "leveringsdag",
    "KundeInaktiv": "kundeinaktiv",
    "KundeNrAgresso": "kundenragresso",
    "E-post": "e_post",
    "Webside": "webside",
    "KundeGruppe": "kundegruppe",
    "BestillerSelv": "bestillerselv",
    "Rute": "rute",
    "MenyInfo": "menyinfo",
    "AnsattID": "ansattid",
    "SjåførPåRute": "sjaforparute",
    "Diett": "diett",
    "MenyGruppeID": "menygruppeid",
    "UtDato": "utdato",
    "InnDato": "inndato",
    "Avsluttet": "avsluttet",
    "EksportKatalog": "eksportkatalog",
    "Mobilnummer": "mobilnummer",
    "FormKost": "formkost",
    "SykehjemID": "sykehjemid",
    "E-post2": "e_post2",
}

# Fields to skip (not in our model)
SKIP_FIELDS = {"SSMA_TimeStamp"}

# Type conversions
INTEGER_FIELDS = {"kundeid", "velgsone", "leveringsdag", "kundegruppe", "ansattid", "rute", "sykehjemid"}
FLOAT_FIELDS = {"lopenr", "postboks", "kundenragresso", "sjaforparute", "menygruppeid"}
BOOLEAN_FIELDS = {"kundeinaktiv", "bestillerselv", "diett", "avsluttet", "formkost"}
DATETIME_FIELDS = {"utdato", "inndato"}


def parse_xml_content(content: str) -> list[dict]:
    """Parse the flat XML-like content into a list of customer records."""
    customers = []
    current_customer = {}

    # Match all XML tags and their content
    pattern = r'<(\w+(?:-\w+)?)>(.*?)</\1>'
    matches = re.findall(pattern, content, re.DOTALL)

    for tag, value in matches:
        if tag in SKIP_FIELDS:
            continue

        db_field = XML_TO_DB_MAPPING.get(tag)
        if not db_field:
            continue

        # If we encounter KundeID and already have data, save current customer
        if tag == "KundeID" and current_customer:
            customers.append(current_customer)
            current_customer = {}

        # Convert value based on field type
        value = value.strip()
        if not value:
            current_customer[db_field] = None
        elif db_field in INTEGER_FIELDS:
            try:
                current_customer[db_field] = int(float(value))
            except ValueError:
                current_customer[db_field] = None
        elif db_field in FLOAT_FIELDS:
            try:
                current_customer[db_field] = float(value)
            except ValueError:
                current_customer[db_field] = None
        elif db_field in BOOLEAN_FIELDS:
            current_customer[db_field] = value in ("1", "True", "true")
        elif db_field in DATETIME_FIELDS:
            try:
                current_customer[db_field] = datetime.fromisoformat(value.replace("T", " ").split(".")[0])
            except ValueError:
                current_customer[db_field] = None
        else:
            # Clean up email fields that have extra data
            if db_field == "e_post" and "#" in value:
                value = value.split("#")[0]
            current_customer[db_field] = value

    # Don't forget the last customer
    if current_customer:
        customers.append(current_customer)

    return customers


async def import_customers(customers: list[dict]) -> tuple[int, int, list[str]]:
    """Update existing customers or insert new ones."""
    updated_count = 0
    inserted_count = 0
    errors = []

    session_factory = get_session_factory()
    async with session_factory() as session:
        for customer_data in customers:
            kundeid = customer_data.get("kundeid")
            if not kundeid:
                errors.append("Missing KundeID in record")
                continue

            # Check if customer exists
            result = await session.execute(
                select(Kunder).where(Kunder.kundeid == kundeid)
            )
            existing = result.scalar_one_or_none()

            if existing:
                # Update existing customer
                update_data = {k: v for k, v in customer_data.items() if k != "kundeid"}
                if update_data:
                    try:
                        await session.execute(
                            update(Kunder).where(Kunder.kundeid == kundeid).values(**update_data)
                        )
                        updated_count += 1
                        print(f"  Updated KundeID {kundeid}: {existing.kundenavn}")
                    except Exception as e:
                        errors.append(f"Error updating KundeID {kundeid}: {str(e)}")
            else:
                # Insert new customer
                try:
                    new_customer = Kunder(**customer_data)
                    session.add(new_customer)
                    await session.flush()  # Get the ID assigned
                    inserted_count += 1
                    print(f"  Inserted KundeID {kundeid}: {customer_data.get('kundenavn', 'Unknown')}")
                except Exception as e:
                    errors.append(f"Error inserting KundeID {kundeid}: {str(e)}")

        await session.commit()

    return updated_count, inserted_count, errors


async def main():
    """Main function to run the import."""
    xml_path = Path(__file__).parent.parent / "data" / "kundedata.xml"

    print(f"Reading XML file: {xml_path}")
    content = xml_path.read_text(encoding="utf-8")

    print("Parsing XML content...")
    customers = parse_xml_content(content)
    print(f"Found {len(customers)} customer records in XML")

    print("\nImporting customers to database...")
    updated, inserted, errors = await import_customers(customers)

    print(f"\n=== Summary ===")
    print(f"Updated: {updated} customers")
    print(f"Inserted: {inserted} new customers")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for error in errors:
            print(f"  - {error}")


if __name__ == "__main__":
    asyncio.run(main())
