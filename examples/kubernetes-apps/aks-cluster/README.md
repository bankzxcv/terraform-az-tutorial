# AKS Cluster Example

Complete Azure Kubernetes Service (AKS) cluster deployment using Terraform.

## Features

- Production-ready AKS cluster
- VNet integration with custom subnets
- System and user node pools
- Azure CNI networking
- Azure AD integration
- Azure Container Registry integration
- Azure Monitor and Log Analytics
- Network Security Groups
- Pod Security Standards
- Azure Key Vault integration

## Quick Start

```bash
# Initialize Terraform
terraform init

# Review resources
terraform plan

# Deploy cluster
terraform apply

# Get kubeconfig
az aks get-credentials --resource-group <rg-name> --name <cluster-name>

# Verify
kubectl get nodes
```

## What Gets Created

- Resource Group
- Virtual Network and Subnets
- AKS Cluster with system node pool
- User node pool for applications
- Azure Container Registry
- Log Analytics Workspace
- Network Security Group
- Azure Key Vault (optional)

## See Also

- [Lesson 2: AKS with Terraform](../../../docs/05-kubernetes/02-aks-azure.md)
- [AKS Terraform Module](../../../modules/kubernetes/aks-cluster/)
- For complete implementation, refer to Lesson 2

## Estimated Cost

~$3-5 per day for basic development cluster with:
- 2 system nodes (Standard_D2s_v3)
- 3 user nodes (Standard_D4s_v3)

Production clusters will cost more based on node count and size.
