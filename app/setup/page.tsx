import { Section } from '../components/section';
import { CodeBlock } from '../components/code-block';
import { CommandBlock } from '../components/command-block';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SetupPage(): React.ReactElement {
  return (
    <div className="max-w-5xl mx-auto px-8 py-12">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">Setup & Prerequisites</h1>
      <p className="text-lg text-gray-600 mb-8">
        Get your development environment ready for Terraform and Azure. This guide covers installation and configuration for Windows, macOS, and Linux.
      </p>

      <Section title="Prerequisites">
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">What you'll need:</p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• An Azure account (free tier available)</li>
                <li>• A terminal/command prompt</li>
                <li>• Basic command line knowledge</li>
                <li>• A text editor (VS Code recommended)</li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Step 1: Create Azure Account">
        <p className="mb-4">
          If you don't have an Azure account yet, you can create a free one at{' '}
          <a href="https://azure.microsoft.com/free/" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            azure.microsoft.com/free
          </a>. 
          The free tier includes $200 credit for 30 days and 12 months of popular services.
        </p>
        <div className="bg-green-50 border-l-4 border-green-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              After signing up, you'll have access to the Azure Portal where you can manage all your resources.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Step 2: Install Azure CLI">
        <p className="mb-4">
          The Azure CLI is a command-line tool for managing Azure resources. It's essential for authentication with Terraform.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">macOS</h3>
        <p className="mb-2">Using Homebrew (recommended):</p>
        <CommandBlock command="brew update && brew install azure-cli" />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Windows</h3>
        <p className="mb-2">Using Windows Package Manager:</p>
        <CommandBlock command="winget install -e --id Microsoft.AzureCLI" />
        <p className="text-sm text-gray-600 mt-2">
          Or download the MSI installer from the{' '}
          <a href="https://aka.ms/installazurecliwindows" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            official site
          </a>
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Linux</h3>
        <p className="mb-2">For Ubuntu/Debian:</p>
        <CommandBlock command="curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash" />

        <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Verify Installation</h3>
        <CommandBlock command="az --version" description="Check Azure CLI is installed correctly" />
      </Section>

      <Section title="Step 3: Install Terraform">
        <p className="mb-4">
          Terraform is the Infrastructure as Code tool we'll use to define and deploy Azure resources.
        </p>

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">macOS</h3>
        <CommandBlock command="brew tap hashicorp/tap" />
        <CommandBlock command="brew install hashicorp/tap/terraform" />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Windows</h3>
        <p className="mb-2">Using Chocolatey:</p>
        <CommandBlock command="choco install terraform" />
        <p className="text-sm text-gray-600 mt-2">
          Or using Windows Package Manager:
        </p>
        <CommandBlock command="winget install HashiCorp.Terraform" />

        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Linux</h3>
        <CommandBlock command="wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg" />
        <CommandBlock command='echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list' />
        <CommandBlock command="sudo apt update && sudo apt install terraform" />

        <h3 className="text-xl font-semibold text-gray-900 mt-8 mb-3">Verify Installation</h3>
        <CommandBlock command="terraform --version" description="Should show Terraform version (1.x or higher)" />
      </Section>

      <Section title="Step 4: Login to Azure">
        <p className="mb-4">
          Authenticate the Azure CLI with your Azure account. This will open a browser window for login.
        </p>
        <CommandBlock command="az login" />
        <p className="mt-4 mb-4">
          After successful login, you'll see a list of your Azure subscriptions. If you have multiple subscriptions, set the one you want to use:
        </p>
        <CommandBlock command="az account list --output table" description="List all subscriptions" />
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Create a New Subscription (Optional)</h3>
        <p className="mb-4">
          If you need to create a new subscription, you can do so through the Azure Portal or using Azure CLI. Note that creating subscriptions typically requires appropriate permissions in your Azure account.
        </p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Subscription Creation:</p>
              <p className="text-sm text-blue-800">
                Most users will have a default subscription when they create an Azure account. If you need a new subscription, 
                you typically need to create it through the <a href="https://portal.azure.com" className="underline" target="_blank" rel="noopener noreferrer">Azure Portal</a> 
                or contact your Azure administrator. Free tier accounts usually come with one subscription.
              </p>
            </div>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Get Your Subscription ID</h3>
        <p className="mb-4">
          You'll need your subscription ID for Terraform configuration. Here are several ways to get it:
        </p>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Method 1: List all subscriptions (table format)</h4>
            <CommandBlock command="az account list --output table" description="Shows subscription name, ID, and state in a table" />
            <p className="text-sm text-gray-600 mt-2">
              Look for the <code>SubscriptionId</code> column in the output.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Method 2: Get current subscription ID only</h4>
            <CommandBlock command="az account show --query id --output tsv" description="Returns just the subscription ID of the current active subscription" />
            <p className="text-sm text-gray-600 mt-2">
              This returns only the subscription ID without quotes, perfect for copying.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Method 3: Get subscription ID by name</h4>
            <CommandBlock command="az account show --subscription 'Your Subscription Name' --query id --output tsv" description="Get subscription ID for a specific subscription by name" />
            <p className="text-sm text-gray-600 mt-2">
              Replace <code>'Your Subscription Name'</code> with your actual subscription name.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Method 4: Get subscription details (JSON format)</h4>
            <CommandBlock command="az account show --output json" description="Shows detailed subscription information in JSON format" />
            <p className="text-sm text-gray-600 mt-2">
              Look for the <code>"id"</code> field in the JSON output. This is your subscription ID.
            </p>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Set Active Subscription</h3>
        <p className="mb-4">
          If you have multiple subscriptions, set the one you want to use for Terraform:
        </p>
        <CommandBlock command="az account set --subscription 'YOUR_SUBSCRIPTION_ID'" description="Set active subscription using subscription ID" />
        <p className="text-sm text-gray-600 mt-2 mb-4">
          You can also use the subscription name instead of ID:
        </p>
        <CommandBlock command="az account set --subscription 'Your Subscription Name'" description="Set active subscription using subscription name" />
        <CommandBlock command="az account show" description="Verify current subscription details" />
        
        <div className="bg-green-50 border-l-4 border-green-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">
              <strong>Tip:</strong> Save your subscription ID in a safe place. You'll need it for Terraform configuration and service principal creation.
            </p>
          </div>
        </div>
      </Section>

      <Section title="Step 5: Create a Service Principal (Optional but Recommended)">
        <p className="mb-4">
          For production environments, it's best practice to use a Service Principal instead of your personal account. This provides better security and control.
        </p>
        <CommandBlock command="az ad sp create-for-rbac --name 'terraform-sp' --role Contributor --scopes /subscriptions/YOUR_SUBSCRIPTION_ID" />
        <p className="mt-4 mb-2">This will output credentials like:</p>
        <CodeBlock
          language="json"
          code={`{
  "appId": "00000000-0000-0000-0000-000000000000",
  "displayName": "terraform-sp",
  "password": "your-password-here",
  "tenant": "00000000-0000-0000-0000-000000000000"
}`}
        />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 my-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Save these credentials securely! You won't be able to retrieve the password again.
            </p>
          </div>
        </div>
        <p className="mt-4">Set these as environment variables:</p>
        <CodeBlock
          language="bash"
          code={`export ARM_CLIENT_ID="appId"
export ARM_CLIENT_SECRET="password"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="tenant"`}
        />
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Understanding ARM Authentication Variables</h3>
        <p className="mb-4">
          These environment variables are used by Terraform's Azure provider (azurerm) to authenticate with Azure. Here's what each variable means and how to retrieve them:
        </p>
        
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">ARM_CLIENT_ID (Application ID)</h4>
            <p className="text-sm text-gray-700 mb-3">
              <strong>What it is:</strong> The unique identifier (Application ID) of your Service Principal or Azure AD application. 
              This is the "appId" from the service principal creation output.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>How to get it:</strong>
            </p>
            <CommandBlock command="az ad sp list --display-name 'terraform-sp' --query '[].appId' --output tsv" description="Get client ID by service principal name" />
            <CommandBlock command="az ad sp show --id YOUR_APP_ID --query appId --output tsv" description="Get client ID by application ID" />
            <p className="text-sm text-gray-600 mt-2">
              Or use the <code>appId</code> value from the service principal creation output.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">ARM_CLIENT_SECRET (Password/Secret)</h4>
            <p className="text-sm text-gray-700 mb-3">
              <strong>What it is:</strong> The secret password for your Service Principal. This is the authentication key that proves 
              the identity of your application. This is the "password" from the service principal creation output.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Important:</strong> This secret is only shown once when you create the service principal. If you lose it, 
              you must create a new secret.
            </p>
            <div className="bg-red-50 border-l-4 border-red-500 p-3 my-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-800">
                  <strong>Security Warning:</strong> Never commit this secret to version control. Store it securely using environment 
                  variables, Azure Key Vault, or a secrets management tool.
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-2">
              <strong>If you lost the secret:</strong> You need to create a new one:
            </p>
            <CommandBlock command="az ad sp credential reset --name 'terraform-sp' --query password --output tsv" description="Reset and get a new client secret for existing service principal" />
            <p className="text-sm text-gray-600 mt-2">
              This will generate a new secret and invalidate the old one.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">ARM_SUBSCRIPTION_ID</h4>
            <p className="text-sm text-gray-700 mb-3">
              <strong>What it is:</strong> The unique identifier of your Azure subscription. This tells Terraform which Azure 
              subscription to create resources in. All resources are billed to this subscription.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>How to get it:</strong>
            </p>
            <CommandBlock command="az account show --query id --output tsv" description="Get current subscription ID" />
            <CommandBlock command="az account list --query '[].{Name:name, SubscriptionId:id}' --output table" description="List all subscriptions with IDs" />
            <CommandBlock command="az account show --subscription 'Your Subscription Name' --query id --output tsv" description="Get subscription ID by name" />
            <p className="text-sm text-gray-600 mt-2">
              This is the same subscription ID you used when creating the service principal.
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">ARM_TENANT_ID (Directory ID)</h4>
            <p className="text-sm text-gray-700 mb-3">
              <strong>What it is:</strong> The unique identifier of your Azure Active Directory (Azure AD) tenant. This is the 
              directory that contains your Azure subscription and user accounts. The "tenant" value from the service principal creation output.
            </p>
            <p className="text-sm text-gray-700 mb-2">
              <strong>How to get it:</strong>
            </p>
            <CommandBlock command="az account show --query tenantId --output tsv" description="Get tenant ID of current subscription" />
            <CommandBlock command="az account tenant list --query '[].{TenantId:tenantId, CountryCode:countryCode}' --output table" description="List all tenants" />
            <CommandBlock command="az ad signed-in-user show --query 'userPrincipalName' -o tsv | cut -d'@' -f2 | xargs -I {} az ad tenant show --tenant {} --query id -o tsv" description="Get tenant ID from signed-in user" />
            <p className="text-sm text-gray-600 mt-2">
              Most users have a single tenant. The tenant ID is typically the same across all your subscriptions.
            </p>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">View All Current ARM Variables</h3>
        <p className="mb-4">
          To check what values are currently set in your environment:
        </p>
        <CommandBlock command='echo "ARM_CLIENT_ID: $ARM_CLIENT_ID"' description="Display ARM_CLIENT_ID (if set)" />
        <CommandBlock command='echo "ARM_SUBSCRIPTION_ID: $ARM_SUBSCRIPTION_ID"' description="Display ARM_SUBSCRIPTION_ID (if set)" />
        <CommandBlock command='echo "ARM_TENANT_ID: $ARM_TENANT_ID"' description="Display ARM_TENANT_ID (if set)" />
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-3 my-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> ARM_CLIENT_SECRET should never be displayed or logged for security reasons.
            </p>
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">Verify Service Principal Information</h3>
        <p className="mb-4">
          To view details about your service principal:
        </p>
        <CommandBlock command="az ad sp list --display-name 'terraform-sp' --query '[].{AppId:appId, DisplayName:displayName, ObjectId:id}' --output table" description="List service principal details" />
        <CommandBlock command="az ad sp show --id YOUR_APP_ID --query '{AppId:appId, DisplayName:displayName, ObjectId:id}' --output json" description="Show detailed service principal information" />
        <p className="text-sm text-gray-600 mt-2">
          Replace <code>YOUR_APP_ID</code> with your actual Application ID (ARM_CLIENT_ID).
        </p>
      </Section>

      <Section title="Step 6: Install VS Code Extensions (Recommended)">
        <p className="mb-4">
          If you're using VS Code, these extensions will make your life easier:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700 ml-4">
          <li><strong>HashiCorp Terraform</strong> - Syntax highlighting, IntelliSense, and more</li>
          <li><strong>Azure Terraform</strong> - Azure-specific Terraform support</li>
          <li><strong>Azure Account</strong> - Manage Azure resources from VS Code</li>
        </ul>
        <CommandBlock command="code --install-extension hashicorp.terraform" />
      </Section>

      <Section title="Verify Your Setup">
        <p className="mb-4">
          Let's make sure everything is working correctly:
        </p>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <code className="text-sm">az --version</code>
              <p className="text-sm text-gray-600 mt-1">Azure CLI is installed</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <code className="text-sm">terraform --version</code>
              <p className="text-sm text-gray-600 mt-1">Terraform is installed</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <code className="text-sm">az account show</code>
              <p className="text-sm text-gray-600 mt-1">You're logged into Azure</p>
            </div>
          </div>
        </div>
      </Section>

      <div className="mt-12 flex justify-between items-center border-t pt-8">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
        <Link href="/basics" className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors">
          Next: Terraform Basics →
        </Link>
      </div>
    </div>
  );
}




