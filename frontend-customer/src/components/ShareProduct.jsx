import { useState } from 'react'
import { Share2, Facebook, Twitter, Link2, Mail, Copy, Check } from 'lucide-react'

const ShareProduct = ({ product, url, title = null }) => {
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const shareUrl = url || window.location.href
  const shareTitle = title || product?.name || 'Check out this product!'
  const shareText = product?.description ? product.description.substring(0, 100) + '...' : ''

  const shareOptions = [
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'text-blue-600 hover:bg-blue-50',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank')
        setShowMenu(false)
      }
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'text-blue-400 hover:bg-blue-50',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')
        setShowMenu(false)
      }
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'text-gray-600 hover:bg-gray-50',
      action: () => {
        window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareUrl)}`
        setShowMenu(false)
      }
    },
    {
      name: 'Copy Link',
      icon: copied ? Check : Copy,
      color: 'text-green-600 hover:bg-green-50',
      action: async () => {
        try {
          await navigator.clipboard.writeText(shareUrl)
          setCopied(true)
          setTimeout(() => {
            setCopied(false)
            setShowMenu(false)
          }, 2000)
        } catch (err) {
          console.error('Failed to copy:', err)
        }
      }
    }
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
        type="button"
        aria-label="Share product"
      >
        <Share2 className="h-4 w-4" />
        <span className="text-sm font-medium">Share</span>
      </button>
      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 min-w-[200px]">
            <div className="p-2">
              {shareOptions.map((option, index) => {
                const Icon = option.icon
                return (
                  <button
                    key={index}
                    onClick={option.action}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${option.color}`}
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{option.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default ShareProduct

