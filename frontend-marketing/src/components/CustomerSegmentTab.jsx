import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'
import {
  Users,
  Plus,
  Trash2,
  Save,
  RefreshCw
} from 'lucide-react'

const PROPERTY_OPTIONS = [
  { value: 'city', label: 'City', type: 'text', group: 'Demographics' },
  { value: 'state', label: 'State/Province', type: 'text', group: 'Demographics' },
  { value: 'country', label: 'Country', type: 'text', group: 'Demographics' },
  { value: 'total_orders', label: 'Total orders', type: 'number', group: 'Behavior' },
  { value: 'total_spent', label: 'Total spent ($)', type: 'number', group: 'Behavior' },
  { value: 'last_order_days', label: 'Ordered in last N days', type: 'number', group: 'Behavior' },
  { value: 'has_orders', label: 'Has placed orders', type: 'boolean', group: 'Behavior' },
  { value: 'signup_days', label: 'Signed up within N days', type: 'number', group: 'Signup' },
]

const OPERATORS_BY_TYPE = {
  text: [
    { value: 'equals', label: 'equals' },
    { value: 'contains', label: 'contains' },
    { value: 'not_equals', label: 'does not equal' },
  ],
  number: [
    { value: 'equals', label: 'equals' },
    { value: 'gte', label: 'is at least' },
    { value: 'lte', label: 'is at most' },
    { value: 'greater_than', label: 'is greater than' },
    { value: 'less_than', label: 'is less than' },
  ],
  boolean: [
    { value: 'equals', label: 'is' },
  ],
}

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

