# Workflow Automation System - Mermaid Diagrams

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "Frontend - Next.js"
        UI[User Interface]
        AIChat[AI Chat Interface]
        ScriptEditor[Script Editor<br/>Monaco]
        Dashboard[Dashboard]
        History[Execution History]
        Templates[Email Templates]
    end

    subgraph "Backend - FastAPI"
        API[API Endpoints<br/>/api/v1/workflow-automation]
        AIAssistant[AI Workflow Assistant<br/>Natural Language Parser]
        DSL[Python/JS DSL<br/>Executor]
        WorkflowService[Workflow Service<br/>CRUD + Validation]
        ExecutionEngine[Execution Engine]
        EmailService[Email Service]
        ReportService[Report Service]
    end

    subgraph "Task Queue - Celery"
        Beat[Celery Beat<br/>Scheduler]
        Worker1[Celery Worker 1]
        Worker2[Celery Worker 2]
        Worker3[Celery Worker N]
    end

    subgraph "Data Layer"
        PostgreSQL[(PostgreSQL<br/>Database)]
        Redis[(Redis<br/>Message Broker)]
    end

    subgraph "Monitoring"
        Flower[Flower<br/>Celery Monitor]
    end

    subgraph "External Services"
        OpenAI[OpenAI/Anthropic<br/>AI API]
        SMTP[SMTP Server<br/>Email Delivery]
    end

    %% Frontend connections
    UI --> AIChat
    UI --> ScriptEditor
    UI --> Dashboard
    UI --> History
    UI --> Templates

    AIChat -->|Parse description| API
    ScriptEditor -->|Execute script| API
    Dashboard -->|Get metrics| API
    History -->|Get executions| API
    Templates -->|CRUD templates| API

    %% Backend API connections
    API --> AIAssistant
    API --> DSL
    API --> WorkflowService
    API --> ExecutionEngine

    AIAssistant -->|AI requests| OpenAI
    WorkflowService --> PostgreSQL
    ExecutionEngine --> EmailService
    ExecutionEngine --> ReportService
    EmailService --> SMTP

    %% Celery connections
    Beat -->|Schedule tasks| Redis
    Redis -->|Dequeue| Worker1
    Redis -->|Dequeue| Worker2
    Redis -->|Dequeue| Worker3

    Worker1 --> ExecutionEngine
    Worker2 --> ExecutionEngine
    Worker3 --> ExecutionEngine

    Worker1 --> PostgreSQL
    Worker2 --> PostgreSQL
    Worker3 --> PostgreSQL

    %% Monitoring
    Flower -.->|Monitor| Worker1
    Flower -.->|Monitor| Worker2
    Flower -.->|Monitor| Worker3
    Flower -.->|Monitor| Beat

    style AIChat fill:#a8dadc
    style AIAssistant fill:#a8dadc
    style OpenAI fill:#f1faee
    style Beat fill:#e63946
    style Redis fill:#e63946
```

## 2. AI-Driven Workflow Creation Flow

```mermaid
sequenceDiagram
    actor User
    participant UI as AI Chat Interface
    participant API as FastAPI API
    participant AI as AI Assistant
    participant LLM as OpenAI/Anthropic
    participant WF as Workflow Service
    participant DB as PostgreSQL

    User->>UI: Beskriver workflow i norsk<br/>"Send skjema mandag, reminder torsdag"
    UI->>API: POST /ai/parse-description
    API->>AI: parse_natural_language(description)
    AI->>LLM: Send prompt med description
    LLM-->>AI: JSON workflow definition
    AI-->>API: Structured workflow
    API-->>UI: Workflow preview

    UI->>User: Viser preview:<br/>📋 Ukentlig Bestilling<br/>• Mandag 09:00 - Send<br/>• Torsdag 15:00 - Remind
    User->>UI: Klikker "Opprett"

    UI->>API: POST /workflows<br/>(workflow definition)
    API->>WF: create_workflow(definition)
    WF->>WF: Validate workflow
    WF->>DB: INSERT INTO workflow_definitions
    WF->>DB: INSERT INTO workflow_steps
    WF->>DB: INSERT INTO workflow_schedules
    DB-->>WF: workflow_id
    WF-->>API: Created workflow
    API-->>UI: Success response
    UI->>User: ✅ Arbeidsflyt opprettet!

    Note over User,DB: Alternative: Script-based creation
    User->>UI: Skriver Python DSL script
    UI->>API: POST /ai/execute-script
    API->>DSL: execute_python_dsl(script)
    DSL->>WF: Calls workflow builder methods
    WF->>DB: Save workflow
