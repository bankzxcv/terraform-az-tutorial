# Lesson 2: GCP Basics - IAM and Resource Hierarchy

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand GCP's resource hierarchy (Organizations, Folders, Projects)
- Manage IAM roles, policies, and permissions with Terraform
- Implement proper resource organization and tagging
- Create and manage multiple GCP projects
- Apply security best practices for access control

## Prerequisites

- Completed Lesson 1: GCP Setup
- Active GCP account with billing enabled
- gcloud CLI and Terraform installed
- Service account created and configured

## Time Estimate

**60-90 minutes**

---

## Understanding GCP Resource Hierarchy

### The Resource Hierarchy

GCP organizes resources in a hierarchical structure:

```
Organization (optional)
    │
    ├── Folder (optional)
    │   ├── Folder (nested, optional)
    │   │   └── Project
    │   └── Project
    │
    └── Project
        ├── Resources (VMs, Storage, etc.)
        └── Resources
```

### Why Hierarchy Matters

1. **Policy Inheritance**: IAM policies flow down the hierarchy
2. **Organization**: Group related projects logically
3. **Billing**: Separate billing by project or folder
4. **Access Control**: Manage permissions at scale
5. **Compliance**: Enforce organizational policies

---

## Projects: The Foundation

### What is a Project?

A project is the primary container for GCP resources. Every resource must belong to exactly one project.

**Key Characteristics:**
- Unique project ID (globally unique)
- Project number (assigned by GCP)
- Project name (user-friendly, not unique)
- Billing account association
- API enablement scope
- IAM policy scope

### Create Project with Terraform

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
  # Credentials from environment variable
  # GOOGLE_APPLICATION_CREDENTIALS
}

# Create a new GCP project
resource "google_project" "my_project" {
  # Unique project ID (must be globally unique)
  project_id = "my-terraform-project-${random_id.project_suffix.hex}"

  # User-friendly name
  name = "My Terraform Learning Project"

  # Optional: Organization ID
  # org_id = "123456789012"

  # Optional: Folder ID
  # folder_id = "folders/123456789012"

  # Optional: Billing account
  # billing_account = "ABCDEF-123456-789012"

  # Optional: Auto-create network
  auto_create_network = false

  # Labels for organization
  labels = {
    environment = "learning"
    managed_by  = "terraform"
    cost_center = "training"
  }
}

# Generate random suffix for unique project ID
resource "random_id" "project_suffix" {
  byte_length = 4
}

# Output project information
output "project_id" {
  description = "The project ID"
  value       = google_project.my_project.project_id
}

output "project_number" {
  description = "The project number"
  value       = google_project.my_project.number
}
```

### Enable APIs for the Project

```hcl
# Enable required APIs
resource "google_project_service" "compute" {
  project = google_project.my_project.project_id
  service = "compute.googleapis.com"

  # Don't disable the service if Terraform is destroyed
  disable_on_destroy = false
}

resource "google_project_service" "storage" {
  project = google_project.my_project.project_id
  service = "storage.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "iam" {
  project = google_project.my_project.project_id
  service = "iam.googleapis.com"

  disable_on_destroy = false
}

# Common APIs to enable
locals {
  apis = [
    "compute.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "sqladmin.googleapis.com",
  ]
}

# Enable multiple APIs using for_each
resource "google_project_service" "apis" {
  for_each = toset(local.apis)

  project = google_project.my_project.project_id
  service = each.value

  disable_on_destroy = false

  # Prevent race conditions
  depends_on = [google_project.my_project]
}
```

---

## Understanding IAM (Identity and Access Management)

### IAM Core Concepts

**Who (Identity):**
- Google Account (user)
- Service Account (application)
- Google Group
- Google Workspace domain
- Cloud Identity domain

**What (Permission):**
- Read, write, delete operations
- Granular API-level permissions

**Where (Resource):**
- Organization, Folder, Project, or specific resource

**How (Role):**
- Collection of permissions

### IAM Policy Structure

```
WHO can do WHAT on WHICH resource
```

Example: `user@example.com` (who) has `roles/storage.admin` (what) on `my-bucket` (which)

---

## IAM Roles

### 1. Basic Roles (Legacy - Avoid in Production)

```hcl
# Basic roles (too permissive for production)
# - roles/viewer: Read-only access
# - roles/editor: Modify access (but not IAM)
# - roles/owner: Full access including IAM

