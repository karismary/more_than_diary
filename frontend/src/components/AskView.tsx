import { useEffect, useRef, useState } from 'react'

import MarkdownRender from './MarkdownRender'
import { ChatHeadIcon, SendIcon } from './icons'
import { askDiary, type DiarySource } from '../api'

interface ChatMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  sources?: DiarySource[]
  failed?: boolean
}

interface AskViewProps {
  onOpenEntry: (entryId: number) => void
}

const SUGGESTS = [
  '我这周最常的情绪是什么？',
  '帮我总结最近关于「工作」的内容',
  '上个月有没有提到那次旅行？',
]

const MAX_REF_TAGS = 6

function scorePercent(score: number | null): string | null {
  if (score === null) return null
  return `${Math.round(score * 100)}%`
}

function RefTag({
  source,
  onJump,
}: {
  source: DiarySource
  onJump: () => void
}) {
  const score = scorePercent(source.score)
  return (
    <button
      type="button"
      onClick={onJump}
      title={score === null ? '打开完整日记' : `相似度 ${score}`}
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-dashed border-brand/50 bg-brand-softer px-2.5 py-[3px] text-note text-brand/80 transition-colors hover:border-solid hover:bg-brand-soft"
    >
      <span className="font-semibold text-brand">篇{source.entry_id}</span>
      {source.fragment_id !== null && <span className="text-brand/60">·片段{source.fragment_id}</span>}
      {score !== null && <span className="font-normal text-brand/50">{score}</span>}
    </button>
  )
}

function TypingBubble() {
  return (
    <div className="flex max-w-[74%] self-start">
      <div className="rounded-2xl border border-border bg-white px-4 py-3 shadow-card" aria-label="正在思考">
        <span className="flex items-center gap-[5px] py-[2px]">
          <span className="typing-dot" />
          <span className="typing-dot" style={{ animationDelay: '0.2s' }} />
          <span className="typing-dot" style={{ animationDelay: '0.4s' }} />
        </span>
      </div>
    </div>
  )
}

