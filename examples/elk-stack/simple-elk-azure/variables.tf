variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-simple-elk"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "eastus"
}

variable "vm_size" {
  description = "VM size"
  type        = string
  default     = "Standard_D4s_v3" # 4 vCPU, 16 GB RAM
}

variable "data_disk_size_gb" {
  description = "Data disk size in GB"
  type        = number
  default     = 500
}

variable "admin_username" {
  description = "Admin username for the VM"
  type        = string
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "allow_ssh_from" {
  description = "Source IP address range for SSH and Kibana access"
  type        = string
  # Set to your IP address, e.g., "1.2.3.4/32"
  # Or use "*" for testing (NOT recommended for production)
}

variable "elk_version" {
  description = "ELK Stack version"
  type        = string
  default     = "8.11.0"
}
