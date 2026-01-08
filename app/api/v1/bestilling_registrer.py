"""API endpoints for order registration and customer self-service."""
import secrets
from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func, update
from sqlalchemy.orm import selectinload
from pydantic import BaseModel

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User
from app.models.kunder import Kunder as KunderModel
from app.services.email_service import email_service
from app.core.config import settings
from app.models.kunde_gruppe import Kundegruppe
from app.models.periode import Periode
from app.models.periode_meny import PeriodeMeny
from app.models.meny import Meny
from app.models.meny_produkt import MenyProdukt
from app.models.menygruppe import Menygruppe
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.models.customer_access_token import CustomerAccessToken

router = APIRouter()


# --- Request/Response Schemas ---

class OrdrelinjeBestilling(BaseModel):
    """Single order line in a registration."""
    produktid: int
    antall: float


class PeriodeBestilling(BaseModel):
    """Period with order lines."""
    periodeid: int
    linjer: List[OrdrelinjeBestilling]


class OpprettOrdreRequest(BaseModel):
    """Request for creating an order."""
    kundeid: int
    perioder: List[PeriodeBestilling]


class OpprettOrdreResponse(BaseModel):
    """Response after creating order(s)."""
    ordre_ids: List[int]
    antall_ordrer: int
    melding: str


class GenererLenkeRequest(BaseModel):
    """Request for generating customer access link."""
    kundeid: int
    expires_days: int = 7


class GenererLenkeResponse(BaseModel):
    """Response with generated link."""
    token: str
    link: str
    expires_at: datetime
    kundeid: int
    kundenavn: Optional[str] = None
    email_sent: bool = False
    email_address: Optional[str] = None


class ProduktForKunde(BaseModel):
    """Product for customer order form."""
    produktid: int
    produktnavn: Optional[str] = None
    visningsnavn: Optional[str] = None
    pris: Optional[float] = None


class PeriodeForKunde(BaseModel):
    """Period with products for customer."""
    periodeid: int
    ukenr: Optional[int] = None
    fradato: Optional[datetime] = None
    tildato: Optional[datetime] = None
    produkter: List[ProduktForKunde] = []


class KundeMenyResponse(BaseModel):
    """Customer menu response."""
    kundeid: int
    kundenavn: Optional[str] = None
    menygruppe_navn: Optional[str] = None
    perioder: List[PeriodeForKunde] = []
    token_expires_at: datetime


class KundeBestillingRequest(BaseModel):
    """Customer order submission."""
    perioder: List[PeriodeBestilling]


class KundeBestillingResponse(BaseModel):
    """Response after customer submits order."""
    success: bool
    ordre_ids: List[int] = []
    melding: str


# --- Internal Endpoints (requires authentication) ---

@router.post("/ordre", response_model=OpprettOrdreResponse)
async def opprett_ordre(
    request: OpprettOrdreRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OpprettOrdreResponse:
    """
    Opprett ordre for en kunde basert på bestillingsskjema.

    Oppretter én ordre per periode med tilhørende ordrelinjer.
    """
    # Verifiser at kunden finnes
    kunde_query = select(KunderModel).where(KunderModel.kundeid == request.kundeid)
    kunde_result = await db.execute(kunde_query)
    kunde = kunde_result.scalar_one_or_none()

    if not kunde:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kunde med id {request.kundeid} ikke funnet"
        )

    ordre_ids = []

    for periode_bestilling in request.perioder:
        # Filtrer ut linjer med antall > 0
        aktive_linjer = [l for l in periode_bestilling.linjer if l.antall > 0]

        if not aktive_linjer:
            continue

        # Hent periode for leveringsdato
        periode_query = select(Periode).where(Periode.menyperiodeid == periode_bestilling.periodeid)
        periode_result = await db.execute(periode_query)
        periode = periode_result.scalar_one_or_none()

        leveringsdato = periode.fradato if periode else datetime.now()

        # Opprett ordre
        ny_ordre = Ordrer(
            kundeid=request.kundeid,
            kundenavn=kunde.kundenavn,
            ordredato=datetime.now(),
            leveringsdato=leveringsdato,
            ordrestatusid=1,  # Ny
            lagerok=False,
            sentbekreftelse=False,
        )
        db.add(ny_ordre)
        await db.flush()  # Få tildelt ordreid

        # Opprett ordredetaljer
        for idx, linje in enumerate(aktive_linjer):
            detalj = Ordredetaljer(
                ordreid=ny_ordre.ordreid,
                produktid=linje.produktid,
                unik=idx + 1,
                antall=linje.antall,
                levdato=leveringsdato,
            )
            db.add(detalj)

        ordre_ids.append(ny_ordre.ordreid)

    await db.commit()

    return OpprettOrdreResponse(
        ordre_ids=ordre_ids,
        antall_ordrer=len(ordre_ids),
        melding=f"Opprettet {len(ordre_ids)} ordre(r) for kunde {kunde.kundenavn}"
    )


