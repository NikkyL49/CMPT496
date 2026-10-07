import { useState } from 'react'
import { ROLES, DEFAULT_ROLE } from '../data/roles'
import './Header.css'

const navLinks = [
  { label: 'Search', path: '/search' },
  { label: 'Discovery', path: null },
  { label: 'Compare', path: null },
  { label: 'Interaction check', path: null },
  { label: 'Saved', path: null },
]

function Header({ currentPath = '/' }) {
  const [role, setRole] = useState(DEFAULT_ROLE)

  return (
    <header className="site-header">
      <a href="#/" className="brand">
        {/* Placeholder mark — swap for the real logo in src/assets */}
        <span className="brand-mark" aria-hidden="true" />
        MonoByte
      </a>

      <nav className="site-nav" aria-label="Main">
        {navLinks.map(({ label, path }) => {
          const active = path && path === currentPath
          return (
            <a
              key={label}
              href={path ? `#${path}` : '#'}
              className={active ? 'active' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </a>
          )
        })}
      </nav>

      <div className="header-actions">
        <label className="role-select">
          <span>Role:</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <a
          href="#/login"
          className="login-link"
          aria-current={currentPath === '/login' ? 'page' : undefined}
        >
          Log in
        </a>
      </div>
    </header>
  )
}

export default Header
