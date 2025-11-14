# Automated Testing for Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Implement comprehensive Terraform testing strategies
- Write and execute unit tests with terraform test
- Create integration tests with Terratest
- Implement contract and compliance testing
- Use property-based testing approaches
- Integrate tests into CI/CD pipelines

## Prerequisites

- Completed previous CI/CD lessons
- Understanding of testing concepts
- Familiarity with Go (for Terratest) - optional
- Understanding of Terraform modules

**Estimated Time:** 75-90 minutes

---

## Testing Pyramid for Infrastructure

```
        ┌──────────────┐
        │   Manual     │  ← Manual verification
        │   Testing    │     Exploratory testing
        └──────────────┘
       ┌────────────────┐
       │  End-to-End    │  ← Full deployment tests
       │    Tests       │     Production-like env
       └────────────────┘
      ┌──────────────────┐
      │  Integration     │  ← Module integration
      │    Tests         │     Resource dependencies
      └──────────────────┘
     ┌────────────────────┐
     │   Unit Tests       │  ← Terraform test
     │  (terraform test)  │     Module validation
     └────────────────────┘
    ┌──────────────────────┐
    │   Static Analysis    │  ← Linting, validation
    │  (fmt, validate)     │     Security scanning
    └──────────────────────┘
```

---

## Static Analysis and Linting

### Terraform Fmt

```yaml
# .github/workflows/static-analysis.yml
name: Static Analysis

on: [push, pull_request]

jobs:
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Format Check
        run: |
          terraform fmt -check -recursive -diff

      - name: Auto-fix formatting (on PR)
        if: failure() && github.event_name == 'pull_request'
        run: |
          terraform fmt -recursive
          git config user.name "Terraform Bot"
          git config user.email "terraform-bot@example.com"
          git add .
          git commit -m "style: auto-format Terraform files" || exit 0
          git push
```

### Terraform Validate

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate

      - name: Validate with JSON output
        run: |
          terraform validate -json | jq '
            if .valid then
              "✅ Configuration is valid"
            else
              .diagnostics[] | "❌ " + .severity + ": " + .summary
            end
          '
```

### TFLint

```yaml
jobs:
  tflint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup TFLint
        uses: terraform-linters/setup-tflint@v4
        with:
          tflint_version: latest

      - name: Initialize TFLint
        run: tflint --init

      - name: Run TFLint
        run: tflint --format=compact

      - name: TFLint with custom config
        run: |
          cat > .tflint.hcl << 'EOF'
          plugin "azurerm" {
            enabled = true
            version = "0.25.0"
            source  = "github.com/terraform-linters/tflint-ruleset-azurerm"
          }

          rule "terraform_naming_convention" {
            enabled = true
          }

          rule "terraform_required_version" {
            enabled = true
          }

          rule "terraform_required_providers" {
            enabled = true
          }
          EOF

          tflint --config=.tflint.hcl
```

---

## Unit Testing with terraform test

### Basic terraform test

```hcl
# tests/basic.tftest.hcl
run "verify_resource_group_name" {
  command = plan

  assert {
    condition     = azurerm_resource_group.main.name == "test-rg"
    error_message = "Resource group name must be 'test-rg'"
  }

  assert {
    condition     = azurerm_resource_group.main.location == "eastus"
    error_message = "Resource group must be in East US"
  }
}

run "verify_tags" {
  command = plan

  variables {
    tags = {
      Environment = "test"
      ManagedBy   = "terraform"
    }
  }

  assert {
    condition     = azurerm_resource_group.main.tags["Environment"] == "test"
    error_message = "Environment tag must be set to 'test'"
  }

  assert {
    condition     = azurerm_resource_group.main.tags["ManagedBy"] == "terraform"
    error_message = "ManagedBy tag must be set to 'terraform'"
  }
}
```

### Testing Modules

```hcl
# modules/storage/tests/storage.tftest.hcl

variables {
  name                = "teststorage"
  resource_group_name = "test-rg"
  location            = "eastus"
}

run "validate_storage_account_tier" {
  command = plan

  assert {
    condition     = azurerm_storage_account.main.account_tier == "Standard"
    error_message = "Storage account tier should be Standard"
  }
}

