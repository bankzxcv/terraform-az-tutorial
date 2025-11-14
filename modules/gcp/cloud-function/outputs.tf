output "function_name" {
  description = "Name of the function"
  value       = google_cloudfunctions2_function.function.name
}

output "function_url" {
  description = "HTTPS URL of the function"
  value       = google_cloudfunctions2_function.function.service_config[0].uri
}

output "function_id" {
  description = "ID of the function"
  value       = google_cloudfunctions2_function.function.id
}

output "function_state" {
  description = "Current state of the function"
  value       = google_cloudfunctions2_function.function.state
}
