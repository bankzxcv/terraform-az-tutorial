# Multi-Environment Deployment Example

This example demonstrates a complete multi-environment CI/CD pipeline with dev, staging, and production environments.

## What This Example Includes

- Separate configurations for dev/staging/prod
- Environment-specific variable files
- Automated deployment to dev
- Manual approval for staging/prod
- State file isolation
- Environment promotion workflow

## Architecture

```
┌─────────────────────────────────────────┐
│         Git Repository                  │
│                                         │
│  environments/                          │
│  ├── dev/                               │
│  │   ├── main.tf                        │
│  │   ├── terraform.tfvars               │
│  │   └── backend.tf                     │
│  ├── staging/                           │
│  │   ├── main.tf                        │
│  │   ├── terraform.tfvars               │
│  │   └── backend.tf                     │
│  └── prod/                              │
│      ├── main.tf                        │
│      ├── terraform.tfvars               │
│      └── backend.tf                     │
└─────────────────────────────────────────┘
```

## Deployment Flow

```
┌────────────┐
│  PR Merged │
└─────┬──────┘
      │
      ▼
┌─────────────┐
│   Dev Auto  │  ← Automatic deployment
└─────┬───────┘
      │
      ▼
┌─────────────┐
│   Staging   │  ← Manual approval required
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Production  │  ← Team lead approval + change window
└─────────────┘
```

## GitHub Actions Workflow

```yaml
name: Multi-Environment Deploy

on:
  push:
    branches: [main, develop, 'release/**']

jobs:
  determine-env:
    runs-on: ubuntu-latest
    outputs:
      environment: ${{ steps.set-env.outputs.environment }}
    steps:
      - id: set-env
        run: |
          if [[ "${{ github.ref }}" == "refs/heads/main" ]]; then
            echo "environment=prod" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" == "refs/heads/develop" ]]; then
            echo "environment=dev" >> $GITHUB_OUTPUT
          elif [[ "${{ github.ref }}" =~ ^refs/heads/release/.* ]]; then
            echo "environment=staging" >> $GITHUB_OUTPUT
          fi

  deploy:
    needs: determine-env
    runs-on: ubuntu-latest
    environment: ${{ needs.determine-env.outputs.environment }}

    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3

      - name: Deploy
        working-directory: environments/${{ needs.determine-env.outputs.environment }}
        run: |
          terraform init
          terraform apply -auto-approve
```

## Environment Configuration

### Development (dev)

**Purpose:** Fast iteration and testing
**Deployment:** Automatic on merge to `develop`
**Approvals:** None required
**Cost:** Minimal resources

```hcl
# environments/dev/terraform.tfvars
environment     = "dev"
instance_count  = 1
instance_size   = "Standard_B2s"
enable_backup   = false
enable_monitoring = false
auto_destroy_at_night = true
```

### Staging (staging)

**Purpose:** Production mirror for testing
**Deployment:** Manual trigger or on `release/*` branches
**Approvals:** Team lead
**Cost:** Production-like

```hcl
# environments/staging/terraform.tfvars
environment     = "staging"
instance_count  = 2
instance_size   = "Standard_D2s_v3"
enable_backup   = true
enable_monitoring = true
auto_destroy_at_night = false
```

### Production (prod)

**Purpose:** Live environment
**Deployment:** Manual trigger on main branch
**Approvals:** 2 team leads + change window
**Cost:** Full scale

```hcl
# environments/prod/terraform.tfvars
environment     = "prod"
instance_count  = 5
instance_size   = "Standard_D4s_v3"
enable_backup   = true
enable_monitoring = true
enable_autoscaling = true
auto_destroy_at_night = false
```

## State Management

Each environment uses separate state files:

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

## Secrets Management

Secrets are stored per environment in GitHub:

```
Repository Secrets (Global):
  AZURE_TENANT_ID

Environment Secrets:
  dev:
    AZURE_CLIENT_ID_DEV
    AZURE_SUBSCRIPTION_ID_DEV

  staging:
    AZURE_CLIENT_ID_STAGING
    AZURE_SUBSCRIPTION_ID_STAGING

  prod:
    AZURE_CLIENT_ID_PROD
    AZURE_SUBSCRIPTION_ID_PROD
```

