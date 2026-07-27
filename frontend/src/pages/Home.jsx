import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Footer from '../components/Footer'

const CATEGORIES = [
  { value: 'hall',      label: 'Seminar Hall',   icon: '🏛️' },
  { value: 'equipment', label: 'Equipment',       icon: '📷' },
  { value: 'room',      label: 'Room / Lab',      icon: '🚪' },
  { value: 'other',     label: 'Other Request',   icon: '📋' },
]

const FEATURES = [
  {
    icon: '⚡',
    title: 'Instant Booking',
    desc: 'Reserve any campus resource in under 2 minutes with real-time availability.',
  },
  {
    icon: '🔒',
    title: 'No Conflicts',
    desc: 'Our system guarantees zero double-bookings, even under high load.',
  },
  {
    icon: '📧',
    title: 'Smart Reminders',
    desc: 'Automated email reminders 1 hour before your booking starts.',
  },
  {
    icon: '📊',
    title: 'Full Transparency',
    desc: 'Track your booking status in real-time from request to completion.',
  },
]

const STATS = [
  { value: '8+',   label: 'Campus Resources' },
  { value: '500+', label: 'Bookings Made' },
  { value: '100%', label: 'No Double Bookings' },
  { value: '24h',  label: 'Avg. Response Time' },
]

export default function Home() {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    type: '',
    purpose: '',
    date: '',
    time: '',
    duration: '',
    participants: '',
  })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleContinue = (e) => {
    e.preventDefault()
    const path = form.type ? `/book/${form.type}` : '/resources'
    if (!isLoggedIn) {
      // Save form data so we can restore it after login
      sessionStorage.setItem('bookingFormDraft', JSON.stringify(form))
      sessionStorage.setItem('redirectAfterLogin', path)
      navigate('/login')
    } else {
      if (form.type) {
        navigate(path, { state: { draft: form } })
      } else {
        navigate('/resources')
      }
    }
  }

  return (
    <div>
      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-bg" />
        <div className="hero-glow" />
        <div className="hero-glow-2" />

        <div className="hero-content container">
          <div className="animate-fade-up" style={{ animationDelay: '0s' }}>
            <span className="hero-eyebrow">
              ✦ LNMIIT Smart Booking Portal
            </span>
          </div>

          <h1 className="hero-title animate-fade-up" style={{ animationDelay: '0.05s' }}>
            Book Campus Resources<br />
            <span className="highlight">Effortlessly.</span>
          </h1>

          <p className="hero-subtitle animate-fade-up" style={{ animationDelay: '0.1s' }}>
            Reserve seminar halls, equipment, rooms and campus resources
            in minutes — no paperwork, no waiting.
          </p>

          {/* Booking Card */}
          <div className="booking-card animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <div className="booking-card-title">
              <div className="icon">📅</div>
              Start a New Booking
            </div>

            <form onSubmit={handleContinue}>
              <div className="booking-card-grid">
                <div className="form-group">
                  <label className="form-label">Booking Type</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                  >
                    <option value="">Select type...</option>
                    {CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => set('date', e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <input
                    type="time"
                    className="form-input"
                    value={form.time}
                    onChange={e => set('time', e.target.value)}
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div className="booking-card-grid-2">
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Club meet, Workshop, Seminar..."
                    value={form.purpose}
                    onChange={e => set('purpose', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expected Participants</label>
                  <input
                    type="number"
                    className="form-input"
                    placeholder="Number of people"
                    min="1"
                    value={form.participants}
                    onChange={e => set('participants', e.target.value)}
                  />
                </div>
              </div>

              <div className="booking-card-footer">
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {isLoggedIn
                    ? '✓ Signed in — continue to booking'
                    : 'You\'ll sign in after selecting a resource'
                  }
                </p>
                <button type="submit" className="btn btn-primary btn-lg" style={{ minWidth: 180 }}>
                  {isLoggedIn ? 'Continue →' : 'Get Started →'}
                </button>
              </div>
            </form>
          </div>

          {/* Stats */}
          <div className="stats-grid animate-fade-up stagger" style={{ animationDelay: '0.25s' }}>
            {STATS.map(s => (
              <div key={s.label} className="stat-card">
                <span className="stat-number">{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="section">
        <div className="container">
          <div className="section-header">
            <div className="section-tag">✦ Why CampusDesk</div>
            <h2 className="section-title">Built for LNMIIT students &amp; clubs</h2>
            <p className="section-desc">
              Stop fighting over halls and equipment. One platform for all campus resource bookings.
            </p>
          </div>

          <div className="resources-grid stagger">
            {FEATURES.map((f, i) => (
              <div key={i} className="card card-hover animate-fade-up" style={{ padding: 28 }}>
                <div style={{
                  width: 52, height: 52,
                  background: 'var(--maroon-dim)',
                  borderRadius: 'var(--radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: 16,
                }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '1.0625rem', marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section style={{ padding: '60px 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(122,15,23,0.25) 0%, rgba(142,30,36,0.15) 100%)',
            border: '1px solid rgba(122,15,23,0.3)',
            borderRadius: 'var(--radius-xl)',
            padding: '48px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: '60%', height: 2,
              background: 'linear-gradient(90deg, transparent, var(--maroon), transparent)',
            }} />
            <h2 style={{ fontSize: '2rem', marginBottom: 12 }}>Ready to book?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
              Browse all available campus resources and make your first booking in minutes.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/resources')}>
                Browse Resources
              </button>
              {!isLoggedIn && (
                <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
