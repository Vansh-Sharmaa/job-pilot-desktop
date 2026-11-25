// JobPilot AI Companion : Background Service Worker
// Manages real-time bridge link with JobPilot desktop (Port 5056)
const BRIDGE_URL = 'http://127.0.0.1:5056';
let isConnected = false;
let candidateProfile = null;
let cachedBridgeToken = '';
let lastContacts = { status: 'none' };

// Active agent tab tracking
const agentTabIds = new Set();
let activeGroupId = null;
let activeAgentCmd = null;
let activeBatchQueue = [];
let batchAppliedCount = 0;
let batchMaxQuota = 20;

async function getBridgeToken() {
  if (cachedBridgeToken) return cachedBridgeToken;
  try {
    const res = await fetch(chrome.runtime.getURL('bridge-token.json'));
    const data = await res.json();
    cachedBridgeToken = data.token || '';
  } catch (e) {
    cachedBridgeToken = '';
  }
  return cachedBridgeToken;
}

// Poll the local JobPilot desktop bridge server
async function checkBridgeStatus() {
  try {
    const token = await getBridgeToken();
    const res = await fetch(`${BRIDGE_URL}/api/status`, {
      headers: { 'X-JobPilot-Token': token },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      isConnected = true;
      candidateProfile = data.candidate || null;
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

      // Poll pending agent commands dispatched from desktop
      await pollPendingCommands();
    } else {
      setDisconnectedState();
    }
  } catch (e) {
    setDisconnectedState();
  }
}

function setDisconnectedState() {
  isConnected = false;
  chrome.action.setBadgeText({ text: 'OFF' });
  chrome.action.setBadgeBackgroundColor({ color: '#64748b' });
}

// Check if desktop agent dispatched a command to the browser
async function pollPendingCommands() {
  try {
    const token = await getBridgeToken();
    const res = await fetch(`${BRIDGE_URL}/api/pending-command`, {
      headers: { 'X-JobPilot-Token': token },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      if (data.command) {
        executeCommandInActiveTab(data.command);
      }
    }
  } catch (e) {}
}

const isInternalBrowserUrl = (url) => {
  if (!url) return true;
  const u = url.toLowerCase();
  return u.startsWith('chrome://') || u.startsWith('brave://') || u.startsWith('edge://') || u.startsWith('about:') || u.startsWith('chrome-extension://');
};

async function executeCommandInActiveTab(cmd) {
  if (!cmd) return;

  if (cmd.action === 'reload_extension') {
    chrome.runtime.reload();
    return;
  }

  if (cmd.action === 'abort' || cmd.action === 'stop') {
    activeAgentCmd = null;
    for (const tabId of agentTabIds) {
      try {
        if (chrome.debugger) {
          chrome.debugger.detach({ tabId }).catch(() => {});
        }
        chrome.tabs.sendMessage(tabId, { action: 'abort' });
      } catch (e) {}
    }
    agentTabIds.clear();
    return;
  }

  const targetUrl = cmd.url || 'https://in.indeed.com/jobs?q=AI+Engineer&l=India';

  if (targetUrl.toLowerCase().includes('linkedin.com')) {
    console.warn('[JOBPILOT SAFETY] LinkedIn automation permanently blocked to protect user account from bans.');
    sendTelemetry('SAFETY', 'LinkedIn automation blocked to protect user account from bans.');
    return;
  }

  activeAgentCmd = cmd;

  // 1. Query all open tabs to check if an existing tab is already on targetUrl or same host
  let allTabs = [];
  try {
    allTabs = await chrome.tabs.query({});
  } catch (e) {}

  let targetTab = null;
  if (allTabs && allTabs.length > 0) {
    try {
      const targetObj = new URL(targetUrl);
      targetTab = allTabs.find(t => {
        if (!t.url || isInternalBrowserUrl(t.url)) return false;
        try {
          const u = new URL(t.url);
          return u.hostname === targetObj.hostname;
        } catch (err) {
          return false;
        }
      });
    } catch (e) {}
  }

  // 2. If matching domain tab exists, bring to front and route command
  if (targetTab && targetTab.id) {
    agentTabIds.add(targetTab.id);
    await chrome.tabs.update(targetTab.id, { active: true });
    if (targetTab.windowId) {
      try { await chrome.windows.update(targetTab.windowId, { focused: true }); } catch (e) {}
    }

    // Group under Agents : 1 tab group
    try {
      if (chrome.tabs.group && chrome.tabGroups) {
        activeGroupId = await chrome.tabs.group({ tabIds: [targetTab.id] });
        await chrome.tabGroups.update(activeGroupId, { title: 'Agents : 1', color: 'grey' });
      }
    } catch (e) {}

    // Attach debugger banner if permitted
    try {
      if (chrome.debugger) {
        chrome.debugger.attach({ tabId: targetTab.id }, '1.3').catch(() => {});
      }
    } catch (e) {}

    if (targetTab.url !== targetUrl && cmd.action !== 'navigate') {
      await chrome.tabs.update(targetTab.id, { url: targetUrl });
      const tabListener = (tabId, changeInfo) => {
        if (tabId === targetTab.id && changeInfo.status === 'complete') {
          chrome.tabs.onUpdated.removeListener(tabListener);
          setTimeout(() => dispatchCommandToTab(targetTab, cmd), 1200);
        }
      };
      chrome.tabs.onUpdated.addListener(tabListener);
      return;
    } else {
      setTimeout(() => dispatchCommandToTab(targetTab, cmd), 600);
      return;
    }
  }

  // 3. If active tab is internal browser page or empty, navigate it; otherwise open new tab
  let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tabs || tabs.length === 0) {
    tabs = await chrome.tabs.query({ active: true });
  }
  let activeTab = tabs && tabs[0];

  if (activeTab && activeTab.id && isInternalBrowserUrl(activeTab.url)) {
    activeTab = await chrome.tabs.update(activeTab.id, { url: targetUrl, active: true });
  } else {
    activeTab = await chrome.tabs.create({ url: targetUrl, active: true });
  }

  if (activeTab && activeTab.id) {
    agentTabIds.add(activeTab.id);
  }

  // Create or add to Agents : 1 tab group (as in OpenCode agent mode)
  try {
    if (activeTab && activeTab.id && chrome.tabs.group && chrome.tabGroups) {
      activeGroupId = await chrome.tabs.group({ tabIds: [activeTab.id] });
      await chrome.tabGroups.update(activeGroupId, { title: 'Agents : 1', color: 'grey' });
    }
  } catch (e) {}

  // Attach debugger banner if permitted
  try {
    if (activeTab && activeTab.id && chrome.debugger) {
      chrome.debugger.attach({ tabId: activeTab.id }, '1.3').catch(() => {});
    }
  } catch (e) {}

  // Bring browser window to front so the user sees the page open
  try {
    if (activeTab && activeTab.windowId) {
      chrome.windows.update(activeTab.windowId, { focused: true });
    }
  } catch (e) {}

  // Wait for the page to finish loading before dispatching autonomous agent
  const tabListener = (tabId, changeInfo) => {
    if (tabId === activeTab.id && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(tabListener);
      setTimeout(() => dispatchCommandToTab(activeTab, cmd), 1400);
    }
  };
  chrome.tabs.onUpdated.addListener(tabListener);
}

// Track child tabs opened by the agent (e.g. Indeed Apply opening in a new tab)
chrome.tabs.onCreated.addListener(async (newTab) => {
  if (!newTab || !newTab.id) return;

  const isChildOfAgent = newTab.openerTabId && agentTabIds.has(newTab.openerTabId);
  const isAgentGroup = activeGroupId && newTab.groupId === activeGroupId;

  if (isChildOfAgent || isAgentGroup) {
    agentTabIds.add(newTab.id);

    // Group into Agents : 1
    if (activeGroupId && chrome.tabs.group) {
      try {
        await chrome.tabs.group({ tabIds: [newTab.id], groupId: activeGroupId });
      } catch (e) {}
    }

    // Attach debugger banner
    try {
      if (chrome.debugger) {
        chrome.debugger.attach({ tabId: newTab.id }, '1.3').catch(() => {});
      }
    } catch (e) {}

    // When child tab finishes loading, automatically dispatch autonomous apply command
    const childListener = (tabId, changeInfo, tab) => {
      if (tabId === newTab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(childListener);
        if (activeAgentCmd) {
          setTimeout(() => {
            dispatchCommandToTab(tab, activeAgentCmd);
          }, 1000);
        }
      }
    };
    chrome.tabs.onUpdated.addListener(childListener);
  }
});

// Clean up tabs removed by user
chrome.tabs.onRemoved.addListener((tabId) => {
  agentTabIds.delete(tabId);
});

async function dispatchCommandToTab(tabOrId, cmd) {
  const tabId = (typeof tabOrId === 'object') ? tabOrId.id : tabOrId;
  if (!tabId) return;

  let freshTab = null;
  try {
    freshTab = await chrome.tabs.get(tabId);
  } catch (e) {
    return;
  }

  if (!freshTab || !freshTab.url || isInternalBrowserUrl(freshTab.url)) {
    if (cmd && cmd.url && !isInternalBrowserUrl(cmd.url)) {
      chrome.tabs.update(tabId, { url: cmd.url, active: true });
    }
    return;
  }

  agentTabIds.add(tabId);
  activeAgentCmd = cmd;

  const sendMsg = () => {
    chrome.tabs.sendMessage(tabId, {
      action: cmd.action,
      candidate: candidateProfile,
      meta: cmd.meta || {}
    }, async (response) => {
      if (chrome.runtime.lastError) {
        // Tab might not have content script loaded. Inject dynamically only on non-internal URLs
        try {
          const verifyTab = await chrome.tabs.get(tabId);
          if (verifyTab && verifyTab.url && !isInternalBrowserUrl(verifyTab.url)) {
            await chrome.scripting.executeScript({
              target: { tabId: tabId, allFrames: true },
              files: ['content.js']
            });
            await chrome.scripting.insertCSS({
              target: { tabId: tabId },
              files: ['content.css']
            });
            setTimeout(() => {
              chrome.tabs.sendMessage(tabId, {
                action: cmd.action,
                candidate: candidateProfile,
                meta: cmd.meta || {}
              }, (retryRes) => {
                reportCommandResult(cmd.action, retryRes);
              });
            }, 500);
          }
        } catch (injectErr) {
          reportCommandResult(cmd.action, { status: 'error', error: injectErr.message });
        }
      } else {
        reportCommandResult(cmd.action, response);
      }
    });
  };

  sendMsg();
}

async function reportCommandResult(action, response) {
  try {
    const token = await getBridgeToken();
    await fetch(`${BRIDGE_URL}/api/command-result`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-JobPilot-Token': token
      },
      body: JSON.stringify({ action, response })
    });
  } catch (e) {}
}

