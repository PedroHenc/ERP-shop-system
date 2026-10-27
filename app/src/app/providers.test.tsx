import { render } from '@testing-library/react'
import { MotionConfigContext } from 'motion/react'
import { useContext } from 'react'
import { describe, expect, it } from 'vitest'
import { AppProviders } from './providers'

let reducedMotion: string | undefined

function Probe() {
  reducedMotion = useContext(MotionConfigContext).reducedMotion
  return null
}

describe('AppProviders', () => {
  it('makes motion follow the user reduced-motion preference', () => {
    reducedMotion = undefined
    render(
      <AppProviders initialSession={null}>
        <Probe />
      </AppProviders>,
    )
    expect(reducedMotion).toBe('user')
  })
})
