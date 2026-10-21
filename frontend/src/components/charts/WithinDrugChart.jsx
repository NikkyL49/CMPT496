import { useMemo, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { withinDrugCoverage } from "../../data/analysis";
import "./Charts.css";

function DrugTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.drug}</strong>
      <br />
      Correlation: {d.correlation.toFixed(2)}
      <br />
      Products scored: {d.productsScored}
      <br />
      Revisions: {d.earliestYear} to {d.latestYear}
      <br />
      Average coverage: {Math.round(d.averageCoverage * 100)}%
    </div>
  );
}

export default function WithinDrugChart() {
  const [minProducts, setMinProducts] = useState(10);
  const [sortBy, setSortBy] = useState("correlation");
  const rows = withinDrugCoverage.rows;

  const data = useMemo(() => {
    const kept = rows.filter(
      (r) => r.correlationStatus === "calculated" && r.productsScored >= minProducts
    );
    return [...kept].sort((a, b) =>
      sortBy === "correlation" ? b.correlation - a.correlation : a.drug.localeCompare(b.drug)
    );
  }, [rows, minProducts, sortBy]);

  const positive = data.filter((d) => d.correlation > 0).length;
  const negative = data.filter((d) => d.correlation < 0).length;
  const noVariation = rows.filter((r) => r.correlationStatus === "no_variation").length;

  return (
    <div className="chart-block">
      <div className="chart-controls">
        <label>
          Minimum products
          <input
            type="range" min="0" max="50" step="5" value={minProducts}
            onChange={(e) => setMinProducts(Number(e.target.value))}
          />
          <span>{minProducts}</span>
        </label>
        <label>
          Sort by
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="correlation">Correlation</option>
            <option value="name">Drug name</option>
          </select>
        </label>
      </div>

      <ul className="chart-legend">
        <li><span className="legend-swatch legend-swatch--round" style={{ background: "#2a78d6" }} />Newer labels cover more ({positive})</li>
        <li><span className="legend-swatch legend-swatch--round" style={{ background: "#eb6834" }} />Older labels cover more ({negative})</li>
        <li>Larger dot = more products</li>
      </ul>

      {data.length === 0 ? (
        <p className="chart-hint">No drugs have that many products. Lower the minimum to see results.</p>
      ) : (
        <ResponsiveContainer width="100%" height={60 + data.length * 26}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
            <XAxis
              type="number" dataKey="correlation" domain={[-1.1, 1.1]}
              ticks={[-1, -0.5, 0, 0.5, 1]}
              label={{ value: "Correlation between revision year and coverage", position: "bottom", offset: 10 }}
            />
            <YAxis type="category" dataKey="drug" width={110} interval={0} allowDuplicatedCategory={false} />
            <ZAxis type="number" dataKey="productsScored" range={[40, 360]} />
            <ReferenceLine x={0} stroke="#c3c2b7" />
            <Tooltip content={<DrugTooltip />} />
            <Scatter data={data}>
              {data.map((d) => (
                <Cell key={d.drug} fill={d.correlation >= 0 ? "#2a78d6" : "#eb6834"} />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      )}

      <p className="chart-hint">
        Each dot compares products of the same drug, so differences between drugs do not affect it.
        {` ${noVariation} drugs are not shown because their products all share the same coverage or revision year.`}
      </p>
    </div>
  );
}
