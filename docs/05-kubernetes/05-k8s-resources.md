# Deploying Kubernetes Resources with Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Deploy advanced Kubernetes resources using Terraform
- Manage StatefulSets for stateful applications
- Configure persistent storage with PersistentVolumes and PersistentVolumeClaims
- Deploy Jobs and CronJobs for batch processing
- Implement DaemonSets for node-level services
- Use Custom Resource Definitions (CRDs)
- Apply resource quotas and limit ranges
- Implement pod disruption budgets for high availability

## Prerequisites

- Completed Lessons 1-4: Kubernetes basics and cloud provider setup
- Access to a Kubernetes cluster (AKS, EKS, or GKE)
- Terraform 1.0+ installed
- kubectl CLI installed

## Time Estimate

75-90 minutes

---

## 1. StatefulSets for Stateful Applications

### Understanding StatefulSets

StatefulSets are designed for applications that require:
- Stable, unique network identifiers
- Stable, persistent storage
- Ordered, graceful deployment and scaling
- Ordered, automated rolling updates

### Deploy a StatefulSet (PostgreSQL Example)

```hcl
# terraform/statefulset.tf

# Namespace for database
resource "kubernetes_namespace" "database" {
  metadata {
    name = "database"

    labels = {
      app        = "database"
      managed-by = "terraform"
    }
  }
}

# Storage Class for dynamic provisioning
resource "kubernetes_storage_class" "fast" {
  metadata {
    name = "fast-ssd"
  }

  storage_provisioner = "kubernetes.io/gce-pd"  # Change based on provider
  reclaim_policy      = "Retain"
  volume_binding_mode = "WaitForFirstConsumer"

  parameters = {
    type             = "pd-ssd"
    replication-type = "regional-pd"
  }

  allowed_topologies {
    match_label_expressions {
      key = "topology.kubernetes.io/zone"
      values = [
        "us-central1-a",
        "us-central1-b",
        "us-central1-c"
      ]
    }
  }
}

# ConfigMap for PostgreSQL configuration
resource "kubernetes_config_map" "postgres_config" {
  metadata {
    name      = "postgres-config"
    namespace = kubernetes_namespace.database.metadata[0].name
  }

  data = {
    "postgresql.conf" = <<-EOT
      max_connections = 100
      shared_buffers = 256MB
      effective_cache_size = 1GB
      maintenance_work_mem = 64MB
      checkpoint_completion_target = 0.9
      wal_buffers = 16MB
      default_statistics_target = 100
      random_page_cost = 1.1
      effective_io_concurrency = 200
      work_mem = 2621kB
      min_wal_size = 1GB
      max_wal_size = 4GB
    EOT
  }
}

# Secret for PostgreSQL credentials
resource "kubernetes_secret" "postgres_credentials" {
  metadata {
    name      = "postgres-credentials"
    namespace = kubernetes_namespace.database.metadata[0].name
  }

  type = "Opaque"

  data = {
    postgres-password = base64encode(var.postgres_password)
    replication-password = base64encode(var.replication_password)
  }
}

# Headless Service for StatefulSet
resource "kubernetes_service" "postgres_headless" {
  metadata {
    name      = "postgres-headless"
    namespace = kubernetes_namespace.database.metadata[0].name

    labels = {
      app = "postgres"
    }
  }

  spec {
    cluster_ip = "None"  # Headless service
    selector = {
      app = "postgres"
    }

    port {
      name        = "postgresql"
      port        = 5432
      target_port = 5432
      protocol    = "TCP"
    }
  }
}

# Service for read-write access
resource "kubernetes_service" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.database.metadata[0].name

    labels = {
      app = "postgres"
    }
  }

  spec {
    selector = {
      app = "postgres"
    }

    port {
      name        = "postgresql"
      port        = 5432
      target_port = 5432
      protocol    = "TCP"
    }

    type = "ClusterIP"
  }
}

# StatefulSet for PostgreSQL
resource "kubernetes_stateful_set" "postgres" {
  metadata {
    name      = "postgres"
    namespace = kubernetes_namespace.database.metadata[0].name

    labels = {
      app = "postgres"
    }
  }

  spec {
    service_name = kubernetes_service.postgres_headless.metadata[0].name
    replicas     = 3

    selector {
      match_labels = {
        app = "postgres"
      }
    }

    # Update strategy
    update_strategy {
      type = "RollingUpdate"

      rolling_update {
        partition = 0
      }
    }

    # Pod Management Policy
    pod_management_policy = "OrderedReady"

    template {
      metadata {
        labels = {
          app = "postgres"
        }
      }

      spec {
        # Init container to set permissions
        init_container {
          name  = "set-permissions"
          image = "busybox:1.36"

          command = ["sh", "-c", "chmod 700 /var/lib/postgresql/data || true"]

          volume_mount {
            name       = "postgres-data"
            mount_path = "/var/lib/postgresql/data"
          }

          security_context {
            run_as_user = 0
          }
        }

        container {
          name  = "postgres"
          image = "postgres:15-alpine"

          env {
            name  = "POSTGRES_DB"
            value = "myapp"
          }

          env {
            name = "POSTGRES_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.postgres_credentials.metadata[0].name
                key  = "postgres-password"
              }
            }
          }

          env {
            name  = "PGDATA"
            value = "/var/lib/postgresql/data/pgdata"
          }

          # Ports
          port {
            name           = "postgresql"
            container_port = 5432
            protocol       = "TCP"
          }

          # Resource limits
          resources {
            limits = {
              cpu    = "2000m"
              memory = "2Gi"
            }
            requests = {
              cpu    = "1000m"
              memory = "1Gi"
            }
          }

          # Volume mounts
          volume_mount {
            name       = "postgres-data"
            mount_path = "/var/lib/postgresql/data"
          }

          volume_mount {
            name       = "config"
            mount_path = "/etc/postgresql/postgresql.conf"
            sub_path   = "postgresql.conf"
          }

          # Liveness probe
          liveness_probe {
            exec {
              command = ["pg_isready", "-U", "postgres"]
            }
            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            failure_threshold     = 6
          }

          # Readiness probe
          readiness_probe {
            exec {
              command = ["pg_isready", "-U", "postgres"]
            }
            initial_delay_seconds = 5
            period_seconds        = 5
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          # Security context
          security_context {
            run_as_user                = 999  # postgres user
            run_as_non_root            = true
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
            }
          }
        }

        # Volumes
        volume {
          name = "config"

          config_map {
            name = kubernetes_config_map.postgres_config.metadata[0].name
          }
        }

        # Security context for pod
        security_context {
          fs_group = 999
        }
      }
    }

    # Volume Claim Templates (PersistentVolumeClaims)
    volume_claim_template {
      metadata {
        name = "postgres-data"
      }

      spec {
        access_modes       = ["ReadWriteOnce"]
        storage_class_name = kubernetes_storage_class.fast.metadata[0].name

        resources {
          requests = {
            storage = "100Gi"
          }
        }
      }
    }
  }
}

# Pod Disruption Budget
resource "kubernetes_pod_disruption_budget_v1" "postgres" {
  metadata {
    name      = "postgres-pdb"
    namespace = kubernetes_namespace.database.metadata[0].name
  }

  spec {
    min_available = 2

    selector {
      match_labels = {
        app = "postgres"
      }
    }
  }
}
```

