# Lesson 3: Compute Engine - Virtual Machines

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and manage Compute Engine VM instances with Terraform
- Configure instance templates for repeatable deployments
- Use startup scripts and metadata for instance configuration
- Implement SSH access and security best practices
- Create managed instance groups for auto-scaling
- Understand machine types and cost optimization

## Prerequisites

- Completed Lessons 1 and 2
- GCP project with billing enabled
- Compute Engine API enabled
- Basic understanding of Linux/SSH

## Time Estimate

**90-120 minutes**

---

## What is Compute Engine?

Google Compute Engine (GCE) provides scalable, high-performance virtual machines running in Google's data centers.

**Key Features:**
- Custom machine types
- Preemptible/Spot VMs (up to 90% cost savings)
- Live migration (no downtime during maintenance)
- Per-second billing
- Automatic sustained use discounts
- Integration with other GCP services

---

## Basic VM Instance

### Create Your First VM

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

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
  zone    = var.zone
}

# Create a simple VM instance
resource "google_compute_instance" "web_server" {
  # Instance name (must be unique within project)
  name = "web-server-${var.environment}"

  # Machine type determines CPU and memory
  # e2-micro: 2 vCPUs, 1 GB memory (free tier eligible)
  machine_type = "e2-micro"

  # Zone where instance will be created
  zone = var.zone

  # Boot disk configuration
  boot_disk {
    initialize_params {
      # Operating system image
      # Format: project/image-family or project/image-name
      image = "debian-cloud/debian-11"

      # Disk size in GB
      size = 10

      # Disk type: pd-standard, pd-balanced, pd-ssd
      type = "pd-balanced"
    }

    # Auto-delete disk when instance is deleted
    auto_delete = true
  }

  # Network configuration
  network_interface {
    # Use default VPC network
    network = "default"

    # Assign external IP address
    access_config {
      # Ephemeral IP (changes on restart)
      # For static IP, use: nat_ip = google_compute_address.static.address
    }
  }

  # Metadata for instance configuration
  metadata = {
    # Enable OS Login for SSH access
    enable-oslogin = "TRUE"

    # Custom metadata
    environment = var.environment
  }

  # Resource labels for organization
  labels = {
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "web-server"
  }

  # Tags for firewall rules
  tags = ["web-server", "http-server", "https-server"]
}

# Output instance information
output "instance_name" {
  description = "Name of the instance"
  value       = google_compute_instance.web_server.name
}

output "instance_internal_ip" {
  description = "Internal IP address"
  value       = google_compute_instance.web_server.network_interface[0].network_ip
}

output "instance_external_ip" {
  description = "External IP address"
  value       = google_compute_instance.web_server.network_interface[0].access_config[0].nat_ip
}
```

### Variables

```hcl
# variables.tf
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone"
  type        = string
  default     = "us-central1-a"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
```

---

## Machine Types

### Understanding Machine Types

GCP offers several machine type families:

```hcl
# General Purpose (balanced CPU/memory)
# E2: Cost-optimized (e2-micro, e2-small, e2-medium, e2-standard-2)
resource "google_compute_instance" "e2_instance" {
  name         = "e2-instance"
  machine_type = "e2-medium"  # 2 vCPUs, 4 GB RAM
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}

# N2: Balanced performance (n2-standard-2, n2-standard-4, n2-standard-8)
resource "google_compute_instance" "n2_instance" {
  name         = "n2-instance"
  machine_type = "n2-standard-2"  # 2 vCPUs, 8 GB RAM
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}

# Compute-Optimized (high CPU/memory ratio)
# C2: Compute-intensive workloads
resource "google_compute_instance" "c2_instance" {
  name         = "c2-instance"
  machine_type = "c2-standard-4"  # 4 vCPUs, 16 GB RAM
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}

# Memory-Optimized (high memory/CPU ratio)
# M2: Memory-intensive workloads
resource "google_compute_instance" "m2_instance" {
  name         = "m2-instance"
  machine_type = "m2-ultramem-208"  # 208 vCPUs, 5.9 TB RAM
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}

