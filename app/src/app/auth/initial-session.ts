import { createContext } from 'react'
import type { InitialSession } from './AuthProvider'

/** Lets AppProviders hand a ready session (tests) to the AuthProvider mounted inside the router. */
export const InitialSessionContext = createContext<InitialSession | null | undefined>(undefined)
