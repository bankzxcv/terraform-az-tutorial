# Kubernetes Networking Deep Dive

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand Kubernetes networking model and CNI plugins
- Configure Services (ClusterIP, NodePort, LoadBalancer)
- Implement Ingress controllers and routing rules
- Set up Network Policies for pod-to-pod communication
- Configure DNS and service discovery
- Implement service mesh basics (Istio/Linkerd)
- Configure external DNS and TLS certificates
- Troubleshoot common networking issues

## Prerequisites

- Completed previous Kubernetes lessons
- Access to a Kubernetes cluster
- Terraform 1.0+ installed
- kubectl CLI installed
- Basic understanding of networking concepts

## Time Estimate

75-90 minutes

---

## 1. Kubernetes Networking Model

### Core Concepts

Kubernetes networking follows these principles:
- **Every pod gets its own IP address**
- **Pods can communicate with each other without NAT**
- **Nodes can communicate with pods without NAT**
- **The IP a pod sees is the same as others see**

### Network Layers

```
┌─────────────────────────────────────────────┐
│         External Load Balancer              │ (Cloud Provider)
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│              Ingress                        │ (Layer 7 routing)
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│             Services                        │ (Layer 4 abstraction)
│  - ClusterIP, NodePort, LoadBalancer        │
└────────────────┬────────────────────────────┘
                 │
┌────────────────▼────────────────────────────┐
│               Pods                          │ (Container network)
│  - CNI Plugin (Calico, Cilium, etc.)        │
└─────────────────────────────────────────────┘
```

---

## 2. Service Types

### ClusterIP Service

```hcl
# terraform/service-clusterip.tf

# Internal service (default type)
resource "kubernetes_service" "backend" {
  metadata {
    name      = "backend-service"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app  = "backend"
      tier = "backend"
    }

    annotations = {
      "prometheus.io/scrape" = "true"
      "prometheus.io/port"   = "8080"
    }
  }

  spec {
    type = "ClusterIP"

    selector = {
      app  = "backend"
      tier = "backend"
    }

    # Session affinity
    session_affinity = "ClientIP"

    session_affinity_config {
      client_ip {
        timeout_seconds = 10800  # 3 hours
      }
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    port {
      name        = "grpc"
      port        = 9090
      target_port = 9090
      protocol    = "TCP"
    }

    # Internal traffic policy (Kubernetes 1.22+)
    internal_traffic_policy = "Local"  # or "Cluster"
  }
}

# Headless service (for StatefulSets)
resource "kubernetes_service" "backend_headless" {
  metadata {
    name      = "backend-headless"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    type       = "ClusterIP"
    cluster_ip = "None"  # Headless

    selector = {
      app = "backend"
    }

    port {
      port        = 80
      target_port = 8080
    }

    # Publish not ready addresses
    publish_not_ready_addresses = true
  }
}
```

### NodePort Service

```hcl
# terraform/service-nodeport.tf

resource "kubernetes_service" "frontend_nodeport" {
  metadata {
    name      = "frontend-nodeport"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    type = "NodePort"

    selector = {
      app = "frontend"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      node_port   = 30080  # Optional: 30000-32767
      protocol    = "TCP"
    }

    # External traffic policy
    external_traffic_policy = "Local"  # Preserves source IP
  }
}
```

### LoadBalancer Service

```hcl
# terraform/service-loadbalancer.tf

resource "kubernetes_service" "frontend_lb" {
  metadata {
    name      = "frontend-lb"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      # AWS
      "service.beta.kubernetes.io/aws-load-balancer-type"                              = "nlb"
      "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled" = "true"
      "service.beta.kubernetes.io/aws-load-balancer-scheme"                            = "internet-facing"

      # Azure
      "service.beta.kubernetes.io/azure-load-balancer-internal" = "false"
      "service.beta.kubernetes.io/azure-dns-label-name"         = "myapp"

      # GCP
      "cloud.google.com/load-balancer-type" = "External"
      "cloud.google.com/neg"                = jsonencode({ ingress = true })
    }
  }

  spec {
    type = "LoadBalancer"

    selector = {
      app = "frontend"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    port {
      name        = "https"
      port        = 443
      target_port = 8443
      protocol    = "TCP"
    }

    # Preserve client source IP
    external_traffic_policy = "Local"

    # Health check node port
    health_check_node_port = 30100

    # Load balancer source ranges (whitelist)
    load_balancer_source_ranges = [
      "0.0.0.0/0"  # Replace with specific IP ranges
    ]
  }
}

# Output LoadBalancer IP
output "frontend_lb_ip" {
  description = "Frontend LoadBalancer IP"
  value       = try(kubernetes_service.frontend_lb.status[0].load_balancer[0].ingress[0].ip, "pending")
}
```

