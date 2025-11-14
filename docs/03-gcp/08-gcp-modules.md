# Lesson 8: GCP Modules - Creating Reusable Infrastructure

## Learning Objectives

By the end of this lesson, you will be able to:
- Create reusable Terraform modules for GCP resources
- Implement module best practices and patterns
- Version and publish modules
- Use modules from the Terraform Registry
- Create a module library for your organization
- Test and validate modules

## Prerequisites

- Completed Lessons 1-7
- Understanding of all GCP resources covered
- Experience with Terraform basics

## Time Estimate

**90-120 minutes**

---

## What are Terraform Modules?

Modules are containers for multiple resources that are used together. A module consists of `.tf` files in a directory.

**Benefits:**
- Code reuse across projects
- Standardization and consistency
- Simplified complex configurations
- Version control and change management
- Testing and validation

---

## Module Structure

### Standard Module Layout

```
modules/
└── storage-bucket/
    ├── README.md           # Documentation
    ├── main.tf             # Primary resource definitions
    ├── variables.tf        # Input variables
    ├── outputs.tf          # Output values
    ├── versions.tf         # Provider version constraints
    ├── examples/           # Usage examples
    │   └── simple/
    │       ├── main.tf
    │       └── README.md
    └── tests/              # Module tests (optional)
        └── simple_test.go
```

---

## Example 1: Storage Bucket Module

### Module Definition

```hcl
# modules/storage-bucket/versions.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}
```

```hcl
# modules/storage-bucket/variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "name" {
  description = "Name of the storage bucket (must be globally unique)"
  type        = string
}

variable "location" {
  description = "Bucket location"
  type        = string
  default     = "US"
}

variable "storage_class" {
  description = "Storage class of the bucket"
  type        = string
  default     = "STANDARD"

  validation {
    condition     = contains(["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"], var.storage_class)
    error_message = "Storage class must be one of: STANDARD, NEARLINE, COLDLINE, ARCHIVE."
  }
}

variable "versioning_enabled" {
  description = "Enable versioning for the bucket"
  type        = bool
  default     = true
}

variable "lifecycle_rules" {
  description = "Lifecycle rules for the bucket"
  type = list(object({
    action = object({
      type          = string
      storage_class = optional(string)
    })
    condition = object({
      age                        = optional(number)
      created_before             = optional(string)
      with_state                 = optional(string)
      matches_storage_class      = optional(list(string))
      num_newer_versions         = optional(number)
      matches_prefix             = optional(list(string))
      matches_suffix             = optional(list(string))
    })
  }))
  default = []
}

variable "labels" {
  description = "Labels to apply to the bucket"
  type        = map(string)
  default     = {}
}

variable "force_destroy" {
  description = "Allow deletion of bucket even if it contains objects"
  type        = bool
  default     = false
}

variable "encryption_key_name" {
  description = "KMS key name for customer-managed encryption"
  type        = string
  default     = null
}

variable "public_access" {
  description = "Enable public access to bucket objects"
  type        = bool
  default     = false
}
```

```hcl
# modules/storage-bucket/main.tf
resource "google_storage_bucket" "bucket" {
  name          = var.name
  project       = var.project_id
  location      = var.location
  storage_class = var.storage_class
  force_destroy = var.force_destroy

  uniform_bucket_level_access = true

  versioning {
    enabled = var.versioning_enabled
  }

  dynamic "lifecycle_rule" {
    for_each = var.lifecycle_rules
    content {
      action {
        type          = lifecycle_rule.value.action.type
        storage_class = lifecycle_rule.value.action.storage_class
      }
      condition {
        age                    = lifecycle_rule.value.condition.age
        created_before         = lifecycle_rule.value.condition.created_before
        with_state             = lifecycle_rule.value.condition.with_state
        matches_storage_class  = lifecycle_rule.value.condition.matches_storage_class
        num_newer_versions     = lifecycle_rule.value.condition.num_newer_versions
        matches_prefix         = lifecycle_rule.value.condition.matches_prefix
        matches_suffix         = lifecycle_rule.value.condition.matches_suffix
      }
    }
  }

  dynamic "encryption" {
    for_each = var.encryption_key_name != null ? [1] : []
    content {
      default_kms_key_name = var.encryption_key_name
    }
  }

  labels = merge(
    {
      managed_by = "terraform"
    },
    var.labels
  )
}

# Optional: Make bucket public
resource "google_storage_bucket_iam_member" "public_access" {
  count = var.public_access ? 1 : 0

  bucket = google_storage_bucket.bucket.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}
```

