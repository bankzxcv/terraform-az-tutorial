# EKS Cluster Terraform Module

Reusable Terraform module for deploying Amazon Elastic Kubernetes Service (EKS) clusters.

## Usage

```hcl
module "eks_cluster" {
  source = "./modules/kubernetes/eks-cluster"

  cluster_name = "my-eks-cluster"
  environment  = "production"
  aws_region   = "us-east-1"

  # VPC configuration
  vpc_cidr = "10.0.0.0/16"

  # Node group configuration
  desired_node_count  = 3
  min_node_count      = 2
  max_node_count      = 10
  node_instance_types = ["t3.medium"]

  # Kubernetes version
  kubernetes_version = "1.28"

  # Add-on versions
  vpc_cni_version     = "v1.15.0-eksbuild.1"
  coredns_version     = "v1.10.1-eksbuild.2"
  kube_proxy_version  = "v1.28.1-eksbuild.1"
  ebs_csi_version     = "v1.24.0-eksbuild.1"

  # Tags
  common_tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Team        = "platform"
  }
}
```

## Features

- ✅ Multi-AZ VPC with public and private subnets
- ✅ Managed node groups with autoscaling
- ✅ OIDC provider for IRSA
- ✅ EKS add-ons (VPC CNI, CoreDNS, kube-proxy, EBS CSI)
- ✅ CloudWatch logging
- ✅ KMS encryption for secrets
- ✅ Security groups
- ✅ IAM roles with least privilege
- ✅ ECR integration
- ✅ Spot instances support

## Inputs

See Lesson 3 for complete input variables documentation.

| Name | Description | Type | Required |
|------|-------------|------|----------|
| `cluster_name` | Name of the EKS cluster | string | Yes |
| `environment` | Environment name | string | Yes |
| `aws_region` | AWS region | string | Yes |
| `kubernetes_version` | Kubernetes version | string | No |

## Outputs

| Name | Description |
|------|-------------|
| `cluster_id` | EKS cluster ID |
| `cluster_endpoint` | EKS cluster endpoint |
| `oidc_provider_arn` | OIDC provider ARN for IRSA |
| `vpc_id` | VPC ID |

## Examples

See `/examples/kubernetes-apps/eks-cluster/` and Lesson 3 for complete examples.

## Requirements

- Terraform >= 1.0
- AWS Provider ~> 5.0
- Appropriate AWS IAM permissions

## References

- [Lesson 3: EKS with Terraform](../../../docs/05-kubernetes/03-eks-aws.md)
- [EKS Documentation](https://docs.aws.amazon.com/eks/)
