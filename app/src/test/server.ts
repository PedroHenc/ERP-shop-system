import { setupServer } from 'msw/node'

export const API = 'http://localhost:8080'

export const server = setupServer()
