# Lesson 7: Cloud SQL - Managed Relational Databases

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and manage Cloud SQL instances with Terraform
- Configure private IP and secure database access
- Implement automated backups and point-in-time recovery
- Set up high availability and read replicas
- Configure database users and permissions
- Implement security best practices for databases

## Prerequisites

- Completed Lessons 1-6
- Cloud SQL Admin API and Service Networking API enabled
- Understanding of relational databases
- VPC network configured (from Lesson 6)

## Time Estimate

**90-120 minutes**

---

## What is Cloud SQL?

Cloud SQL is a fully-managed relational database service for MySQL, PostgreSQL, and SQL Server.

**Key Features:**
- Automated backups and point-in-time recovery
- High availability with automatic failover
- Read replicas for scaling reads
- Automatic storage increase
- Encryption at rest and in transit
- Integration with VPC for private IP
- Automatic maintenance and updates

---

## Basic PostgreSQL Instance

### Create Your First Cloud SQL Instance

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Generate random password
resource "random_password" "db_password" {
  length  = 16
  special = true
}

# Store password in Secret Manager
resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-root-password"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password_version" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# Cloud SQL PostgreSQL instance
resource "google_sql_database_instance" "postgres" {
  name             = "${var.environment}-postgres-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  # Delete protection
  deletion_protection = true  # Set to false for testing

  settings {
    # Machine tier
    tier = "db-f1-micro"  # Free tier eligible

    # Disk configuration
    disk_type = "PD_SSD"
    disk_size = 10  # GB
    disk_autoresize       = true
    disk_autoresize_limit = 100

    # Availability type
    availability_type = "ZONAL"  # or "REGIONAL" for HA

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "03:00"  # 3 AM UTC
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 30
        retention_unit   = "COUNT"
      }
    }

    # IP configuration
    ip_configuration {
      ipv4_enabled    = true  # Public IP (use false for private only)
      require_ssl     = true

      # Authorized networks (if using public IP)
      authorized_networks {
        name  = "office-network"
        value = "203.0.113.0/24"  # Your office IP range
      }
    }

    # Maintenance window
    maintenance_window {
      day          = 7  # Sunday
      hour         = 3  # 3 AM
      update_track = "stable"
    }

    # Database flags
    database_flags {
      name  = "max_connections"
      value = "100"
    }

    database_flags {
      name  = "log_checkpoints"
      value = "on"
    }
  }

  # Deletion protection
  lifecycle {
    prevent_destroy = true  # Extra safety
  }
}

# Create database
resource "google_sql_database" "database" {
  name     = var.database_name
  instance = google_sql_database_instance.postgres.name
}

# Create database user
resource "google_sql_user" "users" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}

# Outputs
output "instance_connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.postgres.connection_name
}

output "instance_ip_address" {
  description = "IP address of the instance"
  value       = google_sql_database_instance.postgres.public_ip_address
}

output "database_password_secret" {
  description = "Secret Manager secret containing database password"
  value       = google_secret_manager_secret.db_password.id
}
```

---

## Private IP Configuration

### Secure Database with Private IP

```hcl
# VPC network (from Lesson 6)
resource "google_compute_network" "vpc_network" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false
}

# Reserve IP range for private service connection
resource "google_compute_global_address" "private_ip_address" {
  name          = "private-ip-address"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc_network.id
}

# Create private connection
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_address.name]
}

# Cloud SQL instance with private IP
resource "google_sql_database_instance" "postgres_private" {
  name             = "${var.environment}-postgres-private"
  database_version = "POSTGRES_15"
  region           = var.region

  depends_on = [google_service_networking_connection.private_vpc_connection]

  settings {
    tier = "db-custom-2-7680"  # 2 vCPU, 7.68 GB RAM

    # Private IP configuration
    ip_configuration {
      ipv4_enabled    = false  # No public IP
      private_network = google_compute_network.vpc_network.id
      require_ssl     = false  # SSL not required for private IP
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    availability_type = "REGIONAL"  # High availability

    database_flags {
      name  = "cloudsql.iam_authentication"
      value = "on"
    }
  }
}

output "private_ip_address" {
  description = "Private IP address of Cloud SQL instance"
  value       = google_sql_database_instance.postgres_private.private_ip_address
}
```

---

## High Availability Configuration

### Configure HA with Automatic Failover

```hcl
# High availability PostgreSQL instance
resource "google_sql_database_instance" "postgres_ha" {
  name             = "${var.environment}-postgres-ha"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-4-15360"  # 4 vCPU, 15 GB RAM

    # High availability (creates standby in different zone)
    availability_type = "REGIONAL"

    # Disk configuration
    disk_type             = "PD_SSD"
    disk_size             = 100
    disk_autoresize       = true
    disk_autoresize_limit = 500

    # Backup configuration
    backup_configuration {
      enabled                        = true
      start_time                     = "02:00"
      point_in_time_recovery_enabled = true
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 90
        retention_unit   = "COUNT"
      }
    }

    # IP configuration
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
    }

    # Insights configuration
    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
    }

    # Location preference (preferred zone)
    location_preference {
      zone = "${var.region}-a"
    }
  }
}
```

---

## Read Replicas

### Scale Read Operations

```hcl
# Read replica in the same region
resource "google_sql_database_instance" "read_replica" {
  name                 = "${var.environment}-postgres-replica"
  master_instance_name = google_sql_database_instance.postgres_ha.name
  region               = var.region
  database_version     = "POSTGRES_15"

  replica_configuration {
    failover_target = false  # Don't promote to master on failover
  }

  settings {
    tier = "db-custom-2-7680"  # Can be different from master

    # Disk configuration
    disk_type       = "PD_SSD"
    disk_size       = 50
    disk_autoresize = true

    # IP configuration
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
    }

    # Insights
    insights_config {
      query_insights_enabled = true
    }

    # Crash-safe replication
    crash_safe_replication = true
  }
}

