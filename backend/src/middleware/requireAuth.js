import User from "../models/User.js"
import { userIdFromRequest } from "../utils/auth.js"

// Put this in front of any route that needs a logged-in user.
// Sets req.user, or answers 401 so the frontend knows to log in again.
export async function requireAuth(req, res, next) {
    const id = userIdFromRequest(req)
    const user = id ? await User.findById(id) : null
    if (!user) {
        return res.status(401).json({ message: "You need to log in again." })
    }
    req.user = user
    next()
}
