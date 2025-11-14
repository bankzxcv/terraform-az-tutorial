# Cloud CLI Setup

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Azure CLI Setup](#azure-cli-setup)
- [AWS CLI Setup](#aws-cli-setup-optional)
- [Google Cloud SDK Setup](#google-cloud-sdk-setup-optional)
- [Multi-Cloud Authentication](#multi-cloud-authentication)
- [Verification](#verification)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Overview

Cloud CLI tools are essential for managing cloud resources, authenticating Terraform, and troubleshooting deployments. This guide covers the setup and configuration of Azure CLI, AWS CLI, and Google Cloud SDK for use with Terraform.

---

## Learning Objectives

By the end of this guide, you will:
- Install and configure Azure CLI for Terraform authentication
- Set up AWS CLI for multi-cloud deployments (optional)
- Configure Google Cloud SDK for GCP resources (optional)
- Understand different authentication methods
- Know how to switch between multiple accounts and subscriptions

---

## Difficulty Level

**Beginner** - Step-by-step instructions provided.

---

## Time Estimate

**30-45 minutes** - Depending on how many cloud providers you set up.

---

## Azure CLI Setup

### Installation

See [Prerequisites Guide](./01-prerequisites.md) for detailed installation instructions.

**Quick Install:**

**macOS:**
```bash
brew install azure-cli
```

**Windows:**
```powershell
winget install Microsoft.AzureCLI
```

**Linux:**
```bash
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

---

### Authentication

#### Method 1: Interactive Login (Recommended for Development)

```bash
# Login with browser
az login

# Expected: Browser opens for authentication
# After successful login, you'll see your subscriptions
```

**Output Example:**
```json
[
  {
    "cloudName": "AzureCloud",
    "id": "12345678-1234-1234-1234-123456789012",
    "isDefault": true,
    "name": "My Azure Subscription",
    "state": "Enabled",
    "tenantId": "87654321-4321-4321-4321-210987654321",
    "user": {
      "name": "user@example.com",
      "type": "user"
    }
  }
]
```

#### Method 2: Device Code Login (For Remote/SSH Sessions)

```bash
# Use device code flow
az login --use-device-code

# Follow the instructions:
# 1. Visit https://microsoft.com/devicelogin
# 2. Enter the provided code
# 3. Authenticate in browser
```

#### Method 3: Service Principal (Recommended for CI/CD)

**Create Service Principal:**
```bash
# Create service principal
az ad sp create-for-rbac --name "terraform-sp" --role Contributor

# Output (SAVE THIS - shown only once):
{
  "appId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  "displayName": "terraform-sp",
  "password": "your-secret-password",
  "tenant": "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
}
```

**Login with Service Principal:**
```bash
az login --service-principal \
  --username "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee" \
  --password "your-secret-password" \
  --tenant "ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
```

**Set Environment Variables:**
```bash
# Linux/macOS
export ARM_CLIENT_ID="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
export ARM_CLIENT_SECRET="your-secret-password"
export ARM_TENANT_ID="ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
export ARM_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"

# Windows PowerShell
$env:ARM_CLIENT_ID="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
$env:ARM_CLIENT_SECRET="your-secret-password"
$env:ARM_TENANT_ID="ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj"
$env:ARM_SUBSCRIPTION_ID="12345678-1234-1234-1234-123456789012"
```

---

### Managing Subscriptions

```bash
# List all subscriptions
az account list --output table

# Show current subscription
az account show

# Set default subscription
az account set --subscription "My Azure Subscription"
# or by subscription ID
az account set --subscription "12345678-1234-1234-1234-123456789012"

# Verify current subscription
az account show --query name --output tsv
```

---

### Useful Azure CLI Commands

```bash
# List resource groups
az group list --output table

# List locations
az account list-locations --output table

# Get subscription details
az account show --output json

# Test connectivity
az group list --query "[0]" --output json

# Logout
az logout
```

---

### Configuration

**Set default location:**
```bash
az config set defaults.location=eastus
```

**Set default resource group:**
```bash
az config set defaults.group=myResourceGroup
```

**View all configurations:**
```bash
az config get
```

**Configuration file location:**
- Linux/macOS: `~/.azure/config`
- Windows: `%USERPROFILE%\.azure\config`

---

## AWS CLI Setup (Optional)

### Installation

**macOS:**
```bash
brew install awscli
```

**Windows:**
```powershell
# Download and install MSI
# https://awscli.amazonaws.com/AWSCLIV2.msi
```

**Linux:**
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

---

### Authentication

#### Method 1: Interactive Configuration

```bash
aws configure

# You'll be prompted for:
# AWS Access Key ID: AKIAIOSFODNN7EXAMPLE
# AWS Secret Access Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
# Default region name: us-east-1
# Default output format: json
```

#### Method 2: Environment Variables

```bash
# Linux/macOS
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"

# Windows PowerShell
$env:AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
$env:AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
$env:AWS_DEFAULT_REGION="us-east-1"
```

#### Method 3: Named Profiles

```bash
# Configure named profile
aws configure --profile myproject

# Use profile with AWS CLI
aws s3 ls --profile myproject

# Use profile with Terraform
export AWS_PROFILE=myproject
```

---

### Managing Profiles

```bash
# List configured profiles
cat ~/.aws/config

# View credentials
cat ~/.aws/credentials  # Be careful with this!

# Test authentication
aws sts get-caller-identity

# Example output:
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/terraform-user"
}
```

---

### Useful AWS CLI Commands

```bash
# List S3 buckets
aws s3 ls

# List EC2 instances
aws ec2 describe-instances --output table

# Get caller identity
aws sts get-caller-identity

# List regions
aws ec2 describe-regions --output table
```

---

## Google Cloud SDK Setup (Optional)

### Installation

**macOS/Linux:**
```bash
# Download and install
curl https://sdk.cloud.google.com | bash

# Restart shell
exec -l $SHELL

# Initialize
gcloud init
```

**Windows:**
```powershell
# Download installer
# https://cloud.google.com/sdk/docs/install

# Run installer and follow prompts
```

---

### Authentication

#### Method 1: Interactive Login

```bash
# Initialize and authenticate
gcloud init

# Or login separately
gcloud auth login

# Browser opens for authentication
```

#### Method 2: Application Default Credentials

```bash
# For local development
gcloud auth application-default login

# This creates credentials at:
# Linux/macOS: ~/.config/gcloud/application_default_credentials.json
# Windows: %APPDATA%\gcloud\application_default_credentials.json
```

#### Method 3: Service Account (For CI/CD)

```bash
# Create service account
gcloud iam service-accounts create terraform-sa \
  --display-name "Terraform Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:terraform-sa@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/editor"

# Create and download key
gcloud iam service-accounts keys create ~/terraform-key.json \
  --iam-account terraform-sa@PROJECT_ID.iam.gserviceaccount.com

# Use with Terraform
export GOOGLE_APPLICATION_CREDENTIALS="~/terraform-key.json"
```

---

### Managing Projects

```bash
# List projects
gcloud projects list

# Set default project
gcloud config set project PROJECT_ID

# View current project
gcloud config get-value project

# Create new project
gcloud projects create PROJECT_ID --name="My Project"
```

---

### Configuration

```bash
# List configurations
gcloud config list

# Set default region
gcloud config set compute/region us-central1

# Set default zone
gcloud config set compute/zone us-central1-a

# View all properties
gcloud config list --all
```

---

### Useful Google Cloud Commands

```bash
# List compute instances
gcloud compute instances list

# List storage buckets
gcloud storage buckets list

# Get project info
gcloud projects describe PROJECT_ID

# Test authentication
gcloud auth list
```

---

## Multi-Cloud Authentication

### Managing Multiple Cloud Credentials

**Environment Variable Approach:**

Create cloud-specific profile scripts:

**azure-profile.sh:**
```bash
#!/bin/bash
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
# For service principal:
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
```

**aws-profile.sh:**
```bash
#!/bin/bash
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

**gcp-profile.sh:**
```bash
#!/bin/bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
export GOOGLE_PROJECT="your-project-id"
export GOOGLE_REGION="us-central1"
```

**Usage:**
```bash
# Source the appropriate profile
source azure-profile.sh
terraform plan

# Switch to AWS
source aws-profile.sh
terraform plan
```

---

### Using .env Files

Create `.env.azure`, `.env.aws`, `.env.gcp`:

**.env.azure:**
```bash
ARM_SUBSCRIPTION_ID=your-subscription-id
ARM_TENANT_ID=your-tenant-id
ARM_CLIENT_ID=your-client-id
ARM_CLIENT_SECRET=your-client-secret
```

**.env.aws:**
```bash
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_DEFAULT_REGION=us-east-1
```

**Load with:**
```bash
# Install dotenv (if needed)
# npm install -g dotenv-cli

# Use with commands
export $(cat .env.azure | xargs)
terraform plan
```

---

## Verification

### Create Verification Script

**verify-cloud-auth.sh:**
```bash
#!/bin/bash

echo "=== Verifying Cloud CLI Setup ==="

echo -e "\n1. Azure CLI"
if command -v az &> /dev/null; then
    echo "   ✓ Azure CLI installed: $(az version --query '\"azure-cli\"' -o tsv)"
    if az account show &> /dev/null; then
        echo "   ✓ Authenticated as: $(az account show --query user.name -o tsv)"
        echo "   ✓ Subscription: $(az account show --query name -o tsv)"
    else
        echo "   ✗ Not authenticated. Run: az login"
    fi
else
    echo "   ✗ Azure CLI not found"
fi

echo -e "\n2. AWS CLI"
if command -v aws &> /dev/null; then
    echo "   ✓ AWS CLI installed: $(aws --version)"
    if aws sts get-caller-identity &> /dev/null; then
        echo "   ✓ Authenticated as: $(aws sts get-caller-identity --query Arn --output text)"
    else
        echo "   ✗ Not authenticated. Run: aws configure"
    fi
else
    echo "   ✗ AWS CLI not found (optional)"
fi

echo -e "\n3. Google Cloud SDK"
if command -v gcloud &> /dev/null; then
    echo "   ✓ gcloud installed: $(gcloud version --format='value(version)')"
    if gcloud auth list --filter=status:ACTIVE --format="value(account)" &> /dev/null; then
        echo "   ✓ Authenticated as: $(gcloud auth list --filter=status:ACTIVE --format='value(account)')"
        echo "   ✓ Project: $(gcloud config get-value project)"
    else
        echo "   ✗ Not authenticated. Run: gcloud init"
    fi
else
    echo "   ✗ Google Cloud SDK not found (optional)"
fi

echo -e "\n=== Verification Complete ==="
```

**Run:**
```bash
chmod +x verify-cloud-auth.sh
./verify-cloud-auth.sh
```

---

## Troubleshooting

### Azure CLI Issues

**Issue: Login fails with browser**
```bash
# Solution: Use device code
az login --use-device-code
```

**Issue: Wrong subscription selected**
```bash
# Solution: List and select correct subscription
az account list --output table
az account set --subscription "Subscription Name"
```

**Issue: Permissions denied**
```bash
# Solution: Check your role assignment
az role assignment list --assignee your@email.com --output table

# You need at least "Contributor" role for Terraform
```

---

### AWS CLI Issues

**Issue: Command not found**
```bash
# Solution: Check installation and PATH
which aws
export PATH=$PATH:/usr/local/bin
```

**Issue: Access denied errors**
```bash
# Solution: Verify credentials
aws sts get-caller-identity

# Check IAM permissions in AWS Console
```

**Issue: Invalid credentials**
```bash
# Solution: Reconfigure
aws configure
# Or check credentials file
cat ~/.aws/credentials
```

---

### Google Cloud SDK Issues

**Issue: Project not set**
```bash
# Solution: Set project
gcloud config set project PROJECT_ID
```

**Issue: Authentication errors**
```bash
# Solution: Re-authenticate
gcloud auth login
gcloud auth application-default login
```

**Issue: Insufficient permissions**
```bash
# Solution: Grant necessary roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:your@email.com" \
  --role="roles/editor"
```

---

## Security Best Practices

### 1. Never Commit Credentials

**Create .gitignore:**
```bash
cat >> .gitignore << 'EOF'
# Cloud credentials
.env
.env.*
**/credentials.json
**/service-account*.json
**/.terraform/
terraform.tfstate*
.terraformrc
terraform.rc

# Azure
.azure/

# AWS
.aws/credentials
.aws/config

# GCP
application_default_credentials.json
EOF
```

### 2. Use Secret Management

- Azure: Use Azure Key Vault
- AWS: Use AWS Secrets Manager or Parameter Store
- GCP: Use Secret Manager

### 3. Rotate Credentials Regularly

```bash
# Azure: Rotate service principal password
az ad sp credential reset --name terraform-sp

# AWS: Rotate access keys regularly
aws iam create-access-key --user-name terraform-user

# GCP: Rotate service account keys
gcloud iam service-accounts keys create new-key.json \
  --iam-account=terraform-sa@PROJECT_ID.iam.gserviceaccount.com
```

### 4. Use Least Privilege

- Grant only necessary permissions
- Use separate service accounts for different environments
- Regularly audit access

### 5. Enable MFA

```bash
# Azure: Enable MFA in Azure Portal
# AWS: Enable MFA for IAM users
# GCP: Enable 2FA for Google account
```

---

## Next Steps

Now that your cloud CLIs are configured:

1. **Verify all authentications** using the verification script above
2. **Proceed to:** [04-first-terraform-project.md](./04-first-terraform-project.md) to create your first Terraform project
3. **Or review:** [01-prerequisites.md](./01-prerequisites.md) if you need to install additional tools

---

## Related Documentation

- [Prerequisites](./01-prerequisites.md)
- [Terraform Installation](./02-terraform-installation.md)
- [First Terraform Project](./04-first-terraform-project.md)
- [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
- [AWS CLI Documentation](https://aws.amazon.com/cli/)
- [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs)

---

**Estimated Completion Time:** 30-45 minutes

**Difficulty:** Beginner

**Previous:** [Terraform Installation](./02-terraform-installation.md) | **Next:** [First Terraform Project](./04-first-terraform-project.md)
