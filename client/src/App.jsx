import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Flame, Plus, Play, Square, Coffee, Zap, Target, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import PlanningPanel from './components/PlanningPanel';
import MonitoringPanel from './components/MonitoringPanel';
import QuickActions from './components/QuickActions';
import TaskModal from './components/TaskModal';
import ReflectionModal from './components/ReflectionModal';
import DistractionModal from './components/DistractionModal';
import AnalyticsModal from './components/AnalyticsModal';

const API_BASE = '/api';

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [tasks, setTasks] = useState([]);
  const [streak, setStreak] = useState({ current_streak: 0, longest_streak: 0 });
  const [analytics, setAnalytics] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  
  // Modals
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/tasks?date=${currentDate}`);
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [currentDate]);

  const fetchStreak = async () => {
    try {
      const res = await fetch(`${API_BASE}/streak`);
      const data = await res.json();
      setStreak(data);
    } catch (err) {
      console.error('Failed to fetch streak:', err);
    }
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/analytics/daily?date=${currentDate}`);
      const data = await res.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [currentDate]);

  useEffect(() => {
    fetchTasks();
    fetchStreak();
    fetchAnalytics();
  }, [fetchTasks, fetchAnalytics]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleAddTask = async (taskData) => {
    try {
      const res = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...taskData, date: currentDate })
      });
      const newTask = await res.json();
      setTasks([...tasks, newTask]);
      setShowTaskModal(false);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleUpdateTask = async (id, updates) => {
    try {
      await fetch(`${API_BASE}/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== id));
      if (activeTask?.id === id) {
        setActiveTask(null);
        setIsTimerRunning(false);
      }
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleStartTimer = async (task) => {
    if (activeTask && activeTask.id !== task.id) {
      await handleStopTimer();
    }
    try {
      await fetch(`${API_BASE}/timelogs/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: task.id })
      });
      setActiveTask(task);
      setTimerSeconds(0);
      setIsTimerRunning(true);
    } catch (err) {
      console.error('Failed to start timer:', err);
    }
  };

  const handleStopTimer = async () => {
    if (!activeTask) return;
    try {
      await fetch(`${API_BASE}/timelogs/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: activeTask.id })
      });
      setIsTimerRunning(false);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to stop timer:', err);
    }
  };

  const handleLogDistraction = async (data) => {
    if (!activeTask) return;
    try {
      await fetch(`${API_BASE}/distractions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task_id: activeTask.id, ...data })
      });
      setShowDistractionModal(false);
      fetchAnalytics();
    } catch (err) {
      console.error('Failed to log distraction:', err);
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`app ${focusMode ? 'focus-mode' : ''}`}>
      <header className="header">
        <div className="header-left">
          <div className="logo">Discipline Tracker</div>
          <div className="date-display">
            <input 
              type="date" 
              value={currentDate} 
              onChange={(e) => setCurrentDate(e.target.value)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}
            />
          </div>
        </div>
        <div className="streak-badge">
          <Flame size={18} />
          {streak.current_streak} day streak
        </div>
        <div className="header-right">
          <button className="btn btn-secondary" onClick={() => setShowAnalyticsModal(true)}>
            <TrendingUp size={16} /> Analytics
          </button>
          <button className="theme-toggle" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}>
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        <PlanningPanel
          tasks={tasks}
          onAddTask={() => { setEditingTask(null); setShowTaskModal(true); }}
          onEditTask={(task) => { setEditingTask(task); setShowTaskModal(true); }}
          onDeleteTask={handleDeleteTask}
          onToggleComplete={(task) => handleUpdateTask(task.id, { 
            status: task.status === 'completed' ? 'pending' : 'completed' 
          })}
          onStartTimer={handleStartTimer}
          activeTaskId={activeTask?.id}
        />

        <MonitoringPanel
          analytics={analytics}
          activeTask={activeTask}
          timerSeconds={timerSeconds}
          isTimerRunning={isTimerRunning}
          formatTime={formatTime}
          onStopTimer={handleStopTimer}
          onLogDistraction={() => setShowDistractionModal(true)}
          currentDate={currentDate}
        />
      </main>

      <QuickActions
        onStartDeepWork={() => setFocusMode(true)}
        onLogBreak={() => handleStopTimer()}
        onAddTask={() => { setEditingTask(null); setShowTaskModal(true); }}
        onReflection={() => setShowReflectionModal(true)}
        focusMode={focusMode}
        onExitFocus={() => setFocusMode(false)}
      />

      {showTaskModal && (
        <TaskModal
          task={editingTask}
          onSave={editingTask ? (data) => { handleUpdateTask(editingTask.id, data); setShowTaskModal(false); } : handleAddTask}
          onClose={() => setShowTaskModal(false)}
        />
      )}

      {showReflectionModal && (
        <ReflectionModal
          date={currentDate}
          onClose={() => setShowReflectionModal(false)}
        />
      )}

      {showDistractionModal && (
        <DistractionModal
          onSave={handleLogDistraction}
          onClose={() => setShowDistractionModal(false)}
        />
      )}

      {showAnalyticsModal && (
        <AnalyticsModal
          onClose={() => setShowAnalyticsModal(false)}
        />
      )}
    </div>
  );
}

export default App;
