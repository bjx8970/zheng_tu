import { Result, ok, err, RandomService } from '../../shared/kernel';
import type { Player, CityGovernance, DailyDelta, MonthlyDelta, KPIResult, DeptAutoResult, DeptKpiResult, CityIndicators } from '../../shared/types';
import { FormulaRegistry } from '../formulas/FormulaRegistry';

export class KPIEngine {
  constructor(
    private readonly deptConfigs: Map<string, DeptConfig>,
    private readonly formulaRegistry: FormulaRegistry,
    private readonly random: RandomService
  ) {}

  calculateDailyDelta(city: CityGovernance, player: Player): DailyDelta {
    const baseRate = player.career.rankLevel * 0.5;
    const deptBonus = this.calculateDeptDailyBonus(city, player);

    return {
      gameDays: 1,
      meritGain: Math.floor(baseRate * 2 + deptBonus.merit),
      fundBalanceChange: deptBonus.fund,
      taxRevenueChange: deptBonus.tax,
      indicatorDrifts: this.calculateIndicatorDrifts(city, player, 'daily'),
      bossFavorChange: this.calculateBossFavorDaily(player),
      securityIndexChange: this.calculateSecurityDaily(city),
    };
  }

  calculateMonthlyDelta(
    city: CityGovernance,
    player: Player,
    deptResults: DeptAutoResult[]
  ): MonthlyDelta {
    const monthlySalary = this.getMonthlySalary(player.career.rankLevel);
    const annualBonus = this.isAnnualBonusMonth(player.timeline.gameDays) 
      ? this.getAnnualBonus(player.career.rankLevel) : 0;
    const hpf = this.getMonthlyHPF(player.career.rankLevel);

    const deptFund = deptResults.reduce((sum, r) => sum + r.fundBalance, 0);
    const deptMerit = deptResults.reduce((sum, r) => sum + r.meritPoints, 0);

    const cityGovFund = this.calculateCityGovFundMonthly(city, player);

    return {
      gameDays: 30,
      personalSavingsChange: monthlySalary + annualBonus,
      providentFundChange: hpf,
      meritGain: deptMerit,
      cityGovFundChange: cityGovFund.netChange,
      cityGovFundBalance: cityGovFund.newBalance,
      fundBalanceChange: deptFund,
      taxRevenueChange: deptResults.reduce((s: number, r: { taxRevenue: number }) => s + r.taxRevenue, 0),
      indicatorDrifts: this.calculateIndicatorDrifts(city, player, 'monthly'),
      bossFavorChange: this.calculateBossFavorMonthly(player),
      securityIndexChange: this.calculateSecurityMonthly(city),
      publicOpinionChange: this.calculatePublicOpinionMonthly(city),
      inspectionRiskChange: this.calculateInspectionRiskMonthly(player),
      massIncidentTriggered: this.checkMassIncidentTrigger(),
      briberyEventTriggered: this.checkBriberyEventTrigger(player),
    };
  }

  evaluateAnnualKPI(city: CityGovernance, player: Player): KPIResult {
    const weights = { gdp: 0.25, livelihood: 0.2, ecology: 0.2, business: 0.2, security: 0.15 };
    const scores = {
      gdp: city.indicators.gdp,
      livelihood: city.indicators.livelihood,
      ecology: city.indicators.ecology,
      business: city.indicators.business,
      security: city.indicators.security,
    };

    const weightedScore = Object.entries(scores).reduce(
      (sum: number, [k, v]) => sum + v * weights[k as keyof typeof weights], 0
    );

    const eligible = weightedScore >= 60;
    const grade = eligible 
      ? weightedScore >= 85 ? '优秀' : weightedScore >= 75 ? '良好' : '合格'
      : '不合格';

    return {
      eligible,
      overall: weightedScore,
      breakdown: scores,
      grade,
      details: this.generateKPIDetails(city, player, scores),
    };
  }

  private calculateIndicatorDrifts(city: CityGovernance, player: Player, granularity: 'daily' | 'monthly') {
    const factor = granularity === 'daily' ? 1/30 : 1;
    const drifts: Record<string, number> = {};
    
    for (const [key] of Object.entries(city.indicators) as [keyof CityIndicators, number][]) {
      const drift = (this.random.next() * 15 - 10) * factor;
      drifts[key] = Math.max(-5, Math.min(5, Math.round(drift * 10) / 10));
    }
    return drifts;
  }

