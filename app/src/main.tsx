import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Placeholder until the real app shell is built in Task 9.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="p-6 text-sm">ERP Shop</div>
  </StrictMode>,
)
