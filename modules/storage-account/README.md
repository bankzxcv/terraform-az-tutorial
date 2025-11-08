# Azure Storage Account Module

Terraform module for creating Azure Storage Accounts with security best practices.

## Features

- Secure by default (HTTPS only, TLS 1.2+)
- Blob versioning support
- Static website hosting
- Container creation
- Advanced Threat Protection
- Soft delete enabled

## Usage

```hcl
module "storage" {
  source = "./modules/storage-account"

  name                = "mystorageacct"
  resource_group_name = "my-rg"
  location            = "East US"

  containers = [
    {
      name        = "data"
      access_type = "private"
    }
  ]

  tags = {
    Environment = "Production"
  }
}
```

## Requirements

- Terraform >= 1.0
- azurerm provider >= 3.0

## Inputs

| Name                | Description          | Type   | Default    | Required |
|---------------------|----------------------|--------|------------|----------|
| name                | Storage account name | string | -          | yes      |
| resource_group_name | Resource group name  | string | -          | yes      |
| location            | Azure region         | string | -          | yes      |
| account_tier        | Account tier         | string | "Standard" | no       |
| replication_type    | Replication type     | string | "LRS"      | no       |

## Outputs

| Name                  | Description            |
|-----------------------|------------------------|
| id                    | Storage account ID     |
| name                  | Storage account name   |
| primary_blob_endpoint | Primary blob endpoint  |

