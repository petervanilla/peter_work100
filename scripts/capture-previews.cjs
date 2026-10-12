/*
 * 실제 도구 HTML을 Chromium으로 렌더링해 카탈로그 썸네일을 만듭니다.
 * 실행 전: 앱 서버를 :3000(또는 PREVIEW_PORT)에 띄우고 npx --yes playwright install chromium
 * 실행:    npx --yes --package=playwright -c 'node scripts/capture-previews.cjs'
 * 포트 변경: PREVIEW_PORT=3001 npx --yes --package=playwright -c 'node scripts/capture-previews.cjs'
 * 결과:    public/tools/previews/<slug>.png (878×560)
 *
 * 화면 데이터는 격리된 캡처 브라우저에만 넣습니다. 서비스 사용자의 저장 데이터는 건드리지 않습니다.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch {
    // npx --package 실행 시 Playwright는 임시 node_modules에 있으므로 PATH의 CLI 위치에서 로드
    const executable = execFileSync("which", ["playwright"], { encoding: "utf8" }).trim();
    if (!executable) throw new Error("Playwright를 찾을 수 없어요. npx --yes playwright를 실행하세요.");
    const packageRoot = path.dirname(fs.realpathSync(executable));
    return require(packageRoot);
  }
}

const { chromium } = loadPlaywright();
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/tools/previews");
const PORT = process.env.PREVIEW_PORT || "3000";
const BASE_URL = process.env.PREVIEW_BASE_URL || `http://127.0.0.1:${PORT}`;
// 캡처 대상은 public/tools 의 HTML 전체(도구를 추가해도 목록을 고칠 필요가 없어요)
const SLUGS = fs
  .readdirSync(path.join(ROOT, "public/tools"))
  .filter((f) => f.endsWith(".html"))
  .map((f) => f.slice(0, -5))
  .sort();

function localDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function plusDays(amount) {
  const d = new Date();
  d.setDate(d.getDate() + amount);
  return localDate(d);
}

function previewSeed(slug) {
  const today = localDate(new Date());
  const yesterday = plusDays(-1);
  const soon = plusDays(1);
  const currentDay = new Date().getDay();
  const offset = currentDay === 0 ? 6 : currentDay - 1;
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - offset);
  const dateOfWeek = (i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return localDate(d);
  };
  const now = Date.now();

  const states = {
    "meeting-timer": [
      "meeting-timer-v1",
      {
        agendas: [
          { name: "지난주 회고", min: 5 },
          { name: "이번 주 숫자 공유", min: 10 },
          { name: "안건 논의", min: 10 },
          { name: "다음 주 계획", min: 5 },
        ],
        cur: 2,
        running: true,
        startedAt: now - 42_000,
        elapsed: 0,
        results: [312_000, 603_000],
        status: "running",
        resetArmed: false,
      },
    ],
    "focus-timer": [
      "focus-timer-v1",
      {
        [dateOfWeek(0)]: { count: 3, min: 75 },
        [dateOfWeek(1)]: { count: 4, min: 100 },
        [dateOfWeek(2)]: { count: 2, min: 50 },
        [dateOfWeek(3)]: { count: 3, min: 75 },
        [today]: { count: 3, min: 75 },
      },
    ],
    "presentation-timer": [
      "presentation-timer-v1",
      {
        target: 10,
        slides: ["도입", "배경", "문제 정의", "해결안", "데이터", "기대 효과", "일정", "Q&A"],
        cur: 3,
        running: true,
        startedAt: now - 228_000,
        elapsed: 0,
        times: [48_200, 62_000, 101_400, 0],
        status: "running",
        history: [
          { times: [48_200, 62_000, 101_400, 80_100, 92_600, 49_000, 48_000, 38_000], total: 519_300 },
          { times: [44_000, 58_300, 88_700, 71_200, 84_000, 45_000, 44_000, 36_000], total: 471_200 },
        ],
      },
    ],
    "deadline-countdown": [
      "deadline-countdown-v1",
      [
        { name: "3분기 실적 보고 제출", date: plusDays(3), done: false },
        { name: "거래처 견적 회신", date: today, done: false },
        { name: "교육 신청 마감", date: yesterday, done: false },
        { name: "사무실 비품 발주", date: plusDays(7), done: false },
      ],
    ],
    "today-three": [
      "today-three-v1",
      {
        boards: {
          [today]: [
            { t: "기획서 2차 초안 보내기", done: true },
            { t: "디자인팀과 메인 배너 협의", done: true },
            { t: "고객 문의 3건 응대", done: false },
          ],
          [yesterday]: [
            { t: "주간 보고 취합", done: true },
            { t: "배너 시안 확정", done: true },
            { t: "고객 문의 3건 응대", done: false },
          ],
          [plusDays(-2)]: [
            { t: "기획서 초안", done: true },
            { t: "팀 회의 준비", done: true },
            { t: "자료 전달", done: true },
          ],
        },
      },
    ],
    "work-log": [
      "work-log-v1",
      {
        acts: ["메일", "회의", "보고서", "기획", "개발", "행정", "고객 응대", "교육", "이동", "잡일"],
        days: {
          [dateOfWeek(0)]: { 메일: 4_500_000, 회의: 4_800_000, 보고서: 3_000_000, 기획: 5_000_000 },
          [dateOfWeek(1)]: { 메일: 4_200_000, 회의: 2_532_000, 개발: 5_400_000, 기획: 4_100_000 },
          [dateOfWeek(2)]: { 메일: 3_900_000, 회의: 7_530_000, 보고서: 4_000_000, 개발: 4_800_000 },
          [dateOfWeek(3)]: { 메일: 4_500_000, 보고서: 2_100_000, 기획: 3_900_000 },
          [today]: { 메일: 4_350_000, 회의: 2_532_000, 보고서: 1_500_000, 기획: 1_200_000 },
        },
      },
    ],
    "routine-checklist-v1": null,
    "world-clock-v1": null,
    "break-reminder-cfg": ["break-reminder-cfg", { interval: 45, sound: true }],
    "meeting-minutes-v1": [
      "meeting-minutes-v1",
      [
        {
          title: "프로덕트 1팀 주간 회의",
          date: today,
          place: "3층 회의실 A",
          author: "김보고",
          attendees: "김보고, 이개발, 박디자인",
          agenda: "1분기 실적 리뷰: 매출 목표 대비 102% 달성\n온보딩 플로우 기획: 2차 초안 공유 완료",
          decisions: "온보딩 플로우는 10월 중 릴리즈를 목표로 한다",
          actions: "김보고: 10월 로드맵 공유 (10/7까지)\n박디자인: 온보딩 시안 1차 (10/8까지)",
          next: "다음 주 월요일 10시",
          prepare: "로드맵 시안 링크",
        },
      ],
    ],
    "email-composer-v1": ["email-composer-v1", []],
    "quote-calculator-v1": [
      "quote-calculator-v1",
      [
        { name: "기획·설계 용역", qty: 1, price: 3_000_000 },
        { name: "디자인 시안 제작", qty: 2, price: 500_000 },
        { name: "유지보수(월)", qty: 3, price: 200_000 },
      ],
    ],
    "schedule-poll-v1": [
      "schedule-poll-v1",
      {
        title: "10월 팀 회의",
        dates: [
          { date: plusDays(2), slots: ["10:00", "11:00", "14:00", "15:00"] },
          { date: plusDays(3), slots: ["10:00", "11:00", "14:00", "15:00"] },
        ],
        people: ["김보고", "이개발", "박디자인", "최성장"],
        votes: {},
      },
    ],
    "one-page-report": [
      "one-page-report-v1",
      {
        title: "10월 1주차 서비스 운영 보고",
        period: "10/1~10/7",
        owner: "김보고 · 프로덕트 1팀",
        status: "amber",
        progress: "72",
        goal: "온보딩 플로우를 확정하고 결제 안정성을 높입니다.",
        done: "- 온보딩 화면 1차 시안 확정\n- 결제 API 응답 속도 35% 개선",
        next: "- 사용성 테스트 5명 진행\n- 개발 핸드오프 및 일정 확정",
        risk: "디자인 리소스 부족으로 출시 일정이 2일 지연될 수 있습니다.",
        ask: "추가 디자이너 투입 여부를 금요일까지 결정해 주세요.",
      },
    ],
    "document-checklist": [
      "document-checklist-v1",
      {
        title: "3분기 실적 보고서 PDF",
        groups: [
          { name: "내용·형식", items: [{ text: "제목과 파일명이 내용을 정확히 설명한다", done: true }, { text: "본문의 날짜·금액·이름이 최신 정보다", done: true }, { text: "오탈자와 표·그림 번호를 다시 확인했다", done: false }, { text: "페이지 나눔과 인쇄 미리보기가 정상이다", done: false }] },
          { name: "받는 사람·첨부", items: [{ text: "받는 사람과 참조(CC)를 다시 확인했다", done: true }, { text: "첨부 파일을 실제로 열어 내용과 버전을 확인했다", done: false }, { text: "본문에 약속한 링크와 파일이 모두 포함돼 있다", done: false }] },
          { name: "개인정보·보안", items: [{ text: "숨김 시트·메모·수정 이력에 불필요한 정보가 없다", done: false }, { text: "개인정보·계좌번호·내부용 숫자를 확인했다", done: false }, { text: "공유 권한과 파일 비밀번호가 올바르다", done: false }] },
          { name: "마지막 확인", items: [{ text: "파일 형식(PDF·DOCX·XLSX)이 요청과 일치한다", done: false }, { text: "최종본 파일명과 저장 위치를 확인했다", done: false }, { text: "필요한 승인·검토를 받았다", done: false }] },
        ],
      },
    ],
    "character-counter-v1": [
      "character-counter-v1",
      { text: "이번 주는 신규 고객 온보딩을 개선하고, 결제 화면의 응답 속도를 높였습니다. 다음 주에는 사용성 테스트 결과를 반영해 출시 일정을 확정할 예정입니다.", limit: "500", custom: "" },
    ],
    "change-rate-v1": [
      "change-rate-v1",
      { label: "이번 달 매출", before: "12000000", after: "13800000", unit: "원" },
    ],
    "dinner-split-v1": [
      "dinner-split-v1",
      {
        tip: 10,
        people: [{ id: "p1", name: "김보고" }, { id: "p2", name: "이개발" }, { id: "p3", name: "박디자인" }, { id: "p4", name: "최성장" }],
        expenses: [{ id: "e1", name: "저녁 식사", amount: 180000, payer: "p1" }, { id: "e2", name: "2차 카페", amount: 48000, payer: "p2" }, { id: "e3", name: "택시", amount: 24000, payer: "p3" }],
      },
    ],
    "lunch-picker-v1": [
      "lunch-picker-v1",
      {
        menus: [{ name: "김치찌개", category: "한식" }, { name: "제육볶음", category: "한식" }, { name: "돈까스", category: "일식" }, { name: "쌀국수", category: "기타" }, { name: "비빔밥", category: "한식" }, { name: "초밥", category: "일식" }, { name: "마라탕", category: "중식" }, { name: "샐러드", category: "양식" }, { name: "칼국수", category: "한식" }, { name: "떡볶이", category: "분식" }],
        history: ["돈까스", "김치찌개", "쌀국수"],
        today: today,
      },
    ],
    "checklist-maker-v1": [
      "checklist-maker-v1",
      {
        title: "사무실 오픈 점검",
        groups: [
          { id: "g1", name: "업무 공간", items: [{ id: "t1", text: "출입문·보안 장치 확인", done: true }, { id: "t2", text: "회의실 화면·마이크 작동 확인", done: true }, { id: "t3", text: "환기·조명·냉난방 확인", done: false }] },
          { id: "g2", name: "업무 시작", items: [{ id: "t4", text: "공용 메일·공지 확인", done: true }, { id: "t5", text: "오늘 일정·당직 확인", done: false }, { id: "t6", text: "비품·프린터 용지 확인", done: false }] },
        ],
      },
    ],
  };

  // 반복 업무 표본은 상대 날짜를 기준으로 생성
  states["routine-checklist-v1"] = [
    "routine-checklist-v1",
    [
      { name: "사무실 소독·청소 점검", cycle: "weekly", when: 1, last: yesterday },
      { name: "주간 업무 보고 취합", cycle: "weekly", when: 5, last: null },
      { name: "비품 재고 확인", cycle: "weekly", when: 3, last: null },
      { name: "세금계산서 발행 준비", cycle: "monthly", when: 1, last: null },
      { name: "출근 체크·환기", cycle: "daily", when: 0, last: yesterday },
    ],
  ];
  states["world-clock-v1"] = [
    "world-clock-v1",
    [
      { name: "서울", tz: "Asia/Seoul", flag: "🇰🇷" },
      { name: "베를린", tz: "Europe/Berlin", flag: "🇩🇪" },
      { name: "런던", tz: "Europe/London", flag: "🇬🇧" },
      { name: "뉴욕", tz: "America/New_York", flag: "🇺🇸" },
    ],
  ];

  return states[slug] ?? null;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  try {
    const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
    for (const slug of SLUGS.filter((s) => !only || only.has(s))) {
      const context = await browser.newContext({
        viewport: { width: 878, height: 560 },
        deviceScaleFactor: 1,
        locale: "ko-KR",
        timezoneId: "Asia/Seoul",
        colorScheme: "light",
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      page.on("pageerror", (e) => errors.push(`${slug}: ${e.message}`));

      const seed = previewSeed(slug);
      if (seed) {
        await page.addInitScript(({ key, value }) => {
          try {
            localStorage.setItem(key, JSON.stringify(value));
          } catch {
            // 브라우저 보안 설정에 따른 localStorage 미지원 환경도 캡처를 중단하지 않아요.
          }
        }, { key: seed[0], value: seed[1] });
      }

      await page.goto(`${BASE_URL}/tools/${slug}.html`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      // 폼 기반 도구는 실제 예시를 입력해 결과 화면까지 미리 보여 줍니다.
      if (slug === "work-log") {
        await page.locator("#acts button").filter({ hasText: "회의" }).click();
      } else if (slug === "break-reminder") {
        await page.locator("#btnStart").click();
      } else if (slug === "meeting-minutes") {
        await page.locator("#mTitle").fill("프로덕트 1팀 주간 회의");
        await page.locator("#mDate").fill(localDate(new Date()));
        await page.locator("#mPlace").fill("3층 회의실 A · 화상");
        await page.locator("#mAuthor").fill("김보고");
        await page.locator("#mAttendees").fill("김보고, 이개발, 박디자인");
        await page.locator("#mAgenda").fill("1분기 실적 리뷰: 목표 대비 102%\n온보딩 플로우 기획: 2차 초안 공유 완료");
        await page.locator("#mDecisions").fill("온보딩 플로우는 10월 중 릴리즈를 목표로 한다");
        await page.locator("#mActions").fill("김보고: 로드맵 공유 (10/7까지)\n박디자인: 온보딩 시안 (10/8까지)");
        await page.locator("#mNext").fill("다음 주 월요일 10시");
        await page.locator("#btnPreview").click();
      } else if (slug === "email-composer") {
        await page.locator("#situation").selectOption("request");
        await page.locator("#target").selectOption("client");
        await page.locator("#tone").selectOption("polite");
        await page.locator("#length").selectOption("list");
        await page.locator("#name").fill("김민수 팀장님");
        await page.locator("#dateWhen").fill("10월 7일 오후 3시");
        await page.locator("#place").fill("3층 회의실 A · 화상 회의");
        await page.locator("#core").fill("3분기 실적 자료 검토 요청\n10월 7일까지 회신 부탁드립니다");
        await page.locator("#sign").fill("김보고 드림 · 프로덕트 1팀");
        await page.locator("#btnMake").click();
      } else if (slug === "one-page-report") {
        await page.locator("#pTitle").waitFor({ state: "visible" });
      } else if (slug === "document-checklist") {
        await page.locator("#docTitle").fill("3분기 실적 보고서 PDF");
      } else if (slug === "character-counter") {
        await page.locator("#text").waitFor({ state: "visible" });
      } else if (slug === "change-rate") {
        await page.locator("#label").waitFor({ state: "visible" });
      } else if (slug === "dinner-split") {
        await page.locator("#stats .stat").first().waitFor({ state: "visible" });
      } else if (slug === "lunch-picker") {
        await page.locator("#draw").click();
        await page.waitForTimeout(40);
      } else if (slug === "checklist-maker") {
        await page.locator("#groups .group").first().waitFor({ state: "visible" });
      }

      await page.waitForTimeout(160);
      const output = path.join(OUT, `${slug}.png`);
      await page.screenshot({ path: output, type: "png", animations: "disabled", caret: "hide" });
      console.log(`✓ ${slug}.png · 878×560`);
      await context.close();
    }
  } finally {
    await browser.close();
  }

  if (errors.length) {
    console.error("\n캡처 중 브라우저 오류:");
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
