# Lesson 08: Multi-Cloud Centralized Logging

## Learning Objectives
By the end of this lesson, you will:
- Understand centralized logging for multi-cloud environments
- Design a unified logging architecture across AWS, Azure, and GCP
- Implement log shipping from multiple clouds to a central ELK stack
- Configure cross-cloud security and networking
- Optimize costs for multi-cloud logging

**Time Estimate:** 90 minutes

## Prerequisites
- Completion of Lessons 01-07
- Understanding of AWS, Azure, and GCP
- Network security knowledge
- Terraform experience

## Table of Contents
1. [Multi-Cloud Logging Challenges](#multi-cloud-logging-challenges)
2. [Architecture Patterns](#architecture-patterns)
3. [Centralized ELK Deployment](#centralized-elk-deployment)
4. [Log Shipping from Each Cloud](#log-shipping-from-each-cloud)
5. [Security and Networking](#security-and-networking)
6. [Cost Optimization](#cost-optimization)
7. [Observability Strategy](#observability-strategy)
8. [Implementation Example](#implementation-example)

## Multi-Cloud Logging Challenges

### Common Challenges

```yaml
1. Data Silos:
   problem: Logs scattered across clouds
   impact: Difficult troubleshooting
   solution: Centralized aggregation

2. Different Native Tools:
   aws: CloudWatch Logs
   azure: Azure Monitor
   gcp: Cloud Logging
   problem: Inconsistent interfaces
   solution: Unified platform (ELK/Splunk)

3. Network Complexity:
   problem: Cross-cloud connectivity
   challenges:
     - VPN/VPC peering
     - Bandwidth costs
     - Latency
   solution: Strategic placement

4. Cost Management:
   problem: Data transfer costs
   aws_egress: $0.09/GB
   azure_egress: $0.087/GB
   gcp_egress: $0.12/GB
   solution: Filtering, compression, regional hubs

5. Security and Compliance:
   problem: Data governance
   challenges:
     - Encryption in transit
     - Data residency
     - Access control
   solution: End-to-end encryption, RBAC

6. Format Inconsistency:
   problem: Different log formats
   solution: Normalization with Logstash
```

## Architecture Patterns

### Pattern 1: Hub-and-Spoke (Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                     AWS Account                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │ EC2 Logs │  │ECS Logs  │  │RDS Logs  │             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
│       └─────────────┼─────────────┘                    │
│                     ▼                                   │
│           ┌──────────────────┐                         │
│           │  Regional Hub    │                         │
│           │  (Filebeat/      │                         │
│           │   Logstash)      │                         │
│           └────────┬─────────┘                         │
└────────────────────┼─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│                    ▼        Azure Subscription          │
│           ┌──────────────────┐                         │
│           │  Regional Hub    │                         │
│           │  (Filebeat/      │                         │
│           │   Logstash)      │                         │
│           └────────▲─────────┘                         │
│                    │                                   │
│       ┌────────────┴────────────┐                     │
│  ┌────┴─────┐  ┌──────────┐  ┌─┴────────┐            │
│  │  VM Logs │  │AKS Logs  │  │SQL Logs  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└────────────────────┼─────────────────────────────────────┘
                     │
┌────────────────────┼─────────────────────────────────────┐
│                    ▼         GCP Project                │
│           ┌──────────────────┐                         │
│           │  Regional Hub    │                         │
│           │  (Filebeat/      │                         │
│           │   Logstash)      │                         │
│           └────────▲─────────┘                         │
│                    │                                   │
│       ┌────────────┴────────────┐                     │
│  ┌────┴─────┐  ┌──────────┐  ┌─┴────────┐            │
│  │  GCE Logs│  │GKE Logs  │  │SQL Logs  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└────────────────────┼─────────────────────────────────────┘
                     │
                     │ VPN/Interconnect
                     │
         ┌───────────▼──────────────┐
         │   Central ELK Cluster    │
         │   (Neutral Cloud or      │
         │    Dedicated DC)         │
         │                          │
         │  ┌──────────────────┐   │
         │  │ Elasticsearch    │   │
         │  │   (Multi-node)   │   │
         │  └──────────────────┘   │
         │                          │
         │  ┌──────────────────┐   │
         │  │     Kibana       │   │
         │  └──────────────────┘   │
         └──────────────────────────┘

Benefits:
  - Reduced data transfer costs
  - Regional filtering/processing
  - Lower latency
  - Better resilience

Considerations:
  - More infrastructure
  - Additional hop
  - Complexity
```

### Pattern 2: Direct Shipping

```
All Sources → Central ELK

Pros:
  - Simple architecture
  - Fewer components
  - Direct connectivity

Cons:
  - Higher data transfer costs
  - Single point of failure
  - Higher latency

Best for:
  - Small deployments
  - Single region
  - Cost is not primary concern
```

### Pattern 3: Hybrid (Metrics + Logs Separation)

```
Metrics: Keep local (Prometheus per cloud)
Logs: Centralized (ELK)
Dashboards: Unified (Grafana with multiple sources)

Benefits:
  - Optimized for each use case
  - Lower costs (metrics stay local)
  - Faster queries

Example:
  aws_metrics: CloudWatch + Prometheus
  azure_metrics: Azure Monitor + Prometheus
  gcp_metrics: Cloud Monitoring + Prometheus
  all_logs: → Central ELK
  visualization: Grafana (connects to all)
```

## Centralized ELK Deployment

### Deployment Location Decision

```yaml
Option 1: Neutral Cloud Provider
  choose: AWS (if already using Azure and GCP)
  pros:
    - No vendor preference
    - Leverage cloud services
    - Easier to scale
  cons:
    - Still in one cloud
    - Data transfer costs from other clouds

Option 2: On-Premises / Colo
  pros:
    - Full control
    - Equal distance from all clouds
    - No cloud lock-in
  cons:
    - Infrastructure management
    - Scaling challenges
    - Higher upfront cost

Option 3: Elastic Cloud
  pros:
    - Managed service
    - Available on all clouds
    - Easy to deploy
  cons:
    - Higher cost
    - Still choose primary region

Recommendation:
  small_scale: Elastic Cloud
  medium_scale: Neutral cloud provider
  large_scale: Dedicated infrastructure
```

### Terraform: Central ELK on AWS

```hcl
# central-elk/main.tf

provider "aws" {
  region = var.central_region
}

# VPC for central ELK
resource "aws_vpc" "central_elk" {
  cidr_block           = "10.100.0.0/16"
  enable_dns_hostnames = true

  tags = {
    Name = "central-elk-vpc"
    Type = "centralized-logging"
  }
}

# Subnets across multiple AZs
resource "aws_subnet" "elk_private" {
  count             = 3
  vpc_id            = aws_vpc.central_elk.id
  cidr_block        = cidrsubnet(aws_vpc.central_elk.cidr_block, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "elk-private-${count.index + 1}"
  }
}

# Elasticsearch cluster
module "elasticsearch" {
  source = "./modules/elasticsearch"

  cluster_name   = "central-logging"
  vpc_id         = aws_vpc.central_elk.id
  subnet_ids     = aws_subnet.elk_private[*].id
  instance_type  = "r5.2xlarge"
  instance_count = 6

  data_volume_size = 2000 # GB per node

  tags = {
    Environment = "production"
    Purpose     = "centralized-logging"
  }
}

# Logstash for processing
module "logstash" {
  source = "./modules/logstash"

  vpc_id         = aws_vpc.central_elk.id
  subnet_ids     = aws_subnet.elk_private[*].id
  instance_type  = "m5.xlarge"
  instance_count = 4

  elasticsearch_endpoint = module.elasticsearch.endpoint

  tags = {
    Environment = "production"
    Purpose     = "log-processing"
  }
}

# VPN connections to other clouds
resource "aws_vpn_gateway" "central" {
  vpc_id = aws_vpc.central_elk.id

  tags = {
    Name = "central-elk-vpn-gw"
  }
}

# Customer gateways for Azure and GCP
resource "aws_customer_gateway" "azure" {
  bgp_asn    = 65000
  ip_address = var.azure_vpn_gateway_ip
  type       = "ipsec.1"

  tags = {
    Name = "azure-customer-gateway"
  }
}

resource "aws_customer_gateway" "gcp" {
  bgp_asn    = 65001
  ip_address = var.gcp_vpn_gateway_ip
  type       = "ipsec.1"

  tags = {
    Name = "gcp-customer-gateway"
  }
}

# VPN connections
resource "aws_vpn_connection" "azure" {
  vpn_gateway_id      = aws_vpn_gateway.central.id
  customer_gateway_id = aws_customer_gateway.azure.id
  type                = "ipsec.1"
  static_routes_only  = false

  tags = {
    Name = "aws-to-azure-vpn"
  }
}

resource "aws_vpn_connection" "gcp" {
  vpn_gateway_id      = aws_vpn_gateway.central.id
  customer_gateway_id = aws_customer_gateway.gcp.id
  type                = "ipsec.1"
  static_routes_only  = false

  tags = {
    Name = "aws-to-gcp-vpn"
  }
}
```

## Log Shipping from Each Cloud

### From AWS (CloudWatch → ELK)

```hcl
# aws-log-shipper/main.tf

# Lambda function to ship CloudWatch logs to central ELK
resource "aws_lambda_function" "cloudwatch_to_elk" {
  filename      = "cloudwatch_shipper.zip"
  function_name = "cloudwatch-to-elk"
  role          = aws_iam_role.lambda_elk_shipper.arn
  handler       = "index.handler"
  runtime       = "python3.11"
  timeout       = 60

  environment {
    variables = {
      ELK_ENDPOINT = var.elk_endpoint
      ELK_USERNAME = var.elk_username
      ELK_PASSWORD = data.aws_secretsmanager_secret_version.elk_password.secret_string
    }
  }
}

# CloudWatch Logs subscription
resource "aws_cloudwatch_log_subscription_filter" "elk" {
  for_each        = toset(var.log_groups)
  name            = "elk-shipper"
  log_group_name  = each.value
  filter_pattern  = ""
  destination_arn = aws_lambda_function.cloudwatch_to_elk.arn
}
```

**Lambda Function (Python):**
```python
# cloudwatch_shipper.py
import json
import gzip
import base64
import os
from elasticsearch import Elasticsearch

elk_endpoint = os.environ['ELK_ENDPOINT']
es = Elasticsearch(
    [elk_endpoint],
    http_auth=(os.environ['ELK_USERNAME'], os.environ['ELK_PASSWORD']),
    scheme="https",
    port=443,
)

def handler(event, context):
    # Decode and decompress CloudWatch logs
    compressed_payload = base64.b64decode(event['awslogs']['data'])
    uncompressed_payload = gzip.decompress(compressed_payload)
    log_data = json.loads(uncompressed_payload)

    # Bulk index to Elasticsearch
    actions = []
    for log_event in log_data['logEvents']:
        actions.append({
            "index": {
                "_index": f"aws-logs-{log_data['logGroup'].replace('/', '-').lower()}",
                "_id": log_event['id']
            }
        })
        actions.append({
            "timestamp": log_event['timestamp'],
            "message": log_event['message'],
            "log_group": log_data['logGroup'],
            "log_stream": log_data['logStream'],
            "cloud": "aws",
            "account_id": log_data['owner']
        })

    if actions:
        es.bulk(body=actions)

    return {
        'statusCode': 200,
        'body': json.dumps(f'Processed {len(log_data["logEvents"])} log events')
    }
```

### From Azure (Azure Monitor → ELK)

```hcl
# azure-log-shipper/main.tf

# Event Hub for log streaming
resource "azurerm_eventhub_namespace" "logs" {
  name                = "logs-eventhub-ns"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "Standard"
}

resource "azurerm_eventhub" "logs" {
  name                = "logs"
  namespace_name      = azurerm_eventhub_namespace.logs.name
  resource_group_name = var.resource_group_name
  partition_count     = 4
  message_retention   = 1
}

# Diagnostic settings to send logs to Event Hub
resource "azurerm_monitor_diagnostic_setting" "example" {
  for_each           = toset(var.resource_ids)
  name               = "send-to-elk"
  target_resource_id = each.value
  eventhub_name      = azurerm_eventhub.logs.name
  eventhub_authorization_rule_id = azurerm_eventhub_namespace_authorization_rule.logs.id

  log {
    category = "Administrative"
    enabled  = true

    retention_policy {
      enabled = false
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = false
    }
  }
}

# Logstash on VM to consume Event Hub
resource "azurerm_linux_virtual_machine" "logstash" {
  name                = "logstash-azure"
  resource_group_name = var.resource_group_name
  location            = var.location
  size                = "Standard_D4s_v3"
  admin_username      = var.admin_username

  # ... network interface, SSH key, etc.

  custom_data = base64encode(templatefile("${path.module}/scripts/logstash-eventhub.sh", {
    eventhub_connection_string = azurerm_eventhub_namespace.logs.default_primary_connection_string
    elk_endpoint               = var.central_elk_endpoint
  }))
}
```

**Logstash Configuration for Event Hub:**
```ruby
# logstash-eventhub.conf
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
    add_field => { "cloud" => "azure" }
    add_field => { "[@metadata][index]" => "azure-logs-%{+YYYY.MM.dd}" }
  }

  # Parse Azure-specific fields
  if [resourceId] {
    grok {
      match => {
        "resourceId" => "/subscriptions/%{DATA:subscription_id}/resourceGroups/%{DATA:resource_group}/providers/%{DATA:resource_provider}/.*"
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["${ELK_ENDPOINT}:9200"]
    user => "${ELK_USERNAME}"
    password => "${ELK_PASSWORD}"
    index => "%{[@metadata][index]}"
    ssl => true
  }
}
```

### From GCP (Cloud Logging → ELK)

```hcl
# gcp-log-shipper/main.tf

# Pub/Sub topic for logs
resource "google_pubsub_topic" "logs" {
  name = "logs-to-elk"
}

# Logging sink
resource "google_logging_project_sink" "elk" {
  name        = "elk-sink"
  destination = "pubsub.googleapis.com/${google_pubsub_topic.logs.id}"

  filter = "severity >= WARNING OR resource.type = gce_instance"

  unique_writer_identity = true
}

# Grant Pub/Sub publisher role to logging sink
resource "google_pubsub_topic_iam_member" "logs" {
  topic  = google_pubsub_topic.logs.name
  role   = "roles/pubsub.publisher"
  member = google_logging_project_sink.elk.writer_identity
}

# Compute instance running Filebeat
resource "google_compute_instance" "logstash" {
  name         = "logstash-gcp"
  machine_type = "n2-standard-4"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "ubuntu-os-cloud/ubuntu-2204-lts"
    }
  }

  network_interface {
    network = "default"
  }

  metadata_startup_script = templatefile("${path.module}/scripts/logstash-pubsub.sh", {
    project_id    = var.project_id
    subscription  = google_pubsub_subscription.logs.name
    elk_endpoint  = var.central_elk_endpoint
  })

  service_account {
    scopes = ["cloud-platform"]
  }
}

# Subscription for the topic
resource "google_pubsub_subscription" "logs" {
  name  = "logs-elk-subscription"
  topic = google_pubsub_topic.logs.name

  ack_deadline_seconds = 20

  message_retention_duration = "604800s"
  retain_acked_messages      = false

  expiration_policy {
    ttl = ""
  }
}
```

**Logstash Configuration for Pub/Sub:**
```ruby
# logstash-pubsub.conf
input {
  google_pubsub {
    project_id => "${PROJECT_ID}"
    topic => "logs-to-elk"
    subscription => "logs-elk-subscription"
    json_key_file => "/etc/logstash/gcp-key.json"
  }
}

filter {
  json {
    source => "message"
  }

  mutate {
    add_field => { "cloud" => "gcp" }
    add_field => { "[@metadata][index]" => "gcp-logs-%{+YYYY.MM.dd}" }
  }

  # Parse GCP log format
  if [resource] {
    mutate {
      add_field => {
        "resource_type" => "%{[resource][type]}"
        "project_id" => "%{[resource][labels][project_id]}"
      }
    }
  }
}

output {
  elasticsearch {
    hosts => ["${ELK_ENDPOINT}:9200"]
    user => "${ELK_USERNAME}"
    password => "${ELK_PASSWORD}"
    index => "%{[@metadata][index]}"
    ssl => true
  }
}
```

## Security and Networking

### Network Architecture

```yaml
Cross-Cloud Connectivity Options:

1. VPN (Site-to-Site):
   aws: AWS VPN Gateway
   azure: Azure VPN Gateway
   gcp: Cloud VPN
   pros: Encrypted, reliable
   cons: Lower throughput (1.25 Gbps typical)
   cost: ~$36/month per connection

2. Dedicated Interconnect:
   aws: Direct Connect
   azure: ExpressRoute
   gcp: Cloud Interconnect
   pros: High throughput, lower latency
   cons: Higher cost, longer setup
   cost: $300-3000/month

3. Third-party SD-WAN:
   providers: CloudFlare, Megaport
   pros: Simplified management
   cons: Additional cost

Recommendation:
  start: VPN
  scale: Dedicated interconnect
```

### Encryption

```yaml
Encryption in Transit:
  filebeat_to_logstash: TLS 1.3
  logstash_to_elasticsearch: HTTPS
  vpn_tunnels: IPSec
  certificate_management: Let's Encrypt or ACM

Encryption at Rest:
  elasticsearch_indices: Encrypted volumes
  aws: EBS encryption
  azure: Disk encryption
  gcp: Default encryption

Secrets Management:
  aws: AWS Secrets Manager
  azure: Key Vault
  gcp: Secret Manager
  terraform: Encrypted state
```

### Access Control

```yaml
Network Level:
  security_groups: Whitelist IPs
  firewall_rules: Deny all, allow specific
  private_endpoints: No public access

Application Level:
  elasticsearch:
    - X-Pack security
    - TLS certificates
    - Role-based access

  kibana:
    - SAML/OAuth
    - Multi-tenancy
    - Audit logging

  api_keys:
    - Per-service keys
    - Least privilege
    - Regular rotation
```

## Cost Optimization

### Data Transfer Costs

```yaml
Typical Costs (per GB):
  aws_egress: $0.09
  azure_egress: $0.087
  gcp_egress: $0.12
  vpn_ingress: Free

Example: 100 GB/day from each cloud

  aws: 100 GB/day × 30 days × $0.09 = $270/month
  azure: 100 GB/day × 30 days × $0.087 = $261/month
  gcp: 100 GB/day × 30 days × $0.12 = $360/month
  total_transfer: $891/month

Optimization:
  1. Filter at source: -50% = $445/month
  2. Compress (gzip): -60% = $356/month
  3. Sample high-volume: -70% = $267/month
  4. Regional hubs: -30% = $624/month
```

### Total Cost of Ownership

```yaml
Monthly Costs (Medium Scale - 300 GB/day):

Infrastructure:
  central_elk_cluster: $2,500
  regional_hubs (3): $900
  vpn_connections (2): $72

Data Transfer:
  optimized: $300

Storage:
  hot_tier (7 days): $200
  warm_tier (30 days): $150
  cold_tier (90 days): $100

Total: ~$4,222/month

vs. Elastic Cloud:
  ~$6,000/month

vs. Separate per Cloud:
  aws_cloudwatch: $2,000
  azure_monitor: $1,800
  gcp_logging: $2,200
  total: $6,000
  (but no unified view)
```

## Observability Strategy

### Unified Data Model

```json
{
  "@timestamp": "2025-11-14T10:30:00.000Z",
  "cloud": {
    "provider": "aws|azure|gcp",
    "region": "us-east-1",
    "account_id": "123456789",
    "resource_id": "/subscriptions/.../resourceGroups/..."
  },
  "service": {
    "name": "api-gateway",
    "version": "1.2.3",
    "environment": "production"
  },
  "log": {
    "level": "ERROR",
    "message": "Database connection failed"
  },
  "trace": {
    "id": "abc123",
    "span_id": "def456"
  },
  "custom": {
    // Application-specific fields
  }
}
```

### Kibana Spaces

```yaml
Organization:
  space_aws: AWS-specific logs
  space_azure: Azure-specific logs
  space_gcp: GCP-specific logs
  space_unified: Cross-cloud correlation
  space_security: Security events from all clouds
  space_compliance: Audit logs

Access Control:
  aws_team: Read AWS space
  azure_team: Read Azure space
  platform_team: Read all spaces
  security_team: Read security space
```

## Implementation Example

See `/examples/elk-stack/centralized-logging/` for complete implementation with:

- Terraform code for all three clouds
- VPN setup between clouds
- Log shipping configurations
- Unified dashboards
- Cost optimization examples

## Summary

✅ **Multi-Cloud**: Centralized logging across AWS, Azure, GCP

✅ **Architecture**: Hub-and-spoke pattern for cost optimization

✅ **Shipping**: Cloud-native integration (CloudWatch, Monitor, Logging)

✅ **Security**: VPN, encryption, access control

✅ **Cost**: Optimization strategies for data transfer

## Next Steps

- **Examples**: Implement hands-on projects
- **Production**: Deploy to your environment
- **Monitor**: Track costs and performance

## Additional Resources

- [Multi-Cloud Architecture Patterns](https://www.hashicorp.com/resources/multi-cloud-architecture-patterns)
- [Cross-Cloud Networking Best Practices](https://cloud.google.com/architecture/best-practices-vpc-design)

---

**Practice Exercise**: Design a centralized logging architecture for a multi-cloud environment with specific SLAs, cost targets, and security requirements.
