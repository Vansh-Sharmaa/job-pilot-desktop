// JobPilot AI Companion - Background Service Worker
const BRIDGE_URL = 'http://127.0.0.1:5056';
let isConnected = false;
let candidateProfile = null;

// Poll the local JobPilot desktop bridge server
async function checkBridgeStatus() {
  try {
    const res = await fetch(`${BRIDGE_URL}/api/status`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      isConnected = true;
      candidateProfile = data.candidate || null;
      chrome.action.setBadgeText({ text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ color: '#10b981' });

      // Check for pending agent commands from desktop app
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
    const res = await fetch(`${BRIDGE_URL}/api/pending-command`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data.command) {
        executeCommandInActiveTab(data.command);
      }
    }
  } catch (e) {}
}

async function executeCommandInActiveTab(cmd) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab || !activeTab.id) return;

  if (cmd.action === 'navigate' && cmd.url) {
    chrome.tabs.update(activeTab.id, { url: cmd.url });
    return;
  }

  chrome.tabs.sendMessage(activeTab.id, { action: cmd.action, candidate: candidateProfile }, async (response) => {
    // Send execution result back to desktop
    try {
      await fetch(`${BRIDGE_URL}/api/command-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: cmd.action, response })
      });
    } catch (e) {}
  });
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_STATUS') {
    sendResponse({ isConnected, candidate: candidateProfile });
    return true;
  }

  if (request.type === 'SYNC_APPLICATION') {
    fetch(`${BRIDGE_URL}/api/sync-application`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload)
    })
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: err.message }));
    return true;
  }

  if (request.type === 'SEND_ACTIVE_JOB') {
    fetch(`${BRIDGE_URL}/api/active-job`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.payload)
    }).catch(() => {});
    sendResponse({ ok: true });
    return true;
  }
});

// Periodic polling loop
setInterval(checkBridgeStatus, 2000);
checkBridgeStatus();
