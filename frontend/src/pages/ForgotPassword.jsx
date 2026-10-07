import { useState } from 'react'
import { requestPasswordReset } from '../data/auth'
import { EMAIL_RE } from '../utils/validation'
import './Auth.css'

function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(null) // { email, demoToken }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    if (!EMAIL_RE.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      // TODO: real API sends the email; it should not return the token
      const { demoToken } = await requestPasswordReset(email)
      setSent({ email: email.trim(), demoToken })
    } catch {
      setFormError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <main className="auth-page">
        <div className="auth-form">
          <p className="kicker auth-kicker">Check your email</p>
          <h1 className="auth-title">Reset link sent</h1>
          <p className="auth-lede">
            If an account exists for <strong>{sent.email}</strong>, we&rsquo;ve
            sent a link to reset your password. The link expires in 30 minutes.
          </p>

          {sent.demoToken && (
            <div className="demo-box">
              <span className="kicker">Demo only — no email is sent yet</span>
              <a href={`#/reset-password?token=${sent.demoToken}`}>
                Open the reset link →
              </a>
            </div>
          )}

          <a href="#/login" className="btn-secondary btn-block">
            Back to log in
          </a>
          <p className="auth-switch">
            Didn&rsquo;t get it?{' '}
            <button type="button" className="link-button" onClick={() => setSent(null)}>
              Try again
            </button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <p className="kicker auth-kicker">Account help</p>
        <h1 className="auth-title">Forgot your password?</h1>
        <p className="auth-lede">
          Enter the email you signed up with and we&rsquo;ll send you a link to
          reset it.
        </p>

        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}

        <div className="field">
          <label htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setError('')
            }}
            aria-invalid={!!error}
            aria-describedby={error ? 'forgot-email-err' : undefined}
          />
          {error && <p id="forgot-email-err" className="field-error">{error}</p>}
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
        <p className="auth-switch">
          Remembered it? <a href="#/login">Log in</a>
        </p>
      </form>
    </main>
  )
}

export default ForgotPassword
