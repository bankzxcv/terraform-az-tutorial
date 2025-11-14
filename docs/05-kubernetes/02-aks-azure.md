# Azure Kubernetes Service (AKS) with Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Provision an AKS cluster using Terraform
- Configure AKS networking and security settings
- Integrate AKS with Azure services (ACR, Azure Monitor, Key Vault)
- Implement Azure AD integration for RBAC
- Deploy applications to AKS using Terraform
- Apply cost optimization strategies for AKS
- Implement DevSecOps best practices for AKS

## Prerequisites

- Completed Lesson 1: Kubernetes Basics
- Azure subscription with appropriate permissions
- Azure CLI installed and configured
- Terraform 1.0+ installed
- kubectl CLI installed
- Basic understanding of Azure services

## Time Estimate

90-120 minutes

---

## 1. AKS Architecture Overview

### AKS Components

```
┌─────────────────────────────────────────────────────────┐
│                    Azure Cloud                          │
│  ┌───────────────────────────────────────────────────┐  │
│  │             AKS Control Plane                     │  │
│  │         (Microsoft Managed - Free)                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │   API    │  │   etcd   │  │Scheduler │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────┐    │
│  │              Node Pools                        │    │
│  │  ┌─────────────┐  ┌─────────────┐            │    │
│  │  │   System    │  │    User     │            │    │
│  │  │  Node Pool  │  │  Node Pool  │            │    │
│  │  │  (VMs)      │  │  (VMs/VMSS) │            │    │
│  │  └─────────────┘  └─────────────┘            │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │        Azure Integrations                     │    │
│  │  - Azure AD (Identity)                        │    │
│  │  - Azure CNI (Networking)                     │    │
│  │  - Azure Monitor (Logging/Metrics)            │    │
│  │  - Azure Container Registry (Images)          │    │
│  │  - Azure Key Vault (Secrets)                  │    │
│  └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- **Managed Control Plane**: Microsoft manages the control plane at no cost
- **Azure Integration**: Native integration with Azure services
- **Multiple Node Pools**: System and user node pools with different configurations
- **Networking Options**: Azure CNI or kubenet
- **Security**: Azure AD integration, Pod Identity, Azure Policy
- **Monitoring**: Azure Monitor for containers

---

## 2. Basic AKS Cluster with Terraform

### Complete AKS Configuration

```hcl
# terraform/aks-cluster.tf

terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "aks" {
  name     = "rg-aks-demo-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Purpose     = "AKS-Demo"
  }
}

# Log Analytics Workspace for Container Insights
resource "azurerm_log_analytics_workspace" "aks" {
  name                = "law-aks-${var.environment}"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = azurerm_resource_group.aks.tags
}

# AKS Cluster
resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${var.cluster_name}-${var.environment}"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  dns_prefix          = "aks-${var.cluster_name}"

  # Kubernetes version
  kubernetes_version = var.kubernetes_version

  # Automatic upgrades
  automatic_channel_upgrade = "stable"

  # Default node pool (system pool)
  default_node_pool {
    name                = "system"
    node_count          = var.system_node_count
    vm_size             = var.system_node_vm_size
    os_disk_size_gb     = 100
    os_disk_type        = "Managed"

    # Enable autoscaling
    enable_auto_scaling = true
    min_count          = 1
    max_count          = 3

    # Only system pods on this pool
    only_critical_addons_enabled = true

    # Availability zones for high availability
    zones = ["1", "2", "3"]

    # Network settings
    vnet_subnet_id = azurerm_subnet.aks.id

    # Labels
    node_labels = {
      "nodepool-type" = "system"
      "environment"   = var.environment
      "nodepoolos"    = "linux"
    }

    # Taints (only for system workloads)
    node_taints = [
      "CriticalAddonsOnly=true:NoSchedule"
    ]

    tags = azurerm_resource_group.aks.tags
  }

  # Identity
  identity {
    type = "SystemAssigned"
  }

  # Network profile
  network_profile {
    network_plugin    = "azure"  # Azure CNI
    network_policy    = "azure"  # Azure Network Policy
    load_balancer_sku = "standard"
    outbound_type     = "loadBalancer"

    # Service and Pod CIDR
    service_cidr   = "10.0.0.0/16"
    dns_service_ip = "10.0.0.10"
  }

  # Azure AD integration (Managed)
  azure_active_directory_role_based_access_control {
    managed                = true
    admin_group_object_ids = var.admin_group_object_ids
    azure_rbac_enabled     = true
  }

  # Enable Azure Monitor
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  # Azure Policy Add-on
  azure_policy_enabled = true

  # HTTP Application Routing (not recommended for production)
  http_application_routing_enabled = false

  # Key Vault Secrets Provider
  key_vault_secrets_provider {
    secret_rotation_enabled  = true
    secret_rotation_interval = "2m"
  }

  # Maintenance window
  maintenance_window {
    allowed {
      day   = "Sunday"
      hours = [2, 3, 4]
    }
  }

  # Security settings
  role_based_access_control_enabled = true

  # Disk encryption
  disk_encryption_set_id = var.disk_encryption_set_id

  # Private cluster (optional, for enhanced security)
  private_cluster_enabled = var.enable_private_cluster

  tags = azurerm_resource_group.aks.tags

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count
    ]
  }
}

