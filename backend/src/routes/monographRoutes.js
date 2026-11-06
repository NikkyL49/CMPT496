import express from "express"
import mongoose from "mongoose"

const router = express.Router()

// Public: the homepage shows this before login
router.get("/recent", async (req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 5, 50)

        const docs = await mongoose.connection.db
            .collection("monographs")
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