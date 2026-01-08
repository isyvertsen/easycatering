"""API endpoints for Bestillingsskjema (Order Form)."""
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.kunder import Kunder as KunderModel
from app.models.periode import Periode
from app.models.periode_meny import PeriodeMeny
from app.models.meny import Meny
from app.models.meny_produkt import MenyProdukt
from app.models.menygruppe import Menygruppe

router = APIRouter()


# --- Response Schemas ---

class KundeForBestilling(BaseModel):
    """Kunde data for bestillingsskjema."""
    kundeid: int
    kundenavn: Optional[str] = None
    avdeling: Optional[str] = None
    telefonnummer: Optional[str] = None
    adresse: Optional[str] = None
    postnr: Optional[str] = None
    sted: Optional[str] = None
    velgsone: Optional[int] = None
    leveringsdag: Optional[int] = None
    e_post: Optional[str] = None
    kundegruppe: Optional[int] = None
    menygruppeid: Optional[float] = None
    menygruppe_navn: Optional[str] = None
    bestillerselv: Optional[bool] = None
    rute: Optional[int] = None
    ansattid: Optional[int] = None

    class Config:
        from_attributes = True


class ProduktIBestilling(BaseModel):
    """Produkt i bestillingsskjema."""
    produktid: int
    produktnavn: Optional[str] = None
    pris: Optional[float] = None
    pakningstype: Optional[str] = None
    visningsnavn: Optional[str] = None


class MenyIBestilling(BaseModel):
    """Meny med produkter for bestillingsskjema."""
    menyid: int
    beskrivelse: Optional[str] = None
    produkter: List[ProduktIBestilling] = []


class PeriodeMedMenyer(BaseModel):
    """Periode med menyer for bestillingsskjema."""
    menyperiodeid: int
    ukenr: Optional[int] = None
    fradato: Optional[datetime] = None
    tildato: Optional[datetime] = None
    menyer: List[MenyIBestilling] = []


class BestillingSkjemaResponse(BaseModel):
    """Hovedrespons for bestillingsskjema."""
    kunder: List[KundeForBestilling]
    perioder: List[PeriodeMedMenyer]


# --- Endpoints ---

