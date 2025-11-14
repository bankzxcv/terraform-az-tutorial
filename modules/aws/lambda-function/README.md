# AWS Lambda Function Terraform Module

A comprehensive Terraform module for creating AWS Lambda functions with best practices built-in.

## Features

- Lambda function with configurable runtime and resources
- Automatic IAM role creation with appropriate policies
- VPC configuration support
- CloudWatch Logs with configurable retention
- X-Ray tracing support
- Lambda Layers support
- Function URL support
- Event source mapping (EventBridge/CloudWatch Events)
- Lambda aliases for blue/green deployments
- Dead letter queue configuration
- EFS file system support
- Ephemeral storage configuration

## Usage

### Basic Example

```hcl
module "lambda" {
  source = "./modules/aws/lambda-function"

  function_name = "my-lambda-function"
  description   = "My Lambda function"
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  memory_size = 256
  timeout     = 30

  environment_variables = {
    ENVIRONMENT = "production"
    LOG_LEVEL   = "info"
  }

  tags = {
    Environment = "production"
  }
}
```

### With VPC Configuration

```hcl
module "lambda_in_vpc" {
  source = "./modules/aws/lambda-function"

  function_name = "vpc-lambda"
  handler       = "index.handler"
  runtime       = "python3.11"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  vpc_config = {
    subnet_ids         = ["subnet-12345", "subnet-67890"]
    security_group_ids = ["sg-12345"]
  }

  tags = {
    Environment = "production"
  }
}
```

### With Function URL

```hcl
module "lambda_with_url" {
  source = "./modules/aws/lambda-function"

  function_name = "url-lambda"
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  create_function_url           = true
  function_url_authorization_type = "NONE"

  function_url_cors = {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST"]
    max_age       = 86400
  }

  tags = {
    Environment = "production"
  }
}
```

### With Custom IAM Policy

```hcl
module "lambda_with_policy" {
  source = "./modules/aws/lambda-function"

  function_name = "s3-processor"
  handler       = "index.handler"
  runtime       = "python3.11"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-bucket/*"
      }
    ]
  })

  tags = {
    Environment = "production"
  }
}
```

### With EventBridge Trigger

```hcl
module "scheduled_lambda" {
  source = "./modules/aws/lambda-function"

  function_name = "daily-task"
  handler       = "index.handler"
  runtime       = "python3.11"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  event_source_mapping = {
    daily_schedule = {
      description         = "Run daily at 2 AM UTC"
      schedule_expression = "cron(0 2 * * ? *)"
      enabled             = true
    }
  }

  tags = {
    Environment = "production"
  }
}
```

### With API Gateway Trigger

```hcl
module "api_lambda" {
  source = "./modules/aws/lambda-function"

  function_name = "api-handler"
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  allowed_triggers = {
    AllowAPIGatewayInvoke = {
      principal  = "apigateway.amazonaws.com"
      source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*/*/*"
    }
  }

  tags = {
    Environment = "production"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| function_name | Unique name for the Lambda function | `string` | n/a | yes |
| handler | Function entrypoint | `string` | n/a | yes |
| runtime | Lambda runtime | `string` | n/a | yes |
| description | Description of the function | `string` | `""` | no |
| memory_size | Memory in MB | `number` | `128` | no |
| timeout | Timeout in seconds | `number` | `3` | no |
| filename | Path to deployment package | `string` | `null` | no |
| source_code_hash | Trigger updates | `string` | `null` | no |
| create_role | Create IAM role | `bool` | `true` | no |
| vpc_config | VPC configuration | `object` | `null` | no |
| environment_variables | Environment variables | `map(string)` | `{}` | no |
| tracing_mode | X-Ray tracing mode | `string` | `null` | no |
| layers | Lambda layers | `list(string)` | `[]` | no |
| create_function_url | Create Function URL | `bool` | `false` | no |
| allowed_triggers | Trigger permissions | `map` | `{}` | no |

See [variables.tf](./variables.tf) for complete list of inputs.

## Outputs

| Name | Description |
|------|-------------|
| function_arn | Lambda function ARN |
| function_name | Lambda function name |
| function_invoke_arn | Invoke ARN for API Gateway |
| role_arn | IAM role ARN |
| cloudwatch_log_group_name | CloudWatch log group name |
| function_url | Function URL (if enabled) |

See [outputs.tf](./outputs.tf) for complete list of outputs.

## Examples

See the [examples/](../../../examples/aws-lambda/) directory for complete working examples.

## Best Practices

1. **Use X-Ray Tracing**: Set `tracing_mode = "Active"` for production
2. **Configure Dead Letter Queue**: Add SQS or SNS for failed invocations
3. **Set Appropriate Timeouts**: Balance between cost and functionality
4. **Use VPC When Needed**: For database or private resource access
5. **Enable CloudWatch Logs**: Always monitor your functions
6. **Use Environment Variables**: Don't hardcode configuration
7. **Tag Resources**: Always add meaningful tags
8. **Use Lambda Layers**: Share code across functions
9. **Set Reserved Concurrency**: Prevent runaway costs
10. **Use Aliases**: For blue/green deployments

## License

This module is provided as-is for educational and production use.
