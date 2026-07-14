/**
 * KPI 考核评分引擎
 *
 * 五层级差异化考核体系，符合真实政治逻辑：
 *   乡镇(1-3)  → 维稳、上级任务、农村工作为主，经济权重低
 *   县级(4-6)  → 经济+民生+稳定+政治可靠
 *   市级(7-9)  → 综合经济+城市建设+区域协调+政治稳定
 *   省级(10-11)→ 宏观经济+生态文明+共同富裕+政治可靠
 *   国家级(12+)→ 政治表现+战略执行+全局稳定
 *
 * 每层级设置：
 *   - 各维度权重（和为1）
 *   - 晋升所需综合得分门槛
 *   - 晋升所需同级排名（百分位）
 *   - 一票否决项（触发即失去晋升资格）
 */

// ─── 类型定义 ────────────────────────────────────────────────────────────────

/** 单个考核维度 */
export interface KpiDimension {
  /** 维度唯一key */
  key: string;
  /** 显示名称 */
  label: string;
  /** 副标题/说明 */
  desc: string;
  /** 权重 0-1 */
  weight: number;
  /** 原始分 0-100 */
  rawScore: number;
  /** 加权得分 */
  weightedScore: number;
  /** 是否接近预警线 */
  warning: boolean;
  /** 是否触发一票否决 */
  vetoed: boolean;
}

/** 一票否决项 */
export interface VetoItem {
  label: string;
  desc: string;
  triggered: boolean;
  value: number;
  threshold: number;
}

/** KPI 评估结果 */
export interface KpiResult {
  /** 综合得分 0-100 */
  totalScore: number;
  /** 各维度列表 */
  dimensions: KpiDimension[];
  /** 一票否决项列表 */
  vetoItems: VetoItem[];
  /** 是否存在一票否决 */
  hasVeto: boolean;
  /** 晋升所需综合分数门槛 */
  scoreThreshold: number;
  /** 当前排名百分位（越高越好，70=前30%，annualRankPct） */
  rankPct: number;
  /** 晋升所需最低排名百分位 */
  rankThreshold: number;
  /** 综合得分是否达标 */
  scoreReady: boolean;
  /** 排名是否达标 */
  rankReady: boolean;
  /** 是否具备晋升资格（分数+排名+无否决+任期） */
  eligible: boolean;
  /** 差距描述：未达标的核心原因 */
  gaps: string[];
  /** 层级标签（用于 UI 标题） */
  tierLabel: string;
}

// ─── 辅助：将0-100原始值线性映射，支持反向（值越低越好） ──────────────────
function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// ─── 各层级考核定义 ──────────────────────────────────────────────────────────

interface TierConfig {
  label: string;
  /** 晋升所需综合分门槛 */
  scoreThreshold: number;
  /** 晋升所需 annualRankPct 最低值（越高代表排名越靠前） */
  rankThreshold: number;
  dims: {
    key: string;
    label: string;
    desc: string;
    weight: number;
    /** 从 save 字段计算 0-100 分值 */
    compute: (s: KpiSaveSnapshot) => number;
    /** 警告线（低于此值时标红） */
    warnLine: number;
  }[];
  vetoRules: {
    label: string;
    desc: string;
    /** 返回 true = 触发否决 */
    check: (s: KpiSaveSnapshot) => { triggered: boolean; value: number; threshold: number };
  }[];
}

/** 传入 KPI 引擎所需的存档字段快照 */
export interface KpiSaveSnapshot {
  rankLevel: number;
  moralValue: number;
  securityIndex: number;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  bossFavor: number;
  boss2Favor: number;
  boss3Favor: number;
  annualRankPct: number;
  taxRevenue: number;
  tenureYears: number;
  meritPoints: number;
  /** 婚姻状态：'married'=已婚，其他=未婚 */
  marriageStatus?: string;
  /** 仕途路线：'discipline'=纪检政法，'party'=党务，'government'=行政，'league'=团派，''=共同段 */
  careerPath?: string;
  /** 路线KPI积分（非行政线专属行动积累） */
  lineKpiScore?: number;
  /** 巡视风险指数（0-100，越高越危险，纪检线考核用） */
  inspectionRisk?: number;
  /** 公众舆情指数（0-100，团派线考核用） */
  publicOpinionIndex?: number;
}

// ── 乡镇级（rank 1-3） ──
const TIER_TOWN: TierConfig = {
  label: '乡镇基层',
  scoreThreshold: 72,
  rankThreshold: 55,
  dims: [
    {
      key: 'stability',
      label: '社会稳定',
      desc: '治安秩序、信访控制、群体事件防范',
      weight: 0.30,
      compute: s => clamp(s.securityIndex),
      warnLine: 30,
    },
    {
      key: 'task',
      label: '完成上级任务',
      desc: '上级交办硬指标完成度、上级认可度',
      weight: 0.25,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'rural',
      label: '农村工作',
      desc: '农村环境整治、农田水利、村级管理',
      weight: 0.20,
      compute: s => clamp((s.cityLivelihood + s.cityEcology) / 2),
      warnLine: 25,
    },
    {
      key: 'party_build',
      label: '基层党建',
      desc: '党风廉政、组织生活、党员发展',
      weight: 0.15,
      compute: s => clamp(s.moralValue),
      warnLine: 40,
    },
    {
      key: 'livelihood',
      label: '民生保障',
      desc: '低保发放、困难救助、基础设施',
      weight: 0.10,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 25,
    },
  ],
  vetoRules: [
    {
      label: '重大群体性事件',
      desc: '安全稳定指数过低，发生重大群体事件',
      check: s => ({ triggered: s.securityIndex < 20, value: s.securityIndex, threshold: 20 }),
    },
    {
      label: '道德品行不端',
      desc: '廉洁自律不达标，存在违规风险',
      check: s => ({ triggered: s.moralValue < 25, value: s.moralValue, threshold: 25 }),
    },
    {
      label: '【纪检】基层办案严重失职',
      desc: '（纪检政法路线专属）办理案件程序违法或捏造证据，被上级纪委通报',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.moralValue < 35,
        value: s.moralValue,
        threshold: 35,
      }),
    },
  ],
};

