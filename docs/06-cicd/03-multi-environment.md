# Multi-Environment CI/CD Workflows

## Learning Objectives

By the end of this lesson, you will be able to:
- Design and implement multi-environment deployment strategies
- Configure environment-specific variables and backends
- Implement environment promotion workflows
- Set up progressive deployment pipelines
- Handle environment dependencies and data flow
- Implement rollback strategies

## Prerequisites

- Completed previous CI/CD lessons
- Understanding of Terraform workspaces and backends
- Familiarity with GitHub Environments
- Basic understanding of deployment strategies

**Estimated Time:** 60-75 minutes

---

## Environment Strategy Overview

### Common Environment Tiers

```
Development (dev)
    ↓
    ├─ Fast iterations
    ├─ Frequent deployments
    ├─ Minimal approval
    └─ Auto-destroy nightly

Staging (staging)
    ↓
    ├─ Production mirror
    ├─ Integration testing
    ├─ Manual approval
    └─ Performance testing

Production (prod)
    ↓
    ├─ Live environment
    ├─ Multiple approvers
    ├─ Change windows
    └─ Full monitoring
```

### Environment Isolation Strategies

#### 1. Separate State Files
```
states/
├── dev/terraform.tfstate
├── staging/terraform.tfstate
└── prod/terraform.tfstate
```

#### 2. Separate Workspaces
```bash
terraform workspace list
  default
  dev
  staging
* prod
```

#### 3. Separate Accounts/Subscriptions
```
Azure:
├── dev-subscription
├── staging-subscription
└── prod-subscription

AWS:
├── dev-account
├── staging-account
└── prod-account
```

---

## Directory Structure for Multi-Environment

### Recommended Structure

```
terraform/
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   ├── staging/
│   │   ├── main.tf
│   │   ├── terraform.tfvars
│   │   └── backend.tf
│   └── prod/
│       ├── main.tf
│       ├── terraform.tfvars
│       └── backend.tf
├── modules/
│   ├── networking/
│   ├── compute/
│   └── database/
└── shared/
    ├── variables.tf
    └── outputs.tf
```

### Alternative: Workspaces with Shared Config

```
terraform/
├── main.tf
├── variables.tf
├── outputs.tf
├── backend.tf
└── tfvars/
    ├── dev.tfvars
    ├── staging.tfvars
    └── prod.tfvars
```

---

## Environment-Specific Configuration

### Variable Files Approach

```hcl
# tfvars/dev.tfvars
environment     = "dev"
instance_count  = 1
instance_size   = "Standard_B2s"
enable_backup   = false
enable_monitoring = false
cost_center     = "development"

# tfvars/staging.tfvars
environment     = "staging"
instance_count  = 2
instance_size   = "Standard_D2s_v3"
enable_backup   = true
enable_monitoring = true
cost_center     = "qa"

# tfvars/prod.tfvars
environment     = "prod"
instance_count  = 5
instance_size   = "Standard_D4s_v3"
enable_backup   = true
enable_monitoring = true
enable_autoscaling = true
cost_center     = "production"
```

### Backend Configuration

```hcl
# environments/dev/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstatedev"
    container_name       = "tfstate"
    key                  = "dev.tfstate"
  }
}

# environments/prod/backend.tf
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-prod-rg"
    storage_account_name = "tfstateprod"
    container_name       = "tfstate"
    key                  = "prod.tfstate"
  }
}
```

---

## Multi-Environment Pipeline

### Complete Multi-Environment Workflow

