# Kubernetes Security Best Practices

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement RBAC (Role-Based Access Control)
- Configure Pod Security Standards and admission controllers
- Manage secrets securely using external secret managers
- Implement security contexts and policies
- Scan container images for vulnerabilities
- Configure audit logging and monitoring
- Implement runtime security
- Apply supply chain security best practices

## Prerequisites

- Completed previous Kubernetes lessons
- Access to a Kubernetes cluster with admin privileges
- Terraform 1.0+ installed
- kubectl CLI installed
- Understanding of security concepts

## Time Estimate

75-90 minutes

---

## 1. Role-Based Access Control (RBAC)

### Understanding RBAC Components

- **Subject**: User, Group, or Service Account
- **Role**: Set of permissions (namespace-scoped)
- **ClusterRole**: Set of permissions (cluster-wide)
- **RoleBinding**: Grants Role to Subject
- **ClusterRoleBinding**: Grants ClusterRole to Subject

### Service Accounts and Roles

```hcl
# terraform/rbac.tf

# Namespace for application
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"

    labels = {
      environment = "production"
      managed-by  = "terraform"
    }
  }
}

# Service Account for application
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "app-service-account"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app = "myapp"
    }

    annotations = {
      # AWS IRSA
      "eks.amazonaws.com/role-arn" = var.app_role_arn
      # GCP Workload Identity
      "iam.gke.io/gcp-service-account" = var.app_gsa
      # Azure Workload Identity
      "azure.workload.identity/client-id" = var.app_client_id
    }
  }

  automount_service_account_token = false  # Disable auto-mounting
}

# Role for application (namespace-scoped)
resource "kubernetes_role" "app" {
  metadata {
    name      = "app-role"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  # Read access to ConfigMaps
  rule {
    api_groups = [""]
    resources  = ["configmaps"]
    verbs      = ["get", "list", "watch"]
    resource_names = ["app-config"]  # Restrict to specific resource
  }

  # Read access to Secrets
  rule {
    api_groups = [""]
    resources  = ["secrets"]
    verbs      = ["get"]
    resource_names = ["app-secret"]
  }

  # Access to own pod
  rule {
    api_groups = [""]
    resources  = ["pods"]
    verbs      = ["get", "list"]
  }
}

# RoleBinding
resource "kubernetes_role_binding" "app" {
  metadata {
    name      = "app-rolebinding"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "Role"
    name      = kubernetes_role.app.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = kubernetes_service_account.app.metadata[0].name
    namespace = kubernetes_namespace.app.metadata[0].name
  }
}

# ClusterRole for monitoring (cluster-wide)
resource "kubernetes_cluster_role" "monitoring" {
  metadata {
    name = "monitoring-role"
  }

  # Read metrics from all namespaces
  rule {
    api_groups = [""]
    resources  = ["nodes", "nodes/proxy", "services", "endpoints", "pods"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    api_groups = ["extensions", "apps"]
    resources  = ["deployments", "daemonsets", "replicasets", "statefulsets"]
    verbs      = ["get", "list", "watch"]
  }

  rule {
    non_resource_urls = ["/metrics", "/metrics/cadvisor"]
    verbs             = ["get"]
  }
}

# ClusterRoleBinding
resource "kubernetes_cluster_role_binding" "monitoring" {
  metadata {
    name = "monitoring-rolebinding"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = kubernetes_cluster_role.monitoring.metadata[0].name
  }

  subject {
    kind      = "ServiceAccount"
    name      = "prometheus"
    namespace = "monitoring"
  }
}

# Read-only user role
resource "kubernetes_cluster_role" "view_only" {
  metadata {
    name = "view-only"
  }

  # Aggregate to view
  aggregation_rule {
    cluster_role_selectors {
      match_labels = {
        "rbac.authorization.k8s.io/aggregate-to-view" = "true"
      }
    }
  }
}

# Bind to user
resource "kubernetes_cluster_role_binding" "developers_view" {
  metadata {
    name = "developers-view"
  }

  role_ref {
    api_group = "rbac.authorization.k8s.io"
    kind      = "ClusterRole"
    name      = "view"
  }

  subject {
    kind      = "Group"
    name      = "developers"
    api_group = "rbac.authorization.k8s.io"
  }
}
```

