// fetch() wrapper for the Express backend (backend/). In development Vite
// proxies /api to it (vite.config.js). The login cookie is httpOnly, so the
// browser sends it with every request and page code never touches it.

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export async function api(method, path, body) {
  let res
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError("Can't reach the server. Check your connection and try again.", 0)
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    // The Vite proxy answers 5xx with no JSON when the backend isn't running
    const fallback = res.status >= 500 ? "Can't reach the server. Please try again in a moment." : 'Something went wrong. Please try again.'
    throw new ApiError(data.message || fallback, res.status)
  }
  return data
}