# Read replica in different region (cross-region)
resource "google_sql_database_instance" "read_replica_us_east" {
  name                 = "${var.environment}-postgres-replica-us-east"
  master_instance_name = google_sql_database_instance.postgres_ha.name
  region               = "us-east1"
  database_version     = "POSTGRES_15"

  replica_configuration {
    failover_target = false
  }

  settings {
    tier = "db-custom-2-7680"

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
    }
  }
}
```

---

## Database Users and IAM Authentication

### Create Users with IAM Authentication

```hcl
# Enable Cloud SQL Admin API
resource "google_project_service" "sqladmin" {
  service = "sqladmin.googleapis.com"
}

# Service account for application
resource "google_service_account" "app_sa" {
  account_id   = "app-cloudsql-sa"
  display_name = "Application Cloud SQL Service Account"
}

# Grant Cloud SQL Client role
resource "google_project_iam_member" "app_cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}

# IAM database user
resource "google_sql_user" "iam_user" {
  name     = google_service_account.app_sa.email
  instance = google_sql_database_instance.postgres_ha.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}

# Built-in PostgreSQL user (with password)
resource "google_sql_user" "postgres_user" {
  name     = "appuser"
  instance = google_sql_database_instance.postgres_ha.name
  password = random_password.db_password.result
}

