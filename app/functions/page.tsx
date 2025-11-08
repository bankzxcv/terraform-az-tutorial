import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { DiagramBlock } from '../components/diagram-block';
import { AlertCircle, CheckCircle2, FolderTree } from 'lucide-react';
import Link from 'next/link';

export default function FunctionsPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Azure Functions with Terraform</h1>
      <p className="text-lg text-gray-600 mb-8">
        Deploy serverless Azure Functions using Terraform. We'll create a Function App, deploy a simple website, 
        and automate the entire deployment with scripts.
      </p>

      <Section title="What We'll Build">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">Project Components:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Azure Function App (serverless compute)</li>
                <li>• Storage Account (required for Functions)</li>
                <li>• App Service Plan (consumption-based)</li>
                <li>• Simple HTML website hosted as a static site</li>
                <li>• Automated deployment script</li>
              </ul>
            </div>
          </div>
        </div>
        <DiagramBlock
          title="Azure Functions Architecture"
          direction="vertical"
          nodes={[
            { id: 'rg', label: 'Resource Group', color: 'blue' },
            { id: 'asp', label: 'App Service Plan', sublabel: 'Consumption Plan', color: 'green' },
            { id: 'sa', label: 'Storage Account', sublabel: 'Required for Functions', color: 'orange' },
            { id: 'fa', label: 'Function App', sublabel: 'Serverless Compute', color: 'purple' },
            { id: 'website', label: 'Static Website', sublabel: 'index.html\nstyle.css\napp.js', color: 'pink' },
          ]}
          connections={[
            { from: 'rg', to: 'asp' },
            { from: 'rg', to: 'sa' },
            { from: 'rg', to: 'fa' },
            { from: 'asp', to: 'fa' },
            { from: 'sa', to: 'fa' },
            { from: 'fa', to: 'website' },
          ]}
        />
      </Section>

      <Section title="Project Structure">
        <CommandBlock command="mkdir terraform-functions-demo && cd terraform-functions-demo" />
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="flex items-start gap-2 mb-2">
            <FolderTree className="w-4 h-4 mt-1" />
            <span className="text-blue-400">terraform-functions-demo/</span>
          </div>
          <div className="ml-6 space-y-1">
            <div>├── terraform/</div>
            <div>│   ├── provider.tf</div>
            <div>│   ├── variables.tf</div>
            <div>│   ├── main.tf</div>
            <div>│   └── outputs.tf</div>
            <div>├── website/</div>
            <div>│   ├── index.html</div>
            <div>│   ├── style.css</div>
            <div>│   └── app.js</div>
            <div>└── deploy.sh</div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Provider Configuration">
        <CommandBlock command="mkdir terraform && cd terraform" />
        <CodeBlock
          language="hcl"
          filename="terraform/provider.tf"
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
}`}
        />
      </Section>

      <Section title="Step 2: Variables">
        <CodeBlock
          language="hcl"
          filename="terraform/variables.tf"
          code={`variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "funcapp"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
  
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "function_runtime" {
  description = "Function runtime"
  type        = string
  default     = "node"
  
  validation {
    condition     = contains(["node", "python", "dotnet"], var.function_runtime)
    error_message = "Runtime must be node, python, or dotnet."
  }
}

variable "runtime_version" {
  description = "Runtime version"
  type        = string
  default     = "18"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    ManagedBy   = "Terraform"
    Environment = "Development"
  }
}`}
        />
      </Section>

      <Section title="Step 3: Main Infrastructure">
        <CodeBlock
          language="hcl"
          filename="terraform/main.tf"
          code={`# Random suffix for unique names
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-\${var.project_name}-\${var.environment}"
  location = var.location
  tags     = var.tags
}

# Storage Account (required for Function App)
resource "azurerm_storage_account" "function" {
  name                     = "st\${var.project_name}\${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # Enable static website hosting
  static_website {
    index_document = "index.html"
  }
  
  tags = var.tags
}

# Storage Container for deployment package
resource "azurerm_storage_container" "deployments" {
  name                  = "function-deployments"
  storage_account_name  = azurerm_storage_account.function.name
  container_access_type = "private"
}

# App Service Plan (Consumption tier for serverless)
resource "azurerm_service_plan" "main" {
  name                = "asp-\${var.project_name}-\${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption tier (pay per execution)
  
  tags = var.tags
}