```hcl
# modules/storage-bucket/outputs.tf
output "bucket_name" {
  description = "Name of the created bucket"
  value       = google_storage_bucket.bucket.name
}

output "bucket_url" {
  description = "URL of the bucket"
  value       = google_storage_bucket.bucket.url
}

output "bucket_self_link" {
  description = "Self-link of the bucket"
  value       = google_storage_bucket.bucket.self_link
}

output "bucket_id" {
  description = "ID of the bucket"
  value       = google_storage_bucket.bucket.id
}
```

### Using the Module

```hcl
# Using the storage bucket module
module "data_bucket" {
  source = "./modules/storage-bucket"

  project_id    = var.project_id
  name          = "${var.project_id}-data-bucket"
  location      = "US"
  storage_class = "STANDARD"

  versioning_enabled = true

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
        age = 365
      }
    }
  ]

  labels = {
    environment = "production"
    team        = "data"
  }
}

output "data_bucket_name" {
  value = module.data_bucket.bucket_name
}
```

---

## Example 2: Cloud Function Module

### Module Definition

```hcl
# modules/cloud-function/variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "name" {
  description = "Name of the Cloud Function"
  type        = string
}

variable "description" {
  description = "Description of the Cloud Function"
  type        = string
  default     = ""
}

variable "runtime" {
  description = "Runtime environment"
  type        = string
  default     = "nodejs20"

  validation {
    condition     = contains(["nodejs18", "nodejs20", "python39", "python310", "python311", "go119", "go120", "go121"], var.runtime)
    error_message = "Invalid runtime specified."
  }
}

variable "entry_point" {
  description = "Name of the function to execute"
  type        = string
}

variable "source_bucket" {
  description = "Cloud Storage bucket containing function source"
  type        = string
}

variable "source_object" {
  description = "Cloud Storage object containing function source"
  type        = string
}

variable "available_memory" {
  description = "Memory available to function"
  type        = string
  default     = "256M"
}

variable "timeout" {
  description = "Function timeout in seconds"
  type        = number
  default     = 60
}

variable "environment_variables" {
  description = "Environment variables"
  type        = map(string)
  default     = {}
}

variable "service_account_email" {
  description = "Service account email for function execution"
  type        = string
  default     = null
}

variable "ingress_settings" {
  description = "Ingress settings"
  type        = string
  default     = "ALLOW_ALL"
}

variable "trigger_http" {
  description = "Enable HTTP trigger"
  type        = bool
  default     = true
}

variable "public_access" {
  description = "Allow public access (unauthenticated invocations)"
  type        = bool
  default     = false
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 3
}

variable "vpc_connector" {
  description = "VPC connector for private resource access"
  type        = string
  default     = null
}

variable "labels" {
  description = "Labels to apply"
  type        = map(string)
  default     = {}
}
```

```hcl
# modules/cloud-function/main.tf
resource "google_cloudfunctions2_function" "function" {
  name        = var.name
  project     = var.project_id
  location    = var.region
  description = var.description

  build_config {
    runtime     = var.runtime
    entry_point = var.entry_point

    source {
      storage_source {
        bucket = var.source_bucket
        object = var.source_object
      }
    }
  }

  service_config {
    max_instance_count    = var.max_instances
    min_instance_count    = var.min_instances
    available_memory      = var.available_memory
    timeout_seconds       = var.timeout
    environment_variables = var.environment_variables
    ingress_settings      = var.ingress_settings

    service_account_email = var.service_account_email

    dynamic "vpc_connector" {
      for_each = var.vpc_connector != null ? [1] : []
      content {
        name = var.vpc_connector
      }
    }
  }

  labels = merge(
    {
      managed_by = "terraform"
    },
    var.labels
  )
}

# Public access
resource "google_cloudfunctions2_function_iam_member" "invoker" {
  count = var.public_access ? 1 : 0

  project        = google_cloudfunctions2_function.function.project
  location       = google_cloudfunctions2_function.function.location
  cloud_function = google_cloudfunctions2_function.function.name
  role           = "roles/cloudfunctions.invoker"
  member         = "allUsers"
}
```

