$root = $PSScriptRoot

Start-Job { 
    Set-Location $using:root
    bun run dev 2>&1
}

Start-Job { 
    Set-Location $using:root
    docker compose up --build 2>&1
}

Start-Job { 
    Set-Location "$using:root\app\backend"
    uvicorn main:app --reload 2>&1
}

try {
    while ($true) {
        Get-Job | Receive-Job
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "Stopping jobs..."
    Get-Job | Stop-Job
    Get-Job | Remove-Job

    Get-Process -Name "bun" -ErrorAction SilentlyContinue | Stop-Process -Force
    Get-Process -Name "uvicorn" -ErrorAction SilentlyContinue | Stop-Process -Force

    docker compose down
}