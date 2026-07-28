import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'
import { formatTime12 } from '../utils/format'

// Generate 30-min interval AM/PM time options between open and close times
function generateTimeOptions(openTimeStr = '09:00', closeTimeStr = '21:00') {
  const [openH] = openTimeStr.split(':').map(Number)
  const [closeH] = closeTimeStr.split(':').map(Number)
  const options = []
  for (let h = openH; h <= closeH; h++) {
    for (let m of [0, 30]) {
      if (h === closeH && m > 0) break
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      options.push({ value: val, label: formatTime12(val) })
    }
  }
  return options
}

// Format naive API datetime string (no Z) as local time AM/PM
function fmtApiTime(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const h = d.getHours()
  const m = d.getMinutes()
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

// Read-only timeline — shows booked slots only, no click interaction
function Timeline({ bookings, userId, openTime, closeTime }) {
  const [openH] = openTime.split(':').map(Number)
  const [closeH] = closeTime.split(':').map(Number)
  const hours = []
  for (let h = openH; h <= closeH; h++) hours.push(h)
  const totalH = closeH - openH

  const hourLabel = (h) => {
    const p = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12}${p}`
  }

  // Position % from naive API datetime string (parsed as local)
  const dtToPos = (isoStr) => {
    const d = new Date(isoStr)
    return ((d.getHours() + d.getMinutes() / 60 - openH) / totalH) * 100
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(220,38,38,0.5)',  border: 'rgba(220,38,38,0.6)',  label: 'Booked / Class' },
          { color: 'rgba(37,99,235,0.35)', border: 'rgba(37,99,235,0.6)',  label: 'Your Booking' },
          { color: 'rgba(22,163,74,0.12)', border: 'rgba(22,163,74,0.4)',  label: 'Available' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 13, height: 13, background: l.color, border: `1px solid ${l.border}`, borderRadius: 3 }} />
            <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Read-only bar */}
      <div style={{
        position: 'relative', height: 80,
        background: 'var(--bg-elevated)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        cursor: 'default',
        minWidth: 500,
        userSelect: 'none',
      }}>
        {/* Hour gridlines */}
        {hours.map(h => (
          <div key={h} style={{ position: 'absolute', left: `${((h - openH) / totalH) * 100}%`, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}>
            <span style={{ position: 'absolute', top: 4, left: 3, fontSize: '0.6rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {hourLabel(h)}
            </span>
          </div>
        ))}

        {/* Booking blocks */}
        {bookings.map(b => {
          const left = dtToPos(b.start_time)
          const width = dtToPos(b.end_time) - left
          if (width <= 0 || left >= 100) return null
          const isMine = b.user_id === userId
          const tip = b.purpose
            ? `${b.purpose} (${fmtApiTime(b.start_time)} – ${fmtApiTime(b.end_time)})`
            : `${isMine ? 'My Booking' : 'Booked'}: ${fmtApiTime(b.start_time)} – ${fmtApiTime(b.end_time)}`
          return (
            <div
              key={b.id}
              title={tip}
              style={{
                position: 'absolute',
                left: `${Math.max(0, left)}%`,
                width: `${Math.min(100 - Math.max(0, left), width)}%`,
                top: '22%', height: '56%',
                background: isMine ? 'rgba(37,99,235,0.35)' : 'rgba(220,38,38,0.35)',
                border: `1px solid ${isMine ? 'rgba(37,99,235,0.6)' : 'rgba(220,38,38,0.6)'}`,
                borderRadius: 6,
                display: 'flex', alignItems: 'center',
                paddingLeft: 5, fontSize: '0.62rem',
                color: isMine ? '#93c5fd' : '#fca5a5',
                fontWeight: 600, zIndex: 5,
                overflow: 'hidden', whiteSpace: 'nowrap',
              }}
            >
              {isMine ? `⭐ ${b.purpose || 'Mine'}` : (b.purpose || 'Booked')}
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

  const todayStr = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    booking_date: todayStr,
    start_time: '10:00',
    end_time: '11:00',
    purpose: '',
  })
  const [errors, setErrors] = useState({})
  const [clashInfo, setClashInfo] = useState(null)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
    setClashInfo(null)
  }

  useEffect(() => {
    client.get(`/api/resources/${id}`)
      .then(r => setResource(r.data))
      .catch(() => navigate('/resources'))
  }, [id, navigate])

  useEffect(() => {
    if (!id || !form.booking_date) return
    setLoading(true)
    client.get(`/api/resources/${id}/bookings`, { params: { date: form.booking_date } })
      .then(r => setBookings(r.data))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false))
  }, [id, form.booking_date])

  const timeOptions = resource ? generateTimeOptions(resource.open_time, resource.close_time) : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setClashInfo(null)

    const errs = {}
    if (!form.booking_date)   errs.booking_date = 'Select a date'
    if (!form.start_time)     errs.start_time   = 'Select a start time'
    if (!form.end_time)       errs.end_time     = 'Select an end time'
    if (!form.purpose.trim()) errs.purpose      = 'Purpose is required'
    if (form.start_time >= form.end_time) errs.end_time = 'End time must be after start time'
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      // Append Z so the selected wall-clock time is treated as UTC directly
      // (avoids browser local timezone shifting the time before sending)
      const startISO = `${form.booking_date}T${form.start_time}:00Z`
      const endISO   = `${form.booking_date}T${form.end_time}:00Z`

      const res = await client.post('/api/bookings', {
        resource_id: parseInt(id),
        start_time: startISO,
        end_time: endISO,
        purpose: form.purpose,
      })
      addToast('Booking confirmed!', 'success')
      navigate('/booking-success', { state: { booking: res.data, resource } })
    } catch (err) {
      const data = err.response?.data
      if (err.response?.status === 409) {
        setClashInfo(data?.detail?.clashing_slot)
        addToast(data?.detail?.message || 'Time slot already booked', 'error')
      } else if (err.response?.status === 400) {
        const detail = data?.detail
        if (typeof detail === 'object') {
          if (detail.errors) setErrors(detail.errors)
          addToast(detail.message || Object.values(detail.errors || {})[0] || 'Validation error', 'error')
        } else {
          addToast(typeof detail === 'string' ? detail : 'Validation error', 'error')
        }
      } else {
        addToast(data?.detail || 'Failed to complete booking', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (!resource) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 40 }}>
          <div className="skeleton" style={{ height: 32, width: '40%', marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />
        </div>
      </div>
    )
  }

  const [startH, startM] = form.start_time.split(':').map(Number)
  const [endH, endM]     = form.end_time.split(':').map(Number)
  const durationMins = (endH * 60 + endM) - (startH * 60 + startM)

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/resources')} style={{ marginBottom: 20 }}>
          ← Back to Resources
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 390px', gap: 28, alignItems: 'start' }}>

          {/* LEFT — Resource info + read-only timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Resource header */}
            <div className="card" style={{ padding: 28 }}>
              <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', marginBottom: 16 }}>
                <div style={{
                  width: 56, height: 56, background: 'var(--maroon-dim)',
                  borderRadius: 'var(--radius)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.75rem', flexShrink: 0,
                }}>
                  {resource.category === 'hall' ? '🏛️' : resource.category === 'equipment' ? '📷' : resource.category === 'room' ? '🚪' : '📋'}
                </div>
                <div style={{ flex: 1 }}>
                  <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{resource.name}</h1>
                  {resource.location && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>📍 {resource.location}</p>}
                </div>
                <span className="resource-category">{resource.category}</span>
              </div>
              {resource.description && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.7 }}>{resource.description}</p>}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                ⏰ Operating Hours: <strong style={{ color: 'var(--gold)' }}>{formatTime12(resource.open_time)} – {formatTime12(resource.close_time)}</strong>
              </div>
            </div>

            {/* Availability timeline */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>Availability — {form.booking_date}</h2>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', colorScheme: 'dark' }}
                  value={form.booking_date}
                  min={todayStr}
                  onChange={e => set('booking_date', e.target.value)}
                />
              </div>

              {loading
                ? <div className="skeleton" style={{ height: 80 }} />
                : (
                  <div style={{ overflowX: 'auto' }}>
                    <Timeline
                      bookings={bookings}
                      userId={user?.id}
                      openTime={resource.open_time}
                      closeTime={resource.close_time}
                    />
                  </div>
                )
              }

              {!loading && bookings.length === 0 && (
                <p style={{ fontSize: '0.8125rem', color: 'var(--status-approved)', marginTop: 10, textAlign: 'center' }}>
                  ✓ Fully available on this date
                </p>
              )}
            </div>
          </div>

          {/* RIGHT — Booking form */}
          <div className="card" style={{ padding: 24, position: 'sticky', top: 'calc(var(--navbar-h) + 20px)' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 20 }}>Reserve a Time Slot</h2>

            {clashInfo && (
              <div style={{
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, fontSize: '0.8125rem'
              }}>
                <p style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>⚠ Slot Already Booked</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Conflicts with {fmtApiTime(clashInfo.start_time)} – {fmtApiTime(clashInfo.end_time)}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Date */}
              <div className="form-group">
                <label className="form-label">Booking Date</label>
                <input
                  type="date"
                  className={`form-input ${errors.booking_date ? 'error' : ''}`}
                  value={form.booking_date}
                  min={todayStr}
                  onChange={e => set('booking_date', e.target.value)}
                  style={{ colorScheme: 'dark' }}
                />
                {errors.booking_date && <div className="form-error">⚠ {errors.booking_date}</div>}
              </div>

              {/* AM/PM Time dropdowns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Start Time</label>
                  <select
                    className={`form-select ${errors.start_time ? 'error' : ''}`}
                    value={form.start_time}
                    onChange={e => set('start_time', e.target.value)}
                  >
                    {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {errors.start_time && <div className="form-error">⚠ {errors.start_time}</div>}
                </div>

                <div className="form-group">
                  <label className="form-label">End Time</label>
                  <select
                    className={`form-select ${errors.end_time ? 'error' : ''}`}
                    value={form.end_time}
                    onChange={e => set('end_time', e.target.value)}
                  >
                    {timeOptions.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  {errors.end_time && <div className="form-error">⚠ {errors.end_time}</div>}
                </div>
              </div>

              {/* Purpose */}
              <div className="form-group">
                <label className="form-label">Purpose / Event Details</label>
                <textarea
                  className={`form-textarea ${errors.purpose ? 'error' : ''}`}
                  placeholder="e.g. Club meeting, Hackathon practice, Society event..."
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  rows={3}
                />
                {errors.purpose && <div className="form-error">⚠ {errors.purpose}</div>}
              </div>

              {/* Duration preview */}
              {durationMins > 0 && (
                <div style={{
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px', fontSize: '0.8125rem',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span style={{ color: 'var(--text-muted)' }}>Selected:</span>
                  <strong style={{ color: 'var(--gold)' }}>
                    {formatTime12(form.start_time)} – {formatTime12(form.end_time)}
                    <span style={{ color: 'var(--text-muted)', fontWeight: 400, marginLeft: 6 }}>({durationMins} min)</span>
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
