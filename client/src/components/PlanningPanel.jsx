import { useState } from 'react';
import { Plus, Play, Edit2, Trash2, Check, GripVertical, Clock } from 'lucide-react';

const CATEGORIES = {
  work: { color: '#6366f1', label: 'Work' },
  learning: { color: '#8b5cf6', label: 'Learning' },
  health: { color: '#22c55e', label: 'Health' },
  leisure: { color: '#f59e0b', label: 'Leisure' },
  chores: { color: '#64748b', label: 'Chores' }
};

function PlanningPanel({ tasks, onAddTask, onEditTask, onDeleteTask, onToggleComplete, onStartTimer, activeTaskId }) {
  const [filter, setFilter] = useState('all');

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    if (filter === 'pending') return task.status !== 'completed';
    if (filter === 'completed') return task.status === 'completed';
    return task.category === filter;
  });

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">
          <Clock size={18} />
          Today's Plan
          <span style={{ fontWeight: 400, color: 'var(--text-secondary)', fontSize: '0.875rem', marginLeft: '0.5rem' }}>
            {completedCount}/{tasks.length}
          </span>
        </h2>
        <button className="btn btn-primary" onClick={onAddTask}>
          <Plus size={16} /> Add Task
        </button>
      </div>

      <div style={{ padding: '0.75rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div className="tabs">
          <button className={`tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
          <button className={`tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>Pending</button>
          <button className={`tab ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>Done</button>
        </div>
      </div>

      <div className="panel-content">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <p>No tasks yet. Start planning your day!</p>
          </div>
        ) : (
          <div className="task-list">
            {filteredTasks.map(task => (
              <div 
                key={task.id} 
                className={`task-item ${task.status === 'completed' ? 'completed' : ''} ${activeTaskId === task.id ? 'active' : ''}`}
                data-category={task.category}
              >
                <div 
                  className={`task-checkbox ${task.status === 'completed' ? 'checked' : ''}`}
                  onClick={() => onToggleComplete(task)}
                >
                  {task.status === 'completed' && <Check size={14} color="white" />}
                </div>
                
                <div className="task-content">
                  <div className="task-title" style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  <div className="task-meta">
                    <span className="category-tag" style={{ borderLeft: `3px solid ${CATEGORIES[task.category]?.color || '#6366f1'}` }}>
                      {CATEGORIES[task.category]?.label || task.category}
                    </span>
                    <span className={`priority-badge ${task.priority}`}>
                      {task.priority}
                    </span>
                    {task.planned_start && task.planned_end && (
                      <span>{task.planned_start} - {task.planned_end}</span>
                    )}
                  </div>
                </div>

                <div className="task-actions">
                  {task.status !== 'completed' && (
                    <button 
                      className="btn-icon" 
                      onClick={() => onStartTimer(task)}
                      title="Start timer"
                    >
                      <Play size={16} />
                    </button>
                  )}
                  <button className="btn-icon" onClick={() => onEditTask(task)} title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button className="btn-icon" onClick={() => onDeleteTask(task.id)} title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlanningPanel;
