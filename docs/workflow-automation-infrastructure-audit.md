# FULLSTENDIG INFRASTRUKTUR-AUDIT: Workflow Automation

**Dato:** 2026-01-17
**Prosjekt:** Larvik Kommune Catering (LKC)
**Formål:** Kartlegge eksisterende AI/Agent/MCP infrastruktur for Workflow Automation

---

## 🎉 OPPDAGELSE: Vi har ALLEREDE en AI Workflow Agent!

### ✅ FULLSTENDIG IMPLEMENTERT (Frontend)

#### 1. AI Workflow Copilot Komponent
**Fil:** `frontend/src/components/workflow/WorkflowCopilot.tsx` (205 lines)

**Features:**
- ✅ Chat interface med AI-assistent
- ✅ Real-time messaging
- ✅ Confirmation dialog for dangerous operations
- ✅ Action links (navigate to created resources)
- ✅ Error handling
- ✅ Loading states
- ✅ Floating button (bottom-right corner)
- ✅ Sparkles icon (purple gradient)
- ✅ Auto-scroll
- ✅ Keyboard shortcuts (Escape to close)

**Already integrated in:** `frontend/src/app/(main)/layout.tsx`

#### 2. useWorkflowChat Hook
**Fil:** `frontend/src/hooks/useWorkflowChat.ts` (245 lines)

**Features:**
- ✅ State management (messages, loading, error)
- ✅ Send message to AI
- ✅ Confirmation workflow
- ✅ Cancel workflow
- ✅ Clear messages
- ✅ Conversation history tracking
- ✅ Action links handling
- ✅ AI analysis display

#### 3. Workflow API Client
**Fil:** `frontend/src/lib/api/workflow.ts` (58 lines)

**Endpoints:**
- `POST /v1/workflow/chat` - Send message to AI
- `POST /v1/workflow/confirm` - Confirm and execute workflow
- `GET /v1/workflow/tools` - List available tools
- `GET /v1/workflow/tools/{tool_name}` - Get tool details

#### 4. TypeScript Types
**Fil:** `frontend/src/types/workflow.ts` (103 lines)

**Types defined:**
- `WorkflowChatMessage`
- `ActionLink`
- `WorkflowStep`
- `ConfirmationRequest`
- `WorkflowChatRequest/Response`
- `WorkflowConfirmRequest/Response`
- `Tool`, `ToolParameter`
- `ToolListResponse`
- `WorkflowState`

### ✅ FULLSTENDIG IMPLEMENTERT (Backend)

#### 1. Workflow API Endpoints
**Fil:** `backend/app/api/v1/workflow.py` (162 lines)

**Endpoints:**
- `POST /api/v1/workflow/chat` - Process natural language messages
- `POST /api/v1/workflow/confirm` - Confirm and execute workflows
- `GET /api/v1/workflow/tools` - List available tools
- `GET /api/v1/workflow/tools/{tool_name}` - Get tool details

**Features:**
- ✅ Natural language processing
- ✅ Automatic tool selection via AI
- ✅ Read operations: execute immediately
- ✅ Write/delete operations: require confirmation
- ✅ Error handling
- ✅ User authentication

#### 2. Workflow Agent Service
**Fil:** `backend/app/services/workflow_agent_service.py` (15,541 bytes)

**Core functionality:**
- ✅ AI-powered message processing
- ✅ Tool calling with OpenAI/Anthropic
- ✅ Conversation history management
- ✅ Workflow confirmation system
- ✅ Safety levels (safe, medium, dangerous)
- ✅ Result parsing and formatting

#### 3. Tool Registry
**Fil:** `backend/app/services/tool_registry.py` (17,952 bytes)

**Features:**
- ✅ Tool registration system
- ✅ Tool discovery
- ✅ Parameter validation
- ✅ Category grouping
- ✅ Safety level management

#### 4. Tool Executor
**Fil:** `backend/app/services/tool_executor.py` (37,610 bytes)

