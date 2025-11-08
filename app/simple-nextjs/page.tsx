import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function SimpleNextjsPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">
        Deploy Next.js to Azure App Service
      </h1>
      <p className="text-lg text-gray-600 mb-8">
        Simple deployment of a Next.js application to Azure App Service. No containers, no databases - just a working Next.js app with environment variables.
      </p>

      {/* Step 1: Create Next.js App */}
      <Section title="Step 1: Create Next.js Application">
        <CommandBlock command="npx create-next-app@latest my-nextjs-app" />
        <p className="text-gray-700 mt-4">When prompted, select:</p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
          <li>TypeScript: Yes</li>
          <li>ESLint: Yes</li>
          <li>Tailwind CSS: Yes (optional)</li>
          <li>App Router: Yes</li>
          <li>Turbopack: No</li>
          <li>Import alias: No</li>
        </ul>
        <p className="text-gray-700 mt-4">Navigate to project:</p>
        <CommandBlock command="cd my-nextjs-app" />
      </Section>

      {/* Step 2: Create a Simple Page */}
      <Section title="Step 2: Create a Simple API Route">
        <p className="text-gray-700 mb-4">
          Create a health check API route to verify deployment:
        </p>
        <CodeBlock
          language="typescript"
          filename="app/api/health/route.ts"
          code={`export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.ENVIRONMENT || 'unknown',
    nodeVersion: process.version
  });
}`}
        />
      </Section>

      {/* Step 3: Update Environment Variables */}
      <Section title="Step 3: Create Environment Variable File">
        <p className="text-gray-700 mb-4">
          Create <code className="bg-gray-100 px-2 py-1 rounded">.env.local</code> for local development:
        </p>
        <CodeBlock
          language="bash"
          filename=".env.local"
          code={`ENVIRONMENT=local
NEXT_PUBLIC_APP_NAME=My Next.js App`}
        />
      </Section>

      {/* Step 4: Test Locally */}
      <Section title="Step 4: Test Locally">
        <CommandBlock command="npm run dev" />
        <p className="text-gray-700 mt-4">Visit:</p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
          <li><code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000</code> - Main page</li>
          <li><code className="bg-gray-100 px-2 py-1 rounded">http://localhost:3000/api/health</code> - Health check</li>
        </ul>
      </Section>

      {/* Step 5: Build the Application */}
      <Section title="Step 5: Build the Application">
        <p className="text-gray-700 mb-4">Build your Next.js app for production:</p>
        <CommandBlock command="npm run build" />
        <p className="text-gray-700 mt-4">Test the production build locally:</p>
        <CommandBlock command="npm start" />
      </Section>

      {/* Step 6: Create Terraform Files */}
      <Section title="Step 6: Create Terraform Configuration">
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
  default     = "mynextapp"
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

resource "azurerm_service_plan" "main" {
  name                = "plan-\${var.app_name}-\${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "B1"  # Basic tier for production
}

resource "azurerm_linux_web_app" "main" {
  name                = "app-\${var.app_name}-\${var.environment}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    # Next.js specific settings
    "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"

    # Custom environment variables
    "ENVIRONMENT" = var.environment
    "NEXT_PUBLIC_APP_NAME" = var.app_name
    "NODE_ENV" = "production"
  }

  # Enable logging
  logs {
    detailed_error_messages = true
    failed_request_tracing  = true

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }
}`}
          />
        </div>

        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Create outputs.tf</h3>
          <CodeBlock
            language="hcl"
            filename="terraform/outputs.tf"
            code={`output "app_service_name" {
  description = "App Service name for deployment"
  value       = azurerm_linux_web_app.main.name
}

output "app_service_url" {
  description = "App Service URL"
  value       = "https://\${azurerm_linux_web_app.main.default_hostname}"
}

