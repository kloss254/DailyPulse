import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

const COMMON_DISTRACTIONS = [
  'Social media',
  'Email/Messages',
  'Phone call',
  'Colleague interruption',
  'Unrelated browsing',
  'Snack break',
  'Other'
];

function DistractionModal({ onSave, onClose }) {
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(5);

  const handleQuickSelect = (item) => {
    setDescription(item);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSave({ description, duration: duration * 60 });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            <AlertCircle size={20} style={{ color: 'var(--warning)' }} />
            Log Distraction
          </h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Quick Select</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {COMMON_DISTRACTIONS.map(item => (
                  <button
                    key={item}
                    type="button"
                    className={`btn ${description === item ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ fontSize: '0.8rem', padding: '0.375rem 0.75rem' }}
                    onClick={() => handleQuickSelect(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                type="text"
                className="form-input"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What distracted you?"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estimated time lost (minutes)</label>
              <input
                type="number"
                className="form-input"
                value={duration}
                onChange={e => setDuration(parseInt(e.target.value) || 0)}
                min={1}
                max={120}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Log Distraction</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DistractionModal;
