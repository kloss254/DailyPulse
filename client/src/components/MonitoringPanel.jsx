import { useState, useEffect } from 'react';
import { Target, Zap, AlertCircle, Square, Battery } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const CATEGORY_COLORS = {
  work: '#6366f1',
  learning: '#8b5cf6',
  health: '#22c55e',
  leisure: '#f59e0b',
  chores: '#64748b'
};

function MonitoringPanel({ analytics, activeTask, timerSeconds, isTimerRunning, formatTime, onStopTimer, onLogDistraction, currentDate }) {
  const [energyLevel, setEnergyLevel] = useState(null);
  const [energyLogs, setEnergyLogs] = useState([]);

  useEffect(() => {
    fetchEnergyLogs();
  }, [currentDate]);

  const fetchEnergyLogs = async () => {
    try {
      const res = await fetch(`/api/energy?date=${currentDate}`);
      const data = await res.json();
      setEnergyLogs(data);
      if (data.length > 0) {
        setEnergyLevel(data[data.length - 1].level);
      }
    } catch (err) {
      console.error('Failed to fetch energy logs:', err);
    }
  };

  const handleEnergyLog = async (level) => {
    try {
      await fetch('/api/energy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level })
      });
      setEnergyLevel(level);
      fetchEnergyLogs();
    } catch (err) {
      console.error('Failed to log energy:', err);
    }
  };

  const categoryData = analytics?.categoryTime 
    ? Object.entries(analytics.categoryTime).map(([name, value]) => ({
        name,
        value: Math.round(value / 60),
        color: CATEGORY_COLORS[name] || '#64748b'
      }))
    : [];

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="panel timer-panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Target size={18} />
          Activity Monitor
        </h2>
      </div>

      <div className="panel-content">
        {/* Timer Section */}
        <div className="timer-display" style={{ color: isTimerRunning ? 'var(--accent)' : 'var(--text-primary)' }}>
          {formatTime(timerSeconds)}
        </div>
        
        {activeTask ? (
          <>
            <div className="timer-task">
              Currently: <strong>{activeTask.title}</strong>
            </div>
            <div className="timer-controls">
              {isTimerRunning ? (
                <button className="btn btn-danger" onClick={onStopTimer}>
                  <Square size={16} /> Stop
                </button>
              ) : (
                <button className="btn btn-success" onClick={() => {}}>
                  Paused
                </button>
              )}
              <button className="btn btn-secondary" onClick={onLogDistraction}>
                <AlertCircle size={16} /> Log Distraction
              </button>
            </div>
          </>
        ) : (
          <div className="timer-task">Select a task to start tracking</div>
        )}

        {/* Stats */}
        <div className="stats-grid" style={{ marginTop: '1.5rem' }}>
          <div className="stat-card">
            <div className="stat-value">{analytics?.disciplineScore || 0}%</div>
            <div className="stat-label">Discipline Score</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics?.completedTasks || 0}/{analytics?.totalTasks || 0}</div>
            <div className="stat-label">Tasks Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatDuration(analytics?.totalFocusTime)}</div>
            <div className="stat-label">Focus Time</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics?.distractionCount || 0}</div>
            <div className="stat-label">Distractions</div>
          </div>
        </div>

        {/* Focus Distribution */}
        {categoryData.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={16} /> Focus Distribution
            </h3>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value}m`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center' }}>
              {categoryData.map(cat => (
                <span key={cat.name} style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }}></span>
                  {cat.name}: {cat.value}m
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Energy Tracker */}
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Battery size={16} /> Energy Level
          </h3>
          <div className="energy-scale">
            {[1, 2, 3, 4, 5].map(level => (
              <button
                key={level}
                className={`energy-btn ${energyLevel === level ? 'active' : ''}`}
                onClick={() => handleEnergyLog(level)}
              >
                {level}
              </button>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {energyLogs.length} logs today
          </div>
        </div>
      </div>
    </div>
  );
}

export default MonitoringPanel;
