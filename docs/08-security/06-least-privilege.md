# Least Privilege and IAM Best Practices

## Learning Objectives

- Implement least privilege access controls
- Design secure IAM policies
- Manage service principals and identities
- Implement RBAC best practices
- Audit and monitor access

**Estimated Time:** 45-60 minutes

---

## Principle of Least Privilege

Grant only the minimum permissions required for a task.

###Benefits:
- Reduced attack surface
- Limited blast radius
- Better compliance
- Easier auditing

---

## Azure RBAC

### Custom Roles for Terraform

```hcl
# Minimal role for Terraform deployment
resource "azurerm_role_definition" "terraform_deployer" {
  name        = "Terraform Deployer"
  scope       = data.azurerm_subscription.current.id
  description = "Minimal permissions for Terraform deployments"

  permissions {
    actions = [
      # Read operations
      "Microsoft.Resources/subscriptions/resourceGroups/read",
      "Microsoft.Network/virtualNetworks/read",
      "Microsoft.Network/virtualNetworks/subnets/read",
      
      # Write operations - only what's needed
      "Microsoft.Resources/subscriptions/resourceGroups/write",
      "Microsoft.Network/virtualNetworks/write",
      "Microsoft.Network/networkSecurityGroups/write",
      "Microsoft.Compute/virtualMachines/write",
      "Microsoft.Storage/storageAccounts/write",
      
      # No delete permissions in this example
    ]

    not_actions = [
      # Explicitly deny dangerous operations
      "Microsoft.Authorization/*/delete",
      "Microsoft.Authorization/policyAssignments/delete",
      "Microsoft.Authorization/locks/delete",
    ]

    data_actions = []
    not_data_actions = []
  }

  assignable_scopes = [
    data.azurerm_subscription.current.id
  ]
}
```

### Managed Identities

```hcl
# Use System-Assigned Managed Identity
resource "azurerm_linux_virtual_machine" "main" {
  name                = "example-vm"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  size                = "Standard_B2s"

  # Enable managed identity
  identity {
    type = "SystemAssigned"
  }

  # ... other config
}

# Grant minimal permissions to managed identity
resource "azurerm_role_assignment" "vm_reader" {
  scope                = azurerm_storage_account.main.id
  role_definition_name = "Storage Blob Data Reader"
  principal_id         = azurerm_linux_virtual_machine.main.identity[0].principal_id
}

# User-Assigned Managed Identity for shared access
resource "azurerm_user_assigned_identity" "app" {
  name                = "app-identity"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
}

resource "azurerm_role_assignment" "app_identity" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.app.principal_id
}
```

---

## AWS IAM

### Least Privilege IAM Policy

```hcl
# Terraform deployment policy
resource "aws_iam_policy" "terraform_deploy" {
  name        = "TerraformDeployPolicy"
  description = "Minimal permissions for Terraform"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowSpecificResources"
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeImages",
          "ec2:DescribeKeyPairs",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs",
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowEC2Creation"
        Effect = "Allow"
        Action = [
          "ec2:RunInstances",
          "ec2:TerminateInstances",
          "ec2:CreateTags",
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "aws:RequestedRegion" = ["us-east-1", "us-west-2"]
          }
          StringLike = {
            "ec2:InstanceType" = ["t3.*", "t2.*"]
          }
        }
      },
      {
        Sid    = "DenyDangerousActions"
        Effect = "Deny"
        Action = [
          "iam:CreateUser",
          "iam:DeleteUser",
          "iam:PutUserPolicy",
          "ec2:*ReservedInstances*",
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM role for EC2 instance
resource "aws_iam_role" "app_role" {
  name = "app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
}

# Attach minimal policy
resource "aws_iam_role_policy" "app_policy" {
  role = aws_iam_role.app_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:ListBucket",
      ]
      Resource = [
        aws_s3_bucket.app_data.arn,
        "${aws_s3_bucket.app_data.arn}/*"
      ]
    }]
  })
}
```

### Instance Profile

