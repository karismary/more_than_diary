import { useState } from 'react';
import { CheckCircle2, Save } from 'lucide-react';

export default function WriteView({ today, onSave }) {
  const [content, setContent] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    const text = content.trim();
    if (!text || busy) return;

    setBusy(true);
    setError('');
    try {
      await onSave(text);
      setContent('');
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1800);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="editor-panel">
      <div className="editor-meta">
        <span className="editor-date">{today}</span>
        <span className="editor-count">{content.length} 字</span>
      </div>
      <textarea
        className="editor-input"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="今天发生了什么？"
      />
      <div className="editor-actions">
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={!content.trim() || busy}
        >
          {saved ? <CheckCircle2 size={16} /> : <Save size={16} />}
          {busy ? '正在索引…' : saved ? '已保存' : '保存日记'}
        </button>
      </div>
      {error && <div className="error-note">{error}</div>}
    </section>
  );
}
