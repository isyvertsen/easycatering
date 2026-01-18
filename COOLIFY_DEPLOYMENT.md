# Coolify Deployment Guide

## Oversikt

LKC Catering System består av **5 services**:

### HTTP Services (eksponert via nginx):
1. **Backend** (FastAPI) - Port 8000 - API server
2. **Frontend** (Next.js) - Port 3000 - Web UI
3. **Flower** (optional) - Port 5555 - Workflow monitoring dashboard

### Background Services (IKKE HTTP):
4. **Workflow Worker** (Celery) - Prosesserer tasks fra Redis queue
5. **Workflow Beat** (Celery) - Scheduler som trigger workflows hvert minutt

### Infrastructure:
- **Redis** - Message broker for Celery
- **PostgreSQL** - Database (delt av backend og workflow)

## Viktig: Celery er IKKE en HTTP server

- **Workflow Worker** og **Workflow Beat** er bakgrunnsprosesser
- De trenger IKKE nginx reverse proxy
- De trenger IKKE eksponeres til internett
- De kommuniserer kun med Redis og PostgreSQL

## Coolify Setup

### Metode 1: Docker Compose (Anbefalt)

Coolify kan deploye hele stacken fra `docker-compose.yml`:

1. **Opprett nytt prosjekt i Coolify**
   - Type: Docker Compose
   - Repository: `https://github.com/isyvertsen/easycatering`
   - Branch: `main`
   - Docker Compose fil: `docker-compose.yml`

2. **Konfigurer environment variables**

   Coolify vil automatisk laste `.env` fil, men du kan også sette variabler direkte:

   ```env
   # Database
   DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@postgres:5432/catering
   POSTGRES_DB=catering
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=<generer-sterkt-passord>

   # Redis
   REDIS_URL=redis://redis:6379/0

   # Frontend
   NEXT_PUBLIC_API_URL=https://lkc.norskmatlevering.no/api
   FRONTEND_URL=https://lkc.norskmatlevering.no

   # SMTP (for workflow emails)
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=noreply@lkc.no
   SMTP_PASSWORD=<smtp-password>
   SMTP_FROM_EMAIL=noreply@lkc.no
   SMTP_FROM_NAME=Larvik Kommune Catering

   # Flower monitoring (optional)
   FLOWER_PASSWORD=<generer-sterkt-passord>

   # Security
   SECRET_KEY=<generer-med-secrets.token_urlsafe(32)>
   ```

3. **Konfigurer domener i Coolify**

   Coolify's innebygde nginx vil håndtere SSL og routing:

   - **Backend**: `lkc.norskmatlevering.no/api` → `backend:8000`
   - **Frontend**: `lkc.norskmatlevering.no` → `frontend:3000`
   - **Flower** (optional): `lkc.norskmatlevering.no/flower` → `workflow-flower:5555`

4. **Deploy**
   ```bash
   # Coolify vil automatisk:
   # - Bygge alle Docker images
   # - Starte alle services
   # - Sette opp SSL certificates (Let's Encrypt)
   # - Konfigurere nginx reverse proxy
   ```

### Metode 2: Separate Services i Coolify

Hvis du vil ha mer kontroll, kan du deploye hver service separat:

#### Service 1: Backend
- Type: Docker
- Dockerfile: `backend/Dockerfile`
- Port: 8000
- Domain: `lkc.norskmatlevering.no/api`
- Environment: Se `.env` variabler over

#### Service 2: Frontend
- Type: Docker
- Dockerfile: `frontend/Dockerfile`
- Port: 3000
- Domain: `lkc.norskmatlevering.no`
- Environment: `NEXT_PUBLIC_API_URL=https://lkc.norskmatlevering.no/api`

#### Service 3: Workflow Worker (Background)
- Type: Docker
- Dockerfile: `workflow/Dockerfile`
- **INGEN port** (ikke HTTP)
- Command: `celery -A app.celery_app worker --loglevel=info --concurrency=4 --queues=workflows,emails,default`
- Environment: Samme som backend

#### Service 4: Workflow Beat (Background)
- Type: Docker
- Dockerfile: `workflow/Dockerfile`
- **INGEN port** (ikke HTTP)
- Command: `celery -A app.celery_app beat --loglevel=info`
- Environment: Samme som backend

#### Service 5: Flower (Optional - Monitoring)
- Type: Docker
- Dockerfile: `workflow/Dockerfile`
- Port: 5555
- Domain: `lkc.norskmatlevering.no/flower` (eller subdomain)
- Command: `celery -A app.celery_app flower --port=5555 --basic_auth=admin:PASSWORD`
- Environment: `REDIS_URL=redis://redis:6379/0`

#### Infrastructure: PostgreSQL
- Type: PostgreSQL (Coolify managed service)
- Database: `catering`
- Username: `postgres`
- Port: 5432 (internal)

#### Infrastructure: Redis
- Type: Redis (Coolify managed service)
- Port: 6379 (internal)

## Nginx Konfigurasjon (Coolify Automatic)

