const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let activeProcesses = new Map();
let currentWorkspace = 'D:\\opencode stuff\\job-agents';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0d1117',
    title: 'OpenCode Workspace - JobPilot Edition',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    activeProcesses.forEach((proc) => {
      try { proc.kill(); } catch (e) {}
    });
    activeProcesses.clear();
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Workspace Filesystem
ipcMain.handle('get-workspace-root', async () => {
  return currentWorkspace;
});

ipcMain.handle('list-files', async (event, dirPath = currentWorkspace) => {
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const items = [];
    for (const ent of entries) {
      if (ent.name.startsWith('.') && ent.name !== '.gitignore') continue;
      if (['node_modules', '__pycache__', 'dist', 'build', '.git'].includes(ent.name)) continue;
      
      const full = path.join(dirPath, ent.name);
      items.push({
        name: ent.name,
        path: full,
        isDirectory: ent.isDirectory(),
        size: ent.isDirectory() ? 0 : fs.statSync(full).size
      });
    }
    // Sort directories first, then files
    items.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
      return a.isDirectory ? -1 : 1;
    });
    return { ok: true, items };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { ok: true, content, path: filePath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// IPC: Terminal / Process Runner
ipcMain.handle('run-terminal-command', async (event, { cmd, id = 'term-1' }) => {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : 'bash';
    const shellArgs = isWindows ? ['-NoProfile', '-Command', cmd] : ['-c', cmd];

    const proc = spawn(shell, shellArgs, {
      cwd: currentWorkspace,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    activeProcesses.set(id, proc);

    proc.stdout.on('data', (d) => {
      mainWindow?.webContents.send('terminal-data', { id, text: d.toString() });
    });

    proc.stderr.on('data', (d) => {
      mainWindow?.webContents.send('terminal-data', { id, text: d.toString(), isError: true });
    });

    proc.on('close', (code) => {
      activeProcesses.delete(id);
      mainWindow?.webContents.send('terminal-exit', { id, code });
      resolve({ ok: code === 0, code });
    });

    proc.on('error', (err) => {
      activeProcesses.delete(id);
      mainWindow?.webContents.send('terminal-data', { id, text: `Process error: ${err.message}\n`, isError: true });
      resolve({ ok: false, error: err.message });
    });
  });
});

// IPC: AI Engine (Router @ localhost:20128)
ipcMain.handle('call-ai-chat', async (event, { messages, model = 'Fable5', temperature = 0.3 }) => {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: model,
      messages: messages,
      temperature: temperature
    });

    const req = http.request(
      'http://127.0.0.1:20128/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-router',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 30000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const reply = data?.choices?.[0]?.message?.content || body;
            resolve({ ok: true, reply, raw: data });
          } catch (e) {
            resolve({ ok: false, error: 'Failed to parse AI JSON', raw: body });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });

    req.write(payload);
    req.end();
  });
});
