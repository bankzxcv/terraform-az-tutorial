# Lesson 01: Monitoring & Observability Basics

## Learning Objectives
By the end of this lesson, you will:
- Understand the difference between monitoring and observability
- Learn the three pillars of observability (metrics, logs, traces)
- Understand monitoring fundamentals for cloud infrastructure
- Learn key monitoring metrics and KPIs
- Understand alerting best practices

**Time Estimate:** 45 minutes

## Prerequisites
- Basic understanding of cloud infrastructure
- Familiarity with system administration concepts
- Understanding of web application architecture

## Table of Contents
1. [Introduction to Observability](#introduction-to-observability)
2. [Three Pillars of Observability](#three-pillars-of-observability)
3. [Monitoring vs Observability](#monitoring-vs-observability)
4. [Key Metrics to Monitor](#key-metrics-to-monitor)
5. [Alerting Best Practices](#alerting-best-practices)
6. [Architecture Overview](#architecture-overview)
7. [Best Practices](#best-practices)
8. [Security Considerations](#security-considerations)

## Introduction to Observability

**Observability** is the ability to understand the internal state of a system by examining its outputs. In modern cloud-native environments, observability is crucial for:

- **Troubleshooting**: Quickly identify and resolve issues
- **Performance Optimization**: Understand bottlenecks and inefficiencies
- **Capacity Planning**: Predict resource needs
- **Security**: Detect anomalies and security incidents
- **Compliance**: Meet audit and regulatory requirements

### Why Observability Matters

```
Traditional Monitoring         vs         Modern Observability
─────────────────                         ────────────────────
• Known unknowns                          • Unknown unknowns
• Predefined dashboards                   • Ad-hoc exploration
• Static thresholds                       • Dynamic analysis
• Reactive                                • Proactive + Reactive
• Infrastructure focus                    • Full-stack visibility
```

## Three Pillars of Observability

### 1. Metrics (Time-Series Data)

Metrics are numerical measurements collected over time:

```
Examples:
- CPU utilization: 75%
- Request rate: 1000 req/s
- Error rate: 0.5%
- Memory usage: 8GB
- Disk I/O: 500 IOPS
```

**Key Characteristics:**
- Low storage overhead
- Aggregatable and statistical
- Excellent for trends and patterns
- Efficient for long-term retention

**Common Metric Types:**
- **Counter**: Monotonically increasing value (e.g., total requests)
- **Gauge**: Value that can go up or down (e.g., current memory usage)
- **Histogram**: Distribution of values (e.g., request duration)

### 2. Logs (Event Records)

Logs are discrete records of events:

```json
{
  "timestamp": "2025-11-14T10:30:45Z",
  "level": "ERROR",
  "service": "api-gateway",
  "message": "Failed to connect to database",
  "error": "Connection timeout after 30s",
  "user_id": "user_12345",
  "request_id": "req_abc123"
}
```

**Key Characteristics:**
- Rich contextual information
- Human-readable
- Higher storage cost
- Essential for debugging
- Retention policies needed

**Log Levels:**
- **TRACE**: Very detailed debugging
- **DEBUG**: Detailed debugging
- **INFO**: General informational messages
- **WARN**: Warning messages
- **ERROR**: Error events
- **FATAL**: Critical errors causing shutdown

### 3. Traces (Distributed Request Tracking)

Traces track requests across distributed systems:

```
User Request Flow (Trace):
┌─────────────────────────────────────────────────────┐
│ Request ID: trace_xyz789                            │
├─────────────────────────────────────────────────────┤
│ API Gateway        │ 15ms                           │
│   └─> Auth Service │ 45ms                           │
│   └─> User Service │ 120ms                          │
│       └─> Database │ 80ms                           │
│   └─> Cache        │ 5ms                            │
│ Total: 265ms                                        │
└─────────────────────────────────────────────────────┘
```

**Key Characteristics:**
- Shows request flow
- Identifies bottlenecks
- Reveals service dependencies
- Critical for microservices

## Monitoring vs Observability

| Aspect | Monitoring | Observability |
|--------|-----------|---------------|
| **Focus** | Known problems | Unknown problems |
| **Approach** | Dashboard-driven | Query-driven |
| **Questions** | "Is it up?" | "Why is it slow?" |
| **Data** | Predefined metrics | All telemetry data |
| **Use Case** | System health | Root cause analysis |
| **Alerting** | Threshold-based | Anomaly detection |

**Example Scenario:**

```
Monitoring Question:
"Is CPU usage above 80%?" → Yes/No

Observability Question:
"Why did checkout fail for users in Europe
between 2-3 PM on Black Friday?" → Deep investigation
```

## Key Metrics to Monitor

### Infrastructure Metrics

#### Compute (VMs/Containers)
```yaml
CPU Metrics:
  - cpu_usage_percent: 0-100%
  - cpu_load_average: 1, 5, 15 minute averages
  - cpu_steal_time: % CPU stolen by hypervisor

Memory Metrics:
  - memory_usage_percent: 0-100%
  - memory_available_bytes: Free + cached memory
  - swap_usage_percent: 0-100%

Disk Metrics:
  - disk_usage_percent: 0-100%
  - disk_iops: I/O operations per second
  - disk_throughput_mbps: Read/write MB/s
  - disk_latency_ms: Read/write latency

Network Metrics:
  - network_in_bytes: Incoming traffic
  - network_out_bytes: Outgoing traffic
  - network_packets_dropped: Dropped packets
  - network_errors: Network errors
```

#### Application Metrics (RED Method)

```yaml
Rate:
  - requests_per_second: Total request rate
  - requests_by_endpoint: Per-endpoint rates

Errors:
  - error_rate_percent: % of failed requests
  - errors_by_type: 4xx, 5xx breakdown
  - error_count: Total errors

Duration:
  - response_time_p50: 50th percentile (median)
  - response_time_p95: 95th percentile
  - response_time_p99: 99th percentile
  - response_time_max: Maximum response time
```

#### Database Metrics

```yaml
Performance:
  - query_duration_ms: Query execution time
  - connection_pool_usage: Active connections
  - slow_queries_count: Slow query count
  - deadlocks_count: Database deadlocks

Health:
  - replication_lag_seconds: Replica lag
  - table_size_bytes: Table sizes
  - index_hit_ratio: Cache efficiency
```

### The Four Golden Signals (Google SRE)

```
1. Latency
   How long does it take to serve a request?

2. Traffic
   How much demand is placed on your system?

3. Errors
   What is the rate of failed requests?

4. Saturation
   How "full" is your service?
```

## Alerting Best Practices

### Alert Design Principles

```yaml
Good Alert Characteristics:
  - Actionable: Can the on-call engineer do something?
  - Relevant: Does it require immediate attention?
  - Specific: Is the problem clearly defined?
  - Accurate: Low false positive rate

Bad Alert Example:
  alert: disk_usage_high
  condition: disk > 70%
  problem: Too early, not actionable

Good Alert Example:
  alert: disk_usage_critical
  condition: disk > 90% for 10 minutes
  severity: critical
  action: Add disk or clean up space
  runbook: https://wiki.example.com/runbooks/disk-full
```

### Alert Severity Levels

```
┌─────────────┬─────────────┬──────────────┬─────────────┐
│ Severity    │ Response    │ Example      │ Escalation  │
├─────────────┼─────────────┼──────────────┼─────────────┤
│ Critical    │ Immediate   │ Service down │ Page on-call│
│ High        │ 15 minutes  │ High errors  │ Notify team │
│ Medium      │ 1 hour      │ Degraded     │ Ticket      │
│ Low         │ Next day    │ Warning      │ Log only    │
└─────────────┴─────────────┴──────────────┴─────────────┘
```

### Alert Fatigue Prevention

```yaml
Strategies:
  1. Aggregate Similar Alerts:
     - Don't alert on each failed request
     - Alert on error rate threshold

  2. Use Alert Dependencies:
     - If parent service is down, suppress child alerts

  3. Implement Alert Hysteresis:
     - Alert at 90% usage
     - Clear alert at 80% usage
     - Prevents flapping

  4. Time-Based Suppression:
     - Suppress non-critical alerts during off-hours
     - Queue for business hours review

  5. Alert on Symptoms, Not Causes:
     - Alert: "API response time > 1s"
     - Not: "Redis CPU > 80%"
```

## Architecture Overview

### Typical Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Monitored Systems                     │
├────────────┬────────────┬────────────┬──────────────────┤
│ Web Servers│ App Servers│  Databases │  Message Queues  │
│            │            │            │                  │
│  [Agents]  │  [Agents]  │  [Agents]  │    [Agents]      │
└──────┬─────┴──────┬─────┴──────┬─────┴────────┬─────────┘
       │            │            │              │
       └────────────┴────────────┴──────────────┘
                        │
                        ▼
              ┌─────────────────────┐
              │  Metrics Collector   │
              │  (Prometheus, etc)   │
              └──────────┬───────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Time Series DB     │
              │   (InfluxDB, etc)    │
              └──────────┬───────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │Dashboards│  │ Alerting │  │   APIs   │
    │ (Grafana)│  │          │  │          │
    └──────────┘  └──────────┘  └──────────┘
```

### Log Aggregation Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
├─────────────┬─────────────┬─────────────┬───────────────┤
│  Service A  │  Service B  │  Service C  │   Service D   │
│  [Logging]  │  [Logging]  │  [Logging]  │   [Logging]   │
└──────┬──────┴──────┬──────┴──────┬──────┴────────┬──────┘
       │             │             │               │
       └─────────────┴─────────────┴───────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │   Log Shipper        │
              │ (Filebeat, Fluentd) │
              └──────────┬───────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Log Processor       │
              │  (Logstash)          │
              └──────────┬───────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Log Storage         │
              │  (Elasticsearch)     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Visualization       │
              │  (Kibana)            │
              └─────────────────────┘
```

## Best Practices

### 1. Start Simple, Iterate

```yaml
Phase 1 - Foundation (Week 1):
  - Monitor basic infrastructure metrics
  - Set up simple uptime checks
  - Create basic dashboards

Phase 2 - Application (Week 2-3):
  - Add application metrics
  - Implement structured logging
  - Create service-level dashboards

Phase 3 - Advanced (Month 2):
  - Add distributed tracing
  - Implement SLOs/SLIs
  - Advanced alerting rules

Phase 4 - Optimization (Ongoing):
  - Tune alert thresholds
  - Add custom metrics
  - Correlate multiple signals
```

### 2. Implement the USE Method

For every resource, monitor:
- **U**tilization: % time resource is busy
- **S**aturation: Amount of work queued
- **E**rrors: Count of error events

```yaml
Example - Database Server:
  Utilization:
    - CPU usage: 65%
    - Memory usage: 78%
    - Disk usage: 45%

  Saturation:
    - Query queue length: 12
    - Connection pool wait time: 50ms

  Errors:
    - Connection errors: 3/hour
    - Query failures: 0.1%
```

### 3. Service Level Objectives (SLOs)

```yaml
Example SLOs:
  Availability:
    target: 99.9% uptime
    measurement: successful_requests / total_requests

  Latency:
    target: 95% of requests < 200ms
    measurement: p95_response_time

  Error Rate:
    target: < 0.1% errors
    measurement: errors / total_requests

Error Budget:
  # With 99.9% availability SLO
  allowed_downtime_monthly: 43.2 minutes
  current_downtime: 15 minutes
  remaining_budget: 28.2 minutes
```

### 4. Tagging Strategy

```yaml
Standard Tags for All Resources:
  environment: [production, staging, development]
  service: [api, web, worker, database]
  team: [platform, product, data]
  cost_center: [engineering, marketing, sales]
  version: [v1.2.3]
  region: [us-east-1, eu-west-1]

Example Metric with Tags:
  metric: http_requests_total
  tags:
    environment: production
    service: api
    endpoint: /users
    method: GET
    status: 200
```

### 5. Data Retention Policies

```yaml
Metrics Retention:
  high_resolution: # 1-second intervals
    duration: 7 days

  medium_resolution: # 1-minute intervals
    duration: 30 days

  low_resolution: # 1-hour intervals
    duration: 1 year

Logs Retention:
  hot_storage: # Fast SSD
    duration: 7 days
    query: < 1 second

  warm_storage: # Standard storage
    duration: 30 days
    query: < 10 seconds

  cold_storage: # Archive (S3, Glacier)
    duration: 1 year
    query: minutes to hours

Traces Retention:
  sampled_traces: # 1-10% of requests
    duration: 30 days
```

## Security Considerations

### 1. Data Protection

```yaml
Sensitive Data in Logs:
  ❌ Don't Log:
    - Passwords
    - API keys
    - Credit card numbers
    - Personal identifiable information (PII)
    - Session tokens

  ✅ Instead:
    - Hash or mask sensitive data
    - Log event without sensitive fields
    - Use structured logging with field filtering

Example - Bad:
  log.info(f"User login: {username} with password {password}")

Example - Good:
  log.info(f"User login: {username}", extra={
    "event": "login",
    "user_id": hash(username),
    "success": True
  })
```

### 2. Access Control

```yaml
Monitoring System Access:
  read_only_users:
    - View dashboards
    - Query logs and metrics
    - No configuration changes

  operators:
    - Create dashboards
    - Manage alerts
    - No data deletion

  administrators:
    - Full system access
    - Configuration management
    - Data retention policies

Implementation:
  - Use SSO/SAML for authentication
  - Implement role-based access control (RBAC)
  - Enable audit logging
  - Regular access reviews
```

### 3. Network Security

```yaml
Monitoring Network Architecture:

  Agents to Collectors:
    - Use TLS encryption
    - Mutual TLS (mTLS) for authentication
    - Network segmentation

  Collectors to Storage:
    - Private network connectivity
    - Encryption in transit
    - Firewall rules

  User to Dashboards:
    - HTTPS only
    - VPN or private access
    - Web application firewall (WAF)
```

### 4. Compliance Considerations

```yaml
GDPR Compliance:
  - Implement right to erasure
  - Data minimization
  - Privacy by design
  - Log retention limits

HIPAA Compliance:
  - Audit trails
  - Encrypted storage
  - Access controls
  - Business associate agreements

SOC 2 Compliance:
  - Change management
  - Access reviews
  - Incident response
  - Continuous monitoring
```

## Troubleshooting Guide

### Common Issues

#### Issue 1: High Cardinality Metrics

```yaml
Problem:
  - Too many unique metric combinations
  - Slow queries
  - High storage costs

Symptoms:
  metric: http_requests_total
  tags:
    user_id: user_12345  # ❌ High cardinality!
    request_id: req_abc  # ❌ Infinite cardinality!

Solution:
  metric: http_requests_total
  tags:
    service: api
    endpoint: /users
    method: GET
    status: 200
  # Store user_id in logs, not metrics
```

#### Issue 2: Log Flooding

```yaml
Problem:
  - Single error generates thousands of logs
  - Storage fills up
  - Performance degradation

Solution:
  1. Implement log sampling:
     - Log 100% of errors for first minute
     - Then sample 1% of repeated errors

  2. Use rate limiting:
     - Max 100 logs/second per service

  3. Aggregate similar events:
     - "Error X occurred 1000 times in 5 minutes"
```

#### Issue 3: Alert Fatigue

```yaml
Problem:
  - Too many alerts
  - Engineers ignore alerts
  - Real issues get missed

Metrics:
  alert_frequency: 50 alerts/day
  actionable_alerts: 5 alerts/day
  alert_accuracy: 10%  # ❌ Too low!

Solution:
  1. Review alert rules weekly
  2. Increase thresholds for noisy alerts
  3. Add time windows (alert after 5 minutes)
  4. Group related alerts
  5. Implement alert dependencies

  Target:
    alert_frequency: 5 alerts/day
    alert_accuracy: 90%+
```

## Cost Optimization Tips

### 1. Metrics Cost Reduction

```yaml
Strategies:

  1. Reduce Cardinality:
     before: 1,000,000 unique time series
     after: 10,000 unique time series
     savings: 99% storage reduction

  2. Increase Scrape Interval:
     before: 10-second intervals
     after: 60-second intervals
     savings: 83% data points reduction

  3. Use Recording Rules:
     # Pre-aggregate expensive queries
     recording_rule: instance:cpu_usage:avg
     query: avg(cpu_usage) by (instance)
     interval: 1m
     savings: Query performance improvement
```

### 2. Log Cost Reduction

```yaml
Strategies:

  1. Log Sampling:
     debug_logs: 1% sampling
     info_logs: 10% sampling
     error_logs: 100% sampling
     savings: 70-80% volume reduction

  2. Structured Logging:
     before: 500 bytes per log (text)
     after: 150 bytes per log (JSON)
     savings: 70% storage reduction

  3. Intelligent Retention:
     errors: 90 days
     warnings: 30 days
     info: 7 days
     debug: 1 day
     savings: 60% storage costs

  4. Compression:
     uncompressed: 100 GB/day
     compressed: 10 GB/day
     savings: 90% storage reduction
```

### 3. Infrastructure Cost Reduction

```yaml
Monitoring Infrastructure Sizing:

  Small Scale (< 100 hosts):
    metrics_storage: 100 GB
    logs_storage: 500 GB
    instance_type: 4 vCPU, 16 GB RAM
    monthly_cost: $150-300

  Medium Scale (100-1000 hosts):
    metrics_storage: 1 TB
    logs_storage: 5 TB
    instance_type: 8 vCPU, 32 GB RAM
    monthly_cost: $800-1500

  Large Scale (1000+ hosts):
    metrics_storage: 10 TB+
    logs_storage: 50 TB+
    cluster: Multi-node setup
    monthly_cost: $5000-20000

  Cost Optimization:
    - Use managed services for smaller scale
    - Self-hosted for large scale
    - Implement auto-scaling
    - Use spot instances for non-critical components
```

## Summary

In this lesson, you learned:

✅ **Observability Fundamentals**: Understanding the three pillars (metrics, logs, traces)

✅ **Monitoring Strategy**: Difference between monitoring and observability

✅ **Key Metrics**: What to monitor (RED method, Four Golden Signals, USE method)

✅ **Alerting**: Best practices for actionable, accurate alerts

✅ **Architecture**: How to design a monitoring system

✅ **Security**: Protecting sensitive data and access control

✅ **Cost Optimization**: Strategies to reduce monitoring costs

## Next Steps

In the next lesson, you'll learn about:
- **ELK Stack Overview**: Deep dive into Elasticsearch, Logstash, and Kibana
- Architecture and components
- When to use ELK vs alternatives
- Planning your ELK deployment

## Additional Resources

### Documentation
- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [The Twelve-Factor App - Logs](https://12factor.net/logs)

### Tools
- [Prometheus](https://prometheus.io/)
- [Grafana](https://grafana.com/)
- [ELK Stack](https://www.elastic.co/elastic-stack)
- [Datadog](https://www.datadoghq.com/)
- [New Relic](https://newrelic.com/)

### Books
- "Site Reliability Engineering" by Google
- "Observability Engineering" by Charity Majors
- "Distributed Systems Observability" by Cindy Sridharan

---

**Practice Exercise**: Design a monitoring strategy for a three-tier web application (web server, API server, database). Include what metrics, logs, and traces you would collect, and what alerts you would set up.
