"""GraphQL resolvers for fetching data from database."""
from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import selectinload

from app.models.ordrer import Ordrer as OrdrerModel
from app.models.ordredetaljer import Ordredetaljer as OrdredetaljerModel
from app.models.kunder import Kunder as KunderModel
from app.models.produkter import Produkter as ProdukterModel
from app.models.kategorier import Kategorier as KategorierModel
from app.models.kunde_gruppe import Kundegruppe as KundegruppeModel
from app.graphql.schema import (
    Ordre, Kunde, Produkt, QuickStats, SalesReport, ProductReport,
    CustomerReport, NutritionStats, SalesDataPoint, CategorySales,
    PaymentMethodStats, TopProduct, CustomerSegment, CustomerActivity
)


async def get_ordre(ordre_id: int, db: AsyncSession) -> Optional[Ordre]:
    """
    Hent en ordre med alle detaljer.

    Args:
        ordre_id: ID på ordren
        db: Database session

    Returns:
        Ordre-objekt eller None
    """
    # Hent ordre med kunde eagerly loaded
    query = select(OrdrerModel).options(
        selectinload(OrdrerModel.kunde)
    ).where(OrdrerModel.ordreid == ordre_id)

    result = await db.execute(query)
    ordre_model = result.scalar_one_or_none()

    if not ordre_model:
        return None

    # Hent ordredetaljer med produkter
    detaljer_query = select(OrdredetaljerModel).options(
        selectinload(OrdredetaljerModel.produkt)
    ).where(OrdredetaljerModel.ordreid == ordre_id)

    detaljer_result = await db.execute(detaljer_query)
    ordredetaljer = detaljer_result.scalars().all()

    # Konverter kunde til GraphQL type
    kunde = Kunde(
        kundeid=ordre_model.kunde.kundeid,
        kundenavn=ordre_model.kunde.kundenavn or "",
        adresse=ordre_model.kunde.adresse,
        postnr=ordre_model.kunde.postnr,
        sted=ordre_model.kunde.sted,
        telefonnummer=ordre_model.kunde.telefonnummer,
        e_post=ordre_model.kunde.e_post
    ) if ordre_model.kunde else Kunde(
        kundeid=ordre_model.kundeid or 0,
        kundenavn=ordre_model.kundenavn or "Ukjent kunde",
        adresse=None,
        postnr=None,
        sted=None,
        telefonnummer=None,
        e_post=None
    )

    # Konverter produkter til GraphQL type
    produkter = []
    totalsum = 0.0

    for detalj in ordredetaljer:
        if detalj.produkt:
            produkt_pris = float(detalj.pris) if detalj.pris else 0.0
            produkt_antall = float(detalj.antall) if detalj.antall else 0.0

            produkter.append(Produkt(
                produktid=detalj.produkt.produktid,
                produktnavn=detalj.produkt.produktnavn or "Ukjent produkt",
                pris=produkt_pris,
                antall=produkt_antall,
                enhet=detalj.produkt.pakningstype
            ))

            totalsum += produkt_pris * produkt_antall

    # Returner ordre som GraphQL type
    return Ordre(
        ordreid=ordre_model.ordreid,
        kunde=kunde,
        ordredato=ordre_model.ordredato,
        leveringsdato=ordre_model.leveringsdato,
        produkter=produkter,
        totalsum=totalsum,
        informasjon=ordre_model.informasjon
    )


async def get_kunder(
    db: AsyncSession,
    limit: int = 100,
    offset: int = 0
) -> List[Kunde]:
    """
    Hent liste over kunder.

    Args:
        db: Database session
        limit: Maksimalt antall kunder
        offset: Antall kunder å hoppe over

    Returns:
        Liste med kunde-objekter
    """
    query = select(KunderModel).limit(limit).offset(offset)

    result = await db.execute(query)
    kunder_models = result.scalars().all()

    # Konverter til GraphQL types
    return [
        Kunde(
            kundeid=kunde.kundeid,
            kundenavn=kunde.kundenavn or "",
            adresse=kunde.adresse,
            postnr=kunde.postnr,
            sted=kunde.sted,
            telefonnummer=kunde.telefonnummer,
            e_post=kunde.e_post
        )
        for kunde in kunder_models
    ]


def _get_period_dates(period: str) -> tuple[datetime, datetime]:
    """
    Calculate start and end dates for a given period.

    Args:
        period: Period type (week, month, quarter, year)

    Returns:
        Tuple of (start_date, end_date)
    """
    now = datetime.now()

    if period == "week":
        start_date = now - timedelta(days=7)
    elif period == "quarter":
        start_date = now - timedelta(days=90)
    elif period == "year":
        start_date = now - timedelta(days=365)
    else:  # month (default)
        start_date = now - timedelta(days=30)

    return start_date, now


