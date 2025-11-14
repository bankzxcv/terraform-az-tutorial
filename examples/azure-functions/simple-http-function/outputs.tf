# ===================================================================
# Terraform Outputs for Azure Functions Deployment
# ===================================================================
#
# Outputs display useful information after deployment and can be
# used by other Terraform configurations or scripts.
#
# View outputs:
# $ terraform output
# $ terraform output -json
# $ terraform output function_url
#
# ===================================================================

# -------------------------------------------------------------------
# Function App Information
# -------------------------------------------------------------------

output "function_app_name" {
  description = "Name of the deployed Azure Function App"
  value       = azurerm_linux_function_app.function_app.name

  # This is the name you'll use with Azure CLI and deployment tools
}

output "function_app_hostname" {
  description = "Default hostname of the Function App"
  value       = azurerm_linux_function_app.function_app.default_hostname

  # Format: <function-app-name>.azurewebsites.net
  # All functions are accessed via this hostname
}

output "function_url" {
  description = "Base URL of the Function App"
  value       = "https://${azurerm_linux_function_app.function_app.default_hostname}"

  # Use this as the base URL for invoking your functions
  # Example: https://<name>.azurewebsites.net/api/hello
}

output "function_endpoint" {
  description = "Complete endpoint URL for the hello function (without auth key)"
  value       = "https://${azurerm_linux_function_app.function_app.default_hostname}/api/hello?name=World"

  # NOTE: This URL requires authentication (function key)
  # See instructions below for getting the function key
}

# -------------------------------------------------------------------
# Resource Group Information
# -------------------------------------------------------------------

output "resource_group_name" {
  description = "Name of the Resource Group containing all resources"
  value       = azurerm_resource_group.function_rg.name

  # Use this for Azure CLI commands and resource management
}

output "resource_group_location" {
  description = "Azure region where resources are deployed"
  value       = azurerm_resource_group.function_rg.location
}

# -------------------------------------------------------------------
# Storage Account Information
# -------------------------------------------------------------------

output "storage_account_name" {
  description = "Name of the Storage Account used by the Function App"
  value       = azurerm_storage_account.function_storage.name
}

output "storage_account_primary_endpoint" {
  description = "Primary blob endpoint of the Storage Account"
  value       = azurerm_storage_account.function_storage.primary_blob_endpoint
}

# SECURITY: Uncomment only if needed for automation
# Never commit or share storage account keys
# output "storage_account_key" {
#   description = "Primary access key for the Storage Account"
#   value       = azurerm_storage_account.function_storage.primary_access_key
#   sensitive   = true  # Prevents display in console output
# }

# -------------------------------------------------------------------
# Application Insights Information
# -------------------------------------------------------------------

output "application_insights_name" {
  description = "Name of the Application Insights instance"
  value       = azurerm_application_insights.function_insights.name

  # Use this name to query logs and view metrics in Azure Portal
}

output "application_insights_instrumentation_key" {
  description = "Instrumentation key for Application Insights"
  value       = azurerm_application_insights.function_insights.instrumentation_key
  sensitive   = true  # Hide from console output

  # This key is used by the Function App to send telemetry
  # Already configured in the Function App settings
}

output "application_insights_app_id" {
  description = "Application ID for Application Insights"
  value       = azurerm_application_insights.function_insights.app_id

  # Use this ID for Application Insights API queries
}

# -------------------------------------------------------------------
# Managed Identity Information
# -------------------------------------------------------------------

output "function_app_principal_id" {
  description = "Principal ID of the Function App's Managed Identity"
  value       = azurerm_linux_function_app.function_app.identity[0].principal_id

  # USAGE: Grant this identity access to other Azure resources
  # Example: Grant access to Key Vault, Storage, Cosmos DB, etc.
  #
  # Azure CLI example:
  # az keyvault set-policy \
  #   --name my-keyvault \
  #   --object-id <principal-id> \
  #   --secret-permissions get list
}

output "function_app_tenant_id" {
  description = "Tenant ID of the Function App's Managed Identity"
  value       = azurerm_linux_function_app.function_app.identity[0].tenant_id
}

# -------------------------------------------------------------------
# Deployment Instructions
# -------------------------------------------------------------------

