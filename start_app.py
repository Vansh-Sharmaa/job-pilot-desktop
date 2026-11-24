import os
import subprocess

app_dir = r"D:\opencode stuff\job-pilot-desktop"
electron_exe = os.path.join(app_dir, r"node_modules\electron\dist\electron.exe")

env = dict(os.environ)
env.pop("ELECTRON_RUN_AS_NODE", None)

print("Starting JobPilot Electron Workstation...")
proc = subprocess.Popen([electron_exe, "."], cwd=app_dir, env=env)
proc.wait()
