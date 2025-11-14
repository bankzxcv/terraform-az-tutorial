# AWS Lambda - Serverless Computing

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand serverless computing concepts
- Create and deploy Lambda functions with Terraform
- Configure Lambda triggers (S3, API Gateway, CloudWatch)
- Manage Lambda permissions and IAM roles
- Implement environment variables and configuration
- Monitor and debug Lambda functions
- Optimize Lambda performance and cost

## Prerequisites

- Completed [04-s3-storage.md](./04-s3-storage.md)
- Basic programming knowledge (Node.js, Python, or similar)
- Understanding of IAM roles

## Time Estimate

**90-120 minutes**

---

## 1. What is AWS Lambda?

AWS Lambda is a serverless compute service that runs your code in response to events.

**Key Features**:
- No server management
- Automatic scaling
- Pay only for compute time
- Built-in high availability
- Event-driven execution

**Common Use Cases**:
- REST APIs
- Data processing
- File processing (S3 triggers)
- Scheduled tasks (cron jobs)
- Stream processing
- IoT backends
- Chatbots

---

## 2. Lambda Pricing

**Free Tier**:
- 1 million requests per month
- 400,000 GB-seconds of compute time per month

**Paid**:
- $0.20 per 1 million requests
- $0.0000166667 per GB-second

**Example**: Function with 512 MB memory, 100ms execution, 1M requests/month:
- Compute: (1M * 0.1s * 0.5GB) * $0.0000166667 = $0.83
- Requests: 1M * $0.20 / 1M = $0.20
- **Total: ~$1.03/month**

---

## 3. Creating Your First Lambda Function

### Simple Node.js Lambda

```hcl
# lambda-basic.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "Learning"
      ManagedBy   = "Terraform"
      Project     = "Lambda-Tutorial"
    }
  }
}

# IAM role for Lambda
resource "aws_iam_role" "lambda_role" {
  name = "hello-lambda-role"

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
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Create Lambda function
resource "aws_lambda_function" "hello" {
  filename      = "lambda.zip"
  function_name = "hello-world"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"  # file.function
  runtime       = "nodejs20.x"

  # Memory and timeout
  memory_size = 128  # MB (128-10240)
  timeout     = 30   # seconds (max 900 = 15 minutes)

  # Environment variables
  environment {
    variables = {
      ENVIRONMENT = "development"
      LOG_LEVEL   = "info"
    }
  }

  tags = {
    Name = "HelloWorldLambda"
  }
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda_logs" {
  name              = "/aws/lambda/${aws_lambda_function.hello.function_name}"
  retention_in_days = 7

  tags = {
    Name = "lambda-logs"
  }
}

# Output
output "lambda_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.hello.arn
}
```

### Lambda Function Code (index.js)

```javascript
// index.js
/**
 * Simple Lambda function that responds to events
 * @param {Object} event - Event data passed to the function
 * @param {Object} context - Runtime information
 */
exports.handler = async (event, context) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  console.log('Context:', JSON.stringify(context, null, 2));

  // Environment variables
  const environment = process.env.ENVIRONMENT || 'unknown';

  // Response
  const response = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      message: 'Hello from Lambda!',
      environment: environment,
      timestamp: new Date().toISOString(),
      requestId: context.requestId
    })
  };

  return response;
};
```

### Package and Deploy

```bash
# Create deployment package
zip lambda.zip index.js

# Deploy with Terraform
terraform init
terraform apply

# Test the function
aws lambda invoke \
  --function-name hello-world \
  --payload '{"name": "Terraform"}' \
  response.json

cat response.json
```

---

## 4. Lambda with Dependencies

### Using npm Packages

**package.json**:
```json
{
  "name": "lambda-with-dependencies",
  "version": "1.0.0",
  "dependencies": {
    "axios": "^1.6.0",
    "aws-sdk": "^2.1490.0"
  }
}
```

**index.js**:
```javascript
const axios = require('axios');

exports.handler = async (event) => {
  try {
    // Make HTTP request
    const response = await axios.get('https://api.github.com/users/github');

    return {
      statusCode: 200,
      body: JSON.stringify({
        user: response.data.login,
        name: response.data.name,
        followers: response.data.followers
      })
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
```

