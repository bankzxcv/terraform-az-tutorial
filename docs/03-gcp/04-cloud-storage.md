# Lesson 4: Cloud Storage - Object Storage and Static Hosting

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and manage Cloud Storage buckets with Terraform
- Implement bucket IAM policies and access control
- Configure object versioning and lifecycle policies
- Host static websites on Cloud Storage
- Integrate with CDN for global content delivery
- Implement security best practices for object storage

## Prerequisites

- Completed Lessons 1-3
- GCP project with billing enabled
- Storage API enabled
- Understanding of object storage concepts

## Time Estimate

**60-90 minutes**

---

## What is Cloud Storage?

Google Cloud Storage is a fully-managed object storage service for storing and accessing unstructured data.

**Key Features:**
- 11 9's of durability (99.999999999%)
- Multiple storage classes for cost optimization
- Strong consistency for object operations
- Global accessibility
- Integration with other GCP services
- Static website hosting

**Storage Classes:**
- **Standard**: Frequently accessed data
- **Nearline**: Accessed less than once per month (30-day minimum)
- **Coldline**: Accessed less than once per quarter (90-day minimum)
- **Archive**: Long-term archival (365-day minimum)

---

## Creating Your First Bucket

### Basic Bucket Configuration

```hcl
# main.tf
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
  project = var.project_id
  region  = var.region
}

# Create a basic Cloud Storage bucket
resource "google_storage_bucket" "basic_bucket" {
  # Bucket name (globally unique across all of GCP)
  name = "${var.project_id}-basic-bucket"

  # Location: US, EU, ASIA, or specific region
  location = var.region

  # Storage class
  storage_class = "STANDARD"

  # Force destroy (allows deletion even with objects)
  force_destroy = true  # Use false in production!

  # Uniform bucket-level access (recommended)
  uniform_bucket_level_access = true

  # Labels for organization
  labels = {
    environment = var.environment
    managed_by  = "terraform"
    purpose     = "learning"
  }
}

# Output bucket information
output "bucket_name" {
  description = "Name of the bucket"
  value       = google_storage_bucket.basic_bucket.name
}

output "bucket_url" {
  description = "URL of the bucket"
  value       = google_storage_bucket.basic_bucket.url
}

output "bucket_self_link" {
  description = "Self-link of the bucket"
  value       = google_storage_bucket.basic_bucket.self_link
}
```

### Variables

```hcl
# variables.tf
variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}
```

---

## Bucket IAM and Access Control

### Uniform Bucket-Level Access (Recommended)

```hcl
# Bucket with uniform access control
resource "google_storage_bucket" "iam_bucket" {
  name     = "${var.project_id}-iam-bucket"
  location = "US"

  # Enable uniform bucket-level access
  uniform_bucket_level_access = true

  labels = {
    security = "high"
  }
}

# Grant public read access to all objects
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = google_storage_bucket.iam_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Grant admin access to specific user
resource "google_storage_bucket_iam_member" "admin" {
  bucket = google_storage_bucket.iam_bucket.name
  role   = "roles/storage.admin"
  member = "user:admin@example.com"
}

# Grant write access to service account
resource "google_storage_bucket_iam_member" "writer" {
  bucket = google_storage_bucket.iam_bucket.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.app_sa.email}"
}
```

### IAM Roles for Cloud Storage

```hcl
# Common IAM roles
locals {
  storage_roles = {
    # Full control
    admin = "roles/storage.admin"

    # Object-level permissions
    object_viewer  = "roles/storage.objectViewer"  # Read objects
    object_creator = "roles/storage.objectCreator" # Create objects
    object_admin   = "roles/storage.objectAdmin"   # Full object control

    # Bucket-level permissions
    legacy_bucket_reader = "roles/storage.legacyBucketReader"
    legacy_bucket_writer = "roles/storage.legacyBucketWriter"
    legacy_bucket_owner  = "roles/storage.legacyBucketOwner"
  }
}

# Example: Application service account with minimal permissions
resource "google_service_account" "app_sa" {
  account_id   = "app-storage-sa"
  display_name = "Application Storage Service Account"
}

# Grant read-only access to specific bucket
resource "google_storage_bucket_iam_member" "app_read_access" {
  bucket = google_storage_bucket.iam_bucket.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.app_sa.email}"
}
```

### IAM Conditions for Buckets

