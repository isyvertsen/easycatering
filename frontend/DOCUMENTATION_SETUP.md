# Dokumentasjonssystem - Installasjonsinstruksjoner

## Oversikt
Dette dokumentasjonssystemet ble implementert for å gi administratorer tilgang til komplett dokumentasjon for både frontend og backend, inkludert:
- Markdown-støtte med GitHub Flavored Markdown
- Mermaid-diagrammer for flowcharts og sekvensdiagrammer
- Bildeopplasting og utklippstavle-integrasjon
- GitHub-integrasjon for å vise åpne issues og pull requests

## Installasjon

### 1. Installer nødvendige npm-pakker

Kjør følgende kommando i prosjektets rotmappe:

```bash
npm install react-markdown remark-gfm rehype-highlight mermaid react-dropzone highlight.js
```

### 2. Pakkeforklaringer

- **react-markdown**: Renderer markdown-innhold som React-komponenter
- **remark-gfm**: Legger til støtte for GitHub Flavored Markdown (tabeller, strikethrough, etc.)
- **rehype-highlight**: Syntax highlighting for kodeblokker
- **mermaid**: Renderer flowcharts, sekvensdiagrammer, ER-diagrammer, etc.
- **react-dropzone**: Drag-and-drop funksjonalitet for bildeopplasting
- **highlight.js**: Kode-highlighting bibliotek (CSS-tema brukes av rehype-highlight)

## Implementerte filer

### Nye sider
- `src/app/admin/documentation/page.tsx` - Hoveddokumentasjonsside

### Nye komponenter
- `src/components/documentation/MarkdownViewer.tsx` - Markdown renderer med mermaid-støtte
- `src/components/documentation/GitHubIntegration.tsx` - Viser GitHub issues og PRs
- `src/components/documentation/ImageUpload.tsx` - Bildeopplasting med drag-drop

### Modifiserte filer
- `src/components/layout/sidebar.tsx` - La til "Dokumentasjon" i admin-menyen

## Tilgang

Dokumentasjonssiden er tilgjengelig på:
```
/admin/documentation
```

Siden er plassert under `/admin/` ruten, som vanligvis begrenses til administratorer i produksjonsmiljøer.

## Funksjoner

### 1. Markdown-rendering
- Støtter standard markdown syntax
- GitHub Flavored Markdown (tabeller, task lists, etc.)
- Syntax highlighting for kodeblokker
- Automatisk linking av URLer

### 2. Mermaid-diagrammer
Støttede diagramtyper:
- Flowcharts
- Sequence diagrams
- ER diagrams
- Class diagrams
- State diagrams
- Gantt charts

Eksempel:
```markdown
\`\`\`mermaid
graph TD
    A[Start] --> B[Prosess]
    B --> C[Slutt]
\`\`\`
```

### 3. Bildeopplasting
- Drag-and-drop fil-opplasting
- Lim inn direkte fra utklippstavle (Ctrl+V / Cmd+V)
- Automatisk generering av markdown-kode
- Støtte for PNG, JPG, GIF, SVG, WebP

### 4. GitHub-integrasjon
- Viser åpne issues fra repository
- Viser åpne pull requests
- Direkte lenker til GitHub
- Automatisk oppdatering

## Konfigurasjon

### GitHub Repository
For å endre hvilket repository som vises, oppdater følgende i `GitHubIntegration.tsx`:

```typescript
const GITHUB_REPO = 'isyvertsen/LKCserver-frontend'
```

Eller enda bedre, sett det som en environment variable:

```typescript
const GITHUB_REPO = process.env.NEXT_PUBLIC_GITHUB_REPO || 'isyvertsen/LKCserver-frontend'
```

## Utvidelse av dokumentasjon

Dokumentasjonsinnholdet er hardkodet i `page.tsx` for enkelhetens skyld, men kan enkelt utvides til å:

1. **Laste fra filer**: Les markdown-filer fra fil-systemet
2. **CMS-integrasjon**: Koble til et headless CMS
3. **Database**: Lagre dokumentasjon i database
4. **Git-integrasjon**: Les direkte fra docs-filer i repository

Eksempel på å laste fra fil:

```typescript
import fs from 'fs/promises'
import path from 'path'

export async function getDocumentation() {
  const docsPath = path.join(process.cwd(), 'docs')
  const frontendDocs = await fs.readFile(
    path.join(docsPath, 'frontend.md'),
    'utf-8'
  )
  return frontendDocs
}
```

## Sikkerhet

### Admin-tilgang
For å begrense tilgang til kun administratorer, legg til en middleware eller sjekk i `page.tsx`:

```typescript
export default function DocumentationPage() {
  const { data: session } = useSession()

  // Sjekk om bruker er admin (avhenger av backend-implementasjon)
  if (!session?.user?.isAdmin) {
    return <div>Kun tilgjengelig for administratorer</div>
  }

  // ... resten av koden
}
```

### GitHub API Rate Limiting
GitHub API har rate limits:
- **Uautentisert**: 60 requests per time
- **Autentisert**: 5000 requests per time

For høyere limits, legg til GitHub token:

```typescript
const token = process.env.GITHUB_TOKEN

const response = await fetch(url, {
  headers: {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3+json',
  },
})
```

## Testing

Test dokumentasjonssystemet:

1. Start utviklingsserveren:
   ```bash
   npm run dev
   ```

2. Naviger til: http://localhost:3000/admin/documentation

3. Test hver fane:
   - **Frontend**: Sjekk markdown rendering og mermaid-diagrammer
   - **Backend**: Verifiser kodeblokker og syntax highlighting
   - **API**: Test sekvensdiagrammer
   - **Bilder**: Last opp og lim inn bilder
   - **GitHub**: Sjekk at issues og PRs vises

## Feilsøking

### Mermaid rendrer ikke
- Sjekk console for feil
- Verifiser at mermaid-syntax er korrekt
- Prøv å forenkle diagrammet

### GitHub-data vises ikke
- Sjekk at repository-navnet er korrekt
- Verifiser at repository er public eller at du har tilgang
- Sjekk for CORS-feil i console

### Bilder lastes ikke opp
- Verifiser at filtypen er støttet
- Sjekk filstørrelse (browsere har limits)
- Se console for feil

## Fremtidige forbedringer

Mulige utvidelser:
- [ ] Redigering av dokumentasjon direkte i applikasjonen
- [ ] Versjonskontroll av dokumentasjon
- [ ] Søkefunksjonalitet
- [ ] Eksport til PDF
- [ ] Kommentarfunksjon
- [ ] Favoritter/bokmerker
- [ ] Mørk modus for dokumentasjonsvisning
- [ ] Mulighet for å laste opp vedlegg
- [ ] Integrasjon med Jira/Linear for issues
