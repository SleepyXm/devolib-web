[CmdletBinding()]
param(
    [switch]$SkipDatabase,
    [switch]$SkipMigrations
)

$ErrorActionPreference = "Stop"
$BackendDirectory = $PSScriptRoot
$RepositoryDirectory = Split-Path (Split-Path $BackendDirectory -Parent) -Parent
$VirtualEnvironment = Join-Path $BackendDirectory ".venv"
$PythonExecutable = Join-Path $VirtualEnvironment "Scripts\python.exe"
$EnvironmentFile = Join-Path $BackendDirectory ".env"
$EnvironmentExample = Join-Path $BackendDirectory ".env.example"

function New-UrlSafeKey {
    $bytes = [byte[]]::new(32)
    [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes).Replace("+", "-").Replace("/", "_")
}

if (-not (Test-Path -LiteralPath $PythonExecutable)) {
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        & $py.Source -3.13 -m venv $VirtualEnvironment
    } else {
        $python = Get-Command python -ErrorAction Stop
        & $python.Source -m venv $VirtualEnvironment
    }
}

& $PythonExecutable -m pip install --upgrade pip
& $PythonExecutable -m pip install -r (Join-Path $BackendDirectory "requirements.txt")

if (-not (Test-Path -LiteralPath $EnvironmentFile)) {
    $environment = Get-Content -LiteralPath $EnvironmentExample -Raw
    $environment = $environment.Replace(
        "replace-with-a-long-random-value",
        (New-UrlSafeKey)
    ).Replace(
        "replace-with-a-fernet-key",
        (New-UrlSafeKey)
    )
    [IO.File]::WriteAllText($EnvironmentFile, $environment)
    Write-Host "Created app/backend/.env with fresh local secrets."
} else {
    Write-Host "Keeping the existing app/backend/.env."
}

if (-not $SkipDatabase) {
    docker compose --file (Join-Path $RepositoryDirectory "docker-compose.yml") up --detach postgres

    $healthy = $false
    foreach ($attempt in 1..30) {
        $status = docker inspect --format "{{.State.Health.Status}}" devolib-postgres 2>$null
        if ($status -eq "healthy") {
            $healthy = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $healthy) {
        throw "PostgreSQL did not become healthy within 30 seconds."
    }
}

if (-not $SkipMigrations) {
    Push-Location $BackendDirectory
    try {
        & $PythonExecutable -m alembic upgrade head
    } finally {
        Pop-Location
    }
}

Write-Host ""
Write-Host "Backend setup complete."
Write-Host "Run it with:"
Write-Host "  cd app/backend"
Write-Host "  .\.venv\Scripts\python.exe -m uvicorn main:app --reload"
