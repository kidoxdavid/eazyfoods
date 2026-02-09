import { useEffect, useState } from 'react'
import api from '../services/api'
import { TrendingUp, Target, Clock, Award, BarChart3 } from 'lucide-react'

const Performance = () => {
  const [stats, setStats] = useState(null)
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Fetch dashboard stats
      const statsRes = await api.get('/driver/dashboard/stats')
      setStats(statsRes.data)
      
      // Fetch deliveries for analytics
      const deliveriesRes = await api.get('/driver/deliveries')
      setDeliveries(Array.isArray(deliveriesRes.data) ? deliveriesRes.data : [])
    } catch (error) {
      console.error('Failed to fetch performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate performance metrics
  const calculateMetrics = () => {
    if (!deliveries.length) return null

    const completed = deliveries.filter(d => d.status === 'delivered')
    const totalEarnings = deliveries
      .filter(d => d.driver_earnings)
      .reduce((sum, d) => sum + parseFloat(d.driver_earnings || 0), 0)
    
    // Calculate average delivery time (if we have timestamps)
    const deliveryTimes = completed
      .filter(d => d.created_at && d.delivered_at)
      .map(d => {
        const created = new Date(d.created_at)
        const delivered = new Date(d.delivered_at)
        return (delivered - created) / (1000 * 60) // minutes
      })
    
    const avgDeliveryTime = deliveryTimes.length > 0
      ? deliveryTimes.reduce((sum, t) => sum + t, 0) / deliveryTimes.length
      : 0

    // Calculate completion rate
    const completionRate = deliveries.length > 0
      ? (completed.length / deliveries.length) * 100
      : 0

    // Calculate weekly trend (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentDeliveries = deliveries.filter(d => 
      new Date(d.created_at) >= weekAgo
    )
    const recentCompleted = recentDeliveries.filter(d => d.status === 'delivered')

    // Calculate monthly trend
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const monthlyDeliveries = deliveries.filter(d => 
      new Date(d.created_at) >= monthAgo
    )

    return {
      totalDeliveries: deliveries.length,
      completedDeliveries: completed.length,
      completionRate,
      avgDeliveryTime: Math.round(avgDeliveryTime),
      totalEarnings,
      avgEarnings: completed.length > 0 ? totalEarnings / completed.length : 0,
      weeklyDeliveries: recentDeliveries.length,
      weeklyCompleted: recentCompleted.length,
      monthlyDeliveries: monthlyDeliveries.length,
      averageRating: stats?.average_rating || 0
    }
  }

  const metrics = calculateMetrics()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
        <p className="text-gray-600 mt-1">Track your delivery performance and statistics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {metrics?.completionRate.toFixed(1) || 0}%
              </p>
            </div>
            <Target className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ⭐ {metrics?.averageRating.toFixed(1) || 'N/A'}
              </p>
            </div>
            <Award className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Delivery Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {metrics?.avgDeliveryTime || 0} min
              </p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${metrics?.avgEarnings.toFixed(2) || '0.00'}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Delivery Statistics
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Deliveries</span>
              <span className="font-semibold text-gray-900">{metrics?.totalDeliveries || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed</span>
              <span className="font-semibold text-green-600">{metrics?.completedDeliveries || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Week</span>
              <span className="font-semibold text-gray-900">{metrics?.weeklyDeliveries || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">This Month</span>
              <span className="font-semibold text-gray-900">{metrics?.monthlyDeliveries || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Earnings Overview
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Earnings</span>
              <span className="font-semibold text-green-600">
                ${metrics?.totalEarnings.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Average per Delivery</span>
              <span className="font-semibold text-gray-900">
                ${metrics?.avgEarnings.toFixed(2) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completed This Week</span>
              <span className="font-semibold text-green-600">{metrics?.weeklyCompleted || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Completion Rate</span>
              <span className="font-semibold text-blue-600">
                {metrics?.completionRate.toFixed(1) || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Tips */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg border border-primary-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Tips</h2>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Maintain a completion rate above 95% for better opportunities</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Keep your average delivery time under 45 minutes for higher ratings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Accept deliveries promptly to increase your weekly earnings</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary-600 mt-1">•</span>
            <span>Update delivery status in real-time for better customer experience</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default Performance

