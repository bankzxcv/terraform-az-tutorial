# Lesson 1: GCP Setup and Configuration

## Learning Objectives

By the end of this lesson, you will be able to:
- Install and configure the Google Cloud CLI (gcloud)
- Create and manage GCP projects
- Set up service account authentication for Terraform
- Configure the Google Cloud Terraform provider
- Understand GCP authentication best practices for DevSecOps

## Prerequisites

- A Google Cloud Platform account (free tier available at [cloud.google.com/free](https://cloud.google.com/free))
- Command line/terminal access
- Basic understanding of command line operations
- $300 free credit for 90 days (new GCP accounts)

## Time Estimate

**45-60 minutes**

---

## Step 1: Install Google Cloud CLI

### macOS

```bash
# Using Homebrew (recommended)
brew install --cask google-cloud-sdk

# Alternative: Download the installer
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### Windows

```powershell
# Using Chocolatey
choco install gcloudsdk

# Alternative: Download the installer from:
# https://cloud.google.com/sdk/docs/install#windows
```

### Linux (Debian/Ubuntu)

```bash
# Add the Cloud SDK distribution URI as a package source
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# Import the Google Cloud public key
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -

# Update and install the Cloud SDK
sudo apt-get update && sudo apt-get install google-cloud-sdk
```

### Verify Installation

```bash
# Check gcloud version
gcloud version

# You should see output like:
# Google Cloud SDK 455.0.0
# bq 2.0.97
# core 2023.11.03
# gcloud-crc32c 1.0.0
# gsutil 5.27
```

---

## Step 2: Install Terraform

### macOS

```bash
# Using Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform
```

### Windows

```powershell
# Using Chocolatey
choco install terraform

# Or download from: https://www.terraform.io/downloads
```

### Linux

```bash
# Ubuntu/Debian
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform
```

### Verify Installation

```bash
terraform version

# Output should be similar to:
# Terraform v1.6.0
# on linux_amd64
```

---

## Step 3: Initialize and Authenticate gcloud

### Login to GCP

```bash
# Initialize gcloud and authenticate
gcloud init

# This will:
# 1. Open a browser for authentication
# 2. Ask you to select or create a project
# 3. Set default compute region/zone (optional)
```

### Alternative: Authenticate Only

```bash
# Just authenticate without full initialization
gcloud auth login

# For application default credentials (used by Terraform)
gcloud auth application-default login
```

### Verify Authentication

```bash
# Check current authenticated account
gcloud auth list

# Output shows:
#       Credentialed Accounts
# ACTIVE  ACCOUNT
# *       your-email@example.com

# List available projects
gcloud projects list
```

---

## Step 4: Create a GCP Project

### Why Create a Dedicated Project?

For learning and testing, it's best to create a dedicated project that you can easily clean up later.

### Create Project via gcloud

```bash
# Set variables for your project
export PROJECT_ID="terraform-learning-$(date +%s)"
export PROJECT_NAME="Terraform Learning"

# Create the project
gcloud projects create $PROJECT_ID \
  --name="$PROJECT_NAME"

# Set as default project
gcloud config set project $PROJECT_ID

# Verify
gcloud config get-value project
```

### Create Project via Console (Alternative)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown at the top
3. Click "New Project"
4. Enter project name and organization (if applicable)
5. Click "Create"

---

## Step 5: Enable Required APIs

GCP requires you to explicitly enable APIs before using them.

```bash
# Enable essential APIs for Terraform
gcloud services enable compute.googleapis.com        # Compute Engine
gcloud services enable storage.googleapis.com        # Cloud Storage
gcloud services enable cloudresourcemanager.googleapis.com  # Resource Manager
gcloud services enable iam.googleapis.com            # IAM
gcloud services enable cloudfunctions.googleapis.com # Cloud Functions
gcloud services enable cloudbuild.googleapis.com     # Cloud Build
gcloud services enable sqladmin.googleapis.com       # Cloud SQL

# Verify enabled services
gcloud services list --enabled
```

### Understanding API Enablement

- APIs are disabled by default to prevent accidental charges
- First-time API enablement may take 1-2 minutes
- Some APIs have dependencies (e.g., Cloud Functions needs Cloud Build)

---

## Step 6: Create a Service Account for Terraform

### Why Use Service Accounts?

**Security Best Practices:**
- Service accounts provide non-human identity for applications
- Enable principle of least privilege
- Allow key rotation without affecting user accounts
- Provide audit trail of automated actions

### Create Service Account

```bash
# Set service account name
export SA_NAME="terraform-automation"
export SA_DISPLAY_NAME="Terraform Automation Service Account"

# Create service account
gcloud iam service-accounts create $SA_NAME \
  --display-name="$SA_DISPLAY_NAME" \
  --description="Service account for Terraform infrastructure automation"

# Get service account email
export SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# Verify creation
gcloud iam service-accounts list
```

---

## Step 7: Grant Permissions to Service Account

### Understanding IAM Roles

For learning purposes, we'll grant Editor role. In production, use fine-grained roles.

```bash
# Grant Editor role (broad permissions for learning)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/editor"

# For production, use specific roles like:
# - roles/compute.admin (Compute Engine)
# - roles/storage.admin (Cloud Storage)
# - roles/cloudfunctions.developer (Cloud Functions)
# - roles/cloudsql.admin (Cloud SQL)
```

### Production Best Practice: Custom Roles

```bash
# Example: Create custom role with minimal permissions
gcloud iam roles create terraformCustomRole \
  --project=$PROJECT_ID \
  --title="Terraform Custom Role" \
  --description="Minimal permissions for Terraform" \
  --permissions=compute.instances.create,compute.instances.delete,storage.buckets.create \
  --stage=GA
```

---

## Step 8: Create and Download Service Account Key

### Create JSON Key

```bash
# Create keys directory
mkdir -p ~/.gcp/keys

# Create and download key
gcloud iam service-accounts keys create ~/.gcp/keys/${PROJECT_ID}-terraform.json \
  --iam-account=$SA_EMAIL

# Set restrictive permissions
chmod 600 ~/.gcp/keys/${PROJECT_ID}-terraform.json

# Display key path
echo "Service account key created at: ~/.gcp/keys/${PROJECT_ID}-terraform.json"
```

### Security Best Practices for Keys

**DO:**
- Store keys securely (encrypted, restricted permissions)
- Rotate keys regularly (every 90 days)
- Use workload identity federation when possible
- Delete unused keys immediately

**DON'T:**
- Commit keys to version control (.gitignore them!)
- Share keys via email or messaging
- Use user credentials for automation
- Grant overly broad permissions

### Add to .gitignore

```bash
# Always ignore key files
echo "*.json" >> .gitignore
echo ".gcp/" >> .gitignore
echo "**/*.json" >> .gitignore
```

---

## Step 9: Configure Terraform Provider

### Basic Provider Configuration

Create a new directory for your first Terraform project:

```bash
# Create project directory
mkdir -p ~/gcp-terraform-basics
cd ~/gcp-terraform-basics

# Create main.tf
cat > main.tf <<'EOF'
# Configure the Google Cloud Provider
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  # Authentication: Service account key file
  credentials = file("~/.gcp/keys/${PROJECT_ID}-terraform.json")

  # Default project
  project = var.project_id

  # Default region (can be overridden per resource)
  region  = var.region

  # Default zone (can be overridden per resource)
  zone    = var.zone
}

# Variables for provider configuration
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "Default GCP region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "Default GCP zone"
  type        = string
  default     = "us-central1-a"
}
EOF
```

### Alternative: Environment Variable Authentication

```bash
# Set environment variable (more secure than hardcoding path)
export GOOGLE_APPLICATION_CREDENTIALS=~/.gcp/keys/${PROJECT_ID}-terraform.json

