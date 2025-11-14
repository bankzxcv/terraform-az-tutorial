# Google Kubernetes Engine (GKE) with Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Provision a GKE cluster using Terraform
- Configure GKE networking with VPC-native clusters
- Set up Workload Identity for secure service account access
- Integrate GKE with Google Cloud services (GCR, Cloud Logging, Secret Manager)
- Implement GKE Autopilot for managed Kubernetes
- Deploy applications to GKE using Terraform
- Apply security best practices using Binary Authorization and Pod Security
- Optimize costs with GKE features

## Prerequisites

- Completed Lesson 1: Kubernetes Basics
- Google Cloud Platform (GCP) account with appropriate permissions
- gcloud CLI installed and configured
- Terraform 1.0+ installed
- kubectl CLI installed

## Time Estimate

90-120 minutes

---

## 1. GKE Architecture Overview

### GKE Components

```
┌─────────────────────────────────────────────────────────┐
│              Google Cloud Platform                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │        GKE Control Plane (Google Managed)         │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │   API    │  │   etcd   │  │Scheduler │       │  │
│  │  │  Server  │  │ (Multi   │  │(Zonal or │       │  │
│  │  │(Regional)│  │  Zone)   │  │ Regional)│       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────┐    │
│  │           Node Pools (Customer VPC)           │    │
│  │  ┌─────────────┐  ┌─────────────────────┐    │    │
│  │  │  Standard   │  │     Autopilot       │    │    │
│  │  │  Clusters   │  │  (Fully Managed)    │    │    │
│  │  │  (GCE VMs)  │  │   Nodes             │    │    │
│  │  └─────────────┘  └─────────────────────┘    │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │       Google Cloud Integrations               │    │
│  │  - Workload Identity (Authentication)         │    │
│  │  - VPC-Native Networking (IP Aliasing)        │    │
│  │  - Cloud Logging & Monitoring                 │    │
│  │  - Container Registry / Artifact Registry     │    │
│  │  - Secret Manager                             │    │
│  │  - Binary Authorization (Image signing)       │    │
│  └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- **Standard vs Autopilot**: Choose between managed nodes or fully managed
- **Regional Clusters**: Multi-zonal control plane and nodes
- **VPC-Native**: Pod IPs from VPC subnets
- **Workload Identity**: Native GCP IAM integration
- **GKE Dataplane V2**: eBPF-based networking

---

## 2. VPC Configuration for GKE

### Create VPC with Secondary Ranges

```hcl
# terraform/main.tf

terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# VPC Network
resource "google_compute_network" "vpc" {
  name                    = "${var.cluster_name}-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# Subnet with secondary ranges for Pods and Services
resource "google_compute_subnetwork" "subnet" {
  name          = "${var.cluster_name}-subnet"
  ip_cidr_range = var.subnet_cidr
  region        = var.region
  network       = google_compute_network.vpc.id

  # Secondary ranges for GKE
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = var.pods_cidr
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = var.services_cidr
  }

  # Enable Private Google Access
  private_ip_google_access = true

  # Enable flow logs
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud Router for NAT
resource "google_compute_router" "router" {
  name    = "${var.cluster_name}-router"
  region  = var.region
  network = google_compute_network.vpc.id
}

# Cloud NAT for private nodes
resource "google_compute_router_nat" "nat" {
  name   = "${var.cluster_name}-nat"
  router = google_compute_router.router.name
  region = var.region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall rule to allow internal communication
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.cluster_name}-allow-internal"
  network = google_compute_network.vpc.id

  allow {
    protocol = "tcp"
  }

  allow {
    protocol = "udp"
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [
    var.subnet_cidr,
    var.pods_cidr,
    var.services_cidr,
  ]
}
```

---

## 3. GKE Standard Cluster

### Create Standard GKE Cluster

```hcl
# terraform/gke-cluster.tf

# Service Account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.cluster_name}-node-sa"
  display_name = "GKE Node Service Account"
  description  = "Service account for GKE nodes"
}

