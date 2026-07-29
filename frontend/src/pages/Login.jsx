import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import client from '../api/client'

export default function Login() {
  const { login, isLoggedIn } = useAuth()
  const { addToast } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState(1) // 1 = email, 2 = OTP
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [error, setError] = useState('')

  const otpRefs = useRef([])
  const cooldownRef = useRef(null)

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) {
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/resources'
      sessionStorage.removeItem('redirectAfterLogin')
      navigate(redirect, { replace: true })
    }
  }, [isLoggedIn, navigate])

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000)
    }
    return () => clearTimeout(cooldownRef.current)
  }, [cooldown])

  const normalizeEmail = (raw) => {
    const trimmed = raw.trim()
    if (trimmed && !trimmed.includes('@')) {
      return `${trimmed}@lnmiit.ac.in`
    }
    return trimmed
  }

  const handleSendOTP = async (e) => {
    e.preventDefault()
    const targetEmail = normalizeEmail(email)
    if (targetEmail !== email) {
      setEmail(targetEmail)
    }

    if (!name.trim() || !targetEmail) {
      setError('Please fill in your name and email')
      return
    }
    setError('')
    setLoading(true)
    try {
      await client.post('/api/auth/send-otp', { name: name.trim(), email: targetEmail })
      setStep(2)
      setCooldown(60)
      addToast('OTP sent! Check your email', 'success')
      setTimeout(() => otpRefs.current[0]?.focus(), 100)
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        setError('Server is waking up (free tier). Please try again in 10 seconds.')
      } else {
        const msg = typeof err.response?.data?.detail === 'string' 
          ? err.response.data.detail 
          : (Array.isArray(err.response?.data?.detail) ? err.response.data.detail[0]?.msg : null)
        if (err.response?.status === 403) {
          setError(msg || 'Access restricted: Email not in testing whitelist.')
        } else if (err.response?.status === 429) {
          setError(msg || 'Too many requests. Please wait 10 minutes before trying again.')
        } else {
          setError(msg || 'Failed to send OTP. Please try again.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOtpChange = (i, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    setError('')
    if (val && i < 5) {
      otpRefs.current[i + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus()
    }
  }

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      setOtp(pasted.split(''))
      otpRefs.current[5]?.focus()
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) {
      setError('Enter the complete 6-digit code')
      return
    }
    setError('')
    setLoading(true)
    try {
      const res = await client.post('/api/auth/verify-otp', { email, otp: code })
      login(res.data.access_token, res.data.user)
      addToast(`Welcome back, ${res.data.user.name}!`, 'success')
      const redirect = sessionStorage.getItem('redirectAfterLogin') || '/resources'
      sessionStorage.removeItem('redirectAfterLogin')
      // Restore booking draft if any
      const draft = sessionStorage.getItem('bookingFormDraft')
      if (draft) {
        sessionStorage.removeItem('bookingFormDraft')
        navigate(redirect, { state: { draft: JSON.parse(draft) }, replace: true })
      } else {
        navigate(redirect, { replace: true })
      }
    } catch (err) {
      const msg = err.response?.data?.detail
      setError(msg || 'Invalid or expired OTP. Please try again.')
      setOtp(['', '', '', '', '', ''])
      otpRefs.current[0]?.focus()
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    setLoading(true)
    setError('')
    try {
      await client.post('/api/auth/send-otp', { name, email })
      setCooldown(60)
      setOtp(['', '', '', '', '', ''])
      addToast('New OTP sent!', 'success')
      otpRefs.current[0]?.focus()
    } catch (err) {
      const msg = err.response?.data?.detail
      if (err.response?.status === 429) {
        setError('Rate limited. Wait 10 minutes before requesting another OTP.')
      } else {
        setError(msg || 'Failed to resend OTP.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card animate-fade-up">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">LN</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>LNMIIT</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Smart Booking Portal</div>
          </div>
        </div>

        {/* Progress */}
        <div className="progress-steps" style={{ marginBottom: 32 }}>
          <div className="progress-step">
            <div className={`step-circle ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
              {step > 1 ? '✓' : '1'}
            </div>
          </div>
          <div className={`step-line ${step > 1 ? 'done' : ''}`} />
          <div className="progress-step" style={{ justifyContent: 'flex-end' }}>
            <div className={`step-circle ${step === 2 ? 'active' : ''}`}>2</div>
          </div>
        </div>

        {step === 1 ? (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Sign in</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 28 }}>
              Enter your name and LNMIIT email to receive an OTP
            </p>

            <form onSubmit={handleSendOTP} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className={`form-input ${error && !name ? 'error' : ''}`}
                  placeholder="e.g. Ronak Jain"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus
                  autoComplete="name"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="text"
                  className={`form-input ${error && !email ? 'error' : ''}`}
                  placeholder="25ucc183 or you@lnmiit.ac.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onBlur={e => {
                    const norm = normalizeEmail(e.target.value)
                    if (norm !== email) setEmail(norm)
                  }}
                  autoComplete="email"
                />
              </div>

              {error && (
                <div className="form-error">⚠ {error}</div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading} style={{ marginTop: 4 }}>
                {loading ? <><div className="spinner" /> Sending OTP...</> : 'Send OTP →'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Enter OTP</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: 4 }}>
              A 6-digit code was sent to
            </p>
            <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 24 }}>{email}</p>

            <form onSubmit={handleVerifyOTP}>
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otp.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    className={`otp-input ${digit ? 'filled' : ''}`}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    autoFocus={i === 0}
                  />
                ))}
              </div>

              {error && (
                <div className="form-error" style={{ justifyContent: 'center', marginBottom: 12 }}>
                  ⚠ {error}
                </div>
              )}

              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <><div className="spinner" /> Verifying...</> : 'Verify & Sign In →'}
              </button>
            </form>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginTop: 20, fontSize: '0.875rem'
            }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => { setStep(1); setOtp(['','','','','','']); setError('') }}
              >
                ← Change email
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleResend}
                disabled={cooldown > 0 || loading}
                style={{ color: cooldown > 0 ? 'var(--text-muted)' : 'var(--gold)' }}
              >
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
