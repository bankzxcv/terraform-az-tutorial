# Terraform in CI/CD Pipelines

## Learning Objectives

By the end of this lesson, you will be able to:
- Design and implement complete Terraform CI/CD pipelines
- Manage Terraform state in automated environments
- Implement automated planning and applying workflows
- Handle credentials and authentication securely
- Set up approval gates and manual interventions
- Implement drift detection and remediation

## Prerequisites

- Completed "GitHub Actions Basics" lesson
- Understanding of Terraform fundamentals
- Familiarity with Terraform state management
- Cloud provider account (Azure, AWS, or GCP)

**Estimated Time:** 60-75 minutes

---

## Terraform CI/CD Pipeline Stages

A typical Terraform CI/CD pipeline includes:

```
┌─────────────┐
│   Commit    │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Lint     │  ← Format check, code quality
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Validate   │  ← Terraform validate, tflint
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  Security   │  ← tfsec, checkov, Sentinel
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Plan     │  ← Generate execution plan
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Review    │  ← Manual approval (optional)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Apply    │  ← Execute changes
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Test     │  ← Verify deployment
└─────────────┘
```

---

## Complete Terraform CI/CD Workflow

### Full Pipeline Example

```yaml
name: Terraform CI/CD

on:
  push:
    branches: [ main ]
    paths:
      - 'terraform/**'
      - '.github/workflows/terraform-cicd.yml'
  pull_request:
    branches: [ main ]
    paths:
      - 'terraform/**'
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform'
        required: true
        type: choice
        options:
          - plan
          - apply
          - destroy

env:
  TERRAFORM_VERSION: "1.6.0"
  WORKING_DIR: ./terraform
  TF_IN_AUTOMATION: "true"
  TF_INPUT: "false"

jobs:
  terraform-checks:
    name: Terraform Checks
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Terraform Format Check
        id: fmt
        run: terraform fmt -check -recursive
        continue-on-error: true

      - name: Terraform Init
        id: init
        run: terraform init -backend=false

      - name: Terraform Validate
        id: validate
        run: terraform validate -no-color

      - name: Check results
        if: steps.fmt.outcome == 'failure'
        run: |
          echo "❌ Terraform formatting check failed!"
          echo "Run 'terraform fmt -recursive' to fix formatting issues."
          exit 1

  terraform-plan:
    name: Terraform Plan
    needs: terraform-checks
    runs-on: ubuntu-latest
    environment: ${{ github.event_name == 'pull_request' && 'dev' || 'prod' }}

    permissions:
      contents: read
      pull-requests: write
      id-token: write

    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}

    outputs:
      plan-exitcode: ${{ steps.plan.outputs.exitcode }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}
          terraform_wrapper: true

      # Azure Authentication using OIDC
      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Init
        id: init
        run: |
          terraform init \
            -backend-config="resource_group_name=${{ secrets.TF_STATE_RG }}" \
            -backend-config="storage_account_name=${{ secrets.TF_STATE_SA }}" \
            -backend-config="container_name=${{ secrets.TF_STATE_CONTAINER }}" \
            -backend-config="key=terraform.tfstate"

      - name: Terraform Plan
        id: plan
        run: |
          terraform plan \
            -detailed-exitcode \
            -out=tfplan \
            -var="environment=${{ github.event_name == 'pull_request' && 'dev' || 'prod' }}" \
            -no-color
        continue-on-error: true

      - name: Save plan output
        id: plan-output
        if: always()
        run: |
          terraform show tfplan -no-color > plan.txt
          echo "plan<<EOF" >> $GITHUB_OUTPUT
          cat plan.txt >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Upload plan artifact
        uses: actions/upload-artifact@v3
        if: steps.plan.outputs.exitcode == '2'
        with:
          name: terraform-plan-${{ github.run_number }}
          path: ${{ env.WORKING_DIR }}/tfplan
          retention-days: 5

      - name: Comment PR with plan
        uses: actions/github-script@v7
        if: github.event_name == 'pull_request'
        with:
          script: |
            const plan = `${{ steps.plan-output.outputs.plan }}`;
            const truncatedPlan = plan.length > 65000 ? plan.substring(0, 65000) + '\n\n... (truncated)' : plan;

            const output = `#### Terraform Plan 📋 \`${{ steps.plan.outcome }}\`

            <details><summary>Show Plan</summary>

            \`\`\`terraform
            ${truncatedPlan}
            \`\`\`

            </details>

            **Exit Code:** \`${{ steps.plan.outputs.exitcode }}\`
            - 0: No changes
            - 1: Error
            - 2: Changes present

            *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`, Workflow: \`${{ github.workflow }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            });

      - name: Plan Status
        if: steps.plan.outputs.exitcode == '1'
        run: exit 1

  terraform-apply:
    name: Terraform Apply
    needs: terraform-plan
    if: |
      github.event_name == 'push' &&
      github.ref == 'refs/heads/main' &&
      needs.terraform-plan.outputs.plan-exitcode == '2'
    runs-on: ubuntu-latest
    environment: production

    permissions:
      contents: read
      id-token: write

    defaults:
      run:
        working-directory: ${{ env.WORKING_DIR }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Download plan artifact
        uses: actions/download-artifact@v3
        with:
          name: terraform-plan-${{ github.run_number }}
          path: ${{ env.WORKING_DIR }}

      - name: Terraform Init
        run: |
          terraform init \
            -backend-config="resource_group_name=${{ secrets.TF_STATE_RG }}" \
            -backend-config="storage_account_name=${{ secrets.TF_STATE_SA }}" \
            -backend-config="container_name=${{ secrets.TF_STATE_CONTAINER }}" \
            -backend-config="key=terraform.tfstate"

      - name: Terraform Apply
        run: terraform apply -auto-approve tfplan

      - name: Cleanup plan file
        if: always()
        run: rm -f tfplan
```

