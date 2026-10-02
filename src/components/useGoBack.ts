import { useNavigate } from 'react-router'

/** Goes back in app history, or to `fallback` when the screen was opened directly. */
export function useGoBack(fallback: string): () => void {
  const navigate = useNavigate()
  return () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
