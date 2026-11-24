// JobPilot AI Companion - Content Script
(function() {
  let activeCandidate = null;

  // Retrieve current candidate details from background
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (res && res.candidate) {
      activeCandidate = res.candidate;
    }
  });

  // Extract job metadata from active page
  function extractJobMetadata() {
    const host = window.location.hostname.toLowerCase();
    let portal = 'General';
    if (host.includes('indeed')) portal = 'Indeed';
    else if (host.includes('linkedin')) portal = 'LinkedIn';
    else if (host.includes('naukri')) portal = 'Naukri';
    else if (host.includes('internshala')) portal = 'Internshala';
    else if (host.includes('cuvette')) portal = 'Cuvette';
    else if (host.includes('unstop')) portal = 'Unstop';
    else if (host.includes('hirist')) portal = 'Hirist';
    else if (host.includes('cutshort')) portal = 'Cutshort';
    else if (host.includes('instahyre')) portal = 'Instahyre';
    else if (host.includes('foundit')) portal = 'foundit';
    else if (host.includes('shine')) portal = 'Shine';
    else if (host.includes('wellfound')) portal = 'Wellfound';
    else if (host.includes('workatastartup') || host.includes('ycombinator')) portal = 'YC Startup';
    else if (host.includes('hasjob')) portal = 'Hasjob';
    else if (host.includes('glassdoor')) portal = 'Glassdoor';
    else if (host.includes('remoteok')) portal = 'RemoteOK';
    else if (host.includes('weworkremotely')) portal = 'WeWorkRemotely';
    else if (host.includes('levels.fyi')) portal = 'Levels.fyi';
    else if (host.includes('turing')) portal = 'Turing';
    else if (host.includes('dice')) portal = 'Dice';
    else if (host.includes('google.com/forms')) portal = 'Google Forms';

    // Heuristics for job title and company
    let title = document.title;
    let company = '';
    let location = 'India / Remote';

    // Standard portal selectors
    const h1 = document.querySelector('h1');
    if (h1 && h1.innerText.trim().length > 2) {
      title = h1.innerText.trim();
    }

    const companyEl = document.querySelector('[data-company-name="true"], .company-name, .topcard__org-name-link, .job-details-jobs-unified-top-card__company-name');
    if (companyEl) {
      company = companyEl.innerText.trim();
    }

    if (!company) {
      // Fallback from title (e.g. "AI Engineer - Stylox Fashion - Gurgaon")
      const parts = document.title.split(/[-|]/);
      if (parts.length >= 2) {
        company = parts[1].trim();
      } else {
        company = 'Target Tech Company';
      }
    }

    return {
      title,
      company,
      portal,
      location,
      url: window.location.href
    };
  }

  // Auto-fill forms with candidate data
  function executeAutoFill(customCandidate) {
    const cand = customCandidate || activeCandidate || {
      name: 'Vansh Sharma',
      email: 'engagevansh@gmail.com',
      phone: '+919999999999',
      noticePeriod: 'Immediate',
      experience: '1',
      location: 'Gurgaon',
      pitch: 'MCA in AI & Data Science (Class of 2026). Hands-on experience building LangChain RAG pipelines, PyTorch models, and scalable Python/FastAPI microservices. Immediate joiner.'
    };

    const inputs = document.querySelectorAll('input, textarea, select');
    let filledCount = 0;

    inputs.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const identifier = (el.name + ' ' + el.id + ' ' + el.placeholder + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();

      if (type === 'hidden' || type === 'submit' || type === 'button') return;

      if ((identifier.includes('full name') || identifier.includes('candidate name') || identifier.includes('first name')) && !el.value) {
        el.value = cand.name;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
      } else if (identifier.includes('last name') && !el.value) {
        el.value = 'Sharma';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        filledCount++;
      } else if (identifier.includes('email') && !el.value) {
        el.value = cand.email;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
      } else if ((identifier.includes('phone') || identifier.includes('mobile') || identifier.includes('contact')) && !el.value) {
        el.value = cand.phone;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
      } else if ((identifier.includes('experience') || identifier.includes('yoe') || identifier.includes('total exp')) && !el.value) {
        el.value = cand.experience || '1';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        filledCount++;
      } else if (identifier.includes('notice') && !el.value) {
        el.value = cand.noticePeriod || 'Immediate';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        filledCount++;
      } else if ((identifier.includes('city') || identifier.includes('location')) && !el.value) {
        el.value = 'Gurgaon';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        filledCount++;
      }
    });

    return filledCount;
  }

  // Inject pitch into textareas
  function executeInjectPitch() {
    const pitch = activeCandidate?.pitch || 'MCA in AI & Data Science (Class of 2026). Hands-on experience building LangChain RAG pipelines, PyTorch models, and scalable Python/FastAPI microservices. Immediate joiner.';
    const textareas = document.querySelectorAll('textarea');
    let injected = 0;
    textareas.forEach(t => {
      if (!t.value || t.value.length < 10) {
        t.value = pitch;
        t.dispatchEvent(new Event('input', { bubbles: true }));
        t.dispatchEvent(new Event('change', { bubbles: true }));
        injected++;
      }
    });
    return injected;
  }

  // Synchronize applied job with JobPilot desktop app
  function syncJobToDesktop() {
    const meta = extractJobMetadata();
    chrome.runtime.sendMessage({
      type: 'SYNC_APPLICATION',
      payload: {
        company: meta.company,
        role: meta.title,
        location: meta.location,
        portal: meta.portal,
        url: meta.url
      }
    }, (res) => {
      if (res && res.ok) {
        showPillNotice(`✓ Synced to JobPilot: ${meta.company}`);
      } else {
        showPillNotice('Desktop app offline. Open JobPilot AI.');
      }
    });
  }

  // Show Floating JobPilot Widget on Job Websites
  function createFloatingPill() {
    if (document.getElementById('jobpilot-floating-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'jobpilot-floating-pill';
    pill.innerHTML = `
      <div class="jp-pill-header">
        <span class="jp-logo">⚡ JobPilot AI</span>
        <span class="jp-btn-close" onclick="document.getElementById('jobpilot-floating-pill').remove()">×</span>
      </div>
      <div class="jp-pill-actions">
        <button class="jp-action-btn primary" id="jp-btn-autofill">⚡ Smart Apply</button>
        <button class="jp-action-btn" id="jp-btn-pitch">📄 Pitch</button>
        <button class="jp-action-btn" id="jp-btn-sync">📋 Sync</button>
      </div>
      <div class="jp-pill-status" id="jp-pill-status">Connected to Desktop</div>
    `;

    document.body.appendChild(pill);

    document.getElementById('jp-btn-autofill').addEventListener('click', () => {
      const filled = executeAutoFill();
      showPillNotice(`Auto-filled ${filled} input fields.`);
    });

    document.getElementById('jp-btn-pitch').addEventListener('click', () => {
      const injected = executeInjectPitch();
      showPillNotice(`Injected pitch into ${injected} textarea(s).`);
    });

    document.getElementById('jp-btn-sync').addEventListener('click', () => {
      syncJobToDesktop();
    });
  }

  function showPillNotice(msg) {
    const st = document.getElementById('jp-pill-status');
    if (st) {
      st.innerText = msg;
      st.style.color = '#38bdf8';
      setTimeout(() => {
        st.innerText = 'Connected to Desktop';
        st.style.color = '#94a3b8';
      }, 3000);
    }
  }

  // Listen for commands dispatched from desktop agent via background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'autofill') {
      const filled = executeAutoFill(request.candidate);
      sendResponse({ status: 'success', filled });
    } else if (request.action === 'inject_pitch') {
      const injected = executeInjectPitch();
      sendResponse({ status: 'success', injected });
    } else if (request.action === 'extract_job') {
      const meta = extractJobMetadata();
      sendResponse({ status: 'success', metadata: meta });
    }
    return true;
  });

  // Automatically detect application submission clicks
  document.addEventListener('click', (e) => {
    const el = e.target;
    const txt = (el.innerText || el.value || '').toLowerCase();
    if (
      txt.includes('submit application') ||
      txt.includes('send application') ||
      txt.includes('apply now') ||
      txt.includes('confirm application')
    ) {
      setTimeout(syncJobToDesktop, 1500);
    }
  }, true);

  // Initialize
  setTimeout(() => {
    createFloatingPill();
    const meta = extractJobMetadata();
    chrome.runtime.sendMessage({ type: 'SEND_ACTIVE_JOB', payload: meta });
  }, 1000);
})();
