import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SimpleFunctionPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Deploy Azure Function with Bun + TypeScript
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Simple deployment of an Azure Function with just a health check endpoint. Using Bun, TypeScript, and Terraform with environment variables.
      </p>

      {/* Step 1: Create Project */}
      <Section title="Step 1: Create Project">
        <CommandBlock command="mkdir my-function && cd my-function" />
      </Section>

      {/* Step 2: Initialize Bun */}
      <Section title="Step 2: Initialize Bun Project">
        <CommandBlock command="bun init -y" />
        <p className="text-gray-700 mt-4 mb-2">Install dependencies:</p>
        <CommandBlock command="bun add @azure/functions express" />
      </Section>

      {/* Step 3: Create TypeScript API */}
      <Section title="Step 3: Create index.ts (TypeScript API)">
        <CodeBlock
          language="typescript"
          filename="index.ts"
          code={`import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import express from 'express';

const expressApp = express();
expressApp.use(express.json());

// Health check endpoint
expressApp.get('/api/healthcheck', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.ENVIRONMENT || 'unknown'
  });
});

// Root endpoint
expressApp.get('/api', (req, res) => {
  res.status(200).json({
    message: 'Hello from Azure Functions',
    version: '1.0.0',
    environment: process.env.ENVIRONMENT || 'unknown'
  });
});

// Azure Functions handler
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: '{*segments}',
  handler: async (request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> => {
    return new Promise((resolve) => {
      const req = request as any;
      const res = {
        status: (code: number) => {
          return {
            json: (data: any) => {
              resolve({
                status: code,
                jsonBody: data,
                headers: { 'Content-Type': 'application/json' }
              });
            }
          };
        }
      };

      expressApp(req, res as any, () => {
        resolve({ status: 404, body: 'Not Found' });
      });
    });
  }
});`}
        />
      </Section>

      {/* Step 4: Create host.json */}
      <Section title="Step 4: Create host.json">
        <CodeBlock
          language="json"
          filename="host.json"
          code={`{
  "version": "2.0",
  "logging": {
    "applicationInsights": {
      "samplingSettings": {
        "isEnabled": true
      }
    }
  },
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}`}
        />
      </Section>

      {/* Step 5: Create local.settings.json */}
      <Section title="Step 5: Create local.settings.json">
        <CodeBlock
          language="json"
          filename="local.settings.json"
          code={`{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ENVIRONMENT": "local"
  }
}`}
        />
      </Section>

      {/* Step 6: Update package.json */}
      <Section title="Step 6: Update package.json Scripts">
        <CodeBlock
          language="json"
          filename="package.json"
          code={`{
  "name": "my-function",
  "type": "module",
  "scripts": {
    "build": "bun build index.ts --outdir dist --target node",
    "start": "func start",
    "deploy": "func azure functionapp publish YOUR_FUNCTION_NAME"
  },
  "dependencies": {
    "@azure/functions": "^4.9.0",
    "express": "^5.1.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "@types/express": "latest"
  }
}`}
        />
      </Section>

      {/* Step 7: Build TypeScript */}
      <Section title="Step 7: Build TypeScript to JavaScript">
        <p className="text-gray-700 mb-4">Build your TypeScript code to JavaScript:</p>
        <CommandBlock command="bun build index.ts --outdir dist --target node" />
        <p className="text-gray-700 mt-4">Copy the built file:</p>
        <CommandBlock command="cp dist/index.js index.js" />
      </Section>

      {/* Step 8: Test Locally */}
      <Section title="Step 8: Test Locally">
        <CommandBlock command="func start" />
        <p className="text-gray-700 mt-4">Test the health check:</p>
        <CommandBlock command="curl http://localhost:7071/api/healthcheck" />
      </Section>

      {/* Step 9: Create Terraform Directory */}
      <Section title="Step 9: Create Terraform Infrastructure">
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
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "app_name" {
  description = "Application name"
  type        = string
  default     = "myapi"
}`}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create main.tf (with Environment Variables)</h3>
          <CodeBlock
            language="hcl"
            filename="terraform/main.tf"
            code={`resource "azurerm_resource_group" "main" {
  name     = "rg-\${var.app_name}-\${var.environment}"
  location = var.location
}

resource "azurerm_storage_account" "main" {
  name                     = "\${var.app_name}\${var.environment}st"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "azurerm_service_plan" "main" {
  name                = "plan-\${var.app_name}-\${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"
}

resource "azurerm_linux_function_app" "main" {
  name                = "func-\${var.app_name}-\${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key

  site_config {
    application_stack {
      node_version = "20"
    }
    cors {
      allowed_origins = ["*"]
    }
  }

  # Environment variables
  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"     = "node"
    "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
    "ENVIRONMENT"                  = var.environment
    "APP_NAME"                     = var.app_name
    "CUSTOM_MESSAGE"               = "Hello from Terraform"
  }
}`}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create outputs.tf</h3>
          <CodeBlock
            language="hcl"
            filename="terraform/outputs.tf"
            code={`output "function_app_name" {
  description = "Function App name for deployment"
  value       = azurerm_linux_function_app.main.name
}

