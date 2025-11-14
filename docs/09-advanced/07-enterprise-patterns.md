# Enterprise Patterns

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Team Collaboration](#team-collaboration)
- [Governance and Compliance](#governance-and-compliance)
- [Multi-Account/Subscription Patterns](#multi-accountsubscription-patterns)
- [Module Development](#module-development)
- [Secret Management](#secret-management)
- [Cost Management](#cost-management)
- [Audit and Compliance](#audit-and-compliance)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

---

## Overview

Enterprise Terraform requires patterns that ensure security, compliance, cost control, and team collaboration at scale. This guide covers enterprise-grade patterns for governance, module development, multi-account management, and DevSecOps practices.

---

## Learning Objectives

By the end of this guide, you will:
- Implement team collaboration workflows
- Enforce governance and compliance policies
- Manage multi-account/subscription infrastructure
- Develop and publish internal module libraries
- Secure secrets and sensitive data
- Control and optimize costs
- Maintain audit trails and compliance
- Apply enterprise DevSecOps best practices

---

## Difficulty Level

**Advanced** - Requires extensive Terraform and organizational knowledge.

---

## Time Estimate

**60-90 minutes** - Comprehensive enterprise patterns.

---

## Team Collaboration

### 1. Repository Structure

**Monorepo pattern:**
```
terraform-infrastructure/
├── .github/workflows/
│   ├── pr-validation.yml
│   └── deployment.yml
├── modules/
│   ├── networking/
│   ├── compute/
│   └── security/
├── environments/
│   ├── dev/
│   ├── staging/
│   └── production/
├── policies/
│   └── sentinel/
└── docs/
    └── runbooks/
```

**Poly-repo pattern:**
```
Organization:
├── terraform-modules/         (Shared modules)
├── terraform-dev/             (Development infrastructure)
├── terraform-staging/         (Staging infrastructure)
└── terraform-production/      (Production infrastructure)
```

---

### 2. Branching Strategy

**GitFlow for Infrastructure:**
```
main (production)
  ↑
develop (staging)
  ↑
feature/* (development)
```

**Workflow:**
```bash
# Developer workflow
git checkout -b feature/add-database develop
# Make changes
git push origin feature/add-database
# Create PR to develop

# After testing in staging
git checkout main
git merge develop
# Deploys to production
```

---

### 3. Code Review Process

**.github/CODEOWNERS:**
```
# Global owners
*                         @platform-team

# Environment-specific owners
/environments/production/ @platform-team @security-team @infra-leads
/environments/staging/    @platform-team
/environments/dev/        @platform-team @developers

# Module owners
/modules/networking/      @network-team
/modules/security/        @security-team
/modules/databases/       @database-team
```

**PR Template:**
```markdown
## Description
<!-- Describe what this PR changes -->

## Type of Change
- [ ] New resource
- [ ] Resource modification
- [ ] Resource deletion
- [ ] Module update
- [ ] Security update

## Testing
- [ ] Ran terraform plan
- [ ] Tested in development
- [ ] Tested in staging
- [ ] Security scan passed
- [ ] Cost estimate reviewed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] No secrets in code
- [ ] Tags applied correctly
```

---

## Governance and Compliance

### 1. Policy as Code with Sentinel

**policies/require-tags.sentinel:**
```python
import "tfplan/v2" as tfplan

# Required tags for all resources
required_tags = {
  "Environment": ["dev", "staging", "prod"],
  "CostCenter": ["engineering", "marketing", "sales"],
  "Owner": null,  # Any value OK
  "Project": null,
}

# Find all managed resources
all_resources = filter tfplan.resource_changes as _, rc {
  rc.mode is "managed" and
  rc.change.actions contains "create"
}

# Validation function
validate_tags = func(resource) {
  # Check if resource supports tags
  if "tags" not in resource.change.after {
    return true  # Skip resources without tags
  }

  tags = resource.change.after.tags

  # Check each required tag
  for required_tags as tag_key, allowed_values {
    # Tag must exist
    if tag_key not in keys(tags) {
      print("Missing required tag:", tag_key, "on", resource.address)
      return false
    }

    # If allowed values specified, validate
    if allowed_values is not null {
      if tags[tag_key] not in allowed_values {
        print("Invalid value for", tag_key, "on", resource.address)
        print("Allowed values:", allowed_values)
        return false
      }
    }
  }

  return true
}

# Main rule
main = rule {
  all all_resources as _, resource {
    validate_tags(resource)
  }
}
```

---

### 2. Custom Validation Rules

**variables.tf:**
```hcl
variable "resource_naming" {
  description = "Resource naming must follow company standards"
  type        = string

  validation {
    condition = can(regex("^(rg|st|vm|vnet|nsg|kv|sql)-[a-z]+-[a-z]+(-[0-9]+)?$", var.resource_naming))
    error_message = "Resource name must follow pattern: {type}-{purpose}-{environment}[-{number}]"
  }
}

variable "allowed_regions" {
  description = "Only approved regions can be used"
  type        = string

  validation {
    condition = contains([
      "eastus",
      "westus",
      "centralus"
    ], var.allowed_regions)
    error_message = "Region must be one of the approved locations"
  }
}
```

---

### 3. Pre-commit Hooks

**.pre-commit-config.yaml:**
```yaml
repos:
  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.83.5
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_docs
      - id: terraform_tflint
      - id: terraform_tfsec
      - id: terraform_checkov

  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-merge-conflict
      - id: detect-private-key
      - id: trailing-whitespace
```

**Setup:**
```bash
# Install pre-commit
pip install pre-commit

# Install hooks
pre-commit install

# Run manually
pre-commit run --all-files
```

---

## Multi-Account/Subscription Patterns

### 1. Organization Structure

**Azure:**
```
Management Group: Company
├── Production
│   ├── Subscription: Prod-Apps
│   ├── Subscription: Prod-Data
│   └── Subscription: Prod-Network
├── Non-Production
│   ├── Subscription: Staging
│   └── Subscription: Development
└── Shared Services
    ├── Subscription: Monitoring
    └── Subscription: Security
```

**Terraform structure:**
```
terraform/
├── management-groups/
│   └── main.tf
├── subscriptions/
│   ├── prod-apps/
│   ├── prod-data/
│   ├── staging/
│   └── dev/
└── shared-services/
    ├── monitoring/
    └── security/
```

---

### 2. Cross-Account Access

**Azure:**
```hcl
# Configure provider for different subscriptions
provider "azurerm" {
  alias           = "production"
  subscription_id = var.prod_subscription_id
  features {}
}

provider "azurerm" {
  alias           = "development"
  subscription_id = var.dev_subscription_id
  features {}
}

# Deploy to production subscription
resource "azurerm_resource_group" "prod" {
  provider = azurerm.production

  name     = "rg-prod"
  location = "eastus"
}

# Deploy to development subscription
resource "azurerm_resource_group" "dev" {
  provider = azurerm.development

  name     = "rg-dev"
  location = "westus"
}
```

---

## Module Development

### 1. Enterprise Module Structure

```
modules/
└── azure-webapp/
    ├── README.md              # Usage documentation
    ├── main.tf                # Primary resources
    ├── variables.tf           # Input variables
    ├── outputs.tf             # Output values
    ├── versions.tf            # Provider requirements
    ├── locals.tf              # Local values
    ├── data.tf                # Data sources
    ├── examples/              # Usage examples
    │   ├── basic/
    │   └── advanced/
    ├── test/                  # Automated tests
    │   └── webapp_test.go
    └── docs/                  # Additional docs
        └── architecture.md
```

---

### 2. Module Best Practices

**versions.tf:**
```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}
```

**variables.tf:**
```hcl
variable "name" {
  description = "Name of the web app (must be globally unique)"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,24}$", var.name))
    error_message = "Name must be 3-24 characters, lowercase alphanumeric and hyphens only"
  }
}

variable "environment" {
  description = "Environment (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

variable "sku" {
  description = "App Service Plan SKU"
  type = object({
    tier = string
    size = string
  })
  default = {
    tier = "Standard"
    size = "S1"
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}
```

**outputs.tf:**
```hcl
output "webapp_id" {
  description = "The ID of the Web App"
  value       = azurerm_linux_web_app.this.id
}

output "webapp_url" {
  description = "The default URL of the Web App"
  value       = "https://${azurerm_linux_web_app.this.default_hostname}"
}

output "webapp_identity" {
  description = "The managed identity of the Web App"
  value       = azurerm_linux_web_app.this.identity
  sensitive   = true
}
```

---

### 3. Private Module Registry

**Terraform Cloud/Enterprise:**
```hcl
module "webapp" {
  source  = "app.terraform.io/company/webapp/azure"
  version = "1.2.3"

  name        = "app-${var.environment}"
  environment = var.environment
}
```

**Git-based registry:**
```hcl
module "webapp" {
  source = "git::https://github.com/company/terraform-modules.git//azure-webapp?ref=v1.2.3"

  name        = "app-${var.environment}"
  environment = var.environment
}
```

---

## Secret Management

### 1. Azure Key Vault Integration

**Retrieve secrets in Terraform:**
```hcl
data "azurerm_key_vault" "shared" {
  name                = "kv-shared-secrets"
  resource_group_name = "rg-shared"
}

data "azurerm_key_vault_secret" "db_password" {
  name         = "database-admin-password"
  key_vault_id = data.azurerm_key_vault.shared.id
}

# Use secret in resource
resource "azurerm_mssql_server" "example" {
  name                         = "sql-${var.environment}"
  resource_group_name          = azurerm_resource_group.example.name
  location                     = azurerm_resource_group.example.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value
}
```

---

### 2. Sensitive Output Management

```hcl
output "connection_string" {
  description = "Database connection string"
  value       = azurerm_mssql_server.example.connection_string
  sensitive   = true  # Won't show in logs
}

# Retrieve sensitive output
# terraform output -raw connection_string
```

---

### 3. Environment Variable Secrets

```bash
# DON'T commit .env files
export TF_VAR_db_password=$(az keyvault secret show --name db-password --vault-name kv-shared --query value -o tsv)
export TF_VAR_api_key=$(az keyvault secret show --name api-key --vault-name kv-shared --query value -o tsv)

terraform apply
```

---

## Cost Management

### 1. Cost Estimation in CI/CD

**GitHub Actions with Infracost:**
```yaml
name: Cost Estimation

on: [pull_request]

jobs:
  infracost:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Infracost
        uses: infracost/actions/setup@v2
        with:
          api-key: ${{ secrets.INFRACOST_API_KEY }}

      - name: Generate cost estimate
        run: |
          infracost breakdown --path . --format json --out-file /tmp/infracost.json

      - name: Post cost comment
        uses: infracost/actions/comment@v1
        with:
          path: /tmp/infracost.json
          behavior: update
```

---

### 2. Cost Tagging Strategy

**tags.tf:**
```hcl
locals {
  common_tags = {
    # Required for cost allocation
    CostCenter  = var.cost_center
    Owner       = var.owner
    Project     = var.project
    Environment = var.environment

    # Optional
    CreatedBy   = "Terraform"
    CreatedDate = formatdate("YYYY-MM-DD", timestamp())
    Repository  = "terraform-infrastructure"
  }
}

resource "azurerm_resource_group" "example" {
  name     = "rg-example"
  location = "eastus"
  tags     = local.common_tags
}
```

---

### 3. Budget Alerts

```hcl
resource "azurerm_consumption_budget_subscription" "monthly" {
  name            = "budget-${var.environment}-monthly"
  subscription_id = data.azurerm_client_config.current.subscription_id

  amount     = var.environment == "prod" ? 10000 : 1000
  time_grain = "Monthly"

  time_period {
    start_date = "2024-01-01T00:00:00Z"
  }

  notification {
    enabled   = true
    threshold = 80
    operator  = "GreaterThan"

    contact_emails = [
      "finance@company.com",
      "engineering-leads@company.com"
    ]
  }

  notification {
    enabled   = true
    threshold = 100
    operator  = "GreaterThan"

    contact_emails = [
      "cto@company.com",
      "cfo@company.com"
    ]
  }
}
```

---

## Audit and Compliance

### 1. Audit Logging

**Azure Activity Log:**
```hcl
resource "azurerm_monitor_diagnostic_setting" "subscription" {
  name               = "audit-logs"
  target_resource_id = "/subscriptions/${data.azurerm_client_config.current.subscription_id}"

  log_analytics_workspace_id = azurerm_log_analytics_workspace.audit.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }

  enabled_log {
    category = "Policy"
  }
}
```

---

### 2. Compliance Reporting

**Azure Policy:**
```hcl
resource "azurerm_policy_assignment" "require_tags" {
  name                 = "require-tags"
  scope                = azurerm_resource_group.example.id
  policy_definition_id = "/providers/Microsoft.Authorization/policyDefinitions/1e30110a-5ceb-460c-a204-c1c3969c6d62"

  parameters = jsonencode({
    tagName = {
      value = "CostCenter"
    }
  })
}

# Compliance reporting
data "azurerm_policy_state" "example" {
  policy_assignment_id = azurerm_policy_assignment.require_tags.id
}

output "compliance_summary" {
  value = {
    total      = length(data.azurerm_policy_state.example.policy_states)
    compliant  = length([for s in data.azurerm_policy_state.example.policy_states : s if s.compliance_state == "Compliant"])
    violations = length([for s in data.azurerm_policy_state.example.policy_states : s if s.compliance_state == "NonCompliant"])
  }
}
```

---

## Best Practices

### 1. Documentation Standards

**Module README template:**
```markdown
# Azure Web App Module

## Description
Deploys an Azure App Service with best practices

## Usage
```hcl
module "webapp" {
  source = "./modules/azure-webapp"

  name        = "myapp"
  environment = "prod"
}
```

## Requirements
| Name | Version |
|------|---------|
| terraform | >= 1.5.0 |
| azurerm | ~> 3.75 |

## Inputs
| Name | Description | Type | Default | Required |
|------|-------------|------|---------|----------|
| name | Name of webapp | string | n/a | yes |

## Outputs
| Name | Description |
|------|-------------|
| webapp_url | URL of webapp |
```

### 2. Change Management

**Change approval workflow:**
```yaml
# .github/workflows/terraform-apply.yml
name: Terraform Apply

on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
        options:
          - development
          - staging
          - production

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Terraform Plan
        run: terraform plan -out=tfplan
      - name: Upload Plan
        uses: actions/upload-artifact@v3
        with:
          name: tfplan
          path: tfplan

  approve:
    needs: plan
    runs-on: ubuntu-latest
    if: github.event.inputs.environment == 'production'
    environment: production  # Requires manual approval
    steps:
      - run: echo "Approved for production"

  apply:
    needs: [plan, approve]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Download Plan
        uses: actions/download-artifact@v3
        with:
          name: tfplan
      - name: Terraform Apply
        run: terraform apply tfplan
```

---

## Enterprise Checklist

- [ ] Code review process enforced
- [ ] Policy as code implemented
- [ ] Secrets in Key Vault
- [ ] Cost budgets and alerts configured
- [ ] Multi-environment structure
- [ ] Private module registry
- [ ] Automated testing in CI/CD
- [ ] Audit logging enabled
- [ ] Compliance reporting automated
- [ ] Disaster recovery tested
- [ ] Documentation up to date
- [ ] Team training completed

---

## Next Steps

Congratulations! You've completed the advanced Terraform topics.

**Continue learning:**
1. **Review Azure-specific lessons:** [Azure Tutorials](../01-azure/)
2. **Explore multi-cloud:** [Multi-Cloud Deployment](../04-multi-cloud/)
3. **Implement in your organization**

---

## Related Documentation

- [State Management](./01-state-management.md)
- [Disaster Recovery](./05-disaster-recovery.md)
- [Terraform Cloud Documentation](https://www.terraform.io/cloud-docs)

---

**Estimated Completion Time:** 60-90 minutes

**Difficulty:** Advanced

**Previous:** [Performance Optimization](./06-performance-optimization.md) | **Next:** [Azure Lessons](../01-azure/)
