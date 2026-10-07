import { useEffect, useState } from 'react'
import Header from './components/Header'
import Overview from './pages/Overview'
import Search from './pages/Search'
import Login from './pages/Login'
import Signup from './pages/Signup'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

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
    page = <Search key={q} initialQuery={q} />
  } else if (path === '/login') {
    page = <Login key={params.get('notice')} notice={params.get('notice')} />
  } else if (path === '/signup') {
    page = <Signup />
  } else if (path === '/forgot-password') {
    page = <ForgotPassword />
  } else if (path === '/reset-password') {
    page = <ResetPassword key={params.get('token')} token={params.get('token')} />
  } else {
    page = <Overview />
  }

  return (
    <>
      <Header currentPath={path} />
      {page}
    </>
  )
}

export default App