const CustomerSegmentTab = () => {
  const navigate = useNavigate()
  const [matchMode, setMatchMode] = useState('all')
  const [rules, setRules] = useState([
    { id: crypto.randomUUID(), property: '', operator: '', value: '' }
  ])
  const [previewCount, setPreviewCount] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const [audienceName, setAudienceName] = useState('')
  const [audienceDescription, setAudienceDescription] = useState('')

  const criteria = {
    match: matchMode,
    rules: rules
      .filter(r => r.property && r.operator)
      .map(({ property, operator, value }) => ({
        property,
        operator,
        value: value === '' || value === null || value === undefined
          ? (getPropertyType(property) === 'boolean' ? 'true' : '')
          : String(value)
      }))
      .filter(r => {
        const t = getPropertyType(r.property)
        if (t === 'boolean') return true
        return r.value !== ''
      })
  }

  const debouncedCriteria = useDebounce(JSON.stringify(criteria), 500)

  function getPropertyType(prop) {
    return PROPERTY_OPTIONS.find(p => p.value === prop)?.type || 'text'
  }

  const fetchPreview = useCallback(async () => {
    setPreviewLoading(true)
    try {
      const res = await api.post('/admin/marketing/audiences/preview', {
        criteria: JSON.parse(debouncedCriteria)
      })
      setPreviewCount(res.data?.size ?? 0)
    } catch (err) {
      console.error('Preview failed:', err)
      setPreviewCount(null)
    } finally {
      setPreviewLoading(false)
    }
  }, [debouncedCriteria])

  useEffect(() => {
    if (!debouncedCriteria) return
    const c = JSON.parse(debouncedCriteria)
    if (c.rules?.length === 0) {
      setPreviewCount(null)
      return
    }
    fetchPreview()
  }, [debouncedCriteria, fetchPreview])

  const addRule = () => {
    setRules(r => [...r, { id: crypto.randomUUID(), property: '', operator: '', value: '' }])
  }

  const removeRule = (id) => {
    setRules(r => r.length > 1 ? r.filter(x => x.id !== id) : r)
  }

  const updateRule = (id, field, val) => {
    setRules(r => r.map(x => {
      if (x.id !== id) return x
      const next = { ...x, [field]: val }
      if (field === 'property') {
        next.operator = ''
        next.value = ''
      }
      return next
    }))
  }

  const operators = (prop) => {
    const t = getPropertyType(prop)
    return OPERATORS_BY_TYPE[t] || OPERATORS_BY_TYPE.text
  }

  const handleSaveAsAudience = async (e) => {
    e.preventDefault()
    if (!audienceName.trim()) return
    setSaveLoading(true)
    try {
      await api.post('/admin/marketing/audiences', {
        name: audienceName.trim(),
        description: audienceDescription.trim() || undefined,
        criteria
      })
      setSaveModalOpen(false)
      setAudienceName('')
      setAudienceDescription('')
      navigate('/audiences')
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.detail || err.message))
    } finally {
      setSaveLoading(false)
    }
  }

  const canSave = criteria.rules.length > 0

  return (
    <>
      <p className="text-gray-600 mb-6">
        Build custom customer segments using rules. Add multiple criteria and choose whether customers must match all rules or any rule.
      </p>

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Match</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              type="button"
              onClick={() => setMatchMode('all')}
              className={`px-4 py-2 text-sm font-medium ${
                matchMode === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              All rules
            </button>
            <button
              type="button"
              onClick={() => setMatchMode('any')}
              className={`px-4 py-2 text-sm font-medium border-l border-gray-300 ${
                matchMode === 'any'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Any rule
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {rules.map((rule, idx) => (
            <div
              key={rule.id}
              className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
            >
              {idx > 0 && (
                <span className="w-full text-xs font-medium text-gray-500 uppercase sm:w-auto">
                  {matchMode === 'all' ? 'AND' : 'OR'}
                </span>
              )}
              <select
                value={rule.property}
                onChange={(e) => updateRule(rule.id, 'property', e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[180px]"
              >
                <option value="">Select property</option>
                {PROPERTY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label} ({p.group})
                  </option>
                ))}
              </select>

              {rule.property && (
                <>
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(rule.id, 'operator', e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]"
                  >
                    <option value="">Select operator</option>
                    {operators(rule.property).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>

                  {getPropertyType(rule.property) === 'boolean' ? (
                    <select
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[120px]"
                    >
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  ) : (
                    <input
                      type={getPropertyType(rule.property) === 'number' ? 'number' : 'text'}
                      value={rule.value}
                      onChange={(e) => updateRule(rule.id, 'value', e.target.value)}
                      placeholder={
                        rule.property === 'total_spent' ? 'e.g. 100' :
                        rule.property === 'total_orders' ? 'e.g. 2' :
                        rule.property === 'last_order_days' || rule.property === 'signup_days' ? 'e.g. 30' :
                        'Enter value'
                      }
                      min={getPropertyType(rule.property) === 'number' ? 0 : undefined}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500 min-w-[140px]"
                    />
                  )}
                </>
              )}

              <button
                type="button"
                onClick={() => removeRule(rule.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove rule"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addRule}
            className="flex items-center gap-2 px-4 py-2 text-primary-600 hover:bg-primary-50 rounded-lg border border-dashed border-primary-300 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add rule
          </button>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Segment size:</span>
            </div>
            {previewLoading ? (
              <RefreshCw className="h-5 w-5 text-gray-400 animate-spin" />
            ) : previewCount !== null && canSave ? (
              <span className="text-xl font-bold text-primary-600">
                {previewCount.toLocaleString()} customers
              </span>
            ) : (
              <span className="text-gray-500">
                {canSave ? 'Calculating...' : 'Add at least one complete rule'}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSaveModalOpen(true)}
            disabled={!canSave}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save as Audience
          </button>
        </div>
      </div>

      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Save Segment as Audience</h2>
            <form onSubmit={handleSaveAsAudience} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={audienceName}
                  onChange={(e) => setAudienceName(e.target.value)}
                  required
                  placeholder="e.g., High-value Toronto customers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={audienceDescription}
                  onChange={(e) => setAudienceDescription(e.target.value)}
                  rows="2"
                  placeholder="Brief description of this audience"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSaveModalOpen(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {saveLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export default CustomerSegmentTab
