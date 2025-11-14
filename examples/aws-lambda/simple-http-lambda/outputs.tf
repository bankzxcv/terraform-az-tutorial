# ===================================================================
# Terraform Outputs for AWS Lambda Deployment
# ===================================================================

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.function.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.function.arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda_role.arn
}

output "api_endpoint" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.lambda_api.api_endpoint
}

output "function_url" {
  description = "Full URL to invoke the function"
  value       = "${aws_apigatewayv2_api.lambda_api.api_endpoint}/hello?name=World"
}

output "cloudwatch_log_group" {
  description = "CloudWatch Log Group name"
  value       = aws_cloudwatch_log_group.lambda_logs.name
}

output "deployment_instructions" {
  description = "Instructions for testing and monitoring"
  value       = <<-EOT

  ================================================================================
  AWS Lambda Deployment Successful!
  ================================================================================

  Function Name: ${aws_lambda_function.function.function_name}
  API Endpoint:  ${aws_apigatewayv2_api.lambda_api.api_endpoint}/hello

  1. TEST THE FUNCTION:

     curl "${aws_apigatewayv2_api.lambda_api.api_endpoint}/hello?name=John"

  2. VIEW LOGS:

     aws logs tail ${aws_cloudwatch_log_group.lambda_logs.name} --follow

  3. INVOKE DIRECTLY:

     aws lambda invoke --function-name ${aws_lambda_function.function.function_name} \
       --payload '{"queryStringParameters":{"name":"John"}}' \
       response.json && cat response.json

  4. MONITOR IN AWS CONSOLE:

     Lambda: https://console.aws.amazon.com/lambda/home?region=${data.aws_region.current.name}#/functions/${aws_lambda_function.function.function_name}
     Logs:   https://console.aws.amazon.com/cloudwatch/home?region=${data.aws_region.current.name}#logsV2:log-groups/log-group/${replace(aws_cloudwatch_log_group.lambda_logs.name, "/", "$252F")}

  ================================================================================

  EOT
}
