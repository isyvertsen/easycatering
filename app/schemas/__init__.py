"""API schemas with standardized naming."""
from .ansatte import Ansatte, AnsatteCreate, AnsatteUpdate
from .kunder import Kunder, KunderCreate, KunderUpdate
from .leverandorer import Leverandorer, LeverandorerCreate, LeverandorerUpdate
from .kategorier import Kategorier, KategorierCreate, KategorierUpdate
from .produkter import Produkter, ProdukterCreate, ProdukterUpdate
from .ordrer import Ordrer, OrdrerCreate, OrdrerUpdate
from .ordredetaljer import Ordredetaljer, OrdredetaljerCreate
from .meny import Meny, MenyCreate, MenyUpdate, MenyWithProducts, MenyWithPeriods
from .periode import Periode, PeriodeCreate, PeriodeUpdate, PeriodeWithMenus
from .periode_meny import PeriodeMeny, PeriodeMenyCreate
from .meny_produkt import MenyProdukt, MenyProduktCreate, MenyProduktWithDetails
from .label_template import (
    LabelTemplate, LabelTemplateCreate, LabelTemplateUpdate, LabelTemplateList,
    TemplateParameter, TemplateParameterCreate, TemplateParameterUpdate,
    TemplateShare, TemplateShareCreate, TemplateShareUpdate,
    PrintHistory, PrintHistoryCreate,
    PreviewLabelRequest, GenerateLabelRequest, BatchGenerateRequest,
    ParameterType, SourceType,
)

__all__ = [
    "Ansatte", "AnsatteCreate", "AnsatteUpdate",
    "Kunder", "KunderCreate", "KunderUpdate",
    "Leverandorer", "LeverandorerCreate", "LeverandorerUpdate",
    "Kategorier", "KategorierCreate", "KategorierUpdate",
    "Produkter", "ProdukterCreate", "ProdukterUpdate",
    "Ordrer", "OrdrerCreate", "OrdrerUpdate",
    "Ordredetaljer", "OrdredetaljerCreate",
    "Meny", "MenyCreate", "MenyUpdate", "MenyWithProducts", "MenyWithPeriods",
    "Periode", "PeriodeCreate", "PeriodeUpdate", "PeriodeWithMenus",
    "PeriodeMeny", "PeriodeMenyCreate",
    "MenyProdukt", "MenyProduktCreate", "MenyProduktWithDetails",
    "LabelTemplate", "LabelTemplateCreate", "LabelTemplateUpdate", "LabelTemplateList",
    "TemplateParameter", "TemplateParameterCreate", "TemplateParameterUpdate",
    "TemplateShare", "TemplateShareCreate", "TemplateShareUpdate",
    "PrintHistory", "PrintHistoryCreate",
    "PreviewLabelRequest", "GenerateLabelRequest", "BatchGenerateRequest",
    "ParameterType", "SourceType",
]