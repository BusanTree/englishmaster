import { useEffect, type ReactNode } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router'
import { Toast } from './components/Feedback.tsx'
import { TabLayout } from './components/TabBar.tsx'
import { Home } from './screens/home/Home.tsx'
import { Me } from './screens/me/Me.tsx'
import { Settings } from './screens/me/Settings.tsx'
import { Onboarding } from './screens/onboarding/Onboarding.tsx'
import { LessonPlayer } from './screens/speaking/LessonPlayer.tsx'
import { SpeakingHome } from './screens/speaking/SpeakingHome.tsx'
import { TutorChat } from './screens/tutor/TutorChat.tsx'
import { TutorConnect } from './screens/tutor/TutorConnect.tsx'
import { TutorHome } from './screens/tutor/TutorHome.tsx'
import { TutorSummary } from './screens/tutor/TutorSummary.tsx'
import { VocabHome } from './screens/vocab/VocabHome.tsx'
import { VocabSession } from './screens/vocab/VocabSession.tsx'
import { WordDetail } from './screens/vocab/WordDetail.tsx'
import { WordList } from './screens/vocab/WordList.tsx'
import { useSettings } from './store/settings.ts'

function OnboardingGate({ children }: { children: ReactNode }) {
  const onboarded = useSettings((s) => s.onboarded)
  const { pathname } = useLocation()
  if (!onboarded && pathname !== '/onboarding') return <Navigate to="/onboarding" replace />
  return children
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <Toast />
      <OnboardingGate>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<TabLayout />}>
            <Route index element={<Home />} />
            <Route path="vocab" element={<VocabHome />} />
            <Route path="speaking" element={<SpeakingHome />} />
            <Route path="tutor" element={<TutorHome />} />
            <Route path="me" element={<Me />} />
          </Route>
          <Route path="vocab/words" element={<WordList />} />
          <Route path="vocab/words/:wordId" element={<WordDetail />} />
          <Route path="vocab/session" element={<VocabSession />} />
          <Route path="speaking/:lessonId" element={<LessonPlayer />} />
          <Route path="tutor/connect" element={<TutorConnect />} />
          <Route path="tutor/chat/:conversationId" element={<TutorChat />} />
          <Route path="tutor/summary/:conversationId" element={<TutorSummary />} />
          <Route path="me/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </OnboardingGate>
    </HashRouter>
  )
}
