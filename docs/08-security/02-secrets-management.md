# Secrets Management in Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement comprehensive secrets management strategies
- Integrate with cloud-native secret management services
- Automate secrets rotation and lifecycle management
- Manage secrets across multiple cloud providers
- Implement zero-trust secrets architecture

## Prerequisites

- Completed "Terraform Security Best Practices" lesson
- Understanding of encryption concepts
- Familiarity with cloud provider secret services
- Basic understanding of RBAC

**Estimated Time:** 60-75 minutes

---

## Secrets Management Architecture

```
┌────────────────────────────────────────────┐
│      Secrets Management Layers             │
├────────────────────────────────────────────┤
│                                            │
│  Application Layer                         │
│    ↓                                       │
│  Terraform Configuration                   │
│    ↓                                       │
│  Secret Management Service                 │
│    (Key Vault/Secrets Manager/Secret Mgr)│
│    ↓                                       │
│  Encryption Keys (KMS/HSM)                │
│    ↓                                       │
│  Hardware Security Module                  │
│                                            │
└────────────────────────────────────────────┘
```

---

## Azure Key Vault Integration

### Creating and Configuring Key Vault

```hcl
# main.tf
data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                        = "kv-${var.environment}-${random_string.suffix.result}"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true

  sku_name = "premium"  # HSM-backed

  # Network ACLs
  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    ip_rules                   = var.allowed_ips
    virtual_network_subnet_ids = [azurerm_subnet.mgmt.id]
  }

  # Access policies
  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = data.azurerm_client_config.current.object_id

    key_permissions = [
      "Get", "List", "Create", "Delete", "Update",
      "Encrypt", "Decrypt", "UnwrapKey", "WrapKey",
    ]

    secret_permissions = [
      "Get", "List", "Set", "Delete", "Recover", "Backup", "Restore",
    ]

    certificate_permissions = [
      "Get", "List", "Create", "Delete", "Update",
    ]
  }

  tags = var.tags
}

# Customer-managed encryption key
resource "azurerm_key_vault_key" "encryption" {
  name         = "encryption-key"
  key_vault_id = azurerm_key_vault.main.id
  key_type     = "RSA-HSM"
  key_size     = 4096

  key_opts = [
    "decrypt",
    "encrypt",
    "sign",
    "unwrapKey",
    "verify",
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
```

### Reading Secrets from Key Vault

```hcl
# Data source to read secrets
data "azurerm_key_vault_secret" "database_password" {
  name         = "database-admin-password"
  key_vault_id = azurerm_key_vault.main.id
}

data "azurerm_key_vault_secret" "api_key" {
  name         = "external-api-key"
  key_vault_id = azurerm_key_vault.main.id
}

# Use secrets in resources
resource "azurerm_postgresql_server" "main" {
  name                = "psql-${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  administrator_login          = "psqladmin"
  administrator_login_password = data.azurerm_key_vault_secret.database_password.value

  sku_name   = "GP_Gen5_2"
  version    = "11"
  storage_mb = 5120

  ssl_enforcement_enabled          = true
  ssl_minimal_tls_version_enforced = "TLS1_2"
}
```

### Storing Generated Secrets

```hcl
# Generate secure password
resource "random_password" "database" {
  length           = 32
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
  min_lower        = 2
  min_upper        = 2
  min_numeric      = 2
  min_special      = 2
}

# Store in Key Vault
resource "azurerm_key_vault_secret" "database_password" {
  name         = "database-admin-password"
  value        = random_password.database.result
  key_vault_id = azurerm_key_vault.main.id

  content_type = "password"

  expiration_date = timeadd(timestamp(), "2160h")  # 90 days

  lifecycle {
    ignore_changes = [
      expiration_date,
    ]
  }

  tags = {
    Environment = var.environment
    Purpose     = "Database Admin"
    Rotation    = "Automated"
  }
}
```

---

## AWS Secrets Manager

### Creating and Managing Secrets

```hcl
# Create KMS key for encryption
resource "aws_kms_key" "secrets" {
  description             = "KMS key for Secrets Manager"
  deletion_window_in_days = 10
  enable_key_rotation     = true

  tags = {
    Name = "secrets-encryption-key"
  }
}

resource "aws_kms_alias" "secrets" {
  name          = "alias/secrets-manager"
  target_key_id = aws_kms_key.secrets.key_id
}

# Create secret
resource "aws_secretsmanager_secret" "database" {
  name                    = "${var.environment}/database/credentials"
  description             = "Database credentials"
  kms_key_id              = aws_kms_key.secrets.id
  recovery_window_in_days = 30

  tags = {
    Environment = var.environment
    Application = "webapp"
  }
}

# Store secret value
resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    username = "admin"
    password = random_password.database.result
    engine   = "postgres"
    host     = aws_db_instance.main.address
    port     = aws_db_instance.main.port
    dbname   = "appdb"
  })
}

# Read secret
data "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
}

locals {
  db_creds = jsondecode(data.aws_secretsmanager_secret_version.database.secret_string)
}

# Use in application
resource "aws_ecs_task_definition" "app" {
  family = "app"

  container_definitions = jsonencode([{
    name  = "app"
    image = "myapp:latest"

    secrets = [{
      name      = "DB_PASSWORD"
      valueFrom = aws_secretsmanager_secret.database.arn
    }]
  }])
}
```