**Terraform with Dependencies**:
```hcl
# Use archive provider to create zip
data "archive_file" "lambda_package" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"  # Directory with code + node_modules
  output_path = "${path.module}/lambda.zip"
}

resource "aws_lambda_function" "with_dependencies" {
  filename         = data.archive_file.lambda_package.output_path
  function_name    = "lambda-with-deps"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  source_code_hash = data.archive_file.lambda_package.output_base64sha256

  timeout     = 60
  memory_size = 256
}
```

**Build Script**:
```bash
#!/bin/bash
# build.sh

# Navigate to lambda directory
cd lambda

# Install dependencies
npm install --production

# Create deployment package
cd ..
terraform apply
```

---

## 5. Lambda Triggers

### S3 Trigger

```hcl
# S3 bucket
resource "aws_s3_bucket" "uploads" {
  bucket = "lambda-uploads-${random_id.suffix.hex}"
}

# Lambda permission for S3
resource "aws_lambda_permission" "allow_s3" {
  statement_id  = "AllowExecutionFromS3"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.processor.function_name
  principal     = "s3.amazonaws.com"
  source_arn    = aws_s3_bucket.uploads.arn
}

# S3 bucket notification
resource "aws_s3_bucket_notification" "upload_notification" {
  bucket = aws_s3_bucket.uploads.id

  lambda_function {
    lambda_function_arn = aws_lambda_function.processor.arn
    events              = ["s3:ObjectCreated:*"]
    filter_prefix       = "uploads/"
    filter_suffix       = ".jpg"
  }

  depends_on = [aws_lambda_permission.allow_s3]
}

# Lambda function for S3 processing
resource "aws_lambda_function" "processor" {
  filename      = "processor.zip"
  function_name = "s3-image-processor"
  role          = aws_iam_role.lambda_s3_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  environment {
    variables = {
      DEST_BUCKET = aws_s3_bucket.processed.id
    }
  }
}

# IAM role with S3 access
resource "aws_iam_role" "lambda_s3_role" {
  name = "lambda-s3-processor-role"

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
}

resource "aws_iam_role_policy" "lambda_s3_policy" {
  role = aws_iam_role.lambda_s3_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "${aws_s3_bucket.uploads.arn}/*",
          "${aws_s3_bucket.processed.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = ["logs:*"]
        Resource = "arn:aws:logs:*:*:*"
      }
    ]
  })
}
```

**S3 Processor Function**:
```javascript
// processor/index.js
const AWS = require('aws-sdk');
const s3 = new AWS.S3();

exports.handler = async (event) => {
  console.log('S3 Event:', JSON.stringify(event, null, 2));

  // Process each S3 record
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing file: ${bucket}/${key}`);

    try {
      // Get object from S3
      const object = await s3.getObject({
        Bucket: bucket,
        Key: key
      }).promise();

      console.log(`File size: ${object.ContentLength} bytes`);
      console.log(`Content type: ${object.ContentType}`);

      // Process the file (example: copy to processed bucket)
      const destBucket = process.env.DEST_BUCKET;
      const destKey = key.replace('uploads/', 'processed/');

      await s3.putObject({
        Bucket: destBucket,
        Key: destKey,
        Body: object.Body,
        ContentType: object.ContentType,
        Metadata: {
          'processed-by': 'lambda',
          'processed-at': new Date().toISOString()
        }
      }).promise();

      console.log(`File processed successfully: ${destBucket}/${destKey}`);
    } catch (error) {
      console.error('Error processing file:', error);
      throw error;
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Files processed successfully' })
  };
};
```

### CloudWatch Events (Scheduled)

```hcl
# CloudWatch Events rule (cron)
resource "aws_cloudwatch_event_rule" "daily_task" {
  name                = "daily-cleanup"
  description         = "Trigger Lambda every day at 2 AM UTC"
  schedule_expression = "cron(0 2 * * ? *)"  # 2 AM UTC daily

  tags = {
    Name = "daily-cleanup-rule"
  }
}

