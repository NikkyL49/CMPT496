import { useState } from 'react'
import './Header.css'

const navLinks = ['Search', 'Discovery', 'Compare', 'Interaction check', 'Saved']
const roles = ['General Public', 'Clinician', 'Researcher']

function Header() {
  const [role, setRole] = useState(roles[0])

  return (
    <header className="site-header">
      <a href="/" className="brand">
        {/* Placeholder mark — swap for the real logo in src/assets */}
        <span className="brand-mark" aria-hidden="true" />
        MonoByte
      </a>

      <nav className="site-nav" aria-label="Main">
        {navLinks.map((link) => (
          <a key={link} href="#">
            {link}
          </a>
        ))}
      </nav>

      <div className="header-actions">
        <label className="role-select">
          <span>Role:</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {roles.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <a href="#" className="login-link">
          Log in
        </a>
      </div>
    </header>
  )
}

export default Header