  private calculateDeptDailyBonus(city: CityGovernance, player: Player) {
    let merit = 0, fund = 0, tax = 0;
    for (const dept of city.departments) {
      const config = this.deptConfigs.get(dept.key);
      if (!config) continue;
      const multiplier = this.getRankFundMultiplier(player.career.rankLevel);
      const dailyFund = config.baseFund / 30 * multiplier;
      fund += dailyFund;
      tax += config.baseTax / 30 * multiplier;
      merit += config.baseMerit / 30;
    }
    return { merit: Math.round(merit), fund: Math.round(fund * 10) / 10, tax: Math.round(tax * 10) / 10 };
  }

  private getMonthlySalary(rank: number): number {
    const base = [0, 3000, 3500, 4500, 6000, 8000, 10000, 13000, 16000, 20000, 25000, 32000, 40000, 50000, 65000, 80000];
    return base[rank] ?? 3000;
  }

  private isAnnualBonusMonth(gameDays: number): boolean {
    return Math.floor(gameDays / 365) > Math.floor((gameDays - 30) / 365);
  }

  private getAnnualBonus(rank: number): number {
    const months = [0, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8];
    const salary = this.getMonthlySalary(rank);
    return salary * (months[rank] ?? 2);
  }

  private getMonthlyHPF(rank: number): number {
    const base = [0, 1200, 1400, 1800, 2400, 3200, 4000, 5200, 6400, 8000, 10000, 12800, 16000, 20000, 26000, 32000];
    return base[rank] ?? 1200;
  }

  private getRankFundMultiplier(rank: number): number {
    const mult: Record<number, number> = { 1: 0.5, 2: 0.6, 3: 0.7, 4: 0.8, 5: 1.0, 6: 1.2, 7: 1.5, 8: 2.0, 9: 2.5, 10: 3.0, 11: 4.0, 12: 5.0, 13: 6.0, 14: 8.0, 15: 10.0 };
    return mult[rank] ?? 1.0;
  }

  private calculateCityGovFundMonthly(city: CityGovernance, player: Player) {
    const base = city.fundAccount.cityGovFund;
    const grant = Math.floor(50 + this.random.next() * Math.min(450, player.career.rankLevel * 40));
    const maintenance = Math.floor(100 + this.random.next() * 300);
    const netChange = grant - maintenance;
    return {
      grant,
      maintenance,
      netChange,
      newBalance: Math.max(0, base + netChange),
    };
  }

  private calculateBossFavorDaily(player: Player): number {
    return this.random.next() > 0.7 ? 1 : 0;
  }

  private calculateBossFavorMonthly(player: Player): number {
    return Math.floor(this.random.next() * 3) - 1;
  }

  private calculateSecurityDaily(_city: CityGovernance): number {
    return (this.random.next() - 0.5) * 0.5;
  }

  private calculateSecurityMonthly(_city: CityGovernance): number {
    return Math.floor(this.random.next() * 5) - 2;
  }

  private calculatePublicOpinionMonthly(city: CityGovernance): number {
    const base = -(2 + Math.floor(this.random.next() * 3));
    const massIncidentPenalty = (city.massIncidentPending ?? 0) > 0 ? -3 : 0;
    return Math.min(0, base + massIncidentPenalty);
  }

  private calculateInspectionRiskMonthly(player: Player): number {
    let risk = 1 + Math.floor(this.random.next() * 4);
    if ((player.political.briberyAccepted ?? 0) > 5) risk += 3;
    risk -= (player.political.protectionUmbrellaLevel ?? 0) * 2;
    if (player.political.factionInternalRank === 'leader') risk -= 5;
    else if (player.political.factionInternalRank === 'backbone') risk -= 2;
    return Math.max(0, Math.min(100, risk));
  }

  private checkMassIncidentTrigger(): boolean {
    return this.random.next() < 0.10;
  }

  private checkBriberyEventTrigger(player: Player): boolean {
    return !player.political.pendingBriberyEvent && this.random.next() < 0.15;
  }

  private generateKPIDetails(_city: CityGovernance, _player: Player, scores: KPIResult['breakdown']): string[] {
    return Object.entries(scores).map(([k, v]) => 
      `${k}: ${v}分 ${v >= 60 ? '✓' : '✗'}`
    );
  }
}

export interface DeptConfig {
  key: string;
  baseFund: number;
  baseTax: number;
  baseMerit: number;
}

export interface CityIndicators {
  gdp: number;
  livelihood: number;
  ecology: number;
  business: number;
  security: number;
}