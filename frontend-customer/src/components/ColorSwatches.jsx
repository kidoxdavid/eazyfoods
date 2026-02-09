import { Check } from 'lucide-react'

const ColorSwatches = ({ colors, selectedColor, onColorSelect, size = 'md' }) => {
  if (!colors || colors.length === 0) return null

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-700">Color</label>
      <div className="flex items-center gap-2 flex-wrap">
        {colors.map((color, index) => {
          const isSelected = selectedColor === color.value || selectedColor === color.name
          return (
            <button
              key={index}
              onClick={() => onColorSelect(color.value || color.name)}
              className={`${sizeClasses[size]} rounded-full border-2 transition-all ${
                isSelected
                  ? 'border-gray-900 scale-110 shadow-lg'
                  : 'border-gray-300 hover:border-gray-500 hover:scale-105'
              }`}
              style={{
                backgroundColor: color.hex || color.value || '#ccc'
              }}
              type="button"
              title={color.name || color.value}
              aria-label={`Select color ${color.name || color.value}`}
            >
              {isSelected && (
                <div className="w-full h-full flex items-center justify-center">
                  <Check className="h-4 w-4 text-white drop-shadow-lg" strokeWidth={3} />
                </div>
              )}
            </button>
          )
        })}
      </div>
      {selectedColor && (
        <p className="text-xs text-gray-600">
          Selected: {colors.find(c => (c.value || c.name) === selectedColor)?.name || selectedColor}
        </p>
      )}
    </div>
  )
}

export default ColorSwatches

