// ===== 基础类型 =====

export type AdminLevel =
  | 'township'
  | 'county'
  | 'city'
  | 'subProvince'
  | 'province'
  | 'ministry'
  | 'central';

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

// ===== 核心聚合类型 =====

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

export interface CertificateInfo {
  partySchoolLevel: number;
  requiredLevel: number;
  obtainedAt: number | null;
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
  tenureMaxYears: number;
  tenureStartDay: number;
  certificates: CertificateInfo[];
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
  protectionUmbrellaLevel?: number;
  pendingBriberyEvent?: unknown;
  massIncidentCount?: number;
}

export interface GameTimeline {
  gameDays: number;
  lastMonthDay: number;
  lastSalaryDay: number;
  lastAnnualBonusDay: number;
  retirementAge: number;
  isRetired: boolean;
  massIncidentCount?: number;
}

// ===== Player 聚合 =====

export interface Player {
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

// ===== Player Patches（部分更新） =====

export interface PlayerPatches {
  career?: Partial<CareerState>;
  attributes?: Partial<Attributes>;
  resources?: Partial<Resources>;
  political?: Partial<PoliticalState>;
  timeline?: Partial<GameTimeline>;
  profile?: Partial<PlayerProfile>;
}

// ===== 城市治理类型 =====

export interface CityIndicators {
  gdp: number;
  livelihood: number;
  ecology: number;
  business: number;
  security: number;
}

export interface CityGovernance {
  cityId: string;
  playerId: string;
  level: string;
  indicators: CityIndicators;
  departments: Department[];
  activePolicies: Policy[];
  projects: Project[];
  fundAccount: FundAccount;
  massIncidentPending?: number;
}

export interface Department {
  key: string;
  name: string;
  level: number;
  staff: number;
  baseFund: number;
  baseTax: number;
  baseMerit: number;
}

export interface Policy {
  id: string;
  type: string;
  config: unknown;
  startDay: number;
  endDay: number;
}

export interface Project {
  id: string;
  name: string;
  cost: number;
  progress: number;
  effects: unknown;
}

export interface FundAccount {
  cityGovFund: number;
  fundBalance: number;
  taxRevenue: number;
  personalSavings?: number;
  providentFundBalance?: number;
}

// ===== KPI 类型 =====

export interface DailyDelta {
  gameDays: number;
  meritGain: number;
  fundBalanceChange: number;
  taxRevenueChange: number;
  indicatorDrifts: Record<string, number>;
  bossFavorChange: number;
  securityIndexChange: number;
}

export interface MonthlyDelta {
  gameDays: number;
  personalSavingsChange: number;
  providentFundChange: number;
  meritGain: number;
  cityGovFundChange: number;
  cityGovFundBalance: number;
  fundBalanceChange: number;
  taxRevenueChange: number;
  indicatorDrifts: Record<string, number>;
  bossFavorChange: number;
  securityIndexChange: number;
  publicOpinionChange: number;
  inspectionRiskChange: number;
  massIncidentTriggered: boolean;
  briberyEventTriggered: boolean;
}

export interface KPIResult {
  eligible: boolean;
  overall: number;
  breakdown: Record<string, number>;
  grade: string;
  details: string[];
}

export interface DeptAutoResult {
  fundBalance: number;
  taxRevenue: number;
  meritPoints: number;
}

export interface DeptKpiResult {
  [key: string]: unknown;
}

export interface KpiSaveSnapshot {
  [key: string]: unknown;
}

// ===== 领域事件 =====

export interface PlayerPromotedEvent {
  type: 'PLAYER_PROMOTED';
  occurredAt: Date;
  eventId: string;
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
  occurredAt: Date;
  eventId: string;
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
  occurredAt: Date;
  eventId: string;
  payload: {
    playerId: string;
    incidentId: string;
    severity: 'low' | 'medium' | 'high';
    deadlineDays: number;
  };
}

export interface BriberyExposedEvent {
  type: 'BRIBERY_EXPOSED';
  occurredAt: Date;
  eventId: string;
  payload: {
    playerId: string;
    level: 'warning' | 'suspend' | 'case';
    penalty: Record<string, number>;
  };
}

export interface MonthlySettlementEvent {
  type: 'MONTHLY_SETTLEMENT_COMPLETED';
  occurredAt: Date;
  eventId: string;
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