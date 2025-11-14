#!/bin/bash
# ELK Stack Installation Script for Ubuntu 22.04
# This script installs Elasticsearch, Logstash, Kibana, and Filebeat on a single VM

set -euxo pipefail

ELK_VERSION="${elk_version}"

echo "=== Starting ELK Stack Installation ==="
echo "Version: $ELK_VERSION"

# Update system
apt-get update
apt-get upgrade -y

# Install dependencies
apt-get install -y \
    apt-transport-https \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Install Java (required for Elasticsearch and Logstash)
apt-get install -y openjdk-11-jdk

# Add Elasticsearch repository
wget -qO - https://artifacts.elastic.co/GPG-KEY-elasticsearch | gpg --dearmor -o /usr/share/keyrings/elasticsearch-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/elasticsearch-keyring.gpg] https://artifacts.elastic.co/packages/8.x/apt stable main" | tee /etc/apt/sources.list.d/elastic-8.x.list

# Update package list
apt-get update

echo "=== Installing Elasticsearch ==="
apt-get install -y elasticsearch=$ELK_VERSION

# Format and mount data disk
echo "=== Setting up data disk ==="
DATA_DISK="/dev/sdc"
if [ -b "$DATA_DISK" ]; then
    mkfs.ext4 -F $DATA_DISK
    mkdir -p /mnt/elk-data
    mount $DATA_DISK /mnt/elk-data
    echo "$DATA_DISK /mnt/elk-data ext4 defaults,nofail 0 2" >> /etc/fstab
fi

# Create directories
mkdir -p /mnt/elk-data/elasticsearch
mkdir -p /var/log/elasticsearch
chown -R elasticsearch:elasticsearch /mnt/elk-data/elasticsearch
chown -R elasticsearch:elasticsearch /var/log/elasticsearch

# Configure Elasticsearch
cat > /etc/elasticsearch/elasticsearch.yml <<EOF
# Cluster
cluster.name: simple-elk-cluster
node.name: elk-node-1

# Paths
path.data: /mnt/elk-data/elasticsearch
path.logs: /var/log/elasticsearch

# Network
network.host: 0.0.0.0
http.port: 9200

# Discovery (single node)
discovery.type: single-node

# Security (disabled for simplicity - NOT for production!)
xpack.security.enabled: false
xpack.security.enrollment.enabled: false
xpack.security.http.ssl.enabled: false
xpack.security.transport.ssl.enabled: false
EOF

# JVM options (set heap to 50% of RAM, max 8GB for this demo)
cat > /etc/elasticsearch/jvm.options.d/heap.options <<EOF
# Xms and Xmx should be equal
# Set to 50% of available RAM, max 8GB for this setup
-Xms4g
-Xmx4g
EOF

# System settings
sysctl -w vm.max_map_count=262144
echo "vm.max_map_count=262144" >> /etc/sysctl.conf

cat >> /etc/security/limits.conf <<EOF
elasticsearch soft nofile 65536
elasticsearch hard nofile 65536
elasticsearch soft memlock unlimited
elasticsearch hard memlock unlimited
EOF

# Enable and start Elasticsearch
systemctl daemon-reload
systemctl enable elasticsearch
systemctl start elasticsearch

echo "Waiting for Elasticsearch to start..."
for i in {1..30}; do
    if curl -s http://localhost:9200 > /dev/null; then
        echo "Elasticsearch is up!"
        break
    fi
    echo "Waiting... ($i/30)"
    sleep 10
done

echo "=== Installing Logstash ==="
apt-get install -y logstash=$ELK_VERSION

# Configure Logstash
cat > /etc/logstash/conf.d/logstash.conf <<'EOF'
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse JSON logs
  if [message] =~ /^{.*}$/ {
    json {
      source => "message"
    }
  }

  # Add timestamp if not present
  if ![timestamp] {
    mutate {
      add_field => { "timestamp" => "%{@timestamp}" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "%{[@metadata][beat]}-%{+YYYY.MM.dd}"
  }

  # Debug output
  stdout {
    codec => rubydebug
  }
}
EOF

# JVM options for Logstash
cat > /etc/logstash/jvm.options.d/heap.options <<EOF
-Xms2g
-Xmx2g
EOF

# Enable and start Logstash
systemctl daemon-reload
systemctl enable logstash
systemctl start logstash

echo "=== Installing Kibana ==="
apt-get install -y kibana=$ELK_VERSION

# Configure Kibana
cat > /etc/kibana/kibana.yml <<EOF
# Server
server.port: 5601
server.host: "0.0.0.0"
server.name: "simple-elk-kibana"

# Elasticsearch
elasticsearch.hosts: ["http://localhost:9200"]

# Logging
logging.dest: /var/log/kibana/kibana.log
logging.verbose: false
EOF

# Create log directory
mkdir -p /var/log/kibana
chown -R kibana:kibana /var/log/kibana

# Enable and start Kibana
systemctl daemon-reload
systemctl enable kibana
systemctl start kibana

echo "=== Installing Filebeat ==="
apt-get install -y filebeat=$ELK_VERSION

# Configure Filebeat
cat > /etc/filebeat/filebeat.yml <<'EOF'
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/syslog
      - /var/log/auth.log
    fields:
      service: system
      environment: development

  - type: log
    enabled: true
    paths:
      - /var/log/elasticsearch/*.log
    fields:
      service: elasticsearch
      environment: development

# Output to Logstash
output.logstash:
  hosts: ["localhost:5044"]

# Processors
processors:
  - add_host_metadata:
      when.not.contains.tags: forwarded
  - add_cloud_metadata: ~
  - add_docker_metadata: ~

# Logging
logging.level: info
logging.to_files: true
logging.files:
  path: /var/log/filebeat
  name: filebeat
  keepfiles: 7
EOF

# Enable and start Filebeat
systemctl daemon-reload
systemctl enable filebeat
systemctl start filebeat

echo "=== Installation Complete ==="
echo ""
echo "ELK Stack has been installed and started!"
echo ""
echo "Services:"
echo "  - Elasticsearch: http://localhost:9200"
echo "  - Kibana: http://$(curl -s ifconfig.me):5601"
echo "  - Logstash: localhost:5044"
echo ""
echo "Check status:"
echo "  sudo systemctl status elasticsearch"
echo "  sudo systemctl status logstash"
echo "  sudo systemctl status kibana"
echo "  sudo systemctl status filebeat"
echo ""
echo "Wait 2-3 minutes for all services to fully start."
echo "Then access Kibana in your browser!"

# Create a welcome message
cat > /etc/motd <<'EOF'
╔══════════════════════════════════════════════════════════════╗
║                    ELK Stack Demo VM                         ║
║                                                              ║
║  Elasticsearch: http://localhost:9200                       ║
║  Kibana: http://<PUBLIC_IP>:5601                            ║
║  Logstash: localhost:5044                                   ║
║                                                              ║
║  Check services:                                            ║
║    sudo systemctl status elasticsearch                      ║
║    sudo systemctl status logstash                           ║
║    sudo systemctl status kibana                             ║
║    sudo systemctl status filebeat                           ║
║                                                              ║
║  View logs:                                                 ║
║    sudo journalctl -u elasticsearch -f                      ║
║    sudo journalctl -u logstash -f                           ║
║    sudo journalctl -u kibana -f                             ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
EOF

echo "=== Setup script completed successfully! ==="
