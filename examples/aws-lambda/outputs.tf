# Outputs for AWS Lambda Example

# Lambda Function Outputs
output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.main.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.main.arn
}

output "lambda_function_version" {
  description = "Latest published version of the Lambda function"
  value       = aws_lambda_function.main.version
}

output "lambda_function_last_modified" {
  description = "Date the Lambda function was last modified"
  value       = aws_lambda_function.main.last_modified
}

output "lambda_role_arn" {
  description = "ARN of the IAM role for the Lambda function"
  value       = aws_iam_role.lambda_role.arn
}

# Lambda Function URL Outputs
output "lambda_function_url" {
  description = "URL endpoint for the Lambda function (if enabled)"
  value       = var.enable_function_url ? aws_lambda_function_url.main[0].function_url : null
}

output "lambda_function_url_id" {
  description = "ID of the Lambda function URL configuration"
  value       = var.enable_function_url ? aws_lambda_function_url.main[0].url_id : null
}

# API Gateway Outputs
output "api_gateway_id" {
  description = "ID of the API Gateway REST API"
  value       = var.enable_api_gateway ? aws_api_gateway_rest_api.main[0].id : null
}

output "api_gateway_url" {
  description = "URL of the API Gateway endpoint"
  value       = var.enable_api_gateway ? aws_api_gateway_deployment.main[0].invoke_url : null
}

output "api_gateway_stage" {
  description = "API Gateway stage name"
  value       = var.enable_api_gateway ? var.api_stage_name : null
}

output "api_gateway_execution_arn" {
  description = "Execution ARN of the API Gateway"
  value       = var.enable_api_gateway ? aws_api_gateway_rest_api.main[0].execution_arn : null
}

# CloudWatch Logs Outputs
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "cloudwatch_log_group_arn" {
  description = "ARN of the CloudWatch Log Group"
  value       = aws_cloudwatch_log_group.lambda_logs.arn
}

# CloudWatch Alarms Outputs
output "error_alarm_name" {
  description = "Name of the CloudWatch alarm for Lambda errors"
  value       = var.enable_alarms ? aws_cloudwatch_metric_alarm.lambda_errors[0].alarm_name : null
}

output "duration_alarm_name" {
  description = "Name of the CloudWatch alarm for Lambda duration"
  value       = var.enable_alarms ? aws_cloudwatch_metric_alarm.lambda_duration[0].alarm_name : null
}

# Useful Commands
output "test_commands" {
  description = "Commands to test the Lambda function"
  value = {
    # Test using AWS CLI
    invoke_lambda = "aws lambda invoke --function-name ${aws_lambda_function.main.function_name} --payload '{\"name\": \"Terraform\"}' response.json && cat response.json"

    # Test using Function URL (if enabled)
    curl_function_url = var.enable_function_url ? "curl ${aws_lambda_function_url.main[0].function_url}" : "Function URL not enabled"

    # Test using API Gateway (if enabled)
    curl_api_gateway = var.enable_api_gateway ? "curl ${aws_api_gateway_deployment.main[0].invoke_url}/" : "API Gateway not enabled"

    # View logs
    view_logs = "aws logs tail /aws/lambda/${aws_lambda_function.main.function_name} --follow"

    # Get function info
    get_function = "aws lambda get-function --function-name ${aws_lambda_function.main.function_name}"
  }
}

# Quick Start Examples
output "quick_start" {
  description = "Quick start examples for using the Lambda function"
  value = {
    description = "Test the Lambda function using these examples:"

    direct_invocation = {
      description = "Invoke Lambda directly using AWS CLI"
      command     = "aws lambda invoke --function-name ${aws_lambda_function.main.function_name} --payload '{\"name\": \"Terraform\"}' response.json"
    }

    http_get = var.enable_function_url ? {
      description = "HTTP GET request using Function URL"
      command     = "curl '${aws_lambda_function_url.main[0].function_url}?name=Terraform'"
    } : null

    http_post = var.enable_function_url ? {
      description = "HTTP POST request using Function URL"
      command     = "curl -X POST ${aws_lambda_function_url.main[0].function_url} -H 'Content-Type: application/json' -d '{\"title\": \"Learn Lambda\", \"priority\": \"high\"}'"
    } : null

    api_gateway_get = var.enable_api_gateway ? {
      description = "HTTP GET via API Gateway"
      command     = "curl '${aws_api_gateway_deployment.main[0].invoke_url}/?name=Terraform'"
    } : null

    view_logs = {
      description = "Stream CloudWatch logs in real-time"
      command     = "aws logs tail ${aws_cloudwatch_log_group.lambda_logs.name} --follow"
    }
  }
}

# Connection Information
output "connection_info" {
  description = "Connection information summary"
  value = {
    function_name = aws_lambda_function.main.function_name
    region        = var.aws_region
    environment   = var.environment

    endpoints = {
      lambda_function_url = var.enable_function_url ? aws_lambda_function_url.main[0].function_url : "Not enabled"
      api_gateway_url     = var.enable_api_gateway ? aws_api_gateway_deployment.main[0].invoke_url : "Not enabled"
    }

    monitoring = {
      cloudwatch_logs = "https://console.aws.amazon.com/cloudwatch/home?region=${var.aws_region}#logsV2:log-groups/log-group/${replace(aws_cloudwatch_log_group.lambda_logs.name, "/", "$252F")}"
      lambda_console  = "https://console.aws.amazon.com/lambda/home?region=${var.aws_region}#/functions/${aws_lambda_function.main.function_name}"
    }
  }
}
