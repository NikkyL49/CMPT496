import User from "../models/User.js"
import { ROLES } from "../models/User.js"
import { EMAIL_RE, passwordIsStrong, hashPassword, checkPassword, setAuthCookie, clearAuthCookie } from "../utils/auth.js"

// Settings page. Every route here runs after requireAuth, so req.user is the logged-in user.

const LANDING_PAGES = ["/", "/search", "/saved"] // same as Settings.jsx
const NOTIFICATION_KEYS = ["inconsistency", "interactions", "news"]

// PATCH /api/users/me  { name, email }
export async function updateProfile(req, res) {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : ""
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : ""

    if (!name) return res.status(400).json({ message: "Please enter your name." })
    if (!EMAIL_RE.test(email)) return res.status(400).json({ message: "Please enter a valid email address." })
    if (await User.exists({ email, _id: { $ne: req.user._id } })) {
        return res.status(409).json({ message: "Another account already uses this email." })
    }

    req.user.name = name
    req.user.email = email
    await req.user.save()
    res.status(200).json({ user: req.user.toPublic() })
}

// PATCH /api/users/me/preferences  any of { defaultRole, landingPage, notifications: {...} }
export async function updatePreferences(req, res) {
    const { defaultRole, landingPage, notifications } = req.body ?? {}

    if (defaultRole !== undefined) {
        if (!ROLES.includes(defaultRole)) return res.status(400).json({ message: "Unknown role." })
        req.user.defaultRole = defaultRole
    }
    if (landingPage !== undefined) {
        if (!LANDING_PAGES.includes(landingPage)) return res.status(400).json({ message: "Unknown landing page." })
        req.user.landingPage = landingPage
    }
    if (notifications && typeof notifications === "object") {
        for (const key of NOTIFICATION_KEYS) {
            if (typeof notifications[key] === "boolean") req.user.notifications[key] = notifications[key]
        }
    }

    await req.user.save()
    res.status(200).json({ user: req.user.toPublic() })
}

// POST /api/users/me/password  { currentPassword, newPassword }
export async function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body ?? {}
    const user = await User.findById(req.user._id).select("+passwordHash")

    if (typeof currentPassword !== "string" || !(await checkPassword(currentPassword, user.passwordHash))) {
        return res.status(400).json({ message: "Your current password is incorrect." })
    }
    if (!passwordIsStrong(newPassword)) return res.status(400).json({ message: "Please choose a stronger password." })

    user.passwordHash = await hashPassword(newPassword)
    user.tokenVersion += 1 // other devices are logged out...
    await user.save()
    setAuthCookie(res, user) // ...but this one gets a fresh cookie and stays logged in
    res.status(200).json({ message: "Password changed." })
}

// DELETE /api/users/me  { password }
export async function deleteAccount(req, res) {
    const user = await User.findById(req.user._id).select("+passwordHash")
    const password = req.body?.password

    if (typeof password !== "string" || !(await checkPassword(password, user.passwordHash))) {
        return res.status(400).json({ message: "Incorrect password." })
    }

    await user.deleteOne()
    clearAuthCookie(res)
    res.status(200).json({ message: "Account deleted." })
}
