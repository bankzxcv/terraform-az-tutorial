# Importing Existing Resources

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [When to Import Resources](#when-to-import-resources)
- [The Import Process](#the-import-process)
- [Import Examples](#import-examples)
- [Import Block (Terraform 1.5+)](#import-block-terraform-15)
- [Bulk Import Strategies](#bulk-import-strategies)
- [Common Challenges](#common-challenges)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

---

## Overview

Terraform import allows you to bring existing cloud resources under Terraform management without recreating them. This is essential when adopting Infrastructure as Code for existing infrastructure or recovering from state file loss.

---

## Learning Objectives

By the end of this guide, you will:
- Understand when and why to import resources
- Import Azure, AWS, and GCP resources
- Write configuration to match imported resources
- Use the new import block feature (Terraform 1.5+)
- Implement bulk import strategies
- Handle common import challenges
- Follow best practices for importing infrastructure

---

## Difficulty Level

**Advanced** - Requires understanding of Terraform and cloud platforms.

---

## Time Estimate

**40-60 minutes** - Including hands-on practice.

---

## When to Import Resources

### Common Scenarios

1. **Adopting Terraform for existing infrastructure**
   - Organization has manually created resources
   - Want to bring under IaC management

2. **State file loss or corruption**
   - Lost terraform.tfstate file
   - Need to rebuild state

3. **Resources created outside Terraform**
   - Created via Azure Portal, AWS Console, or CLI
   - Want to manage with Terraform

4. **Splitting/merging configurations**
   - Moving resources between Terraform projects
   - Consolidating multiple configurations

5. **Third-party resource management**
   - Resources created by ARM templates, CloudFormation
   - Migrating to Terraform

---

## The Import Process

### Step-by-Step Workflow

```
1. IDENTIFY RESOURCE
   - Find resource ID
   - Determine resource type
        ↓
2. WRITE CONFIGURATION
   - Create skeleton .tf file
   - Match resource type
        ↓
3. IMPORT RESOURCE
   - Run terraform import
   - Adds to state file
        ↓
4. REFINE CONFIGURATION
   - Run terraform plan
   - Update config to eliminate diffs
        ↓
5. VERIFY
   - Ensure plan shows no changes
   - Document import
```

---

## Import Examples

### Azure Resources

#### Import Resource Group

**Step 1: Find Resource ID**
```bash
az group show --name existing-rg --query id --output tsv
# Output: /subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/existing-rg
```

**Step 2: Write Configuration**
```hcl
# main.tf
resource "azurerm_resource_group" "imported" {
  name     = "existing-rg"
  location = "eastus"
}
```

**Step 3: Import**
```bash
terraform import azurerm_resource_group.imported \
  /subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/existing-rg
```

**Step 4: Verify**
```bash
terraform plan
# Should show no changes if configuration matches
```

---

#### Import Storage Account

```bash
# Get resource ID
az storage account show \
  --name stexisting \
  --resource-group existing-rg \
  --query id --output tsv

# Create configuration
cat > storage.tf << 'EOF'
resource "azurerm_storage_account" "imported" {
  name                     = "stexisting"
  resource_group_name      = "existing-rg"
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
EOF

# Import
terraform import azurerm_storage_account.imported \
  /subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/existing-rg/providers/Microsoft.Storage/storageAccounts/stexisting

# Refine configuration
terraform plan
# Update .tf file based on plan output
```

---

#### Import Virtual Network

```bash
# Configuration
cat > network.tf << 'EOF'
resource "azurerm_virtual_network" "imported" {
  name                = "vnet-existing"
  location            = "eastus"
  resource_group_name = "existing-rg"
  address_space       = ["10.0.0.0/16"]
}
EOF

# Import
terraform import azurerm_virtual_network.imported \
  /subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/existing-rg/providers/Microsoft.Network/virtualNetworks/vnet-existing
```

---

### AWS Resources

#### Import EC2 Instance

```bash
# Get instance ID
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=my-server" \
  --query 'Reservations[0].Instances[0].InstanceId' \
  --output text
# Output: i-1234567890abcdef0

# Configuration
cat > ec2.tf << 'EOF'
resource "aws_instance" "imported" {
  ami           = "ami-0c55b159cbfafe1f0"
  instance_type = "t3.micro"

  tags = {
    Name = "my-server"
  }
}
EOF

# Import
terraform import aws_instance.imported i-1234567890abcdef0
```

---

#### Import S3 Bucket

```bash
# Configuration
cat > s3.tf << 'EOF'
resource "aws_s3_bucket" "imported" {
  bucket = "my-existing-bucket"
}
EOF

# Import (use bucket name as ID)
terraform import aws_s3_bucket.imported my-existing-bucket
```

---

### Google Cloud Resources

#### Import Compute Instance

```bash
# Configuration
cat > compute.tf << 'EOF'
resource "google_compute_instance" "imported" {
  name         = "my-instance"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }
}
EOF

# Import
terraform import google_compute_instance.imported \
  projects/my-project/zones/us-central1-a/instances/my-instance
```

---

## Import Block (Terraform 1.5+)

### New Declarative Import

**Terraform 1.5+ introduces the `import` block** - a declarative way to import resources.

**Benefits:**
- Declarative (version controlled)
- Can be planned before execution
- Supports generating configuration

---

### Using Import Blocks

**import.tf:**
```hcl
# Import Azure resource group
import {
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/existing-rg"
  to = azurerm_resource_group.imported
}

# Import storage account
import {
  id = "/subscriptions/12345678-1234-1234-1234-123456789012/resourceGroups/existing-rg/providers/Microsoft.Storage/storageAccounts/stexisting"
  to = azurerm_storage_account.imported
}
```

**main.tf:**
```hcl
resource "azurerm_resource_group" "imported" {
  name     = "existing-rg"
  location = "eastus"
}

resource "azurerm_storage_account" "imported" {
  name                     = "stexisting"
  resource_group_name      = azurerm_resource_group.imported.name
  location                 = azurerm_resource_group.imported.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}
```

**Execute import:**
```bash
# Plan the import
terraform plan -generate-config-out=generated.tf

# This generates configuration automatically!

# Apply to import
terraform apply
```

---

### Generated Configuration

With `-generate-config-out`, Terraform can generate the configuration:

```bash
# Import and generate config in one step
terraform plan -generate-config-out=generated.tf

# Review generated configuration
cat generated.tf
```

**generated.tf:**
```hcl
resource "azurerm_resource_group" "imported" {
  location = "eastus"
  name     = "existing-rg"
  tags = {
    environment = "production"
  }
}
```

---

## Bulk Import Strategies

### Strategy 1: Script-Based Import

**import-resources.sh:**
```bash
#!/bin/bash

# List of resource groups to import
RESOURCE_GROUPS=(
  "rg-app-dev"
  "rg-app-staging"
  "rg-app-prod"
)

for rg in "${RESOURCE_GROUPS[@]}"; do
  echo "Importing resource group: $rg"

  # Get resource ID
  RG_ID=$(az group show --name $rg --query id --output tsv)

  # Create configuration
  cat >> resources.tf << EOF
resource "azurerm_resource_group" "$rg" {
  name     = "$rg"
  location = "eastus"
}

EOF

  # Import
  terraform import "azurerm_resource_group.$rg" "$RG_ID"
done

echo "Import complete! Run 'terraform plan' to verify."
```

---

### Strategy 2: Using Terraformer

**Terraformer** is a CLI tool that generates Terraform configuration from existing infrastructure.

**Installation:**
```bash
# macOS
brew install terraformer

# Linux
curl -LO https://github.com/GoogleCloudPlatform/terraformer/releases/download/$(curl -s https://api.github.com/repos/GoogleCloudPlatform/terraformer/releases/latest | grep tag_name | cut -d '"' -f 4)/terraformer-all-linux-amd64
chmod +x terraformer-all-linux-amd64
sudo mv terraformer-all-linux-amd64 /usr/local/bin/terraformer
```

**Usage with Azure:**
```bash
# Export all resources from resource group
terraformer import azure \
  --resources=resource_group,storage_account,virtual_network \
  --filter=resource_group=existing-rg \
  --output-dir=imported

# Review generated files
ls imported/azurerm/
# resource_group.tf
# storage_account.tf
# virtual_network.tf
```

**Usage with AWS:**
```bash
# Export specific resources
terraformer import aws \
  --resources=ec2_instance,s3,vpc \
  --regions=us-east-1 \
  --filter=Name=tags.Environment;Value=production

# Export by resource ID
terraformer import aws \
  --resources=ec2_instance \
  --filter=ec2_instance=i-1234567890abcdef0
```

---

### Strategy 3: Azure Resource Graph

For Azure, use Resource Graph to discover resources:

```bash
# List all resources in subscription
az graph query -q "Resources | project name, type, resourceGroup, location" \
  --output table

# Query specific resource types
az graph query -q "Resources | where type =~ 'Microsoft.Storage/storageAccounts' | project name, resourceGroup" \
  --output table
```

---

## Common Challenges

### Challenge 1: Configuration Doesn't Match Reality

**Problem:**
```bash
terraform plan

# Shows:
# ~ resource "azurerm_storage_account" "imported" {
#     ~ account_replication_type = "LRS" -> "GRS"
#     # ...
# }
```

**Solution:**
Update configuration to match actual resource:
```hcl
resource "azurerm_storage_account" "imported" {
  account_replication_type = "GRS"  # Match reality
  # ...
}
```

---

### Challenge 2: Computed/Optional Attributes

**Problem:**
Many attributes are computed or optional, making it hard to match configuration.

**Solution:**
Use `terraform show` to see the full state:
```bash
terraform show -json | jq '.values.root_module.resources[] | select(.address=="azurerm_storage_account.imported")'
```

Copy relevant attributes to configuration.

---

### Challenge 3: Nested Resources

**Problem:**
Some resources are nested and must be imported separately.

**Example - Azure NSG with rules:**
```bash
# Import NSG
terraform import azurerm_network_security_group.example \
  /subscriptions/.../networkSecurityGroups/nsg-example

# Import NSG rule (separate resource!)
terraform import azurerm_network_security_rule.allow_http \
  /subscriptions/.../networkSecurityGroups/nsg-example/securityRules/allow_http
```

---

### Challenge 4: Resource Dependencies

**Problem:**
Imported resources may reference other resources.

**Solution:**
Import in dependency order:
```bash
# 1. Import resource group first
terraform import azurerm_resource_group.main ...

# 2. Import vnet (depends on RG)
terraform import azurerm_virtual_network.main ...

# 3. Import subnet (depends on vnet)
terraform import azurerm_subnet.main ...
```

---

### Challenge 5: Different Resource ID Formats

Each provider uses different ID formats:

**Azure:**
```
/subscriptions/{subscription-id}/resourceGroups/{rg-name}/providers/{provider}/{resource-type}/{resource-name}
```

**AWS:**
```
i-1234567890abcdef0  # EC2
arn:aws:s3:::bucket-name  # S3
subnet-12345678  # Subnet
```

**GCP:**
```
projects/{project}/zones/{zone}/instances/{name}
```

**Check provider documentation** for exact format!

---

## Best Practices

### 1. Start Small

```bash
# Import one resource first
terraform import azurerm_resource_group.test \
  /subscriptions/.../resourceGroups/test-rg

# Verify it works
terraform plan

# Then import more
```

### 2. Document Imports

**imported.md:**
```markdown
# Imported Resources

## 2024-01-15

Imported existing production infrastructure:
- Resource Group: rg-prod
- Storage Account: stprod123
- Virtual Network: vnet-prod

**Import commands used:**
```bash
terraform import azurerm_resource_group.prod ...
terraform import azurerm_storage_account.prod ...
```

**Verified:** terraform plan shows no changes
```

### 3. Use Version Control

```bash
# Commit before import
git add .
git commit -m "Pre-import checkpoint"

# Import resources
terraform import ...

# Commit after successful import
git add .
git commit -m "Imported existing production resources"
```

### 4. Test in Non-Production First

```bash
# Import dev resources first
terraform workspace select development
terraform import ...

# Verify plan works
terraform plan

# Then import production
terraform workspace select production
terraform import ...
```

### 5. Backup State Before Import

```bash
# Backup state
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d)

# Import
terraform import ...

# If something goes wrong, restore
cp terraform.tfstate.backup.YYYYMMDD terraform.tfstate
```

---

## Import Checklist

Use this checklist for each import:

- [ ] Find exact resource ID
- [ ] Verify resource exists in cloud
- [ ] Write skeleton configuration
- [ ] Run terraform init
- [ ] Run terraform import
- [ ] Run terraform plan
- [ ] Refine configuration to eliminate diffs
- [ ] Verify plan shows no changes
- [ ] Test apply in non-prod
- [ ] Document import
- [ ] Commit to version control

---

## Next Steps

Now that you can import existing resources:

1. **Learn testing:** [04-terraform-testing.md](./04-terraform-testing.md)
2. **Disaster recovery:** [05-disaster-recovery.md](./05-disaster-recovery.md)
3. **Performance optimization:** [06-performance-optimization.md](./06-performance-optimization.md)

---

## Related Documentation

- [State Management](./01-state-management.md)
- [Workspaces](./02-workspaces.md)
- [Terraform Import Documentation](https://www.terraform.io/cli/import)
- [Terraformer](https://github.com/GoogleCloudPlatform/terraformer)

---

**Estimated Completion Time:** 40-60 minutes

**Difficulty:** Advanced

**Previous:** [Workspaces](./02-workspaces.md) | **Next:** [Terraform Testing](./04-terraform-testing.md)
