import { Link } from 'react-router-dom'
import { LogIn } from 'lucide-react'

const Signup = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">eazyfoods</h1>
        <p className="text-gray-600 mb-4">Marketing Portal</p>
        <p className="text-gray-700 mb-6">
          Access is by invitation only. Contact your administrator to get an account.
        </p>
        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors"
        >
          <LogIn className="h-5 w-5" />
          Back to Login
        </Link>
      </div>
    </div>
  )
}

export default Signup
