# AI-Drevet Tilbakemeldingssystem med GitHub Integration

## 📋 Oversikt

Dette er et komplett tilbakemeldingssystem som kombinerer AI-analyse med automatisk opprettelse av GitHub Issues. Systemet gjør det enkelt for brukere å rapportere feil og foreslå nye funksjoner, samtidig som AI sørger for at rapportene er godt formulert og inneholder nødvendig informasjon.

## ✨ Funksjoner

### 1. **AI-Assistert Rapportering**
- Analyserer brukerens beskrivelse
- Stiller oppfølgingsspørsmål hvis beskrivelsen mangler informasjon
- Forbedrer tittel og beskrivelse automatisk
- Oppdager hvis brukeren blander feilrapporter og funksjonsønsker
- Sjekker om ønsket funksjon allerede finnes i systemet

### 2. **GitHub Integration**
- Oppretter automatisk GitHub Issues
- Legger til riktige labels (bug/enhancement, user-reported)
- Inkluderer systeminfo (versjon, nettleser, OS, tidspunkt)
- Genererer strukturerte issue-beskrivelser

### 3. **Multi-Steg Workflow**
1. **Type-valg**: Velg mellom feilrapport eller funksjonsønske
2. **Input**: Skriv tittel og beskrivelse
3. **Oppfølging**: Svar på AI's oppfølgingsspørsmål (hvis nødvendig)
4. **Gjennomgang**: Se over forbedret versjon
5. **Bekreftelse**: Få link til opprettet GitHub Issue

---

## 🔧 Konfigurasjon

### Miljøvariabler

```bash
# PÅKREVD: GitHub Token og Repo
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_REPO=bruker/repo-navn

# AI Konfigurasjon (velg én provider)
# Standard: OpenAI
FEEDBACK_AI_PROVIDER=openai|azure|openai-compatible
FEEDBACK_AI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
FEEDBACK_AI_MODEL=gpt-4o

# Alternativ 1: Azure OpenAI
FEEDBACK_AI_PROVIDER=azure
FEEDBACK_AI_API_KEY=your-azure-key
FEEDBACK_AI_AZURE_ENDPOINT=https://your-resource.openai.azure.com
FEEDBACK_AI_AZURE_DEPLOYMENT=your-deployment-name
FEEDBACK_AI_AZURE_API_VERSION=2024-02-15-preview

# Alternativ 2: OpenAI-kompatibel API (f.eks. LM Studio, Ollama)
FEEDBACK_AI_PROVIDER=openai-compatible
FEEDBACK_AI_API_KEY=your-api-key
FEEDBACK_AI_BASE_URL=http://localhost:1234/v1

# VALGFRI: Fallback API-nøkler
AI_SECONDARY_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx
```

### GitHub Token Permissions

Tokenet må ha følgende tilganger:
- `repo` (full access) - for å opprette issues
- Eller bare `public_repo` hvis repoet er offentlig

**Slik lager du GitHub Token:**
1. Gå til GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Klikk "Generate new token (classic)"
3. Gi tokenet et navn (f.eks. "App Feedback System")
4. Velg scopes: `repo` eller `public_repo`
5. Generer og kopier tokenet

---

## 📁 Filstruktur

```
src/
├── app/
│   └── actions/
│       └── github.ts              # Server actions for GitHub og AI
├── components/
│   └── admin/
│       └── ReportIssueDialog.tsx  # UI-komponent for tilbakemelding
└── lib/
    └── release-notes.ts           # Liste over eksisterende funksjoner
```

---

## 🔌 API Oversikt

### Server Actions (github.ts)

#### `analyzeWithAI(data: AIImprovementRequest): Promise<AIAnalysisResult>`

Analyserer brukerens input med AI.

**Input:**
```typescript
{
  type: 'bug' | 'feature',
  title: string,
  description: string,
  answers?: Record<string, string>  // Svar på oppfølgingsspørsmål
}
```

**Output:**
```typescript
{
  success: boolean,
  needsMoreInfo: boolean,
  followUpQuestions?: string[],      // 1-3 spørsmål hvis mer info trengs
  improvedTitle?: string,
  improvedDescription?: string,
  detectedTypes?: ('bug'|'feature')[], // Oppdagede typer
  existingFeature?: string,          // Hvis funksjonen allerede finnes
  suggestSplit?: boolean             // Foreslår å dele opp i flere issues
}
```

**AI Capabilities:**
- Oppdager om beskrivelsen inneholder både bug og feature
- Sjekker mot liste over eksisterende funksjoner
- Stiller oppfølgingsspørsmål hvis beskrivelsen er uklar
- Forbedrer formulering og struktur

---

#### `createGitHubIssue(data: IssueData): Promise<IssueResult>`

Oppretter GitHub Issue.

**Input:**
```typescript
{
  type: 'bug' | 'feature',
  title: string,
  description: string,
  browserInfo: string,
  currentUrl: string,
  aiImproved?: boolean
}
```

