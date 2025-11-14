# ===================================================================
# Azure Function App Deployment with Terraform
# ===================================================================
#
# This Terraform configuration deploys:
# 1. Resource Group - Logical container for Azure resources
# 2. Storage Account - Required for Azure Functions runtime
# 3. App Service Plan - Compute resources for Function App
# 4. Application Insights - Monitoring and logging
# 5. Function App - The serverless function runtime
#
# COST ESTIMATE (Consumption Plan):
# - Resource Group: Free
# - Storage Account: ~$0.02/GB/month (minimal usage: <$1/month)
# - App Service Plan (Consumption): Pay-per-execution
# - Application Insights: First 5GB free, then ~$2.30/GB
# - Function Executions: First 1M free, then $0.20/M
# - Total: <$5/month for development usage
#
# DEPLOYMENT TIME: ~3-5 minutes
#
# ===================================================================

# -------------------------------------------------------------------
# Terraform Configuration
# -------------------------------------------------------------------
terraform {
  # Specify minimum Terraform version
  required_version = ">= 1.0"

  # Required providers
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"  # Use latest 3.x version
    }
  }
}

# Configure the Microsoft Azure Provider
provider "azurerm" {
  features {
    # SECURITY: Protect resources from accidental deletion
    resource_group {
      prevent_deletion_if_contains_resources = false  # Set to true in production
    }

    # SECURITY: Soft delete for Key Vault (if used)
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }

  # OPTIONAL: Uncomment and set these if not using Azure CLI authentication
  # subscription_id = var.subscription_id
  # tenant_id       = var.tenant_id
}

# -------------------------------------------------------------------
# Random ID for Unique Naming
# -------------------------------------------------------------------
# Azure requires globally unique names for some resources (Storage Account, Function App)
# This random string ensures uniqueness across Azure
resource "random_id" "suffix" {
  byte_length = 4  # Generates 8-character hex string
}

# -------------------------------------------------------------------
# Resource Group
# -------------------------------------------------------------------
# Resource Groups are logical containers for Azure resources
# They help with:
# - Organization (group related resources)
# - Access control (apply RBAC at group level)
# - Cost tracking (view costs per resource group)
# - Bulk operations (delete all resources at once)
resource "azurerm_resource_group" "function_rg" {
  name     = "${var.resource_group_name}-${random_id.suffix.hex}"
  location = var.location

  tags = merge(
    var.tags,
    {
      ManagedBy   = "Terraform"
      Environment = var.environment
      Purpose     = "Azure Functions Example"
    }
  )

  # LIFECYCLE: Prevent accidental deletion in production
  # lifecycle {
  #   prevent_destroy = true
  # }
}

# -------------------------------------------------------------------
# Storage Account
# -------------------------------------------------------------------
# REQUIRED for Azure Functions:
# - Stores function code and configuration
# - Manages function execution state
# - Hosts logs and metrics
# - Stores triggers and bindings data
#
# PERFORMANCE:
# - Standard tier uses HDD (sufficient for most functions)
# - Premium tier uses SSD (faster, more expensive)
#
# REPLICATION:
# - LRS (Locally Redundant): 3 copies in single datacenter (cheapest)
# - ZRS (Zone Redundant): 3 copies across availability zones
# - GRS (Geo Redundant): 6 copies across regions (most durable)
resource "azurerm_storage_account" "function_storage" {
  name                     = "funcst${random_id.suffix.hex}"  # Must be globally unique, lowercase, alphanumeric only
  resource_group_name      = azurerm_resource_group.function_rg.name
  location                 = azurerm_resource_group.function_rg.location
  account_tier             = "Standard"  # Standard (HDD) or Premium (SSD)
  account_replication_type = "LRS"       # LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS

  # SECURITY: Disable public access for production
  # public_network_access_enabled = false

  # SECURITY: Require HTTPS for all connections
  enable_https_traffic_only = true

  # SECURITY: Use latest TLS version
  min_tls_version = "TLS1_2"

  # SECURITY: Disable shared key access (use Azure AD instead) - Uncomment for production
  # shared_access_key_enabled = false

  tags = merge(
    var.tags,
    {
      Purpose = "Azure Function Storage"
    }
  )
}

