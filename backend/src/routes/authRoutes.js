import express from "express"
import * as authController from "../controllers/authController.js"
import { loginLimiter, signupLimiter, resetLimiter } from "../middleware/rateLimit.js"

const router = express.Router()

router.post("/signup", signupLimiter, authController.signup) // Create an account
router.post("/login", loginLimiter, authController.login) // Log in (sets the cookie)
router.post("/logout", authController.logout) // Log out (clears the cookie)
router.get("/me", authController.me) // Who is logged in
router.post("/forgot-password", resetLimiter, authController.requestPasswordReset) // Start a password reset
router.post("/reset-password", resetLimiter, authController.resetPassword) // Finish it with the token

export default router
