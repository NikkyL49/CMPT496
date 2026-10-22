// Saved drugs for the logged-in user (req.user, set by requireAuth).
// Only product ids are stored, e.g. "apo-simvastatin-apotex-inc" — the drug
// details themselves stay in the frontend's JSON files.

const MAX_SAVED = 1000
const PRODUCT_ID_RE = /^[a-z0-9-]{1,200}$/ // same shape as the ids monographs.js makes

// null if the body isn't a valid list of product ids; duplicates removed, order kept
function readIds(body) {
    const ids = body?.ids
    if (!Array.isArray(ids) || ids.length > MAX_SAVED) return null
    if (!ids.every((id) => typeof id === "string" && PRODUCT_ID_RE.test(id))) return null
    return [...new Set(ids)]
}

// GET /api/saved
export async function getSaved(req, res) {
    res.status(200).json({ ids: req.user.savedDrugs })
}

// PUT /api/saved  { ids: [...] } — replace the whole list (the Saved page
// changes order for Undo, removes, clears, so sending the full list is simplest)
export async function replaceSaved(req, res) {
    const ids = readIds(req.body)
    if (!ids) return res.status(400).json({ message: "Invalid saved drugs list." })

    req.user.savedDrugs = ids
    await req.user.save()
    res.status(200).json({ ids: req.user.savedDrugs })
}

// POST /api/saved/merge  { ids: [...] } — on log in, add the drugs saved while
// logged out (kept in the browser) to the account, skipping ones already there
export async function mergeSaved(req, res) {
    const ids = readIds(req.body)
    if (!ids) return res.status(400).json({ message: "Invalid saved drugs list." })

    const merged = [...new Set([...req.user.savedDrugs, ...ids])].slice(0, MAX_SAVED)
    req.user.savedDrugs = merged
    await req.user.save()
    res.status(200).json({ ids: req.user.savedDrugs })
}
