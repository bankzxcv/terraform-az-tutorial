# GitHub Actions Basics for Infrastructure

## Learning Objectives

By the end of this lesson, you will be able to:
- Understand GitHub Actions core concepts and architecture
- Create and configure GitHub Actions workflows for infrastructure automation
- Use jobs, steps, and actions effectively
- Implement triggers, conditions, and dependencies
- Work with secrets and environment variables
- Apply best practices for CI/CD workflows

## Prerequisites

- Basic understanding of Git and GitHub
- Familiarity with YAML syntax
- GitHub account with repository access
- Basic command-line knowledge

**Estimated Time:** 45-60 minutes

---

## What are GitHub Actions?

GitHub Actions is a continuous integration and continuous delivery (CI/CD) platform that allows you to automate your build, test, and deployment pipeline directly from GitHub.

### Key Concepts

1. **Workflows**: Automated processes defined in YAML files
2. **Events**: Triggers that start workflows (push, pull_request, schedule, etc.)
3. **Jobs**: Sets of steps that execute on the same runner
4. **Steps**: Individual tasks that run commands or actions
5. **Actions**: Reusable units of code
6. **Runners**: Servers that execute workflows

---

## Workflow File Structure

Workflows are defined in `.github/workflows/` directory as YAML files.

### Basic Workflow Anatomy

```yaml
name: Workflow Name

# Triggers
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

# Environment variables available to all jobs
env:
  TERRAFORM_VERSION: "1.6.0"

# Jobs to run
jobs:
  job-name:
    name: Display Name
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Run a command
        run: echo "Hello, World!"
```

---

## Event Triggers

### Common Trigger Types

#### 1. Push Events
```yaml
on:
  push:
    branches:
      - main
      - 'releases/**'
    paths:
      - '**.tf'
      - '.github/workflows/**'
```

#### 2. Pull Request Events
```yaml
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches:
      - main
    paths-ignore:
      - 'docs/**'
      - '**.md'
```

#### 3. Scheduled Events (Cron)
```yaml
on:
  schedule:
    # Run at 2 AM UTC every day
    - cron: '0 2 * * *'
```

#### 4. Manual Triggers (Workflow Dispatch)
```yaml
on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Environment to deploy'
        required: true
        type: choice
        options:
          - dev
          - staging
          - prod
```

#### 5. Multiple Triggers
```yaml
on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]
  schedule:
    - cron: '0 2 * * 1'  # Every Monday at 2 AM
  workflow_dispatch:
```

---

## Jobs and Steps

### Job Configuration

```yaml
jobs:
  build:
    name: Build and Test
    runs-on: ubuntu-latest

    # Job-level permissions
    permissions:
      contents: read
      pull-requests: write

    # Job timeout (default: 360 minutes)
    timeout-minutes: 30

    # Environment to use
    environment: production

    steps:
      - name: Checkout
        uses: actions/checkout@v4
```

### Multiple Jobs with Dependencies

```yaml
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Validate
        run: echo "Validating..."

  plan:
    needs: validate  # Wait for validate to complete
    runs-on: ubuntu-latest
    steps:
      - name: Plan
        run: echo "Planning..."

  apply:
    needs: [validate, plan]  # Wait for both jobs
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Apply
        run: echo "Applying..."
```

### Job Matrix Strategy

```yaml
jobs:
  test:
    strategy:
      matrix:
        terraform-version: ['1.5.0', '1.6.0', '1.7.0']
        os: [ubuntu-latest, windows-latest, macos-latest]

    runs-on: ${{ matrix.os }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ matrix.terraform-version }}

      - name: Test
        run: terraform version
```

---

## Using Actions

### Popular Infrastructure Actions

```yaml
steps:
  # Checkout code
  - name: Checkout repository
    uses: actions/checkout@v4
    with:
      fetch-depth: 0  # Full history

  # Setup Terraform
  - name: Setup Terraform
    uses: hashicorp/setup-terraform@v3
    with:
      terraform_version: 1.6.0
      terraform_wrapper: true

  # Setup Azure CLI
  - name: Azure Login
    uses: azure/login@v1
    with:
      creds: ${{ secrets.AZURE_CREDENTIALS }}

  # Setup AWS credentials
  - name: Configure AWS Credentials
    uses: aws-actions/configure-aws-credentials@v4
    with:
      role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
      aws-region: us-east-1

  # Cache dependencies
  - name: Cache Terraform plugins
    uses: actions/cache@v3
    with:
      path: ~/.terraform.d/plugin-cache
      key: ${{ runner.os }}-terraform-${{ hashFiles('**/.terraform.lock.hcl') }}
```

---

## Environment Variables and Secrets

### Setting Environment Variables