---

## 2. Jobs and CronJobs

### One-time Job

```hcl
# terraform/job.tf

# Namespace for batch jobs
resource "kubernetes_namespace" "batch" {
  metadata {
    name = "batch"

    labels = {
      purpose    = "batch-processing"
      managed-by = "terraform"
    }
  }
}

# Job for database migration
resource "kubernetes_job_v1" "db_migration" {
  metadata {
    name      = "db-migration"
    namespace = kubernetes_namespace.batch.metadata[0].name

    labels = {
      app  = "migration"
      type = "job"
    }
  }

  spec {
    # Keep job history for 7 days
    ttl_seconds_after_finished = 604800

    # Number of retries
    backoff_limit = 3

    # Completions and parallelism
    completions = 1
    parallelism = 1

    template {
      metadata {
        labels = {
          app  = "migration"
          type = "job"
        }
      }

      spec {
        restart_policy = "OnFailure"

        container {
          name  = "migrate"
          image = "migrate/migrate:v4.16.2"

          args = [
            "-path", "/migrations",
            "-database", "postgres://postgres:${var.postgres_password}@postgres.database:5432/myapp?sslmode=disable",
            "up"
          ]

          resources {
            limits = {
              cpu    = "500m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "250m"
              memory = "256Mi"
            }
          }

          volume_mount {
            name       = "migrations"
            mount_path = "/migrations"
          }

          security_context {
            run_as_non_root            = true
            run_as_user                = 1000
            allow_privilege_escalation = false
            read_only_root_filesystem  = true

            capabilities {
              drop = ["ALL"]
            }
          }
        }

        volume {
          name = "migrations"

          config_map {
            name = kubernetes_config_map.migrations.metadata[0].name
          }
        }
      }
    }
  }

  wait_for_completion = false
}

# ConfigMap with migration files
resource "kubernetes_config_map" "migrations" {
  metadata {
    name      = "migrations"
    namespace = kubernetes_namespace.batch.metadata[0].name
  }

  data = {
    "001_create_users.up.sql" = <<-SQL
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    SQL

    "002_create_posts.up.sql" = <<-SQL
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    SQL
  }
}
```

