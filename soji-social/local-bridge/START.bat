@echo off
setlocal
cd /d "%~dp0"
if not exist .env (
  copy /Y .env.example .env >nul
  echo Created .env from .env.example
  echo Put your Soji API_URL/API_KEY/MODEL_NAME in .env and point COMFY_WORKFLOWS_DIR at your API workflow folder.
)
echo.
echo Starting Soji Social v0.3...
echo Open http://127.0.0.1:3333 in your browser.
echo.
node server-v3.mjs
if errorlevel 1 (
  echo.
  echo Bridge stopped with an error. Make sure Node.js 20+ is installed.
  pause
)
