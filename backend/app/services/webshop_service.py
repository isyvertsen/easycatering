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
from app.services.order_status_service import OrderStatusService, OrderStatusError
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
    WebshopDraftOrder,
    WebshopDraftOrderLineUpdate,
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
            sendestil=order_data.leveringsadresse,
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
                    unik=detail.unik,
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
        """Update order status (admin only).

        Uses shared OrderStatusService for consistent workflow logic.
        """
        status_service = OrderStatusService(self.db)
        try:
            await status_service.update_status(order_id, status_id)
            return True
        except OrderStatusError:
            return False

    async def batch_update_status(self, order_ids: List[int], status_id: int) -> int:
        """Batch update order status (admin only).

        Uses shared OrderStatusService for consistent workflow logic.
        """
        status_service = OrderStatusService(self.db)
        try:
            result = await status_service.batch_update_status(order_ids, status_id)
            return result["updated_count"]
        except OrderStatusError:
            return 0

    async def get_order_by_token(self, token: str) -> Optional[WebshopOrderByTokenResponse]:
        """Get order by token (for public access via email link).

        For simplicity, the token is the order ID.
        In production, use a secure random token stored in the database.
        Token is valid for 14 days after order creation.
        """
        try:
            order_id = int(token)
        except ValueError:
            return None

        query = (
            select(Ordrer)
            .options(selectinload(Ordrer.detaljer).selectinload(Ordredetaljer.produkt))
            .where(Ordrer.ordreid == order_id)
        )

        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return None

        # Check if token is expired (14 days)
        if order.ordredato:
            token_expires = order.ordredato + timedelta(days=14)
            token_expired = datetime.utcnow() > token_expires
        else:
            token_expires = None
            token_expired = False

        # Build order lines
        ordrelinjer = []
        for detail in order.detaljer:
            line_total = (detail.pris or 0) * (detail.antall or 0)
            ordrelinjer.append(
                WebshopOrderLine(
                    unik=detail.unik,
                    produktid=detail.produktid,
                    produktnavn=detail.produkt.produktnavn if detail.produkt else None,
                    visningsnavn=detail.produkt.visningsnavn if detail.produkt else None,
                    antall=detail.antall or 0,
                    pris=detail.pris or 0,
                    total=line_total
                )
            )

        return WebshopOrderByTokenResponse(
            ordre=WebshopOrder(
                ordreid=order.ordreid,
                kundeid=order.kundeid,
                kundenavn=order.kundenavn,
                ordredato=order.ordredato,
                leveringsdato=order.leveringsdato,
                informasjon=order.informasjon,
                ordrestatusid=order.ordrestatusid
            ),
            ordrelinjer=ordrelinjer,
            token_utlopt=token_expired,
            token_utloper=token_expires
        )

    async def confirm_receipt_by_token(self, token: str) -> bool:
        """Confirm receipt of order by token.

        Only works for orders with status 35 (Pakkliste skrevet).
        Updates status to 80 (Godkjent av mottaker).
        """
        try:
            order_id = int(token)
        except ValueError:
            return False

        query = select(Ordrer).where(Ordrer.ordreid == order_id)
        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return False

        # Check that order is ready for confirmation (status 35)
        if order.ordrestatusid != 35:
            return False

        # Check that token is not expired
        if order.ordredato:
            token_expires = order.ordredato + timedelta(days=14)
            if datetime.utcnow() > token_expires:
                return False

        # Update status to 80 (Godkjent av mottaker)
        order.ordrestatusid = 80
        await self.db.commit()
        return True

    async def cancel_order(
        self,
        order_id: int,
        arsak: Optional[str] = None,
        for_sen: bool = False
    ) -> Tuple[bool, int]:
        """Cancel an order.

        Uses shared OrderStatusService for consistent workflow logic.

        Args:
            order_id: The order ID to cancel
            arsak: Reason for cancellation (optional)
            for_sen: If True, use status 98 (late cancellation), else 99 (normal)

        Returns:
            Tuple of (success, new_status_id)
        """
        status_service = OrderStatusService(self.db)
        try:
            success, new_status = await status_service.cancel_order(
                order_id, for_sen=for_sen, arsak=arsak
            )
            return success, new_status
        except OrderStatusError:
            return False, 0

    # =========================================================================
    # Draft order methods (auto-save)
    # =========================================================================

    async def get_draft_order(self, user: User) -> Optional[WebshopDraftOrder]:
        """Get the current draft order (status 10) for user's customer.

        Returns None if no draft order exists.
        """
        query = (
            select(Ordrer)
            .options(selectinload(Ordrer.detaljer).selectinload(Ordredetaljer.produkt))
            .where(
                and_(
                    Ordrer.kundeid == user.kundeid,
                    Ordrer.ordrestatusid == 10  # Startet
                )
            )
            .order_by(Ordrer.ordredato.desc())
        )

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
                    unik=detail.unik,
                    produktid=detail.produktid,
                    produktnavn=detail.produkt.produktnavn if detail.produkt else None,
                    visningsnavn=detail.produkt.visningsnavn if detail.produkt else None,
                    antall=detail.antall or 0,
                    pris=detail.pris or 0,
                    total=line_total
                )
            )

        return WebshopDraftOrder(
            ordreid=order.ordreid,
            kundeid=order.kundeid,
            kundenavn=order.kundenavn,
            ordredato=order.ordredato,
            ordrestatusid=order.ordrestatusid,
            ordrelinjer=ordrelinjer,
            total_sum=total_sum
        )

    async def create_or_update_draft_order(
        self,
        user: User,
        ordrelinjer: List[WebshopDraftOrderLineUpdate]
    ) -> WebshopDraftOrder:
        """Create or update a draft order with the given order lines.

        If a draft order exists, update its lines.
        If no draft order exists, create one with status 10 (Startet).
        """
        # Get customer info
        query = select(Kunder).where(Kunder.kundeid == user.kundeid)
        result = await self.db.execute(query)
        kunde = result.scalar_one_or_none()

        if not kunde:
            raise ValueError("Kunde ikke funnet")

        # Check for existing draft order
        draft_query = select(Ordrer).where(
            and_(
                Ordrer.kundeid == user.kundeid,
                Ordrer.ordrestatusid == 10
            )
        )
        draft_result = await self.db.execute(draft_query)
        order = draft_result.scalar_one_or_none()

        if not order:
            # Create new draft order
            order = Ordrer(
                kundeid=user.kundeid,
                kundenavn=kunde.kundenavn,
                ordredato=datetime.utcnow(),
                ordrestatusid=10,  # Startet
                lagerok=False,
                sentbekreftelse=False
            )
            self.db.add(order)
            await self.db.flush()

        # Delete existing order lines
        delete_query = select(Ordredetaljer).where(Ordredetaljer.ordreid == order.ordreid)
        delete_result = await self.db.execute(delete_query)
        existing_lines = delete_result.scalars().all()
        for line in existing_lines:
            await self.db.delete(line)

        # Add new order lines
        total_sum = 0
        new_lines = []
        for idx, line in enumerate(ordrelinjer):
            # Get product price if not provided
            pris = line.pris
            produktnavn = None
            visningsnavn = None

            product_query = select(Produkter).where(Produkter.produktid == line.produktid)
            product_result = await self.db.execute(product_query)
            product = product_result.scalar_one_or_none()

            if product:
                if pris is None:
                    pris = product.pris or 0
                produktnavn = product.produktnavn
                visningsnavn = product.visningsnavn

            order_line = Ordredetaljer(
                ordreid=order.ordreid,
                produktid=line.produktid,
                unik=idx + 1,
                antall=line.antall,
                pris=pris or 0,
            )
            self.db.add(order_line)

            line_total = (pris or 0) * line.antall
            total_sum += line_total
            new_lines.append(
                WebshopOrderLine(
                    produktid=line.produktid,
                    produktnavn=produktnavn,
                    visningsnavn=visningsnavn,
                    antall=line.antall,
                    pris=pris or 0,
                    total=line_total
                )
            )

        await self.db.commit()
        await self.db.refresh(order)

        return WebshopDraftOrder(
            ordreid=order.ordreid,
            kundeid=order.kundeid,
            kundenavn=order.kundenavn,
            ordredato=order.ordredato,
            ordrestatusid=order.ordrestatusid,
            ordrelinjer=new_lines,
            total_sum=total_sum
        )

    async def delete_draft_order(self, user: User, order_id: int) -> bool:
        """Delete a draft order.

        Only works for orders with status 10 belonging to the user's customer.
        """
        query = select(Ordrer).where(
            and_(
                Ordrer.ordreid == order_id,
                Ordrer.kundeid == user.kundeid,
                Ordrer.ordrestatusid == 10
            )
        )
        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return False

        # Delete order lines first
        delete_lines_query = select(Ordredetaljer).where(Ordredetaljer.ordreid == order_id)
        delete_result = await self.db.execute(delete_lines_query)
        lines = delete_result.scalars().all()
        for line in lines:
            await self.db.delete(line)

        # Delete order
        await self.db.delete(order)
        await self.db.commit()
        return True

    async def submit_draft_order(
        self,
        user: User,
        order_id: int,
        leveringsdato: Optional[datetime] = None,
        informasjon: Optional[str] = None
    ) -> Optional[WebshopOrder]:
        """Submit a draft order (change status from 10 to 15).

        Returns the updated order or None if not found.
        """
        query = select(Ordrer).where(
            and_(
                Ordrer.ordreid == order_id,
                Ordrer.kundeid == user.kundeid,
                Ordrer.ordrestatusid == 10
            )
        )
        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return None

        # Update order
        order.ordrestatusid = 15  # Bestilt
        order.leveringsdato = leveringsdato
        order.informasjon = informasjon

        await self.db.commit()
        await self.db.refresh(order)

        return WebshopOrder(
            ordreid=order.ordreid,
            kundeid=order.kundeid,
            kundenavn=order.kundenavn,
            ordredato=order.ordredato,
            leveringsdato=order.leveringsdato,
            informasjon=order.informasjon,
            ordrestatusid=order.ordrestatusid
        )
