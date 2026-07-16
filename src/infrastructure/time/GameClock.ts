import { RandomService } from '../../shared/kernel';
import type { Player, CityGovernance, MonthlyDelta, DeptAutoResult } from '../../shared/types';
import { KPIEngine } from '../../city/services/KPIEngine';

// ===== 计算结果类型 =====

export interface DailyTickResult {
  newGameDays: number;
  delta: MonthlyDelta;
}

export interface MonthlySettlementResult {
  newGameDays: number;
  delta: MonthlyDelta;
  isAnnualBonus: boolean;
  annualBonus: number;
  shouldCheckPromotion: boolean;
  massIncidentTriggered: boolean;
  briberyEventTriggered: boolean;
}

export interface AnnualCheckResult {
  year: number;
  needsKPIEvaluation: boolean;
  needsPromotionCheck: boolean;
  needsRetirementCheck: boolean;
}

// ===== 年度状态检查 =====

export function checkAnnualEvents(
  player: Player,
  city: CityGovernance,
  kpiEngine: KPIEngine
): AnnualCheckResult {
  const year = Math.floor(player.timeline.gameDays / 365);

  // 每年检查 KPI
  const needsKPIEvaluation = true;

  // 任期满足时检查晋升
  const needsPromotionCheck =
    player.career.rankLevel < 15 &&
    player.career.tenureYears >= 3 &&
    player.career.isPromotionAvailable !== undefined;

  // 60岁以上检查退休
  const playerAge = new Date().getFullYear() - player.profile.birthYear + Math.floor(player.timeline.gameDays / 365);
  const needsRetirementCheck = playerAge >= 60;

  return { year, needsKPIEvaluation, needsPromotionCheck, needsRetirementCheck };
}

// ===== 日推进 =====

export function performDailyTick(
  player: Player,
  city: CityGovernance,
  kpiEngine: KPIEngine,
  granularityDays: number = 30
): DailyTickResult {
  const newGameDays = player.timeline.gameDays + granularityDays;

  const delta = kpiEngine.calculateMonthlyDelta(city, player, []);

  return { newGameDays, delta };
}

// ===== 月结算 =====

export function performMonthlySettlement(
  player: Player,
  city: CityGovernance,
  kpiEngine: KPIEngine
): MonthlySettlementResult {
  const newGameDays = player.timeline.gameDays + 30;

  // 检查年度奖金月
  const isAnnualBonus = Math.floor(newGameDays / 365) > Math.floor(player.timeline.gameDays / 365);
  const annualBonus = isAnnualBonus ? kpiEngine.calculateMonthlyDelta(city, player, []).personalSavingsChange : 0;

  // 计算月增量
  const deptResults: DeptAutoResult[] = [];
  for (const _dept of city.departments) {
    deptResults.push({ fundBalance: 0, taxRevenue: 0, meritPoints: 0 });
  }

  const delta = kpiEngine.calculateMonthlyDelta(city, player, deptResults);

  // 每年的月底检查晋升
  const shouldCheckPromotion = Math.floor(newGameDays / 365) > Math.floor(player.timeline.gameDays / 365);

  return {
    newGameDays,
    delta,
    isAnnualBonus,
    annualBonus,
    shouldCheckPromotion,
    massIncidentTriggered: delta.massIncidentTriggered,
    briberyEventTriggered: delta.briberyEventTriggered,
  };
}

// ===== 应用月结算到 Player 状态 =====

export function applyMonthlySettlement(
  player: Player,
  result: MonthlySettlementResult
): Partial<Player> {
  const updates: Partial<Player> = {};

  updates.timeline = {
    ...player.timeline,
    gameDays: result.newGameDays,
    lastMonthDay: result.newGameDays,
  };

  updates.attributes = {
    ...player.attributes,
    meritPoints: (player.attributes.meritPoints ?? 0) + (result.delta.meritGain ?? 0),
    bossFavor: Math.min(100, Math.max(0, (player.attributes.bossFavor ?? 0) + (result.delta.bossFavorChange ?? 0))),
  };

  updates.resources = {
    ...player.resources,
    personalSavings: (player.resources.personalSavings ?? 0) + (result.delta.personalSavingsChange ?? 0),
    providentFundBalance: (player.resources.providentFundBalance ?? 0) + (result.delta.providentFundChange ?? 0),
    cityGovFund: Math.max(0, result.delta.cityGovFundBalance ?? player.resources.cityGovFund),
    fundBalance: (player.resources.fundBalance ?? 0) + (result.delta.fundBalanceChange ?? 0),
    taxRevenue: (player.resources.taxRevenue ?? 0) + (result.delta.taxRevenueChange ?? 0),
  };

  updates.political = {
    ...player.political,
    inspectionRisk: Math.min(100, Math.max(0, (player.political.inspectionRisk ?? 10) + (result.delta.inspectionRiskChange ?? 0))),
    briberyAccepted: (player.political.briberyAccepted ?? 0) + (result.delta.briberyEventTriggered ? 1 : 0),
  };

  if (result.shouldCheckPromotion) {
    updates.career = {
      ...player.career,
      tenureYears: (player.career.tenureYears ?? 0) + 1,
    };
  }

  return updates;
}

// ===== 完整 GameClock =====

export class GameClock {
  constructor(
    private readonly kpiEngine: KPIEngine,
    private readonly random: RandomService
  ) {}

  advanceOneMonth(
    player: Player,
    city: CityGovernance
  ): { playerUpdates: Partial<Player>; settlement: MonthlySettlementResult } {
    const settlement = performMonthlySettlement(player, city, this.kpiEngine);
    const playerUpdates = applyMonthlySettlement(player, settlement);
    return { playerUpdates, settlement };
  }
}