Coolify håndterer nginx automatisk, men hvis du bruker egen nginx:

```nginx
# Backend API
location /api {
    proxy_pass http://backend:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Frontend
location / {
    proxy_pass http://frontend:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Flower monitoring (optional, med autentisering)
location /flower/ {
    auth_basic "Restricted Access";
    auth_basic_user_file /etc/nginx/.htpasswd;

    proxy_pass http://workflow-flower:5555/;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
}
```

## Health Checks

Coolify kan sjekke at services kjører:

### Backend
```bash
curl http://backend:8000/api/health
```

### Frontend
```bash
curl http://frontend:3000
```

### Workflow Worker
```bash
celery -A app.celery_app inspect ping -d worker@hostname
```

### Redis
```bash
redis-cli ping
```

### PostgreSQL
```bash
pg_isready -U postgres
```

## Logging

I Coolify dashboard kan du se logs for hver service:

```bash
# Backend logs
docker logs lkc-backend -f

# Workflow worker logs
docker logs lkc-workflow-worker -f

# Workflow beat logs
docker logs lkc-workflow-beat -f

# Flower logs (monitoring)
docker logs lkc-workflow-flower -f
```

## Monitoring

### Flower Dashboard

Gå til `https://lkc.norskmatlevering.no/flower` (eller konfigurert subdomain):

- Se aktive workers
- Overvåk task queues
- Se task history
- Monitor task execution times
- Retry failed tasks

Logg inn med:
- Username: `admin`
- Password: `<FLOWER_PASSWORD fra .env>`

### Coolify Built-in Monitoring

Coolify gir deg:
- Container status
- CPU/Memory usage
- Network traffic
- Logs

## Skalering

### Skalere Workflow Workers

Hvis du har mange workflows, kan du skalere antall workers:

**I docker-compose.yml:**
```yaml
workflow-worker:
  deploy:
    replicas: 4  # Kjør 4 worker containers
```

**I Coolify:**
- Gå til workflow-worker service
- Øk "Replicas" til ønsket antall

### Skalere Backend

```yaml
backend:
  deploy:
    replicas: 2  # Kjør 2 backend containers
```

Coolify's nginx vil automatisk load balance mellom replicas.

## Backup

### Database Backup

Coolify kan automatisk ta backup av PostgreSQL:

1. Gå til PostgreSQL service
2. Aktiver "Scheduled Backups"
3. Sett backup schedule (daglig anbefalt)

### Manual Backup

```bash
# Backup database
docker exec lkc-postgres pg_dump -U postgres catering > backup.sql

# Restore database
docker exec -i lkc-postgres psql -U postgres catering < backup.sql
```

## Troubleshooting

### Workflow tasks kjører ikke

Sjekk:
1. Er Redis tilgjengelig? `docker logs lkc-redis`
2. Kjører workflow-worker? `docker ps | grep workflow-worker`
3. Kjører workflow-beat? `docker ps | grep workflow-beat`
4. Se worker logs: `docker logs lkc-workflow-worker`

### Backend kan ikke koble til database

Sjekk:
1. Er PostgreSQL kjørende? `docker ps | grep postgres`
2. Er DATABASE_URL korrekt i .env?
3. Se backend logs: `docker logs lkc-backend`

### Frontend kan ikke nå backend

Sjekk:
1. Er NEXT_PUBLIC_API_URL korrekt?
2. Er nginx konfigurert riktig?
3. Test backend direkte: `curl http://backend:8000/api/health`

## Sikkerhet

1. **Bruk sterke passord**
   - Database password
   - Flower password
   - SECRET_KEY

2. **Begrens Flower tilgang**
   - Kun tilgjengelig for admins
   - Bruk basic auth
   - Eller kjør uten Flower i produksjon

3. **HTTPS**
   - Coolify setter automatisk opp Let's Encrypt SSL
   - Sjekk at alle domener er HTTPS

4. **Environment variables**
   - ALDRI commit `.env` til git
   - Bruk Coolify's secret management

## Oppdatering

### Via Coolify (Automatic)

1. Push kode til GitHub
2. Coolify vil automatisk detektere endringer
3. Coolify rebuilder og deployer automatisk

### Manual Redeploy

I Coolify dashboard:
1. Gå til prosjektet
2. Klikk "Redeploy"
3. Velg services å oppdatere

## Kostnader

Estimert ressursbruk for 100 kunder:

- **Backend**: 512MB RAM, 0.5 CPU
- **Frontend**: 256MB RAM, 0.25 CPU
- **Workflow Worker**: 512MB RAM, 0.5 CPU
- **Workflow Beat**: 128MB RAM, 0.1 CPU
- **Redis**: 256MB RAM
- **PostgreSQL**: 1GB RAM
- **Flower** (optional): 128MB RAM

**Total**: ~2.8GB RAM, ~2 CPU cores

## Support

For hjelp:
1. Sjekk Coolify logs
2. Sjekk container logs
3. Sjekk denne guiden
4. Kontakt utvikler
