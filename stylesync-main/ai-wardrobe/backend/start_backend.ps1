$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
$venvPython = Join-Path $repoRoot ".venv\Scripts\python.exe"

Set-Location $scriptDir

if (Test-Path $venvPython) {
    & $venvPython -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
} else {
    Write-Host ".venv Python not found. Using system Python." -ForegroundColor Yellow
    python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
}
