# Creating Reusable AWS Terraform Modules

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand Terraform module structure and best practices
- Create reusable, well-documented modules
- Use input variables and outputs effectively
- Implement module versioning
- Publish modules to Terraform Registry
- Compose complex infrastructure from modules
- Test and validate modules

## Prerequisites

- Completed [07-rds-databases.md](./07-rds-databases.md)
- Understanding of all previous AWS concepts
- Experience with Terraform resource creation

## Time Estimate

**90-120 minutes**

---

## 1. What are Terraform Modules?

Modules are containers for multiple resources that are used together. They enable:
- **Reusability**: Write once, use many times
- **Organization**: Group related resources
- **Encapsulation**: Hide complexity
- **Consistency**: Standardize infrastructure patterns

### Module Structure

```
module-name/
├── main.tf           # Primary resource definitions
├── variables.tf      # Input variables
├── outputs.tf        # Output values
├── versions.tf       # Provider requirements
├── README.md         # Documentation
└── examples/         # Usage examples
    └── basic/
        ├── main.tf
        └── README.md
```

---

## 2. Creating a VPC Module

### modules/vpc/main.tf

```hcl
# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = var.enable_dns_hostnames
  enable_dns_support   = var.enable_dns_support

  tags = merge(
    var.tags,
    {
      Name = var.name
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  count  = var.create_igw ? 1 : 0
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-igw"
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.public_subnet_cidrs)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-public-${count.index + 1}"
      Type = "Public"
    }
  )
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = length(var.private_subnet_cidrs)
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidrs[count.index]
  availability_zone = var.availability_zones[count.index]

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-private-${count.index + 1}"
      Type = "Private"
    }
  )
}

# NAT Gateways
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? length(var.public_subnet_cidrs) : 0
  domain = "vpc"

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-nat-eip-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? length(var.public_subnet_cidrs) : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-nat-${count.index + 1}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  count  = var.create_igw ? 1 : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main[0].id
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-public-rt"
    }
  )
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public[0].id
}

# Private Route Tables
resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? length(var.private_subnet_cidrs) : 1
  vpc_id = aws_vpc.main.id

  dynamic "route" {
    for_each = var.enable_nat_gateway ? [1] : []
    content {
      cidr_block     = "0.0.0.0/0"
      nat_gateway_id = aws_nat_gateway.main[count.index].id
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-private-rt-${count.index + 1}"
    }
  )
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = var.enable_nat_gateway ? aws_route_table.private[count.index].id : aws_route_table.private[0].id
}

# VPC Flow Logs (optional)
resource "aws_cloudwatch_log_group" "flow_logs" {
  count             = var.enable_flow_logs ? 1 : 0
  name              = "/aws/vpc/${var.name}"
  retention_in_days = var.flow_logs_retention

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-flow-logs"
    }
  )
}

resource "aws_iam_role" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  name  = "${var.name}-vpc-flow-logs-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "vpc-flow-logs.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "flow_logs" {
  count = var.enable_flow_logs ? 1 : 0
  role  = aws_iam_role.flow_logs[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_flow_log" "main" {
  count           = var.enable_flow_logs ? 1 : 0
  iam_role_arn    = aws_iam_role.flow_logs[0].arn
  log_destination = aws_cloudwatch_log_group.flow_logs[0].arn
  traffic_type    = var.flow_logs_traffic_type
  vpc_id          = aws_vpc.main.id

  tags = merge(
    var.tags,
    {
      Name = "${var.name}-flow-log"
    }
  )
}
```

### modules/vpc/variables.tf

```hcl
variable "name" {
  description = "Name to be used on all resources as prefix"
  type        = string
}

variable "vpc_cidr" {
  description = "The CIDR block for the VPC"
  type        = string
}

variable "availability_zones" {
  description = "List of availability zones"
  type        = list(string)
}

variable "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks"
  type        = list(string)
  default     = []
}

variable "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks"
  type        = list(string)
  default     = []
}

variable "enable_dns_hostnames" {
  description = "Enable DNS hostnames in the VPC"
  type        = bool
  default     = true
}

variable "enable_dns_support" {
  description = "Enable DNS support in the VPC"
  type        = bool
  default     = true
}

variable "create_igw" {
  description = "Create Internet Gateway for public subnets"
  type        = bool
  default     = true
}

variable "enable_nat_gateway" {
  description = "Enable NAT Gateways for private subnets"
  type        = bool
  default     = true
}

variable "enable_flow_logs" {
  description = "Enable VPC Flow Logs"
  type        = bool
  default     = false
}

variable "flow_logs_retention" {
  description = "Flow logs retention in days"
  type        = number
  default     = 7
}

variable "flow_logs_traffic_type" {
  description = "Type of traffic to log (ACCEPT, REJECT, ALL)"
  type        = string
  default     = "ALL"
}

variable "tags" {
  description = "A map of tags to add to all resources"
  type        = map(string)
  default     = {}
}
```

