# Terraform Documentation

Welcome to the comprehensive Terraform + DevSecOps learning documentation!

---

## Quick Navigation

### New to Terraform?
**Start here:** [Getting Started Guide](./00-getting-started/)

### Ready for Production?
**Go here:** [Advanced Topics](./09-advanced/)

### Cloud-Specific Lessons
- **[Azure](./01-azure/)** - Microsoft Azure infrastructure
- **[AWS](./02-aws/)** - Amazon Web Services (coming soon)
- **[GCP](./03-gcp/)** - Google Cloud Platform (coming soon)

---

## Documentation Structure

```
docs/
├── 00-getting-started/    Beginner tutorials
│   ├── Prerequisites
│   ├── Installation
│   ├── Cloud CLI Setup
│   ├── First Project
│   ├── Workflow
│   └── HCL Syntax
│
├── 01-azure/              Azure-specific lessons
├── 02-aws/                AWS-specific lessons (coming soon)
├── 03-gcp/                GCP-specific lessons (coming soon)
├── 04-multi-cloud/        Multi-cloud patterns
├── 05-kubernetes/         Kubernetes infrastructure
├── 06-cicd/               CI/CD integration
├── 07-monitoring/         Monitoring and observability
├── 08-security/           Security and compliance
│
└── 09-advanced/           Advanced topics
    ├── State Management
    ├── Workspaces
    ├── Import Existing
    ├── Testing
    ├── Disaster Recovery
    ├── Performance
    └── Enterprise Patterns
```

---

## Learning Paths

Choose your path based on your goals:

### 1. Complete Beginner
**Path:** Getting Started → Azure Basics → Advanced Basics

**Time:** 30-40 hours
**You'll learn:** Terraform fundamentals and deploy your first infrastructure

**Start here:** [Getting Started](./00-getting-started/)

---

### 2. Cloud Engineer (Azure)
**Path:** Getting Started → Azure Deep Dive → Advanced Topics

**Time:** 50-60 hours
**You'll learn:** Master Azure infrastructure with Terraform

**Focus areas:**
- Azure services (VMs, App Services, AKS, etc.)
- Networking and security
- Monitoring and management

---

### 3. DevSecOps Engineer
**Path:** Complete path with security focus

**Time:** 80-100 hours
**You'll learn:** Full DevSecOps practices with Infrastructure as Code

**Focus areas:**
- Security automation
- Testing and validation
- CI/CD pipelines
- Compliance and governance

