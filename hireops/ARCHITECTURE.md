# HireOps Architecture Document

This document outlines the system architecture for **HireOps** across five primary viewpoints. These views ensure all aspects of the application—from logical separation and user interaction to runtime behavior and concrete infrastructure—are appropriately designed and documented.

---

## 1. Logical / Functional View
**Diagram Type**: Block Diagram / Layered Architecture  
**Purpose**: Shows system components and their relationships in a layered approach.

This diagram demonstrates how the codebase is logically separated. The Next.js frontend acts as the Presentation Layer, communicating via REST/WebSockets to the FastAPI API Gateway. Business logic is isolated in core services or delegated to background tasks.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryTextColor': '#000000', 'lineColor': '#000000' }}}%%
flowchart TD
    classDef presentation fill:#e0f2fe,stroke:#0284c7,color:#000000,stroke-width:2px;
    classDef logic fill:#dcfce7,stroke:#16a34a,color:#000000,stroke-width:2px;
    classDef data fill:#ffedd5,stroke:#ea580c,color:#000000,stroke-width:2px;
    classDef external fill:#f3f4f6,stroke:#4b5563,color:#000000,stroke-width:2px;

    subgraph Presentation_Layer["Presentation Layer (Next.js 14)"]
        UI["UI Components (React/Tailwind)"]:::presentation
        State["State Management (Zustand)"]:::presentation
        ClientAPI["API Client (Axios/Fetch)"]:::presentation
        
        UI <--> State
        State <--> ClientAPI
    end

    subgraph API_Layer["API Layer (FastAPI)"]
        Router["API Routers (v1)"]:::logic
        AuthCtx["Auth & Permissions"]:::logic
        
        Router <--> AuthCtx
    end

    subgraph Business_Layer["Business Logic Layer"]
        Services["Core Services (Workflow/Agentic)"]:::logic
        TaskQueue["Task Delegation (Celery Async)"]:::logic
    end

    subgraph Data_Layer["Data Access & Storage Layer"]
        ORM["SQLAlchemy Models / Repositories"]:::data
        DB[(PostgreSQL)]:::data
        Cache[(Redis Cache / Message Broker)]:::data
        
        ORM <--> DB
    end

    subgraph External_Integrations["External Services"]
        LiveKitCloud["LiveKit SDK (WebRTC)"]:::external
    end

    %% Layer Interactions
    Presentation_Layer == " HTTPS | WSS " === API_Layer
    Presentation_Layer -.-> | Client SDK | LiveKitCloud
    API_Layer <--> Business_Layer
    Business_Layer <--> Data_Layer
    
    Services ---> ORM
    TaskQueue ---> Cache
    Services -.-> | Server API calls | LiveKitCloud
```

---

## 2. Use Case View
**Diagram Type**: Use Case Diagram  
**Purpose**: Shows user interactions with the system and defines the system's boundary.

Displays the primary actors (Candidates and HR/Managers) interacting with the HireOps platform, as well as backend system actors (like the AI System) that trigger automated background tasks.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryTextColor': '#000000', 'lineColor': '#000000' }}}%%
flowchart LR
    classDef actor fill:#f3f4f6,stroke:#4b5563,color:#000000,stroke-width:2px;
    classDef usecase fill:#e0f2fe,stroke:#0284c7,color:#000000,stroke-width:2px;
    classDef system_uc fill:#dcfce7,stroke:#16a34a,color:#000000,stroke-width:2px;

    %% Actors
    Candidate["👤 Candidate"]:::actor
    HR["👔 HR / Manager"]:::actor
    System["🤖 Backend System"]:::actor

    %% Use Cases
    subgraph HireOps Platform
        UC1(["Register / Login"]):::usecase
        UC2(["View Job Board"]):::usecase
        UC3(["Apply for Job"]):::usecase
        UC4(["Upload / Parse Resume"]):::usecase
        UC5(["Manage Job Postings"]):::usecase
        UC6(["Review Candidates"]):::usecase
        
        UC7(["AI NLP Resume Parsing"]):::system_uc
        UC8(["Run Bulk Invites"]):::system_uc
    end

    %% Relationships
    Candidate --> UC1
    Candidate --> UC2
    Candidate --> UC3
    Candidate --> UC4

    HR --> UC1
    HR --> UC5
    HR --> UC6
    HR --> UC8

    System -.->|Triggers off| UC4
    System --> UC7
```

---

## 3. Implementation / System View
**Diagram Type**: Component Diagram  
**Purpose**: Details the physical code structure, modules, and packages.

