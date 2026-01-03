"""GraphQL schema for LKC reporting system."""
import strawberry
from typing import List, Optional
from datetime import datetime


@strawberry.type
class Kunde:
    """GraphQL type for customer data."""
    kundeid: int
    kundenavn: str
    adresse: Optional[str]
    postnr: Optional[str]
    sted: Optional[str]
    telefonnummer: Optional[str]
    e_post: Optional[str]


@strawberry.type
class Produkt:
    """GraphQL type for product data in an order."""
    produktid: int
    produktnavn: str
    pris: float
    antall: float
    enhet: Optional[str]


@strawberry.type
class Ordre:
    """GraphQL type for order data."""
    ordreid: int
    kunde: Kunde
    ordredato: datetime
    leveringsdato: Optional[datetime]
    produkter: List[Produkt]
    totalsum: float
    informasjon: Optional[str]


# Report types for analytics


@strawberry.type
class SalesDataPoint:
    """Monthly sales data point."""
    month: str
    sales: float
    orders: int


@strawberry.type
class CategorySales:
    """Sales data per category."""
    category: str
    amount: float
    percentage: float


@strawberry.type
class PaymentMethodStats:
    """Payment method statistics."""
    method: str
    percentage: float


@strawberry.type
class SalesReport:
    """Sales report with trend data and breakdowns."""
    monthly_data: List[SalesDataPoint]
    category_sales: List[CategorySales]
    payment_methods: List[PaymentMethodStats]


@strawberry.type
class TopProduct:
    """Top selling product data."""
    produktid: int
    produktnavn: str
    quantity: int
    revenue: float


@strawberry.type
class ProductReport:
    """Product performance report."""
    top_products: List[TopProduct]


@strawberry.type
class CustomerSegment:
    """Customer segmentation data."""
    segment_type: str
    count: int
    percentage: float


@strawberry.type
class CustomerActivity:
    """Customer activity frequency."""
    frequency: str
    count: int


@strawberry.type
class CustomerReport:
    """Customer analytics report."""
    segments: List[CustomerSegment]
    activity: List[CustomerActivity]


@strawberry.type
class NutritionStats:
    """Average nutrition statistics."""
    calories: float
    protein: float
    carbohydrates: float
    fat: float


@strawberry.type
class AiReportResult:
    """AI-generated report result."""
    html: str
    insights: str
    period: str
    total_orders: int
    total_revenue: float


@strawberry.type
class QuickStats:
    """Quick overview statistics."""
    total_revenue: float
    total_orders: int
    active_customers: int
    average_order_value: float
    revenue_change_percentage: float
    orders_change_percentage: float
    avg_order_change_percentage: float


@strawberry.type
class Query:
    """GraphQL query root."""

    @strawberry.field
    async def ordre(self, info: strawberry.Info, ordre_id: int) -> Optional[Ordre]:
        """
        Hent en enkelt ordre med produkter og kunde.

        Args:
            ordre_id: ID på ordren som skal hentes

        Returns:
            Ordre-objekt med produkter og kunde, eller None hvis ikke funnet
        """
        # Implementeres i resolvers
        from app.graphql.resolvers import get_ordre
        return await get_ordre(ordre_id, info.context["db"])

    @strawberry.field
    async def kunder(self, info: strawberry.Info, limit: int = 100, offset: int = 0) -> List[Kunde]:
        """
        Hent liste over kunder.

        Args:
            limit: Maksimalt antall kunder å hente (default: 100)
            offset: Antall kunder å hoppe over (default: 0)

        Returns:
            Liste med kunde-objekter
        """
        from app.graphql.resolvers import get_kunder
        return await get_kunder(info.context["db"], limit=limit, offset=offset)

    # Report queries

    @strawberry.field
    async def quick_stats(
        self,
        info: strawberry.Info,
        period: Optional[str] = "month"
    ) -> QuickStats:
        """
        Hent hurtigstatistikk for dashboard.

        Args:
            period: Tidsperiode (week, month, quarter, year)

        Returns:
            QuickStats objekt med oversiktsdata
        """
        from app.graphql.resolvers import get_quick_stats
        return await get_quick_stats(info.context["db"], period)

    @strawberry.field
    async def sales_report(
        self,
        info: strawberry.Info,
        period: Optional[str] = "month"
    ) -> SalesReport:
        """
        Hent salgsrapport med trenddata.

        Args:
            period: Tidsperiode (week, month, quarter, year)

        Returns:
            SalesReport med månedlig data og kategorier
        """
        from app.graphql.resolvers import get_sales_report
        return await get_sales_report(info.context["db"], period)

    @strawberry.field
    async def product_report(
        self,
        info: strawberry.Info,
        period: Optional[str] = "month",
        limit: int = 10
    ) -> ProductReport:
        """
        Hent produktrapport med toppselgere.

        Args:
            period: Tidsperiode (week, month, quarter, year)
            limit: Antall produkter å hente (default: 10)

        Returns:
            ProductReport med topp produkter
        """
        from app.graphql.resolvers import get_product_report
        return await get_product_report(info.context["db"], period, limit)

    @strawberry.field
    async def customer_report(
        self,
        info: strawberry.Info,
        period: Optional[str] = "month"
    ) -> CustomerReport:
        """
        Hent kunderapport med segmentering.

        Args:
            period: Tidsperiode (week, month, quarter, year)

        Returns:
            CustomerReport med segmenter og aktivitet
        """
        from app.graphql.resolvers import get_customer_report
        return await get_customer_report(info.context["db"], period)

    @strawberry.field
    async def nutrition_stats(
        self,
        info: strawberry.Info,
        period: Optional[str] = "month"
    ) -> NutritionStats:
        """
        Hent ernæringsstatistikk.

        Args:
            period: Tidsperiode (week, month, quarter, year)

        Returns:
            NutritionStats med gjennomsnittsverdier
        """
        from app.graphql.resolvers import get_nutrition_stats
        return await get_nutrition_stats(info.context["db"], period)


@strawberry.type
class Mutation:
    """GraphQL mutation root."""

    @strawberry.field
    async def generate_ai_report(
        self,
        info: strawberry.Info,
        period: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        report_type: Optional[str] = "sales",
        data_sources: Optional[List[str]] = None,
        custom_prompt: Optional[str] = None
    ) -> AiReportResult:
        """
        Generate AI-powered HTML report using GPT-4.

        Args:
            period: Tidsperiode (week, month, quarter, year) - ignored if start_date/end_date provided
            start_date: Custom start date (YYYY-MM-DD format)
            end_date: Custom end date (YYYY-MM-DD format)
            report_type: Rapport type (sales, products, customers)
            data_sources: Liste over datakilder å inkludere (sales, products, customers, categories, nutrition)
            custom_prompt: Ekstra instruksjoner til AI

        Returns:
            AiReportResult med HTML og innsikter
        """
        from app.services.ai_report_service import AIReportService

        service = AIReportService()
        result = await service.generate_html_report(
            db=info.context["db"],
            period=period or "month",
            start_date=start_date,
            end_date=end_date,
            report_type=report_type,
            data_sources=data_sources or ["sales", "products"],
            custom_prompt=custom_prompt
        )

        return AiReportResult(
            html=result["html"],
            insights=result["insights"],
            period=result["data_summary"]["period"],
            total_orders=result["data_summary"]["total_orders"],
            total_revenue=result["data_summary"]["total_revenue"]
        )


# Create GraphQL schema
schema = strawberry.Schema(query=Query, mutation=Mutation)
