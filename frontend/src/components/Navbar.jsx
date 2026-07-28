import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useTheme } from '../context/ThemeContext'

const BOOKING_ITEMS = [
  { label: 'Hall Booking',      icon: '🏛️', path: '/book/hall' },
  { label: 'Equipment Booking', icon: '📷', path: '/book/equipment' },
  { label: 'Room Booking',      icon: '🚪', path: '/book/room' },
  { label: 'Other Requests',    icon: '📋', path: '/book/other' },
]

const USER_MENU_ITEMS = [
  { label: 'Dashboard',   icon: '📊', path: '/dashboard' },
  { label: 'My Bookings', icon: '📅', path: '/my-bookings' },
  { label: 'Settings',    icon: '⚙️', path: '/settings' },
]

export default function Navbar() {
  const { user, logout, isAdmin, isLoggedIn } = useAuth()
  const { addToast } = useToast()
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()

  const [bookingOpen, setBookingOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const bookingRef = useRef()
  const userRef = useRef()
  const bookingTimeoutRef = useRef()
  const userTimeoutRef = useRef()

  const handleBookingEnter = () => {
    if (bookingTimeoutRef.current) clearTimeout(bookingTimeoutRef.current)
    setBookingOpen(true)
  }
  const handleBookingLeave = () => {
    bookingTimeoutRef.current = setTimeout(() => {
      setBookingOpen(false)
    }, 180)
  }

  const handleUserEnter = () => {
    if (userTimeoutRef.current) clearTimeout(userTimeoutRef.current)
    setUserMenuOpen(true)
  }
  const handleUserLeave = () => {
    userTimeoutRef.current = setTimeout(() => {
      setUserMenuOpen(false)
    }, 180)
  }

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (bookingRef.current && !bookingRef.current.contains(e.target)) setBookingOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on route change
  useEffect(() => {
    setBookingOpen(false)
    setUserMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    addToast('Logged out successfully', 'success')
    navigate('/')
  }

  const handleBookingNav = (path) => {
    if (!isLoggedIn) {
      sessionStorage.setItem('redirectAfterLogin', path)
      navigate('/login')
    } else {
      navigate(path)
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <nav className="navbar">
      <div className="container navbar-inner">

        {/* Logo */}
        <Link to="/" className="navbar-logo">
          <div className="navbar-logo-icon">LN</div>
          <div className="navbar-logo-text">
            <span className="navbar-logo-name">LNMIIT</span>
            <span className="navbar-logo-sub">Smart Booking Portal</span>
          </div>
        </Link>

        {/* Nav Links */}
        <ul className="navbar-nav">
          <li>
            <Link
              to="/"
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              Home
            </Link>
          </li>
          <li>
            <Link
              to="/resources"
              className={`nav-link ${location.pathname.startsWith('/resources') ? 'active' : ''}`}
            >
              Resources
            </Link>
          </li>

          {/* Make a Booking Dropdown */}
          <li
            className="nav-dropdown"
            ref={bookingRef}
            onMouseEnter={handleBookingEnter}
            onMouseLeave={handleBookingLeave}
          >
            <button
              className={`nav-link ${location.pathname.startsWith('/book') ? 'active' : ''}`}
              onClick={() => setBookingOpen(o => !o)}
              aria-expanded={bookingOpen}
            >
              Make a Booking
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="currentColor"
                style={{ transform: bookingOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
              >
                <path d="M6 8L1 3h10z" />
              </svg>
            </button>
            {bookingOpen && (
              <div className="nav-dropdown-menu">
                {BOOKING_ITEMS.map(item => (
                  <button
                    key={item.path}
                    className="nav-dropdown-item"
                    onClick={() => handleBookingNav(item.path)}
                  >
                    <span className="item-icon">{item.icon}</span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </li>

          {isAdmin && (
            <li>
              <Link
                to="/admin"
                className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
              >
                Admin
              </Link>
            </li>
          )}
        </ul>

        {/* Actions */}
        <div className="navbar-actions">
          <button
            className="theme-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {isLoggedIn ? (
            <>
              {/* User Avatar */}
              <div
                className="user-menu"
                ref={userRef}
                onMouseEnter={handleUserEnter}
                onMouseLeave={handleUserLeave}
              >
                <div className="user-avatar" onClick={() => setUserMenuOpen(o => !o)} title={user.name}>
                  {initials}
                </div>
                {userMenuOpen && (
                  <div className="user-dropdown">
                    <div className="user-dropdown-header">
                      <div className="user-dropdown-name">{user.name}</div>
                      <div className="user-dropdown-email">{user.email}</div>
                      <span className="user-dropdown-role">{user.role}</span>
                    </div>
                    {USER_MENU_ITEMS.map(item => (
                      <Link key={item.path} to={item.path} className="user-dropdown-item">
                        <span>{item.icon}</span>
                        {item.label}
                      </Link>
                    ))}
                    {isAdmin && (
                      <Link to="/admin" className="user-dropdown-item">
                        <span>🛡️</span>
                        Admin Panel
                      </Link>
                    )}
                    <div className="divider" style={{ margin: '8px 0' }} />
                    <button className="user-dropdown-item danger" onClick={handleLogout}>
                      <span>🚪</span>
                      Sign Out
                    </button>
                    </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link to="/login" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
