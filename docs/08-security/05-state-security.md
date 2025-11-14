# Secure Terraform State Management

## Learning Objectives

- Implement secure state storage
- Configure state encryption
- Manage state access controls  
- Implement state backup and recovery
- Secure state in CI/CD pipelines

**Estimated Time:** 45-60 minutes

---

## State File Security Risks

State files contain:
- Resource IDs and metadata
- **Sensitive data** (passwords, keys, certificates)
- Infrastructure topology
- Provider configurations

### Common Vulnerabilities

❌ **Never do this:**
- Store state in version control
- Use local state for production
- Share state files via email/Slack
- Use unencrypted remote backends
- Grant broad access to state storage

---

## Secure Remote State Configuration

### Azure Storage Backend (Recommended)

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstateprod"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
  }
}
```

### Secure Storage Account Setup

```hcl
resource "azurerm_storage_account" "tfstate" {
  name                = "tfstateprod${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.tfstate.name
  location            = azurerm_resource_group.tfstate.location

  account_tier             = "Standard"
  account_replication_type = "GRS"  # Geo-redundant

  # Security settings
  enable_https_traffic_only       = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  shared_access_key_enabled       = false  # Use Azure AD auth

  # Encryption
  infrastructure_encryption_enabled = true

  # Network security
  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = var.allowed_ips
    virtual_network_subnet_ids = [azurerm_subnet.admin.id]
  }

  # Versioning and soft delete
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 90
    }

    container_delete_retention_policy {
      days = 90
    }
  }

  # Use customer-managed encryption keys
  identity {
    type = "SystemAssigned"
  }
}

# Customer-managed encryption key
resource "azurerm_key_vault_key" "tfstate" {
  name         = "tfstate-encryption-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA-HSM"
  key_size     = 4096

  key_opts = [
    "decrypt",
    "encrypt",
    "unwrapKey",
    "wrapKey",
  ]

  rotation_policy {
    automatic {
      time_before_expiry = "P30D"
    }
    expire_after         = "P90D"
    notify_before_expiry = "P29D"
  }
}

resource "azurerm_storage_account_customer_managed_key" "tfstate" {
  storage_account_id = azurerm_storage_account.tfstate.id
  key_vault_id       = azurerm_key_vault.main.id
  key_name           = azurerm_key_vault_key.tfstate.name
}

# State locking with lease
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}
```

### AWS S3 Backend

```hcl
terraform {
  backend "s3" {
    bucket         = "terraform-state-prod"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abcd1234"
    dynamodb_table = "terraform-state-lock"
  }
}
```

### Secure S3 Bucket

```hcl
resource "aws_s3_bucket" "tfstate" {
  bucket = "terraform-state-prod"
}

# Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tfstate.arn
    }
    bucket_key_enabled = true
  }
}

# Versioning
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"
  }
}

# Public access block
resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Bucket policy
resource "aws_s3_bucket_policy" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.tfstate.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "aws:kms"
          }
        }
      },
      {
        Sid    = "DenyInsecureTransport"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:*"
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*"
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
      {
        Sid    = "EnforceMFA"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:DeleteObjectVersion"
        Resource = "${aws_s3_bucket.tfstate.arn}/*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}

# Lifecycle policy
resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    id     = "archive-old-versions"
    status = "Enabled"

    noncurrent_version_transition {
      noncurrent_days = 30
      storage_class   = "STANDARD_IA"
    }

    noncurrent_version_transition {
      noncurrent_days = 90
      storage_class   = "GLACIER"
    }
  }
}

# DynamoDB for state locking
resource "aws_dynamodb_table" "tfstate_lock" {
  name           = "terraform-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.tfstate.arn
  }

  tags = {
    Name = "Terraform State Lock Table"
  }
}
```

---

## Access Control

### Azure RBAC for State Access

```hcl
# Create custom role for Terraform
resource "azurerm_role_definition" "terraform_state_reader" {
  name  = "Terraform State Reader"
  scope = azurerm_storage_account.tfstate.id

  permissions {
    actions = [
      "Microsoft.Storage/storageAccounts/blobServices/containers/read",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
    ]
    not_actions = []
  }

  assignable_scopes = [
    azurerm_storage_account.tfstate.id
  ]
}

