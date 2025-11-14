# Helm Charts with Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand Helm and its benefits for Kubernetes deployments
- Use Terraform Helm provider to deploy charts
- Create custom Helm charts and deploy them with Terraform
- Manage Helm releases lifecycle with Terraform
- Deploy popular applications using Helm (Prometheus, Grafana, Ingress controllers)
- Customize Helm values using Terraform
- Implement GitOps practices with Helm and Terraform

## Prerequisites

- Completed previous Kubernetes lessons
- Access to a Kubernetes cluster
- Terraform 1.0+ installed
- kubectl CLI installed
- Basic understanding of Helm concepts

## Time Estimate

60-75 minutes

---

## 1. Understanding Helm

### What is Helm?

Helm is a package manager for Kubernetes that:
- Packages Kubernetes manifests into reusable charts
- Manages complex deployments with dependencies
- Provides version control and rollback capabilities
- Simplifies configuration with templating

### Helm Architecture

```
┌─────────────────────────────────────┐
│         Terraform                   │
│  ┌───────────────────────────────┐  │
│  │    Helm Provider              │  │
│  │  - helm_release resource      │  │
│  │  - Values configuration       │  │
│  └───────────────────────────────┘  │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│      Helm Chart Repository          │
│  - charts/                          │
│  - Chart.yaml                       │
│  - values.yaml                      │
│  - templates/                       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│    Kubernetes Cluster               │
│  - Deployed resources               │
│  - Release metadata                 │
└─────────────────────────────────────┘
```

---

## 2. Terraform Helm Provider Setup

### Configure Helm Provider

```hcl
# terraform/main.tf

terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

# Kubernetes provider configuration
provider "kubernetes" {
  config_path = "~/.kube/config"
  # Or use cloud-specific authentication
}

# Helm provider configuration
provider "helm" {
  kubernetes {
    config_path = "~/.kube/config"
  }

  # Helm repository credentials (if needed)
  # registry {
  #   url      = "oci://registry.example.com"
  #   username = var.registry_username
  #   password = var.registry_password
  # }
}
```

---

## 3. Deploying Charts with Helm Provider

### Example 1: NGINX Ingress Controller

```hcl
# terraform/ingress-nginx.tf

# Create namespace
resource "kubernetes_namespace" "ingress_nginx" {
  metadata {
    name = "ingress-nginx"

    labels = {
      app        = "ingress-nginx"
      managed-by = "terraform"
    }
  }
}

# Deploy NGINX Ingress Controller
resource "helm_release" "ingress_nginx" {
  name       = "ingress-nginx"
  repository = "https://kubernetes.github.io/ingress-nginx"
  chart      = "ingress-nginx"
  version    = "4.8.3"
  namespace  = kubernetes_namespace.ingress_nginx.metadata[0].name

  # Wait for deployment
  wait          = true
  wait_for_jobs = true
  timeout       = 600

  # Custom values
  values = [
    yamlencode({
      controller = {
        replicaCount = 3

        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }

        # Service configuration
        service = {
          type = "LoadBalancer"
          annotations = {
            # AWS
            "service.beta.kubernetes.io/aws-load-balancer-type" = "nlb"
            # Azure
            "service.beta.kubernetes.io/azure-load-balancer-internal" = "false"
            # GCP
            "cloud.google.com/load-balancer-type" = "External"
          }
        }

        # Metrics
        metrics = {
          enabled = true
          serviceMonitor = {
            enabled = true
          }
        }

        # Pod security
        podSecurityContext = {
          runAsNonRoot = true
          runAsUser    = 101
          fsGroup      = 101
        }

        # Container security
        containerSecurityContext = {
          allowPrivilegeEscalation = false
          capabilities = {
            drop = ["ALL"]
            add  = ["NET_BIND_SERVICE"]
          }
        }

        # Autoscaling
        autoscaling = {
          enabled     = true
          minReplicas = 3
          maxReplicas = 10
          targetCPUUtilizationPercentage    = 70
          targetMemoryUtilizationPercentage = 80
        }
      }
    })
  ]

  # Set individual values (alternative to values block)
  set {
    name  = "controller.metrics.enabled"
    value = "true"
  }

  set {
    name  = "controller.podAnnotations.prometheus\\.io/scrape"
    value = "true"
  }

  depends_on = [kubernetes_namespace.ingress_nginx]
}

# Output LoadBalancer IP
output "ingress_nginx_lb_ip" {
  description = "NGINX Ingress LoadBalancer IP"
  value       = helm_release.ingress_nginx.status
}
```

### Example 2: cert-manager for TLS