---

## 3. Ingress Configuration

### Basic Ingress

```hcl
# terraform/ingress.tf

# Ingress for multiple hosts and paths
resource "kubernetes_ingress_v1" "app" {
  metadata {
    name      = "app-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                = "nginx"
      "cert-manager.io/cluster-issuer"            = "letsencrypt-prod"
      "nginx.ingress.kubernetes.io/ssl-redirect"  = "true"
      "nginx.ingress.kubernetes.io/force-ssl-redirect" = "true"

      # Rate limiting
      "nginx.ingress.kubernetes.io/limit-rps"      = "100"
      "nginx.ingress.kubernetes.io/limit-connections" = "10"

      # CORS
      "nginx.ingress.kubernetes.io/enable-cors"        = "true"
      "nginx.ingress.kubernetes.io/cors-allow-origin" = "*"

      # Request/Response modifications
      "nginx.ingress.kubernetes.io/proxy-body-size"       = "10m"
      "nginx.ingress.kubernetes.io/proxy-read-timeout"    = "600"
      "nginx.ingress.kubernetes.io/proxy-send-timeout"    = "600"
      "nginx.ingress.kubernetes.io/proxy-connect-timeout" = "60"

      # Security headers
      "nginx.ingress.kubernetes.io/configuration-snippet" = <<-EOT
        more_set_headers "X-Frame-Options: DENY";
        more_set_headers "X-Content-Type-Options: nosniff";
        more_set_headers "X-XSS-Protection: 1; mode=block";
      EOT
    }
  }

  spec {
    # Ingress class
    ingress_class_name = "nginx"

    # TLS configuration
    tls {
      hosts = [
        "app.${var.domain}",
        "api.${var.domain}"
      ]
      secret_name = "app-tls-cert"
    }

    # Rules
    rule {
      host = "app.${var.domain}"

      http {
        # Frontend path
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.frontend.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    rule {
      host = "api.${var.domain}"

      http {
        # API path
        path {
          path      = "/api"
          path_type = "Prefix"

          backend {
            service {
              name = kubernetes_service.backend.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }

        # Health check path
        path {
          path      = "/health"
          path_type = "Exact"

          backend {
            service {
              name = kubernetes_service.backend.metadata[0].name
              port {
                number = 80
              }
            }
          }
        }
      }
    }

    # Default backend (404 page)
    default_backend {
      service {
        name = kubernetes_service.default_backend.metadata[0].name
        port {
          number = 80
        }
      }
    }
  }
}
```

### Advanced Ingress with Authentication

```hcl
# terraform/ingress-auth.tf

# Basic auth secret
resource "kubernetes_secret" "basic_auth" {
  metadata {
    name      = "basic-auth"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "Opaque"

  data = {
    # Generate with: htpasswd -c auth admin
    auth = base64encode("admin:$apr1$...")
  }
}

# Ingress with basic auth
resource "kubernetes_ingress_v1" "admin" {
  metadata {
    name      = "admin-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                  = "nginx"
      "nginx.ingress.kubernetes.io/auth-type"        = "basic"
      "nginx.ingress.kubernetes.io/auth-secret"      = kubernetes_secret.basic_auth.metadata[0].name
      "nginx.ingress.kubernetes.io/auth-realm"       = "Authentication Required"
      "nginx.ingress.kubernetes.io/whitelist-source-range" = "10.0.0.0/8,172.16.0.0/12"
    }
  }

  spec {
    ingress_class_name = "nginx"

    tls {
      hosts       = ["admin.${var.domain}"]
      secret_name = "admin-tls-cert"
    }

    rule {
      host = "admin.${var.domain}"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "admin-ui"
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

# Ingress with OAuth2 proxy
resource "kubernetes_ingress_v1" "oauth2" {
  metadata {
    name      = "oauth2-ingress"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "kubernetes.io/ingress.class"                    = "nginx"
      "nginx.ingress.kubernetes.io/auth-url"           = "https://oauth2.${var.domain}/oauth2/auth"
      "nginx.ingress.kubernetes.io/auth-signin"        = "https://oauth2.${var.domain}/oauth2/start?rd=$escaped_request_uri"
      "nginx.ingress.kubernetes.io/auth-response-headers" = "X-Auth-Request-User,X-Auth-Request-Email"
    }
  }

  spec {
    ingress_class_name = "nginx"

    rule {
      host = "protected.${var.domain}"

      http {
        path {
          path      = "/"
          path_type = "Prefix"

          backend {
            service {
              name = "protected-app"
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
```

