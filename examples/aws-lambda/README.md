# AWS Lambda Function Example

A complete, production-ready example of deploying an AWS Lambda function with Terraform.

## What This Example Includes

- **Lambda Function**: Simple Node.js function that handles HTTP requests
- **API Gateway**: RESTful API endpoint for the Lambda function
- **Lambda Function URL**: Direct HTTP access (alternative to API Gateway)
- **IAM Roles**: Proper permissions for Lambda execution
- **CloudWatch Logs**: Centralized logging with retention
- **CloudWatch Alarms**: Monitoring for errors and duration
- **X-Ray Tracing**: Distributed tracing support (configurable)

## Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       ├──────────────┐
       │              │
   ┌───▼────┐    ┌───▼────────┐
   │Function│    │    API     │
   │  URL   │    │  Gateway   │
   └───┬────┘    └───┬────────┘
       │              │
       └──────┬───────┘
              │
       ┌──────▼───────┐
       │    Lambda    │
       │   Function   │
       └──────┬───────┘
              │
       ┌──────▼───────┐
       │  CloudWatch  │
       │     Logs     │
       └──────────────┘
```

## Quick Start

### 1. Prerequisites

- AWS CLI configured with credentials
- Terraform 1.0 or later installed
- Node.js (for local testing, optional)

### 2. Deploy

```bash
# Initialize Terraform
terraform init

# Review the plan
terraform plan

# Deploy the infrastructure
terraform apply

# Type 'yes' when prompted
```

### 3. Test the Function

After deployment, Terraform will output URLs and test commands:

```bash
# Test using Lambda Function URL (direct HTTP access)
curl "$(terraform output -raw lambda_function_url)?name=Terraform"

# Test using API Gateway
curl "$(terraform output -raw api_gateway_url)/?name=Terraform"

# Test using AWS CLI
aws lambda invoke \
  --function-name $(terraform output -raw lambda_function_name) \
  --payload '{"name": "Terraform"}' \
  response.json

cat response.json
```

### 4. View Logs

```bash
# Stream logs in real-time
aws logs tail $(terraform output -raw cloudwatch_log_group_name) --follow

# Or use the AWS Console
# Check the 'monitoring' URLs in connection_info output
```

### 5. Clean Up

```bash
# Remove all resources
terraform destroy

# Type 'yes' when prompted
```

## File Structure

```
examples/aws-lambda/
├── index.js           # Lambda function code
├── main.tf            # Main Terraform configuration
├── variables.tf       # Input variables
├── outputs.tf         # Output values
├── README.md          # This file
└── lambda_function.zip  # Generated ZIP file (created by Terraform)
```

## Lambda Function Features

The `index.js` function demonstrates:

### HTTP Method Handling

```javascript
// GET request
curl "https://your-url/?name=John"

// POST request
curl -X POST https://your-url/ \
  -H "Content-Type: application/json" \
  -d '{"title": "Learn Lambda", "priority": "high"}'

// PUT request
curl -X PUT https://your-url/?id=123 \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated", "status": "complete"}'

// DELETE request
curl -X DELETE https://your-url/?id=123
```

### Environment Variables

The function reads environment variables set by Terraform:

```javascript
const environment = process.env.ENVIRONMENT;
const version = process.env.FUNCTION_VERSION;
```

### Error Handling

Proper error handling with meaningful error messages:

```javascript
try {
  // Your code
} catch (error) {
  return {
    statusCode: 500,
    body: JSON.stringify({ error: error.message })
  };
}
```

### CORS Support

Pre-configured CORS headers for web applications:

```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
}
```

## Configuration Options

### Basic Configuration

```hcl
# Minimal configuration
terraform apply \
  -var="function_name=my-api" \
  -var="environment=production"
```

### Advanced Configuration

```hcl
# With custom settings
terraform apply \
  -var="function_name=my-api" \
  -var="environment=production" \
  -var="memory_size=256" \
  -var="timeout=60" \
  -var="runtime=nodejs20.x" \
  -var="log_retention_days=30"
```

### Available Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `aws_region` | AWS region | `us-east-1` |
| `environment` | Environment name | `development` |
| `function_name` | Lambda function name | `my-lambda-function` |
| `runtime` | Lambda runtime | `nodejs20.x` |
| `memory_size` | Memory in MB | `128` |
| `timeout` | Timeout in seconds | `30` |
| `enable_function_url` | Enable Function URL | `true` |
| `enable_api_gateway` | Enable API Gateway | `true` |
| `enable_alarms` | Enable CloudWatch alarms | `true` |

## Monitoring and Debugging

### CloudWatch Logs

View logs in AWS Console:
```bash
# Get the logs URL from outputs
terraform output -json connection_info | jq -r '.monitoring.cloudwatch_logs'
```

Or use AWS CLI:
```bash
# Tail logs
aws logs tail /aws/lambda/my-lambda-function --follow

# Search logs
aws logs filter-log-events \
  --log-group-name /aws/lambda/my-lambda-function \
  --filter-pattern "ERROR"
