"""API endpoints for dashboard statistics."""
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from app.api.deps import get_db, get_current_user
from app.models.kunder import Kunder
from app.models.ansatte import Ansatte
from app.models.produkter import Produkter as ProdukterModel
from app.models.kalkyle import Kalkyle
from app.models.meny import Meny
from app.models.ordrer import Ordrer
from app.models.ordredetaljer import Ordredetaljer
from app.domain.entities.user import User
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()


class UpcomingPeriod(BaseModel):
    """Upcoming period info."""
    periodeid: int
    beskrivelse: Optional[str]
    startdato: date
    sluttdato: date
    days_until: int


class TodayDelivery(BaseModel):
    """Today's delivery summary."""
    total_orders: int
    delivered: int
    pending: int


class DashboardStats(BaseModel):
    """Dashboard statistics response."""
    total_customers: int
    total_employees: int
    total_products: int
    total_orders: int
    total_menus: int
    total_recipes: int
    # Extended stats
    orders_today: int
    orders_this_week: int
    orders_this_month: int
    pending_orders: int
    today_deliveries: TodayDelivery
    upcoming_periods: List[UpcomingPeriod]


class DailySales(BaseModel):
    """Daily sales data."""
    date: date
    order_count: int


class SalesHistoryResponse(BaseModel):
    """Sales history response."""
    data: List[DailySales]
    period_days: int


class TopProduct(BaseModel):
    """Top product info."""
    produktid: int
    produktnavn: str
    total_quantity: float
    order_count: int


class TopProductsResponse(BaseModel):
    """Top products response."""
    products: List[TopProduct]
    period_days: int


@router.get("/", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hent dashboard-statistikk effektivt.
    Returnerer kun antall for hver entitet uten å hente alle data.
    """
    today = date.today()
    week_start = today - timedelta(days=today.weekday())
    month_start = today.replace(day=1)

    # Tell alle entiteter i parallell med COUNT queries
    customers_result = await db.execute(
        select(func.count()).select_from(Kunder)
    )
    total_customers = customers_result.scalar() or 0

    employees_result = await db.execute(
        select(func.count()).select_from(Ansatte)
    )
    total_employees = employees_result.scalar() or 0

    products_result = await db.execute(
        select(func.count()).select_from(ProdukterModel)
    )
    total_products = products_result.scalar() or 0

    orders_result = await db.execute(
        select(func.count()).select_from(Ordrer)
    )
    total_orders = orders_result.scalar() or 0

    menus_result = await db.execute(
        select(func.count()).select_from(Meny)
    )
    total_menus = menus_result.scalar() or 0

    recipes_result = await db.execute(
        select(func.count()).select_from(Kalkyle)
    )
    total_recipes = recipes_result.scalar() or 0

    # Orders today
    orders_today_result = await db.execute(
        select(func.count()).select_from(Ordrer).where(
            func.date(Ordrer.ordredato) == today
        )
    )
    orders_today = orders_today_result.scalar() or 0

    # Orders this week
    orders_week_result = await db.execute(
        select(func.count()).select_from(Ordrer).where(
            func.date(Ordrer.ordredato) >= week_start
        )
    )
    orders_this_week = orders_week_result.scalar() or 0

    # Orders this month
    orders_month_result = await db.execute(
        select(func.count()).select_from(Ordrer).where(
            func.date(Ordrer.ordredato) >= month_start
        )
    )
    orders_this_month = orders_month_result.scalar() or 0

    # Pending orders (not cancelled, not delivered)
    pending_orders_result = await db.execute(
        select(func.count()).select_from(Ordrer).where(
            and_(
                Ordrer.kansellertdato.is_(None),
                or_(
                    Ordrer.ordrelevert.is_(None),
                    Ordrer.ordrelevert == ''
                )
            )
        )
    )
    pending_orders = pending_orders_result.scalar() or 0

    # Today's deliveries
    today_deliveries_total = await db.execute(
        select(func.count()).select_from(Ordrer).where(
            func.date(Ordrer.leveringsdato) == today
        )
    )
    today_total = today_deliveries_total.scalar() or 0

    today_delivered = await db.execute(
        select(func.count()).select_from(Ordrer).where(
            and_(
                func.date(Ordrer.leveringsdato) == today,
                Ordrer.ordrelevert.isnot(None),
                Ordrer.ordrelevert != ''
            )
        )
    )
    delivered = today_delivered.scalar() or 0

    today_deliveries = TodayDelivery(
        total_orders=today_total,
        delivered=delivered,
        pending=today_total - delivered
    )

    # Upcoming periods - currently not implemented (table structure differs)
    # TODO: Implement when periode table schema is clarified
    upcoming_periods: List[UpcomingPeriod] = []

    return DashboardStats(
        total_customers=total_customers,
        total_employees=total_employees,
        total_products=total_products,
        total_orders=total_orders,
        total_menus=total_menus,
        total_recipes=total_recipes,
        orders_today=orders_today,
        orders_this_week=orders_this_week,
        orders_this_month=orders_this_month,
        pending_orders=pending_orders,
        today_deliveries=today_deliveries,
        upcoming_periods=upcoming_periods
    )


@router.get("/sales-history", response_model=SalesHistoryResponse)
async def get_sales_history(
    days: int = 30,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hent ordrehistorikk per dag for de siste N dagene.
    Brukes for dashboard-grafer.
    """
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Get order counts per day
    result = await db.execute(
        select(
            func.date(Ordrer.ordredato).label('order_date'),
            func.count().label('count')
        ).where(
            func.date(Ordrer.ordredato) >= start_date
        ).group_by(
            func.date(Ordrer.ordredato)
        ).order_by(
            func.date(Ordrer.ordredato)
        )
    )
    rows = result.all()

    # Create a dict for quick lookup
    sales_by_date = {row.order_date: row.count for row in rows}

    # Fill in all days (including days with no orders)
    data = []
    current_date = start_date
    while current_date <= today:
        data.append(DailySales(
            date=current_date,
            order_count=sales_by_date.get(current_date, 0)
        ))
        current_date += timedelta(days=1)

    return SalesHistoryResponse(
        data=data,
        period_days=days
    )


@router.get("/top-products", response_model=TopProductsResponse)
async def get_top_products(
    days: int = 30,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Hent mest solgte produkter for de siste N dagene.
    Brukes for dashboard-widgets.
    """
    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Get top products by total quantity ordered
    result = await db.execute(
        select(
            Ordredetaljer.produktid,
            ProdukterModel.produktnavn,
            func.sum(Ordredetaljer.antall).label('total_quantity'),
            func.count(Ordredetaljer.ordreid.distinct()).label('order_count')
        ).join(
            ProdukterModel, Ordredetaljer.produktid == ProdukterModel.produktid
        ).join(
            Ordrer, Ordredetaljer.ordreid == Ordrer.ordreid
        ).where(
            func.date(Ordrer.ordredato) >= start_date
        ).group_by(
            Ordredetaljer.produktid,
            ProdukterModel.produktnavn
        ).order_by(
            func.sum(Ordredetaljer.antall).desc()
        ).limit(limit)
    )
    rows = result.all()

    products = [
        TopProduct(
            produktid=row.produktid,
            produktnavn=row.produktnavn or f"Produkt {row.produktid}",
            total_quantity=float(row.total_quantity or 0),
            order_count=row.order_count or 0
        )
        for row in rows
    ]

    return TopProductsResponse(
        products=products,
        period_days=days
    )
