# AKS Cluster Terraform Module

Reusable Terraform module for deploying Azure Kubernetes Service (AKS) clusters.

## Usage

```hcl
module "aks_cluster" {
  source = "./modules/kubernetes/aks-cluster"

  cluster_name  = "my-aks-cluster"
  environment   = "production"
  location      = "eastus"

  # Networking
  vnet_address_space = ["10.0.0.0/16"]
  subnet_cidr        = "10.0.1.0/24"

  # Node pools
  system_node_count    = 3
  system_node_vm_size  = "Standard_D2s_v3"
  user_node_count      = 5
  user_node_vm_size    = "Standard_D4s_v3"

  # Kubernetes version
  kubernetes_version = "1.28"

  # Azure AD integration
  admin_group_object_ids = ["<azure-ad-group-id>"]

  # Tags
  tags = {
    Environment = "production"
    ManagedBy   = "terraform"
    Team        = "platform"
  }
}
```

## Features

- ✅ System and user node pools
- ✅ Azure CNI networking
- ✅ Azure AD RBAC integration
- ✅ Azure Monitor integration
- ✅ ACR integration
- ✅ Network Security Groups
- ✅ Key Vault secrets provider
- ✅ Autoscaling enabled
- ✅ Availability zones support
- ✅ Private cluster option

## Inputs

See Lesson 2 for complete input variables documentation.

| Name | Description | Type | Required |
|------|-------------|------|----------|
| `cluster_name` | Name of the AKS cluster | string | Yes |
| `environment` | Environment name | string | Yes |
| `location` | Azure region | string | Yes |
| `kubernetes_version` | Kubernetes version | string | No |

## Outputs

| Name | Description |
|------|-------------|
| `cluster_id` | AKS cluster ID |
| `cluster_name` | AKS cluster name |
| `kube_config` | Kubeconfig for cluster access |
| `identity_principal_id` | Managed identity principal ID |

## Examples

See `/examples/kubernetes-apps/aks-cluster/` and Lesson 2 for complete examples.

## Requirements

- Terraform >= 1.0
- Azure Provider ~> 3.80
- Appropriate Azure permissions

## References

- [Lesson 2: AKS with Terraform](../../../docs/05-kubernetes/02-aks-azure.md)
- [AKS Documentation](https://docs.microsoft.com/en-us/azure/aks/)
