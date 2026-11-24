import mongoose from "mongoose"

// Review status for the Inconsistency report, shared by every researcher.
// One document per active ingredient; the "reviews" collection is created
// automatically the first time someone marks or flags an ingredient.
// Ingredients nobody has touched have no document and count as "open".

export const STATUSES = ["open", "reviewed", "resolved"]

// Who did something: name for display, id to tell people apart
const actorSchema = new mongoose.Schema(
    {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        name: { type: String, trim: true },
    },
    { _id: false }
)

const flagSchema = new mongoose.Schema(
    {
        companies: { type: [String], required: true },
        reason: { type: String, required: true, trim: true },
        by: actorSchema,
        at: { type: Date, default: Date.now },
    },
    { _id: false }
)

const reviewSchema = new mongoose.Schema(
    {
        // Ingredient slug from the frontend's report, e.g. "amlodipine-besylate"
        slug: { type: String, required: true, unique: true },
        status: { type: String, enum: STATUSES, default: "open" },
        statusBy: actorSchema, // who last changed the status
        statusAt: Date,
        flags: { type: [flagSchema], default: [] },
    },
    { timestamps: true }
)

// What the frontend gets (no user ids)
reviewSchema.methods.toPublic = function () {
    return {
        slug: this.slug,
        status: this.status,
        statusBy: this.statusBy?.name ?? null,
        statusAt: this.statusAt ?? null,
        flags: this.flags.map((f) => ({ companies: f.companies, reason: f.reason, by: f.by?.name ?? null, at: f.at })),
    }
}

const Review = mongoose.model("Review", reviewSchema)

export default Review
