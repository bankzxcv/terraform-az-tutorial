# AWS Lambda - Simple HTTP Function Example

A beginner-friendly example of an AWS Lambda function with HTTP API Gateway trigger, complete with Terraform deployment and detailed explanations.

## Overview

This example demonstrates:
- Creating a simple HTTP-triggered Lambda function in Node.js
- Understanding AWS Lambda architecture and execution model
- Deploying infrastructure using Terraform
- Using API Gateway HTTP API for HTTP endpoints
- Monitoring with CloudWatch Logs
- Security best practices
- Cost optimization strategies

## What You'll Deploy

- **Lambda Function**: Serverless function runtime
- **API Gateway HTTP API**: HTTP endpoint for invoking Lambda
- **IAM Role**: Execution role with permissions
- **CloudWatch Log Groups**: For function and API logs
- **Lambda Permission**: Allow API Gateway to invoke Lambda

## Prerequisites

### Required Tools

1. **AWS CLI** (for authentication)
   ```bash
   # Install: https://aws.amazon.com/cli/
   aws --version

   # Configure credentials
   aws configure

   # Verify access
   aws sts get-caller-identity
   ```

2. **Terraform** (>= 1.0)
   ```bash
   # Install: https://www.terraform.io/downloads
   terraform --version
   ```

3. **Node.js** (>= 18.x)
   ```bash
   # Install: https://nodejs.org/
   node --version
   ```

### AWS Account

