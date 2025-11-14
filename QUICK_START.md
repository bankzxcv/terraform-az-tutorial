# Quick Start - Deploy in 15 Minutes

Get your first Terraform deployment running in under 15 minutes!

---

## Prerequisites Check (2 minutes)

Verify you have the following installed:

```bash
# Check Terraform
terraform version
# Should show: Terraform v1.5.0 or higher

# Check Azure CLI
az version
# Should show azure-cli version 2.40+ or higher

# Check Azure login
az account show
# Should show your Azure subscription
```

**Not installed?** Follow the [Prerequisites Guide](docs/00-getting-started/01-prerequisites.md).

---

## Step 1: Create Project (1 minute)

```bash
# Create and enter project directory
mkdir my-first-terraform && cd my-first-terraform
```

---

## Step 2: Create Configuration (3 minutes)

Create a file named `main.tf`:

```hcl
# main.tf

# Terraform configuration
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

# Resource Group
resource "azurerm_resource_group" "quickstart" {
  name     = "rg-quickstart"
  location = "East US"

  tags = {
    Environment = "Learning"
    CreatedBy   = "Terraform"
    Project     = "QuickStart"
  }
}

# Storage Account
resource "azurerm_storage_account" "quickstart" {
  name                     = "stquick${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.quickstart.name
  location                 = azurerm_resource_group.quickstart.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    Environment = "Learning"
    CreatedBy   = "Terraform"
  }
}

# Random suffix for unique storage account name
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Outputs
output "resource_group_name" {
  value       = azurerm_resource_group.quickstart.name
  description = "Name of the resource group"
}

output "storage_account_name" {
  value       = azurerm_storage_account.quickstart.name
  description = "Name of the storage account"
}

output "storage_account_url" {
  value       = azurerm_storage_account.quickstart.primary_blob_endpoint
  description = "Primary blob storage endpoint"
}
```

**Copy the above code** and save as `main.tf` in your project directory.

---

## Step 3: Initialize Terraform (2 minutes)

```bash
# Download providers and initialize
terraform init
```

**Expected output:**
```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/azurerm versions matching "~> 3.0"...
- Finding latest version of hashicorp/random...
- Installing hashicorp/azurerm v3.75.0...
- Installing hashicorp/random v3.5.1...

Terraform has been successfully initialized!
```

---

## Step 4: Preview Changes (2 minutes)

```bash
# See what Terraform will create
terraform plan
```

**Expected output:**
```
Terraform will perform the following actions:

  # azurerm_resource_group.quickstart will be created
  + resource "azurerm_resource_group" "quickstart" {
      + name     = "rg-quickstart"
      + location = "eastus"
      ...
    }

  # azurerm_storage_account.quickstart will be created
  + resource "azurerm_storage_account" "quickstart" {
      + name                     = "stquickXXXXXXXX"
      + account_tier             = "Standard"
      + account_replication_type = "LRS"
      ...
    }

  # random_string.suffix will be created
  + resource "random_string" "suffix" {
      + length  = 8
      + special = false
      + upper   = false
      ...
    }

Plan: 3 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + resource_group_name  = "rg-quickstart"
  + storage_account_name = (known after apply)
  + storage_account_url  = (known after apply)
```

---

## Step 5: Deploy! (3 minutes)

```bash
# Apply the configuration
terraform apply
```

When prompted, type `yes` and press Enter.

**Expected output:**
```
Do you want to perform these actions?
  Terraform will perform the actions described above.
  Only 'yes' will be accepted to approve.

  Enter a value: yes

random_string.suffix: Creating...
random_string.suffix: Creation complete after 0s [id=a1b2c3d4]
azurerm_resource_group.quickstart: Creating...
azurerm_resource_group.quickstart: Creation complete after 1s
azurerm_storage_account.quickstart: Creating...
azurerm_storage_account.quickstart: Still creating... [10s elapsed]
azurerm_storage_account.quickstart: Creation complete after 23s

Apply complete! Resources: 3 added, 0 changed, 0 destroyed.

Outputs:

resource_group_name = "rg-quickstart"
storage_account_name = "stquicka1b2c3d4"
storage_account_url = "https://stquicka1b2c3d4.blob.core.windows.net/"
```

---

## Step 6: Verify (1 minute)

Check your resources exist in Azure:

```bash
# List resource groups
az group list --output table | grep quickstart

# Show storage account
az storage account show \
  --name $(terraform output -raw storage_account_name) \
  --resource-group $(terraform output -raw resource_group_name)
```

