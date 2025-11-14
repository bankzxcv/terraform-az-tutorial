# Terraform Security Best Practices

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand security risks in infrastructure as code
- Implement secure Terraform coding practices
- Protect sensitive data and credentials
- Secure Terraform state files
- Implement least privilege access controls
- Use security scanning tools effectively

## Prerequisites

- Understanding of Terraform fundamentals
- Basic knowledge of security concepts
- Familiarity with cloud provider IAM
- Understanding of encryption concepts

**Estimated Time:** 60-75 minutes

---

## Security Risks in Infrastructure as Code

### Common Threat Vectors

```
┌─────────────────────────────────────────────┐
│        IaC Security Threat Landscape        │
├─────────────────────────────────────────────┤
│                                             │
│  1. Hardcoded Secrets                       │
│     → API keys, passwords in code           │
│     → Exposed in version control            │
│                                             │
│  2. Insecure State Files                    │
│     → Sensitive data in plain text          │
│     → Unauthorized access to state          │
│                                             │
│  3. Overly Permissive Access                │
│     → Excessive IAM permissions             │
│     → Wide-open network rules               │
│                                             │
│  4. Unencrypted Resources                   │
│     → Data at rest not encrypted            │
│     → Unencrypted network traffic           │
│                                             │
│  5. Misconfigured Resources                 │
│     → Public buckets/storage                │
│     → Weak security settings                │
│                                             │
│  6. Supply Chain Attacks                    │
│     → Malicious modules                     │
│     → Compromised providers                 │
│                                             │
└─────────────────────────────────────────────┘
```

---

## Secure Credential Management

### Never Hardcode Credentials

❌ **NEVER DO THIS:**

```hcl
# DON'T hardcode credentials
provider "azurerm" {
  features {}
  subscription_id = "12345678-1234-1234-1234-123456789012"
  client_id       = "abcd1234-abcd-abcd-abcd-abcd12345678"
  client_secret   = "SuperSecretPassword123!"  # NEVER!
  tenant_id       = "87654321-4321-4321-4321-210987654321"
}

resource "azurerm_storage_account" "bad" {
  # ...
  primary_access_key = "hardcoded-key"  # NEVER!
}
```

✅ **DO THIS INSTEAD:**

```hcl
# Use environment variables
provider "azurerm" {
  features {}
  # Credentials loaded from environment variables:
  # ARM_SUBSCRIPTION_ID
  # ARM_CLIENT_ID
  # ARM_CLIENT_SECRET
  # ARM_TENANT_ID
}

# Or use managed identities (best option)
provider "azurerm" {
  features {}
  use_msi = true
}

# Or use OIDC (recommended for CI/CD)
provider "azurerm" {
  features {}
  use_oidc = true
}
```

### Environment Variables

```bash
# Set credentials via environment variables
export ARM_SUBSCRIPTION_ID="<subscription-id>"
export ARM_CLIENT_ID="<client-id>"
export ARM_CLIENT_SECRET="<client-secret>"
export ARM_TENANT_ID="<tenant-id>"

# Or use .env file (add to .gitignore!)
cat > .env << 'EOF'
ARM_SUBSCRIPTION_ID=12345678-1234-1234-1234-123456789012
ARM_CLIENT_ID=abcd1234-abcd-abcd-abcd-abcd12345678
ARM_CLIENT_SECRET=secret-value
ARM_TENANT_ID=87654321-4321-4321-4321-210987654321
EOF

# Load environment variables
set -a
source .env
set +a
```

### Using Azure Key Vault

```hcl
# Read secrets from Key Vault
data "azurerm_key_vault" "main" {
  name                = "my-keyvault"
  resource_group_name = "my-rg"
}

data "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  key_vault_id = data.azurerm_key_vault.main.id
}

resource "azurerm_postgresql_server" "main" {
  name                = "my-postgresql"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name

  administrator_login          = "psqladmin"
  administrator_login_password = data.azurerm_key_vault_secret.db_password.value

  # ... other configuration
}
```

### Using AWS Secrets Manager

```hcl
data "aws_secretsmanager_secret" "db_password" {
  name = "production/database/password"
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}

resource "aws_db_instance" "main" {
  identifier = "mydb"

  username = "admin"
  password = data.aws_secretsmanager_secret_version.db_password.secret_string

  # ... other configuration
}
```

