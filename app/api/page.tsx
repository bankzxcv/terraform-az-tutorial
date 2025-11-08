import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { DiagramBlock } from '../components/diagram-block';
import { AlertCircle, CheckCircle2, FolderTree } from 'lucide-react';
import Link from 'next/link';

export default function ApiPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Express.js API on Azure Functions</h1>
      <p className="text-lg text-gray-600 mb-8">
        Deploy a simple serverless Express.js REST API using Azure Functions.
        No containers, no databases - pure serverless compute with automatic scaling.
      </p>

      <Section title="What We'll Build">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">Project Components:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Express.js REST API running on Azure Functions</li>
                <li>• Serverless compute with consumption-based pricing</li>
                <li>• Health check endpoint for monitoring</li>
                <li>• Application Insights for telemetry</li>
                <li>• One-command deployment</li>
              </ul>
            </div>
          </div>
        </div>
        <DiagramBlock
          title="Serverless API Architecture"
          direction="vertical"
          nodes={[
            { id: 'rg', label: 'Resource Group', color: 'blue' },
            { id: 'storage', label: 'Storage Account', sublabel: 'For Functions', color: 'orange' },
            { id: 'func', label: 'Function App', sublabel: 'Express.js API', color: 'green' },
            { id: 'ai', label: 'Application Insights', sublabel: 'Monitoring', color: 'pink' },
          ]}
          connections={[
            { from: 'rg', to: 'storage' },
            { from: 'rg', to: 'func' },
            { from: 'rg', to: 'ai' },
            { from: 'storage', to: 'func' },
          ]}
        />
      </Section>

      <Section title="Project Structure">
        <CommandBlock command="mkdir terraform-express-functions && cd terraform-express-functions" />
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="flex items-start gap-2 mb-2">
            <FolderTree className="w-4 h-4 mt-1" />
            <span className="text-blue-400">terraform-express-functions/</span>
          </div>
          <div className="ml-6 space-y-1">
            <div>├── terraform/</div>
            <div>│   ├── provider.tf</div>
            <div>│   ├── variables.tf</div>
            <div>│   ├── main.tf</div>
            <div>│   └── outputs.tf</div>
            <div>├── api/</div>
            <div>│   ├── index.js</div>
            <div>│   ├── package.json</div>
            <div>│   └── host.json</div>
            <div>└── deploy.sh</div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Terraform Configuration">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Provider Setup</h3>
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

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Variables</h3>
        <CodeBlock
          language="hcl"
          filename="terraform/variables.tf"
          code={`variable "project_name" {
  description = "Project name"
  type        = string
  default     = "expressapi"
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
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Project   = "ExpressAPI"
  }
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Main Infrastructure</h3>
        <CodeBlock
          language="hcl"
          filename="terraform/main.tf"
          code={`resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_resource_group" "main" {
  name     = "rg-\${var.project_name}-\${var.environment}"
  location = var.location
  tags     = var.tags
}

# Storage Account for Functions
resource "azurerm_storage_account" "functions" {
  name                     = "st\${var.project_name}\${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = var.tags
}

# App Service Plan (Consumption)
resource "azurerm_service_plan" "main" {
  name                = "asp-\${var.project_name}-\${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan (serverless)

  tags = var.tags
}