# Custom Machine Types
resource "google_compute_instance" "custom_instance" {
  name         = "custom-instance"
  zone         = var.zone

  # Custom: specify vCPUs and memory independently
  machine_type = "n2-custom-4-8192"  # 4 vCPUs, 8 GB RAM

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}
```

### Machine Type Selection Guide

```hcl
# Development/Testing: Use cost-effective options
locals {
  dev_machine_type = "e2-micro"  # Free tier eligible

  # Production: Choose based on workload
  prod_machine_types = {
    web_server    = "e2-medium"      # Web applications
    api_server    = "n2-standard-2"  # API services
    database      = "n2-highmem-4"   # Databases
    batch_job     = "c2-standard-8"  # CPU-intensive
    cache_server  = "m2-ultramem-208" # In-memory databases
  }
}
```

---

## Startup Scripts

### Using Startup Scripts

Startup scripts run when an instance boots or restarts.

```hcl
# Inline startup script
resource "google_compute_instance" "web_with_startup" {
  name         = "web-with-startup"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  # Inline startup script
  metadata_startup_script = <<-EOF
    #!/bin/bash
    # Update system
    apt-get update
    apt-get install -y nginx

    # Create simple web page
    cat > /var/www/html/index.html <<HTML
    <html>
    <head><title>GCP VM</title></head>
    <body>
      <h1>Hello from Compute Engine!</h1>
      <p>Hostname: $(hostname)</p>
      <p>Instance: ${google_compute_instance.web_with_startup.name}</p>
    </body>
    </html>
    HTML

    # Start nginx
    systemctl start nginx
    systemctl enable nginx
  EOF

  tags = ["http-server"]
}

# Startup script from file
resource "google_compute_instance" "web_with_file_startup" {
  name         = "web-with-file-startup"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  # Load startup script from file
  metadata_startup_script = file("${path.module}/scripts/startup.sh")

  tags = ["http-server"]
}
```

### Startup Script Best Practices

```bash
# scripts/startup.sh
#!/bin/bash
set -e  # Exit on error
set -x  # Print commands for debugging

# Log everything to file
exec > >(tee /var/log/startup-script.log)
exec 2>&1

echo "Starting instance configuration..."

# Update system packages
apt-get update
apt-get upgrade -y

# Install required software
apt-get install -y \
  nginx \
  curl \
  git \
  jq

# Configure application
mkdir -p /opt/myapp
cd /opt/myapp

# Download application code
# In production, pull from Cloud Storage or repository
gsutil cp gs://my-bucket/app.tar.gz /opt/myapp/
tar -xzf app.tar.gz

# Set up environment variables
cat > /opt/myapp/.env <<ENV
ENVIRONMENT=production
DATABASE_URL=postgresql://user:pass@host/db
API_KEY=$(curl -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/attributes/api-key)
ENV

# Start application
systemctl start myapp
systemctl enable myapp

echo "Startup script completed successfully"
```

---

## Metadata and Instance Information

### Instance Metadata

```hcl
resource "google_compute_instance" "with_metadata" {
  name         = "instance-with-metadata"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  # Custom metadata
  metadata = {
    # SSH keys (legacy method, use OS Login instead)
    ssh-keys = "user:ssh-rsa AAAAB3NzaC1yc2E... user@example.com"

    # Enable OS Login (recommended)
    enable-oslogin = "TRUE"

    # Custom application configuration
    environment     = var.environment
    app_version     = "1.0.0"
    database_host   = "10.0.0.5"

    # Secret values (use Secret Manager instead!)
    # api_key = "secret-value"  # DON'T DO THIS!

    # User data for cloud-init
    user-data = <<-EOF
      #cloud-config
      packages:
        - nginx
        - docker.io
      runcmd:
        - systemctl start nginx
    EOF
  }
}
```

### Accessing Metadata from Instance

```bash
# From within the instance, access metadata
# Base URL
METADATA_URL="http://metadata.google.internal/computeMetadata/v1"

# Get instance name
curl -H "Metadata-Flavor: Google" \
  $METADATA_URL/instance/name

# Get zone
curl -H "Metadata-Flavor: Google" \
  $METADATA_URL/instance/zone

# Get custom metadata
curl -H "Metadata-Flavor: Google" \
  $METADATA_URL/instance/attributes/environment

# Get service account token
curl -H "Metadata-Flavor: Google" \
  $METADATA_URL/instance/service-accounts/default/token
```

### Using Metadata in Startup Scripts

```hcl
resource "google_compute_instance" "metadata_example" {
  name         = "metadata-example"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  metadata = {
    app_config = jsonencode({
      database_url = "postgresql://host/db"
      cache_url    = "redis://cache:6379"
      log_level    = "info"
    })
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    # Get metadata
    METADATA_URL="http://metadata.google.internal/computeMetadata/v1"

    # Retrieve configuration
    APP_CONFIG=$(curl -H "Metadata-Flavor: Google" \
      $METADATA_URL/instance/attributes/app_config)

    # Parse JSON and use values
    echo $APP_CONFIG | jq -r '.database_url' > /etc/myapp/db.conf
    echo $APP_CONFIG | jq -r '.cache_url' > /etc/myapp/cache.conf
  EOF
}
```

---

## Service Accounts for Instances

### Attach Service Account

```hcl
# Create dedicated service account for instance
resource "google_service_account" "instance_sa" {
  account_id   = "compute-instance-sa"
  display_name = "Compute Instance Service Account"
}

# Grant permissions to service account
resource "google_project_iam_member" "instance_storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.instance_sa.email}"
}

