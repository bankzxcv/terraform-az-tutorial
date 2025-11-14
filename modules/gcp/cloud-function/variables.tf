variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "name" {
  description = "Name of the Cloud Function"
  type        = string
}

variable "description" {
  description = "Description of the function"
  type        = string
  default     = ""
}

variable "runtime" {
  description = "Runtime environment (nodejs18, nodejs20, python39, python310, go119, etc.)"
  type        = string
  default     = "nodejs20"
}

variable "entry_point" {
  description = "Name of the function to execute"
  type        = string
}

variable "source_bucket" {
  description = "Cloud Storage bucket containing source code"
  type        = string
}

variable "source_object" {
  description = "Cloud Storage object containing source code"
  type        = string
}

variable "memory" {
  description = "Memory available to function (e.g., 256M, 512M, 1Gi)"
  type        = string
  default     = "256M"
}

variable "timeout" {
  description = "Function timeout in seconds"
  type        = number
  default     = 60
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 3
}

variable "environment_variables" {
  description = "Environment variables for the function"
  type        = map(string)
  default     = {}
}

variable "build_environment_variables" {
  description = "Environment variables for build process"
  type        = map(string)
  default     = {}
}

variable "secret_environment_variables" {
  description = "Secret environment variables from Secret Manager"
  type = list(object({
    key        = string
    project_id = string
    secret     = string
    version    = string
  }))
  default = []
}

variable "service_account_email" {
  description = "Service account email for function execution"
  type        = string
  default     = null
}

variable "ingress_settings" {
  description = "Ingress settings (ALLOW_ALL, ALLOW_INTERNAL_ONLY, ALLOW_INTERNAL_AND_GCLB)"
  type        = string
  default     = "ALLOW_ALL"
}

variable "allow_unauthenticated" {
  description = "Allow unauthenticated invocations"
  type        = bool
  default     = false
}

variable "invoker_members" {
  description = "List of members who can invoke the function"
  type        = list(string)
  default     = []
}

variable "vpc_connector" {
  description = "VPC connector name for private resource access"
  type        = string
  default     = null
}

variable "vpc_egress_settings" {
  description = "VPC egress settings (ALL_TRAFFIC or PRIVATE_RANGES_ONLY)"
  type        = string
  default     = "PRIVATE_RANGES_ONLY"
}

variable "labels" {
  description = "Labels to apply to the function"
  type        = map(string)
  default     = {}
}
