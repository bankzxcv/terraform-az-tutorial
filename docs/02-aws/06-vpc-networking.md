# AWS VPC Networking - Advanced Network Architecture

## Learning Objectives

By the end of this lesson, you will be able to:
- Design multi-tier VPC architectures
- Configure public and private subnets
- Implement NAT Gateways for private subnet internet access
- Set up VPC Peering and Transit Gateway
- Configure VPC Endpoints for AWS services
- Implement network security with NACLs and Security Groups
- Design highly available network architectures

## Prerequisites

- Completed [05-aws-lambda.md](./05-aws-lambda.md)
- Understanding of networking basics (CIDR, subnets, routing)
- Familiarity with Security Groups from earlier lessons

## Time Estimate

**120-150 minutes**

---

## 1. VPC Architecture Overview

### Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AWS Region                             │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                VPC (10.0.0.0/16)                    │   │
│  │                                                     │   │
│  │  ┌──────────────┐    ┌──────────────┐             │   │
│  │  │  AZ-1a       │    │  AZ-1b       │             │   │
│  │  │              │    │              │             │   │
│  │  │ Public       │    │ Public       │             │   │
│  │  │ 10.0.1.0/24  │    │ 10.0.2.0/24  │             │   │
│  │  │ - ALB        │    │ - ALB        │             │   │
│  │  │ - NAT GW     │    │ - NAT GW     │             │   │
│  │  └──────────────┘    └──────────────┘             │   │
│  │         │                   │                      │   │
│  │  ┌──────────────┐    ┌──────────────┐             │   │
│  │  │ Private      │    │ Private      │             │   │
│  │  │ 10.0.11.0/24 │    │ 10.0.12.0/24 │             │   │
│  │  │ - App Tier   │    │ - App Tier   │             │   │
│  │  └──────────────┘    └──────────────┘             │   │
│  │         │                   │                      │   │
│  │  ┌──────────────┐    ┌──────────────┐             │   │
│  │  │ Database     │    │ Database     │             │   │
│  │  │ 10.0.21.0/24 │    │ 10.0.22.0/24 │             │   │
│  │  │ - RDS        │    │ - RDS        │             │   │
│  │  └──────────────┘    └──────────────┘             │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Complete VPC with Public and Private Subnets

### vpc-complete.tf

```hcl
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
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      ManagedBy   = "Terraform"
      Project     = "VPC-Tutorial"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b"]
}

# Data source for available AZs
data "aws_availability_zones" "available" {
  state = "available"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.environment}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.environment}-public-subnet-${count.index + 1}"
    Type = "Public"
    Tier = "Web"
  }
}

# Private Subnets - Application Tier
resource "aws_subnet" "private_app" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-app-subnet-${count.index + 1}"
    Type = "Private"
    Tier = "Application"
  }
}

# Private Subnets - Database Tier
resource "aws_subnet" "private_db" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 20)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name = "${var.environment}-private-db-subnet-${count.index + 1}"
    Type = "Private"
    Tier = "Database"
  }
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${var.environment}-nat-eip-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.environment}-nat-gw-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Table for Public Subnets
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.environment}-public-rt"
  }
}

# Associate Public Subnets with Public Route Table
resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Tables for Private Subnets (one per AZ for NAT Gateway)
resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.environment}-private-rt-${count.index + 1}"
  }
}

# Associate Private App Subnets with Private Route Tables
resource "aws_route_table_association" "private_app" {
  count          = length(aws_subnet.private_app)
  subnet_id      = aws_subnet.private_app[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Associate Private DB Subnets with Private Route Tables
resource "aws_route_table_association" "private_db" {
  count          = length(aws_subnet.private_db)
  subnet_id      = aws_subnet.private_db[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# VPC Flow Logs
resource "aws_cloudwatch_log_group" "vpc_flow_logs" {
  name              = "/aws/vpc/flow-logs/${var.environment}"
  retention_in_days = 30

  tags = {
    Name = "${var.environment}-vpc-flow-logs"
  }
}

resource "aws_iam_role" "vpc_flow_logs" {
  name = "${var.environment}-vpc-flow-logs-role"

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
}

resource "aws_iam_role_policy" "vpc_flow_logs" {
  role = aws_iam_role.vpc_flow_logs.id

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
  iam_role_arn    = aws_iam_role.vpc_flow_logs.arn
  log_destination = aws_cloudwatch_log_group.vpc_flow_logs.arn
  traffic_type    = "ALL"
  vpc_id          = aws_vpc.main.id

  tags = {
    Name = "${var.environment}-vpc-flow-log"
  }
}

# Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr" {
  description = "CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_app_subnet_ids" {
  description = "IDs of private application subnets"
  value       = aws_subnet.private_app[*].id
}

output "private_db_subnet_ids" {
  description = "IDs of private database subnets"
  value       = aws_subnet.private_db[*].id
}

output "nat_gateway_ips" {
  description = "Elastic IPs of NAT Gateways"
  value       = aws_eip.nat[*].public_ip
}
```

