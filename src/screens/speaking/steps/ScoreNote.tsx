/** Score with a short coaching line; green when it passes. */
export function ScoreNote({ score, pass }: { score: number; pass: number }) {
  const passed = score >= pass
  const message = passed ? '훌륭해요!' : score >= pass - 20 ? '거의 다 왔어요. 한 번 더 해 볼까요?' : '다시 듣고 천천히 말해 보세요.'
  return (
    <div
      role="status"
      className={`flex items-center gap-4 rounded-2xl px-4 py-3 ${passed ? 'bg-good-soft text-good-deep' : 'bg-bad-soft text-bad-deep'}`}
    >
      <span className="shrink-0 font-en text-3xl font-extrabold tabular-nums">
        {score}
        <span className="ml-0.5 font-sans text-base font-bold">점</span>
      </span>
      <span className="text-[15px] font-bold leading-snug">{message}</span>
    </div>
  )
}