```

## 3. Workflow Execution Flow

```mermaid
sequenceDiagram
    participant Beat as Celery Beat<br/>Scheduler
    participant Redis as Redis Queue
    participant Worker as Celery Worker
    participant Exec as Execution Engine
    participant DB as PostgreSQL
    participant Email as Email Service
    participant SMTP as SMTP Server
    participant Customer as Kunde

    Note over Beat: Kjører hvert minutt
    Beat->>DB: SELECT workflows<br/>WHERE next_run <= NOW()
    DB-->>Beat: Due workflows [workflow_1, ...]

    loop For hver due workflow
        Beat->>Redis: enqueue(execute_workflow_task)
    end

    Redis-->>Worker: dequeue task
    Worker->>Exec: execute_workflow(workflow_id)

    Exec->>DB: INSERT INTO workflow_executions<br/>status='running'
    DB-->>Exec: execution_id

    Exec->>DB: SELECT workflow_steps<br/>ORDER BY step_order
    DB-->>Exec: [step_1, step_2, step_3, ...]

    loop For hver step
        alt Step type: send_email
            Exec->>Email: send_emails(template, recipients)
            Email->>DB: SELECT customers WHERE active=true
            DB-->>Email: [kunde_1, kunde_2, ...]

            loop For hver kunde
                Email->>SMTP: Send email
                SMTP-->>Customer: 📧 Bestillingsskjema
                Email->>DB: INSERT INTO workflow_action_logs<br/>status='success'
            end

        else Step type: check_condition
            Exec->>DB: SELECT orders WHERE created_at > 'last_monday'
            DB-->>Exec: [order_ids]
            Exec->>DB: SELECT customers WHERE NOT IN (order_customers)
            DB-->>Exec: [missing_customers]
            Exec->>DB: INSERT INTO workflow_action_logs<br/>result_data={missing_customers}

        else Step type: wait_until
            Exec->>Exec: Calculate next trigger time
            Exec->>Redis: enqueue_at(next_step, trigger_time)
        end

        Exec->>DB: UPDATE workflow_action_logs<br/>status='completed'
    end

    Exec->>DB: UPDATE workflow_executions<br/>status='completed'
    Exec->>DB: UPDATE workflow_schedules<br/>next_run = calculate_next()

    Note over Worker,DB: Error handling
    alt Step fails
        Exec->>DB: UPDATE workflow_action_logs<br/>status='failed', error_message
        Exec->>Exec: Retry with backoff
        alt Max retries exceeded
            Exec->>DB: UPDATE workflow_executions<br/>status='failed'
            Exec->>Email: Send alert to admin
        end
    end