# User node pool for application workloads
resource "azurerm_kubernetes_cluster_node_pool" "user" {
  name                  = "user"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.main.id
  vm_size              = var.user_node_vm_size
  node_count           = var.user_node_count

  # Autoscaling
  enable_auto_scaling = true
  min_count          = 2
  max_count          = 10

  # Availability zones
  zones = ["1", "2", "3"]

  # Network
  vnet_subnet_id = azurerm_subnet.aks.id

  # OS settings
  os_type      = "Linux"
  os_disk_type = "Ephemeral"  # Faster and cheaper
  os_disk_size_gb = 100

  # Labels
  node_labels = {
    "nodepool-type" = "user"
    "environment"   = var.environment
    "workload"      = "general"
  }

  # Spot instances for cost optimization (optional)
  priority        = var.use_spot_instances ? "Spot" : "Regular"
  eviction_policy = var.use_spot_instances ? "Delete" : null
  spot_max_price  = var.use_spot_instances ? -1 : null  # -1 = pay up to on-demand

  tags = azurerm_resource_group.aks.tags

  lifecycle {
    ignore_changes = [
      node_count
    ]
  }
}
```

### Networking Configuration

```hcl
# terraform/network.tf

# Virtual Network
resource "azurerm_virtual_network" "aks" {
  name                = "vnet-aks-${var.environment}"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  address_space       = ["10.1.0.0/16"]

  tags = azurerm_resource_group.aks.tags
}

# Subnet for AKS nodes
resource "azurerm_subnet" "aks" {
  name                 = "snet-aks-nodes"
  resource_group_name  = azurerm_resource_group.aks.name
  virtual_network_name = azurerm_virtual_network.aks.name
  address_prefixes     = ["10.1.0.0/20"]

  # Delegate to AKS
  delegation {
    name = "aks-delegation"

    service_delegation {
      name = "Microsoft.ContainerService/managedClusters"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action",
      ]
    }
  }
}

# Network Security Group
resource "azurerm_network_security_group" "aks" {
  name                = "nsg-aks-${var.environment}"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name

  # Allow HTTPS inbound
  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }

  tags = azurerm_resource_group.aks.tags
}

# Associate NSG with subnet
resource "azurerm_subnet_network_security_group_association" "aks" {
  subnet_id                 = azurerm_subnet.aks.id
  network_security_group_id = azurerm_network_security_group.aks.id
}
```

### Variables

```hcl
# terraform/variables.tf

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "cluster_name" {
  description = "AKS cluster name"
  type        = string
  default     = "demo"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "system_node_count" {
  description = "Number of nodes in system pool"
  type        = number
  default     = 2
}

variable "system_node_vm_size" {
  description = "VM size for system nodes"
  type        = string
  default     = "Standard_D2s_v3"
}

variable "user_node_count" {
  description = "Number of nodes in user pool"
  type        = number
  default     = 3
}

variable "user_node_vm_size" {
  description = "VM size for user nodes"
  type        = string
  default     = "Standard_D4s_v3"
}

variable "admin_group_object_ids" {
  description = "Azure AD group object IDs for cluster admins"
  type        = list(string)
  default     = []
}

variable "enable_private_cluster" {
  description = "Enable private cluster"
  type        = bool
  default     = false
}

variable "disk_encryption_set_id" {
  description = "Disk encryption set ID"
  type        = string
  default     = null
}

variable "use_spot_instances" {
  description = "Use spot instances for user node pool"
  type        = bool
  default     = false
}
```

### Outputs

```hcl
# terraform/outputs.tf

output "cluster_id" {
  description = "AKS cluster ID"
  value       = azurerm_kubernetes_cluster.main.id
}

output "cluster_name" {
  description = "AKS cluster name"
  value       = azurerm_kubernetes_cluster.main.name
}

output "cluster_endpoint" {
  description = "AKS cluster endpoint"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].host
  sensitive   = true
}

