const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jobPilotApi', {
  // Agent and Model APIs
  runAgentLoop: (userPrompt, conversationHistory) => 
    ipcRenderer.invoke('run-agent-loop', { userPrompt, conversationHistory }),
  abortAgent: () => ipcRenderer.invoke('abort-agent'),
  getModelConfig: () => ipcRenderer.invoke('get-model-config'),
  setModelConfig: (cfg) => ipcRenderer.invoke('set-model-config', cfg),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  restartRouter: () => ipcRenderer.invoke('restart-router'),
  testConnection: (cfg) => ipcRenderer.invoke('test-connection', cfg),
  
  // Extension Companion APIs
  openExtensionFolder: () => ipcRenderer.invoke('open-extension-folder'),
  sendExtensionCommand: (cmd) => ipcRenderer.invoke('send-extension-command', cmd),
  triggerTabAgent: () => ipcRenderer.invoke('trigger-tab-agent'),
  launchChromeAgent: (payload) => ipcRenderer.invoke('launch-chrome-agent', payload),
  getExtensionStatus: () => ipcRenderer.invoke('get-extension-status'),
  
  // Orca Fleet Subagent Engine
  runTask: (scriptName, args) => ipcRenderer.invoke('run-task', { scriptName, args }),
  stopTask: () => ipcRenderer.invoke('stop-task'),
  launchFleetWorker: (scriptName, args) => ipcRenderer.invoke('launch-fleet-worker', { scriptName, args }),
  killFleetWorker: (scriptName) => ipcRenderer.invoke('kill-fleet-worker', { scriptName }),
  killAllFleetWorkers: () => ipcRenderer.invoke('kill-all-fleet-workers'),
  getFleetProcesses: () => ipcRenderer.invoke('get-fleet-processes'),
  
  // Ledger and Exports
  getTrackerData: () => ipcRenderer.invoke('get-tracker-data'),
  getApplicationsTracker: async () => {
    const res = await ipcRenderer.invoke('get-tracker-data');
    return (res && Array.isArray(res.rows)) ? res.rows : (Array.isArray(res) ? res : []);
  },
  addTrackerEntry: (entry) => ipcRenderer.invoke('add-tracker-entry', entry),
  checkDuplicateJob: (meta) => ipcRenderer.invoke('check-duplicate-job', meta),
  checkJobScam: (payload) => ipcRenderer.invoke('check-job-scam', typeof payload === 'object' ? payload : { text: payload }),
  exportLedger: (format) => ipcRenderer.invoke('export-ledger', { format }),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),

  // Interview Intelligence & Email Radar
  getInterviewIntelligence: () => ipcRenderer.invoke('get-interview-intelligence'),
  syncGmailInbox: (accountEmail) => ipcRenderer.invoke('sync-gmail-inbox', { accountEmail }),
  saveEmailCredentials: (creds) => ipcRenderer.invoke('save-email-credentials', creds),
  getEmailCredentials: () => ipcRenderer.invoke('get-email-credentials'),
  getEmailAccounts: () => ipcRenderer.invoke('get-email-accounts'),
  saveEmailAccount: (acc) => ipcRenderer.invoke('save-email-account', acc),
  removeEmailAccount: (accountId) => ipcRenderer.invoke('remove-email-account', { accountId }),
  toggleEmailAccount: (accountId, enabled) => ipcRenderer.invoke('toggle-email-account', { accountId, enabled }),
  parseManualEmail: (text, account) => ipcRenderer.invoke('parse-manual-email', { text, account }),

  // Job Leads & Recommendation Engine
  getJobLeads: () => ipcRenderer.invoke('get-job-leads'),
  syncJobLeads: () => ipcRenderer.invoke('sync-job-leads'),
  searchResumeJobs: () => ipcRenderer.invoke('search-resume-jobs'),
  parseJobLeadEmail: (text, account) => ipcRenderer.invoke('parse-job-lead-email', { text, account }),

  // Window Frame Controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),

  // Candidate Profile & AI Q&A
  getCandidateProfile: () => ipcRenderer.invoke('get-candidate-profile'),
  updateCandidateProfile: (profile) => ipcRenderer.invoke('update-candidate-profile', profile),
  answerScreeningQuestion: (payload) => ipcRenderer.invoke('answer-screening-question', payload),

  // Resume and Dynamic ATS Tailoring
  openResumePdf: () => ipcRenderer.invoke('open-resume-pdf'),
  getResumeContent: () => ipcRenderer.invoke('get-resume-content'),
  tailorResume: (payload) => ipcRenderer.invoke('tailor-resume', payload),
  getLatestTailoredResume: (company) => ipcRenderer.invoke('get-latest-tailored-resume', { company }),
  
  // Company Talent Graph & Obsidian Connection Map
  discoverCompanyTalent: (company, forceRefresh = false) => ipcRenderer.invoke('discover-company-talent', { company, forceRefresh }),
  getCompanyTalentGraph: (company) => ipcRenderer.invoke('get-company-talent-graph', { company }),
  listSavedCompanyGraphs: () => ipcRenderer.invoke('list-saved-company-graphs'),
  draftColdOutreachEmail: (payload) => ipcRenderer.invoke('draft-cold-outreach-email', payload),

  // Real-time Event Listeners
  onTaskLog: (callback) => {
    const handler = (event, text) => callback(text);
    ipcRenderer.on('task-log', handler);
    return () => ipcRenderer.removeListener('task-log', handler);
  },
  onTaskStatus: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on('task-status', handler);
    return () => ipcRenderer.removeListener('task-status', handler);
  },
  onAgentToolEvent: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('agent-tool-event', handler);
    return () => ipcRenderer.removeListener('agent-tool-event', handler);
  },
  onAgentBrowserAction: (callback) => {
    const handler = (event, action) => callback(action);
    ipcRenderer.on('agent-browser-action', handler);
    return () => ipcRenderer.removeListener('agent-browser-action', handler);
  },
  onTrackerUpdated: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('tracker-updated', handler);
    return () => ipcRenderer.removeListener('tracker-updated', handler);
  },
  onExtensionStatusChanged: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('extension-status-changed', handler);
    return () => ipcRenderer.removeListener('extension-status-changed', handler);
  },
  onExtensionActiveJob: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('extension-active-job', handler);
    return () => ipcRenderer.removeListener('extension-active-job', handler);
  },
  onClarificationRequest: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('agent-clarification-request', handler);
    return () => ipcRenderer.removeListener('agent-clarification-request', handler);
  },
  submitClarificationAnswer: (payload) => ipcRenderer.invoke('submit-clarification-answer', payload),
  onAgentTelemetry: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('agent-telemetry', handler);
    return () => ipcRenderer.removeListener('agent-telemetry', handler);
  },
  onPortalApplying: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('portal-applying', handler);
    return () => ipcRenderer.removeListener('portal-applying', handler);
  },
  onOpenCompanyTalentGraph: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('open-company-talent-graph', handler);
    return () => ipcRenderer.removeListener('open-company-talent-graph', handler);
  },

  // Copilot Streaming Chat APIs
  chatSend: (payload) => ipcRenderer.invoke('chat:send', payload),
  chatAbort: (turnId) => ipcRenderer.invoke('chat:abort', { turnId }),
  chatSessionsList: () => ipcRenderer.invoke('chat:sessions:list'),
  chatSessionsCreate: (title) => ipcRenderer.invoke('chat:sessions:create', { title }),
  chatSessionsLoad: (sessionId) => ipcRenderer.invoke('chat:sessions:load', { sessionId }),
  chatSessionsRename: (sessionId, title) => ipcRenderer.invoke('chat:sessions:rename', { sessionId, title }),
  chatSessionsDelete: (sessionId) => ipcRenderer.invoke('chat:sessions:delete', { sessionId }),
  chatModels: () => ipcRenderer.invoke('chat:models'),

  onChatDelta: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('chat:delta', handler);
    return () => ipcRenderer.removeListener('chat:delta', handler);
  },
  onChatReasoning: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('chat:reasoning', handler);
    return () => ipcRenderer.removeListener('chat:reasoning', handler);
  },
  onChatTool: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('chat:tool', handler);
    return () => ipcRenderer.removeListener('chat:tool', handler);
  },
  onChatDone: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('chat:done', handler);
    return () => ipcRenderer.removeListener('chat:done', handler);
  },
  onChatError: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('chat:error', handler);
    return () => ipcRenderer.removeListener('chat:error', handler);
  }
});
