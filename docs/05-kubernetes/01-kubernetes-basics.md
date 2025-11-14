# Kubernetes Basics for Terraform Users

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand core Kubernetes concepts and architecture
- Explain how Terraform integrates with Kubernetes
- Deploy basic Kubernetes resources using Terraform
- Understand the relationship between Kubernetes manifests and Terraform configuration
- Apply DevSecOps principles to Kubernetes deployments

## Prerequisites

- Basic understanding of containers and Docker
- Familiarity with Terraform basics (providers, resources, modules)
- Access to a Kubernetes cluster (local or cloud-based)
- kubectl CLI installed
- Terraform 1.0+ installed

## Time Estimate

60-90 minutes

---

## 1. Kubernetes Architecture Overview

### Core Components

Kubernetes follows a master-worker architecture:

```
┌─────────────────────────────────────────┐
│           Control Plane                 │
│  ┌──────────┐  ┌──────────────────┐    │
│  │   API    │  │  Controller      │    │
│  │  Server  │  │  Manager         │    │
│  └──────────┘  └──────────────────┘    │
│  ┌──────────┐  ┌──────────────────┐    │
│  │   etcd   │  │   Scheduler      │    │
│  └──────────┘  └──────────────────┘    │
└─────────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    ▼                    ▼
┌─────────┐          ┌─────────┐
│  Node 1 │          │  Node 2 │
│ ┌─────┐ │          │ ┌─────┐ │
│ │ Pod │ │          │ │ Pod │ │
│ └─────┘ │          │ └─────┘ │
└─────────┘          └─────────┘
```

**Control Plane Components:**
- **API Server**: Frontend for the Kubernetes control plane
- **etcd**: Distributed key-value store for cluster data
- **Scheduler**: Assigns pods to nodes
- **Controller Manager**: Runs controller processes

**Node Components:**
- **kubelet**: Agent that runs on each node
- **kube-proxy**: Network proxy
- **Container Runtime**: Software that runs containers (Docker, containerd, CRI-O)

### Key Kubernetes Objects

1. **Pod**: Smallest deployable unit, contains one or more containers
2. **Deployment**: Manages ReplicaSets and provides declarative updates
3. **Service**: Exposes pods as a network service
4. **ConfigMap**: Configuration data in key-value pairs
5. **Secret**: Sensitive configuration data
6. **Namespace**: Virtual cluster for resource isolation

---

## 2. Terraform and Kubernetes Integration

### Available Terraform Providers

Terraform offers multiple ways to interact with Kubernetes:

1. **Kubernetes Provider**: Manage Kubernetes resources directly
2. **Helm Provider**: Deploy Helm charts
3. **Cloud Provider K8s Resources**: Manage cloud-managed clusters (AKS, EKS, GKE)

### Kubernetes Provider Configuration

```hcl
# Configure the Kubernetes provider
terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "kubernetes" {
  # Configuration options:
  # 1. Use kubeconfig file (default: ~/.kube/config)
  config_path = "~/.kube/config"

  # 2. Or use direct configuration
  # host                   = "https://cluster-endpoint"
  # token                  = var.cluster_token
  # cluster_ca_certificate = base64decode(var.cluster_ca_cert)

  # 3. Or use exec-based authentication (recommended for cloud providers)
  # exec {
  #   api_version = "client.authentication.k8s.io/v1beta1"
  #   command     = "aws"
  #   args = ["eks", "get-token", "--cluster-name", var.cluster_name]
  # }
}
```

---

## 3. Deploying Your First Resource with Terraform

### Example: Creating a Namespace

```hcl
# terraform/namespace.tf

# Create a namespace for our application
resource "kubernetes_namespace" "app" {
  metadata {
    name = "demo-app"

    labels = {
      environment = "development"
      managed-by  = "terraform"
    }

    annotations = {
      description = "Namespace for demo application"
    }
  }
}

# Output the namespace name
output "namespace_name" {
  description = "The name of the created namespace"
  value       = kubernetes_namespace.app.metadata[0].name
}
```

### Example: Deploying a Simple Application

