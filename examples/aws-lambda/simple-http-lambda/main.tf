# ===================================================================
# AWS Lambda Function Deployment with Terraform
# ===================================================================
#
# This Terraform configuration deploys:
# 1. IAM Role - Execution role for Lambda function
# 2. CloudWatch Log Group - For Lambda logs
# 3. Lambda Function - The serverless function
# 4. API Gateway HTTP API - HTTP endpoint for Lambda
# 5. Lambda Permission - Allow API Gateway to invoke Lambda
#
# COST ESTIMATE:
# - IAM Role: Free
# - CloudWatch Logs: $0.50/GB (first 5GB free)
# - Lambda: First 1M requests free, then $0.20/M + $0.0000166667/GB-second
# - API Gateway: First 1M requests free (12 months), then $1.00/M requests
# - Total: <$5/month for development usage
#
# DEPLOYMENT TIME: ~2-3 minutes
#
# ===================================================================

# -------------------------------------------------------------------
# Terraform Configuration
# -------------------------------------------------------------------
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  # TAGS: Default tags applied to all resources
  default_tags {
    tags = {
      Project     = "AWS Lambda Example"
      ManagedBy   = "Terraform"
      Environment = var.environment
    }
  }
}

# -------------------------------------------------------------------
# Data Sources
# -------------------------------------------------------------------

# Get current AWS account ID
data "aws_caller_identity" "current" {}

# Get current AWS region
data "aws_region" "current" {}

# -------------------------------------------------------------------
# Lambda Deployment Package
# -------------------------------------------------------------------

# Create ZIP file from Lambda function code
# This automatically packages index.js and package.json
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/index.js"
  output_path = "${path.module}/function.zip"

  # If you have dependencies (node_modules), use source_dir instead:
  # source_dir  = "${path.module}"
  # excludes    = ["function.zip", ".terraform", "*.tf", "*.md"]
}

# -------------------------------------------------------------------
# IAM Role for Lambda Execution
# -------------------------------------------------------------------

# SECURITY: Lambda needs an execution role to run and access AWS services
# This role defines what the Lambda function is allowed to do

# Trust policy: Who can assume this role (Lambda service)
data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }

    actions = ["sts:AssumeRole"]

    # OPTIONAL: Add conditions for additional security
    # condition {
    #   test     = "StringEquals"
    #   variable = "sts:ExternalId"
    #   values   = ["your-external-id"]
    # }
  }
}

# Create IAM role
resource "aws_iam_role" "lambda_role" {
  name               = "${var.function_name}-role-${random_id.suffix.hex}"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  # OPTIONAL: Add role description
  description = "Execution role for ${var.function_name} Lambda function"

  tags = {
    Name = "${var.function_name}-role"
  }
}

# Attach basic Lambda execution policy
# This policy allows Lambda to write logs to CloudWatch
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

  # INCLUDES:
  # - logs:CreateLogGroup
  # - logs:CreateLogStream
  # - logs:PutLogEvents
}

# OPTIONAL: Attach additional policies for AWS service access
# Example: DynamoDB access
# resource "aws_iam_role_policy_attachment" "lambda_dynamodb" {
#   role       = aws_iam_role.lambda_role.name
#   policy_arn = "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
# }

# BEST PRACTICE: Create custom policy with least privilege
# data "aws_iam_policy_document" "lambda_policy" {
#   statement {
#     effect = "Allow"
#     actions = [
#       "dynamodb:GetItem",
#       "dynamodb:PutItem"
#     ]
#     resources = [
#       "arn:aws:dynamodb:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:table/my-table"
#     ]
#   }
# }
#
# resource "aws_iam_policy" "lambda_policy" {
#   name   = "${var.function_name}-policy"
#   policy = data.aws_iam_policy_document.lambda_policy.json
# }
#
# resource "aws_iam_role_policy_attachment" "lambda_custom" {
#   role       = aws_iam_role.lambda_role.name
#   policy_arn = aws_iam_policy.lambda_policy.arn
# }

# -------------------------------------------------------------------
# CloudWatch Log Group
# -------------------------------------------------------------------

# Create log group for Lambda function logs
# This allows us to control log retention and ensure logs are created
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  # RETENTION OPTIONS: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180,
  #                    365, 400, 545, 731, 1827, 3653

  tags = {
    Name = "${var.function_name}-logs"
  }
}

# -------------------------------------------------------------------
# Random ID for Unique Naming
# -------------------------------------------------------------------
resource "random_id" "suffix" {
  byte_length = 4
}

# -------------------------------------------------------------------
# Lambda Function
# -------------------------------------------------------------------

