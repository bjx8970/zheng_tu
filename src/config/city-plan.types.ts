/**
 * 城市规划项目配置类型（对应 src/config/city-plan.json）
 * 调整游戏数值只需编辑 city-plan.json，无需改业务代码。
 */
export interface PlanProjectConfig {
  /** 项目唯一ID，与 careerPathCooldowns 的 key 对应 */
  id: string;
  /** 显示名称 */
  title: string;
  /** emoji 图标 */
  icon: string;
  /** 分类标签（总规/产业/住房/交通/生态/智慧/文旅/战略） */
  category: '总规' | '产业' | '住房' | '交通' | '生态' | '智慧' | '文旅' | '战略';
  /** 简介描述 */
  desc: string;
  /** 冷却天数（游戏内天） */
  cooldownDays: number;
  /** 最低职级要求（rankLevel） */
  rankRequire: number;
  /** 财政消耗（万元，0 = 免费） */
  cost: number;
  /** 完成奖励 */
  rewards: {
    /** 政绩奖励 */
    merit: number;
    /** GDP 指数变化 */
    cityGdp?: number;
    /** 民生指数变化 */
    cityLivelihood?: number;
    /** 生态指数变化 */
    cityEcology?: number;
    /** 营商指数变化 */
    cityBusiness?: number;
    /** 舆情指数变化 */
    publicOpinion?: number;
    /** 行政线 KPI 积分变化 */
    lineKpi?: number;
    /** 上司好感变化 */
    bossFavor?: number;
  };
}

interface CityPlanConfig {
  PLAN_PROJECTS: PlanProjectConfig[];
}
