import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { watchAccessibility } from './a11y'

// Each staff area is its own app, like the original EAZyfoods portals. The first part of the path says which one.
const AREA = window.location.pathname.split('/')[1]
const apps = { vendor: () => import('./vendor/App.jsx') }

const load = apps[AREA]
watchAccessibility()
if (load) {
  load().then(({ default: App }) => {
    ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
  })
} else {
  document.getElementById('root').textContent = 'Unknown area'
}
