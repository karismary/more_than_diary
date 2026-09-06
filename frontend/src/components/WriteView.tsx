import { useEffect, useRef, useState, type ComponentType, type FormEvent, type KeyboardEvent } from 'react'

import MarkdownRender from './MarkdownRender'
import {
  ChevronDownIcon,
  HeartIcon,
  PinIcon,
  PlusIcon,
  SunIcon,
  WriteHeadIcon,
} from './icons'
import { todayLabel } from '../utils'
import type { EntryDraft } from '../api'

interface WriteViewProps {
  onSave: (draft: EntryDraft) => Promise<void>
}

type MetaKey = 'mood' | 'place' | 'weather'

interface MetaDef {
  label: string
  presets: readonly string[]
  custom: boolean
  Icon: ComponentType<{ className?: string }>
}

const META_DEFS: Record<MetaKey, MetaDef> = {
  mood: { label: '心情', presets: ['很好', '不错', '一般', '低落'], custom: true, Icon: HeartIcon },
  place: { label: '地点', presets: ['家', '公司', '路上', '咖啡馆'], custom: true, Icon: PinIcon },
  weather: { label: '天气', presets: ['晴', '多云', '阴', '雨', '雪'], custom: false, Icon: SunIcon },
}

const META_KEYS = Object.keys(META_DEFS) as MetaKey[]

type EditMode = 'text' | 'markdown'

/* 随字数变化的微提示词（对齐设计稿） */
function hintByCount(n: number): string {
  if (n >= 500) return '今天的话真多'
  if (n >= 200) return '快接近一周总结了'
  if (n >= 50) return '继续，这一段值得记'
  return '慢慢写，不急'
}

interface MetaPillProps {
  def: MetaDef
  value: string | null
  isOpen: boolean
  onToggle: () => void
  onPick: (value: string | null) => void
}

