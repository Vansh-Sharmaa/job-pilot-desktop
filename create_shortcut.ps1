$sh = New-Object -ComObject WScript.Shell
$desktop = [System.Environment]::GetFolderPath('Desktop')
$shortcut = $sh.CreateShortcut("$desktop\JobPilot AI.lnk")
$shortcut.TargetPath = "D:\opencode stuff\job-pilot-desktop\launch.bat"
$shortcut.WorkingDirectory = "D:\opencode stuff\job-pilot-desktop"
$shortcut.Description = "JobPilot AI - Autonomous Workspace"
$shortcut.Save()
Write-Output "Shortcut created on Desktop: $desktop\JobPilot AI.lnk"