```hcl
# Time-limited access
resource "google_storage_bucket_iam_member" "temp_access" {
  bucket = google_storage_bucket.iam_bucket.name
  role   = "roles/storage.objectViewer"
  member = "user:contractor@example.com"

  condition {
    title       = "Expires at project end"
    description = "Access expires on December 31, 2024"
    expression  = "request.time < timestamp(\"2024-12-31T23:59:59Z\")"
  }
}

# Prefix-based access
resource "google_storage_bucket_iam_member" "prefix_access" {
  bucket = google_storage_bucket.iam_bucket.name
  role   = "roles/storage.objectAdmin"
  member = "user:developer@example.com"

  condition {
    title       = "User folder access only"
    description = "Access only to user-specific folder"
    expression  = "resource.name.startsWith(\"projects/_/buckets/${google_storage_bucket.iam_bucket.name}/objects/users/developer/\")"
  }
}
```

---

## Object Versioning

### Enable Versioning

```hcl
# Bucket with versioning enabled
resource "google_storage_bucket" "versioned_bucket" {
  name     = "${var.project_id}-versioned-bucket"
  location = "US"

  # Enable object versioning
  versioning {
    enabled = true
  }

  # Lifecycle rule to manage old versions
  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      num_newer_versions = 3  # Keep only 3 newest versions
      with_state         = "ARCHIVED"
    }
  }

  # Another rule: Delete old versions after 30 days
  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age                = 30
      with_state         = "ARCHIVED"
    }
  }
}

# Upload an object
resource "google_storage_bucket_object" "versioned_object" {
  name   = "config/app.yaml"
  bucket = google_storage_bucket.versioned_bucket.name
  content = yamlencode({
    version = "1.0.0"
    settings = {
      debug = false
      port  = 8080
    }
  })

  # Detect changes in content
  detect_md5hash = "different"
}
```

---

## Lifecycle Policies

### Comprehensive Lifecycle Management

```hcl
# Bucket with multiple lifecycle rules
resource "google_storage_bucket" "lifecycle_bucket" {
  name     = "${var.project_id}-lifecycle-bucket"
  location = "US"

  # Rule 1: Transition to Nearline after 30 days
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }

    condition {
      age                   = 30
      matches_storage_class = ["STANDARD"]
    }
  }

  # Rule 2: Transition to Coldline after 90 days
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }

    condition {
      age                   = 90
      matches_storage_class = ["NEARLINE"]
    }
  }

  # Rule 3: Transition to Archive after 365 days
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "ARCHIVE"
    }

    condition {
      age                   = 365
      matches_storage_class = ["COLDLINE"]
    }
  }

  # Rule 4: Delete old objects after 7 years
  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age = 2555  # 7 years
    }
  }

  # Rule 5: Delete incomplete multipart uploads after 7 days
  lifecycle_rule {
    action {
      type = "AbortIncompleteMultipartUpload"
    }

    condition {
      age = 7
    }
  }

  # Rule 6: Delete objects with specific prefix after 1 day
  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age            = 1
      matches_prefix = ["temp/", "cache/"]
    }
  }
}
```

### Log Bucket with Retention

```hcl
# Bucket for logs with automatic cleanup
resource "google_storage_bucket" "log_bucket" {
  name     = "${var.project_id}-logs"
  location = "US"

  storage_class = "STANDARD"

  # Delete logs older than 90 days
  lifecycle_rule {
    action {
      type = "Delete"
    }

    condition {
      age = 90
    }
  }

  # Transition to Nearline after 7 days
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }

    condition {
      age                   = 7
      matches_storage_class = ["STANDARD"]
    }
  }

  # Clean up incomplete uploads daily
  lifecycle_rule {
    action {
      type = "AbortIncompleteMultipartUpload"
    }

    condition {
      age = 1
    }
  }

  labels = {
    purpose = "logging"
    retention = "90-days"
  }
}
```

---

## Static Website Hosting

### Configure Static Website