---

## 2. Pod Security Standards

### Pod Security Admission

```hcl
# terraform/pod-security.tf

# Enforce Pod Security Standards at namespace level
resource "kubernetes_labels" "namespace_security" {
  api_version = "v1"
  kind        = "Namespace"

  metadata {
    name = kubernetes_namespace.app.metadata[0].name
  }

  labels = {
    # Pod Security Standards (Kubernetes 1.23+)
    # Levels: privileged, baseline, restricted
    "pod-security.kubernetes.io/enforce"         = "restricted"
    "pod-security.kubernetes.io/enforce-version" = "latest"
    "pod-security.kubernetes.io/audit"           = "restricted"
    "pod-security.kubernetes.io/audit-version"   = "latest"
    "pod-security.kubernetes.io/warn"            = "restricted"
    "pod-security.kubernetes.io/warn-version"    = "latest"
  }

  depends_on = [kubernetes_namespace.app]
}

# Exemptions for specific resources
resource "kubernetes_manifest" "pod_security_exemptions" {
  manifest = {
    apiVersion = "pod-security.kubernetes.io/v1"
    kind       = "PodSecurityConfiguration"
    metadata = {
      name = "pod-security-config"
    }
    defaults = {
      enforce         = "restricted"
      enforce-version = "latest"
      audit           = "restricted"
      audit-version   = "latest"
      warn            = "restricted"
      warn-version    = "latest"
    }
    exemptions = {
      usernames      = []
      runtimeClasses = []
      namespaces     = ["kube-system", "monitoring"]
    }
  }
}
```

### Security Contexts

```hcl
# terraform/security-context.tf

# Deployment with security best practices
resource "kubernetes_deployment" "secure_app" {
  metadata {
    name      = "secure-app"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    replicas = 3

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

        annotations = {
          # AppArmor profile
          "container.apparmor.security.beta.kubernetes.io/app" = "runtime/default"
          # Seccomp profile
          "seccomp.security.alpha.kubernetes.io/pod" = "runtime/default"
        }
      }

      spec {
        # Service account
        service_account_name            = kubernetes_service_account.app.metadata[0].name
        automount_service_account_token = false  # Mount only if needed

        # Pod-level security context
        security_context {
          # Run as non-root
          run_as_non_root = true
          run_as_user     = 1000
          run_as_group    = 3000
          fs_group        = 2000

          # Seccomp profile (Kubernetes 1.19+)
          seccomp_profile {
            type = "RuntimeDefault"
          }

          # SELinux options
          se_linux_options {
            level = "s0:c123,c456"
          }

          # Supplemental groups
          supplemental_groups = [4000]

          # Sysctl settings
          sysctl {
            name  = "net.ipv4.ip_unprivileged_port_start"
            value = "0"
          }
        }

        # Init container for setup
        init_container {
          name  = "init-setup"
          image = "busybox:1.36"

          command = ["sh", "-c", "echo Initializing && sleep 2"]

          # Container-level security context
          security_context {
            run_as_non_root            = true
            run_as_user                = 1000
            read_only_root_filesystem  = true
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
            }

            seccomp_profile {
              type = "RuntimeDefault"
            }
          }

          volume_mount {
            name       = "temp"
            mount_path = "/tmp"
          }
        }

        # Application container
        container {
          name  = "app"
          image = "myapp:1.0.0"

          # Environment variables
          env {
            name  = "APP_ENV"
            value = "production"
          }

          # Resource limits (prevent resource exhaustion)
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
            timeout_seconds       = 5
            failure_threshold     = 3
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }

          # Container security context
          security_context {
            # Don't run as root
            run_as_non_root            = true
            run_as_user                = 1000
            run_as_group               = 3000
            read_only_root_filesystem  = true
            allow_privilege_escalation = false

            # Drop all capabilities, add only what's needed
            capabilities {
              drop = ["ALL"]
              add  = ["NET_BIND_SERVICE"]  # Only if binding to ports < 1024
            }

            # Seccomp profile
            seccomp_profile {
              type = "RuntimeDefault"
            }

            # Privileged mode (NEVER use in production)
            privileged = false
          }

          # Volume mounts
          volume_mount {
            name       = "temp"
            mount_path = "/tmp"
          }

          volume_mount {
            name       = "cache"
            mount_path = "/var/cache/app"
          }
        }

        # Volumes
        volume {
          name = "temp"
          empty_dir {}
        }

        volume {
          name = "cache"
          empty_dir {
            size_limit = "1Gi"
          }
        }

        # Host settings (avoid in production)
        host_network = false
        host_pid     = false
        host_ipc     = false

        # DNS policy
        dns_policy = "ClusterFirst"
      }
    }
  }
}
```

