import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import client from '../api/client'
import { formatTime12 } from '../utils/format'

const CATEGORY_META = {
  hall:      { icon: '🏛️', label: 'Hall',      color: '#c0484f' },
  equipment: { icon: '📷', label: 'Equipment', color: '#b8950f' },
  room:      { icon: '🚪', label: 'Room',       color: '#2563eb' },
  other:     { icon: '📋', label: 'Other',      color: '#6d6d6d' },
}

const ALL_CATEGORIES = [
  { value: '', label: 'All Types' },
  { value: 'hall', label: '🏛️ Halls' },
  { value: 'equipment', label: '📷 Equipment' },
  { value: 'room', label: '🚪 Rooms' },
  { value: 'other', label: '📋 Other' },
]

function ResourceSkeleton() {
  return (
    <div className="resource-card" style={{ cursor: 'default', pointerEvents: 'none' }}>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 12, flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: 16, width: '70%', marginBottom: 8 }} />
          <div className="skeleton" style={{ height: 12, width: '40%' }} />
        </div>
      </div>
      <div className="skeleton" style={{ height: 12, width: '90%', marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 12, width: '60%' }} />
    </div>
  )
}

export default function Resources() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const categoryParam = searchParams.get('category') || ''

  const [resources, setResources] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [category, setCategory] = useState(categoryParam)

  // Sync category if URL search param changes
  useEffect(() => {
    if (categoryParam !== category) {
      setCategory(categoryParam)
    }
  }, [categoryParam])

  const LIMIT = 9

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 400)
    return () => clearTimeout(t)
  }, [searchInput])

  const fetchResources = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, limit: LIMIT }
      if (search) params.search = search
      if (category) params.category = category
      const res = await client.get('/api/resources', { params })
      setResources(res.data.data)
      setTotal(res.data.total)
    } catch {
      setResources([])
    } finally {
      setLoading(false)
    }
  }, [page, search, category])

  useEffect(() => { fetchResources() }, [fetchResources])

  // Auto-open target resource booking portal directly if draft was submitted from Home page
  useEffect(() => {
    const rawDraft = sessionStorage.getItem('bookingFormDraft')
    if (rawDraft && resources.length > 0) {
      const draft = JSON.parse(rawDraft)
      if (!sessionStorage.getItem('autoNavigatedDraft')) {
        sessionStorage.setItem('autoNavigatedDraft', 'true')
        const targetRes = resources.find(r => !draft.type || r.category === draft.type) || resources[0]
        if (targetRes) {
          navigate(`/resources/${targetRes.id}`, { state: { draft }, replace: true })
        }
      }
    }
  }, [resources, navigate])

  const totalPages = Math.ceil(total / LIMIT)

  return (
    <div className="page">
      <div className="container">
        <div className="page-header">
          <div className="page-header-top">
            <div>
              <h1 className="page-title">Campus Resources</h1>
              <p className="page-subtitle">Browse and book available halls, rooms, and equipment</p>
            </div>
          </div>

          {/* Search + Filter */}
          <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar" style={{ flex: 1, minWidth: 240 }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-input"
                placeholder="Search resources, locations..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <div className="filter-tabs">
              {ALL_CATEGORIES.map(c => (
                <button
                  key={c.value}
                  className={`filter-tab ${category === c.value ? 'active' : ''}`}
                  onClick={() => { setCategory(c.value); setPage(1) }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results count */}
        {!loading && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 20 }}>
            {total} resource{total !== 1 ? 's' : ''} found
            {search && <> matching <strong style={{ color: 'var(--text-secondary)' }}>"{search}"</strong></>}
          </p>
        )}

        {/* Grid */}
        <div className="resources-grid stagger">
          {loading
            ? Array(6).fill(0).map((_, i) => <ResourceSkeleton key={i} />)
            : resources.length === 0
              ? (
                <div style={{ gridColumn: '1/-1' }}>
                  <div className="empty-state">
                    <div className="empty-icon">🔍</div>
                    <h3>No resources found</h3>
                    <p>Try a different search or clear the filters</p>
                  </div>
                </div>
              )
              : resources.map(r => {
                  const meta = CATEGORY_META[r.category] || CATEGORY_META.other
                  return (
                    <Link
                      key={r.id}
                      to={`/resources/${r.id}`}
                      className="resource-card animate-fade-up"
                    >
                      <div className="resource-card-header">
                        <div className="resource-icon">{meta.icon}</div>
                        <span className="resource-category">{meta.label}</span>
                      </div>
                      <div>
                        <div className="resource-name">{r.name}</div>
                        {r.location && (
                          <div className="resource-location">
                            <span>📍</span> {r.location}
                          </div>
                        )}
                        {r.description && (
                          <p style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-muted)',
                            marginTop: 8,
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {r.description}
                          </p>
                        )}
                      </div>
                      <div className="resource-hours">
                        <span>⏰</span>
                        Open {formatTime12(r.open_time)} – {formatTime12(r.close_time)}
                      </div>
                    </Link>
                  )
                })
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page === 1}
              onClick={() => setPage(p => p - 1)}
            >
              ←
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                className={`page-btn ${p === page ? 'active' : ''}`}
                onClick={() => setPage(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="page-btn"
              disabled={page === totalPages}
              onClick={() => setPage(p => p + 1)}
            >
              →
            </button>
          </div>
        )}

        <div style={{ height: 60 }} />
      </div>
    </div>
  )
}
