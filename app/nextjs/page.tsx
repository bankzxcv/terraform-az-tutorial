import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { DiagramBlock } from '../components/diagram-block';
import { AlertCircle, CheckCircle2, FolderTree, Zap } from 'lucide-react';
import Link from 'next/link';

export default function NextJsPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Deploy Next.js App to Azure</h1>
      <p className="text-lg text-gray-600 mb-8">
        Deploy a Next.js application to Azure App Service using Terraform. Simple, fast deployment
        with no containers or databases required - perfect for static and server-rendered sites.
      </p>

      <Section title="What We'll Build">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">Project Components:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Next.js 14+ application with App Router</li>
                <li>• Azure App Service (Linux, Node.js runtime)</li>
                <li>• Automated build and deployment</li>
                <li>• Application Insights for monitoring</li>
                <li>• Custom domain support (optional)</li>
              </ul>
            </div>
          </div>
        </div>
        <DiagramBlock
          title="Next.js on Azure Architecture"
          direction="vertical"
          nodes={[
            { id: 'rg', label: 'Resource Group', color: 'blue' },
            { id: 'asp', label: 'App Service Plan', sublabel: 'Linux B1', color: 'green' },
            { id: 'webapp', label: 'Web App', sublabel: 'Next.js App', color: 'purple' },
            { id: 'ai', label: 'Application Insights', sublabel: 'Monitoring', color: 'pink' },
          ]}
          connections={[
            { from: 'rg', to: 'asp' },
            { from: 'rg', to: 'webapp' },
            { from: 'rg', to: 'ai' },
            { from: 'asp', to: 'webapp' },
          ]}
        />
      </Section>

      <Section title="Project Structure">
        <CommandBlock command="mkdir terraform-nextjs-deploy && cd terraform-nextjs-deploy" />
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="flex items-start gap-2 mb-2">
            <FolderTree className="w-4 h-4 mt-1" />
            <span className="text-blue-400">terraform-nextjs-deploy/</span>
          </div>
          <div className="ml-6 space-y-1">
            <div>├── terraform/</div>
            <div>│   ├── provider.tf</div>
            <div>│   ├── variables.tf</div>
            <div>│   ├── main.tf</div>
            <div>│   └── outputs.tf</div>
            <div>├── nextjs-app/</div>
            <div>│   ├── app/</div>
            <div>│   │   ├── page.tsx</div>
            <div>│   │   └── layout.tsx</div>
            <div>│   ├── public/</div>
            <div>│   ├── package.json</div>
            <div>│   ├── next.config.js</div>
            <div>│   └── .deployment</div>
            <div>└── deploy.sh</div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Terraform Infrastructure">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Provider Configuration</h3>
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
  default     = "nextjsapp"
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

variable "sku_name" {
  description = "App Service Plan SKU"
  type        = string
  default     = "B1"  # Basic tier
}

