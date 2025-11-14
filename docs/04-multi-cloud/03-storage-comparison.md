# Storage Services Comparison: Azure vs AWS vs GCP

## Overview

Cloud storage is fundamental to any cloud architecture. This guide compares storage services across Azure, AWS, and Google Cloud Platform, helping you choose the right storage solution for your specific needs.

## Table of Contents

1. [Storage Types Overview](#storage-types-overview)
2. [Object Storage](#object-storage)
3. [Block Storage](#block-storage)
4. [File Storage](#file-storage)
5. [Database Storage](#database-storage)
6. [Archival Storage](#archival-storage)
7. [Performance Comparison](#performance-comparison)
8. [Pricing Comparison](#pricing-comparison)
9. [Security Features](#security-features)
10. [Use Cases and Recommendations](#use-cases-and-recommendations)

---

## Storage Types Overview

### Storage Categories

| Type | Use Case | Azure | AWS | GCP |
|------|----------|-------|-----|-----|
| **Object Storage** | Unstructured data, files, media | Blob Storage | S3 | Cloud Storage |
| **Block Storage** | VM disks, databases | Disk Storage | EBS | Persistent Disk |
| **File Storage** | Shared file systems | Azure Files | EFS | Filestore |
| **SQL Database** | Relational data | SQL Database | RDS | Cloud SQL |
| **NoSQL Database** | Document/key-value | Cosmos DB | DynamoDB | Firestore |
| **Data Warehouse** | Analytics | Synapse Analytics | Redshift | BigQuery |
| **Archive** | Long-term backup | Archive Blob | S3 Glacier | Archive Storage |

---

## Object Storage

Object storage is designed for storing unstructured data like images, videos, backups, and log files. It's the most common and cost-effective storage type.

### Azure Blob Storage

**Overview:**
- Microsoft's object storage service
- Part of Azure Storage Account
- Multiple access tiers for cost optimization

**Storage Tiers:**
1. **Hot**: Frequent access, highest storage cost, lowest access cost
2. **Cool**: Infrequent access (30+ days), lower storage cost, higher access cost
3. **Archive**: Rare access (180+ days), lowest storage cost, highest access cost (with rehydration time)

**Features:**
- Blob types: Block blobs, Append blobs, Page blobs
- Lifecycle management for automatic tier transitions
- Versioning and soft delete
- Immutable storage (WORM - Write Once Read Many)
- Change feed for auditing
- Static website hosting
- Azure CDN integration

**Performance Tiers:**
- Standard (HDD): General purpose
- Premium (SSD): Low latency, high throughput

**Capacity & Limits:**
- Max blob size: 190.7 TiB (block blobs)
- Max storage account capacity: 5 PiB
- Max throughput: 60 Gbps (Premium), 20 Gbps (Standard)

**Pricing (US East, per GB/month):**
- Hot: ~$0.0184
- Cool: ~$0.0100
- Archive: ~$0.00099

### AWS S3 (Simple Storage Service)

**Overview:**
- Industry-standard object storage
- Most mature and feature-rich
- Largest ecosystem of integrations

**Storage Classes:**
1. **S3 Standard**: Frequent access, 99.99% availability
2. **S3 Intelligent-Tiering**: Automatic cost optimization
3. **S3 Standard-IA**: Infrequent access (30+ days)
4. **S3 One Zone-IA**: Infrequent access, single AZ (lower cost)
5. **S3 Glacier Instant Retrieval**: Archive with instant access
6. **S3 Glacier Flexible Retrieval**: Archive (1-5 min to hours retrieval)
7. **S3 Glacier Deep Archive**: Lowest cost archive (12+ hour retrieval)

**Features:**
- Versioning and replication (cross-region, same-region)
- Object Lock (WORM compliance)
- S3 Select (query data in place)
- Event notifications (Lambda, SNS, SQS)
- Static website hosting
- Transfer Acceleration (CloudFront edge locations)
- S3 Batch Operations
- Storage Class Analysis
- S3 Access Points for simplified access management

**Capacity & Limits:**
- Max object size: 5 TB
- Unlimited storage per bucket
- 100 buckets per account (soft limit)
- Max throughput: Unlimited (auto-scaling)

**Pricing (US East, per GB/month):**
- Standard: ~$0.023
- Intelligent-Tiering: ~$0.023 (+ monitoring fee)
- Standard-IA: ~$0.0125
- Glacier Instant: ~$0.004
- Glacier Flexible: ~$0.0036
- Glacier Deep Archive: ~$0.00099

### GCP Cloud Storage

**Overview:**
- Google's object storage service
- Unified API across all storage classes
- Automatic performance optimization

**Storage Classes:**
1. **Standard**: Frequent access, best for hot data
2. **Nearline**: Infrequent access (30+ days)
3. **Coldline**: Rare access (90+ days)
4. **Archive**: Long-term archive (365+ days)

**Features:**
- Automatic storage class transitions
- Object Lifecycle Management
- Versioning and retention policies
- Object holds and retention locks
- Pub/Sub notifications
- Static website hosting
- Signed URLs for temporary access
- Uniform and fine-grained access control
- Transfer Service for data migration
- Dual-region and multi-region options

**Capacity & Limits:**
- Max object size: 5 TiB
- Unlimited storage per bucket
- No bucket limit per project
- Max throughput: Scales automatically

**Pricing (US Multi-Region, per GB/month):**
- Standard: ~$0.020
- Nearline: ~$0.010
- Coldline: ~$0.004
- Archive: ~$0.0012

### Object Storage Comparison

| Feature | Azure Blob | AWS S3 | GCP Cloud Storage |
|---------|-----------|---------|-------------------|
| **Storage Tiers** | 3 (Hot/Cool/Archive) | 7 classes | 4 classes |
| **Durability** | 99.999999999% (11 9's) | 99.999999999% (11 9's) | 99.999999999% (11 9's) |
| **Availability SLA** | 99.9% (Hot) | 99.99% (Standard) | 99.95% (Multi-region) |
| **Max Object Size** | 190.7 TiB | 5 TiB | 5 TiB |
| **Versioning** | Yes | Yes | Yes |
| **Lifecycle Policies** | Yes | Yes | Yes |
| **Encryption** | At rest (default) | At rest (default) | At rest (default) |
| **CDN Integration** | Azure CDN | CloudFront | Cloud CDN |
| **Event Notifications** | Event Grid | Lambda/SNS/SQS | Pub/Sub |
| **Static Hosting** | Yes | Yes | Yes |
| **Transfer Acceleration** | No | Yes | No (but fast globally) |

**Best For:**
- **Azure**: Microsoft ecosystem, hybrid scenarios
- **AWS**: Most features, largest ecosystem, compliance requirements
- **GCP**: Simplicity, cost-effectiveness, global performance

---

## Block Storage

Block storage provides high-performance volumes for virtual machines and databases.

### Azure Disk Storage

**Overview:**
- Managed disks for Azure VMs
- Four disk types for different workloads

**Disk Types:**
1. **Ultra Disk**: Highest performance, lowest latency (sub-ms)
   - Up to 160,000 IOPS, 4,000 MB/s throughput
   - Configurable IOPS and throughput
   - Best for: SAP HANA, top-tier databases, transaction-heavy workloads

2. **Premium SSD v2**: High performance, cost-optimized
   - Up to 80,000 IOPS, 1,200 MB/s throughput
   - Granular performance configuration

3. **Premium SSD**: Production workloads
   - Up to 20,000 IOPS, 900 MB/s throughput
   - Best for: Production VMs, databases

4. **Standard SSD**: Cost-effective for lower IOPS
   - Up to 6,000 IOPS, 750 MB/s throughput
   - Best for: Web servers, dev/test

5. **Standard HDD**: Lowest cost
   - Up to 2,000 IOPS, 500 MB/s throughput
   - Best for: Backups, infrequent access

**Features:**
- Snapshots and images
- Disk encryption (SSE, Azure Disk Encryption)
- Shared disks (multi-attach for clusters)
- Incremental snapshots
- Disk bursting
- Zone-redundant storage (ZRS)

**Pricing (US East, per GB/month):**
- Ultra Disk: ~$0.12 + IOPS/throughput charges
- Premium SSD: ~$0.12 - $0.20 (depending on size)
- Standard SSD: ~$0.075
- Standard HDD: ~$0.04

### AWS EBS (Elastic Block Store)

**Overview:**
- Block storage for EC2 instances
- Multiple volume types for different needs

**Volume Types:**
1. **io2 Block Express**: Highest performance
   - Up to 256,000 IOPS, 4,000 MB/s throughput
   - 99.999% durability
   - Sub-millisecond latency
   - Best for: Mission-critical databases, SAP HANA

2. **io2**: Provisioned IOPS SSD
   - Up to 64,000 IOPS, 1,000 MB/s throughput
   - 99.999% durability
   - Best for: I/O intensive databases

3. **gp3**: General Purpose SSD (latest generation)
   - Up to 16,000 IOPS, 1,000 MB/s throughput
   - Configurable IOPS and throughput
   - Best for: Most workloads, cost-optimized

4. **gp2**: General Purpose SSD (previous generation)
   - Up to 16,000 IOPS, 250 MB/s throughput
   - IOPS scales with volume size
   - Best for: Legacy workloads

5. **st1**: Throughput Optimized HDD
   - Up to 500 IOPS, 500 MB/s throughput
   - Best for: Big data, log processing

6. **sc1**: Cold HDD
   - Up to 250 IOPS, 250 MB/s throughput
   - Best for: Infrequent access, lowest cost

**Features:**
- Snapshots (incremental, stored in S3)
- Encryption (default or custom KMS keys)
- Multi-Attach (io1/io2 volumes to multiple instances)
- Elastic Volumes (resize, change type without downtime)
- Fast Snapshot Restore
- EBS-optimized instances
- CloudWatch monitoring

**Pricing (US East, per GB/month):**
- io2: ~$0.125 + $0.065 per provisioned IOPS
- gp3: ~$0.08 + optional IOPS/throughput charges
- gp2: ~$0.10
- st1: ~$0.045
- sc1: ~$0.015

### GCP Persistent Disk

**Overview:**
- Block storage for Compute Engine instances
- Network-attached storage with replication

**Disk Types:**
1. **Extreme Persistent Disk**: Highest performance
   - Up to 120,000 IOPS, 2,400 MB/s throughput
   - Configurable IOPS
   - Best for: High-performance databases, analytics

2. **SSD Persistent Disk**: Balanced performance
   - Up to 100,000 IOPS, 1,200 MB/s throughput (depending on size)
   - Best for: Production workloads, databases

3. **Balanced Persistent Disk**: Cost-effective performance
   - Up to 80,000 IOPS, 1,200 MB/s throughput
   - Alternative to SSD PD with lower cost
   - Best for: General purpose workloads

4. **Standard Persistent Disk**: HDD, lowest cost
   - Up to 7,500 IOPS, 480 MB/s throughput
   - Best for: Batch processing, cost-sensitive workloads

**Features:**
- Snapshots (incremental, global or regional)
- Encryption (always on, customer-managed keys optional)
- Disk resize (increase size on the fly)
- Regional persistent disks (replicated across zones)
- Local SSD for highest performance (ephemeral)
- Multi-writer mode (shared storage for clusters)

**Pricing (US, per GB/month):**
- Extreme PD: ~$0.125 + provisioned IOPS charges
- SSD PD: ~$0.17
- Balanced PD: ~$0.10
- Standard PD: ~$0.04

### Block Storage Comparison

| Feature | Azure Disk | AWS EBS | GCP Persistent Disk |
|---------|-----------|---------|---------------------|
| **Types** | 5 types | 6 types | 4 types + Local SSD |
| **Max IOPS** | 160,000 (Ultra) | 256,000 (io2 BE) | 120,000 (Extreme) |
| **Max Throughput** | 4,000 MB/s | 4,000 MB/s | 2,400 MB/s |
| **Max Size** | 64 TiB | 64 TiB | 64 TB |
| **Encryption** | Default | Default | Always on |
| **Snapshots** | Incremental | Incremental (S3) | Incremental (global) |
| **Multi-Attach** | Yes (Premium SSD) | Yes (io1/io2) | Yes (multi-writer mode) |
| **Durability** | 99.999% | 99.8-99.999% | 99.9999% (regional) |

---

## File Storage

Managed file storage services providing SMB/NFS file shares.

### Azure Files

**Features:**
- SMB (2.1, 3.0, 3.1.1) and NFS (4.1) protocols
- Active Directory integration
- Azure File Sync (hybrid file sync)
- Snapshots
- Encryption at rest and in transit

**Tiers:**
- Premium (SSD): Low latency, high throughput
- Transaction optimized: Moderate cost
- Hot: Frequent access
- Cool: Infrequent access

**Pricing (Transaction Optimized):**
- ~$0.06 per GB/month
- Transaction charges apply

**Best For:**
- Lift-and-shift applications
- Windows file shares
- Hybrid scenarios with File Sync

### AWS EFS (Elastic File System)

**Features:**
- NFS v4.1 protocol
- Automatically scales (petabyte-scale)
- Multi-AZ redundancy
- Lifecycle management
- Encryption

**Storage Classes:**
- Standard: Frequent access
- Infrequent Access (IA): Cost-optimized

**Pricing:**
- Standard: ~$0.30 per GB/month
- IA: ~$0.025 per GB/month
- Data transfer charges

**Best For:**
- Container storage
- Big data analytics
- Content management
- Web serving

### GCP Filestore

**Features:**
- NFSv3 protocol
- Fully managed NAS
- High performance
- Multiple tiers

**Tiers:**
- Basic: Standard HDD/SSD
- Enterprise: High availability, replication
- Zonal/Regional options

**Pricing:**
- Basic HDD: ~$0.20 per GB/month
- Basic SSD: ~$0.30 per GB/month
- Enterprise: Higher cost for HA

**Best For:**
- Application migration
- Media workflows
- Shared storage for VMs

### File Storage Comparison

| Feature | Azure Files | AWS EFS | GCP Filestore |
|---------|-------------|---------|---------------|
| **Protocol** | SMB, NFS | NFS | NFS |
| **Max Size** | 100 TiB | Unlimited | 100 TB (Enterprise) |
| **Performance** | Up to 10,000 IOPS | Scales with size | Up to 60,000 IOPS |
| **Availability** | LRS, ZRS, GRS | Multi-AZ | Zonal, Regional |
| **AD Integration** | Yes | No | No |
| **Snapshots** | Yes | No (use backups) | Yes |
| **Pricing** | $0.06 - $0.24/GB | $0.025 - $0.30/GB | $0.20 - $0.35/GB |

---

## Database Storage

### Relational Databases

| Feature | Azure SQL | AWS RDS | Cloud SQL |
|---------|-----------|---------|-----------|
| **Engines** | SQL Server, PostgreSQL, MySQL, MariaDB | PostgreSQL, MySQL, MariaDB, Oracle, SQL Server | PostgreSQL, MySQL, SQL Server |
| **Max Storage** | 4 TB (General Purpose)<br>4 TB (Business Critical) | 64 TB (depending on engine) | 64 TB |
| **Backup Retention** | 7-35 days | 0-35 days | 7-365 days |
| **Read Replicas** | Yes | Yes (up to 15) | Yes (up to 10) |
| **Multi-AZ** | Yes (Business Critical) | Yes | Yes (Regional) |
| **Auto-scaling** | Yes (serverless) | Yes (Aurora Serverless) | No |

### NoSQL Databases

| Feature | Cosmos DB | DynamoDB | Firestore |
|---------|-----------|----------|-----------|
| **Type** | Multi-model | Key-value, document | Document |
| **Consistency** | 5 levels | Eventual, strong | Strong, eventual |
| **Global Distribution** | Yes (turnkey) | Yes (Global Tables) | Yes (multi-region) |
| **Auto-scaling** | Yes | Yes | Yes |
| **Max Item Size** | 2 MB | 400 KB | 1 MB |
| **Pricing Model** | RU/s or serverless | On-demand or provisioned | Pay-per-use |

---

## Archival Storage

Long-term storage for data that's rarely accessed.

### Comparison

| Feature | Azure Archive | S3 Glacier Deep | GCP Archive |
|---------|---------------|-----------------|-------------|
| **Retrieval Time** | Hours | 12-48 hours | Hours |
| **Min Storage** | 180 days | 180 days | 365 days |
| **Pricing** | ~$0.00099/GB | ~$0.00099/GB | ~$0.0012/GB |
| **Retrieval Cost** | $0.02/GB | $0.02-0.03/GB | $0.05/GB |
| **Best For** | Compliance backups | Long-term archives | Legal/regulatory holds |

---

## Performance Comparison

### Throughput (Single Object/Disk)

| Service | Read Throughput | Write Throughput |
|---------|-----------------|------------------|
| **Azure Blob (Premium)** | 60 Gbps | 60 Gbps |
| **AWS S3** | 5.5 Gbps per prefix | 3.5 Gbps per prefix |
| **GCP Cloud Storage** | Scales automatically | Scales automatically |
| **Azure Disk (Ultra)** | 4,000 MB/s | 4,000 MB/s |
| **AWS EBS (io2 BE)** | 4,000 MB/s | 4,000 MB/s |
| **GCP PD (Extreme)** | 2,400 MB/s | 2,400 MB/s |

### Latency

| Service | Typical Latency |
|---------|----------------|
| **Azure Blob (Hot)** | 10-20ms |
| **AWS S3** | 100-200ms (first byte) |
| **GCP Cloud Storage** | 10-20ms |
| **Azure Disk (Ultra)** | <1ms |
| **AWS EBS (io2)** | <1ms |
| **GCP PD (Extreme)** | <1ms |

---

## Pricing Comparison

### Storage Costs (per GB/month, US regions)

| Tier | Azure | AWS | GCP |
|------|-------|-----|-----|
| **Hot/Standard Object** | $0.0184 | $0.023 | $0.020 |
| **Cool/IA Object** | $0.010 | $0.0125 | $0.010 |
| **Archive** | $0.00099 | $0.00099 | $0.0012 |
| **Premium SSD Block** | $0.12-0.20 | $0.125 | $0.17 |
| **Standard HDD Block** | $0.04 | $0.015 | $0.04 |

### Data Transfer Costs (per GB)

| Type | Azure | AWS | GCP |
|------|-------|-----|-----|
| **Ingress** | Free | Free | Free |
| **Egress (first GB)** | Free | 100 GB free/month | 200 GB free/month (NA/EU) |
| **Egress (next 10 TB)** | $0.087 | $0.09 | $0.12 |
| **Same Region** | Free | Free | Free |

---

## Security Features

### Encryption

All providers offer:
- Encryption at rest (default)
- Encryption in transit (HTTPS/TLS)
- Customer-managed keys
- Key rotation

### Access Control

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **IAM Integration** | Azure AD, RBAC | IAM policies | Cloud IAM |
| **Shared Access Signatures** | SAS tokens | Pre-signed URLs | Signed URLs |
| **Access Control Lists** | Limited | Yes | Yes |
| **Resource Policies** | Limited | Yes | Yes |
| **Private Endpoints** | Yes | Yes (PrivateLink) | Yes (Private Google Access) |

### Compliance

All three providers offer certifications for:
- SOC 1/2/3
- ISO 27001
- PCI DSS
- HIPAA
- FedRAMP
- GDPR

---

## Use Cases and Recommendations

### Choose Azure Storage When:

- Deep Microsoft ecosystem integration needed
- Hybrid cloud scenarios (on-premises + cloud)
- Need Azure Files for SMB shares
- Using other Azure services extensively

### Choose AWS S3/EBS When:

- Need most comprehensive feature set
- Want largest ecosystem and integrations
- Require advanced features (S3 Select, Intelligent-Tiering)
- Building on AWS platform

### Choose GCP Cloud Storage When:

- Cost optimization is priority
- Need simple, clean APIs
- Global performance is critical
- Using BigQuery for analytics

---

## Decision Matrix

### Object Storage

**Use Case** → **Recommendation:**
- Static website hosting → **Any** (all support this well)
- Large-scale backups → **GCP** (best pricing)
- Media streaming → **AWS S3** (CloudFront integration)
- Data lake → **AWS S3** (best analytics integrations)
- Cost-sensitive → **GCP** (most cost-effective)

### Block Storage

**Use Case** → **Recommendation:**
- Highest IOPS needed → **AWS EBS io2 Block Express**
- SQL Server workload → **Azure Disk** (ecosystem fit)
- General purpose → **AWS gp3** or **GCP Balanced**
- Cost optimization → **All** offer budget options

### File Storage

**Use Case** → **Recommendation:**
- Windows file shares → **Azure Files** (SMB, AD integration)
- Container storage → **AWS EFS** (NFS, auto-scaling)
- High-performance NFS → **GCP Filestore Enterprise**

---

## Summary

### Key Takeaways:

1. **Object Storage**: GCP is most cost-effective, AWS has most features, Azure best for Microsoft stack
2. **Block Storage**: Similar performance across all three, choose based on existing platform
3. **File Storage**: Azure best for Windows, AWS for Linux, GCP for high-performance NFS
4. All providers offer enterprise-grade durability (11 9's) and availability
5. Pricing varies by region and can change; use official calculators

### Quick Recommendations:

- **Lowest Cost**: GCP Cloud Storage
- **Most Features**: AWS S3/EBS
- **Hybrid Cloud**: Azure Storage
- **Best for Databases**: All are excellent; choose based on platform
- **Simplicity**: GCP (cleanest APIs and pricing)

---

## Next Steps

- [Networking Comparison](./04-networking-comparison.md)
- [Multi-Cloud Strategy](./05-multi-cloud-strategy.md)
- [Back to Cloud Comparison](./01-cloud-comparison.md)

---

## Additional Resources

### Pricing Calculators
- [Azure Pricing Calculator](https://azure.microsoft.com/pricing/calculator/)
- [AWS Pricing Calculator](https://calculator.aws/)
- [GCP Pricing Calculator](https://cloud.google.com/products/calculator)

### Official Documentation
- [Azure Storage Documentation](https://docs.microsoft.com/azure/storage/)
- [AWS Storage Documentation](https://aws.amazon.com/products/storage/)
- [GCP Storage Documentation](https://cloud.google.com/storage/docs)