# Function App
resource "azurerm_linux_function_app" "main" {
  name                = "func-\${var.project_name}-\${var.environment}-\${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  
  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.function.name
  storage_account_access_key = azurerm_storage_account.function.primary_access_key
  
  site_config {
    application_stack {
      node_version = var.runtime_version
    }
    
    # Enable CORS for website access
    cors {
      allowed_origins = ["*"]
    }
  }
  
  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = var.function_runtime
    "WEBSITE_RUN_FROM_PACKAGE"       = "1"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~\${var.runtime_version}"
  }
  
  tags = var.tags
}

# Application Insights for monitoring
resource "azurerm_application_insights" "main" {
  name                = "ai-\${var.project_name}-\${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  application_type    = "web"
  
  tags = var.tags
}`}
        />
        <DiagramBlock
          title="Terraform Resource Dependencies"
          direction="horizontal"
          nodes={[
            { id: 'rg', label: 'Resource Group', color: 'blue' },
            { id: 'sp', label: 'Service Plan', color: 'green' },
            { id: 'sa', label: 'Storage Account', color: 'orange' },
            { id: 'fa', label: 'Function App', color: 'purple' },
            { id: 'ai', label: 'Application Insights', color: 'pink' },
          ]}
          connections={[
            { from: 'rg', to: 'sp' },
            { from: 'rg', to: 'sa' },
            { from: 'rg', to: 'fa' },
            { from: 'rg', to: 'ai' },
            { from: 'sp', to: 'fa', label: 'service_plan_id' },
            { from: 'sa', to: 'fa', label: 'storage_account_name\naccess_key' },
          ]}
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Consumption Plan (Y1):</p>
              <p className="text-sm text-yellow-800">
                The Y1 SKU provides automatic scaling and you only pay for execution time. 
                First 1 million executions are free each month!
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Step 4: Outputs">
        <CodeBlock
          language="hcl"
          filename="terraform/outputs.tf"
          code={`output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "function_app_name" {
  description = "Function App name"
  value       = azurerm_linux_function_app.main.name
}

output "function_app_url" {
  description = "Function App URL"
  value       = "https://\${azurerm_linux_function_app.main.default_hostname}"
}

output "storage_account_name" {
  description = "Storage account name"
  value       = azurerm_storage_account.function.name
}

output "static_website_url" {
  description = "Static website URL"
  value       = azurerm_storage_account.function.primary_web_endpoint
}

output "instrumentation_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}

output "deployment_command" {
  description = "Command to deploy functions"
  value       = "func azure functionapp publish \${azurerm_linux_function_app.main.name}"
}`}
        />
      </Section>

      <Section title="Step 5: Create Website Files">
        <p className="mb-4">
          Let's create a simple static website to deploy.
        </p>
        <CommandBlock command="mkdir ../website && cd ../website" />
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">HTML File</h3>
        <CodeBlock
          language="html"
          filename="website/index.html"
          code={`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Azure Functions Demo</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 Azure Functions Demo</h1>
            <p>Deployed with Terraform</p>
        </header>
        
        <main>
            <div class="card">
                <h2>Welcome!</h2>
                <p>This website is hosted on Azure Storage as a static site.</p>
                <p>It was deployed using Terraform infrastructure as code.</p>
            </div>
            
            <div class="card">
                <h3>API Test</h3>
                <button id="testBtn" onclick="testFunction()">Test Function</button>
                <div id="result"></div>
            </div>
            
            <div class="info">
                <p><strong>Deployed:</strong> <span id="timestamp"></span></p>
                <p><strong>Status:</strong> <span class="status">✓ Online</span></p>
            </div>
        </main>
    </div>
    
    <script src="app.js"></script>
</body>
</html>`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">CSS File</h3>
        <CodeBlock
          language="css"
          filename="website/style.css"
          code={`* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}

.container {
    max-width: 800px;
    width: 100%;
}

header {
    text-align: center;
    color: white;
    margin-bottom: 40px;
}

header h1 {
    font-size: 3rem;
    margin-bottom: 10px;
}

header p {
    font-size: 1.2rem;
    opacity: 0.9;
}

.card {
    background: white;
    border-radius: 12px;
    padding: 30px;
    margin-bottom: 20px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}

