import { useEffect, useState } from 'react'

import {
  loadSettings,
  saveSettings,
  testAiConnection,
  type AiTestRequest,
  type AiTestResponse,
  type SettingValue,
  type SettingsResponse,
} from '../api'
import { BoltIcon, ResetIcon, SettingsIcon } from './icons'

interface SettingsViewProps {
  diaryFont: string
  onFontChange: (font: string) => void
  onToast: (message: string) => void
}

type DiaryFontId = 'system' | 'song' | 'hei' | 'kai'

const FONT_OPTIONS: { id: DiaryFontId; label: string; stack: string; sample: string }[] = [
  { id: 'system', label: '默认', stack: 'var(--font-sans)', sample: 'Aa 本地日记助手' },
  { id: 'song', label: '宋体', stack: '"Songti SC", "SimSun", "STSong", serif', sample: 'Aa 春江花月夜' },
  { id: 'hei', label: '黑体', stack: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Heiti SC", sans-serif', sample: 'Aa 山雨欲来风满楼' },
  { id: 'kai', label: '楷体', stack: '"Kaiti SC", "KaiTi", "STKaiti", serif', sample: 'Aa 谈笑有鸿儒' },
]

interface FieldDef {
  key: string
  label: string
  placeholder: string
  secret?: boolean
  numeric?: boolean
}

const EMBEDDING_FIELDS: FieldDef[] = [
  { key: 'embedding_base_url', label: '服务地址', placeholder: 'http://…/v1，留空用默认' },
  { key: 'embedding_api_key', label: 'API Key', placeholder: '如不需密钥可留空', secret: true },
  { key: 'embedding_model', label: '模型', placeholder: '例如 bge-m3:latest' },
  { key: 'embedding_dim', label: '向量维度', placeholder: '例如 1024', numeric: true },
]

const LLM_FIELDS: FieldDef[] = [
  { key: 'llm_base_url', label: '服务地址', placeholder: 'http://…/v1，留空用默认' },
  { key: 'llm_api_key', label: 'API Key', placeholder: '如不需密钥可留空', secret: true },
  { key: 'llm_model', label: '模型', placeholder: '例如 qwen2.5:3b' },
]

const PREVIEW_TEXT =
  '9 月 6 日，晴。把旧书翻出来晒了一下午，阳光从窗缝漏进来，在书页上慢慢爬。晚上风凉，泡了壶茶，突然想起去年深秋在山里见过的月亮——原来记住一件小事，就够抵抗很久的平淡。'

interface TestState {
  scope: 'embedding' | 'llm'
  testing: boolean
  result: AiTestResponse | null
}

const inputBase =
  'h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 text-sub text-ink outline-none transition-colors placeholder:text-faint focus:border-brand focus:bg-white'

function SettingsView({ diaryFont, onFontChange, onToast }: SettingsViewProps) {
  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  /* 每个可编辑字段的当前输入文本 */
  const [draft, setDraft] = useState<Record<string, string>>({})

  const [embedTest, setEmbedTest] = useState<TestState>({ scope: 'embedding', testing: false, result: null })
  const [llmTest, setLlmTest] = useState<TestState>({ scope: 'llm', testing: false, result: null })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  function applyLoaded(loaded: SettingsResponse) {
    setSettings(loaded)
    setDraft(effectiveDraft(loaded))
    setLoadError('')
  }

  function applyLoadError(error: unknown) {
    setLoadError(error instanceof Error ? error.message : '读取设置失败。')
  }

  useEffect(() => {
    let cancelled = false
    loadSettings()
      .then((loaded) => {
        if (!cancelled) applyLoaded(loaded)
      })
      .catch((error) => {
        if (!cancelled) applyLoadError(error)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function retry() {
    setLoading(true)
    try {
      applyLoaded(await loadSettings())
    } catch (error) {
      applyLoadError(error)
    } finally {
      setLoading(false)
    }
  }

  function effectiveDraft(loaded: SettingsResponse): Record<string, string> {
    const draft: Record<string, string> = {}
    for (const key of [...EMBEDDING_FIELDS, ...LLM_FIELDS].map((field) => field.key)) {
      const value = loaded.overrides[key] ?? loaded.defaults[key] ?? ''
      draft[key] = String(value)
    }
    return draft
  }

  function patch(key: string, value: string) {
    setDraft((current) => ({ ...current, [key]: value }))
  }

  function resetField(key: string) {
    if (!settings) return
    const fallback = settings.defaults[key]
    patch(key, fallback === undefined ? '' : String(fallback))
  }

  /* 用当前框内填写的值临时试连（scope 里 numeric 字段需先校验） */
  async function runTest(scope: 'embedding' | 'llm') {
    if (scope === 'embedding') {
      const dimText = (draft['embedding_dim'] ?? '').trim()
      if (dimText && !Number.isInteger(Number(dimText))) {
        setEmbedTest((current) => ({ ...current, result: { ok: false, message: `向量维度「${dimText}」不是整数` } }))
        return
      }
    }

    const setState = scope === 'embedding' ? setEmbedTest : setLlmTest

    setState((current) => ({ ...current, testing: true, result: null }))
    try {
      const result = await testAiConnection(buildTestRequest(scope, draft))
      setState((current) => ({ ...current, testing: false, result }))
    } catch (requestError) {
      setState((current) => ({
        ...current,
        testing: false,
        result: {
          ok: false,
          message: requestError instanceof Error ? requestError.message : '无法连接后端。',
        },
      }))
    }
  }

  async function handleSave() {
    if (!settings || saving) return
    setSaveError('')

    const overrides: Record<string, SettingValue> = {}
    for (const field of [...EMBEDDING_FIELDS, ...LLM_FIELDS]) {
      const text = (draft[field.key] ?? '').trim()
      if (text === '') {
        overrides[field.key] = null
        continue
      }
      if (field.numeric) {
        const number = Number(text)
        if (!Number.isInteger(number)) {
          setSaveError(`向量维度需为整数（当前填了「${text}」）`)
          return
        }
        overrides[field.key] = number
      } else {
        overrides[field.key] = text
      }
    }

    overrides.diary_font = diaryFont === 'system' ? null : diaryFont

    setSaving(true)
    try {
      const saved = await saveSettings(overrides)
      setSettings(saved)
      setDraft(effectiveDraft(saved))
      onToast('设置已保存')
    } catch (requestError) {
      setSaveError(requestError instanceof Error ? requestError.message : '保存失败，请重试。')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="mx-auto w-[min(100%,1080px)] animate-fade-in-up">
        <div className="mb-6 flex items-center gap-3">
          <div className="skeleton size-[30px]" />
          <div>
            <div className="skeleton mb-1 h-2.5 w-14" />
            <div className="skeleton h-5 w-24" />
          </div>
        </div>
        <div className="grid gap-4">
          {[0, 1, 2].map((card) => (
            <div key={card} className="rounded-card border border-border bg-white p-5 shadow-card">
              <div className="skeleton mb-1 h-4 w-32" />
              <div className="skeleton h-3 w-56" />
              <div className="mt-4 space-y-3">
                <div className="skeleton h-9 w-full" />
                <div className="skeleton h-9 w-full" />
                <div className="skeleton h-9 w-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (loadError || !settings) {
    return (
      <section className="mx-auto w-[min(100%,1080px)] animate-fade-in-up">
        <header className="mb-6 flex items-center gap-3">
          <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
            <SettingsIcon className="size-4" />
          </span>
          <div className="leading-none">
            <p className="mb-1 text-tag font-medium uppercase tracking-[0.06em] text-muted">Settings</p>
            <h1 className="text-title font-semibold tracking-tight text-ink">设置</h1>
          </div>
        </header>
        <div className="rounded-card border border-border bg-white p-5 shadow-card">
          <p className="mb-3 text-sub text-ink-2">读取设置失败。</p>
          <p className="mb-4 text-tag text-muted">
            {loadError || '后端可能没有启动，或数据库尚未初始化。'}
          </p>
          <button
            type="button"
            onClick={() => void retry()}
            className="rounded-card bg-brand px-4 py-2 text-sub font-semibold text-white shadow-card hover:bg-brand-dark"
          >
            重试
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-auto w-[min(100%,1080px)] animate-fade-in-up">
      <header className="mb-6 flex items-center gap-3">
        <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          <SettingsIcon className="size-4" />
        </span>
        <div className="leading-none">
          <p className="mb-1 text-tag font-medium uppercase tracking-[0.06em] text-muted">Settings</p>
          <h1 className="text-title font-semibold tracking-tight text-ink">设置</h1>
        </div>
      </header>

      <div className="grid max-w-[860px] gap-4">
        {/* 卡片一 · 日记字体 */}
        <section className="rounded-card border border-border bg-white p-5 shadow-card">
          <h2 className="text-body font-semibold text-ink">日记字体</h2>
          <p className="mt-1 text-tag leading-relaxed text-muted">
            只影响写日记的输入框与正文展示（写、看、AI 引用都跟随）；界面字体保持不变。
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {FONT_OPTIONS.map((option) => {
              const selected = diaryFont === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onFontChange(option.id)}
                  className={
                    'rounded-card border px-3 py-3 text-left transition-colors ' +
                    (selected
                      ? 'border-brand bg-brand-soft text-brand'
                      : 'border-border bg-surface text-ink-2 hover:border-brand-soft hover:bg-brand-softer')
                  }
                >
                  <span
                    className="block text-body font-semibold leading-none"
                    style={{ fontFamily: option.stack }}
                  >
                    {option.label}
                  </span>
                  <span
                    className="mt-1.5 block truncate text-tag leading-none text-muted"
                    style={{ fontFamily: option.stack }}
                  >
                    {option.sample}
                  </span>
                </button>
              )
            })}
          </div>

          <p className="mt-4 text-tag font-medium text-muted">实时预览 · 正文效果</p>
          <div className="diary-content mt-1.5 rounded-card bg-surface px-4 py-3 text-sub leading-[1.75] text-ink">
            {PREVIEW_TEXT}
          </div>
        </section>

        {/* 卡片二 · Embedding */}
        <section className="rounded-card border border-border bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-body font-semibold text-ink">AI 连接 · Embedding</h2>
              <p className="mt-1 text-tag leading-relaxed text-muted">
                写日记时把正文切块并建立向量索引。改动需要重建索引才生效。
              </p>
            </div>
            <button
              type="button"
              disabled={embedTest.testing}
              onClick={() => void runTest('embedding')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-card border border-border px-3 py-1.5 text-tag font-semibold text-brand transition-colors hover:border-brand-soft hover:bg-brand-softer disabled:opacity-60"
            >
              {embedTest.testing ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
                  测试中…
                </>
              ) : (
                <>
                  <BoltIcon className="size-3.5" />
                  测试连接
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {EMBEDDING_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-2.5">
                <label
                  htmlFor={`settings-${field.key}`}
                  className="w-[76px] shrink-0 text-tag font-medium text-muted"
                >
                  {field.label}
                </label>
                <input
                  id={`settings-${field.key}`}
                  type={field.secret ? 'password' : 'text'}
                  inputMode={field.numeric ? 'numeric' : undefined}
                  value={draft[field.key] ?? ''}
                  onChange={(event) => patch(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={() => resetField(field.key)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border-soft px-2 py-[7px] text-tag text-muted transition-colors hover:border-brand-soft hover:text-brand"
                >
                  <ResetIcon className="size-3" />
                  默认
                </button>
              </div>
            ))}
          </div>

          {embedTest.result && (
            <ResultLine result={embedTest.result} />
          )}
        </section>

        {/* 卡片三 · LLM */}
        <section className="rounded-card border border-border bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-body font-semibold text-ink">AI 连接 · LLM</h2>
              <p className="mt-1 text-tag leading-relaxed text-muted">
                负责意图识别与问答回复，问题发出时按此配置连接。
              </p>
            </div>
            <button
              type="button"
              disabled={llmTest.testing}
              onClick={() => void runTest('llm')}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-card border border-border px-3 py-1.5 text-tag font-semibold text-brand transition-colors hover:border-brand-soft hover:bg-brand-softer disabled:opacity-60"
            >
              {llmTest.testing ? (
                <>
                  <span className="size-3.5 animate-spin rounded-full border-2 border-brand/25 border-t-brand" />
                  测试中…
                </>
              ) : (
                <>
                  <BoltIcon className="size-3.5" />
                  测试连接
                </>
              )}
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2.5">
            {LLM_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center gap-2.5">
                <label
                  htmlFor={`settings-${field.key}`}
                  className="w-[76px] shrink-0 text-tag font-medium text-muted"
                >
                  {field.label}
                </label>
                <input
                  id={`settings-${field.key}`}
                  type={field.secret ? 'password' : 'text'}
                  value={draft[field.key] ?? ''}
                  onChange={(event) => patch(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  className={inputBase}
                />
                <button
                  type="button"
                  onClick={() => resetField(field.key)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border-soft px-2 py-[7px] text-tag text-muted transition-colors hover:border-brand-soft hover:text-brand"
                >
                  <ResetIcon className="size-3" />
                  默认
                </button>
              </div>
            ))}
          </div>

          {llmTest.result && (
            <ResultLine result={llmTest.result} />
          )}
        </section>

        {/* 说明 + 保存 */}
        <section className="rounded-card border border-border-soft bg-brand-softer px-5 py-3.5 text-tag leading-relaxed text-ink-2">
          测试连接用框内当前填写值试连一次、不保存；「保存设置」会把三张卡片的值写入本机数据库并立即生效。
          改动 Embedding 的模型或维度后，旧日记的向量维度不再匹配，需要重建索引（重置本地数据后重新写日记）。
        </section>

        {saveError && (
          <p role="alert" className="rounded-card bg-danger-soft px-3.5 py-2.5 text-sub text-danger">
            {saveError}
          </p>
        )}

        <div className="flex items-center justify-end gap-3">
          <span className="text-tag text-muted">保存后对新写入的日记立即生效</span>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSave()}
            className="inline-flex h-[38px] min-w-[120px] items-center justify-center gap-2 rounded-card bg-brand px-5 text-sub font-semibold text-white shadow-card transition-colors hover:bg-brand-dark active:scale-[0.97] disabled:opacity-60"
          >
            {saving ? (
              <>
                <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                保存中…
              </>
            ) : (
              '保存设置'
            )}
          </button>
        </div>
      </div>
    </section>
  )
}

function ResultLine({ result }: { result: AiTestResponse }) {
  const ok = result.ok
  return (
    <p
      role="status"
      className={
        'mt-3 flex items-start gap-2 rounded-card px-3 py-2 text-tag leading-relaxed ' +
        (ok ? 'bg-brand-soft text-brand' : 'bg-danger-soft text-danger')
      }
    >
      <span
        className={
          'mt-[5px] size-1.5 shrink-0 rounded-full ' + (ok ? 'bg-brand' : 'bg-danger')
        }
        aria-hidden
      />
      <span className="break-words">{result.message}</span>
    </p>
  )
}

/* 把某张卡片当前填写的字段整理成试连请求；留空字段不发 = 后端回落到默认配置 */
function buildTestRequest(scope: 'embedding' | 'llm', draft: Record<string, string>): AiTestRequest {
  const request: AiTestRequest = { scope }
  const keys = scope === 'embedding'
    ? ['embedding_base_url', 'embedding_api_key', 'embedding_model', 'embedding_dim'] as const
    : ['llm_base_url', 'llm_api_key', 'llm_model'] as const

  for (const key of keys) {
    const text = (draft[key] ?? '').trim()
    if (text === '') continue
    if (key === 'embedding_dim') {
      request.embedding_dim = Number(text)
    } else if (key === 'embedding_base_url' || key === 'llm_base_url') {
      request.base_url = text
    } else if (key === 'embedding_api_key' || key === 'llm_api_key') {
      request.api_key = text
    } else {
      request.model = text
    }
  }
  return request
}

export default SettingsView
