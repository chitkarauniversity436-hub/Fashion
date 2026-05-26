@echo off
REM Kill existing backend process
taskkill /F /IM python.exe /FI "COMMANDLINE eq *main.py" 2>nul
timeout /t 1 /nobreak >nul
REM Start new backend
cd /d C:\stylesync\ai-wardrobe\backend
python main.py
