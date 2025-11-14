# Lesson 5: Cloud Functions - Serverless Computing

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and deploy Cloud Functions with Terraform
- Configure HTTP and event-driven triggers
- Implement environment variables and secrets
- Set up IAM permissions for functions
- Deploy and version functions
- Monitor and debug Cloud Functions

## Prerequisites

- Completed Lessons 1-4
- Cloud Functions API and Cloud Build API enabled
- Node.js knowledge (for examples)
- Understanding of serverless concepts

## Time Estimate

**90-120 minutes**

---

## What are Cloud Functions?

Cloud Functions is a serverless execution environment for building and connecting cloud services.

**Key Features:**
- Event-driven and HTTP-triggered functions
- Automatic scaling (0 to thousands of instances)
- Pay only for execution time
- Multiple language runtimes (Node.js, Python, Go, Java, etc.)
- Integration with GCP services
- Built-in authentication and authorization

**Generations:**
- **1st Gen**: Original Cloud Functions
- **2nd Gen**: Built on Cloud Run, more features

---

## Basic HTTP Function (2nd Gen)

### Create Your First Function

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

# Create a bucket for function source code
resource "google_storage_bucket" "function_bucket" {
  name     = "${var.project_id}-functions"
  location = var.region

  uniform_bucket_level_access = true

  labels = {
    purpose = "cloud-functions"
  }
}

# Package function source code
data "archive_file" "function_source" {
  type        = "zip"
  source_dir  = "${path.module}/function-source"
  output_path = "${path.module}/function-source.zip"
}

# Upload function source to bucket
resource "google_storage_bucket_object" "function_source" {
  name   = "function-source-${data.archive_file.function_source.output_md5}.zip"
  bucket = google_storage_bucket.function_bucket.name
  source = data.archive_file.function_source.output_path
}

# Create Cloud Function (2nd Gen)
resource "google_cloudfunctions2_function" "http_function" {
  name        = "http-function"
  location    = var.region
  description = "Simple HTTP triggered function"

  build_config {
    runtime     = "nodejs20"
    entry_point = "helloWorld"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 3
    min_instance_count = 0
    available_memory   = "256M"
    timeout_seconds    = 60

    # Environment variables
    environment_variables = {
      ENVIRONMENT = var.environment
    }

    # Ingress settings
    ingress_settings               = "ALLOW_ALL"
    all_traffic_on_latest_revision = true
  }

  labels = {
    managed_by = "terraform"
  }
}

# Make function publicly accessible
resource "google_cloudfunctions2_function_iam_member" "invoker" {
  project        = google_cloudfunctions2_function.http_function.project
  location       = google_cloudfunctions2_function.http_function.location
  cloud_function = google_cloudfunctions2_function.http_function.name

  role   = "roles/cloudfunctions.invoker"
  member = "allUsers"
}

# Output function URL
output "function_url" {
  value = google_cloudfunctions2_function.http_function.service_config[0].uri
}
```

### Function Source Code

```javascript
// function-source/index.js

