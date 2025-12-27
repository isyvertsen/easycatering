# Frontend Kode-Review Rapport

**Prosjekt:** LKC (Larvik Kommune Catering) Frontend
**Dato:** 2025-12-26
**Reviewer:** Claude Code

---

## Sammendrag

### Overordnet vurdering: **BRA**

Frontend-prosjektet er velstrukturert og følger moderne React/Next.js-praksis. Bruken av shadcn/ui-komponenter gir konsistent styling. Hovedområdene for forbedring er TypeScript-typing og testdekning.

### Statistikk

| Metrikk | Antall |
|---------|--------|
| React-komponenter (.tsx) | 60 |
| Inline styles (style={{}}) | 3 |
| console.log statements | 0 |
| TODO/FIXME kommentarer | 2 |
| any type bruk | 47 |
| Jest test-filer | 2 |
| Playwright E2E tester | 5 |

### Funn per kategori

| Kategori | Kritisk | Høy | Medium | Lav |
|----------|---------|-----|--------|-----|
| TypeScript | 0 | 1 | 2 | 1 |
| Testing | 0 | 1 | 1 | 0 |
| Accessibility | 0 | 1 | 2 | 0 |
| React Patterns | 0 | 0 | 2 | 1 |
| Security | 0 | 0 | 1 | 0 |
| Styling | 0 | 0 | 0 | 1 |
| Next.js | 0 | 0 | 1 | 1 |

---

## Detaljerte Funn

### 1. TypeScript

#### HØY: Overdreven bruk av `any` type

**Problem:** 47 forekomster av `: any` i kodebasen.

**Filer med mest `any`:**
- `app/products/ean-management/page.tsx` - 10+ forekomster
- `components/label-designer/LabelDesigner.tsx` - 5 forekomster
- `components/recipes/recipe-ingredients.tsx` - 3 forekomster
- `lib/api/base.ts` - Generiske `any` typer

**Eksempler:**
```typescript
// app/products/ean-management/page.tsx:163
} catch (error: any) {

// lib/api/base.ts:6
[key: string]: any

// components/label-designer/LabelDesigner.tsx:76
const extractTextFields = useCallback((template: any) => {
```

**Prioritet:** Høy

**Løsning:**
- Erstatt `error: any` med `error: unknown` og typesjekk
- Definer spesifikke interfaces for API-responser
- Bruk generics der mulig

---

#### MEDIUM: Manglende types for pdfme template

**Problem:** Label designer bruker `any` for pdfme templates.

**Fil:** `src/types/labels.ts:210-216`

**Detaljer:**
```typescript
initialTemplate?: any; // pdfme template structure
template: any; // pdfme template structure
```

**Prioritet:** Medium

**Løsning:** Definer interface for pdfme template struktur eller importer fra @pdfme/common.

---

#### MEDIUM: Inkonsistent error handling med any

**Problem:** Feilhåndtering bruker `error: any` i stedet for typesikker håndtering.

**Fil:** Mange filer i `app/`

**Eksempel:**
```typescript
} catch (error: any) {
  console.error("Error:", error)
  toast({
    description: error.response?.data?.detail || "Feil"
  })
}
```

**Prioritet:** Medium

**Løsning:** Bruk utility-funksjon for feilhåndtering:
```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    return error.response?.data?.detail || error.message
  }
  return error instanceof Error ? error.message : 'Ukjent feil'
}
```

---

#### LAV: Generiske typer i API-klient

**Problem:** API-funksjoner bruker `any` for generiske responser.

**Fil:** `lib/api.ts:42-93`

**Prioritet:** Lav

**Løsning:** Bruk mer spesifikke generics eller unknown med typesjekk.

---

### 2. Testing

#### HØY: Lav testdekning

**Problem:** Kun 2 Jest-testfiler for 60 komponenter.

**Eksisterende tester:**
- `__tests__/auth.test.tsx`
- `__tests__/label-designer.test.tsx`

