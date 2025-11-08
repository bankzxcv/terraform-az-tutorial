import Link from 'next/link';
import { ArrowRight, Cloud, Code, Zap, Shield } from 'lucide-react';

export default function HomePage(): React.ReactElement {
  return (
    <div className="max-w-6xl mx-auto px-8 py-12">
      {/* Hero Section */}
      <div className="text-center mb-16">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          Learn Terraform with Azure
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A comprehensive, hands-on tutorial to master Infrastructure as Code using Terraform and Microsoft Azure.
          From zero to deploying production-ready infrastructure.
        </p>
      </div>

      {/* Features */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Cloud className="w-10 h-10 text-blue-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Cloud Native</h3>
          <p className="text-sm text-gray-600">Learn modern cloud infrastructure with Azure services</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Code className="w-10 h-10 text-green-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Hands-On Code</h3>
          <p className="text-sm text-gray-600">Real-world examples with complete, working code</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Zap className="w-10 h-10 text-yellow-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Progressive Learning</h3>
          <p className="text-sm text-gray-600">From basics to advanced topics, step by step</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <Shield className="w-10 h-10 text-purple-500 mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Best Practices</h3>
          <p className="text-sm text-gray-600">Industry standards and production-ready patterns</p>
        </div>
      </div>

      {/* Tutorial Path */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Tutorial Path</h2>
        
        <div className="space-y-6">
          <TutorialCard
            number="01"
            title="Setup & Prerequisites"
            description="Install Azure CLI, Terraform, and configure your development environment"
            href="/setup"
            color="blue"
          />
          
          <TutorialCard
            number="02"
            title="Terraform Basics"
            description="Learn HCL syntax, providers, resources, variables, and core concepts"
            href="/basics"
            color="green"
          />
          
          <TutorialCard
            number="03"
            title="Simple Resources"
            description="Deploy your first Azure resources: Resource Groups and Storage Accounts"
            href="/storage"
            color="purple"
          />
          
          <TutorialCard
            number="04"
            title="Azure Functions"
            description="Create and deploy serverless functions with automated deployment scripts"
            href="/functions"
            color="orange"
          />
          
          <TutorialCard
            number="05"
            title="Advanced Networking"
            description="Build complex network architectures with VNets, Subnets, and NSGs"
            href="/networking"
            color="red"
          />
          
          <TutorialCard
            number="06"
            title="Terraform Modules"
            description="Create reusable, composable infrastructure modules"
            href="/modules"
            color="indigo"
          />

          <TutorialCard
            number="07"
            title="Express.js API"
            description="Serverless Express.js REST API on Azure Functions with health monitoring"
            href="/api"
            color="teal"
          />

          <TutorialCard
            number="08"
            title="Deploy Next.js"
            description="Deploy Next.js applications to Azure App Service with zero configuration"
            href="/nextjs"
            color="pink"
          />
        </div>
      </div>

      {/* CTA */}
      <div className="text-center mt-16">
        <Link
          href="/setup"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors text-lg"
        >
          Get Started
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>
    </div>
  );
}

interface TutorialCardProps {
  number: string;
  title: string;
  description: string;
  href: string;
  color: string;
}

function TutorialCard({ number, title, description, href, color }: TutorialCardProps): React.ReactElement {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-300',
    green: 'bg-green-100 text-green-600 border-green-300',
    purple: 'bg-purple-100 text-purple-600 border-purple-300',
    orange: 'bg-orange-100 text-orange-600 border-orange-300',
    red: 'bg-red-100 text-red-600 border-red-300',
    indigo: 'bg-indigo-100 text-indigo-600 border-indigo-300',
    teal: 'bg-teal-100 text-teal-600 border-teal-300',
    pink: 'bg-pink-100 text-pink-600 border-pink-300',
  }[color];

  return (
    <Link
      href={href}
      className="flex items-start gap-6 p-6 rounded-lg border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group"
    >
      <div className={`flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center font-bold text-2xl ${colorClasses}`}>
        {number}
      </div>
      <div className="flex-1">
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600">{description}</p>
      </div>
      <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
