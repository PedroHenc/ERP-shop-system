import { useContext } from 'react'
import { Outlet } from 'react-router'
import { AuthProvider } from './AuthProvider'
import { InitialSessionContext } from './initial-session'

/** Root route element: puts the AuthProvider inside the router so it can navigate. */
export function AuthRoot() {
  const initialSession = useContext(InitialSessionContext)
  return (
    <AuthProvider initialSession={initialSession}>
      <Outlet />
    </AuthProvider>
  )
}