output "kube_config" {
  description = "Kubeconfig for the cluster"
  value       = azurerm_kubernetes_cluster.main.kube_config_raw
  sensitive   = true
}

output "client_certificate" {
  description = "Client certificate"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].client_certificate
  sensitive   = true
}

output "cluster_ca_certificate" {
  description = "Cluster CA certificate"
  value       = azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate
  sensitive   = true
}

output "node_resource_group" {
  description = "Resource group containing AKS nodes"
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "identity_principal_id" {
  description = "Principal ID of cluster managed identity"
  value       = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

output "kubelet_identity" {
  description = "Kubelet managed identity"
  value       = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
}
```

---

## 3. Azure Container Registry Integration

### Create ACR and Connect to AKS

```hcl
# terraform/acr.tf

# Azure Container Registry
resource "azurerm_container_registry" "main" {
  name                = "acr${var.cluster_name}${var.environment}"
  resource_group_name = azurerm_resource_group.aks.name
  location            = azurerm_resource_group.aks.location
  sku                 = "Premium"  # Premium required for private endpoints

  # Enable admin user (not recommended for production)
  admin_enabled = false

  # Public network access
  public_network_access_enabled = true

  # Network rule set
  network_rule_set {
    default_action = "Deny"

    ip_rule {
      action   = "Allow"
      ip_range = "0.0.0.0/0"  # Replace with your IP ranges
    }
  }

  # Encryption
  encryption {
    enabled = false  # Set to true with customer-managed key for production
  }

  # Image quarantine
  quarantine_policy_enabled = true

  # Retention policy
  retention_policy {
    days    = 30
    enabled = true
  }

  # Trust policy
  trust_policy {
    enabled = true
  }

  # Enable zone redundancy for high availability
  zone_redundancy_enabled = true

  tags = azurerm_resource_group.aks.tags
}

# Grant AKS pull permissions to ACR
resource "azurerm_role_assignment" "aks_acr_pull" {
  principal_id                     = azurerm_kubernetes_cluster.main.kubelet_identity[0].object_id
  role_definition_name             = "AcrPull"
  scope                            = azurerm_container_registry.main.id
  skip_service_principal_aad_check = true
}

# Output ACR login server
output "acr_login_server" {
  description = "ACR login server"
  value       = azurerm_container_registry.main.login_server
}
```

### Build and Push Image to ACR

```bash
# Login to ACR
az acr login --name acr<name><env>

# Build and push image
docker build -t myapp:1.0.0 .
docker tag myapp:1.0.0 acr<name><env>.azurecr.io/myapp:1.0.0
docker push acr<name><env>.azurecr.io/myapp:1.0.0

# Or use ACR build
az acr build --registry acr<name><env> --image myapp:1.0.0 .
```

---

## 4. Deploying Applications to AKS

### Configure Kubernetes Provider for AKS

```hcl
# terraform/kubernetes-provider.tf

# Configure Kubernetes provider using AKS credentials
provider "kubernetes" {
  host                   = azurerm_kubernetes_cluster.main.kube_config[0].host
  client_certificate     = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].client_certificate)
  client_key             = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].client_key)
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)
}

