# Backend Implementeringsplan: Etikett-Designer

## Oversikt

Backend-del av etikett-designer systemet. Ansvarlig for:
- Database-modeller og migrasjoner
- CRUD API for maler
- PDF-generering fra pdfme templates
- Datakilder for dynamiske parametere

**Avhengighet**: Frontend trenger disse API-ene for å fungere.

---

## Teknisk Stack

| Komponent | Teknologi | Status |
|-----------|-----------|--------|
| Framework | FastAPI | Eksisterer |
| Database | PostgreSQL + SQLAlchemy 2.0 async | Eksisterer |
| PDF-generering | ReportLab 4.0.8 (eller FPDF2) | ReportLab installert |
| Strekkoder | python-barcode | Må installeres |
| QR-koder | qrcode | Må installeres |
| Bilder | Pillow | Må installeres |

### Nye Avhengigheter

Legg til i `requirements.txt`:
```
python-barcode>=0.15.0
qrcode>=7.4.0
Pillow>=10.0.0
```

---

## Fase 1: Database & API Grunnlag

### 1.1 Database-migrasjoner

**VIKTIG**: Bruk custom migrasjonssystem i `app/core/migrations.py`, IKKE Alembic!

#### Tabeller å opprette

**label_templates**
```python
class LabelTemplate(Base):
    __tablename__ = "label_templates"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    template_json = Column(JSONB, nullable=False)  # pdfme template struktur
    width_mm = Column(Numeric(10, 2), default=100)
    height_mm = Column(Numeric(10, 2), default=50)
    owner_id = Column(UUID, ForeignKey("users.id"))
    is_global = Column(Boolean, default=False)
    thumbnail_url = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="label_templates")
    parameters = relationship("TemplateParameter", back_populates="template", cascade="all, delete-orphan")
    shares = relationship("TemplateShare", back_populates="template", cascade="all, delete-orphan")
```

**template_parameters**
```python
class TemplateParameter(Base):
    __tablename__ = "template_parameters"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID, ForeignKey("label_templates.id", ondelete="CASCADE"))
    field_name = Column(String(100), nullable=False)  # Navn i pdfme schema
    display_name = Column(String(255), nullable=False)  # Visningsnavn i UI
    parameter_type = Column(String(50))  # text, number, date, barcode, qr, image
    source_type = Column(String(50))  # manual, database, api
    source_config = Column(JSONB)  # {"table": "products", "column": "name"}
    is_required = Column(Boolean, default=True)
    default_value = Column(Text)
    validation_regex = Column(String(500))
    sort_order = Column(Integer, default=0)

    template = relationship("LabelTemplate", back_populates="parameters")
```

**template_shares**
```python
class TemplateShare(Base):
    __tablename__ = "template_shares"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID, ForeignKey("label_templates.id", ondelete="CASCADE"))
    shared_with_user_id = Column(UUID, ForeignKey("users.id"))
    permission = Column(String(20))  # view, edit
    created_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('template_id', 'shared_with_user_id'),
    )

    template = relationship("LabelTemplate", back_populates="shares")
    shared_with = relationship("User")
```

**print_history**
```python
class PrintHistory(Base):
    __tablename__ = "print_history"

    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID, ForeignKey("label_templates.id", ondelete="SET NULL"))
    user_id = Column(UUID, ForeignKey("users.id"))
    printer_name = Column(String(255))
    input_data = Column(JSONB)
    copies = Column(Integer, default=1)
    status = Column(String(50))  # success, failed
    error_message = Column(Text)
    printed_at = Column(DateTime, default=datetime.utcnow)
```

### 1.2 Pydantic Schemas

Opprett `app/schemas/label_template.py`:

