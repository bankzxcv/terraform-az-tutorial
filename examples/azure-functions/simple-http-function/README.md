# Azure Functions - Simple HTTP Function Example

A beginner-friendly example of an Azure Function with HTTP trigger, complete with Terraform deployment and detailed explanations.

## Overview

This example demonstrates:
- Creating a simple HTTP-triggered Azure Function in Node.js
- Understanding Azure Functions architecture and execution model
- Deploying infrastructure using Terraform
- Monitoring with Application Insights
- Security best practices
- Cost optimization strategies

## What You'll Deploy

- **Azure Function App**: Serverless function runtime
- **App Service Plan**: Consumption plan (serverless, pay-per-execution)
- **Storage Account**: Required for Azure Functions runtime
- **Application Insights**: Monitoring and logging
- **Resource Group**: Logical container for all resources

## Prerequisites

### Required Tools

1. **Azure CLI** (for authentication and deployment)
   ```bash
   # Install: https://docs.microsoft.com/cli/azure/install-azure-cli
   az --version

   # Login to Azure
   az login

   # Set subscription (if you have multiple)
   az account set --subscription "Your Subscription Name"
   ```

2. **Terraform** (>= 1.0)
   ```bash
   # Install: https://www.terraform.io/downloads
   terraform --version
   ```

3. **Azure Functions Core Tools** (for local testing and deployment)
   ```bash
   # Install: https://docs.microsoft.com/azure/azure-functions/functions-run-local
   npm install -g azure-functions-core-tools@4

   # Verify installation
   func --version
   ```

4. **Node.js** (>= 18.x)
   ```bash
   # Install: https://nodejs.org/
   node --version
   npm --version
   ```

### Azure Subscription

