import express from "express"
import * as userController from "../controllers/userController.js"
import { requireAuth } from "../middleware/requireAuth.js"
import { passwordCheckLimiter } from "../middleware/rateLimit.js"

const router = express.Router()

router.use(requireAuth) // every settings route needs a logged-in user

router.patch("/me", userController.updateProfile) // Change name / email
router.patch("/me/preferences", userController.updatePreferences) // Role, landing page, notifications
router.post("/me/password", passwordCheckLimiter, userController.changePassword) // Change password
router.delete("/me", passwordCheckLimiter, userController.deleteAccount) // Delete account

export default router