# Or use exec-based authentication (recommended)
provider "kubernetes" {
  host                   = azurerm_kubernetes_cluster.main.kube_config[0].host
  cluster_ca_certificate = base64decode(azurerm_kubernetes_cluster.main.kube_config[0].cluster_ca_certificate)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "az"
    args = [
      "aks",
      "get-credentials",
      "--resource-group", azurerm_resource_group.aks.name,
      "--name", azurerm_kubernetes_cluster.main.name,
      "--format", "exec"
    ]
  }
}
```

### Deploy Application from ACR

```hcl
# terraform/app-deployment.tf

# Create namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"

    labels = {
      environment = "production"
      managed-by  = "terraform"
    }
  }

  depends_on = [azurerm_kubernetes_cluster.main]
}

# Deployment
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
          app     = "myapp"
          version = "1.0.0"
        }

        annotations = {
          "prometheus.io/scrape" = "true"
          "prometheus.io/port"   = "8080"
        }
      }

      spec {
        # Use user node pool
        node_selector = {
          "nodepool-type" = "user"
        }

        # Service account
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = "myapp"
          image = "${azurerm_container_registry.main.login_server}/myapp:1.0.0"

          port {
            name           = "http"
            container_port = 8080
            protocol       = "TCP"
          }

          # Resource limits
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
            timeout_seconds       = 3
            failure_threshold     = 3
          }

          # Environment variables from ConfigMap
          env_from {
            config_map_ref {
              name = kubernetes_config_map.app.metadata[0].name
            }
          }

          # Secrets as environment variables
          env {
            name = "DATABASE_PASSWORD"
            value_from {
              secret_key_ref {
                name = kubernetes_secret.app.metadata[0].name
                key  = "db-password"
              }
            }
          }

          # Security context
          security_context {
            run_as_non_root            = true
            run_as_user                = 1000
            read_only_root_filesystem  = true
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
            }
          }
        }

        # Pod security context
        security_context {
          fs_group    = 1000
          run_as_user = 1000
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

  depends_on = [
    azurerm_role_assignment.aks_acr_pull
  ]
}

# Service
resource "kubernetes_service" "app" {
  metadata {
    name      = "myapp-service"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "service.beta.kubernetes.io/azure-load-balancer-internal" = "false"
    }
  }

  spec {
    selector = {
      app = "myapp"
    }

    port {
      name        = "http"
      port        = 80
      target_port = 8080
      protocol    = "TCP"
    }

    type = "LoadBalancer"

    # Session affinity
    session_affinity = "ClientIP"
  }
}

# Service Account
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "myapp-sa"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app = "myapp"
    }
  }
}

