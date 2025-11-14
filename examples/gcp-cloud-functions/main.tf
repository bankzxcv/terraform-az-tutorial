/**
 * Cloud Function Example - Terraform Configuration
 *
 * This example demonstrates deploying a simple HTTP-triggered Cloud Function
 * using Terraform. It includes all necessary resources and follows GCP best practices.
 *
 * Prerequisites:
 * 1. GCP project with billing enabled
 * 2. Cloud Functions API and Cloud Build API enabled
 * 3. Service account with necessary permissions
 *
 * Usage:
 *   terraform init
 *   terraform plan
 *   terraform apply
 */

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

# Configure the Google Cloud provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "cloudfunctions" {
  service            = "cloudfunctions.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloudbuild" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

# Create a Cloud Storage bucket for function source code
resource "google_storage_bucket" "function_bucket" {
  name     = "${var.project_id}-cloud-functions"
  location = var.region

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Force destroy allows bucket deletion even with objects
  # Set to false in production!
  force_destroy = true

  # Lifecycle rule to clean up old function versions
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 30  # Delete objects older than 30 days
    }
  }

  labels = {
    purpose     = "cloud-functions"
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Package the function source code
data "archive_file" "function_source" {
  type        = "zip"
  source_dir  = "${path.module}"
  output_path = "${path.module}/.terraform/archive/function-source.zip"

  # Include only necessary files
  excludes = [
    ".terraform",
    ".terraform.lock.hcl",
    "terraform.tfstate",
    "terraform.tfstate.backup",
    "*.tf",
    "*.tfvars",
    ".git",
    "README.md"
  ]
}

# Upload the function source code to Cloud Storage
resource "google_storage_bucket_object" "function_source" {
  name   = "function-source-${data.archive_file.function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_source.output_path

  # Metadata
  metadata = {
    created_at = timestamp()
    version    = var.function_version
  }

  depends_on = [google_project_service.cloudfunctions]
}

# Create a service account for the Cloud Function
resource "google_service_account" "function_sa" {
  account_id   = "${var.function_name}-sa"
  display_name = "Service Account for ${var.function_name} Cloud Function"
  description  = "Used by the Cloud Function for accessing GCP resources"
}

# Grant necessary permissions to the service account
# Example: Grant logging permissions
resource "google_project_iam_member" "function_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.function_sa.email}"
}

# Deploy the Cloud Function (2nd generation)
resource "google_cloudfunctions2_function" "function" {
  name        = var.function_name
  location    = var.region
  description = var.function_description

  # Build configuration
  build_config {
    # Runtime environment
    runtime = "nodejs20"

    # Entry point (function name in index.js)
    entry_point = var.function_entry_point

    # Source code from Cloud Storage
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }

    # Environment variables available during build
    # environment_variables = {}
  }

  # Service configuration
  service_config {
    # Maximum number of instances
    max_instance_count = var.max_instances

    # Minimum number of instances (keep at 0 for cost optimization)
    min_instance_count = 0

    # Memory allocated to each instance
    available_memory = var.memory

    # Timeout in seconds
    timeout_seconds = var.timeout

    # Environment variables available to the function
    environment_variables = {
      ENVIRONMENT = var.environment
      VERSION     = var.function_version
    }

    # Ingress settings (who can call this function)
    # ALLOW_ALL: Anyone on the internet
    # ALLOW_INTERNAL_ONLY: Only from GCP
    # ALLOW_INTERNAL_AND_GCLB: Only from GCP and Google Cloud Load Balancer
    ingress_settings = var.ingress_settings

    # Service account for function execution
    service_account_email = google_service_account.function_sa.email

    # All traffic goes to the latest revision
    all_traffic_on_latest_revision = true
  }

  # Labels for organization and billing
  labels = {
    environment = var.environment
    managed_by  = "terraform"
    version     = replace(var.function_version, ".", "-")
  }

  depends_on = [
    google_project_service.cloudfunctions,
    google_project_service.cloudbuild,
    google_project_service.run
  ]
}

# Make the function publicly accessible (if public_access is enabled)
resource "google_cloudfunctions2_function_iam_member" "invoker" {
  count = var.public_access ? 1 : 0

  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name

  role   = "roles/cloudfunctions.invoker"
  member = "allUsers"
}

# Alternative: Grant access to specific users/service accounts
# Uncomment and modify as needed
# resource "google_cloudfunctions2_function_iam_member" "specific_invoker" {
#   project        = google_cloudfunctions2_function.function.project
#   location       = google_cloudfunctions2_function.function.location
#   cloud_function = google_cloudfunctions2_function.function.name
#
#   role   = "roles/cloudfunctions.invoker"
#   member = "user:admin@example.com"
# }
