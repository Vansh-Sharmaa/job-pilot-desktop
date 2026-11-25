// JobPilot AI Companion : Streamlined Popup Controller
document.addEventListener('DOMContentLoaded', () => {
  const statusPill = document.getElementById('bridge-status-pill');
  const statusText = document.getElementById('bridge-status-text');
  const noticeEl = document.getElementById('popup-notice');
  const pingEl = document.getElementById('popup-ping-ms');
  const btnReconnect = document.getElementById('btn-reconnect');

  const portalEl = document.getElementById('job-portal');
  const titleEl = document.getElementById('job-title');
  const companyEl = document.getElementById('job-company');
  const locationEl = document.getElementById('job-location');
  const btnTabAgent = document.getElementById('btn-popup-tab-agent');
  const agentBtnText = document.getElementById('agent-btn-text');
  const btnSync = document.getElementById('btn-popup-sync');

  let isAgentRunning = false;
  let activeTabId = null;

  function updateStatusDisplay(isConnected, latencyMs = 2) {
    if (isConnected) {
      statusPill.className = 'status-pill';
      statusText.innerText = 'ONLINE';
      noticeEl.innerText = 'Desktop Bridge: 127.0.0.1:5056';
      pingEl.innerText = `${latencyMs}ms`;
      pingEl.style.color = '#10b981';
    } else {
      statusPill.className = 'status-pill offline';
      statusText.innerText = 'OFFLINE';
      noticeEl.innerText = 'Desktop app offline. Start JobPilot.';
      pingEl.innerText = 'offline';
      pingEl.style.color = '#ef4444';
    }
  }

  async function checkConnection() {
    const startTime = Date.now();
    chrome.runtime.sendMessage({ type: 'TRIGGER_RECONNECT' }, (res) => {
      const latencyMs = Math.max(1, Date.now() - startTime);
      if (res && res.isConnected) {
        updateStatusDisplay(true, latencyMs);
        if (res.candidate) {
          const candName = document.getElementById('cand-name');
          const candEdu = document.getElementById('cand-edu');
          if (candName) candName.innerText = res.candidate.name;
          if (candEdu) candEdu.innerText = res.candidate.education;
        }
      } else {
        updateStatusDisplay(false);
      }
    });
  }

  if (btnReconnect) {
    btnReconnect.addEventListener('click', () => {
      statusText.innerText = 'PINGING';
      checkConnection();
    });
  }

  checkConnection();

  // Scan Active Tab for Job Metadata and Agent State
  async function scanActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      activeTabId = tab.id;

      const url = tab.url || '';
      if (url.includes('indeed.')) portalEl.innerText = 'INDEED';
      else if (url.includes('foundit.')) portalEl.innerText = 'FOUNDIT';
      else if (url.includes('cuvette.')) portalEl.innerText = 'CUVETTE';
      else if (url.includes('unstop.')) portalEl.innerText = 'UNSTOP';
      else if (url.includes('greenhouse.')) portalEl.innerText = 'GREENHOUSE';
      else if (url.includes('lever.co')) portalEl.innerText = 'LEVER';
      else if (url.includes('ashbyhq.')) portalEl.innerText = 'ASHBY';
      else if (url.includes('workday.')) portalEl.innerText = 'WORKDAY';
      else portalEl.innerText = 'JOB PORTAL';

      chrome.tabs.sendMessage(tab.id, { action: 'extract_job' }, (response) => {
        if (response && response.metadata) {
          if (response.metadata.title) titleEl.innerText = response.metadata.title;
          if (response.metadata.company) companyEl.innerText = response.metadata.company;
          if (response.metadata.location) locationEl.innerText = response.metadata.location;
          if (response.metadata.portal) portalEl.innerText = response.metadata.portal.toUpperCase();
        } else {
          titleEl.innerText = tab.title || 'Browsing Careers Portal';
          companyEl.innerText = 'Ready for autonomous application';
        }
      });

      chrome.tabs.sendMessage(tab.id, { action: 'get_agent_state' }, (response) => {
        if (response && response.isRunning) {
          setAgentRunningUI(true);
        } else {
          setAgentRunningUI(false);
        }
      });
    } catch (e) {
      titleEl.innerText = 'Active Tab Connected';
      companyEl.innerText = 'Ready for candidate form autofill';
    }
  }

  scanActiveTab();

  function setAgentRunningUI(running) {
    isAgentRunning = running;
    if (running) {
      btnTabAgent.classList.add('running');
      agentBtnText.innerText = 'Stop Agent';
      btnTabAgent.querySelector('span:first-child').innerText = '■';
      noticeEl.innerText = 'Agent actively driving browser tab...';
    } else {
      btnTabAgent.classList.remove('running');
      agentBtnText.innerText = 'Start Autonomous Apply Agent';
      btnTabAgent.querySelector('span:first-child').innerText = '⚡';
      noticeEl.innerText = 'Desktop Bridge: 127.0.0.1:5056';
    }
  }

  // Candidate Edit Drawer Toggle and Save
  const btnToggleEditCand = document.getElementById('btn-toggle-edit-cand');
  const candEditDrawer = document.getElementById('pop-cand-edit-drawer');
  const btnSaveCand = document.getElementById('pop-btn-save-cand');

  if (btnToggleEditCand && candEditDrawer) {
    btnToggleEditCand.addEventListener('click', () => {
      const isHidden = candEditDrawer.style.display === 'none';
      candEditDrawer.style.display = isHidden ? 'flex' : 'none';
      btnToggleEditCand.querySelector('span:last-child').innerText = isHidden ? 'Close Candidate Editor' : 'Review & Edit Candidate Profile';
    });
  }

  if (btnSaveCand) {
    btnSaveCand.addEventListener('click', () => {
      const updatedCand = {
        name: document.getElementById('pop-input-name')?.value || 'Vansh Sharma',
        email: document.getElementById('pop-input-email')?.value || 'engagevansh@gmail.com',
        phone: document.getElementById('pop-input-phone')?.value || '+919368478556',
        expectedCtc: document.getElementById('pop-input-ctc')?.value || 'Negotiable (6 - 10 LPA)',
        noticePeriod: document.getElementById('pop-input-notice')?.value || 'Immediate',
        pitch: document.getElementById('pop-input-pitch')?.value || ''
      };

      btnSaveCand.innerHTML = '<span>✓</span> <span>Saving to Bridge...</span>';

      chrome.runtime.sendMessage({
        type: 'UPDATE_CANDIDATE_PROFILE',
        profile: updatedCand
      }, (res) => {
        btnSaveCand.innerHTML = '<span>✓</span> <span>Saved!</span>';
        const candName = document.getElementById('cand-name');
        if (candName) candName.innerText = updatedCand.name;
        setTimeout(() => {
          btnSaveCand.innerHTML = '<span>💾</span> <span>Save Candidate Details</span>';
          if (candEditDrawer) candEditDrawer.style.display = 'none';
          if (btnToggleEditCand) btnToggleEditCand.querySelector('span:last-child').innerText = 'Review & Edit Candidate Profile';
        }, 1200);
      });
    });
  }

  // Toggle Autonomous Apply Agent
  if (btnTabAgent) {
    btnTabAgent.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      if (!isAgentRunning) {
        setAgentRunningUI(true);
        chrome.tabs.sendMessage(tab.id, { action: 'start_autonomous_apply' }, () => {
          setTimeout(scanActiveTab, 1500);
        });
      } else {
        setAgentRunningUI(false);
        chrome.runtime.sendMessage({ type: 'ABORT_AGENT' });
        chrome.tabs.sendMessage(tab.id, { action: 'abort' }, () => {});
      }
    });
  }

  // Sync Current Job to Ledger
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      btnSync.disabled = true;
      btnSync.innerText = 'Syncing...';

      chrome.tabs.sendMessage(tab.id, { action: 'sync_to_ledger' }, (res) => {
        btnSync.disabled = false;
        btnSync.innerHTML = '<span>✓</span> <span>Synced to Ledger!</span>';
        setTimeout(() => {
          btnSync.innerHTML = '<span>📋</span> <span>Sync Application to Desktop Ledger</span>';
        }, 2000);
      });
    });
  }
});
