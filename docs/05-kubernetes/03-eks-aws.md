# Amazon Elastic Kubernetes Service (EKS) with Terraform

## Learning Objectives

By the end of this lesson, you will be able to:
- Provision an EKS cluster using Terraform
- Configure VPC networking for EKS
- Set up IAM roles and policies for EKS
- Integrate EKS with AWS services (ECR, CloudWatch, Secrets Manager)
- Implement EKS add-ons (VPC CNI, CoreDNS, kube-proxy)
- Deploy applications to EKS using Terraform
- Apply security best practices using IAM Roles for Service Accounts (IRSA)
- Optimize costs with managed node groups and Fargate

## Prerequisites

- Completed Lesson 1: Kubernetes Basics
- AWS account with appropriate IAM permissions
- AWS CLI installed and configured
- Terraform 1.0+ installed
- kubectl CLI installed
- eksctl (optional, for troubleshooting)

## Time Estimate

90-120 minutes

---

## 1. EKS Architecture Overview

### EKS Components

```
┌─────────────────────────────────────────────────────────┐
│                    AWS Cloud                            │
│  ┌───────────────────────────────────────────────────┐  │
│  │          EKS Control Plane (AWS Managed)          │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │  │
│  │  │API Server│  │   etcd   │  │Scheduler │       │  │
│  │  │  (Multi  │  │ (Multi   │  │(Multiple │       │  │
│  │  │   AZ)    │  │  AZ)     │  │   AZ)    │       │  │
│  │  └──────────┘  └──────────┘  └──────────┘       │  │
│  └───────────────────────────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────┴─────────────────────────┐    │
│  │         Your VPC (Customer Managed)           │    │
│  │  ┌─────────────┐  ┌─────────────────────┐    │    │
│  │  │   Managed   │  │    Fargate          │    │    │
│  │  │  Node Group │  │    Profiles         │    │    │
│  │  │  (EC2)      │  │  (Serverless)       │    │    │
│  │  └─────────────┘  └─────────────────────┘    │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  ┌───────────────────────────────────────────────┐    │
│  │        AWS Service Integrations               │    │
│  │  - IAM (Authentication & Authorization)       │    │
│  │  - VPC (Networking)                           │    │
│  │  - ECR (Container Registry)                   │    │
│  │  - CloudWatch (Logging & Metrics)             │    │
│  │  - Secrets Manager / Parameter Store          │    │
│  │  - Application Load Balancer                  │    │
│  └───────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Key Features

- **Managed Control Plane**: AWS manages the Kubernetes control plane
- **Multi-AZ High Availability**: Control plane runs across multiple AZs
- **AWS Integration**: Native integration with AWS services
- **Managed Node Groups**: Simplified node lifecycle management
- **Fargate**: Serverless container execution
- **IRSA**: IAM Roles for Service Accounts for fine-grained permissions

---

## 2. VPC Configuration for EKS

### VPC with Public and Private Subnets

```hcl
# terraform/vpc.tf

terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"

  filter {
    name   = "opt-in-status"
    values = ["opt-in-not-required"]
  }
}

locals {
  cluster_name = "eks-${var.cluster_name}-${var.environment}"

  # Create availability zones list
  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${local.cluster_name}-vpc"
      "kubernetes.io/cluster/${local.cluster_name}" = "shared"
    }
  )
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = merge(
    var.common_tags,
    {
      Name = "${local.cluster_name}-igw"
    }
  )
}

# Public Subnets
resource "aws_subnet" "public" {
  count = 3

  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone       = local.azs[count.index]
  map_public_ip_on_launch = true

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${local.cluster_name}-public-${local.azs[count.index]}"
      "kubernetes.io/cluster/${local.cluster_name}" = "shared"
      "kubernetes.io/role/elb"                    = "1"  # For ALB
    }
  )
}

# Private Subnets
resource "aws_subnet" "private" {
  count = 3

  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone = local.azs[count.index]

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${local.cluster_name}-private-${local.azs[count.index]}"
      "kubernetes.io/cluster/${local.cluster_name}" = "shared"
      "kubernetes.io/role/internal-elb"           = "1"  # For internal ALB
    }
  )
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "nat" {
  count = 3

  domain = "vpc"

  tags = merge(
    var.common_tags,
    {
      Name = "${local.cluster_name}-nat-${local.azs[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# NAT Gateways
resource "aws_nat_gateway" "main" {
  count = 3

  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = merge(
    var.common_tags,
    {
      Name = "${local.cluster_name}-nat-${local.azs[count.index]}"
    }
  )

  depends_on = [aws_internet_gateway.main]
}

# Public Route Table
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${local.cluster_name}-public-rt"
    }
  )
}

