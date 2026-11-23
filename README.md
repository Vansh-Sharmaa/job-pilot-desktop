# JobPilot AI - Autonomous Desktop Workspace

> Next-Generation AI Developer & Multi-Platform Job Application Workspace built with Electron, Chrome DevTools Protocol, and Unlimited Local Model Routing.

---

## Architecture Overview

JobPilot AI is an integrated desktop environment that combines an **Agent Mission Control** on the left with an **Embedded Interactive Browser** on the right:

```
┌─────────────────────────────────────────────────────────────┐
│                    JOBPILOT DESKTOP APP                     │
│  (Electron + Webview + Chrome DevTools Protocol)            │
├──────────────────────────────┬──────────────────────────────┤
│       LEFT PANE: AGENT       │      RIGHT PANE: BROWSER     │
│  - Live Platform Quotas      │  - Chromium Webview Session  │
│  - 24/7 Autopilot Daemon     │  - Live LinkedIn & Naukri    │
│  - Inbound Alert Runner      │  - 1-Click "⚡ Auto-Apply"   │
│  - Fable5 Copilot Chat       │  - Persistent User Cookies   │
├──────────────────────────────┴──────────────────────────────┤
│                    BACKGROUND ENGINE                        │
│  - Multi-Platform Python Swarms (14 portals)                │
│  - Local AI Router Bridge -> http://localhost:20128 (Fable5)│
└─────────────────────────────────────────────────────────────┘
```

## Key Features

1. **Split-Screen Workspace:** Left side controls agents, quotas, and logs; right side provides a live Chromium browser with persistent sessions and bookmarks for all major hiring portals.
2. **1-Click Smart Auto-Apply:** An overlay action button inspects the active webview page and contextually fills out job applications with candidate profile data.
3. **Local AI Router Binding:** Integrates directly with `http://127.0.0.1:20128/v1` (`Fable5`) for unlimited screening question answering at zero token cost.
4. **Python Autopilot Bridge:** Executes background daemons, Gmail alert scanners, and Google calendar runners in real time with live streamed terminal output.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Vansh-Sharmaa/job-pilot-desktop.git
cd job-pilot-desktop

# Install dependencies
npm install

# Launch JobPilot AI Workspace
npm start
```