resource "azurerm_role_definition" "terraform_state_writer" {
  name  = "Terraform State Writer"
  scope = azurerm_storage_account.tfstate.id

  permissions {
    actions = [
      "Microsoft.Storage/storageAccounts/blobServices/containers/read",
      "Microsoft.Storage/storageAccounts/blobServices/containers/write",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/read",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/write",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/add/action",
      "Microsoft.Storage/storageAccounts/blobServices/containers/blobs/delete",
    ]
    not_actions = []
  }

  assignable_scopes = [
    azurerm_storage_account.tfstate.id
  ]
}

# Assign roles
resource "azurerm_role_assignment" "ci_cd_writer" {
  scope                = azurerm_storage_account.tfstate.id
  role_definition_id   = azurerm_role_definition.terraform_state_writer.role_definition_resource_id
  principal_id         = var.cicd_service_principal_id
}
```

---

## State Backup and Recovery

### Automated State Backup

```bash
#!/bin/bash
# scripts/backup-state.sh

BACKUP_DIR="./state-backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

# Pull current state
terraform state pull > "$BACKUP_DIR/terraform-${TIMESTAMP}.tfstate"

# Compress and encrypt
tar -czf - "$BACKUP_DIR/terraform-${TIMESTAMP}.tfstate" | \
  openssl enc -aes-256-cbc -salt -pbkdf2 \
  -out "$BACKUP_DIR/terraform-${TIMESTAMP}.tfstate.tar.gz.enc"

# Remove unencrypted backup
rm "$BACKUP_DIR/terraform-${TIMESTAMP}.tfstate"

# Keep only last 30 backups
ls -t "$BACKUP_DIR" | tail -n +31 | xargs -I {} rm "$BACKUP_DIR/{}"
```

### GitHub Actions Backup Workflow

```yaml
name: State Backup

on:
  schedule:
    - cron: '0 0 * * *'  # Daily
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Init Terraform
        run: terraform init

      - name: Backup State
        run: |
          TIMESTAMP=$(date +%Y%m%d-%H%M%S)
          terraform state pull > state-backup-${TIMESTAMP}.json

      - name: Upload to Backup Storage
        run: |
          az storage blob upload \
            --account-name tfstatebackup \
            --container-name backups \
            --name "state-backup-${TIMESTAMP}.json" \
            --file "state-backup-${TIMESTAMP}.json" \
            --encryption-scope backup-encryption

      - name: Cleanup old backups
        run: |
          az storage blob delete-batch \
            --account-name tfstatebackup \
            --source backups \
            --if-unmodified-since $(date -d '90 days ago' +%Y-%m-%d)
```

---

## State in CI/CD

### GitHub Actions with State Security

```yaml
name: Terraform Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      id-token: write  # For OIDC
      contents: read

    steps:
      - uses: actions/checkout@v4

      - name: Azure Login (OIDC)
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        run: terraform plan -out=tfplan

      - name: Save Plan (encrypted)
        run: |
          terraform show tfplan > plan.txt
          # Encrypt before storing
          gpg --symmetric --cipher-algo AES256 plan.txt

      - name: Apply
        run: terraform apply tfplan

      - name: Cleanup
        if: always()
        run: |
          rm -f tfplan plan.txt plan.txt.gpg
          # State is already in remote backend
```

---

## State Encryption at Rest

### Terraform Cloud

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production"
    }
  }
}

# Terraform Cloud automatically:
# - Encrypts state at rest
# - Encrypts state in transit
# - Provides access controls
# - Maintains version history
# - Supports state locking
```

---

## Best Practices

✅ **DO:**
- Use remote state backends
- Enable encryption at rest
- Use customer-managed keys
- Enable versioning
- Implement access controls
- Regular state backups
- Monitor state access
- Use state locking

❌ **DON'T:**
- Store state in Git
- Use local state for production
- Share state files directly
- Disable encryption
- Grant broad access
- Skip backups

---

## State Recovery

### Recovering from Backup

```bash
# List available backups
az storage blob list \
  --account-name tfstatebackup \
  --container-name backups \
  --output table

# Download backup
az storage blob download \
  --account-name tfstatebackup \
  --container-name backups \
  --name state-backup-20240115-120000.json \
  --file recovered-state.json

# Push to backend
terraform state push recovered-state.json
```

---

## Resources

- [Terraform State Documentation](https://developer.hashicorp.com/terraform/language/state)
- [Azure Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/azurerm)
- [AWS Backend Configuration](https://developer.hashicorp.com/terraform/language/settings/backends/s3)

---

Continue to [06-least-privilege.md](./06-least-privilege.md)
