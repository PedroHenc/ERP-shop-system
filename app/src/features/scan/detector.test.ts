import { describe, expect, it } from 'vitest'
import { productCode } from './detector'

const read = (rawValue: string, format = 'ean_13') => productCode({ rawValue, format })

describe('productCode', () => {
  it('accepts GTINs with a correct check digit', () => {
    expect(read(' 7891234567895 ')).toBe('7891234567895')
    expect(read('96385074', 'ean_8')).toBe('96385074')
    expect(read('036000291452', 'upc_a')).toBe('036000291452')
    expect(read('01234565', 'upc_e')).toBe('01234565')
    expect(read('15400141288763', 'itf')).toBe('15400141288763')
    expect(read('7891234567895', 'code_128')).toBe('7891234567895')
  })

  it('rejects any single misread digit', () => {
    const code = '7891234567895'
    for (let i = 0; i < code.length; i++) {
      for (let d = 0; d <= 9; d++) {
        if (String(d) === code[i]) continue
        expect(read(code.slice(0, i) + d + code.slice(i + 1))).toBeNull()
      }
    }
  })

  it('rejects lengths and formats that are not product codes', () => {
    expect(read('123456', 'itf')).toBeNull()
    expect(read('7891234567895', 'ean_8')).toBeNull()
    expect(read('ABC-123', 'code_128')).toBeNull()
    expect(read('7891234567895', 'qr_code')).toBeNull()
    expect(read('21234565', 'upc_e')).toBeNull()
  })
})
