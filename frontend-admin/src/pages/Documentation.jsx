import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { FileText, Store, Truck, ChefHat, Save, ExternalLink } from 'lucide-react'

const DOC_DEFAULTS = {
  require_vendor_docs: true,
  require_driver_docs: true,
  require_chef_docs: true
}

const Documentation = () => {
  const [settings, setSettings] = useState({ ...DOC_DEFAULTS })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  useEffect(() => {
    api.get('/admin/settings/documentation')
      .then((r) => {
        const s = r.data?.settings || {}
        setSettings({
          require_vendor_docs: typeof s.require_vendor_docs === 'boolean' ? s.require_vendor_docs : true,
          require_driver_docs: typeof s.require_driver_docs === 'boolean' ? s.require_driver_docs : true,
          require_chef_docs: typeof s.require_chef_docs === 'boolean' ? s.require_chef_docs : true
        })
      })
      .catch(() => setSettings({ ...DOC_DEFAULTS }))
      .finally(() => setLoading(false))
  }, [])

  const updateToggle = (key, value) => {
    const next = { ...settings, [key]: value }
    setSettings(next)
    setSaving(true)
    setMessage(null)
    api.put('/admin/settings/documentation', { settings: next })
      .then(() => {
        setMessage('Saved. Signup pages will use the new requirement.')
        setTimeout(() => setMessage(null), 3000)
      })
      .catch(() => setMessage('Failed to save.'))
      .finally(() => setSaving(false))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
      </div>
    )
  }

  const panes = [
    {
      key: 'vendor',
      title: 'Vendor',
      icon: Store,
      requireKey: 'require_vendor_docs',
      docs: 'Government ID, Business Registration, Tax Permit',
      viewHref: '/vendors',
      viewLabel: 'View vendors'
    },
    {
      key: 'driver',
      title: 'Driver',
      icon: Truck,
      requireKey: 'require_driver_docs',
      docs: 'Driver licence, Vehicle registration, Insurance',
      viewHref: '/drivers',
      viewLabel: 'View drivers'
    },
    {
      key: 'chef',
      title: 'Chef',
      icon: ChefHat,
      requireKey: 'require_chef_docs',
      docs: 'Government ID, Chef Certification, Business Permit',
      viewHref: '/chefs',
      viewLabel: 'View chefs'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentation</h1>
          <p className="text-sm text-gray-500">Require or waive document upload for vendor, driver, and chef signup (e.g. for testing).</p>
        </div>
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-sm ${message.startsWith('Saved') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {panes.map((pane) => {
          const Icon = pane.icon
          const required = settings[pane.requireKey]
          return (
            <div
              key={pane.key}
              className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <Icon className="h-6 w-6 text-primary-600" />
                <h2 className="text-lg font-semibold text-gray-900">{pane.title}</h2>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-gray-600">{pane.docs}</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Require documents for signup</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={required}
                    onClick={() => updateToggle(pane.requireKey, !required)}
                    disabled={saving}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 ${
                      required ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        required ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <Link
                  to={pane.viewHref}
                  className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  <ExternalLink className="h-4 w-4" />
                  {pane.viewLabel}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Documentation
