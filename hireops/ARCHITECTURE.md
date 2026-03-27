# HireOps Architecture Document

This document outlines the system architecture for **HireOps** across five primary viewpoints. These views ensure all aspects of the application—from logical separation and user interaction to runtime behavior and concrete infrastructure—are appropriately designed and documented.

---

## 1. Logical / Functional View
**Diagram Type**: Block Diagram / Layered Architecture  
**Purpose**: Shows system components and their relationships in a layered approach.

This diagram demonstrates how the codebase is logically separated. The Next.js frontend acts as the Presentation Layer, communicating via REST/WebSockets to the FastAPI API Gateway. Business logic is isolated in core services or delegated to background tasks.

```mermaid
flowchart TD
    subgraph Presentation_Layer["Presentation Layer (Next.js 14)"]
        UI["UI Components (React/Tailwind)"]
        State["State Management (Zustand)"]
        ClientAPI["API Client (Axios/Fetch)"]
        
        UI <--> State
        State <--> ClientAPI
    end

    subgraph API_Layer["API Layer (FastAPI)"]
        Router["API Routers (v1)"]
        AuthCtx["Auth & Permissions"]
        
        Router <--> AuthCtx
    end

    subgraph Business_Layer["Business Logic Layer"]
        Services["Core Services (Workflow/Agentic Progression)"]
        TaskQueue["Task Delegation (Celery Async)"]
    end

    subgraph Data_Layer["Data Access & Storage Layer"]
        ORM["SQLAlchemy Models / Repositories"]
        DB[(PostgreSQL)]
        Cache[(Redis Cache / Message Broker)]
        
        ORM <--> DB
    end

    %% Layer Interactions
    Presentation_Layer == "HTTPS / WSS" === API_Layer
    API_Layer <--> Business_Layer
    Business_Layer <--> Data_Layer
    
    Services ---> ORM
    TaskQueue ---> Cache
```

---

## 2. Use Case View
**Diagram Type**: Use Case Diagram  
**Purpose**: Shows user interactions with the system and defines the system's boundary.

Displays the primary actors (Candidates and HR/Managers) interacting with the HireOps platform, as well as backend system actors (like the AI System) that trigger automated background tasks.

```mermaid
flowchart LR
    %% Actors
    Candidate["👤 Candidate"]
    HR["👔 HR / Manager"]
    System["🤖 Backend System"]

    %% Use Cases
    subgraph HireOps Platform
        UC1(["Register / Login"])
        UC2(["View Job Board"])
        UC3(["Apply for Job"])
        UC4(["Upload / Parse Resume"])
        UC5(["Manage Job Postings"])
        UC6(["Review Candidates"])
        UC7(["AI NLP Resume Parsing"])
        UC8(["Run Bulk Invites"])
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
    class Database {
        <<PostgreSQL>>
    }
    class RedisBroker {
        <<Redis>>
    }

    FrontendApp --> APIClient : Uses
    APIClient --> FastAPIServer : HTTP JSON Request
    FastAPIServer *-- APIRouters : Mounts
    APIRouters --> Services : Calls
    Services --> CeleryWorker : Dispatches via Broker
    Services --> Database : Reads / Writes
    CeleryWorker --> RedisBroker : Listens for Tasks
    FastAPIServer --> RedisBroker : Publishes Events
```

---

## 4. Process / Thread View
**Diagram Type**: Sequence Diagram  
**Purpose**: Shows runtime behavior, workflows, and threads for a complex process.

This diagram traces a typical complex asynchronous workflow: a candidate uploading a resume, which is parsed by an AI backend worker while the frontend listens for real-time progress updates.

```mermaid
sequenceDiagram
    actor Candidate
    participant UI as Next.js Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Redis as Redis Broker
    participant Celery as Celery Worker

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
flowchart TD
    subgraph Client_Environment["Client Environment"]
        Browser["Web Browser (Desktop/Mobile)"]
    end

    subgraph Host_Environment["Cloud / Docker Host OS"]
        direction TB
        Proxy["Reverse Proxy (Nginx / Load Balancer)"]

        subgraph Docker_Network["Docker Internal Network (hireops_default)"]
            direction LR
            FE["Frontend Node Server<br>(Port 3000)"]
            
            API["FastAPI Uvicorn Container<br>(Port 8000)"]
            
            Worker["Celery Worker Container<br>(No bound port)"]
            
            subgraph Data_Stores["Data Tier"]
                DB[("PostgreSQL 15<br>(Volume: postgres_data)")]
                Cache[("Redis 7 Alpine<br>(Volume: redis_data)")]
            end
        end
    end

    Browser -->|HTTPS :443| Proxy
    Proxy -->|Route /_next, /| FE
    Proxy -->|Route /api/v1| API
    
    FE -.->|Server-Side Fetch SSR| API
    API -->|TCP :5432| DB
    Worker -->|TCP :5432| DB
    
    API -->|TCP :6379| Cache
    Worker -->|TCP :6379| Cache
```