resource "google_project_iam_member" "instance_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.instance_sa.email}"
}

# Create instance with service account
resource "google_compute_instance" "with_service_account" {
  name         = "instance-with-sa"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  # Attach service account
  service_account {
    email  = google_service_account.instance_sa.email

    # OAuth scopes (use cloud-platform for all APIs)
    scopes = ["cloud-platform"]

    # Or specific scopes:
    # scopes = [
    #   "https://www.googleapis.com/auth/devstorage.read_only",
    #   "https://www.googleapis.com/auth/logging.write",
    # ]
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    # Instance can now access Cloud Storage using service account
    gsutil cp gs://my-bucket/config.json /etc/myapp/config.json

    # Write logs to Cloud Logging
    gcloud logging write my-log "Application started" --severity=INFO
  EOF
}
```

---

## Static IP Addresses

### Reserve and Assign Static IP

```hcl
# Reserve a static external IP address
resource "google_compute_address" "static_ip" {
  name   = "web-server-static-ip"
  region = var.region

  # Type: EXTERNAL or INTERNAL
  address_type = "EXTERNAL"

  # Tier: PREMIUM or STANDARD
  network_tier = "PREMIUM"
}

# Create instance with static IP
resource "google_compute_instance" "with_static_ip" {
  name         = "web-server-static"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"

    # Assign the static IP
    access_config {
      nat_ip       = google_compute_address.static_ip.address
      network_tier = "PREMIUM"
    }
  }
}

