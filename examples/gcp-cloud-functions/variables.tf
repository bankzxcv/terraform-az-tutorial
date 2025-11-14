/**
 * Variables for Cloud Function Example
 *
 * These variables allow customization of the Cloud Function deployment.
 * Set values in terraform.tfvars or via command line.
 */

# ============================================================================
# REQUIRED VARIABLES
# ============================================================================

variable "project_id" {
  description = "GCP Project ID where resources will be created"
  type        = string

  # Validation: project_id must be 6-30 characters
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Project ID must be 6-30 characters, start with a letter, and contain only lowercase letters, numbers, and hyphens."
  }
}

# ============================================================================
# OPTIONAL VARIABLES (with defaults)
# ============================================================================

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"

  # Validation: ensure it's a valid region format
  validation {
    condition     = can(regex("^[a-z]+-[a-z]+[0-9]$", var.region))
    error_message = "Region must be in the format: continent-region-number (e.g., us-central1)."
  }
}

variable "function_name" {
  description = "Name of the Cloud Function"
  type        = string
  default     = "hello-world-function"

  # Validation: function name requirements
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{0,62}[a-z0-9]$", var.function_name))
    error_message = "Function name must be 1-63 characters, start with a letter, end with a letter or number, and contain only lowercase letters, numbers, and hyphens."
  }
}

variable "function_description" {
  description = "Description of what the Cloud Function does"
  type        = string
  default     = "Simple HTTP-triggered Cloud Function for learning purposes"
}

variable "function_entry_point" {
  description = "Name of the function to execute (must match exported function in index.js)"
  type        = string
  default     = "helloWorld"

  # Available options in index.js:
  # - helloWorld: Simple greeting function
  # - processData: Data processing example
  # - healthCheck: Health check endpoint
  # - errorExample: Error handling demonstration
}

variable "function_version" {
  description = "Version number of the function (for tracking deployments)"
  type        = string
  default     = "1.0.0"

  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+\\.[0-9]+$", var.function_version))
    error_message = "Version must be in semantic versioning format: X.Y.Z"
  }
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  # Validation: only allow specific environments
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# ============================================================================
# COMPUTE RESOURCES
# ============================================================================

variable "memory" {
  description = "Memory allocated to each function instance (e.g., 128M, 256M, 512M, 1Gi, 2Gi)"
  type        = string
  default     = "256M"

  # Validation: ensure valid memory format
  validation {
    condition     = can(regex("^[0-9]+(M|Mi|G|Gi)$", var.memory))
    error_message = "Memory must be specified with unit: M, Mi, G, or Gi (e.g., 256M, 1Gi)."
  }
}

variable "timeout" {
  description = "Function execution timeout in seconds (max 540 for gen2)"
  type        = number
  default     = 60

  # Validation: timeout must be between 1 and 540 seconds
  validation {
    condition     = var.timeout >= 1 && var.timeout <= 540
    error_message = "Timeout must be between 1 and 540 seconds."
  }
}

variable "max_instances" {
  description = "Maximum number of function instances (for cost control and rate limiting)"
  type        = number
  default     = 10

  # Validation: reasonable max instances
  validation {
    condition     = var.max_instances >= 1 && var.max_instances <= 1000
    error_message = "Max instances must be between 1 and 1000."
  }
}

# ============================================================================
# SECURITY & ACCESS
# ============================================================================

variable "public_access" {
  description = "Allow unauthenticated (public) access to the function"
  type        = bool
  default     = true

  # Note: Set to false for internal/private functions
  # When false, callers must be authenticated and have cloudfunctions.invoker role
}

variable "ingress_settings" {
  description = "Ingress settings control who can call the function"
  type        = string
  default     = "ALLOW_ALL"

  # Options:
  # - ALLOW_ALL: Anyone on the internet (requires public_access = true)
  # - ALLOW_INTERNAL_ONLY: Only from within GCP (VPC, Cloud Run, etc.)
  # - ALLOW_INTERNAL_AND_GCLB: Only from GCP and Google Cloud Load Balancer

  validation {
    condition     = contains(["ALLOW_ALL", "ALLOW_INTERNAL_ONLY", "ALLOW_INTERNAL_AND_GCLB"], var.ingress_settings)
    error_message = "Ingress settings must be one of: ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB."
  }
}

# ============================================================================
# EXAMPLE CONFIGURATIONS
# ============================================================================

# Development configuration:
# environment      = "dev"
# memory           = "256M"
# timeout          = 60
# max_instances    = 5
# public_access    = true
# ingress_settings = "ALLOW_ALL"

# Staging configuration:
# environment      = "staging"
# memory           = "512M"
# timeout          = 120
# max_instances    = 10
# public_access    = false
# ingress_settings = "ALLOW_INTERNAL_AND_GCLB"

# Production configuration:
# environment      = "prod"
# memory           = "1Gi"
# timeout          = 300
# max_instances    = 100
# public_access    = false
# ingress_settings = "ALLOW_INTERNAL_AND_GCLB"
