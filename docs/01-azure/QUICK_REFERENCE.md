# Terraform Quick Reference & Commands Guide

## Quick Navigation

- [File Structure Cheat Sheet](#file-structure-cheat-sheet)
- [Command Reference](#command-reference)
- [Variable Management](#variable-management)
- [State Management](#state-management)
- [Troubleshooting Guide](#troubleshooting-guide)
- [Common Patterns](#common-patterns)
- [Security Best Practices](#security-best-practices)

---

## File Structure Cheat Sheet

### Essential Files to Create

```
terraform-project/
├── provider.tf                 # Provider configuration (REQUIRED)
├── main.tf                     # Resource definitions (REQUIRED)
├── variable.tf                 # Input variable declarations (RECOMMENDED)
├── outputs.tf                  # Output definitions (RECOMMENDED)
├── terraform.tfvars            # Variable values (OPTIONAL but common)
├── locals.tf                   # Local values (OPTIONAL)
├── data.tf                     # Data sources (OPTIONAL)
├── .gitignore                  # Ignore files from git (ESSENTIAL)
└── modules/                    # Reusable modules (OPTIONAL)
    ├── networking/
    │   ├── main.tf
    │   ├── variables.tf
    │   └── outputs.tf
    └── compute/
        ├── main.tf
        ├── variables.tf
        └── outputs.tf
```

### Auto-Generated Files (DON'T EDIT)

```
.terraform/                      # Downloaded providers & modules
├── providers/
├── modules/
└── .terraform.tfstate (local state only)

.terraform.lock.hcl             # Lock file (COMMIT THIS!)
terraform.tfstate               # State file (NEVER COMMIT!)
terraform.tfstate.backup        # State backup (NEVER COMMIT!)
```

### Gitignore Template

```bash
# .gitignore
.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl.*
crash.log
override.tf
*.auto.tfvars
.DS_Store
**/.*terraform*
```

---

## Command Reference

### Initialization

```bash
terraform init
# Downloads provider plugins, initializes state backend

terraform init -upgrade
# Also upgrades provider plugins to latest compatible versions

terraform init -backend=false
# Initialize without backend (useful for testing)
```

### Planning & Validation

```bash
terraform fmt
# Format all *.tf files according to Terraform style guide

terraform validate
# Check HCL syntax without accessing Azure

terraform plan
# Generate execution plan (show what will change)

terraform plan -out=tfplan
# Save plan to file (useful for CI/CD pipelines)

terraform plan -destroy
# Show what will be destroyed (prepare for terraform destroy)

terraform plan -target=aws_instance.example
# Plan changes to specific resource only

terraform plan -var 'key=value'
# Override variable values in plan

terraform plan -var-file=prod.tfvars
# Load variables from specific file
```

### Applying Changes

```bash
terraform apply
# Interactive: shows plan, asks for confirmation (y/n)

terraform apply tfplan
# Apply previously saved plan file (recommended for prod)

terraform apply -auto-approve
# Skip confirmation (use in CI/CD only!)

terraform apply -target=azurerm_resource_group.rg
# Apply changes to specific resource only

terraform apply -var 'environment=production'
# Override variable during apply
```

### State Management

```bash
terraform state list
# Show all tracked resources

terraform state show azurerm_resource_group.rg
# Show detailed info about specific resource

terraform state mv \
  azurerm_resource_group.old \
  azurerm_resource_group.new
# Rename resource in state (changes how Terraform refers to it)

terraform state rm azurerm_resource_group.rg
# Remove resource from state (stop tracking, don't delete in Azure)

terraform state pull > state.json
# Download state file

terraform state push state.json
# Upload state file

terraform refresh
# Update state file from actual Azure resources
```

### Imports & Migrations

```bash
terraform import azurerm_resource_group.rg \
  /subscriptions/xxx/resourceGroups/my-rg
# Bring existing Azure resource under Terraform management

terraform import azurerm_storage_account.sa \
  /subscriptions/xxx/storageAccounts/mysa
# Import existing storage account
```

### Output Queries

```bash
terraform output
# Display all outputs in human-readable format

terraform output -json
# Display outputs as JSON (for scripting)

terraform output storage_name
# Display single output value

terraform output -raw storage_name
# Display raw output value (no quotes, useful for bash)
```

### Cleanup & Destruction

```bash
terraform destroy
# Interactive: shows what will be deleted, asks for confirmation

terraform destroy -auto-approve
# Delete all resources without confirmation (DANGER!)

terraform destroy -target=azurerm_storage_account.sa
# Destroy only specific resource

terraform destroy -var 'environment=dev'
# Override variables during destroy
```

### Debugging & Introspection

```bash
terraform console
# Open interactive REPL for testing expressions and functions

terraform graph
# Output dependency graph in DOT format

terraform show
# Display current state file contents

terraform show -json
# Display state as JSON

terraform version
# Show Terraform version and provider versions

terraform providers
# Show provider requirements and installed versions

terraform fmt -check
# Check if files need formatting (useful for CI)

terraform fmt -recursive .
# Format all .tf files recursively
```

### Advanced Commands

```bash
terraform workspace list
# Show all workspaces

terraform workspace new prod
# Create new workspace (separate state files)

terraform workspace select prod
# Switch to different workspace

terraform taint azurerm_resource_group.rg
# Mark resource for recreation (will be recreated on next apply)

terraform untaint azurerm_resource_group.rg
# Remove taint marker

terraform force-unlock LOCK_ID
# Force unlock state file (if locked incorrectly)
```

---

## Variable Management

### Declaring Variables

```hcl
# variable.tf

# Simple string variable
variable "environment" {
  type        = string
  description = "Environment name (dev, staging, prod)"
  default     = "dev"
}

# Required variable (no default)
variable "location" {
  type        = string
  description = "Azure region"
  # No default = REQUIRED
}

# Number variable
variable "vm_count" {
  type        = number
  description = "Number of VMs to create"
  default     = 1

  validation {
    condition     = var.vm_count >= 1 && var.vm_count <= 100
    error_message = "VM count must be between 1 and 100."
  }
}

# Boolean variable
variable "enable_https" {
  type        = bool
  description = "Enable HTTPS"
  default     = true
}

# List variable
variable "allowed_subnets" {
  type        = list(string)
  description = "Allowed subnet CIDR blocks"
  default     = ["10.0.0.0/24", "10.0.1.0/24"]
}

# Map variable
variable "resource_tags" {
  type        = map(string)
  description = "Tags to apply to all resources"
  default = {
    ManagedBy = "Terraform"
    Project   = "MyProject"
  }
}

# Complex object
variable "storage_config" {
  type = object({
    account_tier             = string
    account_replication_type = string
    access_tier              = string
  })
  default = {
    account_tier             = "Standard"
    account_replication_type = "LRS"
    access_tier              = "Hot"
  }
}

# Sensitive variable (value hidden in output)
variable "database_password" {
  type        = string
  description = "Database admin password"
  sensitive   = true
  # No default for security
}
```

### Providing Variable Values

**Method 1: terraform.tfvars (auto-loaded)**
```hcl
# terraform.tfvars
environment = "production"
location    = "East US"
vm_count    = 3

resource_tags = {
  ManagedBy   = "Terraform"
  Project     = "WebApp"
  Environment = "Production"
}
```

**Method 2: Specific .tfvars file**
```bash
terraform apply -var-file="prod.tfvars"
terraform apply -var-file="dev.tfvars"
```

**Method 3: CLI flags**
```bash
terraform apply -var 'environment=production' -var 'location=East US'
```

**Method 4: Environment variables**
```bash
export TF_VAR_environment="production"
export TF_VAR_location="East US"
export TF_VAR_vm_count="3"
terraform apply
```

**Method 5: Interactive prompt**
```bash
terraform apply
# Terraform will prompt for required variables
```

### Variable Priority (Highest to Lowest)

1. `-var` CLI flag
2. `-var-file` specified files
3. Environment variables (`TF_VAR_*`)
4. `terraform.tfvars` auto-loaded file
5. `*.auto.tfvars` files (if present)
6. Variable defaults (in variable.tf)
7. Interactive prompt (if required and no value)

---

## State Management

### Understanding State Files

**terraform.tfstate**
- JSON file tracking all managed resources
- Contains resource IDs, properties, outputs
- **NEVER commit to git** (contains sensitive data)
- Keep backed up and secure

**terraform.tfstate.backup**
- Automatic backup created before applying changes
- Can restore if state gets corrupted

**.terraform.lock.hcl**
- Records exact provider versions used
- **MUST commit to git** (ensures team consistency)
- Prevents unexpected provider upgrades

### Local State (Default)

```hcl
# No configuration needed - this is the default

# Working directory structure:
terraform/
├── main.tf
├── terraform.tfstate      ← State file in local filesystem
├── terraform.tfstate.backup
├── .terraform.lock.hcl
└── .terraform/
```

**Pros:**
- Simple, no setup required
- Good for learning

**Cons:**
- Not suitable for teams
- No state locking (concurrent access issues)
- Not backed up automatically
- State file in working directory (security risk)

### Remote State with Azure Storage

```hcl
# Configure in provider.tf or separate backend.tf file

terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.tfstate"

    # Optional:
    access_key = "..."  # Or use environment variable ARM_ACCESS_KEY
  }
}
```

**Setup Azure Storage Backend:**

```bash
# Create resource group
az group create \
  --name tfstate-rg \
  --location eastus

# Create storage account
az storage account create \
  --name tfstate12345 \
  --resource-group tfstate-rg \
  --kind StorageV2 \
  --sku Standard_LRS

# Create container
az storage container create \
  --name tfstate \
  --account-name tfstate12345

# Get access key
az storage account keys list \
  --resource-group tfstate-rg \
  --account-name tfstate12345 \
  --query '[0].value' -o tsv
```

**Pros:**
- Centralized state management
- Team access (with proper Azure RBAC)
- State locking (blob lease)
- Encrypted at rest
- State versioning
- Backup/recovery support

### State Locking

When using Azure Storage backend, state locking prevents concurrent modifications:

```
Person A: terraform apply    ┐
  ├─ Acquires lock on state  │
  ├─ Reads state             │ Only one person
  ├─ Applies changes         │ can modify at a time
  └─ Releases lock           │
                             ↓
Person B: terraform apply
  ├─ Waits for lock to be released
  └─ Then acquires lock, proceeds
```

### Handling State Conflicts

```bash
# Check if state is locked
terraform state list

# Force unlock (only if necessary!)
terraform force-unlock LOCK_ID

# Verify state integrity
terraform validate
terraform plan
```

---

## Troubleshooting Guide

### Problem: "No configuration files found"

```bash
# Cause: terraform init not run, or wrong directory

# Solution:
terraform init

# Verify:
ls *.tf
terraform validate
```

### Problem: "Required argument missing"

```
Error: Missing required argument

on main.tf line 5, in resource "azurerm_resource_group":
    5:  resource "azurerm_resource_group" "rg" {

Missing required argument "location".
```

**Solution:**
```hcl
# Add required argument
resource "azurerm_resource_group" "rg" {
  name     = "my-rg"
  location = "East US"  # ← Add this
}

# Or use variable
location = var.location
```

### Problem: "Failed to authenticate with Azure"

```
Error: Unable to locate credentials for authentication.

Please ensure that the following environment variables are set:
  ARM_CLIENT_ID
  ARM_CLIENT_SECRET
  ARM_TENANT_ID
  ARM_SUBSCRIPTION_ID
```

**Solution: Use Azure CLI (Easiest)**
```bash
az login
# Browser opens, authenticate
# terraform automatically uses CLI token

terraform plan  # Should work now
```

**Solution: Use Environment Variables (CI/CD)**
```bash
export ARM_CLIENT_ID="00000000-0000-0000-0000-000000000000"
export ARM_CLIENT_SECRET="your-secret-value"
export ARM_TENANT_ID="00000000-0000-0000-0000-000000000000"
export ARM_SUBSCRIPTION_ID="00000000-0000-0000-0000-000000000000"

terraform plan  # Should work now
```

### Problem: "Resource already exists"

```
Error: creating azurerm_resource_group: error creating resource:
Failure sending request to Azure: ... Resource group already exists
```

**Solution: Import existing resource**
```bash
# Get the Azure resource ID
az group show -n my-rg --query id -o tsv
# Output: /subscriptions/xxx/resourceGroups/my-rg

# Import into Terraform
terraform import azurerm_resource_group.rg \
  /subscriptions/xxx/resourceGroups/my-rg

# Now Terraform knows about it
terraform plan
```

### Problem: "Invalid variable value"

```
Error: Invalid value for variable

  on variable.tf line 5, in variable "environment":
    5: variable "environment" {

Value must be one of: dev, staging, prod
```

**Solution: Use valid value**
```bash
# Option 1: Update terraform.tfvars
echo 'environment = "prod"' >> terraform.tfvars

# Option 2: Use -var flag
terraform apply -var 'environment=prod'

# Option 3: Interactive prompt
terraform apply  # Enter 'prod' when prompted
```

### Problem: "Insufficient permissions"

```
Error: creating azurerm_resource_group: Failure sending request:
authorization failed with error: insufficient permissions
```

**Solution: Grant Azure RBAC permissions**
```bash
# Check current user
az account show --query user

# Grant Contributor role
az role assignment create \
  --assignee "user@example.com" \
  --role "Contributor" \
  --scope "/subscriptions/xxx"

# Try again
terraform apply
```

### Problem: "State file lock stuck"

```
Error: Error acquiring the state lock

Error: error acquiring the lease to the state file
(tfstate): Lease conflict
```

**Solution: Force unlock**
```bash
# Get lock ID
terraform state list

# Force unlock (use carefully!)
terraform force-unlock abc123def456

# Verify
terraform plan
```

### Problem: "Provider version conflict"

```
Error: provider version constraints incompatible

Version constraints: ~> 3.0
Latest matching version: 2.90.0
```

**Solution: Update constraints or provider**
```hcl
# Option 1: Update constraint in provider.tf
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"  # Update this
    }
  }
}

# Option 2: Reinstall providers
rm .terraform.lock.hcl
terraform init -upgrade
```

### Enable Debug Logging

```bash
# Show detailed logs
export TF_LOG=DEBUG
terraform plan

# Save logs to file
export TF_LOG_PATH="terraform.log"
terraform plan

# Different log levels: TRACE, DEBUG, INFO, WARN, ERROR
export TF_LOG=TRACE
terraform plan
```

---

## Common Patterns

### Pattern 1: Multiple Environments

**Directory structure:**
```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   ├── staging/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
└── modules/
    └── networking/
```

**Usage:**
```bash
# Deploy to dev
cd environments/dev
terraform init
terraform apply

# Deploy to prod
cd environments/prod
terraform init
terraform apply
```

### Pattern 2: Workspaces

```bash
# Create workspaces
terraform workspace new dev
terraform workspace new prod

# Switch between workspaces
terraform workspace select dev
terraform apply

terraform workspace select prod
terraform apply

# Each workspace has separate state file
terraform.tfstate.dev
terraform.tfstate.prod
```

### Pattern 3: Remote State with Different Environments

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "${terraform.workspace}.tfstate"
    # Uses workspace name for state file key
  }
}
```

### Pattern 4: Conditional Resources

```hcl
variable "enable_monitoring" {
  type    = bool
  default = false
}

resource "azurerm_monitor_action_group" "main" {
  count               = var.enable_monitoring ? 1 : 0
  name                = "example-action-group"
  resource_group_name = azurerm_resource_group.rg.name
  # ... rest of config
}

output "action_group_id" {
  value = var.enable_monitoring ? azurerm_monitor_action_group.main[0].id : null
}
```

### Pattern 5: For-Each for Multiple Similar Resources

```hcl
variable "storage_accounts" {
  type = map(object({
    name = string
    tier = string
  }))
  default = {
    primary = {
      name = "sa-primary"
      tier = "Standard"
    }
    secondary = {
      name = "sa-secondary"
      tier = "Premium"
    }
  }
}

resource "azurerm_storage_account" "sa" {
  for_each = var.storage_accounts

  name                = each.value.name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  account_tier        = each.value.tier
  # ... rest of config
}

output "storage_account_ids" {
  value = { for k, v in azurerm_storage_account.sa : k => v.id }
}
```

---

## Security Best Practices

### 1. Never Commit Sensitive Data

```bash
# .gitignore
terraform.tfstate
terraform.tfstate.*
*.tfvars.local
.env
.env.local
```

### 2. Use Sensitive Variables

```hcl
variable "database_password" {
  type        = string
  description = "Database password"
  sensitive   = true  # ← Hide from logs and output
}

output "connection_string" {
  value     = "Server=${azurerm_mssql_server.db.fully_qualified_domain_name};..."
  sensitive = true  # ← Hide from console output
}
```

### 3. Use Remote State with Encryption

```hcl
terraform {
  backend "azurerm" {
    # Azure Storage encrypts at rest by default
    # Use HTTPS only (default)
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "prod.tfstate"
  }
}
```

### 4. Implement Access Controls

```bash
# Azure RBAC for state backend
az role assignment create \
  --assignee "user@example.com" \
  --role "Storage Blob Data Contributor" \
  --scope "/subscriptions/xxx/resourceGroups/tfstate-rg/providers/Microsoft.Storage/storageAccounts/tfstate12345"

# Only grant necessary permissions
# - Reader role for terraform plan
# - Contributor role for terraform apply
```

### 5. Use Managed Identities in Azure

```hcl
provider "azurerm" {
  features {}
  # Automatically uses Managed Identity if running in Azure
  # More secure than storing secrets
}
```

### 6. Rotate Credentials Regularly

```bash
# For Service Principals
az ad sp credential reset --name "terraform-sp"

# For storage account keys
az storage account keys renew \
  --resource-group tfstate-rg \
  --account-name tfstate12345 \
  --key primary
```

### 7. Use .gitignore for Local Overrides

```bash
# .gitignore
override.tf       # Local secrets and overrides
*.local.tfvars    # Local variable files
terraform.tfvars  # If it contains secrets
```

### 8. Enable Audit Logging

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  # All API calls are logged in Azure Activity Log
}
```

### 9. Pin Provider Versions

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "= 3.86.0"  # Pin to exact version, not ~>
    }
  }
  required_version = ">= 1.5.0"
}
```

### 10. Review Plans Before Applying

```bash
# ALWAYS review before apply!
terraform plan > tfplan.txt

# Review the plan file
cat tfplan.txt

# Then apply only if safe
terraform apply tfplan

# For CI/CD pipelines
terraform plan -out=tfplan
# Manual review step here
terraform apply tfplan
```

---

## Environment Setup Examples

### Local Development Setup

```bash
# Install Terraform
brew install terraform

# Authenticate to Azure
az login

# Create working directory
mkdir terraform-project
cd terraform-project

# Initialize
terraform init

# Create files (see File Structure above)
# ... create provider.tf, main.tf, variable.tf, outputs.tf

# Start developing
terraform plan
terraform apply
```

### CI/CD Pipeline Setup (GitHub Actions)

```yaml
name: Terraform

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  terraform:
    runs-on: ubuntu-latest

    env:
      ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
      ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
      ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}

    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: Terraform Format
        run: terraform fmt -check

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Terraform Apply (main only)
        if: github.ref == 'refs/heads/main'
        run: terraform apply tfplan
```

---

## Useful One-Liners

```bash
# Format all Terraform files
terraform fmt -recursive .

# Check what will be destroyed
terraform plan -destroy

# Recreate specific resource
terraform taint azurerm_resource_group.rg && terraform apply

# Remove resource from state without deleting
terraform state rm azurerm_storage_account.sa

# Compare local state with remote
terraform state pull > local.tfstate

# Show only differences in plan
terraform plan | grep -E "^\s+[~+-]"

# Get output value for scripting
SA_ID=$(terraform output -raw storage_account_id)

# Validate all variable files
terraform validate && echo "Valid!"

# Generate dependency graph (requires Graphviz)
terraform graph | dot -Tpng > graph.png

# List all resources with their types
terraform state list

# Show full resource details
terraform state show azurerm_resource_group.rg

# Workspace operations
terraform workspace list
terraform workspace new staging
terraform workspace select staging

# Check provider requirements
terraform providers

# See what terraform version is required
cat .terraform-version || echo "No version pinned"
```

---

## Further Reading

- [Official Terraform Documentation](https://www.terraform.io/docs)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Terraform Best Practices](https://www.terraform.io/docs/cloud/state/terraform-cloud)
- [Azure Terraform Examples](https://github.com/Azure-Samples/Terraform-Samples)
- [Terraform Learning Path](https://learn.hashicorp.com/collections/terraform/aws-get-started)

