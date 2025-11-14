# Simple Kubernetes Deployment Example

This example demonstrates deploying a simple Node.js application to Kubernetes using Terraform. The application includes health checks, metrics, and follows DevSecOps best practices.

## Contents

- `app.js` - Simple Node.js HTTP server
- `Dockerfile` - Multi-stage Docker build
- `k8s/` - Kubernetes manifests (YAML)
- `main.tf` - Terraform configuration
- `variables.tf` - Terraform variables
- `outputs.tf` - Terraform outputs

## Features

### Application Features

- HTTP server with multiple endpoints
- Health check (`/health`) for liveness probes
- Readiness check (`/ready`) for readiness probes
- Info endpoint (`/info`) with system information
- Prometheus metrics (`/metrics`)
- Graceful shutdown handling
- Environment variable configuration

### Kubernetes Configuration

- **Security**: Pod security contexts, non-root user, read-only filesystem
- **High Availability**: Multiple replicas, pod anti-affinity, pod disruption budget
- **Autoscaling**: Horizontal Pod Autoscaler (HPA) based on CPU and memory
- **Monitoring**: Prometheus annotations, metrics endpoint
- **Resource Management**: CPU and memory limits/requests
- **Health Checks**: Liveness, readiness, and startup probes

## Prerequisites

1. Kubernetes cluster (AKS, EKS, GKE, or local)
2. kubectl configured
3. Docker (for building the image)
4. Terraform 1.0+
5. Container registry access

## Quick Start

### 1. Build and Push Docker Image

```bash
# Build the image
docker build -t demo-app:1.0.0 .

# Tag for your registry
docker tag demo-app:1.0.0 <your-registry>/demo-app:1.0.0

# Push to registry
docker push <your-registry>/demo-app:1.0.0

# Or use cloud-specific commands:

# Azure Container Registry
az acr login --name <acr-name>
az acr build --registry <acr-name> --image demo-app:1.0.0 .

# AWS ECR
aws ecr get-login-password --region <region> | docker login --username AWS --password-stdin <account-id>.dkr.ecr.<region>.amazonaws.com
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/demo-app:1.0.0

# Google Artifact Registry
gcloud auth configure-docker <region>-docker.pkg.dev
docker push <region>-docker.pkg.dev/<project-id>/<repo>/demo-app:1.0.0
```

### 2. Deploy with Terraform

```bash
# Initialize Terraform
terraform init

# Copy and customize variables
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your settings

# Review the plan
terraform plan

# Apply the configuration
terraform apply
```

### 3. Deploy with kubectl (Alternative)

```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

## Verification

### Check Deployment Status

```bash
# Get all resources
kubectl get all -n demo-app

# Check pods
kubectl get pods -n demo-app

# Check deployment
kubectl describe deployment demo-app -n demo-app

# Check service
kubectl get svc demo-app -n demo-app
```

### Test the Application

```bash
# Port forward to test locally
kubectl port-forward -n demo-app svc/demo-app 8080:80

# Test endpoints
curl http://localhost:8080/
curl http://localhost:8080/health
curl http://localhost:8080/ready
curl http://localhost:8080/info
curl http://localhost:8080/metrics
```

### Check Logs

```bash
# View logs
kubectl logs -n demo-app -l app=demo-app

# Follow logs
kubectl logs -n demo-app -l app=demo-app -f

# Logs from specific pod
kubectl logs -n demo-app <pod-name>
```

### Check HPA

```bash
# Get HPA status
kubectl get hpa -n demo-app

# Describe HPA
kubectl describe hpa demo-app -n demo-app

# Watch HPA (auto-updates)
kubectl get hpa -n demo-app -w
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `8080` |
| `NODE_ENV` | Node.js environment | `production` |
| `APP_ENV` | Application environment | `production` |
| `APP_VERSION` | Application version | `1.0.0` |
| `LOG_LEVEL` | Logging level | `info` |

### Terraform Variables

