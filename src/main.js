const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let activeProcess = null;
const JOBS_DIR = 'D:\\opencode stuff\\job-agents';
const TRACKER_PATH = path.join(JOBS_DIR, 'job_applications_tracker.csv');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1580,
    height: 960,
    minWidth: 1180,
    minHeight: 740,
    backgroundColor: '#070913',
    title: 'JobPilot AI : Autonomous Career Cockpit',
    frame: true,
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Helper: Parse CSV
function parseTrackerCsv() {
  if (!fs.existsSync(TRACKER_PATH)) return [];
  const content = fs.readFileSync(TRACKER_PATH, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim().length > 0);
  if (lines.length <= 1) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',');
    if (parts.length >= 6) {
      rows.push({
        date: parts[0]?.trim(),
        company: parts[1]?.trim().replace(/^"|"$/g, ''),
        role: parts[2]?.trim().replace(/^"|"$/g, ''),
        location: parts[3]?.trim().replace(/^"|"$/g, ''),
        portal: parts[4]?.trim(),
        status: parts[5]?.trim(),
        url: parts[6]?.trim() || ''
      });
    }
  }
  return rows;
}

// IPC: Read Tracker CSV
ipcMain.handle('get-tracker-data', async () => {
  try {
    const rows = parseTrackerCsv();
    return { ok: true, rows: rows.reverse() }; // Newest first
  } catch (e) {
    return { ok: false, error: e.message, rows: [] };
  }
});

// IPC: Execute Python Tasks with Live Streaming
ipcMain.handle('run-task', async (event, { scriptName, args = [] }) => {
  if (activeProcess) {
    return { ok: false, error: 'Another automation is currently running.' };
  }

  return new Promise((resolve) => {
    const fullScript = path.join(JOBS_DIR, scriptName);
    const proc = spawn('python', ['-u', fullScript, ...args], {
      cwd: JOBS_DIR,
      env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    activeProcess = proc;
    mainWindow?.webContents.send('task-status', { running: true, task: scriptName });

    proc.stdout.on('data', (data) => {
      mainWindow?.webContents.send('task-log', data.toString());
    });

    proc.stderr.on('data', (data) => {
      mainWindow?.webContents.send('task-log', data.toString());
    });

    proc.on('close', (code) => {
      activeProcess = null;
      mainWindow?.webContents.send('task-status', { running: false, task: scriptName, code });
      resolve({ ok: code === 0, code });
    });

    proc.on('error', (err) => {
      activeProcess = null;
      mainWindow?.webContents.send('task-status', { running: false, error: err.message });
      resolve({ ok: false, error: err.message });
    });
  });
});

// IPC: Call Local AI Router (Fable5 @ localhost:20128)
ipcMain.handle('call-ai', async (event, { prompt, systemPrompt }) => {
  return new Promise((resolve) => {
    const defaultSys = 'You are JobPilot AI, an elite career strategist and recruitment copilot for Vansh Sharma (MCA in AI and Data Science, Class of 2026, 0 to 2 YOE). Specialize in ATS resume tailoring, tech screening responses, cold outreach to recruiters, and interview preparation. Deliver punchy, structured, professional answers. Never use em-dashes or en-dashes.';
    const payload = JSON.stringify({
      model: 'Fable5',
      messages: [
        { role: 'system', content: systemPrompt || defaultSys },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3
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
        timeout: 45000
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
            resolve({ ok: true, reply: body });
          }
        });
      }
    );

    req.on('error', (err) => {
      resolve({ ok: false, error: 'Router connection failed: ' + err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ ok: false, error: 'AI Router query timed out after 45s.' });
    });

    req.write(payload);
    req.end();
  });
});

// IPC: Open URL in external default browser
ipcMain.handle('open-external', async (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
    return { ok: true };
  }
  return { ok: false, error: 'Invalid URL' };
});
