# GitOps Workflows with Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand GitOps principles and benefits
- Implement Git as the single source of truth for infrastructure
- Design pull-based deployment workflows
- Implement automated drift detection and reconciliation
- Use GitOps tools with Terraform
- Implement declarative infrastructure management

## Prerequisites

- Understanding of Git fundamentals
- Completed previous CI/CD lessons
- Familiarity with Kubernetes concepts (optional)
- Understanding of infrastructure as code principles

**Estimated Time:** 60-75 minutes

---

## What is GitOps?

GitOps is a way of implementing Continuous Deployment for cloud native applications, focusing on a developer-centric experience when operating infrastructure.

### Core Principles

```
┌─────────────────────────────────────┐
│     GitOps Core Principles          │
├─────────────────────────────────────┤
│                                     │
│  1. Declarative                     │
│     → Everything as code            │
│     → Desired state in Git          │
│                                     │
│  2. Versioned & Immutable           │
│     → Git as single source          │
│     → Full audit trail              │
│                                     │
│  3. Pulled Automatically            │
│     → Agents pull changes           │
│     → Continuous reconciliation     │
│                                     │
│  4. Continuously Reconciled         │
│     → Detect drift                  │
│     → Auto-remediation              │
│                                     │
└─────────────────────────────────────┘
```

### Traditional CI/CD vs GitOps

#### Traditional CI/CD (Push-based)
```
Developer → Push → CI/CD → Push → Environment
                  System
```

#### GitOps (Pull-based)
```
Developer → Push → Git Repository
                      ↓
                   GitOps Agent ← Poll → Environment
                      ↓
                   Apply Changes
```

---

## Benefits of GitOps

### 1. Enhanced Security
- No cluster credentials in CI/CD
- All changes auditable in Git
- Pull-based deployments more secure
- Least-privilege access model

### 2. Better Developer Experience
- Familiar Git workflow
- Easy rollbacks (git revert)
- Pull requests for infrastructure changes
- Clear change history

### 3. Operational Benefits
- Automated drift detection
- Self-healing infrastructure
- Disaster recovery via Git
- Compliance and auditability

### 4. Reliability
- Declarative desired state
- Automatic reconciliation
- Reduced human error
- Consistent deployments

---

## GitOps with Terraform

### Repository Structure

```
gitops-infra/
├── .github/
│   └── workflows/
│       ├── validate.yml          # PR validation
│       ├── plan.yml              # Plan on PR
│       └── drift-detection.yml   # Scheduled drift check
├── apps/
│   ├── app1/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   └── terraform.tfvars
│   └── app2/
├── environments/
│   ├── dev/
│   │   ├── cluster/
│   │   ├── networking/
│   │   └── kustomization.yaml
│   ├── staging/
│   └── prod/
├── modules/
│   ├── aks/
│   ├── networking/
│   └── monitoring/
└── platform/
    ├── core-infrastructure/
    └── shared-services/
```

---

## Implementing GitOps with Terraform

### 1. Declarative Configuration

```hcl
# environments/prod/main.tf
terraform {
  required_version = ">= 1.6.0"

  backend "azurerm" {
    resource_group_name  = "gitops-tfstate-rg"
    storage_account_name = "gitopstfstate"
    container_name       = "tfstate"
    key                  = "prod/terraform.tfstate"
  }
}

# Declare desired state
module "aks_cluster" {
  source = "../../modules/aks"

  cluster_name        = "prod-aks-cluster"
  node_count          = 5
  node_size           = "Standard_D4s_v3"
  kubernetes_version  = "1.28.3"
  enable_autoscaling  = true
  min_nodes           = 3
  max_nodes           = 10

  tags = {
    Environment = "production"
    ManagedBy   = "GitOps"
    GitRepo     = "github.com/org/infrastructure"
  }
}
```

### 2. GitOps Workflow Implementation

