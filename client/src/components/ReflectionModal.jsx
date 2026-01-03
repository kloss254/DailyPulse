import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';

function ReflectionModal({ date, onClose }) {
  const [formData, setFormData] = useState({
    what_worked: '',
    what_derailed: '',
    tomorrow_priorities: '',
    discipline_score: 3
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchReflection();
  }, [date]);

  const fetchReflection = async () => {
    try {
      const res = await fetch(`/api/reflections/${date}`);
      const data = await res.json();
      if (data) {
        setFormData({
          what_worked: data.what_worked || '',
          what_derailed: data.what_derailed || '',
          tomorrow_priorities: data.tomorrow_priorities || '',
          discipline_score: data.discipline_score || 3
        });
      }
    } catch (err) {
      console.error('Failed to fetch reflection:', err);
    }
  };

  const handleSave = async () => {
    try {
      await fetch('/api/reflections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, ...formData })
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save reflection:', err);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Daily Reflection</h3>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">What worked well today?</label>
            <textarea
              className="form-textarea"
              value={formData.what_worked}
              onChange={e => setFormData({ ...formData, what_worked: e.target.value })}
              placeholder="Celebrate your wins..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">What derailed you?</label>
            <textarea
              className="form-textarea"
              value={formData.what_derailed}
              onChange={e => setFormData({ ...formData, what_derailed: e.target.value })}
              placeholder="Identify obstacles..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Tomorrow's non-negotiables</label>
            <textarea
              className="form-textarea"
              value={formData.tomorrow_priorities}
              onChange={e => setFormData({ ...formData, tomorrow_priorities: e.target.value })}
              placeholder="What must get done tomorrow?"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Self-rated discipline (1-5)</label>
            <div className="energy-scale">
              {[1, 2, 3, 4, 5].map(level => (
                <button
                  key={level}
                  type="button"
                  className={`energy-btn ${formData.discipline_score === level ? 'active' : ''}`}
                  onClick={() => setFormData({ ...formData, discipline_score: level })}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleSave}>
            <Save size={16} /> {saved ? 'Saved!' : 'Save Reflection'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReflectionModal;