async def get_quick_stats(db: AsyncSession, period: str = "month") -> QuickStats:
    """
    Get quick overview statistics.

    Args:
        db: Database session
        period: Time period

    Returns:
        QuickStats object
    """
    start_date, end_date = _get_period_dates(period)

    # Current period stats
    current_query = select(
        func.count(OrdrerModel.ordreid).label("order_count"),
        func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("total_revenue")
    ).select_from(OrdrerModel).join(
        OrdredetaljerModel, OrdrerModel.ordreid == OrdredetaljerModel.ordreid
    ).where(
        and_(
            OrdrerModel.ordredato >= start_date,
            OrdrerModel.ordredato <= end_date
        )
    )

    result = await db.execute(current_query)
    current_stats = result.first()

    total_orders = current_stats.order_count or 0
    total_revenue = float(current_stats.total_revenue or 0)

    # Previous period for comparison
    period_diff = end_date - start_date
    prev_start = start_date - period_diff
    prev_end = start_date

    prev_query = select(
        func.count(OrdrerModel.ordreid).label("order_count"),
        func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("total_revenue")
    ).select_from(OrdrerModel).join(
        OrdredetaljerModel, OrdrerModel.ordreid == OrdredetaljerModel.ordreid
    ).where(
        and_(
            OrdrerModel.ordredato >= prev_start,
            OrdrerModel.ordredato < prev_end
        )
    )

    prev_result = await db.execute(prev_query)
    prev_stats = prev_result.first()

    prev_orders = prev_stats.order_count or 0
    prev_revenue = float(prev_stats.total_revenue or 1)

    # Active customers (customers with orders in period)
    active_customers_query = select(
        func.count(func.distinct(OrdrerModel.kundeid))
    ).where(
        and_(
            OrdrerModel.ordredato >= start_date,
            OrdrerModel.ordredato <= end_date
        )
    )

    active_result = await db.execute(active_customers_query)
    active_customers = active_result.scalar() or 0

    # Calculate percentages
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0
    prev_avg = prev_revenue / prev_orders if prev_orders > 0 else 1

    revenue_change = ((total_revenue - prev_revenue) / prev_revenue * 100) if prev_revenue > 0 else 0
    orders_change = ((total_orders - prev_orders) / prev_orders * 100) if prev_orders > 0 else 0
    avg_change = ((avg_order_value - prev_avg) / prev_avg * 100) if prev_avg > 0 else 0

    return QuickStats(
        total_revenue=total_revenue,
        total_orders=total_orders,
        active_customers=active_customers,
        average_order_value=avg_order_value,
        revenue_change_percentage=revenue_change,
        orders_change_percentage=orders_change,
        avg_order_change_percentage=avg_change
    )


async def get_sales_report(db: AsyncSession, period: str = "month") -> SalesReport:
    """
    Get sales report with monthly trends.

    Args:
        db: Database session
        period: Time period

    Returns:
        SalesReport object
    """
    start_date, end_date = _get_period_dates(period)

    # Monthly sales data (last 6 months)
    monthly_data = []
    for i in range(5, -1, -1):
        month_start = end_date - timedelta(days=30 * (i + 1))
        month_end = end_date - timedelta(days=30 * i)

        month_query = select(
            func.count(OrdrerModel.ordreid).label("order_count"),
            func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("total_sales")
        ).select_from(OrdrerModel).join(
            OrdredetaljerModel, OrdrerModel.ordreid == OrdredetaljerModel.ordreid
        ).where(
            and_(
                OrdrerModel.ordredato >= month_start,
                OrdrerModel.ordredato < month_end
            )
        )

        result = await db.execute(month_query)
        month_stats = result.first()

        month_name = month_end.strftime("%b")
        monthly_data.append(SalesDataPoint(
            month=month_name,
            sales=float(month_stats.total_sales or 0),
            orders=month_stats.order_count or 0
        ))

    # Category sales
    category_query = select(
        KategorierModel.kategori,
        func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("total_amount")
    ).select_from(OrdredetaljerModel).join(
        ProdukterModel, OrdredetaljerModel.produktid == ProdukterModel.produktid
    ).join(
        KategorierModel, ProdukterModel.kategoriid == KategorierModel.kategoriid
    ).join(
        OrdrerModel, OrdredetaljerModel.ordreid == OrdrerModel.ordreid
    ).where(
        and_(
            OrdrerModel.ordredato >= start_date,
            OrdrerModel.ordredato <= end_date,
            KategorierModel.kategori.isnot(None)
        )
    ).group_by(KategorierModel.kategori)

    cat_result = await db.execute(category_query)
    categories = cat_result.all()

    total_cat_sales = sum(float(cat.total_amount or 0) for cat in categories)

    category_sales = [
        CategorySales(
            category=cat.kategori or "Ukjent",
            amount=float(cat.total_amount or 0),
            percentage=(float(cat.total_amount or 0) / total_cat_sales * 100) if total_cat_sales > 0 else 0
        )
        for cat in categories
    ]

    # Payment methods (mock data for now - add payment method field to orders if needed)
    payment_methods = [
        PaymentMethodStats(method="Faktura", percentage=78.0),
        PaymentMethodStats(method="Kort", percentage=15.0),
        PaymentMethodStats(method="Kontant", percentage=7.0)
    ]

    return SalesReport(
        monthly_data=monthly_data,
        category_sales=category_sales,
        payment_methods=payment_methods
    )