# Example: Grant basic role (NOT RECOMMENDED)
resource "google_project_iam_member" "editor" {
  project = google_project.my_project.project_id
  role    = "roles/editor"
  member  = "user:alice@example.com"
}
```

### 2. Predefined Roles (Recommended)

```hcl
# Grant specific, predefined roles
resource "google_project_iam_member" "compute_admin" {
  project = google_project.my_project.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:terraform@my-project.iam.gserviceaccount.com"
}

resource "google_project_iam_member" "storage_viewer" {
  project = google_project.my_project.project_id
  role    = "roles/storage.objectViewer"
  member  = "user:bob@example.com"
}

# Common predefined roles:
# - roles/compute.admin: Full compute resources control
# - roles/storage.admin: Full storage control
# - roles/cloudfunctions.developer: Cloud Functions management
# - roles/cloudsql.admin: Cloud SQL management
# - roles/iam.serviceAccountUser: Use service accounts
```

### 3. Custom Roles (Fine-Grained Control)

```hcl
# Create a custom role
resource "google_project_iam_custom_role" "custom_compute_role" {
  role_id     = "customComputeRole"
  title       = "Custom Compute Role"
  description = "Custom role for limited compute operations"
  project     = google_project.my_project.project_id

  # Specific permissions only
  permissions = [
    "compute.instances.get",
    "compute.instances.list",
    "compute.instances.start",
    "compute.instances.stop",
  ]

  stage = "GA"  # General Availability
}

# Assign custom role
resource "google_project_iam_member" "custom_role_assignment" {
  project = google_project.my_project.project_id
  role    = google_project_iam_custom_role.custom_compute_role.id
  member  = "user:charlie@example.com"
}
```

---

## IAM Binding Methods

### 1. google_project_iam_member (Recommended)

Add a single member to a single role (non-authoritative):

```hcl
# Safest method: Add one member to one role
resource "google_project_iam_member" "storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:my-sa@project.iam.gserviceaccount.com"
}

# Add another member to the same role
resource "google_project_iam_member" "storage_admin_2" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "user:admin@example.com"
}
```

**Pros:**
- Safest, won't remove existing bindings
- Easy to manage individual grants

**Cons:**
- Verbose for multiple members
- Doesn't show full picture of who has access

### 2. google_project_iam_binding (Authoritative)

Set all members for a specific role (replaces existing):

```hcl
# CAUTION: This replaces ALL members for this role
resource "google_project_iam_binding" "storage_admins" {
  project = var.project_id
  role    = "roles/storage.admin"

  members = [
    "serviceAccount:my-sa@project.iam.gserviceaccount.com",
    "user:admin@example.com",
    "group:storage-team@example.com",
  ]
}
```

**Pros:**
- Clear view of all members with a role
- Concise

**Cons:**
- Removes members not in this list
- Dangerous if multiple Terraform configurations manage same role

### 3. google_project_iam_policy (Full Control)

Set the entire IAM policy (most authoritative):

```hcl
# Get the IAM policy data
data "google_iam_policy" "project_policy" {
  # Storage admins
  binding {
    role = "roles/storage.admin"
    members = [
      "serviceAccount:my-sa@project.iam.gserviceaccount.com",
      "user:admin@example.com",
    ]
  }

  # Compute viewers
  binding {
    role = "roles/compute.viewer"
    members = [
      "group:engineers@example.com",
    ]
  }
}

# Apply the policy (REPLACES entire IAM policy)
resource "google_project_iam_policy" "project" {
  project     = var.project_id
  policy_data = data.google_iam_policy.project_policy.policy_data
}
```

**Pros:**
- Complete control
- Declarative

**Cons:**
- Extremely dangerous (removes ALL bindings not defined)
- Conflicts with other IAM resources
- Can lock you out if misconfigured

---

## Service Accounts

### What is a Service Account?

A special type of Google account for applications, not humans.

### Create Service Account with Terraform

```hcl
# Create a service account
resource "google_service_account" "app_service_account" {
  project      = google_project.my_project.project_id
  account_id   = "my-application-sa"
  display_name = "My Application Service Account"
  description  = "Service account for my application workloads"
}