See `variables.tf` for all available variables. Key variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `namespace` | Kubernetes namespace | `demo-app` |
| `environment` | Environment name | `production` |
| `replicas` | Number of replicas | `3` |
| `min_replicas` | Min replicas for HPA | `3` |
| `max_replicas` | Max replicas for HPA | `10` |
| `cpu_request` | CPU request | `250m` |
| `cpu_limit` | CPU limit | `500m` |
| `memory_request` | Memory request | `256Mi` |
| `memory_limit` | Memory limit | `512Mi` |

## Testing Autoscaling

### Generate Load

```bash
# Using kubectl run
kubectl run -n demo-app load-generator --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://demo-app; done"

# Using Apache Bench
kubectl run -n demo-app ab --image=httpd --restart=Never -- ab -n 100000 -c 100 http://demo-app/

# Watch HPA scale
kubectl get hpa -n demo-app -w
```

### Clean Up Load Test

```bash
kubectl delete pod -n demo-app load-generator
kubectl delete pod -n demo-app ab
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod events
kubectl describe pod -n demo-app <pod-name>

# Check logs
kubectl logs -n demo-app <pod-name>

# Check image pull
kubectl get events -n demo-app | grep -i pull
```

### Image Pull Errors

```bash
# Check image pull secret (if using private registry)
kubectl get secret -n demo-app

# Create image pull secret if needed
kubectl create secret docker-registry regcred \
  --docker-server=<registry> \
  --docker-username=<username> \
  --docker-password=<password> \
  -n demo-app

# Add to service account
kubectl patch serviceaccount demo-app -n demo-app -p '{"imagePullSecrets": [{"name": "regcred"}]}'
```

### Health Check Failures

```bash
# Check liveness probe
kubectl describe pod -n demo-app <pod-name> | grep -A 10 "Liveness"

# Check readiness probe
kubectl describe pod -n demo-app <pod-name> | grep -A 10 "Readiness"

# Exec into pod
kubectl exec -it -n demo-app <pod-name> -- /bin/sh

# Test health endpoint from inside pod
wget -O- http://localhost:8080/health
```

## Security Notes

### Security Features

- **Non-root user**: Runs as UID 1000
- **Read-only filesystem**: Container filesystem is read-only
- **No privilege escalation**: Prevents gaining additional privileges
- **Dropped capabilities**: All Linux capabilities dropped
- **Seccomp profile**: Uses RuntimeDefault seccomp profile
- **Resource limits**: CPU and memory limits prevent resource exhaustion
- **Network policies**: (Optional) Can be added for network segmentation

### Production Recommendations

1. **Use private container registry**
2. **Scan images for vulnerabilities** (Trivy, Snyk, etc.)
3. **Enable Pod Security Standards** at namespace level
4. **Implement Network Policies** for pod-to-pod communication
5. **Use External Secrets** for sensitive data (AWS Secrets Manager, Azure Key Vault, etc.)
6. **Enable audit logging** on the cluster
7. **Implement RBAC** with least privilege
8. **Use signed container images** (Notary, Cosign)

## Cleanup

### Using Terraform

```bash
terraform destroy
```

### Using kubectl

```bash
kubectl delete -f k8s/service.yaml
kubectl delete -f k8s/deployment.yaml
```

## Cost Optimization

### Tips

1. **Right-size resources**: Adjust CPU/memory requests based on actual usage
2. **Use HPA**: Automatically scale based on demand
3. **Use spot/preemptible instances**: For non-critical workloads
4. **Set resource quotas**: Prevent runaway resource usage
5. **Monitor and optimize**: Use metrics to identify optimization opportunities

### Estimated Costs

Based on 3 replicas with 250m CPU and 256Mi memory:
- **AKS**: ~$50-70/month
- **EKS**: ~$60-80/month
- **GKE**: ~$45-65/month

Costs vary based on node type and region.

## Next Steps

- Deploy to specific cloud provider (AKS, EKS, or GKE)
- Add Ingress for external access
- Implement GitOps with ArgoCD or Flux
- Add monitoring with Prometheus and Grafana
- Implement CI/CD pipeline
- Add network policies
- Integrate with service mesh (Istio, Linkerd)

## References

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/pod-security-standards/)
