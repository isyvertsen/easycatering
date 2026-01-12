# Hvordan Bygge En Ny Rapport - Step-by-Step Guide

Dette er en komplett guide for å legge til en ny rapport i LKC systemet med GraphQL.

## 📋 Eksempel: Lag en "Leverandør Rapport"

La oss lage en rapport som viser statistikk om leverandører og deres produkter.

---

## Del 1: Backend (FastAPI + GraphQL)

### Steg 1: Definer GraphQL Types i Schema

Åpne: `LKCserver-backend/app/graphql/schema.py`

Legg til nye types **før** `Query` klassen:

```python
@strawberry.type
class SupplierStats:
    """Leverandør statistikk."""
    supplier_id: int
    supplier_name: str
    total_products: int
    total_orders: int
    total_revenue: float
    average_product_price: float


@strawberry.type
class SupplierReport:
    """Leverandør rapport."""
    total_suppliers: int
    active_suppliers: int
    top_suppliers: List[SupplierStats]
```

### Steg 2: Legg til Query i Schema

I samme fil, legg til query i `Query` klassen:

```python
@strawberry.type
class Query:
    """GraphQL query root."""

    # ... eksisterende queries ...

    @strawberry.field
    async def supplier_report(
        self,
        info: strawberry.Info,
        period: Optional[str] = "month",
        limit: int = 10
    ) -> SupplierReport:
        """
        Hent leverandørrapport.

        Args:
            period: Tidsperiode (week, month, quarter, year)
            limit: Antall leverandører å vise (default: 10)

        Returns:
            SupplierReport med statistikk
        """
        from app.graphql.resolvers import get_supplier_report
        return await get_supplier_report(info.context["db"], period, limit)
```

### Steg 3: Implementer Resolver

Åpne: `LKCserver-backend/app/graphql/resolvers.py`

Importer types øverst i filen:

```python
from app.graphql.schema import (
    # ... eksisterende imports ...
    SupplierReport, SupplierStats
)

# Importer også leverandør model
from app.models.leverandorer import Leverandorer as LeverandorerModel
```

Legg til resolver-funksjonen nederst i filen:

```python
async def get_supplier_report(
    db: AsyncSession,
    period: str = "month",
    limit: int = 10
) -> SupplierReport:
    """
    Hent leverandørrapport.

    Args:
        db: Database session
        period: Time period
        limit: Number of suppliers to return

    Returns:
        SupplierReport object
    """
    start_date, end_date = _get_period_dates(period)

    # Total antall leverandører
    total_query = select(func.count(LeverandorerModel.leverandorid))
    total_result = await db.execute(total_query)
    total_suppliers = total_result.scalar() or 0

    # Aktive leverandører (med produkter)
    active_query = select(
        func.count(func.distinct(ProdukterModel.levrandorid))
    ).where(
        ProdukterModel.levrandorid.isnot(None)
    )
    active_result = await db.execute(active_query)
    active_suppliers = active_result.scalar() or 0

    # Topp leverandører basert på omsetning
    top_query = select(
        LeverandorerModel.leverandorid,
        LeverandorerModel.leverandornavn,
        func.count(func.distinct(ProdukterModel.produktid)).label("product_count"),
        func.count(func.distinct(OrdredetaljerModel.ordreid)).label("order_count"),
        func.sum(OrdredetaljerModel.pris * OrdredetaljerModel.antall).label("revenue"),
        func.avg(ProdukterModel.pris).label("avg_price")
    ).select_from(LeverandorerModel).join(
        ProdukterModel, LeverandorerModel.leverandorid == ProdukterModel.levrandorid
    ).outerjoin(
        OrdredetaljerModel, ProdukterModel.produktid == OrdredetaljerModel.produktid
    ).outerjoin(
        OrdrerModel, OrdredetaljerModel.ordreid == OrdrerModel.ordreid
    ).where(
        and_(
            OrdrerModel.ordredato >= start_date,
            OrdrerModel.ordredato <= end_date
        ) if OrdrerModel.ordredato else True
    ).group_by(
        LeverandorerModel.leverandorid,
        LeverandorerModel.leverandornavn
    ).order_by(
        desc("revenue")
    ).limit(limit)

    top_result = await db.execute(top_query)
    suppliers = top_result.all()

    top_suppliers = [
        SupplierStats(
            supplier_id=sup.leverandorid,
            supplier_name=sup.leverandornavn or "Ukjent",
            total_products=sup.product_count or 0,
            total_orders=sup.order_count or 0,
            total_revenue=float(sup.revenue or 0),
            average_product_price=float(sup.avg_price or 0)
        )
        for sup in suppliers
    ]

    return SupplierReport(
        total_suppliers=total_suppliers,
        active_suppliers=active_suppliers,
        top_suppliers=top_suppliers
    )
```