variable "node_version" {
  description = "Node.js version"
  type        = string
  default     = "18-lts"
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    ManagedBy = "Terraform"
    Framework = "Next.js"
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

# App Service Plan
resource "azurerm_service_plan" "main" {
  name                = "asp-\${var.project_name}-\${var.environment}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  os_type             = "Linux"
  sku_name            = var.sku_name

  tags = var.tags
}

# Linux Web App
resource "azurerm_linux_web_app" "main" {
  name                = "app-\${var.project_name}-\${var.environment}-\${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true

    application_stack {
      node_version = var.node_version
    }

    # Startup command for Next.js
    app_command_line = "npm run start"

    cors {
      allowed_origins = ["*"]
    }
  }

  app_settings = {
    "WEBSITE_NODE_DEFAULT_VERSION" = "~18"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
    "ENABLE_ORYX_BUILD" = "true"

    # Next.js specific
    "NODE_ENV" = "production"

    # Application Insights
    "APPINSIGHTS_INSTRUMENTATIONKEY"        = azurerm_application_insights.main.instrumentation_key
    "APPLICATIONINSIGHTS_CONNECTION_STRING" = azurerm_application_insights.main.connection_string
  }

  logs {
    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }

    application_logs {
      file_system_level = "Information"
    }
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
          code={`output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "web_app_name" {
  description = "Web app name"
  value       = azurerm_linux_web_app.main.name
}

output "web_app_url" {
  description = "Web app URL"
  value       = "https://\${azurerm_linux_web_app.main.default_hostname}"
}

output "app_insights_key" {
  description = "Application Insights instrumentation key"
  value       = azurerm_application_insights.main.instrumentation_key
  sensitive   = true
}`}
        />
      </Section>

      <Section title="Step 2: Next.js Application">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">Create Next.js App</h3>
        <CommandBlock command="npx create-next-app@latest nextjs-app" />
        <p className="text-sm text-gray-600 mt-2 mb-4">
          Choose: TypeScript (Yes), ESLint (Yes), Tailwind CSS (Yes), App Router (Yes)
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Package.json Configuration</h3>
        <CodeBlock
          language="json"
          filename="nextjs-app/package.json"
          code={`{
  "name": "nextjs-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start -p 8080",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "tailwindcss": "^3.3.0",
    "eslint": "^8",
    "eslint-config-next": "14.0.0"
  }
}`}
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Important:</p>
              <p className="text-sm text-yellow-800">
                The start script uses port 8080 (Azure's default). Make sure your start command is configured correctly.
              </p>
            </div>
          </div>
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Next.js Configuration</h3>
        <CodeBlock
          language="javascript"
          filename="nextjs-app/next.config.js"
          code={`/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',  // Optimized for deployment

  // Enable production optimizations
  compress: true,

  // Image optimization
  images: {
    domains: [],
    unoptimized: false,
  },
}

module.exports = nextConfig`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Deployment Configuration</h3>
        <CodeBlock
          language="text"
          filename="nextjs-app/.deployment"
          code={`[config]
SCM_DO_BUILD_DURING_DEPLOYMENT=true`}
        />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Sample Page</h3>
        <CodeBlock
          language="typescript"
          filename="nextjs-app/app/page.tsx"
          code={`export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-5xl w-full">
        <h1 className="text-6xl font-bold text-center mb-8">
          Next.js on Azure
        </h1>

        <p className="text-xl text-center text-gray-600 mb-12">
          Deployed with Terraform - No containers, no complexity!
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">🚀 Fast Deploy</h2>
            <p className="text-gray-600">
              Deploy in minutes with a single command. No Docker required.
            </p>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">⚡ Auto-Scale</h2>
            <p className="text-gray-600">
              Azure App Service scales automatically based on demand.
            </p>
          </div>

          <div className="p-6 border border-gray-200 rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">📊 Monitoring</h2>
            <p className="text-gray-600">
              Application Insights tracks performance and errors.
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold mb-3">Environment Info</h3>
          <code className="text-sm">
            <div>Node Version: {process.version}</div>
            <div>Environment: {process.env.NODE_ENV}</div>
            <div>Platform: {process.platform}</div>
          </code>
        </div>
      </div>
    </main>
  );
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
BLUE='\\033[0;34m'
NC='\\033[0m'

print_status() { echo -e "\${GREEN}[✓]\${NC} $1"; }
print_error() { echo -e "\${RED}[✗]\${NC} $1"; }
print_warning() { echo -e "\${YELLOW}[!]\${NC} $1"; }
print_info() { echo -e "\${BLUE}[i]\${NC} $1"; }

check_requirements() {
  print_info "Checking requirements..."

  command -v az >/dev/null 2>&1 || { print_error "Azure CLI required"; exit 1; }
  command -v terraform >/dev/null 2>&1 || { print_error "Terraform required"; exit 1; }
  command -v npm >/dev/null 2>&1 || { print_error "npm required"; exit 1; }

  print_status "All requirements met"
}

check_azure_login() {
  print_info "Checking Azure login..."
  if ! az account show &> /dev/null; then
    print_error "Not logged into Azure. Run: az login"
    exit 1
  fi
  print_status "Azure login verified"
}

deploy_infrastructure() {
  print_info "Deploying infrastructure..."
  cd terraform

  terraform init
  terraform plan -out=tfplan
  terraform apply tfplan

  WEB_APP_NAME=$(terraform output -raw web_app_name)
  WEB_APP_URL=$(terraform output -raw web_app_url)
  RESOURCE_GROUP=$(terraform output -raw resource_group_name)

  cd ..

  print_status "Infrastructure deployed"
  echo ""
  echo "📋 Deployment Info:"
  echo "   Web App: \$WEB_APP_NAME"
  echo "   URL: \$WEB_APP_URL"
  echo "   Resource Group: \$RESOURCE_GROUP"
  echo ""
}

build_app() {
  print_info "Building Next.js app..."
  cd nextjs-app

  npm install
  npm run build

  cd ..
  print_status "App built successfully"
}

deploy_app() {
  print_info "Deploying Next.js app to Azure..."

  cd terraform
  WEB_APP_NAME=$(terraform output -raw web_app_name)
  RESOURCE_GROUP=$(terraform output -raw resource_group_name)
  cd ..

  # Create deployment package
  cd nextjs-app

  # Deploy using ZIP deploy
  print_info "Creating deployment package..."
  zip -r ../deploy.zip . -x "node_modules/*" -x ".next/cache/*" -x ".git/*"

  cd ..

  print_info "Uploading to Azure..."
  az webapp deployment source config-zip \\
    --resource-group "\$RESOURCE_GROUP" \\
    --name "\$WEB_APP_NAME" \\
    --src deploy.zip

  rm deploy.zip

  print_status "App deployed successfully"
}

restart_app() {
  print_info "Restarting web app..."

  cd terraform
  WEB_APP_NAME=$(terraform output -raw web_app_name)
  RESOURCE_GROUP=$(terraform output -raw resource_group_name)
  cd ..

  az webapp restart \\
    --name "\$WEB_APP_NAME" \\
    --resource-group "\$RESOURCE_GROUP"

  print_status "App restarted"
}

test_app() {
  print_info "Testing deployment..."
  cd terraform
  WEB_APP_URL=$(terraform output -raw web_app_url)
  cd ..

  print_info "Waiting for app to start (30s)..."
  sleep 30

  print_info "Testing homepage..."
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "\$WEB_APP_URL")

  if [ "\$HTTP_CODE" = "200" ]; then
    print_status "App is live!"
    echo ""
    echo "🌐 Your Next.js app is running at:"
    echo "   \$WEB_APP_URL"
    echo ""
  else
    print_warning "App returned HTTP \$HTTP_CODE"
    echo "Check logs with: az webapp log tail --name <app-name> --resource-group <rg-name>"
  fi
}

destroy() {
  print_warning "This will destroy ALL resources!"
  read -p "Are you sure? (yes/no): " confirm

  if [ "\$confirm" = "yes" ]; then
    print_info "Destroying infrastructure..."
    cd terraform
    terraform destroy -auto-approve
    cd ..
    print_status "Infrastructure destroyed"
  else
    print_info "Destruction cancelled"
  fi
}

case "$1" in
  deploy)
    check_requirements
    check_azure_login
    deploy_infrastructure
    build_app
    deploy_app
    restart_app
    test_app
    ;;
  app)
    check_requirements
    check_azure_login
    build_app
    deploy_app
    restart_app
    ;;
  destroy)
    check_azure_login
    destroy
    ;;
  *)
    echo "Usage: $0 {deploy|app|destroy}"
    echo ""
    echo "Commands:"
    echo "  deploy  - Deploy infrastructure and app"
    echo "  app     - Build and deploy app only"
    echo "  destroy - Destroy all resources"
    exit 1
    ;;
esac`}
        />
        <CommandBlock command="chmod +x deploy.sh" />
      </Section>

      <Section title="Step 4: Deploy to Azure">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">1. Login to Azure</h4>
            <CommandBlock command="az login" />
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">2. Deploy Everything</h4>
            <CommandBlock command="./deploy.sh deploy" />
            <p className="text-sm text-gray-600 mt-2">
              Creates infrastructure, builds app, and deploys. Takes about 3-5 minutes.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">3. Update App Only</h4>
            <CommandBlock command="./deploy.sh app" />
            <p className="text-sm text-gray-600 mt-2">
              After making code changes, redeploy just the app (faster).
            </p>
          </div>
        </div>
      </Section>

      <Section title="Monitoring & Debugging">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">View Live Logs</h4>
              <CommandBlock command="az webapp log tail --name <app-name> --resource-group <rg-name>" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">Application Insights</h4>
              <p className="text-sm text-gray-700">
                Go to Azure Portal → Application Insights → View metrics, traces, and exceptions
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">SSH into App Service</h4>
              <CommandBlock command="az webapp ssh --name <app-name> --resource-group <rg-name>" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Advanced Configuration">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
            <h4 className="font-semibold text-purple-900 mb-2">Custom Domain</h4>
            <p className="text-sm text-purple-800 mb-2">Add your own domain:</p>
            <CommandBlock command="az webapp config hostname add --webapp-name <app-name> --resource-group <rg-name> --hostname <your-domain.com>" />
          </div>

          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
            <h4 className="font-semibold text-green-900 mb-2">SSL Certificate</h4>
            <p className="text-sm text-green-800">
              Azure provides free SSL certificates for custom domains. Enable in Portal → TLS/SSL settings.
            </p>
          </div>

          <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
            <h4 className="font-semibold text-orange-900 mb-2">Auto-Scaling</h4>
            <p className="text-sm text-orange-800">
              Configure auto-scaling rules in Portal → Scale out (App Service plan) based on CPU or memory.
            </p>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <h4 className="font-semibold text-blue-900 mb-2">Environment Variables</h4>
            <p className="text-sm text-blue-800 mb-2">Add via Terraform:</p>
            <code className="text-xs">app_settings = {"{"} API_KEY = "value" {"}"}</code>
          </div>
        </div>
      </Section>

      <Section title="Cost Optimization">
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-2">Estimated Monthly Costs:</p>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• App Service Plan (B1): ~$13/month</li>
                <li>• Application Insights: Free tier (5GB/month)</li>
                <li>• <strong>Total: ~$13/month</strong></li>
              </ul>
              <p className="text-sm text-yellow-800 mt-3">
                <strong>Tip:</strong> Use Free tier (F1) for testing - 60 minutes/day of compute time at $0/month!
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="CI/CD with GitHub Actions">
        <p className="mb-4">
          For automatic deployments on git push, create this GitHub Actions workflow:
        </p>
        <CodeBlock
          language="yaml"
          filename=".github/workflows/deploy.yml"
          code={`name: Deploy to Azure

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'

    - name: Install dependencies
      run: npm install
      working-directory: ./nextjs-app

    - name: Build Next.js app
      run: npm run build
      working-directory: ./nextjs-app

    - name: Deploy to Azure Web App
      uses: azure/webapps-deploy@v2
      with:
        app-name: \${{ secrets.AZURE_WEBAPP_NAME }}
        publish-profile: \${{ secrets.AZURE_WEBAPP_PUBLISH_PROFILE }}
        package: ./nextjs-app`}
        />
      </Section>

      <Section title="Clean Up">
        <CommandBlock command="./deploy.sh destroy" />
        <p className="mt-4 text-gray-700">
          Removes all Azure resources to stop billing.
        </p>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/api" className="text-blue-600 hover:underline">
          ← Back: Express.js API
        </Link>
        <Link href="/" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
