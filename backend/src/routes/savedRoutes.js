import express from "express"
import * as savedController from "../controllers/savedController.js"
import { requireAuth } from "../middleware/requireAuth.js"

const router = express.Router()

router.use(requireAuth) // saved drugs belong to a logged-in user

router.get("/", savedController.getSaved) // Get my saved drugs
router.put("/", savedController.replaceSaved) // Replace the whole list
router.post("/merge", savedController.mergeSaved) // Add drugs saved while logged out

export default router
