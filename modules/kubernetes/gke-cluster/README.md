# GKE Cluster Terraform Module

Reusable Terraform module for deploying Google Kubernetes Engine (GKE) clusters.

## Usage

```hcl
module "gke_cluster" {
  source = "./modules/kubernetes/gke-cluster"

  project_id   = "my-gcp-project"
  cluster_name = "my-gke-cluster"
  environment  = "production"
  region       = "us-central1"

  # VPC configuration
  subnet_cidr   = "10.0.0.0/20"
  pods_cidr     = "10.4.0.0/14"
  services_cidr = "10.8.0.0/20"

  # Node pool configuration
  machine_type       = "e2-medium"
  min_node_count     = 1
  max_node_count     = 3
  initial_node_count = 1

  # Kubernetes version
  kubernetes_version = "1.28"

  # Enable Autopilot (optional)
  enable_autopilot = false

  # Use preemptible VMs for cost savings
  use_preemptible = false
}
```

## Features

- ✅ Regional cluster for high availability
- ✅ VPC-native networking
- ✅ Workload Identity support
- ✅ Cloud NAT for private nodes
- ✅ Dataplane V2 (eBPF networking)
- ✅ Binary Authorization
- ✅ Cloud Monitoring and Logging
- ✅ Managed Prometheus
- ✅ Artifact Registry integration
- ✅ Autopilot mode support
- ✅ Preemptible nodes option

## Autopilot vs Standard

Choose between Autopilot (fully managed) or Standard (more control):

```hcl
# Autopilot (Recommended)
module "gke_autopilot" {
  source = "./modules/kubernetes/gke-cluster"

  enable_autopilot = true
  # ... other variables
}

# Standard
module "gke_standard" {
  source = "./modules/kubernetes/gke-cluster"

  enable_autopilot = false
  machine_type     = "e2-medium"
  # ... other variables
}
```

## Inputs

See Lesson 4 for complete input variables documentation.

| Name | Description | Type | Required |
|------|-------------|------|----------|
| `project_id` | GCP project ID | string | Yes |
| `cluster_name` | Name of the GKE cluster | string | Yes |
| `region` | GCP region | string | Yes |
| `enable_autopilot` | Enable Autopilot mode | bool | No |

## Outputs

| Name | Description |
|------|-------------|
| `cluster_name` | GKE cluster name |
| `cluster_endpoint` | GKE cluster endpoint |
| `cluster_ca_certificate` | Cluster CA certificate |
| `region` | GCP region |

## Examples

See `/examples/kubernetes-apps/gke-cluster/` and Lesson 4 for complete examples.

## Requirements

- Terraform >= 1.0
- Google Provider ~> 5.0
- Appropriate GCP permissions

## References

- [Lesson 4: GKE with Terraform](../../../docs/05-kubernetes/04-gke-gcp.md)
- [GKE Documentation](https://cloud.google.com/kubernetes-engine/docs)