# Assign necessary roles to node service account
resource "google_project_iam_member" "gke_node_roles" {
  for_each = toset([
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter",
    "roles/monitoring.viewer",
    "roles/stackdriver.resourceMetadata.writer",
  ])

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

# GKE Cluster
resource "google_container_cluster" "primary" {
  name     = "${var.cluster_name}-${var.environment}"
  location = var.region  # Regional cluster (multi-zonal)

  # We can't create a cluster with no node pool defined, but we want to only use
  # separately managed node pools. So we create the smallest possible default
  # node pool and immediately delete it.
  remove_default_node_pool = true
  initial_node_count       = 1

  # Kubernetes version
  min_master_version = var.kubernetes_version

  # Network configuration
  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  # VPC-native cluster (IP aliasing)
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Master authorized networks (who can access the control plane)
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"  # Change to your IP range
      display_name = "All"
    }
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Add-ons configuration
  addons_config {
    http_load_balancing {
      disabled = false
    }

    horizontal_pod_autoscaling {
      disabled = false
    }

    network_policy_config {
      disabled = false
    }

    gcp_filestore_csi_driver_config {
      enabled = true
    }

    gce_persistent_disk_csi_driver_config {
      enabled = true
    }

    dns_cache_config {
      enabled = true
    }
  }

  # Network policy
  network_policy {
    enabled  = true
    provider = "PROVIDER_UNSPECIFIED"  # Uses Calico
  }

  # Dataplane V2 (eBPF-based networking)
  datapath_provider = "ADVANCED_DATAPATH"

  # Enable Binary Authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Release channel (RAPID, REGULAR, STABLE)
  release_channel {
    channel = "REGULAR"
  }

  # Enable Shielded Nodes
  enable_shielded_nodes = true

  # Logging and monitoring
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]
  }

  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]

    managed_prometheus {
      enabled = true
    }
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Resource labels
  resource_labels = {
    environment = var.environment
    managed-by  = "terraform"
  }

  # Protect cluster from accidental deletion
  deletion_protection = false  # Set to true in production
}

# Primary node pool
resource "google_container_node_pool" "primary" {
  name     = "primary-pool"
  location = var.region
  cluster  = google_container_cluster.primary.name

  # Autoscaling configuration
  autoscaling {
    min_node_count = var.min_node_count
    max_node_count = var.max_node_count
  }

  # Node count per zone (for regional cluster)
  initial_node_count = var.initial_node_count

  # Node configuration
  node_config {
    preemptible  = var.use_preemptible
    machine_type = var.machine_type
    disk_size_gb = 100
    disk_type    = "pd-standard"

    # Service account
    service_account = google_service_account.gke_nodes.email

    # OAuth scopes
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Labels
    labels = {
      environment = var.environment
      node-pool   = "primary"
    }

    # Metadata
    metadata = {
      disable-legacy-endpoints = "true"
    }

    # Shielded instance config
    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    # Workload metadata config
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    # Tags for firewall rules
    tags = ["gke-node", var.cluster_name]
  }

  # Update strategy
  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0

    strategy = "SURGE"
  }

  # Lifecycle
  lifecycle {
    ignore_changes = [initial_node_count]
  }
}
```

---

## 4. GKE Autopilot Cluster

### Create Autopilot Cluster (Fully Managed)

```hcl
# terraform/gke-autopilot.tf

resource "google_container_cluster" "autopilot" {
  name     = "${var.cluster_name}-autopilot-${var.environment}"
  location = var.region

  # Enable Autopilot
  enable_autopilot = true

  # Network configuration
  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  # IP allocation policy
  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Private cluster
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.16/28"
  }

  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All"
    }
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary Authorization
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  # Logging
  logging_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]
  }

  # Monitoring
  monitoring_config {
    enable_components = [
      "SYSTEM_COMPONENTS",
      "WORKLOADS"
    ]

    managed_prometheus {
      enabled = true
    }
  }

  resource_labels = {
    environment = var.environment
    managed-by  = "terraform"
    cluster-type = "autopilot"
  }

  deletion_protection = false
}
```

---

## 5. Workload Identity Setup

### Configure Workload Identity

```hcl
# terraform/workload-identity.tf

# Google Service Account for application
resource "google_service_account" "app" {
  account_id   = "${var.cluster_name}-app-sa"
  display_name = "Application Service Account"
  description  = "Service account for application workloads"
}

# Grant GCS permissions to service account
resource "google_project_iam_member" "app_storage" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.app.email}"
}

# Kubernetes namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"

    labels = {
      environment = "production"
      managed-by  = "terraform"
    }
  }

  depends_on = [google_container_cluster.primary]
}

# Kubernetes service account
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-ksa"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.app.email
    }
  }
}

# Bind Kubernetes SA to Google SA
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.app.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[${kubernetes_namespace.app.metadata[0].name}/${kubernetes_service_account.app.metadata[0].name}]"
}
```

---

## 6. Deploying Applications to GKE

### Configure Kubernetes Provider

```hcl
# terraform/kubernetes-provider.tf

data "google_client_config" "default" {}

