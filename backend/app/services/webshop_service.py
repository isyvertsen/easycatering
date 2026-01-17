"""Webshop service for customer ordering."""
import json
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Tuple, Dict

from sqlalchemy import select, func, and_, or_, String, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.produkter import Produkter
from app.models.kunder import Kunder
from app.models.kunde_gruppe import Kundegruppe
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.domain.entities.user import User, user_kunder
from app.services.order_status_service import OrderStatusService, OrderStatusError
from app.services.system_settings_service import SystemSettingsService
from app.core.cache import cache_get, cache_set, cache_delete, CACHE_TTL_MEDIUM
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
    WebshopKundeInfo,
    WebshopDraftOrder,
    WebshopDraftOrderLineUpdate,
)

logger = logging.getLogger(__name__)


def calculate_next_delivery_date(leveringsdag: int) -> datetime:
    """Calculate the next delivery date based on customer's preferred delivery day.

    The delivery day is always in the NEXT week (not current week).
    leveringsdag: 1=Monday, 2=Tuesday, ..., 7=Sunday

    Example: If today is Wednesday in week 10, and customer's leveringsdag is 2 (Tuesday),
    the delivery date will be Tuesday in week 11.
    """
    today = datetime.now()

    # Python's weekday(): Monday=0, Sunday=6
    # Customer's leveringsdag: Monday=1, Sunday=7
    # Convert leveringsdag to Python weekday (0-6)
    target_weekday = leveringsdag - 1

    # Calculate days until next week's delivery day
    current_weekday = today.weekday()

    # Days until the target day in the current week
    days_to_target = target_weekday - current_weekday

    # Always go to next week, so add 7 days
    # If the target day hasn't passed this week, we still go to next week
    days_until_delivery = days_to_target + 7

    # If that would be less than 7 days (same day next week hasn't arrived yet in calculation),
    # we might already be past the target day this week, so add another week
    if days_until_delivery <= 0:
        days_until_delivery += 7

    # Ensure we're always at least in the next week
    if days_until_delivery < 7:
        days_until_delivery += 7

    delivery_date = today + timedelta(days=days_until_delivery)

    # Return just the date part (midnight)
    return datetime(delivery_date.year, delivery_date.month, delivery_date.day)


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

    async def get_user_kundeid(self, user: User, selected_kundeid: Optional[int] = None) -> Optional[int]:
        """Get the active kundeid for a user.

        If selected_kundeid is provided and user has access to it, returns that.
        Otherwise returns the first kundeid found with webshop access.
        """
        access = await self.check_webshop_access(user, selected_kundeid=selected_kundeid)
        return access.kundeid

    async def check_webshop_access(self, user: User, selected_kundeid: Optional[int] = None) -> WebshopAccessResponse:
        """Check if user has webshop access through their customer group.

        Uses the user_kunder junction table for user-customer relationships.

        Args:
            user: The user to check access for
            selected_kundeid: Optional specific customer to use (must be in user's linked customers)
        """
        # Get customer IDs from junction table
        junction_query = select(user_kunder.c.kundeid).where(user_kunder.c.user_id == user.id)
        junction_result = await self.db.execute(junction_query)
        kunde_ids = {row[0] for row in junction_result}

        if not kunde_ids:
            return WebshopAccessResponse(
                has_access=False,
                message="Bruker er ikke knyttet til en kunde"
            )

        # Validate selected_kundeid if provided
        if selected_kundeid and selected_kundeid not in kunde_ids:
            return WebshopAccessResponse(
                has_access=False,
                message="Du har ikke tilgang til denne kunden"
            )

        # Get all customers with their customer groups
        query = (
            select(Kunder)
            .options(selectinload(Kunder.gruppe))
            .where(Kunder.kundeid.in_(kunde_ids))
        )
        result = await self.db.execute(query)
        kunder = result.scalars().all()

        if not kunder:
            return WebshopAccessResponse(
                has_access=False,
                message="Ingen av de tilknyttede kundene ble funnet"
            )

        # Build list of available customers and check webshop access
        available_kunder: List[WebshopKundeInfo] = []
        first_with_access: Optional[Kunder] = None
        selected_kunde: Optional[Kunder] = None

        for kunde in kunder:
            has_webshop = bool(kunde.gruppe and kunde.gruppe.webshop)

            available_kunder.append(WebshopKundeInfo(
                kundeid=kunde.kundeid,
                kunde_navn=kunde.kundenavn or f"Kunde {kunde.kundeid}",
                kundegruppe_navn=kunde.gruppe.gruppe if kunde.gruppe else None,
                has_webshop_access=has_webshop
            ))

            # Track first customer with webshop access
            if has_webshop and not first_with_access:
                first_with_access = kunde

            # Check if this is the selected customer
            if selected_kundeid and kunde.kundeid == selected_kundeid:
                selected_kunde = kunde

        # If no customer has webshop access
        if not first_with_access:
            return WebshopAccessResponse(
                has_access=False,
                message="Ingen av de tilknyttede kundene har webshop-tilgang",
                available_kunder=available_kunder
            )

        # Use selected customer if provided and has webshop access
        active_kunde = first_with_access
        if selected_kunde:
            has_selected_webshop = bool(selected_kunde.gruppe and selected_kunde.gruppe.webshop)
            if has_selected_webshop:
                active_kunde = selected_kunde
            else:
                return WebshopAccessResponse(
                    has_access=False,
                    message="Den valgte kunden har ikke webshop-tilgang",
                    available_kunder=available_kunder
                )

        # Return access granted with the active customer
        return WebshopAccessResponse(
            has_access=True,
            kundeid=active_kunde.kundeid,
            kunde_navn=active_kunde.kundenavn,
            kundegruppe_navn=active_kunde.gruppe.gruppe if active_kunde.gruppe else None,
            available_kunder=available_kunder if len(available_kunder) > 1 else None
        )

    async def get_products(
        self,
        search: Optional[str] = None,
        kategori_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 20,
        sort_by: str = "produktnavn",
        sort_order: str = "asc",
        customer_id: Optional[int] = None,
        smart_sort: bool = False
    ) -> WebshopProductListResponse:
        """Get products available in webshop.

        Args:
            search: Search term for product name
            kategori_id: Filter by category ID
            page: Page number
            page_size: Items per page
            sort_by: Field to sort by (produktnavn, pris, visningsnavn)
            sort_order: Sort direction (asc, desc)
            customer_id: Customer ID for smart sorting (order frequency)
            smart_sort: Enable smart sorting by order frequency and category order

        Returns:
            Paginated list of webshop products
        """
        # Use smart sorting if enabled and customer_id is provided
        if smart_sort and customer_id:
            return await self._get_products_smart_sorted(
                customer_id=customer_id,
                search=search,
                kategori_id=kategori_id,
                page=page,
                page_size=page_size
            )

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

    async def _get_products_smart_sorted(
        self,
        customer_id: int,
        search: Optional[str] = None,
        kategori_id: Optional[int] = None,
        page: int = 1,
        page_size: int = 20
    ) -> WebshopProductListResponse:
        """Get products with smart sorting based on customer order history.

        Sorting priority:
        1. Products most frequently ordered by this customer in the last 4 weeks
        2. Products in the configured category order
        3. Alphabetically by product name

        Args:
            customer_id: Customer ID for order frequency calculation
            search: Search term for product name
            kategori_id: Filter by category ID
            page: Page number
            page_size: Items per page

        Returns:
            Paginated list of webshop products with smart sorting
        """
        # Get category order from system settings
        settings_service = SystemSettingsService(self.db)
        category_order = await settings_service.get_webshop_category_order()

        # Calculate date 4 weeks ago
        four_weeks_ago = datetime.utcnow() - timedelta(weeks=4)

        # Build search filter
        search_filter = ""
        if search:
            search_filter = "AND (p.produktnavn ILIKE :search OR p.visningsnavn ILIKE :search)"

        # Build category filter
        category_filter = ""
        if kategori_id:
            category_filter = "AND p.kategoriid = :kategori_id"

        # Build category rank CTE - create a ranking based on position in the list
        # Categories not in the list get rank 999
        category_rank_cte = ""
        if category_order:
            # Build CASE statement for category ranking
            category_cases = " ".join([
                f"WHEN {cat_id} THEN {idx + 1}"
                for idx, cat_id in enumerate(category_order)
            ])
            category_rank_cte = f"""
            ,category_rank AS (
                SELECT kategoriid,
                       CASE kategoriid {category_cases} ELSE 999 END as rank
                FROM (SELECT DISTINCT kategoriid FROM tblprodukter WHERE kategoriid IS NOT NULL) k
            )
            """

        # Build the main query with CTEs
        query_sql = f"""
        WITH order_frequency AS (
            SELECT
                od.produktid,
                COALESCE(SUM(od.antall), 0) as total_ordered
            FROM tblordredetaljer od
            JOIN tblordrer o ON od.ordreid = o.ordreid
            WHERE o.kundeid = :customer_id
              AND o.ordredato >= :four_weeks_ago
              AND o.ordrestatusid NOT IN (98, 99)
            GROUP BY od.produktid
        ){category_rank_cte}
        SELECT
            p.produktid,
            p.produktnavn,
            p.visningsnavn,
            p.pris,
            p.pakningstype,
            p.pakningsstorrelse,
            p.kategoriid,
            p.ean_kode,
            COALESCE(of.total_ordered, 0) as order_freq
            {', COALESCE(cr.rank, 999) as cat_rank' if category_order else ', 999 as cat_rank'}
        FROM tblprodukter p
        LEFT JOIN order_frequency of ON p.produktid = of.produktid
        {'LEFT JOIN category_rank cr ON p.kategoriid = cr.kategoriid' if category_order else ''}
        WHERE p.webshop = true
          AND (p.utgatt IS NULL OR p.utgatt = false)
          {search_filter}
          {category_filter}
        ORDER BY
            of.total_ordered DESC NULLS LAST,
            {'cr.rank' if category_order else '999'} ASC NULLS LAST,
            p.produktnavn ASC
        LIMIT :limit OFFSET :offset
        """

        # Build count query
        count_sql = f"""
        SELECT COUNT(*)
        FROM tblprodukter p
        WHERE p.webshop = true
          AND (p.utgatt IS NULL OR p.utgatt = false)
          {search_filter}
          {category_filter}
        """

        # Prepare parameters
        params: Dict[str, any] = {
            "customer_id": customer_id,
            "four_weeks_ago": four_weeks_ago,
            "limit": page_size,
            "offset": (page - 1) * page_size
        }
        if search:
            params["search"] = f"%{search}%"
        if kategori_id:
            params["kategori_id"] = kategori_id

        # Execute count query
        count_result = await self.db.execute(text(count_sql), params)
        total = count_result.scalar() or 0

        # Execute main query
        result = await self.db.execute(text(query_sql), params)
        rows = result.fetchall()

        # Convert to WebshopProduct objects
        items = [
            WebshopProduct(
                produktid=row.produktid,
                produktnavn=row.produktnavn,
                visningsnavn=row.visningsnavn,
                pris=row.pris,
                pakningstype=row.pakningstype,
                pakningsstorrelse=row.pakningsstorrelse,
                kategoriid=row.kategoriid,
                ean_kode=row.ean_kode
            )
            for row in rows
        ]

        total_pages = (total + page_size - 1) // page_size if total > 0 else 1

        logger.debug(
            f"Smart sort for customer {customer_id}: "
            f"{len(items)} products, category_order={category_order}"
        )

        return WebshopProductListResponse(
            items=items,
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )

    async def create_order(
        self,
        user: User,
        order_data: WebshopOrderCreate,
        kundeid: Optional[int] = None
    ) -> WebshopOrderCreateResponse:
        """Create a new webshop order.

        Args:
            user: The user placing the order
            order_data: Order details
            kundeid: Customer ID (required, from access check)
        """
        # Use provided kundeid or get from junction table
        active_kundeid = kundeid
        if not active_kundeid:
            active_kundeid = await self.get_user_kundeid(user)

        if not active_kundeid:
            raise ValueError("Bruker er ikke knyttet til en kunde")

        # Get customer info
        query = select(Kunder).where(Kunder.kundeid == active_kundeid)
        result = await self.db.execute(query)
        kunde = result.scalar_one_or_none()

        if not kunde:
            raise ValueError("Kunde ikke funnet")

        # Create order
        new_order = Ordrer(
            kundeid=active_kundeid,
            kundenavn=kunde.kundenavn,
            ordredato=datetime.utcnow(),
            leveringsdato=order_data.leveringsdato,
            informasjon=order_data.informasjon,
            sendestil=order_data.leveringsadresse,
            ordrestatusid=15,  # Bestilt
            lagerok=False,
            sentbekreftelse=False,
            bestilt_av=user.id  # Track who placed the order
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
        ordrestatusid: Optional[int] = None,
        kundeid: Optional[int] = None
    ) -> WebshopOrderListResponse:
        """Get orders for the current user's customer.

        Args:
            user: The user requesting orders
            page: Page number
            page_size: Items per page
            ordrestatusid: Optional status filter
            kundeid: Customer ID (from access check)
        """
        # Use provided kundeid or get from junction table
        active_kundeid = kundeid
        if not active_kundeid:
            active_kundeid = await self.get_user_kundeid(user)

        if not active_kundeid:
            return WebshopOrderListResponse(items=[], total=0, page=page, page_size=page_size, total_pages=0)

        query = select(Ordrer).where(Ordrer.kundeid == active_kundeid)

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

    async def get_order(self, order_id: int, user: User, kundeid: Optional[int] = None) -> Optional[WebshopOrderDetail]:
        """Get a single order with details.

        Args:
            order_id: The order ID to retrieve
            user: The requesting user
            kundeid: Optional customer ID for access check
        """
        query = (
            select(Ordrer)
            .options(selectinload(Ordrer.detaljer).selectinload(Ordredetaljer.produkt))
            .where(Ordrer.ordreid == order_id)
        )

        # If not admin, only allow access to own orders (using junction table)
        if user.rolle != "admin":
            # Get all customer IDs for this user from junction table
            junction_query = select(user_kunder.c.kundeid).where(user_kunder.c.user_id == user.id)
            junction_result = await self.db.execute(junction_query)
            user_kunde_ids = {row[0] for row in junction_result}

            if user_kunde_ids:
                query = query.where(Ordrer.kundeid.in_(user_kunde_ids))
            else:
                return None  # User has no linked customers

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
        """Get orders waiting for approval (admin only).

        Returns orders with status 10-19 (Startet og Bestilt - ikke godkjent ennå).
        """
        query = select(Ordrer).where(
            and_(
                Ordrer.ordrestatusid >= 10,
                Ordrer.ordrestatusid < 20
            )
        )

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
                ordrestatusid=o.ordrestatusid,
                bestilt_av=o.bestilt_av,
                bestilt_av_navn=o.bestiller.full_name if o.bestiller else None
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

    async def get_draft_order(self, user: User, kundeid: Optional[int] = None) -> Optional[WebshopDraftOrder]:
        """Get the current draft order (status 10) for user's customer.

        Returns None if no draft order exists.

        Args:
            user: The user requesting the draft
            kundeid: Customer ID (from access check)
        """
        # Use provided kundeid or get from junction table
        active_kundeid = kundeid
        if not active_kundeid:
            active_kundeid = await self.get_user_kundeid(user)

        if not active_kundeid:
            return None

        query = (
            select(Ordrer)
            .options(selectinload(Ordrer.detaljer).selectinload(Ordredetaljer.produkt))
            .where(
                and_(
                    Ordrer.kundeid == active_kundeid,
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
        ordrelinjer: List[WebshopDraftOrderLineUpdate],
        kundeid: Optional[int] = None
    ) -> WebshopDraftOrder:
        """Create or update a draft order with the given order lines.

        If a draft order exists, update its lines.
        If no draft order exists, create one with status 10 (Startet).

        Args:
            user: The user creating/updating the draft
            ordrelinjer: Order lines to set
            kundeid: Customer ID (from access check)
        """
        # Use provided kundeid or get from junction table
        active_kundeid = kundeid
        if not active_kundeid:
            active_kundeid = await self.get_user_kundeid(user)

        if not active_kundeid:
            raise ValueError("Bruker er ikke knyttet til en kunde")

        # Get customer info
        query = select(Kunder).where(Kunder.kundeid == active_kundeid)
        result = await self.db.execute(query)
        kunde = result.scalar_one_or_none()

        if not kunde:
            raise ValueError("Kunde ikke funnet")

        # Check for existing draft order
        draft_query = select(Ordrer).where(
            and_(
                Ordrer.kundeid == active_kundeid,
                Ordrer.ordrestatusid == 10
            )
        )
        draft_result = await self.db.execute(draft_query)
        order = draft_result.scalar_one_or_none()

        if not order:
            # Create new draft order
            order = Ordrer(
                kundeid=active_kundeid,
                kundenavn=kunde.kundenavn,
                ordredato=datetime.utcnow(),
                ordrestatusid=10,  # Startet
                lagerok=False,
                sentbekreftelse=False,
                bestilt_av=user.id  # Track who started the order
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

    async def delete_draft_order(self, user: User, order_id: int, kundeid: Optional[int] = None) -> bool:
        """Delete a draft order.

        Only works for orders with status 10 belonging to the user's customer.

        Args:
            user: The user deleting the draft
            order_id: The order ID to delete
            kundeid: Customer ID (from access check)
        """
        # Use provided kundeid or get from junction table
        active_kundeid = kundeid
        if not active_kundeid:
            active_kundeid = await self.get_user_kundeid(user)

        if not active_kundeid:
            return False

        query = select(Ordrer).where(
            and_(
                Ordrer.ordreid == order_id,
                Ordrer.kundeid == active_kundeid,
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
        informasjon: Optional[str] = None,
        kundeid: Optional[int] = None
    ) -> Optional[WebshopOrder]:
        """Submit a draft order (change status from 10 to 15).

        If leveringsdato is not provided, it will be calculated based on
        the customer's preferred delivery day (leveringsdag).
        The delivery date is always in the next week.

        Returns the updated order or None if not found.

        Args:
            user: The user submitting the draft
            order_id: The draft order ID
            leveringsdato: Optional delivery date
            informasjon: Optional order information
            kundeid: Customer ID (from access check)
        """
        # Use provided kundeid or get from junction table
        active_kundeid = kundeid
        if not active_kundeid:
            active_kundeid = await self.get_user_kundeid(user)

        if not active_kundeid:
            return None

        query = select(Ordrer).where(
            and_(
                Ordrer.ordreid == order_id,
                Ordrer.kundeid == active_kundeid,
                Ordrer.ordrestatusid == 10
            )
        )
        result = await self.db.execute(query)
        order = result.scalar_one_or_none()

        if not order:
            return None

        # If no delivery date provided, calculate from customer's leveringsdag
        if leveringsdato is None:
            kunde_query = select(Kunder).where(Kunder.kundeid == active_kundeid)
            kunde_result = await self.db.execute(kunde_query)
            kunde = kunde_result.scalar_one_or_none()

            if kunde and kunde.leveringsdag:
                leveringsdato = calculate_next_delivery_date(kunde.leveringsdag)

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
