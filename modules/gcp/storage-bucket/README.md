# Cloud Storage Bucket Module

Reusable Terraform module for creating secure Google Cloud Storage buckets.

## Features

- Uniform bucket-level access (recommended)
- Object versioning
- Lifecycle policies for cost optimization
- Customer-managed encryption (CMEK)
- CORS configuration
- Static website hosting
- Access logging
- Retention policies
- Flexible IAM configuration

## Usage

### Simple Bucket

```hcl
module "data_bucket" {
  source = "./modules/gcp/storage-bucket"

  project_id = "my-project"
  name       = "my-data-bucket"
  location   = "US"

  labels = {
    environment = "production"
  }
}
```

### Bucket with Lifecycle Rules

```hcl
module "log_bucket" {
  source = "./modules/gcp/storage-bucket"

  project_id    = "my-project"
  name          = "my-log-bucket"
  location      = "US"
  storage_class = "STANDARD"

  versioning_enabled = false

  lifecycle_rules = [
    {
      action = {
        type          = "SetStorageClass"
        storage_class = "NEARLINE"
      }
      condition = {
        age = 30
      }
    },
    {
      action = {
        type = "Delete"
      }
      condition = {
        age = 90
      }
    }
  ]

  labels = {
    purpose = "logs"
  }
}
```

### Static Website Bucket

```hcl
module "website_bucket" {
  source = "./modules/gcp/storage-bucket"

  project_id = "my-project"
  name       = "www.example.com"
  location   = "US"

  website_config = {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  cors_rules = [
    {
      origin = ["https://example.com"]
      method = ["GET", "HEAD"]
      response_header = ["Content-Type"]
      max_age_seconds = 3600
    }
  ]

  public_access = true

  labels = {
    purpose = "website"
  }
}
```

### Versioned Bucket with Encryption

```hcl
module "backup_bucket" {
  source = "./modules/gcp/storage-bucket"

  project_id = "my-project"
  name       = "my-backup-bucket"
  location   = "US"

  versioning_enabled = true
  encryption_key_name = "projects/my-project/locations/us/keyRings/my-ring/cryptoKeys/my-key"

  lifecycle_rules = [
    {
      action = {
        type = "Delete"
      }
      condition = {
        num_newer_versions = 5
        with_state         = "ARCHIVED"
      }
    }
  ]

  retention_policy = {
    retention_period = 2592000  # 30 days
    is_locked        = false
  }

  labels = {
    purpose = "backups"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_id | GCP project ID | `string` | n/a | yes |
| name | Bucket name (globally unique) | `string` | n/a | yes |
| location | Bucket location | `string` | `"US"` | no |
| storage_class | Storage class | `string` | `"STANDARD"` | no |
| versioning_enabled | Enable versioning | `bool` | `false` | no |
| lifecycle_rules | Lifecycle rules | `list(object)` | `[]` | no |
| encryption_key_name | KMS key for encryption | `string` | `null` | no |
| public_access | Enable public access | `bool` | `false` | no |
| labels | Resource labels | `map(string)` | `{}` | no |

## Outputs

| Name | Description |
|------|-------------|
| bucket_name | Name of the bucket |
| bucket_url | URL of the bucket |
| bucket_self_link | Self-link |
| bucket_id | Bucket ID |
| bucket_location | Bucket location |
| bucket_storage_class | Storage class |

## Best Practices

1. **Use uniform bucket-level access** (default enabled)
2. **Enable versioning** for important data
3. **Implement lifecycle rules** for cost optimization
4. **Use CMEK** for sensitive data
5. **Never set force_destroy = true** in production
6. **Enable logging** for compliance
7. **Set retention policies** for compliance requirements

## Examples

See the [examples](./examples/) directory for complete usage examples.