# Private Route Tables
resource "aws_route_table" "private" {
  count = 3

  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${local.cluster_name}-private-rt-${local.azs[count.index]}"
    }
  )
}

# Route Table Associations - Public
resource "aws_route_table_association" "public" {
  count = 3

  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# Route Table Associations - Private
resource "aws_route_table_association" "private" {
  count = 3

  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}
```

---

## 3. IAM Roles for EKS

### Cluster IAM Role

```hcl
# terraform/iam.tf

# EKS Cluster Role
resource "aws_iam_role" "cluster" {
  name = "${local.cluster_name}-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })

  tags = var.common_tags
}

# Attach required policies to cluster role
resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSClusterPolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.cluster.name
}

resource "aws_iam_role_policy_attachment" "cluster_AmazonEKSVPCResourceController" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  role       = aws_iam_role.cluster.name
}

# Enable encryption with KMS (optional)
resource "aws_iam_role_policy" "cluster_encryption" {
  name = "${local.cluster_name}-cluster-encryption"
  role = aws_iam_role.cluster.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:CreateGrant",
        "kms:DescribeKey"
      ]
      Resource = aws_kms_key.eks.arn
    }]
  })
}

# Node Group IAM Role
resource "aws_iam_role" "node" {
  name = "${local.cluster_name}-node-role"

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

  tags = var.common_tags
}

# Attach required policies to node role
resource "aws_iam_role_policy_attachment" "node_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.node.name
}

resource "aws_iam_role_policy_attachment" "node_AmazonSSMManagedInstanceCore" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.node.name
}

# KMS Key for EKS encryption
resource "aws_kms_key" "eks" {
  description             = "EKS Secret Encryption Key for ${local.cluster_name}"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = var.common_tags
}

resource "aws_kms_alias" "eks" {
  name          = "alias/${local.cluster_name}"
  target_key_id = aws_kms_key.eks.key_id
}
```

---

## 4. EKS Cluster Configuration

### Create EKS Cluster

```hcl
# terraform/eks-cluster.tf

# Security Group for EKS Cluster
resource "aws_security_group" "cluster" {
  name        = "${local.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${local.cluster_name}-cluster-sg"
    }
  )
}

# Allow inbound from nodes
resource "aws_security_group_rule" "cluster_ingress_workstation_https" {
  description       = "Allow workstation to communicate with cluster API"
  security_group_id = aws_security_group.cluster.id
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = var.allowed_cidr_blocks
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "cluster" {
  name              = "/aws/eks/${local.cluster_name}/cluster"
  retention_in_days = 7

  tags = var.common_tags
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = local.cluster_name
  version  = var.kubernetes_version
  role_arn = aws_iam_role.cluster.arn

  vpc_config {
    subnet_ids              = concat(aws_subnet.private[*].id, aws_subnet.public[*].id)
    endpoint_private_access = true
    endpoint_public_access  = true
    public_access_cidrs     = var.allowed_cidr_blocks
    security_group_ids      = [aws_security_group.cluster.id]
  }

  # Enable control plane logging
  enabled_cluster_log_types = [
    "api",
    "audit",
    "authenticator",
    "controllerManager",
    "scheduler"
  ]

  # Encryption configuration
  encryption_config {
    provider {
      key_arn = aws_kms_key.eks.arn
    }
    resources = ["secrets"]
  }

  tags = var.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.cluster_AmazonEKSClusterPolicy,
    aws_iam_role_policy_attachment.cluster_AmazonEKSVPCResourceController,
    aws_cloudwatch_log_group.cluster,
  ]
}

# OIDC Provider for IRSA
data "tls_certificate" "cluster" {
  url = aws_eks_cluster.main.identity[0].oidc[0].issuer
}

resource "aws_iam_openid_connect_provider" "cluster" {
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = [data.tls_certificate.cluster.certificates[0].sha1_fingerprint]
  url             = aws_eks_cluster.main.identity[0].oidc[0].issuer

  tags = var.common_tags
}

# Output OIDC Provider ARN
output "oidc_provider_arn" {
  description = "ARN of the OIDC Provider for IRSA"
  value       = aws_iam_openid_connect_provider.cluster.arn
}
```

---

## 5. Managed Node Groups

### Create Managed Node Group

```hcl
# terraform/node-groups.tf

# Security Group for Node Groups
resource "aws_security_group" "node" {
  name        = "${local.cluster_name}-node-sg"
  description = "Security group for EKS worker nodes"
  vpc_id      = aws_vpc.main.id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.common_tags,
    {
      Name                                        = "${local.cluster_name}-node-sg"
      "kubernetes.io/cluster/${local.cluster_name}" = "owned"
    }
  )
}

