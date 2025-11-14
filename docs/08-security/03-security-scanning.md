# Security Scanning for Terraform

## Learning Objectives

- Master tfsec for automated security scanning
- Implement Checkov for policy enforcement
- Create custom security policies
- Integrate security scanning into CI/CD
- Automate compliance checking

**Estimated Time:** 60 minutes

---

## Overview of Security Scanning Tools

| Tool | Purpose | Language | Best For |
|------|---------|----------|----------|
| tfsec | Static analysis | Go | Quick security checks |
| Checkov | Policy as Code | Python | Compliance enforcement |
| Terrascan | Policy scanning | Go | OPA policies |
| Sentinel | Enterprise policies | Sentinel | Terraform Cloud |

---

## tfsec - Security Scanner

### Installation and Basic Usage

```bash
# Install tfsec
# macOS
brew install tfsec

# Linux
curl -s https://raw.githubusercontent.com/aquasecurity/tfsec/master/scripts/install_linux.sh | bash

# Windows
choco install tfsec

# Run scan
tfsec .

# Scan with severity filter
tfsec . --minimum-severity HIGH

# Output formats
tfsec . --format json > tfsec-results.json
tfsec . --format junit > tfsec-results.xml
tfsec . --format sarif > tfsec-results.sarif
```

### Common tfsec Checks

```hcl
# ❌ Fails tfsec checks
resource "azurerm_storage_account" "bad" {
  name                     = "mystorageaccount"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # tfsec:AZU003 - HTTPS should be enforced
  enable_https_traffic_only = false
  
  # tfsec:AZU009 - Minimum TLS version
  min_tls_version = "TLS1_0"
}

# ✅ Passes tfsec checks
resource "azurerm_storage_account" "good" {
  name                     = "mystorageaccount"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "GRS"
  
  enable_https_traffic_only       = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  
  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
}
```

### Ignoring Specific Checks

```hcl
# Ignore specific check with comment
resource "azurerm_storage_account" "example" {
  #tfsec:ignore:azure-storage-default-action-deny
  name                     = "example"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "LRS"
  
  # Justification required
  network_rules {
    default_action = "Allow"  # Required for legacy systems
  }
}

# Ignore with expiration
resource "azurerm_sql_firewall_rule" "temp" {
  #tfsec:ignore:azure-database-no-public-access:exp:2024-12-31
  name                = "temp-access"
  resource_group_name = azurerm_resource_group.main.name
  server_name         = azurerm_sql_server.main.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}
```

### Custom tfsec Checks

```json
// .tfsec/custom_checks.json
{
  "checks": [
    {
      "code": "CUS001",
      "description": "Resource groups must have required tags",
      "impact": "Resources may not be properly tracked",
      "resolution": "Add required tags: Environment, Owner, CostCenter",
      "requiredTypes": ["resource"],
      "requiredLabels": ["azurerm_resource_group"],
      "severity": "ERROR",
      "matchSpec": {
        "name": "tags",
        "action": "requiresPresence"
      },
      "requiredValue": {
        "Environment": "*",
        "Owner": "*",
        "CostCenter": "*"
      }
    }
  ]
}
```

---

## Checkov - Policy as Code

### Installation and Usage

```bash
# Install Checkov
pip install checkov

# Run scan
checkov -d .

# Scan specific framework
checkov -d . --framework terraform

# Skip specific checks
checkov -d . --skip-check CKV_AZURE_1,CKV_AZURE_2

# Output formats
checkov -d . -o json > checkov-results.json
checkov -d . -o junitxml > checkov-results.xml
checkov -d . -o sarif > checkov-results.sarif
```

### Common Checkov Policies

```hcl
# Checkov policies for Azure

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-cluster"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "myaks"

  # CKV_AZURE_4: Enable RBAC
  role_based_access_control_enabled = true

  # CKV_AZURE_5: Enable Azure Policy
  azure_policy_enabled = true

  # CKV_AZURE_6: Enable private cluster
  private_cluster_enabled = true

  # CKV_AZURE_7: Enable network policy
  network_profile {
    network_plugin = "azure"
    network_policy = "calico"
  }

  # CKV_AZURE_8: Enable logging
  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id
  }

  # CKV_AZURE_117: Enable disk encryption
  disk_encryption_set_id = azurerm_disk_encryption_set.main.id

  default_node_pool {
    name       = "default"
    node_count = 3
    vm_size    = "Standard_D2_v2"

    # CKV_AZURE_168: Enable auto-scaling
    enable_auto_scaling = true
    min_count           = 1
    max_count           = 10
  }

  identity {
    type = "SystemAssigned"
  }
}
```

### Custom Checkov Policies

