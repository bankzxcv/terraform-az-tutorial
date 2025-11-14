# Lesson 6: VPC Networking - Networks, Subnets, and Firewall Rules

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and manage VPC networks and subnets with Terraform
- Configure firewall rules for network security
- Implement Cloud NAT for private instances
- Set up VPC peering and Shared VPC
- Configure Cloud Load Balancing
- Understand GCP networking best practices

## Prerequisites

- Completed Lessons 1-5
- Compute Engine API enabled
- Understanding of networking concepts (IP addressing, CIDR, firewalls)

## Time Estimate

**90-120 minutes**

---

## GCP Networking Overview

### VPC Networks

Google Cloud VPC (Virtual Private Cloud) provides networking functionality for your GCP resources.

**Key Features:**
- Global resources (span all regions)
- Subnet mode: auto or custom
- Built-in firewall rules
- VPC peering for inter-network communication
- Shared VPC for multi-project networking
- Private Google Access

---

## Creating a Custom VPC Network

### Basic VPC Configuration

```hcl
# main.tf
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Create custom VPC network
resource "google_compute_network" "vpc_network" {
  name                    = "${var.environment}-vpc"
  auto_create_subnetworks = false  # Custom subnets
  routing_mode            = "REGIONAL"  # or "GLOBAL"

  description = "Custom VPC network for ${var.environment} environment"
}

# Create subnet for web tier
resource "google_compute_subnetwork" "web_subnet" {
  name          = "${var.environment}-web-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id

  # Enable Private Google Access
  private_ip_google_access = true

  # Secondary IP ranges (for GKE)
  secondary_ip_range {
    range_name    = "pod-ip-range"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "service-ip-range"
    ip_cidr_range = "10.2.0.0/16"
  }

  # Logging
  log_config {
    aggregation_interval = "INTERVAL_10_MIN"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}

# Create subnet for application tier
resource "google_compute_subnetwork" "app_subnet" {
  name          = "${var.environment}-app-subnet"
  ip_cidr_range = "10.0.2.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id

  private_ip_google_access = true
}

# Create subnet for database tier
resource "google_compute_subnetwork" "db_subnet" {
  name          = "${var.environment}-db-subnet"
  ip_cidr_range = "10.0.3.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id

  private_ip_google_access = true
}

# Output network information
output "network_name" {
  value = google_compute_network.vpc_network.name
}

output "network_id" {
  value = google_compute_network.vpc_network.id
}
```

---

## Firewall Rules

### Basic Firewall Configuration

```hcl
# Allow SSH from specific IP ranges
resource "google_compute_firewall" "allow_ssh" {
  name    = "${var.environment}-allow-ssh"
  network = google_compute_network.vpc_network.name

  description = "Allow SSH from office IPs"

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  # Source IP ranges (your office/VPN)
  source_ranges = var.ssh_source_ranges

  # Target specific instances by tag
  target_tags = ["ssh-enabled"]

  priority = 1000
}

# Allow HTTP/HTTPS from anywhere
resource "google_compute_firewall" "allow_http_https" {
  name    = "${var.environment}-allow-http-https"
  network = google_compute_network.vpc_network.name

  description = "Allow HTTP and HTTPS from internet"

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]

  priority = 1000
}

# Allow internal communication
resource "google_compute_firewall" "allow_internal" {
  name    = "${var.environment}-allow-internal"
  network = google_compute_network.vpc_network.name

  description = "Allow all internal communication within VPC"

  allow {
    protocol = "tcp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "udp"
    ports    = ["0-65535"]
  }

  allow {
    protocol = "icmp"
  }

  # Source from the VPC's CIDR ranges
  source_ranges = [
    google_compute_subnetwork.web_subnet.ip_cidr_range,
    google_compute_subnetwork.app_subnet.ip_cidr_range,
    google_compute_subnetwork.db_subnet.ip_cidr_range,
  ]

  priority = 1000
}

# Deny all other traffic (explicit deny)
resource "google_compute_firewall" "deny_all" {
  name    = "${var.environment}-deny-all"
  network = google_compute_network.vpc_network.name

  description = "Deny all other traffic"

  deny {
    protocol = "all"
  }

  source_ranges = ["0.0.0.0/0"]

  priority = 65535  # Lowest priority
}
```

