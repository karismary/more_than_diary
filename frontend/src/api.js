async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let detail = `请求失败：HTTP ${response.status}`;
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Keep the HTTP error when the response is not JSON.
    }
    throw new Error(detail);
  }

  if (response.status === 204) return null;
  return response.json();
}

function normalizeEntry(entry) {
  const date = new Date(entry.created_at);
  return {
    ...entry,
    date: entry.created_at.slice(0, 10),
    time: date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

export async function loadEntries() {
  const entries = await request('/api/entries?limit=100');
  return entries.map(normalizeEntry);
}

export async function createEntry(content) {
  const entry = await request('/api/entries', {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
  return normalizeEntry(entry);
}

export function deleteEntry(id) {
  return request(`/api/entries/${id}`, { method: 'DELETE' });
}

export function askDiary(question) {
  return request('/api/ask', {
    method: 'POST',
    body: JSON.stringify({ question }),
  });
}
