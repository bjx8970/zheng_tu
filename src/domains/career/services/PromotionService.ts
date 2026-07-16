import { Result, ok, err } from '../../shared/kernel';
import type { Player, PromotionReadiness, PromotionResult, CareerPath, RankLevel, CareerLine } from '../../shared/types';
import { KPIEngine } from '../../city/services/KPIEngine';
import { FormulaRegistry } from '../../city/formulas/FormulaRegistry';

// ===== Repository 接口（内联，避免缺失文件） =====

export interface LeadershipBandRepository {
  findByPlayerId(playerId: string): Promise<{ members: Array<{ id: string; name: string; loyalty: number; ability: number; integrity: number; positionKey: string }> } | null>;
}

export interface FactionRepository {
  findByPlayerId(playerId: string): Promise<unknown | null>;
}

// ===== 配置 =====

export interface PromotionConfig {
  maxRank: number;
  forkRanks: RankLevel[];
  exceptionalBaseChance: number;
}

export interface RankConfigInternal {
  rankLevel: number;
  name: string;
  requiredMerit: number;
  requiredTenureYears: number;
  maxTenureYears: number;
  minAge: number;
  requiredAbility: number;
  isFork: boolean;
  converges: boolean;
}

// ===== PromotionService =====

export class PromotionService {
  private readonly rankConfigs: Map<number, RankConfigInternal> = new Map();

  constructor(
    private readonly bandRepo: LeadershipBandRepository,
    private readonly factionRepo: FactionRepository,
    private readonly kpiEngine: KPIEngine,
    private readonly formulaRegistry: FormulaRegistry,
    private readonly config: PromotionConfig
  ) {
    this.loadRankConfigs();
  }

  private loadRankConfigs(): void {
    const configs: RankConfigInternal[] = [
      { rankLevel: 1, name: '科员', requiredMerit: 50, requiredTenureYears: 3, maxTenureYears: 3, minAge: 22, requiredAbility: 30, isFork: false, converges: false },
      { rankLevel: 2, name: '办事员', requiredMerit: 80, requiredTenureYears: 3, maxTenureYears: 3, minAge: 22, requiredAbility: 35, isFork: false, converges: false },
      { rankLevel: 3, name: '主任科员', requiredMerit: 120, requiredTenureYears: 4, maxTenureYears: 4, minAge: 25, requiredAbility: 35, isFork: false, converges: false },
      { rankLevel: 4, name: '副科级', requiredMerit: 200, requiredTenureYears: 5, maxTenureYears: 5, minAge: 27, requiredAbility: 40, isFork: false, converges: false },
      { rankLevel: 5, name: '正科级', requiredMerit: 350, requiredTenureYears: 5, maxTenureYears: 5, minAge: 30, requiredAbility: 40, isFork: false, converges: false },
      { rankLevel: 6, name: '县委书记/县长', requiredMerit: 600, requiredTenureYears: 5, maxTenureYears: 5, minAge: 32, requiredAbility: 45, isFork: true, converges: false },
      { rankLevel: 7, name: '副厅级', requiredMerit: 1000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 35, requiredAbility: 50, isFork: false, converges: false },
      { rankLevel: 8, name: '正厅级', requiredMerit: 1600, requiredTenureYears: 5, maxTenureYears: 5, minAge: 40, requiredAbility: 55, isFork: false, converges: false },
      { rankLevel: 9, name: '市委书记/市长', requiredMerit: 2500, requiredTenureYears: 5, maxTenureYears: 5, minAge: 42, requiredAbility: 60, isFork: true, converges: false },
      { rankLevel: 10, name: '副部级', requiredMerit: 4000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 45, requiredAbility: 60, isFork: false, converges: true },
      { rankLevel: 11, name: '正部级', requiredMerit: 6000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 48, requiredAbility: 65, isFork: false, converges: true },
      { rankLevel: 12, name: '副国级', requiredMerit: 9000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 50, requiredAbility: 70, isFork: false, converges: true },
      { rankLevel: 13, name: '正国级', requiredMerit: 13000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 52, requiredAbility: 75, isFork: false, converges: true },
      { rankLevel: 14, name: '副国家级', requiredMerit: 18000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 55, requiredAbility: 80, isFork: false, converges: true },
      { rankLevel: 15, name: '正国家级', requiredMerit: 25000, requiredTenureYears: 5, maxTenureYears: 5, minAge: 58, requiredAbility: 85, isFork: false, converges: true },
    ];

    for (const c of configs) this.rankConfigs.set(c.rankLevel, c);
  }

  getRankConfig(rankLevel: number): RankConfigInternal | undefined {
    return this.rankConfigs.get(rankLevel);
  }

