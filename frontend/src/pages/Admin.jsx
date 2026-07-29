import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import client from '../api/client'

const STATUS_OPTS = [
  { value: '', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function parseDt(isoStr) {
  if (!isoStr) return new Date()
  return new Date(isoStr.endsWith('Z') || isoStr.includes('+') ? isoStr : isoStr + 'Z')
}

function fmt(dt) {
  return parseDt(dt).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true
  })
}

export default function Admin() {
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('bookings') // bookings | resources

  // ── Bookings ──
  const [bookings, setBookings] = useState([])
  const [bTotal, setBTotal] = useState(0)
  const [bPage, setBPage] = useState(1)
  const [bLoading, setBLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const BLIMIT = 15

  // ── Resources ──
  const [resources, setResources] = useState([])
  const [rLoading, setRLoading] = useState(false)
  const [showResourceForm, setShowResourceForm] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [rForm, setRForm] = useState({ name: '', description: '', location: '', category: 'hall', open_time: '09:00', close_time: '21:00' })
  const [rSubmitting, setRSubmitting] = useState(false)

  const fetchBookings = useCallback(async () => {
    setBLoading(true)
    try {
      const params = { page: bPage, limit: BLIMIT }
      if (statusFilter) params.status = statusFilter
      if (dateFilter) params.date = dateFilter
      const res = await client.get('/api/admin/bookings', { params })
      setBookings(res.data.data)
      setBTotal(res.data.total)
    } catch { setBookings([]) }
    finally { setBLoading(false) }
  }, [bPage, statusFilter, dateFilter])

  const fetchResources = useCallback(async () => {
    setRLoading(true)
    try {
      const res = await client.get('/api/resources', { params: { page: 1, limit: 50 } })
      setResources(res.data.data)
    } catch { setResources([]) }
    finally { setRLoading(false) }
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])
  useEffect(() => { fetchResources() }, [fetchResources])

  const handleAdminCancel = async (id) => {
    try {
      await client.patch(`/api/bookings/${id}/cancel`)
      addToast('Booking cancelled', 'success')
      fetchBookings()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to cancel', 'error')
    }
  }

  const handleSaveResource = async (e) => {
    e.preventDefault()
    setRSubmitting(true)
    try {
      if (editingResource) {
        await client.patch(`/api/resources/${editingResource.id}`, rForm)
        addToast('Resource updated', 'success')
      } else {
        await client.post('/api/resources', rForm)
        addToast('Resource created', 'success')
      }
      setShowResourceForm(false)
      setEditingResource(null)
      setRForm({ name: '', description: '', location: '', category: 'hall', open_time: '09:00', close_time: '21:00' })
      fetchResources()
    } catch (err) {
      addToast(err.response?.data?.detail || 'Failed to save', 'error')
    } finally { setRSubmitting(false) }
  }

  const handleDeleteResource = async (id) => {
    if (!window.confirm('Deactivate this resource? Existing bookings will be unaffected.')) return
    try {
      await client.delete(`/api/resources/${id}`)
      addToast('Resource deactivated', 'success')
      fetchResources()
    } catch { addToast('Failed to deactivate', 'error') }
  }

  const startEdit = (r) => {
    setEditingResource(r)
    setRForm({ name: r.name, description: r.description || '', location: r.location || '', category: r.category, open_time: r.open_time, close_time: r.close_time })
    setShowResourceForm(true)
  }

  const bTotalPages = Math.ceil(bTotal / BLIMIT)

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 60 }}>

        <div className="page-header">
          <div className="page-header-top">
            <div>
              <h1 className="page-title">Admin Panel</h1>
              <p className="page-subtitle">Manage resources and all campus bookings</p>
            </div>
          </div>

          <div className="filter-tabs" style={{ marginTop: 24 }}>
            {[
              { value: 'bookings', label: '📅 All Bookings' },
              { value: 'resources', label: '🏛️ Resources' },
            ].map(t => (
              <button
                key={t.value}
                className={`filter-tab ${activeTab === t.value ? 'active' : ''}`}
                onClick={() => setActiveTab(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Bookings Tab ── */}
        {activeTab === 'bookings' && (
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="form-select"
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={e => { setStatusFilter(e.target.value); setBPage(1) }}
              >
                {STATUS_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                type="date"
                className="form-input"
                style={{ width: 'auto', colorScheme: 'dark' }}
                value={dateFilter}
                onChange={e => { setDateFilter(e.target.value); setBPage(1) }}
              />
              {dateFilter && (
                <button className="btn btn-ghost btn-sm" onClick={() => setDateFilter('')}>Clear date</button>
              )}
              <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginLeft: 'auto' }}>
                {bTotal} total booking{bTotal !== 1 ? 's' : ''}
              </span>
            </div>

            {bLoading ? (
              <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-lg)' }} />
            ) : bookings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>No bookings found</h3>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>User</th>
                      <th>Resource</th>
                      <th>Start</th>
                      <th>End</th>
                      <th>Purpose</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(b => (
                      <tr key={b.id}>
                        <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{b.id}</td>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{b.user?.name || '—'}</div>
                          <div style={{ fontSize: '0.75rem' }}>{b.user?.email}</div>
                        </td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{b.resource?.name || '—'}</td>
                        <td>{fmt(b.start_time)}</td>
                        <td>{fmt(b.end_time)}</td>
                        <td style={{ maxWidth: 160 }}>
                          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {b.purpose || '—'}
                          </div>
                        </td>
                        <td><span className={`badge badge-${b.status}`}>{b.status}</span></td>
                        <td>
                          {b.status === 'confirmed' && parseDt(b.start_time) > new Date() && (
                            <button
                              className="btn btn-ghost btn-sm"
                              style={{ color: '#f87171' }}
                              onClick={() => handleAdminCancel(b.id)}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {bTotalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={bPage === 1} onClick={() => setBPage(p => p - 1)}>←</button>
                {Array.from({ length: bTotalPages }, (_, i) => i + 1).slice(0, 8).map(p => (
                  <button key={p} className={`page-btn ${p === bPage ? 'active' : ''}`} onClick={() => setBPage(p)}>{p}</button>
                ))}
                <button className="page-btn" disabled={bPage === bTotalPages} onClick={() => setBPage(p => p + 1)}>→</button>
              </div>
            )}
          </div>
        )}

        {/* ── Resources Tab ── */}
        {activeTab === 'resources' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
              <button
                className="btn btn-primary"
                onClick={() => { setShowResourceForm(true); setEditingResource(null); setRForm({ name: '', description: '', location: '', category: 'hall', open_time: '09:00', close_time: '21:00' }) }}
              >
                + Add Resource
              </button>
            </div>

            {/* Resource Form */}
            {showResourceForm && (
              <div className="card" style={{ padding: 28, marginBottom: 24 }}>
                <h3 style={{ fontWeight: 700, marginBottom: 20 }}>
                  {editingResource ? `Edit: ${editingResource.name}` : 'New Resource'}
                </h3>
                <form onSubmit={handleSaveResource} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Name</label>
                    <input className="form-input" required value={rForm.name} onChange={e => setRForm(p => ({...p, name: e.target.value}))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={rForm.category} onChange={e => setRForm(p => ({...p, category: e.target.value}))}>
                      <option value="hall">Hall</option>
                      <option value="equipment">Equipment</option>
                      <option value="room">Room</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input className="form-input" value={rForm.location} onChange={e => setRForm(p => ({...p, location: e.target.value}))} placeholder="e.g. Block A, Room 101" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Open Time</label>
                      <input type="time" className="form-input" style={{ colorScheme: 'dark' }} value={rForm.open_time} onChange={e => setRForm(p => ({...p, open_time: e.target.value}))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Close Time</label>
                      <input type="time" className="form-input" style={{ colorScheme: 'dark' }} value={rForm.close_time} onChange={e => setRForm(p => ({...p, close_time: e.target.value}))} />
                    </div>
                  </div>
                  <div className="form-group" style={{ gridColumn: '1/-1' }}>
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" value={rForm.description} onChange={e => setRForm(p => ({...p, description: e.target.value}))} rows={2} />
                  </div>
                  <div style={{ gridColumn: '1/-1', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowResourceForm(false); setEditingResource(null) }}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={rSubmitting}>
                      {rSubmitting ? <><div className="spinner" /> Saving...</> : editingResource ? 'Update Resource' : 'Create Resource'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Resources Table */}
            {rLoading ? (
              <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-lg)' }} />
            ) : (
              <div className="table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Resource</th>
                      <th>Category</th>
                      <th>Location</th>
                      <th>Hours</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resources.map(r => (
                      <tr key={r.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.description?.slice(0, 50)}{r.description?.length > 50 ? '…' : ''}</div>
                        </td>
                        <td><span className="resource-category">{r.category}</span></td>
                        <td>{r.location || '—'}</td>
                        <td>{r.open_time} – {r.close_time}</td>
                        <td>
                          <span className={`badge ${r.is_active ? 'badge-confirmed' : 'badge-cancelled'}`}>
                            {r.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(r)}>Edit</button>
                            {r.is_active && (
                              <button className="btn btn-ghost btn-sm" style={{ color: '#f87171' }} onClick={() => handleDeleteResource(r.id)}>
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
