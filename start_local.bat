@echo off
echo ==============================================
echo 🚀 MEMULAI GRADIA LOKAL (DEV ENVIRONMENT)
echo ==============================================

echo [1/3] Menjalankan Database PostgreSQL + pgvector...
docker-compose up -d

echo.
echo [2/3] Memulai Server Backend (FastAPI)...
start cmd /k "cd backend && python -m venv venv && call venv\Scripts\activate && pip install -r requirements.txt && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000"

echo.
echo [3/3] Memulai Server Frontend (React)...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ==============================================
echo Semua servis sedang berjalan di terminal baru!
echo Backend API: http://localhost:8000/docs
echo Frontend Web: http://localhost:5173 (atau port lain jika bentrok)
echo ==============================================
pause