---

## 3. VPC Endpoints

Access AWS services without internet gateway or NAT gateway.

### Interface Endpoints (PrivateLink)

```hcl
# Security group for VPC endpoints
resource "aws_security_group" "vpc_endpoints" {
  name        = "vpc-endpoints-sg"
  description = "Security group for VPC endpoints"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTPS from VPC"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.main.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "vpc-endpoints-sg"
  }
}

# EC2 VPC Endpoint (Interface)
resource "aws_vpc_endpoint" "ec2" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.ec2"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "ec2-vpc-endpoint"
  }
}

# Lambda VPC Endpoint
resource "aws_vpc_endpoint" "lambda" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.lambda"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "lambda-vpc-endpoint"
  }
}

# Secrets Manager VPC Endpoint
resource "aws_vpc_endpoint" "secretsmanager" {
  vpc_id              = aws_vpc.main.id
  service_name        = "com.amazonaws.${var.aws_region}.secretsmanager"
  vpc_endpoint_type   = "Interface"
  subnet_ids          = aws_subnet.private_app[*].id
  security_group_ids  = [aws_security_group.vpc_endpoints.id]
  private_dns_enabled = true

  tags = {
    Name = "secretsmanager-vpc-endpoint"
  }
}
```

### Gateway Endpoints (S3, DynamoDB)

```hcl
# S3 VPC Endpoint (Gateway)
resource "aws_vpc_endpoint" "s3" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.s3"

  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private[*].id
  )

  tags = {
    Name = "s3-vpc-endpoint"
  }
}

# DynamoDB VPC Endpoint (Gateway)
resource "aws_vpc_endpoint" "dynamodb" {
  vpc_id       = aws_vpc.main.id
  service_name = "com.amazonaws.${var.aws_region}.dynamodb"

  route_table_ids = concat(
    [aws_route_table.public.id],
    aws_route_table.private[*].id
  )

  tags = {
    Name = "dynamodb-vpc-endpoint"
  }
}

# S3 Endpoint Policy
resource "aws_vpc_endpoint_policy" "s3_policy" {
  vpc_endpoint_id = aws_vpc_endpoint.s3.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = "*"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = "arn:aws:s3:::my-app-bucket/*"
      }
    ]
  })
}
```

---

## 4. VPC Peering

Connect two VPCs for private communication.

```hcl
# Second VPC (e.g., for different environment)
resource "aws_vpc" "secondary" {
  cidr_block           = "10.1.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "secondary-vpc"
  }
}

# VPC Peering Connection
resource "aws_vpc_peering_connection" "main_to_secondary" {
  vpc_id      = aws_vpc.main.id
  peer_vpc_id = aws_vpc.secondary.id
  auto_accept = true

  tags = {
    Name = "main-to-secondary-peering"
  }
}

# Add routes for peering - Main VPC
resource "aws_route" "main_to_secondary" {
  count                     = length(aws_route_table.private)
  route_table_id            = aws_route_table.private[count.index].id
  destination_cidr_block    = aws_vpc.secondary.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.main_to_secondary.id
}

# Add routes for peering - Secondary VPC
resource "aws_route_table" "secondary" {
  vpc_id = aws_vpc.secondary.id

  tags = {
    Name = "secondary-vpc-rt"
  }
}

resource "aws_route" "secondary_to_main" {
  route_table_id            = aws_route_table.secondary.id
  destination_cidr_block    = aws_vpc.main.cidr_block
  vpc_peering_connection_id = aws_vpc_peering_connection.main_to_secondary.id
}
```

---

## 5. Transit Gateway

Hub-and-spoke network topology for multiple VPCs.

```hcl
# Transit Gateway
resource "aws_ec2_transit_gateway" "main" {
  description                     = "Main Transit Gateway"
  default_route_table_association = "enable"
  default_route_table_propagation = "enable"
  dns_support                     = "enable"
  vpn_ecmp_support                = "enable"

  tags = {
    Name = "main-tgw"
  }
}

# Attach VPC 1 to Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "vpc1" {
  subnet_ids         = aws_subnet.private_app[*].id
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.main.id

  dns_support  = "enable"
  ipv6_support = "disable"

  tags = {
    Name = "tgw-attachment-vpc1"
  }
}

# Attach VPC 2 to Transit Gateway
resource "aws_ec2_transit_gateway_vpc_attachment" "vpc2" {
  subnet_ids         = [aws_subnet.secondary.id]
  transit_gateway_id = aws_ec2_transit_gateway.main.id
  vpc_id             = aws_vpc.secondary.id

  tags = {
    Name = "tgw-attachment-vpc2"
  }
}

# Add routes to Transit Gateway
resource "aws_route" "to_tgw_vpc1" {
  count                  = length(aws_route_table.private)
  route_table_id         = aws_route_table.private[count.index].id
  destination_cidr_block = "10.0.0.0/8"  # All private networks
  transit_gateway_id     = aws_ec2_transit_gateway.main.id
}
```