This view highlights how the application is physically split into different services, frameworks, and modules inside the monorepo, including Docker containers and internal dependencies.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryTextColor': '#000000', 'lineColor': '#000000' }}}%%
classDiagram
    class FrontendApp {
        <<Next.js 14 App Router>>
        +(auth)
        +(tenant) dashboard
        +jobs board
    }
    class APIClient {
        <<React Hooks / Lib>>
        +fetch()
    }
    class FastAPIServer {
        <<Web Framework>>
        +main.py
    }
    class APIRouters {
        <<Endpoints>>
        +api/v1/auth
        +api/v1/jobs
        +api/v1/candidates
    }
    class Services {
        <<Domain Logic>>
    }
    class CeleryWorker {
        <<Background Worker>>
        +parse_resume_task()
        +send_invites_task()
    }
    class LiveKitCloud {
        <<External WebRTC Service>>
        +video_rooms
    }
    class Database {
        <<PostgreSQL>>
    }
    class RedisBroker {
        <<Redis>>
    }

    style FrontendApp fill:#e0f2fe,stroke:#0284c7,color:#000000
    style APIClient fill:#e0f2fe,stroke:#0284c7,color:#000000
    style FastAPIServer fill:#dcfce7,stroke:#16a34a,color:#000000
    style APIRouters fill:#dcfce7,stroke:#16a34a,color:#000000
    style Services fill:#dcfce7,stroke:#16a34a,color:#000000
    style CeleryWorker fill:#dcfce7,stroke:#16a34a,color:#000000
    style LiveKitCloud fill:#f3f4f6,stroke:#4b5563,color:#000000
    style Database fill:#ffedd5,stroke:#ea580c,color:#000000
    style RedisBroker fill:#ffedd5,stroke:#ea580c,color:#000000

    FrontendApp --> APIClient : Uses
    FrontendApp -.-> LiveKitCloud : Direct Media Stream
    APIClient --> FastAPIServer : HTTP JSON Request
    FastAPIServer *-- APIRouters : Mounts
    APIRouters --> Services : Calls
    Services --> CeleryWorker : Dispatches via Broker
    Services --> Database : Reads / Writes
    Services -.-> LiveKitCloud : Room Token Generation
    CeleryWorker --> RedisBroker : Listens for Tasks
    FastAPIServer --> RedisBroker : Publishes Events
```

---

## 4. Process / Thread View
**Diagram Type**: Sequence Diagram  
**Purpose**: Shows runtime behavior, workflows, and threads for a complex process.

This diagram traces a typical complex asynchronous workflow: a candidate uploading a resume, which is parsed by an AI backend worker while the frontend listens for real-time progress updates.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryTextColor': '#000000', 'textColor': '#000000', 'lineColor': '#000000', 'noteTextColor': '#000000' }}}%%
sequenceDiagram
    box rgba(224, 242, 254, 0.4) Presentation Layer
        actor Candidate
        participant UI as Next.js Frontend
    end
    box rgba(220, 252, 231, 0.4) API & Logic Layer
        participant API as FastAPI Backend
        participant Celery as Celery Worker
    end
    box rgba(255, 237, 213, 0.4) Data Access
        participant DB as PostgreSQL
        participant Redis as Redis Broker
    end

    Candidate->>UI: Uploads Resume (PDF)
    UI->>API: POST /api/v1/candidates/resume
    API->>DB: Save status (`parsing_pending`)
    API->>Redis: Enqueue `parse_resume_task`
    API-->>UI: 202 Accepted (Task ID returned)
    
    UI->>API: Connect WebSocket (/api/v1/ws/candidate)
    UI-->>Candidate: Show "Parsing Document..." loader

    Celery->>Redis: Pop `parse_resume_task`
    Celery->>Celery: Execute NLP Logic (Heavy thread)
    Celery->>DB: Update candidate schema with parsed data
    Celery->>Redis: Publish Pub/Sub Event (`resume_parsed`)
    
    Redis-->>API: Receive Pub/Sub notification
    API-->>UI: Send WebSocket Frame (Success & Data)
    UI-->>Candidate: Render Parsed Resume to DOM
```

---

## 5. Deployment View
**Diagram Type**: Deployment Diagram  
**Purpose**: Shows servers, nodes, infrastructure configuration, and networking.

This illustrates how the platform runs natively inside a Docker Compose environment (or analogous Cloud/Kubernetes cluster) showing ports, internal networking, and external facing interfaces.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'background': '#ffffff', 'primaryTextColor': '#000000', 'lineColor': '#000000' }}}%%
flowchart TD
    classDef presentation fill:#e0f2fe,stroke:#0284c7,color:#000000,stroke-width:2px;
    classDef logic fill:#dcfce7,stroke:#16a34a,color:#000000,stroke-width:2px;
    classDef data fill:#ffedd5,stroke:#ea580c,color:#000000,stroke-width:2px;
    classDef external fill:#f3f4f6,stroke:#4b5563,color:#000000,stroke-width:2px;

    subgraph Client_Environment["Client Environment"]
        Browser["Web Browser (Desktop/Mobile)"]:::presentation
    end

    subgraph External_Services["External Services"]
        LiveKit["LiveKit Cloud Server"]:::external
    end

    subgraph Host_Environment["Cloud / Docker Host OS"]
        direction TB
        Proxy["Reverse Proxy (Nginx / Load Balancer)"]:::external

        subgraph Docker_Network["Docker Internal Network (hireops_default)"]
            direction LR
            FE["Frontend Node Server<br>(Port 3000)"]:::presentation
            
            API["FastAPI Uvicorn Container<br>(Port 8000)"]:::logic
            
            Worker["Celery Worker Container<br>(No bound port)"]:::logic
            
            subgraph Data_Stores["Data Tier"]
                DB[("PostgreSQL 15<br>(Volume: postgres_data)")]:::data
                Cache[("Redis 7 Alpine<br>(Volume: redis_data)")]:::data
            end
        end
    end

    Browser -->|HTTPS :443| Proxy
    Browser -.->|WebRTC Metrics| LiveKit
    
    Proxy -->|Route /_next, /| FE
    Proxy -->|Route /api/v1| API
    
    FE == " HTTPS | WSS " === API
    API -->|TCP :5432| DB
    Worker -->|TCP :5432| DB
    
    API -->|TCP :6379| Cache
    Worker -->|TCP :6379| Cache
    API -.->|REST Admin API| LiveKit
```
