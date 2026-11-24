import express from "express"
import mongoose from "mongoose"
import { loadCsv } from "../utils/csvFallback.js"

const router = express.Router()

const DRUG_DB = process.env.DRUG_DB_NAME || "ByteRX"
const DRUG_COLLECTION = process.env.DRUG_COLLECTION || "Drug Monograph Data"

const toDay = (v) =>
    v instanceof Date ? v.toISOString().slice(0, 10) : String(v || "").slice(0, 10)

// One shape for the frontend, whichever source the row came from
const shape = (d, i) => ({
    id: String(d._id ?? d.ID ?? i),
    brand: d["Brand Name"],
    ingredient: d["Normalized Active Ingredient"],
    company: d.Company,
    revised: toDay(d["Revision Date"]),
    adverseEvents: Number(d["Adverse Event MedDRA PT Count"]) || 0,
})

async function recentFromMongo(limit) {
    if (mongoose.connection.readyState !== 1) {
        throw new Error("MongoDB is not connected")
    }
    const docs = await mongoose.connection
        .getClient()
        .db(DRUG_DB)
        .collection(DRUG_COLLECTION)
        .find(
            { "Revision Date": { $nin: [null, ""] } },
            {
                projection: {
                    "Brand Name": 1,
                    "Normalized Active Ingredient": 1,
                    Company: 1,
                    "Revision Date": 1,
                    "Adverse Event MedDRA PT Count": 1,
                },
            }
        )
        .sort({ "Revision Date": -1 })
        .limit(limit)
        .toArray()

    // An empty result means the data isn't there, so treat it as a failure too
    if (docs.length === 0) throw new Error("MongoDB returned no documents")
    return docs.map(shape)
}

function recentFromCsv(limit) {
    return loadCsv()
        .filter((r) => r["Revision Date"])
        .sort((a, b) => toDay(b["Revision Date"]).localeCompare(toDay(a["Revision Date"])))
        .slice(0, limit)
        .map(shape)
}

// Public: the homepage shows this before login
router.get("/recent", async (req, res, next) => {
    const limit = Math.min(parseInt(req.query.limit) || 5, 50)

    try {
        const rows = await recentFromMongo(limit)
        res.set("X-Data-Source", "mongodb")
        return res.json(rows)
    } catch (err) {
        console.warn("Falling back to CSV:", err.message)
    }

    try {
        res.set("X-Data-Source", "csv")
        return res.json(recentFromCsv(limit))
    } catch (csvErr) {
        return next(csvErr) // both sources failed
    }
})

export default router