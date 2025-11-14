# Disaster Recovery for Terraform

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [DR Strategy](#dr-strategy)
- [State File Backup and Recovery](#state-file-backup-and-recovery)
- [Infrastructure Backup](#infrastructure-backup)
- [Recovery Procedures](#recovery-procedures)
- [Multi-Region Deployment](#multi-region-deployment)
- [Testing DR Plans](#testing-dr-plans)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

---

## Overview

Disaster recovery for Terraform-managed infrastructure requires protecting both the Terraform state and the ability to recreate infrastructure. This guide covers backup strategies, recovery procedures, and best practices for ensuring infrastructure resilience.

---

## Learning Objectives

By the end of this guide, you will:
- Develop comprehensive DR strategies for Terraform
- Implement automated state file backups
- Create recovery procedures for various failure scenarios
- Design multi-region resilient infrastructure
- Test and validate disaster recovery plans
- Follow DevSecOps DR best practices

---

## Difficulty Level

**Advanced** - Requires deep understanding of Terraform and cloud platforms.

---

## Time Estimate

**45-60 minutes** - Reading and implementing DR strategies.

---

## DR Strategy

### The Three Pillars of Terraform DR

```
1. STATE PROTECTION          2. CODE PROTECTION          3. INFRASTRUCTURE RESILIENCE
   ├─ State backups             ├─ Version control           ├─ Multi-region deployment
   ├─ State versioning          ├─ Multiple branches         ├─ Auto-scaling
   ├─ State locking             ├─ Code review process       ├─ Health monitoring
   └─ Access control            └─ CI/CD pipelines           └─ Automated failover
```

---

### Recovery Objectives

**RTO (Recovery Time Objective):** How quickly can you recover?
**RPO (Recovery Point Objective):** How much data loss is acceptable?

**Example targets:**
- **Critical systems:** RTO < 1 hour, RPO < 5 minutes
- **Production systems:** RTO < 4 hours, RPO < 1 hour
- **Development systems:** RTO < 24 hours, RPO < 24 hours

---

## State File Backup and Recovery

### Automated State Backups

#### Azure Storage Backend with Versioning

```bash
# Enable blob versioning on storage account
az storage account blob-service-properties update \
  --account-name sttfstate \
  --enable-versioning true

# Enable soft delete
az storage blob service-properties update \
  --account-name sttfstate \
  --enable-delete-retention true \
  --delete-retention-days 30
```

**backend.tf:**
```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

---

#### AWS S3 Backend with Versioning

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket terraform-state-bucket \
  --versioning-configuration Status=Enabled

# Configure lifecycle policy for old versions
cat > lifecycle.json <<EOF
{
  "Rules": [{
    "Id": "DeleteOldVersions",
    "Status": "Enabled",
    "NoncurrentVersionExpiration": {
      "NoncurrentDays": 90
    }
  }]
}
EOF

aws s3api put-bucket-lifecycle-configuration \
  --bucket terraform-state-bucket \
  --lifecycle-configuration file://lifecycle.json
```

---

### Manual State Backup Script

**backup-state.sh:**
```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/backups/terraform"
DATE=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# Pull and backup state
terraform state pull > "$BACKUP_DIR/terraform-$DATE.tfstate"

# Compress backup
gzip "$BACKUP_DIR/terraform-$DATE.tfstate"

# Delete old backups
find $BACKUP_DIR -name "*.tfstate.gz" -mtime +$RETENTION_DAYS -delete

echo "State backed up to: $BACKUP_DIR/terraform-$DATE.tfstate.gz"
```

**Automate with cron:**
```bash
# Run backup daily at 2 AM
0 2 * * * /path/to/backup-state.sh
```

---

### State Recovery Procedures

#### Scenario 1: Corrupted Local State

```bash
# Restore from backup
cp terraform.tfstate.backup terraform.tfstate

# Verify
terraform plan

# Or pull from remote
terraform state pull > terraform.tfstate
```

---

#### Scenario 2: Deleted Remote State

**Azure Storage:**
```bash
# List versions
az storage blob list \
  --account-name sttfstate \
  --container-name tfstate \
  --prefix production.tfstate

# Restore specific version
az storage blob copy start \
  --account-name sttfstate \
  --destination-blob production.tfstate \
  --destination-container tfstate \
  --source-blob production.tfstate \
  --source-blob-snapshot "2024-01-15T10:30:00Z"
```

**AWS S3:**
```bash
# List versions
aws s3api list-object-versions \
  --bucket terraform-state-bucket \
  --prefix production.tfstate

# Restore specific version
aws s3api copy-object \
  --bucket terraform-state-bucket \
  --copy-source terraform-state-bucket/production.tfstate?versionId=VERSION_ID \
  --key production.tfstate
```

---

#### Scenario 3: Complete State Loss

**Recovery steps:**

```bash
# 1. Recreate backend storage if needed
./setup-backend.sh

# 2. Import existing resources
# List all resources that need to be imported
terraform import azurerm_resource_group.prod /subscriptions/.../resourceGroups/rg-prod
terraform import azurerm_storage_account.prod /subscriptions/.../storageAccounts/stprod

# 3. Verify imports
terraform plan
# Should show minimal or no changes

# 4. Document recovery
echo "State recovered on $(date)" >> recovery-log.txt
```

---

## Infrastructure Backup

### Application Data Backups

**Example: Database backup configuration**

```hcl
# Azure SQL Database with backup retention
resource "azurerm_mssql_database" "example" {
  name      = "sqldb-prod"
  server_id = azurerm_mssql_server.example.id
  sku_name  = "S1"

  # Backup retention
  short_term_retention_policy {
    retention_days = 35
  }

  long_term_retention_policy {
    weekly_retention  = "P4W"   # 4 weeks
    monthly_retention = "P12M"  # 12 months
    yearly_retention  = "P5Y"   # 5 years
    week_of_year      = 1
  }
}

# Backup policy for VMs
resource "azurerm_backup_policy_vm" "example" {
  name                = "backup-policy-vm"
  resource_group_name = azurerm_resource_group.example.name
  recovery_vault_name = azurerm_recovery_services_vault.example.name

  backup {
    frequency = "Daily"
    time      = "23:00"
  }

  retention_daily {
    count = 30
  }

  retention_weekly {
    count    = 12
    weekdays = ["Sunday"]
  }

  retention_monthly {
    count    = 12
    weekdays = ["Sunday"]
    weeks    = ["First"]
  }
}
```

---

### Infrastructure as Code Backups

**Version control is your primary backup:**

```bash
# Multiple remote repositories
git remote add origin https://github.com/company/terraform-infrastructure.git
git remote add backup https://gitlab.com/company/terraform-infrastructure.git

# Push to both
git push origin main
git push backup main
```

---

## Recovery Procedures

### Standard Operating Procedures

#### SOP: State File Recovery

**Document:** state-recovery-sop.md

```markdown
# State File Recovery SOP

## Triggers
- State file corruption
- Accidental state deletion
- State file unavailable

## Prerequisites
- Access to Azure Storage/AWS S3
- Terraform installed
- Cloud provider credentials

## Procedure

### Step 1: Assess Situation
- [ ] Identify the issue (corruption, deletion, etc.)
- [ ] Note the time of last known good state
- [ ] Check if backups are available

### Step 2: Stop All Operations
- [ ] Notify team to stop Terraform operations
- [ ] Lock backend if possible
- [ ] Document incident

### Step 3: Restore State
- [ ] Identify most recent backup
- [ ] Restore from backup
- [ ] Verify state integrity

### Step 4: Validate
- [ ] Run terraform plan
- [ ] Verify no unexpected changes
- [ ] Test in non-prod first if possible

### Step 5: Resume Operations
- [ ] Unlock backend
- [ ] Notify team
- [ ] Monitor for issues

## Rollback
If recovery fails, escalate to senior engineer.
```

---

#### SOP: Infrastructure Rebuild

**rebuild-infrastructure.sh:**
```bash
#!/bin/bash

set -e

ENVIRONMENT=$1
BACKUP_DATE=$2

echo "=== Infrastructure Rebuild SOP ==="
echo "Environment: $ENVIRONMENT"
echo "Backup Date: $BACKUP_DATE"

# Step 1: Restore configuration from Git
git checkout $BACKUP_DATE

# Step 2: Restore state file
./restore-state.sh $ENVIRONMENT $BACKUP_DATE

# Step 3: Initialize Terraform
terraform init -reconfigure

# Step 4: Validate plan
terraform plan -out=rebuild.tfplan

# Step 5: Wait for approval
read -p "Review plan and press Enter to continue or Ctrl+C to abort..."

# Step 6: Apply
terraform apply rebuild.tfplan

# Step 7: Verify
./verify-infrastructure.sh $ENVIRONMENT

echo "=== Rebuild Complete ==="
```

---

## Multi-Region Deployment

### Active-Passive Pattern

**main.tf:**
```hcl
variable "regions" {
  type = map(object({
    location = string
    active   = bool
  }))
  default = {
    primary = {
      location = "eastus"
      active   = true
    }
    dr = {
      location = "westus"
      active   = false
    }
  }
}

# Primary region resources
module "primary_region" {
  source = "./modules/region"

  location            = var.regions.primary.location
  resource_group_name = "rg-primary"
  active              = var.regions.primary.active
}

# DR region resources (standby)
module "dr_region" {
  source = "./modules/region"

  location            = var.regions.dr.location
  resource_group_name = "rg-dr"
  active              = var.regions.dr.active
}

# Traffic Manager for failover
resource "azurerm_traffic_manager_profile" "example" {
  name                   = "tm-failover"
  resource_group_name    = "rg-global"
  traffic_routing_method = "Priority"

  dns_config {
    relative_name = "myapp"
    ttl           = 30
  }

  monitor_config {
    protocol                     = "HTTPS"
    port                         = 443
    path                         = "/health"
    interval_in_seconds          = 30
    timeout_in_seconds           = 10
    tolerated_number_of_failures = 3
  }
}

# Primary endpoint
resource "azurerm_traffic_manager_endpoint" "primary" {
  name                = "primary"
  resource_group_name = "rg-global"
  profile_name        = azurerm_traffic_manager_profile.example.name
  type                = "azureEndpoints"
  target_resource_id  = module.primary_region.app_service_id
  priority            = 1
}

# DR endpoint
resource "azurerm_traffic_manager_endpoint" "dr" {
  name                = "dr"
  resource_group_name = "rg-global"
  profile_name        = azurerm_traffic_manager_profile.example.name
  type                = "azureEndpoints"
  target_resource_id  = module.dr_region.app_service_id
  priority            = 2
}
```

---

### Active-Active Pattern

```hcl
# Deploy to multiple regions
module "regions" {
  source = "./modules/region"

  for_each = toset(["eastus", "westus", "centralus"])

  location            = each.value
  resource_group_name = "rg-${each.value}"
  active              = true
}

# Global load balancer
resource "azurerm_traffic_manager_profile" "example" {
  name                   = "tm-global"
  resource_group_name    = "rg-global"
  traffic_routing_method = "Performance"  # Route to nearest

  dns_config {
    relative_name = "myapp"
    ttl           = 30
  }

  monitor_config {
    protocol = "HTTPS"
    port     = 443
    path     = "/health"
  }
}

# Endpoints for each region
resource "azurerm_traffic_manager_endpoint" "regions" {
  for_each = module.regions

  name                = each.key
  resource_group_name = "rg-global"
  profile_name        = azurerm_traffic_manager_profile.example.name
  type                = "azureEndpoints"
  target_resource_id  = each.value.app_service_id
}
```

---

## Testing DR Plans

### DR Testing Checklist

```markdown
## Annual DR Test Checklist

### Pre-Test
- [ ] Schedule DR test (announce to team)
- [ ] Review DR procedures
- [ ] Verify backups are current
- [ ] Create rollback plan
- [ ] Notify stakeholders

### State Recovery Test
- [ ] Simulate state corruption
- [ ] Restore from backup
- [ ] Verify successful recovery
- [ ] Document time taken (measure RTO)

### Infrastructure Failover Test
- [ ] Initiate failover to DR region
- [ ] Verify application availability
- [ ] Test application functionality
- [ ] Measure failover time
- [ ] Fail back to primary
- [ ] Verify normal operations

### Full Rebuild Test
- [ ] Delete test environment
- [ ] Rebuild from code and state backup
- [ ] Verify all resources created correctly
- [ ] Test application works
- [ ] Document rebuild time

### Post-Test
- [ ] Document lessons learned
- [ ] Update DR procedures if needed
- [ ] Share results with team
- [ ] Schedule next test
```

---

### Automated DR Testing

**dr-test.sh:**
```bash
#!/bin/bash

echo "=== DR Test Starting ==="

# Test 1: State backup and restore
echo "Test 1: State Backup/Restore"
terraform state pull > state-backup.tfstate
# Simulate corruption
rm terraform.tfstate
# Restore
cp state-backup.tfstate terraform.tfstate
terraform plan > /dev/null && echo "✓ State restore successful" || echo "✗ State restore failed"

# Test 2: Infrastructure in DR region
echo "Test 2: DR Region Deployment"
terraform workspace select dr
terraform plan -out=dr-test.tfplan
# Don't apply in automated test

# Test 3: Backup verification
echo "Test 3: Backup Verification"
./verify-backups.sh

echo "=== DR Test Complete ==="
```

---

## Best Practices

### 1. Automate Everything

```bash
# Automated daily checks
0 6 * * * /scripts/verify-state-backups.sh
0 7 * * * /scripts/test-dr-config.sh
```

### 2. Document Recovery Procedures

Keep SOPs up to date and easily accessible:
- Store in version control
- Print and laminate
- Include in on-call runbooks

### 3. Test Regularly

```
✅ Quarterly: State recovery tests
✅ Semi-annually: Partial infrastructure failover
✅ Annually: Full DR drill
```

### 4. Monitor and Alert

```hcl
# Azure Monitor alert for backup failures
resource "azurerm_monitor_metric_alert" "backup_failed" {
  name                = "backup-failure-alert"
  resource_group_name = azurerm_resource_group.example.name
  scopes              = [azurerm_recovery_services_vault.example.id]

  criteria {
    metric_namespace = "Microsoft.RecoveryServices/vaults"
    metric_name      = "BackupFailureCount"
    aggregation      = "Total"
    operator         = "GreaterThan"
    threshold        = 0
  }

  action {
    action_group_id = azurerm_monitor_action_group.oncall.id
  }
}
```

### 5. Maintain Multiple Copies

**3-2-1 Backup Rule:**
- 3 copies of data
- 2 different media types
- 1 off-site copy

**For Terraform:**
- State in remote backend (Azure/AWS/GCS)
- State backups in separate storage account
- Code in Git (GitHub + backup remote)

---

## Next Steps

Now that you understand disaster recovery:

1. **Performance optimization:** [06-performance-optimization.md](./06-performance-optimization.md)
2. **Enterprise patterns:** [07-enterprise-patterns.md](./07-enterprise-patterns.md)
3. **Implement your DR plan** based on this guide

---

## Related Documentation

- [State Management](./01-state-management.md)
- [Multi-Cloud Deployment](../04-multi-cloud/)
- [Azure Backup Documentation](https://docs.microsoft.com/azure/backup/)

---

**Estimated Completion Time:** 45-60 minutes

**Difficulty:** Advanced

**Previous:** [Terraform Testing](./04-terraform-testing.md) | **Next:** [Performance Optimization](./06-performance-optimization.md)
