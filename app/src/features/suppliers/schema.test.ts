import { describe, expect, it } from 'vitest'
import { supplierFixture } from '@/test/fixtures'
import { supplierFormDefaults, supplierFormSchema, toSupplierFormValues, toSupplierRequest } from './schema'
import type { SupplierFormValues } from './schema'

function valid(overrides: Partial<SupplierFormValues> = {}): SupplierFormValues {
  return { ...supplierFormDefaults, legalName: 'Acme Ltda', ...overrides }
}

function fieldsWithErrors(values: SupplierFormValues): string[] {
  const result = supplierFormSchema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => String(issue.path[0]))
}

describe('supplierFormSchema', () => {
  it('accepts a minimal valid supplier', () => {
    expect(supplierFormSchema.safeParse(valid()).success).toBe(true)
  })

  it('requires the legal name and limits lengths', () => {
    expect(fieldsWithErrors(valid({ legalName: '  ' }))).toEqual(['legalName'])
    expect(fieldsWithErrors(valid({ legalName: 'a'.repeat(151) }))).toEqual(['legalName'])
    expect(fieldsWithErrors(valid({ tradeName: 'a'.repeat(151) }))).toEqual(['tradeName'])
    expect(fieldsWithErrors(valid({ phone: '1'.repeat(21) }))).toEqual(['phone'])
    expect(fieldsWithErrors(valid({ phone: '1'.repeat(20), tradeName: 'a'.repeat(150) }))).toEqual([])
  })

  it('accepts tax IDs with separators', () => {
    expect(fieldsWithErrors(valid({ taxId: '12.345.678/0001-90' }))).toEqual([])
    expect(fieldsWithErrors(valid({ taxId: 'de 123.456/789' }))).toEqual([])
    expect(fieldsWithErrors(valid({ taxId: '' }))).toEqual([])
  })

  it('rejects tax IDs over 14 characters or with other symbols', () => {
    expect(fieldsWithErrors(valid({ taxId: '12.345.678/0001-901' }))).toEqual(['taxId'])
    expect(fieldsWithErrors(valid({ taxId: '12#34' }))).toEqual(['taxId'])
  })

  it('validates email only when filled', () => {
    expect(fieldsWithErrors(valid({ email: '' }))).toEqual([])
    expect(fieldsWithErrors(valid({ email: 'a@b.com' }))).toEqual([])
    expect(fieldsWithErrors(valid({ email: 'x@' }))).toEqual(['email'])
    expect(fieldsWithErrors(valid({ email: `${'a'.repeat(150)}@b.com` }))).toEqual(['email'])
  })

  it('uses i18n keys as messages', () => {
    const result = supplierFormSchema.safeParse(valid({ legalName: '', taxId: '#', email: 'x@' }))
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages).toHaveLength(3)
    for (const message of messages) expect(message).toMatch(/^suppliers:validation\./)
  })
})

describe('toSupplierRequest', () => {
  it('sends blank optionals as null', () => {
    const request = toSupplierRequest(valid({ tradeName: '  ', taxId: '', email: '', phone: ' ' }), 2)
    expect(request).toEqual({
      legalName: 'Acme Ltda',
      tradeName: null,
      taxId: null,
      email: null,
      phone: null,
      active: true,
      version: 2,
    })
  })

  it('trims text and sends the tax ID as typed', () => {
    const request = toSupplierRequest(valid({ legalName: ' Acme ', taxId: ' 12.345.678/0001-90 ' }), null)
    expect(request.legalName).toBe('Acme')
    expect(request.taxId).toBe('12.345.678/0001-90')
    expect(request.version).toBeNull()
  })
})

describe('toSupplierFormValues', () => {
  it('maps nulls to empty strings', () => {
    expect(toSupplierFormValues(supplierFixture({ tradeName: null, taxId: null, email: null, phone: null }))).toEqual({
      legalName: 'Acme Ltda',
      tradeName: '',
      taxId: '',
      email: '',
      phone: '',
      active: true,
    })
  })
})
