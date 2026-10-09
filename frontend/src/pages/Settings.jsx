import { useRef, useState } from 'react'
import {
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount,
  AuthError,
} from '../data/auth'
import { sessionStore, setViewRole } from '../data/session'
import { savedStore, clearSaved } from '../data/saved'
import { products } from '../data/search'
import { ROLES } from '../data/roles'
import { useStore } from '../utils/store'
import { downloadFile, today } from '../utils/download'
import {
  EMAIL_RE,
  passwordStrength,
  MIN_PASSWORD_SCORE,
} from '../utils/validation'
import PasswordStrength from '../components/PasswordStrength'
import Switch from '../components/Switch'
import './Auth.css' // strength meter styles
import './Settings.css'

const SECTIONS = [
  { id: 'profile', label: 'Profile' },
  { id: 'role', label: 'Role & landing page' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'password', label: 'Password' },
  { id: 'delete', label: 'Delete account', danger: true },
]

const LANDING_PAGES = [
  { path: '/', label: 'Home' },
  { path: '/search', label: 'Search' },
  { path: '/saved', label: 'Saved drugs' },
]

const NOTIFICATIONS = [
  { key: 'inconsistency', label: 'A new inconsistency is flagged' },
  { key: 'interactions', label: 'Interaction alerts for saved drugs' },
  { key: 'news', label: 'Product news' },
]