```yaml
name: Multi-Environment Deployment

on:
  push:
    branches: [ main, develop, 'release/**' ]
  pull_request:
    branches: [ main, develop ]
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod
      action:
        description: 'Terraform action'
        required: true
        type: choice
        options:
          - plan
          - apply
          - destroy

env:
  TERRAFORM_VERSION: "1.6.0"
  TF_IN_AUTOMATION: "true"

jobs:
  # Determine which environments to deploy based on branch
  determine-environments:
    runs-on: ubuntu-latest
    outputs:
      environments: ${{ steps.set-environments.outputs.environments }}
      matrix: ${{ steps.set-matrix.outputs.matrix }}
    steps:
      - name: Determine environments
        id: set-environments
        run: |
          if [[ "${{ github.event_name }}" == "workflow_dispatch" ]]; then
            echo "environments=[\"${{ inputs.environment }}\"]" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environments=[\"prod\"]" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
            echo "environments=[\"dev\"]" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" =~ ^refs/heads/release/.* ]]; then
            echo "environments=[\"staging\"]" >> $GITHUB_OUTPUT
          else
            echo "environments=[\"dev\"]" >> $GITHUB_OUTPUT
          fi

      - name: Set matrix
        id: set-matrix
        run: |
          echo "matrix={\"environment\":${{ steps.set-environments.outputs.environments }}}" >> $GITHUB_OUTPUT

  # Validate across all environments
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init -backend=false

      - name: Terraform Validate
        working-directory: environments/${{ matrix.environment }}
        run: terraform validate

  # Plan for target environments
  plan:
    needs: [determine-environments, validate]
    runs-on: ubuntu-latest
    strategy:
      matrix: ${{ fromJson(needs.determine-environments.outputs.matrix) }}

    environment: ${{ matrix.environment }}

    permissions:
      contents: read
      pull-requests: write
      id-token: write

    outputs:
      plan-exitcode-dev: ${{ steps.plan.outputs.exitcode }}
      plan-exitcode-staging: ${{ steps.plan.outputs.exitcode }}
      plan-exitcode-prod: ${{ steps.plan.outputs.exitcode }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets[format('AZURE_CLIENT_ID_{0}', matrix.environment)] }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets[format('AZURE_SUBSCRIPTION_ID_{0}', matrix.environment)] }}

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init

      - name: Terraform Plan
        id: plan
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform plan \
            -detailed-exitcode \
            -out=tfplan-${{ matrix.environment }} \
            -var-file="terraform.tfvars" \
            -no-color
        continue-on-error: true

      - name: Upload plan
        uses: actions/upload-artifact@v3
        if: steps.plan.outputs.exitcode == '2'
        with:
          name: tfplan-${{ matrix.environment }}-${{ github.run_number }}
          path: environments/${{ matrix.environment }}/tfplan-${{ matrix.environment }}
          retention-days: 5

      - name: Create plan summary
        if: always()
        working-directory: environments/${{ matrix.environment }}
        run: |
          echo "## 📋 Terraform Plan - ${{ matrix.environment }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Status:** ${{ steps.plan.outcome }}" >> $GITHUB_STEP_SUMMARY
          echo "**Exit Code:** ${{ steps.plan.outputs.exitcode }}" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          if [ -f tfplan-${{ matrix.environment }} ]; then
            echo "<details><summary>Plan Details</summary>" >> $GITHUB_STEP_SUMMARY
            echo "" >> $GITHUB_STEP_SUMMARY
            echo '```terraform' >> $GITHUB_STEP_SUMMARY
            terraform show tfplan-${{ matrix.environment }} -no-color | head -n 100 >> $GITHUB_STEP_SUMMARY
            echo '```' >> $GITHUB_STEP_SUMMARY
            echo "</details>" >> $GITHUB_STEP_SUMMARY
          fi

  # Deploy to dev automatically
  deploy-dev:
    needs: plan
    if: |
      contains(fromJson(needs.determine-environments.outputs.environments), 'dev') &&
      github.event_name == 'push'
    runs-on: ubuntu-latest
    environment: dev

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_DEV }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID_DEV }}

      - name: Download plan
        uses: actions/download-artifact@v3
        with:
          name: tfplan-dev-${{ github.run_number }}
          path: environments/dev

      - name: Terraform Init
        working-directory: environments/dev
        run: terraform init

      - name: Terraform Apply
        working-directory: environments/dev
        run: terraform apply -auto-approve tfplan-dev

  # Deploy to staging with approval
  deploy-staging:
    needs: [plan, deploy-dev]
    if: |
      contains(fromJson(needs.determine-environments.outputs.environments), 'staging') &&
      (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
    runs-on: ubuntu-latest
    environment: staging

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_STAGING }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID_STAGING }}

      - name: Download plan
        uses: actions/download-artifact@v3
        with:
          name: tfplan-staging-${{ github.run_number }}
          path: environments/staging

      - name: Terraform Init
        working-directory: environments/staging
        run: terraform init

      - name: Terraform Apply
        working-directory: environments/staging
        run: terraform apply -auto-approve tfplan-staging

  # Deploy to production with strict approval
  deploy-prod:
    needs: [plan, deploy-staging]
    if: |
      contains(fromJson(needs.determine-environments.outputs.environments), 'prod') &&
      github.ref == 'refs/heads/main' &&
      (github.event_name == 'push' || github.event_name == 'workflow_dispatch')
    runs-on: ubuntu-latest
    environment: production

    permissions:
      contents: read
      id-token: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID_PROD }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID_PROD }}

      - name: Download plan
        uses: actions/download-artifact@v3
        with:
          name: tfplan-prod-${{ github.run_number }}
          path: environments/prod

      - name: Terraform Init
        working-directory: environments/prod
        run: terraform init

      - name: Terraform Apply
        working-directory: environments/prod
        run: terraform apply -auto-approve tfplan-prod

      - name: Create deployment record
        run: |
          echo "🚀 Production deployment completed" >> $GITHUB_STEP_SUMMARY
          echo "- **Time:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")" >> $GITHUB_STEP_SUMMARY
          echo "- **Commit:** ${{ github.sha }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Actor:** ${{ github.actor }}" >> $GITHUB_STEP_SUMMARY
