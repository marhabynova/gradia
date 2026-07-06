@echo off
echo ========================================================
echo MENJALANKAN GRADIA SECARA LOKAL (TANPA RENDER)
echo ========================================================

echo Memulai Backend FastAPI...
start cmd /k "cd backend && pip install -r requirements.txt && uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

echo Memulai Frontend React...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo Selesai! Backend berjalan di http://127.0.0.1:8000
echo Frontend berjalan di http://localhost:5173 (atau port yang tertera di layar CMD baru)
echo Tutup jendela CMD jika sudah selesai.
