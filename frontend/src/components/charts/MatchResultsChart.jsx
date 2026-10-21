import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { combinationAlignment } from "../../data/analysis";
import "./Charts.css";

const RESULTS = [
  { key: "Same", label: "Same", color: "#1baf7a" },
  { key: "Different", label: "Different", color: "#eb6834" },
  { key: "Missing data", label: "Missing data", color: "#eda100" },
  { key: "Not in dataset", label: "No single-ingredient product", color: "#b4b2a9" },
];

const POPULATIONS = [
  { key: "breastfeeding", label: "Breastfeeding" },
  { key: "pregnancy", label: "Pregnancy" },
];

export default function MatchResultsChart() {
  const rows = combinationAlignment.rows;
  const [selected, setSelected] = useState(null);

  // One bar per population, counting each combination-vs-component comparison
  const data = useMemo(
    () =>
      POPULATIONS.map((p) => {
        const bar = { population: p.label, populationKey: p.key };
        RESULTS.forEach((r) => (bar[r.key] = 0));
        rows.forEach((row) => {
          [row[`${p.key}Match1`], row[`${p.key}Match2`]].forEach((value) => {
            if (value in bar) bar[value] += 1;
          });
        });
        return bar;
      }),
    [rows]
  );

  // The pairs behind the clicked segment
  const details = useMemo(() => {
    if (!selected) return [];
    const p = selected.populationKey;
    return rows.flatMap((row) =>
      [1, 2]
        .map((n) => ({
          combination: row.combination,
          component: row[`component${n}`],
          match: row[`${p}Match${n}`],
          comboCategory: row[`${p}Combination`],
          componentCategory: row[`${p}Component${n}`],
        }))
        .filter((d) => d.match === selected.result)
    );
  }, [rows, selected]);

  return (
    <div className="chart-block">
      <ul className="chart-legend">
        {RESULTS.map((r) => (
          <li key={r.key}>
            <span className="legend-swatch" style={{ background: r.color }} />
            {r.label}
          </li>
        ))}
      </ul>

      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 20 }}>
          <XAxis type="number" allowDecimals={false} domain={[0, 18]} />
          <YAxis type="category" dataKey="population" width={110} />
          <Tooltip />
          {RESULTS.map((r) => (
            <Bar
              key={r.key}
              dataKey={r.key}
              name={r.label}
              stackId="results"
              fill={r.color}
              cursor="pointer"
              onClick={(bar) =>
                setSelected({
                  populationKey: bar.payload.populationKey,
                  population: bar.payload.population,
                  result: r.key,
                  label: r.label,
                })
              }
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

      {selected ? (
        <div className="chart-details">
          <h4>
            {selected.population}: {selected.label} ({details.length})
          </h4>
          <ul>
            {details.map((d) => (
              <li key={`${d.combination}-${d.component}`}>
                {d.combination} ({d.comboCategory}) vs. {d.component} ({d.componentCategory})
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="chart-hint">Select a segment to see which combinations it includes.</p>
      )}
    </div>
  );
}