---

## 3. Secrets Management

### External Secrets Operator

```hcl
# terraform/external-secrets.tf

resource "kubernetes_namespace" "external_secrets" {
  metadata {
    name = "external-secrets"
  }
}

# Install External Secrets Operator
resource "helm_release" "external_secrets" {
  name       = "external-secrets"
  repository = "https://charts.external-secrets.io"
  chart      = "external-secrets"
  version    = "0.9.11"
  namespace  = kubernetes_namespace.external_secrets.metadata[0].name

  values = [
    yamlencode({
      installCRDs = true

      webhook = {
        port = 9443
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
    })
  ]
}

# SecretStore for AWS Secrets Manager
resource "kubernetes_manifest" "secret_store_aws" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "SecretStore"
    metadata = {
      name      = "aws-secrets-manager"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      provider = {
        aws = {
          service = "SecretsManager"
          region  = var.aws_region
          auth = {
            jwt = {
              serviceAccountRef = {
                name = kubernetes_service_account.app.metadata[0].name
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.external_secrets]
}

# ExternalSecret
resource "kubernetes_manifest" "external_secret" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ExternalSecret"
    metadata = {
      name      = "app-secrets"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      refreshInterval = "1h"
      secretStoreRef = {
        name = "aws-secrets-manager"
        kind = "SecretStore"
      }
      target = {
        name           = "app-secret"
        creationPolicy = "Owner"
      }
      dataFrom = [{
        extract = {
          key = "/production/app/secrets"
        }
      }]
    }
  }

  depends_on = [kubernetes_manifest.secret_store_aws]
}

# SecretStore for Azure Key Vault
resource "kubernetes_manifest" "secret_store_azure" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "SecretStore"
    metadata = {
      name      = "azure-keyvault"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      provider = {
        azurekv = {
          vaultUrl = "https://${var.keyvault_name}.vault.azure.net"
          authType = "WorkloadIdentity"
          serviceAccountRef = {
            name = kubernetes_service_account.app.metadata[0].name
          }
        }
      }
    }
  }

  depends_on = [helm_release.external_secrets]
}

# SecretStore for Google Secret Manager
resource "kubernetes_manifest" "secret_store_gcp" {
  manifest = {
    apiVersion = "external-secrets.io/v1beta1"
    kind       = "ClusterSecretStore"
    metadata = {
      name = "gcpsm"
    }
    spec = {
      provider = {
        gcpsm = {
          projectID = var.gcp_project_id
          auth = {
            workloadIdentity = {
              clusterLocation = var.gcp_region
              clusterName     = var.cluster_name
              serviceAccountRef = {
                name      = kubernetes_service_account.app.metadata[0].name
                namespace = kubernetes_namespace.app.metadata[0].name
              }
            }
          }
        }
      }
    }
  }

  depends_on = [helm_release.external_secrets]
}
```

### Sealed Secrets

