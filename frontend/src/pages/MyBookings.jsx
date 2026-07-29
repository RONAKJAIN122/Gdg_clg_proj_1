import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'

import { parseNaiveDT } from '../utils/format'

const TABS = [
  { value: 'ongoing',  label: 'Ongoing 🟢' },
  { value: 'upcoming', label: 'Upcoming 📅' },
  { value: 'history',  label: 'History 📜' },
]

function parseDt(isoStr) {
  return parseNaiveDT(isoStr)
}

function fmtDT(isoStr) {
  if (!isoStr) return ''
  return parseDt(isoStr).toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit', hour12: true
  })
}
function fmtTime(isoStr) {
  if (!isoStr) return ''
  return parseDt(isoStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

export default function MyBookings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('upcoming')
  const [bookings, setBookings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedBooking, setSelectedBooking] = useState(null)
  const LIMIT = 10

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/api/bookings/me', { params: { page: 1, limit: 100 } })
      const now = new Date()
      
      // Filter out cancelled bookings
      let list = (res.data.data || []).filter(b => b.status !== 'cancelled')
      
      if (activeTab === 'ongoing') {
        // Ongoing: currently active right now (start_time <= now && end_time >= now)
        list = list.filter(b => b.status === 'confirmed' && parseDt(b.start_time) <= now && parseDt(b.end_time) >= now)
      } else if (activeTab === 'upcoming') {
        // Upcoming: future confirmed events (start_time > now)
        list = list.filter(b => b.status === 'confirmed' && parseDt(b.start_time) > now)
      } else if (activeTab === 'history') {
        // History: past events or completed events (end_time < now || status === completed)
        list = list.filter(b => b.status === 'completed' || parseDt(b.end_time) < now)
      }
      
      list.sort((a, b) => parseDt(b.start_time).getTime() - parseDt(a.start_time).getTime())
      
      setBookings(list)
      setTotal(list.length)
    } catch { setBookings([]) }
    finally { setLoading(false) }
  }, [activeTab])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleCancel = async (bookingId) => {
    // Optimistically remove cancelled booking from screen
    setBookings(prev => prev.filter(b => b.id !== bookingId))
    try {
      await client.patch(`/api/bookings/${bookingId}/cancel`)
      addToast('Booking cancelled & removed from list', 'success')
      fetchBookings()
    } catch (err) {
      fetchBookings()
      addToast(err.response?.data?.detail || 'Failed to cancel booking', 'error')
    }
  }

  const canCancel = (b) => {
    if (!b || b.status !== 'confirmed') return false
    return parseDt(b.start_time) > new Date()
  }

  const getStatusBadge = (b) => {
    const now = new Date()
    if (b.status === 'confirmed' && parseDt(b.start_time) <= now && parseDt(b.end_time) >= now) {
      return <span className="badge" style={{ background: '#16a34a', color: '#fff', fontWeight: 700 }}>● ONGOING</span>
    }
    if (b.status === 'confirmed' && parseDt(b.start_time) > now) {
      return <span className="badge badge-confirmed">UPCOMING</span>
    }
    return <span className="badge badge-completed">COMPLETED</span>
  }

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-top">
            <div>
              <h1 className="page-title">My Bookings</h1>
              <p className="page-subtitle">Track and manage your campus resource reservations</p>
            </div>
            <button className="btn btn-primary" onClick={() => navigate('/resources')}>
              + New Booking
            </button>
          </div>

          {/* Status Tabs */}
          <div className="filter-tabs" style={{ marginTop: 24 }}>
            {TABS.map(t => (
              <button
                key={t.value}
                className={`filter-tab ${activeTab === t.value ? 'active' : ''}`}
                onClick={() => { setActiveTab(t.value); setPage(1) }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3].map(i => (
              <div key={i} className="skeleton" style={{ height: 80, borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>
              {activeTab === 'ongoing' ? 'No ongoing bookings right now' :
               activeTab === 'upcoming' ? 'No upcoming bookings scheduled' :
               'No past booking history'}
            </h3>
            <p style={{ marginBottom: 24 }}>
              {activeTab === 'ongoing' ? 'Active events currently taking place will show up here' :
               activeTab === 'upcoming' ? 'Reservations scheduled for future dates will appear here' :
               'Completed and past reservations will be stored here'}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/resources')}>
              Browse Resources
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {bookings.map(b => (
              <div key={b.id} className="booking-item animate-fade-up">
                {/* Resource icon */}
                <div style={{
                  width: 48, height: 48,
                  background: 'var(--maroon-dim)',
                  borderRadius: 'var(--radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.375rem', flexShrink: 0,
                }}>
                  {b.resource?.category === 'hall' ? '🏛️' :
                   b.resource?.category === 'equipment' ? '📷' :
                   b.resource?.category === 'room' ? '🚪' : '📋'}
                </div>

                <div className="booking-item-resource">
                  <div className="booking-item-name">{b.resource?.name || `Resource #${b.resource_id}`}</div>
                  <div className="booking-item-time">
                    <span>📅</span>
                    {fmtDT(b.start_time)} &rarr; {fmtTime(b.end_time)}
                  </div>
                  {b.purpose && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {b.purpose}
                    </div>
                  )}
                </div>

                <div className="booking-item-actions">
                  {getStatusBadge(b)}
                  {canCancel(b) && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCancel(b.id)}
                      style={{ borderColor: 'rgba(220,38,38,0.3)', color: '#f87171' }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedBooking(b)}
                  >
                    View Details →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>←</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            ))}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>→</button>
          </div>
        )}

        {/* Booking Details Modal */}
        {selectedBooking && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20
          }} onClick={() => setSelectedBooking(null)}>
            <div className="card" style={{
              width: '100%',
              maxWidth: 520,
              padding: 28,
              borderRadius: 'var(--radius-lg)',
              boxShadow: 'var(--shadow-lg)',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              position: 'relative'
            }} onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <span className={`badge badge-${selectedBooking.status}`} style={{ marginBottom: 8, display: 'inline-block' }}>
                    {selectedBooking.status.toUpperCase()}
                  </span>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    Booking #{selectedBooking.id} Details
                  </h2>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '1.5rem',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: '0 4px',
                    lineHeight: 1
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Details Content */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{
                  padding: 14,
                  borderRadius: 'var(--radius)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14
                }}>
                  <div style={{
                    width: 44, height: 44,
                    borderRadius: 10,
                    background: 'var(--maroon-dim)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.25rem'
                  }}>
                    {selectedBooking.resource?.category === 'hall' ? '🏛️' :
                     selectedBooking.resource?.category === 'equipment' ? '📷' :
                     selectedBooking.resource?.category === 'room' ? '🚪' : '📋'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                      {selectedBooking.resource?.name || `Resource #${selectedBooking.resource_id}`}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Category: {selectedBooking.resource?.category?.toUpperCase() || 'GENERAL'} {selectedBooking.resource?.location ? `• ${selectedBooking.resource.location}` : ''}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                      START TIME
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {fmtDT(selectedBooking.start_time)}
                    </div>
                  </div>
                  <div style={{ padding: 12, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                      END TIME
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                      {fmtDT(selectedBooking.end_time)}
                    </div>
                  </div>
                </div>

                {selectedBooking.purpose && (
                  <div style={{ padding: 12, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                      PURPOSE / REASON
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {selectedBooking.purpose}
                    </div>
                  </div>
                )}

                <div style={{ padding: 12, borderRadius: 'var(--radius)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                    RESERVED BY
                  </div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {user?.name} ({user?.email})
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                {canCancel(selectedBooking) && (
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      const id = selectedBooking.id
                      setSelectedBooking(null)
                      handleCancel(id)
                    }}
                    style={{ borderColor: 'rgba(220,38,38,0.3)', color: '#f87171' }}
                  >
                    Cancel Booking
                  </button>
                )}
                <button className="btn btn-primary" onClick={() => setSelectedBooking(null)}>
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
