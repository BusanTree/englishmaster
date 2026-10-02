import { Check, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { Screen } from '../../components/Screen.tsx'
import { COURSES } from '../../content/index.ts'
import { useProgress } from '../../store/progress.ts'

export function SpeakingHome() {
  const records = useProgress((s) => s.lessons)

  return (
    <Screen tabs>
      <h1 className="pt-4 pb-2 text-[26px] font-extrabold tracking-tight">말하기</h1>
      <p className="text-muted">상황별 핵심 표현을 듣고, 따라 하고, 직접 말해 봐요.</p>

      {COURSES.map((course) => {
        const done = course.lessons.filter((l) => records[l.id]).length
        return (
          <section key={course.id} className="mt-8" aria-labelledby={`course-${course.id}`}>
            <header className="flex items-end justify-between">
              <div>
                <h2 id={`course-${course.id}`} className="text-xl font-extrabold">
                  {course.title}
                </h2>
                <p className="text-sm text-muted">{course.description}</p>
              </div>
              <span className="text-sm font-bold text-muted tabular-nums">
                {done}/{course.lessons.length} 완료
              </span>
            </header>
            <ol className="mt-3 divide-y divide-line border-y border-line">
              {course.lessons.map((lesson, i) => {
                const record = records[lesson.id]
                return (
                  <li key={lesson.id}>
                    <Link to={`/speaking/${lesson.id}`} className="flex items-center gap-4 py-3.5 active:bg-surface">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-full font-en text-base font-extrabold ${
                          record ? 'bg-good text-white' : 'bg-brand-soft text-brand'
                        }`}
                        aria-hidden
                      >
                        {record ? <Check size={20} strokeWidth={3} /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{lesson.title}</span>
                        <span className="block truncate text-sm text-muted">{lesson.description}</span>
                      </span>
                      {record && <span className="shrink-0 text-sm font-bold text-good-deep">{record.bestScore}점</span>}
                      <ChevronRight size={20} className="shrink-0 text-faint" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ol>
          </section>
        )
      })}
    </Screen>
  )
}
