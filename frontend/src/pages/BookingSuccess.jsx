import { useLocation, useNavigate } from 'react-router-dom'

export default function BookingSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const booking = state?.booking
  const resource = state?.resource

  if (!booking) {
    navigate('/resources')
    return null
  }

  const start = new Date(booking.start_time)
  const end = new Date(booking.end_time)

  const fmt = (d) => d.toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true
  })

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="success-screen animate-fade-up">
          <div className="success-icon">✓</div>

          <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>
            Booking Confirmed!
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
            Your booking has been successfully submitted.
          </p>

          <div className="booking-id-chip">
            🔖 Booking #{String(booking.id).padStart(5, '0')}
          </div>

          {/* Details card */}
          <div className="card" style={{ padding: 24, textAlign: 'left', width: '100%', margin: '24px 0' }}>
            {[
              { label: 'Resource', value: resource?.name || `Resource #${booking.resource_id}` },
              { label: 'Date & Time', value: `${fmt(start)} – ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}` },
              { label: 'Duration', value: `${Math.round((end - start) / 60000)} minutes` },
              { label: 'Purpose', value: booking.purpose || '—' },
              { label: 'Status', value: null },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{row.label}</span>
                {row.value === null
                  ? <span className={`badge badge-${booking.status}`}>{booking.status}</span>
                  : <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{row.value}</span>
                }
              </div>
            ))}
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 28 }}>
            📧 You'll receive an email reminder 1 hour before your booking.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate('/my-bookings')}>
              Track Bookings
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