# Simplified provider configuration
cat > main.tf <<'EOF'
provider "google" {
  # Credentials automatically loaded from GOOGLE_APPLICATION_CREDENTIALS
  project = var.project_id
  region  = var.region
}
EOF
```

### Create terraform.tfvars

```bash
# Create variables file (don't commit sensitive values!)
cat > terraform.tfvars <<EOF
project_id = "$PROJECT_ID"
region     = "us-central1"
zone       = "us-central1-a"
EOF

# Add to .gitignore
echo "terraform.tfvars" >> .gitignore
echo "*.tfvars" >> .gitignore
```

---

## Step 10: Initialize and Test Terraform

### Initialize Terraform

```bash
# Initialize Terraform (downloads provider plugins)
terraform init

# You should see:
# Initializing provider plugins...
# - Finding hashicorp/google versions matching "~> 5.0"...
# - Installing hashicorp/google v5.x.x...
# Terraform has been successfully initialized!
```

### Create a Simple Test Resource

```bash
# Add a simple resource to test
cat >> main.tf <<'EOF'

# Test resource: Cloud Storage bucket
resource "google_storage_bucket" "test" {
  name          = "${var.project_id}-terraform-test"
  location      = var.region
  force_destroy = true  # Allow deletion even with objects

  uniform_bucket_level_access = true

  labels = {
    environment = "learning"
    managed_by  = "terraform"
  }
}

