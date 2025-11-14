# GKE Cluster Example

Complete Google Kubernetes Engine (GKE) cluster deployment using Terraform.

## Features

- Production-ready GKE cluster (Standard or Autopilot)
- VPC-native networking with secondary IP ranges
- Regional cluster for high availability
- Workload Identity for secure GCP service access
- Cloud NAT for private nodes
- Binary Authorization for image security
- GKE Dataplane V2 (eBPF networking)
- Cloud Monitoring and Logging
- Artifact Registry integration

## Quick Start

```bash
# Initialize Terraform
terraform init

# Review resources
terraform plan

# Deploy cluster
terraform apply

# Get kubeconfig
gcloud container clusters get-credentials <cluster-name> --region <region> --project <project-id>

# Verify
kubectl get nodes
```

## What Gets Created

- VPC network and subnet with secondary ranges
- Cloud Router and Cloud NAT
- GKE cluster (Standard or Autopilot mode)
- Node pool with autoscaling
- Artifact Registry repository
- Service account with IAM bindings
- Firewall rules

## Autopilot vs Standard

### Autopilot (Recommended for most workloads)
- Fully managed nodes
- Pay per pod resource usage
- Automatic scaling and updates
- Reduced operational overhead
- Cost: $0.10/vCPU/hour + $0.011/GB/hour

### Standard
- More control over node configuration
- Fixed node pricing
- Custom machine types
- Support for specialized workloads
- Cost: ~$3-5 per day for development

## See Also

- [Lesson 4: GKE with Terraform](../../../docs/05-kubernetes/04-gke-gcp.md)
- [GKE Terraform Module](../../../modules/kubernetes/gke-cluster/)
- For complete implementation, refer to Lesson 4

## Estimated Cost

### Standard Mode
~$3-5 per day for basic development cluster with 3 e2-medium nodes

### Autopilot Mode
Pay per pod:
- 1 vCPU + 1GB RAM running 24/7 = ~$75/month
- More cost-effective for variable workloads