/**
 * HTTP Cloud Function handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.helloWorld = (req, res) => {
  // Get environment variable
  const environment = process.env.ENVIRONMENT || 'unknown';

  // Parse request
  const name = req.query.name || req.body.name || 'World';

  // Send response
  res.status(200).json({
    message: `Hello, ${name}!`,
    environment: environment,
    timestamp: new Date().toISOString()
  });
};
```

```json
// function-source/package.json
{
  "name": "hello-world-function",
  "version": "1.0.0",
  "description": "Simple HTTP Cloud Function",
  "main": "index.js",
  "scripts": {
    "test": "echo \"No tests yet\" && exit 0"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {}
}
```

---

## Event-Driven Functions

### Cloud Storage Trigger

```hcl
# Function triggered by Cloud Storage events
resource "google_cloudfunctions2_function" "storage_function" {
  name     = "storage-function"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "processFile"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 10
    available_memory   = "512M"
    timeout_seconds    = 300

    environment_variables = {
      PROJECT_ID = var.project_id
    }
  }

  # Event trigger configuration
  event_trigger {
    trigger_region        = var.region
    event_type            = "google.cloud.storage.object.v1.finalized"
    retry_policy          = "RETRY_POLICY_RETRY"
    service_account_email = google_service_account.function_sa.email

    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.uploads.name
    }
  }
}

# Create bucket for uploads
resource "google_storage_bucket" "uploads" {
  name     = "${var.project_id}-uploads"
  location = var.region
}

# Grant function access to bucket
resource "google_storage_bucket_iam_member" "function_object_viewer" {
  bucket = google_storage_bucket.uploads.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.function_sa.email}"
}
```

```javascript
// function-source/index.js (storage trigger)

const { Storage } = require('@google-cloud/storage');
const storage = new Storage();

/**
 * Cloud Storage triggered function
 * Processes files uploaded to the bucket
 */
exports.processFile = async (cloudEvent) => {
  // Extract file information from event
  const file = cloudEvent.data;
  const bucketName = file.bucket;
  const fileName = file.name;
  const contentType = file.contentType;

  console.log(`Processing file: ${fileName}`);
  console.log(`Bucket: ${bucketName}`);
  console.log(`Content Type: ${contentType}`);

  // Process the file
  try {
    const bucket = storage.bucket(bucketName);
    const fileObject = bucket.file(fileName);

    // Download file content
    const [contents] = await fileObject.download();

    console.log(`File size: ${contents.length} bytes`);

    // Process based on content type
    if (contentType && contentType.includes('image')) {
      console.log('Processing image...');
      // Image processing logic here
    } else if (contentType && contentType.includes('text')) {
      console.log('Processing text file...');
      console.log('Content preview:', contents.toString('utf8').substring(0, 100));
    }

    console.log(`Successfully processed ${fileName}`);
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;  // Retry if retry policy is enabled
  }
};
```

### Pub/Sub Trigger

```hcl
# Create Pub/Sub topic
resource "google_pubsub_topic" "function_trigger" {
  name = "function-trigger-topic"

  labels = {
    purpose = "function-trigger"
  }
}

# Function triggered by Pub/Sub
resource "google_cloudfunctions2_function" "pubsub_function" {
  name     = "pubsub-function"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "processPubSubMessage"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    max_instance_count = 5
    available_memory   = "256M"
    timeout_seconds    = 60
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.pubsub.topic.v1.messagePublished"
    pubsub_topic   = google_pubsub_topic.function_trigger.id
    retry_policy   = "RETRY_POLICY_RETRY"
  }
}
```

```javascript
// function-source/index.js (Pub/Sub trigger)

/**
 * Pub/Sub triggered function
 * Processes messages from Pub/Sub topic
 */
exports.processPubSubMessage = (cloudEvent) => {
  // Decode the Pub/Sub message
  const base64Data = cloudEvent.data.message.data;
  const messageData = base64Data
    ? Buffer.from(base64Data, 'base64').toString()
    : 'No data';

  // Parse message attributes
  const attributes = cloudEvent.data.message.attributes || {};

  console.log('Pub/Sub message received:', messageData);
  console.log('Attributes:', JSON.stringify(attributes));

  // Process the message
  try {
    const data = JSON.parse(messageData);
    console.log('Parsed data:', data);

    // Your business logic here
    processBusinessLogic(data);

  } catch (error) {
    console.error('Error processing message:', error);
    // Don't throw if you don't want retry
  }
};

