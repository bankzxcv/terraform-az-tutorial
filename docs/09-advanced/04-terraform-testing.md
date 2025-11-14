# Terraform Testing

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Testing Strategies](#testing-strategies)
- [Built-in Terraform Tests](#built-in-terraform-tests)
- [Terratest](#terratest)
- [Kitchen-Terraform](#kitchen-terraform)
- [Policy Testing with Sentinel](#policy-testing-with-sentinel)
- [CI/CD Integration](#cicd-integration)
- [Best Practices](#best-practices)
- [Next Steps](#next-steps)

---

## Overview

Testing Infrastructure as Code is crucial for maintaining reliable, secure deployments. This guide covers various testing approaches for Terraform, from built-in validation to comprehensive integration tests with Terratest and Kitchen-Terraform.

---

## Learning Objectives

By the end of this guide, you will:
- Understand different levels of Terraform testing
- Use built-in Terraform validation and testing features
- Write integration tests with Terratest (Go)
- Implement Kitchen-Terraform tests (Ruby)
- Test security policies with Sentinel
- Integrate testing into CI/CD pipelines
- Follow DevSecOps testing best practices

---

## Difficulty Level

**Advanced** - Requires programming knowledge (Go or Ruby) for integration testing.

---

## Time Estimate

**60-90 minutes** - Including hands-on examples.

---

## Testing Strategies

### Testing Pyramid for IaC

```
                 ▲
                /│\
               / │ \
              /  │  \
             / E2E  \          End-to-End Tests
            /________\         (Slowest, Most Expensive)
           /          \
          / Integration \      Integration Tests
         /______________\     (Medium Speed/Cost)
        /                \
       /   Unit/Static    \   Static Analysis & Unit Tests
      /____________________\  (Fastest, Cheapest)
```

---

### Test Types

1. **Static Analysis** (Fast, No Deployment)
   - Syntax validation (`terraform validate`)
   - Linting (TFLint, Checkov)
   - Security scanning (tfsec, Terrascan)
   - Format checking (`terraform fmt`)

2. **Unit Tests** (Fast, No Deployment)
   - Variable validation
   - Output validation
   - Mock tests

3. **Integration Tests** (Slow, Deploys Real Resources)
   - Deploy to test environment
   - Verify resources created correctly
   - Test functionality
   - Destroy resources

4. **End-to-End Tests** (Slowest, Full Stack)
   - Deploy entire application
   - Test application functionality
   - Verify monitoring, backups, etc.

---

## Built-in Terraform Tests

### 1. Syntax Validation

```bash
# Validate configuration syntax
terraform validate

# Output:
# Success! The configuration is valid.
```

**Use in CI/CD:**
```yaml
# .github/workflows/terraform.yml
- name: Terraform Validate
  run: terraform validate
```

---

### 2. Format Checking

```bash
# Check if files are formatted
terraform fmt -check -recursive

# Exit code 0 = properly formatted
# Exit code 3 = files need formatting
```

---

### 3. Terraform Test (Experimental - Terraform 1.6+)

Terraform 1.6 introduced experimental test framework:

**tests/resource_group.tftest.hcl:**
```hcl
run "verify_resource_group_creation" {
  command = apply

  variables {
    resource_group_name = "rg-test"
    location            = "eastus"
  }

  assert {
    condition     = azurerm_resource_group.example.location == "eastus"
    error_message = "Resource group location must be eastus"
  }

  assert {
    condition     = azurerm_resource_group.example.tags["Environment"] == "test"
    error_message = "Resource group must have Environment tag"
  }
}

run "verify_resource_group_deletion" {
  command = destroy
}
```

**Run tests:**
```bash
terraform test
```

---

### 4. Variable Validation

**variables.tf:**
```hcl
variable "environment" {
  description = "Environment name"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "vm_size" {
  description = "Virtual machine size"
  type        = string

  validation {
    condition     = can(regex("^Standard_[A-Z][0-9]+[a-z]*_v[0-9]+$", var.vm_size))
    error_message = "VM size must match Azure naming pattern."
  }
}

variable "cidr_block" {
  description = "CIDR block for VNet"
  type        = string

  validation {
    condition     = can(cidrhost(var.cidr_block, 0))
    error_message = "Must be a valid CIDR block."
  }
}
```

---

## Terratest

### Overview

**Terratest** is a Go library for testing infrastructure:
- Write tests in Go
- Deploy real infrastructure
- Validate deployed resources
- Automatic cleanup

**GitHub:** https://github.com/gruntwork-io/terratest

---

### Setup

**Install Go:**
```bash
# macOS
brew install go

# Linux
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
export PATH=$PATH:/usr/local/go/bin
```

**Project structure:**
```
terraform-project/
├── main.tf
├── variables.tf
├── outputs.tf
└── test/
    ├── go.mod
    ├── go.sum
    └── terraform_test.go
```

---

### Example Test

**test/terraform_test.go:**
```go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/stretchr/testify/assert"
)

func TestAzureResourceGroup(t *testing.T) {
    t.Parallel()

    // Construct terraform options
    terraformOptions := &terraform.Options{
        // Path to Terraform code
        TerraformDir: "../",

        // Variables to pass
        Vars: map[string]interface{}{
            "resource_group_name": "rg-test",
            "location":            "eastus",
        },

        // Environment variables
        EnvVars: map[string]string{
            "ARM_SUBSCRIPTION_ID": "<subscription-id>",
        },
    }

    // Clean up resources at end of test
    defer terraform.Destroy(t, terraformOptions)

    // Deploy infrastructure
    terraform.InitAndApply(t, terraformOptions)

    // Validate outputs
    resourceGroupName := terraform.Output(t, terraformOptions, "resource_group_name")
    assert.Equal(t, "rg-test", resourceGroupName)

    // Validate Azure resources exist
    exists := azure.ResourceGroupExists(t, resourceGroupName, "<subscription-id>")
    assert.True(t, exists)

    // Get resource group and validate properties
    resourceGroup := azure.GetResourceGroup(t, resourceGroupName, "<subscription-id>")
    assert.Equal(t, "eastus", resourceGroup.Location)
}
```

---

### Running Terratest

**Initialize Go module:**
```bash
cd test/
go mod init terraform-test
go mod tidy
```

**Run tests:**
```bash
# Run all tests
go test -v -timeout 30m

# Run specific test
go test -v -run TestAzureResourceGroup

# Run with parallelism
go test -v -parallel 5
```

---

### Advanced Terratest Example

**test/storage_account_test.go:**
```go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/gruntwork-io/terratest/modules/random"
    "github.com/stretchr/testify/assert"
)

func TestStorageAccount(t *testing.T) {
    t.Parallel()

    // Generate unique name
    uniqueID := random.UniqueId()
    resourceGroupName := "rg-test-" + uniqueID
    storageAccountName := "sttest" + uniqueID

    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/storage-account",
        Vars: map[string]interface{}{
            "resource_group_name":  resourceGroupName,
            "storage_account_name": storageAccountName,
            "location":             "eastus",
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Test: Storage account exists
    subscriptionID := "<subscription-id>"
    exists := azure.StorageAccountExists(t, storageAccountName, resourceGroupName, subscriptionID)
    assert.True(t, exists)

    // Test: Storage account has correct properties
    storageAccount := azure.GetStorageAccount(t, storageAccountName, resourceGroupName, subscriptionID)
    assert.Equal(t, "Standard_LRS", string(storageAccount.Sku.Name))
    assert.Equal(t, "StorageV2", string(storageAccount.Kind))

    // Test: Blob container was created
    containerName := terraform.Output(t, terraformOptions, "container_name")
    containerExists := azure.StorageBlobContainerExists(t, containerName, storageAccountName, resourceGroupName, subscriptionID)
    assert.True(t, containerExists)
}
```

---

## Kitchen-Terraform

### Overview

**Kitchen-Terraform** integrates Test Kitchen with Terraform:
- Ruby-based testing
- InSpec for validation
- Supports multiple test suites

**Documentation:** https://github.com/newcontext-oss/kitchen-terraform

---

### Setup

**Install Ruby and dependencies:**
```bash
# macOS
brew install ruby

# Install bundler
gem install bundler

# Install Kitchen-Terraform
gem install kitchen-terraform
```

**Create Gemfile:**
```ruby
source "https://rubygems.org/" do
  gem "test-kitchen"
  gem "kitchen-terraform"
  gem "kitchen-inspec"
end
```

**Install dependencies:**
```bash
bundle install
```

---

### Configuration

**.kitchen.yml:**
```yaml
---
driver:
  name: terraform

provisioner:
  name: terraform

platforms:
  - name: terraform

verifier:
  name: terraform
  systems:
    - name: default
      backend: azure
      controls:
        - resource_group

suites:
  - name: default
    driver:
      variables:
        resource_group_name: rg-test-kitchen
        location: eastus
    verifier:
      systems:
        - name: default
          backend: azure
```

---

### InSpec Test

**test/integration/default/controls/resource_group.rb:**
```ruby
control 'resource_group' do
  impact 1.0
  title 'Verify resource group'
  desc 'Ensures resource group is configured correctly'

  describe azurerm_resource_group(name: 'rg-test-kitchen') do
    it { should exist }
    its('location') { should eq 'eastus' }
    its('tags') { should include('Environment' => 'test') }
  end
end

control 'storage_account' do
  impact 1.0
  title 'Verify storage account'

  describe azurerm_storage_account(
    resource_group: 'rg-test-kitchen',
    name: 'sttestkitchen123'
  ) do
    it { should exist }
    its('sku.name') { should eq 'Standard_LRS' }
    its('properties.encryption.services.blob.enabled') { should be true }
  end
end
```

---

### Running Kitchen-Terraform

```bash
# List test suites
bundle exec kitchen list

# Create infrastructure
bundle exec kitchen create

# Run tests
bundle exec kitchen verify

# Destroy infrastructure
bundle exec kitchen destroy

# All in one command
bundle exec kitchen test
```

---

## Policy Testing with Sentinel

### Overview

**Sentinel** is HashiCorp's policy-as-code framework:
- Enforce compliance requirements
- Validate infrastructure before deployment
- Available in Terraform Enterprise/Cloud

---

### Example Sentinel Policy

**policies/require-tags.sentinel:**
```python
import "tfplan/v2" as tfplan

# List of required tags
required_tags = ["Environment", "Owner", "CostCenter"]

# Get all resources
all_resources = filter tfplan.resource_changes as _, rc {
    rc.mode is "managed" and
    rc.change.actions contains "create"
}

# Validation function
validate_tags = func(resource) {
    has_tags = "tags" in resource.change.after
    if not has_tags {
        return false
    }

    tags = resource.change.after.tags
    for required_tags as tag {
        if tag not in keys(tags) {
            return false
        }
    }
    return true
}

# Main rule
main = rule {
    all all_resources as _, resource {
        validate_tags(resource)
    }
}
```

---

### Testing Sentinel Policies

**sentinel.hcl:**
```hcl
policy "require-tags" {
    source = "./policies/require-tags.sentinel"
    enforcement_level = "hard-mandatory"
}

policy "restrict-vm-sizes" {
    source = "./policies/restrict-vm-sizes.sentinel"
    enforcement_level = "soft-mandatory"
}
```

**Run tests:**
```bash
sentinel test

# Test specific policy
sentinel test policies/require-tags.sentinel
```

---

## CI/CD Integration

### GitHub Actions Example

**.github/workflows/terraform-test.yml:**
```yaml
name: Terraform Tests

on:
  pull_request:
    branches: [ main ]
  push:
    branches: [ main ]

jobs:
  terraform-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.6.0

      - name: Terraform Format
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init

      - name: Terraform Validate
        run: terraform validate

      - name: TFLint
        uses: terraform-linters/setup-tflint@v3
        with:
          tflint_version: latest

      - name: Run TFLint
        run: tflint --recursive

      - name: Security Scan with tfsec
        uses: aquasecurity/tfsec-action@v1.0.0

      - name: Setup Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'

      - name: Run Terratest
        working-directory: test/
        env:
          ARM_CLIENT_ID: ${{ secrets.ARM_CLIENT_ID }}
          ARM_CLIENT_SECRET: ${{ secrets.ARM_CLIENT_SECRET }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.ARM_SUBSCRIPTION_ID }}
          ARM_TENANT_ID: ${{ secrets.ARM_TENANT_ID }}
        run: |
          go mod download
          go test -v -timeout 30m
```

---

### Azure DevOps Example

**azure-pipelines.yml:**
```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

stages:
  - stage: Test
    jobs:
      - job: TerraformTest
        steps:
          - task: TerraformInstaller@0
            inputs:
              terraformVersion: '1.6.0'

          - script: terraform fmt -check -recursive
            displayName: 'Terraform Format Check'

          - script: terraform init
            displayName: 'Terraform Init'

          - script: terraform validate
            displayName: 'Terraform Validate'

          - task: Go@0
            inputs:
              command: 'test'
              workingDirectory: 'test/'
            displayName: 'Run Terratest'
            env:
              ARM_CLIENT_ID: $(ARM_CLIENT_ID)
              ARM_CLIENT_SECRET: $(ARM_CLIENT_SECRET)
              ARM_SUBSCRIPTION_ID: $(ARM_SUBSCRIPTION_ID)
              ARM_TENANT_ID: $(ARM_TENANT_ID)
```

---

## Best Practices

### 1. Test at Multiple Levels

```
✅ Static analysis in pre-commit hooks
✅ Unit tests in CI on every PR
✅ Integration tests nightly
✅ E2E tests before production deployment
```

### 2. Use Unique Names

```go
// Generate unique names to avoid conflicts
uniqueID := random.UniqueId()
resourceGroupName := "rg-test-" + uniqueID
```

### 3. Always Clean Up

```go
// Use defer for guaranteed cleanup
defer terraform.Destroy(t, terraformOptions)
```

### 4. Parallel Testing

```go
// Enable parallel tests
func TestExample(t *testing.T) {
    t.Parallel()
    // Test code...
}
```

### 5. Separate Test Environments

```bash
# Use separate subscriptions/accounts for testing
export ARM_SUBSCRIPTION_ID="test-subscription-id"
```

---

## Next Steps

Now that you understand Terraform testing:

1. **Learn disaster recovery:** [05-disaster-recovery.md](./05-disaster-recovery.md)
2. **Performance optimization:** [06-performance-optimization.md](./06-performance-optimization.md)
3. **Enterprise patterns:** [07-enterprise-patterns.md](./07-enterprise-patterns.md)

---

## Related Documentation

- [Terratest](https://terratest.gruntwork.io/)
- [Kitchen-Terraform](https://github.com/newcontext-oss/kitchen-terraform)
- [Sentinel](https://docs.hashicorp.com/sentinel)

---

**Estimated Completion Time:** 60-90 minutes

**Difficulty:** Advanced

**Previous:** [Import Existing Resources](./03-import-existing.md) | **Next:** [Disaster Recovery](./05-disaster-recovery.md)
