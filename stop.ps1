$conns = Get-NetTCPConnection -LocalPort 7009 -State Listen -ErrorAction SilentlyContinue
if ($conns) {
    foreach ($c in $conns) {
        $p = $c.OwningProcess
        if ($p -and $p -ne 0) {
            Write-Host "Terminating process PID $p holding port 7009..." -ForegroundColor Yellow
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Port 7009 has been freed successfully." -ForegroundColor Green
} else {
    Write-Host "Port 7009 is already free (no listening process found)." -ForegroundColor Cyan
}

# Also kill any remaining minibot or minibot-backend processes
Get-Process -Name "minibot*", "minibot-backend*" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "Stopping $($_.ProcessName) (PID $($_.Id))..." -ForegroundColor Yellow
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