```hcl
# Bucket configured for static website hosting
resource "google_storage_bucket" "website_bucket" {
  name     = "www.example.com"  # Use your domain name
  location = "US"

  # Public access for website
  uniform_bucket_level_access = true

  # Website configuration
  website {
    main_page_suffix = "index.html"
    not_found_page   = "404.html"
  }

  # CORS configuration for API calls
  cors {
    origin          = ["https://example.com", "https://www.example.com"]
    method          = ["GET", "HEAD", "OPTIONS"]
    response_header = ["Content-Type"]
    max_age_seconds = 3600
  }

  labels = {
    purpose = "static-website"
  }
}

# Make bucket publicly readable
resource "google_storage_bucket_iam_member" "website_public" {
  bucket = google_storage_bucket.website_bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Upload index.html
resource "google_storage_bucket_object" "index_html" {
  name         = "index.html"
  bucket       = google_storage_bucket.website_bucket.name
  content_type = "text/html"

  content = <<-HTML
    <!DOCTYPE html>
    <html>
    <head>
      <title>My Static Website</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          max-width: 800px;
          margin: 50px auto;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <h1>Welcome to My Static Website</h1>
      <p>Hosted on Google Cloud Storage</p>
    </body>
    </html>
  HTML
}

# Upload 404.html
resource "google_storage_bucket_object" "not_found_html" {
  name         = "404.html"
  bucket       = google_storage_bucket.website_bucket.name
  content_type = "text/html"

  content = <<-HTML
    <!DOCTYPE html>
    <html>
    <head>
      <title>404 - Page Not Found</title>
    </head>
    <body>
      <h1>404 - Page Not Found</h1>
      <p>The requested page does not exist.</p>
      <a href="/">Return to home page</a>
    </body>
    </html>
  HTML
}

# Output website URL
output "website_url" {
  description = "Static website URL"
  value       = "https://storage.googleapis.com/${google_storage_bucket.website_bucket.name}/index.html"
}
```

### Custom Domain with Load Balancer

```hcl
# Reserve static IP for load balancer
resource "google_compute_global_address" "website_ip" {
  name = "website-ip"
}

# Backend bucket for load balancer
resource "google_compute_backend_bucket" "website_backend" {
  name        = "website-backend"
  bucket_name = google_storage_bucket.website_bucket.name
  enable_cdn  = true
}

# URL map
resource "google_compute_url_map" "website_url_map" {
  name            = "website-url-map"
  default_service = google_compute_backend_bucket.website_backend.id
}

# HTTP proxy
resource "google_compute_target_http_proxy" "website_http_proxy" {
  name    = "website-http-proxy"
  url_map = google_compute_url_map.website_url_map.id
}

# Forwarding rule
resource "google_compute_global_forwarding_rule" "website_http" {
  name       = "website-http-rule"
  target     = google_compute_target_http_proxy.website_http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.website_ip.address
}

output "website_ip_address" {
  description = "Load balancer IP address for DNS"
  value       = google_compute_global_address.website_ip.address
}
```

---

## Encryption and Security

### Customer-Managed Encryption Keys (CMEK)

```hcl
# Create KMS keyring
resource "google_kms_key_ring" "storage_keyring" {
  name     = "storage-keyring"
  location = var.region
}

# Create KMS key
resource "google_kms_crypto_key" "storage_key" {
  name     = "storage-key"
  key_ring = google_kms_key_ring.storage_keyring.id

  rotation_period = "7776000s"  # 90 days

  lifecycle {
    prevent_destroy = true
  }
}

# Grant Storage service account access to key
data "google_storage_project_service_account" "gcs_account" {
  project = var.project_id
}

resource "google_kms_crypto_key_iam_member" "storage_key_user" {
  crypto_key_id = google_kms_crypto_key.storage_key.id
  role          = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  member        = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}

# Bucket with customer-managed encryption
resource "google_storage_bucket" "encrypted_bucket" {
  name     = "${var.project_id}-encrypted-bucket"
  location = var.region

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  depends_on = [google_kms_crypto_key_iam_member.storage_key_user]
}
```

### Bucket Security Best Practices

```hcl
# Secure bucket configuration
resource "google_storage_bucket" "secure_bucket" {
  name     = "${var.project_id}-secure-bucket"
  location = "US"

  # Uniform bucket-level access (no ACLs)
  uniform_bucket_level_access = true

  # Versioning for recovery
  versioning {
    enabled = true
  }

  # Encryption (default Google-managed, or use CMEK)
  # encryption {
  #   default_kms_key_name = google_kms_crypto_key.storage_key.id
  # }

  # Lifecycle rules
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 365
    }
  }

  # Logging
  logging {
    log_bucket = google_storage_bucket.log_bucket.name
    log_object_prefix = "bucket-logs/"
  }

  # Retention policy (immutable after lock)
  retention_policy {
    retention_period = 2592000  # 30 days
    is_locked        = false     # Set to true to make immutable
  }

  # Labels
  labels = {
    security    = "high"
    compliance  = "required"
    environment = "production"
  }
}

# Deny public access
resource "google_storage_bucket_iam_binding" "deny_public" {
  bucket = google_storage_bucket.secure_bucket.name
  role   = "roles/storage.objectViewer"

  members = []  # No public access

  # Explicitly deny allUsers and allAuthenticatedUsers
  # (handled by not including them in members list)
}
```

