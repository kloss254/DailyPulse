import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import * as storage from '../lib/storage';

function ReflectionModal({ date, onClose }) {
  const [formData, setFormData] = useState({
    what_worked: '',
    what_derailed: '',
    tomorrow_priorities: '',
    discipline_score: 3
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const reflection = storage.getReflection(date);
    if (reflection) {
      setFormData({
        what_worked: reflection.what_worked || '',
        what_derailed: reflection.what_derailed || '',
        tomorrow_priorities: reflection.tomorrow_priorities || '',
        discipline_score: reflection.discipline_score || 3
      });
    }
  }, [date]);

  const handleSave = () => {
    storage.saveReflection(date, formData);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">Daily Reflection</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">What worked well today?</label>
            <textarea className="form-textarea" value={formData.what_worked} onChange={e => setFormData({ ...formData, what_worked: e.target.value })} placeholder="Celebrate your wins..." rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">What derailed you?</label>
            <textarea className="form-textarea" value={formData.what_derailed} onChange={e => setFormData({ ...formData, what_derailed: e.target.value })} placeholder="Identify obstacles..." rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">Tomorrow's non-negotiables</label>
            <textarea className="form-textarea" value={formData.tomorrow_priorities} onChange={e => setFormData({ ...formData, tomorrow_priorities: e.target.value })} placeholder="What must get done tomorrow?" rows={3} />
          </div>

          <div className="form-group">
            <label className="form-label">Self-rated discipline (1-5)</label>
            <div className="energy-scale">
              {[1, 2, 3, 4, 5].map(level => (
                <button key={level} type="button" className={`energy-btn ${formData.discipline_score === level ? 'active' : ''}`} onClick={() => setFormData({ ...formData, discipline_score: level })}>
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleSave}><Save size={16} /> {saved ? 'Saved!' : 'Save Reflection'}</button>
        </div>
      </div>
    </div>
  );
}

export default ReflectionModal;
