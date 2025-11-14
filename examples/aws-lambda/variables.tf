# Variables for AWS Lambda Example

variable "aws_region" {
  description = "AWS region where resources will be created"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (development, staging, production)"
  type        = string
  default     = "development"

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "function_name" {
  description = "Name of the Lambda function"
  type        = string
  default     = "my-lambda-function"

  validation {
    condition     = can(regex("^[a-zA-Z0-9-_]+$", var.function_name))
    error_message = "Function name must contain only alphanumeric characters, hyphens, and underscores."
  }
}

variable "function_version" {
  description = "Version of the Lambda function"
  type        = string
  default     = "1.0.0"
}

variable "runtime" {
  description = "Lambda runtime environment"
  type        = string
  default     = "nodejs20.x"

  validation {
    condition = contains([
      "nodejs18.x",
      "nodejs20.x",
      "python3.9",
      "python3.10",
      "python3.11",
      "python3.12"
    ], var.runtime)
    error_message = "Runtime must be a supported Lambda runtime."
  }
}

variable "memory_size" {
  description = "Amount of memory in MB allocated to the Lambda function"
  type        = number
  default     = 128

  validation {
    condition     = var.memory_size >= 128 && var.memory_size <= 10240
    error_message = "Memory size must be between 128 MB and 10240 MB."
  }
}

variable "timeout" {
  description = "Function execution timeout in seconds"
  type        = number
  default     = 30

  validation {
    condition     = var.timeout >= 1 && var.timeout <= 900
    error_message = "Timeout must be between 1 and 900 seconds."
  }
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention in days"
  type        = number
  default     = 7

  validation {
    condition = contains([
      1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653
    ], var.log_retention_days)
    error_message = "Log retention days must be a valid CloudWatch Logs retention period."
  }
}

variable "tracing_mode" {
  description = "X-Ray tracing mode (Active or PassThrough)"
  type        = string
  default     = "PassThrough"

  validation {
    condition     = contains(["Active", "PassThrough"], var.tracing_mode)
    error_message = "Tracing mode must be Active or PassThrough."
  }
}

variable "environment_variables" {
  description = "Environment variables for the Lambda function"
  type        = map(string)
  default     = {}
}

variable "enable_function_url" {
  description = "Enable Lambda Function URL for direct HTTP access"
  type        = bool
  default     = true
}

variable "enable_api_gateway" {
  description = "Enable API Gateway integration"
  type        = bool
  default     = true
}

variable "api_stage_name" {
  description = "API Gateway stage name"
  type        = string
  default     = "prod"

  validation {
    condition     = can(regex("^[a-zA-Z0-9]+$", var.api_stage_name))
    error_message = "API stage name must contain only alphanumeric characters."
  }
}

variable "enable_alarms" {
  description = "Enable CloudWatch alarms for monitoring"
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional tags to apply to resources"
  type        = map(string)
  default     = {}
}
