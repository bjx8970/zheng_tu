/**
 * 部门施政行动配置类型（对应 src/config/dept-policies.json）
 *
 * 设计原则：
 *  - JSON 中不能存储函数，enhanceCondition 的 check 用 checkField/checkExpr + checkValue 代替
 *  - dept-detail.tsx 加载 JSON 后，在运行时将 checkField/checkExpr 还原为真正的函数
 *  - 调整行动数值只需编辑 dept-policies.json，不需要改业务代码
 */
import type { DeptKey } from '@/types/game';

/** 行动的效果字段（与 PlayerSave 字段对齐） */
interface PolicyEffect {
  cityGdp?: number;
  cityLivelihood?: number;
  cityEcology?: number;
  cityBusiness?: number;
  policeForce?: number;
  securityIndex?: number;
  moralValue?: number;
  meritPoints?: number;
  bossFavor?: number;
  /** 财政资金变化（万元，正=增收，负=支出） */
  fundBalance?: number;
  taxRevenue?: number;
}

/**
 * 强化条件（JSON 可序列化版本）
 *
 * 两种形式二选一：
 *  - 单字段：checkField + checkValue （例：securityIndex >= 60）
 *  - 表达式：checkExpr + checkValue  （例："cityGdp+cityBusiness" >= 120）
 */
type PolicyEnhanceConditionJSON =
  | {
      label: string;
      /** PlayerSave 中的单个字段名 */
      checkField: string;
      checkValue: number;
      /** 强化倍率，默认 1.5 */
      multiplier?: number;
      checkExpr?: never;
    }
  | {
      label: string;
      /**
       * 多字段加法表达式，使用 "+" 分隔 PlayerSave 字段名
       * 例："cityGdp+cityBusiness"
       */
      checkExpr: string;
      checkValue: number;
      multiplier?: number;
      checkField?: never;
    };

/** JSON 文件中单条施政行动的配置 */
export interface PolicyActionConfig {
  id: string;
  title: string;
  desc: string;
  /** 政绩消耗 */
  cost: number;
  /** 冷却天数（游戏内天） */
  cooldownDays: number;
  /** 对应 KPI 维度名称（显示在行动卡片上） */
  kpiDim?: string;
  effect: PolicyEffect;
  /** 行动标签（显示在行动卡片上） */
  tag?: string;
  enhanceCondition?: PolicyEnhanceConditionJSON;
}

/** dept-policies.json 顶层结构 */
interface DeptPoliciesConfig {
  DEPT_POLICIES: Record<DeptKey, PolicyActionConfig[]>;
}
