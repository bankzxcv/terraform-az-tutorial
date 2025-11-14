# Prerequisites

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Required Tools](#required-tools)
- [Required Accounts](#required-accounts)
- [Required Knowledge](#required-knowledge)
- [System Requirements](#system-requirements)
- [Optional Tools](#optional-tools)
- [Verification Checklist](#verification-checklist)
- [Next Steps](#next-steps)

---

## Overview

Before you begin your DevSecOps journey with Terraform and cloud infrastructure, you need to ensure your development environment is properly configured. This guide covers all the prerequisites needed to complete the tutorials in this repository.

---

## Learning Objectives

By the end of this guide, you will:
- Understand all the tools required for Infrastructure as Code development
- Know which cloud accounts you need and how to set them up
- Have a checklist to verify your environment is ready
- Understand the baseline knowledge needed for success

---

## Difficulty Level

**Beginner** - No prior experience with Terraform or cloud platforms required.

---

## Time Estimate

**30-60 minutes** - Depending on your current setup and internet connection speed.

---

## Required Tools

### 1. Terraform

**What it is:** Infrastructure as Code tool that lets you define and provision cloud infrastructure using a declarative configuration language.

**Version Required:** Terraform 1.0 or higher (1.5+ recommended)

**Installation:**

#### macOS
```bash
# Using Homebrew
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Verify installation
terraform version
```

#### Windows
```powershell
# Using Chocolatey
choco install terraform

# Using Winget
winget install HashiCorp.Terraform

# Verify installation
terraform version
```

#### Linux (Ubuntu/Debian)
```bash
# Add HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add HashiCorp repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install
sudo apt update && sudo apt install terraform

# Verify installation
terraform version
```

**Documentation:** https://www.terraform.io/downloads

---

### 2. Azure CLI

**What it is:** Command-line tool for managing Azure resources and authentication.

**Version Required:** 2.40.0 or higher

**Installation:**

#### macOS
```bash
# Using Homebrew
brew install azure-cli

# Verify installation
az version
```

#### Windows
```powershell
# Using MSI Installer
# Download from: https://aka.ms/installazurecliwindows

# Or using Winget
winget install Microsoft.AzureCLI

# Verify installation
az version
```

#### Linux (Ubuntu/Debian)
```bash
# One-line install
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Verify installation
az version
```

**Documentation:** https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

---

### 3. AWS CLI (Optional - for multi-cloud tutorials)

**What it is:** Command-line tool for managing AWS resources.

**Version Required:** 2.x

**Installation:**

#### macOS
```bash
# Using Homebrew
brew install awscli

# Verify installation
aws --version
```

#### Windows
```powershell
# Download MSI installer
# https://awscli.amazonaws.com/AWSCLIV2.msi

# Verify installation
aws --version
```

#### Linux
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Verify installation
aws --version
```

**Documentation:** https://aws.amazon.com/cli/

---

### 4. Google Cloud SDK (Optional - for multi-cloud tutorials)

**What it is:** Command-line tool for managing Google Cloud resources.

**Installation:**

#### macOS/Linux
```bash
# Download and install
curl https://sdk.cloud.google.com | bash

# Initialize
exec -l $SHELL
gcloud init

# Verify installation
gcloud version
```

#### Windows
```powershell
# Download installer from:
# https://cloud.google.com/sdk/docs/install

# Verify installation
gcloud version
```

**Documentation:** https://cloud.google.com/sdk/docs/install

---

### 5. Git

**What it is:** Version control system for tracking code changes.

**Version Required:** 2.30 or higher

**Installation:**

#### macOS
```bash
# Using Homebrew
brew install git

# Verify installation
git --version
```

#### Windows
```powershell
# Download from: https://git-scm.com/download/win

# Or using Winget
winget install Git.Git

# Verify installation
git --version
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install git

# Verify installation
git --version
```

**Documentation:** https://git-scm.com/

---

### 6. Code Editor

**Recommended:** Visual Studio Code with Terraform extension

**Installation:**

#### All Platforms
1. Download VS Code: https://code.visualstudio.com/
2. Install the following extensions:
   - HashiCorp Terraform
   - Azure Terraform
   - GitLens (optional)
   - Terraform Doc Snippets (optional)

**Alternative Editors:**
- IntelliJ IDEA with Terraform plugin
- Vim with terraform-vim plugin
- Sublime Text with Terraform package

---

## Required Accounts

### 1. Microsoft Azure Account

**Why you need it:** To deploy and manage Azure infrastructure.

**Cost:** Free tier available with $200 credit for 30 days + 12 months of popular services free

**Sign up:**
1. Visit: https://azure.microsoft.com/free
2. Click "Start free"
3. Sign in with Microsoft account or create new one
4. Complete verification (requires credit card but won't charge for free services)
5. Complete the signup wizard

**Verify:**
```bash
az login
az account show
az account list --output table
```

**Documentation:** https://azure.microsoft.com/free

---

### 2. AWS Account (Optional)

**Why you need it:** For multi-cloud tutorials and AWS-specific lessons.

**Cost:** Free tier available with limited services for 12 months

**Sign up:**
1. Visit: https://aws.amazon.com/free
2. Create new AWS account
3. Complete verification (requires credit card)

**Verify:**
```bash
aws configure
aws sts get-caller-identity
```

**Documentation:** https://aws.amazon.com/free

---

### 3. Google Cloud Account (Optional)

**Why you need it:** For multi-cloud tutorials and GCP-specific lessons.

**Cost:** Free tier with $300 credit for 90 days

**Sign up:**
1. Visit: https://cloud.google.com/free
2. Sign in with Google account
3. Complete verification (requires credit card)
4. Enable billing

**Verify:**
```bash
gcloud init
gcloud auth list
gcloud projects list
```

**Documentation:** https://cloud.google.com/free

---

### 4. GitHub Account (Optional but Recommended)

**Why you need it:** For version control, CI/CD, and collaboration.

**Cost:** Free with unlimited public and private repositories

**Sign up:**
1. Visit: https://github.com/join
2. Create account
3. Verify email address

---

## Required Knowledge

### Essential Skills

You should have basic familiarity with:

1. **Command Line/Terminal**
   - Navigate directories (`cd`, `ls`, `pwd`)
   - Run commands and programs
   - Understand file paths
   - Set environment variables

2. **Basic Networking Concepts**
   - IP addresses and CIDR notation (basic understanding)
   - HTTP/HTTPS protocols
   - DNS basics
   - Ports and firewalls (conceptual)

3. **Cloud Computing Concepts**
   - What is cloud computing
   - IaaS, PaaS, SaaS (basic understanding)
   - Virtual machines vs containers (conceptual)
   - Basic understanding of cloud services

### Nice to Have (But Not Required)

- Experience with any programming language
- Previous cloud platform usage
- Understanding of DevOps practices
- Linux administration basics
- YAML or JSON syntax familiarity

---

## System Requirements

### Operating System

Any of the following:
- **macOS:** 10.15 (Catalina) or newer
- **Windows:** Windows 10/11 with PowerShell 5.1+ or Windows Terminal
- **Linux:** Ubuntu 20.04+, Debian 10+, RHEL 8+, or equivalent

### Hardware

**Minimum:**
- 4 GB RAM
- 10 GB free disk space
- Stable internet connection

**Recommended:**
- 8 GB RAM or more
- 20 GB free disk space
- Fast internet connection (for downloading providers and modules)

---

## Optional Tools

### 1. Docker

**Why it's useful:** For containerized applications and testing.

**Installation:**
- macOS/Windows: Docker Desktop - https://www.docker.com/products/docker-desktop
- Linux: Docker Engine - https://docs.docker.com/engine/install/

### 2. Terraform LSP (Language Server Protocol)

**Why it's useful:** Enhanced IDE support with auto-completion and validation.

**Installation:** Often included with Terraform VS Code extension

### 3. TFLint

**Why it's useful:** Linter for Terraform code to catch errors and enforce best practices.

**Installation:**
```bash
# macOS
brew install tflint

# Windows
choco install tflint

# Linux
curl -s https://raw.githubusercontent.com/terraform-linters/tflint/master/install_linux.sh | bash
```

### 4. Terraform-docs

**Why it's useful:** Automatically generates documentation from Terraform modules.

**Installation:**
```bash
# macOS
brew install terraform-docs

# Windows
choco install terraform-docs

# Linux
curl -Lo ./terraform-docs.tar.gz https://github.com/terraform-docs/terraform-docs/releases/download/v0.16.0/terraform-docs-v0.16.0-linux-amd64.tar.gz
tar -xzf terraform-docs.tar.gz
sudo mv terraform-docs /usr/local/bin/
```

### 5. Azure Storage Explorer (GUI tool)

**Why it's useful:** Visual interface for managing Azure Storage accounts.

**Download:** https://azure.microsoft.com/en-us/features/storage-explorer/

### 6. Postman or curl

**Why it's useful:** Testing APIs and HTTP endpoints.

**Installation:**
- Postman: https://www.postman.com/downloads/
- curl: Usually pre-installed on macOS/Linux

---

## Verification Checklist

Use this checklist to verify your environment is ready:

```bash
# Terraform
terraform version
# Expected: Terraform v1.5.0 or higher

# Azure CLI
az version
# Expected: azure-cli 2.40.0 or higher

# Azure Login
az login
az account show
# Expected: Your Azure subscription details

# Git
git --version
# Expected: git version 2.30.0 or higher

# Optional: AWS CLI
aws --version
# Expected: aws-cli/2.x.x

# Optional: Google Cloud SDK
gcloud version
# Expected: Google Cloud SDK version info

# Code Editor
code --version  # For VS Code
# Expected: VS Code version info
```

### Quick Verification Script

Create a file `verify-setup.sh`:

```bash
#!/bin/bash

echo "Checking Terraform..."
terraform version || echo "Terraform not found!"

echo -e "\nChecking Azure CLI..."
az version || echo "Azure CLI not found!"

echo -e "\nChecking Git..."
git --version || echo "Git not found!"

echo -e "\nChecking VS Code..."
code --version || echo "VS Code not found!"

echo -e "\nAll checks complete!"
```

Run it:
```bash
chmod +x verify-setup.sh
./verify-setup.sh
```

---

## Troubleshooting

### Common Issues

**Issue: Command not found**
- **Solution:** Add tool to system PATH or reinstall
- Verify installation directory
- Restart terminal/shell

**Issue: Azure CLI login fails**
- **Solution:** Clear browser cache and try again
- Use `az login --use-device-code` for alternative login
- Check firewall/proxy settings

**Issue: Permission denied errors**
- **Solution:** Run terminal as administrator (Windows) or use `sudo` (macOS/Linux)
- Check file permissions

**Issue: Cannot create Azure resources**
- **Solution:** Verify your subscription is active
- Check you're using the correct subscription: `az account set --subscription <subscription-id>`
- Ensure you have Contributor or Owner role

---

## Cost Management

### Important Notes

- **Azure Free Tier:** $200 credit for 30 days + 12 months free services
- **AWS Free Tier:** 12 months of free tier services with limits
- **GCP Free Tier:** $300 credit for 90 days

### Best Practices

1. **Set up billing alerts:**
   ```bash
   # Azure
   az consumption budget create --budget-name "DevBudget" --amount 50 --category Cost
   ```

2. **Always clean up resources:**
   ```bash
   terraform destroy
   ```

3. **Monitor costs regularly:**
   - Azure: https://portal.azure.com/#blade/Microsoft_Azure_CostManagement
   - AWS: https://console.aws.amazon.com/billing/
   - GCP: https://console.cloud.google.com/billing

4. **Use cost calculators:**
   - Azure: https://azure.microsoft.com/en-us/pricing/calculator/
   - AWS: https://calculator.aws/
   - GCP: https://cloud.google.com/products/calculator

---

## Next Steps

Once you've completed this prerequisites setup:

1. **Verify everything is installed** using the checklist above
2. **Proceed to:** [02-terraform-installation.md](./02-terraform-installation.md) for detailed Terraform setup
3. **Or jump to:** [04-first-terraform-project.md](./04-first-terraform-project.md) if you're ready to start

---

## Related Documentation

- [Terraform Installation Guide](./02-terraform-installation.md)
- [Cloud CLI Setup](./03-cloud-cli-setup.md)
- [First Terraform Project](./04-first-terraform-project.md)
- [Main README](../../README.md)

---

**Estimated Completion Time:** 30-60 minutes

**Difficulty:** Beginner

**Next:** [Terraform Installation](./02-terraform-installation.md)
