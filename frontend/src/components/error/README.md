# Error Handling System

Dette er en omfattende feilhåndteringsløsning for catering-systemet med norske meldinger og brukersentrerte forbedringer.

## Oversikt

Systemet består av flere komponenter som jobber sammen for å gi en sømløs brukeropplevelse:

### 1. **Error Utilities** (`/lib/error-utils.ts`)
- Norske feilmeldinger for vanlige scenarioer
- Intelligent feiltype-deteksjon
- Automatisk retry-logikk
- Logging og debugging-funksjoner

### 2. **API Client** (`/lib/api-client.ts`)
- Automatisk retry for nettverksfeil
- Toast-notifikasjoner for feil
- Autentisering-håndtering
- Performanse-overvåking

### 3. **Error Boundary** (`/components/error/error-boundary.tsx`)
- Fanger uventede React-feil
- Brukersentrert feilvisning
- Retry og tilbakenavigering
- Tekniske detaljer i utviklingsmodus

### 4. **Error Display Components** (`/components/error/error-display.tsx`)
- Spesialiserte komponenter for ulike feiltyper
- Konsistent design med Tailwind CSS
- Interaktive elementer (retry, navigering)

## Bruk

### Importering

```typescript
// Importer alle feilkomponenter
import { 
  ErrorBoundary, 
  ErrorDisplay, 
  LoadingError,
  NetworkError,
  getErrorMessage 
} from '@/components/error'

// Eller individuell import
import { ErrorBoundary } from '@/components/error/error-boundary'
import { ErrorDisplay } from '@/components/error/error-display'
```

### Error Boundary

Wrap komponenter for å fange uventede feil:

```typescript
export default function MyPage() {
  return (
    <ErrorBoundary showDetails={true}>
      <MyPageContent />
    </ErrorBoundary>
  )
}
```

### Error Display Components

#### Generell feilvisning:
```typescript
const { data, error, refetch } = useQuery(...)

if (error) {
  return (
    <ErrorDisplay
      error={error}
      onRetry={refetch}
      showRetry={true}
    />
  )
}
```

#### Spesialiserte komponenter:
```typescript
// Nettverksfeil
<NetworkError onRetry={refetch} />

// 404-feil
<NotFoundError 
  resource="oppskrift" 
  onGoHome={() => router.push('/')} 
/>

// Serverfeil
<ServerError onRetry={refetch} />

// Inline laste-feil
<LoadingError 
  resource="oppskrifter" 
  error={error}
  onRetry={refetch}
/>
```

### Hooks med Error Handling

Hooks er automatisk forbedret med feilhåndtering:

```typescript
// Automatisk toast-notifikasjoner
const createMutation = useCreateRecipe({
  onSuccess: () => {
    // Viser automatisk "Oppskrift opprettet" toast
  },
  onError: (error) => {
    // Viser automatisk feilmelding på norsk
  }
})

// Manuell håndtering
const createMutation = useCreateRecipe({
  onError: (error) => {
    // Din egen håndtering i tillegg til automatisk
    console.log('Custom error handling:', error)
  }
})
```

### Manual Error Handling

```typescript
import { getErrorMessage, getCrudErrorMessage, toast } from '@/components/error'

try {
  await apiCall()
} catch (error) {
  const message = getErrorMessage(error)
  toast({
    title: "Feil oppstod",
    description: message,
    variant: "destructive"
  })
}

// For CRUD-operasjoner
const message = getCrudErrorMessage('create', 'recipe', error)
```

## Feiltyper

Systemet detekterer automatisk ulike feiltyper:

- **NETWORK**: Tilkoblingsproblemer
- **AUTHENTICATION**: Autentiseringsfeil (401)
- **AUTHORIZATION**: Tilgangsfeil (403)
- **NOT_FOUND**: Ressurs ikke funnet (404)
- **VALIDATION**: Valideringsfeil (400-499)
- **SERVER**: Serverfeil (500+)
- **UNKNOWN**: Ukjente feil

## Norske Meldinger

Alle feilmeldinger er oversatt til norsk og tilpasset kontekst:

```typescript
// Eksempler på norske meldinger
"Du er ikke tilkoblet internett. Sjekk nettverkstilkoblingen din."
"Oppskriften ble ikke funnet."
"Kunne ikke opprette oppskrift. Prøv igjen."
"En feil oppstod på serveren. Prøv igjen senere."
```

## Retry Logic

Automatisk retry for visse feiltyper:

- Nettverksfeil
- Timeout (ECONNABORTED)
- Server errors (502, 503, 504)
- Eksponentiell backoff (1s, 2s, 4s, 8s, maks 10s)
- Maks 3 forsøk

## Best Practices

### 1. Wrap pages med ErrorBoundary
```typescript
export default function Page() {
  return (
    <ErrorBoundary>
      <PageContent />
    </ErrorBoundary>
  )
}
```

### 2. Bruk appropriate error components
```typescript
// For loading states med potensielle feil
if (error && !data) {
  return <ErrorDisplay error={error} onRetry={refetch} />
}

// For inline feil med cached data
if (error && data) {
  return (
    <>
      <LoadingError error={error} onRetry={refetch} />
      <DataDisplay data={data} />
    </>
  )
}
```

### 3. Bruk resource-spesifikke meldinger
```typescript
const message = getCrudErrorMessage('delete', 'recipe', error)
// Output: "Kunne ikke slette oppskrift. Prøv igjen."
```

### 4. Legg til custom error handling når nødvendig
```typescript
const mutation = useMutation({
  onError: (error) => {
    // Automatisk feilhåndtering skjer allerede
    // Legg til custom logikk hvis nødvendig
    if (error.response?.status === 409) {
      setShowConflictDialog(true)
    }
  }
})
```

## Debugging

I development mode:
- Automatisk logging av alle feil
- Tekniske detaljer i ErrorBoundary
- Performanse-varsler for trege requests
- Stack traces og component stacks

## Konfigurering

### API Client Timeout
```typescript
// Standard: 10 sekunder
// Kan konfigureres i /lib/api-client.ts
timeout: 10000
```

### Toast Duration
```typescript
// Konfigurer i /hooks/use-toast.ts
const TOAST_REMOVE_DELAY = 1000000 // Tid i millisekunder
```

### Retry Configuration
```typescript
// Konfigurer i /lib/error-utils.ts
export function shouldRetry(error: any, retryCount: number = 0, maxRetries: number = 3)
export function getRetryDelay(retryCount: number, baseDelay: number = 1000)
```