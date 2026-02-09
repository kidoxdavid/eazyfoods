import { useEffect, useState } from 'react'
import api from '../services/api'
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react'

const Gallery = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [galleryImages, setGalleryImages] = useState([])

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await api.get('/chef/profile')
      setProfile(response.data)
      setGalleryImages(response.data.gallery_images || [])
    } catch (error) {
      console.error('Failed to fetch profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const response = await api.post('/uploads/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      const imageUrl = response.data.url || response.data.image_url
      const updatedImages = [...galleryImages, imageUrl]
      setGalleryImages(updatedImages)
      
      // Update profile with new gallery
      await api.put('/chef/profile', {
        gallery_images: updatedImages
      })
      
      fetchProfile() // Refresh
      alert('Image added to gallery!')
    } catch (error) {
      console.error('Failed to upload image:', error)
      alert('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      e.target.value = '' // Reset input
    }
  }

  const handleRemoveImage = async (imageUrl) => {
    if (!confirm('Are you sure you want to remove this image from your gallery?')) return

    try {
      const updatedImages = galleryImages.filter(img => img !== imageUrl)
      setGalleryImages(updatedImages)
      
      await api.put('/chef/profile', {
        gallery_images: updatedImages
      })
      
      fetchProfile() // Refresh
      alert('Image removed from gallery!')
    } catch (error) {
      console.error('Failed to remove image:', error)
      alert('Failed to remove image. Please try again.')
      fetchProfile() // Revert on error
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
            <p className="text-sm text-gray-600 mt-1">
              Showcase your culinary creations with photos
            </p>
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
            <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2 disabled:opacity-50">
              <Upload className="h-5 w-5" />
              {uploading ? 'Uploading...' : 'Add Image'}
            </span>
          </label>
        </div>

        {galleryImages.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-2">No images in gallery yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Upload photos of your dishes to showcase your culinary skills
            </p>
            <label className="cursor-pointer inline-block">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploading}
              />
              <span className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 inline-flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Your First Image
              </span>
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {galleryImages.map((imageUrl, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={imageUrl}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={() => handleRemoveImage(imageUrl)}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title="Remove image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Gallery

