import DocumentsPanel from '../../shared/DocumentsPanel'

const Documentation = () => (
  <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
    <div>
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">Documentation</h1>
      <p className="text-gray-600 mt-1 text-sm sm:text-base">Upload and track the documents our team verifies before you go live</p>
    </div>
    <DocumentsPanel />
  </div>
)

export default Documentation
