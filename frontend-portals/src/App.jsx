import React from 'react'
import {
  ShoppingBag,
  Store,
  ChefHat,
  Truck,
  ArrowRight,
  Briefcase,
  Mail,
  Sparkles,
} from 'lucide-react'

const defaultPorts = {
  customer: 3003,
  vendor: 3000,
  chef: 3006,
  delivery: 3004,
}

const defaultProductionUrls = {
  customer: 'https://eazyfoods.ca',
  vendor: 'https://vendor.eazyfoods.ca',
  chef: 'https://chef.eazyfoods.ca',
  delivery: 'https://delivery.eazyfoods.ca',
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
    description: 'Shop groceries, place orders, track delivery.',
    icon: ShoppingBag,
    bgLight: 'bg-primary-500/10',
    iconColor: 'text-primary-500',
  },
  {
    key: 'vendor',
    title: 'Vendor',
    description: 'Manage your store, products, and orders.',
    icon: Store,
    bgLight: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    key: 'chef',
    title: 'Chef',
    description: 'Create and manage meal kits and recipes.',
    icon: ChefHat,
    bgLight: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Accept and fulfill delivery assignments.',
    icon: Truck,
    bgLight: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header - compact */}
      <header className="border-b border-gray-800 sticky top-0 z-50 bg-gray-900/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-3 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-primary-500">eazyfoods</span>
          <nav className="flex items-center gap-4 text-sm">
            <a href="#portals" className="text-gray-400 hover:text-white transition-colors">Portals</a>
            <a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a>
            <a href="#careers" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Careers
            </a>
          </nav>
        </div>
      </header>

      {/* Hero - compact, with accent */}
      <section className="border-b border-gray-800 bg-gradient-to-b from-gray-900 to-gray-900/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
          <div className="flex items-center gap-2 text-primary-500/80 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Portals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            eazyfoods Portals
          </h1>
          <p className="text-gray-400 text-sm max-w-lg mt-1.5">
            Sign in to the portal that matches your role. Shop on the main site at eazyfoods.ca.
          </p>
        </div>
      </section>

      {/* Portals - compact grid */}
      <section id="portals" className="flex-1">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-6 sm:py-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Choose your portal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {portals.map(({ key, title, description, icon: Icon, bgLight, iconColor }) => (
              <a
                key={key}
                href={getPortalUrl(key)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-lg border border-gray-700/80 bg-gray-800/40 p-4 hover:border-primary-500/30 hover:bg-gray-800/60 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                <div className={`inline-flex p-2 rounded-md ${bgLight} mb-2`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-primary-400 transition-colors">
                  {title}
                </h3>
                <p className="text-gray-500 text-xs mb-2 leading-snug">
                  {description}
                </p>
                <span className="inline-flex items-center gap-1 text-primary-500 text-xs font-medium group-hover:gap-2 transition-all">
                  Go to portal
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About - compact */}
      <section id="about" className="border-t border-gray-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-5 sm:py-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h2>
          <p className="text-gray-400 text-sm max-w-xl leading-relaxed">
            eazyfoods connects customers with authentic African groceries, local markets, and chefs.
            Vendors and chefs run their businesses through dedicated portals; drivers deliver through the delivery portal.
          </p>
        </div>
      </section>

      {/* Careers - company roles, no open positions message */}
      <section id="careers" className="border-t border-gray-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-5 sm:py-6">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-primary-500" />
            Careers at eazyfoods
          </h2>
          <p className="text-gray-400 text-sm max-w-xl mb-3 leading-relaxed">
            We’re a small team. When we hire, we look for people in areas like data &amp; analytics, customer experience, and operations.
          </p>
          <div className="inline-flex items-center gap-2 rounded-lg bg-gray-800/60 border border-gray-700/80 px-4 py-3 text-sm text-gray-300">
            <span className="text-gray-500">There are no open roles at the moment.</span>
            <span>Check back later — we’d love to hear from you.</span>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Questions? <a href="mailto:careers@eazyfoods.ca" className="text-primary-500 hover:text-primary-400">careers@eazyfoods.ca</a>
          </p>
        </div>
      </section>

      {/* Footer - compact */}
      <footer className="border-t border-gray-800/80 mt-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-5 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} eazyfoods. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="mailto:support@eazyfoods.ca" className="flex items-center gap-1.5 hover:text-gray-400 transition-colors">
                <Mail className="w-3.5 h-3.5" />
                support@eazyfoods.ca
              </a>
              <a href="https://eazyfoods.ca" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400">
                Main site
              </a>
            </div>
          </div>
          <p className="text-gray-600 text-[11px] mt-3 text-center sm:text-left">
            Your trusted source for authentic African groceries
          </p>
        </div>
      </footer>
    </div>
  )
}
