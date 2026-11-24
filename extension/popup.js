// JobPilot AI Companion - Popup Logic
document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('bridge-status');
  const noticeEl = document.getElementById('popup-notice');

  // Query background service worker for connection status
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (res && res.isConnected) {
      statusBadge.innerText = 'ONLINE';
      statusBadge.className = 'status-badge';
      if (res.candidate) {
        document.getElementById('cand-name').innerText = res.candidate.name;
        document.getElementById('cand-edu').innerText = res.candidate.education;
      }
    } else {
      statusBadge.innerText = 'OFFLINE';
      statusBadge.className = 'status-badge offline';
      noticeEl.innerText = 'Launch JobPilot Desktop app to connect.';
    }
  });

  // Action: Smart Apply
  document.getElementById('btn-popup-autofill').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: 'autofill' }, (response) => {
      noticeEl.innerText = response ? `Auto-filled ${response.filled} inputs!` : 'Action sent to active page.';
    });
  });

  // Action: Inject Pitch
  document.getElementById('btn-popup-pitch').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: 'inject_pitch' }, (response) => {
      noticeEl.innerText = response ? `Injected pitch into ${response.injected} textarea(s)!` : 'Pitch injected.';
    });
  });

  // Action: Sync Application
  document.getElementById('btn-popup-sync').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) return;
    chrome.tabs.sendMessage(tab.id, { action: 'extract_job' }, (response) => {
      if (response && response.metadata) {
        chrome.runtime.sendMessage({
          type: 'SYNC_APPLICATION',
          payload: {
            company: response.metadata.company,
            role: response.metadata.title,
            location: response.metadata.location,
            portal: response.metadata.portal,
            url: response.metadata.url
          }
        }, (res) => {
          noticeEl.innerText = res && res.ok ? '✓ Recorded to Desktop Ledger!' : 'Failed to sync with Desktop.';
        });
      }
    });
  });
});