function MetaPill({ def, value, isOpen, onToggle, onPick }: MetaPillProps) {
  const { label, presets, custom, Icon } = def
  const [editing, setEditing] = useState(false)
  const [customText, setCustomText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) {
      setEditing(false)
      setCustomText('')
    }
  }, [isOpen])

  const hasVal = value !== null
  const active = isOpen || hasVal

  function startCustom() {
    setEditing(true)
    setCustomText('')
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function commitCustom() {
    const text = customText.trim()
    if (text) {
      onPick(text.slice(0, 30))
    } else {
      setEditing(false)
    }
  }

  return (
    <div className="relative shrink-0" onMouseDown={(event) => event.stopPropagation()}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={
          'flex items-center gap-1.5 rounded-full py-[4px] pl-2 pr-2 text-note leading-none ' +
          (active ? 'bg-brand-soft text-brand' : 'bg-surface text-ink-2 hover:bg-brand-softer')
        }
        onClick={(event) => {
          event.stopPropagation()
          onToggle()
        }}
      >
        <span className={active ? 'text-brand' : 'text-muted'}>
          <Icon className="size-3" />
        </span>
        <span className={active ? 'font-semibold text-brand' : 'font-normal text-ink-2'}>{label}</span>
        <span
          className={
            'max-w-20 truncate ' +
            (active ? 'text-brand' : hasVal ? 'font-normal text-ink' : 'text-faint')
          }
        >
          {value ?? '未选'}
        </span>
        <span
          className={
            'transition-transform duration-200 ' +
            (isOpen ? 'rotate-180 text-brand' : active ? 'text-brand' : 'text-muted')
          }
        >
          <ChevronDownIcon className="size-3" />
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-[calc(100%+6px)] z-30 flex min-w-[148px] animate-pop-in flex-col gap-0.5 rounded-[12px] border border-border bg-white p-1.5 shadow-pop"
          role="listbox"
          aria-label={label}
        >
          {presets.map((option) => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={value === option}
              className={
                'rounded-lg px-2.5 py-2 text-left text-tag leading-none ' +
                (value === option
                  ? 'bg-brand-soft font-semibold text-brand'
                  : 'text-ink hover:bg-surface')
              }
              onClick={(event) => {
                event.stopPropagation()
                onPick(value === option ? null : option)
              }}
            >
              {option}
            </button>
          ))}

          {custom && !editing && (
            <button
              type="button"
              className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border-soft px-2.5 pb-1.5 pt-2 text-left text-tag text-muted hover:text-brand"
              onClick={(event) => {
                event.stopPropagation()
                startCustom()
              }}
            >
              <PlusIcon className="size-3.5 shrink-0" />
              <span>自定义{label}</span>
            </button>
          )}

          {custom && editing && (
            <div className="mt-1 border-t border-border-soft px-1.5 pb-1.5 pt-2">
              <input
                ref={inputRef}
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitCustom()
                  if (event.key === 'Escape') setEditing(false)
                }}
                placeholder={`自定义${label}，回车确认`}
                maxLength={30}
                className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-tag text-ink outline-none placeholder:text-faint focus:border-brand"
              />
            </div>
          )}

          {hasVal && (
            <button
              type="button"
              className="mt-0.5 w-full rounded-lg border-t border-border-soft px-2.5 pb-1 pt-1.5 text-left text-note text-faint hover:text-danger"
              onClick={(event) => {
                event.stopPropagation()
                onPick(null)
              }}
            >
              清除选择
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function WriteView({ onSave }: WriteViewProps) {
  const [content, setContent] = useState('')
  const [mode, setMode] = useState<EditMode>('text')
  const [meta, setMeta] = useState<Record<MetaKey, string | null>>({
    mood: null,
    place: null,
    weather: null,
  })
  const [openKey, setOpenKey] = useState<MetaKey | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  /* 点击本卡片之外 / Esc 收起 popover */
  useEffect(() => {
    if (!openKey) return

    function onDown(event: MouseEvent) {
      if (sectionRef.current && !sectionRef.current.contains(event.target as Node)) {
        setOpenKey(null)
      }
    }
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setOpenKey(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openKey])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = content.trim()
    if (!trimmed || isSaving) return

    setError('')
    setIsSaving(true)
    try {
      await onSave({ content: trimmed, mood: meta.mood, place: meta.place, weather: meta.weather })
      setContent('')
      setMeta({ mood: null, place: null, weather: null })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '保存失败，请重试。')
    } finally {
      setIsSaving(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      void handleSubmit(event as unknown as FormEvent<HTMLFormElement>)
    }
  }

  const isEmpty = content.trim() === ''
  const footerHint = error
    ? '内容已保留，可直接重试'
    : isEmpty
      ? '写点什么，才能保存这段时光'
      : hintByCount(content.length)

  const inputClasses =
    'block w-full bg-white text-ink outline-none placeholder:text-faint disabled:cursor-not-allowed disabled:bg-surface-2 disabled:opacity-70'

  return (
    <section ref={sectionRef} className="mx-auto w-[min(100%,1080px)] animate-fade-in-up">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <WriteHeadIcon className="size-4" />
          </span>
          <div className="leading-none">
            <p className="mb-1 text-tag font-medium uppercase tracking-[0.06em] text-muted">
              Write
            </p>
            <h1 className="text-title font-semibold tracking-tight text-ink">记录此刻</h1>
          </div>

          <div
            className="ml-1 inline-flex shrink-0 rounded-full border border-border bg-surface p-[3px]"
            role="tablist"
            aria-label="输入模式"
          >
            {(
              [
                { id: 'text', label: '纯文本' },
                { id: 'markdown', label: 'Markdown' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={mode === item.id}
                className={
                  'rounded-full px-4 py-[5px] text-tag font-medium transition-colors ' +
                  (mode === item.id
                    ? 'bg-white text-brand shadow-card'
                    : 'text-muted hover:text-ink')
                }
                onClick={() => setMode(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-note text-muted">{todayLabel()}</span>
          <span className="inline-flex items-center gap-[7px] rounded-full border border-brand-soft bg-brand-softer px-[10px] py-[4px] text-note text-brand">
            <span className="size-1.5 rounded-full bg-[#5e9a9c]" />
            本地 · 离线可用
          </span>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-3.5 flex items-center gap-2 rounded-card bg-danger-soft px-3.5 py-2.5 text-sub text-danger"
        >
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="overflow-visible rounded-card border border-border bg-white shadow-card">
        {/* 心情 / 地点 / 天气 · 折叠触发器 */}
        <div className="flex items-center gap-2 overflow-visible border-b border-border-soft px-4 py-2.5">
          {META_KEYS.map((key, index) => {
            const def = META_DEFS[key]
            return (
              <div key={key} className="contents">
                {index > 0 && <span className="mx-0.5 h-[18px] w-px shrink-0 bg-border" aria-hidden />}
                <MetaPill
                  def={def}
                  value={meta[key]}
                  isOpen={openKey === key}
                  onToggle={() => setOpenKey((current) => (current === key ? null : key))}
                  onPick={(value) => {
                    setMeta((current) => ({ ...current, [key]: value }))
                    setOpenKey(null)
                  }}
                />
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between border-b border-border-soft px-4 py-3">
          <span className={mode === 'markdown' ? 'text-tag font-semibold text-brand' : 'text-tag text-muted'}>
            {mode === 'markdown' ? 'Markdown · 源码 / 预览' : '纯文本编辑区'}
          </span>
          <span className="text-tag text-muted">Ctrl/⌘ + Enter 保存</span>
        </div>

        {mode === 'text' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(event) => setContent(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="今天发生了什么值得记住的事？"
            disabled={isSaving}
            aria-busy={isSaving}
            className={
              inputClasses +
              ' diary-content min-h-[360px] resize-y px-5 py-[18px] text-body leading-[1.75]'
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="# 现在，发生了什么？"
              disabled={isSaving}
              aria-busy={isSaving}
              className={
                inputClasses +
                ' diary-content min-h-[420px] resize-none px-[18px] py-4 text-sub leading-[1.7] md:border-r md:border-border-soft'
              }
            />
            <div className="min-h-[420px] overflow-y-auto px-5 py-4 text-sub leading-[1.7]">
              {content.trim() === '' ? (
                <p className="m-0 text-sub text-muted">预览区——在左侧输入 Markdown，这里会实时显示效果</p>
              ) : (
                <MarkdownRender content={content} />
              )}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border-soft px-4 py-3">
          <span className="flex items-center gap-2.5 text-tag text-muted">
            <span>
              字数 <b className="font-semibold text-ink tabular-nums">{content.length}</b>
            </span>
            <span className={error ? 'text-danger' : ''}>· {footerHint}</span>
          </span>

          <button
            type="submit"
            disabled={isEmpty || isSaving}
            className="inline-flex h-[38px] min-w-[96px] items-center justify-center gap-2 rounded-card bg-brand px-[22px] text-sub font-semibold text-white shadow-card hover:bg-brand-dark active:scale-[0.97] disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                保存中…
              </>
            ) : (
              error ? '重试保存' : '保存'
            )}
          </button>
        </div>
      </form>
    </section>
  )
}

export default WriteView