**Manglende tester for kritiske komponenter:**
- Produkthåndtering (`produkter/`, `products/`)
- Ordrehåndtering (`orders/`)
- Kundeadministrasjon (`customers/`)
- Menyforvaltning (`menus/`)

**Prioritet:** Høy

**Løsning:** Prioriter tester for:
1. Data-intensive komponenter (produkter, ordrer)
2. Kompleks forretningslogikk (EAN-management)
3. Skjema-validering

---

#### MEDIUM: E2E-tester kunne vært mer omfattende

**Problem:** 5 Playwright-tester dekker begrenset funksjonalitet.

**Fil:** `e2e/`

**Eksisterende tester:**
- recipes.spec.ts
- produkter.spec.ts
- all-pages.spec.ts

**Prioritet:** Medium

**Løsning:** Utvid E2E-tester til å dekke kritiske brukerflyter som ordre-oppretting og kundeadministrasjon.

---

### 3. Accessibility (a11y)

#### HØY: Manglende aria-labels på interaktive elementer

**Problem:** Kun 2 forekomster av aria-attributter i hele komponenter-mappen.

**Fil:** `components/ui/form.tsx:114-119` (eneste som har aria)

**Eksempler på manglende aria:**
- Søkefelt i alle tabeller
- Filtreringsknapper
- Dialoger uten beskrivelse for skjermlesere
- Ikoner brukt som knapper

**Prioritet:** Høy

**Løsning:**
- Legg til `aria-label` på alle knapper med kun ikon
- Bruk `aria-describedby` for komplekse skjemaer
- Legg til `role="search"` på søkefelt

---

#### MEDIUM: Alt-tekster på bilder

**Problem:** Alt-tekster finnes (4 stk), men er generiske eller dynamiske.

**Fil:** Flere filer

**Eksempel:**
```tsx
// sidebar.tsx:174
alt={session.user.name || session.user.email || ''}
// Tom alt-tekst som fallback er problematisk
```

**Prioritet:** Medium

**Løsning:** Sikre at alle bilder har meningsfulle alt-tekster.

---

#### MEDIUM: Fokus-håndtering i dialoger

**Problem:** Dialoger håndterer ikke alltid fokus korrekt for tastaturnavigasjon.

**Prioritet:** Medium

**Løsning:** Verifiser at dialoger fra shadcn/ui brukes med korrekt fokus-trap.

---

### 4. React Patterns

#### MEDIUM: useEffect med manglende dependencies

**Problem:** Noen useEffect har potensielt manglende dependencies.

**Fil:** `components/produkter/matinfo-search-dialog.tsx:49-53`

**Detaljer:**
```typescript
useEffect(() => {
  if (open && product.produktid) {
    fetchSuggestions()
  }
}, [open, product.produktid])
// fetchSuggestions er ikke i dependencies - OK fordi det er stabil, men bør dokumenteres
```

**Prioritet:** Medium

**Løsning:** Legg til ESLint react-hooks/exhaustive-deps eller dokumenter intensjonelle utelatelser.

---

#### MEDIUM: Mangel på useMemo/useCallback i noen komponenter

**Problem:** Store page-komponenter mangler memoization for beregnede verdier.

**Fil:** `app/products/ean-management/page.tsx`

**Detaljer:** Komponenten på 957 linjer har ingen useMemo/useCallback, noe som kan føre til unødvendige re-renders.

**Prioritet:** Medium

**Løsning:** Legg til:
- `useMemo` for filteredProducts og counts
- `useCallback` for handler-funksjoner

---

#### LAV: Stor komponent uten splitting

**Problem:** `app/products/ean-management/page.tsx` er 957 linjer.

**Prioritet:** Lav

**Løsning:** Split ut:
- Match selection dialog til egen komponent
- Filter tabs til egen komponent
- Table row til egen komponent

---

### 5. Security

#### MEDIUM: DangerouslySetInnerHTML med DOMPurify

**Problem:** Bruker `dangerouslySetInnerHTML` men saniterer med DOMPurify.

