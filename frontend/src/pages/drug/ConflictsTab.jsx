import { splitList } from '../../data/drugDetails'
import { Card, Chips, ClampText } from './parts'

// What this drug shouldn't be combined with or used for
function ConflictsTab({ info }) {
  const interactions = splitList(info.interactions)
  const warnings = splitList(info.warnings)

  return (
    <div className="drug-stack">
      <Card title={`Drug interactions (${interactions.length})`}>
        <p className="card-note">
          Drugs and drug groups the monograph says interact with this one.
        </p>
        <Chips items={interactions} empty="No interactions listed in the monograph." />
      </Card>

      <Card title={`Contraindications (${info.contraindicationTerms.length})`} className="card-md">
        <p className="card-note">Conditions where this drug should not be used.</p>
        <Chips items={info.contraindicationTerms} variant="soft-md" empty="None coded." />
        <h3 className="drug-sub">From the monograph</h3>
        <ClampText text={info.contraindications} />
      </Card>

      <Card title={`Serious warnings and precautions (${warnings.length})`} className="card-hi">
        <Chips items={warnings} variant="soft-hi" empty="None listed." />
        {info.warningTerms.length > 0 && (
          <>
            <h3 className="drug-sub">MedDRA terms</h3>
            <Chips items={info.warningTerms} />
          </>
        )}
      </Card>
    </div>
  )
}

export default ConflictsTab
