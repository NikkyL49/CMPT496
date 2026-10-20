import mongoose from "mongoose"
import dns from "node:dns"

// Local DNS fix: Node was asking a dead address (127.0.0.1) for DNS, so the
// mongodb+srv:// lookup failed. Ask Google (8.8.8.8) and Cloudflare (1.1.1.1) instead.
dns.setServers(["8.8.8.8", "1.1.1.1"])

export const connectDB = async () => {
    try {
        // dbName picks the database inside the cluster (users go in their own DB, not the drug data)
        await mongoose.connect(process.env.MONGO_URI, { dbName: process.env.DB_NAME || "monobyte" })
        console.log("MONGODB CONNECTED SUCCESSFULLY!")
    } catch (error) {
        console.error("Error connecting to MONGODB:", error.message)
        process.exit(1) // exit with failure
    }
}
