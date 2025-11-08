import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { DiagramBlock } from '../components/diagram-block';
import { AlertCircle, CheckCircle2, FolderTree } from 'lucide-react';
import Link from 'next/link';

export default function StoragePage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Deploy Simple Resources</h1>
      <p className="text-lg text-gray-600 mb-8">
        Let's deploy your first Azure resources with Terraform: a Resource Group and Storage Account.
        This is a hands-on tutorial with complete, working code.
      </p>

      <Section title="What We'll Build">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">In this tutorial:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Create an Azure Resource Group (container for resources)</li>
                <li>• Deploy a Storage Account (cloud storage)</li>
                <li>• Use variables for flexibility</li>
                <li>• Output important information</li>
                <li>• Understand Terraform state</li>
              </ul>
            </div>
          </div>
        </div>
        <DiagramBlock
          title="Resource Relationship Diagram"
          direction="vertical"
          nodes={[
            { id: 'rg', label: 'Resource Group', sublabel: 'rg-terraform-demo\nLocation: East US', color: 'blue' },
            { id: 'sa', label: 'Storage Account', sublabel: 'mystorageacct12345\nTier: Standard\nReplication: LRS', color: 'green' },
            { id: 'bc', label: 'Blob Container', sublabel: 'name: content\nAccess: private', color: 'orange' },
          ]}
          connections={[
            { from: 'rg', to: 'sa', label: 'Contains', dashed: true },
            { from: 'sa', to: 'bc', label: 'Contains', dashed: true },
          ]}
        />
      </Section>

      <Section title="Project Structure">
        <p className="mb-4">
          Let's organize our Terraform project. Create a new directory and the following files:
        </p>
        <CommandBlock command="mkdir terraform-storage-demo && cd terraform-storage-demo" />
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="flex items-start gap-2 mb-2">
            <FolderTree className="w-4 h-4 mt-1" />
            <span className="text-blue-400">terraform-storage-demo/</span>
          </div>
          <div className="ml-6 space-y-1">
            <div>├── provider.tf</div>
            <div>├── variables.tf</div>
            <div>├── main.tf</div>
            <div>├── outputs.tf</div>
            <div>└── terraform.tfvars</div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Configure Provider">
        <p className="mb-4">
          First, let's configure the Azure provider. This tells Terraform how to interact with Azure.
        </p>
        <CodeBlock
          language="hcl"
          filename="provider.tf"
          code={`terraform {
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
}`}
        />
      </Section>

      <Section title="Step 2: Define Variables">
        <p className="mb-4">
          Variables make our code reusable and easier to manage.
        </p>
        <CodeBlock
          language="hcl"
          filename="variables.tf"
          code={`variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-terraform-demo"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
  
  validation {
    condition     = contains(["East US", "West US", "Central US", "West Europe"], var.location)
    error_message = "Location must be a valid Azure region."
  }
}

variable "storage_account_name" {
  description = "Name of the storage account (must be globally unique)"
  type        = string
  
  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "Storage account name must be 3-24 characters, lowercase letters and numbers only."
  }
}

variable "account_tier" {
  description = "Storage account tier"
  type        = string
  default     = "Standard"
  
  validation {
    condition     = contains(["Standard", "Premium"], var.account_tier)
    error_message = "Account tier must be either Standard or Premium."
  }
}

variable "replication_type" {
  description = "Storage replication type"
  type        = string
  default     = "LRS"
  
  validation {
    condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.replication_type)
    error_message = "Invalid replication type."
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Environment = "Development"
    ManagedBy   = "Terraform"
    Project     = "Demo"
  }
}`}
        />
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-semibold text-gray-900 mb-2">Understanding Replication Types:</h4>
          <ul className="text-sm text-gray-700 space-y-1 ml-4">
            <li>• <strong>LRS</strong> - Locally Redundant (cheapest, 3 copies in one datacenter)</li>
            <li>• <strong>GRS</strong> - Geo-Redundant (copies to secondary region)</li>
            <li>• <strong>ZRS</strong> - Zone-Redundant (copies across availability zones)</li>
            <li>• <strong>RAGRS</strong> - Read-Access Geo-Redundant</li>
          </ul>
        </div>
      </Section>

      <Section title="Step 3: Create Resources">
        <p className="mb-4">
          Now let's create our Azure resources.
        </p>
        <CodeBlock
          language="hcl"
          filename="main.tf"
          code={`# Create Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# Create Storage Account
resource "azurerm_storage_account" "main" {
  name                     = var.storage_account_name
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = var.account_tier
  account_replication_type = var.replication_type
  
  # Security settings
  allow_nested_items_to_be_public = false
  min_tls_version                 = "TLS1_2"
  
  tags = var.tags
}

# Create a Blob Container
resource "azurerm_storage_container" "main" {
  name                  = "content"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}`}
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Resource Dependencies:</p>
              <p className="text-sm text-yellow-800">
                Notice how we reference <code>azurerm_resource_group.main.name</code> in the storage account.
                Terraform automatically understands that it must create the resource group first.
              </p>
            </div>
          </div>
        </div>
        <DiagramBlock
          title="Terraform Dependency Graph"
          direction="horizontal"
          nodes={[
            { id: 'a', label: 'azurerm_resource_group.main', color: 'blue' },
            { id: 'b', label: 'azurerm_storage_account.main', color: 'green' },
            { id: 'c', label: 'azurerm_storage_container.main', color: 'orange' },
          ]}
          connections={[
            { from: 'a', to: 'b', label: 'name, location' },
            { from: 'b', to: 'c', label: 'storage_account_name' },
          ]}
        />
      </Section>

      <Section title="Step 4: Define Outputs">
        <p className="mb-4">
          Outputs display important information after deployment.
        </p>
        <CodeBlock
          language="hcl"
          filename="outputs.tf"
          code={`output "resource_group_id" {
  description = "ID of the resource group"
  value       = azurerm_resource_group.main.id
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "storage_account_id" {
  description = "ID of the storage account"
  value       = azurerm_storage_account.main.id
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}

output "primary_blob_endpoint" {
  description = "Primary blob endpoint"
  value       = azurerm_storage_account.main.primary_blob_endpoint
}

output "primary_connection_string" {
  description = "Primary connection string"
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true  # Hide from console output
}

output "container_name" {
  description = "Name of the blob container"
  value       = azurerm_storage_container.main.name
}`}
        />
      </Section>

      <Section title="Step 5: Provide Variable Values">
        <p className="mb-4">
          Create a <code>terraform.tfvars</code> file to set your variable values.
        </p>
        <CodeBlock
          language="hcl"
          filename="terraform.tfvars"
          code={`resource_group_name  = "rg-my-terraform-demo"
location             = "East US"
storage_account_name = "mystorageacct12345"  # Must be globally unique!
account_tier         = "Standard"
replication_type     = "LRS"

tags = {
  Environment = "Development"
  ManagedBy   = "Terraform"
  Project     = "StorageDemo"
  Owner       = "YourName"
}`}
        />
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              <strong>Important:</strong> Change <code>storage_account_name</code> to something unique!
              Storage account names must be globally unique across all of Azure.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Step 6: Deploy to Azure">
        <p className="mb-4">
          Now let's deploy! Follow these steps:
        </p>
        
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">1. Initialize Terraform</h4>
            <CommandBlock command="terraform init" />
            <p className="text-sm text-gray-600 mt-2">
              This downloads the Azure provider and prepares your workspace.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">2. Format Your Code</h4>
            <CommandBlock command="terraform fmt" />
            <p className="text-sm text-gray-600 mt-2">
              Automatically formats your .tf files to standard style.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">3. Validate Configuration</h4>
            <CommandBlock command="terraform validate" />
            <p className="text-sm text-gray-600 mt-2">
              Checks for syntax errors and configuration issues.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">4. Preview Changes</h4>
            <CommandBlock command="terraform plan" />
            <p className="text-sm text-gray-600 mt-2">
              Shows what Terraform will create. You should see 3 resources to add.
            </p>
            <div className="mt-3 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-sm text-green-800 font-mono">
                Plan: 3 to add, 0 to change, 0 to destroy.
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">5. Apply Configuration</h4>
            <CommandBlock command="terraform apply" />
            <p className="text-sm text-gray-600 mt-2">
              Type "yes" when prompted. Terraform will create your resources!
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">6. View Outputs</h4>
            <CommandBlock command="terraform output" />
            <p className="text-sm text-gray-600 mt-2">
              See all output values. For sensitive outputs:
            </p>
            <CommandBlock command="terraform output -json" />
          </div>
        </div>
      </Section>

      <Section title="Verify in Azure Portal">
        <div className="space-y-4">
          <p className="mb-4">
            Let's verify the resources were created:
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Option 1: Azure Portal</h4>
                <p className="text-sm text-gray-700 mb-2">
                  Go to <a href="https://portal.azure.com" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">portal.azure.com</a> and look for your resource group.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
              <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">Option 2: Azure CLI</h4>
                <CommandBlock command="az group show --name rg-my-terraform-demo" />
                <CommandBlock command="az storage account list --resource-group rg-my-terraform-demo --output table" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Making Changes">
        <p className="mb-4">
          Let's modify our infrastructure. Edit <code>terraform.tfvars</code> and add a new tag:
        </p>
        <CodeBlock
          language="hcl"
          filename="terraform.tfvars"
          code={`tags = {
  Environment = "Development"
  ManagedBy   = "Terraform"
  Project     = "StorageDemo"
  Owner       = "YourName"
  CostCenter  = "Engineering"  # New tag!
}`}
        />
        <p className="mt-4 mb-2">Now run:</p>
        <CommandBlock command="terraform plan" />
        <p className="mt-2 mb-2">You'll see Terraform will update the tags. Apply the change:</p>
        <CommandBlock command="terraform apply" />
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              <strong>Notice:</strong> Terraform only modifies what changed. It doesn't recreate the entire resource.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Understanding State">
        <p className="mb-4">
          After applying, check your directory. You'll see:
        </p>
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="space-y-1">
            <div>├── terraform.tfstate</div>
            <div>├── terraform.tfstate.backup</div>
            <div>└── .terraform.lock.hcl</div>
          </div>
        </div>
        <ul className="space-y-3 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <div>
              <strong>terraform.tfstate</strong> - Current state of your infrastructure
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <div>
              <strong>terraform.tfstate.backup</strong> - Previous state (before last apply)
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-600 font-bold">•</span>
            <div>
              <strong>.terraform.lock.hcl</strong> - Provider version lock file (commit to Git)
            </div>
          </li>
        </ul>
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">
              <strong>Never commit terraform.tfstate to Git!</strong> It contains sensitive data like connection strings.
              Add it to .gitignore.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Clean Up Resources">
        <p className="mb-4">
          When you're done experimenting, destroy the resources to avoid charges:
        </p>
        <CommandBlock command="terraform destroy" />
        <p className="mt-4">
          Type "yes" when prompted. Terraform will delete all resources it created.
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Pro Tip:</strong> You can destroy specific resources: <code>terraform destroy -target=azurerm_storage_container.main</code>
            </p>
          </div>
        </div>
      </Section>

      <Section title="Complete Example">
        <p className="mb-4">
          Here's the complete project you can copy and use:
        </p>
        <CommandBlock command="git clone https://github.com/your-repo/terraform-azure-storage-demo" />
        <p className="text-sm text-gray-600 mt-4">
          Or download all files from the GitHub repository (example link - you'd create this).
        </p>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/basics" className="text-blue-600 hover:underline">
          ← Back: Terraform Basics
        </Link>
        <Link href="/functions" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Next: Azure Functions →
        </Link>
      </div>
    </div>
  );
}