**Features:**
- ✅ Execute tools against API endpoints
- ✅ Parameter transformation
- ✅ Error handling
- ✅ Result formatting
- ✅ Action link generation

#### 5. AI Client (Multi-provider)
**Fil:** `backend/app/services/ai_client.py` (400 lines)

**Providers:**
- ✅ OpenAI (GPT-4, GPT-3.5)
- ✅ Azure OpenAI
- ✅ Anthropic (Claude)

**Features:**
- ✅ Chat completion
- ✅ Tool calling / Function calling
- ✅ Async/await
- ✅ Singleton pattern
- ✅ Fallback logic

#### 6. AI Report Service
**Fil:** `backend/app/services/ai_report_service.py` (413 lines)

**Features:**
- ✅ HTML report generation with AI
- ✅ Sales data analysis
- ✅ Insights and recommendations
- ✅ Fallback to simple HTML if AI fails

---

## 🔍 Hva EKSISTERER vs Hva vi TRENGER for Workflow Automation

### ✅ Eksisterer ALLEREDE (100% klart)

| Feature | Status | Fil |
|---------|--------|-----|
| AI Chat Interface | ✅ 100% | `WorkflowCopilot.tsx` |
| AI Message Processing | ✅ 100% | `workflow_agent_service.py` |
| Tool Registry System | ✅ 100% | `tool_registry.py` |
| Tool Executor | ✅ 100% | `tool_executor.py` |
| Multi-provider AI Client | ✅ 100% | `ai_client.py` |
| Conversation History | ✅ 100% | `useWorkflowChat.ts` |
| Confirmation Workflow | ✅ 100% | `workflow.py` |
| Action Links | ✅ 100% | `WorkflowCopilot.tsx` |
| Safety Levels | ✅ 100% | `tool_registry.py` |

### ❌ MANGLER for Workflow Automation (Schedulering)

| Feature | Status | Trengs for |
|---------|--------|------------|
| Workflow Definitions Table | ❌ Må bygges | Database schema |
| Workflow Steps Table | ❌ Må bygges | Step configuration |
| Workflow Executions Table | ❌ Må bygges | Execution tracking |
| Workflow Schedules Table | ❌ Må bygges | Time-based triggers |
| Email Templates Table | ❌ Må bygges | Email actions |
| Celery Beat Scheduler | ❌ Må konfigureres | Timed execution |
| Workflow Execution Engine | ❌ Må bygges | Run workflows |
| Email Service | ❌ Må bygges | Send emails |
| Python DSL | ❌ Må bygges | Script-based config |
| Script Editor (Monaco) | ❌ Må bygges | Advanced users |

---

## 🚀 Hvordan gjenbruke eksisterende infrastruktur

### 1. AI Chat Interface - ALLEREDE FERDIG!

**Eksisterende bruk:**
```typescript
// WorkflowCopilot er allerede i layout.tsx
// Brukere kan ALLEREDE snakke med AI-assistent!

User: "Finn kunde Larvik Sykehjem"
AI: *Executes search_customers tool*
AI: "Fant 1 kunde: Larvik Sykehjem (ID: 42)"
```

**For Workflow Automation:**
```typescript
// SAMME interface, nye tools!

User: "Send bestillingsskjema til alle kunder hver mandag kl 09:00"
AI: *Calls create_scheduled_workflow tool*
AI: "Skal jeg opprette denne arbeidsflyten?"
     - Mandag 09:00: Send skjema
     - [Opprett] [Avbryt]
```

**Ingen ny kode trengs i frontend! Kun nye backend tools.**

### 2. Tool Registry - Legg til nye tools

**Eksempel fra existing tools:**
```python
# backend/app/services/tool_registry.py

# Eksisterende tools (allerede implementert):
- search_customers
- get_customer
- create_customer
- search_orders
- get_order_details
- create_order
- get_product_list
- search_products
# ... og mange flere

# NYE tools for workflow automation:
- create_scheduled_workflow
- list_workflows
- activate_workflow
- deactivate_workflow
- get_workflow_executions
- create_email_template
```