@router.post("/send-link", response_model=GenererLenkeResponse)
async def generer_kundelenke(
    request: GenererLenkeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> GenererLenkeResponse:
    """
    Generer en unik lenke for kunde-selvbetjening.

    Lenken er gyldig i angitt antall dager.
    Sender e-post til kunden hvis e-postadresse er registrert.
    """
    # Verifiser at kunden finnes
    kunde_query = select(KunderModel).where(KunderModel.kundeid == request.kundeid)
    kunde_result = await db.execute(kunde_query)
    kunde = kunde_result.scalar_one_or_none()

    if not kunde:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kunde med id {request.kundeid} ikke funnet"
        )

    # Generer unik token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=request.expires_days)

    # Opprett token i database
    access_token = CustomerAccessToken(
        kundeid=request.kundeid,
        token=token,
        expires_at=expires_at,
        created_by=current_user.id if current_user else None,
    )
    db.add(access_token)
    await db.commit()

    # Generer full lenke (inkluderer frontend URL)
    full_link = f"{settings.FRONTEND_URL}/bestilling/kunde/{token}"

    # Send e-post til kunde hvis e-postadresse er registrert
    email_sent = False
    if kunde.e_post and email_service.is_configured():
        email_sent = email_service.send_customer_order_link(
            to_email=kunde.e_post,
            customer_name=kunde.kundenavn or "kunde",
            order_link=full_link,
            expires_at=expires_at,
        )

    return GenererLenkeResponse(
        token=token,
        link=full_link,
        expires_at=expires_at,
        kundeid=request.kundeid,
        kundenavn=kunde.kundenavn,
        email_sent=email_sent,
        email_address=kunde.e_post if email_sent else None,
    )


@router.get("/tokens", response_model=List[GenererLenkeResponse])
async def list_active_tokens(
    kundeid: Optional[int] = Query(None, description="Filtrer på kundeid"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[GenererLenkeResponse]:
    """
    List aktive tokens for kunder.
    """
    query = select(CustomerAccessToken).options(
        selectinload(CustomerAccessToken.kunde)
    ).where(
        and_(
            CustomerAccessToken.is_active == True,
            CustomerAccessToken.expires_at > datetime.utcnow()
        )
    )

    if kundeid:
        query = query.where(CustomerAccessToken.kundeid == kundeid)

    query = query.order_by(CustomerAccessToken.expires_at.desc())

    result = await db.execute(query)
    tokens = result.scalars().all()

    return [
        GenererLenkeResponse(
            token=t.token,
            link=f"{settings.FRONTEND_URL}/bestilling/kunde/{t.token}",
            expires_at=t.expires_at,
            kundeid=t.kundeid,
            kundenavn=t.kunde.kundenavn if t.kunde else None,
            email_sent=False,  # Not tracked historically
            email_address=None,
        )
        for t in tokens
    ]


# --- Public Endpoints (customer self-service via token) ---

async def validate_customer_token(
    token: str,
    db: AsyncSession,
) -> CustomerAccessToken:
    """Validate customer token and return the token object."""
    query = select(CustomerAccessToken).options(
        selectinload(CustomerAccessToken.kunde)
    ).where(
        and_(
            CustomerAccessToken.token == token,
            CustomerAccessToken.is_active == True,
        )
    )

    result = await db.execute(query)
    access_token = result.scalar_one_or_none()

    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ugyldig eller utløpt lenke"
        )

    if access_token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Lenken har utløpt"
        )

    # Oppdater bruks-statistikk
    access_token.used_count += 1
    access_token.last_used_at = datetime.utcnow()
    await db.commit()

    return access_token