# -------------------------------------------------------------------
# Application Insights
# -------------------------------------------------------------------
# Application Insights provides:
# - Request tracking (invocations, duration, success rate)
# - Dependency tracking (external API calls, database queries)
# - Exception tracking (errors and stack traces)
# - Custom metrics and logging
# - Performance monitoring (response times, throughput)
# - Live metrics stream (real-time monitoring)
#
# COST:
# - First 5 GB ingestion per month: Free
# - Additional data: ~$2.30 per GB
# - Data retention: 90 days default (configurable up to 730 days)
resource "azurerm_application_insights" "function_insights" {
  name                = "func-insights-${random_id.suffix.hex}"
  resource_group_name = azurerm_resource_group.function_rg.name
  location            = azurerm_resource_group.function_rg.location
  application_type    = "web"  # web, ios, java, Node.JS, other

  # Retention period in days (30-730)
  retention_in_days = 30  # Reduce to save costs in dev

  # COST: Disable if not needed in dev environment
  # sampling_percentage = 100  # Reduce to save costs (e.g., 10 for 10% sampling)

  tags = merge(
    var.tags,
    {
      Purpose = "Azure Function Monitoring"
    }
  )
}

# -------------------------------------------------------------------
# App Service Plan (Consumption Plan)
# -------------------------------------------------------------------
# App Service Plan defines:
# - Hosting tier (Consumption, Premium, Dedicated)
# - Operating System (Windows or Linux)
# - Region
#
# CONSUMPTION PLAN (Y1):
# - Serverless, pay-per-execution
# - Auto-scales from 0 to 200 instances
# - 1.5 GB memory per instance
# - 5-10 minute timeout (configurable)
# - Cold starts (~1-3 seconds)
# - COST: $0.20 per million executions + $0.000016 per GB-second
#
# PREMIUM PLAN (EP1, EP2, EP3):
# - Pre-warmed instances (no cold starts)
# - VNET integration
# - Unlimited execution duration
# - More memory (3.5 GB to 14 GB)
# - COST: ~$150-$600/month + execution costs
#
# DEDICATED PLAN (App Service):
# - Runs on dedicated VMs
# - Predictable cost
# - More control over scaling
# - COST: Based on VM size (~$50-$200/month)
resource "azurerm_service_plan" "function_plan" {
  name                = "func-plan-${random_id.suffix.hex}"
  resource_group_name = azurerm_resource_group.function_rg.name
  location            = azurerm_resource_group.function_rg.location
  os_type             = "Linux"  # Linux or Windows
  sku_name            = "Y1"     # Y1 = Consumption, EP1/EP2/EP3 = Premium, B1/S1/P1V2 = Dedicated

  tags = merge(
    var.tags,
    {
      Purpose = "Azure Function Hosting"
    }
  )
}

# -------------------------------------------------------------------
# Linux Function App
# -------------------------------------------------------------------
# The Function App is the runtime environment for your functions
#
# FEATURES:
# - Hosts one or more functions
# - Provides HTTP endpoint (*.azurewebsites.net)
# - Manages scaling and load balancing
# - Integrates with Application Insights
# - Supports continuous deployment
# - Managed SSL certificate
#
# RUNTIME VERSIONS:
# - Node.js: 18, 20
# - Python: 3.9, 3.10, 3.11
# - .NET: 6, 8
# - Java: 8, 11, 17
resource "azurerm_linux_function_app" "function_app" {
  name                       = "func-${random_id.suffix.hex}"
  resource_group_name        = azurerm_resource_group.function_rg.name
  location                   = azurerm_resource_group.function_rg.location
  service_plan_id            = azurerm_service_plan.function_plan.id
  storage_account_name       = azurerm_storage_account.function_storage.name
  storage_account_access_key = azurerm_storage_account.function_storage.primary_access_key

  # SECURITY: Enable HTTPS only
  https_only = true

  # RUNTIME: Configure the Node.js runtime
  site_config {
    # Application stack settings
    application_stack {
      node_version = "18"  # 18 or 20 (LTS versions)
    }

    # SECURITY: Minimum TLS version
    minimum_tls_version = "1.2"

    # CORS: Configure allowed origins
    # Uncomment and configure for production
    # cors {
    #   allowed_origins = [
    #     "https://yourapp.com",
    #     "https://www.yourapp.com"
    #   ]
    #   support_credentials = false
    # }

    # PERFORMANCE: Enable HTTP/2
    http2_enabled = true

    # SECURITY: Disable FTP (use FTPS or deployment center)
    ftps_state = "Disabled"

    # APPLICATION INSIGHTS: Enable detailed error messages (dev only)
    detailed_error_logging_enabled = true
    application_insights_key       = azurerm_application_insights.function_insights.instrumentation_key
    application_insights_connection_string = azurerm_application_insights.function_insights.connection_string
  }

  # APPLICATION SETTINGS (Environment Variables)
  # These are available in your function code as process.env.KEY
  app_settings = {
    # REQUIRED: Functions runtime configuration
    FUNCTIONS_WORKER_RUNTIME       = "node"  # node, python, dotnet, java, powershell
    WEBSITE_RUN_FROM_PACKAGE       = "1"     # Run from deployment package (recommended)
    FUNCTIONS_WORKER_PROCESS_COUNT = "1"     # Number of language worker processes

    # APPLICATION INSIGHTS
    APPINSIGHTS_INSTRUMENTATIONKEY = azurerm_application_insights.function_insights.instrumentation_key
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.function_insights.connection_string

    # ENVIRONMENT
    ENVIRONMENT = var.environment

    # CUSTOM APPLICATION SETTINGS
    # Add your application-specific settings here
    # Example:
    # API_URL = "https://api.example.com"
    # MAX_RETRY_ATTEMPTS = "3"

    # SECRETS: Use Azure Key Vault references for sensitive data
    # Example:
    # DATABASE_CONNECTION_STRING = "@Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/DbConnection/)"
  }

  # IDENTITY: Enable Managed Identity for accessing Azure resources
  # System-assigned identity is automatically managed by Azure
  identity {
    type = "SystemAssigned"  # SystemAssigned, UserAssigned, or both
  }

  # LIFECYCLE: Ignore changes to certain attributes
  # Useful if you update settings manually or via CI/CD
  lifecycle {
    ignore_changes = [
      # Ignore app_settings if managed separately
      # app_settings,
      tags["LastDeployed"],
    ]
  }

  tags = merge(
    var.tags,
    {
      Purpose = "Azure Function Application"
    }
  )
}

