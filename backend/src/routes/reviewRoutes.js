import express from "express"
import * as reviewController from "../controllers/reviewController.js"
import { requireAuth } from "../middleware/requireAuth.js"
import { requireRole } from "../middleware/requireRole.js"

// Inconsistency report review status, shared by all researchers.
const router = express.Router()

router.use(requireAuth, requireRole("Researcher"))

router.get("/", reviewController.listReviews) // Status and flags for every ingredient
router.put("/:slug/status", reviewController.setStatus) // Open / Reviewed / Resolved
router.post("/:slug/flags", reviewController.addFlag) // Flag companies for review

export default router
