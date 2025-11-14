variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "name" {
  description = "Name of the bucket (must be globally unique)"
  type        = string
}

variable "location" {
  description = "Bucket location (US, EU, ASIA, or specific region)"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Storage class (STANDARD, NEARLINE, COLDLINE, ARCHIVE)"
  type        = string
  default     = "STANDARD"

  validation {
    condition     = contains(["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"], var.storage_class)
    error_message = "Storage class must be one of: STANDARD, NEARLINE, COLDLINE, ARCHIVE."
  }
}

variable "uniform_bucket_level_access" {
  description = "Enable uniform bucket-level access"
  type        = bool
  default     = true
}

variable "versioning_enabled" {
  description = "Enable object versioning"
  type        = bool
  default     = false
}

variable "force_destroy" {
  description = "Allow deletion of bucket even with objects"
  type        = bool
  default     = false
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for the bucket"
  type = list(object({
    action = object({
      type          = string
      storage_class = optional(string)
    })
    condition = object({
      age                        = optional(number)
      created_before             = optional(string)
      with_state                 = optional(string)
      matches_storage_class      = optional(list(string))
      num_newer_versions         = optional(number)
      matches_prefix             = optional(list(string))
      matches_suffix             = optional(list(string))
      days_since_noncurrent_time = optional(number)
      days_since_custom_time     = optional(number)
    })
  }))
  default = []
}

variable "encryption_key_name" {
  description = "KMS key name for customer-managed encryption"
  type        = string
  default     = null
}

variable "cors_rules" {
  description = "CORS rules for the bucket"
  type = list(object({
    origin          = list(string)
    method          = list(string)
    response_header = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

variable "website_config" {
  description = "Website configuration for static hosting"
  type = object({
    main_page_suffix = optional(string)
    not_found_page   = optional(string)
  })
  default = null
}

variable "logging_config" {
  description = "Logging configuration"
  type = object({
    log_bucket        = string
    log_object_prefix = optional(string)
  })
  default = null
}

variable "retention_policy" {
  description = "Retention policy for objects"
  type = object({
    retention_period = number
    is_locked        = optional(bool)
  })
  default = null
}

variable "iam_members" {
  description = "IAM members and their roles"
  type = list(object({
    role   = string
    member = string
    condition = optional(object({
      title       = string
      description = optional(string)
      expression  = string
    }))
  }))
  default = []
}

variable "public_access" {
  description = "Enable public read access to all objects"
  type        = bool
  default     = false
}

variable "labels" {
  description = "Labels to apply to the bucket"
  type        = map(string)
  default     = {}
}
