# First Terraform Project - Hello World

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Project Structure](#project-structure)
- [Step-by-Step Guide](#step-by-step-guide)
- [Understanding Your First Deployment](#understanding-your-first-deployment)
- [Modifying Resources](#modifying-resources)
- [Destroying Resources](#destroying-resources)
- [Common Errors](#common-errors)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

---

## Overview

Welcome to your first Terraform project! In this hands-on guide, you'll deploy your first cloud resource to Azure using Terraform. This simple "Hello World" project will teach you the fundamental Terraform workflow while deploying a real Azure Resource Group.

---

## Learning Objectives

By the end of this guide, you will:
- Create your first Terraform configuration file
- Understand the basic Terraform workflow (init, plan, apply, destroy)
- Deploy a real Azure resource
- Modify and update infrastructure with Terraform
- Clean up resources to avoid costs
- Troubleshoot common first-time errors

---

## Difficulty Level

**Beginner** - Perfect first project for Terraform newcomers.

---

## Time Estimate

**15-20 minutes** - Including deployment and cleanup.

---

## Prerequisites

Before starting, ensure you have:
- Terraform installed ([Installation Guide](./02-terraform-installation.md))
- Azure CLI installed and authenticated ([Cloud CLI Setup](./03-cloud-cli-setup.md))
- Active Azure subscription
- Text editor or IDE

**Verify:**
```bash
terraform version
az account show
```

---

## Project Structure

You'll create a simple project with this structure:

```
my-first-terraform/
└── main.tf           # Your Terraform configuration
```

---

## Step-by-Step Guide

### Step 1: Create Project Directory

```bash
# Create project directory
mkdir my-first-terraform
cd my-first-terraform

# Verify you're in the right place
pwd
```

---

### Step 2: Create Your First Terraform File

Create a file named `main.tf` with the following content:

```hcl
# main.tf

# Terraform configuration block
terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# Provider configuration
provider "azurerm" {
  features {}
}

# Resource definition
resource "azurerm_resource_group" "example" {
  name     = "rg-my-first-terraform"
  location = "East US"

  tags = {
    Environment = "Learning"
    ManagedBy   = "Terraform"
    Purpose     = "First Project"
  }
}

# Output to display resource group name
output "resource_group_name" {
  value       = azurerm_resource_group.example.name
  description = "The name of the resource group"
}

# Output to display resource group location
output "resource_group_location" {
  value       = azurerm_resource_group.example.location
  description = "The location of the resource group"
}
```

**Save the file!**

---

### Step 3: Initialize Terraform

Initialize the project to download the Azure provider:

```bash
terraform init
```

**Expected Output:**
```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/azurerm versions matching "~> 3.0"...
- Installing hashicorp/azurerm v3.75.0...
- Installed hashicorp/azurerm v3.75.0 (signed by HashiCorp)

Terraform has been successfully initialized!

You may now begin working with Terraform. Try running "terraform plan" to see
any changes that are required for your infrastructure. All Terraform commands
should now work.

If you ever set or change modules or backend configuration for Terraform,
rerun this command to reinitialize your working directory. If you forget, other
commands will detect it and remind you to do so if necessary.
```

**What happened?**
- Terraform read your configuration
- Downloaded the Azure provider plugin (~150MB)
- Created a `.terraform` directory to store the provider
- Created a `.terraform.lock.hcl` file to lock provider versions

---

### Step 4: Review the Execution Plan

Before creating resources, see what Terraform will do:

```bash
terraform plan
```

**Expected Output:**
```
Terraform used the selected providers to generate the following execution plan.
Resource actions are indicated with the following symbols:
  + create

Terraform will perform the following actions:

  # azurerm_resource_group.example will be created
  + resource "azurerm_resource_group" "example" {
      + id       = (known after apply)
      + location = "eastus"
      + name     = "rg-my-first-terraform"
      + tags     = {
          + "Environment" = "Learning"
          + "ManagedBy"   = "Terraform"
          + "Purpose"     = "First Project"
        }
    }

Plan: 1 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + resource_group_location = "East US"
  + resource_group_name     = "rg-my-first-terraform"
```

**What happened?**
- Terraform compared your desired state (config) with actual state (Azure)
- Determined it needs to CREATE (+) one resource group
- Showed you exactly what will be created
- No changes were made yet!

---

### Step 5: Apply the Configuration

Now deploy the resource:

```bash
terraform apply
```

You'll see the plan again, then a confirmation prompt:

```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value:
```

**Type:** `yes` and press Enter

**Expected Output:**
```
azurerm_resource_group.example: Creating...
azurerm_resource_group.example: Creation complete after 2s [id=/subscriptions/.../resourceGroups/rg-my-first-terraform]

Apply complete! Resources: 1 added, 0 changed, 0 destroyed.

Outputs:

resource_group_location = "East US"
resource_group_name = "rg-my-first-terraform"
```

**Congratulations!** You just deployed your first cloud infrastructure with Terraform!

---

### Step 6: Verify in Azure

Verify the resource exists using Azure CLI:

```bash
# Show the resource group
az group show --name rg-my-first-terraform

# Or list all resource groups
az group list --output table | grep my-first-terraform
```

**Or check in Azure Portal:**
1. Go to https://portal.azure.com
2. Search for "Resource Groups"
3. Find "rg-my-first-terraform"

---

### Step 7: Examine Terraform State

Terraform tracks deployed resources in a state file:

```bash
# View state
terraform show

# List resources in state
terraform state list

# View specific resource details
terraform state show azurerm_resource_group.example
```

**Important:** The `terraform.tfstate` file now exists and contains sensitive information. Never commit it to version control!

---

## Understanding Your First Deployment

### The Terraform Block

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
```

**Purpose:**
- Sets minimum Terraform version required
- Declares which providers are needed
- Locks provider versions for consistency

### The Provider Block

```hcl
provider "azurerm" {
  features {}
}
```

**Purpose:**
- Configures the Azure provider
- `features {}` is required (even if empty) for AzureRM provider
- Provider automatically uses Azure CLI authentication

### The Resource Block

```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-my-first-terraform"
  location = "East US"

  tags = {
    Environment = "Learning"
    ManagedBy   = "Terraform"
  }
}
```

**Format:** `resource "PROVIDER_TYPE" "LOCAL_NAME"`
- **PROVIDER_TYPE:** `azurerm_resource_group` (from Azure provider)
- **LOCAL_NAME:** `example` (your reference name in Terraform)
- **Arguments:** `name`, `location`, `tags` (resource properties)

### The Output Block

```hcl
output "resource_group_name" {
  value       = azurerm_resource_group.example.name
  description = "The name of the resource group"
}
```

**Purpose:**
- Displays information after deployment
- Can be used by other Terraform configurations
- Accessible via `terraform output` command

---

## Modifying Resources

### Adding a Tag

Edit `main.tf` and add a new tag:

```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-my-first-terraform"
  location = "East US"

  tags = {
    Environment = "Learning"
    ManagedBy   = "Terraform"
    Purpose     = "First Project"
    Owner       = "Your Name"  # New tag!
  }
}
```

**Apply the change:**
```bash
terraform plan
# Review the change (should show tag update)

terraform apply
# Type 'yes' to confirm
```

**Expected Output:**
```
azurerm_resource_group.example: Refreshing state...
azurerm_resource_group.example: Modifying... [id=/subscriptions/.../resourceGroups/rg-my-first-terraform]
azurerm_resource_group.example: Modifications complete after 1s

Apply complete! Resources: 0 added, 1 changed, 0 destroyed.
```

**What happened?**
- Terraform detected a change in configuration
- Updated the resource (didn't recreate it)
- Your resource group now has the new tag

---

### Terraform Detects All Changes

Try changing the location:

```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-my-first-terraform"
  location = "West US"  # Changed from East US
  # ...
}
```

**Run plan:**
```bash
terraform plan
```

**Output:**
```
Terraform will perform the following actions:

  # azurerm_resource_group.example must be replaced
-/+ resource "azurerm_resource_group" "example" {
      ~ id       = "/subscriptions/.../rg-my-first-terraform" -> (known after apply)
      ~ location = "eastus" -> "westus" # forces replacement
        name     = "rg-my-first-terraform"
      # ...
    }

Plan: 1 to add, 0 to change, 1 to destroy.
```

**Notice:** `-/+ resource` means **destroy and recreate**

**Don't apply this** - Just demonstrates that Terraform knows when resources must be replaced.

**Revert the change** (set location back to "East US") before continuing.

---

## Destroying Resources

### Clean Up to Avoid Costs

When you're done experimenting, destroy the resources:

```bash
terraform destroy
```

**Expected Output:**
```
Terraform will perform the following actions:

  # azurerm_resource_group.example will be destroyed
  - resource "azurerm_resource_group" "example" {
      - id       = "/subscriptions/.../rg-my-first-terraform" -> null
      - location = "eastus" -> null
      - name     = "rg-my-first-terraform" -> null
      - tags     = {
          - "Environment" = "Learning" -> null
          - "ManagedBy"   = "Terraform" -> null
          - "Purpose"     = "First Project" -> null
        } -> null
    }

Plan: 0 to add, 0 to change, 1 to destroy.

Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure, as shown above.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value:
```

**Type:** `yes` and press Enter

**Output:**
```
azurerm_resource_group.example: Destroying... [id=/subscriptions/.../rg-my-first-terraform]
azurerm_resource_group.example: Destruction complete after 45s

Destroy complete! Resources: 1 destroyed.
```

**Verify:**
```bash
az group show --name rg-my-first-terraform
# Should return error: Resource group not found
```

---

## Common Errors

### Error: Subscription Not Found

```
Error: Error building AzureRM Client: Authenticating using the Azure CLI is only supported as a User
```

**Solution:**
```bash
az login
az account show
```

---

### Error: Resource Group Name Already Exists

```
Error: A resource with the ID "/subscriptions/.../rg-my-first-terraform" already exists
```

**Solutions:**
1. Use a different name in `main.tf`
2. Import the existing resource: `terraform import azurerm_resource_group.example /subscriptions/.../resourceGroups/rg-my-first-terraform`
3. Delete the existing resource: `az group delete --name rg-my-first-terraform`

---

### Error: Invalid Location

```
Error: expected location to be one of [eastus westus ...], got 'East US'
```

**Solution:** Azure locations must be lowercase without spaces:
```hcl
location = "eastus"  # Correct
# location = "East US"  # Wrong
```

---

### Error: Provider Not Initialized

```
Error: Could not load plugin
```

**Solution:**
```bash
terraform init
```

---

## Best Practices

### 1. Use Version Control

```bash
# Initialize git repository
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Terraform files
.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl

# Sensitive files
*.tfvars
.env
EOF

# Commit
git add main.tf .gitignore
git commit -m "Initial Terraform configuration"
```

---

### 2. Use Meaningful Names

**Good:**
```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-my-first-terraform"  # Clear naming convention
  # ...
}
```

**Better:**
```hcl
resource "azurerm_resource_group" "main" {
  name     = "rg-${var.project_name}-${var.environment}"  # Dynamic names
  # ...
}
```

---

### 3. Always Plan Before Apply

```bash
# Always run plan first
terraform plan -out=tfplan

# Review the plan

# Apply the saved plan
terraform apply tfplan
```

---

### 4. Use Tags Consistently

```hcl
tags = {
  Environment = "dev"
  Project     = "learning"
  ManagedBy   = "terraform"
  CostCenter  = "engineering"
  Owner       = "your-name"
}
```

---

### 5. Destroy When Not Needed

```bash
# Clean up resources to avoid costs
terraform destroy

# Or use auto-approve for automation (use carefully!)
terraform destroy -auto-approve
```

---

## Project Files Explained

After completing this tutorial, your directory contains:

```
my-first-terraform/
├── .terraform/              # Provider plugins (don't commit)
│   └── providers/
│       └── hashicorp/azurerm/
├── .terraform.lock.hcl      # Provider version lock file (commit)
├── main.tf                  # Your configuration (commit)
├── terraform.tfstate        # State file (DON'T commit - has secrets!)
└── terraform.tfstate.backup # Previous state (DON'T commit)
```

**Commit to Git:**
- `main.tf` ✅
- `.terraform.lock.hcl` ✅
- `.gitignore` ✅

**Never Commit:**
- `.terraform/` directory ❌
- `*.tfstate` files ❌
- `*.tfvars` files with secrets ❌

---

## Hands-On Challenges

Try these challenges to reinforce learning:

### Challenge 1: Add Multiple Tags

Add 5 meaningful tags to your resource group.

### Challenge 2: Create in Different Region

Deploy the same resource group to `westus` with a different name.

### Challenge 3: Add Description Output

Create an output that combines the name and location in a sentence.

<details>
<summary>Solution for Challenge 3</summary>

```hcl
output "description" {
  value       = "Resource group ${azurerm_resource_group.example.name} is located in ${azurerm_resource_group.example.location}"
  description = "A description of the resource group"
}
```
</details>

---

## Next Steps

Congratulations on deploying your first Terraform project!

**Next Steps:**
1. **Learn more about workflow:** [05-terraform-workflow.md](./05-terraform-workflow.md)
2. **Understand HCL syntax:** [06-hcl-syntax.md](./06-hcl-syntax.md)
3. **Build real projects:** [Azure Lessons](../01-azure/)

**Want to deploy something more complex?** See:
- [Storage Account Tutorial](../01-azure/03-storage-account.md)
- [Azure Functions Deployment](../01-azure/04-azure-functions.md)

---

## Related Documentation

- [Terraform Workflow](./05-terraform-workflow.md)
- [HCL Syntax Guide](./06-hcl-syntax.md)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

---

**Estimated Completion Time:** 15-20 minutes

**Difficulty:** Beginner

**Previous:** [Cloud CLI Setup](./03-cloud-cli-setup.md) | **Next:** [Terraform Workflow](./05-terraform-workflow.md)
