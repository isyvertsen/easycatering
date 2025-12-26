# Frontend Kode Review Rapport

**Dato:** 2025-12-26
**Prosjekt:** LKCserver-frontend (Larvik Kommune Catering)
**Reviewer:** Claude Code

---

## Sammendrag

### Overordnet vurdering: **MODERAT**

Frontend-prosjektet har en solid grunnstruktur med god bruk av moderne teknologier (Next.js 15, React 19, TypeScript, Tailwind CSS, shadcn/ui). Hovedutfordringene ligger i testdekning, TypeScript-typing og tilgjengelighetsproblemer.

### Statistikk

| Kategori | Antall | Status |
|----------|--------|--------|
| Inline styles | 3 | Bra |
| console.log | 11 | Medium |
| TODO/FIXME | 2 | Bra |
| `: any` bruk | 61 | Kritisk |
| Komponenter | 59 | - |
| Jest tester | 3 | Kritisk |
| E2E tester | 5 | Medium |
| `use client` | 90 | Merknad |

---

## Detaljerte Funn

### 1. Inline CSS og Styling

**Status:** Bra

**Funn:**
- Kun 3 inline styles funnet, alle brukt for dynamiske verdier:
  - `src/app/reports/page.tsx`: Dynamisk høyde for søylediagram
  - `src/app/reports/page.tsx`: Dynamisk bredde for progress bar
  - `src/app/deliveries/page.tsx`: Dynamisk bredde for leveringsprogresjon

**Prioritet:** Lav

**Kommentar:** Dette er akseptabel bruk av inline styles for dynamiske verdier som ikke kan settes med Tailwind-klasser.

---

### 2. Dupliserte Komponenter

**Status:** Medium

**Funn:**

| Problem | Filer | Prioritet |
|---------|-------|-----------|
| Duplisert allergen-visning | `produkter/allergen-badge.tsx`, `recipes/allergen-display.tsx` | Medium |
| Duplisert næringsinformasjon | `produkter/nutrition-info.tsx`, `recipes/nutrition-display.tsx` | Medium |
| Duplisert kundeform | `customers/new/page.tsx`, `customers/[id]/page.tsx` | Høy |

**Løsning:**
- Konsolider `AllergenBadge` og `AllergenDisplay` til én gjenbrukbar komponent
- Samle næringsinformasjonsvisning i én komponent med props for forskjellige visningsmoduser
- Lag en felles `CustomerForm` komponent som brukes av både ny- og redigerings-siden

---

### 3. React Best Practices

**Status:** Bra

**Positive funn:**
- God bruk av `useMemo` og `useCallback` (38 forekomster, hovedsakelig i LabelDesigner)
- Konsistent bruk av `key` props i alle `.map()` iterasjoner (100+ forekomster verifisert)
- React Query brukes korrekt for datasynkronisering

**Problem:** useEffect med manglende avhengigheter
- **Fil:** `src/components/produkter/matinfo-search-dialog.tsx:52`
- **Beskrivelse:** `product.produktid` i avhengighetsarray, men bruker `product` objekt
- **Prioritet:** Medium

```tsx
// Linje 48-52 - Potensielt problem
useEffect(() => {
  if (open && product.produktid) {
    fetchSuggestions()
  }
}, [open, product.produktid])  // fetchSuggestions mangler
```

---

### 4. TypeScript

**Status:** Kritisk

**Funn:** 61 forekomster av `: any` type

**Høy prioritet (bør fikses):**
| Fil | Linje | Problem |
|-----|-------|---------|
| `app/customers/new/page.tsx:61` | `handleChange(..., value: any)` | Bruk generisk type |
| `app/customers/[id]/page.tsx:61` | `handleChange(..., value: any)` | Bruk generisk type |
| `app/produkter/[id]/page.tsx` | `handleChange(..., value: any)` | Bruk generisk type |
| `app/orders/new/page.tsx:handleSubmit` | `data: any` | Definer OrderFormData type |
| `hooks/useCrud.ts` | Flere linjer | Index signatures bør ha typer |
| `lib/error-utils.ts` | `getErrorType/getErrorMessage` | Bruk `unknown` istedenfor `any` |

**Medium prioritet:**
- `types/labels.ts`: `any` for pdfme template struktur (vanskelig å type)
- `components/label-designer/LabelDesigner.tsx`: pdfme integrasjon

**Løsning:**
```typescript
// Fra:
const handleChange = (field: keyof Customer, value: any) => { ... }

// Til:
const handleChange = <T extends keyof Customer>(
  field: T,
  value: Customer[T]
) => { ... }
```

---

### 5. Test-dekning

