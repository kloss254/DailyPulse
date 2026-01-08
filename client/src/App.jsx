import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Sun, Moon, Flame, TrendingUp } from 'lucide-react';
import PlanningPanel from './components/PlanningPanel';
import MonitoringPanel from './components/MonitoringPanel';
import QuickActions from './components/QuickActions';
import TaskModal from './components/TaskModal';
import ReflectionModal from './components/ReflectionModal';
import DistractionModal from './components/DistractionModal';
import AnalyticsModal from './components/AnalyticsModal';
import * as storage from './lib/storage';

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
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showReflectionModal, setShowReflectionModal] = useState(false);
  const [showDistractionModal, setShowDistractionModal] = useState(false);
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const loadData = useCallback(() => {
    setTasks(storage.getTasks(currentDate));
    setStreak(storage.getStreak());
    setAnalytics(storage.getDailyAnalytics(currentDate));
  }, [currentDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let interval;
    if (isTimerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const handleAddTask = (taskData) => {
    const newTask = storage.addTask({ ...taskData, date: currentDate });
    setTasks([...tasks, newTask]);
    setShowTaskModal(false);
    setAnalytics(storage.getDailyAnalytics(currentDate));
  };

  const handleUpdateTask = (id, updates) => {
    storage.updateTask(id, updates);
    setTasks(tasks.map(t => t.id === id ? { ...t, ...updates } : t));
    setAnalytics(storage.getDailyAnalytics(currentDate));
  };

  const handleDeleteTask = (id) => {
    storage.deleteTask(id);
    setTasks(tasks.filter(t => t.id !== id));
    if (activeTask?.id === id) {
      setActiveTask(null);
      setIsTimerRunning(false);
    }
    setAnalytics(storage.getDailyAnalytics(currentDate));
  };

  const handleStartTimer = (task) => {
    if (activeTask && activeTask.id !== task.id) {
      handleStopTimer();
    }
    storage.startTimeLog(task.id);
    setActiveTask(task);
    setTimerSeconds(0);
    setIsTimerRunning(true);
  };

  const handleStopTimer = () => {
    if (!activeTask) return;
    storage.stopTimeLog(activeTask.id);
    setIsTimerRunning(false);
    setAnalytics(storage.getDailyAnalytics(currentDate));
  };

  const handleLogDistraction = (data) => {
    if (!activeTask) return;
    storage.addDistraction(activeTask.id, data.description, data.duration);
    setShowDistractionModal(false);
    setAnalytics(storage.getDailyAnalytics(currentDate));
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
        onLogBreak={handleStopTimer}
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
        <ReflectionModal date={currentDate} onClose={() => setShowReflectionModal(false)} />
      )}

      {showDistractionModal && (
        <DistractionModal onSave={handleLogDistraction} onClose={() => setShowDistractionModal(false)} />
      )}

      {showAnalyticsModal && (
        <AnalyticsModal onClose={() => setShowAnalyticsModal(false)} />
      )}
    </div>
  );
}

export default App;
