# Lesson 05: Deploying ELK Stack on Google Cloud Platform (GCP)

## Learning Objectives
By the end of this lesson, you will:
- Understand GCP infrastructure options for ELK deployment
- Deploy ELK on Google Compute Engine using Terraform
- Deploy ELK on Google Kubernetes Engine (GKE)
- Integrate with GCP services (Cloud Logging, Cloud Storage, IAM)
- Implement GCP-specific optimizations

**Time Estimate:** 90 minutes

## Prerequisites
- Completion of Lessons 01 and 02
- GCP account with billing enabled
- gcloud CLI installed and configured
- Terraform installed (v1.0+)
- kubectl installed
- Basic understanding of GCP services

## Table of Contents
1. [GCP Infrastructure Options](#gcp-infrastructure-options)
2. [Architecture Design](#architecture-design)
3. [ELK on Compute Engine](#elk-on-compute-engine)
4. [ELK on Google Kubernetes Engine](#elk-on-google-kubernetes-engine)
5. [GCP Service Integrations](#gcp-service-integrations)
6. [Security Configuration](#security-configuration)
7. [Cost Optimization](#cost-optimization)
8. [Monitoring and Operations](#monitoring-and-operations)
9. [Troubleshooting](#troubleshooting)

## GCP Infrastructure Options

### Deployment Options

```yaml
Option 1: Compute Engine VMs
  pros:
    - Full control
    - Flexible machine types
    - Predictable costs with committed use discounts
    - Custom images
  cons:
    - Manual management
    - Self-managed HA
    - More operational overhead
  best_for:
    - Traditional deployments
    - Specific OS requirements
    - Stable workloads
  cost: $400-4,000/month

Option 2: Google Kubernetes Engine (GKE)
  pros:
    - Auto-scaling and auto-healing
    - Managed control plane
    - Native GCP integration
    - Container orchestration
  cons:
    - Kubernetes complexity
    - GKE management fees
  best_for:
    - Cloud-native deployments
    - Large-scale operations
    - Microservices
  cost: $600-8,000/month

Option 3: Elastic Cloud on GCP
  pros:
    - Fully managed by Elastic
    - Official support
    - Latest features
  cons:
    - Higher cost
    - Less control
  best_for:
    - Enterprise needs
    - Quick deployment
  cost: $1,000-15,000/month
```

### GCP Services for ELK

```yaml
Compute:
  - Compute Engine (E2, N2, N2D, C2 series)
  - Managed Instance Groups
  - Google Kubernetes Engine (GKE)
  - Cloud Run (for lightweight services)

Storage:
  - Persistent Disks (SSD, Balanced, Standard)
  - Cloud Storage (backups, snapshots)
  - Filestore (shared storage)

Networking:
  - VPC Networks
  - Cloud Load Balancing
  - Cloud CDN
  - Cloud Armor (WAF)
  - VPC Service Controls
  - Cloud NAT

Security:
  - Cloud IAM
  - Secret Manager
  - Cloud KMS (encryption keys)
  - Binary Authorization
  - VPC Service Controls

Monitoring:
  - Cloud Monitoring (Stackdriver)
  - Cloud Logging
  - Cloud Trace
  - Cloud Profiler

Backup:
  - Persistent Disk Snapshots
  - Cloud Storage versioning
```

## Architecture Design

### Production Architecture (Multi-Zone)

```
┌─────────────────────────────────────────────────────────────┐
│              GCP Project - VPC Network                       │
│                                                              │
│  ┌──────────── Zone: us-central1-a ──────────────┐          │
│  │                                                │          │
│  │  Subnet: elk-subnet-a (10.0.1.0/24)           │          │
│  │                                                │          │
│  │  ┌────────────┐  ┌────────────┐              │          │
│  │  │ Logstash-1 │  │    ES-1    │              │          │
│  │  │  n2-std-4  │  │ n2-highmem │              │          │
│  │  └────────────┘  │    -8      │              │          │
│  │                  └─────┬──────┘              │          │
│  │                        │                      │          │
│  │                  ┌─────▼────────┐            │          │
│  │                  │ Persistent   │            │          │
│  │                  │ Disk SSD     │            │          │
│  │                  │   1 TB       │            │          │
│  │                  └──────────────┘            │          │
│  └────────────────────────────────────────────────          │
│                                                              │
│  ┌──────────── Zone: us-central1-b ──────────────┐          │
│  │  (Similar structure)                          │          │
│  │  - Logstash-2, ES-2                           │          │
│  └────────────────────────────────────────────────          │
│                                                              │
│  ┌──────────── Zone: us-central1-c ──────────────┐          │
│  │  (Similar structure)                          │          │
│  │  - ES-3 (Master)                              │          │
│  └────────────────────────────────────────────────          │
│                                                              │
│  ┌──────────────────────────────────────────────┐           │
│  │  Cloud Load Balancer                         │           │
│  │  - SSL termination                           │           │
│  │  - Cloud Armor (WAF)                         │           │
│  │  - Backend to Kibana instances               │           │
│  └──────────────────────────────────────────────┘           │
│                                                              │
│  External Services:                                          │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐         │
│  │ Cloud   │ │ Secret  │ │  Cloud   │ │  Cloud  │         │
│  │ Storage │ │ Manager │ │ Logging  │ │   IAM   │         │
│  └─────────┘ └─────────┘ └──────────┘ └─────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## ELK on Compute Engine

### Terraform Configuration

**main.tf:**
```hcl
terraform {
  required_version = ">= 1.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# VPC Network
resource "google_compute_network" "elk" {
  name                    = "${var.deployment_name}-network"
  auto_create_subnetworks = false
}

# Subnets per zone
resource "google_compute_subnetwork" "elk" {
  count         = length(var.zones)
  name          = "${var.deployment_name}-subnet-${var.zones[count.index]}"
  ip_cidr_range = cidrsubnet(var.network_cidr, 8, count.index)
  region        = var.region
  network       = google_compute_network.elk.id

  private_ip_google_access = true

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Cloud NAT for outbound internet
resource "google_compute_router" "elk" {
  name    = "${var.deployment_name}-router"
  region  = var.region
  network = google_compute_network.elk.id
}

resource "google_compute_router_nat" "elk" {
  name                               = "${var.deployment_name}-nat"
  router                             = google_compute_router.elk.name
  region                             = var.region
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}

# Firewall Rules
resource "google_compute_firewall" "elk_internal" {
  name    = "${var.deployment_name}-internal"
  network = google_compute_network.elk.name

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  source_ranges = [var.network_cidr]
  priority      = 1000
}

resource "google_compute_firewall" "elk_ssh" {
  name    = "${var.deployment_name}-ssh"
  network = google_compute_network.elk.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = var.admin_source_ranges
  target_tags   = ["elk-ssh"]
  priority      = 1000
}

resource "google_compute_firewall" "elk_health_check" {
  name    = "${var.deployment_name}-health-check"
  network = google_compute_network.elk.name

  allow {
    protocol = "tcp"
    ports    = ["9200", "5601"]
  }

  source_ranges = ["35.191.0.0/16", "130.211.0.0/22"]
  target_tags   = ["elk-lb-backend"]
  priority      = 1000
}

# Service Account for Elasticsearch
resource "google_service_account" "elasticsearch" {
  account_id   = "${var.deployment_name}-es"
  display_name = "Elasticsearch Service Account"
}

# IAM binding for Cloud Storage (snapshots)
resource "google_storage_bucket_iam_member" "elasticsearch" {
  bucket = google_storage_bucket.snapshots.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.elasticsearch.email}"
}

# IAM binding for Cloud Logging
resource "google_project_iam_member" "elasticsearch_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.elasticsearch.email}"
}

# IAM binding for Cloud Monitoring
resource "google_project_iam_member" "elasticsearch_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.elasticsearch.email}"
}

# Cloud Storage bucket for snapshots
resource "google_storage_bucket" "snapshots" {
  name          = "${var.project_id}-${var.deployment_name}-snapshots"
  location      = var.region
  force_destroy = false

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }

  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }
}

# Instance template for Elasticsearch
resource "google_compute_instance_template" "elasticsearch" {
  name_prefix  = "${var.deployment_name}-es-"
  machine_type = var.elasticsearch_machine_type
  region       = var.region

  tags = ["elk-ssh", "elk-lb-backend", "elasticsearch"]

  disk {
    source_image = "ubuntu-os-cloud/ubuntu-2204-lts"
    auto_delete  = true
    boot         = true
    disk_size_gb = 50
    disk_type    = "pd-ssd"
  }

  disk {
    auto_delete  = false
    boot         = false
    disk_size_gb = var.elasticsearch_data_disk_size
    disk_type    = "pd-ssd"
    device_name  = "elasticsearch-data"
  }

  network_interface {
    subnetwork = google_compute_subnetwork.elk[0].id

    # No external IP
  }

  service_account {
    email  = google_service_account.elasticsearch.email
    scopes = ["cloud-platform"]
  }

  metadata = {
    startup-script = templatefile("${path.module}/scripts/elasticsearch-startup.sh", {
      cluster_name       = var.elasticsearch_cluster_name
      elk_version        = var.elk_version
      gcs_bucket         = google_storage_bucket.snapshots.name
      project_id         = var.project_id
      network_tags       = "elasticsearch"
    })
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Managed Instance Group for Elasticsearch
resource "google_compute_region_instance_group_manager" "elasticsearch" {
  name               = "${var.deployment_name}-es-mig"
  base_instance_name = "${var.deployment_name}-es"
  region             = var.region

  version {
    instance_template = google_compute_instance_template.elasticsearch.id
  }

  target_size = var.elasticsearch_node_count

  named_port {
    name = "http"
    port = 9200
  }

  auto_healing_policies {
    health_check      = google_compute_health_check.elasticsearch.id
    initial_delay_sec = 300
  }

  update_policy {
    type                         = "PROACTIVE"
    minimal_action               = "REPLACE"
    max_surge_fixed              = 1
    max_unavailable_fixed        = 1
    instance_redistribution_type = "PROACTIVE"
  }
}

# Health check for Elasticsearch
resource "google_compute_health_check" "elasticsearch" {
  name                = "${var.deployment_name}-es-health"
  check_interval_sec  = 10
  timeout_sec         = 5
  healthy_threshold   = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 9200
    request_path = "/_cluster/health"
  }
}

# Internal load balancer for Elasticsearch
resource "google_compute_region_backend_service" "elasticsearch" {
  name                  = "${var.deployment_name}-es-backend"
  region                = var.region
  protocol              = "TCP"
  load_balancing_scheme = "INTERNAL"
  health_checks         = [google_compute_health_check.elasticsearch.id]

  backend {
    group          = google_compute_region_instance_group_manager.elasticsearch.instance_group
    balancing_mode = "CONNECTION"
  }

  connection_draining_timeout_sec = 300
}

resource "google_compute_forwarding_rule" "elasticsearch" {
  name                  = "${var.deployment_name}-es-ilb"
  region                = var.region
  load_balancing_scheme = "INTERNAL"
  backend_service       = google_compute_region_backend_service.elasticsearch.id
  ip_protocol           = "TCP"
  ports                 = ["9200"]
  network               = google_compute_network.elk.id
  subnetwork            = google_compute_subnetwork.elk[0].id
}

# Monitoring dashboard
resource "google_monitoring_dashboard" "elk" {
  dashboard_json = jsonencode({
    displayName = "${var.deployment_name} ELK Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          width  = 6
          height = 4
          widget = {
            title = "Elasticsearch CPU Usage"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" resource.type=\"gce_instance\""
                  }
                }
              }]
            }
          }
        }
      ]
    }
  })
}
```

**Startup Script (scripts/elasticsearch-startup.sh):**
```bash
#!/bin/bash
set -euxo pipefail

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg

