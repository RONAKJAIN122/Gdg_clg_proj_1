import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Footer from '../components/Footer'
import { formatTime12 } from '../utils/format'

const CATEGORY_CARDS = [
  {
    id: 'hall',
    title: 'Auditoriums & Halls',
    icon: '🏛️',
    badge: 'Popular',
    desc: 'Auditoriums 1, 2 (AC) & 3 — featuring 300-seat capacity, stage lighting, and Dolby audio systems.',
    tags: ['Auditorium 1', 'Auditorium 2 (AC)', 'Auditorium 3'],
    path: '/resources?category=hall',
    accent: 'rgba(192, 72, 79, 0.15)',
    border: 'rgba(192, 72, 79, 0.3)',
  },
  {
    id: 'equipment',
    title: 'Media & Camera Gear',
    icon: '📷',
    badge: 'High Demand',
    desc: 'Sony DSLRs, heavy-duty tripods, and wireless lapel mics for campus media, photography & club events.',
    tags: ['Sony DSLR', 'Tripods', 'Wireless Mics'],
    path: '/resources?category=equipment',
    accent: 'rgba(184, 149, 15, 0.15)',
    border: 'rgba(184, 149, 15, 0.3)',
  },
  {
    id: 'room',
    title: 'Lecture Halls & Labs',
    icon: '🚪',
    badge: 'Timetable Checked',
    desc: 'LT-1, LT-2 and specialized lab spaces with automated timetable overlap checking.',
    tags: ['LT-1', 'LT-2', 'Lecture Rooms'],
    path: '/resources?category=room',
    accent: 'rgba(37, 99, 235, 0.15)',
    border: 'rgba(37, 99, 235, 0.3)',
  },
  {
    id: 'other',
    title: 'SAC & Sports Grounds',
    icon: '⚽',
    badge: 'Activity Hub',
    desc: 'SAC Music Room, Football field, Volleyball court, and Tennis grounds for sports & cultural practice.',
    tags: ['SAC Music Room', 'Football Ground', 'Tennis Court'],
    path: '/resources?category=other',
    accent: 'rgba(22, 163, 74, 0.15)',
    border: 'rgba(22, 163, 74, 0.3)',
  },
]

const HOW_IT_WORKS = [
  {
    step: '01',
    icon: '🔍',
    title: 'Choose Resource & Slot',
    desc: 'Pick your desired hall, gear, or ground. View live 12-hour AM/PM timelines for exact slot availability.',
  },
  {
    step: '02',
    icon: '🔑',
    title: 'Passwordless OTP Sign In',
    desc: 'Log in securely with your @lnmiit.ac.in email using instant Ethereal Mail OTP verification.',
  },
  {
    step: '03',
    icon: '⚡',
    title: 'Instant Lock & Reminders',
    desc: 'Database row-locking guarantees zero double-bookings. Receive automated email reminders 1 hour before.',
  },
]

const STATS = [
  { value: '8+',        label: 'Campus Resources' },
  { value: '9am–9pm',   label: 'Booking Hours' },
  { value: '100%',      label: 'Conflict Prevention' },
  { value: '0',         label: 'Paperwork Required' },
]

function generateHomeTimeOptions() {
  const options = []
  for (let h = 9; h <= 20; h++) {
    for (let m of [0, 30]) {
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      options.push({ value: val, label: formatTime12(val) })
    }
  }
  return options
}

function calcEndTime(start24) {
  if (!start24) return '11:00'
  const [h, m] = start24.split(':').map(Number)
  let endH = h + 1
  let endM = m
  if (endH > 21 || (endH === 21 && endM > 0)) {
    endH = 21
    endM = 0
  }
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
}

