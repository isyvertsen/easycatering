"""Response schemas for products API."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class MarkingBase(BaseModel):
    """Base marking schema."""
    code: str
    name: str


class MarkingCreate(MarkingBase):
    """Create marking schema."""
    pass


class MarkingResponse(MarkingBase):
    """Product marking response."""
    pass


class NutrientBase(BaseModel):
    """Base nutrient schema."""
    code: str
    measurement: float
    measurementPrecision: str = "APPROXIMATELY"
    measurementType: str
    name: str


class NutrientCreate(NutrientBase):
    """Create nutrient schema."""
    pass


class NutrientUpdate(BaseModel):
    """Update nutrient schema."""
    measurement: Optional[float] = None
    measurementPrecision: Optional[str] = None
    measurementType: Optional[str] = None
    name: Optional[str] = None


class NutrientResponse(NutrientBase):
    """Nutrient response."""
    pass


class AllergenBase(BaseModel):
    """Base allergen schema."""
    code: str
    level: str  # FREE_FROM, CONTAINS, MAY_CONTAIN
    name: str


class AllergenCreate(AllergenBase):
    """Create allergen schema."""
    pass


class AllergenUpdate(BaseModel):
    """Update allergen schema."""
    level: Optional[str] = None
    name: Optional[str] = None


class AllergenResponse(AllergenBase):
    """Allergen response."""
    pass


class GPCAttributeResponse(BaseModel):
    """GPC attribute response."""
    attributeType: Optional[List[Dict[str, Any]]] = None
    attributeValue: Optional[List[Dict[str, Any]]] = None


class GPCResponse(BaseModel):
    """GPC classification response."""
    segment: Optional[List[Dict[str, Any]]] = None
    family: Optional[List[Dict[str, Any]]] = None
    class_: Optional[List[Dict[str, Any]]] = None
    brick: Optional[List[Dict[str, Any]]] = None
    gpcAttributes: Optional[List[GPCAttributeResponse]] = None

    class Config:
        fields = {"class_": "class"}


class PreparationsResponse(BaseModel):
    """Preparations response."""
    method: Optional[str] = None
    description: Optional[str] = None


class StorageInfoResponse(BaseModel):
    """Storage information response."""
    tempMin: Optional[float] = None
    tempMax: Optional[float] = None
    totalStorageTimeDays: Optional[int] = None
    distributorStorageTimeMinDays: Optional[int] = None


class ProductBase(BaseModel):
    """Base product schema."""
    gtin: str
    name: str
    itemNumber: Optional[str] = None
    epdNumber: Optional[str] = None
    producerName: Optional[str] = None
    providerName: Optional[str] = None
    brandName: Optional[str] = None
    ingredientStatement: Optional[str] = None
    productUrl: Optional[str] = None
    packageSize: Optional[str] = None


class ProductCreate(ProductBase):
    """Create product request."""
    id: Optional[str] = None  # If not provided, will be generated
    markings: Optional[List[MarkingCreate]] = []
    images: Optional[List[str]] = []
    nutrients: Optional[List[NutrientCreate]] = []
    allergens: Optional[List[AllergenCreate]] = []


class ProductUpdate(BaseModel):
    """Update product request."""
    gtin: Optional[str] = None
    name: Optional[str] = None
    itemNumber: Optional[str] = None
    epdNumber: Optional[str] = None
    producerName: Optional[str] = None
    providerName: Optional[str] = None
    brandName: Optional[str] = None
    ingredientStatement: Optional[str] = None
    productUrl: Optional[str] = None
    packageSize: Optional[str] = None
    markings: Optional[List[MarkingCreate]] = None
    images: Optional[List[str]] = None
    nutrients: Optional[List[NutrientCreate]] = None
    allergens: Optional[List[AllergenCreate]] = None


class ProductDetailResponse(BaseModel):
    """Complete product detail response."""
    id: str
    gtin: str  # Must be string to preserve leading zeros
    name: str
    itemNumber: Optional[int] = None
    epdNumber: Optional[int] = None
    producerName: Optional[str] = None
    providerName: Optional[str] = None
    brandName: Optional[str] = None
    ingredientStatement: Optional[str] = None
    productUrl: Optional[str] = None
    markings: Optional[List[MarkingResponse]] = []
    images: Optional[List[str]] = []
    packageSize: Optional[str] = None
    nutrients: List[NutrientResponse] = []
    allergens: List[AllergenResponse] = []
    gpc: Optional[GPCResponse] = None
    preparations: Optional[PreparationsResponse] = None
    storageInfo: Optional[StorageInfoResponse] = None

    class Config:
        orm_mode = True


class ProductListResponse(BaseModel):
    """Product list response."""
    total: int
    items: List[ProductDetailResponse]
    page: int = 1
    size: int = 50


class VendorProductImport(BaseModel):
    """Vendor product import schema - matches vendor JSON format."""
    gtin: str
    name: str
    itemNumber: Optional[str] = None
    epdNumber: Optional[str] = None
    producerName: Optional[str] = None
    providerName: Optional[str] = None
    brandName: Optional[str] = None
    ingredientStatement: Optional[str] = None
    productUrl: Optional[str] = None
    productDescription: Optional[str] = None
    countryOfOrigin: Optional[str] = None
    countryOfPreparation: Optional[str] = None
    fpakk: Optional[str] = None
    dpakk: Optional[str] = None
    pall: Optional[str] = None
    created: Optional[str] = None
    updated: Optional[str] = None
    packageSize: Optional[str] = None
    markings: Optional[List[MarkingCreate]] = []
    images: Optional[List[str]] = []
    nutrients: List[NutrientCreate] = []
    allergens: List[AllergenCreate] = []


class VendorImportResponse(BaseModel):
    """Response for vendor import operation."""
    success: bool
    message: str
    product_id: Optional[str] = None
    gtin: str
    operation: str  # "created" or "updated"


class ProductExportRequest(BaseModel):
    """Request for product export operation."""
    format: str = "jsonl"
    
    @validator('format')
    def validate_format(cls, v):
        allowed_formats = ["json", "jsonl", "markdown"]
        if v not in allowed_formats:
            raise ValueError(f"Format must be one of: {', '.join(allowed_formats)}")
        return v


class ProductExportResponse(BaseModel):
    """Response for product export operation."""
    success: bool
    message: str
    export_path: Optional[str] = None
    files_created: int = 0
    total_products: int = 0
    timestamp: Optional[str] = None