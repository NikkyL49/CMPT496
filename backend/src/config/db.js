import mongoose from "mongoose"
import dns from "node:dns"

// Local DNS fix: Node was asking a dead address (127.0.0.1) for DNS, so the
// mongodb+srv:// lookup failed. Ask Google (8.8.8.8) and Cloudflare (1.1.1.1) instead.
dns.setServers(["8.8.8.8", "1.1.1.1"])

export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            dbName: process.env.DB_NAME || "monobyte",
            serverSelectionTimeoutMS: 5000, // fail fast so the fallback kicks in quickly
        })
        console.log("MONGODB CONNECTED SUCCESSFULLY!")
    } catch (error) {
        console.error("Error connecting to MONGODB:", error.message)
        console.warn("Continuing without MongoDB; drug data will come from the CSV.")
        setTimeout(connectDB, 30000) // keep retrying in the background
    }
}