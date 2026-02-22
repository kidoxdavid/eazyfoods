import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { CANADIAN_PROVINCES, getCitiesForProvince } from '../constants/locations'
import { AFRICAN_CUISINE_TYPES } from '../constants/cuisines'
import api from '../services/api'

const Signup = () => {
  const [doc1File, setDoc1File] = useState(null)  // Government ID
  const [doc2File, setDoc2File] = useState(null)  // Chef certification
  const [doc3File, setDoc3File] = useState(null)  // Business permit
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    first_name: '',
    last_name: '',
    chef_name: '',
    street_address: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Canada',
    cuisines: [],
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [requireDocs, setRequireDocs] = useState(true)
  const { signup } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    api.get('/config/signup-documentation').then((r) => {
      if (r.data && typeof r.data.require_chef_docs === 'boolean') {
        setRequireDocs(r.data.require_chef_docs)
      }
    }).catch(() => {})
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const addCuisine = (cuisine) => {
    if (cuisine && !formData.cuisines.includes(cuisine)) {
      setFormData({ ...formData, cuisines: [...formData.cuisines, cuisine] })
    }
  }
  const removeCuisine = (cuisine) => {
    setFormData({ ...formData, cuisines: formData.cuisines.filter(c => c !== cuisine) })
  }

  const getErrorMessage = (err) => {
    if (!err || typeof err !== 'object') return 'Signup failed. Please try again.'
    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === 'object' && d?.msg) ? d.msg : String(d)).join('. ') || 'Signup failed. Please try again.'
    }
    if (typeof detail === 'string') return detail
    const msg = err.response?.data?.message || err.message
    return typeof msg === 'string' ? msg : 'Signup failed. Please try again.'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.cuisines.length === 0) {
      setError('Please add at least one cuisine type')
      return
    }
    if (requireDocs && (!doc1File || !doc2File || !doc3File)) {
      setError('All three documents are required: Government ID, Chef Certification, and Business Permit.')
      return
    }

    setLoading(true)
    try {
      const payload = { ...formData }
      if (doc1File || doc2File || doc3File) {
        try {
          const fd1 = new FormData()
          if (doc1File) fd1.append('file', doc1File)
          const fd2 = new FormData()
          if (doc2File) fd2.append('file', doc2File)
          const fd3 = new FormData()
          if (doc3File) fd3.append('file', doc3File)
          const [r1, r2, r3] = await Promise.all([
            doc1File ? api.post('/uploads/chef-documents', fd1) : Promise.resolve({ data: {} }),
            doc2File ? api.post('/uploads/chef-documents', fd2) : Promise.resolve({ data: {} }),
            doc3File ? api.post('/uploads/chef-documents', fd3) : Promise.resolve({ data: {} })
          ])
          if (r1?.data?.url) payload.government_id_url = r1.data.url
          if (r2?.data?.url) payload.chef_certification_url = r2.data.url
          if (r3?.data?.url) payload.business_permit_url = r3.data.url
        } catch (uploadErr) {
          setError(getErrorMessage(uploadErr) || 'Document upload failed. Please check your files and try again.')
          setLoading(false)
          return
        }
      }

      await signup(payload)
      setLoading(false)
      navigate('/login', { state: { message: 'Account created successfully! Please wait for admin verification.' } })
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100 px-4 py-12">
      <div className="max-w-2xl w-full space-y-8 bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">eazyfoods</h1>
          <h2 className="text-xl text-gray-600">Chef Registration</h2>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input
                type="text"
                name="first_name"
                required
                value={formData.first_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input
                type="text"
                name="last_name"
                required
                value={formData.last_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chef Name (Display Name)</label>
              <input
                type="text"
                name="chef_name"
                value={formData.chef_name}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="e.g., Chef John's Kitchen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
              <input
                type="text"
                name="street_address"
                required
                value={formData.street_address}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
              <select
                name="state"
                required
                value={formData.state}
                onChange={(e) => {
                  handleChange(e)
                  setFormData(prev => ({ ...prev, city: '' }))
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select province</option>
                {CANADIAN_PROVINCES.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
              <select
                name="city"
                required
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select city</option>
                {getCitiesForProvince(formData.state).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code *</label>
              <input
                type="text"
                name="postal_code"
                required
                value={formData.postal_code}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document 1: Government ID {requireDocs ? '*' : '(optional)'}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={(e) => setDoc1File(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document 2: Chef Certification {requireDocs ? '*' : '(optional)'}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={(e) => setDoc2File(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Document 3: Business Permit {requireDocs ? '*' : '(optional)'}</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.gif,.pdf"
                onChange={(e) => setDoc3File(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-500 mt-1">All three documents required (JPEG, PNG, PDF – max 5MB each)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Cuisines *</label>
              <p className="text-xs text-gray-500 mb-2">Select cuisines you specialize in (add at least one)</p>
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value
                  if (v) addCuisine(v)
                  e.target.value = ''
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a cuisine to add...</option>
                {AFRICAN_CUISINE_TYPES.filter((c) => !formData.cuisines.includes(c)).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {formData.cuisines.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.cuisines.map((cuisine) => (
                    <span
                      key={cuisine}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm"
                    >
                      {cuisine}
                      <button
                        type="button"
                        onClick={() => removeCuisine(cuisine)}
                        className="hover:text-primary-900 font-bold"
                        aria-label={`Remove ${cuisine}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Creating account...' : (
              <>
                <UserPlus className="h-5 w-5" />
                Sign Up
              </>
            )}
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary-600 hover:underline">
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

