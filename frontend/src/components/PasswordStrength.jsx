// Four-segment password strength meter + hint. Styles live in pages/Auth.css.
function PasswordStrength({ strength, show }) {
  return (
    <>
      <div
        className={`strength strength-${strength.score}`}
        role="meter"
        aria-label="Password strength"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={strength.score}
      >
        <span /><span /><span /><span />
      </div>
      {show && <p className="strength-hint">{strength.hint}</p>}
    </>
  )
}

export default PasswordStrength
