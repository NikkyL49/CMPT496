import express from "express"
import mongoose from "mongoose"

const router = express.Router()

// Public: the homepage shows this before login
router.get("/recent", async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 5, 50)

        const docs = await mongoose.connection.db
            .collection("monographs")
            const DRUG_DB = process.env.DRUG_DB_NAME || "ByteRX"         
            const DRUG_COLLECTION = process.env.DRUG_COLLECTION || "Drug Monograph Data"  

router.get("/recent", async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 5, 50)

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

        // ...the existing res.json(docs.map(...)) stays the same
    } catch (err) {
        next(err)
    }
})
            .sort({ "Revision Date": -1 })
            .limit(limit)
            .toArray()

        res.json(
            docs.map((d) => ({
                id: d._id,
                brand: d["Brand Name"],
                ingredient: d["Normalized Active Ingredient"],
                company: d.Company,
                revised: d["Revision Date"],
                adverseEvents: Number(d["Adverse Event MedDRA PT Count"]) || 0,
            }))
        )
    } catch (err) {
        next(err) // your error handler in server.js deals with it
    }
})

export default router