# AWS RDS - Managed Relational Databases

## Learning Objectives

By the end of this lesson, you will be able to:
- Create and configure RDS instances with Terraform
- Implement database security best practices
- Configure automated backups and snapshots
- Set up Multi-AZ deployments for high availability
- Create read replicas for scalability
- Monitor database performance
- Manage database credentials securely

## Prerequisites

- Completed [06-vpc-networking.md](./06-vpc-networking.md)
- Understanding of relational databases (MySQL, PostgreSQL, etc.)
- Familiarity with VPC and Security Groups

## Time Estimate

**90-120 minutes**

---

## 1. What is Amazon RDS?

Amazon Relational Database Service (RDS) is a managed database service.

**Supported Engines**:
- MySQL
- PostgreSQL
- MariaDB
- Oracle
- Microsoft SQL Server
- Amazon Aurora (MySQL and PostgreSQL compatible)

**Key Features**:
- Automated backups
- Multi-AZ deployments
- Read replicas
- Automatic patching
- Monitoring and metrics
- Encryption at rest and in transit

---

## 2. Basic RDS MySQL Instance

```hcl
# rds-basic.tf
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = "Learning"
      ManagedBy   = "Terraform"
      Project     = "RDS-Tutorial"
    }
  }
}

# Random password for database
resource "random_password" "db_password" {
  length  = 16
  special = true
  # Avoid characters that might cause issues
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# Store password in AWS Secrets Manager
resource "aws_secretsmanager_secret" "db_password" {
  name        = "rds-mysql-password"
  description = "RDS MySQL master password"

  recovery_window_in_days = 0  # For learning - allows immediate deletion
}

resource "aws_secretsmanager_secret_version" "db_password" {
  secret_id     = aws_secretsmanager_secret.db_password.id
  secret_string = random_password.db_password.result
}

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "main-db-subnet-group"
  subnet_ids = aws_subnet.private_db[*].id

  tags = {
    Name = "Main DB Subnet Group"
  }
}

# Security Group for RDS
resource "aws_security_group" "rds" {
  name        = "rds-sg"
  description = "Security group for RDS MySQL"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL from application servers"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "rds-mysql-sg"
  }
}

# RDS MySQL Instance
resource "aws_db_instance" "mysql" {
  identifier = "myapp-mysql"

  # Engine configuration
  engine         = "mysql"
  engine_version = "8.0.35"
  instance_class = "db.t3.micro"  # Free Tier eligible

  # Storage
  allocated_storage     = 20  # GB
  max_allocated_storage = 100 # Enable storage autoscaling
  storage_type          = "gp3"
  storage_encrypted     = true

  # Database configuration
  db_name  = "myappdb"
  username = "admin"
  password = random_password.db_password.result
  port     = 3306

  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup configuration
  backup_retention_period = 7  # days
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["error", "general", "slowquery"]
  performance_insights_enabled    = true
  performance_insights_retention_period = 7

  # Deletion protection
  deletion_protection = false  # Set to true in production
  skip_final_snapshot = true   # Set to false in production

  # Tags
  tags = {
    Name = "myapp-mysql-db"
  }
}

# Outputs
output "db_endpoint" {
  description = "RDS instance endpoint"
  value       = aws_db_instance.mysql.endpoint
}

output "db_name" {
  description = "Database name"
  value       = aws_db_instance.mysql.db_name
}

output "db_username" {
  description = "Database master username"
  value       = aws_db_instance.mysql.username
  sensitive   = true
}

output "db_password_secret_arn" {
  description = "ARN of the secret containing the database password"
  value       = aws_secretsmanager_secret.db_password.arn
}
```

---

## 3. PostgreSQL with Enhanced Configuration

