# AWS S3 Bucket Terraform Module

A comprehensive Terraform module for creating AWS S3 buckets with security best practices and advanced features.

## Features

- S3 bucket with customizable configuration
- Versioning support
- Server-side encryption (SSE-S3, SSE-KMS)
- Public access blocking (enabled by default)
- Lifecycle rules for cost optimization
- CORS configuration
- Static website hosting
- Access logging
- Object Lock (WORM compliance)
- Cross-region replication
- Intelligent-Tiering
- Inventory configuration
- Transfer Acceleration

## Usage

### Basic Secure Bucket

```hcl
module "s3_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "my-secure-bucket"

  # Enable versioning
  versioning_enabled = true

  # Enable encryption
  encryption = {
    algorithm = "AES256"
  }

  # Block all public access (default)
  block_public_access = true

  tags = {
    Environment = "production"
  }
}
```

### Bucket with KMS Encryption

```hcl
module "encrypted_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "encrypted-data"

  versioning_enabled = true

  encryption = {
    algorithm          = "aws:kms"
    key_arn            = aws_kms_key.bucket_key.arn
    bucket_key_enabled = true
  }

  tags = {
    Environment = "production"
    Encryption  = "KMS"
  }
}
```

### Bucket with Lifecycle Rules

```hcl
module "lifecycle_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "data-archive"

  lifecycle_rules = [
    {
      id      = "archive-old-data"
      enabled = true

      transitions = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        },
        {
          days          = 180
          storage_class = "DEEP_ARCHIVE"
        }
      ]

      expiration = {
        days = 365
      }
    },
    {
      id      = "cleanup-multipart"
      enabled = true
      abort_incomplete_multipart_upload_days = 7
    }
  ]

  tags = {
    Environment = "production"
  }
}
```

### Static Website Bucket

```hcl
module "website_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "my-website"

  # Allow public access for website
  block_public_access = false

  # Enable website hosting
  website_config = {
    index_document = "index.html"
    error_document = "error.html"
  }

  # CORS for web applications
  cors_rules = [
    {
      allowed_methods = ["GET", "HEAD"]
      allowed_origins = ["https://example.com"]
      allowed_headers = ["*"]
      max_age_seconds = 3000
    }
  ]

  # Public read policy
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "arn:aws:s3:::my-website/*"
      }
    ]
  })

  tags = {
    Environment = "production"
    Type        = "Website"
  }
}
```

### Bucket with Replication

```hcl
module "replicated_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name        = "source-bucket"
  versioning_enabled = true  # Required for replication

  replication_config = {
    role_arn = aws_iam_role.replication.arn
    rules = [
      {
        id     = "replicate-all"
        status = "Enabled"

        destination = {
          bucket        = aws_s3_bucket.destination.arn
          storage_class = "STANDARD_IA"

          replication_time = {
            minutes = 15
          }

          encryption_configuration = {
            replica_kms_key_id = aws_kms_key.replica.arn
          }
        }

        delete_marker_replication = {
          status = "Enabled"
        }
      }
    ]
  }

  tags = {
    Environment = "production"
    Replication = "enabled"
  }
}
```

### Bucket with Logging

```hcl
# Create log bucket first
module "log_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "my-logs"

  # Lifecycle rule to delete old logs
  lifecycle_rules = [
    {
      id      = "delete-old-logs"
      enabled = true
      expiration = {
        days = 90
      }
    }
  ]

  tags = {
    Environment = "production"
    Type        = "Logs"
  }
}

# Main bucket with logging enabled
module "main_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "main-bucket"

  logging_config = {
    target_bucket = module.log_bucket.bucket_id
    target_prefix = "access-logs/"
  }

  tags = {
    Environment = "production"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| bucket_name | Bucket name | `string` | `null` | no |
| bucket_prefix | Bucket prefix | `string` | `null` | no |
| versioning_enabled | Enable versioning | `bool` | `false` | no |
| encryption | Encryption config | `object` | `null` | no |
| block_public_access | Block public access | `bool` | `true` | no |
| lifecycle_rules | Lifecycle rules | `list(object)` | `[]` | no |
| cors_rules | CORS rules | `list(object)` | `[]` | no |
| website_config | Website config | `object` | `null` | no |

See [variables.tf](./variables.tf) for complete list of inputs.

## Outputs

| Name | Description |
|------|-------------|
| bucket_id | Bucket name |
| bucket_arn | Bucket ARN |
| bucket_domain_name | Bucket domain name |
| website_endpoint | Website endpoint |

See [outputs.tf](./outputs.tf) for complete list of outputs.

## Examples

See the [examples/](../../../examples/) directory for complete working examples.

## Security Best Practices

1. **Enable Versioning**: Protect against accidental deletion
2. **Enable Encryption**: Always encrypt data at rest
3. **Block Public Access**: Enable by default, only disable when necessary
4. **Use Bucket Policies**: Implement least privilege access
5. **Enable Logging**: Monitor bucket access
6. **Enable MFA Delete**: For critical buckets
7. **Use KMS**: For sensitive data encryption
8. **Implement Lifecycle Rules**: Optimize costs and compliance

## License

This module is provided as-is for educational and production use.