### modules/vpc/outputs.tf

```hcl
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "List of IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "nat_gateway_ids" {
  description = "List of NAT Gateway IDs"
  value       = aws_nat_gateway.main[*].id
}

output "nat_gateway_ips" {
  description = "List of NAT Gateway Elastic IPs"
  value       = aws_eip.nat[*].public_ip
}

output "internet_gateway_id" {
  description = "ID of the Internet Gateway"
  value       = try(aws_internet_gateway.main[0].id, null)
}

output "public_route_table_id" {
  description = "ID of public route table"
  value       = try(aws_route_table.public[0].id, null)
}

output "private_route_table_ids" {
  description = "List of IDs of private route tables"
  value       = aws_route_table.private[*].id
}
```

### modules/vpc/versions.tf

```hcl
terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 5.0"
    }
  }
}
```

### modules/vpc/README.md

```markdown
# AWS VPC Terraform Module

Creates a VPC with public and private subnets across multiple availability zones.

## Features

- VPC with customizable CIDR block
- Public and private subnets across multiple AZs
- Internet Gateway for public subnets
- NAT Gateways for private subnets (optional)
- VPC Flow Logs (optional)
- Highly configurable with sensible defaults

## Usage

```hcl
module "vpc" {
  source = "./modules/vpc"

  name               = "production-vpc"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b", "us-east-1c"]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]

  enable_nat_gateway = true
  enable_flow_logs   = true

  tags = {
    Environment = "production"
    Terraform   = "true"
  }
}
```

## Requirements

| Name | Version |
|------|---------|
| terraform | >= 1.0 |
| aws | >= 5.0 |

## Inputs

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| name | Name prefix for resources | `string` | n/a | yes |
| vpc_cidr | CIDR block for VPC | `string` | n/a | yes |
| availability_zones | List of AZs | `list(string)` | n/a | yes |
| public_subnet_cidrs | Public subnet CIDR blocks | `list(string)` | `[]` | no |
| private_subnet_cidrs | Private subnet CIDR blocks | `list(string)` | `[]` | no |
| enable_nat_gateway | Enable NAT Gateways | `bool` | `true` | no |
| enable_flow_logs | Enable VPC Flow Logs | `bool` | `false` | no |

## Outputs

| Name | Description |
|------|-------------|
| vpc_id | VPC ID |
| public_subnet_ids | Public subnet IDs |
| private_subnet_ids | Private subnet IDs |
| nat_gateway_ips | NAT Gateway IPs |

## Examples

See [examples/](./examples/) directory for complete examples.
```

---

## 3. Using the VPC Module

```hcl
# main.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

# Use the VPC module
module "vpc" {
  source = "./modules/vpc"

  name               = "production-vpc"
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  enable_flow_logs   = true

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}

# Use module outputs
output "vpc_id" {
  value = module.vpc.vpc_id
}

output "public_subnets" {
  value = module.vpc.public_subnet_ids
}
```

---

## 4. Lambda Function Module

See complete implementation in [modules/aws/lambda-function/](../../modules/aws/lambda-function/)

### modules/aws/lambda-function/main.tf

```hcl
# Lambda function
resource "aws_lambda_function" "this" {
  function_name = var.function_name
  description   = var.description

  # Code
  filename         = var.filename
  source_code_hash = var.source_code_hash

  # Runtime
  handler = var.handler
  runtime = var.runtime
  timeout = var.timeout

  # Resources
  memory_size = var.memory_size

  # IAM
  role = var.create_role ? aws_iam_role.lambda[0].arn : var.role_arn

  # VPC
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  # Environment variables
  dynamic "environment" {
    for_each = length(var.environment_variables) > 0 ? [1] : []
    content {
      variables = var.environment_variables
    }
  }

  # Tracing
  dynamic "tracing_config" {
    for_each = var.tracing_mode != null ? [1] : []
    content {
      mode = var.tracing_mode
    }
  }

  # Layers
  layers = var.layers

  tags = var.tags
}

# IAM role (optional)
resource "aws_iam_role" "lambda" {
  count = var.create_role ? 1 : 0
  name  = "${var.function_name}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

# Basic execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  count      = var.create_role ? 1 : 0
  role       = aws_iam_role.lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# VPC execution policy
resource "aws_iam_role_policy_attachment" "lambda_vpc" {
  count      = var.create_role && var.vpc_config != null ? 1 : 0
  role       = aws_iam_role.lambda[0].name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

# Custom policies
resource "aws_iam_role_policy" "lambda_custom" {
  count  = var.create_role && var.policy != null ? 1 : 0
  role   = aws_iam_role.lambda[0].id
  policy = var.policy
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  count             = var.create_log_group ? 1 : 0
  name              = "/aws/lambda/${var.function_name}"
  retention_in_days = var.log_retention_days

  tags = var.tags
}

# Permissions for triggers
resource "aws_lambda_permission" "triggers" {
  for_each = var.allowed_triggers

  function_name = aws_lambda_function.this.function_name
  statement_id  = each.key
  action        = each.value.action
  principal     = each.value.principal
  source_arn    = try(each.value.source_arn, null)
}
```

