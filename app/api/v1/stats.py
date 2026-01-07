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
from app.models.perioder import Perioder
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

    # Upcoming periods (next 30 days)
    upcoming_periods_result = await db.execute(
        select(Perioder).where(
            and_(
                Perioder.startdato >= today,
                Perioder.startdato <= today + timedelta(days=30)
            )
        ).order_by(Perioder.startdato).limit(5)
    )
    upcoming_periods_rows = upcoming_periods_result.scalars().all()
    upcoming_periods = [
        UpcomingPeriod(
            periodeid=p.periodeid,
            beskrivelse=p.beskrivelse,
            startdato=p.startdato,
            sluttdato=p.sluttdato,
            days_until=(p.startdato - today).days
        )
        for p in upcoming_periods_rows
    ]

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
