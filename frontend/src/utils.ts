export function formatFullDate(value: string): string {
  const date = new Date(value)
  const day = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date)
  return `${day} · ${weekday}`
}

export function todayLabel(): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())
}

export function entryTitle(content: string): string {
  const firstLine = content.trim().split(/\r?\n/)[0] || '无标题日记'
  return firstLine.length > 28 ? `${firstLine.slice(0, 28)}...` : firstLine
}
