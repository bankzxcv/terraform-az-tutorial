# 🎓 Terraform + Azure Learning Path

## Welcome!

This repository is a **comprehensive, interactive tutorial** to learn Infrastructure as Code using **Terraform** and **Microsoft Azure**. Whether you're a beginner or looking to advance your cloud infrastructure skills, this guide will take you from zero to deploying production-ready infrastructure.

---

## 📚 Table of Contents

- [Overview](#overview)
- [Who Is This For](#who-is-this-for)
- [Prerequisites](#prerequisites)
- [Learning Path](#learning-path)
- [Project Structure](#project-structure)
- [How to Use This Repository](#how-to-use-this-repository)
- [Quick Start](#quick-start)
- [Best Practices](#best-practices)

---

## 🎯 Overview

### What You'll Learn

- ✅ **Terraform Fundamentals**: HCL syntax, providers, resources, variables, outputs
- ✅ **Azure Services**: Resource Groups, Storage, Functions, Networking, App Services
- ✅ **Infrastructure Patterns**: Modules, state management, remote backends
- ✅ **Production Best Practices**: Security, CI/CD, multi-environment deployment
- ✅ **Real-World Projects**: Deploy APIs, websites, and serverless applications

### What Makes This Different

- **Progressive Learning**: Each lesson builds on the previous one
- **Hands-On Examples**: Every concept includes working code you can deploy
- **Production-Ready**: Learn best practices, not just basics
- **Visual Diagrams**: Understand architecture with clear visual representations
- **Minimal Complexity**: Focus on learning, not debugging

---

## 👥 Who Is This For

### Beginners
✅ Never used Terraform before
✅ Basic command line knowledge
✅ Want to learn Infrastructure as Code
✅ Starting with cloud infrastructure

### Intermediate
✅ Used Terraform basics
✅ Want to learn Azure-specific patterns
✅ Looking to improve infrastructure practices
✅ Building production systems

### Advanced
✅ Need Terraform + Azure reference
✅ Want to learn modules and advanced patterns
✅ Building complex multi-tier applications
✅ Implementing production best practices

---

## 📋 Prerequisites

### Required

1. **Azure Account** (Free tier available)
   - Sign up: [azure.microsoft.com/free](https://azure.microsoft.com/free)
   - $200 free credit for 30 days
   - 12 months of popular services free

2. **Azure CLI** installed
   ```bash
   # macOS
   brew install azure-cli

   # Windows
   winget install Microsoft.AzureCLI

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Terraform** installed
   ```bash
   # macOS
   brew tap hashicorp/tap
   brew install hashicorp/tap/terraform

   # Windows
   choco install terraform

   # Linux
   wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
   echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
   sudo apt update && sudo apt install terraform
   ```

4. **Text Editor** (VS Code recommended)

### Recommended

- Basic Git knowledge
- Understanding of cloud computing concepts
- Familiarity with command line/terminal

---

## 🗺️ Learning Path

### Path 1: Beginner Track (8-10 hours)

Perfect if you're **new to Terraform and Infrastructure as Code**.

```
┌─────────────────────────────────────────────────────────────┐
│                     BEGINNER TRACK                          │
└─────────────────────────────────────────────────────────────┘

Week 1: Foundations (3-4 hours)
├── 01. Setup & Prerequisites (1 hour)
│   ├── Install Azure CLI, Terraform
│   ├── Create Azure account
│   ├── Login and configure authentication
│   └── Verify setup
│
├── 02. Terraform Basics (1-2 hours)
│   ├── Learn HCL syntax
│   ├── Understand providers
│   ├── Resources and data sources
│   ├── Variables and outputs
│   └── Essential commands (init, plan, apply)
│
└── 03. Deploy Simple Resources (1-2 hours)
    ├── Create Resource Group
    ├── Deploy Storage Account
    ├── Work with state files
    └── Practice deployment lifecycle

Week 2: Building Skills (3-4 hours)
├── 04. Azure Functions (2-3 hours)
│   ├── Serverless concepts
│   ├── Function App deployment
│   ├── Environment variables
│   └── Static website hosting
│
└── 05. Understand State Management (1 hour)
    ├── Local vs remote state
    ├── State file security
    └── Backend configuration

🎯 Goal: Deploy your first working Azure infrastructure
```

### Path 2: Intermediate Track (12-15 hours)

Perfect if you've **used basic Terraform** and want to level up.

```
┌─────────────────────────────────────────────────────────────┐
│                   INTERMEDIATE TRACK                        │
└─────────────────────────────────────────────────────────────┘

Week 1-2: Core Skills (6-8 hours)
├── Review Beginner Track (2 hours)
├── 06. Advanced Networking (2-3 hours)
│   ├── Virtual Networks (VNets)
│   ├── Subnets and CIDR blocks
│   ├── Network Security Groups
│   ├── Application Gateway
│   └── Complex network architectures
│
└── 07. Terraform Modules (2-3 hours)
    ├── Module structure
    ├── Create reusable modules
    ├── Module composition
    ├── Public vs private modules
    └── Testing modules

Week 3: Real Applications (6-7 hours)
├── 08. Express.js API Deployment (3-4 hours)
│   ├── Multi-resource deployments
│   ├── Function Apps with APIs
│   ├── Health monitoring
│   ├── Application Insights
│   └── Production configurations
│
└── 09. Next.js Application (3 hours)
    ├── App Service deployment
    ├── Environment configuration
    ├── Build automation
    └── Continuous deployment

🎯 Goal: Build and deploy production-ready applications
```

### Path 3: Advanced Track (15-20 hours)

Perfect for **production deployments** and **enterprise infrastructure**.

```
┌─────────────────────────────────────────────────────────────┐
│                     ADVANCED TRACK                          │
└─────────────────────────────────────────────────────────────┘

Week 1-2: Architecture & Patterns (8-10 hours)
├── Complete Intermediate Track
├── Production Best Practices (3-4 hours)
│   ├── Security hardening
│   ├── Cost optimization
│   ├── Monitoring and observability
│   ├── Disaster recovery
│   └── Compliance (GDPR, SOC2)
│
├── Multi-Environment Setup (2-3 hours)
│   ├── Dev/Staging/Production
│   ├── Workspaces
│   ├── Variable management
│   └── Remote state backends
│
└── CI/CD Integration (2-3 hours)
    ├── GitHub Actions
    ├── Azure DevOps
    ├── Automated testing
    └── Deployment pipelines

Week 3-4: Enterprise Patterns (7-10 hours)
├── Module Development (3-4 hours)
│   ├── Publishing modules
│   ├── Versioning strategy
│   ├── Module testing (Terratest)
│   └── Documentation
│
├── Complex Architectures (3-4 hours)
│   ├── Multi-tier applications
│   ├── Microservices
│   ├── Kubernetes (AKS)
│   └── Database integration
│
└── Infrastructure Governance (1-2 hours)
    ├── Policy as Code (Azure Policy)
    ├── Tagging strategies
    ├── Cost management
    └── Security scanning

🎯 Goal: Design and deploy enterprise-grade infrastructure
```

---

## 📁 Project Structure

```
terraform-az-tutorial/
├── 📱 Web Application (Next.js tutorial site)
│   ├── app/
│   │   ├── page.tsx                    # Home page with tutorial overview
│   │   ├── setup/page.tsx              # Lesson 1: Setup
│   │   ├── basics/page.tsx             # Lesson 2: Terraform basics
│   │   ├── storage/page.tsx            # Lesson 3: Simple resources
│   │   ├── functions/page.tsx          # Lesson 4: Azure Functions
│   │   ├── networking/page.tsx         # Lesson 5: Networking
│   │   ├── modules/page.tsx            # Lesson 6: Modules
│   │   ├── api/page.tsx                # Lesson 7: Express.js API
│   │   ├── nextjs/page.tsx             # Lesson 8: Next.js deployment
│   │   └── components/                 # Reusable React components
│   └── public/                         # Static assets
│
├── 📖 Documentation
│   ├── LEARNING_PATH.md               # This file - comprehensive guide
│   ├── PRODUCTION_BEST_PRACTICES.md   # Production infrastructure patterns
│   ├── DEPLOYMENT_GUIDE.md            # Simplified deployment guide
│   └── terraform_guideline/           # Terraform reference docs
│       ├── START_HERE.md              # Quick start guide
│       ├── TERRAFORM_WORKFLOW_GUIDE.md # In-depth Terraform workflows
│       ├── QUICK_REFERENCE.md         # Command cheat sheet
│       └── README_VISUAL_GUIDE.md     # Visual diagrams and flowcharts
│
├── 🧩 Reusable Modules
│   └── modules/
│       └── storage-account/           # Example module
│           ├── main.tf
│           ├── variables.tf
│           ├── outputs.tf
│           └── README.md
│
└── ⚙️ Configuration
    ├── package.json                   # Next.js dependencies
    ├── tsconfig.json                  # TypeScript config
    └── next.config.ts                 # Next.js config
```

---

## 🚀 How to Use This Repository

### Option 1: Interactive Web Tutorial (Recommended)

Run the tutorial website locally for the best learning experience:

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/terraform-az-tutorial.git
cd terraform-az-tutorial

# Install dependencies
npm install
# or
bun install

# Start the development server
npm run dev
# or
bun dev

# Open in browser
open http://localhost:3000
```

**Benefits:**
- Interactive navigation
- Syntax-highlighted code blocks
- Copy-paste ready examples
- Visual diagrams
- Progress tracking

### Option 2: Read Documentation Directly

Navigate to the Markdown files in the `terraform_guideline/` folder:

1. Start with `terraform_guideline/START_HERE.md`
2. Follow the links to specific topics
3. Use `QUICK_REFERENCE.md` for command lookups

### Option 3: Jump to Specific Lessons

Each lesson is self-contained. You can jump directly to topics that interest you:

- Need to deploy a function? → See `app/functions/page.tsx`
- Want to learn modules? → See `app/modules/page.tsx`
- Building a Next.js app? → See `app/nextjs/page.tsx`

---

## ⚡ Quick Start

### 5-Minute Start

Get up and running immediately:

```bash
# 1. Install prerequisites
brew install azure-cli terraform    # macOS
# or use Windows/Linux commands above

# 2. Login to Azure
az login

# 3. Clone a tutorial example
mkdir my-first-terraform && cd my-first-terraform

# 4. Create a simple Terraform file
cat > main.tf <<EOF
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

provider "azurerm" {
  features {}
}

resource "azurerm_resource_group" "example" {
  name     = "rg-my-first-terraform"
  location = "East US"
}
EOF

# 5. Deploy!
terraform init
terraform plan
terraform apply

# 6. Verify in Azure Portal
az group show --name rg-my-first-terraform

# 7. Clean up
terraform destroy
```

🎉 **Congratulations!** You just deployed your first Azure infrastructure with Terraform!

---

## 📖 Lesson Overview

### Lesson 1: Setup & Prerequisites ⏱️ 1 hour
**What you'll learn:**
- Install Azure CLI and Terraform
- Create and configure Azure account
- Understand authentication (personal account vs service principals)
- Set up development environment

**Outcome:** Ready-to-use development environment

---

### Lesson 2: Terraform Basics ⏱️ 1-2 hours
**What you'll learn:**
- HCL (HashiCorp Configuration Language) syntax
- Providers and required versions
- Resources, variables, and outputs
- Essential Terraform commands
- State management concepts

**Outcome:** Understand Terraform fundamentals

---

### Lesson 3: Simple Resources ⏱️ 1-2 hours
**What you'll learn:**
- Deploy Resource Groups
- Create Storage Accounts
- Work with Terraform state
- Make changes to infrastructure
- Destroy resources

**Outcome:** Deploy your first Azure resources

---

### Lesson 4: Azure Functions ⏱️ 2-3 hours
**What you'll learn:**
- Serverless computing concepts
- Function Apps deployment
- Static website hosting
- Environment variables
- Automated deployment scripts

**Outcome:** Deploy a working serverless application

---

### Lesson 5: Advanced Networking ⏱️ 2-3 hours
**What you'll learn:**
- Virtual Networks (VNets)
- Subnets and CIDR blocks
- Network Security Groups (NSGs)
- Application Gateway
- Complex network architectures

**Outcome:** Build production-ready network infrastructure

---

### Lesson 6: Terraform Modules ⏱️ 2-3 hours
**What you'll learn:**
- Module structure and design
- Create reusable modules
- Module composition
- Public vs private modules
- Module testing and publishing

**Outcome:** Build reusable infrastructure components

---

### Lesson 7: Express.js API ⏱️ 3-4 hours
**What you'll learn:**
- Deploy Node.js applications
- Function Apps with REST APIs
- Application Insights monitoring
- Health checks
- Production configurations

**Outcome:** Deploy a production API

---

### Lesson 8: Next.js Deployment ⏱️ 3 hours
**What you'll learn:**
- App Service deployment
- Build automation
- Environment configuration
- Continuous deployment
- Production optimizations

**Outcome:** Deploy a full-stack web application

---

## 🎯 Best Practices

### Security
- ✅ Never commit state files to Git
- ✅ Use service principals for production
- ✅ Store secrets in Azure Key Vault
- ✅ Enable HTTPS and TLS 1.2+
- ✅ Use Network Security Groups
- ✅ Implement least privilege access

### Cost Optimization
- ✅ Use consumption plans when possible
- ✅ Destroy dev resources when not in use
- ✅ Monitor with Azure Cost Management
- ✅ Right-size resources
- ✅ Use reserved instances for production

### Infrastructure Management
- ✅ Use remote state backends
- ✅ Implement proper tagging strategy
- ✅ Version your modules
- ✅ Use workspaces for environments
- ✅ Document your infrastructure
- ✅ Automate with CI/CD

### Development Workflow
- ✅ Always run `terraform plan` before apply
- ✅ Use meaningful resource names
- ✅ Keep modules focused and small
- ✅ Test infrastructure changes in dev first
- ✅ Review state changes carefully

---

## 🆘 Troubleshooting

### Common Issues

**Issue: Terraform init fails**
```bash
# Solution: Check internet connection and proxy settings
terraform init -upgrade
```

**Issue: Azure authentication fails**
```bash
# Solution: Re-login to Azure
az logout
az login
az account show
```

**Issue: Resource already exists**
```bash
# Solution: Import existing resource or use different name
terraform import azurerm_resource_group.example /subscriptions/{id}/resourceGroups/{name}
```

**Issue: State locked**
```bash
# Solution: Force unlock (use carefully!)
terraform force-unlock <lock-id>
```

---

## 📚 Additional Resources

### Official Documentation
- [Terraform Documentation](https://www.terraform.io/docs)
- [Azure Provider Documentation](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Documentation](https://docs.microsoft.com/en-us/azure/)

### Community
- [Terraform Registry](https://registry.terraform.io/)
- [HashiCorp Learn](https://learn.hashicorp.com/terraform)
- [Azure Samples](https://github.com/Azure-Samples)

### Tools
- [Terraform VSCode Extension](https://marketplace.visualstudio.com/items?itemName=HashiCorp.terraform)
- [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/)
- [Terragrunt](https://terragrunt.gruntwork.io/) - Terraform wrapper for DRY configs

---

## 🤝 Contributing

Found a bug or have a suggestion? Please open an issue or pull request!

---

## 📄 License

This project is open source and available under the MIT License.

---

## 🌟 Next Steps

Ready to start learning?

1. **Run the tutorial website**: `npm run dev`
2. **Read Setup guide**: Visit `/setup` or `app/setup/page.tsx`
3. **Join the community**: Share your progress and ask questions

**Happy learning! 🚀**
