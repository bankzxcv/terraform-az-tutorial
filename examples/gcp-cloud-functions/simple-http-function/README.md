# Google Cloud Functions - Simple HTTP Function Example

A beginner-friendly example of a Google Cloud Function with HTTP trigger, complete with Terraform deployment.

## Overview

This example demonstrates:
- Creating a simple HTTP-triggered Cloud Function in Node.js
- Understanding Cloud Functions architecture
- Deploying infrastructure using Terraform
- Monitoring with Cloud Logging
- Security best practices
- Cost optimization

## What You'll Deploy

- **Cloud Function**: Serverless function (1st generation)
- **Cloud Storage Bucket**: For function source code
- **IAM Policy**: Allow public invocation

## Prerequisites

1. **gcloud CLI**
   ```bash
   gcloud --version
   gcloud auth login
   gcloud config set project YOUR_PROJECT_ID
   ```

2. **Terraform** (>= 1.0)

3. **GCP Project** with billing enabled

4. **Enable APIs:**
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable cloudresourcemanager.googleapis.com
   ```

## Quick Start

### 1. Configure Project

Create `terraform.tfvars`:
```hcl
project_id = "your-gcp-project-id"
region     = "us-central1"
```

### 2. Deploy

```bash
cd examples/gcp-cloud-functions/simple-http-function

terraform init
terraform apply
```

### 3. Test

```bash
# Get function URL from output
FUNCTION_URL=$(terraform output -raw function_url)

# Test
curl "$FUNCTION_URL?name=John"
```

## Local Development

```bash
# Install dependencies
npm install

# Run locally
npm start

# Test locally
curl "http://localhost:8080?name=Local"
```

## Monitoring

### View Logs

```bash
# Stream logs
gcloud functions logs read simple-http-function --region=us-central1

# In Cloud Console
# Logging → Logs Explorer → Select Cloud Function
```

### Metrics

- Navigate to Cloud Functions → Select function → Metrics
- View invocations, execution time, memory usage

## Security

### Authentication

For authenticated access, change IAM member in `main.tf`:

```hcl
resource "google_cloudfunctions_function_iam_member" "invoker" {
  member = "serviceAccount:your-sa@project.iam.gserviceaccount.com"
}
```

### Secrets

Use Secret Manager:

```javascript
const {SecretManagerServiceClient} = require('@google-cloud/secret-manager');
const client = new SecretManagerServiceClient();

const [version] = await client.accessSecretVersion({
  name: 'projects/PROJECT_ID/secrets/SECRET_NAME/versions/latest'
});
const secret = version.payload.data.toString();
```

## Cost

### Pricing (1st Generation)

- **Invocations**: First 2M free, then $0.40 per 1M
- **Compute**: $0.0000025 per GB-second
- **Network**: $0.12 per GB egress

### Example Cost

3M invocations/month, 256MB, 100ms average:
```
Invocations: (3M - 2M) × $0.40/1M = $0.40
Compute: 3M × 0.25GB × 0.1s × $0.0000025 = $0.19
Total: ~$0.60/month
```

## Cleanup

```bash
terraform destroy
```

## Next Steps

1. Add Pub/Sub trigger
2. Integrate with Firestore
3. Add authentication
4. Implement CI/CD
5. Migrate to 2nd generation (Cloud Run)

## Resources

- [Cloud Functions Documentation](https://cloud.google.com/functions/docs)
- [Functions Framework](https://github.com/GoogleCloudPlatform/functions-framework-nodejs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

---

**Cost Estimate:** < $5/month for development
**Deployment Time:** ~3-5 minutes
**Difficulty:** Beginner-friendly