@router.get("/kunder", response_model=List[KundeForBestilling])
async def get_kunder_for_bestilling(
    kundegruppe_id: Optional[int] = Query(None, description="Filtrer på kundegruppe"),
    menygruppe_id: Optional[int] = Query(None, description="Filtrer på menygruppe (valgfritt)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[KundeForBestilling]:
    """
    Hent kunder for bestillingsskjema.

    Filtrerer kunder som:
    - avsluttet = false
    - bestillerselv = true
    - (valgfritt) kundegruppe = angitt verdi
    - (valgfritt) menygruppeid = angitt verdi
    """
    query = select(KunderModel).where(
        and_(
            or_(KunderModel.avsluttet == False, KunderModel.avsluttet == None),
            KunderModel.bestillerselv == True,
        )
    )

    if kundegruppe_id is not None:
        query = query.where(KunderModel.kundegruppe == kundegruppe_id)

    if menygruppe_id is not None:
        query = query.where(KunderModel.menygruppeid == menygruppe_id)

    query = query.order_by(KunderModel.kundenavn)

    result = await db.execute(query)
    kunder = result.scalars().all()

    # Hent menygruppe-navn for alle kunder
    menygruppe_ids = list(set(k.menygruppeid for k in kunder if k.menygruppeid))
    menygrupper_map = {}

    if menygruppe_ids:
        mg_query = select(Menygruppe).where(Menygruppe.menygruppeid.in_([int(m) for m in menygruppe_ids]))
        mg_result = await db.execute(mg_query)
        for mg in mg_result.scalars().all():
            menygrupper_map[mg.menygruppeid] = mg.beskrivelse

    # Transform til respons
    response = []
    for kunde in kunder:
        kunde_data = KundeForBestilling(
            kundeid=kunde.kundeid,
            kundenavn=kunde.kundenavn,
            avdeling=kunde.avdeling,
            telefonnummer=kunde.telefonnummer,
            adresse=kunde.adresse,
            postnr=kunde.postnr,
            sted=kunde.sted,
            velgsone=kunde.velgsone,
            leveringsdag=kunde.leveringsdag,
            e_post=kunde.e_post,
            kundegruppe=kunde.kundegruppe,
            menygruppeid=kunde.menygruppeid,
            menygruppe_navn=menygrupper_map.get(int(kunde.menygruppeid)) if kunde.menygruppeid else None,
            bestillerselv=kunde.bestillerselv,
            rute=kunde.rute,
            ansattid=kunde.ansattid,
        )
        response.append(kunde_data)

    return response


@router.get("/perioder", response_model=List[PeriodeMedMenyer])
async def get_perioder_for_bestilling(
    menygruppe_id: Optional[int] = Query(None, description="Menygruppe ID (valgfritt, viser alle hvis ikke angitt)"),
    fra_periode_id: Optional[int] = Query(None, description="Fra periode ID"),
    til_periode_id: Optional[int] = Query(None, description="Til periode ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[PeriodeMedMenyer]:
    """
    Hent perioder med menyer og produkter for bestillingsskjema.

    Hvis fra_periode_id og til_periode_id er angitt, hentes perioder i det intervallet.
    Ellers hentes de neste 4 periodene fra i dag.
    """
    query = select(Periode).options(
        selectinload(Periode.periode_menyer)
        .selectinload(PeriodeMeny.meny)
        .options(
            selectinload(Meny.meny_produkter)
            .selectinload(MenyProdukt.produkt)
        )
    )

    if fra_periode_id and til_periode_id:
        # Hent fra og til perioder for å finne datoer
        fra_query = select(Periode).where(Periode.menyperiodeid == fra_periode_id)
        til_query = select(Periode).where(Periode.menyperiodeid == til_periode_id)

        fra_result = await db.execute(fra_query)
        til_result = await db.execute(til_query)

        fra_periode = fra_result.scalar_one_or_none()
        til_periode = til_result.scalar_one_or_none()

        if fra_periode and til_periode:
            query = query.where(
                and_(
                    Periode.fradato >= fra_periode.fradato,
                    Periode.fradato <= til_periode.fradato
                )
            )
    else:
        # Default: hent perioder fra i dag og fremover
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        query = query.where(Periode.fradato >= today).limit(4)

    query = query.order_by(Periode.fradato)
    result = await db.execute(query)
    perioder = result.scalars().all()

    # Transform til respons, filtrer menyer etter menygruppe hvis angitt
    response = []
    for periode in perioder:
        menyer_i_gruppe = []
        for pm in periode.periode_menyer:
            meny = pm.meny
            # Inkluder meny hvis menygruppe_id ikke er angitt, eller hvis den matcher
            if menygruppe_id is None or meny.menygruppe == menygruppe_id:
                produkter = [
                    ProduktIBestilling(
                        produktid=mp.produkt.produktid,
                        produktnavn=mp.produkt.produktnavn,
                        pris=mp.produkt.pris,
                        pakningstype=mp.produkt.pakningstype,
                        visningsnavn=mp.produkt.visningsnavn,
                    )
                    for mp in meny.meny_produkter
                ]
                menyer_i_gruppe.append(MenyIBestilling(
                    menyid=meny.menyid,
                    beskrivelse=meny.beskrivelse,
                    produkter=produkter,
                ))

        response.append(PeriodeMedMenyer(
            menyperiodeid=periode.menyperiodeid,
            ukenr=periode.ukenr,
            fradato=periode.fradato,
            tildato=periode.tildato,
            menyer=menyer_i_gruppe,
        ))

    return response


@router.get("/komplett", response_model=BestillingSkjemaResponse)
async def get_komplett_bestilling_skjema(
    kundegruppe_id: Optional[int] = Query(None, description="Filtrer på kundegruppe"),
    menygruppe_id: Optional[int] = Query(None, description="Menygruppe ID (valgfritt)"),
    fra_periode_id: Optional[int] = Query(None, description="Fra periode ID"),
    til_periode_id: Optional[int] = Query(None, description="Til periode ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BestillingSkjemaResponse:
    """
    Hent komplett bestillingsskjema med kunder og perioder i ett kall.

    Kombinerer /kunder og /perioder endepunktene for enklere bruk.
    """
    kunder = await get_kunder_for_bestilling(
        kundegruppe_id=kundegruppe_id,
        menygruppe_id=menygruppe_id,
        current_user=current_user,
        db=db,
    )

    perioder = await get_perioder_for_bestilling(
        menygruppe_id=menygruppe_id,
        fra_periode_id=fra_periode_id,
        til_periode_id=til_periode_id,
        current_user=current_user,
        db=db,
    )

    return BestillingSkjemaResponse(
        kunder=kunder,
        perioder=perioder,
    )