```hcl
# terraform/sealed-secrets.tf

# Install Sealed Secrets Controller
resource "helm_release" "sealed_secrets" {
  name       = "sealed-secrets"
  repository = "https://bitnami-labs.github.io/sealed-secrets"
  chart      = "sealed-secrets"
  version    = "2.13.2"
  namespace  = "kube-system"

  set {
    name  = "resources.limits.cpu"
    value = "200m"
  }

  set {
    name  = "resources.limits.memory"
    value = "256Mi"
  }
}

# Example: Create sealed secret (done externally)
# kubeseal --format yaml < secret.yaml > sealed-secret.yaml
```

---

## 4. Image Security

### OPA Gatekeeper for Policy Enforcement

```hcl
# terraform/gatekeeper.tf

resource "helm_release" "gatekeeper" {
  name       = "gatekeeper"
  repository = "https://open-policy-agent.github.io/gatekeeper/charts"
  chart      = "gatekeeper"
  version    = "3.14.0"
  namespace  = "gatekeeper-system"

  create_namespace = true

  values = [
    yamlencode({
      replicas = 3

      resources = {
        limits = {
          cpu    = "1000m"
          memory = "512Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "256Mi"
        }
      }

      audit = {
        replicas = 1
      }
    })
  ]
}

# Constraint Template: Require image from allowed registries
resource "kubernetes_manifest" "allowed_repos_template" {
  manifest = {
    apiVersion = "templates.gatekeeper.sh/v1"
    kind       = "ConstraintTemplate"
    metadata = {
      name = "k8sallowedrepos"
    }
    spec = {
      crd = {
        spec = {
          names = {
            kind = "K8sAllowedRepos"
          }
          validation = {
            openAPIV3Schema = {
              type = "object"
              properties = {
                repos = {
                  type = "array"
                  items = {
                    type = "string"
                  }
                }
              }
            }
          }
        }
      }
      targets = [{
        target = "admission.k8s.gatekeeper.sh"
        rego   = <<-REGO
          package k8sallowedrepos

          violation[{"msg": msg}] {
            container := input.review.object.spec.containers[_]
            satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
            not any(satisfied)
            msg := sprintf("container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, input.parameters.repos])
          }

          violation[{"msg": msg}] {
            container := input.review.object.spec.initContainers[_]
            satisfied := [good | repo = input.parameters.repos[_] ; good = startswith(container.image, repo)]
            not any(satisfied)
            msg := sprintf("init container <%v> has an invalid image repo <%v>, allowed repos are %v", [container.name, container.image, input.parameters.repos])
          }
        REGO
      }]
    }
  }

  depends_on = [helm_release.gatekeeper]
}

# Constraint: Enforce allowed registries
resource "kubernetes_manifest" "allowed_repos_constraint" {
  manifest = {
    apiVersion = "constraints.gatekeeper.sh/v1beta1"
    kind       = "K8sAllowedRepos"
    metadata = {
      name = "repo-must-be-from-approved-registry"
    }
    spec = {
      match = {
        kinds = [{
          apiGroups = [""]
          kinds     = ["Pod"]
        }]
        namespaces = ["production", "staging"]
      }
      parameters = {
        repos = [
          "myregistry.azurecr.io/",
          "123456789.dkr.ecr.us-east-1.amazonaws.com/",
          "us-docker.pkg.dev/my-project/",
          "docker.io/library/"  # Allow official images
        ]
      }
    }
  }

  depends_on = [kubernetes_manifest.allowed_repos_template]
}

# Constraint Template: Block privileged containers
resource "kubernetes_manifest" "block_privileged_template" {
  manifest = {
    apiVersion = "templates.gatekeeper.sh/v1"
    kind       = "ConstraintTemplate"
    metadata = {
      name = "k8spspprivileged"
    }
    spec = {
      crd = {
        spec = {
          names = {
            kind = "K8sPSPPrivileged"
          }
        }
      }
      targets = [{
        target = "admission.k8s.gatekeeper.sh"
        rego   = <<-REGO
          package k8spspprivileged

          violation[{"msg": msg}] {
            c := input_containers[_]
            c.securityContext.privileged
            msg := sprintf("Privileged container is not allowed: %v", [c.name])
          }

          input_containers[c] {
            c := input.review.object.spec.containers[_]
          }

          input_containers[c] {
            c := input.review.object.spec.initContainers[_]
          }
        REGO
      }]
    }
  }

  depends_on = [helm_release.gatekeeper]
}

# Constraint: Block privileged containers
resource "kubernetes_manifest" "block_privileged_constraint" {
  manifest = {
    apiVersion = "constraints.gatekeeper.sh/v1beta1"
    kind       = "K8sPSPPrivileged"
    metadata = {
      name = "block-privileged-containers"
    }
    spec = {
      match = {
        kinds = [{
          apiGroups = [""]
          kinds     = ["Pod"]
        }]
      }
    }
  }

  depends_on = [kubernetes_manifest.block_privileged_template]
}
```

