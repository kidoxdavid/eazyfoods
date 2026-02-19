import React, { useState } from 'react'
import {
  ShoppingBag,
  Store,
  ChefHat,
  Truck,
  ArrowRight,
  Briefcase,
  Mail,
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
    color: 'from-primary-500 to-primary-700',
    bgLight: 'bg-primary-500/10',
    iconColor: 'text-primary-500',
  },
  {
    key: 'vendor',
    title: 'Vendor',
    description: 'Manage your store, products, and orders.',
    icon: Store,
    color: 'from-blue-500 to-blue-700',
    bgLight: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
  },
  {
    key: 'chef',
    title: 'Chef',
    description: 'Create and manage meal kits and recipes.',
    icon: ChefHat,
    color: 'from-amber-500 to-amber-700',
    bgLight: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Accept and fulfill delivery assignments.',
    icon: Truck,
    color: 'from-emerald-500 to-emerald-700',
    bgLight: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
  },
]

export default function App() {
  const [careersOpen, setCareersOpen] = useState(false)

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 sticky top-0 z-50 bg-gray-900/95 backdrop-blur">
        <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <span className="text-xl font-bold text-primary-500">eazyfoods</span>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#portals" className="text-gray-400 hover:text-white transition-colors">Portals</a>
            <a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a>
            <button
              type="button"
              onClick={() => setCareersOpen(!careersOpen)}
              className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <Briefcase className="w-4 h-4" />
              Careers
            </button>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            eazyfoods Portals
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl">
            Sign in to the portal that matches your role. Shop on the main site at eazyfoods.ca.
          </p>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <h2 className="text-lg font-semibold text-gray-300 mb-6">Choose your portal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {portals.map(({ key, title, description, icon: Icon, bgLight, iconColor }) => (
              <a
                key={key}
                href={getPortalUrl(key)}
                target="_blank"
                rel="noopener noreferrer"
                className="group block rounded-xl border border-gray-700 bg-gray-800/50 p-5 sm:p-6 hover:border-gray-600 hover:bg-gray-800 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900"
              >
                <div className={`inline-flex p-2.5 rounded-lg ${bgLight} mb-3`}>
                  <Icon className={`w-7 h-7 ${iconColor}`} strokeWidth={1.5} />
                </div>
                <h3 className="text-base font-semibold text-white mb-1.5 group-hover:text-primary-400 transition-colors">
                  {title}
                </h3>
                <p className="text-gray-400 text-sm mb-3">
                  {description}
                </p>
                <span className="inline-flex items-center gap-1 text-primary-500 text-sm font-medium group-hover:gap-2 transition-all">
                  Go to portal
                  <ArrowRight className="w-4 h-4" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-3">About</h2>
          <p className="text-gray-400 text-sm max-w-2xl">
            eazyfoods connects customers with authentic African groceries, local markets, and chefs. 
            Vendors and chefs manage their businesses through dedicated portals; drivers deliver through the delivery portal.
          </p>
        </div>
      </section>

      {/* Careers */}
      <section className="border-t border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-500" />
            Careers
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl mb-4">
            Join us in bringing African flavors to your community. We’re always looking for driven people in operations, delivery, and support.
          </p>
          {careersOpen && (
            <div className="mt-4 p-4 rounded-lg bg-gray-800/80 border border-gray-700 text-sm text-gray-300 space-y-2">
              <p>Open roles and applications are managed per portal:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Drivers: sign up via the <a href={getPortalUrl('delivery')} target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400">Delivery portal</a> (eazydrive).</li>
                <li>Vendors &amp; chefs: apply through the main site or contact us.</li>
              </ul>
              <p className="pt-2">For other opportunities, email <a href="mailto:careers@eazyfoods.ca" className="text-primary-500 hover:text-primary-400">careers@eazyfoods.ca</a>.</p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCareersOpen(!careersOpen)}
            className="mt-2 text-sm font-medium text-primary-500 hover:text-primary-400"
          >
            {careersOpen ? 'Hide details' : 'View careers info'}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} eazyfoods. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <Mail className="w-4 h-4" />
                <a href="mailto:support@eazyfoods.ca" className="hover:text-gray-400">support@eazyfoods.ca</a>
              </span>
              <a href="https://eazyfoods.ca" target="_blank" rel="noopener noreferrer" className="text-primary-500 hover:text-primary-400">
                Main site
              </a>
            </div>
          </div>
          <p className="text-gray-600 text-xs mt-4 text-center sm:text-left">
            Your trusted source for authentic African groceries
          </p>
        </div>
      </footer>
    </div>
  )
}