function errorMessage(err) {
  return err instanceof AuthError ? err.message : 'Something went wrong. Please try again.'
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/* ---------- Profile ---------- */

function ProfileHeader({ user }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ name: user.name, email: user.email })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  function startEdit() {
    setForm({ name: user.name, email: user.email })
    setErrors({})
    setFormError('')
    setEditing(true)
  }

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setErrors((er) => ({ ...er, [field]: undefined }))
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (!form.name.trim()) next.name = 'Enter your full name.'
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await updateProfile(form)
      setEditing(false)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="profile" className="settings-profile" aria-label="Profile">
      <div className="profile-row">
        <span className="avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <div className="profile-text">
          <h1 className="profile-name">{user.name}</h1>
          <p className="profile-meta">
            {user.email} · {user.defaultRole}
          </p>
        </div>
        {!editing && (
          <button type="button" className="btn-secondary profile-edit" onClick={startEdit}>
            Change Info
          </button>
        )}
      </div>

      {editing && (
        <form className="settings-card profile-form" onSubmit={handleSave} noValidate>
          {formError && (
            <p className="form-alert" role="alert">
              {formError}
            </p>
          )}
          <div className="field">
            <label htmlFor="profile-name">Full Name</label>
            <input
              id="profile-name"
              className="input"
              autoComplete="name"
              value={form.name}
              onChange={update('name')}
              aria-invalid={!!errors.name}
            />
            {errors.name && <p className="field-error">{errors.name}</p>}
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input
              id="profile-email"
              type="email"
              className="input"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              aria-invalid={!!errors.email}
            />
            {errors.email && <p className="field-error">{errors.email}</p>}
          </div>
          <div className="form-buttons">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

/* ---------- Password ---------- */

function PasswordSection() {
  const empty = { current: '', next: '', confirm: '' }
  const [form, setForm] = useState(empty)
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [done, setDone] = useState(false)
  const [saving, setSaving] = useState(false)

  const strength = passwordStrength(form.next)

  function update(field) {
    return (e) => {
      setForm((f) => ({ ...f, [field]: e.target.value }))
      setErrors((er) => ({ ...er, [field]: undefined }))
      setDone(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setFormError('')
    const next = {}
    if (!form.current) next.current = 'Enter your current password.'
    if (strength.score < MIN_PASSWORD_SCORE) next.next = 'Choose a stronger password.'
    if (form.confirm !== form.next) next.confirm = 'Passwords don’t match.'
    setErrors(next)
    if (Object.keys(next).length) return

    setSaving(true)
    try {
      await changePassword(form.current, form.next)
      setForm(empty)
      setDone(true)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section id="password" className="settings-card">
      <h2 className="card-heading">Password</h2>
      <form className="password-form" onSubmit={handleSubmit} noValidate>
        {done && (
          <p className="form-success" role="status">
            Password updated.
          </p>
        )}
        {formError && (
          <p className="form-alert" role="alert">
            {formError}
          </p>
        )}
        <div className="field">
          <label htmlFor="pw-current">Current password</label>
          <input
            id="pw-current"
            type="password"
            className="input"
            autoComplete="current-password"
            value={form.current}
            onChange={update('current')}
            aria-invalid={!!errors.current}
          />
          {errors.current && <p className="field-error">{errors.current}</p>}
        </div>
        <div className="field">
          <label htmlFor="pw-new">New password</label>
          <input
            id="pw-new"
            type="password"
            className="input"
            autoComplete="new-password"
            value={form.next}
            onChange={update('next')}
            aria-invalid={!!errors.next}
          />
          <PasswordStrength strength={strength} show={!!form.next} />
          {errors.next && <p className="field-error">{errors.next}</p>}
        </div>
        <div className="field">
          <label htmlFor="pw-confirm">Confirm new password</label>
          <input
            id="pw-confirm"
            type="password"
            className="input"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update('confirm')}
            aria-invalid={!!errors.confirm}
          />
          {errors.confirm && <p className="field-error">{errors.confirm}</p>}
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </section>
  )
}

/* ---------- Notifications ---------- */

function NotificationsSection({ user }) {
  const [error, setError] = useState('')

  async function toggle(key, value) {
    setError('')
    try {
      await updatePreferences({ notifications: { [key]: value } })
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  return (
    <section id="notifications" className="settings-card">
      <h2 className="card-heading">Email Notifications</h2>
      {error && (
        <p className="form-alert" role="alert">
          {error}
        </p>
      )}
      <ul className="switch-list">
        {NOTIFICATIONS.map((n) => (
          <li key={n.key}>
            <span id={`notif-${n.key}`}>{n.label}</span>
            <Switch
              checked={user.notifications[n.key]}
              label={n.label}
              onChange={(v) => toggle(n.key, v)}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ---------- Role & landing page ---------- */

function RoleSection({ user }) {
  const [status, setStatus] = useState('')

  async function save(patch) {
    setStatus('')
    try {
      await updatePreferences(patch)
      if (patch.defaultRole) setViewRole(patch.defaultRole)
      setStatus('Saved')
    } catch (err) {
      setStatus(errorMessage(err))
    }
  }

  return (
    <section id="role" className="settings-card">
      <div className="card-heading-row">
        <h2 className="card-heading">Default role and landing page</h2>
        {status && (
          <span className="save-status" role="status">
            {status}
          </span>
        )}
      </div>
      <div className="role-chips" role="group" aria-label="Default role">
        {ROLES.map((r) => (
          <button
            key={r}
            type="button"
            className={`role-chip${user.defaultRole === r ? ' is-active' : ''}`}
            aria-pressed={user.defaultRole === r}
            onClick={() => save({ defaultRole: r })}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="landing-field">
        <label htmlFor="landing-page">After I log in, open</label>
        <select
          id="landing-page"
          className="input landing-select"
          value={user.landingPage}
          onChange={(e) => save({ landingPage: e.target.value })}
        >
          {LANDING_PAGES.map((p) => (
            <option key={p.path} value={p.path}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

/* ---------- Your data ---------- */

function DataSection({ user }) {
  function exportData() {
    const { searchHistory } = sessionStore.get()
    const byId = new Map(products.map((p) => [p.id, p]))
    const data = {
      exportedAt: new Date().toISOString(),
      profile: { name: user.name, email: user.email, defaultRole: user.defaultRole },
      preferences: { landingPage: user.landingPage, notifications: user.notifications },
      savedDrugs: savedStore
        .get()
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((p) => ({ id: p.id, brand: p.brand, ingredient: p.ingredient, company: p.company })),
      searchHistory,
    }
    downloadFile(
      `monobyte-my-data-${today()}.json`,
      JSON.stringify(data, null, 2),
      'application/json',
    )
  }

  return (
    <section className="settings-card card-split">
      <div>
        <h2 className="card-heading">Your data</h2>
        <p className="card-text">
          Export your saved drugs and search history, or request account deletion.
        </p>
      </div>
      <button type="button" className="btn-primary" onClick={exportData}>
        Export My Data
      </button>
    </section>
  )
}

/* ---------- Danger zone ---------- */

function DangerZone() {
  const dialogRef = useRef(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  function open() {
    setPassword('')
    setError('')
    dialogRef.current?.showModal()
  }

  async function handleDelete(e) {
    e.preventDefault()
    if (!password) {
      setError('Enter your password to confirm.')
      return
    }
    setDeleting(true)
    try {
      await deleteAccount(password)
      clearSaved()
      dialogRef.current?.close()
      window.location.hash = '#/login?notice=deleted'
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section id="delete" className="danger-zone card-split">
      <div>
        <h2 className="danger-title">Danger zone</h2>
        <p className="danger-text">
          Delete this account and all saved data permanently.
        </p>
      </div>
      <button type="button" className="btn-danger-outline" onClick={open}>
        Delete account
      </button>

      <dialog ref={dialogRef} className="confirm-dialog" aria-labelledby="delete-title">
        <form onSubmit={handleDelete} noValidate>
          <h2 id="delete-title" className="dialog-title">
            Delete your account?
          </h2>
          <p className="card-text">
            This permanently deletes your account, saved drugs and settings. It
            can&rsquo;t be undone.
          </p>
          <div className="field">
            <label htmlFor="delete-password">Enter your password to confirm</label>
            <input
              id="delete-password"
              type="password"
              className="input"
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
              aria-invalid={!!error}
            />
            {error && <p className="field-error">{error}</p>}
          </div>
          <div className="form-buttons">
            <button type="submit" className="btn-danger" disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete permanently'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
          </div>
        </form>
      </dialog>
    </section>
  )
}

/* ---------- Page ---------- */

function Settings() {
  const { user } = useStore(sessionStore)
  const [active, setActive] = useState('profile')

  if (!user) {
    return (
      <main className="settings-locked">
        <p className="kicker auth-kicker">Settings</p>
        <h1 className="auth-title">Log in to see your settings</h1>
        <a href="#/login" className="btn-primary btn-block">
          Log in
        </a>
        <p className="auth-switch">
          New here? <a href="#/signup">Create an account</a>
        </p>
      </main>
    )
  }

  function jump(id) {
    setActive(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="settings-layout">
      <nav className="settings-nav" aria-label="Settings sections">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`settings-link${s.danger ? ' is-danger' : ''}${
              active === s.id ? ' is-active' : ''
            }`}
            aria-current={active === s.id ? 'true' : undefined}
            onClick={() => jump(s.id)}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main className="settings-main">
        {/* key: reset the edit form if the account changes */}
        <ProfileHeader key={user.email} user={user} />
        <RoleSection user={user} />
        <NotificationsSection user={user} />
        <PasswordSection />
        <DataSection user={user} />
        <DangerZone />
      </main>
    </div>
  )
}

export default Settings
