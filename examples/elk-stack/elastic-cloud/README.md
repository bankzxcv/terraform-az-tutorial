# Elastic Cloud Deployment with Terraform

This example demonstrates deploying Elastic Cloud (managed Elasticsearch service) using Terraform.

## Overview

Elastic Cloud is the official hosted and managed Elasticsearch, Kibana, and APM service from Elastic. This example shows how to:

- Deploy Elastic Cloud using Terraform
- Configure hot-warm-cold architecture
- Set up API keys and security
- Integrate applications

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Elastic Cloud Deployment                   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Elasticsearch Cluster                     │   │
│  │                                            │   │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────┐ │   │
│  │  │ Hot Tier │  │Warm Tier │  │Cold Tier│ │   │
│  │  │  16 GB   │  │   8 GB   │  │  4 GB   │ │   │
│  │  │  3 zones │  │  2 zones │  │ 1 zone  │ │   │
│  │  └──────────┘  └──────────┘  └─────────┘ │   │
│  │                                            │   │
│  │  Auto-scaling enabled                      │   │
│  │  Snapshots: Every 30 minutes               │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Kibana                                    │   │
│  │  2 GB RAM, 2 zones                         │   │
│  │  HTTPS enabled                             │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  APM                                       │   │
│  │  1 GB RAM, 2 zones                         │   │
│  └────────────────────────────────────────────┘   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Enterprise Search (Optional)              │   │
│  │  4 GB RAM, 2 zones                         │   │
│  └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## Prerequisites

