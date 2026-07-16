import { AggregateRoot, ValueObject, Result, ok, err } from '../../shared/kernel';
import type { RankLevel, CareerLine, CareerPath, Player, PromotionReadiness, PromotionResult, PlayerPromotedEvent } from '../../shared/types';
import type { LeadershipBand } from '../../personnel/entities/LeadershipBand';

// ===== 值对象 =====

export interface TenureProps {
  years: number;
  maxYears: number;
  startDay: number;
}

export class Tenure extends ValueObject<TenureProps> {
  get years(): number { return this.props.years; }
  get maxYears(): number { return this.props.maxYears; }
  get isExpired(): boolean { return this.props.years >= this.props.maxYears; }
  get progress(): number { return Math.min(1, this.props.years / this.props.maxYears); }
  get startDay(): number { return this.props.startDay; }

  static create(years: number, maxYears: number, startDay: number): Tenure {
    return new Tenure({ years, maxYears, startDay });
  }

  advanceOneYear(): Tenure {
    return new Tenure({ ...this.props, years: this.props.years + 1 });
  }
}

export interface CertificateProps {
  partySchoolLevel: number;
  requiredLevel: number;
  obtainedAt: number | null;
}

export class PartySchoolCertificate extends ValueObject<CertificateProps> {
  get isQualified(): boolean { return this.props.partySchoolLevel >= this.props.requiredLevel; }
  get level(): number { return this.props.partySchoolLevel; }
  get requiredLevel(): number { return this.props.requiredLevel; }

  static create(level: number, requiredLevel: number, obtainedAt: number | null): PartySchoolCertificate {
    return new PartySchoolCertificate({ partySchoolLevel: level, requiredLevel, obtainedAt });
  }
}

export interface KPIScoreProps {
  gdp: number;
  livelihood: number;
  ecology: number;
  business: number;
  security: number;
  overall: number;
  eligible: boolean;
}

export class KPIScore extends ValueObject<KPIScoreProps> {
  get overall(): number { return this.props.overall; }
  get eligible(): boolean { return this.props.eligible; }

  static calculate(indicators: KPIScoreProps): KPIScore {
    const overall = (indicators.gdp + indicators.livelihood + indicators.ecology + indicators.business + indicators.security) / 5;
    return new KPIScore({ ...indicators, overall, eligible: overall >= 60 });
  }
}

// ===== 聚合根：PlayerCareer =====

export interface CareerStateProps {
  rankLevel: RankLevel;
  rankName: string;
  careerPath: CareerPath;
  careerPathLine: CareerLine;
  playerPosition: string;
  cityName: string;
  tenure: Tenure;
  certificates: PartySchoolCertificate[];
  isPromotionAvailable: boolean;
  preferredCareerLine: CareerLine | null;
}

export class PlayerCareer extends AggregateRoot<CareerStateProps & { id: string; version: number }> {
  private constructor(props: CareerStateProps & { id: string; version: number }) {
    super(props);
  }

  static create(id: string, initial: CareerStateProps): PlayerCareer {
    return new PlayerCareer({ ...initial, id, version: 1 });
  }

  get rankLevel(): RankLevel { return this.props.rankLevel; }
  get rankName(): string { return this.props.rankName; }
  get careerPath(): CareerPath { return this.props.careerPath; }
  get careerPathLine(): CareerLine { return this.props.careerPathLine; }
  get tenure(): Tenure { return this.props.tenure; }
  get certificates(): PartySchoolCertificate[] { return this.props.certificates; }
  get isPromotionAvailable(): boolean { return this.props.isPromotionAvailable; }

  evaluatePromotionReadiness(
    kpiScore: KPIScore,
    age: number,
    abilityValue: number,
    moralValue: number,
    massIncidentCount: number,
    voteSupport: number,
    partyCongressVote: number
  ): PromotionReadiness {
    const reasons: string[] = [];

    // 硬性条件
    const tenureOk = this.props.tenure.years >= this.props.tenure.maxYears;
    if (!tenureOk) reasons.push(`任期不足（${this.props.tenure.years}/${this.props.tenure.maxYears}年）`);

    const kpiOk = kpiScore.eligible;
    if (!kpiOk) reasons.push(`KPI不达标（综合${kpiScore.overall.toFixed(1)}分，需≥60）`);

    const certOk = this.props.certificates.some((c: PartySchoolCertificate) => c.isQualified);
    if (!certOk) reasons.push('党校证书等级不足');

    // 年龄门槛
    const minAgeForRank = this.getMinAgeForNextRank();
    const ageOk = age >= minAgeForRank;
    if (!ageOk) reasons.push(`年龄未达标（当前${age}岁，需≥${minAgeForRank}岁）`);

    const abilityOk = abilityValue >= this.getRequiredAbility();
    if (!abilityOk) reasons.push(`能力值不足（当前${abilityValue}，需≥${this.getRequiredAbility()}）`);

    const integrityOk = moralValue >= this.getRequiredIntegrity();
    if (!integrityOk) reasons.push(`廉洁度不足（当前${moralValue}，需≥${this.getRequiredIntegrity()}）`);

    // 软性条件
    const voteOk = this.props.rankLevel !== 13 || voteSupport >= 65;
    if (!voteOk) reasons.push('领导人投票支持率不足65%');

    const congressOk = this.props.rankLevel !== 14 || partyCongressVote >= 75;
    if (!congressOk) reasons.push('党代会投票不足75%');

    const massIncidentRequired = this.getRequiredMassIncidents();
    const massIncidentOk = massIncidentCount >= massIncidentRequired;
    if (!massIncidentOk) reasons.push(`重大舆情处置不足（${massIncidentCount}/${massIncidentRequired}起）`);

    const ready = tenureOk && kpiOk && certOk && ageOk && abilityOk && integrityOk && voteOk && congressOk && massIncidentOk;

    return {
      ready,
      nextRank: ready ? (this.props.rankLevel + 1 as RankLevel) : undefined,
      reasons,
      hardRequirements: { tenure: tenureOk, kpi: kpiOk, certificate: certOk, age: ageOk, ability: abilityOk, integrity: integrityOk },
      softRequirements: { vote: voteOk, congress: congressOk, massIncident: massIncidentOk },
    };
  }

