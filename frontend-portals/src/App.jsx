import React from 'react'
import {
  ShoppingBag,
  Store,
  ChefHat,
  Shield,
  Truck,
  Megaphone,
  ArrowRight,
} from 'lucide-react'

const defaultPorts = {
  customer: 3003,
  vendor: 3000,
  chef: 3006,
  admin: 3002,
  delivery: 3004,
  marketing: 3005,
}

// Live portal URLs when deployed (e.g. portals.eazyfoods.ca). Override via VITE_PORTAL_*_URL in Vercel.
const defaultProductionUrls = {
  customer: 'https://eazyfoods.vercel.app',
  vendor: 'https://eazyfoods-vendor.vercel.app',
  chef: 'https://eazyfoods-chef.vercel.app',
  admin: 'https://eazyfoods-admin.vercel.app',
  delivery: 'https://eazyfoods-delivery.vercel.app',
  marketing: 'https://eazyfoods-marketing.vercel.app',
}

function getPortalUrl(key) {
  const base = import.meta.env[`VITE_PORTAL_${key.toUpperCase()}_URL`]
  if (base && typeof base === 'string' && base.trim()) return base.trim()
  const isDev = import.meta.env.DEV || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (isDev) {
    const port = defaultPorts[key]
    return port ? `http://localhost:${port}` : '#'
  }
  return defaultProductionUrls[key] || '#'
}

const portals = [
  {
    key: 'customer',
    title: 'Customer',
    description: 'Browse groceries, place orders, and track deliveries.',
    icon: ShoppingBag,
    color: 'from-primary-500 to-primary-700',
    bgLight: 'bg-primary-500/10',
    iconColor: 'text-primary-600',
  },
  {
    key: 'vendor',
    title: 'Vendor',
    description: 'Manage your store, products, and orders.',
    icon: Store,
    color: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-500/10',
    iconColor: 'text-blue-600',
  },
  {
    key: 'chef',
    title: 'Chef',
    description: 'Create and manage meal kits and recipes.',
    icon: ChefHat,
    color: 'from-amber-500 to-amber-700',
    bgLight: 'bg-amber-500/10',
    iconColor: 'text-amber-600',
  },
  {
    key: 'admin',
    title: 'Admin',
    description: 'Platform settings, users, and reporting.',
    icon: Shield,
    color: 'from-slate-600 to-slate-800',
    bgLight: 'bg-slate-500/10',
    iconColor: 'text-slate-600',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Accept and fulfill delivery assignments.',
    icon: Truck,
    color: 'from-emerald-500 to-emerald-700',
    bgLight: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
  },
  {
    key: 'marketing',
    title: 'Marketing',
    description: 'Campaigns, promos, and analytics.',
    icon: Megaphone,
    color: 'from-violet-500 to-violet-700',
    bgLight: 'bg-violet-500/10',
    iconColor: 'text-violet-600',
  },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-2xl font-bold text-primary-500">eazyfoods</h1>
          <p className="text-gray-400 mt-1 text-sm">
            Choose your portal
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Welcome to eazyfoods
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Select the portal that matches your role to get started.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {portals.map(({ key, title, description, icon: Icon, color, bgLight, iconColor }) => (
            <a
              key={key}
              href={getPortalUrl(key)}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-xl border border-gray-700 bg-gray-800/50 p-6 hover:border-gray-600 hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
            >
              <div className={`inline-flex p-3 rounded-lg ${bgLight} mb-4`}>
                <Icon className={`w-8 h-8 ${iconColor}`} strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-primary-400 transition-colors">
                {title}
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                {description}
              </p>
              <span className="inline-flex items-center gap-1 text-primary-500 text-sm font-medium group-hover:gap-2 transition-all">
                Go to portal
                <ArrowRight className="w-4 h-4" />
              </span>
            </a>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} eazyfoods. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Your trusted source for authentic African groceries
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
