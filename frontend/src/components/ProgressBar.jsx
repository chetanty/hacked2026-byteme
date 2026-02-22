import "../styles/progress.css";

/**
 * Progress bar showing mastery based on correct answers.
 * @param {number} correctCount - Number of correct answers
 * @param {number} totalEvaluated - Total questions evaluated
 * @param {string} [variant] - "compact" for smaller display (e.g. history cards)
 */
export default function ProgressBar({ correctCount = 0, totalEvaluated = 0, variant }) {
  const percent = totalEvaluated > 0 ? Math.round((correctCount / totalEvaluated) * 100) : 0;
  const label = totalEvaluated > 0
    ? `${correctCount}/${totalEvaluated} correct (${percent}%)`
    : "No answers evaluated yet";

  return (
    <div className={`progress-bar ${variant ? `progress-bar--${variant}` : ""}`} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
      </div>
      <span className="progress-bar__label">{label}</span>
    </div>
  );
}