- Active Azure subscription ([Free trial](https://azure.microsoft.com/free/))
- Contributor or Owner role in the subscription

## Project Structure

```
simple-http-function/
├── index.js           # Function code with detailed comments
├── function.json      # Function configuration and bindings
├── package.json       # Node.js dependencies
├── main.tf           # Terraform infrastructure definition
├── variables.tf      # Terraform variables
├── outputs.tf        # Terraform outputs
└── README.md         # This file
```

## How Azure Functions Work

### Architecture

```
                                    ┌─────────────────────┐
                                    │   Azure Functions   │
                                    │      Runtime        │
                                    └──────────┬──────────┘
                                               │
                  ┌────────────────────────────┼────────────────────────────┐
                  │                            │                            │
          ┌───────▼───────┐           ┌───────▼───────┐           ┌───────▼───────┐
          │  HTTP Trigger  │           │ Timer Trigger │           │ Queue Trigger │
          │  (API Gateway) │           │  (Scheduler)  │           │   (Events)    │
          └───────┬───────┘           └───────────────┘           └───────────────┘
                  │
          ┌───────▼────────┐
          │  Your Function │
          │    (index.js)  │
          └───────┬────────┘
                  │
      ┌───────────┼───────────┐
      │           │           │
┌─────▼─────┐ ┌──▼──────┐ ┌─▼─────────┐
│  Storage  │ │Database │ │  External │
│  Account  │ │(Cosmos) │ │    API    │
└───────────┘ └─────────┘ └───────────┘
```

### Execution Flow

1. **Event Occurs**: HTTP request arrives at `https://<app-name>.azurewebsites.net/api/hello`
2. **Runtime Invokes Function**: Azure Functions runtime calls your handler function
3. **Function Executes**: Your code processes the request (index.js)
4. **Response Returned**: Function returns HTTP response to caller
5. **Logs Captured**: Telemetry sent to Application Insights

### Consumption Plan Details

- **Auto-scaling**: Scales from 0 to 200+ instances automatically
- **Cold Start**: First request after idle period takes ~1-3 seconds
- **Warm Instances**: Subsequent requests are fast (~10-50ms)
- **Idle Timeout**: Instances stay warm for ~20 minutes of inactivity
- **Memory**: 1.5 GB per instance
- **Timeout**: 5 minutes (configurable up to 10 minutes)

## Quick Start

### 1. Deploy Infrastructure with Terraform

```bash
# Navigate to this directory
cd examples/azure-functions/simple-http-function

# Initialize Terraform (download providers)
terraform init

# Preview changes
terraform plan

# Deploy infrastructure (will take 3-5 minutes)
terraform apply

# Confirm when prompted (type 'yes')
```

**Expected output:**
```
Apply complete! Resources: 5 added, 0 changed, 0 destroyed.

Outputs:
function_app_name = "func-a1b2c3d4"
function_url = "https://func-a1b2c3d4.azurewebsites.net"
...
```

### 2. Deploy Function Code

```bash
# Deploy the function code to Azure
func azure functionapp publish <function_app_name>

# Example:
# func azure functionapp publish func-a1b2c3d4

# Build and deploy (if you have dependencies)
# func azure functionapp publish func-a1b2c3d4 --build local
```

**Expected output:**
```
Getting site publishing info...
Uploading package...
Upload completed successfully.
Deployment completed successfully.
Syncing triggers...
Functions in func-a1b2c3d4:
    hello - [httpTrigger]
        Invoke url: https://func-a1b2c3d4.azurewebsites.net/api/hello
```

### 3. Get Function Key

```bash
# Retrieve the function key for authentication
az functionapp function keys list \
  --resource-group <resource-group-name> \
  --name <function-app-name> \
  --function-name hello \
  --query "default" \
  --output tsv
```

**Example:**
```bash
az functionapp function keys list \
  --resource-group rg-azure-function-a1b2c3d4 \
  --name func-a1b2c3d4 \
  --function-name hello \
  --query "default" \
  --output tsv
```

**Output:** `AbCdEfGhIjKlMnOpQrStUvWxYz0123456789==`

### 4. Test the Function

```bash
# Test with query parameter
curl "https://<function-app-name>.azurewebsites.net/api/hello?name=John&code=<function-key>"

# Test with POST body
curl -X POST \
  "https://<function-app-name>.azurewebsites.net/api/hello?code=<function-key>" \
  -H "Content-Type: application/json" \
  -d '{"name": "John"}'
```

**Expected response:**
```json
{
  "message": "Hello, John! Welcome to Azure Functions.",
  "greeting": "Hello, John!",
  "environment": {
    "instanceId": "abc123",
    "region": "eastus",
    "nodeVersion": "v18.x.x",
    "runtime": "node",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "tips": [
    "Azure Functions auto-scales based on demand",
    "You only pay for execution time",
    "Functions can be triggered by HTTP, timers, queues, and more",
    "Use Application Insights for monitoring and debugging"
  ]
}
```

## Local Development

### Run Function Locally

```bash
# Navigate to function directory
cd examples/azure-functions/simple-http-function

# Install dependencies (if any)
npm install

# Start local runtime
func start

# Or with specific port
# func start --port 7072
```

**Expected output:**
```
Azure Functions Core Tools
Core Tools Version: 4.x.xxxx
Function Runtime Version: 4.x.x.x

Functions:
    hello: [GET,POST] http://localhost:7071/api/hello

For detailed output, run func with --verbose flag.
```

### Test Locally

```bash
# Test without authentication (local mode)
curl "http://localhost:7071/api/hello?name=Local"

# With POST
curl -X POST http://localhost:7071/api/hello \
  -H "Content-Type: application/json" \
  -d '{"name": "Local"}'
```

### Local Settings

Create `local.settings.json` for local environment variables:

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "ENVIRONMENT": "local"
  }
}
```

**Note:** `local.settings.json` is NOT deployed to Azure. Add to `.gitignore`.

## Understanding the Code

### index.js - Function Handler

```javascript
module.exports = async function (context, req) {
    // context: Azure Functions context object
    // - context.log: Logging function
    // - context.res: Response object (set this to return HTTP response)
    // - context.bindings: Input/output bindings data
    // - context.executionContext: Execution metadata

    // req: HTTP request object
    // - req.method: HTTP method (GET, POST, etc.)
    // - req.query: Query parameters
    // - req.body: Request body (parsed JSON)
    // - req.headers: Request headers

    // Your business logic here

    // Set response
    context.res = {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: { message: "Hello, World!" }
    };
};
```

### function.json - Function Configuration

```json
{
  "bindings": [
    {
      "type": "httpTrigger",      // Trigger type
      "direction": "in",           // Input binding
      "name": "req",              // Parameter name
      "methods": ["get", "post"],  // Allowed HTTP methods
      "authLevel": "function",     // Authentication level
      "route": "hello"            // Custom route
    },
    {
      "type": "http",             // HTTP response
      "direction": "out",          // Output binding
      "name": "res"               // Response object name
    }
  ]
}
```

**Authentication Levels:**
- `anonymous`: No key required (public access)
- `function`: Requires function-specific key
- `admin`: Requires master key

## Monitoring and Debugging

### View Logs in Azure Portal

1. Navigate to your Function App in Azure Portal
2. Click on your function (`hello`)
3. Click "Monitor" tab
4. View invocations, success/failure, duration

### Application Insights Queries

Access Application Insights → Logs, then run:

```kusto
// View all requests
requests
| where cloud_RoleName == "<function-app-name>"
| order by timestamp desc
| limit 100