```hcl
# terraform/cert-manager.tf

resource "kubernetes_namespace" "cert_manager" {
  metadata {
    name = "cert-manager"

    labels = {
      app        = "cert-manager"
      managed-by = "terraform"
    }
  }
}

# Install CRDs first
resource "helm_release" "cert_manager" {
  name       = "cert-manager"
  repository = "https://charts.jetstack.io"
  chart      = "cert-manager"
  version    = "v1.13.2"
  namespace  = kubernetes_namespace.cert_manager.metadata[0].name

  set {
    name  = "installCRDs"
    value = "true"
  }

  values = [
    yamlencode({
      global = {
        leaderElection = {
          namespace = "cert-manager"
        }
      }

      prometheus = {
        enabled = true
        servicemonitor = {
          enabled = true
        }
      }

      resources = {
        limits = {
          cpu    = "100m"
          memory = "128Mi"
        }
        requests = {
          cpu    = "50m"
          memory = "64Mi"
        }
      }

      securityContext = {
        runAsNonRoot = true
        runAsUser    = 1000
      }
    })
  ]

  depends_on = [kubernetes_namespace.cert_manager]
}

# ClusterIssuer for Let's Encrypt
resource "kubectl_manifest" "letsencrypt_prod" {
  yaml_body = <<-YAML
    apiVersion: cert-manager.io/v1
    kind: ClusterIssuer
    metadata:
      name: letsencrypt-prod
    spec:
      acme:
        server: https://acme-v02.api.letsencrypt.org/directory
        email: ${var.letsencrypt_email}
        privateKeySecretRef:
          name: letsencrypt-prod
        solvers:
        - http01:
            ingress:
              class: nginx
  YAML

  depends_on = [helm_release.cert_manager]
}
```

---

## 4. Monitoring Stack with Helm

### Prometheus and Grafana

```hcl
# terraform/monitoring.tf

resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = "monitoring"

    labels = {
      app        = "monitoring"
      managed-by = "terraform"
    }
  }
}

# kube-prometheus-stack (Prometheus + Grafana + Alertmanager)
resource "helm_release" "kube_prometheus_stack" {
  name       = "kube-prometheus-stack"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  version    = "54.0.0"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      # Prometheus configuration
      prometheus = {
        prometheusSpec = {
          retention    = "30d"
          replicas     = 2
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "fast-ssd"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "100Gi"
                  }
                }
              }
            }
          }

          resources = {
            limits = {
              cpu    = "2000m"
              memory = "4Gi"
            }
            requests = {
              cpu    = "1000m"
              memory = "2Gi"
            }
          }

          # Service monitors
          serviceMonitorSelectorNilUsesHelmValues = false
          podMonitorSelectorNilUsesHelmValues     = false
        }

        # Ingress for Prometheus
        ingress = {
          enabled = true
          annotations = {
            "kubernetes.io/ingress.class"                = "nginx"
            "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
            "nginx.ingress.kubernetes.io/auth-type"     = "basic"
            "nginx.ingress.kubernetes.io/auth-secret"   = "prometheus-basic-auth"
          }
          hosts = ["prometheus.${var.domain}"]
          tls = [{
            secretName = "prometheus-tls"
            hosts      = ["prometheus.${var.domain}"]
          }]
        }
      }

      # Grafana configuration
      grafana = {
        enabled      = true
        adminPassword = var.grafana_admin_password

        persistence = {
          enabled          = true
          storageClassName = "fast-ssd"
          size             = "10Gi"
        }

        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }

        # Grafana dashboards
        dashboardProviders = {
          "dashboardproviders.yaml" = {
            apiVersion = 1
            providers = [{
              name      = "default"
              orgId     = 1
              folder    = ""
              type      = "file"
              disableDeletion = false
              editable  = true
              options = {
                path = "/var/lib/grafana/dashboards/default"
              }
            }]
          }
        }

        # Pre-loaded dashboards
        dashboards = {
          default = {
            kubernetes-cluster = {
              gnetId    = 7249
              revision  = 1
              datasource = "Prometheus"
            }
            node-exporter = {
              gnetId    = 1860
              revision  = 27
              datasource = "Prometheus"
            }
          }
        }

        # Ingress for Grafana
        ingress = {
          enabled = true
          annotations = {
            "kubernetes.io/ingress.class"     = "nginx"
            "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
          }
          hosts = ["grafana.${var.domain}"]
          tls = [{
            secretName = "grafana-tls"
            hosts      = ["grafana.${var.domain}"]
          }]
        }
      }

      # Alertmanager configuration
      alertmanager = {
        alertmanagerSpec = {
          replicas = 2

          storage = {
            volumeClaimTemplate = {
              spec = {
                storageClassName = "fast-ssd"
                accessModes      = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "10Gi"
                  }
                }
              }
            }
          }

          resources = {
            limits = {
              cpu    = "200m"
              memory = "256Mi"
            }
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
          }
        }

        # Configure alerting
        config = {
          global = {
            resolve_timeout = "5m"
          }

          route = {
            group_by        = ["alertname", "cluster"]
            group_wait      = "10s"
            group_interval  = "10s"
            repeat_interval = "12h"
            receiver        = "default"

            routes = [{
              match = {
                alertname = "Watchdog"
              }
              receiver = "null"
            }]
          }

          receivers = [
            {
              name = "null"
            },
            {
              name = "default"
              slack_configs = [{
                api_url  = var.slack_webhook_url
                channel  = "#alerts"
                username = "Alertmanager"
                title    = "{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}"
                text     = "{{ range .Alerts }}{{ .Annotations.description }}{{ end }}"
              }]
            }
          ]
        }
      }

      # Node exporter
      nodeExporter = {
        enabled = true
      }

      # kube-state-metrics
      kubeStateMetrics = {
        enabled = true
      }
    })
  ]

  depends_on = [
    kubernetes_namespace.monitoring,
    helm_release.ingress_nginx
  ]
}
```

