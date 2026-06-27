const Shine = ({ className }) => (
  <div className={`bg-gray-200 rounded-xl animate-pulse ${className}`} />
)

export function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <Shine className="aspect-square rounded-none" />
      <div className="p-2.5 space-y-1.5">
        <Shine className="h-3 w-full" />
        <Shine className="h-3 w-2/3" />
        <Shine className="h-4 w-1/2" />
      </div>
    </div>
  )
}

export function StoreSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <Shine className="h-28 rounded-none" />
      <div className="p-3 space-y-2">
        <Shine className="h-4 w-3/4" />
        <Shine className="h-3 w-1/2" />
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 shadow-sm">
          <Shine className="w-16 h-16 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Shine className="h-4 w-3/4" />
            <Shine className="h-3 w-1/2" />
            <Shine className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
