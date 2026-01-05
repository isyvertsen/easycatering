"""API endpoints for recipe (kalkyle) management."""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text
from sqlalchemy.orm import selectinload
from app.api.deps import get_db, get_current_user
from app.models.kalkyle import Kalkyle
from app.models.kalkyledetaljer import Kalkyledetaljer
from app.models.kalkylegruppe import Kalkylegruppe
from app.models.matinfo_products import MatinfoProduct, MatinfoNutrient, MatinfoAllergen
from app.models.produkter import Produkter
from app.domain.entities.user import User
from app.services.label_generator import get_label_generator
from app.services.zpl_label_generator import get_zpl_label_generator
from app.services.dish_name_generator import get_dish_name_generator
from pydantic import BaseModel
from datetime import datetime

router = APIRouter()

# Pydantic schemas
class KalkyleDetaljerBase(BaseModel):
    tblkalkyledetaljerid: Optional[int] = None  # Primary key for React keys
    produktid: Optional[int] = None
    produktnavn: Optional[str] = None  # Product name from relation
    ingrediensnavn: Optional[str] = None
    mengde: Optional[float] = None
    porsjonsmengde: Optional[int] = None  # Actual field name in DB
    enhet: Optional[str] = None
    enh: Optional[str] = None  # Actual field name in DB
    pris: Optional[float] = None
    kostpris: Optional[str] = None
    leverandorid: Optional[int] = None
    svinnprosent: Optional[str] = None
    merknad: Optional[str] = None

class KalkyleBase(BaseModel):
    kalkylenavn: str
    informasjon: Optional[str] = None
    refporsjon: Optional[str] = None
    kategorikode: Optional[str] = None
    antallporsjoner: Optional[int] = 1
    produksjonsmetode: Optional[str] = None
    gruppeid: Optional[int] = None
    alergi: Optional[str] = None
    merknad: Optional[str] = None
    brukestil: Optional[str] = None
    enhet: Optional[str] = None
    naeringsinnhold: Optional[str] = None
    twporsjon: Optional[float] = None

class KalkyleCreate(KalkyleBase):
    detaljer: Optional[List[KalkyleDetaljerBase]] = []

class KalkyleResponse(KalkyleBase):
    kalkylekode: int
    ansattid: Optional[int] = None
    opprettetdato: Optional[datetime] = None
    revidertdato: Optional[datetime] = None
    leveringsdato: Optional[datetime] = None
    
    class Config:
        from_attributes = True

class KalkyleDetailResponse(KalkyleResponse):
    detaljer: List[KalkyleDetaljerBase] = []

class NutritionData(BaseModel):
    """Næringsverdier."""
    energy_kj: float = 0.0
    energy_kcal: float = 0.0
    protein: float = 0.0
    fat: float = 0.0
    saturated_fat: float = 0.0
    carbs: float = 0.0
    sugars: float = 0.0
    fiber: float = 0.0
    salt: float = 0.0
    polyunsaturated_fat: float = 0.0  # Flerumettede fettsyrer
    monounsaturated_fat: float = 0.0  # Enumettede fettsyrer
    sugar_alcohols: float = 0.0       # Sukkeralkoholer

class DataQuality(BaseModel):
    """Datakvalitet for næringsberegning."""
    total_ingredients: int
    with_nutrition_data: int
    coverage_percentage: float
    quality: str

class IngredientNutrition(BaseModel):
    """Næring for en ingrediens."""
    product_id: int
    amount: float
    unit: str
    nutrition: Optional[NutritionData] = None

class NutritionResponse(BaseModel):
    """Response for næringsberegning."""
    kalkylekode: int
    kalkylenavn: str
    portions: int
    total_weight_grams: float
    total_nutrition: NutritionData
    nutrition_per_100g: NutritionData
    nutrition_per_portion: NutritionData
    ingredients_nutrition: List[IngredientNutrition]
    data_quality: DataQuality

class RecipeComponent(BaseModel):
    """En oppskrift-komponent i en kombinert rett."""
    kalkylekode: int
    amount_grams: float

class ProductComponent(BaseModel):
    """Et produkt-komponent i en kombinert rett."""
    produktid: int
    amount_grams: float

class CombineRecipesRequest(BaseModel):
    """Request for å kombinere flere oppskrifter og produkter."""
    name: str
    preparation_instructions: Optional[str] = None
    recipes: List[RecipeComponent] = []
    products: List[ProductComponent] = []

class RecipeNutritionSummary(BaseModel):
    """Oppsummering av næring for en oppskrift i kombinasjonen."""
    kalkylekode: int
    kalkylenavn: str
    amount_grams: float
    nutrition_contribution: NutritionData

class ProductNutritionSummary(BaseModel):
    """Oppsummering av næring for et produkt i kombinasjonen."""
    produktid: int
    produktnavn: str
    amount_grams: float
    nutrition_contribution: NutritionData

class AllergenInfo(BaseModel):
    """Allergen informasjon."""
    code: str
    level: str  # CONTAINS, MAY_CONTAIN, FREE_FROM
    name: str

class CombinedNutritionResponse(BaseModel):
    """Response for kombinert næringsberegning."""
    name: str
    recipes: List[RecipeNutritionSummary]
    products: List[ProductNutritionSummary]
    total_weight_grams: float
    combined_nutrition_per_100g: NutritionData
    total_nutrition: NutritionData
    allergens: List[AllergenInfo]
    data_quality: DataQuality