---

## Sensitive Data Handling

### Marking Variables as Sensitive

```hcl
# variables.tf
variable "database_password" {
  type        = string
  description = "Database administrator password"
  sensitive   = true  # Marks value as sensitive
}

variable "api_key" {
  type        = string
  description = "API key for external service"
  sensitive   = true
}

# outputs.tf
output "connection_string" {
  value       = "Server=${azurerm_postgresql_server.main.fqdn};..."
  sensitive   = true  # Hides output in logs
  description = "Database connection string"
}

output "admin_password" {
  value       = random_password.admin.result
  sensitive   = true
}
```

### Sensitive Data in State

```hcl
# Generate passwords programmatically
resource "random_password" "database" {
  length  = 32
  special = true
  lifecycle {
    ignore_changes = [
      # Don't regenerate password on every apply
      length,
      special,
    ]
  }
}

# Store in Key Vault immediately
resource "azurerm_key_vault_secret" "database_password" {
  name         = "database-password"
  value        = random_password.database.result
  key_vault_id = azurerm_key_vault.main.id

  lifecycle {
    # Prevent accidental deletion
    prevent_destroy = true
  }
}

# Use the Key Vault reference, not the password directly
resource "azurerm_mysql_server" "main" {
  administrator_login_password = random_password.database.result

  # Ensure password is created first
  depends_on = [azurerm_key_vault_secret.database_password]
}
```

---

## Secure State Management

### Remote State with Encryption

```hcl
# backend.tf - Azure Storage with encryption
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstatestorage"
    container_name       = "tfstate"
    key                  = "production.terraform.tfstate"

    # State file encryption at rest
    # Azure Storage encryption is enabled by default
  }
}

# Access control for state storage account
resource "azurerm_storage_account" "tfstate" {
  name                     = "tfstatestorage"
  resource_group_name      = azurerm_resource_group.tfstate.name
  location                 = azurerm_resource_group.tfstate.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Security settings
  enable_https_traffic_only       = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  # Network rules
  network_rules {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                   = ["1.2.3.4"]  # Your IP
    virtual_network_subnet_ids = [azurerm_subnet.mgmt.id]
  }

  # Blob properties
  blob_properties {
    versioning_enabled = true

    delete_retention_policy {
      days = 30
    }

    container_delete_retention_policy {
      days = 30
    }
  }
}

# State locking with lease
resource "azurerm_storage_container" "tfstate" {
  name                  = "tfstate"
  storage_account_name  = azurerm_storage_account.tfstate.name
  container_access_type = "private"
}
```

### AWS S3 Backend Security

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:123456789012:key/abcd1234"
    dynamodb_table = "terraform-state-lock"

    # Enable versioning
    versioning = true
  }
}

# S3 bucket for state with security controls
resource "aws_s3_bucket" "tfstate" {
  bucket = "my-terraform-state"
}

resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.tfstate.arn
    }
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

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
      }
    ]
  })
}
```

---

## Secure Resource Configuration

### Network Security

```hcl
# Secure network configuration
resource "azurerm_network_security_group" "app" {
  name                = "app-nsg"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
}

# Deny all inbound by default, allow specific
resource "azurerm_network_security_rule" "deny_all_inbound" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.app.name
}

# Allow HTTPS only from specific sources
resource "azurerm_network_security_rule" "allow_https" {
  name                        = "AllowHTTPS"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefixes     = var.allowed_source_ips
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.app.name
}

# No direct internet access for database subnet
resource "azurerm_subnet" "database" {
  name                 = "database-subnet"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.3.0/24"]

  # Enforce private endpoints
  private_endpoint_network_policies_enabled = true

  # Service endpoints for Azure services
  service_endpoints = ["Microsoft.Sql"]
}
```

### Encryption Configuration

```hcl
# Storage account with encryption
resource "azurerm_storage_account" "secure" {
  name                     = "securestorage"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Enforce HTTPS
  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  # Encryption
  infrastructure_encryption_enabled = true

  # Customer-managed keys
  identity {
    type = "SystemAssigned"
  }
}

# Enable encryption at rest with customer-managed keys
resource "azurerm_storage_account_customer_managed_key" "main" {
  storage_account_id = azurerm_storage_account.secure.id
  key_vault_id       = azurerm_key_vault.main.id
  key_name           = azurerm_key_vault_key.storage.name
}