- Active AWS account ([Free tier](https://aws.amazon.com/free/))
- IAM user or role with permissions to create Lambda, API Gateway, IAM roles, CloudWatch Logs

## Quick Start

### 1. Deploy Infrastructure

```bash
# Navigate to this directory
cd examples/aws-lambda/simple-http-lambda

# Initialize Terraform
terraform init

# Preview changes
terraform plan

# Deploy (takes ~2-3 minutes)
terraform apply
# Type 'yes' when prompted
```

**Expected output:**
```
Apply complete! Resources: 10 added, 0 changed, 0 destroyed.

Outputs:
api_endpoint = "https://abc123.execute-api.us-east-1.amazonaws.com"
function_url = "https://abc123.execute-api.us-east-1.amazonaws.com/hello?name=World"
lambda_function_name = "simple-http-lambda"
```

### 2. Test the Function

```bash
# Get the function URL from Terraform output
FUNCTION_URL=$(terraform output -raw function_url)

# Test with query parameter
curl "$FUNCTION_URL"

# Test with specific name
curl "https://<api-id>.execute-api.<region>.amazonaws.com/hello?name=John"

# Test with POST request
curl -X POST "https://<api-id>.execute-api.<region>.amazonaws.com/hello" \
  -H "Content-Type: application/json" \
  -d '{"name": "John"}'
```

**Expected response:**
```json
{
  "message": "Hello, John! Welcome to AWS Lambda.",
  "greeting": "Hello, John!",
  "environment": {
    "region": "us-east-1",
    "functionName": "simple-http-lambda",
    "functionVersion": "$LATEST",
    "memorySize": "512",
    "nodeVersion": "v20.x.x",
    "runtime": "AWS_Lambda_nodejs20.x",
    "requestId": "abc-123-def-456",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "tips": [...],
  "metadata": {
    "service": "AWS Lambda",
    "apiGateway": "HTTP API",
    "coldStart": false
  }
}
```

## How AWS Lambda Works

### Architecture

```
Client Request
      │
      ▼
┌─────────────────┐
│  API Gateway    │  ← HTTP API (manages routing, throttling, CORS)
│   HTTP API      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lambda Service │  ← Invokes function
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lambda Function │  ← Your code (index.js)
│  (Container)    │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
CloudWatch   AWS Services
 Logs       (DynamoDB, S3, etc.)
```

### Execution Flow

1. **HTTP Request** arrives at API Gateway
2. **API Gateway** transforms HTTP request to Lambda event
3. **Lambda Service** finds or creates container
4. **Container** executes your handler function
5. **Function** processes request and returns response
6. **API Gateway** transforms response to HTTP
7. **Logs** are sent to CloudWatch
8. **Client** receives HTTP response

### Cold Start vs Warm Start

**Cold Start** (~100ms-1s for Node.js):
- First request or after idle period
- Lambda provisions new container
- Downloads code
- Initializes runtime
- Runs initialization code (code outside handler)
- Executes handler function

**Warm Start** (~1-10ms):
- Container already exists
- Code already loaded
- Runtime initialized
- Only executes handler function

**Container Reuse:**
- Containers live 15-60 minutes after last invocation
- Global variables persist between invocations
- Use for connection pooling, caching

## Local Development

### Test Locally

Create a test script `test-local.js`:

```javascript
const { handler } = require('./index');

// Mock event and context
const event = {
  queryStringParameters: { name: 'Local' },
  body: null,
  headers: {}
};

const context = {
  requestId: 'local-test-123',
  functionName: 'local-test',
  functionVersion: '$LATEST',
  memoryLimitInMB: '512',
  getRemainingTimeInMillis: () => 30000,
  logGroupName: '/aws/lambda/local-test',
  logStreamName: '2024/01/15/local'
};

// Invoke handler
handler(event, context)
  .then(response => {
    console.log('Response:', JSON.stringify(response, null, 2));
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

Run test:
```bash
node test-local.js
```

## Monitoring and Debugging

### View Logs in CloudWatch

**Option 1: AWS CLI (real-time streaming)**
```bash
# Stream logs
aws logs tail /aws/lambda/simple-http-lambda --follow

# View recent logs
aws logs tail /aws/lambda/simple-http-lambda --since 1h

# Filter logs
aws logs tail /aws/lambda/simple-http-lambda --filter-pattern "ERROR"
```

**Option 2: AWS Console**
1. Navigate to CloudWatch → Log groups
2. Click on `/aws/lambda/simple-http-lambda`
3. View log streams (one per container)

### CloudWatch Insights Queries

Access CloudWatch → Insights, select log group, run queries:

```
# View all requests
fields @timestamp, @message
| filter @message like /Lambda function invoked/
| sort @timestamp desc
| limit 100

# Find errors
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc

# Performance analysis
fields @timestamp, @duration, @message
| stats avg(@duration), max(@duration), min(@duration) by bin(5m)

# Memory usage
fields @timestamp, @maxMemoryUsed, @memorySize
| stats max(@maxMemoryUsed) as peakMemory
```

### Lambda Metrics (CloudWatch)

Key metrics to monitor:
- **Invocations**: Total number of invocations
- **Duration**: Execution time (ms)
- **Errors**: Number of errors
- **Throttles**: Rate-limited invocations
- **ConcurrentExecutions**: Concurrent invocations
- **IteratorAge**: For stream-based invocations

### Direct Invocation (Testing)

```bash
# Invoke function directly (bypass API Gateway)
aws lambda invoke \
  --function-name simple-http-lambda \
  --payload '{"queryStringParameters":{"name":"DirectTest"}}' \
  response.json

# View response
cat response.json
```

## Security Best Practices

### 1. IAM Permissions (Least Privilege)

```hcl
# ✅ GOOD: Specific permissions
data "aws_iam_policy_document" "lambda_policy" {
  statement {
    effect = "Allow"
    actions = [
      "dynamodb:GetItem",
      "dynamodb:PutItem"
    ]
    resources = ["arn:aws:dynamodb:*:*:table/my-table"]
  }
}

# ❌ BAD: Overly permissive
# Don't attach AdministratorAccess or *:* permissions
```

### 2. API Gateway Authentication

**Option A: API Keys**
```hcl
resource "aws_apigatewayv2_api" "lambda_api" {
  # Add API key requirement
}
```

**Option B: Lambda Authorizer**
```javascript
// Custom authorizer function
exports.authorizer = async (event) => {
  const token = event.headers.authorization;
  // Validate token (JWT, OAuth, etc.)
  return {
    isAuthorized: true,
    context: { userId: '123' }
  };
};
```

**Option C: IAM Authentication**
- Use AWS Signature Version 4
- Requires AWS credentials

### 3. Secrets Management

```javascript
// ❌ BAD: Hardcoded secrets
const apiKey = 'secret-key-12345';

// ❌ BAD: Environment variables for secrets
const apiKey = process.env.API_KEY;

// ✅ GOOD: AWS Secrets Manager
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const client = new SecretsManagerClient();
const secret = await client.send(new GetSecretValueCommand({
  SecretId: 'my-api-key'
}));
const apiKey = secret.SecretString;
```

### 4. Input Validation

```javascript
// Always validate input
if (name && name.length > 100) {
  return { statusCode: 400, body: JSON.stringify({ error: 'Input too long' }) };
}

// Sanitize input
const sanitized = name.replace(/[<>]/g, '');

// Use validation libraries
const Joi = require('joi');
const schema = Joi.object({
  name: Joi.string().max(100).required()
});
```

### 5. CORS Configuration

```hcl
# In API Gateway
cors_configuration {
  allow_origins = ["https://yourapp.com"]  # Not *
  allow_methods = ["GET", "POST"]
  allow_headers = ["Content-Type"]
  max_age       = 300
}
```

## Cost Optimization

### Pricing Breakdown

| Component | Free Tier | Price After Free Tier |
|-----------|-----------|----------------------|
| Requests | 1M/month (permanent) | $0.20 per 1M |
| Compute | 400,000 GB-s/month | $0.0000166667 per GB-s |
| API Gateway | 1M requests (12 months) | $1.00 per 1M requests |
| CloudWatch Logs | 5 GB/month | $0.50 per GB |

### Example Cost Calculation

**Scenario:**
- 3 million requests/month
- 512 MB memory
- 100ms average duration

**Calculation:**
```
Requests: (3M - 1M free) × $0.20/1M = $0.40
GB-seconds: 3M × 0.5 GB × 0.1s = 150,000 GB-s
Compute: (150K - 400K free) = $0 (within free tier)
API Gateway: (3M - 1M free) × $1.00/1M = $2.00
Logs: ~$0.50

Total: ~$2.90/month
```

### Optimization Tips

1. **Use ARM64 (Graviton2)**
   - 20% lower cost
   - 19% better performance
   - Already configured in this example

2. **Right-Size Memory**
   ```bash
   # Use Lambda Power Tuning tool
   # https://github.com/alexcasalboni/aws-lambda-power-tuning
   ```

3. **Optimize Execution Time**
   ```javascript
   // Cache connections outside handler
   let dbConnection;

   exports.handler = async (event) => {
     if (!dbConnection) {
       dbConnection = await createConnection();
     }
     // Reuse connection
   };
   ```

4. **Reduce Package Size**
   - Use only necessary dependencies
   - Consider webpack/esbuild for bundling
   - Use Lambda Layers for shared code

5. **Set Appropriate Timeouts**
   - Don't set timeout higher than needed
   - Shorter timeout = fail faster = lower cost

## Performance Optimization

### Minimize Cold Starts

1. **Provisioned Concurrency** (keeps containers warm)
   ```hcl
   resource "aws_lambda_provisioned_concurrency_config" "example" {
     function_name                     = aws_lambda_function.function.function_name
     provisioned_concurrent_executions = 2
     qualifier                         = aws_lambda_alias.live.name
   }
   ```
   Note: ~$14/month per instance

2. **Reduce Package Size**
   - Minimal dependencies (this example: ~1 KB)
   - Use webpack for bundling and tree-shaking

3. **Optimize Initialization**
   - Move code outside handler when possible
   - Lazy load heavy dependencies

### Optimize Warm Execution

1. **Connection Pooling**
   ```javascript
   const pool = createPool(); // Outside handler

   exports.handler = async (event) => {
     // Reuse pool
   };
   ```

2. **Async/Await for I/O**
   ```javascript
   // Parallel execution
   const [data1, data2] = await Promise.all([
     fetchData1(),
     fetchData2()
   ]);
   ```

## Troubleshooting

### Common Issues

**1. "Unable to import module 'index'"**
- Ensure `handler` is correctly set to `index.handler`
- Check file is named `index.js`
- Verify function exports: `exports.handler = ...`

**2. API Gateway returns 502/504**
- Check Lambda execution role permissions
- Verify Lambda timeout is appropriate
- Check CloudWatch Logs for errors

**3. High cold start times**
- Reduce package size
- Use ARM64 architecture
- Consider Provisioned Concurrency

**4. Throttling (429 errors)**
- Check concurrent execution limit (default: 1000)
- Request limit increase if needed
- Implement exponential backoff on client

## Cleanup

```bash
# Destroy all resources
terraform destroy
# Type 'yes' when prompted
```

Deletes:
- Lambda function
- API Gateway
- IAM role
- CloudWatch Log groups

## Next Steps

### Learning Path

1. **Add More Triggers:**
   - S3 (file uploads)
   - DynamoDB Streams (database changes)
   - SQS (queue processing)
   - EventBridge (scheduled tasks)

2. **Add AWS Service Integration:**
   - DynamoDB (database)
   - S3 (file storage)
   - SES (email)
   - SNS (notifications)

3. **Implement CI/CD:**
   - GitHub Actions
   - AWS CodePipeline
   - Automated testing

4. **Advanced Features:**
   - Lambda Layers
   - Custom runtimes
   - Container images
   - Lambda Extensions

5. **Observability:**
   - AWS X-Ray tracing
   - CloudWatch Insights
   - Custom metrics
   - Alarms and alerts

## Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Lambda Powertools](https://awslabs.github.io/aws-lambda-powertools-typescript/)

---

**Cost Estimate:** < $5/month for development usage
**Deployment Time:** ~3 minutes
**Difficulty:** Beginner-friendly

Happy serverless coding! 🚀