# Output connection details
output "connection_name" {
  description = "Connection name for Cloud SQL Proxy"
  value       = google_sql_database_instance.postgres_ha.connection_name
}
```

---

## MySQL Instance

### Create MySQL Database

```hcl
# MySQL instance
resource "google_sql_database_instance" "mysql" {
  name             = "${var.environment}-mysql-instance"
  database_version = "MYSQL_8_0"
  region           = var.region

  settings {
    tier = "db-n1-standard-2"

    backup_configuration {
      enabled            = true
      start_time         = "03:00"
      binary_log_enabled = true

      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc_network.id
    }

    # MySQL-specific flags
    database_flags {
      name  = "character_set_server"
      value = "utf8mb4"
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    database_flags {
      name  = "slow_query_log"
      value = "on"
    }

    database_flags {
      name  = "long_query_time"
      value = "2"
    }
  }
}

# MySQL database
resource "google_sql_database" "mysql_database" {
  name     = "myapp"
  instance = google_sql_database_instance.mysql.name
  charset  = "utf8mb4"
  collation = "utf8mb4_unicode_ci"
}

# MySQL user
resource "google_sql_user" "mysql_user" {
  name     = "appuser"
  instance = google_sql_database_instance.mysql.name
  password = random_password.db_password.result
  host     = "%"  # Allow from any host within VPC
}
```

---

## Connection Methods

### Cloud SQL Proxy

```bash
# Download Cloud SQL Proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 -O cloud_sql_proxy
chmod +x cloud_sql_proxy

# Run proxy (using service account)
./cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432 \
  -credential_file=/path/to/service-account-key.json

# Connect to database
psql "host=127.0.0.1 port=5432 dbname=DATABASE user=USER"
```

### Private IP Connection

```hcl
# Compute instance that can connect to private Cloud SQL
resource "google_compute_instance" "app_server" {
  name         = "app-server"
  machine_type = "e2-medium"
  zone         = "${var.region}-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  # Same VPC as Cloud SQL
  network_interface {
    network    = google_compute_network.vpc_network.name
    subnetwork = google_compute_subnetwork.app_subnet.name
  }

  service_account {
    email  = google_service_account.app_sa.email
    scopes = ["cloud-platform"]
  }

  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y postgresql-client

    # Connect to Cloud SQL via private IP
    PGPASSWORD='${random_password.db_password.result}' \
    psql -h ${google_sql_database_instance.postgres_private.private_ip_address} \
         -U ${var.db_user} \
         -d ${var.database_name} \
         -c "SELECT version();"
  EOF
}
```

---

## Automated Backups and Recovery

### Configure Backups

```hcl
# Instance with comprehensive backup configuration
resource "google_sql_database_instance" "backup_example" {
  name             = "${var.environment}-backup-example"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-2-7680"

    backup_configuration {
      # Enable automated backups
      enabled = true

      # Backup window (time when backups start)
      start_time = "02:00"  # 2 AM UTC

      # Point-in-time recovery
      point_in_time_recovery_enabled = true

      # Transaction log retention
      transaction_log_retention_days = 7

      # Backup retention
      backup_retention_settings {
        retained_backups = 90    # Keep 90 backups
        retention_unit   = "COUNT"
      }

      # Or time-based retention
      # backup_retention_settings {
      #   retention_unit   = "TIME_BASED"
      #   retained_backups = 30  # Days
      # }

      # Location (same region, multi-region, or custom)
      location = var.region
    }
  }
}
```

### Restore from Backup

```hcl
# Clone instance from backup
resource "google_sql_database_instance" "clone" {
  name             = "${var.environment}-postgres-clone"
  database_version = "POSTGRES_15"
  region           = var.region

  # Clone configuration
  clone {
    source_instance_name = google_sql_database_instance.postgres_ha.id

    # Optional: Point-in-time recovery
    point_in_time = "2024-01-15T10:30:00.000Z"
  }

  settings {
    tier = "db-custom-2-7680"
  }
}
```

---

## Monitoring and Alerting

### Set Up Monitoring

```hcl
# Monitoring metric for CPU utilization
resource "google_monitoring_alert_policy" "cloudsql_cpu" {
  display_name = "Cloud SQL - High CPU Utilization"
  combiner     = "OR"

  conditions {
    display_name = "CPU utilization above 80%"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/cpu/utilization\""
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

  alert_strategy {
    auto_close = "1800s"
  }
}

# Notification channel
resource "google_monitoring_notification_channel" "email" {
  display_name = "Email Notification"
  type         = "email"

  labels = {
    email_address = "alerts@example.com"
  }
}

# Monitoring for disk utilization
resource "google_monitoring_alert_policy" "cloudsql_disk" {
  display_name = "Cloud SQL - High Disk Utilization"
  combiner     = "OR"

  conditions {
    display_name = "Disk utilization above 90%"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND metric.type = \"cloudsql.googleapis.com/database/disk/utilization\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0.9

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MEAN"
      }
    }
  }

  notification_channels = [google_monitoring_notification_channel.email.id]
}
```

---

## Best Practices for DevSecOps

### 1. Use Private IP

```hcl
# Good: Private IP only
resource "google_sql_database_instance" "secure" {
  name             = "secure-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = "db-custom-2-7680"

    ip_configuration {
      ipv4_enabled    = false  # No public IP
      private_network = google_compute_network.vpc_network.id
    }
  }
}
```

### 2. Enable Automated Backups

```hcl
# Always enable backups with point-in-time recovery
backup_configuration {
  enabled                        = true
  point_in_time_recovery_enabled = true
  start_time                     = "03:00"
  transaction_log_retention_days = 7
}
```

### 3. Use IAM Authentication

```hcl
# Prefer IAM authentication over passwords
database_flags {
  name  = "cloudsql.iam_authentication"
  value = "on"
}

resource "google_sql_user" "iam_user" {
  name     = google_service_account.app_sa.email
  instance = google_sql_database_instance.postgres.name
  type     = "CLOUD_IAM_SERVICE_ACCOUNT"
}
```

### 4. Enable Encryption

```hcl
# Customer-managed encryption keys
resource "google_kms_key_ring" "keyring" {
  name     = "cloudsql-keyring"
  location = var.region
}

resource "google_kms_crypto_key" "key" {
  name     = "cloudsql-key"
  key_ring = google_kms_key_ring.keyring.id

  rotation_period = "7776000s"  # 90 days
}

resource "google_sql_database_instance" "encrypted" {
  name             = "encrypted-instance"
  database_version = "POSTGRES_15"
  region           = var.region

  encryption_key_name = google_kms_crypto_key.key.id

  settings {
    tier = "db-custom-2-7680"
  }
}
```

### 5. Use Deletion Protection

```hcl
resource "google_sql_database_instance" "protected" {
  name                = "protected-instance"
  database_version    = "POSTGRES_15"
  region              = var.region
  deletion_protection = true

  lifecycle {
    prevent_destroy = true
  }

  settings {
    tier = "db-custom-2-7680"
  }
}
```

---

## Summary

You've learned:
- Creating and configuring Cloud SQL instances
- Implementing private IP for secure access
- Setting up high availability and read replicas
- Configuring automated backups and recovery
- Managing database users with IAM authentication
- Implementing security and monitoring best practices

### Key Takeaways

1. Always use private IP for production databases
2. Enable automated backups with point-in-time recovery
3. Use regional availability for high availability
4. Implement read replicas for scaling reads
5. Use IAM authentication when possible
6. Enable deletion protection for production

---

## Next Steps

**Lesson 8: GCP Modules** - Creating reusable, production-ready Terraform modules

---

**Previous:** [Lesson 6: VPC Networking](06-vpc-networking.md)
**Next:** [Lesson 8: GCP Modules](08-gcp-modules.md)
