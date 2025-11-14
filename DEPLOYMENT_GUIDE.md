# 🚀 Simplified Deployment Guide

## Overview

This guide provides **minimal, straightforward deployment instructions** for common scenarios. No fluff, no complexity - just what you need to deploy.

---

## 📋 Table of Contents

- [Quick Start Checklist](#quick-start-checklist)
- [Scenario 1: Simple Storage](#scenario-1-simple-storage)
- [Scenario 2: Static Website](#scenario-2-static-website)
- [Scenario 3: Azure Function (Node.js)](#scenario-3-azure-function-nodejs)
- [Scenario 4: Next.js Application](#scenario-4-nextjs-application)
- [Scenario 5: REST API](#scenario-5-rest-api)
- [Common Commands](#common-commands)
- [Troubleshooting](#troubleshooting)

---

## ✅ Quick Start Checklist

Before deploying anything, complete these one-time setup steps:

```bash
# 1. Install Azure CLI
brew install azure-cli          # macOS
# winget install Microsoft.AzureCLI  # Windows

# 2. Install Terraform
brew install terraform          # macOS
# choco install terraform         # Windows

# 3. Login to Azure
az login

# 4. Verify setup
az account show
terraform --version

# ✅ You're ready to deploy!
```

---

## Scenario 1: Simple Storage

**Deploy a Storage Account in 2 minutes**

### What you'll get:
- Resource Group
- Storage Account
- Blob Container

### Deployment:

```bash
# Create project
mkdir my-storage && cd my-storage

# Create Terraform file
cat > main.tf <<'EOF'
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-my-storage"
  location = "East US"
}

resource "azurerm_storage_account" "main" {
  name                     = "stmystorage${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "azurerm_storage_container" "main" {
  name                  = "data"
  storage_account_name  = azurerm_storage_account.main.name
  container_access_type = "private"
}

output "storage_account_name" {
  value = azurerm_storage_account.main.name
}

output "container_name" {
  value = azurerm_storage_container.main.name
}
EOF

# Deploy
terraform init
terraform apply -auto-approve

# Get outputs
terraform output

# Clean up when done
# terraform destroy -auto-approve
```

**That's it! ✅**

---

## Scenario 2: Static Website

**Deploy a static website in 5 minutes**

### What you'll get:
- Storage Account with static website hosting
- Your HTML/CSS/JS files deployed

### Deployment:

```bash
# Create project
mkdir my-website && cd my-website

# Create website files
cat > index.html <<'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Hello from Azure!</h1>
    <p>Deployed with Terraform</p>
</body>
</html>
EOF

cat > style.css <<'EOF'
body {
    font-family: Arial, sans-serif;
    max-width: 800px;
    margin: 50px auto;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}
h1 {
    font-size: 3em;
}
EOF

# Create Terraform file
cat > main.tf <<'EOF'
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-my-website"
  location = "East US"
}

resource "azurerm_storage_account" "main" {
  name                     = "stwebsite${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  static_website {
    index_document = "index.html"
  }
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

output "website_url" {
  value = azurerm_storage_account.main.primary_web_endpoint
}
EOF

# Deploy infrastructure
terraform init
terraform apply -auto-approve

# Get storage account name
STORAGE_ACCOUNT=$(terraform output -raw storage_account_name)

# Upload website files
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --destination '$web' \
  --source . \
  --pattern "*.html" \
  --pattern "*.css" \
  --overwrite

# Get website URL
terraform output website_url

# Visit your website!
open $(terraform output -raw website_url)
```

**Your website is live! ✅**

---

## Scenario 3: Azure Function (Node.js)

**Deploy a serverless API in 10 minutes**

### What you'll get:
- Function App
- HTTP-triggered function
- Health check endpoint

### Deployment:

```bash
# Create project
mkdir my-function && cd my-function

# Install Azure Functions Core Tools (one-time)
npm install -g azure-functions-core-tools@4

# Create function
func init . --typescript
func new --name api --template "HTTP trigger" --authlevel "anonymous"

# Create Terraform files
mkdir terraform && cd terraform

cat > main.tf <<'EOF'
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-my-function"
  location = "East US"
}

resource "azurerm_storage_account" "main" {
  name                     = "stfunc${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "azurerm_service_plan" "main" {
  name                = "plan-func"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "Y1"  # Consumption plan (free tier)
}

resource "azurerm_linux_function_app" "main" {
  name                = "func-api-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  storage_account_name       = azurerm_storage_account.main.name
  storage_account_access_key = azurerm_storage_account.main.primary_access_key

  site_config {
    application_stack {
      node_version = "18"
    }
  }

  app_settings = {
    "FUNCTIONS_WORKER_RUNTIME" = "node"
  }
}

output "function_name" {
  value = azurerm_linux_function_app.main.name
}

output "function_url" {
  value = "https://${azurerm_linux_function_app.main.default_hostname}"
}
EOF

# Deploy infrastructure
terraform init
terraform apply -auto-approve

# Build function
cd ..
npm install
npm run build

# Deploy function code
FUNCTION_NAME=$(cd terraform && terraform output -raw function_name)
func azure functionapp publish $FUNCTION_NAME

# Test it
FUNCTION_URL=$(cd terraform && terraform output -raw function_url)
curl "${FUNCTION_URL}/api/api?name=World"
```

**Your API is live! ✅**

---

## Scenario 4: Next.js Application

**Deploy a Next.js app in 10 minutes**

### What you'll get:
- App Service running your Next.js app
- Automatic builds on deployment

### Deployment:

```bash
# Create Next.js app
npx create-next-app@latest my-nextjs-app
cd my-nextjs-app

# Test locally
npm run dev
# Visit http://localhost:3000

# Create Terraform files
mkdir terraform && cd terraform

cat > main.tf <<'EOF'
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "main" {
  name     = "rg-my-nextjs"
  location = "East US"
}

resource "azurerm_service_plan" "main" {
  name                = "plan-nextjs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  os_type             = "Linux"
  sku_name            = "B1"  # Basic tier
}

resource "azurerm_linux_web_app" "main" {
  name                = "app-nextjs-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  service_plan_id     = azurerm_service_plan.main.id

  site_config {
    always_on = true
    application_stack {
      node_version = "18-lts"
    }
  }

  app_settings = {
    "SCM_DO_BUILD_DURING_DEPLOYMENT" = "true"
    "WEBSITE_NODE_DEFAULT_VERSION"   = "~18"
  }
}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

output "app_name" {
  value = azurerm_linux_web_app.main.name
}

output "app_url" {
  value = "https://${azurerm_linux_web_app.main.default_hostname}"
}

output "resource_group" {
  value = azurerm_resource_group.main.name
}
EOF

# Deploy infrastructure
terraform init
terraform apply -auto-approve

# Build and create deployment package
cd ..
npm run build
zip -r deploy.zip . -x "*.git*" "node_modules/*" "terraform/*"

# Deploy to Azure
APP_NAME=$(cd terraform && terraform output -raw app_name)
RESOURCE_GROUP=$(cd terraform && terraform output -raw resource_group)

az webapp deploy \
  --resource-group $RESOURCE_GROUP \
  --name $APP_NAME \
  --src-path deploy.zip \
  --type zip

# Get URL
cd terraform && terraform output app_url

# Visit your app!
open $(terraform output -raw app_url)
```

**Your Next.js app is live! ✅**

---

## Scenario 5: REST API

**Deploy Express.js API in 10 minutes**

### What you'll get:
- Function App running Express.js
- REST API with multiple endpoints

### Deployment:

```bash
# Create project
mkdir my-api && cd my-api

# Initialize
npm init -y
npm install express @azure/functions

# Create API
cat > index.js <<'EOF'
const express = require('express');
const { app } = require('@azure/functions');

const expressApp = express();
expressApp.use(express.json());

// Health check
expressApp.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Get items
expressApp.get('/api/items', (req, res) => {
  res.json({
    items: ['Item 1', 'Item 2', 'Item 3']
  });
});

// Create item
expressApp.post('/api/items', (req, res) => {
  res.json({
    message: 'Item created',
    item: req.body
  });
});

// Azure Functions wrapper
app.http('api', {
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  authLevel: 'anonymous',
  route: '{*segments}',
  handler: (request, context) => {
    return new Promise((resolve) => {
      const res = {
        status: (code) => ({
          json: (data) => {
            resolve({
              status: code,
              jsonBody: data,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        })
      };
      expressApp(request, res, () => {
        resolve({ status: 404, body: 'Not Found' });
      });
    });
  }
});
EOF

# Create host.json
cat > host.json <<'EOF'
{
  "version": "2.0",
  "extensionBundle": {
    "id": "Microsoft.Azure.Functions.ExtensionBundle",
    "version": "[4.*, 5.0.0)"
  }
}
EOF

# Create Terraform (same as Scenario 3)
mkdir terraform && cd terraform
# ... (use main.tf from Scenario 3)

# Deploy infrastructure
terraform init
terraform apply -auto-approve

# Deploy code
cd ..
FUNCTION_NAME=$(cd terraform && terraform output -raw function_name)
func azure functionapp publish $FUNCTION_NAME

# Test endpoints
FUNCTION_URL=$(cd terraform && terraform output -raw function_url)
curl "${FUNCTION_URL}/api/health"
curl "${FUNCTION_URL}/api/items"
```

**Your API is live! ✅**

---

## 🛠️ Common Commands

### Terraform Operations

```bash
# Initialize (run once, or when adding providers)
terraform init

# Preview changes
terraform plan

# Deploy
terraform apply

# Deploy without confirmation
terraform apply -auto-approve

# View outputs
terraform output

# Destroy everything
terraform destroy

# Format code
terraform fmt

# Validate configuration
terraform validate

# Show current state
terraform show
```

### Azure CLI Operations

```bash
# Login
az login

# List subscriptions
az account list --output table

# Set subscription
az account set --subscription "SUBSCRIPTION_ID"

# List resources
az resource list --resource-group rg-name --output table

# View resource
az resource show --ids /subscriptions/.../resourceGroups/rg-name/...

# Delete resource group
az group delete --name rg-name --yes

# View logs
az webapp log tail --name app-name --resource-group rg-name
```

### Azure Functions Operations

```bash
# Create function
func init my-function --typescript
func new --template "HTTP trigger"

# Run locally
func start

# Deploy
func azure functionapp publish FUNCTION_NAME

# View logs
func azure functionapp logstream FUNCTION_NAME
```

---

## 🔧 Troubleshooting

### Issue: "terraform init" fails

**Solution:**
```bash
# Clear cache
rm -rf .terraform .terraform.lock.hcl

# Re-initialize
terraform init
```

### Issue: "az login" fails

**Solution:**
```bash
# Clear credentials
az logout
az account clear

# Login again
az login
```

### Issue: Storage account name already exists

**Solution:**
```bash
# Storage names must be globally unique
# Add a random suffix or change the name in your Terraform code

resource "random_string" "suffix" {
  length  = 8
  special = false
  upper   = false
}

resource "azurerm_storage_account" "main" {
  name = "st${var.project}${random_string.suffix.result}"
  # ...
}
```

### Issue: Function deployment fails

**Solution:**
```bash
# Restart function app
az functionapp restart --name FUNCTION_NAME --resource-group RG_NAME

# Check logs
az functionapp log tail --name FUNCTION_NAME --resource-group RG_NAME

# Redeploy
func azure functionapp publish FUNCTION_NAME --force
```

### Issue: Next.js app shows 500 error

**Solution:**
```bash
# Check logs
az webapp log download --name APP_NAME --resource-group RG_NAME

# SSH into container
az webapp ssh --name APP_NAME --resource-group RG_NAME

# Check if build completed
az webapp log tail --name APP_NAME --resource-group RG_NAME
```

### Issue: Terraform state locked

**Solution:**
```bash
# Force unlock (use lock ID from error message)
terraform force-unlock LOCK_ID

# If that fails, wait 15 minutes for automatic unlock
```

---

## 💡 Pro Tips

### 1. Use Variables for Reusability

```hcl
variable "location" {
  default = "East US"
}

variable "environment" {
  default = "dev"
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${var.environment}"
  location = var.location
}
```

### 2. Use Outputs to Get Important Info

```hcl
output "app_url" {
  value = azurerm_linux_web_app.main.default_hostname
}

output "connection_string" {
  value     = azurerm_storage_account.main.primary_connection_string
  sensitive = true
}
```

### 3. Always Test Locally First

```bash
# For Functions
func start

# For Next.js
npm run dev

# For Node.js
node index.js
```

### 4. Use Remote State for Team Work

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "prod.terraform.tfstate"
  }
}
```

### 5. Clean Up Resources to Save Money

```bash
# Destroy when not needed
terraform destroy -auto-approve

# Or just the resource group
az group delete --name rg-name --yes
```

---

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Tested locally
- [ ] Environment variables configured
- [ ] Resource names are unique
- [ ] Used appropriate SKUs (B1 for dev, P1+ for prod)
- [ ] Enabled monitoring/logging
- [ ] Configured backup (if needed)
- [ ] Set up CI/CD (optional but recommended)
- [ ] Documented deployment process
- [ ] Configured custom domain (optional)
- [ ] SSL certificate configured (if using custom domain)

---

## 🎯 Next Steps

Now that you know how to deploy:

1. **Learn Best Practices**: Read [PRODUCTION_BEST_PRACTICES.md](./PRODUCTION_BEST_PRACTICES.md)
2. **Follow Learning Path**: Check [LEARNING_PATH.md](./LEARNING_PATH.md)
3. **Run the Tutorial**: `npm run dev` to start the interactive tutorial
4. **Build Something**: Deploy your own project!

**Happy deploying! 🚀**
