# Clean previous processes
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*Flask_Project*"} | Stop-Process -Force

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Starting Land Registry Blockchain System" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

# Start Bootstrap Node
Write-Host "[1/4] Starting Bootstrap Node (Port 5000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python bootstrap_node\app.py" -WorkingDirectory $PSScriptRoot\.. -WindowStyle Normal
Start-Sleep -Seconds 3

# Start Centralized Transaction Service
Write-Host "[2/4] Starting Centralized Transaction Service (Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python central_service\app.py" -WorkingDirectory $PSScriptRoot\.. -WindowStyle Normal
Start-Sleep -Seconds 3

# Start SRO Node 1
Write-Host "[3/4] Starting SRO Node 1 (Port 5001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:NODE_ID='SRO_NODE_1'; `$env:NODE_PORT='5001'; python sro_node_template\app.py" -WorkingDirectory $PSScriptRoot\.. -WindowStyle Normal
Start-Sleep -Seconds 3

# Start SRO Node 2
Write-Host "[4/4] Starting SRO Node 2 (Port 5002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:NODE_ID='SRO_NODE_2'; `$env:NODE_PORT='5002'; python sro_node_template\app.py" -WorkingDirectory $PSScriptRoot\.. -WindowStyle Normal
Start-Sleep -Seconds 3

Write-Host "`n================================" -ForegroundColor Green
Write-Host "All Services Started!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green

Write-Host "`nService URLs:" -ForegroundColor Cyan
Write-Host "  Bootstrap Node:       http://localhost:5000/status" -ForegroundColor White
Write-Host "  SRO Node 1:           http://localhost:5001/status" -ForegroundColor White
Write-Host "  SRO Node 2:           http://localhost:5002/status" -ForegroundColor White
Write-Host "  Central Service:      http://localhost:8000/status" -ForegroundColor White

Write-Host "`nPress Ctrl+C to stop monitoring..." -ForegroundColor Yellow
Write-Host "`nTo stop all services, run: .\scripts\stop_demo.ps1`n" -ForegroundColor Yellow

# Keep script running
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Write-Host "`nShutting down..." -ForegroundColor Red
}