# Virtual machine with encryption
resource "azurerm_linux_virtual_machine" "secure" {
  name                = "secure-vm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_D2s_v3"

  # Encrypted OS disk
  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"

    # Encryption at host
    encryption_at_host_enabled = true
  }

  # Disable password authentication
  disable_password_authentication = true

  admin_ssh_key {
    username   = "adminuser"
    public_key = file("~/.ssh/id_rsa.pub")
  }

  # ... other configuration
}

# Disk encryption set
resource "azurerm_disk_encryption_set" "main" {
  name                = "disk-encryption-set"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  key_vault_key_id    = azurerm_key_vault_key.disk.id

  identity {
    type = "SystemAssigned"
  }
}
```

### Database Security

```hcl
# Secure Azure SQL Database
resource "azurerm_mssql_server" "main" {
  name                         = "secure-sqlserver"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = azurerm_resource_group.main.location
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = random_password.sql_admin.result

  # Azure AD authentication only
  azuread_administrator {
    login_username = "sqladmin"
    object_id      = data.azuread_user.sql_admin.object_id
  }

  # Minimum TLS version
  minimum_tls_version = "1.2"

  # Disable public network access
  public_network_access_enabled = false

  identity {
    type = "SystemAssigned"
  }
}

# Transparent Data Encryption
resource "azurerm_mssql_server_transparent_data_encryption" "main" {
  server_id        = azurerm_mssql_server.main.id
  key_vault_key_id = azurerm_key_vault_key.sql_tde.id
}

# Advanced Threat Protection
resource "azurerm_mssql_server_security_alert_policy" "main" {
  resource_group_name = azurerm_resource_group.main.name
  server_name         = azurerm_mssql_server.main.name
  state               = "Enabled"

  disabled_alerts = []
  email_account_admins = true
  email_addresses = ["security@example.com"]
}

# Vulnerability Assessment
resource "azurerm_mssql_server_vulnerability_assessment" "main" {
  server_security_alert_policy_id = azurerm_mssql_server_security_alert_policy.main.id
  storage_container_path          = "${azurerm_storage_account.security.primary_blob_endpoint}${azurerm_storage_container.vuln_scan.name}/"
  storage_account_access_key      = azurerm_storage_account.security.primary_access_key

  recurring_scans {
    enabled                   = true
    email_subscription_admins = true
    emails = ["security@example.com"]
  }
}
```

---

## Access Control and IAM

### Least Privilege Principle

```hcl
# Custom role with minimal permissions
resource "azurerm_role_definition" "terraform_deployer" {
  name        = "Terraform Deployer"
  scope       = data.azurerm_subscription.current.id
  description = "Minimal permissions for Terraform deployment"

  permissions {
    actions = [
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Resources/subscriptions/resourceGroups/write",
      "Microsoft.Resources/deployments/*",
      "Microsoft.Storage/storageAccounts/read",
      "Microsoft.Storage/storageAccounts/write",
      "Microsoft.Network/virtualNetworks/read",
      "Microsoft.Network/virtualNetworks/write",
      # Add only required permissions
    ]

    not_actions = [
      "Microsoft.Authorization/*/Delete",
      "Microsoft.Authorization/*/Write",
      # Deny dangerous operations
    ]

    data_actions = []
    not_data_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id,
  ]
}

# Assign role to service principal
resource "azurerm_role_assignment" "terraform_sp" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = azurerm_role_definition.terraform_deployer.name
  principal_id         = data.azurerm_client_config.current.object_id
}
```

### AWS IAM Policy

```hcl
# Least privilege IAM policy for Terraform
resource "aws_iam_policy" "terraform" {
  name        = "TerraformDeploymentPolicy"
  description = "Minimal permissions for Terraform"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSpecificResources"
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ec2:CreateVpc",
          "ec2:CreateSubnet",
          "ec2:CreateSecurityGroup",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = ["us-east-1", "us-west-2"]
          }
        }
      },
      {
        Sid    = "DenyDangerousActions"
        Effect = "Deny"
        Action = [
          "iam:DeleteUser",
          "iam:DeleteRole",
          "s3:DeleteBucket",
        ]
        Resource = "*"
      }
    ]
  })
}
```

---

## Supply Chain Security

### Verify Module Sources

```hcl
# Use verified registry modules
module "network" {
  source  = "Azure/network/azurerm"
  version = "~> 5.0"  # Pin to major version

