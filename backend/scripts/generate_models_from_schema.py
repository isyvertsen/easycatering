#!/usr/bin/env python3
"""Generate SQLAlchemy models from the provided database schema."""

# Key tables and their structures based on the schema
SCHEMA_DEFINITIONS = {
    "tblAnsatte": {
        "columns": {
            "AnsattID": "bigint not null primary key",
            "Fornavn": "text",
            "Etternavn": "text",
            "Tittel": "text",
            "Adresse": "text",
            "PostNr": "text",
            "Poststed": "text",
            "TlfPrivat": "text",
            "Avdeling": "text",
            "Fødselsdato": "text",
            "PersonNr": "double precision",
            "Sluttet": "boolean",
            "Stillings%": "double precision",
            "Resussnr": "bigint",
            "E-postJobb": "text",
            "E-postPrivat": "text",
            "SSMA_TimeStamp": "text",
            "WindowsBruker": "text",
            "DefaultPrinter": "text"
        }
    },
    "tblKunder": {
        "columns": {
            "KundeID": "bigint not null primary key",
            "Kundenavn": "text",
            "Avdeling": "text",
            "KontaktID": "text",
            "Telefonnummer": "text",
            "BestillerNr": "text",
            "LøpeNr": "double precision",
            "Merknad": "text",
            "Adresse": "text",
            "Postboks": "double precision",
            "PostNR": "text",
            "Sted": "text",
            "VelgSone": "integer references tblSone",
            "Leveringsdag": "integer references tblLeveringsdag",
            "KundeInaktiv": "boolean",
            "KundeNrAgresso": "double precision",
            "E-post": "text",
            "Webside": "text",
            "KundeGruppe": "integer references tblKundgruppe",
            "BestillerSelv": "boolean",
            "Rute": "bigint references tblRuteplan",
            "MenyInfo": "text",
            "AnsattID": "bigint references tblAnsatte",
            "SjåførPåRute": "double precision",
            "Diett": "boolean",
            "MenyGruppeID": "double precision",
            "UtDato": "timestamp",
            "InnDato": "timestamp",
            "Avsluttet": "boolean",
            "EksportKatalog": "text",
            "SSMA_TimeStamp": "text",
            "Mobilnummer": "text",
            "Formkost": "boolean",
            "SykehjemID": "bigint references tblKunder",
            "E-post2": "text"
        }
    },
    "tblProdukter": {
        "columns": {
            "ProduktID": "bigint not null primary key",
            "Produktnavn": "text",
            "LeverandørsProduktNr": "text",
            "AntallEht": "double precision",
            "Pakningstype": "text",
            "Pakningsstørrelse": "text",
            "Pris": "double precision",
            "PaknPris": "text",
            "LevrandørID": "bigint references tblLeverandører",
            "KategoriID": "bigint references tblKategorier",
            "Lagermengde": "double precision",
            "Bestillingsgrense": "double precision",
            "Bestillingsmengde": "double precision",
            "EAN-kode": "text",
            "Utgått": "boolean",
            "Oppdatert": "boolean",
            "Webshop": "boolean",
            "MVAVerdi": "double precision",
            "SSMA_TimeStamp": "text",
            "LagerID": "double precision",
            "Utregningsfaktor": "double precision",
            "UtregnetPris": "double precision",
            "Visningsnavn": "text",
            "Visningsnavn2": "text",
            "Allergenprodukt": "boolean",
            "EnergiKj": "double precision",
            "Kalorier": "double precision",
            "Fett": "double precision",
            "MettetFett": "double precision",
            "KarboHydrater": "double precision",
            "Sukkerarter": "double precision",
            "Kostfiber": "double precision",
            "Protein": "double precision",
            "Salt": "double precision",
            "MonoDisakk": "double precision",
            "MatvareID": "text",
            "WebshopSted": "text"
        }
    },
    "tblOrdrer": {
        "columns": {
            "OrdreID": "bigint not null primary key",
            "KundeID": "bigint references tblKunder",
            "AnsattID": "bigint references tblAnsatte",
            "Kundenavn": "text",
            "Ordredato": "timestamp",
            "Leveringsdato": "timestamp",
            "Fakturadato": "timestamp",
            "SendesTil": "text",
            "Betalingsmåte": "bigint",
            "LagerOk": "boolean",
            "Informasjon": "text",
            "OrdrestatusID": "bigint references tblOrdrestatus",
            "FakturaID": "double precision",
            "SSMA_TimeStamp": "text",
            "KansellertDato": "timestamp",
            "SentBekreftelse": "boolean",
            "SentRegnskap": "timestamp",
            "OrdreLevert": "text",
            "LevertAgresso": "text"
        }
    },
    "tblOrdredetaljer": {
        "columns": {
            "OrdreID": "bigint not null references tblOrdrer",
            "ProduktID": "bigint not null references tblProdukter",
            "LevDato": "timestamp",
            "Pris": "double precision",
            "Antall": "double precision",
            "Rabatt": "double precision",
            "SSMA_TimeStamp": "text",
            "Ident": "text",
            "unik": "bigint not null"
        },
        "primary_key": ["OrdreID", "ProduktID", "unik"]
    },
    "tblBestillinger": {
        "columns": {
            "BestillingsID": "integer not null primary key",
            "LeverandørID": "integer references tblLeverandører",
            "Leverandør": "varchar(50)",
            "Bestillingsdato": "timestamp",
            "Ønsketlevering": "timestamp",
            "leveringsdato": "timestamp",
            "AnsattID": "integer",
            "Bestillt": "boolean",
            "Lageroppdatering": "boolean",
            "Merknad": "text",
            "SSMA_TimeStamp": "text"
        }
    },
    "tblBestillingsposter": {
        "columns": {
            "BestillingsPosterID": "integer not null primary key",
            "BestillingsID": "integer references tblBestillinger",
            "ProduktID": "integer references tblProdukter",
            "LevarandørsProduktNr": "varchar(50)",
            "varenavn": "varchar(250)",
            "Pakningsstørrelse": "varchar(20)",
            "Pris": "double precision",
            "Antall_bestillt": "double precision",
            "Sum": "double precision",
            "Mottatt": "boolean",
            "oppdatert": "boolean",
            "BestMengde": "varchar(50)",
            "MVA%": "double precision",
            "Levkode": "integer",
            "SSMA_TimeStamp": "text"
        }
    },
    "tbl_rpKalkyle": {
        "columns": {
            "Kalkylekode": "integer not null primary key",
            "Kalkylenavn": "varchar(255)",
            "AnsattID": "integer references tblAnsatte",
            "OpprettetDato": "timestamp",
            "RevidertDato": "timestamp",
            "Informasjon": "text",
            "RefPorsjon": "varchar(255)",
            "Kategorikode": "varchar(255)",
            "AntallPorsjoner": "integer",
            "Produksjonsmetode": "varchar(255)",
            "GruppeID": "integer references tbl_rpKalkyleGruppe",
            "Alergi": "varchar(255)",
            "Leveringsdato": "timestamp",
            "Merknad": "text",
            "BrukesTil": "varchar(255)",
            "Enhet": "char(10)",
            "NaeringsInnhold": "text",
            "TWPorsjon": "double precision"
        }
    },
    "tbl_rpKalkyledetaljer": {
        "columns": {
            "Kalkylekode": "bigint not null references tbl_rpKalkyle",
            "ProduktID": "bigint not null references tblProdukter",
            "Produktnavn": "text",
            "LeverandørsProduktNr": "text",
            "Pris": "double precision",
            "Porsjonsmengde": "bigint",
            "Enh": "text references tbl_rpTabEnheter",
            "TotMeng": "double precision",
            "kostPris": "text",
            "VisningsEnhet": "text",
            "SvinnProsent": "text",
            "tblKalkyleDetaljerID": "bigint",
            "EnergiKj": "text",
            "Kalorier": "text",
            "Fett": "text",
            "MettetFett": "text",
            "KarboHydrater": "text",
            "Sukkerarter": "text",
            "Kostfiber": "text",
            "Protein": "text",
            "Salt": "text",
            "MonoDisakk": "text"
        },
        "primary_key": ["Kalkylekode", "ProduktID"]
    }
}

