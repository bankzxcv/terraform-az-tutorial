import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { DiagramBlock } from '../components/diagram-block';
import { AlertCircle, CheckCircle2, FolderTree } from 'lucide-react';
import Link from 'next/link';

export default function NetworkingPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Advanced Networking with Terraform</h1>
      <p className="text-lg text-gray-600 mb-8">
        Build complex network architectures in Azure using Terraform. Learn about Virtual Networks (VNets), 
        Subnets, Network Security Groups (NSGs), and deploy a VM in a secure network environment.
      </p>

      <Section title="What We'll Build">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-2">Network Architecture:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Virtual Network (VNet) with address space</li>
                <li>• Multiple Subnets (web, app, data tiers)</li>
                <li>• Network Security Groups with rules</li>
                <li>• Public IP address</li>
                <li>• Network Interface</li>
                <li>• Linux Virtual Machine in the network</li>
              </ul>
            </div>
          </div>
        </div>
        
        <DiagramBlock
          title="Network Architecture Diagram"
          direction="vertical"
          nodes={[
            { id: 'vnet', label: 'Virtual Network', sublabel: '10.0.0.0/16', color: 'blue' },
            { id: 'websubnet', label: 'Web Subnet', sublabel: '10.0.1.0/24', color: 'green' },
            { id: 'appsubnet', label: 'App Subnet', sublabel: '10.0.2.0/24', color: 'orange' },
            { id: 'dbsubnet', label: 'DB Subnet', sublabel: '10.0.3.0/24', color: 'purple' },
            { id: 'nsg', label: 'Network Security Group', sublabel: 'Rules:\nAllow SSH 22\nAllow HTTP 80\nAllow HTTPS 443\nDeny All Other', color: 'red' },
            { id: 'nic', label: 'Network Interface', color: 'pink' },
            { id: 'publicip', label: 'Public IP Address', color: 'teal' },
            { id: 'vm', label: 'Linux Virtual Machine', sublabel: 'Ubuntu Server', color: 'indigo' },
          ]}
          connections={[
            { from: 'vnet', to: 'websubnet' },
            { from: 'vnet', to: 'appsubnet' },
            { from: 'vnet', to: 'dbsubnet' },
            { from: 'websubnet', to: 'nsg' },
            { from: 'nsg', to: 'nic' },
            { from: 'nic', to: 'publicip' },
            { from: 'nic', to: 'vm' },
          ]}
        />
      </Section>

      <Section title="Project Structure">
        <CommandBlock command="mkdir terraform-networking && cd terraform-networking" />
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg my-4 font-mono text-sm">
          <div className="flex items-start gap-2 mb-2">
            <FolderTree className="w-4 h-4 mt-1" />
            <span className="text-blue-400">terraform-networking/</span>
          </div>
          <div className="ml-6 space-y-1">
            <div>├── provider.tf</div>
            <div>├── variables.tf</div>
            <div>├── network.tf</div>
            <div>├── security.tf</div>
            <div>├── compute.tf</div>
            <div>├── outputs.tf</div>
            <div>└── terraform.tfvars</div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Provider Configuration">
        <CodeBlock
          language="hcl"
          filename="provider.tf"
          code={`terraform {
  required_version = ">= 1.0"
  
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {
    virtual_machine {
      delete_os_disk_on_deletion     = true
      graceful_shutdown              = false
      skip_shutdown_and_force_delete = false
    }
  }
}`}
        />
      </Section>

      <Section title="Step 2: Variables">
        <CodeBlock
          language="hcl"
          filename="variables.tf"
          code={`variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-network-demo"
}

variable "location" {
  description = "Azure region"
  type        = string
  default     = "East US"
}

variable "vnet_address_space" {
  description = "Address space for VNet"
  type        = list(string)
  default     = ["10.0.0.0/16"]
}

variable "subnet_prefixes" {
  description = "Subnet address prefixes"
  type = object({
    web  = string
    app  = string
    data = string
  })
  default = {
    web  = "10.0.1.0/24"
    app  = "10.0.2.0/24"
    data = "10.0.3.0/24"
  }
}

variable "admin_username" {
  description = "VM admin username"
  type        = string
  default     = "azureuser"
}

variable "admin_password" {
  description = "VM admin password"
  type        = string
  sensitive   = true
  
  validation {
    condition     = length(var.admin_password) >= 12
    error_message = "Password must be at least 12 characters long."
  }
}

variable "vm_size" {
  description = "VM size"
  type        = string
  default     = "Standard_B2s"
}

variable "allowed_ssh_source" {
  description = "Your public IP for SSH access"
  type        = string
  default     = "*"  # Change this to your IP for security!
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default = {
    Environment = "Development"
    ManagedBy   = "Terraform"
    Project     = "NetworkingDemo"
  }
}`}
        />
      </Section>

      <Section title="Step 3: Network Configuration">
        <CodeBlock
          language="hcl"
          filename="network.tf"
          code={`# Resource Group
resource "azurerm_resource_group" "main" {
  name     = var.resource_group_name
  location = var.location
  tags     = var.tags
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "vnet-main"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.vnet_address_space
  
  tags = var.tags
}

# Web Tier Subnet
resource "azurerm_subnet" "web" {
  name                 = "subnet-web"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_prefixes.web]
}

# Application Tier Subnet
resource "azurerm_subnet" "app" {
  name                 = "subnet-app"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_prefixes.app]
}

# Data Tier Subnet
resource "azurerm_subnet" "data" {
  name                 = "subnet-data"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = [var.subnet_prefixes.data]
}

# Public IP for VM
resource "azurerm_public_ip" "vm" {
  name                = "pip-vm-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  
  tags = var.tags
}

# Network Interface
resource "azurerm_network_interface" "vm" {
  name                = "nic-vm-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.web.id
    private_ip_address_allocation = "Dynamic"
    public_ip_address_id          = azurerm_public_ip.vm.id
  }
  
  tags = var.tags
}

# Associate NSG with Network Interface
resource "azurerm_network_interface_security_group_association" "vm" {
  network_interface_id      = azurerm_network_interface.vm.id
  network_security_group_id = azurerm_network_security_group.web.id
}`}
        />
      </Section>

      <Section title="Step 4: Security Configuration">
        <CodeBlock
          language="hcl"
          filename="security.tf"
          code={`# Network Security Group for Web Tier
resource "azurerm_network_security_group" "web" {
  name                = "nsg-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = var.tags
}

# NSG Rule: Allow SSH from specific IP
resource "azurerm_network_security_rule" "allow_ssh" {
  name                        = "AllowSSH"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "22"
  source_address_prefix       = var.allowed_ssh_source
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# NSG Rule: Allow HTTP from Internet
resource "azurerm_network_security_rule" "allow_http" {
  name                        = "AllowHTTP"
  priority                    = 110
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "80"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# NSG Rule: Allow HTTPS from Internet
resource "azurerm_network_security_rule" "allow_https" {
  name                        = "AllowHTTPS"
  priority                    = 120
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_range      = "443"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# NSG Rule: Deny all other inbound traffic
resource "azurerm_network_security_rule" "deny_all_inbound" {
  name                        = "DenyAllInbound"
  priority                    = 4096
  direction                   = "Inbound"
  access                      = "Deny"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = "*"
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.web.name
}

# Network Security Group for App Tier
resource "azurerm_network_security_group" "app" {
  name                = "nsg-app"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = var.tags
}

# NSG Rule: Allow traffic from Web subnet only
resource "azurerm_network_security_rule" "allow_from_web" {
  name                        = "AllowFromWeb"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "*"
  source_port_range           = "*"
  destination_port_range      = "*"
  source_address_prefix       = var.subnet_prefixes.web
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.app.name
}

# Associate NSG with App Subnet
resource "azurerm_subnet_network_security_group_association" "app" {
  subnet_id                 = azurerm_subnet.app.id
  network_security_group_id = azurerm_network_security_group.app.id
}

# Network Security Group for Data Tier
resource "azurerm_network_security_group" "data" {
  name                = "nsg-data"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  tags = var.tags
}

# NSG Rule: Allow traffic from App subnet only
resource "azurerm_network_security_rule" "allow_from_app" {
  name                        = "AllowFromApp"
  priority                    = 100
  direction                   = "Inbound"
  access                      = "Allow"
  protocol                    = "Tcp"
  source_port_range           = "*"
  destination_port_ranges     = ["3306", "5432", "1433"]  # MySQL, PostgreSQL, SQL Server
  source_address_prefix       = var.subnet_prefixes.app
  destination_address_prefix  = "*"
  resource_group_name         = azurerm_resource_group.main.name
  network_security_group_name = azurerm_network_security_group.data.name
}

# Associate NSG with Data Subnet
resource "azurerm_subnet_network_security_group_association" "data" {
  subnet_id                 = azurerm_subnet.data.id
  network_security_group_id = azurerm_network_security_group.data.id
}`}
        />
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Security Best Practices:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use specific source IPs instead of "*" for SSH</li>
                <li>• Implement least privilege principle</li>
                <li>• Only allow traffic between tiers that need to communicate</li>
                <li>• Data tier should never be directly accessible from internet</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Step 5: Virtual Machine">
        <CodeBlock
          language="hcl"
          filename="compute.tf"
          code={`# Random password generator (if not provided)
resource "random_password" "vm_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Linux Virtual Machine
resource "azurerm_linux_virtual_machine" "web" {
  name                = "vm-web-001"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  size                = var.vm_size
  
  admin_username = var.admin_username
  admin_password = var.admin_password != "" ? var.admin_password : random_password.vm_password.result
  
  disable_password_authentication = false
  
  network_interface_ids = [
    azurerm_network_interface.vm.id
  ]
  
  os_disk {
    name                 = "osdisk-vm-web-001"
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
    disk_size_gb         = 30
  }
  
  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }
  
  # Cloud-init script to install Nginx
  custom_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx
    
    # Create a simple web page
    cat > /var/www/html/index.html <<HTML
    <!DOCTYPE html>
    <html>
    <head>
        <title>Azure VM - Terraform Demo</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 50px auto;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            .container {
                background: white;
                color: #333;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            }
            h1 { color: #667eea; }
            .info { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 Azure VM Deployed with Terraform</h1>
            <p>This VM is running in a secure Virtual Network with:</p>
            <ul>
                <li>Custom VNet (10.0.0.0/16)</li>
                <li>Multiple Subnets (Web, App, Data tiers)</li>
                <li>Network Security Groups</li>
                <li>Public IP with restricted access</li>
            </ul>
            <div class="info">
                <strong>Hostname:</strong> $(hostname)<br>
                <strong>Private IP:</strong> $(hostname -I | awk '{print $1}')<br>
                <strong>OS:</strong> $(lsb_release -d | cut -f2)
            </div>
        </div>
    </body>
    </html>
HTML
    
    systemctl restart nginx
    systemctl enable nginx
  EOF
  )
  
  tags = var.tags
}`}
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Custom Data (Cloud-Init):</p>
              <p className="text-sm text-yellow-800">
                The <code>custom_data</code> field runs a script when the VM first boots. 
                Here we install Nginx and create a custom web page.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Step 6: Outputs">
        <CodeBlock
          language="hcl"
          filename="outputs.tf"
          code={`output "resource_group_name" {
  description = "Resource group name"
  value       = azurerm_resource_group.main.name
}

output "vnet_name" {
  description = "Virtual network name"
  value       = azurerm_virtual_network.main.name
}

output "vnet_address_space" {
  description = "VNet address space"
  value       = azurerm_virtual_network.main.address_space
}

output "subnet_ids" {
  description = "Subnet IDs"
  value = {
    web  = azurerm_subnet.web.id
    app  = azurerm_subnet.app.id
    data = azurerm_subnet.data.id
  }
}

output "vm_public_ip" {
  description = "VM public IP address"
  value       = azurerm_public_ip.vm.ip_address
}

output "vm_private_ip" {
  description = "VM private IP address"
  value       = azurerm_network_interface.vm.private_ip_address
}

output "vm_admin_username" {
  description = "VM admin username"
  value       = azurerm_linux_virtual_machine.web.admin_username
}

output "vm_password" {
  description = "VM admin password (if generated)"
  value       = var.admin_password != "" ? "Using provided password" : random_password.vm_password.result
  sensitive   = true
}

output "ssh_command" {
  description = "SSH command to connect to VM"
  value       = "ssh \${azurerm_linux_virtual_machine.web.admin_username}@\${azurerm_public_ip.vm.ip_address}"
}

output "web_url" {
  description = "Web server URL"
  value       = "http://\${azurerm_public_ip.vm.ip_address}"
}`}
        />
      </Section>

      <Section title="Step 7: Variable Values">
        <CodeBlock
          language="hcl"
          filename="terraform.tfvars"
          code={`resource_group_name = "rg-network-demo"
location            = "East US"

# Network Configuration
vnet_address_space = ["10.0.0.0/16"]

subnet_prefixes = {
  web  = "10.0.1.0/24"
  app  = "10.0.2.0/24"
  data = "10.0.3.0/24"
}

# VM Configuration
admin_username = "azureuser"
admin_password = "P@ssw0rd123456!"  # Change this!
vm_size        = "Standard_B2s"

# Security - IMPORTANT: Change to your IP!
allowed_ssh_source = "*"  # Use "YOUR_IP/32" for security

tags = {
  Environment = "Development"
  ManagedBy   = "Terraform"
  Project     = "NetworkingDemo"
  Owner       = "YourName"
}`}
        />
        <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900 mb-1">Security Warning:</p>
              <ul className="text-sm text-red-800 space-y-1">
                <li>• Change the default password!</li>
                <li>• Set <code>allowed_ssh_source</code> to your IP address</li>
                <li>• Never commit passwords to Git (use environment variables or Azure Key Vault)</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Step 8: Deploy">
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">1. Get Your Public IP</h4>
            <CommandBlock command="curl -s ifconfig.me" />
            <p className="text-sm text-gray-600 mt-2">
              Update <code>allowed_ssh_source</code> in terraform.tfvars with: YOUR_IP/32
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">2. Initialize Terraform</h4>
            <CommandBlock command="terraform init" />
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">3. Plan Deployment</h4>
            <CommandBlock command="terraform plan" />
            <p className="text-sm text-gray-600 mt-2">
              You should see ~15 resources to create
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">4. Apply Configuration</h4>
            <CommandBlock command="terraform apply" />
            <p className="text-sm text-gray-600 mt-2">
              Takes 3-5 minutes to create all resources and configure the VM
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 mb-2">5. Get Connection Info</h4>
            <CommandBlock command="terraform output ssh_command" />
            <CommandBlock command="terraform output web_url" />
          </div>
        </div>
      </Section>

      <Section title="Step 9: Test Your Network">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">1. Test Web Server</h4>
              <CommandBlock command="curl http://$(terraform output -raw vm_public_ip)" />
              <p className="text-sm text-gray-600 mt-2">
                Or open the URL in your browser
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">2. SSH to VM</h4>
              <CommandBlock command="ssh azureuser@$(terraform output -raw vm_public_ip)" />
              <p className="text-sm text-gray-600 mt-2">
                Use the password from terraform.tfvars
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">3. Check Network Configuration</h4>
              <p className="text-sm text-gray-700 mb-2">Once connected via SSH:</p>
              <CommandBlock command="ip addr show" />
              <CommandBlock command="ip route show" />
            </div>
          </div>

          <div className="flex items-start gap-3 p-4 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">4. Verify NSG Rules</h4>
              <CommandBlock command="az network nsg rule list --resource-group rg-network-demo --nsg-name nsg-web --output table" />
            </div>
          </div>
        </div>
      </Section>

      <Section title="Advanced: Add More Resources">
        <p className="mb-4">
          Expand your network by adding more resources:
        </p>
        <CodeBlock
          language="hcl"
          filename="additions.tf"
          code={`# Azure Bastion for secure SSH access
resource "azurerm_subnet" "bastion" {
  name                 = "AzureBastionSubnet"  # Must be this name
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = ["10.0.250.0/24"]
}

resource "azurerm_public_ip" "bastion" {
  name                = "pip-bastion"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}

resource "azurerm_bastion_host" "main" {
  name                = "bastion-main"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  
  ip_configuration {
    name                 = "configuration"
    subnet_id            = azurerm_subnet.bastion.id
    public_ip_address_id = azurerm_public_ip.bastion.id
  }
}

# Load Balancer for multiple VMs
resource "azurerm_lb" "main" {
  name                = "lb-web"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  sku                 = "Standard"
  
  frontend_ip_configuration {
    name                 = "PublicIPAddress"
    public_ip_address_id = azurerm_public_ip.lb.id
  }
}

resource "azurerm_public_ip" "lb" {
  name                = "pip-lb"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
}`}
        />
      </Section>

      <Section title="Clean Up">
        <CommandBlock command="terraform destroy" />
        <p className="mt-4 text-gray-700">
          This will remove all networking resources and the VM to avoid charges.
        </p>
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> VMs are expensive! Don't forget to destroy resources when done experimenting.
            </p>
          </div>
        </div>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/functions" className="text-blue-600 hover:underline">
          ← Back: Azure Functions
        </Link>
        <Link href="/modules" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Next: Terraform Modules →
        </Link>
      </div>
    </div>
  );
}




