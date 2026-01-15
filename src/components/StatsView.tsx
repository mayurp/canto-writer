import { useStats } from "../hooks/useStats";
import "./StatsView.css";

// Recharts imports
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

export const StatsView = () => {
  const { summary, dueBuckets } = useStats();

  // Transform dueBuckets into chart data
  const chartData = dueBuckets
    ? [
        { label: "Today", value: dueBuckets.today, color: "#b91c1c" },    // deep muted red
        { label: "Tomorrow", value: dueBuckets.tomorrow, color: "#d97706" }, // warm amber
        { label: "3 days", value: dueBuckets.threeDays, color: "#eab308" }, // soft yellow
        { label: "1 week", value: dueBuckets.week, color: "#3b82f6" },   // calm blue
        { label: "Later", value: dueBuckets.later, color: "#16a34a" }, // muted green
      ]
    : []

  return (
    <div className="stats-view">
      {/* Existing Today Stats */}
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

      {/* Existing All Time Stats */}
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

      {/* SRS Due Buckets Bar Chart */}
      {chartData.length > 0 && (
        <div className="stats-section-panel">
          <h2>Upcoming Reviews</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} margin={{ top: 20, bottom: 20 }}>
              <XAxis dataKey="label" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value">
                {chartData.map((entry) => (
                  <Cell
                    key={entry.label}
                    fill={entry.color}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