### Advanced Firewall Rules

```hcl
# Application-specific firewall rules
resource "google_compute_firewall" "allow_app_to_db" {
  name    = "${var.environment}-allow-app-to-db"
  network = google_compute_network.vpc_network.name

  description = "Allow app tier to access database on port 5432"

  allow {
    protocol = "tcp"
    ports    = ["5432"]  # PostgreSQL
  }

  # Source: instances with app-server tag
  source_tags = ["app-server"]

  # Target: instances with db-server tag
  target_tags = ["db-server"]

  priority = 1000
}

# Health check firewall rule
resource "google_compute_firewall" "allow_health_check" {
  name    = "${var.environment}-allow-health-check"
  network = google_compute_network.vpc_network.name

  description = "Allow Google health checks"

  allow {
    protocol = "tcp"
  }

  # Google Cloud health check IP ranges
  source_ranges = [
    "35.191.0.0/16",
    "130.211.0.0/22",
  ]

  target_tags = ["allow-health-check"]

  priority = 1000
}

# Logging firewall rule
resource "google_compute_firewall" "logged_deny" {
  name    = "${var.environment}-logged-deny"
  network = google_compute_network.vpc_network.name

  description = "Deny and log suspicious traffic"

  deny {
    protocol = "tcp"
    ports    = ["3389", "23"]  # RDP and Telnet
  }

  source_ranges = ["0.0.0.0/0"]

  # Enable logging
  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }

  priority = 2000
}
```

---

## Cloud NAT

### NAT for Private Instances

```hcl
# Cloud Router (required for Cloud NAT)
resource "google_compute_router" "nat_router" {
  name    = "${var.environment}-nat-router"
  region  = var.region
  network = google_compute_network.vpc_network.id

  bgp {
    asn = 64514
  }
}

# Cloud NAT configuration
resource "google_compute_router_nat" "nat" {
  name   = "${var.environment}-nat"
  router = google_compute_router.nat_router.name
  region = var.region

  # NAT IP allocation
  nat_ip_allocate_option = "AUTO_ONLY"

  # Which subnets to NAT
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  # Logging
  log_config {
    enable = true
    filter = "ERRORS_ONLY"  # or "TRANSLATIONS_ONLY" or "ALL"
  }

  # Min ports per VM
  min_ports_per_vm = 64

  # Connection timeouts
  tcp_established_idle_timeout_sec = 1200
  tcp_transitory_idle_timeout_sec  = 30
  udp_idle_timeout_sec             = 30
  icmp_idle_timeout_sec            = 30
}

# Alternative: NAT for specific subnets only
resource "google_compute_router_nat" "nat_specific_subnets" {
  name   = "${var.environment}-nat-specific"
  router = google_compute_router.nat_router.name
  region = var.region

  nat_ip_allocate_option = "AUTO_ONLY"

  # Specific subnets
  source_subnetwork_ip_ranges_to_nat = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.app_subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  subnetwork {
    name                    = google_compute_subnetwork.db_subnet.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
```

---

## Cloud Load Balancing

### HTTP(S) Load Balancer