```python
from enum import Enum
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class ParameterType(str, Enum):
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    BARCODE = "barcode"
    QR = "qr"
    IMAGE = "image"

class SourceType(str, Enum):
    MANUAL = "manual"
    DATABASE = "database"
    API = "api"

# Template Parameter Schemas
class TemplateParameterBase(BaseModel):
    field_name: str
    display_name: str
    parameter_type: Optional[ParameterType] = ParameterType.TEXT
    source_type: Optional[SourceType] = SourceType.MANUAL
    source_config: Optional[Dict[str, Any]] = None
    is_required: bool = True
    default_value: Optional[str] = None
    validation_regex: Optional[str] = None
    sort_order: int = 0

class TemplateParameterCreate(TemplateParameterBase):
    pass

class TemplateParameterResponse(TemplateParameterBase):
    id: UUID
    template_id: UUID

    class Config:
        from_attributes = True

# Label Template Schemas
class LabelTemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    template_json: Dict[str, Any]
    width_mm: float = 100
    height_mm: float = 50
    is_global: bool = False

class LabelTemplateCreate(LabelTemplateBase):
    parameters: Optional[List[TemplateParameterCreate]] = []

class LabelTemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    template_json: Optional[Dict[str, Any]] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    is_global: Optional[bool] = None
    parameters: Optional[List[TemplateParameterCreate]] = None

class LabelTemplateResponse(LabelTemplateBase):
    id: UUID
    owner_id: Optional[UUID]
    thumbnail_url: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    parameters: List[TemplateParameterResponse] = []

    class Config:
        from_attributes = True

# PDF Generation Schemas
class GenerateLabelRequest(BaseModel):
    template_id: UUID
    inputs: Dict[str, Any]
    copies: int = 1

class PreviewLabelRequest(BaseModel):
    template_json: Dict[str, Any]
    inputs: Dict[str, Any]
    width_mm: float = 100
    height_mm: float = 50

class BatchGenerateRequest(BaseModel):
    template_id: UUID
    inputs_list: List[Dict[str, Any]]

# Share Schemas
class TemplateShareCreate(BaseModel):
    shared_with_user_id: UUID
    permission: str = "view"  # view, edit

class TemplateShareResponse(BaseModel):
    id: UUID
    shared_with_user_id: UUID
    permission: str
    created_at: datetime

    class Config:
        from_attributes = True
```

### 1.3 API Endpoints

Opprett `app/api/v1/label_templates.py`:

| Metode | Endpoint | Beskrivelse |
|--------|----------|-------------|
| GET | `/label-templates` | Liste brukerens maler (inkl. globale) |
| GET | `/label-templates/{id}` | Hent én mal |
| POST | `/label-templates` | Opprett ny mal |
| PUT | `/label-templates/{id}` | Oppdater mal |
| DELETE | `/label-templates/{id}` | Slett mal |
| POST | `/label-templates/{id}/share` | Del med bruker |
| GET | `/label-templates/{id}/shares` | Liste delinger |
| DELETE | `/label-templates/{id}/shares/{user_id}` | Fjern deling |

Registrer i `app/api/v1/__init__.py`:
```python
from app.api.v1.label_templates import router as label_templates_router
api_router.include_router(label_templates_router, prefix="/label-templates", tags=["Label Templates"])
```

### 1.4 Service Layer

Opprett `app/services/label_template_service.py`:

```python
async def get_user_templates(db: AsyncSession, user_id: UUID, include_global: bool = True) -> List[LabelTemplate]:
    """Hent maler bruker har tilgang til"""

async def get_template(db: AsyncSession, template_id: UUID, user_id: UUID) -> LabelTemplate:
    """Hent mal med tilgangssjekk"""

async def create_template(db: AsyncSession, data: LabelTemplateCreate, owner_id: UUID) -> LabelTemplate:
    """Opprett mal med parametere"""

async def update_template(db: AsyncSession, template_id: UUID, data: LabelTemplateUpdate, user_id: UUID) -> LabelTemplate:
    """Oppdater mal (krever eierskap eller edit-tilgang)"""

async def delete_template(db: AsyncSession, template_id: UUID, user_id: UUID) -> bool:
    """Slett mal (kun eier)"""

async def share_template(db: AsyncSession, template_id: UUID, share_data: TemplateShareCreate, owner_id: UUID) -> TemplateShare:
    """Del mal med annen bruker"""

async def check_template_access(db: AsyncSession, template_id: UUID, user_id: UUID, required_permission: str = "view") -> bool:
    """Sjekk om bruker har tilgang"""
```

