import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, MapPin, LogOut, ChevronRight, Edit2, Shield, Bell } from 'lucide-react'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import api from '../services/api'

export default function ProfileScreen() {
  const { user, logout, token } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(user?.full_name || user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [saving, setSaving] = useState(false)

  const handleLogout = async () => {
    if (!confirm('Sign out of EazyFoods?')) return
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/customer/me', { full_name: name, phone }, { headers: { Authorization: `Bearer ${token}` } })
      success('Profile updated!')
      setEditing(false)
    } catch (e) {
      showError(e?.response?.data?.detail || 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  const avatar = (user?.full_name || user?.name || 'U').charAt(0).toUpperCase()

  return (
    <div className="h-full flex flex-col pt-safe">
      <AppHeader title="Profile" />

      <div className="flex-1 scroll-content mb-tab">
        {/* Avatar + name */}
        <div className="bg-primary-600 flex flex-col items-center py-8 gap-3">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold text-white">
            {avatar}
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg">{user?.full_name || user?.name || 'Guest'}</p>
            <p className="text-primary-200 text-sm">{user?.email}</p>
          </div>
          <button onClick={() => setEditing(v => !v)}
            className="flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-full press-scale">
            <Edit2 className="h-3.5 w-3.5" />
            Edit Profile
          </button>
        </div>

        {/* Edit form */}
        {editing && (
          <div className="mx-4 mt-4 bg-white rounded-2xl p-4 shadow-sm space-y-3">
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
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl press-scale">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl press-scale disabled:opacity-60">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="mx-4 mt-4 space-y-2">
          {[
            { icon: MapPin,  label: 'My Addresses',  sub: 'Manage delivery addresses', path: '/profile/addresses' },
            { icon: Shield,  label: 'Privacy',       sub: 'Data & security settings',  path: null },
            { icon: Bell,    label: 'Notifications', sub: 'Manage your alerts',        path: null },
          ].map(({ icon: Icon, label, sub, path }) => (
            <button key={label} onClick={() => path && navigate(path)}
              className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center gap-3 press-scale">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
                <p className="text-xs text-gray-400">{sub}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </button>
          ))}
        </div>

        {/* App info */}
        <div className="mx-4 mt-4 bg-gray-50 rounded-2xl p-4 text-center">
          <p className="text-xs text-gray-400">EazyFoods · Version 1.0.0</p>
          <p className="text-xs text-gray-300 mt-0.5">Authentic African & Caribbean groceries</p>
        </div>

        {/* Sign out */}
        <div className="mx-4 mt-3 mb-4">
          <button onClick={handleLogout} disabled={loggingOut}
            className="w-full py-3.5 bg-red-50 text-red-600 font-bold rounded-2xl press-scale flex items-center justify-center gap-2 disabled:opacity-60">
            <LogOut className="h-5 w-5" />
            {loggingOut ? 'Signing out…' : 'Sign Out'}
          </button>
        </div>
      </div>
    </div>
  )
}