---

## 5. Creating Custom Helm Charts

### Custom Application Chart

```hcl
# terraform/custom-chart.tf

# Deploy custom Helm chart from local directory
resource "helm_release" "myapp" {
  name      = "myapp"
  chart     = "${path.module}/charts/myapp"
  namespace = kubernetes_namespace.app.metadata[0].name

  # Override values
  values = [
    yamlencode({
      replicaCount = 3

      image = {
        repository = "${var.container_registry}/myapp"
        tag        = var.app_version
        pullPolicy = "IfNotPresent"
      }

      service = {
        type = "ClusterIP"
        port = 80
      }

      ingress = {
        enabled = true
        className = "nginx"
        annotations = {
          "cert-manager.io/cluster-issuer" = "letsencrypt-prod"
        }
        hosts = [{
          host = "myapp.${var.domain}"
          paths = [{
            path     = "/"
            pathType = "Prefix"
          }]
        }]
        tls = [{
          secretName = "myapp-tls"
          hosts      = ["myapp.${var.domain}"]
        }]
      }

      resources = {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
        requests = {
          cpu    = "500m"
          memory = "512Mi"
        }
      }

      autoscaling = {
        enabled                        = true
        minReplicas                    = 3
        maxReplicas                    = 20
        targetCPUUtilizationPercentage = 70
      }

      # Database configuration
      database = {
        host     = "postgres.database"
        port     = 5432
        name     = "myapp"
        user     = "myapp"
        password = var.db_password
      }

      # Environment-specific config
      env = {
        APP_ENV   = var.environment
        LOG_LEVEL = var.log_level
      }
    })
  ]

  # Recreate pods on upgrade
  recreate_pods = false

  # Atomic upgrade (rollback on failure)
  atomic = true

  # Cleanup on fail
  cleanup_on_fail = true

  # Force update
  force_update = false

  # Lint before install
  lint = true

  # Maximum history to keep
  max_history = 10

  depends_on = [
    kubernetes_namespace.app,
    helm_release.ingress_nginx,
    helm_release.cert_manager
  ]
}

# Deploy from OCI registry
resource "helm_release" "myapp_oci" {
  name       = "myapp-oci"
  repository = "oci://${var.registry_url}"
  chart      = "myapp"
  version    = "1.0.0"
  namespace  = kubernetes_namespace.app.metadata[0].name

  # OCI credentials
  repository_username = var.registry_username
  repository_password = var.registry_password
}
```

### Chart Directory Structure

```bash
# Create chart directory structure
charts/myapp/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── hpa.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── _helpers.tpl
│   └── NOTES.txt
└── .helmignore
```

---

## 6. Managing Helm Releases

### Upgrade and Rollback

```hcl
# terraform/helm-lifecycle.tf

# Check release status
data "helm_release" "myapp" {
  name      = "myapp"
  namespace = kubernetes_namespace.app.metadata[0].name

  depends_on = [helm_release.myapp]
}

# Output release information
output "myapp_release_status" {
  description = "Helm release status"
  value = {
    name      = data.helm_release.myapp.name
    namespace = data.helm_release.myapp.namespace
    version   = data.helm_release.myapp.version
    status    = data.helm_release.myapp.status
  }
}

# Upgrade strategy
resource "helm_release" "myapp_with_lifecycle" {
  name  = "myapp"
  chart = "${path.module}/charts/myapp"

  # Upgrade configuration
  atomic              = true   # Rollback on failure
  cleanup_on_fail     = true   # Delete resources on failure
  replace             = false  # Replace existing release
  reset_values        = false  # Reset to chart defaults
  reuse_values        = false  # Reuse previous release values
  wait                = true   # Wait for resources to be ready
  wait_for_jobs       = true   # Wait for jobs to complete
  timeout             = 300    # Timeout in seconds
  max_history         = 10     # Keep last 10 releases
  skip_crds           = false  # Skip CRD installation
  disable_webhooks    = false  # Disable webhooks
  verify              = false  # Verify package signature
  create_namespace    = false  # Create namespace if not exists
  dependency_update   = true   # Update dependencies

  # Lifecycle hooks
  lifecycle {
    create_before_destroy = true

    # Prevent accidental deletion
    prevent_destroy = false
  }
}
```

