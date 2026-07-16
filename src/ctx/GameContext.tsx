// 游戏状态Context管理
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  saveCooldownCache, loadCooldownCache, enqueueOfflineOp,
  loadOfflineQueue, clearOfflineQueue, applyLocalCachePatch,
} from '@/lib/cooldownCache';
import { supabase } from '@/client/supabase';
import { getOrCreateSave, updateSave, addNewCases, supplementSubordinates, getSubordinates, completeBuildProjects, triggerSubVisit, runAnnualSubAssessment, generateMonthlyReports, getUnreadReports, generateMonthlyEnterprises, calcMonthlyTax, generatePetitionEvent, fillDeptStaff, execDeptAutoActions, growPopulation, autoGrowSecretaryAbility, generateExchangeOfficer, acceptExchangeOfficer, resolveMeetingTasks, dailyEnergyRegen, monthlyHealthRegen, checkPartySchoolCompletion, tryTriggerNationalPolicy, agingLeadershipBand, checkPolicyExpiry, autoGrowSubAbility, getOrCreateSecretary, npcTriggerCongressIfDue, npcMonthlyCongressAppoint, getNpcBand, getPlayerPartySchoolCerts, generateBlindDateNpcs, addChild, getChildCount, getFamilyMembers, updateFamilyMember, aiGoverningAreasMonthly, expireEmergencyStaff, triggerAutoRecruit, addNewTask, initBossTasks, createMeeting, getMeetingByMonth, processNpcPersonnelEvents } from '@/db/gameApi';
import type { PlayerSave, MonthlyReport } from '@/types/game';
import type { ExchangeOfficer } from '@/db/gameApi';
import { RANK_CONFIG, RANK_SALARY, RANK_FUND_MULTIPLIER, RANK_PERSONAL_HPF, RANK_MONTHLY_ALLOWANCE, RANK_ANNUAL_BONUS_MONTHS, checkRetirementStatus, calcRenewalVote, getRequiredPartySchoolLevel, CONCURRENT_POST_CONFIG, getDeptStaffQuota, getAbilityLivelihoodBonus } from '@/types/game';
import { getRandomMinistry } from '@/types/game';
import { computeKpi, getDeptKpiResult } from '@/lib/kpiEngine';
import { drawMonthlyDeptEvent, inferDeptKeyFromPosition } from '@/lib/deptMonthlyEvents';
import { getLineRankTitle } from '@/lib/lineRankTitles';
import type { CareerLineName } from '@/lib/lineRankTitles';
import type { DeptMonthlyEvent } from '@/lib/deptMonthlyEvents';
import npcConfig from '@/config/npc.json';


interface AnnualPromoCandidate {
  id: string; name: string; subLevel: number;
  ability: number; experience: number;
  appointedDept: string | null; deptPosition: string; reason: string;
}

// 晋升就绪触发（满届自动 or 破格晋升选项）
export interface PromotionReadyTrigger {
  mode: 'normal' | 'exceptional'; // normal=届满自动晋升, exceptional=破格晋升
  rankLevel: number;
  rankName: string;
  tenureYears: number;
  kpiScore: number;
  cityName: string;
  /** 破格晋升时助力老学长姓名 */
  mentorName?: string;
}

// 平调触发
export interface LateralTransferTrigger {
  rankLevel: number;
  rankName: string;
  tenureYears: number;
  maxTenureYears: number;
  cityName: string;
  reason: string;
}

// rank>=3 晋升/平调后展示5名新秘书候选人
interface SecretarySelectTrigger {
  saveId: string;
  userId: string;
  fromRankLevel: number;
  moveType: 'promotion' | 'lateral';
}

// 升职/平调时秘书下放触发
export interface SecretaryReleaseTrigger {
  saveId: string;
  saveUserId: string;
  secretarySubId: string;
  secretaryName: string;
  secretaryAbility: number;
  secretaryAvatarId: number;
  secretaryGender: string;
  fromRankLevel: number;
  fromCityName: string;
  moveType: 'promotion' | 'lateral';
}

// 上司换届事件
export interface BossChangeEvent {
  bossNum: 1 | 2 | 3;
  oldBossName: string;
  newBossName: string;
  position: string;       // 职衔
  newFavor: number;       // 新好感度（30-60）
}

/** 路线KPI低分警告事件 */
interface LineKpiWarnEvent {
  line: string;            // 仕途路线名称（党务线/纪检线/团派线）
  dimLabel: string;        // 低分维度名称（如"案件查处"）
  score: number;           // 当前分数
  warnMsg: string;         // 警告文案（上级具体措施）
}

// 纪委风险事件
export interface DisciplineWarnEvent {
  type: 'warn' | 'investigation'; // warn=约谈, investigation=立案审查
  officerName: string;
  meritPenalty: number;    // 政绩扣除
  moralChange: number;     // 道德值变化
  content: string;
}

export interface UpperInspectEvent {
  inspectorName: string;
  inspectorTitle: string;
  focus: 'gdp' | 'livelihood' | 'ecology' | 'business' | 'security' | 'overall';
  focusLabel: string;
  result: 'excellent' | 'good' | 'pass' | 'fail';
  resultLabel: string;
  meritDelta: number;   // 政绩奖惩（正=奖，负=罚）
  favorDelta: number;   // 上司好感（正=奖，负=罚）
  comment: string;
}

/** 年末述职考核弹窗数据 */
export interface DebriefResultEvent {
  passed: boolean;          // 是否达标
  keyLabel: string;         // 考核指标中文名
  targetValue: number;      // 目标值
  currentValue: number;     // 实际值
  bonusBefore: number;      // 奖惩前累计破格概率调整
  bonusAfter: number;       // 奖惩后累计破格概率调整
}

/** 秘书本月自动施政完成通知 */
export interface SecAutoGovEvent {
  abilityTier: number;    // 秘书能力档位（70/80/90）
  probPct: number;        // 触发概率百分比（50/60/65）
  consecutiveMonths: number;  // 连续月数（1-6）
  isLimit: boolean;       // true = 已到第6月，提示本月需手动施政
}

/** 重新导出部门月度事件类型（供外部页面使用） */
export type { DeptMonthlyEvent } from '@/lib/deptMonthlyEvents';
export type { EventChoice } from '@/lib/deptMonthlyEvents';

interface GameContextType {
  save: PlayerSave | null;
  isLoading: boolean;
  timeGranularity: '天' | '周' | '月';
  isRunning: boolean;
  unreadReports: MonthlyReport[];
  clearUnreadReports: () => void;
  personnelReviewPending: boolean;
  clearPersonnelReview: () => void;
  exchangeOfficer: ExchangeOfficer | null;
  clearExchangeOfficer: () => void;
  annualPromoCandidates: AnnualPromoCandidate[];
  clearAnnualPromoCandidates: () => void;
  upperInspectEvent: UpperInspectEvent | null;
  clearUpperInspectEvent: () => void;
  meetingTaskFeedback: string | null;
  clearMeetingTaskFeedback: () => void;
  // 退休弹窗状态
  retirementTrigger: 'voluntary' | 'mandatory' | 'purge' | 'demotion' | null;
  clearRetirementTrigger: () => void;
  // 续任投票弹窗状态（rank14 总理届满两届强退；rank15 届满触发联邦党代会/联邦国会投票）
  renewalVoteTrigger: { rankLevel: number; voteRate: number; passed: boolean; termsAfter: number } | null;
  clearRenewalVoteTrigger: () => void;
  // 上司换届
  bossChangeEvent: BossChangeEvent | null;
  clearBossChangeEvent: () => void;
  // 纪委风险
  disciplineWarnEvent: DisciplineWarnEvent | null;
  clearDisciplineWarnEvent: () => void;
  // 路线KPI低分警告
  lineKpiWarnEvent: LineKpiWarnEvent | null;
  clearLineKpiWarnEvent: () => void;
  // Game Over结局
  gameOverTrigger: PlayerSave['gameOverType'];
  clearGameOverTrigger: () => void;
  // 晋升就绪（届满自动晋升 or 破格晋升）
  promotionReadyTrigger: PromotionReadyTrigger | null;
  clearPromotionReadyTrigger: () => void;
  // 平调触发
  lateralTransferTrigger: LateralTransferTrigger | null;
  clearLateralTransferTrigger: () => void;
  // 升职/平调时秘书下放触发
  secretaryReleaseTrigger: SecretaryReleaseTrigger | null;
  clearSecretaryReleaseTrigger: () => void;
  // rank>=3 晋升/平调后选新秘书
  secretarySelectTrigger: SecretarySelectTrigger | null;
  clearSecretarySelectTrigger: () => void;
  // 年末述职考核结果弹窗
  debriefResultTrigger: DebriefResultEvent | null;
  clearDebriefResultTrigger: () => void;
  // 秘书本月自动施政完成通知
  secAutoGovTrigger: SecAutoGovEvent | null;
  clearSecAutoGovTrigger: () => void;
  // 部门月度事件（含军转专属剧情）
  deptMonthlyEvent: DeptMonthlyEvent | null;
  clearDeptMonthlyEvent: () => void;
  setTimeGranularity: (g: '天' | '周' | '月') => void;
  setIsRunning: (v: boolean) => void;
  speedMultiplier: 1 | 2 | 4 | 8;
  setSpeedMultiplier: (v: 1 | 2 | 4 | 8) => void;
  advanceTime: () => Promise<void>;
  refreshSave: () => Promise<void>;
  forceRefreshSave: () => Promise<void>;
  /** 等待当前正在运行的 advanceTime 完成，晋升等关键写入前必须调用，防止 pending 化导致 forceRefreshSave 读到旧数据 */
  waitForAdvance: () => Promise<void>;
  /** 锁定 advanceTime（晋升期间调用），防止定时器在 waitForAdvance 返回后立刻触发新一轮推进 */
  lockAdvance: () => void;
  /** 解锁 advanceTime（晋升结束时调用，通常在 finally 块） */
  unlockAdvance: () => void;
  /** 晋升完成终态提交：强制注入内存状态+延长冷却60秒，彻底防止 refreshSave 覆盖 */
  commitPromotion: () => void;
  updateGameSave: (updates: Parameters<typeof updateSave>[1]) => Promise<void>;
  /** 当前是否离线（DB写入会进离线队列） */
  isOffline: boolean;
}

const GameContext = createContext<GameContextType>({
  save: null,
  isLoading: true,
  timeGranularity: '月',
  isRunning: false,
  unreadReports: [],
  clearUnreadReports: () => {},
  personnelReviewPending: false,
  clearPersonnelReview: () => {},
  exchangeOfficer: null,
  clearExchangeOfficer: () => {},
  annualPromoCandidates: [],
  clearAnnualPromoCandidates: () => {},
  upperInspectEvent: null,
  clearUpperInspectEvent: () => {},
  meetingTaskFeedback: null,
  clearMeetingTaskFeedback: () => {},
  retirementTrigger: null,
  clearRetirementTrigger: () => {},
  renewalVoteTrigger: null,
  clearRenewalVoteTrigger: () => {},
  bossChangeEvent: null,
  clearBossChangeEvent: () => {},
  disciplineWarnEvent: null,
  clearDisciplineWarnEvent: () => {},
  lineKpiWarnEvent: null,
  clearLineKpiWarnEvent: () => {},
  gameOverTrigger: null,
  clearGameOverTrigger: () => {},
  promotionReadyTrigger: null,
  clearPromotionReadyTrigger: () => {},
  lateralTransferTrigger: null,
  clearLateralTransferTrigger: () => {},
  secretaryReleaseTrigger: null,
  clearSecretaryReleaseTrigger: () => {},
  secretarySelectTrigger: null,
  clearSecretarySelectTrigger: () => {},
  debriefResultTrigger: null,
  clearDebriefResultTrigger: () => {},
  secAutoGovTrigger: null,
  clearSecAutoGovTrigger: () => {},
  deptMonthlyEvent: null,
  clearDeptMonthlyEvent: () => {},
  setTimeGranularity: () => {},
  setIsRunning: () => {},
  speedMultiplier: 1,
  setSpeedMultiplier: () => {},
  advanceTime: async () => {},
  refreshSave: async () => {},
  forceRefreshSave: async () => {},
  waitForAdvance: async () => {},
  lockAdvance: () => {},
  unlockAdvance: () => {},
  commitPromotion: () => {},
  updateGameSave: async () => {},
  isOffline: false,
});

// 上司姓名池（组件外，避免每次 render 重建）



// NPC 名字池（从 JSON 配置文件加载）
const BOSS_SURNAMES: string[] = npcConfig.BOSS_SURNAMES;
const BOSS_GIVEN_NAMES: string[] = npcConfig.BOSS_GIVEN_NAMES;
const DISCIPLINE_OFFICERS: string[] = npcConfig.DISCIPLINE_OFFICERS;
const INSPECTOR_POOL: Array<{ name: string; title: string }> = npcConfig.INSPECTOR_POOL as Array<{ name: string; title: string }>;