- Elastic Cloud account ([Sign up for free trial](https://cloud.elastic.co/registration))
- Terraform >= 1.0
- API key from Elastic Cloud console

## Getting Started

### 1. Create API Key

1. Log in to [Elastic Cloud Console](https://cloud.elastic.co)
2. Go to **Account** → **API Keys**
3. Click **Create API Key**
4. Copy the API key (you won't see it again!)

### 2. Configure Terraform

```bash
cd examples/elk-stack/elastic-cloud

# Copy example variables
cp terraform.tfvars.example terraform.tfvars

# Edit with your settings
nano terraform.tfvars
```

### 3. Deploy

```bash
# Initialize
terraform init

# Plan
terraform plan

# Apply
terraform apply
```

### 4. Access Deployment

```bash
# Get Elasticsearch endpoint
terraform output elasticsearch_endpoint

# Get Kibana endpoint
terraform output kibana_endpoint

# Get credentials
terraform output elasticsearch_username
terraform output -raw elasticsearch_password
```

## Configuration

### Deployment Templates

```yaml
Available Templates:
  - aws-io-optimized-v2: High I/O performance (SSD)
  - aws-storage-optimized-v2: High storage (HDD)
  - azure-io-optimized-v3: Azure high I/O
  - gcp-io-optimized: GCP high I/O

Hot-Warm-Cold Templates:
  - aws-hot-warm-v2: Two-tier (hot + warm)
  - aws-io-optimized-v2: Three-tier (hot + warm + cold)
```

### Regions

```yaml
AWS:
  - aws-us-east-1
  - aws-us-west-2
  - aws-eu-west-1
  - aws-ap-southeast-2

Azure:
  - azure-eastus2
  - azure-westeurope
  - azure-australiaeast

GCP:
  - gcp-us-central1
  - gcp-europe-west1
  - gcp-asia-northeast1
```

## Features

### Index Lifecycle Management (ILM)

```bash
# Create ILM policy
curl -X PUT "https://your-deployment.es.cloud:443/_ilm/policy/logs_policy" \
  -u elastic:$PASSWORD \
  -H 'Content-Type: application/json' \
  -d @ilm-policy.json
```

See `ilm-policy.json` for example policy.

### API Keys for Applications

```bash
# Create API key via Kibana
# Stack Management → Security → API Keys

# Or via API
curl -X POST "https://your-deployment.es.cloud:443/_security/api_key" \
  -u elastic:$PASSWORD \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "my-app-key",
    "role_descriptors": {
      "my-app-role": {
        "cluster": ["monitor"],
        "index": [{
          "names": ["logs-*"],
          "privileges": ["create_index", "write"]
        }]
      }
    }
  }'
```

### Monitoring

Built-in monitoring available at:
- Kibana → Stack Monitoring
- View cluster health, node stats, index stats
- Set up alerts and notifications

## Integration Examples

### Python Application

```python
from elasticsearch import Elasticsearch

es = Elasticsearch(
    cloud_id="your-cloud-id",
    api_key=("api-key-id", "api-key-secret")
)

# Index a document
es.index(
    index="my-index",
    document={
        "@timestamp": "2025-11-14T10:00:00Z",
        "message": "Hello from Python!",
        "level": "INFO"
    }
)
```

### Node.js Application

```javascript
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
await client.index({
  index: 'my-index',
  document: {
    '@timestamp': new Date(),
    message: 'Hello from Node.js!',
    level: 'INFO'
  }
});
```

### Filebeat Configuration

```yaml
# filebeat.yml
cloud.id: "${CLOUD_ID}"
cloud.auth: "${CLOUD_AUTH}"

filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/*.log

output.elasticsearch:
  # Uses cloud.id and cloud.auth
```

## Cost Management

### Pricing

Example monthly costs (us-east-1):

```yaml
Small (5 GB/day):
  hot: 4 GB RAM = $450
  kibana: 1 GB RAM = $113
  total: ~$563/month

Medium (50 GB/day):
  hot: 16 GB RAM = $1,800
  warm: 8 GB RAM = $300
  kibana: 2 GB RAM = $226
  apm: 1 GB RAM = $113
  total: ~$2,439/month

Large (200 GB/day):
  hot: 64 GB RAM = $7,200
  warm: 32 GB RAM = $1,200
  cold: 16 GB RAM = $300
  kibana: 4 GB RAM = $452
  apm: 2 GB RAM = $226
  ml: 4 GB RAM = $452
  total: ~$9,830/month
```

### Cost Optimization Tips

1. **Use data tiers** - Move old data to warm/cold
2. **Enable autoscaling** - Pay only for what you use
3. **Implement ILM** - Automate data lifecycle
4. **Filter logs** - Don't send unnecessary data
5. **Use index templates** - Optimize settings
6. **Monitor usage** - Track data ingestion rates

## Backup and Restore

```bash
# Snapshots are automatic (every 30 minutes)
# Retained for 8 days

# Manual snapshot
curl -X PUT "https://your-deployment.es.cloud:443/_snapshot/found-snapshots/my_snapshot" \
  -u elastic:$PASSWORD

# Restore
curl -X POST "https://your-deployment.es.cloud:443/_snapshot/found-snapshots/my_snapshot/_restore" \
  -u elastic:$PASSWORD
```

## Migration from Self-Managed

See `migration-guide.md` for detailed instructions on:
- Snapshot and restore method
- Reindex from remote
- Dual indexing approach
- Validation checklist

## Cleanup

```bash
# Destroy deployment
terraform destroy

# Type 'yes' to confirm
```

⚠️ **Warning**: This will permanently delete your Elastic Cloud deployment and all data!

## Troubleshooting

### Deployment failed

```bash
# Check Terraform logs
terraform apply

# Verify API key
echo $ELASTIC_API_KEY

# Check region availability
# Some regions may have capacity constraints
```

### Cannot connect to deployment

```bash
# Verify endpoints
terraform output elasticsearch_endpoint

# Check traffic filters (IP allowlist)
# Elastic Cloud Console → Security

# Test connection
curl -u elastic:$PASSWORD https://your-endpoint
```

## Additional Resources

- [Elastic Cloud Documentation](https://www.elastic.co/guide/en/cloud/current/index.html)
- [Terraform Provider](https://registry.terraform.io/providers/elastic/ec/latest/docs)
- [Pricing Calculator](https://cloud.elastic.co/pricing)
- [Support Portal](https://support.elastic.co/)

---

**Time to Complete**: 10 minutes
**Difficulty**: Beginner
**Cost**: Starts at ~$563/month (free trial available)
