import { useState, useEffect } from 'react';
import { X, TrendingUp, Calendar, Flame, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

function AnalyticsModal({ onClose }) {
  const [tab, setTab] = useState('weekly');
  const [weeklyData, setWeeklyData] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [weeklyRes, heatmapRes, streakRes] = await Promise.all([
        fetch('/api/analytics/weekly'),
        fetch('/api/analytics/heatmap'),
        fetch('/api/streak')
      ]);
      
      const weekly = await weeklyRes.json();
      const heatmap = await heatmapRes.json();
      const streakData = await streakRes.json();
      
      setWeeklyData(weekly.map(d => ({
        ...d,
        day: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
      })));
      setHeatmapData(heatmap);
      setStreak(streakData);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <TrendingUp size={20} />
            Discipline Analytics
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* Streak Stats */}
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <div className="stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Flame size={24} style={{ color: '#f59e0b' }} />
                {streak.current_streak}
              </div>
              <div className="stat-label">Current Streak</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{streak.longest_streak}</div>
              <div className="stat-label">Longest Streak</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: '1rem' }}>
            <button className={`tab ${tab === 'weekly' ? 'active' : ''}`} onClick={() => setTab('weekly')}>
              Weekly
            </button>
            <button className={`tab ${tab === 'heatmap' ? 'active' : ''}`} onClick={() => setTab('heatmap')}>
              Monthly Heatmap
            </button>
          </div>

          {tab === 'weekly' && (
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Target size={16} /> Weekly Discipline Score
              </h4>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Score']}
                      contentStyle={{ 
                        background: 'var(--bg-secondary)', 
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem'
                      }}
                    />
                    <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem' }}>
                  Task Completion Trend
                </h4>
                <div style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyData}>
                      <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [value, name === 'completed' ? 'Completed' : 'Total']}
                        contentStyle={{ 
                          background: 'var(--bg-secondary)', 
                          border: '1px solid var(--border)',
                          borderRadius: '0.5rem'
                        }}
                      />
                      <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="total" stroke="#94a3b8" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {tab === 'heatmap' && (
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} /> 30-Day Consistency
              </h4>
              <div className="heatmap">
                {heatmapData.map((day, i) => (
                  <div 
                    key={i} 
                    className="heatmap-cell" 
                    data-level={day.level}
                    title={`${day.date}: ${day.score}%`}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Less</span>
                {[0, 1, 2, 3, 4].map(level => (
                  <div 
                    key={level} 
                    className="heatmap-cell" 
                    data-level={level}
                    style={{ width: 12, height: 12 }}
                  />
                ))}
                <span>More</span>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsModal;