### Steg 4: Test GraphQL Query

Restart backend (eller vent på auto-reload), deretter test i GraphQL Playground:

`http://localhost:8000/api/v1/graphql`

```graphql
query {
  supplierReport(period: "month", limit: 5) {
    totalSuppliers
    activeSuppliers
    topSuppliers {
      supplierId
      supplierName
      totalProducts
      totalOrders
      totalRevenue
      averageProductPrice
    }
  }
}
```

---

## Del 2: Frontend (Next.js + urql)

### Steg 5: Lag GraphQL Query Fil

Opprett: `LKCserver-frontend/src/lib/graphql/queries/supplier-report.graphql`

```graphql
query GetSupplierReport($period: String, $limit: Int) {
  supplierReport(period: $period, limit: $limit) {
    totalSuppliers
    activeSuppliers
    topSuppliers {
      supplierId
      supplierName
      totalProducts
      totalOrders
      totalRevenue
      averageProductPrice
    }
  }
}
```

### Steg 6: Generer TypeScript Types

Kjør code generator:

```bash
cd LKCserver-frontend
npm run codegen
```

Dette genererer automatisk:
- TypeScript types for `SupplierReport`
- Hook: `useGetSupplierReportQuery()`
- Alt i: `src/lib/graphql/generated.ts`

### Steg 7: Lag Rapport Komponent

Opprett: `LKCserver-frontend/src/app/reports/suppliers/page.tsx`

```tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2 } from "lucide-react"
import { useGetSupplierReportQuery } from "@/lib/graphql/generated"

export default function SupplierReportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month")

  // GraphQL Query med urql
  const [result] = useGetSupplierReportQuery({
    variables: { period: selectedPeriod, limit: 10 }
  })

  const { data, fetching, error } = result

  if (error) {
    return (
      <div className="p-6">
        <p className="text-red-600">Feil ved lasting av data: {error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leverandør Rapport</h1>
          <p className="text-gray-500 mt-2">Statistikk om leverandører og produkter</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Denne uken</SelectItem>
            <SelectItem value="month">Denne måneden</SelectItem>
            <SelectItem value="quarter">Dette kvartalet</SelectItem>
            <SelectItem value="year">Dette året</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Totalt Leverandører
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.supplierReport?.totalSuppliers || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Aktive Leverandører
            </CardTitle>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            ) : (
              <div className="text-2xl font-bold">
                {data?.supplierReport?.activeSuppliers || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Leverandører */}
      <Card>
        <CardHeader>
          <CardTitle>Topp Leverandører</CardTitle>
          <CardDescription>Rangert etter omsetning</CardDescription>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-4">
              {data?.supplierReport?.topSuppliers?.map((supplier, index) => (
                <div
                  key={supplier.supplierId}
                  className="flex items-center justify-between p-4 rounded-lg hover:bg-gray-50 border"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-lg">{supplier.supplierName}</p>
                      <p className="text-sm text-gray-600">
                        {supplier.totalProducts} produkter • {supplier.totalOrders} ordrer
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">
                      kr {supplier.totalRevenue.toLocaleString('nb-NO', { maximumFractionDigits: 0 })}
                    </p>
                    <p className="text-sm text-gray-600">
                      Snitt pris: kr {supplier.averageProductPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

### Steg 8: Legg til Navigasjon

Oppdater: `LKCserver-frontend/src/app/reports/page.tsx`

Legg til et kort som lenker til den nye rapporten:

```tsx
<Card
  className="hover:shadow-lg transition-shadow cursor-pointer"
  onClick={() => window.location.href = '/reports/suppliers'}
