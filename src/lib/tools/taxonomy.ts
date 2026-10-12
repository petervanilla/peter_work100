export type Category = { id: string; name: string; tagline: string };

/** 업무 장면 = 12개 팩 (카탈로그 섹션 순서) */
export const CATEGORIES: Category[] = [
  { id: "시간·집중", name: "시간·집중", tagline: "내 하루와 집중 시간을 지킬 때" },
  { id: "회의·소통", name: "회의·소통", tagline: "여럿이 모이고 약속을 잡을 때" },
  { id: "보고·문서", name: "보고·문서", tagline: "일일·주간 보고와 글을 쓸 때" },
  { id: "숫자·정산", name: "숫자·정산", tagline: "돈과 숫자를 맞출 때" },
  { id: "엑셀·명단", name: "엑셀·명단", tagline: "엑셀 자료를 넣으면 결과가 나오는 도구" },
  { id: "리더·팀", name: "리더·팀", tagline: "팀을 이끌고 사람을 챙길 때" },
  { id: "목표·KPI", name: "목표·KPI", tagline: "목표를 세우고 성과를 잴 때" },
  { id: "자영업·매장", name: "자영업·매장", tagline: "가게 숫자와 운영을 챙길 때" },
  { id: "알바·무인매장", name: "알바·무인매장", tagline: "사장님이 없어도 매장이 돌아가게" },
  { id: "병원·의료", name: "병원·의료", tagline: "진료 현장의 점검과 안내" },
  { id: "학생·교육", name: "학생·교육", tagline: "수업·모임·학습에 쓸 때" },
  { id: "영업·고객", name: "영업·고객", tagline: "고객과 거래처를 상대할 때" },
];

export const ROLES = [
  "모든 직장인",
  "팀장",
  "기획",
  "교육 담당",
  "영업",
  "총무",
  "회계",
  "사장님(가게)",
  "알바·직원",
  "병원 직원",
  "학생",
];

export const SHAPES = ["타이머", "보드·목록", "계산기", "엑셀 연결", "표", "인쇄", "설문", "사진 기록"];
