import { ArrowRight, Briefcase, ChefHat, Heart, Mail, MapPin, ShieldCheck, ShoppingBag, Sparkles, Store, Truck, Megaphone } from 'lucide-react'

/**
 * One front door for every portal. Each card goes to that portal's own sign-in window (each window has its own sign-in, so signing in to one never signs you out of another).
 */
const PORTALS = [
  { name: 'Customer', desc: 'Shop groceries, place orders, track delivery.', href: '/', icon: ShoppingBag, tone: 'text-green-400 bg-green-500/10' },
  { name: 'Vendor', desc: 'Manage your store, products, and orders.', href: '/vendor/signin', icon: Store, tone: 'text-blue-400 bg-blue-500/10' },
  { name: 'Chef', desc: 'Run your kitchen: dishes, portions, and meal orders.', href: '/vendor/signin', icon: ChefHat, tone: 'text-amber-400 bg-amber-500/10' },
  { name: 'Delivery', desc: 'Accept and fulfill delivery assignments.', href: '/driver/signin', icon: Truck, tone: 'text-emerald-400 bg-emerald-500/10' },
]
const STAFF = [
  { name: 'Marketing', desc: 'Campaigns, email, offers and the storefront.', href: '/marketing/signin', icon: Megaphone, tone: 'text-fuchsia-400 bg-fuchsia-500/10' },
  { name: 'Admin', desc: 'Operations, marketplace, finance and settings.', href: '/admin/signin', icon: ShieldCheck, tone: 'text-sky-400 bg-sky-500/10' },
]

function Card({ p }) {
  const Icon = p.icon
  return (
    <a href={p.href} className="group block rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 hover:border-green-400/50 hover:bg-white/[0.06] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400">
      <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${p.tone}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
      <h3 className="mt-4 text-xl font-semibold text-white">{p.name}</h3>
      <p className="mt-1 text-sm text-gray-300">{p.desc}</p>
      <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-green-300 group-hover:gap-3 transition-all">Go to portal <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
    </a>
  )
}

export default function Hub() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#05080f] via-[#0a1019] to-[#05080f] text-gray-100">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-[#05080f]/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between gap-4 overflow-x-auto">
          <a href="#top" className="text-xl font-bold text-green-400 whitespace-nowrap">eazyfoods</a>
          <nav aria-label="Sections" className="flex items-center gap-4 sm:gap-6 text-sm text-gray-300 whitespace-nowrap">
            <a className="hover:text-white" href="#portals">Portals</a><a className="hover:text-white" href="#about">About</a>
            <a className="hover:text-white inline-flex items-center gap-1.5" href="#careers"><Briefcase className="h-4 w-4" aria-hidden="true" />Careers</a>
            <a className="hover:text-white inline-flex items-center gap-1.5" href="#contact"><Mail className="h-4 w-4" aria-hidden="true" />Contact</a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] text-green-300"><Sparkles className="h-4 w-4" aria-hidden="true" />WELCOME</p>
          <h1 className="mt-3 text-3xl sm:text-5xl font-bold text-white">Sign in to your portal</h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-gray-300">Shop on the main site. Vendors, chefs and drivers use the links below to open their dashboard. Each portal has its own sign-in, so you can stay signed in to several at once.</p>
        </section>

        <section id="portals" aria-labelledby="portals-h" className="border-t border-white/10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
            <h2 id="portals-h" className="text-sm font-semibold tracking-[0.15em] text-gray-300">CHOOSE YOUR PORTAL</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{PORTALS.map((p) => <Card key={p.name} p={p} />)}</div>
            <h2 className="mt-10 text-sm font-semibold tracking-[0.15em] text-gray-300">EAZYFOODS TEAM</h2>
            <p className="mt-1 text-sm text-gray-400">For staff accounts only. A shopper, vendor or driver account will not open these.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">{STAFF.map((p) => <Card key={p.name} p={p} />)}</div>
          </div>
        </section>

        <section id="about" aria-labelledby="about-h" className="border-t border-white/10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
            <h2 id="about-h" className="text-sm font-semibold tracking-[0.15em] text-gray-300">ABOUT</h2>
            <p className="mt-3 max-w-3xl text-lg text-gray-200">eazyfoods connects customers with authentic African groceries, local markets and home chefs. Vendors and chefs run their businesses through dedicated portals; drivers deliver through the delivery portal.</p>
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-gray-400"><MapPin className="h-4 w-4" aria-hidden="true" />Proudly serving Calgary, Alberta</p>
          </div>
        </section>

        <section id="careers" aria-labelledby="careers-h" className="border-t border-white/10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
            <h2 id="careers-h" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-gray-300"><Briefcase className="h-4 w-4 text-green-400" aria-hidden="true" />CAREERS</h2>
            <p className="mt-3 max-w-3xl text-lg text-gray-200">We are a small team building something meaningful. Check back for open roles in operations, engineering and community.</p>
            <p className="mt-3 text-sm text-gray-400">In the meantime, have questions? Reach out at <a className="text-green-300 underline" href="mailto:support@eazyfoods.ca">support@eazyfoods.ca</a></p>
          </div>
        </section>

        <section id="contact" aria-labelledby="contact-h" className="border-t border-white/10">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
            <h2 id="contact-h" className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.15em] text-gray-300"><Mail className="h-4 w-4 text-green-400" aria-hidden="true" />CONTACT</h2>
            <p className="mt-3 text-gray-200">Questions about an order or your account? Email <a className="text-green-300 underline" href="mailto:support@eazyfoods.ca">support@eazyfoods.ca</a> or visit the <a className="text-green-300 underline" href="/help">help page</a>.</p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-6 text-center text-sm text-gray-400">
        <span className="inline-flex items-center gap-2"><Heart className="h-4 w-4 text-green-400" aria-hidden="true" />© {new Date().getFullYear()} eazyfoods. All rights reserved.</span>
      </footer>
    </div>
  )
}
