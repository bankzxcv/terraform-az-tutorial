# Terraform Complete Workflow: Visual Guide

## Table of Contents
1. What Happens During `terraform init`
2. File Structure After Init
3. Complete Workflow: init → plan → apply
4. Variable Flow Through System
5. State File Management
6. Output Generation
7. Provider Interaction with Azure

---

## 1. WHAT HAPPENS DURING `terraform init`

### Step-by-Step Process:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         $ terraform init                                    │
│                                                                             │
│  This command initializes the Terraform working directory                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────────────────────────────────────┐
            │ Step 1: Read Terraform Configuration      │
            │ ─────────────────────────────────────────  │
            │ • Parse *.tf files in directory           │
            │ • Identify required providers             │
            │ • Validate syntax                         │
            │ • Read terraform {} block                 │
            └───────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────────────────────────────────────┐
            │ Step 2: Download Provider Plugins         │
            │ ─────────────────────────────────────────  │
            │ • Check required_providers section        │
            │ • Download from Terraform Registry        │
            │ • Match specified version constraints     │
            │ • Store in .terraform/providers/          │
            └───────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────────────────────────────────────┐
            │ Step 3: Create Lock File                  │
            │ ─────────────────────────────────────────  │
            │ • Generate .terraform.lock.hcl            │
            │ • Record provider versions used           │
            │ • Ensure reproducible builds              │
            │ • Share across team                       │
            └───────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────────────────────────────────────┐
            │ Step 4: Initialize Backend                │
            │ ─────────────────────────────────────────  │
            │ • Set up state management                 │
            │ • Create local state file (default)       │
            │ • Or connect to remote backend            │
            │ • Prepare for state storage               │
            └───────────────────────────────────────────┘
                                    │
                                    ▼
            ┌───────────────────────────────────────────┐
            │ Step 5: Create .terraform Directory       │
            │ ─────────────────────────────────────────  │
            │ • .terraform/                             │
            │ ├── providers/                            │
            │ │   └── azurerm/                          │
            │ ├── modules/ (if needed)                  │
            │ └── terraform.tfstate (state file)        │
            └───────────────────────────────────────────┘
                                    │
                                    ▼
                        ✓ Initialization Complete
                    Working directory is ready for planning
