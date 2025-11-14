# Simple ELK Stack on Azure VMs

This example deploys a simple ELK (Elasticsearch, Logstash, Kibana) stack on Azure Virtual Machines for learning and development purposes.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Azure Resource Group                       │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │         Virtual Network (10.0.0.0/16)         │ │
│  │                                               │ │
│  │  ┌────────────────────────────────────────┐  │ │
│  │  │  Subnet: elk-subnet (10.0.1.0/24)      │  │ │
│  │  │                                        │  │ │
│  │  │  ┌──────────────────────┐             │  │ │
│  │  │  │   ELK VM             │             │  │ │
│  │  │  │   Standard_D4s_v3    │             │  │ │
│  │  │  ├──────────────────────┤             │  │ │
│  │  │  │  Elasticsearch:9200  │             │  │ │
│  │  │  │  Logstash:5044       │             │  │ │
│  │  │  │  Kibana:5601         │             │  │ │
│  │  │  └──────────┬───────────┘             │  │ │
│  │  │             │                          │  │ │
│  │  │  ┌──────────▼────────┐                │  │ │
│  │  │  │  Managed Disk     │                │  │ │
│  │  │  │  Premium SSD      │                │  │ │
│  │  │  │  500 GB           │                │  │ │
│  │  │  └───────────────────┘                │  │ │
│  │  └────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

## Components

- **Elasticsearch**: Search and analytics engine (Port 9200)
- **Logstash**: Data processing pipeline (Port 5044)
- **Kibana**: Visualization dashboard (Port 5601)
- **Filebeat**: Log shipper (running on the same VM)

## Prerequisites

- Azure subscription
- Azure CLI installed and configured
- Terraform >= 1.0
- SSH key pair (`~/.ssh/id_rsa.pub`)

## Costs

Estimated monthly cost: **~$170**

- VM: Standard_D4s_v3 (4 vCPU, 16 GB RAM) - ~$140/month
- Managed Disk: 500 GB Premium SSD - ~$77/month
- Network: Minimal cost
- **Total**: ~$217/month (East US region)

> **Note**: This is for development/learning. Not recommended for production use.

## Quick Start

### 1. Clone and Configure

```bash
cd examples/elk-stack/simple-elk-azure

# Copy and edit variables
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

### 2. Deploy

```bash
# Initialize Terraform
terraform init

# Review plan
terraform plan

# Deploy
terraform apply
```

### 3. Access

After deployment (5-10 minutes):

```bash
# Get the public IP
terraform output kibana_url

# Example: http://20.123.45.67:5601
```

Open the Kibana URL in your browser.

### 4. Test Log Ingestion

SSH into the VM and send test logs:

```bash
# SSH into VM
ssh azureuser@$(terraform output -raw vm_public_ip)

# Send test log
echo '{"message": "Test log from simple-elk-azure", "level": "INFO"}' | \
  /usr/share/filebeat/bin/filebeat -e -c /etc/filebeat/filebeat.yml -once

# View in Kibana
# 1. Open Kibana in browser
# 2. Go to "Discover"
# 3. Create index pattern: filebeat-*
# 4. Search for your test log
```

## Configuration

### Terraform Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `resource_group_name` | Resource group name | `rg-simple-elk` |
| `location` | Azure region | `eastus` |
| `vm_size` | VM size | `Standard_D4s_v3` |
| `data_disk_size_gb` | Data disk size | `500` |
| `admin_username` | VM admin username | `azureuser` |
| `ssh_public_key_path` | SSH public key path | `~/.ssh/id_rsa.pub` |
| `elk_version` | ELK stack version | `8.11.0` |
| `allow_ssh_from` | Source IP for SSH | Your IP |

### Elasticsearch Configuration

Located at: `/etc/elasticsearch/elasticsearch.yml`

```yaml
cluster.name: simple-elk-cluster
node.name: elk-node-1
path.data: /mnt/elk-data/elasticsearch
network.host: 0.0.0.0
http.port: 9200
discovery.type: single-node
xpack.security.enabled: false  # Simplified for learning
```

### Logstash Configuration

Located at: `/etc/logstash/conf.d/logstash.conf`

```ruby
input {
  beats {
    port => 5044
  }
}

