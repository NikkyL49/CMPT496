// Put this after requireAuth on routes only some roles may use, e.g.
//   router.use(requireAuth, requireRole("Researcher"))
// The role comes from the database (req.user), never from anything the
// browser sends, so it can't be faked from the page.
export function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user?.defaultRole)) {
            return res.status(403).json({ message: "This is only available to researchers." })
        }
        next()
    }
}
