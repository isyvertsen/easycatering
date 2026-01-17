"""Label (etikett) API endpoints for delivery labels."""
import logging
from datetime import date, datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.domain.entities.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


class EtikettProdukt(BaseModel):
    """Product info for label."""
    produktid: int
    produktnavn: Optional[str] = None
    pris: Optional[float] = None
    antall: Optional[float] = None


class EtikettOrdre(BaseModel):
    """Order info for label."""
    ordreid: int
    leveringsdato: Optional[datetime] = None
    ansattid: Optional[int] = None
    produkter: List[EtikettProdukt] = []


class EtikettKunde(BaseModel):
    """Customer label data with orders and products."""
    kundeid: int
    kundenavn: Optional[str] = None
    leveringsdag: Optional[int] = None
    adresse: Optional[str] = None
    postnr: Optional[str] = None
    sted: Optional[str] = None
    rute: Optional[int] = None
    sjaforparute: Optional[float] = None
    diett: Optional[bool] = None
    menyinfo: Optional[str] = None
    menygruppeid: Optional[int] = None
    menygruppe_beskrivelse: Optional[str] = None
    sone: Optional[str] = None
    ordrer: List[EtikettOrdre] = []

    class Config:
        from_attributes = True


class EtikettResponse(BaseModel):
    """Response for label data."""
    fra_dato: date
    til_dato: date
    kunder: List[EtikettKunde]
    total_kunder: int
    total_ordrer: int


@router.get("/", response_model=EtikettResponse)
async def get_etiketter(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    fra_dato: date = Query(..., description="Start date for delivery period"),
    til_dato: date = Query(..., description="End date for delivery period"),
    sone_id: Optional[int] = Query(None, description="Filter by zone ID"),
    rute: Optional[int] = Query(None, description="Filter by route"),
    ordrestatus: int = Query(35, description="Order status to filter by (default: 35)"),
) -> EtikettResponse:
    """
    Get label data for customer deliveries within a date range.

    Returns customers with their orders and products for printing delivery labels.
    Only includes:
    - Active customers (not avsluttet, not kundeinaktiv)
    - Orders with specified status (default: 35)
    - Non-cancelled orders
    """
    try:
        # Build the query dynamically to avoid asyncpg NULL parameter type issues
        base_query = """
            SELECT
                k.kundeid,
                k.kundenavn,
                k.leveringsdag,
                k.adresse,
                k.postnr,
                k.sted,
                k.rute,
                k.sjaforparute,
                k.diett,
                k.menyinfo,
                k.menygruppeid,
                mg.beskrivelse as menygruppe_beskrivelse,
                s.sone,
                od.ordreid,
                od.produktid,
                p.produktnavn,
                od.pris,
                od.antall,
                o.leveringsdato,
                o.ansattid
            FROM tblkunder k
            INNER JOIN tblordrer o ON k.kundeid = o.kundeid
            INNER JOIN tblordredetaljer od ON o.ordreid = od.ordreid
            INNER JOIN tblprodukter p ON od.produktid = p.produktid
            LEFT JOIN tblmenygruppe mg ON k.menygruppeid = mg.menygruppeid
            LEFT JOIN tblsone s ON k.velgsone = s.idsone
            WHERE o.leveringsdato BETWEEN :fra_dato AND :til_dato
                AND (k.avsluttet = false OR k.avsluttet IS NULL)
                AND (k.kundeinaktiv = false OR k.kundeinaktiv IS NULL)
                AND o.ordrestatusid = :ordrestatus
                AND o.kansellertdato IS NULL
        """

        # Build parameters dict
        params = {
            "fra_dato": fra_dato,
            "til_dato": til_dato,
            "ordrestatus": ordrestatus,
        }

        # Add optional filters only if they have values
        if sone_id is not None:
            base_query += " AND k.velgsone = :sone_id"
            params["sone_id"] = sone_id

        if rute is not None:
            base_query += " AND k.rute = :rute"
            params["rute"] = rute

        base_query += " ORDER BY k.adresse, k.kundenavn, o.leveringsdato, p.produktnavn"

        result = await db.execute(text(base_query), params)
        rows = result.fetchall()

        # Group results by customer and order
        kunder_dict: dict = {}
        total_ordrer = set()

        for row in rows:
            kundeid = row.kundeid
            ordreid = row.ordreid

            # Create customer if not exists
            if kundeid not in kunder_dict:
                kunder_dict[kundeid] = EtikettKunde(
                    kundeid=kundeid,
                    kundenavn=row.kundenavn,
                    leveringsdag=row.leveringsdag,
                    adresse=row.adresse,
                    postnr=row.postnr,
                    sted=row.sted,
                    rute=row.rute,
                    sjaforparute=row.sjaforparute,
                    diett=row.diett,
                    menyinfo=row.menyinfo,
                    menygruppeid=row.menygruppeid,
                    menygruppe_beskrivelse=row.menygruppe_beskrivelse,
                    sone=row.sone,
                    ordrer=[],
                )

            # Find or create order
            kunde = kunder_dict[kundeid]
            ordre = next((o for o in kunde.ordrer if o.ordreid == ordreid), None)
            if ordre is None:
                ordre = EtikettOrdre(
                    ordreid=ordreid,
                    leveringsdato=row.leveringsdato,
                    ansattid=row.ansattid,
                    produkter=[],
                )
                kunde.ordrer.append(ordre)
                total_ordrer.add(ordreid)

            # Add product to order
            ordre.produkter.append(EtikettProdukt(
                produktid=row.produktid,
                produktnavn=row.produktnavn,
                pris=row.pris,
                antall=row.antall,
            ))

        return EtikettResponse(
            fra_dato=fra_dato,
            til_dato=til_dato,
            kunder=list(kunder_dict.values()),
            total_kunder=len(kunder_dict),
            total_ordrer=len(total_ordrer),
        )
    except Exception as e:
        logger.error(f"Error in get_etiketter: {e}", exc_info=True)
        raise