---

## 6. Network ACLs (Advanced)

Stateless network filtering at subnet level.

```hcl
# Custom Network ACL for public subnets
resource "aws_network_acl" "public" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.public[*].id

  # Inbound Rules
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 80
    to_port    = 80
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 443
    to_port    = 443
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 120
    action     = "allow"
    cidr_block = "203.0.113.0/24"  # Your office IP
    from_port  = 22
    to_port    = 22
  }

  # Ephemeral ports for return traffic
  ingress {
    protocol   = "tcp"
    rule_no    = 130
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 1024
    to_port    = 65535
  }

  # Outbound Rules
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = {
    Name = "public-nacl"
  }
}

# Network ACL for database subnets (more restrictive)
resource "aws_network_acl" "database" {
  vpc_id     = aws_vpc.main.id
  subnet_ids = aws_subnet.private_db[*].id

  # Only allow traffic from application subnets
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = aws_subnet.private_app[0].cidr_block
    from_port  = 3306
    to_port    = 3306
  }

  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = aws_subnet.private_app[1].cidr_block
    from_port  = 3306
    to_port    = 3306
  }

  # Deny all other inbound
  ingress {
    protocol   = "-1"
    rule_no    = 200
    action     = "deny"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
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
    Name = "database-nacl"
  }
}
```

---

## 7. Security Groups for Multi-Tier Architecture

```hcl
# Load Balancer Security Group
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
    Tier = "Web"
  }
}

# Web Server Security Group
resource "aws_security_group" "web" {
  name        = "web-server-sg"
  description = "Security group for web servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from ALB"
    from_port       = 80
    to_port         = 80
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    description = "SSH from bastion"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "web-server-sg"
    Tier = "Web"
  }
}

# Application Server Security Group
resource "aws_security_group" "app" {
  name        = "app-server-sg"
  description = "Security group for application servers"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "App port from web servers"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.web.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "app-server-sg"
    Tier = "Application"
  }
}

# Database Security Group
resource "aws_security_group" "database" {
  name        = "database-sg"
  description = "Security group for databases"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from app servers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "database-sg"
    Tier = "Database"
  }
}

# Bastion Host Security Group
resource "aws_security_group" "bastion" {
  name        = "bastion-sg"
  description = "Security group for bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH from office"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["203.0.113.0/24"]  # Your office IP
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "bastion-sg"
  }
}
```

---

## 8. Best Practices

### High Availability

1. **Use multiple Availability Zones**
   - Distribute resources across AZs
   - Deploy NAT Gateways in each AZ

2. **Implement Auto Scaling**
   - Scale based on demand
   - Ensure capacity in multiple AZs

3. **Use Elastic Load Balancers**
   - Distribute traffic across AZs
   - Health checks for automatic failover

### Security

1. **Defense in Depth**
   - Use both Security Groups and NACLs
   - Implement WAF for web applications

2. **Least Privilege**
   - Restrict security group rules to specific sources
   - Use VPC endpoints to avoid internet traffic

3. **Network Monitoring**
   - Enable VPC Flow Logs
   - Monitor with CloudWatch and GuardDuty

### Cost Optimization

1. **Right-size NAT Gateways**
   - Consider single NAT for non-production
   - Use VPC endpoints to reduce NAT costs

2. **Use VPC Endpoints**
   - Free for Gateway Endpoints (S3, DynamoDB)
   - Reduce data transfer costs

---

## Hands-On Exercises

### Exercise 1: Three-Tier Application

Deploy a complete three-tier architecture:
- Public subnet with ALB
- Private app subnet with EC2 instances
- Private database subnet with RDS
- NAT Gateway for internet access

### Exercise 2: Multi-Region Setup

Create VPCs in two regions with:
- VPC Peering or Transit Gateway
- Cross-region replication
- Route 53 failover

### Exercise 3: Secure Architecture

Implement maximum security:
- Private subnets only
- VPC endpoints for all AWS services
- No internet gateway
- Systems Manager for instance access

---

## Key Takeaways

- VPC provides network isolation in AWS
- Use multiple AZs for high availability
- NAT Gateways enable private subnet internet access
- VPC endpoints reduce costs and improve security
- Transit Gateway simplifies multi-VPC architectures
- Security Groups and NACLs provide layered security
- VPC Flow Logs enable network monitoring

---

## Next Steps

In the next lesson, we'll cover:
- RDS database instances
- Database security and encryption
- Automated backups and snapshots
- Multi-AZ and read replicas

**Continue to**: [07-rds-databases.md](./07-rds-databases.md)

---

## Additional Resources

- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [VPC Best Practices](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)
- [Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/)
- [Terraform AWS VPC](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc)

---

**Estimated Completion Time**: 120-150 minutes

**Difficulty**: Intermediate to Advanced ⭐⭐⭐

**Next Lesson**: [RDS Databases](./07-rds-databases.md)
