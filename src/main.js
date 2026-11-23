const { app, BrowserWindow, ipcMain, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let activeProcess = null;
const JOBS_DIR = 'D:\\opencode stuff\\job-agents';

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1500,
    height: 950,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#0a0d14',
    title: 'JobPilot AI - Autonomous Workspace',
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
    if (activeProcess) {
      try { activeProcess.kill(); } catch (e) {}
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Execute Python Tasks with Live Streaming
ipcMain.handle('run-task', async (event, { scriptName, args = [] }) => {
  if (activeProcess) {
    return { ok: false, error: 'A background task is already executing.' };
  }

  return new Promise((resolve) => {
    const fullScript = path.join(JOBS_DIR, scriptName);
    const proc = spawn('python', ['-u', fullScript, ...args], {
      cwd: JOBS_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    activeProcess = proc;
    mainWindow.webContents.send('task-status', { running: true, task: scriptName });

    proc.stdout.on('data', (data) => {
      const text = data.toString();
      mainWindow.webContents.send('task-log', text);
    });

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      mainWindow.webContents.send('task-log', text);
    });

    proc.on('close', (code) => {
      activeProcess = null;
      mainWindow.webContents.send('task-status', { running: false, task: scriptName, code });
      resolve({ ok: code === 0, code });
    });

    proc.on('error', (err) => {
      activeProcess = null;
      mainWindow.webContents.send('task-status', { running: false, error: err.message });
      resolve({ ok: false, error: err.message });
    });
  });
});

ipcMain.handle('stop-task', async () => {
  if (activeProcess) {
    try {
      activeProcess.kill('SIGTERM');
      activeProcess = null;
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  return { ok: true };
});

// IPC: Call Local AI Router (Fable5 @ localhost:20128)
ipcMain.handle('call-ai', async (event, { prompt, systemPrompt = 'You are an elite career agent.' }) => {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      model: 'Fable5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2
    });

    const req = http.request(
      'http://127.0.0.1:20128/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-local-router',
          'Content-Length': Buffer.byteLength(payload)
        },
        timeout: 25000
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          try {
            const data = JSON.parse(body);
            const reply = data?.choices?.[0]?.message?.content || body;
            resolve({ ok: true, reply });
          } catch (e) {
            resolve({ ok: false, error: 'Failed to parse AI response', raw: body });
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