@router.get("/kunde/meny", response_model=KundeMenyResponse)
async def get_kunde_meny(
    token: str = Query(..., description="Kundens tilgangstoken"),
    db: AsyncSession = Depends(get_db),
) -> KundeMenyResponse:
    """
    Hent meny for kunde basert på token (PUBLIC - ingen auth).

    Viser produkter basert på kundens menygruppe.
    """
    # Valider token
    access_token = await validate_customer_token(token, db)
    kunde = access_token.kunde

    # Hent menygruppe-navn
    menygruppe_navn = None
    if kunde.menygruppeid:
        mg_query = select(Menygruppe).where(Menygruppe.menygruppeid == int(kunde.menygruppeid))
        mg_result = await db.execute(mg_query)
        menygruppe = mg_result.scalar_one_or_none()
        if menygruppe:
            menygruppe_navn = menygruppe.beskrivelse

    # Hent kommende perioder med produkter
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    periode_query = select(Periode).options(
        selectinload(Periode.periode_menyer)
        .selectinload(PeriodeMeny.meny)
        .options(
            selectinload(Meny.meny_produkter)
            .selectinload(MenyProdukt.produkt)
        )
    ).where(
        Periode.fradato >= today
    ).order_by(Periode.fradato).limit(8)

    result = await db.execute(periode_query)
    perioder = result.scalars().all()

    # Transform til respons
    perioder_response = []
    for periode in perioder:
        produkter = []
        for pm in periode.periode_menyer:
            meny = pm.meny
            # Filtrer på kundens menygruppe hvis satt
            if kunde.menygruppeid and meny.menygruppe != int(kunde.menygruppeid):
                continue

            for mp in meny.meny_produkter:
                produkt = mp.produkt
                produkter.append(ProduktForKunde(
                    produktid=produkt.produktid,
                    produktnavn=produkt.produktnavn,
                    visningsnavn=produkt.visningsnavn,
                    pris=produkt.pris,
                ))

        if produkter:
            perioder_response.append(PeriodeForKunde(
                periodeid=periode.menyperiodeid,
                ukenr=periode.ukenr,
                fradato=periode.fradato,
                tildato=periode.tildato,
                produkter=produkter,
            ))

    return KundeMenyResponse(
        kundeid=kunde.kundeid,
        kundenavn=kunde.kundenavn,
        menygruppe_navn=menygruppe_navn,
        perioder=perioder_response,
        token_expires_at=access_token.expires_at,
    )


@router.post("/kunde/submit", response_model=KundeBestillingResponse)
async def submit_kunde_bestilling(
    request: KundeBestillingRequest,
    token: str = Query(..., description="Kundens tilgangstoken"),
    db: AsyncSession = Depends(get_db),
) -> KundeBestillingResponse:
    """
    Send inn bestilling fra kunde (PUBLIC - ingen auth).

    Oppretter ordre basert på kundens bestilling.
    """
    # Valider token
    access_token = await validate_customer_token(token, db)
    kunde = access_token.kunde

    ordre_ids = []

    for periode_bestilling in request.perioder:
        # Filtrer ut linjer med antall > 0
        aktive_linjer = [l for l in periode_bestilling.linjer if l.antall > 0]

        if not aktive_linjer:
            continue

        # Hent periode for leveringsdato
        periode_query = select(Periode).where(Periode.menyperiodeid == periode_bestilling.periodeid)
        periode_result = await db.execute(periode_query)
        periode = periode_result.scalar_one_or_none()

        leveringsdato = periode.fradato if periode else datetime.now()

        # Opprett ordre
        ny_ordre = Ordrer(
            kundeid=kunde.kundeid,
            kundenavn=kunde.kundenavn,
            ordredato=datetime.now(),
            leveringsdato=leveringsdato,
            ordrestatusid=1,  # Ny
            lagerok=False,
            sentbekreftelse=False,
            informasjon="Bestilt via kundeportal",
        )
        db.add(ny_ordre)
        await db.flush()

        # Opprett ordredetaljer
        for idx, linje in enumerate(aktive_linjer):
            detalj = Ordredetaljer(
                ordreid=ny_ordre.ordreid,
                produktid=linje.produktid,
                unik=idx + 1,
                antall=linje.antall,
                levdato=leveringsdato,
            )
            db.add(detalj)

        ordre_ids.append(ny_ordre.ordreid)

    await db.commit()

    if not ordre_ids:
        return KundeBestillingResponse(
            success=False,
            ordre_ids=[],
            melding="Ingen produkter med antall > 0 ble funnet i bestillingen"
        )

    return KundeBestillingResponse(
        success=True,
        ordre_ids=ordre_ids,
        melding=f"Takk for din bestilling! {len(ordre_ids)} ordre(r) er registrert."
    )