```hcl
# modules/cloud-function/outputs.tf
output "function_name" {
  description = "Name of the function"
  value       = google_cloudfunctions2_function.function.name
}

output "function_url" {
  description = "URL of the function"
  value       = google_cloudfunctions2_function.function.service_config[0].uri
}

output "function_id" {
  description = "ID of the function"
  value       = google_cloudfunctions2_function.function.id
}
```

---

## Example 3: Complete VPC Module

### VPC Module with Subnets and Firewall

```hcl
# modules/vpc-network/variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "network_name" {
  description = "Name of the VPC network"
  type        = string
}

variable "routing_mode" {
  description = "Network routing mode"
  type        = string
  default     = "REGIONAL"
}

variable "subnets" {
  description = "List of subnets"
  type = list(object({
    name          = string
    ip_cidr_range = string
    region        = string
    private_ip_google_access = optional(bool, true)
    flow_logs_enabled = optional(bool, false)
  }))
}

variable "firewall_rules" {
  description = "List of firewall rules"
  type = list(object({
    name               = string
    description        = optional(string)
    priority           = optional(number, 1000)
    direction          = optional(string, "INGRESS")
    source_ranges      = optional(list(string))
    destination_ranges = optional(list(string))
    source_tags        = optional(list(string))
    target_tags        = optional(list(string))
    allow = optional(list(object({
      protocol = string
      ports    = optional(list(string))
    })))
    deny = optional(list(object({
      protocol = string
      ports    = optional(list(string))
    })))
  }))
  default = []
}

variable "enable_nat" {
  description = "Enable Cloud NAT"
  type        = bool
  default     = false
}

variable "nat_region" {
  description = "Region for Cloud NAT"
  type        = string
  default     = null
}
```

```hcl
# modules/vpc-network/main.tf
resource "google_compute_network" "vpc" {
  name                    = var.network_name
  project                 = var.project_id
  auto_create_subnetworks = false
  routing_mode            = var.routing_mode
}

resource "google_compute_subnetwork" "subnets" {
  for_each = { for subnet in var.subnets : subnet.name => subnet }

  name          = each.value.name
  project       = var.project_id
  region        = each.value.region
  network       = google_compute_network.vpc.id
  ip_cidr_range = each.value.ip_cidr_range

  private_ip_google_access = each.value.private_ip_google_access

  dynamic "log_config" {
    for_each = each.value.flow_logs_enabled ? [1] : []
    content {
      aggregation_interval = "INTERVAL_10_MIN"
      flow_sampling        = 0.5
      metadata             = "INCLUDE_ALL_METADATA"
    }
  }
}

resource "google_compute_firewall" "rules" {
  for_each = { for rule in var.firewall_rules : rule.name => rule }

  name        = each.value.name
  project     = var.project_id
  network     = google_compute_network.vpc.name
  description = each.value.description
  priority    = each.value.priority
  direction   = each.value.direction

  source_ranges      = each.value.source_ranges
  destination_ranges = each.value.destination_ranges
  source_tags        = each.value.source_tags
  target_tags        = each.value.target_tags

  dynamic "allow" {
    for_each = each.value.allow != null ? each.value.allow : []
    content {
      protocol = allow.value.protocol
      ports    = allow.value.ports
    }
  }

  dynamic "deny" {
    for_each = each.value.deny != null ? each.value.deny : []
    content {
      protocol = deny.value.protocol
      ports    = deny.value.ports
    }
  }
}

# Cloud NAT
resource "google_compute_router" "router" {
  count = var.enable_nat ? 1 : 0

  name    = "${var.network_name}-router"
  project = var.project_id
  region  = var.nat_region
  network = google_compute_network.vpc.id
}

resource "google_compute_router_nat" "nat" {
  count = var.enable_nat ? 1 : 0

  name   = "${var.network_name}-nat"
  router = google_compute_router.router[0].name
  region = var.nat_region

  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

```hcl
# modules/vpc-network/outputs.tf
output "network_name" {
  description = "Name of the VPC network"
  value       = google_compute_network.vpc.name
}

output "network_id" {
  description = "ID of the VPC network"
  value       = google_compute_network.vpc.id
}

output "network_self_link" {
  description = "Self-link of the VPC network"
  value       = google_compute_network.vpc.self_link
}

output "subnets" {
  description = "Map of created subnets"
  value = {
    for subnet in google_compute_subnetwork.subnets :
    subnet.name => {
      id         = subnet.id
      self_link  = subnet.self_link
      ip_cidr    = subnet.ip_cidr_range
    }
  }
}
```

### Using the VPC Module

```hcl
module "vpc_network" {
  source = "./modules/vpc-network"

