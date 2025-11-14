# ===================================================================
# Terraform Variables for AWS Lambda Deployment
# ===================================================================

variable "aws_region" {
  description = "AWS region for all resources"
  type        = string
  default     = "us-east-1"

  # COMMON REGIONS:
  # - us-east-1      (US East, N. Virginia) - Usually cheapest
  # - us-west-2      (US West, Oregon)
  # - eu-west-1      (Europe, Ireland)
  # - ap-southeast-1 (Asia Pacific, Singapore)
}

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "simple-http-lambda"

  validation {
    condition     = length(var.function_name) > 0 && length(var.function_name) <= 64
    error_message = "Function name must be 1-64 characters."
  }
}

variable "memory_size" {
  description = "Memory allocated to Lambda function (MB)"
  type        = number
  default     = 512

  # OPTIONS: 128 to 10,240 MB
  # Memory affects CPU allocation (1,769 MB = 1 vCPU)
  # More memory = More CPU = Faster execution = Higher cost
  # Optimal: 512-1024 MB for most functions

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 and 10,240 MB."
  }
}

variable "timeout" {
  description = "Function timeout in seconds"
  type        = number
  default     = 30

  # OPTIONS: 3 to 900 seconds (15 minutes)
  # Default: 3 seconds
  # Set based on expected execution time

  validation {
    condition     = var.timeout >= 3 && var.timeout <= 900
    error_message = "Timeout must be between 3 and 900 seconds."
  }
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 7

  # OPTIONS: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
  # Shorter retention = Lower costs
  # Production: 30-90 days typical

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653], var.log_retention_days)
    error_message = "Invalid log retention days."
  }
}

variable "log_level" {
  description = "Application log level"
  type        = string
  default     = "INFO"

  validation {
    condition     = contains(["DEBUG", "INFO", "WARN", "ERROR"], var.log_level)
    error_message = "Log level must be DEBUG, INFO, WARN, or ERROR."
  }
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, test, staging, or prod."
  }
}

variable "tags" {
  description = "Additional tags for resources"
  type        = map(string)
  default = {
    Owner      = "DevSecOps Team"
    CostCenter = "Training"
  }
}

# OPTIONAL: Uncomment if using VPC
# variable "subnet_ids" {
#   description = "Subnet IDs for Lambda in VPC"
#   type        = list(string)
#   default     = []
# }
#
# variable "security_group_ids" {
#   description = "Security group IDs for Lambda in VPC"
#   type        = list(string)
#   default     = []
# }
