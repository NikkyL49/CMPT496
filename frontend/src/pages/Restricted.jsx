import { useStore } from '../utils/store'
import { sessionStore, setViewRole } from '../data/session'
import { RESTRICTED, PAGE_NAMES, rolesFor, useRole } from '../data/access'

function listRoles(roles) {
  const plural = roles.map((r) => `${r}s`)
  if (plural.length === 1) return plural[0]
  return `${plural.slice(0, -1).join(', ')} and ${plural.at(-1)}`
}

// Shown instead of a page the current role can't open.
function Restricted({ path }) {
  const { user } = useStore(sessionStore)
  const role = useRole()
  const allowed = RESTRICTED[path] ?? []
  const name = PAGE_NAMES[path] ?? 'This page'
  // The account allows a role that can open this page — the header is just set lower
  const switchTo = rolesFor(user).find((r) => allowed.includes(r))
  const next = encodeURIComponent(`#${path}`)

  return (
    <main className="simple-page">
      <p className="kicker auth-kicker">Restricted</p>
      <h1>{name} is for {listRoles(allowed).toLowerCase()}</h1>
      {!user ? (
        <>
          <p>Log in with a {allowed.join(' or ').toLowerCase()} account to open this page.</p>
          <a href={`#/login?next=${next}`} className="btn-primary">
            Log in
          </a>
        </>
      ) : switchTo ? (
        <>
          <p>You&rsquo;re viewing the site as {role}.</p>
          <button type="button" className="btn-primary" onClick={() => setViewRole(switchTo)}>
            Switch to {switchTo}
          </button>
        </>
      ) : (
        <>
          <p>Your account role is {user.defaultRole}, which can&rsquo;t open this page.</p>
          <a href="#/" className="btn-primary">
            Back to home
          </a>
        </>
      )}
    </main>
  )
}

export default Restricted