```hcl
# terraform/deployment.tf

resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx-deployment"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app = "nginx"
    }
  }

  spec {
    replicas = 3  # Number of pod replicas

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.25-alpine"  # Use specific version for reproducibility

          # Resource limits (important for security and stability)
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

          # Container port
          port {
            container_port = 80
            name          = "http"
          }

          # Liveness probe (restart if unhealthy)
          liveness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          # Readiness probe (don't send traffic if not ready)
          readiness_probe {
            http_get {
              path = "/"
              port = 80
            }
            initial_delay_seconds = 5
            period_seconds        = 5
          }

          # Security context (run as non-root)
          security_context {
            run_as_non_root = true
            run_as_user     = 101  # nginx user
            read_only_root_filesystem = false
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
              add  = ["NET_BIND_SERVICE"]
            }
          }
        }

        # Pod security context
        security_context {
          fs_group = 101
        }
      }
    }
  }
}
```

### Example: Creating a Service

```hcl
# terraform/service.tf

resource "kubernetes_service" "nginx" {
  metadata {
    name      = "nginx-service"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app = "nginx"
    }
  }

  spec {
    selector = {
      app = "nginx"  # Matches the deployment labels
    }

    port {
      name        = "http"
      port        = 80
      target_port = 80
      protocol    = "TCP"
    }

    type = "ClusterIP"  # Internal service
    # Other types: LoadBalancer, NodePort
  }
}

output "service_cluster_ip" {
  description = "The cluster IP of the service"
  value       = kubernetes_service.nginx.spec[0].cluster_ip
}
```

---

## 4. Kubernetes YAML vs Terraform HCL

### Understanding the Translation

**Kubernetes YAML:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  namespace: demo-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: nginx:1.25-alpine
        ports:
        - containerPort: 80
```

**Terraform HCL Equivalent:**
```hcl
resource "kubernetes_deployment" "nginx" {
  metadata {
    name      = "nginx-deployment"
    namespace = "demo-app"
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "nginx"
      }
    }

    template {
      metadata {
        labels = {
          app = "nginx"
        }
      }

      spec {
        container {
          name  = "nginx"
          image = "nginx:1.25-alpine"

          port {
            container_port = 80
          }
        }
      }
    }
  }
}
```

### When to Use YAML vs Terraform

**Use Kubernetes YAML when:**
- You need rapid prototyping
- Working with kubectl directly
- The resource doesn't need lifecycle management
- You're using GitOps tools (ArgoCD, Flux)

**Use Terraform when:**
- You need state management
- You're managing infrastructure and applications together
- You want to use variables, modules, and functions
- You need to manage resources across multiple providers
- You want drift detection and automatic reconciliation

---

## 5. Managing Configuration with ConfigMaps and Secrets

### ConfigMap Example

```hcl
# terraform/configmap.tf

resource "kubernetes_config_map" "app_config" {
  metadata {
    name      = "app-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    "app.properties" = <<-EOT
      database.host=db.example.com
      database.port=5432
      log.level=INFO
      feature.flag.new_ui=true
    EOT

    "nginx.conf" = file("${path.module}/configs/nginx.conf")
  }
}

# Use ConfigMap in a Deployment
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "my-app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "my-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "my-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp:1.0.0"

          # Mount ConfigMap as environment variables
          env_from {
            config_map_ref {
              name = kubernetes_config_map.app_config.metadata[0].name
            }
          }

          # Or mount as a volume
          volume_mount {
            name       = "config-volume"
            mount_path = "/etc/config"
          }
        }

        volume {
          name = "config-volume"

          config_map {
            name = kubernetes_config_map.app_config.metadata[0].name
          }
        }
      }
    }
  }
}
```

### Secret Example

```hcl
# terraform/secrets.tf

# IMPORTANT: In production, use a secrets management solution
# like HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, etc.

