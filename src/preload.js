const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jobPilotApi', {
  // Agent & Model APIs
  runAgentLoop: (userPrompt, conversationHistory) => 
    ipcRenderer.invoke('run-agent-loop', { userPrompt, conversationHistory }),
  getModelConfig: () => ipcRenderer.invoke('get-model-config'),
  setModelConfig: (cfg) => ipcRenderer.invoke('set-model-config', cfg),
  getAvailableModels: () => ipcRenderer.invoke('get-available-models'),
  
  // Python fleet task runners
  runTask: (scriptName, args) => ipcRenderer.invoke('run-task', { scriptName, args }),
  getTrackerData: () => ipcRenderer.invoke('get-tracker-data'),
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
  }
});