  project_id   = var.project_id
  network_name = "production-vpc"

  subnets = [
    {
      name                     = "web-subnet"
      ip_cidr_range            = "10.0.1.0/24"
      region                   = "us-central1"
      private_ip_google_access = true
      flow_logs_enabled        = true
    },
    {
      name                     = "app-subnet"
      ip_cidr_range            = "10.0.2.0/24"
      region                   = "us-central1"
      private_ip_google_access = true
    },
    {
      name                     = "db-subnet"
      ip_cidr_range            = "10.0.3.0/24"
      region                   = "us-central1"
      private_ip_google_access = true
    }
  ]

  firewall_rules = [
    {
      name          = "allow-ssh"
      description   = "Allow SSH from office"
      source_ranges = ["203.0.113.0/24"]
      target_tags   = ["ssh-enabled"]
      allow = [{
        protocol = "tcp"
        ports    = ["22"]
      }]
    },
    {
      name          = "allow-http-https"
      description   = "Allow HTTP and HTTPS"
      source_ranges = ["0.0.0.0/0"]
      target_tags   = ["web-server"]
      allow = [
        {
          protocol = "tcp"
          ports    = ["80", "443"]
        }
      ]
    },
    {
      name        = "allow-internal"
      description = "Allow all internal traffic"
      source_ranges = [
        "10.0.1.0/24",
        "10.0.2.0/24",
        "10.0.3.0/24"
      ]
      allow = [
        {
          protocol = "tcp"
          ports    = ["0-65535"]
        },
        {
          protocol = "udp"
          ports    = ["0-65535"]
        },
        {
          protocol = "icmp"
        }
      ]
    }
  ]

  enable_nat = true
  nat_region = "us-central1"
}
```

---

## Module Best Practices

### 1. Input Validation

```hcl
variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "machine_type" {
  description = "Machine type"
  type        = string

  validation {
    condition     = can(regex("^(e2|n2|c2|m2)-", var.machine_type))
    error_message = "Machine type must start with e2-, n2-, c2-, or m2-."
  }
}
```

### 2. Sensible Defaults

```hcl
variable "availability_type" {
  description = "Database availability type"
  type        = string
  default     = "ZONAL"  # Cost-effective default
}

variable "backup_enabled" {
  description = "Enable automated backups"
  type        = bool
  default     = true  # Secure default
}
```

### 3. Comprehensive Documentation

```markdown
# Storage Bucket Module

Creates a secure Cloud Storage bucket with best practices.

## Usage

```hcl
module "bucket" {
  source = "./modules/storage-bucket"

  project_id = "my-project"
  name       = "my-bucket"
  location   = "US"
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_id | GCP project ID | `string` | n/a | yes |
| name | Bucket name | `string` | n/a | yes |
| location | Bucket location | `string` | `"US"` | no |

## Outputs

| Name | Description |
|------|-------------|
| bucket_name | Name of the created bucket |
| bucket_url | URL of the bucket |
```

### 4. Use Dynamic Blocks

```hcl
# Handle optional repeated blocks
dynamic "lifecycle_rule" {
  for_each = var.lifecycle_rules
  content {
    action {
      type = lifecycle_rule.value.action.type
    }
    condition {
      age = lifecycle_rule.value.condition.age
    }
  }
}
```

### 5. Output Important Values

```hcl
output "all_important_values" {
  description = "All important values from the module"
  value = {
    id         = google_resource.example.id
    name       = google_resource.example.name
    self_link  = google_resource.example.self_link
    created_at = google_resource.example.creation_timestamp
  }
}
```

---

## Summary

You've learned:
- Creating reusable Terraform modules
- Module structure and best practices
- Input validation and sensible defaults
- Using modules in your configurations
- Testing and documentation

### Key Takeaways

1. Modules promote reusability and consistency
2. Always validate inputs and provide sensible defaults
3. Document modules thoroughly
4. Version modules for change management
5. Test modules before using in production

---

## Congratulations!

You've completed all 8 GCP Terraform lessons! You now have the knowledge to:
- Set up and configure GCP with Terraform
- Manage IAM and resource organization
- Deploy compute, storage, and database resources
- Configure networking and security
- Create reusable modules
- Implement DevSecOps best practices

---

**Previous:** [Lesson 7: Cloud SQL](07-cloud-sql.md)
**Next:** Apply your knowledge to real projects!
