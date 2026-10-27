import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createBrowserRouter } from 'react-router'
import './app/i18n'
import { AppProviders } from './app/providers'
import { routes } from './app/router'
import './index.css'

const router = createBrowserRouter(routes)

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html is missing the #root element')

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
