@echo off
title JobPilot AI
set ELECTRON_RUN_AS_NODE=
set ROUTER_TOKEN=sk-25a6421c7e67b2b5-edzmhl-9843071e
cd /d "%~dp0"

:: Terminate any stale zombie electron process
taskkill /f /im electron.exe >nul 2>&1

:: Launch Electron app directly and immediately
start "" "%~dp0node_modules\electron\dist\electron.exe" .