```yaml
name: GitOps Reconciliation

on:
  push:
    branches: [ main ]
    paths:
      - 'environments/**'
      - 'modules/**'
  schedule:
    # Reconcile every 15 minutes
    - cron: '*/15 * * * *'
  workflow_dispatch:

env:
  TERRAFORM_VERSION: "1.6.0"

jobs:
  reconcile:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]
      max-parallel: 1  # Sequential deployments

    environment: ${{ matrix.environment }}

    permissions:
      contents: read
      id-token: write
      issues: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Full history for auditability

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Azure Login (OIDC)
        uses: azure/login@v1
        with:
          client-id: ${{ secrets[format('AZURE_CLIENT_ID_{0}', matrix.environment)] }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets[format('AZURE_SUBSCRIPTION_ID_{0}', matrix.environment)] }}

      - name: Terraform Init
        working-directory: environments/${{ matrix.environment }}
        run: terraform init

      - name: Detect Drift
        id: drift
        working-directory: environments/${{ matrix.environment }}
        run: |
          terraform plan \
            -detailed-exitcode \
            -out=tfplan \
            -no-color > plan.txt
          echo "exitcode=$?" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Reconcile if Drift Detected
        if: steps.drift.outputs.exitcode == '2'
        working-directory: environments/${{ matrix.environment }}
        run: |
          echo "🔄 Drift detected - reconciling ${{ matrix.environment }}"
          terraform apply -auto-approve tfplan

      - name: Report Drift
        if: steps.drift.outputs.exitcode == '2'
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const plan = fs.readFileSync('environments/${{ matrix.environment }}/plan.txt', 'utf8');

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[GitOps] Drift Detected and Reconciled - ${{ matrix.environment }}`,
              body: `## Infrastructure Drift Reconciled

              **Environment:** \`${{ matrix.environment }}\`
              **Timestamp:** ${new Date().toISOString()}
              **Workflow:** ${context.workflow}
              **Run:** ${context.runId}

              ### Changes Applied

              <details><summary>Terraform Plan</summary>

              \`\`\`terraform
              ${plan.substring(0, 60000)}
              \`\`\`

              </details>

              ### Next Steps

              - Review the changes above
              - Investigate why drift occurred
              - Update processes if drift was unexpected
              `,
              labels: ['gitops', 'drift-reconciled', 'infrastructure', matrix.environment]
            });

      - name: No Drift
        if: steps.drift.outputs.exitcode == '0'
        run: echo "✅ No drift detected - infrastructure matches desired state"

      - name: Plan Failed
        if: steps.drift.outputs.exitcode == '1'
        run: |
          echo "❌ Terraform plan failed"
          exit 1
```

---

## Pull-Based Deployments

### Agent-Based Reconciliation

```yaml
name: GitOps Agent

on:
  schedule:
    # Run every 5 minutes
    - cron: '*/5 * * * *'
  repository_dispatch:
    types: [reconcile]
  workflow_dispatch:

jobs:
  reconcile-loop:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout desired state
        uses: actions/checkout@v4

      - name: Setup tools
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Get current state
        id: current
        run: |
          terraform init
          terraform state pull > current-state.json

      - name: Compare states
        id: compare
        run: |
          # Calculate hash of desired configuration
          desired_hash=$(find . -type f -name "*.tf" -exec sha256sum {} \; | sort | sha256sum)
          echo "desired=$desired_hash" >> $GITHUB_OUTPUT

          # Check if we've already applied this configuration
          if terraform output -raw last_applied_hash 2>/dev/null | grep -q "$desired_hash"; then
            echo "reconcile_needed=false" >> $GITHUB_OUTPUT
          else
            echo "reconcile_needed=true" >> $GITHUB_OUTPUT
          fi

      - name: Reconcile
        if: steps.compare.outputs.reconcile_needed == 'true'
        run: |
          echo "🔄 Reconciling infrastructure to desired state"

          terraform plan -out=tfplan
          terraform apply -auto-approve tfplan

          # Store hash of applied configuration
          terraform output -raw last_applied_hash || \
          terraform apply -auto-approve \
            -var="last_applied_hash=${{ steps.compare.outputs.desired }}"

      - name: Update metrics
        if: always()
        run: |
          # Send metrics to monitoring system
          curl -X POST https://metrics.example.com/gitops \
            -d "environment=${{ matrix.environment }}" \
            -d "drift_detected=${{ steps.compare.outputs.reconcile_needed }}" \
            -d "timestamp=$(date -u +%s)"