```

---

## Progressive Deployment Strategies

### Canary Deployment

```yaml
name: Canary Deployment

on:
  workflow_dispatch:
    inputs:
      canary_percentage:
        description: 'Canary traffic percentage'
        required: true
        type: choice
        options:
          - '10'
          - '25'
          - '50'
          - '100'

jobs:
  deploy-canary:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Deploy canary
        run: |
          terraform apply \
            -var="canary_percentage=${{ inputs.canary_percentage }}" \
            -auto-approve

      - name: Wait and monitor
        if: inputs.canary_percentage != '100'
        run: |
          echo "Monitoring canary deployment for 10 minutes..."
          sleep 600

      - name: Check metrics
        if: inputs.canary_percentage != '100'
        run: |
          # Check error rates, latency, etc.
          ./scripts/check-canary-health.sh

      - name: Promote or rollback
        if: inputs.canary_percentage != '100'
        run: |
          if ./scripts/canary-decision.sh; then
            echo "✅ Canary healthy - ready for next stage"
          else
            echo "❌ Canary unhealthy - rolling back"
            terraform apply -var="canary_percentage=0" -auto-approve
            exit 1
          fi
```

### Blue-Green Deployment

```yaml
name: Blue-Green Deployment

on:
  workflow_dispatch:
    inputs:
      action:
        type: choice
        options:
          - deploy-green
          - switch-traffic
          - rollback
          - cleanup-blue

env:
  TERRAFORM_VERSION: "1.6.0"

jobs:
  deploy-green:
    if: inputs.action == 'deploy-green'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Deploy green environment
        run: |
          terraform apply \
            -var="deploy_green=true" \
            -var="active_environment=blue" \
            -auto-approve

      - name: Run smoke tests
        run: ./scripts/smoke-test.sh green

  switch-traffic:
    if: inputs.action == 'switch-traffic'
    runs-on: ubuntu-latest
    environment: production-approval

    steps:
      - uses: actions/checkout@v4

      - name: Switch traffic to green
        run: |
          terraform apply \
            -var="active_environment=green" \
            -auto-approve

      - name: Monitor new environment
        run: |
          echo "Monitoring for 5 minutes..."
          sleep 300
          ./scripts/check-health.sh

  rollback:
    if: inputs.action == 'rollback'
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Rollback to blue
        run: |
          terraform apply \
            -var="active_environment=blue" \
            -auto-approve

  cleanup-blue:
    if: inputs.action == 'cleanup-blue'
    runs-on: ubuntu-latest
    environment: production-approval

    steps:
      - uses: actions/checkout@v4

      - name: Cleanup old blue environment
        run: |
          terraform apply \
            -var="deploy_green=true" \
            -var="active_environment=green" \
            -var="cleanup_blue=true" \
            -auto-approve