```yaml
# Global environment variables
env:
  TERRAFORM_VERSION: "1.6.0"
  TF_LOG: "INFO"

jobs:
  deploy:
    runs-on: ubuntu-latest

    # Job-level environment variables
    env:
      ENVIRONMENT: production

    steps:
      - name: Deploy
        # Step-level environment variables
        env:
          REGION: us-east-1
        run: |
          echo "Terraform Version: $TERRAFORM_VERSION"
          echo "Environment: $ENVIRONMENT"
          echo "Region: $REGION"
```

### Using Secrets

```yaml
steps:
  - name: Use secrets
    env:
      API_KEY: ${{ secrets.API_KEY }}
      AZURE_CREDENTIALS: ${{ secrets.AZURE_CREDENTIALS }}
    run: |
      # Secrets are masked in logs
      echo "API Key is set: ${API_KEY:+yes}"
```

### GitHub Context Variables

```yaml
steps:
  - name: Print context
    run: |
      echo "Repository: ${{ github.repository }}"
      echo "Branch: ${{ github.ref_name }}"
      echo "Commit SHA: ${{ github.sha }}"
      echo "Actor: ${{ github.actor }}"
      echo "Event: ${{ github.event_name }}"
      echo "Workflow: ${{ github.workflow }}"
      echo "Run ID: ${{ github.run_id }}"
```

---

## Conditional Execution

### If Conditions

```yaml
steps:
  - name: Run only on main branch
    if: github.ref == 'refs/heads/main'
    run: echo "Main branch"

  - name: Run on PR
    if: github.event_name == 'pull_request'
    run: echo "Pull request"

  - name: Run on success
    if: success()
    run: echo "Previous steps succeeded"

  - name: Run on failure
    if: failure()
    run: echo "A previous step failed"

  - name: Run always
    if: always()
    run: echo "Always runs"

  - name: Complex condition
    if: |
      github.event_name == 'push' &&
      github.ref == 'refs/heads/main' &&
      contains(github.event.head_commit.message, '[deploy]')
    run: echo "Deploy on main with [deploy] tag"
```

### Job-level Conditions

```yaml
jobs:
  deploy-prod:
    if: |
      github.ref == 'refs/heads/main' &&
      github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: echo "Deploying..."
```

---

## Outputs and Artifacts

### Job Outputs

```yaml
jobs:
  terraform-plan:
    runs-on: ubuntu-latest
    outputs:
      plan-exitcode: ${{ steps.plan.outputs.exitcode }}
      plan-output: ${{ steps.plan.outputs.stdout }}

    steps:
      - name: Terraform Plan
        id: plan
        run: |
          terraform plan -detailed-exitcode -out=tfplan
          echo "exitcode=$?" >> $GITHUB_OUTPUT
          echo "stdout<<EOF" >> $GITHUB_OUTPUT
          terraform show tfplan >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

  terraform-apply:
    needs: terraform-plan
    if: needs.terraform-plan.outputs.plan-exitcode == '2'
    runs-on: ubuntu-latest
    steps:
      - name: Apply changes
        run: echo "Changes detected, applying..."
```

### Artifacts

```yaml
steps:
  - name: Generate plan
    run: terraform plan -out=tfplan

  - name: Upload plan artifact
    uses: actions/upload-artifact@v3
    with:
      name: terraform-plan
      path: tfplan
      retention-days: 5

  # In another job
  - name: Download plan artifact
    uses: actions/download-artifact@v3
    with:
      name: terraform-plan
```

---

## Complete Example: Infrastructure Workflow

```yaml
name: Infrastructure CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

env:
  TERRAFORM_VERSION: "1.6.0"
  TF_IN_AUTOMATION: "true"

jobs:
  validate:
    name: Validate Terraform
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Terraform Format Check
        run: terraform fmt -check -recursive

      - name: Terraform Init
        run: terraform init -backend=false

      - name: Terraform Validate
        run: terraform validate

      - name: Success notification
        if: success()
        run: echo "✅ Validation passed!"

      - name: Failure notification
        if: failure()
        run: echo "❌ Validation failed!"

  plan:
    name: Terraform Plan
    needs: validate
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    permissions:
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ env.TERRAFORM_VERSION }}

      - name: Terraform Init
        run: terraform init

      - name: Terraform Plan
        id: plan
        run: terraform plan -no-color
        continue-on-error: true

      - name: Comment PR with plan
        uses: actions/github-script@v7
        with:
          script: |
            const output = `#### Terraform Plan 📋
            \`\`\`
            ${{ steps.plan.outputs.stdout }}
            \`\`\`

            *Pushed by: @${{ github.actor }}, Action: \`${{ github.event_name }}\`*`;

            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: output
            })
