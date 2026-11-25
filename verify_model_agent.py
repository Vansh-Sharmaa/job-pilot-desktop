#!/usr/bin/env python3
"""
JobPilot Model-Driven Browser Agent Verification Suite
Tests tool surface, approval gate, ask_user flow, stale ref invalidation,
expired page handling, 9router routing, and zero em-dash/en-dash compliance.
"""

import os
import re
import sys
import json
import subprocess

WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
MAIN_JS = os.path.join(WORKSPACE_DIR, 'src', 'main.js')
CONTENT_JS = os.path.join(WORKSPACE_DIR, 'extension', 'content.js')
BACKGROUND_JS = os.path.join(WORKSPACE_DIR, 'extension', 'background.js')
INDEX_HTML = os.path.join(WORKSPACE_DIR, 'src', 'index.html')
CONFIG_JSON = os.path.join(WORKSPACE_DIR, 'config.json')

passed = 0
failed = 0

def test(name, condition, details=""):
    global passed, failed
    if condition:
        passed += 1
        print(f"[PASS] {name}")
    else:
        failed += 1
        print(f"[FAIL] {name}: {details}")

print("=== JOBPILOT MODEL-DRIVEN AGENT VERIFICATION ===")

# Test 1: Zero em-dashes and en-dashes
dash_violations = []
for fpath in [MAIN_JS, CONTENT_JS, BACKGROUND_JS, INDEX_HTML]:
    with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    if '\u2014' in content:
        dash_violations.append(f"{os.path.basename(fpath)} contains em-dash (U+2014)")
    if '\u2013' in content:
        dash_violations.append(f"{os.path.basename(fpath)} contains en-dash (U+2013)")

test("Zero em-dashes and en-dashes across codebase", len(dash_violations) == 0, "; ".join(dash_violations))

# Test 2: Full browser tool surface in main.js AGENT_TOOLS
with open(MAIN_JS, 'r', encoding='utf-8') as f:
    main_code = f.read()

required_tools = [
    'tabs_list', 'tabs_open', 'tabs_close', 'navigate', 'back', 'forward',
    'reload', 'snapshot', 'find', 'click', 'fill', 'select', 'check',
    'upload', 'wait_for', 'screenshot', 'eval', 'dialog', 'ask_user',
    'request_approval', 'read_resume', 'search_saved_answers', 'save_answer',
    'browser_submit'
]

missing_tools = [t for t in required_tools if f"name: '{t}'" not in main_code]
test("All 24 Model-Driven Browser Agent tools defined in AGENT_TOOLS", len(missing_tools) == 0, f"Missing: {missing_tools}")

# Test 3: Tool handlers implemented in executeAgentTool
missing_handlers = [t for t in required_tools if f"case '{t}':" not in main_code]
test("All 24 tools handled in executeAgentTool switch", len(missing_handlers) == 0, f"Missing handlers: {missing_handlers}")

# Test 4: Approval gate before browser_submit
test("browser_submit checks lastGrantedApprovalToken or requests human approval",
     "lastGrantedApprovalToken" in main_code and "requestHumanApproval" in main_code)

# Test 5: Ref expiration on navigation (content.js)
with open(CONTENT_JS, 'r', encoding='utf-8') as f:
    content_code = f.read()

test("Element refs expire on page navigation (stale_ref check in content.js)",
     "stale_ref" in content_code and "lastObservedUrl && window.location.href !== lastObservedUrl" in content_code)

# Test 6: Dead / expired job detection
test("Dead/expired job detection in content.js (detectExpiredJob)",
     "function detectExpiredJob" in content_code and "STATUS: EXPIRED / UNAVAILABLE" in content_code)

# Test 7: Max 40 steps in agent loop
test("Agent loop configured for up to 40 steps",
     "const maxLoops = 40" in main_code)

# Test 8: Agent system prompt has exact operator rules
test("Agent system prompt enforces operator, snapshot verify, ask_user, and approval rules",
     "browser operator attached to the" in main_code and
     "Never submit, send, publish, delete, or change settings without request_approval returning approved" in main_code)

# Test 9: /api/agent-loop route present on bridge HTTP server
test("/api/agent-loop HTTP route present for extension bridge trigger",
     "parsedUrl.pathname === '/api/agent-loop'" in main_code)

# Test 10: Extension floating pill wires to startModelDrivenAgentLoop
test("Extension floating pill and onMessage wire to startModelDrivenAgentLoop",
     "startModelDrivenAgentLoop" in content_code and "jp-btn-tab-agent" in content_code)

# Test 11: Candidate Profile data verified from resume
test("Candidate profile has verified data (Graphic Era Hill University, Fresher, +919368478556)",
     "Graphic Era Hill University" in main_code and
     "+919368478556" in main_code and
     "engagevansh@gmail.com" in main_code and
     "2026" in main_code)

# Test 12: Node syntax check
res_main = subprocess.run(['node', '-c', MAIN_JS], capture_output=True, text=True)
res_content = subprocess.run(['node', '-c', CONTENT_JS], capture_output=True, text=True)
with open(BACKGROUND_JS, 'r', encoding='utf-8') as f:
    bg_code = f.read()
res_bg = subprocess.run(['node', '-c', BACKGROUND_JS], capture_output=True, text=True)

test("main.js passes syntax validation", res_main.returncode == 0, res_main.stderr)
test("content.js passes syntax validation", res_content.returncode == 0, res_content.stderr)
test("background.js passes syntax validation", res_bg.returncode == 0, res_bg.stderr)

print(f"\nRESULTS: {passed} PASSED, {failed} FAILED")
if failed > 0:
    sys.exit(1)
sys.exit(0)
