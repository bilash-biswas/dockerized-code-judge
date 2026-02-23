# Kubernetes Cheat Sheet for Code Judge

All commands assume you have `kubectl` configured with Docker Desktop or a similar cluster.

## 🚀 Deployment
Deploy all manifests at once:
```powershell
kubectl apply -f k8s/
```

Re-deploy a specific component (e.g., after updating `backend.yaml`):
```powershell
kubectl apply -f k8s/backend.yaml
```

**Note**: The API is exposed on port **3001** to avoid local conflicts with port 3000.

## 🔍 Monitoring & Status
List all pods in the main namespace:
```powershell
kubectl get pods -n code-judge
```

Watch sandbox pods (launched during code execution):
```powershell
kubectl get pods -n code-judge-sandbox -w
```

List all services and their external IPs:
```powershell
kubectl get svc -n code-judge
```

## 📝 Logs & Debugging
View API logs:
```powershell
kubectl logs -l app=api -n code-judge --tail=50
```

Follow API logs in real-time:
```powershell
kubectl logs -f -l app=api -n code-judge
```

Describe a failing pod:
```powershell
kubectl describe pod <pod-name> -n code-judge
```

## 🛠 Database & Execution
Run SQL commands (Initialize Schema):
```powershell
Get-Content src/schema.sql | kubectl exec -i -n code-judge postgres-0 -- psql -U postgres -d postgres
```

Access a pod's shell:
```powershell
kubectl exec -it <pod-name> -n code-judge -- sh
```

## 🔌 Port Forwarding (Local Dev)
Access cluster API from your host machine on port 3000:
```powershell
kubectl port-forward -n code-judge <api-pod-name> 3000:3000
```

## ♻ Cleanup
Restart a deployment (e.g., after image update):
```powershell
kubectl rollout restart deployment api -n code-judge
```

Delete the entire environment:
```powershell
kubectl delete -f k8s/
```

docker build -t execution-engine-frontend:latest -f frontend/Dockerfile.frontend ./frontend