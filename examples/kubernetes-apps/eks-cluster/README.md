# EKS Cluster Example

Complete Amazon Elastic Kubernetes Service (EKS) cluster deployment using Terraform.

## Features

- Production-ready EKS cluster
- VPC with public and private subnets
- Multi-AZ deployment for high availability
- Managed node groups with autoscaling
- IAM roles and IRSA (IAM Roles for Service Accounts)
- EKS add-ons (VPC CNI, CoreDNS, kube-proxy, EBS CSI)
- CloudWatch logging
- ECR integration
- KMS encryption for secrets

## Quick Start

```bash
# Initialize Terraform
terraform init

# Review resources
terraform plan

# Deploy cluster
terraform apply

# Update kubeconfig
aws eks update-kubeconfig --region <region> --name <cluster-name>

# Verify
kubectl get nodes
```

## What Gets Created

- VPC with public and private subnets across 3 AZs
- Internet Gateway and NAT Gateways
- EKS control plane
- Managed node group with autoscaling
- OIDC provider for IRSA
- Security groups
- IAM roles and policies
- KMS key for encryption
- CloudWatch log group
- ECR repository

## See Also

- [Lesson 3: EKS with Terraform](../../../docs/05-kubernetes/03-eks-aws.md)
- [EKS Terraform Module](../../../modules/kubernetes/eks-cluster/)
- For complete implementation, refer to Lesson 3

## Estimated Cost

~$5-7 per day for basic development cluster with:
- EKS control plane ($0.10/hour = ~$73/month)
- 3 t3.medium nodes (~$90/month)
- NAT Gateways (~$100/month for 3 AZs)

Production clusters will cost more. Consider using a single NAT Gateway for dev/test.
