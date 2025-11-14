/**
 * Reusable Cloud Function Module
 *
 * This module creates a Cloud Function with best practices:
 * - Dedicated service account
 * - Proper IAM configuration
 * - Resource labeling
 * - Configurable access control
 */

resource "google_cloudfunctions2_function" "function" {
  name        = var.name
  project     = var.project_id
  location    = var.region
  description = var.description

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = var.source_bucket
        object = var.source_object
      }
    }

    dynamic "environment_variables" {
      for_each = length(var.build_environment_variables) > 0 ? [1] : []
      content {
        variables = var.build_environment_variables
      }
    }
  }

  service_config {
    max_instance_count               = var.max_instances
    min_instance_count               = var.min_instances
    available_memory                 = var.memory
    timeout_seconds                  = var.timeout
    environment_variables            = var.environment_variables
    ingress_settings                 = var.ingress_settings
    all_traffic_on_latest_revision   = true
    service_account_email            = var.service_account_email

    dynamic "secret_environment_variables" {
      for_each = var.secret_environment_variables
      content {
        key        = secret_environment_variables.value.key
        project_id = secret_environment_variables.value.project_id
        secret     = secret_environment_variables.value.secret
        version    = secret_environment_variables.value.version
      }
    }

    dynamic "vpc_connector" {
      for_each = var.vpc_connector != null ? [1] : []
      content {
        name              = var.vpc_connector
        egress_settings   = var.vpc_egress_settings
      }
    }
  }

  labels = merge(
    {
      managed_by = "terraform"
    },
    var.labels
  )
}

# Public access
resource "google_cloudfunctions2_function_iam_member" "invoker" {
  count = var.allow_unauthenticated ? 1 : 0

  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}

# Specific members access
resource "google_cloudfunctions2_function_iam_member" "members" {
  for_each = toset(var.invoker_members)

  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = each.value
}