# ConfigMap
resource "kubernetes_config_map" "app" {
  metadata {
    name      = "myapp-config"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  data = {
    APP_ENV     = "production"
    LOG_LEVEL   = "info"
    PORT        = "8080"
    DB_HOST     = "postgres.database.azure.com"
    DB_PORT     = "5432"
    DB_NAME     = "myapp"
  }
}

# Secret (use Azure Key Vault in production)
resource "kubernetes_secret" "app" {
  metadata {
    name      = "myapp-secret"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  type = "Opaque"

  data = {
    db-password = base64encode(var.db_password)
  }
}
```

---

## 5. Azure Key Vault Integration

### Using CSI Secret Store Driver

```hcl
# terraform/keyvault.tf

# Azure Key Vault
resource "azurerm_key_vault" "main" {
  name                = "kv-${var.cluster_name}-${var.environment}"
  location            = azurerm_resource_group.aks.location
  resource_group_name = azurerm_resource_group.aks.name
  tenant_id           = data.azurerm_client_config.current.tenant_id

  sku_name = "premium"

  # Soft delete and purge protection
  soft_delete_retention_days = 7
  purge_protection_enabled   = true

  # Network ACLs
  network_acls {
    default_action = "Deny"
    bypass         = "AzureServices"

    ip_rules = ["0.0.0.0/0"]  # Replace with your IP ranges
  }

  # RBAC authorization
  enable_rbac_authorization = true

  tags = azurerm_resource_group.aks.tags
}

# Grant AKS access to Key Vault
resource "azurerm_role_assignment" "aks_keyvault" {
  principal_id         = azurerm_kubernetes_cluster.main.key_vault_secrets_provider[0].secret_identity[0].object_id
  role_definition_name = "Key Vault Secrets User"
  scope                = azurerm_key_vault.main.id
}

# Store secret in Key Vault
resource "azurerm_key_vault_secret" "db_password" {
  name         = "db-password"
  value        = var.db_password
  key_vault_id = azurerm_key_vault.main.id

  depends_on = [azurerm_role_assignment.aks_keyvault]
}

# Current client config
data "azurerm_client_config" "current" {}
```

### Use Key Vault Secret in Pod

```hcl
# terraform/secretproviderclass.tf

resource "kubernetes_manifest" "secret_provider_class" {
  manifest = {
    apiVersion = "secrets-store.csi.x-k8s.io/v1"
    kind       = "SecretProviderClass"
    metadata = {
      name      = "azure-keyvault-secrets"
      namespace = kubernetes_namespace.app.metadata[0].name
    }
    spec = {
      provider = "azure"
      parameters = {
        usePodIdentity         = "false"
        useVMManagedIdentity   = "true"
        userAssignedIdentityID = azurerm_kubernetes_cluster.main.key_vault_secrets_provider[0].secret_identity[0].client_id
        keyvaultName          = azurerm_key_vault.main.name
        tenantId              = data.azurerm_client_config.current.tenant_id
        objects = yamlencode([
          {
            objectName = azurerm_key_vault_secret.db_password.name
            objectType = "secret"
            objectAlias = "dbPassword"
          }
        ])
      }
      secretObjects = [
        {
          secretName = "keyvault-secrets"
          type       = "Opaque"
          data = [
            {
              objectName = "dbPassword"
              key        = "db-password"
            }
          ]
        }
      ]
    }
  }

  depends_on = [
    azurerm_kubernetes_cluster.main,
    azurerm_key_vault_secret.db_password
  ]
}
```

---

## 6. DevSecOps Best Practices for AKS

### 1. Enable Azure Defender for Kubernetes

```hcl
# terraform/security.tf

# Enable Azure Defender for Containers
resource "azurerm_security_center_subscription_pricing" "defender_containers" {
  tier          = "Standard"
  resource_type = "Containers"
}

# Enable Azure Policy for AKS
resource "azurerm_policy_assignment" "aks_policy" {
  name                 = "aks-policy-${var.environment}"
  scope                = azurerm_kubernetes_cluster.main.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/e345b0fd-61be-4b90-9e4c-b8b3f9b39d56"  # Kubernetes cluster containers should only use allowed images
  description          = "Restrict container images to approved registries"

  parameters = jsonencode({
    allowedContainerImagesRegex = {
      value = "^${azurerm_container_registry.main.login_server}/.+$"
    }
  })
}
```

### 2. Pod Security Standards

```hcl
# terraform/pod-security.tf

# Pod Security Policy using Pod Security Standards
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

### 3. Network Policies

```hcl
# terraform/network-policy.tf

# Network policy to restrict traffic
resource "kubernetes_network_policy" "app" {
  metadata {
    name      = "app-network-policy"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    pod_selector {
      match_labels = {
        app = "myapp"
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

      ports {
        port     = "8080"
        protocol = "TCP"
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
      }

      ports {
        port     = "53"
        protocol = "UDP"
      }
    }

    egress {
      # Allow database
      to {
        pod_selector {
          match_labels = {
            app = "postgres"
          }
        }
      }

      ports {
        port     = "5432"
        protocol = "TCP"
      }
    }
  }
}
```

---

## 7. Cost Optimization

### Strategies

1. **Use Spot Instances**: Already configured in user node pool
2. **Autoscaling**: HPA and Cluster Autoscaler
3. **Right-size VMs**: Choose appropriate VM sizes
4. **Use Azure Hybrid Benefit**: If you have Windows Server licenses
5. **Reserved Instances**: For predictable workloads

### Cluster Autoscaler

The cluster autoscaler is automatically enabled when you set `enable_auto_scaling = true` in the node pool configuration.

### Horizontal Pod Autoscaler

```hcl
# terraform/hpa.tf

resource "kubernetes_horizontal_pod_autoscaler_v2" "app" {
  metadata {
    name      = "myapp-hpa"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    scale_target_ref {
      api_version = "apps/v1"
      kind        = "Deployment"
      name        = kubernetes_deployment.app.metadata[0].name
    }

    min_replicas = 3
    max_replicas = 20

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

    behavior {
      scale_down {
        stabilization_window_seconds = 300

        policy {
          type          = "Percent"
          value         = 50
          period_seconds = 15
        }
      }

      scale_up {
        stabilization_window_seconds = 0

        policy {
          type          = "Percent"
          value         = 100
          period_seconds = 15
        }

        policy {
          type          = "Pods"
          value         = 4
          period_seconds = 15
        }

        select_policy = "Max"
      }
    }
  }
}
```

---

## 8. Monitoring and Logging

### Azure Monitor Integration

Azure Monitor is already enabled via the `oms_agent` block. View logs and metrics in:
- Azure Portal > AKS Cluster > Monitoring > Insights
- Azure Portal > Log Analytics Workspace > Logs

### Common Queries

```kusto
// Container CPU usage
Perf
| where ObjectName == "K8SContainer"
| where CounterName == "cpuUsageNanoCores"
| summarize AvgCPU = avg(CounterValue) by bin(TimeGenerated, 5m), InstanceName

// Container memory usage
Perf
| where ObjectName == "K8SContainer"
| where CounterName == "memoryRssBytes"
| summarize AvgMemory = avg(CounterValue) by bin(TimeGenerated, 5m), InstanceName

// Pod logs
ContainerLog
| where ContainerName == "myapp"
| project TimeGenerated, LogEntry, ContainerName
| order by TimeGenerated desc
```

---

## 9. Common Issues and Troubleshooting

### Issue 1: Unable to Pull Image from ACR

**Symptoms**: ImagePullBackOff error

**Solutions**:
```bash
# Verify ACR role assignment
az role assignment list --assignee <kubelet-identity-object-id> --scope <acr-id>

# Check AKS can reach ACR
kubectl run test --image=<acr-name>.azurecr.io/myapp:1.0.0
kubectl describe pod test
```

### Issue 2: Pods Not Scheduled

**Symptoms**: Pods in Pending state

**Solutions**:
```bash
# Check node capacity
kubectl describe nodes

# Check taints
kubectl get nodes -o custom-columns=NAME:.metadata.name,TAINTS:.spec.taints

# Remove taint if needed (for testing only)
kubectl taint nodes <node-name> CriticalAddonsOnly-
```

### Issue 3: Network Policy Blocking Traffic

**Symptoms**: Connection timeouts between pods

**Solutions**:
```bash
# Check network policies
kubectl get networkpolicies -n production

# Describe network policy
kubectl describe networkpolicy app-network-policy -n production

# Temporarily remove network policy for testing
kubectl delete networkpolicy app-network-policy -n production
```

---

## 10. Hands-On Exercises

### Exercise 1: Deploy AKS Cluster

1. Clone the Terraform configuration
2. Update variables for your environment
3. Run `terraform init` and `terraform apply`
4. Connect to the cluster: `az aks get-credentials --resource-group <rg> --name <aks-name>`
5. Verify: `kubectl get nodes`

### Exercise 2: Deploy Application to AKS

1. Build and push an image to ACR
2. Deploy the application using Terraform
3. Expose it via LoadBalancer service
4. Access the application via public IP

### Exercise 3: Implement Auto-Scaling

1. Deploy the HPA configuration
2. Generate load on the application
3. Observe pods scaling up
4. Remove load and observe scale down

### Exercise 4: Integrate with Azure Key Vault

1. Create a Key Vault
2. Store a secret
3. Use CSI Secret Store Driver to mount the secret
4. Verify the secret is available in the pod

---

## Summary

In this lesson, you learned:
- AKS architecture and components
- How to provision AKS using Terraform
- Integrating with Azure Container Registry
- Deploying applications to AKS
- Azure Key Vault integration for secrets
- DevSecOps best practices for AKS
- Cost optimization strategies
- Monitoring and troubleshooting

### Next Steps

- **Lesson 3**: Amazon EKS with Terraform
- **Lesson 4**: Google Kubernetes Engine with Terraform
- Explore AKS advanced features (Virtual Nodes, KEDA, Dapr)
- Implement GitOps with Flux or ArgoCD

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty Level**: Intermediate

**Cost Estimate**: $3-5 per day for basic cluster
