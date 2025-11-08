import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { DiagramBlock } from '../components/diagram-block';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function BasicsPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Terraform Basics</h1>
      <p className="text-lg text-gray-600 mb-8">
        Learn the fundamentals of Terraform: HCL syntax, providers, resources, variables, outputs, and essential commands.
      </p>

      <Section title="What is Terraform?">
        <p className="mb-4">
          Terraform is an Infrastructure as Code (IaC) tool that lets you define and provision infrastructure using a declarative configuration language called HCL (HashiCorp Configuration Language).
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Key Benefits:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Declarative:</strong> You describe what you want, not how to create it</li>
                <li>• <strong>Version Control:</strong> Infrastructure as code in Git</li>
                <li>• <strong>Reproducible:</strong> Create identical environments every time</li>
                <li>• <strong>Multi-Cloud:</strong> Works with Azure, AWS, GCP, and more</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="HCL Syntax Basics">
        <p className="mb-4">
          Terraform uses HCL, which is designed to be both human-readable and machine-friendly. Here's the basic structure:
        </p>
        <CodeBlock
          language="hcl"
          filename="basic-syntax.tf"
          code={`# This is a comment

# Block type, block label(s), block body
resource "azurerm_resource_group" "example" {
  name     = "my-resource-group"
  location = "East US"
  
  tags = {
    Environment = "Development"
    Purpose     = "Learning"
  }
}

# Variable declaration
variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

# Output declaration
output "resource_group_id" {
  description = "The ID of the resource group"
  value       = azurerm_resource_group.example.id
}`}
        />
        <div className="mt-6 space-y-3">
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-900 mb-2">Block Structure</h4>
            <p className="text-sm text-gray-700">
              <code>block_type "label" "name" {"{"} ... {"}"}</code>
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-900 mb-2">Arguments</h4>
            <p className="text-sm text-gray-700">
              <code>name = value</code> - Assigns values to configuration properties
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <h4 className="font-semibold text-gray-900 mb-2">Types</h4>
            <p className="text-sm text-gray-700">
              string, number, bool, list, map, object
            </p>
          </div>
        </div>
      </Section>

      <Section title="Providers">
        <p className="mb-4">
          Providers are plugins that interact with cloud platforms, SaaS providers, and other APIs. For Azure, we use the <code>azurerm</code> provider.
        </p>
        <CodeBlock
          language="hcl"
          filename="provider.tf"
          code={`# Configure the Azure Provider
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
  
  # Optional: specify subscription if you have multiple
  # subscription_id = "00000000-0000-0000-0000-000000000000"
}`}
        />
        <p className="mt-4 text-gray-700">
          The <code>features {"{}"}</code> block is required for the azurerm provider, even if empty. It can contain provider-specific feature flags.
        </p>
      </Section>

      <Section title="Resources">
        <p className="mb-4">
          Resources are the most important element in Terraform. Each resource block describes one or more infrastructure objects.
        </p>
        <CodeBlock
          language="hcl"
          filename="resources.tf"
          code={`# Resource syntax: resource "type" "name"
resource "azurerm_resource_group" "main" {
  name     = "rg-terraform-demo"
  location = "East US"
}

# Reference other resources using: resource_type.name.attribute
resource "azurerm_storage_account" "storage" {
  name                     = "terraformdemo12345"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # Dependencies are automatically inferred from references
}`}
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Naming:</strong> Azure storage account names must be globally unique, 3-24 characters, lowercase letters and numbers only.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Variables">
        <p className="mb-4">
          Variables make your Terraform code reusable and flexible. They can be defined with defaults and validated.
        </p>
        <CodeBlock
          language="hcl"
          filename="variables.tf"
          code={`# String variable with default
variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

# Variable without default (must be provided)
variable "environment" {
  description = "Environment name"
  type        = string
}

# Number variable
variable "instance_count" {
  description = "Number of instances to create"
  type        = number
  default     = 1
}

# List variable
variable "allowed_ips" {
  description = "List of allowed IP addresses"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

# Map variable
variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "Demo"
  }
}

# Variable with validation
variable "tier" {
  description = "Service tier"
  type        = string
  
  validation {
    condition     = contains(["Standard", "Premium"], var.tier)
    error_message = "Tier must be either Standard or Premium."
  }
}`}
        />
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Using Variables</h3>
        <CodeBlock
          language="hcl"
          filename="main.tf"
          code={`resource "azurerm_resource_group" "main" {
  name     = "rg-\${var.environment}"
  location = var.location
  tags     = var.tags
}`}
        />
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Providing Variable Values</h3>
        <p className="mb-3">You can provide values in several ways:</p>
        <CodeBlock
          language="hcl"
          filename="terraform.tfvars"
          code={`environment = "production"
location    = "West US"
tags = {
  ManagedBy   = "Terraform"
  Project     = "MyApp"
  Environment = "Production"
}`}
        />
        <p className="mt-3 text-sm text-gray-600">Or via command line:</p>
        <CommandBlock command='terraform apply -var="environment=production"' />
      </Section>

      <Section title="Outputs">
        <p className="mb-4">
          Outputs display values after Terraform applies your configuration. They're useful for displaying important information or passing data between modules.
        </p>
        <CodeBlock
          language="hcl"
          filename="outputs.tf"
          code={`# Simple output
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

# Output with sensitive data
output "storage_connection_string" {
  description = "Storage account connection string"
  value       = azurerm_storage_account.storage.primary_connection_string
  sensitive   = true  # Won't be displayed in console
}

# Complex output
output "resource_info" {
  description = "Complete resource group information"
  value = {
    id       = azurerm_resource_group.main.id
    name     = azurerm_resource_group.main.name
    location = azurerm_resource_group.main.location
  }
}`}
        />
      </Section>

      <Section title="State Management">
        <p className="mb-4">
          Terraform tracks your infrastructure in a state file (<code>terraform.tfstate</code>). This file maps your configuration to real-world resources.
        </p>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 mb-1">Important State File Rules:</p>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Never edit state files manually</li>
                <li>• Don't commit state files to Git (contains secrets)</li>
                <li>• Use remote state for team environments</li>
                <li>• Back up state files regularly</li>
              </ul>
            </div>
          </div>
        </div>
        <p className="mt-4 mb-3">For production, use remote state backend:</p>
        <CodeBlock
          language="hcl"
          filename="backend.tf"
          code={`terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "terraform.tfstate"
  }
}`}
        />
      </Section>

      <Section title="Essential Terraform Commands">
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">1. Initialize</h3>
            <CommandBlock command="terraform init" description="Download providers and initialize working directory" />
            <p className="text-sm text-gray-600 mt-2">Run this first, and whenever you add new providers or modules.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">2. Format</h3>
            <CommandBlock command="terraform fmt" description="Format code to canonical style" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">3. Validate</h3>
            <CommandBlock command="terraform validate" description="Check configuration syntax" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">4. Plan</h3>
            <CommandBlock command="terraform plan" description="Preview changes before applying" />
            <p className="text-sm text-gray-600 mt-2">Shows what will be created, modified, or destroyed.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">5. Apply</h3>
            <CommandBlock command="terraform apply" description="Create/update infrastructure" />
            <p className="text-sm text-gray-600 mt-2">You'll be prompted to confirm. Use <code>-auto-approve</code> to skip.</p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">6. Show</h3>
            <CommandBlock command="terraform show" description="Display current state" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">7. Output</h3>
            <CommandBlock command="terraform output" description="Display output values" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">8. Destroy</h3>
            <CommandBlock command="terraform destroy" description="Delete all resources" />
            <p className="text-sm text-gray-600 mt-2">⚠️ Use with caution! This will delete all managed infrastructure.</p>
          </div>
        </div>
      </Section>

      <Section title="Terraform Workflow">
        <p className="mb-4">
          Understanding the Terraform workflow is crucial. Here's how Terraform transforms your code into cloud resources:
        </p>
        <DiagramBlock
          title="Terraform Workflow Diagram"
          direction="vertical"
          nodes={[
            { id: 'a', label: 'Write Source Code', sublabel: '.tf files', color: 'blue' },
            { id: 'b', label: 'terraform init', sublabel: 'Download Providers', color: 'lightBlue' },
            { id: 'c', label: 'terraform plan', sublabel: 'Preview Changes', color: 'lighterBlue' },
            { id: 'e', label: 'terraform apply', sublabel: 'Create Resources', color: 'green' },
            { id: 'f', label: 'Azure Resources', sublabel: 'Resource Group\nStorage Account\netc.', color: 'orange' },
            { id: 'g', label: 'State File', sublabel: 'terraform.tfstate', color: 'purple' },
            { id: 'i', label: 'Infrastructure Ready', color: 'green' },
          ]}
          connections={[
            { from: 'a', to: 'b' },
            { from: 'b', to: 'c' },
            { from: 'c', to: 'e', label: 'Yes' },
            { from: 'e', to: 'f' },
            { from: 'f', to: 'g' },
            { from: 'g', to: 'i', label: 'No' },
          ]}
        />
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg mt-6">
          <ol className="space-y-4">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">1</span>
              <div>
                <h4 className="font-semibold text-gray-900">Write</h4>
                <p className="text-sm text-gray-700">Create .tf files with your infrastructure configuration</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">2</span>
              <div>
                <h4 className="font-semibold text-gray-900">Initialize</h4>
                <p className="text-sm text-gray-700">Run <code>terraform init</code> to download providers</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">3</span>
              <div>
                <h4 className="font-semibold text-gray-900">Plan</h4>
                <p className="text-sm text-gray-700">Run <code>terraform plan</code> to preview changes</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">4</span>
              <div>
                <h4 className="font-semibold text-gray-900">Apply</h4>
                <p className="text-sm text-gray-700">Run <code>terraform apply</code> to create resources</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">5</span>
              <div>
                <h4 className="font-semibold text-gray-900">Update</h4>
                <p className="text-sm text-gray-700">Modify configuration and repeat plan/apply cycle</p>
              </div>
            </li>
          </ol>
        </div>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/setup" className="text-blue-600 hover:underline">
          ← Back: Setup & Prerequisites
        </Link>
        <Link href="/storage" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Next: Deploy Simple Resources →
        </Link>
      </div>
    </div>
  );
}




