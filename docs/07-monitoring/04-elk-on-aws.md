# Lesson 04: Deploying ELK Stack on AWS

## Learning Objectives
By the end of this lesson, you will:
- Understand AWS infrastructure options for ELK deployment
- Learn to deploy ELK on AWS EC2 using Terraform
- Deploy ELK on Amazon Elastic Kubernetes Service (EKS)
- Integrate with AWS services (CloudWatch, S3, IAM)
- Implement AWS-specific optimizations and best practices

**Time Estimate:** 90 minutes

## Prerequisites
- Completion of Lessons 01 and 02
- AWS account with appropriate permissions
- AWS CLI configured
- Terraform installed (v1.0+)
- kubectl installed
- Basic understanding of AWS services

## Table of Contents
1. [AWS Infrastructure Options](#aws-infrastructure-options)
2. [Architecture Design](#architecture-design)
3. [ELK on EC2 Instances](#elk-on-ec2-instances)
4. [ELK on Amazon EKS](#elk-on-amazon-eks)
5. [AWS Service Integrations](#aws-service-integrations)
6. [Security Best Practices](#security-best-practices)
7. [Cost Optimization](#cost-optimization)
8. [High Availability Setup](#high-availability-setup)
9. [Monitoring and Logging](#monitoring-and-logging)
10. [Troubleshooting](#troubleshooting)

## AWS Infrastructure Options

### Deployment Options Comparison

```yaml
Option 1: EC2 Instances
  pros:
    - Full control over configuration
    - Predictable costs with Reserved Instances
    - Direct instance management
    - Flexibility in instance types
  cons:
    - Manual scaling and maintenance
    - More operational overhead
    - Self-managed high availability
  best_for:
    - Small to medium deployments
    - Teams familiar with EC2
    - Consistent workloads
  estimated_cost: $500-5,000/month

Option 2: Amazon EKS (Elastic Kubernetes Service)
  pros:
    - Auto-scaling capabilities
    - Container orchestration
    - Easier updates and rollbacks
    - Cloud-native approach
  cons:
    - EKS cluster costs ($73/month)
    - Kubernetes complexity
    - Learning curve
  best_for:
    - Large-scale deployments
    - Microservices architecture
    - Dynamic workloads
  estimated_cost: $800-10,000/month

Option 3: Amazon OpenSearch Service (AWS managed)
  pros:
    - Fully managed
    - No infrastructure management
    - Built-in monitoring
    - Automatic backups
  cons:
    - Less control
    - Vendor lock-in
    - Higher costs at scale
  best_for:
    - Quick deployment
    - Limited DevOps resources
    - AWS-centric architecture
  estimated_cost: $150-8,000/month

Option 4: Elastic Cloud on AWS Marketplace
  pros:
    - Official Elastic support
    - Latest features
    - Managed by Elastic
  cons:
    - Highest cost
    - AWS + Elastic billing
  best_for:
    - Enterprise deployments
    - Need official support
  estimated_cost: $1,000-20,000/month
```

### AWS Services for ELK

```yaml
Compute:
  - EC2 Instances (t3, m5, r5, c5 families)
  - Auto Scaling Groups
  - Amazon EKS
  - AWS Fargate (for lightweight components)

Storage:
  - EBS Volumes (gp3, io2, st1)
  - EFS (for shared storage)
  - S3 (snapshots, backups, cold storage)

Networking:
  - VPC (Virtual Private Cloud)
  - Security Groups
  - Network ACLs
  - Elastic Load Balancing (ALB, NLB)
  - VPC Endpoints
  - Route 53 (DNS)

Security:
  - IAM (Identity and Access Management)
  - AWS Secrets Manager
  - AWS Systems Manager Parameter Store
  - AWS Certificate Manager (ACM)
  - AWS WAF (Web Application Firewall)
  - AWS Shield (DDoS protection)

Monitoring:
  - CloudWatch Logs
  - CloudWatch Metrics
  - CloudWatch Alarms
  - AWS X-Ray
  - CloudTrail

Backup:
  - AWS Backup
  - EBS Snapshots
  - S3 Versioning
```

## Architecture Design

### Small Deployment (< 10 GB/day)

```
┌─────────────────────────────────────────────────────┐
│                    AWS Account                      │
│                   Region: us-east-1                 │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │         VPC (10.0.0.0/16)                     │ │
│  │                                               │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │  Public Subnet (10.0.1.0/24)          │  │ │
│  │  │  AZ: us-east-1a                       │  │ │
│  │  │                                        │  │ │
│  │  │  ┌──────────────┐                     │  │ │
│  │  │  │   NAT GW     │                     │  │ │
│  │  │  └──────────────┘                     │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  │                                               │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │  Private Subnet (10.0.2.0/24)         │  │ │
│  │  │  AZ: us-east-1a                       │  │ │
│  │  │                                        │  │ │
│  │  │  ┌─────────────────┐                  │  │ │
│  │  │  │  ELK Instance   │                  │  │ │
│  │  │  │   m5.xlarge     │                  │  │ │
│  │  │  ├─────────────────┤                  │  │ │
│  │  │  │ Elasticsearch   │                  │  │ │
│  │  │  │   Logstash      │                  │  │ │
│  │  │  │    Kibana       │                  │  │ │
│  │  │  └────────┬────────┘                  │  │ │
│  │  │           │                            │  │ │
│  │  │  ┌────────▼────────┐                  │  │ │
│  │  │  │   EBS Volume    │                  │  │ │
│  │  │  │  gp3 - 500 GB   │                  │  │ │
│  │  │  └─────────────────┘                  │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │      Application Load Balancer                │ │
│  │  - HTTPS listener (443)                       │ │
│  │  - ACM Certificate                            │ │
│  │  - WAF attached                               │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Production Deployment (50+ GB/day)

```
┌───────────────────────────────────────────────────────────────┐
│                    AWS Account - VPC (10.0.0.0/16)            │
│                                                               │
│  ┌────────────── Availability Zone A ──────────────┐         │
│  │  Public Subnet (10.0.1.0/24)                    │         │
│  │  ┌──────┐  ┌──────┐                             │         │
│  │  │ NAT  │  │ ALB  │                             │         │
│  │  │  GW  │  │      │                             │         │
│  │  └──────┘  └──────┘                             │         │
│  │                                                  │         │
│  │  Private Subnet - Logstash (10.0.11.0/24)       │         │
│  │  ┌────────────┐                                 │         │
│  │  │ Logstash 1 │                                 │         │
│  │  │  m5.xlarge │                                 │         │
│  │  └────────────┘                                 │         │
│  │                                                  │         │
│  │  Private Subnet - Elasticsearch (10.0.21.0/24)  │         │
│  │  ┌────────────┐  ┌────────────┐                │         │
│  │  │ ES Master  │  │  ES Data 1 │                │         │
│  │  │ m5.large   │  │ r5.2xlarge │                │         │
│  │  └────────────┘  └─────┬──────┘                │         │
│  │                        │                        │         │
│  │                   ┌────▼────┐                   │         │
│  │                   │EBS gp3  │                   │         │
│  │                   │  2 TB   │                   │         │
│  │                   └─────────┘                   │         │
│  │                                                  │         │
│  │  Private Subnet - Kibana (10.0.31.0/24)         │         │
│  │  ┌────────────┐                                 │         │
│  │  │  Kibana 1  │                                 │         │
│  │  │ m5.large   │                                 │         │
│  │  └────────────┘                                 │         │
│  └──────────────────────────────────────────────────┘         │
│                                                               │
│  ┌────────────── Availability Zone B ──────────────┐         │
│  │  (Similar structure mirrored)                   │         │
│  │  - Logstash 2                                   │         │
│  │  - ES Master + Data 2                           │         │
│  │  - Kibana 2                                     │         │
│  └──────────────────────────────────────────────────┘         │
│                                                               │
│  ┌────────────── Availability Zone C ──────────────┐         │
│  │  - ES Master (dedicated)                        │         │
│  │  - ES Data 3                                    │         │
│  └──────────────────────────────────────────────────┘         │
│                                                               │
│  External Services:                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │    S3    │ │ Secrets  │ │CloudWatch│ │   IAM    │        │
│  │Snapshots │ │ Manager  │ │  Logs    │ │  Roles   │        │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘        │
└───────────────────────────────────────────────────────────────┘
```

## ELK on EC2 Instances

### Terraform Configuration

**main.tf:**
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
      Project     = "ELK-Stack"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# VPC
resource "aws_vpc" "elk" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "elk" {
  vpc_id = aws_vpc.elk.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count                   = length(var.availability_zones)
  vpc_id                  = aws_vpc.elk.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = var.availability_zones[count.index]
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-${var.availability_zones[count.index]}"
    Type = "public"
  }
}

# Private Subnets for Elasticsearch
resource "aws_subnet" "elasticsearch" {
  count             = length(var.availability_zones)
  vpc_id            = aws_vpc.elk.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = var.availability_zones[count.index]

  tags = {
    Name      = "${var.project_name}-es-${var.availability_zones[count.index]}"
    Type      = "private"
    Component = "elasticsearch"
  }
}

# NAT Gateway
resource "aws_eip" "nat" {
  count  = length(var.availability_zones)
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip-${count.index + 1}"
  }
}

resource "aws_nat_gateway" "elk" {
  count         = length(var.availability_zones)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-nat-${var.availability_zones[count.index]}"
  }

  depends_on = [aws_internet_gateway.elk]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.elk.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.elk.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = length(var.availability_zones)
  vpc_id = aws_vpc.elk.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.elk[count.index].id
  }

  tags = {
    Name = "${var.project_name}-private-rt-${var.availability_zones[count.index]}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "elasticsearch" {
  count          = length(var.availability_zones)
  subnet_id      = aws_subnet.elasticsearch[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Group for Elasticsearch
resource "aws_security_group" "elasticsearch" {
  name        = "${var.project_name}-elasticsearch-sg"
  description = "Security group for Elasticsearch nodes"
  vpc_id      = aws_vpc.elk.id

  # Elasticsearch HTTP API
  ingress {
    description     = "Elasticsearch HTTP from Logstash and Kibana"
    from_port       = 9200
    to_port         = 9200
    protocol        = "tcp"
    security_groups = [aws_security_group.logstash.id, aws_security_group.kibana.id]
  }

  # Elasticsearch transport
  ingress {
    description = "Elasticsearch transport"
    from_port   = 9300
    to_port     = 9300
    protocol    = "tcp"
    self        = true
  }

  # SSH from bastion
  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-elasticsearch-sg"
  }
}

# Security Group for Logstash
resource "aws_security_group" "logstash" {
  name        = "${var.project_name}-logstash-sg"
  description = "Security group for Logstash nodes"
  vpc_id      = aws_vpc.elk.id

  # Beats input
  ingress {
    description = "Beats input"
    from_port   = 5044
    to_port     = 5044
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  # SSH from bastion
  ingress {
    description     = "SSH from bastion"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.bastion.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-logstash-sg"
  }
}

# IAM Role for EC2 instances
resource "aws_iam_role" "elk_instance" {
  name = "${var.project_name}-instance-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# IAM Policy for S3 snapshots
resource "aws_iam_role_policy" "s3_snapshots" {
  name = "${var.project_name}-s3-snapshots"
  role = aws_iam_role.elk_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = aws_s3_bucket.snapshots.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.snapshots.arn}/*"
      }
    ]
  })
}

# IAM Policy for CloudWatch
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.elk_instance.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# IAM Policy for Systems Manager
resource "aws_iam_role_policy_attachment" "ssm" {
  role       = aws_iam_role.elk_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# IAM Instance Profile
resource "aws_iam_instance_profile" "elk" {
  name = "${var.project_name}-instance-profile"
  role = aws_iam_role.elk_instance.name
}

# S3 Bucket for Snapshots
resource "aws_s3_bucket" "snapshots" {
  bucket = "${var.project_name}-elasticsearch-snapshots-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name = "${var.project_name}-snapshots"
  }
}

resource "aws_s3_bucket_versioning" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id

  rule {
    id     = "delete-old-snapshots"
    status = "Enabled"

    expiration {
      days = 90
    }

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Data source for latest Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Launch Template for Elasticsearch nodes
resource "aws_launch_template" "elasticsearch" {
  name_prefix   = "${var.project_name}-es-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.elasticsearch_instance_type

  iam_instance_profile {
    name = aws_iam_instance_profile.elk.name
  }

  vpc_security_group_ids = [aws_security_group.elasticsearch.id]

  block_device_mappings {
    device_name = "/dev/sda1"

    ebs {
      volume_size           = 50
      volume_type           = "gp3"
      delete_on_termination = true
      encrypted             = true
    }
  }

  block_device_mappings {
    device_name = "/dev/sdf"

    ebs {
      volume_size           = var.elasticsearch_data_volume_size
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      delete_on_termination = false
      encrypted             = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/scripts/elasticsearch-userdata.sh", {
    cluster_name         = var.elasticsearch_cluster_name
    es_version          = var.elk_version
    s3_snapshot_bucket  = aws_s3_bucket.snapshots.id
    aws_region          = var.aws_region
  }))

  tag_specifications {
    resource_type = "instance"

    tags = {
      Name      = "${var.project_name}-elasticsearch"
      Component = "elasticsearch"
    }
  }

  monitoring {
    enabled = true
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
}

# Auto Scaling Group for Elasticsearch
resource "aws_autoscaling_group" "elasticsearch" {
  name                = "${var.project_name}-elasticsearch-asg"
  vpc_zone_identifier = aws_subnet.elasticsearch[*].id
  desired_capacity    = var.elasticsearch_node_count
  max_size            = var.elasticsearch_node_count + 2
  min_size            = var.elasticsearch_node_count
  health_check_type   = "ELB"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.elasticsearch.id
    version = "$Latest"
  }

  target_group_arns = [aws_lb_target_group.elasticsearch.arn]

  tag {
    key                 = "Name"
    value               = "${var.project_name}-elasticsearch"
    propagate_at_launch = true
  }

  tag {
    key                 = "Component"
    value               = "elasticsearch"
    propagate_at_launch = true
  }
}

# Network Load Balancer for Elasticsearch (internal)
resource "aws_lb" "elasticsearch" {
  name               = "${var.project_name}-es-nlb"
  internal           = true
  load_balancer_type = "network"
  subnets            = aws_subnet.elasticsearch[*].id

  enable_deletion_protection = var.environment == "production" ? true : false

  tags = {
    Name = "${var.project_name}-elasticsearch-nlb"
  }
}

resource "aws_lb_target_group" "elasticsearch" {
  name     = "${var.project_name}-es-tg"
  port     = 9200
  protocol = "TCP"
  vpc_id   = aws_vpc.elk.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 2
    interval            = 30
    port                = 9200
    protocol            = "HTTP"
    path                = "/_cluster/health"
    matcher             = "200"
  }

  deregistration_delay = 30

  tags = {
    Name = "${var.project_name}-elasticsearch-tg"
  }
}

resource "aws_lb_listener" "elasticsearch" {
  load_balancer_arn = aws_lb.elasticsearch.arn
  port              = 9200
  protocol          = "TCP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.elasticsearch.arn
  }
}
```

**variables.tf:**
```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix"
  type        = string
  default     = "elk-stack"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "availability_zones" {
  description = "Availability zones"
  type        = list(string)
  default     = ["us-east-1a", "us-east-1b", "us-east-1c"]
}

variable "elasticsearch_instance_type" {
  description = "EC2 instance type for Elasticsearch"
  type        = string
  default     = "r5.xlarge" # 4 vCPU, 32 GB RAM
}

variable "elasticsearch_node_count" {
  description = "Number of Elasticsearch nodes"
  type        = number
  default     = 3
}

variable "elasticsearch_data_volume_size" {
  description = "Size of data volume for Elasticsearch (GB)"
  type        = number
  default     = 500
}

variable "elasticsearch_cluster_name" {
  description = "Elasticsearch cluster name"
  type        = string
  default     = "production-cluster"
}

variable "elk_version" {
  description = "ELK Stack version"
  type        = string
  default     = "8.11.0"
}

variable "logstash_instance_type" {
  description = "EC2 instance type for Logstash"
  type        = string
  default     = "m5.xlarge"
}

variable "kibana_instance_type" {
  description = "EC2 instance type for Kibana"
  type        = string
  default     = "m5.large"
}
```

**User Data Script (scripts/elasticsearch-userdata.sh):**
```bash
#!/bin/bash
set -euxo pipefail

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    awscli

# Install Java
apt-get install -y openjdk-11-jdk

# Add Elasticsearch repository
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list

# Install Elasticsearch
apt-get update
apt-get install -y elasticsearch=${es_version}

# Get instance metadata
INSTANCE_ID=$(ec2-metadata --instance-id | cut -d " " -f 2)
AVAILABILITY_ZONE=$(ec2-metadata --availability-zone | cut -d " " -f 2)
LOCAL_IP=$(ec2-metadata --local-ipv4 | cut -d " " -f 2)

# Format and mount data volume
if [ ! -d "/mnt/elasticsearch" ]; then
    mkfs.ext4 /dev/nvme1n1
    mkdir -p /mnt/elasticsearch
    mount /dev/nvme1n1 /mnt/elasticsearch
    echo "/dev/nvme1n1 /mnt/elasticsearch ext4 defaults,nofail 0 2" >> /etc/fstab
fi

chown -R elasticsearch:elasticsearch /mnt/elasticsearch

# Configure Elasticsearch
cat > /etc/elasticsearch/elasticsearch.yml <<EOF
# Cluster
cluster.name: ${cluster_name}
node.name: $INSTANCE_ID

# Paths
path.data: /mnt/elasticsearch/data
path.logs: /var/log/elasticsearch

# Network
network.host: $LOCAL_IP
http.port: 9200
transport.port: 9300

# Discovery - using EC2 discovery
discovery.seed_providers: ec2
discovery.ec2.tag.Component: elasticsearch
discovery.ec2.host_type: private_ip
cloud.node.auto_attributes: true
cluster.routing.allocation.awareness.attributes: aws_availability_zone

# Node roles
node.roles: [ master, data, ingest ]

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.http.ssl.enabled: false

# S3 snapshot repository plugin
s3.client.default.region: ${aws_region}
EOF

# Set JVM heap size (50% of RAM, max 31GB)
TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
HEAP_SIZE=$((TOTAL_MEM / 2))
if [ $HEAP_SIZE -gt 31 ]; then
    HEAP_SIZE=31
fi

cat > /etc/elasticsearch/jvm.options.d/heap.options <<EOF
-Xms$${HEAP_SIZE}g
-Xmx$${HEAP_SIZE}g
EOF

# Install S3 repository plugin
/usr/share/elasticsearch/bin/elasticsearch-plugin install --batch repository-s3
/usr/share/elasticsearch/bin/elasticsearch-plugin install --batch discovery-ec2

# Configure system settings
cat >> /etc/security/limits.conf <<EOF
elasticsearch soft nofile 65536
elasticsearch hard nofile 65536
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
EOF

sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" >> /etc/sysctl.conf

# Enable and start Elasticsearch
systemctl daemon-reload
systemctl enable elasticsearch
systemctl start elasticsearch

# Wait for Elasticsearch to start
for i in {1..30}; do
    if curl -s http://localhost:9200 > /dev/null; then
        echo "Elasticsearch is up"
        break
    fi
    echo "Waiting for Elasticsearch to start..."
    sleep 10
done

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOF
{
  "metrics": {
    "namespace": "ELK/Elasticsearch",
    "metrics_collected": {
      "disk": {
        "measurement": [
          {"name": "used_percent", "rename": "DiskUsedPercent", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60,
        "resources": {
          "*": "*"
        }
      },
      "mem": {
        "measurement": [
          {"name": "mem_used_percent", "rename": "MemoryUsedPercent", "unit": "Percent"}
        ],
        "metrics_collection_interval": 60
      }
    }
  },
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/elasticsearch/*.log",
            "log_group_name": "/aws/ec2/elasticsearch",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -s \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

echo "Elasticsearch installation completed"
```

## ELK on Amazon EKS

### EKS Cluster with Terraform

```hcl
# EKS Cluster
module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = "${var.project_name}-eks"
  cluster_version = "1.28"

  vpc_id     = aws_vpc.elk.id
  subnet_ids = aws_subnet.private[*].id

  cluster_endpoint_public_access = true

  # EKS Managed Node Group
  eks_managed_node_groups = {
    # System node group
    system = {
      name = "system-nodes"

      instance_types = ["m5.large"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 4
      desired_size = 2

      labels = {
        role = "system"
      }
    }

    # Elasticsearch node group (memory-optimized)
    elasticsearch = {
      name = "elasticsearch-nodes"

      instance_types = ["r5.xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 3
      max_size     = 6
      desired_size = 3

      labels = {
        role     = "elasticsearch"
        workload = "stateful"
      }

      taints = [{
        key    = "workload"
        value  = "elasticsearch"
        effect = "NO_SCHEDULE"
      }]

      block_device_mappings = {
        xvda = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 100
            volume_type           = "gp3"
            iops                  = 3000
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  tags = {
    Environment = var.environment
    Project     = var.project_name
  }
}

# EBS CSI Driver
resource "aws_eks_addon" "ebs_csi_driver" {
  cluster_name             = module.eks.cluster_name
  addon_name               = "aws-ebs-csi-driver"
  addon_version            = "v1.25.0-eksbuild.1"
  service_account_role_arn = aws_iam_role.ebs_csi_driver.arn
}

# IAM role for EBS CSI driver
resource "aws_iam_role" "ebs_csi_driver" {
  name = "${var.project_name}-ebs-csi-driver"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = module.eks.oidc_provider_arn
      }
      Condition = {
        StringEquals = {
          "${replace(module.eks.cluster_oidc_issuer_url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ebs_csi_driver" {
  role       = aws_iam_role.ebs_csi_driver.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
}
```

### Deploy ELK using ECK (Elastic Cloud on Kubernetes)

```bash
# Install ECK operator
kubectl create -f https://download.elastic.co/downloads/eck/2.10.0/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.10.0/operator.yaml

# Verify operator
kubectl -n elastic-system logs -f statefulset.apps/elastic-operator
```

**Elasticsearch on EKS (elasticsearch.yaml):**
```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
  namespace: elk
spec:
  version: 8.11.0

  # Node sets
  nodeSets:
  # Master nodes
  - name: master
    count: 3
    config:
      node.roles: ["master"]
      xpack.security.enabled: true

    podTemplate:
      spec:
        # Use dedicated nodes
        nodeSelector:
          role: elasticsearch
        tolerations:
        - key: workload
          value: elasticsearch
          effect: NoSchedule

        # Anti-affinity
        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  elasticsearch.k8s.elastic.co/cluster-name: elasticsearch
              topologyKey: kubernetes.io/hostname

        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 4Gi
              cpu: 2
            limits:
              memory: 4Gi
              cpu: 4
          env:
          - name: ES_JAVA_OPTS
            value: "-Xms2g -Xmx2g"

    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        storageClassName: gp3
        resources:
          requests:
            storage: 50Gi

  # Data nodes
  - name: data
    count: 3
    config:
      node.roles: ["data", "ingest"]
      xpack.security.enabled: true

    podTemplate:
      spec:
        nodeSelector:
          role: elasticsearch
        tolerations:
        - key: workload
          value: elasticsearch
          effect: NoSchedule

        affinity:
          podAntiAffinity:
            requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector:
                matchLabels:
                  elasticsearch.k8s.elastic.co/cluster-name: elasticsearch
              topologyKey: kubernetes.io/hostname

        containers:
        - name: elasticsearch
          resources:
            requests:
              memory: 16Gi
              cpu: 4
            limits:
              memory: 16Gi
              cpu: 8
          env:
          - name: ES_JAVA_OPTS
            value: "-Xms8g -Xmx8g"

    volumeClaimTemplates:
    - metadata:
        name: elasticsearch-data
      spec:
        accessModes:
        - ReadWriteOnce
        storageClassName: gp3
        resources:
          requests:
            storage: 500Gi

  # S3 snapshot configuration
  secureSettings:
  - secretName: s3-credentials

  http:
    tls:
      selfSignedCertificate:
        disabled: false
```

**Kibana on EKS (kibana.yaml):**
```yaml
apiVersion: kibana.k8s.elastic.co/v1
kind: Kibana
metadata:
  name: kibana
  namespace: elk
spec:
  version: 8.11.0
  count: 2

  elasticsearchRef:
    name: elasticsearch

  podTemplate:
    spec:
      containers:
      - name: kibana
        resources:
          requests:
            memory: 2Gi
            cpu: 1
          limits:
            memory: 2Gi
            cpu: 2

  http:
    service:
      spec:
        type: LoadBalancer
        annotations:
          service.beta.kubernetes.io/aws-load-balancer-type: "nlb"
          service.beta.kubernetes.io/aws-load-balancer-scheme: "internet-facing"
```

## AWS Service Integrations

### 1. CloudWatch Logs to Elasticsearch

**Lambda Function to ship CloudWatch Logs:**
```python
# lambda_function.py
import json
import boto3
import base64
import gzip
from elasticsearch import Elasticsearch, RequestsHttpConnection
from requests_aws4auth import AWS4Auth

region = 'us-east-1'
service = 'es'
credentials = boto3.Session().get_credentials()
awsauth = AWS4Auth(credentials.access_key, credentials.secret_key,
                   region, service, session_token=credentials.token)

es_endpoint = 'https://your-es-endpoint:9200'
es = Elasticsearch(
    hosts=[{'host': es_endpoint, 'port': 443}],
    http_auth=awsauth,
    use_ssl=True,
    verify_certs=True,
    connection_class=RequestsHttpConnection
)

def lambda_handler(event, context):
    # Decode and decompress CloudWatch Logs data
    compressed_payload = base64.b64decode(event['awslogs']['data'])
    uncompressed_payload = gzip.decompress(compressed_payload)
    log_data = json.loads(uncompressed_payload)

    # Index logs in Elasticsearch
    for log_event in log_data['logEvents']:
        document = {
            'timestamp': log_event['timestamp'],
            'message': log_event['message'],
            'log_group': log_data['logGroup'],
            'log_stream': log_data['logStream']
        }

        es.index(
            index=f"cloudwatch-{log_data['logGroup'].lower()}",
            document=document
        )

    return {
        'statusCode': 200,
        'body': json.dumps('Logs indexed successfully')
    }
```

### 2. AWS Secrets Manager Integration

```bash
# Store Elasticsearch password
aws secretsmanager create-secret \
    --name elk/elasticsearch/admin-password \
    --secret-string '{"password":"your-secure-password"}' \
    --region us-east-1

# Retrieve secret in application
SECRET_VALUE=$(aws secretsmanager get-secret-value \
    --secret-id elk/elasticsearch/admin-password \
    --query SecretString \
    --output text)

ES_PASSWORD=$(echo $SECRET_VALUE | jq -r .password)
```

### 3. S3 Lifecycle for Cost Optimization

```hcl
resource "aws_s3_bucket_lifecycle_configuration" "snapshots" {
  bucket = aws_s3_bucket.snapshots.id

  rule {
    id     = "snapshot-lifecycle"
    status = "Enabled"

    # Move to Infrequent Access after 30 days
    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    # Move to Glacier after 90 days
    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    # Delete after 365 days
    expiration {
      days = 365
    }
  }
}
```

## Security Best Practices

### 1. VPC Configuration

```yaml
Security Layers:
  1. VPC Isolation:
     - Dedicated VPC for ELK
     - Private subnets for all ELK components
     - NAT Gateway for outbound internet

  2. Security Groups:
     - Elasticsearch: Only from Logstash/Kibana
     - Logstash: Only from application subnet
     - Kibana: Only from ALB
     - SSH: Only from bastion host

  3. Network ACLs:
     - Additional layer of defense
     - Deny all by default
     - Allow specific ports

  4. VPC Endpoints:
     - S3 endpoint (snapshots)
     - Secrets Manager endpoint
     - Systems Manager endpoint
```

### 2. Encryption

```yaml
At Rest:
  - EBS volumes: AWS KMS encryption
  - S3 snapshots: SSE-S3 or SSE-KMS
  - Elasticsearch indices: Can use encryption plugin

In Transit:
  - TLS for Elasticsearch HTTP API
  - TLS for Kibana
  - TLS between Elasticsearch nodes
  - ALB HTTPS listener

Secrets Management:
  - AWS Secrets Manager for passwords
  - IAM roles instead of access keys
  - Rotate credentials regularly
```

### 3. IAM Best Practices

```hcl
# Principle of least privilege
resource "aws_iam_role_policy" "elasticsearch_minimal" {
  name = "elasticsearch-minimal"
  role = aws_iam_role.elk_instance.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeTags"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "ec2:ResourceTag/Component" = "elasticsearch"
          }
        }
      },
      {
        Effect = "Allow"
        Action = [
          "s3:ListBucket"
        ]
        Resource = aws_s3_bucket.snapshots.arn
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject"
        ]
        Resource = "${aws_s3_bucket.snapshots.arn}/*"
      }
    ]
  })
}
```

## Cost Optimization

### Instance Type Recommendations

```yaml
Elasticsearch Nodes:

  Development:
    instance_type: t3.medium
    vcpu: 2
    memory: 4 GB
    storage: gp3 100 GB
    cost: ~$30/month per node

  Small Production (< 50 GB data):
    instance_type: r5.large
    vcpu: 2
    memory: 16 GB
    storage: gp3 500 GB
    cost: ~$122/month per node

  Medium Production (50-500 GB):
    instance_type: r5.xlarge
    vcpu: 4
    memory: 32 GB
    storage: gp3 1-2 TB
    cost: ~$244/month per node

  Large Production (500 GB+):
    instance_type: r5.2xlarge or r5.4xlarge
    vcpu: 8-16
    memory: 64-128 GB
    storage: gp3 2-4 TB
    cost: ~$488-976/month per node

Logstash Nodes:
  instance_type: m5.xlarge
  vcpu: 4
  memory: 16 GB
  cost: ~$140/month per node

Kibana Nodes:
  instance_type: m5.large
  vcpu: 2
  memory: 8 GB
  cost: ~$70/month per node
```

### Savings Strategies

```yaml
1. Reserved Instances:
   - 1-year: 30% savings
   - 3-year: 50% savings
   - Best for stable workloads

2. Savings Plans:
   - Flexible across instance families
   - 1-year: 25% savings
   - 3-year: 45% savings

3. Spot Instances:
   - 60-90% savings
   - Use for non-critical Logstash nodes
   - Not recommended for Elasticsearch

4. Right-sizing:
   - Monitor actual usage
   - Downsize underutilized instances
   - Use CloudWatch metrics

5. Storage Optimization:
   - gp3 instead of gp2 (20% cheaper)
   - Hot-warm-cold architecture
   - S3 for cold data
   - Lifecycle policies

6. Network Optimization:
   - Keep traffic within same AZ
   - Use VPC endpoints
   - Minimize cross-region data transfer

7. Auto-scaling:
   - Scale down during off-hours
   - Scale up during peak times
   - Use predictive scaling
```

### Monthly Cost Example

```yaml
Medium Production Deployment (50 GB/day):

Compute:
  elasticsearch: 3 x r5.xlarge = $732
  logstash: 2 x m5.xlarge = $280
  kibana: 2 x m5.large = $140
  bastion: 1 x t3.micro = $7.50

Storage:
  ebs: 6 TB gp3 @ $0.08/GB = $480
  s3_snapshots: 1 TB @ $0.023/GB = $23

Network:
  nat_gateway: 2 x $32.85 = $65.70
  alb: $16.20
  data_transfer: ~$50

Total: ~$1,794/month

With 1-year Reserved Instances:
  compute_savings: -$331 (30% off)
  total: ~$1,463/month

With 3-year Reserved Instances:
  compute_savings: -$579 (50% off)
  total: ~$1,215/month
```

## High Availability Setup

### Multi-AZ Deployment

```yaml
Architecture:
  availability_zones: 3 (minimum)

  per_az:
    elasticsearch_data: 1 node
    elasticsearch_master: 1 node (total 3 masters)
    logstash: 1 node
    kibana: 1 node

  load_balancing:
    elasticsearch: NLB (internal)
    kibana: ALB (external)

Configuration:
  # Shard allocation awareness
  cluster.routing.allocation.awareness.attributes: aws_availability_zone
  cluster.routing.allocation.awareness.force.aws_availability_zone.values: us-east-1a,us-east-1b,us-east-1c

  # Minimum master nodes
  discovery.zen.minimum_master_nodes: 2
```

### Disaster Recovery

```bash
# Automated snapshot script
#!/bin/bash

# Create snapshot
curl -X PUT "localhost:9200/_snapshot/s3_repository/snapshot_$(date +%Y%m%d_%H%M%S)?wait_for_completion=false" \
  -H 'Content-Type: application/json' \
  -d '{
    "indices": "*",
    "ignore_unavailable": true,
    "include_global_state": false,
    "metadata": {
      "taken_by": "automated-backup",
      "taken_because": "daily backup"
    }
  }'

# Delete old snapshots (keep last 30 days)
DELETE_DATE=$(date -d "30 days ago" +%Y%m%d)

curl -X GET "localhost:9200/_snapshot/s3_repository/_all" | \
  jq -r ".snapshots[] | select(.snapshot < \"snapshot_${DELETE_DATE}\") | .snapshot" | \
  while read snapshot; do
    curl -X DELETE "localhost:9200/_snapshot/s3_repository/$snapshot"
  done
```

## Monitoring and Logging

### CloudWatch Dashboard

```hcl
resource "aws_cloudwatch_dashboard" "elk" {
  dashboard_name = "${var.project_name}-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", { stat = "Average" }],
            [".", "NetworkIn"],
            [".", "NetworkOut"]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EC2 Metrics"
        }
      },
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/EBS", "VolumeReadOps", { stat = "Sum" }],
            [".", "VolumeWriteOps"]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "EBS I/O"
        }
      }
    ]
  })
}

# CloudWatch Alarms
resource "aws_cloudwatch_metric_alarm" "elasticsearch_cpu" {
  alarm_name          = "${var.project_name}-es-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors elasticsearch cpu utilization"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.elasticsearch.name
  }
}

resource "aws_cloudwatch_metric_alarm" "elasticsearch_disk" {
  alarm_name          = "${var.project_name}-es-disk-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "DiskUsedPercent"
  namespace           = "ELK/Elasticsearch"
  period              = "300"
  statistic           = "Average"
  threshold           = "85"
  alarm_description   = "Elasticsearch disk usage is high"
  alarm_actions       = [aws_sns_topic.alerts.arn]
}
```

## Troubleshooting

### Common Issues

#### Issue 1: EC2 Discovery Not Working

```yaml
Problem:
  - Elasticsearch nodes not discovering each other
  - Cluster not forming

Solution:
  1. Check IAM permissions:
     - ec2:DescribeInstances
     - ec2:DescribeTags

  2. Verify security group:
     - Port 9300 open between ES nodes

  3. Check tags:
     - Ensure nodes have correct tags
     - Tag key: Component
     - Tag value: elasticsearch

  4. Test discovery:
     curl -X GET "localhost:9200/_cluster/state/nodes?pretty"
```

#### Issue 2: Snapshot to S3 Failing

```yaml
Problem:
  - Cannot create snapshots to S3
  - Permission denied errors

Solution:
  1. Verify IAM role:
     - s3:ListBucket on bucket
     - s3:GetObject, PutObject, DeleteObject on bucket/*

  2. Check S3 bucket policy:
     - Allow access from ES role

  3. Register repository:
     PUT /_snapshot/s3_repository
     {
       "type": "s3",
       "settings": {
         "bucket": "your-bucket-name",
         "region": "us-east-1",
         "base_path": "elasticsearch-snapshots"
       }
     }

  4. Test snapshot:
     PUT /_snapshot/s3_repository/test
```

#### Issue 3: High Memory Usage

```yaml
Problem:
  - JVM heap exhaustion
  - OutOfMemory errors

Solution:
  1. Check heap size:
     GET /_nodes/stats/jvm

  2. Optimize heap:
     - Set to 50% of RAM
     - Max 31GB (compressed oops)

  3. Reduce field data cache:
     PUT /_cluster/settings
     {
       "persistent": {
         "indices.breaker.fielddata.limit": "40%"
       }
     }

  4. Clear caches:
     POST /_cache/clear

  5. Scale up:
     - Increase instance size
     - Add more nodes
```

## Summary

In this lesson, you learned:

✅ **AWS Infrastructure**: Options for deploying ELK on AWS

✅ **EC2 Deployment**: Terraform configuration for ELK on EC2

✅ **EKS Deployment**: Running ELK on Amazon EKS

✅ **AWS Integrations**: CloudWatch, S3, Secrets Manager, IAM

✅ **Security**: VPC, security groups, encryption, IAM

✅ **Cost Optimization**: Reserved instances, right-sizing, storage tiers

✅ **High Availability**: Multi-AZ, auto-scaling, disaster recovery

## Next Steps

- **Lesson 05**: Deploy ELK on GCP
- **Lesson 06**: Use Managed Elastic Cloud
- **Examples**: Hands-on practice with example projects

## Additional Resources

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Elasticsearch on AWS Best Practices](https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-quickstart.html)
- [AWS EKS Best Practices](https://aws.github.io/aws-eks-best-practices/)

---

**Practice Exercise**: Deploy a 3-node Elasticsearch cluster on AWS EC2 using Terraform. Configure automated snapshots to S3, set up CloudWatch monitoring, and create a disaster recovery runbook.
