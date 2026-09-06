import { useEffect, useState } from 'react'

import {
  createEntry,
  loadEntries,
  loadEntry,
  loadSettings,
  removeEntry,
  type Entry,
  type EntryDraft,
} from './api'
import AskView from './components/AskView'
import DiaryView from './components/DiaryView'
import SettingsView from './components/SettingsView'
import WriteView from './components/WriteView'
import {
  CheckIcon,
  NavChatIcon,
  NavDiaryIcon,
  NavWriteIcon,
  SettingsIcon,
} from './components/icons'

type View = 'write' | 'diary' | 'chat' | 'settings'

const NAV_ITEMS: { id: View; label: string; Icon: typeof NavWriteIcon }[] = [
  { id: 'write', label: '写日记', Icon: NavWriteIcon },
  { id: 'diary', label: '日记', Icon: NavDiaryIcon },
  { id: 'chat', label: 'AI 问答', Icon: NavChatIcon },
]

const FONT_IDS = ['system', 'song', 'hei', 'kai']

function App() {
  const [activeView, setActiveView] = useState<View>('write')
  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(null)
  const [entriesLoading, setEntriesLoading] = useState(true)
  const [entriesError, setEntriesError] = useState('')
  const [toast, setToast] = useState('')
  const [diaryFont, setDiaryFont] = useState('system')

  /* 启动时读设置里的字体并作用到 <html>；settings 表新装后为空 → 回落 system */
  useEffect(() => {
    let cancelled = false
    loadSettings()
      .then((settings) => {
        if (cancelled) return
        const font = settings.overrides.diary_font
        const next = typeof font === 'string' && FONT_IDS.includes(font) ? font : 'system'
        setDiaryFont(next)
      })
      .catch(() => {
        /* 后端没起 / 表未建：保持 system，不打扰用户 */
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.diaryFont = diaryFont
  }, [diaryFont])

  useEffect(() => {
    void refreshEntries()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(''), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function refreshEntries() {
    setEntriesLoading(true)
    setEntriesError('')

    try {
      const loadedEntries = await loadEntries()
      setEntries(loadedEntries)
      setSelectedEntryId((currentId) =>
        currentId && loadedEntries.some((entry) => entry.id === currentId)
          ? currentId
          : (loadedEntries[0]?.id ?? null),
      )
    } catch (requestError) {
      setEntriesError(requestError instanceof Error ? requestError.message : '无法读取日记。')
    } finally {
      setEntriesLoading(false)
    }
  }

  async function handleSave(draft: EntryDraft) {
    const entry = await createEntry(draft)
    setEntries((current) => [entry, ...current])
    setSelectedEntryId(entry.id)
    setActiveView('diary')
    setToast('已保存 · 已建立向量索引')
  }

  async function handleDelete(entryId: number) {
    await removeEntry(entryId)
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
    setSelectedEntryId((currentId) => {
      if (currentId !== entryId) return currentId
      return null
    })
    setToast('日记已删除')
  }

  async function openDiary(entryId: number) {
    setActiveView('diary')

    // RAG 引用的旧日记可能不在已加载列表（超出 100 篇上限）→ 单独拉回并排序插入
    if (entries.some((entry) => entry.id === entryId)) {
      setSelectedEntryId(entryId)
      return
    }

    try {
      const entry = await loadEntry(entryId)
      setEntries((current) =>
        current.some((item) => item.id === entry.id)
          ? current
          : [...current, entry].sort((a, b) =>
              a.created_at === b.created_at
                ? b.id - a.id
                : b.created_at.localeCompare(a.created_at),
            ),
      )
      setSelectedEntryId(entryId)
    } catch {
      /* 拉取失败：保持当前列表选中态即可，不打扰用户 */
    }
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface text-ink">
      {/* 侧栏 · 桌面端 */}
      <aside className="hidden w-[200px] shrink-0 flex-col border-r border-border bg-white px-3.5 py-[18px] md:flex">
        <div className="px-2.5 pb-5 pt-1.5">
          <div className="text-[18px] font-semibold tracking-tight text-ink">
            Diary<span className="text-brand">.</span>RAG
          </div>
          <div className="mt-0.5 text-tag text-muted">本地日记助手</div>
        </div>

        <nav className="flex flex-1 flex-col gap-1" aria-label="主导航">
          <button
            type="button"
            onClick={() => setActiveView('write')}
            className={
              'flex items-center gap-[11px] rounded-card px-3 py-2.5 text-left text-sub font-medium ' +
              (activeView === 'write'
                ? 'border border-transparent bg-brand-soft text-brand'
                : 'border border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink')
            }
          >
            <NavWriteIcon
              className={
                'size-[18px] shrink-0 ' + (activeView === 'write' ? 'text-brand' : 'text-muted')
              }
            />
            写日记
          </button>

          <button
            type="button"
            onClick={() => setActiveView('settings')}
            className={
              'mt-auto flex items-center gap-[11px] rounded-card px-3 py-2.5 text-left text-sub font-medium ' +
              (activeView === 'settings'
                ? 'border border-transparent bg-brand-soft text-brand'
                : 'border border-transparent text-ink-2 hover:bg-surface-2 hover:text-ink')
            }
          >
            <SettingsIcon
              className={
                'size-[18px] shrink-0 ' +
                (activeView === 'settings' ? 'text-brand' : 'text-muted')
              }
            />
            设置
          </button>
        </nav>

        <p className="border-t border-border-soft px-3 pb-1 pt-3 text-tag leading-relaxed text-muted">
          <span className="mr-[7px] inline-block size-1.5 rounded-full bg-brand align-[1px]" />
          你的日记只保存在本地数据库中
        </p>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        {/* 顶栏 · 移动端 */}
        <div className="flex items-center justify-between border-b border-border bg-white px-4 py-2.5 md:hidden">
          <div className="leading-tight">
            <b className="text-[18px] text-ink">
              Diary<span className="text-brand">.</span>RAG
            </b>
            <span className="block text-tag text-muted">本地日记助手</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 rounded-full bg-surface p-1">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveView(item.id)}
                  className={
                    'w-[56px] rounded-full py-[5px] text-tag font-medium transition-colors ' +
                    (activeView === item.id
                      ? 'bg-white text-brand shadow-card'
                      : 'text-muted hover:text-ink')
                  }
                >
                  {item.label.replace('AI 问答', '问答')}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-label="设置"
              onClick={() => setActiveView('settings')}
              className={
                'grid size-[34px] shrink-0 place-items-center rounded-full transition-colors ' +
                (activeView === 'settings'
                  ? 'bg-brand-soft text-brand'
                  : 'text-muted hover:bg-surface hover:text-ink')
              }
            >
              <SettingsIcon className="size-[19px]" />
            </button>
          </div>
        </div>

        {/* 顶胶囊 · 桌面端次级导航 */}
        <nav
          className="hidden items-center gap-1.5 border-b border-border-soft px-7 pb-2.5 pt-3.5 md:flex"
          aria-label="页面切换"
        >
          {NAV_ITEMS.map((item) => {
            const Icon = item.Icon
            const active = activeView === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-[6px] text-sub font-medium transition-colors ' +
                  (active
                    ? 'border border-transparent bg-brand-soft font-semibold text-brand'
                    : 'border border-transparent text-ink-2 hover:border-border hover:bg-white hover:text-ink')
                }
              >
                <Icon className="size-3.5" />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* 页面滚动区 */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-6">
          {activeView === 'write' && <WriteView key="write" onSave={handleSave} />}

          {activeView === 'diary' && (
            <DiaryView
              key="diary"
              entries={entries}
              loading={entriesLoading}
              error={entriesError}
              initialEntryId={selectedEntryId}
              onSelect={setSelectedEntryId}
              onDelete={handleDelete}
              onWrite={() => setActiveView('write')}
              onRetry={() => void refreshEntries()}
            />
          )}

          {activeView === 'chat' && (
            <div className="h-full min-h-0">
              <AskView onOpenEntry={openDiary} />
            </div>
          )}

          {activeView === 'settings' && (
            <SettingsView
              key="settings"
              diaryFont={diaryFont}
              onFontChange={setDiaryFont}
              onToast={setToast}
            />
          )}
        </div>
      </main>

      {/* toast · 底部居中 */}
      <div
        role="status"
        aria-live="polite"
        className={
          'pointer-events-none fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2.5 rounded-card bg-brand px-5 py-3 text-sub font-medium text-white shadow-[0_6px_22px_rgba(32,48,51,0.25)] transition-all duration-300 ' +
          (toast ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0')
        }
      >
        <span className="grid size-[18px] place-items-center rounded-full bg-white/25">
          <CheckIcon className="size-[11px]" />
        </span>
        {toast}
      </div>
    </div>
  )
}

export default App