  evaluateReadiness(player: Player): PromotionReadiness {
    const currentRank = player.career.rankLevel;
    const nextRank = currentRank + 1;
    const currentConfig = this.rankConfigs.get(currentRank);
    const nextConfig = this.rankConfigs.get(nextRank);

    if (!currentConfig || !nextConfig) {
      return { ready: false, reasons: ['职级配置缺失'], hardRequirements: {} as any, softRequirements: {} as any };
    }

    const reasons: string[] = [];
    const hard: PromotionReadiness['hardRequirements'] = {
      tenure: false, kpi: false, certificate: false, age: false, ability: false, integrity: false,
    };
    const soft: PromotionReadiness['softRequirements'] = {
      vote: false, congress: false, massIncident: false,
    };

    // 1. 基础资格
    if (currentRank >= this.config.maxRank) {
      reasons.push('已达最高职级');
      return { ready: false, reasons, hardRequirements: hard, softRequirements: soft };
    }
    if (!player.career.isPromotionAvailable) {
      reasons.push('组织部未放行晋升名额');
    }

    // 2. 任期
    hard.tenure = player.career.tenureYears >= currentConfig.requiredTenureYears;
    if (!hard.tenure) reasons.push(`任期不足（${player.career.tenureYears}/${currentConfig.requiredTenureYears}年）`);

    // 3. KPI
    const kpiResult = this.kpiEngine.evaluateAnnualKPI({} as any, player);
    hard.kpi = kpiResult.eligible;
    if (!hard.kpi) reasons.push(`年度考核不合格（综合${kpiResult.overall.toFixed(1)}分）`);

    // 4. 党校证书
    hard.certificate = player.career.certificates.some((c: { partySchoolLevel: number; requiredLevel: number }) => c.partySchoolLevel >= c.requiredLevel);
    if (!hard.certificate) reasons.push('党校证书等级不足');

    // 5. 年龄
    const playerAge = this.calculateAge(player);
    hard.age = playerAge >= nextConfig.minAge;
    if (!hard.age) reasons.push(`年龄未达标（当前${playerAge}岁，需≥${nextConfig.minAge}岁）`);

    // 6. 能力值
    hard.ability = player.attributes.abilityValue >= nextConfig.requiredAbility;
    if (!hard.ability) reasons.push(`能力值不足（当前${player.attributes.abilityValue}，需≥${nextConfig.requiredAbility}）`);

    // 7. 廉洁度
    hard.integrity = player.attributes.moralValue >= 40;
    if (!hard.integrity) reasons.push(`廉洁度不足（当前${player.attributes.moralValue}，需≥40）`);

    // 8. 软性：投票（副部级）
    if (currentRank === 13) {
      soft.vote = player.political.voteSupport >= 65;
      if (!soft.vote) reasons.push('领导人投票支持率不足65%');
    } else {
      soft.vote = true;
    }

    // 9. 软性：党代会（正部级）
    if (currentRank === 14) {
      soft.congress = player.political.partyCongressVote >= 75;
      if (!soft.congress) reasons.push('党代会投票不足75%');
    } else {
      soft.congress = true;
    }

    // 10. 软性：重大舆情
    const requiredMassIncidents = this.getRequiredMassIncidents(currentRank);
    soft.massIncident = (player.timeline.massIncidentCount ?? 0) >= requiredMassIncidents;
    if (!soft.massIncident) reasons.push(`重大舆情处置不足（${player.timeline.massIncidentCount ?? 0}/${requiredMassIncidents}起）`);

    const ready = hard.tenure && hard.kpi && hard.certificate && hard.age && hard.ability && hard.integrity && soft.vote && soft.congress && soft.massIncident;

    return { ready, nextRank: ready ? (nextRank as RankLevel) : undefined, reasons, hardRequirements: hard, softRequirements: soft };
  }

  async executePromotion(player: Player, chosenPath: CareerPath): Promise<PromotionResult> {
    const readiness = this.evaluateReadiness(player);
    if (!readiness.ready) {
      return { success: false, error: readiness.reasons.join('；'), requiresFollowDecision: false, requiresSecretaryPick: false };
    }

    const newRank = readiness.nextRank!;
    const newConfig = this.rankConfigs.get(newRank)!;
    const isFork = newConfig.isFork;

    let newCity = player.career.cityName;
    if (isFork) {
      newCity = this.generateNewCity(newRank);
    }

    const newPosition = newConfig.name;
    const newRankName = newConfig.name;

    const followCandidates = await this.getFollowCandidates(player.id, newRank);
    const secretaryCandidates = newRank >= 8 ? await this.getSecretaryCandidates(player.id) : [];

    return {
      success: true,
      newRankName,
      requiresFollowDecision: followCandidates.length > 0,
      followCandidates: followCandidates.map((c: { id: string; name: string; loyalty: number }) => ({ id: c.id, name: c.name, loyalty: c.loyalty })),
      requiresSecretaryPick: secretaryCandidates.length > 0,
      secretaryCandidates: secretaryCandidates.map((c: { id: string; name: string; ability: number }) => ({ id: c.id, name: c.name, ability: c.ability })),
    };
  }

  private calculateAge(player: Player): number {
    const birthYear = player.profile.birthYear;
    const currentYear = new Date().getFullYear();
    const gameYears = Math.floor(player.timeline.gameDays / 365);
    return currentYear - birthYear + gameYears;
  }

  private getRequiredMassIncidents(rank: number): number {
    if (rank === 9) return 1;
    if (rank === 10) return 2;
    if (rank >= 11) return 3;
    return 0;
  }

  private generateNewCity(rank: number): string {
    const pools: Record<number, string[]> = {
      6: ['某县', '某区'],
      9: ['某市', '某地级市'],
      12: ['某省', '某直辖市'],
    };
    const pool = pools[rank] || ['某地'];
    return pool[Math.floor(Math.random() * pool.length)];
  }

  private async getFollowCandidates(playerId: string, newRank: number) {
    const band = await this.bandRepo.findByPlayerId(playerId);
    if (!band) return [];
    return band.members
      .filter((m: { loyalty: number; ability: number }) => m.loyalty >= 70 && m.ability >= 50)
      .sort((a: { loyalty: number }, b: { loyalty: number }) => b.loyalty - a.loyalty)
      .slice(0, 5);
  }

  private async getSecretaryCandidates(playerId: string) {
    const band = await this.bandRepo.findByPlayerId(playerId);
    if (!band) return [];
    return band.members
      .filter((m: { ability: number; integrity: number }) => m.ability >= 60 && m.integrity >= 55)
      .sort((a: { ability: number }, b: { ability: number }) => b.ability - a.ability)
      .slice(0, 10);
  }
}