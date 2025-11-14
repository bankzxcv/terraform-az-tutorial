# Contributing to Terraform + Azure Tutorial

Thank you for your interest in contributing to this Terraform learning repository! We welcome contributions from everyone.

---

## Table of Contents
- [How to Contribute](#how-to-contribute)
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Types of Contributions](#types-of-contributions)
- [Development Setup](#development-setup)
- [Adding New Lessons](#adding-new-lessons)
- [Code Style Guidelines](#code-style-guidelines)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)
- [Community](#community)

---

## How to Contribute

There are many ways to contribute:

1. **Report bugs or issues**
2. **Suggest new lessons or improvements**
3. **Fix typos or improve documentation**
4. **Add new code examples**
5. **Create new learning modules**
6. **Improve existing lessons**
7. **Add cloud provider support (AWS, GCP)**

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. By participating in this project, you agree to:

- Be respectful and inclusive
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Trolling or insulting/derogatory comments
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

---

## Getting Started

### Prerequisites

- GitHub account
- Git installed locally
- Terraform installed
- Node.js 18+ (for web tutorial)
- Azure CLI (or AWS CLI/gcloud for respective contributions)

### Fork and Clone

```bash
# Fork the repository on GitHub first, then:

# Clone your fork
git clone https://github.com/YOUR_USERNAME/terraform-az-tutorial.git
cd terraform-az-tutorial

# Add upstream remote
git remote add upstream https://github.com/ORIGINAL_OWNER/terraform-az-tutorial.git

# Verify remotes
git remote -v
```

---

## Types of Contributions

### Bug Reports

**Before submitting:**
- Check if the issue already exists
- Use the issue search function

**Good bug report includes:**
- Clear title
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Terraform version, etc.)
- Error messages or screenshots
- Terraform configuration (if applicable)

**Template:**
```markdown
## Description
Brief description of the bug

## Steps to Reproduce
1. Step one
2. Step two
3. ...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., macOS 13.0]
- Terraform version: [e.g., 1.6.0]
- Azure CLI version: [e.g., 2.50.0]

## Additional Context
Screenshots, error logs, etc.
```

---

### Feature Requests

**Good feature request includes:**
- Clear use case
- Benefit to learners
- Proposed implementation (optional)
- Examples or references (optional)

**Template:**
```markdown
## Feature Description
What feature would you like to see?

## Use Case
Why is this feature important?

## Proposed Implementation
How might this work? (optional)

## Additional Context
Examples, references, etc.
```

---

## Development Setup

### Web Tutorial Setup

```bash
# Install dependencies
npm install
# or
bun install

# Run development server
npm run dev
# or
bun dev

# Open browser
open http://localhost:3000
```

### Terraform Testing

```bash
# Navigate to a lesson
cd docs/00-getting-started/

# Format code
terraform fmt -recursive

# Validate configuration
terraform validate

# Test deployment (in test subscription)
terraform init
terraform plan
terraform apply -auto-approve
terraform destroy -auto-approve
```

---

## Adding New Lessons

### Lesson Structure

Each lesson should follow this structure:

```markdown
# Lesson Title

## Table of Contents
- [Overview](#overview)
- [Learning Objectives](#learning-objectives)
- [Difficulty Level](#difficulty-level)
- [Time Estimate](#time-estimate)
- [Prerequisites](#prerequisites)
- [Content sections...]
- [Hands-On Exercise](#hands-on-exercise)
- [Summary](#summary)
- [Next Steps](#next-steps)

## Overview
Brief description of what this lesson covers

## Learning Objectives
By the end of this lesson, you will:
- Objective 1
- Objective 2
- Objective 3

## Difficulty Level
**Beginner** | **Intermediate** | **Advanced**

## Time Estimate
**XX minutes** - Brief description

## Prerequisites
- Prerequisite 1
- Prerequisite 2

[Main content sections]

## Hands-On Exercise
Practical exercise with solution

## Summary
Key takeaways from this lesson

## Next Steps
What to learn next

## Related Documentation
- Link 1
- Link 2
```

### File Naming Convention

```
docs/
├── 00-getting-started/
│   ├── 01-descriptive-name.md
│   ├── 02-another-lesson.md
│   └── XX-lesson-name.md
├── 01-azure/
│   ├── 01-resource-groups.md
│   └── XX-topic-name.md
└── 09-advanced/
    └── XX-advanced-topic.md
```

**Rules:**
- Use two-digit prefixes (01, 02, etc.)
- Use kebab-case for file names
- Use descriptive names
- Group related lessons in same directory

---

### Code Examples

**Terraform code should:**
- Be tested and working
- Include comments explaining complex parts
- Follow Terraform style guide
- Use latest provider versions

**Example:**
```hcl
# Resource Group for the application
resource "azurerm_resource_group" "app" {
  name     = "rg-${var.app_name}-${var.environment}"
  location = var.location

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    Purpose     = "Application resources"
  }
}

# Storage account with proper naming convention
resource "azurerm_storage_account" "app" {
  name                     = "st${var.app_name}${random_string.suffix.result}"
  resource_group_name      = azurerm_resource_group.app.name
  location                 = azurerm_resource_group.app.location
  account_tier             = "Standard"
  account_replication_type = var.environment == "prod" ? "GRS" : "LRS"

  # Security best practices
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  enable_https_traffic_only       = true

  tags = local.common_tags
}

# Random suffix for unique naming
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}
```

---

## Code Style Guidelines

### Terraform

**Follow these conventions:**

```hcl
# 1. File organization
# - main.tf: Primary resources
# - variables.tf: Variable definitions
# - outputs.tf: Output definitions
# - versions.tf: Provider requirements
# - locals.tf: Local values (optional)
# - data.tf: Data sources (optional)

# 2. Formatting
# - Use terraform fmt before committing
# - 2-space indentation
# - Align equals signs for readability

# 3. Naming
# - Use snake_case for resource names
# - Use descriptive names
# - Prefix resources by type (rg-, st-, vm-)

# Good
resource "azurerm_resource_group" "application" {
  name     = "rg-myapp-${var.environment}"
  location = "eastus"
}

# Bad
resource "azurerm_resource_group" "rg1" {
  name = "my-resource-group"
  location="eastus"
}

# 4. Comments
# - Add comments for complex logic
# - Explain why, not what
# - Use module documentation headers

# 5. Variables
# - Always include description
# - Always specify type
# - Provide sensible defaults when possible
# - Use validation when appropriate

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

# 6. Outputs
# - Always include description
# - Mark sensitive outputs

output "resource_group_id" {
  description = "The ID of the resource group"
  value       = azurerm_resource_group.application.id
}

output "connection_string" {
  description = "Database connection string"
  value       = azurerm_sql_server.example.connection_string
  sensitive   = true
}
```

---

### Markdown

```markdown
# Use ATX-style headers (# ## ###)

# Good
## Section Title

# Bad
Section Title
-------------

# Use code fences with language specification
```bash
terraform init
```

# Use tables for comparisons
| Feature | Description |
|---------|-------------|
| State   | Tracks resources |

# Use lists for steps
1. First step
2. Second step
3. Third step

# Link to other docs using relative paths
[Prerequisites](docs/00-getting-started/01-prerequisites.md)
```

---

### React/TypeScript (for web tutorial)

```typescript
// Use TypeScript
// Follow Next.js conventions
// Use functional components with hooks
// Add comments for complex logic

interface LessonProps {
  title: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: string;
}

export default function Lesson({ title, difficulty, duration }: LessonProps) {
  return (
    <div className="lesson">
      <h1>{title}</h1>
      <span className={`difficulty ${difficulty}`}>{difficulty}</span>
      <span className="duration">{duration}</span>
    </div>
  );
}
```

---

## Submitting Changes

### Branch Naming

```bash
# Feature
git checkout -b feature/add-aws-lessons

# Bug fix
git checkout -b fix/typo-in-readme

# Documentation
git checkout -b docs/improve-getting-started

# Examples:
# feature/kubernetes-lessons
# fix/broken-link-in-doc
# docs/add-aws-quick-start
```

---

### Commit Messages

**Format:**
```
type: brief description

More detailed explanation if needed.

- Bullet points for multiple changes
- Keep lines under 72 characters
```

**Types:**
- `feat`: New feature or lesson
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples:**
```
feat: add AWS Lambda deployment lesson

Added comprehensive lesson covering:
- Lambda function creation
- IAM roles
- API Gateway integration
- Environment variables
```

```
fix: correct Azure CLI installation commands

Updated installation commands for macOS to use latest Homebrew formula.
```

```
docs: improve HCL syntax examples

- Added more examples for loops
- Clarified for_each vs count usage
- Fixed code formatting
```

---

### Pull Request Process

1. **Update from upstream**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Test your changes**
   ```bash
   # For Terraform changes
   terraform fmt -recursive -check
   terraform validate

   # For web tutorial
   npm run build
   npm run lint
   ```

3. **Push to your fork**
   ```bash
   git push origin feature/your-feature
   ```

4. **Create Pull Request**
   - Use PR template
   - Provide clear description
   - Link related issues
   - Add screenshots if applicable

5. **PR Template:**
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] New lesson/feature
   - [ ] Bug fix
   - [ ] Documentation update
   - [ ] Code refactoring

   ## Testing
   - [ ] Terraform code tested
   - [ ] Documentation reviewed
   - [ ] Web tutorial builds successfully
   - [ ] All links work

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Comments added where needed
   - [ ] Documentation updated
   - [ ] No sensitive data included
   - [ ] Tested on local environment

   ## Screenshots (if applicable)
   ```

---

## Review Process

### What to Expect

1. **Initial Review:** Within 1-2 days
2. **Feedback:** Constructive comments on code, style, or content
3. **Revisions:** You may be asked to make changes
4. **Approval:** At least one maintainer approval required
5. **Merge:** Maintainer will merge when approved

### Review Criteria

**Code quality:**
- Works as intended
- Follows style guide
- Well documented
- No security issues

**Educational value:**
- Clear learning objectives
- Appropriate difficulty level
- Hands-on examples
- Builds on previous lessons

**Documentation:**
- Complete and accurate
- Proper formatting
- No broken links
- Proper grammar and spelling

---

## Community

### Get Help

- **GitHub Discussions:** Ask questions, share ideas
- **Issues:** Report bugs, request features
- **Pull Requests:** Contribute code and documentation

### Recognition

Contributors are recognized in:
- README.md contributors section
- Release notes
- Community highlights

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

Open an issue or start a discussion. We're here to help!

**Thank you for contributing!**