---

## Authentication and Credentials

### Azure Authentication with OIDC (Recommended)

OIDC (OpenID Connect) allows GitHub Actions to authenticate without storing long-lived credentials.

#### Setup Azure OIDC

```bash
# 1. Create Azure AD Application
az ad app create --display-name "github-actions-oidc"

# 2. Create Service Principal
az ad sp create --id <app-id>

# 3. Create federated credentials
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-actions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:organization/repository:ref:refs/heads/main",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# 4. Assign permissions
az role assignment create \
  --assignee <app-id> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>
```

#### GitHub Workflow with OIDC

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Azure Login (OIDC)
    uses: azure/login@v1
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
```

### AWS Authentication with OIDC

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
      aws-region: us-east-1
      role-session-name: GitHubActions
```

### GCP Authentication with Workload Identity

```yaml
permissions:
  id-token: write
  contents: read

steps:
  - name: Authenticate to Google Cloud
    uses: google-github-actions/auth@v2
    with:
      workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
      service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}
```

### Service Principal (Legacy Method)

```yaml
steps:
  - name: Azure Login (Service Principal)
    uses: azure/login@v1
    with:
      creds: ${{ secrets.AZURE_CREDENTIALS }}

# AZURE_CREDENTIALS format:
# {
#   "clientId": "<client-id>",
#   "clientSecret": "<client-secret>",
#   "subscriptionId": "<subscription-id>",
#   "tenantId": "<tenant-id>"
# }
```

---

## State Management in CI/CD

### Remote Backend Configuration

#### Azure Storage Backend

```hcl
# backend.tf
terraform {
  backend "azurerm" {
    # Configuration provided via -backend-config flags
    # or environment variables in CI/CD
  }
}
```

```yaml
# Workflow configuration
steps:
  - name: Terraform Init
    env:
      ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
      ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
      ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
      ARM_USE_OIDC: "true"
    run: |
      terraform init \
        -backend-config="resource_group_name=tfstate-rg" \
        -backend-config="storage_account_name=tfstatesa123" \
        -backend-config="container_name=tfstate" \
        -backend-config="key=prod/terraform.tfstate"
```

#### Terraform Cloud Backend

```hcl
terraform {
  cloud {
    organization = "my-org"
    workspaces {
      name = "production"
    }
  }
}
```

```yaml
steps:
  - name: Setup Terraform
    uses: hashicorp/setup-terraform@v3
    with:
      terraform_version: 1.6.0
      cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

  - name: Terraform Init
    run: terraform init
```

### State Locking

Prevent concurrent modifications with concurrency control:

```yaml
concurrency:
  group: terraform-${{ github.ref }}
  cancel-in-progress: false
```

---

## Handling Different Environments

### Workspace-based Approach

```yaml
jobs:
  deploy:
    strategy:
      matrix:
        environment: [dev, staging, prod]

    environment: ${{ matrix.environment }}

    steps:
      - name: Select workspace
        run: |
          terraform workspace select ${{ matrix.environment }} || \
          terraform workspace new ${{ matrix.environment }}

      - name: Deploy
        run: terraform apply -auto-approve
```