---

## 4. Network Policies

### Deny All Traffic

```hcl
# terraform/network-policy.tf

# Default deny all ingress and egress
resource "kubernetes_network_policy" "deny_all" {
  metadata {
    name      = "deny-all"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    pod_selector {}  # Applies to all pods

    policy_types = ["Ingress", "Egress"]

    # No ingress or egress rules = deny all
  }
}
```

### Allow Specific Traffic

```hcl
# terraform/network-policy-allow.tf

# Allow frontend to access backend
resource "kubernetes_network_policy" "frontend_to_backend" {
  metadata {
    name      = "frontend-to-backend"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        app  = "backend"
        tier = "backend"
      }
    }

    policy_types = ["Ingress", "Egress"]

    # Ingress rules
    ingress {
      from {
        pod_selector {
          match_labels = {
            app = "frontend"
          }
        }
      }

      from {
        namespace_selector {
          match_labels = {
            name = "ingress-nginx"
          }
        }
      }

      ports {
        protocol = "TCP"
        port     = "8080"
      }
    }

    # Egress rules
    egress {
      # Allow DNS
      to {
        namespace_selector {
          match_labels = {
            name = "kube-system"
          }
        }

        pod_selector {
          match_labels = {
            k8s-app = "kube-dns"
          }
        }
      }

      ports {
        protocol = "UDP"
        port     = "53"
      }
    }

    egress {
      # Allow database access
      to {
        pod_selector {
          match_labels = {
            app = "postgres"
          }
        }
      }

      ports {
        protocol = "TCP"
        port     = "5432"
      }
    }

    egress {
      # Allow external HTTPS
      to {
        ip_block {
          cidr = "0.0.0.0/0"
          except = [
            "169.254.169.254/32"  # Block metadata service
          ]
        }
      }

      ports {
        protocol = "TCP"
        port     = "443"
      }
    }
  }
}

# Namespace-level network policy
resource "kubernetes_network_policy" "cross_namespace" {
  metadata {
    name      = "allow-from-monitoring"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    pod_selector {}  # All pods in namespace

    policy_types = ["Ingress"]

    ingress {
      from {
        namespace_selector {
          match_labels = {
            name = "monitoring"
          }
        }
      }

      ports {
        protocol = "TCP"
        port     = "8080"  # Metrics port
      }
    }
  }
}
```

---

## 5. External DNS

### Deploy External DNS

```hcl
# terraform/external-dns.tf

resource "kubernetes_namespace" "external_dns" {
  metadata {
    name = "external-dns"
  }
}

# Service account for external-dns
resource "kubernetes_service_account" "external_dns" {
  metadata {
    name      = "external-dns"
    namespace = kubernetes_namespace.external_dns.metadata[0].name

    # For AWS (IRSA)
    annotations = {
      "eks.amazonaws.com/role-arn" = var.external_dns_role_arn
    }
  }
}

# ClusterRole
resource "kubernetes_cluster_role" "external_dns" {
  metadata {
    name = "external-dns"
  }

  rule {
    api_groups = [""]
    resources  = ["services", "endpoints", "pods"]
    verbs      = ["get", "watch", "list"]
  }

  rule {
    api_groups = ["extensions", "networking.k8s.io"]
    resources  = ["ingresses"]
    verbs      = ["get", "watch", "list"]
  }

  rule {
    api_groups = [""]
    resources  = ["nodes"]
    verbs      = ["list", "watch"]
  }
}

# ClusterRoleBinding
resource "kubernetes_cluster_role_binding" "external_dns" {
  metadata {
    name = "external-dns"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.external_dns.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.external_dns.metadata[0].name
    namespace = kubernetes_namespace.external_dns.metadata[0].name
  }
}

# Deployment
resource "kubernetes_deployment" "external_dns" {
  metadata {
    name      = "external-dns"
    namespace = kubernetes_namespace.external_dns.metadata[0].name
  }

  spec {
    replicas = 1

    strategy {
      type = "Recreate"
    }

    selector {
      match_labels = {
        app = "external-dns"
      }
    }

    template {
      metadata {
        labels = {
          app = "external-dns"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.external_dns.metadata[0].name

        container {
          name  = "external-dns"
          image = "registry.k8s.io/external-dns/external-dns:v0.14.0"

          args = [
            "--source=service",
            "--source=ingress",
            "--domain-filter=${var.domain}",
            "--provider=aws",  # or azure, google
            "--policy=upsert-only",
            "--registry=txt",
            "--txt-owner-id=${var.cluster_name}",
            "--interval=1m",
            "--log-level=info"
          ]

          resources {
            limits = {
              cpu    = "100m"
              memory = "128Mi"
            }
            requests = {
              cpu    = "50m"
              memory = "64Mi"
            }
          }

          security_context {
            run_as_non_root            = true
            run_as_user                = 65534
            allow_privilege_escalation = false
            read_only_root_filesystem  = true

            capabilities {
              drop = ["ALL"]
            }
          }
        }
      }
    }
  }
}
```

