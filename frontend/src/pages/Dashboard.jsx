import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

function DashCard({ icon, count, label, color }) {
  return (
    <div className="dash-card animate-fade-up">
      <div className="dash-card-icon" style={{ background: `${color}20` }}>
        {icon}
      </div>
      <div>
        <div className="dash-card-count" style={{ color }}>{count}</div>
        <div className="dash-card-label">{label}</div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await client.get('/api/bookings/me', { params: { page: 1, limit: 20 } })
        setBookings(res.data.data)
      } catch {} finally { setLoading(false) }
    }
    fetch()
  }, [])

  const now = new Date()
  const upcoming = bookings.filter(b => b.status === 'confirmed' && new Date(b.start_time) > now)
  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const recent = [...bookings].slice(0, 5)

  const fmt = (dt) => new Date(dt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
  })

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* Welcome */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Here's your booking activity overview</p>
        </div>

        {/* Stats */}
        <div className="dashboard-grid stagger">
          <DashCard icon="📅" count={upcoming.length} label="Upcoming Bookings" color="var(--gold)" />
          <DashCard icon="⏳" count={bookings.filter(b => b.status === 'confirmed').length} label="Confirmed" color="var(--status-approved)" />
          <DashCard icon="✓" count={completed.length} label="Completed" color="#60a5fa" />
          <DashCard icon="✕" count={cancelled.length} label="Cancelled" color="var(--status-rejected)" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginTop: 32, alignItems: 'start' }}>

          {/* Recent Activity */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Recent Activity</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/my-bookings')}>View all →</button>
            </div>

            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 72, borderRadius: 12 }} />)}
              </div>
            ) : recent.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No bookings yet</h3>
                <p style={{ marginBottom: 20 }}>Make your first booking</p>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('/resources')}>
                  Browse Resources
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.map(b => (
                  <div key={b.id} className="booking-item">
                    <div style={{
                      width: 40, height: 40,
                      background: 'var(--maroon-dim)',
                      borderRadius: 10,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.125rem', flexShrink: 0
                    }}>
                      {b.resource?.category === 'hall' ? '🏛️' :
                       b.resource?.category === 'equipment' ? '📷' :
                       b.resource?.category === 'room' ? '🚪' : '📋'}
                    </div>
                    <div className="booking-item-resource">
                      <div className="booking-item-name">{b.resource?.name}</div>
                      <div className="booking-item-time"><span>📅</span>{fmt(b.start_time)}</div>
                    </div>
                    <span className={`badge badge-${b.status}`}>{b.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 16 }}>Quick Actions</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '🏛️', label: 'Book a Hall', path: '/book/hall', desc: 'Seminar halls & auditoriums' },
                { icon: '📷', label: 'Borrow Equipment', path: '/book/equipment', desc: 'Cameras, projectors & more' },
                { icon: '🚪', label: 'Book a Room', path: '/book/room', desc: 'Discussion & innovation rooms' },
                { icon: '📋', label: 'Other Request', path: '/book/other', desc: 'Custom service requests' },
              ].map(a => (
                <button
                  key={a.path}
                  className="card"
                  onClick={() => navigate(a.path)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                    cursor: 'pointer', background: 'none', border: '1px solid var(--border)',
                    fontFamily: 'inherit', textAlign: 'left', transition: 'all var(--transition)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(212,175,55,0.3)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <span style={{ fontSize: '1.25rem' }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: 2 }}>{a.label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.desc}</div>
                  </div>
                  <span style={{ color: 'var(--text-muted)' }}>→</span>
                </button>
              ))}
            </div>

            <div style={{
              marginTop: 16,
              padding: 16,
              background: 'var(--maroon-dim)',
              border: '1px solid rgba(122,15,23,0.25)',
              borderRadius: 'var(--radius)',
              fontSize: '0.8125rem',
            }}>
              <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>
                📧 Reminder Emails
              </p>
              <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
                You'll receive automatic email reminders 1 hour before each confirmed booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