output "deployment_instructions" {
  description = "Instructions for deploying function code"
  value       = <<-EOT

  ================================================================================
  Azure Function Deployment Instructions
  ================================================================================

  1. DEPLOY FUNCTION CODE:

     Navigate to the function directory:
     cd examples/azure-functions/simple-http-function

     Deploy using Azure Functions Core Tools:
     func azure functionapp publish ${azurerm_linux_function_app.function_app.name}

  2. GET FUNCTION KEY:

     az functionapp function keys list \
       --resource-group ${azurerm_resource_group.function_rg.name} \
       --name ${azurerm_linux_function_app.function_app.name} \
       --function-name hello

  3. TEST THE FUNCTION:

     Replace <FUNCTION_KEY> with the key from step 2:

     curl "https://${azurerm_linux_function_app.function_app.default_hostname}/api/hello?name=John&code=<FUNCTION_KEY>"

  4. VIEW LOGS:

     In Azure Portal:
     - Navigate to Function App: ${azurerm_linux_function_app.function_app.name}
     - Go to "Monitor" > "Logs"
     - Query using Application Insights

     Or use Azure CLI:
     az monitor app-insights query \
       --app ${azurerm_application_insights.function_insights.name} \
       --resource-group ${azurerm_resource_group.function_rg.name} \
       --analytics-query "requests | where name == 'hello' | limit 10"

  5. VIEW IN PORTAL:

     Function App:
     https://portal.azure.com/#resource/subscriptions/<subscription-id>/resourceGroups/${azurerm_resource_group.function_rg.name}/providers/Microsoft.Web/sites/${azurerm_linux_function_app.function_app.name}

     Application Insights:
     https://portal.azure.com/#resource/subscriptions/<subscription-id>/resourceGroups/${azurerm_resource_group.function_rg.name}/providers/Microsoft.Insights/components/${azurerm_application_insights.function_insights.name}

  ================================================================================

  EOT
}

# -------------------------------------------------------------------
# Monitoring URLs
# -------------------------------------------------------------------

output "monitoring_queries" {
  description = "Useful monitoring queries for Application Insights"
  value       = <<-EOT

  ================================================================================
  Application Insights Query Examples
  ================================================================================

  Access Application Insights Logs:
  1. Go to Azure Portal
  2. Navigate to Application Insights: ${azurerm_application_insights.function_insights.name}
  3. Click "Logs" in the left menu
  4. Run these queries:

  # View all function requests
  requests
  | where cloud_RoleName == "${azurerm_linux_function_app.function_app.name}"
  | order by timestamp desc
  | limit 100

  # View failed requests
  requests
  | where success == false
  | order by timestamp desc

  # View performance metrics
  requests
  | summarize avg(duration), percentile(duration, 95) by bin(timestamp, 1h)
  | render timechart

  # View custom logs
  traces
  | where message contains "hello"
  | order by timestamp desc

  # View exceptions
  exceptions
  | order by timestamp desc

  # Request count by result code
  requests
  | summarize count() by resultCode
  | render piechart

  ================================================================================

  EOT
}

# -------------------------------------------------------------------
# Cost Estimation
# -------------------------------------------------------------------

output "cost_estimation" {
  description = "Estimated monthly cost for this deployment"
  value       = <<-EOT

  ================================================================================
  Estimated Monthly Cost (Development Usage)
  ================================================================================

  Resource Group:                 $0.00 (no charge)
  Storage Account (LRS):          ~$0.50 (minimal usage)
  App Service Plan (Consumption): Pay-per-execution
    - First 1M executions:        $0.00 (free tier)
    - Additional executions:      $0.20 per million
    - Compute time:               $0.000016 per GB-second
  Application Insights:           ~$0.00 (first 5GB free)

  Estimated Total (dev/test):     < $5.00/month

  Note: Actual costs depend on:
  - Number of function executions
  - Execution duration
  - Memory allocation
  - Data transfer
  - Log retention

  Production costs will be higher based on traffic volume.

  ================================================================================

  EOT
}

# -------------------------------------------------------------------
# Cleanup Instructions
# -------------------------------------------------------------------

output "cleanup_instructions" {
  description = "Instructions for cleaning up resources"
  value       = <<-EOT

  ================================================================================
  Cleanup Instructions
  ================================================================================

  To destroy all resources created by this Terraform configuration:

  1. Ensure you have backups (if needed)

  2. Run Terraform destroy:
     terraform destroy

  3. Confirm when prompted

  This will delete:
  - Function App: ${azurerm_linux_function_app.function_app.name}
  - App Service Plan: ${azurerm_service_plan.function_plan.name}
  - Application Insights: ${azurerm_application_insights.function_insights.name}
  - Storage Account: ${azurerm_storage_account.function_storage.name}
  - Resource Group: ${azurerm_resource_group.function_rg.name}

  WARNING: This action is permanent and cannot be undone!

  Alternative: Delete via Azure CLI:
  az group delete --name ${azurerm_resource_group.function_rg.name} --yes --no-wait

  ================================================================================

  EOT
}

# ===================================================================
# Output Usage Examples
# ===================================================================
#
# View all outputs:
# $ terraform output
#
# View specific output:
# $ terraform output function_url
#
# Get output as JSON:
# $ terraform output -json
#
# Use output in scripts:
# FUNCTION_URL=$(terraform output -raw function_url)
# curl "$FUNCTION_URL/api/hello?name=John&code=$FUNCTION_KEY"
#
# Use outputs in another Terraform configuration:
# data "terraform_remote_state" "function" {
#   backend = "azurerm"
#   config = {
#     resource_group_name  = "terraform-state"
#     storage_account_name = "tfstate"
#     container_name       = "tfstate"
#     key                  = "function.tfstate"
#   }
# }
#
# resource "azurerm_role_assignment" "example" {
#   principal_id = data.terraform_remote_state.function.outputs.function_app_principal_id
#   ...
# }
#
# ===================================================================
