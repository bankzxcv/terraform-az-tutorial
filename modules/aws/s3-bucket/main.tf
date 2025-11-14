# Reusable AWS S3 Bucket Module
# This module creates an S3 bucket with security best practices

# S3 Bucket
resource "aws_s3_bucket" "this" {
  bucket        = var.bucket_name
  bucket_prefix = var.bucket_prefix
  force_destroy = var.force_destroy

  tags = var.tags
}

# Versioning
resource "aws_s3_bucket_versioning" "this" {
  count  = var.versioning_enabled ? 1 : 0
  bucket = aws_s3_bucket.this.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = var.versioning_mfa_delete ? "Enabled" : "Disabled"
  }
}

# Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "this" {
  count  = var.encryption != null ? 1 : 0
  bucket = aws_s3_bucket.this.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.encryption.algorithm
      kms_master_key_id = var.encryption.algorithm == "aws:kms" ? var.encryption.key_arn : null
    }
    bucket_key_enabled = var.encryption.bucket_key_enabled
  }
}

# Public Access Block
resource "aws_s3_bucket_public_access_block" "this" {
  bucket = aws_s3_bucket.this.id

  block_public_acls       = var.block_public_access
  block_public_policy     = var.block_public_access
  ignore_public_acls      = var.block_public_access
  restrict_public_buckets = var.block_public_access
}

# Bucket Policy
resource "aws_s3_bucket_policy" "this" {
  count  = var.policy != null ? 1 : 0
  bucket = aws_s3_bucket.this.id
  policy = var.policy

  depends_on = [aws_s3_bucket_public_access_block.this]
}

# Lifecycle Rules
resource "aws_s3_bucket_lifecycle_configuration" "this" {
  count  = length(var.lifecycle_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.enabled ? "Enabled" : "Disabled"

      dynamic "filter" {
        for_each = lookup(rule.value, "filter", null) != null ? [rule.value.filter] : []
        content {
          prefix = lookup(filter.value, "prefix", null)

          dynamic "tag" {
            for_each = lookup(filter.value, "tags", {})
            content {
              key   = tag.key
              value = tag.value
            }
          }
        }
      }

      dynamic "transition" {
        for_each = lookup(rule.value, "transitions", [])
        content {
          days          = lookup(transition.value, "days", null)
          date          = lookup(transition.value, "date", null)
          storage_class = transition.value.storage_class
        }
      }

      dynamic "expiration" {
        for_each = lookup(rule.value, "expiration", null) != null ? [rule.value.expiration] : []
        content {
          days = lookup(expiration.value, "days", null)
          date = lookup(expiration.value, "date", null)
          expired_object_delete_marker = lookup(expiration.value, "expired_object_delete_marker", null)
        }
      }

      dynamic "noncurrent_version_transition" {
        for_each = lookup(rule.value, "noncurrent_version_transitions", [])
        content {
          noncurrent_days = noncurrent_version_transition.value.days
          storage_class   = noncurrent_version_transition.value.storage_class
        }
      }

      dynamic "noncurrent_version_expiration" {
        for_each = lookup(rule.value, "noncurrent_version_expiration", null) != null ? [rule.value.noncurrent_version_expiration] : []
        content {
          noncurrent_days = noncurrent_version_expiration.value.days
        }
      }

      dynamic "abort_incomplete_multipart_upload" {
        for_each = lookup(rule.value, "abort_incomplete_multipart_upload_days", null) != null ? [1] : []
        content {
          days_after_initiation = rule.value.abort_incomplete_multipart_upload_days
        }
      }
    }
  }
}

# CORS Configuration
resource "aws_s3_bucket_cors_configuration" "this" {
  count  = length(var.cors_rules) > 0 ? 1 : 0
  bucket = aws_s3_bucket.this.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    content {
      id              = lookup(cors_rule.value, "id", null)
      allowed_headers = lookup(cors_rule.value, "allowed_headers", null)
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = lookup(cors_rule.value, "expose_headers", null)
      max_age_seconds = lookup(cors_rule.value, "max_age_seconds", null)
    }
  }
}

# Website Configuration
resource "aws_s3_bucket_website_configuration" "this" {
  count  = var.website_config != null ? 1 : 0
  bucket = aws_s3_bucket.this.id

  index_document {
    suffix = var.website_config.index_document
  }

  dynamic "error_document" {
    for_each = lookup(var.website_config, "error_document", null) != null ? [var.website_config.error_document] : []
    content {
      key = error_document.value
    }
  }

  dynamic "routing_rule" {
    for_each = lookup(var.website_config, "routing_rules", [])
    content {
      condition {
        key_prefix_equals             = lookup(routing_rule.value.condition, "key_prefix_equals", null)
        http_error_code_returned_equals = lookup(routing_rule.value.condition, "http_error_code_returned_equals", null)
      }
      redirect {
        host_name               = lookup(routing_rule.value.redirect, "host_name", null)
        http_redirect_code      = lookup(routing_rule.value.redirect, "http_redirect_code", null)
        protocol                = lookup(routing_rule.value.redirect, "protocol", null)
        replace_key_prefix_with = lookup(routing_rule.value.redirect, "replace_key_prefix_with", null)
        replace_key_with        = lookup(routing_rule.value.redirect, "replace_key_with", null)
      }
    }
  }
}

