import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, var(--maroon), var(--crimson))',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.875rem', color: '#fff'
              }}>LN</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>LNMIIT</div>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Smart Booking Portal</div>
              </div>
            </div>
            <p>
              The LNM Institute of Information Technology's unified platform for
              reserving campus halls, equipment, and rooms — fast, transparent, and paperless.
            </p>
          </div>

          <div className="footer-col">
            <h4>Quick Links</h4>
            <ul className="footer-links">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/resources">Browse Resources</Link></li>
              <li><Link to="/my-bookings">My Bookings</Link></li>
              <li><Link to="/dashboard">Dashboard</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>Make a Booking</h4>
            <ul className="footer-links">
              <li><Link to="/book/hall">Hall Booking</Link></li>
              <li><Link to="/book/equipment">Equipment Booking</Link></li>
              <li><Link to="/book/room">Room Booking</Link></li>
              <li><Link to="/book/other">Other Requests</Link></li>
            </ul>
          </div>

          <div className="footer-col">
            <h4>LNMIIT Portal</h4>
            <ul className="footer-links">
              <li><a href="https://www.lnmiit.ac.in" target="_blank" rel="noreferrer">LNMIIT Official Site ↗</a></li>
              <li><Link to="/resources">Campus Resources</Link></li>
              <li><Link to="/my-bookings">Student Bookings</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <span>© 2025 LNMIIT Smart Booking Portal. All rights reserved.</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            The LNM Institute of Information Technology, Jaipur
          </span>
        </div>
      </div>
    </footer>
  )
}
