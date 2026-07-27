import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'

const TABS = [
  { value: '',           label: 'All' },
  { value: 'confirmed',  label: 'Confirmed' },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
]

import { formatDateTime, formatTimeOnly } from '../utils/format'

export default function MyBookings() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [activeTab, setActiveTab] = useState('')
  const [bookings, setBookings] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const LIMIT = 10

  const fetchBookings = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (activeTab) params.status = activeTab
      const res = await client.get('/api/bookings/me', { params })
      setBookings(res.data.data)
      setTotal(res.data.total)
    } catch { setBookings([]) }
    finally { setLoading(false) }
  }, [page, activeTab])

  useEffect(() => { fetchBookings() }, [fetchBookings])

  const handleCancel = async (bookingId) => {
    // Optimistic update
    setBookings(prev =>
      prev.map(b => b.id === bookingId ? { ...b, status: 'cancelled' } : b)
    )
    try {
      await client.patch(`/api/bookings/${bookingId}/cancel`)
      addToast('Booking cancelled', 'success')
      fetchBookings()
    } catch (err) {
      // Rollback
      fetchBookings()
      addToast(err.response?.data?.detail || 'Failed to cancel booking', 'error')
    }
  }

  const canCancel = (b) => {
    return b.status === 'confirmed' && new Date(b.start_time) > new Date()
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
            <h3>No bookings found</h3>
            <p style={{ marginBottom: 24 }}>
              {activeTab
                ? `No ${activeTab} bookings`
                : "You haven't made any bookings yet"}
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
                    {formatDateTime(b.start_time)} → {formatTimeOnly(b.end_time)}
                  </div>
                  {b.purpose && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      {b.purpose}
                    </div>
                  )}
                </div>

                <div className="booking-item-actions">
                  <span className={`badge badge-${b.status}`}>{b.status}</span>
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
                    onClick={() => navigate(`/resources/${b.resource_id}`)}
                  >
                    View →
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

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
