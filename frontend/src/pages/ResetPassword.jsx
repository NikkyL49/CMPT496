import { useState } from 'react'
import { resetPassword, AuthError } from '../data/auth'
import { passwordStrength, MIN_PASSWORD_SCORE } from '../utils/validation'
import PasswordStrength from '../components/PasswordStrength'
import './Auth.css'

function ResetPassword({ token }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function clearError(field) {
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e))
  }

  const strength = passwordStrength(password)

  if (!token) {
    return (
      <main className="auth-page">
        <div className="auth-form">
          <p className="kicker auth-kicker">Account help</p>
          <h1 className="auth-title">Link not valid</h1>
          <p className="auth-lede">
            This reset link is missing or incomplete. Request a new one.
          </p>
          <a href="#/forgot-password" className="btn-primary btn-block">
            Request a new link
          </a>
        </div>
      </main>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (strength.score < MIN_PASSWORD_SCORE) next.password = 'Choose a stronger password.'
    if (confirm !== password) next.confirm = 'Passwords don’t match.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      await resetPassword(token, password)
      window.location.hash = '#/login?notice=reset'
    } catch (err) {
      setFormError(
        err instanceof AuthError ? err.message : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <p className="kicker auth-kicker">Account help</p>
        <h1 className="auth-title">Set a new password</h1>

        {formError && (
          <div className="form-alert" role="alert">
            {formError} <a href="#/forgot-password">Request a new link</a>
          </div>
        )}

        <div className="field">
          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            className="input"
            autoComplete="new-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              clearError('password')
            }}
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'reset-password-err' : undefined}
          />
          <PasswordStrength strength={strength} show={!!password} />
          {errors.password && (
            <p id="reset-password-err" className="field-error">{errors.password}</p>
          )}
        </div>

        <div className="field">
          <label htmlFor="reset-confirm">Confirm new password</label>
          <input
            id="reset-confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value)
              clearError('confirm')
            }}
            aria-invalid={!!errors.confirm}
            aria-describedby={errors.confirm ? 'reset-confirm-err' : undefined}
          />
          {errors.confirm && (
            <p id="reset-confirm-err" className="field-error">{errors.confirm}</p>
          )}
        </div>

        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting ? 'Saving…' : 'Reset password'}
        </button>
      </form>
    </main>
  )
}

export default ResetPassword