---

## Managing Objects

### Upload Objects with Terraform

```hcl
# Upload a file from local filesystem
resource "google_storage_bucket_object" "local_file" {
  name   = "uploads/document.pdf"
  bucket = google_storage_bucket.basic_bucket.name
  source = "${path.module}/files/document.pdf"

  # Content type (auto-detected if not specified)
  content_type = "application/pdf"

  # Cache control for CDN
  cache_control = "public, max-age=3600"

  # Custom metadata
  metadata = {
    uploaded_by = "terraform"
    department  = "engineering"
  }
}

# Upload inline content
resource "google_storage_bucket_object" "config_file" {
  name   = "config/settings.json"
  bucket = google_storage_bucket.basic_bucket.name

  content = jsonencode({
    environment = var.environment
    version     = "1.0.0"
    settings    = {
      debug   = false
      timeout = 30
    }
  })

  content_type = "application/json"
}

# Upload with templating
resource "google_storage_bucket_object" "template_file" {
  name   = "config/app.yaml"
  bucket = google_storage_bucket.basic_bucket.name

  content = templatefile("${path.module}/templates/app.yaml.tpl", {
    project_id  = var.project_id
    environment = var.environment
    region      = var.region
  })

  content_type = "application/x-yaml"
}
```

### Batch Upload Objects

```hcl
# Upload multiple files
locals {
  files = fileset("${path.module}/website", "**/*")
}

resource "google_storage_bucket_object" "website_files" {
  for_each = local.files

  name   = each.value
  bucket = google_storage_bucket.website_bucket.name
  source = "${path.module}/website/${each.value}"

  # Auto-detect content type
  content_type = lookup(
    {
      "html" = "text/html"
      "css"  = "text/css"
      "js"   = "application/javascript"
      "json" = "application/json"
      "png"  = "image/png"
      "jpg"  = "image/jpeg"
      "svg"  = "image/svg+xml"
    },
    split(".", each.value)[length(split(".", each.value)) - 1],
    "application/octet-stream"
  )

  cache_control = "public, max-age=3600"
}
```

---

## Bucket Notifications

### Configure Pub/Sub Notifications

```hcl
# Create Pub/Sub topic
resource "google_pubsub_topic" "bucket_notifications" {
  name = "bucket-notifications"

  labels = {
    purpose = "storage-events"
  }
}

# Grant Storage service permission to publish
data "google_storage_project_service_account" "gcs_sa" {
  project = var.project_id
}

resource "google_pubsub_topic_iam_member" "storage_publisher" {
  topic  = google_pubsub_topic.bucket_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_storage_project_service_account.gcs_sa.email_address}"
}

# Create bucket notification
resource "google_storage_notification" "notification" {
  bucket         = google_storage_bucket.basic_bucket.name
  payload_format = "JSON_API_V1"
  topic          = google_pubsub_topic.bucket_notifications.id

  # Event types to notify
  event_types = [
    "OBJECT_FINALIZE",
    "OBJECT_DELETE",
  ]

  # Optional: Filter by object name prefix
  object_name_prefix = "uploads/"

  # Custom attributes
  custom_attributes = {
    environment = var.environment
  }

  depends_on = [google_pubsub_topic_iam_member.storage_publisher]
}

# Subscription to receive notifications
resource "google_pubsub_subscription" "notification_subscription" {
  name  = "bucket-notification-subscription"
  topic = google_pubsub_topic.bucket_notifications.name

  # Acknowledgment deadline
  ack_deadline_seconds = 20

  # Retention duration
  message_retention_duration = "604800s"  # 7 days

  # Retry policy
  retry_policy {
    minimum_backoff = "10s"
    maximum_backoff = "600s"
  }
}
```

---

## CDN Integration

### Enable Cloud CDN