```hcl
# Parameter Group for PostgreSQL
resource "aws_db_parameter_group" "postgres" {
  name   = "postgres-custom"
  family = "postgres16"

  # Custom parameters
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "1000"  # Log queries taking more than 1 second
  }

  tags = {
    Name = "postgres-custom-params"
  }
}

# Option Group (for advanced features)
resource "aws_db_option_group" "postgres" {
  name                     = "postgres-options"
  option_group_description = "PostgreSQL options"
  engine_name              = "postgres"
  major_engine_version     = "16"

  tags = {
    Name = "postgres-options"
  }
}

# PostgreSQL RDS Instance
resource "aws_db_instance" "postgres" {
  identifier = "myapp-postgres"

  engine               = "postgres"
  engine_version       = "16.1"
  instance_class       = "db.t3.small"
  allocated_storage    = 50
  storage_encrypted    = true
  kms_key_id           = aws_kms_key.rds.arn

  db_name  = "myappdb"
  username = "dbadmin"
  password = random_password.db_password.result

  # Custom parameter and option groups
  parameter_group_name = aws_db_parameter_group.postgres.name
  option_group_name    = aws_db_option_group.postgres.name

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  # Backup and maintenance
  backup_retention_period = 14
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  # Monitoring
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  performance_insights_enabled    = true
  monitoring_interval             = 60
  monitoring_role_arn             = aws_iam_role.rds_monitoring.arn

  # Final snapshot
  final_snapshot_identifier = "myapp-postgres-final-snapshot"
  skip_final_snapshot       = false

  tags = {
    Name = "myapp-postgres-db"
  }
}

# KMS key for encryption
resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 10

  tags = {
    Name = "rds-encryption-key"
  }
}

resource "aws_kms_alias" "rds" {
  name          = "alias/rds-encryption"
  target_key_id = aws_kms_key.rds.key_id
}

# IAM role for enhanced monitoring
resource "aws_iam_role" "rds_monitoring" {
  name = "rds-monitoring-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}
```

---

## 4. Multi-AZ Deployment for High Availability

```hcl
# Multi-AZ RDS Instance
resource "aws_db_instance" "mysql_multi_az" {
  identifier = "myapp-mysql-ha"

  engine         = "mysql"
  engine_version = "8.0.35"
  instance_class = "db.t3.small"

  allocated_storage = 100
  storage_encrypted = true

  db_name  = "myappdb"
  username = "admin"
  password = random_password.db_password.result

  # Enable Multi-AZ for automatic failover
  multi_az = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Backups
  backup_retention_period = 30
  copy_tags_to_snapshot   = true

  # Enhanced monitoring
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn

  # Auto minor version upgrades
  auto_minor_version_upgrade = true

  deletion_protection = true
  skip_final_snapshot = false

  tags = {
    Name         = "myapp-mysql-ha"
    HighAvailability = "true"
  }
}

# CloudWatch alarm for database connections
resource "aws_cloudwatch_metric_alarm" "database_connections" {
  alarm_name          = "rds-high-connections"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "DatabaseConnections"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "Alert when database connections are high"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.mysql_multi_az.id
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

# SNS topic for database alerts
resource "aws_sns_topic" "db_alerts" {
  name = "rds-alerts"

  tags = {
    Name = "rds-alerts"
  }
}

resource "aws_sns_topic_subscription" "db_alerts_email" {
  topic_arn = aws_sns_topic.db_alerts.arn
  protocol  = "email"
  endpoint  = "dba@example.com"
}
```

---

## 5. Read Replicas for Scalability

```hcl
# Primary database
resource "aws_db_instance" "primary" {
  identifier = "myapp-primary"

  engine         = "postgres"
  engine_version = "16.1"
  instance_class = "db.t3.medium"

  allocated_storage = 100
  storage_encrypted = true

  db_name  = "myappdb"
  username = "admin"
  password = random_password.db_password.result

  # Enable automated backups (required for read replicas)
  backup_retention_period = 7

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  tags = {
    Name = "primary-database"
  }
}

# Read Replica 1
resource "aws_db_instance" "replica_1" {
  identifier = "myapp-replica-1"

  # Replicate from primary
  replicate_source_db = aws_db_instance.primary.identifier

  # Can use different instance class
  instance_class = "db.t3.small"

  # Can be in different AZ
  availability_zone = "us-east-1b"

  # Read replicas can be publicly accessible for reporting
  publicly_accessible = false

  # No backup needed for read replica (backed up via primary)
  backup_retention_period = 0
  skip_final_snapshot     = true

  tags = {
    Name = "read-replica-1"
    Role = "ReadOnly"
  }
}

# Read Replica 2 (in different region for disaster recovery)
provider "aws" {
  alias  = "us_west"
  region = "us-west-2"
}

resource "aws_db_instance" "replica_cross_region" {
  provider = aws.us_west

  identifier = "myapp-replica-west"

  replicate_source_db = aws_db_instance.primary.arn

  instance_class = "db.t3.small"

  # Cross-region replica configuration
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds_west.arn

  backup_retention_period = 7  # Cross-region replicas can have backups
  skip_final_snapshot     = true

  tags = {
    Name   = "cross-region-replica"
    Region = "us-west-2"
  }
}
```

