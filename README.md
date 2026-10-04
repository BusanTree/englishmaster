# EnglishMaster

말하기 레슨, 단어 간격 반복 복습, AI 튜터 대화를 한 앱에 담은 개인용 영어 학습 웹앱(PWA)입니다.

- 단어 800개(기초·일상·중급·고급 200개씩), 7단계 간격 반복 복습, 퀴즈 5종
- 말하기 레슨 24개: 표현 익히기 → 따라 말하기 → 영어로 말하기 → 대본 롤플레이
- AI 튜터(OpenRouter): 자유 대화와 상황 롤플레이, 문장마다 교정, 대화 요약
- 서버 없음: 진도는 폰에 저장되고, AI는 폰에서 OpenRouter를 직접 호출합니다.

## 폰에서 쓰기 (갤럭시)

1. 크롬으로 https://busantree.github.io/englishmaster/ 를 엽니다. 삼성 인터넷은 음성인식이 안 될 수 있어요.
2. 크롬 메뉴 → **홈 화면에 추가** → 설치
3. 설치된 앱에서 처음 말하기를 할 때 마이크 권한을 허용합니다.
4. AI 튜터: **나 → 설정 → OpenRouter 연결** (OpenRouter 계정과 크레딧 필요). 키는 폰에만 저장됩니다.

## 개발

```bash
npm install
npm run dev      # http://localhost:5173/englishmaster/
npm test
npm run build
```

`main` 브랜치에 푸시하면 GitHub Actions가 테스트, 빌드 후 GitHub Pages에 배포합니다.

## AI 모델 비교

```bash
# .env.local 에 OPENROUTER_API_KEY=sk-or-... 를 넣은 뒤
npm run bench                       # 후보 모델 전체
npm run bench -- openai/gpt-6-luna  # 특정 모델만
```

응답 시간, 턴당 비용, 형식 성공률, 교정 정확도를 표로 보여 주고 원문 응답을 `bench-results/`에 저장합니다.
