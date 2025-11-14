# Terraform Workflow

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [The Core Workflow](#the-core-workflow)
- [Detailed Command Reference](#detailed-command-reference)
- [Advanced Workflow](#advanced-workflow)
- [State Management](#state-management)
- [Workflow Best Practices](#workflow-best-practices)
- [Common Patterns](#common-patterns)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Overview

Understanding the Terraform workflow is essential for effective Infrastructure as Code development. This guide covers the standard Terraform workflow, essential commands, and best practices for managing infrastructure safely and efficiently.

---

## Learning Objectives

By the end of this guide, you will:
- Master the core Terraform workflow (init, plan, apply, destroy)
- Understand when and how to use each Terraform command
- Learn advanced workflow techniques
- Know how to work safely with infrastructure changes
- Understand state management basics
- Apply workflow best practices

---

## Difficulty Level

**Beginner to Intermediate** - Covers basics with advanced tips.

---

## Time Estimate

**20-30 minutes** - Reading and hands-on practice.

---

## The Core Workflow

```
┌─────────────────────────────────────────────────────────┐
│                  TERRAFORM WORKFLOW                     │
└─────────────────────────────────────────────────────────┘

    1. WRITE               2. INIT              3. PLAN
   ┌─────────┐           ┌─────────┐          ┌─────────┐
   │  Write  │           │Download │          │ Preview │
   │  .tf    │    →      │Providers│    →     │ Changes │
   │  files  │           │& Modules│          │         │
   └─────────┘           └─────────┘          └─────────┘
                                                    │
                                                    ↓
    5. DESTROY  ←────────  4. APPLY
   ┌─────────┐           ┌─────────┐
   │ Remove  │           │  Create │
   │Resources│    ←      │ Changes │
   │         │           │         │
   └─────────┘           └─────────┘
```

---

## Detailed Command Reference

### 1. terraform init

**Purpose:** Initialize a Terraform working directory

**When to use:**
- First time working with a configuration
- After adding new providers or modules
- After cloning a repository
- After changing backend configuration

**What it does:**
- Downloads provider plugins
- Downloads modules from registry or Git
- Initializes backend (local or remote state)
- Creates `.terraform` directory and lock file

**Basic Usage:**
```bash
terraform init
```

**Common Options:**
```bash
# Upgrade providers to latest versions matching constraints
terraform init -upgrade

# Reconfigure backend (migrate state)
terraform init -reconfigure

# Migrate state from one backend to another
terraform init -migrate-state

# Run in automation (no interactive prompts)
terraform init -input=false

# Get modules only
terraform init -get=true -backend=false
```

**Example Output:**
```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/azurerm versions matching "~> 3.0"...
- Installing hashicorp/azurerm v3.75.0...
- Installed hashicorp/azurerm v3.75.0

Terraform has been successfully initialized!
```

---

### 2. terraform plan

**Purpose:** Create an execution plan showing what will change

**When to use:**
- Before every apply (always!)
- To preview changes
- To verify your configuration
- During code reviews
- To generate plan files for approval

**What it does:**
- Reads current state
- Compares desired state (config) vs actual state (cloud)
- Shows what will be created, modified, or destroyed
- Validates configuration syntax
- Does NOT make any changes

**Basic Usage:**
```bash
terraform plan
```

**Common Options:**
```bash
# Save plan to file for later apply
terraform plan -out=tfplan

# Target specific resource
terraform plan -target=azurerm_resource_group.example

# Use variable file
terraform plan -var-file="production.tfvars"

# Set variable from command line
terraform plan -var="location=eastus"

# Destroy plan
terraform plan -destroy

# Detailed exit code (for CI/CD)
terraform plan -detailed-exitcode
# Exit codes: 0=no changes, 1=error, 2=changes pending

# Refresh state before planning
terraform plan -refresh=true

# Parallel operations
terraform plan -parallelism=10
```

**Understanding Plan Output:**

```
Terraform will perform the following actions:

  # azurerm_resource_group.example will be created
  + resource "azurerm_resource_group" "example" {
      + id       = (known after apply)
      + location = "eastus"
      + name     = "rg-example"
    }

  # azurerm_storage_account.example will be updated in-place
  ~ resource "azurerm_storage_account" "example" {
        id                      = "/subscriptions/.../storageAccounts/stexample"
        name                    = "stexample"
      ~ account_tier            = "Standard" -> "Premium"
        # (10 unchanged attributes hidden)
    }

  # azurerm_virtual_network.old will be destroyed
  - resource "azurerm_virtual_network" "old" {
      - id       = "/subscriptions/.../virtualNetworks/vnet-old" -> null
      - name     = "vnet-old" -> null
        # (5 more attributes)
    }

Plan: 1 to add, 1 to change, 1 to destroy.
```

**Symbols:**
- `+` = Create new resource
- `-` = Destroy resource
- `~` = Modify resource in-place
- `-/+` = Destroy and recreate (replacement)
- `<=` = Read (data source)

---

### 3. terraform apply

**Purpose:** Apply changes to reach desired state

**When to use:**
- After reviewing plan
- To create/update/delete infrastructure
- To execute a saved plan

**What it does:**
- Shows execution plan (unless using saved plan)
- Prompts for confirmation (unless auto-approve)
- Makes actual changes to infrastructure
- Updates state file
- Shows outputs

**Basic Usage:**
```bash
terraform apply
```

**Common Options:**
```bash
# Apply without confirmation (use carefully!)
terraform apply -auto-approve

# Apply a saved plan
terraform apply tfplan

# Apply with variable file
terraform apply -var-file="production.tfvars"

# Target specific resource
terraform apply -target=azurerm_resource_group.example

# Parallel operations (default is 10)
terraform apply -parallelism=20

# Lock timeout (for remote state)
terraform apply -lock-timeout=10m
```

**Example Output:**
```
azurerm_resource_group.example: Creating...
azurerm_resource_group.example: Creation complete after 1s [id=/subscriptions/.../resourceGroups/rg-example]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

resource_group_name = "rg-example"
```

---

### 4. terraform destroy

**Purpose:** Destroy all managed infrastructure

**When to use:**
- Cleaning up dev/test environments
- Removing all resources
- Before major refactoring
- Cost management

**What it does:**
- Shows destruction plan
- Prompts for confirmation
- Destroys resources in reverse dependency order
- Updates state file (removes resources)

**Basic Usage:**
```bash
terraform destroy
```

**Common Options:**
```bash
# Destroy without confirmation
terraform destroy -auto-approve

# Destroy specific resource only
terraform destroy -target=azurerm_resource_group.example

# Destroy with variable file
terraform destroy -var-file="dev.tfvars"

# Preview destroy without doing it
terraform plan -destroy
```

**Example Output:**
```
Terraform will perform the following actions:

  # azurerm_resource_group.example will be destroyed
  - resource "azurerm_resource_group" "example" {
      - id       = "/subscriptions/.../rg-example" -> null
      - location = "eastus" -> null
      - name     = "rg-example" -> null
    }

Plan: 0 to add, 0 to change, 1 to destroy.

Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value: yes

azurerm_resource_group.example: Destroying...
azurerm_resource_group.example: Destruction complete after 45s

Destroy complete! Resources: 1 destroyed.
```

---

## Advanced Workflow

### terraform validate

**Purpose:** Validate configuration syntax

```bash
# Validate configuration
terraform validate

# Validate with JSON output (for CI/CD)
terraform validate -json
```

**When to use:**
- In CI/CD pipelines
- Before commit
- Quick syntax check

---

### terraform fmt

**Purpose:** Format configuration files to canonical style

```bash
# Format current directory
terraform fmt

# Format recursively
terraform fmt -recursive

# Check if formatting is needed (CI/CD)
terraform fmt -check

# Show diff of changes
terraform fmt -diff
```

**Example:**
```bash
# Before formatting
resource "azurerm_resource_group" "example" {
name = "rg-example"
  location="eastus"
}

# After terraform fmt
resource "azurerm_resource_group" "example" {
  name     = "rg-example"
  location = "eastus"
}
```

---

### terraform output

**Purpose:** Display outputs from state

```bash
# Show all outputs
terraform output

# Show specific output
terraform output resource_group_name

# Output as JSON (for scripting)
terraform output -json

# Output raw value (no quotes)
terraform output -raw resource_group_name
```

---

### terraform refresh

**Purpose:** Update state to match real infrastructure

```bash
# Refresh state
terraform refresh

# Refresh is also part of plan and apply
terraform plan -refresh-only
terraform apply -refresh-only
```

**When to use:**
- After manual changes in cloud console
- To sync state with reality
- Before planning or applying

**Warning:** Manual changes will be overwritten on next apply!

---

### terraform show

**Purpose:** Display state or plan file

```bash
# Show current state
terraform show

# Show saved plan
terraform show tfplan

# Show as JSON
terraform show -json
terraform show -json tfplan
```

---

### terraform state

**Purpose:** Advanced state management

```bash
# List resources in state
terraform state list

# Show specific resource
terraform state show azurerm_resource_group.example

# Move resource (rename)
terraform state mv azurerm_resource_group.old azurerm_resource_group.new

# Remove resource from state (doesn't destroy)
terraform state rm azurerm_resource_group.example

# Pull remote state
terraform state pull

# Push local state to remote
terraform state push
```

---

## State Management

### Understanding State

**What is state?**
- JSON file tracking managed infrastructure
- Maps configuration to real-world resources
- Stores resource metadata and dependencies
- Contains sensitive data (treat as secret!)

**State File Location:**
```bash
# Local state (default)
terraform.tfstate
terraform.tfstate.backup

# Remote state (recommended)
# Stored in Azure Storage, AWS S3, Terraform Cloud, etc.
```

---

### State Best Practices

1. **Use Remote State for Teams**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}
```

2. **Enable State Locking**
- Prevents concurrent modifications
- Automatically handled by remote backends

3. **Never Edit State Manually**
- Use `terraform state` commands
- State is the source of truth

4. **Backup State**
```bash
# Manual backup
cp terraform.tfstate terraform.tfstate.backup

# Remote backends usually auto-backup
```

5. **Never Commit State to Git**
```gitignore
# .gitignore
*.tfstate
*.tfstate.*
```

---

## Workflow Best Practices

### Daily Development Workflow

```bash
# 1. Pull latest code
git pull

# 2. Initialize (if needed)
terraform init

# 3. Format code
terraform fmt -recursive

# 4. Validate
terraform validate

# 5. Plan and save
terraform plan -out=tfplan

# 6. Review plan thoroughly

# 7. Apply if approved
terraform apply tfplan

# 8. Commit changes
git add .
git commit -m "Add storage account"
git push
```

---

### Production Deployment Workflow

```bash
# 1. Review configuration in feature branch
git checkout feature/add-database

# 2. Validate and format
terraform fmt -check -recursive
terraform validate

# 3. Plan for staging environment
terraform workspace select staging
terraform plan -var-file=staging.tfvars -out=staging.tfplan

# 4. Apply to staging
terraform apply staging.tfplan

# 5. Test in staging

# 6. Create PR for review
git push origin feature/add-database

# 7. After PR approval, plan for production
terraform workspace select production
terraform plan -var-file=production.tfvars -out=prod.tfplan

# 8. Review plan carefully

# 9. Apply to production
terraform apply prod.tfplan

# 10. Monitor deployment

# 11. Merge to main
git checkout main
git merge feature/add-database
git push
```

---

### CI/CD Workflow

```yaml
# Example GitHub Actions workflow
name: Terraform

on: [push, pull_request]

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2

      - uses: hashicorp/setup-terraform@v1

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format
        run: terraform fmt -check -recursive

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Plan
        run: terraform plan -detailed-exitcode
```

---

## Common Patterns

### Targeted Apply

```bash
# Apply only specific resource
terraform apply -target=azurerm_resource_group.example

# Apply multiple targets
terraform apply \
  -target=azurerm_resource_group.example \
  -target=azurerm_storage_account.example
```

**Warning:** Only for emergencies or debugging!

---

### Replace Resource

```bash
# Force replacement of resource
terraform apply -replace=azurerm_storage_account.example

# Old way (deprecated)
terraform taint azurerm_storage_account.example
terraform apply
```

---

### Import Existing Resources

```bash
# Import existing Azure resource
terraform import azurerm_resource_group.example \
  /subscriptions/SUBSCRIPTION_ID/resourceGroups/existing-rg
```

---

### Workspaces for Environments

```bash
# Create workspace
terraform workspace new development

# List workspaces
terraform workspace list

# Switch workspace
terraform workspace select production

# Current workspace
terraform workspace show
```

---

## Troubleshooting

### State Locked

```bash
# Force unlock (use carefully!)
terraform force-unlock LOCK_ID
```

### State Drift

```bash
# Check for drift
terraform plan -refresh-only

# Accept drift (update state)
terraform apply -refresh-only
```

### Failed Apply

```bash
# 1. Check error message
# 2. Fix configuration or cloud issue
# 3. Run plan again
terraform plan

# 4. Apply
terraform apply
```

### Corrupted State

```bash
# Restore from backup
cp terraform.tfstate.backup terraform.tfstate

# Or pull from remote
terraform state pull > terraform.tfstate.backup
```

---

## Next Steps

Now that you understand the Terraform workflow:

1. **Learn HCL syntax:** [06-hcl-syntax.md](./06-hcl-syntax.md)
2. **Build real projects:** [Azure Tutorials](../01-azure/)
3. **Advanced topics:** [State Management](../09-advanced/01-state-management.md)

---

## Related Documentation

- [HCL Syntax Guide](./06-hcl-syntax.md)
- [State Management](../09-advanced/01-state-management.md)
- [Terraform CLI Documentation](https://www.terraform.io/docs/cli/commands)

---

**Estimated Completion Time:** 20-30 minutes

**Difficulty:** Beginner to Intermediate

**Previous:** [First Terraform Project](./04-first-terraform-project.md) | **Next:** [HCL Syntax](./06-hcl-syntax.md)