filter {
  if [message] =~ /^{.*}$/ {
    json {
      source => "message"
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "%{[@metadata][beat]}-%{+YYYY.MM.dd}"
  }
}
```

### Kibana Configuration

Located at: `/etc/kibana/kibana.yml`

```yaml
server.port: 5601
server.host: "0.0.0.0"
elasticsearch.hosts: ["http://localhost:9200"]
```

## Usage Examples

### 1. Index Sample Data

```bash
# Create sample logs
cat > /tmp/sample-logs.json <<EOF
{"@timestamp":"2025-11-14T10:00:00Z","level":"INFO","service":"web","message":"User login successful"}
{"@timestamp":"2025-11-14T10:01:00Z","level":"ERROR","service":"api","message":"Database connection failed"}
{"@timestamp":"2025-11-14T10:02:00Z","level":"WARN","service":"worker","message":"Queue size exceeds threshold"}
EOF

# Index via Logstash
cat /tmp/sample-logs.json | \
  nc localhost 5000  # Assuming you add a tcp input on 5000
```

### 2. Query Elasticsearch

```bash
# Get cluster health
curl http://localhost:9200/_cluster/health?pretty

# Search all documents
curl http://localhost:9200/_search?pretty

# Search with query
curl -X GET "localhost:9200/filebeat-*/_search?pretty" -H 'Content-Type: application/json' -d'
{
  "query": {
    "match": {
      "level": "ERROR"
    }
  }
}
'
```

### 3. Create Kibana Visualizations

1. Open Kibana: `http://<VM_IP>:5601`
2. Go to **Stack Management** → **Index Patterns**
3. Create pattern: `filebeat-*`
4. Go to **Discover** to explore logs
5. Create visualizations in **Visualize Library**
6. Build dashboards in **Dashboard**

## Monitoring

### Check Services Status

```bash
# SSH into VM
ssh azureuser@<VM_IP>

# Check all services
sudo systemctl status elasticsearch
sudo systemctl status logstash
sudo systemctl status kibana
sudo systemctl status filebeat

# View logs
sudo journalctl -u elasticsearch -f
sudo journalctl -u logstash -f
sudo journalctl -u kibana -f
```

### Resource Usage

```bash
# Disk usage
df -h /mnt/elk-data

# Elasticsearch stats
curl localhost:9200/_nodes/stats?pretty

# Logstash stats
curl localhost:9600/_node/stats?pretty
```

## Troubleshooting

### Elasticsearch won't start

```bash
# Check logs
sudo journalctl -u elasticsearch -n 100

# Common issues:
# 1. Insufficient memory - increase vm.max_map_count
sudo sysctl -w vm.max_map_count=262144

# 2. Disk space - check available space
df -h

# 3. Permission issues
sudo chown -R elasticsearch:elasticsearch /mnt/elk-data/elasticsearch
```

### Kibana connection refused

```bash
# Check if Elasticsearch is running
curl http://localhost:9200

# Check Kibana logs
sudo journalctl -u kibana -n 100

# Restart Kibana
sudo systemctl restart kibana
```

### Logs not appearing

```bash
# Check Filebeat status
sudo systemctl status filebeat

# Test Filebeat to Logstash connection
sudo /usr/share/filebeat/bin/filebeat test output

# Check Logstash is receiving data
curl http://localhost:9600/_node/stats/pipelines?pretty
```

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

Type `yes` when prompted.

## Security Considerations

⚠️ **This is a simplified setup for learning purposes only!**

For production:

1. **Enable X-Pack Security** (authentication and TLS)
2. **Use Network Security Groups** to restrict access
3. **Enable firewall** on the VM
4. **Use private IP** for Kibana (behind Application Gateway)
5. **Enable backup** with managed snapshots
6. **Use managed identities** instead of passwords
7. **Enable monitoring** with Azure Monitor
8. **Implement log retention** policies

## Next Steps

1. **Explore Kibana** - Create dashboards and visualizations
2. **Add data sources** - Configure Filebeat on other VMs
3. **Set up alerts** - Configure Elasticsearch alerting
4. **Learn PromQL** - Query and analyze your data
5. **Scale up** - Move to production architecture (see lesson 03)

## Additional Resources

- [Elasticsearch Documentation](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Documentation](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Documentation](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Filebeat Documentation](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)

## Support

For issues or questions:
- Review the troubleshooting section
- Check the lesson documentation in `/docs/07-monitoring/`
- Consult official Elastic documentation

---

**Time to Complete**: 15-20 minutes
**Difficulty**: Beginner
**Cost**: ~$217/month (destroy when done practicing)
