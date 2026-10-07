// Shared form validation helpers for the auth pages.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Minimum score accepted for a new password ("Good")
export const MIN_PASSWORD_SCORE = 3

// 0–4: one point each for length ≥ 8, mixed case, a number, a symbol
export function passwordStrength(pw) {
  const checks = [
    { ok: pw.length >= 8, tip: 'use at least 8 characters' },
    { ok: /[a-z]/.test(pw) && /[A-Z]/.test(pw), tip: 'mix upper and lower case' },
    { ok: /\d/.test(pw), tip: 'add a number' },
    { ok: /[^A-Za-z0-9]/.test(pw), tip: 'add one symbol' },
  ]
  const score = pw ? checks.filter((c) => c.ok).length : 0
  const missing = checks.find((c) => !c.ok)
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong']
  const hint =
    score === 4
      ? 'Strong'
      : `${labels[score]} — ${missing.tip} for ${labels[score + 1].toLowerCase()}`
  return { score, hint }
}