### Usage Example

```hcl
module "lambda" {
  source = "./modules/aws/lambda-function"

  function_name = "api-handler"
  description   = "API request handler"

  filename         = "lambda.zip"
  source_code_hash = filebase64sha256("lambda.zip")

  handler = "index.handler"
  runtime = "nodejs20.x"
  timeout = 30

  memory_size = 256

  environment_variables = {
    ENVIRONMENT = "production"
    DB_HOST     = module.rds.endpoint
  }

  vpc_config = {
    subnet_ids         = module.vpc.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  allowed_triggers = {
    AllowAPIGateway = {
      action     = "lambda:InvokeFunction"
      principal  = "apigateway.amazonaws.com"
      source_arn = "${aws_api_gateway_rest_api.api.execution_arn}/*"
    }
  }

  tags = {
    Environment = "production"
  }
}
```

---

## 5. S3 Bucket Module

See complete implementation in [modules/aws/s3-bucket/](../../modules/aws/s3-bucket/)

### Key Features

```hcl
module "s3_bucket" {
  source = "./modules/aws/s3-bucket"

  bucket_name = "my-app-data"

  # Versioning
  versioning_enabled = true

  # Encryption
  encryption = {
    algorithm = "aws:kms"
    key_arn   = aws_kms_key.s3.arn
  }

  # Lifecycle rules
  lifecycle_rules = [
    {
      id      = "archive-old-data"
      enabled = true

      transition = [
        {
          days          = 30
          storage_class = "STANDARD_IA"
        },
        {
          days          = 90
          storage_class = "GLACIER"
        }
      ]

      expiration = {
        days = 365
      }
    }
  ]

  # CORS
  cors_rules = [
    {
      allowed_headers = ["*"]
      allowed_methods = ["GET", "POST"]
      allowed_origins = ["https://example.com"]
      expose_headers  = ["ETag"]
      max_age_seconds = 3000
    }
  ]

  # Public access block
  block_public_access = true

  tags = {
    Environment = "production"
  }
}
```

---

## 6. Module Composition

```hcl
# Complete application infrastructure using modules
module "vpc" {
  source = "./modules/vpc"

  name               = var.app_name
  vpc_cidr           = "10.0.0.0/16"
  availability_zones = ["us-east-1a", "us-east-1b"]

  public_subnet_cidrs  = ["10.0.1.0/24", "10.0.2.0/24"]
  private_subnet_cidrs = ["10.0.11.0/24", "10.0.12.0/24"]

  enable_nat_gateway = true
  enable_flow_logs   = true

  tags = local.common_tags
}

module "database" {
  source = "./modules/rds"

  identifier = "${var.app_name}-db"
  engine     = "postgres"

  subnet_ids         = module.vpc.private_subnet_ids
  security_group_ids = [aws_security_group.database.id]

  tags = local.common_tags
}

module "lambda_api" {
  source = "./modules/lambda-function"

  function_name = "${var.app_name}-api"
  handler       = "index.handler"
  runtime       = "nodejs20.x"

  filename         = "api.zip"
  source_code_hash = filebase64sha256("api.zip")

  vpc_config = {
    subnet_ids         = module.vpc.private_subnet_ids
    security_group_ids = [aws_security_group.lambda.id]
  }

  environment_variables = {
    DB_HOST = module.database.endpoint
  }

  tags = local.common_tags
}

module "storage" {
  source = "./modules/s3-bucket"

  bucket_name        = "${var.app_name}-data"
  versioning_enabled = true

  encryption = {
    algorithm = "AES256"
  }

  tags = local.common_tags
}

locals {
  common_tags = {
    Application = var.app_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
```

---

## 7. Module Versioning and Publishing

### Version Constraints

```hcl
# Use specific version
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.2"

  # ... configuration
}

# Use version range
module "lambda" {
  source  = "terraform-aws-modules/lambda/aws"
  version = "~> 6.0"  # Allow minor updates

  # ... configuration
}

# Use Git tags
module "custom" {
  source = "git::https://github.com/your-org/terraform-modules.git//vpc?ref=v1.2.0"

  # ... configuration
}
```

