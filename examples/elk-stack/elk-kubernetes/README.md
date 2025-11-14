# ELK Stack on Kubernetes

This example deploys ELK Stack on Kubernetes using Elastic Cloud on Kubernetes (ECK) operator.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Kubernetes Cluster (AKS/EKS/GKE)          │
│                                                     │
│  ┌────────────── elk namespace ───────────────┐   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │  Elasticsearch StatefulSet          │   │   │
│  │  │                                     │   │   │
│  │  │  ┌──────┐  ┌──────┐  ┌──────┐     │   │   │
│  │  │  │ ES-0 │  │ ES-1 │  │ ES-2 │     │   │   │
│  │  │  │Master│  │Master│  │Master│     │   │   │
│  │  │  │ Data │  │ Data │  │ Data │     │   │   │
│  │  │  └───┬──┘  └───┬──┘  └───┬──┘     │   │   │
│  │  │      │         │         │         │   │   │
│  │  │  ┌───▼─────────▼─────────▼───┐    │   │   │
│  │  │  │   PersistentVolumeClaims  │    │   │   │
│  │  │  │   (500GB each)            │    │   │   │
│  │  │  └───────────────────────────┘    │   │   │
│  │  └─────────────────────────────────────┘   │   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │  Kibana Deployment                  │   │   │
│  │  │  ┌──────────┐  ┌──────────┐        │   │   │
│  │  │  │ Kibana-0 │  │ Kibana-1 │        │   │   │
│  │  │  └─────┬────┘  └─────┬────┘        │   │   │
│  │  └────────┼──────────────┼─────────────┘   │   │
│  │           │              │                 │   │
│  │           └──────┬───────┘                 │   │
│  │                  │                         │   │
│  │         ┌────────▼────────┐                │   │
│  │         │  LoadBalancer   │                │   │
│  │         │  Service        │                │   │
│  │         └─────────────────┘                │   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │  Logstash Deployment                │   │   │
│  │  │  ┌───────────┐  ┌───────────┐      │   │   │
│  │  │  │Logstash-0 │  │Logstash-1 │      │   │   │
│  │  │  └───────────┘  └───────────┘      │   │   │
│  │  └─────────────────────────────────────┘   │   │
│  │                                             │   │
│  │  ┌─────────────────────────────────────┐   │   │
│  │  │  Filebeat DaemonSet                 │   │   │
│  │  │  (runs on each node)                │   │   │
│  │  │  ┌────┐  ┌────┐  ┌────┐  ┌────┐   │   │   │
│  │  │  │FB-1│  │FB-2│  │FB-3│  │FB-n│   │   │   │
│  │  │  └────┘  └────┘  └────┘  └────┘   │   │   │
│  │  └─────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Features

- **ECK Operator**: Official Elastic operator for Kubernetes
- **Auto-scaling**: Elasticsearch nodes can scale based on load
- **High Availability**: Multi-replica setup
- **Persistent Storage**: StatefulSets with PVCs
- **Security**: TLS enabled, RBAC configured
- **Monitoring**: Built-in Elastic monitoring

## Prerequisites

- Kubernetes cluster (AKS, EKS, GKE, or local)
- kubectl configured
- Helm 3.x installed
- At least 3 worker nodes (for production setup)
- 16 GB RAM minimum per node

## Quick Start

### 1. Install ECK Operator

```bash
# Install ECK CRDs
kubectl create -f https://download.elastic.co/downloads/eck/2.10.0/crds.yaml

# Install ECK operator
kubectl apply -f https://download.elastic.co/downloads/eck/2.10.0/operator.yaml

# Verify installation
kubectl -n elastic-system logs -f statefulset.apps/elastic-operator
```

### 2. Deploy Elasticsearch

```bash
kubectl apply -f elasticsearch.yaml

# Wait for cluster to be ready
kubectl get elasticsearch -n elk

# Get password
kubectl get secret elasticsearch-es-elastic-user -n elk \
  -o=jsonpath='{.data.elastic}' | base64 --decode
```

### 3. Deploy Kibana

```bash
kubectl apply -f kibana.yaml

# Wait for Kibana to be ready
kubectl get kibana -n elk

# Port-forward to access locally
kubectl port-forward service/kibana-kb-http 5601 -n elk
```

### 4. Deploy Logstash (Optional)

```bash
kubectl apply -f logstash.yaml
```

### 5. Deploy Filebeat

```bash
kubectl apply -f filebeat.yaml
```

## Access Kibana

### Option 1: Port Forward (Development)

```bash
kubectl port-forward service/kibana-kb-http 5601 -n elk
# Access at: https://localhost:5601
```

### Option 2: LoadBalancer (Production)

```bash
# Get external IP
kubectl get service kibana-kb-http -n elk
# Access at: https://<EXTERNAL-IP>:5601
```

### Default Credentials

