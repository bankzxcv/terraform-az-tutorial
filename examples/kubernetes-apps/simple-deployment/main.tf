# Terraform configuration for deploying simple demo app to Kubernetes
# This can be used with AKS, EKS, or GKE

terraform {
  required_version = ">= 1.0"

  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

# Provider configuration
# Uncomment the appropriate provider configuration for your cloud

# For local Kubernetes (minikube, kind, etc.)
provider "kubernetes" {
  config_path = "~/.kube/config"
}

# For AKS
# provider "kubernetes" {
#   host                   = var.cluster_endpoint
#   client_certificate     = base64decode(var.client_certificate)
#   client_key             = base64decode(var.client_key)
#   cluster_ca_certificate = base64decode(var.cluster_ca_certificate)
# }

# For EKS
# provider "kubernetes" {
#   host                   = var.cluster_endpoint
#   cluster_ca_certificate = base64decode(var.cluster_ca_certificate)
#   token                  = var.cluster_auth_token
# }

# For GKE
# provider "kubernetes" {
#   host                   = var.cluster_endpoint
#   token                  = var.cluster_auth_token
#   cluster_ca_certificate = base64decode(var.cluster_ca_certificate)
# }

# Namespace
resource "kubernetes_namespace" "demo_app" {
  metadata {
    name = var.namespace

    labels = {
      app         = "demo-app"
      environment = var.environment
      managed-by  = "terraform"
    }
  }
}

# Service Account
resource "kubernetes_service_account" "demo_app" {
  metadata {
    name      = "demo-app"
    namespace = kubernetes_namespace.demo_app.metadata[0].name

    labels = {
      app = "demo-app"
    }
  }

  automount_service_account_token = false
}

# ConfigMap
resource "kubernetes_config_map" "demo_app" {
  metadata {
    name      = "demo-app-config"
    namespace = kubernetes_namespace.demo_app.metadata[0].name

    labels = {
      app = "demo-app"
    }
  }

  data = {
    APP_ENV     = var.environment
    APP_VERSION = var.app_version
    LOG_LEVEL   = var.log_level
  }
}

# Deployment
resource "kubernetes_deployment" "demo_app" {
  metadata {
    name      = "demo-app"
    namespace = kubernetes_namespace.demo_app.metadata[0].name

    labels = {
      app     = "demo-app"
      version = "v1"
    }
  }

  spec {
    replicas = var.replicas

    revision_history_limit = 10

    strategy {
      type = "RollingUpdate"

      rolling_update {
        max_surge       = "1"
        max_unavailable = "0"
      }
    }

    selector {
      match_labels = {
        app = "demo-app"
      }
    }

    template {
      metadata {
        labels = {
          app     = "demo-app"
          version = "v1"
        }

        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "8080"
          "prometheus.io/path"   = "/metrics"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.demo_app.metadata[0].name

        # Pod security context
        security_context {
          run_as_non_root = true
          run_as_user     = 1000
          fs_group        = 1000

          seccomp_profile {
            type = "RuntimeDefault"
          }
        }

        # Anti-affinity
        affinity {
          pod_anti_affinity {
            preferred_during_scheduling_ignored_during_execution {
              weight = 100

              pod_affinity_term {
                label_selector {
                  match_expressions {
                    key      = "app"
                    operator = "In"
                    values   = ["demo-app"]
                  }
                }

                topology_key = "kubernetes.io/hostname"
              }
            }
          }
        }

        container {
          name              = "app"
          image             = "${var.image_registry}/${var.image_name}:${var.app_version}"
          image_pull_policy = "IfNotPresent"

          port {
            name           = "http"
            container_port = 8080
            protocol       = "TCP"
          }

          env {
            name  = "PORT"
            value = "8080"
          }

          env {
            name  = "NODE_ENV"
            value = "production"
          }

          # Environment from ConfigMap
          env_from {
            config_map_ref {
              name = kubernetes_config_map.demo_app.metadata[0].name
            }
          }

          # Resources
          resources {
            limits = {
              cpu    = var.cpu_limit
              memory = var.memory_limit
            }
            requests = {
              cpu    = var.cpu_request
              memory = var.memory_request
            }
          }

          # Liveness probe
          liveness_probe {
            http_get {
              path   = "/health"
              port   = "http"
              scheme = "HTTP"
            }

            initial_delay_seconds = 30
            period_seconds        = 10
            timeout_seconds       = 5
            success_threshold     = 1
            failure_threshold     = 3
          }

          # Readiness probe
          readiness_probe {
            http_get {
              path   = "/ready"
              port   = "http"
              scheme = "HTTP"
            }

            initial_delay_seconds = 5
            period_seconds        = 5
            timeout_seconds       = 3
            success_threshold     = 1
            failure_threshold     = 3
          }

          # Startup probe
          startup_probe {
            http_get {
              path = "/health"
              port = "http"
            }

            initial_delay_seconds = 0
            period_seconds        = 5
            timeout_seconds       = 3
            success_threshold     = 1
            failure_threshold     = 12
          }

          # Container security context
          security_context {
            run_as_non_root            = true
            run_as_user                = 1000
            allow_privilege_escalation = false
            read_only_root_filesystem  = true

            capabilities {
              drop = ["ALL"]
            }
          }

          # Volume mounts
          volume_mount {
            name       = "tmp"
            mount_path = "/tmp"
          }

          volume_mount {
            name       = "cache"
            mount_path = "/app/.cache"
          }
        }

        # Volumes
        volume {
          name = "tmp"
          empty_dir {}
        }

        volume {
          name = "cache"
          empty_dir {}
        }

        termination_grace_period_seconds = 30
      }
    }
  }
}

# Service
resource "kubernetes_service" "demo_app" {
  metadata {
    name      = "demo-app"
    namespace = kubernetes_namespace.demo_app.metadata[0].name

    labels = {
      app = "demo-app"
    }
  }

  spec {
    type = "ClusterIP"

    selector = {
      app = "demo-app"
    }

    port {
      name        = "http"
      port        = 80
      target_port = "http"
      protocol    = "TCP"
    }

    session_affinity = "None"
  }
}

# LoadBalancer Service (optional)
resource "kubernetes_service" "demo_app_lb" {
  count = var.create_load_balancer ? 1 : 0

  metadata {
    name      = "demo-app-lb"
    namespace = kubernetes_namespace.demo_app.metadata[0].name

    labels = {
      app = "demo-app"
    }

    annotations = var.load_balancer_annotations
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "demo-app"
    }

    port {
      name        = "http"
      port        = 80
      target_port = "http"
      protocol    = "TCP"
    }

    external_traffic_policy = "Local"
    health_check_node_port  = 30100
  }
}

