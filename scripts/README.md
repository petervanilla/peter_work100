# scripts

| 파일 | 용도 | 서버 필요 |
|---|---|---|
| `verify-catalog.cjs` | 카탈로그 데이터·정적 파일 정합성(수·중복·분류·명세·HTML·썸네일·필터 로직) + **다크 모드 정적 검사**(라이트용 색마다 `dark:` 짝이 있는지, 테마 구성) | 아니오 |
| `test-site.cjs` | 사이트 섹션별 브라우저 테스트(api · catalog · modal · filters · detail · interact · **theme** · tools · mobile) | 예 |
| `smoke-tools.cjs` | 2~3단계에서 추가한 도구 21개의 **계산 결과·저장·추가·삭제 동작**(예: OKR 점수, 손익분기 판매량, 번호·날짜 변환, 사진 필수 잠금, 포인트 상한). `ONLY=slug,slug` 로 일부만 | 예 |
| `capture-previews.cjs` | 도구 실화면 썸네일(878×560 PNG) 생성 | 예 |
| `analyze-planned.cjs` | **준비 중 도구 분석** — 66개의 완성 경로(A 재사용 / B 이식 / C 신규)와 베이스 매핑, 분류·모양별 완성률 | 아니오 |
| `report-planned.cjs` | **완성 리포트 생성** — `docs/planned-tools-completion-report.md` 를 실데이터로 다시 씁니다 | 아니오 |
| `lib/load-ts.cjs` | 테스트가 `src/*.ts` 를 그대로 불러오는 로더 | – |

```bash
# 데이터 검증 (서버 불필요)
node scripts/verify-catalog.cjs

# 준비 중 도구 분석 · 리포트 재생성 (실시간 데이터 기준)
node scripts/analyze-planned.cjs
node scripts/report-planned.cjs

# 브라우저 테스트: 서버를 띄운 뒤 (한 번만: npx --yes playwright install chromium)
SITE_URL=http://127.0.0.1:3000 npx --yes --package=playwright -c 'node scripts/test-site.cjs'
SECTIONS=catalog,filters SITE_URL=... npx --yes --package=playwright -c 'node scripts/test-site.cjs'   # 일부만
ONLY_TOOLS=meeting-timer SECTIONS=tools ...                                                           # 도구 하나만

# 썸네일 다시 만들기 (전체 또는 ONLY=slug,slug)
PREVIEW_BASE_URL=http://127.0.0.1:3000 ONLY=meeting-timer npx --yes --package=playwright -c 'node scripts/capture-previews.cjs'
```

주의: `api` · `detail` 섹션은 복사 횟수를 올립니다. 실제 사용 통계를 보려면 테스트 뒤 `truncate table tool_copy_counts;` 로 초기화하세요.
섹션을 동시에 돌리면 복사 횟수 검사끼리 간섭할 수 있어요. `api` 와 `detail` 은 따로 실행하세요.

## 라이트 · 다크 모드 검사 (`SECTIONS=theme`)

- 아이콘 위치("이렇게 사용하세요" 오른쪽 바로 옆), 해·달 버튼 상태, 키보드(Enter/Space/Tab)·터치 조작
- 선택 저장(`app-theme`), 새로고침 직후 깜빡임 없음, 기기 설정 따라가기/직접 선택 우선, 탭 사이 동기화
- **다크 화면의 모든 글자를 WCAG 색 대비(글자 4.5:1, 큰 글자·아이콘 3:1)로 계산**
  (반투명 겹침·그라데이션 배경 반영, 카드 hover·검색창 포커스·모달·모바일 상태 포함, 장식용 `aria-hidden` 제외)
- 도구 화면(iframe)이 다크에서 어두워지고 라이트에서 밝은지 화면 밝기로 확인

새 화면을 만들 때: 라이트용 색(`bg-white`, `text-slate-600`, `border-slate-200` …)을 쓰면
같은 문자열에 `dark:` 짝을 함께 쓰세요. `verify-catalog.cjs` 가 빠뜨린 곳을 찾아 줍니다.

## 새 도구를 추가하는 순서

1. `public/tools/<slug>.html` 작성 — 파일 하나로 동작, 처음 열면 예시 데이터, 자동 저장(localStorage), 「이럴 때 좋아요」 3줄, 외부 리소스 없음
2. `src/lib/tools/ready/<분야>.ts` 에 명세 추가 (`addedAt` 은 현재 가장 큰 값 + 1 → 가장 최근 2개가 NEW)
3. `src/lib/tools/planned.ts` 에서 같은 이름을 지우고, 다음 제작 묶음에 `wave: 1` 을 붙임
4. 서버를 띄운 뒤 `capture-previews.cjs` 로 썸네일 생성 (`ONLY=slug` 로 하나만)
5. **다시 빌드·재시작** — 프로덕션 서버는 *빌드 시점에 있던* `public/` 파일만 제공해서, 빌드 뒤에 만든 썸네일은 404 가 나요
6. `verify-catalog.cjs` → `smoke-tools.cjs`(새 도구 테스트 추가) → `test-site.cjs`

주의: `npm run build` 와 `build_and_start` 를 동시에 실행하면 "Another next build process is already running" 으로 충돌해요. 차례로 실행하세요.
