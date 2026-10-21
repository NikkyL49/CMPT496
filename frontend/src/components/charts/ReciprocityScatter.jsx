import { useMemo, useState } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell,
} from "recharts";
import { reciprocity } from "../../data/analysis";
import "./Charts.css";

const pct = (v) => `${Math.round(v * 100)}%`;

function PairTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.drugA} and {d.drugB}</strong>
      <br />
      {d.drugA} labels naming {d.drugB}: {pct(d.x)}
      <br />
      {d.drugB} labels naming {d.drugA}: {pct(d.y)}
    </div>
  );
}

export default function ReciprocityScatter() {
  const [drug, setDrug] = useState("");
  const [selected, setSelected] = useState(null);

  // Only pairs where both directions could be measured
  const pairs = useMemo(
    () =>
      reciprocity.rows
        .filter((r) => r.bToAAvailable)
        .map((r) => ({ x: r.aToB, y: r.bToA, drugA: r.drugA, drugB: r.drugB, status: r.status })),
    []
  );

  const drugs = useMemo(
    () => [...new Set(pairs.flatMap((p) => [p.drugA, p.drugB]))].sort(),
    [pairs]
  );

  const twoWay = pairs.filter((p) => p.status === "Two-way");
  const oneWay = pairs.filter((p) => p.status === "One-way");
  const involves = (p) => !drug || p.drugA === drug || p.drugB === drug;
  const excluded = reciprocity.rows.length - pairs.length;

  const drugPairs = drug ? pairs.filter(involves) : [];

  return (
    <div className="chart-block">
      <div className="chart-controls">
        <label>
          Highlight a drug
          <select value={drug} onChange={(e) => { setDrug(e.target.value); setSelected(null); }}>
            <option value="">All drugs</option>
            {drugs.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>

      <ul className="chart-legend">
        <li><span className="legend-swatch legend-swatch--round" style={{ background: "#2a78d6" }} />Two-way ({twoWay.length})</li>
        <li><span className="legend-swatch" style={{ background: "#eb6834" }} />One-way ({oneWay.length})</li>
        <li><span className="legend-swatch legend-swatch--line" />Equal in both directions</li>
      </ul>

      <ResponsiveContainer width="100%" height={420}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <XAxis
            type="number" dataKey="x" domain={[0, 1]} tickFormatter={pct}
            label={{ value: "Share of drug A labels naming drug B", position: "bottom", offset: 10 }}
          />
          <YAxis
            type="number" dataKey="y" domain={[0, 1]} tickFormatter={pct}
            label={{ value: "Share of drug B labels naming drug A", angle: -90, position: "insideLeft", offset: 0, style: { textAnchor: "middle" } }}
          />
          <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke="#898781" strokeDasharray="5 4" />
          <Tooltip content={<PairTooltip />} />
          <Scatter data={twoWay} shape="circle" cursor="pointer" onClick={(p) => setSelected(p.payload)}>
            {twoWay.map((p, i) => (
              <Cell key={i} fill="#2a78d6" fillOpacity={involves(p) ? 1 : 0.12} />
            ))}
          </Scatter>
          <Scatter data={oneWay} shape="triangle" cursor="pointer" onClick={(p) => setSelected(p.payload)}>
            {oneWay.map((p, i) => (
              <Cell key={i} fill="#eb6834" fillOpacity={involves(p) ? 0.75 : 0.08} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>

      {drug && (
        <div className="chart-details">
          <h4>{drug}: {drugPairs.length} pairs</h4>
          <ul>
            {drugPairs.map((p) => (
              <li key={`${p.drugA}-${p.drugB}`}>
                {p.drugA} → {p.drugB} {pct(p.x)}, {p.drugB} → {p.drugA} {pct(p.y)} ({p.status})
              </li>
            ))}
          </ul>
        </div>
      )}

      {!drug && selected && (
        <div className="chart-details">
          <h4>{selected.drugA} and {selected.drugB}: {selected.status}</h4>
          <p style={{ margin: 0 }}>
            {pct(selected.x)} of {selected.drugA} labels name {selected.drugB}.{" "}
            {pct(selected.y)} of {selected.drugB} labels name {selected.drugA}.
          </p>
        </div>
      )}

      <p className="chart-hint">
        Select a point for details. {excluded} pairs are not plotted because one drug only exists inside
        combination products, so the reverse direction could not be measured. Several one-way pairs share
        the same position, so use the drug filter to see them all.
      </p>
    </div>
  );
}