# Horizontal Pod Autoscaler
resource "kubernetes_horizontal_pod_autoscaler_v2" "demo_app" {
  metadata {
    name      = "demo-app"
    namespace = kubernetes_namespace.demo_app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.demo_app.metadata[0].name
    }

    min_replicas = var.min_replicas
    max_replicas = var.max_replicas

    metric {
      type = "Resource"
      resource {
        name = "cpu"
        target {
          type                = "Utilization"
          average_utilization = var.target_cpu_utilization
        }
      }
    }

    metric {
      type = "Resource"
      resource {
        name = "memory"
        target {
          type                = "Utilization"
          average_utilization = var.target_memory_utilization
        }
      }
    }

    behavior {
      scale_down {
        stabilization_window_seconds = 300

        policy {
          type          = "Percent"
          value         = 50
          period_seconds = 60
        }
      }

      scale_up {
        stabilization_window_seconds = 0

        policy {
          type          = "Percent"
          value         = 100
          period_seconds = 30
        }

        policy {
          type          = "Pods"
          value         = 4
          period_seconds = 30
        }

        select_policy = "Max"
      }
    }
  }
}

# Pod Disruption Budget
resource "kubernetes_pod_disruption_budget_v1" "demo_app" {
  metadata {
    name      = "demo-app"
    namespace = kubernetes_namespace.demo_app.metadata[0].name
  }

  spec {
    min_available = 2

    selector {
      match_labels = {
        app = "demo-app"
      }
    }
  }
}
