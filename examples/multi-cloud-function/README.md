# Multi-Cloud Function Example

This example demonstrates how to deploy the **same function** to Azure Functions, AWS Lambda, and Google Cloud Functions, allowing you to compare deployment, cost, performance, and developer experience across all three major cloud providers.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Shared Business Logic                        │
│                   (function.js)                              │
│              Cloud-Agnostic Code                             │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
       ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
       │    Azure     │ │   AWS    │ │    GCP      │
       │   Adapter    │ │ Adapter  │ │  Adapter    │
       └───────┬──────┘ └────┬─────┘ └──────┬──────┘
               │              │              │
       ┌───────▼──────┐ ┌────▼─────┐ ┌──────▼──────┐
       │   Azure      │ │   AWS    │ │  Google     │
       │  Functions   │ │  Lambda  │ │  Cloud      │
       │              │ │          │ │  Functions  │
       └──────────────┘ └──────────┘ └─────────────┘
```

## Key Concepts

### Shared Business Logic

The core business logic (`shared/function.js`) is completely cloud-agnostic:
- No cloud-specific imports
- Platform-independent data structures
- Pure JavaScript with no dependencies
- Can be unit tested without cloud SDKs

### Cloud Adapters

Each cloud has a thin adapter that:
- Transforms cloud-specific requests to standard format
- Calls shared business logic
- Transforms response back to cloud-specific format
- Handles cloud-specific features (logging, tracing)

### Benefits of This Approach

1. **Portability**: Easy to migrate between clouds
2. **Multi-Cloud**: Run same code on multiple providers
3. **Testing**: Test business logic independently
4. **Flexibility**: Switch clouds based on cost, features, or requirements
5. **Learning**: Compare clouds side-by-side

### Trade-offs

1. **Cannot use cloud-specific features** (without abstraction)
2. **Slight performance overhead** (minimal adapter layer)
3. **More complex deployment** (multiple clouds to manage)
4. **Testing complexity** (need to test all adapters)

## Structure

```
multi-cloud-function/
├── shared/
│   └── function.js          # Cloud-agnostic business logic
├── azure/
│   ├── index.js            # Azure Functions adapter
│   ├── function.json       # Azure configuration
│   ├── package.json        # Dependencies
│   └── main.tf             # Terraform deployment
├── aws/
│   ├── index.js            # AWS Lambda adapter
│   ├── package.json        # Dependencies
│   └── main.tf             # Terraform deployment
├── gcp/
│   ├── index.js            # GCP Cloud Functions adapter
│   ├── package.json        # Dependencies
│   └── main.tf             # Terraform deployment
└── README.md               # This file
```

## Deployment

### Deploy to All Three Clouds

```bash
# Azure
cd azure
terraform init && terraform apply

# AWS
cd ../aws
terraform init && terraform apply

# GCP (requires project_id in terraform.tfvars)
cd ../gcp
terraform init && terraform apply
```

### Test All Functions

```bash
# Azure
curl "https://<azure-function-app>.azurewebsites.net/api/hello?name=Azure&code=<key>"

# AWS
curl "https://<api-id>.execute-api.<region>.amazonaws.com/hello?name=AWS"

# GCP
curl "https://<region>-<project>.cloudfunctions.net/hello?name=GCP"
```

## Comparison

### Deployment Time

| Cloud | Time | Complexity |
|-------|------|-----------|
| **Azure** | 3-5 min | Medium (requires storage account, app service plan) |
| **AWS** | 2-3 min | Low (Lambda + API Gateway) |
| **GCP** | 3-5 min | Low (Function + Storage bucket) |

### Cold Start Performance

Based on this simple function (Node.js, minimal dependencies):

| Cloud | Cold Start | Warm Start |
|-------|-----------|-----------|
| **Azure** | 1-3 seconds | 10-50ms |
| **AWS** | 100-300ms | 1-10ms |
| **GCP** | 1-2 seconds | 10-50ms |

**Notes:**
- AWS Lambda has fastest cold starts
- All are fast for warm starts
- ARM64 (AWS Graviton2) is slightly faster
- Premium plans eliminate cold starts (Azure, GCP 2nd gen)

### Cost Comparison

**Scenario**: 1 million requests/month, 512MB memory, 100ms average execution

| Cloud | Free Tier | Cost/Month | Notes |
|-------|-----------|-----------|-------|
| **Azure** | 1M requests + 400K GB-s | $0.20 | Best for Microsoft ecosystem |
| **AWS** | 1M requests + 400K GB-s (permanent) | $0.20 | Permanent free tier |
| **GCP** | 2M requests + 400K GB-s | $0.00 | Within free tier (cheapest) |

**At 3M requests/month:**

| Cloud | Monthly Cost |
|-------|-------------|
| **Azure** | ~$18 |
| **AWS** | ~$19 |
| **GCP** | ~$3 |

**Winner**: GCP for cost optimization

### Developer Experience

| Aspect | Azure | AWS | GCP |
|--------|-------|-----|-----|
| **Learning Curve** | Medium | Medium | Low |
| **Documentation** | Good | Excellent | Excellent |
| **Local Testing** | Good (Core Tools) | Good (SAM) | Excellent (Functions Framework) |
| **IDE Support** | Excellent (VS Code) | Good | Good |
| **Debugging** | Good | Good | Good |

### Feature Comparison

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Max Timeout** | 10min (Premium: unlimited) | 15min | 9min (2nd gen: 60min) |
| **Max Memory** | 4GB (Premium) | 10GB | 8GB (1st gen), 32GB (2nd gen) |
| **Concurrency** | 200/instance | 1,000 | 1,000 |
| **VPC/VNet** | Premium plan | Yes | VPC Connector |
| **Container Support** | Yes | Yes | 2nd gen (Cloud Run) |

### Monitoring & Logging

| Cloud | Tool | Quality | Cost |
|-------|------|---------|------|
| **Azure** | Application Insights | Excellent | First 5GB free |
| **AWS** | CloudWatch Logs | Good | First 5GB free |
| **GCP** | Cloud Logging | Excellent | First 50GB free |

### Best Use Cases

**Choose Azure Functions When:**
- Microsoft ecosystem (AD, Office 365)
- Hybrid cloud scenarios
- Premium features needed (always-on, VNet)
- Durable Functions for workflows

**Choose AWS Lambda When:**
- Already on AWS
- Need most mature ecosystem
- Want extensive trigger options
- Require highest concurrency

**Choose GCP Cloud Functions When:**
- Cost optimization priority
- Simple use cases
- Integration with GCP services (BigQuery, Pub/Sub)
- Want best developer experience

## Testing

### Unit Testing (Business Logic)

```javascript
const { processGreeting } = require('./shared/function');

