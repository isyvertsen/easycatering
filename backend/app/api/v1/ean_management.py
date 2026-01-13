"""EAN Management API endpoints.

Konsolidert endpoint for all GTIN/EAN håndtering.
"""
from typing import List, Dict, Any
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.produkter import Produkter as ProdukterModel
from app.models.matinfo_products import MatinfoProduct


router = APIRouter()


class ProductMissingEan(BaseModel):
    """Produkt som mangler EAN-kode."""
    produktid: int
    produktnavn: str
    ean_kode: str | None
    kalkylenavn: str | None
    kalkylekode: int | None

    class Config:
        from_attributes = True


class EanUpdateRequest(BaseModel):
    """Request for å oppdatere EAN-kode."""
    produktid: int
    ean_kode: str


class GtinUpdateItem(BaseModel):
    """Single GTIN update item."""
    produktid: int
    gtin: str


class BulkGtinUpdateRequest(BaseModel):
    """Request for bulk GTIN updates."""
    updates: List[GtinUpdateItem]


@router.get("/missing-ean", response_model=List[ProductMissingEan])
async def get_products_missing_ean(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    exclude_numbered: bool = False,
) -> List[ProductMissingEan]:
    """
    Hent alle produkter fra tbl_rpKalkyleDetaljer som mangler EAN-kode eller næringsdata.

    Denne listen viser produkter brukt i oppskrifter (kalkyler) som:
    - Ikke har registrert EAN-kode i tblProdukter
    - Har EAN-kode men finnes ikke i Matinfo
    - Har EAN-kode som finnes i Matinfo MEN mangler næringsdata

    Args:
        exclude_numbered: Hvis True, ekskluderer produkter i kategoriid 12
                         (produkter som starter med nummermønstre som "01-", "02-", "0x-" osv.)
    """
    # Build WHERE clause for category filter
    category_filter = "AND p.kategoriid != 12" if exclude_numbered else ""

    # Use subquery to find products that have at least one match with nutrition data
    # Then exclude those from the results
    sql = text(f"""
        WITH products_with_nutrition AS (
            SELECT DISTINCT p.produktid
            FROM tblprodukter p
            JOIN matinfo_products m ON LPAD(REGEXP_REPLACE(LTRIM(p.ean_kode, '-'), '[^0-9]', '', 'g'), 14, '0') = LPAD(REGEXP_REPLACE(m.gtin, '[^0-9]', '', 'g'), 14, '0')
            WHERE EXISTS (
                SELECT 1 FROM matinfo_nutrients n WHERE n.productid = m.id
            )
        )
        SELECT DISTINCT
            kd.produktid,
            kd.produktnavn,
            p.ean_kode,
            k.kalkylenavn,
            k.kalkylekode
        FROM tbl_rpkalkyledetaljer kd
        LEFT JOIN tblprodukter p ON kd.produktid = p.produktid
        LEFT JOIN tbl_rpkalkyle k ON kd.kalkylekode = k.kalkylekode
        WHERE (
            p.ean_kode IS NULL
            OR p.ean_kode = ''
            OR p.produktid NOT IN (SELECT produktid FROM products_with_nutrition)
        )
        {category_filter}
        ORDER BY kd.produktnavn
    """)

    result = await db.execute(sql)
    rows = result.fetchall()

    return [
        ProductMissingEan(
            produktid=row.produktid,
            produktnavn=row.produktnavn,
            ean_kode=row.ean_kode,
            kalkylenavn=row.kalkylenavn,
            kalkylekode=row.kalkylekode
        )
        for row in rows
    ]


