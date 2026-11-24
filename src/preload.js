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
  getExtensionStatus: () => ipcRenderer.invoke('get-extension-status'),
  
  // Orca Fleet Subagent Engine
  runTask: (scriptName, args) => ipcRenderer.invoke('run-task', { scriptName, args }),
  stopTask: () => ipcRenderer.invoke('stop-task'),
  launchFleetWorker: (scriptName, args) => ipcRenderer.invoke('launch-fleet-worker', { scriptName, args }),
  killFleetWorker: (scriptName) => ipcRenderer.invoke('kill-fleet-worker', { scriptName }),
  getFleetProcesses: () => ipcRenderer.invoke('get-fleet-processes'),
  
  // Ledger and Exports
  getTrackerData: () => ipcRenderer.invoke('get-tracker-data'),
  exportLedger: (format) => ipcRenderer.invoke('export-ledger', { format }),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  
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
  }
});
