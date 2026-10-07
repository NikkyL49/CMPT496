import { useState } from 'react'
import { login, AuthError } from '../data/auth'
import './Auth.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (!EMAIL_RE.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Enter your password.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      // TODO: pass `remember` to the real API (session vs. persistent token)
      await login(email, password)
      window.location.hash = '#/'
    } catch (err) {
      setFormError(
        err instanceof AuthError
          ? err.message
          : 'Something went wrong. Please try again.',
      )
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <p className="kicker auth-kicker">Welcome back</p>
        <h1 className="auth-title">Log in to MonoByte</h1>

        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}

        <div className="field">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className="input"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'login-email-err' : undefined}
          />
          {errors.email && (
            <p id="login-email-err" className="field-error">{errors.email}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            className="input"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'login-password-err' : undefined}
          />
          {errors.password && (
            <p id="login-password-err" className="field-error">{errors.password}</p>
          )}
        </div>

        <div className="auth-row">
          <label className="checkbox">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Keep me signed in
          </label>
          {/* TODO: point at the reset-password page once it exists */}
          <a href="#" className="pill-link">
            Forgot password?
          </a>
        </div>

        <button
          type="submit"
          className="btn-secondary btn-block"
          disabled={submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
        <a href="#/signup" className="btn-primary btn-block">
          Create Account
        </a>
      </form>
    </main>
  )
}

export default Login
