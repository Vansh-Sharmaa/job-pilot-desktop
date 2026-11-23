const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jobPilotApi', {
  runTask: (scriptName, args) => ipcRenderer.invoke('run-task', { scriptName, args }),
  getTrackerData: () => ipcRenderer.invoke('get-tracker-data'),
  callAi: (prompt, systemPrompt) => ipcRenderer.invoke('call-ai', { prompt, systemPrompt }),
  checkRouterStatus: () => ipcRenderer.invoke('check-router-status'),
  restartRouter: () => ipcRenderer.invoke('restart-router'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  onTaskLog: (callback) => {
    const handler = (event, text) => callback(text);
    ipcRenderer.on('task-log', handler);
    return () => ipcRenderer.removeListener('task-log', handler);
  },
  onTaskStatus: (callback) => {
    const handler = (event, status) => callback(status);
    ipcRenderer.on('task-status', handler);
    return () => ipcRenderer.removeListener('task-status', handler);
  }
});