# Function App
resource "azurerm_linux_function_app" "api" {
  name                = "func-\${var.project_name}-\${var.environment}-\${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location

  service_plan_id            = azurerm_service_plan.main.id
  storage_account_name       = azurerm_storage_account.functions.name
  storage_account_access_key = azurerm_storage_account.functions.primary_access_key

  site_config {
    application_stack {
      node_version = "18"
    }

    cors {
      allowed_origins = ["*"]
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME"     = "node"
    "WEBSITE_NODE_DEFAULT_VERSION" = "~18"
    "NODE_ENV"                     = var.environment

    # Application Insights
    "APPINSIGHTS_INSTRUMENTATIONKEY" = azurerm_application_insights.main.instrumentation_key
  }

  tags = var.tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "ai-\${var.project_name}-\${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  application_type    = "Node.JS"

  tags = var.tags
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Outputs</h3>
        <CodeBlock
          language="hcl"
          filename="terraform/outputs.tf"
          code={`output "function_app_name" {
  description = "Function App name"
  value       = azurerm_linux_function_app.api.name
}

output "function_app_url" {
  description = "Function App URL"
  value       = "https://\${azurerm_linux_function_app.api.default_hostname}"
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}`}
        />
      </Section>

      <Section title="Step 2: Express.js Application">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Package.json</h3>
        <CodeBlock
          language="json"
          filename="api/package.json"
          code={`{
  "name": "express-api-functions",
  "version": "1.0.0",
  "description": "Express.js API on Azure Functions",
  "scripts": {
    "start": "func start"
  },
  "dependencies": {
    "@azure/functions": "^4.0.0",
    "express": "^4.18.2"
  },
  "devDependencies": {
    "azure-functions-core-tools": "^4.0.5000"
  }
}`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Main Function (index.js)</h3>
        <CodeBlock
          language="javascript"
          filename="api/index.js"
          code={`const { app } = require('@azure/functions');
const express = require('express');

const expressApp = express();
expressApp.use(express.json());

// Root endpoint
expressApp.get('/', (req, res) => {
  res.json({
    name: 'Express API on Azure Functions',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/api/health',
      info: '/api/info'
    }
  });
});

// Health check endpoint
expressApp.get('/api/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
    }
  };

  res.status(200).json(health);
});

// System info endpoint
expressApp.get('/api/info', (req, res) => {
  res.json({
    platform: process.platform,
    nodeVersion: process.version,
    architecture: process.arch,
    pid: process.pid,
    cpuUsage: process.cpuUsage(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Echo endpoint (for testing)
expressApp.post('/api/echo', (req, res) => {
  res.json({
    message: 'Echo response',
    receivedBody: req.body,
    receivedAt: new Date().toISOString()
  });
});

// Azure Functions HTTP trigger
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: '{*segments}',
  handler: async (request, context) => {
    // Convert Azure Functions request to Express-compatible request
    return new Promise((resolve) => {
      const url = '/' + (request.params.segments || '');
      const method = request.method;

      // Parse request body
      let body = {};
      if (request.body) {
        try {
          body = typeof request.body === 'string'
            ? JSON.parse(request.body)
            : request.body;
        } catch (e) {
          body = {};
        }
      }

      const req = {
        method,
        url,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        query: Object.fromEntries(request.query.entries())
      };

      const res = {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: '',
        status: function(code) {
          this.statusCode = code;
          return this;
        },
        json: function(data) {
          this.body = JSON.stringify(data);
          resolve({
            status: this.statusCode,
            headers: this.headers,
            body: this.body
          });
        },
        send: function(data) {
          this.body = typeof data === 'string' ? data : JSON.stringify(data);
          resolve({
            status: this.statusCode,
            headers: this.headers,
            body: this.body
          });
        }
      };

      // Route to Express
      expressApp(req, res, () => {
        resolve({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Not found', path: url })
        });
      });
    });
  }
});`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Function Configuration</h3>
        <CodeBlock
          language="json"
          filename="api/host.json"
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
  }
}`}
        />
      </Section>

      <Section title="Step 3: Deployment Script">
        <CodeBlock
          language="bash"
          filename="deploy.sh"
          code={`#!/bin/bash

set -e

GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
RED='\\033[0;31m'
NC='\\033[0m'

print_status() { echo -e "\${GREEN}[✓]\${NC} $1"; }
print_error() { echo -e "\${RED}[✗]\${NC} $1"; }
print_warning() { echo -e "\${YELLOW}[!]\${NC} $1"; }

check_requirements() {
  print_status "Checking requirements..."

  command -v az >/dev/null 2>&1 || { print_error "Azure CLI required"; exit 1; }
  command -v terraform >/dev/null 2>&1 || { print_error "Terraform required"; exit 1; }
  command -v func >/dev/null 2>&1 || { print_error "Azure Functions Core Tools required"; exit 1; }

  print_status "All requirements met"
}

deploy_infrastructure() {
  print_status "Deploying infrastructure..."
  cd terraform

  terraform init
  terraform plan -out=tfplan
  terraform apply tfplan

  FUNC_NAME=$(terraform output -raw function_app_name)
  FUNC_URL=$(terraform output -raw function_app_url)

  cd ..

  print_status "Infrastructure deployed"
  echo "Function App: \$FUNC_NAME"
  echo "URL: \$FUNC_URL"
}

deploy_function() {
  print_status "Deploying function code..."

  cd terraform
  FUNC_NAME=$(terraform output -raw function_app_name)
  cd ..

  cd api
  npm install
  func azure functionapp publish "\$FUNC_NAME" --javascript
  cd ..

  print_status "Function deployed"
}

test_api() {
  print_status "Testing API..."
  cd terraform
  FUNC_URL=$(terraform output -raw function_app_url)
  cd ..

  sleep 10

  echo ""
  echo "Testing endpoints:"
  echo ""

  echo "1. Root endpoint:"
  curl -s "\${FUNC_URL}/" | jq '.' || true

  echo ""
  echo "2. Health check:"
  curl -s "\${FUNC_URL}/api/health" | jq '.' || true

  echo ""
  echo "3. System info:"
  curl -s "\${FUNC_URL}/api/info" | jq '.' || true

  echo ""
  echo "✓ API is live at: \${FUNC_URL}"
  echo ""
}

destroy() {
  print_warning "Destroying all resources..."
  read -p "Are you sure? (yes/no): " confirm

  if [ "\$confirm" = "yes" ]; then
    cd terraform
    terraform destroy -auto-approve
    cd ..
    print_status "Resources destroyed"
  fi
}

case "$1" in
  deploy)
    check_requirements
    deploy_infrastructure
    deploy_function
    test_api
    ;;
  function)
    deploy_function
    ;;
  destroy)
    destroy
    ;;
  *)
    echo "Usage: $0 {deploy|function|destroy}"
    exit 1
    ;;
