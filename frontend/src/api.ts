export interface Entry {
  id: number
  content: string
  mood: string | null
  place: string | null
  weather: string | null
  created_at: string
  updated_at: string
}

export interface EntryDraft {
  content: string
  mood: string | null
  place: string | null
  weather: string | null
}

export interface DiarySource {
  entry_id: number
  content: string
  fragment_id: number | null
  score: number | null
}

export interface AskResponse {
  answer: string
  sources: DiarySource[]
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init)

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: unknown } | null
    const detail = typeof body?.detail === 'string' ? body.detail : '请求失败，请稍后重试。'
    throw new Error(detail)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export function loadEntries(): Promise<Entry[]> {
  // 显式取到后端上限，避免默认 limit=20 让旧日记从列表静默消失
  return request<Entry[]>('/api/entries?limit=100')
}

export function loadEntry(entryId: number): Promise<Entry> {
  return request<Entry>(`/api/entries/${entryId}`)
}

export function createEntry(draft: EntryDraft): Promise<Entry> {
  return request<Entry>('/api/entries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft),
  })
}

export function removeEntry(entryId: number): Promise<void> {
  return request<void>(`/api/entries/${entryId}`, { method: 'DELETE' })
}

export function askDiary(question: string): Promise<AskResponse> {
  return request<AskResponse>('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  })
}

export interface SettingsResponse {
  overrides: Record<string, string | number>
  defaults: Record<string, string | number>
}

/** 前端要发给 PUT 的值；null 表示恢复默认 */
export type SettingValue = string | number | null

export function loadSettings(): Promise<SettingsResponse> {
  return request<SettingsResponse>('/api/settings')
}

export function saveSettings(overrides: Record<string, SettingValue>): Promise<SettingsResponse> {
  return request<SettingsResponse>('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ overrides }),
  })
}

export interface AiTestRequest {
  scope: 'embedding' | 'llm'
  base_url?: string
  api_key?: string
  model?: string
  embedding_dim?: number
}

export interface AiTestResponse {
  ok: boolean
  message: string
}

export function testAiConnection(req: AiTestRequest): Promise<AiTestResponse> {
  return request<AiTestResponse>('/api/settings/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
}
