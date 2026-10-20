import dotenv from "dotenv"
import express from "express"
import cookieParser from "cookie-parser"
import { connectDB } from "./config/db.js"
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import savedRoutes from "./routes/savedRoutes.js"

// Load backend/.env into process.env. The other files only read process.env
// inside functions (after this has run), never at import time.
dotenv.config({ quiet: true })

for (const key of ["MONGO_URI", "JWT_SECRET"]) {
    if (!process.env[key]) {
        console.error(`Missing ${key}. Copy backend/.env.example to backend/.env and fill it in.`)
        process.exit(1)
    }
}

const app = express()
const PORT = process.env.PORT || 5001

// middleware
app.use(express.json({ limit: "100kb" }))
app.use(cookieParser()) // reads the login cookie into req.cookies

// Mount the routes on their API paths. In development the frontend reaches
// these through the Vite proxy (frontend/vite.config.js), so no CORS needed.
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/saved", savedRoutes)

// Unknown /api route
app.use((req, res) => {
    res.status(404).json({ message: "Not found" })
})

// Any error thrown in a controller ends up here
app.use((err, req, res, next) => {
    if (err.code === 11000) {
        // duplicate key: two sign ups with the same email at the same moment
        return res.status(409).json({ message: "An account with this email already exists." })
    }
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "Invalid JSON." })
    }
    console.error(err)
    res.status(500).json({ message: "Internal Server Error" })
})

// Connect to the DB first, then start taking requests
await connectDB()
app.listen(PORT, () => {
    console.log("Server started on PORT:", PORT)
})