# Install Java
apt-get install -y openjdk-11-jdk

# Add Elasticsearch repository
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list

# Install Elasticsearch
apt-get update
apt-get install -y elasticsearch=${elk_version}

# Get instance metadata
INSTANCE_NAME=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/name)
ZONE=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/zone | cut -d'/' -f4)
INTERNAL_IP=$(curl -H "Metadata-Flavor: Google" http://metadata.google.internal/computeMetadata/v1/instance/network-interfaces/0/ip)

# Format and mount data disk
DATA_DISK="/dev/disk/by-id/google-elasticsearch-data"
if [ -b "$DATA_DISK" ]; then
    mkfs.ext4 -F $DATA_DISK
    mkdir -p /mnt/elasticsearch
    mount $DATA_DISK /mnt/elasticsearch
    echo "$DATA_DISK /mnt/elasticsearch ext4 defaults,nofail 0 2" >> /etc/fstab
fi

chown -R elasticsearch:elasticsearch /mnt/elasticsearch

# Configure Elasticsearch
cat > /etc/elasticsearch/elasticsearch.yml <<EOF
# Cluster
cluster.name: ${cluster_name}
node.name: $INSTANCE_NAME

# Paths
path.data: /mnt/elasticsearch/data
path.logs: /var/log/elasticsearch

# Network
network.host: $INTERNAL_IP
http.port: 9200
transport.port: 9300

# Discovery - GCE plugin
discovery.seed_providers: gce
cloud.gce.project_id: ${project_id}
cloud.gce.zone: $ZONE
discovery.gce.tags: ${network_tags}
cluster.routing.allocation.awareness.attributes: zone
node.attr.zone: $ZONE

# Node roles
node.roles: [ master, data, ingest ]

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true

# GCS snapshot repository
gcs.client.default.project_id: ${project_id}
EOF

# JVM heap size (50% of RAM, max 31GB)
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
HEAP_SIZE=$((TOTAL_MEM / 2))
if [ $HEAP_SIZE -gt 31 ]; then
    HEAP_SIZE=31
fi

cat > /etc/elasticsearch/jvm.options.d/heap.options <<EOF
-Xms$${HEAP_SIZE}g
-Xmx$${HEAP_SIZE}g
EOF

# Install plugins
/usr/share/elasticsearch/bin/elasticsearch-plugin install --batch repository-gcs
/usr/share/elasticsearch/bin/elasticsearch-plugin install --batch discovery-gce

# System settings
cat >> /etc/security/limits.conf <<EOF
elasticsearch soft nofile 65536
elasticsearch hard nofile 65536
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
EOF

sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" >> /etc/sysctl.conf

# Enable and start
systemctl daemon-reload
systemctl enable elasticsearch
systemctl start elasticsearch

# Install Cloud Logging agent
curl -sSO https://dl.google.com/cloudagents/add-logging-agent-repo.sh
bash add-logging-agent-repo.sh --also-install

# Install Cloud Monitoring agent
curl -sSO https://dl.google.com/cloudagents/add-monitoring-agent-repo.sh
bash add-monitoring-agent-repo.sh --also-install

echo "Elasticsearch installation completed"
```

## ELK on Google Kubernetes Engine

### GKE Cluster with Terraform

```hcl
# GKE Cluster for ELK
resource "google_container_cluster" "elk" {
  name     = "${var.deployment_name}-gke"
  location = var.region

  # Regional cluster for HA
  node_locations = var.zones

  # Remove default node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  # Networking
  network    = google_compute_network.elk.name
  subnetwork = google_compute_subnetwork.elk[0].name

  # IP allocation for pods and services
  ip_allocation_policy {
    cluster_ipv4_cidr_block  = "10.1.0.0/16"
    services_ipv4_cidr_block = "10.2.0.0/16"
  }

  # Workload Identity
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Security
  master_auth {
    client_certificate_config {
      issue_client_certificate = false
    }
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Monitoring
  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Logging
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  # Addons
  addons_config {
    http_load_balancing {
      disabled = false
    }
    horizontal_pod_autoscaling {
      disabled = false
    }
    gce_persistent_disk_csi_driver_config {
      enabled = true
    }
  }
}

# System node pool
resource "google_container_node_pool" "system" {
  name       = "system-pool"
  location   = var.region
  cluster    = google_container_cluster.elk.name
  node_count = 1

  autoscaling {
    min_node_count = 1
    max_node_count = 3
  }

  node_config {
    machine_type = "n2-standard-4"
    disk_size_gb = 100
    disk_type    = "pd-ssd"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      role = "system"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}

# Elasticsearch node pool
resource "google_container_node_pool" "elasticsearch" {
  name       = "elasticsearch-pool"
  location   = var.region
  cluster    = google_container_cluster.elk.name
  node_count = 1

  autoscaling {
    min_node_count = 3
    max_node_count = 6
  }

  node_config {
    machine_type = "n2-highmem-8" # 8 vCPU, 64 GB RAM
    disk_size_gb = 200
    disk_type    = "pd-ssd"

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    labels = {
      role     = "elasticsearch"
      workload = "stateful"
    }

    taint {
      key    = "workload"
      value  = "elasticsearch"
      effect = "NO_SCHEDULE"
    }
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }
}
```

### Deploy with ECK

```bash
# Install ECK operator
kubectl create -f https://download.elastic.co/downloads/eck/2.10.0/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.10.0/operator.yaml

# Deploy Elasticsearch
kubectl apply -f - <<EOF
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
  namespace: elk
spec:
  version: 8.11.0
  nodeSets:
  - name: default
    count: 3
    config:
      node.store.allow_mmap: false
    podTemplate:
      spec:
        nodeSelector:
          role: elasticsearch
        tolerations:
        - key: workload
          value: elasticsearch
          effect: NoSchedule
        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 16Gi
              cpu: 4
            limits:
              memory: 16Gi
              cpu: 8
          env:
          - name: ES_JAVA_OPTS
            value: "-Xms8g -Xmx8g"
    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        storageClassName: standard-rwo
        resources:
          requests:
            storage: 500Gi
EOF
```

## GCP Service Integrations

### 1. Cloud Logging to Elasticsearch

```python
# Cloud Function to ship logs
import base64
import json
from elasticsearch import Elasticsearch

es = Elasticsearch(['http://elasticsearch:9200'])

def process_log(event, context):
    pubsub_message = base64.b64decode(event['data']).decode('utf-8')
    log_entry = json.loads(pubsub_message)

    es.index(
        index=f"gcp-logs-{log_entry['resource']['type']}",
        document=log_entry
    )
```

### 2. Secret Manager Integration

```bash
# Store credentials
echo -n "your-password" | gcloud secrets create elk-admin-password --data-file=-

# Access in startup script
ES_PASSWORD=$(gcloud secrets versions access latest --secret="elk-admin-password")
```

### 3. Cloud Storage Snapshots

```yaml
# Register GCS repository
PUT /_snapshot/gcs_repository
{
  "type": "gcs",
  "settings": {
    "bucket": "your-bucket-name",
    "base_path": "elasticsearch-snapshots",
    "compress": true
  }
}

# Create snapshot policy
PUT /_slm/policy/daily-snapshots
{
  "schedule": "0 2 * * *",
  "name": "<daily-snap-{now/d}>",
  "repository": "gcs_repository",
  "config": {
    "indices": ["*"]
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 30
  }
}
```

## Security Configuration

### 1. VPC Service Controls

```hcl
resource "google_access_context_manager_service_perimeter" "elk" {
  parent = "accessPolicies/${var.access_policy_id}"
  name   = "accessPolicies/${var.access_policy_id}/servicePerimeters/elk_perimeter"
  title  = "ELK Service Perimeter"

  status {
    restricted_services = [
      "storage.googleapis.com",
      "compute.googleapis.com"
    ]

    vpc_accessible_services {
      enable_restriction = true
      allowed_services = [
        "storage.googleapis.com"
      ]
    }
  }
}
```

### 2. Cloud Armor (WAF)

```hcl
resource "google_compute_security_policy" "elk" {
  name = "${var.deployment_name}-security-policy"

  rule {
    action   = "deny(403)"
    priority = "1000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["9.9.9.0/24"] # Blocked IPs
      }
    }
    description = "Deny access to known bad IPs"
  }

  rule {
    action   = "rate_based_ban"
    priority = "2000"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    rate_limit_options {
      conform_action = "allow"
      exceed_action  = "deny(429)"
      enforce_on_key = "IP"
      rate_limit_threshold {
        count        = 100
        interval_sec = 60
      }
      ban_duration_sec = 600
    }
    description = "Rate limit requests"
  }

  rule {
    action   = "allow"
    priority = "2147483647"
    match {
      versioned_expr = "SRC_IPS_V1"
      config {
        src_ip_ranges = ["*"]
      }
    }
    description = "Default allow rule"
  }
}
```

## Cost Optimization

### Machine Type Recommendations

```yaml
Elasticsearch Nodes:

  Development:
    machine_type: e2-medium
    vcpu: 2
    memory: 4 GB
    cost: ~$24/month

  Small Production:
    machine_type: n2-highmem-4
    vcpu: 4
    memory: 32 GB
    cost: ~$194/month

  Medium Production:
    machine_type: n2-highmem-8
    vcpu: 8
    memory: 64 GB
    cost: ~$388/month

  Large Production:
    machine_type: n2-highmem-16
    vcpu: 16
    memory: 128 GB
    cost: ~$776/month

Committed Use Discounts:
  1_year: 37% savings
  3_year: 55% savings
```

### Cost Optimization Tips

```yaml
1. Committed Use Discounts:
   - 37% savings (1-year)
   - 55% savings (3-year)

2. Preemptible VMs:
   - 60-91% savings
   - Use for Logstash nodes only
   - Not for Elasticsearch (stateful)

3. Custom Machine Types:
   - Optimize vCPU:memory ratio
   - Pay only for what you need

4. Storage Optimization:
   - pd-balanced instead of pd-ssd (50% cheaper)
   - Hot-warm-cold architecture
   - Cloud Storage for cold data

5. Network Optimization:
   - Keep traffic within region
   - Use internal IPs
   - Minimize egress

6. Right-sizing:
   - Use Cloud Monitoring
   - Identify underutilized instances
   - Resize appropriately
```

## Monitoring and Operations

### Cloud Monitoring Alerts

```hcl
resource "google_monitoring_alert_policy" "elasticsearch_cpu" {
  display_name = "Elasticsearch High CPU"
  combiner     = "OR"

  conditions {
    display_name = "CPU usage above 80%"

    condition_threshold {
      filter          = "metric.type=\"compute.googleapis.com/instance/cpu/utilization\" AND resource.label.instance_name=~\".*elasticsearch.*\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.8

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}
```

## Troubleshooting

### Common Issues

```yaml
Issue 1: GCE Discovery Not Working
  Problem: Nodes not discovering each other
  Solution:
    - Check service account permissions
    - Verify network tags
    - Check firewall rules (9300)
    - Test: gcloud compute instances list --filter="tags.items:elasticsearch"

Issue 2: Persistent Disk Not Mounting
  Problem: Data disk not accessible
  Solution:
    - Check device name in metadata
    - Verify disk attachment
    - Check /dev/disk/by-id/
    - Format if needed: mkfs.ext4

Issue 3: Out of Memory
  Problem: JVM heap exhaustion
  Solution:
    - Check heap size (50% of RAM)
    - Monitor with: GET /_nodes/stats/jvm
    - Increase machine type
    - Add more nodes
```

## Summary

✅ **GCP Infrastructure**: Compute Engine and GKE options

✅ **Terraform**: IaC for GCP deployment

✅ **Integrations**: Cloud Logging, Storage, Secret Manager

✅ **Security**: VPC Service Controls, Cloud Armor, IAM

✅ **Cost**: Committed use discounts, right-sizing

## Next Steps

- **Lesson 06**: Managed Elastic Cloud
- **Lesson 07**: Prometheus + Grafana alternative
- **Lesson 08**: Multi-cloud centralized logging

## Additional Resources

- [GCP Best Practices](https://cloud.google.com/architecture/best-practices)
- [GKE Best Practices](https://cloud.google.com/kubernetes-engine/docs/best-practices)

---

**Practice Exercise**: Deploy a 3-node Elasticsearch cluster on GCP Compute Engine using Terraform. Configure GCS snapshots and Cloud Monitoring alerts.
