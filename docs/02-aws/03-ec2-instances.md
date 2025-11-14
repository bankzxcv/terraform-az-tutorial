# AWS EC2 Instances - Compute in the Cloud

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand EC2 instance types and use cases
- Launch and manage EC2 instances with Terraform
- Work with Amazon Machine Images (AMIs)
- Use user data for instance initialization
- Configure instance metadata and tags
- Implement EC2 best practices for cost and performance

## Prerequisites

- Completed [02-aws-basics.md](./02-aws-basics.md)
- Understanding of VPC and Security Groups
- SSH key pair knowledge (helpful but not required)

## Time Estimate

**90-120 minutes**

---

## 1. What is Amazon EC2?

Amazon Elastic Compute Cloud (EC2) provides scalable computing capacity in the AWS cloud.

**Key Features**:
- Virtual servers (instances) in the cloud
- Multiple instance types optimized for different workloads
- Pay-per-use pricing
- Integration with other AWS services
- Auto Scaling capabilities

**Common Use Cases**:
- Web applications
- Development and test environments
- Batch processing
- High-performance computing
- Machine learning training

---

## 2. EC2 Instance Types

### Instance Type Families

```
┌──────────────────────────────────────────────────┐
│         EC2 Instance Type Families               │
├──────────────────────────────────────────────────┤
│ T3  │ Burstable (general purpose, low cost)    │
│ M6  │ Balanced (general purpose workloads)     │
│ C6  │ Compute Optimized (CPU intensive)        │
│ R6  │ Memory Optimized (large datasets)        │
│ P4  │ GPU (ML, graphics, HPC)                  │
│ I3  │ Storage Optimized (high I/O)             │
└──────────────────────────────────────────────────┘
```

### Instance Sizing

Format: `family.size`
- **t3.micro**: 2 vCPU, 1 GB RAM (Free Tier eligible)
- **t3.small**: 2 vCPU, 2 GB RAM
- **t3.medium**: 2 vCPU, 4 GB RAM
- **m5.large**: 2 vCPU, 8 GB RAM
- **c5.xlarge**: 4 vCPU, 8 GB RAM

---

## 3. Creating Your First EC2 Instance

### Basic EC2 Instance

```hcl
# ec2-basic.tf
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
      Project     = "EC2-Tutorial"
    }
  }
}

# Get the latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Create a key pair for SSH access
resource "aws_key_pair" "deployer" {
  key_name   = "deployer-key"
  public_key = file("~/.ssh/id_rsa.pub")  # Your SSH public key
}

# Create a simple EC2 instance
resource "aws_instance" "web_server" {
  # AMI ID - Amazon Linux 2023
  ami           = data.aws_ami.amazon_linux.id

  # Instance type - Free Tier eligible
  instance_type = "t3.micro"

  # SSH key pair
  key_name      = aws_key_pair.deployer.key_name

  # Security group (created in previous lesson)
  vpc_security_group_ids = [aws_security_group.web.id]

  # Subnet (created in previous lesson)
  subnet_id = aws_subnet.public.id

  # Storage
  root_block_device {
    volume_size = 8   # GB
    volume_type = "gp3"
    encrypted   = true
    delete_on_termination = true
  }

  # Instance metadata options (security)
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # IMDSv2
    http_put_response_hop_limit = 1
  }

  # Tags
  tags = {
    Name = "web-server-1"
    Type = "WebServer"
  }
}

# Elastic IP for static public IP
resource "aws_eip" "web_server" {
  instance = aws_instance.web_server.id
  domain   = "vpc"

  tags = {
    Name = "web-server-eip"
  }
}

# Outputs
output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.web_server.id
}

output "instance_public_ip" {
  description = "Public IP address of the instance"
  value       = aws_eip.web_server.public_ip
}

output "instance_private_ip" {
  description = "Private IP address of the instance"
  value       = aws_instance.web_server.private_ip
}
```

### Deploy the Instance

