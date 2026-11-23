const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('openCodeApi', {
  getWorkspaceRoot: () => ipcRenderer.invoke('get-workspace-root'),
  listFiles: (dirPath) => ipcRenderer.invoke('list-files', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  runTerminalCommand: (cmd, id) => ipcRenderer.invoke('run-terminal-command', { cmd, id }),
  onTerminalData: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal-data', handler);
    return () => ipcRenderer.removeListener('terminal-data', handler);
  },
  onTerminalExit: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('terminal-exit', handler);
    return () => ipcRenderer.removeListener('terminal-exit', handler);
  },
  callAiChat: (messages, model, temperature) => ipcRenderer.invoke('call-ai-chat', { messages, model, temperature })
});