```hcl
resource "aws_iam_instance_profile" "app" {
  name = "app-profile"
  role = aws_iam_role.app_role.name
}

resource "aws_instance" "app" {
  ami                  = "ami-12345678"
  instance_type        = "t3.micro"
  iam_instance_profile = aws_iam_instance_profile.app.name

  # ... other config
}
```

---

## GCP IAM

### Custom IAM Roles

```hcl
# Custom role with minimal permissions
resource "google_project_iam_custom_role" "terraform_deployer" {
  role_id     = "terraformDeployer"
  title       = "Terraform Deployer"
  description = "Minimal permissions for Terraform deployment"
  project     = var.project_id

  permissions = [
    "compute.instances.create",
    "compute.instances.delete",
    "compute.instances.get",
    "compute.instances.list",
    "compute.networks.create",
    "compute.networks.delete",
    "compute.networks.get",
    "compute.subnetworks.create",
    "compute.subnetworks.delete",
    "compute.subnetworks.get",
  ]
}

# Service account for Terraform
resource "google_service_account" "terraform" {
  account_id   = "terraform-sa"
  display_name = "Terraform Service Account"
  project      = var.project_id
}

# Bind custom role
resource "google_project_iam_member" "terraform" {
  project = var.project_id
  role    = google_project_iam_custom_role.terraform_deployer.id
  member  = "serviceAccount:${google_service_account.terraform.email}"
}

# Workload Identity for GKE
resource "google_service_account" "gke_workload" {
  account_id   = "gke-workload"
  display_name = "GKE Workload Identity"
  project      = var.project_id
}

resource "google_service_account_iam_member" "gke_workload_identity" {
  service_account_id = google_service_account.gke_workload.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[default/app-sa]"
}
```

---

## CI/CD Service Principals

### Azure Service Principal (OIDC - Recommended)

```bash
# Create Azure AD App
az ad app create --display-name "GitHub Actions OIDC"

# Create Service Principal
az ad sp create --id <app-id>

# Create Federated Credential
az ad app federated-credential create \
  --id <app-id> \
  --parameters '{
    "name": "github-actions",
    "issuer": "https://token.actions.githubusercontent.com",
    "subject": "repo:organization/repository:ref:refs/heads/main",
    "description": "GitHub Actions OIDC",
    "audiences": ["api://AzureADTokenExchange"]
  }'

# Assign minimal role
az role assignment create \
  --assignee <app-id> \
  --role "Contributor" \
  --scope /subscriptions/<subscription-id>/resourceGroups/my-rg
```

### AWS IAM Role for GitHub Actions (OIDC)

```hcl
# OIDC Provider for GitHub
resource "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]

  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1"
  ]
}

# IAM Role for GitHub Actions
resource "aws_iam_role" "github_actions" {
  name = "github-actions-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.github.arn
      }
      Action = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:org/repo:*"
        }
      }
    }]
  })
}

# Attach minimal policy
resource "aws_iam_role_policy_attachment" "github_actions" {
  role       = aws_iam_role.github_actions.name
  policy_arn = aws_iam_policy.terraform_deploy.arn
}
```

---

## Conditional Access

### Azure Conditional Access

```hcl
# Require MFA for privileged operations
resource "azurerm_role_assignment" "admin_with_mfa" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Owner"
  principal_id         = data.azurerm_client_config.current.object_id

  condition         = "true"
  condition_version = "2.0"

  # Conditions defined in Azure AD Conditional Access policies
}
```

### AWS IAM Conditions

```hcl
# Require MFA for sensitive operations
resource "aws_iam_policy" "require_mfa" {
  name = "RequireMFAPolicy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowWithMFA"
        Effect = "Allow"
        Action = "*"
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "true"
          }
        }
      },
      {
        Sid    = "DenyWithoutMFA"
        Effect = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ListUsers",
          "iam:ListVirtualMFADevices",
          "iam:ResyncMFADevice",
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}
```

---

## Audit and Monitoring

### Azure Activity Logs