>
  <CardHeader>
    <div className="flex items-center justify-between">
      <Package className="h-8 w-8 text-purple-600" />
    </div>
  </CardHeader>
  <CardContent>
    <CardTitle className="text-lg">Leverandør Rapport</CardTitle>
    <CardDescription className="mt-2">
      Se statistikk om leverandører, produkter og omsetning
    </CardDescription>
  </CardContent>
</Card>
```

---

## 🎯 Fullstendig Arbeidsflyt

```bash
# 1. Backend
cd LKCserver-backend
# Rediger schema.py - legg til types
# Rediger resolvers.py - legg til resolver
# Test i GraphQL Playground

# 2. Frontend
cd LKCserver-frontend
# Lag .graphql fil
npm run codegen  # Generer types
# Lag page.tsx komponent
npm run dev      # Start og test

# 3. Åpne i nettleser
http://localhost:3000/reports/suppliers
```

---

## 💡 Tips og Best Practices

### 1. **Bruk Existing Patterns**
Se på eksisterende rapporter:
- `app/graphql/schema.py` - for type-eksempler
- `app/graphql/resolvers.py` - for query-eksempler
- `src/app/reports/page.tsx` - for UI-eksempler

### 2. **Optimaliser Database Queries**
```python
# GODT: Eager loading
query = select(Model).options(
    selectinload(Model.relation)
)

# DÅRLIG: N+1 problem
for item in items:
    item.relation  # Henter én og én
```

### 3. **Håndter Errors**
```tsx
const [result] = useGetSupplierReportQuery(...)
const { data, fetching, error } = result

if (error) return <ErrorDisplay error={error} />
if (fetching) return <LoadingSpinner />
```

### 4. **Type Safety**
All data er type-safe takket være GraphQL Code Generator:
```tsx
// TypeScript vet automatisk alle feltene
data?.supplierReport?.topSuppliers.map(supplier => {
  supplier.supplierName // ✓ Type-sjekket
  supplier.invalid      // ✗ Compile error
})
```

### 5. **Caching med urql**
urql cacher automatisk queries:
```tsx
// Første gang: henter fra server
const [result1] = useGetSupplierReportQuery({ variables: { period: "month" }})

// Andre gang med samme variables: fra cache
const [result2] = useGetSupplierReportQuery({ variables: { period: "month" }})
```

---

## 🔄 Avanserte Features

### Mutations (for å generere/lagre rapporter)

**Schema:**
```python
@strawberry.type
class Mutation:
    @strawberry.field
    async def generate_supplier_pdf(
        self, info: strawberry.Info, period: str
    ) -> str:
        """Generer PDF rapport."""
        # Implementer PDF generering
        return "report_url"
```

**Frontend:**
```tsx
const [_, generatePdf] = useGenerateSupplierPdfMutation()

const handleExport = async () => {
  const result = await generatePdf({ period: "month" })
  window.open(result.data.generateSupplierPdf)
}
```

### Real-time Updates med Subscriptions

```python
@strawberry.type
class Subscription:
    @strawberry.subscription
    async def supplier_updates(self) -> AsyncGenerator[SupplierStats, None]:
        # Stream updates
        yield stats
```

---

## 📚 Ressurser

- **GraphQL Playground:** `http://localhost:8000/api/v1/graphql`
- **API Docs:** `http://localhost:8000/api/docs`
- **Strawberry Docs:** https://strawberry.rocks/docs
- **urql Docs:** https://formidable.com/open-source/urql/docs/

---

## ✅ Sjekkliste for Ny Rapport

- [ ] Definer GraphQL types i `schema.py`
- [ ] Legg til query i `Query` klassen
- [ ] Implementer resolver i `resolvers.py`
- [ ] Test i GraphQL Playground
- [ ] Lag `.graphql` query fil
- [ ] Kjør `npm run codegen`
- [ ] Lag rapport page komponent
- [ ] Legg til navigasjon/lenke
- [ ] Test i nettleser
- [ ] Verifiser data, loading states, og error handling

God luck! 🚀