output "bucket_name" {
  description = "Name of the test bucket"
  value       = google_storage_bucket.test.name
}

output "bucket_url" {
  description = "URL of the test bucket"
  value       = google_storage_bucket.test.url
}
EOF
```

### Plan and Apply

```bash
# See what Terraform will create
terraform plan

# Apply the changes
terraform apply

# Type 'yes' when prompted

# You should see:
# Apply complete! Resources: 1 added, 0 changed, 0 destroyed.
#
# Outputs:
# bucket_name = "your-project-terraform-test"
# bucket_url = "gs://your-project-terraform-test"
```

### Verify in Console

```bash
# List buckets via gcloud
gsutil ls

# Or visit: https://console.cloud.google.com/storage/browser
```

### Clean Up Test Resources

```bash
# Destroy the test resources
terraform destroy

# Type 'yes' when prompted
```

---

## Understanding GCP Regions and Zones

### Regions

Regions are independent geographic areas (e.g., us-central1, europe-west1).

**Popular Regions:**
- `us-central1` - Iowa, USA (low cost)
- `us-east1` - South Carolina, USA
- `us-west1` - Oregon, USA
- `europe-west1` - Belgium
- `asia-southeast1` - Singapore

```bash
# List all available regions
gcloud compute regions list

# Set default region
gcloud config set compute/region us-central1
```

### Zones

Zones are isolated locations within regions (e.g., us-central1-a, us-central1-b).

```bash
# List zones in a region
gcloud compute zones list --filter="region:us-central1"

# Set default zone
gcloud config set compute/zone us-central1-a
```

### Cost Considerations

- Regions have different pricing tiers
- `us-central1`, `us-east1`, `us-west1` are typically lowest cost
- Cross-region data transfer incurs charges
- Multi-zone deployments increase availability

---

## Common Authentication Methods

### 1. Service Account Key File (Development)

```hcl
provider "google" {
  credentials = file("path/to/key.json")
  project     = "my-project"
}
```

**Pros:** Simple, works everywhere
**Cons:** Key management overhead, security risk if leaked

### 2. Application Default Credentials (Recommended)

```bash
# Set up ADC
gcloud auth application-default login
```

```hcl
provider "google" {
  # Automatically uses ADC
  project = "my-project"
}
```

**Pros:** No key files, automatically rotated
**Cons:** Requires gcloud CLI on machine

### 3. Workload Identity (GKE/Cloud Run)

```hcl
provider "google" {
  # Automatically uses workload identity in GKE/Cloud Run
  project = "my-project"
}
```

**Pros:** No credentials needed, most secure
**Cons:** Only works in GCP compute environments

### 4. Environment Variables

```bash
export GOOGLE_PROJECT="my-project"
export GOOGLE_REGION="us-central1"
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"
```

```hcl
provider "google" {
  # Automatically loads from environment
}
```

---

## Best Practices for DevSecOps

### 1. Use Service Accounts for Automation

Never use personal Google accounts for Terraform:
```bash
# Bad: Using personal account
gcloud auth login

# Good: Using service account
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/sa-key.json"
```

### 2. Implement Least Privilege

```bash
# Bad: Using Owner role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/owner"

# Good: Specific roles only
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/compute.admin"
```

### 3. Enable Audit Logging

```bash
# Enable audit logs for security monitoring
gcloud logging read "protoPayload.serviceName=compute.googleapis.com" \
  --limit 10 \
  --format json
