# GraphQL Rapport Generator - Setup Guide

## ✅ Hva er ferdig implementert

### Backend (FastAPI + Strawberry GraphQL)

1. **GraphQL Schema** (`LKCserver-backend/app/graphql/schema.py`)
   - Nye GraphQL types:
     - `QuickStats` - Hurtigstatistikk (omsetning, ordrer, kunder)
     - `SalesReport` - Salgsrapport med månedlig data
     - `ProductReport` - Topp produkter
     - `CustomerReport` - Kundesegmentering og aktivitet
     - `NutritionStats` - Ernæringsstatistikk

2. **GraphQL Resolvers** (`LKCserver-backend/app/graphql/resolvers.py`)
   - `get_quick_stats()` - Henter oversiktsstatistikk
   - `get_sales_report()` - Henter salgsdata med trendanalyse
   - `get_product_report()` - Henter topp-selgere
   - `get_customer_report()` - Henter kundeanalyse
   - `get_nutrition_stats()` - Henter ernæringsdata (TODO: koble til matinfo_products)

3. **GraphQL Queries**
   - `quickStats(period: String)` - Filter på periode (week, month, quarter, year)
   - `salesReport(period: String)` - Salgsrapport for periode
   - `productReport(period: String, limit: Int)` - Produktrapport
   - `customerReport(period: String)` - Kunderapport
   - `nutritionStats(period: String)` - Ernæringsstatistikk

### Frontend (Next.js + urql)

1. **GraphQL Client Setup**
   - `client.ts` - urql client konfigurert med autentisering
   - `provider.tsx` - GraphQLProvider wrapper
   - Lagt til i `app/providers.tsx`

2. **GraphQL Queries** (`src/lib/graphql/queries/reports.graphql`)
   - GetQuickStats
   - GetSalesReport
   - GetProductReport
   - GetCustomerReport
   - GetNutritionStats

3. **Code Generator Setup** (`codegen.yml`)
   - Konfigurert for TypeScript + urql hooks
   - Genererer type-sikre hooks automatisk

4. **Reports Dashboard** (`src/app/reports/page.tsx`)
   - Oppdatert til å bruke GraphQL queries i stedet for mock data
   - Loading states implementert
   - Dynamisk periode-filter (week, month, quarter, year)

## 🚀 Neste Steg - Slik starter du systemet

### 1. Installer Frontend Dependencies

```bash
cd LKCserver-frontend
npm install
```

Dette installerer:
- `@graphql-codegen/cli`
- `@graphql-codegen/typescript`
- `@graphql-codegen/typescript-operations`
- `@graphql-codegen/typescript-urql`

### 2. Start Backend Server

```bash
cd LKCserver-backend
./scripts/start-dev.sh
```

Backend må kjøre på port 8000 for at GraphQL schema skal være tilgjengelig.

### 3. Kjør GraphQL Code Generator

Når backend kjører, generer TypeScript types:

```bash
cd LKCserver-frontend
npm run codegen
```

Dette vil:
- Hente GraphQL schema fra `http://localhost:8000/api/v1/graphql`
- Generere TypeScript types basert på queries i `src/lib/graphql/queries/*.graphql`
- Lage type-sikre urql hooks i `src/lib/graphql/generated.ts`
- Overskrive placeholder-filen med ekte types

### 4. Start Frontend Server

```bash
cd LKCserver-frontend
npm run dev
```

Frontend starter på port 3000.

### 5. Test Rapport Dashboard

Gå til: `http://localhost:3000/reports`

Du skal nå se:
- Ekte data fra databasen i stedet for mock data
- Dynamisk periode-filter (week, month, quarter, year)
- Quick stats: Omsetning, ordrer, aktive kunder, gjennomsnittlig ordre
- Sales report: Månedlig trenddata, kategorifordeling, betalingsmetoder
- Product report: Topp 10 produkter
- Customer report: Kundesegmentering, aktivitetsfrekvens
- Nutrition stats: Gjennomsnittlig ernæringsinfo

## 📊 GraphQL Playground

