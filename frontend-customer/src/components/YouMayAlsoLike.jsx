import { useEffect, useState } from 'react'
import api from '../services/api'
import Section from './Section'
import ProductCard from './ProductCard'

const YouMayAlsoLike = ({ productId, categoryId, maxItems = 4 }) => {
  const [recommendations, setRecommendations] = useState([])
  const fetchRecommendations = async () => {
    try {
      const params = {
        limit: maxItems + 2, // Fetch extra to filter out current product
        skip: 0
      }

      // Prioritize same category
      if (categoryId) {
        params.category_id = categoryId
      }

      const response = await api.get('/customer/products', { params })
      let products = Array.isArray(response.data) ? response.data : (response.data?.products || [])

      // Filter out current product
      products = products.filter(p => p.id !== productId)

      // Limit to maxItems
      products = products.slice(0, maxItems)

      setRecommendations(products)
    } catch (error) {
      console.error('Failed to fetch recommendations:', error)
      setRecommendations([])
    }
  }


  useEffect(() => {
    fetchRecommendations()
  }, [productId, categoryId])

  if (recommendations.length === 0) return null

  return (
    <Section eyebrow="Keep browsing" title="You may also like" className="!px-0 sm:!px-0 lg:!px-0">
      <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-4">
        {recommendations.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </Section>
  )
}

export default YouMayAlsoLike
