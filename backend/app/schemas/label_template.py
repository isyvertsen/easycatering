"""Label template schemas."""
from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime

from .base import BaseSchema


class ParameterType(str, Enum):
    """Parameter type enum."""
    TEXT = "text"
    NUMBER = "number"
    DATE = "date"
    BARCODE = "barcode"
    QR = "qr"
    IMAGE = "image"


class SourceType(str, Enum):
    """Source type enum."""
    MANUAL = "manual"
    DATABASE = "database"
    API = "api"


# Printer Configuration Schema
class PrinterConfig(BaseSchema):
    """Zebra printer configuration settings."""
    darkness: Optional[int] = 15  # 0-30 (ZPL: ~SD)
    speed: Optional[int] = 4  # 2-14 inches per second (ZPL: ^PR)


# Template Parameter Schemas
class TemplateParameterBase(BaseSchema):
    """Base template parameter schema."""
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
    """Schema for creating a template parameter."""
    pass


class TemplateParameterUpdate(BaseSchema):
    """Schema for updating a template parameter."""
    field_name: Optional[str] = None
    display_name: Optional[str] = None
    parameter_type: Optional[ParameterType] = None
    source_type: Optional[SourceType] = None
    source_config: Optional[Dict[str, Any]] = None
    is_required: Optional[bool] = None
    default_value: Optional[str] = None
    validation_regex: Optional[str] = None
    sort_order: Optional[int] = None


class TemplateParameter(TemplateParameterBase):
    """Template parameter response schema."""
    id: int
    template_id: int


# Label Template Schemas
class LabelTemplateBase(BaseSchema):
    """Base label template schema."""
    name: str
    description: Optional[str] = None
    template_json: Dict[str, Any]
    width_mm: float = 100.0
    height_mm: float = 50.0
    is_global: bool = False
    printer_config: Optional[PrinterConfig] = None


class LabelTemplateCreate(LabelTemplateBase):
    """Schema for creating a label template."""
    parameters: Optional[List[TemplateParameterCreate]] = []


class LabelTemplateUpdate(BaseSchema):
    """Schema for updating a label template."""
    name: Optional[str] = None
    description: Optional[str] = None
    template_json: Optional[Dict[str, Any]] = None
    width_mm: Optional[float] = None
    height_mm: Optional[float] = None
    is_global: Optional[bool] = None
    printer_config: Optional[PrinterConfig] = None
    parameters: Optional[List[TemplateParameterCreate]] = None


class LabelTemplate(LabelTemplateBase):
    """Label template response schema."""
    id: int
    owner_id: Optional[int] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    parameters: List[TemplateParameter] = []


class LabelTemplateList(BaseSchema):
    """Label template list item (without full template_json)."""
    id: int
    name: str
    description: Optional[str] = None
    width_mm: float
    height_mm: float
    owner_id: Optional[int] = None
    is_global: bool
    thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


# Template Share Schemas
class TemplateShareCreate(BaseSchema):
    """Schema for creating a template share."""
    shared_with_user_id: int
    permission: str = "view"  # view, edit


class TemplateShareUpdate(BaseSchema):
    """Schema for updating a template share."""
    permission: str


class TemplateShare(BaseSchema):
    """Template share response schema."""
    id: int
    template_id: int
    shared_with_user_id: int
    permission: str
    created_at: datetime


# PDF Generation Schemas
class PreviewLabelRequest(BaseSchema):
    """Schema for label preview request."""
    template_json: Dict[str, Any]
    inputs: Dict[str, Any]
    width_mm: float = 100.0
    height_mm: float = 50.0


class GenerateLabelRequest(BaseSchema):
    """Schema for label generation request."""
    template_id: int
    inputs: Dict[str, Any]
    copies: int = 1


class BatchGenerateRequest(BaseSchema):
    """Schema for batch label generation request."""
    template_id: int
    inputs_list: List[Dict[str, Any]]


# Print History Schemas
class PrintHistoryCreate(BaseSchema):
    """Schema for creating print history entry."""
    template_id: int
    printer_name: str
    input_data: Dict[str, Any]
    copies: int = 1
    status: str  # success, failed
    error_message: Optional[str] = None


class PrintHistory(BaseSchema):
    """Print history response schema."""
    id: int
    template_id: Optional[int] = None
    user_id: Optional[int] = None
    printer_name: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    copies: int
    status: str
    error_message: Optional[str] = None
    printed_at: datetime


# Data Source Schemas
class TableColumn(BaseSchema):
    """Table column info."""
    name: str
    type: str


class DataSourceResult(BaseSchema):
    """Data source search result."""
    id: Any
    value: str
    display: Optional[str] = None