# Output the static IP
output "static_ip_address" {
  description = "Static IP address of the web server"
  value       = google_compute_address.static_ip.address
}
```

---

## Instance Templates

### Create Reusable Templates

```hcl
# Instance template for creating identical VMs
resource "google_compute_instance_template" "web_template" {
  name_prefix = "web-template-"
  description = "Template for web server instances"

  # Machine configuration
  machine_type = "e2-medium"

  # Tags for firewall rules
  tags = ["web-server", "http-server", "https-server"]

  # Labels
  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  # Boot disk
  disk {
    source_image = "debian-cloud/debian-11"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-balanced"
  }

  # Network configuration
  network_interface {
    network = "default"

    # Ephemeral external IP
    access_config {
      network_tier = "PREMIUM"
    }
  }

  # Service account
  service_account {
    email  = google_service_account.instance_sa.email
    scopes = ["cloud-platform"]
  }

  # Metadata and startup script
  metadata = {
    enable-oslogin = "TRUE"
  }

  metadata_startup_script = file("${path.module}/scripts/web-server-startup.sh")

  # Lifecycle
  lifecycle {
    create_before_destroy = true
  }
}
```

### Create Instance from Template

```hcl
# Single instance from template
resource "google_compute_instance_from_template" "web_instance" {
  name = "web-instance-1"
  zone = var.zone

  source_instance_template = google_compute_instance_template.web_template.id

  # Override template settings if needed
  machine_type = "e2-small"  # Different from template

  # Override labels
  labels = {
    override = "true"
  }
}
```

---

## Managed Instance Groups

### Create Auto-Scaling Instance Group

```hcl
# Health check for instance group
resource "google_compute_health_check" "web_health_check" {
  name               = "web-health-check"
  check_interval_sec = 10
  timeout_sec        = 5
  healthy_threshold  = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

# Managed instance group
resource "google_compute_instance_group_manager" "web_group" {
  name               = "web-instance-group"
  base_instance_name = "web"
  zone               = var.zone

  # Use instance template
  version {
    instance_template = google_compute_instance_template.web_template.id
  }

  # Target size (number of instances)
  target_size = 3

  # Named ports for load balancer
  named_port {
    name = "http"
    port = 80
  }

  named_port {
    name = "https"
    port = 443
  }

  # Auto-healing
  auto_healing_policies {
    health_check      = google_compute_health_check.web_health_check.id
    initial_delay_sec = 300  # Wait 5 minutes before checking
  }

  # Update policy
  update_policy {
    type                         = "PROACTIVE"
    minimal_action               = "REPLACE"
    max_surge_fixed              = 3
    max_unavailable_fixed        = 0
    replacement_method           = "SUBSTITUTE"
  }
}

# Autoscaler
resource "google_compute_autoscaler" "web_autoscaler" {
  name   = "web-autoscaler"
  zone   = var.zone
  target = google_compute_instance_group_manager.web_group.id

  autoscaling_policy {
    max_replicas    = 10
    min_replicas    = 2
    cooldown_period = 60

    # Scale based on CPU utilization
    cpu_utilization {
      target = 0.7  # 70% CPU target
    }

    # Scale based on load balancer utilization
    load_balancing_utilization {
      target = 0.8
    }
  }
}
```

---

## Preemptible and Spot VMs

### Cost Optimization with Preemptible VMs

```hcl
# Preemptible instance (up to 90% cost savings)
resource "google_compute_instance" "preemptible" {
  name         = "preemptible-instance"
  machine_type = "e2-medium"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  # Make instance preemptible
  scheduling {
    preemptible       = true
    automatic_restart = false  # Cannot auto-restart

    # Termination action
    on_host_maintenance = "TERMINATE"
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    # Handle preemption gracefully
    # Instance can be terminated with 30 seconds notice

    # Set up shutdown script
    cat > /opt/shutdown-script.sh <<'SHUTDOWN'
    #!/bin/bash
    # Save state before termination
    echo "Instance being preempted at $(date)" >> /var/log/preemption.log
    # Flush logs, save state, etc.
    SHUTDOWN

    chmod +x /opt/shutdown-script.sh
  EOF
}

# Spot VM (newer preemptible alternative)
resource "google_compute_instance" "spot" {
  name         = "spot-instance"
  machine_type = "e2-medium"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  # Spot VM configuration
  scheduling {
    preemptible                 = true
    automatic_restart           = false
    provisioning_model          = "SPOT"
    instance_termination_action = "STOP"  # or "DELETE"
  }
}
```

---

## SSH Access and Security

### Configure OS Login (Recommended)

```hcl
# Enable OS Login at project level
resource "google_compute_project_metadata" "os_login" {
  metadata = {
    enable-oslogin = "TRUE"
  }
}

# Grant OS Login permission to user
resource "google_project_iam_member" "os_login_user" {
  project = var.project_id
  role    = "roles/compute.osLogin"
  member  = "user:admin@example.com"
}

# Admin access (sudo privileges)
resource "google_project_iam_member" "os_login_admin" {
  project = var.project_id
  role    = "roles/compute.osAdminLogin"
  member  = "user:sysadmin@example.com"
}

# Instance with OS Login
resource "google_compute_instance" "os_login_instance" {
  name         = "os-login-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  metadata = {
    enable-oslogin = "TRUE"
  }
}
```

### SSH via gcloud

```bash
# SSH using OS Login
gcloud compute ssh INSTANCE_NAME --zone=ZONE

# SSH as specific user
gcloud compute ssh INSTANCE_NAME --zone=ZONE --ssh-flag="-l username"

# Run command via SSH
gcloud compute ssh INSTANCE_NAME --zone=ZONE --command="sudo systemctl status nginx"

# Copy files
gcloud compute scp LOCAL_FILE INSTANCE_NAME:/remote/path --zone=ZONE
gcloud compute scp INSTANCE_NAME:/remote/file LOCAL_PATH --zone=ZONE
```

### Firewall Rules for SSH

```hcl
# Allow SSH from specific IPs
resource "google_compute_firewall" "allow_ssh" {
  name    = "allow-ssh-from-office"
  network = "default"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Source IP ranges (your office/VPN)
  source_ranges = [
    "203.0.113.0/24",  # Office IP range
    "198.51.100.0/24", # VPN IP range
  ]

  # Apply to instances with this tag
  target_tags = ["ssh-allowed"]
}

# Instance with SSH access
resource "google_compute_instance" "ssh_instance" {
  name         = "ssh-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
    access_config {}
  }

  # Add tag to allow SSH
  tags = ["ssh-allowed"]

  metadata = {
    enable-oslogin = "TRUE"
  }
}
```

---

## Best Practices for DevSecOps

### 1. Use Dedicated Service Accounts

```hcl
# Bad: Using default compute service account
resource "google_compute_instance" "bad_example" {
  name         = "bad-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  # Default service account has excessive permissions
  service_account {
    email  = "PROJECT_NUMBER-compute@developer.gserviceaccount.com"
    scopes = ["cloud-platform"]
  }
}

