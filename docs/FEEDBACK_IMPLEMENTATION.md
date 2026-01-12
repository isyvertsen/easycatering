# AI-Drevet Tilbakemeldingssystem - LKC Implementering

## Oversikt

Dette dokumentet beskriver implementeringen av det AI-drevne tilbakemeldingssystemet i Larvik Kommune Catering (LKC) System. Systemet kombinerer OpenAI GPT-4o for AI-analyse med automatisk opprettelse av GitHub Issues i **to separate repositories** (backend og frontend).

### Nøkkelfunksjoner
- AI velger automatisk riktig repository basert på innholdet
- Støtte for å opprette issues i begge repos samtidig
- Automatisk system-kartlegging av hva som er hvor
- Smart analyse med oppfølgingsspørsmål

## Arkitektur

```
Frontend (Next.js) → Backend (FastAPI) → OpenAI API + GitHub API
                                              ↓
                              Dual Repository Support:
                              - isyvertsen/LKCserver-backend
                              - isyvertsen/LKCserver-frontend
```

### Komponenter

**Backend:**
- `app/services/github_service.py` - GitHub API-integrasjon (støtter multiple repos)
- `app/services/feedback_ai_service.py` - AI-analyse med GPT-4o
- `app/services/system_map.py` - **NY**: System-kartlegging for AI
- `app/api/v1/feedback.py` - REST API endpoints

**Frontend:**
- `src/lib/api/feedback.ts` - API-klient
- `src/components/feedback/ReportIssueDialog.tsx` - UI-komponent (viser multiple issues)
- `src/components/layout/sidebar.tsx` - Integrasjon i sidebar

## Oppsett

### Steg 1: Lag GitHub Personal Access Token

1. Gå til GitHub: https://github.com/settings/tokens
2. Klikk **"Generate new token"** → **"Generate new token (classic)"**
3. Gi tokenet et navn: `LKC Feedback System`
4. Velg scopes:
   - ✅ `repo` (full access) - hvis private repo
   - ✅ `public_repo` - hvis offentlig repo
5. Klikk **"Generate token"**
6. **Kopier tokenet NÅ** - du får ikke se det igjen!

### Steg 2: Legg til miljøvariabler

Rediger `/Volumes/WD1tb/code/ravi/lkc/LkcServer/LKCserver-backend/.env`:

```env
# GitHub Integration (feedback system)
# VIKTIG: Samme token brukes for BEGGE repositories!
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx  # <-- Lim inn ditt token her

# Backend repository (AI oppretter issues her for backend-problemer)
GITHUB_REPO_BACKEND=isyvertsen/LKCserver-backend

# Frontend repository (AI oppretter issues her for frontend-problemer)
GITHUB_REPO_FRONTEND=isyvertsen/LKCserver-frontend
```

**VIKTIG:**
- Ikke commit `.env` til git! Den er allerede i `.gitignore`.
- Samme GitHub token brukes for begge repositories
- AI bestemmer automatisk hvilket repo som får issuen basert på innholdet

### Steg 3: Verifiser OpenAI API Key

Sjekk at OpenAI er konfigurert:

```env
OPENAI_API_KEY=sk-proj-...  # Allerede satt i .env
OPENAI_MODEL=gpt-4-turbo    # Kan oppdateres til gpt-4o for bedre ytelse
```

### Steg 4: Start servere

```bash
# Backend
cd LKCserver-backend
./scripts/start-dev.sh

# Frontend (i nytt terminalvindu)
cd LKCserver-frontend
npm run dev
```

### Steg 5: Test systemet

1. Åpne http://localhost:3000
2. Logg inn
3. Klikk **"Rapporter problem"** i sidebar (ved bunnen, over "Logg ut")
4. Test workflow:
   - Velg "Feilrapport"
   - Skriv tittel: "Test av feedback-system"
   - Skriv beskrivelse: "Dette er en test for å verifisere at systemet fungerer"
   - Klikk "Analyser med AI"
   - Gjennomgå AI-forbedret versjon
   - Klikk "Opprett issue"
5. Verifiser at issue er opprettet på GitHub

## Brukerveiledning

### Hvordan bruke feedback-systemet

1. **Klikk "Rapporter problem"** i sidebar
2. **Velg type:**
   - 🐛 **Feilrapport** - Noe virker ikke som forventet
   - ✨ **Funksjonsønske** - Forslag til ny funksjon
3. **Fyll ut:**
   - **Tittel:** Kort beskrivelse (3-200 tegn)
   - **Beskrivelse:** Detaljert forklaring (min 10 tegn)
