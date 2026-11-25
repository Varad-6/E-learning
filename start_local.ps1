# Kaizen LMS - Local Services Launcher
$ErrorActionPreference = "Continue"

Write-Host "`n===============================================" -ForegroundColor Cyan
Write-Host "     Starting Kaizen LMS Local Environment     " -ForegroundColor Cyan
Write-Host "===============================================`n" -ForegroundColor Cyan

$projectRoot = $PSScriptRoot
$pgHome = "C:\Users\arati\Downloads\insight-flow-standalone\insight-flow-standalone\pgsql"
$venvPython = Join-Path $projectRoot "venv\Scripts\python.exe"

function Test-Port($p) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $iar = $client.BeginConnect("127.0.0.1", $p, $null, $null)
        $success = $iar.AsyncWaitHandle.WaitOne(600, $false)
        if ($success -and $client.Connected) {
            $client.EndConnect($iar)
            $client.Close()
            return $true
        }
        $client.Close()
        return $false
    } catch {
        return $false
    }
}

# 1. PostgreSQL
if (-not (Test-Port 5432)) {
    Write-Host "[1/3] Starting PostgreSQL (port 5432)..." -ForegroundColor Yellow
    if (Test-Path "$pgHome\data\postmaster.pid") {
        Remove-Item "$pgHome\data\postmaster.pid" -Force -ErrorAction SilentlyContinue
    }
    Start-Process -FilePath "$pgHome\bin\postgres.exe" -ArgumentList "-D `"$pgHome\data`" -p 5432" -WindowStyle Minimized
    for ($i = 0; $i -lt 15 -and -not (Test-Port 5432); $i++) { Start-Sleep 1 }
}

if (Test-Port 5432) {
    Write-Host "[OK] PostgreSQL is running on port 5432" -ForegroundColor Green
} else {
    Write-Host "[ERROR] PostgreSQL failed to start on port 5432" -ForegroundColor Red
}

# 2. FastAPI Backend
if (-not (Test-Port 8000)) {
    Write-Host "[2/3] Starting FastAPI Backend (port 8000)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$projectRoot\start_backend.bat`"" -WorkingDirectory $projectRoot
    for ($i = 0; $i -lt 15 -and -not (Test-Port 8000); $i++) { Start-Sleep 1 }
}

if (Test-Port 8000) {
    Write-Host "[OK] Backend API is running on http://127.0.0.1:8000" -ForegroundColor Green
    Write-Host "     API Docs: http://127.0.0.1:8000/docs" -ForegroundColor DarkGray
} else {
    Write-Host "[ERROR] Backend API failed to start on port 8000" -ForegroundColor Red
}

# 3. Frontend Dev Server
if (-not (Test-Port 5180)) {
    Write-Host "[3/3] Starting Frontend Dev Server (port 5180)..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/k `"$projectRoot\start_frontend.bat`"" -WorkingDirectory $projectRoot
    for ($i = 0; $i -lt 15 -and -not (Test-Port 5180); $i++) { Start-Sleep 1 }
}

if (Test-Port 5180) {
    Write-Host "[OK] Frontend is running on http://localhost:5180" -ForegroundColor Green
    Start-Process "http://localhost:5180"
} else {
    Write-Host "[ERROR] Frontend failed to start on port 5180" -ForegroundColor Red
}

Write-Host "`nAll services initialized!" -ForegroundColor Cyan
Write-Host "Default Passwords: 'Password123!' (e.g. systemadmin@abhiyantatech.com, Arati.D@abhiyantatech.com)`n" -ForegroundColor Yellow
Write-Host "Services are running. Keep this window open, or press Ctrl+C to exit launcher.`n" -ForegroundColor DarkGray
while ($true) { Start-Sleep -Seconds 60 }
