import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { AlertCircle, CheckCircle2, FolderTree, Package } from 'lucide-react';
import Link from 'next/link';

export default function ModulesPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Terraform Modules</h1>
      <p className="text-lg text-gray-600 mb-8">
        Learn to create reusable, composable infrastructure modules. Master the art of writing 
        maintainable Terraform code that can be shared across projects and teams.
      </p>

      <Section title="What Are Modules?">
        <p className="mb-4">
          Modules are containers for multiple resources that are used together. They allow you to:
        </p>
        <div className="grid md:grid-cols-2 gap-4 my-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">✓ Reusability</h4>
            <p className="text-sm text-blue-800">Write once, use everywhere. Share common patterns across projects.</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">✓ Organization</h4>
            <p className="text-sm text-green-800">Break complex infrastructure into logical components.</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="font-semibold text-purple-900 mb-2">✓ Encapsulation</h4>
            <p className="text-sm text-purple-800">Hide complexity behind simple interfaces.</p>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <h4 className="font-semibold text-orange-900 mb-2">✓ Consistency</h4>
            <p className="text-sm text-orange-800">Ensure best practices across all deployments.</p>
          </div>
        </div>
      </Section>

      <Section title="Module Basics">
        <p className="mb-4">
          Every Terraform configuration is technically a module. The "root module" is your main configuration.
          Child modules are reusable components you can call from your root module.
        </p>
        <div className="bg-gray-100 p-6 rounded-lg my-6">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Package className="w-5 h-5" />
            Module Structure
          </h3>
          <div className="bg-white p-4 rounded border-2 border-gray-300 font-mono text-sm">
            <pre>{`
    Root Module (your main config)
    ├── main.tf
    ├── variables.tf
    ├── outputs.tf
    └── modules/
        ├── networking/
        │   ├── main.tf
        │   ├── variables.tf
        │   └── outputs.tf
        ├── compute/
        │   ├── main.tf
        │   ├── variables.tf
        │   └── outputs.tf
        └── storage/
            ├── main.tf
            ├── variables.tf
            └── outputs.tf
            `}</pre>
          </div>
        </div>
      </Section>

      <Section title="Creating Your First Module">
        <p className="mb-4">
          Let's create a reusable module for Azure Storage Accounts with best practices built-in.
        </p>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Project Structure</h3>
        <CommandBlock command="mkdir -p terraform-modules-demo/modules/storage-account && cd terraform-modules-demo" />
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="flex items-start gap-2 mb-2">
            <FolderTree className="w-4 h-4 mt-1" />
            <span className="text-blue-400">terraform-modules-demo/</span>
          </div>
          <div className="ml-6 space-y-1">
            <div>├── main.tf</div>
            <div>├── variables.tf</div>
            <div>├── outputs.tf</div>
            <div>└── modules/</div>
            <div>    └── storage-account/</div>
            <div>        ├── main.tf</div>
            <div>        ├── variables.tf</div>
            <div>        ├── outputs.tf</div>
            <div>        └── README.md</div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Create the Storage Account Module">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Module Variables</h3>
        <CodeBlock
          language="hcl"
          filename="modules/storage-account/variables.tf"
          code={`variable "name" {
  description = "Storage account name (must be globally unique)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.name))
    error_message = "Name must be 3-24 characters, lowercase letters and numbers only."
  }
}

variable "resource_group_name" {
  description = "Resource group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
  
  validation {
    condition     = contains(["Standard", "Premium"], var.account_tier)
    error_message = "Tier must be Standard or Premium."
  }
}

variable "replication_type" {
  description = "Replication type"
  type        = string
  default     = "LRS"
  
  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.replication_type)
    error_message = "Invalid replication type."
  }
}

variable "enable_https_only" {
  description = "Force HTTPS traffic only"
  type        = bool
  default     = true
}

variable "min_tls_version" {
  description = "Minimum TLS version"
  type        = string
  default     = "TLS1_2"
}

variable "enable_blob_versioning" {
  description = "Enable blob versioning"
  type        = bool
  default     = false
}

variable "enable_static_website" {
  description = "Enable static website hosting"
  type        = bool
  default     = false
}

variable "containers" {
  description = "List of containers to create"
  type = list(object({
    name        = string
    access_type = string
  }))
  default = []
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Module Resources</h3>
        <CodeBlock
          language="hcl"
          filename="modules/storage-account/main.tf"
          code={`# Storage Account
resource "azurerm_storage_account" "main" {
  name                     = var.name
  resource_group_name      = var.resource_group_name
  location                 = var.location
  account_tier             = var.account_tier
  account_replication_type = var.replication_type
  
  # Security settings
  https_traffic_only_enabled        = var.enable_https_only
  min_tls_version                   = var.min_tls_version
  allow_nested_items_to_be_public   = false
  shared_access_key_enabled         = true
  
  # Blob properties
  blob_properties {
    versioning_enabled = var.enable_blob_versioning
    
    delete_retention_policy {
      days = 7
    }
    
    container_delete_retention_policy {
      days = 7
    }
  }
  
  # Static website (optional)
  dynamic "static_website" {
    for_each = var.enable_static_website ? [1] : []
    content {
      index_document = "index.html"
      error_404_document = "404.html"
    }
  }
  
  tags = var.tags
}

# Blob Containers
resource "azurerm_storage_container" "containers" {
  for_each = { for c in var.containers : c.name => c }
  
  name                  = each.value.name
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = each.value.access_type
}

# Advanced Threat Protection
resource "azurerm_advanced_threat_protection" "main" {
  target_resource_id = azurerm_storage_account.main.id
  enabled            = true
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Module Outputs</h3>
        <CodeBlock
          language="hcl"
          filename="modules/storage-account/outputs.tf"
          code={`output "id" {
  description = "Storage account ID"
  value       = azurerm_storage_account.main.id
}

output "name" {
  description = "Storage account name"
  value       = azurerm_storage_account.main.name
}

output "primary_blob_endpoint" {
  description = "Primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "primary_connection_string" {
  description = "Primary connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}

output "primary_access_key" {
  description = "Primary access key"
  value       = azurerm_storage_account.main.primary_access_key
  sensitive   = true
}

output "static_website_url" {
  description = "Static website URL (if enabled)"
  value       = var.enable_static_website ? azurerm_storage_account.main.primary_web_endpoint : null
}

output "container_names" {
  description = "Created container names"
  value       = [for c in azurerm_storage_container.containers : c.name]
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Module Documentation</h3>
        <div className="bg-white p-4 rounded border-2 border-gray-300 font-mono text-sm">
          <pre>{`# Azure Storage Account Module

Terraform module for creating Azure Storage Accounts with security best practices.

## Features

- Secure by default (HTTPS only, TLS 1.2+)
- Blob versioning support
- Static website hosting
- Container creation
- Advanced Threat Protection
- Soft delete enabled

## Usage

\`\`\`hcl
module "storage" {
  source = "./modules/storage-account"

  name                = "mystorageacct"
  resource_group_name = "my-rg"
  location            = "East US"

  containers = [
    {
      name        = "data"
      access_type = "private"
    }
  ]

  tags = {
    Environment = "Production"
  }
}
\`\`\`

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Inputs

| Name                | Description          | Type   | Default    | Required |
|---------------------|----------------------|--------|------------|----------|
| name                | Storage account name | string | -          | yes      |
| resource_group_name | Resource group name  | string | -          | yes      |
| location            | Azure region         | string | -          | yes      |
| account_tier        | Account tier         | string | "Standard" | no       |
| replication_type    | Replication type     | string | "LRS"      | no       |

## Outputs

| Name                  | Description            |
|-----------------------|------------------------|
| id                    | Storage account ID     |
| name                  | Storage account name   |
| primary_blob_endpoint | Primary blob endpoint  |`}</pre>
        </div>
      </Section>

      <Section title="Step 2: Use the Module">
        <p className="mb-4">
          Now let's use our module in the root configuration.
        </p>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Root Configuration</h3>
        <CodeBlock
          language="hcl"
          filename="main.tf"
          code={`terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Random suffix for unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-modules-demo"
  location = "East US"
  
  tags = {
    Environment = "Development"
    ManagedBy   = "Terraform"
  }
}

# Use storage module for application data
module "app_storage" {
  source = "./modules/storage-account"
  
  name                = "appdata\${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  account_tier     = "Standard"
  replication_type = "LRS"
  
  containers = [
    {
      name        = "uploads"
      access_type = "private"
    },
    {
      name        = "processed"
      access_type = "private"
    }
  ]
  
  tags = azurerm_resource_group.main.tags
}

# Use storage module for static website
module "website_storage" {
  source = "./modules/storage-account"
  
  name                   = "website\${random_string.suffix.result}"
  resource_group_name    = azurerm_resource_group.main.name
  location               = azurerm_resource_group.main.location
  
  enable_static_website = true
  enable_blob_versioning = true
  
  tags = azurerm_resource_group.main.tags
}

# Use storage module for backups
module "backup_storage" {
  source = "./modules/storage-account"
  
  name                = "backup\${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = "West US"  # Different region for DR
  
  account_tier     = "Standard"
  replication_type = "GRS"  # Geo-redundant for backups
  
  containers = [
    {
      name        = "daily-backups"
      access_type = "private"
    },
    {
      name        = "weekly-backups"
      access_type = "private"
    }
  ]
  
  tags = merge(
    azurerm_resource_group.main.tags,
    {
      Purpose = "Backup"
    }
  )
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Root Outputs</h3>
        <CodeBlock
          language="hcl"
          filename="outputs.tf"
          code={`output "app_storage_name" {
  description = "Application storage account name"
  value       = module.app_storage.name
}

output "app_storage_endpoint" {
  description = "Application storage endpoint"
  value       = module.app_storage.primary_blob_endpoint
}

output "website_url" {
  description = "Static website URL"
  value       = module.website_storage.static_website_url
}

output "backup_storage_name" {
  description = "Backup storage account name"
  value       = module.backup_storage.name
}

output "all_container_names" {
  description = "All created containers"
  value = {
    app_storage     = module.app_storage.container_names
    backup_storage  = module.backup_storage.container_names
  }
}`}
        />
      </Section>

      <Section title="Step 3: Deploy">
        <CommandBlock command="terraform init" />
        <CommandBlock command="terraform plan" />
        <CommandBlock command="terraform apply" />
        <p className="mt-4 text-gray-700">
          You've now created 3 storage accounts using the same module, each configured differently!
        </p>
      </Section>

      <Section title="Using Public Modules">
        <p className="mb-4">
          The Terraform Registry has thousands of community modules you can use.
        </p>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Example: Azure Network Module</h3>
        <CodeBlock
          language="hcl"
          filename="public-module-example.tf"
          code={`# Use official Azure Network module from registry
module "network" {
  source  = "Azure/network/azurerm"
  version = "~> 5.0"
  
  resource_group_name = azurerm_resource_group.main.name
  vnet_name           = "my-vnet"
  address_space       = "10.0.0.0/16"
  
  subnet_prefixes = ["10.0.1.0/24", "10.0.2.0/24"]
  subnet_names    = ["subnet-web", "subnet-app"]
  
  tags = {
    Environment = "Production"
  }
}

# Use community AKS module
module "aks" {
  source  = "Azure/aks/azurerm"
  version = "~> 7.0"
  
  resource_group_name = azurerm_resource_group.main.name
  cluster_name        = "my-aks-cluster"
  
  kubernetes_version  = "1.27"
  orchestrator_version = "1.27"
  
  default_node_pool = {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"
  }
}`}
        />
        
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Finding Modules:</p>
              <p className="text-sm text-blue-800 mb-2">
                Browse the Terraform Registry at{' '}
                <a href="https://registry.terraform.io" className="underline" target="_blank" rel="noopener noreferrer">
                  registry.terraform.io
                </a>
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check module ratings and downloads</li>
                <li>• Read documentation and examples</li>
                <li>• Review source code on GitHub</li>
                <li>• Check last update date</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Advanced Module Patterns">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Module Composition</h3>
        <p className="mb-3">Build complex modules from simpler ones:</p>
        <CodeBlock
          language="hcl"
          filename="modules/web-app/main.tf"
          code={`# Web App module that uses other modules
module "network" {
  source = "../networking"
  
  resource_group_name = var.resource_group_name
  location            = var.location
  vnet_address_space  = var.vnet_address_space
}

module "storage" {
  source = "../storage-account"
  
  name                = var.storage_name
  resource_group_name = var.resource_group_name
  location            = var.location
  enable_static_website = true
}

module "app_service" {
  source = "../app-service"
  
  name                = var.app_name
  resource_group_name = var.resource_group_name
  location            = var.location
  subnet_id           = module.network.app_subnet_id
  
  app_settings = {
    STORAGE_CONNECTION = module.storage.primary_connection_string
  }
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Conditional Resources</h3>
        <CodeBlock
          language="hcl"
          filename="conditional-resources.tf"
          code={`# Create resources conditionally
resource "azurerm_public_ip" "main" {
  count = var.create_public_ip ? 1 : 0
  
  name                = "pip-\${var.name}"
  location            = var.location
  resource_group_name = var.resource_group_name
  allocation_method   = "Static"
}

# Use for_each for multiple instances
resource "azurerm_linux_virtual_machine" "vms" {
  for_each = var.vm_config
  
  name                = each.key
  location            = var.location
  resource_group_name = var.resource_group_name
  size                = each.value.size
  
  # ... other configuration
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">3. Data Sources in Modules</h3>
        <CodeBlock
          language="hcl"
          filename="data-sources.tf"
          code={`# Look up existing resources
data "azurerm_resource_group" "existing" {
  count = var.create_resource_group ? 0 : 1
  name  = var.resource_group_name
}

locals {
  resource_group_name = var.create_resource_group ? azurerm_resource_group.new[0].name : data.azurerm_resource_group.existing[0].name
}

resource "azurerm_resource_group" "new" {
  count    = var.create_resource_group ? 1 : 0
  name     = var.resource_group_name
  location = var.location
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">4. Module Versioning</h3>
        <CodeBlock
          language="hcl"
          filename="module-versions.tf"
          code={`# Pin to specific version for stability
module "storage" {
  source  = "git::https://github.com/your-org/terraform-modules.git//storage?ref=v1.2.0"
  # ...
}

# Use version constraints
module "network" {
  source  = "Azure/network/azurerm"
  version = "~> 5.0"  # 5.x versions only
  # ...
}

# Local development
module "dev_module" {
  source = "../../../terraform-modules/storage"
  # ...
}`}
        />
      </Section>

      <Section title="Module Best Practices">
        <div className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Do's
            </h4>
            <ul className="text-sm text-green-800 space-y-2 ml-6">
              <li>• Keep modules focused on a single purpose</li>
              <li>• Document inputs, outputs, and usage examples</li>
              <li>• Use validation rules for inputs</li>
              <li>• Set sensible defaults where appropriate</li>
              <li>• Version your modules properly</li>
              <li>• Write tests for your modules</li>
              <li>• Use semantic versioning (1.0.0, 1.1.0, etc.)</li>
              <li>• Include a README.md with examples</li>
            </ul>
          </div>

          <div className="p-4 bg-red-50 rounded-lg">
            <h4 className="font-semibold text-red-900 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Don'ts
            </h4>
            <ul className="text-sm text-red-800 space-y-2 ml-6">
              <li>• Don't hardcode values - use variables</li>
              <li>• Don't create provider blocks in reusable modules</li>
              <li>• Don't make modules too complex</li>
              <li>• Don't expose internal implementation details</li>
              <li>• Don't ignore backward compatibility</li>
              <li>• Don't skip documentation</li>
            </ul>
          </div>
        </div>
      </Section>

      <Section title="Testing Modules">
        <p className="mb-4">
          Test your modules before sharing them:
        </p>
        
        <h3 className="text-xl font-semibold text-gray-900 mb-3">1. Manual Testing</h3>
        <CodeBlock
          language="bash"
          filename="test-module.sh"
          code={`#!/bin/bash
# Create test directory
mkdir -p tests/basic
cd tests/basic

# Create minimal test configuration
cat > main.tf <<EOF
module "storage_test" {
  source = "../../modules/storage-account"
  
  name                = "teststorage\${random_string.suffix.result}"
  resource_group_name = "rg-module-test"
  location            = "East US"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
EOF

# Test the module
terraform init
terraform plan
terraform apply -auto-approve

# Verify outputs
terraform output

# Clean up
terraform destroy -auto-approve`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Automated Testing (Terratest)</h3>
        <CodeBlock
          language="go"
          filename="test/storage_test.go"
          code={`package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestStorageAccountModule(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/basic",
        Vars: map[string]interface{}{
            "name": "teststorage123",
            "location": "East US",
        },
    }
    
    defer terraform.Destroy(t, terraformOptions)
    
    terraform.InitAndApply(t, terraformOptions)
    
    output := terraform.Output(t, terraformOptions, "name")
    assert.Equal(t, "teststorage123", output)
}`}
        />
      </Section>

      <Section title="Publishing Modules">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">1. GitHub Repository Structure</h3>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <pre>{`
terraform-azurerm-storage/
├── README.md
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
├── examples/
│   ├── basic/
│   ├── static-website/
│   └── advanced/
└── tests/
    └── storage_test.go
          `}</pre>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">2. Publish to Terraform Registry</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">1</span>
            <p className="text-sm text-gray-700">
              Create a GitHub repo named <code>terraform-&lt;PROVIDER&gt;-&lt;NAME&gt;</code>
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">2</span>
            <p className="text-sm text-gray-700">
              Tag a release (e.g., v1.0.0)
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">3</span>
            <p className="text-sm text-gray-700">
              Sign in to <a href="https://registry.terraform.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">registry.terraform.io</a>
            </p>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">4</span>
            <p className="text-sm text-gray-700">
              Publish your module
            </p>
          </div>
        </div>
      </Section>

      <Section title="Complete Example: Multi-Tier Application Module">
        <p className="mb-4">
          Here's a complete example of a production-ready module:
        </p>
        <CodeBlock
          language="hcl"
          filename="modules/web-application/main.tf"
          code={`# Complete web application module
terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

locals {
  common_tags = merge(var.tags, {
    ManagedBy = "Terraform"
    Module    = "web-application"
  })
}

# Networking
module "network" {
  source = "./modules/networking"
  
  resource_group_name = var.resource_group_name
  location            = var.location
  vnet_address_space  = var.vnet_address_space
  subnet_prefixes     = var.subnet_prefixes
  
  tags = local.common_tags
}

# Storage
module "storage" {
  source = "./modules/storage-account"
  
  name                   = var.storage_name
  resource_group_name    = var.resource_group_name
  location               = var.location
  enable_static_website  = true
  enable_blob_versioning = true
  
  tags = local.common_tags
}

# Application Service
module "app_service" {
  source = "./modules/app-service"
  
  name                = var.app_name
  resource_group_name = var.resource_group_name
  location            = var.location
  
  app_settings = merge(var.app_settings, {
    STORAGE_CONNECTION_STRING = module.storage.primary_connection_string
    WEBSITE_NODE_DEFAULT_VERSION = "~18"
  })
  
  tags = local.common_tags
}

# Database
module "database" {
  count  = var.enable_database ? 1 : 0
  source = "./modules/postgresql"
  
  name                = var.db_name
  resource_group_name = var.resource_group_name
  location            = var.location
  subnet_id           = module.network.database_subnet_id
  
  tags = local.common_tags
}`}
        />
      </Section>

      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-8 my-8">
        <h3 className="text-2xl font-bold mb-4">🎉 Congratulations!</h3>
        <p className="text-lg mb-4">
          You've completed the Terraform + Azure tutorial! You now know how to:
        </p>
        <ul className="space-y-2 mb-6">
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Set up Azure CLI and Terraform
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Write Terraform configurations in HCL
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Deploy Azure resources
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Build serverless applications
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Configure advanced networking
          </li>
          <li className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Create reusable modules
          </li>
        </ul>
        <p className="text-sm opacity-90">
          Keep practicing and building more complex infrastructures. The best way to learn is by doing!
        </p>
      </div>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/networking" className="text-blue-600 hover:underline">
          ← Back: Advanced Networking
        </Link>
        <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}




