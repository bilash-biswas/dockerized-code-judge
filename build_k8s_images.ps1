# Build API and Frontend
docker build -t execution-engine-api:latest -f Dockerfile.backend .
docker build -t execution-engine-frontend:latest -f frontend/Dockerfile.frontend ./frontend

# Build Runners
docker build -t python-runner:latest ./docker/python-runner
docker build -t cpp-runner:latest ./docker/cpp-runner
docker build -t java-runner:latest ./docker/java-runner
docker build -t kotlin-runner:latest ./docker/kotlin-runner
docker build -t go-runner:latest ./docker/go-runner
docker build -t php-runner:latest ./docker/php-runner
docker build -t dart-runner:latest ./docker/dart-runner
docker build -t c-runner:latest ./docker/c-runner
docker build -t sql-runner:latest ./docker/sql-runner

Write-Host "✨ All images built and tagged for Kubernetes!" -ForegroundColor Cyan
