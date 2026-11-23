const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jobPilotApi', {
  runTask: (scriptName, args) => ipcRenderer.invoke('run-task', { scriptName, args }),
  stopTask: () => ipcRenderer.invoke('stop-task'),
  callAi: (prompt, systemPrompt) => ipcRenderer.invoke('call-ai', { prompt, systemPrompt }),
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
