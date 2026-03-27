# Stage 1: Build & Dependency Resolution Layer
FROM python:3.11-slim as builder

# Install core build dependencies for Python C-extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/root/.local/bin:$PATH"

WORKDIR /build

# Mocking Installation pipeline (Using standard pip vs Poetry for clean CI/CD orchestration)
# This layer builds native wheels (asyncpg, numpy, Passlib) before shedding weight
RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] sqlalchemy asyncpg \
    alembic python-jose[cryptography] passlib[bcrypt] \
    bcrypt==3.2.0 \
    pydantic opencv-python-headless numpy \
    celery redis python-multipart pydantic[email] pydantic \
    pdfplumber

# Stage 2: Production Runtime Environment
FROM python:3.11-slim

WORKDIR /app

# CRITICAL SYSTEMS REQUIREMENT: OpenCV Prototyping
# OpenCV's headless implementation heavily relies on OS-level C++ rendering libraries.
# Failing to map libgl1 and libglib2 will instantly crash the Proctoring Endpoint with an ImportError.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Map compiled binaries & site-packages from the heavy builder stage
COPY --from=builder /usr/local/lib/python3.11/site-packages/ /usr/local/lib/python3.11/site-packages/
COPY --from=builder /usr/local/bin/ /usr/local/bin/

# Mount App Source
COPY . .

# Security Best Practice: Delegate execution to a non-root User
RUN useradd -m celeryuser && chown -R celeryuser /app
USER celeryuser

# Map ASGI Port
EXPOSE 8000

# Container Default Execution (API Gateway - Overridden inside compose.yml for Workers)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4", "--proxy-headers"]
