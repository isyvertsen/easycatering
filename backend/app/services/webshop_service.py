"""Webshop service for customer ordering."""
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Tuple

from sqlalchemy import select, func, and_, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.produkter import Produkter
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.domain.entities.user import User
from app.schemas.webshop import (
    WebshopProduct,
    WebshopProductListResponse,
    WebshopOrderCreate,
    WebshopOrder,
    WebshopOrderDetail,
    WebshopOrderLine,
    WebshopOrderCreateResponse,
    WebshopOrderListResponse,
    WebshopOrderByTokenResponse,
    WebshopAccessResponse,
)


class WebshopService:
    """Service for webshop operations.

    Order statuses are defined in tblordrestatus:
    10=Startet, 15=Bestilt, 20=Godkjent, 25=Plukkliste skrevet,
    30=Plukket, 35=Pakkliste skrevet, 80=Godkjent av mottaker,
    85=Fakturert, 90=Sendt til regnskap, 95=Kreditert,
    98=For sen kansellering, 99=Kansellert
    """

    def __init__(self, db: AsyncSession):
        self.db = db

    async def check_webshop_access(self, user: User) -> WebshopAccessResponse:
        """Check if user has webshop access through their customer group."""
        if not user.kundeid:
            return WebshopAccessResponse(
                has_access=False,
                message="Bruker er ikke knyttet til en kunde"
            )

        # Get customer with customer group
        query = (
            select(Kunder)
            .options(selectinload(Kunder.gruppe))
            .where(Kunder.kundeid == user.kundeid)
        )
        result = await self.db.execute(query)
        kunde = result.scalar_one_or_none()

        if not kunde:
            return WebshopAccessResponse(
                has_access=False,
                message="Kunde ikke funnet"
            )

        if not kunde.gruppe:
            return WebshopAccessResponse(
                has_access=False,
                kunde_navn=kunde.kundenavn,
                message="Kunde har ingen kundegruppe"
            )

        if not kunde.gruppe.webshop:
            return WebshopAccessResponse(
                has_access=False,
                kunde_navn=kunde.kundenavn,
                kundegruppe_navn=kunde.gruppe.gruppe,
                message="Kundegruppen har ikke webshop-tilgang"
            )

        return WebshopAccessResponse(
            has_access=True,
            kunde_navn=kunde.kundenavn,
            kundegruppe_navn=kunde.gruppe.gruppe
        )

    async def get_products(
        self,
        search: Optional[str] = None,
        kategori_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "produktnavn",
        sort_order: str = "asc"
    ) -> WebshopProductListResponse:
        """Get products available in webshop."""
        # Base query - only webshop products that are not discontinued
        query = select(Produkter).where(
            and_(
                Produkter.webshop == True,
                Produkter.utgatt != True
            )
        )

        # Apply search filter
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Produkter.produktnavn.ilike(search_filter)) |
                (Produkter.visningsnavn.ilike(search_filter))
            )

        # Apply category filter
        if kategori_id:
            query = query.where(Produkter.kategoriid == kategori_id)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Apply sorting
        sort_column = getattr(Produkter, sort_by, Produkter.produktnavn)
        if sort_order == "desc":
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        # Execute query
        result = await self.db.execute(query)
        products = result.scalars().all()

        # Convert to schema
        items = [
            WebshopProduct(
                produktid=p.produktid,
                produktnavn=p.produktnavn,
                visningsnavn=p.visningsnavn,
                pris=p.pris,
                pakningstype=p.pakningstype,
                pakningsstorrelse=p.pakningsstorrelse,
                kategoriid=p.kategoriid,
                ean_kode=p.ean_kode
            )
            for p in products
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return WebshopProductListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def get_product(self, product_id: int) -> Optional[WebshopProduct]:
        """Get a single webshop product."""
        query = select(Produkter).where(
            and_(
                Produkter.produktid == product_id,
                Produkter.webshop == True,
                Produkter.utgatt != True
            )
        )
        result = await self.db.execute(query)
        product = result.scalar_one_or_none()

        if not product:
            return None

        return WebshopProduct(
            produktid=product.produktid,
            produktnavn=product.produktnavn,
            visningsnavn=product.visningsnavn,
            pris=product.pris,
            pakningstype=product.pakningstype,
            pakningsstorrelse=product.pakningsstorrelse,
            kategoriid=product.kategoriid,
            ean_kode=product.ean_kode
        )

    async def create_order(
        self,
        user: User,
        order_data: WebshopOrderCreate
    ) -> WebshopOrderCreateResponse:
        """Create a new webshop order."""
        # Get customer info
        query = select(Kunder).where(Kunder.kundeid == user.kundeid)
        result = await self.db.execute(query)
        kunde = result.scalar_one_or_none()

        if not kunde:
            raise ValueError("Kunde ikke funnet")

        # Create order
        new_order = Ordrer(
            kundeid=user.kundeid,
            kundenavn=kunde.kundenavn,
            ordredato=datetime.utcnow(),
            leveringsdato=order_data.leveringsdato,
            informasjon=order_data.informasjon,
            ordrestatusid=15,  # Bestilt
            lagerok=False,
            sentbekreftelse=False
        )

        self.db.add(new_order)
        await self.db.flush()  # Get the order ID

        # Create order lines
        for idx, line in enumerate(order_data.ordrelinjer):
            # Get product price if not provided
            pris = line.pris
            if pris is None:
                product_query = select(Produkter).where(Produkter.produktid == line.produktid)
                product_result = await self.db.execute(product_query)
                product = product_result.scalar_one_or_none()
                if product:
                    pris = product.pris or 0

            order_line = Ordredetaljer(
                ordreid=new_order.ordreid,
                produktid=line.produktid,
                unik=idx + 1,
                antall=line.antall,
                pris=pris or 0,
                levdato=order_data.leveringsdato
            )
            self.db.add(order_line)

        await self.db.commit()
        await self.db.refresh(new_order)

        return WebshopOrderCreateResponse(
            ordre=WebshopOrder(
                ordreid=new_order.ordreid,
                kundeid=new_order.kundeid,
                kundenavn=new_order.kundenavn,
                ordredato=new_order.ordredato,
                leveringsdato=new_order.leveringsdato,
                informasjon=new_order.informasjon,
                ordrestatusid=new_order.ordrestatusid
            ),
            message="Ordre opprettet"
        )

    async def get_my_orders(
        self,
        user: User,
        page: int = 1,
        page_size: int = 20,
        ordrestatusid: Optional[int] = None
    ) -> WebshopOrderListResponse:
        """Get orders for the current user's customer."""
        query = select(Ordrer).where(Ordrer.kundeid == user.kundeid)

        if ordrestatusid:
            query = query.where(Ordrer.ordrestatusid == ordrestatusid)

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Order by date descending
        query = query.order_by(Ordrer.ordredato.desc())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        orders = result.scalars().all()

        items = [
            WebshopOrder(
                ordreid=o.ordreid,
                kundeid=o.kundeid,
                kundenavn=o.kundenavn,
                ordredato=o.ordredato,
                leveringsdato=o.leveringsdato,
                informasjon=o.informasjon,
                ordrestatusid=o.ordrestatusid
            )
            for o in orders
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return WebshopOrderListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def get_order(self, order_id: int, user: User) -> Optional[WebshopOrderDetail]:
        """Get a single order with details."""
        query = (
            select(Ordrer)
            .options(selectinload(Ordrer.detaljer).selectinload(Ordredetaljer.produkt))
            .where(Ordrer.ordreid == order_id)
        )

        # If not admin, only allow access to own orders
        if user.rolle != "admin":
            query = query.where(Ordrer.kundeid == user.kundeid)

        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return None

        # Build order lines
        ordrelinjer = []
        total_sum = 0
        for detail in order.detaljer:
            line_total = (detail.pris or 0) * (detail.antall or 0)
            total_sum += line_total
            ordrelinjer.append(
                WebshopOrderLine(
                    produktid=detail.produktid,
                    produktnavn=detail.produkt.produktnavn if detail.produkt else None,
                    visningsnavn=detail.produkt.visningsnavn if detail.produkt else None,
                    antall=detail.antall or 0,
                    pris=detail.pris or 0,
                    total=line_total
                )
            )

        return WebshopOrderDetail(
            ordreid=order.ordreid,
            kundeid=order.kundeid,
            kundenavn=order.kundenavn,
            ordredato=order.ordredato,
            leveringsdato=order.leveringsdato,
            informasjon=order.informasjon,
            ordrestatusid=order.ordrestatusid,
            ordrelinjer=ordrelinjer,
            total_sum=total_sum
        )

    async def get_orders_for_approval(
        self,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None
    ) -> WebshopOrderListResponse:
        """Get orders waiting for approval (admin only)."""
        query = select(Ordrer).where(Ordrer.ordrestatusid == 15)  # Bestilt

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Ordrer.kundenavn.ilike(search_filter)) |
                (func.cast(Ordrer.ordreid, String).ilike(search_filter))
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Order by date
        query = query.order_by(Ordrer.ordredato.desc())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        orders = result.scalars().all()

        items = [
            WebshopOrder(
                ordreid=o.ordreid,
                kundeid=o.kundeid,
                kundenavn=o.kundenavn,
                ordredato=o.ordredato,
                leveringsdato=o.leveringsdato,
                informasjon=o.informasjon,
                ordrestatusid=o.ordrestatusid
            )
            for o in orders
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return WebshopOrderListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def get_orders_by_status(
        self,
        status_id: int,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None
    ) -> WebshopOrderListResponse:
        """Get orders by status (admin only)."""
        query = select(Ordrer).where(Ordrer.ordrestatusid == status_id)

        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Ordrer.kundenavn.ilike(search_filter)) |
                (func.cast(Ordrer.ordreid, String).ilike(search_filter))
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()

        # Order by date
        query = query.order_by(Ordrer.ordredato.desc())

        # Apply pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        result = await self.db.execute(query)
        orders = result.scalars().all()

        items = [
            WebshopOrder(
                ordreid=o.ordreid,
                kundeid=o.kundeid,
                kundenavn=o.kundenavn,
                ordredato=o.ordredato,
                leveringsdato=o.leveringsdato,
                informasjon=o.informasjon,
                ordrestatusid=o.ordrestatusid
            )
            for o in orders
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        return WebshopOrderListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def update_order_status(self, order_id: int, status_id: int) -> bool:
        """Update order status (admin only)."""
        query = select(Ordrer).where(Ordrer.ordreid == order_id)
        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return False

        order.ordrestatusid = status_id
        await self.db.commit()
        return True

    async def batch_update_status(self, order_ids: List[int], status_id: int) -> int:
        """Batch update order status (admin only)."""
        query = select(Ordrer).where(Ordrer.ordreid.in_(order_ids))
        result = await self.db.execute(query)
        orders = result.scalars().all()

        count = 0
        for order in orders:
            order.ordrestatusid = status_id
            count += 1

        await self.db.commit()
        return count
