const KST = "Asia/Seoul";

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: KST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 오늘 날짜를 YYYY-MM-DD 문자열로 (한국 시간 기준) */
export function today(): string {
  return dayFormatter.format(new Date());
}

/** Date 또는 문자열을 YYYY-MM-DD로 */
export function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return dayFormatter.format(value);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateString(d);
}

export function diffDays(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00+09:00`).getTime();
  const b = new Date(`${to}T00:00:00+09:00`).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** 월요일 시작 주의 시작일 */
export function startOfWeek(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  const day = d.getUTCDay(); // 0=일 ... 6=토
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(dateStr, diff);
}

export function endOfWeek(dateStr: string): string {
  return addDays(startOfWeek(dateStr), 6);
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function weekdayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return WEEKDAYS[d.getUTCDay()];
}

/** "8월 3일 (월)" 형태 */
export function formatKoreanDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${weekdayLabel(dateStr)})`;
}

export function formatShortDate(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00+09:00`);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}

/** 마감까지 남은 일수 라벨: D-Day, D-3, 지남 */
export function dueLabel(dueDate: string, base: string = today()): string {
  const diff = diffDays(base, dueDate);
  if (diff < 0) return `${Math.abs(diff)}일 지남`;
  if (diff === 0) return "D-Day";
  return `D-${diff}`;
}

/** 이번 주(월~일) 날짜 7개 */
export function weekDays(dateStr: string): string[] {
  const start = startOfWeek(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** "8월 1주차" 형태의 주 라벨 */
export function weekLabel(dateStr: string): string {
  const start = startOfWeek(dateStr);
  const d = new Date(`${start}T00:00:00+09:00`);
  const weekOfMonth = Math.ceil((d.getUTCDate() + 6 - (d.getUTCDay() || 7) + 1) / 7);
  return `${d.getUTCMonth() + 1}월 ${weekOfMonth}주차`;
}