```

## 4. Database Schema

```mermaid
erDiagram
    WORKFLOW_DEFINITIONS ||--o{ WORKFLOW_STEPS : contains
    WORKFLOW_DEFINITIONS ||--o| WORKFLOW_SCHEDULES : has
    WORKFLOW_DEFINITIONS ||--o{ WORKFLOW_EXECUTIONS : runs
    WORKFLOW_EXECUTIONS ||--o{ WORKFLOW_ACTION_LOGS : produces
    WORKFLOW_STEPS ||--o{ WORKFLOW_ACTION_LOGS : executed_as
    EMAIL_TEMPLATES ||--o{ WORKFLOW_STEPS : used_in

    WORKFLOW_DEFINITIONS {
        int id PK
        string name
        text description
        boolean is_active
        string workflow_type "scheduled|event_based"
        int created_by FK
        timestamp created_at
        timestamp updated_at
    }

    WORKFLOW_STEPS {
        int id PK
        int workflow_id FK
        int step_order
        string step_type "send_email|check_condition|create_order|wait_until"
        string trigger_type "time_based|condition_based"
        jsonb trigger_config "{day:monday,time:09:00}"
        jsonb action_config "{template_id:1,recipients:...}"
        jsonb condition_config "{check:orders_missing,days_back:3}"
        boolean is_active
    }

    WORKFLOW_SCHEDULES {
        int id PK
        int workflow_id FK
        string schedule_type "daily|weekly|monthly|cron"
        jsonb schedule_config "{day:monday,time:09:00}"
        timestamp next_run
        timestamp last_run
    }

    WORKFLOW_EXECUTIONS {
        int id PK
        int workflow_id FK
        timestamp started_at
        timestamp completed_at
        string status "running|completed|failed|paused"
        int current_step
        text error_message
    }

    WORKFLOW_ACTION_LOGS {
        int id PK
        int execution_id FK
        int step_id FK
        string action_type
        int target_id "kunde_id|order_id"
        string target_type "customer|order"
        timestamp performed_at
        string status "success|failed|skipped"
        jsonb result_data
        text error_message
    }

    EMAIL_TEMPLATES {
        int id PK
        string name
        string subject
        text body_html
        text body_text
        jsonb variables "{kunde_navn,bestilling_link}"
        string category "bestilling|reminder|confirmation"
        timestamp created_at
        timestamp updated_at
    }
```

## 5. Celery Task Queue Architecture

```mermaid
graph TB
    subgraph "Scheduler"
        Beat[Celery Beat<br/>Cron: every 1 minute]
        Schedule[Workflow Schedules<br/>next_run timestamps]
    end

    subgraph "Message Broker"
        Redis[Redis]
        DefaultQueue[default queue]
        EmailQueue[email queue<br/>priority: high]
        ReportQueue[report queue<br/>priority: low]
    end

    subgraph "Workers"
        W1[Worker 1<br/>Concurrency: 4]
        W2[Worker 2<br/>Concurrency: 4]
        W3[Worker 3<br/>Email specialist]
    end

    subgraph "Tasks"
        ExecuteWorkflow[execute_workflow_task]
        ExecuteStep[execute_step_task]
        SendEmails[send_emails_batch_task]
        CheckCondition[check_condition_task]
        GenerateReport[generate_report_task]
    end

    subgraph "Results"
        ResultBackend[(Redis<br/>Result Backend)]
        DB[(PostgreSQL<br/>Action Logs)]
    end

    Beat -->|Check due workflows| Schedule
    Schedule -->|Enqueue tasks| DefaultQueue

    DefaultQueue --> ExecuteWorkflow
    DefaultQueue --> ExecuteStep
    EmailQueue --> SendEmails
    DefaultQueue --> CheckCondition
    ReportQueue --> GenerateReport

    ExecuteWorkflow -->|Fan out| ExecuteStep
    ExecuteStep -->|Delegate| SendEmails
    ExecuteStep -->|Delegate| CheckCondition

    W1 -->|Consume| DefaultQueue
    W2 -->|Consume| DefaultQueue
    W3 -->|Consume| EmailQueue

    SendEmails -->|Store result| ResultBackend
    CheckCondition -->|Store result| ResultBackend
    GenerateReport -->|Store result| ResultBackend

    SendEmails -->|Log action| DB
    CheckCondition -->|Log action| DB
    GenerateReport -->|Log action| DB

    style Beat fill:#e63946
    style Redis fill:#e63946
    style EmailQueue fill:#f4a261
    style W3 fill:#f4a261
```

## 6. AI Natural Language Processing Flow

```mermaid
graph TB
    UserInput[User Input:<br/>'Send skjema mandag,<br/>reminder torsdag']

    subgraph "AI Assistant Processing"
        Parse[Parse Description]
        Extract[Extract Entities:<br/>• Actions: send, remind<br/>• Times: mandag, torsdag<br/>• Targets: skjema, customers]
        Structure[Structure Workflow:<br/>• Identify steps<br/>• Set schedules<br/>• Map templates]
        Validate[Validate:<br/>• Required fields<br/>• Valid times<br/>• Template exists]
        Generate[Generate JSON:<br/>WorkflowDefinition]
    end

    subgraph "LLM Processing"
        SystemPrompt[System Prompt:<br/>'Du er workflow-assistent...']
        Context[Context:<br/>• Available templates<br/>• Customer groups<br/>• Previous workflows]
        LLM[OpenAI GPT-4 /<br/>Anthropic Claude]
        JSON[JSON Response]
    end

    Enhance[Enhance with AI:<br/>• Suggest improvements<br/>• Add error handling<br/>• Optimize timing]

    Preview[Preview for User:<br/>📋 Workflow navn<br/>• Step 1<br/>• Step 2<br/>• Step 3]

    UserInput --> Parse
    Parse --> Extract
    Extract --> Structure
    Structure --> Validate

    Validate -->|Send to LLM| SystemPrompt
    SystemPrompt --> Context
    Context --> LLM
    LLM --> JSON

    JSON --> Generate
    Generate --> Enhance
    Enhance --> Preview

    style LLM fill:#a8dadc
    style Preview fill:#f1faee
```

## 7. Workflow Execution State Machine

```mermaid
stateDiagram-v2
    [*] --> Scheduled: Workflow created
    Scheduled --> Queued: next_run reached
    Queued --> Running: Worker picks up task

    Running --> ExecutingStep1: Start first step
    ExecutingStep1 --> ExecutingStep2: Step 1 success
    ExecutingStep2 --> ExecutingStep3: Step 2 success
    ExecutingStep3 --> Completed: All steps success

    ExecutingStep1 --> Retrying: Step failed
    ExecutingStep2 --> Retrying: Step failed
    ExecutingStep3 --> Retrying: Step failed

    Retrying --> ExecutingStep1: Retry attempt 1-3
    Retrying --> Failed: Max retries exceeded

    Running --> Paused: Manual pause
    Paused --> Running: Resume

    Completed --> Scheduled: Schedule next run
    Failed --> [*]: Manual intervention needed

    note right of Running
        Logs every action to
        workflow_action_logs
    end note

    note right of Completed
        Updates:
        • workflow_executions.status
        • workflow_schedules.next_run
        • workflow_schedules.last_run
    end note
```

## 8. Frontend Component Hierarchy

```mermaid
graph TB
    App[App Router<br/>/app/main/automation]

    subgraph "Main Pages"
        Dashboard[Dashboard<br/>/automation/page.tsx]
        WorkflowList[Workflow List<br/>/workflows/page.tsx]
        WorkflowNew[New Workflow<br/>/workflows/new/page.tsx]
        WorkflowEdit[Edit Workflow<br/>/workflows/id/page.tsx]
        ExecutionList[Executions<br/>/executions/page.tsx]
        ExecutionDetail[Execution Detail<br/>/executions/id/page.tsx]
        TemplateList[Templates<br/>/templates/page.tsx]
    end

    subgraph "Workflow Creation Modes"
        AIChat[AI Chat Interface]
        ScriptEditor[Script Editor<br/>Monaco]
        TemplateGallery[Template Gallery]
    end

    subgraph "Shared Components"
        WorkflowPreview[Workflow Preview<br/>Read-only]
        ExecutionHistory[Execution History<br/>Timeline]
        ExecutionLogs[Log Viewer<br/>JSON]
        EmailEditor[Email Template Editor<br/>TipTap]
        StatusBadge[Status Badge]
        MetricsCard[Metrics Card]
    end

    subgraph "API Layer"
        useWorkflows[useWorkflows hook]
        useAIWorkflow[useAIWorkflow hook]
        useExecutions[useExecutions hook]
        useTemplates[useTemplates hook]
        APIClient[workflow-automation.ts]
    end

    App --> Dashboard
    App --> WorkflowList
    App --> WorkflowNew
    App --> WorkflowEdit
    App --> ExecutionList
    App --> ExecutionDetail
    App --> TemplateList

    WorkflowNew --> AIChat
    WorkflowNew --> ScriptEditor
    WorkflowNew --> TemplateGallery

    Dashboard --> MetricsCard
    Dashboard --> ExecutionHistory
    WorkflowList --> StatusBadge
    WorkflowEdit --> WorkflowPreview
    ExecutionDetail --> ExecutionLogs
    TemplateList --> EmailEditor

    AIChat --> useAIWorkflow
    ScriptEditor --> useAIWorkflow
    WorkflowList --> useWorkflows
    ExecutionList --> useExecutions
    TemplateList --> useTemplates

    useWorkflows --> APIClient
    useAIWorkflow --> APIClient
    useExecutions --> APIClient
    useTemplates --> APIClient

    style AIChat fill:#a8dadc
    style useAIWorkflow fill:#a8dadc
```

## 9. Data Flow: Complete Workflow Lifecycle

```mermaid
graph LR
    subgraph "1. Creation"
        User[User describes<br/>workflow]
        AI[AI parses to<br/>JSON]
        Save[Save to DB]
    end

    subgraph "2. Scheduling"
        Beat[Celery Beat<br/>checks every minute]
        Check{next_run<br/>reached?}
        Queue[Enqueue task]
    end

    subgraph "3. Execution"
        Worker[Worker picks up]
        Execute[Execute steps]
        Log[Log results]
    end

    subgraph "4. Completion"
        Update[Update status]
        NextRun[Calculate next_run]
        Notify[Notify admin<br/>if failed]
    end

    subgraph "5. Monitoring"
        Dashboard[User views<br/>dashboard]
        History[Execution history]
        Metrics[Success metrics]
    end

    User --> AI
    AI --> Save
    Save --> Beat

    Beat --> Check
    Check -->|Yes| Queue
    Check -->|No| Beat
    Queue --> Worker

    Worker --> Execute
    Execute --> Log
    Log --> Update

    Update --> NextRun
    Update --> Notify
    NextRun --> Beat

    Log --> Dashboard
    Log --> History
    Update --> Metrics

    style AI fill:#a8dadc
    style Execute fill:#e63946
    style Dashboard fill:#f1faee
```
