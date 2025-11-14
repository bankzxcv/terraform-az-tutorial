# Simple ELK Stack on Azure VM
# This deploys a single VM with Elasticsearch, Logstash, and Kibana
# For learning/development purposes only

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "elk" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = "Development"
    Project     = "Simple-ELK-Learning"
    ManagedBy   = "Terraform"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "elk" {
  name                = "elk-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name

  tags = azurerm_resource_group.elk.tags
}

# Subnet
resource "azurerm_subnet" "elk" {
  name                 = "elk-subnet"
  resource_group_name  = azurerm_resource_group.elk.name
  virtual_network_name = azurerm_virtual_network.elk.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Public IP
resource "azurerm_public_ip" "elk" {
  name                = "elk-public-ip"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name
  allocation_method   = "Static"
  sku                 = "Standard"

  tags = azurerm_resource_group.elk.tags
}

# Network Security Group
resource "azurerm_network_security_group" "elk" {
  name                = "elk-nsg"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name

  # SSH access
  security_rule {
    name                       = "SSH"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.allow_ssh_from
    destination_address_prefix = "*"
  }

  # Kibana access
  security_rule {
    name                       = "Kibana"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5601"
    source_address_prefix      = var.allow_ssh_from
    destination_address_prefix = "*"
  }

  # Filebeat input (if you want external sources)
  security_rule {
    name                       = "Filebeat"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "5044"
    source_address_prefix      = "10.0.0.0/16" # Internal only
    destination_address_prefix = "*"
  }

  tags = azurerm_resource_group.elk.tags
}

# Network Interface
resource "azurerm_network_interface" "elk" {
  name                = "elk-nic"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.elk.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.elk.id
  }

  tags = azurerm_resource_group.elk.tags
}

# Associate NSG with NIC
resource "azurerm_network_interface_security_group_association" "elk" {
  network_interface_id      = azurerm_network_interface.elk.id
  network_security_group_id = azurerm_network_security_group.elk.id
}

# Managed Disk for data
resource "azurerm_managed_disk" "elk_data" {
  name                 = "elk-data-disk"
  location             = azurerm_resource_group.elk.location
  resource_group_name  = azurerm_resource_group.elk.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = var.data_disk_size_gb

  tags = azurerm_resource_group.elk.tags
}

# Virtual Machine
resource "azurerm_linux_virtual_machine" "elk" {
  name                = "elk-vm"
  resource_group_name = azurerm_resource_group.elk.name
  location            = azurerm_resource_group.elk.location
  size                = var.vm_size
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.elk.id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    name                 = "elk-os-disk"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 128
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/scripts/install-elk.sh", {
    elk_version = var.elk_version
  }))

  tags = merge(
    azurerm_resource_group.elk.tags,
    {
      Component = "ELK-Stack"
    }
  )
}

# Attach data disk
resource "azurerm_virtual_machine_data_disk_attachment" "elk" {
  managed_disk_id    = azurerm_managed_disk.elk_data.id
  virtual_machine_id = azurerm_linux_virtual_machine.elk.id
  lun                = 0
  caching            = "ReadWrite"
}
