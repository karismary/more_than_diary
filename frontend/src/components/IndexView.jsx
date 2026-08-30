import { Database, FileText, Layers, Sparkles } from 'lucide-react';
import { chunkCount, formatDateLabel, makeTitle } from '../mock';

export default function IndexView({ entries }) {
  const chunks = entries.reduce((sum, entry) => sum + chunkCount(entry.content), 0);
  const stats = [
    { icon: FileText, label: '日记条目', value: entries.length },
    { icon: Layers, label: '文本片段', value: chunks },
    { icon: Database, label: '向量记录', value: chunks },
    { icon: Sparkles, label: 'Embedding 维度', value: 768 },
  ];

  return (
    <>
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="stat-card">
              <div className="stat-icon">
                <Icon size={16} />
              </div>
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          );
        })}
      </div>
      <div className="panel">
        <div className="panel-head">
          <h3>最近索引</h3>
          <span className="status-pill">空闲</span>
        </div>
        <div>
          {entries.length === 0 ? (
            <div className="empty-note">暂无索引任务</div>
          ) : (
            entries.slice(0, 5).map((entry) => (
              <div key={entry.id} className="task-row">
                <div>
                  <div className="task-title">{makeTitle(entry.content)}</div>
                  <div className="task-meta">
                    {formatDateLabel(entry.date, entry.time)} · {chunkCount(entry.content)} 个片段
                  </div>
                </div>
                <span className="task-status">已索引</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
