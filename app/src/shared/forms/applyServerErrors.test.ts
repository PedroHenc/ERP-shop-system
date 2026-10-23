import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/shared/api/http'
import { applyServerErrors } from './applyServerErrors'

const isField = (name: string) => name === 'name' || name === 'taxId'

describe('applyServerErrors', () => {
  it('maps 400 field errors and leftovers', () => {
    const setFieldError = vi.fn()
    const error = new ApiError(400, 'bad', { errors: { name: 'dup', other: 'x' } })
    expect(applyServerErrors(error, isField, setFieldError)).toEqual({
      type: 'handled',
      failure: { kind: 'message', text: 'x' },
    })
    expect(setFieldError).toHaveBeenCalledTimes(1)
    expect(setFieldError).toHaveBeenCalledWith('name', 'dup')
  })

  it('returns no failure when every 400 error is a field error', () => {
    const setFieldError = vi.fn()
    const error = new ApiError(400, 'bad', { detail: 'Validation failed', errors: { name: 'dup' } })
    expect(applyServerErrors(error, isField, setFieldError)).toEqual({ type: 'handled', failure: null })
  })

  it('uses detail for 400 without errors', () => {
    const error = new ApiError(400, 'bad', { detail: 'Malformed request' })
    expect(applyServerErrors(error, isField, vi.fn())).toEqual({
      type: 'handled',
      failure: { kind: 'message', text: 'Malformed request' },
    })
  })

  it('returns conflict for 409', () => {
    expect(applyServerErrors(new ApiError(409, 'conflict'), isField, vi.fn())).toEqual({
      type: 'handled',
      failure: { kind: 'conflict' },
    })
  })

  it('returns message for 404 with detail', () => {
    const error = new ApiError(404, 'nf', { detail: 'Supplier not found' })
    expect(applyServerErrors(error, isField, vi.fn())).toEqual({
      type: 'handled',
      failure: { kind: 'message', text: 'Supplier not found' },
    })
  })

  it('returns unexpected for status 0, 500 and non-ApiError', () => {
    expect(applyServerErrors(new ApiError(0, 'Network error'), isField, vi.fn())).toEqual({ type: 'unexpected' })
    expect(applyServerErrors(new ApiError(500, 'boom'), isField, vi.fn())).toEqual({ type: 'unexpected' })
    expect(applyServerErrors(new ApiError(404, 'nf'), isField, vi.fn())).toEqual({ type: 'unexpected' })
    expect(applyServerErrors(new Error('x'), isField, vi.fn())).toEqual({ type: 'unexpected' })
  })
})
