const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

function loadPlaywright() {
  try { return require("playwright"); }
  catch {
    const executable = execFileSync("which", ["playwright"], { encoding: "utf8" }).trim();
    return require(path.dirname(fs.realpathSync(executable)));
  }
}
const { chromium } = loadPlaywright();
const base = process.env.PREVIEW_BASE_URL || process.env.SITE_URL || "http://127.0.0.1:3000";
const tests = [
  {
    slug: "one-page-report",
    run: async (page) => {
      await page.locator("#done").fill("- smoke test 성과 입력");
      if (!(await page.locator("#pDone").textContent()).includes("smoke test")) throw new Error("미리보기가 입력을 따라오지 않음");
      await page.reload();
      if (!(await page.locator("#pDone").textContent()).includes("smoke test")) throw new Error("브라우저 자동 저장 실패");
    },
  },
  {
    slug: "document-checklist",
    run: async (page) => {
      const first = page.locator("#groups input[type=checkbox]").first();
      await first.check();
      if (!(await page.locator("#count").textContent()).startsWith("1/")) throw new Error("체크 완료 개수 계산 실패");
      await page.locator("#newTask").fill("팀 전용 점검 추가");
      await page.locator("#addTask").click();
      if (!(await page.locator("#groups").textContent()).includes("팀 전용 점검 추가")) throw new Error("사용자 항목 추가 실패");
    },
  },
  {
    slug: "character-counter",
    run: async (page) => {
      await page.locator("#text").fill("안녕 world\n업무앱");
      if ((await page.locator("#withSpace").textContent()).trim() !== "12") throw new Error("공백 포함 글자 수 계산 실패");
      if ((await page.locator("#withoutSpace").textContent()).trim() !== "10") throw new Error("공백 제외 글자 수 계산 실패");
      if ((await page.locator("#bytes").textContent()).trim() !== "22") throw new Error("UTF-8 바이트 계산 실패");
    },
  },
  {
    slug: "change-rate",
    run: async (page) => {
      await page.locator("#before").fill("100");
      await page.locator("#after").fill("125");
      if (!(await page.locator("#rate").textContent()).includes("25.0%")) throw new Error("증감률 계산 실패");
      await page.locator("#before").fill("0");
      if (!(await page.locator("#zeroNote").isVisible())) throw new Error("기준값 0 안내 실패");
    },
  },
  {
    slug: "dinner-split",
    run: async (page) => {
      if (await page.locator("#people .person").count() !== 4) throw new Error("샘플 참여자 로드 실패");
      if (await page.locator("#transfers .transfer").count() < 1) throw new Error("송금 경로 계산 실패");
      await page.locator("#personName").fill("신입 팀원");
      await page.locator("#addPerson").click();
      if (await page.locator("#people .person").count() !== 5) throw new Error("참여자 추가 실패");
    },
  },
  {
    slug: "lunch-picker",
    run: async (page) => {
      await page.locator("#draw").click();
      await page.waitForTimeout(950);
      const result = (await page.locator("#dish").textContent()).trim();
      if (!result || result === "오늘 뭐 먹지?" || result.includes("없어요")) throw new Error("메뉴 추첨 실패");
      if (!(await page.locator("#history").textContent()).includes(result)) throw new Error("오늘 추첨 기록 실패");
    },
  },
  {
    slug: "checklist-maker",
    run: async (page) => {
      if (await page.locator("#groups .group").count() < 1) throw new Error("기본 점검 템플릿 로드 실패");
      await page.locator("#groups .task input[type=checkbox]").first().check();
      if (!(await page.locator("#progressText").textContent()).includes("완료")) throw new Error("진행률 계산 실패");
      await page.locator("#newTask").fill("회의실 마이크 확인");
      await page.locator("#addTask").click();
      if (!(await page.locator("#groups .task").count())) throw new Error("점검 항목 추가 실패");
      if (!(await page.locator("#groups .task .text").last().inputValue()).includes("회의실 마이크 확인")) throw new Error("추가한 항목 값이 화면에 반영되지 않음");
    },
  },
  /* ───────────── 업무효율 100 · 2단계(14개) ───────────── */
  {
    slug: "okr-builder",
    run: async (page) => {
      const eq = async (sel, want, msg) => { const got = (await page.locator(sel).first().innerText()).trim(); if (got !== want) throw new Error(`${msg}: 기대 ${want}, 실제 ${got}`); };
      await eq("#overall", "0.64", "예시 전체 점수");
      await page.locator('.kr input[data-f="kc"]').first().fill("70");
      await eq("#overall", "0.71", "현재값 70으로 바꾼 전체 점수");
      const krs = await page.locator(".kr").count();
      await page.locator('[data-act="addk"]').first().click();
      if ((await page.locator(".kr").count()) !== krs + 1) throw new Error("KR 추가 실패");
      await page.locator('select[data-f="mode"]').first().selectOption("manual");
      if ((await page.locator('input[type="range"]').count()) < 2) throw new Error("직접 채점 슬라이더가 안 보임");
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator(".kr").count()) !== krs + 1) throw new Error("새로고침 후 KR 개수가 유지되지 않음");
    },
  },
  {
    slug: "kpi-board",
    run: async (page) => {
      const v = async (id) => (await page.locator(id).innerText()).trim();
      if ((await v("#sOk")) !== "2" || (await v("#sWn")) !== "3" || (await v("#sBd")) !== "1") throw new Error(`신호등 개수: ${await v("#sOk")}/${await v("#sWn")}/${await v("#sBd")}`);
      if ((await v("#sAvg")) !== "90%") throw new Error("평균 달성률 " + (await v("#sAvg")));
      const first = page.locator(".kc").first();
      await first.locator('[data-act="edit"]').click();
      await first.locator('input[data-f="c"]').fill("160");
      if ((await v("#sOk")) !== "3" || (await v("#sWn")) !== "2") throw new Error("현재값을 올려도 신호등이 바뀌지 않음");
      await first.locator('select[data-f="dir"]').selectOption("down");
      if (!(await first.locator(".vw").innerText()).includes("낮을수록")) throw new Error("방향 변경이 카드에 반영되지 않음");
      await page.locator("#gy").fill("90"); await page.locator("#gy").dispatchEvent("change");
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator("#gy").inputValue()) !== "90") throw new Error("달성 기준이 저장되지 않음");
    },
  },
  {
    slug: "daily-sales",
    run: async (page) => {
      for (const id of ["f_cash", "f_app", "f_etc"]) await page.locator("#" + id).fill("");
      await page.locator("#f_card").fill("1000000");
      await page.locator("#f_guests").fill("50");
      await page.locator("#f_food").fill("300000");
      await page.locator("#f_labor").fill("100000");
      await page.locator("#f_cost").fill("");
      const v = async (id) => (await page.locator(id).innerText()).trim();
      const want = { "#sTotal": "1,000,000원", "#sPer": "20,000원", "#sCost": "400,000원", "#sNet": "600,000원", "#sMargin": "60.0%" };
      for (const [k, w] of Object.entries(want)) if ((await v(k)) !== w) throw new Error(`${k}: 기대 ${w}, 실제 ${await v(k)}`);
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator("#f_card").inputValue()) !== "1000000") throw new Error("새로고침 후 입력값이 사라짐");
      const d0 = await page.locator("#date").inputValue();
      await page.locator("#prev").click();
      if ((await page.locator("#date").inputValue()) === d0) throw new Error("전날 이동 실패");
      if ((await page.locator("#f_card").inputValue()) === "1000000") throw new Error("전날 기록이 오늘 값으로 보임");
      await page.locator("#goal").fill("1000000");
      if (!(await v("#gPct")).includes("%")) throw new Error("목표 달성률 표시 없음");
    },
  },
  {
    slug: "break-even",
    run: async (page) => {
      await page.locator("#price").fill("10000"); await page.locator("#vr").fill("40"); await page.locator("#fee").fill("0"); await page.locator("#days").fill("25");
      const v = async (id) => (await page.locator(id).innerText()).trim();
      const want = { "#rUnits": "1,267개", "#rSales": "12,670,000원", "#rDay": "51개", "#rCm": "6,000원" };
      for (const [k, w] of Object.entries(want)) if ((await v(k)) !== w) throw new Error(`${k}: 기대 ${w}, 실제 ${await v(k)}`);
      await page.locator("#vm").selectOption("amt"); await page.locator("#va").fill("4000");
      if ((await v("#rUnits")) !== "1,267개") throw new Error("개당 원가 방식 결과가 다름");
      await page.locator('[data-act="del"]').first().click();
      if ((await v("#fxSum")) !== "4,600,000원" || (await v("#rUnits")) !== "767개") throw new Error("고정비 삭제 후 재계산 실패");
      await page.locator("#vm").selectOption("rate"); await page.locator("#vr").fill("100");
      if (await page.locator("#warn").isHidden()) throw new Error("이익이 안 남는 경우 경고가 없음");
      if ((await v("#rUnits")) !== "-") throw new Error("불가능한 경우에도 숫자가 표시됨");
      if ((await page.locator("#chart").innerHTML()).length < 20) throw new Error("그래프 안내가 비어 있음");
    },
  },
  {
    slug: "clinic-hygiene",
    run: async (page) => {
      const prog = async () => (await page.locator("#progText").innerText()).trim();
      if (!(await prog()).startsWith("5 / 9")) throw new Error("예시 진행률 " + (await prog()));
      await page.locator('.it:not(.done) input[data-act="chk"]').first().click();
      if (!(await prog()).startsWith("6 / 9")) throw new Error("체크 후 진행률 " + (await prog()));
      await page.locator('.it.done [data-act="flag"]').first().click();
      if ((await page.locator('input[data-act="note"]').count()) < 1) throw new Error("조치 필요 메모 칸이 안 보임");
      await page.locator("#tAm").fill("9.5");
      if (!(await page.locator("#tState").innerText()).includes("벗어남")) throw new Error("온도 이탈 경고 없음");
      await page.locator("#tAm").fill("4"); await page.locator("#tPm").fill("5");
      if (!(await page.locator("#tState").innerText()).includes("기준 이내")) throw new Error("정상 온도 표시 없음");
      await page.locator("#sign").click();
      if (!(await page.locator("#signBox").innerText()).includes("점검 마감")) throw new Error("마감 표시 없음");
      await page.locator("#newT").fill("테스트 소독 항목"); await page.locator("#addItem").click();
      if (!(await prog()).includes("/ 10")) throw new Error("항목 추가 후 총 개수 " + (await prog()));
      await page.reload({ waitUntil: "networkidle" });
      if (!(await prog()).startsWith("6 / 10")) throw new Error("새로고침 후 진행률 " + (await prog()));
    },
  },
  {
    slug: "no-show-tracker",
    run: async (page) => {
      const total = async () => Number((await page.locator("#sTotal").innerText()).trim());
      const before = await total();
      if (before < 10) throw new Error("예시 데이터가 너무 적음: " + before);
      await page.locator("#nCode").fill("T-1"); await page.locator("#nSt").selectOption("noshow"); await page.locator("#nRem").uncheck();
      await page.locator("#addRec").click();
      if ((await total()) !== before + 1) throw new Error("기록 추가 후 건수 변화 없음");
      if ((await page.locator('#rows tr:has-text("T-1")').count()) !== 1) throw new Error("추가한 기록이 표에 보이지 않음");
      await page.locator("#fStatus").selectOption("noshow");
      const sel = await page.locator('#rows select[data-act="st"]').evaluateAll((els) => els.map((e) => e.value));
      if (!sel.length || sel.some((x) => x !== "noshow")) throw new Error("결과 필터가 동작하지 않음");
      await page.locator("#fPeriod").selectOption("all");
      if ((await total()) < before + 1) throw new Error("전체 기간 건수가 더 적음");
      await page.locator('#rows tr:has-text("T-1") [data-act="del"]').click();
      await page.locator("#fPeriod").selectOption("month");
      if ((await total()) !== before) throw new Error("삭제 후 건수가 원래대로 돌아오지 않음");
      if (!(await page.locator("#remMsg").innerText()).length) throw new Error("알림 효과 문장이 비어 있음");
    },
  },
  {
    slug: "group-maker",
    run: async (page) => {
      const groups = async () => page.locator("#out .g").evaluateAll((gs) => gs.map((g) => [...g.querySelectorAll(".m")].map((m) => ({ n: m.querySelector("span").textContent, t: (m.querySelector("small") || {}).textContent || "" }))));
      let gs = await groups();
      if (gs.length !== 3) throw new Error("기본 모둠 수 " + gs.length);
      const names = gs.flat().map((x) => x.n);
      if (names.length !== 12 || new Set(names).size !== 12) throw new Error("모든 사람이 한 번씩 들어가지 않음");
      if (Math.max(...gs.map((g) => g.length)) - Math.min(...gs.map((g) => g.length)) > 1) throw new Error("모둠 인원 차이가 1명을 넘음");
      for (const tag of ["1반", "2반", "3반"]) { const c = gs.map((g) => g.filter((x) => x.t === tag).length); if (Math.max(...c) - Math.min(...c) > 1) throw new Error(`${tag}가 골고루 섞이지 않음: ${c}`); }
      await page.locator("#mode").selectOption("size"); await page.locator("#num").fill("5"); await page.locator("#run").click();
      gs = await groups();
      if (gs.length !== 3 || gs.flat().length !== 12) throw new Error("모둠당 5명 기준 결과가 이상함: " + gs.map((g) => g.length));
      await page.locator("#names").fill("가\n나\n다\n라\n마\n바\n사\n아"); await page.locator("#mode").selectOption("groups"); await page.locator("#num").fill("4");
      await page.locator("#avoid").check(); await page.locator("#run").click();
      await page.locator("#keep").click();
      await page.locator("#run").click();
      if (!(await page.locator("#info").innerText()).includes("겹친 짝 0쌍")) throw new Error("지난 짝을 피하지 못함: " + (await page.locator("#info").innerText()));
      await page.locator("#names").fill("한 명"); await page.locator("#num").fill("5"); await page.locator("#run").click();
      if ((await groups()).length !== 1) throw new Error("인원보다 모둠 수가 많을 때 처리 실패");
    },
  },
  {
    slug: "exam-planner",
    run: async (page) => {
      const v = async (id) => (await page.locator(id).innerText()).trim();
      if ((await page.locator("#plan .today").count()) !== 3) throw new Error("오늘 할 일 개수 " + (await page.locator("#plan .today").count()));
      if (!(await v("#sNext")).includes("수학 D-12")) throw new Error("가장 가까운 시험 " + (await v("#sNext")));
      if ((await v("#sProg")) !== "33%") throw new Error("시작 진행률 " + (await v("#sProg")));
      if ((await v("#sStreak")) !== "3일") throw new Error("연속 공부 " + (await v("#sStreak")));
      await page.locator('#plan input[data-act="pick"]').first().click();
      if ((await v("#sProg")) !== "38%") throw new Error("체크 후 진행률 " + (await v("#sProg")));
      await page.locator("#min").fill("0");
      if ((await v("#sStreak")) !== "2일") throw new Error("오늘 기록을 지운 뒤 연속 일수 " + (await v("#sStreak")));
      await page.locator("#nName").fill("과학"); await page.locator("#nUnits").fill("5"); await page.locator("#addSub").click();
      if ((await page.locator(".sj").count()) !== 4) throw new Error("과목 추가 실패");
      const before = await page.locator(".u.d").count();
      await page.locator('.sj >> nth=0 >> [data-act="tog"]').first().click();
      if ((await page.locator(".u.d").count()) === before) throw new Error("단원 칩 토글 실패");
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator(".sj").count()) !== 4) throw new Error("새로고침 후 과목이 사라짐");
    },
  },
  {
    slug: "sales-pipeline",
    run: async (page) => {
      // 화면이 낮으면 Playwright가 드래그 도중 스크롤해 다른 카드를 잡는 일이 있어, 스크롤이 필요 없게 크게 연다
      await page.setViewportSize({ width: 1280, height: 1600 });
      const v = async (id) => (await page.locator(id).innerText()).trim();
      const want = { "#sOpen": "6건", "#sAmt": "7,830만원", "#sFc": "3,193만원", "#sWon": "800만원", "#sRate": "50%", "#sDue": "2건" };
      for (const [k, w] of Object.entries(want)) if ((await v(k)) !== w) throw new Error(`${k}: 기대 ${w}, 실제 ${await v(k)}`);
      await page.locator('.deal[data-id="d3"] [data-act="fwd"]').click();
      if ((await v("#sFc")) !== "3,268만원") throw new Error("단계를 옮겨도 가중 예상 매출이 안 바뀜: " + (await v("#sFc")));
      await page.locator('.deal[data-id="d4"] [data-act="edit"]').click();
      if (!(await page.locator("#formTitle").innerText()).includes("수정")) throw new Error("수정 모드로 바뀌지 않음");
      await page.locator("#dAmt").fill("1000"); await page.locator("#save").click();
      if ((await v("#sAmt")) !== "8,650만원") throw new Error("수정한 금액이 합계에 반영되지 않음: " + (await v("#sAmt")));
      await page.locator("#dCo").fill("임시 입력"); await page.locator('.deal[data-id="d8"] [data-act="back"]').click();
      if ((await page.locator("#dCo").inputValue()) !== "임시 입력") throw new Error("카드를 옮기면 입력 중인 폼이 지워짐");
      await page.locator("#dCo").fill("");
      await page.locator('.deal[data-id="d4"]').dragTo(page.locator('.col[data-st="4"]'), { sourcePosition: { x: 14, y: 10 } });
      if ((await v("#sWon")) !== "1,800만원") throw new Error("드래그로 성사 단계로 옮기지 못함: " + (await v("#sWon")));
      await page.locator('.deal[data-id="d7"] [data-act="del"]').click();
      if ((await v("#sRate")) !== "100%") throw new Error("실패 거래 삭제 후 성사율 " + (await v("#sRate")));
      await page.reload({ waitUntil: "networkidle" });
      if ((await v("#sWon")) !== "1,800만원") throw new Error("새로고침 후 상태가 유지되지 않음");
    },
  },
  {
    slug: "client-log",
    run: async (page) => {
      const v = async (id) => (await page.locator(id).innerText()).trim();
      if ((await v("#sAll")) !== "6" || (await v("#sToday")) !== "1" || (await v("#sLate")) !== "2" || (await v("#sWeek")) !== "2") throw new Error(`요약: ${await v("#sAll")}/${await v("#sToday")}/${await v("#sLate")}/${await v("#sWeek")}`);
      if (!(await page.locator("#list .ci").first().innerText()).includes("모아푸드")) throw new Error("가장 늦어진 거래처가 맨 위에 있지 않음");
      if (!(await page.locator("#list .ci").last().innerText()).includes("휴면")) throw new Error("휴면 거래처가 맨 아래에 있지 않음");
      await page.locator('#list .ci:has-text("한빛솔루션")').click();
      if ((await page.locator("#detail .log").count()) !== 2) throw new Error("연락 기록 개수");
      await page.locator("#lS").fill("테스트 통화"); await page.locator("#lFu").fill("2030-01-01"); await page.locator('[data-act="addlog"]').click();
      if ((await page.locator("#detail .log").count()) !== 3) throw new Error("기록 추가 실패");
      if ((await page.locator("#cFu").inputValue()) !== "2030-01-01") throw new Error("다음 연락일이 갱신되지 않음");
      await page.locator("#q").fill("다온");
      if ((await page.locator("#list .ci").count()) !== 1) throw new Error("검색 결과 개수");
      await page.locator("#q").fill(""); await page.locator("#newN").fill("신규 거래처"); await page.locator("#addC").click();
      if ((await v("#sAll")) !== "7" || (await page.locator("#cN").inputValue()) !== "신규 거래처") throw new Error("거래처 추가 후 선택 상태");
      await page.reload({ waitUntil: "networkidle" });
      if ((await v("#sAll")) !== "7") throw new Error("새로고침 후 거래처 수");
    },
  },
  {
    slug: "format-cleaner",
    run: async (page) => {
      const col = async () => page.locator("#rows tr").evaluateAll((trs) => trs.map((t) => (t.children[2] ? t.children[2].textContent.trim() : "")));
      const same = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}\n    기대 ${JSON.stringify(b)}\n    실제 ${JSON.stringify(a)}`); };
      await page.locator("#src").fill("01012345678\n010 1234 5678\n+82 10-1234-5678\n02)123-4567\n1588-1234\n1012345678\n010-12\n문의");
      same(await col(), ["010-1234-5678", "010-1234-5678", "010-1234-5678", "02-123-4567", "1588-1234", "010-1234-5678", "—", "—"], "전화번호 변환");
      const v = async (id) => (await page.locator(id).innerText()).trim();
      if ((await v("#cOk")) !== "정상 1" || (await v("#cFix")) !== "변환 5" || (await v("#cBad")) !== "확인 필요 2") throw new Error(`개수: ${await v("#cOk")}/${await v("#cFix")}/${await v("#cBad")}`);
      await page.locator("#sep").selectOption("."); if ((await col())[0] !== "010.1234.5678") throw new Error("구분 기호 변경 실패");
      await page.locator("#onlyBad").check(); if ((await page.locator("#rows tr").count()) !== 2) throw new Error("확인 필요만 보기 실패");
      await page.locator("#onlyBad").uncheck();
      await page.locator("#mode").selectOption("date");
      await page.locator("#src").fill("2026.1.5\n20260108\n260109\n2026년 1월 12일\n1/13/2026\n13/01/2026\n05/01/2026\n2026-02-31\n내일");
      same(await col(), ["2026-01-05", "2026-01-08", "2026-01-09", "2026-01-12", "2026-01-13", "2026-01-13", "2026-05-01", "—", "—"], "날짜 변환(월/일/연)");
      await page.locator("#ord").selectOption("dmy"); if ((await col())[6] !== "2026-01-05") throw new Error("일/월/연 기준 변경 실패");
      await page.locator("#fmt").selectOption("ko"); if ((await col())[0] !== "2026년 1월 5일") throw new Error("한글 날짜 형식 실패");
      await page.locator("#mode").selectOption("phone");
      if (!(await page.locator("#src").inputValue()).includes("2026.1.5")) throw new Error("모드를 바꿀 때 직접 입력한 내용이 지워짐");
    },
  },
  {
    slug: "group-sum",
    run: async (page) => {
      const rows = async () => page.locator("#tbody tr").evaluateAll((trs) => trs.map((t) => [...t.children].map((c) => c.textContent.trim()).slice(0, 2)));
      const same = (a, b, msg) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${msg}\n    기대 ${JSON.stringify(b)}\n    실제 ${JSON.stringify(a)}`); };
      same(await rows(), [["마케팅팀", "2,550,000"], ["개발팀", "1,694,000"], ["영업팀", "704,000"], ["총무팀", "284,000"], ["전체 합계", "5,232,000"]], "부서별 합계");
      await page.locator("#agg").selectOption("count");
      same((await rows()).map((r) => r[1]), ["3", "3", "3", "3", "12"], "건수");
      await page.locator("#agg").selectOption("avg");
      if ((await rows())[0][1] !== "850,000") throw new Error("평균 첫 줄 " + (await rows())[0][1]);
      await page.locator("#agg").selectOption("sum");
      await page.locator("#src").fill('품목,금액\n"사과, 대","1,000원"\n배,2000\n사과,500');
      same(await rows(), [["배", "2,000"], ["사과, 대", "1,000"], ["사과", "500"], ["전체 합계", "3,500"]], "따옴표·쉼표·원 기호 처리");
      await page.locator("#file").setInputFiles({ name: "a.csv", mimeType: "text/csv", buffer: Buffer.from("부서,금액\nA,10\nB,20\nA,5") });
      await page.waitForFunction(() => document.querySelector("#src").value.includes("부서,금액"));
      same(await rows(), [["B", "20"], ["A", "15"], ["전체 합계", "35"]], "CSV 파일 열기");
      await page.locator("#src").fill("테스트 입력");
      if ((await page.locator("#thead").innerHTML()).length > 0 && (await page.locator("#tbody").innerText()).trim().length === 0) throw new Error("숫자 열이 없을 때 안내가 비어 있음");
    },
  },
  {
    slug: "open-check-photo",
    run: async (page) => {
      const sharp = require("sharp");
      const png = await sharp({ create: { width: 40, height: 30, channels: 3, background: "#d33" } }).png().toBuffer();
      const prog = async () => (await page.locator("#progText").innerText()).trim();
      if (!(await prog()).startsWith("4 / 8")) throw new Error("예시 진행률 " + (await prog()));
      if (!(await page.locator('.it[data-id="i5"] input[data-act="chk"]').isDisabled())) throw new Error("사진이 없는 필수 항목의 체크가 잠기지 않음");
      if (!(await page.locator("#closeBtn").isDisabled())) throw new Error("미완료인데 오픈 완료 버튼이 켜져 있음");
      await page.locator('.it[data-id="i5"] input[type="file"]').setInputFiles({ name: "shot.png", mimeType: "image/png", buffer: png });
      await page.waitForSelector('.it[data-id="i5"] .thumb img');
      if (!(await prog()).startsWith("5 / 8")) throw new Error("사진 저장 후 자동 체크 안 됨: " + (await prog()));
      const stored = await page.evaluate(() => (JSON.parse(localStorage.getItem("open-check-photos-v1") || "{}")));
      const keys = Object.keys(stored).filter((k) => k.endsWith("|i5"));
      if (keys.length !== 1 || !stored[keys[0]].startsWith("data:image/jpeg")) throw new Error("사진이 줄여진 JPEG로 저장되지 않음");
      await page.locator('.it[data-id="i6"] input[data-act="chk"]').click();
      await page.locator('.it[data-id="i7"] input[data-act="chk"]').click();
      await page.locator('.it[data-id="i8"] input[type="file"]').setInputFiles({ name: "shot2.png", mimeType: "image/png", buffer: png });
      await page.waitForFunction(() => !document.querySelector("#closeBtn").disabled);
      await page.locator("#closeBtn").click();
      if (!(await page.locator("#closeBox").innerText()).includes("오픈 완료")) throw new Error("오픈 완료 표시 없음");
      await page.reload({ waitUntil: "networkidle" });
      if (!(await page.locator("#closeBox").innerText()).includes("오픈 완료") || (await page.locator(".thumb img").count()) < 4) throw new Error("새로고침 후 기록·사진이 사라짐");
      await page.locator("#closeBtn").click();
      await page.locator('.it[data-id="i5"] [data-act="delph"]').click();
      if (!(await page.locator('.it[data-id="i5"] input[data-act="chk"]').isDisabled())) throw new Error("사진을 지웠는데 체크가 다시 잠기지 않음");
      await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("open-check-photos-v1")); p["2020-01-01|i3"] = "data:image/jpeg;base64,AAAA"; localStorage.setItem("open-check-photos-v1", JSON.stringify(p)); });
      await page.reload({ waitUntil: "networkidle" });
      const after = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("open-check-photos-v1") || "{}")));
      if (after.some((k) => k.startsWith("2020-01-01"))) throw new Error("오래된 사진이 자동으로 지워지지 않음");
    },
  },
  {
    slug: "staff-points",
    run: async (page) => {
      await page.locator("details summary").click();
      await page.locator("#sN").fill("테스트직원"); await page.locator("#addStaff").click();
      const rowOf = () => page.locator('.rk:has-text("테스트직원")');
      const pts = async () => Number((await rowOf().locator(".pt").innerText()).replace(/[^\d-]/g, ""));
      const msg = async () => (await page.locator("#msg").innerText()).trim();
      await page.locator("#who").selectOption({ label: "테스트직원" });
      const opt = async (text) => page.locator("#rule option", { hasText: text }).first().getAttribute("value");
      await page.locator("#rule").selectOption(await opt("고객 칭찬"));
      await page.locator("#award").click();
      if ((await pts()) !== 20) throw new Error("고객 칭찬 +20 적립 실패: " + (await pts()));
      if ((await page.locator("#who").evaluate((e) => e.selectedOptions[0].textContent)) !== "테스트직원") throw new Error("포인트를 준 뒤 직원 선택이 바뀜");
      if (!(await page.locator("#rule").evaluate((e) => e.selectedOptions[0].textContent)).includes("고객 칭찬")) throw new Error("포인트를 준 뒤 항목 선택이 바뀜");
      await page.locator("#rule").selectOption(await opt("오픈 체크 사진 인증"));
      if (await page.locator("#okWrap").isHidden()) throw new Error("확인 필요 항목인데 확인 체크가 안 보임");
      await page.locator("#award").click();
      if (!(await msg()).includes("확인") || (await pts()) !== 20) throw new Error("확인 없이 적립됨: " + (await msg()));
      await page.locator("#okChk").check(); await page.locator("#award").click();
      if ((await pts()) !== 30) throw new Error("확인 후 +10 적립 실패: " + (await pts()));
      await page.locator("#rule").selectOption(await opt("청소 구역 비포"));
      await page.locator("#okChk").check(); await page.locator("#award").click();
      if ((await pts()) !== 45) throw new Error("+15 적립 실패: " + (await pts()));
      await page.locator("#okChk").check(); await page.locator("#award").click();
      if (!(await msg()).includes("상한") || (await pts()) !== 45) throw new Error("하루 적립 상한이 동작하지 않음: " + (await msg()) + " / " + (await pts()));
      await page.locator("#rule").selectOption(await opt("지각")); await page.locator("#award").click();
      if ((await pts()) !== 35) throw new Error("차감 −10 실패: " + (await pts()));
      await page.locator('#logs .log:has-text("테스트직원") [data-act="undo"]').first().click();
      if ((await pts()) !== 45) throw new Error("기록 취소 실패: " + (await pts()));
      await page.locator("#hide").check();
      if ((await page.locator(".rn").first().innerText()).trim() !== "·") throw new Error("순위 숨기기에서 순위 번호가 보임");
      if ((await page.locator("#mvp").innerHTML()).trim() !== "") throw new Error("순위 숨기기인데 MVP가 보임");
      await page.locator("#hide").uncheck();
      if (!(await page.locator("#mvp").innerText()).includes("MVP")) throw new Error("MVP 표시 없음");
      const label = (await page.locator("#mLabel").innerText()).trim();
      await page.locator("#mNext").click();
      if ((await page.locator("#mLabel").innerText()).trim() === label) throw new Error("다음 달 이동 실패");
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("#mPrev").click();
      if ((await pts()) !== 45) throw new Error("새로고침 후 포인트가 유지되지 않음");
    },
  },

  {
    slug: "kpi-checkin",
    run: async (page) => {
      const first = page.locator("#rows tr").first();
      const rateBefore = (await first.locator("td").nth(5).innerText()).trim();
      await first.locator("input").nth(4).fill("1000");
      const rateAfter = (await first.locator("td").nth(5).innerText()).trim();
      if (rateBefore === rateAfter) throw new Error("이번주 값 변경이 달성률에 반영되지 않음");
      await first.locator(".comment").fill("테스트 코멘트 저장");
      await page.reload({ waitUntil: "networkidle" });
      const saved = await page.locator("#rows tr").first().locator(".comment").inputValue();
      if (!saved.includes("테스트 코멘트")) throw new Error("코멘트 자동 저장 실패");
      await page.locator("#addRow").click();
      if ((await page.locator("#rows tr").count()) < 2) throw new Error("지표 추가 실패");
    },
  },
  {
    slug: "quarter-review",
    run: async (page) => {
      const total = (await page.locator("#totalScore").innerText()).trim();
      if (!/^\d+$/.test(total)) throw new Error("가중 총점이 숫자가 아님: " + total);
      const first = page.locator(".item").first();
      const goal = await first.locator("input").nth(1).inputValue();
      await first.locator("input").nth(2).fill(goal);
      const score = (await first.locator(".sc").innerText()).trim();
      if (score !== "100") throw new Error("실적=목표일 때 100점이 아님: " + score);
      await first.locator(".lower").click();
      const cls = (await first.locator(".lower").getAttribute("class")) || "";
      if (!cls.includes("on")) throw new Error("낮을수록 좋은 지표 토글 실패");
      await page.locator("#addItem").click();
      if ((await page.locator(".item").count()) < 6) throw new Error("목표 추가 실패");
    },
  },
  {
    slug: "net-sales",
    run: async (page) => {
      await page.locator("#cardAmt").fill("1000000");
      await page.locator("#cardRate").fill("1.5");
      const fee = (await page.locator("#feeOut").innerText()).trim();
      if (!fee.includes("15,000")) throw new Error("카드 수수료 계산 오류: " + fee);
      await page.locator("#discount").fill("100000");
      const net = (await page.locator("#netOut").innerText()).trim();
      if (!net.includes("885,000")) throw new Error("순매출 계산 오류: " + net);
      if ((await page.locator("#detail tr").count()) !== 4) throw new Error("경로별 표 행 수 오류");
    },
  },
  {
    slug: "stock-days",
    run: async (page) => {
      const rowsBefore = await page.locator("#rows tr").count();
      if (rowsBefore < 3) throw new Error("예시 품목이 안 들어감");
      const left = (await page.locator("#rows tr").first().locator("td").nth(5).innerText()).trim();
      if (!/\d+일/.test(left)) throw new Error("남은 일수가 계산되지 않음: " + left);
      await page.locator("#addRow").click();
      if ((await page.locator("#rows tr").count()) !== rowsBefore + 1) throw new Error("품목 추가 실패");
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator("#rows tr").count()) !== rowsBefore + 1) throw new Error("자동 저장 실패");
    },
  },
  {
    slug: "business-days",
    run: async (page) => {
      const bigBefore = (await page.locator("#resBig").innerText()).trim();
      await page.locator("#addDays").fill("30");
      const bigAfter = (await page.locator("#resBig").innerText()).trim();
      if (bigBefore === bigAfter) throw new Error("업무일 수 변경이 결과에 반영되지 않음");
      const work = (await page.locator("#resWork").innerText()).trim();
      if (work !== "30일") throw new Error("업무일 수가 30일이 아님: " + work);
      const hol = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await page.locator("#holDate").fill(hol);
      await page.locator("#addHol").click();
      if (!/\d{4}-\d{2}-\d{2}/.test(await page.locator("#hols").innerText())) throw new Error("휴일 추가 실패");
      await page.locator('.tab[data-m="between"]').click();
      if (!(await page.locator("#pane-between").isVisible())) throw new Error("기간 모드 전환 실패");
    },
  },
  {
    slug: "daily-task-report",
    run: async (page) => {
      await page.locator("#rdone").fill("- 첫 번째 성과\n- 두 번째 성과");
      const pv = (await page.locator("#pvDone").innerText()).trim();
      if (!pv.includes("첫 번째 성과")) throw new Error("미리보기가 입력을 따라오지 않음");
      await page.locator("#saveBtn").click();
      const date = await page.locator("#rdate").inputValue();
      await page.locator("#nextDay").click();
      const date2 = await page.locator("#rdate").inputValue();
      if (date === date2) throw new Error("다음 날 이동 실패");
      await page.reload({ waitUntil: "networkidle" });
      await page.locator("#prevDay").click();
      const back = (await page.locator("#pvDone").innerText()).trim();
      if (!back.includes("첫 번째 성과")) throw new Error("날짜별 저장 복원 실패");
    },
  },
  {
    slug: "close-checklist",
    run: async (page) => {
      const fin = page.locator("#finishBtn");
      if (!(await fin.isDisabled())) throw new Error("체크 전인데 마감 완료가 열려 있음");
      await page.locator("#who").fill("테스터");
      const boxes = page.locator("#groups input[type=checkbox]");
      const n = await boxes.count();
      for (let i = 0; i < n; i++) await page.locator("#groups input[type=checkbox]").nth(i).check();
      if ((await page.locator("#pct").innerText()).trim() !== "100%") throw new Error("진행률이 100%가 아님");
      if (await fin.isDisabled()) throw new Error("모두 체크했는데 마감 완료가 잠겨 있음");
      if (!/\d{2}:\d{2}/.test(await page.locator(".task .tm").first().innerText())) throw new Error("완료 시각이 기록되지 않음");
      await fin.click();
      if (!(await page.locator("#doneBox").isVisible())) throw new Error("마감 완료 표시 없음");
      await page.reload({ waitUntil: "networkidle" });
      if (!(await page.locator("#hist").innerText()).includes("테스터")) throw new Error("마감 기록이 저장되지 않음");
    },
  },
  {
    slug: "cleaning-zones",
    run: async (page) => {
      const rows = await page.locator("#rows tr").count();
      if (rows < 3) throw new Error("예시 구역이 안 들어감");
      const firstRow = page.locator("#rows tr").first();
      const cell = firstRow.locator(".cell").nth(6);
      const before = (await cell.getAttribute("class")) || "";
      const rateBefore = (await firstRow.locator(".rate").innerText()).trim();
      await cell.click();
      const after = (await page.locator("#rows tr").first().locator(".cell").nth(6).getAttribute("class")) || "";
      if (before.includes(" on") === after.includes(" on")) throw new Error("칸을 눌러도 체크가 바뀌지 않음");
      if ((await page.locator("#rows tr").first().locator(".rate").innerText()).trim() === rateBefore) throw new Error("달성률이 갱신되지 않음");
      await page.locator("#addZone").click();
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator("#rows tr").count()) !== rows + 1) throw new Error("구역 추가가 저장되지 않음");
    },
  },
  {
    slug: "part-time-pay",
    run: async (page) => {
      await page.locator("#wage").fill("10000");
      await page.locator('[data-p="weekday4"]').click();
      if ((await page.locator("#hoursOut").innerText()).trim() !== "20시간") throw new Error("주간 근무시간 계산 오류");
      if (!(await page.locator("#holidayOut").innerText()).includes("40,000")) throw new Error("주휴수당 계산 오류(20시간 → 40,000원이어야 함)");
      if (!(await page.locator("#weekGross").innerText()).includes("240,000")) throw new Error("주급 계산 오류(240,000원이어야 함)");
      for (let i = 0; i < 7; i++) await page.locator("#h" + i).fill(i < 2 ? "7" : "0");
      if (!(await page.locator("#holidayOut").innerText()).startsWith("0")) throw new Error("주 15시간 미만인데 주휴수당이 생김");
      await page.locator("#deduct").selectOption("3.3");
      await page.locator('[data-p="full"]').click();
      const net = (await page.locator("#monthNet").innerText()).replace(/[^0-9]/g, "");
      if (!(Number(net) > 0)) throw new Error("월 실수령액이 계산되지 않음");
    },
  },
  {
    slug: "before-after",
    run: async (page) => {
      const n = await page.locator("#list .rec").count();
      if (n !== 4) throw new Error("예시 기록 수가 4가 아님: " + n);
      if (!(await page.locator("#summary").innerText()).includes("사진 빠짐 1건")) throw new Error("사진 빠짐 집계 오류");
      await page.locator("#saveBtn").click();
      if (!(await page.locator("#msg").innerText()).includes("구역")) throw new Error("구역 없이 저장할 때 안내가 없음");
      const b64 = await page.evaluate(() => { const c = document.createElement("canvas"); c.width = 40; c.height = 30; const g = c.getContext("2d"); g.fillStyle = "#4f46e5"; g.fillRect(0, 0, 40, 30); return c.toDataURL("image/png").split(",")[1]; });
      await page.locator("#beforeFile").setInputFiles({ name: "before.png", mimeType: "image/png", buffer: Buffer.from(b64, "base64") });
      await page.locator("#beforeSlot img").waitFor({ timeout: 5000 });
      await page.locator("#area").fill("테스트 구역");
      await page.locator("#saveBtn").click();
      if ((await page.locator("#list .rec").count()) !== 5) throw new Error("사진 기록 저장 실패");
      await page.reload({ waitUntil: "networkidle" });
      if ((await page.locator("#list .rec").count()) !== 5) throw new Error("새로고침 후 기록이 사라짐");
      if (!(await page.locator("#list").innerText()).includes("테스트 구역")) throw new Error("저장한 구역 이름이 안 보임");
    },
  },
  {
    slug: "receipt-log",
    run: async (page) => {
      const rows = await page.locator("#rows tr").count();
      await page.locator("#fQty").fill("3");
      await page.locator("#fPrice").fill("1000");
      if ((await page.locator("#fAmount").inputValue()) !== "3,000원") throw new Error("금액 자동 계산 오류");
      await page.locator("#fItem").fill("테스트 자재");
      await page.locator("#addBtn").click();
      if ((await page.locator("#rows tr").count()) !== rows + 1) throw new Error("입고 기록 추가 실패");
      const pill = page.locator("#rows tr").filter({ hasText: "테스트 자재" }).locator(".pill");
      const t1 = (await pill.innerText()).trim();
      await pill.click();
      const t2 = (await page.locator("#rows tr").filter({ hasText: "테스트 자재" }).locator(".pill").innerText()).trim();
      if (t1 === t2) throw new Error("정산 상태 전환 실패");
      await page.reload({ waitUntil: "networkidle" });
      if (!(await page.locator("#rows").innerText()).includes("테스트 자재")) throw new Error("새로고침 후 기록이 사라짐");
    },
  },
  {
    slug: "emergency-card",
    run: async (page) => {
      if ((await page.locator(".tile").count()) !== 6) throw new Error("기본 상황 카드가 6개가 아님");
      await page.locator(".tile").nth(1).click();
      if (!(await page.locator("#big h2").innerText()).includes("정전")) throw new Error("상황 선택이 카드에 반영되지 않음");
      const steps = await page.locator(".step").count();
      await page.locator("#newStep").fill("테스트 행동");
      await page.locator("#addStep").click();
      if ((await page.locator(".step").count()) !== steps + 1) throw new Error("행동 추가 실패");
      if ((await page.locator('a.call[href="tel:119"]').count()) !== 1) throw new Error("119 전화 버튼 없음");
      await page.reload({ waitUntil: "networkidle" });
      if (!(await page.locator("#big h2").innerText()).includes("정전")) throw new Error("선택한 상황이 저장되지 않음");
      if ((await page.locator(".step").count()) !== steps + 1) throw new Error("추가한 행동이 저장되지 않음");
    },
  },
];
(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  try {
    const only = process.env.ONLY ? new Set(process.env.ONLY.split(",")) : null;
    for (const test of tests.filter((t) => !only || only.has(t.slug))) {
      const context = await browser.newContext({ locale: "ko-KR", timezoneId: "Asia/Seoul" });
      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      page.on("dialog", (dialog) => dialog.accept());
      try {
        await page.goto(`${base}/tools/${test.slug}.html`, { waitUntil: "networkidle" });
        await test.run(page);
        if (pageErrors.length) throw new Error(pageErrors.join(" | "));
        console.log(`✓ ${test.slug}`);
      } catch (error) {
        failures.push({ slug: test.slug, error: error.message });
        console.log(`✗ ${test.slug}: ${error.message}`);
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  if (failures.length) process.exitCode = 1;
  else console.log("\n선택한 도구의 브라우저 동작 테스트 모두 통과");
})();