run "validate_encryption" {
  command = plan

  assert {
    condition     = azurerm_storage_account.main.enable_https_traffic_only == true
    error_message = "HTTPS traffic only must be enabled"
  }

  assert {
    condition     = azurerm_storage_account.main.min_tls_version == "TLS1_2"
    error_message = "Minimum TLS version must be 1.2"
  }
}

run "validate_network_rules" {
  command = plan

  variables {
    enable_firewall = true
    allowed_ips     = ["1.2.3.4"]
  }

  assert {
    condition     = length(azurerm_storage_account.main.network_rules[0].ip_rules) > 0
    error_message = "Network rules must be configured when firewall is enabled"
  }
}

# Integration test - actually create resources
run "create_and_verify" {
  command = apply

  variables {
    name                = "teststore${random_string.suffix.result}"
    resource_group_name = "test-rg"
  }

  assert {
    condition     = output.storage_account_id != ""
    error_message = "Storage account ID must be populated"
  }

  assert {
    condition     = output.primary_blob_endpoint != ""
    error_message = "Primary blob endpoint must be populated"
  }
}
```

### Advanced Testing with Mock Providers

```hcl
# tests/mock_provider.tftest.hcl

# Override provider for testing
mock_provider "azurerm" {
  mock_resource "azurerm_resource_group" {
    defaults = {
      id       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg"
      name     = "test-rg"
      location = "eastus"
    }
  }

  mock_resource "azurerm_storage_account" {
    defaults = {
      id                       = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/test-rg/providers/Microsoft.Storage/storageAccounts/teststore"
      name                     = "teststore"
      account_tier             = "Standard"
      account_replication_type = "LRS"
    }
  }
}

run "test_with_mocks" {
  command = plan

  assert {
    condition     = azurerm_storage_account.main.name == "teststore"
    error_message = "Storage account name doesn't match"
  }
}
```

### Running Tests in CI/CD

```yaml
name: Terraform Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: 1.6.0

      - name: Run Unit Tests
        run: |
          terraform init -backend=false
          terraform test

      - name: Run Tests with Coverage
        run: |
          terraform test -verbose

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results.json
```

---

## Integration Testing with Terratest

### Terratest Setup

```go
// test/storage_test.go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/azure"
    "github.com/stretchr/testify/assert"
)

func TestStorageAccountCreation(t *testing.T) {
    t.Parallel()

    // Configure Terraform options
    terraformOptions := terraform.WithDefaultRetryableErrors(t, &terraform.Options{
        // Path to Terraform code
        TerraformDir: "../modules/storage",

        // Variables to pass
        Vars: map[string]interface{}{
            "name":                "teststore" + random.UniqueId(),
            "resource_group_name": "terratest-rg",
            "location":            "eastus",
        },

        // Environment variables
        EnvVars: map[string]string{
            "ARM_SUBSCRIPTION_ID": os.Getenv("ARM_SUBSCRIPTION_ID"),
        },
    })

    // Clean up resources after test
    defer terraform.Destroy(t, terraformOptions)

    // Run terraform init and apply
    terraform.InitAndApply(t, terraformOptions)

    // Get outputs
    storageAccountName := terraform.Output(t, terraformOptions, "storage_account_name")
    resourceGroupName := terraform.Output(t, terraformOptions, "resource_group_name")

    // Verify storage account exists
    assert.True(t, azure.StorageAccountExists(t, storageAccountName, resourceGroupName, ""))

    // Get storage account properties
    storageAccount := azure.GetStorageAccount(t, storageAccountName, resourceGroupName, "")

    // Verify properties
    assert.Equal(t, "Standard", storageAccount.Sku.Tier)
    assert.True(t, storageAccount.EnableHTTPSTrafficOnly)
}
```

### Complex Integration Tests

```go
// test/networking_test.go
package test

import (
    "fmt"
    "testing"
    "time"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/gruntwork-io/terratest/modules/retry"
    "github.com/stretchr/testify/assert"
)