```python
# .checkov/custom_policies/require_tags.py
from checkov.common.models.enums import CheckResult, CheckCategories
from checkov.terraform.checks.resource.base_resource_check import BaseResourceCheck

class RequireResourceTags(BaseResourceCheck):
    def __init__(self):
        name = "Ensure all resources have required tags"
        id = "CUS_AZURE_1"
        supported_resources = ['azurerm_*']
        categories = [CheckCategories.CONVENTION]
        super().__init__(name=name, id=id, categories=categories, 
                        supported_resources=supported_resources)

    def scan_resource_conf(self, conf):
        required_tags = ['Environment', 'Owner', 'CostCenter', 'Project']
        
        if 'tags' in conf:
            tags = conf['tags'][0]
            missing_tags = [tag for tag in required_tags if tag not in tags]
            
            if not missing_tags:
                return CheckResult.PASSED
            else:
                self.details = f"Missing required tags: {', '.join(missing_tags)}"
                return CheckResult.FAILED
        
        self.details = "No tags defined"
        return CheckResult.FAILED

check = RequireResourceTags()
```

### Suppressing Checkov Checks

```hcl
# Suppress specific check
resource "azurerm_storage_account" "example" {
  #checkov:skip=CKV_AZURE_33:Justification here
  name                     = "example"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = "eastus"
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

# Suppress multiple checks
resource "azurerm_sql_server" "example" {
  #checkov:skip=CKV_AZURE_23:Legacy system requirement
  #checkov:skip=CKV_AZURE_24:Planned for next quarter
  name                         = "example-sql"
  resource_group_name          = azurerm_resource_group.main.name
  location                     = "eastus"
  version                      = "12.0"
  administrator_login          = "sqladmin"
  administrator_login_password = random_password.sql.result
}
```

---

## Terrascan

### Usage

```bash
# Install Terrascan
brew install terrascan

# Scan Terraform
terrascan scan -t terraform

# Scan with specific policies
terrascan scan -t terraform -p AWS

# Output formats
terrascan scan -o json > terrascan-results.json
terrascan scan -o sarif > terrascan-results.sarif

# Scan remote repository
terrascan scan -t terraform -r git -u https://github.com/org/repo
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Security Scanning

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  tfsec:
    name: tfsec Security Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run tfsec
        uses: aquasecurity/tfsec-action@v1.0.0
        with:
          soft_fail: false
          format: sarif
          additional_args: --minimum-severity HIGH

      - name: Upload SARIF file
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: tfsec.sarif

  checkov:
    name: Checkov Policy Scan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Checkov
        uses: bridgecrewio/checkov-action@v12
        with:
          directory: .
          framework: terraform
          output_format: sarif
          output_file_path: checkov.sarif
          soft_fail: false

      - name: Upload SARIF file
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: checkov.sarif

  terrascan:
    name: Terrascan
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run Terrascan
        uses: tenable/terrascan-action@v1.4.0
        with:
          iac_type: 'terraform'
          iac_version: 'v14'
          policy_type: 'all'
          sarif_upload: true

      - name: Upload SARIF file
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: terrascan.sarif

  security-gate:
    name: Security Gate
    needs: [tfsec, checkov, terrascan]
    runs-on: ubuntu-latest

    steps:
      - name: Check scan results
        run: echo "All security scans passed!"
```

### Complete Security Pipeline

```yaml
name: Complete Security Pipeline

on: [push, pull_request]

jobs:
  security-scan:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Terraform Format
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate

      - name: tfsec Scan
        run: |
          docker run --rm -v $(pwd):/src aquasec/tfsec:latest /src \
            --format json \
            --out tfsec-results.json

      - name: Checkov Scan
        run: |
          docker run --rm -v $(pwd):/tf bridgecrew/checkov:latest \
            -d /tf \
            --framework terraform \
            -o json > checkov-results.json

      - name: Parse Results
        run: |
          echo "## Security Scan Results" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          
          # tfsec results
          tfsec_critical=$(jq '[.results[] | select(.severity=="CRITICAL")] | length' tfsec-results.json)
          tfsec_high=$(jq '[.results[] | select(.severity=="HIGH")] | length' tfsec-results.json)
          
          echo "### tfsec" >> $GITHUB_STEP_SUMMARY
          echo "- Critical: $tfsec_critical" >> $GITHUB_STEP_SUMMARY
          echo "- High: $tfsec_high" >> $GITHUB_STEP_SUMMARY
          
          # Fail if critical issues found
          if [ $tfsec_critical -gt 0 ]; then
            echo "❌ Critical security issues found!"
            exit 1
          fi

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: security-scan-results
          path: |
            tfsec-results.json
            checkov-results.json
```

---

## Best Practices

✅ **DO:**
- Run security scans on every commit
- Fail builds on critical/high severity issues
- Review and justify suppressions
- Keep scanning tools updated
- Use multiple scanning tools
- Integrate with security dashboards

❌ **DON'T:**
- Skip security scans in CI/CD
- Suppress warnings without justification
- Ignore low-severity issues indefinitely
- Use outdated scanning tools

---

## Hands-on Exercise

Create a complete security scanning setup:
1. Configure tfsec with custom checks
2. Set up Checkov with custom policies
3. Create GitHub Actions workflow
4. Implement security gates
5. Generate security reports

---

## Additional Resources

- [tfsec Documentation](https://aquasecurity.github.io/tfsec/)
- [Checkov Documentation](https://www.checkov.io/)
- [Terrascan](https://runterrascan.io/)
- [Security Scanning Best Practices](https://www.hashicorp.com/blog/securing-infrastructure-as-code)

---

Continue to [04-compliance-as-code.md](./04-compliance-as-code.md)