```bash
# Generate SSH key if you don't have one
ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""

# Initialize and apply
terraform init
terraform plan
terraform apply

# SSH into the instance
terraform output -raw instance_public_ip
ssh -i ~/.ssh/id_rsa ec2-user@<PUBLIC_IP>
```

---

## 4. User Data - Bootstrap Scripts

User data allows you to run scripts when an instance first boots.

### Simple User Data Example

```hcl
resource "aws_instance" "web_with_userdata" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"
  key_name      = aws_key_pair.deployer.key_name

  vpc_security_group_ids = [aws_security_group.web.id]
  subnet_id              = aws_subnet.public.id

  # User data - runs on first boot
  user_data = <<-EOF
              #!/bin/bash
              # Update system packages
              yum update -y

              # Install and start Apache web server
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd

              # Create a simple web page
              cat > /var/www/html/index.html <<HTML
              <!DOCTYPE html>
              <html>
              <head>
                <title>My EC2 Instance</title>
              </head>
              <body>
                <h1>Hello from EC2!</h1>
                <p>Instance ID: $(ec2-metadata --instance-id | cut -d " " -f 2)</p>
                <p>Availability Zone: $(ec2-metadata --availability-zone | cut -d " " -f 2)</p>
              </body>
              </html>
              HTML
              EOF

  # Important: Replace user data on updates
  user_data_replace_on_change = true

  tags = {
    Name = "web-server-with-apache"
  }
}
```

### Advanced User Data with Template

```hcl
# Create a template file: web_server_init.sh
data "template_file" "user_data" {
  template = file("${path.module}/user_data.sh")

  vars = {
    server_name = "production-web-1"
    environment = "production"
    region      = var.aws_region
  }
}

resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.small"

  user_data = data.template_file.user_data.rendered

  tags = {
    Name = "templated-web-server"
  }
}
```

**user_data.sh**:
```bash
#!/bin/bash
set -e

# Variables from Terraform
SERVER_NAME="${server_name}"
ENVIRONMENT="${environment}"
REGION="${region}"

# Log everything
exec > >(tee /var/log/user-data.log)
exec 2>&1

echo "Starting user data script..."
echo "Server: $SERVER_NAME"
echo "Environment: $ENVIRONMENT"
echo "Region: $REGION"

# Update system
yum update -y

# Install packages
yum install -y \
  httpd \
  git \
  docker \
  aws-cli

# Start services
systemctl start httpd
systemctl enable httpd

# Configure application
mkdir -p /opt/app
cd /opt/app

# Download application
git clone https://github.com/your-org/your-app.git

echo "User data script completed!"
```

---

## 5. Amazon Machine Images (AMIs)

### Finding AMIs

```hcl
# Find Ubuntu AMI
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]  # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Find Amazon Linux 2023
data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

# Find Windows Server
data "aws_ami" "windows" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["Windows_Server-2022-English-Full-Base-*"]
  }
}

# Use the AMIs
resource "aws_instance" "ubuntu_server" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  tags = {
    Name = "ubuntu-server"
  }
}
```

### Creating Custom AMIs

```hcl
# Create an AMI from an existing instance
resource "aws_ami_from_instance" "custom_ami" {
  name               = "web-server-v1.0"
  source_instance_id = aws_instance.web_server.id

  tags = {
    Name    = "CustomWebServerAMI"
    Version = "1.0"
  }
}

# Launch instance from custom AMI
resource "aws_instance" "from_custom_ami" {
  ami           = aws_ami_from_instance.custom_ami.id
  instance_type = "t3.micro"

  tags = {
    Name = "instance-from-custom-ami"
  }
}
```

---

## 6. Advanced EC2 Configurations

### Multiple Network Interfaces

