import { useState } from 'react'
import { signup, AuthError } from '../data/auth'
import { ROLES, DEFAULT_ROLE } from '../data/roles'
import { EMAIL_RE, passwordStrength, MIN_PASSWORD_SCORE } from '../utils/validation'
import PasswordStrength from '../components/PasswordStrength'
import './Auth.css'


function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [role, setRole] = useState(DEFAULT_ROLE)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const strength = passwordStrength(form.password)

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setErrors((er) => (er[field] ? { ...er, [field]: undefined } : er))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your full name.'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.'
    if (strength.score < MIN_PASSWORD_SCORE) next.password = 'Choose a stronger password.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSubmitting(true)
    try {
      await signup({ ...form, role })
      window.location.hash = '#/login?notice=created'
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
          <PasswordStrength strength={strength} show={!!form.password} />
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