**Fil:** `components/produkter/matinfo-search-dialog.tsx:291`

**Detaljer:**
```tsx
dangerouslySetInnerHTML={{
  __html: DOMPurify.sanitize(result.ingredients.substring(0, 200) + ...)
}}
```

**Vurdering:** DOMPurify er brukt korrekt. Dette er en MEDIUM prioritet fordi:
- DOMPurify kan ha konfigurasjonsmangler
- Bedre å bruke tekstbasert visning når mulig

**Prioritet:** Medium

**Løsning:** Vurder å vise ingredienser som ren tekst der HTML ikke er nødvendig.

---

### 6. Styling

#### LAV: Minimalt med inline styles

**Problem:** 3 forekomster av inline styles (dynamiske verdier).

**Fil:**
- `app/deliveries/page.tsx:167` - Progress bar width
- `app/reports/page.tsx:164, 271` - Chart heights

**Detaljer:**
```tsx
style={{ width: `${(delivery.completedStops / delivery.totalStops) * 100}%` }}
```

**Prioritet:** Lav - Disse er legitim bruk for dynamiske verdier.

**Løsning:** OK som det er. Alternativt bruk CSS custom properties.

---

### 7. Next.js

#### MEDIUM: Alle sider er client components

**Problem:** 39 av 39 page-filer bruker `'use client'`.

**Fil:** Alle filer i `app/*/page.tsx`

**Prioritet:** Medium

**Løsning:**
- Vurder å flytte data-fetching til server components
- Bruk React Server Components for statiske sider
- Behold client components kun der nødvendig (interaktivitet)

---

#### LAV: Potensiale for streaming

**Problem:** Sider laster alt innhold på en gang.

**Prioritet:** Lav

**Løsning:** Vurder å bruke Suspense og streaming for bedre UX på langsomme sider.

---

### 8. Dead Code og Opprydding

#### Info: Generelt rent

**Positiv observasjon:**
- 0 console.log statements
- Kun 2 TODO-kommentarer (begge er relevante)
- Ingen utkommentert kode funnet

**TODO-kommentarer:**
1. `lib/api.ts:19` - "Implement auth token handling" (pågående arbeid)
2. `components/label-designer/TemplateLibrary.tsx:46` - "Implement shared check" (planlagt feature)

---

## Handlingsplan

### Høy prioritet

1. **Reduser `any`-bruk**
   - Erstatt `error: any` med `unknown`
   - Definer interfaces for API-responser
   - Lag type-guard utility-funksjoner

2. **Øk testdekning**
   - Legg til Jest-tester for kritiske komponenter
   - Utvid E2E-tester for hovedflyter

3. **Forbedre accessibility**
   - Legg til aria-labels på alle ikon-knapper
   - Verifiser fokus-håndtering i dialoger

### Medium prioritet

4. **Optimaliser store komponenter**
   - Split `ean-management/page.tsx`
   - Legg til useMemo/useCallback der nødvendig

5. **Vurder Server Components**
   - Flytt statisk innhold til server components
   - Bruk streaming for tunge sider

6. **Forbedre feilhåndtering**
   - Lag sentralisert error-utility
   - Fjern `dangerouslySetInnerHTML` der ikke nødvendig

### Lav prioritet

7. **Dokumenter intentjonelle patterns**
   - Kommentér bevisste useEffect-utelatelser
   - Oppdater TODO-kommentarer

---

## Positive Funn

- **Konsistent bruk av shadcn/ui**: God UI-konsistens
- **Null console.log**: Ren produksjonskode
- **Minimal inline styling**: Kun dynamiske verdier
- **God mappestruktur**: Klar separasjon mellom app/, components/, hooks/, lib/
- **TypeScript gjennomført**: Alle filer er .tsx/.ts
- **Error boundary implementert**: Fanger runtime-feil
- **DOMPurify for XSS-beskyttelse**: God sikkerhetspraksis
- **React Query for data-caching**: Effektiv datahåndtering

---

*Rapport generert: 2025-12-26*
