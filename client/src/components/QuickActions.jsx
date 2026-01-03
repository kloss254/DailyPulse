import { Target, Coffee, Plus, BookOpen, X } from 'lucide-react';

function QuickActions({ onStartDeepWork, onLogBreak, onAddTask, onReflection, focusMode, onExitFocus }) {
  if (focusMode) {
    return (
      <div className="quick-actions">
        <button className="btn btn-danger" onClick={onExitFocus}>
          <X size={16} /> Exit Focus Mode
        </button>
      </div>
    );
  }

  return (
    <div className="quick-actions">
      <button className="btn btn-primary" onClick={onStartDeepWork}>
        <Target size={16} /> Start Deep Work
      </button>
      <button className="btn btn-secondary" onClick={onLogBreak}>
        <Coffee size={16} /> Log Break
      </button>
      <button className="btn btn-secondary" onClick={onAddTask}>
        <Plus size={16} /> Add Unexpected Task
      </button>
      <button className="btn btn-secondary" onClick={onReflection}>
        <BookOpen size={16} /> 5-min Reflection
      </button>
    </div>
  );
}

export default QuickActions;
