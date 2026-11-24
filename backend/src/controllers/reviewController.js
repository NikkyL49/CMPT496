import Review, { STATUSES } from "../models/Review.js"

// Inconsistency report review status (researchers only, see reviewRoutes.js).
// Who made a change always comes from the login (req.user), never the request body.

const SLUG_RE = /^[a-z0-9-]{1,200}$/ // same shape as ingredientSlug() in the frontend
const MAX_COMPANIES = 100
const MAX_COMPANY = 200
const MAX_REASON = 2000
const MAX_FLAGS = 200 // per ingredient

const actor = (user) => ({ id: user._id, name: user.name })

function readSlug(req, res) {
    const { slug } = req.params
    if (!SLUG_RE.test(slug)) {
        res.status(400).json({ message: "Invalid ingredient." })
        return null
    }
    return slug
}

// GET /api/reviews → { reviews: { [slug]: review } }
export async function listReviews(req, res) {
    const docs = await Review.find()
    res.status(200).json({ reviews: Object.fromEntries(docs.map((d) => [d.slug, d.toPublic()])) })
}

// PUT /api/reviews/:slug/status  { status: "open" | "reviewed" | "resolved" }
export async function setStatus(req, res) {
    const slug = readSlug(req, res)
    if (!slug) return
    const { status } = req.body ?? {}
    if (!STATUSES.includes(status)) return res.status(400).json({ message: "Invalid status." })

    const doc = await Review.findOneAndUpdate(
        { slug },
        { $set: { status, statusBy: actor(req.user), statusAt: new Date() } },
        { returnDocument: "after", upsert: true, runValidators: true }
    )
    res.status(200).json({ review: doc.toPublic() })
}

// POST /api/reviews/:slug/flags  { companies: [...], reason: "..." }
// A new flag reopens a resolved ingredient.
export async function addFlag(req, res) {
    const slug = readSlug(req, res)
    if (!slug) return
    const { companies, reason } = req.body ?? {}

    const validCompanies =
        Array.isArray(companies) &&
        companies.length > 0 &&
        companies.length <= MAX_COMPANIES &&
        companies.every((c) => typeof c === "string" && c.trim() && c.length <= MAX_COMPANY)
    if (!validCompanies) return res.status(400).json({ message: "Pick at least one company." })
    if (typeof reason !== "string" || !reason.trim() || reason.length > MAX_REASON) {
        return res.status(400).json({ message: "Say what should be reviewed (up to 2,000 characters)." })
    }

    let doc = (await Review.findOne({ slug })) ?? new Review({ slug })
    if (doc.flags.length >= MAX_FLAGS) {
        return res.status(400).json({ message: "This ingredient has too many flags. Resolve some first." })
    }
    doc.flags.push({ companies: [...new Set(companies.map((c) => c.trim()))], reason: reason.trim(), by: actor(req.user) })
    if (doc.status === "resolved") {
        doc.status = "open"
        doc.statusBy = actor(req.user)
        doc.statusAt = new Date()
    }
    doc = await doc.save()
    res.status(201).json({ review: doc.toPublic() })
}
