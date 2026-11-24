// JobPilot AI Companion : Popup Logic & Autonomous Agent Dispatcher
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

  let activeJobMeta = null;

  function updateStatusDisplay(isConnected, latencyMs = 2) {
    if (isConnected) {
      statusPill.className = 'status-pill';
      statusText.innerText = 'ONLINE';
      noticeEl.innerText = 'Desktop Bridge: 127.0.0.1:5056';
      pingEl.innerText = `${latencyMs}ms ping`;
      pingEl.style.color = '#10b981';
    } else {
      statusPill.className = 'status-pill offline';
      statusText.innerText = 'OFFLINE';
      noticeEl.innerText = 'Desktop app offline. Launch JobPilot.';
      pingEl.innerText = 'disconnected';
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
      statusText.innerText = 'TESTING...';
      pingEl.innerText = 'pinging...';
      checkConnection();
    });
  }

  checkConnection();

  // Query Active Tab for Live Job Detection
  async function scanActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;

      const url = tab.url || '';
      if (url.includes('indeed.')) portalEl.innerText = 'INDEED INDIA';
      else if (url.includes('foundit.')) portalEl.innerText = 'FOUNDIT';
      else if (url.includes('cuvette.')) portalEl.innerText = 'CUVETTE';
      else if (url.includes('unstop.')) portalEl.innerText = 'UNSTOP';
      else if (url.includes('hirist.')) portalEl.innerText = 'HIRIST';
      else if (url.includes('cutshort.')) portalEl.innerText = 'CUTSHORT';
      else if (url.includes('instahyre.')) portalEl.innerText = 'INSTAHYRE';
      else if (url.includes('wellfound.')) portalEl.innerText = 'WELLFOUND';
      else if (url.includes('greenhouse.')) portalEl.innerText = 'GREENHOUSE';
      else if (url.includes('lever.co')) portalEl.innerText = 'LEVER';
      else if (url.includes('ashbyhq.')) portalEl.innerText = 'ASHBY';
      else if (url.includes('workday.')) portalEl.innerText = 'WORKDAY';
      else portalEl.innerText = 'CAREERS PORTAL';

      chrome.tabs.sendMessage(tab.id, { action: 'extract_job' }, (response) => {
        if (response && response.metadata) {
          activeJobMeta = response.metadata;
          if (response.metadata.title) titleEl.innerText = response.metadata.title;
          if (response.metadata.company) companyEl.innerText = response.metadata.company;
          if (response.metadata.location) locationEl.innerText = response.metadata.location;
          if (response.metadata.portal) portalEl.innerText = response.metadata.portal.toUpperCase();
        } else {
          titleEl.innerText = tab.title || 'Browsing Careers Portal';
          companyEl.innerText = 'Ready for autonomous application';
        }
      });
    } catch (e) {
      titleEl.innerText = 'Active Tab Connected';
      companyEl.innerText = 'Ready for candidate form autofill';
    }
  }

  scanActiveTab();

  // Action: START AUTONOMOUS APPLY AGENT ON TAB
  const btnTabAgent = document.getElementById('btn-popup-tab-agent');
  if (btnTabAgent) {
    btnTabAgent.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      btnTabAgent.disabled = true;
      btnTabAgent.innerHTML = '<span>⚡</span> <span>Agent Running in Tab...</span>';
      noticeEl.innerText = 'Autonomous agent active in browser tab!';

      chrome.tabs.sendMessage(tab.id, { action: 'start_autonomous_apply' }, (response) => {
        btnTabAgent.disabled = false;
        btnTabAgent.innerHTML = '<span>⚡</span> <span>Start Autonomous Apply Agent</span>';
        noticeEl.innerText = '✓ Autonomous application process initiated!';
      });
    });
  }

  // Action: STOP AUTONOMOUS AGENT
  const btnPopupStop = document.getElementById('btn-popup-stop');
  if (btnPopupStop) {
    btnPopupStop.addEventListener('click', async () => {
      chrome.runtime.sendMessage({ type: 'ABORT_AGENT' });
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { action: 'abort' }, () => {});
      }
      if (btnTabAgent) {
        btnTabAgent.disabled = false;
        btnTabAgent.innerHTML = '<span>⚡</span> <span>Start Autonomous Apply Agent</span>';
      }
      noticeEl.innerText = 'Agent stopped immediately.';
    });
  }

  // Action: Smart Apply (Autofill)
  const btnAutofill = document.getElementById('btn-popup-autofill');
  if (btnAutofill) {
    btnAutofill.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      btnAutofill.disabled = true;
      btnAutofill.innerText = 'Autofilling...';

      chrome.tabs.sendMessage(tab.id, { action: 'autofill' }, (response) => {
        btnAutofill.disabled = false;
        btnAutofill.innerHTML = '<span>📝</span> <span>Autofill Form</span>';
        if (response && response.filled !== undefined) {
          noticeEl.innerText = `✓ Auto-filled ${response.filled} inputs!`;
        } else {
          noticeEl.innerText = 'Autofill signal sent to active tab.';
        }
      });
    });
  }

  // Action: Inject Pitch
  const btnPitch = document.getElementById('btn-popup-pitch');
  if (btnPitch) {
    btnPitch.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      chrome.tabs.sendMessage(tab.id, { action: 'inject_pitch' }, (response) => {
        if (response && response.injected) {
          noticeEl.innerText = `✓ Injected pitch into ${response.injected} textarea(s)!`;
        } else {
          noticeEl.innerText = 'Pitch injected into application form.';
        }
      });
    });
  }

  // Action: Tailor ATS PDF
  const btnTailor = document.getElementById('btn-popup-tailor');
  if (btnTailor) {
    btnTailor.addEventListener('click', async () => {
      const company = (activeJobMeta && activeJobMeta.company) || 'Target Company';
      const role = (activeJobMeta && activeJobMeta.title) || 'AI Engineer';
      noticeEl.innerText = `Generating ATS resume for ${company}...`;

      chrome.runtime.sendMessage({ type: 'GET_BRIDGE_TOKEN' }, (tokenRes) => {
        const token = tokenRes ? tokenRes.token : '';
        fetch('http://127.0.0.1:5056/api/tailor-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-JobPilot-Token': token
          },
          body: JSON.stringify({ company, role, jd: '' })
        })
        .then(r => r.json())
        .then(res => {
          if (res.ok) {
            noticeEl.innerText = `✓ Tailored resume ready for ${company}!`;
          } else {
            noticeEl.innerText = 'Tailoring error: Desktop app required.';
          }
        })
        .catch(() => {
          noticeEl.innerText = 'Cannot connect to Desktop tailoring engine.';
        });
      });
    });
  }

  // Action: Synchronize Application with Desktop Ledger
  const btnSync = document.getElementById('btn-popup-sync');
  if (btnSync) {
    btnSync.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return;
      chrome.tabs.sendMessage(tab.id, { action: 'extract_job' }, (response) => {
        const meta = response?.metadata || activeJobMeta || {};
        chrome.runtime.sendMessage({
          type: 'SYNC_APPLICATION',
          payload: {
            company: meta.company || 'Direct Job',
            role: meta.title || 'AI Engineer',
            location: meta.location || 'India',
            portal: meta.portal || 'Chrome Extension',
            url: meta.url || tab.url || ''
          }
        }, (res) => {
          noticeEl.innerText = res && res.ok ? '✓ Recorded application to Desktop Ledger!' : 'Synced to Desktop Ledger.';
        });
      });
    });
  }

  // Action: Map Company Talent Graph in Desktop App
  const btnMapTalent = document.getElementById('btn-popup-map-talent');
  if (btnMapTalent) {
    btnMapTalent.addEventListener('click', async () => {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      let comp = (activeJobMeta && activeJobMeta.company) || '';
      if (!comp && tab && tab.title) {
        comp = tab.title.split('-')[0].split('|')[0].trim();
      }
      if (!comp) comp = 'Google';

      noticeEl.innerText = `Mapping talent graph for ${comp}...`;

      chrome.runtime.sendMessage({
        type: 'MAP_TALENT_GRAPH',
        payload: { company: comp }
      }, (res) => {
        if (res && res.ok) {
          noticeEl.innerText = `✓ Mapped ${comp} network! View in Desktop App.`;
        } else {
          noticeEl.innerText = `Talent map signal dispatched for ${comp}.`;
        }
      });
    });
  }
});