test('should return greeting', () => {
  const result = processGreeting({
    name: 'Test',
    environment: { cloud: 'test' }
  });

  expect(result.success).toBe(true);
  expect(result.data.greeting).toBe('Hello, Test!');
});
```

### Integration Testing

Test each cloud's adapter with their specific event formats.

## Best Practices

### 1. Keep Business Logic Separate

```javascript
// ✅ GOOD: Separate concerns
// shared/function.js - Business logic
// azure/index.js - Azure adapter
// aws/index.js - AWS adapter

// ❌ BAD: Mix cloud-specific code with business logic
```

### 2. Use Abstractions for Cloud Services

```javascript
// Abstract database access
class DatabaseAdapter {
  async get(key) {
    if (process.env.CLOUD === 'azure') {
      // Use Cosmos DB
    } else if (process.env.CLOUD === 'aws') {
      // Use DynamoDB
    } else if (process.env.CLOUD === 'gcp') {
      // Use Firestore
    }
  }
}
```

### 3. Environment-Based Configuration

```javascript
const config = {
  azure: {
    database: 'cosmos',
    storage: 'blob'
  },
  aws: {
    database: 'dynamodb',
    storage: 's3'
  },
  gcp: {
    database: 'firestore',
    storage: 'gcs'
  }
};

const cloudConfig = config[process.env.CLOUD];
```

### 4. Consistent Error Handling

```javascript
// Return consistent error format
{
  success: false,
  statusCode: 400,
  error: 'Error message',
  code: 'ERROR_CODE'
}
```

## Limitations

### What You Can't Easily Abstract

1. **Trigger-Specific Features**: Each cloud has unique triggers
2. **Cloud-Specific Services**: DynamoDB, Cosmos DB, Firestore
3. **Advanced Features**: Durable Functions, Step Functions, Cloud Workflows
4. **Performance Optimizations**: Cloud-specific tuning

### When Multi-Cloud Makes Sense

✅ **Good reasons:**
- Regulatory requirements (data residency)
- Best-of-breed services (BigQuery for analytics)
- Risk mitigation (avoid vendor lock-in)
- Customer requirements

❌ **Bad reasons:**
- "Just in case" (YAGNI)
- Fear of lock-in without specific plan
- Premature optimization

## Recommendations

### For Learning

✅ **This example is perfect** for:
- Understanding cloud differences
- Comparing deployment experiences
- Learning portable design patterns
- Evaluating cost trade-offs

### For Production

**Most teams should:**
1. **Start with ONE cloud** that fits best
2. Design code to be portable (but don't implement multi-cloud)
3. Use cloud services freely (DynamoDB, Cosmos DB, etc.)
4. Add second cloud only when needed

**Implement multi-cloud when:**
- Required by compliance/regulations
- Specific service only available in one cloud
- Post-merger scenario

## Cleanup

```bash
# Azure
cd azure && terraform destroy

# AWS
cd ../aws && terraform destroy

# GCP
cd ../gcp && terraform destroy
```

## Summary

### Key Takeaways

1. **Portable code is possible** but requires discipline
2. **All three clouds are excellent** for serverless
3. **GCP is cheapest** for most workloads
4. **AWS has fastest cold starts** and most features
5. **Azure best for Microsoft shops**
6. **Multi-cloud adds complexity** - only use when justified
7. **Cloud-agnostic design is valuable** even if deploying to one cloud

### Real-World Advice

- **Start with one cloud** based on your needs
- **Write portable code** (good practice regardless)
- **Don't prematurely optimize** for multi-cloud
- **Use cloud services** to move faster
- **Add clouds when justified**, not "just in case"

---

**This example demonstrates portable serverless design while highlighting the trade-offs and considerations for multi-cloud strategies.**
