# Variables for AWS S3 Bucket Module

variable "bucket_name" {
  description = "Name of the S3 bucket (must be globally unique)"
  type        = string
  default     = null
}

variable "bucket_prefix" {
  description = "Creates a unique bucket name beginning with the specified prefix"
  type        = string
  default     = null
}

variable "force_destroy" {
  description = "Whether to allow force destruction of the bucket"
  type        = bool
  default     = false
}

# Versioning
variable "versioning_enabled" {
  description = "Enable versioning for the bucket"
  type        = bool
  default     = false
}

variable "versioning_mfa_delete" {
  description = "Enable MFA delete for the bucket"
  type        = bool
  default     = false
}

# Encryption
variable "encryption" {
  description = "Server-side encryption configuration"
  type = object({
    algorithm          = string
    key_arn            = optional(string)
    bucket_key_enabled = optional(bool, true)
  })
  default = null
}

# Public Access
variable "block_public_access" {
  description = "Block all public access to the bucket"
  type        = bool
  default     = true
}

# Bucket Policy
variable "policy" {
  description = "JSON policy document for the bucket"
  type        = string
  default     = null
}

# Lifecycle Rules
variable "lifecycle_rules" {
  description = "List of lifecycle rules for the bucket"
  type = list(object({
    id      = string
    enabled = bool
    filter = optional(object({
      prefix = optional(string)
      tags   = optional(map(string))
    }))
    transitions = optional(list(object({
      days          = optional(number)
      date          = optional(string)
      storage_class = string
    })))
    expiration = optional(object({
      days                         = optional(number)
      date                         = optional(string)
      expired_object_delete_marker = optional(bool)
    }))
    noncurrent_version_transitions = optional(list(object({
      days          = number
      storage_class = string
    })))
    noncurrent_version_expiration = optional(object({
      days = number
    }))
    abort_incomplete_multipart_upload_days = optional(number)
  }))
  default = []
}

# CORS
variable "cors_rules" {
  description = "List of CORS rules for the bucket"
  type = list(object({
    id              = optional(string)
    allowed_headers = optional(list(string))
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

# Website
variable "website_config" {
  description = "Static website hosting configuration"
  type = object({
    index_document = string
    error_document = optional(string)
    routing_rules = optional(list(object({
      condition = object({
        key_prefix_equals               = optional(string)
        http_error_code_returned_equals = optional(string)
      })
      redirect = object({
        host_name               = optional(string)
        http_redirect_code      = optional(string)
        protocol                = optional(string)
        replace_key_prefix_with = optional(string)
        replace_key_with        = optional(string)
      })
    })))
  })
  default = null
}

# Logging
variable "logging_config" {
  description = "Logging configuration for the bucket"
  type = object({
    target_bucket = string
    target_prefix = string
  })
  default = null
}

# Object Lock
variable "object_lock_config" {
  description = "Object Lock configuration"
  type = object({
    rule = optional(object({
      default_retention = object({
        mode  = string
        days  = optional(number)
        years = optional(number)
      })
    }))
  })
  default = null
}

# Replication
variable "replication_config" {
  description = "Replication configuration"
  type = object({
    role_arn = string
    rules = list(object({
      id       = string
      status   = string
      priority = optional(number)
      filter = optional(object({
        prefix = optional(string)
        tags   = optional(map(string))
      }))
      destination = object({
        bucket        = string
        storage_class = optional(string)
        replication_time = optional(object({
          minutes = number
        }))
        metrics = optional(object({
          minutes = number
        }))
        encryption_configuration = optional(object({
          replica_kms_key_id = string
        }))
      })
      delete_marker_replication = optional(object({
        status = string
      }))
    }))
  })
  default = null
}

# Intelligent Tiering
variable "intelligent_tiering_configs" {
  description = "Map of Intelligent-Tiering configurations"
  type = map(object({
    status = string
    filter = optional(object({
      prefix = optional(string)
      tags   = optional(map(string))
    }))
    tierings = list(object({
      access_tier = string
      days        = number
    }))
  }))
  default = {}
}

# Inventory
variable "inventory_configs" {
  description = "Map of inventory configurations"
  type = map(object({
    included_object_versions = string
    schedule = object({
      frequency = string
    })
    destination = object({
      bucket_arn = string
      format     = string
      prefix     = optional(string)
      encryption = optional(object({
        sse_s3 = optional(object({}))
        sse_kms = optional(object({
          key_id = string
        }))
      }))
    })
    optional_fields = optional(list(string))
    filter = optional(object({
      prefix = string
    }))
  }))
  default = {}
}

# Request Payment
variable "request_payer" {
  description = "Specifies who pays for the download and request fees (BucketOwner or Requester)"
  type        = string
  default     = null
}

# Acceleration
variable "acceleration_status" {
  description = "Transfer Acceleration status (Enabled or Suspended)"
  type        = string
  default     = null
}

# Tags
variable "tags" {
  description = "Map of tags to assign to the bucket"
  type        = map(string)
  default     = {}
}