```hcl
# Backend service
resource "google_compute_backend_service" "web_backend" {
  name          = "${var.environment}-web-backend"
  port_name     = "http"
  protocol      = "HTTP"
  timeout_sec   = 10
  health_checks = [google_compute_health_check.http_health_check.id]

  backend {
    group           = google_compute_instance_group_manager.web_group.instance_group
    balancing_mode  = "UTILIZATION"
    capacity_scaler = 1.0
  }

  # CDN configuration
  enable_cdn = true

  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    max_ttl                      = 86400
    negative_caching             = true
    serve_while_stale            = 86400
  }

  # Connection draining
  connection_draining_timeout_sec = 300
}

# Health check
resource "google_compute_health_check" "http_health_check" {
  name               = "${var.environment}-http-health-check"
  check_interval_sec = 10
  timeout_sec        = 5
  healthy_threshold  = 2
  unhealthy_threshold = 3

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

# URL map
resource "google_compute_url_map" "web_url_map" {
  name            = "${var.environment}-web-url-map"
  default_service = google_compute_backend_service.web_backend.id

  # Path-based routing
  host_rule {
    hosts        = ["example.com"]
    path_matcher = "api"
  }

  path_matcher {
    name            = "api"
    default_service = google_compute_backend_service.web_backend.id

    path_rule {
      paths   = ["/api/*"]
      service = google_compute_backend_service.api_backend.id
    }
  }
}

# SSL certificate
resource "google_compute_managed_ssl_certificate" "web_cert" {
  name = "${var.environment}-web-cert"

  managed {
    domains = ["example.com", "www.example.com"]
  }
}

# HTTPS proxy
resource "google_compute_target_https_proxy" "web_https_proxy" {
  name             = "${var.environment}-web-https-proxy"
  url_map          = google_compute_url_map.web_url_map.id
  ssl_certificates = [google_compute_managed_ssl_certificate.web_cert.id]
}

# Global forwarding rule
resource "google_compute_global_forwarding_rule" "web_https_rule" {
  name       = "${var.environment}-web-https-rule"
  target     = google_compute_target_https_proxy.web_https_proxy.id
  port_range = "443"
  ip_address = google_compute_global_address.web_ip.address
}

# Static IP
resource "google_compute_global_address" "web_ip" {
  name = "${var.environment}-web-ip"
}

# HTTP to HTTPS redirect
resource "google_compute_url_map" "https_redirect" {
  name = "${var.environment}-https-redirect"

  default_url_redirect {
    https_redirect         = true
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "http_proxy" {
  name    = "${var.environment}-http-proxy"
  url_map = google_compute_url_map.https_redirect.id
}

resource "google_compute_global_forwarding_rule" "http_rule" {
  name       = "${var.environment}-http-rule"
  target     = google_compute_target_http_proxy.http_proxy.id
  port_range = "80"
  ip_address = google_compute_global_address.web_ip.address
}

output "load_balancer_ip" {
  value = google_compute_global_address.web_ip.address
}
```

---

## VPC Peering

### Connect Two VPC Networks

```hcl
# First VPC network
resource "google_compute_network" "vpc_1" {
  name                    = "vpc-network-1"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet_1" {
  name          = "subnet-1"
  ip_cidr_range = "10.1.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc_1.id
}

# Second VPC network
resource "google_compute_network" "vpc_2" {
  name                    = "vpc-network-2"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "subnet_2" {
  name          = "subnet-2"
  ip_cidr_range = "10.2.0.0/24"
  region        = var.region
  network       = google_compute_network.vpc_2.id
}

# VPC peering: vpc_1 to vpc_2
resource "google_compute_network_peering" "peering_1_to_2" {
  name         = "peering-1-to-2"
  network      = google_compute_network.vpc_1.id
  peer_network = google_compute_network.vpc_2.id

  export_custom_routes = true
  import_custom_routes = true
}

# VPC peering: vpc_2 to vpc_1 (bidirectional)
resource "google_compute_network_peering" "peering_2_to_1" {
  name         = "peering-2-to-1"
  network      = google_compute_network.vpc_2.id
  peer_network = google_compute_network.vpc_1.id

  export_custom_routes = true
  import_custom_routes = true
}
```

---

## Private Service Connection

### Connect to Google Services

```hcl
# Reserve IP range for private service connection
resource "google_compute_global_address" "private_ip_range" {
  name          = "private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc_network.id
}

# Create private connection to Google services
resource "google_service_networking_connection" "private_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}
```

---

## Complete Example: Three-Tier Architecture

