import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

export default function Settings() {
  const { user, logout } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [saving, setSaving] = useState(false)

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const handleSaveProfile = (e) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      // Save locally
      const updatedUser = { ...user, name }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      addToast('Profile settings saved successfully', 'success')
      setSaving(false)
    }, 400)
  }

  const handleSignOut = () => {
    logout()
    addToast('Signed out successfully', 'success')
    navigate('/')
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 720, paddingTop: 40, paddingBottom: 60 }}>
        
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>
            Profile &amp; Settings
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Manage your personal profile, account preferences, and theme settings
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          
          {/* Profile Overview Card */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--maroon) 0%, var(--crimson) 100%)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                fontWeight: 800,
                fontSize: '1.5rem',
                boxShadow: 'var(--shadow-red)',
                flexShrink: 0,
              }}>
                {initials}
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>
                  {user?.name || 'LNMIIT Member'}
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span>✉️ {user?.email}</span>
                  <span className="user-dropdown-role" style={{ fontSize: '0.7rem' }}>
                    {user?.role?.toUpperCase() || 'STUDENT'}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">LNMIIT Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={user?.email || ''}
                  disabled
                  style={{ opacity: 0.7, cursor: 'not-allowed' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  🔒 Email is tied to your LNMIIT domain verification.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Preferences & Appearance */}
          <div className="card" style={{ padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                  Appearance &amp; Theme
                </h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                  Currently using <strong style={{ color: 'var(--gold)' }}>{theme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}</strong>
                </p>
              </div>

              <button
                onClick={toggleTheme}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 16px',
                  borderRadius: 24,
                  border: '1px solid var(--border)',
                  background: 'var(--bg-elevated)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  transition: 'all 0.2s ease',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <span>{theme === 'dark' ? 'Switch to Light ☀️' : 'Switch to Dark 🌙'}</span>
                <span style={{
                  display: 'inline-block',
                  width: 38,
                  height: 22,
                  borderRadius: 12,
                  background: theme === 'dark' ? 'var(--gold)' : 'var(--maroon)',
                  position: 'relative',
                  transition: 'all 0.2s ease'
                }}>
                  <span style={{
                    position: 'absolute',
                    top: 3,
                    left: theme === 'dark' ? 19 : 3,
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    background: '#fff',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                  }} />
                </span>
              </button>
            </div>
          </div>

          {/* Security & Booking Limits */}
          <div className="card" style={{ padding: 28 }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 16 }}>
              Account Security &amp; Booking Rules
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem' }}>
                <span style={{ fontSize: '1.1rem' }}>🔑</span>
                <div>
                  <strong>Passwordless OTP Sign In</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Your account is authenticated via 6-digit OTP codes sent to Ethereal Mail.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.875rem', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.1rem' }}>📋</span>
                <div>
                  <strong>Active Booking Limit</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Students are limited to maximum 2 active upcoming confirmed bookings at a time.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sign Out Card */}
          <div className="card" style={{ padding: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid rgba(220,38,38,0.3)' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                Sign Out of Your Account
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Ends your current session on this device.
              </div>
            </div>

            <button className="btn btn-secondary btn-sm" onClick={handleSignOut} style={{ color: '#f87171', borderColor: 'rgba(220,38,38,0.3)' }}>
              Sign Out
            </button>
          </div>

        </div>

      </div>
    </div>
  )
}
