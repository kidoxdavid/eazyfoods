import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { Workflow, Plus, Play, Pause, Settings, TrendingUp } from 'lucide-react'

const Automation = () => {
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    setLoading(true)
    try {
      const response = await api.get('/admin/marketing/automation', { params: { limit: 1000 } })
      const workflows = response.data || []
      // Transform data to match frontend format
      setWorkflows(workflows.map(workflow => ({
        ...workflow,
        triggers: [workflow.trigger_type],
        actions: workflow.actions || []
      })))
    } catch (error) {
      console.error('Failed to fetch workflows:', error)
      setWorkflows([])
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWorkflow = async (workflowId, currentStatus) => {
    try {
      if (currentStatus === 'active') {
        await api.put(`/admin/marketing/automation/${workflowId}/pause`)
      } else {
        await api.put(`/admin/marketing/automation/${workflowId}/activate`)
      }
      fetchWorkflows()
    } catch (error) {
      alert('Failed to update workflow status')
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
          <h1 className="text-3xl font-bold text-gray-900">Marketing Automation</h1>
          <p className="text-gray-600 mt-1">Create automated workflows to engage customers</p>
        </div>
        <Link
          to="/automation/new"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Workflow
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Workflow className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900">{workflow.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      workflow.status === 'active' ? 'bg-green-100 text-green-800' :
                      workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {workflow.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{workflow.description}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {workflow.status === 'active' ? (
                  <button 
                    onClick={() => handleToggleWorkflow(workflow.id, 'active')}
                    className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 text-sm flex items-center gap-1"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                ) : (
                  <button 
                    onClick={() => handleToggleWorkflow(workflow.id, 'paused')}
                    className="px-3 py-1 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm flex items-center gap-1"
                  >
                    <Play className="h-4 w-4" />
                    Activate
                  </button>
                )}
                <Link
                  to={`/automation/${workflow.id}`}
                  className="px-3 py-1 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 text-sm flex items-center gap-1"
                >
                  <Settings className="h-4 w-4" />
                  Edit
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Trigger</p>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {workflow.triggers[0].replace('_', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Actions</p>
                <p className="text-sm font-medium text-gray-900">
                  {workflow.actions.length} actions
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Active Instances</p>
                <p className="text-sm font-medium text-gray-900">
                  {workflow.active_instances}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Total Executions</p>
                <p className="text-sm font-medium text-gray-900">
                  {workflow.total_executions.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {workflows.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Workflow className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 mb-2 text-lg">No automation workflows created yet</p>
          <Link
            to="/automation/new"
            className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Create Your First Workflow
          </Link>
        </div>
      )}
    </div>
  )
}

export default Automation