### Automatic Rotation

```hcl
# Lambda function for rotation
resource "aws_secretsmanager_secret_rotation" "database" {
  secret_id           = aws_secretsmanager_secret.database.id
  rotation_lambda_arn = aws_lambda_function.rotate_secret.arn

  rotation_rules {
    automatically_after_days = 30
  }
}

# Rotation Lambda function
resource "aws_lambda_function" "rotate_secret" {
  filename      = "rotate_secret.zip"
  function_name = "rotate-database-secret"
  role          = aws_iam_role.lambda_rotation.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  environment {
    variables = {
      SECRETS_MANAGER_ENDPOINT = "https://secretsmanager.${var.region}.amazonaws.com"
    }
  }
}

# IAM role for rotation Lambda
resource "aws_iam_role" "lambda_rotation" {
  name = "lambda-secret-rotation"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
    }]
  })
}

resource "aws_iam_role_policy" "lambda_rotation" {
  role = aws_iam_role.lambda_rotation.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:UpdateSecretVersionStage",
        ]
        Resource = aws_secretsmanager_secret.database.arn
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.secrets.arn
      }
    ]
  })
}
```

---

## GCP Secret Manager

### Creating Secrets

```hcl
# Enable Secret Manager API
resource "google_project_service" "secretmanager" {
  project = var.project_id
  service = "secretmanager.googleapis.com"

  disable_on_destroy = false
}

# Create secret
resource "google_secret_manager_secret" "database_password" {
  secret_id = "database-password"
  project   = var.project_id

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  replication {
    automatic = true
  }

  # Or regional replication
  # replication {
  #   user_managed {
  #     replicas {
  #       location = "us-central1"
  #     }
  #     replicas {
  #       location = "us-east1"
  #     }
  #   }
  # }

  depends_on = [google_project_service.secretmanager]
}

# Store secret value
resource "google_secret_manager_secret_version" "database_password" {
  secret      = google_secret_manager_secret.database_password.id
  secret_data = random_password.database.result
}

# Access secret
data "google_secret_manager_secret_version" "database_password" {
  secret = google_secret_manager_secret.database_password.id
}

# Use in Cloud SQL
resource "google_sql_user" "main" {
  name     = "appuser"
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.database_password.secret_data
}
```

---

## HashiCorp Vault Integration

### Vault Provider Setup

```hcl
# Configure Vault provider
terraform {
  required_providers {
    vault = {
      source  = "hashicorp/vault"
      version = "~> 3.20"
    }
  }
}

provider "vault" {
  address = "https://vault.example.com:8200"

  # Auth via token (for CI/CD)
  # token = var.vault_token

  # Or auth via AppRole
  auth_login {
    path = "auth/approle/login"

    parameters = {
      role_id   = var.vault_role_id
      secret_id = var.vault_secret_id
    }
  }
}

# Read secret from Vault
data "vault_generic_secret" "database" {
  path = "secret/data/database"
}

# Use secret
resource "azurerm_postgresql_server" "main" {
  administrator_login_password = data.vault_generic_secret.database.data["password"]
  # ...
}
```

### Dynamic Secrets

```hcl
# Enable database secrets engine
resource "vault_mount" "database" {
  path = "database"
  type = "database"
}

# Configure PostgreSQL connection
resource "vault_database_secret_backend_connection" "postgres" {
  backend       = vault_mount.database.path
  name          = "postgres"
  allowed_roles = ["app-role"]

  postgresql {
    connection_url = "postgresql://{{username}}:{{password}}@${aws_db_instance.main.endpoint}/appdb"
    username       = "vault"
    password       = random_password.vault_user.result
  }
}

# Create role for dynamic credentials
resource "vault_database_secret_backend_role" "app" {
  backend             = vault_mount.database.path
  name                = "app-role"
  db_name             = vault_database_secret_backend_connection.postgres.name
  creation_statements = [
    "CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}';",
    "GRANT SELECT ON ALL TABLES IN SCHEMA public TO \"{{name}}\";"
  ]
  default_ttl         = 3600
  max_ttl             = 7200
}

# Generate dynamic credentials
data "vault_database_secret_backend_connection" "app_creds" {
  backend = vault_mount.database.path
  name    = vault_database_secret_backend_role.app.name
}
```

---