// ── 县级（rank 4-6） ──
const TIER_COUNTY: TierConfig = {
  label: '县处级',
  scoreThreshold: 75,
  rankThreshold: 60,
  dims: [
    {
      key: 'economy',
      label: '经济发展',
      desc: 'GDP增长、财政收入、招商引资',
      weight: 0.30,
      compute: s => clamp((s.cityGdp * 0.5 + Math.min(100, s.taxRevenue * 2) * 0.3 + s.cityBusiness * 0.2)),
      warnLine: 30,
    },
    {
      key: 'livelihood',
      label: '民生改善',
      desc: '教育医疗投入、就业率、居民收入',
      weight: 0.25,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 30,
    },
    {
      key: 'stability',
      label: '社会稳定',
      desc: '信访数量、治安案件、群体事件',
      weight: 0.20,
      compute: s => clamp(s.securityIndex),
      warnLine: 25,
    },
    {
      key: 'task',
      label: '完成上级任务',
      desc: '县域硬指标完成度、上级评价',
      weight: 0.15,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '上级认可度、班子团结、政策执行',
      weight: 0.10,
      compute: s => clamp((s.boss2Favor + s.boss3Favor) / 2),
      warnLine: 30,
    },
  ],
  vetoRules: [
    {
      label: '重大群体性事件',
      desc: '社会稳定指数过低，发生重大群体事件',
      check: s => ({ triggered: s.securityIndex < 22, value: s.securityIndex, threshold: 22 }),
    },
    {
      label: 'GDP连续倒数',
      desc: '经济发展严重滞后，GDP指数过低',
      check: s => ({ triggered: s.cityGdp < 20, value: s.cityGdp, threshold: 20 }),
    },
    {
      label: '道德违纪',
      desc: '廉洁自律严重不达标，存在违纪风险',
      check: s => ({ triggered: s.moralValue < 20, value: s.moralValue, threshold: 20 }),
    },
    {
      label: '【纪检】冤假错案/违规立案',
      desc: '（纪检政法路线专属）所办案件被认定为冤假错案，或违规立案调查被投诉举报',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.moralValue < 30 && s.bossFavor < 40,
        value: Math.min(s.moralValue, s.bossFavor),
        threshold: 30,
      }),
    },
    {
      label: '【纪检】滥用执纪权力',
      desc: '（纪检政法路线专属）超越职权、选择性执纪，上级纪委已启动核查',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.boss2Favor < 25,
        value: s.boss2Favor,
        threshold: 25,
      }),
    },
  ],
};

// ── 市级（rank 7-9） ──
const TIER_CITY: TierConfig = {
  label: '地市级',
  scoreThreshold: 78,
  rankThreshold: 65,
  dims: [
    {
      key: 'economy',
      label: '综合经济',
      desc: 'GDP增长、财政收入、产业结构、营商环境',
      weight: 0.25,
      compute: s => clamp((s.cityGdp * 0.4 + s.cityBusiness * 0.35 + Math.min(100, s.taxRevenue * 1.5) * 0.25)),
      warnLine: 35,
    },
    {
      key: 'urban',
      label: '城市建设',
      desc: '城市规划、基础设施、环境质量',
      weight: 0.20,
      compute: s => clamp((s.cityEcology * 0.6 + s.cityBusiness * 0.4)),
      warnLine: 30,
    },
    {
      key: 'coordination',
      label: '区域协调',
      desc: '县域发展均衡度、跨县协调、同级排名',
      weight: 0.20,
      compute: s => clamp(s.annualRankPct),
      warnLine: 30,
    },
    {
      key: 'stability',
      label: '政治稳定',
      desc: '信访管控、群体事件、社会治安',
      weight: 0.15,
      compute: s => clamp(s.securityIndex),
      warnLine: 28,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '上级信任、政策执行力、班子团结',
      weight: 0.10,
      compute: s => clamp(s.bossFavor),
      warnLine: 35,
    },
    {
      key: 'reputation',
      label: '干部口碑',
      desc: '班子评价、群众满意度',
      weight: 0.10,
      compute: s => clamp((s.boss2Favor + s.cityLivelihood) / 2),
      warnLine: 30,
    },
  ],
  vetoRules: [
    {
      label: '重大安全事故',
      desc: '社会稳定指数过低，发生重大安全事故',
      check: s => ({ triggered: s.securityIndex < 25, value: s.securityIndex, threshold: 25 }),
    },
    {
      label: '重大环境污染',
      desc: '生态环境指数过低，发生重大污染事件',
      check: s => ({ triggered: s.cityEcology < 15, value: s.cityEcology, threshold: 15 }),
    },
    {
      label: '班子严重分裂',
      desc: '上级关系极度恶化，班子无法正常运转',
      check: s => ({ triggered: s.boss2Favor < 25 && s.boss3Favor < 25, value: Math.min(s.boss2Favor, s.boss3Favor), threshold: 25 }),
    },
    {
      label: '严重违纪',
      desc: '道德值过低，存在立案风险',
      check: s => ({ triggered: s.moralValue < 15, value: s.moralValue, threshold: 15 }),
    },
    {
      label: '【纪检】司法腐败被中央巡视',
      desc: '（纪检政法路线专属）中央巡视组发现本地纪检系统存在腐败问题，主要负责人被立案审查',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.moralValue < 25,
        value: s.moralValue,
        threshold: 25,
      }),
    },
    {
      label: '【纪检】办案结果严重失实',
      desc: '（纪检政法路线专属）主导的重大案件被上级认定为严重失实，政治可信度受损',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.boss2Favor < 20 && s.boss3Favor < 20,
        value: Math.min(s.boss2Favor, s.boss3Favor),
        threshold: 20,
      }),
    },
  ],
};

// ── 省级（rank 10-11） ──
const TIER_PROVINCE: TierConfig = {
  label: '省部级',
  scoreThreshold: 82,
  rankThreshold: 72,
  dims: [
    {
      key: 'macro_economy',
      label: '宏观经济',
      desc: 'GDP增速、财政收入、产业转型升级',
      weight: 0.25,
      compute: s => clamp((s.cityGdp * 0.5 + Math.min(100, s.taxRevenue * 1.2) * 0.3 + s.cityBusiness * 0.2)),
      warnLine: 40,
    },
    {
      key: 'ecology',
      label: '生态文明',
      desc: '环境质量、节能减排、生态保护红线',
      weight: 0.20,
      compute: s => clamp(s.cityEcology),
      warnLine: 35,
    },
    {
      key: 'common_wealth',
      label: '共同富裕',
      desc: '收入差距、民生保障、脱贫成果巩固',
      weight: 0.20,
      compute: s => clamp(s.cityLivelihood),
      warnLine: 35,
    },
    {
      key: 'political',
      label: '政治可靠性',
      desc: '中央认可度、重大政策执行、政治立场',
      weight: 0.20,
      compute: s => clamp((s.bossFavor * 0.6 + s.boss2Favor * 0.4)),
      warnLine: 40,
    },
    {
      key: 'stability',
      label: '全局稳定',
      desc: '省内治安、群体事件控制、信访管控',
      weight: 0.15,
      compute: s => clamp(s.securityIndex),
      warnLine: 35,
    },
  ],
  vetoRules: [
    {
      label: '生态文明硬约束',
      desc: '生态指数过低，未完成环保约束性指标',
      check: s => ({ triggered: s.cityEcology < 20, value: s.cityEcology, threshold: 20 }),
    },
    {
      label: '共同富裕严重滞后',
      desc: '民生指数过低，脱贫攻坚/共同富裕任务未完成',
      check: s => ({ triggered: s.cityLivelihood < 20, value: s.cityLivelihood, threshold: 20 }),
    },
    {
      label: '重大稳定事件',
      desc: '省内发生重大群体性事件，社会稳定失控',
      check: s => ({ triggered: s.securityIndex < 28, value: s.securityIndex, threshold: 28 }),
    },
    {
      label: '中央信任危机',
      desc: '上级好感度极低，政治可靠性存疑',
      check: s => ({ triggered: s.bossFavor < 20, value: s.bossFavor, threshold: 20 }),
    },
    {
      label: '严重违纪',
      desc: '道德值过低，存在立案风险',
      check: s => ({ triggered: s.moralValue < 10, value: s.moralValue, threshold: 10 }),
    },
    {
      label: '【纪检】省纪委腐败窝案',
      desc: '（纪检政法路线专属）省级纪检系统出现腐败窝案，主官负有不可推卸的领导责任',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.moralValue < 20,
        value: s.moralValue,
        threshold: 20,
      }),
    },
    {
      label: '【纪检】违规干预司法',
      desc: '（纪检政法路线专属）以纪检手段违规干预地方司法案件，肃宪督察院已启动调查',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.bossFavor < 28,
        value: s.bossFavor,
        threshold: 28,
      }),
    },
  ],
};

