# AWS S3 Storage - Object Storage in the Cloud

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and configure S3 buckets with Terraform
- Implement bucket policies and access control
- Enable versioning and lifecycle rules
- Host static websites on S3
- Configure S3 encryption and security
- Understand S3 storage classes and cost optimization

## Prerequisites

- Completed [03-ec2-instances.md](./03-ec2-instances.md)
- Understanding of IAM policies
- Basic web development knowledge (for static website hosting)

## Time Estimate

**75-90 minutes**

---

## 1. What is Amazon S3?

Amazon Simple Storage Service (S3) is object storage built to store and retrieve any amount of data from anywhere.

**Key Features**:
- 99.999999999% (11 9's) durability
- Virtually unlimited storage
- Built-in redundancy
- Lifecycle management
- Versioning
- Access control
- Static website hosting

**Common Use Cases**:
- Backup and restore
- Data archiving
- Static website hosting
- Application data storage
- Big data analytics
- Content distribution

---

## 2. S3 Bucket Basics

### Understanding S3 Structure

```
S3 Structure:
├── Bucket (globally unique name)
│   ├── folder1/
│   │   ├── file1.txt
│   │   └── file2.jpg
│   └── folder2/
│       └── document.pdf
```

**Important**:
- Bucket names must be globally unique across all AWS accounts
- Bucket names must be DNS-compliant (lowercase, no special chars)
- You can have up to 100 buckets per account (soft limit)

### Creating Your First S3 Bucket

```hcl
# s3-basic.tf
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
      Project     = "S3-Tutorial"
    }
  }
}

# Random suffix for unique bucket name
resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# Create an S3 bucket
resource "aws_s3_bucket" "example" {
  bucket = "my-terraform-bucket-${random_id.bucket_suffix.hex}"

  tags = {
    Name        = "My First Terraform Bucket"
    Purpose     = "Learning"
  }
}

# Output bucket information
output "bucket_name" {
  description = "Name of the S3 bucket"
  value       = aws_s3_bucket.example.id
}

output "bucket_arn" {
  description = "ARN of the S3 bucket"
  value       = aws_s3_bucket.example.arn
}

output "bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.example.region
}
```

---

## 3. Bucket Versioning

Versioning keeps multiple variants of an object in the same bucket.

```hcl
# Enable versioning
resource "aws_s3_bucket_versioning" "example" {
  bucket = aws_s3_bucket.example.id

  versioning_configuration {
    status = "Enabled"  # or "Suspended"
  }
}

# MFA Delete (optional, for extra protection)
resource "aws_s3_bucket_versioning" "with_mfa" {
  bucket = aws_s3_bucket.example.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Enabled"  # Requires MFA to delete versions
  }
}
```

**Benefits of Versioning**:
- Protect against accidental deletion
- Recover from unintended user actions
- Archive objects
- Retrieve previous versions

---

## 4. Bucket Encryption

### Server-Side Encryption

```hcl
# S3-managed encryption (SSE-S3)
resource "aws_s3_bucket_server_side_encryption_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# KMS encryption (SSE-KMS) - more control
resource "aws_kms_key" "s3_key" {
  description             = "KMS key for S3 bucket encryption"
  deletion_window_in_days = 10

  tags = {
    Name = "s3-encryption-key"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "kms" {
  bucket = aws_s3_bucket.example.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.s3_key.arn
    }
    bucket_key_enabled = true  # Reduce KMS costs
  }
}
```

---

## 5. Public Access Block

**Security Best Practice**: Block all public access by default.

```hcl
# Block all public access (recommended)
resource "aws_s3_bucket_public_access_block" "example" {
  bucket = aws_s3_bucket.example.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
```

**When to allow public access**:
- Static website hosting
- Public content delivery
- Open data sharing

---

## 6. Bucket Policies

Bucket policies control access to your S3 bucket.

### Allow Public Read Access

```hcl
# Make bucket public for static website
resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })
}
```

### Allow Specific IAM User

```hcl
resource "aws_s3_bucket_policy" "user_access" {
  bucket = aws_s3_bucket.example.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::123456789012:user/john"
        }
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.example.arn}/*"
      }
    ]
  })
}
```

### Allow Access from VPC Endpoint

```hcl
resource "aws_s3_bucket_policy" "vpc_access" {
  bucket = aws_s3_bucket.example.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowVPCAccess"
        Effect = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "${aws_s3_bucket.example.arn}/*"
        Condition = {
          StringEquals = {
            "aws:sourceVpce" = aws_vpc_endpoint.s3.id
          }
        }
      }
    ]
  })
}
```

### Enforce Encryption

```hcl
resource "aws_s3_bucket_policy" "enforce_encryption" {
  bucket = aws_s3_bucket.example.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyUnencryptedObjectUploads"
        Effect = "Deny"
        Principal = "*"
        Action = "s3:PutObject"
        Resource = "${aws_s3_bucket.example.arn}/*"
        Condition = {
          StringNotEquals = {
            "s3:x-amz-server-side-encryption" = "AES256"
          }
        }
      }
    ]
  })
}
```

---

## 7. Lifecycle Rules

Automatically transition or expire objects to save costs.

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "example" {
  bucket = aws_s3_bucket.example.id

  rule {
    id     = "log-expiration"
    status = "Enabled"

    # Apply to objects with specific prefix
    filter {
      prefix = "logs/"
    }

    # Delete objects after 90 days
    expiration {
      days = 90
    }
  }

  rule {
    id     = "archive-old-data"
    status = "Enabled"

    filter {
      prefix = "archive/"
    }

    # Transition to Glacier after 30 days
    transition {
      days          = 30
      storage_class = "GLACIER"
    }

    # Transition to Deep Archive after 90 days
    transition {
      days          = 90
      storage_class = "DEEP_ARCHIVE"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }

  rule {
    id     = "cleanup-incomplete-uploads"
    status = "Enabled"

    # Clean up incomplete multipart uploads
    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  rule {
    id     = "intelligent-tiering"
    status = "Enabled"

    filter {
      prefix = "data/"
    }

    # Use Intelligent-Tiering
    transition {
      days          = 0
      storage_class = "INTELLIGENT_TIERING"
    }
  }
}
```

### S3 Storage Classes

```
┌─────────────────────────────────────────────┐
│        S3 Storage Classes                   │
├─────────────────────────────────────────────┤
│ Standard           │ Frequent access        │
│ Intelligent-Tiering│ Unknown access pattern │
│ Standard-IA        │ Infrequent access      │
│ One Zone-IA        │ Infrequent, one AZ     │
│ Glacier Instant    │ Archive, ms access     │
│ Glacier Flexible   │ Archive, min-hours     │
│ Glacier Deep Archive│ Archive, hours access │
└─────────────────────────────────────────────┘
```

---

## 8. Static Website Hosting

### Complete Static Website Example

```hcl
# s3-website.tf
# Create bucket for website
resource "aws_s3_bucket" "website" {
  bucket = "my-awesome-website-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "Static Website"
  }
}

# Enable website hosting
resource "aws_s3_bucket_website_configuration" "website" {
  bucket = aws_s3_bucket.website.id

  index_document {
    suffix = "index.html"
  }

  error_document {
    key = "error.html"
  }

  # Optional: routing rules
  routing_rule {
    condition {
      key_prefix_equals = "docs/"
    }
    redirect {
      replace_key_prefix_with = "documents/"
    }
  }
}

# Allow public access for website
resource "aws_s3_bucket_public_access_block" "website" {
  bucket = aws_s3_bucket.website.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# Public read policy
resource "aws_s3_bucket_policy" "website" {
  bucket = aws_s3_bucket.website.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.website.arn}/*"
      }
    ]
  })

  depends_on = [aws_s3_bucket_public_access_block.website]
}

# Upload index.html
resource "aws_s3_object" "index" {
  bucket       = aws_s3_bucket.website.id
  key          = "index.html"
  content_type = "text/html"
  content      = <<-HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My S3 Website</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        h1 { font-size: 3em; text-align: center; }
        p { font-size: 1.2em; line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>🚀 Hello from S3!</h1>
      <p>This is a static website hosted on Amazon S3.</p>
      <p>Deployed with Terraform! ✨</p>
    </body>
    </html>
  HTML

  etag = md5(<<-HTML
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>My S3 Website</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        h1 { font-size: 3em; text-align: center; }
        p { font-size: 1.2em; line-height: 1.6; }
      </style>
    </head>
    <body>
      <h1>🚀 Hello from S3!</h1>
      <p>This is a static website hosted on Amazon S3.</p>
      <p>Deployed with Terraform! ✨</p>
    </body>
    </html>
  HTML
  )
}

# Upload error.html
resource "aws_s3_object" "error" {
  bucket       = aws_s3_bucket.website.id
  key          = "error.html"
  content_type = "text/html"
  content      = <<-HTML
    <!DOCTYPE html>
    <html>
    <head>
      <title>Error - Page Not Found</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background-color: #f0f0f0;
        }
        h1 { color: #e74c3c; }
      </style>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
      <a href="/">Go back home</a>
    </body>
    </html>
  HTML
}

# Output website URL
output "website_url" {
  description = "URL of the S3 website"
  value       = "http://${aws_s3_bucket_website_configuration.website.website_endpoint}"
}
```

### Upload Multiple Files

```hcl
# Upload directory of files
resource "aws_s3_object" "website_files" {
  for_each = fileset("${path.module}/website", "**/*")

  bucket       = aws_s3_bucket.website.id
  key          = each.value
  source       = "${path.module}/website/${each.value}"
  content_type = lookup(local.mime_types, regex("\\.[^.]+$", each.value), "application/octet-stream")

  etag = filemd5("${path.module}/website/${each.value}")
}

# MIME types mapping
locals {
  mime_types = {
    ".html" = "text/html"
    ".css"  = "text/css"
    ".js"   = "application/javascript"
    ".json" = "application/json"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".svg"  = "image/svg+xml"
    ".ico"  = "image/x-icon"
  }
}
```

---

## 9. CORS Configuration

Enable Cross-Origin Resource Sharing for web applications.

```hcl
resource "aws_s3_bucket_cors_configuration" "example" {
  bucket = aws_s3_bucket.website.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://example.com"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }

  cors_rule {
    allowed_methods = ["PUT", "POST", "DELETE"]
    allowed_origins = ["https://app.example.com"]
    allowed_headers = ["*"]
    max_age_seconds = 3000
  }
}
```

---

## 10. S3 Access Logging

Log all requests to your S3 bucket.

```hcl
# Create log bucket
resource "aws_s3_bucket" "logs" {
  bucket = "my-s3-access-logs-${random_id.bucket_suffix.hex}"

  tags = {
    Name = "S3 Access Logs"
  }
}

# Enable logging on main bucket
resource "aws_s3_bucket_logging" "example" {
  bucket = aws_s3_bucket.example.id

  target_bucket = aws_s3_bucket.logs.id
  target_prefix = "s3-access-logs/"
}

# Lifecycle rule for log bucket
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "delete-old-logs"
    status = "Enabled"

    expiration {
      days = 90
    }
  }
}
```

---

## 11. S3 Replication

Replicate objects to another region for disaster recovery.

```hcl
# Source bucket (us-east-1)
resource "aws_s3_bucket" "source" {
  provider = aws.us_east
  bucket   = "source-bucket-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "source" {
  provider = aws.us_east
  bucket   = aws_s3_bucket.source.id

  versioning_configuration {
    status = "Enabled"  # Required for replication
  }
}