**Status:** Kritisk

**Jest Unit Tests:**
| Test | Fil |
|------|-----|
| Auth tester | `src/__tests__/auth.test.tsx` |
| Label designer | `src/__tests__/label-designer.test.tsx` |
| useLabelTemplates hook | `src/__tests__/useLabelTemplates.test.ts` |

**Playwright E2E:**
| Test | Fil |
|------|-----|
| All pages | `e2e/all-pages.spec.ts` |
| Produkter | `e2e/produkter.spec.ts` |
| Recipes | `e2e/recipes.spec.ts`, `e2e/recipes-working.spec.ts` |

**Manglende tester (prioritert):**
1. **Kritisk:** Ingen tester for kunde-CRUD
2. **Kritisk:** Ingen tester for ordre-CRUD
3. **Høy:** Mangler tester for hooks (`useCustomers`, `useOrders`)
4. **Høy:** Mangler tester for API-klient (`lib/api.ts`)
5. **Medium:** Mangler tester for error handling komponenter

---

### 6. Accessibility (a11y)

**Status:** Medium

**Positive funn:**
- Form labels er implementert med `<Label htmlFor="">` i de fleste komponenter
- Interaktive elementer har generelt god tastatur-støtte

**Problemer:**

| Problem | Fil | Prioritet |
|---------|-----|-----------|
| Ingen `aria-label` på interaktive elementer | Flere filer | Medium |
| `<img>` uten alt-tekst | 4 filer | Høy |
| Manglende `next/image` bruk | Alle `<img>` tags | Medium |

**Bilder uten/med mangelfull alt:**
- `components/label-designer/TemplateCard.tsx:116` - Har alt, men bør verifiseres
- `components/label-designer/PrintDialog.tsx:196` - "Forhandsvisning" (ok)
- `components/layout/sidebar.tsx:172` - Bruker `session.user.name` (ok)
- `app/labels/[id]/print/page.tsx:249` - Har alt

**Løsning:**
```tsx
// Bruk Next.js Image komponent
import Image from 'next/image'

// Fra:
<img src={url} alt="description" />

// Til:
<Image src={url} alt="description" width={100} height={100} />
```

---

### 7. Dead Code og Opprydding

**Status:** Medium

**console.log (bør fjernes før produksjon):**
| Fil | Linjer | Beskrivelse |
|-----|--------|-------------|
| `app/products/ean-management/page.tsx` | 4 linjer | Debug logging for søk |
| `app/admin/users/page.tsx` | 2 linjer | User fetching debug |
| `app/dishes/create/page.tsx` | 2 linjer | Label generation debug |
| `auth.ts` | 3 linjer | Google auth debug |

**TODO/FIXME:**
| Fil | Beskrivelse |
|-----|-------------|
| `components/label-designer/TemplateLibrary.tsx:line` | "TODO: Implement shared check when we have user context" |
| `lib/api.ts` | "TODO: Implement auth token handling" |

**Backup fil:**
- `src/app/api/auth/[...nextauth]/auth-options.ts.bak` - Bør slettes

---

### 8. Sikkerhet

**Status:** Bra

**Positive funn:**
- Ingen hardkodede API-nøkler eller hemmeligheter i kildekoden
- Environment variabler brukes korrekt (`process.env.GOOGLE_CLIENT_ID!`, etc.)
- NextAuth brukes for autentisering

**Bekymringer:**

| Problem | Fil | Prioritet |
|---------|-----|-----------|
| `dangerouslySetInnerHTML` brukt | `produkter/matinfo-search-dialog.tsx:290` | Medium |

**dangerouslySetInnerHTML analyse:**
```tsx
// Linje 288-291
<p
  className="mt-1 pl-4"
  dangerouslySetInnerHTML={{ __html: result.ingredients.substring(0, 200) + ... }}
/>
```

**Risiko:** Medium - Data kommer fra Matinfo API (ekstern kilde)
**Løsning:** Bruk DOMPurify for sanitering:
```tsx
import DOMPurify from 'dompurify'
dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(result.ingredients.substring(0, 200)) }}
```

---

### 9. Performance

**Status:** Bra

**Positive funn:**
- Dynamic import av pdfme bibliotek (`LabelDesigner.tsx:100`)
- Bruk av `useMemo` for kostbare beregninger
- React Query caching for API-kall

**Forbedringspotensial:**

| Problem | Fil | Prioritet |
|---------|-----|-----------|
| Ingen lazy loading av bilder | Flere steder | Medium |
| Store komponenter uten splitting | `dishes/create/page.tsx` (800+ linjer) | Medium |

