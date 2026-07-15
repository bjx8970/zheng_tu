import type { PlayerSave } from '@/types/game';

// ===== 基础类型 =====

export type AdminLevel =
  | 'township'    // 乡镇/街道
  | 'county'      // 县/区
  | 'city'        // 地级市
  | 'subProvince' // 副省级城市
  | 'province'    // 省/直辖市
  | 'ministry'    // 部委
  | 'central';    // 中央/国家级

export type CareerLine = 'party' | 'government' | 'discipline' | 'league';

export type CareerPath = CareerLine | 'converged';

export type TimeGranularity = 'day' | 'week' | 'month';

export type RankLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15;

// ===== 职级配置 =====

export interface RankConfig {
  name: string;
  cityType: string;
  requiredMerit: number;
  requiredTenureYears: number;
  maxTenureYears: number;
  randomCity: boolean;
  bossTitle: string;
  bossTitle2: string;
  bossTitle3: string;
  department: string;
}

// ===== 核心聚合类型（领域层使用，比 game.ts 更精简）=====

export interface PlayerProfile {
  playerName: string;
  avatarId: number;
  avatarUrl: string;
  gender: 'male' | 'female';
  birthYear: number;
  birthProvince: string;
  birthCity: string;
  universityName: string;
}

export interface CareerState {
  rankLevel: RankLevel;
  rankName: string;
  careerPath: CareerPath;
  careerPathLine: CareerLine;
  playerPosition: string;
  cityName: string;
  cityType: string;
  tenureYears: number;
  isPromotionAvailable: boolean;
  promotionReadyAt: string | null;
  preferredCareerLine: CareerLine | null;
}

export interface Attributes {
  abilityValue: number;
  moralValue: number;
  healthValue: number;
  meritPoints: number;
  bossFavor: number;
  boss2Favor: number;
  boss3Favor: number;
}

export interface Resources {
  personalSavings: number;
  providentFundBalance: number;
  grayIncome: number;
  cityGovFund: number;
  fundBalance: number;
  taxRevenue: number;
}

export interface PoliticalState {
  primaryFaction: string | null;
  factionInternalRank: 'member' | 'backbone' | 'leader' | null;
  factionPoints: number;
  inspectionRisk: number;
  briberyAccepted: number;
  exceptionalAgeOverrideCount: number;
  partyCongressVote: number;
  voteSupport: number;
}

export interface GameTimeline {
  gameDays: number;
  lastMonthDay: number;
  lastSalaryDay: number;
  lastAnnualBonusDay: number;
  retirementAge: number;
  isRetired: boolean;
}

export interface Player extends Omit<PlayerSave, 'id' | 'userId' | 'createdAt' | 'updatedAt'> {
  id: string;
  userId: string;
  version: number;
  profile: PlayerProfile;
  career: CareerState;
  attributes: Attributes;
  resources: Resources;
  political: PoliticalState;
  timeline: GameTimeline;
}

// ===== 领域事件 =====

export interface PlayerPromotedEvent {
  type: 'PLAYER_PROMOTED';
  payload: {
    playerId: string;
    oldRank: RankLevel;
    newRank: RankLevel;
    oldCity: string;
    newCity: string;
    chosenPath: CareerPath;
    followCandidates: string[];
    secretaryCandidates: string[];
  };
}

export interface CityFundConsumedEvent {
  type: 'CITY_FUND_CONSUMED';
  payload: {
    playerId: string;
    amount: number;
    purpose: string;
    oldBalance: number;
    newBalance: number;
  };
}

export interface MassIncidentTriggeredEvent {
  type: 'MASS_INCIDENT_TRIGGERED';
  payload: {
    playerId: string;
    incidentId: string;
    severity: 'low' | 'medium' | 'high';
    deadlineDays: number;
  };
}

export interface BriberyExposedEvent {
  type: 'BRIBERY_EXPOSED';
  payload: {
    playerId: string;
    level: 'warning' | 'suspend' | 'case';
    penalty: Record<string, number>;
  };
}

export interface MonthlySettlementEvent {
  type: 'MONTHLY_SETTLEMENT_COMPLETED';
  payload: {
    playerId: string;
    month: number;
    indicators: Record<string, number>;
    fundChanges: Record<string, number>;
  };
}

export type DomainEvent =
  | PlayerPromotedEvent
  | CityFundConsumedEvent
  | MassIncidentTriggeredEvent
  | BriberyExposedEvent
  | MonthlySettlementEvent;

// ===== 结果类型 =====

export interface PromotionReadiness {
  ready: boolean;
  nextRank?: RankLevel;
  reasons: string[];
  hardRequirements: {
    tenure: boolean;
    kpi: boolean;
    certificate: boolean;
    age: boolean;
    ability: boolean;
    integrity: boolean;
  };
  softRequirements: {
    vote: boolean;
    congress: boolean;
    massIncident: boolean;
  };
}

export interface PromotionResult {
  success: boolean;
  event?: PlayerPromotedEvent;
  newRankName?: string;
  requiresFollowDecision: boolean;
  followCandidates?: Array<{ id: string; name: string; loyalty: number }>;
  requiresSecretaryPick: boolean;
  secretaryCandidates?: Array<{ id: string; name: string; ability: number }>;
  error?: string;
}

export interface PolicyResult {
  success: boolean;
  effects: Record<string, number>;
  cost?: { type: 'merit' | 'cityFund' | 'personalFund'; amount: number };
  error?: string;
}