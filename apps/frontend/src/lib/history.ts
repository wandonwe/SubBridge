import type { OutputFormat } from '@subbridge/core'

export interface HistoryEntry {
  id: string
  /** Generated /api/convert URL. */
  convertUrl: string
  target: OutputFormat
  /** Number of source subscriptions, for display. */
  sourceCount: number
  createdAt: number
}

const KEY = 'subbridge-history'
const MAX_ENTRIES = 12

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as HistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function addHistory(entry: HistoryEntry): HistoryEntry[] {
  const next = [entry, ...loadHistory().filter((e) => e.convertUrl !== entry.convertUrl)].slice(
    0,
    MAX_ENTRIES,
  )
  persist(next)
  return next
}

export function removeHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id)
  persist(next)
  return next
}

export function clearHistory(): HistoryEntry[] {
  persist([])
  return []
}

function persist(entries: HistoryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries))
  } catch {
    // storage full / private mode — history is best-effort
  }
}