  private getMinAgeForNextRank(): number {
    const ages: Record<number, number> = {
      1: 22, 2: 22, 3: 25, 4: 27, 5: 30, 6: 32, 7: 35, 8: 40,
      9: 42, 10: 45, 11: 48, 12: 50, 13: 52, 14: 55, 15: 58,
    };
    return ages[this.props.rankLevel + 1] ?? 60;
  }

  private getRequiredAbility(): number {
    const abilities: Record<number, number> = {
      1: 30, 2: 35, 3: 35, 4: 40, 5: 40, 6: 45, 7: 50, 8: 55,
      9: 60, 10: 60, 11: 65, 12: 70, 13: 75, 14: 80, 15: 85,
    };
    return abilities[this.props.rankLevel + 1] ?? 90;
  }

  private getRequiredIntegrity(): number {
    const integrity: Record<CareerLine, Record<number, number>> = {
      party:    { 1: 40, 2: 40, 3: 42, 4: 45, 5: 48, 6: 50, 7: 52, 8: 55, 9: 55, 10: 58, 11: 60, 12: 62, 13: 65, 14: 68, 15: 70 },
      government: { 1: 35, 2: 35, 3: 38, 4: 40, 5: 42, 6: 45, 7: 48, 8: 50, 9: 50, 10: 52, 11: 55, 12: 58, 13: 60, 14: 62, 15: 65 },
      discipline: { 1: 50, 2: 50, 3: 52, 4: 55, 5: 55, 6: 58, 7: 60, 8: 62, 9: 62, 10: 65, 11: 68, 12: 70, 13: 72, 14: 75, 15: 78 },
      league:   { 1: 30, 2: 30, 3: 35, 4: 38, 5: 40, 6: 42, 7: 45, 8: 48, 9: 48, 10: 50, 11: 52, 12: 55, 13: 58, 14: 60, 15: 62 },
    };
    return integrity[this.props.careerPathLine]?.[this.props.rankLevel + 1] ?? 40;
  }

  private getRequiredMassIncidents(): number {
    if (this.props.rankLevel === 9) return 1;
    if (this.props.rankLevel === 10) return 2;
    if (this.props.rankLevel >= 11) return 3;
    return 0;
  }

  // 领域行为：晋升
  promote(
    newRank: RankLevel,
    newRankName: string,
    newCity: string,
    newPosition: string,
    chosenPath: CareerPath,
    followCandidates: string[],
    secretaryCandidates: string[]
  ): Result<PlayerPromotedEvent> {
    if (this.props.rankLevel >= 15) return err(new Error('已达最高职级'));

    const oldRank = this.props.rankLevel;
    const oldCity = this.props.cityName;

    this.props.rankLevel = newRank;
    this.props.rankName = newRankName;
    this.props.cityName = newCity;
    this.props.playerPosition = newPosition;
    this.props.careerPath = chosenPath;
    this.props.tenure = Tenure.create(0, this.getMaxTenureForRank(newRank), this.props.tenure.startDay + 365);
    this.props.isPromotionAvailable = false;
    this.incrementVersion();

    const event: PlayerPromotedEvent = {
      type: 'PLAYER_PROMOTED',
      occurredAt: new Date(),
      eventId: `${this.id}-${Date.now()}`,
      payload: {
        playerId: this.id,
        oldRank,
        newRank,
        oldCity,
        newCity,
        chosenPath,
        followCandidates,
        secretaryCandidates,
      },
    };
    this.addEvent(event);
    return ok(event);
  }

  setPromotionAvailable(available: boolean): void {
    this.props.isPromotionAvailable = available;
    this.incrementVersion();
  }

  addCertificate(cert: PartySchoolCertificate): void {
    this.props.certificates.push(cert);
    this.incrementVersion();
  }

  advanceTenure(): void {
    this.props.tenure = this.props.tenure.advanceOneYear();
    this.incrementVersion();
  }

  private getMaxTenureForRank(rank: RankLevel): number {
    const maxTenure: Record<number, number> = {
      1: 3, 2: 3, 3: 4, 4: 5, 5: 5, 6: 5, 7: 5, 8: 5,
      9: 5, 10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5,
    };
    return maxTenure[rank] ?? 5;
  }
}