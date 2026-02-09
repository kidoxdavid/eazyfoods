import React from 'react'

// Product Card Skeleton
export const ProductCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="w-full aspect-square bg-gray-200" />
      
      {/* Content skeleton */}
      <div className="p-3 sm:p-4">
        {/* Title skeleton */}
        <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
        
        {/* Price skeleton */}
        <div className="h-5 bg-gray-200 rounded mb-2 w-1/2" />
        
        {/* Rating skeleton */}
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-2" />
        
        {/* Button skeleton */}
        <div className="h-8 bg-gray-200 rounded w-full" />
      </div>
    </div>
  )
}

// Product Grid Skeleton
export const ProductGridSkeleton = ({ count = 8 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  )
}

// Chef Card Skeleton
export const ChefCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-full aspect-square bg-gray-200" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

// Store Card Skeleton
export const StoreCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse">
      <div className="w-full h-32 bg-gray-200" />
      <div className="p-4">
        <div className="h-5 bg-gray-200 rounded mb-2 w-3/4" />
        <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
        <div className="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  )
}

// List Item Skeleton
export const ListItemSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 rounded-lg flex-shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="w-20 h-8 bg-gray-200 rounded" />
      </div>
    </div>
  )
}

// Text Skeleton
export const TextSkeleton = ({ lines = 3, className = '' }) => {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 rounded mb-2 animate-pulse ${
            index === lines - 1 ? 'w-3/4' : 'w-full'
          }`}
        />
      ))}
    </div>
  )
}

// Page Skeleton
export const PageSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      {/* Header skeleton */}
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
      
      {/* Filters skeleton */}
      <div className="flex gap-4 mb-6">
        <div className="h-10 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-32" />
        <div className="h-10 bg-gray-200 rounded w-32" />
      </div>
      
      {/* Grid skeleton */}
      <ProductGridSkeleton count={10} />
    </div>
  )
}

// Order Card Skeleton
export const OrderCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2" />
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="h-6 bg-gray-200 rounded w-20" />
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>
    </div>
  )
}

// Product Detail Skeleton
export const ProductDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12">
        {/* Image skeleton */}
        <div className="aspect-square bg-gray-200 rounded-lg" />
        
        {/* Content skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-12 bg-gray-200 rounded w-32" />
        </div>
      </div>
    </div>
  )
}

// Store Detail Skeleton
export const StoreDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-pulse">
      {/* Banner skeleton */}
      <div className="h-48 bg-gray-200 rounded-lg mb-6" />
      
      {/* Groceries grid skeleton */}
      <ProductGridSkeleton count={12} />
    </div>
  )
}

// Order Detail Skeleton
export const OrderDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-1/3 mb-6" />
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="h-6 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
      </div>
    </div>
  )
}

// Chef Detail Skeleton
export const ChefDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-3 animate-pulse">
      <div className="h-64 bg-gray-200 rounded-lg mb-6" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="h-4 bg-gray-200 rounded w-full mb-2" />
          <div className="h-4 bg-gray-200 rounded w-3/4" />
        </div>
        <div>
          <div className="h-32 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="mt-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <ProductGridSkeleton count={6} />
      </div>
    </div>
  )
}

// Meal Detail Skeleton
export const MealDetailSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="aspect-square bg-gray-200 rounded-lg" />
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-6 bg-gray-200 rounded w-1/2" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
        </div>
      </div>
    </div>
  )
}

