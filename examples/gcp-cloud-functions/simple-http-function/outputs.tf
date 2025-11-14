output "function_url" {
  description = "URL to invoke the Cloud Function"
  value       = google_cloudfunctions_function.function.https_trigger_url
}

output "function_name" {
  description = "Name of the Cloud Function"
  value       = google_cloudfunctions_function.function.name
}

output "deployment_instructions" {
  description = "Instructions for testing"
  value       = <<-EOT

  ================================================================================
  Google Cloud Function Deployed Successfully!
  ================================================================================

  Function URL: ${google_cloudfunctions_function.function.https_trigger_url}

  1. TEST THE FUNCTION:

     curl "${google_cloudfunctions_function.function.https_trigger_url}?name=John"

  2. VIEW LOGS:

     gcloud functions logs read ${google_cloudfunctions_function.function.name} --region=${var.region}

  3. VIEW IN CONSOLE:

     https://console.cloud.google.com/functions/details/${var.region}/${google_cloudfunctions_function.function.name}

  ================================================================================

  EOT
}
