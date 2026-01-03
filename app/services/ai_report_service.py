"""AI-powered report generation service using GPT-4."""
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
import openai

from app.core.config import settings
from app.models.ordrer import Ordrer as OrdrerModel
from app.models.ordredetaljer import Ordredetaljer as OrdredetaljerModel
from app.models.kunder import Kunder as KunderModel
from app.models.produkter import Produkter as ProdukterModel
from app.models.kategorier import Kategorier as KategorierModel
from app.models.leverandorer import Leverandorer as LeverandorerModel


class AIReportService:
    """Service for AI-powered report generation with HTML output."""

    def __init__(self):
        """Initialize OpenAI client."""
        self.client = openai.OpenAI(
            api_key=settings.OPENAI_API_KEY
        )
        self.model = settings.OPENAI_MODEL

    def _get_period_dates(self, period: str) -> tuple[datetime, datetime]:
        """Calculate start and end dates for a given period."""
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

    async def _fetch_sales_data(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Fetch sales data from database."""
        # Total sales and orders
        sales_query = select(
            func.count(OrdrerModel.ordreid).label("total_orders"),
            func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("total_revenue")
        ).select_from(OrdrerModel).join(
            OrdredetaljerModel, OrdrerModel.ordreid == OrdredetaljerModel.ordreid
        ).where(
            and_(
                OrdrerModel.ordredato >= start_date,
                OrdrerModel.ordredato <= end_date
            )
        )

        result = await db.execute(sales_query)
        sales = result.first()

        # Top products
        top_products_query = select(
            ProdukterModel.produktnavn,
            func.sum(OrdredetaljerModel.antall).label("quantity"),
            func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("revenue")
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
            ProdukterModel.produktnavn
        ).order_by(
            desc("revenue")
        ).limit(10)

        top_products_result = await db.execute(top_products_query)
        top_products = [
            {
                "name": p.produktnavn or "Ukjent",
                "quantity": int(p.quantity or 0),
                "revenue": float(p.revenue or 0)
            }
            for p in top_products_result.all()
        ]

        # Category breakdown
        category_query = select(
            KategorierModel.kategori,
            func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("revenue")
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
        ).group_by(
            KategorierModel.kategori
        )

        category_result = await db.execute(category_query)
        categories = [
            {
                "category": c.kategori or "Ukjent",
                "revenue": float(c.revenue or 0)
            }
            for c in category_result.all()
        ]

        # Top customers
        top_customers_query = select(
            KunderModel.kundenavn,
            func.count(OrdrerModel.ordreid).label("order_count"),
            func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("revenue")
        ).select_from(OrdrerModel).join(
            KunderModel, OrdrerModel.kundeid == KunderModel.kundeid
        ).join(
            OrdredetaljerModel, OrdrerModel.ordreid == OrdredetaljerModel.ordreid
        ).where(
            and_(
                OrdrerModel.ordredato >= start_date,
                OrdrerModel.ordredato <= end_date
            )
        ).group_by(
            KunderModel.kundenavn
        ).order_by(
            desc("revenue")
        ).limit(10)

        top_customers_result = await db.execute(top_customers_query)
        top_customers = [
            {
                "name": c.kundenavn or "Ukjent",
                "orders": int(c.order_count or 0),
                "revenue": float(c.revenue or 0)
            }
            for c in top_customers_result.all()
        ]

        return {
            "total_orders": sales.total_orders or 0,
            "total_revenue": float(sales.total_revenue or 0),
            "top_products": top_products,
            "categories": categories,
            "top_customers": top_customers,
            "period_start": start_date.strftime("%Y-%m-%d"),
            "period_end": end_date.strftime("%Y-%m-%d")
        }

    async def _fetch_nutrition_data(
        self,
        db: AsyncSession,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Fetch nutrition statistics for the period."""
        try:
            # This would require nutrition data in your database
            # For now, return placeholder data
            return {
                "avg_calories": 0,
                "avg_protein": 0,
                "avg_carbs": 0,
                "avg_fat": 0
            }
        except Exception:
            return {
                "avg_calories": 0,
                "avg_protein": 0,
                "avg_carbs": 0,
                "avg_fat": 0
            }

    async def generate_html_report(
        self,
        db: AsyncSession,
        period: str = "month",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        report_type: str = "sales",
        data_sources: list[str] = ["sales", "products"],
        custom_prompt: Optional[str] = None
    ) -> Dict[str, str]:
        """
        Generate HTML report using GPT-4.

        Args:
            db: Database session
            period: Time period (week, month, quarter, year)
            start_date: Custom start date (YYYY-MM-DD) - overrides period
            end_date: Custom end date (YYYY-MM-DD) - overrides period
            report_type: Type of report (sales, products, customers)
            data_sources: List of data sources to include
            custom_prompt: Optional custom instructions for AI

        Returns:
            Dict with 'html' and 'insights' keys
        """
        # Determine date range
        if start_date and end_date:
            # Use custom dates
            from datetime import datetime
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        else:
            # Use period
            start_dt, end_dt = self._get_period_dates(period)

        # Fetch data based on selected data sources
        data = await self._fetch_sales_data(db, start_dt, end_dt)

        # Add additional data based on data_sources
        if "nutrition" in data_sources:
            data["nutrition"] = await self._fetch_nutrition_data(db, start_dt, end_dt)

        # Build prompt for GPT-4
        system_prompt = """Du er en ekspert på data-analyse og rapport-generering for catering-virksomheter.
Din oppgave er å analysere data og generere en profesjonell HTML-rapport.

VIKTIG:
1. Generer KOMPLETT HTML med inline CSS (bruk Tailwind-lignende farger)
2. Inkluder <html>, <head>, og <body> tags
3. Lag responsivt design som fungerer på alle skjermer
4. Bruk norsk språk
5. Inkluder grafer og visualiseringer med CSS (ikke eksterne biblioteker)
6. Gi innsiktsfulle analyser og anbefalinger
7. Bruk moderne, profesjonelt design
8. Inkluder tabeller, kort (cards), og statistikk-widgets
"""

        # Build dynamic data sections based on selected data sources
        data_sections = []

        if "sales" in data_sources:
            data_sections.append(f"""SALGSDATA:
- Totalt antall ordrer: {data['total_orders']}
- Total omsetning: kr {data['total_revenue']:,.2f}""")

        if "products" in data_sources and data.get('top_products'):
            data_sections.append(f"""TOPP 10 PRODUKTER:
{self._format_list(data['top_products'], lambda p: f"{p['name']}: {p['quantity']} solgt, kr {p['revenue']:,.2f}")}""")

        if "categories" in data_sources and data.get('categories'):
            data_sections.append(f"""KATEGORIER:
{self._format_list(data['categories'], lambda c: f"{c['category']}: kr {c['revenue']:,.2f}")}""")

        if "customers" in data_sources and data.get('top_customers'):
            data_sections.append(f"""TOPP 10 KUNDER:
{self._format_list(data['top_customers'], lambda c: f"{c['name']}: {c['orders']} ordrer, kr {c['revenue']:,.2f}")}""")

        if "nutrition" in data_sources and data.get('nutrition'):
            nutrition = data['nutrition']
            data_sections.append(f"""ERNÆRINGSDATA:
- Gjennomsnittlig kalorier: {nutrition.get('avg_calories', 0)} kcal
- Gjennomsnittlig protein: {nutrition.get('avg_protein', 0)}g
- Gjennomsnittlig karbohydrater: {nutrition.get('avg_carbs', 0)}g
- Gjennomsnittlig fett: {nutrition.get('avg_fat', 0)}g""")

        user_prompt = f"""Generer en komplett HTML-rapport basert på følgende data fra Larvik Kommune Catering:

PERIODE: {data['period_start']} til {data['period_end']}

{chr(10).join(data_sections)}

{f'EKSTRA INSTRUKSJONER: {custom_prompt}' if custom_prompt else ''}

Generer en profesjonell HTML-rapport med:
1. Header med logo-område og tittel
2. Executive Summary (kort oppsummering)
3. Nøkkeltall i kort/widgets
4. Detaljerte seksjoner basert på tilgjengelige data
5. Visualiseringer (bruk CSS for bar charts, donut charts etc)
6. Analyser og anbefalinger
7. Footer med generert tidspunkt

Svar BARE med HTML-koden, ingen ekstra forklaring."""

        try:
            # Call GPT-4
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )

            html_content = response.choices[0].message.content.strip()

            # Generate insights separately
            insights_prompt = f"""Basert på dataene fra Larvik Kommune Catering ({data['period_start']} til {data['period_end']}),
gi 3-5 konkrete innsikter og anbefalinger på norsk.
Vær spesifikk og handlingsrettet.

Data:
- {data['total_orders']} ordrer
- kr {data['total_revenue']:,.2f} i omsetning
- Topp produkt: {data['top_products'][0]['name'] if data['top_products'] else 'N/A'}
- Topp kunde: {data['top_customers'][0]['name'] if data['top_customers'] else 'N/A'}"""

            insights_response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "Du er en business analyst for catering-bransjen."},
                    {"role": "user", "content": insights_prompt}
                ],
                temperature=0.8,
                max_tokens=500
            )

            insights = insights_response.choices[0].message.content.strip()

            return {
                "html": html_content,
                "insights": insights,
                "data_summary": {
                    "period": f"{data['period_start']} - {data['period_end']}",
                    "total_orders": data['total_orders'],
                    "total_revenue": data['total_revenue']
                }
            }

        except Exception as e:
            # Fallback HTML if AI fails
            fallback_html = self._generate_fallback_html(data)
            return {
                "html": fallback_html,
                "insights": f"Kunne ikke generere AI-analyse: {str(e)}",
                "data_summary": {
                    "period": f"{data['period_start']} - {data['period_end']}",
                    "total_orders": data['total_orders'],
                    "total_revenue": data['total_revenue']
                }
            }

    def _format_list(self, items: list, formatter) -> str:
        """Format list items for prompt."""
        return "\n".join([f"  - {formatter(item)}" for item in items])

    def _generate_fallback_html(self, data: Dict[str, Any]) -> str:
        """Generate simple fallback HTML if AI fails."""
        return f"""
<!DOCTYPE html>
<html lang="no">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rapport - Larvik Kommune Catering</title>
    <style>
        body {{ font-family: Arial, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #2563eb; }}
        .card {{ background: #f9fafb; padding: 20px; margin: 10px 0; border-radius: 8px; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
        th {{ background: #f3f4f6; font-weight: bold; }}
    </style>
</head>
<body>
    <h1>Salgsrapport</h1>
    <p>Periode: {data['period_start']} til {data['period_end']}</p>

    <div class="card">
        <h2>Nøkkeltall</h2>
        <p><strong>Totalt antall ordrer:</strong> {data['total_orders']}</p>
        <p><strong>Total omsetning:</strong> kr {data['total_revenue']:,.2f}</p>
    </div>

    <h2>Topp Produkter</h2>
    <table>
        <thead>
            <tr><th>Produkt</th><th>Antall</th><th>Omsetning</th></tr>
        </thead>
        <tbody>
            {''.join([f"<tr><td>{p['name']}</td><td>{p['quantity']}</td><td>kr {p['revenue']:,.2f}</td></tr>" for p in data['top_products'][:10]])}
        </tbody>
    </table>
</body>
</html>
"""
