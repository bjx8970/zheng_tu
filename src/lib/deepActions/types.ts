/**
 * 城市治理深度玩法 — 公共类型定义
 */

export interface DeepActionOutcome {
  desc: string;
  merit: number;
  fundDelta?: number;
  bossFavor?: number;
  publicOpinion?: number;
  inspectionRisk?: number;
  lineKpi?: number;
  networkValue?: number;
  moralValue?: number;
}

/** 突发事件多选项处置方案 */
export interface DeepActionOption {
  key: string;
  label: string;
  desc: string;
  outcome: DeepActionOutcome;
  costMultiplier?: number;   // 费用倍率，默认1.0
}

export interface DeepAction<C extends string = string> {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  category: C;
  baseCost: number;         // 基础城市治理经费消耗（万）
  cooldownDays: number;
  successRate: number;
  successOutcome: DeepActionOutcome;
  failOutcome: DeepActionOutcome;
  once?: boolean;           // 每年仅限一次
  isEmergency?: boolean;    // 突发事件（展示多选项处置方案）
  options?: DeepActionOption[]; // 突发事件处置选项（有此字段时不走随机成败，直接选项决策）
}

export interface ActionResult {
  ok: boolean;
  desc: string;
  day: number;
}
