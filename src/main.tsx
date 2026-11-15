import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from "@clerk/react"
import { dark } from "@clerk/ui/themes"
import App from './App'
import './index.css'

const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={key} appearance={{ theme: dark }}>
      <App />
    </ClerkProvider>
  </StrictMode>,
)