output "function_app_url" {
  description = "Function App URL"
  value       = "https://\${azurerm_linux_function_app.main.default_hostname}"
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}`}
          />
        </div>
      </Section>

      {/* Step 10: Deploy Infrastructure */}
      <Section title="Step 10: Deploy Infrastructure with Terraform">
        <p className="text-gray-700 mb-4">Initialize Terraform:</p>
        <CommandBlock command="terraform init" />

        <p className="text-gray-700 mt-4 mb-2">Plan the deployment:</p>
        <CommandBlock command="terraform plan" />

        <p className="text-gray-700 mt-4 mb-2">Apply the infrastructure:</p>
        <CommandBlock command="terraform apply" />

        <p className="text-gray-700 mt-4 mb-2">Get the function name:</p>
        <CommandBlock command="terraform output function_app_name" />

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Save the output!</p>
              <p className="text-sm text-blue-800">The function name will be something like: <code className="bg-white px-2 py-1 rounded">func-myapi-dev</code></p>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 11: Deploy Code */}
      <Section title="Step 11: Deploy Your Code to Azure">
        <p className="text-gray-700 mb-4">Go back to your project root:</p>
        <CommandBlock command="cd .." />

        <p className="text-gray-700 mt-4 mb-2">Deploy using Azure Functions Core Tools:</p>
        <CommandBlock command="func azure functionapp publish func-myapi-dev" />

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Replace the function name</p>
              <p className="text-sm text-yellow-800">Use the actual name from <code className="bg-white px-2 py-1 rounded">terraform output function_app_name</code></p>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 12: Test Deployment */}
      <Section title="Step 12: Test Your Deployed Function">
        <p className="text-gray-700 mb-4">Get your function URL:</p>
        <CommandBlock command="cd terraform && terraform output function_app_url" />

        <p className="text-gray-700 mt-4 mb-2">Test the health check endpoint:</p>
        <CommandBlock command="curl https://func-myapi-dev.azurewebsites.net/api/healthcheck" />

        <p className="text-gray-700 mt-4">Expected response:</p>
        <CodeBlock
          language="json"
          code={`{
  "status": "healthy",
  "timestamp": "2025-11-08T10:30:45.123Z",
  "uptime": 45.678,
  "environment": "dev"
}`}
        />
      </Section>

      {/* Step 13: Update Environment Variables */}
      <Section title="Step 13: Update Environment Variables">
        <p className="text-gray-700 mb-4">
          To change environment variables, edit <code className="bg-gray-100 px-2 py-1 rounded">terraform/main.tf</code> app_settings block:
        </p>
        <CodeBlock
          language="hcl"
          code={`app_settings = {
  "FUNCTIONS_WORKER_RUNTIME"     = "node"
  "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
  "ENVIRONMENT"                  = var.environment
  "APP_NAME"                     = var.app_name
  "CUSTOM_MESSAGE"               = "Updated message"
  "API_KEY"                      = "your-secret-key"
}`}
        />

        <p className="text-gray-700 mt-4 mb-2">Then apply the changes:</p>
        <CommandBlock command="cd terraform && terraform apply" />
      </Section>

      {/* Complete Command Flow */}
      <Section title="Complete Command Flow">
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div>
            <p className="font-semibold text-gray-900 mb-2">1. Create and setup project</p>
            <div className="space-y-1">
              <CommandBlock command="mkdir my-function && cd my-function" />
              <CommandBlock command="bun init -y" />
              <CommandBlock command="bun add @azure/functions express" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">2. Create files (index.ts, host.json, local.settings.json)</p>
            <p className="text-sm text-gray-600">Copy the code from steps above</p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">3. Build TypeScript</p>
            <div className="space-y-1">
              <CommandBlock command="bun build index.ts --outdir dist --target node" />
              <CommandBlock command="cp dist/index.js index.js" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">4. Test locally</p>
            <CommandBlock command="func start" />
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">5. Create Terraform files</p>
            <div className="space-y-1">
              <CommandBlock command="mkdir terraform && cd terraform" />
              <p className="text-sm text-gray-600">Create provider.tf, variables.tf, main.tf, outputs.tf</p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">6. Deploy infrastructure</p>
            <div className="space-y-1">
              <CommandBlock command="terraform init" />
              <CommandBlock command="terraform apply" />
              <CommandBlock command="terraform output function_app_name" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">7. Deploy code</p>
            <div className="space-y-1">
              <CommandBlock command="cd .." />
              <CommandBlock command="func azure functionapp publish func-myapi-dev" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">8. Test deployment</p>
            <CommandBlock command="curl https://func-myapi-dev.azurewebsites.net/api/healthcheck" />
          </div>
        </div>
      </Section>

      {/* Project Structure */}
      <Section title="Final Project Structure">
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div className="space-y-1">
            <div>my-function/</div>
            <div>├── index.ts</div>
            <div>├── index.js          (built file)</div>
            <div>├── host.json</div>
            <div>├── local.settings.json</div>
            <div>├── package.json</div>
            <div>├── bun.lockb</div>
            <div>├── dist/</div>
            <div>│   └── index.js</div>
            <div>├── node_modules/</div>
            <div>└── terraform/</div>
            <div>    ├── provider.tf</div>
            <div>    ├── variables.tf</div>
            <div>    ├── main.tf</div>
            <div>    ├── outputs.tf</div>
            <div>    ├── .terraform/</div>
            <div>    ├── .terraform.lock.hcl</div>
            <div>    └── terraform.tfstate</div>
          </div>
        </div>
      </Section>

      {/* Tips */}
      <Section title="Tips">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Always build before deploying</p>
              <p className="text-sm text-green-800">Run <code className="bg-white px-2 py-1 rounded">bun build</code> every time you change TypeScript code</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Environment variables are set in Terraform</p>
              <p className="text-sm text-blue-800">Use the <code className="bg-white px-2 py-1 rounded">app_settings</code> block in main.tf to add environment variables</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Storage account names must be unique</p>
              <p className="text-sm text-yellow-800">If deployment fails, try changing the <code className="bg-white px-2 py-1 rounded">app_name</code> variable</p>
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