```hcl
# Log Analytics Workspace
resource "azurerm_log_analytics_workspace" "main" {
  name                = "security-logs"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 90
}

# Diagnostic settings for subscription
resource "azurerm_monitor_diagnostic_setting" "subscription" {
  name                       = "subscription-diagnostics"
  target_resource_id         = data.azurerm_subscription.current.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  enabled_log {
    category = "Administrative"
  }

  enabled_log {
    category = "Security"
  }

  enabled_log {
    category = "Policy"
  }
}

# Alert on role assignment changes
resource "azurerm_monitor_activity_log_alert" "role_assignment" {
  name                = "role-assignment-alert"
  resource_group_name = azurerm_resource_group.main.name
  scopes              = [data.azurerm_subscription.current.id]

  criteria {
    category       = "Administrative"
    operation_name = "Microsoft.Authorization/roleAssignments/write"
  }

  action {
    action_group_id = azurerm_monitor_action_group.security.id
  }
}
```

### AWS CloudTrail

```hcl
# S3 bucket for CloudTrail logs
resource "aws_s3_bucket" "cloudtrail" {
  bucket = "cloudtrail-logs-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_public_access_block" "cloudtrail" {
  bucket = aws_s3_bucket.cloudtrail.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudTrail
resource "aws_cloudtrail" "main" {
  name                          = "main-trail"
  s3_bucket_name                = aws_s3_bucket.cloudtrail.id
  include_global_service_events = true
  is_multi_region_trail         = true
  enable_log_file_validation    = true

  event_selector {
    read_write_type           = "All"
    include_management_events = true

    data_resource {
      type   = "AWS::S3::Object"
      values = ["arn:aws:s3:::*/"]
    }
  }

  insight_selector {
    insight_type = "ApiCallRateInsight"
  }
}

# CloudWatch Log Group for CloudTrail
resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/cloudtrail/main"
  retention_in_days = 90
}

# EventBridge rule for IAM changes
resource "aws_cloudwatch_event_rule" "iam_changes" {
  name        = "iam-changes"
  description = "Detect IAM policy changes"

  event_pattern = jsonencode({
    source      = ["aws.iam"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = [
        "PutUserPolicy",
        "PutRolePolicy",
        "PutGroupPolicy",
        "CreatePolicy",
        "DeletePolicy",
        "AttachUserPolicy",
        "DetachUserPolicy",
        "AttachRolePolicy",
        "DetachRolePolicy"
      ]
    }
  })
}
```

---

## Best Practices

✅ **DO:**
- Use managed identities/instance profiles
- Create custom roles with minimal permissions
- Use OIDC for CI/CD
- Enable MFA for privileged operations
- Audit all permission changes
- Regular access reviews
- Use short-lived credentials
- Implement conditional access

❌ **DON'T:**
- Use permanent credentials
- Grant `*` permissions
- Use root/admin accounts for automation
- Share credentials
- Skip audit logging
- Grant permissions "just in case"

---

## Access Review Automation

```python
# scripts/review-access.py
import boto3

iam = boto3.client('iam')

# List all policies
policies = iam.list_policies(Scope='Local')['Policies']

for policy in policies:
    # Get policy version
    version = iam.get_policy_version(
        PolicyArn=policy['Arn'],
        VersionId=policy['DefaultVersionId']
    )
    
    document = version['PolicyVersion']['Document']
    
    # Check for overly permissive policies
    for statement in document.get('Statement', []):
        if statement.get('Effect') == 'Allow':
            actions = statement.get('Action', [])
            if '*' in actions:
                print(f"WARNING: Policy {policy['PolicyName']} grants wildcard permissions")
```

---

## Resources

- [Azure RBAC Best Practices](https://learn.microsoft.com/azure/role-based-access-control/best-practices)
- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [GCP IAM Best Practices](https://cloud.google.com/iam/docs/best-practices)
- [Principle of Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege)

---

## Summary

You've completed the Security module! You now understand:
- Terraform security fundamentals
- Secrets management
- Security scanning
- Compliance as code
- State security
- Least privilege access

This completes all lessons. Check the GitHub Actions workflows in `.github/workflows/` and examples in `examples/cicd-pipelines/`.