```hcl
# Create additional network interface
resource "aws_network_interface" "secondary" {
  subnet_id       = aws_subnet.private.id
  security_groups = [aws_security_group.app.id]

  tags = {
    Name = "secondary-network-interface"
  }
}

# Instance with multiple NICs
resource "aws_instance" "multi_nic" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.small"

  # Primary network interface
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.web.id]

  tags = {
    Name = "multi-nic-instance"
  }
}

# Attach secondary network interface
resource "aws_network_interface_attachment" "secondary" {
  instance_id          = aws_instance.multi_nic.id
  network_interface_id = aws_network_interface.secondary.id
  device_index         = 1
}
```

### EBS Volume Management

```hcl
# Additional EBS volume
resource "aws_ebs_volume" "data" {
  availability_zone = aws_instance.web_server.availability_zone
  size              = 20  # GB
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "data-volume"
  }
}

# Attach EBS volume to instance
resource "aws_volume_attachment" "data_attach" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.data.id
  instance_id = aws_instance.web_server.id
}

# Configure instance with optimized storage
resource "aws_instance" "storage_optimized" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.medium"

  # Root volume
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    iops                  = 3000
    throughput            = 125
    encrypted             = true
    delete_on_termination = true
  }

  # Additional volumes
  ebs_block_device {
    device_name           = "/dev/sdb"
    volume_size           = 50
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = false
  }

  tags = {
    Name = "storage-optimized-instance"
  }
}
```

---

## 7. Instance Profile and IAM Role

```hcl
# IAM role for EC2 instance
resource "aws_iam_role" "ec2_role" {
  name = "ec2-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })
}

# Policy for S3 access
resource "aws_iam_role_policy" "s3_access" {
  name = "s3-access"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::my-app-bucket",
          "arn:aws:s3:::my-app-bucket/*"
        ]
      }
    ]
  })
}

# CloudWatch Logs policy
resource "aws_iam_role_policy_attachment" "cloudwatch" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

# Instance profile
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "ec2-app-profile"
  role = aws_iam_role.ec2_role.name
}

# EC2 instance with IAM role
resource "aws_instance" "app_server" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Attach IAM instance profile
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  user_data = <<-EOF
              #!/bin/bash
              # Now this instance can access S3 without credentials!
              aws s3 ls s3://my-app-bucket/
              EOF

  tags = {
    Name = "app-server-with-iam"
  }
}
```

---

## 8. Monitoring and Logging

### CloudWatch Monitoring

```hcl
# Enable detailed monitoring
resource "aws_instance" "monitored" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  # Enable detailed CloudWatch monitoring (1-minute intervals)
  monitoring = true

  tags = {
    Name = "monitored-instance"
  }
}

# CloudWatch alarm for CPU utilization
resource "aws_cloudwatch_metric_alarm" "cpu_high" {
  alarm_name          = "high-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = "300"  # 5 minutes
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "This metric monitors ec2 cpu utilization"

  dimensions = {
    InstanceId = aws_instance.monitored.id
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
}

# SNS topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "ec2-alerts"
}

resource "aws_sns_topic_subscription" "alerts_email" {
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = "admin@example.com"
}
```

### User Data Logging

```hcl
resource "aws_instance" "logged" {
  ami           = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  user_data = <<-EOF
              #!/bin/bash
              # Log user data output to CloudWatch
              exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

              echo "Starting instance initialization"

              # Install CloudWatch agent
              wget https://s3.amazonaws.com/amazoncloudwatch-agent/amazon_linux/amd64/latest/amazon-cloudwatch-agent.rpm
              rpm -U ./amazon-cloudwatch-agent.rpm

              # Configure CloudWatch agent
              cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<JSON
              {
                "logs": {
                  "logs_collected": {
                    "files": {
                      "collect_list": [
                        {
                          "file_path": "/var/log/user-data.log",
                          "log_group_name": "/aws/ec2/user-data",
                          "log_stream_name": "{instance_id}"
                        }
                      ]
                    }
                  }
                }
              }
              JSON

              # Start CloudWatch agent
              /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
                -a fetch-config \
                -m ec2 \
                -s \
                -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json

              echo "Initialization complete"
              EOF

  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  tags = {
    Name = "logged-instance"
  }
}
```

