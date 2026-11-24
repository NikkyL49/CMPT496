import MatchResultsChart from "../components/charts/MatchResultsChart";
import ReciprocityScatter from "../components/charts/ReciprocityScatter";
import CoverageByYearChart from "../components/charts/CoverageByYearChart";
import WithinDrugChart from "../components/charts/WithinDrugChart";
import { useAnalysisTables } from "../data/analysis";
import "./Analysis.css";

export default function Analysis() {
  // Researchers only: the backend checks the role before sending the data
  const { tables, error } = useAnalysisTables();

  if (!tables) {
    return (
      <main className="analysis-page">
        <h1>Label analysis</h1>
        {error ? (
          <p className="form-alert" role="alert">
            {error}
          </p>
        ) : (
          <p className="analysis-intro">Loading analysis results…</p>
        )}
      </main>
    );
  }

  return (
    <main className="analysis-page">
      <h1>Label analysis</h1>
      <p className="analysis-intro">
        How consistently Health Canada product monographs document safety guidance and drug
        interactions. Results describe what labels say, not clinical risk.
      </p>

      <section className="analysis-section">
        <h2 className="chart-question">Do combination products carry the same guidance as their components?</h2>
        <p className="chart-takeaway">
          For pregnancy, combinations usually match their components. For breastfeeding, they match
          less often, and missing categories block many comparisons.
        </p>
        <MatchResultsChart table={tables["combination-alignment"]} />
      </section>

      <section className="analysis-section">
        <h2 className="chart-question">When one drug's label names another, does the other name it back?</h2>
        <p className="chart-takeaway">
          Most documented interactions appear on only one of the two drugs' labels.
        </p>
        <ReciprocityScatter table={tables["reciprocity"]} />
      </section>

      <section className="analysis-section">
        <h2 className="chart-question">Do recently revised labels name more of their interactions?</h2>
        <p className="chart-takeaway">
          Across all drugs, labels revised from 2022 onward name more of their expected interaction
          partners than labels revised from 2018 to 2021.
        </p>
        <CoverageByYearChart table={tables["coverage-by-year"]} />
      </section>

      <section className="analysis-section">
        <h2 className="chart-question">Does that hold within each drug?</h2>
        <p className="chart-takeaway">
          Only weakly. Within most drugs, revision year has little relationship with coverage, and
          the stronger results point in both directions.
        </p>
        <WithinDrugChart table={tables["within-drug-coverage"]} />
      </section>
    </main>
  );
}