# Lambda permission for CloudWatch Events
resource "aws_lambda_permission" "allow_cloudwatch" {
  statement_id  = "AllowExecutionFromCloudWatch"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.daily_cleanup.function_name
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_task.arn
}

# CloudWatch Events target
resource "aws_cloudwatch_event_target" "lambda_target" {
  rule      = aws_cloudwatch_event_rule.daily_task.name
  target_id = "lambda"
  arn       = aws_lambda_function.daily_cleanup.arn
}

# Scheduled Lambda function
resource "aws_lambda_function" "daily_cleanup" {
  filename      = "cleanup.zip"
  function_name = "daily-cleanup"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"
}
```

### API Gateway Trigger

```hcl
# API Gateway REST API
resource "aws_api_gateway_rest_api" "api" {
  name        = "lambda-api"
  description = "API backed by Lambda"
}

# API Gateway resource
resource "aws_api_gateway_resource" "users" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  parent_id   = aws_api_gateway_rest_api.api.root_resource_id
  path_part   = "users"
}

# API Gateway method
resource "aws_api_gateway_method" "get_users" {
  rest_api_id   = aws_api_gateway_rest_api.api.id
  resource_id   = aws_api_gateway_resource.users.id
  http_method   = "GET"
  authorization = "NONE"
}

# Lambda integration
resource "aws_api_gateway_integration" "lambda_integration" {
  rest_api_id = aws_api_gateway_rest_api.api.id
  resource_id = aws_api_gateway_resource.users.id
  http_method = aws_api_gateway_method.get_users.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.api_handler.invoke_arn
}