func TestVNetConfiguration(t *testing.T) {
    t.Parallel()

    expectedVNetName := fmt.Sprintf("vnet-%s", random.UniqueId())
    expectedSubnetCount := 3

    terraformOptions := &terraform.Options{
        TerraformDir: "../modules/networking",
        Vars: map[string]interface{}{
            "vnet_name":     expectedVNetName,
            "address_space": []string{"10.0.0.0/16"},
            "subnets": []map[string]string{
                {"name": "subnet1", "prefix": "10.0.1.0/24"},
                {"name": "subnet2", "prefix": "10.0.2.0/24"},
                {"name": "subnet3", "prefix": "10.0.3.0/24"},
            },
        },
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Test outputs
    vnetName := terraform.Output(t, terraformOptions, "vnet_name")
    subnetIds := terraform.OutputList(t, terraformOptions, "subnet_ids")

    assert.Equal(t, expectedVNetName, vnetName)
    assert.Equal(t, expectedSubnetCount, len(subnetIds))

    // Retry logic for eventual consistency
    maxRetries := 10
    timeBetweenRetries := 10 * time.Second

    retry.DoWithRetry(t, "Check VNet", maxRetries, timeBetweenRetries, func() (string, error) {
        vnet := azure.GetVirtualNetwork(t, vnetName, "test-rg", "")
        if vnet == nil {
            return "", fmt.Errorf("VNet not found")
        }
        return "VNet exists", nil
    })
}

// Test network connectivity
func TestNetworkConnectivity(t *testing.T) {
    t.Parallel()

    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/full-stack",
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    // Get VM public IP
    publicIP := terraform.Output(t, terraformOptions, "vm_public_ip")

    // Test SSH connectivity
    maxRetries := 30
    timeBetweenRetries := 5 * time.Second

    retry.DoWithRetry(t, "SSH to VM", maxRetries, timeBetweenRetries, func() (string, error) {
        output, err := ssh.CheckSshConnection(t, ssh.Host{
            Hostname:    publicIP,
            SshUserName: "adminuser",
            SshKeyPair:  keyPair,
        })

        if err != nil {
            return "", err
        }

        return output, nil
    })
}
```

### Terratest in CI/CD

```yaml
name: Integration Tests

on:
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * *'  # Nightly

jobs:
  terratest:
    runs-on: ubuntu-latest
    timeout-minutes: 60

    steps:
      - uses: actions/checkout@v4

      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Azure Login
        uses: azure/login@v1
        with:
          client-id: ${{ secrets.AZURE_CLIENT_ID }}
          tenant-id: ${{ secrets.AZURE_TENANT_ID }}
          subscription-id: ${{ secrets.AZURE_SUBSCRIPTION_ID }}

      - name: Download Go modules
        working-directory: test
        run: go mod download

      - name: Run Terratest
        working-directory: test
        env:
          ARM_CLIENT_ID: ${{ secrets.AZURE_CLIENT_ID }}
          ARM_TENANT_ID: ${{ secrets.AZURE_TENANT_ID }}
          ARM_SUBSCRIPTION_ID: ${{ secrets.AZURE_SUBSCRIPTION_ID }}
        run: |
          go test -v -timeout 60m -parallel 4

      - name: Upload Test Logs
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-logs
          path: test/*.log
```

---

## Contract Testing

### Testing Module Interfaces

```hcl
# tests/module_contract.tftest.hcl

# Test required inputs
run "missing_required_input" {
  command = plan

  expect_failures = [
    var.name,
    var.location,
  ]
}

# Test input validation
run "invalid_location" {
  command = plan

  variables {
    location = "invalid"
  }

  expect_failures = [
    var.location,
  ]
}

# Test output contracts
run "verify_outputs" {
  command = apply

  assert {
    condition     = output.id != null && output.id != ""
    error_message = "Output 'id' must be provided"
  }

  assert {
    condition     = can(regex("^/subscriptions/", output.id))
    error_message = "Output 'id' must be a valid Azure resource ID"
  }
}
```

### Testing Variable Validation

```hcl
# variables.tf
variable "vm_size" {
  type        = string
  description = "Size of the virtual machine"

  validation {
    condition     = can(regex("^Standard_[A-Z][0-9]+", var.vm_size))
    error_message = "VM size must be a valid Azure VM size (e.g., Standard_D2s_v3)"
  }
}

variable "environment" {
  type        = string
  description = "Environment name"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod"
  }
}

# tests/validation.tftest.hcl
run "test_invalid_vm_size" {
  command = plan

  variables {
    vm_size = "invalid_size"
  }

  expect_failures = [
    var.vm_size,
  ]
}

run "test_invalid_environment" {
  command = plan

  variables {
    environment = "production"  # Should fail - must be "prod"
  }

  expect_failures = [
    var.environment,
  ]
}
```

---

## Compliance Testing

### Policy as Code Testing

```hcl
# tests/compliance.tftest.hcl

run "enforce_encryption" {
  command = plan

  assert {
    condition     = azurerm_storage_account.main.enable_https_traffic_only == true
    error_message = "COMPLIANCE: HTTPS must be enforced"
  }

  assert {
    condition     = azurerm_storage_account.main.min_tls_version == "TLS1_2"
    error_message = "COMPLIANCE: Minimum TLS 1.2 required"
  }
}

run "enforce_tagging" {
  command = plan

  assert {
    condition     = alltrue([
      for rg in values(azurerm_resource_group) :
        contains(keys(rg.tags), "CostCenter") &&
        contains(keys(rg.tags), "Owner")
    ])
    error_message = "COMPLIANCE: All resources must have CostCenter and Owner tags"
  }
}

run "enforce_naming_convention" {
  command = plan

  assert {
    condition     = can(regex("^(dev|stg|prd)-", azurerm_resource_group.main.name))
    error_message = "COMPLIANCE: Resource names must start with environment prefix"
  }
}

run "enforce_backup_policy" {
  command = plan

  variables {
    environment = "prod"
  }

  assert {
    condition     = var.environment != "prod" || var.enable_backup == true
    error_message = "COMPLIANCE: Backup must be enabled in production"
  }
}
```

### OPA/Rego Integration

```yaml
# .github/workflows/compliance-testing.yml
name: Compliance Testing

on: [push, pull_request]

jobs:
  opa-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
          sudo mv opa /usr/local/bin/

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Generate Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      - name: Test OPA Policies
        run: |
          opa test policies/ -v

      - name: Evaluate Terraform Plan
        run: |
          opa exec --decision terraform/deny \
            --bundle policies/ \
            --input tfplan.json \
            --format pretty
```

```rego
# policies/terraform.rego
package terraform

deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    not resource.values.enable_https_traffic_only

    msg := sprintf("Storage account %s must enforce HTTPS", [resource.name])
}

deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    not has_required_tags(resource.values.tags)

    msg := sprintf("Resource %s missing required tags", [resource.name])
}

has_required_tags(tags) {
    tags["Environment"]
    tags["Owner"]
    tags["CostCenter"]
}
```

---

## Property-Based Testing

### Hypothesis Testing

```hcl
# tests/property_based.tftest.hcl

run "storage_name_properties" {
  command = plan

  # Generate random valid storage names
  variables {
    storage_name = lower(replace(random_string.name.result, "/[^a-z0-9]/", ""))
  }

  # Property: Storage names must be lowercase alphanumeric
  assert {
    condition     = can(regex("^[a-z0-9]+$", var.storage_name))
    error_message = "Storage name must be lowercase alphanumeric"
  }

  # Property: Storage names must be 3-24 characters
  assert {
    condition     = length(var.storage_name) >= 3 && length(var.storage_name) <= 24
    error_message = "Storage name must be 3-24 characters"
  }
}

run "subnet_cidr_properties" {
  command = plan

  # Property: Subnet CIDR must be within VNet CIDR
  assert {
    condition     = alltrue([
      for subnet in var.subnets :
        cidrsubnet(var.vnet_cidr,
          parseint(split("/", subnet)[1], 10) - parseint(split("/", var.vnet_cidr)[1], 10),
          0
        ) == var.vnet_cidr
    ])
    error_message = "All subnets must be within VNet CIDR range"
  }
}
```

---

## Performance Testing

### Resource Creation Time Testing

```go
// test/performance_test.go
package test

import (
    "testing"
    "time"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestInfrastructureProvisioningTime(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../",
    }

    defer terraform.Destroy(t, terraformOptions)

    // Measure provisioning time
    start := time.Now()
    terraform.InitAndApply(t, terraformOptions)
    duration := time.Since(start)

    // Assert provisioning completes within acceptable time
    maxDuration := 10 * time.Minute
    assert.Less(t, duration, maxDuration,
        "Infrastructure provisioning took too long: %v", duration)

    t.Logf("Infrastructure provisioned in: %v", duration)
}

func BenchmarkTerraformPlan(b *testing.B) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../",
    }

    terraform.Init(b, terraformOptions)

    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        terraform.Plan(b, terraformOptions)
    }
}
```

---

## Test Organization and Best Practices

### Test Structure

```
terraform/
├── modules/
│   ├── storage/
│   │   ├── main.tf
│   │   ├── variables.tf
│   │   ├── outputs.tf
│   │   └── tests/
│   │       ├── unit.tftest.hcl
│   │       ├── integration.tftest.hcl
│   │       └── compliance.tftest.hcl
│   └── networking/
│       └── tests/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── test/              # Terratest
    ├── go.mod
    ├── go.sum
    ├── storage_test.go
    └── networking_test.go
```

### Comprehensive Test Suite

```yaml
name: Complete Test Suite

on:
  pull_request:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 0 * * 0'  # Weekly full test

jobs:
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Terraform fmt
        run: terraform fmt -check -recursive
      - name: Terraform validate
        run: |
          terraform init -backend=false
          terraform validate
      - name: TFLint
        uses: terraform-linters/setup-tflint@v4
      - run: tflint

  unit-tests:
    needs: static-analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - name: Run unit tests
        run: terraform test

  integration-tests:
    needs: unit-tests
    if: github.event_name == 'push' || github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
      - uses: hashicorp/setup-terraform@v3
      - name: Run Terratest
        working-directory: test
        run: go test -v -timeout 30m

  compliance-tests:
    needs: static-analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run compliance tests
        run: terraform test tests/compliance.tftest.hcl

  security-scan:
    needs: static-analysis
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
      - name: Checkov
        uses: bridgecrewio/checkov-action@v12

  e2e-tests:
    needs: [unit-tests, integration-tests]
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy full environment
        run: |
          terraform init
          terraform apply -auto-approve
      - name: Run E2E tests
        run: ./scripts/e2e-tests.sh
      - name: Cleanup
        if: always()
        run: terraform destroy -auto-approve
```

---

## Best Practices

### 1. Test Coverage

✅ **DO:**
- Test all critical paths
- Test edge cases and error conditions
- Test variable validation
- Test output contracts

❌ **DON'T:**
- Only test happy paths
- Skip error condition testing
- Ignore compliance requirements

### 2. Test Isolation

✅ **DO:**
- Use unique resource names
- Clean up resources after tests
- Use separate subscriptions/accounts for testing
- Run tests in parallel when possible

❌ **DON'T:**
- Reuse resource names
- Leave test resources running
- Run destructive tests in production

### 3. Test Maintenance

✅ **DO:**
- Keep tests simple and readable
- Update tests when code changes
- Document test scenarios
- Review test failures promptly

❌ **DON'T:**
- Write overly complex tests
- Ignore flaky tests
- Skip test documentation

---

## Hands-on Exercise

Create a comprehensive test suite for a Terraform module that includes:

1. Static analysis (fmt, validate, lint)
2. Unit tests with terraform test
3. Integration tests with Terratest
4. Compliance tests
5. Security scanning
6. CI/CD integration

---

## Additional Resources

- [Terraform Testing Documentation](https://developer.hashicorp.com/terraform/language/tests)
- [Terratest](https://terratest.gruntwork.io/)
- [OPA/Rego](https://www.openpolicyagent.org/)
- [TFLint](https://github.com/terraform-linters/tflint)
- [Testing Terraform Book](https://www.terraformbook.com/)

---

## Summary

You've now learned:
- Complete testing strategies for Terraform
- Static analysis and linting
- Unit testing with terraform test
- Integration testing with Terratest
- Compliance and security testing
- CI/CD integration for automated testing

This completes the CI/CD module! Next, explore the **Security** module for DevSecOps practices.

Continue to [../08-security/01-terraform-security.md](../08-security/01-terraform-security.md)
