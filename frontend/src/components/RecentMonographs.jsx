import { useEffect, useState } from "react"

export default function RecentMonographs() {
    const [rows, setRows] = useState([])
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch("/api/monographs/recent?limit=5")   // <-- the fetch line lives here
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then(setRows)
            .catch(() => setError("Could not load monographs."))
    }, [])

    if (error) return <p>{error}</p>

    return (
        <table>
            <thead>
                <tr>
                    <th>Brand</th>
                    <th>Active ingredient</th>
                    <th>Company</th>
                    <th>Revised</th>
                    <th>Adverse events</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((m) => (
                    <tr key={m.id}>
                        <td>{m.brand}</td>
                        <td>{m.ingredient}</td>
                        <td>{m.company}</td>
                        <td>{m.revised}</td>
                        <td>{m.adverseEvents} terms</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}