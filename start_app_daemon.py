import os, subprocess

env = os.environ.copy()
if 'ELECTRON_RUN_AS_NODE' in env:
    del env['ELECTRON_RUN_AS_NODE']

cwd = r'D:\opencode stuff\job-pilot-desktop'
exe = os.path.join(cwd, 'node_modules', 'electron', 'dist', 'electron.exe')

print('Starting JobPilot Desktop...')
p = subprocess.Popen([exe, '.'], cwd=cwd, env=env)
p.wait()