function processBusinessLogic(data) {
  console.log('Processing business logic with data:', data);
  // Implementation here
}
```

---

## Environment Variables and Secrets

### Using Environment Variables

```hcl
resource "google_cloudfunctions2_function" "function_with_env" {
  name     = "function-with-env"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    available_memory = "256M"
    timeout_seconds  = 60

    # Environment variables
    environment_variables = {
      ENVIRONMENT   = var.environment
      API_ENDPOINT  = "https://api.example.com"
      LOG_LEVEL     = "info"
      MAX_RETRIES   = "3"
    }
  }
}
```

### Using Secret Manager

```hcl
# Create secret in Secret Manager
resource "google_secret_manager_secret" "api_key" {
  secret_id = "api-key"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "api_key_version" {
  secret      = google_secret_manager_secret.api_key.id
  secret_data = var.api_key  # From terraform.tfvars (not committed!)
}

# Create service account for function
resource "google_service_account" "function_sa" {
  account_id   = "cloud-function-sa"
  display_name = "Cloud Function Service Account"
}

# Grant secret access to service account
resource "google_secret_manager_secret_iam_member" "function_secret_access" {
  secret_id = google_secret_manager_secret.api_key.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.function_sa.email}"
}

# Function with secrets
resource "google_cloudfunctions2_function" "function_with_secrets" {
  name     = "function-with-secrets"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    available_memory          = "256M"
    timeout_seconds           = 60
    service_account_email     = google_service_account.function_sa.email

    # Secret as environment variable
    secret_environment_variables {
      key        = "API_KEY"
      project_id = var.project_id
      secret     = google_secret_manager_secret.api_key.secret_id
      version    = "latest"
    }

    # Mount secret as volume (alternative)
    secret_volumes {
      mount_path = "/secrets"
      project_id = var.project_id
      secret     = google_secret_manager_secret.api_key.secret_id
      versions {
        version = "latest"
        path    = "api_key"
      }
    }
  }
}
```

```javascript
// Accessing secrets in function
exports.handler = async (req, res) => {
  // From environment variable
  const apiKey = process.env.API_KEY;

  // From mounted volume
  const fs = require('fs').promises;
  const apiKeyFromVolume = await fs.readFile('/secrets/api_key', 'utf8');

  // Use the API key
  console.log('API key loaded (not printing for security)');

  res.status(200).send('OK');
};
```

---

## VPC Connector for Private Resources

### Connect Function to VPC

```hcl
# Enable required APIs
resource "google_project_service" "vpcaccess" {
  service = "vpcaccess.googleapis.com"
}

# Create VPC network
resource "google_compute_network" "function_vpc" {
  name                    = "function-vpc"
  auto_create_subnetworks = false
}

# Create subnet
resource "google_compute_subnetwork" "function_subnet" {
  name          = "function-subnet"
  ip_cidr_range = "10.0.0.0/24"
  region        = var.region
  network       = google_compute_network.function_vpc.id
}

# Create VPC connector
resource "google_vpc_access_connector" "connector" {
  name          = "function-connector"
  region        = var.region
  network       = google_compute_network.function_vpc.name

  subnet {
    name = google_compute_subnetwork.function_subnet.name
  }

  machine_type  = "e2-micro"
  min_instances = 2
  max_instances = 3

  depends_on = [google_project_service.vpcaccess]
}

# Function with VPC connector
resource "google_cloudfunctions2_function" "vpc_function" {
  name     = "vpc-function"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    available_memory = "256M"
    timeout_seconds  = 60

    # VPC connector configuration
    vpc_connector                 = google_vpc_access_connector.connector.id
    vpc_connector_egress_settings = "ALL_TRAFFIC"  # or "PRIVATE_RANGES_ONLY"
  }
}
```

---

## Complete Example: Image Processing Function

```hcl
# Complete image processing pipeline

# Upload bucket
resource "google_storage_bucket" "images_upload" {
  name     = "${var.project_id}-images-upload"
  location = var.region

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }
}

# Processed images bucket
resource "google_storage_bucket" "images_processed" {
  name     = "${var.project_id}-images-processed"
  location = var.region
}

# Service account for function
resource "google_service_account" "image_processor_sa" {
  account_id   = "image-processor-sa"
  display_name = "Image Processor Service Account"
}

