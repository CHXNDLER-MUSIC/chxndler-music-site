'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function TestEmailSignup() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage('');

    console.log('🚀 Sending signup email for:', email);
    console.log('🚀 Redirect URL will be:', window.location.origin + '/auth/callback');

    try {
      const { data, error } = await supabaseBrowser.auth.signUp({
        email,
        password: 'temppassword123', // Temporary password
        options: { 
          emailRedirectTo: window.location.origin + '/auth/callback',
        }
      });

      if (error) {
        console.error('❌ Signup error:', error);
        setMessage(`Error: ${error.message}`);
      } else {
        console.log('✅ Signup successful:', data);
        setMessage(`✅ Check your email (${email}) for confirmation link! The link will redirect to localhost:3000/auth/callback`);
      }
    } catch (error: any) {
      console.error('❌ Unexpected error:', error);
      setMessage(`Unexpected error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">🧪 Test Email Confirmation</h1>
        <p className="text-gray-300 mb-6">
          This will send a confirmation email with localhost:3000/auth/callback redirect
        </p>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-white"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-600 text-white py-2 px-4 rounded"
          >
            {loading ? '📧 Sending...' : '📧 Send Test Email'}
          </button>
        </form>

        {message && (
          <div className="mt-4 p-3 bg-gray-800 border border-gray-600 rounded">
            <p className="text-sm">{message}</p>
          </div>
        )}
        
        <div className="mt-6 text-sm text-gray-400">
          <p><strong>What this does:</strong></p>
          <ul className="list-disc list-inside space-y-1 mt-2">
            <li>Sends email with localhost:3000/auth/callback redirect</li>
            <li>When you click the link, it should hit our auth callback</li>
            <li>The callback should create a profile automatically</li>
            <li>Check terminal logs for "🚨 AUTH CALLBACK HIT! 🚨"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}