---

## 5. Runtime Security with Falco

### Deploy Falco

```hcl
# terraform/falco.tf

resource "helm_release" "falco" {
  name       = "falco"
  repository = "https://falcosecurity.github.io/charts"
  chart      = "falco"
  version    = "3.8.4"
  namespace  = "falco"

  create_namespace = true

  values = [
    yamlencode({
      driver = {
        kind = "ebpf"  # or "module"
      }

      falco = {
        grpc = {
          enabled = true
        }

        grpc_output = {
          enabled = true
        }

        json_output = true
        json_include_output_property = true

        # Custom rules
        rules_file = [
          "/etc/falco/falco_rules.yaml",
          "/etc/falco/falco_rules.local.yaml",
          "/etc/falco/rules.d"
        ]
      }

      # Falcosidekick for routing alerts
      falcosidekick = {
        enabled = true

        config = {
          slack = {
            webhookurl     = var.slack_webhook_url
            minimumpriority = "warning"
          }

          webhook = {
            address = var.webhook_url
          }
        }
      }

      resources = {
        limits = {
          cpu    = "1000m"
          memory = "1Gi"
        }
        requests = {
          cpu    = "100m"
          memory = "512Mi"
        }
      }

      # Custom rules
      customRules = {
        "custom-rules.yaml" = <<-YAML
          - rule: Unauthorized Process in Container
            desc: Detect processes running that are not in allowlist
            condition: >
              spawned_process and
              container and
              not proc.name in (node, java, python, nginx)
            output: >
              Unauthorized process started in container
              (user=%user.name command=%proc.cmdline container=%container.name image=%container.image.repository)
            priority: WARNING
            tags: [container, process]

          - rule: Write below root
            desc: Detect any write activity below root directory
            condition: >
              write and
              container and
              fd.name startswith / and
              not fd.name startswith /tmp and
              not fd.name startswith /var/tmp
            output: >
              Write below root directory
              (user=%user.name command=%proc.cmdline file=%fd.name container=%container.name)
            priority: ERROR
            tags: [filesystem, container]
        YAML
      }
    })
  ]
}
```

---

## 6. Audit Logging

### Enable Audit Logging

```hcl
# terraform/audit-policy.tf

# Audit policy (apply to cluster)
locals {
  audit_policy = <<-YAML
    apiVersion: audit.k8s.io/v1
    kind: Policy
    omitStages:
      - "RequestReceived"
    rules:
      # Log pod changes at RequestResponse level
      - level: RequestResponse
        resources:
        - group: ""
          resources: ["pods"]

      # Log Secret retrieval at Metadata level
      - level: Metadata
        resources:
        - group: ""
          resources: ["secrets", "configmaps"]

      # Log all requests to a certain namespace
      - level: RequestResponse
        namespaces: ["production"]

      # Don't log watch requests
      - level: None
        verbs: ["watch"]

      # Don't log authenticated requests to certain non-resource URLs
      - level: None
        nonResourceURLs:
          - "/healthz*"
          - "/version"
          - "/swagger*"

      # Log everything else at Metadata level
      - level: Metadata
        omitStages:
          - "RequestReceived"
  YAML
}

# For cloud providers, enable audit logging in cluster configuration
# See cloud-specific lessons for implementation
```

---

## 7. Compliance and Scanning

### Trivy Operator for Vulnerability Scanning

