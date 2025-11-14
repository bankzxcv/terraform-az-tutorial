# GCP Cloud Function Example

A complete, production-ready example of deploying a Cloud Function using Terraform. This example demonstrates best practices for serverless deployments on Google Cloud Platform.

## What This Example Demonstrates

- HTTP-triggered Cloud Function (2nd generation)
- Automated source code packaging and deployment
- Service account with least-privilege permissions
- Environment variable configuration
- Resource labeling and organization
- Public and private access patterns
- Comprehensive logging and monitoring

## Project Structure

```
gcp-cloud-functions/
├── README.md           # This file
├── index.js            # Cloud Function source code (Node.js)
├── package.json        # Node.js dependencies
├── main.tf             # Main Terraform configuration
├── variables.tf        # Input variables
├── outputs.tf          # Output values
└── terraform.tfvars    # Variable values (create this)
```

## Prerequisites

Before you begin, ensure you have:

1. **GCP Project**
   - Active GCP project with billing enabled
   - Project ID ready

2. **APIs Enabled**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

3. **Tools Installed**
   - [Terraform](https://www.terraform.io/downloads) >= 1.5.0
   - [gcloud CLI](https://cloud.google.com/sdk/docs/install)
   - [Node.js](https://nodejs.org/) >= 20.0.0 (for local testing)

4. **Authentication**
   ```bash
   # Login to GCP
   gcloud auth login

   # Set default project
   gcloud config set project YOUR_PROJECT_ID

   # Set application default credentials
   gcloud auth application-default login
   ```

## Quick Start

### Step 1: Clone and Navigate

```bash
cd examples/gcp-cloud-functions
```

### Step 2: Configure Variables

Create a `terraform.tfvars` file:

```hcl
# terraform.tfvars
project_id = "your-gcp-project-id"
region     = "us-central1"

# Optional: customize function
function_name       = "my-hello-world"
environment         = "dev"
memory              = "256M"
timeout             = 60
max_instances       = 10
public_access       = true
```

**Important:** Never commit `terraform.tfvars` with sensitive data! Add it to `.gitignore`.

### Step 3: Initialize Terraform

```bash
terraform init
```

This downloads the required provider plugins.

### Step 4: Review the Plan

```bash
terraform plan
```

Review what resources will be created:
- Cloud Function (2nd gen)
- Cloud Storage bucket for function source
- Service account for function execution
- IAM bindings

### Step 5: Deploy

```bash
terraform apply
```

Type `yes` when prompted. Deployment takes 2-5 minutes.

### Step 6: Test the Function

After deployment, Terraform outputs the function URL. Test it:

```bash
# Get the function URL from outputs
FUNCTION_URL=$(terraform output -raw function_url)

# Simple test
curl "$FUNCTION_URL"

# Test with parameters
curl "$FUNCTION_URL?name=Alice&greeting=Hello"

# Test with POST
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "greeting": "Welcome"}'
```

Expected response:
```json
{
  "message": "Hello, Alice!",
  "metadata": {
    "environment": "dev",
    "version": "1.0.0",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "..."
  },
  "request": {
    "method": "GET",
    "path": "/",
    "ip": "...",
    "userAgent": "curl/7.88.1"
  }
}
```

## Function Variants

The `index.js` file includes multiple function examples. Change the `function_entry_point` variable to use different functions:

### 1. Hello World (Default)

```hcl
function_entry_point = "helloWorld"
```

Simple greeting function for learning.

### 2. Data Processing

```hcl
function_entry_point = "processData"
```

Demonstrates:
- Request validation
- Data transformation
- Async operations

Test:
```bash
curl -X POST "$FUNCTION_URL" \
  -H "Content-Type: application/json" \
  -d '{"data": [1, 2, 3, 4, 5]}'
```

### 3. Health Check

```hcl
function_entry_point = "healthCheck"
```

Returns function health status (useful for monitoring).

### 4. Error Handling

```hcl
function_entry_point = "errorExample"
```

Demonstrates error handling and logging.

## Configuration Options

### Environment-Specific Settings

**Development:**
```hcl
environment   = "dev"
memory        = "256M"
timeout       = 60
max_instances = 5
public_access = true
```

**Staging:**
```hcl
environment   = "staging"
memory        = "512M"
timeout       = 120
max_instances = 10
public_access = false
```

**Production:**
```hcl
environment   = "prod"
memory        = "1Gi"
timeout       = 300
max_instances = 100
public_access = false
```

### Memory Options

Available memory settings:
- `128M`, `256M`, `512M` - Low memory
- `1Gi`, `2Gi`, `4Gi`, `8Gi` - High memory

**Rule of thumb:**
- Simple API: 256M
- Data processing: 512M-1Gi
- Heavy computation: 1Gi+

### Timeout Settings

- Minimum: 1 second
- Maximum: 540 seconds (9 minutes)
- Default: 60 seconds

Set based on expected execution time plus buffer.

### Access Control

**Public Access (Internet):**
```hcl
public_access    = true
ingress_settings = "ALLOW_ALL"
```

**Internal Only (GCP only):**
```hcl
public_access    = false
ingress_settings = "ALLOW_INTERNAL_ONLY"
```

**Load Balancer:**
```hcl
public_access    = false
ingress_settings = "ALLOW_INTERNAL_AND_GCLB"
```

## Monitoring and Debugging

### View Logs

```bash
# Recent logs
gcloud functions logs read FUNCTION_NAME \
  --region=REGION \
  --gen2 \
  --limit=50

# Follow logs in real-time
gcloud functions logs read FUNCTION_NAME \
  --region=REGION \
  --gen2 \
  --tail
```

### View in Cloud Console

```bash
# Get console URL
terraform output cloud_console_url
```

### View Metrics

In Cloud Console:
1. Navigate to Cloud Functions
2. Click your function
3. View "Metrics" tab for:
   - Invocations
   - Execution time
   - Memory usage
   - Error rate

### Debug Issues

**Function won't deploy:**
- Check API enablement
- Verify service account permissions
- Check Cloud Build logs

**Function returns errors:**
- Check Cloud Logging
- Verify environment variables
- Test function locally

**Slow performance:**
- Increase memory
- Optimize code
- Check cold start metrics

## Cost Estimation

Cloud Functions pricing (as of 2024):

**Invocations:**
- First 2 million: Free
- After: $0.40 per million

**Compute Time (256M memory):**
- First 400,000 GB-seconds: Free
- After: $0.0000025 per GB-second

**Example monthly cost (256M memory):**
- 1 million invocations
- Average 100ms execution time
- Estimated cost: ~$0.50/month

**Free tier covers:**
- 2M invocations
- 400K GB-seconds
- 5GB outbound data

## Security Best Practices

### 1. Use Dedicated Service Accounts

```hcl
# Already implemented in main.tf
resource "google_service_account" "function_sa" {
  account_id = "${var.function_name}-sa"
}
```

### 2. Restrict Ingress

```hcl
# Internal only
ingress_settings = "ALLOW_INTERNAL_ONLY"
public_access    = false
```

### 3. Use Secret Manager

For sensitive data:
```hcl
service_config {
  secret_environment_variables {
    key        = "API_KEY"
    project_id = var.project_id
    secret     = "my-secret-name"
    version    = "latest"
  }
}
```

### 4. Enable Logging

Already enabled by default. Review logs regularly.

### 5. Set Resource Limits

```hcl
max_instances = 10  # Prevent runaway costs
timeout       = 60  # Timeout long-running requests
```

## Cleanup

To delete all resources:

```bash
terraform destroy
```

Type `yes` when prompted.

**Note:** This deletes:
- Cloud Function
- Storage bucket (and all objects)
- Service account
- IAM bindings

## Troubleshooting

### Issue: Permission Denied

**Error:** `Error 403: Permission denied`

**Solution:**
```bash
# Ensure you're authenticated
gcloud auth application-default login

# Verify project
gcloud config get-value project

# Check APIs are enabled
gcloud services list --enabled
```

### Issue: Function Won't Deploy

**Error:** `Error deploying function`

**Solution:**
1. Check Cloud Build logs in console
2. Verify `index.js` syntax
3. Check `package.json` is valid JSON
4. Ensure APIs are enabled

### Issue: Function Returns 500

**Error:** Function responds with HTTP 500

**Solution:**
1. Check Cloud Logging for errors
2. Verify environment variables
3. Test function logic locally
4. Check external dependencies

### Issue: Terraform State Issues

**Error:** `State lock could not be acquired`

**Solution:**
```bash
# Wait for lock to release, or force unlock (dangerous!)
terraform force-unlock LOCK_ID
```

## Next Steps

After completing this example:

1. **Customize the Function**
   - Modify `index.js` with your logic
   - Add dependencies to `package.json`
   - Update environment variables

2. **Add Triggers**
   - Cloud Pub/Sub
   - Cloud Storage events
   - Cloud Firestore events

3. **Connect to Services**
   - Cloud SQL database
   - Cloud Storage buckets
   - External APIs

4. **Implement CI/CD**
   - Automate deployments
   - Add testing
   - Version control

5. **Production Hardening**
   - Add monitoring alerts
   - Implement authentication
   - Enable VPC connector
   - Add error tracking

## Additional Resources

### Documentation
- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Cloud Functions Terraform Resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function)

### Tutorials
- [GCP Cloud Functions Quickstart](https://cloud.google.com/functions/docs/quickstart)
- [Best Practices](https://cloud.google.com/functions/docs/bestpractices)
- [Security Hardening](https://cloud.google.com/functions/docs/securing)

### Learning Path
- Complete [Lesson 5: Cloud Functions](../../docs/03-gcp/05-cloud-functions.md)
- Explore [GCP Modules](../../docs/03-gcp/08-gcp-modules.md)
- Review [Production Best Practices](../../PRODUCTION_BEST_PRACTICES.md)

## Support

For questions and issues:
1. Check [documentation](https://cloud.google.com/functions/docs)
2. Review [common errors](https://cloud.google.com/functions/docs/troubleshooting)
3. Open an issue in the repository
4. Join GCP community forums

---

**Happy Learning!** 🚀

Made with ❤️ for the DevSecOps community
