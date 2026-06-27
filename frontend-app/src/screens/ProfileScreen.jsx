import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, MapPin, LogOut, ChevronRight, Edit2, Plus, Trash2, Check, Eye, EyeOff, Package, Loader2, AlertCircle } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

const TABS = ['Overview', 'Addresses', 'Security']

const BLANK_ADDR = { street_address: '', city: '', state: '', postal_code: '', country: 'Canada', is_default: false }

export default function ProfileScreen() {
  const { user, logout, token } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()

  const [tab, setTab]       = useState('Overview')
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)

  // Profile edit
  const [editing, setEditing] = useState(false)
  const [name, setName]     = useState('')
  const [phone, setPhone]   = useState('')
  const [saving, setSaving] = useState(false)

  // Address form
  const [showAddrForm, setShowAddrForm] = useState(false)
  const [editingAddr, setEditingAddr]   = useState(null)
  const [addrForm, setAddrForm]         = useState(BLANK_ADDR)
  const [savingAddr, setSavingAddr]     = useState(false)
  const [deletingId, setDeletingId]     = useState(null)

  // Password change
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' })
  const [showPw, setShowPw] = useState({ cur: false, new: false, con: false })
  const [savingPw, setSavingPw] = useState(false)
  const [pwError, setPwError]   = useState('')

  useEffect(() => {
    if (!token) return
    Promise.all([
      api.get('/customer/me'),
      api.get('/customer/orders/?limit=5').catch(() => ({ data: [] })),
      api.get('/customer/addresses').catch(() => ({ data: [] })),
    ]).then(([meRes, ordRes, addrRes]) => {
      const p = meRes.data?.data || meRes.data
      setProfile(p)
      setName(p?.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : (p?.full_name || ''))
      setPhone(p?.phone || '')
      setOrders(Array.isArray(ordRes.data) ? ordRes.data : (ordRes.data?.orders || []))
      setAddresses(Array.isArray(addrRes.data) ? addrRes.data : (addrRes.data?.addresses || []))
    }).catch(() => {
      if (user) setProfile(user)
    }).finally(() => setLoading(false))
  }, [token])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      const parts = name.trim().split(/\s+/)
      await api.put('/customer/me', {
        first_name: parts[0],
        last_name: parts.slice(1).join(' ') || '',
        phone,
      })
      success('Profile updated!')
      setEditing(false)
    } catch (e) {
      showError(e?.response?.data?.detail || 'Could not save')
    } finally { setSaving(false) }
  }

  const openAddAddr = () => { setEditingAddr(null); setAddrForm(BLANK_ADDR); setShowAddrForm(true) }
  const openEditAddr = (a) => { setEditingAddr(a); setAddrForm({ ...a }); setShowAddrForm(true) }

  const handleSaveAddr = async () => {
    setSavingAddr(true)
    try {
      if (editingAddr) {
        const res = await api.put(`/customer/addresses/${editingAddr.id}`, addrForm)
        setAddresses(prev => prev.map(a => a.id === editingAddr.id ? (res.data || addrForm) : a))
      } else {
        const res = await api.post('/customer/addresses', addrForm)
        setAddresses(prev => [...prev, res.data])
      }
      success('Address saved!')
      setShowAddrForm(false)
    } catch (e) {
      showError(e?.response?.data?.detail || 'Could not save address')
    } finally { setSavingAddr(false) }
  }

  const handleDeleteAddr = async (id) => {
    setDeletingId(id)
    try {
      await api.delete(`/customer/addresses/${id}`)
      setAddresses(prev => prev.filter(a => a.id !== id))
      success('Address removed')
    } catch (e) {
      showError('Could not delete address')
    } finally { setDeletingId(null) }
  }

  const handleSetDefault = async (id) => {
    try {
      await api.put(`/customer/addresses/${id}`, { is_default: true })
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })))
      success('Default address updated')
    } catch (_) {}
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match'); return }
    if (pwForm.new_password.length < 6) { setPwError('New password must be at least 6 characters'); return }
    setSavingPw(true)
    try {
      await api.post('/customer/password-change', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      success('Password changed!')
      setPwForm({ current_password: '', new_password: '', confirm_password: '' })
    } catch (e) {
      setPwError(e?.response?.data?.detail || 'Could not change password')
    } finally { setSavingPw(false) }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const avatar = (profile?.first_name || profile?.full_name || user?.email || 'U').charAt(0).toUpperCase()
  const displayName = profile?.first_name
    ? `${profile.first_name} ${profile.last_name || ''}`.trim()
    : (profile?.full_name || profile?.email || user?.email || '')

  const STATUS_COLORS = {
    pending: 'bg-amber-100 text-amber-700',
    confirmed: 'bg-blue-100 text-blue-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    processing: 'bg-indigo-100 text-indigo-700',
  }

  return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader title="Profile" />

      <div className="flex-1 scroll-content mb-tab">
        {/* Avatar hero */}
        <div className="bg-primary-600 flex flex-col items-center py-7 gap-3">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold text-white">
            {avatar}
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg leading-tight">{displayName}</p>
            <p className="text-primary-200 text-sm">{profile?.email || user?.email}</p>
          </div>
          <button onClick={() => { setEditing(true); setTab('Overview') }}
            className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full press-scale">
            <Edit2 className="h-3.5 w-3.5" />Edit Profile
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white border-b border-gray-100 sticky top-0 z-10">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setEditing(false); setShowAddrForm(false) }}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${tab === t ? 'text-primary-700 border-b-2 border-primary-700' : 'text-gray-400'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-7 w-7 text-primary-600 animate-spin" />
          </div>
        )}

        {/* ── OVERVIEW TAB ── */}
        {!loading && tab === 'Overview' && (
          <div className="p-4 space-y-4">
            {/* Profile edit form */}
            {editing ? (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Edit Profile</p>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Full Name</label>
                  <input value={name} onChange={e => setName(e.target.value)}
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Phone</label>
                  <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" inputMode="tel"
                    placeholder="+1 (555) 000-0000"
                    className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl press-scale">Cancel</button>
                  <button onClick={handleSaveProfile} disabled={saving}
                    className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl press-scale disabled:opacity-60">
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                {[
                  { label: 'Name', value: displayName },
                  { label: 'Email', value: profile?.email || user?.email },
                  { label: 'Phone', value: profile?.phone || 'Not set' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{label}</span>
                    <span className="text-sm text-gray-800 font-medium">{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Recent orders */}
            {orders.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-gray-900">Recent Orders</p>
                  <button onClick={() => navigate('/orders')} className="text-xs text-primary-600 font-semibold">See all</button>
                </div>
                <div className="space-y-2">
                  {orders.map(o => (
                    <button key={o.id} onClick={() => navigate(`/orders/${o.id}`)}
                      className="w-full bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3 press-scale text-left">
                      <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Package className="h-4.5 w-4.5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-900">Order #{String(o.id).slice(0, 8)}</p>
                        <p className="text-[10px] text-gray-400">{new Date(o.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-600'}`}>
                        {o.status}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sign out */}
            <button onClick={handleLogout}
              className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-2xl press-scale flex items-center justify-center gap-2">
              <LogOut className="h-5 w-5" />Sign Out
            </button>

            <div className="text-center py-2">
              <p className="text-xs text-gray-300">EazyFoods · v1.0</p>
            </div>
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {!loading && tab === 'Addresses' && (
          <div className="p-4 space-y-3">
            {!showAddrForm ? (
              <>
                <button onClick={openAddAddr}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-200 rounded-2xl text-primary-600 font-semibold text-sm press-scale">
                  <Plus className="h-4 w-4" />Add New Address
                </button>
                {addresses.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <MapPin className="h-10 w-10 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm">No saved addresses yet</p>
                  </div>
                )}
                {addresses.map(a => (
                  <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4.5 w-4.5 text-primary-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{a.street_address}</p>
                          {a.is_default && (
                            <span className="text-[9px] font-bold bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">DEFAULT</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{[a.city, a.state, a.postal_code, a.country].filter(Boolean).join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {!a.is_default && (
                        <button onClick={() => handleSetDefault(a.id)}
                          className="flex-1 py-1.5 text-[11px] font-semibold border border-gray-200 rounded-lg text-gray-600 press-scale flex items-center justify-center gap-1">
                          <Check className="h-3 w-3" />Set Default
                        </button>
                      )}
                      <button onClick={() => openEditAddr(a)}
                        className="flex-1 py-1.5 text-[11px] font-semibold border border-gray-200 rounded-lg text-gray-600 press-scale">
                        Edit
                      </button>
                      <button onClick={() => handleDeleteAddr(a.id)} disabled={deletingId === a.id}
                        className="py-1.5 px-3 text-[11px] font-semibold border border-red-100 rounded-lg text-red-500 press-scale flex items-center gap-1 disabled:opacity-40">
                        {deletingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              /* Address form */
              <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
                <p className="text-sm font-bold text-gray-900">{editingAddr ? 'Edit Address' : 'New Address'}</p>
                {[
                  { key: 'street_address', label: 'Street Address', placeholder: '123 Main St' },
                  { key: 'city',           label: 'City',           placeholder: 'Toronto' },
                  { key: 'state',          label: 'Province/State', placeholder: 'ON' },
                  { key: 'postal_code',    label: 'Postal / ZIP',   placeholder: 'M5V 2T6' },
                  { key: 'country',        label: 'Country',        placeholder: 'Canada' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-500 mb-1">{label}</label>
                    <input value={addrForm[key] || ''} onChange={e => setAddrForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
                  </div>
                ))}
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!addrForm.is_default} onChange={e => setAddrForm(f => ({ ...f, is_default: e.target.checked }))}
                    className="w-4 h-4 accent-primary-600 rounded" />
                  <span className="text-sm text-gray-700">Set as default address</span>
                </label>
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setShowAddrForm(false)}
                    className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl press-scale">Cancel</button>
                  <button onClick={handleSaveAddr} disabled={savingAddr}
                    className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl press-scale disabled:opacity-60">
                    {savingAddr ? 'Saving…' : 'Save Address'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {!loading && tab === 'Security' && (
          <div className="p-4">
            <form onSubmit={handleChangePassword} className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <p className="text-sm font-bold text-gray-900">Change Password</p>
              {pwError && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-xl">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-700">{pwError}</p>
                </div>
              )}
              {[
                { key: 'current_password', label: 'Current Password', vis: showPw.cur, toggle: () => setShowPw(p => ({ ...p, cur: !p.cur })) },
                { key: 'new_password',     label: 'New Password',     vis: showPw.new, toggle: () => setShowPw(p => ({ ...p, new: !p.new })) },
                { key: 'confirm_password', label: 'Confirm Password', vis: showPw.con, toggle: () => setShowPw(p => ({ ...p, con: !p.con })) },
              ].map(({ key, label, vis, toggle }) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <div className="relative">
                    <input type={vis ? 'text' : 'password'} value={pwForm[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="••••••••"
                      className="w-full h-11 px-3 pr-10 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" />
                    <button type="button" onClick={toggle}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {vis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              ))}
              <button type="submit" disabled={savingPw}
                className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl press-scale disabled:opacity-60 flex items-center justify-center gap-2">
                {savingPw ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
