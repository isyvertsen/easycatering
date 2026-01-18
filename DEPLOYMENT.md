# LKC Catering System - Deployment Overview

## 🏗️ Arkitektur

Systemet består av **3 separate applikasjoner**:

```
easycatering/
├── backend/          # FastAPI API (HTTP server, port 8000)
├── frontend/         # Next.js UI (HTTP server, port 3000)
└── workflow/         # Celery workers (IKKE HTTP - background tasks)
```

### Hva er Celery?

**Celery er IKKE en HTTP server** - det er et task queue system for bakgrunnsjobber.

- **Workflow Worker**: Prosesserer tasks (send email, kjør workflows)
- **Workflow Beat**: Scheduler som trigger tasks på bestemte tider
- **Flower**: Monitoring dashboard (dette ER en HTTP server på port 5555)

**Viktig**: Worker og Beat trenger **IKKE** nginx reverse proxy fordi de ikke har HTTP interface.

## 📦 Services

### HTTP Services (via nginx):
1. **Backend** (FastAPI) - `https://lkc.norskmatlevering.no/api`
2. **Frontend** (Next.js) - `https://lkc.norskmatlevering.no`
3. **Flower** (optional) - `https://lkc.norskmatlevering.no/flower`

### Background Services (kun intern kommunikasjon):
4. **Workflow Worker** - Prosesserer tasks fra Redis
5. **Workflow Beat** - Scheduler (trigger workflows hvert minutt)

### Infrastructure:
- **Redis** - Message broker for Celery
- **PostgreSQL** - Database

## 🚀 Deployment Options

### Option 1: Coolify (Anbefalt for Produksjon)

Coolify håndterer alt automatisk: SSL, nginx, Docker, monitoring.

👉 **Se [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)** for full guide

**Quick start:**
1. Opprett prosjekt i Coolify
2. Velg Docker Compose
3. Repository: `https://github.com/isyvertsen/easycatering`
4. Sett environment variables fra `.env.example`
5. Deploy!

Coolify vil automatisk:
- Bygge alle Docker images
- Starte alle 5 services
- Sette opp SSL certificates
- Konfigurere nginx reverse proxy
- Monitore health checks

### Option 2: Docker Compose (Lokal/Testing)

```bash
# Kopier environment variables
cp .env.example .env
# Rediger .env med dine verdier

# Start alle services
docker-compose up -d

# Se logs
docker-compose logs -f

# Stopp alle services
docker-compose down
```

**Tilgang:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000/api
- Flower monitoring: http://localhost:5555

### Option 3: Lokal Development

```bash
# Terminal 1: Backend
cd backend
uv pip install -r pyproject.toml
./scripts/start-dev.sh

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Workflow Worker
cd workflow
export PYTHONPATH="../backend:."
./scripts/start-worker.sh

# Terminal 4: Workflow Beat
cd workflow
export PYTHONPATH="../backend:."
./scripts/start-beat.sh

# Terminal 5 (optional): Flower
cd workflow
./scripts/start-flower.sh
```

## 🔧 Nginx Configuration

**For Coolify**: Coolify har innebygd nginx - du trenger ikke konfigurere selv.

**For egen nginx**: Se `nginx/conf.d/lkc.conf`

Viktige regler:
```nginx
# Backend API
location /api {
    proxy_pass http://backend:8000;
}

# Frontend
location / {
    proxy_pass http://frontend:3000;
}

# Flower monitoring (optional, med auth)
location /flower/ {
    auth_basic "Restricted";
    proxy_pass http://workflow-flower:5555/;
}
```

**Merk**: Worker og Beat trenger IKKE nginx config fordi de ikke har HTTP.

## 📊 Service Dependencies

```
                ┌─────────────┐
                │   Nginx     │
                │ (Coolify)   │
                └──────┬──────┘
                       │
          ┌────────────┼────────────┐
          │                         │
    ┌─────▼─────┐            ┌─────▼─────┐
    │  Backend  │            │ Frontend  │
    │  :8000    │            │  :3000    │
    └─────┬─────┘            └───────────┘
          │
          │
    ┌─────▼──────┐
    │ PostgreSQL │
    │   :5432    │
    └─────┬──────┘
          │
    ┌─────▼────────────────────────┐
    │         Redis :6379          │
    └─────┬────────────────────────┘
          │
          ├──────┬──────────┬─────────┐
          │      │          │         │
    ┌─────▼──┐ ┌─▼───────┐ ┌▼──────┐ │
    │Worker  │ │ Beat    │ │Flower │ │
    │(Celery)│ │(Celery) │ │:5555  │ │
    └────────┘ └─────────┘ └───────┘ │
          │                           │
          └───────────────────────────┘
             (Workflow Service)
```

