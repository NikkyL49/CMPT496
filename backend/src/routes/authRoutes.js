import express from "express"
import * as authController from "../controllers/authController.js"

const router = express.Router()

router.post("/signup", authController.signup) // Create an account
router.post("/login", authController.login) // Log in (sets the cookie)
router.post("/logout", authController.logout) // Log out (clears the cookie)
router.get("/me", authController.me) // Who is logged in
router.post("/forgot-password", authController.requestPasswordReset) // Start a password reset
router.post("/reset-password", authController.resetPassword) // Finish it with the token

export default router