- **Username**: `elastic`
- **Password**: Get from secret:
  ```bash
  kubectl get secret elasticsearch-es-elastic-user -n elk \
    -o=jsonpath='{.data.elastic}' | base64 --decode
  ```

## Configuration Files

### elasticsearch.yaml

Production-ready Elasticsearch cluster with:
- 3 master nodes
- 3 data nodes
- Persistent volumes
- Resource requests/limits
- Anti-affinity rules

### kibana.yaml

Kibana deployment with:
- 2 replicas for HA
- LoadBalancer service
- TLS enabled
- Connected to Elasticsearch

### logstash.yaml

Logstash deployment with:
- 2 replicas
- Configurable pipeline
- Connected to Elasticsearch

### filebeat.yaml

Filebeat DaemonSet:
- Runs on all nodes
- Collects container logs
- Ships to Logstash/Elasticsearch

## Scaling

### Scale Elasticsearch

```bash
# Scale data nodes
kubectl patch elasticsearch elasticsearch -n elk \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/nodeSets/1/count", "value": 5}]'
```

### Scale Kibana

```bash
kubectl scale deployment kibana-kb -n elk --replicas=3
```

## Monitoring

### Check Cluster Health

```bash
# Port-forward Elasticsearch
kubectl port-forward service/elasticsearch-es-http 9200 -n elk

# Check health
curl -k -u "elastic:$PASSWORD" https://localhost:9200/_cluster/health?pretty
```

### View Logs

```bash
# Elasticsearch logs
kubectl logs -f elasticsearch-es-default-0 -n elk

# Kibana logs
kubectl logs -f deployment/kibana-kb -n elk

# Logstash logs
kubectl logs -f deployment/logstash -n elk
```

## Backup and Restore

### Configure Snapshot Repository

```bash
# Create S3/GCS/Azure Blob snapshot repository
# See snapshot-config.yaml
kubectl apply -f snapshot-config.yaml
```

### Create Snapshot

```bash
curl -k -u "elastic:$PASSWORD" -X PUT \
  "https://localhost:9200/_snapshot/my_backup/snapshot_1?wait_for_completion=true" \
  -H 'Content-Type: application/json'
```

## Troubleshooting

### Pods not starting

```bash
# Check pod status
kubectl get pods -n elk

# Describe pod
kubectl describe pod elasticsearch-es-default-0 -n elk

# Check events
kubectl get events -n elk --sort-by='.lastTimestamp'
```

### PVC issues

```bash
# Check PVCs
kubectl get pvc -n elk

# Check storage class
kubectl get storageclass
```

### Out of memory

```bash
# Check resource usage
kubectl top pods -n elk

# Increase heap size in elasticsearch.yaml
```

## Resource Requirements

### Small (Development)

```yaml
Elasticsearch:
  replicas: 1
  memory: 2Gi
  cpu: 1
  storage: 10Gi

Kibana:
  replicas: 1
  memory: 1Gi
  cpu: 500m

Total: ~3-4 GB RAM
```

### Medium (Staging)

```yaml
Elasticsearch:
  replicas: 3
  memory: 4Gi
  cpu: 2
  storage: 100Gi

Kibana:
  replicas: 2
  memory: 2Gi
  cpu: 1

Logstash:
  replicas: 2
  memory: 2Gi
  cpu: 1

Total: ~20-24 GB RAM
```

### Large (Production)

```yaml
Elasticsearch:
  replicas: 6
  memory: 16Gi
  cpu: 4
  storage: 500Gi

Kibana:
  replicas: 3
  memory: 4Gi
  cpu: 2

Logstash:
  replicas: 4
  memory: 4Gi
  cpu: 2

Total: ~100+ GB RAM
```

## Cost Optimization

1. **Use node selectors** - Dedicate specific nodes for Elasticsearch
2. **Auto-scaling** - Scale down during off-hours
3. **Storage tiers** - Use different storage classes for hot/warm/cold
4. **Resource limits** - Prevent resource waste
5. **Spot instances** - Use for non-critical components

## Cleanup

```bash
# Delete all resources
kubectl delete -f filebeat.yaml
kubectl delete -f logstash.yaml
kubectl delete -f kibana.yaml
kubectl delete -f elasticsearch.yaml

# Delete namespace
kubectl delete namespace elk

# Uninstall ECK operator
kubectl delete -f https://download.elastic.co/downloads/eck/2.10.0/operator.yaml
kubectl delete -f https://download.elastic.co/downloads/eck/2.10.0/crds.yaml
```

## Additional Resources

- [ECK Documentation](https://www.elastic.co/guide/en/cloud-on-k8s/current/index.html)
- [Elasticsearch on Kubernetes Best Practices](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-best-practices.html)

---

**Time to Complete**: 30 minutes
**Difficulty**: Intermediate
**Prerequisites**: Kubernetes knowledge