class KalkyleListResponse(BaseModel):
    """Paginated response for oppskrifter list."""
    items: List[KalkyleResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

@router.get("/", response_model=KalkyleListResponse)
async def list_kalkyler(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = None,
    gruppeid: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List alle oppskrifter/kalkyler."""
    # Build base query
    base_query = select(Kalkyle)

    if search:
        base_query = base_query.where(Kalkyle.kalkylenavn.ilike(f"%{search}%"))

    if gruppeid:
        base_query = base_query.where(Kalkyle.gruppeid == gruppeid)

    # Get total count
    count_query = select(func.count()).select_from(base_query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Get paginated results
    query = base_query.offset(skip).limit(limit)
    result = await db.execute(query)
    kalkyler = result.scalars().all()

    # Calculate pagination
    page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return KalkyleListResponse(
        items=kalkyler,
        total=total,
        page=page,
        page_size=limit,
        total_pages=total_pages
    )

@router.get("/{kalkylekode}", response_model=KalkyleDetailResponse)
async def get_kalkyle(
    kalkylekode: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Hent en spesifikk oppskrift/kalkyle med ingredienser."""
    query = select(Kalkyle).where(Kalkyle.kalkylekode == kalkylekode).options(
        selectinload(Kalkyle.detaljer)
    )
    
    result = await db.execute(query)
    kalkyle = result.scalar_one_or_none()
    
    if not kalkyle:
        raise HTTPException(status_code=404, detail="Oppskrift ikke funnet")
    
    return kalkyle

@router.post("/", response_model=KalkyleResponse, status_code=201)
async def create_kalkyle(
    kalkyle_data: KalkyleCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Opprett ny oppskrift/kalkyle."""
    # Create kalkyle
    kalkyle = Kalkyle(
        kalkylenavn=kalkyle_data.kalkylenavn,
        ansattid=current_user.id if hasattr(current_user, 'id') else None,
        opprettetdato=datetime.utcnow(),
        informasjon=kalkyle_data.informasjon,
        refporsjon=kalkyle_data.refporsjon,
        kategorikode=kalkyle_data.kategorikode,
        antallporsjoner=kalkyle_data.antallporsjoner,
        produksjonsmetode=kalkyle_data.produksjonsmetode,
        gruppeid=kalkyle_data.gruppeid,
        alergi=kalkyle_data.alergi,
        merknad=kalkyle_data.merknad,
        brukestil=kalkyle_data.brukestil,
        enhet=kalkyle_data.enhet,
        naeringsinnhold=kalkyle_data.naeringsinnhold,
        twporsjon=kalkyle_data.twporsjon
    )
    
    db.add(kalkyle)
    await db.flush()
    
    # Add ingredients
    for detalj_data in kalkyle_data.detaljer:
        detalj = KalkyleDetaljer(
            kalkylekode=kalkyle.kalkylekode,
            produktid=detalj_data.produktid,
            ingrediensnavn=detalj_data.ingrediensnavn,
            mengde=detalj_data.mengde,
            enhet=detalj_data.enhet,
            pris=detalj_data.pris,
            leverandorid=detalj_data.leverandorid,
            merknad=detalj_data.merknad
        )
        db.add(detalj)
    
    await db.commit()
    await db.refresh(kalkyle)
    
    return kalkyle

@router.put("/{kalkylekode}", response_model=KalkyleResponse)
async def update_kalkyle(
    kalkylekode: int,
    kalkyle_data: KalkyleBase,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Oppdater eksisterende oppskrift/kalkyle."""
    query = select(Kalkyle).where(Kalkyle.kalkylekode == kalkylekode)
    result = await db.execute(query)
    kalkyle = result.scalar_one_or_none()
    
    if not kalkyle:
        raise HTTPException(status_code=404, detail="Oppskrift ikke funnet")
    
    # Update fields
    for key, value in kalkyle_data.dict(exclude_unset=True).items():
        setattr(kalkyle, key, value)
    
    kalkyle.revidertdato = datetime.utcnow()
    
    await db.commit()
    await db.refresh(kalkyle)
    
    return kalkyle

@router.delete("/{kalkylekode}", status_code=204)
async def delete_kalkyle(
    kalkylekode: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Slett oppskrift/kalkyle."""
    query = select(Kalkyle).where(Kalkyle.kalkylekode == kalkylekode)
    result = await db.execute(query)
    kalkyle = result.scalar_one_or_none()
    
    if not kalkyle:
        raise HTTPException(status_code=404, detail="Oppskrift ikke funnet")
    
    await db.delete(kalkyle)
    await db.commit()

@router.get("/grupper/", response_model=List[dict])
async def list_grupper(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List alle oppskriftsgrupper."""
    query = select(KalkyleGruppe).order_by(KalkyleGruppe.sortering)
    result = await db.execute(query)
    grupper = result.scalars().all()

    return [
        {
            "gruppeid": g.gruppeid,
            "gruppenavn": g.gruppenavn,
            "beskrivelse": g.beskrivelse,
            "sortering": g.sortering
        }
        for g in grupper
    ]

# Mapping av Matinfo næringskoder til våre felter
NUTRIENT_CODES = {
    "ENERC_KJ": "energy_kj",
    "ENERC_KCAL": "energy_kcal",
    "PROCNT": "protein",
    "FAT": "fat",
    "FASAT": "saturated_fat",
    "CHO-": "carbs",
    "SUGAR": "sugars",
    "FIBTG": "fiber",
    "NACL": "salt",
    "FAPU": "polyunsaturated_fat",  # Flerumettede fettsyrer
    "FAMS": "monounsaturated_fat",  # Enumettede fettsyrer
    "POLYL": "sugar_alcohols",      # Sukkeralkoholer
}

# Konverteringsfaktorer for enheter til gram
UNIT_TO_GRAMS = {
    "g": 1.0,
    "g- gr": 1.0,
    "kg": 1000.0,
    "mg": 0.001,
    "l": 1000.0,
    "dl": 100.0,
    "cl": 10.0,
    "ml": 1.0,
    "stk": 1.0,
    "stk ut": 1.0,
}

# Mapping av allergennivå fra int til string
def map_allergen_level(level: int) -> str:
    """Map allergen level integer to string.

    Database allergen levels (from actual data):
    0 = FREE_FROM (explicitly free from)
    1 = CROSS_CONTAMINATION (may contain traces / produced in same facility)
    2 = MAY_CONTAIN (may contain)
    3 = CONTAINS (contains)

    Note: Level 1 (cross-contamination) should typically NOT be displayed,
    only levels 2 and 3 are relevant for allergen warnings.
    """
    if level == 0:
        return "FREE_FROM"
    elif level == 1:
        return "CROSS_CONTAMINATION"  # Produced in same facility
    elif level == 2:
        return "MAY_CONTAIN"
    elif level == 3:
        return "CONTAINS"
    return "UNKNOWN"

def combine_allergen_levels(levels: list[str]) -> str:
    """Combine multiple allergen levels to the most restrictive.

    Priority (most to least restrictive):
    1. CONTAINS (actual ingredient)
    2. MAY_CONTAIN (may contain)
    3. CROSS_CONTAMINATION (traces from same facility) - usually not displayed
    4. FREE_FROM (explicitly free from)
    """
    if "CONTAINS" in levels:
        return "CONTAINS"
    elif "MAY_CONTAIN" in levels:
        return "MAY_CONTAIN"
    elif "CROSS_CONTAMINATION" in levels:
        return "CROSS_CONTAMINATION"
    elif "FREE_FROM" in levels:
        return "FREE_FROM"
    return "UNKNOWN"

@router.get("/{kalkylekode}/naering", response_model=NutritionResponse)
async def calculate_nutrition(
    kalkylekode: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Beregn næringsverdier for en kalkyle/oppskrift."""

    # Hent kalkyle info
    kalkyle_result = await db.execute(
        text("SELECT kalkylenavn, antallporsjoner FROM tbl_rpkalkyle WHERE kalkylekode = :kode"),
        {"kode": kalkylekode}
    )
    kalkyle = kalkyle_result.fetchone()

    if not kalkyle:
        raise HTTPException(status_code=404, detail="Kalkyle ikke funnet")

    # Hent ingredienser
    ingredienser_result = await db.execute(
        text("""
            SELECT produktid, porsjonsmengde, enh
            FROM tbl_rpkalkyledetaljer
            WHERE kalkylekode = :kode
        """),
        {"kode": kalkylekode}
    )
    ingredienser = ingredienser_result.fetchall()

    total_nutrition = {
        "energy_kj": 0.0,
        "energy_kcal": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "saturated_fat": 0.0,
        "carbs": 0.0,
        "sugars": 0.0,
        "fiber": 0.0,
        "salt": 0.0,
        "polyunsaturated_fat": 0.0,
        "monounsaturated_fat": 0.0,
        "sugar_alcohols": 0.0,
    }

    ingredients_nutrition = []
    total_weight_grams = 0.0

    for ing in ingredienser:
        # Hent produkt
        product_result = await db.execute(
            select(Produkter).where(Produkter.produktid == ing.produktid)
        )
        product = product_result.scalar_one_or_none()

        nutrition = None

        # Konverter mengde til gram for total vekt
        unit_lower = ing.enh.lower().strip()
        amount_in_grams = ing.porsjonsmengde * UNIT_TO_GRAMS.get(unit_lower, 1.0)
        total_weight_grams += amount_in_grams

        if product and product.ean_kode:
            # Rens EAN-kode
            clean_ean = product.ean_kode.lstrip('-')

            # Finn Matinfo-produkt
            matinfo_result = await db.execute(
                select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
            )
            matinfo_product = matinfo_result.scalar_one_or_none()

            if matinfo_product:
                # Hent næringsverdier
                nutrients_result = await db.execute(
                    select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                )
                nutrients = nutrients_result.scalars().all()

                if nutrients:
                    # Beregn næring (amount_in_grams allerede beregnet ovenfor)
                    nutrition = {}
                    for nutrient in nutrients:
                        nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                        if nutrient_key and nutrient.measurement:
                            value = float(nutrient.measurement) * (amount_in_grams / 100.0)
                            nutrition[nutrient_key] = round(value, 2)

                    # Legg til i total
                    if nutrition:
                        for key in total_nutrition:
                            if key in nutrition:
                                total_nutrition[key] += nutrition[key]

        ingredients_nutrition.append({
            "product_id": ing.produktid,
            "amount": ing.porsjonsmengde,
            "unit": ing.enh,
            "nutrition": nutrition
        })

    # VIKTIG: Ingrediensmengder er per porsjon, så summen er per-porsjon-næring
    portions = kalkyle.antallporsjoner or 1

    # Det vi har summert er faktisk næring per porsjon (siden ingredienser er per porsjon)
    nutrition_per_portion = {
        key: round(value, 2)
        for key, value in total_nutrition.items()
    }

    # Total næring er per porsjon × antall porsjoner
    total_nutrition_all_portions = {
        key: round(value * portions, 2)
        for key, value in total_nutrition.items()
    }

    # Beregn per 100g basert på per-porsjon verdier
    nutrition_per_100g = {
        key: round((value / total_weight_grams) * 100, 2) if total_weight_grams > 0 else 0.0
        for key, value in total_nutrition.items()
    }

    # Datakvalitet
    total_ingredients = len(ingredients_nutrition)
    with_data = sum(1 for ing in ingredients_nutrition if ing.get("nutrition"))
    coverage = (with_data / total_ingredients) * 100 if total_ingredients > 0 else 0

    if coverage >= 90:
        quality = "utmerket"
    elif coverage >= 70:
        quality = "god"
    elif coverage >= 50:
        quality = "middels"
    else:
        quality = "lav"

    return {
        "kalkylekode": kalkylekode,
        "kalkylenavn": kalkyle.kalkylenavn,
        "portions": portions,
        "total_weight_grams": round(total_weight_grams, 2),
        "total_nutrition": total_nutrition_all_portions,
        "nutrition_per_100g": nutrition_per_100g,
        "nutrition_per_portion": nutrition_per_portion,
        "ingredients_nutrition": ingredients_nutrition,
        "data_quality": {
            "total_ingredients": total_ingredients,
            "with_nutrition_data": with_data,
            "coverage_percentage": round(coverage, 1),
            "quality": quality
        }
    }

@router.post("/kombinere", response_model=CombinedNutritionResponse)
async def combine_recipes(
    request: CombineRecipesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Kombiner flere oppskrifter og produkter til en rett og beregn næring per 100g.

    Eksempel:
    {
        "name": "Kjøttkaker med brun saus og grønnsaker",
        "recipes": [
            {"kalkylekode": 5, "amount_grams": 450},
            {"kalkylekode": 18, "amount_grams": 80}
        ],
        "products": [
            {"produktid": 123, "amount_grams": 100}
        ]
    }
    """

    combined_nutrition = {
        "energy_kj": 0.0,
        "energy_kcal": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "saturated_fat": 0.0,
        "carbs": 0.0,
        "sugars": 0.0,
        "fiber": 0.0,
        "salt": 0.0,
        "polyunsaturated_fat": 0.0,
        "monounsaturated_fat": 0.0,
        "sugar_alcohols": 0.0,
    }

    total_weight_grams = 0.0
    recipe_summaries = []
    product_summaries = []
    total_components = len(request.recipes) + len(request.products)
    components_with_data = 0

    # Dictionary to track allergens: {allergen_code: {levels: [list of levels], name: str}}
    allergens_dict = {}

    for recipe_component in request.recipes:
        # Hent oppskrift info
        kalkyle_result = await db.execute(
            text("SELECT kalkylenavn, antallporsjoner FROM tbl_rpkalkyle WHERE kalkylekode = :kode"),
            {"kode": recipe_component.kalkylekode}
        )
        kalkyle = kalkyle_result.fetchone()

        if not kalkyle:
            raise HTTPException(
                status_code=404,
                detail=f"Oppskrift {recipe_component.kalkylekode} ikke funnet"
            )

        # Hent ingredienser for oppskriften
        ingredienser_result = await db.execute(
            text("""
                SELECT produktid, porsjonsmengde, enh
                FROM tbl_rpkalkyledetaljer
                WHERE kalkylekode = :kode
            """),
            {"kode": recipe_component.kalkylekode}
        )
        ingredienser = ingredienser_result.fetchall()

        # Beregn næring for denne oppskriften (per porsjon)
        recipe_nutrition = {
            "energy_kj": 0.0,
            "energy_kcal": 0.0,
            "protein": 0.0,
            "fat": 0.0,
            "saturated_fat": 0.0,
            "carbs": 0.0,
            "sugars": 0.0,
            "fiber": 0.0,
            "salt": 0.0,
            "polyunsaturated_fat": 0.0,
            "monounsaturated_fat": 0.0,
            "sugar_alcohols": 0.0,
        }

        recipe_weight_per_portion = 0.0
        has_nutrition_data = False

        for ing in ingredienser:
            # Hent produkt
            product_result = await db.execute(
                select(Produkter).where(Produkter.produktid == ing.produktid)
            )
            product = product_result.scalar_one_or_none()

            # Konverter mengde til gram
            unit_lower = ing.enh.lower().strip()
            amount_in_grams = ing.porsjonsmengde * UNIT_TO_GRAMS.get(unit_lower, 1.0)
            recipe_weight_per_portion += amount_in_grams

            if product and product.ean_kode:
                clean_ean = product.ean_kode.lstrip('-')

                # Finn Matinfo-produkt
                matinfo_result = await db.execute(
                    select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
                )
                matinfo_product = matinfo_result.scalar_one_or_none()

                if matinfo_product:
                    # Hent næringsverdier
                    nutrients_result = await db.execute(
                        select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                    )
                    nutrients = nutrients_result.scalars().all()

                    if nutrients:
                        has_nutrition_data = True
                        for nutrient in nutrients:
                            nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                            if nutrient_key and nutrient.measurement:
                                value = float(nutrient.measurement) * (amount_in_grams / 100.0)
                                recipe_nutrition[nutrient_key] += value

                    # Hent allergener
                    allergens_result = await db.execute(
                        select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                    )
                    allergens = allergens_result.scalars().all()

                    for allergen in allergens:
                        level = map_allergen_level(allergen.level)
                        if allergen.code not in allergens_dict:
                            allergens_dict[allergen.code] = {
                                "levels": [],
                                "name": allergen.name or allergen.code
                            }
                        allergens_dict[allergen.code]["levels"].append(level)

        # Skalér næringen basert på ønsket mengde
        # recipe_weight_per_portion er vekten for 1 porsjon
        # request.amount_grams er hvor mye av denne oppskriften vi vil ha
        scale_factor = recipe_component.amount_grams / recipe_weight_per_portion if recipe_weight_per_portion > 0 else 0

        recipe_contribution = {}
        for key, value in recipe_nutrition.items():
            scaled_value = value * scale_factor
            recipe_contribution[key] = round(scaled_value, 2)
            combined_nutrition[key] += scaled_value

        total_weight_grams += recipe_component.amount_grams

        if has_nutrition_data:
            components_with_data += 1

        recipe_summaries.append({
            "kalkylekode": recipe_component.kalkylekode,
            "kalkylenavn": kalkyle.kalkylenavn,
            "amount_grams": recipe_component.amount_grams,
            "nutrition_contribution": recipe_contribution
        })

    # Process products
    for product_component in request.products:
        # Hent produkt info
        product_result = await db.execute(
            select(Produkter).where(Produkter.produktid == product_component.produktid)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Produkt {product_component.produktid} ikke funnet"
            )

        product_nutrition = {
            "energy_kj": 0.0,
            "energy_kcal": 0.0,
            "protein": 0.0,
            "fat": 0.0,
            "saturated_fat": 0.0,
            "carbs": 0.0,
            "sugars": 0.0,
            "fiber": 0.0,
            "salt": 0.0,
            "polyunsaturated_fat": 0.0,
            "monounsaturated_fat": 0.0,
            "sugar_alcohols": 0.0,
        }

        has_nutrition_data = False

        # Hent næringsverdier fra Matinfo hvis EAN-kode finnes
        if product.ean_kode:
            clean_ean = product.ean_kode.lstrip('-')

            # Finn Matinfo-produkt
            matinfo_result = await db.execute(
                select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
            )
            matinfo_product = matinfo_result.scalar_one_or_none()

            if matinfo_product:
                # Hent næringsverdier
                nutrients_result = await db.execute(
                    select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                )
                nutrients = nutrients_result.scalars().all()

                if nutrients:
                    has_nutrition_data = True
                    # Matinfo gir verdier per 100g, så vi skalerer til ønsket mengde
                    for nutrient in nutrients:
                        nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                        if nutrient_key and nutrient.measurement:
                            value = float(nutrient.measurement) * (product_component.amount_grams / 100.0)
                            product_nutrition[nutrient_key] += value
                            combined_nutrition[nutrient_key] += value

                # Hent allergener
                allergens_result = await db.execute(
                    select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                )
                allergens = allergens_result.scalars().all()

                for allergen in allergens:
                    level = map_allergen_level(allergen.level)
                    if allergen.code not in allergens_dict:
                        allergens_dict[allergen.code] = {
                            "levels": [],
                            "name": allergen.name or allergen.code
                        }
                    allergens_dict[allergen.code]["levels"].append(level)

        total_weight_grams += product_component.amount_grams

        if has_nutrition_data:
            components_with_data += 1

        product_summaries.append({
            "produktid": product_component.produktid,
            "produktnavn": product.produktnavn or f"Produkt {product.produktid}",
            "amount_grams": product_component.amount_grams,
            "nutrition_contribution": {k: round(v, 2) for k, v in product_nutrition.items()}
        })

    # Beregn per 100g
    nutrition_per_100g = {}
    for key, value in combined_nutrition.items():
        if total_weight_grams > 0:
            nutrition_per_100g[key] = round((value / total_weight_grams) * 100, 2)
        else:
            nutrition_per_100g[key] = 0.0

    # Kombiner allergener
    combined_allergens = []
    for allergen_code, allergen_data in allergens_dict.items():
        combined_level = combine_allergen_levels(allergen_data["levels"])
        # Bare vis allergener som inneholder eller kan inneholde
        # Skip CROSS_CONTAMINATION (level 1) - only show actual allergens
        if combined_level in ["CONTAINS", "MAY_CONTAIN"]:
            combined_allergens.append({
                "code": allergen_code,
                "level": combined_level,
                "name": allergen_data["name"]
            })

    # Sorter allergener alfabetisk etter navn
    combined_allergens.sort(key=lambda x: x["name"])

    # Datakvalitet
    coverage = (components_with_data / total_components) * 100 if total_components > 0 else 0

    if coverage >= 90:
        quality = "utmerket"
    elif coverage >= 70:
        quality = "god"
    elif coverage >= 50:
        quality = "middels"
    elif coverage > 0:
        quality = "lav"
    else:
        quality = "ingen_data"

    return {
        "name": request.name,
        "recipes": recipe_summaries,
        "products": product_summaries,
        "total_weight_grams": round(total_weight_grams, 2),
        "combined_nutrition_per_100g": nutrition_per_100g,
        "total_nutrition": {key: round(value, 2) for key, value in combined_nutrition.items()},
        "allergens": combined_allergens,
        "data_quality": {
            "total_ingredients": total_components,
            "with_nutrition_data": components_with_data,
            "coverage_percentage": round(coverage, 1),
            "quality": quality
        }
    }


@router.get("/{kalkylekode}/label")
async def generate_recipe_label(
    kalkylekode: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generer PDF etikett for en oppskrift.

    Etiketten inneholder:
    - Oppskriftsnavn
    - Produksjonsdato
    - Ingrediensliste (med allergener i bold)
    - Næringsverdier per 100g
    - Tilberedningsinformasjon
    """
    # Hent oppskrift
    result = await db.execute(
        select(Kalkyle).where(Kalkyle.kalkylekode == kalkylekode)
    )
    kalkyle = result.scalar_one_or_none()

    if not kalkyle:
        raise HTTPException(status_code=404, detail="Oppskrift ikke funnet")

    # Hent detaljer (ingredienser)
    detaljer_result = await db.execute(
        select(Kalkyledetaljer)
        .options(selectinload(Kalkyledetaljer.produkt))
        .where(Kalkyledetaljer.kalkylekode == kalkylekode)
    )
    detaljer = detaljer_result.scalars().all()

    # Bygg ingrediensliste
    ingredients_list = []
    allergens_set = set()
    total_weight = 0.0
    combined_nutrition = {
        "energy_kj": 0.0,
        "energy_kcal": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "saturated_fat": 0.0,
        "carbs": 0.0,
        "sugars": 0.0,
        "fiber": 0.0,
        "salt": 0.0,
        "polyunsaturated_fat": 0.0,
        "monounsaturated_fat": 0.0,
        "sugar_alcohols": 0.0
    }

    for detalj in detaljer:
        # Bruk visningsnavn fra produkter for bedre lesbarhet på etiketter
        # Lowercase for konsistent formatting og bedre allergen-matching
        if detalj.produkt and detalj.produkt.visningsnavn:
            name = detalj.produkt.visningsnavn.lower()
        elif detalj.produktnavn:
            name = detalj.produktnavn.lower()
        elif detalj.produkt:
            name = detalj.produkt.produktnavn.lower()
        else:
            name = "ukjent"

        amount = detalj.porsjonsmengde or 0
        unit = detalj.enh or "g"

        ingredients_list.append({
            "name": name,
            "amount": amount,
            "unit": unit
        })

        # Konverter mengde til gram for vekt og næringsberegning
        unit_lower = unit.lower().strip()
        amount_grams = amount * UNIT_TO_GRAMS.get(unit_lower, 1.0)
        total_weight += amount_grams

        # Hent næring og allergener fra Matinfo hvis produkt har EAN-kode
        if detalj.produkt and detalj.produkt.ean_kode:
            clean_ean = detalj.produkt.ean_kode.lstrip('-')

            # Hent Matinfo produkt
            matinfo_result = await db.execute(
                select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
            )
            matinfo_product = matinfo_result.scalar_one_or_none()

            if matinfo_product:
                # Hent næringsverdier
                nutrients_result = await db.execute(
                    select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                )
                nutrients = nutrients_result.scalars().all()

                # Beregn næring (Matinfo gir verdier per 100g)
                for nutrient in nutrients:
                    nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                    if nutrient_key and nutrient.measurement:
                        value = float(nutrient.measurement) * (amount_grams / 100.0)
                        combined_nutrition[nutrient_key] += value

                # Hent allergener
                allergens_result = await db.execute(
                    select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                )
                allergens = allergens_result.scalars().all()

                for allergen in allergens:
                    # Only include level 2 (MAY_CONTAIN) and level 3 (CONTAINS)
                    # Skip level 1 (CROSS_CONTAMINATION) as it's too broad
                    if allergen.level in [2, 3]:
                        allergens_set.add(allergen.name)

    # Beregn per 100g
    nutrition_per_100g = {}
    if total_weight > 0:
        factor = 100.0 / total_weight
        for key, value in combined_nutrition.items():
            nutrition_per_100g[key] = value * factor
    else:
        nutrition_per_100g = combined_nutrition

    # Generer PDF
    label_generator = get_label_generator()
    pdf_buffer = label_generator.generate_recipe_label(
        recipe_name=kalkyle.kalkylenavn,
        ingredients=ingredients_list,
        allergens=list(allergens_set),
        nutrition_per_100g=nutrition_per_100g,
        preparation_info=kalkyle.informasjon or "",
        weight_grams=total_weight
    )

    # Les PDF-data fra buffer
    pdf_data = pdf_buffer.getvalue()

    # Sanitize filename for Content-Disposition header
    safe_filename = kalkyle.kalkylenavn.replace(' ', '_').replace('"', '').replace("'", '')

    # Returner PDF som Response (ikke StreamingResponse for å unngå duplikate headers)
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.pdf"'
        }
    )


@router.post("/kombinere/label")
async def generate_combined_label(
    request: CombineRecipesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generer PDF etikett for en kombinert rett (flere oppskrifter og/eller produkter).

    Bruker samme logikk som /kombinere endepunktet for å beregne næring og allergener,
    og genererer deretter en PDF etikett.
    """
    # Bruk samme logikk som kombinere endpoint
    # Dette sikrer konsistens i beregninger

    ingredients_list = []
    allergens_set = set()
    total_weight = 0.0
    combined_nutrition = {
        "energy_kj": 0.0,
        "energy_kcal": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "saturated_fat": 0.0,
        "carbs": 0.0,
        "sugars": 0.0,
        "fiber": 0.0,
        "salt": 0.0,
        "polyunsaturated_fat": 0.0,
        "monounsaturated_fat": 0.0,
        "sugar_alcohols": 0.0
    }

    # Prosesser oppskrifter
    for recipe_component in request.recipes:
        # Hent oppskrift
        kalkyle_result = await db.execute(
            select(Kalkyle).where(Kalkyle.kalkylekode == recipe_component.kalkylekode)
        )
        kalkyle = kalkyle_result.scalar_one_or_none()

        if not kalkyle:
            raise HTTPException(status_code=404, detail=f"Oppskrift {recipe_component.kalkylekode} ikke funnet")

        # Hent detaljer
        detaljer_result = await db.execute(
            select(Kalkyledetaljer)
            .options(selectinload(Kalkyledetaljer.produkt))
            .where(Kalkyledetaljer.kalkylekode == recipe_component.kalkylekode)
        )
        detaljer = detaljer_result.scalars().all()

        # Beregn total oppskriftsvekt i gram (konverter enheter først)
        recipe_weight_grams = 0.0
        for d in detaljer:
            unit_lower = (d.enh or "g").lower().strip()
            amount_grams = (d.porsjonsmengde or 0) * UNIT_TO_GRAMS.get(unit_lower, 1.0)
            recipe_weight_grams += amount_grams

        scale_factor = recipe_component.amount_grams / recipe_weight_grams if recipe_weight_grams > 0 else 0

        for detalj in detaljer:
            # Bruk visningsnavn fra produkter for bedre lesbarhet på etiketter
            if detalj.produkt and detalj.produkt.visningsnavn:
                name = detalj.produkt.visningsnavn
            elif detalj.produktnavn:
                name = detalj.produktnavn
            elif detalj.produkt:
                name = detalj.produkt.produktnavn
            else:
                name = "Ukjent"

            amount = (detalj.porsjonsmengde or 0) * scale_factor
            unit = detalj.enh or "g"

            ingredients_list.append({
                "name": name,
                "amount": amount,
                "unit": unit
            })

            # Konverter mengde til gram for vekt og næringsberegning
            unit_lower = unit.lower().strip()
            amount_grams = amount * UNIT_TO_GRAMS.get(unit_lower, 1.0)
            total_weight += amount_grams

            # Hent næring og allergener fra Matinfo
            if detalj.produkt and detalj.produkt.ean_kode:
                clean_ean = detalj.produkt.ean_kode.lstrip('-')

                matinfo_result = await db.execute(
                    select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
                )
                matinfo_product = matinfo_result.scalar_one_or_none()

                if matinfo_product:
                    # Hent næringsverdier
                    nutrients_result = await db.execute(
                        select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                    )
                    nutrients = nutrients_result.scalars().all()

                    # Beregn næring (Matinfo gir verdier per 100g)
                    for nutrient in nutrients:
                        nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                        if nutrient_key and nutrient.measurement:
                            value = float(nutrient.measurement) * (amount_grams / 100.0)
                            combined_nutrition[nutrient_key] += value

                    # Hent allergener
                    allergens_result = await db.execute(
                        select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                    )
                    allergens = allergens_result.scalars().all()

                    for allergen in allergens:
                        if allergen.level in [1, 2]:  # 1 = CONTAINS, 2 = MAY_CONTAIN
                            allergens_set.add(allergen.name)

    # Prosesser produkter
    for product_component in request.products:
        # Hent produkt info
        product_result = await db.execute(
            select(Produkter).where(Produkter.produktid == product_component.produktid)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail=f"Produkt {product_component.produktid} ikke funnet")

        # Bruk visningsnavn for bedre lesbarhet på etiketter
        product_name = product.visningsnavn or product.produktnavn

        ingredients_list.append({
            "name": product_name,
            "amount": product_component.amount_grams,
            "unit": "g"
        })

        total_weight += product_component.amount_grams

        # Hent næring og allergener fra Matinfo hvis EAN-kode finnes
        if product.ean_kode:
            clean_ean = product.ean_kode.lstrip('-')

            matinfo_result = await db.execute(
                select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
            )
            matinfo_product = matinfo_result.scalar_one_or_none()

            if matinfo_product:
                # Hent næringsverdier
                nutrients_result = await db.execute(
                    select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                )
                nutrients = nutrients_result.scalars().all()

                # Beregn næring (Matinfo gir verdier per 100g)
                for nutrient in nutrients:
                    nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                    if nutrient_key and nutrient.measurement:
                        value = float(nutrient.measurement) * (product_component.amount_grams / 100.0)
                        combined_nutrition[nutrient_key] += value

                # Hent allergener
                allergens_result = await db.execute(
                    select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                )
                allergens = allergens_result.scalars().all()

                for allergen in allergens:
                    # Only include level 2 (MAY_CONTAIN) and level 3 (CONTAINS)
                    # Skip level 1 (CROSS_CONTAMINATION) as it's too broad
                    if allergen.level in [2, 3]:
                        allergens_set.add(allergen.name)

    # Beregn per 100g
    nutrition_per_100g = {}
    if total_weight > 0:
        factor = 100.0 / total_weight
        for key, value in combined_nutrition.items():
            nutrition_per_100g[key] = value * factor
    else:
        nutrition_per_100g = combined_nutrition

    # Generer PDF
    label_generator = get_label_generator()
    pdf_buffer = label_generator.generate_recipe_label(
        recipe_name=request.name,
        ingredients=ingredients_list,
        allergens=list(allergens_set),
        nutrition_per_100g=nutrition_per_100g,
        preparation_info=request.preparation_instructions or "",
        weight_grams=total_weight
    )

    # Les PDF-data fra buffer
    pdf_data = pdf_buffer.getvalue()

    # Sanitize filename for Content-Disposition header
    safe_filename = request.name.replace(' ', '_').replace('"', '').replace("'", '')

    # Returner PDF som Response (ikke StreamingResponse for å unngå duplikate headers)
    return Response(
        content=pdf_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.pdf"'
        }
    )


@router.post("/kombinere/label-zpl")
async def generate_combined_label_zpl(
    request: CombineRecipesRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generer ZPL etikett for en kombinert rett (for Zebra printer).

    Bruker samme logikk som /kombinere endepunktet for å beregne næring og allergener,
    og genererer deretter en ZPL etikett for Zebra-printer.

    Technical debt: Denne koden dupliserer beregningslogikken fra PDF endpoint.
    Bør refaktoreres til felles helper-funksjon i fremtidig sprint.
    """
    # SAMME BEREGNINGSLOGIKK SOM PDF ENDPOINT (lines 1005-1171)
    # Technical debt: Bør refaktoreres til felles helper

    ingredients_list = []
    allergens_set = set()
    total_weight = 0.0
    combined_nutrition = {
        "energy_kj": 0.0,
        "energy_kcal": 0.0,
        "protein": 0.0,
        "fat": 0.0,
        "saturated_fat": 0.0,
        "carbs": 0.0,
        "sugars": 0.0,
        "fiber": 0.0,
        "salt": 0.0,
        "polyunsaturated_fat": 0.0,
        "monounsaturated_fat": 0.0,
        "sugar_alcohols": 0.0
    }

    # Prosesser oppskrifter
    for recipe_component in request.recipes:
        # Hent oppskrift
        kalkyle_result = await db.execute(
            select(Kalkyle).where(Kalkyle.kalkylekode == recipe_component.kalkylekode)
        )
        kalkyle = kalkyle_result.scalar_one_or_none()

        if not kalkyle:
            raise HTTPException(status_code=404, detail=f"Oppskrift {recipe_component.kalkylekode} ikke funnet")

        # Hent detaljer
        detaljer_result = await db.execute(
            select(Kalkyledetaljer)
            .options(selectinload(Kalkyledetaljer.produkt))
            .where(Kalkyledetaljer.kalkylekode == recipe_component.kalkylekode)
        )
        detaljer = detaljer_result.scalars().all()

        # Beregn total oppskriftsvekt i gram (konverter enheter først)
        recipe_weight_grams = 0.0
        for d in detaljer:
            unit_lower = (d.enh or "g").lower().strip()
            amount_grams = (d.porsjonsmengde or 0) * UNIT_TO_GRAMS.get(unit_lower, 1.0)
            recipe_weight_grams += amount_grams

        scale_factor = recipe_component.amount_grams / recipe_weight_grams if recipe_weight_grams > 0 else 0

        for detalj in detaljer:
            # Bruk visningsnavn fra produkter for bedre lesbarhet på etiketter
            if detalj.produkt and detalj.produkt.visningsnavn:
                name = detalj.produkt.visningsnavn
            elif detalj.produktnavn:
                name = detalj.produktnavn
            elif detalj.produkt:
                name = detalj.produkt.produktnavn
            else:
                name = "Ukjent"

            amount = (detalj.porsjonsmengde or 0) * scale_factor
            unit = detalj.enh or "g"

            # Konverter mengde til gram for vekt og næringsberegning
            unit_lower = unit.lower().strip()
            amount_grams = amount * UNIT_TO_GRAMS.get(unit_lower, 1.0)
            total_weight += amount_grams

            # Format for ZPL (kun navn, ikke mengde/enhet som i ingredients_list)
            # ZPL vil vise bare ingrediens-navn adskilt med komma
            # Hent næring og allergener fra Matinfo
            if detalj.produkt and detalj.produkt.ean_kode:
                clean_ean = detalj.produkt.ean_kode.lstrip('-')

                matinfo_result = await db.execute(
                    select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
                )
                matinfo_product = matinfo_result.scalar_one_or_none()

                if matinfo_product:
                    # Hent næringsverdier
                    nutrients_result = await db.execute(
                        select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                    )
                    nutrients = nutrients_result.scalars().all()

                    # Beregn næring (Matinfo gir verdier per 100g)
                    for nutrient in nutrients:
                        nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                        if nutrient_key and nutrient.measurement:
                            value = float(nutrient.measurement) * (amount_grams / 100.0)
                            combined_nutrition[nutrient_key] += value

                    # Hent allergener
                    allergens_result = await db.execute(
                        select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                    )
                    allergens = allergens_result.scalars().all()

                    for allergen in allergens:
                        if allergen.level in [1, 2]:  # 1 = CONTAINS, 2 = MAY_CONTAIN
                            allergens_set.add(allergen.name)

            # Legg til ingrediens-navn (for ZPL: bare navn, ikke mengde)
            if name not in [ing for ing in ingredients_list]:
                ingredients_list.append(name)

    # Prosesser produkter
    for product_component in request.products:
        # Hent produkt info
        product_result = await db.execute(
            select(Produkter).where(Produkter.produktid == product_component.produktid)
        )
        product = product_result.scalar_one_or_none()

        if not product:
            raise HTTPException(status_code=404, detail=f"Produkt {product_component.produktid} ikke funnet")

        # Bruk visningsnavn for bedre lesbarhet på etiketter
        product_name = product.visningsnavn or product.produktnavn

        total_weight += product_component.amount_grams

        # Hent næring og allergener fra Matinfo hvis EAN-kode finnes
        if product.ean_kode:
            clean_ean = product.ean_kode.lstrip('-')

            matinfo_result = await db.execute(
                select(MatinfoProduct).where(MatinfoProduct.gtin == clean_ean)
            )
            matinfo_product = matinfo_result.scalar_one_or_none()

            if matinfo_product:
                # Hent næringsverdier
                nutrients_result = await db.execute(
                    select(MatinfoNutrient).where(MatinfoNutrient.productid == matinfo_product.id)
                )
                nutrients = nutrients_result.scalars().all()

                # Beregn næring (Matinfo gir verdier per 100g)
                for nutrient in nutrients:
                    nutrient_key = NUTRIENT_CODES.get(nutrient.code)
                    if nutrient_key and nutrient.measurement:
                        value = float(nutrient.measurement) * (product_component.amount_grams / 100.0)
                        combined_nutrition[nutrient_key] += value

                # Hent allergener
                allergens_result = await db.execute(
                    select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                )
                allergens = allergens_result.scalars().all()

                for allergen in allergens:
                    # Only include level 2 (MAY_CONTAIN) and level 3 (CONTAINS)
                    # Skip level 1 (CROSS_CONTAMINATION) as it's too broad
                    if allergen.level in [2, 3]:
                        allergens_set.add(allergen.name)

        # Legg til produkt-navn
        if product_name not in ingredients_list:
            ingredients_list.append(product_name)

    # Beregn per 100g
    nutrition_per_100g = {}
    if total_weight > 0:
        factor = 100.0 / total_weight
        for key, value in combined_nutrition.items():
            nutrition_per_100g[key] = value * factor
    else:
        nutrition_per_100g = combined_nutrition

    # Map nutrition keys to match ZPL generator expectations
    zpl_nutrition = {
        "energi_kj": nutrition_per_100g.get("energy_kj", 0),
        "energi_kcal": nutrition_per_100g.get("energy_kcal", 0),
        "protein": nutrition_per_100g.get("protein", 0),
        "fett": nutrition_per_100g.get("fat", 0),
        "mettet_fett": nutrition_per_100g.get("saturated_fat", 0),
        "karbohydrat": nutrition_per_100g.get("carbs", 0),
        "sukker": nutrition_per_100g.get("sugars", 0),
        "kostfiber": nutrition_per_100g.get("fiber", 0),
        "salt": nutrition_per_100g.get("salt", 0),
    }

    # Generer ZPL
    allergens_list = list(allergens_set)

    # Debug logging
    print(f"DEBUG ZPL - Ingredients: {ingredients_list}")
    print(f"DEBUG ZPL - Allergens: {allergens_list}")

    # DEBUG: Print allergen levels from database
    for recipe_component in request.recipes:
        kalkyle_result = await db.execute(
            select(Kalkyle).where(Kalkyle.kalkylekode == recipe_component.kalkylekode)
        )
        kalkyle = kalkyle_result.scalar_one_or_none()
        if kalkyle:
            print(f"DEBUG - Recipe: {kalkyle.kalkylenavn}")
            for prod in kalkyle.products:
                if prod.ean_kode:
                    matinfo_result = await db.execute(
                        select(MatinfoProduct).where(MatinfoProduct.gtin == prod.ean_kode)
                    )
                    matinfo_product = matinfo_result.scalar_one_or_none()
                    if matinfo_product:
                        allergens_result = await db.execute(
                            select(MatinfoAllergen).where(MatinfoAllergen.productid == matinfo_product.id)
                        )
                        allergens_db = allergens_result.scalars().all()
                        for allergen in allergens_db:
                            print(f"  DEBUG - Allergen: {allergen.name}, Level: {allergen.level}, Mapped: {map_allergen_level(allergen.level)}")

    zpl_generator = get_zpl_label_generator()
    zpl_code = zpl_generator.generate_recipe_label(
        recipe_name=request.name,
        ingredients=ingredients_list,
        allergens=allergens_list,
        nutrition_per_100g=zpl_nutrition,
        preparation_info=request.preparation_instructions or "Oppbevares kjølig. Oppvarmes til 75°C.",
        weight_grams=total_weight
    )

    # Sanitize filename for Content-Disposition header
    safe_filename = request.name.replace(' ', '_').replace('"', '').replace("'", '')

    # Returner ZPL som plain text
    return Response(
        content=zpl_code,
        media_type="text/plain",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}.zpl"'
        }
    )


class GenerateNameComponent(BaseModel):
    """Component for name generation."""
    kalkylekode: Optional[int] = None
    produktid: Optional[int] = None
    amount_grams: float


class GenerateNameRequest(BaseModel):
    """Request for generating dish name."""
    recipes: List[GenerateNameComponent] = []
    products: List[GenerateNameComponent] = []


@router.post("/kombinere/generate-name")
async def generate_dish_name(
    request: GenerateNameRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate a dish name from recipe and product components using AI.
    Falls back to rule-based generation if AI is not configured.
    """
    # Hent oppskrift-navn
    recipe_data = []
    for recipe_comp in request.recipes:
        if recipe_comp.kalkylekode:
            result = await db.execute(
                select(Kalkyle).where(Kalkyle.kalkylekode == recipe_comp.kalkylekode)
            )
            recipe = result.scalar_one_or_none()
            if recipe:
                recipe_data.append({
                    "name": recipe.kalkylenavn,
                    "amount_grams": recipe_comp.amount_grams
                })

    # Hent produkt-navn
    product_data = []
    for product_comp in request.products:
        if product_comp.produktid:
            result = await db.execute(
                select(Produkter).where(Produkter.produktid == product_comp.produktid)
            )
            product = result.scalar_one_or_none()
            if product:
                product_name = product.produktnavn or product.visningsnavn or f"Produkt {product.produktid}"
                product_data.append({
                    "name": product_name,
                    "amount_grams": product_comp.amount_grams
                })

    # Generate name
    name_generator = get_dish_name_generator()
    generated_name = await name_generator.generate_name(recipe_data, product_data)

    return {"name": generated_name}