### Leveranser Fase 1

- [ ] Migrasjon opprettet i `app/core/migrations.py`
- [ ] Modeller i `app/models/label_template.py`
- [ ] Schemas i `app/schemas/label_template.py`
- [ ] Service i `app/services/label_template_service.py`
- [ ] API endpoints i `app/api/v1/label_templates.py`
- [ ] Enhetstester i `tests/test_label_templates.py`

---

## Fase 2: PDF Generator Service

### 2.1 PDF Generator

Opprett `app/services/pdf_generator_service.py`:

```python
from io import BytesIO
from typing import Dict, Any, List
import barcode
from barcode.writer import ImageWriter
import qrcode
from PIL import Image

# Velg ett av disse basert på beslutning:
# from reportlab.lib.pagesizes import mm
# from reportlab.pdfgen import canvas
# ELLER
# from fpdf import FPDF

class PdfGeneratorService:
    """Generer PDF fra pdfme template JSON"""

    def generate_pdf(
        self,
        template_json: Dict[str, Any],
        inputs: Dict[str, Any],
        width_mm: float,
        height_mm: float
    ) -> bytes:
        """Generer én etikett som PDF"""

    def generate_pdf_batch(
        self,
        template_json: Dict[str, Any],
        inputs_list: List[Dict[str, Any]],
        width_mm: float,
        height_mm: float
    ) -> bytes:
        """Generer flere etiketter i én PDF"""

    def _render_element(self, pdf, schema: Dict, value: Any):
        """Render ett element basert på type"""
        element_type = schema.get("type")

        if element_type == "text":
            self._render_text(pdf, schema, value)
        elif element_type == "image":
            self._render_image(pdf, schema, value)
        elif element_type == "qrcode":
            self._render_qr(pdf, schema, value)
        elif element_type in ["code128", "ean13", "code39"]:
            self._render_barcode(pdf, schema, value, element_type)

    def _render_text(self, pdf, schema: Dict, value: str):
        """Render tekst med styling"""

    def _render_barcode(self, pdf, schema: Dict, value: str, barcode_type: str):
        """Generer og render strekkode"""

    def _render_qr(self, pdf, schema: Dict, value: str):
        """Generer og render QR-kode"""

    def _render_image(self, pdf, schema: Dict, value: str):
        """Render bilde (base64 eller URL)"""
```

### 2.2 pdfme Template Mapping

pdfme template struktur:
```json
{
  "schemas": [
    [
      {
        "name": "product_name",
        "type": "text",
        "position": { "x": 10, "y": 10 },
        "width": 80,
        "height": 10,
        "fontSize": 12,
        "fontColor": "#000000",
        "alignment": "left"
      },
      {
        "name": "barcode",
        "type": "code128",
        "position": { "x": 10, "y": 25 },
        "width": 60,
        "height": 15
      }
    ]
  ],
  "basePdf": { "width": 100, "height": 50 }
}
```

### 2.3 Font-støtte

For norske tegn (æøå):
- ReportLab: Bruk innebygd Helvetica eller registrer TTF
- FPDF2: Registrer DejaVuSans font

Plasser fonter i `app/fonts/` hvis nødvendig.

### 2.4 API Endpoints for PDF

Legg til i `app/api/v1/labels.py`:

| Metode | Endpoint | Beskrivelse | Response |
|--------|----------|-------------|----------|
| POST | `/labels/preview` | Generer preview | Base64 PNG |
| POST | `/labels/generate` | Generer PDF | PDF bytes |
| POST | `/labels/batch` | Generer batch | PDF bytes |

```python
@router.post("/preview")
async def preview_label(
    request: PreviewLabelRequest,
    current_user: User = Depends(get_current_user)
) -> dict:
    """Generer preview som base64"""
    pdf_bytes = pdf_service.generate_pdf(
        request.template_json,
        request.inputs,
        request.width_mm,
        request.height_mm
    )
    # Konverter til PNG for preview
    return {"preview": base64_encode(pdf_to_image(pdf_bytes))}

@router.post("/generate")
async def generate_label(
    request: GenerateLabelRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """Generer PDF for print"""
    template = await label_service.get_template(db, request.template_id, current_user.id)
    pdf_bytes = pdf_service.generate_pdf(
        template.template_json,
        request.inputs,
        template.width_mm,
        template.height_mm
    )
    return Response(content=pdf_bytes, media_type="application/pdf")
```