```

---

## Environment Promotion

### Promotion Pipeline

```yaml
name: Environment Promotion

on:
  workflow_dispatch:
    inputs:
      from_environment:
        type: choice
        options:
          - dev
          - staging
      to_environment:
        type: choice
        options:
          - staging
          - prod

jobs:
  validate-promotion:
    runs-on: ubuntu-latest
    steps:
      - name: Validate promotion path
        run: |
          from="${{ inputs.from_environment }}"
          to="${{ inputs.to_environment }}"

          # Enforce promotion order
          if [[ "$from" == "staging" && "$to" == "dev" ]]; then
            echo "❌ Cannot promote backwards"
            exit 1
          fi

          if [[ "$from" == "dev" && "$to" == "prod" ]]; then
            echo "❌ Must promote through staging first"
            exit 1
          fi

          echo "✅ Valid promotion path: $from → $to"

  extract-config:
    needs: validate-promotion
    runs-on: ubuntu-latest
    outputs:
      config_hash: ${{ steps.hash.outputs.hash }}

    steps:
      - uses: actions/checkout@v4

      - name: Extract configuration
        id: extract
        working-directory: environments/${{ inputs.from_environment }}
        run: |
          terraform output -json > /tmp/outputs.json
          cat /tmp/outputs.json

      - name: Calculate hash
        id: hash
        run: |
          hash=$(sha256sum /tmp/outputs.json | cut -d' ' -f1)
          echo "hash=$hash" >> $GITHUB_OUTPUT

      - name: Upload config
        uses: actions/upload-artifact@v3
        with:
          name: promotion-config-${{ steps.hash.outputs.hash }}
          path: /tmp/outputs.json

  deploy-target:
    needs: extract-config
    runs-on: ubuntu-latest
    environment: ${{ inputs.to_environment }}

    steps:
      - uses: actions/checkout@v4

      - name: Download config
        uses: actions/download-artifact@v3
        with:
          name: promotion-config-${{ needs.extract-config.outputs.config_hash }}

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Apply to target
        working-directory: environments/${{ inputs.to_environment }}
        run: |
          # Import promoted configuration
          terraform apply \
            -var-file="../${{ inputs.from_environment }}/terraform.tfvars" \
            -auto-approve

      - name: Verify deployment
        run: |
          ./scripts/verify-environment.sh ${{ inputs.to_environment }}

      - name: Create promotion record
        run: |
          echo "## 🚀 Environment Promotion" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "- **From:** ${{ inputs.from_environment }}" >> $GITHUB_STEP_SUMMARY
          echo "- **To:** ${{ inputs.to_environment }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Config Hash:** ${{ needs.extract-config.outputs.config_hash }}" >> $GITHUB_STEP_SUMMARY
          echo "- **Time:** $(date -u)" >> $GITHUB_STEP_SUMMARY
          echo "- **Actor:** ${{ github.actor }}" >> $GITHUB_STEP_SUMMARY
```

---

## Environment-Specific Secrets Management

### GitHub Secrets Organization

```yaml
# Configure in GitHub Secrets:

# Global Secrets (repository level)
AZURE_TENANT_ID
TERRAFORM_VERSION

# Environment Secrets (environment level)
# dev environment:
AZURE_CLIENT_ID_DEV
AZURE_SUBSCRIPTION_ID_DEV
DATABASE_PASSWORD_DEV

# staging environment:
AZURE_CLIENT_ID_STAGING
AZURE_SUBSCRIPTION_ID_STAGING
DATABASE_PASSWORD_STAGING

