# AWS Setup and Configuration

## Learning Objectives

By the end of this lesson, you will be able to:
- Install and configure the AWS CLI
- Set up AWS credentials securely
- Configure the AWS Terraform provider
- Understand AWS authentication best practices
- Create your first AWS resources with Terraform

## Prerequisites

- Basic command line knowledge
- An AWS account (free tier available)
- Terraform installed (version 1.0+)
- Text editor (VS Code recommended)

## Time Estimate

**45-60 minutes**

---

## 1. Create an AWS Account

If you don't have an AWS account yet:

1. Visit [aws.amazon.com/free](https://aws.amazon.com/free)
2. Click "Create a Free Account"
3. Follow the registration process
4. **Important**: AWS Free Tier includes:
   - 750 hours of EC2 t2.micro instances per month (12 months)
   - 5 GB of S3 storage
   - 1 million Lambda requests per month (always free)
   - 25 GB of DynamoDB storage

**Security Tip**: Enable MFA (Multi-Factor Authentication) on your root account immediately after creation.

---

## 2. Install AWS CLI

The AWS CLI is essential for managing AWS resources and authenticating with Terraform.

### macOS

```bash
# Using Homebrew
brew install awscli

# Verify installation
aws --version
# Expected output: aws-cli/2.x.x Python/3.x.x Darwin/xx.x.x
```

### Linux

```bash
# Download and install
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

### Windows

```powershell
# Using Chocolatey
choco install awscli

# Or download MSI installer from:
# https://aws.amazon.com/cli/

# Verify installation
aws --version
```

---

## 3. Create IAM User for Terraform

**Never use your root account for day-to-day operations!**

### Step 1: Create IAM User

1. Log in to AWS Console: [console.aws.amazon.com](https://console.aws.amazon.com)
2. Navigate to **IAM** (Identity and Access Management)
3. Click **Users** → **Add users**
4. User name: `terraform-user`
5. Select: **Programmatic access** (Access key - for AWS CLI and Terraform)
6. Click **Next: Permissions**

### Step 2: Attach Policies

For learning purposes, attach these policies:
- `AdministratorAccess` (for full access during learning)

**Production Best Practice**: Use least privilege principle with specific policies:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:*",
        "s3:*",
        "lambda:*",
        "iam:*",
        "rds:*",
        "vpc:*"
      ],
      "Resource": "*"
    }
  ]
}
```

### Step 3: Save Credentials

After creating the user, you'll see:
- **Access Key ID**: `AKIAIOSFODNN7EXAMPLE`
- **Secret Access Key**: `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`

**IMPORTANT**:
- Save these credentials securely
- The secret key is shown only once
- Never commit these to Git
- Rotate keys regularly (every 90 days)

---

## 4. Configure AWS CLI

Configure your AWS credentials using the CLI:

```bash
aws configure
```

You'll be prompted for:

```
AWS Access Key ID [None]: AKIAIOSFODNN7EXAMPLE
AWS Secret Access Key [None]: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
Default region name [None]: us-east-1
Default output format [None]: json
```

### Verify Configuration

```bash
# Check current configuration
aws configure list

# Test credentials
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDAI23HXN2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/terraform-user"
}
```

### Understanding AWS Configuration Files

Credentials are stored in:
```
~/.aws/credentials
~/.aws/config
```

**~/.aws/credentials**:
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**~/.aws/config**:
```ini
[default]
region = us-east-1
output = json
```

---

## 5. Configure Terraform AWS Provider

### Basic Provider Configuration

Create a file called `main.tf`:

```hcl
# Configure Terraform settings and required providers
terraform {
  # Specify minimum Terraform version
  required_version = ">= 1.0"

  # Define required providers and their versions
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"  # Use AWS provider version 5.x
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = "us-east-1"  # AWS region where resources will be created

  # Optional: Add default tags to all resources
  default_tags {
    tags = {
      Environment = "Learning"
      ManagedBy   = "Terraform"
      Project     = "AWS-Tutorial"
    }
  }
}
```

### Provider Configuration Options

```hcl
provider "aws" {
  region     = "us-east-1"

  # Method 1: Use AWS CLI credentials (recommended for local development)
  # Credentials are read from ~/.aws/credentials
  profile    = "default"

  # Method 2: Explicit credentials (NOT RECOMMENDED - for demonstration only)
  # access_key = "YOUR_ACCESS_KEY"
  # secret_key = "YOUR_SECRET_KEY"

  # Method 3: Assume IAM role (recommended for CI/CD)
  # assume_role {
  #   role_arn     = "arn:aws:iam::123456789012:role/TerraformRole"
  #   session_name = "terraform-session"
  # }

  # Default tags applied to all resources
  default_tags {
    tags = {
      Environment = "Development"
      ManagedBy   = "Terraform"
      Owner       = "DevOps-Team"
    }
  }
}
```

---

## 6. Initialize Terraform

```bash
# Initialize Terraform (downloads AWS provider)
terraform init
```

Expected output:
```
Initializing the backend...

Initializing provider plugins...
- Finding hashicorp/aws versions matching "~> 5.0"...
- Installing hashicorp/aws v5.x.x...
- Installed hashicorp/aws v5.x.x (signed by HashiCorp)

Terraform has been successfully initialized!
```

---

## 7. Your First AWS Resource

Let's create a simple S3 bucket to test our setup:

```hcl
# main.tf
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
    }
  }
}

# Generate a random suffix for unique bucket name
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Create an S3 bucket
resource "aws_s3_bucket" "test_bucket" {
  # S3 bucket names must be globally unique
  bucket = "my-first-terraform-bucket-${random_id.bucket_suffix.hex}"

  # Enable versioning for the bucket
  tags = {
    Name        = "My First Terraform Bucket"
    Purpose     = "Learning"
  }
}

# Configure bucket versioning
resource "aws_s3_bucket_versioning" "test_bucket_versioning" {
  bucket = aws_s3_bucket.test_bucket.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Output the bucket name
output "bucket_name" {
  description = "Name of the created S3 bucket"
  value       = aws_s3_bucket.test_bucket.id
}

output "bucket_arn" {
  description = "ARN of the created S3 bucket"
  value       = aws_s3_bucket.test_bucket.arn
}
```

### Deploy the Resource

```bash
# Preview changes
terraform plan

# Apply changes
terraform apply

# Type 'yes' when prompted
```

### Clean Up

```bash
# Destroy resources when done
terraform destroy

# Type 'yes' when prompted
```

---

## 8. AWS Regions and Availability Zones

### Understanding AWS Regions

AWS has regions worldwide:
- **us-east-1**: US East (N. Virginia)
- **us-west-2**: US West (Oregon)
- **eu-west-1**: Europe (Ireland)
- **ap-southeast-1**: Asia Pacific (Singapore)

```bash
# List all available regions
aws ec2 describe-regions --output table

# List availability zones in a region
aws ec2 describe-availability-zones --region us-east-1
```

### Multi-Region Setup

```hcl
# Configure multiple providers for multi-region deployment
provider "aws" {
  alias  = "us_east"
  region = "us-east-1"
}

provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

# Create resources in different regions
resource "aws_s3_bucket" "east_bucket" {
  provider = aws.us_east
  bucket   = "my-east-bucket"
}

resource "aws_s3_bucket" "west_bucket" {
  provider = aws.us_west
  bucket   = "my-west-bucket"
}
```

---

## 9. Security Best Practices

### 1. Never Hardcode Credentials

**DON'T DO THIS**:
```hcl
provider "aws" {
  access_key = "AKIAIOSFODNN7EXAMPLE"  # NEVER DO THIS!
  secret_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"  # NEVER!
}
```

**DO THIS INSTEAD**:
```hcl
provider "aws" {
  # Credentials read from ~/.aws/credentials or environment variables
  region = "us-east-1"
}
```

### 2. Use Environment Variables

```bash
# Set credentials via environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Run Terraform
terraform apply
```

### 3. Use AWS Profiles

```bash
# Configure multiple profiles
aws configure --profile production
aws configure --profile development

# Use specific profile with Terraform
AWS_PROFILE=production terraform apply
```

### 4. Enable MFA for Sensitive Operations

```hcl
provider "aws" {
  region = "us-east-1"

  assume_role {
    role_arn     = "arn:aws:iam::123456789012:role/TerraformRole"
    session_name = "terraform"
    mfa_serial   = "arn:aws:iam::123456789012:mfa/user"
  }
}
```

### 5. Use .gitignore

Always add to `.gitignore`:
```
# Terraform files
*.tfstate
*.tfstate.*
.terraform/
.terraform.lock.hcl

# AWS credentials
.aws/
credentials
*.pem
*.key

# Environment variables
.env
.env.local
```

---

## 10. Cost Management

### AWS Free Tier Monitoring

1. Enable **AWS Budgets**:
   - Set a budget alert for $5-10
   - Receive email notifications

2. Enable **Cost Explorer**:
   - Monitor daily costs
   - Identify expensive resources

### Always Clean Up Resources

```bash
# Always destroy test resources
terraform destroy

# Verify resources are deleted in AWS Console
```

### Use Cost Tags

```hcl
provider "aws" {
  default_tags {
    tags = {
      Project     = "Learning"
      Environment = "Development"
      CostCenter  = "Training"
      Owner       = "your-name"
    }
  }
}
```

---

## Common Issues and Troubleshooting

### Issue 1: Credentials Not Found

**Error**:
```
Error: No valid credential sources found
```

**Solution**:
```bash
# Reconfigure AWS CLI
aws configure

# Verify credentials
aws sts get-caller-identity
```

### Issue 2: Region Not Set

**Error**:
```
Error: region not found
```

**Solution**:
```hcl
provider "aws" {
  region = "us-east-1"  # Always specify region
}
```

### Issue 3: Permission Denied

**Error**:
```
Error: Access Denied
```

**Solution**:
- Check IAM user has required permissions
- Verify correct credentials are being used
- Check AWS CLI profile: `aws configure list`

### Issue 4: Resource Already Exists

**Error**:
```
Error: BucketAlreadyExists
```

**Solution**:
- S3 bucket names must be globally unique
- Use random suffix: `bucket = "my-bucket-${random_id.suffix.hex}"`

---

## Hands-On Exercise

### Exercise 1: Multi-Region Setup

Create S3 buckets in three different regions:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# TODO: Configure three AWS providers for:
# - us-east-1
# - us-west-2
# - eu-west-1

# TODO: Create an S3 bucket in each region

# TODO: Output all bucket names and regions
```

### Exercise 2: Secure Configuration

1. Create a separate AWS profile called `terraform-learning`
2. Configure Terraform to use this profile
3. Create an S3 bucket with encryption enabled
4. Add appropriate tags

### Exercise 3: Cost Monitoring

1. Enable AWS Cost Explorer
2. Set up a budget alert for $10
3. Create resources and monitor costs
4. Clean up all resources

---

## Key Takeaways

- **Never use root credentials** for daily operations
- **Always use IAM users** with appropriate permissions
- **Never hardcode credentials** in Terraform files
- **Use AWS profiles** for managing multiple accounts
- **Enable MFA** for production accounts
- **Monitor costs** using AWS Budgets
- **Always clean up** resources after testing
- **Use default tags** for resource organization

---

## Next Steps

In the next lesson, we'll cover:
- IAM roles and policies
- VPC basics and networking concepts
- Security groups and network ACLs
- AWS service fundamentals

**Continue to**: [02-aws-basics.md](./02-aws-basics.md)

---

## Additional Resources

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS Free Tier](https://aws.amazon.com/free/)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)

---

**Estimated Completion Time**: 45-60 minutes

**Difficulty**: Beginner ⭐

**Next Lesson**: [AWS Basics - IAM, VPC, and Security Groups](./02-aws-basics.md)
