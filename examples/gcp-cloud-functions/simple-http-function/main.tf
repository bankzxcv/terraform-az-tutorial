# ===================================================================
# Google Cloud Function Deployment with Terraform
# ===================================================================

terraform {
  required_version = ">= 1.0"
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

provider "google" {
  project = var.project_id
  region  = var.region
}

# Random ID for unique naming
resource "random_id" "suffix" {
  byte_length = 4
}

# Create ZIP archive of function code
data "archive_file" "function_zip" {
  type        = "zip"
  source_dir  = "${path.module}"
  output_path = "${path.module}/function-${random_id.suffix.hex}.zip"
  excludes    = ["function-*.zip", ".terraform", "*.tf", "*.md", ".git"]
}

# Cloud Storage bucket for function source code
resource "google_storage_bucket" "function_bucket" {
  name                        = "${var.project_id}-functions-${random_id.suffix.hex}"
  location                    = var.region
  uniform_bucket_level_access = true
  force_destroy               = true

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# Upload function code to bucket
resource "google_storage_bucket_object" "function_zip" {
  name   = "source-${data.archive_file.function_zip.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_zip.output_path
}

# Cloud Function (1st generation)
resource "google_cloudfunctions_function" "function" {
  name        = var.function_name
  description = "Simple HTTP-triggered Cloud Function"
  runtime     = "nodejs20"

  # Source code
  source_archive_bucket = google_storage_bucket.function_bucket.name
  source_archive_object = google_storage_bucket_object.function_zip.name

  # Trigger
  trigger_http = true
  entry_point  = "helloWorld"

  # Configuration
  available_memory_mb   = var.memory_mb
  timeout               = var.timeout
  max_instances         = var.max_instances
  min_instances         = var.min_instances

  # Environment variables
  environment_variables = {
    ENVIRONMENT = var.environment
    REGION      = var.region
  }

  # Security
  ingress_settings = "ALLOW_ALL"  # ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }
}

# IAM policy to allow public access (unauthenticated invocations)
resource "google_cloudfunctions_function_iam_member" "invoker" {
  project        = google_cloudfunctions_function.function.project
  region         = google_cloudfunctions_function.function.region
  cloud_function = google_cloudfunctions_function.function.name

  role   = "roles/cloudfunctions.invoker"
  member = "allUsers"

  # For authenticated access, use:
  # member = "serviceAccount:your-service-account@project.iam.gserviceaccount.com"
}
