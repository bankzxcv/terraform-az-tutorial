# Lesson 02: ELK Stack Overview

## Learning Objectives
By the end of this lesson, you will:
- Understand what the ELK Stack is and its components
- Learn the architecture and data flow of ELK
- Understand use cases and when to use ELK
- Compare ELK with alternative logging solutions
- Learn about the Elastic Stack ecosystem

**Time Estimate:** 60 minutes

## Prerequisites
- Completion of Lesson 01: Monitoring Basics
- Understanding of log management concepts
- Basic knowledge of search engines
- Familiarity with JSON format

## Table of Contents
1. [What is the ELK Stack?](#what-is-the-elk-stack)
2. [Components Deep Dive](#components-deep-dive)
3. [Architecture & Data Flow](#architecture--data-flow)
4. [Use Cases](#use-cases)
5. [ELK vs Alternatives](#elk-vs-alternatives)
6. [Elastic Stack Ecosystem](#elastic-stack-ecosystem)
7. [Deployment Considerations](#deployment-considerations)
8. [Best Practices](#best-practices)

## What is the ELK Stack?

The **ELK Stack** is a collection of three open-source products from Elastic:

```
E - Elasticsearch: Search and analytics engine
L - Logstash:      Data processing pipeline
K - Kibana:        Visualization and exploration UI
```

Later, **Beats** was added, creating the **Elastic Stack**:

```
┌─────────────────────────────────────────────────┐
│              Elastic Stack                      │
├─────────────┬──────────────┬────────────────────┤
│    Beats    │   Logstash   │  Elasticsearch     │
│ (Shippers)  │ (Processor)  │   (Storage)        │
└─────────────┴──────────────┴────────────────────┘
                    │
                    ▼
            ┌───────────────┐
            │    Kibana     │
            │(Visualization)│
            └───────────────┘
```

### Why ELK?

**Problems ELK Solves:**
- ❌ Logs scattered across multiple servers
- ❌ Difficult to search through large log volumes
- ❌ No centralized view of system behavior
- ❌ Slow troubleshooting and debugging
- ❌ Inability to correlate events across services

**Solutions ELK Provides:**
- ✅ Centralized log collection
- ✅ Real-time search and analysis
- ✅ Powerful visualization and dashboards
- ✅ Alerting and anomaly detection
- ✅ Security analytics (SIEM capabilities)

## Components Deep Dive

### 1. Elasticsearch

**What it is:** Distributed, RESTful search and analytics engine built on Apache Lucene.

**Key Features:**
```yaml
Search:
  - Full-text search
  - Fuzzy search
  - Query DSL (Domain Specific Language)
  - Aggregations and analytics

Storage:
  - Document-oriented (JSON)
  - Schema-less (dynamic mapping)
  - Distributed and scalable
  - Near real-time indexing

Architecture:
  - Cluster of nodes
  - Sharding and replication
  - Automatic load balancing
  - High availability
```

**Example Document:**
```json
{
  "_index": "logs-2025.11.14",
  "_id": "abc123",
  "_source": {
    "timestamp": "2025-11-14T10:30:45.123Z",
    "level": "ERROR",
    "service": "payment-api",
    "message": "Payment processing failed",
    "user_id": "user_12345",
    "amount": 99.99,
    "currency": "USD",
    "error_code": "INSUFFICIENT_FUNDS",
    "duration_ms": 245,
    "trace_id": "trace_xyz789"
  }
}
```

**Basic Operations:**
```bash
# Index a document
POST /logs/_doc
{
  "message": "User logged in",
  "timestamp": "2025-11-14T10:30:00Z"
}

# Search documents
GET /logs/_search
{
  "query": {
    "match": {
      "message": "error"
    }
  }
}

# Aggregate data
GET /logs/_search
{
  "aggs": {
    "errors_per_hour": {
      "date_histogram": {
        "field": "timestamp",
        "interval": "hour"
      }
    }
  }
}
```

### 2. Logstash

**What it is:** Server-side data processing pipeline that ingests, transforms, and ships data.

**Pipeline Architecture:**
```
Input → Filter → Output

┌─────────┐    ┌─────────┐    ┌─────────┐
│  Input  │───▶│ Filter  │───▶│ Output  │
│ Plugins │    │ Plugins │    │ Plugins │
└─────────┘    └─────────┘    └─────────┘
```

**Input Plugins:**
```yaml
file:        # Read from files
  - Apache logs
  - Application logs
  - System logs

beats:       # Receive from Beats
  - Filebeat
  - Metricbeat
  - Packetbeat

tcp/udp:     # Network protocols
  - Syslog
  - Custom protocols

http:        # HTTP endpoint
  - Webhooks
  - API events

kafka:       # Message queues
  - Event streams
  - Log streams

database:    # JDBC input
  - MySQL
  - PostgreSQL
```

**Filter Plugins:**
```yaml
grok:        # Parse unstructured data
  - Extract fields from text
  - Pattern matching

mutate:      # Transform fields
  - Add, remove, rename fields
  - Type conversion

date:        # Parse timestamps
  - Convert to @timestamp
  - Timezone handling

geoip:       # IP geolocation
  - Country, city, coordinates
  - ISP information

useragent:   # Parse user agents
  - Browser, OS, device
  - Bot detection

json:        # Parse JSON
  - Extract fields
  - Nested objects

dissect:     # Fast parsing
  - Delimiter-based extraction
  - Alternative to grok
```

**Output Plugins:**
```yaml
elasticsearch: # Primary output
  - Index data
  - Bulk operations

file:          # Write to files
  - Backup
  - Debugging

kafka:         # Message queues
  - Event forwarding
  - Data pipelines

s3:            # Cloud storage
  - Archive logs
  - Long-term retention

http:          # HTTP endpoints
  - Webhooks
  - Custom APIs
```

**Example Logstash Configuration:**
```ruby
# logstash.conf
input {
  # Read from Filebeat
  beats {
    port => 5044
  }

  # Read from a file
  file {
    path => "/var/log/app/*.log"
    start_position => "beginning"
  }
}

filter {
  # Parse JSON logs
  if [message] =~ /^{/ {
    json {
      source => "message"
    }
  }

  # Parse Apache logs
  grok {
    match => {
      "message" => "%{COMBINEDAPACHELOG}"
    }
  }

  # Parse timestamp
  date {
    match => ["timestamp", "ISO8601"]
    target => "@timestamp"
  }

  # Add geolocation
  geoip {
    source => "client_ip"
    target => "geoip"
  }

  # Enrich with fields
  mutate {
    add_field => {
      "environment" => "production"
      "datacenter" => "us-east-1"
    }
    remove_field => ["message"]
  }
}

output {
  # Send to Elasticsearch
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "logs-%{+YYYY.MM.dd}"
    user => "elastic"
    password => "${ES_PASSWORD}"
  }

  # Debug output
  stdout {
    codec => rubydebug
  }
}
```

### 3. Kibana

**What it is:** Visualization and exploration platform for Elasticsearch data.

**Key Features:**
```yaml
Discover:
  - Search and explore data
  - Filter and query
  - Field statistics
  - Document viewer

Visualizations:
  - Line charts
  - Bar charts
  - Pie charts
  - Heat maps
  - Gauges
  - Markdown
  - Maps
  - Time series

Dashboards:
  - Combine visualizations
  - Interactive filters
  - Drill-down capabilities
  - Export and sharing

Dev Tools:
  - Console for ES queries
  - Grok debugger
  - Search profiler

Management:
  - Index patterns
  - Saved objects
  - Spaces
  - Security settings

Advanced Features:
  - Machine learning
  - Alerting
  - Canvas (custom designs)
  - Reporting
```

**Common Visualizations:**
```
1. Error Rate Over Time
   ┌────────────────────────────────────┐
   │ Errors                             │
   │  ▲                                 │
   │  │     ╱╲                          │
   │  │    ╱  ╲        ╱╲               │
   │  │   ╱    ╲      ╱  ╲              │
   │  │  ╱      ╲    ╱    ╲             │
   │  │ ╱        ╲  ╱      ╲            │
   │  │╱          ╲╱        ╲           │
   │  └────────────────────────▶ Time   │
   └────────────────────────────────────┘

2. Top 10 Error Messages (Bar Chart)
3. Geographic Distribution (Map)
4. Response Time Distribution (Histogram)
5. Service Health Status (Metric)
```

### 4. Beats

**What it is:** Lightweight data shippers that send data to Logstash or Elasticsearch.

**Types of Beats:**
```yaml
Filebeat:
  purpose: Log file shipper
  use_cases:
    - Application logs
    - System logs
    - Audit logs
  modules:
    - Apache
    - Nginx
    - MySQL
    - PostgreSQL
    - Redis
    - 50+ others

Metricbeat:
  purpose: Metrics collector
  use_cases:
    - System metrics (CPU, memory, disk)
    - Service metrics (Docker, Kubernetes)
    - Cloud metrics (AWS, Azure, GCP)
  modules:
    - System
    - Docker
    - Kubernetes
    - AWS
    - Prometheus

Packetbeat:
  purpose: Network packet analyzer
  use_cases:
    - Application monitoring
    - Network security
    - Performance analysis
  protocols:
    - HTTP
    - MySQL
    - PostgreSQL
    - Redis
    - MongoDB

Heartbeat:
  purpose: Uptime monitoring
  use_cases:
    - Service availability
    - Endpoint monitoring
    - SLA tracking
  monitors:
    - HTTP
    - TCP
    - ICMP

Auditbeat:
  purpose: Audit data shipper
  use_cases:
    - File integrity monitoring
    - User activity tracking
    - Process auditing
  modules:
    - File integrity
    - System
    - auditd

Winlogbeat:
  purpose: Windows event log shipper
  use_cases:
    - Windows events
    - Security logs
    - Application logs
```

**Example Filebeat Configuration:**
```yaml
# filebeat.yml
filebeat.inputs:
  - type: log
    enabled: true
    paths:
      - /var/log/app/*.log

    # Multiline configuration
    multiline.pattern: '^[0-9]{4}-[0-9]{2}-[0-9]{2}'
    multiline.negate: true
    multiline.match: after

    # Add fields
    fields:
      service: myapp
      environment: production
    fields_under_root: true

# Modules
filebeat.modules:
  - module: nginx
    access:
      enabled: true
      var.paths: ["/var/log/nginx/access.log*"]
    error:
      enabled: true
      var.paths: ["/var/log/nginx/error.log*"]

# Output to Logstash
output.logstash:
  hosts: ["logstash:5044"]
  loadbalance: true

# Output to Elasticsearch (alternative)
output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  index: "filebeat-%{+yyyy.MM.dd}"
  username: "elastic"
  password: "${ES_PASSWORD}"

# Processors
processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
```

## Architecture & Data Flow

### Basic Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Application Servers                    │
├──────────────┬──────────────┬──────────────┬────────────┤
│  Web Server  │  API Server  │ Worker Nodes │  Database  │
│              │              │              │            │
│  [Filebeat]  │  [Filebeat]  │  [Filebeat]  │[Filebeat]  │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬─────┘
       │              │              │              │
       └──────────────┴──────────────┴──────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │     Logstash        │
              │  (Data Processing)  │
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Elasticsearch     │
              │   (Data Storage)    │
              │                     │
              │  ┌─────┬─────┬────┐│
              │  │Node1│Node2│Node3││
              │  └─────┴─────┴────┘│
              └──────────┬──────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │       Kibana        │
              │  (Visualization)    │
              └─────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │        Users        │
              └─────────────────────┘
```

### Production Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Application Layer                      │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐       │
│  │ App1 │  │ App2 │  │ App3 │  │ App4 │  │ App5 │       │
│  │[Beat]│  │[Beat]│  │[Beat]│  │[Beat]│  │[Beat]│       │
│  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘  └───┬──┘       │
└──────┼─────────┼─────────┼─────────┼─────────┼───────────┘
       │         │         │         │         │
       └─────────┴─────────┴─────────┴─────────┘
                         │
                         ▼
       ┌─────────────────────────────────────┐
       │         Load Balancer                │
       └─────────────────┬───────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌─────────┐    ┌─────────┐    ┌─────────┐
    │Logstash1│    │Logstash2│    │Logstash3│
    └────┬────┘    └────┬────┘    └────┬────┘
         │              │              │
         └──────────────┼──────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │    Elasticsearch Cluster     │
         │                              │
         │  ┌────────┐  ┌────────┐     │
         │  │Master1 │  │Master2 │     │
         │  └────────┘  └────────┘     │
         │                              │
         │  ┌────┐ ┌────┐ ┌────┐ ┌────┐│
         │  │Data│ │Data│ │Data│ │Data││
         │  │ 1  │ │ 2  │ │ 3  │ │ 4  ││
         │  └────┘ └────┘ └────┘ └────┘│
         │                              │
         │  ┌────────┐  ┌────────┐     │
         │  │Coordin1│  │Coordin2│     │
         │  └────────┘  └────────┘     │
         └──────────────┬───────────────┘
                        │
                        ▼
         ┌──────────────────────────────┐
         │         Kibana Cluster       │
         │  ┌────────┐  ┌────────┐     │
         │  │Kibana1 │  │Kibana2 │     │
         │  └────────┘  └────────┘     │
         └──────────────────────────────┘
```

### Data Flow

```
Step 1: Log Generation
┌──────────────────┐
│  Application     │
│  app.log("error")│
└────────┬─────────┘
         │
         ▼
Step 2: Log File
┌──────────────────┐
│ /var/log/app.log │
│ [ERROR] Failed   │
└────────┬─────────┘
         │
         ▼
Step 3: Filebeat (Shipping)
┌──────────────────┐
│ Filebeat reads   │
│ Adds metadata    │
│ Ships to Logstash│
└────────┬─────────┘
         │
         ▼
Step 4: Logstash (Processing)
┌──────────────────┐
│ Parse with grok  │
│ Extract fields   │
│ Enrich data      │
│ Filter/Transform │
└────────┬─────────┘
         │
         ▼
Step 5: Elasticsearch (Storage)
┌──────────────────┐
│ Index document   │
│ Shard data       │
│ Replicate        │
└────────┬─────────┘
         │
         ▼
Step 6: Kibana (Visualization)
┌──────────────────┐
│ Query ES         │
│ Build dashboards │
│ Display to users │
└──────────────────┘
```

## Use Cases

### 1. Application Log Analytics

```yaml
Scenario:
  - Microservices architecture
  - 50+ services
  - Logs scattered across containers

Solution:
  - Filebeat on each container
  - Central Logstash for processing
  - Elasticsearch for storage
  - Kibana for visualization

Benefits:
  - Centralized view of all services
  - Correlation of events
  - Quick troubleshooting
  - Performance analysis
```

### 2. Security Information and Event Management (SIEM)

```yaml
Scenario:
  - Need to monitor security events
  - Detect anomalies and threats
  - Compliance requirements

Solution:
  - Collect security logs (firewall, IDS, authentication)
  - Use Elastic SIEM capabilities
  - Machine learning for anomaly detection
  - Alerting on suspicious activities

Benefits:
  - Real-time threat detection
  - Incident investigation
  - Compliance reporting
  - Forensic analysis
```

### 3. Infrastructure Monitoring

```yaml
Scenario:
  - Monitor server health
  - Track resource utilization
  - Capacity planning

Solution:
  - Metricbeat for system metrics
  - Filebeat for system logs
  - Elasticsearch for storage
  - Kibana for dashboards

Benefits:
  - Proactive monitoring
  - Resource optimization
  - Trend analysis
  - Alert on anomalies
```

### 4. Business Analytics

```yaml
Scenario:
  - Track user behavior
  - Analyze business metrics
  - Product analytics

Solution:
  - Application logs to ELK
  - Custom dashboards in Kibana
  - Aggregations and visualizations

Benefits:
  - Real-time insights
  - Data-driven decisions
  - Customer behavior analysis
  - Revenue tracking
```

## ELK vs Alternatives

### Comparison Matrix

```yaml
ELK Stack:
  strengths:
    - Powerful full-text search
    - Rich visualization
    - Large ecosystem
    - Active community
  weaknesses:
    - Resource intensive
    - Complex to scale
    - Steep learning curve
    - Cost at scale
  best_for:
    - Log analytics
    - Complex queries
    - Security analytics
    - Business intelligence

Splunk:
  strengths:
    - Enterprise features
    - Excellent support
    - User-friendly
    - Advanced analytics
  weaknesses:
    - Expensive
    - Proprietary
    - License-based pricing
  best_for:
    - Large enterprises
    - Security operations
    - Compliance needs

Prometheus + Loki:
  strengths:
    - Cloud-native
    - Label-based
    - Cost-effective
    - Kubernetes-native
  weaknesses:
    - Limited full-text search
    - Fewer features
    - Smaller ecosystem
  best_for:
    - Kubernetes environments
    - Metrics + logs together
    - Cost-conscious teams

Datadog:
  strengths:
    - All-in-one platform
    - Easy to use
    - Great integrations
    - Cloud-native
  weaknesses:
    - Expensive at scale
    - Vendor lock-in
    - Limited customization
  best_for:
    - Startups/mid-size
    - Quick setup needed
    - SaaS preference

AWS CloudWatch:
  strengths:
    - Native AWS integration
    - Pay-as-you-go
    - No infrastructure management
  weaknesses:
    - AWS-only
    - Limited features
    - Basic visualization
  best_for:
    - AWS-only workloads
    - Simple use cases
    - Cost-sensitive projects
```

### When to Choose ELK

```yaml
Choose ELK if:
  ✅ Need powerful full-text search
  ✅ Complex log analysis requirements
  ✅ Want open-source solution
  ✅ Have technical expertise
  ✅ Need customization and control
  ✅ Security analytics (SIEM) required
  ✅ Multi-cloud or hybrid environment

Consider Alternatives if:
  ❌ Small-scale deployment (< 1GB/day)
  ❌ Limited technical resources
  ❌ Simple log viewing needs
  ❌ Prefer managed service
  ❌ Tight budget constraints
  ❌ Need out-of-the-box solution
```

## Elastic Stack Ecosystem

### Additional Components

```yaml
APM (Application Performance Monitoring):
  - Distributed tracing
  - Performance metrics
  - Error tracking
  - Service maps

Elastic Agent:
  - Unified agent (replaces Beats)
  - Fleet management
  - Centralized policy management
  - Automatic updates

Fleet:
  - Central agent management
  - Policy-based configuration
  - At-scale deployment
  - Upgrade management

Elastic Maps:
  - Geographic visualization
  - Spatial data analysis
  - Custom maps
  - Layer management

Machine Learning:
  - Anomaly detection
  - Forecasting
  - Classification
  - Outlier detection

Alerting:
  - Threshold alerts
  - Anomaly alerts
  - Webhook integration
  - Email/Slack notifications

Security:
  - SIEM capabilities
  - Threat detection
  - Endpoint security
  - Case management
```

### Elastic Cloud

```yaml
Managed Service:
  - Hosted on AWS, Azure, GCP
  - Automated operations
  - Elastic handles scaling
  - Built-in security

Pricing Model:
  - Based on capacity
  - Storage + compute
  - Data transfer costs
  - Additional features (ML, etc)

Advantages:
  - No infrastructure management
  - Automatic updates
  - High availability
  - Expert support

Considerations:
  - Cost at scale
  - Less control
  - Vendor lock-in risk
```

## Deployment Considerations

### Sizing Guidelines

```yaml
Small Deployment (< 1GB/day):
  elasticsearch:
    nodes: 1-3
    cpu: 4 cores
    memory: 16 GB
    storage: 500 GB SSD

  logstash:
    instances: 1-2
    cpu: 2 cores
    memory: 4 GB

  kibana:
    instances: 1
    cpu: 2 cores
    memory: 4 GB

Medium Deployment (1-50 GB/day):
  elasticsearch:
    data_nodes: 3-6
    master_nodes: 3
    cpu: 8-16 cores
    memory: 32-64 GB
    storage: 2-10 TB SSD

  logstash:
    instances: 2-4
    cpu: 4-8 cores
    memory: 8-16 GB

  kibana:
    instances: 2
    cpu: 4 cores
    memory: 8 GB

Large Deployment (50+ GB/day):
  elasticsearch:
    data_nodes: 6-20+
    master_nodes: 3
    coordinating_nodes: 2-3
    cpu: 16-32 cores
    memory: 64-128 GB
    storage: 10-100+ TB SSD

  logstash:
    instances: 4-10+
    cpu: 8-16 cores
    memory: 16-32 GB

  kibana:
    instances: 2-4
    cpu: 4-8 cores
    memory: 8-16 GB
```

### Performance Optimization

```yaml
Elasticsearch:
  - Use SSD storage
  - Tune JVM heap (50% of RAM, max 31 GB)
  - Optimize index settings
  - Use index lifecycle management (ILM)
  - Implement hot/warm/cold architecture

Logstash:
  - Increase pipeline workers
  - Use persistent queues
  - Batch size optimization
  - Pipeline-to-pipeline communication
  - Multiple pipelines

Filebeat:
  - Configure multiline correctly
  - Use proper processors
  - Enable compression
  - Tune harvester limits
```

## Best Practices

### 1. Index Management

```yaml
Index Naming:
  pattern: logs-{service}-{YYYY.MM.dd}
  examples:
    - logs-api-2025.11.14
    - logs-web-2025.11.14
    - logs-worker-2025.11.14

Index Lifecycle Management (ILM):
  hot_phase:
    - Active indexing
    - Fast storage (SSD)
    - Duration: 7 days

  warm_phase:
    - Read-only
    - Slower storage
    - Reduce replicas
    - Duration: 30 days

  cold_phase:
    - Searchable snapshot
    - Very slow storage
    - Minimal replicas
    - Duration: 90 days

  delete_phase:
    - Remove index
    - After: 365 days
```

### 2. Security Hardening

```yaml
Authentication:
  - Enable X-Pack security
  - Use strong passwords
  - Implement SSO/SAML
  - API key authentication

Authorization:
  - Role-based access control (RBAC)
  - Index-level permissions
  - Field-level security
  - Document-level security

Network Security:
  - TLS/SSL encryption
  - Private network
  - Firewall rules
  - VPN access

Audit Logging:
  - Enable audit logs
  - Track user actions
  - Monitor failed logins
  - Alert on suspicious activity
```

### 3. Monitoring ELK Itself

```yaml
Monitor:
  - Cluster health
  - Node status
  - Index health
  - Query performance
  - Ingest rate
  - Storage utilization

Tools:
  - Elasticsearch monitoring APIs
  - Kibana Stack Monitoring
  - Metricbeat for metrics
  - External monitoring (Prometheus)

Key Metrics:
  - JVM heap usage
  - Thread pool rejections
  - Search/indexing latency
  - Disk space
  - CPU utilization
```

## Summary

In this lesson, you learned:

✅ **ELK Components**: Elasticsearch, Logstash, Kibana, and Beats

✅ **Architecture**: How data flows through the stack

✅ **Use Cases**: When and why to use ELK

✅ **Comparisons**: ELK vs alternative solutions

✅ **Ecosystem**: Additional Elastic Stack components

✅ **Deployment**: Sizing and planning considerations

✅ **Best Practices**: Index management, security, and monitoring

## Next Steps

In the next lessons, you'll learn:
- **Lesson 03**: Deploying ELK on Azure
- **Lesson 04**: Deploying ELK on AWS
- **Lesson 05**: Deploying ELK on GCP
- **Lesson 06**: Using Managed Elastic Cloud

## Additional Resources

### Documentation
- [Elastic Official Documentation](https://www.elastic.co/guide/index.html)
- [Elasticsearch Guide](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [Logstash Guide](https://www.elastic.co/guide/en/logstash/current/index.html)
- [Kibana Guide](https://www.elastic.co/guide/en/kibana/current/index.html)

### Tutorials
- [Getting Started with ELK](https://www.elastic.co/guide/en/elastic-stack-get-started/current/get-started-elastic-stack.html)
- [ELK on Docker](https://elk-docker.readthedocs.io/)

### Community
- [Elastic Discuss Forum](https://discuss.elastic.co/)
- [Elastic Blog](https://www.elastic.co/blog/)
- [Elastic Webinars](https://www.elastic.co/webinars)

---

**Practice Exercise**: Design an ELK architecture for a web application with 10 microservices generating 5 GB of logs per day. Include all components, sizing, and data flow.
