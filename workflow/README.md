# Workflow Automation Service

Separat service for å kjøre automatiserte workflows med Celery og Redis.

## Oversikt

Denne servicen kjører som en egen container og håndterer:
- **Celery Workers**: Prosesserer workflow tasks i bakgrunnen
- **Celery Beat**: Scheduler som sjekker for workflows som skal kjøres
- **Workflow Execution**: Kjører workflow-steg (send email, sjekk betingelser, etc.)

## Arkitektur

```
workflow/
├── app/
│   ├── celery_app.py          # Celery konfigurasjon
│   ├── tasks/                  # Celery tasks
│   │   └── workflow_tasks.py
│   ├── services/               # Business logic
│   │   └── execution_engine.py
│   ├── models/                 # Database models (importert fra backend)
│   ├── schemas/                # Pydantic schemas (importert fra backend)
│   └── core/                   # Config og utilities
│       └── config.py
├── scripts/
│   ├── start-worker.sh         # Start Celery worker
│   ├── start-beat.sh           # Start Celery Beat
│   └── start-flower.sh         # Start Flower monitoring
├── Dockerfile                  # Docker image for workflow service
├── pyproject.toml              # Python dependencies
└── README.md
```

## Dependencies

- **Backend**: Deler database models og schemas med backend
- **Redis**: Message broker og result backend
- **PostgreSQL**: Database (same som backend)

## Kjøring

### Lokalt (development)

```bash
# Start worker
./scripts/start-worker.sh

# Start scheduler (i egen terminal)
./scripts/start-beat.sh

# Start monitoring (optional)
./scripts/start-flower.sh
```

### Docker

```bash
# Build image
docker build -t lkc-workflow .

# Run worker
docker run --name workflow-worker \
  --env-file ../.env \
  --network lkc-network \
  lkc-workflow worker

# Run beat
docker run --name workflow-beat \
  --env-file ../.env \
  --network lkc-network \
  lkc-workflow beat
```

### Docker Compose

```bash
# Start alle services
docker-compose up -d

# Se logs
docker-compose logs -f workflow-worker
docker-compose logs -f workflow-beat
```

## Environment Variables

Se `.env` fil i rot-katalogen. Viktige variabler:

- `REDIS_URL`: Redis connection URL
- `DATABASE_URL`: PostgreSQL connection URL
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email konfigurasjon

## Monitoring

Flower dashboard er tilgjengelig på `http://localhost:5555` når du kjører `start-flower.sh`.

## Tasks

### Scheduled Tasks

- **check-scheduled-workflows**: Kjører hvert minutt for å finne workflows som skal kjøres

### Manual Tasks

- **execute_workflow**: Kjør en workflow manuelt
- **execute_step**: Kjør et enkelt steg

## Testing

```bash
# Test Celery connection
uv run python -c "from app.celery_app import app; print(app.conf)"

# Trigger test workflow
uv run python -c "
from app.tasks.workflow_tasks import ExecuteWorkflowTask
ExecuteWorkflowTask().apply_async(args=[1])
"
```