# Deploy Lambda function
resource "aws_lambda_function" "function" {
  # BASIC CONFIGURATION
  function_name = var.function_name
  description   = "Simple HTTP-triggered Lambda function for learning"
  role          = aws_iam_role.lambda_role.arn

  # CODE CONFIGURATION
  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  handler          = "index.handler"  # Format: <file>.<export>

  # RUNTIME CONFIGURATION
  runtime = "nodejs20.x"  # nodejs16.x, nodejs18.x, nodejs20.x

  # PERFORMANCE CONFIGURATION
  memory_size = var.memory_size  # 128 MB to 10,240 MB (10 GB)
  timeout     = var.timeout      # 3 seconds to 900 seconds (15 minutes)

  # ARCHITECTURE
  architectures = ["arm64"]  # ["x86_64"] or ["arm64"] (Graviton2 - 20% cheaper, 19% faster)

  # ENVIRONMENT VARIABLES
  # These are available in Lambda as process.env.KEY
  environment {
    variables = {
      ENVIRONMENT  = var.environment
      REGION       = data.aws_region.current.name
      LOG_LEVEL    = var.log_level
      NODE_OPTIONS = "--enable-source-maps"  # Better error stack traces
    }
  }

  # CLOUDWATCH LOGS
  # Logs are automatically sent to CloudWatch Logs
  # Log group created above to control retention

  # TRACING (AWS X-Ray)
  # OPTIONAL: Enable X-Ray tracing for distributed tracing
  # tracing_config {
  #   mode = "Active"  # "Active" or "PassThrough"
  # }

  # NETWORKING (VPC)
  # OPTIONAL: Run Lambda in VPC for accessing private resources
  # vpc_config {
  #   subnet_ids         = var.subnet_ids
  #   security_group_ids = var.security_group_ids
  # }
  # NOTE: VPC Lambdas have slower cold starts (~10-15 seconds)

  # DEAD LETTER QUEUE
  # OPTIONAL: Send failed async invocations to SQS or SNS
  # dead_letter_config {
  #   target_arn = aws_sqs_queue.dlq.arn
  # }

  # RESERVED CONCURRENT EXECUTIONS
  # OPTIONAL: Limit concurrent executions to prevent runaway costs
  # reserved_concurrent_executions = 10

  # EPHEMERAL STORAGE
  # ephemeral_storage {
  #   size = 512  # 512 MB to 10,240 MB (10 GB)
  # }

  # LIFECYCLE
  # Ensure log group and IAM role are created first
  depends_on = [
    aws_cloudwatch_log_group.lambda_logs,
    aws_iam_role_policy_attachment.lambda_basic
  ]

  tags = {
    Name = var.function_name
  }
}

# -------------------------------------------------------------------
# Lambda Function URL (Simple HTTP Endpoint)
# -------------------------------------------------------------------

# OPTION 1: Function URL (Simplest, no API Gateway needed)
# Uncomment to use Function URL instead of API Gateway
# resource "aws_lambda_function_url" "function_url" {
#   function_name      = aws_lambda_function.function.function_name
#   authorization_type = "NONE"  # "NONE" or "AWS_IAM"
#
#   cors {
#     allow_origins     = ["*"]
#     allow_methods     = ["GET", "POST"]
#     allow_headers     = ["Content-Type"]
#     expose_headers    = ["X-Request-Id"]
#     max_age           = 86400
#   }
# }

# -------------------------------------------------------------------
# API Gateway HTTP API (Recommended for HTTP APIs)
# -------------------------------------------------------------------

# OPTION 2: API Gateway HTTP API (More features, better for production)

# Create API Gateway HTTP API
resource "aws_apigatewayv2_api" "lambda_api" {
  name          = "${var.function_name}-api"
  protocol_type = "HTTP"  # "HTTP" or "WEBSOCKET"
  description   = "HTTP API for ${var.function_name} Lambda function"

  # CORS CONFIGURATION
  cors_configuration {
    allow_origins = ["*"]  # SECURITY: Use specific origins in production
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["Content-Type", "Authorization"]
    max_age       = 300
  }

  tags = {
    Name = "${var.function_name}-api"
  }
}

# Create default stage ($default)
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.lambda_api.id
  name        = "$default"
  auto_deploy = true  # Automatically deploy changes

  # LOGGING
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_logs.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      ip             = "$context.identity.sourceIp"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      routeKey       = "$context.routeKey"
      status         = "$context.status"
      protocol       = "$context.protocol"
      responseLength = "$context.responseLength"
      errorMessage   = "$context.error.message"
    })
  }

  # THROTTLING (Rate Limiting)
  # default_route_settings {
  #   throttling_burst_limit = 100  # Maximum concurrent requests
  #   throttling_rate_limit  = 50   # Requests per second
  # }

  tags = {
    Name = "${var.function_name}-api-stage"
  }
}

