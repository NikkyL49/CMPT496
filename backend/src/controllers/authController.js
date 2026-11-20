import crypto from "node:crypto"
import User from "../models/User.js"
import { ROLES } from "../models/User.js"
import {
    EMAIL_RE, passwordIsStrong, hashPassword, checkPassword, setAuthCookie, clearAuthCookie, userFromRequest,
} from "../utils/auth.js"
import { emailEnabled, appUrl, sendPasswordResetEmail, sendPasswordChangedEmail } from "../utils/email.js"

const RESET_MINUTES = 30 // reset links expire after 30 minutes
const RESET_TTL_MS = RESET_MINUTES * 60 * 1000

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex")
const normEmail = (e) => (typeof e === "string" ? e.trim().toLowerCase() : "")

// Errors in these async functions go to the error handler in server.js (Express 5 does that for us)

// POST /api/auth/signup  { name, email, password, role }
// Like the mock, sign up doesn't log you in — the page sends you to the login page.
export async function signup(req, res) {
    const { name, password, role } = req.body ?? {}
    const email = normEmail(req.body?.email)

    if (typeof name !== "string" || !name.trim()) return res.status(400).json({ message: "Please enter your name." })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address." })
    if (!passwordIsStrong(password)) return res.status(400).json({ message: "Please choose a stronger password." })
    if (role && !ROLES.includes(role)) return res.status(400).json({ message: "Unknown role." })

    if (await User.exists({ email })) {
        return res.status(409).json({ message: "An account with this email already exists." })
    }

    const user = await User.create({
        name: name.trim(),
        email,
        passwordHash: await hashPassword(password),
        defaultRole: role || ROLES[0],
    })
    res.status(201).json({ user: user.toPublic() })
}

// POST /api/auth/login  { email, password }
export async function login(req, res) {
    const email = normEmail(req.body?.email)
    const password = req.body?.password
    const user = await User.findOne({ email }).select("+passwordHash")

    // Same message for unknown email and wrong password, so the form
    // doesn't reveal which emails have accounts.
    if (!user || typeof password !== "string" || !(await checkPassword(password, user.passwordHash))) {
        return res.status(401).json({ message: "Incorrect email or password." })
    }

    setAuthCookie(res, user)
    res.status(200).json({ user: user.toPublic(), savedDrugs: user.savedDrugs })
}

// POST /api/auth/logout
export async function logout(req, res) {
    clearAuthCookie(res)
    res.status(200).json({ message: "Logged out." })
}

// GET /api/auth/me — who is logged in (so a page refresh keeps you logged in)
export async function me(req, res) {
    const user = await userFromRequest(req)
    res.status(200).json({ user: user ? user.toPublic() : null, savedDrugs: user ? user.savedDrugs : [] })
}

// POST /api/auth/forgot-password  { email }
// Always answers the same way, so it doesn't reveal which emails have accounts.
export async function requestPasswordReset(req, res) {
    const user = await User.findOne({ email: normEmail(req.body?.email) })
    let token = null

    if (user) {
        token = crypto.randomBytes(32).toString("hex")
        user.resetTokenHash = sha256(token)
        user.resetTokenExpires = new Date(Date.now() + RESET_TTL_MS)
        await user.save()
    }

    if (!emailEnabled()) {
        // No email service set up (SMTP_HOST in .env): outside production, hand
        // the token back so the page can show a "Demo only" link instead.
        // server.js refuses to start in production without SMTP_HOST.
        if (token) console.log(`[email off] Reset link for ${user.email}: ${appUrl(`#/reset-password?token=${token}`)}`)
        return res.status(200).json({ demoToken: token })
    }

    // Answer first, then send: sending takes a second or so, and making only
    // real accounts wait would let someone time which emails have accounts.
    res.status(200).json({ demoToken: null })
    if (user) {
        sendPasswordResetEmail(user, token, RESET_MINUTES).catch((err) =>
            console.error(`Couldn't send the reset email to ${user.email}:`, err.message)
        )
    }
}

// POST /api/auth/reset-password  { token, password }
export async function resetPassword(req, res) {
    const { token, password } = req.body ?? {}
    const user =
        typeof token === "string" && token
            ? await User.findOne({ resetTokenHash: sha256(token), resetTokenExpires: { $gt: new Date() } })
            : null

    if (!user) return res.status(400).json({ message: "This reset link is invalid or has expired." })
    if (!passwordIsStrong(password)) return res.status(400).json({ message: "Please choose a stronger password." })

    user.passwordHash = await hashPassword(password)
    user.resetTokenHash = undefined // one-time use
    user.resetTokenExpires = undefined
    user.tokenVersion += 1 // log out every device — whoever had the account may still be logged in
    await user.save()
    res.status(200).json({ message: "Password updated." })

    // Tell the owner, in case it wasn't them who used the link
    if (emailEnabled()) {
        sendPasswordChangedEmail(user).catch((err) =>
            console.error(`Couldn't send the password-changed email to ${user.email}:`, err.message)
        )
    }
}