function sendTelemetry(step, message, details = {}) {
  getBridgeToken().then(token => {
    fetch(`${BRIDGE_URL}/api/agent-telemetry`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-JobPilot-Token': token
      },
      body: JSON.stringify({ step, message, details, timestamp: Date.now() })
    }).catch(() => {});
  });
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    sendResponse({ isConnected, candidate: candidateProfile });
    return true;
  }

  if (request.type === 'ABORT_AGENT') {
    activeAgentCmd = null;
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/abort-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        }
      }).catch(() => {});
    });
    // Broadcast abort to all agent tabs
    for (const tabId of agentTabIds) {
      try {
        if (chrome.debugger) {
          chrome.debugger.detach({ tabId }).catch(() => {});
        }
        chrome.tabs.sendMessage(tabId, { action: 'abort' });
      } catch (e) {}
    }
    agentTabIds.clear();
    sendResponse({ ok: true });
    return true;
  }

  if (request.type === 'TRIGGER_RECONNECT') {
    checkBridgeStatus().then(() => {
      sendResponse({ isConnected, candidate: candidateProfile });
    });
    return true;
  }

  if (request.type === 'GET_BRIDGE_TOKEN') {
    getBridgeToken().then(token => sendResponse({ token }));
    return true;
  }

  if (request.type === 'GET_CONTACTS') {
    lastContacts = request.payload || { status: 'none' };
    sendResponse({ status: 'success', data: lastContacts });
    return true;
  }

  if (request.type === 'AGENT_TELEMETRY') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/agent-telemetry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        },
        body: JSON.stringify(request.payload)
      }).catch(() => {});
      sendResponse({ ok: true });
    });
    return true;
  }

  if (request.type === 'SYNC_APPLICATION') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/sync-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        },
        body: JSON.stringify(request.payload)
      })
      .then(r => r.json())
      .then(data => sendResponse({ ok: true, data }))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    });
    return true;
  }

  if (request.type === 'REQUEST_CLARIFICATION') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/clarification-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        },
        body: JSON.stringify(request.payload)
      })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    });
    return true;
  }

  if (request.type === 'ASK_AI_QUESTION') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/answer-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        },
        body: JSON.stringify(request.payload)
      })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    });
    return true;
  }

  if (request.type === 'INIT_BATCH_QUEUE') {
    activeBatchQueue = request.queue || [];
    batchAppliedCount = request.appliedCount || 0;
    batchMaxQuota = request.quota || 20;
    sendResponse({ ok: true, queuedCount: activeBatchQueue.length });
    return true;
  }

  if (request.type === 'NAVIGATE_AGENT_TAB') {
    const targetUrl = request.url;
    const tabId = (sender.tab && sender.tab.id) || Array.from(agentTabIds)[0];
    if (tabId && targetUrl) {
      agentTabIds.add(tabId);
      activeAgentCmd = {
        action: 'start_autonomous_apply',
        url: targetUrl,
        meta: request.meta || {}
      };
      chrome.tabs.update(tabId, { url: targetUrl, active: true }).then(() => {
        sendResponse({ ok: true });
      }).catch(err => sendResponse({ ok: false, error: err.message }));
      return true;
    }
  }

  if (request.type === 'JOB_APPLY_COMPLETED') {
    batchAppliedCount++;
    if (activeBatchQueue.length > 0 && batchAppliedCount < batchMaxQuota) {
      const nextJob = activeBatchQueue.shift();
      const tabId = (sender.tab && sender.tab.id) || Array.from(agentTabIds)[0];
      if (tabId && nextJob && nextJob.url) {
        activeAgentCmd = {
          action: 'start_autonomous_apply',
          url: nextJob.url,
          meta: nextJob.meta || {}
        };
        sendTelemetry('NEXT_JOB', `Advancing queue: opening next job listing (${batchAppliedCount}/${batchMaxQuota}): ${nextJob.meta?.company || nextJob.url}`, {
          url: nextJob.url,
          company: nextJob.meta?.company,
          applied: batchAppliedCount,
          quota: batchMaxQuota
        });
        setTimeout(() => {
          chrome.tabs.update(tabId, { url: nextJob.url, active: true }).catch(() => {});
        }, 3000);
      }
    } else {
      sendTelemetry('QUEUE_COMPLETE', `Batch apply queue finished (${batchAppliedCount} jobs applied).`, { applied: batchAppliedCount });
    }
    sendResponse({ ok: true, remaining: activeBatchQueue.length, applied: batchAppliedCount });
    return true;
  }

  if (request.type === 'CHECK_ACTIVE_AGENT_SESSION') {
    const tabId = sender.tab && sender.tab.id;
    const isTabInAgentSet = tabId && agentTabIds.has(tabId);
    const isGroupMatch = activeGroupId && sender.tab && (sender.tab.groupId === activeGroupId);
    const isIndeedApply = sender.tab && sender.tab.url && (sender.tab.url.includes('indeedapply') || sender.tab.url.includes('smartapply'));
    const isActive = !!(activeAgentCmd && (isTabInAgentSet || isGroupMatch || isIndeedApply));

    if (isActive && tabId) {
      agentTabIds.add(tabId);
    }

    sendResponse({ active: isActive, cmd: activeAgentCmd });
    return true;
  }

  if (request.type === 'SEND_ACTIVE_JOB') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/active-job`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        },
        body: JSON.stringify(request.payload)
      }).catch(() => {});
      sendResponse({ ok: true });
    });
    return true;
  }
});

// Automatically continue multi-step application forms on step transitions
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (agentTabIds.has(tabId) && changeInfo.status === 'complete') {
    if (activeAgentCmd && tab.url && !isInternalBrowserUrl(tab.url)) {
      setTimeout(() => {
        dispatchCommandToTab(tab, activeAgentCmd);
      }, 1000);
    }
  }
});

// Periodic polling loop
setInterval(checkBridgeStatus, 1500);
checkBridgeStatus();
