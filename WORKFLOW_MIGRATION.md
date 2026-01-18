# Workflow Service Migration

## Oversikt

Workflow automation er nå separert fra backend og kjører som en egen service.

## Katalogstruktur

```
easycatering/
├── backend/                    # FastAPI backend API
│   ├── app/
│   │   ├── api/v1/
│   │   │   └── workflow_automation.py  # API endpoints for workflow admin
│   │   ├── models/
│   │   │   └── workflow_*.py           # Database models (delt med workflow)
│   │   ├── schemas/
│   │   │   └── workflow_automation.py  # Pydantic schemas (delt)
│   │   └── services/
│   │       └── workflow_automation_service.py  # CRUD operations
│   └── pyproject.toml
│
├── workflow/                   # Workflow automation service (NY)
│   ├── app/
│   │   ├── celery_app.py                      # Celery konfigurasjon
│   │   ├── tasks/
│   │   │   └── workflow_tasks.py              # Celery tasks
│   │   ├── services/
│   │   │   └── execution_engine.py            # Workflow execution logic
│   │   └── core/
│   │       └── config.py                      # Config (imports fra backend)
│   ├── scripts/
│   │   ├── start-worker.sh                    # Start Celery worker
│   │   ├── start-beat.sh                      # Start Celery Beat
│   │   └── start-flower.sh                    # Start Flower monitoring
│   ├── Dockerfile
│   ├── docker-compose.workflow.yml
│   ├── pyproject.toml
│   └── README.md
│
└── frontend/                   # Next.js frontend
    └── ...
```

## Hva er flyttet

### Fra backend/ til workflow/:

1. **Celery konfigurasjon**: `backend/app/celery_app.py` → `workflow/app/celery_app.py`
2. **Workflow tasks**: `backend/app/tasks/` → `workflow/app/tasks/`
3. **Execution engine**: `backend/app/services/workflow_execution_engine.py` → `workflow/app/services/execution_engine.py`
4. **Start scripts**: `backend/scripts/start-celery-*.sh` → `workflow/scripts/start-*.sh`

### Hva forblir i backend/:

- **API endpoints**: `/api/v1/workflow-automation/*` (CRUD operasjoner)
- **Database models**: `app/models/workflow_*.py` (importeres av workflow service)
- **Pydantic schemas**: `app/schemas/workflow_automation.py`
- **Service layer**: `app/services/workflow_automation_service.py` (get_due_workflows, etc.)
- **Tool registry**: WorkflowCopilot AI tools

## Hvordan det fungerer

### Backend (FastAPI)

- Tilbyr REST API for å administrere workflows
- Håndterer CRUD operasjoner (create, list, update, delete)
- Lagrer workflows i database
- Registrerer workflow tools for AI WorkflowCopilot

### Workflow Service (Celery)

- **Worker**: Prosesserer workflow execution tasks
- **Beat**: Scheduler som sjekker for workflows som skal kjøres (hvert minutt)
- **Flower**: Monitoring dashboard (optional)

### Import-strategi

Workflow service importerer direkte fra backend:
- Database models (`app.models.workflow_*`)
- Schemas (`app.schemas.workflow_automation`)
- Services (`app.services.workflow_automation_service`)

Dette gjøres ved å legge til backend i PYTHONPATH:

```python
# workflow/app/__init__.py
from pathlib import Path
import sys

backend_path = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_path))
```

## Kjøring

### Lokalt (Development)

```bash
# Terminal 1: Backend API
cd backend
./scripts/start-dev.sh

# Terminal 2: Workflow Worker
cd workflow
./scripts/start-worker.sh

# Terminal 3: Workflow Beat
cd workflow
./scripts/start-beat.sh

# Terminal 4 (optional): Flower monitoring
cd workflow
./scripts/start-flower.sh
# Gå til http://localhost:5555 (admin/admin)
```

### Docker Compose

```bash
# Fra rot-katalogen
docker-compose -f workflow/docker-compose.workflow.yml up -d

# Se logs
docker-compose -f workflow/docker-compose.workflow.yml logs -f workflow-worker
docker-compose -f workflow/docker-compose.workflow.yml logs -f workflow-beat
```

## Environment Variables

workflow service deler `.env` fil med backend. Viktige variabler:

```env
# Redis (message broker)
REDIS_URL=redis://localhost:6379/0

# Database (delt med backend)
DATABASE_URL=postgresql+asyncpg://...

# SMTP (for email sending)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=password
SMTP_FROM_EMAIL=noreply@lkc.no
```

## Deployment

### Produksjon (Docker)

1. **Build images**:
   ```bash
   docker build -f workflow/Dockerfile -t lkc-workflow:latest .
   ```

2. **Run services**:
   ```bash
   # Worker
   docker run -d --name workflow-worker \
     --env-file .env \
     -e PYTHONPATH=/app/backend:/app/workflow \
     lkc-workflow:latest worker

   # Beat
   docker run -d --name workflow-beat \
     --env-file .env \
     -e PYTHONPATH=/app/backend:/app/workflow \
     lkc-workflow:latest beat
   ```

### Kubernetes

Se `k8s/workflow/` for Kubernetes manifests (kommer).

## Fordeler med denne strukturen

1. **Separation of Concerns**: Backend API og workflow execution er separate services
2. **Skalering**: Kan skalere workers uavhengig av backend
3. **Deployment**: Kan deploye hver service separat
4. **Feilhåndtering**: Hvis worker crasher, påvirkes ikke backend API
5. **Monitoring**: Egen monitoring for workflow execution (Flower)
6. **Testing**: Enklere å teste workflow execution isolert

## Migrasjon fra gammel struktur

Hvis du har kode som importerer fra backend/app/celery_app.py eller backend/app/tasks/, må du:

1. Oppdatere imports til å peke på workflow service
2. Eller kjøre workflow service i stedet

Eksempel:

```python
# GAMMEL kode i backend
from app.tasks.workflow_tasks import execute_workflow
execute_workflow.delay(workflow_id)

# NY kode (samme, men kjøres fra workflow service)
from app.tasks.workflow_tasks import ExecuteWorkflowTask
ExecuteWorkflowTask().apply_async(args=[workflow_id])
```

Backend API endpoints fungerer som før - ingen endringer nødvendig for frontend.

## Testing

```bash
# Test at workflow service kan importere backend
cd workflow
export PYTHONPATH="../backend:."
uv run python -c "from app.celery_app import app; print('OK')"

# Test at tasks er registrert
uv run python -c "from app.celery_app import app; print(list(app.tasks.keys()))"

# Trigger test workflow
uv run python -c "
from app.tasks.workflow_tasks import ExecuteWorkflowTask
result = ExecuteWorkflowTask().apply_async(args=[1])
print(f'Task ID: {result.id}')
"
```

## Spørsmål?

Se:
- `workflow/README.md` for mer detaljer om workflow service
- `backend/docs/workflow-automation-infrastructure-audit.md` for teknisk dokumentasjon
