# Compliance as Code with Terraform

## Learning Objectives

- Implement Policy as Code frameworks
- Use OPA/Rego for compliance policies
- Configure Sentinel for Terraform Cloud
- Automate compliance reporting
- Implement regulatory compliance (SOC2, HIPAA, PCI-DSS)

**Estimated Time:** 60-75 minutes

---

## Policy as Code Overview

Policy as Code treats compliance policies as code:
- Version controlled
- Tested and validated
- Automated enforcement
- Auditable changes

---

## Open Policy Agent (OPA)

### Installation

```bash
# Install OPA
brew install opa

# Or download binary
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
chmod +x opa
sudo mv opa /usr/local/bin/
```

### Basic Rego Policy

```rego
# policy/terraform.rego
package terraform.analysis

import future.keywords.contains
import future.keywords.if

# Deny if resource group doesn't have required tags
deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_resource_group"
    required_tags := ["Environment", "Owner", "CostCenter"]
    missing_tags := [tag | tag := required_tags[_]; not resource.values.tags[tag]]
    count(missing_tags) > 0

    msg := sprintf("Resource group '%s' missing required tags: %v", 
        [resource.name, missing_tags])
}

# Deny public storage accounts
deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    not resource.values.allow_nested_items_to_be_public == false

    msg := sprintf("Storage account '%s' allows public access", [resource.name])
}

# Enforce HTTPS
deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    not resource.values.enable_https_traffic_only == true

    msg := sprintf("Storage account '%s' does not enforce HTTPS", [resource.name])
}

# Enforce minimum TLS version
deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    resource.values.min_tls_version != "TLS1_2"

    msg := sprintf("Storage account '%s' does not use TLS 1.2", [resource.name])
}

# Deny databases without encryption
deny[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_mssql_database"
    not has_transparent_data_encryption(resource)

    msg := sprintf("Database '%s' does not have encryption enabled", [resource.name])
}

has_transparent_data_encryption(resource) if {
    encryption := input.configuration.root_module.resources[_]
    encryption.type == "azurerm_mssql_server_transparent_data_encryption"
    encryption.expressions.server_id.references[0] == sprintf("azurerm_mssql_server.%s", [resource.name])
}
```

### Testing OPA Policies

```bash
# Generate Terraform plan
terraform plan -out=tfplan
terraform show -json tfplan > tfplan.json

# Test policy
opa eval -i tfplan.json -d policy/terraform.rego "data.terraform.analysis.deny"

# Run policy as decision
opa exec --decision terraform/deny --bundle policy/ tfplan.json
```

### Advanced OPA Policies

```rego
# policy/advanced.rego
package terraform.rules

# Helper functions
is_create_or_update(action) if {
    action == "create"
}

is_create_or_update(action) if {
    action == "update"
}

# Check network security groups
deny_open_security_groups[msg] {
    resource := input.resource_changes[_]
    resource.type == "azurerm_network_security_rule"
    is_create_or_update(resource.change.actions[_])
    
    resource.change.after.source_address_prefix == "*"
    resource.change.after.access == "Allow"
    resource.change.after.direction == "Inbound"
    
    dangerous_ports := [22, 3389, 1433, 3306, 5432]
    to_number(resource.change.after.destination_port_range) == dangerous_ports[_]

    msg := sprintf("Security rule '%s' allows inbound access from internet on port %s",
        [resource.name, resource.change.after.destination_port_range])
}

# Enforce encryption at rest
deny_unencrypted_disks[msg] {
    resource := input.resource_changes[_]
    resource.type == "azurerm_managed_disk"
    is_create_or_update(resource.change.actions[_])
    
    not resource.change.after.encryption_settings

    msg := sprintf("Managed disk '%s' does not have encryption enabled", [resource.name])
}

# Cost management - prevent expensive VMs in non-prod
deny_expensive_nonprod_vms[msg] {
    resource := input.resource_changes[_]
    resource.type == "azurerm_linux_virtual_machine"
    is_create_or_update(resource.change.actions[_])
    
    # Extract environment from tags
    environment := resource.change.after.tags.Environment
    environment != "prod"
    
    # Expensive VM sizes
    expensive_sizes := ["Standard_E", "Standard_M", "Standard_L"]
    startswith(resource.change.after.size, expensive_sizes[_])

    msg := sprintf("VM '%s' uses expensive size '%s' in non-production environment",
        [resource.name, resource.change.after.size])
}
```

