FROM node:20-alpine AS frontend_builder
WORKDIR /app/frontend

# Same-origin API during Docker/Render deploy (override in `docker build --build-arg` if needed)
ARG REACT_APP_API_URL=/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Chapa checkout (listing packages): public key is baked at build time — set REACT_APP_CHAPA_PUBLIC_KEY on Render or pass --build-arg
ARG REACT_APP_CHAPA_PUBLIC_KEY=
ENV REACT_APP_CHAPA_PUBLIC_KEY=$REACT_APP_CHAPA_PUBLIC_KEY

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS backend_runtime
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app/backend

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./

# Copy the CRA production build into /app/frontend/build (matches settings.REACT_BUILD_DIR)
COPY --from=frontend_builder /app/frontend/build /app/frontend/build

COPY backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000
CMD ["/entrypoint.sh"]

