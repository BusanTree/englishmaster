import type { RecognizerError } from './recognizer.ts'

/** What to tell the learner when speech recognition can't be used. */
export const SPEECH_NOTICES: Record<RecognizerError, string> = {
  'not-allowed': '마이크 권한을 허용해 주세요. 직접 입력으로도 할 수 있어요.',
  unsupported: '이 브라우저는 음성인식을 지원하지 않아요. 크롬에서 열어 주세요.',
  network: '음성인식에는 인터넷 연결이 필요해요.',
  'no-speech': '잘 안 들렸어요. 다시 말해 볼까요?',
  other: '음성인식에 문제가 생겼어요. 다시 시도하거나 직접 입력해 주세요.',
}