## Environment Promotion

### Automatic Promotion (Dev → Staging)

```bash
# Create release branch from develop
git checkout develop
git pull
git checkout -b release/v1.2.0

# Push to trigger staging deployment
git push origin release/v1.2.0
```

### Manual Promotion (Staging → Prod)

```bash
# After staging validation
git checkout main
git merge release/v1.2.0
git push origin main
# Approve deployment in GitHub UI
```

## GitHub Environment Protection

Configure in GitHub Settings → Environments:

### Dev Environment
- ✅ No restrictions
- ✅ Auto-deploy on merge

### Staging Environment
- ✅ Required reviewers: 1
- ✅ Wait timer: 5 minutes
- ⬜ Deployment branches: `release/*`

### Production Environment
- ✅ Required reviewers: 2
- ✅ Wait timer: 30 minutes
- ✅ Deployment branches: `main` only
- ✅ Deployment window: Business hours only

## Testing Strategy

### Dev Environment
```bash
# Automated tests
- Terraform validate
- Security scanning
- Unit tests

# Manual testing
- Feature validation
- Integration testing
```

### Staging Environment
```bash
# Automated tests
- All dev tests
- Integration tests
- Performance tests
- Load tests

# Manual testing
- UAT testing
- Security audit
- DR testing
```

### Production Environment
```bash
# Pre-deployment
- All staging tests passed
- Change request approved
- Rollback plan documented

# Post-deployment
- Smoke tests
- Health checks
- Monitoring validation
```

## Rollback Procedure

### Automatic Rollback

```yaml
# In workflow
- name: Health Check
  id: health
  run: ./scripts/health-check.sh

- name: Rollback on Failure
  if: failure()
  run: |
    git checkout HEAD~1 -- terraform/
    terraform apply -auto-approve
```

### Manual Rollback

```bash
# Revert to previous state
terraform state pull > backup.tfstate
git checkout <previous-commit> -- environments/prod/
terraform apply -auto-approve

# Or use state backup
terraform state push backup.tfstate
```

## Monitoring and Alerts

```yaml
# Post-deployment checks
- name: Configure Monitoring
  run: |
    # Set up alerts for deployment
    az monitor metrics alert create \
      --name "deployment-alert-${{ github.run_number }}" \
      --resource-group ${{ env.RESOURCE_GROUP }} \
      --condition "avg Percentage CPU > 80"
```

## Cost Management

```yaml
# Cost estimation in PR
- name: Estimate Costs
  uses: infracost/actions/setup@v2

- name: Generate cost diff
  run: |
    infracost breakdown \
      --path=environments/${{ matrix.environment }} \
      --format=json \
      --out-file=costs.json
```

## Best Practices

✅ **DO:**
- Use separate state files per environment
- Implement approval gates for production
- Test in lower environments first
- Automate dev deployments
- Monitor all deployments
- Document rollback procedures

❌ **DON'T:**
- Share state across environments
- Skip staging testing
- Deploy directly to production
- Use same credentials for all environments
- Ignore deployment failures

## Troubleshooting

### Issue: State lock in prod

```bash
# Force unlock (use with caution!)
terraform force-unlock <lock-id>

# Better: Wait for lock to release or investigate
```

### Issue: Different results in environments

**Cause:** Configuration drift or different provider versions

**Solution:**
```bash
# Ensure same Terraform version
terraform version

# Check provider versions
terraform providers lock

# Validate consistency
terraform plan -detailed-exitcode
```

## Next Steps

- Add blue-green deployments
- Implement canary releases
- Set up disaster recovery
- Configure backup/restore procedures

## Resources

- [GitHub Environments](https://docs.github.com/en/actions/deployment/targeting-different-environments)
- [Terraform Workspaces](https://developer.hashicorp.com/terraform/language/state/workspaces)
- [Environment Promotion Strategies](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
