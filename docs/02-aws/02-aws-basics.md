# AWS Basics - IAM, VPC, and Security Groups

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand AWS Identity and Access Management (IAM)
- Create and manage IAM users, groups, and roles
- Understand VPC (Virtual Private Cloud) fundamentals
- Configure Security Groups for network security
- Implement least privilege access principles
- Design secure network architectures

## Prerequisites

- Completed [01-aws-setup.md](./01-aws-setup.md)
- AWS CLI configured
- Terraform installed and initialized
- Basic understanding of networking concepts

## Time Estimate

**90-120 minutes**

---

## 1. AWS Identity and Access Management (IAM)

### What is IAM?

IAM is AWS's authentication and authorization service. It controls:
- **Who** can access your AWS resources (authentication)
- **What** they can do with those resources (authorization)

### Key IAM Concepts

```
┌─────────────────────────────────────────────────┐
│              IAM Hierarchy                      │
├─────────────────────────────────────────────────┤
│  Account (Root)                                 │
│    └── Users (Individual people/services)       │
│    └── Groups (Collection of users)             │
│    └── Roles (Temporary credentials)            │
│    └── Policies (Permissions JSON documents)    │
└─────────────────────────────────────────────────┘
```

---

## 2. Creating IAM Users with Terraform

### Basic IAM User

```hcl
# iam-users.tf
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

  default_tags {
    tags = {
      Environment = "Learning"
      ManagedBy   = "Terraform"
      Project     = "IAM-Tutorial"
    }
  }
}

# Create an IAM user
resource "aws_iam_user" "developer" {
  name = "john-developer"

  tags = {
    Department = "Engineering"
    Role       = "Developer"
  }
}

# Create access keys for programmatic access
resource "aws_iam_access_key" "developer_key" {
  user = aws_iam_user.developer.name
}

# Output the credentials (for demonstration only!)
output "access_key_id" {
  value     = aws_iam_access_key.developer_key.id
  sensitive = false  # Set to true in production
}

output "secret_access_key" {
  value     = aws_iam_access_key.developer_key.secret
  sensitive = true  # Marked as sensitive, won't show in logs
}
```

**Security Note**: Never output sensitive values in production. Use AWS Secrets Manager instead.

### Creating IAM Groups

```hcl
# Create IAM groups for different roles
resource "aws_iam_group" "developers" {
  name = "developers"
}

resource "aws_iam_group" "admins" {
  name = "administrators"
}

resource "aws_iam_group" "readonly" {
  name = "readonly-users"
}

# Add user to group
resource "aws_iam_user_group_membership" "developer_membership" {
  user = aws_iam_user.developer.name

  groups = [
    aws_iam_group.developers.name,
  ]
}
```

---

## 3. IAM Policies

### Understanding IAM Policies

IAM policies are JSON documents that define permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::my-bucket/*"
    }
  ]
}
```

### Creating Custom IAM Policies

```hcl
# Define a custom policy for S3 read access
resource "aws_iam_policy" "s3_read_access" {
  name        = "S3ReadOnlyAccess"
  description = "Provides read-only access to S3 buckets"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          "arn:aws:s3:::*",
          "arn:aws:s3:::*/*"
        ]
      }
    ]
  })
}

# Attach policy to group
resource "aws_iam_group_policy_attachment" "developers_s3_read" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.s3_read_access.arn
}

# Attach AWS managed policy
resource "aws_iam_group_policy_attachment" "admins_full_access" {
  group      = aws_iam_group.admins.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}
```

### Common AWS Managed Policies

```hcl
# PowerUserAccess - Full access except IAM
resource "aws_iam_group_policy_attachment" "power_user" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

# ReadOnlyAccess - Read-only access to all services
resource "aws_iam_group_policy_attachment" "readonly" {
  group      = aws_iam_group.readonly.name
  policy_arn = "arn:aws:iam::aws:policy/ReadOnlyAccess"
}

# Specific service access
resource "aws_iam_group_policy_attachment" "ec2_full" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}
```

---

## 4. IAM Roles

### What are IAM Roles?

Roles provide temporary credentials for:
- AWS services (EC2, Lambda, etc.)
- Cross-account access
- Federated users

### Creating an EC2 Instance Role

```hcl
# Create an IAM role for EC2 instances
resource "aws_iam_role" "ec2_role" {
  name = "ec2-app-role"

  # Trust policy - who can assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name = "EC2 Application Role"
  }
}

# Attach policies to the role
resource "aws_iam_role_policy_attachment" "ec2_s3_access" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

