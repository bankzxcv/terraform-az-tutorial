terraform {
  required_version = ">= 1.6.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.80"
    }
  }

  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstatedev"
    container_name       = "tfstate"
    key                  = "dev.tfstate"
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "${var.environment}-rg"
  location = var.location

  tags = merge(
    var.common_tags,
    {
      Environment = var.environment
    }
  )
}

resource "azurerm_storage_account" "main" {
  name                     = "${var.environment}storage${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_replication_type

  enable_https_traffic_only = true
  min_tls_version           = "TLS1_2"

  tags = merge(
    var.common_tags,
    {
      Environment = var.environment
    }
  )
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}