// View failed requests
requests
| where success == false
| project timestamp, name, resultCode, duration, customDimensions

// Performance metrics
requests
| summarize avg(duration), percentile(duration, 95) by bin(timestamp, 1h)
| render timechart

// Custom logs
traces
| where message contains "hello"
| order by timestamp desc
```

### Live Metrics Stream

1. Go to Function App → Application Insights
2. Click "Live Metrics"
3. See real-time requests, performance, failures

### Using Azure CLI

```bash
# Stream logs in real-time
az webapp log tail \
  --resource-group <resource-group-name> \
  --name <function-app-name>

# Download logs
az webapp log download \
  --resource-group <resource-group-name> \
  --name <function-app-name> \
  --log-file logs.zip
```

## Security Best Practices

### 1. Authentication

- **Function Keys**: Use for API access (default: `authLevel: "function"`)
- **Azure AD**: Integrate for user authentication
- **Managed Identity**: Access Azure resources without credentials

### 2. HTTPS Only

- Enforced by default in Azure Functions
- All traffic encrypted in transit

### 3. Input Validation

```javascript
// Validate input length
if (name && name.length > 100) {
    context.res = { status: 400, body: { error: "Input too long" } };
    return;
}

// Sanitize input
const sanitized = name.replace(/[<>]/g, '');
```

### 4. Secrets Management

```javascript
// ❌ BAD: Hardcoded secrets
const apiKey = "secret-api-key-12345";

// ✅ GOOD: Use environment variables
const apiKey = process.env.API_KEY;

// ✅ BETTER: Use Azure Key Vault
// Configure Key Vault reference in app settings:
// API_KEY = @Microsoft.KeyVault(SecretUri=https://myvault.vault.azure.net/secrets/ApiKey/)
```

### 5. CORS Configuration

Set CORS in Azure Portal or `host.json`:

```json
{
  "version": "2.0",
  "extensions": {
    "http": {
      "customHeaders": {
        "Access-Control-Allow-Origin": "https://yourapp.com"
      }
    }
  }
}
```

### 6. Rate Limiting

Implement in function code or use Azure API Management.

## Cost Optimization

### Consumption Plan Pricing

| Component | Cost |
|-----------|------|
| Executions | First 1M free, then $0.20 per million |
| Execution Time | First 400,000 GB-s free, then $0.000016 per GB-s |
| Storage | ~$0.02 per GB/month |
| Application Insights | First 5 GB free, then ~$2.30 per GB |

### Example Cost Calculation

**Scenario:**
- 3 million requests/month
- 512 MB memory per request
- 500ms average duration

**Calculation:**
```
Executions: (3M - 1M free) × $0.20/1M = $0.40
GB-seconds: 3M × 0.5 GB × 0.5s = 750,000 GB-s
Compute: (750K - 400K free) × $0.000016 = $5.60
Total: $6.00/month (plus storage and monitoring)
```

### Cost Optimization Tips

1. **Optimize Execution Time**: Faster functions = lower cost
   ```javascript
   // Cache connections outside handler
   let dbConnection;

   module.exports = async function (context, req) {
       if (!dbConnection) {
           dbConnection = await createConnection();
       }
       // Use cached connection
   };
   ```

2. **Right-Size Memory**: Don't over-allocate
   - Default 1.5 GB is often sufficient
   - Monitor actual usage in Application Insights

3. **Reduce Dependencies**: Smaller = faster cold starts
   - Use only necessary npm packages
   - Consider bundling with webpack

4. **Use Premium Plan** only when needed:
   - Consistent high traffic
   - Need VNET integration
   - Cannot tolerate cold starts

## Performance Optimization

### Minimize Cold Starts

1. **Keep functions warm:**
   - Premium plan with "Always Ready" instances
   - Ping function periodically (not cost-effective for low-traffic apps)

2. **Reduce package size:**
   - Minimize dependencies
   - Use `.funcignore` to exclude unnecessary files

3. **Optimize initialization:**
   ```javascript
   // ❌ BAD: Initialize inside handler
   module.exports = async function (context, req) {
       const heavyLibrary = require('heavy-library');
       // Use library
   };

   // ✅ GOOD: Initialize outside handler (reused)
   const heavyLibrary = require('heavy-library');

   module.exports = async function (context, req) {
       // Library already loaded
   };
   ```

### Optimize Warm Execution

1. **Connection pooling** for databases
2. **Caching** for frequently accessed data
3. **Asynchronous operations** for I/O
4. **Batch processing** where possible

## Troubleshooting

### Common Issues

#### 1. Function Not Found (404)

**Problem:** `https://func-xxx.azurewebsites.net/api/hello` returns 404

