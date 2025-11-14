# Reusable AWS Lambda Function Module
# This module creates a Lambda function with best practices built-in

# Lambda Function
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  description   = var.description

  # Code deployment
  filename         = var.filename
  s3_bucket        = var.s3_bucket
  s3_key           = var.s3_key
  s3_object_version = var.s3_object_version
  source_code_hash = var.source_code_hash

  # Runtime configuration
  handler = var.handler
  runtime = var.runtime
  timeout = var.timeout

  # Resources
  memory_size                    = var.memory_size
  reserved_concurrent_executions = var.reserved_concurrent_executions

  # IAM Role
  role = var.create_role ? aws_iam_role.lambda[0].arn : var.role_arn

  # VPC Configuration
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  # Environment Variables
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [1] : []
    content {
      variables = var.environment_variables
    }
  }

  # X-Ray Tracing
  dynamic "tracing_config" {
    for_each = var.tracing_mode != null ? [1] : []
    content {
      mode = var.tracing_mode
    }
  }

  # Lambda Layers
  layers = var.layers

  # Dead Letter Config
  dynamic "dead_letter_config" {
    for_each = var.dead_letter_target_arn != null ? [1] : []
    content {
      target_arn = var.dead_letter_target_arn
    }
  }

  # File System Config
  dynamic "file_system_config" {
    for_each = var.file_system_config != null ? [1] : []
    content {
      arn              = var.file_system_config.arn
      local_mount_path = var.file_system_config.local_mount_path
    }
  }

  # Image Config (for container images)
  dynamic "image_config" {
    for_each = var.image_config != null ? [1] : []
    content {
      command           = lookup(var.image_config, "command", null)
      entry_point       = lookup(var.image_config, "entry_point", null)
      working_directory = lookup(var.image_config, "working_directory", null)
    }
  }

  # Ephemeral Storage
  dynamic "ephemeral_storage" {
    for_each = var.ephemeral_storage_size != null ? [1] : []
    content {
      size = var.ephemeral_storage_size
    }
  }

  # Architectures
  architectures = var.architectures

  # Publish
  publish = var.publish

  tags = var.tags

  depends_on = [
    aws_cloudwatch_log_group.lambda
  ]
}

# IAM Role for Lambda (optional)
resource "aws_iam_role" "lambda" {
  count = var.create_role ? 1 : 0
  name  = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.function_name}-role"
    }
  )
}

# Basic Lambda Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  count      = var.create_role ? 1 : 0
  role       = aws_iam_role.lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC Execution Policy
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count      = var.create_role && var.vpc_config != null ? 1 : 0
  role       = aws_iam_role.lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# X-Ray Tracing Policy
resource "aws_iam_role_policy_attachment" "lambda_xray" {
  count      = var.create_role && var.tracing_mode == "Active" ? 1 : 0
  role       = aws_iam_role.lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}

# Custom IAM Policy
resource "aws_iam_role_policy" "lambda_custom" {
  count  = var.create_role && var.policy != null ? 1 : 0
  name   = "${var.function_name}-custom-policy"
  role   = aws_iam_role.lambda[0].id
  policy = var.policy
}

# Attach additional policy ARNs
resource "aws_iam_role_policy_attachment" "lambda_additional" {
  for_each   = var.create_role ? toset(var.additional_policy_arns) : []
  role       = aws_iam_role.lambda[0].name
  policy_arn = each.value
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  count             = var.create_log_group ? 1 : 0
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days
  kms_key_id        = var.log_kms_key_id

  tags = merge(
    var.tags,
    {
      Name = "${var.function_name}-logs"
    }
  )
}

# Lambda Permissions for Triggers
resource "aws_lambda_permission" "triggers" {
  for_each = var.allowed_triggers

  function_name = aws_lambda_function.this.function_name
  statement_id  = each.key

  action        = lookup(each.value, "action", "lambda:InvokeFunction")
  principal     = each.value.principal
  source_arn    = lookup(each.value, "source_arn", null)
  source_account = lookup(each.value, "source_account", null)
  event_source_token = lookup(each.value, "event_source_token", null)
  qualifier     = lookup(each.value, "qualifier", null)
}

# Lambda Function URL (optional)
resource "aws_lambda_function_url" "this" {
  count              = var.create_function_url ? 1 : 0
  function_name      = aws_lambda_function.this.function_name
  authorization_type = var.function_url_authorization_type
  qualifier          = var.function_url_qualifier

  dynamic "cors" {
    for_each = var.function_url_cors != null ? [var.function_url_cors] : []
    content {
      allow_credentials = lookup(cors.value, "allow_credentials", null)
      allow_headers     = lookup(cors.value, "allow_headers", null)
      allow_methods     = lookup(cors.value, "allow_methods", null)
      allow_origins     = lookup(cors.value, "allow_origins", null)
      expose_headers    = lookup(cors.value, "expose_headers", null)
      max_age           = lookup(cors.value, "max_age", null)
    }
  }
}

# Lambda Alias
resource "aws_lambda_alias" "this" {
  for_each = var.aliases

  name             = each.key
  description      = lookup(each.value, "description", null)
  function_name    = aws_lambda_function.this.function_name
  function_version = lookup(each.value, "function_version", aws_lambda_function.this.version)

  dynamic "routing_config" {
    for_each = lookup(each.value, "routing_config", null) != null ? [each.value.routing_config] : []
    content {
      additional_version_weights = routing_config.value.additional_version_weights
    }
  }
}

# EventBridge (CloudWatch Events) Rules
resource "aws_cloudwatch_event_rule" "schedule" {
  for_each = var.event_source_mapping

  name                = "${var.function_name}-${each.key}"
  description         = lookup(each.value, "description", null)
  schedule_expression = lookup(each.value, "schedule_expression", null)
  event_pattern       = lookup(each.value, "event_pattern", null)
  is_enabled          = lookup(each.value, "enabled", true)

  tags = var.tags
}

resource "aws_cloudwatch_event_target" "lambda" {
  for_each = var.event_source_mapping

  rule      = aws_cloudwatch_event_rule.schedule[each.key].name
  target_id = "lambda"
  arn       = aws_lambda_function.this.arn
  input     = lookup(each.value, "input", null)

  dynamic "retry_policy" {
    for_each = lookup(each.value, "retry_policy", null) != null ? [each.value.retry_policy] : []
    content {
      maximum_event_age       = lookup(retry_policy.value, "maximum_event_age", null)
      maximum_retry_attempts  = lookup(retry_policy.value, "maximum_retry_attempts", null)
    }
  }
}

resource "aws_lambda_permission" "eventbridge" {
  for_each = var.event_source_mapping

  statement_id  = "AllowExecutionFromEventBridge-${each.key}"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.this.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.schedule[each.key].arn
}