function AskView({ onOpenEntry }: AskViewProps) {
  const [input, setInput] = useState('')
  const [isAsking, setIsAsking] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '你好呀，我是你的日记助手。可以读你的全部本地日记，帮你回忆、总结、找回灵感。',
    },
  ])
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const lastQuestionRef = useRef('')
  const [showAllIds, setShowAllIds] = useState<Record<string, boolean>>({})

  const chatBegun = messages.length > 1

  useEffect(() => {
    sentinelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, isAsking])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isAsking) return

    lastQuestionRef.current = trimmed
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: trimmed,
    }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setIsAsking(true)

    try {
      const response = await askDiary(trimmed)
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: response.answer, sources: response.sources },
      ])
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : '暂时无法回答，请稍后重试。'
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: 'assistant', content: message, failed: true },
      ])
    } finally {
      setIsAsking(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send(input)
    }
  }

  function resizeInput() {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function canSubmit() {
    return input.trim().length > 0 && !isAsking
  }

  return (
    <section className="flex h-full min-h-[520px] animate-fade-in-up flex-col">
      <div className="mx-auto flex min-h-0 w-full max-w-[1080px] flex-1 flex-col">
      <header className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <ChatHeadIcon className="size-4" />
          </span>
          <div className="leading-none">
            <p className="mb-1 text-tag font-medium uppercase tracking-[0.06em] text-muted">
              Chat
            </p>
            <h1 className="text-title font-semibold tracking-tight text-ink">和日记聊聊</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-note text-muted">基于本地日记检索</span>
          <span className="inline-flex items-center gap-[7px] rounded-full border border-brand-soft bg-brand-softer px-[10px] py-[4px] text-note text-brand">
            <span className="size-1.5 rounded-full bg-[#5e9a9c]" />
            本地 · 离线可用
          </span>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-card border border-border bg-white shadow-card">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 md:px-7 md:py-6">
          {!chatBegun ? (
            <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
              <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
                <ChatHeadIcon className="size-7" />
              </div>
              <h3 className="text-body font-semibold text-ink">还没有开始对话</h3>
              <p className="mx-auto mb-5 mt-1 max-w-[36ch] text-sub leading-relaxed text-muted">
                我可以读你的全部本地日记，帮你回忆、总结、找回灵感。试试这样问：
              </p>
              <div className="flex max-w-[56ch] flex-wrap justify-center gap-2">
                {SUGGESTS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-border bg-white px-3.5 py-1.5 text-tag text-ink-2 transition-colors hover:border-brand hover:bg-brand-softer hover:text-brand"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {messages.slice(1).map((message) =>
                message.role === 'user' ? (
                  <div key={message.id} className="flex justify-end">
                    <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-brand px-4 py-3 text-body leading-[1.7] text-white shadow-card">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex flex-col gap-1.5">
                    <div className="flex max-w-[85%] justify-start">
                      <div className="min-w-0 rounded-2xl rounded-bl-md border border-border bg-white px-4 py-3 text-body leading-[1.7] text-ink shadow-card md:max-w-[74%]">
                        <MarkdownRender content={message.content} />
                      </div>
                    </div>

                    {message.failed ? (
                      <div className="inline-flex max-w-fit flex-wrap items-center gap-2 rounded-card bg-danger-soft px-3 py-2 text-sub text-danger">
                        <span>读取本地日记失败，可能是索引尚未建立。</span>
                        <button
                          type="button"
                          onClick={() => {
                            setMessages((current) => current.filter((item) => item.id !== message.id))
                            void send(lastQuestionRef.current)
                          }}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold text-danger underline-offset-2 hover:underline"
                        >
                          重试
                        </button>
                      </div>
                    ) : message.sources && message.sources.length > 0 ? (
                      <div className="max-w-full md:max-w-[74%]">
                        <p className="mb-1 mt-1 text-note text-muted">
                          参考日记{message.sources.length > 1 ? ` · ${message.sources.length} 篇相关` : ''}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {message.sources
                            .slice(0, showAllIds[message.id] ? message.sources.length : MAX_REF_TAGS)
                            .map((source, index) => (
                              <RefTag
                                key={`${source.entry_id}-${source.fragment_id ?? 'full'}-${index}`}
                                source={source}
                                onJump={() => onOpenEntry(source.entry_id)}
                              />
                            ))}
                          {message.sources.length > MAX_REF_TAGS && (
                            <button
                              type="button"
                              onClick={() =>
                                setShowAllIds((current) => ({ ...current, [message.id]: !current[message.id] }))
                              }
                              className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border border-border bg-white px-2.5 py-[3px] text-note font-medium text-muted transition-colors hover:border-brand hover:text-brand"
                            >
                              {showAllIds[message.id]
                                ? '收起 ›'
                                : `查看全部 ${message.sources.length} 篇 ›`}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ),
              )}

              {isAsking && <TypingBubble />}
              <div ref={sentinelRef} />
            </div>
          )}
        </div>

        {/* 输入栏 · 底部固定 */}
        <div className="flex shrink-0 items-end gap-2.5 border-t border-border-soft bg-white px-3 py-3 md:px-4">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              resizeInput()
            }}
            onKeyDown={handleKeyDown}
            placeholder="问问你的日记…（Enter 发送，Shift+Enter 换行）"
            disabled={isAsking}
            rows={1}
            aria-label="向日记助手提问"
            className="max-h-[120px] min-h-[46px] flex-1 resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-body leading-snug text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:bg-white focus:shadow-[0_0_0_3px_#eef5f4]"
          />
          <button
            type="button"
            aria-label="发送"
            disabled={!canSubmit()}
            onClick={() => void send(input)}
            className="grid size-[46px] shrink-0 place-items-center rounded-2xl bg-brand text-white transition-colors hover:bg-brand-dark active:scale-[0.94] disabled:bg-border disabled:text-white disabled:hover:bg-border"
          >
            {isAsking ? (
              <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : (
              <SendIcon className="size-[18px]" />
            )}
          </button>
        </div>
      </div>
      </div>
    </section>
  )
}

export default AskView
