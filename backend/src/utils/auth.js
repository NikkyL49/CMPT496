import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
import User from "../models/User.js"

const SALT_ROUNDS = 12
const COOKIE_NAME = "token"
const SESSION_DAYS = 7

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Same rule as the sign-up page (frontend/src/utils/validation.js): at least
// 3 of 4 — length >= 8, mixed case, a number, a symbol.
export function passwordIsStrong(pw) {
    if (typeof pw !== "string" || pw.length > 72) return false // bcrypt only uses the first 72 bytes
    const checks = [pw.length >= 8, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)]
    return checks.filter(Boolean).length >= 3
}

export const hashPassword = (pw) => bcrypt.hash(pw, SALT_ROUNDS)
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash)

// Log in = put a signed token (holding the user id) in an httpOnly cookie.
// httpOnly means page JavaScript can't read it, so an XSS bug can't steal it.
// ver = the user's tokenVersion right now. Raising tokenVersion (password
// change / reset) makes every older token stop working.
export function setAuthCookie(res, user) {
    const token = jwt.sign({ sub: String(user._id), ver: user.tokenVersion }, process.env.JWT_SECRET, {
        expiresIn: `${SESSION_DAYS}d`,
    })
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production", // https only when deployed
        maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    })
}

export function clearAuthCookie(res) {
    res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" })
}

// The logged-in user, or null if the cookie is missing / expired / tampered
// with, or was issued before the user's last password change
export async function userFromRequest(req) {
    const token = req.cookies?.[COOKIE_NAME]
    if (!token) return null
    let payload
    try {
        payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch {
        return null
    }
    const user = await User.findById(payload.sub)
    // Tokens from before tokenVersion existed have no ver: count them as 0
    if (!user || (payload.ver ?? 0) !== user.tokenVersion) return null
    return user
}