```

### What Gets Created:

```
┌─ .terraform/ (Hidden directory)
│  ├─ providers/
│  │  └─ registry.terraform.io/
│  │     └─ hashicorp/
│  │        └─ azurerm/
│  │           └─ 3.x.x/  ← Downloaded provider plugin
│  │              ├─ terraform-provider-azurerm
│  │              └─ ... other files
│  │
│  ├─ modules/ (empty initially)
│  │
│  └─ [terraform.tfstate] (local state, if using local backend)
│
├─ .terraform.lock.hcl (Lock file - MUST commit to git!)
├─ .gitignore (should exclude .terraform directory)
└─ *.tf files (your configuration files)
```

---

## 2. FILE STRUCTURE AFTER INIT

### Complete Directory Structure:

```
terraform-teaching/
│
├── terraform/
│   └── simple/  ← Your working directory
│       │
│       ├── .terraform/               ← AUTO-GENERATED (don't commit)
│       │   ├── modules/
│       │   ├── providers/
│       │   │   └── registry.terraform.io/
│       │   │       └── hashicorp/
│       │   │           └── azurerm/
│       │   │               └── 3.x.x/
│       │   │                   ├── terraform-provider-azurerm_v3.x.x
│       │   │                   └── [other provider files]
│       │   │
│       │   ├── .terraform.tfstate      ← State file (after init)
│       │   └── .terraform.tfstate.backup
│       │
│       ├── .terraform.lock.hcl         ← Lock file (COMMIT THIS!)
│       │                                   Ensures all team members
│       │                                   use same provider versions
│       │
│       ├── .gitignore                  ← Prevent committing sensitive files
│       │   .terraform/
│       │   *.tfstate
│       │   *.tfstate.*
│       │   **/.terraform/*
│       │
│       ├── provider.tf                 ← Provider configuration
│       │   └── Defines azurerm provider version requirements
│       │
│       ├── main.tf                     ← Resource definitions
│       │   └── Create, read, update resources
│       │
│       ├── variable.tf                 ← Input variable declarations
│       │   └── Define what inputs terraform accepts
│       │
│       ├── terraform.tfvars            ← Variable values (optional)
│       │   └── Actual values for variables
│       │       (or use -var flag, or auto-loaded)
│       │
│       ├── outputs.tf                  ← Output declarations (if present)
│       │   └── Export computed values
│       │
│       └── terraform.tfstate.backup    ← Backup of last applied state
│
```

### File Purposes:

```
┌─────────────────────────────────────────────────────────────────┐
│ FILE                   │ PURPOSE                                 │
├─────────────────────────────────────────────────────────────────┤
│ provider.tf            │ Provider configuration                  │
│                        │ • Which cloud provider (azurerm)        │
│                        │ • Provider version constraints          │
│                        │ • Authentication details                │
├─────────────────────────────────────────────────────────────────┤
│ main.tf                │ Resource definitions                    │
│                        │ • What resources to create              │
│                        │ • Resource configuration                │
│                        │ • Data sources                          │
├─────────────────────────────────────────────────────────────────┤
│ variable.tf            │ Input variable declarations             │
│                        │ • Variable names                        │
│                        │ • Types (string, number, bool, etc)     │
│                        │ • Descriptions                          │
│                        │ • Validation rules (optional)           │
├─────────────────────────────────────────────────────────────────┤
│ terraform.tfvars       │ Variable values                         │
│                        │ • Actual values for declared variables  │
│                        │ • Can be committed (no secrets)         │
│                        │ • Use terraform.tfvars.local for env-   │
│                        │   specific or sensitive values          │
├─────────────────────────────────────────────────────────────────┤
│ outputs.tf             │ Output declarations                     │
│                        │ • Values to display after apply         │
│                        │ • Export for other modules              │
│                        │ • Query state: terraform output         │
├─────────────────────────────────────────────────────────────────┤
│ .terraform.lock.hcl    │ Dependency lock file                    │
│                        │ • Records exact provider versions       │
│                        │ • MUST be committed to git              │
│                        │ • Ensures reproducibility              │
├─────────────────────────────────────────────────────────────────┤
│ terraform.tfstate      │ STATE FILE                              │
│                        │ • Records current infrastructure state  │
│                        │ • Maps Terraform config to real world   │
│                        │ • NEVER commit to git                   │
│                        │ • Keep secure!                          │
├─────────────────────────────────────────────────────────────────┤
│ .terraform/            │ Provider plugins & modules              │
│                        │ • Downloaded provider executables       │
│                        │ • NEVER commit to git                   │
│                        │ • Regenerated on `terraform init`       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. COMPLETE WORKFLOW: init → plan → apply

### Full Workflow Diagram:

```
                           ┌────────────────────────────────────┐
                           │  YOUR TERRAFORM CONFIGURATION      │
                           │  (*.tf files, terraform.tfvars)    │
                           └────────────────┬───────────────────┘
                                            │
                  ┌─────────────────────────┴─────────────────────────┐
                  │                                                   │
                  ▼                                                   ▼
        ┌──────────────────────┐                          ┌──────────────────────┐
        │  STEP 1: INIT        │                          │  STEP 2: PLAN        │
        └──────────────────────┘                          └──────────────────────┘
        $ terraform init                                 $ terraform plan
               │                                                │
               │  1. Parse *.tf files                           │
               │  2. Download provider plugins                  │  1. Read current state
               │  3. Create .terraform/                         │  2. Read configuration
               │  4. Create .terraform.lock.hcl                 │  3. Query provider API
               │  5. Initialize state backend                   │  4. Determine changes
               │                                                │  5. Display execution plan
               ▼                                                │
    ✓ Initialized                                             ▼
      Ready to Plan                               ┌─────────────────────────┐
               │                                  │  Execution Plan Output  │
               │                                  │  ─────────────────────  │
               │                                  │  + azurerm_resource... │
               │                                  │  - azurerm_resource... │
               │                                  │  ~ azurerm_resource... │
               │                                  └────────────┬────────────┘
               │                                               │
               │                                     (Review and Approve)
               │                                               │
               │                                               ▼
               │                                  ┌──────────────────────┐
               │                                  │  STEP 3: APPLY       │
               │                                  └──────────────────────┘
               │                                  $ terraform apply
               │                                               │
               │                                               │
               └───────────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌──────────────────────────────────────┐
                    │  Apply Execution Phase               │
                    │  ──────────────────────────────────  │
                    │  1. Create resources on Azure        │
                    │  2. Update terraform.tfstate         │
                    │  3. Display outputs                  │
                    │  4. Save terraform.tfstate.backup    │
                    └──────────────────────┬───────────────┘
                                           │
                                           ▼
                            ┌──────────────────────────┐
                            │  Infrastructure Created  │
                            │  State File Updated      │
                            │  Outputs Displayed       │
                            └──────────────────────────┘


COMMAND FLOW WITH DATA:
═══════════════════════════════════════════════════════════════════════════════

$ terraform init
│
├─ Reads: provider.tf, main.tf, variable.tf
├─ Validates: HCL syntax
├─ Downloads: azurerm provider v3.x.x
├─ Creates: .terraform/ directory
├─ Writes: .terraform.lock.hcl
└─ Initializes: State backend
   └─ Creates: terraform.tfstate (or connects to remote)

$ terraform plan
│
├─ Reads: All *.tf files
├─ Reads: terraform.tfvars (variable values)
├─ Reads: terraform.tfstate (current state)
├─ Calls: Azure API (via azurerm provider)
│   ├─ Authenticates to Azure
│   └─ Queries existing resources
├─ Compares: Config vs Current State
├─ Generates: Execution Plan
│   ├─ Resources to create (+)
│   ├─ Resources to delete (-)
│   └─ Resources to modify (~)
└─ Outputs: Plan to console (or file with -out)

$ terraform apply
│
├─ Reads: Execution plan (or recomputes if no plan file)
├─ Shows: Changes and asks for approval
├─ Executes: For each resource in plan:
│   ├─ Calls: Azure API
│   ├─ Creates: or updates or deletes resource
│   └─ Receives: Resource details from Azure
├─ Updates: terraform.tfstate
│   ├─ Records: Resource IDs, properties
│   ├─ Backs up: Previous state
│   └─ Saves: New state
├─ Computes: Output values
└─ Displays: Outputs and resource IDs


MULTIPLE WAYS TO RUN TERRAFORM:
═══════════════════════════════════════════════════════════════════════════════

Method 1: Interactive
  $ terraform plan              ← Review changes
  $ terraform apply             ← Approve and apply (interactive prompt)

Method 2: Automated
  $ terraform plan -out=tfplan
  $ terraform apply tfplan      ← No prompt needed, uses saved plan

Method 3: Auto-approval (for CI/CD)
  $ terraform apply -auto-approve

Method 4: Destroy infrastructure
  $ terraform destroy           ← Removes all managed resources
  $ terraform destroy -auto-approve
```

---

## 4. VARIABLE FLOW THROUGH SYSTEM

### How Variables Move Through Terraform:

```
VARIABLE DECLARATION vs ASSIGNMENT:
═══════════════════════════════════════════════════════════════════════════════

File: variable.tf                    File: terraform.tfvars
┌───────────────────────────────┐   ┌──────────────────────────────┐
│ DECLARATION                   │   │ ASSIGNMENT (Values)          │
│ ─────────────────────────────  │   │ ─────────────────────────────│
│                               │   │                              │
│ variable "location" {         │   │ location = "East US"         │
│   type        = string        │   │ environment = "production"   │
│   description = "Azure       │   │ resource_tags = {            │
│                 region"       │   │   Owner = "DevOps"           │
│   default     = "West US"     │   │   Project = "Infra"          │
│ }                             │   │ }                            │
│                               │   │                              │
│ variable "environment" {      │   │                              │
│   type        = string        │   │                              │
│   description = "Env stage"   │   │                              │
│   validation {                │   │                              │
│     condition = contains(     │   │                              │
│       ["dev", "prod"], var... │   │                              │
│     error_message = "Must be" │   │                              │
│   }                           │   │                              │
│ }                             │   │                              │
└───────────────────────────────┘   └──────────────────────────────┘
```

### Variable Flow Diagram:

```
                            VARIABLE VALUES SOURCE
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
        ┌──────────────────┐ ┌────────────────┐ ┌─────────────────┐
        │ terraform.tfvars │ │ .tfvars files  │ │ -var flag       │
        │ (auto-loaded)    │ │ (specified)    │ │ (CLI)           │
        │                  │ │                │ │                 │
        │ location = ...   │ │ -var-file=...  │ │ -var 'key=val'  │
        │ env = ...        │ │                │ │                 │
        └────────┬─────────┘ └────────┬───────┘ └────────┬────────┘
                 │                   │                   │
                 └───────────────────┼───────────────────┘
                                     │
                            (Priority order, left wins)
                                     │
                                     ▼
                    ┌──────────────────────────────────┐
                    │  Variable Values Loaded           │
                    │  ─────────────────────────────── │
                    │  {                               │
                    │    location: "East US",          │
                    │    environment: "production",    │
                    │    tags: {...}                   │
                    │  }                               │
                    └──────────────────────────────────┘
                                     │
                                     ▼
                ┌────────────────────────────────────────────┐
                │  VALIDATION PHASE                          │
                │  ──────────────────────────────────────── │
                │  1. Type check (string, number, bool)     │
                │  2. Run validation blocks (if defined)    │
                │  3. Check required fields (if no default) │
                └─────────────────────┬────────────────────┘
                                      │
                                      ▼
                        ┌──────────────────────────┐
                        │  Validation Passed?      │
                        └─────┬────────────┬──────┘
                              │            │
                         YES  │            │  NO
                              ▼            ▼
                        Continue...   ERROR EXIT


VARIABLES IN TERRAFORM CODE:
═══════════════════════════════════════════════════════════════════════════════

File: main.tf
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│ resource "azurerm_resource_group" "rg" {                        │
│   name     = "rg-${var.environment}-${var.location}"            │
│   │                      │                  │                   │
│   └──────────────────────┼──────────────────┘                   │
│                          │                                       │
│         Terraform Variable Reference: var.VARIABLE_NAME         │
│                                                                  │
│   location = var.location                                       │
│              │        │                                         │
│              │        └─ Variable declared in variable.tf       │
│              └─ Reference syntax in HCL                         │
│                                                                  │
│   tags = merge(                                                 │
│     var.resource_tags,     ← Maps to tfvars value               │
│     {                                                            │
│       Environment = var.environment,                            │
│       CreatedBy = var.created_by                                │
│     }                                                            │
│   )                                                              │
│ }                                                                │
│                                                                  │
│ resource "azurerm_storage_account" "sa" {                       │
│   name = "sa${var.storage_name_prefix}${random_string}"        │
│   ...                                                            │
│ }                                                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘


VARIABLE VALUE RESOLUTION - STEP BY STEP:
═══════════════════════════════════════════════════════════════════════════════

Step 1: Parse variable.tf
  ┌─────────────────────────────────────────┐
  │ Registers variable "location" (string)  │
  │ Registers variable "environment" (...)  │
  │ etc.                                    │
  └─────────────────────────────────────────┘
         │
         ▼
Step 2: Read terraform.tfvars
  ┌─────────────────────────────────────────┐
  │ location = "East US"                    │
  │ environment = "prod"                    │
  │ ...                                     │
  └─────────────────────────────────────────┘
         │
         ▼
Step 3: Apply -var and -var-file overrides (if provided)
  ┌─────────────────────────────────────────┐
  │ $ terraform apply -var 'location=...'   │
  │ Overrides tfvars value                  │
  └─────────────────────────────────────────┘
         │
         ▼
Step 4: Validate all variables
  ┌─────────────────────────────────────────┐
  │ • Check types match                     │
  │ • Run validation blocks                 │
  │ • Ensure required vars provided         │
  └─────────────────────────────────────────┘
         │
         ▼
Step 5: Evaluate variable references in code
  ┌─────────────────────────────────────────┐
  │ var.location          → "East US"       │
  │ var.environment       → "prod"          │
  │ "${var.location}"     → "East US"       │
  │ "rg-${var.environment}" → "rg-prod"    │
  └─────────────────────────────────────────┘
         │
         ▼
Step 6: Use values in resource creation
  ┌─────────────────────────────────────────┐
  │ resource_group location = "East US"     │
  │ resource_group name = "rg-prod"         │
  └─────────────────────────────────────────┘
```

---

## 5. STATE FILE MANAGEMENT

### Understanding terraform.tfstate:

```
WHAT IS STATE?
═══════════════════════════════════════════════════════════════════════════════

The terraform.tfstate file is the BRIDGE between:

    Your Terraform Code (Desired State)
              │
              ├─────────────────────────────────────┐
              │                                     │
              ▼                                     ▼
    terraform.tfstate              Azure Cloud
    (Last Known State)             (Actual State)
              │
              └─────────────────────────────────────┤
                    Terraform reconciles these
                   to determine what to change


WHY STATE MATTERS:
═══════════════════════════════════════════════════════════════════════════════

Without State: Terraform would NOT KNOW...
  ✗ What resources already exist
  ✗ Which resources to update vs create
  ✗ What IDs map to which resources
  ✗ How to find resources to destroy
  ✗ Previous outputs

With State: Terraform KNOWS...
  ✓ All currently managed resources
  ✓ Resource IDs and properties
  ✓ Exact changes needed
  ✓ How to uniquely identify each resource
  ✓ Previous resource configurations


STATE FILE LOCATION & STORAGE:
═══════════════════════════════════════════════════════════════════════════════

LOCAL BACKEND (Default):
┌─────────────────────────────────────┐
│ terraform.tfstate                   │
│ (Local filesystem)                  │
│                                     │
│ ✓ Good for: Learning, single user  │
│ ✗ Bad for: Teams, CI/CD, production│
│ ✗ Not secured by default            │
│ ✗ Hard to share                     │
└─────────────────────────────────────┘

REMOTE BACKENDS (Recommended):
┌─────────────────────────────────────────────────────────────────┐
│ Azure Storage Account (Recommended for Azure)                   │
│                                                                 │
│ backend "azurerm" {                                             │
│   resource_group_name  = "tfstate-rg"                           │
│   storage_account_name = "tfstate12345"                         │
│   container_name       = "tfstate"                              │
│   key                  = "prod.tfstate"                         │
│ }                                                               │
│                                                                 │
│ ✓ Centralized state management                                 │
│ ✓ Team access                                                  │
│ ✓ Encrypted at rest                                            │
│ ✓ State locking (prevents conflicts)                           │
│ ✓ Versioning support                                           │
│ ✓ Easy backup/recovery                                         │
└─────────────────────────────────────────────────────────────────┘


STATE FILE CONTENTS (JSON):
═══════════════════════════════════════════════════════════════════════════════

{
  "version": 4,
  "terraform_version": "1.5.0",
  "serial": 3,              ← Incremented on each apply
  "lineage": "abc123...",   ← Unique ID for this state chain

  "outputs": {
    "resource_group_id": {
      "value": "/subscriptions/.../resourceGroups/my-rg",
      "type": "string"
    }
  },

  "resources": [
    {
      "type": "azurerm_resource_group",
      "name": "rg",
      "instances": [
        {
          "index_key": null,
          "schema_version": 0,
          "attributes": {
            "id": "/subscriptions/.../resourceGroups/my-rg",
            "name": "my-rg",
            "location": "eastus",
            "tags": {
              "Environment": "production"
            },
            "managed_by": null
          }
        }
      ]
    },

    {
      "type": "azurerm_storage_account",
      "name": "sa",
      "instances": [
        {
          "attributes": {
            "id": "/subscriptions/.../storageAccounts/mysa123",
            "name": "mysa123",
            "location": "eastus",
            "account_tier": "Standard",
            "account_replication_type": "GRS",
            ...
          }
        }
      ]
    }
  ]
}

KEY THINGS TO KNOW ABOUT STATE:
1. Contains SENSITIVE DATA (passwords, keys, API tokens)
2. Resource IDs allow Terraform to find and modify resources
3. Every "apply" increments the serial number
4. Lineage ensures you're not mixing different state chains
5. NEVER commit .tfstate to git or share publicly
```

### State File Lifecycle:

```
BEFORE APPLY:                DURING APPLY:              AFTER APPLY:
═════════════════════════════════════════════════════════════════════════

No state file              Creates resources          terraform.tfstate
(First run)                on Azure                   (Records resource IDs)
    │                            │                             │
    │                            ▼                             │
    │                   Calls Azure API                        │
    │                   Receives resource IDs                  │
    │                   and configuration details              │
    │                            │                             │
    └────────────────────────────┼─────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────┐
                    │ State File Updated         │
                    │                            │
                    │ Contains:                  │
                    │ • Resource IDs from Azure  │
                    │ • Current properties       │
                    │ • Resource metadata        │
                    │ • Output values            │
                    └────────────────────────────┘
                                 │
                                 ▼
                    terraform.tfstate.backup
                    (Previous state saved)


CONCURRENT ACCESS (Why Locking Matters):
═════════════════════════════════════════════════════════════════════════════

Scenario: Multiple team members running terraform apply

WITHOUT STATE LOCKING:                WITH STATE LOCKING:
┌────────────────────────────────┐    ┌─────────────────────────────────┐
│ Person A: terraform apply      │    │ Person A: terraform apply       │
│ Reads state: serial 5          │    │ Acquires lock on state          │
│                                │    │ Reads state: serial 5           │
│ Person B: terraform apply      │    │                                 │
│ Reads state: serial 5 (SAME!)  │    │ Person B: terraform apply       │
│                                │    │ WAITS... state is locked        │
│ A applies changes, state: 6    │    │                                 │
│ B applies changes, state: 7    │    │ A finishes, releases lock       │
│ (overwrites A's changes!)      │    │                                 │
│                                │    │ B acquires lock                 │
│ RESULT: Data loss!             │    │ Reads state: serial 6           │
│                                │    │ B applies changes, state: 7     │
│                                │    │                                 │
│                                │    │ RESULT: Correct! No conflicts   │
└────────────────────────────────┘    └─────────────────────────────────┘

STATE LOCKING BACKENDS:
  ✓ Azure Storage Account (blob lease lock)
  ✓ Terraform Cloud/Enterprise
  ✓ AWS S3 + DynamoDB
  ✓ Google Cloud Storage + Firestore
  ✗ Local filesystem (no locking)
```

### State File Commands:

```
IMPORTANT STATE COMMANDS:
═════════════════════════════════════════════════════════════════════════════

COMMAND                          WHAT IT DOES
─────────────────────────────────────────────────────────────────────────────

terraform state list              Show all resources tracked in state
                                  └─ azurerm_resource_group.rg
                                  └─ azurerm_storage_account.sa

terraform state show              Show detailed attributes of a resource
<resource>
$ terraform state show            └─ Resource ID, properties, tags
azurerm_resource_group.rg

terraform state pull              Download state from remote backend
                                  to local machine

terraform state push              Upload local state to remote backend

terraform state rm                REMOVE resource from state
<resource>                        (Don't destroy in Azure, just stop
                                  tracking)

terraform refresh                 Update state from current Azure
                                  resources (without apply/destroy)

terraform import <type>.<name>    Import existing Azure resource into
<azure-resource-id>               state (discovered and managed as code)

DANGER ZONE (Only if you know what you're doing):

terraform state replace-provider  Change provider for existing resource

terraform state drop              Remove from state without tracking
                                  resource name
```

---

## 6. OUTPUT GENERATION

### How Outputs Work:

```
OUTPUT DECLARATION:
═════════════════════════════════════════════════════════════════════════════

File: outputs.tf (or in main.tf)
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│ output "resource_group_id" {                                    │
│   description = "The ID of created resource group"              │
│   value       = azurerm_resource_group.rg.id                    │
│   sensitive   = false                                           │
│ }                                                                │
│                                                                  │
│ output "storage_account_name" {                                 │
│   description = "Name of the storage account"                   │
│   value       = azurerm_storage_account.sa.name                 │
│   sensitive   = false                                           │
│ }                                                                │
│                                                                  │
│ output "connection_string" {                                    │
│   description = "Storage account connection string"             │
│   value       = azurerm_storage_account.sa.primary_conn_string  │
│   sensitive   = true                ← Hidden from console output│
│ }                                                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘


OUTPUT FLOW:
═════════════════════════════════════════════════════════════════════════════

terraform apply
      │
      ├─ Creates azurerm_resource_group
      │  └─ Returns: ID, name, location, etc.
      │
      ├─ Creates azurerm_storage_account
      │  └─ Returns: ID, name, endpoints, connection string
      │
      ├─ Updates terraform.tfstate with all details
      │
      └─ Evaluates all outputs
         │
         ├─ resource_group_id = azurerm_resource_group.rg.id
         │  └─ Value: /subscriptions/.../resourceGroups/my-rg
         │
         ├─ storage_account_name = azurerm_storage_account.sa.name
         │  └─ Value: mysa123
         │
         └─ connection_string = (marked sensitive)
            └─ Value: <hidden>

      Stores outputs in: terraform.tfstate

      Displays outputs to console:
      ───────────────────────────────────
      Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

      Outputs:

      resource_group_id = "/subscriptions/.../resourceGroups/my-rg"
      storage_account_name = "mysa123"
      connection_string = <sensitive>


ACCESSING OUTPUTS AFTER APPLY:
═════════════════════════════════════════════════════════════════════════════

Command: terraform output
┌────────────────────────────────────────────────────────────────┐
│ $ terraform output                                             │
│                                                                │
│ Displays all outputs in human-readable format                 │
│                                                                │
│ Output:                                                        │
│ resource_group_id = "/subscriptions/.../resourceGroups/my-rg" │
│ storage_account_name = "mysa123"                              │
│ connection_string = <sensitive>                               │
└────────────────────────────────────────────────────────────────┘

Command: terraform output -json
┌────────────────────────────────────────────────────────────────┐
│ $ terraform output -json                                       │
│                                                                │
│ Displays all outputs as JSON (useful for scripting)           │
│                                                                │
│ Output:                                                        │
│ {                                                              │
│   "resource_group_id": {                                      │
│     "value": "/subscriptions/.../resourceGroups/my-rg",      │
│     "type": "string"                                          │
│   },                                                           │
│   "storage_account_name": {                                   │
│     "value": "mysa123",                                       │
│     "type": "string"                                          │
│   }                                                            │
│ }                                                              │
└────────────────────────────────────────────────────────────────┘

Command: terraform output <output_name>
┌────────────────────────────────────────────────────────────────┐
│ $ terraform output resource_group_id                          │
│                                                                │
│ Returns single output value (useful for bash scripts)         │
│                                                                │
│ Output:                                                        │
│ /subscriptions/.../resourceGroups/my-rg                       │
└────────────────────────────────────────────────────────────────┘


OUTPUTS IN SCRIPTING:
═════════════════════════════════════════════════════════════════════════════

Bash Script Example:
┌────────────────────────────────────────────────────────────────┐
│ #!/bin/bash                                                    │
│                                                                │
│ # Get outputs from terraform                                 │
│ RG_ID=$(terraform output -raw resource_group_id)             │
│ SA_NAME=$(terraform output -raw storage_account_name)        │
│                                                                │
│ # Use in other commands                                      │
│ az network vnet create \                                      │
│   --resource-group $RG_ID \                                   │
│   --name my-vnet                                              │
│                                                                │
│ az storage container create \                                 │
│   --account-name $SA_NAME \                                   │
│   --name data                                                 │
│                                                                │
│ echo "Storage account: $SA_NAME"                              │
│ echo "Resource group ID: $RG_ID"                              │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. PROVIDER INTERACTION WITH AZURE

### Complete Provider Interaction Flow:

```
PROVIDER CONFIGURATION & AUTHENTICATION:
═════════════════════════════════════════════════════════════════════════════

File: provider.tf
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│ terraform {                                                     │
│   required_providers {                                          │
│     azurerm = {                                                 │
│       source  = "hashicorp/azurerm"  ← Registry location        │
│       version = "~> 3.0"             ← Version constraints      │
│     }                                                            │
│   }                                                              │
│ }                                                                │
│                                                                  │
│ provider "azurerm" {                                            │
│   features {}                                                   │
│                                                                  │
│   # Authentication method (one of these):                      │
│   # 1. Azure CLI (default if az login is run)                 │
│   # 2. Environment variables:                                 │
│   #    ARM_CLIENT_ID                                           │
│   #    ARM_CLIENT_SECRET                                       │
│   #    ARM_TENANT_ID                                           │
│   #    ARM_SUBSCRIPTION_ID                                     │
│   # 3. Managed Identity (in Azure VMs, App Service, etc)     │
│   # 4. Interactive browser login                              │
│ }                                                                │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘


AUTHENTICATION FLOW:
═════════════════════════════════════════════════════════════════════════════

$ terraform init / plan / apply
        │
        ▼
┌────────────────────────────────────┐
│ Provider Plugin Loads              │
│ (from .terraform/providers/)       │
└─────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ Authentication Attempt (in order)                              │
│ ──────────────────────────────────────────────────────────────│
│                                                                │
│ 1. Check Environment Variables:                               │
│    ├─ ARM_CLIENT_ID?                                          │
│    ├─ ARM_CLIENT_SECRET?                                      │
│    ├─ ARM_TENANT_ID?                                          │
│    └─ ARM_SUBSCRIPTION_ID?                                    │
│       │                                                        │
│       ├─ If all set: Use Service Principal                   │
│       └─ If not found: Continue...                           │
│                                                                │
│ 2. Check Managed Identity:                                    │
│    └─ Running on Azure VM/App Service/etc?                   │
│       ├─ If yes: Use Managed Identity token                  │
│       └─ If not: Continue...                                 │
│                                                                │
│ 3. Check Azure CLI:                                           │
│    └─ Is `az login` already done?                            │
│       ├─ If yes: Use Azure CLI token                         │
│       └─ If not: Continue...                                 │
│                                                                │
│ 4. Interactive Browser Login:                                │
│    └─ Open browser for manual Azure login                    │
│       └─ Cache token locally                                 │
│                                                                │
└────────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────┐
│ Authentication Successful          │
│ Provider Ready                     │
└─────────────────────────────────────┘
        │
        ▼
        Ready to call Azure APIs


RESOURCE CREATION FLOW:
═════════════════════════════════════════════════════════════════════════════

Terraform Code:
┌──────────────────────────────────────────────────────────────┐
│ resource "azurerm_resource_group" "rg" {                    │
│   name     = "my-rg"                                        │
│   location = "East US"                                      │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
                        │
                        ▼
                ┌──────────────────────────────┐
                │ terraform apply              │
                └──────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Parse and Evaluate Configuration                │
        │ ─────────────────────────────────────────────── │
        │ • Provider: azurerm                             │
        │ • Resource type: azure_resource_group           │
        │ • Resource name: rg                             │
        │ • Properties:                                   │
        │   - name = "my-rg"                              │
        │   - location = "East US"                        │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Call Azure Provider Plugin                       │
        │ ─────────────────────────────────────────────── │
        │ Function: azurerm_resource_group_create()       │
        │ Parameters:                                      │
        │   {                                              │
        │     name: "my-rg",                               │
        │     location: "East US",                         │
        │     subscription_id: "xxx",                      │
        │     auth_token: "xxx"                            │
        │   }                                              │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Azure Provider Makes REST API Call               │
        │ ─────────────────────────────────────────────── │
        │ PUT /subscriptions/{subscriptionId}/             │
        │     resourceGroups/my-rg                         │
        │ {                                                │
        │   "location": "eastus"                           │
        │ }                                                │
        │                                                  │
        │ Headers:                                         │
        │   Authorization: Bearer <auth_token>             │
        │   Content-Type: application/json                 │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Azure Processes Request                          │
        │ ─────────────────────────────────────────────── │
        │ • Authenticates request                         │
        │ • Validates parameters                          │
        │ • Checks subscription limits/quotas             │
        │ • Creates resource in Azure                     │
        │ • Returns resource details                      │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Azure REST API Response (200 OK)                 │
        │ ─────────────────────────────────────────────── │
        │ {                                                │
        │   "id": "/subscriptions/xxx/resourceGroups/...  │
        │   "name": "my-rg",                               │
        │   "location": "eastus",                          │
        │   "properties": {                                │
        │     "provisioningState": "Succeeded"             │
        │   },                                             │
        │   "type": "Microsoft.Resources/resourceGroups"   │
        │ }                                                │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Provider Plugin Returns to Terraform             │
        │ ─────────────────────────────────────────────── │
        │ {                                                │
        │   id: "/subscriptions/.../resourceGroups/my-rg" │
        │   name: "my-rg"                                  │
        │   location: "eastus"                             │
        │   created: true                                  │
        │ }                                                │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
        ┌───────────────────────────────────────────────────┐
        │ Terraform Updates State File                     │
        │ ─────────────────────────────────────────────── │
        │ terraform.tfstate:                               │
        │ {                                                │
        │   "resources": [                                 │
        │     {                                            │
        │       "type": "azurerm_resource_group",         │
        │       "name": "rg",                              │
        │       "instances": [{                            │
        │         "attributes": {                          │
        │           "id": "/subscriptions/.../my-rg",    │
        │           "name": "my-rg",                       │
        │           "location": "eastus"                   │
        │         }                                        │
        │       }]                                         │
        │     }                                            │
        │   ]                                              │
        │ }                                                │
        └───────────────────────────────────────────────────┘
                        │
                        ▼
                ✓ Resource Created Successfully
                Output to console:
                "azurerm_resource_group.rg: Creation complete after 2s"


MULTIPLE RESOURCE CREATION:
═════════════════════════════════════════════════════════════════════════════

When you apply multiple resources:

main.tf:
┌────────────────────────────────────┐
│ resource "azurerm_resource_group"  │
│   {...}                            │
│                                    │
│ resource "azurerm_storage_account" │
│   {...}                            │
│                                    │
│ resource "azurerm_key_vault"       │
│   {...}                            │
└────────────────────────────────────┘
        │
        ▼
Terraform identifies 3 resources to create
        │
        ├─ Check dependency graph
        │  ├─ storage_account depends on resource_group
        │  └─ key_vault depends on resource_group
        │
        ▼
Create with parallelization:
┌─────────────────────────────────────────────────────┐
│ Step 1: Create resource_group (no dependencies)    │
│         └─ Call Azure API                          │
│            └─ Wait for response                    │
│                                                    │
│ Step 2: Create storage_account (depends on RG)     │
│         └─ Wait for RG ID from Step 1              │
│            └─ Call Azure API with RG ID            │
│               └─ Wait for response                 │
│                                                    │
│ Step 3: Create key_vault (depends on RG)           │
│         └─ Can run parallel with Step 2            │
│            └─ Uses RG ID from Step 1               │
│               └─ Call Azure API                    │
│                  └─ Wait for response              │
└─────────────────────────────────────────────────────┘
        │
        ▼
Update terraform.tfstate with all resources
        │
        ▼
✓ Apply Complete!
  Resources: 3 added


ERROR HANDLING:
═════════════════════════════════════════════════════════════════════════════

If Azure API returns an error:

Azure API Error (400 Bad Request):
┌──────────────────────────────────────────────────┐
│ {                                                │
│   "error": {                                     │
│     "code": "InvalidResourceGroup",             │
│     "message": "Resource group already exists"  │
│   }                                              │
│ }                                                │
└──────────────────────────────────────────────────┘
        │
        ▼
Provider reports to Terraform:
        │
        ▼
Terraform displays error:
        │
        ▼
┌──────────────────────────────────────────────────┐
│ Error: creating resource group:                 │
│                                                  │
│ InvalidResourceGroup: Resource group already    │
│ exists                                           │
│                                                  │
│ on main.tf line 1, in resource "azurerm...":    │
│   1: resource "azurerm_resource_group" "rg" {   │
│                                                  │
│ Apply failed!                                    │
│ terraform.tfstate is NOT updated                │
└──────────────────────────────────────────────────┘
        │
        ▼
No state file changes (partially created resources
need to be cleaned up or fixed)
```

---

## COMPLETE END-TO-END EXAMPLE

### Full Scenario from Start to Finish:

```
SCENARIO: Creating a storage account for a web app
═════════════════════════════════════════════════════════════════════════════

INITIAL STATE: Fresh project, no Azure resources

Step 1: CREATE FILES
────────────────────

provider.tf:
┌──────────────────────────────────────────────────────────┐
│ terraform {                                              │
│   required_providers {                                   │
│     azurerm = {                                          │
│       source  = "hashicorp/azurerm"                     │
│       version = "~> 3.0"                                │
│     }                                                    │
│   }                                                      │
│ }                                                        │
│                                                          │
│ provider "azurerm" {                                     │
│   features {}                                           │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

variable.tf:
┌──────────────────────────────────────────────────────────┐
│ variable "environment" {                                 │
│   type        = string                                  │
│   description = "Environment name"                      │
│   default     = "dev"                                   │
│ }                                                        │
│                                                          │
│ variable "location" {                                   │
│   type        = string                                  │
│   description = "Azure region"                          │
│   default     = "East US"                               │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

terraform.tfvars:
┌──────────────────────────────────────────────────────────┐
│ environment = "production"                               │
│ location    = "West US"                                  │
└──────────────────────────────────────────────────────────┘

main.tf:
┌──────────────────────────────────────────────────────────┐
│ resource "azurerm_resource_group" "app_rg" {           │
│   name     = "rg-${var.environment}-app"               │
│   location = var.location                               │
│ }                                                        │
│                                                          │
│ resource "azurerm_storage_account" "app_storage" {     │
│   name                     = "stg${var.environment}app" │
│   resource_group_name      = azurerm_resource_group.rg │
│                              .name                      │
│   location                 = azurerm_resource_group.rg │
│                              .location                  │
│   account_tier             = "Standard"                │
│   account_replication_type = "LRS"                     │
│ }                                                        │
└──────────────────────────────────────────────────────────┘

outputs.tf:
┌──────────────────────────────────────────────────────────┐
│ output "storage_account_id" {                            │
│   value = azurerm_storage_account.app_storage.id       │
│ }                                                        │
│                                                          │
│ output "storage_account_name" {                         │
│   value = azurerm_storage_account.app_storage.name     │
│ }                                                        │
└──────────────────────────────────────────────────────────┘


Step 2: RUN terraform init
──────────────────────────

$ terraform init

Processing:
  1. Reads provider.tf → Finds "azurerm" provider requirement
  2. Downloads azurerm v3.x.x provider plugin
  3. Stores in: .terraform/providers/registry.terraform.io/hashicorp/azurerm/
  4. Creates .terraform.lock.hcl (records exact version)
  5. Initializes local backend (creates terraform.tfstate placeholder)

Output:
┌──────────────────────────────────────────────────────────┐
│ Initializing the backend...                              │
│ Initializing provider plugins...                         │
│ - Finding latest version of hashicorp/azurerm...        │
│ - Installing hashicorp/azurerm v3.86.0...              │
│ - Installed hashicorp/azurerm v3.86.0 (self-signed)    │
│                                                          │
│ Terraform has been successfully configured!             │
│                                                          │
│ You may now begin working with Terraform.               │
└──────────────────────────────────────────────────────────┘

Result:
  ✓ .terraform/ directory created
  ✓ .terraform.lock.hcl created
  ✓ terraform.tfstate created (empty)


Step 3: RUN terraform plan
──────────────────────────

$ terraform plan

Processing:
  1. Reads all *.tf files
  2. Loads terraform.tfvars → environment="production", location="West US"
  3. Validates variable types and values
  4. Evaluates variable references:
     - var.environment    → "production"
     - var.location       → "West US"
  5. Reads terraform.tfstate (empty - no prior state)
  6. Constructs resource names:
     - azurerm_resource_group name = "rg-production-app"
     - azurerm_storage_account name = "stgproductionapp"
  7. Authenticates to Azure (via Azure CLI token)
  8. Queries Azure: "Do these resources already exist?"
     - Azure response: No
  9. Builds execution plan:
     - Create resource group
     - Create storage account

Output:
┌────────────────────────────────────────────────────────────┐
│ Terraform will perform the following actions:             │
│                                                            │
│ # azurerm_resource_group.app_rg will be created         │
│   + resource "azurerm_resource_group" "app_rg" {        │
│       + id       = (known after apply)                   │
│       + location = "westus"                              │
│       + name     = "rg-production-app"                   │
│       + tags     = (known after apply)                   │
│     }                                                     │
│                                                            │
│ # azurerm_storage_account.app_storage will be created    │
│   + resource "azurerm_storage_account" "app_storage" {  │
│       + id                             = (known after...)│
│       + location                       = "westus"        │
│       + name                           = "stgproductio.."│
│       + account_tier                   = "Standard"      │
│       + account_replication_type       = "LRS"           │
│     }                                                     │
│                                                            │
│ Plan: 2 to add, 0 to change, 0 to destroy.              │
└────────────────────────────────────────────────────────────┘

Result:
  ✓ Plan generated (no resources created yet)
  ✓ terraform.tfstate unchanged
  ✓ Waiting for approval


Step 4: RUN terraform apply
────────────────────────────

$ terraform apply

Processing:
  1. Recomputes plan (same as terraform plan output above)
  2. Shows plan and asks: "Do you want to proceed?"
  3. User enters: yes
  4. For each resource in plan:

     a) Create Resource Group:
        - Calls: Azure API PUT /subscriptions/.../resourceGroups/rg-production-app
        - Azure returns:
          {
            "id": "/subscriptions/12345/resourceGroups/rg-production-app",
            "name": "rg-production-app",
            "location": "westus",
            ...
          }
        - Updates terraform.tfstate with resource group details

     b) Create Storage Account:
        - Calls: Azure API to create storage account
        - Azure returns:
          {
            "id": "/subscriptions/.../storageAccounts/stgproductionapp",
            "name": "stgproductionapp",
            "location": "westus",
            "primary_blob_endpoint": "https://stgproductionapp.blob.core.windows.net/",
            ...
          }
        - Updates terraform.tfstate with storage account details

  5. Evaluates outputs:
     - storage_account_id = "/subscriptions/.../storageAccounts/stgproductionapp"
     - storage_account_name = "stgproductionapp"

  6. Saves terraform.tfstate.backup (previous state)
  7. Writes updated terraform.tfstate

Output:
┌────────────────────────────────────────────────────────────┐
│ Apply complete! Resources: 2 added, 0 changed, 0 destroyed │
│                                                             │
│ Outputs:                                                   │
│                                                             │
│ storage_account_id = "/subscriptions/12345/...            │
│                       storageAccounts/stgproductionapp"   │
│ storage_account_name = "stgproductionapp"                 │
└────────────────────────────────────────────────────────────┘

Result:
  ✓ Resource group created in Azure
  ✓ Storage account created in Azure
  ✓ terraform.tfstate updated with resource details
  ✓ Outputs computed and displayed


terraform.tfstate after apply:
┌────────────────────────────────────────────────────────────┐
│ {                                                          │
│   "version": 4,                                            │
│   "serial": 1,                                             │
│   "lineage": "abc123...",                                  │
│   "outputs": {                                             │
│     "storage_account_id": {                                │
│       "value": "/subscriptions/12345/resourceGroups/...", │
│       "type": "string"                                    │
│     },                                                     │
│     "storage_account_name": {                              │
│       "value": "stgproductionapp",                        │
│       "type": "string"                                    │
│     }                                                      │
│   },                                                       │
│   "resources": [                                           │
│     {                                                      │
│       "type": "azurerm_resource_group",                   │
│       "name": "app_rg",                                    │
│       "instances": [{                                      │
│         "attributes": {                                    │
│           "id": "/subscriptions/.../rg-production-app",  │
│           "name": "rg-production-app",                    │
│           "location": "westus"                            │
│         }                                                  │
│       }]                                                   │
│     },                                                     │
│     {                                                      │
│       "type": "azurerm_storage_account",                  │
│       "name": "app_storage",                              │
│       "instances": [{                                      │
│         "attributes": {                                    │
│           "id": "/subscriptions/.../storageAccounts/...", │
│           "name": "stgproductionapp",                     │
│           "location": "westus",                           │
│           "primary_blob_endpoint": "https://..."          │
│         }                                                  │
│       }]                                                   │
│     }                                                      │
│   ]                                                        │
│ }                                                          │
└────────────────────────────────────────────────────────────┘


Step 5: NOW WHAT? Verify and Manage
──────────────────────────────────────

View state:
  $ terraform state list
  Output:
    azurerm_resource_group.app_rg
    azurerm_storage_account.app_storage

Get specific resource details:
  $ terraform state show azurerm_storage_account.app_storage
  Output:
    resource "azurerm_storage_account" "app_storage" {
      id                       = "/subscriptions/.../stgproductionapp"
      name                     = "stgproductionapp"
      location                 = "westus"
      account_tier             = "Standard"
      account_replication_type = "LRS"
      ...
    }

Get outputs:
  $ terraform output
  Output:
    storage_account_id = "/subscriptions/.../stgproductionapp"
    storage_account_name = "stgproductionapp"

Get single output:
  $ terraform output -raw storage_account_name
  Output:
    stgproductionapp


Step 6: MODIFY INFRASTRUCTURE
──────────────────────────────

Edit terraform.tfvars:
  location = "East US"  ← Changed from "West US"

Run plan to see changes:
  $ terraform plan

  Output:
    # azurerm_resource_group.app_rg will be updated in-place
      ~ resource "azurerm_resource_group" "app_rg" {
        ~ location = "westus" -> "eastus"
          name     = "rg-production-app"
        }

    # azurerm_storage_account.app_storage will be updated in-place
      ~ resource "azurerm_storage_account" "app_storage" {
        ~ location = "westus" -> "eastus"
          name     = "stgproductionapp"
        }

    Plan: 0 to add, 2 to change, 0 to destroy.

Apply changes:
  $ terraform apply

  ✓ Both resources updated to East US location
  ✓ terraform.tfstate updated
  ✓ terraform.tfstate.backup saved


Step 7: DESTROY INFRASTRUCTURE
────────────────────────────────

When no longer needed:
  $ terraform destroy

  Terraform will ask for confirmation, then:
  1. Delete storage account from Azure
  2. Delete resource group from Azure
  3. Remove all resources from terraform.tfstate
  4. Update terraform.tfstate.backup

  ✓ Infrastructure destroyed
  ✓ terraform.tfstate shows no resources
```

---

## QUICK REFERENCE SUMMARY

### Essential Commands:

```
INITIALIZATION & BASIC OPERATIONS:
──────────────────────────────────────────────────────────────────
terraform init                    Initialize working directory
terraform fmt                     Format HCL files
terraform validate                Validate configuration syntax


PLANNING & APPLYING:
──────────────────────────────────────────────────────────────────
terraform plan                    Show what will change
terraform plan -out=file          Save plan to file
terraform apply                   Apply plan (interactive)
terraform apply -auto-approve     Apply without confirmation
terraform apply planfile          Apply saved plan


STATE MANAGEMENT:
──────────────────────────────────────────────────────────────────
terraform state list              List all resources in state
terraform state show <resource>   Show resource details
terraform state pull              Download remote state
terraform state push              Upload to remote state
terraform state rm <resource>     Remove resource from state
terraform import <type>.<name>    Import existing resource
  <azure-resource-id>


OUTPUTS & INSPECTION:
──────────────────────────────────────────────────────────────────
terraform output                  Show all outputs
terraform output <name>           Show specific output
terraform output -json            Show outputs as JSON
terraform show                    Show state file contents


CLEANUP & DEBUGGING:
──────────────────────────────────────────────────────────────────
terraform destroy                 Delete all infrastructure
terraform destroy -auto-approve   Destroy without confirmation
terraform refresh                 Update state from Azure
terraform console                 Interactive console (REPL)
terraform graph                   Create dependency graph


ADDITIONAL FLAGS:
──────────────────────────────────────────────────────────────────
-var 'key=value'                  Set variable value
-var-file=file.tfvars             Load variables from file
-target=resource                  Apply to specific resource
-lock=false                        Don't acquire state lock
-compact-warnings                 Minimal warning output
```

### Common Terraform Files:

```
ALWAYS CREATE:
──────────────────────────────────────────────────────────────────
provider.tf                       Provider configuration
main.tf                           Resource definitions
variable.tf                       Variable declarations


CONDITIONALLY CREATE:
──────────────────────────────────────────────────────────────────
terraform.tfvars                  Variable values
outputs.tf                        Output definitions
locals.tf                         Local values
data.tf                           Data sources
modules/                          Reusable modules


NEVER CREATE (Auto-generated):
──────────────────────────────────────────────────────────────────
.terraform/                       Provider plugins (ignore in git)
terraform.tfstate                 State file (ignore in git)
terraform.tfstate.backup          State backup (ignore in git)
.terraform.lock.hcl               Lock file (COMMIT THIS!)
```

### Git Best Practices:

```
.gitignore MUST include:
──────────────────────────────────────────────────────────────────
.terraform/                 ← Provider plugins (machine-specific)
*.tfstate                   ← State files (sensitive data)
*.tfstate.*                 ← State backups
.terraform.lock.hcl.*       ← Lock backups
crash.log                   ← Crash logs
override.tf                 ← Local overrides
*.auto.tfvars               ← Auto-loaded variable files

MUST COMMIT:
──────────────────────────────────────────────────────────────────
*.tf files                  ← Configuration
.terraform.lock.hcl         ← Ensures reproducible versions
terraform.tfvars            ← Non-sensitive default values
*.md documentation files
```

---

## FINAL ARCHITECTURE DIAGRAM

```
COMPLETE TERRAFORM SYSTEM:
═════════════════════════════════════════════════════════════════════════════

                              ┌─────────────────────────────────────┐
                              │   USER & COMMANDS                   │
                              │   $ terraform init/plan/apply       │
                              └────────────────┬────────────────────┘
                                               │
                ┌──────────────────────────────┼──────────────────────────────┐
                │                              │                              │
                ▼                              ▼                              ▼
        ┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
        │ Configuration    │        │ Variables        │        │ State File       │
        │ Files            │        │ Files            │        │ (Current State)  │
        │ ─────────────    │        │ ─────────────    │        │ ─────────────    │
        │ • provider.tf    │        │ • variable.tf    │        │ • .tfstate       │
        │ • main.tf        │        │ • .tfvars        │        │ • .tfstate.backup│
        │ • outputs.tf     │        │ • .tfvars.local  │        │                  │
        │ • data.tf        │        │                  │        │ Resource IDs &   │
        │ • locals.tf      │        │ Input Values     │        │ Properties       │
        └────────┬─────────┘        └────────┬─────────┘        └────────┬─────────┘
                 │                           │                           │
                 │  Parse HCL                │  Load & Validate         │  Compare
                 │  Identify Resources       │  Substitute References   │  State
                 │  Determine Order          │  Evaluate Expressions    │  vs Config
                 │                           │                           │
                 └─────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                        ┌────────────────────────────────────┐
                        │  TERRAFORM CORE                    │
                        │  ────────────────────────────────  │
                        │  1. Parse configuration            │
                        │  2. Load variables                 │
                        │  3. Build dependency graph         │
                        │  4. Validate configuration         │
                        │  5. Create execution plan          │
                        │  6. Execute changes (apply)        │
                        │  7. Update state file              │
                        └────────────┬───────────────────────┘
                                     │
                                     ▼
                    ┌────────────────────────────────────────────┐
                    │ PROVIDER PLUGINS                           │
                    │ ────────────────────────────────────────── │
                    │ azurerm Provider                           │
                    │ └─ Downloaded during init                  │
                    │ └─ Located in: .terraform/providers/       │
                    │ └─ Executable: terraform-provider-azurerm  │
                    │ └─ Translates HCL to Azure API calls      │
                    └────────────┬───────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────────┐
                    │ AUTHENTICATION                             │
                    │ ────────────────────────────────────────── │
                    │ 1. Check environment variables             │
                    │ 2. Check Managed Identity                  │
                    │ 3. Check Azure CLI token                   │
                    │ 4. Fallback to browser login               │
                    │                                             │
                    │ Result: Auth Token to Azure                │
                    └────────────┬───────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────────────┐
                    │ AZURE REST API CALLS                           │
                    │ ────────────────────────────────────────────── │
                    │ PUT /subscriptions/{id}/resourceGroups/...    │
                    │ PUT /subscriptions/{id}/storageAccounts/...  │
                    │ DELETE /subscriptions/{id}/resources/...      │
                    │ GET /subscriptions/{id}/providers/...         │
                    │                                                │
                    │ Headers:                                      │
                    │   Authorization: Bearer <token>               │
                    │   Content-Type: application/json              │
                    └────────────┬───────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────┐
                    │ AZURE CLOUD PLATFORM                   │
                    │ ────────────────────────────────────── │
                    │ • Authenticate request                 │
                    │ • Validate parameters                  │
                    │ • Check quotas and limits              │
                    │ • Create/Update/Delete resources       │
                    │ • Return resource details              │
                    │   (IDs, properties, status)            │
                    └────────────┬────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────┐
                    │ REAL INFRASTRUCTURE                    │
                    │ ────────────────────────────────────── │
                    │ • Resource Groups                      │
                    │ • Storage Accounts                     │
                    │ • Virtual Networks                     │
                    │ • Virtual Machines                     │
                    │ • Databases                            │
                    │ • ... (any Azure resource)             │
                    └────────────┬────────────────────────────┘
                                 │
                                 ▼ (Azure sends back resource details)
                    ┌────────────────────────────────────────┐
                    │ RESPONSE BACK TO TERRAFORM             │
                    │ ────────────────────────────────────── │
                    │ 200 OK                                 │
                    │ {                                      │
                    │   "id": "resource_id",                │
                    │   "name": "resource_name",            │
                    │   "properties": {...}                 │
                    │ }                                      │
                    └────────────┬────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────┐
                    │ TERRAFORM PROCESSES RESPONSE           │
                    │ ────────────────────────────────────── │
                    │ 1. Extract resource details            │
                    │ 2. Map to resource attributes          │
                    │ 3. Update terraform.tfstate            │
                    │ 4. Mark resource as managed            │
                    │ 5. Display outputs                     │
                    └────────────┬────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────┐
                    │ STATE FILE UPDATED                     │
                    │ ────────────────────────────────────── │
                    │ terraform.tfstate now contains:        │
                    │ • Resource IDs                         │
                    │ • Current properties                   │
                    │ • Resource metadata                    │
                    │ • Output values                        │
                    │                                         │
                    │ terraform.tfstate.backup saved         │
                    └────────────┬────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────────────────────┐
                    │ OUTPUT TO USER                         │
                    │ ────────────────────────────────────── │
                    │ Apply complete!                        │
                    │ Resources: X added, Y changed, Z...    │
                    │                                         │
                    │ Outputs:                               │
                    │   output_name = "output_value"         │
                    └────────────────────────────────────────┘
```

---

## KEY TAKEAWAYS

1. **terraform init**: Downloads providers, creates .terraform/, initializes state backend
2. **terraform plan**: Shows what will change without making any changes
3. **terraform apply**: Executes the plan and updates state file
4. **Variables**: Declared in variable.tf, values provided via .tfvars or CLI
5. **State File**: Bridge between your code and actual Azure resources - NEVER commit!
6. **Outputs**: Computed values displayed after apply, stored in state file
7. **Provider**: Translates HCL to Azure REST API calls
8. **Authentication**: Handled automatically via Azure CLI, env vars, or Managed Identity
9. **Dependencies**: Terraform automatically determines order based on resource references
10. **Idempotency**: Safe to run terraform apply multiple times - only changes what's different