# Destination bucket (us-west-2)
resource "aws_s3_bucket" "destination" {
  provider = aws.us_west
  bucket   = "destination-bucket-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "destination" {
  provider = aws.us_west
  bucket   = aws_s3_bucket.destination.id

  versioning_configuration {
    status = "Enabled"
  }
}

# IAM role for replication
resource "aws_iam_role" "replication" {
  name = "s3-replication-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "s3.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy" "replication" {
  role = aws_iam_role.replication.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetReplicationConfiguration",
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.source.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObjectVersionForReplication",
          "s3:GetObjectVersionAcl"
        ]
        Resource = "${aws_s3_bucket.source.arn}/*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ReplicateObject",
          "s3:ReplicateDelete"
        ]
        Resource = "${aws_s3_bucket.destination.arn}/*"
      }
    ]
  })
}

# Replication configuration
resource "aws_s3_bucket_replication_configuration" "replication" {
  provider = aws.us_east
  bucket   = aws_s3_bucket.source.id
  role     = aws_iam_role.replication.arn

  rule {
    id     = "replicate-everything"
    status = "Enabled"

    filter {}

    destination {
      bucket        = aws_s3_bucket.destination.arn
      storage_class = "STANDARD_IA"

      # Optional: Replicate encryption
      encryption_configuration {
        replica_kms_key_id = aws_kms_key.destination.arn
      }
    }

    delete_marker_replication {
      status = "Enabled"
    }
  }

  depends_on = [aws_s3_bucket_versioning.source]
}
```

---

## 12. Best Practices

### Security

1. **Enable encryption by default**
2. **Block public access unless necessary**
3. **Use bucket policies for access control**
4. **Enable access logging**
5. **Enable versioning for important data**

### Cost Optimization

1. **Use lifecycle policies**
   - Transition to cheaper storage classes
   - Delete old objects automatically

2. **Use Intelligent-Tiering for unknown patterns**

3. **Enable S3 Storage Lens for insights**

4. **Delete incomplete multipart uploads**

### Performance

1. **Use S3 Transfer Acceleration for global uploads**
2. **Implement CloudFront for content delivery**
3. **Use appropriate object prefixes for partitioning**

### Compliance

1. **Enable object lock for WORM compliance**
2. **Use S3 Inventory for auditing**
3. **Implement MFA delete for critical buckets**

---

## 13. Complete Example

```hcl
# Complete secure S3 bucket with all features
module "secure_bucket" {
  source = "./modules/s3-bucket"

