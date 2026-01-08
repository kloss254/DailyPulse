// LocalStorage-based persistence for Vercel deployment
const STORAGE_KEYS = {
  TASKS: 'discipline_tasks',
  TIME_LOGS: 'discipline_timelogs',
  DISTRACTIONS: 'discipline_distractions',
  ENERGY_LOGS: 'discipline_energy',
  REFLECTIONS: 'discipline_reflections',
  STREAK: 'discipline_streak',
  MOTIVATION: 'discipline_motivation'
};

function getItem(key, defaultValue = []) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setItem(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Tasks
export function getTasks(date) {
  const tasks = getItem(STORAGE_KEYS.TASKS);
  return tasks.filter(t => t.date === date).sort((a, b) => a.order_index - b.order_index);
}

export function addTask(task) {
  const tasks = getItem(STORAGE_KEYS.TASKS);
  const dateTasks = tasks.filter(t => t.date === task.date);
  const newTask = {
    ...task,
    id: generateId(),
    status: 'pending',
    order_index: dateTasks.length,
    created_at: new Date().toISOString()
  };
  setItem(STORAGE_KEYS.TASKS, [...tasks, newTask]);
  return newTask;
}

export function updateTask(id, updates) {
  const tasks = getItem(STORAGE_KEYS.TASKS);
  const updated = tasks.map(t => t.id === id ? { ...t, ...updates } : t);
  setItem(STORAGE_KEYS.TASKS, updated);
}

export function deleteTask(id) {
  const tasks = getItem(STORAGE_KEYS.TASKS);
  setItem(STORAGE_KEYS.TASKS, tasks.filter(t => t.id !== id));
}

// Time Logs
export function startTimeLog(taskId) {
  const logs = getItem(STORAGE_KEYS.TIME_LOGS);
  const newLog = {
    id: generateId(),
    task_id: taskId,
    start_time: new Date().toISOString(),
    end_time: null,
    duration: 0
  };
  setItem(STORAGE_KEYS.TIME_LOGS, [...logs, newLog]);
  updateTask(taskId, { status: 'in_progress', actual_start: newLog.start_time });
  return newLog;
}

export function stopTimeLog(taskId) {
  const logs = getItem(STORAGE_KEYS.TIME_LOGS);
  const endTime = new Date().toISOString();
  const updated = logs.map(log => {
    if (log.task_id === taskId && !log.end_time) {
      const duration = Math.floor((new Date(endTime) - new Date(log.start_time)) / 1000);
      return { ...log, end_time: endTime, duration };
    }
    return log;
  });
  setItem(STORAGE_KEYS.TIME_LOGS, updated);
}

export function getTimeLogs(taskId) {
  return getItem(STORAGE_KEYS.TIME_LOGS).filter(l => l.task_id === taskId);
}

// Distractions
export function addDistraction(taskId, description, duration) {
  const distractions = getItem(STORAGE_KEYS.DISTRACTIONS);
  const newDistraction = {
    id: generateId(),
    task_id: taskId,
    description,
    duration: duration || 0,
    timestamp: new Date().toISOString()
  };
  setItem(STORAGE_KEYS.DISTRACTIONS, [...distractions, newDistraction]);
  return newDistraction;
}

export function getDistractions(date) {
  const distractions = getItem(STORAGE_KEYS.DISTRACTIONS);
  const tasks = getItem(STORAGE_KEYS.TASKS);
  const taskIds = tasks.filter(t => t.date === date).map(t => t.id);
  return distractions.filter(d => taskIds.includes(d.task_id));
}


// Energy Logs
export function addEnergyLog(level, note) {
  const logs = getItem(STORAGE_KEYS.ENERGY_LOGS);
  const newLog = {
    id: generateId(),
    level,
    note,
    timestamp: new Date().toISOString()
  };
  setItem(STORAGE_KEYS.ENERGY_LOGS, [...logs, newLog]);
  return newLog;
}

export function getEnergyLogs(date) {
  const logs = getItem(STORAGE_KEYS.ENERGY_LOGS);
  return logs.filter(l => l.timestamp.startsWith(date));
}

// Reflections
export function saveReflection(date, data) {
  const reflections = getItem(STORAGE_KEYS.REFLECTIONS);
  const existing = reflections.findIndex(r => r.date === date);
  const reflection = { id: generateId(), date, ...data, created_at: new Date().toISOString() };
  
  if (existing >= 0) {
    reflections[existing] = { ...reflections[existing], ...data };
    setItem(STORAGE_KEYS.REFLECTIONS, reflections);
    return reflections[existing];
  } else {
    setItem(STORAGE_KEYS.REFLECTIONS, [...reflections, reflection]);
    return reflection;
  }
}

export function getReflection(date) {
  const reflections = getItem(STORAGE_KEYS.REFLECTIONS);
  return reflections.find(r => r.date === date) || null;
}

// Streak
export function getStreak() {
  return getItem(STORAGE_KEYS.STREAK, { current_streak: 0, longest_streak: 0, last_completed_date: null });
}

export function updateStreak(completed, date) {
  const streak = getStreak();
  const today = date || new Date().toISOString().split('T')[0];
  
  if (completed) {
    const yesterday = new Date(new Date(today).getTime() - 86400000).toISOString().split('T')[0];
    let newStreak = streak.current_streak;
    
    if (streak.last_completed_date === yesterday || streak.last_completed_date === today) {
      if (streak.last_completed_date !== today) newStreak++;
    } else {
      newStreak = 1;
    }
    
    const longest = Math.max(newStreak, streak.longest_streak);
    const updated = { current_streak: newStreak, longest_streak: longest, last_completed_date: today };
    setItem(STORAGE_KEYS.STREAK, updated);
    return updated;
  }
  return streak;
}

// Analytics
export function getDailyAnalytics(date) {
  const tasks = getTasks(date);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const disciplineScore = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const allTimeLogs = getItem(STORAGE_KEYS.TIME_LOGS);
  const taskIds = tasks.map(t => t.id);
  const timeLogs = allTimeLogs.filter(l => taskIds.includes(l.task_id));
  
  const totalFocusTime = timeLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const categoryTime = {};
  timeLogs.forEach(log => {
    const task = tasks.find(t => t.id === log.task_id);
    if (task) {
      categoryTime[task.category] = (categoryTime[task.category] || 0) + (log.duration || 0);
    }
  });
  
  const distractions = getDistractions(date);
  
  return {
    disciplineScore,
    completedTasks: completed,
    totalTasks: total,
    totalFocusTime,
    categoryTime,
    distractionCount: distractions.length
  };
}

export function getWeeklyAnalytics() {
  const data = [];
  const endDate = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(endDate.getTime() - i * 86400000).toISOString().split('T')[0];
    const tasks = getTasks(date);
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    data.push({
      date,
      score: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      total
    });
  }
  return data;
}

export function getHeatmapData() {
  const data = [];
  const endDate = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(endDate.getTime() - i * 86400000).toISOString().split('T')[0];
    const tasks = getTasks(date);
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    const score = total > 0 ? Math.round((completed / total) * 100) : 0;
    data.push({
      date,
      score,
      level: total === 0 ? 0 : completed === total ? 4 : completed > total * 0.75 ? 3 : completed > total * 0.5 ? 2 : 1
    });
  }
  return data;
}

// Motivation Bank
export function getMotivation() {
  return getItem(STORAGE_KEYS.MOTIVATION);
}

export function addMotivation(content, type = 'quote') {
  const items = getItem(STORAGE_KEYS.MOTIVATION);
  const newItem = { id: generateId(), content, type, created_at: new Date().toISOString() };
  setItem(STORAGE_KEYS.MOTIVATION, [...items, newItem]);
  return newItem;
}

export function deleteMotivation(id) {
  const items = getItem(STORAGE_KEYS.MOTIVATION);
  setItem(STORAGE_KEYS.MOTIVATION, items.filter(i => i.id !== id));
}