# Good: Dedicated service account with minimal permissions
resource "google_compute_instance" "good_example" {
  name         = "good-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  service_account {
    email  = google_service_account.instance_sa.email
    scopes = ["cloud-platform"]
  }
}
```

### 2. Use OS Login Instead of SSH Keys

```hcl
# Bad: Embedding SSH keys in metadata
resource "google_compute_instance" "bad_ssh" {
  name         = "bad-ssh-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  metadata = {
    ssh-keys = "user:ssh-rsa AAAAB3NzaC1..."  # Avoid this
  }
}

# Good: Use OS Login
resource "google_compute_instance" "good_ssh" {
  name         = "good-ssh-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  metadata = {
    enable-oslogin = "TRUE"
  }
}
```

### 3. Use Startup Scripts from Cloud Storage

```hcl
# Store startup script in Cloud Storage
resource "google_storage_bucket_object" "startup_script" {
  name   = "scripts/startup.sh"
  bucket = google_storage_bucket.scripts.name
  source = "${path.module}/scripts/startup.sh"
}

# Reference from Cloud Storage
resource "google_compute_instance" "secure_startup" {
  name         = "secure-startup"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  metadata = {
    startup-script-url = "gs://${google_storage_bucket.scripts.name}/scripts/startup.sh"
  }

  service_account {
    email  = google_service_account.instance_sa.email
    scopes = ["cloud-platform"]
  }
}
```

### 4. Enable Shielded VM

```hcl
# Shielded VM with enhanced security
resource "google_compute_instance" "shielded" {
  name         = "shielded-instance"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      # Shielded VM compatible image
      image = "gce-uefi-images/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  # Shielded VM configuration
  shielded_instance_config {
    enable_secure_boot          = true
    enable_vtpm                 = true
    enable_integrity_monitoring = true
  }
}
```

### 5. Use Secrets Manager for Sensitive Data

```hcl
# Store secret in Secret Manager
resource "google_secret_manager_secret" "api_key" {
  secret_id = "api-key"

  replication {
    automatic = true
  }
}

resource "google_secret_manager_secret_version" "api_key_version" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = var.api_key  # From Terraform variables, not hardcoded
}

# Grant access to service account
resource "google_secret_manager_secret_iam_member" "instance_access" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.instance_sa.email}"
}

# Retrieve secret in startup script
resource "google_compute_instance" "with_secrets" {
  name         = "instance-with-secrets"
  machine_type = "e2-micro"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  service_account {
    email  = google_service_account.instance_sa.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    # Retrieve secret from Secret Manager
    API_KEY=$(gcloud secrets versions access latest --secret="api-key")

    # Use in application configuration
    echo "API_KEY=$API_KEY" > /etc/myapp/.env
    chmod 600 /etc/myapp/.env
  EOF
}
```

---

## Hands-On Exercise

### Exercise: Deploy a Web Server

Create a complete web server setup with:
1. Instance template for web servers
2. Managed instance group with 3 instances
3. Health check on port 80
4. Auto-scaling based on CPU (50-80%)
5. Static IP address
6. Firewall rules for HTTP/HTTPS
7. Startup script that installs nginx

**Bonus:**
- Add SSL certificate
- Configure logging to Cloud Logging
- Implement auto-healing

---

## Summary

You've learned:
- Creating and configuring Compute Engine instances
- Using machine types and understanding cost optimization
- Implementing startup scripts and metadata
- Creating instance templates and managed instance groups
- Configuring SSH access with OS Login
- Implementing security best practices

### Key Takeaways

1. Use appropriate machine types for your workload
2. Leverage preemptible/spot VMs for cost savings
3. Use OS Login for SSH access management
4. Implement startup scripts from Cloud Storage
5. Use dedicated service accounts with minimal permissions
6. Enable Shielded VM for enhanced security

---

## Next Steps

In **Lesson 4: Cloud Storage**, you'll learn about:
- Creating and managing Cloud Storage buckets
- Implementing IAM for bucket access
- Versioning and lifecycle policies
- Static website hosting
- CDN integration

---

## Additional Resources

- [Compute Engine Documentation](https://cloud.google.com/compute/docs)
- [Machine Types](https://cloud.google.com/compute/docs/machine-types)
- [Instance Templates](https://cloud.google.com/compute/docs/instance-templates)
- [OS Login](https://cloud.google.com/compute/docs/oslogin)
- [Shielded VMs](https://cloud.google.com/compute/shielded-vm/docs/shielded-vm)

---

**Previous:** [Lesson 2: GCP Basics](02-gcp-basics.md)
**Next:** [Lesson 4: Cloud Storage](04-cloud-storage.md)
