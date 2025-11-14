/**
 * Reusable Cloud Storage Bucket Module
 *
 * This module creates a secure Cloud Storage bucket with best practices:
 * - Uniform bucket-level access
 * - Optional versioning
 * - Lifecycle policies
 * - Encryption options
 * - IAM configuration
 */

resource "google_storage_bucket" "bucket" {
  name          = var.name
  project       = var.project_id
  location      = var.location
  storage_class = var.storage_class
  force_destroy = var.force_destroy

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = var.uniform_bucket_level_access

  # Versioning
  versioning {
    enabled = var.versioning_enabled
  }

  # Lifecycle rules
  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type          = lifecycle_rule.value.action.type
        storage_class = lookup(lifecycle_rule.value.action, "storage_class", null)
      }
      condition {
        age                        = lookup(lifecycle_rule.value.condition, "age", null)
        created_before             = lookup(lifecycle_rule.value.condition, "created_before", null)
        with_state                 = lookup(lifecycle_rule.value.condition, "with_state", null)
        matches_storage_class      = lookup(lifecycle_rule.value.condition, "matches_storage_class", null)
        num_newer_versions         = lookup(lifecycle_rule.value.condition, "num_newer_versions", null)
        matches_prefix             = lookup(lifecycle_rule.value.condition, "matches_prefix", null)
        matches_suffix             = lookup(lifecycle_rule.value.condition, "matches_suffix", null)
        days_since_noncurrent_time = lookup(lifecycle_rule.value.condition, "days_since_noncurrent_time", null)
        days_since_custom_time     = lookup(lifecycle_rule.value.condition, "days_since_custom_time", null)
      }
    }
  }

  # Encryption (customer-managed encryption key)
  dynamic "encryption" {
    for_each = var.encryption_key_name != null ? [1] : []
    content {
      default_kms_key_name = var.encryption_key_name
    }
  }

  # CORS configuration
  dynamic "cors" {
    for_each = var.cors_rules
    content {
      origin          = cors.value.origin
      method          = cors.value.method
      response_header = lookup(cors.value, "response_header", [])
      max_age_seconds = lookup(cors.value, "max_age_seconds", 3600)
    }
  }

  # Website configuration
  dynamic "website" {
    for_each = var.website_config != null ? [var.website_config] : []
    content {
      main_page_suffix = lookup(website.value, "main_page_suffix", "index.html")
      not_found_page   = lookup(website.value, "not_found_page", "404.html")
    }
  }

  # Logging
  dynamic "logging" {
    for_each = var.logging_config != null ? [var.logging_config] : []
    content {
      log_bucket        = logging.value.log_bucket
      log_object_prefix = lookup(logging.value, "log_object_prefix", "")
    }
  }

  # Retention policy
  dynamic "retention_policy" {
    for_each = var.retention_policy != null ? [var.retention_policy] : []
    content {
      retention_period = retention_policy.value.retention_period
      is_locked        = lookup(retention_policy.value, "is_locked", false)
    }
  }

  # Labels
  labels = merge(
    {
      managed_by = "terraform"
    },
    var.labels
  )
}

# IAM bindings
resource "google_storage_bucket_iam_member" "members" {
  for_each = { for binding in var.iam_members : "${binding.role}-${binding.member}" => binding }

  bucket = google_storage_bucket.bucket.name
  role   = each.value.role
  member = each.value.member

  dynamic "condition" {
    for_each = lookup(each.value, "condition", null) != null ? [each.value.condition] : []
    content {
      title       = condition.value.title
      description = lookup(condition.value, "description", null)
      expression  = condition.value.expression
    }
  }
}

# Public access (if enabled)
resource "google_storage_bucket_iam_member" "public_access" {
  count = var.public_access ? 1 : 0

  bucket = google_storage_bucket.bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