```

### 4. Use Version Constraints

```hcl
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"  # Lock to major version
    }
  }
}
```

### 5. Secure State Files

```hcl
# Store state in Cloud Storage with encryption
terraform {
  backend "gcs" {
    bucket  = "my-terraform-state"
    prefix  = "terraform/state"

    # Enable encryption
    encryption_key = "your-encryption-key"
  }
}
```

---

## Troubleshooting Common Issues

### Issue 1: API Not Enabled

**Error:**
```
Error: Error creating instance: googleapi: Error 403: Compute Engine API has not been used
```

**Solution:**
```bash
gcloud services enable compute.googleapis.com
```

### Issue 2: Insufficient Permissions

**Error:**
```
Error: Error creating bucket: googleapi: Error 403: Insufficient Permission
```

**Solution:**
```bash
# Grant storage.admin role
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### Issue 3: Invalid Credentials

**Error:**
```
Error: google: could not find default credentials
```

**Solution:**
```bash
# Set credentials environment variable
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/key.json"

# Or use application default credentials
gcloud auth application-default login
```

### Issue 4: Project Not Found

**Error:**
```
Error: googleapi: Error 403: Project 'my-project' not found
```

**Solution:**
```bash
# Verify project exists
gcloud projects list

# Set correct project
gcloud config set project YOUR_PROJECT_ID
```

### Issue 5: Quota Exceeded

**Error:**
```
Error: Error creating instance: Quota 'CPUS' exceeded
```

**Solution:**
```bash
# Check quotas
gcloud compute project-info describe --project=$PROJECT_ID

# Request quota increase in console:
# https://console.cloud.google.com/iam-admin/quotas
```

---

## Hands-On Exercise

### Exercise 1: Complete Setup

1. Install gcloud CLI and Terraform
2. Create a new GCP project
3. Enable Compute Engine API
4. Create a service account
5. Download service account key
6. Configure Terraform provider
7. Create a test storage bucket
8. Verify in GCP Console
9. Destroy resources

**Verification:**
```bash
# All these should work without errors
gcloud version
terraform version
gcloud auth list
gcloud projects list
terraform init
terraform plan
```

### Exercise 2: Security Hardening

1. Create a custom IAM role with minimal permissions
2. Create a separate service account for each environment (dev, staging, prod)
3. Implement key rotation (create new key, update reference, delete old key)
4. Add all credentials to .gitignore
5. Document your authentication setup

---

## Summary

You've successfully:
- Installed and configured Google Cloud CLI
- Created a GCP project and enabled necessary APIs
- Set up service account authentication
- Configured the Terraform Google provider
- Created and destroyed a test resource
- Learned DevSecOps best practices for GCP authentication

### Key Takeaways

1. Always use service accounts for Terraform automation
2. Never commit credentials to version control
3. Enable only necessary APIs to minimize attack surface
4. Implement least privilege access control
5. Use application default credentials when possible
6. Regularly rotate service account keys

---

## Next Steps

In **Lesson 2: GCP Basics**, you'll learn about:
- IAM roles and permissions in depth
- GCP resource hierarchy (Organizations, Folders, Projects)
- Managing multiple projects
- Resource labeling and organization
- Billing and cost management

---

## Additional Resources

### Official Documentation
- [Google Cloud CLI Documentation](https://cloud.google.com/sdk/docs)
- [Terraform Google Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [GCP IAM Documentation](https://cloud.google.com/iam/docs)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)

### Tutorials
- [GCP Free Tier](https://cloud.google.com/free)
- [Terraform Google Provider Tutorial](https://learn.hashicorp.com/tutorials/terraform/google-cloud-platform-build)
- [GCP Regions and Zones](https://cloud.google.com/compute/docs/regions-zones)

### Tools
- [gcloud CLI Reference](https://cloud.google.com/sdk/gcloud/reference)
- [Terraform Registry](https://registry.terraform.io/providers/hashicorp/google/latest)
- [Google Cloud Console](https://console.cloud.google.com)

---

**Previous:** None (This is Lesson 1)
**Next:** [Lesson 2: GCP Basics - IAM and Resource Hierarchy](02-gcp-basics.md)