```hcl
# Three-tier network architecture

# VPC Network
resource "google_compute_network" "three_tier_vpc" {
  name                    = "three-tier-vpc"
  auto_create_subnetworks = false
  routing_mode            = "REGIONAL"
}

# Web tier subnet (public)
resource "google_compute_subnetwork" "web_tier" {
  name          = "web-tier-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.three_tier_vpc.id
}

# App tier subnet (private)
resource "google_compute_subnetwork" "app_tier" {
  name                     = "app-tier-subnet"
  ip_cidr_range            = "10.0.2.0/24"
  region                   = var.region
  network                  = google_compute_network.three_tier_vpc.id
  private_ip_google_access = true
}

# Database tier subnet (private)
resource "google_compute_subnetwork" "db_tier" {
  name                     = "db-tier-subnet"
  ip_cidr_range            = "10.0.3.0/24"
  region                   = var.region
  network                  = google_compute_network.three_tier_vpc.id
  private_ip_google_access = true
}

# Firewall: Internet to web tier
resource "google_compute_firewall" "internet_to_web" {
  name    = "internet-to-web"
  network = google_compute_network.three_tier_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-tier"]
}

# Firewall: Web to app tier
resource "google_compute_firewall" "web_to_app" {
  name    = "web-to-app"
  network = google_compute_network.three_tier_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["8080"]
  }

  source_tags = ["web-tier"]
  target_tags = ["app-tier"]
}

# Firewall: App to database tier
resource "google_compute_firewall" "app_to_db" {
  name    = "app-to-db"
  network = google_compute_network.three_tier_vpc.name

  allow {
    protocol = "tcp"
    ports    = ["5432"]
  }

  source_tags = ["app-tier"]
  target_tags = ["db-tier"]
}

# Cloud NAT for private tiers
resource "google_compute_router" "three_tier_router" {
  name    = "three-tier-router"
  region  = var.region
  network = google_compute_network.three_tier_vpc.id
}

resource "google_compute_router_nat" "three_tier_nat" {
  name   = "three-tier-nat"
  router = google_compute_router.three_tier_router.name
  region = var.region

  nat_ip_allocate_option              = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat  = "LIST_OF_SUBNETWORKS"

  subnetwork {
    name                    = google_compute_subnetwork.app_tier.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }

  subnetwork {
    name                    = google_compute_subnetwork.db_tier.id
    source_ip_ranges_to_nat = ["ALL_IP_RANGES"]
  }
}
```

---

## Best Practices for DevSecOps

### 1. Use Custom VPC Networks

```hcl
# Good: Custom VPC with controlled subnets
resource "google_compute_network" "custom_vpc" {
  name                    = "custom-vpc"
  auto_create_subnetworks = false  # Full control
}

# Bad: Auto mode VPC (less control)
resource "google_compute_network" "auto_vpc" {
  name                    = "auto-vpc"
  auto_create_subnetworks = true  # Avoid in production
}
```

### 2. Implement Defense in Depth

```hcl
# Multiple layers of security
# 1. Network isolation (separate subnets)
# 2. Firewall rules (least privilege)
# 3. Cloud NAT (no public IPs on private instances)
# 4. Private Google Access (access GCP services privately)
```

### 3. Enable Flow Logs

```hcl
resource "google_compute_subnetwork" "monitored_subnet" {
  name          = "monitored-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc_network.id

  log_config {
    aggregation_interval = "INTERVAL_5_SEC"
    flow_sampling        = 0.5
    metadata             = "INCLUDE_ALL_METADATA"
  }
}
```

### 4. Use Firewall Logging

```hcl
resource "google_compute_firewall" "logged_rule" {
  name    = "logged-firewall-rule"
  network = google_compute_network.vpc_network.name

  allow {
    protocol = "tcp"
    ports    = ["22"]
  }

  source_ranges = ["0.0.0.0/0"]

  log_config {
    metadata = "INCLUDE_ALL_METADATA"
  }
}
```

---

## Summary

You've learned:
- Creating custom VPC networks and subnets
- Configuring firewall rules for security
- Implementing Cloud NAT for private instances
- Setting up load balancing
- VPC peering and private service connections

### Key Takeaways

1. Use custom VPC networks for production
2. Implement least privilege firewall rules
3. Use Cloud NAT for outbound internet from private instances
4. Enable flow logs for network monitoring
5. Use Private Google Access for GCP service access

---

## Next Steps

**Lesson 7: Cloud SQL** - Managed databases, private IP, backups, high availability

---

**Previous:** [Lesson 5: Cloud Functions](05-cloud-functions.md)
**Next:** [Lesson 7: Cloud SQL](07-cloud-sql.md)