output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}`}
          />
        </div>
      </Section>

      {/* Step 7: Deploy Infrastructure */}
      <Section title="Step 7: Deploy Infrastructure with Terraform">
        <p className="text-gray-700 mb-4">Initialize Terraform:</p>
        <CommandBlock command="terraform init" />

        <p className="text-gray-700 mt-4 mb-2">Plan the deployment:</p>
        <CommandBlock command="terraform plan" />

        <p className="text-gray-700 mt-4 mb-2">Apply the infrastructure:</p>
        <CommandBlock command="terraform apply" />

        <p className="text-gray-700 mt-4 mb-2">Get the app service name:</p>
        <CommandBlock command="terraform output app_service_name" />

        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">Save the output!</p>
              <p className="text-sm text-blue-800">The app name will be something like: <code className="bg-white px-2 py-1 rounded">app-mynextapp-dev</code></p>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 8: Create Deployment Package */}
      <Section title="Step 8: Create Deployment Package">
        <p className="text-gray-700 mb-4">Go back to your project root:</p>
        <CommandBlock command="cd .." />

        <p className="text-gray-700 mt-4 mb-2">Create a zip file with your application:</p>
        <CommandBlock command="zip -r deploy.zip . -x '*.git*' 'node_modules/*' '.next/cache/*' 'terraform/*'" />

        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">Note about node_modules</p>
              <p className="text-sm text-yellow-800">Azure will run <code className="bg-white px-2 py-1 rounded">npm install</code> automatically during deployment because we set <code className="bg-white px-2 py-1 rounded">SCM_DO_BUILD_DURING_DEPLOYMENT</code> to true</p>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 9: Deploy to Azure */}
      <Section title="Step 9: Deploy to Azure App Service">
        <p className="text-gray-700 mb-4">Deploy using Azure CLI:</p>
        <CommandBlock command="az webapp deploy --resource-group rg-mynextapp-dev --name app-mynextapp-dev --src-path deploy.zip --type zip" />

        <div className="bg-green-50 border-l-4 border-green-500 p-4 mt-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Alternative: Deploy from local git</p>
              <div className="text-sm text-green-800 space-y-2 mt-2">
                <CommandBlock command="az webapp deployment source config-local-git --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />
                <CommandBlock command="git remote add azure <deployment-url-from-previous-command>" />
                <CommandBlock command="git push azure main" />
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* Step 10: Monitor Deployment */}
      <Section title="Step 10: Monitor Deployment">
        <p className="text-gray-700 mb-4">Check deployment logs:</p>
        <CommandBlock command="az webapp log tail --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />

        <p className="text-gray-700 mt-4">The deployment process will:</p>
        <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
          <li>Extract your zip file</li>
          <li>Run <code className="bg-gray-100 px-2 py-1 rounded">npm install</code></li>
          <li>Run <code className="bg-gray-100 px-2 py-1 rounded">npm run build</code></li>
          <li>Start the application with <code className="bg-gray-100 px-2 py-1 rounded">npm start</code></li>
        </ul>
      </Section>

      {/* Step 11: Test Deployment */}
      <Section title="Step 11: Test Your Deployed Application">
        <p className="text-gray-700 mb-4">Get your app URL:</p>
        <CommandBlock command="cd terraform && terraform output app_service_url" />

        <p className="text-gray-700 mt-4">Test the application:</p>
        <CommandBlock command="curl https://app-mynextapp-dev.azurewebsites.net/api/health" />

        <p className="text-gray-700 mt-4">Expected response:</p>
        <CodeBlock
          language="json"
          code={`{
  "status": "healthy",
  "timestamp": "2025-11-08T10:30:45.123Z",
  "environment": "dev",
  "nodeVersion": "v20.10.0"
}`}
        />

        <p className="text-gray-700 mt-4">Visit in browser:</p>
        <CommandBlock command="open https://app-mynextapp-dev.azurewebsites.net" />
      </Section>

      {/* Step 12: Update Application */}
      <Section title="Step 12: Update Your Application">
        <p className="text-gray-700 mb-4">To update your application:</p>

        <div className="space-y-3">
          <div>
            <p className="font-semibold text-gray-900 mb-2">1. Make changes to your code</p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">2. Test locally</p>
            <CommandBlock command="npm run dev" />
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">3. Build and verify</p>
            <CommandBlock command="npm run build && npm start" />
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">4. Create new deployment package</p>
            <CommandBlock command="zip -r deploy.zip . -x '*.git*' 'node_modules/*' '.next/cache/*' 'terraform/*'" />
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">5. Deploy to Azure</p>
            <CommandBlock command="az webapp deploy --resource-group rg-mynextapp-dev --name app-mynextapp-dev --src-path deploy.zip --type zip" />
          </div>
        </div>
      </Section>

      {/* Step 13: Update Environment Variables */}
      <Section title="Step 13: Update Environment Variables">
        <p className="text-gray-700 mb-4">
          To add or change environment variables, edit <code className="bg-gray-100 px-2 py-1 rounded">terraform/main.tf</code>:
        </p>
        <CodeBlock
          language="hcl"
          code={`app_settings = {
  "WEBSITE_NODE_DEFAULT_VERSION" = "~20"
  "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"

  # Your custom variables
  "ENVIRONMENT" = var.environment
  "NEXT_PUBLIC_APP_NAME" = var.app_name
  "NEXT_PUBLIC_API_URL" = "https://api.example.com"
  "DATABASE_URL" = "your-database-connection-string"
  "API_SECRET_KEY" = "your-secret-key"
}`}
        />

        <p className="text-gray-700 mt-4 mb-2">Apply the changes:</p>
        <CommandBlock command="cd terraform && terraform apply" />

        <p className="text-gray-700 mt-4 mb-2">Restart the app service:</p>
        <CommandBlock command="az webapp restart --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />
      </Section>

      {/* Complete Command Flow */}
      <Section title="Complete Command Flow">
        <div className="bg-gray-50 p-6 rounded-lg space-y-4">
          <div>
            <p className="font-semibold text-gray-900 mb-2">1. Create Next.js app</p>
            <div className="space-y-1">
              <CommandBlock command="npx create-next-app@latest my-nextjs-app" />
              <CommandBlock command="cd my-nextjs-app" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">2. Create health check API</p>
            <p className="text-sm text-gray-600">Create app/api/health/route.ts file</p>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">3. Test locally</p>
            <div className="space-y-1">
              <CommandBlock command="npm run dev" />
              <CommandBlock command="npm run build" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">4. Create Terraform files</p>
            <div className="space-y-1">
              <CommandBlock command="mkdir terraform && cd terraform" />
              <p className="text-sm text-gray-600">Create provider.tf, variables.tf, main.tf, outputs.tf</p>
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">5. Deploy infrastructure</p>
            <div className="space-y-1">
              <CommandBlock command="terraform init" />
              <CommandBlock command="terraform apply" />
              <CommandBlock command="terraform output app_service_name" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">6. Create deployment package</p>
            <div className="space-y-1">
              <CommandBlock command="cd .." />
              <CommandBlock command="zip -r deploy.zip . -x '*.git*' 'node_modules/*' '.next/cache/*' 'terraform/*'" />
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">7. Deploy to Azure</p>
            <CommandBlock command="az webapp deploy --resource-group rg-mynextapp-dev --name app-mynextapp-dev --src-path deploy.zip --type zip" />
          </div>

          <div>
            <p className="font-semibold text-gray-900 mb-2">8. Monitor and test</p>
            <div className="space-y-1">
              <CommandBlock command="az webapp log tail --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />
              <CommandBlock command="curl https://app-mynextapp-dev.azurewebsites.net/api/health" />
            </div>
          </div>
        </div>
      </Section>

      {/* Project Structure */}
      <Section title="Final Project Structure">
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm">
          <div className="space-y-1">
            <div>my-nextjs-app/</div>
            <div>├── app/</div>
            <div>│   ├── page.tsx</div>
            <div>│   ├── layout.tsx</div>
            <div>│   └── api/</div>
            <div>│       └── health/</div>
            <div>│           └── route.ts</div>
            <div>├── public/</div>
            <div>├── .env.local</div>
            <div>├── next.config.js</div>
            <div>├── package.json</div>
            <div>├── tsconfig.json</div>
            <div>├── deploy.zip</div>
            <div>├── .next/          (build output)</div>
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
      <Section title="Tips & Troubleshooting">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-900">Check deployment status</p>
              <CommandBlock command="az webapp deployment list --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900">View application logs</p>
              <CommandBlock command="az webapp log download --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900">If deployment is slow</p>
              <p className="text-sm text-yellow-800">First deployment takes 5-10 minutes because Azure needs to install dependencies and build your app</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-purple-900">SSH into your app</p>
              <CommandBlock command="az webapp ssh --name app-mynextapp-dev --resource-group rg-mynextapp-dev" />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}