```

---

## Progressive Delivery with GitOps

### Canary Deployments

```hcl
# main.tf
variable "canary_enabled" {
  description = "Enable canary deployment"
  type        = bool
  default     = false
}

variable "canary_weight" {
  description = "Percentage of traffic to canary"
  type        = number
  default     = 0

  validation {
    condition     = var.canary_weight >= 0 && var.canary_weight <= 100
    error_message = "Canary weight must be between 0 and 100."
  }
}

resource "azurerm_linux_web_app" "stable" {
  name                = "app-stable"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  app_settings = {
    VERSION = "stable"
  }
}

resource "azurerm_linux_web_app" "canary" {
  count               = var.canary_enabled ? 1 : 0
  name                = "app-canary"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  service_plan_id     = azurerm_service_plan.main.id

  app_settings = {
    VERSION = "canary"
  }
}

resource "azurerm_traffic_manager_profile" "main" {
  name                = "app-traffic-manager"
  resource_group_name = azurerm_resource_group.main.name

  traffic_routing_method = "Weighted"

  dns_config {
    relative_name = "app"
    ttl           = 30
  }

  monitor_config {
    protocol = "HTTPS"
    port     = 443
    path     = "/health"
  }
}

resource "azurerm_traffic_manager_endpoint" "stable" {
  name                = "stable"
  profile_id          = azurerm_traffic_manager_profile.main.id
  type                = "azureEndpoints"
  target_resource_id  = azurerm_linux_web_app.stable.id
  weight              = 100 - var.canary_weight
}

resource "azurerm_traffic_manager_endpoint" "canary" {
  count               = var.canary_enabled ? 1 : 0
  name                = "canary"
  profile_id          = azurerm_traffic_manager_profile.main.id
  type                = "azureEndpoints"
  target_resource_id  = azurerm_linux_web_app.canary[0].id
  weight              = var.canary_weight
}
```

### Automated Canary Progression

```yaml
name: Canary Progression

on:
  workflow_dispatch:
    inputs:
      start_canary:
        description: 'Start canary deployment'
        type: boolean
        default: false