---

## 9. Auto Scaling Group (Preview)

```hcl
# Launch template for Auto Scaling
resource "aws_launch_template" "web" {
  name_prefix   = "web-server-"
  image_id      = data.aws_ami.amazon_linux.id
  instance_type = "t3.micro"

  vpc_security_group_ids = [aws_security_group.web.id]

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  user_data = base64encode(<<-EOF
              #!/bin/bash
              yum update -y
              yum install -y httpd
              systemctl start httpd
              systemctl enable httpd
              echo "<h1>Hello from $(ec2-metadata --instance-id)</h1>" > /var/www/html/index.html
              EOF
  )

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "web-asg-instance"
    }
  }
}

# Auto Scaling Group
resource "aws_autoscaling_group" "web" {
  name                = "web-asg"
  vpc_zone_identifier = [aws_subnet.public.id]
  desired_capacity    = 2
  max_size            = 4
  min_size            = 1

  launch_template {
    id      = aws_launch_template.web.id
    version = "$Latest"
  }

  tag {
    key                 = "Name"
    value               = "web-asg-instance"
    propagate_at_launch = true
  }
}
```

---

## 10. Best Practices

### Cost Optimization

1. **Right-size instances**
   ```hcl
   # Start small, scale as needed
   instance_type = "t3.micro"  # Free Tier eligible
   ```

2. **Use Spot Instances for non-critical workloads**
   ```hcl
   resource "aws_spot_instance_request" "spot" {
     ami           = data.aws_ami.amazon_linux.id
     spot_price    = "0.03"
     instance_type = "t3.medium"
   }
   ```

3. **Stop instances when not in use**
   ```bash
   # Stop instance to save costs
   aws ec2 stop-instances --instance-ids i-1234567890abcdef0
   ```

### Security Best Practices

1. **Use IMDSv2**
   ```hcl
   metadata_options {
     http_tokens = "required"  # Require IMDSv2
   }
   ```

2. **Encrypt EBS volumes**
   ```hcl
   root_block_device {
     encrypted = true
   }
   ```

3. **Use Systems Manager for access (no SSH keys)**
   ```hcl
   iam_instance_profile = aws_iam_instance_profile.ssm_profile.name
   ```

### Reliability Best Practices

1. **Use multiple Availability Zones**
2. **Enable detailed monitoring**
3. **Set up CloudWatch alarms**
4. **Use Auto Scaling Groups**

---

## Hands-On Exercises

### Exercise 1: Web Server with Auto-Healing

Create an EC2 instance that:
- Runs Apache web server
- Has CloudWatch alarm for status checks
- Auto-recovers on failure

### Exercise 2: Multi-AZ Deployment

Deploy web servers in:
- Two different availability zones
- Behind an Application Load Balancer
- With Auto Scaling enabled

### Exercise 3: Secure Instance

Create an instance with:
- Systems Manager access (no SSH)
- Encrypted storage
- IAM role for S3 access
- CloudWatch logging

---

## Key Takeaways

- EC2 provides flexible, scalable compute capacity
- Choose instance types based on workload requirements
- Use user data for instance initialization
- Always use IAM roles instead of access keys
- Enable monitoring and logging for production workloads
- Encrypt EBS volumes for security
- Use Auto Scaling for high availability

---

## Next Steps

In the next lesson, we'll cover:
- S3 bucket creation and configuration
- Bucket policies and access control
- Versioning and lifecycle rules
- Static website hosting

**Continue to**: [04-s3-storage.md](./04-s3-storage.md)

---

## Additional Resources

- [EC2 Instance Types](https://aws.amazon.com/ec2/instance-types/)
- [EC2 User Data](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html)
- [AMI Documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html)
- [Terraform AWS EC2](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance)

---

**Estimated Completion Time**: 90-120 minutes

**Difficulty**: Intermediate ⭐⭐

**Next Lesson**: [S3 Storage](./04-s3-storage.md)
