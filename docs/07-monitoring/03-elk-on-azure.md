# Lesson 03: Deploying ELK Stack on Azure

## Learning Objectives
By the end of this lesson, you will:
- Understand Azure infrastructure options for ELK deployment
- Learn to deploy ELK on Azure Virtual Machines using Terraform
- Deploy ELK on Azure Kubernetes Service (AKS)
- Implement Azure-specific optimizations and integrations
- Configure security and networking for ELK on Azure

**Time Estimate:** 90 minutes

## Prerequisites
- Completion of Lessons 01 and 02
- Azure account with subscription
- Azure CLI installed
- Terraform installed (v1.0+)
- Basic understanding of Azure services
- SSH key pair generated

## Table of Contents
1. [Azure Infrastructure Options](#azure-infrastructure-options)
2. [Architecture Design](#architecture-design)
3. [ELK on Azure VMs](#elk-on-azure-vms)
4. [ELK on Azure Kubernetes Service](#elk-on-azure-kubernetes-service)
5. [Azure Integrations](#azure-integrations)
6. [Security Configuration](#security-configuration)
7. [Cost Optimization](#cost-optimization)
8. [Production Best Practices](#production-best-practices)
9. [Troubleshooting](#troubleshooting)

## Azure Infrastructure Options

### Deployment Options Comparison

```yaml
Option 1: Azure VMs
  pros:
    - Full control over configuration
    - No Kubernetes overhead
    - Simple for small deployments
    - Direct VM management
  cons:
    - Manual scaling
    - More operational overhead
    - No built-in orchestration
  best_for:
    - Small to medium deployments
    - Traditional infrastructure teams
    - Specific OS requirements

Option 2: Azure Kubernetes Service (AKS)
  pros:
    - Auto-scaling
    - High availability
    - Container orchestration
    - Easier updates
  cons:
    - Kubernetes complexity
    - Higher resource overhead
    - Learning curve
  best_for:
    - Large-scale deployments
    - Cloud-native teams
    - Microservices architecture

Option 3: Elastic Cloud on Azure
  pros:
    - Fully managed
    - No operations
    - Elastic support
    - Easy to scale
  cons:
    - Higher cost
    - Less control
    - Vendor lock-in
  best_for:
    - Enterprises
    - Limited DevOps resources
    - Quick deployment needs
```

### Azure Services for ELK

```yaml
Compute:
  - Virtual Machines (Standard_D4s_v3, Standard_E8s_v3)
  - Virtual Machine Scale Sets
  - Azure Kubernetes Service (AKS)

Storage:
  - Managed Disks (Premium SSD, Standard SSD)
  - Azure Files (for shared storage)
  - Azure Blob Storage (for snapshots/backups)

Networking:
  - Virtual Network (VNet)
  - Network Security Groups (NSG)
  - Azure Load Balancer
  - Application Gateway
  - Private Link

Security:
  - Azure Active Directory (SSO)
  - Key Vault (secrets management)
  - Azure Firewall
  - DDoS Protection

Monitoring:
  - Azure Monitor
  - Application Insights
  - Log Analytics
```

## Architecture Design

### Small Deployment (< 10 GB/day)

```
┌─────────────────────────────────────────────────────┐
│               Azure Resource Group                  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │           Virtual Network (VNet)              │  │
│  │              10.0.0.0/16                      │  │
│  │                                               │  │
│  │  ┌────────────────────────────────────────┐  │  │
│  │  │  Subnet: elk-subnet (10.0.1.0/24)      │  │  │
│  │  │                                        │  │  │
│  │  │  ┌──────────────┐                     │  │  │
│  │  │  │  ELK VM      │                     │  │  │
│  │  │  │ Standard_D4s │                     │  │  │
│  │  │  ├──────────────┤                     │  │  │
│  │  │  │Elasticsearch │                     │  │  │
│  │  │  │  Logstash    │                     │  │  │
│  │  │  │    Kibana    │                     │  │  │
│  │  │  └──────┬───────┘                     │  │  │
│  │  │         │                             │  │  │
│  │  │  ┌──────┴───────┐                     │  │  │
│  │  │  │ Premium SSD  │                     │  │  │
│  │  │  │    500 GB    │                     │  │  │
│  │  │  └──────────────┘                     │  │  │
│  │  └────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │    Network Security Group                    │  │
│  │  - Allow 22 (SSH) from admin IP              │  │
│  │  - Allow 5601 (Kibana) from VPN              │  │
│  │  - Allow 9200 (ES) from internal only        │  │
│  └──────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Medium Deployment (10-50 GB/day)

```
┌──────────────────────────────────────────────────────────────┐
│                  Azure Resource Group                         │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │              Virtual Network (10.0.0.0/16)               │ │
│  │                                                          │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  Subnet: logstash-subnet (10.0.1.0/24)            │ │ │
│  │  │                                                    │ │ │
│  │  │  ┌────────────┐  ┌────────────┐                  │ │ │
│  │  │  │ Logstash 1 │  │ Logstash 2 │                  │ │ │
│  │  │  │Standard_D4s│  │Standard_D4s│                  │ │ │
│  │  │  └─────┬──────┘  └─────┬──────┘                  │ │ │
│  │  └────────┼───────────────┼─────────────────────────┘ │ │
│  │           │               │                           │ │
│  │  ┌────────┼───────────────┼─────────────────────────┐ │ │
│  │  │  Subnet: elasticsearch-subnet (10.0.2.0/24)     │ │ │
│  │  │        │               │                         │ │ │
│  │  │  ┌─────▼──────┐  ┌────▼───────┐  ┌───────────┐ │ │ │
│  │  │  │   ES 1     │  │   ES 2     │  │   ES 3    │ │ │ │
│  │  │  │(Data+Master│  │(Data+Master│  │ (Master)  │ │ │ │
│  │  │  │Standard_E8s│  │Standard_E8s│  │Standard_D4│ │ │ │
│  │  │  └────────────┘  └────────────┘  └───────────┘ │ │ │
│  │  │                                                 │ │ │
│  │  │  Premium SSD    Premium SSD                    │ │ │
│  │  │    2 TB           2 TB                         │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │                                                       │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  Subnet: kibana-subnet (10.0.3.0/24)           │ │ │
│  │  │                                                 │ │ │
│  │  │  ┌────────────┐  ┌────────────┐               │ │ │
│  │  │  │  Kibana 1  │  │  Kibana 2  │               │ │ │
│  │  │  │Standard_D4s│  │Standard_D4s│               │ │ │
│  │  │  └─────┬──────┘  └─────┬──────┘               │ │ │
│  │  └────────┼───────────────┼─────────────────────────┘ │ │
│  │           │               │                           │ │
│  │  ┌────────▼───────────────▼─────────────────────────┐ │ │
│  │  │      Azure Load Balancer (Internal)              │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │                                                        │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │    Application Gateway (External)                │ │ │
│  │  │    - WAF enabled                                 │ │ │
│  │  │    - SSL termination                             │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## ELK on Azure VMs

### Terraform Configuration

**Directory Structure:**
```
simple-elk-azure/
├── main.tf
├── variables.tf
├── outputs.tf
├── network.tf
├── security.tf
├── compute.tf
├── scripts/
│   ├── install-elasticsearch.sh
│   ├── install-logstash.sh
│   └── install-kibana.sh
└── README.md
```

**Example: main.tf**
```hcl
# Configure Azure Provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
  required_version = ">= 1.0"
}

provider "azurerm" {
  features {}
}

# Resource Group
resource "azurerm_resource_group" "elk" {
  name     = var.resource_group_name
  location = var.location

  tags = {
    Environment = var.environment
    Project     = "ELK-Stack"
    ManagedBy   = "Terraform"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "elk" {
  name                = "${var.prefix}-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name

  tags = azurerm_resource_group.elk.tags
}

# Subnets
resource "azurerm_subnet" "elasticsearch" {
  name                 = "elasticsearch-subnet"
  resource_group_name  = azurerm_resource_group.elk.name
  virtual_network_name = azurerm_virtual_network.elk.name
  address_prefixes     = ["10.0.1.0/24"]
}

resource "azurerm_subnet" "logstash" {
  name                 = "logstash-subnet"
  resource_group_name  = azurerm_resource_group.elk.name
  virtual_network_name = azurerm_virtual_network.elk.name
  address_prefixes     = ["10.0.2.0/24"]
}

resource "azurerm_subnet" "kibana" {
  name                 = "kibana-subnet"
  resource_group_name  = azurerm_resource_group.elk.name
  virtual_network_name = azurerm_virtual_network.elk.name
  address_prefixes     = ["10.0.3.0/24"]
}

# Network Security Group for Elasticsearch
resource "azurerm_network_security_group" "elasticsearch" {
  name                = "${var.prefix}-es-nsg"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name

  # Allow Elasticsearch port from internal network
  security_rule {
    name                       = "Allow-ES-Internal"
    priority                   = 100
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "9200"
    source_address_prefix      = "10.0.0.0/16"
    destination_address_prefix = "*"
  }

  # Allow Elasticsearch transport port from internal
  security_rule {
    name                       = "Allow-ES-Transport"
    priority                   = 110
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "9300"
    source_address_prefix      = "10.0.0.0/16"
    destination_address_prefix = "*"
  }

  # Allow SSH from admin IP
  security_rule {
    name                       = "Allow-SSH"
    priority                   = 120
    direction                  = "Inbound"
    access                     = "Allow"
    protocol                   = "Tcp"
    source_port_range          = "*"
    destination_port_range     = "22"
    source_address_prefix      = var.admin_ip
    destination_address_prefix = "*"
  }

  tags = azurerm_resource_group.elk.tags
}

# Elasticsearch VM
resource "azurerm_linux_virtual_machine" "elasticsearch" {
  count               = var.es_node_count
  name                = "${var.prefix}-es-${count.index + 1}"
  resource_group_name = azurerm_resource_group.elk.name
  location            = azurerm_resource_group.elk.location
  size                = var.es_vm_size
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.elasticsearch[count.index].id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    name                 = "${var.prefix}-es-${count.index + 1}-osdisk"
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

  # Custom data for initial setup
  custom_data = base64encode(templatefile("${path.module}/scripts/elasticsearch-init.sh", {
    es_cluster_name = var.es_cluster_name
    es_node_name    = "${var.prefix}-es-${count.index + 1}"
    es_master_nodes = join(",", [for i in range(var.es_node_count) : "${var.prefix}-es-${i + 1}"])
  }))

  tags = merge(
    azurerm_resource_group.elk.tags,
    {
      Component = "Elasticsearch"
      NodeIndex = count.index + 1
    }
  )
}

# Data Disk for Elasticsearch
resource "azurerm_managed_disk" "elasticsearch_data" {
  count                = var.es_node_count
  name                 = "${var.prefix}-es-${count.index + 1}-datadisk"
  location             = azurerm_resource_group.elk.location
  resource_group_name  = azurerm_resource_group.elk.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = var.es_data_disk_size

  tags = azurerm_resource_group.elk.tags
}

resource "azurerm_virtual_machine_data_disk_attachment" "elasticsearch" {
  count              = var.es_node_count
  managed_disk_id    = azurerm_managed_disk.elasticsearch_data[count.index].id
  virtual_machine_id = azurerm_linux_virtual_machine.elasticsearch[count.index].id
  lun                = 0
  caching            = "ReadWrite"
}

# Network Interface for Elasticsearch
resource "azurerm_network_interface" "elasticsearch" {
  count               = var.es_node_count
  name                = "${var.prefix}-es-${count.index + 1}-nic"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name

  ip_configuration {
    name                          = "internal"
    subnet_id                     = azurerm_subnet.elasticsearch.id
    private_ip_address_allocation = "Dynamic"
  }

  tags = azurerm_resource_group.elk.tags
}

# Associate NSG with NIC
resource "azurerm_network_interface_security_group_association" "elasticsearch" {
  count                     = var.es_node_count
  network_interface_id      = azurerm_network_interface.elasticsearch[count.index].id
  network_security_group_id = azurerm_network_security_group.elasticsearch.id
}

# Internal Load Balancer for Elasticsearch
resource "azurerm_lb" "elasticsearch" {
  name                = "${var.prefix}-es-lb"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name
  sku                 = "Standard"

  frontend_ip_configuration {
    name                          = "elasticsearch-frontend"
    subnet_id                     = azurerm_subnet.elasticsearch.id
    private_ip_address_allocation = "Dynamic"
  }

  tags = azurerm_resource_group.elk.tags
}

resource "azurerm_lb_backend_address_pool" "elasticsearch" {
  loadbalancer_id = azurerm_lb.elasticsearch.id
  name            = "elasticsearch-backend-pool"
}

resource "azurerm_network_interface_backend_address_pool_association" "elasticsearch" {
  count                   = var.es_node_count
  network_interface_id    = azurerm_network_interface.elasticsearch[count.index].id
  ip_configuration_name   = "internal"
  backend_address_pool_id = azurerm_lb_backend_address_pool.elasticsearch.id
}

resource "azurerm_lb_probe" "elasticsearch" {
  loadbalancer_id = azurerm_lb.elasticsearch.id
  name            = "elasticsearch-health-probe"
  port            = 9200
  protocol        = "Http"
  request_path    = "/_cluster/health"
}

resource "azurerm_lb_rule" "elasticsearch" {
  loadbalancer_id                = azurerm_lb.elasticsearch.id
  name                           = "elasticsearch-lb-rule"
  protocol                       = "Tcp"
  frontend_port                  = 9200
  backend_port                   = 9200
  frontend_ip_configuration_name = "elasticsearch-frontend"
  backend_address_pool_ids       = [azurerm_lb_backend_address_pool.elasticsearch.id]
  probe_id                       = azurerm_lb_probe.elasticsearch.id
}
```

**Example: variables.tf**
```hcl
variable "resource_group_name" {
  description = "Name of the resource group"
  type        = string
  default     = "rg-elk-stack"
}

variable "location" {
  description = "Azure region for resources"
  type        = string
  default     = "eastus"
}

variable "prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "elk"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "admin_username" {
  description = "Admin username for VMs"
  type        = string
  default     = "elkadmin"
}

variable "admin_ip" {
  description = "Admin IP address for SSH access"
  type        = string
  # Set this to your IP: "x.x.x.x/32"
}

variable "ssh_public_key_path" {
  description = "Path to SSH public key"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
}

variable "es_node_count" {
  description = "Number of Elasticsearch nodes"
  type        = number
  default     = 3
}

variable "es_vm_size" {
  description = "VM size for Elasticsearch nodes"
  type        = string
  default     = "Standard_E8s_v3" # 8 vCPU, 64 GB RAM
}

variable "es_data_disk_size" {
  description = "Data disk size for Elasticsearch (GB)"
  type        = number
  default     = 1024
}

variable "es_cluster_name" {
  description = "Elasticsearch cluster name"
  type        = string
  default     = "elk-production-cluster"
}

variable "logstash_vm_size" {
  description = "VM size for Logstash nodes"
  type        = string
  default     = "Standard_D4s_v3" # 4 vCPU, 16 GB RAM
}

variable "kibana_vm_size" {
  description = "VM size for Kibana"
  type        = string
  default     = "Standard_D4s_v3" # 4 vCPU, 16 GB RAM
}

variable "elk_version" {
  description = "ELK Stack version"
  type        = string
  default     = "8.11.0"
}
```

### Installation Scripts

**Example: scripts/elasticsearch-init.sh**
```bash
#!/bin/bash
set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Java
apt-get install -y openjdk-11-jdk

# Add Elasticsearch repository
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | apt-key add -
echo "deb https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list

# Install Elasticsearch
apt-get update
apt-get install -y elasticsearch

# Configure Elasticsearch
cat > /etc/elasticsearch/elasticsearch.yml <<EOF
# Cluster configuration
cluster.name: ${es_cluster_name}
node.name: ${es_node_name}

# Paths
path.data: /mnt/data/elasticsearch
path.logs: /var/log/elasticsearch

# Network
network.host: _site_
http.port: 9200
transport.port: 9300

# Discovery
discovery.seed_hosts: [${es_master_nodes}]
cluster.initial_master_nodes: [${es_master_nodes}]

# Security
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.security.transport.ssl.verification_mode: certificate
xpack.security.transport.ssl.keystore.path: elastic-certificates.p12
xpack.security.transport.ssl.truststore.path: elastic-certificates.p12
EOF

# Prepare data directory on attached disk
mkdir -p /mnt/data
mkfs.ext4 /dev/sdc
mount /dev/sdc /mnt/data
echo "/dev/sdc /mnt/data ext4 defaults 0 0" >> /etc/fstab

mkdir -p /mnt/data/elasticsearch
chown -R elasticsearch:elasticsearch /mnt/data/elasticsearch

# Configure JVM options
cat > /etc/elasticsearch/jvm.options.d/heap.options <<EOF
# Set heap size to 50% of RAM (max 31GB)
-Xms16g
-Xmx16g
EOF

# Enable and start Elasticsearch
systemctl daemon-reload
systemctl enable elasticsearch
systemctl start elasticsearch

# Wait for Elasticsearch to start
sleep 30

echo "Elasticsearch installation completed"
```

### VM Size Recommendations

```yaml
Elasticsearch Nodes:
  Small (< 50 GB data):
    vm_size: Standard_D4s_v3
    vcpu: 4
    memory: 16 GB
    disk: Premium SSD 256 GB

  Medium (50-500 GB data):
    vm_size: Standard_E8s_v3
    vcpu: 8
    memory: 64 GB
    disk: Premium SSD 1 TB

  Large (500 GB+ data):
    vm_size: Standard_E16s_v3
    vcpu: 16
    memory: 128 GB
    disk: Premium SSD 4 TB

Logstash Nodes:
  Standard:
    vm_size: Standard_D4s_v3
    vcpu: 4
    memory: 16 GB
    disk: Standard SSD 128 GB

Kibana Nodes:
  Standard:
    vm_size: Standard_D4s_v3
    vcpu: 4
    memory: 16 GB
    disk: Standard SSD 128 GB
```

## ELK on Azure Kubernetes Service

### Prerequisites

```bash
# Install kubectl
az aks install-cli

# Install Helm
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
```

### AKS Cluster with Terraform

```hcl
# AKS Cluster for ELK
resource "azurerm_kubernetes_cluster" "elk" {
  name                = "${var.prefix}-aks"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name
  dns_prefix          = "${var.prefix}-aks"
  kubernetes_version  = "1.28"

  default_node_pool {
    name       = "system"
    node_count = 3
    vm_size    = "Standard_D4s_v3"

    # Enable auto-scaling
    enable_auto_scaling = true
    min_count          = 3
    max_count          = 10

    # OS disk
    os_disk_size_gb = 128
    os_disk_type    = "Managed"

    vnet_subnet_id = azurerm_subnet.aks.id
  }

  # Elasticsearch node pool (memory-optimized)
  # This will be created separately with azurerm_kubernetes_cluster_node_pool

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin    = "azure"
    network_policy    = "azure"
    load_balancer_sku = "standard"
    service_cidr      = "10.1.0.0/16"
    dns_service_ip    = "10.1.0.10"
  }

  tags = azurerm_resource_group.elk.tags
}

# Elasticsearch dedicated node pool
resource "azurerm_kubernetes_cluster_node_pool" "elasticsearch" {
  name                  = "elasticsearch"
  kubernetes_cluster_id = azurerm_kubernetes_cluster.elk.id
  vm_size              = "Standard_E8s_v3"
  node_count           = 3

  enable_auto_scaling = true
  min_count          = 3
  max_count          = 6

  node_labels = {
    "workload" = "elasticsearch"
  }

  node_taints = [
    "workload=elasticsearch:NoSchedule"
  ]

  tags = azurerm_resource_group.elk.tags
}
```

### Deploying ELK on AKS with Helm

```bash
# Add Elastic Helm repository
helm repo add elastic https://helm.elastic.co
helm repo update

# Create namespace
kubectl create namespace elk

# Deploy Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace elk \
  --set replicas=3 \
  --set minimumMasterNodes=2 \
  --set resources.requests.memory=16Gi \
  --set resources.requests.cpu=4 \
  --set volumeClaimTemplate.resources.requests.storage=100Gi \
  --set volumeClaimTemplate.storageClassName=managed-premium \
  --set nodeSelector.workload=elasticsearch \
  --set tolerations[0].key=workload \
  --set tolerations[0].value=elasticsearch \
  --set tolerations[0].effect=NoSchedule

# Deploy Kibana
helm install kibana elastic/kibana \
  --namespace elk \
  --set resources.requests.memory=2Gi \
  --set resources.requests.cpu=1 \
  --set service.type=LoadBalancer

# Deploy Logstash
helm install logstash elastic/logstash \
  --namespace elk \
  --set replicas=2 \
  --set resources.requests.memory=4Gi \
  --set resources.requests.cpu=2
```

### Custom Kubernetes Manifests

**Example: elasticsearch-statefulset.yaml**
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: elasticsearch
  namespace: elk
spec:
  serviceName: elasticsearch
  replicas: 3
  selector:
    matchLabels:
      app: elasticsearch
  template:
    metadata:
      labels:
        app: elasticsearch
    spec:
      # Use dedicated node pool
      nodeSelector:
        workload: elasticsearch
      tolerations:
      - key: workload
        value: elasticsearch
        effect: NoSchedule

      # Anti-affinity to spread pods
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
          - labelSelector:
              matchExpressions:
              - key: app
                operator: In
                values:
                - elasticsearch
            topologyKey: kubernetes.io/hostname

      initContainers:
      # Set vm.max_map_count
      - name: increase-vm-max-map
        image: busybox
        command: ["sysctl", "-w", "vm.max_map_count=262144"]
        securityContext:
          privileged: true

      # Set file descriptor limit
      - name: increase-fd-ulimit
        image: busybox
        command: ["sh", "-c", "ulimit -n 65536"]
        securityContext:
          privileged: true

      containers:
      - name: elasticsearch
        image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
        resources:
          requests:
            memory: "16Gi"
            cpu: "4"
          limits:
            memory: "16Gi"
            cpu: "8"

        ports:
        - containerPort: 9200
          name: http
        - containerPort: 9300
          name: transport

        env:
        - name: cluster.name
          value: "elk-k8s-cluster"
        - name: node.name
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: discovery.seed_hosts
          value: "elasticsearch-0.elasticsearch,elasticsearch-1.elasticsearch,elasticsearch-2.elasticsearch"
        - name: cluster.initial_master_nodes
          value: "elasticsearch-0,elasticsearch-1,elasticsearch-2"
        - name: ES_JAVA_OPTS
          value: "-Xms8g -Xmx8g"
        - name: xpack.security.enabled
          value: "true"

        volumeMounts:
        - name: data
          mountPath: /usr/share/elasticsearch/data

        # Readiness probe
        readinessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 30
          periodSeconds: 10

        # Liveness probe
        livenessProbe:
          httpGet:
            path: /_cluster/health?local=true
            port: 9200
          initialDelaySeconds: 90
          periodSeconds: 30

  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: managed-premium
      resources:
        requests:
          storage: 100Gi
```

## Azure Integrations

### 1. Azure Active Directory (SSO)

```yaml
# Configure Kibana with Azure AD
xpack:
  security:
    authc:
      realms:
        saml:
          azure:
            order: 2
            idp.metadata.path: "https://login.microsoftonline.com/{tenant-id}/federationmetadata/2007-06/federationmetadata.xml"
            idp.entity_id: "https://sts.windows.net/{tenant-id}/"
            sp.entity_id: "https://kibana.example.com/"
            sp.acs: "https://kibana.example.com/api/security/saml/callback"
            attributes.principal: "nameid"
            attributes.groups: "groups"
```

### 2. Azure Key Vault Integration

```hcl
# Store Elasticsearch passwords in Key Vault
resource "azurerm_key_vault" "elk" {
  name                = "${var.prefix}-kv"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name
  tenant_id           = data.azurerm_client_config.current.tenant_id
  sku_name            = "standard"

  access_policy {
    tenant_id = data.azurerm_client_config.current.tenant_id
    object_id = azurerm_linux_virtual_machine.elasticsearch[0].identity[0].principal_id

    secret_permissions = [
      "Get",
      "List"
    ]
  }
}

resource "azurerm_key_vault_secret" "es_password" {
  name         = "elasticsearch-password"
  value        = random_password.es_password.result
  key_vault_id = azurerm_key_vault.elk.id
}
```

### 3. Azure Monitor Integration

```bash
# Ship Azure Monitor logs to ELK
# Using Azure Event Hub as intermediary

# 1. Create Event Hub
az eventhubs namespace create \
  --name elk-eventhub \
  --resource-group rg-elk-stack \
  --location eastus

az eventhubs eventhub create \
  --name logs \
  --namespace-name elk-eventhub \
  --resource-group rg-elk-stack

# 2. Configure Azure Monitor diagnostic settings
az monitor diagnostic-settings create \
  --name send-to-eventhub \
  --resource {resource-id} \
  --event-hub elk-eventhub \
  --event-hub-rule {rule-id} \
  --logs '[{"category": "Administrative", "enabled": true}]'

# 3. Configure Logstash to read from Event Hub
```

**Logstash Event Hub Input:**
```ruby
input {
  azure_event_hubs {
    event_hub_connections => ["${EVENTHUB_CONNECTION_STRING}"]
    threads => 8
    decorate_events => true
    consumer_group => "logstash"
    storage_connection => "${STORAGE_CONNECTION_STRING}"
  }
}

filter {
  json {
    source => "message"
  }

  mutate {
    rename => {
      "resourceId" => "azure_resource_id"
      "category" => "azure_category"
      "operationName" => "azure_operation"
    }
  }
}

output {
  elasticsearch {
    hosts => ["${ES_HOSTS}"]
    index => "azure-monitor-%{+YYYY.MM.dd}"
  }
}
```

### 4. Azure Blob Storage for Snapshots

```yaml
# Elasticsearch snapshot configuration
PUT /_snapshot/azure_backup
{
  "type": "azure",
  "settings": {
    "account": "elkbackupstorage",
    "container": "elasticsearch-snapshots",
    "base_path": "production",
    "compress": true,
    "chunk_size": "256mb"
  }
}

# Create snapshot
PUT /_snapshot/azure_backup/snapshot_1
{
  "indices": "logs-*",
  "ignore_unavailable": true,
  "include_global_state": false
}

# Restore snapshot
POST /_snapshot/azure_backup/snapshot_1/_restore
{
  "indices": "logs-*",
  "ignore_unavailable": true
}
```

## Security Configuration

### Network Security

```hcl
# Network Security Group Rules
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
  resource_group_name         = azurerm_resource_group.elk.name
  network_security_group_name = azurerm_network_security_group.elasticsearch.name
}

# Private Endpoint for Elasticsearch
resource "azurerm_private_endpoint" "elasticsearch" {
  name                = "${var.prefix}-es-pe"
  location            = azurerm_resource_group.elk.location
  resource_group_name = azurerm_resource_group.elk.name
  subnet_id           = azurerm_subnet.private_endpoints.id

  private_service_connection {
    name                           = "${var.prefix}-es-psc"
    private_connection_resource_id = azurerm_lb.elasticsearch.id
    is_manual_connection           = false
  }
}
```

### TLS/SSL Configuration

```yaml
# Generate certificates with elasticsearch-certutil
bin/elasticsearch-certutil ca --pem
bin/elasticsearch-certutil cert --ca elastic-stack-ca.p12

# Elasticsearch TLS configuration
xpack.security.http.ssl.enabled: true
xpack.security.http.ssl.key: /etc/elasticsearch/certs/node.key
xpack.security.http.ssl.certificate: /etc/elasticsearch/certs/node.crt
xpack.security.http.ssl.certificate_authorities: /etc/elasticsearch/certs/ca.crt

# Kibana TLS configuration
server.ssl.enabled: true
server.ssl.certificate: /etc/kibana/certs/kibana.crt
server.ssl.key: /etc/kibana/certs/kibana.key
elasticsearch.ssl.certificateAuthorities: ["/etc/kibana/certs/ca.crt"]
```

## Cost Optimization

### Strategies

```yaml
1. Use Azure Reserved Instances:
   savings: 30-40%
   commitment: 1-3 years
   best_for: Production workloads

2. Use Azure Spot VMs:
   savings: 60-80%
   risk: Can be evicted
   best_for: Non-critical Logstash nodes

3. Implement Hot-Warm-Cold Architecture:
   hot_tier: Premium SSD (recent data)
   warm_tier: Standard SSD (older data)
   cold_tier: Standard HDD (archive)
   savings: 50-70% on storage

4. Auto-scaling:
   scale_down: During off-hours
   scale_up: During peak hours
   savings: 20-40%

5. Data Lifecycle Management:
   retention: 7 days hot, 30 days warm, 90 days cold
   compression: Enable on older indices
   savings: 40-60% on storage
```

### Example Cost Breakdown (Monthly)

```yaml
Small Deployment (10 GB/day):
  elasticsearch: 3x Standard_D4s_v3 = $520
  logstash: 1x Standard_D4s_v3 = $173
  kibana: 1x Standard_D4s_v3 = $173
  storage: 500 GB Premium SSD = $77
  networking: $50
  total: ~$993/month

Medium Deployment (50 GB/day):
  elasticsearch: 3x Standard_E8s_v3 = $1,380
  logstash: 2x Standard_D4s_v3 = $346
  kibana: 2x Standard_D4s_v3 = $346
  storage: 5 TB Premium SSD = $768
  load_balancer: $30
  networking: $150
  total: ~$3,020/month

Large Deployment (200 GB/day):
  elasticsearch: 6x Standard_E16s_v3 = $5,520
  logstash: 4x Standard_D8s_v3 = $1,384
  kibana: 2x Standard_D4s_v3 = $346
  storage: 20 TB Premium SSD = $3,072
  load_balancer: $30
  networking: $500
  total: ~$10,852/month
```

## Production Best Practices

### 1. High Availability

```yaml
Elasticsearch:
  - Minimum 3 nodes
  - Deploy across availability zones
  - Configure proper shard allocation
  - Enable cluster auto-recovery

Configuration:
  cluster.routing.allocation.awareness.attributes: zone
  cluster.routing.allocation.awareness.force.zone.values: zone1,zone2,zone3
  node.attr.zone: zone1  # Different for each node
```

### 2. Backup and Disaster Recovery

```bash
# Configure automated snapshots
PUT /_slm/policy/daily-snapshots
{
  "schedule": "0 2 * * *",
  "name": "<daily-snap-{now/d}>",
  "repository": "azure_backup",
  "config": {
    "indices": ["*"],
    "ignore_unavailable": true,
    "include_global_state": false
  },
  "retention": {
    "expire_after": "30d",
    "min_count": 7,
    "max_count": 30
  }
}
```

### 3. Monitoring and Alerting

```yaml
Monitor:
  - Cluster health status
  - Node availability
  - Disk space utilization
  - JVM heap usage
  - Query performance
  - Indexing rate

Tools:
  - Stack Monitoring (built-in)
  - Azure Monitor
  - Custom alerts in Kibana
```

## Troubleshooting

### Common Issues

#### Issue 1: Elasticsearch Cluster Yellow/Red

```bash
# Check cluster health
GET /_cluster/health?pretty

# Check shard allocation
GET /_cat/shards?v&h=index,shard,prirep,state,unassigned.reason

# Fix unassigned shards
POST /_cluster/reroute?retry_failed=true

# Check disk space
GET /_cat/allocation?v
```

#### Issue 2: High Memory Usage

```bash
# Check JVM heap
GET /_nodes/stats/jvm?pretty

# Clear cache
POST /_cache/clear

# Reduce heap pressure
# - Reduce shard count
# - Increase number of nodes
# - Optimize queries
```

#### Issue 3: Slow Queries

```bash
# Enable slow log
PUT /my-index/_settings
{
  "index.search.slowlog.threshold.query.warn": "10s",
  "index.search.slowlog.threshold.query.info": "5s",
  "index.search.slowlog.threshold.fetch.warn": "1s"
}

# Profile query
GET /my-index/_search
{
  "profile": true,
  "query": { ... }
}
```

## Summary

In this lesson, you learned:

✅ **Azure Infrastructure**: Options for deploying ELK on Azure

✅ **Terraform Deployment**: Infrastructure as Code for ELK on Azure VMs

✅ **AKS Deployment**: Running ELK on Azure Kubernetes Service

✅ **Azure Integrations**: AAD, Key Vault, Monitor, Blob Storage

✅ **Security**: Network security, TLS, private endpoints

✅ **Cost Optimization**: Reserved instances, auto-scaling, lifecycle management

✅ **Production**: High availability, backup, monitoring

## Next Steps

- **Lesson 04**: Deploy ELK on AWS
- **Lesson 05**: Deploy ELK on GCP
- **Examples**: Work through the practical examples in `/examples/elk-stack/`

## Additional Resources

- [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/architecture/framework/)
- [Elastic on Azure Marketplace](https://azuremarketplace.microsoft.com/en-us/marketplace/apps/elastic.elasticsearch)
- [Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/)

---

**Practice Exercise**: Deploy a 3-node Elasticsearch cluster on Azure VMs using the provided Terraform code. Configure TLS, set up automated snapshots to Azure Blob Storage, and create a Kibana dashboard.
