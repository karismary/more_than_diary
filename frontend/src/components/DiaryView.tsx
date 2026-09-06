import { useEffect, useMemo, useState } from 'react'

import MarkdownRender from './MarkdownRender'
import {
  ChevronDownIcon,
  CloseIcon,
  DiaryHeadIcon,
  InfoIcon,
  MenuIcon,
  SearchIcon,
  TrashIcon,
} from './icons'
import type { Entry } from '../api'
import { entryTitle, formatFullDate } from '../utils'

interface DiaryViewProps {
  entries: Entry[]
  loading: boolean
  error: string
  initialEntryId: number | null
  onSelect: (entryId: number) => void
  onDelete: (entryId: number) => Promise<void>
  onWrite: () => void
  onRetry: () => void
}

const MOOD_FILTERS = ['全部', '很好', '不错', '一般', '低落'] as const
type MoodFilter = (typeof MOOD_FILTERS)[number]
const TIME_FILTERS = ['全部', '本周', '本月'] as const
type TimeFilter = (typeof TIME_FILTERS)[number]

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/* 抽屉列表项（选中态由全局样式 .diary-item 标记） */
function DrawerItem({
  entry,
  selected,
  onSelect,
}: {
  entry: Entry
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      className={
        'diary-item w-full rounded-card px-3 py-3 text-left ' +
        (selected ? 'sel bg-brand-soft' : 'hover:bg-surface-2')
      }
      onClick={onSelect}
    >
      <span className="mb-0.5 block truncate text-sub font-semibold leading-tight text-ink">
        {entryTitle(entry.content)}
        {entry.mood && (
          <span className="ml-1.5 font-normal text-brand">· {entry.mood}</span>
        )}
      </span>
      <small className="text-xs text-muted">{formatFullDate(entry.created_at)}</small>
    </button>
  )
}

