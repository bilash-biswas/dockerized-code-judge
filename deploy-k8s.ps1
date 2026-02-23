# ============================================================
#  deploy-k8s.ps1  -  One-Command Kubernetes Deployment
#  Usage:  .\deploy-k8s.ps1             (build + deploy all)
#          .\deploy-k8s.ps1 -SkipBuild  (apply manifests only)
#          .\deploy-k8s.ps1 -TearDown   (delete all K8s resources)
# ============================================================

param(
    [switch]$SkipBuild,
    [switch]$TearDown
)

$ErrorActionPreference = "Continue"  # docker writes progress to stderr; Stop would throw false errors

# -- Helpers --------------------------------------------------
function Write-Step { param($msg) Write-Host "`n>> $msg" -ForegroundColor Cyan }
function Write-OK   { param($msg) Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn { param($msg) Write-Host "   [!]  $msg" -ForegroundColor Yellow }
function Write-Fail { param($msg) Write-Host "   [X]  $msg" -ForegroundColor Red }

function Ensure-Command {
    param($Name)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Fail "$Name is not installed or not in PATH."
        exit 1
    }
}

# -- TearDown -------------------------------------------------
if ($TearDown) {
    Write-Step "Tearing down all K8s resources..."
    kubectl delete -f k8s/ --ignore-not-found
    Write-OK "All resources deleted."
    exit 0
}

# -- Pre-flight checks ----------------------------------------
Write-Step "Pre-flight checks..."
Ensure-Command "docker"
Ensure-Command "kubectl"

$ctx = kubectl config current-context 2>&1
Write-OK "K8s context: $ctx"

kubectl get nodes --no-headers 2>&1 | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Cannot reach K8s cluster. Is Docker Desktop / minikube running?"
    exit 1
}
Write-OK "Cluster is reachable"

# -- Step 1: Build Docker images ------------------------------
if (-not $SkipBuild) {
    Write-Step "Building application images..."

    $builds = @(
        @{ Tag = "execution-engine-api:latest";      File = "Dockerfile.backend";           Context = "." },
        @{ Tag = "execution-engine-frontend:latest"; File = "frontend/Dockerfile.frontend"; Context = "./frontend" }
    )

    foreach ($b in $builds) {
        Write-Host "  Building $($b.Tag)..." -ForegroundColor DarkCyan
        & cmd /c "docker build -t `"$($b.Tag)`" -f `"$($b.File)`" `"$($b.Context)`" > nul 2>&1"
        if ($LASTEXITCODE -ne 0) {
            Write-Fail "Failed to build $($b.Tag)"
            exit 1
        }
        Write-OK "$($b.Tag) built"
    }

    Write-Step "Building language runner images..."
    $runners = @("python", "cpp", "java", "go", "php", "c")
    $builtRunners  = @()
    $failedRunners = @()

    foreach ($lang in $runners) {
        $dir = "docker/$lang-runner"
        if (Test-Path $dir) {
            Write-Host "  Building $lang-runner:latest..." -ForegroundColor DarkCyan
            $runnerTag = "$lang-runner:latest"
            & cmd /c "docker build -t `"$runnerTag`" `"$dir`" > nul 2>&1"
            if ($LASTEXITCODE -eq 0) {
                $builtRunners += $lang
            } else {
                $failedRunners += $lang
                Write-Warn "$lang-runner build failed (skipping)"
            }
        } else {
            Write-Warn "Directory '$dir' not found, skipping $lang runner"
        }
    }

    if ($builtRunners.Count  -gt 0) { Write-OK "Runners built: $($builtRunners  -join ', ')" }
    if ($failedRunners.Count -gt 0) { Write-Warn "Runners skipped: $($failedRunners -join ', ')" }
}

# -- Step 2: Namespaces ---------------------------------------
Write-Step "Applying namespaces..."
kubectl apply -f k8s/namespaces.yaml
Write-OK "Namespaces ready"

# -- Step 3: RBAC ---------------------------------------------
Write-Step "Applying RBAC (ServiceAccount + Roles)..."
kubectl apply -f k8s/rbac.yaml
Write-OK "RBAC applied"

# -- Step 4: Infrastructure -----------------------------------
Write-Step "Deploying infrastructure (Postgres + Redis)..."
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
Write-OK "Infrastructure manifests applied"

Write-Host "  Waiting for Postgres to become ready..." -ForegroundColor DarkCyan
kubectl rollout status statefulset/postgres -n code-judge --timeout=120s
Write-OK "Postgres ready"

# -- Step 5: API ----------------------------------------------
Write-Step "Deploying API..."
kubectl apply -f k8s/backend.yaml
kubectl rollout restart deployment/api -n code-judge 2>&1 | Out-Null
kubectl rollout status  deployment/api -n code-judge --timeout=120s
Write-OK "API deployment ready"

# -- Step 6: Frontend -----------------------------------------
Write-Step "Deploying Frontend..."
kubectl apply -f k8s/frontend.yaml
kubectl rollout restart deployment/frontend -n code-judge 2>&1 | Out-Null
kubectl rollout status  deployment/frontend -n code-judge --timeout=120s
Write-OK "Frontend deployment ready"

# -- Step 7: Summary ------------------------------------------
Write-Step "Deployment complete! Service endpoints:"
kubectl get svc -n code-judge

Write-Host ""
Write-Host "======================================================" -ForegroundColor Magenta
Write-Host "  Code Judge is live on Kubernetes!" -ForegroundColor Magenta
Write-Host "  Frontend  --> http://localhost:80" -ForegroundColor Magenta
Write-Host "  API       --> http://localhost:3001" -ForegroundColor Magenta
Write-Host "======================================================" -ForegroundColor Magenta
Write-Host ""
