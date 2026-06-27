import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function AppHeader({ title, back = false, right = null, transparent = false, onBack }) {
  const navigate = useNavigate()

  return (
    <div
      className={`flex items-center h-14 px-4 gap-3 flex-shrink-0 ${
        transparent ? 'bg-transparent' : 'bg-white border-b border-gray-100'
      }`}
      style={{ paddingTop: 0 }}
    >
      {back && (
        <button
          onClick={onBack || (() => navigate(-1))}
          className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-100 press-scale"
        >
          <ArrowLeft className="h-5 w-5 text-gray-700" />
        </button>
      )}
      <h1 className="flex-1 text-base font-bold text-gray-900 leading-tight">{title}</h1>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  )
}
