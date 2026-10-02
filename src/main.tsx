import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { completeOAuth } from './lib/ai/oauth.ts'
import { useToast } from './store/toast.ts'
import { useTutor } from './store/tutor.ts'

async function boot() {
  // OpenRouter sends the user back to the app root with ?code=… after they approve the connection.
  const result = await completeOAuth(window.location.search, window.localStorage)
  if (result.status !== 'none') {
    if (result.status === 'ok') {
      useTutor.getState().setApiKey(result.key)
      useToast.getState().show('OpenRouter에 연결됐어요')
    } else {
      useToast.getState().show(result.message)
    }
    const hash = result.status === 'ok' ? '#/tutor' : '#/tutor/connect'
    window.history.replaceState(null, '', window.location.pathname + hash)
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

void boot()