# Create instance profile (required for EC2)
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-app-profile"
  role = aws_iam_role.ec2_role.name
}
```

### Creating a Lambda Execution Role

```hcl
# Lambda execution role
resource "aws_iam_role" "lambda_role" {
  name = "lambda-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Attach basic Lambda execution policy
resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# Custom policy for Lambda to access S3
resource "aws_iam_role_policy" "lambda_s3_access" {
  name = "lambda-s3-access"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-lambda-bucket/*"
      }
    ]
  })
}
```

---

## 5. Virtual Private Cloud (VPC)

### What is a VPC?

A VPC is your private network in AWS. It's like having your own data center in the cloud.

```
┌─────────────────────────────────────────────────┐
│              VPC (10.0.0.0/16)                  │
├─────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐      │
│  │ Public Subnet   │  │ Private Subnet  │      │
│  │ 10.0.1.0/24     │  │ 10.0.2.0/24     │      │
│  │                 │  │                 │      │
│  │ - Web Servers   │  │ - Databases     │      │
│  │ - Load Balancer │  │ - App Servers   │      │
│  └─────────────────┘  └─────────────────┘      │
│           │                     │               │
│      Internet Gateway      NAT Gateway          │
└─────────────────────────────────────────────────┘
```

### Creating a Basic VPC

```hcl
# vpc.tf
# Create a VPC
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"  # IP range for the VPC
  enable_dns_hostnames = true           # Enable DNS hostnames
  enable_dns_support   = true           # Enable DNS resolution

  tags = {
    Name = "main-vpc"
  }
}

# Create an Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "main-igw"
  }
}

# Create a public subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true  # Auto-assign public IP

  tags = {
    Name = "public-subnet"
    Type = "Public"
  }
}

# Create a private subnet
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1a"

  tags = {
    Name = "private-subnet"
    Type = "Private"
  }
}

# Create route table for public subnet
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  # Route to Internet Gateway
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-route-table"
  }
}

# Associate route table with public subnet
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Output VPC information
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID of the public subnet"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID of the private subnet"
  value       = aws_subnet.private.id
}
```

---

## 6. Security Groups

### What are Security Groups?

Security Groups are virtual firewalls that control inbound and outbound traffic to AWS resources.

**Key Characteristics**:
- **Stateful**: Return traffic is automatically allowed
- **Default Deny**: All traffic is denied unless explicitly allowed
- **Instance Level**: Applied to EC2 instances, RDS, etc.

### Creating Security Groups

```hcl
# security-groups.tf
# Web server security group
resource "aws_security_group" "web_server" {
  name        = "web-server-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  # Inbound HTTP from anywhere
  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Inbound HTTPS from anywhere
  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # SSH from specific IP (your office IP)
  ingress {
    description = "SSH from office"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]  # Replace with your IP
  }

  # Outbound - allow all
  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"  # -1 means all protocols
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-server-sg"
  }
}

# Database security group
resource "aws_security_group" "database" {
  name        = "database-sg"
  description = "Security group for databases"
  vpc_id      = aws_vpc.main.id

  # Allow MySQL/PostgreSQL from web servers only
  ingress {
    description     = "MySQL from web servers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.web_server.id]
  }

  ingress {
    description     = "PostgreSQL from web servers"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.web_server.id]
  }

  # Outbound - allow all
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "database-sg"
  }
}

# Application Load Balancer security group
resource "aws_security_group" "alb" {
  name        = "alb-sg"
  description = "Security group for Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "alb-sg"
  }
}
```

### Dynamic Security Group Rules

```hcl
# Use variables for common ports
variable "web_ports" {
  description = "Web server ports"
  type        = list(number)
  default     = [80, 443]
}

resource "aws_security_group" "dynamic_web" {
  name        = "dynamic-web-sg"
  description = "Dynamic security group"
  vpc_id      = aws_vpc.main.id

  # Dynamic ingress rules for web ports
  dynamic "ingress" {
    for_each = var.web_ports
    content {
      description = "Port ${ingress.value}"
      from_port   = ingress.value
      to_port     = ingress.value
      protocol    = "tcp"
      cidr_blocks = ["0.0.0.0/0"]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

---

## 7. Network ACLs (NACLs)

### Security Groups vs NACLs

| Feature          | Security Groups | Network ACLs |
|------------------|----------------|--------------|
| Level            | Instance       | Subnet       |
| State            | Stateful       | Stateless    |
| Rules            | Allow only     | Allow & Deny |
| Default          | Deny all       | Allow all    |

### Creating Network ACLs

```hcl
# Create a Network ACL
resource "aws_network_acl" "main" {
  vpc_id = aws_vpc.main.id

  # Allow inbound HTTP
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  # Allow inbound HTTPS
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  # Allow ephemeral ports for return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Allow all outbound
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "main-nacl"
  }
}

# Associate NACL with subnet
resource "aws_network_acl_association" "public" {
  subnet_id      = aws_subnet.public.id
  network_acl_id = aws_network_acl.main.id
}
```

---

## 8. Complete Example: Secure VPC with IAM

```hcl
# complete-example.tf
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

  default_tags {
    tags = {
      Environment = "Development"
      ManagedBy   = "Terraform"
      Project     = "Secure-VPC-Demo"
    }
  }
}

# Variables
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_ssh_cidr" {
  description = "CIDR blocks allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # Change this to your IP!
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "secure-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "secure-vpc-igw"
  }
}

# Public Subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "us-east-1a"
  map_public_ip_on_launch = true

  tags = {
    Name = "public-subnet"
  }
}

# Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "public-rt"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Security Group
resource "aws_security_group" "web" {
  name        = "web-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.allowed_ssh_cidr
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-sg"
  }
}

# IAM Role for EC2
resource "aws_iam_role" "ec2_role" {
  name = "web-server-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2_profile" {
  name = "web-server-profile"
  role = aws_iam_role.ec2_role.name
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "Public subnet ID"
  value       = aws_subnet.public.id
}

output "security_group_id" {
  description = "Web security group ID"
  value       = aws_security_group.web.id
}

output "instance_profile_name" {
  description = "EC2 instance profile name"
  value       = aws_iam_instance_profile.ec2_profile.name
}
```

---

## 9. Best Practices

### IAM Best Practices

1. **Principle of Least Privilege**
   - Grant minimum permissions needed
   - Use specific resource ARNs, not wildcards

2. **Use IAM Roles Instead of Users for Applications**
   ```hcl
   # GOOD: Use IAM role
   resource "aws_iam_role" "app_role" {
     # ...
   }

   # BAD: Hardcode credentials
   # access_key = "AKIAIOSFODNN7EXAMPLE"
   ```

3. **Enable MFA for Privileged Users**
   ```hcl
   # Require MFA for sensitive operations
   condition {
     test     = "Bool"
     variable = "aws:MultiFactorAuthPresent"
     values   = ["true"]
   }
   ```

4. **Rotate Access Keys Regularly**
   - Set expiration policies
   - Use AWS Secrets Manager for automation

5. **Use Policy Conditions**
   ```hcl
   # Restrict by IP address
   condition {
     test     = "IpAddress"
     variable = "aws:SourceIp"
     values   = ["203.0.113.0/24"]
   }
   ```

### VPC Best Practices

1. **Use Multiple Availability Zones**
   ```hcl
   resource "aws_subnet" "public_az1" {
     availability_zone = "us-east-1a"
     # ...
   }

   resource "aws_subnet" "public_az2" {
     availability_zone = "us-east-1b"
     # ...
   }
   ```

2. **Separate Public and Private Subnets**
   - Public: Load balancers, bastion hosts
   - Private: Databases, application servers

3. **Use VPC Flow Logs**
   ```hcl
   resource "aws_flow_log" "main" {
     vpc_id          = aws_vpc.main.id
     traffic_type    = "ALL"
     iam_role_arn    = aws_iam_role.flow_log_role.arn
     log_destination = aws_cloudwatch_log_group.flow_log.arn
   }
   ```

### Security Group Best Practices

1. **Use Specific CIDR Blocks**
   ```hcl
   # GOOD: Specific IP
   cidr_blocks = ["203.0.113.10/32"]

   # BAD: Open to world (unless necessary)
   cidr_blocks = ["0.0.0.0/0"]
   ```

2. **Reference Security Groups**
   ```hcl
   # Allow traffic from another security group
   security_groups = [aws_security_group.web.id]
   ```

3. **Use Descriptive Names and Descriptions**
   ```hcl
   resource "aws_security_group" "web" {
     name        = "web-server-sg"
     description = "Allow HTTP/HTTPS inbound traffic"
   }
   ```

---

## Hands-On Exercises

### Exercise 1: Create a Three-Tier Architecture

Create IAM roles and security groups for:
1. Web tier (public subnet)
2. Application tier (private subnet)
3. Database tier (private subnet)

### Exercise 2: Implement Least Privilege

Create a custom IAM policy that:
- Allows read access to specific S3 buckets
- Allows creating EC2 instances in specific regions
- Denies deleting RDS databases

### Exercise 3: Build a Secure VPC

Create a VPC with:
- Two public subnets in different AZs
- Two private subnets in different AZs
- NAT Gateway for private subnet internet access
- Proper route tables

---

## Key Takeaways

- **IAM** controls authentication and authorization in AWS
- Use **IAM roles** for AWS services, not access keys
- **VPCs** provide network isolation
- **Security Groups** are stateful, instance-level firewalls
- Always follow the **principle of least privilege**
- Use **multiple availability zones** for high availability
- **Never hardcode credentials** in Terraform

---

## Next Steps

In the next lesson, we'll cover:
- Creating and managing EC2 instances
- Working with AMIs and user data
- Instance types and sizing
- Auto Scaling Groups

**Continue to**: [03-ec2-instances.md](./03-ec2-instances.md)

---

## Additional Resources

- [AWS IAM Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [Security Groups vs NACLs](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Security.html)
- [Terraform AWS Provider - IAM](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role)

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty**: Beginner to Intermediate ⭐⭐

**Next Lesson**: [EC2 Instances](./03-ec2-instances.md)
