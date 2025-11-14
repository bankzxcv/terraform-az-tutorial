# Sample Application with ELK Logging

This example demonstrates a complete end-to-end logging solution with:
- Sample Node.js application generating logs
- Filebeat shipping logs to Logstash
- Logstash processing and enriching logs
- Elasticsearch storing logs
- Kibana dashboard for visualization

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Sample Node.js Application                   │
│                                                     │
│  ┌────────────────────────────────────────────┐   │
│  │  Express API Server                        │   │
│  │                                            │   │
│  │  Endpoints:                                │   │
│  │  - GET  /                                  │   │
│  │  - GET  /api/users                         │   │
│  │  - POST /api/users                         │   │
│  │  - GET  /api/health                        │   │
│  │  - POST /api/simulate-error                │   │
│  │                                            │   │
│  │  Logging:                                  │   │
│  │  - Winston logger                          │   │
│  │  - JSON format                             │   │
│  │  - Multiple transports                     │   │
│  │    • Console                               │   │
│  │    • File (app.log)                        │   │
│  └────────────┬───────────────────────────────┘   │
└───────────────┼───────────────────────────────────┘
                │
                ▼ (reads logs)
       ┌────────────────┐
       │   Filebeat     │
       │   (Shipper)    │
       └────────┬───────┘
                │
                ▼ (sends to)
       ┌────────────────┐
       │   Logstash     │
       │  (Processor)   │
       │                │
       │  - Parse JSON  │
       │  - Add fields  │
       │  - GeoIP       │
       │  - Enrich      │
       └────────┬───────┘
                │
                ▼ (indexes)
       ┌────────────────┐
       │ Elasticsearch  │
       │   (Storage)    │
       └────────┬───────┘
                │
                ▼ (visualizes)
       ┌────────────────┐
       │     Kibana     │
       │  (Dashboard)   │
       │                │
       │  - Logs view   │
       │  - Dashboards  │
       │  - Analytics   │
       └────────────────┘
```

## Features

### Application Features
- RESTful API with CRUD operations
- Structured JSON logging
- Multiple log levels (INFO, WARN, ERROR)
- Request/Response logging middleware
- Error simulation for testing
- Health check endpoint
- Correlation IDs for tracing

### Logging Features
- Structured logs (JSON format)
- Contextual information:
  - Timestamp
  - Log level
  - Message
  - Request ID
  - User info
  - Latency
  - HTTP details
- Winston logger with multiple transports
- Log rotation
- Environment-based configuration

### ELK Integration
- Filebeat for log shipping
- Logstash for processing
- Elasticsearch for storage
- Pre-built Kibana dashboards

## Quick Start

### Option 1: Docker Compose (Recommended)

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f app

# Access services
# Application: http://localhost:3000
# Kibana: http://localhost:5601
# Elasticsearch: http://localhost:9200
```

### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start application
npm start

# Generate test traffic
npm run generate-logs
```

## Application Endpoints

### GET /
Welcome message

```bash
curl http://localhost:3000/
```

### GET /api/health
Health check endpoint

```bash
curl http://localhost:3000/api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T10:00:00.000Z",
  "uptime": 123.45
}
```

### GET /api/users
Get all users

```bash
curl http://localhost:3000/api/users
```

**Response:**
```json
{
  "users": [
    {
      "id": 1,
      "name": "Alice",
      "email": "alice@example.com"
    }
  ]
}
```

### POST /api/users
Create a new user

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Bob", "email": "bob@example.com"}'
```

### POST /api/simulate-error
Simulate an error for testing

```bash
curl -X POST http://localhost:3000/api/simulate-error
```

## Log Examples

### INFO Log
```json
{
  "timestamp": "2025-11-14T10:00:00.123Z",
  "level": "info",
  "message": "User created successfully",
  "requestId": "req_abc123",
  "userId": 42,
  "method": "POST",
  "path": "/api/users",
  "statusCode": 201,
  "latency": 45,
  "service": "sample-app",
  "environment": "development"
}
```

### ERROR Log
```json
{
  "timestamp": "2025-11-14T10:01:00.456Z",
  "level": "error",
  "message": "Database connection failed",
  "requestId": "req_def456",
  "error": {
    "name": "ConnectionError",
    "message": "Timeout after 5000ms",
    "stack": "Error: Timeout...\n  at ..."
  },
  "method": "GET",
  "path": "/api/users",
  "statusCode": 500,
  "service": "sample-app",
  "environment": "development"
}
```

### REQUEST Log
```json
{
  "timestamp": "2025-11-14T10:02:00.789Z",
  "level": "info",
  "message": "Incoming request",
  "requestId": "req_ghi789",
  "method": "GET",
  "path": "/api/users",
  "userAgent": "curl/7.68.0",
  "ip": "192.168.1.100",
  "service": "sample-app"
}
```