```hcl
# Backend bucket with CDN enabled
resource "google_compute_backend_bucket" "cdn_backend" {
  name        = "cdn-backend"
  bucket_name = google_storage_bucket.website_bucket.name

  # Enable Cloud CDN
  enable_cdn = true

  # CDN policy
  cdn_policy {
    cache_mode        = "CACHE_ALL_STATIC"
    client_ttl        = 3600
    default_ttl       = 3600
    max_ttl           = 86400
    negative_caching  = true
    serve_while_stale = 86400

    negative_caching_policy {
      code = 404
      ttl  = 120
    }

    cache_key_policy {
      include_host           = true
      include_protocol       = true
      include_query_string   = false
    }
  }

  # Custom headers
  custom_response_headers = [
    "X-Cache-Status: {cdn_cache_status}",
  ]
}
```

---

## Best Practices for DevSecOps

### 1. Use Uniform Bucket-Level Access

```hcl
# Good: Uniform bucket-level access
resource "google_storage_bucket" "good_bucket" {
  name     = "${var.project_id}-good-bucket"
  location = "US"

  uniform_bucket_level_access = true  # IAM only, no ACLs
}

# Bad: Fine-grained ACLs (legacy)
resource "google_storage_bucket" "legacy_bucket" {
  name     = "${var.project_id}-legacy-bucket"
  location = "US"

  uniform_bucket_level_access = false  # Avoid this
}
```

### 2. Enable Versioning for Critical Data

```hcl
# Production bucket with versioning
resource "google_storage_bucket" "prod_bucket" {
  name     = "${var.project_id}-prod-data"
  location = "US"

  versioning {
    enabled = true
  }

  # Keep last 5 versions
  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      num_newer_versions = 5
      with_state         = "ARCHIVED"
    }
  }
}
```

### 3. Implement Lifecycle Policies

```hcl
# Cost-optimized bucket
resource "google_storage_bucket" "optimized_bucket" {
  name     = "${var.project_id}-optimized"
  location = "US"

  # Move to cheaper storage classes over time
  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
    condition {
      age = 30
    }
  }

  lifecycle_rule {
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
    condition {
      age = 90
    }
  }
}
```

### 4. Use Customer-Managed Encryption for Sensitive Data

```hcl
# Sensitive data bucket with CMEK
resource "google_storage_bucket" "sensitive_bucket" {
  name     = "${var.project_id}-sensitive"
  location = var.region

  encryption {
    default_kms_key_name = google_kms_crypto_key.storage_key.id
  }

  uniform_bucket_level_access = true

  labels = {
    data_classification = "confidential"
  }
}
```

### 5. Enable Logging

```hcl
# Bucket with access logging
resource "google_storage_bucket" "monitored_bucket" {
  name     = "${var.project_id}-monitored"
  location = "US"

  logging {
    log_bucket        = google_storage_bucket.log_bucket.name
    log_object_prefix = "access-logs/"
  }
}
```

---

## Hands-On Exercise

### Exercise: Build a Static Website

Create a complete static website hosting solution:

1. Create a bucket with your domain name
2. Enable public access
3. Upload HTML, CSS, and JavaScript files
4. Configure custom 404 page
5. Set up Cloud CDN
6. Add lifecycle rules for logs
7. Implement monitoring

**Bonus:**
- Set up HTTPS with SSL certificate
- Add custom domain mapping
- Implement CI/CD for automatic deployments

---

## Summary

You've learned:
- Creating and configuring Cloud Storage buckets
- Implementing IAM policies for access control
- Managing object lifecycle and versioning
- Hosting static websites
- Integrating with CDN
- Security best practices for object storage

### Key Takeaways

1. Use uniform bucket-level access for consistent IAM
2. Enable versioning for important data
3. Implement lifecycle policies for cost optimization
4. Use appropriate storage classes
5. Enable CDN for global content delivery
6. Encrypt sensitive data with CMEK

---

## Next Steps

In **Lesson 5: Cloud Functions**, you'll learn about:
- Creating serverless functions
- HTTP and event triggers
- Deployment and versioning
- Integration with other GCP services
- Security and IAM for functions

---

## Additional Resources

- [Cloud Storage Documentation](https://cloud.google.com/storage/docs)
- [Storage Classes](https://cloud.google.com/storage/docs/storage-classes)
- [Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)
- [Static Website Hosting](https://cloud.google.com/storage/docs/hosting-static-website)
- [Best Practices](https://cloud.google.com/storage/docs/best-practices)

---

**Previous:** [Lesson 3: Compute Engine](03-compute-engine.md)
**Next:** [Lesson 5: Cloud Functions](05-cloud-functions.md)