// ── 国家级（rank 12+） ──
const TIER_NATIONAL: TierConfig = {
  label: '国家级',
  scoreThreshold: 88,
  rankThreshold: 80,
  dims: [
    {
      key: 'political_perf',
      label: '政治表现',
      desc: '政治忠诚、政治纪律、政治立场鲜明',
      weight: 0.40,
      compute: s => clamp((s.bossFavor * 0.5 + s.moralValue * 0.5)),
      warnLine: 50,
    },
    {
      key: 'strategy',
      label: '国家战略执行',
      desc: '重大战略任务完成度、中央部署落实',
      weight: 0.30,
      compute: s => clamp((s.boss2Favor * 0.5 + s.boss3Favor * 0.5)),
      warnLine: 45,
    },
    {
      key: 'stability',
      label: '全局稳定',
      desc: '国家安全、社会稳定、综合治理',
      weight: 0.20,
      compute: s => clamp((s.securityIndex * 0.5 + s.cityGdp * 0.3 + s.cityLivelihood * 0.2)),
      warnLine: 40,
    },
    {
      key: 'reputation',
      label: '干部口碑',
      desc: '班子评价、群众口碑、历史贡献',
      weight: 0.10,
      compute: s => clamp(s.annualRankPct),
      warnLine: 40,
    },
  ],
  vetoRules: [
    {
      label: '重大政治风险',
      desc: '政治可靠性严重不足，存在政治风险',
      check: s => ({ triggered: s.bossFavor < 25, value: s.bossFavor, threshold: 25 }),
    },
    {
      label: '严重违纪',
      desc: '道德值过低，已触发立案风险',
      check: s => ({ triggered: s.moralValue < 8, value: s.moralValue, threshold: 8 }),
    },
    // ── 纪检政法路线 rank12+ 专属否决项 ──
    {
      label: '【纪检】肃宪督察院高层腐败',
      desc: '（纪检政法路线 rank12+ 专属）肃宪督察院系统出现高层腐败，自身廉洁性受到联邦政务院质疑',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.moralValue < 15,
        value: s.moralValue,
        threshold: 15,
      }),
    },
    {
      label: '【纪检】重大冤假错案被平反',
      desc: '（纪检政法路线 rank12+ 专属）主导或背书的重大案件被最高层认定为冤假错案，政治信任彻底崩塌',
      check: s => ({
        triggered: s.careerPath === 'discipline' && s.bossFavor < 30 && s.moralValue < 30,
        value: Math.min(s.bossFavor, s.moralValue),
        threshold: 30,
      }),
    },
  ],
};

// ─── 按职级获取层级配置 ─────────────────────────────────────────────────────
function getTierConfig(rankLevel: number): TierConfig {
  if (rankLevel <= 3)  return TIER_TOWN;
  if (rankLevel <= 6)  return TIER_COUNTY;
  if (rankLevel <= 9)  return TIER_CITY;
  if (rankLevel <= 11) return TIER_PROVINCE;
  return TIER_NATIONAL;
}

// ─── 主入口：计算 KPI 评估结果 ───────────────────────────────────────────────
export function computeKpi(s: KpiSaveSnapshot): KpiResult {
  const cfg = getTierConfig(s.rankLevel);
  const isDiscipline = s.careerPath === 'discipline';

  // 非纪检路线：过滤治安（stability/securityIndex）考核维度，保留其余维度并归一化权重
  const activeDimsRaw = cfg.dims.filter(d => isDiscipline || d.key !== 'stability');
  const totalW = activeDimsRaw.reduce((sum, d) => sum + d.weight, 0) || 1;
  const activeDims = activeDimsRaw.map(d => ({ ...d, weight: +(d.weight / totalW).toFixed(4) }));

  // 计算各维度
  const dimensions: KpiDimension[] = activeDims.map(d => {
    const rawScore = Math.round(d.compute(s));
    const weightedScore = Math.round(rawScore * d.weight);
    return {
      key: d.key,
      label: d.label,
      desc: d.desc,
      weight: d.weight,
      rawScore,
      weightedScore,
      warning: rawScore < d.warnLine,
      vetoed: false,
    };
  });

  // 综合得分
  const rawTotal = Math.min(100, dimensions.reduce((sum, d) => sum + d.weightedScore, 0));
  const totalScore = rawTotal;

  // 一票否决判断：非纪检路线移除治安类否决项
  const activeVetoRules = cfg.vetoRules.filter(r => {
    if (isDiscipline) return true;
    // 移除含治安/稳定/securityIndex 的否决项（通用类，仅纪检需要）
    return !r.label.includes('群体性事件') && !r.label.includes('安全事故') && !r.label.includes('稳定事件');
  });
  const vetoItems: VetoItem[] = activeVetoRules.map(r => {
    const res = r.check(s);
    return { label: r.label, desc: r.desc, ...res };
  });
  const hasVeto = vetoItems.some(v => v.triggered);

  // 达标判断（排名百分位仅作为 KPI 维度参考分，不再作为晋升独立门槛）
  const scoreReady = totalScore >= cfg.scoreThreshold;
  const rankReady  = true; // 已移除排名百分位独立晋升门槛
  const eligible   = scoreReady && !hasVeto;

  // 差距描述
  const gaps: string[] = [];
  if (!scoreReady) {
    const diff = cfg.scoreThreshold - totalScore;
    gaps.push(`综合得分 ${totalScore}分，距门槛 ${cfg.scoreThreshold}分还差 ${diff}分`);
    // 找最弱维度
    const weakest = [...dimensions].sort((a, b) => a.rawScore - b.rawScore)[0];
    if (weakest && weakest.rawScore < 50) {
      gaps.push(`"${weakest.label}"得分偏低（${weakest.rawScore}分），建议重点提升`);
    }
  }
  vetoItems.filter(v => v.triggered).forEach(v => {
    gaps.push(`⛔ 一票否决：${v.label}（当前 ${v.value}，需 ≥${v.threshold}）`);
  });

  return {
    totalScore,
    dimensions,
    vetoItems,
    hasVeto,
    scoreThreshold: cfg.scoreThreshold,
    rankPct: s.annualRankPct,
    rankThreshold: cfg.rankThreshold,
    scoreReady,
    rankReady,
    eligible,
    gaps,
    tierLabel: cfg.label,
  };
}