# Allow nodes to communicate with each other
resource "aws_security_group_rule" "node_ingress_self" {
  description              = "Allow nodes to communicate with each other"
  security_group_id        = aws_security_group.node.id
  type                     = "ingress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "-1"
  source_security_group_id = aws_security_group.node.id
}

# Allow nodes to receive communication from cluster
resource "aws_security_group_rule" "node_ingress_cluster" {
  description              = "Allow worker Kubelets and pods to receive communication from cluster control plane"
  security_group_id        = aws_security_group.node.id
  type                     = "ingress"
  from_port                = 1025
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.cluster.id
}

# Allow cluster to communicate with nodes
resource "aws_security_group_rule" "cluster_ingress_node_https" {
  description              = "Allow pods to communicate with cluster API Server"
  security_group_id        = aws_security_group.cluster.id
  type                     = "ingress"
  from_port                = 443
  to_port                  = 443
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.node.id
}

# Launch Template for custom node configuration
resource "aws_launch_template" "node" {
  name_prefix            = "${local.cluster_name}-node-"
  description            = "Launch template for EKS managed node group"
  update_default_version = true

  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size           = 100
      volume_type           = "gp3"
      iops                  = 3000
      throughput            = 125
      delete_on_termination = true
      encrypted             = true
      kms_key_id            = aws_kms_key.eks.arn
    }
  }

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Require IMDSv2
    http_put_response_hop_limit = 1
    instance_metadata_tags      = "enabled"
  }

  monitoring {
    enabled = true
  }

  network_interfaces {
    associate_public_ip_address = false
    delete_on_termination       = true
    security_groups             = [aws_security_group.node.id]
  }

  tag_specifications {
    resource_type = "instance"

    tags = merge(
      var.common_tags,
      {
        Name = "${local.cluster_name}-node"
      }
    )
  }

  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    cluster_name        = aws_eks_cluster.main.name
    cluster_endpoint    = aws_eks_cluster.main.endpoint
    cluster_ca          = aws_eks_cluster.main.certificate_authority[0].data
  }))

  tags = var.common_tags
}

# Managed Node Group
resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${local.cluster_name}-node-group"
  node_role_arn   = aws_iam_role.node.arn
  subnet_ids      = aws_subnet.private[*].id

  # Scaling configuration
  scaling_config {
    desired_size = var.desired_node_count
    max_size     = var.max_node_count
    min_size     = var.min_node_count
  }

  # Update configuration
  update_config {
    max_unavailable_percentage = 33
  }

  # Launch template
  launch_template {
    id      = aws_launch_template.node.id
    version = aws_launch_template.node.latest_version
  }

  # Instance types
  instance_types = var.node_instance_types

  # Capacity type (ON_DEMAND or SPOT)
  capacity_type = var.capacity_type

  # Labels
  labels = {
    Environment = var.environment
    NodeGroup   = "main"
  }

  # Taints (optional)
  # taint {
  #   key    = "dedicated"
  #   value  = "application"
  #   effect = "NO_SCHEDULE"
  # }

  tags = var.common_tags

  depends_on = [
    aws_iam_role_policy_attachment.node_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.node_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.node_AmazonEC2ContainerRegistryReadOnly,
  ]

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [scaling_config[0].desired_size]
  }
}
```

### User Data Script

```bash
# user-data.sh

#!/bin/bash
set -ex

# Bootstrap the node
/etc/eks/bootstrap.sh ${cluster_name} \
  --b64-cluster-ca ${cluster_ca} \
  --apiserver-endpoint ${cluster_endpoint} \
  --kubelet-extra-args '--node-labels=nodegroup=main'

# Install CloudWatch agent (optional)
wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
sudo rpm -U ./amazon-cloudwatch-agent.rpm

# Install SSM agent (for Session Manager access)
sudo yum install -y amazon-ssm-agent
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
```

---

## 6. EKS Add-ons

### Install Essential Add-ons

```hcl
# terraform/addons.tf

# VPC CNI Add-on
resource "aws_eks_addon" "vpc_cni" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "vpc-cni"
  addon_version = var.vpc_cni_version

  # Use IRSA for VPC CNI
  service_account_role_arn = aws_iam_role.vpc_cni.arn

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.common_tags
}

# CoreDNS Add-on
resource "aws_eks_addon" "coredns" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "coredns"
  addon_version = var.coredns_version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.common_tags

  depends_on = [aws_eks_node_group.main]
}

# kube-proxy Add-on
resource "aws_eks_addon" "kube_proxy" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "kube-proxy"
  addon_version = var.kube_proxy_version

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.common_tags
}

