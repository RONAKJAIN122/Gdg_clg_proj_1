import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'
import { formatTime12, formatTimeOnly } from '../utils/format'

// Helper to generate 30-min interval 12-hour time options between open_time and close_time
function generateTimeOptions(openTimeStr = '09:00', closeTimeStr = '21:00') {
  const [openH] = openTimeStr.split(':').map(Number)
  const [closeH] = closeTimeStr.split(':').map(Number)
  const options = []

  for (let h = openH; h <= closeH; h++) {
    for (let m of [0, 30]) {
      if (h === closeH && m > 0) break
      const val24 = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      const label12 = formatTime12(val24)
      options.push({ value: val24, label: label12 })
    }
  }
  return options
}

function Timeline({ bookings, userId, selectedStart, selectedEnd, onSlotClick, openTime, closeTime }) {
  const [openH] = openTime.split(':').map(Number)
  const [closeH] = closeTime.split(':').map(Number)
  const hours = []
  for (let h = openH; h <= closeH; h++) hours.push(h)
  const totalH = closeH - openH

  const formatHourLabel = (h) => {
    const period = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 === 0 ? 12 : h % 12
    return `${h12} ${period}`
  }

  const handleClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const frac = x / rect.width
    const clickedHour = openH + frac * totalH
    const snapped = Math.round(clickedHour * 2) / 2
    const startH = Math.floor(snapped)
    const startM = snapped % 1 === 0.5 ? 30 : 0
    let endH = startH + 1
    let endM = startM
    if (endH > closeH) {
      endH = closeH
      endM = 0
    }

    const startTime24 = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`
    const endTime24 = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`

    onSlotClick(startTime24, endTime24)
  }

  return (
    <div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 12, fontSize: '0.75rem', flexWrap: 'wrap' }}>
        {[
          { color: 'rgba(220,38,38,0.5)',  border: 'rgba(220,38,38,0.6)',  label: 'Booked / Class' },
          { color: 'rgba(37,99,235,0.35)', border: 'rgba(37,99,235,0.5)',  label: 'Your Booking' },
          { color: 'rgba(22,163,74,0.15)', border: 'rgba(22,163,74,0.4)',  label: 'Free (click to select)' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 14, height: 14, background: l.color, border: `1px solid ${l.border}`, borderRadius: 3 }} />
            <span style={{ color: 'var(--text-muted)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* Timeline Bar */}
      <div
        style={{
          position: 'relative',
          height: 84,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius)',
          overflow: 'hidden',
          cursor: 'pointer',
          minWidth: 550,
        }}
        onClick={handleClick}
      >
        {/* Hour markers */}
        {hours.map(h => {
          const pct = ((h - openH) / totalH) * 100
          return (
            <div key={h} style={{ position: 'absolute', left: `${pct}%`, top: 0, bottom: 0, width: 1, background: 'var(--border)' }}>
              <span style={{ position: 'absolute', top: 4, left: 3, fontSize: '0.625rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {formatHourLabel(h)}
              </span>
            </div>
          )
        })}

        {/* Selected slot */}
        {selectedStart && selectedEnd && (
          <div
            style={{
              position: 'absolute',
              left: `${((parseInt(selectedStart.split(':')[0]) + parseInt(selectedStart.split(':')[1])/60 - openH) / totalH) * 100}%`,
              width: `${((parseInt(selectedEnd.split(':')[0]) + parseInt(selectedEnd.split(':')[1])/60 - (parseInt(selectedStart.split(':')[0]) + parseInt(selectedStart.split(':')[1])/60)) / totalH) * 100}%`,
              top: '25%',
              height: '55%',
              background: 'rgba(212,175,55,0.35)',
              border: '2px dashed var(--gold)',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.6875rem',
              color: 'var(--gold)',
              fontWeight: 700,
              zIndex: 10,
            }}
          >
            Selected
          </div>
        )}

        {/* Booked slots */}
        {bookings.map(b => {
          const st = new Date(b.start_time)
          const en = new Date(b.end_time)
          const left = ((st.getUTCHours() + st.getUTCMinutes()/60 - openH) / totalH) * 100
          const width = ((en - st) / 3600000 / totalH) * 100
          const isMine = b.user_id === userId

          const timeLabel = `${formatTimeOnly(b.start_time)} – ${formatTimeOnly(b.end_time)}`
          const title = `${b.purpose ? b.purpose + ' (' + timeLabel + ')' : (isMine ? 'Your Booking' : 'Booked Slot')}`

          return (
            <div
              key={b.id}
              title={title}
              style={{
                position: 'absolute',
                left: `${Math.max(0, left)}%`,
                width: `${Math.min(100 - Math.max(0, left), width)}%`,
                top: '25%',
                height: '55%',
                background: isMine ? 'rgba(37,99,235,0.35)' : 'rgba(220,38,38,0.35)',
                border: `1px solid ${isMine ? 'rgba(37,99,235,0.6)' : 'rgba(220,38,38,0.6)'}`,
                borderRadius: 6,
                display: 'flex',
                alignItems: 'center',
                paddingLeft: 6,
                paddingRight: 6,
                fontSize: '0.65rem',
                color: isMine ? '#93c5fd' : '#fca5a5',
                fontWeight: 600,
                zIndex: 5,
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
              }}
            >
              {isMine ? `⭐ ${b.purpose || 'My Booking'}` : (b.purpose || 'Booked')}
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

  // Booking mode: 'single' or 'multi'
  const [bookingMode, setBookingMode] = useState('single')

  // Form state with separate date & AM/PM time dropdowns
  const [form, setForm] = useState({
    booking_date: todayStr,
    start_time: '10:00',
    end_time: '11:00',
    purpose: '',
    // Multi-day fields
    start_date: todayStr,
    end_date: todayStr,
    daily_start_time: '10:00',
    daily_end_time: '11:00',
  })

  const [errors, setErrors] = useState({})
  const [clashInfo, setClashInfo] = useState(null)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: '' }))
    setClashInfo(null)
  }

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

  const selectedDate = bookingMode === 'single' ? form.booking_date : form.start_date

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await client.get(`/api/resources/${id}/bookings`, { params: { date: selectedDate } })
        setBookings(res.data)
      } catch {
        setBookings([])
      } finally {
        setLoading(false)
      }
    }
    if (id && selectedDate) fetchBookings()
  }, [id, selectedDate])

  const handleSlotClick = (startTime24, endTime24) => {
    set('start_time', startTime24)
    set('end_time', endTime24)
  }

  const timeOptions = resource ? generateTimeOptions(resource.open_time, resource.close_time) : []

  const handleSubmit = async (e) => {
    e.preventDefault()
    setClashInfo(null)

    if (bookingMode === 'single') {
      const errs = {}
      if (!form.booking_date) errs.booking_date = 'Select a date'
      if (!form.start_time) errs.start_time = 'Select a start time'
      if (!form.end_time) errs.end_time = 'Select an end time'
      if (!form.purpose.trim()) errs.purpose = 'Purpose is required'

      if (form.start_time >= form.end_time) {
        errs.end_time = 'End time must be after start time'
      }

      if (Object.keys(errs).length) { setErrors(errs); return }

      setSubmitting(true)
      try {
        const startISO = new Date(`${form.booking_date}T${form.start_time}:00`).toISOString()
        const endISO = new Date(`${form.booking_date}T${form.end_time}:00`).toISOString()

        const res = await client.post('/api/bookings', {
          resource_id: parseInt(id),
          start_time: startISO,
          end_time: endISO,
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
          const detail = data?.detail
          if (typeof detail === 'object') {
            if (detail.errors) setErrors(detail.errors)
            const firstErr = detail.message || (detail.errors ? Object.values(detail.errors)[0] : 'Validation error')
            addToast(firstErr, 'error')
          } else {
            addToast(typeof detail === 'string' ? detail : 'Validation error', 'error')
          }
        } else {
          addToast(data?.detail || 'Failed to complete booking', 'error')
        }
      } finally {
        setSubmitting(false)
      }
    } else {
      // Multi-day booking flow
      const errs = {}
      if (!form.start_date) errs.start_date = 'Select start date'
      if (!form.end_date) errs.end_date = 'Select end date'
      if (!form.daily_start_time) errs.daily_start_time = 'Select start time'
      if (!form.daily_end_time) errs.daily_end_time = 'Select end time'
      if (!form.purpose.trim()) errs.purpose = 'Purpose is required'

      if (form.daily_start_time >= form.daily_end_time) {
        errs.daily_end_time = 'End time must be after start time'
      }

      const dStart = new Date(form.start_date)
      const dEnd = new Date(form.end_date)
      if (dEnd < dStart) errs.end_date = 'End date cannot be before start date'

      if (Object.keys(errs).length) { setErrors(errs); return }

      // Generate dates list
      const dateList = []
      let cur = new Date(dStart)
      while (cur <= dEnd) {
        dateList.push(cur.toISOString().split('T')[0])
        cur.setDate(cur.getDate() + 1)
      }

      if (dateList.length > 7) {
        setErrors({ end_date: 'Multi-day booking is capped at max 7 consecutive days' })
        return
      }

      setSubmitting(true)
      let createdBooking = null

      try {
        for (const dStr of dateList) {
          const sISO = new Date(`${dStr}T${form.daily_start_time}:00`).toISOString()
          const eISO = new Date(`${dStr}T${form.daily_end_time}:00`).toISOString()

          const res = await client.post('/api/bookings', {
            resource_id: parseInt(id),
            start_time: sISO,
            end_time: eISO,
            purpose: `${form.purpose} (${dStr})`,
          })
          if (!createdBooking) createdBooking = res.data
        }

        addToast(`Created ${dateList.length}-day booking! 🎉`, 'success')
        navigate('/booking-success', { state: { booking: createdBooking, resource } })
      } catch (err) {
        const data = err.response?.data
        if (err.response?.status === 409) {
          setClashInfo(data?.detail?.clashing_slot)
          addToast(`Slot clash detected! Could not complete all days.`, 'error')
        } else {
          const detail = data?.detail
          const msg = typeof detail === 'object' ? (detail.message || 'Validation error') : (detail || 'Booking failed')
          addToast(msg, 'error')
        }
      } finally {
        setSubmitting(false)
      }
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

        {/* Back Button */}
        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/resources')} style={{ marginBottom: 20 }}>
          ← Back to Resources
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 28, alignItems: 'start' }}>

          {/* Left: Resource Info + Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Resource Card */}
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
                <span>⏰ Operating Hours: <strong style={{ color: 'var(--gold)' }}>{formatTime12(resource.open_time)} – {formatTime12(resource.close_time)}</strong></span>
              </div>
            </div>

            {/* Timeline */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700 }}>
                  Availability Schedule
                </h2>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', colorScheme: 'dark' }}
                  value={selectedDate}
                  min={todayStr}
                  onChange={e => {
                    if (bookingMode === 'single') set('booking_date', e.target.value)
                    else set('start_date', e.target.value)
                  }}
                />
              </div>
              {loading
                ? <div className="skeleton" style={{ height: 84 }} />
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
                  ✓ Fully available on {selectedDate}
                </p>
              )}
            </div>
          </div>

          {/* Right: Easy Booking Form with Date + AM/PM Time Dropdowns */}
          <div className="card" style={{ padding: 24, position: 'sticky', top: 'calc(var(--navbar-h) + 20px)' }}>

            {/* Booking Mode Tabs */}
            <div className="filter-tabs" style={{ marginBottom: 20, width: '100%' }}>
              <button
                type="button"
                className={`filter-tab ${bookingMode === 'single' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center' }}
                onClick={() => setBookingMode('single')}
              >
                Single Day
              </button>
              <button
                type="button"
                className={`filter-tab ${bookingMode === 'multi' ? 'active' : ''}`}
                style={{ flex: 1, textAlign: 'center' }}
                onClick={() => setBookingMode('multi')}
              >
                Multi-Day
              </button>
            </div>

            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, marginBottom: 16 }}>
              {bookingMode === 'single' ? 'Reserve a Time Slot' : 'Multi-Day Recurring Schedule'}
            </h2>

            {clashInfo && (
              <div style={{
                background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)',
                borderRadius: 'var(--radius)', padding: 14, marginBottom: 16, fontSize: '0.8125rem'
              }}>
                <p style={{ fontWeight: 600, color: '#f87171', marginBottom: 4 }}>⚠ Time Slot Conflict</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Clashes with an existing booking ({formatTimeOnly(clashInfo.start_time)} – {formatTimeOnly(clashInfo.end_time)})
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {bookingMode === 'single' ? (
                <>
                  {/* Date Input */}
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

                  {/* 12-Hour AM/PM Time Dropdowns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Start Time</label>
                      <select
                        className={`form-select ${errors.start_time ? 'error' : ''}`}
                        value={form.start_time}
                        onChange={e => set('start_time', e.target.value)}
                      >
                        {timeOptions.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
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
                        {timeOptions.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      {errors.end_time && <div className="form-error">⚠ {errors.end_time}</div>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Multi-Day Mode */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input
                        type="date"
                        className={`form-input ${errors.start_date ? 'error' : ''}`}
                        value={form.start_date}
                        min={todayStr}
                        onChange={e => set('start_date', e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                      {errors.start_date && <div className="form-error">⚠ {errors.start_date}</div>}
                    </div>

                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input
                        type="date"
                        className={`form-input ${errors.end_date ? 'error' : ''}`}
                        value={form.end_date}
                        min={form.start_date || todayStr}
                        onChange={e => set('end_date', e.target.value)}
                        style={{ colorScheme: 'dark' }}
                      />
                      {errors.end_date && <div className="form-error">⚠ {errors.end_date}</div>}
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--gold)', marginBottom: 10 }}>
                      ⏰ Daily Time Window (Applies Each Day)
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label">Daily Start</label>
                        <select
                          className="form-select"
                          value={form.daily_start_time}
                          onChange={e => set('daily_start_time', e.target.value)}
                        >
                          {timeOptions.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Daily End</label>
                        <select
                          className="form-select"
                          value={form.daily_end_time}
                          onChange={e => set('daily_end_time', e.target.value)}
                        >
                          {timeOptions.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Purpose */}
              <div className="form-group">
                <label className="form-label">Purpose / Event Details</label>
                <textarea
                  className={`form-textarea ${errors.purpose ? 'error' : ''}`}
                  placeholder="Describe purpose of booking (e.g., Club Meeting, Practice)..."
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  rows={3}
                />
                {errors.purpose && <div className="form-error">⚠ {errors.purpose}</div>}
              </div>

              {/* Duration Preview */}
              {form.start_time && form.end_time && (
                <div style={{
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)',
                  padding: '10px 14px', fontSize: '0.8125rem', color: 'var(--text-muted)',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                  <span>Selected Window:</span>
                  <strong style={{ color: 'var(--gold)' }}>
                    {formatTime12(form.start_time)} – {formatTime12(form.end_time)}
                  </strong>
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting}>
                {submitting ? <><div className="spinner" /> Submitting...</> : (
                  bookingMode === 'single' ? 'Confirm Booking →' : 'Confirm Multi-Day Booking →'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
