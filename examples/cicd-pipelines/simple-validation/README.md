# Simple Validation Pipeline Example

This example demonstrates a basic CI/CD pipeline for Terraform with validation and formatting checks.

## What This Example Includes

- Basic Terraform validation workflow
- Format checking
- Linting with TFLint
- PR comments with validation results

## Pipeline Stages

```
┌─────────────┐
│   Commit    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Format    │  terraform fmt -check
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validate   │  terraform validate
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Lint     │  tflint
└─────────────┘
```

## GitHub Actions Workflow

See `.github/workflows/simple-validation.yml`

```yaml
name: Simple Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform fmt -check
      - run: terraform init -backend=false
      - run: terraform validate
```

## Local Testing

```bash
# Format check
terraform fmt -check -recursive

# Validate
terraform init -backend=false
terraform validate

# Lint (requires tflint)
tflint --init
tflint
```

## Prerequisites

- GitHub repository
- No cloud credentials required (validation only)

## Usage

1. Copy the workflow file to `.github/workflows/`
2. Push changes to trigger the pipeline
3. Review validation results in GitHub Actions

## Next Steps

- Add security scanning (see `security-scanning/` example)
- Implement plan/apply workflow (see `multi-environment/` example)
- Add cost estimation with Infracost
