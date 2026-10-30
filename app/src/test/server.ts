import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

export const API = 'http://localhost:8080'

/** The header loads the store on every signed-in page; tests override it where it matters. */
export const STORE = { id: 1, name: 'Corner Shop', logo: null }

export const server = setupServer(http.get(`${API}/store`, () => HttpResponse.json(STORE)))
