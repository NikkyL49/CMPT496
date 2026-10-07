import { useState } from 'react'
import { signup, AuthError } from '../data/auth'
import { ROLES, DEFAULT_ROLE } from '../data/roles'
import './Auth.css'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// 0–4: one point each for length ≥ 8, mixed case, a number, a symbol
function passwordStrength(pw) {
  const checks = [
    { ok: pw.length >= 8, tip: 'use at least 8 characters' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), tip: 'mix upper and lower case' },
    { ok: /\d/.test(pw), tip: 'add a number' },
    { ok: /[^A-Za-z0-9]/.test(pw), tip: 'add one symbol' },
  ]
  const score = pw ? checks.filter((c) => c.ok).length : 0
  const missing = checks.find((c) => !c.ok)
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const hint =
    score === 4 ? 'Strong' : `${labels[score]} — ${missing.tip} for ${labels[score + 1].toLowerCase()}`
  return { score, hint }
}

function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [role, setRole] = useState(DEFAULT_ROLE)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = passwordStrength(form.password)

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your full name.'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (strength.score < 3) next.password = 'Choose a stronger password.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      await signup({ ...form, role })
      window.location.hash = '#/login'
    } catch (err) {
      setFormError(
        err instanceof AuthError
          ? err.message
          : 'Something went wrong. Please try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  function fieldProps(id, field) {
    return {
      id,
      className: 'input',
      value: form[field],
      onChange: update(field),
      'aria-invalid': !!errors[field],
      'aria-describedby': errors[field] ? `${id}-err` : undefined,
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <p className="kicker auth-kicker">Get started</p>
        <h1 className="auth-title">Create your account</h1>

        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}

        <div className="field">
          <label htmlFor="signup-name">Full Name</label>
          <input type="text" autoComplete="name" {...fieldProps('signup-name', 'name')} />
          {errors.name && <p id="signup-name-err" className="field-error">{errors.name}</p>}
        </div>

        <div className="field">
          <label htmlFor="signup-email">Email</label>
          <input type="email" autoComplete="email" {...fieldProps('signup-email', 'email')} />
          {errors.email && <p id="signup-email-err" className="field-error">{errors.email}</p>}
        </div>

        <div className="field">
          <label htmlFor="signup-password">Password</label>
          <input
            type="password"
            autoComplete="new-password"
            {...fieldProps('signup-password', 'password')}
          />
          <div
            className={`strength strength-${strength.score}`}
            role="meter"
            aria-label="Password strength"
            aria-valuemin={0}
            aria-valuemax={4}
            aria-valuenow={strength.score}
          >
            <span /><span /><span /><span />
          </div>
          {form.password && <p className="strength-hint">{strength.hint}</p>}
          {errors.password && (
            <p id="signup-password-err" className="field-error">{errors.password}</p>
          )}
        </div>

        <fieldset className="role-picker">
          <legend>I am a...</legend>
          <div className="role-options">
            {ROLES.map((r) => (
              <button
                key={r}
                type="button"
                className={`role-pill${role === r ? ' is-active' : ''}`}
                aria-pressed={role === r}
                onClick={() => setRole(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </fieldset>

        {role === 'Researcher' && (
          <p className="auth-note">
            Researcher access needs verification. You can request it after
            signing up.
          </p>
        )}

        <button
          type="submit"
          className="btn-primary btn-block"
          disabled={submitting}
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
        <p className="auth-switch">
          Already have an account? <a href="#/login">Log in</a>
        </p>
      </form>
    </main>
  )
}

export default Signup