---

## Sentinel (Terraform Cloud/Enterprise)

### Sentinel Policy

```sentinel
# policy/require-tags.sentinel
import "tfplan/v2" as tfplan

# Required tags
required_tags = ["Environment", "Owner", "CostCenter", "Application"]

# Get all Azure resources
azure_resources = filter tfplan.resource_changes as _, rc {
    rc.provider_name matches "registry.terraform.io/hashicorp/azurerm" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Validate tags
validate_tags = rule {
    all azure_resources as _, resource {
        all required_tags as tag {
            resource.change.after.tags contains tag
        }
    }
}

# Main rule
main = rule {
    validate_tags
}
```

### Advanced Sentinel Policies

```sentinel
# policy/restrict-regions.sentinel
import "tfplan/v2" as tfplan

# Allowed Azure regions
allowed_regions = [
    "eastus",
    "eastus2",
    "westus",
    "westus2",
]

# Get all resources with location
resources_with_location = filter tfplan.resource_changes as _, rc {
    rc.provider_name matches "registry.terraform.io/hashicorp/azurerm" and
    rc.mode is "managed" and
    (rc.change.actions contains "create" or rc.change.actions contains "update") and
    rc.change.after.location else null is not null
}

# Validate regions
validate_regions = rule {
    all resources_with_location as _, resource {
        resource.change.after.location in allowed_regions
    }
}

main = rule {
    validate_regions
}
```

```sentinel
# policy/enforce-encryption.sentinel
import "tfplan/v2" as tfplan

# Storage accounts must enforce HTTPS
storage_accounts = filter tfplan.resource_changes as _, rc {
    rc.type is "azurerm_storage_account" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

enforce_https = rule {
    all storage_accounts as _, sa {
        sa.change.after.enable_https_traffic_only is true and
        sa.change.after.min_tls_version is "TLS1_2"
    }
}

# Databases must have encryption
sql_databases = filter tfplan.resource_changes as _, rc {
    rc.type is "azurerm_mssql_database" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

# Check for TDE resource
tde_resources = filter tfplan.resource_changes as _, rc {
    rc.type is "azurerm_mssql_server_transparent_data_encryption" and
    (rc.change.actions contains "create" or rc.change.actions contains "update")
}

enforce_database_encryption = rule {
    length(sql_databases) is 0 or length(tde_resources) > 0
}

main = rule {
    enforce_https and enforce_database_encryption
}
```

---

## Compliance Frameworks

### SOC 2 Compliance

```rego
# policy/soc2.rego
package compliance.soc2

# CC6.1 - Logical and Physical Access Controls
deny_public_access[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    resource.values.allow_nested_items_to_be_public == true

    msg := sprintf("SOC2-CC6.1: Storage account '%s' allows public access", [resource.name])
}

# CC6.6 - Encryption
deny_no_encryption[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    not resource.values.enable_https_traffic_only

    msg := sprintf("SOC2-CC6.6: Storage account '%s' does not enforce HTTPS", [resource.name])
}

# CC7.2 - System Monitoring
deny_no_monitoring[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_virtual_machine"
    not has_monitoring_agent(resource.name)

    msg := sprintf("SOC2-CC7.2: VM '%s' does not have monitoring enabled", [resource.name])
}

has_monitoring_agent(vm_name) {
    extension := input.planned_values.root_module.resources[_]
    extension.type == "azurerm_virtual_machine_extension"
    contains(extension.values.virtual_machine_name, vm_name)
    extension.values.publisher == "Microsoft.EnterpriseCloud.Monitoring"
}
```

### HIPAA Compliance

