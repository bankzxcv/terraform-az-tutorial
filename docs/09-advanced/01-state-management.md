# State Management

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Understanding State](#understanding-state)
- [Local vs Remote State](#local-vs-remote-state)
- [Remote State Backends](#remote-state-backends)
- [State Locking](#state-locking)
- [State Management Commands](#state-management-commands)
- [State Security](#state-security)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Overview

Terraform state is the single source of truth for your infrastructure. Understanding state management is critical for production deployments, team collaboration, and maintaining infrastructure integrity. This guide covers state fundamentals, remote backends, locking, and security best practices.

---

## Learning Objectives

By the end of this guide, you will:
- Understand what Terraform state is and why it's important
- Configure remote state backends (Azure Storage, AWS S3, Terraform Cloud)
- Implement state locking to prevent concurrent modifications
- Manage state safely with Terraform commands
- Secure sensitive data in state files
- Handle state drift and conflicts
- Follow DevSecOps best practices for state management

---

## Difficulty Level

**Advanced** - Requires understanding of Terraform basics and cloud platforms.

---

## Time Estimate

**45-60 minutes** - Including hands-on configuration.

---

## Understanding State

### What is Terraform State?

Terraform state is a **JSON file** that:
- Maps Terraform configuration to real-world resources
- Tracks resource metadata and dependencies
- Caches resource attribute values for performance
- Enables Terraform to determine what changes are needed

**Default location:** `terraform.tfstate` in your project directory

---

### State File Structure

```json
{
  "version": 4,
  "terraform_version": "1.6.0",
  "serial": 1,
  "lineage": "abc123...",
  "outputs": {
    "resource_group_id": {
      "value": "/subscriptions/.../resourceGroups/rg-example",
      "type": "string"
    }
  },
  "resources": [
    {
      "mode": "managed",
      "type": "azurerm_resource_group",
      "name": "example",
      "provider": "provider[\"registry.terraform.io/hashicorp/azurerm\"]",
      "instances": [
        {
          "schema_version": 0,
          "attributes": {
            "id": "/subscriptions/.../resourceGroups/rg-example",
            "location": "eastus",
            "name": "rg-example",
            "tags": {}
          },
          "sensitive_attributes": [],
          "private": "ey..."
        }
      ]
    }
  ]
}
```

---

### Why State Matters

1. **Resource Tracking:** Knows which cloud resources Terraform manages
2. **Performance:** Cached attributes avoid API calls on every plan
3. **Metadata:** Stores resource dependencies and relationships
4. **Collaboration:** Enables team members to work on the same infrastructure
5. **Drift Detection:** Compares desired state with actual state

---

### State File Risks

**Security Risks:**
- Contains sensitive data (passwords, keys, connection strings)
- Should NEVER be committed to version control
- Requires encryption at rest and in transit

**Operational Risks:**
- Corruption can make infrastructure unmanageable
- Loss means losing infrastructure tracking
- Concurrent modifications can cause conflicts

---

## Local vs Remote State

### Local State (Default)

**Pros:**
- Simple setup (no configuration needed)
- Fast for solo developers
- Good for learning and testing

**Cons:**
- ❌ Not suitable for teams (no collaboration)
- ❌ No locking (concurrent access issues)
- ❌ No backup/versioning
- ❌ Stored in plain text locally
- ❌ Not secure for production
- ❌ CI/CD requires workarounds

**Use case:** Learning, local testing, temporary environments

---

### Remote State (Recommended)

**Pros:**
- ✅ Team collaboration (shared state)
- ✅ State locking (prevents conflicts)
- ✅ Automatic backup and versioning
- ✅ Encryption at rest
- ✅ Access control and auditing
- ✅ CI/CD friendly

**Cons:**
- Requires initial setup
- Depends on external service
- May incur small costs

**Use case:** Production, team projects, CI/CD

---

## Remote State Backends

### Azure Storage Backend

**Recommended for Azure deployments**

#### Step 1: Create Storage Account

```bash
# Set variables
RESOURCE_GROUP_NAME="rg-terraform-state"
STORAGE_ACCOUNT_NAME="sttfstate$(openssl rand -hex 4)"
CONTAINER_NAME="tfstate"
LOCATION="eastus"

# Create resource group
az group create \
  --name $RESOURCE_GROUP_NAME \
  --location $LOCATION

# Create storage account
az storage account create \
  --name $STORAGE_ACCOUNT_NAME \
  --resource-group $RESOURCE_GROUP_NAME \
  --location $LOCATION \
  --sku Standard_LRS \
  --encryption-services blob \
  --min-tls-version TLS1_2

# Create container
az storage container create \
  --name $CONTAINER_NAME \
  --account-name $STORAGE_ACCOUNT_NAME \
  --auth-mode login
```

#### Step 2: Configure Backend

**backend.tf:**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate12ab34cd"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"
  }
}
```

#### Step 3: Initialize

```bash
# Initialize with backend
terraform init

# Migrate existing local state
terraform init -migrate-state
```

---

### AWS S3 Backend

**Recommended for AWS deployments**

#### Step 1: Create S3 Bucket and DynamoDB Table

```bash
# Create S3 bucket
aws s3api create-bucket \
  --bucket my-terraform-state-bucket \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-terraform-state-bucket \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket my-terraform-state-bucket \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Create DynamoDB table for locking
aws dynamodb create-table \
  --table-name terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5
```

#### Step 2: Configure Backend

**backend.tf:**
```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state-bucket"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-state-lock"
  }
}
```

---

### Terraform Cloud Backend

**Recommended for all platforms**

#### Step 1: Create Workspace

1. Sign up at https://app.terraform.io
2. Create organization
3. Create workspace

#### Step 2: Configure Backend

**backend.tf:**
```hcl
terraform {
  cloud {
    organization = "my-org"

    workspaces {
      name = "production"
    }
  }
}
```

#### Step 3: Authenticate

```bash
# Login to Terraform Cloud
terraform login

# Initialize
terraform init
```

---

### Google Cloud Storage Backend

**Recommended for GCP deployments**

#### Step 1: Create GCS Bucket

```bash
# Create bucket
gsutil mb -p PROJECT_ID -l US gs://my-terraform-state-bucket/

# Enable versioning
gsutil versioning set on gs://my-terraform-state-bucket/
```

#### Step 2: Configure Backend

**backend.tf:**
```hcl
terraform {
  backend "gcs" {
    bucket  = "my-terraform-state-bucket"
    prefix  = "production"
  }
}
```

---

## State Locking

### What is State Locking?

**State locking** prevents multiple users from running Terraform simultaneously, which could corrupt the state.

**How it works:**
1. User runs `terraform apply`
2. Terraform acquires a lock
3. Other users wait or get an error
4. Lock is released after operation completes

---

### Backend Locking Support

| Backend          | Locking Support | Lock Mechanism                    |
|------------------|-----------------|-----------------------------------|
| Azure Storage    | ✅ Yes          | Blob lease                        |
| AWS S3           | ✅ Yes          | DynamoDB table                    |
| Terraform Cloud  | ✅ Yes          | Built-in                          |
| GCS              | ✅ Yes          | Built-in                          |
| Local            | ❌ No           | None                              |

---

### Force Unlock (Emergency)

```bash
# Only use if you're sure no one else is running Terraform!
terraform force-unlock LOCK_ID
```

**Get lock ID from error message:**
```
Error: Error acquiring the state lock

Error message: ConditionalCheckFailedException: The conditional request failed
Lock Info:
  ID:        abc-123-def-456
  Path:      production/terraform.tfstate
  Operation: OperationTypeApply
  Who:       user@example.com
  Version:   1.6.0
  Created:   2024-01-15 10:30:00
  Info:
```

---

## State Management Commands

### terraform state list

**List all resources in state:**
```bash
terraform state list
```

**Output:**
```
azurerm_resource_group.example
azurerm_storage_account.example
azurerm_virtual_network.main
azurerm_subnet.web
azurerm_subnet.app
```

---

### terraform state show

**Show detailed resource information:**
```bash
terraform state show azurerm_resource_group.example
```

**Output:**
```hcl
# azurerm_resource_group.example:
resource "azurerm_resource_group" "example" {
    id       = "/subscriptions/.../resourceGroups/rg-example"
    location = "eastus"
    name     = "rg-example"
    tags     = {}
}
```

---

### terraform state mv

**Rename or move resources:**

```bash
# Rename resource
terraform state mv azurerm_resource_group.old azurerm_resource_group.new

# Move to module
terraform state mv azurerm_resource_group.example module.networking.azurerm_resource_group.example

# Move between workspaces
terraform state mv -state-out=../other/terraform.tfstate azurerm_resource_group.example azurerm_resource_group.example
```

---

### terraform state rm

**Remove resource from state (doesn't destroy):**

```bash
# Remove single resource
terraform state rm azurerm_resource_group.example

# Remove module
terraform state rm module.networking

# Remove with wildcard
terraform state rm 'azurerm_subnet.web[*]'
```

**Use case:** Resource was deleted manually or moved to different Terraform configuration

---

### terraform state pull

**Download remote state:**

```bash
# Pull and display state
terraform state pull

# Save to file
terraform state pull > backup.tfstate
```

---

### terraform state push

**Upload local state (dangerous!):**

```bash
# Push modified state (use with extreme caution!)
terraform state push terraform.tfstate
```

**Warning:** Can overwrite remote state!

---

### terraform import

**Import existing resources into state:**

```bash
# Import Azure resource group
terraform import azurerm_resource_group.example \
  /subscriptions/SUBSCRIPTION_ID/resourceGroups/existing-rg

# Import AWS EC2 instance
terraform import aws_instance.example i-1234567890abcdef0

# Import GCP compute instance
terraform import google_compute_instance.example projects/PROJECT_ID/zones/ZONE/instances/INSTANCE_NAME
```

**After import:**
```bash
# Write configuration to match imported resource
# Then verify
terraform plan  # Should show no changes
```

---

## State Security

### Sensitive Data in State

**State files contain:**
- Database passwords
- API keys and secrets
- Private keys
- Connection strings
- Resource IDs and metadata

---

### Security Best Practices

#### 1. Never Commit State to Git

**.gitignore:**
```
# Terraform state files
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl

# Backup files
*.backup
*.bak
```

#### 2. Encrypt State at Rest

**Azure Storage:**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "production.tfstate"
    # Encryption enabled by default
  }
}
```

**AWS S3:**
```hcl
terraform {
  backend "s3" {
    bucket  = "my-terraform-state"
    key     = "production.tfstate"
    region  = "us-east-1"
    encrypt = true  # Enable encryption
    kms_key_id = "arn:aws:kms:us-east-1:123456789:key/..."  # Optional KMS key
  }
}
```

#### 3. Encrypt State in Transit

All major backends use HTTPS by default.

#### 4. Implement Access Control

**Azure Storage:**
```bash
# Use RBAC
az role assignment create \
  --role "Storage Blob Data Contributor" \
  --assignee user@example.com \
  --scope /subscriptions/.../resourceGroups/rg-terraform-state/providers/Microsoft.Storage/storageAccounts/sttfstate
```

**AWS S3:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789:user/terraform-user"
      },
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-terraform-state/*"
    }
  ]
}
```

#### 5. Enable Versioning

**Azure Storage:**
```bash
az storage blob service-properties update \
  --account-name sttfstate \
  --enable-versioning true
```

**AWS S3:**
```bash
aws s3api put-bucket-versioning \
  --bucket my-terraform-state \
  --versioning-configuration Status=Enabled
```

#### 6. Use Sensitive Outputs

```hcl
output "database_password" {
  value     = azurerm_mssql_server.example.administrator_login_password
  sensitive = true  # Won't show in logs
}
```

---

## Best Practices

### 1. Use Remote State for All Production

```hcl
# Good - Remote state with locking
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

### 2. Separate State by Environment

```
terraform/
├── production/
│   ├── backend.tf (key = "prod.tfstate")
│   └── main.tf
├── staging/
│   ├── backend.tf (key = "staging.tfstate")
│   └── main.tf
└── development/
    ├── backend.tf (key = "dev.tfstate")
    └── main.tf
```

### 3. Use Partial Configuration

**Backend config file (backend-config.hcl):**
```hcl
resource_group_name  = "rg-terraform-state"
storage_account_name = "sttfstate"
container_name       = "tfstate"
```

**Initialize:**
```bash
terraform init -backend-config=backend-config.hcl
```

**Benefits:**
- Keep sensitive backend config out of Git
- Different configs for different environments

### 4. Regular State Backups

```bash
# Automated backup script
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
terraform state pull > "backups/terraform-${DATE}.tfstate"
```

### 5. State Refreshing

```bash
# Refresh state to detect drift
terraform plan -refresh-only
terraform apply -refresh-only
```

---

## Troubleshooting

### State File Corruption

**Symptoms:**
- Errors when running terraform commands
- Invalid JSON in state file

**Solution:**
```bash
# Restore from backup
cp terraform.tfstate.backup terraform.tfstate

# Or restore from remote backend version
# Azure Storage example:
az storage blob download \
  --account-name sttfstate \
  --container-name tfstate \
  --name production.tfstate \
  --file terraform.tfstate
```

---

### State Drift

**Symptoms:**
- Manual changes in cloud console
- Resources don't match configuration

**Detection:**
```bash
terraform plan -refresh-only
```

**Resolution:**
```bash
# Option 1: Accept drift (update state)
terraform apply -refresh-only

# Option 2: Fix configuration to match reality
# Edit .tf files then:
terraform plan
terraform apply

# Option 3: Restore infrastructure to match state
terraform apply
```

---

### State Lock Timeout

**Symptoms:**
```
Error: Error acquiring the state lock
```

**Solution:**
```bash
# Wait for lock to be released
# Or force unlock (if you're sure it's safe)
terraform force-unlock LOCK_ID
```

---

## Next Steps

Now that you understand state management:

1. **Learn about workspaces:** [02-workspaces.md](./02-workspaces.md)
2. **Import existing resources:** [03-import-existing.md](./03-import-existing.md)
3. **Implement testing:** [04-terraform-testing.md](./04-terraform-testing.md)

---

## Related Documentation

- [Terraform Workspaces](./02-workspaces.md)
- [Disaster Recovery](./05-disaster-recovery.md)
- [Terraform Backend Documentation](https://www.terraform.io/language/settings/backends)

---

**Estimated Completion Time:** 45-60 minutes

**Difficulty:** Advanced

**Next:** [Workspaces](./02-workspaces.md)
