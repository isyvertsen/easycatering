'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarkdownViewer } from '@/components/documentation/MarkdownViewer'
import { GitHubIntegration } from '@/components/documentation/GitHubIntegration'
import { ImageUpload } from '@/components/documentation/ImageUpload'
import { Button } from '@/components/ui/button'
import { BookOpen, Github, Image as ImageIcon, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function DocumentationPage() {
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState('frontend')

  // Frontend documentation content
  const frontendDocs = `# Frontend Dokumentasjon

## Oversikt
Dette er dokumentasjonssystemet for Larvik Catering frontend-applikasjonen.

## Arkitektur

### Teknologistakk
- **Next.js 15**: React-rammeverk med App Router
- **TypeScript**: Type-sikkerhet
- **NextAuth**: Autentisering
- **Tailwind CSS**: Styling
- **Radix UI**: UI-komponenter

### Prosjektstruktur

\`\`\`
src/
├── app/              # Next.js app router sider
│   ├── admin/        # Admin-sider (krever admin-rettigheter)
│   ├── api/          # API-ruter (proxy til backend)
│   └── ...           # Andre sider
├── components/       # Gjenbrukbare komponenter
├── lib/              # Utility-funksjoner
└── auth.ts           # NextAuth-konfigurasjon
\`\`\`

## Autentisering

### Flyt
\`\`\`mermaid
graph TD
    A[Bruker logger inn] --> B{Auth-metode}
    B -->|Google| C[Google OAuth]
    B -->|Email/Password| D[Credentials]
    C --> E[Backend verifiserer token]
    D --> E
    E --> F{Godkjent?}
    F -->|Ja| G[Session opprettes]
    F -->|Nei| H[Feilmelding]
    G --> I[Access token lagres]
    I --> J[Bruker får tilgang]
\`\`\`

### Implementering
Autentisering håndteres av NextAuth med to providers:
1. **Google OAuth**: For Google-kontoer
2. **Credentials**: For email/passord

Access tokens fornyes automatisk hver 30. minutt.

## API-integrasjon

### API-klient
All kommunikasjon med backend går gjennom \`apiClient\` (axios):

\`\`\`typescript
import { apiClient } from '@/lib/api-client'

// Hent data
const response = await apiClient.get('/endpoint')

// Send data
await apiClient.post('/endpoint', data)
\`\`\`

### API-ruter
Next.js proxy-ruter i \`/api\`:
- \`/api/v1/[...proxy]\`: Generelle API-kall
- \`/api/admin/[...proxy]\`: Admin-API-kall
- \`/api/auth/[...nextauth]\`: Auth-endepunkter

## Komponenter

### UI-komponenter
Radix UI-baserte komponenter i \`components/ui/\`:
- Button, Dialog, Tabs, Card, etc.
- Tailwind CSS for styling

### Layout
- **Sidebar**: Navigasjonsmeny (collapsible)
- **TopNavigation**: Toppnavigasjon
- **Providers**: Context providers for app

## Beste praksis

### 1. Type-sikkerhet
Bruk TypeScript interfaces for all data:

\`\`\`typescript
interface User {
  id: number
  email: string
  full_name: string
}
\`\`\`

### 2. Error handling
Alltid håndter feil i API-kall:

\`\`\`typescript
try {
  const data = await apiClient.get('/endpoint')
} catch (error) {
  console.error('Feil:', error)
  // Vis feilmelding til bruker
}
\`\`\`

### 3. Client/Server components
- Bruk \`'use client'\` kun når nødvendig
- Server components er default i App Router

## Testing
- **Jest**: Unit tests
- **Playwright**: E2E tests

Kjør tester:
\`\`\`bash
npm test        # Unit tests
npm run test:ci # CI tests
\`\`\`
`

  const backendDocs = `# Backend API Dokumentasjon

## Oversikt
Backend er en FastAPI-applikasjon som håndterer all business logic og database-operasjoner.

## Autentisering

### Endpoints

#### POST /api/auth/login
Login med email og passord.

**Request:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password123"
}
\`\`\`

**Response:**
\`\`\`json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "bearer"
}
\`\`\`

#### POST /api/auth/google
Login med Google OAuth.

**Request:**
\`\`\`json
{
  "id_token": "google_id_token"
}
\`\`\`

#### POST /api/auth/refresh
Forny access token.

**Request:**
\`\`\`json
{
  "refresh_token": "eyJ..."
}
\`\`\`

## Admin API

### Brukeradministrasjon

#### GET /api/admin/users
Hent alle brukere (krever admin).

**Response:**
\`\`\`json
[
  {
    "id": 1,
    "email": "user@example.com",
    "full_name": "Navn Navnesen",
    "is_active": true,
    "is_superuser": false,
    "created_at": "2024-01-01T00:00:00"
  }
]
\`\`\`

#### PATCH /api/admin/users/{user_id}/activate
Aktiver bruker.

#### PATCH /api/admin/users/{user_id}/make-admin
Gi admin-rettigheter.

## Database-skjema

### ER-diagram
\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        int id PK
        string email
        string full_name
        boolean is_active
        boolean is_superuser
    }
    ORDER ||--|{ ORDER_LINE : contains
    ORDER {
        int id PK
        int user_id FK
        date order_date
        string status
    }
    ORDER_LINE {
        int id PK
        int order_id FK
        int product_id FK
        int quantity
    }
    PRODUCT ||--o{ ORDER_LINE : "ordered in"
    PRODUCT {
        int id PK
        string name
        string ean
        decimal price
    }
\`\`\`

## Feilhåndtering

### HTTP-statuskoder
- **200**: OK
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

### Feilformat
\`\`\`json
{
  "detail": "Feilmelding her"
}
\`\`\`
`

  const apiDocs = `# API-funksjonsbeskrivelser

## Oversikt
Detaljert beskrivelse av alle API-funksjoner i systemet.

## Ordre-håndtering

### Flytdiagram
\`\`\`mermaid
sequenceDiagram
    participant U as Bruker
    participant F as Frontend
    participant B as Backend
    participant D as Database

    U->>F: Opprett ordre
    F->>B: POST /api/orders
    B->>D: Lagre ordre
    D-->>B: OK
    B-->>F: Ordre opprettet
    F-->>U: Bekreftelse

    U->>F: Se ordre
    F->>B: GET /api/orders/{id}
    B->>D: Hent ordre
    D-->>B: Ordredata
    B-->>F: Ordredata
    F-->>U: Vis ordre
\`\`\`

### Endpoints

#### POST /api/orders
Opprett ny ordre.

**Request:**
\`\`\`json
{
  "customer_id": 1,
  "order_date": "2024-01-15",
  "items": [
    {
      "product_id": 1,
      "quantity": 10
    }
  ]
}
\`\`\`

#### GET /api/orders/{id}
Hent enkeltordre.

#### GET /api/orders
Hent alle ordrer med filtrering.

**Query params:**
- \`customer_id\`: Filtrer på kunde
- \`start_date\`: Fra-dato
- \`end_date\`: Til-dato
- \`status\`: Ordrestatus

## Produktstyring

### Funksjonsflyt
\`\`\`mermaid
graph LR
    A[Produktregistrering] --> B[EAN-generering]
    B --> C[Lagring]
    C --> D[Søk/Filter]
    D --> E[Eksport]
\`\`\`

## Oppskrifter

### Beregning av næringsverdier
\`\`\`mermaid
graph TD
    A[Oppskrift] --> B[Ingredienser]
    B --> C{Produkt har<br/>næringsverdier?}
    C -->|Ja| D[Hent fra database]
    C -->|Nei| E[Manuell input]
    D --> F[Beregn totalt]
    E --> F
    F --> G[Vis per 100g]
    F --> H[Vis per porsjon]
\`\`\`

## Etikett-design

### Prosess
1. Velg mal
2. Konfigurer felter
3. Koble til datakilde
4. Forhåndsvis
5. Skriv ut

### Datakilde-støtte
- Produktdatabase
- Oppskrifter
- Egendefinerte data
`

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Systemdokumentasjon</h1>
        <p className="text-muted-foreground">
          Komplett dokumentasjon for Larvik Catering System
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="frontend" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Frontend
          </TabsTrigger>
          <TabsTrigger value="backend" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Backend
          </TabsTrigger>
          <TabsTrigger value="api" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            API
          </TabsTrigger>
          <TabsTrigger value="images" className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Bilder
          </TabsTrigger>
          <TabsTrigger value="github" className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            GitHub
          </TabsTrigger>
        </TabsList>

        <TabsContent value="frontend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Frontend Dokumentasjon</CardTitle>
              <CardDescription>
                Komplett dokumentasjon for frontend-arkitektur og komponenter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownViewer content={frontendDocs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backend API Dokumentasjon</CardTitle>
              <CardDescription>
                API-endepunkter og database-skjema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownViewer content={backendDocs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API-funksjonsbeskrivelser</CardTitle>
              <CardDescription>
                Detaljert beskrivelse av alle API-funksjoner
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MarkdownViewer content={apiDocs} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bildehåndtering</CardTitle>
              <CardDescription>
                Last opp eller lim inn bilder til dokumentasjonen
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ImageUpload />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="github" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>GitHub Integrasjon</CardTitle>
              <CardDescription>
                Oversikt over issues og pull requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GitHubIntegration />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