# Grant permissions to the service account
resource "google_project_iam_member" "sa_compute_admin" {
  project = google_project.my_project.project_id
  role    = "roles/compute.admin"
  member  = "serviceAccount:${google_service_account.app_service_account.email}"
}

# Create a key for the service account (for non-GCP environments)
resource "google_service_account_key" "sa_key" {
  service_account_id = google_service_account.app_service_account.name

  # Key algorithm
  key_algorithm = "KEY_ALG_RSA_2048"

  # Public key type
  public_key_type = "TYPE_X509_PEM_FILE"
}

# Save the private key locally (INSECURE - use secrets manager instead)
resource "local_file" "sa_key_file" {
  content  = base64decode(google_service_account_key.sa_key.private_key)
  filename = "${path.module}/keys/${google_service_account.app_service_account.account_id}-key.json"

  # Restrictive file permissions
  file_permission = "0600"
}

# Output service account email
output "service_account_email" {
  description = "Service account email"
  value       = google_service_account.app_service_account.email
}
```

### Service Account Best Practices

```hcl
# 1. Use separate service accounts for each component
resource "google_service_account" "frontend" {
  account_id   = "frontend-sa"
  display_name = "Frontend Service Account"
}

resource "google_service_account" "backend" {
  account_id   = "backend-sa"
  display_name = "Backend Service Account"
}

resource "google_service_account" "database_migration" {
  account_id   = "db-migration-sa"
  display_name = "Database Migration Service Account"
}

# 2. Grant minimal permissions
resource "google_project_iam_member" "frontend_permissions" {
  project = var.project_id
  role    = "roles/storage.objectViewer"  # Read-only access to storage
  member  = "serviceAccount:${google_service_account.frontend.email}"
}

# 3. Use workload identity instead of keys when possible
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.backend.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/backend-ksa]"
}

# 4. Rotate keys regularly (implement with lifecycle)
resource "google_service_account_key" "rotating_key" {
  service_account_id = google_service_account.backend.name

  # Terraform lifecycle for key rotation
  lifecycle {
    create_before_destroy = true
  }
}
```

---

## Resource Labeling

### Why Use Labels?

- **Cost Tracking**: Identify expenses by project, team, or environment
- **Organization**: Group related resources
- **Automation**: Select resources for bulk operations
- **Compliance**: Tag resources for auditing

### Implementing Labels

```hcl
# Define standard labels
locals {
  common_labels = {
    environment  = var.environment
    managed_by   = "terraform"
    team         = var.team_name
    cost_center  = var.cost_center
    project      = var.project_name
    application  = var.app_name
  }
}

# Apply labels to project
resource "google_project" "labeled_project" {
  project_id = "my-labeled-project-${random_id.suffix.hex}"
  name       = "Labeled Project"

  labels = merge(
    local.common_labels,
    {
      tier = "production"
    }
  )
}

# Apply labels to resources
resource "google_storage_bucket" "labeled_bucket" {
  name     = "my-labeled-bucket"
  location = "US"
  project  = google_project.labeled_project.project_id

  labels = merge(
    local.common_labels,
    {
      data_type     = "logs"
      retention     = "30-days"
      compliance    = "gdpr"
    }
  )
}

# Query resources by label
data "google_storage_bucket" "production_buckets" {
  name = google_storage_bucket.labeled_bucket.name
}
```

### Label Best Practices

```hcl
# variables.tf
variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "required_labels" {
  description = "Required labels for all resources"
  type        = map(string)
  default     = {}

  validation {
    condition = (
      contains(keys(var.required_labels), "cost_center") &&
      contains(keys(var.required_labels), "owner")
    )
    error_message = "Labels must include cost_center and owner."
  }
}

