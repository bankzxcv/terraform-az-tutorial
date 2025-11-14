# Variables for simple deployment example

variable "namespace" {
  description = "Kubernetes namespace"
  type        = string
  default     = "demo-app"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production"
  }
}

variable "app_version" {
  description = "Application version"
  type        = string
  default     = "1.0.0"
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "info"

  validation {
    condition     = contains(["debug", "info", "warn", "error"], var.log_level)
    error_message = "Log level must be debug, info, warn, or error"
  }
}

variable "image_registry" {
  description = "Container image registry"
  type        = string
  default     = "docker.io"
}

variable "image_name" {
  description = "Container image name"
  type        = string
  default     = "demo-app"
}

variable "replicas" {
  description = "Number of replicas"
  type        = number
  default     = 3

  validation {
    condition     = var.replicas >= 1 && var.replicas <= 100
    error_message = "Replicas must be between 1 and 100"
  }
}

variable "min_replicas" {
  description = "Minimum number of replicas for HPA"
  type        = number
  default     = 3
}

variable "max_replicas" {
  description = "Maximum number of replicas for HPA"
  type        = number
  default     = 10
}

variable "cpu_request" {
  description = "CPU request"
  type        = string
  default     = "250m"
}

variable "cpu_limit" {
  description = "CPU limit"
  type        = string
  default     = "500m"
}

variable "memory_request" {
  description = "Memory request"
  type        = string
  default     = "256Mi"
}

variable "memory_limit" {
  description = "Memory limit"
  type        = string
  default     = "512Mi"
}

variable "target_cpu_utilization" {
  description = "Target CPU utilization percentage for HPA"
  type        = number
  default     = 70

  validation {
    condition     = var.target_cpu_utilization > 0 && var.target_cpu_utilization <= 100
    error_message = "Target CPU utilization must be between 1 and 100"
  }
}

variable "target_memory_utilization" {
  description = "Target memory utilization percentage for HPA"
  type        = number
  default     = 80

  validation {
    condition     = var.target_memory_utilization > 0 && var.target_memory_utilization <= 100
    error_message = "Target memory utilization must be between 1 and 100"
  }
}

variable "create_load_balancer" {
  description = "Create LoadBalancer service"
  type        = bool
  default     = false
}

variable "load_balancer_annotations" {
  description = "Annotations for LoadBalancer service"
  type        = map(string)
  default     = {}
}

# Cloud-specific variables (uncomment as needed)

# AKS
# variable "cluster_endpoint" {
#   description = "AKS cluster endpoint"
#   type        = string
# }

# variable "client_certificate" {
#   description = "AKS client certificate"
#   type        = string
#   sensitive   = true
# }

# variable "client_key" {
#   description = "AKS client key"
#   type        = string
#   sensitive   = true
# }

# variable "cluster_ca_certificate" {
#   description = "AKS cluster CA certificate"
#   type        = string
#   sensitive   = true
# }

# EKS / GKE
# variable "cluster_endpoint" {
#   description = "Cluster endpoint"
#   type        = string
# }

# variable "cluster_auth_token" {
#   description = "Cluster auth token"
#   type        = string
#   sensitive   = true
# }

# variable "cluster_ca_certificate" {
#   description = "Cluster CA certificate"
#   type        = string
#   sensitive   = true
# }