function DiaryView({
  entries,
  loading,
  error,
  initialEntryId,
  onSelect,
  onDelete,
  onWrite,
  onRetry,
}: DiaryViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('全部')
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('全部')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  /* 抽屉打开时 Esc 关闭 */
  useEffect(() => {
    if (!drawerOpen) return
    function onKey(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === initialEntryId) ?? entries[0] ?? null,
    [entries, initialEntryId],
  )

  const now = useMemo(() => Date.now(), [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (moodFilter !== '全部' && entry.mood !== moodFilter) return false

      if (timeFilter !== '全部') {
        const created = new Date(entry.created_at)
        const today = new Date(now)
        if (timeFilter === '本周') {
          if (now - created.getTime() > WEEK_MS) return false
        } else {
          if (
            created.getFullYear() !== today.getFullYear() ||
            created.getMonth() !== today.getMonth()
          ) {
            return false
          }
        }
      }

      if (q) {
        const hay = `${entryTitle(entry.content)} ${entry.content} ${entry.mood ?? ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }

      return true
    })
  }, [entries, query, moodFilter, timeFilter, now])

  async function handleDelete(entry: Entry) {
    if (deleting) return
    setDeleteError('')
    setDeleting(true)
    try {
      await onDelete(entry.id)
      setConfirmDeleteId(null)
    } catch (requestError) {
      setDeleteError(requestError instanceof Error ? requestError.message : '删除失败，请重试。')
    } finally {
      setDeleting(false)
    }
  }

  const drawerHidden = !drawerOpen

  return (
    <section className="mx-auto w-[min(100%,1080px)] animate-fade-in-up">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <DiaryHeadIcon className="size-4" />
          </span>
          <div className="leading-none">
            <p className="mb-1 text-tag font-medium uppercase tracking-[0.06em] text-muted">
              Diary
            </p>
            <h1 className="text-title font-semibold tracking-tight text-ink">我的日记</h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-note text-muted">
            共 <b className="font-semibold text-ink-2">{entries.length}</b> 篇
          </span>
          <span className="inline-flex items-center gap-[7px] rounded-full border border-brand-soft bg-brand-softer px-[10px] py-[4px] text-note text-brand">
            <span className="size-1.5 rounded-full bg-[#5e9a9c]" />
            本地 · 离线可用
          </span>
        </div>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-card bg-danger-soft px-3.5 py-3 text-sub text-danger"
        >
          <InfoIcon className="size-4 shrink-0" />
          <span className="flex-1">读取本地日记失败，索引可能尚未建立。</span>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-card px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger-soft"
          >
            重试
          </button>
        </p>
      )}

      <div className="relative flex min-h-[520px] flex-col overflow-hidden rounded-card border border-border bg-surface shadow-card">
        {/* 抽屉本体 · 从底部向上展开 */}
        <aside
          id="diary-drawer"
          aria-label="日记列表"
          aria-hidden={drawerHidden}
          className={
            'absolute inset-x-0 bottom-0 z-20 flex max-h-[440px] flex-col rounded-t-card bg-white shadow-drawer transition-transform duration-300 ' +
            (drawerHidden ? 'invisible translate-y-full opacity-0' : 'visible translate-y-0 opacity-100')
          }
        >
          {/* 顶部把手 · 拖拽提示，点按收拢 */}
          <div className="flex shrink-0 justify-center px-4 pb-1 pt-2">
            <button
              type="button"
              aria-label="收起日记列表"
              onClick={() => setDrawerOpen(false)}
              className="grid h-7 place-items-center rounded-full px-4 transition-colors hover:bg-surface"
            >
              <span className="h-[5px] w-10 rounded-full bg-border" aria-hidden />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2 border-b border-border-soft px-3 py-3">
            <label className="flex h-8 flex-1 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 transition-colors focus-within:border-brand focus-within:bg-white">
              <SearchIcon className="size-3.5 shrink-0 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索标题或正文"
                className="w-full min-w-0 flex-1 bg-transparent text-tag text-ink outline-none placeholder:text-faint"
              />
            </label>
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setDrawerOpen(false)}
              className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <CloseIcon className="size-3.5" />
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-b border-border-soft px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-[34px] shrink-0 text-note font-semibold tracking-[0.04em] text-muted">心情</span>
              {MOOD_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setMoodFilter(option)}
                  className={
                    'rounded-full px-2 py-1 text-note transition-colors ' +
                    (moodFilter === option ? 'bg-brand-soft font-semibold text-brand' : 'font-normal text-muted hover:bg-brand-softer hover:text-brand')
                  }
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="w-[34px] shrink-0 text-note font-semibold tracking-[0.04em] text-muted">时间</span>
              {TIME_FILTERS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimeFilter(option)}
                  className={
                    'rounded-full px-2 py-1 text-note transition-colors ' +
                    (timeFilter === option ? 'bg-brand-soft font-semibold text-brand' : 'font-normal text-muted hover:bg-brand-softer hover:text-brand')
                  }
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {loading ? (
              <div className="grid gap-1 p-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="skeleton h-[62px]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-10 text-center">
                {entries.length === 0 ? (
                  <>
                    <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                      <DiaryHeadIcon className="size-6" />
                    </div>
                    <h3 className="text-body font-semibold text-ink">还没有日记</h3>
                    <p className="mx-auto mb-4 mt-1 max-w-[30ch] text-sub leading-relaxed text-muted">
                      每写下一天，它就多懂你一分。写点什么，让 AI 能读懂你。
                    </p>
                    <button
                      type="button"
                      onClick={onWrite}
                      className="rounded-card bg-brand px-4 py-2 text-sub font-semibold text-white shadow-card hover:bg-brand-dark"
                    >
                      开始写日记
                    </button>
                  </>
                ) : (
                  <>
                    <div className="mx-auto mb-3 grid size-11 place-items-center rounded-2xl bg-surface text-muted">
                      <SearchIcon className="size-5" />
                    </div>
                    <h3 className="text-body font-semibold text-ink">没有匹配的日记</h3>
                    <p className="mx-auto mt-1 max-w-[26ch] text-xs leading-relaxed text-muted">
                      换个关键词或筛选项试试
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid gap-0.5">
                {filtered.map((entry) => (
                  <DrawerItem
                    key={entry.id}
                    entry={entry}
                    selected={selectedEntry?.id === entry.id}
                    onSelect={() => {
                      onSelect(entry.id)
                      setDrawerOpen(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-border-soft px-3.5 py-2 text-tag text-muted">
            <span>
              共 {filtered.length} / {entries.length} 篇
            </span>
            <span>按时间倒序</span>
          </div>
        </aside>

        {/* 详情 · 撑满卡片剩余高度 */}
        <div className="flex min-h-[476px] flex-1 flex-col bg-white">
          {loading ? (
            <div className="p-5">
              <div className="mb-3 flex gap-2">
                <div className="skeleton h-3 w-32" />
                <div className="skeleton h-3 w-24" />
              </div>
              <div className="skeleton mb-2 h-6 w-52" />
              <div className="mt-6 space-y-2.5">
                <div className="skeleton h-3.5 w-full" />
                <div className="skeleton h-3.5 w-[92%]" />
                <div className="skeleton h-3.5 w-[88%]" />
                <div className="skeleton h-3.5 w-[96%]" />
                <div className="skeleton h-3.5 w-[64%]" />
              </div>
            </div>
          ) : !selectedEntry ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
              <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                <DiaryHeadIcon className="size-6" />
              </div>
              <h3 className="text-body font-semibold text-ink">还没有日记</h3>
              <p className="mx-auto mb-4 mt-1 max-w-[30ch] text-sub leading-relaxed text-muted">
                每写下一天，它就多懂你一分。写点什么，让 AI 能读懂你。
              </p>
              <button
                type="button"
                onClick={onWrite}
                className="rounded-card bg-brand px-4 py-2 text-sub font-semibold text-white shadow-card hover:bg-brand-dark"
              >
                开始写日记
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 border-b border-border-soft px-5 py-4">
                <div className="min-w-0">
                  <p className="mb-1.5 text-xs text-muted">
                    {formatFullDate(selectedEntry.created_at)}
                    {selectedEntry.mood && (
                      <span className="ml-2 font-medium text-brand">· {selectedEntry.mood}</span>
                    )}
                    {selectedEntry.place && (
                      <span className="ml-2">地点 · {selectedEntry.place}</span>
                    )}
                    {selectedEntry.weather && (
                      <span className="ml-2">天气 · {selectedEntry.weather}</span>
                    )}
                  </p>
                  <h2 className="break-words text-body font-semibold leading-snug tracking-tight text-ink">
                    {entryTitle(selectedEntry.content)}
                  </h2>
                </div>

                {confirmDeleteId === selectedEntry.id ? (
                  <div className="flex shrink-0 flex-col items-end gap-1.5 rounded-card border border-danger/40 bg-danger-soft px-3 py-2">
                    <span className="text-xs font-medium text-danger">删除后不可恢复，确定？</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleting}
                        className="rounded-md border border-border bg-white px-3 py-1.5 text-xs font-medium text-ink-2 hover:text-ink"
                      >
                        取消
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => void handleDelete(selectedEntry)}
                        className="rounded-md bg-danger px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
                      >
                        {deleting ? '删除中…' : '确认删除'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmDeleteId(selectedEntry.id)
                      setDeleteError('')
                    }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-card border border-border bg-transparent px-3 py-1.5 text-sub font-medium text-danger transition-colors hover:border-danger hover:bg-danger-soft"
                  >
                    <TrashIcon className="size-4" />
                    删除
                  </button>
                )}
              </div>

              {deleteError && (
                <p role="alert" className="mx-5 mt-3 text-sub text-danger">
                  {deleteError}
                </p>
              )}

              <div className="flex-1 px-5 py-4">
                <MarkdownRender content={selectedEntry.content} />
              </div>
            </>
          )}
        </div>

        {/* 底部入口条 · 展开日记列表（收拢时展示，展开时被抽屉盖住） */}
        {!loading && (
          <button
            type="button"
            aria-controls="diary-drawer"
            aria-expanded={drawerOpen ? 'true' : 'false'}
            onClick={() => setDrawerOpen((open) => !open)}
            className="group flex shrink-0 items-center justify-center gap-1.5 border-t border-border-soft bg-white px-4 py-[11px] text-sub font-medium text-ink-2 transition-colors hover:bg-brand-softer hover:text-brand"
          >
            <MenuIcon className="size-4 shrink-0 text-muted transition-colors group-hover:text-brand" />
            <span>日记列表</span>
            <span className="font-normal text-muted">· 共 {entries.length} 篇</span>
            <ChevronDownIcon
              className={
                'size-3.5 text-muted transition-transform duration-200 ' +
                (drawerOpen ? 'rotate-180 text-brand' : '')
              }
            />
          </button>
        )}
      </div>
    </section>
  )
}

export default DiaryView