**Løsning for store komponenter:**
- Split `dishes/create/page.tsx` i mindre komponenter
- Bruk `React.lazy()` for komponenter som ikke vises umiddelbart

---

### 10. Next.js Spesifikt

**Status:** Bra

**Positive funn:**
- Korrekt bruk av App Router
- `"use client"` direktiv brukes konsistent (90 filer)
- Link-komponenten brukes korrekt for navigasjon

**Problemer:**

| Problem | Beskrivelse | Prioritet |
|---------|-------------|-----------|
| Ingen `"use server"` | Alle server actions mangler | Info |
| `<img>` istedenfor `<Image>` | 4 steder | Medium |
| Ingen metadata eksport | Mangler SEO meta i mange sider | Lav |

**Merknad:** Ingen server components eller server actions er tatt i bruk. Alt er client-side, noe som kan påvirke initial loading og SEO.

---

## Handlingsplan

### Kritiske (bør fikses snarest)

1. **Øk testdekning**
   - Legg til Jest tester for kunde- og ordre-CRUD
   - Test kritiske hooks (`useCustomers`, `useOrders`, etc.)
   - Mål: 60%+ coverage

2. **Fjern `: any` typer**
   - Start med `handleChange` funksjoner i forms
   - Bruk generiske typer og `unknown` der mulig
   - Mål: Maks 10 `any`-forekomster

### Høy prioritet

3. **Sikkerhetsopprydding**
   - Installer og bruk DOMPurify for `dangerouslySetInnerHTML`
   - Fjern `.bak` fil fra repo

4. **Tilgjengelighet**
   - Erstatt `<img>` med `<Image>` fra next/image
   - Legg til `aria-label` på ikoner og interaktive elementer

5. **Console.log fjerning**
   - Fjern alle 11 debug console.log statements
   - Vurder å bruke en logger som kan slås av i produksjon

### Medium prioritet

6. **Konsolider komponenter**
   - Slå sammen allergen-visningskomponenter
   - Lag felles `CustomerForm` komponent
   - Bryt opp `dishes/create/page.tsx`

7. **Fullfør TODOs**
   - Implementer shared template check
   - Implementer auth token handling

### Lav prioritet

8. **SEO og metadata**
   - Legg til metadata eksport i page komponenter
   - Vurder Server Components for bedre SEO

9. **Code splitting**
   - Lazy load tunge komponenter
   - Implementer proper loading states

---

## Konklusjon

Frontend-prosjektet har en god grunnstruktur og bruker moderne best practices. De viktigste forbedringsområdene er:

1. **Testdekning** - Kritisk lav, bør prioriteres
2. **TypeScript-disiplin** - For mye `any` bruk
3. **Komponent-gjenbruk** - Duplisering kan reduseres

Prosjektet er i god stand for videre utvikling, men trenger oppmerksomhet på test og type-safety før produksjonsutrulling.

---

## Endringer Utført (2025-12-26)

Følgende forbedringer ble implementert basert på denne rapporten:

### 1. TypeScript forbedringer
- Fjernet `any` typer fra handleSubmit/handleChange funksjoner i:
  - `app/orders/new/page.tsx` og `app/orders/[id]/page.tsx`
  - `app/employees/new/page.tsx` og `app/employees/[id]/page.tsx`
  - `app/customers/new/page.tsx` og `app/customers/[id]/page.tsx`
- Eksportert form-typer (`OrderFormData`, `EmployeeFormValues`) for gjenbruk
- Oppdatert `lib/error-utils.ts` til å bruke `unknown` istedenfor `any`
- Fikset `EmployeeCreateData` type for korrekt håndtering av server-genererte felt

### 2. Sikkerhet (XSS-beskyttelse)
- Installert `dompurify` og `@types/dompurify`
- Oppdatert `components/produkter/matinfo-search-dialog.tsx` til å sanitere HTML

### 3. Console.log opprydding
Fjernet debug console.log fra:
- `auth.ts` (3 statements)
- `app/products/ean-management/page.tsx` (4 statements)
- `app/admin/users/page.tsx` (2 statements)
- `app/dishes/create/page.tsx` (2 statements)

### 4. Komponent-konsolidering
- Opprettet `components/shared/allergen-components.tsx` med:
  - `AllergenBadge` - enkelt badge for én allergen
  - `AllergenList` - kompakt liste av allergener
  - `AllergenCard` - full kortvisning av allergener
- Oppdatert eksisterende komponenter til å re-eksportere fra shared

### Verifisering
- `npm run build` kjører uten feil
- Alle endringer er bakoverkompatible

---

*Rapport generert av Claude Code*