### CronJob for Scheduled Tasks

```hcl
# terraform/cronjob.tf

# CronJob for database backup
resource "kubernetes_cron_job_v1" "db_backup" {
  metadata {
    name      = "db-backup"
    namespace = kubernetes_namespace.batch.metadata[0].name

    labels = {
      app  = "backup"
      type = "cronjob"
    }
  }

  spec {
    # Run daily at 2 AM
    schedule = "0 2 * * *"

    # Timezone (Kubernetes 1.24+)
    time_zone = "America/New_York"

    # Keep last 3 successful and 1 failed job
    successful_jobs_history_limit = 3
    failed_jobs_history_limit     = 1

    # Concurrency policy (Allow, Forbid, Replace)
    concurrency_policy = "Forbid"

    # Starting deadline in seconds
    starting_deadline_seconds = 300

    job_template {
      metadata {
        labels = {
          app  = "backup"
          type = "cronjob"
        }
      }

      spec {
        ttl_seconds_after_finished = 86400  # 24 hours
        backoff_limit              = 2

        template {
          metadata {
            labels = {
              app  = "backup"
              type = "cronjob"
            }
          }

          spec {
            restart_policy = "OnFailure"

            # Service account with S3/GCS permissions
            service_account_name = kubernetes_service_account.backup.metadata[0].name

            container {
              name  = "backup"
              image = "postgres:15-alpine"

              command = ["/bin/sh", "-c"]
              args = [
                <<-BASH
                  set -e
                  BACKUP_FILE="/tmp/backup-$(date +%Y%m%d-%H%M%S).sql.gz"
                  pg_dump -h postgres.database -U postgres myapp | gzip > $BACKUP_FILE
                  aws s3 cp $BACKUP_FILE s3://${var.backup_bucket}/postgres/
                  echo "Backup completed: $BACKUP_FILE"
                BASH
              ]

              env {
                name = "PGPASSWORD"
                value_from {
                  secret_key_ref {
                    name = kubernetes_secret.postgres_credentials.metadata[0].name
                    key  = "postgres-password"
                  }
                }
              }

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

              security_context {
                run_as_non_root            = true
                run_as_user                = 999
                allow_privilege_escalation = false

                capabilities {
                  drop = ["ALL"]
                }
              }
            }
          }
        }
      }
    }
  }
}

# Service account for backup job
resource "kubernetes_service_account" "backup" {
  metadata {
    name      = "backup-sa"
    namespace = kubernetes_namespace.batch.metadata[0].name

    # For AWS (IRSA)
    annotations = {
      "eks.amazonaws.com/role-arn" = var.backup_role_arn
    }

    # For GCP (Workload Identity)
    # annotations = {
    #   "iam.gke.io/gcp-service-account" = var.backup_gsa
    # }
  }
}
```

---

## 3. DaemonSets

### Deploy Node-Level Service

