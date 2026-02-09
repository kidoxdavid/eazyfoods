import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Users, Mail, UserPlus, Target, ArrowLeft } from 'lucide-react'
import CustomerSegmentTab from '../components/CustomerSegmentTab'

const TABS = [
  { id: 'customer', label: 'Customer', icon: Users },
  { id: 'contacts', label: 'Contacts', icon: Mail },
  { id: 'leads', label: 'Leads', icon: UserPlus },
]

const PlaceholderTab = ({ title, description }) => (
  <div className="bg-white rounded-lg shadow border border-gray-200 p-12 text-center">
    <div className="inline-flex p-4 bg-gray-100 rounded-full mb-4">
      <Target className="h-10 w-10 text-gray-400" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2">{title} segments</h3>
    <p className="text-gray-600 max-w-md mx-auto">{description}</p>
    <p className="text-sm text-gray-500 mt-4">Coming soon</p>
  </div>
)

const Segments = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') || 'customer'
  const currentTabId = TABS.some(t => t.id === tabParam) ? tabParam : 'customer'
  const currentTab = TABS.find(t => t.id === currentTabId) || TABS[0]

  const setTab = (id) => {
    setSearchParams(id === 'customer' ? {} : { tab: id })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            to="/audiences"
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Audiences
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1" aria-label="Segment types">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = currentTabId === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab content */}
      {currentTab.id === 'customer' ? (
        <CustomerSegmentTab />
      ) : currentTab.id === 'contacts' ? (
        <PlaceholderTab
          title="Contacts"
          description="Segment your email contacts by engagement, list, or custom fields for targeted campaigns."
        />
      ) : currentTab.id === 'leads' ? (
        <PlaceholderTab
          title="Leads"
          description="Create lead segments by source, score, or lifecycle stage for sales and nurturing."
        />
      ) : null}
    </div>
  )
}

export default Segments