data "google_container_cluster" "primary" {
  name     = google_container_cluster.primary.name
  location = google_container_cluster.primary.location
}

provider "kubernetes" {
  host  = "https://${data.google_container_cluster.primary.endpoint}"
  token = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(
    data.google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  )
}
```

### Deploy Application

```hcl
# terraform/app-deployment.tf

resource "kubernetes_deployment" "app" {
  metadata {
    name      = "myapp"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app = "myapp"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "myapp"
      }
    }

    template {
      metadata {
        labels = {
          app = "myapp"
        }
      }

      spec {
        # Use Workload Identity
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = "myapp"
          image = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}/myapp:1.0.0"

          port {
            container_port = 8080
            name           = "http"
          }

          # For Autopilot, resources must be specified
          resources {
            limits = {
              cpu    = "1000m"
              memory = "1Gi"
            }
            requests = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          # Health checks
          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }

          # Security context
          security_context {
            run_as_non_root            = true
            run_as_user                = 1000
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
            }
          }
        }

        # Affinity for high availability
        affinity {
          pod_anti_affinity {
            preferred_during_scheduling_ignored_during_execution {
              weight = 100

              pod_affinity_term {
                label_selector {
                  match_expressions {
                    key      = "app"
                    operator = "In"
                    values   = ["myapp"]
                  }
                }

                topology_key = "kubernetes.io/hostname"
              }
            }
          }
        }
      }
    }

    strategy {
      type = "RollingUpdate"

      rolling_update {
        max_surge       = "25%"
        max_unavailable = "25%"
      }
    }
  }
}

