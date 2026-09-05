import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { askDiary } from '../api';

let messageSeq = 0;

export default function AskView() {
  const [messages, setMessages] = useState([
    {
      id: 0,
      role: 'assistant',
      content: '我准备好了，可以问我关于日记的问题。',
      sources: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const send = (text) => {
    const question = text.trim();
    if (!question || busy) return;

    const userMessage = { id: ++messageSeq, role: 'user', content: question };
    const pendingId = ++messageSeq;
    const pendingMessage = {
      id: pendingId,
      role: 'assistant',
      content: '',
      loading: true,
      sources: [],
    };

    setMessages((prev) => [...prev, userMessage, pendingMessage]);
    setInput('');
    setBusy(true);

    askDiary(question)
      .then((result) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === pendingId
              ? { ...message, loading: false, content: result.answer, sources: result.sources }
              : message,
          ),
        );
      })
      .catch((error) => {
        setMessages((prev) =>
          prev.map((message) =>
            message.id === pendingId
              ? { ...message, loading: false, content: `请求失败：${error.message}` }
              : message,
          ),
        );
      })
      .finally(() => setBusy(false));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    send(input);
  };

  return (
    <section className="chat-panel">
      <div className="chat-scroll" ref={scrollRef}>
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.role}`}>
            {message.role === 'assistant' && <div className="msg-label">Diary RAG</div>}
            {message.loading ? (
              <span className="loading">正在检索日记…</span>
            ) : (
              <div>{message.content}</div>
            )}
            {message.sources?.length > 0 && (
              <div className="sources">
                {message.sources.map((source) => (
                  <span key={source.fragment_id} className="source-chip">
                    日记 #{source.entry_id} · 片段 #{source.fragment_id} · 相似度 {source.score.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="chat-input" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="问我关于日记的问题"
          aria-label="问题"
        />
        <button
          className="send-btn"
          type="submit"
          disabled={!input.trim() || busy}
          aria-label="发送"
        >
          <ArrowUp size={18} />
        </button>
      </form>
    </section>
  );
}
