HireOps - Technology Stack Summary

1. Frontend (Client/UI Layer)
- Framework: Next.js 16 App Router
- UI Library: React 19
- Styling & Design System: Tailwind CSS v4
- State Management: Zustand (for syncing global/auth state)
- Animations: Framer Motion (for page transitions and dynamic UX)
- Real-time Video / WebRTC: LiveKit SDK & @livekit/components-react
- Data Visualization: Recharts
- Iconography: Lucide-React

2. Backend (API Gateway & Services)
- Language: Python 3.11 
- Web Framework: FastAPI
- ASGI Server: Uvicorn (configured with multiple working threads)
- Validation & Schemas: Pydantic (with pydantic[email])
- Security & Auth: passlib[bcrypt] (Password Hashing) and python-jose (cryptography/JWT generation)
- Async Network Clients: httpx (for making external API calls)

3. AI Processing & Background Tasks (Worker Layer)
- Task Queue: Celery (Delegating workloads to background instances)
- Computer Vision: opencv-python-headless & NumPy (Used for Proctoring Endpoints, requires libgl1)
- Document Processing: pdfplumber (Used for AI NLP extraction of uploaded resumes)

4. Data Storage Tier
- Primary Database: PostgreSQL 15 
- ORM (Object Relational Mapper): SQLAlchemy (using the asyncpg driver for asynchronous database I/O)
- Database Migrations: Alembic
- In-Memory Cache & Message Broker: Redis 7 Alpine (Acts as both the Celery Queue Broker and a Pub/Sub event router for WebSockets)

5. Infrastructure & DevOps (Deployment)
- Container Environment: Docker & Docker Compose
- Build Strategy: Multi-stage container builds
- Process Isolation: Dedicated non-root 'celeryuser' in a slim runtime layer