// ─── 获取当前层级的核心考核指标（用于主界面面板） ─────────────────────────
export interface KpiPanelItem {
  key: string;
  label: string;
  desc: string;
  score: number;
  weight: number;
  warning: boolean;
  vetoed: boolean;
  isTop: boolean; // 是否为权重最大的核心指标（前3名）
}

export function getKpiPanel(s: KpiSaveSnapshot): KpiPanelItem[] {
  const result = computeKpi(s);
  const sorted = [...result.dimensions].sort((a, b) => b.weight - a.weight);
  return sorted.map((d, i) => ({
    key: d.key,
    label: d.label,
    desc: d.desc,
    score: d.rawScore,
    weight: d.weight,
    warning: d.warning,
    vetoed: d.vetoed,
    isTop: i < 3,
  }));
}

/** 获取晋升总结文字 */
export function getPromotionSummary(kpi: KpiResult, tenureYears: number, requiredTenureYears: number): string {
  if (kpi.hasVeto) return '⛔ 存在一票否决项，暂无晋升资格';
  if (tenureYears < requiredTenureYears) return `⏳ 任期未满（${tenureYears}/${requiredTenureYears}年）`;
  if (!kpi.scoreReady) return `📊 综合考核得分 ${kpi.totalScore}分（门槛 ${kpi.scoreThreshold}分）`;
  if (!kpi.rankReady)  return `📊 综合得分 ${kpi.totalScore}分（需 ≥${kpi.scoreThreshold}分）`;
  return '✅ 已具备晋升条件，等待换届窗口期';
}

// ═══════════════════════════════════════════════════════════════════════
// 部门专属KPI考核体系（非党政路线专用）
// 各部门独立考核维度，同一及格线：60分
// ═══════════════════════════════════════════════════════════════════════

/** 部门KPI考核维度 */
export interface DeptKpiDim {
  key: string;
  label: string;     // 指标名称
  desc: string;      // 考核说明
  weight: number;    // 权重 0-1
  score: number;     // 得分 0-100
  warning: boolean;  // 是否低于预警线
}

/** 部门KPI考核结果 */
export interface DeptKpiResult {
  deptKey: string;
  deptName: string;
  totalScore: number;      // 综合得分（加权）
  scoreThreshold: number;  // 及格线（统一60分）
  eligible: boolean;       // 是否达标
  dims: DeptKpiDim[];
  gaps: string[];          // 不达标说明
}