const genBossName = () => {
  const s = BOSS_SURNAMES[Math.floor(Math.random() * BOSS_SURNAMES.length)];
  const g = BOSS_GIVEN_NAMES[Math.floor(Math.random() * BOSS_GIVEN_NAMES.length)];
  return s + g;
};
const genDisciplineOfficer = () => DISCIPLINE_OFFICERS[Math.floor(Math.random() * DISCIPLINE_OFFICERS.length)];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState<PlayerSave | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeGranularity, setTimeGranularity] = useState<'天' | '周' | '月'>('月');
  const [isRunning, setIsRunning] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2 | 4 | 8>(1);
  const [isOffline, setIsOffline] = useState(false);

  // 网络状态监测：每30秒轮询一次supabase健康接口
  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const check = async () => {
      try {
        const ctrl = new AbortController();
        const id = setTimeout(() => ctrl.abort(), 4000);
        await fetch('https://www.baidu.com/favicon.ico', { method: 'HEAD', signal: ctrl.signal, cache: 'no-store' });
        clearTimeout(id);
        setIsOffline(false);
      } catch {
        setIsOffline(true);
      }
    };
    void check();
    timer = setInterval(() => { void check(); }, 30_000);
    return () => clearInterval(timer);
  }, []);

  // 启动时从 AsyncStorage 恢复速度档位
  useEffect(() => {
    void (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        const stored = await AsyncStorage.getItem('speedMultiplier');
        if (stored === '2' || stored === '4' || stored === '8') {
          setSpeedMultiplier(Number(stored) as 2 | 4 | 8);
        }
      } catch { /* 读取失败静默忽略 */ }
    })();
  }, []);

  // 速度变化时持久化到 AsyncStorage
  useEffect(() => {
    void (async () => {
      try {
        const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
        await AsyncStorage.setItem('speedMultiplier', String(speedMultiplier));
      } catch { /* 写入失败静默忽略 */ }
    })();
  }, [speedMultiplier]);
  const [unreadReports, setUnreadReports] = useState<MonthlyReport[]>([]);
  const [personnelReviewPending, setPersonnelReviewPending] = useState(false);
  const [exchangeOfficer, setExchangeOfficer] = useState<ExchangeOfficer | null>(null);
  const [annualPromoCandidates, setAnnualPromoCandidates] = useState<AnnualPromoCandidate[]>([]);
  const [upperInspectEvent, setUpperInspectEvent] = useState<UpperInspectEvent | null>(null);
  const upperInspectRef = useRef<UpperInspectEvent | null>(null);
  useEffect(() => { upperInspectRef.current = upperInspectEvent; }, [upperInspectEvent]);
  const [meetingTaskFeedback, setMeetingTaskFeedback] = useState<string | null>(null);
  const exchangeOfficerRef = useRef<ExchangeOfficer | null>(null);
  useEffect(() => { exchangeOfficerRef.current = exchangeOfficer; }, [exchangeOfficer]);
  // 退休触发类型（voluntary=自主/mandatory=强制）
  const [retirementTrigger, setRetirementTrigger] = useState<'voluntary' | 'mandatory' | 'purge' | 'demotion' | null>(null);
  const retirementTriggerRef = useRef<'voluntary' | 'mandatory' | 'purge' | 'demotion' | null>(null);
  useEffect(() => { retirementTriggerRef.current = retirementTrigger; }, [retirementTrigger]);

  const [renewalVoteTrigger, setRenewalVoteTrigger] = useState<{ rankLevel: number; voteRate: number; passed: boolean; termsAfter: number } | null>(null);
  const renewalVoteTriggerRef = useRef<{ rankLevel: number; voteRate: number; passed: boolean; termsAfter: number } | null>(null);
  useEffect(() => { renewalVoteTriggerRef.current = renewalVoteTrigger; }, [renewalVoteTrigger]);
  // 上司换届事件
  const [bossChangeEvent, setBossChangeEvent] = useState<BossChangeEvent | null>(null);
  const bossChangeRef = useRef<BossChangeEvent | null>(null);
  useEffect(() => { bossChangeRef.current = bossChangeEvent; }, [bossChangeEvent]);
  // 纪委风险事件
  const [disciplineWarnEvent, setDisciplineWarnEvent] = useState<DisciplineWarnEvent | null>(null);
  const disciplineWarnRef = useRef<DisciplineWarnEvent | null>(null);
  useEffect(() => { disciplineWarnRef.current = disciplineWarnEvent; }, [disciplineWarnEvent]);
  // 路线KPI低分警告
  const [lineKpiWarnEvent, setLineKpiWarnEvent] = useState<LineKpiWarnEvent | null>(null);
  const lineKpiWarnRef = useRef<LineKpiWarnEvent | null>(null);
  useEffect(() => { lineKpiWarnRef.current = lineKpiWarnEvent; }, [lineKpiWarnEvent]);
  // Game Over结局
  const [gameOverTrigger, setGameOverTrigger] = useState<PlayerSave['gameOverType']>(null);
  const gameOverRef = useRef<PlayerSave['gameOverType']>(null);
  useEffect(() => { gameOverRef.current = gameOverTrigger; }, [gameOverTrigger]);
  // 晋升就绪触发
  const [promotionReadyTrigger, setPromotionReadyTrigger] = useState<PromotionReadyTrigger | null>(null);
  const promotionReadyRef = useRef<PromotionReadyTrigger | null>(null);
  useEffect(() => { promotionReadyRef.current = promotionReadyTrigger; }, [promotionReadyTrigger]);
  // 平调触发
  const [lateralTransferTrigger, setLateralTransferTrigger] = useState<LateralTransferTrigger | null>(null);
  const lateralTransferRef = useRef<LateralTransferTrigger | null>(null);
  useEffect(() => { lateralTransferRef.current = lateralTransferTrigger; }, [lateralTransferTrigger]);
  // 秘书下放触发
  const [secretaryReleaseTrigger, setSecretaryReleaseTrigger] = useState<SecretaryReleaseTrigger | null>(null);
  const secretaryReleaseRef = useRef<SecretaryReleaseTrigger | null>(null);
  useEffect(() => { secretaryReleaseRef.current = secretaryReleaseTrigger; }, [secretaryReleaseTrigger]);
  // rank>=3 新秘书候选触发
  const [secretarySelectTrigger, setSecretarySelectTrigger] = useState<SecretarySelectTrigger | null>(null);
  const [debriefResultTrigger, setDebriefResultTrigger] = useState<DebriefResultEvent | null>(null);
  const [secAutoGovTrigger, setSecAutoGovTrigger] = useState<SecAutoGovEvent | null>(null);
  const [deptMonthlyEvent, setDeptMonthlyEvent] = useState<DeptMonthlyEvent | null>(null);
  const deptMonthlyEventRef = useRef<DeptMonthlyEvent | null>(null);
  useEffect(() => { deptMonthlyEventRef.current = deptMonthlyEvent; }, [deptMonthlyEvent]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<PlayerSave | null>(null);
  // 防止并发推进
  const isAdvancingRef = useRef(false);
  // 晋升进行中标志：防止定时器在 waitForAdvance 返回后立刻触发新一轮 advanceTime
  const isPromotingRef = useRef(false);
  const granularityRef = useRef<'天' | '周' | '月'>('月');
  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => { granularityRef.current = timeGranularity; }, [timeGranularity]);

  /**
   * "两版数据回合"设计：
   *   底稿 (baseline) = advanceTime 结束后写入 DB 的完整快照
   *   增量 (delta)    = 玩家在两次推进间隙发起的实时操作
   *
   * advanceTime 运行期间，玩家操作被暂存到此队列；
   * 推进完成后以底稿为基础顺序 flush，避免并发写入互相覆盖。
   */
  const pendingPlayerOpsRef = useRef<Array<Parameters<typeof updateSave>[1]>>([]);
  // 防止 refreshSave 覆盖尚未写入 DB 的乐观更新：记录正在飞行中的写入数量
  const pendingWritesRef = useRef(0);
  // 防止 refreshSave 在 forceRefreshSave 完成后立即覆盖最新内存状态
  const lastForceRefreshTimeRef = useRef<number>(0);

  // 纪委约谈官员池

  // ── 上司年度KPI目标生成 ──────────────────────────────────────────────────
  // 三种派系风格 × 好感度宽严程度 → 双维度影响目标难度和侧重指标
  // 改革派：重GDP/营商，目标偏高；实干派：均衡；保守派：重民生/生态，目标偏保守
  const generateBossKpiTargets = (s: PlayerSave): {
    gdp: number; livelihood: number; ecology: number; business: number;
  } => {
    const favor = s.bossFavor ?? 50;
    const faction = s.bossFaction ?? '实干派';
    // 好感度决定宽严幅度
    const minIncr = favor >= 70 ? 2 : favor >= 40 ? 4 : 7;
    const maxIncr = favor >= 70 ? 7 : favor >= 40 ? 12 : 18;
    const rand = (cur: number, extra = 0) =>
      Math.min(85, Math.round(cur + minIncr + extra + Math.random() * (maxIncr - minIncr)));
    // 派系侧重：改革派 → GDP/营商+2；保守派 → 民生/生态+2，GDP/营商-2
    const factionAdj = {
      改革派: { gdp: 2,  livelihood: 0,  ecology: 0,  business: 2  },
      实干派: { gdp: 0,  livelihood: 0,  ecology: 0,  business: 0  },
      保守派: { gdp: -2, livelihood: 2,  ecology: 2,  business: -2 },
    }[faction];
    return {
      gdp:        rand(s.cityGdp,        factionAdj.gdp),
      livelihood: rand(s.cityLivelihood, factionAdj.livelihood),
      ecology:    rand(s.cityEcology,    factionAdj.ecology),
      business:   rand(s.cityBusiness,   factionAdj.business),
    };
  };

  // ── 上司年度述职核心指标生成 ─────────────────────────────────────────────
  // 派系决定倾向指标，好感度决定目标增量大小
  const generateBossDebriefTarget = (s: PlayerSave): { key: string; value: number } => {
    const favor = s.bossFavor ?? 50;
    const faction = s.bossFaction ?? '实干派';
    const line = s.careerPathLine ?? '行政线';

    // ── 按线路分档：各线路只考核本线路核心指标 ────────────────────────────
    type PoolItem = { key: string; cur: number; w: number };
    const LINE_POOL: Record<string, PoolItem[]> = {
      行政线: {
        改革派: [
          { key: 'gdp', cur: s.cityGdp, w: 4 },
          { key: 'business', cur: s.cityBusiness, w: 3 },
          { key: 'livelihood', cur: s.cityLivelihood, w: 1 },
          { key: 'ecology', cur: s.cityEcology, w: 1 },
          { key: 'security', cur: s.securityIndex, w: 1 },
        ],
        实干派: [
          { key: 'gdp', cur: s.cityGdp, w: 2 },
          { key: 'livelihood', cur: s.cityLivelihood, w: 2 },
          { key: 'ecology', cur: s.cityEcology, w: 2 },
          { key: 'business', cur: s.cityBusiness, w: 2 },
          { key: 'security', cur: s.securityIndex, w: 2 },
        ],
        保守派: [
          { key: 'livelihood', cur: s.cityLivelihood, w: 4 },
          { key: 'ecology', cur: s.cityEcology, w: 3 },
          { key: 'security', cur: s.securityIndex, w: 2 },
          { key: 'gdp', cur: s.cityGdp, w: 1 },
          { key: 'business', cur: s.cityBusiness, w: 0 },
        ],
      }[faction] ?? [],
      党务线: [
        { key: 'bossFavor', cur: s.bossFavor ?? 50, w: 4 },
        { key: 'moralValue', cur: s.moralValue ?? 70, w: 3 },
        { key: 'lineKpiScore', cur: Math.min(100, (s.lineKpiScore ?? 0) * 0.5), w: 3 },
      ],
      纪检线: [
        { key: 'moralValue', cur: s.moralValue ?? 70, w: 4 },
        { key: 'securityIndex', cur: s.securityIndex ?? 50, w: 3 },
        { key: 'lineKpiScore', cur: Math.min(100, (s.lineKpiScore ?? 0) * 0.5), w: 3 },
      ],
      团派线: [
        { key: 'publicOpinionIndex', cur: s.publicOpinionIndex ?? 60, w: 4 },
        { key: 'cityLivelihood', cur: s.cityLivelihood, w: 3 },
        { key: 'meritPoints', cur: Math.min(100, (s.meritPoints ?? 0) / 100), w: 3 },
      ],
    };

    const pool: PoolItem[] = LINE_POOL[line] ?? LINE_POOL['行政线'];
    const totalW = pool.reduce((a, b) => a + b.w, 0);
    let rnd = Math.random() * totalW;
    let picked = pool[0]!;
    for (const item of pool) {
      rnd -= item.w;
      if (rnd <= 0) { picked = item; break; }
    }
    const incr = favor >= 70
      ? 3 + Math.floor(Math.random() * 5)
      : favor >= 40
        ? 5 + Math.floor(Math.random() * 8)
        : 8 + Math.floor(Math.random() * 10);
    return { key: picked.key, value: Math.min(88, Math.round(picked.cur + incr)) };
  };

  /** 生成上级来访考察事件 */
  const generateUpperInspect = useCallback((current: PlayerSave): UpperInspectEvent => {
    
    const FOCUS_OPTIONS: UpperInspectEvent['focus'][] = ['gdp', 'livelihood', 'ecology', 'business', 'security', 'overall'];
    const FOCUS_LABELS: Record<UpperInspectEvent['focus'], string> = {
      gdp: 'GDP发展', livelihood: '民生保障', ecology: '生态文明',
      business: '营商环境', security: '社会治安', overall: '综合治理',
    };
    const inspector = INSPECTOR_POOL[Math.floor(Math.random() * INSPECTOR_POOL.length)];
    const focus = FOCUS_OPTIONS[Math.floor(Math.random() * FOCUS_OPTIONS.length)];
    // 根据对应指标判断考察结果
    const scores: Record<UpperInspectEvent['focus'], number> = {
      gdp: current.cityGdp, livelihood: current.cityLivelihood, ecology: current.cityEcology,
      business: current.cityBusiness, security: current.securityIndex,
      overall: (current.cityGdp + current.cityLivelihood + current.cityEcology + current.cityBusiness + current.securityIndex) / 5,
    };
    const score = scores[focus];
    let result: UpperInspectEvent['result'];
    let resultLabel: string;
    let meritDelta: number;
    let favorDelta: number;
    let comment: string;
    if (score >= 80) {
      result = 'excellent'; resultLabel = '考察优秀';
      meritDelta = 15; favorDelta = 8;
      comment = `考察组认为您在${FOCUS_LABELS[focus]}方面工作成效突出，值得全市推广借鉴，建议上报表彰。`;
    } else if (score >= 65) {
      result = 'good'; resultLabel = '考察良好';
      meritDelta = 8; favorDelta = 3;
      comment = `考察组对您在${FOCUS_LABELS[focus]}方面的工作给予积极评价，指出仍有进一步提升空间。`;
    } else if (score >= 45) {
      result = 'pass'; resultLabel = '考察合格';
      meritDelta = 0; favorDelta = -2;
      comment = `考察组指出${FOCUS_LABELS[focus]}工作有待改进，要求限期整改并上报整改方案。`;
    } else {
      result = 'fail'; resultLabel = '考察不达标';
      meritDelta = -10; favorDelta = -8;
      comment = `考察组对${FOCUS_LABELS[focus]}工作给予严肃批评，指出存在明显短板，已向省执政委发出预警通报。`;
    }
    return { inspectorName: inspector.name, inspectorTitle: inspector.title, focus, focusLabel: FOCUS_LABELS[focus], result, resultLabel, meritDelta, favorDelta, comment };
  }, []);

  const refreshSave = useCallback(async () => {
    // 若有正在飞行中的 updateGameSave 写入，跳过刷新，避免覆盖乐观更新
    if (pendingWritesRef.current > 0) return;
    // 若刚刚执行过 forceRefreshSave（5秒内），跳过，避免覆盖晋升/关键操作后的最新内存状态
    if (Date.now() - lastForceRefreshTimeRef.current < 5000) return;
    setIsLoading(true);
    const data = await getOrCreateSave();
    // 二次检查：加载期间若已有写入发起，放弃覆盖
    if (pendingWritesRef.current > 0) { setIsLoading(false); return; }
    if (data) {
      // 用本地缓存补丁覆盖 DB 中可能过时的冷却数据（断网场景保底）
      const cache = await loadCooldownCache(data.id);
      setSave(applyLocalCachePatch(data, cache));
    } else {
      setSave(data);
    }
    setIsLoading(false);
  }, []);

  // 强制刷新：绕过 pendingWrites 检查，直接从 DB 读取最新数据，用于晋升等关键节点的状态同步
  const forceRefreshSave = useCallback(async () => {
    setIsLoading(true);
    const data = await getOrCreateSave();
    if (data) {
      const cache = await loadCooldownCache(data.id);
      setSave(applyLocalCachePatch(data, cache));
    } else {
      setSave(data);
    }
    // 记录时间戳：5秒内的 refreshSave 调用将被跳过，防止 useFocusEffect 竞态覆盖
    lastForceRefreshTimeRef.current = Date.now();
    setIsLoading(false);
  }, []);

  /**
   * 等待当前正在运行的 advanceTime 完成（polling，间隔 80ms）。
   * 晋升等关键 DB 写入前必须调用：若 isAdvancingRef=true，
   * updateGameSave 会把操作 push 到 pending 队列并立即 return，
   * 导致后续 forceRefreshSave 从 DB 读到旧的 rankLevel，造成晋升被覆盖。
   */
  const waitForAdvance = useCallback(async () => {
    while (isAdvancingRef.current) {
      await new Promise<void>(resolve => setTimeout(resolve, 80));
    }
  }, []);

  /** 晋升开始：锁定 advanceTime，防止定时器在 waitForAdvance 返回后立刻触发新一轮推进 */
  const lockAdvance = useCallback(() => { isPromotingRef.current = true; }, []);
  /** 晋升结束：解锁 advanceTime（必须在 finally 里调用） */
  const unlockAdvance = useCallback(() => { isPromotingRef.current = false; }, []);

  /**
   * 晋升完成终态提交：直接用 saveRef.current（已含所有乐观更新的最终状态）
   * 强制写入内存并延长冷却60秒，防止后续 useFocusEffect → refreshSave 从 DB 读回旧数据覆盖晋升结果。
   * 同时触发一次额外的 DB 强制写入（bypass pending），确保数据持久化。
   * 注意：不再接受 promotedSave 参数——外部传入的 save 是闭包旧值，会覆盖乐观更新的最新状态。
   */
  const commitPromotion = useCallback(() => {
    const latest = saveRef.current;
    if (!latest) return;
    setSave(latest);
    // saveRef.current 已经在 updateGameSave 里同步更新，无需再次赋值
    // 设置60秒冷却：refreshSave 在此期间将被跳过，防止覆盖晋升内存状态
    lastForceRefreshTimeRef.current = Date.now() + 55_000; // 5s保护窗口 + 55s = 60s total
    // 额外补一次强制 DB 写入，确保网络恢复后数据也是正确的
    void updateSave(latest.id, {
      rankLevel: latest.rankLevel,
      rankName: latest.rankName,
      playerPosition: latest.playerPosition,
      cityName: latest.cityName,
      tenureYears: latest.tenureYears,
      tenureDays: latest.tenureDays,
      isPromotionAvailable: latest.isPromotionAvailable,
      meritPoints: latest.meritPoints,
      careerPath: latest.careerPath,
      careerPathLine: latest.careerPathLine,
    } as Parameters<typeof updateSave>[1]);
  }, []);

  useEffect(() => { refreshSave(); }, [refreshSave]);

  const updateGameSave = useCallback(async (updates: Parameters<typeof updateSave>[1]) => {
    if (!saveRef.current) return;
    const saveId = saveRef.current.id;
    // 乐观更新：立即更新本地状态，无需等待数据库响应
    const optimistic = { ...saveRef.current, ...updates } as PlayerSave;
    setSave(optimistic);
    // ⚡ 关键：同步更新 saveRef，确保后续同帧调用（如 commitPromotion）能拿到最新状态
    // 若依赖 useEffect([save]) 异步同步 saveRef，同一异步函数内多次调用时会读到旧值
    saveRef.current = optimistic;
    // 同步写本地缓存（断网保底）
    void saveCooldownCache(saveId, updates as Record<string, unknown>);
    // "两版数据回合"：推进期间将玩家操作暂存，推进结束后以底稿为基础统一 flush
    if (isAdvancingRef.current) {
      pendingPlayerOpsRef.current.push(updates);
      return;
    }
    pendingWritesRef.current++;
    try {
      // 只做持久化，不再 setSave(updated)：
      // 乐观更新已在上方完成，若此处再次 setSave 会与 advanceTime 的 setSave 竞争，
      // 导致月薪写入、扣费效果被覆盖（即"钱不扣/效果反复"bug 根因）。
      await updateSave(saveId, updates);
    } catch {
      // DB 写入失败（断网）→ 入离线队列，等网络恢复后重试
      void enqueueOfflineOp(saveId, updates as Record<string, unknown>);
    } finally {
      pendingWritesRef.current--;
    }
  }, []);

  // 每天增量计算
  // 注意：5项城市指标（GDP/民生/生态/营商/治安）不再自动涨，须手动施政
  const computeDailyDelta = useCallback((current: PlayerSave) => {
    const baseRate = current.rankLevel * 0.5;
    const meritDelta = 0.12 + baseRate * 0.025;
    // 城市5项指标不自动变化（v58 改为纯手动施政驱动），仅累计政绩值
    return {
      meritPoints: current.meritPoints + meritDelta,
    };
  }, []);

  // 年度排名计算（模拟：基于四项指标与随机对手比较）
  const computeAnnualRank = useCallback((s: PlayerSave): { pct: number; isExcellent: boolean } => {
    const myScore = (s.cityGdp + s.cityLivelihood + s.cityEcology + s.cityBusiness) / 4;
    // 模拟20个同级竞争者
    let beaten = 0;
    for (let i = 0; i < 20; i++) {
      const rival = 40 + Math.random() * 40;
      if (myScore > rival) beaten++;
    }
    const pct = Math.round((beaten / 20) * 100);
    return { pct, isExcellent: pct >= 80 };
  }, []);

  const advanceTime = useCallback(async () => {
    if (isAdvancingRef.current) return;
    if (isPromotingRef.current) return; // 晋升进行中，不推进时间
    const current = saveRef.current;
    if (!current) return;
    // 角色创建未完成时不推进时间
    if (current.needsCharacterCreation) return;

    isAdvancingRef.current = true;
    try {
      const gran = granularityRef.current;
    const daysToAdvance = gran === '天' ? 1 : gran === '周' ? 7 : 30;

    let cumMerit = current.meritPoints;
    let newGameDays = current.gameDays;
    let newTenureDays = current.tenureDays;

    for (let i = 0; i < daysToAdvance; i++) {
      const delta = computeDailyDelta({
        ...current,
        meritPoints: cumMerit,
      });
      cumMerit = delta.meritPoints;
      newGameDays++;
      newTenureDays++;
    }

    const newTenureYears = Math.floor(newTenureDays / 365);

    const avgIndex = (current.cityGdp + current.cityLivelihood + current.cityEcology + current.cityBusiness) / 4;
    let assessmentGrade: PlayerSave['assessmentGrade'] = '合格';
    if (avgIndex >= 75) assessmentGrade = '优秀';
    else if (avgIndex >= 60) assessmentGrade = '良好';
    else if (avgIndex < 35) assessmentGrade = '不合格';

    // 年度排名：跨越365天整数倍则触发
    const prevYear = Math.floor(current.gameDays / 365);
    const newYear = Math.floor(newGameDays / 365);
    let newLastRankDay = current.lastRankDay;
    let newAnnualRankPct = current.annualRankPct;
    let newIsExcellentRank = current.isExcellentRank;
    let newEventsThisYear = current.eventsThisYear;
    let newConsecutiveExcellentYears = current.consecutiveExcellentYears ?? 0;

    if (newYear > prevYear) {
      const rank = computeAnnualRank(current);
      newLastRankDay = newGameDays;
      newAnnualRankPct = rank.pct;
      newIsExcellentRank = rank.isExcellent;
      newEventsThisYear = 0; // 新年重置事件计数

      // 年底重置编制申请标志：仅清低4位（本年申请标志），保留高位累计扩编次数
      void updateSave(current.id, {
        lastStaffQuotaYear: newYear,
        staffApplyBits: (current.staffApplyBits ?? 0) & ~0xF,
      });

      // 连续优秀/特等计数：优秀(≥80)累加，否则清零
      if (rank.isExcellent) {
        newConsecutiveExcellentYears = (current.consecutiveExcellentYears ?? 0) + 1;
      } else {
        newConsecutiveExcellentYears = 0;
      }

      // ── 述职检验：检查上一年度核心指标是否达成（年初已设定）────────────
      // 上一年的 debriefTargetKey/Value 在 current 中，与本年 save 当前值对比
      void (async () => {
        try {
          const prevTargetKey = current.annualDebriefTargetKey ?? '';
          const prevTargetVal = current.annualDebriefTargetValue ?? 0;
          // 只有上年有设定目标时才检验
          if (prevTargetKey && prevTargetVal > 0 && prevYear > 0) {
            const KEY_LABEL: Record<string, string> = {
              gdp: 'GDP指数', livelihood: '民生满意度',
              ecology: '生态环境', business: '营商环境', security: '社会治安',
              // 党务线
              bossFavor: '上级好感度', moralValue: '廉洁自律', lineKpiScore: '线路深度积分',
              // 纪检线
              securityIndex: '社会治安',
              // 团派线
              publicOpinionIndex: '公众舆情指数', cityLivelihood: '民生工作成效', meritPoints: '政绩综合得分',
            };
            const currentVal: number = (() => {
              switch (prevTargetKey) {
                case 'gdp':                return current.cityGdp;
                case 'livelihood':
                case 'cityLivelihood':     return current.cityLivelihood;
                case 'ecology':            return current.cityEcology;
                case 'business':           return current.cityBusiness;
                case 'security':
                case 'securityIndex':      return current.securityIndex;
                case 'bossFavor':          return current.bossFavor ?? 50;
                case 'moralValue':         return current.moralValue ?? 70;
                case 'lineKpiScore':       return Math.min(100, (current.lineKpiScore ?? 0) * 0.5);
                case 'publicOpinionIndex': return current.publicOpinionIndex ?? 60;
                case 'meritPoints':        return Math.min(100, (current.meritPoints ?? 0) / 100);
                default:                   return 0;
              }
            })();
            const debriefPassed = currentVal >= prevTargetVal;
            const currentBonus = current.exceptionalPromoBonus ?? 0;
            const newBonus = debriefPassed
              ? Math.min(0.30, currentBonus + 0.01)
              : Math.max(-0.50, currentBonus - 0.10);
            // 触发弹窗通知玩家述职结果
            setDebriefResultTrigger({
              passed: debriefPassed,
              keyLabel: KEY_LABEL[prevTargetKey] ?? prevTargetKey,
              targetValue: prevTargetVal,
              currentValue: Math.round(currentVal * 10) / 10,
              bonusBefore: currentBonus,
              bonusAfter: newBonus,
            });
            // 为新的一年生成述职核心指标（由上司派系风格决定）
            const nextTarget = generateBossDebriefTarget(current);
            await updateSave(current.id, {
              exceptionalPromoBonus: newBonus,
              annualDebriefTargetKey: nextTarget.key,
              annualDebriefTargetValue: nextTarget.value,
            });
          } else if (prevYear === 0) {
            // 游戏第一年：直接生成本年述职目标，不做检验
            const nextTarget = generateBossDebriefTarget(current);
            await updateSave(current.id, {
              annualDebriefTargetKey: nextTarget.key,
              annualDebriefTargetValue: nextTarget.value,
            });
          }
        } catch {}
      })();

      // ── 上司年度KPI下达（fire-and-forget）────────────────────────────────
      // 依据上司好感度模拟"宽松/适中/严苛"三种风格生成KPI目标，年初自动写入存档
      void (async () => {
        try {
          const targets = generateBossKpiTargets(current);
          await updateSave(current.id, {
            kpiGdpTarget: targets.gdp,
            kpiLivelihoodTarget: targets.livelihood,
            kpiEcologyTarget: targets.ecology,
            kpiBusinessTarget: targets.business,
            kpiYear: newYear,
          });
        } catch {}
      })();

      // ── 年度新系统：NPC老化 + 政策运动触发 + 关系积分更新 ────────────
      void Promise.allSettled([
        agingLeadershipBand(current.id, newGameDays, current.rankLevel, current.cityName, current.birthProvince, current.birthCity),
        tryTriggerNationalPolicy(current.id, newGameDays),
        // 年度关系积分：扫描npc_band中同校/同派系部级及以上老学长，每人+1，上限100
        (async () => {
          try {
            const bandMembers = await getNpcBand(current.id);
            const playerUni = (current.universityName ?? '').split('（')[0];
            const playerFaction = current.primaryFaction ?? '';
            let gained = 0;
            for (const m of bandMembers) {
              if (m.isRetired || m.rankLevel < 10) continue;
              const mUni = m.universityName ? m.universityName.split('（')[0] : '';
              if ((playerUni && mUni && mUni === playerUni) || (playerFaction && m.faction === playerFaction)) {
                gained++;
              }
            }
            if (gained > 0) {
              const newScore = Math.min(100, (current.alumniScore ?? 0) + gained);
              await updateSave(current.id, { alumniScore: newScore });
            }
          } catch {}
        })(),
      ]);
    }

    // 路线竞争事件：180天冷却（半年一次），每年不超过2次
    const COMPETITION_COOLDOWN = 180;
    const daysSinceLastCompetition = newGameDays - (current.lastCompetitionEventDay ?? 0);
    const canTriggerEvent = newEventsThisYear < 6 && !current.isEventPending && daysSinceLastCompetition >= COMPETITION_COOLDOWN;
    const eventProbability = daysToAdvance >= 30 ? 0.20 : daysToAdvance >= 7 ? 0.08 : 0.02;
    const shouldTriggerEvent = canTriggerEvent && Math.random() < eventProbability;
    if (shouldTriggerEvent) newEventsThisYear++;

    // 计算晋升条件：不再根据优秀排名缩短任期要求（废除减半机制）
    const rankConfig = RANK_CONFIG[current.rankLevel];
    const effectiveTenureRequired: number = rankConfig.requiredTenureYears;

    // ── 分层级 KPI 考核评估（替代单一政绩门槛） ──────────────────────────────
    // 构建当前时间点的快照（使用本轮最新累计值）
    const kpiSnapshot = {
      rankLevel:      current.rankLevel,
      careerPath:     current.careerPath,
      moralValue:     current.moralValue,
      securityIndex:  current.securityIndex,
      cityGdp:        current.cityGdp,
      cityLivelihood: current.cityLivelihood,
      cityEcology:    current.cityEcology,
      cityBusiness:   current.cityBusiness,
      bossFavor:      current.bossFavor,
      boss2Favor:     current.boss2Favor,
      boss3Favor:     current.boss3Favor,
      annualRankPct:  newAnnualRankPct,
      taxRevenue:     current.taxRevenue ?? 0,
      tenureYears:    newTenureYears,
      meritPoints:    cumMerit + (0), // bonusMerit 在后面计算，此处用当前值兜底
      lineKpiScore:   current.lineKpiScore ?? 0,
      inspectionRisk: current.inspectionRisk ?? 10,
      publicOpinionIndex: current.publicOpinionIndex ?? 60,
    };
    const kpiResult = computeKpi(kpiSnapshot);

    // ── 党校毕业证书检查：晋升必须持有对应级别的党校结业证书 ──────────────
    const requiredSchoolLevel = getRequiredPartySchoolLevel(current.rankLevel);
    let hasRequiredCert = true;
    if (requiredSchoolLevel) {
      try {
        const certs = await getPlayerPartySchoolCerts(current.id);
        // 党校级别优先级：county < city < basic < middle < advanced < national
        const LEVEL_ORDER: ReturnType<typeof getRequiredPartySchoolLevel>[] = ['county', 'city', 'basic', 'middle', 'advanced', 'national'];
        const reqIdx = LEVEL_ORDER.indexOf(requiredSchoolLevel);
        // 有任意不低于所需级别的证书即满足要求
        hasRequiredCert = certs.some(c => LEVEL_ORDER.indexOf(c) >= reqIdx);
      } catch {
        hasRequiredCert = true; // 查询失败不阻断晋升
      }
    }

    const promotionAvailable =
      current.rankLevel < 15 &&
      newTenureYears >= effectiveTenureRequired &&
      // 新体系：KPI 综合得分达标 + 排名达标 + 无一票否决
      kpiResult.eligible &&
      // 党校培训结业证书
      hasRequiredCert &&
      // 保留：道德底线（防止极端情况漏网）
      current.moralValue >= 10 &&
      // 晋升执政党主席（rank14→15）：需党代会选举支持率 ≥ 75%
      (current.rankLevel !== 14 || (current.partyCongressVote ?? 0) >= 75);

    if (daysToAdvance >= 30) {
      await addNewCases(current.id, current.userId, newGameDays);
    }

    // 完成到期建设项目
    const doneProjects = await completeBuildProjects(current.id, newGameDays);
    let bonusMerit = 0;
    let bonusGdp = current.cityGdp;
    let bonusLivel = current.cityLivelihood;
    let bonusEco = current.cityEcology;
    let bonusBiz = current.cityBusiness;
    for (const proj of doneProjects) {
      bonusMerit += proj.meritReward;
      if (proj.effectType === 'gdp') bonusGdp = Math.min(100, bonusGdp + proj.effectValue);
      if (proj.effectType === 'livelihood') bonusLivel = Math.min(100, bonusLivel + proj.effectValue);
      if (proj.effectType === 'ecology') bonusEco = Math.min(100, bonusEco + proj.effectValue);
      if (proj.effectType === 'business') bonusBiz = Math.min(100, bonusBiz + proj.effectValue);
    }

    // 年龄更新
    const ageFromDays = Math.floor(newGameDays / 365);
    const newPlayerAge = (current.playerAge - Math.floor(current.gameDays / 365)) + ageFromDays;

    // ── 能力值：每月+1（按月度整数倍触发），KPI优秀额外+5 ──────────────────
    const prevMonthForAbility = Math.floor(current.gameDays / 30);
    const newMonthForAbility  = Math.floor(newGameDays / 30);
    const monthsPassed = newMonthForAbility - prevMonthForAbility;
    const baseAbility = current.abilityValue ?? 40;
    let newAbility = Math.min(100, baseAbility + (monthsPassed > 0 ? monthsPassed : 0));
    // KPI优秀奖励：每次评为优秀额外+5（仅每年第一次评定时触发）
    if (assessmentGrade === '优秀' && current.assessmentGrade !== '优秀') {
      newAbility = Math.min(100, newAbility + 5);
    }

    // ── 能力值→民生指数：每月随机加点（共2点分配到4个指数上）─────────────
    const abilityLivBonus = getAbilityLivelihoodBonus(newAbility);
    if (monthsPassed > 0 && abilityLivBonus > 0) {
      // 将 abilityLivBonus 点数随机分配到4个城市指数上
      const indices = ['gdp', 'livelihood', 'ecology', 'business'] as const;
      let remaining = abilityLivBonus;
      const shuffle = [...indices].sort(() => Math.random() - 0.5);
      for (let i = 0; i < shuffle.length && remaining > 0; i++) {
        const pts = i === shuffle.length - 1 ? remaining : Math.floor(Math.random() * (remaining + 1));
        remaining -= pts;
        if (pts <= 0) continue;
        if (shuffle[i] === 'gdp')        bonusGdp   = Math.min(100, bonusGdp   + pts);
        if (shuffle[i] === 'livelihood') bonusLivel = Math.min(100, bonusLivel + pts);
        if (shuffle[i] === 'ecology')    bonusEco   = Math.min(100, bonusEco   + pts);
        if (shuffle[i] === 'business')   bonusBiz   = Math.min(100, bonusBiz   + pts);
      }
    }

    const updated = await updateSave(current.id, {
      gameDays: newGameDays,
      tenureDays: newTenureDays,
      tenureYears: newTenureYears,
      playerAge: newPlayerAge,
      cityGdp: Math.round(bonusGdp * 10) / 10,
      cityLivelihood: Math.round(bonusLivel * 10) / 10,
      cityEcology: Math.round(bonusEco * 10) / 10,
      cityBusiness: Math.round(bonusBiz * 10) / 10,
      meritPoints: Math.round((cumMerit + bonusMerit) * 10) / 10,
      assessmentGrade,
      abilityValue: newAbility,
      isPromotionAvailable: promotionAvailable,
      isEventPending: shouldTriggerEvent || current.isEventPending,
      eventsThisYear: newEventsThisYear,
      lastRankDay: newLastRankDay,
      annualRankPct: newAnnualRankPct,
      isExcellentRank: newIsExcellentRank,
      consecutiveExcellentYears: newConsecutiveExcellentYears,
    });
    if (updated) {
      // 冷却期内（commitPromotion 刚执行，DB 可能还未写入新 rankLevel）保留内存里的晋升状态，
      // 防止 advanceTime 读回 DB 旧行覆盖 rankLevel / isPromotionAvailable / rankName / playerPosition
      const latest = saveRef.current;
      if (latest && Date.now() < lastForceRefreshTimeRef.current) {
        setSave({
          ...updated,
          rankLevel: latest.rankLevel,
          rankName: latest.rankName,
          playerPosition: latest.playerPosition,
          cityName: latest.cityName,
          isPromotionAvailable: latest.isPromotionAvailable,
        });
      } else if (latest && pendingWritesRef.current > 0) {
        // 有正在飞行中的 updateGameSave 写入（用户按钮点击后的乐观更新尚未持久化），
        // 跳过 setSave(updated)，避免覆盖 React 状态中的乐观更新。
        // saveRef.current 已包含乐观操作的最新状态，下次 advanceTime 或 refreshSave 会自动同步。
      } else {
        setSave(updated);
      }
    }

    // 补充下属（如晋升后下属不足，fire-and-forget 不阻塞主流程）
    if (updated && updated.rankLevel !== current.rankLevel) {
      void (async () => {
        const subs = await getSubordinates(updated.id);
        await supplementSubordinates(updated.id, updated.userId, updated.rankLevel, subs.length);
      })();
    }

    // 月度工作报告：每月30天触发
    const prevMonth = Math.floor(current.gameDays / 30);
    const newMonth = Math.floor(newGameDays / 30);
    if (newMonth > prevMonth && updated) {
      // ── 并行执行互不依赖的月度任务（核心性能优化）──────────────────────
      const [reports, allSubsForMonth, monthlyTax, autoResult, meetingResult] = await Promise.all([
        generateMonthlyReports(updated.id, updated.userId, newGameDays),
        getSubordinates(updated.id),
        calcMonthlyTax(updated.id),
        execDeptAutoActions(updated.id),
        resolveMeetingTasks(updated.id, newGameDays),
      ]);

      if (reports.length > 0) {
        void getUnreadReports(updated.id).then(fresh => setUnreadReports(fresh));
      }

      // 招商局月度引进企业（依赖 allSubsForMonth，不可并行）
      const investHead = allSubsForMonth.find(s => s.appointedDept === 'invest' && s.deptPosition === 'head');
      if (investHead) {
        void generateMonthlyEnterprises(updated.id, updated.userId, newGameDays, investHead.ability, updated.rankLevel);
      }

      // 各省财政上缴（rank14+ 联邦内阁总理）
      let provincialRemittance = 0;
      if (updated.rankLevel >= 14) {
        const gdpFactor = 0.8 + (updated.cityGdp / 100) * 0.4;
        const baseMontly = 1500 + Math.random() * 300;
        provincialRemittance = Math.round(baseMontly * gdpFactor * 0.6 * 10) / 10;
      }

      // 国家建设月度收益（rank14+）
      let nationalBuildRevenue = 0;
      if (updated.rankLevel >= 14) {
        const progressFactor = Math.min(3.0, 1 + newGameDays / 730);
        nationalBuildRevenue = Math.round((800 + Math.random() * 400) * progressFactor * 10) / 10;
      }

      // 上级来访考察：省级以下（rank < 9）才触发，每月15%概率
      let inspectEvent: ReturnType<typeof generateUpperInspect> | null = null;
      if (!upperInspectRef.current && updated.rankLevel < 9 && Math.random() < 0.15) {
        inspectEvent = generateUpperInspect(updated);
      }

      // 联邦内阁部委轮换（级别12）：每365天轮换一次部委
      let ministryRotate: { cityName: string; lastMinistryRotateDay: number } | null = null;
      if (updated.rankLevel === 12) {
        const lastRotate = updated.lastMinistryRotateDay ?? 0;
        if (lastRotate === 0 || newGameDays - lastRotate >= 365) {
          const newMinistry = getRandomMinistry();
          ministryRotate = { cityName: newMinistry.name, lastMinistryRotateDay: newGameDays };
        }
      }

      // 每180天触发干部交流任职事件（仅rank8）
      const lastExchange = updated.lastExchangeDay ?? 0;
      if (updated.rankLevel === 8 && newGameDays - lastExchange >= 180 && !exchangeOfficerRef.current) {
        const officer = generateExchangeOfficer();
        void updateSave(updated.id, { lastExchangeDay: newGameDays });
        const autoMode = updated.exchangeAutoMode ?? 'manual';
        if (autoMode === 'auto-accept') {
          void acceptExchangeOfficer(updated.id, updated.userId, officer);
        } else if (autoMode !== 'auto-decline') {
          setExchangeOfficer(officer);
        }
      }

      // 会议任务反馈
      if (meetingResult.meritBonus > 0 || meetingResult.failedSubIds.length > 0) {
        const parts: string[] = [];
        if (meetingResult.meritBonus > 0) parts.push(`📋 本月任务结算：+${meetingResult.meritBonus} 政绩`);
        if (meetingResult.failedSubIds.length > 0) parts.push(`⚠️ ${meetingResult.failedSubIds.length} 名干部未完成任务`);
        setMeetingTaskFeedback(parts.join('　'));
      }

      // 后台异步任务（不阻塞主流程）
      void Promise.allSettled([
        Math.random() < 0.30 ? generatePetitionEvent(updated.id, updated.userId, newGameDays) : Promise.resolve(),
        growPopulation(updated.id),
        autoGrowSecretaryAbility(updated.id),
        autoGrowSubAbility(updated.id),
        dailyEnergyRegen(updated.id, newGameDays, updated.rankLevel, updated.personalAssets ?? []),
        monthlyHealthRegen(updated.id, newGameDays, updated.rankLevel, updated.personalAssets ?? [], updated.playerAge ?? 30),
        checkPartySchoolCompletion(updated.id, newGameDays),
        checkPolicyExpiry(updated.id, newGameDays),
        aiGoverningAreasMonthly(updated.id),
        // NPC干部月度人事处理：到龄退休 + 落马被查
        processNpcPersonnelEvents(updated.id, updated.userId, newGameDays),
      ]);

      // ── 秘书自动施政检测 ──────────────────────────────────────────────────
      // 能力70: 50%概率 | 80: 60% | 90+: 65%，最多连续6月，第6月须手动
      let secAutoGovBonus = { gdp: 0, liv: 0, eco: 0, bus: 0, sec: 0, merit: 0 };
      let pendingSecAutoEvent: SecAutoGovEvent | null = null;
      let secAutoConsecUpdate: number | null = null;
      try {
        const sec = await getOrCreateSecretary(updated.id, updated.userId);
        if (sec && sec.isAppointed && sec.ability >= 70 && updated.secAutoGovEnabled) {
          const currentConsec = updated.secAutoConsecutiveMonths ?? 0;
          const abilityTier = sec.ability >= 90 ? 90 : sec.ability >= 80 ? 80 : 70;
          const probPct      = abilityTier >= 90 ? 65 : abilityTier >= 80 ? 60 : 50;
          if (currentConsec >= 5) {
            // 第6个月：强制手动，重置计数器，通知玩家
            pendingSecAutoEvent = { abilityTier, probPct, consecutiveMonths: 6, isLimit: true };
            secAutoConsecUpdate = 0;
          } else {
            if (Math.random() * 100 < probPct) {
              // 秘书代为完成全部施政行动：叠加政策效果
              pendingSecAutoEvent = {
                abilityTier, probPct,
                consecutiveMonths: currentConsec + 1, isLimit: false,
              };
              secAutoConsecUpdate = currentConsec + 1;
              // 聚合各部门施政效果（模拟全部门各执行一次政策行动）
              secAutoGovBonus = { gdp: 5, liv: 5, eco: 3, bus: 4, sec: 3, merit: 3 };
            } else {
              // 未触发，重置连续计数
              secAutoConsecUpdate = 0;
            }
          }
        }
      } catch { /* 秘书查询失败不影响主流程 */ }

      // ── 秘书自动招募（每季度触发一次，能力≥60 且开关已开启）────────────────────
      if (
        updated.secAutoRecruitEnabled &&
        newMonth !== prevMonth  // 确保是月度块（已在月度块内，此处冗余保险）
      ) {
        const currentRecruitKey = Math.floor(newGameDays / 90);
        const alreadyRecruited  = (updated.lastRecruitQuarter ?? 0) >= currentRecruitKey && currentRecruitKey > 0;
        if (!alreadyRecruited && currentRecruitKey > 0) {
          try {
            const sec2 = await getOrCreateSecretary(updated.id, updated.userId);
            if (sec2 && sec2.isAppointed && sec2.ability >= 60) {
              // fire-and-forget：后台静默完成本季度招募，不弹窗（秘书代劳）
              void triggerAutoRecruit(updated.id, updated.userId, currentRecruitKey, updated.rankLevel)
                .then(() => updateSave(updated.id, { lastRecruitQuarter: currentRecruitKey }));
            }
          } catch { /* 招募失败不阻塞主流程 */ }
        }
      }

      // ── 同派系老学长关系积分：每月+20（有同派系部级及以上老学长时触发）──────
      void (async () => {
        try {
          const playerFaction = updated.primaryFaction ?? '';
          if (!playerFaction) return;
          const bandMembers = await getNpcBand(updated.id);
          const hasFactionSenior = bandMembers.some(
            m => !m.isRetired && m.rankLevel >= 10 && m.faction === playerFaction
          );
          if (hasFactionSenior) {
            const newScore = Math.min(100, (updated.alumniScore ?? 0) + 20);
            await updateSave(updated.id, { alumniScore: newScore });
          }
        } catch {}
      })();

      // 合并月度所有更新，单次写库 + 单次 setSave
      const base = updated;
      const meetingMeritBonus = meetingResult.meritBonus;

      // 个人薪资：每月自动发放（按职级薪资配置，含补贴）
      const monthlySalary = RANK_SALARY[base.rankLevel] ?? 5500;
      // 各类补贴（车补、通讯、餐补等）：每月到账
      const monthlyAllowance = RANK_MONTHLY_ALLOWANCE[base.rankLevel] ?? 500;
      // 公积金个人缴存（月），单位同等缴存 → 每月进账 = 个人 + 单位 = 2倍个人缴存
      const personalHpf = RANK_PERSONAL_HPF[base.rankLevel] ?? 816;
      const monthlyHpfTotal = personalHpf * 2; // 个人+单位双倍计入公积金账户
      // 股票/基金投资月收益：遍历已购置资产
      const investItems = (base.personalAssets ?? []).filter(k =>
        ['stock_small', 'stock_medium', 'fund_invest'].includes(k)
      );
      const INVEST_PRICES: Record<string, number> = { stock_small: 50000, stock_medium: 200000, fund_invest: 100000 };
      const INVEST_RATES: Record<string, number> = { stock_small: 0.08, stock_medium: 0.06, fund_invest: 0.03 };
      let investReturn = 0;
      for (const k of investItems) {
        const basePrice = INVEST_PRICES[k] ?? 0;
        const rate = INVEST_RATES[k] ?? 0;
        // 股票有随机波动，基金较稳定
        const volatility = k === 'fund_invest' ? (Math.random() * 0.5 + 0.75) : (Math.random() * 1.4 + 0.3);
        investReturn += Math.round(basePrice * rate * volatility);
      }
      // 年终奖：每年12月（game_month===12）且当年未发过（lastAnnualBonusDay在本年之前）触发
      const gameMonth = Math.floor((newGameDays % 365) / 30) + 1;
      const gameYear = Math.floor(newGameDays / 365);
      const lastBonusYear = Math.floor((base.lastAnnualBonusDay ?? 0) / 365);
      const isAnnualBonusMonth = gameMonth === 12 && gameYear > lastBonusYear;
      // 绩效系数：优秀加20%，称职基准，不合格无年终奖
      const bonusMonths = RANK_ANNUAL_BONUS_MONTHS[base.rankLevel] ?? 1.0;
      const performanceMult = base.meritPoints >= 90 ? 1.2 : base.meritPoints >= 60 ? 1.0 : 0;
      const annualBonus = isAnnualBonusMonth ? Math.round(monthlySalary * bonusMonths * performanceMult) : 0;

      // 月度到账：工资 + 补贴 + 投资收益（公积金单独累计，不计入savings）
      const totalPersonalIncome = monthlySalary + monthlyAllowance + investReturn + annualBonus;

      // 部门自动效益 fundBalance 按职级系数放大
      // DEPT_CONFIG 里财政局 15万/月、税务局 20万/月 基准适用县级(rank4-6)
      // 乡镇(rank1-3)缩小、市/省/国家级按倍率扩大，贴近现实财政规模
      const fundMultiplier = RANK_FUND_MULTIPLIER[updated.rankLevel] ?? 1;
      const scaledDeptFund = Math.round(autoResult.fundBalance * fundMultiplier * 10) / 10;

      // 城市治理经费月度计算（放在 monthlyUpdates 外部）
      const monthlyGrant = Math.floor(50 + Math.random() * Math.min(450, base.rankLevel * 40));
      const monthlyMaintenance = Math.floor(100 + Math.random() * 300);
      const currentFund = saveRef.current?.cityGovFund ?? base.cityGovFund ?? 0;
      const monthlyFundBalance = Math.max(0, currentFund + monthlyGrant - monthlyMaintenance);

      const monthlyUpdates: Parameters<typeof updateSave>[1] = {
        lastMonthDay: newGameDays,
        lastSalaryDay: newGameDays,
        personalSavings: (base.personalSavings ?? 0) + totalPersonalIncome,
        providentFundBalance: (base.providentFundBalance ?? 0) + monthlyHpfTotal,
        ...(isAnnualBonusMonth ? { lastAnnualBonusDay: newGameDays } : {}),
        fundBalance: Math.round((base.fundBalance + monthlyTax + scaledDeptFund + provincialRemittance + nationalBuildRevenue) * 10) / 10,
        taxRevenue: Math.round(base.taxRevenue + monthlyTax + scaledDeptFund + provincialRemittance + nationalBuildRevenue),
        // 5项城市指标：每月随机自然波动（-10 ~ +5），不施政则缓慢衰减形成压力
        // 公式：随机值在 [-10, +5] 均匀分布，期望约 -2.5，长期不施政必然下滑
        cityGdp:        Math.min(100, Math.max(0, base.cityGdp        + (Math.random() * 15 - 10) + secAutoGovBonus.gdp)),
        cityLivelihood: Math.min(100, Math.max(0, base.cityLivelihood + (Math.random() * 15 - 10) + secAutoGovBonus.liv)),
        cityEcology:    Math.min(100, Math.max(0, base.cityEcology    + (Math.random() * 15 - 10) + secAutoGovBonus.eco)),
        cityBusiness:   Math.min(100, Math.max(0, base.cityBusiness   + (Math.random() * 15 - 10) + secAutoGovBonus.bus)),
        securityIndex:  Math.min(100, Math.max(0, base.securityIndex  + (Math.random() * 15 - 10) + secAutoGovBonus.sec)),
        meritPoints:    base.digitalGovBuilt
          ? Math.min(999, ((base.meritPoints ?? 0) + 5))
          : inspectEvent
            ? Math.max(0, Math.round((base.meritPoints + autoResult.meritPoints + inspectEvent.meritDelta + meetingMeritBonus + secAutoGovBonus.merit) * 10) / 10)
            : Math.round((base.meritPoints + autoResult.meritPoints + meetingMeritBonus + secAutoGovBonus.merit) * 10) / 10,
        bossFavor: inspectEvent
          ? Math.min(100, Math.max(0, base.bossFavor + autoResult.bossFavor + inspectEvent.favorDelta))
          : Math.min(100, Math.max(0, base.bossFavor + autoResult.bossFavor)),
        ...(ministryRotate ? { cityName: ministryRotate.cityName, lastMinistryRotateDay: ministryRotate.lastMinistryRotateDay } : {}),
        ...(secAutoConsecUpdate !== null ? { secAutoConsecutiveMonths: secAutoConsecUpdate } : {}),
        // ── 新系统：月度自动更新 ──────────────────────────────────────────
        // 舆情指数：每月自然衰减2~4（长期不处置会缓慢降低），若有群体性事件待处理则额外-3
        // 城治经费耗尽时额外-8（合并至此，避免被后续展开覆盖）
        publicOpinionIndex: Math.min(100, Math.max(0,
          (base.publicOpinionIndex ?? 60)
          - (2 + Math.floor(Math.random() * 3))
          - ((base.massIncidentPending ?? 0) > 0 ? 3 : 0)
          + secAutoGovBonus.liv * 0.5  // 民生施政自动缓解舆情
          - (monthlyFundBalance <= 0 ? 8 : 0)  // 城治经费耗尽惩罚
        )),
        // 巡视风险：每月随机积累1~4（收受贿赂越多积累越快），保护伞等级降低风险
        inspectionRisk: Math.min(100, Math.max(0,
          (base.inspectionRisk ?? 10)
          + (1 + Math.floor(Math.random() * 4))
          + ((base.briberyAccepted ?? 0) > 5 ? 3 : 0)   // 贿赂累计>5次额外+3
          - ((base.protectionUmbrellaLevel ?? 0) * 2)    // 保护伞每级-2
          - ((base.factionInternalRank === 'leader' ? 5 : base.factionInternalRank === 'backbone' ? 2 : 0)) // 派系层级保护
        )),
        // 群体性事件：10%概率每月自动触发1个新事件（若当前待处理<3）
        massIncidentPending: (base.massIncidentPending ?? 0) < 3 && Math.random() < 0.10
          ? (base.massIncidentPending ?? 0) + 1
          : (base.massIncidentPending ?? 0),
        // 派系积分：有主派系时每月+2（骨干+4，领袖+6），激励维持派系关系
        factionPoints: base.primaryFaction ? Math.min(999,
          (base.factionPoints ?? 0)
          + (base.factionInternalRank === 'leader' ? 6 : base.factionInternalRank === 'backbone' ? 4 : 2)
        ) : (base.factionPoints ?? 0),
        // 传承资产：每月派系相关自然增长（有主派系）
        inheritancePolitical: base.primaryFaction
          ? Math.min(999, (base.inheritancePolitical ?? 0) + (base.factionInternalRank === 'leader' ? 2 : 1))
          : (base.inheritancePolitical ?? 0),
        // 贿赂事件：15%概率每月随机触发一次（若当前无待处理事件）
        ...(!(base.pendingBriberyEvent) && Math.random() < 0.15 ? (() => {
          const npcs = [
            { npcName: '王老板', npcType: '商人', amount: Math.round((30000 + Math.random() * 70000) / 10000) * 10000 },
            { npcName: '李承包', npcType: '承包商', amount: Math.round((50000 + Math.random() * 150000) / 10000) * 10000 },
            { npcName: '张副局', npcType: '下属', amount: Math.round((20000 + Math.random() * 50000) / 10000) * 10000 },
            { npcName: '陈开发', npcType: '开发商', amount: Math.round((100000 + Math.random() * 400000) / 10000) * 10000 },
          ];
          return { pendingBriberyEvent: npcs[Math.floor(Math.random() * npcs.length)]! };
        })() : {}),
        // 上级月度拨款增量：后续在 setSave 中基于 saveRef.current.cityGovFund 增量计算，
        // 避免覆盖用户在月度 tick 期间的扣款操作
        // 城治经费耗尽惩罚：每月自动扣减线路积分（舆情惩罚已合并到上方计算中）
        ...(monthlyFundBalance <= 0 ? {
          lineKpiScore: Math.max(0, (base.lineKpiScore ?? 0) - 10),
        } : {}),
      };
      const monthlyNetDelta = monthlyGrant - monthlyMaintenance;
      const withMonthly = await updateSave(updated.id, monthlyUpdates);
      if (withMonthly) {
        // 城市治理经费：以 saveRef.current.cityGovFund（含乐观更新）为基准，
        // 叠加月度净增量，确保用户扣款不被月度结算覆盖
        const latestFund = saveRef.current?.cityGovFund;
        if (latestFund !== undefined) {
          const expectedFund = Math.max(0, latestFund + monthlyNetDelta);
          setSave({ ...withMonthly, cityGovFund: expectedFund });
          if (expectedFund !== withMonthly.cityGovFund) {
            pendingPlayerOpsRef.current.push({ cityGovFund: expectedFund });
            void saveCooldownCache(updated.id, { cityGovFund: expectedFund });
          }
        } else {
          setSave(withMonthly);
        }
      }
      if (inspectEvent) setUpperInspectEvent(inspectEvent);
      if (pendingSecAutoEvent) setSecAutoGovTrigger(pendingSecAutoEvent);

      // ── 非党务线：20%概率由上级党委代为召开月度会议（奖励减半）─────────────
      void (async () => {
        try {
          const curLine = (withMonthly ?? updated).careerPathLine ?? '党务线';
          if (curLine !== '党务线' && Math.random() < 0.20) {
            const monthKey = String(Math.floor(newGameDays / 30));
            const existing = await getMeetingByMonth((withMonthly ?? updated).id, monthKey);
            if (!existing) {
              const npcTasks: import('@/types/game').MeetingTask[] = [{
                subordinateId: 'npc',
                subordinateName: '上级党委',
                kpiType: 'livelihood',
                targetValue: 5,
                deadlineDay: newGameDays + 30,
                status: 'pending',
                completedDay: null,
              }];
              await createMeeting((withMonthly ?? updated).id, (withMonthly ?? updated).userId, monthKey, newGameDays, npcTasks);
            }
          }
        } catch {}
      })();

      // ── 部门月度事件 + 军转剧情（每月最多触发1次，不阻塞主流程）────────────────
      if (!deptMonthlyEventRef.current) {
        const deptKey = inferDeptKeyFromPosition(updated.playerPosition ?? '');
        const drawn = drawMonthlyDeptEvent(
          deptKey,
          updated.isMilitaryTransfer ?? false,
          updated.lastEventChainKey ?? '',
          updated.rankLevel,
          undefined, // kpiScore 在月结算时暂无最新值，用 undefined（函数内默认60）
          updated.networkValue ?? 0,
        );
        if (drawn) setDeptMonthlyEvent(drawn);
      }

      // ── 应急编制到期处理（月结算后检查）─────────────────────────────
      void (async () => {
        const cur = withMonthly ?? updated;
        if (cur.emergencyStaffExpiry > 0 && newGameDays >= cur.emergencyStaffExpiry) {
          // 应急编制已到期，计算无应急加成的有效编制上限
          const bits = cur.staffApplyBits ?? 0;
          const expandCount = bits >> 4;
          const baseQ = getDeptStaffQuota(cur.rankLevel);
          const perDeptLimit = baseQ + expandCount * 20;
          // 超出部分科员自动离岗
          const dismissed = await expireEmergencyStaff(cur.id, perDeptLimit);
          // 清空应急编制标记
          const cleared = await updateSave(cur.id, { emergencyStaffExpiry: 0 });
          if (cleared) setSave(cleared);
          if (dismissed > 0) {
            // 通知玩家（写入月度报告反馈）
            void generateMonthlyReports(cur.id, cur.userId, newGameDays);
          }
        }
      })();

      // ── 相亲 & 怀孕/生育（月度异步，不阻塞主流程）──
      void (async () => {
        const cur = withMonthly ?? updated;
        // 1. 未婚时每月刷新相亲NPC（性别与玩家相反）
        if (cur.marriageStatus !== 'married') {
          const newNpcs = generateBlindDateNpcs(cur.playerGender as '男' | '女');
          const saved = await updateSave(cur.id, { blindDateNpcs: newNpcs });
          if (saved) setSave(saved);
        } else {
          // 2. 已婚且未怀孕：检测怀孕触发
          if (cur.pregnantDay === 0) {
            const spouseRel = cur.spouseRelationValue ?? 0;
            const childCount = await getChildCount(cur.id);
            if (spouseRel > 80 && childCount < 3) {
              // 第1胎60%、第2胎30%、第3胎5%
              const pregnancyProbs = [0.60, 0.30, 0.05];
              const prob = pregnancyProbs[Math.min(childCount, 2)];
              if (Math.random() < prob) {
                const saved = await updateSave(cur.id, { pregnantDay: newGameDays });
                if (saved) setSave(saved);
              }
            }
          } else {
            // 3. 已怀孕：满270天（9个月）自动生育
            if (newGameDays - cur.pregnantDay >= 270) {
              const babyGender: '男' | '女' = Math.random() < 0.5 ? '男' : '女';
              const familyName = cur.playerName.charAt(0);
              await addChild(cur.id, cur.userId, babyGender, newGameDays, familyName);
              const saved = await updateSave(cur.id, { pregnantDay: 0 });
              if (saved) setSave(saved);
            }
          }
        }
      })();

      // NPC 月度代会换届/补缺（并行，不阻塞主流程）
      void (async () => {
        // 子女公务员自动晋升（每月30%概率，上限 = 玩家级别-2，最高10级）
        const curForChild = withMonthly ?? updated;
        const playerRankCap = Math.max(1, curForChild.rankLevel - 2);
        const childMembers = await getFamilyMembers(curForChild.id);
        for (const child of childMembers) {
          if (!child.isAdult || child.job !== '考公务员') continue;
          const m = child.adultPath?.match(/官职级(\d+)/);
          const curRank = m ? parseInt(m[1]) : 1;
          const maxRank = Math.min(10, playerRankCap);
          if (curRank < maxRank && Math.random() < 0.30) {
            const nextRank = curRank + 1;
            const RANK_LABELS = ['办事员','科员','副科级','正科级','副处级','正处级','副厅级','正厅级','副部级','正部级'];
            const nextLabel = RANK_LABELS[nextRank - 1] ?? '正部级';
            const newPath = child.adultPath
              ? child.adultPath.replace(/官职级\d+/, `官职级${nextRank}`).replace(/职级:[^|]+/, `职级:${nextLabel}`)
              : `职业:考公务员|官职级${nextRank}|职级:${nextLabel}`;
            await updateFamilyMember(child.id, { adultPath: newPath });
          }
        }
        // 月度补缺：填充退休后尚无继任者的职位
        const latestForCongress = curForChild; // 复用同一快照
        await npcMonthlyCongressAppoint(
          latestForCongress.id, newGameDays, latestForCongress.rankLevel,
          latestForCongress.cityName, latestForCongress.birthProvince, latestForCongress.birthCity,
        );
        // 届满换届：每5年整体重建班子
        const triggered = await npcTriggerCongressIfDue(
          latestForCongress.id, latestForCongress.userId, newGameDays,
          latestForCongress.rankLevel, latestForCongress.playerName, latestForCongress.rankName,
          latestForCongress.lastCongressDay ?? 0,
          latestForCongress.cityName, latestForCongress.birthProvince, latestForCongress.birthCity,
        );
        if (triggered) {
          // 同步更新 lastCongressDay 到 save（避免下次重复触发）
          const postCongress = await updateSave(latestForCongress.id, { lastCongressDay: newGameDays });
          if (postCongress) setSave(postCongress);
        }
      })();

      // 退休检查：每月结算后，检查是否达到退休年龄（尚未触发弹窗时才检测）
      if (!retirementTriggerRef.current && !renewalVoteTriggerRef.current) {
        const finalSave = withMonthly ?? updated;
        const retireStatus = checkRetirementStatus(
          finalSave.rankLevel,
          finalSave.playerAge,
          finalSave.retirementDelayYears,
        );

        if (finalSave.rankLevel === 15 && finalSave.tenureYears >= 5 && finalSave.tenureYears % 5 === 0) {
          // rank15（执政党主席·联邦总统）：每届5年届满触发联邦党代会/联邦国会续任投票
          const alreadyVotedThisTerm = (finalSave.lastPartyCongressDay ?? 0) >= (finalSave.tenureDays - 45);
          if (!alreadyVotedThisTerm) {
            const voteResult = calcRenewalVote(
              finalSave.moralValue,
              finalSave.meritPoints,
              finalSave.cityGdp,
              finalSave.bossFavor,
              finalSave.boss2Favor,
              finalSave.nationalTermsServed,
            );
            setIsRunning(false);
            setRenewalVoteTrigger({
              rankLevel: 15,
              voteRate: voteResult.voteRate,
              passed: voteResult.passed,
              termsAfter: voteResult.termsAfter,
            });
            await updateSave(finalSave.id, { lastPartyCongressDay: finalSave.tenureDays });
          }
        } else if (finalSave.rankLevel === 14 && finalSave.tenureYears >= 5 && finalSave.tenureYears % 5 === 0) {
          // rank14（联邦内阁总理）：宪法规定连任不超过两届
          const alreadyVotedThisTerm = (finalSave.lastPartyCongressDay ?? 0) >= (finalSave.tenureDays - 45);
          if (!alreadyVotedThisTerm) {
            if (finalSave.nationalTermsServed >= 1) {
              // 已满一届，宪法硬性限制，触发强制卸任
              setIsRunning(false);
              setRetirementTrigger('mandatory');
            } else {
              // 第一届届满，触发续任投票（连任第二届）
              const voteResult = calcRenewalVote(
                finalSave.moralValue,
                finalSave.meritPoints,
                finalSave.cityGdp,
                finalSave.bossFavor,
                finalSave.boss2Favor,
                finalSave.nationalTermsServed,
              );
              setIsRunning(false);
              setRenewalVoteTrigger({
                rankLevel: 14,
                voteRate: voteResult.voteRate,
                passed: voteResult.passed,
                termsAfter: voteResult.termsAfter,
              });
              await updateSave(finalSave.id, { lastPartyCongressDay: finalSave.tenureDays });
            }
          }
        } else if (retireStatus.type === 'mandatory') {
          setIsRunning(false);
          setRetirementTrigger('mandatory');
        } else if (retireStatus.type === 'voluntary') {
          setIsRunning(false);
          setRetirementTrigger('voluntary');
        }
      }

      // ══ 三大机制月度检测 ════════════════════════════════════════
      const latestSave = withMonthly ?? updated;

      // ① Game Over 检测（最高优先级）
      if (!gameOverRef.current) {
        // 落马：道德值归零
        if (latestSave.moralValue <= 0) {
          setIsRunning(false);
          setGameOverTrigger('corruption');
          await updateSave(latestSave.id, { gameOverType: 'corruption' });
        }
        // 重大事故：连续失败事件 >= 3 且安全指数归零
        else if (latestSave.consecutiveFailEvents >= 3 && latestSave.securityIndex <= 0) {
          setIsRunning(false);
          setGameOverTrigger('accident');
          await updateSave(latestSave.id, { gameOverType: 'accident' });
        }
        // 政治清洗：某派系被彻底压制
        else if (
          (latestSave.reformFaction <= 0 && latestSave.pragmaticFaction >= 80) ||
          (latestSave.pragmaticFaction <= 0 && latestSave.reformFaction >= 80)
        ) {
          setIsRunning(false);
          setGameOverTrigger('purge');
          await updateSave(latestSave.id, { gameOverType: 'purge' });
        }
      }

      // ② 纪委风险检测（未触发Game Over 且 无待处理弹窗时）
      if (!gameOverRef.current && !disciplineWarnRef.current) {
        const moral = latestSave.moralValue;
        const daysSinceWarn = newGameDays - (latestSave.lastDisciplineWarnDay ?? 0);
        const daysSinceCase = newGameDays - (latestSave.lastCaseCheckDay ?? 0);
        // 人脉降低纪委风险：每 20 点 networkValue 降低 1%（上限 -10%）
        const networkShield = Math.min(0.10, Math.floor((latestSave.networkValue ?? 0) / 20) * 0.01);

        if (moral > 0 && moral < 15 && daysSinceCase >= 30 && Math.random() < Math.max(0.05, 0.50 - networkShield)) {
          // 立案审查
          const officer = genDisciplineOfficer();
          const event: DisciplineWarnEvent = {
            type: 'investigation',
            officerName: officer,
            meritPenalty: 40,
            moralChange: -10,
            content: `纪检肃宪督察院已对你的相关违纪问题展开初步调查。经组织研究决定，对你进行立案审查。请你配合调查，如实说明问题，如隐瞒情节将从重处理。`,
          };
          setIsRunning(false);
          setDisciplineWarnEvent(event);
          await updateSave(latestSave.id, { lastCaseCheckDay: newGameDays });
        } else if (moral >= 15 && moral < 30 && daysSinceWarn >= 90 && Math.random() < Math.max(0.05, 0.40 - networkShield)) {
          // 纪委约谈
          const officer = genDisciplineOfficer();
          const event: DisciplineWarnEvent = {
            type: 'warn',
            officerName: officer,
            meritPenalty: 20,
            moralChange: 5,
            content: `纪委${officer}约谈通知：经研究，决定对你进行提醒谈话。请认真对照党纪党规进行自查，提高廉洁自律意识，维护干部队伍形象。`,
          };
          setDisciplineWarnEvent(event);
          await updateSave(latestSave.id, { lastDisciplineWarnDay: newGameDays });
        }
      }

      // ③ 上司换届检测（串行，每次只换一个，避免信息轰炸）
      if (!bossChangeRef.current && !gameOverRef.current) {
        const s = latestSave;
        const rankCfg = RANK_CONFIG[s.rankLevel];
        const FACTIONS: PlayerSave['bossFaction'][] = ['改革派', '实干派', '保守派'];
        const pickFaction = () => FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
        // 检测上司1
        if (newGameDays >= (s.bossTenureStart ?? 0) + (s.bossTenureDuration ?? 1460)) {
          const newName = genBossName();
          const newFavor = 30 + Math.floor(Math.random() * 31);
          const newDuration = 1095 + Math.floor(Math.random() * 731);
          const newFaction = pickFaction();
          setBossChangeEvent({
            bossNum: 1, oldBossName: s.bossName, newBossName: newName,
            position: rankCfg.bossTitle, newFavor,
          });
          await updateSave(s.id, {
            bossName: newName, bossFavor: newFavor, bossFaction: newFaction,
            bossTenureStart: newGameDays, bossTenureDuration: newDuration,
          });
        }
        // 检测上司2
        else if (newGameDays >= (s.boss2TenureStart ?? 0) + (s.boss2TenureDuration ?? 1460)) {
          const newName = genBossName();
          const newFavor = 30 + Math.floor(Math.random() * 31);
          const newDuration = 1095 + Math.floor(Math.random() * 731);
          setBossChangeEvent({
            bossNum: 2, oldBossName: s.boss2Name, newBossName: newName,
            position: rankCfg.bossTitle2, newFavor,
          });
          await updateSave(s.id, {
            boss2Name: newName, boss2Favor: newFavor,
            boss2TenureStart: newGameDays, boss2TenureDuration: newDuration,
          });
        }
        // 检测上司3
        else if (newGameDays >= (s.boss3TenureStart ?? 0) + (s.boss3TenureDuration ?? 1460)) {
          const newName = genBossName();
          const newFavor = 30 + Math.floor(Math.random() * 31);
          const newDuration = 1095 + Math.floor(Math.random() * 731);
          setBossChangeEvent({
            bossNum: 3, oldBossName: s.boss3Name, newBossName: newName,
            position: rankCfg.bossTitle3, newFavor,
          });
          await updateSave(s.id, {
            boss3Name: newName, boss3Favor: newFavor,
            boss3TenureStart: newGameDays, boss3TenureDuration: newDuration,
          });
        }
      }

      // ④ 自动升职 / 平调 / 破格晋升检测
      // 条件：无Game Over、无退休弹窗、未在等待弹窗确认、职级未达顶级(14/15交由续任流程)
      if (
        !gameOverRef.current &&
        !retirementTriggerRef.current &&
        !renewalVoteTriggerRef.current &&
        !promotionReadyRef.current &&
        !lateralTransferRef.current &&
        latestSave.rankLevel < 14
      ) {
        const checkSave = latestSave;
        const rankCfg = RANK_CONFIG[checkSave.rankLevel];
        const kpiSnap = {
          rankLevel: checkSave.rankLevel,
          careerPath: checkSave.careerPath,
          moralValue: checkSave.moralValue,
          securityIndex: checkSave.securityIndex,
          cityGdp: checkSave.cityGdp,
          cityLivelihood: checkSave.cityLivelihood,
          cityEcology: checkSave.cityEcology,
          cityBusiness: checkSave.cityBusiness,
          bossFavor: checkSave.bossFavor,
          boss2Favor: checkSave.boss2Favor,
          boss3Favor: checkSave.boss3Favor,
          annualRankPct: checkSave.annualRankPct,
          taxRevenue: checkSave.taxRevenue ?? 0,
          tenureYears: newTenureYears,
          meritPoints: checkSave.meritPoints,
          lineKpiScore: checkSave.lineKpiScore ?? 0,
          inspectionRisk: checkSave.inspectionRisk ?? 10,
          publicOpinionIndex: checkSave.publicOpinionIndex ?? 60,
        };
        const kpiResult = computeKpi(kpiSnap);

        // 破格晋升：按各级最长任期动态确定触发年份 + KPI达标 + 梯度概率
        // 规则：县级(maxTenure=3)→第2年触发；市/副省/省/国家级(maxTenure=5)→第3年触发；rank15→无破格
        // 基础概率：首届50%；上届未触发→75%；再次未触发→90%
        // 叠加述职奖惩：每年达标+1%，未达标-10%，累计范围[-50%,+30%]
        // 人脉加成：每 25 点 networkValue +2%（上限 +16%）
        const rankMaxTenure = RANK_CONFIG[checkSave.rankLevel]?.maxTenureYears ?? 5;
        const exceptionalTriggerYear = rankMaxTenure <= 3 ? 2 : 3;
        // rank15 联邦政务常委会10年一届，已到顶，无破格晋升
        // 必须同时满足最低任职年限，才可触发破格晋升（不得早于 requiredTenureYears）
        const minTenureReq = rankCfg?.requiredTenureYears ?? 2;
        const isThirdYear = checkSave.rankLevel < 15
          && newTenureYears >= exceptionalTriggerYear
          && newTenureYears >= minTenureReq;
        const missedTerms = checkSave.exceptionalMissedTerms ?? 0;
        const baseProb = missedTerms >= 2 ? 0.90 : missedTerms === 1 ? 0.75 : 0.50;
        const debriefBonus = checkSave.exceptionalPromoBonus ?? 0;
        const networkBonus = Math.min(0.16, Math.floor((checkSave.networkValue ?? 0) / 25) * 0.02);
        const exceptionalProb = Math.max(0.05, Math.min(0.98, baseProb + debriefBonus + networkBonus));
        const hasChance = isThirdYear && kpiResult.eligible && !checkSave.isPromotionAvailable && Math.random() < exceptionalProb;
        if (hasChance) {
          setIsRunning(false);
          // 触发成功：重置错过次数，标记晋升可用（防止下月重复触发）
          const exceptionalUpdated = await updateSave(checkSave.id, { exceptionalMissedTerms: 0, isPromotionAvailable: true });
          // 立即同步本地状态，避免下月月推进覆盖回false
          if (exceptionalUpdated) setSave(exceptionalUpdated);
          setPromotionReadyTrigger({
            mode: 'exceptional',
            rankLevel: checkSave.rankLevel,
            rankName: checkSave.rankName,
            tenureYears: newTenureYears,
            kpiScore: kpiResult.totalScore,
            cityName: checkSave.cityName,
            mentorName: undefined,
          });
        }
        // 任期第三年但未触发：累计错过次数
        else if (isThirdYear && kpiResult.eligible && !checkSave.isPromotionAvailable && !hasChance) {
          await updateSave(checkSave.id, { exceptionalMissedTerms: missedTerms + 1 });
        }
        // ── 同一地方任期上限（rank<12）：满2轮未晋升→强制平调 ────────────────
        // sameLocTerms 在每次届满时+1，晋升/平调后重置为0
        const prevSameLocTerms = checkSave.sameLocTerms ?? 0;
        const isTenureEnd = newTenureYears >= (rankCfg?.maxTenureYears ?? 5);
        const newSameLocTerms = isTenureEnd ? prevSameLocTerms + 1 : prevSameLocTerms;
        // rank<12 且已满2轮、本届不达标或未开放晋升 → 强制平调（不再给第3轮机会）
        if (
          isTenureEnd &&
          checkSave.rankLevel < 12 &&
          newSameLocTerms >= 2 &&
          kpiResult.eligible &&
          !checkSave.isPromotionAvailable
        ) {
          setIsRunning(false);
          await updateSave(checkSave.id, { sameLocTerms: 0, kpiFailedTerms: 0 });
          const [sec2, allSubs2] = await Promise.all([
            getOrCreateSecretary(checkSave.id, checkSave.userId),
            getSubordinates(checkSave.id),
          ]);
          if (sec2?.isAppointed && sec2.subId) {
            const secSub2 = allSubs2.find(s => s.id === sec2.subId);
            setSecretaryReleaseTrigger({
              saveId: checkSave.id, saveUserId: checkSave.userId,
              secretarySubId: sec2.subId, secretaryName: sec2.name,
              secretaryAbility: sec2.ability, secretaryAvatarId: sec2.avatarId,
              secretaryGender: secSub2?.gender ?? '男',
              fromRankLevel: checkSave.rankLevel, fromCityName: checkSave.cityName, moveType: 'lateral',
            });
          }
          if (checkSave.rankLevel >= 3) {
            setSecretarySelectTrigger({ saveId: checkSave.id, userId: checkSave.userId, fromRankLevel: checkSave.rankLevel, moveType: 'lateral' });
          }
          setLateralTransferTrigger({
            rankLevel: checkSave.rankLevel, rankName: checkSave.rankName,
            tenureYears: newTenureYears, maxTenureYears: rankCfg?.maxTenureYears ?? 5,
            cityName: checkSave.cityName,
            reason: `已在${checkSave.cityName}连续任职 ${newSameLocTerms} 届（${newTenureYears} 年），达同一地区任期上限，组织部决定对您进行平级调配。`,
          });
          return;
        }
        // 每届满时累积 sameLocTerms
        if (isTenureEnd && !checkSave.isPromotionAvailable) {
          await updateSave(checkSave.id, { sameLocTerms: newSameLocTerms });
        }

        // 届满自动晋升：满届且 KPI 达标，且尚未标记晋升可用（防止每月重复弹窗）
        if (newTenureYears >= (rankCfg?.maxTenureYears ?? 5) && kpiResult.eligible && !checkSave.isPromotionAvailable) {
          setIsRunning(false);
          // 检查是否有已任命秘书，如有则触发秘书下放（与 getSubordinates 并行）
          const [sec, allSubsForPromo] = await Promise.all([
            getOrCreateSecretary(checkSave.id, checkSave.userId),
            getSubordinates(checkSave.id),
          ]);
          if (sec?.isAppointed && sec.subId) {
            const secSub = allSubsForPromo.find(s => s.id === sec.subId);
            setSecretaryReleaseTrigger({
              saveId: checkSave.id,
              saveUserId: checkSave.userId,
              secretarySubId: sec.subId,
              secretaryName: sec.name,
              secretaryAbility: sec.ability,
              secretaryAvatarId: sec.avatarId,
              secretaryGender: secSub?.gender ?? '男',
              fromRankLevel: checkSave.rankLevel,
              fromCityName: checkSave.cityName,
              moveType: 'promotion',
            });
          }
          // rank>=3 晋升时触发新秘书候选选择
          if (checkSave.rankLevel >= 3) {
            setSecretarySelectTrigger({
              saveId: checkSave.id,
              userId: checkSave.userId,
              fromRankLevel: checkSave.rankLevel,
              moveType: 'promotion',
            });
          }
          setPromotionReadyTrigger({
            mode: 'normal',
            rankLevel: checkSave.rankLevel,
            rankName: checkSave.rankName,
            tenureYears: newTenureYears,
            kpiScore: kpiResult.totalScore,
            cityName: checkSave.cityName,
          });
        }
        // ── KPI 不达标多档惩罚 ──────────────────────────────────────────
        // 第1届不及格：50% 平调 / 50% 降职
        // 第2届不及格：降职概率+60%（即降职90%）/ 10% 下马（免职）
        // 第3届及以上不及格：90% 下马（免职），10% 降职
        else if (newTenureYears >= (rankCfg?.maxTenureYears ?? 5) && !kpiResult.eligible) {
          const prevFailed = checkSave.kpiFailedTerms ?? 0;
          const newFailed  = prevFailed + 1;

          // 先持久化 kpiFailedTerms 累计数
          await updateSave(checkSave.id, { kpiFailedTerms: newFailed });

          // 随机骰子决定惩罚档位
          const roll = Math.random();

          // ── 第3届及以上：90% 下马，10% 降职 ──────────────────────────
          if (newFailed >= 3) {
            const isPurge = roll < 0.90;
            setIsRunning(false);
            if (isPurge) {
              setRetirementTrigger('purge');
            } else {
              // 降职处理
              const demotedLevel = Math.max(1, checkSave.rankLevel - 1);
              await updateSave(checkSave.id, {
                rankLevel: demotedLevel,
                rankName: getLineRankTitle((checkSave.careerPathLine ?? '行政线') as CareerLineName, demotedLevel).title,
                tenureYears: 0, tenureDays: 0,
                lateralCount: (checkSave.lateralCount ?? 0) + 1,
              });
              setRetirementTrigger('demotion');
            }
            return;
          }

          // ── 第2届：10% 下马，60% 降职，30% 平调 ──────────────────────
          if (newFailed === 2) {
            setIsRunning(false);
            if (roll < 0.10) {
              // 下马
              setRetirementTrigger('purge');
              return;
            } else if (roll < 0.70) {
              // 降职
              const demotedLevel = Math.max(1, checkSave.rankLevel - 1);
              await updateSave(checkSave.id, {
                rankLevel: demotedLevel,
                rankName: getLineRankTitle((checkSave.careerPathLine ?? '行政线') as CareerLineName, demotedLevel).title,
                tenureYears: 0, tenureDays: 0,
                lateralCount: (checkSave.lateralCount ?? 0) + 1,
              });
              setRetirementTrigger('demotion');
              return;
            }
            // else → 平调（走下方平调流程）
          }

          // ── 第1届（或第2届平调分支）：50% 平调 / 50% 降职 ──────────────
          const isLateral = newFailed >= 2 ? true : roll < 0.50; // 第2届平调分支强制走平调
          void isLateral; // 第1届 roll 已上方使用

          // 第1届：50% 降职
          if (newFailed === 1 && roll >= 0.50) {
            setIsRunning(false);
            const demotedLevel = Math.max(1, checkSave.rankLevel - 1);
            await updateSave(checkSave.id, {
              rankLevel: demotedLevel,
              rankName: getLineRankTitle((checkSave.careerPathLine ?? '行政线') as CareerLineName, demotedLevel).title,
              tenureYears: 0, tenureDays: 0,
              lateralCount: (checkSave.lateralCount ?? 0) + 1,
            });
            setRetirementTrigger('demotion');
            return;
          }

          // 平调逻辑（第1届 roll<0.5 或 第2届平调分支）
          const reason = checkSave.assessmentGrade === '合格' || checkSave.assessmentGrade === '不合格'
            ? `本届任期考核等次为"${checkSave.assessmentGrade === '合格' ? '基本称职' : '不称职'}"，KPI综合得分（${kpiResult.totalScore}分）未达晋升标准，组织决定对您进行平级调配以优化干部结构。`
            : `任期已满 ${newTenureYears} 年，超出本级最长任期 ${rankCfg?.maxTenureYears ?? 5} 年的规定，经综合评估后组织部决定对您实施平级调配。`;
          setIsRunning(false);
          // 平调时重置 sameLocTerms（新地方重新计算）
          await updateSave(checkSave.id, { sameLocTerms: 0 });
          const [sec, allSubsForLateral] = await Promise.all([
            getOrCreateSecretary(checkSave.id, checkSave.userId),
            getSubordinates(checkSave.id),
          ]);
          if (sec?.isAppointed && sec.subId) {
            const secSub = allSubsForLateral.find(s => s.id === sec.subId);
            setSecretaryReleaseTrigger({
              saveId: checkSave.id,
              saveUserId: checkSave.userId,
              secretarySubId: sec.subId,
              secretaryName: sec.name,
              secretaryAbility: sec.ability,
              secretaryAvatarId: sec.avatarId,
              secretaryGender: secSub?.gender ?? '男',
              fromRankLevel: checkSave.rankLevel,
              fromCityName: checkSave.cityName,
              moveType: 'lateral',
            });
          }
          // rank>=3 平调时也触发新秘书候选
          if (checkSave.rankLevel >= 3) {
            setSecretarySelectTrigger({
              saveId: checkSave.id,
              userId: checkSave.userId,
              fromRankLevel: checkSave.rankLevel,
              moveType: 'lateral',
            });
          }
          setLateralTransferTrigger({
            rankLevel: checkSave.rankLevel,
            rankName: checkSave.rankName,
            tenureYears: newTenureYears,
            maxTenureYears: rankCfg?.maxTenureYears ?? 5,
            cityName: checkSave.cityName,
            reason,
          });
        }
      }
    } // if (newMonth > prevMonth && updated)

    // ── 路线KPI低分警告（月度，非行政线）─────────────────────────────────────
    if (newMonth > prevMonth && updated && !lineKpiWarnRef.current) {
      const lineKey = updated.careerPathLine ?? '';
      const lineDeptKey =
        lineKey === '党务线' ? 'party' :
        lineKey === '纪检线' ? 'discipline_line' :
        lineKey === '团派线' ? 'league' : null;
      if (lineDeptKey) {
        const lineSnap = {
          rankLevel: updated.rankLevel, moralValue: updated.moralValue,
          securityIndex: updated.securityIndex, cityGdp: updated.cityGdp,
          cityLivelihood: updated.cityLivelihood, cityEcology: updated.cityEcology,
          cityBusiness: updated.cityBusiness, bossFavor: updated.bossFavor,
          boss2Favor: updated.boss2Favor, boss3Favor: updated.boss3Favor,
          annualRankPct: updated.annualRankPct ?? 0.5, taxRevenue: updated.taxRevenue ?? 0,
          tenureYears: updated.tenureYears, meritPoints: updated.meritPoints,
        };
        const lineKpi = getDeptKpiResult(lineDeptKey, lineSnap);
        // 找到分数最低且低于40分的维度触发警告
        const WARN_THRESHOLD = 40;
        const LINE_WARN_MSGS: Record<string, Record<string, string>> = {
          party: {
            party_building: '上级党委已下达加强党建工作的专项督导，请尽快整改。',
            ideology: '意识形态工作评分偏低，上级党委已发出专项通报批评。',
            party_discipline: '党纪执行不力，纪检委将对本级党委展开专项巡察。',
            organization: '组织工作考评不达标，上级组织部已启动约谈程序。',
          },
          discipline_line: {
            case_handling: '案件查处指标偏低，上级纪委已启动督办程序，限期整改。',
            self_discipline: '廉洁自律评分不足，上级派驻组将进行专项检查。',
            supervision: '监督执纪工作滞后，上级已要求限期提交专项整改报告。',
            report_handling: '信访举报处理率未达标，上级信访局将派员督导。',
          },
          league: {
            youth_work: '青年工作指标偏低，团省委已发出整改函，要求专项提升。',
            volunteer: '志愿服务工作落后，上级团委已启动专项督查程序。',
            innovation: '创新创业服务不足，上级已下达整改通知，限期完成。',
            organization_league: '团组织建设薄弱，上级团委将进行专项检查督导。',
          },
        };
        const warnMsgs = LINE_WARN_MSGS[lineDeptKey] ?? {};
        const lowestDim = lineKpi.dims
          .filter(d => d.score < WARN_THRESHOLD)
          .sort((a, b) => a.score - b.score)[0];
        if (lowestDim) {
          setLineKpiWarnEvent({
            line: lineKey,
            dimLabel: lowestDim.label,
            score: lowestDim.score,
            warnMsg: warnMsgs[lowestDim.key] ?? `${lowestDim.label}考核不达标，上级已启动督导程序。`,
          });
        }
      }
    }

    // ── 首月任务发布（gameDays首次跨越30天时，按路线初始发任务）─────────────
    if (Math.floor(current.gameDays / 30) === 0 && newMonth >= 1 && updated) {
      void (async () => {
        try {
          const { data: existing } = await supabase
            .from('boss_tasks').select('id').eq('save_id', updated.id).limit(1);
          if (!existing || existing.length === 0) {
            await initBossTasks(updated.id, updated.userId, updated.careerPathLine ?? '行政线', newGameDays);
          }
        } catch { /* 首月发任务失败不影响主流程 */ }
      })();
    }

    // 年度并行处理：报表生成 + 人事评审 + 下属晋升候选 + 下属考核 + 年初拜访
    if (newYear > prevYear && updated) {
      const savedForYear = updated;
      // 人事局年底评审提醒
      if (savedForYear.lastPersonnelYear < newYear) {
        setPersonnelReviewPending(true);
      }

      // 年度并行：下属考核 + 下属拜访触发
      const yearKey = Math.floor(newGameDays / 365);
      void yearKey; // 保留yearKey供后续使用
      const allSubsForReport = await getSubordinates(savedForYear.id);
      void allSubsForReport;
      await runAnnualSubAssessment(savedForYear.id, newGameDays);

      // 下属随机拜访（30%概率，fire-and-forget）
      if (!current.subVisitPending && Math.random() < 0.30) {
        void (async () => {
          const visit = await triggerSubVisit(savedForYear.id);
          if (visit) {
            const withVisit = await updateSave(savedForYear.id, {
              subVisitPending: true,
              subVisitSubId: visit.subId,
              subVisitSubName: visit.subName,
            });
            if (withVisit) setSave(withVisit);
          }
        })();
      }

      // 上级自动赋予职务兼职（rank4+，每年最多新增1个，上限3个，fire-and-forget）
      if (savedForYear.rankLevel >= 4) {
        void (async () => {
          const currentPosts: string[] = savedForYear.concurrentPosts ?? [];
          if (currentPosts.length >= 3) return;
          const favorScore = (savedForYear.bossFavor ?? 50) / 100;
          const moralScore = (savedForYear.moralValue ?? 60) / 100;
          const meritScore = Math.min(1, (savedForYear.meritPoints ?? 0) / Math.max(1, RANK_CONFIG[savedForYear.rankLevel]?.requiredMerit ?? 100));
          const composite  = favorScore * 0.4 + moralScore * 0.3 + meritScore * 0.3;
          const grantProb  = composite >= 0.6 ? 0.4 + Math.min(0.4, (composite - 0.6) * 2) : 0;
          if (grantProb <= 0 || Math.random() >= grantProb) return;
          const candidates = CONCURRENT_POST_CONFIG.filter(p =>
            p.minRank <= savedForYear.rankLevel &&
            (p.maxRank === -1 || p.maxRank >= savedForYear.rankLevel) &&
            !currentPosts.includes(p.key)
          );
          if (candidates.length === 0) return;
          const sorted   = [...candidates].sort(() => Math.random() - 0.5);
          const pick     = composite >= 0.75 ? sorted[0] : sorted[Math.floor(Math.random() * sorted.length)];
          const newPosts = [...currentPosts, pick.key];
          const withPost = await updateSave(savedForYear.id, { concurrentPosts: newPosts });
          if (withPost) setSave(withPost);
        })();
      }
    }

    // ── 推进期间被暂存的玩家操作，在此以底稿（推进结束后的 DB 状态）为基准逐一写入 ──
    const pending = pendingPlayerOpsRef.current.splice(0);
    if (pending.length > 0 && saveRef.current) {
      let latest: PlayerSave | null = saveRef.current;
      for (const ops of pending) {
        const result = await updateSave(latest.id, ops);
        if (result) { latest = result; setSave(result); }
      }
    }
    } finally {
      isAdvancingRef.current = false;
    }
  }, [computeDailyDelta, computeAnnualRank, updateGameSave, generateUpperInspect]);

