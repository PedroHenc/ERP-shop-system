import { describe, expect, it } from 'vitest'
import { greetingKey } from './greeting'

describe('greetingKey', () => {
  it('maps the hour of day to a greeting', () => {
    expect(greetingKey(new Date(2026, 0, 1, 8, 0))).toBe('morning')
    expect(greetingKey(new Date(2026, 0, 1, 12, 0))).toBe('afternoon')
    expect(greetingKey(new Date(2026, 0, 1, 18, 0))).toBe('evening')
  })
})
