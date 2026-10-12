import type { Tool } from "../types";
import { CORE_TOOLS } from "./core";
import { GOALS_TOOLS } from "./goals";
import { STORE_TOOLS } from "./store";
import { CLINIC_TOOLS } from "./clinic";
import { EDU_TOOLS } from "./edu";
import { SALES_TOOLS } from "./sales";
import { SHEET_TOOLS } from "./sheet";
import { PARTTIME_TOOLS } from "./parttime";

/**
 * 바로 열어 쓸 수 있는 완성 도구 전체 (public/tools/<slug>.html 과 1:1).
 * 분야(팩)별 파일로 나눠 두었어요. 새 도구는 알맞은 파일에 추가하세요.
 */
export const TOOLS: Tool[] = [
  ...CORE_TOOLS,
  ...GOALS_TOOLS,
  ...STORE_TOOLS,
  ...CLINIC_TOOLS,
  ...EDU_TOOLS,
  ...SALES_TOOLS,
  ...SHEET_TOOLS,
  ...PARTTIME_TOOLS,
];