// 自动推进定时器（需兑换码"高仙"解锁后才启动）
  useEffect(() => {
    // 判断 save 里是否已解锁自动推进（kpiRankingResult 含 |AUTO:1）
    const autoUnlocked = (save?.kpiRankingResult ?? '').includes('|AUTO:1');
    if (isRunning && autoUnlocked) {
      timerRef.current = setInterval(() => {
        void advanceTime();
      }, Math.round(800 / speedMultiplier));
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [isRunning, advanceTime, save?.kpiRankingResult, speedMultiplier]);

  // 离线队列 flush：每 30s 检查一次，网络恢复后将积压操作重放到 DB
  useEffect(() => {
    const flushTimer = setInterval(async () => {
      const sid = saveRef.current?.id;
      if (!sid) return;
      const queue = await loadOfflineQueue(sid);
      if (queue.length === 0) return;
      try {
        // 将队列中所有操作合并为一次写入（取各字段的最新值）
        const merged: Record<string, unknown> = {};
        for (const op of queue) {
          Object.assign(merged, op.updates);
        }
        const updated = await updateSave(sid, merged as Parameters<typeof updateSave>[1]);
        if (updated) {
          setSave(updated);
          await clearOfflineQueue(sid);
        }
      } catch {
        // 仍然断网，下次定时器继续重试
      }
    }, 30_000);
    return () => clearInterval(flushTimer);
  }, []);

  return (
    <GameContext.Provider value={{
      save,
      isLoading,
      timeGranularity,
      isRunning,
      unreadReports,
      clearUnreadReports: () => setUnreadReports([]),
      personnelReviewPending,
      clearPersonnelReview: () => setPersonnelReviewPending(false),
      exchangeOfficer,
      clearExchangeOfficer: () => setExchangeOfficer(null),
      annualPromoCandidates,
      clearAnnualPromoCandidates: () => setAnnualPromoCandidates([]),
      upperInspectEvent,
      clearUpperInspectEvent: () => setUpperInspectEvent(null),
      meetingTaskFeedback,
      clearMeetingTaskFeedback: () => setMeetingTaskFeedback(null),
      retirementTrigger,
      clearRetirementTrigger: () => setRetirementTrigger(null),
      renewalVoteTrigger,
      clearRenewalVoteTrigger: () => setRenewalVoteTrigger(null),
      bossChangeEvent,
      clearBossChangeEvent: () => setBossChangeEvent(null),
      disciplineWarnEvent,
      clearDisciplineWarnEvent: () => setDisciplineWarnEvent(null),
      lineKpiWarnEvent,
      clearLineKpiWarnEvent: () => setLineKpiWarnEvent(null),
      gameOverTrigger,
      clearGameOverTrigger: () => setGameOverTrigger(null),
      promotionReadyTrigger,
      clearPromotionReadyTrigger: () => setPromotionReadyTrigger(null),
      lateralTransferTrigger,
      clearLateralTransferTrigger: () => setLateralTransferTrigger(null),
      secretaryReleaseTrigger,
      clearSecretaryReleaseTrigger: () => setSecretaryReleaseTrigger(null),
      secretarySelectTrigger,
      clearSecretarySelectTrigger: () => setSecretarySelectTrigger(null),
      debriefResultTrigger,
      clearDebriefResultTrigger: () => setDebriefResultTrigger(null),
      secAutoGovTrigger,
      clearSecAutoGovTrigger: () => setSecAutoGovTrigger(null),
      deptMonthlyEvent,
      clearDeptMonthlyEvent: () => setDeptMonthlyEvent(null),
      setTimeGranularity,
      setIsRunning,
      advanceTime,
      refreshSave,
      forceRefreshSave,
      waitForAdvance,
      lockAdvance,
      unlockAdvance,
      commitPromotion,
      speedMultiplier,
      setSpeedMultiplier,
      updateGameSave,
      isOffline,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);