const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let activeProcess = null;
const JOBS_DIR = 'D:\\opencode stuff\\job-agents';
const TRACKER_PATH = path.join(JOBS_DIR, 'job_applications_tracker.csv');
const ROUTER_TOKEN = 'sk-25a6421c7e67b2b5-edzmhl-9843071e';
const ROUTER_PORT = 20128;

// Helper: Check if 9router is listening
function isRouterAlive() {
  return new Promise((resolve) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: ROUTER_PORT,
        path: '/v1/models',
        method: 'GET',
        headers: { 'Authorization': `Bearer ${ROUTER_TOKEN}` },
        timeout: 1500
      },
      (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 401);
      }
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Helper: Spawn 9router in the background if offline
function startRouterBackground() {
  try {
    const proc = spawn('cmd.exe', ['/c', '9router -n --skip-update'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    proc.unref();
  } catch (e) {
    console.error('Failed to spawn 9router:', e);
  }
}

async function ensureRouter() {
  const alive = await isRouterAlive();
  if (!alive) {
    startRouterBackground();
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 600));
      if (await isRouterAlive()) return true;
    }
  }
  return true;
}

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

app.whenReady().then(async () => {
  createWindow();
  await ensureRouter();
});

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
    return { ok: true, rows: rows.reverse() };
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

// IPC: Router Status & Self-Healing
ipcMain.handle('check-router-status', async () => {
  const alive = await isRouterAlive();
  return { ok: true, alive, port: ROUTER_PORT, model: 'Fable5' };
});

ipcMain.handle('restart-router', async () => {
  startRouterBackground();
  for (let i = 0; i < 6; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isRouterAlive()) return { ok: true };
  }
  return { ok: await isRouterAlive() };
});

// IPC: Call Local AI Router (Fable5 @ localhost:20128)
ipcMain.handle('call-ai', async (event, { prompt, systemPrompt }) => {
  await ensureRouter();

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
      `http://127.0.0.1:${ROUTER_PORT}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ROUTER_TOKEN}`,
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
            if (data.error) {
              resolve({ ok: false, error: data.error.message || JSON.stringify(data.error) });
              return;
            }
            const reply = data?.choices?.[0]?.message?.content || body;
            resolve({ ok: true, reply });
          } catch (e) {
            resolve({ ok: true, reply: body });
          }
        });
      }
    );

    req.on('error', async (err) => {
      // If refused, attempt immediate kickstart once
      if (err.code === 'ECONNREFUSED') {
        startRouterBackground();
        resolve({
          ok: false,
          error: '9router on port 20128 was offline. Auto-launching 9router now. Please send your question again in 3 seconds.'
        });
      } else {
        resolve({ ok: false, error: 'Router connection error: ' + err.message });
      }
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
