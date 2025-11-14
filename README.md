# 🚀 Terraform + Azure Tutorial

**Learn Infrastructure as Code from Zero to Production**

[![Terraform](https://img.shields.io/badge/Terraform-1.5+-623CE4?logo=terraform)](https://www.terraform.io/)
[![Azure](https://img.shields.io/badge/Azure-Cloud-0078D4?logo=microsoft-azure)](https://azure.microsoft.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.0-000000?logo=next.js)](https://nextjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 📖 What is This?

This is a **comprehensive, hands-on tutorial** for learning Terraform and Microsoft Azure. It includes:

- ✅ **Interactive Web Tutorial** - Learn through a beautiful Next.js web interface
- ✅ **8 Progressive Lessons** - From basics to production-ready deployments
- ✅ **Complete Working Examples** - Every lesson includes deployable code
- ✅ **Production Best Practices** - Learn the right way from day one
- ✅ **Visual Diagrams** - Understand architecture with clear visualizations
- ✅ **Real-World Projects** - Deploy APIs, websites, and serverless applications

---

## 🎯 Quick Start

### Option 1: Run the Interactive Tutorial (Recommended)

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/terraform-az-tutorial.git
cd terraform-az-tutorial

# Install dependencies
npm install

# Start the development server
npm run dev

# Open in your browser
open http://localhost:3000
```

### Option 2: Jump Right to Deployment

If you already know Terraform basics and want to deploy something now:

**📘 See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for quick, copy-paste deployment recipes.

### Option 3: Read the Documentation

Browse the comprehensive guides:

- **📚 [LEARNING_PATH.md](./LEARNING_PATH.md)** - Complete learning roadmap with 3 difficulty tracks
- **🏗️ [PRODUCTION_BEST_PRACTICES.md](./PRODUCTION_BEST_PRACTICES.md)** - Enterprise-grade infrastructure patterns
- **🚀 [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Simplified deployment recipes

---

## 📚 Documentation Structure

```
📁 terraform-az-tutorial/
│
├── 📄 README.md (you are here)
│   └── Project overview and quick start
│
├── 📘 LEARNING_PATH.md
│   ├── Complete learning roadmap
│   ├── Beginner track (8-10 hours)
│   ├── Intermediate track (12-15 hours)
│   ├── Advanced track (15-20 hours)
│   └── Prerequisites and setup guide
│
├── 🏗️ PRODUCTION_BEST_PRACTICES.md
│   ├── Architecture design patterns
│   ├── Security best practices
│   ├── Cost optimization strategies
│   ├── High availability patterns
│   ├── Monitoring & observability
│   ├── Multi-environment setup
│   ├── CI/CD integration
│   └── Compliance & governance
│
├── 🚀 DEPLOYMENT_GUIDE.md
│   ├── Quick deployment recipes
│   ├── Scenario 1: Simple storage
│   ├── Scenario 2: Static website
│   ├── Scenario 3: Azure Functions
│   ├── Scenario 4: Next.js app
│   ├── Scenario 5: REST API
│   └── Troubleshooting guide
│
└── 📂 terraform_guideline/
    ├── START_HERE.md
    ├── TERRAFORM_WORKFLOW_GUIDE.md
    ├── QUICK_REFERENCE.md
    └── README_VISUAL_GUIDE.md
```

---

## 🗺️ Learning Path Overview

### Beginner Track (8-10 hours)
**Perfect if you're new to Terraform**

```
Week 1: Foundations
├── Setup & Prerequisites
├── Terraform Basics
└── Deploy Simple Resources

Week 2: Building Skills
├── Azure Functions
└── State Management
```

### Intermediate Track (12-15 hours)
**Perfect if you have basic Terraform experience**

```
Week 1-2: Core Skills
├── Advanced Networking
└── Terraform Modules

Week 3: Real Applications
├── Express.js API
└── Next.js Deployment
```

### Advanced Track (15-20 hours)
**Perfect for production deployments**

```
Week 1-2: Architecture & Patterns
├── Production Best Practices
├── Multi-Environment Setup
└── CI/CD Integration

Week 3-4: Enterprise Patterns
├── Module Development
├── Complex Architectures
└── Infrastructure Governance
```

📖 **Full Details:** [LEARNING_PATH.md](./LEARNING_PATH.md)

---

## 📋 Tutorial Lessons

The interactive tutorial includes 8 comprehensive lessons:

| # | Lesson | Duration | What You'll Learn |
|---|--------|----------|-------------------|
| 1 | [Setup & Prerequisites](app/setup/page.tsx) | 1 hour | Install tools, configure Azure, authentication |
| 2 | [Terraform Basics](app/basics/page.tsx) | 1-2 hours | HCL syntax, providers, resources, state |
| 3 | [Simple Resources](app/storage/page.tsx) | 1-2 hours | Resource Groups, Storage Accounts |
| 4 | [Azure Functions](app/functions/page.tsx) | 2-3 hours | Serverless deployment, static websites |
| 5 | [Advanced Networking](app/networking/page.tsx) | 2-3 hours | VNets, Subnets, NSGs, complex architectures |
| 6 | [Terraform Modules](app/modules/page.tsx) | 2-3 hours | Reusable modules, composition, publishing |
| 7 | [Express.js API](app/api/page.tsx) | 3-4 hours | REST APIs, Application Insights, health monitoring |
| 8 | [Deploy Next.js](app/nextjs/page.tsx) | 3 hours | Full-stack apps, build automation |

---

## 🚀 Quick Deployment Examples

### Deploy Storage in 30 Seconds

```bash
cat > main.tf <<EOF
terraform {
  required_providers {
    azurerm = { source = "hashicorp/azurerm", version = "~> 3.0" }
  }
}
provider "azurerm" { features {} }

resource "azurerm_resource_group" "main" {
  name     = "rg-quickstart"
  location = "East US"
}

resource "azurerm_storage_account" "main" {
  name                     = "stquickstart\${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.main.name
  location                 = azurerm_resource_group.main.location
  account_tier             = "Standard"
  account_replication_type = "LRS"
}

resource "random_string" "suffix" {
  length = 6; special = false; upper = false
}

output "storage_name" {
  value = azurerm_storage_account.main.name
}
EOF

terraform init && terraform apply -auto-approve
```

📘 **More Examples:** [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## 🏗️ Project Structure

```
terraform-az-tutorial/
│
├── 📱 Web Application (Next.js Tutorial Site)
│   ├── app/
│   │   ├── page.tsx                 # Home page
│   │   ├── setup/page.tsx           # Lesson 1
│   │   ├── basics/page.tsx          # Lesson 2
│   │   ├── storage/page.tsx         # Lesson 3
│   │   ├── functions/page.tsx       # Lesson 4
│   │   ├── networking/page.tsx      # Lesson 5
│   │   ├── modules/page.tsx         # Lesson 6
│   │   ├── api/page.tsx             # Lesson 7
│   │   ├── nextjs/page.tsx          # Lesson 8
│   │   └── components/              # Reusable React components
│   └── public/                      # Static assets
│
├── 📖 Documentation
│   ├── README.md                    # This file
│   ├── LEARNING_PATH.md             # Complete learning roadmap
│   ├── PRODUCTION_BEST_PRACTICES.md # Production patterns
│   ├── DEPLOYMENT_GUIDE.md          # Quick deployment recipes
│   └── terraform_guideline/         # Reference documentation
│
├── 🧩 Reusable Modules
│   └── modules/
│       └── storage-account/         # Example Terraform module
│
└── ⚙️ Configuration
    ├── package.json                 # Dependencies
    ├── tsconfig.json                # TypeScript config
    └── next.config.ts               # Next.js config
```

---

## 🎓 What You'll Learn

### Core Terraform Concepts
- HCL syntax and configuration
- Providers and resources
- Variables, outputs, and locals
- State management
- Modules and composition
- Remote backends
- Workspaces

### Azure Services
- Resource Groups
- Storage Accounts
- App Services
- Function Apps
- Virtual Networks
- Network Security Groups
- Application Insights
- Key Vault
- PostgreSQL/MySQL

### Production Skills
- Security best practices
- Cost optimization
- High availability
- Disaster recovery
- Monitoring & logging
- CI/CD integration
- Infrastructure testing
- Compliance & governance

### Real-World Applications
- Static websites
- Serverless APIs
- Full-stack web apps
- Microservices
- Multi-tier architectures

---

## 💡 Key Features

### 🎯 Progressive Learning
Start from zero and build up to production-ready infrastructure. Each lesson builds on the previous one.

### 📱 Interactive Web Interface
Learn through a beautiful, modern web application with syntax highlighting, diagrams, and copy-paste examples.

### 🔧 Working Code
Every example is tested and deployable. No pseudo-code or theoretical examples.

### 🏗️ Production Patterns
Learn enterprise-grade patterns used by companies running mission-critical workloads.

### 📊 Visual Diagrams
Understand complex architectures with clear, visual representations using Mermaid diagrams.

### 🚀 Quick Deployment
Get started in minutes with copy-paste deployment recipes for common scenarios.

---

## 🛠️ Prerequisites

### Required

1. **Azure Account** (free tier available)
   - Sign up: [azure.microsoft.com/free](https://azure.microsoft.com/free)
   - $200 credit for 30 days + 12 months of free services

2. **Azure CLI**
   ```bash
   # macOS
   brew install azure-cli

   # Windows
   winget install Microsoft.AzureCLI

   # Linux
   curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
   ```

3. **Terraform**
   ```bash
   # macOS
   brew tap hashicorp/tap && brew install hashicorp/tap/terraform

   # Windows
   choco install terraform

   # Linux
   sudo apt install terraform
   ```

4. **Node.js 18+** (for running the tutorial website)
   ```bash
   # macOS
   brew install node

   # Windows
   winget install OpenJS.NodeJS

   # Or download from nodejs.org
   ```

### Recommended

- VS Code with Terraform extension
- Basic command line knowledge
- Understanding of cloud computing concepts

---

## 🚦 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/terraform-az-tutorial.git
cd terraform-az-tutorial
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Start the Tutorial

```bash
npm run dev
# or
bun dev
```

### 4. Open in Browser

```bash
open http://localhost:3000
```

### 5. Follow the Lessons

Start with "Setup & Prerequisites" and work your way through!

---

## 📚 Additional Resources

### Official Documentation
- [Terraform Documentation](https://www.terraform.io/docs)
- [Azure Provider Docs](https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs)
- [Azure Documentation](https://docs.microsoft.com/en-us/azure/)

### Community Resources
- [Terraform Registry](https://registry.terraform.io/)
- [HashiCorp Learn](https://learn.hashicorp.com/terraform)
- [Azure Samples on GitHub](https://github.com/Azure-Samples)

### Tools & Extensions
- [Terraform VS Code Extension](https://marketplace.visualstudio.com/items?itemName=HashiCorp.terraform)
- [Azure Terraform Extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azureterraform)
- [Terragrunt](https://terragrunt.gruntwork.io/) - DRY Terraform configurations

---

## 🤝 Contributing

Contributions are welcome! If you find bugs or have suggestions:

1. Open an issue describing the problem or enhancement
2. Fork the repository
3. Create a feature branch
4. Make your changes
5. Submit a pull request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🌟 Support

If you find this tutorial helpful:
- ⭐ Star this repository
- 🐛 Report bugs by opening an issue
- 💡 Suggest improvements
- 📢 Share with others learning Terraform

---

## 🗺️ Recommended Learning Path

```
┌─────────────────────────────────────────────────────┐
│  1. Read this README                                │
│  2. Run: npm run dev                                │
│  3. Complete Setup lesson                           │
│  4. Work through lessons 2-8                        │
│  5. Read PRODUCTION_BEST_PRACTICES.md               │
│  6. Deploy your own project!                        │
└─────────────────────────────────────────────────────┘
```

**For Quick Deployment:**
```
┌─────────────────────────────────────────────────────┐
│  1. Read DEPLOYMENT_GUIDE.md                        │
│  2. Copy a deployment recipe                        │
│  3. Customize for your needs                        │
│  4. Deploy!                                         │
└─────────────────────────────────────────────────────┘
```

---

## 📞 Questions?

- 📖 Check the [LEARNING_PATH.md](./LEARNING_PATH.md) for guidance
- 🚀 See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for deployment help
- 🏗️ Read [PRODUCTION_BEST_PRACTICES.md](./PRODUCTION_BEST_PRACTICES.md) for advanced topics
- 🐛 Open an issue for bugs or questions

---

## 🎉 What's Next?

After completing this tutorial, you'll be ready to:

✅ Design and deploy Azure infrastructure with Terraform
✅ Build production-ready systems with best practices
✅ Create reusable modules for your organization
✅ Implement CI/CD for infrastructure
✅ Optimize costs and improve security
✅ Work confidently with Infrastructure as Code

**Ready to start learning?**

```bash
npm run dev
```

**Happy learning! 🚀**

---

<div align="center">

Made with ❤️ for the Terraform and Azure community

[⬆ Back to Top](#-terraform--azure-tutorial)

</div>
