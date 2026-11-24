// JobPilot AI : Autonomous Career Agent Companion Content Script
// Precision Form Autofill, Duplicate Checker, ATS Keyword Matcher, and Scam Detector
(function() {
  if (window.__JOBPILOT_COMPANION_ACTIVE) return;
  window.__JOBPILOT_COMPANION_ACTIVE = true;

  let activeCandidate = null;
  let activeJobMeta = null;

  // Retrieve candidate profile from background/bridge
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

    const h1 = document.querySelector('h1');
    if (h1 && h1.innerText.trim().length > 2) {
      title = h1.innerText.trim();
    }

    const companySelectors = [
      '[data-company-name="true"]',
      '.company-name',
      '.topcard__org-name-link',
      '.job-details-jobs-unified-top-card__company-name',
      '.company_name',
      '.employer-name',
      '[data-testid="inlineHeader-companyName"]',
      '.header-employer'
    ];
    for (const sel of companySelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) {
        company = el.innerText.trim();
        break;
      }
    }

    if (!company) {
      const parts = document.title.split(/[-|]/);
      if (parts.length >= 2) {
        company = parts[1].trim();
      } else {
        company = 'Target Tech Company';
      }
    }

    // Extract JD description text for keyword matching and fraud detection
    const jdEl = document.querySelector('#jobDescriptionText, .jobs-description, .description, [class*="job-details"], article');
    const descriptionText = jdEl ? jdEl.innerText.slice(0, 4000) : '';

    activeJobMeta = {
      title,
      company,
      portal,
      location,
      url: window.location.href,
      description: descriptionText
    };

    return activeJobMeta;
  }

  // Auto-fill forms with comprehensive candidate data and edge case handling
  function executeAutoFill(customCandidate) {
    const cand = customCandidate || activeCandidate || {
      name: 'Vansh Sharma',
      firstName: 'Vansh',
      lastName: 'Sharma',
      email: 'engagevansh@gmail.com',
      phone: '+919999999999',
      phoneDigits: '9999999999',
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India',
      pinCode: '122001',
      location: 'Gurgaon / Delhi NCR / Bengaluru / Remote',
      education: 'Master of Computer Applications (MCA) in AI and Data Science',
      degree: 'Master of Computer Applications',
      college: 'Amity University',
      gradYear: '2026',
      cgpa: '8.5',
      experienceYears: '1',
      noticePeriod: 'Immediate',
      noticeDays: '0',
      currentCtc: '0',
      expectedCtc: '600000',
      linkedin: 'https://linkedin.com/in/vansh-sharma',
      github: 'https://github.com/Vansh-Sharmaa',
      portfolio: 'https://github.com/Vansh-Sharmaa',
      pitch: 'MCA in AI & Data Science (Class of 2026). Hands-on experience building LangChain RAG pipelines, PyTorch models, and scalable Python/FastAPI microservices. Immediate joiner.'
    };

    const inputs = document.querySelectorAll('input, textarea, select');
    let filledCount = 0;

    inputs.forEach(el => {
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const identifier = (el.name + ' ' + el.id + ' ' + el.placeholder + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();

      // Skip hidden, submit, buttons
      if (type === 'hidden' || type === 'submit' || type === 'button') return;

      // React / Modern Framework event trigger helper
      const triggerEvents = (elem) => {
        elem.dispatchEvent(new Event('input', { bubbles: true }));
        elem.dispatchEvent(new Event('change', { bubbles: true }));
        elem.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      // 1. Radio Buttons and Checkboxes (Yes/No questions)
      if (type === 'radio' || type === 'checkbox') {
        const labelEl = el.closest('label') || document.querySelector(`label[for="${el.id}"]`);
        const labelText = ((labelEl ? labelEl.innerText : '') + ' ' + identifier).toLowerCase();

        // Work authorization / legal right to work
        if ((labelText.includes('authorized') || labelText.includes('legally authorized') || labelText.includes('eligible to work')) && !labelText.includes('sponsorship')) {
          if (labelText.includes('yes') || el.value.toLowerCase() === 'yes') {
            el.checked = true;
            triggerEvents(el);
            filledCount++;
          }
        }
        // Visa sponsorship required
        else if (labelText.includes('sponsorship') || labelText.includes('require visa')) {
          if (labelText.includes('no') || el.value.toLowerCase() === 'no') {
            el.checked = true;
            triggerEvents(el);
            filledCount++;
          }
        }
        // Willing to relocate / open to work in India
        else if (labelText.includes('relocate') || labelText.includes('willing to travel') || labelText.includes('comfortable working')) {
          if (labelText.includes('yes') || el.value.toLowerCase() === 'yes') {
            el.checked = true;
            triggerEvents(el);
            filledCount++;
          }
        }
        // Immediate joining
        else if (labelText.includes('immediate') || labelText.includes('join immediately')) {
          if (labelText.includes('yes') || el.value.toLowerCase() === 'yes' || type === 'checkbox') {
            el.checked = true;
            triggerEvents(el);
            filledCount++;
          }
        }
        // Terms, conditions, declaration agreement
        else if (type === 'checkbox' && (labelText.includes('agree') || labelText.includes('certify') || labelText.includes('consent') || labelText.includes('acknowledge'))) {
          el.checked = true;
          triggerEvents(el);
          filledCount++;
        }
        return;
      }

      // 2. Select Dropdown Elements
      if (tag === 'select') {
        const options = Array.from(el.options);
        // Notice Period
        if (identifier.includes('notice')) {
          const opt = options.find(o => o.text.toLowerCase().includes('immediate') || o.text.toLowerCase().includes('0 days') || o.text.toLowerCase().includes('15 days') || o.value === '0');
          if (opt) { el.value = opt.value; triggerEvents(el); filledCount++; }
        }
        // Experience Level
        else if (identifier.includes('experience') || identifier.includes('yoe')) {
          const opt = options.find(o => o.text.toLowerCase().includes('0-1') || o.text.toLowerCase().includes('1-2') || o.text.toLowerCase().includes('entry') || o.text.toLowerCase().includes('fresher') || o.value === '1');
          if (opt) { el.value = opt.value; triggerEvents(el); filledCount++; }
        }
        // Education / Degree
        else if (identifier.includes('education') || identifier.includes('degree') || identifier.includes('qualification')) {
          const opt = options.find(o => o.text.toLowerCase().includes('master') || o.text.toLowerCase().includes('post graduate') || o.text.toLowerCase().includes('mca') || o.text.toLowerCase().includes('m.tech') || o.text.toLowerCase().includes('bachelor'));
          if (opt) { el.value = opt.value; triggerEvents(el); filledCount++; }
        }
        // Country
        else if (identifier.includes('country')) {
          const opt = options.find(o => o.text.toLowerCase() === 'india' || o.value.toLowerCase() === 'in');
          if (opt) { el.value = opt.value; triggerEvents(el); filledCount++; }
        }
        return;
      }

      // 3. Text and Number Inputs
      if (el.value && el.value.trim().length > 0) return; // Do not overwrite existing entries

      // Full Name / Candidate Name
      if ((identifier.includes('full name') || identifier.includes('candidate name') || identifier.includes('your name')) && !identifier.includes('first') && !identifier.includes('last')) {
        el.value = cand.name;
        triggerEvents(el);
        filledCount++;
      }
      // First Name
      else if (identifier.includes('first name') || identifier.includes('firstname') || identifier.includes('fname')) {
        el.value = cand.firstName || 'Vansh';
        triggerEvents(el);
        filledCount++;
      }
      // Last Name
      else if (identifier.includes('last name') || identifier.includes('lastname') || identifier.includes('lname')) {
        el.value = cand.lastName || 'Sharma';
        triggerEvents(el);
        filledCount++;
      }
      // Email Address
      else if (identifier.includes('email') || type === 'email') {
        el.value = cand.email;
        triggerEvents(el);
        filledCount++;
      }
      // Phone / Mobile Number
      else if (identifier.includes('phone') || identifier.includes('mobile') || identifier.includes('contact') || type === 'tel') {
        el.value = type === 'number' ? (cand.phoneDigits || '9999999999') : cand.phone;
        triggerEvents(el);
        filledCount++;
      }
      // LinkedIn Profile URL
      else if (identifier.includes('linkedin')) {
        el.value = cand.linkedin || 'https://linkedin.com/in/vansh-sharma';
        triggerEvents(el);
        filledCount++;
      }
      // GitHub Profile URL
      else if (identifier.includes('github') || identifier.includes('git profile')) {
        el.value = cand.github || 'https://github.com/Vansh-Sharmaa';
        triggerEvents(el);
        filledCount++;
      }
      // Portfolio / Personal Website
      else if (identifier.includes('portfolio') || identifier.includes('website') || identifier.includes('personal url')) {
        el.value = cand.portfolio || 'https://github.com/Vansh-Sharmaa';
        triggerEvents(el);
        filledCount++;
      }
      // City / Location
      else if (identifier.includes('city') || identifier.includes('location') || identifier.includes('address')) {
        el.value = cand.city || 'Gurgaon';
        triggerEvents(el);
        filledCount++;
      }
      // Pincode / Postal Code / Zip
      else if (identifier.includes('pin') || identifier.includes('postal') || identifier.includes('zip')) {
        el.value = cand.pinCode || '122001';
        triggerEvents(el);
        filledCount++;
      }
      // College / Institute / University
      else if (identifier.includes('college') || identifier.includes('university') || identifier.includes('institute') || identifier.includes('school')) {
        el.value = cand.college || 'Amity University';
        triggerEvents(el);
        filledCount++;
      }
      // Degree / Highest Qualification
      else if (identifier.includes('degree') || identifier.includes('qualification') || identifier.includes('major')) {
        el.value = cand.education || 'Master of Computer Applications (MCA) in AI & Data Science';
        triggerEvents(el);
        filledCount++;
      }
      // Passing Year / Graduation Year
      else if (identifier.includes('passing year') || identifier.includes('grad year') || identifier.includes('graduation year')) {
        el.value = cand.gradYear || '2026';
        triggerEvents(el);
        filledCount++;
      }
      // CGPA / Marks / Percentage
      else if (identifier.includes('cgpa') || identifier.includes('gpa') || identifier.includes('percentage')) {
        el.value = cand.cgpa || '8.5';
        triggerEvents(el);
        filledCount++;
      }
      // Notice Period
      else if (identifier.includes('notice') || identifier.includes('how soon') || identifier.includes('joining date')) {
        el.value = type === 'number' ? (cand.noticeDays || '0') : (cand.noticePeriod || 'Immediate');
        triggerEvents(el);
        filledCount++;
      }
      // Current CTC / Present Salary
      else if (identifier.includes('current ctc') || identifier.includes('current salary') || identifier.includes('present ctc')) {
        el.value = type === 'number' ? '0' : '0 (Fresher)';
        triggerEvents(el);
        filledCount++;
      }
      // Expected CTC / Expected Salary
      else if (identifier.includes('expected ctc') || identifier.includes('expected salary')) {
        el.value = type === 'number' ? (cand.expectedCtc || '600000') : (cand.expectedCtcLabel || 'Negotiable (6 - 10 LPA)');
        triggerEvents(el);
        filledCount++;
      }
      // Total Years of Experience
      else if (identifier.includes('total experience') || identifier.includes('total yoe') || (identifier.includes('experience') && !identifier.includes('python') && !identifier.includes('pytorch'))) {
        el.value = type === 'number' ? '1' : '1 year (Fresher / Associate)';
        triggerEvents(el);
        filledCount++;
      }
      // Specific Technical Skill Experience
      else if (identifier.includes('python')) {
        el.value = type === 'number' ? '2' : '2 years';
        triggerEvents(el);
        filledCount++;
      }
      else if (identifier.includes('pytorch') || identifier.includes('deep learning')) {
        el.value = type === 'number' ? '1' : '1 year';
        triggerEvents(el);
        filledCount++;
      }
      else if (identifier.includes('langchain') || identifier.includes('rag') || identifier.includes('llm')) {
        el.value = type === 'number' ? '1' : '1 year';
        triggerEvents(el);
        filledCount++;
      }
      else if (identifier.includes('sql') || identifier.includes('database')) {
        el.value = type === 'number' ? '2' : '2 years';
        triggerEvents(el);
        filledCount++;
      }
      else if (identifier.includes('fastapi') || identifier.includes('rest api')) {
        el.value = type === 'number' ? '1' : '1 year';
        triggerEvents(el);
        filledCount++;
      }
      // Generic question or cover letter textarea
      else if (tag === 'textarea' && !el.value) {
        el.value = cand.pitch || 'MCA in AI & Data Science (Class of 2026). Hands-on experience building LangChain RAG pipelines, fine-tuning PyTorch models, and deploying FastAPI microservices. Immediate joiner.';
        triggerEvents(el);
        filledCount++;
      }
    });

    return filledCount;
  }

  // Inject pitch into empty textareas
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
        showPillNotice(`✓ Synced: ${meta.company}`);
      } else {
        showPillNotice('JobPilot desktop active');
      }
    });
  }

  // Duplicate Application and Scam Checker
  async function performSafetyChecks() {
    const meta = extractJobMetadata();

    // 1. Check duplicate against desktop tracker
    try {
      const q = new URLSearchParams({ company: meta.company, role: meta.title, url: meta.url }).toString();
      const res = await fetch(`http://127.0.0.1:5056/api/check-duplicate?${q}`);
      const data = await res.json();
      if (data && data.isDuplicate) {
        showDuplicateBanner(data.date, data.status);
      }
    } catch (e) {}

    // 2. Check for scam keywords in description
    if (meta.description) {
      try {
        const scamRes = await fetch('http://127.0.0.1:5056/api/check-scam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: meta.description })
        });
        const scamData = await scamRes.json();
        if (scamData && scamData.isScam) {
          showScamWarning(scamData.flags);
        }
      } catch (e) {}
    }
  }

  function showDuplicateBanner(date, status) {
    if (document.getElementById('jp-duplicate-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'jp-duplicate-banner';
    banner.style.cssText = 'position: fixed; top: 10px; right: 20px; z-index: 999999; background: #16161c; border: 1px solid rgba(245, 158, 11, 0.4); border-left: 4px solid #f59e0b; color: #fff; padding: 8px 14px; border-radius: 6px; font-family: -apple-system, system-ui, sans-serif; font-size: 11.5px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 8px;';
    banner.innerHTML = `
      <span style="color: #f59e0b; font-size: 13px;">⚠</span>
      <span><strong>Already Applied:</strong> Recorded on ${date || 'recent date'} (${status || 'Submitted'}).</span>
      <span style="cursor: pointer; color: #6b7280; font-size: 14px;" onclick="this.parentElement.remove()">✕</span>
    `;
    document.body.appendChild(banner);
  }

  function showScamWarning(flags) {
    if (document.getElementById('jp-scam-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'jp-scam-banner';
    banner.style.cssText = 'position: fixed; top: 50px; right: 20px; z-index: 999999; background: #1c1414; border: 1px solid rgba(239, 68, 68, 0.4); border-left: 4px solid #ef4444; color: #fff; padding: 8px 14px; border-radius: 6px; font-family: -apple-system, system-ui, sans-serif; font-size: 11.5px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); display: flex; align-items: center; gap: 8px;';
    banner.innerHTML = `
      <span style="color: #ef4444; font-size: 13px;">🛑</span>
      <span><strong>Safety Alert:</strong> Potential fee/consultancy deposit flag: "${flags.join(', ')}". Do not pay money.</span>
      <span style="cursor: pointer; color: #6b7280; font-size: 14px;" onclick="this.parentElement.remove()">✕</span>
    `;
    document.body.appendChild(banner);
  }

  // Floating JobPilot Widget (Antigravity Minimalist Style)
  function createFloatingPill() {
    if (document.getElementById('jobpilot-floating-pill')) return;

    const pill = document.createElement('div');
    pill.id = 'jobpilot-floating-pill';
    pill.innerHTML = `
      <div class="jp-pill-header">
        <span class="jp-logo">▲ JobPilot</span>
        <span class="jp-btn-close" onclick="document.getElementById('jobpilot-floating-pill').remove()">✕</span>
      </div>
      <div class="jp-pill-actions">
        <button class="jp-action-btn primary" id="jp-btn-autofill">⚡ Smart Apply</button>
        <button class="jp-action-btn" id="jp-btn-pitch">📄 Pitch</button>
        <button class="jp-action-btn" id="jp-btn-tailor">⚡ Tailor PDF</button>
        <button class="jp-action-btn" id="jp-btn-sync">📋 Log</button>
      </div>
      <div class="jp-pill-status" id="jp-pill-status">Connected to Desktop</div>
    `;

    document.body.appendChild(pill);

    document.getElementById('jp-btn-autofill').addEventListener('click', () => {
      const filled = executeAutoFill();
      showPillNotice(`Auto-filled ${filled} fields.`);
    });

    document.getElementById('jp-btn-pitch').addEventListener('click', () => {
      const injected = executeInjectPitch();
      showPillNotice(`Injected pitch into ${injected} textarea(s).`);
    });

    document.getElementById('jp-btn-tailor').addEventListener('click', async () => {
      showPillNotice('Tailoring 1-page ATS resume...');
      const meta = extractJobMetadata();
      try {
        const res = await fetch('http://127.0.0.1:5056/api/tailor-resume', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: meta.company, role: meta.title, jd: meta.description })
        });
        const data = await res.json();
        if (data && data.ok) {
          showPillNotice(`✓ ATS Resume ready: ${meta.company}`);
        } else {
          showPillNotice('Tailoring request sent to desktop.');
        }
      } catch (e) {
        showPillNotice('Desktop offline. Open JobPilot.');
      }
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
      }, 3500);
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
    performSafetyChecks();
    const meta = extractJobMetadata();
    chrome.runtime.sendMessage({ type: 'SEND_ACTIVE_JOB', payload: meta });
  }, 1000);
})();