# Grant permissions
resource "google_storage_bucket_iam_member" "upload_viewer" {
  bucket = google_storage_bucket.images_upload.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.image_processor_sa.email}"
}

resource "google_storage_bucket_iam_member" "processed_creator" {
  bucket = google_storage_bucket.images_processed.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.image_processor_sa.email}"
}

# Image processing function
resource "google_cloudfunctions2_function" "image_processor" {
  name     = "image-processor"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "processImage"

    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.image_function_source.name
      }
    }
  }

  service_config {
    max_instance_count    = 10
    available_memory      = "1Gi"
    timeout_seconds       = 540
    service_account_email = google_service_account.image_processor_sa.email

    environment_variables = {
      PROCESSED_BUCKET = google_storage_bucket.images_processed.name
    }
  }

  event_trigger {
    trigger_region = var.region
    event_type     = "google.cloud.storage.object.v1.finalized"
    retry_policy   = "RETRY_POLICY_RETRY"

    event_filters {
      attribute = "bucket"
      value     = google_storage_bucket.images_upload.name
    }
  }
}
```

---

## Best Practices for DevSecOps

### 1. Use Dedicated Service Accounts

```hcl
# Good: Dedicated service account per function
resource "google_service_account" "function_sa" {
  account_id   = "my-function-sa"
  display_name = "My Function Service Account"
}

resource "google_cloudfunctions2_function" "secure_function" {
  name     = "secure-function"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    service_account_email = google_service_account.function_sa.email
  }
}
```

### 2. Restrict Ingress

```hcl
# Restrict function access
resource "google_cloudfunctions2_function" "restricted_function" {
  name     = "restricted-function"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    # Restrict ingress
    ingress_settings = "ALLOW_INTERNAL_ONLY"  # Only from GCP
    # or "ALLOW_INTERNAL_AND_GCLB"  # Only from GCP and Load Balancer
  }
}
```

### 3. Use Secret Manager

```hcl
# Never hardcode secrets!
# Bad:
# environment_variables = {
#   API_KEY = "secret-key-12345"  # NEVER DO THIS!
# }

# Good: Use Secret Manager
service_config {
  secret_environment_variables {
    key        = "API_KEY"
    project_id = var.project_id
    secret     = google_secret_manager_secret.api_key.secret_id
    version    = "latest"
  }
}
```

### 4. Set Resource Limits

```hcl
resource "google_cloudfunctions2_function" "limited_function" {
  name     = "limited-function"
  location = var.region

  build_config {
    runtime     = "nodejs20"
    entry_point = "handler"
    source {
      storage_source {
        bucket = google_storage_bucket.function_bucket.name
        object = google_storage_bucket_object.function_source.name
      }
    }
  }

  service_config {
    # Limit concurrent instances
    max_instance_count = 10

    # Minimum instances (costs $!)
    min_instance_count = 0

    # Limit per-instance concurrency
    max_instance_request_concurrency = 1

    # Memory and CPU
    available_memory = "512M"
    available_cpu    = "1"

    # Timeout
    timeout_seconds = 60
  }
}
```

---

## Summary

You've learned:
- Creating HTTP and event-triggered Cloud Functions
- Using environment variables and Secret Manager
- Configuring VPC access for private resources
- Implementing IAM and security best practices
- Monitoring and debugging functions

### Key Takeaways

1. Use 2nd Gen Cloud Functions for new deployments
2. Store secrets in Secret Manager, not environment variables
3. Use dedicated service accounts with minimal permissions
4. Set appropriate resource limits and timeouts
5. Implement proper error handling and logging

---

## Next Steps

**Lesson 6: VPC Networking** - VPC networks, subnets, firewall rules, Cloud NAT

---

**Previous:** [Lesson 4: Cloud Storage](04-cloud-storage.md)
**Next:** [Lesson 6: VPC Networking](06-vpc-networking.md)