.card h2 {
    color: #667eea;
    margin-bottom: 15px;
}

.card h3 {
    color: #764ba2;
    margin-bottom: 15px;
}

.card p {
    line-height: 1.6;
    color: #666;
    margin-bottom: 10px;
}

button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 12px 30px;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    transition: transform 0.2s;
}

button:hover {
    transform: scale(1.05);
}

#result {
    margin-top: 15px;
    padding: 15px;
    background: #f5f5f5;
    border-radius: 6px;
    min-height: 50px;
}

.info {
    background: rgba(255, 255, 255, 0.95);
    border-radius: 12px;
    padding: 20px;
    color: #333;
}

.info p {
    margin-bottom: 10px;
}

.status {
    color: #22c55e;
    font-weight: bold;
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">JavaScript File</h3>
        <CodeBlock
          language="javascript"
          filename="website/app.js"
          code={`// Display current timestamp
document.addEventListener('DOMContentLoaded', function() {
    const timestamp = new Date().toLocaleString();
    document.getElementById('timestamp').textContent = timestamp;
});

// Test function (would connect to your Azure Function)
async function testFunction() {
    const resultDiv = document.getElementById('result');
    const btn = document.getElementById('testBtn');
    
    btn.disabled = true;
    resultDiv.innerHTML = '<p>⏳ Testing connection...</p>';
    
    try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        resultDiv.innerHTML = \`
            <p style="color: #22c55e; font-weight: bold;">✓ Success!</p>
            <p>Azure Function is responding correctly.</p>
            <p><small>Response time: \${Math.random() * 100 | 0}ms</small></p>
        \`;
    } catch (error) {
        resultDiv.innerHTML = \`
            <p style="color: #ef4444; font-weight: bold;">✗ Error</p>
            <p>\${error.message}</p>
        \`;
    } finally {
        btn.disabled = false;
    }
}`}
        />
      </Section>

      <Section title="Step 6: Deployment Script">
        <p className="mb-4">
          Create an automated deployment script that handles everything.
        </p>
        <CodeBlock
          language="bash"
          filename="deploy.sh"
          code={`#!/bin/bash

# Terraform + Azure Functions Deployment Script
# Usage: ./deploy.sh [init|deploy|destroy|website]

set -e  # Exit on error

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
NC='\\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "\${GREEN}[INFO]\${NC} $1"
}

print_error() {
    echo -e "\${RED}[ERROR]\${NC} $1"
}

print_warning() {
    echo -e "\${YELLOW}[WARNING]\${NC} $1"
}

# Check if Azure CLI is logged in
check_azure_login() {
    print_status "Checking Azure login status..."
    if ! az account show &> /dev/null; then
        print_error "Not logged into Azure. Please run: az login"
        exit 1
    fi
    print_status "Azure login verified ✓"
}

# Initialize Terraform
init_terraform() {
    print_status "Initializing Terraform..."
    cd terraform
    terraform init
    cd ..
    print_status "Terraform initialized ✓"
}

# Deploy infrastructure
deploy_infrastructure() {
    print_status "Deploying infrastructure with Terraform..."
    cd terraform
    
    # Run terraform plan
    print_status "Running terraform plan..."
    terraform plan -out=tfplan
    
    # Apply the plan
    print_status "Applying terraform configuration..."
    terraform apply tfplan
    
    # Get outputs
    print_status "Getting outputs..."
    WEBSITE_URL=$(terraform output -raw static_website_url)
    FUNCTION_URL=$(terraform output -raw function_app_url)
    STORAGE_ACCOUNT=$(terraform output -raw storage_account_name)
    RESOURCE_GROUP=$(terraform output -raw resource_group_name)
    
    cd ..
    
    print_status "Infrastructure deployed successfully! ✓"
    echo ""
    echo "📋 Deployment Information:"
    echo "   Static Website URL: $WEBSITE_URL"
    echo "   Function App URL: $FUNCTION_URL"
    echo "   Storage Account: $STORAGE_ACCOUNT"
    echo "   Resource Group: $RESOURCE_GROUP"
    echo ""
}

# Deploy website to Azure Storage
deploy_website() {
    print_status "Deploying website to Azure Storage..."
    
    cd terraform
    STORAGE_ACCOUNT=$(terraform output -raw storage_account_name)
    cd ..
    
    # Upload website files
    print_status "Uploading files to \\\$web container..."
    az storage blob upload-batch \\
        --account-name "$STORAGE_ACCOUNT" \\
        --destination '\$web' \\
        --source website/ \\
        --overwrite
    
    print_status "Website deployed successfully! ✓"
    
    # Get website URL
    cd terraform
    WEBSITE_URL=$(terraform output -raw static_website_url)
    cd ..
    
    echo ""
    echo "🌐 Your website is live at:"
    echo "   $WEBSITE_URL"
    echo ""
}

# Destroy infrastructure
destroy_infrastructure() {
    print_warning "This will destroy all resources!"
    read -p "Are you sure? (yes/no): " confirm
    
    if [ "$confirm" = "yes" ]; then
        print_status "Destroying infrastructure..."
        cd terraform
        terraform destroy -auto-approve
        cd ..
        print_status "Infrastructure destroyed ✓"
    else
        print_status "Destruction cancelled."
    fi
}

# Main script logic
case "$1" in
    init)
        check_azure_login
        init_terraform
        ;;
    deploy)
        check_azure_login
        deploy_infrastructure
        deploy_website
        ;;
    website)
        check_azure_login
        deploy_website
        ;;
    destroy)
        check_azure_login
        destroy_infrastructure
        ;;
    *)
        echo "Usage: $0 {init|deploy|website|destroy}"
        echo ""
        echo "Commands:"
        echo "  init     - Initialize Terraform"
        echo "  deploy   - Deploy infrastructure and website"
        echo "  website  - Deploy/update website only"
        echo "  destroy  - Destroy all resources"
        exit 1
        ;;
esac`}
        />
        <p className="mt-4">Make the script executable:</p>
        <CommandBlock command="chmod +x deploy.sh" />
      </Section>

      <Section title="Step 7: Deploy Everything">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">1. Initialize</h4>
            <CommandBlock command="./deploy.sh init" />
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">2. Deploy Infrastructure & Website</h4>
            <CommandBlock command="./deploy.sh deploy" />
            <p className="text-sm text-gray-600 mt-2">
              This will create all Azure resources and deploy the website. Takes about 2-3 minutes.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">3. Update Website Only</h4>
            <CommandBlock command="./deploy.sh website" />
            <p className="text-sm text-gray-600 mt-2">
              After making changes to website files, use this to quickly redeploy.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Advanced: Deploy a Real Function">
        <p className="mb-4">
          To deploy actual Azure Functions code (not just static site), install Azure Functions Core Tools:
        </p>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Install Functions Core Tools</h3>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">macOS:</p>
            <CommandBlock command="brew tap azure/functions && brew install azure-functions-core-tools@4" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">Windows:</p>
            <CommandBlock command="winget install Microsoft.Azure.FunctionsCoreTools" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Create a Function</h3>
        <CommandBlock command="func init MyFunctionApp --javascript" />
        <CommandBlock command="cd MyFunctionApp && func new --name HttpTrigger --template 'HTTP trigger'" />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Deploy Function</h3>
        <CommandBlock command="cd terraform && FUNC_NAME=$(terraform output -raw function_app_name) && cd .." />
        <CommandBlock command="cd MyFunctionApp && func azure functionapp publish $FUNC_NAME" />
      </Section>

      <Section title="Testing Your Deployment">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">1. Visit Your Website</h4>
              <p className="text-sm text-gray-700 mb-2">
                Open the Static Website URL from the deployment output
              </p>
              <CommandBlock command="cd terraform && terraform output static_website_url" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">2. Check Function App</h4>
              <CommandBlock command="cd terraform && terraform output function_app_url" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">3. Monitor with Application Insights</h4>
              <p className="text-sm text-gray-700">
                Go to Azure Portal → Application Insights → Live Metrics
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Clean Up">
        <CommandBlock command="./deploy.sh destroy" />
        <p className="mt-4 text-gray-700">
          This will remove all Azure resources to avoid charges.
        </p>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/storage" className="text-blue-600 hover:underline">
          ← Back: Simple Resources
        </Link>
        <Link href="/networking" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Next: Advanced Networking →
        </Link>
      </div>
    </div>
  );
}




