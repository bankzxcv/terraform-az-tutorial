# AWS Lambda Example with API Gateway
# This example demonstrates a complete serverless application

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "AWS Lambda Tutorial"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Example     = "lambda-api"
    }
  }
}

# Create ZIP file of Lambda function code
data "archive_file" "lambda_package" {
  type        = "zip"
  source_file = "${path.module}/index.js"
  output_path = "${path.module}/lambda_function.zip"
}

# IAM Role for Lambda Function
resource "aws_iam_role" "lambda_role" {
  name = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "${var.function_name}-role"
  }
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# CloudWatch Log Group for Lambda
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.function_name}-logs"
  }
}

# Lambda Function
resource "aws_lambda_function" "main" {
  filename         = data.archive_file.lambda_package.output_path
  function_name    = var.function_name
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  source_code_hash = data.archive_file.lambda_package.output_base64sha256
  runtime          = var.runtime

  # Function configuration
  memory_size = var.memory_size
  timeout     = var.timeout

  # Environment variables
  environment {
    variables = merge(
      {
        ENVIRONMENT      = var.environment
        FUNCTION_VERSION = var.function_version
      },
      var.environment_variables
    )
  }

  # Enable X-Ray tracing
  tracing_config {
    mode = var.tracing_mode
  }

  tags = {
    Name    = var.function_name
    Version = var.function_version
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy_attachment.lambda_basic_execution
  ]
}

# Lambda Function URL (for simple HTTP access without API Gateway)
resource "aws_lambda_function_url" "main" {
  count              = var.enable_function_url ? 1 : 0
  function_name      = aws_lambda_function.main.function_name
  authorization_type = "NONE" # Use "AWS_IAM" for authenticated access

  cors {
    allow_origins     = ["*"]
    allow_methods     = ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    allow_headers     = ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key", "X-Amz-Security-Token"]
    expose_headers    = ["Content-Length", "Date"]
    max_age           = 86400
    allow_credentials = false
  }
}

# API Gateway REST API
resource "aws_api_gateway_rest_api" "main" {
  count       = var.enable_api_gateway ? 1 : 0
  name        = "${var.function_name}-api"
  description = "API Gateway for ${var.function_name}"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${var.function_name}-api"
  }
}

# API Gateway Resource (proxy for all paths)
resource "aws_api_gateway_resource" "proxy" {
  count       = var.enable_api_gateway ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main[0].id
  parent_id   = aws_api_gateway_rest_api.main[0].root_resource_id
  path_part   = "{proxy+}"
}

# API Gateway Method (ANY for all HTTP methods)
resource "aws_api_gateway_method" "proxy" {
  count         = var.enable_api_gateway ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_resource.proxy[0].id
  http_method   = "ANY"
  authorization = "NONE"
}

# API Gateway Integration with Lambda
resource "aws_api_gateway_integration" "lambda" {
  count                   = var.enable_api_gateway ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_resource.proxy[0].id
  http_method             = aws_api_gateway_method.proxy[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.main.invoke_arn
}

# API Gateway Method for root path
resource "aws_api_gateway_method" "proxy_root" {
  count         = var.enable_api_gateway ? 1 : 0
  rest_api_id   = aws_api_gateway_rest_api.main[0].id
  resource_id   = aws_api_gateway_rest_api.main[0].root_resource_id
  http_method   = "ANY"
  authorization = "NONE"
}

# API Gateway Integration for root path
resource "aws_api_gateway_integration" "lambda_root" {
  count                   = var.enable_api_gateway ? 1 : 0
  rest_api_id             = aws_api_gateway_rest_api.main[0].id
  resource_id             = aws_api_gateway_rest_api.main[0].root_resource_id
  http_method             = aws_api_gateway_method.proxy_root[0].http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.main.invoke_arn
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "main" {
  count       = var.enable_api_gateway ? 1 : 0
  rest_api_id = aws_api_gateway_rest_api.main[0].id
  stage_name  = var.api_stage_name

  depends_on = [
    aws_api_gateway_integration.lambda,
    aws_api_gateway_integration.lambda_root
  ]

  # Force redeployment when configuration changes
  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.proxy[0].id,
      aws_api_gateway_method.proxy[0].id,
      aws_api_gateway_integration.lambda[0].id,
      aws_api_gateway_method.proxy_root[0].id,
      aws_api_gateway_integration.lambda_root[0].id
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Lambda Permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  count         = var.enable_api_gateway ? 1 : 0
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.main.function_name
  principal     = "apigateway.amazonaws.com"

  # Allow all API Gateway stages
  source_arn = "${aws_api_gateway_rest_api.main[0].execution_arn}/*/*"
}

# CloudWatch Metric Alarm for Lambda Errors
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  count               = var.enable_alarms ? 1 : 0
  alarm_name          = "${var.function_name}-errors"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Sum"
  threshold           = "5"
  alarm_description   = "Alert when Lambda function errors exceed threshold"

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }

  tags = {
    Name = "${var.function_name}-errors-alarm"
  }
}

# CloudWatch Metric Alarm for Lambda Duration
resource "aws_cloudwatch_metric_alarm" "lambda_duration" {
  count               = var.enable_alarms ? 1 : 0
  alarm_name          = "${var.function_name}-duration"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "Duration"
  namespace           = "AWS/Lambda"
  period              = "300"
  statistic           = "Average"
  threshold           = var.timeout * 1000 * 0.8 # 80% of timeout

  alarm_description = "Alert when Lambda function duration is high"

  dimensions = {
    FunctionName = aws_lambda_function.main.function_name
  }

  tags = {
    Name = "${var.function_name}-duration-alarm"
  }
}
