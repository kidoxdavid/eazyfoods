import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Plus, Edit, Trash2, ChefHat, Search, X } from 'lucide-react'
import { formatCurrency } from '../utils/format'

const Cuisines = () => {
  const [cuisines, setCuisines] = useState([])
  const [allCuisines, setAllCuisines] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCuisines()
  }, [])

  const fetchCuisines = async () => {
    try {
      const response = await api.get('/chef/cuisines')
      setAllCuisines(response.data)
      setCuisines(response.data)
    } catch (error) {
      console.error('Failed to fetch cuisines:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let filtered = allCuisines

    if (filter !== 'all') {
      filtered = filtered.filter(c => c.status === filter)
    }

    if (searchQuery.trim() !== '') {
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (c.cuisine_type && c.cuisine_type.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    setCuisines(filtered)
  }, [filter, searchQuery, allCuisines])

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this cuisine?')) return

    try {
      await api.delete(`/chef/cuisines/${id}`)
      fetchCuisines()
    } catch (error) {
      alert('Failed to delete cuisine')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Cuisines</h1>
          <p className="text-gray-600 mt-1">Manage your cuisine offerings</p>
        </div>
        <Link
          to="/cuisines/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Cuisine
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search cuisines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'all'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'active'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('inactive')}
              className={`px-4 py-2 rounded-lg ${
                filter === 'inactive'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Inactive
            </button>
          </div>
        </div>
      </div>

      {/* Cuisines Grid */}
      {cuisines.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <ChefHat className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No cuisines found</p>
          <Link
            to="/cuisines/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Add Your First Cuisine
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
          {cuisines.map((cuisine) => (
            <div key={cuisine.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              {cuisine.image_url && (
                <div className="aspect-[4/3] sm:aspect-square bg-gray-100 overflow-hidden">
                  <img
                    src={cuisine.image_url}
                    alt={cuisine.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3 sm:p-4">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <h3 className="text-sm font-semibold text-gray-900 truncate">{cuisine.name}</h3>
                  <span
                    className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      cuisine.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {cuisine.status}
                  </span>
                </div>

                {cuisine.cuisine_type && (
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-1 truncate">{cuisine.cuisine_type}</p>
                )}

                {cuisine.description && (
                  <p className="text-[10px] sm:text-xs text-gray-600 mb-2 line-clamp-2">{cuisine.description}</p>
                )}

                <div className="flex items-center justify-between gap-2 mb-3">
                  <div>
                    <p className="text-base sm:text-lg font-bold text-gray-900">
                      {formatCurrency(cuisine.price)}
                    </p>
                    {cuisine.serves > 1 && (
                      <p className="text-[10px] text-gray-500">Serves {cuisine.serves}</p>
                    )}
                  </div>
                  {cuisine.is_featured && (
                    <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] font-medium rounded">
                      Featured
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <Link
                    to={`/cuisines/${cuisine.id}/edit`}
                    className="flex-1 min-w-0 text-center px-2 py-1.5 bg-primary-600 text-white rounded hover:bg-primary-700 text-[10px] sm:text-xs flex items-center justify-center gap-1"
                  >
                    <Edit className="h-3 w-3 flex-shrink-0" />
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(cuisine.id)}
                    className="px-2 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-[10px] sm:text-xs flex items-center justify-center gap-1"
                  >
                    <Trash2 className="h-3 w-3 flex-shrink-0" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Cuisines

