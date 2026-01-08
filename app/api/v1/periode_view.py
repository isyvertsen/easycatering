"""API endpoints for comprehensive period viewing."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.api.deps import get_current_user
from app.infrastructure.database.session import get_db
from app.domain.entities.user import User
from app.services.periode_view_service import periode_view_service
from app.schemas.periode_view import (
    PeriodeMedKomplettMeny,
    PeriodeViewListResponse,
    KopierPeriodeRequest,
    KopierPeriodeResponse,
    MenyMedProdukter,
    OpprettMenyIPeriodeRequest,
    BulkTilordneMenyerRequest,
    BulkFjernMenyerRequest,
)
from app.models.periode import Periode
from app.models.periode_meny import PeriodeMeny
from app.models.meny import Meny
from app.models.meny_produkt import MenyProdukt

router = APIRouter()


@router.get("/", response_model=PeriodeViewListResponse)
async def get_periode_oversikt(
    page: int = Query(1, ge=1, description="Sidenummer"),
    page_size: int = Query(20, ge=1, le=100, description="Elementer per side"),
    fra_dato: Optional[datetime] = Query(None, description="Filtrer fra dato"),
    til_dato: Optional[datetime] = Query(None, description="Filtrer til dato"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodeViewListResponse:
    """
    Hent alle perioder med komplett menystruktur.

    Returnerer perioder med:
    - Alle menyer gruppert etter menygruppe
    - Alle produkter i hver meny
    - Totaltall for menyer og produkter
    """
    items, total = await periode_view_service.get_perioder_med_komplett_meny(
        db, fra_dato, til_dato, page, page_size
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PeriodeViewListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{periode_id}", response_model=PeriodeMedKomplettMeny)
async def get_periode_detalj(
    periode_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PeriodeMedKomplettMeny:
    """
    Hent en spesifikk periode med komplett menystruktur.
    """
    result = await periode_view_service.get_periode_med_komplett_meny(db, periode_id)

    if not result:
        raise HTTPException(status_code=404, detail="Periode ikke funnet")

    return result


@router.get("/{periode_id}/tilgjengelige-menyer", response_model=List[MenyMedProdukter])
async def get_tilgjengelige_menyer(
    periode_id: int,
    menygruppe_id: Optional[int] = Query(None, description="Filtrer etter menygruppe"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MenyMedProdukter]:
    """
    Hent menyer som kan legges til i perioden.

    Returnerer menyer som IKKE allerede er tilordnet denne perioden.
    """
    return await periode_view_service.get_tilgjengelige_menyer_for_periode(
        db, periode_id, menygruppe_id
    )


@router.post("/kopier", response_model=KopierPeriodeResponse)
async def kopier_periode(
    request: KopierPeriodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KopierPeriodeResponse:
    """
    Kopier en eksisterende periode med alle menyer til ny periode.

    - kopier_produkter=True: Oppretter nye kopier av menyene
    - kopier_produkter=False: Linker til eksisterende menyer
    """
    try:
        return await periode_view_service.kopier_periode_med_menyer(db, request)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{periode_id}/menyer", response_model=dict)
async def opprett_meny_i_periode(
    periode_id: int,
    request: OpprettMenyIPeriodeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Opprett en ny meny og legg den til i perioden.
    """
    periode_query = select(Periode).where(Periode.menyperiodeid == periode_id)
    periode_result = await db.execute(periode_query)
    if not periode_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Periode ikke funnet")

    ny_meny = Meny(
        beskrivelse=request.beskrivelse,
        menygruppe=request.menygruppe_id,
    )
    db.add(ny_meny)
    await db.flush()

    periode_meny = PeriodeMeny(periodeid=periode_id, menyid=ny_meny.menyid)
    db.add(periode_meny)

    for produkt_id in request.produkt_ids:
        meny_produkt = MenyProdukt(menyid=ny_meny.menyid, produktid=produkt_id)
        db.add(meny_produkt)

    await db.commit()

    return {
        "message": "Meny opprettet og lagt til i periode",
        "meny_id": ny_meny.menyid,
        "produkter_lagt_til": len(request.produkt_ids),
    }


@router.post("/{periode_id}/bulk-tilordne", response_model=dict)
async def bulk_tilordne_menyer(
    periode_id: int,
    request: BulkTilordneMenyerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Tilordne flere menyer til en periode samtidig.
    """
    periode_query = select(Periode).where(Periode.menyperiodeid == periode_id)
    periode_result = await db.execute(periode_query)
    if not periode_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Periode ikke funnet")

    eksisterende_query = select(PeriodeMeny.menyid).where(
        and_(
            PeriodeMeny.periodeid == periode_id,
            PeriodeMeny.menyid.in_(request.meny_ids),
        )
    )
    eksisterende_result = await db.execute(eksisterende_query)
    eksisterende_ids = set(row[0] for row in eksisterende_result.all())

    lagt_til = 0
    for meny_id in request.meny_ids:
        if meny_id not in eksisterende_ids:
            db.add(PeriodeMeny(periodeid=periode_id, menyid=meny_id))
            lagt_til += 1

    await db.commit()

    return {
        "message": f"Lagt til {lagt_til} menyer i periode",
        "lagt_til": lagt_til,
        "allerede_eksisterende": len(eksisterende_ids),
    }


@router.delete("/{periode_id}/bulk-fjern", response_model=dict)
async def bulk_fjern_menyer(
    periode_id: int,
    request: BulkFjernMenyerRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Fjern flere menyer fra en periode samtidig.
    """
    fjernet = 0
    for meny_id in request.meny_ids:
        query = select(PeriodeMeny).where(
            and_(
                PeriodeMeny.periodeid == periode_id,
                PeriodeMeny.menyid == meny_id,
            )
        )
        result = await db.execute(query)
        pm = result.scalar_one_or_none()
        if pm:
            await db.delete(pm)
            fjernet += 1

    await db.commit()

    return {
        "message": f"Fjernet {fjernet} menyer fra periode",
        "fjernet": fjernet,
    }
