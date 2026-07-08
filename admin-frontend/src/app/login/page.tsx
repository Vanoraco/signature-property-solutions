'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      router.push('/')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center px-4">
      <div className="w-full max-w-[400px]">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 border border-brass rounded-xl flex items-center justify-center text-brass font-display font-bold italic text-2xl bg-gradient-to-br from-brass/15 to-transparent relative">
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[7px] border-l-transparent border-r-[7px] border-r-transparent border-b-[7px] border-b-brass" />
            S
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Signature</h1>
          <p className="text-[11px] text-silver tracking-[2px] uppercase mt-1">Property Solutions Admin</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
          <h2 className="font-display text-lg font-semibold mb-1">Sign in</h2>
          <p className="text-[13px] text-text-soft mb-6">Enter your credentials to access the admin panel</p>

          {error && (
            <div className="bg-danger-tint text-danger text-[13px] px-4 py-2.5 rounded-lg mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-text-soft mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full border border-border rounded-lg px-3 py-2.5 text-[13.3px] outline-none focus:border-brass transition-colors bg-card text-text-main"
                required
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-text-soft mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 pr-10 text-[13.3px] outline-none focus:border-brass transition-colors bg-card text-text-main"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-soft"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ink text-white py-2.5 rounded-lg font-semibold text-[13.5px] hover:bg-ink-2 transition-colors disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
