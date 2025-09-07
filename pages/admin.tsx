import { useState } from 'react';
import AdminAnalytics from '../components/AdminAnalytics';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');

  // Change this to your secret password
  const ADMIN_PASSWORD = 'your-secret-admin-password-2024';

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      alert('Invalid password');
      setPassword('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold mb-6 text-center text-gray-900">
            🔐 Admin Access
          </h1>
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                placeholder="Enter admin password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Access Analytics
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-4 text-center">
            Admin access required to view analytics data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Analytics Dashboard
            </h1>
            <button
              onClick={() => setIsAuthenticated(false)}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            Private Analytics Dashboard
          </h2>
          <p className="text-gray-600 mb-6">
            This dashboard shows private user analytics data. Only you can see this information.
          </p>
          
          {/* Analytics Component */}
          <AdminAnalytics adminKey="your-secret-admin-key-2024" />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">
            🔒 Security Information
          </h3>
          <ul className="text-blue-700 space-y-2 text-sm">
            <li>• Analytics data is stored securely on your server</li>
            <li>• Only you can access this admin dashboard</li>
            <li>• Regular users cannot see any analytics data</li>
            <li>• Data is automatically cleaned to prevent storage issues</li>
          </ul>
        </div>

        {/* Database Setup Instructions */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-3">
            🛠️ Next Steps for Production
          </h3>
          <ul className="text-yellow-700 space-y-2 text-sm">
            <li>• Replace in-memory storage with a database (PostgreSQL, MongoDB, etc.)</li>
            <li>• Set strong passwords in your .env file</li>
            <li>• Consider using services like Supabase or Firebase for easier setup</li>
            <li>• Add IP filtering for additional security</li>
          </ul>
        </div>
      </div>
    </div>
  );
}