export default function Home() {
  const { isLoggedIn } = useAuth()
  const navigate = useNavigate()

  const todayStr = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    type: '',
    date: todayStr,
    time: '10:00',
    purpose: '',
  })

  const timeOptions = generateHomeTimeOptions()
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleContinue = (e) => {
    e.preventDefault()

    const draft = {
      type: form.type,
      date: form.date || todayStr,
      start_time: form.time || '10:00',
      end_time: calcEndTime(form.time || '10:00'),
      purpose: form.purpose || '',
    }
    sessionStorage.setItem('bookingFormDraft', JSON.stringify(draft))

    const targetUrl = form.type ? `/resources?category=${form.type}` : '/resources'

    if (!isLoggedIn) {
      sessionStorage.setItem('redirectAfterLogin', targetUrl)
      navigate('/login')
    } else {
      navigate(targetUrl, { state: { draft } })
    }
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      
      {/* ── MAKEMYTRIP STYLE HERO SECTION ── */}
      <section className="mmt-hero">
        <div className="container mmt-hero-container">
          
          {/* Eyebrow tag */}
          <div className="animate-fade-up">
            <span className="mmt-hero-tag">
              🏛️ LNMIIT SMART CAMPUS PORTAL
            </span>
          </div>

          {/* Main Title */}
          <h1 className="mmt-hero-title animate-fade-up" style={{ animationDelay: '0.05s' }}>
            Book Campus Auditoriums, Lecture Halls &amp; Equipment
          </h1>

          {/* Floating Search Widget (MakeMyTrip Style) */}
          <div className="mmt-search-card animate-fade-up" style={{ animationDelay: '0.1s' }}>
            
            {/* MakeMyTrip 4-Column Fields Grid */}
            <form onSubmit={handleContinue}>
              <div className="mmt-fields-grid">
                
                {/* Field 1: Category */}
                <div className="mmt-field-box">
                  <span className="mmt-field-label">CATEGORY</span>
                  <select
                    className="mmt-field-select"
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                  >
                    <option value="">All Resource Categories</option>
                    <option value="hall">🏛️ Auditoriums &amp; Halls</option>
                    <option value="equipment">📷 Media &amp; Camera Gear</option>
                    <option value="room">🚪 Lecture Halls &amp; Labs</option>
                    <option value="other">⚽ SAC &amp; Sports Grounds</option>
                  </select>
                </div>

                {/* Field 2: Date */}
                <div className="mmt-field-box">
                  <span className="mmt-field-label">BOOKING DATE</span>
                  <input
                    type="date"
                    className="mmt-field-input"
                    value={form.date}
                    min={todayStr}
                    onChange={e => set('date', e.target.value)}
                  />
                </div>

                {/* Field 3: Start Time */}
                <div className="mmt-field-box">
                  <span className="mmt-field-label">START TIME (12H AM/PM)</span>
                  <select
                    className="mmt-field-select"
                    value={form.time}
                    onChange={e => set('time', e.target.value)}
                  >
                    {timeOptions.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Field 4: Event Purpose */}
                <div className="mmt-field-box">
                  <span className="mmt-field-label">EVENT PURPOSE / CLUB</span>
                  <input
                    type="text"
                    className="mmt-field-input"
                    placeholder="e.g. Club Meet, Practice..."
                    value={form.purpose}
                    onChange={e => set('purpose', e.target.value)}
                  />
                </div>

              </div>

              {/* Floating Action Button (Overlapping Card Bottom) */}
              <div className="mmt-search-btn-wrapper">
                <button type="submit" className="mmt-search-btn">
                  SEARCH AVAILABLE RESOURCES →
                </button>
              </div>
            </form>

          </div>

          {/* Quick Stats Grid below Hero Card */}
          <div className="stats-grid animate-fade-up stagger" style={{ animationDelay: '0.25s', marginTop: 52 }}>
            {STATS.map(s => (
              <div key={s.label} className="stat-card" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
                <span className="stat-number" style={{ color: 'var(--gold)' }}>{s.value}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── FEATURED CAMPUS CATEGORIES ── */}
      <section className="section" style={{ padding: '60px 0' }}>
        <div className="container">
          
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="hero-eyebrow" style={{ display: 'inline-block', marginBottom: 10 }}>
              ✦ Campus Facilities
            </span>
            <h2 className="section-title" style={{ fontSize: '2rem' }}>
              Explore Everything Available to Book
            </h2>
            <p className="section-desc" style={{ maxWidth: 540, margin: '0 auto' }}>
              Select a category to view live availability, operating hours, and schedule timeline.
            </p>
          </div>

          {/* Category Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}>
            {CATEGORY_CARDS.map(cat => (
              <div
                key={cat.id}
                onClick={() => navigate(cat.path)}
                className="card card-hover"
                style={{
                  padding: 28,
                  cursor: 'pointer',
                  borderRadius: 'var(--radius-xl)',
                  background: 'var(--card)',
                  border: `1px solid ${cat.border}`,
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Background glow tint */}
                <div style={{
                  position: 'absolute',
                  top: -20, right: -20,
                  width: 100, height: 100,
                  background: cat.accent,
                  borderRadius: '50%',
                  filter: 'blur(30px)',
                  pointerEvents: 'none',
                }} />

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <div style={{
                      width: 52, height: 52,
                      background: cat.accent,
                      borderRadius: 'var(--radius)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.6rem',
                    }}>
                      {cat.icon}
                    </div>
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: 12,
                      background: 'var(--bg-elevated)',
                      color: 'var(--gold)',
                      border: '1px solid var(--border)',
                    }}>
                      {cat.badge}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                    {cat.title}
                  </h3>

                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: 18 }}>
                    {cat.desc}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                    {cat.tags.map(t => (
                      <span key={t} style={{
                        fontSize: '0.72rem',
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border)',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>

                  <div style={{
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--maroon)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}>
                    Browse Category →
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── LNMIIT CAMPUS SPOTLIGHT ── */}
      <section style={{ padding: '20px 0 60px 0' }}>
        <div className="container">
          <div className="card" style={{
            padding: 0,
            overflow: 'hidden',
            borderRadius: 'var(--radius-xl)',
            border: '1px solid var(--border)',
            background: 'var(--card)',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', alignItems: 'center' }}>
              
              {/* Left Column: Campus Information */}
              <div style={{ padding: '44px 40px' }}>
                <span className="hero-eyebrow" style={{ marginBottom: 14, display: 'inline-block' }}>
                  🏛️ LNMIIT JAIPUR CAMPUS
                </span>
                <h2 style={{ fontSize: '1.85rem', fontWeight: 800, marginBottom: 14, color: 'var(--text-primary)', lineHeight: 1.25 }}>
                  The LNM Institute of Information Technology
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.7, marginBottom: 24 }}>
                  Empowering over 2,000+ students, faculty members, and active student societies with unified digital resource management.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                  {[
                    { icon: '📍', text: 'Jaipur, Rajasthan — 100-acre green campus' },
                    { icon: '⚡', text: 'Real-time timeline visualization & 12-hour AM/PM display' },
                    { icon: '🔒', text: 'Strict student booking limits (Max 2 active upcoming)' },
                    { icon: '📧', text: 'Automated email reminders 1 hour before start' },
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      <span style={{ fontSize: '1.05rem' }}>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>

                <button className="btn btn-primary btn-lg" onClick={() => navigate('/resources')}>
                  Explore Campus Directory →
                </button>
              </div>

              {/* Right Column: Campus Image Showcase */}
              <div style={{ position: 'relative', minHeight: 340, height: '100%', overflow: 'hidden' }}>
                <img
                  src="https://lnmiit.ac.in/wp-content/uploads/elementor/thumbs/360-VIEW-OF-LNMIIT-qldsbtsd381ucrq40uxr78t3sge51xhpj15jmmwkvs.jpg"
                  alt="360 View of LNMIIT Campus"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    minHeight: 340,
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to right, var(--card) 0%, transparent 25%, transparent 75%, var(--card) 100%), linear-gradient(to top, rgba(15,17,21,0.7) 0%, transparent 60%)',
                }} />
                
                <div style={{
                  position: 'absolute',
                  bottom: 20,
                  left: 20,
                  right: 20,
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{
                    background: 'rgba(15,17,21,0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    color: 'var(--gold)',
                    border: '1px solid var(--border)',
                    fontWeight: 600
                  }}>
                    📍 Jaipur, Rajasthan
                  </span>

                  <span style={{
                    background: 'rgba(15,17,21,0.85)',
                    backdropFilter: 'blur(8px)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border)',
                    fontWeight: 500
                  }}>
                    LNMIIT Campus View
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="section" style={{ padding: '40px 0 60px 0' }}>
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 40 }}>
            <span className="hero-eyebrow" style={{ display: 'inline-block', marginBottom: 10 }}>
              ✦ Simple Workflow
            </span>
            <h2 className="section-title" style={{ fontSize: '2rem' }}>
              How Campus Reservations Work
            </h2>
            <p className="section-desc" style={{ maxWidth: 500, margin: '0 auto' }}>
              Book in under 2 minutes with zero paperwork and instant email notification.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 24,
          }}>
            {HOW_IT_WORKS.map((h, i) => (
              <div key={i} className="card" style={{
                padding: 32,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                position: 'relative',
              }}>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: 'var(--maroon)',
                  opacity: 0.3,
                  position: 'absolute',
                  top: 20, right: 24,
                }}>
                  {h.step}
                </div>
                <div style={{
                  width: 52, height: 52,
                  background: 'var(--maroon-dim)',
                  borderRadius: 'var(--radius)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem',
                  marginBottom: 20,
                }}>
                  {h.icon}
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
                  {h.title}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {h.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CALL TO ACTION BANNER ── */}
      <section style={{ padding: '20px 0 80px 0' }}>
        <div className="container">
          <div style={{
            background: 'linear-gradient(135deg, rgba(142,30,36,0.3) 0%, rgba(122,15,23,0.15) 100%)',
            border: '1px solid rgba(142,30,36,0.35)',
            borderRadius: 'var(--radius-xl)',
            padding: '52px 40px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: '50%', height: 2,
              background: 'linear-gradient(90deg, transparent, var(--maroon), transparent)',
            }} />
            <h2 style={{ fontSize: '2.1rem', fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)' }}>
              Ready to Book a Campus Resource?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 32, maxWidth: 500, margin: '0 auto 32px', fontSize: '0.95rem' }}>
              Check availability and reserve your slot instantly. No paper approvals, no hassle.
            </p>
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/resources')}>
                Browse Campus Resources →
              </button>
              {isLoggedIn ? (
                <button className="btn btn-secondary btn-lg" onClick={() => navigate('/my-bookings')}>
                  View My Bookings
                </button>
              ) : (
                <button className="btn btn-secondary btn-lg" onClick={() => navigate('/login')}>
                  Sign In with LNMIIT Email
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
