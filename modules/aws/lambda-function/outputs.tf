# Outputs for AWS Lambda Function Module

# Lambda Function
output "function_arn" {
  description = "The ARN of the Lambda function"
  value       = aws_lambda_function.this.arn
}

output "function_name" {
  description = "The name of the Lambda function"
  value       = aws_lambda_function.this.function_name
}

output "function_qualified_arn" {
  description = "The ARN identifying your Lambda function Version"
  value       = aws_lambda_function.this.qualified_arn
}

output "function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.this.version
}

output "function_last_modified" {
  description = "The date Lambda function was last modified"
  value       = aws_lambda_function.this.last_modified
}

output "function_invoke_arn" {
  description = "The ARN to be used for invoking Lambda function from API Gateway"
  value       = aws_lambda_function.this.invoke_arn
}

output "function_source_code_hash" {
  description = "Base64-encoded representation of raw SHA-256 sum of the zip file"
  value       = aws_lambda_function.this.source_code_hash
}

output "function_source_code_size" {
  description = "The size in bytes of the function .zip file"
  value       = aws_lambda_function.this.source_code_size
}

# IAM Role
output "role_arn" {
  description = "The ARN of the IAM role created for the Lambda function"
  value       = var.create_role ? aws_iam_role.lambda[0].arn : var.role_arn
}

output "role_name" {
  description = "The name of the IAM role created for the Lambda function"
  value       = var.create_role ? aws_iam_role.lambda[0].name : null
}

output "role_unique_id" {
  description = "The unique ID of the IAM role"
  value       = var.create_role ? aws_iam_role.lambda[0].unique_id : null
}

# CloudWatch Logs
output "cloudwatch_log_group_name" {
  description = "The name of the CloudWatch log group"
  value       = var.create_log_group ? aws_cloudwatch_log_group.lambda[0].name : null
}

output "cloudwatch_log_group_arn" {
  description = "The ARN of the CloudWatch log group"
  value       = var.create_log_group ? aws_cloudwatch_log_group.lambda[0].arn : null
}

# Function URL
output "function_url" {
  description = "The URL of the Lambda Function URL"
  value       = var.create_function_url ? aws_lambda_function_url.this[0].function_url : null
}

output "function_url_id" {
  description = "The Lambda Function URL generated id"
  value       = var.create_function_url ? aws_lambda_function_url.this[0].url_id : null
}

# Aliases
output "alias_arns" {
  description = "Map of alias ARNs"
  value       = { for k, v in aws_lambda_alias.this : k => v.arn }
}

output "alias_invoke_arns" {
  description = "Map of alias invoke ARNs"
  value       = { for k, v in aws_lambda_alias.this : k => v.invoke_arn }
}

# EventBridge Rules
output "eventbridge_rule_arns" {
  description = "Map of EventBridge rule ARNs"
  value       = { for k, v in aws_cloudwatch_event_rule.schedule : k => v.arn }
}

output "eventbridge_rule_ids" {
  description = "Map of EventBridge rule IDs"
  value       = { for k, v in aws_cloudwatch_event_rule.schedule : k => v.id }
}
