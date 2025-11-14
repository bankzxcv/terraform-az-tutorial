/**
 * Outputs for Cloud Function Example
 *
 * These outputs provide important information about the deployed resources.
 * Use them to access the function URL, get resource IDs, or integrate with other systems.
 */

# ============================================================================
# FUNCTION INFORMATION
# ============================================================================

output "function_name" {
  description = "Name of the deployed Cloud Function"
  value       = google_cloudfunctions2_function.function.name
}

output "function_url" {
  description = "HTTPS URL for invoking the Cloud Function"
  value       = google_cloudfunctions2_function.function.service_config[0].uri
}

output "function_id" {
  description = "Fully qualified ID of the Cloud Function"
  value       = google_cloudfunctions2_function.function.id
}

output "function_state" {
  description = "Current state of the Cloud Function (ACTIVE, FAILED, DEPLOYING, etc.)"
  value       = google_cloudfunctions2_function.function.state
}

# ============================================================================
# SERVICE ACCOUNT
# ============================================================================

output "service_account_email" {
  description = "Email of the service account used by the Cloud Function"
  value       = google_service_account.function_sa.email
}

output "service_account_id" {
  description = "ID of the service account"
  value       = google_service_account.function_sa.id
}

# ============================================================================
# STORAGE
# ============================================================================

output "storage_bucket_name" {
  description = "Name of the Cloud Storage bucket storing function source code"
  value       = google_storage_bucket.function_bucket.name
}

output "storage_bucket_url" {
  description = "URL of the Cloud Storage bucket"
  value       = google_storage_bucket.function_bucket.url
}

# ============================================================================
# CONFIGURATION DETAILS
# ============================================================================

output "function_config" {
  description = "Complete function configuration details"
  value = {
    name        = google_cloudfunctions2_function.function.name
    location    = google_cloudfunctions2_function.function.location
    runtime     = google_cloudfunctions2_function.function.build_config[0].runtime
    entry_point = google_cloudfunctions2_function.function.build_config[0].entry_point
    memory      = google_cloudfunctions2_function.function.service_config[0].available_memory
    timeout     = google_cloudfunctions2_function.function.service_config[0].timeout_seconds
    environment = var.environment
    version     = var.function_version
  }
}

# ============================================================================
# USAGE EXAMPLES
# ============================================================================

output "curl_command" {
  description = "Example curl command to invoke the function"
  value       = <<-EOT
    # Simple GET request:
    curl "${google_cloudfunctions2_function.function.service_config[0].uri}"

    # GET with parameters:
    curl "${google_cloudfunctions2_function.function.service_config[0].uri}?name=Alice&greeting=Hello"

    # POST with JSON body:
    curl -X POST "${google_cloudfunctions2_function.function.service_config[0].uri}" \
      -H "Content-Type: application/json" \
      -d '{"name": "Bob", "greeting": "Welcome"}'
  EOT
}

output "gcloud_command" {
  description = "Example gcloud command to invoke the function"
  value       = <<-EOT
    # Invoke function using gcloud:
    gcloud functions call ${google_cloudfunctions2_function.function.name} \
      --region=${google_cloudfunctions2_function.function.location} \
      --gen2 \
      --data='{"name": "Test User"}'

    # View function logs:
    gcloud functions logs read ${google_cloudfunctions2_function.function.name} \
      --region=${google_cloudfunctions2_function.function.location} \
      --gen2 \
      --limit=50
  EOT
}

# ============================================================================
# MONITORING & DEBUGGING
# ============================================================================

output "cloud_console_url" {
  description = "URL to view the function in Google Cloud Console"
  value       = "https://console.cloud.google.com/functions/details/${google_cloudfunctions2_function.function.location}/${google_cloudfunctions2_function.function.name}?project=${var.project_id}"
}

output "logs_explorer_url" {
  description = "URL to view function logs in Cloud Logging"
  value       = "https://console.cloud.google.com/logs/query;query=resource.type%3D%22cloud_function%22%0Aresource.labels.function_name%3D%22${google_cloudfunctions2_function.function.name}%22;?project=${var.project_id}"
}

# ============================================================================
# SUMMARY OUTPUT
# ============================================================================

output "deployment_summary" {
  description = "Summary of the Cloud Function deployment"
  value = <<-EOT

    ========================================
    Cloud Function Deployment Summary
    ========================================

    Function Name:    ${google_cloudfunctions2_function.function.name}
    Function URL:     ${google_cloudfunctions2_function.function.service_config[0].uri}
    Region:           ${google_cloudfunctions2_function.function.location}
    Environment:      ${var.environment}
    Version:          ${var.function_version}
    Runtime:          ${google_cloudfunctions2_function.function.build_config[0].runtime}
    Entry Point:      ${google_cloudfunctions2_function.function.build_config[0].entry_point}
    Memory:           ${google_cloudfunctions2_function.function.service_config[0].available_memory}
    Timeout:          ${google_cloudfunctions2_function.function.service_config[0].timeout_seconds}s
    Max Instances:    ${var.max_instances}
    Public Access:    ${var.public_access}

    Service Account:  ${google_service_account.function_sa.email}
    Storage Bucket:   ${google_storage_bucket.function_bucket.name}

    ========================================
    Quick Test Commands
    ========================================

    # Test with curl:
    curl "${google_cloudfunctions2_function.function.service_config[0].uri}?name=Test"

    # View logs:
    gcloud functions logs read ${google_cloudfunctions2_function.function.name} \
      --region=${google_cloudfunctions2_function.function.location} \
      --gen2

    # Cloud Console:
    ${output.cloud_console_url.value}

    ========================================
  EOT
}
