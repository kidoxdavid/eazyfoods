import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { watchAccessibility } from './a11y'

// Each staff area is its own app, like the original EAZyfoods portals. The first part of the path says which one.
const AREA = window.location.pathname.split('/')[1]
const apps = { vendor: () => import('./vendor/App.jsx'), chef: () => import('./chef/App.jsx'), driver: () => import('./driver/App.jsx'), marketing: () => import('./marketing/App.jsx'), admin: () => import('./admin/App.jsx') }

/** The vendor window serves two portals: stores get the vendor portal, kitchens (home chefs and restaurants) get the chef portal. */
async function pick() {
  if (AREA !== 'vendor' || /^\/vendor\/(signin|signup)/.test(window.location.pathname)) return apps[AREA]
  try {
    const r = await fetch('/api/vendor/app-kind', { credentials: 'include', headers: { 'x-area': 'vendor' } })
    if (r.ok && (await r.json()).kitchen) return apps.chef
  } catch { /* fall back to the vendor portal */ }
  return apps.vendor
}

;(async () => {
  const load = AREA in apps ? await pick() : null
  watchAccessibility()
  if (load) {
    load().then(({ default: App }) => {
      ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
    })
  } else {
    document.getElementById('root').textContent = 'Unknown area'
  }
})()