const clampD = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/** 获取各部门专属KPI考核面板 */
export function getDeptKpiResult(deptKey: string, s: KpiSaveSnapshot): DeptKpiResult {
  const THRESHOLD = 60;

  type DimSpec = { key: string; label: string; desc: string; weight: number; compute: (s: KpiSaveSnapshot) => number; warnLine: number };

  const DEPT_DIMS: Record<string, { name: string; dims: DimSpec[] }> = {
    police: {
      name: '公安局',
      dims: [
        { key: 'security', label: '治安管控', desc: '辖区刑事案件发案率、治安指数变化', weight: 0.35, compute: s => clampD(s.securityIndex), warnLine: 30 },
        { key: 'solve_rate', label: '案件侦破率', desc: '刑事案件破案率及效率', weight: 0.25, compute: s => clampD(s.meritPoints * 0.8 + 20), warnLine: 40 },
        { key: 'law_enforce', label: '执法规范度', desc: '群众对执法行为满意度，投诉数量', weight: 0.20, compute: s => clampD(s.bossFavor * 0.9 + 10), warnLine: 35 },
        { key: 'livelihood', label: '群众安全感', desc: '群众调查安全感指数', weight: 0.20, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 25 },
      ],
    },
    finance: {
      name: '财政局',
      dims: [
        { key: 'budget_exec', label: '预算执行率', desc: '年度预算支出完成度与偏差控制', weight: 0.30, compute: s => clampD(s.taxRevenue * 5 + 40), warnLine: 40 },
        { key: 'tax_complete', label: '财政收入完成', desc: '税收及非税收入年度任务完成率', weight: 0.30, compute: s => clampD(s.taxRevenue * 8 + 40), warnLine: 45 },
        { key: 'debt_control', label: '债务风险管控', desc: '政府债务率、债务偿还能力管控', weight: 0.25, compute: s => clampD(s.moralValue * 0.7 + 30), warnLine: 40 },
        { key: 'fund_safety', label: '资金安全运行', desc: '资金支出合规率，杜绝违规使用', weight: 0.15, compute: s => clampD(s.bossFavor * 0.8 + 20), warnLine: 30 },
      ],
    },
    education: {
      name: '教育局',
      dims: [
        { key: 'quality', label: '教育教学质量', desc: '中高考成绩、课堂质量督导结果', weight: 0.30, compute: s => clampD(s.cityLivelihood * 0.9 + 10), warnLine: 35 },
        { key: 'resource_equal', label: '资源均衡配置', desc: '城乡学校师资与硬件均衡程度', weight: 0.25, compute: s => clampD(s.cityEcology * 0.8 + 20), warnLine: 30 },
        { key: 'safety', label: '校园安全管理', desc: '校园事故、欺凌事件发生率', weight: 0.25, compute: s => clampD(s.securityIndex * 0.7 + 30), warnLine: 40 },
        { key: 'parent_satisfy', label: '家长满意度', desc: '家长对教育服务的综合满意度调查', weight: 0.20, compute: s => clampD(s.bossFavor * 0.85 + 15), warnLine: 30 },
      ],
    },
    health: {
      name: '卫健委',
      dims: [
        { key: 'medical_service', label: '医疗服务水平', desc: '公立医院就诊量、平均候诊时长', weight: 0.30, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 35 },
        { key: 'epidemic', label: '公共卫生防控', desc: '传染病疫情应急处置及时率', weight: 0.30, compute: s => clampD(s.securityIndex * 0.6 + 40), warnLine: 45 },
        { key: 'health_reform', label: '医改推进成效', desc: '分级诊疗、家庭医生签约完成率', weight: 0.25, compute: s => clampD(s.meritPoints * 0.7 + 30), warnLine: 35 },
        { key: 'supervision', label: '卫生监督执法', desc: '食品、公共场所卫生整治合格率', weight: 0.15, compute: s => clampD(s.bossFavor * 0.8 + 20), warnLine: 25 },
      ],
    },
    health2: {
      name: '卫健委',
      dims: [
        { key: 'medical_service', label: '医疗服务水平', desc: '公立医院就诊量、平均候诊时长', weight: 0.30, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 35 },
        { key: 'epidemic', label: '公共卫生防控', desc: '传染病疫情应急处置及时率', weight: 0.30, compute: s => clampD(s.securityIndex * 0.6 + 40), warnLine: 45 },
        { key: 'health_reform', label: '医改推进成效', desc: '分级诊疗、家庭医生签约完成率', weight: 0.25, compute: s => clampD(s.meritPoints * 0.7 + 30), warnLine: 35 },
        { key: 'supervision', label: '卫生监督执法', desc: '食品、公共场所卫生整治合格率', weight: 0.15, compute: s => clampD(s.bossFavor * 0.8 + 20), warnLine: 25 },
      ],
    },
    ecology: {
      name: '生态环保局',
      dims: [
        { key: 'air', label: '大气环境质量', desc: 'PM2.5达标率、优良天数比例', weight: 0.30, compute: s => clampD(s.cityEcology * 0.9 + 10), warnLine: 30 },
        { key: 'water', label: '水环境治理', desc: '辖区河流断面水质达标率', weight: 0.25, compute: s => clampD(s.cityEcology * 0.85 + 15), warnLine: 30 },
        { key: 'enforce', label: '环保执法力度', desc: '环境违法案件查处数量与效率', weight: 0.25, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 35 },
        { key: 'restore', label: '生态修复成效', desc: '矿山复绿、湿地修复完成率', weight: 0.20, compute: s => clampD(s.cityGdp * 0.5 + 50), warnLine: 30 },
      ],
    },
    market: {
      name: '市场监管局',
      dims: [
        { key: 'food_safety', label: '食品安全保障', desc: '食品抽检合格率，重大事件发生次数', weight: 0.35, compute: s => clampD(s.cityLivelihood * 0.8 + 20), warnLine: 40 },
        { key: 'market_order', label: '市场秩序规范', desc: '虚假宣传、价格欺诈等违规查处率', weight: 0.25, compute: s => clampD(s.cityBusiness * 0.85 + 15), warnLine: 35 },
        { key: 'enterprise', label: '企业登记服务', desc: '企业开办平均时间，满意度评分', weight: 0.20, compute: s => clampD(s.bossFavor * 0.9 + 10), warnLine: 30 },
        { key: 'special_equip', label: '特种设备安全', desc: '电梯、锅炉等特种设备事故率', weight: 0.20, compute: s => clampD(s.securityIndex * 0.65 + 35), warnLine: 35 },
      ],
    },
    agriculture: {
      name: '农业农村局',
      dims: [
        { key: 'grain', label: '粮食生产安全', desc: '粮食产量完成率，耕地保护状况', weight: 0.30, compute: s => clampD(s.cityGdp * 0.7 + 30), warnLine: 35 },
        { key: 'income', label: '农民增收', desc: '农村居民人均可支配收入增幅', weight: 0.25, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 30 },
        { key: 'rural_build', label: '美丽乡村建设', desc: '农村人居环境整治完成率', weight: 0.25, compute: s => clampD(s.cityEcology * 0.8 + 20), warnLine: 25 },
        { key: 'agri_tech', label: '农技推广成效', desc: '新品种新技术覆盖率，农业机械化率', weight: 0.20, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 30 },
      ],
    },
    police_general: {
      name: '公安局',
      dims: [
        { key: 'security', label: '治安管控', desc: '辖区治安指数变化', weight: 0.40, compute: s => clampD(s.securityIndex), warnLine: 30 },
        { key: 'law_enforce', label: '执法规范度', desc: '群众投诉、执法满意度', weight: 0.35, compute: s => clampD(s.bossFavor * 0.9 + 10), warnLine: 35 },
        { key: 'livelihood', label: '群众安全感', desc: '调查安全感指数', weight: 0.25, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 25 },
      ],
    },
    petition: {
      name: '信访办',
      dims: [
        { key: 'resolve_rate', label: '矛盾化解率', desc: '信访事项按期办结率与解决率', weight: 0.35, compute: s => clampD(s.bossFavor * 0.9 + 10), warnLine: 40 },
        { key: 'no_escalate', label: '越级上访控制', desc: '群众越级上访次数同比变化', weight: 0.30, compute: s => clampD(s.securityIndex * 0.75 + 25), warnLine: 35 },
        { key: 'satisfaction', label: '信访群众满意度', desc: '来访群众诉求响应满意度调查', weight: 0.20, compute: s => clampD(s.cityLivelihood * 0.8 + 20), warnLine: 30 },
        { key: 'stability', label: '维护社会稳定', desc: '辖区群体性事件预警与处置', weight: 0.15, compute: s => clampD(s.securityIndex * 0.7 + 30), warnLine: 30 },
      ],
    },
    organization: {
      name: '组织部',
      dims: [
        { key: 'cadre_quality', label: '干部队伍建设', desc: '干部考核优秀率、专业化水平', weight: 0.35, compute: s => clampD(s.bossFavor * 0.85 + 15), warnLine: 40 },
        { key: 'party_member', label: '党员管理规范', desc: '党员发展质量、组织生活落实情况', weight: 0.25, compute: s => clampD(s.moralValue * 0.85 + 15), warnLine: 35 },
        { key: 'talent', label: '人才引进培育', desc: '高层次人才引进数量与留存率', weight: 0.25, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 30 },
        { key: 'reserve', label: '后备干部培养', desc: '后备干部库动态更新与使用率', weight: 0.15, compute: s => clampD(s.cityGdp * 0.5 + 50), warnLine: 25 },
      ],
    },
    propaganda: {
      name: '宣传部',
      dims: [
        { key: 'ideology', label: '意识形态安全', desc: '辖区意识形态阵地管控，舆情无重大事件', weight: 0.35, compute: s => clampD(s.moralValue * 0.8 + 20), warnLine: 40 },
        { key: 'opinion', label: '舆论引导效果', desc: '主流媒体传播力，负面舆情处置率', weight: 0.30, compute: s => clampD(s.securityIndex * 0.6 + 40), warnLine: 35 },
        { key: 'culture', label: '文化活动覆盖', desc: '群众性文化活动开展场次与参与率', weight: 0.20, compute: s => clampD(s.cityLivelihood * 0.8 + 20), warnLine: 25 },
        { key: 'press', label: '新闻宣传管理', desc: '对外正面宣传发稿量，媒体管理合规率', weight: 0.15, compute: s => clampD(s.bossFavor * 0.85 + 15), warnLine: 25 },
      ],
    },
    discipline: {
      name: '纪检委',
      dims: [
        { key: 'case_handle', label: '案件查处力度', desc: '立案数量、案件移送率', weight: 0.35, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 40 },
        { key: 'supervision', label: '日常监督覆盖', desc: '派驻监督单位覆盖率，巡察完成率', weight: 0.30, compute: s => clampD(s.bossFavor * 0.8 + 20), warnLine: 35 },
        { key: 'moral', label: '廉洁自律', desc: '纪检干部自身廉洁状况', weight: 0.20, compute: s => clampD(s.moralValue), warnLine: 45 },
        { key: 'education', label: '廉政教育成效', desc: '廉政教育覆盖率，干部违纪率下降情况', weight: 0.15, compute: s => clampD(s.securityIndex * 0.5 + 50), warnLine: 30 },
      ],
    },
    govoffice: {
      name: '政府办公室',
      dims: [
        { key: 'coord', label: '政务协调效率', desc: '跨部门协调议题，公文流转及时率', weight: 0.30, compute: s => clampD(s.bossFavor * 0.9 + 10), warnLine: 40 },
        { key: 'document', label: '文件规范质量', desc: '公文合规率，领导批示落实率', weight: 0.25, compute: s => clampD(s.meritPoints * 0.8 + 20), warnLine: 35 },
        { key: 'service', label: '政务服务水平', desc: '行政审批效率，窗口群众满意度', weight: 0.25, compute: s => clampD(s.cityLivelihood * 0.75 + 25), warnLine: 30 },
        { key: 'emergency', label: '应急响应处置', desc: '突发事件应急处置及时率', weight: 0.20, compute: s => clampD(s.securityIndex * 0.65 + 35), warnLine: 30 },
      ],
    },
    ndrc: {
      name: '发展改革委',
      dims: [
        { key: 'project', label: '重大项目推进', desc: '重点项目年度投资完成率', weight: 0.30, compute: s => clampD(s.cityGdp * 0.8 + 20), warnLine: 35 },
        { key: 'approval', label: '审批服务效率', desc: '投资项目审批提速率，企业满意度', weight: 0.25, compute: s => clampD(s.cityBusiness * 0.85 + 15), warnLine: 30 },
        { key: 'price', label: '价格秩序管控', desc: '重要商品价格监测，查处价格违规', weight: 0.25, compute: s => clampD(s.securityIndex * 0.5 + 50), warnLine: 30 },
        { key: 'plan', label: '规划执行效果', desc: '中长期发展规划阶段目标完成率', weight: 0.20, compute: s => clampD(s.meritPoints * 0.7 + 30), warnLine: 25 },
      ],
    },
    urban: {
      name: '住建局',
      dims: [
        { key: 'construction', label: '工程质量管理', desc: '在建工程质量合格率，安全事故率', weight: 0.30, compute: s => clampD(s.cityGdp * 0.7 + 30), warnLine: 40 },
        { key: 'housing', label: '住房保障落实', desc: '保障性住房分配率，轮候期满足率', weight: 0.25, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 35 },
        { key: 'municipal', label: '市政设施完好', desc: '道路、绿化、排水设施完好率', weight: 0.25, compute: s => clampD(s.cityBusiness * 0.7 + 30), warnLine: 30 },
        { key: 'planning', label: '规划执行合规', desc: '违规建设查处率，规划落实度', weight: 0.20, compute: s => clampD(s.moralValue * 0.7 + 30), warnLine: 25 },
      ],
    },
    personnel: {
      name: '人事局',
      dims: [
        { key: 'exam', label: '考录组织工作', desc: '公务员招录考试组织规范度', weight: 0.30, compute: s => clampD(s.moralValue * 0.85 + 15), warnLine: 40 },
        { key: 'training', label: '培训教育成效', desc: '干部在职培训完成率，能力提升评估', weight: 0.25, compute: s => clampD(s.meritPoints * 0.8 + 20), warnLine: 35 },
        { key: 'assess', label: '绩效考核落实', desc: '年度考核优秀率，考核数据真实性', weight: 0.25, compute: s => clampD(s.bossFavor * 0.85 + 15), warnLine: 30 },
        { key: 'talent_intro', label: '人才引进效果', desc: '引进高层次人才数，政策兑现率', weight: 0.20, compute: s => clampD(s.cityBusiness * 0.7 + 30), warnLine: 25 },
      ],
    },
    invest: {
      name: '招商局',
      dims: [
        { key: 'investment', label: '招商引资总量', desc: '实际利用内外资金额年度完成率', weight: 0.35, compute: s => clampD(s.cityGdp * 0.8 + 20), warnLine: 35 },
        { key: 'enterprise_serve', label: '企业服务质量', desc: '落户企业满意度，问题诉求响应率', weight: 0.30, compute: s => clampD(s.cityBusiness * 0.9 + 10), warnLine: 40 },
        { key: 'project_land', label: '项目落地率', desc: '签约项目实际开工投产率', weight: 0.20, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 30 },
        { key: 'tax_income', label: '税收贡献度', desc: '招引企业纳税贡献', weight: 0.15, compute: s => clampD(s.taxRevenue * 5 + 50), warnLine: 25 },
      ],
    },
    tax: {
      name: '税务局',
      dims: [
        { key: 'tax_complete', label: '税收任务完成', desc: '年度税收征收额完成率', weight: 0.35, compute: s => clampD(s.taxRevenue * 8 + 40), warnLine: 45 },
        { key: 'service', label: '纳税服务水平', desc: '纳税人满意度，办税便利度', weight: 0.25, compute: s => clampD(s.bossFavor * 0.9 + 10), warnLine: 35 },
        { key: 'check', label: '税务稽查效能', desc: '稽查选案精准率，查补税款金额', weight: 0.25, compute: s => clampD(s.meritPoints * 0.8 + 20), warnLine: 35 },
        { key: 'compliance', label: '依法诚信征管', desc: '税收执法合规率，无渎职案件', weight: 0.15, compute: s => clampD(s.moralValue * 0.8 + 20), warnLine: 30 },
      ],
    },
    industry: {
      name: '工信局',
      dims: [
        { key: 'industry_growth', label: '工业增加值', desc: '规上工业增加值增速，产值完成率', weight: 0.35, compute: s => clampD(s.cityGdp * 0.85 + 15), warnLine: 35 },
        { key: 'digital', label: '数字经济发展', desc: '数字化转型企业数量，数字经济规模', weight: 0.25, compute: s => clampD(s.cityBusiness * 0.8 + 20), warnLine: 30 },
        { key: 'sme', label: '中小企业培育', desc: '规上企业新增数，专精特新企业数', weight: 0.25, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 30 },
        { key: 'safety', label: '工业安全生产', desc: '工业安全事故率，隐患整改完成率', weight: 0.15, compute: s => clampD(s.securityIndex * 0.5 + 50), warnLine: 35 },
      ],
    },
    naturalres: {
      name: '自然资源局',
      dims: [
        { key: 'land_protect', label: '耕地保护', desc: '耕地保有量，"非农化"违法查处', weight: 0.30, compute: s => clampD(s.cityEcology * 0.85 + 15), warnLine: 35 },
        { key: 'planning', label: '规划合规落地', desc: '国土空间规划执行率，违规项目查处', weight: 0.30, compute: s => clampD(s.moralValue * 0.75 + 25), warnLine: 35 },
        { key: 'register', label: '不动产登记服务', desc: '不动产登记效率，群众满意度', weight: 0.25, compute: s => clampD(s.bossFavor * 0.85 + 15), warnLine: 30 },
        { key: 'mineral', label: '矿产资源管理', desc: '矿业权合规率，非法采矿查处率', weight: 0.15, compute: s => clampD(s.securityIndex * 0.55 + 45), warnLine: 30 },
      ],
    },
    construction: {
      name: '住建局(建设)',
      dims: [
        { key: 'quality', label: '工程质量安全', desc: '建设工程质量合格率，安全事故率', weight: 0.35, compute: s => clampD(s.cityGdp * 0.7 + 30), warnLine: 40 },
        { key: 'housing', label: '保障性住房', desc: '保障房开工完成率，分配合规率', weight: 0.25, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 30 },
        { key: 'greening', label: '城市绿化美化', desc: '城市绿化覆盖率，景观提升完成率', weight: 0.20, compute: s => clampD(s.cityEcology * 0.8 + 20), warnLine: 25 },
        { key: 'lighting', label: '市政照明完好', desc: '路灯完好率，夜间照明覆盖达标率', weight: 0.20, compute: s => clampD(s.meritPoints * 0.7 + 30), warnLine: 25 },
      ],
    },
    // ── 党务线：对应党委工作系统6个部室 ──────────────────────────────────────────
    party: {
      name: '党务线考核',
      dims: [
        { key: 'dangwuban',     label: '党务办（综合协调）',   desc: '党委常委会筹备质量、党务日常运转规范度与重要会议落实', weight: 0.25, compute: s => clampD(s.moralValue * 0.8 + 20), warnLine: 40 },
        { key: 'zuzhibu',      label: '组织部室（干部管理）',   desc: '干部年度考核优秀率、后备干部培养与基层党支部建设', weight: 0.25, compute: s => clampD(s.bossFavor * 0.85 + 15), warnLine: 35 },
        { key: 'xuanchuanbu',  label: '宣传部室（意识形态）',   desc: '主流媒体传播力、正面宣传覆盖率与负面舆情处置', weight: 0.20, compute: s => clampD(s.securityIndex * 0.7 + 30), warnLine: 35 },
        { key: 'tongzhanbu',   label: '统战部室（统一战线）',   desc: '民族宗教事务稳定、非公经济人士联络满意度', weight: 0.15, compute: s => clampD(s.cityLivelihood * 0.75 + 25), warnLine: 30 },
        { key: 'jijianzu',     label: '纪检组（党内监督）',     desc: '廉政教育覆盖率、纪律审查质量与廉洁自律', weight: 0.10, compute: s => clampD(s.moralValue * 0.9 + 10), warnLine: 45 },
        { key: 'qinggongwei',  label: '青工委（青年工作）',     desc: '青年干部论坛开展次数、青工活动覆盖与工会建设', weight: 0.05, compute: s => clampD(s.meritPoints * 0.8 + 20), warnLine: 25 },
      ],
    },
    // ── 纪检线：对应政法综治系统5个机构 ─────────────────────────────────────────
    discipline_line: {
      name: '纪检线考核',
      dims: [
        { key: 'paichusuo',  label: '派出所（治安管控）',   desc: '辖区刑事发案率、治安指数变化与群众安全感', weight: 0.30, compute: s => clampD(s.securityIndex * 0.85 + 15), warnLine: 40 },
        { key: 'xinfangshi', label: '信访室（矛盾化解）',   desc: '信访事项按期办结率、越级上访控制与群众满意度', weight: 0.25, compute: s => clampD(s.bossFavor * 0.8 + 20), warnLine: 35 },
        { key: 'jianchashi', label: '检察室（监督侦查）',   desc: '立案查处效率、案件移送规范率与公益诉讼质量', weight: 0.25, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 40 },
        { key: 'fazhiban',   label: '法制办（执法监督）',   desc: '规范性文件合规率、行政执法行为合规度', weight: 0.12, compute: s => clampD(s.moralValue * 0.85 + 15), warnLine: 35 },
        { key: 'anquanban',  label: '安全办（生产安全）',   desc: '重大安全生产事故发生率、隐患整改完成率', weight: 0.08, compute: s => clampD(s.securityIndex * 0.7 + 30), warnLine: 30 },
      ],
    },
    // ── 团派线：对应青年服务系统5个机构 ─────────────────────────────────────────
    league: {
      name: '团派线考核',
      dims: [
        { key: 'qingnianzhi',  label: '青年之家（服务阵地）',   desc: '就业创业咨询服务量、青年文化活动场次与覆盖率', weight: 0.25, compute: s => clampD(s.cityLivelihood * 0.85 + 15), warnLine: 30 },
        { key: 'zhiyuanzhan',  label: '志愿服务站（公益服务）',  desc: '志愿者队伍规模增长、应急志愿服务参与度', weight: 0.25, compute: s => clampD(s.bossFavor * 0.8 + 20), warnLine: 35 },
        { key: 'chuangyezx',   label: '青年创业中心（创业扶持）', desc: '孵化项目入驻数、创业担保贷款落实率', weight: 0.20, compute: s => clampD(s.cityBusiness * 0.75 + 25), warnLine: 30 },
        { key: 'xuesheng',     label: '学生联合会（权益保障）',  desc: '学生社会实践覆盖率、权益问题解决率', weight: 0.15, compute: s => clampD(s.meritPoints * 0.85 + 15), warnLine: 25 },
        { key: 'shequ',        label: '社区青年汇（基层治理）',  desc: '流动青年服务融入率、青年网格员覆盖密度', weight: 0.15, compute: s => clampD(s.securityIndex * 0.7 + 30), warnLine: 25 },
      ],
    },
    transport: {
      name: '交通运输局',
      dims: [
        { key: 'road_build', label: '路网建设进度', desc: '公路建设年度完成率，通村率', weight: 0.30, compute: s => clampD(s.cityGdp * 0.75 + 25), warnLine: 35 },
        { key: 'road_maint', label: '路况完好率', desc: '国省干线路面良好率，桥梁安全率', weight: 0.25, compute: s => clampD(s.cityBusiness * 0.8 + 20), warnLine: 30 },
        { key: 'traffic_safety', label: '交通安全管理', desc: '道路交通事故死亡人数同比降低', weight: 0.25, compute: s => clampD(s.securityIndex * 0.7 + 30), warnLine: 35 },
        { key: 'logistics', label: '物流保障能力', desc: '辖区重点物资运输保障率', weight: 0.20, compute: s => clampD(s.meritPoints * 0.75 + 25), warnLine: 25 },
      ],
    },
  };

  const spec = DEPT_DIMS[deptKey] ?? DEPT_DIMS['police'];
  const dims: DeptKpiDim[] = spec.dims.map(d => {
    const score = d.compute(s);
    return {
      key: d.key,
      label: d.label,
      desc: d.desc,
      weight: d.weight,
      score,
      warning: score < d.warnLine,
    };
  });

  const totalScore = Math.round(dims.reduce((acc, d) => acc + d.score * d.weight, 0));
  const eligible = totalScore >= THRESHOLD;
  const gaps: string[] = [];
  if (!eligible) gaps.push(`综合得分 ${totalScore}分，距及格线 ${THRESHOLD}分差 ${THRESHOLD - totalScore}分`);
  dims.filter(d => d.warning).forEach(d => gaps.push(`【${d.label}】处于低位预警`));

  return {
    deptKey,
    deptName: spec.name,
    totalScore,
    scoreThreshold: THRESHOLD,
    eligible,
    dims,
    gaps,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// 四条路线专属 KPI 晋升加成体系
// 综合路线积分 + 路线特化维度，输出 0-100 加成分影响晋升概率
// ═══════════════════════════════════════════════════════════════════════

export interface LineKpiSystem {
  lineName: string;
  totalBonus: number;       // 综合加成分 0-100
  bonusLabel: string;       // 等级标签
  promotionProbBonus: number; // 晋升概率加成百分比 0-30
  dims: { key: string; label: string; score: number; weight: number; tip: string }[];
  summary: string;
}

const clampK = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

/**
 * 计算四路线各自的KPI晋升加成体系
 * @param careerPath  'government' | 'party' | 'discipline' | 'league'
 * @param s           KpiSaveSnapshot
 * @returns           LineKpiSystem
 */
export function getLineKpiSystem(careerPath: string, s: KpiSaveSnapshot): LineKpiSystem {
  type Dim = { key: string; label: string; weight: number; score: number; tip: string };

  // ── 行政线：以施政成效为核心，重城市指标 ──────────────────────────────
  const govDims: Dim[] = [
    { key: 'gdp',       label: 'GDP经济增长',   weight: 0.30, score: clampK(s.cityGdp * 0.9 + 10),          tip: '辖区GDP增速与招商引资完成率' },
    { key: 'liveli',    label: '民生保障指数',  weight: 0.25, score: clampK(s.cityLivelihood * 0.85 + 15),   tip: '基础设施、医疗教育覆盖率' },
    { key: 'merit',     label: '政绩考核得分',  weight: 0.25, score: clampK(s.meritPoints * 0.8 + 20),       tip: '年度综合考核优秀度' },
    { key: 'ecology',   label: '生态文明建设',  weight: 0.10, score: clampK(s.cityEcology * 0.85 + 15),      tip: '环境质量达标率' },
    { key: 'business',  label: '营商环境评级',  weight: 0.10, score: clampK(s.cityBusiness * 0.8 + 20),      tip: '企业满意度、审批效率' },
  ];

  // ── 党务线：以党内政治生态为核心，重纪律与意识形态 ────────────────────
  const partyDims: Dim[] = [
    { key: 'moral',     label: '廉洁自律评估',  weight: 0.28, score: clampK(s.moralValue * 0.9 + 10),        tip: '党员自律、廉政记录' },
    { key: 'loyalty',   label: '组织忠诚度',    weight: 0.22, score: clampK(s.bossFavor * 0.85 + 15),        tip: '上级党组织评价、党纪执行' },
    { key: 'ideology',  label: '意识形态工作',  weight: 0.22, score: clampK(s.securityIndex * 0.7 + 30),     tip: '舆论引导、思想政治教育覆盖' },
    { key: 'orgbuild',  label: '基层党建质量',  weight: 0.13, score: clampK(s.meritPoints * 0.75 + 25),      tip: '党支部规范化、党员发展质量' },
    { key: 'linekpi',   label: '党务深度处置积分', weight: 0.15, score: clampK(s.lineKpiScore ?? 0),         tip: '党务深度玩法（组织建设/干部工作/宣传思想/党纪党规）行动处置积累' },
  ];

  // ── 纪检线：以廉洁执纪为核心，道德要求最严苛 ────────────────────────
  const disciplineDims: Dim[] = [
    { key: 'moral',     label: '自身廉洁操守',  weight: 0.30, score: clampK(s.moralValue * 0.95 + 5),        tip: '纪检干部自身廉洁情况（最严标准）' },
    { key: 'risk',      label: '自身巡视风险',  weight: 0.22, score: clampK(100 - (s.inspectionRisk ?? 10)), tip: '个人廉洁安全等级（越低越好）' },
    { key: 'enforce',   label: '执纪查案质量',  weight: 0.18, score: clampK(s.meritPoints * 0.75 + 25),      tip: '立案处置合规率、案件办结率' },
    { key: 'security',  label: '社会治安维护',  weight: 0.10, score: clampK(s.securityIndex * 0.8 + 20),     tip: '辖区治安稳定程度' },
    { key: 'linekpi',   label: '纪检深度处置积分', weight: 0.20, score: clampK(s.lineKpiScore ?? 0),         tip: '纪检深度玩法（巡视反腐/案件查处/廉政建设/专项整治）行动处置积累' },
  ];

  // ── 团派线：以群众基础与青年工作为核心，重公众口碑 ────────────────────
  const leagueDims: Dim[] = [
    { key: 'opinion',   label: '公众舆情指数',  weight: 0.27, score: clampK((s.publicOpinionIndex ?? 60)),   tip: '群众满意度、媒体舆论评价（来自舆情处置结果）' },
    { key: 'liveli',    label: '民生工作成效',  weight: 0.22, score: clampK(s.cityLivelihood * 0.9 + 10),    tip: '青年就业创业、民生改善指标' },
    { key: 'merit',     label: '政绩综合得分',  weight: 0.18, score: clampK(s.meritPoints * 0.8 + 20),       tip: '年度综合考核优秀度' },
    { key: 'favor',     label: '上级赏识度',    weight: 0.13, score: clampK(s.bossFavor * 0.85 + 15),        tip: '上级对工作的肯定程度' },
    { key: 'linekpi',   label: '团派深度处置积分', weight: 0.20, score: clampK(s.lineKpiScore ?? 0),         tip: '团派深度玩法（青年服务/社会工作/人才培养/团派深度）行动处置积累' },
  ];

  const PATH_CONFIG: Record<string, { name: string; dims: Dim[] }> = {
    government: { name: '行政线', dims: govDims },
    party:      { name: '党务线', dims: partyDims },
    discipline: { name: '纪检线', dims: disciplineDims },
    league:     { name: '团派线', dims: leagueDims },
  };

  const cfg = PATH_CONFIG[careerPath] ?? PATH_CONFIG.government;
  const totalBonus = Math.round(cfg.dims.reduce((acc, d) => acc + d.score * d.weight, 0));

  // 晋升概率加成：totalBonus 60以下无加成，60-80加成10-20%，80+加成20-30%
  const promotionProbBonus = totalBonus >= 80 ? Math.round(20 + (totalBonus - 80) * 0.5) :
                             totalBonus >= 60 ? Math.round((totalBonus - 60) * 0.5) : 0;

  const bonusLabel = totalBonus >= 85 ? '🌟 卓越' : totalBonus >= 70 ? '✅ 优良'
                   : totalBonus >= 55 ? '⚠️ 及格' : '❌ 不达标';

  const summary = totalBonus >= 80
    ? `${cfg.name}KPI表现优异，晋升概率+${promotionProbBonus}%`
    : totalBonus >= 60
      ? `${cfg.name}KPI基本达标，晋升有一定加成`
      : `${cfg.name}KPI表现不足，建议加强路线专属行动`;

  return { lineName: cfg.name, totalBonus, bonusLabel, promotionProbBonus, dims: cfg.dims, summary };
}

