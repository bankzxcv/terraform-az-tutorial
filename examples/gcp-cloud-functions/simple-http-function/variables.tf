variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "function_name" {
  description = "Name of the Cloud Function"
  type        = string
  default     = "simple-http-function"
}

variable "memory_mb" {
  description = "Memory in MB"
  type        = number
  default     = 256
}

variable "timeout" {
  description = "Timeout in seconds"
  type        = number
  default     = 60
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 100
}

variable "min_instances" {
  description = "Minimum number of instances (0 for scale to zero)"
  type        = number
  default     = 0
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