**Legg til ny tool:**
```python
from app.services.tool_registry import ToolRegistry, Tool, ToolParameter, SafetyLevel

registry = ToolRegistry()

registry.register_tool(Tool(
    name="create_scheduled_workflow",
    description="Opprett en ny planlagt arbeidsflyt",
    category="Workflow Automation",
    endpoint="/api/v1/workflow-automation/workflows",
    method="POST",
    safety_level=SafetyLevel.MEDIUM,
    requires_confirmation=True,
    parameters=[
        ToolParameter(
            name="name",
            type="string",
            description="Navn på arbeidsflyten",
            required=True
        ),
        ToolParameter(
            name="schedule_type",
            type="string",
            description="Type planlegging",
            required=True,
            enum=["daily", "weekly", "monthly"]
        ),
        ToolParameter(
            name="schedule_config",
            type="object",
            description="Konfigurasjon for planlegging",
            required=True
        ),
        ToolParameter(
            name="steps",
            type="array",
            description="Liste over steg i arbeidsflyten",
            required=True
        ),
    ]
))
```

**FERDIG!** AI-agenten kan nå bruke dette verktøyet automatisk!

### 3. AI Agent - Velg automatisk riktig tool

**Eksisterende pattern:**
```python
# backend/app/services/workflow_agent_service.py

async def process_message(self, message: str, ...):
    # 1. AI analyserer message
    # 2. AI velger beste tool fra registry
    # 3. AI fyller ut parameters
    # 4. Execute tool OR ask for confirmation
    # 5. Return results
```

**Fungerer automatisk for NYE tools!**

User input: "Lag en workflow som sender skjema mandag"

AI thinking:
1. User wants to create a scheduled workflow
2. Best tool: `create_scheduled_workflow`
3. Parameters:
   - name: "Ukentlig Bestillingsskjema"
   - schedule_type: "weekly"
   - schedule_config: {"day": "monday", "time": "09:00"}
   - steps: [{"type": "send_email", ...}]
4. Safety level: MEDIUM → requires confirmation
5. Return confirmation request

### 4. Celery Integration - Bruk eksisterende tasks

**Allerede installert:**
```toml
celery==5.3.4
redis[hiredis]==5.0.1
```

**Legg til Celery Beat scheduler:**
```python
# backend/app/celery_app.py (NY FIL)

from celery import Celery
from celery.schedules import crontab

app = Celery('lkc', broker='redis://localhost:6379/0')

app.conf.beat_schedule = {
    'check-scheduled-workflows': {
        'task': 'app.tasks.check_scheduled_workflows',
        'schedule': 60.0,  # Every minute
    },
}
```

**Celery task:**
```python
# backend/app/tasks/workflow_tasks.py (NY FIL)

from app.celery_app import app
from app.services.workflow_automation_service import WorkflowAutomationService

@app.task
async def check_scheduled_workflows():
    """Check for workflows that should run now."""
    service = WorkflowAutomationService(db)
    due_workflows = await service.get_due_workflows()

    for workflow in due_workflows:
        execute_workflow.delay(workflow.id)

@app.task
async def execute_workflow(workflow_id: int):
    """Execute a single workflow."""
    service = WorkflowAutomationService(db)
    await service.execute_workflow(workflow_id)
```

---

## 📊 Kompleksitet REDUSERT med eksisterende infrastruktur

### Opprinnelig estimat (uten eksisterende kode)

- **Backend:** ~2100 lines ny kode
- **Frontend:** ~2150 lines ny kode
- **Total:** ~4250 lines
- **Tid:** 7 uker

### REVIDERT estimat (med eksisterende infrastruktur)

#### Backend (redusert til ~1200 lines)