4. **AI-analyse:** Systemet analyserer og forbedrer rapporten
5. **Oppfølging (hvis nødvendig):** AI kan stille 1-3 oppfølgingsspørsmål
6. **Gjennomgang:** Se over AI-forbedret versjon
7. **Opprettelse:** GitHub issue opprettes automatisk

### Hva AI gjør

AI-en (GPT-4o) analyserer rapporten og:

✅ Sjekker om beskrivelsen er klar og komplett
✅ Stiller oppfølgingsspørsmål hvis nødvendig
✅ Forbedrer tittel og beskrivelse
✅ Sjekker om funksjonen allerede finnes
✅ Oppdager om rapporten blander bug og feature
✅ Strukturerer beskrivelsen med overskrifter
✅ **NYT: Velger automatisk riktig repository (backend/frontend/begge)**

### Hvordan AI velger repository

AI analyserer innholdet og bestemmer om issuen tilhører:

**Backend (`isyvertsen/LKCserver-backend`):**
- API bugs (500 errors, validation errors)
- Database problemer
- Business logic feil
- Integrasjonsproblemer (Matinfo, OpenAI)
- Server performance issues

**Frontend (`isyvertsen/LKCserver-frontend`):**
- UI bugs (layout, styling)
- Form validation problemer (client-side)
- Navigation issues
- Component bugs
- UX-problemer
- Mobile layout problemer

**Begge repositories:**
- Features som krever både API OG UI
- Authentication/session bugs
- End-to-end bugs
- Datamodell-endringer

**Eksempel:**
- "Lagre-knappen i oppskriftsskjemaet har feil layout" → `frontend`
- "API returnerer 500 error når jeg henter oppskrifter" → `backend`
- "Legg til PDF-eksport av oppskrifter" → `backend + frontend`

### GitHub Issue Format

Opprettede issues inneholder:

```markdown
## Feilrapport / Funksjonsønske
[AI-forbedret beskrivelse]

## Systeminfo
| Felt | Verdi |
|------|-------|
| **Type** | Feilrapport 🐛 |
| **Appversjon** | Larvik Kommune Catering System |
| **Rapportert av** | Bruker Navn |
| **E-post** | bruker@example.com |
| **Nettleser** | Chrome på macOS |
| **Side** | /dashboard |
| **Tidspunkt** | 03.01.2026, 15:30 |
| **AI-forbedret** | Ja |
```

**Labels:**
- `bug` eller `enhancement`
- `user-reported`

## API Endpoints

### POST /v1/feedback/analyze

Analyser feedback med AI.

**Request:**
```json
{
  "type": "bug",
  "title": "Knappen virker ikke",
  "description": "Når jeg klikker på lagre skjer det ingenting",
  "answers": {
    "Hvilken knapp?": "Lagre-knappen i oppskriftsskjemaet"
  }
}
```

**Response:**
```json
{
  "success": true,
  "needsMoreInfo": false,
  "improvedTitle": "Lagre-knappen i oppskriftsskjemaet reagerer ikke",
  "improvedDescription": "**Problem:**\nNår brukeren klikker på lagre-knappen...",
  "detectedTypes": ["bug"],
  "existingFeature": null,
  "suggestSplit": false
}
```

### POST /v1/feedback/create-issue

Opprett GitHub issue.

**Request:**
```json
{
  "type": "bug",
  "title": "Lagre-knappen reagerer ikke",
  "description": "...",
  "browserInfo": "Chrome på macOS",
  "currentUrl": "http://localhost:3000/recipes",
  "aiImproved": true
}
```

**Response:**
```json
{
  "success": true,
  "issueUrl": "https://github.com/ivarsyvertsen/LkcServer/issues/123",
  "issueNumber": 123
}
```

### GET /v1/feedback/version

Hent appversjon.

**Response:**
```json
{
  "version": "Larvik Kommune Catering System"
}
```

## Feilsøking

### Problem: "AI er ikke konfigurert"

**Løsning:**
1. Sjekk at `OPENAI_API_KEY` er satt i `.env`
2. Verifiser at nøkkelen er gyldig: https://platform.openai.com/api-keys
3. Sjekk at du har kreditt på OpenAI-kontoen
4. Restart backend-serveren

### Problem: "GitHub integration not configured"

**Løsning:**
1. Sjekk at `GITHUB_TOKEN` er satt i `.env`
2. Sjekk at `GITHUB_REPO` er korrekt format: `bruker/repo`
3. Verifiser at tokenet har riktige permissions (repo scope)
4. Test tokenet manuelt:
   ```bash
   curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/user
   ```
5. Restart backend-serveren

### Problem: "Not authenticated" (401 error)