  bucket_name = "production-data-${random_id.bucket_suffix.hex}"

  # Versioning
  versioning_enabled = true

  # Encryption
  encryption = {
    algorithm = "aws:kms"
    key_arn   = aws_kms_key.s3_key.arn
  }

  # Lifecycle rules
  lifecycle_rules = [
    {
      id     = "archive-old-data"
      status = "Enabled"
      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]
      expiration = {
        days = 365
      }
    }
  ]

  # Access logging
  logging = {
    target_bucket = aws_s3_bucket.logs.id
    target_prefix = "access-logs/"
  }

  # Block public access
  block_public_access = true

  tags = {
    Environment = "Production"
    Compliance  = "Required"
  }
}
```

---

## Hands-On Exercises

### Exercise 1: Portfolio Website

Create a static portfolio website on S3 with:
- Custom index.html with your information
- CSS styling
- Multiple pages
- Custom error page

### Exercise 2: Data Lifecycle Management

Create an S3 bucket with:
- Versioning enabled
- Lifecycle rules to transition to Glacier after 30 days
- Automatic deletion after 1 year
- Access logging

### Exercise 3: Secure Application Bucket

Create a bucket for an application with:
- KMS encryption
- VPC endpoint access only
- Versioning with MFA delete
- Replication to another region

---

## Key Takeaways

- S3 provides durable, scalable object storage
- Always enable encryption and versioning for important data
- Use lifecycle policies to optimize costs
- Block public access by default
- Use bucket policies for fine-grained access control
- Static website hosting is easy and cost-effective

---

## Next Steps

In the next lesson, we'll cover:
- AWS Lambda functions
- Serverless computing
- Lambda triggers and integrations
- IAM roles for Lambda

**Continue to**: [05-aws-lambda.md](./05-aws-lambda.md)

---

## Additional Resources

- [S3 Documentation](https://docs.aws.amazon.com/s3/)
- [S3 Storage Classes](https://aws.amazon.com/s3/storage-classes/)
- [S3 Security Best Practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html)
- [Terraform AWS S3](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket)

---

**Estimated Completion Time**: 75-90 minutes

**Difficulty**: Intermediate ⭐⭐

**Next Lesson**: [AWS Lambda](./05-aws-lambda.md)