---

## 7. Common Helm Charts

### Database: PostgreSQL

```hcl
# terraform/postgresql.tf

resource "helm_release" "postgresql" {
  name       = "postgresql"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "postgresql"
  version    = "13.2.24"
  namespace  = kubernetes_namespace.database.metadata[0].name

  values = [
    yamlencode({
      auth = {
        postgresPassword = var.postgres_password
        database         = "myapp"
        username         = "myapp"
        password         = var.db_password
      }

      primary = {
        persistence = {
          enabled       = true
          storageClass  = "fast-ssd"
          size          = "100Gi"
        }

        resources = {
          limits = {
            cpu    = "2000m"
            memory = "2Gi"
          }
          requests = {
            cpu    = "1000m"
            memory = "1Gi"
          }
        }
      }

      metrics = {
        enabled = true
        serviceMonitor = {
          enabled = true
        }
      }

      backup = {
        enabled  = true
        cronjob = {
          schedule         = "0 2 * * *"
          storage = {
            size = "100Gi"
          }
        }
      }
    })
  ]
}
```

### Cache: Redis

```hcl
# terraform/redis.tf

resource "helm_release" "redis" {
  name       = "redis"
  repository = "https://charts.bitnami.com/bitnami"
  chart      = "redis"
  version    = "18.4.0"
  namespace  = kubernetes_namespace.app.metadata[0].name

  values = [
    yamlencode({
      architecture = "replication"  # or "standalone"

      auth = {
        enabled  = true
        password = var.redis_password
      }

      master = {
        persistence = {
          enabled      = true
          storageClass = "fast-ssd"
          size         = "20Gi"
        }

        resources = {
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

      replica = {
        replicaCount = 2

        persistence = {
          enabled      = true
          storageClass = "fast-ssd"
          size         = "20Gi"
        }

        resources = {
          limits = {
            cpu    = "500m"
            memory = "512Mi"
          }
          requests = {
            cpu    = "250m"
            memory = "256Mi"
          }
        }
      }

      metrics = {
        enabled = true
        serviceMonitor = {
          enabled = true
        }
      }
    })
  ]
}
```

---

## 8. Variables

```hcl
# terraform/variables.tf

variable "domain" {
  description = "Base domain for applications"
  type        = string
}

variable "letsencrypt_email" {
  description = "Email for Let's Encrypt certificates"
  type        = string
}

variable "grafana_admin_password" {
  description = "Grafana admin password"
  type        = string
  sensitive   = true
}

variable "slack_webhook_url" {
  description = "Slack webhook URL for alerts"
  type        = string
  sensitive   = true
}

variable "container_registry" {
  description = "Container registry URL"
  type        = string
}

variable "app_version" {
  description = "Application version"
  type        = string
  default     = "1.0.0"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"
}

variable "postgres_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "Application database password"
  type        = string
  sensitive   = true
}

variable "redis_password" {
  description = "Redis password"
  type        = string
  sensitive   = true
}

variable "registry_url" {
  description = "OCI registry URL"
  type        = string
  default     = ""
}

variable "registry_username" {
  description = "Registry username"
  type        = string
  default     = ""
  sensitive   = true
}

variable "registry_password" {
  description = "Registry password"
  type        = string
  default     = ""
  sensitive   = true
}
```

---

## Summary

You've learned how to:
- Configure and use the Terraform Helm provider
- Deploy popular Helm charts (NGINX Ingress, cert-manager, Prometheus, Grafana)
- Create and deploy custom Helm charts
- Manage Helm release lifecycle with Terraform
- Configure monitoring and alerting
- Deploy databases and caches using Helm

### Next Steps

- **Lesson 7**: Kubernetes networking deep dive
- **Lesson 8**: Kubernetes security best practices
- Explore Helmfile for managing multiple releases
- Implement GitOps with ArgoCD or Flux

---

**Estimated Completion Time**: 60-75 minutes

**Difficulty Level**: Intermediate
