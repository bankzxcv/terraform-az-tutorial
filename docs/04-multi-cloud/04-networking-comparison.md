# Networking Comparison: Azure VNet vs AWS VPC vs GCP VPC

## Overview

Cloud networking is the foundation of your cloud infrastructure. This guide compares the networking services and concepts across Azure, AWS, and Google Cloud Platform, helping you understand how to design secure, scalable network architectures in each cloud.

## Table of Contents

1. [Virtual Network Fundamentals](#virtual-network-fundamentals)
2. [Network Architecture](#network-architecture)
3. [IP Addressing and Subnets](#ip-addressing-and-subnets)
4. [Connectivity Options](#connectivity-options)
5. [Load Balancing](#load-balancing)
6. [DNS Services](#dns-services)
7. [Network Security](#network-security)
8. [VPN and Hybrid Connectivity](#vpn-and-hybrid-connectivity)
9. [Performance and Limits](#performance-and-limits)
10. [Pricing Comparison](#pricing-comparison)

---

## Virtual Network Fundamentals

### Terminology Mapping

| Concept | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Virtual Network** | Virtual Network (VNet) | Virtual Private Cloud (VPC) | Virtual Private Cloud (VPC) |
| **Subnet** | Subnet | Subnet | Subnet |
| **Network Interface** | NIC | ENI (Elastic Network Interface) | Network Interface |
| **Route Table** | Route Table | Route Table | Routes (global) |
| **Network ACL** | NSG (Network Security Group) | NACL | Firewall Rules |
| **NAT Gateway** | NAT Gateway | NAT Gateway | Cloud NAT |
| **Private Link** | Private Link | PrivateLink | Private Service Connect |
| **VPN Gateway** | VPN Gateway | Virtual Private Gateway | Cloud VPN |
| **Interconnect** | ExpressRoute | Direct Connect | Cloud Interconnect |

---

## Network Architecture

### Azure Virtual Network (VNet)

**Architecture:**
- Regional resource (exists in single region)
- Contains one or more subnets
- Subnets are subdivisions of VNet CIDR
- Network Security Groups (NSGs) control traffic

**Key Characteristics:**
- VNets are isolated by default
- No transitive routing between VNets
- Requires VNet Peering or VPN for inter-VNet communication
- Service Endpoints for PaaS services
- Private Endpoints for private connectivity

**Address Space:**
- RFC 1918 private addresses recommended
- /8 to /29 CIDR blocks supported
- Multiple CIDR blocks per VNet

**Example Structure:**
```
VNet: 10.0.0.0/16 (Region: East US)
├── Subnet: Web (10.0.1.0/24)
├── Subnet: App (10.0.2.0/24)
├── Subnet: Data (10.0.3.0/24)
└── Subnet: Management (10.0.4.0/24)
```

### AWS Virtual Private Cloud (VPC)

**Architecture:**
- Regional resource
- Subnets are availability zone specific
- Route tables control traffic routing
- Security Groups and NACLs for security

**Key Characteristics:**
- VPCs are isolated by default
- Default VPC provided in each region
- VPC Peering for inter-VPC communication
- VPC Endpoints for AWS services
- Most mature and feature-rich

**Address Space:**
- /16 to /28 CIDR blocks
- Primary CIDR + up to 4 secondary CIDRs
- RFC 1918 or publicly routable addresses

**Example Structure:**
```
VPC: 10.0.0.0/16 (Region: us-east-1)
├── Subnet: Public-1a (10.0.1.0/24, AZ: us-east-1a)
├── Subnet: Public-1b (10.0.2.0/24, AZ: us-east-1b)
├── Subnet: Private-1a (10.0.10.0/24, AZ: us-east-1a)
└── Subnet: Private-1b (10.0.11.0/24, AZ: us-east-1b)
```

### GCP Virtual Private Cloud (VPC)

**Architecture:**
- Global resource (spans all regions)
- Subnets are regional (can span multiple zones)
- Global route table
- Firewall rules are global

**Key Characteristics:**
- VPC is global by default (unique advantage)
- Subnets are regional, not zonal
- VPC Peering for inter-VPC communication
- Private Google Access for GCP services
- Simpler design philosophy

**Address Space:**
- Custom or auto mode
- Auto mode: Automatic subnet in each region
- Custom mode: Manual subnet creation
- RFC 1918 addresses

**Example Structure:**
```
VPC: my-global-vpc (Global)
├── Subnet: us-central1 (10.0.1.0/24, Region: us-central1)
├── Subnet: europe-west1 (10.0.2.0/24, Region: europe-west1)
└── Subnet: asia-east1 (10.0.3.0/24, Region: asia-east1)
```

### Architecture Comparison

| Feature | Azure VNet | AWS VPC | GCP VPC |
|---------|-----------|---------|---------|
| **Scope** | Regional | Regional | **Global** |
| **Max VNets/VPCs** | 1,000 per region | 5 per region (soft limit) | 15 per project (can increase) |
| **Max Subnets** | 3,000 per VNet | 200 per VPC | Depends on quota |
| **Subnet Scope** | VNet-specific | AZ-specific | Regional |
| **CIDR Range** | /8 to /29 | /16 to /28 | /8 to /29 (RFC 1918) |
| **Default Network** | No | Yes | Yes (auto mode) |
| **Multiple CIDRs** | Yes | Yes (1 primary + 4 secondary) | Yes |

---

## IP Addressing and Subnets

### Reserved IP Addresses

**Azure:**
- First 3 IPs in subnet: Network, gateway, reserved
- Last IP: Broadcast
- Example: 10.0.1.0/24
  - 10.0.1.0: Network address
  - 10.0.1.1: Default gateway
  - 10.0.1.2: Azure DNS
  - 10.0.1.3: Reserved
  - 10.0.1.255: Broadcast

**AWS:**
- First 4 IPs and last IP reserved
- Example: 10.0.1.0/24
  - 10.0.1.0: Network address
  - 10.0.1.1: VPC router
  - 10.0.1.2: DNS server
  - 10.0.1.3: Future use
  - 10.0.1.255: Broadcast

**GCP:**
- First 2 IPs and last 2 IPs reserved
- Example: 10.0.1.0/24
  - 10.0.1.0: Network
  - 10.0.1.1: Default gateway
  - 10.0.1.254: Reserved
  - 10.0.1.255: Broadcast

### Public IP Addresses

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Static IP** | Static Public IP | Elastic IP (EIP) | Static External IP |
| **Dynamic IP** | Dynamic Public IP | Public IP (auto-assigned) | Ephemeral External IP |
| **IPv6 Support** | Yes | Yes | Yes |
| **Bring Your Own IP** | Yes (custom IP prefix) | Yes (BYOIP) | Yes (BYOIP) |
| **Cost** | Free if attached | Free if attached | Charged per hour |

### Private IP Addresses

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Assignment** | Dynamic or Static | Dynamic or Static | Dynamic or Static |
| **Retain on Stop** | Yes | Yes | Yes |
| **Multiple IPs** | Yes | Yes (ENI) | Yes (Alias IP) |
| **IP Forwarding** | Yes | Yes | Yes |

---

## Connectivity Options

### VNet/VPC Peering

**Azure VNet Peering:**
- Low latency, high bandwidth
- Regional or Global (cross-region)
- Non-transitive
- No downtime during setup
- Pricing: Data transfer charges apply

**AWS VPC Peering:**
- Encrypted connection
- Regional or Inter-Region
- Non-transitive (requires full mesh for multi-VPC)
- No bandwidth limits
- Pricing: Data transfer charges

**GCP VPC Peering:**
- Global (VPCs are already global)
- Low latency
- Non-transitive
- No additional charges for traffic (same region)
- Pricing: Standard egress charges

**Peering Comparison:**

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Scope** | Regional/Global | Regional/Inter-Region | Global |
| **Transitive** | No | No | No |
| **Bandwidth** | High | Unlimited | High |
| **Latency** | Low | Low | Lowest |
| **Setup Time** | Minutes | Minutes | Minutes |
| **Cost** | Data transfer | Data transfer | Egress only |

### Transit Gateway / Hub-and-Spoke

**Azure:**
- Azure Virtual WAN (managed hub)
- User-managed hub VNet with routing
- Supports transitive routing
- Central point for VPN, ExpressRoute

**AWS:**
- AWS Transit Gateway (managed service)
- Simplifies complex network topologies
- Supports thousands of VPCs
- Route tables and attachments
- Inter-region peering

**GCP:**
- Cloud Router for dynamic routing
- Network Connectivity Center (hub)
- Shared VPC for organization hierarchy
- Simple hub-and-spoke with VPC peering

### Internet Connectivity

**Azure:**
- Load Balancer with public IP
- Application Gateway
- Azure Firewall
- NAT Gateway for outbound

**AWS:**
- Internet Gateway (IGW) for VPC
- NAT Gateway for private subnets
- NAT Instance (legacy)
- Elastic Load Balancer

**GCP:**
- Cloud NAT for outbound
- External Load Balancer for inbound
- No Internet Gateway concept (simplified)

---

## Load Balancing

### Azure Load Balancers

1. **Azure Load Balancer (Layer 4)**
   - Internal or Public
   - Basic or Standard SKU
   - Up to 1,000 instances
   - Health probes
   - Pricing: ~$0.025/hour + data processed

2. **Application Gateway (Layer 7)**
   - HTTP/HTTPS load balancing
   - URL-based routing
   - SSL termination
   - Web Application Firewall (WAF)
   - Autoscaling
   - Pricing: ~$0.20/hour + capacity units

3. **Azure Front Door**
   - Global HTTP/S load balancer
   - CDN and WAF
   - Traffic acceleration
   - Pricing: ~$0.06/hour + data transfer

4. **Traffic Manager (DNS-based)**
   - Global traffic routing
   - Multiple routing methods
   - Endpoint monitoring
   - Pricing: ~$0.54 per million queries

### AWS Load Balancers

1. **Application Load Balancer (ALB) - Layer 7**
   - HTTP/HTTPS traffic
   - Path-based routing
   - Host-based routing
   - WebSocket support
   - Lambda targets
   - Pricing: ~$0.0225/hour + LCU charges

2. **Network Load Balancer (NLB) - Layer 4**
   - Ultra-low latency
   - Static IP support
   - TLS termination
   - Millions of requests per second
   - Pricing: ~$0.0225/hour + NLCU charges

3. **Gateway Load Balancer**
   - Deploy network virtual appliances
   - Transparent inline traffic inspection
   - Pricing: ~$0.0125/hour + GLCU charges

4. **Classic Load Balancer (Legacy)**
   - Layer 4/7 (legacy)
   - Not recommended for new apps
   - Pricing: ~$0.025/hour + data

### GCP Load Balancers

1. **Global External Application Load Balancer (Layer 7)**
   - Global HTTP/S load balancing
   - URL map routing
   - SSL certificates
   - Cloud CDN integration
   - Cloud Armor (DDoS, WAF)
   - Pricing: Forwarding rules + data processed

2. **Regional External Application Load Balancer**
   - Regional HTTP/S load balancing
   - Lower latency for regional apps
   - Pricing: Similar to global

3. **External Network Load Balancer (Layer 4)**
   - TCP/UDP load balancing
   - Regional or global
   - Pass-through load balancing
   - Pricing: Forwarding rules

4. **Internal Load Balancer**
   - Private load balancing
   - TCP/UDP (Layer 4) or HTTP/S (Layer 7)
   - Regional
   - Pricing: Forwarding rules

### Load Balancing Comparison

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Layer 4** | Load Balancer | NLB | Network LB |
| **Layer 7** | Application Gateway | ALB | Application LB |
| **Global** | Front Door | CloudFront + ALB | Global Application LB |
| **SSL Termination** | Yes | Yes | Yes |
| **WebSocket** | Yes | Yes (ALB) | Yes |
| **Auto Scaling** | Yes | Yes | Yes |
| **Health Checks** | Yes | Yes | Yes |
| **Pricing Model** | Time + Data | Time + Capacity Units | Forwarding Rules + Data |

---

## DNS Services

### Azure DNS

**Features:**
- Public and Private DNS zones
- Integration with Azure resources
- Anycast network for performance
- DNSSEC support (preview)
- SLA: 100% availability for public

**Pricing:**
- Hosted zones: $0.50/zone/month (first 25 zones)
- Queries: $0.40 per million (first billion)
- Private DNS zones: $0.10/zone/month

**Best For:**
- Azure-native applications
- Hybrid scenarios with on-premises

### AWS Route 53

**Features:**
- Highly available DNS service
- Multiple routing policies:
  - Simple, weighted, latency-based
  - Failover, geolocation, geoproximity
  - Multivalue answer
- Health checks and monitoring
- DNSSEC support
- Traffic flow (visual editor)
- Domain registration

**Pricing:**
- Hosted zones: $0.50/zone/month
- Queries: $0.40 per million (standard)
- Health checks: $0.50/month each

**Best For:**
- Complex routing requirements
- Global applications
- DNS-based failover

### Cloud DNS

**Features:**
- Anycast DNS network
- Public and private zones
- DNSSEC support
- Managed zones
- Low latency worldwide
- Integration with GCP resources

**Pricing:**
- Managed zones: $0.20/zone/month (first 25)
- Queries: $0.40 per million (first billion)

**Best For:**
- GCP-native applications
- Cost-effective DNS
- Simple DNS needs

### DNS Comparison

| Feature | Azure DNS | Route 53 | Cloud DNS |
|---------|-----------|----------|-----------|
| **SLA** | 100% | 100% | 100% |
| **DNSSEC** | Preview | Yes | Yes |
| **Health Checks** | Application Gateway | Yes | Load Balancer |
| **Routing Policies** | Limited | Extensive | Limited |
| **Geo Routing** | Via Traffic Manager | Yes | Via Load Balancer |
| **Private DNS** | Yes | Yes | Yes |
| **Domain Registration** | Third-party | Yes | Yes (Google Domains) |

---

## Network Security

### Network Security Groups (NSG) / Security Groups

**Azure NSG:**
- Applied to subnet or NIC
- Stateful firewall rules
- Priority-based (100-4096)
- Service tags for Azure services
- Application Security Groups for grouping

**AWS Security Groups:**
- Applied to ENI (network interface)
- Stateful firewall
- Allow rules only (implicit deny)
- Reference other security groups
- Up to 60 rules per group

**GCP Firewall Rules:**
- Applied to VPC (global)
- Stateful firewall
- Priority-based (0-65535, lower = higher priority)
- Tags and service accounts for targeting
- Allow and deny rules

**Comparison:**

| Feature | Azure NSG | AWS Security Groups | GCP Firewall |
|---------|-----------|---------------------|--------------|
| **Scope** | Subnet or NIC | Instance (ENI) | VPC (global) |
| **Stateful** | Yes | Yes | Yes |
| **Default** | Deny all inbound | Deny all inbound | Deny all ingress |
| **Max Rules** | 1,000 per NSG | 60 per group | 100 per VPC (can increase) |
| **Priority** | Yes | No (evaluated as one) | Yes |
| **Deny Rules** | Yes | No (implicit) | Yes |

### Network ACLs

**Azure:**
- NSGs serve this purpose
- Applied at subnet level

**AWS NACLs:**
- Stateless firewall
- Applied to subnet
- Numbered rules (evaluated in order)
- Both allow and deny rules
- Separate inbound/outbound rules

**GCP:**
- Firewall rules are global
- No separate NACL concept
- Hierarchical firewall policies (organization-level)

### DDoS Protection

**Azure:**
- Basic (free, automatic)
- Standard ($2,944/month):
  - Real-time mitigation
  - Attack analytics
  - DDoS Rapid Response support

**AWS:**
- AWS Shield Standard (free)
- AWS Shield Advanced ($3,000/month):
  - Enhanced detection
  - 24/7 DDoS Response Team
  - Cost protection

**GCP:**
- Cloud Armor:
  - DDoS protection
  - WAF capabilities
  - Adaptive protection
  - Pricing: $0.75 per rule/month + requests

### Web Application Firewall (WAF)

**Azure:**
- Azure Application Gateway WAF
- Azure Front Door WAF
- OWASP rule sets
- Custom rules
- Bot protection

**AWS:**
- AWS WAF
- Managed rules (OWASP, bot control)
- Custom rules
- Rate limiting
- Integration with ALB, CloudFront, API Gateway

**GCP:**
- Cloud Armor
- Preconfigured WAF rules (OWASP Top 10)
- Custom rules with CEL
- Rate limiting
- Adaptive protection (ML-based)

---

## VPN and Hybrid Connectivity

### Site-to-Site VPN

**Azure VPN Gateway:**
- Route-based or Policy-based
- Multiple VPN types (IKEv1, IKEv2)
- Active-active configuration
- BGP support
- Up to 10 Gbps (VpnGw5)

**Pricing:**
- Basic: ~$27/month
- VpnGw1: ~$134/month
- VpnGw5: ~$1,070/month

**AWS VPN:**
- Managed VPN with Virtual Private Gateway
- IPsec VPN tunnels (2 for HA)
- BGP support
- Transit Gateway VPN
- Up to 1.25 Gbps per tunnel

**Pricing:**
- ~$0.05/hour per VPN connection
- Data transfer charges apply

**Cloud VPN:**
- HA VPN (99.99% SLA)
- Classic VPN (99.9% SLA)
- IPsec tunnels
- BGP support via Cloud Router
- Up to 3 Gbps per tunnel

**Pricing:**
- ~$0.05/hour per tunnel
- Data transfer charges

### Dedicated Connections

**Azure ExpressRoute:**
- Private connection to Azure
- 50 Mbps to 100 Gbps
- Microsoft peering (Office 365, Dynamics)
- Private peering (Azure resources)
- Global Reach for multi-site connectivity

**Pricing:**
- Metered: Port fee + data transfer
- Unlimited: Port fee + flat data

**AWS Direct Connect:**
- Dedicated connection to AWS
- 1 Gbps or 10 Gbps (dedicated)
- 50 Mbps to 10 Gbps (hosted)
- Private VIF and Public VIF
- Direct Connect Gateway for multi-region

**Pricing:**
- Port hours: ~$0.30/hour (1 Gbps)
- Data transfer out charges

**Cloud Interconnect:**
- Dedicated Interconnect (10/100 Gbps)
- Partner Interconnect (50 Mbps to 50 Gbps)
- VLAN attachments for VPC access
- Lower latency and costs

**Pricing:**
- Dedicated: ~$1,684/month (10 Gbps)
- Partner: Varies by provider
- Lower egress costs

### Hybrid Connectivity Comparison

| Feature | ExpressRoute | Direct Connect | Cloud Interconnect |
|---------|--------------|----------------|-------------------|
| **Bandwidth** | 50M - 100G | 50M - 100G | 50M - 100G |
| **SLA** | 99.95% | 99.9% | 99.9% - 99.99% |
| **Setup Time** | Weeks | Weeks | Weeks |
| **Redundancy** | Recommended | Required (2 connections) | Required (2 attachments) |
| **BGP** | Yes | Yes | Yes |
| **Encryption** | No (add VPN) | No (add VPN) | No (add VPN) |

---

## Performance and Limits

### Network Throughput

| Resource | Azure | AWS | GCP |
|----------|-------|-----|-----|
| **VM Network** | Up to 100 Gbps | Up to 100 Gbps | Up to 100 Gbps |
| **VNet Peering** | No limit | No limit | No limit |
| **VPN Gateway** | Up to 10 Gbps | 1.25 Gbps/tunnel | 3 Gbps/tunnel |
| **Load Balancer** | 1 million flows | Millions of requests | Millions of requests |

### Latency

**Cross-Region (East US to West US):**
- Azure: ~60-70ms
- AWS: ~60-70ms
- GCP: ~60-70ms (owned fiber network)

**Cross-Zone (Same Region):**
- Azure: <2ms
- AWS: <2ms
- GCP: <2ms

**Global Network Performance:**
- **GCP**: Generally lowest latency due to owned global fiber network
- **AWS**: Excellent with many regions
- **Azure**: Competitive with Express Route Global Reach

---

## Pricing Comparison

### Data Transfer Costs

**Ingress (Into Cloud):**
- All providers: **Free**

**Egress (Out to Internet) - First 100 GB:**
- Azure: $0.087/GB (after first 5-100 GB free depending on service)
- AWS: First 100 GB/month free
- GCP: First 200 GB/month free (North America/Europe)

**Egress (Out to Internet) - Next 10 TB:**
- Azure: ~$0.087/GB
- AWS: ~$0.09/GB
- GCP: ~$0.12/GB

**Cross-Region (Same Provider):**
- Azure: ~$0.02/GB
- AWS: ~$0.02/GB
- GCP: ~$0.01/GB

**Between AZs/Zones (Same Region):**
- Azure: Free (within VNet)
- AWS: $0.01/GB (between AZs)
- GCP: $0.01/GB (between zones)

### VPN Pricing

| Feature | Azure | AWS | GCP |
|---------|-------|-----|-----|
| **Gateway/Connection** | $27-$1,070/month | $0.05/hour (~$36/month) | $0.05/hour/tunnel (~$36/month) |
| **Data Transfer** | Standard egress | Standard egress | Standard egress |
| **Bandwidth** | Up to 10 Gbps | Up to 1.25 Gbps/tunnel | Up to 3 Gbps/tunnel |

---

## Use Cases and Recommendations

### Choose Azure Networking When:

1. **Microsoft Ecosystem**: Tight integration with on-premises AD
2. **Hybrid Cloud**: ExpressRoute for dedicated connectivity
3. **Global Presence**: Azure Virtual WAN for global network
4. **Enterprise**: Strong governance and compliance requirements

### Choose AWS Networking When:

1. **Mature Platform**: Need proven, feature-rich networking
2. **Complex Routing**: Transit Gateway for hub-and-spoke
3. **AWS Services**: Leveraging many AWS services
4. **Flexibility**: Need most options and configurations

### Choose GCP Networking When:

1. **Global Network**: Benefit from Google's fiber network
2. **Simplicity**: Clean, straightforward networking model
3. **Performance**: Need lowest latency globally
4. **Cost**: Optimize for data transfer costs

---

## Best Practices (All Clouds)

### Network Design

1. **Plan IP Addressing**: Use non-overlapping CIDR blocks
2. **High Availability**: Deploy across multiple AZs/zones
3. **Security Layers**: Defense in depth (firewalls, NSGs, WAF)
4. **Monitoring**: Enable flow logs and monitoring
5. **Documentation**: Maintain network diagrams

### Security

1. **Principle of Least Privilege**: Minimal security group rules
2. **Private Subnets**: Keep databases and apps private
3. **NAT Gateways**: Controlled outbound internet access
4. **Encryption**: Use VPN or dedicated connections for sensitive data
5. **Logging**: Enable and monitor network logs

### Performance

1. **Proximity**: Place resources close to users
2. **CDN**: Use CDN for static content
3. **Load Balancing**: Distribute traffic across multiple instances
4. **Caching**: Implement caching strategies
5. **Monitoring**: Track latency and throughput metrics

---

## Summary

### Key Takeaways

1. **Architecture**:
   - Azure: Regional VNets
   - AWS: Regional VPCs (most mature)
   - GCP: Global VPCs (unique advantage)

2. **Complexity**:
   - GCP: Simplest model
   - Azure: Moderate complexity
   - AWS: Most complex, most options

3. **Performance**:
   - GCP: Best global network performance
   - AWS/Azure: Excellent regional performance

4. **Cost**:
   - GCP: Generally most cost-effective
   - Azure/AWS: Competitive, with different pricing models

5. **Features**:
   - AWS: Most comprehensive feature set
   - Azure: Best hybrid cloud integration
   - GCP: Cleanest, most modern design

### Quick Comparison

| Need | Recommendation |
|------|---------------|
| **Global Network** | GCP (global VPC) |
| **Hybrid Cloud** | Azure (ExpressRoute integration) |
| **Most Features** | AWS (Transit Gateway, etc.) |
| **Simplicity** | GCP (clean design) |
| **Enterprise** | Azure or AWS |
| **Cost** | GCP (generally) |

---

## Next Steps

- [Multi-Cloud Strategy](./05-multi-cloud-strategy.md)
- [Serverless Comparison](./02-serverless-comparison.md)
- [Storage Comparison](./03-storage-comparison.md)

---

## Additional Resources

### Official Documentation
- [Azure Networking Documentation](https://docs.microsoft.com/azure/networking/)
- [AWS VPC Documentation](https://docs.aws.amazon.com/vpc/)
- [GCP VPC Documentation](https://cloud.google.com/vpc/docs)

### Network Design
- [Azure Architecture Center](https://docs.microsoft.com/azure/architecture/)
- [AWS Architecture Center](https://aws.amazon.com/architecture/)
- [GCP Architecture Framework](https://cloud.google.com/architecture/framework)

### Learning Paths
- [Azure Network Engineer](https://learn.microsoft.com/training/browse/?products=azure&roles=network-engineer)
- [AWS Advanced Networking](https://aws.amazon.com/certification/certified-advanced-networking-specialty/)
- [GCP Professional Cloud Network Engineer](https://cloud.google.com/certification/cloud-network-engineer)