  # Verify checksum
  # terraform init -upgrade will verify the module signature
}

# Pin provider versions
terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"  # Pin to prevent unexpected updates
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Lock file ensures consistent provider versions
# Commit .terraform.lock.hcl to version control
```

### Module Security Review

```hcl
# When using external modules, review the source
module "questionable" {
  source = "github.com/unknown/terraform-module"  # ❌ Don't trust blindly

  # Review module source code before using:
  # 1. Check for hardcoded credentials
  # 2. Review IAM permissions granted
  # 3. Check for data exfiltration
  # 4. Verify secure defaults
}

# Better: Use verified modules or create your own
module "trusted" {
  source = "./modules/custom-module"  # ✅ Controlled source
  # or
  source = "app.terraform.io/org/module/provider"  # ✅ Private registry
}
```

---

## Security Scanning Integration

### Pre-commit Hooks

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: check-added-large-files
      - id: check-merge-conflict
      - id: detect-private-key
      - id: end-of-file-fixer
      - id: trailing-whitespace

  - repo: https://github.com/antonbabenko/pre-commit-terraform
    rev: v1.85.0
    hooks:
      - id: terraform_fmt
      - id: terraform_validate
      - id: terraform_tflint
      - id: terraform_tfsec

  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.18.0
    hooks:
      - id: gitleaks
```

---

## Best Practices Summary

### Security Checklist

✅ **Credentials and Secrets**
- [ ] No hardcoded credentials in code
- [ ] Use environment variables or secret managers
- [ ] Mark sensitive variables as sensitive
- [ ] Rotate credentials regularly
- [ ] Use managed identities when possible

✅ **State File Security**
- [ ] Remote state backend with encryption
- [ ] Access controls on state storage
- [ ] Enable versioning for state files
- [ ] Regular state backups
- [ ] Network restrictions on state access

✅ **Resource Security**
- [ ] Encryption at rest enabled
- [ ] Encryption in transit (TLS 1.2+)
- [ ] Network security groups configured
- [ ] Private endpoints for databases
- [ ] Disable public access where possible

✅ **Access Control**
- [ ] Least privilege IAM policies
- [ ] Service principals for automation
- [ ] Regular access reviews
- [ ] Multi-factor authentication
- [ ] Audit logging enabled

✅ **Code Security**
- [ ] Pin provider versions
- [ ] Review external modules
- [ ] Security scanning in CI/CD
- [ ] Peer code reviews
- [ ] .gitignore for sensitive files

---

## Hands-on Exercise

### Secure an Insecure Configuration

Fix the security issues in this configuration:

```hcl
# INSECURE - Fix all issues
provider "azurerm" {
  subscription_id = "12345678-1234-1234-1234-123456789012"
  client_secret   = "my-secret"
  features {}
}

resource "azurerm_storage_account" "bad" {
  name                      = "storage"
  resource_group_name       = azurerm_resource_group.main.name
  location                  = "eastus"
  account_tier              = "Standard"
  account_replication_type  = "LRS"
  enable_https_traffic_only = false
  min_tls_version           = "TLS1_0"
}

resource "azurerm_postgresql_server" "bad" {
  name                = "psqlserver"
  location            = "eastus"
  resource_group_name = azurerm_resource_group.main.name

  administrator_login          = "psqladmin"
  administrator_login_password = "P@ssw0rd123!"

  ssl_enforcement_enabled = false
  public_network_access_enabled = true
}
```

---

## Additional Resources

- [Azure Security Best Practices](https://learn.microsoft.com/azure/security/fundamentals/best-practices-and-patterns)
- [AWS Security Best Practices](https://docs.aws.amazon.com/security/)
- [Terraform Security](https://developer.hashicorp.com/terraform/tutorials/configuration-language/sensitive-variables)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks)

---

## Next Steps

Continue to [02-secrets-management.md](./02-secrets-management.md) to learn about:
- Advanced secrets management strategies
- Integration with secret management services
- Secrets rotation and lifecycle
- Multi-cloud secrets management