### Leveranser Fase 2

- [ ] `PdfGeneratorService` implementert
- [ ] Støtte for text, barcode, qrcode, image
- [ ] UTF-8 font-støtte (norske tegn)
- [ ] Preview endpoint (base64 PNG)
- [ ] Generate endpoint (PDF bytes)
- [ ] Batch endpoint
- [ ] Enhetstester for alle elementtyper

---

## Fase 5: Datakilder (Backend-del)

### 5.1 Database Source Endpoints

```python
@router.get("/sources/tables")
async def get_available_tables(
    current_user: User = Depends(get_current_user)
) -> List[str]:
    """Liste tilgjengelige tabeller for parameter-binding"""
    # Returner hviteliste av tabeller
    return ["tblprodukter", "tblkunder", "tbloppskrifter"]

@router.get("/sources/columns")
async def get_table_columns(
    table: str,
    current_user: User = Depends(get_current_user)
) -> List[dict]:
    """Liste kolonner for en tabell"""

@router.get("/sources/data")
async def search_source_data(
    table: str,
    column: str,
    search: str = "",
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[dict]:
    """Søk i datakilde"""
```

### 5.2 Print History

```python
@router.post("/print-history")
async def log_print(
    template_id: UUID,
    printer_name: str,
    input_data: Dict[str, Any],
    copies: int,
    status: str,
    error_message: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Logg utskrift"""

@router.get("/print-history")
async def get_print_history(
    template_id: Optional[UUID] = None,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hent utskriftshistorikk"""
```

---

## Fase 6: Testing (Backend)

### Enhetstester

```python
# tests/test_label_templates.py

async def test_create_template():
    """Test opprettelse av mal"""

async def test_get_user_templates():
    """Test listing av maler med tilgangskontroll"""

async def test_update_template_owner_only():
    """Test at kun eier kan oppdatere"""

async def test_share_template():
    """Test deling av mal"""

async def test_shared_user_can_view():
    """Test at delt bruker kan se mal"""

# tests/test_pdf_generator.py

def test_generate_text_element():
    """Test tekst-rendering"""

def test_generate_barcode_code128():
    """Test Code128 strekkode"""

def test_generate_qr_code():
    """Test QR-kode generering"""

def test_generate_batch():
    """Test batch-generering"""

def test_norwegian_characters():
    """Test æøå i PDF"""
```

---

## Filstruktur

```
app/
├── api/v1/
│   ├── label_templates.py    # CRUD endpoints
│   └── labels.py             # PDF generation endpoints
├── models/
│   ├── label_template.py     # LabelTemplate model
│   ├── template_parameter.py # TemplateParameter model
│   ├── template_share.py     # TemplateShare model
│   └── print_history.py      # PrintHistory model
├── schemas/
│   └── label_template.py     # Alle Pydantic schemas
├── services/
│   ├── label_template_service.py  # CRUD logic
│   └── pdf_generator_service.py   # PDF generation
└── fonts/                    # TTF fonter (hvis nødvendig)

tests/
├── test_label_templates.py
└── test_pdf_generator.py
```

---

## Beslutningspunkter

1. **ReportLab vs FPDF2**
   - ReportLab er allerede installert og brukt i `label_generator.py`
   - FPDF2 er lettere, men krever ny implementasjon
   - **Anbefaling**: Start med ReportLab, bytt hvis nødvendig

2. **UUID vs Integer for ID**
   - Planen spesifiserer UUID
   - Eksisterende modeller bruker Integer
   - **Beslutning trengs**: Velg én tilnærming

---

## API Dokumentasjon

Alle endpoints dokumenteres automatisk i Swagger UI:
- `http://localhost:8000/api/docs`
