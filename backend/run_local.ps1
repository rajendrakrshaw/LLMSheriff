$ErrorActionPreference = "Stop"

$BackendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $BackendRoot

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Created backend/.env from .env.example"
}

if (-not (Test-Path ".venv")) {
  Write-Host "Creating Python virtual environment..."
  python -m venv .venv
}

Write-Host "Activating virtual environment..."
& ".\.venv\Scripts\Activate.ps1"

Write-Host "Installing dependencies..."
python -m pip install --upgrade pip
pip install -r requirements.txt

New-Item -ItemType Directory -Force -Path "data" | Out-Null

Write-Host "Starting backend on http://localhost:8000 ..."
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