**Løsning:**
1. Sjekk at du er logget inn i frontend
2. Verifiser at NextAuth session er aktiv
3. Sjekk browser console for auth-feil
4. Prøv å logge ut og inn igjen

### Problem: AI returnerer feil format

**Løsning:**
- Systemet har innebygd fallback - rapporten går videre uten AI-forbedring
- Sjekk backend logs for detaljer
- Verifiser at OpenAI API er tilgjengelig

### Problem: GitHub API rate limit

**Løsning:**
- Autentiserte requests har 5000 requests/time
- Sjekk din rate limit status:
  ```bash
  curl -H "Authorization: Bearer $GITHUB_TOKEN" https://api.github.com/rate_limit
  ```
- Vent til reset-tidspunkt eller oppgrader GitHub-plan

## Sikkerhet

✅ **API-nøkler på backend** - GITHUB_TOKEN og OPENAI_API_KEY aldri eksponert til frontend
✅ **Autentisering påkrevd** - Alle endpoints krever innlogget bruker
✅ **Input-validering** - Pydantic validerer all input
✅ **CORS konfigurert** - Kun tillatte origins kan kalle API
✅ **GitHub token minimal scope** - Kun `repo` eller `public_repo` nødvendig

## Overvåking

Backend logger følgende hendelser:

```python
[Feedback AI] JSON parsing error: ...
[Feedback AI] OpenAI API error: ...
[Feedback AI] Unexpected error: ...
```

Sjekk backend logs for feilsøking:

```bash
cd LKCserver-backend
tail -f logs/app.log  # Hvis logging til fil
# ELLER
docker logs -f lkc-backend  # Hvis Docker
```

## Fremtidige Forbedringer

Følgende funksjoner kan legges til senere:

1. **Rate Limiting**
   - Begrens til 5 issues per bruker per time
   - Implementer med `slowapi` eller lignende

2. **Issue-historikk**
   - Lagre referanse til GitHub issue i database
   - Vis brukerens egne rapporter
   - Notifikasjon når issue blir lukket

3. **Screenshot-opplasting**
   - La brukere laste opp skjermbilder
   - Legg til i GitHub issue som vedlegg
   - Automatisk bildebeskrivelse med vision AI

4. **Duplikat-deteksjon**
   - AI sjekker om lik issue allerede finnes
   - Foreslår å stemme på eksisterende issue

5. **Webhook for statusoppdateringer**
   - Lytt til GitHub webhooks
   - Oppdater bruker når issue endrer status
   - Send e-post ved lukking

## Vedlikehold av System Map

**KRITISK VIKTIG:** Når du legger til nye features, må du oppdatere system map så AI vet hvor de hører hjemme!

### Fil å oppdatere:
`/Volumes/WD1tb/code/ravi/lkc/LkcServer/LKCserver-backend/app/services/system_map.py`

### Hva å oppdatere:

**Ved ny backend-feature:**
```python
"backend": {
    "features": [
        # ... eksisterende features
        "Din nye backend-feature her",  # LEGG TIL HER
    ]
}
```

**Ved ny frontend-feature:**
```python
"frontend": {
    "features": [
        # ... eksisterende features
        "Din nye frontend-feature her",  # LEGG TIL HER
    ]
}
```

**Ved fullstack-feature:**
```python
"both": [
    # ... eksisterende features
    "Din nye fullstack-feature",  # LEGG TIL HER
]
```

### Eksempel:

Når du legger til "E-post notifikasjoner for ordrebekreftelser":

```python
# Backend: API for å sende e-post
"backend": {
    "features": [
        # ...
        "E-post notifikasjoner for ordrebekreftelser",
    ]
}

# Frontend: UI for å konfigurere e-post settings
"frontend": {
    "features": [
        # ...
        "E-post innstillinger UI",
    ]
}
```

**Hvorfor dette er viktig:**
- AI bruker denne informasjonen til å velge riktig repository
- Hvis funksjonen ikke er dokumentert, kan AI opprette issues i feil repo
- Hjelper AI å oppdage duplikater (hvis noen rapporterer funksjon som allerede finnes)

---

## Support

For spørsmål eller problemer:
- Backend Issues: https://github.com/isyvertsen/LKCserver-backend/issues
- Frontend Issues: https://github.com/isyvertsen/LKCserver-frontend/issues
- Intern dokumentasjon: `/docs/FEEDBACK_SYSTEM.md`

---

**Opprettet:** 2026-01-03
**Sist oppdatert:** 2026-01-03
**Versjon:** 2.0 (Dual-repo support)
**Vedlikeholdt av:** LKC Development Team
