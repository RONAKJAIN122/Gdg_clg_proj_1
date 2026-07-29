import { useLocation, useNavigate } from 'react-router-dom'
import { parseNaiveDT } from '../utils/format'

function fmtTime(isoStr) {
  if (!isoStr) return ''
  const d = parseNaiveDT(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function fmtDate(isoStr) {
  if (!isoStr) return ''
  const d = parseNaiveDT(isoStr)
  return d.toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
}

export default function BookingSuccess() {
  const { state } = useLocation()
  const navigate = useNavigate()

  const booking = state?.booking
  const resource = state?.resource

  if (!booking) {
    navigate('/resources')
    return null
  }

  const start = parseNaiveDT(booking.start_time)
  const end   = parseNaiveDT(booking.end_time)
  const durationMins = Math.round((end - start) / 60000)

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: 560 }}>
        <div className="success-screen animate-fade-up">
          <div className="success-icon">✓</div>

          <h1 style={{ fontSize: '1.75rem', marginBottom: 8 }}>
            Booking Confirmed!
          </h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
            Your reservation has been successfully submitted.
          </p>

          <div className="booking-id-chip">
            🔖 Booking #{String(booking.id).padStart(5, '0')}
          </div>

          {/* Details card */}
          <div className="card" style={{ padding: 24, textAlign: 'left', width: '100%', margin: '24px 0' }}>
            {[
              { label: 'Resource', value: resource?.name || booking.resource?.name || `Resource #${booking.resource_id}` },
              { label: 'Date',     value: fmtDate(booking.start_time) },
              { label: 'Time',     value: `${fmtTime(booking.start_time)} – ${fmtTime(booking.end_time)}` },
              { label: 'Duration', value: `${durationMins} minutes` },
              { label: 'Purpose',  value: booking.purpose || '—' },
              { label: 'Status',   value: null },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0', borderBottom: '1px solid var(--border)'
              }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', flexShrink: 0 }}>{row.label}</span>
                {row.value === null
                  ? <span className={`badge badge-${booking.status}`}>{booking.status}</span>
                  : <span style={{ fontSize: '0.875rem', fontWeight: 500, textAlign: 'right', marginLeft: 12 }}>{row.value}</span>
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
