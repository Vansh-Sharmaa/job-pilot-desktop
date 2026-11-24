@echo off
title JobPilot AI
set ELECTRON_RUN_AS_NODE=
cd /d "%~dp0"

:: Terminate any stale zombie electron process
taskkill /f /im electron.exe >nul 2>&1

:: Launch Electron app directly and immediately
start "" "%~dp0node_modules\electron\dist\electron.exe" .
