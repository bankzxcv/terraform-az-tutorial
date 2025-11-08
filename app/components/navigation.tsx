'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, Package, Cloud, Network, Box, Server, Layers } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/setup', label: 'Setup & Prerequisites', icon: Settings },
  { href: '/basics', label: 'Terraform Basics', icon: Package },
  { href: '/storage', label: 'Simple Resources', icon: Cloud },
  { href: '/functions', label: 'Azure Functions', icon: Cloud },
  { href: '/networking', label: 'Advanced Networking', icon: Network },
  { href: '/modules', label: 'Terraform Modules', icon: Box },
  { href: '/api', label: 'Express.js API', icon: Server },
  { href: '/nextjs', label: 'Deploy Next.js', icon: Layers },
];

export function Navigation(): React.ReactElement {
  const pathname = usePathname();

  return (
    <nav className="w-64 bg-gray-900 text-gray-100 min-h-screen p-6 border-r border-gray-800">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-blue-400">
          Terraform + Azure
        </h1>
        <p className="text-sm text-gray-400 mt-1">Interactive Tutorial</p>
      </div>

      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}




