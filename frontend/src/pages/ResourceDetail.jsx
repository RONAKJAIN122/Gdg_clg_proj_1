import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'

const HOUR_START = 7
const HOUR_END = 23
const TOTAL_HOURS = HOUR_END - HOUR_START

function toPercent(dt, openHour) {
  const h = dt.getUTCHours() + dt.getUTCMinutes() / 60
  return ((h - openHour) / TOTAL_HOURS) * 100
}

function Timeline({ bookings, userId, selectedStart, selectedEnd, onSlotClick, openTime, closeTime }) {
  const [openH] = openTime.split(':').map(Number)
  const [closeH] = closeTime.split(':').map(Number)
  const hours = []
  for (let h = openH; h <= closeH; h++) hours.push(h)
  const totalH = closeH - openH

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frac = x / rect.width
    const clickedHour = openH + frac * totalH
    // Snap to nearest 30 min
    const snapped = Math.round(clickedHour * 2) / 2
    const startH = Math.floor(snapped)
    const startM = snapped % 1 === 0.5 ? 30 : 0
    const endH = startH + 1
    if (endH > closeH) return
    const today = new Date()
    const base = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`
    onSlotClick(
      `${base}T${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`,
      `${base}T${String(endH).padStart(2,'0')}:${String(startM).padStart(2,'0')}:00`,
    )
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: '0.75rem' }}>
        {[
          { color: 'rgba(220,38,38,0.5)',  border: 'rgba(220,38,38,0.6)',  label: 'Booked' },
          { color: 'rgba(37,99,235,0.35)', border: 'rgba(37,99,235,0.5)',  label: 'Your Booking' },
          { color: 'rgba(22,163,74,0.15)', border: 'rgba(22,163,74,0.4)',  label: 'Free (click to select)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, background: l.color, border: `1px solid ${l.border}`, borderRadius: 3 }} />
            <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div
        style={{
          position: 'relative',
          height: 80,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          cursor: 'crosshair',
          minWidth: 500,
        }}
        onClick={handleClick}
      >
        {/* Hour lines */}
        {hours.map(h => {
          const pct = ((h - openH) / totalH) * 100
          return (
            <div key={h} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}>
              <span style={{ position: 'absolute', top: 4, left: 3, fontSize: '0.625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {h}:00
              </span>
            </div>
          )
        })}

        {/* Selected slot */}
        {selectedStart && selectedEnd && (
          <div
            style={{
              position: 'absolute',
              left: `${((new Date(selectedStart).getUTCHours() + new Date(selectedStart).getUTCMinutes()/60 - openH) / totalH) * 100}%`,
              width: `${((new Date(selectedEnd) - new Date(selectedStart)) / 3600000 / totalH) * 100}%`,
              top: '20%',
              height: '60%',
              background: 'rgba(212,175,55,0.35)',
              border: '2px dashed var(--gold)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.625rem',
              color: 'var(--gold)',
              fontWeight: 700,
              zIndex: 10,
            }}
          >
            Selected
          </div>
        )}

        {/* Bookings */}
        {bookings.map(b => {
          const st = new Date(b.start_time)
          const en = new Date(b.end_time)
          const left = ((st.getUTCHours() + st.getUTCMinutes()/60 - openH) / totalH) * 100
          const width = ((en - st) / 3600000 / totalH) * 100
          const isMine = b.user_id === userId

          return (
            <div
              key={b.id}
              title={`${isMine ? 'Your booking' : 'Booked'}: ${st.getUTCHours()}:${String(st.getUTCMinutes()).padStart(2,'0')} – ${en.getUTCHours()}:${String(en.getUTCMinutes()).padStart(2,'0')}`}
              style={{
                position: 'absolute',
                left: `${Math.max(0, left)}%`,
                width: `${Math.min(100 - Math.max(0, left), width)}%`,
                top: '20%',
                height: '60%',
                background: isMine ? 'rgba(37,99,235,0.35)' : 'rgba(220,38,38,0.35)',
                border: `1px solid ${isMine ? 'rgba(37,99,235,0.5)' : 'rgba(220,38,38,0.5)'}`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 6,
                fontSize: '0.625rem',
                color: isMine ? '#93c5fd' : '#fca5a5',
                fontWeight: 600,
                zIndex: 5,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
              }}
            >
              {isMine ? '⭐ Mine' : '✕'}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ResourceDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [resource, setResource] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)

  const [form, setForm] = useState({
    start_time: '',
    end_time: '',
    purpose: '',
  })
  const [errors, setErrors] = useState({})
  const [clashInfo, setClashInfo] = useState(null)

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: '' })); setClashInfo(null) }

  useEffect(() => {
    const fetchResource = async () => {
      try {
        const res = await client.get(`/api/resources/${id}`)
        setResource(res.data)
      } catch {
        navigate('/resources')
      }
    }
    fetchResource()
  }, [id, navigate])

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await client.get(`/api/resources/${id}/bookings`, { params: { date } })
        setBookings(res.data)
      } catch { setBookings([]) }
      finally { setLoading(false) }
    }
    if (id) fetchBookings()
  }, [id, date])

  const handleSlotClick = (start, end) => {
    // Adjust date to selected date
    const [dateStr] = date.split('T')
    const [, startTime] = start.split('T')
    const [, endTime] = end.split('T')
    set('start_time', `${date}T${startTime}`)
    set('end_time', `${date}T${endTime}`)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.start_time) errs.start_time = 'Select a start time'
    if (!form.end_time) errs.end_time = 'Select an end time'
    if (!form.purpose.trim()) errs.purpose = 'Purpose is required'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    setClashInfo(null)
    try {
      const res = await client.post('/api/bookings', {
        resource_id: parseInt(id),
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        purpose: form.purpose,
      })
      addToast('Booking confirmed! 🎉', 'success')
      navigate('/booking-success', { state: { booking: res.data, resource } })
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 409) {
        setClashInfo(data?.detail?.clashing_slot)
        addToast(data?.detail?.message || 'Time slot is already booked', 'error')
      } else if (err.response?.status === 400) {
        if (data?.detail?.errors) {
          setErrors(data.detail.errors)
        } else {
          addToast(data?.detail || 'Validation error', 'error')
        }
      } else {
        addToast('Something went wrong. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!resource) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 40 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="skeleton" style={{ height: 32, width: '40%' }} />
            <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        {/* Back */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/resources')} style={{ marginBottom: 20 }}>
          ← Back to Resources
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 28, alignItems: 'start' }}>

          {/* Left: Resource info + Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Resource Header */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56,
                  background: 'var(--maroon-dim)',
                  borderRadius: 'var(--radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', flexShrink: 0,
                }}>
                  {resource.category === 'hall' ? '🏛️' :
                   resource.category === 'equipment' ? '📷' :
                   resource.category === 'room' ? '🚪' : '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{resource.name}</h1>
                  {resource.location && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>📍 {resource.location}</p>
                  )}
                </div>
                <span className="resource-category">{resource.category}</span>
              </div>
              {resource.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{resource.description}</p>
              )}
              <div style={{
                display: 'flex', gap: 20, marginTop: 16, paddingTop: 16,
                borderTop: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)'
              }}>
                <span>⏰ Open: <strong style={{ color: 'var(--text-secondary)' }}>{resource.open_time} – {resource.close_time}</strong></span>
              </div>
            </div>

            {/* Timeline */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Availability — {date}</h2>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', colorScheme: 'dark' }}
                  value={date}
                  min={today}
                  onChange={e => setDate(e.target.value)}
                />
              </div>
              {loading
                ? <div className="skeleton" style={{ height: 80 }} />
                : (
                  <div style={{ overflowX: 'auto' }}>
                    <Timeline
                      bookings={bookings}
                      userId={user?.id}
                      selectedStart={form.start_time}
                      selectedEnd={form.end_time}
                      onSlotClick={handleSlotClick}
                      openTime={resource.open_time}
                      closeTime={resource.close_time}
                    />
                  </div>
                )
              }
              {bookings.length === 0 && !loading && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--status-approved)', marginTop: 12, textAlign: 'center' }}>
                  ✓ Fully available on this date
                </p>
              )}
            </div>
          </div>

          {/* Right: Booking Form */}
          <div className="card" style={{ padding: 24, position: 'sticky', top: 'calc(var(--navbar-h) + 20px)' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 20 }}>Book This Resource</h2>

            {clashInfo && (
              <div style={{
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, fontSize: '0.8125rem'
              }}>
                <p style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>⚠ Slot Already Booked</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Conflicts with {new Date(clashInfo.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {' – '}
                  {new Date(clashInfo.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input
                  type="datetime-local"
                  className={`form-input ${errors.start_time ? 'error' : ''}`}
                  value={form.start_time}
                  min={`${today}T00:00`}
                  onChange={e => set('start_time', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
                {errors.start_time && <div className="form-error">⚠ {errors.start_time}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">End Time</label>
                <input
                  type="datetime-local"
                  className={`form-input ${errors.end_time ? 'error' : ''}`}
                  value={form.end_time}
                  min={form.start_time || `${today}T00:00`}
                  onChange={e => set('end_time', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
                {errors.end_time && <div className="form-error">⚠ {errors.end_time}</div>}
              </div>

              <div className="form-group">
                <label className="form-label">Purpose</label>
                <textarea
                  className={`form-textarea ${errors.purpose ? 'error' : ''}`}
                  placeholder="Briefly describe your purpose..."
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  rows={3}
                />
                {errors.purpose && <div className="form-error">⚠ {errors.purpose}</div>}
              </div>

              {/* Duration preview */}
              {form.start_time && form.end_time && (
                <div style={{
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--text-muted)'
                }}>
                  Duration: <strong style={{ color: 'var(--text-primary)' }}>
                    {Math.round((new Date(form.end_time) - new Date(form.start_time)) / 60000)} minutes
                  </strong>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting}>
                {submitting ? <><div className="spinner" /> Submitting...</> : 'Confirm Booking →'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