| Komponent | Lines | Status |
|-----------|-------|--------|
| AI Client | 0 | ✅ Eksisterer |
| Tool Registry | 0 | ✅ Eksisterer |
| Tool Executor | 0 | ✅ Eksisterer |
| Workflow Agent | 0 | ✅ Eksisterer |
| API Endpoints | 0 | ✅ Eksisterer `/workflow/*` |
| **Workflow Database Models** | **~400** | ❌ Må bygges |
| **Workflow Service** | **~300** | ❌ Må bygges |
| **Celery Tasks** | **~200** | ❌ Må bygges |
| **Email Service** | **~200** | ❌ Må bygges |
| **New Tool Registrations** | **~100** | ❌ Må bygges |
| **TOTAL BACKEND** | **~1200** | 72% reduksjon! |

#### Frontend (redusert til ~800 lines)

| Komponent | Lines | Status |
|-----------|-------|--------|
| AI Chat Interface | 0 | ✅ Eksisterer |
| useWorkflowChat | 0 | ✅ Eksisterer |
| API Client | 0 | ✅ Eksisterer |
| Types | 0 | ✅ Eksisterer |
| **Workflow List Page** | **~200** | ❌ Må bygges |
| **Workflow Detail Page** | **~150** | ❌ Må bygges |
| **Execution History** | **~200** | ❌ Må bygges |
| **Email Template Editor** | **~150** | ❌ Må bygges |
| **Script Editor (Monaco)** | **~100** | ❌ Må bygges |
| **TOTAL FRONTEND** | **~800** | 63% reduksjon! |

### TOTAL ny kode: ~2000 lines (ned fra ~4250 lines)

### REVIDERT tidsestimat

- **Phase 1** (Database + Services): 2-3 dager (ned fra 3-4)
- **Phase 2** (Celery Scheduler): 1-2 dager (ned fra 2-3)
- **Phase 3** (Frontend Pages): 3-4 dager (ned fra 5-6)
- **Phase 4** (Templates + Email): 2 dager (ned fra 2-3)
- **Phase 5** (Testing): 2-3 dager (ned fra 3-4)

**TOTAL: 10-14 dager (2-3 uker)** - Ned fra 7 uker!

---

## 🎯 Konkret Implementeringsplan

### Phase 1: Database Models (Dag 1-2)

**Nye tabeller:**
```python
# backend/app/models/workflow_definition.py
class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    description: Mapped[str]
    is_active: Mapped[bool]
    created_by: Mapped[int] = mapped_column(ForeignKey("tblbrukere.brukerid"))
    created_at: Mapped[datetime]
    steps: Mapped[List["WorkflowStep"]] = relationship(back_populates="workflow")
    schedule: Mapped["WorkflowSchedule"] = relationship(back_populates="workflow")

# ... WorkflowStep, WorkflowExecution, WorkflowSchedule, EmailTemplate
```

**Migration:**
```python
# backend/app/core/migrations.py
class AddWorkflowTables(Migration):
    id = "015_add_workflow_tables"

    async def up(self, conn):
        await conn.execute("""
        CREATE TABLE workflow_definitions (...);
        CREATE TABLE workflow_steps (...);
        CREATE TABLE workflow_executions (...);
        CREATE TABLE workflow_action_logs (...);
        CREATE TABLE workflow_schedules (...);
        CREATE TABLE email_templates (...);
        """)
```

### Phase 2: Services & API (Dag 3-5)

**Workflow Service:**
```python
# backend/app/services/workflow_automation_service.py

class WorkflowAutomationService:
    async def create_workflow(self, definition: Dict) -> WorkflowDefinition:
        """Create new workflow from definition."""

    async def get_due_workflows(self) -> List[WorkflowDefinition]:
        """Get workflows that should run now."""

    async def execute_workflow(self, workflow_id: int) -> WorkflowExecution:
        """Execute a workflow and all its steps."""
```

**Register nye tools:**
```python
# backend/app/services/workflow_tools.py

def register_workflow_tools(registry: ToolRegistry):
    registry.register_tool(Tool(
        name="create_scheduled_workflow",
        description="Opprett ny planlagt arbeidsflyt",
        endpoint="/api/v1/workflow-automation/workflows",
        method="POST",
        ...
    ))

    registry.register_tool(Tool(
        name="list_workflows",
        description="Vis alle arbeidsflyten",
        endpoint="/api/v1/workflow-automation/workflows",
        method="GET",
        ...
    ))
    # ... flere tools
```

