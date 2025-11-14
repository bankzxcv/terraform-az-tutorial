# ===================================================================
# Terraform Variables for Azure Functions Deployment
# ===================================================================
#
# Variables allow you to customize the deployment without modifying
# the main Terraform configuration. Set these values in:
# - terraform.tfvars file
# - Environment variables (TF_VAR_name)
# - Command line (-var="name=value")
# - Default values (specified below)
#
# ===================================================================

# -------------------------------------------------------------------
# Resource Group Configuration
# -------------------------------------------------------------------

variable "resource_group_name" {
  description = "Name of the Azure Resource Group (will have random suffix added)"
  type        = string
  default     = "rg-azure-function"

  # VALIDATION: Resource group names must be 1-90 characters
  validation {
    condition     = length(var.resource_group_name) > 0 && length(var.resource_group_name) <= 80
    error_message = "Resource group name must be between 1 and 80 characters (10 reserved for suffix)."
  }
}

# -------------------------------------------------------------------
# Location Configuration
# -------------------------------------------------------------------

variable "location" {
  description = "Azure region for all resources (e.g., eastus, westus2, westeurope)"
  type        = string
  default     = "eastus"

  # COMMON REGIONS:
  # - eastus          (US East, Virginia)
  # - westus2         (US West, Washington)
  # - centralus       (US Central, Iowa)
  # - northeurope     (Europe North, Ireland)
  # - westeurope      (Europe West, Netherlands)
  # - uksouth         (UK South, London)
  # - southeastasia   (Southeast Asia, Singapore)
  # - australiaeast   (Australia East, Sydney)
  #
  # Choose based on:
  # - User proximity (lower latency)
  # - Service availability (not all services in all regions)
  # - Data residency requirements
  # - Cost (pricing varies by region)

  validation {
    condition     = length(var.location) > 0
    error_message = "Location must be specified."
  }
}

# -------------------------------------------------------------------
# Environment Configuration
# -------------------------------------------------------------------

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "dev"

  # RECOMMENDED VALUES:
  # - dev: Development environment
  # - test: Testing environment
  # - staging: Pre-production environment
  # - prod: Production environment

  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, test, staging, prod."
  }
}

# -------------------------------------------------------------------
# Tags Configuration
# -------------------------------------------------------------------

variable "tags" {
  description = "Tags to apply to all resources (cost tracking, organization, etc.)"
  type        = map(string)
  default = {
    Project     = "Azure Functions Example"
    ManagedBy   = "Terraform"
    Owner       = "DevSecOps Team"
    CostCenter  = "Training"
  }

  # TAGGING BEST PRACTICES:
  #
  # Common tags to include:
  # - Environment: dev, staging, prod
  # - Project: Project name
  # - Owner: Team or individual responsible
  # - CostCenter: For billing and cost allocation
  # - ManagedBy: Terraform, Manual, etc.
  # - Application: Application name
  # - Compliance: Any compliance requirements (PCI, HIPAA, etc.)
  # - DataClassification: public, internal, confidential
  # - Expiration: For temporary resources (YYYY-MM-DD)
  #
  # Benefits:
  # - Cost tracking and allocation
  # - Resource organization
  # - Compliance auditing
  # - Automation (start/stop based on tags)
  # - Access control (policies based on tags)
}

# -------------------------------------------------------------------
# Optional Variables (Uncomment if needed)
# -------------------------------------------------------------------

# variable "subscription_id" {
#   description = "Azure Subscription ID (if not using Azure CLI authentication)"
#   type        = string
#   sensitive   = true
#   default     = null
# }

# variable "tenant_id" {
#   description = "Azure Tenant ID (if not using Azure CLI authentication)"
#   type        = string
#   sensitive   = true
#   default     = null
# }

# variable "allowed_origins" {
#   description = "List of allowed CORS origins for the Function App"
#   type        = list(string)
#   default     = ["*"]
#
#   # SECURITY: In production, specify exact origins
#   # Example:
#   # default = [
#   #   "https://myapp.com",
#   #   "https://www.myapp.com"
#   # ]
# }

# variable "app_insights_retention_days" {
#   description = "Number of days to retain Application Insights data (30-730)"
#   type        = number
#   default     = 30
#
#   validation {
#     condition     = var.app_insights_retention_days >= 30 && var.app_insights_retention_days <= 730
#     error_message = "Retention days must be between 30 and 730."
#   }
# }

# variable "storage_account_replication" {
#   description = "Storage account replication type (LRS, GRS, RAGRS, ZRS, GZRS, RAGZRS)"
#   type        = string
#   default     = "LRS"
#
#   validation {
#     condition     = contains(["LRS", "GRS", "RAGRS", "ZRS", "GZRS", "RAGZRS"], var.storage_account_replication)
#     error_message = "Invalid replication type."
#   }
# }

# variable "function_app_plan_sku" {
#   description = "App Service Plan SKU (Y1 = Consumption, EP1/EP2/EP3 = Premium)"
#   type        = string
#   default     = "Y1"
#
#   # SKU OPTIONS:
#   # - Y1: Consumption (serverless, pay-per-execution)
#   # - EP1: Premium (pre-warmed, VNET, ~$150/month)
#   # - EP2: Premium (more memory, ~$300/month)
#   # - EP3: Premium (most memory, ~$600/month)
#   # - B1: Basic dedicated (~$50/month)
#   # - S1: Standard dedicated (~$75/month)
#   # - P1V2: Premium V2 dedicated (~$100/month)
# }

# variable "node_version" {
#   description = "Node.js version for the Function App runtime"
#   type        = string
#   default     = "18"
#
#   validation {
#     condition     = contains(["18", "20"], var.node_version)
#     error_message = "Node version must be 18 or 20."
#   }
# }

# ===================================================================
# Variable Usage Examples
# ===================================================================
#
# OPTION 1: terraform.tfvars file
# Create a file named terraform.tfvars with:
#
# resource_group_name = "my-function-rg"
# location            = "westus2"
# environment         = "prod"
# tags = {
#   Project    = "MyApp"
#   Owner      = "Platform Team"
#   CostCenter = "Engineering"
# }
#
#
# OPTION 2: Environment variables
# export TF_VAR_location="westus2"
# export TF_VAR_environment="prod"
# terraform apply
#
#
# OPTION 3: Command line
# terraform apply \
#   -var="location=westus2" \
#   -var="environment=prod"
#
#
# OPTION 4: Variable file
# terraform apply -var-file="production.tfvars"
#
# ===================================================================
# Best Practices
# ===================================================================
#
# 1. Use terraform.tfvars for environment-specific values
# 2. Add terraform.tfvars to .gitignore (may contain sensitive data)
# 3. Use example file (terraform.tfvars.example) in version control
# 4. Use validation blocks to catch errors early
# 5. Provide sensible defaults for optional variables
# 6. Document expected values and constraints
# 7. Use sensitive = true for secrets (prevents display in logs)
# 8. Group related variables with comments
# 9. Use type constraints to prevent invalid values
# 10. Consider using variable sets in Terraform Cloud
#
# ===================================================================