**Output:**
```typescript
{
  success: boolean,
  issueUrl?: string,
  issueNumber?: number,
  error?: string
}
```

**Generert Issue Format:**
```markdown
## Feilrapport / Funksjonsønske
[Brukerens beskrivelse]

## Systeminfo
| Felt | Verdi |
|------|-------|
| **Type** | Feilrapport 🐛 |
| **Appversjon** | 1.4.27 |
| **Rapportert av** | Bruker Navn |
| **E-post** | bruker@example.com |
| **Nettleser** | Chrome på macOS |
| **Side** | /admin/reports |
| **Tidspunkt** | 03.01.2026, 14:30 |
| **AI-forbedret** | Ja |

---
*Denne issue ble automatisk opprettet fra applikasjonen.*
```

**Labels:**
- Bug: `bug`, `user-reported`
- Feature: `enhancement`, `user-reported`

---

#### `getAppVersion(): Promise<string>`

Henter appversjon fra package.json eller miljøvariabel.

---

## 🎨 UI Komponent

### ReportIssueDialog

React-komponent med 5-stegs workflow.

**Props:**
```typescript
interface ReportIssueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Bruk:**
```tsx
import { ReportIssueDialog } from '~/components/admin/ReportIssueDialog';

function MyComponent() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <>
      <button onClick={() => setDialogOpen(true)}>
        Rapporter problem
      </button>

      <ReportIssueDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
```

---

## 🤖 AI System Prompt

AI-en er konfigurert med følgende oppgaver:

1. **Analyse**: Sjekk om beskrivelsen er klar og komplett
2. **Type-deteksjon**: Oppdage om det er bug, feature, eller begge deler
3. **Eksisterende funksjoner**: Sjekke om ønsket funksjon allerede finnes
4. **Oppfølging**: Stille 1-3 spørsmål hvis mer info trengs
5. **Forbedring**: Forbedre tittel og beskrivelse

**Eksempel på AI-output:**

```json
{
  "needsMoreInfo": false,
  "improvedTitle": "Ordre-lista viser bare 10 ordre",
  "improvedDescription": "**Problem:** Ordre-lista på dashboardet viser bare de 10 siste ordrene...",
  "detectedTypes": ["bug", "feature"],
  "existingFeature": null,
  "suggestSplit": true
}
```

---

## 🔄 Workflow Diagram

```
[Start]
   ↓
[Velg Type: Bug eller Feature]
   ↓
[Skriv Tittel og Beskrivelse]
   ↓
[AI Analyserer] ──→ Trenger mer info? ──→ [Oppfølgingsspørsmål]
   ↓                                              ↓
   NO                                      [AI Re-Analyserer]
   ↓                                              ↓
[Vis Forbedret Versjon] ←──────────────────────┘
   ↓
[Warnings hvis nødvendig:]
- Funksjon finnes allerede
- Inneholder både bug og feature
   ↓
[Bruker godkjenner]
   ↓
[Opprett GitHub Issue]
   ↓
[Vis suksess + link]
```

---

## 📦 Implementering i Nye Prosjekter

### Steg 1: Kopier Filer

```bash
# Server actions
src/app/actions/github.ts

# UI komponent
src/components/admin/ReportIssueDialog.tsx

# (Valgfri) Release notes for eksisterende funksjoner
src/lib/release-notes.ts
```

### Steg 2: Installer Dependencies

```bash
npm install sonner  # Toast notifications
# shadcn/ui komponenter
npx shadcn-ui@latest add dialog button input textarea label
```

### Steg 3: Konfigurer Miljøvariabler

Legg til i `.env`:
```bash
GITHUB_TOKEN=ghp_xxxxx
GITHUB_REPO=your-username/your-repo
FEEDBACK_AI_API_KEY=sk-xxxxx
FEEDBACK_AI_MODEL=gpt-4o
```

### Steg 4: Implementer i Appen

```tsx
// I din navbar eller admin-meny
import { ReportIssueDialog } from '~/components/admin/ReportIssueDialog';

export function Navbar() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  return (
    <nav>
      {/* Andre menyknapper */}
      <button onClick={() => setFeedbackOpen(true)}>
        Rapporter problem
      </button>

      <ReportIssueDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
      />
    </nav>
  );
}
```

### Steg 5: Tilpass for Ditt Prosjekt

**Endre systeminfo i github.ts:**
```typescript
// Legg til dine egne felter
const issueBody = `## ${typeLabel}
${data.description}

## Systeminfo
| Felt | Verdi |
|------|-------|
| **Type** | ${typeLabel} ${typeEmoji} |
| **Appversjon** | ${appVersion} |
| **Tenant** | ${session.user.tenantId} |  // Legg til dine felter
| **Miljø** | ${process.env.NODE_ENV} |
...`;
```

**Oppdater eksisterende funksjoner:**
```typescript
// I github.ts - endre getExistingFeaturesContext()
function getExistingFeaturesContext(): string {
  // Hent fra din egen release-notes fil
  // eller database
  return `
  - Funksjon 1: Beskrivelse
  - Funksjon 2: Beskrivelse
  `;
}
```

---

## 🛡️ Sikkerhet

### Best Practices

1. **API-nøkler**:
   - Aldri commit API-nøkler til git
   - Bruk miljøvariabler
   - Roter nøkler regelmessig

2. **Autentisering**:
   - Systemet krever at brukeren er innlogget
   - Bruker NextAuth session for å identifisere rapportører

3. **Rate Limiting**:
   - Vurder å legge til rate limiting for å unngå spam
   - Eksempel: Max 5 issues per bruker per time

```typescript
// Eksempel på rate limiting
const RATE_LIMIT = 5;
const RATE_WINDOW = 3600000; // 1 time

