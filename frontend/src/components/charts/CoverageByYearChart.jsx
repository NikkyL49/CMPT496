import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell, LabelList,
} from "recharts";
import { coverageByYear } from "../../data/analysis";
import "./Charts.css";

const SMALL_SAMPLE = 20;

function YearTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.label}</strong>
      <br />
      Average coverage: {d.coverage.toFixed(1)}%
      <br />
      Products: {d.products}
      {d.products < SMALL_SAMPLE && <><br />Small sample, read with caution</>}
    </div>
  );
}

export default function CoverageByYearChart() {
  const [hideSmall, setHideSmall] = useState(false);
  const { rows, meta } = coverageByYear;
  const overall = (meta.grandTotal?.averageCoverage ?? 0) * 100;
  const periods = meta.summary?.periods ?? [];

  const data = useMemo(
    () =>
      rows
        .map((r) => ({
          label: r.revisionYearLabel,
          coverage: r.averageCoverage * 100,
          products: r.products,
          undated: r.revisionYear === null,
        }))
        .filter((d) => !hideSmall || d.products >= SMALL_SAMPLE),
    [rows, hideSmall]
  );

  const colorFor = (d) => (d.undated ? "#b4b2a9" : d.products < SMALL_SAMPLE ? "#9fc3ef" : "#2a78d6");

  return (
    <div className="chart-block">
      <div className="metric-row">
        {periods.map((p) => (
          <div className="metric" key={p.from}>
            <p className="metric-label">Revised {p.from} to {p.to}</p>
            <p className="metric-value">{Math.round(p.averageCoverage * 100)}%</p>
            <p className="metric-note">{p.products} products</p>
          </div>
        ))}
      </div>

      <div className="chart-controls">
        <label>
          <input type="checkbox" checked={hideSmall} onChange={(e) => setHideSmall(e.target.checked)} />
          Hide years with fewer than {SMALL_SAMPLE} products
        </label>
      </div>

      <ul className="chart-legend">
        <li><span className="legend-swatch" style={{ background: "#2a78d6" }} />{SMALL_SAMPLE}+ products</li>
        {!hideSmall && <li><span className="legend-swatch" style={{ background: "#9fc3ef" }} />Under {SMALL_SAMPLE} products</li>}
        <li><span className="legend-swatch" style={{ background: "#b4b2a9" }} />No date</li>
        <li><span className="legend-swatch legend-swatch--line" />Overall {Math.round(overall)}%</li>
      </ul>

      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 20, right: 10, bottom: 10, left: 0 }}>
          <XAxis dataKey="label" interval={0} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <Tooltip content={<YearTooltip />} />
          <ReferenceLine y={overall} stroke="#898781" strokeDasharray="5 4" />
          <Bar dataKey="coverage" radius={[4, 4, 0, 0]} maxBarSize={28}>
            {data.map((d) => (
              <Cell key={d.label} fill={colorFor(d)} />
            ))}
            <LabelList dataKey="products" position="top" formatter={(n) => `n=${n}`} fontSize={11} fill="#898781" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <p className="chart-hint">
        Coverage is the share of a product's expected interaction partners that its label names.
        Each column pools all drugs whose labels were last revised that year.
      </p>
    </div>
  );
}