```hcl
# terraform/daemonset.tf

# DaemonSet for log collector
resource "kubernetes_daemonset" "log_collector" {
  metadata {
    name      = "log-collector"
    namespace = "kube-system"

    labels = {
      app  = "log-collector"
      tier = "monitoring"
    }
  }

  spec {
    selector {
      match_labels = {
        app = "log-collector"
      }
    }

    # Update strategy
    update_strategy {
      type = "RollingUpdate"

      rolling_update {
        max_unavailable = 1
      }
    }

    template {
      metadata {
        labels = {
          app = "log-collector"
        }
      }

      spec {
        # Tolerate all taints to run on all nodes
        toleration {
          key      = "node-role.kubernetes.io/control-plane"
          operator = "Exists"
          effect   = "NoSchedule"
        }

        toleration {
          key      = "node-role.kubernetes.io/master"
          operator = "Exists"
          effect   = "NoSchedule"
        }

        # Host networking
        host_network = true
        dns_policy   = "ClusterFirstWithHostNet"

        # Priority for system daemons
        priority_class_name = "system-node-critical"

        service_account_name = kubernetes_service_account.log_collector.metadata[0].name

        container {
          name  = "fluentd"
          image = "fluent/fluentd-kubernetes-daemonset:v1.16-debian-cloudwatch-1"

          env {
            name = "NODE_NAME"
            value_from {
              field_ref {
                field_path = "spec.nodeName"
              }
            }
          }

          env {
            name = "POD_IP"
            value_from {
              field_ref {
                field_path = "status.podIP"
              }
            }
          }

          resources {
            limits = {
              cpu    = "200m"
              memory = "512Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "256Mi"
            }
          }

          # Volume mounts for log collection
          volume_mount {
            name       = "varlog"
            mount_path = "/var/log"
            read_only  = true
          }

          volume_mount {
            name       = "containers"
            mount_path = "/var/lib/docker/containers"
            read_only  = true
          }

          security_context {
            run_as_user                = 0
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
              add  = ["DAC_READ_SEARCH"]
            }
          }
        }

        # Volumes from host
        volume {
          name = "varlog"

          host_path {
            path = "/var/log"
          }
        }

        volume {
          name = "containers"

          host_path {
            path = "/var/lib/docker/containers"
          }
        }
      }
    }
  }
}

# Service account for log collector
resource "kubernetes_service_account" "log_collector" {
  metadata {
    name      = "log-collector"
    namespace = "kube-system"
  }
}

# ClusterRole for log collector
resource "kubernetes_cluster_role" "log_collector" {
  metadata {
    name = "log-collector"
  }

  rule {
    api_groups = [""]
    resources  = ["pods", "namespaces"]
    verbs      = ["get", "list", "watch"]
  }
}

# ClusterRoleBinding
resource "kubernetes_cluster_role_binding" "log_collector" {
  metadata {
    name = "log-collector"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.log_collector.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.log_collector.metadata[0].name
    namespace = "kube-system"
  }
}
```

---

## 4. Resource Quotas and Limit Ranges

### Resource Quotas

```hcl
# terraform/resource-quota.tf

# Resource Quota for namespace
resource "kubernetes_resource_quota_v1" "app_quota" {
  metadata {
    name      = "app-quota"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    hard = {
      # Compute resources
      "requests.cpu"    = "10"
      "requests.memory" = "20Gi"
      "limits.cpu"      = "20"
      "limits.memory"   = "40Gi"

      # Storage
      "requests.storage"                                = "100Gi"
      "persistentvolumeclaims"                          = "10"
      "fast-ssd.storageclass.storage.k8s.io/requests.storage" = "50Gi"

      # Object counts
      "pods"                   = "50"
      "services"               = "10"
      "services.loadbalancers" = "2"
      "configmaps"             = "20"
      "secrets"                = "20"
      "replicationcontrollers" = "0"
    }

    # Scope selectors
    scope_selector {
      match_expression {
        scope_name = "PriorityClass"
        operator   = "In"
        values     = ["high", "medium"]
      }
    }
  }
}

# Limit Range for namespace
resource "kubernetes_limit_range_v1" "app_limits" {
  metadata {
    name      = "app-limits"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    # Container limits
    limit {
      type = "Container"

      default = {
        cpu    = "500m"
        memory = "512Mi"
      }

      default_request = {
        cpu    = "100m"
        memory = "128Mi"
      }

      max = {
        cpu    = "2000m"
        memory = "4Gi"
      }

      min = {
        cpu    = "50m"
        memory = "64Mi"
      }
    }

    # Pod limits
    limit {
      type = "Pod"

      max = {
        cpu    = "4000m"
        memory = "8Gi"
      }
    }

    # PVC limits
    limit {
      type = "PersistentVolumeClaim"

      min = {
        storage = "1Gi"
      }

      max = {
        storage = "500Gi"
      }
    }
  }
}
```

