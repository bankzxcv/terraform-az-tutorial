# Lesson 07: Prometheus + Grafana Alternative

## Learning Objectives
By the end of this lesson, you will:
- Understand Prometheus and Grafana as an alternative to ELK
- Deploy Prometheus and Grafana using Terraform
- Configure service discovery and scraping
- Create effective dashboards and alerts
- Compare with ELK for different use cases

**Time Estimate:** 75 minutes

## Prerequisites
- Completion of Lesson 01
- Understanding of metrics vs logs
- Basic knowledge of PromQL
- Terraform installed (v1.0+)

## Table of Contents
1. [Prometheus + Grafana Overview](#prometheus--grafana-overview)
2. [When to Use Prometheus vs ELK](#when-to-use-prometheus-vs-elk)
3. [Architecture Design](#architecture-design)
4. [Deployment with Terraform](#deployment-with-terraform)
5. [Configuration and Scraping](#configuration-and-scraping)
6. [Grafana Dashboards](#grafana-dashboards)
7. [Alerting with Alertmanager](#alerting-with-alertmanager)
8. [Long-term Storage](#long-term-storage)
9. [Best Practices](#best-practices)

## Prometheus + Grafana Overview

### The Stack

```yaml
Prometheus:
  purpose: Metrics collection and storage
  type: Time-series database
  data_model: Metrics with labels
  query_language: PromQL
  storage: Local or remote

Grafana:
  purpose: Visualization and dashboards
  type: Analytics platform
  data_sources: Prometheus, Loki, Elasticsearch, etc.
  features: Dashboards, alerts, plugins
  authentication: LDAP, OAuth, SAML

Loki (Optional):
  purpose: Log aggregation
  type: Log database
  integration: Works with Prometheus/Grafana
  query_language: LogQL (similar to PromQL)
```

### Complete Stack Architecture

```
┌─────────────────────────────────────────────────────┐
│           Application Infrastructure                 │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  App 1   │  │  App 2   │  │  App 3   │         │
│  │ /metrics │  │ /metrics │  │ /metrics │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
└───────┼─────────────┼─────────────┼────────────────┘
        │             │             │
        │             │             │ HTTP scrape
        │             │             │
┌───────▼─────────────▼─────────────▼────────────────┐
│              Prometheus Server                      │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐                │
│  │   Scraper   │  │ Time Series  │                │
│  │             │  │   Database   │                │
│  └─────────────┘  └──────────────┘                │
│                                                     │
│  ┌─────────────┐  ┌──────────────┐                │
│  │   PromQL    │  │    Rules     │                │
│  │   Engine    │  │   Engine     │                │
│  └─────────────┘  └──────────────┘                │
└──────────┬─────────────────┬─────────────┬─────────┘
           │                 │             │
           │                 │             │
           ▼                 ▼             ▼
    ┌──────────┐      ┌──────────┐  ┌──────────┐
    │ Grafana  │      │Alertmgr  │  │  Remote  │
    │Dashboards│      │          │  │ Storage  │
    └──────────┘      └──────────┘  └──────────┘
```

## When to Use Prometheus vs ELK

### Comparison Matrix

```yaml
Prometheus + Grafana:
  strengths:
    - Excellent for metrics
    - Efficient time-series storage
    - Pull-based (service discovery)
    - Cloud-native (Kubernetes)
    - Lower resource usage
    - Simple deployment
  weaknesses:
    - Not designed for logs
    - Limited full-text search
    - Local storage limitations
    - No built-in log shipping
  best_for:
    - Metrics and monitoring
    - Kubernetes environments
    - Infrastructure monitoring
    - Alert-heavy workloads
    - Cost-sensitive deployments
  use_cases:
    - System metrics
    - Application metrics
    - Service health
    - Performance monitoring

ELK Stack:
  strengths:
    - Powerful log search
    - Full-text analysis
    - Rich querying (DSL)
    - Log aggregation
    - Security analytics
  weaknesses:
    - Resource intensive
    - Complex at scale
    - Higher costs
    - Steeper learning curve
  best_for:
    - Log analytics
    - Security operations
    - Debugging
    - Audit logging
    - Business analytics
  use_cases:
    - Application logs
    - Security events
    - Audit trails
    - User behavior analytics

Hybrid Approach (Best of Both):
  metrics: Prometheus
  logs: Loki or ELK
  visualization: Grafana
  benefits:
    - Optimized for each use case
    - Cost-effective
    - Unified visualization
  example:
    - Prometheus for metrics
    - Loki for logs
    - Grafana for both
```

## Architecture Design

### Small Deployment

```
┌────────────────────────────────────────────┐
│           Single Server                     │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │         Prometheus                   │ │
│  │  - Scraping                          │ │
│  │  - Storage (15 days retention)       │ │
│  │  - Alerting rules                    │ │
│  │  Port: 9090                          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │         Grafana                      │ │
│  │  - Dashboards                        │ │
│  │  - Data source: Prometheus           │ │
│  │  Port: 3000                          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │      Alertmanager                    │ │
│  │  - Alert routing                     │ │
│  │  - Notifications                     │ │
│  │  Port: 9093                          │ │
│  └──────────────────────────────────────┘ │
└────────────────────────────────────────────┘
```

### Production Deployment (HA)

```
┌──────────────────────────────────────────────────────┐
│              Load Balancer                            │
│         (Queries and Dashboards)                      │
└────────────┬─────────────────────┬────────────────────┘
             │                     │
    ┌────────▼──────┐     ┌───────▼────────┐
    │  Prometheus 1 │     │  Prometheus 2  │
    │  (Zone A)     │     │  (Zone B)      │
    │               │     │                │
    │  Scraping     │     │  Scraping      │
    │  Storage      │     │  Storage       │
    └───────┬───────┘     └────────┬───────┘
            │                      │
            │    ┌─────────────────┘
            │    │
            ▼    ▼
    ┌──────────────────┐
    │  Remote Storage  │
    │  (Thanos/Cortex) │
    └──────────────────┘

    ┌──────────────────┐     ┌──────────────────┐
    │    Grafana 1     │     │    Grafana 2     │
    │    (Zone A)      │     │    (Zone B)      │
    └──────────────────┘     └──────────────────┘

    ┌──────────────────────────────────────────┐
    │         Alertmanager Cluster             │
    │  ┌────────┐  ┌────────┐  ┌────────┐    │
    │  │  AM 1  │  │  AM 2  │  │  AM 3  │    │
    │  │Zone A  │  │Zone B  │  │Zone C  │    │
    │  └────────┘  └────────┘  └────────┘    │
    └──────────────────────────────────────────┘
```

## Deployment with Terraform

### Azure Deployment Example

```hcl
# main.tf

resource "azurerm_resource_group" "monitoring" {
  name     = "${var.prefix}-monitoring-rg"
  location = var.location
}

# Virtual Network
resource "azurerm_virtual_network" "monitoring" {
  name                = "${var.prefix}-monitoring-vnet"
  address_space       = ["10.0.0.0/16"]
  location            = azurerm_resource_group.monitoring.location
  resource_group_name = azurerm_resource_group.monitoring.name
}

resource "azurerm_subnet" "monitoring" {
  name                 = "monitoring-subnet"
  resource_group_name  = azurerm_resource_group.monitoring.name
  virtual_network_name = azurerm_virtual_network.monitoring.name
  address_prefixes     = ["10.0.1.0/24"]
}

# Prometheus VM
resource "azurerm_linux_virtual_machine" "prometheus" {
  name                = "${var.prefix}-prometheus"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  size                = "Standard_D4s_v3"
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.prometheus.id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/scripts/prometheus-init.sh", {
    prometheus_version = var.prometheus_version
    retention_days     = var.retention_days
  }))
}

# Grafana VM
resource "azurerm_linux_virtual_machine" "grafana" {
  name                = "${var.prefix}-grafana"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  size                = "Standard_D2s_v3"
  admin_username      = var.admin_username

  network_interface_ids = [
    azurerm_network_interface.grafana.id,
  ]

  admin_ssh_key {
    username   = var.admin_username
    public_key = file(var.ssh_public_key_path)
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "Canonical"
    offer     = "0001-com-ubuntu-server-jammy"
    sku       = "22_04-lts-gen2"
    version   = "latest"
  }

  custom_data = base64encode(templatefile("${path.module}/scripts/grafana-init.sh", {
    grafana_version    = var.grafana_version
    prometheus_url     = "http://${azurerm_network_interface.prometheus.private_ip_address}:9090"
    admin_password     = var.grafana_admin_password
  }))
}

# Application Gateway for Grafana
resource "azurerm_application_gateway" "grafana" {
  name                = "${var.prefix}-grafana-appgw"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location

  sku {
    name     = "Standard_v2"
    tier     = "Standard_v2"
    capacity = 2
  }

  gateway_ip_configuration {
    name      = "gateway-ip-config"
    subnet_id = azurerm_subnet.appgw.id
  }

  frontend_port {
    name = "https"
    port = 443
  }

  frontend_ip_configuration {
    name                 = "frontend-ip"
    public_ip_address_id = azurerm_public_ip.appgw.id
  }

  backend_address_pool {
    name = "grafana-backend-pool"
    ip_addresses = [
      azurerm_network_interface.grafana.private_ip_address
    ]
  }

  backend_http_settings {
    name                  = "grafana-http-settings"
    cookie_based_affinity = "Disabled"
    port                  = 3000
    protocol              = "Http"
    request_timeout       = 60
  }

  http_listener {
    name                           = "grafana-listener"
    frontend_ip_configuration_name = "frontend-ip"
    frontend_port_name             = "https"
    protocol                       = "Https"
    ssl_certificate_name           = "grafana-cert"
  }

  request_routing_rule {
    name                       = "grafana-routing-rule"
    rule_type                  = "Basic"
    http_listener_name         = "grafana-listener"
    backend_address_pool_name  = "grafana-backend-pool"
    backend_http_settings_name = "grafana-http-settings"
    priority                   = 100
  }

  ssl_certificate {
    name     = "grafana-cert"
    data     = filebase64(var.ssl_certificate_path)
    password = var.ssl_certificate_password
  }
}
```

### Installation Scripts

**scripts/prometheus-init.sh:**
```bash
#!/bin/bash
set -e

# Create prometheus user
useradd --no-create-home --shell /bin/false prometheus

# Download Prometheus
cd /tmp
wget https://github.com/prometheus/prometheus/releases/download/v${prometheus_version}/prometheus-${prometheus_version}.linux-amd64.tar.gz
tar xzf prometheus-${prometheus_version}.linux-amd64.tar.gz
cd prometheus-${prometheus_version}.linux-amd64

# Install binaries
cp prometheus /usr/local/bin/
cp promtool /usr/local/bin/
chown prometheus:prometheus /usr/local/bin/prometheus
chown prometheus:prometheus /usr/local/bin/promtool

# Create directories
mkdir -p /etc/prometheus
mkdir -p /var/lib/prometheus
chown prometheus:prometheus /var/lib/prometheus

# Install console files
cp -r consoles /etc/prometheus
cp -r console_libraries /etc/prometheus
chown -R prometheus:prometheus /etc/prometheus

# Configuration
cat > /etc/prometheus/prometheus.yml <<EOF
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    region: 'azure-eastus'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

# Load rules
rule_files:
  - "alerts/*.yml"

# Scrape configurations
scrape_configs:
  # Prometheus itself
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  # Node Exporter
  - job_name: 'node'
    static_configs:
      - targets: ['localhost:9100']

  # Azure Service Discovery
  - job_name: 'azure'
    azure_sd_configs:
      - subscription_id: '$AZURE_SUBSCRIPTION_ID'
        tenant_id: '$AZURE_TENANT_ID'
        client_id: '$AZURE_CLIENT_ID'
        client_secret: '$AZURE_CLIENT_SECRET'
        refresh_interval: 5m
    relabel_configs:
      - source_labels: [__meta_azure_machine_tag_monitoring]
        regex: enabled
        action: keep
EOF

chown prometheus:prometheus /etc/prometheus/prometheus.yml

# Systemd service
cat > /etc/systemd/system/prometheus.service <<EOF
[Unit]
Description=Prometheus
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus/ \\
  --storage.tsdb.retention.time=${retention_days}d \\
  --web.console.templates=/etc/prometheus/consoles \\
  --web.console.libraries=/etc/prometheus/console_libraries \\
  --web.enable-lifecycle

Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable prometheus
systemctl start prometheus

# Install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz
tar xzf node_exporter-1.7.0.linux-amd64.tar.gz
cp node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/
chown prometheus:prometheus /usr/local/bin/node_exporter

cat > /etc/systemd/system/node_exporter.service <<EOF
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=prometheus
Group=prometheus
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable node_exporter
systemctl start node_exporter

echo "Prometheus installation completed"
```

**scripts/grafana-init.sh:**
```bash
#!/bin/bash
set -e

# Install Grafana
apt-get install -y software-properties-common
add-apt-repository "deb https://packages.grafana.com/oss/deb stable main"
wget -q -O - https://packages.grafana.com/gpg.key | apt-key add -
apt-get update
apt-get install -y grafana=${grafana_version}

# Configure Grafana
cat > /etc/grafana/grafana.ini <<EOF
[server]
protocol = http
http_port = 3000
domain = grafana.example.com

[security]
admin_user = admin
admin_password = ${admin_password}

[auth.anonymous]
enabled = false

[auth.basic]
enabled = true

[users]
allow_sign_up = false

[log]
mode = console file
level = info

[database]
type = sqlite3
path = grafana.db
EOF

# Provision Prometheus data source
mkdir -p /etc/grafana/provisioning/datasources
cat > /etc/grafana/provisioning/datasources/prometheus.yml <<EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: ${prometheus_url}
    isDefault: true
    editable: false
    jsonData:
      timeInterval: '15s'
EOF

# Start Grafana
systemctl daemon-reload
systemctl enable grafana-server
systemctl start grafana-server

echo "Grafana installation completed"
```

## Configuration and Scraping

### Service Discovery

**Kubernetes Service Discovery:**
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod

    relabel_configs:
      # Only scrape pods with annotation
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true

      # Use custom path if specified
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)

      # Use custom port if specified
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

      # Add pod labels
      - action: labelmap
        regex: __meta_kubernetes_pod_label_(.+)
```

### Recording Rules

```yaml
# /etc/prometheus/rules/recording.yml
groups:
  - name: instance_metrics
    interval: 30s
    rules:
      # CPU usage
      - record: instance:cpu_usage:rate5m
        expr: 100 - (avg by (instance) (irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)

      # Memory usage
      - record: instance:memory_usage:percentage
        expr: 100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))

      # Disk usage
      - record: instance:disk_usage:percentage
        expr: 100 * (1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes))

  - name: aggregated_metrics
    interval: 1m
    rules:
      # Total requests across all instances
      - record: job:http_requests:rate5m
        expr: sum by (job) (rate(http_requests_total[5m]))

      # Error rate
      - record: job:http_errors:rate5m
        expr: sum by (job) (rate(http_requests_total{status=~"5.."}[5m]))
```

## Grafana Dashboards

### Dashboard as Code (JSON)

```json
{
  "dashboard": {
    "title": "System Overview",
    "tags": ["infrastructure", "system"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "instance:cpu_usage:rate5m",
            "legendFormat": "{{instance}}"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 0,
          "y": 0
        }
      },
      {
        "id": 2,
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "instance:memory_usage:percentage",
            "legendFormat": "{{instance}}"
          }
        ],
        "gridPos": {
          "h": 8,
          "w": 12,
          "x": 12,
          "y": 0
        }
      }
    ]
  }
}
```

### Provision Dashboards with Terraform

```hcl
# grafana_dashboard.tf

resource "grafana_dashboard" "system_overview" {
  config_json = file("${path.module}/dashboards/system-overview.json")
  folder      = grafana_folder.infrastructure.id
}

resource "grafana_folder" "infrastructure" {
  title = "Infrastructure"
}
```

## Alerting with Alertmanager

### Alert Rules

```yaml
# /etc/prometheus/alerts/alerts.yml
groups:
  - name: instance_alerts
    rules:
      - alert: InstanceDown
        expr: up == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Instance {{ $labels.instance }} down"
          description: "{{ $labels.instance }} has been down for more than 5 minutes"

      - alert: HighCPUUsage
        expr: instance:cpu_usage:rate5m > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High CPU usage on {{ $labels.instance }}"
          description: "CPU usage is {{ $value }}% on {{ $labels.instance }}"

      - alert: HighMemoryUsage
        expr: instance:memory_usage:percentage > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High memory usage on {{ $labels.instance }}"

      - alert: DiskSpaceLow
        expr: instance:disk_usage:percentage > 85
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Disk space low on {{ $labels.instance }}"
```

### Alertmanager Configuration

```yaml
# /etc/alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m
  slack_api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'

route:
  receiver: 'default'
  group_by: ['alertname', 'cluster']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h

  routes:
    # Critical alerts to PagerDuty
    - match:
        severity: critical
      receiver: pagerduty
      continue: true

    # Warnings to Slack
    - match:
        severity: warning
      receiver: slack

receivers:
  - name: 'default'
    email_configs:
      - to: 'team@example.com'
        from: 'alertmanager@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alertmanager'
        auth_password: 'password'

  - name: 'slack'
    slack_configs:
      - channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty'
    pagerduty_configs:
      - service_key: 'YOUR_PAGERDUTY_KEY'
```

## Long-term Storage

### Thanos Setup

```yaml
# Thanos provides long-term storage for Prometheus

Components:
  thanos_sidecar: Runs with Prometheus, uploads to object storage
  thanos_store: Queries historical data from object storage
  thanos_query: Unified query interface
  thanos_compact: Compacts and downsamples data
  thanos_ruler: Evaluates rules on historical data

Benefits:
  - Unlimited retention
  - Global query view
  - High availability
  - Cost-effective storage (S3, GCS, Azure Blob)
```

**Thanos Sidecar Configuration:**
```yaml
# prometheus.yml with Thanos
global:
  external_labels:
    cluster: production
    replica: 1

# Start with sidecar
prometheus \\
  --config.file=/etc/prometheus/prometheus.yml \\
  --storage.tsdb.path=/var/lib/prometheus \\
  --storage.tsdb.min-block-duration=2h \\
  --storage.tsdb.max-block-duration=2h

thanos sidecar \\
  --tsdb.path=/var/lib/prometheus \\
  --prometheus.url=http://localhost:9090 \\
  --objstore.config-file=/etc/thanos/bucket.yml \\
  --grpc-address=0.0.0.0:10901
```

## Best Practices

```yaml
1. Label Naming:
   - Use consistent naming
   - job: Service name
   - instance: Host:port
   - environment: prod/staging/dev
   - region: Geographic location

2. Cardinality:
   - Avoid high-cardinality labels
   - Don't use user IDs, request IDs in labels
   - Use recording rules for aggregation

3. Scrape Intervals:
   - Default: 15s
   - High-frequency: 5s
   - Low-frequency: 1m
   - Match your use case

4. Retention:
   - Local: 15-30 days
   - Remote: Unlimited with Thanos/Cortex
   - Balance cost vs. query performance

5. HA Setup:
   - Multiple Prometheus instances
   - Same scrape targets
   - Deduplication in query layer

6. Security:
   - TLS for all components
   - Authentication (basic auth, OAuth)
   - Network isolation
   - Secrets in vault

7. Performance:
   - Use recording rules
   - Limit query ranges
   - Optimize label cardinality
   - Monitor Prometheus itself
```

## Summary

✅ **Prometheus**: Metrics collection and time-series database

✅ **Grafana**: Visualization and dashboards

✅ **Comparison**: When to use vs ELK

✅ **Deployment**: Terraform automation

✅ **Alerting**: Comprehensive alert setup

✅ **Best Practices**: Production-ready configurations

## Next Steps

- **Lesson 08**: Multi-cloud centralized logging
- **Examples**: Hands-on practice with sample deployments

## Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [PromQL Guide](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Awesome Prometheus](https://github.com/roaldnefs/awesome-prometheus)

---

**Practice Exercise**: Deploy Prometheus and Grafana on a cloud platform. Configure service discovery, create custom dashboards, and set up alerting with Alertmanager.