jobs:
  start-canary:
    if: inputs.start_canary
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Enable canary at 10%
        run: |
          sed -i 's/canary_enabled = false/canary_enabled = true/' terraform.tfvars
          sed -i 's/canary_weight = 0/canary_weight = 10/' terraform.tfvars

      - name: Commit and push
        run: |
          git config user.name "GitOps Bot"
          git config user.email "gitops@example.com"
          git checkout -b canary-deployment
          git add terraform.tfvars
          git commit -m "Start canary deployment at 10%"
          git push origin canary-deployment

      - name: Create PR
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.pulls.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'Canary Deployment: 10%',
              head: 'canary-deployment',
              base: 'main',
              body: 'Starting canary deployment at 10% traffic'
            });

  monitor-and-progress:
    needs: start-canary
    runs-on: ubuntu-latest
    steps:
      - name: Monitor canary
        run: |
          for i in {1..6}; do
            echo "Monitoring canary ($(($i * 5)) minutes)..."
            sleep 300

            # Check metrics
            error_rate=$(curl -s https://metrics.example.com/canary/error_rate)

            if (( $(echo "$error_rate > 0.05" | bc -l) )); then
              echo "❌ Canary error rate too high: $error_rate"
              # Trigger rollback workflow
              gh workflow run rollback-canary.yml
              exit 1
            fi
          done

      - name: Progress to 25%
        run: |
          sed -i 's/canary_weight = 10/canary_weight = 25/' terraform.tfvars
          git add terraform.tfvars
          git commit -m "Progress canary to 25%"
          git push

      # Continue progression: 25% → 50% → 75% → 100%
```

---

## GitOps with Terraform Cloud

### Terraform Cloud VCS Integration

```hcl
# main.tf
terraform {
  cloud {
    organization = "my-organization"

    workspaces {
      name = "production-infrastructure"
    }
  }
}

# Workspace configuration in Terraform Cloud:
# - VCS Integration: GitHub
# - Working Directory: environments/prod
# - Auto Apply: true (for GitOps)
# - Trigger Pattern: environments/prod/**
```

### Workspace Configuration

```yaml
# .github/workflows/terraform-cloud-gitops.yml
name: Terraform Cloud GitOps

on:
  push:
    branches: [ main ]
    paths:
      - 'environments/**'

jobs:
  trigger-terraform-cloud:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          cli_config_credentials_token: ${{ secrets.TF_API_TOKEN }}

      - name: Trigger Cloud Run
        run: |
          # Terraform Cloud automatically detects the push
          # and triggers a run based on VCS integration

          # Wait for run to complete
          terraform login
          terraform init
          terraform apply -auto-approve

      - name: Get Run Status
        run: |
          # Query Terraform Cloud API for run status
          curl -H "Authorization: Bearer ${{ secrets.TF_API_TOKEN }}" \
               https://app.terraform.io/api/v2/workspaces/ws-xxx/runs
```

---

## Drift Detection and Remediation

### Comprehensive Drift Detection

```yaml
name: Comprehensive Drift Detection

on:
  schedule:
    - cron: '0 */4 * * *'  # Every 4 hours
  workflow_dispatch:

jobs:
  detect-drift:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        environment: [dev, staging, prod]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Authenticate
        uses: azure/login@v1
        with:
          client-id: ${{ secrets[format('AZURE_CLIENT_ID_{0}', matrix.environment)] }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets[format('AZURE_SUBSCRIPTION_ID_{0}', matrix.environment)] }}

      - name: Initialize Terraform
        working-directory: environments/${{ matrix.environment }}
        run: terraform init

      - name: Check for Drift
        id: drift
        working-directory: environments/${{ matrix.environment }}
        run: |
          # Generate plan
          terraform plan -detailed-exitcode -out=drift.tfplan > plan_output.txt 2>&1
          exit_code=$?

          echo "exitcode=$exit_code" >> $GITHUB_OUTPUT

          # Capture plan output
          terraform show -no-color drift.tfplan > drift_details.txt

          # Calculate drift score
          added=$(grep -c "will be created" drift_details.txt || echo 0)
          changed=$(grep -c "will be updated" drift_details.txt || echo 0)
          destroyed=$(grep -c "will be destroyed" drift_details.txt || echo 0)

          drift_score=$((added + changed + destroyed))
          echo "drift_score=$drift_score" >> $GITHUB_OUTPUT
        continue-on-error: true

      - name: Analyze Drift
        if: steps.drift.outputs.exitcode == '2'
        id: analyze
        working-directory: environments/${{ matrix.environment }}
        run: |
          # Categorize drift
          if grep -q "tags" drift_details.txt; then
            echo "category=tags" >> $GITHUB_OUTPUT
          elif grep -q "network" drift_details.txt; then
            echo "category=network" >> $GITHUB_OUTPUT
          elif grep -q "security" drift_details.txt; then
            echo "category=security" >> $GITHUB_OUTPUT
            echo "severity=high" >> $GITHUB_OUTPUT
          else
            echo "category=general" >> $GITHUB_OUTPUT
          fi

      - name: Auto-Remediate Low-Risk Drift
        if: |
          steps.drift.outputs.exitcode == '2' &&
          steps.analyze.outputs.category == 'tags' &&
          steps.drift.outputs.drift_score < 5
        working-directory: environments/${{ matrix.environment }}
        run: |
          echo "🔧 Auto-remediating low-risk drift"
          terraform apply -auto-approve drift.tfplan

      - name: Create Drift Issue
        if: |
          steps.drift.outputs.exitcode == '2' &&
          (steps.analyze.outputs.severity == 'high' || steps.drift.outputs.drift_score >= 5)
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const driftDetails = fs.readFileSync(
              'environments/${{ matrix.environment }}/drift_details.txt',
              'utf8'
            );

            const severity = '${{ steps.analyze.outputs.severity }}' || 'medium';
            const category = '${{ steps.analyze.outputs.category }}';
            const driftScore = '${{ steps.drift.outputs.drift_score }}';

            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: `[DRIFT ${severity.toUpperCase()}] ${category} drift in ${{ matrix.environment }}`,
              body: `## Configuration Drift Detected

              **Environment:** ${{ matrix.environment }}
              **Category:** ${category}
              **Severity:** ${severity}
              **Drift Score:** ${driftScore}
              **Detected:** ${new Date().toISOString()}

              ### Drift Details

              <details><summary>View Changes</summary>

              \`\`\`terraform
              ${driftDetails.substring(0, 50000)}
              \`\`\`

              </details>

              ### Recommended Actions

              ${severity === 'high' ? '⚠️ **HIGH SEVERITY** - Immediate action required!' : ''}

              1. Review the drift details above
              2. Determine if changes are:
                 - Expected manual changes → Update Terraform config
                 - Unexpected drift → Investigate and remediate
              3. Apply remediation via GitOps

              ### Remediation Options

              - Manual review required: Apply changes through PR
              - Auto-remediation: Label this issue with \`auto-remediate\`
              `,
              labels: ['drift', 'infrastructure', category, severity, matrix.environment]
            });

      - name: Send Notification
        if: steps.drift.outputs.exitcode == '2'
        run: |
          # Send to Slack/Teams/PagerDuty
          curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
            -H 'Content-Type: application/json' \
            -d '{
              "text": "🚨 Drift detected in ${{ matrix.environment }}",
              "blocks": [{
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": "*Drift Score:* ${{ steps.drift.outputs.drift_score }}\n*Category:* ${{ steps.analyze.outputs.category }}"
                }
              }]
            }'