export async function createGitHubIssue(data: IssueData) {
  const session = await getServerSession(authOptions);

  // Sjekk rate limit
  const userIssuesLastHour = await db.issue.count({
    where: {
      userId: session.user.id,
      createdAt: { gte: new Date(Date.now() - RATE_WINDOW) }
    }
  });

  if (userIssuesLastHour >= RATE_LIMIT) {
    return { success: false, error: 'Du har sendt for mange rapporter. Prøv igjen senere.' };
  }

  // ... fortsett med GitHub issue opprettelse
}
```

---

## 📊 Monitorering

### Loggpunkter

Systemet logger følgende hendelser:

```typescript
// I github.ts
console.log('[Feedback AI] Starting analysis...');
console.log('[Feedback AI] Session:', session?.user?.email);
console.log('[Feedback AI] Using provider:', provider);
console.log('[Feedback AI] Calling AI...');
console.log('[Feedback AI] Success!');
console.error('[Feedback AI] Error:', error);
```

### Metrics å Overvåke

- Antall issues opprettet per dag
- AI analyse suksessrate
- Gjennomsnittlig antall oppfølgingsspørsmål
- Issues som oppdaget eksisterende funksjoner
- Issues som ble foreslått delt opp

---

## 🧪 Testing

### Test AI-analyse

```typescript
// Test lokal
const result = await analyzeWithAI({
  type: 'bug',
  title: 'Knappen virker ikke',
  description: 'Når jeg klikker på lagre-knappen skjer det ingenting'
});

console.log(result);
// Forventet: needsMoreInfo: true, med oppfølgingsspørsmål
```

### Test GitHub Issue Opprettelse

```typescript
const result = await createGitHubIssue({
  type: 'bug',
  title: 'Test issue',
  description: 'Dette er en test',
  browserInfo: 'Chrome på macOS',
  currentUrl: 'https://example.com/test',
  aiImproved: false
});

console.log(result.issueUrl);
// Sjekk at issue er opprettet i GitHub
```

---

## 🔄 Fremtidige Forbedringer

### Forslag til Utvidelser

1. **Issue Tracking i DB**
   - Lagre referanse til GitHub issue i lokal database
   - Vis brukerens egne rapporter
   - Notifikasjon når issue blir lukket

2. **Automatisk Status-oppdatering**
   - Lytt til GitHub webhooks
   - Oppdater bruker når issue endrer status
   - Send e-post ved lukking

3. **Voting System**
   - La brukere stemme på funksjonsønsker
   - Vis populære features i admin-panel
   - Prioriter basert på stemmer

4. **Screenshot Upload**
   - La brukere laste opp skjermbilder
   - Legg til i GitHub issue som vedlegg
   - Automatisk bildebeskrivelse med vision AI

5. **Duplicate Detection**
   - AI sjekker om lik issue allerede finnes
   - Foreslår å stemme på eksisterende issue
   - Reduser duplikater

---

## 📞 Support og Feilsøking

### Vanlige Problemer

**Problem: "AI er ikke konfigurert"**
- Løsning: Sjekk at `FEEDBACK_AI_API_KEY` er satt

**Problem: "Kunne ikke opprette issue i GitHub"**
- Løsning: Sjekk at `GITHUB_TOKEN` har riktige permissions
- Verifiser at `GITHUB_REPO` er korrekt format: `bruker/repo`

**Problem: "AI returnerte ingen respons"**
- Løsning: Sjekk at AI-provider er tilgjengelig
- Verifiser API-nøkkel
- Sjekk logs for feilmeldinger

**Problem: Rate limit på GitHub API**
- Løsning: GitHub har 5000 requests/time for autentiserte requests
- Implementer caching hvis nødvendig

---

## 📄 Lisens

Dette systemet kan fritt brukes i andre prosjekter. Krediter setter pris på, men er ikke påkrevd.

---

## 🙏 Takk til

- OpenAI for GPT-4 API
- GitHub for Issues API
- shadcn/ui for UI-komponenter
- Heroicons for ikoner

---

**Opprettet**: 2026-01-03
**Versjon**: 1.0
**Vedlikeholdt av**: EasyCheckout Team
