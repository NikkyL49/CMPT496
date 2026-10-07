// MOCK auth service — stands in for the real backend until it exists.
// Swap the bodies of login() and signup() for fetch() calls to the API;
// the pages only depend on these functions resolving or throwing.
//
// Accounts live in memory, so anything created with signup() is gone on reload.

const users = [
  {
    name: 'Demo User',
    email: 'demo@monobyte.ca',
    password: 'Monobyte1!',
    role: 'General Public',
  },
]

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export class AuthError extends Error {}

export async function login(email, password) {
  await delay(400) // simulate network
  const user = users.find(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
  // Same message for unknown email and wrong password, so the form
  // doesn't reveal which emails have accounts.
  if (!user || user.password !== password) {
    throw new AuthError('Incorrect email or password.')
  }
  return { name: user.name, email: user.email, role: user.role }
}

export async function signup({ name, email, password, role }) {
  await delay(400)
  const exists = users.some(
    (u) => u.email.toLowerCase() === email.trim().toLowerCase(),
  )
  if (exists) {
    throw new AuthError('An account with this email already exists.')
  }
  users.push({ name: name.trim(), email: email.trim(), password, role })
  return { name: name.trim(), email: email.trim(), role }
}