# ===================================================================
# OUTPUTS
# ===================================================================
# See outputs.tf for output definitions
#
# ===================================================================
# NEXT STEPS AFTER DEPLOYMENT
# ===================================================================
#
# 1. DEPLOY FUNCTION CODE:
#    Option A: Azure Functions Core Tools
#    $ cd /path/to/simple-http-function
#    $ func azure functionapp publish func-xxxxxxxx --build local
#
#    Option B: Azure CLI
#    $ az functionapp deployment source config-zip \
#        --resource-group <resource-group-name> \
#        --name func-xxxxxxxx \
#        --src function.zip
#
#    Option C: GitHub Actions / Azure DevOps (recommended for production)
#
# 2. GET FUNCTION KEY:
#    $ az functionapp function keys list \
#        --resource-group <resource-group-name> \
#        --name func-xxxxxxxx \
#        --function-name hello
#
# 3. TEST THE FUNCTION:
#    $ curl "https://func-xxxxxxxx.azurewebsites.net/api/hello?name=John&code=<function-key>"
#
# 4. MONITOR IN PORTAL:
#    - Navigate to Function App in Azure Portal
#    - View Application Insights for metrics
#    - Check logs in "Monitor" section
#
# 5. VIEW LOGS:
#    $ az monitor app-insights query \
#        --app <app-insights-name> \
#        --analytics-query "requests | where name == 'hello' | limit 10"
#
# ===================================================================
# SECURITY CHECKLIST
# ===================================================================
#
# [ ] Enable HTTPS only (✓ already configured)
# [ ] Set minimum TLS version to 1.2 (✓ already configured)
# [ ] Configure CORS properly (uncomment and set allowed origins)
# [ ] Use Managed Identity for Azure resource access (✓ enabled)
# [ ] Store secrets in Azure Key Vault (not in app settings)
# [ ] Enable authentication (Azure AD, function keys, etc.)
# [ ] Disable FTP (✓ already configured)
# [ ] Enable diagnostic logging
# [ ] Set up network security (firewall rules, private endpoints)
# [ ] Implement rate limiting for public APIs
# [ ] Regular security audits and updates
#
# ===================================================================
# MONITORING CHECKLIST
# ===================================================================
#
# [ ] Application Insights configured (✓ already configured)
# [ ] Set up alerts for failures, high latency, etc.
# [ ] Configure log retention policies
# [ ] Set up dashboards for key metrics
# [ ] Enable Live Metrics Stream for real-time monitoring
# [ ] Configure availability tests
# [ ] Set up action groups for notifications
#
# ===================================================================
# COST OPTIMIZATION
# ===================================================================
#
# 1. Use Consumption plan for variable workloads
# 2. Reduce Application Insights sampling for high-volume functions
# 3. Set appropriate log retention (shorter = cheaper)
# 4. Use storage lifecycle management for old data
# 5. Monitor and remove unused functions
# 6. Consider Premium plan only if needed (VNET, pre-warmed instances)
# 7. Use reserved capacity for predictable workloads
#
# ===================================================================
# CLEANUP
# ===================================================================
#
# To destroy all resources:
# $ terraform destroy
#
# This will:
# - Delete Function App
# - Delete App Service Plan
# - Delete Application Insights
# - Delete Storage Account
# - Delete Resource Group
#
# WARNING: This is permanent. Ensure backups if needed.
# ===================================================================
