"""Service for periode view operations."""
import logging
from typing import List, Optional, Dict
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models.periode import Periode
from app.models.periode_meny import PeriodeMeny
from app.models.meny import Meny
from app.models.meny_produkt import MenyProdukt
from app.models.menygruppe import Menygruppe
from app.schemas.periode_view import (
    PeriodeMedKomplettMeny,
    MenygruppeMedMenyer,
    MenyMedProdukter,
    ProduktInMeny,
    KopierPeriodeRequest,
    KopierPeriodeResponse,
)

logger = logging.getLogger(__name__)


class PeriodeViewService:
    """Service for comprehensive period viewing and management."""

    async def get_periode_med_komplett_meny(
        self,
        db: AsyncSession,
        periode_id: int
    ) -> Optional[PeriodeMedKomplettMeny]:
        """
        Hent en periode med alle menyer gruppert etter menygruppe,
        inkludert alle produkter i hver meny.
        """
        query = select(Periode).options(
            selectinload(Periode.periode_menyer)
            .selectinload(PeriodeMeny.meny)
            .options(
                selectinload(Meny.gruppe),
                selectinload(Meny.meny_produkter)
                .selectinload(MenyProdukt.produkt)
            )
        ).where(Periode.menyperiodeid == periode_id)

        result = await db.execute(query)
        periode = result.scalar_one_or_none()

        if not periode:
            return None

        return self._transform_periode_to_view(periode)

    async def get_perioder_med_komplett_meny(
        self,
        db: AsyncSession,
        fra_dato: Optional[datetime] = None,
        til_dato: Optional[datetime] = None,
        page: int = 1,
        page_size: int = 20
    ) -> tuple[List[PeriodeMedKomplettMeny], int]:
        """
        Hent liste over perioder med komplett menystruktur.
        """
        query = select(Periode).options(
            selectinload(Periode.periode_menyer)
            .selectinload(PeriodeMeny.meny)
            .options(
                selectinload(Meny.gruppe),
                selectinload(Meny.meny_produkter)
                .selectinload(MenyProdukt.produkt)
            )
        )

        count_query = select(func.count()).select_from(Periode)

        if fra_dato:
            query = query.where(Periode.fradato >= fra_dato)
            count_query = count_query.where(Periode.fradato >= fra_dato)
        if til_dato:
            query = query.where(Periode.tildato <= til_dato)
            count_query = count_query.where(Periode.tildato <= til_dato)

        query = query.order_by(Periode.fradato.desc())
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await db.execute(query)
        perioder = result.scalars().all()

        total_result = await db.execute(count_query)
        total = total_result.scalar() or 0

        return [self._transform_periode_to_view(p) for p in perioder], total

    async def kopier_periode_med_menyer(
        self,
        db: AsyncSession,
        request: KopierPeriodeRequest
    ) -> KopierPeriodeResponse:
        """
        Kopier en hel periode med alle menyer til ny periode.

        Hvis kopier_produkter=True: Oppretter nye menyer (kopier)
        Hvis kopier_produkter=False: Linker til eksisterende menyer
        """
        kilde = await self.get_periode_med_komplett_meny(db, request.kilde_periode_id)
        if not kilde:
            raise ValueError(f"Kilde-periode {request.kilde_periode_id} ikke funnet")

        ny_periode = Periode(
            ukenr=request.ukenr,
            fradato=request.fradato,
            tildato=request.tildato
        )
        db.add(ny_periode)
        await db.flush()

        kopierte_menyer = 0
        kopierte_produkter = 0

        if request.kopier_produkter:
            for gruppe in kilde.menygrupper:
                for meny in gruppe.menyer:
                    ny_meny = Meny(
                        beskrivelse=meny.beskrivelse,
                        menygruppe=meny.menygruppe
                    )
                    db.add(ny_meny)
                    await db.flush()

                    periode_meny = PeriodeMeny(
                        periodeid=ny_periode.menyperiodeid,
                        menyid=ny_meny.menyid
                    )
                    db.add(periode_meny)

                    for produkt in meny.produkter:
                        meny_produkt = MenyProdukt(
                            menyid=ny_meny.menyid,
                            produktid=produkt.produktid
                        )
                        db.add(meny_produkt)
                        kopierte_produkter += 1

                    kopierte_menyer += 1
        else:
            for gruppe in kilde.menygrupper:
                for meny in gruppe.menyer:
                    periode_meny = PeriodeMeny(
                        periodeid=ny_periode.menyperiodeid,
                        menyid=meny.menyid
                    )
                    db.add(periode_meny)
                    kopierte_menyer += 1
                    kopierte_produkter += len(meny.produkter)

        await db.commit()

        return KopierPeriodeResponse(
            ny_periode_id=ny_periode.menyperiodeid,
            kopierte_menyer=kopierte_menyer,
            kopierte_produkter=kopierte_produkter,
            message=f"Periode kopiert med {kopierte_menyer} menyer og {kopierte_produkter} produkter"
        )

    async def get_tilgjengelige_menyer_for_periode(
        self,
        db: AsyncSession,
        periode_id: int,
        menygruppe_id: Optional[int] = None
    ) -> List[MenyMedProdukter]:
        """
        Hent menyer som IKKE er tilordnet en gitt periode.
        """
        eksisterende_query = select(PeriodeMeny.menyid).where(
            PeriodeMeny.periodeid == periode_id
        )

        query = select(Meny).options(
            selectinload(Meny.gruppe),
            selectinload(Meny.meny_produkter).selectinload(MenyProdukt.produkt)
        ).where(
            Meny.menyid.notin_(eksisterende_query)
        )

        if menygruppe_id:
            query = query.where(Meny.menygruppe == menygruppe_id)

        result = await db.execute(query)
        menyer = result.scalars().all()

        return [self._transform_meny(m) for m in menyer]

    def _transform_periode_to_view(self, periode: Periode) -> PeriodeMedKomplettMeny:
        """Transformer en Periode-modell til view-schema med grupperte menyer."""
        grupper_map: Dict[int, MenygruppeMedMenyer] = {}
        total_produkter = 0

        for pm in periode.periode_menyer:
            meny = pm.meny
            gruppe_id = meny.menygruppe or 0

            if gruppe_id not in grupper_map:
                grupper_map[gruppe_id] = MenygruppeMedMenyer(
                    gruppeid=gruppe_id,
                    beskrivelse=meny.gruppe.beskrivelse if meny.gruppe else "Uten gruppe",
                    menyer=[]
                )

            meny_view = self._transform_meny(meny)
            grupper_map[gruppe_id].menyer.append(meny_view)
            total_produkter += meny_view.produkt_antall

        return PeriodeMedKomplettMeny(
            menyperiodeid=periode.menyperiodeid,
            ukenr=periode.ukenr,
            fradato=periode.fradato,
            tildato=periode.tildato,
            menygrupper=list(grupper_map.values()),
            total_menyer=len(periode.periode_menyer),
            total_produkter=total_produkter
        )

    def _transform_meny(self, meny: Meny) -> MenyMedProdukter:
        """Transformer en Meny-modell til view-schema."""
        produkter = [
            ProduktInMeny(
                produktid=mp.produkt.produktid,
                produktnavn=mp.produkt.produktnavn,
                pris=mp.produkt.pris,
                pakningstype=mp.produkt.pakningstype,
                visningsnavn=mp.produkt.visningsnavn
            )
            for mp in meny.meny_produkter
        ]

        return MenyMedProdukter(
            menyid=meny.menyid,
            beskrivelse=meny.beskrivelse,
            menygruppe=meny.menygruppe,
            menygruppe_beskrivelse=meny.gruppe.beskrivelse if meny.gruppe else None,
            produkter=produkter,
            produkt_antall=len(produkter)
        )


periode_view_service = PeriodeViewService()