# Example usage
resource "google_compute_instance" "labeled_vm" {
  name         = "labeled-vm"
  machine_type = "e2-micro"
  zone         = "us-central1-a"

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-11"
    }
  }

  network_interface {
    network = "default"
  }

  labels = merge(
    local.common_labels,
    var.required_labels,
    {
      instance_type = "web-server"
      auto_shutdown = "true"
    }
  )
}
```

---

## Multi-Project Management

### When to Use Multiple Projects

1. **Environment Separation**: dev, staging, production
2. **Team Boundaries**: frontend-team, backend-team, data-team
3. **Billing Isolation**: Different cost centers
4. **Security Boundaries**: Different compliance requirements
5. **Resource Quotas**: Separate quota limits

### Multi-Project Example

```hcl
# variables.tf
variable "environments" {
  description = "List of environments"
  type        = list(string)
  default     = ["dev", "staging", "prod"]
}

# main.tf
# Create project for each environment
resource "google_project" "env_projects" {
  for_each = toset(var.environments)

  project_id = "myapp-${each.value}-${random_id.suffix[each.key].hex}"
  name       = "My App - ${title(each.value)}"

  labels = {
    environment = each.value
    managed_by  = "terraform"
  }

  # Production has stricter settings
  auto_create_network = each.value != "prod" ? true : false
}

resource "random_id" "suffix" {
  for_each = toset(var.environments)

  byte_length = 4
}

# Enable APIs for all projects
resource "google_project_service" "compute" {
  for_each = google_project.env_projects

  project = each.value.project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}

# Create environment-specific service accounts
resource "google_service_account" "env_sa" {
  for_each = google_project.env_projects

  project      = each.value.project_id
  account_id   = "app-service-account"
  display_name = "${title(each.key)} Application Service Account"
}

# Output all project IDs
output "project_ids" {
  description = "Map of environment to project ID"
  value = {
    for env, project in google_project.env_projects :
    env => project.project_id
  }
}
```

---

## IAM Conditions (Advanced)

### Time-Based Access

```hcl
# Grant access only during business hours
resource "google_project_iam_member" "time_limited" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "user:contractor@example.com"

  condition {
    title       = "Business hours only"
    description = "Access only during 9-5 PST"
    expression  = <<-EOT
      request.time.getHours("America/Los_Angeles") >= 9 &&
      request.time.getHours("America/Los_Angeles") <= 17
    EOT
  }
}
```

### Resource-Based Access

```hcl
# Grant access to specific resources
resource "google_project_iam_member" "resource_limited" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "user:developer@example.com"

  condition {
    title       = "Limit to dev bucket"
    description = "Access only to development bucket"
    expression  = "resource.name.startsWith(\"projects/_/buckets/dev-\")"
  }
}
```

### Temporary Access

```hcl
# Grant access until specific date
resource "google_project_iam_member" "temporary" {
  project = var.project_id
  role    = "roles/viewer"
  member  = "user:temp-contractor@example.com"

  condition {
    title       = "Expires at end of Q4"
    description = "Access expires December 31, 2024"
    expression  = "request.time < timestamp(\"2024-12-31T23:59:59Z\")"
  }
}
```

---

## Best Practices for DevSecOps

### 1. Principle of Least Privilege

```hcl
# Bad: Granting excessive permissions
resource "google_project_iam_member" "bad_example" {
  project = var.project_id
  role    = "roles/owner"  # Too broad!
  member  = "serviceAccount:app@project.iam.gserviceaccount.com"
}

# Good: Specific permissions only
resource "google_project_iam_member" "good_example" {
  project = var.project_id
  role    = "roles/storage.objectViewer"  # Specific to needs
  member  = "serviceAccount:app@project.iam.gserviceaccount.com"
}
```

### 2. Use Groups for User Management

```hcl
# Bad: Managing individual users
resource "google_project_iam_member" "user1" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "user:alice@example.com"
}

resource "google_project_iam_member" "user2" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "user:bob@example.com"
}

# Good: Manage via groups
resource "google_project_iam_member" "compute_admins_group" {
  project = var.project_id
  role    = "roles/compute.admin"
  member  = "group:compute-admins@example.com"
}
```

### 3. Separate Service Accounts by Function

```hcl
# Good: Dedicated service accounts
resource "google_service_account" "ci_cd" {
  account_id   = "ci-cd-pipeline"
  display_name = "CI/CD Pipeline"
}

resource "google_service_account" "app_runtime" {
  account_id   = "application-runtime"
  display_name = "Application Runtime"
}

