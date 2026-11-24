# ── Stage 1: Build Frontend ──
FROM node:20-slim AS frontend-builder
WORKDIR /app/project

# Copy frontend package manifests
COPY project/package*.json ./
RUN npm ci

# Copy frontend source files and build
COPY project/ ./
RUN npm run build

# ── Stage 2: Production Python Runtime ──
FROM python:3.11-slim AS runner
WORKDIR /app

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy built frontend assets from builder stage
COPY --from=frontend-builder /app/project/dist ./project/dist

# Copy backend application, database, and seeds
COPY backend ./backend
COPY scripts ./scripts
COPY factoryiq.db ./factoryiq.db

# Expose target port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start Uvicorn serving both API and static React frontend
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
