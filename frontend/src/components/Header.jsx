import { sessionStore, setViewRole } from '../data/session'
import { savedStore } from '../data/saved'
import { logout } from '../data/auth'
import { useStore } from '../utils/store'
import { canAccess, effectiveRole, rolesFor } from '../data/access'
import logoMark from '../assets/logo-mark.png'
import './Header.css'

const navLinks = [
  { label: 'Search', path: '/search' },
  { label: 'Discovery', path: '/discovery' },
  { label: 'Compare', path: '/compare' },
  { label: 'Interaction check', path: '/interactions' },
  { label: 'Saved', path: '/saved' },
  { label: 'Analysis', path: '/analysis' }, // researchers only
]

function Header({ currentPath = '/' }) {
  const session = useStore(sessionStore)
  const { user } = session
  const role = effectiveRole(session)
  const roleOptions = rolesFor(user)
  // Only show the pages this role can open (rules in data/access.js)
  const links = navLinks.filter(({ path }) => canAccess(path, role))
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
        {links.map(({ label, path }) => {
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
          <select
            value={role}
            onChange={(e) => setViewRole(e.target.value)}
            disabled={roleOptions.length < 2}
            title={user ? 'View the site as this role' : 'Log in to use your account role'}
          >
            {roleOptions.map((r) => (
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
