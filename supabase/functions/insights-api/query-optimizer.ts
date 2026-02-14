export type InsightsQueryParams = {
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}

const DEFAULT_WINDOW_DAYS = 30
const MAX_WINDOW_DAYS = 180
const DEFAULT_LIMIT = 50
const MAX_LIMIT = 500

export function parseIsoDate(input?: string): Date | null {
  if (!input) return null
  const date = new Date(input)
  return Number.isNaN(date.getTime()) ? null : date
}

export function clampLimit(limit?: number): number {
  const normalized = typeof limit === 'number' ? Math.floor(limit) : DEFAULT_LIMIT
  return Math.max(1, Math.min(MAX_LIMIT, normalized))
}

export function normalizeWindow(params: InsightsQueryParams): { startDate: string; endDate: string } {
  const now = new Date()
  const end = parseIsoDate(params.endDate) ?? now
  const requestedStart = parseIsoDate(params.startDate)

  const earliestAllowed = new Date(end)
  earliestAllowed.setUTCDate(earliestAllowed.getUTCDate() - MAX_WINDOW_DAYS)

  let start = requestedStart ?? new Date(end)
  if (!requestedStart) {
    start.setUTCDate(start.getUTCDate() - DEFAULT_WINDOW_DAYS)
  }

  if (start < earliestAllowed) {
    start = earliestAllowed
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

export function normalizeOffset(offset?: number): number {
  const value = typeof offset === 'number' ? Math.floor(offset) : 0
  return Math.max(0, value)
}

export function applyPagination<T>(items: T[], limit?: number, offset?: number): { items: T[]; limit: number; offset: number } {
  const normalizedLimit = clampLimit(limit)
  const normalizedOffset = normalizeOffset(offset)

  return {
    items: items.slice(normalizedOffset, normalizedOffset + normalizedLimit),
    limit: normalizedLimit,
    offset: normalizedOffset,
  }
}
