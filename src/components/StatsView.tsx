import { useStats } from "../hooks/useStats";
import "./StatsView.css";

export const StatsView = () => {
  const { summary } = useStats();

  return (
    <div className="stats-view">
      <div className="stats-section-panel">
        <h2>Today</h2>
        <div className="stats-summary">
          <div className="stat-panel">
            <div className="stat-value">{summary.reviewsToday}</div>
            <div className="stat-label">Reviews</div>
          </div>
          <div className="stat-panel">
            <div className="stat-value">{summary.charactersToday}</div>
            <div className="stat-label">Characters</div>
          </div>
        </div>
      </div>

      <div className="stats-section-panel">
        <h2>All Time</h2>
        <div className="stats-summary">
          <div className="stat-panel">
            <div className="stat-value">{summary.reviewsAllTime}</div>
            <div className="stat-label">Reviews</div>
          </div>
          <div className="stat-panel">
            <div className="stat-value">{summary.charactersAllTime}</div>
            <div className="stat-label">Characters</div>
          </div>
          <div className="stat-panel">
            <div className="stat-value">{summary.charactersLearned}</div>
            <div className="stat-label">Learned</div>
          </div>
        </div>
      </div>
    </div>
  );
};