# EBS CSI Driver Add-on
resource "aws_eks_addon" "ebs_csi" {
  cluster_name = aws_eks_cluster.main.name
  addon_name   = "aws-ebs-csi-driver"
  addon_version = var.ebs_csi_version

  service_account_role_arn = aws_iam_role.ebs_csi.arn

  resolve_conflicts_on_create = "OVERWRITE"
  resolve_conflicts_on_update = "PRESERVE"

  tags = var.common_tags
}

# IAM Role for VPC CNI
resource "aws_iam_role" "vpc_cni" {
  name = "${local.cluster_name}-vpc-cni-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:aws-node"
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "vpc_cni" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.vpc_cni.name
}

# IAM Role for EBS CSI Driver
resource "aws_iam_role" "ebs_csi" {
  name = "${local.cluster_name}-ebs-csi-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:kube-system:ebs-csi-controller-sa"
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = var.common_tags
}

resource "aws_iam_role_policy_attachment" "ebs_csi" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy"
  role       = aws_iam_role.ebs_csi.name
}
```

---

## 7. Deploying Applications to EKS

### Configure Kubernetes Provider

```hcl
# terraform/kubernetes-provider.tf

data "aws_eks_cluster_auth" "main" {
  name = aws_eks_cluster.main.name
}

provider "kubernetes" {
  host                   = aws_eks_cluster.main.endpoint
  cluster_ca_certificate = base64decode(aws_eks_cluster.main.certificate_authority[0].data)
  token                  = data.aws_eks_cluster_auth.main.token
}
```

### Deploy Application with IRSA

```hcl
# terraform/app-deployment.tf

# Create namespace
resource "kubernetes_namespace" "app" {
  metadata {
    name = "production"

    labels = {
      environment = "production"
      managed-by  = "terraform"
    }
  }
}

# IAM Role for Service Account
resource "aws_iam_role" "app_irsa" {
  name = "${local.cluster_name}-app-irsa"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRoleWithWebIdentity"
      Effect = "Allow"
      Principal = {
        Federated = aws_iam_openid_connect_provider.cluster.arn
      }
      Condition = {
        StringEquals = {
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:sub" = "system:serviceaccount:production:myapp-sa"
          "${replace(aws_iam_openid_connect_provider.cluster.url, "https://", "")}:aud" = "sts.amazonaws.com"
        }
      }
    }]
  })

  tags = var.common_tags
}

# IAM Policy for app (e.g., S3 access)
resource "aws_iam_policy" "app_s3" {
  name        = "${local.cluster_name}-app-s3-policy"
  description = "Policy for app to access S3"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket"
      ]
      Resource = [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ]
    }]
  })
}

resource "aws_iam_role_policy_attachment" "app_s3" {
  policy_arn = aws_iam_policy.app_s3.arn
  role       = aws_iam_role.app_irsa.name
}

# Service Account with IRSA
resource "kubernetes_service_account" "app" {
  metadata {
    name      = "myapp-sa"
    namespace = kubernetes_namespace.app.metadata[0].name

    annotations = {
      "eks.amazonaws.com/role-arn" = aws_iam_role.app_irsa.arn
    }
  }
}

# Deployment
resource "kubernetes_deployment" "app" {
  metadata {
    name      = "myapp"
    namespace = kubernetes_namespace.app.metadata[0].name

    labels = {
      app = "myapp"
    }
  }

  spec {
    replicas = 3

    selector {
      match_labels = {
        app = "myapp"
      }
    }

    template {
      metadata {
        labels = {
          app = "myapp"
        }
      }

      spec {
        service_account_name = kubernetes_service_account.app.metadata[0].name

        container {
          name  = "myapp"
          image = "${aws_ecr_repository.app.repository_url}:1.0.0"

          port {
            container_port = 8080
          }

          resources {
            limits = {
              cpu    = "1000m"
              memory = "1Gi"
            }
            requests = {
              cpu    = "500m"
              memory = "512Mi"
            }
          }

          liveness_probe {
            http_get {
              path = "/health"
              port = 8080
            }
            initial_delay_seconds = 30
            period_seconds        = 10
          }

          readiness_probe {
            http_get {
              path = "/ready"
              port = 8080
            }
            initial_delay_seconds = 10
            period_seconds        = 5
          }

          security_context {
            run_as_non_root            = true
            run_as_user                = 1000
            read_only_root_filesystem  = true
            allow_privilege_escalation = false

            capabilities {
              drop = ["ALL"]
            }
          }
        }
      }
    }
  }
}

