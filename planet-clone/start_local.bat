@echo off
setlocal
cd /d "%~dp0"
title Tiny Planet - NPC Chaos Lab
where py >nul 2>nul
if %errorlevel%==0 (
  py local_server.py
) else (
  python local_server.py
)
pause
