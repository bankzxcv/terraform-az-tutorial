import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { AlertCircle, CheckCircle2, Terminal } from 'lucide-react';

export default function SimpleDeployPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Simple Azure Function Deployment
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Deploy a simple Express.js API with just a health check endpoint using Terraform. No databases, no containers, just a basic working API.
      </p>

      {/* Step 1: Create Project */}
      <Section title="Step 1: Create Project Directory">
        <p className="text-gray-700 mb-4">
          Start by creating a new directory for your Azure Function project:
        </p>
        <CommandBlock command="mkdir my-simple-function && cd my-simple-function" />
      </Section>

      {/* Step 2: Create package.json */}
      <Section title="Step 2: Create package.json">
        <p className="text-gray-700 mb-4">
          Initialize your Node.js project with dependencies:
        </p>
        <CodeBlock
          language="json"
          filename="package.json"
          code={`{
  "name": "my-simple-function",
  "version": "1.0.0",
  "description": "Simple Azure Function with health check",
  "main": "index.js",
  "type": "module",
  "scripts": {
    "start": "func start",
    "dev": "func start"
  },
  "dependencies": {
    "@azure/functions": "^4.9.0",
    "express": "^5.1.0"
  }
}`}
        />
        <p className="text-gray-700 mt-4 mb-2">Install dependencies:</p>
        <CommandBlock command="npm install" />
      </Section>

      {/* Step 3: Create Express API */}
      <Section title="Step 3: Create index.js (Express API)">
        <p className="text-gray-700 mb-4">
          Create a simple Express app with just a health check endpoint:
        </p>
        <CodeBlock
          language="javascript"
          filename="index.js"
          code={`const { app } = require('@azure/functions');
const express = require('express');

const expressApp = express();
expressApp.use(express.json());

// Simple health check endpoint
expressApp.get('/api/healthcheck', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint
expressApp.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Hello from Azure Functions',
    version: '1.0.0'
  });
});

// Register the Express app with Azure Functions
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: '{*segments}',
  handler: async (request, context) => {
    return new Promise((resolve) => {
      expressApp(request, context.res, () => {
        resolve(context.res);
      });
    });
  }
});`}
        />
      </Section>

      {/* Step 4: Create host.json */}
      <Section title="Step 4: Create host.json (Runtime Config)">
        <p className="text-gray-700 mb-4">
          Configure the Azure Functions runtime:
        </p>
        <CodeBlock
          language="json"
          filename="host.json"
          code={`{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true,
        "maxTelemetryItemsPerSecond": 20
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  },
  "functionTimeout": "00:05:00"
}`}
        />
      </Section>

      {/* Step 5: Create local.settings.json */}
      <Section title="Step 5: Create local.settings.json (Local Dev Settings)">
        <p className="text-gray-700 mb-4">
          Configure local development settings:
        </p>
        <CodeBlock
          language="json"
          filename="local.settings.json"
          code={`{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FUNCTIONS_WORKER_RUNTIME_VERSION": "20"
  },
  "Host": {
    "LocalHttpPort": 7071,
    "CORS": "*"
  }
}`}
        />
      </Section>

      {/* Step 6: Run Locally */}
      <Section title="Step 6: Run Locally">
        <p className="text-gray-700 mb-4">
          Test your function locally before deployment:
        </p>
        <CommandBlock command="npm start" />
        <p className="text-gray-700 mt-4">
          Your function will be available at <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:7071</code>
        </p>
        <p className="text-gray-700 mt-2">Test the health check endpoint:</p>
        <CommandBlock command="curl http://localhost:7071/api/healthcheck" />
        <p className="text-gray-700 mt-4">Expected response:</p>
        <CodeBlock
          language="json"
          code={`{
  "status": "healthy",
  "timestamp": "2025-11-08T10:30:45.123Z",
  "uptime": 12.456
}`}
        />
      </Section>

      {/* Step 7: Create Terraform Files */}
      <Section title="Step 7: Create Terraform Configuration">
        <p className="text-gray-700 mb-4">
          Create a <code className="bg-gray-100 px-2 py-1 rounded">terraform</code> directory for infrastructure:
        </p>
        <CommandBlock command="mkdir terraform && cd terraform" />

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create provider.tf</h3>
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
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create variables.tf</h3>
          <CodeBlock
            language="hcl"
            filename="terraform/variables.tf"
            code={`variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "function_name" {
  description = "Azure Function App name"
  type        = string
  default     = "simple-api-function"
}`}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create main.tf</h3>
          <CodeBlock
            language="hcl"
            filename="terraform/main.tf"
            code={`# Random suffix for unique naming
resource "random_string" "storage_suffix" {
  length  = 4
  special = false
}

# Resource Group
resource "azurerm_resource_group" "main" {
  name     = "rg-\${var.function_name}-\${var.environment}"
  location = var.location
}

# Storage Account (required for Azure Functions)
resource "azurerm_storage_account" "main" {
  name                     = "\${replace(var.function_name, "-", "")}st\${random_string.storage_suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# App Service Plan (Consumption plan)
resource "azurerm_service_plan" "main" {
  name                = "plan-\${var.function_name}-\${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan
}

# Azure Function App
resource "azurerm_linux_function_app" "main" {
  name                = "func-\${var.function_name}-\${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }

    http2_enabled            = true
    minimum_tls_version      = "1.2"
    cors {
      allowed_origins = ["*"]
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"       = "node"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~20"
    "AzureWebJobsFeatureFlags"        = "EnableWorkerIndexing"
  }
}`}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create outputs.tf</h3>
          <CodeBlock
            language="hcl"
            filename="terraform/outputs.tf"
            code={`output "function_app_url" {
  description = "URL of the deployed Function App"
  value       = "https://\${azurerm_linux_function_app.main.default_hostname}"
}

output "function_app_name" {
  description = "Name of the Function App"
  value       = azurerm_linux_function_app.main.name
}

output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.main.name
}

output "storage_account_name" {
  description = "Name of the storage account"
  value       = azurerm_storage_account.main.name
}`}
          />
        </div>
      </Section>

      {/* Step 8: Create terraform.tfvars */}
      <Section title="Step 8: Create terraform.tfvars">
        <p className="text-gray-700 mb-4">
          In the terraform directory, create <code className="bg-gray-100 px-2 py-1 rounded">terraform.tfvars</code> with your values:
        </p>
        <CodeBlock
          language="hcl"
          filename="terraform/terraform.tfvars"
          code={`location      = "East US"
environment   = "dev"
function_name = "my-simple-api"`}
        />
      </Section>

      {/* Step 9: Initialize Terraform */}
      <Section title="Step 9: Initialize and Deploy with Terraform">
        <p className="text-gray-700 mb-4">
          In your <code className="bg-gray-100 px-2 py-1 rounded">terraform</code> directory:
        </p>
        <CommandBlock command="terraform init" />
        <p className="text-gray-700 mt-4 mb-2">Validate the configuration:</p>
        <CommandBlock command="terraform validate" />
        <p className="text-gray-700 mt-4 mb-2">Review what will be created:</p>
        <CommandBlock command="terraform plan" />
        <p className="text-gray-700 mt-4 mb-2">Deploy the infrastructure:</p>
        <CommandBlock command="terraform apply" />
      </Section>

      {/* Step 10: Deploy Function Code */}
      <Section title="Step 10: Deploy Function Code to Azure">
        <p className="text-gray-700 mb-4">
          After Terraform creates the Azure resources, deploy your code using Azure CLI:
        </p>
        <CommandBlock command="az functionapp deployment source config-zip -g rg-my-simple-api-dev -n func-my-simple-api-dev --src function.zip" />

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">Before deployment, create a zip file:</p>
              <p className="text-sm text-blue-800 font-mono bg-white p-2 rounded">
                zip -r ../function.zip . -x "terraform/*" "node_modules/*" ".git/*"
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 11: Test Deployed Function */}
      <Section title="Step 11: Test Your Deployed Function">
        <p className="text-gray-700 mb-4">
          Get the function URL from Terraform outputs:
        </p>
        <CommandBlock command="terraform output function_app_url" />
        <p className="text-gray-700 mt-4">Test the health check endpoint:</p>
        <CommandBlock command="curl https://func-my-simple-api-dev.azurewebsites.net/api/healthcheck" />
      </Section>

      {/* Directory Structure Summary */}
      <Section title="Complete Directory Structure">
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div className="space-y-1">
            <div>my-simple-function/</div>
            <div>├── package.json</div>
            <div>├── index.js</div>
            <div>├── host.json</div>
            <div>├── local.settings.json</div>
            <div>├── terraform/</div>
            <div>│   ├── provider.tf</div>
            <div>│   ├── variables.tf</div>
            <div>│   ├── main.tf</div>
            <div>│   ├── outputs.tf</div>
            <div>│   ├── terraform.tfvars</div>
            <div>│   ├── .terraform/          (auto-created)</div>
            <div>│   └── .terraform.lock.hcl  (auto-created)</div>
            <div>└── node_modules/            (auto-created)</div>
          </div>
        </div>
      </Section>

      {/* Quick Reference */}
      <Section title="Quick Reference: All Commands">
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          <div>
            <p className="font-semibold text-gray-900 mb-1">1. Local Development</p>
            <CommandBlock command="npm start" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">2. Test Local</p>
            <CommandBlock command="curl http://localhost:7071/api/healthcheck" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">3. Deploy Infrastructure</p>
            <CommandBlock command="cd terraform && terraform apply" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">4. Create Deployment Package</p>
            <CommandBlock command="zip -r ../function.zip . -x 'terraform/*' 'node_modules/*' '.git/*'" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">5. Deploy Code (replace names with yours)</p>
            <CommandBlock command="az functionapp deployment source config-zip -g rg-my-simple-api-dev -n func-my-simple-api-dev --src function.zip" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">6. Test Live</p>
            <CommandBlock command="curl https://func-my-simple-api-dev.azurewebsites.net/api/healthcheck" />
          </div>
        </div>
      </Section>

      {/* Tips */}
      <Section title="Tips & Troubleshooting">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Use Azure CLI to get resource names</p>
              <p className="text-sm text-green-800 font-mono mt-1">az resource list --resource-group rg-my-simple-api-dev</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Storage Account Naming Rules</p>
              <p className="text-sm text-yellow-800">3-24 characters, lowercase letters and numbers only. The random suffix ensures uniqueness.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">View Terraform State</p>
              <p className="text-sm text-blue-800 font-mono mt-1">terraform state list</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
