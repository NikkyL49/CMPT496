import { useEffect, useState } from 'react'
import Header from './components/Header'
import Overview from './pages/Overview'
import Search from './pages/Search'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Saved from './pages/Saved'
import Settings from './pages/Settings'
import ComingSoon from './pages/ComingSoon'
import Analysis from './pages/Analysis'
import Compare from './pages/Compare'
import Drug from './pages/Drug'

// Tiny hash router (#/search?q=...) — swap for react-router if the app grows
function parseHash(hash) {
  const [path, qs = ''] = hash.replace(/^#/, '').split('?')
  return { path: path || '/', params: new URLSearchParams(qs) }
}

function useHashRoute() {
  const [hash, setHash] = useState(window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return parseHash(hash)
}

function App() {
  const { path, params } = useHashRoute()
  const q = params.get('q') ?? ''

  let page
  if (path === '/search') {
    // key resets filters/sort whenever a new query is submitted
    const by = params.get('by') ?? ''
    page = <Search key={`${q}|${by}`} initialQuery={q} mode={by || null} />
  } else if (path === '/login') {
    page = <Login key={params.get('notice')} notice={params.get('notice')} />
  } else if (path === '/signup') {
    page = <Signup />
  } else if (path === '/forgot-password') {
    page = <ForgotPassword />
  } else if (path === '/reset-password') {
    page = <ResetPassword key={params.get('token')} token={params.get('token')} />
  } else if (path === '/saved') {
    const shared = params.get('shared')
    page = (
      <Saved
        key={shared ?? 'mine'}
        sharedIds={shared != null ? shared.split(',').filter(Boolean) : null}
      />
    )
  } else if (path === '/compare') {
    const ids = (params.get('ids') ?? '').split(',').filter(Boolean)
    page = <Compare ids={ids} />
  } else if (path.startsWith('/drug/')) {
    const productId = decodeURIComponent(path.slice('/drug/'.length))
    page = (
      <Drug
        key={productId}
        productId={productId}
        listingId={params.get('s')}
        tab={params.get('tab') ?? 'overview'}
      />
    )
  } else if (path === '/settings') {
    page = <Settings />
  } else if (path === '/') {
    page = <Overview />
  } else if (path === '/analysis') {
    page = <Analysis />
  } else {
    // Discovery, Interaction check, etc.
    page = <ComingSoon />
  }

  return (
    <>
      <Header currentPath={path} />
      {page}
    </>
  )
}

export default App
