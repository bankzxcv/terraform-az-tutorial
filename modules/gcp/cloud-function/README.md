# Cloud Function Module

Reusable Terraform module for deploying Google Cloud Functions (2nd generation).

## Features

- Cloud Function (Gen 2) deployment
- Configurable memory, timeout, and scaling
- Support for environment variables and secrets
- VPC connector integration
- Flexible IAM configuration
- Resource labeling

## Usage

```hcl
module "my_function" {
  source = "./modules/gcp/cloud-function"

  project_id    = "my-project"
  region        = "us-central1"
  name          = "my-function"
  description   = "My Cloud Function"

  runtime     = "nodejs20"
  entry_point = "helloWorld"

  source_bucket = "my-bucket"
  source_object = "function-source.zip"

  memory      = "256M"
  timeout     = 60
  max_instances = 10

  environment_variables = {
    ENVIRONMENT = "production"
  }

  labels = {
    team = "backend"
  }
}
```

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_id | GCP project ID | `string` | n/a | yes |
| region | GCP region | `string` | n/a | yes |
| name | Function name | `string` | n/a | yes |
| runtime | Runtime environment | `string` | `"nodejs20"` | no |
| entry_point | Function entry point | `string` | n/a | yes |
| source_bucket | Source bucket | `string` | n/a | yes |
| source_object | Source object | `string` | n/a | yes |
| memory | Memory allocation | `string` | `"256M"` | no |
| timeout | Timeout in seconds | `number` | `60` | no |
| max_instances | Max instances | `number` | `3` | no |

## Outputs

| Name | Description |
|------|-------------|
| function_name | Name of the function |
| function_url | HTTPS URL |
| function_id | Function ID |
| function_state | Current state |