---

## 6. Aurora Serverless

```hcl
# Aurora Serverless Cluster
resource "aws_rds_cluster" "aurora_serverless" {
  cluster_identifier = "aurora-serverless-cluster"

  engine         = "aurora-mysql"
  engine_mode    = "serverless"
  engine_version = "5.7.mysql_aurora.2.11.3"

  database_name   = "myappdb"
  master_username = "admin"
  master_password = random_password.db_password.result

  # Serverless scaling configuration
  scaling_configuration {
    auto_pause               = true
    max_capacity             = 16
    min_capacity             = 2
    seconds_until_auto_pause = 300
    timeout_action           = "ForceApplyCapacityChange"
  }

  # Network
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  # Backup
  backup_retention_period = 7
  preferred_backup_window = "03:00-04:00"

  # Enable encryption
  storage_encrypted = true
  kms_key_id        = aws_kms_key.rds.arn

  # Enable deletion protection in production
  deletion_protection = false
  skip_final_snapshot = true

  tags = {
    Name = "aurora-serverless"
  }
}
```

---

## 7. Database Snapshots and Backups

```hcl
# Manual snapshot
resource "aws_db_snapshot" "manual_snapshot" {
  db_instance_identifier = aws_db_instance.mysql.id
  db_snapshot_identifier = "myapp-before-migration"

  tags = {
    Name    = "pre-migration-snapshot"
    Created = timestamp()
  }
}

# Restore from snapshot
resource "aws_db_instance" "restored" {
  identifier = "myapp-restored"

  # Restore from snapshot
  snapshot_identifier = aws_db_snapshot.manual_snapshot.id

  instance_class = "db.t3.micro"

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  skip_final_snapshot = true

  tags = {
    Name   = "restored-database"
    Source = "snapshot"
  }
}

# Copy snapshot to another region
resource "aws_db_snapshot_copy" "backup" {
  provider = aws.us_west

  source_db_snapshot_identifier = aws_db_snapshot.manual_snapshot.db_snapshot_arn
  target_db_snapshot_identifier = "myapp-backup-west"

  kms_key_id = aws_kms_key.rds_west.arn

  tags = {
    Name = "cross-region-backup"
  }
}
```

---

## 8. Secrets Management

```hcl
# Retrieve database credentials from Secrets Manager
data "aws_secretsmanager_secret" "db_password" {
  name = aws_secretsmanager_secret.db_password.name
}

data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = data.aws_secretsmanager_secret.db_password.id
}

# Lambda function to rotate password
resource "aws_lambda_function" "rotate_db_password" {
  filename      = "rotate_password.zip"
  function_name = "rotate-db-password"
  role          = aws_iam_role.lambda_rotate.arn
  handler       = "index.handler"
  runtime       = "python3.11"

  environment {
    variables = {
      DB_INSTANCE_ID = aws_db_instance.mysql.id
      SECRET_ARN     = aws_secretsmanager_secret.db_password.arn
    }
  }

  vpc_config {
    subnet_ids         = aws_subnet.private_app[*].id
    security_group_ids = [aws_security_group.lambda.id]
  }
}

# Rotation schedule
resource "aws_secretsmanager_secret_rotation" "db_password" {
  secret_id           = aws_secretsmanager_secret.db_password.id
  rotation_lambda_arn = aws_lambda_function.rotate_db_password.arn

  rotation_rules {
    automatically_after_days = 30
  }
}
```

---

## 9. Monitoring and Alerts

