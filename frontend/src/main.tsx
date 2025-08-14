import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { subscribe } from 'valtio'
import { store, persistAuth } from './store'
import './index.css'
import App from './App.tsx'

// Subscribe to auth changes to persist them
subscribe(store.auth, persistAuth)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
