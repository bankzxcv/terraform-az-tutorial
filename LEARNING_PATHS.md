# Terraform + DevSecOps Learning Paths

## Table of Contents
- [Overview](#overview)
- [How to Use This Guide](#how-to-use-this-guide)
- [Learning Paths](#learning-paths)
  - [Path 1: DevSecOps Engineer (Complete)](#path-1-devsecops-engineer-complete)
  - [Path 2: Azure Cloud Engineer](#path-2-azure-cloud-engineer)
  - [Path 3: AWS Cloud Engineer](#path-3-aws-cloud-engineer)
  - [Path 4: GCP Cloud Engineer](#path-4-gcp-cloud-engineer)
  - [Path 5: Kubernetes Infrastructure Engineer](#path-5-kubernetes-infrastructure-engineer)
  - [Path 6: Security-Focused Infrastructure](#path-6-security-focused-infrastructure)
  - [Path 7: Multi-Cloud Architect](#path-7-multi-cloud-architect)
- [Certification Preparation](#certification-preparation)
- [Hands-On Projects](#hands-on-projects)

---

## Overview

This guide provides structured learning paths for mastering Terraform and Infrastructure as Code with a DevSecOps focus. Each path is designed for specific career goals and includes time estimates, prerequisites, lesson order, hands-on projects, and certification preparation tips.

---

## How to Use This Guide

1. **Choose your path** based on your career goals
2. **Check prerequisites** for your chosen path
3. **Follow the lesson order** - each builds on previous knowledge
4. **Complete hands-on projects** to reinforce learning
5. **Practice regularly** - aim for consistent daily/weekly progress
6. **Join the community** - share your progress and ask questions

**Time Investment:**
- Beginner paths: 20-30 hours
- Intermediate paths: 40-60 hours
- Advanced paths: 60-100+ hours

---

## Learning Paths

### Path 1: DevSecOps Engineer (Complete)

**Goal:** Master Infrastructure as Code, security automation, and DevSecOps practices

**Duration:** 80-100 hours over 3-4 months

**Prerequisites:**
- Basic command line knowledge
- Understanding of cloud computing concepts
- Familiarity with Git basics
- No programming experience required

---

#### Phase 1: Foundations (20 hours / 2-3 weeks)

**Week 1-2: Getting Started**
- [ ] **[Prerequisites](docs/00-getting-started/01-prerequisites.md)** (1 hour)
  - Install tools (Terraform, Azure CLI, Git, VS Code)
  - Create cloud accounts (Azure/AWS/GCP)
  - Set up development environment

- [ ] **[Terraform Installation](docs/00-getting-started/02-terraform-installation.md)** (30 min)
  - Install Terraform
  - Configure IDE
  - Version management

- [ ] **[Cloud CLI Setup](docs/00-getting-started/03-cloud-cli-setup.md)** (1 hour)
  - Azure CLI authentication
  - AWS CLI setup (optional)
  - GCP SDK setup (optional)

- [ ] **[First Terraform Project](docs/00-getting-started/04-first-terraform-project.md)** (1 hour)
  - Deploy first resource
  - Understand Terraform workflow
  - Hands-on success!

- [ ] **[Terraform Workflow](docs/00-getting-started/05-terraform-workflow.md)** (2 hours)
  - Master init, plan, apply, destroy
  - Understanding state
  - Best practices

- [ ] **[HCL Syntax](docs/00-getting-started/06-hcl-syntax.md)** (3 hours)
  - Variables, outputs, locals
  - Data types and functions
  - Loops and conditionals

**Week 3: Azure Basics**
- [ ] **Azure Resource Groups and Storage** (4 hours)
  - Deploy resource groups
  - Create storage accounts
  - Implement tagging strategy

- [ ] **Azure Networking** (4 hours)
  - Virtual networks and subnets
  - Network security groups
  - Load balancers

- [ ] **Azure Compute** (4 hours)
  - Virtual machines
  - App Services
  - Function Apps

**Milestone:** Deploy complete Azure infrastructure for a simple web application

---

#### Phase 2: Intermediate Skills (25 hours / 3-4 weeks)

**Week 4-5: State and Modules**
- [ ] **[State Management](docs/09-advanced/01-state-management.md)** (4 hours)
  - Remote state backends
  - State locking
  - State security

- [ ] **[Workspaces](docs/09-advanced/02-workspaces.md)** (3 hours)
  - Multi-environment management
  - Workspace patterns
  - Best practices

- [ ] **Terraform Modules** (6 hours)
  - Module structure
  - Creating reusable modules
  - Module composition
  - Publishing modules

**Week 6-7: DevOps Integration**
- [ ] **CI/CD with Terraform** (6 hours)
  - GitHub Actions pipelines
  - Azure DevOps integration
  - Automated testing
  - Deployment automation

- [ ] **[Terraform Testing](docs/09-advanced/04-terraform-testing.md)** (6 hours)
  - Terratest (Go)
  - Kitchen-Terraform (Ruby)
  - Policy testing with Sentinel
  - Integration in CI/CD

**Milestone:** Build and deploy infrastructure with automated CI/CD pipeline

---

#### Phase 3: Security Focus (20 hours / 3 weeks)

**Week 8-9: Security Hardening**
- [ ] **Secret Management** (4 hours)
  - Azure Key Vault integration
  - AWS Secrets Manager
  - Environment variables
  - Sensitive outputs

- [ ] **Security Scanning** (4 hours)
  - tfsec - security scanner
  - Checkov - policy scanner
  - Terrascan - compliance scanner
  - Integration in CI/CD

- [ ] **Network Security** (4 hours)
  - Network security groups
  - Firewall rules
  - Private endpoints
  - DDoS protection

**Week 10: Compliance and Governance**
- [ ] **Policy as Code** (4 hours)
  - Azure Policy
  - Sentinel policies
  - OPA (Open Policy Agent)
  - Compliance reporting

- [ ] **Identity and Access** (4 hours)
  - Azure AD integration
  - RBAC configuration
  - Service principals
  - Managed identities

**Milestone:** Deploy security-hardened, compliant infrastructure

---

#### Phase 4: Production and Advanced (35 hours / 4-5 weeks)

**Week 11-12: Production Patterns**
- [ ] **[Disaster Recovery](docs/09-advanced/05-disaster-recovery.md)** (4 hours)
  - Backup strategies
  - Recovery procedures
  - Multi-region deployment
  - DR testing

- [ ] **[Performance Optimization](docs/09-advanced/06-performance-optimization.md)** (4 hours)
  - State optimization
  - Parallelism
  - Large-scale deployments
  - Monitoring and profiling

- [ ] **Monitoring and Observability** (6 hours)
  - Azure Monitor integration
  - Application Insights
  - Log Analytics
  - Alerting and dashboards

**Week 13-14: Enterprise Patterns**
- [ ] **[Enterprise Patterns](docs/09-advanced/07-enterprise-patterns.md)** (6 hours)
  - Team collaboration
  - Governance and compliance
  - Multi-account patterns
  - Module development
  - Cost management

- [ ] **[Import Existing Resources](docs/09-advanced/03-import-existing.md)** (4 hours)
  - Import strategies
  - Terraformer tool
  - Bulk imports
  - State recovery

**Week 15: Capstone Project**
- [ ] **Complete Production Infrastructure** (11 hours)
  - Multi-environment setup (dev/staging/prod)
  - CI/CD pipeline with security gates
  - Monitoring and alerting
  - Documentation and runbooks

**Milestone:** Deploy and manage production-grade, enterprise infrastructure

---

### Path 2: Azure Cloud Engineer

**Goal:** Master Azure infrastructure with Terraform

**Duration:** 50-60 hours over 2-3 months

**Focus:** Azure-specific services and patterns

**Curriculum:**
1. Complete Phase 1: Foundations (20 hours)
2. Azure Deep Dive (25 hours)
   - Virtual Networks (VNet, Subnets, NSGs)
   - App Services and Functions
   - Azure SQL and Cosmos DB
   - Azure Kubernetes Service (AKS)
   - Azure Storage (Blob, File, Queue, Table)
   - Application Gateway and Front Door
   - Azure Monitor and Application Insights
3. Azure Security (10 hours)
   - Azure AD and RBAC
   - Key Vault
   - Security Center
   - Defender for Cloud
4. Azure Advanced (5 hours)
   - Azure Arc
   - Azure Lighthouse
   - Azure Policy at scale

**Certification Prep:** AZ-104, AZ-305, AZ-400

---

### Path 3: AWS Cloud Engineer

**Goal:** Master AWS infrastructure with Terraform

**Duration:** 50-60 hours over 2-3 months

**Focus:** AWS-specific services and patterns

**Curriculum:**
1. Complete Phase 1: Foundations (20 hours)
2. AWS Deep Dive (25 hours)
   - VPC, Subnets, Security Groups
   - EC2, Auto Scaling, ELB
   - RDS, DynamoDB, S3
   - Lambda, API Gateway
   - ECS, EKS
   - CloudFront, Route 53
   - CloudWatch and X-Ray
3. AWS Security (10 hours)
   - IAM and STS
   - Secrets Manager
   - Security Hub
   - GuardDuty
4. AWS Advanced (5 hours)
   - Organizations and Control Tower
   - Service Control Policies
   - AWS Config

**Certification Prep:** AWS Solutions Architect Associate/Professional, DevOps Engineer

---

### Path 4: GCP Cloud Engineer

**Goal:** Master Google Cloud Platform with Terraform

**Duration:** 45-55 hours over 2-3 months

**Focus:** GCP-specific services and patterns

**Curriculum:**
1. Complete Phase 1: Foundations (20 hours)
2. GCP Deep Dive (20 hours)
   - VPC, Subnets, Firewall Rules
   - Compute Engine, GKE
   - Cloud SQL, BigQuery, Datastore
   - Cloud Functions, Cloud Run
   - Cloud Storage
   - Cloud Load Balancing
   - Cloud Monitoring
3. GCP Security (8 hours)
   - IAM and Service Accounts
   - Secret Manager
   - Security Command Center
4. GCP Advanced (7 hours)
   - Organization policies
   - Resource hierarchy
   - Shared VPC

**Certification Prep:** Associate/Professional Cloud Engineer, Professional Cloud Architect

---

### Path 5: Kubernetes Infrastructure Engineer

**Goal:** Master Kubernetes infrastructure automation

**Duration:** 60-70 hours over 3 months

**Prerequisites:** Complete Path 1 Phases 1-2

**Curriculum:**
1. Kubernetes Fundamentals (15 hours)
   - Kubernetes architecture
   - Pods, Services, Deployments
   - ConfigMaps and Secrets
   - Ingress and Networking

2. Managed Kubernetes (20 hours)
   - Azure Kubernetes Service (AKS)
   - Amazon EKS
   - Google Kubernetes Engine (GKE)
   - Cluster setup with Terraform
   - Node pools and scaling

3. Kubernetes Advanced (15 hours)
   - Helm charts
   - Operators
   - Service mesh (Istio/Linkerd)
   - Monitoring (Prometheus/Grafana)

4. GitOps and Automation (10 hours)
   - ArgoCD
   - Flux
   - Tekton
   - CI/CD for Kubernetes

**Certification Prep:** CKA, CKAD, CKS

---

### Path 6: Security-Focused Infrastructure

**Goal:** Become a security-focused infrastructure engineer

**Duration:** 55-65 hours over 2-3 months

**Prerequisites:** Phase 1: Foundations

**Curriculum:**
1. Security Fundamentals (12 hours)
   - Security principles
   - Threat modeling
   - Defense in depth
   - Zero trust architecture

2. Infrastructure Security (20 hours)
   - Network security
   - Identity and access management
   - Secrets management
   - Encryption (at rest and in transit)
   - Private networking
   - Firewall and WAF configuration

3. Security Automation (15 hours)
   - Security scanning (tfsec, Checkov, Terrascan)
   - Policy as Code (Sentinel, OPA)
   - Compliance automation
   - Security testing in CI/CD

4. Incident Response (8 hours)
   - Logging and monitoring
   - Security incident detection
   - Response procedures
   - Forensics

5. Compliance (10 hours)
   - GDPR, HIPAA, SOC 2
   - Compliance frameworks
   - Audit logging
   - Reporting and documentation

**Certification Prep:** CISSP, Security+, cloud security certifications

---

### Path 7: Multi-Cloud Architect

**Goal:** Master multi-cloud infrastructure

**Duration:** 90-110 hours over 4-5 months

**Prerequisites:** Complete Path 1 or equivalent experience

**Curriculum:**
1. Multi-Cloud Foundations (15 hours)
   - Multi-cloud strategies
   - Vendor selection
   - Cost optimization across clouds
   - Common patterns

2. Cloud Platforms (45 hours)
   - Azure deep dive (15 hours)
   - AWS deep dive (15 hours)
   - GCP deep dive (15 hours)

3. Multi-Cloud Patterns (20 hours)
   - Shared modules
   - Cloud-agnostic abstractions
   - Terragrunt
   - Workspace strategies
   - State management across clouds

4. Advanced Topics (20 hours)
   - Multi-cloud networking
   - Cross-cloud data replication
   - Disaster recovery across clouds
   - Global load balancing
   - Cost optimization

5. Production Deployment (10 hours)
   - Multi-cloud CI/CD
   - Monitoring and observability
   - Incident response
   - Documentation

**Certification Prep:** Multi-cloud certifications from all major providers

---

## Certification Preparation

### HashiCorp Certified: Terraform Associate

**Exam Focus:**
- IaC concepts
- Terraform purpose and workflow
- Terraform basics
- Use Terraform outside core workflow
- Interact with Terraform modules
- Navigate Terraform workflow
- Implement and maintain state
- Read, generate, and modify configuration
- Understand Terraform Cloud capabilities

**Preparation:**
- Complete Path 1: Phases 1-2
- Review [official study guide](https://www.hashicorp.com/certification/terraform-associate)
- Practice exams
- Hands-on labs

**Study Time:** 40-50 hours

---

### Cloud Provider Certifications

**Azure:**
- AZ-900: Azure Fundamentals
- AZ-104: Azure Administrator
- AZ-305: Azure Solutions Architect Expert
- AZ-400: DevOps Engineer Expert

**AWS:**
- AWS Certified Solutions Architect - Associate
- AWS Certified Solutions Architect - Professional
- AWS Certified DevOps Engineer - Professional

**GCP:**
- Associate Cloud Engineer
- Professional Cloud Architect
- Professional Cloud DevOps Engineer

---

## Hands-On Projects

### Project 1: Personal Website (Beginner)
Deploy a static website with:
- Storage account/S3 bucket
- CDN
- Custom domain
- SSL certificate
- CI/CD pipeline

**Skills:** Basics, storage, networking, automation
**Time:** 8-10 hours

---

### Project 2: Microservices Application (Intermediate)
Deploy a multi-tier application with:
- Container orchestration (AKS/EKS/GKE)
- Database (managed SQL)
- Caching layer (Redis)
- Load balancer
- Application Gateway/Ingress
- Monitoring and logging
- Auto-scaling

**Skills:** Compute, networking, databases, monitoring
**Time:** 20-25 hours

---

### Project 3: Multi-Environment Infrastructure (Advanced)
Build complete dev/staging/prod environments with:
- Separate subscriptions/accounts
- Shared services (networking, monitoring)
- Environment-specific configurations
- CI/CD with approval gates
- Automated testing
- Disaster recovery
- Cost optimization
- Security scanning

**Skills:** Enterprise patterns, governance, security, automation
**Time:** 40-50 hours

---

### Project 4: Multi-Cloud Application (Expert)
Deploy application across multiple clouds:
- Azure for primary workload
- AWS for backup/DR
- GCP for specific services (BigQuery, etc.)
- Global traffic management
- Cross-cloud networking
- Unified monitoring
- Cost optimization across clouds

**Skills:** Multi-cloud, advanced networking, disaster recovery
**Time:** 60-80 hours

---

## Progress Tracking

### Beginner Level
- [ ] Completed Prerequisites
- [ ] First successful deployment
- [ ] Understanding of HCL syntax
- [ ] Deployed 3+ resources
- [ ] Used variables and outputs
- [ ] Destroyed and recreated infrastructure

### Intermediate Level
- [ ] Remote state configured
- [ ] Created reusable module
- [ ] Multi-environment deployment
- [ ] CI/CD pipeline working
- [ ] Implemented testing
- [ ] Deployed complex application (10+ resources)

### Advanced Level
- [ ] Enterprise patterns implemented
- [ ] Security scanning automated
- [ ] Disaster recovery tested
- [ ] Performance optimized (100+ resources)
- [ ] Team collaboration workflows
- [ ] Production infrastructure managed
- [ ] Contributed to module library

---

## Additional Resources

### Official Documentation
- [Terraform Documentation](https://www.terraform.io/docs)
- [Azure Terraform Provider](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [AWS Terraform Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [GCP Terraform Provider](https://registry.terraform.io/providers/hashicorp/google/latest/docs)

### Community Resources
- [Terraform Registry](https://registry.terraform.io/)
- [HashiCorp Learn](https://learn.hashicorp.com/terraform)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

### Books
- "Terraform: Up & Running" by Yevgeniy Brikman
- "Terraform in Action" by Scott Winkler
- "Infrastructure as Code" by Kief Morris

---

## Getting Help

### Community Support
- GitHub Discussions (this repository)
- HashiCorp Community Forum
- Cloud provider forums
- Stack Overflow (#terraform)

### Practice and Learning
- [Terraform Cloud Free Tier](https://app.terraform.io)
- [Azure Free Account](https://azure.microsoft.com/free)
- [AWS Free Tier](https://aws.amazon.com/free)
- [GCP Free Tier](https://cloud.google.com/free)

---

**Ready to start learning?**

Begin with [Prerequisites](docs/00-getting-started/01-prerequisites.md) and follow your chosen path!

**Happy learning!**
