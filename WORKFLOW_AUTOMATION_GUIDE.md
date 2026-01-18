# Workflow Automation Guide

## Oversikt

Dette systemet lar brukere opprette automatiserte arbeidsflyter via **AI-chat** eller **REST API**.

## 🎯 Bruksscenarier

### Scenario 1: Automatisk ukentlig påminnelse til kunder
```
Bruker skriver i AI-chatten:
"Send e-post til alle kunder hver mandag kl 08:00 med påminnelse om å bestille mat"
```

### Scenario 2: Daglig lagersjekk
```
Bruker skriver:
"Sjekk lager hver dag kl 06:00 og send varsel hvis noe er lavt"
```

### Scenario 3: Påminnelse til kunder uten bestillinger
```
Bruker skriver:
"Send påminnelse hver fredag kl 14:00 til kunder som ikke har bestilt på 3 dager"
```

## 🚀 Kom i gang

### 1. Start backend og frontend

```bash
# Backend (port 8000)
cd backend
./scripts/start-dev.sh

# Frontend (port 3000)
cd frontend
npm run dev
```

### 2. Start Celery Worker (for å kjøre workflows)

```bash
cd workflow
./scripts/start-worker.sh
```

### 3. Start Celery Beat (scheduler)

```bash
cd workflow
./scripts/start-beat.sh
```

## 💬 Bruke AI Chat til å opprette workflows

### Steg 1: Åpne AI Chat
- Klikk på AI-ikonet nederst til høyre i brukergrensesnittet
- Chat-vinduet åpnes

### Steg 2: Beskriv hva du vil automatisere
Eksempler:
```
"Opprett en arbeidsflyt som sender e-post til alle kunder hver mandag kl 08:00"

"Jeg vil at systemet automatisk skal sjekke lager daglig kl 06:00"

"Send påminnelse til kunder som ikke har bestilt på 3 dager, hver fredag kl 14:00"
```

### Steg 3: Bekreft opprettelsen
AI-en vil vise deg:
- Navn på arbeidsflyten
- Beskrivelse
- Når den kjører (cron-schedule)
- Hva den gjør (steg)

Klikk **Bekreft** for å opprette.

### Steg 4: Se arbeidsflyten i admin
- Gå til **System → Arbeidsflyter** i menyen
- Du ser nå den nyopprettede arbeidsflyten
- Status: Aktiv ✅

## 🛠️ Administrere workflows

### Se alle workflows
Navigasjon: **System → Arbeidsflyter**

### Handlinger
- **▶️ Aktiver/Pause**: Toggle aktiv status
- **▶️ Kjør nå**: Kjør workflow manuelt (test)
- **👁️ Se detaljer**: Vis steg og kjøreplan
- **🗑️ Slett**: Fjern workflow permanent

### Statistikk
- **Totalt**: Antall workflows i systemet
- **Aktive**: Workflows som kjører automatisk
- **Inaktive**: Workflows som er pauset

## 📋 Workflow Steg-typer

### 1. Send E-post (`send_email`)
Sender e-post til kunder.

**Recipients:**
- `all_active_customers`: Alle aktive kunder
- `specific_customers`: Spesifikke kunder (krever kunde-IDer)
- `customers_by_group`: Kunder i en gruppe (f.eks. "sykehjem")

**Eksempel:**
```json
{
  "step_type": "send_email",
  "step_name": "Send påminnelse",
  "action_config": {
    "recipients": "all_active_customers",
    "subject": "Husk å bestille mat",
    "body_text": "Ikke glem å bestille mat for neste uke!"
  }
}
```

### 2. Sjekk Betingelse (`check_condition`)
Sjekker om en betingelse er oppfylt.

**Betingelser:**
- `orders_missing`: Kunder som ikke har bestilt på X dager
- `low_inventory`: Produkter med lav lagerbeholdning

### 3. Vent (`wait_until`)
Venter til en betingelse er oppfylt før neste steg.

### 4. Opprett Ordre (`create_order`)
Oppretter en ordre automatisk.

## ⏰ Cron Schedule

Workflows bruker cron-uttrykk for å definere når de skal kjøre.

