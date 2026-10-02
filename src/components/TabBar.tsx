import { BookOpen, House, MessageCircle, Mic, User } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'

const TABS = [
  { to: '/', label: '홈', Icon: House, end: true },
  { to: '/vocab', label: '단어', Icon: BookOpen, end: false },
  { to: '/speaking', label: '말하기', Icon: Mic, end: false },
  { to: '/tutor', label: 'AI 튜터', Icon: MessageCircle, end: false },
  { to: '/me', label: '나', Icon: User, end: false },
]

export function TabBar() {
  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-[480px]">
        {TABS.map(({ to, label, Icon, end }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 pt-2 pb-2.5 text-[11px] font-bold ${isActive ? 'text-brand' : 'text-faint'}`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={24} strokeWidth={isActive ? 2.6 : 2} aria-hidden />
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function TabLayout() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