**Or check in Azure Portal:**
1. Open https://portal.azure.com
2. Search for "Resource Groups"
3. Find "rg-quickstart"
4. View your resources!

---

## Step 7: Make a Change (2 minutes)

Let's add another tag to the resources.

Edit `main.tf` and update the resource group tags:

```hcl
resource "azurerm_resource_group" "quickstart" {
  name     = "rg-quickstart"
  location = "East US"

  tags = {
    Environment = "Learning"
    CreatedBy   = "Terraform"
    Project     = "QuickStart"
    Owner       = "Your Name"  # Add this line
  }
}
```

Apply the change:

```bash
# Preview the change
terraform plan

# Apply the change
terraform apply
```

Notice Terraform only updates the tag - it doesn't recreate the resource!

---

## Step 8: Clean Up (1 minute)

When you're done exploring, destroy the resources to avoid costs:

```bash
# Destroy all resources
terraform destroy
```

When prompted, type `yes` and press Enter.

**Expected output:**
```
Do you really want to destroy all resources?
  Terraform will destroy all your managed infrastructure, as shown above.
  There is no undo. Only 'yes' will be accepted to confirm.

  Enter a value: yes

azurerm_storage_account.quickstart: Destroying...
azurerm_storage_account.quickstart: Destruction complete after 12s
azurerm_resource_group.quickstart: Destroying...
azurerm_resource_group.quickstart: Destruction complete after 45s
random_string.suffix: Destroying...
random_string.suffix: Destruction complete after 0s

Destroy complete! Resources: 3 destroyed.
```

---

## Congratulations!

You just:
- Created your first Terraform configuration
- Deployed real Azure infrastructure
- Modified resources without recreating them
- Cleaned up resources to avoid costs

---

## What You Learned

**Core Terraform Concepts:**
- Configuration files (`.tf`)
- Providers (Azure, Random)
- Resources (Resource Group, Storage Account)
- Outputs (displaying information)
- Workflow (init, plan, apply, destroy)

**Azure Resources:**
- Resource Groups (logical containers)
- Storage Accounts (blob storage)
- Resource tagging

---

## Next Steps

### Continue Learning

**Beginner Track:**
1. **[HCL Syntax](docs/00-getting-started/06-hcl-syntax.md)** - Learn more about Terraform language
2. **[Terraform Workflow](docs/00-getting-started/05-terraform-workflow.md)** - Master all Terraform commands
3. **[Azure Lessons](docs/01-azure/)** - Deploy more Azure services

**Want More Depth?**
- **[Complete Learning Path](LEARNING_PATH.md)** - Structured curriculum
- **[Advanced Topics](docs/09-advanced/)** - Production-ready patterns

### Try Another Quick Deploy

**Deploy a Static Website:**
```hcl
resource "azurerm_storage_account" "website" {
  name                     = "stwebsite${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.quickstart.name
  location                 = azurerm_resource_group.quickstart.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  static_website {
    index_document = "index.html"
  }
}

resource "azurerm_storage_blob" "index" {
  name                   = "index.html"
  storage_account_name   = azurerm_storage_account.website.name
  storage_container_name = "$web"
  type                   = "Block"
  content_type           = "text/html"
  source_content         = "<h1>Hello from Terraform!</h1>"
}

output "website_url" {
  value = azurerm_storage_account.website.primary_web_endpoint
}
```

---

## Troubleshooting

### Issue: terraform: command not found
**Solution:** Install Terraform following the [Installation Guide](docs/00-getting-started/02-terraform-installation.md)

### Issue: Azure authentication failed
**Solution:**
```bash
az login
az account show
```

### Issue: Storage account name already taken
**Solution:** The random suffix should make it unique. If not, run:
```bash
terraform destroy
terraform apply
# New random suffix will be generated
```

### Issue: Insufficient permissions
**Solution:** Ensure you have Contributor or Owner role on your Azure subscription

---

## Resources

- **[Full Prerequisites Guide](docs/00-getting-started/01-prerequisites.md)**
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - More deployment examples
- **[Complete Tutorial](README.md)** - Full learning experience
- **[Get Help](https://github.com/YOUR_USERNAME/terraform-az-tutorial/discussions)**

---

**Time to First Success:** 15 minutes

**Ready for more?** Check out the [Complete Learning Path](LEARNING_PATHS.md)!
