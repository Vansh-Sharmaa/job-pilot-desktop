@echo off
title JobPilot AI : Autonomous Career Cockpit
set ELECTRON_RUN_AS_NODE=
cd /d "D:\opencode stuff\job-pilot-desktop"

:: Ensure 9router daemon is alive on port 20128 for Fable5
powershell -NoProfile -Command "if (!(Get-NetTCPConnection -LocalPort 20128 -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'cmd.exe' -ArgumentList '/c 9router -n --skip-update' -WindowStyle Hidden }"

start "" "D:\opencode stuff\job-pilot-desktop\node_modules\electron\dist\electron.exe" "D:\opencode stuff\job-pilot-desktop"

