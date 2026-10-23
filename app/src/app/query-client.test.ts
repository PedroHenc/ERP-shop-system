import { describe, expect, it } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { shouldRetry } from './query-client'

describe('shouldRetry', () => {
  it('does not retry 4xx ApiErrors', () => {
    expect(shouldRetry(0, new ApiError(404, 'Not found'))).toBe(false)
  })

  it('retries other errors once', () => {
    expect(shouldRetry(0, new ApiError(0, 'Network error'))).toBe(true)
    expect(shouldRetry(1, new ApiError(0, 'Network error'))).toBe(false)
    expect(shouldRetry(0, new ApiError(500, 'Boom'))).toBe(true)
  })
})
