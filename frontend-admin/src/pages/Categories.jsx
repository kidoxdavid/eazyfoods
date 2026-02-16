import { useEffect, useState } from 'react'
import api from '../services/api'
import { Plus, Tag, Loader2, Trash2 } from 'lucide-react'
import { CATEGORY_ICONS } from '../data/categoryIcons'

const Categories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', image_url: '' })
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)

  const fetchCategories = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const response = await api.get('/admin/vendors/categories', { params: { include_inactive: true } })
      const list = Array.isArray(response.data) ? response.data : []
      setCategories(list)
    } catch (err) {
      console.error('Failed to fetch categories:', err)
      setLoadError(err.response?.data?.detail || err.message || 'Failed to load categories')
      setCategories([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!formData.name?.trim()) {
      setError('Category name is required')
      return
    }
    setSaving(true)
    try {
      const { data: created } = await api.post('/admin/vendors/categories', {
        name: formData.name.trim(),
        description: formData.description?.trim() || null,
        image_url: formData.image_url?.trim() || null,
      })
      setFormData({ name: '', description: '', image_url: '' })
      setShowAddForm(false)
      // Add new category to list immediately so table updates even if refetch fails
      if (created && created.id) {
        setCategories((prev) => {
          const next = [...prev, created]
          next.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
          return next
        })
      }
      // Refetch to show full list from server
      const res = await api.get('/admin/vendors/categories', { params: { include_inactive: true } })
      if (Array.isArray(res.data)) {
        setCategories(res.data)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add category')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"? This will fail if any products use it.`)) return
    setDeletingId(cat.id)
    try {
      await api.delete(`/admin/vendors/categories/${cat.id}`)
      setCategories((prev) => prev.filter((c) => c.id !== cat.id))
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete category')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchCategories()}
            className="shrink-0 px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Categories</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Add product categories. Vendors will see these when adding products.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Add Category
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add new category</h2>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Grains & Cereals"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this category"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Icon (optional)</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICONS.map(({ emoji, label }) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setFormData({ ...formData, image_url: emoji })}
                    title={label}
                    className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-colors ${
                      formData.image_url === emoji
                        ? 'border-primary-600 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Click an icon to use it for this category. It will show on the customer site.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Add
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setError(''); setFormData({ name: '', description: '', image_url: '' }) }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <p className="text-amber-800 text-sm">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchCategories()}
            className="px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slug</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 sm:px-6 py-8 text-center text-gray-500">
                    No categories yet. Click &quot;Add Category&quot; to create one.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-gray-50">
                    <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {cat.image_url ? (
                          <span className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-lg" title="Category icon">{cat.image_url}</span>
                        ) : (
                          <Tag className="h-4 w-4 text-gray-400" />
                        )}
                        <span className="font-medium text-gray-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500">{cat.slug}</td>
                    <td className="px-4 sm:px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {cat.description || '–'}
                    </td>
                    <td className="px-4 sm:px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${cat.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                        {cat.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(cat)}
                        disabled={deletingId === cat.id}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        title="Delete category"
                      >
                        {deletingId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Categories
