import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function MobileNav() {
  const location = useLocation()
  const { isLoggedIn } = useAuth()

  const items = [
    { icon: '🏠', label: 'Home',    path: '/' },
    { icon: '🔍', label: 'Resources', path: '/resources' },
    { icon: '📅', label: 'Bookings', path: '/my-bookings', requireAuth: true },
    { icon: '👤', label: 'Profile',  path: isLoggedIn ? '/dashboard' : '/login' },
  ]

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-inner">
        {items.map(item => (
          <Link
            key={item.path}
            to={item.path}
            className={`mobile-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
