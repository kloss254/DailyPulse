const express = require('express');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new Database(path.join(__dirname, 'discipline.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'work',
    priority TEXT DEFAULT 'medium',
    planned_start TEXT,
    planned_end TEXT,
    actual_start TEXT,
    actual_end TEXT,
    status TEXT DEFAULT 'pending',
    date TEXT NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT,
    duration INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS distractions (
    id TEXT PRIMARY KEY,
    task_id TEXT,
    description TEXT,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    duration INTEGER DEFAULT 0,
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );

  CREATE TABLE IF NOT EXISTS energy_logs (
    id TEXT PRIMARY KEY,
    level INTEGER CHECK(level >= 1 AND level <= 5),
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL UNIQUE,
    what_worked TEXT,
    what_derailed TEXT,
    tomorrow_priorities TEXT,
    discipline_score INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS streaks (
    id INTEGER PRIMARY KEY,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_date TEXT
  );

  CREATE TABLE IF NOT EXISTS motivation_bank (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'quote',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'workday',
    tasks TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

// Initialize streak if not exists
const streakExists = db.prepare('SELECT * FROM streaks WHERE id = 1').get();
if (!streakExists) {
  db.prepare('INSERT INTO streaks (id, current_streak, longest_streak) VALUES (1, 0, 0)').run();
}


// ============ TASK ROUTES ============
app.get('/api/tasks', (req, res) => {
  const { date } = req.query;
  const tasks = db.prepare('SELECT * FROM tasks WHERE date = ? ORDER BY order_index').all(date || new Date().toISOString().split('T')[0]);
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, category, priority, planned_start, planned_end, date } = req.body;
  const id = uuidv4();
  const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM tasks WHERE date = ?').get(date);
  const order_index = (maxOrder?.max || 0) + 1;
  
  db.prepare(`INSERT INTO tasks (id, title, description, category, priority, planned_start, planned_end, date, order_index) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(id, title, description, category, priority, planned_start, planned_end, date, order_index);
  
  res.json({ id, title, description, category, priority, planned_start, planned_end, date, order_index, status: 'pending' });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  db.prepare(`UPDATE tasks SET ${fields} WHERE id = ?`).run(...values);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

app.put('/api/tasks/reorder', (req, res) => {
  const { tasks } = req.body;
  const stmt = db.prepare('UPDATE tasks SET order_index = ? WHERE id = ?');
  tasks.forEach((task, index) => stmt.run(index, task.id));
  res.json({ success: true });
});

// ============ TIME LOG ROUTES ============
app.post('/api/timelogs/start', (req, res) => {
  const { task_id } = req.body;
  const id = uuidv4();
  const start_time = new Date().toISOString();
  db.prepare('INSERT INTO time_logs (id, task_id, start_time) VALUES (?, ?, ?)').run(id, task_id, start_time);
  db.prepare('UPDATE tasks SET status = ?, actual_start = COALESCE(actual_start, ?) WHERE id = ?').run('in_progress', start_time, task_id);
  res.json({ id, task_id, start_time });
});

app.post('/api/timelogs/stop', (req, res) => {
  const { task_id } = req.body;
  const end_time = new Date().toISOString();
  const log = db.prepare('SELECT * FROM time_logs WHERE task_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1').get(task_id);
  if (log) {
    const duration = Math.floor((new Date(end_time) - new Date(log.start_time)) / 1000);
    db.prepare('UPDATE time_logs SET end_time = ?, duration = ? WHERE id = ?').run(end_time, duration, log.id);
  }
  res.json({ success: true, end_time });
});

app.get('/api/timelogs/:taskId', (req, res) => {
  const logs = db.prepare('SELECT * FROM time_logs WHERE task_id = ?').all(req.params.taskId);
  res.json(logs);
});

// ============ DISTRACTION ROUTES ============
app.post('/api/distractions', (req, res) => {
  const { task_id, description, duration } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO distractions (id, task_id, description, duration) VALUES (?, ?, ?, ?)').run(id, task_id, description, duration || 0);
  res.json({ id, task_id, description, duration });
});

app.get('/api/distractions', (req, res) => {
  const { date } = req.query;
  const distractions = db.prepare(`
    SELECT d.* FROM distractions d 
    JOIN tasks t ON d.task_id = t.id 
    WHERE t.date = ?
  `).all(date || new Date().toISOString().split('T')[0]);
  res.json(distractions);
});

// ============ ENERGY ROUTES ============
app.post('/api/energy', (req, res) => {
  const { level, note } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO energy_logs (id, level, note) VALUES (?, ?, ?)').run(id, level, note);
  res.json({ id, level, note });
});

app.get('/api/energy', (req, res) => {
  const { date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  const logs = db.prepare("SELECT * FROM energy_logs WHERE DATE(timestamp) = ? ORDER BY timestamp").all(dateStr);
  res.json(logs);
});


// ============ REFLECTION ROUTES ============
app.post('/api/reflections', (req, res) => {
  const { date, what_worked, what_derailed, tomorrow_priorities, discipline_score } = req.body;
  const id = uuidv4();
  db.prepare(`INSERT OR REPLACE INTO reflections (id, date, what_worked, what_derailed, tomorrow_priorities, discipline_score) 
    VALUES (?, ?, ?, ?, ?, ?)`).run(id, date, what_worked, what_derailed, tomorrow_priorities, discipline_score);
  res.json({ id, date, what_worked, what_derailed, tomorrow_priorities, discipline_score });
});

app.get('/api/reflections/:date', (req, res) => {
  const reflection = db.prepare('SELECT * FROM reflections WHERE date = ?').get(req.params.date);
  res.json(reflection || null);
});

// ============ STREAK ROUTES ============
app.get('/api/streak', (req, res) => {
  const streak = db.prepare('SELECT * FROM streaks WHERE id = 1').get();
  res.json(streak);
});

app.post('/api/streak/update', (req, res) => {
  const { completed, date } = req.body;
  const streak = db.prepare('SELECT * FROM streaks WHERE id = 1').get();
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
    db.prepare('UPDATE streaks SET current_streak = ?, longest_streak = ?, last_completed_date = ? WHERE id = 1')
      .run(newStreak, longest, today);
    res.json({ current_streak: newStreak, longest_streak: longest });
  } else {
    res.json(streak);
  }
});

// ============ ANALYTICS ROUTES ============
app.get('/api/analytics/daily', (req, res) => {
  const { date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  
  const tasks = db.prepare('SELECT * FROM tasks WHERE date = ?').all(dateStr);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const disciplineScore = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const timeLogs = db.prepare(`
    SELECT tl.*, t.category FROM time_logs tl 
    JOIN tasks t ON tl.task_id = t.id 
    WHERE t.date = ?
  `).all(dateStr);
  
  const totalFocusTime = timeLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const categoryTime = {};
  timeLogs.forEach(log => {
    categoryTime[log.category] = (categoryTime[log.category] || 0) + (log.duration || 0);
  });
  
  const distractions = db.prepare(`
    SELECT COUNT(*) as count FROM distractions d 
    JOIN tasks t ON d.task_id = t.id 
    WHERE t.date = ?
  `).get(dateStr);
  
  res.json({
    disciplineScore,
    completedTasks: completed,
    totalTasks: total,
    totalFocusTime,
    categoryTime,
    distractionCount: distractions.count
  });
});

app.get('/api/analytics/weekly', (req, res) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 86400000);
  
  const data = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0];
    const tasks = db.prepare('SELECT * FROM tasks WHERE date = ?').all(date);
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    data.push({
      date,
      score: total > 0 ? Math.round((completed / total) * 100) : 0,
      completed,
      total
    });
  }
  res.json(data);
});

app.get('/api/analytics/heatmap', (req, res) => {
  const days = 30;
  const endDate = new Date();
  const data = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(endDate.getTime() - i * 86400000).toISOString().split('T')[0];
    const tasks = db.prepare('SELECT * FROM tasks WHERE date = ?').all(date);
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    data.push({
      date,
      score: total > 0 ? Math.round((completed / total) * 100) : 0,
      level: total === 0 ? 0 : completed === total ? 4 : completed > total * 0.75 ? 3 : completed > total * 0.5 ? 2 : 1
    });
  }
  res.json(data);
});

// ============ MOTIVATION BANK ============
app.get('/api/motivation', (req, res) => {
  const items = db.prepare('SELECT * FROM motivation_bank ORDER BY created_at DESC').all();
  res.json(items);
});

app.post('/api/motivation', (req, res) => {
  const { content, type } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO motivation_bank (id, content, type) VALUES (?, ?, ?)').run(id, content, type || 'quote');
  res.json({ id, content, type });
});

app.delete('/api/motivation/:id', (req, res) => {
  db.prepare('DELETE FROM motivation_bank WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ============ TEMPLATES ============
app.get('/api/templates', (req, res) => {
  const templates = db.prepare('SELECT * FROM templates').all();
  res.json(templates.map(t => ({ ...t, tasks: JSON.parse(t.tasks) })));
});

app.post('/api/templates', (req, res) => {
  const { name, type, tasks } = req.body;
  const id = uuidv4();
  db.prepare('INSERT INTO templates (id, name, type, tasks) VALUES (?, ?, ?, ?)').run(id, name, type, JSON.stringify(tasks));
  res.json({ id, name, type, tasks });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
