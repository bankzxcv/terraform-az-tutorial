# Getting Started with Terraform

Welcome to the Getting Started guide! This section will take you from zero to deploying your first infrastructure with Terraform.

---

## Overview

This getting started path is designed for complete beginners. No prior Terraform or Infrastructure as Code experience required!

**Total Time:** 8-10 hours
**Difficulty:** Beginner
**Prerequisites:** Basic command line knowledge

---

## Learning Path

Follow these lessons in order:

### 1. [Prerequisites](./01-prerequisites.md)
**Time:** 30-60 minutes | **Difficulty:** Beginner

Set up your development environment with all necessary tools and accounts.

**What you'll do:**
- Install Terraform
- Install cloud CLIs (Azure/AWS/GCP)
- Create cloud accounts
- Set up your code editor
- Verify your setup

---

### 2. [Terraform Installation](./02-terraform-installation.md)
**Time:** 15-30 minutes | **Difficulty:** Beginner

Deep dive into installing and configuring Terraform.

**What you'll learn:**
- Multiple installation methods
- Version management (tfenv, asdf)
- IDE setup and extensions
- Plugin cache configuration
- Troubleshooting installation issues

---

### 3. [Cloud CLI Setup](./03-cloud-cli-setup.md)
**Time:** 30-45 minutes | **Difficulty:** Beginner

Configure cloud provider command-line tools for authentication and management.

**What you'll learn:**
- Azure CLI authentication methods
- AWS CLI configuration
- Google Cloud SDK setup
- Managing multiple accounts
- Security best practices

---

### 4. [First Terraform Project](./04-first-terraform-project.md)
**Time:** 15-20 minutes | **Difficulty:** Beginner

Deploy your first cloud resource with Terraform!

**What you'll do:**
- Create your first Terraform configuration
- Deploy an Azure Resource Group
- Understand the Terraform workflow
- Make changes to infrastructure
- Clean up resources

**Hands-on:** You'll deploy real infrastructure to the cloud!

---

### 5. [Terraform Workflow](./05-terraform-workflow.md)
**Time:** 20-30 minutes | **Difficulty:** Beginner to Intermediate

Master all Terraform commands and understand the complete workflow.

**What you'll learn:**
- Init, plan, apply, destroy
- Validate and format
- State management commands
- Import and refresh
- Advanced workflow patterns
- CI/CD integration basics

---

### 6. [HCL Syntax](./06-hcl-syntax.md)
**Time:** 30-45 minutes | **Difficulty:** Beginner to Intermediate

Learn the HashiCorp Configuration Language used by Terraform.

**What you'll learn:**
- Basic syntax and structure
- Data types (strings, numbers, lists, maps, objects)
- Variables and outputs
- Expressions and functions
- Conditionals and loops
- Dynamic blocks
- Best practices

---

## What's Next?

After completing these lessons, you'll be ready to:

### Continue with Cloud-Specific Lessons
- **[Azure Lessons](../01-azure/)** - Deploy Azure resources
- **[AWS Lessons](../02-aws/)** - Deploy AWS resources (coming soon)
- **[GCP Lessons](../03-gcp/)** - Deploy GCP resources (coming soon)

### Advance Your Skills
- **[Advanced Topics](../09-advanced/)** - State management, testing, enterprise patterns
- **[Production Best Practices](../../PRODUCTION_BEST_PRACTICES.md)** - Production-ready infrastructure
- **[Learning Paths](../../LEARNING_PATHS.md)** - Structured curriculum for different roles

---

## Quick Reference

### Essential Commands

```bash
# Initialize project
terraform init

# Preview changes
terraform plan

# Apply changes
terraform apply

# Destroy resources
terraform destroy

# Format code
terraform fmt

# Validate configuration
terraform validate
```

---

### File Structure

```
my-terraform-project/
├── main.tf           # Primary resources
├── variables.tf      # Variable definitions
├── outputs.tf        # Output definitions
├── terraform.tfvars  # Variable values
└── .terraform/       # Provider plugins (gitignored)
```

---

### Getting Help

- **Issues?** Check the troubleshooting sections in each lesson
- **Questions?** Open a [GitHub Discussion](https://github.com/YOUR_USERNAME/terraform-az-tutorial/discussions)
- **Need more examples?** See [DEPLOYMENT_GUIDE.md](../../DEPLOYMENT_GUIDE.md)

---

## Learning Tips

1. **Follow in order** - Each lesson builds on the previous
2. **Type the code** - Don't just copy-paste; understand what you're typing
3. **Experiment** - Try changing values and see what happens
4. **Clean up** - Always run `terraform destroy` to avoid costs
5. **Take breaks** - Learning is a marathon, not a sprint

---

**Ready to start?** Begin with [Prerequisites](./01-prerequisites.md)!
