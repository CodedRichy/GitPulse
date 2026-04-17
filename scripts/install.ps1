# GitPulse irm installer - minimal version
$repo="codedrichy/gitpulse";$dir="$env:LOCALAPPDATA\gitpulse";$bin="$dir\gitpulse.exe"
New-Item -ItemType Directory -Force -Path $dir|Out-Null
$rel=(irm "https://api.github.com/repos/$repo/releases/latest").tag_name
$url="https://github.com/$repo/releases/download/$rel/gitpulse-windows-x64.exe"
Write-Host "Downloading GitPulse $rel..." -ForegroundColor Cyan
irm $url -OutFile $bin
$env:Path=[Environment]::GetEnvironmentVariable("Path","User")
if($env:Path-notlike"*$dir*"){[Environment]::SetEnvironmentVariable("Path","$env:Path;$dir","User")}
Write-Host "Installed to $bin" -ForegroundColor Green
Write-Host "Restart PowerShell and run: gitpulse" -ForegroundColor Yellow
