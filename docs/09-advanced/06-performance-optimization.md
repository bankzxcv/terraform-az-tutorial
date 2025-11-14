# Performance Optimization

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Performance Bottlenecks](#performance-bottlenecks)
- [State Optimization](#state-optimization)
- [Parallelism and Concurrency](#parallelism-and-concurrency)
- [Resource Targeting](#resource-targeting)
- [Provider Optimization](#provider-optimization)
- [Large-Scale Deployments](#large-scale-deployments)
- [Monitoring and Profiling](#monitoring-and-profiling)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

---

## Overview

As Terraform configurations grow, performance becomes critical. This guide covers optimization techniques for large-scale deployments, from state management to parallelism configuration, helping you maintain fast, efficient infrastructure operations.

---

## Learning Objectives

By the end of this guide, you will:
- Identify and resolve Terraform performance bottlenecks
- Optimize state file size and operations
- Configure parallelism for faster deployments
- Implement efficient module structures
- Use targeting and refresh strategies
- Monitor and profile Terraform operations
- Apply performance best practices for large-scale infrastructure

---

## Difficulty Level

**Advanced** - Requires experience with large Terraform deployments.

---

## Time Estimate

**40-60 minutes** - Reading and implementing optimizations.

---

## Performance Bottlenecks

### Common Performance Issues

```
ISSUE                               | IMPACT       | SOLUTION
------------------------------------|--------------|---------------------------
Large state files (>10MB)           | Slow plan    | Split state, use modules
Too many resources (>1000)          | Slow refresh | Use -refresh=false
API rate limiting                   | Failed apply | Reduce parallelism
Slow provider initialization        | Slow init    | Use plugin cache
Deep module nesting (>5 levels)     | Slow plan    | Flatten structure
Large number of data sources (>100) | Slow plan    | Cache data, use locals
```

---

## State Optimization

### 1. Split Large State Files

**Problem:** Single state file with 1000+ resources is slow

**Solution:** Split into multiple state files

**Before (monolithic):**
```
terraform/
└── main.tf  (1000+ resources)
```

**After (split):**
```
terraform/
├── networking/
│   ├── main.tf
│   └── backend.tf (key = "networking.tfstate")
├── compute/
│   ├── main.tf
│   └── backend.tf (key = "compute.tfstate")
├── databases/
│   ├── main.tf
│   └── backend.tf (key = "databases.tfstate")
└── monitoring/
    ├── main.tf
    └── backend.tf (key = "monitoring.tfstate")
```

**Benefits:**
- Smaller state files (faster operations)
- Isolated blast radius
- Parallel team work
- Faster plan/apply cycles

---

### 2. Minimize State Refreshes

**Default behavior:**
```bash
terraform plan
# Refreshes ALL resources in state
```

**Optimization:**
```bash
# Skip refresh if you know state is current
terraform plan -refresh=false

# Refresh only when needed
terraform refresh

# Or use targeted refresh
terraform plan -refresh=false -target=module.networking
```

---

### 3. Use Remote State Data Sources Sparingly

**Slow approach:**
```hcl
# In every module...
data "terraform_remote_state" "networking" {
  backend = "azurerm"
  config = {
    resource_group_name  = "rg-terraform-state"
    storage_account_name = "sttfstate"
    container_name       = "tfstate"
    key                  = "networking.tfstate"
  }
}

data "terraform_remote_state" "security" {
  backend = "azurerm"
  config = { ... }
}
# ... 20 more remote state data sources
```

**Optimized approach:**
```hcl
# Pass values directly via variables
module "compute" {
  source = "./modules/compute"

  # Pass values directly instead of reading remote state
  vnet_id         = module.networking.vnet_id
  subnet_ids      = module.networking.subnet_ids
  security_group  = module.security.nsg_id
}
```

---

## Parallelism and Concurrency

### 1. Adjust Parallelism

**Default:** 10 concurrent operations

```bash
# Increase parallelism (more API calls)
terraform apply -parallelism=20

# Decrease if hitting rate limits
terraform apply -parallelism=5

# For very large deploys
terraform apply -parallelism=50
```

**When to increase:**
- Fast API responses
- No rate limiting
- Many independent resources

**When to decrease:**
- API rate limiting
- Slow API responses
- Order-dependent resources

---

### 2. Resource Dependencies

**Inefficient (forces sequential):**
```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-example"
  location = "eastus"
}

# Forces wait even though it doesn't need to
resource "azurerm_storage_account" "example" {
  depends_on = [azurerm_resource_group.example]
  # ...
}
```

**Efficient (parallel when possible):**
```hcl
resource "azurerm_resource_group" "example" {
  name     = "rg-example"
  location = "eastus"
}

# Natural dependency through attribute reference
resource "azurerm_storage_account" "example" {
  resource_group_name = azurerm_resource_group.example.name  # Implicit dependency
  # ...
}
```

---

### 3. Independent Resource Grouping

```hcl
# These can run in parallel
resource "azurerm_resource_group" "app" {
  name     = "rg-app"
  location = "eastus"
}

resource "azurerm_resource_group" "data" {
  name     = "rg-data"
  location = "eastus"
}

resource "azurerm_resource_group" "monitoring" {
  name     = "rg-monitoring"
  location = "eastus"
}

# Terraform automatically parallelizes these
```

---

## Resource Targeting

### 1. Targeted Apply

**Use case:** Large infrastructure, need to update specific resources

```bash
# Update only specific resource
terraform apply -target=azurerm_app_service.example

# Update multiple targets
terraform apply \
  -target=azurerm_app_service.web \
  -target=azurerm_app_service.api

# Update entire module
terraform apply -target=module.networking
```

**Performance benefit:** Skips planning for non-targeted resources

**Warning:** Can create dependency issues. Use cautiously!

---

### 2. Replace Instead of Taint

**Old (slow):**
```bash
terraform taint azurerm_virtual_machine.example
terraform apply
# Plans entire infrastructure, replaces one resource
```

**New (fast):**
```bash
terraform apply -replace=azurerm_virtual_machine.example
# Only plans and replaces targeted resource
```

---

## Provider Optimization

### 1. Provider Plugin Cache

**Setup:**
```bash
# Create cache directory
mkdir -p ~/.terraform.d/plugin-cache

# Configure in CLI config
cat > ~/.terraformrc << EOF
plugin_cache_dir = "$HOME/.terraform.d/plugin-cache"
EOF
```

**Benefit:** Download providers once, reuse across projects

---

### 2. Provider Parallelism

```hcl
provider "azurerm" {
  features {}

  # Increase Azure provider parallelism
  # Default is 10
  subscription_id = var.subscription_id
}
```

**Note:** Not all providers support this

---

### 3. Use Latest Provider Versions

```hcl
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75"  # Keep updated for performance fixes
    }
  }
}
```

---

## Large-Scale Deployments

### 1. Module Organization

**Problem:** Deep nesting is slow
```
root -> region_module -> vpc_module -> subnet_module -> security_module
(5 levels deep)
```

**Solution:** Flatten structure
```
root -> region_module (contains vpc, subnets, security together)
(2 levels deep)
```

---

### 2. Use count and for_each Efficiently

**Inefficient:**
```hcl
# 100 separate resource blocks
resource "azurerm_subnet" "subnet_1" { ... }
resource "azurerm_subnet" "subnet_2" { ... }
# ... 98 more
```

**Efficient:**
```hcl
# Single resource with count
variable "subnets" {
  type = list(object({
    name   = string
    prefix = string
  }))
}

resource "azurerm_subnet" "example" {
  count = length(var.subnets)

  name                 = var.subnets[count.index].name
  address_prefixes     = [var.subnets[count.index].prefix]
  virtual_network_name = azurerm_virtual_network.example.name
  resource_group_name  = azurerm_resource_group.example.name
}
```

---

### 3. Data Source Caching with Locals

**Slow (calls API multiple times):**
```hcl
resource "azurerm_subnet" "web" {
  resource_group_name  = data.azurerm_resource_group.existing.name
  virtual_network_name = data.azurerm_virtual_network.existing.name
  # ...
}

resource "azurerm_subnet" "app" {
  resource_group_name  = data.azurerm_resource_group.existing.name  # Duplicate call
  virtual_network_name = data.azurerm_virtual_network.existing.name  # Duplicate call
  # ...
}
```

**Fast (cache in locals):**
```hcl
data "azurerm_resource_group" "existing" {
  name = "rg-existing"
}

data "azurerm_virtual_network" "existing" {
  name                = "vnet-existing"
  resource_group_name = data.azurerm_resource_group.existing.name
}

locals {
  rg_name   = data.azurerm_resource_group.existing.name
  vnet_name = data.azurerm_virtual_network.existing.name
}

resource "azurerm_subnet" "web" {
  resource_group_name  = local.rg_name
  virtual_network_name = local.vnet_name
  # ...
}
```

---

### 4. Limit Data Source Queries

**Problem:**
```hcl
# Queries ALL VMs in subscription (slow!)
data "azurerm_virtual_machines" "all" {}
```

**Solution:**
```hcl
# Query specific VM
data "azurerm_virtual_machine" "specific" {
  name                = "vm-web-01"
  resource_group_name = "rg-production"
}

# Or use filters
data "azurerm_resources" "tagged" {
  type = "Microsoft.Compute/virtualMachines"

  required_tags = {
    Environment = "production"
  }
}
```

---

## Monitoring and Profiling

### 1. Enable Logging

```bash
# Enable trace logging
export TF_LOG=TRACE
export TF_LOG_PATH=terraform-trace.log

# Run operation
terraform apply

# Analyze log for slow operations
grep "duration_ms" terraform-trace.log | sort -k2 -n -r | head -20
```

---

### 2. Measure Performance

**Benchmark script:**
```bash
#!/bin/bash

echo "=== Terraform Performance Benchmark ==="

# Test 1: Init time
echo -n "Init time: "
time terraform init -upgrade > /dev/null 2>&1

# Test 2: Validate time
echo -n "Validate time: "
time terraform validate > /dev/null 2>&1

# Test 3: Plan time (with refresh)
echo -n "Plan time (with refresh): "
time terraform plan > /dev/null 2>&1

# Test 4: Plan time (without refresh)
echo -n "Plan time (no refresh): "
time terraform plan -refresh=false > /dev/null 2>&1

# Test 5: State list time
echo -n "State list time: "
time terraform state list > /dev/null 2>&1

# Count resources
RESOURCE_COUNT=$(terraform state list 2>/dev/null | wc -l)
echo "Total resources: $RESOURCE_COUNT"

echo "=== Benchmark Complete ==="
```

---

### 3. Profile Provider Operations

**Azure example:**
```bash
# Enable ARM debugging
export ARM_DEBUG=true

# Run terraform
terraform apply

# Check for slow API calls in output
```

---

## Best Practices

### 1. Keep State Files Under 10MB

```bash
# Check state file size
ls -lh terraform.tfstate

# If >10MB, consider splitting
```

---

### 2. Limit Resources Per State

**Guideline:**
- < 500 resources: Single state file OK
- 500-1000 resources: Consider splitting
- \> 1000 resources: Definitely split

---

### 3. Use Workspaces Wisely

**Don't:**
```bash
# 50 workspaces in single config (slow!)
terraform workspace list
# dev1, dev2, dev3, ... dev50
```

**Do:**
```bash
# Separate configs for scale
terraform-dev/
terraform-staging/
terraform-prod/
```

---

### 4. Optimize CI/CD

**GitHub Actions example:**
```yaml
jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      # Cache Terraform providers
      - uses: actions/cache@v3
        with:
          path: ~/.terraform.d/plugin-cache
          key: ${{ runner.os }}-terraform-${{ hashFiles('**/.terraform.lock.hcl') }}

      - name: Terraform Init
        run: terraform init

      # Use -refresh=false in plan for speed
      - name: Terraform Plan
        run: terraform plan -refresh=false -out=tfplan

      # Only apply changed resources
      - name: Terraform Apply
        run: terraform apply tfplan
```

---

### 5. Periodic State Cleanup

```bash
# Remove unused resources from state
terraform state rm 'module.old_module'

# Compact state (if provider supports)
terraform refresh
```

---

### 6. Use Smaller Module Scope

**Large module (slow):**
```hcl
module "everything" {
  source = "./modules/entire-infrastructure"
  # 500+ resources
}
```

**Small modules (fast):**
```hcl
module "networking" {
  source = "./modules/networking"
  # 50 resources
}

module "compute" {
  source = "./modules/compute"
  # 100 resources
}
```

---

## Performance Checklist

- [ ] State file < 10MB
- [ ] < 500 resources per state file
- [ ] Plugin cache configured
- [ ] Parallelism optimized (tested 5, 10, 20)
- [ ] Minimal data source queries
- [ ] No unnecessary `depends_on`
- [ ] Flat module structure (< 3 levels)
- [ ] Logs analyzed for slow operations
- [ ] Provider versions up to date
- [ ] CI/CD pipeline optimized

---

## Next Steps

Now that you understand performance optimization:

1. **Learn enterprise patterns:** [07-enterprise-patterns.md](./07-enterprise-patterns.md)
2. **Apply optimizations** to your infrastructure
3. **Monitor and measure** improvements

---

## Related Documentation

- [State Management](./01-state-management.md)
- [Enterprise Patterns](./07-enterprise-patterns.md)
- [Terraform Performance Documentation](https://www.terraform.io/docs/internals/performance.html)

---

**Estimated Completion Time:** 40-60 minutes

**Difficulty:** Advanced

**Previous:** [Disaster Recovery](./05-disaster-recovery.md) | **Next:** [Enterprise Patterns](./07-enterprise-patterns.md)