## 🔐 Security Checklist

- [ ] Sett sterke passord i `.env`
- [ ] Generer SECRET_KEY: `python -c 'import secrets; print(secrets.token_urlsafe(32))'`
- [ ] Aktiver HTTPS (Coolify gjør dette automatisk)
- [ ] Begrens Flower tilgang med basic auth
- [ ] ALDRI commit `.env` til git
- [ ] Bruk miljøvariabler for alle secrets

## 📈 Monitoring

### Coolify Dashboard
- Container status
- CPU/Memory usage
- Logs for alle services
- Auto-restart ved crashes

### Flower Dashboard (Workflow Monitoring)
URL: `https://lkc.norskmatlevering.no/flower`

Se:
- Aktive workers
- Task queues (workflows, emails, default)
- Task history og success rate
- Failed tasks (med retry)

### Health Checks

```bash
# Backend
curl https://lkc.norskmatlevering.no/api/health

# Frontend
curl https://lkc.norskmatlevering.no

# Workflow Worker (fra server)
docker exec lkc-workflow-worker celery -A app.celery_app inspect ping
```

## 🔄 Updates & Rollback

### Via Coolify (Automatic)
1. Push til GitHub
2. Coolify detekterer endringer
3. Rebuilder og deployer automatisk

### Manual Redeploy
```bash
# I Coolify dashboard
Click "Redeploy" på prosjektet
```

### Rollback
```bash
# I Coolify dashboard
Click "Rollback to previous version"
```

## 📝 Environment Variables

Se `.env.example` for full liste.

**Minimum required:**
```env
DATABASE_URL=postgresql+asyncpg://...
REDIS_URL=redis://redis:6379/0
SECRET_KEY=<generer-dette>
NEXT_PUBLIC_API_URL=https://lkc.norskmatlevering.no/api

# SMTP for workflow emails
SMTP_HOST=smtp.office365.com
SMTP_USER=noreply@lkc.no
SMTP_PASSWORD=<smtp-password>
```

## 🐛 Troubleshooting

### Workflows kjører ikke
**Problem**: Celery worker eller beat er nede

**Løsning**:
```bash
# Sjekk worker status
docker logs lkc-workflow-worker

# Sjekk beat status
docker logs lkc-workflow-beat

# Restart services
docker-compose restart workflow-worker workflow-beat
```

### Backend kan ikke koble til database
**Problem**: DATABASE_URL er feil eller PostgreSQL er nede

**Løsning**:
```bash
# Sjekk PostgreSQL
docker logs lkc-postgres

# Test connection
docker exec lkc-backend python -c "from app.infrastructure.database.session import get_engine; import asyncio; asyncio.run(get_engine().dispose())"
```

### Frontend viser "API not available"
**Problem**: NEXT_PUBLIC_API_URL peker feil sted

**Løsning**:
1. Sjekk at `NEXT_PUBLIC_API_URL` er riktig i `.env`
2. Rebuild frontend: `docker-compose up -d --build frontend`

## 📚 Documentation

- **[COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)** - Full Coolify deployment guide
- **[WORKFLOW_MIGRATION.md](./WORKFLOW_MIGRATION.md)** - Workflow service architecture
- **[workflow/README.md](./workflow/README.md)** - Workflow service details
- **[backend/README.md](./backend/README.md)** - Backend API documentation
- **[frontend/README.md](./frontend/README.md)** - Frontend documentation

## 💡 Quick Commands

```bash
# Start everything locally
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f workflow-worker

# Stop everything
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# Scale workers
docker-compose up -d --scale workflow-worker=4

# Access Flower monitoring
open http://localhost:5555
```

## 🎯 Production Checklist

Før production deployment:

- [ ] Kopier `.env.example` til `.env`
- [ ] Sett alle required environment variables
- [ ] Generer sterke passord og secrets
- [ ] Konfigurer SMTP for email sending
- [ ] Test workflows manuelt
- [ ] Verifiser SSL certificates
- [ ] Sett opp database backups
- [ ] Aktiver Coolify monitoring
- [ ] Test alle API endpoints
- [ ] Test frontend UI
- [ ] Sjekk Flower dashboard

## 📞 Support

For hjelp:
1. Sjekk denne guiden
2. Se [COOLIFY_DEPLOYMENT.md](./COOLIFY_DEPLOYMENT.md)
3. Sjekk logs: `docker-compose logs -f <service-name>`
4. Kontakt utvikler