```

---

## GitOps Best Practices

### 1. Repository Organization

✅ **DO:**
- Separate application code from infrastructure code
- Use monorepo or clearly linked repos
- Maintain clear directory structure
- Version everything in Git

❌ **DON'T:**
- Mix application and infrastructure randomly
- Store secrets in Git
- Have unclear ownership of configs

### 2. Change Management

✅ **DO:**
- All changes through pull requests
- Require code reviews
- Use branch protection
- Tag releases

❌ **DON'T:**
- Make manual changes to infrastructure
- Skip review process
- Apply untracked changes

### 3. Security

✅ **DO:**
- Use OIDC for authentication
- Implement least privilege
- Sign commits
- Audit all changes

❌ **DON'T:**
- Store credentials in Git
- Use overly permissive access
- Skip security scanning

### 4. Automation

✅ **DO:**
- Automate drift detection
- Auto-remediate safe changes
- Use consistent reconciliation intervals
- Monitor reconciliation health

❌ **DON'T:**
- Rely on manual checks
- Skip monitoring
- Ignore drift alerts

---

## Hands-on Exercise

### Implement Complete GitOps Workflow

Create a GitOps setup that:

1. Uses Git as single source of truth
2. Implements pull-based reconciliation
3. Detects and remediates drift automatically
4. Sends notifications on drift
5. Maintains full audit trail
6. Implements progressive delivery

---

## Additional Resources

- [GitOps Principles](https://opengitops.dev/)
- [Terraform Cloud VCS Integration](https://developer.hashicorp.com/terraform/cloud-docs/vcs)
- [GitOps Working Group](https://github.com/gitops-working-group)
- [FluxCD with Terraform](https://fluxcd.io/flux/use-cases/terraform/)
- [ArgoCD](https://argo-cd.readthedocs.io/)

---

## Next Steps

In the next lesson, we'll cover **Automated Testing** for Terraform including:
- Unit testing with terraform test
- Integration testing
- Contract testing
- Compliance testing

Continue to [05-automated-testing.md](./05-automated-testing.md)