**Solutions:**
- Ensure function code is deployed: `func azure functionapp publish <name>`
- Check function name in Azure Portal
- Verify route in `function.json`

#### 2. Authentication Error (401/403)

**Problem:** "Unauthorized" or "Forbidden" error

**Solutions:**
- Include function key: `?code=<key>` or header `x-functions-key: <key>`
- Get key: `az functionapp function keys list ...`
- Check `authLevel` in `function.json`

#### 3. Cold Start Timeout

**Problem:** First request times out or is very slow

**Solutions:**
- Expected for Consumption plan (1-3 seconds)
- Use Premium plan for production
- Optimize package size and dependencies

#### 4. Deployment Fails

**Problem:** `terraform apply` fails

**Solutions:**
- Check Azure CLI is logged in: `az account show`
- Verify subscription permissions
- Ensure unique names (random suffix handles this)
- Check quota limits in subscription

## Cleanup

### Delete Resources

```bash
# Using Terraform (recommended)
terraform destroy

# Or using Azure CLI
az group delete --name <resource-group-name> --yes --no-wait
```

**Warning:** This permanently deletes all resources. Ensure you have backups if needed.

### Verify Deletion

```bash
# List resource groups
az group list --output table

# Check if resources still exist
az resource list --resource-group <resource-group-name>
```

## Next Steps

### Learning Path

1. **Add More Triggers:**
   - Timer trigger (cron jobs)
   - Queue trigger (background processing)
   - Blob trigger (file processing)
   - Event Grid trigger (event-driven)

2. **Add Output Bindings:**
   - Write to Storage Queue
   - Save to Cosmos DB
   - Send to Service Bus

3. **Implement Durable Functions:**
   - Stateful workflows
   - Function chaining
   - Fan-out/fan-in patterns

4. **Set Up CI/CD:**
   - GitHub Actions
   - Azure DevOps
   - Automated testing and deployment

5. **Advanced Security:**
   - Azure AD authentication
   - API Management integration
   - Virtual Network integration

### Example Extensions

#### Add Database Access

```javascript
const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient(process.env.COSMOS_CONNECTION);
const database = client.database("mydb");
const container = database.container("items");

module.exports = async function (context, req) {
    const { resource: item } = await container.items.create({
        id: Date.now().toString(),
        name: req.query.name
    });

    context.res = { status: 200, body: item };
};
```

#### Add Timer Trigger

Create `TimerTrigger/function.json`:
```json
{
  "bindings": [
    {
      "name": "myTimer",
      "type": "timerTrigger",
      "direction": "in",
      "schedule": "0 */5 * * * *"
    }
  ]
}
```

## Resources

### Documentation
- [Azure Functions Overview](https://docs.microsoft.com/azure/azure-functions/)
- [Azure Functions JavaScript Guide](https://docs.microsoft.com/azure/azure-functions/functions-reference-node)
- [Terraform Azure Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)

### Tools
- [Azure Functions Core Tools](https://github.com/Azure/azure-functions-core-tools)
- [VS Code Azure Functions Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)

### Community
- [Azure Functions GitHub](https://github.com/Azure/Azure-Functions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/azure-functions)

## Support

For issues with this example:
1. Check troubleshooting section above
2. Review Azure Functions documentation
3. Check Application Insights logs for errors

---

**Cost Estimate:** < $5/month for development usage
**Deployment Time:** ~5 minutes
**Difficulty:** Beginner-friendly

Happy serverless coding! 🚀
