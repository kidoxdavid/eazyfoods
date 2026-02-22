import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import api from '../services/api'
import { UserPlus, Eye, EyeOff, FileText } from 'lucide-react'
import { CANADIAN_PROVINCES, getCitiesForProvince } from '../constants/locations'

const Signup = () => {
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    password: '',
    phone: '',
    first_name: '',
    last_name: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Canada',
    business_type: 'grocery',
    government_id_url: '',
    business_registration_url: '',
    tax_permit_url: '',
    region: '', // comma-separated, up to 3 African regions
  })
  const [doc1File, setDoc1File] = useState(null)   // Government ID
  const [doc2File, setDoc2File] = useState(null)   // Business registration
  const [doc3File, setDoc3File] = useState(null)   // Tax permit
  const AFRICAN_REGIONS = ['West African', 'East African', 'North African', 'Central African', 'South African']
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requireDocs, setRequireDocs] = useState(true)
  const { signup } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/config/signup-documentation').then((r) => {
      if (r.data && typeof r.data.require_vendor_docs === 'boolean') {
        setRequireDocs(r.data.require_vendor_docs)
      }
    }).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const regions = (formData.region || '').split(',').map((r) => r.trim()).filter(Boolean)
    if (regions.length === 0) {
      setError('Please select at least one African region.')
      return
    }
    if (requireDocs && (!doc1File || !doc2File || !doc3File)) {
      setError('All three documents are required: Government ID, Business Registration, and Tax Permit.')
      return
    }
    setLoading(true)

    try {
      let payload = { ...formData }
      if (doc1File || doc2File || doc3File) {
        const fd1 = new FormData(); if (doc1File) fd1.append('file', doc1File)
        const fd2 = new FormData(); if (doc2File) fd2.append('file', doc2File)
        const fd3 = new FormData(); if (doc3File) fd3.append('file', doc3File)
        const [r1, r2, r3] = await Promise.all([
          doc1File ? api.post('/uploads/vendor-documents', fd1) : Promise.resolve({ data: {} }),
          doc2File ? api.post('/uploads/vendor-documents', fd2) : Promise.resolve({ data: {} }),
          doc3File ? api.post('/uploads/vendor-documents', fd3) : Promise.resolve({ data: {} })
        ])
        if (r1.data?.url) payload.government_id_url = r1.data.url
        if (r2.data?.url) payload.business_registration_url = r2.data.url
        if (r3.data?.url) payload.tax_permit_url = r3.data.url
      }
      await signup(payload)
      navigate('/login', { state: { message: 'Account created successfully! Please login.' } })
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-3 sm:px-4 py-6 sm:py-12">
      <div className="max-w-2xl w-full space-y-6 sm:space-y-8 bg-white p-4 sm:p-6 lg:p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">eazyfoods</h1>
          <h2 className="text-lg sm:text-xl text-gray-600">Vendor Registration</h2>
        </div>

        <form className="mt-6 sm:mt-8 space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Business Name *
              </label>
              <input
                type="text"
                name="business_name"
                required
                value={formData.business_name}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Business Type *
              </label>
              <select
                name="business_type"
                required
                value={formData.business_type}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="grocery">Grocery</option>
                <option value="butcher">Butcher</option>
                <option value="specialty">Specialty</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                name="first_name"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                name="last_name"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-3 sm:px-4 py-2 pr-9 sm:pr-10 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none p-1"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Street Address *</label>
              <input
                type="text"
                name="street_address"
                required
                value={formData.street_address}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Province *</label>
              <select
                name="state"
                required
                value={formData.state}
                onChange={(e) => {
                  handleChange(e)
                  setFormData(prev => ({ ...prev, city: '' }))
                }}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select province</option>
                {CANADIAN_PROVINCES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">City *</label>
              <select
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select city</option>
                {getCitiesForProvince(formData.state).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">African Regions (select up to 3) *</label>
              <div className="flex flex-wrap gap-2">
                {AFRICAN_REGIONS.map((opt) => {
                  const regions = (formData.region || '').split(',').map((r) => r.trim()).filter(Boolean)
                  const checked = regions.includes(opt)
                  return (
                    <label key={opt} className="inline-flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          const next = checked ? regions.filter((r) => r !== opt) : [...regions, opt].slice(0, 3)
                          setFormData((prev) => ({ ...prev, region: next.join(', ') }))
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">Select at least one, up to three regions.</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Document 1: Government ID {requireDocs ? '*' : '(optional)'}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={(e) => setDoc1File(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Document 2: Business Registration {requireDocs ? '*' : '(optional)'}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={(e) => setDoc2File(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Document 3: Tax Permit {requireDocs ? '*' : '(optional)'}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={(e) => setDoc3File(e.target.files?.[0] || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">{requireDocs ? 'All three documents required (JPEG, PNG, PDF – max 5MB each)' : 'Documents optional for testing (JPEG, PNG, PDF – max 5MB each)'}</p>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                type="text"
                name="postal_code"
                required
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-2.5 sm:py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <UserPlus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                Create Account
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-xs sm:text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Signup