# Logging
resource "aws_s3_bucket_logging" "this" {
  count  = var.logging_config != null ? 1 : 0
  bucket = aws_s3_bucket.this.id

  target_bucket = var.logging_config.target_bucket
  target_prefix = var.logging_config.target_prefix
}

# Object Lock Configuration
resource "aws_s3_bucket_object_lock_configuration" "this" {
  count  = var.object_lock_config != null ? 1 : 0
  bucket = aws_s3_bucket.this.id

  object_lock_enabled = "Enabled"

  dynamic "rule" {
    for_each = lookup(var.object_lock_config, "rule", null) != null ? [var.object_lock_config.rule] : []
    content {
      default_retention {
        mode  = rule.value.default_retention.mode
        days  = lookup(rule.value.default_retention, "days", null)
        years = lookup(rule.value.default_retention, "years", null)
      }
    }
  }
}

# Replication Configuration
resource "aws_s3_bucket_replication_configuration" "this" {
  count  = var.replication_config != null ? 1 : 0
  bucket = aws_s3_bucket.this.id
  role   = var.replication_config.role_arn

  dynamic "rule" {
    for_each = var.replication_config.rules
    content {
      id       = rule.value.id
      priority = lookup(rule.value, "priority", null)
      status   = rule.value.status

      dynamic "filter" {
        for_each = lookup(rule.value, "filter", null) != null ? [rule.value.filter] : []
        content {
          prefix = lookup(filter.value, "prefix", null)

          dynamic "tag" {
            for_each = lookup(filter.value, "tags", {})
            content {
              key   = tag.key
              value = tag.value
            }
          }
        }
      }

      destination {
        bucket        = rule.value.destination.bucket
        storage_class = lookup(rule.value.destination, "storage_class", null)

        dynamic "replication_time" {
          for_each = lookup(rule.value.destination, "replication_time", null) != null ? [1] : []
          content {
            status  = "Enabled"
            minutes = rule.value.destination.replication_time.minutes
          }
        }

        dynamic "metrics" {
          for_each = lookup(rule.value.destination, "metrics", null) != null ? [1] : []
          content {
            status  = "Enabled"
            minutes = rule.value.destination.metrics.minutes
          }
        }

        dynamic "encryption_configuration" {
          for_each = lookup(rule.value.destination, "encryption_configuration", null) != null ? [1] : []
          content {
            replica_kms_key_id = rule.value.destination.encryption_configuration.replica_kms_key_id
          }
        }
      }

      dynamic "delete_marker_replication" {
        for_each = lookup(rule.value, "delete_marker_replication", null) != null ? [1] : []
        content {
          status = rule.value.delete_marker_replication.status
        }
      }
    }
  }

  depends_on = [aws_s3_bucket_versioning.this]
}

# Intelligent Tiering
resource "aws_s3_bucket_intelligent_tiering_configuration" "this" {
  for_each = var.intelligent_tiering_configs

  bucket = aws_s3_bucket.this.id
  name   = each.key
  status = each.value.status

  dynamic "filter" {
    for_each = lookup(each.value, "filter", null) != null ? [each.value.filter] : []
    content {
      prefix = lookup(filter.value, "prefix", null)

      dynamic "tags" {
        for_each = lookup(filter.value, "tags", {})
        content {
          key   = tags.key
          value = tags.value
        }
      }
    }
  }

  dynamic "tiering" {
    for_each = each.value.tierings
    content {
      access_tier = tiering.value.access_tier
      days        = tiering.value.days
    }
  }
}

# Inventory Configuration
resource "aws_s3_bucket_inventory" "this" {
  for_each = var.inventory_configs

  bucket = aws_s3_bucket.this.id
  name   = each.key

  included_object_versions = each.value.included_object_versions
  schedule {
    frequency = each.value.schedule.frequency
  }

  destination {
    bucket {
      bucket_arn = each.value.destination.bucket_arn
      format     = each.value.destination.format
      prefix     = lookup(each.value.destination, "prefix", null)

      dynamic "encryption" {
        for_each = lookup(each.value.destination, "encryption", null) != null ? [1] : []
        content {
          sse_s3 = lookup(each.value.destination.encryption, "sse_s3", null) != null ? {} : null

          dynamic "sse_kms" {
            for_each = lookup(each.value.destination.encryption, "sse_kms", null) != null ? [1] : []
            content {
              key_id = each.value.destination.encryption.sse_kms.key_id
            }
          }
        }
      }
    }
  }

  optional_fields = lookup(each.value, "optional_fields", null)

  dynamic "filter" {
    for_each = lookup(each.value, "filter", null) != null ? [each.value.filter] : []
    content {
      prefix = filter.value.prefix
    }
  }
}

# Request Payment
resource "aws_s3_bucket_request_payment_configuration" "this" {
  count  = var.request_payer != null ? 1 : 0
  bucket = aws_s3_bucket.this.id
  payer  = var.request_payer
}

# Acceleration
resource "aws_s3_bucket_accelerate_configuration" "this" {
  count  = var.acceleration_status != null ? 1 : 0
  bucket = aws_s3_bucket.this.id
  status = var.acceleration_status
}
