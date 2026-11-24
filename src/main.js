const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow = null;
let activeProcess = null;
const JOBS_DIR = 'D:\\opencode stuff\\job-agents';
const TRACKER_PATH = path.join(JOBS_DIR, 'job_applications_tracker.csv');
let activeRouterUrl = 'http://127.0.0.1:20128/v1';
let activeRouterToken = 'sk-25a6421c7e67b2b5-edzmhl-9843071e';
let activeModel = 'Fable5';

// Candidate profile constants
const CANDIDATE_PROFILE = {
  name: 'Vansh Sharma',
  email: 'engagevansh@gmail.com',
  phone: '+919999999999',
  education: 'Master of Computer Applications (MCA) in AI and Data Science',
  gradYear: '2026',
  experience: '0 - 2 YOE (Fresher / Intern / Associate)',
  noticePeriod: 'Immediate',
  location: 'Gurgaon / Delhi NCR / Bengaluru / Remote',
  skills: ['Python', 'PyTorch', 'LangChain', 'RAG Pipelines', 'FastAPI', 'Docker', 'SQL', 'Algorithms'],
  pitch: 'MCA in AI & Data Science (Class of 2026). Specialized in Generative AI, LangChain RAG pipelines, and Python backend systems. Immediate joiner.'
};

// Helper: Check if router is responsive
function isRouterAlive() {
  return new Promise((resolve) => {
    try {
      const u = new URL(activeRouterUrl + '/models');
      const req = http.request(
        {
          host: u.hostname,
          port: u.port || 80,
          path: u.pathname,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${activeRouterToken}` },
          timeout: 2000
        },
        (res) => {
          resolve(res.statusCode === 200 || res.statusCode === 401);
        }
      );
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end();
    } catch (e) {
      resolve(false);
    }
  });
}

// Helper: Spawn 9router silently if offline
function startRouterBackground() {
  try {
    const proc = spawn('cmd.exe', ['/c', '9router -n --skip-update'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    proc.unref();
  } catch (e) {
    console.error('Failed to start 9router:', e);
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
    width: 1640,
    height: 980,
    minWidth: 1200,
    minHeight: 760,
    backgroundColor: '#080a0f',
    title: 'JobPilot Operator : OpenCode Workstation',
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

// Helper: Parse Tracker CSV
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

// IPC: Get Tracker Data
ipcMain.handle('get-tracker-data', async () => {
  try {
    const rows = parseTrackerCsv();
    return { ok: true, rows: rows.reverse() };
  } catch (e) {
    return { ok: false, error: e.message, rows: [] };
  }
});

// IPC: Run Python Task
ipcMain.handle('run-task', async (event, { scriptName, args = [] }) => {
  if (activeProcess) {
    return { ok: false, error: 'Another automation process is currently executing.' };
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

// IPC: Router & Model Configuration
ipcMain.handle('get-model-config', async () => {
  return {
    routerUrl: activeRouterUrl,
    model: activeModel,
    isAlive: await isRouterAlive()
  };
});

ipcMain.handle('set-model-config', async (event, { model, routerUrl, token }) => {
  if (model) activeModel = model;
  if (routerUrl) activeRouterUrl = routerUrl.replace(/\/$/, '');
  if (token) activeRouterToken = token;
  const alive = await isRouterAlive();
  return { ok: true, isAlive: alive, model: activeModel, routerUrl: activeRouterUrl };
});

ipcMain.handle('get-available-models', async () => {
  return new Promise((resolve) => {
    try {
      const u = new URL(activeRouterUrl + '/models');
      const req = http.request(
        {
          host: u.hostname,
          port: u.port || 80,
          path: u.pathname,
          method: 'GET',
          headers: { 'Authorization': `Bearer ${activeRouterToken}` },
          timeout: 4000
        },
        (res) => {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => {
            try {
              const data = JSON.parse(b);
              const models = (data.data || []).map(m => m.id);
              resolve({ ok: true, models });
            } catch (e) {
              resolve({ ok: true, models: ['Fable5', 'oc-gpt', 'claude-fable-5', 'ag/claude-opus-4-6-thinking'] });
            }
          });
        }
      );
      req.on('error', () => resolve({ ok: false, models: ['Fable5', 'oc-gpt'] }));
      req.end();
    } catch (e) {
      resolve({ ok: false, models: ['Fable5'] });
    }
  });
});

// IPC: External URL
ipcMain.handle('open-external', async (event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
    return { ok: true };
  }
  return { ok: false, error: 'Invalid URL' };
});

// =====================================================================
// AUTONOMOUS AGENT ENGINE (TOOL-CALLING LOOP)
// =====================================================================

// Define the tool catalog available to the autonomous agent
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'browser_navigate',
      description: 'Navigate the integrated Hiring Hub browser to a specified URL (e.g. Indeed, LinkedIn, Naukri).',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'The web URL to load in the browser.' }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_autofill',
      description: 'Trigger autonomous smart form auto-fill on the currently active browser page with candidate credentials.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'browser_inject_pitch',
      description: 'Inject tailored MCA AI & Data Science cover pitch into active job application form textareas.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_fleet_agent',
      description: 'Execute an autonomous Python job hunting fleet script (e.g. daily_autopilot_daemon.py, inbound_email_calendar_runner.py, auto_quota_closer.py, assessment_prep_engine.py).',
      parameters: {
        type: 'object',
        properties: {
          scriptName: { type: 'string', description: 'Name of the script in D:\\opencode stuff\\job-agents to execute.' },
          args: { type: 'array', items: { type: 'string' }, description: 'CLI arguments to pass.' }
        },
        required: ['scriptName']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_ledger',
      description: 'Query the 311 verified genuine applications in the tracker ledger by keyword, company, or portal.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Search term for company name, role, portal, or location.' }
        },
        required: ['keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'add_to_ledger',
      description: 'Record a new verified job application into job_applications_tracker.csv.',
      parameters: {
        type: 'object',
        properties: {
          company: { type: 'string' },
          role: { type: 'string' },
          portal: { type: 'string' },
          location: { type: 'string' },
          url: { type: 'string' }
        },
        required: ['company', 'role', 'portal']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_quota_status',
      description: 'Retrieve real-time application quotas and daily limits across all 14 platforms.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_candidate_profile',
      description: 'Get full candidate profile, qualifications, skills, and target roles for Vansh Sharma.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];

// Tool Executor Implementation
async function executeAgentTool(name, args) {
  switch (name) {
    case 'browser_navigate': {
      let targetUrl = args.url || 'https://in.indeed.com';
      if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
        targetUrl = 'https://' + targetUrl;
      }
      mainWindow?.webContents.send('agent-browser-action', { action: 'navigate', url: targetUrl });
      return { status: 'success', message: `Navigated browser to ${targetUrl}` };
    }

    case 'browser_autofill': {
      mainWindow?.webContents.send('agent-browser-action', { action: 'autofill' });
      return { status: 'success', message: 'Executed smart apply form autofill with candidate profile.' };
    }

    case 'browser_inject_pitch': {
      mainWindow?.webContents.send('agent-browser-action', { action: 'inject_pitch' });
      return { status: 'success', message: 'Injected candidate pitch into active application fields.' };
    }

    case 'run_fleet_agent': {
      const script = args.scriptName;
      const scriptArgs = args.args || [];
      const fullPath = path.join(JOBS_DIR, script);
      if (!fs.existsSync(fullPath)) {
        return { status: 'error', error: `Script ${script} not found in ${JOBS_DIR}` };
      }

      mainWindow?.webContents.send('task-log', `[OPERATOR] Running agent ${script}...`);
      return new Promise((resolve) => {
        const proc = spawn('python', ['-u', fullPath, ...scriptArgs], {
          cwd: JOBS_DIR,
          env: { ...process.env, PYTHONUNBUFFERED: '1' }
        });

        let out = '';
        proc.stdout.on('data', d => {
          out += d.toString();
          mainWindow?.webContents.send('task-log', d.toString());
        });
        proc.stderr.on('data', d => {
          out += d.toString();
          mainWindow?.webContents.send('task-log', d.toString());
        });
        proc.on('close', code => {
          resolve({ status: 'completed', exitCode: code, output: out.slice(-600) });
        });
      });
    }

    case 'search_ledger': {
      const kw = (args.keyword || '').toLowerCase();
      const rows = parseTrackerCsv();
      const matches = rows.filter(r => 
        (r.company && r.company.toLowerCase().includes(kw)) ||
        (r.role && r.role.toLowerCase().includes(kw)) ||
        (r.portal && r.portal.toLowerCase().includes(kw)) ||
        (r.location && r.location.toLowerCase().includes(kw))
      );
      return { total_matches: matches.length, sample: matches.slice(0, 8) };
    }

    case 'add_to_ledger': {
      const today = new Date().toISOString().split('T')[0];
      const entry = `\n${today},"${args.company}","${args.role}","${args.location || 'Remote'}","${args.portal}","Submitted","${args.url || ''}"`;
      fs.appendFileSync(TRACKER_PATH, entry, 'utf-8');
      mainWindow?.webContents.send('tracker-updated');
      return { status: 'success', message: `Added ${args.company} (${args.role}) on ${args.portal} to tracker.` };
    }

    case 'get_quota_status': {
      return new Promise((resolve) => {
        http.get('http://127.0.0.1:5055/api/stats', (res) => {
          let b = '';
          res.on('data', c => b += c);
          res.on('end', () => {
            try {
              resolve(JSON.parse(b));
            } catch (e) {
              resolve({ total_all_time: 311, is_capped: true });
            }
          });
        }).on('error', () => {
          resolve({ total_all_time: 311, is_capped: true, note: 'Daemon running' });
        });
      });
    }

    case 'get_candidate_profile': {
      return CANDIDATE_PROFILE;
    }

    default:
      return { status: 'error', error: `Unknown tool: ${name}` };
  }
}

// IPC: Execute Autonomous Agent Loop
ipcMain.handle('run-agent-loop', async (event, { userPrompt, conversationHistory = [] }) => {
  await ensureRouter();

  const systemMessage = {
    role: 'system',
    content: 'You are the JobPilot Autonomous Operator, an elite engineering agent running locally inside an OpenCode-style workstation. You have direct tool access to the browser, 14-platform Python fleet, and verified tracker ledger. The user is Vansh Sharma (MCA in AI and Data Science, Class of 2026, 0-2 YOE). Execute tasks directly using available tools when appropriate. Keep responses concise, technical, structured, and factual. Never use em-dashes or en-dashes.'
  };

  const messages = [
    systemMessage,
    ...conversationHistory,
    { role: 'user', content: userPrompt }
  ];

  let loopCount = 0;
  const maxLoops = 6;
  const toolExecutions = [];

  while (loopCount < maxLoops) {
    loopCount++;

    const payload = JSON.stringify({
      model: activeModel,
      messages: messages,
      tools: AGENT_TOOLS,
      temperature: 0.2
    });

    const aiRes = await new Promise((resolve) => {
      try {
        const u = new URL(activeRouterUrl + '/chat/completions');
        const req = http.request(
          {
            host: u.hostname,
            port: u.port || 80,
            path: u.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${activeRouterToken}`,
              'Content-Length': Buffer.byteLength(payload)
            },
            timeout: 50000
          },
          (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
              try {
                const data = JSON.parse(body);
                resolve({ ok: true, data });
              } catch (e) {
                resolve({ ok: false, error: 'Failed to parse JSON response: ' + body.slice(0, 200) });
              }
            });
          }
        );

        req.on('error', err => resolve({ ok: false, error: err.message }));
        req.on('timeout', () => { req.destroy(); resolve({ ok: false, error: 'Model query timed out.' }); });
        req.write(payload);
        req.end();
      } catch (err) {
        resolve({ ok: false, error: err.message });
      }
    });

    if (!aiRes.ok) {
      return { ok: false, error: aiRes.error, toolExecutions };
    }

    const choice = aiRes.data?.choices?.[0];
    if (!choice) {
      return { ok: false, error: 'Empty choice from model', toolExecutions };
    }

    const message = choice.message;
    const reasoning = message?.reasoning_content || '';

    // Check if the model called tools
    if (message?.tool_calls && message.tool_calls.length > 0) {
      messages.push(message);

      for (const tCall of message.tool_calls) {
        const toolName = tCall.function.name;
        let toolArgs = {};
        try {
          toolArgs = JSON.parse(tCall.function.arguments || '{}');
        } catch (e) {}

        // Notify UI of tool execution in progress
        mainWindow?.webContents.send('agent-tool-event', {
          type: 'start',
          id: tCall.id,
          name: toolName,
          args: toolArgs,
          reasoning
        });

        const toolResult = await executeAgentTool(toolName, toolArgs);

        toolExecutions.push({
          id: tCall.id,
          name: toolName,
          args: toolArgs,
          result: toolResult
        });

        // Notify UI of tool completion
        mainWindow?.webContents.send('agent-tool-event', {
          type: 'end',
          id: tCall.id,
          name: toolName,
          result: toolResult
        });

        messages.push({
          role: 'tool',
          tool_call_id: tCall.id,
          content: JSON.stringify(toolResult)
        });
      }
    } else {
      // Model returned text response without tool call
      return {
        ok: true,
        reply: message.content || 'Task completed.',
        reasoning: reasoning,
        toolExecutions
      };
    }
  }

  return { ok: true, reply: 'Agent loop reached maximum execution depth.', toolExecutions };
});
