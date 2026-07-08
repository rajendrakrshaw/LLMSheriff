$ErrorActionPreference = "Stop"

$FrontendRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $FrontendRoot

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env.local"
  Copy-Item ".env.example" ".env"
  Write-Host "Created frontend/.env and frontend/.env.local from .env.example"
} elseif (-not (Test-Path ".env.local")) {
  Copy-Item ".env" ".env.local"
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installing npm dependencies..."
  npm install
}

Write-Host "Starting frontend on http://localhost:3000 ..."
npm run dev