## Secrets Rotation

### Automated Rotation Strategy

```hcl
# modules/secret-rotation/main.tf

# Generate new password
resource "random_password" "new_password" {
  keepers = {
    rotation_date = var.rotation_trigger
  }

  length  = 32
  special = true
}

# Update Key Vault secret
resource "azurerm_key_vault_secret" "rotated" {
  name         = var.secret_name
  value        = random_password.new_password.result
  key_vault_id = var.key_vault_id

  tags = {
    RotationDate = timestamp()
    RotatedBy    = "terraform"
  }
}

# Trigger rotation via null_resource
resource "null_resource" "rotation_trigger" {
  triggers = {
    # Rotate every 90 days
    rotation_date = formatdate("YYYY-MM-DD", timeadd(timestamp(), "${var.rotation_days * 24}h"))
  }

  provisioner "local-exec" {
    command = "echo 'Triggering secret rotation'"
  }
}
```

### Rotation Workflow

```yaml
# .github/workflows/secret-rotation.yml
name: Secret Rotation

on:
  schedule:
    # Run monthly
    - cron: '0 0 1 * *'
  workflow_dispatch:
    inputs:
      secret_name:
        description: 'Secret to rotate'
        required: true

jobs:
  rotate-secrets:
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

      - name: Rotate Secret
        run: |
          terraform init
          terraform apply \
            -target=module.secret_rotation \
            -var="rotation_trigger=$(date +%s)" \
            -auto-approve

      - name: Verify Rotation
        run: |
          # Verify new secret works
          ./scripts/verify-secret.sh

      - name: Notify Success
        run: |
          # Send notification
          echo "Secret rotation completed successfully"
```

---

## Multi-Cloud Secrets Management

### Unified Secrets Module

```hcl
# modules/secrets/main.tf
variable "cloud_provider" {
  type        = string
  description = "Cloud provider (azure, aws, gcp)"
  validation {
    condition     = contains(["azure", "aws", "gcp"], var.cloud_provider)
    error_message = "Must be azure, aws, or gcp"
  }
}

# Azure implementation
resource "azurerm_key_vault_secret" "this" {
  count = var.cloud_provider == "azure" ? 1 : 0

  name         = var.secret_name
  value        = var.secret_value
  key_vault_id = var.key_vault_id
}

# AWS implementation
resource "aws_secretsmanager_secret_version" "this" {
  count = var.cloud_provider == "aws" ? 1 : 0

  secret_id     = var.secret_id
  secret_string = var.secret_value
}

# GCP implementation
resource "google_secret_manager_secret_version" "this" {
  count = var.cloud_provider == "gcp" ? 1 : 0

  secret      = var.secret_id
  secret_data = var.secret_value
}

# Outputs
output "secret_arn" {
  value = var.cloud_provider == "azure" ? azurerm_key_vault_secret.this[0].id : (
    var.cloud_provider == "aws" ? aws_secretsmanager_secret_version.this[0].arn :
    google_secret_manager_secret_version.this[0].name
  )
}
```

---

## Best Practices

### 1. Secret Lifecycle

✅ **DO:**
- Rotate secrets regularly (30-90 days)
- Use automated rotation where possible
- Track secret age and usage
- Implement expiration policies
- Monitor secret access

❌ **DON'T:**
- Use long-lived static secrets
- Share secrets across environments
- Store secrets in plain text
- Skip rotation in production

### 2. Access Control

✅ **DO:**
- Implement least privilege access
- Use service-specific credentials
- Audit secret access regularly
- Implement approval workflows
- Use short-lived credentials

❌ **DON'T:**
- Use overly permissive policies
- Share credentials between services
- Skip access auditing
- Use permanent credentials

### 3. Encryption

✅ **DO:**
- Encrypt secrets at rest
- Use customer-managed keys
- Enable automatic key rotation
- Use HSM-backed keys for sensitive data
- Encrypt in transit (TLS)

❌ **DON'T:**
- Use default encryption only
- Skip encryption for "internal" secrets
- Ignore key rotation
- Use weak encryption algorithms

---

## Hands-on Exercise

Create a complete secrets management solution that:

1. Sets up Key Vault/Secrets Manager
2. Generates and stores database credentials
3. Implements automatic rotation
4. Provides secrets to applications
5. Includes monitoring and alerting
6. Implements cross-cloud compatibility

---

## Additional Resources

- [Azure Key Vault Best Practices](https://learn.microsoft.com/azure/key-vault/general/best-practices)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [GCP Secret Manager](https://cloud.google.com/secret-manager/docs)
- [HashiCorp Vault](https://www.vaultproject.io/)

---

## Next Steps

Continue to [03-security-scanning.md](./03-security-scanning.md) to learn about:
- tfsec security scanning
- Checkov policy enforcement
- Custom security policies
- CI/CD integration