**Details:** [Full DevSecOps Path](../LEARNING_PATHS.md#path-1-devsecops-engineer-complete)

---

### 4. Enterprise Architect
**Path:** Getting Started → Advanced Topics → Enterprise Patterns

**Time:** 60-80 hours
**You'll learn:** Enterprise-scale Terraform deployment

**Focus areas:**
- Multi-account/subscription management
- Team collaboration
- Governance and compliance
- Cost optimization

---

## Documentation Categories

### Fundamentals
- **[Getting Started](./00-getting-started/)** - Beginner tutorials
- **[HCL Syntax](./00-getting-started/06-hcl-syntax.md)** - Language reference
- **[Terraform Workflow](./00-getting-started/05-terraform-workflow.md)** - Core commands

### Cloud Providers
- **[Azure](./01-azure/)** - Microsoft Azure
- **[AWS](./02-aws/)** - Amazon Web Services (coming soon)
- **[GCP](./03-gcp/)** - Google Cloud Platform (coming soon)
- **[Multi-Cloud](./04-multi-cloud/)** - Cross-cloud patterns

### Specialized Topics
- **[Kubernetes](./05-kubernetes/)** - Container orchestration
- **[CI/CD](./06-cicd/)** - Pipeline integration
- **[Monitoring](./07-monitoring/)** - Observability
- **[Security](./08-security/)** - DevSecOps practices

### Advanced
- **[State Management](./09-advanced/01-state-management.md)** - Production state
- **[Testing](./09-advanced/04-terraform-testing.md)** - Infrastructure testing
- **[Enterprise Patterns](./09-advanced/07-enterprise-patterns.md)** - Large-scale deployment

---

## Quick Reference

### Essential Documentation
- **[Prerequisites Checklist](./00-getting-started/01-prerequisites.md#verification-checklist)**
- **[Terraform Commands](./00-getting-started/05-terraform-workflow.md#detailed-command-reference)**
- **[HCL Functions](./00-getting-started/06-hcl-syntax.md#expressions-and-functions)**
- **[Best Practices](../PRODUCTION_BEST_PRACTICES.md)**

### Quick Start Guides
- **[15-Minute Quick Start](../QUICK_START.md)**
- **[Deployment Recipes](../DEPLOYMENT_GUIDE.md)**
- **[First Terraform Project](./00-getting-started/04-first-terraform-project.md)**

---

## By Difficulty Level

### Beginner
- All lessons in [Getting Started](./00-getting-started/)
- Basic Azure resources (Resource Groups, Storage)
- Simple deployments

### Intermediate
- Azure Networking
- Terraform Modules
- Multi-environment setups
- State Management basics

### Advanced
- All lessons in [Advanced Topics](./09-advanced/)
- Enterprise patterns
- Multi-cloud deployments
- Performance optimization

---

## By Time Investment

### Quick (< 1 hour)
- [Prerequisites](./00-getting-started/01-prerequisites.md)
- [First Project](./00-getting-started/04-first-terraform-project.md)
- [15-Minute Quick Start](../QUICK_START.md)

### Medium (1-3 hours)
- [HCL Syntax](./00-getting-started/06-hcl-syntax.md)
- [Terraform Workflow](./00-getting-started/05-terraform-workflow.md)
- [Workspaces](./09-advanced/02-workspaces.md)

### Comprehensive (3+ hours)
- [Terraform Testing](./09-advanced/04-terraform-testing.md)
- [Enterprise Patterns](./09-advanced/07-enterprise-patterns.md)
- Full Azure lesson path

---

## By Use Case

### I want to...

**Deploy my first resource**
→ [First Terraform Project](./00-getting-started/04-first-terraform-project.md)

**Learn Terraform from scratch**
→ [Getting Started](./00-getting-started/)

**Deploy to production**
→ [Advanced Topics](./09-advanced/)

**Manage multiple environments**
→ [Workspaces](./09-advanced/02-workspaces.md)

**Import existing infrastructure**
→ [Import Existing Resources](./09-advanced/03-import-existing.md)

**Test my Terraform code**
→ [Terraform Testing](./09-advanced/04-terraform-testing.md)

**Optimize performance**
→ [Performance Optimization](./09-advanced/06-performance-optimization.md)

**Implement team workflows**
→ [Enterprise Patterns](./09-advanced/07-enterprise-patterns.md)

---

## Additional Resources

### Reference Documentation
- **[Reference Materials](../reference/)** - Quick references and guides
- **[Terraform Workflow Guide](../reference/TERRAFORM_WORKFLOW_GUIDE.md)**
- **[Quick Reference](../reference/QUICK_REFERENCE.md)**
- **[Visual Guide](../reference/README_VISUAL_GUIDE.md)**

### External Resources
- [Official Terraform Docs](https://www.terraform.io/docs)
- [Terraform Registry](https://registry.terraform.io/)
- [HashiCorp Learn](https://learn.hashicorp.com/terraform)

### Root Documentation
- **[Main README](../README.md)** - Project overview
- **[Learning Paths](../LEARNING_PATHS.md)** - Structured curricula
- **[Quick Start](../QUICK_START.md)** - 15-minute start
- **[Contributing](../CONTRIBUTING.md)** - How to contribute
- **[Production Best Practices](../PRODUCTION_BEST_PRACTICES.md)**
- **[Deployment Guide](../DEPLOYMENT_GUIDE.md)**

---

## Getting Help

### Self-Help
1. Check the relevant documentation section
2. Review troubleshooting sections
3. Check [common issues](./00-getting-started/01-prerequisites.md#troubleshooting)

### Community Support
- **[GitHub Discussions](https://github.com/YOUR_USERNAME/terraform-az-tutorial/discussions)** - Ask questions
- **[Issues](https://github.com/YOUR_USERNAME/terraform-az-tutorial/issues)** - Report bugs
- **[Contributing Guide](../CONTRIBUTING.md)** - Help improve docs

---

## Documentation Features

Each lesson includes:
- **Learning objectives** - What you'll learn
- **Difficulty level** - Beginner/Intermediate/Advanced
- **Time estimate** - How long it takes
- **Prerequisites** - What you need first
- **Hands-on exercises** - Practice what you learn
- **Next steps** - Where to go next

---

## How to Use This Documentation

1. **Choose your path** based on your goals
2. **Start with prerequisites** if you're new
3. **Follow lessons in order** within each section
4. **Do hands-on exercises** - practice is key
5. **Reference as needed** - bookmark useful pages
6. **Contribute back** - help improve the docs

---

## Contributing to Documentation

Found a typo? Want to improve a lesson? See our [Contributing Guide](../CONTRIBUTING.md).

Types of contributions welcome:
- Fix typos and errors
- Improve explanations
- Add examples
- Create new lessons
- Translate documentation

---

**Ready to start learning?** Choose your path above or begin with [Getting Started](./00-getting-started/)!
