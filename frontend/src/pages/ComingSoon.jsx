// Shown for links to pages that aren't built yet, so they don't
// silently fall back to the home page.
function ComingSoon({ title }) {
  return (
    <main className="simple-page">
      <p className="kicker auth-kicker">Coming soon</p>
      <h1>{title ?? 'This page isn’t built yet'}</h1>
      <p>It&rsquo;s in the design, but not in the app yet.</p>
      <a href="#/" className="btn-primary">
        Back to home
      </a>
    </main>
  )
}

export default ComingSoon
