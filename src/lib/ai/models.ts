export interface ModelOption {
  id: string
  label: string
  vendor: 'OpenAI' | 'Google' | 'Anthropic'
  /** USD per 1M tokens, OpenRouter list price on 2026-10-02. */
  price: { input: number; output: number }
  /** OpenRouter `reasoning` parameter that keeps conversation replies fast. */
  reasoning: Record<string, unknown>
}

export const MODEL_OPTIONS: ModelOption[] = [
  { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', vendor: 'Google', price: { input: 0.75, output: 3.75 }, reasoning: { effort: 'minimal' } },
  { id: 'openai/gpt-6-luna', label: 'GPT-6 Luna', vendor: 'OpenAI', price: { input: 0.1, output: 0.5 }, reasoning: { effort: 'none' } },
  { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna', vendor: 'OpenAI', price: { input: 0.2, output: 1.2 }, reasoning: { effort: 'none' } },
  { id: 'openai/gpt-5.4-mini', label: 'GPT-5.4 mini', vendor: 'OpenAI', price: { input: 0.75, output: 4.5 }, reasoning: { effort: 'none' } },
  { id: 'google/gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash-Lite', vendor: 'Google', price: { input: 0.3, output: 2.5 }, reasoning: { effort: 'minimal' } },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', vendor: 'Anthropic', price: { input: 1, output: 5 }, reasoning: { enabled: false } },
  { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', vendor: 'Anthropic', price: { input: 2, output: 10 }, reasoning: { effort: 'low' } },
]

/** Provisional until the benchmark in scripts/bench-models.ts runs with a real key. */
export const DEFAULT_MODEL = 'google/gemini-3.8-flash'

export function reasoningFor(modelId: string): Record<string, unknown> | undefined {
  return MODEL_OPTIONS.find((m) => m.id === modelId)?.reasoning
}

export function modelLabel(modelId: string): string {
  return MODEL_OPTIONS.find((m) => m.id === modelId)?.label ?? modelId
}