# prod environment:
AZURE_CLIENT_ID_PROD
AZURE_SUBSCRIPTION_ID_PROD
DATABASE_PASSWORD_PROD
```

### Dynamic Secret Selection

```yaml
steps:
  - name: Select environment secrets
    env:
      CLIENT_ID: ${{ secrets[format('AZURE_CLIENT_ID_{0}', matrix.environment)] }}
      SUBSCRIPTION_ID: ${{ secrets[format('AZURE_SUBSCRIPTION_ID_{0}', matrix.environment)] }}
    run: |
      echo "Using secrets for ${{ matrix.environment }}"
      # Secrets are automatically masked
```

---

## Testing Across Environments

### Environment-Specific Tests

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]

    steps:
      - uses: actions/checkout@v4

      - name: Run environment tests
        run: |
          case "${{ matrix.environment }}" in
            dev)
              ./tests/dev-tests.sh
              ;;
            staging)
              ./tests/integration-tests.sh
              ./tests/performance-tests.sh
              ;;
            prod)
              ./tests/smoke-tests.sh
              ./tests/monitoring-tests.sh
              ;;
          esac
```

---

## Rollback Strategies

### Automated Rollback

```yaml
name: Auto Rollback on Failure

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production

    steps:
      - name: Backup current state
        run: |
          terraform state pull > /tmp/state-backup.json

      - name: Upload state backup
        uses: actions/upload-artifact@v3
        with:
          name: state-backup-${{ github.run_number }}
          path: /tmp/state-backup.json

      - name: Deploy changes
        id: deploy
        run: terraform apply -auto-approve
        continue-on-error: true

      - name: Health check
        id: health
        if: steps.deploy.outcome == 'success'
        run: ./scripts/health-check.sh
        continue-on-error: true

      - name: Rollback on failure
        if: steps.deploy.outcome == 'failure' || steps.health.outcome == 'failure'
        run: |
          echo "❌ Deployment or health check failed - rolling back"

          # Download previous state
          # Restore from backup or apply previous config
          git checkout HEAD~1 -- terraform/
          terraform apply -auto-approve

      - name: Notify on rollback
        if: steps.deploy.outcome == 'failure' || steps.health.outcome == 'failure'
        run: |
          # Send notifications
          echo "Rollback completed" | ./scripts/notify.sh
```

---

## Best Practices

### 1. Environment Configuration

✅ **DO:**
- Use consistent naming across environments
- Document environment-specific settings
- Version control all environment configs
- Use separate credentials per environment
- Implement proper access controls

❌ **DON'T:**
- Reuse production credentials in lower environments
- Make manual changes to environments
- Skip testing in staging before production
- Use the same state backend for all environments

### 2. Deployment Flow

✅ **DO:**
- Always deploy to dev first
- Require approvals for production
- Test in staging before production
- Use automated rollback mechanisms
- Monitor deployments closely

❌ **DON'T:**
- Skip environments in promotion
- Deploy directly to production
- Deploy without testing
- Ignore failed health checks

### 3. State Management

✅ **DO:**
- Use separate state files per environment
- Back up state before major changes
- Use state locking
- Regular state backups

❌ **DON'T:**
- Share state across environments
- Manually edit state files
- Skip state backups

---

## Hands-on Exercise

### Complete Multi-Environment Setup

Create a complete multi-environment setup with:

1. Three environments (dev, staging, prod)
2. Separate variable files for each
3. Environment-specific backends
4. Automated deployment to dev
5. Manual approval for staging and prod
6. Proper secret management
7. Rollback capabilities

**Bonus:** Add blue-green deployment capability

---

## Additional Resources

- [Terraform Workspaces](https://developer.hashicorp.com/terraform/language/state/workspaces)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments)
- [Azure DevOps Environments](https://learn.microsoft.com/azure/devops/pipelines/process/environments)
- [AWS Multi-Account Strategy](https://aws.amazon.com/organizations/getting-started/best-practices/)

---

## Next Steps

In the next lesson, we'll explore **GitOps Workflows** including:
- Pull-based deployment models
- GitOps tools (ArgoCD, Flux)
- Declarative infrastructure
- Git as single source of truth

Continue to [04-gitops-workflows.md](./04-gitops-workflows.md)
