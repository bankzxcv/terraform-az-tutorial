# Variables for AWS Lambda Function Module

variable "function_name" {
  description = "Unique name for the Lambda function"
  type        = string
}

variable "description" {
  description = "Description of the Lambda function"
  type        = string
  default     = ""
}

variable "handler" {
  description = "Function entrypoint in your code"
  type        = string
}

variable "runtime" {
  description = "Lambda runtime"
  type        = string
}

variable "timeout" {
  description = "Amount of time Lambda function has to run in seconds"
  type        = number
  default     = 3
}

variable "memory_size" {
  description = "Amount of memory in MB your Lambda function can use at runtime"
  type        = number
  default     = 128
}

variable "reserved_concurrent_executions" {
  description = "Amount of reserved concurrent executions for this lambda function"
  type        = number
  default     = -1
}

variable "publish" {
  description = "Whether to publish creation/change as new Lambda Function Version"
  type        = bool
  default     = false
}

variable "architectures" {
  description = "Instruction set architecture for your Lambda function"
  type        = list(string)
  default     = ["x86_64"]
}

# Code Deployment
variable "filename" {
  description = "Path to the function's deployment package within the local filesystem"
  type        = string
  default     = null
}

variable "s3_bucket" {
  description = "S3 bucket location containing the function's deployment package"
  type        = string
  default     = null
}

variable "s3_key" {
  description = "S3 key of an object containing the function's deployment package"
  type        = string
  default     = null
}

variable "s3_object_version" {
  description = "Object version containing the function's deployment package"
  type        = string
  default     = null
}

variable "source_code_hash" {
  description = "Used to trigger updates when file contents change"
  type        = string
  default     = null
}

# IAM
variable "create_role" {
  description = "Whether to create IAM role for Lambda function"
  type        = bool
  default     = true
}

variable "role_arn" {
  description = "ARN of IAM role to attach to the Lambda function (if create_role is false)"
  type        = string
  default     = null
}

variable "policy" {
  description = "Additional policy document as JSON to attach to the Lambda function role"
  type        = string
  default     = null
}

variable "additional_policy_arns" {
  description = "List of additional policy ARNs to attach to Lambda function role"
  type        = list(string)
  default     = []
}

# VPC
variable "vpc_config" {
  description = "VPC configuration for the Lambda function"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

# Environment
variable "environment_variables" {
  description = "Map of environment variables to set for the Lambda function"
  type        = map(string)
  default     = {}
}

# Tracing
variable "tracing_mode" {
  description = "Tracing mode of the Lambda function (PassThrough or Active)"
  type        = string
  default     = null
}

# Layers
variable "layers" {
  description = "List of Lambda Layer Version ARNs to attach to your Lambda function"
  type        = list(string)
  default     = []
}

# Dead Letter Queue
variable "dead_letter_target_arn" {
  description = "ARN of an SNS topic or SQS queue to notify when an invocation fails"
  type        = string
  default     = null
}

# File System
variable "file_system_config" {
  description = "EFS file system configuration"
  type = object({
    arn              = string
    local_mount_path = string
  })
  default = null
}

# Image Config
variable "image_config" {
  description = "Container image configuration values that override values in the container image Dockerfile"
  type = object({
    command           = optional(list(string))
    entry_point       = optional(list(string))
    working_directory = optional(string)
  })
  default = null
}

# Ephemeral Storage
variable "ephemeral_storage_size" {
  description = "Amount of ephemeral storage (/tmp) in MB your Lambda function can use at runtime"
  type        = number
  default     = null
}

# CloudWatch Logs
variable "create_log_group" {
  description = "Whether to create a CloudWatch log group"
  type        = bool
  default     = true
}

variable "log_retention_days" {
  description = "Specifies the number of days you want to retain log events"
  type        = number
  default     = 7
}

variable "log_kms_key_id" {
  description = "KMS key ARN to use for CloudWatch log group encryption"
  type        = string
  default     = null
}

# Lambda Permissions
variable "allowed_triggers" {
  description = "Map of allowed triggers to create Lambda permissions"
  type = map(object({
    principal          = string
    action             = optional(string)
    source_arn         = optional(string)
    source_account     = optional(string)
    event_source_token = optional(string)
    qualifier          = optional(string)
  }))
  default = {}
}

# Function URL
variable "create_function_url" {
  description = "Whether to create a Lambda Function URL"
  type        = bool
  default     = false
}

variable "function_url_authorization_type" {
  description = "The type of authentication that the function URL uses (NONE or AWS_IAM)"
  type        = string
  default     = "NONE"
}

variable "function_url_qualifier" {
  description = "The alias name or $LATEST"
  type        = string
  default     = null
}

variable "function_url_cors" {
  description = "CORS configuration for the function URL"
  type = object({
    allow_credentials = optional(bool)
    allow_headers     = optional(list(string))
    allow_methods     = optional(list(string))
    allow_origins     = optional(list(string))
    expose_headers    = optional(list(string))
    max_age           = optional(number)
  })
  default = null
}

# Aliases
variable "aliases" {
  description = "Map of aliases to create"
  type = map(object({
    description      = optional(string)
    function_version = optional(string)
    routing_config = optional(object({
      additional_version_weights = map(number)
    }))
  }))
  default = {}
}

# EventBridge
variable "event_source_mapping" {
  description = "Map of EventBridge rules to create"
  type = map(object({
    description         = optional(string)
    schedule_expression = optional(string)
    event_pattern       = optional(string)
    enabled             = optional(bool)
    input               = optional(string)
    retry_policy = optional(object({
      maximum_event_age      = optional(number)
      maximum_retry_attempts = optional(number)
    }))
  }))
  default = {}
}

# Tags
variable "tags" {
  description = "A map of tags to assign to resources"
  type        = map(string)
  default     = {}
}