# CloudWatch Log Group for API Gateway
resource "aws_cloudwatch_log_group" "api_logs" {
  name              = "/aws/apigateway/${var.function_name}-api"
  retention_in_days = var.log_retention_days

  tags = {
    Name = "${var.function_name}-api-logs"
  }
}

# Create integration with Lambda
resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id           = aws_apigatewayv2_api.lambda_api.id
  integration_type = "AWS_PROXY"  # Lambda proxy integration

  integration_uri    = aws_lambda_function.function.invoke_arn
  integration_method = "POST"  # API Gateway always uses POST to invoke Lambda
  payload_format_version = "2.0"  # Use 2.0 for simplified event structure

  # TIMEOUT
  timeout_milliseconds = var.timeout * 1000 + 1000  # Lambda timeout + buffer
}

# Create route for GET /hello
resource "aws_apigatewayv2_route" "hello_get" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "GET /hello"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Create route for POST /hello
resource "aws_apigatewayv2_route" "hello_post" {
  api_id    = aws_apigatewayv2_api.lambda_api.id
  route_key = "POST /hello"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

# Give API Gateway permission to invoke Lambda
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.function.function_name
  principal     = "apigateway.amazonaws.com"

  # Allow invocations from this API only
  source_arn = "${aws_apigatewayv2_api.lambda_api.execution_arn}/*/*"
}

# ===================================================================
# OUTPUTS
# ===================================================================
# See outputs.tf for output definitions
#
# ===================================================================
# NEXT STEPS AFTER DEPLOYMENT
# ===================================================================
#
# 1. TEST THE FUNCTION:
#    $ curl "https://<api-id>.execute-api.<region>.amazonaws.com/hello?name=John"
#
# 2. VIEW LOGS IN CLOUDWATCH:
#    $ aws logs tail /aws/lambda/<function-name> --follow
#
#    Or in AWS Console:
#    CloudWatch → Log groups → /aws/lambda/<function-name>
#
# 3. MONITOR IN CONSOLE:
#    - Navigate to Lambda in AWS Console
#    - Click on function name
#    - View "Monitor" tab for metrics
#    - Click "View CloudWatch Logs" for detailed logs
#
# 4. UPDATE FUNCTION CODE:
#    Option A: Terraform (recommended)
#    - Edit index.js
#    - Run: terraform apply
#
#    Option B: AWS CLI
#    - Edit index.js
#    - Create new ZIP: zip -r function.zip index.js package.json
#    - Update: aws lambda update-function-code \
#              --function-name <function-name> \
#              --zip-file fileb://function.zip
#
# 5. INVOKE DIRECTLY (WITHOUT API GATEWAY):
#    $ aws lambda invoke \
#        --function-name <function-name> \
#        --payload '{"queryStringParameters":{"name":"John"}}' \
#        response.json
#    $ cat response.json
#
# 6. ENABLE X-RAY TRACING:
#    - Uncomment tracing_config in Lambda resource
#    - terraform apply
#    - View traces in AWS X-Ray console
#
# ===================================================================
# SECURITY CHECKLIST
# ===================================================================
#
# [ ] Use specific CORS origins in production (not *)
# [ ] Implement authentication (API Gateway authorizers, IAM)
# [ ] Use least privilege IAM policies
# [ ] Store secrets in Secrets Manager (not environment variables)
# [ ] Enable CloudWatch Logs encryption
# [ ] Enable X-Ray for request tracing
# [ ] Set up CloudWatch Alarms for errors and throttles
# [ ] Implement rate limiting in API Gateway
# [ ] Use WAF for additional protection
# [ ] Regular security audits and dependency updates
#
# ===================================================================
# COST OPTIMIZATION
# ===================================================================
#
# 1. Use ARM64 (Graviton2) architecture (20% cheaper)
# 2. Right-size memory allocation (monitor CloudWatch metrics)
# 3. Optimize execution time (faster = cheaper)
# 4. Set appropriate log retention (shorter = cheaper)
# 5. Use reserved concurrency to prevent runaway costs
# 6. Remove unused functions
# 7. Use Lambda Powertools for best practices
#
# ===================================================================
# CLEANUP
# ===================================================================
#
# To destroy all resources:
# $ terraform destroy
#
# This will delete:
# - Lambda Function
# - API Gateway
# - CloudWatch Log Groups
# - IAM Role and Policies
#
# WARNING: This is permanent. Ensure backups if needed.
# ===================================================================
