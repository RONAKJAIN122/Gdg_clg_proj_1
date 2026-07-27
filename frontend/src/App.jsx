import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import Navbar from './components/Navbar'
import MobileNav from './components/MobileNav'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Resources from './pages/Resources'
import ResourceDetail from './pages/ResourceDetail'
import MyBookings from './pages/MyBookings'
import BookingSuccess from './pages/BookingSuccess'
import Dashboard from './pages/Dashboard'
import Admin from './pages/Admin'

// Booking category pages (share a layout, different config)
function BookingPage({ type }) {
  // Redirect to resources with category filter pre-set
  return <Navigate to={`/resources?category=${type}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Navbar />
          <main className="page">
            <Routes>
              {/* Public */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/resources" element={
                <ProtectedRoute><Resources /></ProtectedRoute>
              } />
              <Route path="/resources/:id" element={
                <ProtectedRoute><ResourceDetail /></ProtectedRoute>
              } />

              {/* Booking category shortcuts */}
              <Route path="/book/hall" element={
                <ProtectedRoute><BookingPage type="hall" /></ProtectedRoute>
              } />
              <Route path="/book/equipment" element={
                <ProtectedRoute><BookingPage type="equipment" /></ProtectedRoute>
              } />
              <Route path="/book/room" element={
                <ProtectedRoute><BookingPage type="room" /></ProtectedRoute>
              } />
              <Route path="/book/other" element={
                <ProtectedRoute><BookingPage type="other" /></ProtectedRoute>
              } />

              {/* Protected */}
              <Route path="/my-bookings" element={
                <ProtectedRoute><MyBookings /></ProtectedRoute>
              } />
              <Route path="/booking-success" element={
                <ProtectedRoute><BookingSuccess /></ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute><Dashboard /></ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
              } />

              {/* 404 */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <MobileNav />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
