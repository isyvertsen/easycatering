# Frontend Kode Review

Utfør en grundig kode-review av frontend-prosjektet (LKCserver-frontend).

## Review-områder

### 1. Inline CSS og Styling
- Søk etter overdreven bruk av inline `style={{}}` i React-komponenter
- Identifiser styling som bør flyttes til Tailwind-klasser
- Sjekk for duplisert styling på tvers av komponenter
- Vurder konsistens i spacing, farger og typography
- Sjekk at shadcn/ui komponenter brukes konsistent

### 2. Dupliserte Komponenter
- Finn komponenter med overlappende funksjonalitet
- Identifiser kopiert kode mellom komponenter
- Foreslå konsolidering til gjenbrukbare komponenter
- Sjekk `components/ui/`, `components/layout/`, `components/crud/`

### 3. React Best Practices
- Sjekk for unødvendige re-renders
- Vurder bruk av useMemo og useCallback
- Identifiser manglende key props i lister
- Se etter feil bruk av useEffect
- Sjekk at React Query brukes korrekt

### 4. TypeScript
- Sjekk bruk av `any` type (bør minimeres)
- Identifiser manglende typer
- Vurder type coverage
- Se etter type assertions som kan unngås
- Sjekk at typer i `types/` er oppdaterte

### 5. Test-dekning
- Sjekk at det finnes Jest tester (`.test.ts`, `.test.tsx`)
- Verifiser Playwright E2E tester
- Identifiser kritiske komponenter uten tester
- Vurder test-kvalitet

### 6. Accessibility (a11y)
- Sjekk for manglende `alt`-tekst på bilder
- Identifiser manglende `aria-labels` på interaktive elementer
- Vurder tastaturnavigasjon
- Sjekk kontrast og lesbarhet
- Verifiser at forms har riktige labels

### 7. Dead Code og Opprydding
- Finn ubrukte imports
- Identifiser utkommentert kode som bør fjernes
- Søk etter `console.log` statements
- Finn TODO/FIXME kommentarer
- Sjekk for ubrukte komponenter

### 8. Sikkerhet
- Sjekk for XSS-sårbarheter (dangerouslySetInnerHTML)
- Verifiser at NextAuth brukes korrekt
- Sjekk for hardkodede API-nøkler
- Vurder input-sanitering

### 9. Performance
- Vurder bundle-størrelse og code splitting
- Sjekk for store komponenter som bør splittes
- Identifiser tunge operasjoner som blokkerer UI
- Verifiser lazy loading av bilder

### 10. Next.js Spesifikt
- Sjekk App Router bruk
- Vurder server vs client components
- Verifiser metadata og SEO
- Sjekk for riktig bruk av Link og Image

## Output-format

### Sammendrag
- Kort oversikt over frontend-tilstand
- Antall problemer funnet per kategori
- Overordnet vurdering (kritisk/moderat/bra)

### Detaljerte Funn
For hver kategori:
- **Problem**: Beskrivelse
- **Fil**: Hvilken fil(er)
- **Prioritet**: Kritisk / Høy / Medium / Lav
- **Løsning**: Konkret forslag

### Statistikk
```bash
# Kjør disse for statistikk:

# Inline styles
grep -r "style={{" LKCserver-frontend/src --include="*.tsx" | wc -l

# console.log
grep -r "console.log" LKCserver-frontend/src --include="*.ts" --include="*.tsx" | wc -l

# TODO/FIXME
grep -rE "TODO|FIXME" LKCserver-frontend/src | wc -l

# any type
grep -r ": any" LKCserver-frontend/src --include="*.ts" --include="*.tsx" | wc -l

# Antall komponenter
find LKCserver-frontend/src/components -name "*.tsx" | wc -l

# Antall tester
find LKCserver-frontend -name "*.test.ts" -o -name "*.test.tsx" | wc -l
```

### Handlingsplan
Prioritert liste over oppgaver:
1. Kritiske (sikkerhet, bugs)
2. Høy prioritet (tester, a11y)
3. Medium (refaktorering)
4. Lav (kosmetisk)

## Skriv rapport til fil

Etter analysen, skriv rapporten til:
`docs/code-review-frontend-rapport.md`