# Generate type mapping
TYPE_MAPPING = {
    "bigint": "BigInteger",
    "integer": "Integer",
    "text": "Text",
    "varchar": "String",
    "boolean": "Boolean",
    "timestamp": "DateTime",
    "double precision": "Float",
    "numeric": "Numeric",
    "char": "String",
    "date": "Date"
}

def generate_column_definition(col_name, col_type):
    """Generate SQLAlchemy column definition."""
    # Parse type
    base_type = col_type.split()[0]
    is_nullable = "not null" not in col_type
    is_primary = "primary key" in col_type
    
    # Handle varchar with length
    if "varchar" in base_type:
        if "(" in base_type:
            length = base_type.split("(")[1].split(")")[0]
            sqlalchemy_type = f"String({length})"
        else:
            sqlalchemy_type = "String"
    elif "char(" in base_type:
        length = base_type.split("(")[1].split(")")[0]
        sqlalchemy_type = f"String({length})"
    else:
        sqlalchemy_type = TYPE_MAPPING.get(base_type, "Text")
    
    # Build column definition
    col_def = f'    {col_name} = Column("{col_name}", {sqlalchemy_type}'
    
    # Add constraints
    if is_primary:
        col_def += ", primary_key=True"
    if not is_nullable and not is_primary:
        col_def += ", nullable=False"
    
    # Handle foreign keys
    if "references" in col_type:
        ref_table = col_type.split("references")[1].strip().split()[0]
        col_def += f', ForeignKey("{ref_table}.{col_name}")'
    
    col_def += ")"
    
    return col_def

def generate_model(table_name, table_info):
    """Generate a SQLAlchemy model for a table."""
    model_lines = []
    
    # Class definition
    class_name = table_name.replace("tbl", "").replace("_", "")
    if class_name.startswith("rp"):
        class_name = class_name[2:]
    
    model_lines.append(f'class {class_name}(Base):')
    model_lines.append(f'    """Table: {table_name}"""')
    model_lines.append(f'    __tablename__ = "{table_name}"')
    model_lines.append("")
    
    # Add columns
    for col_name, col_type in table_info["columns"].items():
        model_lines.append(generate_column_definition(col_name, col_type))
    
    # Handle composite primary keys
    if "primary_key" in table_info and len(table_info["primary_key"]) > 1:
        pk_cols = ", ".join([f'"{col}"' for col in table_info["primary_key"]])
        model_lines.append("")
        model_lines.append(f"    __table_args__ = (")
        model_lines.append(f"        PrimaryKeyConstraint({pk_cols}),")
        model_lines.append(f"    )")
    
    return "\n".join(model_lines)

# Generate all models
print("# Auto-generated SQLAlchemy models based on database schema\n")
print("from sqlalchemy import Column, BigInteger, Integer, String, Text, Boolean, DateTime, Float, Date, ForeignKey, PrimaryKeyConstraint")
print("from app.infrastructure.database.session import Base\n\n")

for table_name, table_info in SCHEMA_DEFINITIONS.items():
    print(generate_model(table_name, table_info))
    print("\n")