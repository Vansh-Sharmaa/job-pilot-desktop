// JobPilot AI Companion : Background Service Worker
// Manages real-time bridge link with JobPilot desktop (Port 5056)
const BRIDGE_URL = 'http://127.0.0.1:5056';
let isConnected = false;
let candidateProfile = null;
let cachedBridgeToken = '';
let lastContacts = { status: 'none' };

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
    chrome.tabs.query({}, (tabs) => {
      if (tabs) {
        for (const t of tabs) {
          try {
            chrome.tabs.sendMessage(t.id, { action: 'abort' });
          } catch (e) {}
        }
      }
    });
    return;
  }

  const targetUrl = cmd.url || 'https://in.indeed.com/jobs?q=AI+Engineer&l=India';

  if (targetUrl.toLowerCase().includes('linkedin.com')) {
    console.warn('[JOBPILOT SAFETY] LinkedIn automation permanently blocked to protect user account from bans.');
    sendTelemetry('SAFETY', 'LinkedIn automation blocked to protect user account from bans.');
    return;
  }

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
    await chrome.tabs.update(targetTab.id, { active: true });
    if (targetTab.windowId) {
      try { await chrome.windows.update(targetTab.windowId, { focused: true }); } catch (e) {}
    }

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

  // Create or add to Agents · 1 tab group (as in OpenCode agent mode)
  try {
    if (activeTab && activeTab.id && chrome.tabs.group && chrome.tabGroups) {
      const groupId = await chrome.tabs.group({ tabIds: [activeTab.id] });
      await chrome.tabGroups.update(groupId, { title: 'Agents · 1', color: 'grey' });
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

async function dispatchCommandToTab(tab, cmd) {
  if (!tab || !tab.id) return;

  const sendMsg = () => {
    chrome.tabs.sendMessage(tab.id, {
      action: cmd.action,
      candidate: candidateProfile,
      meta: cmd.meta || {}
    }, async (response) => {
      if (chrome.runtime.lastError) {
        // Tab might not have content script loaded. Inject dynamically
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            files: ['content.css']
          });
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: cmd.action,
              candidate: candidateProfile,
              meta: cmd.meta || {}
            }, (retryRes) => {
              reportCommandResult(cmd.action, retryRes);
            });
          }, 500);
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

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    sendResponse({ isConnected, candidate: candidateProfile });
    return true;
  }

  if (request.type === 'ABORT_AGENT') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/abort-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        }
      }).catch(() => {});
    });
    // Broadcast abort to any other active tabs
    chrome.tabs.query({}, (tabs) => {
      if (tabs) {
        for (const t of tabs) {
          try {
            chrome.tabs.sendMessage(t.id, { action: 'abort' });
          } catch (e) {}
        }
      }
    });
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

  if (request.type === 'MAP_TALENT_GRAPH') {
    getBridgeToken().then(token => {
      fetch(`${BRIDGE_URL}/api/company-talent-graph`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-JobPilot-Token': token
        },
        body: JSON.stringify(request.payload || { company: 'Google' })
      })
      .then(r => r.json())
      .then(data => sendResponse(data))
      .catch(err => sendResponse({ ok: false, error: err.message }));
    });
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

// Periodic polling loop
setInterval(checkBridgeStatus, 1500);
checkBridgeStatus();
