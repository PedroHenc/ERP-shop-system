import { isApiError } from '@/shared/api/http'

export type FormFailure = { kind: 'message'; text: string } | { kind: 'conflict' }

/**
 * Maps an API failure onto a form: 400 field errors are set on their fields, anything else
 * becomes a form-level failure. `unexpected` means the caller should show a generic error.
 */
export function applyServerErrors(
  error: unknown,
  isField: (name: string) => boolean,
  setFieldError: (name: string, message: string) => void,
): { type: 'handled'; failure: FormFailure | null } | { type: 'unexpected' } {
  if (isApiError(error) && error.status === 409) {
    return { type: 'handled', failure: { kind: 'conflict' } }
  }
  if (isApiError(error) && error.status === 404 && error.detail) {
    return { type: 'handled', failure: { kind: 'message', text: error.detail } }
  }
  if (isApiError(error) && error.status === 400) {
    const unmatched: string[] = []
    for (const [name, message] of Object.entries(error.errors ?? {})) {
      if (isField(name)) setFieldError(name, message)
      else unmatched.push(message)
    }
    const text = unmatched.length > 0 ? unmatched.join(' ') : error.errors ? undefined : error.detail
    return { type: 'handled', failure: text ? { kind: 'message', text } : null }
  }
  return { type: 'unexpected' }
}