```

### CloudWatch Alarms

Two alarms are configured by default:

1. **Error Alarm**: Triggers when errors exceed 5 in 5 minutes
2. **Duration Alarm**: Triggers when duration exceeds 80% of timeout

View alarms:
```bash
aws cloudwatch describe-alarms \
  --alarm-names my-lambda-function-errors
```

### X-Ray Tracing

Enable X-Ray for distributed tracing:

```bash
terraform apply -var="tracing_mode=Active"
```

View traces in AWS X-Ray console.

## Cost Estimation

### Free Tier

- **1 million requests** per month
- **400,000 GB-seconds** of compute time per month

### Example Costs (beyond free tier)

With default settings (128 MB, 30s timeout):

- **Requests**: $0.20 per 1M requests
- **Compute**: $0.0000166667 per GB-second
- **Example**: 10M requests/month ≈ $5-10/month

### Cost Optimization Tips

1. **Right-size memory**: Start with 128 MB, increase if needed
2. **Optimize timeout**: Set to actual needs, not maximum
3. **Use Function URL**: Free alternative to API Gateway for simple cases
4. **Clean up logs**: Set appropriate retention period

## Common Use Cases

### 1. REST API Backend

```bash
# Create resources
curl -X POST https://your-url/ \
  -H "Content-Type: application/json" \
  -d '{"name": "Item 1"}'

# Read resources
curl https://your-url/?id=123

# Update resources
curl -X PUT https://your-url/?id=123 \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated"}'

# Delete resources
curl -X DELETE https://your-url/?id=123
```

### 2. Webhook Handler

Perfect for receiving webhooks from third-party services:

```bash
# Configure webhook URL to point to Lambda Function URL or API Gateway
# The function will log and process all incoming requests
```

### 3. Scheduled Tasks

Add EventBridge rule (not included in this example):

```hcl
resource "aws_cloudwatch_event_rule" "schedule" {
  name                = "trigger-lambda"
  schedule_expression = "rate(5 minutes)"
}
```

## Extending This Example

### Add Database Integration

```hcl
# Add DynamoDB table
resource "aws_dynamodb_table" "data" {
  name         = "my-data"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# Grant Lambda access
resource "aws_iam_role_policy" "dynamodb" {
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem"
      ]
      Resource = aws_dynamodb_table.data.arn
    }]
  })
}
```

### Add Authentication

```hcl
# Use API Gateway with IAM authentication
resource "aws_api_gateway_method" "proxy" {
  # ...
  authorization = "AWS_IAM"
}

# Or use Cognito
resource "aws_api_gateway_authorizer" "cognito" {
  name          = "cognito"
  type          = "COGNITO_USER_POOLS"
  rest_api_id   = aws_api_gateway_rest_api.main.id
  provider_arns = [aws_cognito_user_pool.main.arn]
}
```

### Add Custom Domain

```hcl
# API Gateway custom domain
resource "aws_api_gateway_domain_name" "main" {
  domain_name              = "api.example.com"
  regional_certificate_arn = aws_acm_certificate.cert.arn

  endpoint_configuration {
    types = ["REGIONAL"]
  }
}
```

## Troubleshooting

### Function Times Out

```bash
# Increase timeout
terraform apply -var="timeout=60"
```

### Out of Memory Errors

```bash
# Increase memory
terraform apply -var="memory_size=256"
```

### Function Not Accessible

```bash
# Check function exists
aws lambda get-function --function-name $(terraform output -raw lambda_function_name)

# Check permissions
aws lambda get-policy --function-name $(terraform output -raw lambda_function_name)
```

### Logs Not Appearing

```bash
# Check log group exists
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/

# Check IAM permissions
aws iam get-role-policy --role-name my-lambda-function-role --policy-name ...
```

## Security Best Practices

1. **Use IAM Roles**: Never hardcode credentials
2. **Enable Encryption**: Use KMS for sensitive data
3. **Restrict API Access**: Use API Gateway authentication
4. **Monitor Logs**: Enable and review CloudWatch Logs
5. **Set Concurrency Limits**: Prevent runaway costs
6. **Use VPC**: For database access (not in this example)
7. **Rotate Secrets**: Use AWS Secrets Manager
8. **Enable X-Ray**: For security monitoring

## Production Checklist

Before deploying to production:

- [ ] Set `environment = "production"`
- [ ] Increase `log_retention_days` to 30 or more
- [ ] Enable `tracing_mode = "Active"`
- [ ] Add authentication to API Gateway
- [ ] Set up proper alarms and notifications
- [ ] Enable encryption for sensitive data
- [ ] Configure custom domain
- [ ] Set up WAF for API Gateway
- [ ] Implement proper error handling
- [ ] Add comprehensive logging
- [ ] Set up CI/CD pipeline
- [ ] Document API endpoints
- [ ] Create runbooks for common issues

## Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [Lambda Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/best-practices.html)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

## Support

For issues or questions:

1. Check the [troubleshooting section](#troubleshooting)
2. Review AWS Lambda documentation
3. Check Terraform AWS provider documentation
4. Open an issue in the repository

## License

This example is provided as-is for educational purposes.
