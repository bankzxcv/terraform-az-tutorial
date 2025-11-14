terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }
}

provider "azurerm" {
  features {}
}

# Secure resource group
resource "azurerm_resource_group" "main" {
  name     = "secure-rg"
  location = "East US"

  tags = {
    Environment = "Production"
    Owner       = "Security Team"
    CostCenter  = "IT-001"
  }
}

# Secure storage account
resource "azurerm_storage_account" "secure" {
  name                     = "securestorage${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "GRS"

  # Security best practices (passes tfsec/checkov)
  enable_https_traffic_only       = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  infrastructure_encryption_enabled = true

  # Network security
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
    ip_rules       = ["1.2.3.4"]  # Replace with your IP
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

  tags = {
    Environment = "Production"
    Owner       = "Security Team"
    CostCenter  = "IT-001"
  }
}

# Random suffix for unique names
resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

# Key Vault for secrets
resource "azurerm_key_vault" "main" {
  name                        = "kv-${random_string.suffix.result}"
  location                    = azurerm_resource_group.main.location
  resource_group_name         = azurerm_resource_group.main.name
  enabled_for_disk_encryption = true
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  soft_delete_retention_days  = 90
  purge_protection_enabled    = true

  sku_name = "premium"

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
  }

  tags = {
    Environment = "Production"
    Owner       = "Security Team"
    CostCenter  = "IT-001"
  }
}

data "azurerm_client_config" "current" {}
