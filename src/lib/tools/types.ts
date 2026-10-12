export type ToolStatus = "ready" | "planned";

export type UseCase = {
  who: string;
  when: string;
  how: string;
};

export type Situation = {
  label: string;
  question: string;
  options: string[];
};

export type CandidateGroup = {
  group: string;
  items: Array<{ name: string; star?: boolean }>;
};

/** 바로 열어 쓸 수 있는 완성 도구 */
export type Tool = {
  slug: string;
  title: string;
  /** CATEGORIES의 id (12개 팩 중 하나) */
  category: string;
  summary: string;
  who: string[];
  shape: string[];
  status: ToolStatus;
  featured?: number;
  /** 상세 페이지 미리보기 높이(px) */
  height?: number;
  /** 사전에 추가된 순서(클수록 최근). 가장 큰 2개가 NEW 표시 대상입니다. */
  addedAt?: number;
  useCases: UseCase[];
  /** 우리 팀 방식으로 바꿔 보기 */
  changeTips: string[];
  /** 검토표 ② 내 상황 질문 */
  situations: Situation[];
  /** 기본으로 꼭 들어갈 것 */
  basics: string[];
  /** 검토표 후보 */
  candidates: CandidateGroup[];
  /** 검토표를 여는 전문가 역할 설명 */
  expert: string;
};

/** 이름과 대상만 정해 둔, 앞으로 만들 도구 */
export type PlannedTool = {
  title: string;
  category: string;
  who: string[];
  shape: string[];
  /** 1이면 다음 제작 대상 */
  wave?: 1;
};
