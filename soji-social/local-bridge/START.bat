@echo off
setlocal
cd /d "%~dp0"
if not exist .env (
  copy /Y .env.example .env >nul
  echo Created .env from .env.example
  echo Edit .env if you want ComfyUI image generation.
)
echo.
echo Starting Soji Social local bridge with accounts...
echo Open http://127.0.0.1:3333 in your browser.
echo First launch will ask you to create an account.
echo.
node server-auth.mjs
if errorlevel 1 (
  echo.
  echo Bridge stopped with an error. Make sure Node.js 20+ is installed.
  pause
)
