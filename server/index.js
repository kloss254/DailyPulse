const express = require('express');
const cors = require('cors');
const initSqlJs = require('sql.js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let db;
const DB_PATH = path.join(__dirname, 'discipline.db');

// Initialize sql.js and database
async function initDb() {
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
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
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS time_logs (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS distractions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      description TEXT,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      duration INTEGER DEFAULT 0
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS energy_logs (
      id TEXT PRIMARY KEY,
      level INTEGER,
      timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
      note TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL UNIQUE,
      what_worked TEXT,
      what_derailed TEXT,
      tomorrow_priorities TEXT,
      discipline_score INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS streaks (
      id INTEGER PRIMARY KEY,
      current_streak INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      last_completed_date TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS motivation_bank (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'quote',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'workday',
      tasks TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Initialize streak if not exists
  const streakExists = db.exec('SELECT * FROM streaks WHERE id = 1');
  if (streakExists.length === 0 || streakExists[0].values.length === 0) {
    db.run('INSERT INTO streaks (id, current_streak, longest_streak) VALUES (1, 0, 0)');
  }

  saveDb();
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function runSql(sql, params = []) {
  db.run(sql, params);
  saveDb();
}


// ============ TASK ROUTES ============
app.get('/api/tasks', (req, res) => {
  const { date } = req.query;
  const tasks = queryAll('SELECT * FROM tasks WHERE date = ? ORDER BY order_index', [date || new Date().toISOString().split('T')[0]]);
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const { title, description, category, priority, planned_start, planned_end, date } = req.body;
  const id = uuidv4();
  const maxOrder = queryOne('SELECT MAX(order_index) as max FROM tasks WHERE date = ?', [date]);
  const order_index = (maxOrder?.max || 0) + 1;
  
  runSql(`INSERT INTO tasks (id, title, description, category, priority, planned_start, planned_end, date, order_index) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, title, description, category, priority, planned_start, planned_end, date, order_index]);
  
  res.json({ id, title, description, category, priority, planned_start, planned_end, date, order_index, status: 'pending' });
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = [...Object.values(updates), id];
  runSql(`UPDATE tasks SET ${fields} WHERE id = ?`, values);
  res.json({ success: true });
});

app.delete('/api/tasks/:id', (req, res) => {
  runSql('DELETE FROM tasks WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

app.put('/api/tasks/reorder', (req, res) => {
  const { tasks } = req.body;
  tasks.forEach((task, index) => runSql('UPDATE tasks SET order_index = ? WHERE id = ?', [index, task.id]));
  res.json({ success: true });
});

// ============ TIME LOG ROUTES ============
app.post('/api/timelogs/start', (req, res) => {
  const { task_id } = req.body;
  const id = uuidv4();
  const start_time = new Date().toISOString();
  runSql('INSERT INTO time_logs (id, task_id, start_time) VALUES (?, ?, ?)', [id, task_id, start_time]);
  runSql('UPDATE tasks SET status = ?, actual_start = COALESCE(actual_start, ?) WHERE id = ?', ['in_progress', start_time, task_id]);
  res.json({ id, task_id, start_time });
});

app.post('/api/timelogs/stop', (req, res) => {
  const { task_id } = req.body;
  const end_time = new Date().toISOString();
  const log = queryOne('SELECT * FROM time_logs WHERE task_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1', [task_id]);
  if (log) {
    const duration = Math.floor((new Date(end_time) - new Date(log.start_time)) / 1000);
    runSql('UPDATE time_logs SET end_time = ?, duration = ? WHERE id = ?', [end_time, duration, log.id]);
  }
  res.json({ success: true, end_time });
});

app.get('/api/timelogs/:taskId', (req, res) => {
  const logs = queryAll('SELECT * FROM time_logs WHERE task_id = ?', [req.params.taskId]);
  res.json(logs);
});

// ============ DISTRACTION ROUTES ============
app.post('/api/distractions', (req, res) => {
  const { task_id, description, duration } = req.body;
  const id = uuidv4();
  runSql('INSERT INTO distractions (id, task_id, description, duration) VALUES (?, ?, ?, ?)', [id, task_id, description, duration || 0]);
  res.json({ id, task_id, description, duration });
});

app.get('/api/distractions', (req, res) => {
  const { date } = req.query;
  const distractions = queryAll(`
    SELECT d.* FROM distractions d 
    JOIN tasks t ON d.task_id = t.id 
    WHERE t.date = ?
  `, [date || new Date().toISOString().split('T')[0]]);
  res.json(distractions);
});

// ============ ENERGY ROUTES ============
app.post('/api/energy', (req, res) => {
  const { level, note } = req.body;
  const id = uuidv4();
  runSql('INSERT INTO energy_logs (id, level, note) VALUES (?, ?, ?)', [id, level, note]);
  res.json({ id, level, note });
});

app.get('/api/energy', (req, res) => {
  const { date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  const logs = queryAll("SELECT * FROM energy_logs WHERE DATE(timestamp) = ? ORDER BY timestamp", [dateStr]);
  res.json(logs);
});

// ============ REFLECTION ROUTES ============
app.post('/api/reflections', (req, res) => {
  const { date, what_worked, what_derailed, tomorrow_priorities, discipline_score } = req.body;
  const id = uuidv4();
  const existing = queryOne('SELECT id FROM reflections WHERE date = ?', [date]);
  if (existing) {
    runSql('UPDATE reflections SET what_worked = ?, what_derailed = ?, tomorrow_priorities = ?, discipline_score = ? WHERE date = ?',
      [what_worked, what_derailed, tomorrow_priorities, discipline_score, date]);
  } else {
    runSql('INSERT INTO reflections (id, date, what_worked, what_derailed, tomorrow_priorities, discipline_score) VALUES (?, ?, ?, ?, ?, ?)',
      [id, date, what_worked, what_derailed, tomorrow_priorities, discipline_score]);
  }
  res.json({ id, date, what_worked, what_derailed, tomorrow_priorities, discipline_score });
});

app.get('/api/reflections/:date', (req, res) => {
  const reflection = queryOne('SELECT * FROM reflections WHERE date = ?', [req.params.date]);
  res.json(reflection || null);
});


// ============ STREAK ROUTES ============
app.get('/api/streak', (req, res) => {
  const streak = queryOne('SELECT * FROM streaks WHERE id = 1');
  res.json(streak || { current_streak: 0, longest_streak: 0 });
});

app.post('/api/streak/update', (req, res) => {
  const { completed, date } = req.body;
  const streak = queryOne('SELECT * FROM streaks WHERE id = 1');
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
    runSql('UPDATE streaks SET current_streak = ?, longest_streak = ?, last_completed_date = ? WHERE id = 1',
      [newStreak, longest, today]);
    res.json({ current_streak: newStreak, longest_streak: longest });
  } else {
    res.json(streak);
  }
});

// ============ ANALYTICS ROUTES ============
app.get('/api/analytics/daily', (req, res) => {
  const { date } = req.query;
  const dateStr = date || new Date().toISOString().split('T')[0];
  
  const tasks = queryAll('SELECT * FROM tasks WHERE date = ?', [dateStr]);
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  const disciplineScore = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  const timeLogs = queryAll(`
    SELECT tl.*, t.category FROM time_logs tl 
    JOIN tasks t ON tl.task_id = t.id 
    WHERE t.date = ?
  `, [dateStr]);
  
  const totalFocusTime = timeLogs.reduce((acc, log) => acc + (log.duration || 0), 0);
  const categoryTime = {};
  timeLogs.forEach(log => {
    categoryTime[log.category] = (categoryTime[log.category] || 0) + (log.duration || 0);
  });
  
  const distractions = queryOne(`
    SELECT COUNT(*) as count FROM distractions d 
    JOIN tasks t ON d.task_id = t.id 
    WHERE t.date = ?
  `, [dateStr]);
  
  res.json({
    disciplineScore,
    completedTasks: completed,
    totalTasks: total,
    totalFocusTime,
    categoryTime,
    distractionCount: distractions?.count || 0
  });
});

app.get('/api/analytics/weekly', (req, res) => {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 7 * 86400000);
  
  const data = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate.getTime() + i * 86400000).toISOString().split('T')[0];
    const tasks = queryAll('SELECT * FROM tasks WHERE date = ?', [date]);
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
    const tasks = queryAll('SELECT * FROM tasks WHERE date = ?', [date]);
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
  const items = queryAll('SELECT * FROM motivation_bank ORDER BY created_at DESC');
  res.json(items);
});

app.post('/api/motivation', (req, res) => {
  const { content, type } = req.body;
  const id = uuidv4();
  runSql('INSERT INTO motivation_bank (id, content, type) VALUES (?, ?, ?)', [id, content, type || 'quote']);
  res.json({ id, content, type });
});

app.delete('/api/motivation/:id', (req, res) => {
  runSql('DELETE FROM motivation_bank WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ============ TEMPLATES ============
app.get('/api/templates', (req, res) => {
  const templates = queryAll('SELECT * FROM templates');
  res.json(templates.map(t => ({ ...t, tasks: JSON.parse(t.tasks) })));
});

app.post('/api/templates', (req, res) => {
  const { name, type, tasks } = req.body;
  const id = uuidv4();
  runSql('INSERT INTO templates (id, name, type, tasks) VALUES (?, ?, ?, ?)', [id, name, type, JSON.stringify(tasks)]);
  res.json({ id, name, type, tasks });
});

// Start server after DB init
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});
