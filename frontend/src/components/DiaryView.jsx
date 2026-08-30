import { CalendarDays, Clock3, FileText, Trash2 } from 'lucide-react';
import { chunkCount, formatDateLabel, makeTitle } from '../mock';

export default function DiaryView({ entries, selectedId, onSelect, onDelete }) {
  const selected = entries.find((entry) => entry.id === selectedId) || entries[0] || null;

  return (
    <div className="diary-layout">
      <div className="diary-list" aria-label="日记列表">
        {entries.length === 0 ? (
          <div className="empty-note">还没有日记</div>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.id}
              className={`diary-item${entry.id === selected?.id ? ' selected' : ''}`}
              onClick={() => onSelect(entry.id)}
            >
              <div className="diary-date">
                <CalendarDays size={14} />
                {formatDateLabel(entry.date, entry.time)}
              </div>
              <div className="diary-preview">{makeTitle(entry.content)}</div>
            </button>
          ))
        )}
      </div>
      {selected ? (
        <article className="diary-detail">
          <div className="detail-head">
            <div>
              <h2 className="detail-title">{makeTitle(selected.content)}</h2>
              <div className="detail-date">
                <Clock3 size={14} />
                {formatDateLabel(selected.date, selected.time)}
              </div>
            </div>
            <button
              className="icon-btn"
              aria-label="删除日记"
              onClick={() => onDelete(selected.id)}
            >
              <Trash2 size={17} />
            </button>
          </div>
          <p className="detail-content">{selected.content}</p>
          <div className="detail-meta">
            <FileText size={14} />
            {chunkCount(selected.content)} 个文本片段
            <span>索引状态：已索引</span>
          </div>
        </article>
      ) : null}
    </div>
  );
}
