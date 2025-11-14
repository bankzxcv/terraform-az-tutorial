# Terraform Installation Guide

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Installation Methods](#installation-methods)
- [Version Management](#version-management)
- [IDE Setup](#ide-setup)
- [Verification](#verification)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Overview

Terraform is HashiCorp's Infrastructure as Code tool that allows you to define, provision, and manage cloud infrastructure using declarative configuration files. This guide provides detailed instructions for installing and configuring Terraform on all major operating systems.

---

## Learning Objectives

By the end of this guide, you will:
- Install Terraform on your operating system
- Verify the installation is working correctly
- Understand version management for Terraform
- Configure your IDE for Terraform development
- Know how to upgrade and manage multiple Terraform versions

---

## Difficulty Level

**Beginner** - No prior Terraform experience required.

---

## Time Estimate

**15-30 minutes** - Including IDE setup and verification.

---

## Installation Methods

### Method 1: Package Manager (Recommended)

Package managers provide the easiest installation and update experience.

#### macOS (using Homebrew)

```bash
# Install Homebrew if not already installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Add HashiCorp tap
brew tap hashicorp/tap

# Install Terraform
brew install hashicorp/tap/terraform

# Verify installation
terraform version
```

**Expected output:**
```
Terraform v1.6.0
on darwin_amd64
```

#### Windows (using Chocolatey)

```powershell
# Install Chocolatey if not already installed
# Run PowerShell as Administrator
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Terraform
choco install terraform

# Verify installation
terraform version
```

#### Windows (using Winget)

```powershell
# Winget comes pre-installed on Windows 11
# For Windows 10, install from Microsoft Store: "App Installer"

winget install HashiCorp.Terraform

# Verify installation
terraform version
```

#### Linux (Ubuntu/Debian)

```bash
# Update package index
sudo apt-get update

# Install required packages
sudo apt-get install -y gnupg software-properties-common

# Add HashiCorp GPG key
wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg

# Add HashiCorp repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install Terraform
sudo apt-get update
sudo apt-get install terraform

# Verify installation
terraform version
```

#### Linux (CentOS/RHEL)

```bash
# Add HashiCorp repository
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo

# Install Terraform
sudo yum -y install terraform

# Verify installation
terraform version
```

---

### Method 2: Manual Binary Installation

For systems without package managers or when you need a specific version.

#### Step 1: Download Terraform

Visit: https://www.terraform.io/downloads

Or download from command line:

**Linux (AMD64):**
```bash
# Set version (check latest at https://www.terraform.io/downloads)
TERRAFORM_VERSION="1.6.0"

# Download
wget https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Unzip
unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip

# Move to PATH
sudo mv terraform /usr/local/bin/

# Verify
terraform version

# Clean up
rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip
```

**macOS (AMD64):**
```bash
TERRAFORM_VERSION="1.6.0"
curl -O https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_darwin_amd64.zip
unzip terraform_${TERRAFORM_VERSION}_darwin_amd64.zip
sudo mv terraform /usr/local/bin/
terraform version
rm terraform_${TERRAFORM_VERSION}_darwin_amd64.zip
```

**macOS (ARM64 - Apple Silicon):**
```bash
TERRAFORM_VERSION="1.6.0"
curl -O https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_darwin_arm64.zip
unzip terraform_${TERRAFORM_VERSION}_darwin_arm64.zip
sudo mv terraform /usr/local/bin/
terraform version
rm terraform_${TERRAFORM_VERSION}_darwin_arm64.zip
```

**Windows:**
1. Download ZIP from https://www.terraform.io/downloads
2. Extract to `C:\terraform`
3. Add `C:\terraform` to System PATH:
   ```powershell
   $env:Path += ";C:\terraform"
   [Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::Machine)
   ```
4. Restart PowerShell
5. Verify: `terraform version`

---

## Version Management

### Using tfenv (Terraform Version Manager)

`tfenv` allows you to install and switch between multiple Terraform versions easily.

#### Install tfenv

**macOS:**
```bash
brew install tfenv
```

**Linux:**
```bash
git clone https://github.com/tfutils/tfenv.git ~/.tfenv
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bash_profile
# OR for zsh:
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.zshrc
source ~/.bash_profile  # or source ~/.zshrc
```

#### Use tfenv

```bash
# List available Terraform versions
tfenv list-remote

# Install a specific version
tfenv install 1.6.0

# Install latest version
tfenv install latest

# List installed versions
tfenv list

# Switch to a version
tfenv use 1.6.0

# Set default version
tfenv use 1.6.0
echo "1.6.0" > ~/.terraform-version
```

---

### Using asdf (Multi-tool Version Manager)

`asdf` is a universal version manager that supports many tools including Terraform.

#### Install asdf

**macOS/Linux:**
```bash
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.13.0

# Add to shell profile
echo '. $HOME/.asdf/asdf.sh' >> ~/.bashrc
# OR for zsh:
echo '. $HOME/.asdf/asdf.sh' >> ~/.zshrc

source ~/.bashrc  # or source ~/.zshrc
```

#### Install Terraform plugin

```bash
# Add Terraform plugin
asdf plugin add terraform

# List available versions
asdf list all terraform

# Install specific version
asdf install terraform 1.6.0

# Set global version
asdf global terraform 1.6.0

# Set local version (per-project)
asdf local terraform 1.5.0
```

---

## IDE Setup

### Visual Studio Code

VS Code is the most popular editor for Terraform development.

#### Install VS Code

Download from: https://code.visualstudio.com/

#### Install Terraform Extension

**Method 1: Via VS Code UI**
1. Open VS Code
2. Click Extensions icon (or press `Cmd+Shift+X` / `Ctrl+Shift+X`)
3. Search for "HashiCorp Terraform"
4. Click Install

**Method 2: Via Command Line**
```bash
code --install-extension hashicorp.terraform
```

#### Recommended Extensions

```bash
# HashiCorp Terraform (required)
code --install-extension hashicorp.terraform

# Azure Terraform (for Azure development)
code --install-extension ms-azuretools.vscode-azureterraform

# Terraform doc snippets
code --install-extension run-at-scale.terraform-doc-snippets

# GitLens (for version control)
code --install-extension eamodio.gitlens

# Better comments
code --install-extension aaron-bond.better-comments

# Bracket colorizer
code --install-extension coenraads.bracket-pair-colorizer-2
```

#### Configure VS Code for Terraform

Create `.vscode/settings.json` in your project:

```json
{
  "terraform.languageServer": {
    "enabled": true,
    "args": []
  },
  "terraform.experimentalFeatures": {
    "validateOnSave": true,
    "prefillRequiredFields": true
  },
  "[terraform]": {
    "editor.defaultFormatter": "hashicorp.terraform",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "source.formatAll.terraform": true
    }
  },
  "files.associations": {
    "*.tf": "terraform",
    "*.tfvars": "terraform"
  }
}
```

---

### JetBrains IDEs (IntelliJ, PyCharm, etc.)

#### Install Terraform Plugin

1. Open Settings/Preferences (`Cmd+,` / `Ctrl+Alt+S`)
2. Go to Plugins
3. Search for "Terraform and HCL"
4. Click Install
5. Restart IDE

#### Configure

1. Go to Settings → Languages & Frameworks → Terraform
2. Enable Terraform support
3. Set path to Terraform binary if not auto-detected

---

### Vim/Neovim

#### Install vim-terraform

```bash
# Using vim-plug
# Add to .vimrc or init.vim:
Plug 'hashivim/vim-terraform'
Plug 'vim-syntastic/syntastic'
Plug 'juliosueiras/vim-terraform-completion'

# Then run:
:PlugInstall
```

#### Configure

Add to `.vimrc`:
```vim
" Terraform settings
let g:terraform_align=1
let g:terraform_fmt_on_save=1
```

---

## Verification

### Basic Verification

```bash
# Check version
terraform version

# Expected output:
# Terraform v1.6.0
# on darwin_amd64
```

### Comprehensive Verification

```bash
# Check Terraform is in PATH
which terraform

# Test help command
terraform -help

# Test auto-complete installation
terraform -install-autocomplete

# Create a test configuration
mkdir terraform-test && cd terraform-test

cat > main.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
}

output "test" {
  value = "Terraform is working!"
}
EOF

# Initialize
terraform init

# Validate
terraform validate

# Apply
terraform apply -auto-approve

# Clean up
cd ..
rm -rf terraform-test
```

---

## Configuration

### Enable Auto-completion

Terraform supports command-line auto-completion for bash and zsh.

**Install:**
```bash
terraform -install-autocomplete
```

**Manual installation:**

**Bash:**
```bash
# Add to ~/.bashrc
complete -C /usr/local/bin/terraform terraform
```

**Zsh:**
```bash
# Add to ~/.zshrc
autoload -U +X bashcompinit && bashcompinit
complete -o nospace -C /usr/local/bin/terraform terraform
```

### Configure Logging (Optional)

Enable Terraform logging for debugging:

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export TF_LOG=INFO
export TF_LOG_PATH="./terraform.log"
```

**Windows (PowerShell):**
```powershell
# Add to PowerShell profile
$env:TF_LOG="INFO"
$env:TF_LOG_PATH=".\terraform.log"
```

**Log Levels:**
- `TRACE` - Most verbose
- `DEBUG` - Debug information
- `INFO` - General information
- `WARN` - Warnings
- `ERROR` - Errors only

### Plugin Cache Directory

Speed up provider downloads by using a shared plugin cache:

**Linux/macOS:**
```bash
# Add to ~/.bashrc or ~/.zshrc
export TF_PLUGIN_CACHE_DIR="$HOME/.terraform.d/plugin-cache"
mkdir -p $TF_PLUGIN_CACHE_DIR
```

**Windows:**
```powershell
# Add to PowerShell profile
$env:TF_PLUGIN_CACHE_DIR="$env:APPDATA\terraform.d\plugin-cache"
New-Item -ItemType Directory -Force -Path $env:TF_PLUGIN_CACHE_DIR
```

---

## Troubleshooting

### Issue: Command not found

**Problem:** `terraform: command not found`

**Solution:**
```bash
# Check if Terraform is installed
ls -la /usr/local/bin/terraform

# If exists but not in PATH, add to PATH
export PATH=$PATH:/usr/local/bin

# Make permanent by adding to ~/.bashrc or ~/.zshrc
echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
source ~/.bashrc
```

---

### Issue: Permission Denied

**Problem:** Permission denied when installing

**Solution (Linux/macOS):**
```bash
# Use sudo for system-wide installation
sudo mv terraform /usr/local/bin/

# Or install in user directory
mkdir -p ~/bin
mv terraform ~/bin/
export PATH=$PATH:~/bin
```

---

### Issue: Old Version Installed

**Problem:** Wrong Terraform version

**Solution:**
```bash
# Check current version
terraform version

# Update via package manager
brew upgrade terraform  # macOS
choco upgrade terraform  # Windows
sudo apt-get update && sudo apt-get upgrade terraform  # Linux

# Or reinstall specific version
tfenv install 1.6.0
tfenv use 1.6.0
```

---

### Issue: Auto-completion Not Working

**Problem:** Tab completion doesn't work

**Solution:**
```bash
# Reinstall auto-completion
terraform -install-autocomplete

# Restart shell
exec $SHELL

# For zsh, ensure compinit is loaded
autoload -U compinit && compinit
```

---

### Issue: Plugin Download Errors

**Problem:** Cannot download providers

**Solution:**
```bash
# Check internet connection
ping registry.terraform.io

# Clear plugin cache
rm -rf .terraform
rm -rf ~/.terraform.d/plugins

# Use alternative mirror (China users)
# Add to ~/.terraformrc:
cat > ~/.terraformrc << 'EOF'
provider_installation {
  network_mirror {
    url = "https://terraform-mirror.example.com/"
  }
}
EOF

# Reinitialize
terraform init
```

---

## Upgrading Terraform

### Using Package Manager

**macOS:**
```bash
brew upgrade terraform
```

**Windows:**
```powershell
choco upgrade terraform
# or
winget upgrade HashiCorp.Terraform
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get upgrade terraform
```

### Manual Upgrade

1. Download new version from https://www.terraform.io/downloads
2. Replace existing binary
3. Verify: `terraform version`

### Version Compatibility

**Important Notes:**
- Terraform follows semantic versioning
- Minor version upgrades (1.5.x → 1.6.x) are generally safe
- Major version upgrades (0.x → 1.x) may require code changes
- Always check release notes: https://github.com/hashicorp/terraform/releases

---

## Best Practices

1. **Use version managers** (tfenv or asdf) for easy version switching
2. **Pin Terraform version** in your code:
   ```hcl
   terraform {
     required_version = ">= 1.6.0"
   }
   ```
3. **Enable auto-completion** for better command-line experience
4. **Configure plugin cache** to save bandwidth and time
5. **Keep Terraform updated** but test before upgrading production code
6. **Use IDE extensions** for better development experience

---

## Next Steps

Now that Terraform is installed:

1. **Verify your installation** using the verification steps above
2. **Set up your IDE** with the recommended extensions
3. **Proceed to:** [03-cloud-cli-setup.md](./03-cloud-cli-setup.md) to configure cloud provider CLIs
4. **Or jump to:** [04-first-terraform-project.md](./04-first-terraform-project.md) to create your first project

---

## Related Documentation

- [Prerequisites](./01-prerequisites.md)
- [Cloud CLI Setup](./03-cloud-cli-setup.md)
- [First Terraform Project](./04-first-terraform-project.md)
- [Official Terraform Installation Docs](https://www.terraform.io/downloads)

---

**Estimated Completion Time:** 15-30 minutes

**Difficulty:** Beginner

**Previous:** [Prerequisites](./01-prerequisites.md) | **Next:** [Cloud CLI Setup](./03-cloud-cli-setup.md)