### Format
```
minutt time dag måned ukedag
```

### Eksempler
| Beskrivelse | Cron | Forklaring |
|-------------|------|------------|
| Hver mandag kl 08:00 | `0 8 * * 1` | Minutt=0, Time=8, Ukedag=1 (mandag) |
| Daglig kl 06:00 | `0 6 * * *` | Hver dag kl 06:00 |
| Hver fredag kl 18:00 | `0 18 * * 5` | Fredag kl 18:00 |
| Hvert 30. minutt | `*/30 * * * *` | Hver halvtime |
| Hverdager kl 09:00 | `0 9 * * 1-5` | Mandag-fredag kl 09:00 |

### Ukedager
- 0 = Søndag
- 1 = Mandag
- 2 = Tirsdag
- 3 = Onsdag
- 4 = Torsdag
- 5 = Fredag
- 6 = Lørdag

## 🧪 Testing

### Test en workflow manuelt
1. Gå til **System → Arbeidsflyter**
2. Finn workflowen du vil teste
3. Klikk **▶️ Kjør nå**
4. Workflowen kjører umiddelbart
5. Sjekk execution history for resultater

### Se execution history
```bash
# Via API
curl -X GET http://localhost:8000/api/v1/workflow-automation/executions \
  -H "Authorization: Bearer YOUR_TOKEN"

# Via AI Chat
"Vis kjøringshistorikk for arbeidsflyt 1"
```

## 🔧 Feilsøking

### Workflow kjører ikke automatisk
**Problem**: Celery Beat er ikke startet

**Løsning**:
```bash
cd workflow
./scripts/start-beat.sh
```

### Workflow feiler ved kjøring
**Problem**: Celery Worker er ikke startet

**Løsning**:
```bash
cd workflow
./scripts/start-worker.sh
```

### Sjekk Celery status
```bash
# Celery worker ping
docker exec lkc-workflow-worker celery -A app.celery_app inspect ping

# Celery beat status
docker exec lkc-workflow-beat celery -A app.celery_app inspect scheduled
```

### Se Flower Dashboard
Flower er et web-basert monitoring tool for Celery.

```bash
# Start Flower
cd workflow
./scripts/start-flower.sh

# Åpne i nettleser
http://localhost:5555

# Logg inn
Brukernavn: admin
Passord: admin
```

## 📊 Monitoring

### Via Flower Dashboard
- **Tasks**: Se alle tasks i køen
- **Workers**: Se worker status
- **Monitor**: Sanntids grafer
- **Broker**: Redis status

### Via API
```bash
# Workflow statistikk
GET /api/v1/workflow-automation/workflows/{id}/statistics

# Execution history
GET /api/v1/workflow-automation/executions
```

## 🔐 Sikkerhet

- Alle workflows krever autentisering
- Destruktive operasjoner krever bekreftelse
- Workflows opprettes med user context (created_by)
- Kun administratorer kan slette workflows

## 📚 Eksempler på AI-kommandoer

### Opprette workflows
```
"Opprett en arbeidsflyt som sender e-post til alle kunder hver mandag kl 08:00"
"Automatiser daglig lagersjekk kl 06:00"
"Send påminnelse til kunder uten bestillinger hver fredag"
```

### Administrere workflows
```
"Vis alle mine arbeidsflyter"
"Deaktiver arbeidsflyt nummer 3"
"Slett arbeidsflyt 'Ukentlig påminnelse'"
"Kjør arbeidsflyt 5 nå"
```

### Se status
```
"Vis statistikk for arbeidsflyt 1"
"Hvilke arbeidsflyter har feilet?"
"Når kjørte arbeidsflyt 3 sist?"
```

## 🎓 Lær mer

- **Backend API**: http://localhost:8000/api/docs
- **Tool Registry**: GET /api/v1/workflow/tools
- **Workflow Automation API**: GET /api/v1/workflow-automation/workflows
- **Celery Docs**: https://docs.celeryq.dev/
- **Cron Guru** (cron helper): https://crontab.guru/

---

**Utviklet med assistanse fra Claude Code**
