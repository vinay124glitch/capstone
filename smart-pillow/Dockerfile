# Multi-stage Docker build for Smart Pillow
# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend with ML & Static SPA
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy training data & train ML model if not present
COPY data/ ./data/
RUN python -c "import os; os.system('python backend/app/ml/train_position_model.py') if not os.path.exists('backend/app/ml/position_model.pkl') else print('ML Model already present')"

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

WORKDIR /app/backend

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV ML_MODEL_PATH=app/ml/position_model.pkl

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
