import { rateLimit } from "express-rate-limit"

// Slows down password guessing and spam sign ups. Counts are per IP address
// and kept in memory, so they reset when the server restarts.
// Answers 429 with { message }, which the frontend shows like any other error.
function limiter({ minutes, limit, message, skipSuccessfulRequests = false }) {
    return rateLimit({
        windowMs: minutes * 60 * 1000,
        limit,
        skipSuccessfulRequests, // true = only failed attempts count
        standardHeaders: "draft-8", // tells the client when it can try again
        legacyHeaders: false,
        message: { message },
    })
}

// Login: 10 wrong passwords per 15 minutes. Successful logins don't count.
export const loginLimiter = limiter({
    minutes: 15,
    limit: 10,
    skipSuccessfulRequests: true,
    message: "Too many login attempts. Please wait 15 minutes and try again.",
})

// Sign up: 5 accounts per hour from one address
export const signupLimiter = limiter({
    minutes: 60,
    limit: 5,
    message: "Too many sign ups from this network. Please try again later.",
})

// Forgot / reset password: stops someone spamming reset emails or guessing tokens
export const resetLimiter = limiter({
    minutes: 15,
    limit: 5,
    message: "Too many password reset attempts. Please wait 15 minutes and try again.",
})

// Settings routes that check the current password (change password, delete account)
export const passwordCheckLimiter = limiter({
    minutes: 15,
    limit: 10,
    skipSuccessfulRequests: true,
    message: "Too many wrong passwords. Please wait 15 minutes and try again.",
})
