import React from 'react'
import {
  ShoppingBag,
  Store,
  ChefHat,
  Truck,
  ArrowRight,
  Mail,
  Sparkles,
  Briefcase,
  MapPin,
  Heart,
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
    gradient: 'from-primary-500/20 to-transparent',
  },
  {
    key: 'vendor',
    title: 'Vendor',
    description: 'Manage your store, products, and orders.',
    icon: Store,
    bgLight: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    gradient: 'from-blue-500/20 to-transparent',
  },
  {
    key: 'chef',
    title: 'Chef',
    description: 'Create and manage meal kits and recipes.',
    icon: ChefHat,
    bgLight: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    gradient: 'from-amber-500/20 to-transparent',
  },
  {
    key: 'delivery',
    title: 'Delivery',
    description: 'Accept and fulfill delivery assignments.',
    icon: Truck,
    bgLight: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    gradient: 'from-emerald-500/20 to-transparent',
  },
]

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Background accent */}
      <div className="fixed inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-emerald-500/5 pointer-events-none" aria-hidden="true" />
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(255,107,53,0.15),transparent)] pointer-events-none" aria-hidden="true" />

      {/* Header */}
      <header className="relative border-b border-gray-800/80 sticky top-0 z-50 bg-gray-950/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
            eazyfoods
          </span>
          <nav className="flex items-center gap-4 text-xs sm:text-sm">
            <a href="#portals" className="text-gray-400 hover:text-white transition-colors">Portals</a>
            <a href="#about" className="text-gray-400 hover:text-white transition-colors">About</a>
            <a href="#careers" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              Careers
            </a>
            <a href="#contact" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5">
              <Mail className="w-4 h-4" />
              Contact
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-gray-800/80">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <div className="flex items-center gap-1.5 text-primary-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-widest">Welcome</span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight max-w-2xl">
            Sign in to your portal
          </h1>
          <p className="text-gray-400 text-sm sm:text-base max-w-xl mt-2 leading-snug">
            Shop on the main site at eazyfoods.ca. Vendors, chefs, and drivers use the links below to access your dashboard.
          </p>
        </div>
      </section>

      {/* Portals */}
      <section id="portals" className="relative flex-1">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Choose your portal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {portals.map(({ key, title, description, icon: Icon, bgLight, iconColor, gradient }) => (
              <a
                key={key}
                href={getPortalUrl(key)}
                target="_blank"
                rel="noopener noreferrer"
                className={`group relative block rounded-xl border border-gray-700/60 bg-gray-800/40 p-4 hover:border-primary-500/40 hover:bg-gray-800/70 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2 focus:ring-offset-gray-950 overflow-hidden`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                <div className={`relative inline-flex p-2 rounded-lg ${bgLight} mb-3`}>
                  <Icon className={`w-5 h-5 ${iconColor}`} strokeWidth={1.5} />
                </div>
                <h3 className="relative text-base font-semibold text-white mb-1 group-hover:text-primary-300 transition-colors">
                  {title}
                </h3>
                <p className="relative text-gray-500 text-xs mb-3 leading-relaxed">
                  {description}
                </p>
                <span className="relative inline-flex items-center gap-1.5 text-primary-400 text-xs font-medium group-hover:gap-2 transition-all">
                  Go to portal
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="relative border-t border-gray-800/80">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</h2>
          <p className="text-gray-400 text-sm sm:text-base max-w-2xl leading-relaxed">
            eazyfoods connects customers with authentic African groceries, local markets, and chefs.
            Vendors and chefs run their businesses through dedicated portals; drivers deliver through the delivery portal.
          </p>
          <div className="flex items-center gap-1.5 mt-3 text-gray-500">
            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="text-xs">Proudly serving Canada</span>
          </div>
        </div>
      </section>

      {/* Careers */}
      <section id="careers" className="relative border-t border-gray-800/80 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Briefcase className="w-3.5 h-3.5 text-primary-500" />
            Careers
          </h2>
          <p className="text-gray-400 text-sm max-w-2xl leading-relaxed mb-2">
            We’re a small team building something meaningful. Check back for open roles in operations, engineering, and community.
          </p>
          <p className="text-xs text-gray-500">
            In the meantime, have questions? Reach out at{' '}
            <a href="mailto:support@eazyfoods.ca" className="text-primary-400 hover:text-primary-300 transition-colors">
              support@eazyfoods.ca
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-gray-800/80 mt-auto">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-gray-500 text-xs flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-primary-500/80" />
              © {new Date().getFullYear()} eazyfoods. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <a href="mailto:support@eazyfoods.ca" className="flex items-center gap-1.5 hover:text-gray-300 transition-colors">
                <Mail className="w-4 h-4" />
                support@eazyfoods.ca
              </a>
              <a href="https://eazyfoods.ca" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:text-primary-300 transition-colors">
                Main site
              </a>
            </div>
          </div>
          <p className="text-gray-600 text-[10px] mt-2 text-center sm:text-left">
            Your trusted source for authentic African groceries
          </p>
        </div>
      </footer>
    </div>
  )
}