```

---

## Best Practices

### 1. Workflow Organization

✅ **DO:**
- Use meaningful workflow and job names
- Break complex workflows into multiple files
- Use reusable workflows for common patterns
- Keep workflows focused and single-purpose

❌ **DON'T:**
- Create monolithic workflows that do everything
- Use generic names like "CI" or "Build"
- Duplicate logic across workflows

### 2. Security

✅ **DO:**
- Use least privilege permissions
- Store sensitive data in secrets
- Pin action versions to specific SHAs
- Review third-party actions before use
- Use environment protection rules

❌ **DON'T:**
- Hardcode credentials in workflows
- Use `pull_request_target` without understanding risks
- Grant unnecessary permissions
- Use untrusted third-party actions

### 3. Performance

✅ **DO:**
- Use caching for dependencies
- Run jobs in parallel when possible
- Set appropriate timeouts
- Use path filters to skip unnecessary runs
- Cache Terraform plugins and modules

❌ **DON'T:**
- Run unnecessary jobs
- Download large artifacts repeatedly
- Use overly long timeout values

### 4. Debugging

```yaml
steps:
  - name: Debug information
    run: |
      echo "Event: ${{ github.event_name }}"
      echo "Ref: ${{ github.ref }}"
      echo "Actor: ${{ github.actor }}"
      env | sort

  - name: Enable Terraform debug
    if: runner.debug == '1'
    run: echo "TF_LOG=DEBUG" >> $GITHUB_ENV
```

---

## Common Pitfalls and Troubleshooting

### Issue 1: Secrets Not Available in PR from Forks

**Problem:** Secrets are not available in `pull_request` events from forked repositories.

**Solution:** Use `pull_request_target` carefully or don't rely on secrets for fork PRs.

```yaml
on:
  pull_request_target:  # Use with caution!
    types: [labeled]

jobs:
  deploy:
    if: contains(github.event.pull_request.labels.*.name, 'safe-to-test')
    # ... rest of job
```

### Issue 2: Workflow Not Triggering

**Common causes:**
- YAML syntax errors
- Incorrect branch names
- Path filters excluding changes
- Workflow file not in `.github/workflows/`

**Debug:**
```bash
# Validate YAML syntax
yamllint .github/workflows/your-workflow.yml

# Check GitHub Actions tab for errors
```

### Issue 3: Permission Denied Errors

**Solution:** Add appropriate permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  id-token: write  # For OIDC
  issues: write
```

### Issue 4: Terraform State Lock

**Problem:** Concurrent runs cause state lock errors.

**Solution:** Use concurrency controls:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false  # Don't cancel, wait for completion
```

---

## Hands-on Exercises

### Exercise 1: Create Your First Workflow

Create a workflow that:
1. Triggers on push to main
2. Checks out code
3. Prints "Hello, GitHub Actions!"
4. Displays the current date and time

<details>
<summary>Solution</summary>

```yaml
name: Hello Workflow

on:
  push:
    branches: [ main ]

jobs:
  hello:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Say hello
        run: echo "Hello, GitHub Actions!"

      - name: Show date and time
        run: date
```
</details>

### Exercise 2: Multi-Job Workflow

Create a workflow with three jobs:
1. `lint` - Runs terraform fmt check
2. `validate` - Runs terraform validate (depends on lint)
3. `plan` - Runs terraform plan (depends on validate, only on PRs)

<details>
<summary>Solution</summary>

```yaml
name: Terraform CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform fmt -check

  validate:
    needs: lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init -backend=false
      - run: terraform validate

  plan:
    needs: validate
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: hashicorp/setup-terraform@v3
      - run: terraform init
      - run: terraform plan
```
</details>

### Exercise 3: Matrix Build

Create a workflow that tests Terraform code against multiple versions (1.5.0, 1.6.0, 1.7.0).

<details>
<summary>Solution</summary>

```yaml
name: Multi-Version Test

on: [push]

jobs:
  test:
    strategy:
      matrix:
        terraform-version: ['1.5.0', '1.6.0', '1.7.0']

    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Terraform ${{ matrix.terraform-version }}
        uses: hashicorp/setup-terraform@v3
        with:
          terraform_version: ${{ matrix.terraform-version }}

      - name: Test
        run: |
          terraform init -backend=false
          terraform validate
          terraform version
```
</details>

---

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [GitHub Actions Marketplace](https://github.com/marketplace?type=actions)
- [HashiCorp Setup Terraform Action](https://github.com/hashicorp/setup-terraform)
- [GitHub Actions Security Guides](https://docs.github.com/en/actions/security-guides)

---

## Next Steps

In the next lesson, we'll dive into **Terraform CI/CD** and learn how to:
- Set up complete Terraform pipelines
- Implement automated planning and applying
- Handle state management in CI/CD
- Implement approval workflows

Continue to [02-terraform-cicd.md](./02-terraform-cicd.md)
