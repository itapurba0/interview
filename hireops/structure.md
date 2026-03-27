# HireOps Monorepo Structure

```text
hireops/
│
├── backend/                       # Python, FastAPI, PostgreSQL
│   ├── alembic/                   # SQLAlchemy migrations
│   ├── alembic.ini                # Migration configuration
│   ├── pyproject.toml             # Python dependencies (Poetry/UV)
│   └── app/
│       ├── api/                   # API entrypoints and routers
│       │   ├── dependencies.py    # Global and tenant dependencies
│       │   └── v1/                # API version 1 routers
│       ├── core/                  # App configuration, security, Celery setup
│       ├── db/                    # Session management and engine
│       ├── models/                # SQLAlchemy Models (ORM)
│       │   └── __init__.py
│       ├── schemas/               # Pydantic models (Input/Output validations)
│       ├── services/              # Business logic (Agentic progression)
│       ├── worker/                # Celery & Async Tasks (AI Screening, Voice)
│       └── main.py                # FastAPI Application instance
│
├── frontend/                      # Next.js 14+ App Router, React 18
│   ├── package.json               # Node.js dependencies
│   ├── tailwind.config.ts         # Tailwind & UI configuration (High contrast)
│   ├── public/                    # Static assets
│   ├── app/                       # Next.js App directory
│   │   ├── (auth)/                # Route Group: Login, Signup, MFA
│   │   ├── (tenant)/              # Route Group: HR/Manager tenant routes 
│   │   │   └── dashboard/         # Strict company_id scoped views
│   │   ├── jobs/                  # Global candidate job board
│   │   ├── globals.css            # Global CSS (Tailwind imports)
│   │   ├── layout.tsx             # Root layout (Framer Motion wrapper)
│   │   └── page.tsx               # High-end Animated Landing page
│   ├── components/                # React Components
│   │   ├── ui/                    # Base visual elements (Buttons, Inputs)
│   │   └── animations/            # Reusable Framer Motion components
│   │       └── PageTransition.tsx 
│   ├── lib/                       # API clients, Zustand stores
│   └── hooks/                     # Custom React hooks
│
└── docker-compose.yml             # Postgres, Redis, Celery, App services
```