async def get_product_report(
    db: AsyncSession,
    period: str = "month",
    limit: int = 10
) -> ProductReport:
    """
    Get product report with top sellers.

    Args:
        db: Database session
        period: Time period
        limit: Number of products to return

    Returns:
        ProductReport object
    """
    start_date, end_date = _get_period_dates(period)

    # Top products by revenue
    top_query = select(
        ProdukterModel.produktid,
        ProdukterModel.produktnavn,
        func.sum(OrdredetaljerModel.antall).label("total_quantity"),
        func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("total_revenue")
    ).select_from(OrdredetaljerModel).join(
        ProdukterModel, OrdredetaljerModel.produktid == ProdukterModel.produktid
    ).join(
        OrdrerModel, OrdredetaljerModel.ordreid == OrdrerModel.ordreid
    ).where(
        and_(
            OrdrerModel.ordredato >= start_date,
            OrdrerModel.ordredato <= end_date
        )
    ).group_by(
        ProdukterModel.produktid,
        ProdukterModel.produktnavn
    ).order_by(
        desc("total_revenue")
    ).limit(limit)

    result = await db.execute(top_query)
    products = result.all()

    top_products = [
        TopProduct(
            produktid=prod.produktid,
            produktnavn=prod.produktnavn or "Ukjent produkt",
            quantity=int(prod.total_quantity or 0),
            revenue=float(prod.total_revenue or 0)
        )
        for prod in products
    ]

    return ProductReport(top_products=top_products)


async def get_customer_report(db: AsyncSession, period: str = "month") -> CustomerReport:
    """
    Get customer report with segmentation.

    Args:
        db: Database session
        period: Time period

    Returns:
        CustomerReport object
    """
    start_date, end_date = _get_period_dates(period)

    # Customer segments by group
    segment_query = select(
        KundegruppeModel.gruppe,
        func.count(func.distinct(KunderModel.kundeid)).label("customer_count")
    ).select_from(KunderModel).join(
        KundegruppeModel, KunderModel.gruppeid == KundegruppeModel.gruppeid
    ).where(
        KundegruppeModel.gruppe.isnot(None)
    ).group_by(KundegruppeModel.gruppe)

    seg_result = await db.execute(segment_query)
    segments_data = seg_result.all()

    total_customers = sum(seg.customer_count for seg in segments_data)

    segments = [
        CustomerSegment(
            segment_type=seg.gruppe or "Ukjent",
            count=seg.customer_count,
            percentage=(seg.customer_count / total_customers * 100) if total_customers > 0 else 0
        )
        for seg in segments_data
    ]

    # Customer activity (simplified - based on order frequency)
    # Daily customers (more than 20 orders in period)
    # Weekly customers (5-20 orders in period)
    # Monthly customers (1-4 orders in period)
    # Inactive customers (0 orders in period)

    activity_query = select(
        KunderModel.kundeid,
        func.count(OrdrerModel.ordreid).label("order_count")
    ).select_from(KunderModel).outerjoin(
        OrdrerModel,
        and_(
            KunderModel.kundeid == OrdrerModel.kundeid,
            OrdrerModel.ordredato >= start_date,
            OrdrerModel.ordredato <= end_date
        )
    ).group_by(KunderModel.kundeid)

    act_result = await db.execute(activity_query)
    activity_data = act_result.all()

    daily = sum(1 for a in activity_data if a.order_count > 20)
    weekly = sum(1 for a in activity_data if 5 <= a.order_count <= 20)
    monthly = sum(1 for a in activity_data if 1 <= a.order_count < 5)
    inactive = sum(1 for a in activity_data if a.order_count == 0)

    activity = [
        CustomerActivity(frequency="Daglige kunder", count=daily),
        CustomerActivity(frequency="Ukentlige kunder", count=weekly),
        CustomerActivity(frequency="Månedlige kunder", count=monthly),
        CustomerActivity(frequency="Inaktive kunder", count=inactive)
    ]

    return CustomerReport(segments=segments, activity=activity)


async def get_nutrition_stats(db: AsyncSession, period: str = "month") -> NutritionStats:
    """
    Get nutrition statistics.

    Args:
        db: Database session
        period: Time period

    Returns:
        NutritionStats object
    """
    # This would require joining with matinfo_products table for real data
    # For now, return calculated averages (mock data)
    # TODO: Implement real nutrition data aggregation from matinfo_products

    return NutritionStats(
        calories=485.0,
        protein=22.0,
        carbohydrates=45.0,
        fat=18.0
    )
