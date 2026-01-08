"""Database models with standardized naming."""
from .ansatte import Ansatte
from .kunder import Kunder
from .kunde_gruppe import Kundegruppe
from .leverandorer import Leverandorer
from .kategorier import Kategorier
from .produkter import Produkter
from .ordrer import Ordrer
from .ordredetaljer import Ordredetaljer
from .asko_ny import AskoNy
from .meny import Meny
from .menygruppe import Menygruppe
from .meny_produkt import MenyProdukt
from .kalkyle import Kalkyle
from .kalkyledetaljer import Kalkyledetaljer
from .kalkylegruppe import Kalkylegruppe
from .periode import Periode
from .periode_meny import PeriodeMeny
from .matinfo_products import MatinfoProduct, MatinfoAllergen, MatinfoNutrient
from .combined_dish import CombinedDish, CombinedDishRecipe, CombinedDishProduct
from .preparation_instruction import PreparationInstruction
from .label_template import LabelTemplate, TemplateParameter, TemplateShare, PrintHistory
from .customer_access_token import CustomerAccessToken

__all__ = [
    "Ansatte",
    "Kunder",
    "Kundegruppe",
    "Leverandorer",
    "Kategorier",
    "Produkter",
    "Ordrer",
    "Ordredetaljer",
    "AskoNy",
    "Meny",
    "Menygruppe",
    "MenyProdukt",
    "Kalkyle",
    "Kalkyledetaljer",
    "Kalkylegruppe",
    "Periode",
    "PeriodeMeny",
    "MatinfoProduct",
    "MatinfoAllergen",
    "MatinfoNutrient",
    "CombinedDish",
    "CombinedDishRecipe",
    "CombinedDishProduct",
    "PreparationInstruction",
    "LabelTemplate",
    "TemplateParameter",
    "TemplateShare",
    "PrintHistory",
    "CustomerAccessToken",
]