# Service
resource "kubernetes_service" "app" {
  metadata {
    name      = "myapp-service"
    namespace = kubernetes_namespace.app.metadata[0].name
  }

  spec {
    selector = {
      app = "myapp"
    }

    port {
      port        = 80
      target_port = 8080
    }

    type = "LoadBalancer"
  }
}
```

---

## 8. ECR Integration

### Create ECR Repository

```hcl
# terraform/ecr.tf

resource "aws_ecr_repository" "app" {
  name                 = "${local.cluster_name}/myapp"
  image_tag_mutability = "IMMUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.eks.arn
  }

  tags = var.common_tags
}

# Lifecycle policy
resource "aws_ecr_lifecycle_policy" "app" {
  repository = aws_ecr_repository.app.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep last 30 images"
      selection = {
        tagStatus     = "any"
        countType     = "imageCountMoreThan"
        countNumber   = 30
      }
      action = {
        type = "expire"
      }
    }]
  })
}

output "ecr_repository_url" {
  description = "ECR repository URL"
  value       = aws_ecr_repository.app.repository_url
}
```

---

## 9. Variables and Outputs

### Variables

```hcl
# terraform/variables.tf

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "cluster_name" {
  description = "EKS cluster name"
  type        = string
  default     = "demo"
}

variable "kubernetes_version" {
  description = "Kubernetes version"
  type        = string
  default     = "1.28"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "allowed_cidr_blocks" {
  description = "CIDR blocks allowed to access cluster"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "desired_node_count" {
  description = "Desired number of worker nodes"
  type        = number
  default     = 3
}

variable "min_node_count" {
  description = "Minimum number of worker nodes"
  type        = number
  default     = 2
}

variable "max_node_count" {
  description = "Maximum number of worker nodes"
  type        = number
  default     = 10
}

variable "node_instance_types" {
  description = "Instance types for worker nodes"
  type        = list(string)
  default     = ["t3.medium"]
}

variable "capacity_type" {
  description = "Capacity type (ON_DEMAND or SPOT)"
  type        = string
  default     = "ON_DEMAND"
}

variable "vpc_cni_version" {
  description = "VPC CNI add-on version"
  type        = string
  default     = "v1.15.0-eksbuild.1"
}

variable "coredns_version" {
  description = "CoreDNS add-on version"
  type        = string
  default     = "v1.10.1-eksbuild.2"
}

variable "kube_proxy_version" {
  description = "kube-proxy add-on version"
  type        = string
  default     = "v1.28.1-eksbuild.1"
}

variable "ebs_csi_version" {
  description = "EBS CSI driver add-on version"
  type        = string
  default     = "v1.24.0-eksbuild.1"
}

variable "common_tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    ManagedBy   = "Terraform"
    Environment = "dev"
  }
}
```

### Outputs

```hcl
# terraform/outputs.tf

output "cluster_id" {
  description = "EKS cluster ID"
  value       = aws_eks_cluster.main.id
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = aws_eks_cluster.main.endpoint
}

output "cluster_name" {
  description = "EKS cluster name"
  value       = aws_eks_cluster.main.name
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data"
  value       = aws_eks_cluster.main.certificate_authority[0].data
  sensitive   = true
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "node_security_group_id" {
  description = "Security group ID attached to the EKS nodes"
  value       = aws_security_group.node.id
}

output "vpc_id" {
  description = "VPC ID"
  value       = aws_vpc.main.id
}

output "configure_kubectl" {
  description = "Configure kubectl"
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${aws_eks_cluster.main.name}"
}
```

---

## 10. Cost Optimization

### Strategies

1. **Use Spot Instances**: Set `capacity_type = "SPOT"` for non-critical workloads
2. **Right-size instances**: Choose appropriate instance types
3. **Cluster Autoscaler**: Automatically adjust node count
4. **Fargate for sporadic workloads**: Pay per pod
5. **Savings Plans**: For predictable usage

### Cluster Autoscaler

```hcl
# Already enabled in managed node group via auto-scaling configuration
# Deploy cluster autoscaler using Helm or manifests
```

---

## Summary

You've learned how to:
- Create a production-ready EKS cluster with Terraform
- Configure VPC networking for EKS
- Set up IAM roles and IRSA
- Deploy and manage EKS add-ons
- Deploy applications with AWS service integration
- Implement security best practices
- Optimize costs

### Next Steps

- **Lesson 4**: Google Kubernetes Engine with Terraform
- Explore AWS Load Balancer Controller
- Implement GitOps with Flux or ArgoCD
- Set up monitoring with Prometheus and Grafana

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty Level**: Intermediate

**Cost Estimate**: $5-7 per day for basic cluster
