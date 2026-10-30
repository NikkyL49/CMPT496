import mongoose from "mongoose"

// Same lists as frontend/src/data/roles.js
export const ROLES = ["General Public", "Pharmacist", "Physician", "Researcher"]

// DB SCHEMA — the "users" collection is created automatically on the first sign up
const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        // unique: mongoose builds a unique index, so two accounts can't share an email
        email: { type: String, required: true, unique: true, trim: true, lowercase: true },
        // bcrypt hash — never the plain password. select: false = not loaded unless asked for
        passwordHash: { type: String, required: true, select: false },
        defaultRole: { type: String, enum: ROLES, default: ROLES[0] },
        landingPage: { type: String, default: "/" },
        notifications: {
            inconsistency: { type: Boolean, default: true }, // a new inconsistency is flagged
            interactions: { type: Boolean, default: true }, // interaction alerts for saved drugs
            news: { type: Boolean, default: false }, // product news
        },
        // Product ids from the frontend's drug data, e.g. "apo-simvastatin-apotex-inc"
        savedDrugs: { type: [String], default: [] },
        // Password reset: we store a hash of the emailed token, not the token itself
        resetTokenHash: { type: String, select: false },
        resetTokenExpires: { type: Date, select: false },
        // Goes up by 1 on every password change / reset. Login tokens carry the
        // number they were made with, so older tokens stop working (other devices log out).
        tokenVersion: { type: Number, default: 0 },
    },
    { timestamps: true } // makes createdAt, updatedAt
)

// What the frontend is allowed to see (never the password)
userSchema.methods.toPublic = function () {
    return {
        name: this.name,
        email: this.email,
        defaultRole: this.defaultRole,
        landingPage: this.landingPage,
        notifications: {
            inconsistency: this.notifications.inconsistency,
            interactions: this.notifications.interactions,
            news: this.notifications.news,
        },
    }
}

const User = mongoose.model("User", userSchema)

export default User