---

## 5. Priority Classes

### Define Priority Classes

```hcl
# terraform/priority-classes.tf

# High priority class
resource "kubernetes_priority_class_v1" "high" {
  metadata {
    name = "high-priority"
  }

  value          = 1000
  description    = "High priority class for critical workloads"
  global_default = false
}

# Medium priority class
resource "kubernetes_priority_class_v1" "medium" {
  metadata {
    name = "medium-priority"
  }

  value          = 500
  description    = "Medium priority class for normal workloads"
  global_default = true
}

# Low priority class
resource "kubernetes_priority_class_v1" "low" {
  metadata {
    name = "low-priority"
  }

  value          = 100
  description    = "Low priority class for batch jobs"
  global_default = false
}

# Use priority class in deployment
resource "kubernetes_deployment" "critical_app" {
  metadata {
    name      = "critical-app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "critical-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "critical-app"
        }
      }

      spec {
        # Set priority class
        priority_class_name = kubernetes_priority_class_v1.high.metadata[0].name

        container {
          name  = "app"
          image = "myapp:1.0.0"

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
        }
      }
    }
  }
}
```

---

## 6. Horizontal Pod Autoscaler v2

### Advanced HPA Configuration

```hcl
# terraform/hpa-advanced.tf

resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "app-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.app.metadata[0].name
    }

    min_replicas = 3
    max_replicas = 50

    # CPU metric
    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = 70
        }
      }
    }

    # Memory metric
    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = 80
        }
      }
    }

    # Custom metric from Prometheus
    metric {
      type = "Pods"
      pods {
        metric {
          name = "http_requests_per_second"
        }
        target {
          type          = "AverageValue"
          average_value = "1000"
        }
      }
    }

    # External metric
    metric {
      type = "External"
      external {
        metric {
          name = "pubsub_queue_depth"
          selector {
            match_labels = {
              queue_name = "myapp-queue"
            }
          }
        }
        target {
          type  = "AverageValue"
          average_value = "100"
        }
      }
    }

    # Scaling behavior
    behavior {
      scale_down {
        stabilization_window_seconds = 300
        select_policy               = "Min"

        policy {
          type          = "Percent"
          value         = 50
          period_seconds = 60
        }

        policy {
          type          = "Pods"
          value         = 5
          period_seconds = 60
        }
      }

      scale_up {
        stabilization_window_seconds = 0
        select_policy               = "Max"

        policy {
          type          = "Percent"
          value         = 100
          period_seconds = 30
        }

        policy {
          type          = "Pods"
          value         = 10
          period_seconds = 30
        }
      }
    }
  }
}
```

---

## 7. Variables

```hcl
# terraform/variables.tf

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
}

variable "replication_password" {
  description = "PostgreSQL replication password"
  type        = string
  sensitive   = true
}

variable "backup_bucket" {
  description = "S3/GCS bucket for backups"
  type        = string
}

variable "backup_role_arn" {
  description = "IAM role ARN for backup job (AWS)"
  type        = string
  default     = ""
}

variable "backup_gsa" {
  description = "Google service account for backup (GCP)"
  type        = string
  default     = ""
}
```

---

## Summary

You've learned how to:
- Deploy StatefulSets for stateful applications
- Create and manage Jobs and CronJobs
- Use DaemonSets for node-level services
- Implement resource quotas and limit ranges
- Configure priority classes
- Create advanced HPA configurations

### Next Steps

- **Lesson 6**: Helm charts with Terraform
- **Lesson 7**: Kubernetes networking deep dive
- **Lesson 8**: Kubernetes security best practices

---

**Estimated Completion Time**: 75-90 minutes

**Difficulty Level**: Intermediate to Advanced
