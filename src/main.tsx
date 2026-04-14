import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import '@xyflow/react/dist/style.css'
import './index.css'
import { initTelemetry } from './lib/telemetry'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

initTelemetry({
  enabled: import.meta.env.VITE_TELEMETRY_ENABLED !== '0',
  release: import.meta.env.VITE_RELEASE ?? import.meta.env.MODE,
  environment: import.meta.env.MODE,
  supabaseUrl,
  supabaseAnonKey,
  supabaseUseBeacon: import.meta.env.PROD,
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