# Service
resource "kubernetes_service" "app" {
  metadata {
    name      = "myapp-service"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "cloud.google.com/neg" = jsonencode({ ingress = true })
    }
  }

  spec {
    selector = {
      app = "myapp"
    }

    port {
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# Ingress with Google Cloud Load Balancer
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "myapp-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                 = "gce"
      "kubernetes.io/ingress.global-static-ip-name" = google_compute_global_address.app.name
      "networking.gke.io/managed-certificates"      = google_compute_managed_ssl_certificate.app.name
    }
  }

  spec {
    rule {
      http {
        path {
          path      = "/*"
          path_type = "ImplementationSpecific"

          backend {
            service {
              name = kubernetes_service.app.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }
  }
}

# Global IP address
resource "google_compute_global_address" "app" {
  name = "${var.cluster_name}-app-ip"
}

# Managed SSL certificate
resource "google_compute_managed_ssl_certificate" "app" {
  name = "${var.cluster_name}-cert"

  managed {
    domains = [var.app_domain]
  }
}
```

---

## 7. Artifact Registry Integration

### Create Artifact Registry

```hcl
# terraform/artifact-registry.tf

resource "google_artifact_registry_repository" "app" {
  location      = var.region
  repository_id = "${var.cluster_name}-repo"
  description   = "Docker repository for ${var.cluster_name}"
  format        = "DOCKER"

  # Cleanup policy
  cleanup_policies {
    id     = "delete-old-images"
    action = "DELETE"

    condition {
      tag_state    = "UNTAGGED"
      older_than   = "2592000s"  # 30 days
    }
  }

  cleanup_policies {
    id     = "keep-recent-versions"
    action = "KEEP"

    most_recent_versions {
      keep_count = 10
    }
  }
}

# Grant node SA permission to pull images
resource "google_artifact_registry_repository_iam_member" "node_reader" {
  location   = google_artifact_registry_repository.app.location
  repository = google_artifact_registry_repository.app.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${google_service_account.gke_nodes.email}"
}

output "artifact_registry_url" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.app.repository_id}"
}
```

---

## 8. Security Best Practices

### Binary Authorization

```hcl
# terraform/binary-authorization.tf

# Binary Authorization policy
resource "google_binary_authorization_policy" "policy" {
  admission_whitelist_patterns {
    name_pattern = "gcr.io/google_containers/*"
  }

  admission_whitelist_patterns {
    name_pattern = "gcr.io/google-containers/*"
  }

  admission_whitelist_patterns {
    name_pattern = "k8s.gcr.io/*"
  }

  admission_whitelist_patterns {
    name_pattern = "gke.gcr.io/*"
  }

  # Default rule - require attestation
  default_admission_rule {
    evaluation_mode  = "REQUIRE_ATTESTATION"
    enforcement_mode = "ENFORCED_BLOCK_AND_AUDIT_LOG"

    require_attestations_by = [
      google_binary_authorization_attestor.attestor.name
    ]
  }

  # Cluster-specific admission rule
  cluster_admission_rules {
    cluster                 = google_container_cluster.primary.id
    evaluation_mode         = "REQUIRE_ATTESTATION"
    enforcement_mode        = "ENFORCED_BLOCK_AND_AUDIT_LOG"
    require_attestations_by = [
      google_binary_authorization_attestor.attestor.name
    ]
  }
}

# Attestor
resource "google_binary_authorization_attestor" "attestor" {
  name = "${var.cluster_name}-attestor"

  attestation_authority_note {
    note_reference = google_container_analysis_note.note.name
  }
}

# Container Analysis Note
resource "google_container_analysis_note" "note" {
  name = "${var.cluster_name}-attestor-note"

  attestation_authority {
    hint {
      human_readable_name = "Attestor for ${var.cluster_name}"
    }
  }
}
```

### Pod Security Standards

```hcl
# terraform/pod-security.tf

resource "kubernetes_labels" "namespace_security" {
  api_version = "v1"
  kind        = "Namespace"

  metadata {
    name = kubernetes_namespace.app.metadata[0].name
  }

  labels = {
    "pod-security.kubernetes.io/enforce" = "restricted"
    "pod-security.kubernetes.io/audit"   = "restricted"
    "pod-security.kubernetes.io/warn"    = "restricted"
  }

  depends_on = [kubernetes_namespace.app]
}
```

---

## 9. Cost Optimization

### Strategies

1. **Use Autopilot**: Pay only for running pods
2. **Use Preemptible VMs**: 60-91% cheaper for fault-tolerant workloads
3. **Cluster Autoscaler**: Automatically adjust node count
4. **HPA**: Scale pods based on load
5. **Committed Use Discounts**: For predictable workloads

### Preemptible Node Pool

```hcl
resource "google_container_node_pool" "preemptible" {
  name     = "preemptible-pool"
  location = var.region
  cluster  = google_container_cluster.primary.name

  autoscaling {
    min_node_count = 0
    max_node_count = 10
  }

  node_config {
    preemptible  = true
    machine_type = "n1-standard-2"

    service_account = google_service_account.gke_nodes.email
    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    labels = {
      workload-type = "batch"
      preemptible   = "true"
    }

    taint {
      key    = "preemptible"
      value  = "true"
      effect = "NO_SCHEDULE"
    }
  }
}
```

---

## 10. Variables and Outputs

### Variables

```hcl
# terraform/variables.tf

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "GKE cluster name"
  type        = string
  default     = "demo"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "subnet_cidr" {
  description = "Subnet CIDR"
  type        = string
  default     = "10.0.0.0/20"
}

variable "pods_cidr" {
  description = "Pods CIDR"
  type        = string
  default     = "10.4.0.0/14"
}

variable "services_cidr" {
  description = "Services CIDR"
  type        = string
  default     = "10.8.0.0/20"
}

variable "machine_type" {
  description = "Machine type for nodes"
  type        = string
  default     = "e2-medium"
}

variable "min_node_count" {
  description = "Minimum number of nodes per zone"
  type        = number
  default     = 1
}

variable "max_node_count" {
  description = "Maximum number of nodes per zone"
  type        = number
  default     = 3
}

variable "initial_node_count" {
  description = "Initial number of nodes per zone"
  type        = number
  default     = 1
}

variable "use_preemptible" {
  description = "Use preemptible VMs"
  type        = bool
  default     = false
}

variable "app_domain" {
  description = "Application domain for SSL certificate"
  type        = string
  default     = "example.com"
}
```

### Outputs

```hcl
# terraform/outputs.tf

output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Cluster CA certificate"
  value       = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "configure_kubectl" {
  description = "Configure kubectl"
  value       = "gcloud container clusters get-credentials ${google_container_cluster.primary.name} --region ${var.region} --project ${var.project_id}"
}
```

---

## Summary

You've learned how to:
- Create GKE clusters (Standard and Autopilot)
- Configure VPC-native networking
- Set up Workload Identity
- Deploy applications with Google Cloud integration
- Implement Binary Authorization
- Optimize costs with preemptible VMs

### Next Steps

- **Lesson 5**: Advanced Kubernetes resource management
- Explore GKE Enterprise (Anthos)
- Implement Config Connector for infrastructure as code
- Set up multi-cluster mesh with Anthos Service Mesh

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty Level**: Intermediate

**Cost Estimate**: $3-5 per day (Standard), $0.10/vCPU/hour + $0.011/GB/hour (Autopilot)