Test queries direkte i GraphQL Playground:
`http://localhost:8000/api/v1/graphql`

### Eksempel Query:

```graphql
query {
  quickStats(period: "month") {
    totalRevenue
    totalOrders
    activeCustomers
    averageOrderValue
    revenueChangePercentage
    ordersChangePercentage
    avgOrderChangePercentage
  }

  salesReport(period: "month") {
    monthlyData {
      month
      sales
      orders
    }
    categorySales {
      category
      amount
      percentage
    }
  }

  productReport(period: "month", limit: 5) {
    topProducts {
      produktid
      produktnavn
      quantity
      revenue
    }
  }
}
```

## 🔄 Development Workflow

### Watch Mode for Code Generator

Under utvikling kan du kjøre codegen i watch-modus:

```bash
npm run codegen:watch
```

Dette regenererer types automatisk når du endrer `.graphql` filer.

### Legge til Nye Queries

1. Definer query i backend (`app/graphql/schema.py`)
2. Implementer resolver i backend (`app/graphql/resolvers.py`)
3. Lag `.graphql` fil i frontend (`src/lib/graphql/queries/*.graphql`)
4. Kjør `npm run codegen`
5. Bruk den genererte hooken i komponenten

## ⚠️ TODO - Forbedringer

### Backend:
1. **Nutrition Stats**: Implementer ekte data fra `matinfo_products` tabell
2. **Caching**: Legg til Redis caching for tunge queries
3. **Pagination**: Legg til cursor-based pagination for store datasett
4. **Error Handling**: Forbedre error handling i resolvers
5. **Authorization**: Legg til rolle-basert tilgangskontroll

### Frontend:
6. **Error States**: Legg til error boundaries og error meldinger
7. **Export Functionality**: Koble "Eksporter" knapper til PDF/Excel/CSV endpoints
8. **Date Range Picker**: Legg til custom date range i tillegg til forhåndsdefinerte perioder
9. **Real-time Updates**: Vurder GraphQL subscriptions for live data
10. **Charts**: Bruk ekte chart library (Recharts, Chart.js) for bedre visualisering

### Mutations:
11. **PDF Generation**: Implementer GraphQL mutations for rapport-generering
12. **Report Templates**: CRUD operasjoner for egendefinerte rapport-maler

## 📝 Fil Oversikt

### Backend
```
LKCserver-backend/
├── app/
│   └── graphql/
│       ├── schema.py           # GraphQL types og queries
│       ├── resolvers.py        # Resolver funksjoner
│       └── __init__.py
```

### Frontend
```
LKCserver-frontend/
├── src/
│   ├── lib/
│   │   └── graphql/
│   │       ├── client.ts       # urql client config
│   │       ├── provider.tsx    # GraphQL provider wrapper
│   │       ├── generated.ts    # Auto-genererte types og hooks
│   │       └── queries/
│   │           └── reports.graphql  # GraphQL queries
│   └── app/
│       ├── providers.tsx       # Root providers (inkl. GraphQL)
│       └── reports/
│           └── page.tsx        # Reports dashboard
├── codegen.yml                 # Code generator config
└── package.json                # Dependencies + scripts
```

## 🐛 Troubleshooting

### "Cannot query field X on type Y"
- Backend schema er ikke oppdatert eller backend kjører ikke
- Kjør `npm run codegen` på nytt

### "Module not found: @/lib/graphql/generated"
- Codegen har ikke kjørt ennå
- Kjør `npm install && npm run codegen`

### "Network request failed"
- Backend kjører ikke på port 8000
- Sjekk `NEXT_PUBLIC_API_URL` i `.env`

### Ingen data vises
- Database er tom eller har lite data
- Kjør test data seeding: `uv run python tests/seed_data.py`

## 🎉 Suksess!

Når alt fungerer skal du se ekte rapportdata i dashboard med:
- Live data fra PostgreSQL database
- Type-sikkerhet på alle GraphQL operasjoner
- Automatisk re-fetch når periode endres
- Loading states mens data hentes
- Formatert data med norske tall og datoer

Lykke til! 🚀