---

## 6. Service Mesh Basics (Istio)

### Install Istio

```hcl
# terraform/istio.tf

resource "kubernetes_namespace" "istio_system" {
  metadata {
    name = "istio-system"
  }
}

# Install Istio using Helm
resource "helm_release" "istio_base" {
  name       = "istio-base"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "base"
  version    = "1.20.0"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name
}

resource "helm_release" "istiod" {
  name       = "istiod"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "istiod"
  version    = "1.20.0"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name

  values = [
    yamlencode({
      pilot = {
        resources = {
          requests = {
            cpu    = "500m"
            memory = "2Gi"
          }
        }
      }

      global = {
        proxy = {
          resources = {
            requests = {
              cpu    = "100m"
              memory = "128Mi"
            }
            limits = {
              cpu    = "2000m"
              memory = "1Gi"
            }
          }
        }
      }
    })
  ]

  depends_on = [helm_release.istio_base]
}

# Istio Ingress Gateway
resource "helm_release" "istio_ingress" {
  name       = "istio-ingress"
  repository = "https://istio-release.storage.googleapis.com/charts"
  chart      = "gateway"
  version    = "1.20.0"
  namespace  = kubernetes_namespace.istio_system.metadata[0].name

  depends_on = [helm_release.istiod]
}

# Enable sidecar injection for namespace
resource "kubernetes_labels" "istio_injection" {
  api_version = "v1"
  kind        = "Namespace"

  metadata {
    name = kubernetes_namespace.app.metadata[0].name
  }

  labels = {
    "istio-injection" = "enabled"
  }

  depends_on = [helm_release.istiod]
}

# Virtual Service
resource "kubernetes_manifest" "virtual_service" {
  manifest = {
    apiVersion = "networking.istio.io/v1beta1"
    kind       = "VirtualService"
    metadata = {
      name      = "myapp"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      hosts = ["myapp.${var.domain}"]
      gateways = ["myapp-gateway"]
      http = [{
        match = [{
          uri = {
            prefix = "/"
          }
        }]
        route = [{
          destination = {
            host = "myapp-service"
            port = {
              number = 80
            }
          }
        }]
      }]
    }
  }

  depends_on = [helm_release.istiod]
}
```

---

## 7. Troubleshooting

### Common Commands

```bash
# Check service endpoints
kubectl get endpoints -n <namespace>

# Test DNS resolution
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup <service-name>

# Test connectivity
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- /bin/bash

# Inside pod:
curl http://service-name
nc -zv service-name port

# Check network policies
kubectl get networkpolicies -n <namespace>
kubectl describe networkpolicy <name> -n <namespace>

# Check ingress
kubectl get ingress -n <namespace>
kubectl describe ingress <name> -n <namespace>

# View ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/component=controller
```

---

## Summary

You've learned how to:
- Configure different Service types
- Set up Ingress with advanced features
- Implement Network Policies for security
- Deploy External DNS for automatic DNS management
- Understand service mesh basics with Istio
- Troubleshoot networking issues

### Next Steps

- **Lesson 8**: Kubernetes security best practices
- Explore advanced Istio features (traffic management, observability)
- Implement multi-cluster networking
- Set up VPN or private link for secure connectivity

---

**Estimated Completion Time**: 75-90 minutes

**Difficulty Level**: Intermediate to Advanced