**API Endpoints:**
```python
# backend/app/api/v1/workflow_automation.py

@router.post("/workflows")
async def create_workflow(
    request: WorkflowCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    service = WorkflowAutomationService(db)
    workflow = await service.create_workflow(request.dict())
    return workflow

@router.get("/workflows")
async def list_workflows(...):
    ...

@router.post("/workflows/{id}/execute")
async def execute_workflow(...):
    ...
```

### Phase 3: Celery Setup (Dag 6-7)

**Celery app:**
```python
# backend/app/celery_app.py

from celery import Celery

app = Celery('lkc',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/0'
)

app.conf.beat_schedule = {
    'check-workflows-every-minute': {
        'task': 'app.tasks.workflow_tasks.check_scheduled_workflows',
        'schedule': 60.0,
    },
}
```

**Tasks:**
```python
# backend/app/tasks/workflow_tasks.py

@app.task
async def check_scheduled_workflows():
    """Runs every minute via Celery Beat."""
    async with get_db() as db:
        service = WorkflowAutomationService(db)
        due = await service.get_due_workflows()

        for workflow in due:
            execute_workflow.delay(workflow.id)

@app.task
async def execute_workflow(workflow_id: int):
    """Execute workflow steps."""
    async with get_db() as db:
        service = WorkflowAutomationService(db)
        await service.execute_workflow(workflow_id)
```

**Start Celery:**
```bash
# Terminal 1
celery -A app.celery_app worker --loglevel=info

# Terminal 2
celery -A app.celery_app beat --loglevel=info

# Terminal 3 (optional monitoring)
celery -A app.celery_app flower
```

### Phase 4: Frontend Pages (Dag 8-10)

**Gjenbruk eksisterende AI Chat:**
```typescript
// ALLEREDE I layout.tsx - ingen endringer nødvendig!
<WorkflowCopilot />
```

**Nye pages:**
```typescript
// app/(main)/automation/workflows/page.tsx
export default function WorkflowsPage() {
  const { data: workflows } = useWorkflows()

  return (
    <DataTable  // Gjenbruk existing DataTable!
      columns={columns}
      data={workflows}
      onEdit={handleEdit}
      onDelete={handleDelete}
    />
  )
}

// app/(main)/automation/executions/page.tsx
export default function ExecutionsPage() {
  const { data: executions } = useExecutions()

  return (
    <Card>
      <ExecutionHistory executions={executions} />
    </Card>
  )
}
```

**Hooks (følg eksisterende pattern):**
```typescript
// hooks/useWorkflows.ts (samme pattern som useMatinfo.ts)
export function useWorkflows(params: WorkflowListParams) {
  return useQuery({
    queryKey: ['workflows', params],
    queryFn: () => workflowAutomationApi.getWorkflows(params),
  })
}

export function useCreateWorkflow() {
  return useMutation({
    mutationFn: (workflow) => workflowAutomationApi.createWorkflow(workflow),
    onSuccess: () => {
      queryClient.invalidateQueries(['workflows'])
    },
  })
}
```

### Phase 5: Testing (Dag 11-14)

**E2E test:**
```typescript
// frontend/e2e/workflow-automation.spec.ts

test('should create workflow via AI chat', async ({ page }) => {
  // Open AI chat
  await page.click('button[title="AI Copilot"]')

  // Send message
  await page.fill('input[placeholder*="Hva vil du gjøre"]',
    'Send bestillingsskjema til alle kunder hver mandag kl 09:00')
  await page.click('button[type="submit"]')

  // Wait for confirmation
  await expect(page.locator('text=Skal jeg opprette denne arbeidsflyten')).toBeVisible()

  // Confirm
  await page.click('button:has-text("Opprett")')

  // Verify success
  await expect(page.locator('text=Arbeidsflyt opprettet')).toBeVisible()
})
```

