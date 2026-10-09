import { ROLES } from '../data/roles'
import { sessionStore, setViewRole } from '../data/session'
import { savedStore } from '../data/saved'
import { logout } from '../data/auth'
import { useStore } from '../utils/store'
import logoMark from '../assets/logo-mark.png'
import './Header.css'

const navLinks = [
  { label: 'Search', path: '/search' },
  { label: 'Discovery', path: '/discovery' },
  { label: 'Compare', path: '/compare' },
  { label: 'Interaction check', path: '/interactions' },
  { label: 'Saved', path: '/saved' },
]

function Header({ currentPath = '/' }) {
  const { user, viewRole } = useStore(sessionStore)
  const savedCount = useStore(savedStore).length

  function handleLogout() {
    logout()
    window.location.hash = '#/'
  }

  return (
    <header className="site-header">
      <a href="#/" className="brand">
        <img src={logoMark} alt="" className="brand-mark" width="40" height="40" />
        MonoByte
      </a>

      <nav className="site-nav" aria-label="Main">
        {navLinks.map(({ label, path }) => {
          const active = path === currentPath
          return (
            <a
              key={label}
              href={`#${path}`}
              className={active ? 'active' : undefined}
              aria-current={active ? 'page' : undefined}
            >
              {label}
              {path === '/saved' && savedCount > 0 && (
                <span className="nav-count" aria-label={`${savedCount} saved`}>
                  {savedCount}
                </span>
              )}
            </a>
          )
        })}
      </nav>

      <div className="header-actions">
        <label className="role-select">
          <span>Role:</span>
          <select value={viewRole} onChange={(e) => setViewRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        {user ? (
          <>
            <a
              href="#/settings"
              className="login-link"
              aria-current={currentPath === '/settings' ? 'page' : undefined}
              title="Account settings"
            >
              {user.name.split(' ')[0]}
            </a>
            <button type="button" className="logout-button" onClick={handleLogout}>
              Log out
            </button>
          </>
        ) : (
          <a
            href="#/login"
            className="login-link"
            aria-current={currentPath === '/login' ? 'page' : undefined}
          >
            Log in
          </a>
        )}
      </div>
    </header>
  )
}

export default Header
