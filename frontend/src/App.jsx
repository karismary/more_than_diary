import { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import WriteView from './components/WriteView';
import DiaryView from './components/DiaryView';
import AskView from './components/AskView';
import IndexView from './components/IndexView';
import { createEntry, deleteEntry, loadEntries } from './api';
import { todayLabel } from './mock';

const viewTitles = {
  write: '写日记',
  diary: '日记',
  ask: 'AI 问答',
  index: '索引状态',
};

export default function App() {
  const [entries, setEntries] = useState([]);
  const [activeView, setActiveView] = useState('write');
  const [selectedId, setSelectedId] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    loadEntries()
      .then((items) => {
        setEntries(items);
        setSelectedId(items[0]?.id ?? null);
      })
      .catch((error) => setToast(error.message));
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const handleSave = async (content) => {
    const entry = await createEntry(content);
    setEntries((prev) => [entry, ...prev]);
    setSelectedId(entry.id);
    setToast('日记已保存');
  };

  const handleDelete = async (id) => {
    await deleteEntry(id);
    const next = entries.filter((entry) => entry.id !== id);
    setEntries(next);
    if (selectedId === id) {
      setSelectedId(next[0]?.id ?? null);
    }
    setToast('日记已删除');
  };

  return (
    <div className="app-shell">
      <Sidebar active={activeView} onChange={setActiveView} />
      <main className="main">
        <header className="page-head">
          <h1>{viewTitles[activeView]}</h1>
          <span className="page-meta">Diary RAG · Demo</span>
        </header>
        {activeView === 'write' && <WriteView today={todayLabel()} onSave={handleSave} />}
        {activeView === 'diary' && (
          <DiaryView
            entries={entries}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onDelete={handleDelete}
          />
        )}
        {activeView === 'ask' && <AskView />}
        {activeView === 'index' && <IndexView entries={entries} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
