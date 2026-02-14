import { describe, it, expect } from 'vitest'
import { applyPagination, clampLimit, normalizeOffset, normalizeWindow } from '../../supabase/functions/insights-api/query-optimizer'

describe('Risk workflow regression guards', () => {
  it('clamps limit and offset safely', () => {
    expect(clampLimit(0)).toBe(1)
    expect(clampLimit(99999)).toBe(500)
    expect(normalizeOffset(-10)).toBe(0)
  })

  it('normalizes date window to bounded range', () => {
    const window = normalizeWindow({ startDate: '2020-01-01', endDate: '2026-02-01' })
    expect(window.startDate <= window.endDate).toBe(true)
    expect(window.startDate.startsWith('2025')).toBe(true)
  })

  it('applies deterministic pagination', () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1)
    const paged = applyPagination(values, 5, 5)
    expect(paged.items).toEqual([6, 7, 8, 9, 10])
  })
})