# Lambda permission for API Gateway
resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api_handler.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.api.execution_arn}/*/*"
}

# Deploy API
resource "aws_api_gateway_deployment" "api" {
  depends_on = [aws_api_gateway_integration.lambda_integration]

  rest_api_id = aws_api_gateway_rest_api.api.id
  stage_name  = "prod"
}

# Output API URL
output "api_url" {
  value = "${aws_api_gateway_deployment.api.invoke_url}/users"
}
```

---

## 6. Lambda Layers

Share code across multiple functions.

```hcl
# Create Lambda layer
resource "aws_lambda_layer_version" "utilities" {
  filename            = "layer.zip"
  layer_name          = "utilities-layer"
  compatible_runtimes = ["nodejs20.x", "nodejs18.x"]

  description = "Common utility functions"
}

# Use layer in function
resource "aws_lambda_function" "with_layer" {
  filename      = "function.zip"
  function_name = "function-with-layer"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  # Attach layer
  layers = [aws_lambda_layer_version.utilities.arn]
}
```

**Layer Structure**:
```
layer/
└── nodejs/
    └── node_modules/
        └── my-utility/
            └── index.js
```

---

## 7. Environment-Specific Configuration

```hcl
# Variables
variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
}

variable "lambda_config" {
  description = "Lambda configuration by environment"
  type = map(object({
    memory_size = number
    timeout     = number
    log_level   = string
  }))

  default = {
    development = {
      memory_size = 128
      timeout     = 30
      log_level   = "debug"
    }
    staging = {
      memory_size = 256
      timeout     = 60
      log_level   = "info"
    }
    production = {
      memory_size = 512
      timeout     = 300
      log_level   = "warn"
    }
  }
}

# Lambda with environment-specific config
resource "aws_lambda_function" "app" {
  filename      = "app.zip"
  function_name = "app-${var.environment}"
  role          = aws_iam_role.lambda_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  memory_size = var.lambda_config[var.environment].memory_size
  timeout     = var.lambda_config[var.environment].timeout

  environment {
    variables = {
      ENVIRONMENT = var.environment
      LOG_LEVEL   = var.lambda_config[var.environment].log_level
      DB_HOST     = aws_db_instance.db.endpoint
      API_KEY     = data.aws_ssm_parameter.api_key.value
    }
  }

  tags = {
    Environment = var.environment
  }
}
```

---

## 8. Monitoring and Debugging

### CloudWatch Logs Insights

```bash
# Query logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-function \
  --filter-pattern "ERROR"

# CloudWatch Insights query
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

### X-Ray Tracing

```hcl
resource "aws_lambda_function" "traced" {
  filename      = "function.zip"
  function_name = "traced-function"
  role          = aws_iam_role.lambda_xray_role.arn
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  # Enable X-Ray tracing
  tracing_config {
    mode = "Active"
  }
}

# IAM policy for X-Ray
resource "aws_iam_role_policy_attachment" "xray" {
  role       = aws_iam_role.lambda_xray_role.name
  policy_arn = "arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess"
}
```

**Function with X-Ray**:
```javascript
const AWSXRay = require('aws-xray-sdk-core');
const AWS = AWSXRay.captureAWS(require('aws-sdk'));

exports.handler = async (event) => {
  const segment = AWSXRay.getSegment();
  const subsegment = segment.addNewSubsegment('custom-operation');

  try {
    // Your code here
    subsegment.addAnnotation('userId', event.userId);
    subsegment.addMetadata('requestData', event);

    return { statusCode: 200 };
  } finally {
    subsegment.close();
  }
};
```

---

## 9. Best Practices

### Performance

1. **Minimize cold starts**
   ```hcl
   # Use provisioned concurrency
   resource "aws_lambda_provisioned_concurrency_config" "example" {
     function_name                     = aws_lambda_function.app.function_name
     provisioned_concurrent_executions = 2
     qualifier                         = aws_lambda_function.app.version
   }
   ```

2. **Optimize package size**
   - Remove unnecessary dependencies
   - Use Lambda layers for shared code
   - Minimize deployment package

3. **Reuse connections**
   ```javascript
   // Outside handler - reused across invocations
   const dbConnection = createConnection();

   exports.handler = async (event) => {
     // Use existing connection
     const result = await dbConnection.query();
     return result;
   };
   ```

### Security

1. **Use environment variables for secrets**
   ```hcl
   environment {
     variables = {
       DB_PASSWORD = data.aws_ssm_parameter.db_password.value
     }
   }
   ```

2. **Principle of least privilege**
   ```hcl
   # Specific permissions only
   policy = jsonencode({
     Statement = [{
       Effect = "Allow"
       Action = ["s3:GetObject"]
       Resource = "arn:aws:s3:::specific-bucket/*"
     }]
   })
   ```

3. **Use VPC for database access**
   ```hcl
   resource "aws_lambda_function" "vpc_lambda" {
     # ... other config

     vpc_config {
       subnet_ids         = [aws_subnet.private.id]
       security_group_ids = [aws_security_group.lambda.id]
     }
   }
   ```

### Cost Optimization

1. **Right-size memory allocation**
2. **Set appropriate timeouts**
3. **Use reserved concurrency when needed**
4. **Monitor and optimize execution time**

---

## 10. Complete Example: API Backend

See the complete working example in [examples/aws-lambda/](../../examples/aws-lambda/)

---

## Hands-On Exercises

### Exercise 1: Image Resizer

Create a Lambda function that:
- Triggers on S3 upload
- Resizes images to thumbnails
- Saves to destination bucket
- Sends SNS notification

### Exercise 2: Scheduled Reporter

Create a Lambda that:
- Runs daily via CloudWatch Events
- Queries CloudWatch metrics
- Generates report
- Emails summary via SES

### Exercise 3: REST API

Create a serverless API with:
- Multiple endpoints
- DynamoDB integration
- Authentication
- Error handling

---

## Key Takeaways

- Lambda provides serverless compute without server management
- Pay only for actual compute time
- Multiple trigger types (S3, API Gateway, CloudWatch, etc.)
- Use IAM roles for permissions
- Monitor with CloudWatch Logs and X-Ray
- Optimize for performance and cost
- Always use environment variables for configuration

---

## Next Steps

In the next lesson, we'll cover:
- VPC networking in depth
- Subnets and route tables
- NAT Gateways and Internet Gateways
- VPC Peering and Transit Gateway

**Continue to**: [06-vpc-networking.md](./06-vpc-networking.md)

---

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Terraform AWS Lambda](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function)

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty**: Intermediate ⭐⭐

**Next Lesson**: [VPC Networking](./06-vpc-networking.md)
