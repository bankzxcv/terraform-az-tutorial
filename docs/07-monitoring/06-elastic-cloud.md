# Lesson 06: Elastic Cloud Deployment with Terraform

## Learning Objectives
By the end of this lesson, you will:
- Understand Elastic Cloud's managed service offering
- Deploy Elastic Cloud using Terraform
- Configure integrations and security
- Optimize costs and performance
- Migrate from self-managed to Elastic Cloud

**Time Estimate:** 60 minutes

## Prerequisites
- Completion of Lessons 01 and 02
- Elastic Cloud account (free trial available)
- Terraform installed (v1.0+)
- Basic understanding of Terraform providers

## Table of Contents
1. [What is Elastic Cloud?](#what-is-elastic-cloud)
2. [Elastic Cloud vs Self-Managed](#elastic-cloud-vs-self-managed)
3. [Deployment with Terraform](#deployment-with-terraform)
4. [Configuration and Tuning](#configuration-and-tuning)
5. [Integrations](#integrations)
6. [Security and Compliance](#security-and-compliance)
7. [Cost Optimization](#cost-optimization)
8. [Migration Strategy](#migration-strategy)
9. [Monitoring and Operations](#monitoring-and-operations)

## What is Elastic Cloud?

Elastic Cloud is the official hosted and managed Elasticsearch, Kibana, and related products service from Elastic.

```yaml
Elastic Cloud Features:
  Managed Services:
    - Elasticsearch
    - Kibana
    - Enterprise Search
    - APM
    - Machine Learning

  Cloud Providers:
    - AWS
    - Azure
    - Google Cloud

  Deployment Options:
    - Standard: Shared infrastructure
    - Hot-Warm: Multi-tier storage
    - I/O Optimized: High-performance
    - Cross-Cluster Replication: Multi-region
    - Cross-Cluster Search: Federated search

  Key Benefits:
    - Zero infrastructure management
    - Automatic updates and patches
    - Built-in security
    - Automated backups
    - 24/7 support
    - SLA guarantees
    - Latest features first
```

## Elastic Cloud vs Self-Managed

### Comparison

```yaml
Elastic Cloud (Managed):
  pros:
    - No infrastructure management
    - Automatic updates
    - Built-in security features
    - Expert support included
    - High availability by default
    - Faster time to value
    - Access to all features
  cons:
    - Higher cost per GB
    - Less control over infrastructure
    - Cloud provider lock-in
    - Regional availability limits
  best_for:
    - Enterprises
    - Teams without DevOps resources
    - Rapid deployment needs
    - Compliance requirements

Self-Managed:
  pros:
    - Full control
    - Lower cost at scale
    - Custom configurations
    - Any infrastructure
  cons:
    - Infrastructure management
    - Security responsibility
    - Update management
    - Expertise required
  best_for:
    - Large-scale deployments
    - On-premises requirements
    - Custom infrastructure needs
    - Cost-sensitive at scale

When to Choose Elastic Cloud:
  ✅ Need quick deployment (hours vs weeks)
  ✅ Limited DevOps resources
  ✅ Want official support
  ✅ Need enterprise features (ML, APM)
  ✅ Compliance requirements (SOC2, HIPAA, PCI-DSS)
  ✅ < 10 TB of data
  ✅ Value time over cost

When to Choose Self-Managed:
  ✅ > 10 TB of data
  ✅ On-premises requirement
  ✅ Have expert team
  ✅ Cost-sensitive
  ✅ Need custom configurations
```

## Deployment with Terraform

### Setup Elastic Cloud Provider

```hcl
# versions.tf
terraform {
  required_version = ">= 1.0"

  required_providers {
    ec = {
      source  = "elastic/ec"
      version = "~> 0.9.0"
    }
  }
}

# Provider configuration
provider "ec" {
  # API key from Elastic Cloud console
  apikey = var.ec_api_key
}
```

### Basic Deployment

```hcl
# main.tf

# Get latest Elastic Stack version
data "ec_stack" "latest" {
  version_regex = "latest"
  region        = var.region
}

# Basic Elastic Cloud deployment
resource "ec_deployment" "main" {
  name                   = var.deployment_name
  version                = data.ec_stack.latest.version
  region                 = var.region
  deployment_template_id = var.deployment_template_id

  # Elasticsearch
  elasticsearch = {
    hot = {
      autoscaling = {}
      size        = "4g"
      zone_count  = 2
    }
  }

  # Kibana
  kibana = {
    size       = "1g"
    zone_count = 1
  }

  # APM (optional)
  apm = {
    size       = "0.5g"
    zone_count = 1
  }

  # Enterprise Search (optional)
  enterprise_search = {
    size       = "2g"
    zone_count = 1
  }
}

# Output connection details
output "elasticsearch_endpoint" {
  value     = ec_deployment.main.elasticsearch.https_endpoint
  sensitive = false
}

output "elasticsearch_username" {
  value = ec_deployment.main.elasticsearch_username
}

output "elasticsearch_password" {
  value     = ec_deployment.main.elasticsearch_password
  sensitive = true
}

output "kibana_endpoint" {
  value = ec_deployment.main.kibana.https_endpoint
}

output "apm_endpoint" {
  value = ec_deployment.main.apm.https_endpoint
}
```

### Production Deployment with Hot-Warm Architecture

```hcl
# production-deployment.tf

resource "ec_deployment" "production" {
  name                   = "${var.environment}-${var.deployment_name}"
  version                = var.stack_version
  region                 = var.region
  deployment_template_id = "aws-io-optimized-v2" # I/O optimized template

  # Elasticsearch - Hot tier
  elasticsearch = {
    hot = {
      autoscaling = {
        max_size          = "64g"
        max_size_per_zone = "32g"
      }
      size        = "16g"
      zone_count  = 3

      # Instance configuration
      instance_configuration_id = "aws.data.highio.i3"
    }

    # Warm tier
    warm = {
      autoscaling = {}
      size        = "8g"
      zone_count  = 2

      instance_configuration_id = "aws.data.highstorage.d3"
    }

    # Cold tier
    cold = {
      autoscaling = {}
      size        = "4g"
      zone_count  = 1

      instance_configuration_id = "aws.data.highstorage.d3"
    }

    # Frozen tier (searchable snapshots)
    frozen = {
      autoscaling = {}
      size        = "2g"
      zone_count  = 1
    }

    # Master nodes
    master = {
      size       = "1g"
      zone_count = 3
    }

    # Coordinating nodes
    coordinating = {
      size       = "2g"
      zone_count = 2
    }

    # Machine Learning
    ml = {
      size       = "4g"
      zone_count = 1
    }

    # Configuration
    config = {
      user_settings_yaml = <<-EOF
        # Custom Elasticsearch configuration
        action.destructive_requires_name: true
        cluster.routing.allocation.disk.watermark.low: 85%
        cluster.routing.allocation.disk.watermark.high: 90%
        cluster.routing.allocation.disk.watermark.flood_stage: 95%

        # Index lifecycle management
        xpack.ilm.enabled: true

        # Monitoring
        xpack.monitoring.collection.enabled: true
      EOF
    }
  }

  # Kibana
  kibana = {
    size       = "2g"
    zone_count = 2

    config = {
      user_settings_yaml = <<-EOF
        # Kibana configuration
        xpack.reporting.enabled: true
        xpack.canvas.enabled: true
        xpack.graph.enabled: true
      EOF
    }
  }

  # APM
  apm = {
    size       = "1g"
    zone_count = 2

    config = {
      user_settings_yaml = <<-EOF
        apm-server:
          rum:
            enabled: true
            event_rate.limit: 300
            allow_origins: ["*"]
      EOF
    }
  }

  # Integrations Server
  integrations_server = {
    size       = "1g"
    zone_count = 1
  }

  # Enterprise Search
  enterprise_search = {
    size       = "4g"
    zone_count = 2

    config = {
      user_settings_yaml = <<-EOF
        ent_search.auth.source: elasticsearch-native
      EOF
    }
  }

  # Traffic filters (IP filtering)
  traffic_filter = [
    ec_deployment_traffic_filter.office.id,
    ec_deployment_traffic_filter.vpn.id
  ]

  # Tags for organization
  tags = {
    environment = var.environment
    team        = var.team
    cost_center = var.cost_center
  }
}

# Traffic filter for IP whitelisting
resource "ec_deployment_traffic_filter" "office" {
  name   = "office-ips"
  region = var.region
  type   = "ip"

  rule {
    source = "203.0.113.0/24" # Office IP range
  }
}

resource "ec_deployment_traffic_filter" "vpn" {
  name   = "vpn-ips"
  region = var.region
  type   = "ip"

  rule {
    source = "198.51.100.0/24" # VPN IP range
  }
}

# Deployment extension (plugin)
resource "ec_deployment_extension" "custom_plugin" {
  name           = "custom-analysis-plugin"
  version        = var.stack_version
  extension_type = "bundle"

  file_path = "path/to/plugin.zip"
  file_hash = filesha256("path/to/plugin.zip")
}
```

### Variables

```hcl
# variables.tf

variable "ec_api_key" {
  description = "Elastic Cloud API key"
  type        = string
  sensitive   = true
}

variable "deployment_name" {
  description = "Deployment name"
  type        = string
  default     = "my-elk-stack"
}

variable "environment" {
  description = "Environment (dev, staging, production)"
  type        = string
  default     = "production"
}

variable "region" {
  description = "Cloud region"
  type        = string
  default     = "aws-us-east-1"

  validation {
    condition = can(regex("^(aws|azure|gcp)-", var.region))
    error_message = "Region must start with aws-, azure-, or gcp-"
  }
}

variable "stack_version" {
  description = "Elastic Stack version"
  type        = string
  default     = "8.11.0"
}

variable "deployment_template_id" {
  description = "Deployment template ID"
  type        = string
  default     = "aws-io-optimized-v2"
}

variable "team" {
  description = "Team name"
  type        = string
  default     = "platform"
}

variable "cost_center" {
  description = "Cost center for billing"
  type        = string
}
```

## Configuration and Tuning

### Index Lifecycle Management (ILM)

```json
// ILM policy for logs
PUT _ilm/policy/logs_policy
{
  "policy": {
    "phases": {
      "hot": {
        "min_age": "0ms",
        "actions": {
          "rollover": {
            "max_size": "50GB",
            "max_age": "1d"
          },
          "set_priority": {
            "priority": 100
          }
        }
      },
      "warm": {
        "min_age": "7d",
        "actions": {
          "shrink": {
            "number_of_shards": 1
          },
          "forcemerge": {
            "max_num_segments": 1
          },
          "set_priority": {
            "priority": 50
          }
        }
      },
      "cold": {
        "min_age": "30d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "found-snapshots"
          },
          "set_priority": {
            "priority": 0
          }
        }
      },
      "frozen": {
        "min_age": "90d",
        "actions": {
          "searchable_snapshot": {
            "snapshot_repository": "found-snapshots",
            "storage": "shared_cache"
          }
        }
      },
      "delete": {
        "min_age": "365d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}

// Apply to index template
PUT _index_template/logs_template
{
  "index_patterns": ["logs-*"],
  "template": {
    "settings": {
      "index.lifecycle.name": "logs_policy",
      "index.lifecycle.rollover_alias": "logs"
    }
  }
}
```

### Autoscaling Configuration

```yaml
# Autoscaling is automatic in Elastic Cloud, but you can tune it

Autoscaling Features:
  machine_learning:
    - Scales based on model memory
    - Min: 0 nodes
    - Max: Configured limit

  data_tiers:
    hot:
      triggers:
        - Storage usage
        - CPU usage
        - Memory pressure
      scale_up: Automatic
      scale_down: After 1 hour of low usage

    warm/cold:
      triggers:
        - Storage usage primarily
      slower_scaling: Cost optimization

Configuration Tips:
  1. Set appropriate max sizes
  2. Monitor scaling events
  3. Adjust based on patterns
  4. Consider predictable growth
```

## Integrations

### 1. Application Integration

**Node.js Example:**
```javascript
// app.js
const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  cloud: {
    id: process.env.ELASTIC_CLOUD_ID
  },
  auth: {
    apiKey: process.env.ELASTIC_API_KEY
  }
});

// Index a document
async function indexLog(log) {
  await client.index({
    index: 'application-logs',
    document: {
      '@timestamp': new Date(),
      level: log.level,
      message: log.message,
      service: 'my-app',
      environment: 'production'
    }
  });
}

// Search logs
async function searchLogs(query) {
  const result = await client.search({
    index: 'application-logs',
    query: {
      match: {
        message: query
      }
    }
  });

  return result.hits.hits;
}

module.exports = { indexLog, searchLogs };
```

### 2. Beats Integration

**Filebeat Configuration:**
```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log
    fields:
      service: my-service
      environment: production

# Elastic Cloud output
cloud.id: "${ELASTIC_CLOUD_ID}"
cloud.auth: "${ELASTIC_CLOUD_AUTH}"

# Or use API key
output.elasticsearch:
  api_key: "${ELASTIC_API_KEY}"

# Processors
processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

# Monitoring
monitoring.enabled: true
```

### 3. APM Integration

**Python Flask Example:**
```python
# app.py
from flask import Flask
from elasticapm.contrib.flask import ElasticAPM

app = Flask(__name__)

app.config['ELASTIC_APM'] = {
    'SERVICE_NAME': 'my-python-service',
    'SECRET_TOKEN': '',  # Not needed with API key
    'SERVER_URL': 'https://your-apm-endpoint.apm.cloud.es.io',
    'API_KEY': 'your-api-key',
    'ENVIRONMENT': 'production'
}

apm = ElasticAPM(app)

@app.route('/')
def index():
    return 'Hello World!'

if __name__ == '__main__':
    app.run()
```

## Security and Compliance

### 1. API Keys

```bash
# Create API key in Kibana or via API
POST /_security/api_key
{
  "name": "my-application-key",
  "role_descriptors": {
    "logs-writer": {
      "cluster": ["monitor"],
      "index": [
        {
          "names": ["logs-*"],
          "privileges": ["create_index", "write"]
        }
      ]
    }
  },
  "metadata": {
    "application": "my-app",
    "environment": "production"
  }
}

# Use in application
export ELASTIC_API_KEY="your-encoded-api-key"
```

### 2. SAML/SSO Configuration

```hcl
# Enable SAML in Terraform
resource "ec_deployment" "main" {
  # ... other configuration ...

  elasticsearch = {
    config = {
      user_settings_yaml = <<-EOF
        xpack.security.authc.realms.saml.saml1:
          order: 2
          idp.metadata.path: "https://your-idp.com/metadata"
          idp.entity_id: "https://your-idp.com"
          sp.entity_id: "https://your-deployment.es.cloud"
          sp.acs: "https://your-deployment.es.cloud/api/security/saml/callback"
          attributes.principal: "nameid"
          attributes.groups: "groups"
      EOF
    }
  }

  kibana = {
    config = {
      user_settings_yaml = <<-EOF
        xpack.security.authc.providers:
          saml.saml1:
            order: 0
            realm: saml1
          basic.basic1:
            order: 1
      EOF
    }
  }
}
```

### 3. Compliance Features

```yaml
Compliance Certifications:
  - SOC 2 Type II
  - ISO 27001
  - HIPAA
  - PCI-DSS
  - GDPR compliant

Features:
  - Encryption at rest (always on)
  - Encryption in transit (TLS 1.2+)
  - Audit logging
  - Role-based access control
  - IP filtering
  - VPC peering (AWS)
  - Private Link (AWS, Azure)

Data Residency:
  - Choose deployment region
  - Data stays in region
  - No cross-border transfers
  - Snapshots in same region
```

## Cost Optimization

### Pricing Model

```yaml
Elastic Cloud Pricing:

Components:
  compute: Based on RAM (primary factor)
  storage: Based on disk space used
  data_transfer: Ingress free, egress charged

Example Pricing (AWS us-east-1):
  elasticsearch:
    hot_tier: $0.156/GB RAM/hour
    warm_tier: $0.052/GB RAM/hour
    cold_tier: $0.026/GB RAM/hour
    frozen_tier: $0.013/GB RAM/hour

  kibana: $0.156/GB RAM/hour
  apm: $0.156/GB RAM/hour
  ml: $0.156/GB RAM/hour

Monthly Cost Examples:

  Small (5 GB/day):
    elasticsearch_hot: 4 GB RAM = ~$450
    kibana: 1 GB RAM = ~$113
    total: ~$563/month

  Medium (50 GB/day):
    elasticsearch_hot: 16 GB RAM = ~$1,800
    elasticsearch_warm: 8 GB RAM = ~$300
    kibana: 2 GB RAM = ~$226
    apm: 1 GB RAM = ~$113
    total: ~$2,439/month

  Large (200 GB/day):
    elasticsearch_hot: 64 GB RAM = ~$7,200
    elasticsearch_warm: 32 GB RAM = ~$1,200
    elasticsearch_cold: 16 GB RAM = ~$300
    kibana: 4 GB RAM = ~$452
    apm: 2 GB RAM = ~$226
    ml: 4 GB RAM = ~$452
    total: ~$9,830/month
```

### Cost Optimization Strategies

```yaml
1. Use Data Tiers:
   hot_data: 7 days
   warm_data: 30 days
   cold_data: 90 days
   frozen_data: 365 days
   savings: 60-70%

2. Autoscaling:
   - Automatically adjust capacity
   - Scale down during off-hours
   - Pay only for what you use
   savings: 20-40%

3. Index Lifecycle Management:
   - Automated rollover
   - Shrink and merge
   - Delete old data
   savings: 30-50%

4. Snapshot and Restore:
   - Archive old data
   - Restore when needed
   - Pay only for storage
   savings: 80-90% for archived data

5. Optimize Ingestion:
   - Filter unnecessary logs
   - Sample high-volume logs
   - Aggregate before indexing
   savings: 40-60% on ingestion

6. Right-sizing:
   - Monitor actual usage
   - Adjust RAM allocation
   - Remove unused features
   savings: 20-30%

7. Reserved Capacity:
   - Annual commitment
   - 20% discount
   savings: 20%
```

## Migration Strategy

### From Self-Managed to Elastic Cloud

```yaml
Migration Steps:

1. Assessment:
   - Current data volume
   - Query patterns
   - Performance requirements
   - Custom configurations
   - Plugins/integrations

2. Planning:
   - Choose deployment template
   - Calculate sizing
   - Plan data tiers
   - Identify dependencies
   - Schedule migration window

3. Preparation:
   - Create Elastic Cloud deployment
   - Configure ILM policies
   - Set up index templates
   - Configure integrations
   - Test connectivity

4. Data Migration:
   Option A - Snapshot/Restore:
     # Create snapshot in self-managed
     PUT /_snapshot/s3_repo/migration_snapshot

     # Restore in Elastic Cloud
     POST /_snapshot/found-snapshots/migration_snapshot/_restore

   Option B - Reindex from Remote:
     POST /_reindex
     {
       "source": {
         "remote": {
           "host": "https://old-cluster:9200"
         },
         "index": "source-index"
       },
       "dest": {
         "index": "destination-index"
       }
     }

   Option C - Dual Indexing:
     - Send data to both clusters
     - Validate in Elastic Cloud
     - Switch over
     - Decommission old cluster

5. Validation:
   - Verify data completeness
   - Test queries
   - Check performance
   - Validate integrations
   - Load testing

6. Cutover:
   - Update DNS/endpoints
   - Switch application configs
   - Monitor closely
   - Keep old cluster as backup

7. Optimization:
   - Tune autoscaling
   - Adjust data tiers
   - Optimize ILM policies
   - Monitor costs
```

## Monitoring and Operations

### Stack Monitoring

```yaml
Built-in Monitoring:
  elasticsearch_metrics:
    - Cluster health
    - Node stats
    - Index stats
    - Search/indexing rates
    - JVM stats

  kibana_metrics:
    - Request rate
    - Response times
    - Memory usage

  apm_metrics:
    - Transaction throughput
    - Error rates
    - Service dependencies

Access: Kibana → Stack Monitoring
```

### Alerting

```javascript
// Create alert in Kibana
{
  "name": "High Error Rate",
  "tags": ["production", "critical"],
  "schedule": {
    "interval": "1m"
  },
  "params": {
    "index": ["logs-*"],
    "timeField": "@timestamp",
    "aggType": "count",
    "groupBy": "all",
    "timeWindowSize": 5,
    "timeWindowUnit": "m",
    "thresholdComparator": ">",
    "threshold": [100]
  },
  "actions": [
    {
      "group": "threshold met",
      "id": "slack-connector",
      "params": {
        "message": "Error rate exceeded threshold"
      }
    }
  ]
}
```

### Backup and Disaster Recovery

```yaml
Automated Snapshots:
  frequency: Every 30 minutes
  retention: 8 days
  storage: Cloud provider storage (S3, GCS, Azure Blob)
  cost: Included in deployment price

Manual Snapshots:
  # Create snapshot
  PUT /_snapshot/found-snapshots/my_snapshot
  {
    "indices": "logs-*",
    "ignore_unavailable": true
  }

  # Restore snapshot
  POST /_snapshot/found-snapshots/my_snapshot/_restore
  {
    "indices": "logs-*",
    "ignore_unavailable": true
  }

Disaster Recovery:
  - Multi-zone deployment (default)
  - Cross-cluster replication (optional)
  - Snapshot export to your storage
  - 99.9% SLA (production deployments)
```

## Summary

✅ **Elastic Cloud**: Fully managed Elasticsearch service

✅ **Terraform**: IaC for Elastic Cloud deployments

✅ **Features**: Hot-warm-cold tiers, autoscaling, ML, APM

✅ **Security**: SAML/SSO, API keys, compliance certifications

✅ **Cost**: Tiering, autoscaling, ILM for optimization

✅ **Migration**: Strategies from self-managed

## Next Steps

- **Lesson 07**: Prometheus + Grafana alternative
- **Lesson 08**: Multi-cloud centralized logging
- **Examples**: Hands-on practice

## Additional Resources

- [Elastic Cloud Documentation](https://www.elastic.co/guide/en/cloud/current/index.html)
- [Elastic Cloud Terraform Provider](https://registry.terraform.io/providers/elastic/ec/latest/docs)
- [Elastic Cloud Pricing](https://www.elastic.co/pricing/)
- [Elastic Cloud Calculator](https://cloud.elastic.co/pricing)

---

**Practice Exercise**: Deploy an Elastic Cloud instance using Terraform with hot-warm-cold architecture. Configure ILM policy, set up API keys, and integrate a sample application.