### Separate State Files

```yaml
jobs:
  deploy-dev:
    environment: dev
    steps:
      - run: terraform init -backend-config="key=dev/terraform.tfstate"

  deploy-staging:
    environment: staging
    steps:
      - run: terraform init -backend-config="key=staging/terraform.tfstate"

  deploy-prod:
    environment: production
    steps:
      - run: terraform init -backend-config="key=prod/terraform.tfstate"
```

### Variable Files

```yaml
steps:
  - name: Terraform Apply
    run: |
      terraform apply \
        -var-file="environments/${{ inputs.environment }}.tfvars" \
        -auto-approve
```

---

## Approval Gates and Manual Interventions

### GitHub Environments

```yaml
jobs:
  deploy-production:
    environment:
      name: production
      url: https://app.example.com

    steps:
      - name: Deploy to production
        run: terraform apply -auto-approve

# Configure in GitHub:
# Settings → Environments → production
# - Required reviewers: @team-leads
# - Wait timer: 5 minutes
# - Deployment branches: main only
```

### Manual Approval Workflow

```yaml
name: Terraform Deploy with Approval

on:
  workflow_dispatch:
    inputs:
      environment:
        required: true
        type: choice
        options: [dev, staging, prod]

jobs:
  plan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: terraform init
      - run: terraform plan -out=tfplan
      - uses: actions/upload-artifact@v3
        with:
          name: tfplan
          path: tfplan

  approve:
    needs: plan
    runs-on: ubuntu-latest
    if: github.event.inputs.environment == 'prod'
    environment: production-approval
    steps:
      - name: Approval checkpoint
        run: echo "Approved for production deployment"

  apply:
    needs: [plan, approve]
    if: always() && needs.plan.result == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v3
        with:
          name: tfplan
      - run: terraform init
      - run: terraform apply tfplan
```

---

## Drift Detection

### Scheduled Drift Detection

```yaml
name: Terraform Drift Detection

on:
  schedule:
    # Run every day at 6 AM UTC
    - cron: '0 6 * * *'
  workflow_dispatch:

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    permissions:
      issues: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan (Detect Drift)
        id: drift
        run: |
          terraform plan -detailed-exitcode -no-color > plan.txt
          echo "exitcode=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Create Issue if Drift Detected
        if: steps.drift.outputs.exitcode == '2'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('plan.txt', 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: '🚨 Terraform Drift Detected',
              body: `## Configuration Drift Detected

              Infrastructure has drifted from the Terraform configuration.

              <details><summary>Drift Details</summary>

              \`\`\`terraform
              ${plan}
              \`\`\`

              </details>

              **Action Required:**
              - Review the changes
              - Update Terraform configuration if changes are intentional
              - Run \`terraform apply\` to remediate unintentional drift

              **Detected:** ${new Date().toISOString()}
              **Workflow:** ${context.workflow}
              **Run:** ${context.runId}
              `,
              labels: ['drift', 'infrastructure', 'terraform']
            });

      - name: Comment on success
        if: steps.drift.outputs.exitcode == '0'
        run: echo "✅ No drift detected - infrastructure matches configuration"
```

---

## Testing in CI/CD

### Terraform Testing

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      # Unit tests with terraform test (Terraform 1.6+)
      - name: Terraform Test
        run: terraform test

      # Integration tests
      - name: Deploy test environment
        run: |
          terraform init
          terraform apply -auto-approve -var="environment=test"

      - name: Run integration tests
        run: |
          # Run your test scripts
          ./scripts/test-infrastructure.sh

      - name: Cleanup test environment
        if: always()
        run: terraform destroy -auto-approve -var="environment=test"
```

### Terratest Integration

```yaml
jobs:
  terratest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Run Terratest
        working-directory: test
        run: |
          go mod download
          go test -v -timeout 30m
```

---

## Output and Documentation

### Generate Documentation

```yaml
jobs:
  docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Terraform docs
        uses: terraform-docs/gh-actions@v1
        with:
          working-dir: .
          output-file: README.md
          output-method: inject
          git-push: true
```

### Save Plan Summary

```yaml
steps:
  - name: Create Plan Summary
    run: |
      echo "## Terraform Plan Summary" >> $GITHUB_STEP_SUMMARY
      echo "" >> $GITHUB_STEP_SUMMARY
      echo "\`\`\`terraform" >> $GITHUB_STEP_SUMMARY
      terraform show tfplan | head -n 50 >> $GITHUB_STEP_SUMMARY
      echo "\`\`\`" >> $GITHUB_STEP_SUMMARY
```

