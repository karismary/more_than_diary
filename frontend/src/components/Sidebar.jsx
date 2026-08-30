import { BookOpen, Database, MessageCircle, PenLine } from 'lucide-react';

const items = [
  { id: 'write', label: '写日记', icon: PenLine },
  { id: 'diary', label: '日记', icon: BookOpen },
  { id: 'ask', label: 'AI 问答', icon: MessageCircle },
  { id: 'index', label: '索引状态', icon: Database },
];

export default function Sidebar({ active, onChange }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">
          <BookOpen size={18} strokeWidth={2.2} />
        </div>
        <div>
          <div className="brand-name">Diary RAG</div>
          <div className="brand-sub">本地记忆助手</div>
        </div>
      </div>
      <nav className="nav" aria-label="主导航">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item${active === item.id ? ' active' : ''}`}
              onClick={() => onChange(item.id)}
              aria-label={item.label}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-foot">
        <div className="demo-badge">
          <span className="dot" />
          演示模式
        </div>
      </div>
    </aside>
  );
}
