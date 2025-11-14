# Terraform Workspaces

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [What Are Workspaces?](#what-are-workspaces)
- [When to Use Workspaces](#when-to-use-workspaces)
- [Working with Workspaces](#working-with-workspaces)
- [Multi-Environment Patterns](#multi-environment-patterns)
- [Workspace Best Practices](#workspace-best-practices)
- [Alternatives to Workspaces](#alternatives-to-workspaces)
- [Next Steps](#next-steps)

---

## Overview

Terraform workspaces allow you to manage multiple instances of the same infrastructure configuration. They're particularly useful for managing development, staging, and production environments from a single codebase while maintaining separate state files.

---

## Learning Objectives

By the end of this guide, you will:
- Understand what Terraform workspaces are and how they work
- Create and manage multiple workspaces
- Use workspaces for multi-environment deployments
- Reference the current workspace in configurations
- Know when to use workspaces vs alternative patterns
- Follow best practices for workspace management

---

## Difficulty Level

**Advanced** - Requires understanding of Terraform basics and state management.

---

## Time Estimate

**30-40 minutes** - Including hands-on practice.

---

## What Are Workspaces?

**Workspaces** are named containers for Terraform state that allow multiple state files to exist for the same configuration.

**Key Concepts:**
- Each workspace has its own state file
- Same configuration code, different state
- Useful for managing multiple environments
- Default workspace is named `default`

**Workspace State Location:**

**Local backend:**
```
terraform.tfstate.d/
├── development/
│   └── terraform.tfstate
├── staging/
│   └── terraform.tfstate
└── production/
    └── terraform.tfstate
```

**Remote backend (Azure Storage):**
```
Container: tfstate
├── env:/development/production.terraform.tfstate
├── env:/staging/production.terraform.tfstate
└── env:/production/production.terraform.tfstate
```

---

## When to Use Workspaces

### Good Use Cases

✅ **Testing infrastructure changes:**
- Create temporary workspace for testing
- Destroy when done

✅ **Developer environments:**
- Each developer has their own workspace
- Isolated from each other

✅ **Simple multi-environment deployments:**
- Development, staging, production
- Same configuration with different parameters

✅ **Feature branch testing:**
- Create workspace per feature branch
- Test infrastructure changes

---

### When NOT to Use Workspaces

❌ **Different configurations per environment:**
- If prod needs different resources than dev
- Use separate directories instead

❌ **Different cloud providers:**
- Azure for dev, AWS for prod
- Use separate configurations

❌ **High security requirements:**
- Production requires strict separation
- Use separate backends/state files

❌ **Complex multi-region deployments:**
- Better served by modules or Terragrunt

---

## Working with Workspaces

### Basic Commands

```bash
# List workspaces (* indicates current)
terraform workspace list
# Output:
#   default
# * development
#   staging
#   production

# Show current workspace
terraform workspace show
# Output: development

# Create new workspace
terraform workspace new staging

# Switch workspace
terraform workspace select production

# Delete workspace (can't delete current workspace)
terraform workspace select default
terraform workspace delete staging
```

---

### Creating and Using Workspaces

**Example workflow:**

```bash
# Start with default workspace
terraform workspace show
# Output: default

# Create development workspace
terraform workspace new development
# Created and switched to workspace "development"

# Deploy to development
terraform init
terraform plan
terraform apply

# Create and switch to staging
terraform workspace new staging
terraform apply

# Switch to production
terraform workspace new production
terraform apply

# List all workspaces
terraform workspace list
# Output:
#   default
#   development
#   staging
# * production
```

---

## Multi-Environment Patterns

### Pattern 1: Using terraform.workspace

Reference current workspace in configuration:

**main.tf:**
```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Use workspace name in resource names
resource "azurerm_resource_group" "example" {
  name     = "rg-${terraform.workspace}"
  location = "eastus"

  tags = {
    Environment = terraform.workspace
    ManagedBy   = "Terraform"
  }
}

resource "azurerm_storage_account" "example" {
  name                     = "st${terraform.workspace}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.example.name
  location                 = azurerm_resource_group.example.location
  account_tier             = "Standard"
  account_replication_type = terraform.workspace == "production" ? "GRS" : "LRS"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
```

**Usage:**
```bash
# Deploy to development
terraform workspace select development
terraform apply
# Creates: rg-development, stdevelopmentxxxxx

# Deploy to production
terraform workspace select production
terraform apply
# Creates: rg-production, stproductionxxxxx with GRS replication
```

---

### Pattern 2: Environment-Specific Variables

**variables.tf:**
```hcl
variable "environment_config" {
  description = "Environment-specific configuration"
  type = map(object({
    location      = string
    vm_size       = string
    instance_count = number
    backup_enabled = bool
  }))
  default = {
    development = {
      location       = "westus"
      vm_size        = "Standard_B2s"
      instance_count = 1
      backup_enabled = false
    }
    staging = {
      location       = "centralus"
      vm_size        = "Standard_D2s_v3"
      instance_count = 2
      backup_enabled = false
    }
    production = {
      location       = "eastus"
      vm_size        = "Standard_D4s_v3"
      instance_count = 3
      backup_enabled = true
    }
  }
}

locals {
  config = var.environment_config[terraform.workspace]
}
```

**main.tf:**
```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-${terraform.workspace}"
  location = local.config.location
}

resource "azurerm_linux_virtual_machine" "example" {
  count = local.config.instance_count

  name                = "vm-${terraform.workspace}-${count.index}"
  resource_group_name = azurerm_resource_group.example.name
  location            = azurerm_resource_group.example.location
  size                = local.config.vm_size
  # ... other configuration
}
```

---

### Pattern 3: Workspace-Specific Variable Files

**Directory structure:**
```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── terraform.tfvars  # Common variables
├── development.tfvars
├── staging.tfvars
└── production.tfvars
```

**development.tfvars:**
```hcl
location       = "westus"
vm_size        = "Standard_B2s"
instance_count = 1
enable_backup  = false
```

**production.tfvars:**
```hcl
location       = "eastus"
vm_size        = "Standard_D4s_v3"
instance_count = 5
enable_backup  = true
```

**Usage:**
```bash
# Development
terraform workspace select development
terraform apply -var-file="development.tfvars"

# Production
terraform workspace select production
terraform apply -var-file="production.tfvars"
```

---

### Pattern 4: Conditional Resources

```hcl
# Only create in production
resource "azurerm_backup_policy_vm" "example" {
  count = terraform.workspace == "production" ? 1 : 0

  name                = "backup-policy"
  resource_group_name = azurerm_resource_group.example.name
  recovery_vault_name = azurerm_recovery_services_vault.example[0].name

  backup {
    frequency = "Daily"
    time      = "23:00"
  }
}

# Different configurations per environment
resource "azurerm_app_service_plan" "example" {
  name                = "asp-${terraform.workspace}"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name

  sku {
    tier = terraform.workspace == "production" ? "Premium" : "Standard"
    size = terraform.workspace == "production" ? "P1" : "S1"
  }
}
```

---

## Workspace Best Practices

### 1. Never Use Default Workspace for Environments

```bash
# Bad - using default
terraform workspace select default
terraform apply

# Good - named workspace
terraform workspace new development
terraform apply
```

### 2. Document Workspace Strategy

**README.md:**
```markdown
## Workspaces

This project uses workspaces for environment management:

- `development` - Dev environment (westus)
- `staging` - Staging environment (centralus)
- `production` - Production environment (eastus)

### Deployment

```bash
# Deploy to development
terraform workspace select development
terraform apply -var-file="development.tfvars"
```

### 3. Validate Workspace Before Apply

**deploy.sh:**
```bash
#!/bin/bash

WORKSPACE=$1

if [[ ! "$WORKSPACE" =~ ^(development|staging|production)$ ]]; then
  echo "Error: Invalid workspace. Use: development, staging, or production"
  exit 1
fi

terraform workspace select $WORKSPACE
terraform plan -var-file="${WORKSPACE}.tfvars" -out=tfplan

read -p "Apply changes to $WORKSPACE? (yes/no): " confirm
if [ "$confirm" == "yes" ]; then
  terraform apply tfplan
else
  echo "Deployment cancelled"
fi
```

### 4. Use Remote State with Workspaces

**backend.tf:**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "infrastructure.tfstate"
    # Workspace automatically appended to key
  }
}
```

**State file paths:**
```
env:/development/infrastructure.tfstate
env:/staging/infrastructure.tfstate
env:/production/infrastructure.tfstate
```

### 5. Tag Resources with Workspace

```hcl
locals {
  common_tags = {
    Environment = terraform.workspace
    ManagedBy   = "Terraform"
    Workspace   = terraform.workspace
    Project     = "myapp"
  }
}

resource "azurerm_resource_group" "example" {
  name     = "rg-${terraform.workspace}"
  location = "eastus"
  tags     = local.common_tags
}
```

---

## Alternatives to Workspaces

### Option 1: Separate Directories

**Better for:**
- Different configurations per environment
- Strong environment isolation
- Complex deployments

**Structure:**
```
terraform/
├── modules/
│   └── app/
├── environments/
│   ├── development/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   ├── backend.tf
│   │   └── terraform.tfvars
│   └── production/
│       ├── main.tf
│       ├── backend.tf
│       └── terraform.tfvars
```

---

### Option 2: Terragrunt

**Better for:**
- DRY configurations
- Complex multi-account setups
- Advanced workflow automation

**Example:**
```hcl
# terragrunt.hcl
terraform {
  source = "../../modules/app"
}

inputs = {
  environment = "production"
  region      = "eastus"
}
```

---

### Option 3: Terraform Cloud/Enterprise Workspaces

**Better for:**
- Team collaboration
- Policy enforcement
- Cost estimation
- VCS integration

**Features:**
- Web UI for management
- Role-based access control
- Sentinel policies
- Cost estimation

---

## Comparison Matrix

| Feature                    | Workspaces | Separate Dirs | Terragrunt | TF Cloud |
|----------------------------|------------|---------------|------------|----------|
| Same configuration         | ✅ Yes     | ❌ No         | ✅ Yes     | ✅ Yes   |
| Strong isolation           | ⚠️ Medium  | ✅ High       | ✅ High    | ✅ High  |
| Easy to setup              | ✅ Easy    | ⚠️ Medium     | ⚠️ Complex | ✅ Easy  |
| Separate state             | ✅ Yes     | ✅ Yes        | ✅ Yes     | ✅ Yes   |
| Different configurations   | ⚠️ Limited | ✅ Full       | ✅ Full    | ✅ Full  |
| Team collaboration         | ⚠️ Basic   | ⚠️ Basic      | ✅ Good    | ✅ Great |
| Cost                       | Free       | Free          | Free       | Paid     |

---

## Next Steps

Now that you understand workspaces:

1. **Import existing resources:** [03-import-existing.md](./03-import-existing.md)
2. **Learn testing:** [04-terraform-testing.md](./04-terraform-testing.md)
3. **Disaster recovery:** [05-disaster-recovery.md](./05-disaster-recovery.md)

---

## Related Documentation

- [State Management](./01-state-management.md)
- [Enterprise Patterns](./07-enterprise-patterns.md)
- [Terraform Workspaces Documentation](https://www.terraform.io/docs/language/state/workspaces.html)

---

**Estimated Completion Time:** 30-40 minutes

**Difficulty:** Advanced

**Previous:** [State Management](./01-state-management.md) | **Next:** [Import Existing Resources](./03-import-existing.md)