### Publishing to Terraform Registry

1. **Create GitHub repository**
   - Name format: `terraform-<PROVIDER>-<NAME>`
   - Example: `terraform-aws-vpc`

2. **Add required files**
   ```
   terraform-aws-vpc/
   ├── main.tf
   ├── variables.tf
   ├── outputs.tf
   ├── versions.tf
   ├── README.md
   ├── LICENSE
   └── examples/
       └── complete/
           └── main.tf
   ```

3. **Create Git tag**
   ```bash
   git tag -a v1.0.0 -m "First release"
   git push origin v1.0.0
   ```

4. **Publish to Registry**
   - Sign in to Terraform Registry
   - Connect GitHub account
   - Select repository

---

## 8. Module Testing

### terraform-compliance

```gherkin
# tests/vpc_test.feature
Feature: VPC Module Security
  Scenario: VPC should have flow logs enabled
    Given I have aws_vpc defined
    When it has flow_logs
    Then it must have flow_logs enabled

  Scenario: NAT Gateways should be in public subnets
    Given I have aws_nat_gateway defined
    Then it must be in aws_subnet that has map_public_ip_on_launch
```

### Terratest (Go)

```go
package test

import (
    "testing"
    "github.com/gruntwork-io/terratest/modules/terraform"
    "github.com/stretchr/testify/assert"
)

func TestVPCModule(t *testing.T) {
    terraformOptions := &terraform.Options{
        TerraformDir: "../examples/complete",
    }

    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)

    vpcID := terraform.Output(t, terraformOptions, "vpc_id")
    assert.NotEmpty(t, vpcID)
}
```

---

## 9. Best Practices

### Module Design

1. **Single Responsibility**
   - One module per logical component
   - Clear, focused purpose

2. **Sensible Defaults**
   - Provide defaults for optional variables
   - Make it easy to use

3. **Composability**
   - Modules should work together
   - Use outputs as inputs to other modules

4. **Documentation**
   - Clear README with examples
   - Document all variables and outputs
   - Include usage examples

5. **Versioning**
   - Use semantic versioning
   - Maintain CHANGELOG
   - Tag releases

### Variable Naming

```hcl
# Good
variable "vpc_cidr" {}
variable "enable_nat_gateway" {}
variable "database_subnet_ids" {}

# Bad
variable "cidr" {}  # Too generic
variable "nat" {}   # Unclear
variable "subnets" {}  # Ambiguous
```

### Outputs

```hcl
# Good - descriptive and useful
output "vpc_id" {
  description = "The ID of the VPC"
  value       = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "List of IDs of private subnets"
  value       = aws_subnet.private[*].id
}

# Bad - not useful
output "main" {
  value = aws_vpc.main
}
```

---

## 10. Complete Application Example

See [examples/aws-lambda/](../../examples/aws-lambda/) for a complete working example using modules.

---

## Hands-On Exercises

### Exercise 1: Create EC2 Module

Build a reusable EC2 module with:
- Instance configuration
- User data support
- Multiple instance support
- Security group creation
- EBS volume attachment

### Exercise 2: Create ALB Module

Create an Application Load Balancer module with:
- ALB with listeners
- Target groups
- Health checks
- SSL/TLS support
- Access logging

### Exercise 3: Compose Complete Infrastructure

Use your modules to build:
- VPC with public/private subnets
- ALB in public subnets
- EC2 instances in private subnets
- RDS database
- S3 buckets for storage

---

## Key Takeaways

- Modules enable code reusability and organization
- Good modules have clear interfaces (variables/outputs)
- Use sensible defaults to make modules easy to use
- Document thoroughly with README and examples
- Version modules for stability
- Test modules before publishing
- Compose modules to build complex infrastructure

---

## Congratulations!

You've completed the AWS Terraform tutorial series! You now know how to:
- Set up AWS infrastructure with Terraform
- Create secure, scalable architectures
- Use AWS services effectively
- Build reusable modules
- Follow DevSecOps best practices

**Next Steps**:
- Explore the [examples/](../../examples/) directory
- Build your own projects
- Contribute modules to the community
- Learn about Terraform Cloud and Enterprise

---

## Additional Resources

- [Terraform Module Registry](https://registry.terraform.io/)
- [Module Creation Best Practices](https://www.terraform.io/docs/language/modules/develop/)
- [terraform-aws-modules](https://github.com/terraform-aws-modules)
- [Terratest](https://terratest.gruntwork.io/)

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty**: Intermediate to Advanced ⭐⭐⭐

**Series Complete!** Congratulations on finishing the AWS Terraform tutorial!