```hcl
# terraform/trivy-operator.tf

resource "helm_release" "trivy_operator" {
  name       = "trivy-operator"
  repository = "https://aquasecurity.github.io/helm-charts/"
  chart      = "trivy-operator"
  version    = "0.18.4"
  namespace  = "trivy-system"

  create_namespace = true

  values = [
    yamlencode({
      trivy = {
        ignoreUnfixed = true
        severity      = "CRITICAL,HIGH,MEDIUM"
      }

      operator = {
        scanJobsConcurrentLimit = 3
        vulnerabilityScannerScanOnlyCurrentRevisions = true
      }

      resources = {
        limits = {
          cpu    = "500m"
          memory = "512Mi"
        }
        requests = {
          cpu    = "100m"
          memory = "256Mi"
        }
      }
    })
  ]
}
```

---

## 8. Security Checklist

### Deployment Security Checklist

```yaml
# Security best practices checklist for deployments

Security Contexts:
  ✓ runAsNonRoot: true
  ✓ runAsUser: <non-zero>
  ✓ readOnlyRootFilesystem: true
  ✓ allowPrivilegeEscalation: false
  ✓ capabilities.drop: ["ALL"]
  ✓ seccompProfile.type: RuntimeDefault

Resources:
  ✓ requests.cpu defined
  ✓ requests.memory defined
  ✓ limits.cpu defined
  ✓ limits.memory defined

Network:
  ✓ NetworkPolicy defined
  ✓ Ingress with TLS
  ✓ Service mesh (optional)

RBAC:
  ✓ ServiceAccount defined
  ✓ Minimal permissions
  ✓ automountServiceAccountToken: false (if not needed)

Secrets:
  ✓ External secret manager
  ✓ No secrets in environment variables
  ✓ Encryption at rest enabled

Images:
  ✓ From approved registry
  ✓ Specific tag (not :latest)
  ✓ Scanned for vulnerabilities
  ✓ Signed images

Monitoring:
  ✓ Audit logging enabled
  ✓ Runtime security (Falco)
  ✓ Resource monitoring
  ✓ Alert on security events
```

---

## Summary

You've learned how to:
- Implement RBAC for access control
- Configure Pod Security Standards
- Manage secrets securely with external secret managers
- Apply security contexts and policies
- Enforce policies with OPA Gatekeeper
- Implement runtime security with Falco
- Enable audit logging
- Scan for vulnerabilities with Trivy

### Security Best Practices Summary

1. **Principle of Least Privilege**: Grant minimal permissions
2. **Defense in Depth**: Multiple layers of security
3. **Immutable Infrastructure**: Read-only filesystems
4. **Secrets Management**: Never hardcode secrets
5. **Network Segmentation**: Use NetworkPolicies
6. **Image Security**: Scan and sign images
7. **Runtime Protection**: Monitor and detect anomalies
8. **Audit Everything**: Enable comprehensive logging

### Compliance Frameworks

- **CIS Kubernetes Benchmark**
- **NSA/CISA Kubernetes Hardening Guide**
- **NIST SP 800-190**
- **PCI-DSS** (for payment data)
- **HIPAA** (for healthcare)
- **SOC 2**

### Tools Referenced

- **RBAC Manager**: Simplify RBAC management
- **OPA Gatekeeper**: Policy enforcement
- **Falco**: Runtime security
- **Trivy**: Vulnerability scanning
- **External Secrets Operator**: Secret management
- **Sealed Secrets**: GitOps-friendly secrets
- **Cert-Manager**: TLS certificate management

---

**Estimated Completion Time**: 75-90 minutes

**Difficulty Level**: Advanced

---

## Congratulations!

You've completed all 8 Kubernetes lessons! You now have comprehensive knowledge of:
- Kubernetes fundamentals
- Cloud provider Kubernetes services (AKS, EKS, GKE)
- Advanced resource management
- Helm and package management
- Networking and service mesh
- Security and compliance

**Next Steps:**
- Practice with hands-on examples
- Build production-ready clusters
- Implement CI/CD pipelines
- Explore advanced topics (multi-cluster, service mesh, GitOps)
