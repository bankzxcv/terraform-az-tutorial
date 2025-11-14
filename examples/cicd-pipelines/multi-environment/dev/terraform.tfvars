environment              = "dev"
location                 = "East US"
storage_account_tier     = "Standard"
storage_replication_type = "LRS"

common_tags = {
  Environment = "Development"
  ManagedBy   = "Terraform"
  Project     = "Multi-Environment-Example"
  CostCenter  = "Engineering"
}
