# JobPilot AI - Assisted Job Application Workspace

JobPilot AI is a local Electron engineering workstation paired with a companion Brave/Chrome extension bridge to help developers discover, inspect, fill, and track job applications with human oversight.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    JOBPILOT DESKTOP APP                     │
│  (Electron Workstation + Local HTTP Bridge :5056)           │
├──────────────────────────────┬──────────────────────────────┤
│       LEFT PANE: AGENT       │     RIGHT PANE: WEBVIEW      │
│  - Copilot Streaming Chat    │  - Target Portal Navigation  │
│  - Candidate Master Profile  │  - Form Fill & Review Flow   │
│  - Screening Q&A Engine      │  - DOM Observe & Inspection  │
│  - Verified Ledger & Tracker │  - Real-time Verification    │
├──────────────────────────────┴──────────────────────────────┤
│                    CORE INTEGRATIONS                        │
│  - Companion Brave Extension Bridge (Port 5056, Token Auth) │
│  - Local 9router Gateway (127.0.0.1:20128)                  │
│  - Human Approval Gate (Defense in Depth before Submit)     │
│  - CAPTCHA / Cloudflare Challenge Halt Detection            │
│  - Dual Ledger Duplicate Checking & Recruitment Scam Alert  │
└─────────────────────────────────────────────────────────────┘
```

## Implemented Core Behaviors

1. **Companion Extension Bridge:** Connects to the user's real Brave/Chrome profile over an authenticated local bridge (`http://127.0.0.1:5056`). Preserves existing logins, cookies, and session state.
2. **Local Model Routing:** Routes LLM calls exclusively through the local 9router gateway (`http://127.0.0.1:20128/v1`) using per-task model keys (`planning`, `extraction`, `qa`).
3. **Fill & Review Workflow:** Forms are parsed and filled using verified candidate facts. An interactive review drawer lets the candidate audit or edit every field before submission.
4. **Human Approval Gate:** Consequential actions and final submissions require explicit user confirmation via an approval card. Submissions cannot proceed without a single-use token consumed on use.
5. **CAPTCHA & Verification Halt:** If Turnstile, reCAPTCHA, or a security challenge appears, the agent halts immediately and hands control over to the candidate.
6. **Integrity & Sanity Checks:** Screening questions only answer from verified profile facts; unverified queries escalate to `needsHuman`. Numbers, dates, and dropdown selections undergo format sanity validation.
7. **Ledger & Scam Guard:** Checks incoming leads against previous applications in `job_applications_tracker.csv` and flags suspicious recruitment fees or deposit requests.

## Requirements & Launch

Launching JobPilot requires Electron (`npm start`). Direct execution with `node src/main.js` is not supported because Electron runtime APIs are required.

```bash
# Clone the repository
git clone https://github.com/Vansh-Sharmaa/job-pilot-desktop.git
cd job-pilot-desktop

# Install dependencies
npm install

# Launch JobPilot AI Workspace (Electron required)
npm start
```
