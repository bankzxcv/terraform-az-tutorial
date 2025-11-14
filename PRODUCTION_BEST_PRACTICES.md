# 🏗️ Production Infrastructure Best Practices

## Overview

This guide covers **production-ready patterns** for building secure, scalable, and maintainable infrastructure with Terraform and Azure. These are battle-tested practices used by companies running mission-critical workloads.

---

## 📚 Table of Contents

- [Architecture Design](#architecture-design)
- [Security](#security)
- [Cost Optimization](#cost-optimization)
- [High Availability](#high-availability)
- [Monitoring & Observability](#monitoring--observability)
- [State Management](#state-management)
- [Multi-Environment Strategy](#multi-environment-strategy)
- [CI/CD Integration](#cicd-integration)
- [Disaster Recovery](#disaster-recovery)
- [Compliance](#compliance)

---

## 🏛️ Architecture Design

### 1. Infrastructure Layers

Organize infrastructure into logical layers:

```
┌─────────────────────────────────────────────────────────┐
│                    APPLICATION LAYER                     │
│  (App Services, Functions, Kubernetes, VMs)             │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                     DATA LAYER                          │
│  (Databases, Storage, Cache, Message Queues)            │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   NETWORK LAYER                         │
│  (VNets, Subnets, NSGs, Load Balancers, Gateways)       │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 FOUNDATION LAYER                        │
│  (Resource Groups, Identity, Key Vault, Policies)       │
└─────────────────────────────────────────────────────────┘
```

**Terraform Structure:**

```
infrastructure/
├── foundation/          # Base layer
│   ├── resource-groups/
│   ├── identity/
│   └── key-vault/
├── networking/          # Network layer
│   ├── vnets/
│   ├── subnets/
│   └── nsgs/
├── data/               # Data layer
│   ├── databases/
│   ├── storage/
│   └── cache/
└── applications/       # Application layer
    ├── web-apps/
    ├── functions/
    └── containers/
```

### 2. Module Design Principles

**Single Responsibility**
```hcl
# ✅ GOOD: Module does one thing well
module "storage_account" {
  source = "./modules/storage-account"
  # ... focused on storage only
}

# ❌ BAD: Module does too many things
module "everything" {
  source = "./modules/full-stack"  # Don't do this!
  # ... storage, network, compute, etc.
}
```

**Encapsulation**
```hcl
# ✅ GOOD: Hide implementation details
module "database" {
  source = "./modules/postgresql"

  # Simple interface
  database_name = "mydb"
  sku          = "B_Gen5_1"
}

# Module handles complexity internally
# - Networking
# - Firewall rules
# - Backup configuration
# - Monitoring
```

**Composition Over Inheritance**
```hcl
# ✅ GOOD: Compose modules
module "web_app" {
  source = "./modules/web-app"

  # Uses other modules internally
  network_module = module.network
  storage_module = module.storage
}
```

### 3. Naming Conventions

**Resource Naming Standard**
```hcl
locals {
  # Pattern: <resource-type>-<workload>-<environment>-<region>-<instance>
  naming_prefix = "${var.resource_type}-${var.workload}-${var.environment}-${var.region}"

  # Examples:
  # rg-api-prod-eastus-001
  # st-api-prod-eastus-001
  # kv-api-prod-eastus-001
  # app-api-prod-eastus-001
}

resource "azurerm_resource_group" "main" {
  name     = "${local.naming_prefix}-001"
  location = var.location

  tags = local.common_tags
}
```

**Resource Type Abbreviations** (Microsoft recommended):

| Resource | Abbreviation | Example |
|----------|--------------|---------|
| Resource Group | rg | rg-prod-eastus |
| Storage Account | st | stprodeastus001 |
| Key Vault | kv | kv-prod-eastus |
| App Service | app | app-api-prod |
| Function App | func | func-processor-prod |
| Virtual Network | vnet | vnet-prod-eastus |
| Subnet | snet | snet-web-prod |
| Network Security Group | nsg | nsg-web-prod |
| Load Balancer | lb | lb-web-prod |

### 4. Tagging Strategy

```hcl
locals {
  # Standard tags for all resources
  common_tags = {
    Environment  = var.environment
    ManagedBy    = "Terraform"
    Project      = var.project_name
    CostCenter   = var.cost_center
    Owner        = var.owner_email
    CreatedDate  = formatdate("YYYY-MM-DD", timestamp())

    # Business tags
    BusinessUnit = var.business_unit
    Application  = var.application_name

    # Technical tags
    Terraform    = "true"
    Repository   = var.git_repo_url
    IaCVersion   = var.terraform_version

    # Compliance tags
    DataClassification = var.data_classification
    Compliance        = var.compliance_framework
  }
}

resource "azurerm_resource_group" "example" {
  name     = "rg-example"
  location = "East US"
  tags     = local.common_tags
}
```

---

## 🔒 Security

### 1. Authentication & Authorization

**Service Principal (Recommended for Production)**

```hcl
# DON'T hardcode credentials!
# Use environment variables instead

# provider.tf
provider "azurerm" {
  features {}

  # Reads from environment variables:
  # ARM_CLIENT_ID
  # ARM_CLIENT_SECRET
  # ARM_SUBSCRIPTION_ID
  # ARM_TENANT_ID
}
```

**Managed Identity (Best for Azure-hosted CI/CD)**

```hcl
provider "azurerm" {
  features {}

  use_msi = true
}
```

**Set up Service Principal:**

```bash
# Create service principal
az ad sp create-for-rbac \
  --name "terraform-prod" \
  --role "Contributor" \
  --scopes "/subscriptions/${SUBSCRIPTION_ID}" \
  --sdk-auth

# Store credentials in Azure Key Vault or CI/CD secrets
# NEVER commit credentials to Git!
```

### 2. Secrets Management

**Azure Key Vault Integration**

```hcl
# Data source to read secrets
data "azurerm_key_vault" "main" {
  name                = "kv-prod-secrets"
  resource_group_name = "rg-shared-prod"
}

data "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

# Use secret in configuration
resource "azurerm_postgresql_server" "main" {
  name                = "psql-prod"
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value

  # ...
}
```

**Terraform Sensitive Variables**

```hcl
variable "database_password" {
  description = "Database admin password"
  type        = string
  sensitive   = true  # Won't show in logs
}

output "connection_string" {
  value     = azurerm_postgresql_server.main.connection_string
  sensitive = true  # Won't display in console
}
```

### 3. Network Security

**Network Segmentation**

```hcl
# Hub-Spoke Network Architecture
module "hub_network" {
  source = "./modules/hub-network"

  address_space = "10.0.0.0/16"
  subnets = {
    firewall = "10.0.1.0/24"
    gateway  = "10.0.2.0/24"
    bastion  = "10.0.3.0/24"
  }
}

module "spoke_network_web" {
  source = "./modules/spoke-network"

  address_space = "10.1.0.0/16"
  subnets = {
    web = "10.1.1.0/24"
    app = "10.1.2.0/24"
    data = "10.1.3.0/24"
  }

  hub_network_id = module.hub_network.id
}
```

**Network Security Groups**

```hcl
resource "azurerm_network_security_group" "web" {
  name                = "nsg-web-prod"
  location            = var.location
  resource_group_name = var.resource_group_name

  # Allow HTTPS from internet
  security_rule {
    name                       = "AllowHTTPS"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "443"
    source_address_prefix      = "Internet"
    destination_address_prefix = "*"
  }

  # Deny all other inbound
  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range          = "*"
    destination_port_range     = "*"
    source_address_prefix      = "*"
    destination_address_prefix = "*"
  }
}
```

**Private Endpoints**

```hcl
# Storage with private endpoint (no public access)
resource "azurerm_storage_account" "secure" {
  name                     = "stsecureprod"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Disable public access
  public_network_access_enabled = false

  # Security settings
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
}

# Private endpoint
resource "azurerm_private_endpoint" "storage" {
  name                = "pe-storage-prod"
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.private_subnet_id

  private_service_connection {
    name                           = "psc-storage"
    private_connection_resource_id = azurerm_storage_account.secure.id
    subresource_names              = ["blob"]
    is_manual_connection           = false
  }
}
```

### 4. Identity & Access Management

**Managed Identities**

```hcl
# Enable managed identity for App Service
resource "azurerm_linux_web_app" "api" {
  name     = "app-api-prod"
  location = var.location
  # ...

  identity {
    type = "SystemAssigned"
  }
}

# Grant access to Key Vault
resource "azurerm_key_vault_access_policy" "app" {
  key_vault_id = azurerm_key_vault.main.id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_linux_web_app.api.identity[0].principal_id

  secret_permissions = ["Get", "List"]
}
```

**RBAC (Role-Based Access Control)**

```hcl
# Assign Reader role to a group
resource "azurerm_role_assignment" "readers" {
  scope                = azurerm_resource_group.prod.id
  role_definition_name = "Reader"
  principal_id         = var.read_only_group_id
}

# Custom role for specific operations
resource "azurerm_role_definition" "app_deployer" {
  name  = "Application Deployer"
  scope = azurerm_resource_group.prod.id

  permissions {
    actions = [
      "Microsoft.Web/sites/write",
      "Microsoft.Web/sites/restart/action"
    ]
    not_actions = []
  }
}
```

---

## 💰 Cost Optimization

### 1. Right-Sizing Resources

**Use Appropriate SKUs**

```hcl
# ✅ GOOD: Start small, scale up if needed
resource "azurerm_service_plan" "dev" {
  name     = "plan-dev"
  os_type  = "Linux"
  sku_name = "B1"  # Basic tier for dev
}

resource "azurerm_service_plan" "prod" {
  name     = "plan-prod"
  os_type  = "Linux"
  sku_name = "P1v2"  # Premium for production
}

# ❌ BAD: Over-provisioning for dev
resource "azurerm_service_plan" "dev" {
  sku_name = "P3v3"  # Expensive! Not needed for dev
}
```

### 2. Auto-Shutdown for Non-Production

```hcl
# Auto-shutdown for dev VMs
resource "azurerm_dev_test_global_vm_shutdown_schedule" "dev_vm" {
  virtual_machine_id = azurerm_linux_virtual_machine.dev.id
  location           = var.location
  enabled            = true

  daily_recurrence_time = "1900"  # Shutdown at 7 PM
  timezone              = "UTC"

  notification_settings {
    enabled = false
  }
}
```

### 3. Consumption-Based Pricing

```hcl
# ✅ GOOD: Consumption plan for Functions (pay per execution)
resource "azurerm_service_plan" "function" {
  name     = "plan-functions"
  os_type  = "Linux"
  sku_name = "Y1"  # Consumption plan
}

# For workloads with sporadic traffic
```

### 4. Resource Lifecycle Management

```hcl
# Auto-delete old backups
resource "azurerm_storage_management_policy" "lifecycle" {
  storage_account_id = azurerm_storage_account.backups.id

  rule {
    name    = "deleteOldBackups"
    enabled = true

    filters {
      prefix_match = ["backups/"]
      blob_types   = ["blockBlob"]
    }

    actions {
      base_blob {
        delete_after_days_since_modification_greater_than = 30
      }
    }
  }
}
```

### 5. Reserved Instances (for predictable workloads)

```bash
# Purchase reserved capacity via Azure Portal or CLI
# 1-year or 3-year commitments for 40-60% savings

az reservations reservation-order list
```

---

## 🔄 High Availability

### 1. Multi-Region Deployment

```hcl
# Deploy to multiple regions
locals {
  regions = {
    primary   = "East US"
    secondary = "West US"
  }
}

module "app_primary" {
  source = "./modules/web-app"

  name     = "app-prod-eastus"
  location = local.regions.primary
  # ...
}

module "app_secondary" {
  source = "./modules/web-app"

  name     = "app-prod-westus"
  location = local.regions.secondary
  # ...
}

# Traffic Manager for load balancing
resource "azurerm_traffic_manager_profile" "main" {
  name                   = "tm-prod"
  resource_group_name    = var.resource_group_name
  traffic_routing_method = "Priority"

  dns_config {
    relative_name = "myapp-prod"
    ttl           = 60
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}
```

### 2. Availability Zones

```hcl
# Deploy VMs across availability zones
resource "azurerm_linux_virtual_machine" "web" {
  count = 3

  name                = "vm-web-${count.index + 1}"
  location            = var.location
  resource_group_name = var.resource_group_name
  size                = "Standard_D2s_v3"
  zone                = tostring(count.index + 1)  # Zones 1, 2, 3

  # ...
}
```

### 3. Health Checks & Monitoring

```hcl
# App Service health check
resource "azurerm_linux_web_app" "api" {
  name = "app-api-prod"
  # ...

  site_config {
    health_check_path                 = "/health"
    health_check_eviction_time_in_min = 5
  }
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "ai-prod"
  location            = var.location
  resource_group_name = var.resource_group_name
  application_type    = "web"

  retention_in_days = 90
}

# Alert on health check failures
resource "azurerm_monitor_metric_alert" "health_check" {
  name                = "alert-health-check-failed"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_linux_web_app.api.id]
  description         = "Alert when health check fails"

  criteria {
    metric_namespace = "Microsoft.Web/sites"
    metric_name      = "HealthCheckStatus"
    aggregation      = "Average"
    operator         = "LessThan"
    threshold        = 1
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}
```

---

## 📊 Monitoring & Observability

### 1. Centralized Logging

```hcl
# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "law-prod"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

# Send logs to workspace
resource "azurerm_monitor_diagnostic_setting" "app" {
  name                       = "diag-app-prod"
  target_resource_id         = azurerm_linux_web_app.api.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "AppServiceHTTPLogs"
  }

  enabled_log {
    category = "AppServiceConsoleLogs"
  }

  metric {
    category = "AllMetrics"
  }
}
```

### 2. Alerting Strategy

```hcl
# Action group for alerts
resource "azurerm_monitor_action_group" "ops" {
  name                = "ag-ops-team"
  resource_group_name = var.resource_group_name
  short_name          = "ops"

  email_receiver {
    name          = "ops-email"
    email_address = "ops@company.com"
  }

  webhook_receiver {
    name        = "slack"
    service_uri = var.slack_webhook_url
  }
}

# CPU alert
resource "azurerm_monitor_metric_alert" "high_cpu" {
  name                = "alert-high-cpu"
  resource_group_name = var.resource_group_name
  scopes              = [azurerm_service_plan.prod.id]

  criteria {
    metric_namespace = "Microsoft.Web/serverFarms"
    metric_name      = "CpuPercentage"
    aggregation      = "Average"
    operator         = "GreaterThan"
    threshold        = 80
  }

  action {
    action_group_id = azurerm_monitor_action_group.ops.id
  }
}
```

---

## 📦 State Management

### 1. Remote State Backend

**Azure Storage Backend (Recommended)**

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstateprod"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"

    # Enable encryption
    use_azuread_auth = true
  }
}
```

**Setup Script:**

```bash
#!/bin/bash
# Create state storage

RESOURCE_GROUP_NAME="rg-terraform-state"
STORAGE_ACCOUNT_NAME="sttfstateprod"
CONTAINER_NAME="tfstate"
LOCATION="East US"

# Create resource group
az group create \
  --name $RESOURCE_GROUP_NAME \
  --location "$LOCATION"

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --location "$LOCATION" \
  --sku Standard_GRS \
  --encryption-services blob \
  --https-only true \
  --min-tls-version TLS1_2

# Create container
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --auth-mode login

# Enable versioning
az storage account blob-service-properties update \
  --account-name $STORAGE_ACCOUNT_NAME \
  --enable-versioning true
```

### 2. State Locking

```hcl
# State locking is automatic with Azure backend
# Prevents concurrent modifications
# No additional configuration needed!
```

### 3. State File Security

```bash
# ✅ DO:
- Store state in encrypted backend
- Use RBAC to control access
- Enable versioning
- Regular backups
- Never commit state to Git

# ❌ DON'T:
- Store state locally in production
- Share state files via email
- Commit state to version control
- Allow public access to state storage
```

---

## 🌍 Multi-Environment Strategy

### 1. Workspace-Based Environments

```hcl
# Use workspaces for environments
# terraform workspace new dev
# terraform workspace new staging
# terraform workspace new prod

locals {
  environment = terraform.workspace

  # Environment-specific configuration
  config = {
    dev = {
      sku_name     = "B1"
      replica_count = 1
      backup_retention = 7
    }
    staging = {
      sku_name     = "P1v2"
      replica_count = 2
      backup_retention = 14
    }
    prod = {
      sku_name     = "P2v3"
      replica_count = 3
      backup_retention = 30
    }
  }
}

resource "azurerm_service_plan" "main" {
  name     = "plan-${local.environment}"
  sku_name = local.config[local.environment].sku_name
  # ...
}
```

### 2. Directory-Based Environments

```
environments/
├── dev/
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars
├── staging/
│   ├── main.tf
│   ├── variables.tf
│   └── terraform.tfvars
└── prod/
    ├── main.tf
    ├── variables.tf
    └── terraform.tfvars
```

### 3. Variable Files Per Environment

```hcl
# terraform.tfvars (dev)
environment      = "dev"
app_service_sku  = "B1"
database_sku     = "B_Gen5_1"
enable_monitoring = false

# terraform.tfvars (prod)
environment      = "prod"
app_service_sku  = "P2v3"
database_sku     = "GP_Gen5_4"
enable_monitoring = true
enable_backup    = true
multi_region     = true
```

---

## 🚀 CI/CD Integration

### 1. GitHub Actions

```yaml
# .github/workflows/terraform.yml
name: Terraform CI/CD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
  ARM_CLIENT_SECRET: ${{ secrets.AZURE_CLIENT_SECRET }}
  ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
  ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Terraform Format
        run: terraform fmt -check

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply
        if: github.ref == 'refs/heads/main' && github.event_name == 'push'
        run: terraform apply -auto-approve tfplan
```

### 2. Azure DevOps

```yaml
# azure-pipelines.yml
trigger:
  branches:
    include:
      - main

pool:
  vmImage: 'ubuntu-latest'

variables:
  - group: terraform-secrets

stages:
  - stage: Plan
    jobs:
      - job: TerraformPlan
        steps:
          - task: TerraformInstaller@0
            inputs:
              terraformVersion: '1.5.0'

          - task: TerraformCLI@0
            inputs:
              command: 'init'
              backendType: 'azurerm'
              backendServiceArm: 'Azure-Service-Connection'

          - task: TerraformCLI@0
            inputs:
              command: 'plan'
              environmentServiceName: 'Azure-Service-Connection'

  - stage: Apply
    dependsOn: Plan
    condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'))
    jobs:
      - deployment: TerraformApply
        environment: 'production'
        strategy:
          runOnce:
            deploy:
              steps:
                - task: TerraformCLI@0
                  inputs:
                    command: 'apply'
                    environmentServiceName: 'Azure-Service-Connection'
```

---

## 🔥 Disaster Recovery

### 1. Backup Strategy

```hcl
# Automated backups
resource "azurerm_backup_policy_vm" "daily" {
  name                = "backup-policy-daily"
  resource_group_name = var.resource_group_name
  recovery_vault_name = azurerm_recovery_services_vault.main.name

  timezone = "UTC"

  backup {
    frequency = "Daily"
    time      = "23:00"
  }

  retention_daily {
    count = 30
  }

  retention_weekly {
    count    = 12
    weekdays = ["Sunday"]
  }

  retention_monthly {
    count    = 12
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }
}
```

### 2. Geo-Redundancy

```hcl
# GRS Storage for critical data
resource "azurerm_storage_account" "critical" {
  name                     = "stcriticalprod"
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant

  # Enable RA-GRS for read access
  # account_replication_type = "RAGRS"
}
```

### 3. Recovery Plan

```markdown
## Disaster Recovery Runbook

### RTO (Recovery Time Objective): 4 hours
### RPO (Recovery Point Objective): 1 hour

1. **Failover to Secondary Region**
   ```bash
   # Switch DNS to secondary region
   terraform workspace select disaster-recovery
   terraform apply -var="primary_region=West US"
   ```

2. **Restore from Backup**
   ```bash
   # Restore database from geo-redundant backup
   az postgres server restore \
     --resource-group rg-prod \
     --name psql-prod-restored \
     --restore-point-in-time "2024-01-01T00:00:00Z" \
     --source-server psql-prod
   ```

3. **Verify Services**
   - Check health endpoints
   - Validate database connectivity
   - Test critical user flows
```

---

## ✅ Compliance & Governance

### 1. Azure Policy

```hcl
# Enforce tagging
resource "azurerm_policy_definition" "require_tags" {
  name         = "require-tags"
  policy_type  = "Custom"
  mode         = "Indexed"
  display_name = "Require specific tags"

  policy_rule = <<POLICY_RULE
  {
    "if": {
      "anyOf": [
        {
          "field": "tags['Environment']",
          "exists": "false"
        },
        {
          "field": "tags['Owner']",
          "exists": "false"
        }
      ]
    },
    "then": {
      "effect": "deny"
    }
  }
  POLICY_RULE
}

# Assign policy
resource "azurerm_subscription_policy_assignment" "require_tags" {
  name                 = "require-tags-assignment"
  subscription_id      = data.azurerm_subscription.current.id
  policy_definition_id = azurerm_policy_definition.require_tags.id
}
```

### 2. Audit Logging

```hcl
# Activity log to storage
resource "azurerm_monitor_log_profile" "audit" {
  name = "audit-logs"

  categories = [
    "Action",
    "Delete",
    "Write",
  ]

  locations = [
    "global",
    "East US",
  ]

  storage_account_id = azurerm_storage_account.audit_logs.id

  retention_policy {
    enabled = true
    days    = 365
  }
}
```

---

## 📋 Checklist: Production Readiness

### Security
- [ ] Service principal authentication configured
- [ ] Secrets stored in Key Vault
- [ ] Network security groups implemented
- [ ] Private endpoints for sensitive services
- [ ] RBAC configured with least privilege
- [ ] TLS 1.2+ enforced
- [ ] Managed identities enabled

### Reliability
- [ ] Multi-region deployment (if required)
- [ ] Availability zones utilized
- [ ] Health checks configured
- [ ] Auto-scaling enabled
- [ ] Backup policy implemented
- [ ] Disaster recovery plan documented

### Monitoring
- [ ] Application Insights enabled
- [ ] Log Analytics workspace configured
- [ ] Alerts configured for critical metrics
- [ ] Action groups set up
- [ ] Runbooks for common incidents

### Cost
- [ ] Appropriate SKUs selected
- [ ] Auto-shutdown for non-prod resources
- [ ] Budget alerts configured
- [ ] Resource lifecycle policies
- [ ] Reserved instances (if applicable)

### Governance
- [ ] Tagging strategy implemented
- [ ] Azure policies enforced
- [ ] Audit logging enabled
- [ ] Compliance requirements met
- [ ] Documentation complete

### DevOps
- [ ] Remote state backend configured
- [ ] CI/CD pipeline implemented
- [ ] Automated testing
- [ ] Environment separation
- [ ] Change management process

---

## 🎓 Summary

Following these best practices will help you build:
- **Secure** infrastructure that protects your data and applications
- **Reliable** systems that stay online and recover from failures
- **Cost-effective** solutions that optimize cloud spending
- **Compliant** infrastructure that meets regulatory requirements
- **Maintainable** code that's easy to understand and modify

Remember: **Start simple, iterate, and improve continuously!**

---

## 📚 Additional Resources

- [Azure Well-Architected Framework](https://docs.microsoft.com/en-us/azure/architecture/framework/)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [Azure Security Baseline](https://docs.microsoft.com/en-us/security/benchmark/azure/)
- [Cloud Adoption Framework](https://docs.microsoft.com/en-us/azure/cloud-adoption-framework/)