esac`}
        />
        <CommandBlock command="chmod +x deploy.sh" />
      </Section>

      <Section title="Step 4: Deploy">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Install Azure Functions Core Tools</h4>
            <CommandBlock command="npm install -g azure-functions-core-tools@4" />
            <p className="text-sm text-gray-600 mt-2">Or on macOS: brew install azure-functions-core-tools@4</p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Deploy Everything</h4>
            <CommandBlock command="./deploy.sh deploy" />
            <p className="text-sm text-gray-600 mt-2">
              Deploys infrastructure and function code. Takes about 3-5 minutes.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Update Function Code Only</h4>
            <CommandBlock command="./deploy.sh function" />
          </div>
        </div>
      </Section>

      <Section title="Testing the API">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Root Endpoint</h4>
              <CommandBlock command="curl https://your-function.azurewebsites.net/" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Health Check</h4>
              <CommandBlock command="curl https://your-function.azurewebsites.net/api/health" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">System Info</h4>
              <CommandBlock command="curl https://your-function.azurewebsites.net/api/info" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Echo Test (POST)</h4>
              <CommandBlock command='curl -X POST https://your-function.azurewebsites.net/api/echo -H "Content-Type: application/json" -d "{\"message\":\"Hello from Azure!\"}"' />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Local Development">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Run Locally</h4>
            <CommandBlock command="cd api && npm install && func start" />
            <p className="text-sm text-gray-600 mt-2">
              Access at http://localhost:7071
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Test Local Endpoints</h4>
            <CommandBlock command="curl http://localhost:7071/api/health" />
          </div>
        </div>
      </Section>

      <Section title="Monitoring">
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h4 className="font-semibold text-blue-900 mb-2">Application Insights</h4>
            <p className="text-sm text-blue-800 mb-2">
              Go to Azure Portal → Application Insights to view:
            </p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Live metrics and request rates</li>
              <li>• Failed requests and exceptions</li>
              <li>• Performance and response times</li>
              <li>• Custom telemetry data</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <h4 className="font-semibold text-green-900 mb-2">View Logs</h4>
            <CommandBlock command="func azure functionapp logstream <function-app-name>" />
          </div>
        </div>
      </Section>

      <Section title="Cost Optimization">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <p className="font-semibold text-yellow-900 mb-2">Estimated Monthly Costs:</p>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Azure Functions (Consumption): ~$0 (1M free executions/month)</li>
            <li>• Storage Account: ~$1/month</li>
            <li>• Application Insights: Free tier (5GB/month)</li>
            <li>• <strong>Total: ~$1/month (essentially free!)</strong></li>
          </ul>
          <p className="text-sm text-yellow-800 mt-3">
            Perfect for development, testing, and low-traffic production APIs.
          </p>
        </div>
      </Section>

      <Section title="Clean Up">
        <CommandBlock command="./deploy.sh destroy" />
        <p className="mt-4 text-gray-700">
          Removes all resources to stop billing.
        </p>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/modules" className="text-blue-600 hover:underline">
          ← Back: Terraform Modules
        </Link>
        <Link href="/nextjs" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Next: Deploy Next.js App →
        </Link>
      </div>
    </div>
  );
}
