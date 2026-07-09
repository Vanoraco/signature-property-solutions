'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { Eye, EyeOff, LockKeyhole, UserRound } from 'lucide-react'
import Image from 'next/image'

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
    <div className="login-page">
      <div className="login-bg-grid" />
      <div className="login-glow-r" />
      <div className="login-glow-l" />

      <div className="login-card">
        {/* Left brand panel */}
        <div className="login-brand-panel">
          <div className="login-brand-glow" />
          <div className="login-brand-content">
            <div className="login-logo-wrap">
              <Image src="/headerlogo.png" alt="Signature Property Solutions" fill className="object-contain" priority sizes="300px" />
            </div>
            <p className="login-eyebrow">Private Admin Gateway</p>
           
            <p className="login-brand-desc">
              Manage listings, leads, agents, and site content from the Signature Property Solutions control panel.
            </p>
          </div>
        </div>

        {/* Right form panel */}
        <div className="login-form-panel">
          <div className="login-form-inner">
            <div className="login-form-header">
              <h2 className="login-form-title">Welcome back</h2>
              <p className="login-form-subtitle">Enter your credentials to access the admin panel.</p>
            </div>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} className="login-form">
              <div className="login-field-group">
                <label className="login-label">Username</label>
                <div className="login-input-wrap">
                  <UserRound size={16} className="login-input-icon" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="login-input"
                    required
                  />
                </div>
              </div>
              <div className="login-field-group">
                <label className="login-label">Password</label>
                <div className="login-input-wrap">
                  <LockKeyhole size={16} className="login-input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-input login-input-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="login-eye-btn"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="login-btn">
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="login-footer">
              Authorized Signature Property Solutions staff only. All access is logged for security.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