```rego
# policy/hipaa.rego
package compliance.hipaa

# 164.312(a)(2)(iv) - Encryption
deny_unencrypted_data[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    not resource.values.infrastructure_encryption_enabled

    msg := sprintf("HIPAA-164.312: Storage account '%s' does not have infrastructure encryption", 
        [resource.name])
}

# 164.312(b) - Audit Controls
deny_no_audit_logging[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    not has_diagnostic_settings(resource.name)

    msg := sprintf("HIPAA-164.312(b): Storage account '%s' does not have audit logging", 
        [resource.name])
}

# 164.308(a)(4)(i) - Access Controls
deny_no_access_restrictions[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    resource.values.network_rules[0].default_action != "Deny"

    msg := sprintf("HIPAA-164.308: Storage account '%s' does not restrict network access", 
        [resource.name])
}
```

### PCI-DSS Compliance

```rego
# policy/pci_dss.rego
package compliance.pci_dss

# Requirement 2.2 - Configuration Standards
deny_default_passwords[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_linux_virtual_machine"
    resource.values.disable_password_authentication == false

    msg := sprintf("PCI-DSS-2.2: VM '%s' allows password authentication", [resource.name])
}

# Requirement 4.1 - Encryption in Transit
deny_unencrypted_traffic[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_storage_account"
    resource.values.min_tls_version != "TLS1_2"

    msg := sprintf("PCI-DSS-4.1: Storage account '%s' allows TLS < 1.2", [resource.name])
}

# Requirement 10.1 - Audit Trails
deny_no_audit_logs[msg] {
    resource := input.planned_values.root_module.resources[_]
    resource.type == "azurerm_kubernetes_cluster"
    not has_log_analytics(resource)

    msg := sprintf("PCI-DSS-10.1: AKS cluster '%s' does not have audit logging", [resource.name])
}
```

---

## CI/CD Integration

### GitHub Actions with OPA

```yaml
name: Compliance Check

on: [push, pull_request]

jobs:
  compliance:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3

      - name: Setup OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64
          chmod +x opa
          sudo mv opa /usr/local/bin/

      - name: Terraform Plan
        run: |
          terraform init
          terraform plan -out=tfplan
          terraform show -json tfplan > tfplan.json

      - name: Run OPA Policies
        run: |
          opa eval -i tfplan.json -d policy/ \
            "data.terraform.analysis.deny" \
            --format pretty

      - name: Check SOC2 Compliance
        run: |
          violations=$(opa eval -i tfplan.json -d policy/soc2.rego \
            "data.compliance.soc2.deny_public_access" \
            --format raw)
          
          if [ ! -z "$violations" ]; then
            echo "SOC2 compliance violations found:"
            echo "$violations"
            exit 1
          fi

      - name: Generate Compliance Report
        run: |
          echo "# Compliance Report" > compliance-report.md
          echo "" >> compliance-report.md
          
          # SOC2
          echo "## SOC 2" >> compliance-report.md
          opa eval -i tfplan.json -d policy/soc2.rego \
            "data.compliance.soc2" >> compliance-report.md
          
          # HIPAA
          echo "## HIPAA" >> compliance-report.md
          opa eval -i tfplan.json -d policy/hipaa.rego \
            "data.compliance.hipaa" >> compliance-report.md

      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: compliance-report
          path: compliance-report.md
```

---

## Best Practices

✅ **DO:**
- Version control all policies
- Test policies before enforcement
- Document policy requirements
- Regular policy reviews
- Automate compliance reporting
- Layer multiple compliance frameworks

❌ **DON'T:**
- Hardcode policy exceptions
- Skip policy testing
- Ignore policy violations
- Make policies too restrictive initially

---

## Hands-on Exercise

Create a comprehensive compliance framework:
1. Write OPA policies for SOC2
2. Create Sentinel policies (if using TFC)
3. Implement automated compliance checking
4. Generate compliance reports
5. Set up policy testing

---

## Resources

- [OPA Documentation](https://www.openpolicyagent.org/docs/)
- [Sentinel Documentation](https://docs.hashicorp.com/sentinel)
- [SOC 2 Compliance](https://www.aicpa.org/soc)
- [HIPAA Compliance](https://www.hhs.gov/hipaa)
- [PCI-DSS Requirements](https://www.pcisecuritystandards.org/)

---

Continue to [05-state-security.md](./05-state-security.md)
