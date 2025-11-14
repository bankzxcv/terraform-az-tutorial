# Security Scanning Pipeline Example

This example demonstrates automated security scanning in CI/CD pipelines with multiple tools.

## What This Example Includes

- tfsec static security analysis
- Checkov policy enforcement
- Terrascan vulnerability scanning
- Trivy configuration scanning
- SARIF output for GitHub Security tab

## Security Tools

| Tool | Purpose | Focus Area |
|------|---------|-----------|
| **tfsec** | Static analysis | Quick security checks |
| **Checkov** | Policy as Code | Compliance enforcement |
| **Terrascan** | Vulnerability scanning | OPA policies |
| **Trivy** | Misconfigurations | Multi-scanner |

## Pipeline Flow

```
┌─────────────────┐
│   Code Commit   │
└────────┬────────┘
         │
         ▼
    ┌────────────────────────────────┐
    │  Run Security Scans in Parallel│
    └────────┬───────────────────────┘
             │
    ┌────────┼────────┬──────────┐
    │        │        │          │
    ▼        ▼        ▼          ▼
┌───────┐┌────────┐┌──────────┐┌────────┐
│tfsec  ││Checkov ││Terrascan ││ Trivy  │
└───┬───┘└───┬────┘└────┬─────┘└───┬────┘
    │        │          │          │
    └────────┴──────────┴──────────┘
             │
             ▼
    ┌────────────────┐
    │ Security Gate  │
    └────────────────┘
```

## GitHub Workflow

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  tfsec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aquasecurity/tfsec-action@v1.0.0
        with:
          format: sarif
          sarif_file: tfsec.sarif
      - uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: tfsec.sarif

  checkov:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: bridgecrewio/checkov-action@v12
        with:
          framework: terraform
          output_format: sarif
```

## Local Testing

```bash
# Install tools
brew install tfsec
pip install checkov

# Run tfsec
tfsec .

# Run Checkov
checkov -d .

# Run Terrascan
terrascan scan -t terraform

# Run with Docker
docker run --rm -v $(pwd):/src aquasec/tfsec:latest /src
docker run --rm -v $(pwd):/tf bridgecrew/checkov -d /tf
```

## Configuration Files

### tfsec Config (.tfsec/config.yml)

```yaml
minimum_severity: MEDIUM

exclude:
  - azure-storage-default-action-deny  # Excluded for development

severity_overrides:
  CUS001: ERROR
```

### Checkov Config (.checkov.yml)

```yaml
framework: terraform

skip-check:
  - CKV_DOCKER_2
  - CKV_DOCKER_3

output: sarif
```

## Suppressing Checks

```hcl
# tfsec suppression
resource "azurerm_storage_account" "example" {
  #tfsec:ignore:azure-storage-default-action-deny
  name = "example"
  # ... configuration
}

# Checkov suppression
resource "azurerm_sql_server" "example" {
  #checkov:skip=CKV_AZURE_23:Legacy requirement
  name = "example-sql"
  # ... configuration
}
```

## Security Reports

Results are uploaded to:
- GitHub Security tab (SARIF format)
- Workflow artifacts
- PR comments (optional)

## Best Practices

1. **Run on every commit** - Catch issues early
2. **Fail on critical issues** - Set `soft_fail: false`
3. **Review suppressions** - Justify all ignored checks
4. **Keep tools updated** - Use latest versions
5. **Layer scanning tools** - Use multiple tools for coverage

## Example Terraform with Security

```hcl
resource "azurerm_storage_account" "secure" {
  name                = "securestorage"
  resource_group_name = azurerm_resource_group.main.name
  location            = "eastus"
  account_tier        = "Standard"
  account_replication_type = "GRS"

  # Security settings (passes all scans)
  enable_https_traffic_only       = true
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false

  network_rules {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
}
```

## Troubleshooting

### Issue: Too many violations

**Solution:** Start with high/critical severity only:

```bash
tfsec . --minimum-severity HIGH
checkov -d . --compact --quiet
```

### Issue: False positives

**Solution:** Suppress with justification:

```hcl
#tfsec:ignore:rule-id:exp:2024-12-31 Temporary exception until migration
```

## Next Steps

- Implement compliance policies (OPA/Sentinel)
- Add custom security rules
- Integrate with SIEM/SOAR
- Set up automated remediation

## Resources

- [tfsec Documentation](https://aquasecurity.github.io/tfsec/)
- [Checkov Docs](https://www.checkov.io/)
- [Terrascan](https://runterrascan.io/)
- [Trivy](https://aquasecurity.github.io/trivy/)
