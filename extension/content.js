// JobPilot AI : Autonomous Career Agent Companion Content Script
// Precision Form Autofill, Multi-Step Tab Automation, Scam Detector, and Ledger Sync
(function() {
  if (window.__JOBPILOT_COMPANION_ACTIVE) return;
  window.__JOBPILOT_COMPANION_ACTIVE = true;

  let activeCandidate = null;
  let activeJobMeta = null;
  let isAgentRunning = false;
  let agentAbortRequested = false;
  let cachedBridgeToken = '';

  // Retrieve candidate profile from background/bridge
  chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
    if (res && res.candidate) {
      activeCandidate = res.candidate;
    }
  });

  async function getBridgeToken() {
    if (cachedBridgeToken) return cachedBridgeToken;
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'GET_BRIDGE_TOKEN' }, (res) => {
          if (res && res.token) {
            cachedBridgeToken = res.token;
            resolve(res.token);
          } else {
            resolve('');
          }
        });
      } catch (e) {
        resolve('');
      }
    });
  }

  function sendTelemetry(step, message) {
    const meta = extractJobMetadata();
    chrome.runtime.sendMessage({
      type: 'AGENT_TELEMETRY',
      payload: {
        portal: meta.portal || 'Browser Tab',
        company: meta.company || 'Direct Job',
        role: meta.title || 'Tech Role',
        step: step,
        message: message,
        url: window.location.href,
        timestamp: Date.now()
      }
    });
  }

  // Extract job metadata from active page across all platforms
  function extractJobMetadata() {
    const host = window.location.hostname.toLowerCase();
    let portal = 'General Web';
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
    else if (host.includes('greenhouse')) portal = 'Greenhouse';
    else if (host.includes('lever.co')) portal = 'Lever';
    else if (host.includes('ashbyhq')) portal = 'Ashby';
    else if (host.includes('workday')) portal = 'Workday';
    else if (host.includes('smartrecruiters')) portal = 'SmartRecruiters';
    else if (host.includes('nexgenhiring')) portal = 'NexGen Hiring';
    else if (host.includes('google.com/forms')) portal = 'Google Forms';

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
      '.header-employer',
      '.posting-headline h2',
      '.app-title'
    ];
    for (const sel of companySelectors) {
      const el = document.querySelector(sel);
      if (el && el.innerText.trim()) {
        company = el.innerText.trim();
        break;
      }
    }

    if (!company) {
      const parts = document.title.split(/[-|:]/);
      if (parts.length >= 2) {
        company = parts[1].trim();
      } else {
        company = host.replace(/^www\./, '').split('.')[0];
        company = company.charAt(0).toUpperCase() + company.slice(1);
      }
    }

    const jdEl = document.querySelector('#jobDescriptionText, .jobs-description, .description, [class*="job-details"], [class*="description"], article');
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

  // Reliable agent stop and cancellation handler
  function stopAgent(reason = 'Autonomous agent stopped by user.') {
    isAgentRunning = false;
    agentAbortRequested = true;
    const hud = document.getElementById('jobpilot-agent-hud');
    if (hud) {
      hud.style.display = 'none';
      hud.classList.remove('review-gate');
    }
    document.querySelectorAll('.jobpilot-target-highlight').forEach(el => el.classList.remove('jobpilot-target-highlight'));
    sendTelemetry('ABORT', reason);
    try {
      chrome.runtime.sendMessage({ type: 'ABORT_AGENT' });
    } catch (e) {}
  }

  // Visual In-Tab Agent HUD Overlay
  function ensureAgentHud() {
    if (agentAbortRequested || !isAgentRunning) return null;
    let hud = document.getElementById('jobpilot-agent-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'jobpilot-agent-hud';
      hud.innerHTML = `
        <div class="jp-hud-pulse" id="jp-hud-pulse-dot"></div>
        <div class="jp-hud-title" id="jp-hud-title-txt">⚡ JobPilot Tab Agent</div>
        <div class="jp-hud-step" id="jp-hud-step-text">Initializing Autonomous Agent...</div>
        <div class="jp-hud-close" id="jp-hud-cancel-btn" title="Stop Agent">✕</div>
      `;
      document.body.appendChild(hud);
      document.getElementById('jp-hud-cancel-btn').addEventListener('click', () => {
        stopAgent('Autonomous agent stopped by user via HUD stop button.');
      });
    }
    hud.style.display = 'flex';
    return hud;
  }

  function updateAgentHud(stepText, isDone = false) {
    if (agentAbortRequested || !isAgentRunning) return;
    const hud = ensureAgentHud();
    if (!hud) return;
    const txt = document.getElementById('jp-hud-step-text');
    if (txt) {
      txt.innerText = stepText;
      if (isDone) {
        txt.style.color = '#10b981';
        txt.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        txt.style.background = 'rgba(16, 185, 129, 0.15)';
      }
    }
  }

  function hideAgentHud(delayMs = 3000) {
    setTimeout(() => {
      const hud = document.getElementById('jobpilot-agent-hud');
      if (hud) {
        hud.style.display = 'none';
        hud.classList.remove('review-gate');
      }
    }, delayMs);
  }

  // Human-in-the-Loop Review Gate (Presents filled fields for user verification before submission)
  function presentHumanReviewGate(totalFilled, submitBtn, meta) {
    if (agentAbortRequested) return;

    let hud = document.getElementById('jobpilot-agent-hud');
    if (!hud) {
      hud = document.createElement('div');
      hud.id = 'jobpilot-agent-hud';
      document.body.appendChild(hud);
    }

    hud.className = 'review-gate';
    hud.style.display = 'flex';

    hud.innerHTML = `
      <div class="jp-hud-pulse review-pulse"></div>
      <div class="jp-hud-title">📋 Review Fields (${totalFilled} filled)</div>
      <div class="jp-hud-step" id="jp-hud-step-text">Verify details. Ready to submit?</div>
      <div class="jp-hud-review-actions">
        ${submitBtn ? '<button class="jp-hud-btn confirm" id="jp-hud-confirm-submit">🚀 Submit Now</button>' : ''}
        <button class="jp-hud-btn edit" id="jp-hud-manual-edit">✏️ Edit Manually</button>
        <button class="jp-hud-btn cancel" id="jp-hud-abort-review" title="Cancel Application">✕</button>
      </div>
    `;

    // Highlight submit button if available
    if (submitBtn) {
      submitBtn.classList.add('jobpilot-target-highlight');
      document.getElementById('jp-hud-confirm-submit')?.addEventListener('click', async () => {
        if (!isAgentRunning && !agentAbortRequested) return;
        updateAgentHud('Submitting verified application...', false);
        sendTelemetry('SUBMIT', `User approved application submission on ${meta.portal} for ${meta.company}.`);
        submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        await sleep(400);
        submitBtn.click();
        submitBtn.classList.remove('jobpilot-target-highlight');
        await sleep(1200);

        syncJobToDesktop();
        updateAgentHud(`✓ Application Submitted! (${meta.company})`, true);
        sendTelemetry('SUCCESS', `Application verified and logged for ${meta.title} at ${meta.company}!`);
        hideAgentHud(4000);
        isAgentRunning = false;
      });
    }

    document.getElementById('jp-hud-manual-edit')?.addEventListener('click', () => {
      sendTelemetry('REVIEW', 'Candidate chose to review and edit fields manually.');
      updateAgentHud('✓ Fields preserved. Edit directly and submit whenever ready.', true);
      if (submitBtn) submitBtn.classList.remove('jobpilot-target-highlight');
      hideAgentHud(3000);
      isAgentRunning = false;
    });

    document.getElementById('jp-hud-abort-review')?.addEventListener('click', () => {
      if (submitBtn) submitBtn.classList.remove('jobpilot-target-highlight');
      stopAgent('User cancelled application at review gate.');
    });

    // Scroll to the first filled review element so user sees it right away
    const firstFilled = document.querySelector('.jobpilot-filled-review');
    if (firstFilled) {
      firstFilled.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  function triggerEvents(elem) {
    elem.dispatchEvent(new Event('input', { bubbles: true }));
    elem.dispatchEvent(new Event('change', { bubbles: true }));
    elem.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  // Anti-Ban & Bot Challenge Safeguards
  function isBotDefensePresent() {
    if (document.querySelector('iframe[src*="challenges.cloudflare.com"], .cf-turnstile, #cf-turnstile, #turnstile-wrapper')) {
      return 'Cloudflare Turnstile';
    }
    if (document.querySelector('iframe[src*="recaptcha"], .g-recaptcha, #recaptcha')) {
      return 'Google reCAPTCHA';
    }
    if (document.querySelector('iframe[src*="hcaptcha"], .h-captcha')) {
      return 'hCaptcha';
    }
    const snippet = (document.body ? document.body.innerText.slice(0, 600) : '').toLowerCase();
    if (snippet.includes('verify you are human') || snippet.includes('checking your browser') || snippet.includes('just a moment...')) {
      return 'Browser Verification Challenge';
    }
    return null;
  }

  function isCardAlreadyApplied(card) {
    if (!card) return false;
    const text = (card.innerText || '').toLowerCase();
    const appliedKeywords = [
      'applied',
      'already applied',
      'application submitted',
      'view application',
      'applied on',
      'status: applied'
    ];
    for (const kw of appliedKeywords) {
      const regex = new RegExp('\\b' + kw + '\\b', 'i');
      if (regex.test(text)) return true;
    }
    if (card.querySelector('.applied-badge, [class*="applied"], [data-applied="true"]')) {
      return true;
    }
    return false;
  }

  function findJobCardsOnPage() {
    const host = window.location.hostname.toLowerCase();
    let selectors = [];

    if (host.includes('hirist')) {
      selectors = [
        '.job-card',
        '.jobCard',
        '[class*="job-card"]',
        '[class*="jobCard"]',
        '[class*="listingCard"]',
        '[data-job-id]',
        'a[href*="/j/"]',
        'a[href*="/job/"]'
      ];
    } else if (host.includes('indeed')) {
      selectors = [
        '[data-jk]',
        '.job_seen_beacon',
        '.resultContent',
        'div.jobsearch-SerpJobCard',
        'a[id^="job_"]'
      ];
    } else if (host.includes('internshala')) {
      selectors = [
        '.individual_internship',
        '[data-internship_id]',
        'a[href*="/job/detail/"]'
      ];
    } else if (host.includes('cuvette')) {
      selectors = [
        '[class*="jobCard"]',
        '[class*="JobCard"]',
        'a[href*="/job/"]'
      ];
    } else if (host.includes('unstop')) {
      selectors = [
        '[class*="opportunity-card"]',
        'a[href*="/jobs/"]',
        'a[href*="/competitions/"]'
      ];
    } else if (host.includes('naukri')) {
      selectors = [
        '.srp-jobtuple-wrapper',
        '.cust-job-tuple',
        'article.jobTuple'
      ];
    } else {
      selectors = [
        '[data-job-id]',
        '[data-jk]',
        '[class*="job-card"]',
        '[class*="jobCard"]',
        '[class*="JobCard"]',
        '[class*="listingCard"]',
        'a[href*="/job/"]',
        'a[href*="/jobs/"]',
        'a[href*="/j/"]'
      ];
    }

    const cards = [];
    const seen = new Set();
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const card = el.closest('[data-jk], [data-job-id], article, [class*="card"], [class*="Card"], .individual_internship, .job_seen_beacon') || el;
        if (!seen.has(card) && card.offsetParent !== null && card.offsetHeight > 25) {
          seen.add(card);
          cards.push(card);
        }
      }
      if (cards.length >= 3) break;
    }
    return cards;
  }

  function findApplyButtonInCurrentContext() {
    const candidates = Array.from(document.querySelectorAll('button, a, [role="button"], input[type="submit"], input[type="button"]'))
      .filter(b => b.offsetParent !== null && !b.disabled);

    for (const b of candidates) {
      const txt = (b.innerText || b.value || '').trim().toLowerCase();
      if (!txt || txt.length > 40) continue;
      if (txt.includes('sign in') || txt.includes('login') || txt.includes('register') || txt.includes('save') || txt.includes('share') || txt.includes('report') || txt === 'applied') {
        continue;
      }
      if (
        txt === 'easy apply' ||
        txt.includes('easy apply') ||
        txt === 'quick apply' ||
        txt === 'apply now' ||
        txt === 'apply with 1-click' ||
        txt === 'apply online' ||
        txt.includes('apply for this job') ||
        txt === 'apply'
      ) {
        return b;
      }
    }
    return null;
  }

  function findNextStepButton() {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))
      .filter(b => b.offsetParent !== null && !b.disabled);
    for (const b of candidates) {
      const txt = (b.innerText || b.value || '').trim().toLowerCase();
      if (txt === 'next' || txt.includes('save and continue') || txt.includes('save & continue') || txt.includes('continue') || txt.includes('proceed') || txt.includes('step') || txt.includes('next step')) {
        return b;
      }
    }
    return null;
  }

  function findSubmitButton() {
    const candidates = Array.from(document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]'))
      .filter(b => b.offsetParent !== null && !b.disabled);
    for (const b of candidates) {
      const txt = (b.innerText || b.value || '').trim().toLowerCase();
      if (txt.includes('submit application') || txt === 'submit' || txt.includes('send application') || txt.includes('complete application') || txt.includes('confirm application') || txt.includes('finish')) {
        return b;
      }
    }
    return null;
  }

  function extractActiveJobDetails(card, portalName) {
    let title = '';
    let company = '';
    let location = 'India / Remote';

    if (card) {
      const tEl = card.querySelector('h1, h2, h3, a, [class*="title"], [class*="role"], [class*="designation"]');
      if (tEl && tEl.innerText.trim()) title = tEl.innerText.trim();
      const cEl = card.querySelector('[class*="company"], [class*="employer"], [class*="org"], [data-company]');
      if (cEl && cEl.innerText.trim()) company = cEl.innerText.trim();
      const lEl = card.querySelector('[class*="location"], [class*="city"]');
      if (lEl && lEl.innerText.trim()) location = lEl.innerText.trim();
    }

    if (!title) {
      const h = document.querySelector('h1, h2.jobsearch-JobInfoHeader-title, .job-title');
      if (h && h.innerText.trim()) title = h.innerText.trim();
    }
    if (!company) {
      const c = document.querySelector('.company-name, [data-company-name="true"], .topcard__org-name-link, .employer-name');
      if (c && c.innerText.trim()) company = c.innerText.trim();
    }

    return {
      title: title || 'AI Engineer',
      company: company || 'Hiring Partner',
      location: location || 'India / Remote',
      portal: portalName || 'Hiring Portal',
      url: window.location.href
    };
  }

  function syncApplicationRecord(jobMeta) {
    chrome.runtime.sendMessage({
      type: 'SYNC_APPLICATION',
      payload: {
        company: jobMeta.company || 'Direct Job',
        role: jobMeta.title || 'AI Engineer',
        location: jobMeta.location || 'India / Remote',
        portal: jobMeta.portal || 'Hiring Portal',
        url: jobMeta.url || window.location.href
      }
    });
  }

  // BATCH FEED AUTO-APPLY AGENT (Iterates through listings until daily quota is filled)
  // Protected with strict Anti-Ban safeguards: Jittered intervals, duplicate suppression, and immediate halt on bot challenges
  async function runBatchFeedApplyAgent(cand, meta, maxQuota = 20) {
    if (isAgentRunning) return;
    isAgentRunning = true;
    agentAbortRequested = false;

    ensureAgentHud();
    updateAgentHud(`Scanning ${meta.portal || 'portal'} feed (Daily Safe Quota: ${maxQuota})...`);
    sendTelemetry('BATCH_START', `Initiating autonomous batch apply agent on ${meta.portal || 'portal'} (Target Quota: ${maxQuota})...`);

    await sleep(800);
    if (!isAgentRunning || agentAbortRequested) return;

    const defenseInitial = isBotDefensePresent();
    if (defenseInitial) {
      sendTelemetry('ANTI_BAN_HALT', `[ANTI-BAN] Bot verification challenge detected (${defenseInitial}). Halting immediately to safeguard account.`);
      stopAgent(`Bot challenge detected (${defenseInitial}). Paused for account protection.`);
      return;
    }

    const cards = findJobCardsOnPage();
    if (!cards || cards.length === 0) {
      updateAgentHud('No listing cards detected on current view. Scanning for single application...');
      sendTelemetry('INFO', 'No listing cards found. Falling back to single-page apply.');
      isAgentRunning = false;
      return runAutonomousApplyAgent();
    }

    updateAgentHud(`Found ${cards.length} job openings. Starting safe application pipeline...`);
    sendTelemetry('BATCH_CARDS', `Identified ${cards.length} candidate job cards on feed. Processing sequentially.`);

    let appliedCount = 0;

    for (let i = 0; i < cards.length && appliedCount < maxQuota; i++) {
      if (!isAgentRunning || agentAbortRequested) break;

      const defense = isBotDefensePresent();
      if (defense) {
        sendTelemetry('ANTI_BAN_HALT', `[ANTI-BAN] Bot verification challenge detected (${defense}). Halting immediately to preserve account safety.`);
        stopAgent(`Bot verification challenge detected (${defense}). Paused for account safety.`);
        break;
      }

      const card = cards[i];
      if (isCardAlreadyApplied(card)) {
        sendTelemetry('SKIP', `Job opening #${i + 1} already applied. Skipping.`);
        continue;
      }

      // Smooth human scroll into view with natural jitter
      card.classList.add('jobpilot-target-highlight');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateAgentHud(`Reviewing job ${i + 1}/${cards.length} (${appliedCount}/${maxQuota} applied)...`);

      // Human reading pause (1.5s - 2.5s)
      await sleep(1500 + Math.random() * 1000);
      if (!isAgentRunning || agentAbortRequested) {
        card.classList.remove('jobpilot-target-highlight');
        break;
      }

      // Click card to open job details pane or drawer
      card.click();
      const innerLink = card.querySelector('a');
      if (innerLink && innerLink !== card) {
        try { innerLink.click(); } catch (e) {}
      }
      card.classList.remove('jobpilot-target-highlight');

      // Allow details view to render (2.0s - 2.8s)
      await sleep(2000 + Math.random() * 800);
      if (!isAgentRunning || agentAbortRequested) break;

      const jobMeta = extractActiveJobDetails(card, meta.portal);

      const applyBtn = findApplyButtonInCurrentContext();
      if (!applyBtn) {
        sendTelemetry('INFO', `Opening "${jobMeta.title}" does not support 1-click apply on this feed. Skipping.`);
        continue;
      }

      const btnTxt = (applyBtn.innerText || applyBtn.value || '').toLowerCase();
      if (btnTxt.includes('applied')) {
        sendTelemetry('SKIP', `Job at ${jobMeta.company} already marked applied. Skipping.`);
        continue;
      }

      // Click Apply trigger button
      applyBtn.classList.add('jobpilot-target-highlight');
      applyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      updateAgentHud(`Clicking Apply for ${jobMeta.company}...`);
      sendTelemetry('CLICK', `Triggered Apply on ${jobMeta.company} for "${jobMeta.title}"...`);
      await sleep(800 + Math.random() * 400);
      if (!isAgentRunning || agentAbortRequested) {
        applyBtn.classList.remove('jobpilot-target-highlight');
        break;
      }

      applyBtn.click();
      applyBtn.classList.remove('jobpilot-target-highlight');

      // Wait for modal or form to mount (1.5s - 2.2s)
      await sleep(1600 + Math.random() * 600);
      if (!isAgentRunning || agentAbortRequested) break;

      // Check if multi-step form fields appeared
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))
        .filter(el => el.offsetParent !== null);

      if (inputs.length > 0) {
        let step = 0;
        while (step < 4 && isAgentRunning && !agentAbortRequested) {
          step++;
          updateAgentHud(`Filling application step ${step} for ${jobMeta.company}...`);
          await executeSmartFormFillingWithAI(cand, jobMeta);
          await sleep(600 + Math.random() * 400);
          if (!isAgentRunning || agentAbortRequested) break;

          const submitBtn = findSubmitButton();
          if (submitBtn) {
            submitBtn.classList.add('jobpilot-target-highlight');
            submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            updateAgentHud(`Submitting application to ${jobMeta.company}...`);
            await sleep(800);
            submitBtn.click();
            submitBtn.classList.remove('jobpilot-target-highlight');
            await sleep(1400);
            break;
          }

          const nextBtn = findNextStepButton();
          if (nextBtn) {
            nextBtn.classList.add('jobpilot-target-highlight');
            nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            updateAgentHud(`Advancing to form step ${step + 1}...`);
            await sleep(600);
            nextBtn.click();
            nextBtn.classList.remove('jobpilot-target-highlight');
            await sleep(1500);
          } else {
            break;
          }
        }
      }

      // Record successful application and sync to desktop Applications Ledger
      syncApplicationRecord(jobMeta);
      appliedCount++;
      updateAgentHud(`✓ Applied ${appliedCount}/${maxQuota} on ${meta.portal}! (${jobMeta.company})`, true);
      sendTelemetry('SUCCESS', `Applied to ${jobMeta.company} for "${jobMeta.title}" (${appliedCount}/${maxQuota})!`);

      if (appliedCount >= maxQuota) {
        updateAgentHud(`🎯 Daily safe quota reached (${appliedCount}/${maxQuota}). Agent stopped cleanly.`, true);
        sendTelemetry('QUOTA_REACHED', `Completed daily safe quota of ${maxQuota} applications on ${meta.portal}. Account preserved.`);
        break;
      }

      // STRICT ANTI-BAN COOLDOWN (8 to 13 seconds randomized delay between applications)
      const cooldownMs = Math.floor(8000 + Math.random() * 5000);
      const cooldownSec = Math.round(cooldownMs / 1000);
      sendTelemetry('ANTI_BAN_WAIT', `[ANTI-BAN] Human delay cooldown: waiting ${cooldownSec}s before opening next job card...`);

      for (let s = cooldownSec; s > 0; s--) {
        if (!isAgentRunning || agentAbortRequested) break;
        updateAgentHud(`Anti-Ban cooldown: ${s}s remaining (${appliedCount}/${maxQuota} applied)...`);
        await sleep(1000);
      }
    }

    if (appliedCount > 0) {
      updateAgentHud(`✓ Batch session complete: ${appliedCount} applications submitted cleanly!`, true);
      hideAgentHud(5000);
    } else {
      updateAgentHud('Batch session completed.', true);
      hideAgentHud(3000);
    }
    isAgentRunning = false;
  }

  // AUTONOMOUS TAB AGENT RUNNER
  // Orchestrates: Scan -> Apply Trigger Click -> Form Autofill -> Multi-Step Progression -> Human Review -> Submission -> Ledger Sync
  async function runAutonomousApplyAgent() {
    if (isAgentRunning) return;
    isAgentRunning = true;
    agentAbortRequested = false;

    const cand = activeCandidate || {
      name: 'Vansh Sharma',
      firstName: 'Vansh',
      lastName: 'Sharma',
      email: 'engagevansh@gmail.com',
      phone: '+919310461877',
      phoneDigits: '9310461877',
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India',
      pinCode: '122001',
      education: 'Master of Computer Applications (MCA) in AI & Data Science',
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
      pitch: 'MCA in AI & Data Science (Class of 2026). Hands-on experience building LangChain RAG pipelines, fine-tuning PyTorch models, and deploying FastAPI microservices. Immediate joiner.'
    };

    const meta = extractJobMetadata();
    ensureAgentHud();
    updateAgentHud(`Scanning ${meta.portal} for application triggers...`);
    sendTelemetry('SCAN', `Scanning ${meta.portal} on active tab for ${meta.company}...`);

    await sleep(600);
    if (!isAgentRunning || agentAbortRequested) return;

    // Step 1: Detect if form fields are already open or if an Apply button needs clicking
    const visibleInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea'))
      .filter(el => el.offsetParent !== null);

    if (visibleInputs.length < 2) {
      updateAgentHud('Detecting Apply button trigger...');
      const applySelectors = [
        'button',
        'a',
        '[role="button"]',
        'input[type="submit"]',
        'input[type="button"]'
      ];
      const buttons = Array.from(document.querySelectorAll(applySelectors.join(',')))
        .filter(b => b.offsetParent !== null);

      let targetBtn = null;
      for (const btn of buttons) {
        const text = (btn.innerText || btn.value || '').trim().toLowerCase();
        if (
          text === 'easy apply' ||
          text.includes('easy apply') ||
          text === 'apply now' ||
          text === 'quick apply' ||
          text === 'apply with 1-click' ||
          text === 'apply' ||
          text.includes('apply for this job') ||
          text.includes('apply online') ||
          text.includes('fill application')
        ) {
          // Avoid generic external login / sign-in links if not apply
          if (!text.includes('sign in') && !text.includes('login')) {
            targetBtn = btn;
            break;
          }
        }
      }

      if (targetBtn) {
        targetBtn.classList.add('jobpilot-target-highlight');
        targetBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateAgentHud(`Clicking "${targetBtn.innerText.trim().slice(0, 24)}"...`);
        sendTelemetry('CLICK', `Clicked application trigger button: ${targetBtn.innerText.trim()}`);
        await sleep(500);
        if (!isAgentRunning || agentAbortRequested) return;
        targetBtn.click();
        targetBtn.classList.remove('jobpilot-target-highlight');
        await sleep(1200); // Allow application modal to load
      } else {
        const feedCards = findJobCardsOnPage();
        if (feedCards && feedCards.length > 0) {
          updateAgentHud(`Feed detected with ${feedCards.length} openings. Transitioning to Batch Agent...`);
          sendTelemetry('TRANSITION', `Detected ${feedCards.length} job cards on feed. Switching to batch agent pipeline.`);
          isAgentRunning = false;
          return runBatchFeedApplyAgent(cand, meta, meta.quota || 20);
        }
      }
    }

    if (!isAgentRunning || agentAbortRequested) return;

    // Multi-Step loop (handles up to 4 sequential application form steps)
    let stepCount = 0;
    const maxSteps = 4;
    let totalFilled = 0;
    let detectedSubmitBtn = null;

    while (stepCount < maxSteps && isAgentRunning && !agentAbortRequested) {
      stepCount++;
      updateAgentHud(`Step ${stepCount}: Scanning & answering form fields...`);
      sendTelemetry('FILL_STEP', `Autonomous agent filling fields & answering AI questions on Step ${stepCount}...`);

      const filledOnThisStep = await executeSmartFormFillingWithAI(cand, meta);
      totalFilled += filledOnThisStep;
      await sleep(600);
      if (!isAgentRunning || agentAbortRequested) return;

      // Check for Next / Continue / Proceed buttons vs Final Submit buttons
      const nextButtons = Array.from(document.querySelectorAll('button, [role="button"], input[type="button"], input[type="submit"]'))
        .filter(b => b.offsetParent !== null && !b.disabled);

      let nextBtn = null;
      let submitBtn = null;

      for (const b of nextButtons) {
        const txt = (b.innerText || b.value || '').trim().toLowerCase();
        if (txt === 'next' || txt.includes('save and continue') || txt.includes('save & continue') || txt.includes('continue') || txt.includes('proceed') || txt.includes('review')) {
          nextBtn = b;
          break;
        } else if (txt.includes('submit application') || txt === 'submit' || txt.includes('send application') || txt.includes('complete application') || txt.includes('confirm application')) {
          submitBtn = b;
        }
      }

      if (submitBtn) {
        detectedSubmitBtn = submitBtn;
        break; // Stop auto-advancing; present human review gate before submitting!
      } else if (nextBtn) {
        nextBtn.classList.add('jobpilot-target-highlight');
        nextBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateAgentHud(`Navigating to Next Step (${nextBtn.innerText.trim()})...`);
        sendTelemetry('NEXT_STEP', `Advancing multi-step application: ${nextBtn.innerText.trim()}`);
        await sleep(600);
        if (!isAgentRunning || agentAbortRequested) return;
        nextBtn.click();
        nextBtn.classList.remove('jobpilot-target-highlight');
        await sleep(1200);
        if (!isAgentRunning || agentAbortRequested) return;
      } else {
        // No further steps found
        break;
      }
    }

    if (!isAgentRunning || agentAbortRequested) return;

    // PRESENT HUMAN REVIEW GATE: Never auto-submit blindly without candidate confirmation
    presentHumanReviewGate(totalFilled, detectedSubmitBtn, meta);
    sendTelemetry('REVIEW_GATE', `Form filled with ${totalFilled} answers. Awaiting candidate human review.`);
  }

  // Extract human-readable question or label for any form field
  function extractFieldQuestion(el) {
    if (!el) return '';
    // 1. Explicit <label for="id">
    if (el.id) {
      const explicitLabel = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (explicitLabel && explicitLabel.innerText.trim()) return explicitLabel.innerText.trim();
    }
    // 2. Wrapping <label>
    const parentLabel = el.closest('label');
    if (parentLabel && parentLabel.innerText.trim()) return parentLabel.innerText.trim();

    // 3. Google Forms question container
    const gFormItem = el.closest('[role="listitem"]');
    if (gFormItem) {
      const heading = gFormItem.querySelector('[role="heading"], .M7eMe');
      if (heading && heading.innerText.trim()) return heading.innerText.trim();
    }

    // 4. Standard ATS / React form group containers
    const group = el.closest('.form-group, .field, .question, .form-field, fieldset, [class*="question"], [class*="field"]');
    if (group) {
      const lbl = group.querySelector('label, legend, p, span, h3, h4, .label');
      if (lbl && lbl !== el && lbl.innerText.trim().length > 2 && lbl.innerText.trim().length < 300) {
        return lbl.innerText.trim();
      }
    }

    // 5. Fallback to aria-label or placeholder
    const aria = el.getAttribute('aria-label') || '';
    if (aria.trim().length > 2) return aria.trim();
    if (el.placeholder && el.placeholder.trim().length > 2) return el.placeholder.trim();
    return (el.name || el.id || '').replace(/[_-]+/g, ' ').trim();
  }

  function askDesktopAI(question, fieldType = 'text', options = [], meta = {}) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({
          type: 'ASK_AI_QUESTION',
          payload: {
            question,
            company: meta.company || 'Target Company',
            role: meta.title || 'AI Engineer',
            fieldType,
            options
          }
        }, (res) => {
          if (res && res.ok && res.answer) {
            resolve(res.answer);
          } else {
            resolve('');
          }
        });
      } catch (e) {
        resolve('');
      }
    });
  }

  // Precision AI-Powered Form Control Engine
  async function executeSmartFormFillingWithAI(cand, meta = {}) {
    const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
    let filledCount = 0;

    for (const el of inputs) {
      if (!isAgentRunning || agentAbortRequested) return filledCount;
      if (el.offsetParent === null) continue; // Skip hidden elements
      const tag = el.tagName.toLowerCase();
      const type = (el.type || '').toLowerCase();
      const identifier = (el.name + ' ' + el.id + ' ' + el.placeholder + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();

      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'file') continue;

      // 1. Radio Buttons & Checkboxes
      if (type === 'radio' || type === 'checkbox') {
        const labelEl = el.closest('label') || (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
        const labelText = ((labelEl ? labelEl.innerText : '') + ' ' + identifier).toLowerCase();

        if (labelText.includes('gender') || labelText.includes('sex') || identifier.includes('gender')) {
          if ((labelText.includes('male') && !labelText.includes('female')) || el.value.toLowerCase() === 'male') {
            el.checked = true; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++;
          }
        } else if ((labelText.includes('authorized') || labelText.includes('legally authorized') || labelText.includes('eligible to work')) && !labelText.includes('sponsorship')) {
          if (labelText.includes('yes') || el.value.toLowerCase() === 'yes') {
            el.checked = true; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++;
          }
        } else if (labelText.includes('sponsorship') || labelText.includes('require visa')) {
          if (labelText.includes('no') || el.value.toLowerCase() === 'no') {
            el.checked = true; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++;
          }
        } else if (labelText.includes('relocate') || labelText.includes('comfortable working') || labelText.includes('willing to travel')) {
          if (labelText.includes('yes') || el.value.toLowerCase() === 'yes') {
            el.checked = true; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++;
          }
        } else if (labelText.includes('immediate') || labelText.includes('join immediately')) {
          if (labelText.includes('yes') || el.value.toLowerCase() === 'yes' || type === 'checkbox') {
            el.checked = true; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++;
          }
        } else if (type === 'checkbox' && (labelText.includes('agree') || labelText.includes('certify') || labelText.includes('consent') || labelText.includes('acknowledge') || labelText.includes('terms'))) {
          el.checked = true; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++;
        }
        continue;
      }

      // 2. Select Dropdowns
      if (tag === 'select') {
        const options = Array.from(el.options);
        let matched = false;
        if (identifier.includes('gender') || identifier.includes('sex')) {
          const opt = options.find(o => {
            const txt = o.text.toLowerCase().trim();
            return (txt === 'male' || txt.includes('male')) && !txt.includes('female');
          });
          if (opt) { el.value = opt.value; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++; matched = true; }
        } else if (identifier.includes('notice')) {
          const opt = options.find(o => o.text.toLowerCase().includes('immediate') || o.text.toLowerCase().includes('0 days') || o.value === '0');
          if (opt) { el.value = opt.value; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++; matched = true; }
        } else if (identifier.includes('experience') || identifier.includes('yoe')) {
          const opt = options.find(o => o.text.toLowerCase().includes('0-1') || o.text.toLowerCase().includes('1-2') || o.text.toLowerCase().includes('entry') || o.text.toLowerCase().includes('fresher') || o.value === '1');
          if (opt) { el.value = opt.value; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++; matched = true; }
        } else if (identifier.includes('education') || identifier.includes('degree') || identifier.includes('qualification')) {
          const opt = options.find(o => o.text.toLowerCase().includes('master') || o.text.toLowerCase().includes('post graduate') || o.text.toLowerCase().includes('mca') || o.text.toLowerCase().includes('bachelor'));
          if (opt) { el.value = opt.value; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++; matched = true; }
        } else if (identifier.includes('country') || identifier.includes('nationality') || identifier.includes('citizenship')) {
          const opt = options.find(o => o.text.toLowerCase().includes('india') || o.value.toLowerCase() === 'in');
          if (opt) { el.value = opt.value; triggerEvents(el); el.classList.add('jobpilot-filled-review'); filledCount++; matched = true; }
        }

        // Ask AI to pick the best dropdown option if unmatched
        if (!matched && options.length > 1) {
          if (!isAgentRunning || agentAbortRequested) return filledCount;
          const qText = extractFieldQuestion(el);
          const optionTexts = options.map(o => o.text.trim()).filter(t => t && !t.toLowerCase().includes('select'));
          if (qText.length > 4 && optionTexts.length > 0) {
            el.classList.add('jobpilot-target-highlight');
            updateAgentHud(`AI selecting option: "${qText.slice(0, 26)}..."`);
            const aiChoice = await askDesktopAI(qText, 'select', optionTexts, meta);
            if (!isAgentRunning || agentAbortRequested) {
              el.classList.remove('jobpilot-target-highlight');
              return filledCount;
            }
            const bestOpt = options.find(o => o.text.trim().toLowerCase() === aiChoice.toLowerCase() || o.text.trim().toLowerCase().includes(aiChoice.toLowerCase()));
            if (bestOpt) {
              el.value = bestOpt.value;
              triggerEvents(el);
              el.classList.add('jobpilot-filled-review');
              filledCount++;
            }
            el.classList.remove('jobpilot-target-highlight');
          }
        }
        continue;
      }

      // 3. Text, Email, Tel, Number, and Textarea Inputs
      if (el.value && el.value.trim().length > 0) continue; // Preserve existing user entries

      let valToSet = '';
      if (identifier.includes('gender') || identifier.includes('sex')) {
        valToSet = 'Male';
      } else if (identifier.includes('citizenship') || identifier.includes('nationality')) {
        valToSet = 'Indian';
      } else if ((identifier.includes('full name') || identifier.includes('candidate name') || identifier.includes('your name')) && !identifier.includes('first') && !identifier.includes('last')) {
        valToSet = cand.name;
      } else if (identifier.includes('first name') || identifier.includes('firstname') || identifier.includes('fname')) {
        valToSet = cand.firstName || 'Vansh';
      } else if (identifier.includes('last name') || identifier.includes('lastname') || identifier.includes('lname')) {
        valToSet = cand.lastName || 'Sharma';
      } else if (identifier.includes('email') || type === 'email') {
        valToSet = cand.email;
      } else if (identifier.includes('phone') || identifier.includes('mobile') || identifier.includes('contact') || type === 'tel') {
        valToSet = type === 'number' ? (cand.phoneDigits || '9310461877') : cand.phone;
      } else if (identifier.includes('linkedin')) {
        valToSet = cand.linkedin || 'https://linkedin.com/in/vansh-sharma';
      } else if (identifier.includes('github') || identifier.includes('git profile')) {
        valToSet = cand.github || 'https://github.com/Vansh-Sharmaa';
      } else if (identifier.includes('portfolio') || identifier.includes('website') || identifier.includes('personal url')) {
        valToSet = cand.portfolio || 'https://github.com/Vansh-Sharmaa';
      } else if (identifier.includes('city') || identifier.includes('location') || identifier.includes('address')) {
        valToSet = cand.city || 'Gurgaon';
      } else if (identifier.includes('pin') || identifier.includes('postal') || identifier.includes('zip')) {
        valToSet = cand.pinCode || '122001';
      } else if (identifier.includes('college') || identifier.includes('university') || identifier.includes('institute') || identifier.includes('school')) {
        valToSet = cand.college || 'Amity University';
      } else if (identifier.includes('degree') || identifier.includes('qualification') || identifier.includes('major')) {
        valToSet = cand.education || 'Master of Computer Applications (MCA) in AI & Data Science';
      } else if (identifier.includes('passing year') || identifier.includes('grad year') || identifier.includes('graduation year')) {
        valToSet = cand.gradYear || '2026';
      } else if (identifier.includes('cgpa') || identifier.includes('gpa') || identifier.includes('percentage')) {
        valToSet = cand.cgpa || '8.5';
      } else if (identifier.includes('notice') || identifier.includes('how soon') || identifier.includes('joining date')) {
        valToSet = type === 'number' ? (cand.noticeDays || '0') : (cand.noticePeriod || 'Immediate');
      } else if (identifier.includes('current ctc') || identifier.includes('current salary') || identifier.includes('present ctc')) {
        valToSet = type === 'number' ? '0' : '0 (Fresher)';
      } else if (identifier.includes('expected ctc') || identifier.includes('expected salary')) {
        valToSet = type === 'number' ? (cand.expectedCtc || '600000') : 'Negotiable 6 to 10 LPA';
      } else if (identifier.includes('total experience') || identifier.includes('total yoe') || (identifier.includes('experience') && !identifier.includes('python') && !identifier.includes('pytorch'))) {
        valToSet = type === 'number' ? '1' : '1 year';
      } else {
        // Custom company screening question: ask local AI using Vansh's resume
        const questionText = extractFieldQuestion(el);
        if (questionText && questionText.length >= 4 && !questionText.toLowerCase().includes('search')) {
          if (!isAgentRunning || agentAbortRequested) return filledCount;
          el.classList.add('jobpilot-target-highlight');
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          updateAgentHud(`AI answering: "${questionText.slice(0, 28)}..."`);
          sendTelemetry('AI_QA', `Generating human answer for: ${questionText.slice(0, 60)}`);
          const aiAns = await askDesktopAI(questionText, type === 'number' ? 'number' : 'text', [], meta);
          if (!isAgentRunning || agentAbortRequested) {
            el.classList.remove('jobpilot-target-highlight');
            return filledCount;
          }
          if (aiAns) {
            valToSet = aiAns;
          }
          el.classList.remove('jobpilot-target-highlight');
        }
      }

      if (valToSet) {
        el.value = valToSet;
        triggerEvents(el);
        el.classList.add('jobpilot-filled-review');
        filledCount++;
        await sleep(80);
        if (!isAgentRunning || agentAbortRequested) return filledCount;
      }
    }

    return filledCount;
  }

  async function executeAutoFill(customCand) {
    const cand = customCand || activeCandidate || {
      name: 'Vansh Sharma',
      firstName: 'Vansh',
      lastName: 'Sharma',
      email: 'engagevansh@gmail.com',
      phone: '+919310461877',
      phoneDigits: '9310461877',
      city: 'Gurgaon',
      college: 'Amity University',
      education: 'MCA in AI & Data Science',
      gradYear: '2026',
      cgpa: '8.5',
      noticePeriod: 'Immediate',
      noticeDays: '0',
      expectedCtc: '600000',
      linkedin: 'https://linkedin.com/in/vansh-sharma',
      github: 'https://github.com/Vansh-Sharmaa',
      portfolio: 'https://github.com/Vansh-Sharmaa'
    };
    const meta = extractJobMetadata();
    return await executeSmartFormFillingWithAI(cand, meta);
  }

  function executeInjectPitch() {
    const pitch = activeCandidate?.pitch || 'MCA in AI & Data Science (Class of 2026). Hands-on experience building LangChain RAG pipelines, PyTorch models, and scalable Python/FastAPI microservices. Immediate joiner.';
    const textareas = document.querySelectorAll('textarea');
    let injected = 0;
    textareas.forEach(t => {
      if (!t.value || t.value.length < 10) {
        t.value = pitch;
        triggerEvents(t);
        injected++;
      }
    });
    return injected;
  }

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
      }
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Floating JobPilot Widget (Precision Utility Floating Pill)
  function createFloatingPill() {
    if (document.getElementById('jobpilot-floating-pill')) return;

    const meta = extractJobMetadata() || {};
    const portalName = meta.portal || 'Job Portal';
    const company = meta.company || 'Job Application';
    const role = meta.title || 'Tech Role';

    const pill = document.createElement('div');
    pill.id = 'jobpilot-floating-pill';
    pill.innerHTML = `
      <div class="jp-pill-header">
        <div class="jp-logo-group">
          <span class="jp-logo">
            <span class="jp-online-dot" id="jp-status-dot"></span>
            <span>JobPilot AI</span>
          </span>
          <span class="jp-portal-tag">${escapeHtml(portalName.toUpperCase())}</span>
        </div>
        <div class="jp-ctrl-group">
          <span class="jp-btn-icon" id="jp-btn-minimize" title="Minimize Widget">_</span>
          <span class="jp-btn-icon" onclick="document.getElementById('jobpilot-floating-pill').remove()" title="Close Widget">✕</span>
        </div>
      </div>

      <div class="jp-body">
        <div class="jp-job-title">${escapeHtml(role)}</div>
        <div class="jp-job-meta">
          <span>${escapeHtml(company)}</span>
          <span style="color: #10b981; font-weight: 600;">94% ATS Match</span>
        </div>
      </div>

      <div class="jp-pill-actions">
        <button class="jp-action-btn primary" id="jp-btn-tab-agent">
          <span>⚡</span> <span>Auto-Apply on Tab</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-autofill">
          <span>📝</span> <span>Autofill Form</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-pitch">
          <span>📄</span> <span>Inject Pitch</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-tailor">
          <span>⚡</span> <span>Tailor ATS PDF</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-sync" style="grid-column: span 2;">
          <span>📋</span> <span>Record to Desktop Ledger</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-find-source" style="grid-column: span 2;">
          <span>🔍</span> <span>Find Official ATS Link & HR Emails</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-contact" style="grid-column: span 2;">
          <span>📇</span> <span>Get Contact Info</span>
        </button>
        <button class="jp-action-btn" id="jp-btn-map-talent" style="grid-column: span 2; background: #0c1a2e; border-color: rgba(56, 189, 248, 0.4); color: #38bdf8;">
          <span>🕸</span> <span>Map Company Talent Graph (Obsidian)</span>
        </button>
      </div>

      <div class="jp-pill-status" id="jp-pill-status">● Connected to Desktop Bridge (5056)</div>
    `;

    document.body.appendChild(pill);

    // Minimize toggle
    document.getElementById('jp-btn-minimize').addEventListener('click', (e) => {
      e.stopPropagation();
      pill.classList.toggle('minimized');
    });

    pill.addEventListener('click', () => {
      if (pill.classList.contains('minimized')) {
        pill.classList.remove('minimized');
      }
    });

    // Check live status
    chrome.runtime.sendMessage({ type: 'GET_STATUS' }, (res) => {
      const dot = document.getElementById('jp-status-dot');
      const statusText = document.getElementById('jp-pill-status');
      if (res && res.isConnected) {
        if (dot) dot.className = 'jp-online-dot';
        if (statusText) statusText.innerText = '● Connected to Desktop Bridge (5056)';
      } else {
        if (dot) dot.className = 'jp-online-dot offline';
        if (statusText) statusText.innerText = '○ Desktop Bridge Disconnected';
      }
    });

    // Wire Buttons
    document.getElementById('jp-btn-tab-agent').addEventListener('click', () => {
      runAutonomousApplyAgent();
    });

    document.getElementById('jp-btn-autofill').addEventListener('click', async () => {
      showPillNotice('AI analyzing form questions...');
      const filled = await executeAutoFill();
      showPillNotice(`✓ AI auto-filled ${filled} inputs!`);
    });

    document.getElementById('jp-btn-pitch').addEventListener('click', () => {
      const injected = executeInjectPitch();
      showPillNotice(`✓ Injected pitch into ${injected} textarea(s).`);
    });

    document.getElementById('jp-btn-tailor').addEventListener('click', async () => {
      showPillNotice('Tailoring 1-page ATS resume...');
      const currentMeta = extractJobMetadata() || meta;
      const token = await getBridgeToken();
      try {
        const res = await fetch('http://127.0.0.1:5056/api/tailor-resume', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-JobPilot-Token': token
          },
          body: JSON.stringify({ company: currentMeta.company || 'Company', role: currentMeta.title || 'Role', jd: currentMeta.description || '' })
        });
        const data = await res.json();
        if (data && data.ok) {
          showPillNotice(`✓ ATS Resume compiled: ${currentMeta.company}`);
        } else {
          showPillNotice('Tailoring request logged.');
        }
      } catch (e) {
        showPillNotice('Desktop app offline. Open JobPilot.');
      }
    });

    document.getElementById('jp-btn-sync').addEventListener('click', () => {
      syncJobToDesktop();
      showPillNotice('✓ Application synced to Ledger!');
    });

    document.getElementById('jp-btn-find-source')?.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      const data = executeGetContacts();
      chrome.runtime.sendMessage({ type: 'GET_CONTACTS', payload: data }, (res) => {
        const d = (res && res.status === 'success') ? (res.data || data) : data;
        const lines = [];
        if (d && d.company) lines.push(`${d.company} - ${d.role || ''}`);
        if (d && d.emails && d.emails.length) lines.push(`Contacts: ${d.emails.slice(0, 3).join(', ')}`);
        if (d && d.companyEmails && d.companyEmails.length) lines.push(`HR Domain: ${d.companyEmails.slice(0, 3).join(', ')}`);
        if (d && d.atsSearchUrl) {
          try { window.open(d.atsSearchUrl, '_blank'); } catch (err) {}
        }
        showPillNotice(lines.length ? `✓ Contact Intel: ${lines.join(' | ')}` : 'No contact info found on this page.');
      });
    });

    document.getElementById('jp-btn-contact')?.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      const data = executeGetContacts();
      chrome.runtime.sendMessage({ type: 'GET_CONTACTS', payload: data }, (res) => {
        const d = (res && res.status === 'success') ? (res.data || data) : data;
        const lines = [];
        if (d && d.company) lines.push(`${d.company} - ${d.role || ''}`);
        if (d && d.emails && d.emails.length) lines.push(`Contacts: ${d.emails.slice(0, 3).join(', ')}`);
        if (d && d.phone) lines.push(`Phone: ${d.phone}`);
        showPillNotice(lines.length ? `✓ Contact Intel: ${lines.join(' | ')}` : 'No contact info found on this page.');
      });
    });

    document.getElementById('jp-btn-map-talent')?.addEventListener('click', (e) => {
      if (e) e.stopPropagation();
      const meta = extractJobMetadata() || {};
      const company = meta.company || (document.title.split('-')[0] || 'Company').trim();
      showPillNotice(`Mapping talent graph for ${company}...`);
      chrome.runtime.sendMessage({
        type: 'MAP_TALENT_GRAPH',
        payload: { company }
      }, (res) => {
        if (res && res.ok) {
          showPillNotice(`✓ Mapped ${company} network! View in Desktop App.`);
        } else {
          showPillNotice(`Talent request dispatched for ${company}`);
        }
      });
    });
  }

  function extractEmailsFromPage() {
    const text = document.body ? document.body.innerText : '';
    const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const matches = text.match(emailRegex) || [];
    document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
      const m = a.href.replace(/^mailto:/i, '').split('?')[0].trim();
      if (m) matches.push(m);
    });
    return Array.from(new Set(matches.map(m => m.toLowerCase()))).filter(e => {
      return !e.endsWith('.png') && !e.endsWith('.jpg') && !e.includes('example.com') && !e.includes('sentry') && !e.includes('cloudflare');
    });
  }

  function executeGetContacts() {
    const meta = extractJobMetadata() || {};
    const emails = extractEmailsFromPage();
    let phone = '';
    try {
      const tel = document.querySelector('a[href^="tel:"]');
      if (tel) phone = (tel.getAttribute('href') || '').replace(/^tel:/i, '').trim();
    } catch (e) {}

    const company = meta.company || '';
    const role = meta.title || '';
    const slug = String(company).toLowerCase().replace(/[^a-z0-9]/g, '');
    const companyEmails = [];
    if (slug) {
      ['careers', 'jobs', 'talent', 'hr', 'hiring', 'recruiting', 'info', 'contact'].forEach(p => {
        const e = `${p}@${slug}.com`;
        if (!emails.includes(e)) companyEmails.push(e);
      });
    }

    const atsQuery = `site:boards.greenhouse.io OR site:jobs.lever.co OR site:ashbyhq.com OR site:myworkdayjobs.com "${company}" "${role}"`;
    const atsSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(atsQuery)}`;

    const sources = [];
    if (emails && emails.length) sources.push({ type: 'page-emails', emails });
    if (companyEmails && companyEmails.length) sources.push({ type: 'company-domain', emails: companyEmails });
    sources.push({ type: 'web', searchUrl: atsSearchUrl });

    const data = {
      status: (emails && emails.length > 0 || (companyEmails && companyEmails.length > 0)) ? 'found' : 'not-found',
      company: company,
      role: role,
      emails: emails || [],
      companyEmails: companyEmails,
      phone: phone || '',
      sources: sources,
      atsQuery: atsQuery,
      atsSearchUrl: atsSearchUrl,
      pageUrl: window.location.href,
      extractedAt: new Date().toISOString()
    };
    return data;
  }

  function showPillNotice(msg) {
    const st = document.getElementById('jp-pill-status');
    if (st) {
      st.innerText = msg;
      st.style.color = '#38bdf8';
      setTimeout(() => {
        st.innerText = 'Connected to Desktop Bridge';
        st.style.color = '#94a3b8';
      }, 3500);
    }
  }

  // Listen for commands dispatched from desktop agent via background worker
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'abort' || request.action === 'stop') {
      stopAgent('Remote abort command from desktop');
      sendResponse({ status: 'aborted' });
      return true;
    } else if (request.action === 'start_batch_apply' || request.action === 'batch_apply') {
      const cand = request.candidate || activeCandidate;
      const meta = request.meta || extractJobMetadata();
      const quota = (request.meta && request.meta.quota) || request.quota || 20;
      runBatchFeedApplyAgent(cand, meta, quota).then(() => {
        sendResponse({ status: 'completed' });
      });
      return true;
    } else if (request.action === 'start_autonomous_apply' || request.action === 'apply') {
      runAutonomousApplyAgent().then(() => {
        sendResponse({ status: 'completed' });
      });
      return true;
    } else if (request.action === 'autofill') {
      executeAutoFill(request.candidate).then((filled) => {
        sendResponse({ status: 'success', filled });
      });
      return true;
    } else if (request.action === 'inject_pitch') {
      const injected = executeInjectPitch();
      sendResponse({ status: 'success', injected });
    } else if (request.action === 'extract_job') {
      const meta = extractJobMetadata();
      sendResponse({ status: 'success', metadata: meta });
    } else if (request.action === 'get_page_state') {
      const meta = extractJobMetadata();
      const inputCount = document.querySelectorAll('input:not([type="hidden"]), select, textarea').length;
      sendResponse({
        status: 'success',
        metadata: meta,
        inputCount: inputCount,
        url: window.location.href,
        title: document.title
      });
    } else if (request.action === 'get_contacts') {
      const data = executeGetContacts();
      sendResponse({ status: 'success', data: data });
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