resource "google_service_account" "monitoring" {
  account_id   = "monitoring-agent"
  display_name = "Monitoring Agent"
}

# Each gets only what it needs
resource "google_project_iam_member" "ci_cd_permissions" {
  project = var.project_id
  role    = "roles/cloudbuild.builds.builder"
  member  = "serviceAccount:${google_service_account.ci_cd.email}"
}
```

### 4. Audit IAM Changes

```hcl
# Enable audit logging
resource "google_project_iam_audit_config" "audit_config" {
  project = var.project_id
  service = "allServices"

  audit_log_config {
    log_type = "ADMIN_READ"
  }

  audit_log_config {
    log_type = "DATA_WRITE"
  }

  audit_log_config {
    log_type = "DATA_READ"
  }
}

# Monitor IAM policy changes
resource "google_logging_metric" "iam_changes" {
  name   = "iam_policy_changes"
  filter = "protoPayload.methodName=\"SetIamPolicy\" OR protoPayload.methodName=\"SetIamPolicyRequest\""

  metric_descriptor {
    metric_kind = "DELTA"
    value_type  = "INT64"
  }
}
```

---

## Hands-On Exercise

### Exercise 1: Create Multi-Environment Setup

Create a Terraform configuration that:
1. Creates three projects (dev, staging, prod)
2. Enables Compute and Storage APIs for each
3. Creates environment-specific service accounts
4. Applies appropriate labels
5. Implements different IAM policies per environment

**Solution:**

```hcl
# Complete solution in appendix
```

### Exercise 2: Implement Least Privilege

1. Create a custom role for a web application service account
2. Grant only these permissions:
   - Read from specific Cloud Storage buckets
   - Write logs to Cloud Logging
   - Read from Cloud SQL (no write)
3. Test that the service account cannot perform other operations

---

## Troubleshooting

### Issue 1: Permission Denied

**Error:**
```
Error: Error setting IAM policy for project: Permission denied
```

**Solution:**
```bash
# Ensure you have resourcemanager.projects.setIamPolicy permission
gcloud projects get-iam-policy PROJECT_ID

# Your user needs roles/owner or roles/resourcemanager.projectIamAdmin
```

### Issue 2: IAM Policy Conflicts

**Error:**
```
Error: Conflict with existing IAM binding
```

**Solution:**
```hcl
# Use google_project_iam_member instead of google_project_iam_binding
# Or ensure only one Terraform config manages each role
```

### Issue 3: Service Account Key Quota

**Error:**
```
Error: Quota exceeded for quota metric 'Service account keys' and limit 'Service account keys per service account'
```

**Solution:**
```bash
# Delete unused keys
gcloud iam service-accounts keys list \
  --iam-account=SA_EMAIL

gcloud iam service-accounts keys delete KEY_ID \
  --iam-account=SA_EMAIL
```

---

## Summary

You've learned:
- GCP resource hierarchy and organization
- IAM fundamentals: identities, roles, and permissions
- Creating and managing projects with Terraform
- Service account best practices
- Resource labeling strategies
- Multi-project management
- Security best practices for access control

### Key Takeaways

1. Use `google_project_iam_member` for safest IAM management
2. Implement least privilege with specific predefined roles
3. Use service accounts for applications, not users
4. Label resources consistently for cost tracking
5. Separate environments using different projects
6. Audit all IAM changes

---

## Next Steps

In **Lesson 3: Compute Engine**, you'll learn about:
- Creating and managing VM instances
- Instance templates and managed instance groups
- Startup scripts and metadata
- SSH access and security
- Auto-scaling and load balancing

---

## Additional Resources

- [GCP IAM Documentation](https://cloud.google.com/iam/docs)
- [IAM Roles Reference](https://cloud.google.com/iam/docs/understanding-roles)
- [Service Account Best Practices](https://cloud.google.com/iam/docs/best-practices-service-accounts)
- [Resource Hierarchy](https://cloud.google.com/resource-manager/docs/cloud-platform-resource-hierarchy)
- [IAM Conditions](https://cloud.google.com/iam/docs/conditions-overview)

---

**Previous:** [Lesson 1: GCP Setup](01-gcp-setup.md)
**Next:** [Lesson 3: Compute Engine](03-compute-engine.md)