```hcl
# CloudWatch Dashboard for RDS
resource "aws_cloudwatch_dashboard" "rds" {
  dashboard_name = "rds-monitoring"

  dashboard_body = jsonencode({
    widgets = [
      {
        type = "metric"
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", { stat = "Average" }],
            [".", "DatabaseConnections", { stat = "Sum" }],
            [".", "FreeableMemory", { stat = "Average" }],
            [".", "ReadLatency", { stat = "Average" }],
            [".", "WriteLatency", { stat = "Average" }]
          ]
          period = 300
          stat   = "Average"
          region = "us-east-1"
          title  = "RDS Metrics"
        }
      }
    ]
  })
}

# Additional CloudWatch alarms
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "rds-cpu-high"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.mysql.id
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "storage_low" {
  alarm_name          = "rds-storage-low"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "1"
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "10000000000"  # 10 GB in bytes

  dimensions = {
    DBInstanceIdentifier = aws_db_instance.mysql.id
  }

  alarm_actions = [aws_sns_topic.db_alerts.arn]
}
```

---

## 10. Best Practices

### Security

1. **Encryption**
   - Enable encryption at rest
   - Use KMS for key management
   - Enable encryption in transit (SSL/TLS)

2. **Network Isolation**
   - Place RDS in private subnets
   - Use Security Groups for access control
   - Never make production databases publicly accessible

3. **Credentials Management**
   - Use Secrets Manager for passwords
   - Rotate credentials regularly
   - Use IAM authentication when possible

4. **Auditing**
   - Enable CloudWatch Logs
   - Monitor query performance
   - Track failed login attempts

### High Availability

1. **Multi-AZ Deployments**
   - Enable for production databases
   - Automatic failover within minutes
   - No data loss

2. **Automated Backups**
   - Minimum 7-day retention
   - 30 days for critical systems
   - Test restore procedures

3. **Read Replicas**
   - Offload read traffic
   - Cross-region for disaster recovery
   - Can be promoted to standalone

### Performance

1. **Right-sizing**
   - Choose appropriate instance type
   - Monitor and adjust based on metrics
   - Use Provisioned IOPS for high-performance needs

2. **Parameter Tuning**
   - Create custom parameter groups
   - Optimize for your workload
   - Monitor slow queries

3. **Connection Pooling**
   - Use RDS Proxy for Lambda
   - Implement application-level pooling
   - Monitor connection count

### Cost Optimization

1. **Reserved Instances**
   - 1-year or 3-year commitments
   - Significant cost savings

2. **Storage Optimization**
   - Enable storage autoscaling
   - Use appropriate storage type (gp3 vs io1)
   - Archive old data

3. **Right-size Instances**
   - Start small and scale up
   - Use Performance Insights to optimize

---

## Hands-On Exercises

### Exercise 1: Production-Ready Database

Create an RDS instance with:
- Multi-AZ enabled
- Encrypted storage
- Automated backups (30 days)
- Enhanced monitoring
- CloudWatch alarms

### Exercise 2: Read Replica Setup

Deploy:
- Primary database
- Two read replicas in same region
- One cross-region replica
- Application load balancing between replicas

### Exercise 3: Disaster Recovery

Implement:
- Automated snapshots
- Cross-region snapshot copies
- Restore procedure documentation
- Recovery time testing

---

## Key Takeaways

- RDS provides managed relational database service
- Multi-AZ deployments ensure high availability
- Read replicas improve read performance and provide DR
- Always encrypt databases in production
- Use Secrets Manager for credential management
- Monitor performance with CloudWatch and Performance Insights
- Test backup and restore procedures regularly

---

## Next Steps

In the next lesson, we'll cover:
- Creating reusable Terraform modules
- Module design patterns
- Publishing modules to registry
- Version management

**Continue to**: [08-aws-modules.md](./08-aws-modules.md)

---

## Additional Resources

- [RDS Documentation](https://docs.aws.amazon.com/rds/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html)
- [Aurora Documentation](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/)
- [Terraform AWS RDS](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance)

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty**: Intermediate ⭐⭐

**Next Lesson**: [AWS Modules](./08-aws-modules.md)