## Kibana Dashboards

### 1. Import Dashboards

```bash
# In Kibana, go to Stack Management → Saved Objects
# Import: kibana-dashboards/app-overview.ndjson
```

### 2. Available Dashboards

#### Application Overview
- Request rate over time
- Error rate
- Response time (p50, p95, p99)
- Top endpoints
- HTTP status code distribution

#### Error Analysis
- Error count by type
- Error trend
- Top error messages
- Error rate by endpoint

#### User Activity
- User actions
- Most active users
- User journey visualization

## Logstash Pipeline

The Logstash pipeline processes logs with:

```ruby
input {
  beats {
    port => 5044
  }
}

filter {
  # Parse JSON logs
  json {
    source => "message"
  }

  # Add GeoIP data
  geoip {
    source => "ip"
    target => "geoip"
  }

  # Calculate processing time
  ruby {
    code => "event.set('processing_time', Time.now - event.get('@timestamp'))"
  }

  # Add environment tag
  mutate {
    add_tag => ["application", "nodejs"]
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "app-logs-%{+YYYY.MM.dd}"
  }
}
```

## Testing

### Generate Test Traffic

```bash
# Run load test
npm run load-test

# Generates:
# - 100 successful requests
# - 10 error requests
# - Various endpoints
# - Different user IDs
```

### Monitor in Real-Time

```bash
# Watch logs
tail -f logs/app.log

# Or in Kibana:
# Discover → Index pattern: app-logs-*
# Filter: level:error
```

## Queries and Visualizations

### Search Queries in Kibana

```
# All errors
level:error

# Errors for specific endpoint
level:error AND path:"/api/users"

# Slow requests (> 1000ms)
latency > 1000

# Requests from specific user
userId:42

# Time range
@timestamp > "2025-11-14T00:00:00" AND @timestamp < "2025-11-14T23:59:59"
```

### Aggregations

```bash
# Error rate by endpoint
GET /app-logs-*/_search
{
  "size": 0,
  "aggs": {
    "by_endpoint": {
      "terms": {
        "field": "path.keyword"
      },
      "aggs": {
        "error_rate": {
          "filters": {
            "filters": {
              "errors": { "match": { "level": "error" }}
            }
          }
        }
      }
    }
  }
}
```

## Alerting

### Create Alert for High Error Rate

```json
{
  "name": "High Error Rate",
  "tags": ["production", "critical"],
  "schedule": { "interval": "1m" },
  "params": {
    "index": ["app-logs-*"],
    "timeField": "@timestamp",
    "aggType": "count",
    "groupBy": "all",
    "timeWindowSize": 5,
    "timeWindowUnit": "m",
    "thresholdComparator": ">",
    "threshold": [10]
  },
  "actions": [{
    "group": "threshold met",
    "id": "slack-connector",
    "params": {
      "message": "Error rate exceeded 10 errors in 5 minutes"
    }
  }]
}
```

## Deployment

### Production Considerations

1. **Log Rotation**
   ```javascript
   // winston-daily-rotate-file
   maxSize: '20m',
   maxFiles: '14d'
   ```

2. **Performance**
   - Async logging
   - Buffer flushing
   - Sampling for high-volume

3. **Security**
   - Don't log sensitive data (passwords, tokens)
   - Mask PII
   - Secure log storage

4. **Reliability**
   - Filebeat retry mechanism
   - Dead letter queue
   - Monitoring

### Environment Variables

```bash
# Application
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# ELK
ELASTICSEARCH_HOST=elasticsearch:9200
LOGSTASH_HOST=logstash:5044
KIBANA_HOST=kibana:5601
```

## Troubleshooting

### Logs not appearing in Kibana

1. Check Filebeat is running:
   ```bash
   docker-compose ps filebeat
   ```

2. Test Filebeat connection:
   ```bash
   docker-compose exec filebeat filebeat test output
   ```

3. Check Logstash is receiving:
   ```bash
   curl http://localhost:9600/_node/stats/pipelines?pretty
   ```

4. Verify index exists:
   ```bash
   curl http://localhost:9200/_cat/indices?v
   ```

### Application not logging

1. Check log level:
   ```bash
   LOG_LEVEL=debug npm start
   ```

2. Verify log file:
   ```bash
   tail -f logs/app.log
   ```

3. Check Winston configuration

## Cleanup

```bash
# Stop all services
docker-compose down

# Remove volumes (deletes all data)
docker-compose down -v
```

## Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Filebeat Documentation](https://www.elastic.co/guide/en/beats/filebeat/current/index.html)
- [Express.js Best Practices](https://expressjs.com/en/advanced/best-practice-performance.html)

---

**Time to Complete**: 20 minutes
**Difficulty**: Beginner
**Prerequisites**: Docker, Node.js
