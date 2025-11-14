# HCL Syntax Guide

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [What is HCL?](#what-is-hcl)
- [Basic Syntax](#basic-syntax)
- [Configuration Blocks](#configuration-blocks)
- [Data Types](#data-types)
- [Variables](#variables)
- [Expressions and Functions](#expressions-and-functions)
- [Conditional Expressions](#conditional-expressions)
- [Loops and Iteration](#loops-and-iteration)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)
- [Next Steps](#next-steps)

---

## Overview

HashiCorp Configuration Language (HCL) is the declarative language used to write Terraform configurations. This guide teaches you HCL fundamentals, syntax, and patterns needed to write effective infrastructure code.

---

## Learning Objectives

By the end of this guide, you will:
- Understand HCL syntax and structure
- Know all HCL data types and how to use them
- Master variables, outputs, and locals
- Use expressions, functions, and conditionals
- Implement loops and iteration patterns
- Write clean, maintainable Terraform code

---

## Difficulty Level

**Beginner to Intermediate** - Comprehensive coverage from basics to advanced.

---

## Time Estimate

**30-45 minutes** - Reading with hands-on examples.

---

## What is HCL?

**HCL (HashiCorp Configuration Language)** is:
- **Declarative:** You describe *what* you want, not *how* to create it
- **Human-readable:** Easy to read and write
- **Machine-friendly:** Can be parsed and validated programmatically
- **JSON-compatible:** Can be written in JSON if needed

**File Extensions:**
- `.tf` - Terraform configuration files
- `.tfvars` - Variable definition files

---

## Basic Syntax

### Comments

```hcl
# Single-line comment

// Also a single-line comment

/*
  Multi-line
  comment
*/
```

### Code Organization

```hcl
# Terraform configuration file structure

# 1. Terraform block (version and providers)
terraform {
  required_version = ">= 1.0"
}

# 2. Provider blocks
provider "azurerm" {
  features {}
}

# 3. Resource blocks
resource "azurerm_resource_group" "example" {
  name     = "rg-example"
  location = "eastus"
}

# 4. Data sources
data "azurerm_client_config" "current" {}

# 5. Variables
variable "location" {
  type    = string
  default = "eastus"
}

# 6. Outputs
output "resource_group_id" {
  value = azurerm_resource_group.example.id
}

# 7. Locals
locals {
  common_tags = {
    Environment = "dev"
    ManagedBy   = "terraform"
  }
}
```

---

## Configuration Blocks

### Block Structure

```hcl
<BLOCK_TYPE> "<BLOCK_LABEL>" "<BLOCK_LABEL>" {
  # Block body
  <IDENTIFIER> = <EXPRESSION>
}
```

### Resource Block

```hcl
resource "azurerm_storage_account" "example" {
  name                     = "stexample123"
  resource_group_name      = azurerm_resource_group.example.name
  location                 = azurerm_resource_group.example.location
  account_tier             = "Standard"
  account_replication_type = "LRS"

  tags = {
    environment = "dev"
  }
}
```

**Format:**
- `resource` - Block type
- `"azurerm_storage_account"` - Resource type
- `"example"` - Resource name (local identifier)

**Reference:** `azurerm_storage_account.example.name`

---

### Data Source Block

```hcl
data "azurerm_resource_group" "existing" {
  name = "existing-rg"
}

# Use it
resource "azurerm_storage_account" "example" {
  resource_group_name = data.azurerm_resource_group.existing.name
  location            = data.azurerm_resource_group.existing.location
  # ...
}
```

**Data sources** read information from existing resources (read-only).

---

### Variable Block

```hcl
variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_count" {
  description = "Number of instances"
  type        = number
  default     = 2
}
```

---

### Output Block

```hcl
output "resource_group_name" {
  description = "Name of the resource group"
  value       = azurerm_resource_group.example.name
}

output "storage_connection_string" {
  description = "Connection string for storage"
  value       = azurerm_storage_account.example.primary_connection_string
  sensitive   = true  # Won't show in logs
}
```

---

### Locals Block

```hcl
locals {
  # Simple values
  project_name = "myapp"
  environment  = "dev"

  # Computed values
  resource_prefix = "${local.project_name}-${local.environment}"

  # Complex expressions
  common_tags = {
    Project     = local.project_name
    Environment = local.environment
    ManagedBy   = "Terraform"
    CreatedDate = timestamp()
  }

  # Conditional logic
  location = var.environment == "prod" ? "eastus" : "westus"
}

# Use locals
resource "azurerm_resource_group" "example" {
  name     = "${local.resource_prefix}-rg"
  location = local.location
  tags     = local.common_tags
}
```

---

## Data Types

### Primitive Types

#### String

```hcl
variable "name" {
  type    = string
  default = "example"
}

# String interpolation
locals {
  greeting = "Hello, ${var.name}!"

  # Multi-line string
  script = <<-EOT
    #!/bin/bash
    echo "Running script"
    echo "Line 2"
  EOT
}
```

#### Number

```hcl
variable "instance_count" {
  type    = number
  default = 3
}

locals {
  port        = 443
  cpu_cores   = 4
  memory_gb   = 16
  price       = 99.99
}
```

#### Boolean

```hcl
variable "enable_https" {
  type    = bool
  default = true
}

resource "azurerm_app_service" "example" {
  https_only = var.enable_https
}
```

---

### Collection Types

#### List

```hcl
variable "allowed_ips" {
  type    = list(string)
  default = ["10.0.0.0/16", "192.168.1.0/24"]
}

# Access elements
locals {
  first_ip = var.allowed_ips[0]
  all_ips  = var.allowed_ips
}

# List of numbers
variable "ports" {
  type    = list(number)
  default = [80, 443, 8080]
}
```

#### Map

```hcl
variable "location_map" {
  type = map(string)
  default = {
    dev     = "westus"
    staging = "centralus"
    prod    = "eastus"
  }
}

# Access map values
locals {
  prod_location = var.location_map["prod"]
}

# Map with complex values
variable "vm_sizes" {
  type = map(object({
    size   = string
    cores  = number
    memory = number
  }))
  default = {
    small = {
      size   = "Standard_B2s"
      cores  = 2
      memory = 4
    }
    large = {
      size   = "Standard_D4s_v3"
      cores  = 4
      memory = 16
    }
  }
}
```

#### Set

```hcl
variable "availability_zones" {
  type    = set(string)
  default = ["1", "2", "3"]
}

# Sets eliminate duplicates
locals {
  unique_zones = toset(["1", "2", "2", "3"])  # Results in ["1", "2", "3"]
}
```

---

### Structural Types

#### Object

```hcl
variable "database_config" {
  type = object({
    name     = string
    size     = string
    version  = number
    ha       = bool
  })
  default = {
    name     = "mydb"
    size     = "S1"
    version  = 12
    ha       = true
  }
}

# Access object attributes
resource "azurerm_mssql_database" "example" {
  name      = var.database_config.name
  sku_name  = var.database_config.size
  # ...
}
```

#### Tuple

```hcl
variable "server_config" {
  type    = tuple([string, number, bool])
  default = ["webserver", 8080, true]
}

locals {
  server_name = var.server_config[0]
  server_port = var.server_config[1]
  is_enabled  = var.server_config[2]
}
```

---

### Type Conversion

```hcl
locals {
  # String to number
  port_number = tonumber("443")

  # Number to string
  port_string = tostring(443)

  # To boolean
  is_enabled = tobool("true")

  # To list
  ip_list = tolist(["10.0.0.1", "10.0.0.2"])

  # To set (removes duplicates)
  unique_ips = toset(["10.0.0.1", "10.0.0.1", "10.0.0.2"])

  # To map
  config_map = tomap({
    env = "dev"
    app = "web"
  })
}
```

---

## Variables

### Defining Variables

**variables.tf:**
```hcl
variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Invalid environment. Must be dev, staging, or prod."
  }
}

variable "resource_prefix" {
  description = "Prefix for all resources"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9-]{3,20}$", var.resource_prefix))
    error_message = "Prefix must be 3-20 lowercase letters, numbers, or hyphens."
  }
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default     = {}
}
```

---

### Providing Variable Values

#### Method 1: Default Values

```hcl
variable "location" {
  default = "eastus"
}
```

#### Method 2: Variable Files

**terraform.tfvars** (auto-loaded):
```hcl
environment     = "production"
resource_prefix = "myapp"
location        = "eastus"

tags = {
  CostCenter = "engineering"
  Owner      = "platform-team"
}
```

**dev.tfvars** (manual load):
```hcl
environment = "dev"
location    = "westus"
```

Use with:
```bash
terraform apply -var-file="dev.tfvars"
```

#### Method 3: Command Line

```bash
terraform apply -var="environment=prod" -var="location=eastus"
```

#### Method 4: Environment Variables

```bash
export TF_VAR_environment="prod"
export TF_VAR_location="eastus"
terraform apply
```

**Variable Precedence (highest to lowest):**
1. Command-line `-var` flags
2. `*.auto.tfvars` files (alphabetical order)
3. `terraform.tfvars` file
4. Environment variables `TF_VAR_*`
5. Default value in variable definition

---

## Expressions and Functions

### String Functions

```hcl
locals {
  # Join strings
  full_name = join("-", ["prefix", "name", "suffix"])  # "prefix-name-suffix"

  # Split string
  parts = split("-", "part1-part2-part3")  # ["part1", "part2", "part3"]

  # Upper/Lower case
  upper_name = upper("hello")  # "HELLO"
  lower_name = lower("WORLD")  # "world"

  # Format string
  message = format("Hello, %s! You are user #%d", "Alice", 42)

  # Replace
  cleaned = replace("hello-world", "-", "_")  # "hello_world"

  # Trim
  trimmed = trim("  hello  ", " ")  # "hello"

  # Substring
  first_three = substr("hello", 0, 3)  # "hel"
}
```

---

### Numeric Functions

```hcl
locals {
  # Min and Max
  minimum = min(1, 5, 3, 9)  # 1
  maximum = max(1, 5, 3, 9)  # 9

  # Absolute value
  absolute = abs(-42)  # 42

  # Ceiling and Floor
  ceiling_val = ceil(4.3)   # 5
  floor_val   = floor(4.7)  # 4

  # Power
  squared = pow(2, 8)  # 256
}
```

---

### Collection Functions

```hcl
locals {
  servers = ["web1", "web2", "db1"]

  # Length
  server_count = length(local.servers)  # 3

  # Contains
  has_db = contains(local.servers, "db1")  # true

  # Index
  web1_index = index(local.servers, "web1")  # 0

  # Element (with wraparound)
  first = element(local.servers, 0)  # "web1"
  wrapped = element(local.servers, 5)  # "web2" (wraps around)

  # Concat lists
  all_servers = concat(["web1", "web2"], ["db1", "db2"])

  # Distinct (remove duplicates)
  unique = distinct(["a", "b", "a", "c"])  # ["a", "b", "c"]

  # Flatten nested lists
  flat = flatten([["a", "b"], ["c", "d"]])  # ["a", "b", "c", "d"]

  # Slice list
  subset = slice(local.servers, 0, 2)  # ["web1", "web2"]

  # Sort
  sorted = sort(["z", "a", "m"])  # ["a", "m", "z"]

  # Reverse
  reversed = reverse([1, 2, 3])  # [3, 2, 1]
}
```

---

### Map and Object Functions

```hcl
locals {
  config = {
    env      = "prod"
    region   = "eastus"
    replicas = 3
  }

  # Keys
  config_keys = keys(local.config)  # ["env", "region", "replicas"]

  # Values
  config_values = values(local.config)  # ["prod", "eastus", 3]

  # Lookup with default
  zone = lookup(local.config, "zone", "default-zone")  # "default-zone"

  # Merge maps
  merged = merge(
    { a = 1, b = 2 },
    { c = 3, d = 4 }
  )  # { a = 1, b = 2, c = 3, d = 4 }
}
```

---

### Date and Time Functions

```hcl
locals {
  # Current timestamp
  now = timestamp()  # "2024-01-15T10:30:00Z"

  # Format timestamp
  formatted_date = formatdate("YYYY-MM-DD", timestamp())  # "2024-01-15"

  # Time math
  tomorrow = timeadd(timestamp(), "24h")
}
```

---

### Encoding Functions

```hcl
locals {
  # Base64
  encoded = base64encode("Hello, World!")
  decoded = base64decode("SGVsbG8sIFdvcmxkIQ==")

  # JSON
  json_string = jsonencode({
    name  = "example"
    value = 42
  })
  json_object = jsondecode("{\"name\":\"example\"}")

  # YAML
  yaml_string = yamlencode({
    name  = "example"
    value = 42
  })
  yaml_object = yamldecode("name: example\nvalue: 42")
}
```

---

## Conditional Expressions

### Ternary Operator

```hcl
locals {
  environment = "prod"

  # Basic conditional
  location = var.environment == "prod" ? "eastus" : "westus"

  # Nested conditionals
  tier = (
    var.environment == "prod" ? "Premium" :
    var.environment == "staging" ? "Standard" :
    "Basic"
  )

  # Conditional resource count
  backup_enabled = var.environment == "prod" ? true : false
}

resource "azurerm_backup_policy" "example" {
  count = local.backup_enabled ? 1 : 0
  # Only created in production
}
```

---

## Loops and Iteration

### count

```hcl
variable "vm_count" {
  default = 3
}

resource "azurerm_virtual_machine" "example" {
  count = var.vm_count

  name                = "vm-${count.index}"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name
  # ...
}

# Access with index
output "vm_ids" {
  value = azurerm_virtual_machine.example[*].id
}
```

---

### for_each (Map)

```hcl
variable "environments" {
  type = map(string)
  default = {
    dev     = "westus"
    staging = "centralus"
    prod    = "eastus"
  }
}

resource "azurerm_resource_group" "env" {
  for_each = var.environments

  name     = "rg-${each.key}"
  location = each.value

  tags = {
    Environment = each.key
  }
}

# Reference
output "dev_rg_id" {
  value = azurerm_resource_group.env["dev"].id
}
```

---

### for_each (Set)

```hcl
variable "subnet_names" {
  type    = set(string)
  default = ["web", "app", "data"]
}

resource "azurerm_subnet" "example" {
  for_each = var.subnet_names

  name                 = "subnet-${each.value}"
  resource_group_name  = azurerm_resource_group.example.name
  virtual_network_name = azurerm_virtual_network.example.name
  address_prefixes     = ["10.0.${index(var.subnet_names, each.value)}.0/24"]
}
```

---

### for Expression

```hcl
locals {
  # Transform list
  server_names = ["web1", "web2", "db1"]
  upper_names  = [for s in local.server_names : upper(s)]
  # ["WEB1", "WEB2", "DB1"]

  # Filter list
  web_servers = [for s in local.server_names : s if startswith(s, "web")]
  # ["web1", "web2"]

  # Transform map
  ports = {
    http  = 80
    https = 443
    ssh   = 22
  }
  port_list = [for k, v in local.ports : "${k}:${v}"]
  # ["http:80", "https:443", "ssh:22"]

  # Create map from list
  server_map = { for s in local.server_names : s => upper(s) }
  # { "web1" = "WEB1", "web2" = "WEB2", "db1" = "DB1" }

  # Nested for
  matrix = [
    for outer in ["a", "b"] : [
      for inner in [1, 2] : "${outer}${inner}"
    ]
  ]
  # [["a1", "a2"], ["b1", "b2"]]
}
```

---

### dynamic Blocks

```hcl
variable "ingress_rules" {
  type = list(object({
    from_port   = number
    to_port     = number
    protocol    = string
    cidr_blocks = list(string)
  }))
  default = [
    {
      from_port   = 80
      to_port     = 80
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    },
    {
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  ]
}

resource "azurerm_network_security_group" "example" {
  name                = "nsg-example"
  location            = azurerm_resource_group.example.location
  resource_group_name = azurerm_resource_group.example.name

  dynamic "security_rule" {
    for_each = var.ingress_rules
    content {
      name                       = "rule-${security_rule.value.from_port}"
      priority                   = 100 + security_rule.key
      direction                  = "Inbound"
      access                     = "Allow"
      protocol                   = title(security_rule.value.protocol)
      source_port_range          = "*"
      destination_port_range     = security_rule.value.from_port
      source_address_prefixes    = security_rule.value.cidr_blocks
      destination_address_prefix = "*"
    }
  }
}
```

---

## Best Practices

### 1. Use Meaningful Names

```hcl
# Good
resource "azurerm_storage_account" "app_data" {
  name = "stappdata${var.environment}"
}

# Bad
resource "azurerm_storage_account" "sa1" {
  name = "storage1"
}
```

---

### 2. Use Variables for Reusability

```hcl
# Good
variable "common_tags" {
  type = map(string)
}

resource "azurerm_resource_group" "example" {
  tags = var.common_tags
}

# Bad - hardcoded values
resource "azurerm_resource_group" "example" {
  tags = {
    Environment = "dev"
    Team        = "platform"
  }
}
```

---

### 3. Use Locals for Computed Values

```hcl
locals {
  resource_prefix = "${var.project_name}-${var.environment}"
  common_tags = merge(var.tags, {
    ManagedBy = "Terraform"
    CreatedAt = timestamp()
  })
}
```

---

### 4. Document with Comments

```hcl
variable "instance_type" {
  description = "EC2 instance type. Use t3.micro for dev, t3.medium for staging, and m5.large for production."
  type        = string
  default     = "t3.micro"
}
```

---

### 5. Use Validation

```hcl
variable "environment" {
  type = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}
```

---

## Common Patterns

### Environment-Specific Configuration

```hcl
locals {
  env_config = {
    dev = {
      vm_size     = "Standard_B2s"
      min_count   = 1
      max_count   = 2
    }
    prod = {
      vm_size     = "Standard_D4s_v3"
      min_count   = 3
      max_count   = 10
    }
  }

  current_config = local.env_config[var.environment]
}

resource "azurerm_virtual_machine" "example" {
  vm_size = local.current_config.vm_size
  # ...
}
```

---

### Resource Naming Convention

```hcl
locals {
  naming_convention = {
    resource_group  = "rg-${var.project}-${var.environment}"
    storage_account = "st${var.project}${var.environment}"
    key_vault       = "kv-${var.project}-${var.environment}"
  }
}
```

---

## Next Steps

Congratulations! You now understand HCL syntax and can write Terraform configurations effectively.

**Next Steps:**
1. **Practice:** Build projects using Azure lessons
2. **Learn Azure:** [Azure Tutorials](../01-azure/)
3. **Advanced Topics:** [Advanced Terraform](../09-advanced/)

---

## Related Documentation

- [First Terraform Project](./04-first-terraform-project.md)
- [Terraform Workflow](./05-terraform-workflow.md)
- [Terraform Language Documentation](https://www.terraform.io/language)

---

**Estimated Completion Time:** 30-45 minutes

**Difficulty:** Beginner to Intermediate

**Previous:** [Terraform Workflow](./05-terraform-workflow.md) | **Next:** [Azure Lessons](../01-azure/)