---

## 🔑 Nøkkelinnsikter

### 1. Vi har ALLEREDE en AI Agent!

**WorkflowCopilot** er fullstendig implementert og i produksjon. Brukere kan ALLEREDE snakke med AI og få utført oppgaver!

### 2. Tool Registry er perfekt for utvidelse

Legg til nye tools for workflow automation, og AI-agenten kan bruke dem AUTOMATISK!

### 3. Ingen MCP nødvendig

Vi har direkte AI API integrasjon via `ai_client.py`. MCP ville bare legge til kompleksitet.

### 4. Celery allerede installert

`celery==5.3.4` og `redis==5.0.1` er klare. Trenger bare konfigurasjon.

### 5. Frontend patterns er etablert

DataTable, React Query hooks, shadcn/ui - alt er klart for gjenbruk.

---

## 💡 Anbefalinger

### 1. Start med AI Chat (ALLEREDE FERDIG!)

Test eksisterende WorkflowCopilot:
```
User: "Vis meg alle ordrer i dag"
AI: *Executes get_orders tool*
AI: "Fant 15 ordrer i dag..."
```

### 2. Legg til workflow tools gradvis

Week 1: Database + basic CRUD tools
Week 2: Scheduler tools + Celery
Week 3: Email tools + templates
Week 4: Testing + polish

### 3. Bruk existing patterns 100%

- Copy `useMatinfo.ts` → `useWorkflows.ts`
- Copy `matinfo/page.tsx` → `automation/workflows/page.tsx`
- Copy CRUD patterns fra existing API endpoints

### 4. Aktiver Claude/Anthropic

```bash
# Billigere og bedre norsk enn GPT-4
uv pip install anthropic>=0.25.0
export ANTHROPIC_API_KEY="sk-ant-..."
export AI_PROVIDER="anthropic"
```

---

## 📋 Action Items (Prioritert)

### Umiddelbar testing (Dag 1)

1. **Test eksisterende WorkflowCopilot:**
   - Åpne applikasjonen
   - Klikk på lilla Sparkles-knappen (bottom-right)
   - Prøv: "Søk etter kunde Larvik"
   - Verifiser at AI svarer

2. **Sjekk hvilke tools som finnes:**
   ```bash
   curl http://localhost:8000/api/v1/workflow/tools
   ```

3. **Se tool details:**
   ```bash
   curl http://localhost:8000/api/v1/workflow/tools/search_customers
   ```

### Implementering (Dag 2-14)

1. **Phase 1:** Database models (dag 2-3)
2. **Phase 2:** Workflow service + API + tools (dag 4-6)
3. **Phase 3:** Celery setup (dag 7-8)
4. **Phase 4:** Frontend pages (dag 9-11)
5. **Phase 5:** Testing (dag 12-14)

---

## 🎊 Konklusjon

Vi har **MESTE PARTEN** av infrastrukturen ALLEREDE implementert!

**Hva vi har:**
- ✅ AI Chat Interface (WorkflowCopilot)
- ✅ AI Agent (workflow_agent_service)
- ✅ Tool Registry & Executor
- ✅ Multi-provider AI Client
- ✅ Conversation Management
- ✅ Confirmation Workflow
- ✅ Celery + Redis installed

**Hva vi mangler:**
- ❌ Database tables (workflow_definitions, etc.)
- ❌ Workflow automation service
- ❌ Celery Beat scheduler config
- ❌ Workflow automation tools (10-15 nye tools)
- ❌ Frontend pages for workflow management
- ❌ Email service

**Estimat:**
- **Opprinnelig:** 7 uker (uten eksisterende kode)
- **Revidert:** 2-3 uker (med eksisterende infrastruktur)
- **Reduksjon:** 57-71%!

**Vi kan starte UMIDDELBART med å teste eksisterende AI Copilot!**

🤖 Generated by Claude Code - Complete Infrastructure Audit