@router.patch("/update-ean")
async def update_product_ean(
    ean_update: EanUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Oppdater EAN-kode for et produkt.
    """
    # Hent produkt
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == ean_update.produktid)
    )
    produkt = result.scalar_one_or_none()

    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")

    # Rens EAN-kode
    clean_ean = ean_update.ean_kode.strip().replace("-", "").replace(" ", "")

    # Valider lengde
    if clean_ean and len(clean_ean) not in [8, 12, 13, 14]:
        raise HTTPException(
            status_code=400,
            detail=f"Ugyldig EAN-lengde: {len(clean_ean)}. Må være 8, 12, 13 eller 14 siffer."
        )

    # Oppdater
    old_ean = produkt.ean_kode
    produkt.ean_kode = clean_ean if clean_ean else None

    await db.commit()
    await db.refresh(produkt)

    return {
        "produktid": produkt.produktid,
        "produktnavn": produkt.produktnavn,
        "old_ean": old_ean,
        "new_ean": clean_ean,
        "message": "EAN-kode oppdatert"
    }


@router.post("/fix-negative-ean")
async def fix_negative_ean_codes(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Fjern '-' fra alle EAN-koder som starter med '-'.

    Dette gjør EAN-kodene klare for å søke etter korrekte verdier i Matinfo/VetDuAt.
    """
    # Oppdater alle EAN-koder som starter med '-'
    sql = text("""
        UPDATE tblprodukter
        SET ean_kode = LTRIM(ean_kode, '-')
        WHERE ean_kode LIKE '-%'
        RETURNING produktid, produktnavn, ean_kode
    """)

    result = await db.execute(sql)
    updated_products = result.fetchall()
    await db.commit()

    return {
        "updated_count": len(updated_products),
        "message": f"Fjernet '-' fra {len(updated_products)} EAN-koder",
        "sample_products": [
            {
                "produktid": row.produktid,
                "produktnavn": row.produktnavn,
                "ean_kode": row.ean_kode
            }
            for row in updated_products[:10]  # Vis første 10 som eksempel
        ]
    }


@router.patch("/gtin/{produkt_id}")
async def update_produkt_gtin(
    produkt_id: int,
    gtin: str = Body(..., embed=True, description="Ny GTIN/EAN-kode"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Oppdater GTIN/EAN-kode for et produkt.

    Renser automatisk GTIN (fjerner bindestreker, validerer lengde).
    Sjekker også om GTIN finnes i Matinfo.
    """
    # Hent produkt
    result = await db.execute(
        select(ProdukterModel).where(ProdukterModel.produktid == produkt_id)
    )
    produkt = result.scalar_one_or_none()

    if not produkt:
        raise HTTPException(status_code=404, detail="Produkt ikke funnet")

    # Rens GTIN
    clean_gtin = gtin.strip().replace("-", "").replace(" ", "")

    # Valider GTIN-lengde (8, 12, 13, eller 14 siffer)
    if clean_gtin and len(clean_gtin) not in [8, 12, 13, 14]:
        raise HTTPException(
            status_code=400,
            detail=f"Ugyldig GTIN-lengde: {len(clean_gtin)}. Må være 8, 12, 13 eller 14 siffer."
        )

    # Sjekk om GTIN finnes i Matinfo
    matinfo_match = None
    if clean_gtin:
        matinfo_result = await db.execute(
            select(MatinfoProduct).where(MatinfoProduct.gtin == clean_gtin)
        )
        matinfo_match = matinfo_result.scalar_one_or_none()

    # Oppdater produkt
    old_gtin = produkt.ean_kode
    produkt.ean_kode = clean_gtin if clean_gtin else None

    await db.commit()
    await db.refresh(produkt)

    return {
        "produktid": produkt_id,
        "produktnavn": produkt.produktnavn,
        "old_gtin": old_gtin,
        "new_gtin": clean_gtin,
        "matinfo_match": {
            "found": matinfo_match is not None,
            "product_name": matinfo_match.name if matinfo_match else None,
            "brand": getattr(matinfo_match, 'brandname', None) if matinfo_match else None
        } if clean_gtin else None,
        "message": "GTIN oppdatert"
    }


@router.post("/bulk-gtin")
async def bulk_update_gtin(
    updates: BulkGtinUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Masse-oppdatering av GTIN for flere produkter.

    Returnerer statistikk over oppdateringer og eventuelle feil.
    """
    results = {
        "total": len(updates.updates),
        "success": 0,
        "failed": 0,
        "matinfo_matches": 0,
        "details": []
    }

    for update in updates.updates:
        try:
            # Hent produkt
            result = await db.execute(
                select(ProdukterModel).where(ProdukterModel.produktid == update.produktid)
            )
            produkt = result.scalar_one_or_none()

            if not produkt:
                results["failed"] += 1
                results["details"].append({
                    "produktid": update.produktid,
                    "status": "error",
                    "message": "Produkt ikke funnet"
                })
                continue

            # Rens GTIN
            clean_gtin = update.gtin.strip().replace("-", "").replace(" ", "")

            # Valider lengde
            if clean_gtin and len(clean_gtin) not in [8, 12, 13, 14]:
                results["failed"] += 1
                results["details"].append({
                    "produktid": update.produktid,
                    "status": "error",
                    "message": f"Ugyldig GTIN-lengde: {len(clean_gtin)}"
                })
                continue

            # Sjekk Matinfo
            matinfo_match = None
            if clean_gtin:
                matinfo_result = await db.execute(
                    select(MatinfoProduct).where(MatinfoProduct.gtin == clean_gtin)
                )
                matinfo_match = matinfo_result.scalar_one_or_none()
                if matinfo_match:
                    results["matinfo_matches"] += 1

            # Oppdater
            old_gtin = produkt.ean_kode
            produkt.ean_kode = clean_gtin if clean_gtin else None

            results["success"] += 1
            results["details"].append({
                "produktid": update.produktid,
                "produktnavn": produkt.produktnavn,
                "status": "success",
                "old_gtin": old_gtin,
                "new_gtin": clean_gtin,
                "matinfo_match": matinfo_match is not None
            })

        except Exception as e:
            results["failed"] += 1
            results["details"].append({
                "produktid": update.produktid,
                "status": "error",
                "message": str(e)
            })

    await db.commit()

    return results
