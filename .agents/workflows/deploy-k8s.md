---
description: deploy the full stack to Kubernetes (build images + apply manifests)
---

## Deploy to Kubernetes (one command)

Run the deployment script from the project root:

```powershell
.\deploy-k8s.ps1
```

### Flags

| Flag | What it does |
|------|-------------|
| (none) | Builds all Docker images **and** deploys to K8s |
| `-SkipBuild` | Skips image building; applies K8s manifests only |
| `-TearDown` | Deletes **all** K8s resources (namespaces, deployments, services) |

### Examples

```powershell
# Full deploy (default)
.\deploy-k8s.ps1

# Only re-apply manifests (after YAML edits, no rebuild needed)
.\deploy-k8s.ps1 -SkipBuild

# Wipe everything out of Kubernetes
.\deploy-k8s.ps1 -TearDown
```

### What the script does (in order)

1. **Pre-flight** – checks `docker` + `kubectl` are installed, verifies the cluster is reachable
2. **Build app images** – `execution-engine-api:latest` and `execution-engine-frontend:latest`
3. **Build runner images** – python, cpp, java, go, php, c (gracefully skips missing ones)
4. **Apply Namespaces** – `code-judge` and `code-judge-sandbox`
5. **Apply RBAC** – ServiceAccount + Role + RoleBinding so the API can create sandbox pods
6. **Deploy infrastructure** – Postgres (StatefulSet) and Redis; waits for Postgres to become Ready
7. **Deploy API** – applies `backend.yaml`, forces rolling restart, waits for rollout
8. **Deploy Frontend** – applies `frontend.yaml`, forces rolling restart, waits for rollout
9. **Print summary** – shows live `kubectl get svc -n code-judge` with URLs