resource "kubernetes_secret" "app_secret" {
  metadata {
    name      = "app-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "Opaque"

  data = {
    # These should come from a secure source, not hardcoded
    database_password = base64encode(var.db_password)
    api_key          = base64encode(var.api_key)
  }
}

# Use Secret in a Deployment
resource "kubernetes_deployment" "secure_app" {
  metadata {
    name      = "secure-app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 2

    selector {
      match_labels = {
        app = "secure-app"
      }
    }

    template {
      metadata {
        labels = {
          app = "secure-app"
        }
      }

      spec {
        container {
          name  = "app"
          image = "myapp:1.0.0"

          # Use secret as environment variable
          env {
            name = "DB_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secret.metadata[0].name
                key  = "database_password"
              }
            }
          }

          env {
            name = "API_KEY"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app_secret.metadata[0].name
                key  = "api_key"
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

## 6. DevSecOps Best Practices

### Security Best Practices

1. **Use Specific Image Tags**
   ```hcl
   # BAD: Uses latest tag
   image = "nginx:latest"

   # GOOD: Uses specific version
   image = "nginx:1.25-alpine"
   ```

2. **Set Resource Limits**
   ```hcl
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
   ```

3. **Run as Non-Root User**
   ```hcl
   security_context {
     run_as_non_root = true
     run_as_user     = 1000
     read_only_root_filesystem = true
     allow_privilege_escalation = false
   }
   ```

4. **Use Network Policies**
   ```hcl
   resource "kubernetes_network_policy" "app" {
     metadata {
       name      = "app-network-policy"
       namespace = kubernetes_namespace.app.metadata[0].name
     }

     spec {
       pod_selector {
         match_labels = {
           app = "my-app"
         }
       }

       policy_types = ["Ingress", "Egress"]

       ingress {
         from {
           pod_selector {
             match_labels = {
               app = "frontend"
             }
           }
         }
       }

       egress {
         to {
           pod_selector {
             match_labels = {
               app = "database"
             }
           }
         }
       }
     }
   }
   ```

5. **Scan Images for Vulnerabilities**
   - Use tools like Trivy, Snyk, or Clair
   - Integrate scanning into CI/CD pipeline
   - Implement admission controllers (OPA, Kyverno)

### Terraform Best Practices

1. **Use Variables for Flexibility**
   ```hcl
   variable "app_replicas" {
     description = "Number of application replicas"
     type        = number
     default     = 3

     validation {
       condition     = var.app_replicas > 0 && var.app_replicas <= 10
       error_message = "Replicas must be between 1 and 10"
     }
   }
   ```

2. **Use Locals for Repeated Values**
   ```hcl
   locals {
     common_labels = {
       environment = "production"
       managed_by  = "terraform"
       team        = "platform"
     }
   }

   resource "kubernetes_deployment" "app" {
     metadata {
       labels = merge(local.common_labels, {
         app = "my-app"
       })
     }
   }
   ```

3. **Organize with Modules**
   ```hcl
   module "app_deployment" {
     source = "./modules/app-deployment"

     namespace     = "production"
     app_name      = "my-app"
     app_image     = "myapp:1.0.0"
     replicas      = 3
     resource_limits = {
       cpu    = "500m"
       memory = "512Mi"
     }
   }
   ```

---

## 7. Cost Considerations

### Resource Management

- **Right-size your containers**: Set appropriate resource requests/limits
- **Use Horizontal Pod Autoscaler (HPA)**: Scale based on metrics
- **Cluster Autoscaler**: Automatically adjust cluster size
- **Use spot/preemptible instances**: For non-critical workloads

### Example: Horizontal Pod Autoscaler

```hcl
resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "app-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.nginx.metadata[0].name
    }

    min_replicas = 2
    max_replicas = 10

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
  }
}
```

---

## 8. Common Pitfalls and Troubleshooting

### Common Issues

1. **ImagePullBackOff**
   - Problem: Cannot pull container image
   - Solutions:
     - Check image name and tag
     - Verify registry credentials
     - Use image pull secrets for private registries

2. **CrashLoopBackOff**
   - Problem: Container crashes repeatedly
   - Solutions:
     - Check application logs: `kubectl logs <pod-name>`
     - Review resource limits
     - Check health probes configuration

3. **Pending Pods**
   - Problem: Pods stuck in Pending state
   - Solutions:
     - Check resource availability: `kubectl describe pod <pod-name>`
     - Verify node selectors and affinity rules
     - Check for PVC binding issues

### Debugging Commands

```bash
# Get pod status
kubectl get pods -n demo-app

# Describe a pod (shows events)
kubectl describe pod <pod-name> -n demo-app

# View pod logs
kubectl logs <pod-name> -n demo-app

# Execute command in a pod
kubectl exec -it <pod-name> -n demo-app -- /bin/sh

# Port forward for local testing
kubectl port-forward service/nginx-service 8080:80 -n demo-app
```

### Terraform-Specific Issues

1. **Provider Authentication Issues**
   - Ensure kubeconfig is correctly configured
   - Check cluster endpoint and credentials
   - Verify RBAC permissions

2. **Resource Already Exists**
   - Import existing resources: `terraform import kubernetes_namespace.app demo-app`
   - Or use `terraform destroy` and recreate

3. **State Drift**
   - Run `terraform plan` regularly
   - Use `terraform refresh` to update state
   - Consider using `terraform apply -refresh-only`

---

## 9. Hands-On Exercises

### Exercise 1: Deploy a Multi-Container Pod

Create a Terraform configuration that deploys a pod with:
- An nginx container
- A sidecar container running busybox that logs to stdout
- Shared volume between containers

<details>
<summary>Solution</summary>

```hcl
resource "kubernetes_pod" "multi_container" {
  metadata {
    name      = "multi-container-pod"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    container {
      name  = "nginx"
      image = "nginx:1.25-alpine"

      volume_mount {
        name       = "shared-data"
        mount_path = "/usr/share/nginx/html"
      }
    }

    container {
      name  = "logger"
      image = "busybox:1.36"

      command = ["sh", "-c"]
      args    = ["while true; do date >> /data/index.html; sleep 10; done"]

      volume_mount {
        name       = "shared-data"
        mount_path = "/data"
      }
    }

    volume {
      name = "shared-data"
      empty_dir {}
    }
  }
}
```
</details>

### Exercise 2: Create a ConfigMap-Driven Application

Deploy an application that:
- Uses a ConfigMap for non-sensitive configuration
- Uses a Secret for sensitive data
- Mounts both as volumes

### Exercise 3: Implement Resource Quotas

Create a namespace with resource quotas to limit:
- Total CPU: 4 cores
- Total Memory: 8Gi
- Maximum number of pods: 10

<details>
<summary>Solution</summary>

```hcl
resource "kubernetes_resource_quota" "app_quota" {
  metadata {
    name      = "app-quota"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    hard = {
      "requests.cpu"    = "4"
      "requests.memory" = "8Gi"
      "limits.cpu"      = "8"
      "limits.memory"   = "16Gi"
      "pods"           = "10"
    }
  }
}
```
</details>

---

## 10. Summary and Next Steps

### What You've Learned

- Kubernetes architecture and core components
- How to configure Terraform to work with Kubernetes
- Deploying applications using Terraform
- Managing configuration with ConfigMaps and Secrets
- Security best practices for Kubernetes deployments
- Cost optimization strategies
- Troubleshooting common issues

### Next Steps

1. **Lesson 2**: Deploy Azure Kubernetes Service (AKS) using Terraform
2. **Lesson 3**: Deploy Amazon EKS using Terraform
3. **Lesson 4**: Deploy Google Kubernetes Engine (GKE) using Terraform
4. **Lesson 5**: Advanced Kubernetes resource management
5. **Lesson 6**: Helm charts with Terraform
6. **Lesson 7**: Kubernetes networking deep dive
7. **Lesson 8**: Kubernetes security hardening

### Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Terraform Kubernetes Provider](https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
- [CNCF Security Best Practices](https://www.cncf.io/blog/2022/06/07/kubernetes-security-best-practices/)

---

## Verification Checklist

Before moving to the next lesson, ensure you can:
- [ ] Explain the difference between Pods, Deployments, and Services
- [ ] Configure the Kubernetes Terraform provider
- [ ] Deploy a basic application using Terraform
- [ ] Create and use ConfigMaps and Secrets
- [ ] Implement security contexts and resource limits
- [ ] Debug common Kubernetes issues
- [ ] Use kubectl to inspect deployed resources

---

**Estimated Completion Time**: 60-90 minutes

**Difficulty Level**: Beginner to Intermediate

**Prerequisites Completed**: ✓ Terraform Basics, ✓ Container Fundamentals