---

## Best Practices

### 1. Security

✅ **DO:**
- Use OIDC instead of long-lived credentials
- Never commit secrets to the repository
- Use GitHub secrets for sensitive data
- Enable branch protection rules
- Require approvals for production deployments
- Use least-privilege IAM roles

❌ **DON'T:**
- Store credentials in code or workflows
- Use admin permissions when contributor is sufficient
- Skip security scanning steps
- Apply changes without review in production

### 2. State Management

✅ **DO:**
- Use remote state backends
- Enable state locking
- Backup state files regularly
- Use separate state files for different environments
- Use concurrency controls

❌ **DON'T:**
- Store state in GitHub repository
- Share state files across unrelated resources
- Modify state files manually
- Run concurrent applies without locking

### 3. Pipeline Design

✅ **DO:**
- Fail fast (lint and validate first)
- Cache Terraform providers
- Use artifacts to pass plans between jobs
- Implement proper error handling
- Add meaningful comments and documentation

❌ **DON'T:**
- Skip validation steps
- Apply without planning
- Ignore formatting issues
- Create overly complex pipelines

### 4. Cost Management

```yaml
jobs:
  cost-estimate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Infracost
        uses: infracost/actions/setup@v2

      - name: Generate cost estimate
        run: |
          infracost breakdown \
            --path=. \
            --format=json \
            --out-file=/tmp/infracost.json

      - name: Post cost comment
        uses: infracost/actions/comment@v1
        with:
          path: /tmp/infracost.json
          behavior: update
```

---

## Troubleshooting Common Issues

### Issue 1: State Lock Timeout

```yaml
# Add timeout and retry logic
steps:
  - name: Terraform Apply with Retry
    uses: nick-fields/retry@v2
    with:
      timeout_minutes: 30
      max_attempts: 3
      retry_wait_seconds: 60
      command: terraform apply -auto-approve tfplan
```

### Issue 2: Credential Expiration

```yaml
# Refresh credentials before long operations
steps:
  - name: Azure Login
    uses: azure/login@v1
    with:
      client-id: ${{ secrets.AZURE_CLIENT_ID }}
      tenant-id: ${{ secrets.AZURE_TENANT_ID }}
      subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

  - name: Long-running operation
    run: |
      # Refresh token every hour
      while true; do
        az account get-access-token --output none
        sleep 3600
      done &

      terraform apply -auto-approve
```

### Issue 3: Plan File Mismatch

```yaml
# Ensure plan and apply use same configuration
steps:
  - name: Get commit SHA
    id: sha
    run: echo "sha=${{ github.sha }}" >> $GITHUB_OUTPUT

  - name: Upload plan with SHA
    uses: actions/upload-artifact@v3
    with:
      name: plan-${{ steps.sha.outputs.sha }}
      path: tfplan

  # In apply job
  - name: Download exact plan
    uses: actions/download-artifact@v3
    with:
      name: plan-${{ needs.plan.outputs.sha }}
```

---

## Hands-on Exercises

### Exercise 1: Basic CI/CD Pipeline

Create a complete CI/CD pipeline that:
1. Validates and formats Terraform code on every PR
2. Creates a plan and posts it as a PR comment
3. Applies changes when merged to main

### Exercise 2: Multi-Environment Deployment

Set up a pipeline that:
1. Automatically deploys to `dev` on PR merge
2. Requires manual approval for `staging`
3. Requires team lead approval for `production`
4. Uses separate state files for each environment

### Exercise 3: Drift Detection System

Implement:
1. Daily drift detection
2. Automatic issue creation when drift is found
3. Slack/Teams notification integration
4. Optional auto-remediation for dev environment

---

## Additional Resources

- [Terraform Cloud Documentation](https://developer.hashicorp.com/terraform/cloud-docs)
- [Azure OIDC Configuration](https://learn.microsoft.com/azure/developer/github/connect-from-azure)
- [AWS OIDC Configuration](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments/using-environments-for-deployment)
- [Terraform Testing](https://developer.hashicorp.com/terraform/language/tests)

---

## Next Steps

In the next lesson, we'll explore **Multi-Environment Workflows** covering:
- Environment promotion strategies
- Blue/green deployments
- Feature branch deployments
- Environment-specific configurations

Continue to [03-multi-environment.md](./03-multi-environment.md)
