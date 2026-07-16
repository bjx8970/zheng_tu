// 晋升结算页面 v2 - 全页沉浸式分页设计，支持14级职位体系与随机换城市
import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { ActivityIndicator, BackHandler, Dimensions, ImageBackground, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeIn, ZoomIn, FadeOut, useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, withDelay, Easing, runOnJS } from 'react-native-reanimated';
import { fetch } from 'expo/fetch';
// @ts-ignore — eventsource-parser types resolved at runtime
import { createParser, type EventSourceParser } from 'eventsource-parser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import { getLineRankTitle, getLineNameByPath, type CareerLineName } from '@/lib/lineRankTitles';
import { getLineKpiSystem } from '@/lib/kpiEngine';
import { RANK_CONFIG, getRandomCityForRank, getDepartmentForPlayer, ABILITY_RANK_MIN } from '@/types/game';
import { LINE_PITCH, PREFERRED_LINE_PROMO_BONUS, type CareerLine } from '@/lib/lineGameplay';
import { LINE_ICON, getLineBaseColor } from '@/lib/lineTheme';
import careerPositionsData from '@/config/career-positions.json';

// ── 晋升最低年龄配置表（与 career-path.tsx 保持一致）────────────────────────
const PROMOTION_AGE_LIMITS: Record<number, number> = careerPositionsData.promotionAgeLimits as Record<number, number>;
// 破格提升概率基础值（政绩越高、廉洁度越高，概率越大）
function calcExceptionalPromoChance(meritPoints: number, moralValue: number, requiredMerit: number): number {
  const meritRatio = Math.min(1, meritPoints / Math.max(1, requiredMerit));
  // 基础15% × 政绩系数 × 廉洁系数，最高30%
  return Math.min(0.30, 0.15 * meritRatio * (0.5 + moralValue / 200));
}
import { initBossTasks, getFollowCandidates, refreshSubordinatesForNewPost, initLeadershipBand, recordPlayerCareer, writeSaveSlot, recallSecretary, getOrCreateSecretary, getSubordinates } from '@/db/gameApi';
import { computeKpi, getKpiPanel, getPromotionSummary, getDeptKpiResult } from '@/lib/kpiEngine';
import type { DeptKpiResult } from '@/lib/kpiEngine';

// 进度条组件
function MeritBar({ current, required }: { current: number; required: number }) {
  const pct = Math.min(100, Math.round((current / Math.max(1, required)) * 100));
  const color = pct >= 100 ? '#2a7a3b' : pct >= 60 ? '#e67e22' : '#C82829';
  return (
    <View style={{ marginTop: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 10, color: '#888' }}>政绩进度</Text>
        <Text style={{ fontSize: 10, color, fontWeight: '700' }}>{current.toFixed(0)} / {required}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: '#E8E6E2', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: 6, backgroundColor: color, borderRadius: 3 }} />
      </View>
      {pct < 100 && (
        <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
          还需 {Math.max(0, required - current).toFixed(0)} 政绩
        </Text>
      )}
    </View>
  );
}

// 各级直属上司姓名池（姓名 + 职衔，与 RANK_CONFIG.bossTitle 对应）
const BOSS_NAMES_BY_LEVEL: Record<number, string[]> = {
  1:  ['王书记', '李书记', '张书记'],
  2:  ['刘镇长', '陈镇长', '赵镇长'],
  3:  ['孙县委书记', '钱县委书记', '王县委书记'],
  4:  ['李县长', '赵县长', '周县长'],
  5:  ['吴市委书记', '郑市委书记', '王市委书记'],
  6:  ['张市委书记', '刘市委书记', '陈市委书记'],
  7:  ['赵市长', '周市长', '钱市长'],
  8:  ['孙省执政委书记', '李省执政委书记', '王省执政委书记'],
  9:  ['张省执政委书记', '刘省执政委书记', '赵省执政委书记'],
  10: ['王省执政委书记', '李省执政委书记', '刘省执政委书记'],
  11: ['陈中组部长', '张中组部长', '王中组部长'],
  12: ['李总理', '王总理', '赵总理'],
  13: ['刘总理', '孙总理', '周总理'],
  14: ['联邦政务常委会', '联邦政务常委会'],
};

// 二级上司姓名池
const BOSS2_NAMES_BY_LEVEL: Record<number, string[]> = {
  1:  ['赵乡镇长', '钱乡镇长', '孙乡镇长'],
  2:  ['周党委书记', '吴党委书记', '郑党委书记'],
  3:  ['李县长', '赵县长', '钱县长'],
  4:  ['孙县委书记', '王县委书记', '刘县委书记'],
  5:  ['张市长', '陈市长', '吴市长'],
  6:  ['周市长', '郑市长', '王市长'],
  7:  ['刘市委书记', '赵市委书记', '陈市委书记'],
  8:  ['王省长', '李省长', '张省长'],
  9:  ['吴省长', '郑省长', '钱省长'],
  10: ['赵副总理', '钱副总理', '孙副总理'],
  11: ['周联邦内阁总理', '吴联邦内阁总理', '郑总理'],
  12: ['刘副总理', '孙副总理', '周副总理'],
  13: ['王常委', '李常委', '赵常委'],
  14: ['联邦国会常委会', '联邦国会议长'],
};

// 三级上司姓名池
const BOSS3_NAMES_BY_LEVEL: Record<number, string[]> = {
  1:  ['孙县委党政人事院院长', '钱县委党政人事院院长', '赵党政人事院院长'],
  2:  ['吴县委书记', '周县委书记', '郑县委书记'],
  3:  ['李县委党政人事院院长', '张党政人事院院长', '刘党政人事院院长'],
  4:  ['赵市委党政人事院院长', '钱市委党政人事院院长', '孙市委党政人事院院长'],
  5:  ['周县委书记', '吴县委书记', '郑县委书记'],
  6:  ['王省执政委党政人事院院长', '李省执政委党政人事院院长', '张省执政委党政人事院院长'],
  7:  ['刘省执政委党政人事院院长', '赵省执政委党政人事院院长', '陈省执政委党政人事院院长'],
  8:  ['孙市委书记', '钱市委书记', '郑市委书记'],
  9:  ['周中组部副部长', '吴中组部副部长', '郑中组部副部长'],
  10: ['王中组部长', '李中组部长', '张中组部长'],
  11: ['赵联邦政务委员', '钱联邦政务委员', '孙联邦政务委员'],
  12: ['周内阁秘书长', '吴秘书长', '郑秘书长'],
  13: ['钱内阁秘书长', '孙秘书长', '赵秘书长'],
  14: ['肃宪院长', '国策协理堂主席'],
};

function getRandomBoss(level: number): string {
  const pool = BOSS_NAMES_BY_LEVEL[level] ?? ['上级领导'];
  return pool[Math.floor(Math.random() * pool.length)];
}
function getRandomBoss2(level: number): string {
  const pool = BOSS2_NAMES_BY_LEVEL[level] ?? ['上级领导'];
  return pool[Math.floor(Math.random() * pool.length)];
}
function getRandomBoss3(level: number): string {
  const pool = BOSS3_NAMES_BY_LEVEL[level] ?? ['上级顾问'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── 四线仕途体系 ──────────────────────────────────────────────
// 分叉决策点：在这些 rank 完成晋升时弹出路线选择（选下一级走哪条路）
// rank 3→4: 乡镇长升县级，选四大路线
// rank 6→7: 县委书记升地市级，重新选择
// rank 9→10: 市委书记升省级，重新选择
const FORK_RANKS = new Set([3, 6, 9]);

// 收敛点：四条路线在此合并（rank 6=县委书记, 9=市委书记, 15=执政党主席）
const CONVERGENCE_RANKS = new Set([6, 9, 15]);

interface CareerPosition {
  name: string;
  bossTitle: string;
  bossTitle2: string;
  bossTitle3: string;
  partyType: string;
}

// 分叉级别的四路线职位数据
type CareerPositionsByRank = Record<string, { party: CareerPosition; government: CareerPosition; discipline: CareerPosition; league: CareerPosition }>;
const CAREER_POSITIONS = careerPositionsData.positions as unknown as CareerPositionsByRank;

// 完整四轨路线图（用于可视化）
type PathItem = { rank: number; name: string; convergence?: boolean };

// ▲ 党务路线：组织/宣传/统战系统→省执政委书记→联邦政务常委→执政党主席
const PARTY_TRACK:      PathItem[] = careerPositionsData.tracks.party as PathItem[];
const GOVERNMENT_TRACK: PathItem[] = careerPositionsData.tracks.government as PathItem[];
const DISCIPLINE_TRACK: PathItem[] = careerPositionsData.tracks.discipline as PathItem[];
const LEAGUE_TRACK:     PathItem[] = careerPositionsData.tracks.league as PathItem[];

export default function PromotionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave, forceRefreshSave, waitForAdvance, lockAdvance, unlockAdvance, commitPromotion } = useGame();
  const [confirmed, setConfirmed] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false); // 全屏庆祝动画

  // 庆祝动画3秒后自动关闭
  useEffect(() => {
    if (!showCelebration) return;
    const t = setTimeout(() => setShowCelebration(false), 3000);
    return () => clearTimeout(t);
  }, [showCelebration]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newCityName, setNewCityName] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  // 部门晋升路径选择（14部门）
  // 部门任职通道已废弃，保持 null 占位供旧逻辑引用

  // 下属申请跟随弹窗状态
  const [followCandidates, setFollowCandidates] = useState<{ id: string; name: string; loyalty: number; appointedRole: string | null }[]>([]);
  const [followDecisions, setFollowDecisions] = useState<Record<string, boolean>>({});
  const [showFollowModal, setShowFollowModal] = useState(false);
  const [pendingCity, setPendingCity] = useState('');

  // ── BackHandler 防护：followModal 打开时拦截 Android 物理返回键 ──────────
  // 避免玩家在随行弹窗弹出时直接返回，导致晋升数据已写 DB 但后续流程未完成
  const handleFollowConfirmRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!showFollowModal) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleFollowConfirmRef.current();
      return true; // 拦截默认返回行为
    });
    return () => sub.remove();
  }, [showFollowModal]);
  // 分管线任命弹窗
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [assignedCabinetTrack, setAssignedCabinetTrack] = useState<'economy' | 'social' | 'hmt' | 'military' | null>(null);
  // 喜好路线（持久化到 DB，影响上级NPC提拔+20%概率）
  const [preferredLine, setPreferredLine] = useState<CareerLine | null>(null);
  // 分叉点玩家主动选择的路线（初始化跟随 assignedPath，玩家可修改）
  const [playerChosenPath, setPlayerChosenPath] = useState<'party' | 'government' | 'discipline' | 'league' | null>(null);
  const [bribeProcessing, setBribeProcessing] = useState(false);
  // 行贿促晋：本次会话是否已使用（写入 inspectionRisk）
  const [bribeUsed, setBribeUsed] = useState(false);
  const [step, setStep] = useState(0);
  const goToStep = useCallback((n: number) => { setStep(n); }, []);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(true);
  const showMsg = (text: string, ok = true) => { setMsg(text); setMsgOk(ok); setTimeout(() => setMsg(''), 4000); };
  // 东窗事发弹窗（三档：warning/suspend/case）
  const [exposedAlert, setExposedAlert] = useState(false);
  const [exposedLevel, setExposedLevel] = useState<'warning' | 'suspend' | 'case'>('warning');
  // 秘书下放 + 新岗位候选选择
  const [secretaryCandidates, setSecretaryCandidates] = useState<{ id: string; name: string; avatarId: number; ability: number; rankLevel: number }[]>([]);
  const [showSecretaryPick, setShowSecretaryPick] = useState(false);
  const [selectedSecretaryId, setSelectedSecretaryId] = useState<string | null>(null);

  if (!save) return null;

  // 实际生效的喜好路线：优先使用本次会话选择，其次读存档
  const effectivePreferredLine: CareerLine =
    preferredLine ?? ((save.preferredCareerLine as CareerLine | undefined) ?? '行政线');

  // AI 上级随机指派的仕途路线（确定性随机：基于游戏天数+级别，进退页面结果稳定）
  // 若玩家设置了喜好路线，50%概率指派到喜好路线（体现组织倾向性）
  const _ALL_PATHS = ['party', 'government', 'discipline', 'league'] as const;
  const _preferredPathKey: typeof _ALL_PATHS[number] | null = (() => {
    const m: Record<string, typeof _ALL_PATHS[number]> = {
      '党务线': 'party', '行政线': 'government', '纪检线': 'discipline', '团派线': 'league',
    };
    return m[effectivePreferredLine] ?? null;
  })();
  const _hashIdx = (save.gameDays * 31 + save.rankLevel * 7) % 4;
  const assignedPath: 'party' | 'government' | 'discipline' | 'league' =
    (_preferredPathKey && (save.gameDays % 2 === 0))
      ? _preferredPathKey
      : _ALL_PATHS[_hashIdx];

  // 实际执行用：有玩家选择则优先，否则用 AI 指派
  const finalChosenPath = playerChosenPath ?? assignedPath;

  const theme = getRankThemeWithLine(save.rankLevel, (save.careerPathLine as import('@/lib/lineGameplay').CareerLine | undefined));
  const currentRankConfig = RANK_CONFIG[save.rankLevel];
  const nextRankLevel = Math.min(15, save.rankLevel + 1);
  const nextRankConfig = RANK_CONFIG[nextRankLevel];
  // 跨城市层级晋升（如乡镇→县、县→市）也必须调任新城市，不能沿用旧层级地名
  const cityTypeChanged = currentRankConfig.cityType !== nextRankConfig.cityType;
  const willChangeCity = nextRankConfig.randomCity || cityTypeChanged;

  // 当前级别是否处于分叉点（晋升时需要选择路线）
  const isForkPoint = FORK_RANKS.has(save.rankLevel);
  // 晋升后是否处于收敛点（两路线合并，路线标记清空）
  const isConvergence = CONVERGENCE_RANKS.has(nextRankLevel);

  // 历史晋升次数（当前级别 - 1 即为已晋升次数）
  const promotionCount = save.rankLevel - 1;

  // ── 晋升总理需要领导人名单投票支持率 ≥ 65% ──
  const isPremierPromotion = save.rankLevel === 13;
  const currentVoteSupport = save.voteSupport ?? 0;
  const PREMIER_VOTE_THRESHOLD = 65;
  const voteReady = !isPremierPromotion || currentVoteSupport >= PREMIER_VOTE_THRESHOLD;

  // ── 晋升执政党主席需要党代会选举支持率 ≥ 75% ──
  const isSecretaryGeneralPromotion = save.rankLevel === 14;
  const currentCongressVote = save.partyCongressVote ?? 0;
  const CONGRESS_VOTE_THRESHOLD = 75;
  const congressReady = !isSecretaryGeneralPromotion || currentCongressVote >= CONGRESS_VOTE_THRESHOLD;

  const canPromote = save.isPromotionAvailable && save.rankLevel < 15 && voteReady && congressReady;

  // ── 晋升需处理重大舆情事件 ─────────────────────────────────────────────
  // 晋副部级(rank9→10)≥1起；晋副部级以上(rank10→11)≥2起；部级以上(rank11+)≥3起
  // 秘书台舆情处置同样计入 massIncidentCount
  const massIncidentRequired =
    save.rankLevel === 9 ? 1 :
    save.rankLevel === 10 ? 2 :
    save.rankLevel >= 11 ? 3 : 0;
  const massIncidentReady = massIncidentRequired === 0 || (save.massIncidentCount ?? 0) >= massIncidentRequired;

  // ── 晋升年龄门槛检查 ────────────────────────────────────────────────────
  // 玩家年龄 = 出生年 + 游戏经过年数（gameDays/365向下取整）
  const playerRealAge = (save.birthYear ?? 1990) > 0
    ? (new Date().getFullYear() - (save.birthYear ?? 1990)) + Math.floor((save.gameDays ?? 0) / 365)
    : 28 + Math.floor((save.gameDays ?? 0) / 365); // 无出生年则用默认28岁入职
  const minAgeForNextRank = PROMOTION_AGE_LIMITS[nextRankLevel] ?? 0;
  const ageGatePass = minAgeForNextRank === 0 || playerRealAge >= minAgeForNextRank;
  // 破格提升概率：年龄不足时可尝试破格，概率由政绩+廉洁度决定
  const exceptionalChance = ageGatePass ? 0 : calcExceptionalPromoChance(
    save.meritPoints, save.moralValue, currentRankConfig.requiredMerit ?? 100,
  );
  // 已使用破格次数（来自 exceptionalAgeOverrideCount 字段）
  const exceptionalUsed = save.exceptionalAgeOverrideCount ?? 0;

  // ── 破格晋升失败冷却（半年=180游戏天）─────────────────────────────────────
  const EXCEPTIONAL_PROMO_COOLDOWN_DAYS = 180;
  const lastFailedDay = save.careerPathCooldowns?.['exceptionalPromoFailed'] ?? 0;
  const daysSinceFailed = (save.gameDays ?? 0) - lastFailedDay;
  const canRetryExceptional = daysSinceFailed >= EXCEPTIONAL_PROMO_COOLDOWN_DAYS;
  // 按钮最终可用：必须年龄达标 或 有破格概率且冷却结束可重试
  const canPromoteFinal = canPromote && massIncidentReady && (
    ageGatePass || exceptionalChance === 0 || canRetryExceptional
  );

  // 能力值晋升门槛检查
  const abilityMin = ABILITY_RANK_MIN[nextRankLevel] ?? 0;
  const abilityValue = save.abilityValue ?? 40;
  const abilityGatePass = abilityValue >= abilityMin;

  // 发起投票（模拟领导人名单投票，基于好感+派系+政绩计算支持率）
  const handleLaunchVote = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    // 支持率计算：上司好感综合50% + 政绩达标30% + 派系均衡20%
    const favorScore = ((save.bossFavor + save.boss2Favor + save.boss3Favor) / 3 / 100) * 50;
    const meritScore = Math.min(30, (save.meritPoints / (currentRankConfig.requiredMerit || 1)) * 30);
    const factionBalance = Math.max(0, 20 - Math.abs(save.reformFaction - save.pragmaticFaction) * 0.4);
    // 喜好路线加成：当前路线与喜好路线一致时，NPC提拔概率+20%
    const pathToLineMap: Record<string, string> = {
      party: '党务线', government: '行政线', discipline: '纪检线', league: '团派线',
    };
    const currentLineName = pathToLineMap[save.careerPath ?? 'government'] ?? '行政线';
    const preferBonus = currentLineName === effectivePreferredLine ? PREFERRED_LINE_PROMO_BONUS * 100 : 0;
    const rawSupport = favorScore + meritScore + factionBalance + preferBonus;
    // 加随机扰动 ±8
    const noise = (Math.random() - 0.5) * 16;
    const finalSupport = Math.min(99, Math.max(10, Math.round(rawSupport + noise)));
    await updateGameSave({ voteSupport: finalSupport, lastVoteDay: save.gameDays });
    setIsProcessing(false);
  };

  // 发起党代会选举（晋升执政党主席专用）
  // 选举因子：常委会好感（boss）权重45% + 政绩达标35% + 派系均衡20%，扰动更小（±5）体现中央集体决策的严肃性
  const handleLaunchCongressVote = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    // 联邦政务常委会成员好感：三上司代表常委会三票集团
    const pscFavor = ((save.bossFavor + save.boss2Favor + save.boss3Favor) / 3 / 100) * 45;
    // 政绩得分：任期内国家治理成果（政绩/需求）
    const meritScore = Math.min(35, (save.meritPoints / Math.max(1, currentRankConfig.requiredMerit)) * 35);
    // 派系平衡：改革派与务实派支持率越均衡越有利
    const factionScore = Math.max(0, 20 - Math.abs(save.reformFaction - save.pragmaticFaction) * 0.35);
    const rawVote = pscFavor + meritScore + factionScore;
    // 党代会扰动较小（中央决策更具可预期性）±5
    const noise = (Math.random() - 0.5) * 10;
    const finalVote = Math.min(99, Math.max(8, Math.round(rawVote + noise)));
    await updateGameSave({ partyCongressVote: finalVote, lastPartyCongressDay: save.gameDays });
    setIsProcessing(false);
  };

  // 执行实际晋升（可传入已选定的路线）
  const doPromotion = async (chosenPath: string) => {
    setIsProcessing(true);

    // 晋升前自动存档到槽位3（保留晋升前状态，不阻塞主流程）
    const autoSaveLabel = `晋升前·${save.rankName}·${save.cityName}（第${Math.floor(save.gameDays / 365) + 1}年）`;
    void writeSaveSlot(save.id, 3, autoSaveLabel);

    // ⚠️ 双重锁：先 lockAdvance 阻止定时器新触发，再 waitForAdvance 等当前推进完成。
    // 若不锁：waitForAdvance 返回瞬间，800ms 定时器可能立刻启动新一轮 advanceTime，
    // 导致后续 updateGameSave 再次进入 pending 路径，forceRefreshSave 读到旧 rankLevel。
    lockAdvance();
    await waitForAdvance();
    // 注意：unlockAdvance() 在函数末尾的 try-finally 里保证一定执行

    // 确定职位名称与上司职衔：收敛点或非分叉级别使用 RANK_CONFIG 默认值
    const careerData = CAREER_POSITIONS[nextRankLevel];
    const pathKey = chosenPath as 'party' | 'government' | 'discipline' | 'league';
    const posData = (careerData && !CONVERGENCE_RANKS.has(nextRankLevel) && chosenPath)
      ? careerData[pathKey]
      : null;
    // 部门任职通道已废弃，deptOverrideName 始终为 null
    const deptOverrideName = null;
    // 路线专属职称：按chosenPath推导新careerPathLine，无则沿用旧值
    const careerPathLineName = (save.careerPathLine ?? '行政线') as CareerLineName;
    const pathToCareerLine: Record<string, string> = {
      party: '党务线', government: '行政线', discipline: '纪检线', league: '团派线',
    };
    // 收敛点后路线清空，等下次分叉；非分叉直接沿用旧路线
    const nextCareerPathLine: string = isConvergence
      ? (save.careerPathLine ?? '行政线')
      : (pathToCareerLine[chosenPath] ?? save.careerPathLine ?? '行政线');
    const lineTitle = getLineRankTitle((nextCareerPathLine as CareerLineName), nextRankLevel).title;
    const nextRankName = deptOverrideName ?? (posData ? posData.name : lineTitle ?? nextRankConfig.name);
    const nextBossTitle    = posData ? posData.bossTitle      : nextRankConfig.bossTitle;
    const nextBossTitle2   = posData ? posData.bossTitle2     : nextRankConfig.bossTitle2;
    const nextBossTitle3   = posData ? posData.bossTitle3     : nextRankConfig.bossTitle3;
    // 收敛后路线清空，等下次分叉重新选择
    const nextCareerPath = isConvergence ? '' : (chosenPath || save.careerPath);

    // 晋升执政党主席（rank15）：无城市调任，驻京领导核心
    const assignedCity = isSecretaryGeneralPromotion
      ? '执政党中央·北京'
      : willChangeCity
        ? getRandomCityForRank(nextRankLevel)
        : save.cityName;

    setNewCityName(assignedCity);

    // rank15 上司体系：联邦国会/国策协理堂/枢武府（三权辅佐），无随机化
    const newBossName  = isSecretaryGeneralPromotion ? '联邦国会' : getRandomBoss(nextRankLevel);
    const newBoss2Name = isSecretaryGeneralPromotion ? '联邦内阁'           : getRandomBoss2(nextRankLevel);
    const newBoss3Name = isSecretaryGeneralPromotion ? '枢武府'   : getRandomBoss3(nextRankLevel);

    // 更新上司职衔显示（存入 RANK_CONFIG 字段等效位置，通过 rankName 携带）
    // bossTitle 系列已在 RANK_CONFIG 中，分叉时在 factors 里直接读 posData
    void nextBossTitle; void nextBossTitle2; void nextBossTitle3;

    // rank13晋升时随机分配分管线
    const CABINET_TRACKS = ['economy', 'social', 'hmt', 'military'] as const;
    const newTrack = nextRankLevel === 13
      ? CABINET_TRACKS[Math.floor(Math.random() * CABINET_TRACKS.length)]
      : undefined;
    if (newTrack) setAssignedCabinetTrack(newTrack);

    // ── 派系版图：提前计算 factionProvinceMap（合并进主 updateGameSave，避免二次乐观更新覆盖 rankLevel）──
    const CITY_TO_ABBR: Record<string, string> = {
      '粤海': '粤', '广东': '粤', '广州': '粤', '深圳': '粤', '佛山': '粤',
      '汉东': '苏', '江苏': '苏', '南京': '苏', '苏州': '苏', '无锡': '苏',
      '齐鲁': '鲁', '山东': '鲁', '济南': '鲁', '青岛': '鲁',
      '瓯越': '浙', '浙江': '浙', '杭州': '浙', '宁波': '浙',
      '沪海': '沪', '上海': '沪', '中原': '豫', '河南': '豫', '郑州': '豫',
      '蜀州': '川', '四川': '川', '成都': '川', '绵阳': '川',
      '楚北': '鄂', '湖北': '鄂', '武汉': '鄂', '闽南': '闽', '福建': '闽', '福州': '闽', '厦门': '闽',
      '京都': '京', '北京': '京', '楚南': '湘', '湖南': '湘', '长沙': '湘',
      '皖淮': '皖', '安徽': '皖', '合肥': '皖', '秦陕': '陕', '陕西': '陕', '西安': '陕',
      '黔贵': '黔', '贵州': '黔', '贵阳': '黔', '滇南': '滇', '云南': '滇', '昆明': '滇',
      '洪都': '赣', '江西': '赣', '南昌': '赣', '渝江': '渝', '重庆': '渝',
      '辽东': '辽', '辽宁': '辽', '沈阳': '辽', '大连': '辽',
      '乌龙江': '黑', '黑龙江': '黑', '哈尔滨': '黑',
      '吉阳': '吉', '吉林': '吉', '长春': '吉', '晋阳': '晋', '山西': '晋', '太原': '晋',
      '西域': '新', '新疆': '新', '乌鲁木齐': '新', '漠北': '蒙', '内蒙古': '蒙', '呼和浩特': '蒙',
      '陇西': '甘', '甘肃': '甘', '兰州': '甘', '宁夏': '宁', '银川': '宁',
      '青藏': '藏', '西藏': '藏', '拉萨': '藏', '青海': '青', '西宁': '青',
      '海南': '琼', '海口': '琼', '津沽': '津', '天津': '津',
      '燕山': '冀', '河北': '冀', '石家庄': '冀', '桂南': '桂', '广西': '桂', '南宁': '桂',
    };
    let newFactionMap: Record<string, string> | undefined;
    if (save.primaryFaction && nextRankLevel >= 9) {
      let matchedAbbr = '';
      for (const [key, abbr] of Object.entries(CITY_TO_ABBR)) {
        if (assignedCity.includes(key)) { matchedAbbr = abbr; break; }
      }
      if (matchedAbbr) {
        newFactionMap = { ...(save.factionProvinceMap ?? {}), [matchedAbbr]: save.primaryFaction };
      }
    }

    // ── 民生快照：提前计算（合并进主 updateGameSave，避免二次乐观更新覆盖 rankLevel）──
    const currentYearForSnapshot = Math.floor(save.gameDays / 365) + 2000;
    const newSnapshot = { year: currentYearForSnapshot, score: save.cityLivelihood, rankName: save.rankName, cityName: save.cityName };
    const updatedSnapshotsEarly = [...(save.livelihoodSnapshots ?? []), newSnapshot];

    // ── B3 修复：将本任职记录追加到 saves.player_career_history JSON 列 ──
    // （独立表 recordPlayerCareer 写 player_career_history 表，但时间线读的是 saves JSON 列，需两处都更新）
    const careerStartDay = Math.max(0, save.gameDays - save.tenureDays);
    const careerStartYear = 2000 + Math.floor(careerStartDay / 365);
    const careerEndYear = 2000 + Math.floor(save.gameDays / 365);
    const newCareerEntry = {
      rankLevel: save.rankLevel,
      position: save.rankName,
      province: '',
      city: save.cityName,
      startDay: careerStartDay,
      endDay: save.gameDays,
    };
    const updatedCareerHistory = [...(save.playerCareerHistory ?? []), newCareerEntry];

    // ── 主晋升写入（一次 updateGameSave，避免多次乐观更新互相覆盖 rankLevel）──
    await updateGameSave({
      rankLevel: nextRankLevel,
      rankName: nextRankName,
      playerPosition: nextRankName,
      cityName: assignedCity,
      maxTenureYears: nextRankConfig.maxTenureYears,
      requiredMerit: nextRankConfig.requiredMerit,
      requiredTenureYears: nextRankConfig.requiredTenureYears,
      tenureYears: 0,
      tenureDays: 0,
      isPromotionAvailable: false,
      meritPoints: 0,
      bossName: newBossName,
      bossFavor: 60,
      boss2Name: newBoss2Name,
      boss2Favor: 60,
      boss3Name: newBoss3Name,
      boss3Favor: 60,
      careerPath: nextCareerPath,
      careerPathLine: nextCareerPathLine as '党务线' | '行政线' | '纪检线' | '团派线',
      lateralCount: 0,
      massIncidentCount: 0,
      sameLocTerms: 0,
      livelihoodSnapshots: updatedSnapshotsEarly,
      playerCareerHistory: updatedCareerHistory,
      ...(newFactionMap ? { factionProvinceMap: newFactionMap } : {}),
      ...(nextRankLevel === 13 && newTrack ? { cabinetTrack: newTrack } : {}),
      ...(nextRankLevel === 14 ? { cabinetTrack: null } : {}),
      ...(isSecretaryGeneralPromotion
        ? { partyCongressVote: 0, lastPartyCongressDay: 0 }
        : { cityGdp: 50, cityLivelihood: 50, cityEcology: 50, cityBusiness: 50, securityIndex: 50 }),
    });

    // B5 修复：recordPlayerCareer 使用正确的 startDay/startYear/endYear
    void recordPlayerCareer(
      save.id, save.rankName, save.cityName, save.rankLevel,
      careerStartDay, save.gameDays,
      careerStartYear, careerEndYear,
      save.cityLivelihood,
    );

    // 获取愿意跟随的下属候选人（忠诚≥70）
    const candidates = await getFollowCandidates(save.id);

    // ── 秘书自动下放（rank>=3 晋升必定执行）──────────────────────────────
    if (nextRankLevel >= 3) {
      const curSec = await getOrCreateSecretary(save.id, save.userId);
      if (curSec?.isAppointed && curSec.subId) {
        await recallSecretary(save.id, curSec.subId);
      }
    }

    if (candidates.length > 0) {
      const decisions: Record<string, boolean> = {};
      candidates.forEach(c => { decisions[c.id] = false; });
      setFollowCandidates(candidates);
      setFollowDecisions(decisions);
      setPendingCity(assignedCity);
      setIsProcessing(false);
      setShowFollowModal(true);
    } else {
      await refreshSubordinatesForNewPost(save.id, save.userId, nextRankLevel, assignedCity, []);
      // 履新后：初始化新班子
      void initLeadershipBand(save.id, nextRankLevel, save.playerName, nextRankName,
        { province: save.birthProvince, city: save.birthCity, universityName: save.universityName ?? '' },
        assignedCity || save.cityName);
      // rank>=3 履新后：从下属随机选10人作为新秘书候选
      if (nextRankLevel >= 3) {
        const newSubs = await getSubordinates(save.id);
        const eligible = newSubs.filter(s => !s.transferredCity);
        const shuffled = eligible.sort(() => Math.random() - 0.5).slice(0, 10);
        if (shuffled.length > 0) {
          setSecretaryCandidates(shuffled.map(s => ({
            id: s.id, name: s.name, avatarId: s.avatarId ?? 1,
            ability: s.ability ?? 50, rankLevel: s.subLevel ?? 1,
          })));
          setShowSecretaryPick(true);
          setIsProcessing(false);
          return; // 等待玩家选秘书后再 setConfirmed（unlockAdvance 在秘书确认 handler 里执行）
        }
      }
      // ⚡ 终态提交：强制注入内存+延长60秒冷却，彻底防止 refreshSave 从 DB 读回旧 rankLevel
      commitPromotion();
      setShowCelebration(true);
      setConfirmed(true);
      if (nextRankLevel === 13) setShowTrackModal(true);
      setIsProcessing(false);
    }
  };

  // 入口：分叉点使用玩家选择路线（或 AI 指派兜底），否则沿用当前路线
  const handleConfirmPromotion = async () => {
    if (!canPromoteFinal || isProcessing) return;
    // 能力值门槛硬检查（UI已展示提示，此处兜底阻断）
    if (!abilityGatePass) { showMsg(`能力值不足（当前 ${abilityValue}，需要 ≥ ${abilityMin}）`, false); return; }
    // 保存喜好路线到 DB（每次进晋升页且选了才保存）
    if (preferredLine && preferredLine !== save.preferredCareerLine) {
      await updateGameSave({ preferredCareerLine: preferredLine });
    }
    // ── 行贿东窗事发检查：行贿后晋升时按 inspectionRisk 分三档处理 ──
    if (bribeUsed) {
      const curRisk = save.inspectionRisk ?? 0;
      // 触发概率 = inspectionRisk / 100 * 0.65
      const exposureChance = Math.min(0.85, (curRisk / 100) * 0.65);
      if (Math.random() < exposureChance) {
        setIsProcessing(true);
        // 三档判断：低风险→警告，中风险→停职，高风险→立案
        if (curRisk >= 70) {
          // 第三档：立案调查（最严重）
          await updateGameSave({
            isUnderInvestigation: true,
            inspectionRisk: Math.min(100, curRisk + 30),
            investigationDay: save.gameDays,
            investigationEvidenceLevel: 2,
          });
          setExposedLevel('case');
        } else if (curRisk >= 40) {
          // 第二档：停职处理（政绩-100，巡视风险+20，晋升失败）
          await updateGameSave({
            inspectionRisk: Math.min(100, curRisk + 20),
            meritPoints: Math.max(0, (save.meritPoints ?? 0) - 100),
            bossFavor: Math.max(0, (save.bossFavor ?? 60) - 20),
          });
          setExposedLevel('suspend');
        } else {
          // 第一档：党内警告（巡视风险+10，形象扣分）
          await updateGameSave({
            inspectionRisk: Math.min(100, curRisk + 10),
            moralValue: Math.max(0, save.moralValue - 5),
          });
          setExposedLevel('warning');
        }
        setIsProcessing(false);
        setExposedAlert(true);
        return; // 不执行晋升
      }
    }
    // 年龄门槛检查：年龄不足时尝试破格提升
    if (!ageGatePass) {
      const roll = Math.random();
      if (roll > exceptionalChance) {
        const cooldowns = save.careerPathCooldowns ?? {};
        await updateGameSave({
          careerPathCooldowns: { ...cooldowns, exceptionalPromoFailed: save.gameDays },
        });
        showMsg(`年龄未达标（当前 ${playerRealAge} 岁，需 ≥ ${minAgeForNextRank} 岁），破格概率 ${Math.round(exceptionalChance * 100)}% 未触发，需等待半年冷却`, false);
        return;
      }
      await updateGameSave({ exceptionalAgeOverrideCount: exceptionalUsed + 1 });
    }
    if (isForkPoint) {
      await doPromotion(finalChosenPath);
    } else {
      await doPromotion(save.careerPath ?? '');
    }
  };

  /** 确认跟随弹窗后执行队伍刷新 */
  const handleFollowConfirm = async () => {
    handleFollowConfirmRef.current = () => { void handleFollowConfirm(); }; // 保持 ref 最新
    const accepted = Object.entries(followDecisions).filter(([, v]) => v).map(([k]) => k);
    setShowFollowModal(false);
    setIsProcessing(true);
    await refreshSubordinatesForNewPost(save.id, save.userId, nextRankLevel, pendingCity, accepted);
    // 履新后：初始化新班子
    const nextRankName2 = RANK_CONFIG[nextRankLevel]?.name ?? save.rankName;
    void initLeadershipBand(save.id, nextRankLevel, save.playerName, nextRankName2,
      { province: save.birthProvince, city: save.birthCity, universityName: save.universityName ?? '' },
      pendingCity || save.cityName);
    // rank>=3 履新后：从下属随机选10人作为新秘书候选
    if (nextRankLevel >= 3) {
      const newSubs2 = await getSubordinates(save.id);
      const eligible2 = newSubs2.filter(s => !s.transferredCity);
      const shuffled2 = eligible2.sort(() => Math.random() - 0.5).slice(0, 10);
      if (shuffled2.length > 0) {
        setSecretaryCandidates(shuffled2.map(s => ({
          id: s.id, name: s.name, avatarId: s.avatarId ?? 1,
          ability: s.ability ?? 50, rankLevel: s.subLevel ?? 1,
        })));
        setShowSecretaryPick(true);
        setIsProcessing(false);
        return; // 等待玩家选秘书后再 setConfirmed（unlockAdvance 在秘书确认 handler 里执行）
      }
    }
    // ⚡ 终态提交：强制注入内存+延长60秒冷却，彻底防止 refreshSave 从 DB 读回旧 rankLevel
    commitPromotion();
    setShowCelebration(true);
    setConfirmed(true);
    if (nextRankLevel === 13) setShowTrackModal(true);
    setIsProcessing(false);
    unlockAdvance(); // 解锁：晋升流程正常结束，恢复自动推进
  };

  // 任职年限要求（固定，不设加速通道）
  const effectiveTenureReq = currentRankConfig.requiredTenureYears;

  // ── 路线专属职称（rank>=10 省部级以上完全锁定当前路线）────────────────────
  const cp = save.careerPath ?? 'government';
  const lineNameForTitle: CareerLineName = getLineNameByPath(cp);
  /** rank>=10 时显示路线专属职称，否则用通用 RANK_CONFIG.name */
  const nextRankDisplayName = nextRankLevel >= 10
    ? getLineRankTitle(lineNameForTitle, nextRankLevel).title
    : nextRankConfig.name;
  /** rank>=10 只允许晋升当前路线的职称，晋升公告语 */
  const nextRankAnnouncement = nextRankLevel >= 10
    ? getLineRankTitle(lineNameForTitle, nextRankLevel).promotionAnnouncement
    : nextRankConfig.name;

  // ── 路线KPI晋升加成 ────────────────────────────────────────────────────────
  const lineKpiSys = getLineKpiSystem(cp, {
    rankLevel: save.rankLevel, moralValue: save.moralValue, securityIndex: save.securityIndex ?? 60,
    cityGdp: save.cityGdp, cityLivelihood: save.cityLivelihood, cityEcology: save.cityEcology ?? 60,
    cityBusiness: save.cityBusiness ?? 60, bossFavor: save.bossFavor, boss2Favor: save.boss2Favor,
    boss3Favor: save.boss3Favor, annualRankPct: save.annualRankPct ?? 50, taxRevenue: save.taxRevenue ?? 0,
    tenureYears: save.tenureYears, meritPoints: save.meritPoints,
    careerPath: cp,
    lineKpiScore: save.lineKpiScore ?? 0,
    inspectionRisk: save.inspectionRisk ?? 10,
    publicOpinionIndex: save.publicOpinionIndex ?? 60,
  });

  // ── 四路线差异化晋升门槛 ────────────────────────────────────────────────────
  // 道德值：纪检路线廉洁自律要求最高，party次之，league再次，行政路线基础值
  const moralReq = cp === 'discipline' ? 55 : cp === 'party' ? 48 : cp === 'league' ? 45 : 40;
  // 派系平衡：党务路线最严（党内政治必须均衡），纪检路线次之
  const factionGapReq = cp === 'party' ? 30 : cp === 'discipline' ? 35 : 40;
  // 民生指数：团派路线重视基层民生，要求更高
  const livelihoodReq = cp === 'league' ? 55 : 45;

  const factors = [
    {
      label: '任职年限',
      met: save.tenureYears >= effectiveTenureReq,
      desc: `${save.tenureYears}年 / 要求${effectiveTenureReq}年`,
    },
    {
      label: '政绩积累',
      met: save.meritPoints >= currentRankConfig.requiredMerit,
      desc: `${save.meritPoints.toFixed(0)} / ${currentRankConfig.requiredMerit}`,
    },
    {
      label: '考评等级',
      met: save.assessmentGrade === '优秀' || save.assessmentGrade === '良好',
      desc: save.assessmentGrade,
    },
    {
      label: cp === 'discipline' ? '⚖️ 廉洁自律（纪检标准）' : cp === 'party' ? '🎖️ 道德操守（党务标准）' : '道德操守',
      met: save.moralValue >= moralReq,
      desc: `道德值 ${save.moralValue}${save.moralValue < moralReq ? ` (需≥${moralReq})` : ''}`,
    },
    // ── 考核评估条件（v3.0干部制度）──────────────────────────────────────
    {
      label: '🗳️ 民主测评',
      met: (save.democraticEvalScore ?? 0) >= 60,
      desc: (save.democraticEvalScore ?? 0) > 0
        ? `测评得分 ${save.democraticEvalScore}${(save.democraticEvalScore ?? 0) < 60 ? '（需≥60，前往「干部制度」发起）' : ' ✓'}`
        : '尚未发起民主测评（前往「干部制度」）',
    },
    {
      label: '🔍 专项考核',
      met: (save.specialAssessScore ?? 0) >= 60,
      desc: (save.specialAssessScore ?? 0) > 0
        ? `考核得分 ${save.specialAssessScore}${(save.specialAssessScore ?? 0) < 60 ? '（需≥60，前往「干部制度」接受）' : ' ✓'}`
        : '尚未接受专项考核（前往「干部制度」）',
    },
    // ── 基层工作经历（4级及以上，需在厅级以下即rank1-6任职满5年）──────────
    ...((save.rankLevel ?? 1) >= 4 ? [{
      label: '🏡 基层工作经历',
      met: (save.grassrootsExpYears ?? 0) >= 5,
      desc: (() => {
        const cur = save.grassrootsExpYears ?? 0;
        return cur >= 5
          ? `基层经历 ${cur.toFixed(1)}年 ✓`
          : `基层经历 ${cur.toFixed(1)}年（需≥5年，在1-6级任职积累，即厅级以下）`;
      })(),
    }] : []),
    {
      label: isSecretaryGeneralPromotion ? '常委会支持' : `${currentRankConfig.bossTitle}好感`,
      met: save.bossFavor >= 50,
      desc: `${save.bossName}　好感度 ${save.bossFavor}`,
    },
    {
      label: isSecretaryGeneralPromotion ? '联邦政务院支持' : `${currentRankConfig.bossTitle2}好感`,
      met: save.boss2Favor >= 40,
      desc: `${save.boss2Name}　${save.boss2Favor}${save.boss2Favor < 40 ? ' (需≥40)' : ''}`,
    },
    {
      label: isSecretaryGeneralPromotion ? '中央顾问支持' : `${currentRankConfig.bossTitle3}好感`,
      met: save.boss3Favor >= 40,
      desc: `${save.boss3Name}　${save.boss3Favor}${save.boss3Favor < 40 ? ' (需≥40)' : ''}`,
    },
    {
      label: cp === 'party' ? '🎖️ 党内路线平衡（严）' : '派系平衡',
      met: Math.abs(save.reformFaction - save.pragmaticFaction) <= factionGapReq,
      desc: `改革${save.reformFaction} / 务实${save.pragmaticFaction}${Math.abs(save.reformFaction - save.pragmaticFaction) > factionGapReq ? `（差值需≤${factionGapReq}）` : ''}`,
    },
    // 🏛️ 团派路线专属：民生基础要求
    ...(cp === 'league' ? [{
      label: '🏛️ 民生基础（团派标准）',
      met: save.cityLivelihood >= livelihoodReq,
      desc: `民生指数 ${save.cityLivelihood}${save.cityLivelihood < livelihoodReq ? `（需≥${livelihoodReq}）` : ' ✓'}`,
    }] : []),
    // ⚖️ 纪检路线专属：社会安定指数
    ...(cp === 'discipline' ? [{
      label: '⚖️ 社会安定（纪检标准）',
      met: save.securityIndex >= 55,
      desc: `安全指数 ${save.securityIndex}${save.securityIndex < 55 ? '（需≥55）' : ' ✓'}`,
    }] : []),
    // 晋升总理特殊条件：领导人名单投票支持率 ≥ 65%
    ...(isPremierPromotion ? [{
      label: '领导人名单投票',
      met: currentVoteSupport >= PREMIER_VOTE_THRESHOLD,
      desc: currentVoteSupport > 0
        ? `当前支持率 ${currentVoteSupport}%${currentVoteSupport >= PREMIER_VOTE_THRESHOLD ? ' ✓' : `（需≥${PREMIER_VOTE_THRESHOLD}%）`}`
        : '尚未发起投票',
    }] : []),
    // 晋升执政党主席特殊条件：党代会选举支持率 ≥ 75%
    ...(isSecretaryGeneralPromotion ? [{
      label: '★ 党代会选举',
      met: currentCongressVote >= CONGRESS_VOTE_THRESHOLD,
      desc: currentCongressVote > 0
        ? `选举得票率 ${currentCongressVote}%${currentCongressVote >= CONGRESS_VOTE_THRESHOLD ? ' ✓' : `（需≥${CONGRESS_VOTE_THRESHOLD}%）`}`
        : '尚未发起党代会选举',
    }] : []),
  ];

  // ── 分层级 KPI 考核评估 ─────────────────────────────────────────────────────
  const kpiSnapshot = {
    rankLevel:      save.rankLevel,
    moralValue:     save.moralValue,
    securityIndex:  save.securityIndex,
    cityGdp:        save.cityGdp,
    cityLivelihood: save.cityLivelihood,
    cityEcology:    save.cityEcology,
    cityBusiness:   save.cityBusiness,
    bossFavor:      save.bossFavor,
    boss2Favor:     save.boss2Favor,
    boss3Favor:     save.boss3Favor,
    annualRankPct:  save.annualRankPct,
    taxRevenue:     save.taxRevenue ?? 0,
    tenureYears:    save.tenureYears,
    meritPoints:    save.meritPoints,
    marriageStatus: save.marriageStatus,
    careerPath:     save.careerPath ?? '',
  };
  const kpiResult = computeKpi(kpiSnapshot);
  const kpiPanel  = getKpiPanel(kpiSnapshot);
  const kpiSummary = getPromotionSummary(kpiResult, save.tenureYears, effectiveTenureReq);

  // ── 路线专属 KPI（非行政线）─────────────────────────────────────────────────
  const promoLineKey = (save.careerPathLine ?? '') as string;
  const promoLineDeptKey =
    promoLineKey === '党务线' ? 'party' :
    promoLineKey === '纪检线' ? 'discipline_line' :
    promoLineKey === '团派线' ? 'league' : null;
  const lineKpiResult: DeptKpiResult | null = promoLineDeptKey
    ? getDeptKpiResult(promoLineDeptKey, kpiSnapshot)
    : null;

  // 晋升路径（全15级）
  const RANK_LEVELS = Object.entries(RANK_CONFIG).map(([k, v]) => ({ level: Number(k), name: v.name }));

  // 下一级城市类型说明
  const nextCityTypeLabel: Record<number, string> = {
    1: '乡镇政府', 2: '乡镇政府', 3: '乡镇政府',
    4: '县级市政府', 5: '县级市政府', 6: '县级市委',
    7: '地级市政府', 8: '地级市政府', 9: '地级市委',
    10: '省级政府', 11: '省级党委', 12: '中央联邦内阁',
    13: '中央联邦内阁', 14: '联邦内阁总理', 15: '执政党中央·国家最高领导核心',
  };

  // ── 分页滚动引用 ──────────────────────────────────────────────
  const pageScrollRef = useRef<ScrollView>(null);
  const { width: SCREEN_W, height: SCREEN_H } = useWindowDimensions();

  // 跳转到某页
  const scrollToStep = useCallback((n: number) => {
    goToStep(n);
    pageScrollRef.current?.scrollTo({ x: n * SCREEN_W, animated: true });
  }, [SCREEN_W, goToStep]);

  // 背景图：按职级段落选择
  const BG_IMAGES: Record<string, string> = {
    township:   'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d7b6a8ee-c4b6-4916-b92d-df8169b4e7b4.jpg',
    county:     'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_e255833e-b7ea-4db9-8dc4-5e860bfa3467.jpg',
    city:       'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d4a50b8b-ec2b-4038-b43b-3acdbf885139.jpg',
    provincial: 'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_501a8daf-b111-4b1f-ae45-e39591c791ad.jpg',
    central:    'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_25e52c1d-f959-46f4-895e-5edac7e89712.jpg',
    president:  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_9ebc0a8f-e9b4-4cc3-8b84-bf439fd0e8c7.jpg',
  };
  const bgKey = save.rankLevel <= 3 ? 'township' : save.rankLevel <= 6 ? 'county' : save.rankLevel <= 9 ? 'city' : save.rankLevel <= 11 ? 'provincial' : save.rankLevel <= 14 ? 'central' : 'president';

  // ── Tab 导航状态 ──────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'overview' | 'score' | 'process' | 'special' | 'rules'>('overview');

  // ── 综合积分（KPI + 政绩进度 + 道德值） ─────────────────────────────
  const compositeScore = Math.min(100, Math.round(
    kpiResult.totalScore * 0.5 +
    Math.min(40, (save.meritPoints / Math.max(1, currentRankConfig.requiredMerit)) * 40) +
    save.moralValue * 0.1,
  ));

  // ── 行贿功能 ────────────────────────────────────────────────────────
  const handleBribe = async () => {
    if (bribeUsed || bribeProcessing || isProcessing) return;
    setBribeProcessing(true);
    const bribeCost = 5 + save.rankLevel * 2;
    if ((save.grayIncomeTotal ?? 0) < bribeCost) {
      setBribeProcessing(false);
      return;
    }
    await updateGameSave({
      grayIncomeTotal: Math.max(0, (save.grayIncomeTotal ?? 0) - bribeCost),
      inspectionRisk: Math.min(100, (save.inspectionRisk ?? 0) + 15),
      bossFavor: Math.min(100, save.bossFavor + 10),
    });
    setBribeUsed(true);
    setBribeProcessing(false);
  };

  const TABS = [
    { key: 'overview' as const, icon: '📊', label: '总览' },
    { key: 'score'    as const, icon: '🏆', label: '积分' },
    { key: 'process'  as const, icon: '⚙️', label: '流程' },
    { key: 'special'  as const, icon: '⚡', label: '特通' },
    { key: 'rules'    as const, icon: '📋', label: '规则' },
  ] as const;

  // ── 任职年限进度 ──────────────────────────────────────────────────
  const tenurePct = Math.min(100, (save.tenureYears / Math.max(1, effectiveTenureReq)) * 100);
  const tenurePass = save.tenureYears >= effectiveTenureReq;

  // ── 空缺信息（确定性随机）──────────────────────────────────────────
  const seed = (save.gameDays ?? 0) + nextRankLevel * 1000;
  const rng = (n: number) => { let x = seed + n; x = ((x >> 16) ^ x) * 0x45d9f3b; x = ((x >> 16) ^ x) * 0x45d9f3b; return ((x >> 16) ^ x) >>> 0; };
  const totalSlots = nextRankLevel <= 3 ? 3 : nextRankLevel <= 6 ? 3 : 2;
  const vacantSlots = rng(7) % (totalSlots + 1);
  const hasVacancy = vacantSlots > 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#0d111f' }}>
      <StatusBar style="light" backgroundColor="#0d111f" />

      {confirmed ? (
        /* ════════════════════════════════════════════════════════
           晋升成功页
           ════════════════════════════════════════════════════════ */
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ minHeight: SCREEN_H }} showsVerticalScrollIndicator={false}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0d111f' }} />
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#FFB800' }} />
          <View style={{ paddingTop: insets.top + 20, paddingHorizontal: 20, gap: 16, paddingBottom: 40 }}>
            <Animated.View entering={ZoomIn.duration(500).springify()} style={{ alignItems: 'center', paddingVertical: 32 }}>
              <View style={{ width: 120, height: 120, borderRadius: 60, borderWidth: 4, borderColor: '#FFB800', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.08)' }}>
                <Text style={{ fontSize: 36, color: '#FFB800', fontWeight: '900' }}>晋</Text>
                <Text style={{ fontSize: 14, color: '#FFB800', fontWeight: '700' }}>升</Text>
              </View>
              <View style={{ height: 16, width: 2, backgroundColor: '#FFB800', marginVertical: 10 }} />
              <Text style={{ fontSize: 10, color: '#FFB800', letterSpacing: 4, fontWeight: '700' }}>组织部干部任用令</Text>
              <Text style={{ fontSize: 26, fontWeight: '900', color: '#fff', marginTop: 8, textAlign: 'center', letterSpacing: 2 }}>{save.rankName}</Text>
              {willChangeCity && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: 'rgba(255,184,0,0.12)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 6 }}>
                  <Text style={{ color: '#FFB800', fontSize: 12 }}>📍</Text>
                  <Text style={{ color: '#FFB800', fontSize: 12, fontWeight: '600' }}>调任 → {newCityName || save.cityName}</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(150)} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 16, padding: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 3, marginBottom: 8 }}>任命令正文</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 22, textAlign: 'center' }}>
                {isSecretaryGeneralPromotion
                  ? `经联邦党代会选举，您已当选执政党主席，同时担任联邦总统、枢武府主席，统领党政军三权，开启最高领导人时代。届期 ${nextRankConfig.maxTenureYears} 年。`
                  : `您已成功晋升至${save.rankName}，任期重新计算，政绩积累清零，请继续努力再创佳绩！`}
              </Text>
            </Animated.View>

            {save.rankLevel >= 3 && (
              <Animated.View entering={FadeInDown.duration(400).delay(250)} style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: lineKpiSys.totalBonus >= 70 ? 'rgba(34,197,94,0.4)' : 'rgba(255,184,0,0.4)', borderRadius: 12, padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700' }}>📊 {lineKpiSys.lineName} KPI晋升加成</Text>
                  <Text style={{ color: lineKpiSys.totalBonus >= 70 ? '#22C55E' : '#FFB800', fontSize: 15, fontWeight: '900' }}>{lineKpiSys.bonusLabel}</Text>
                </View>
                <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                  <View style={{ height: 4, width: `${lineKpiSys.totalBonus}%`, backgroundColor: lineKpiSys.totalBonus >= 70 ? '#22C55E' : '#FFB800', borderRadius: 2 }} />
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{lineKpiSys.summary}</Text>
              </Animated.View>
            )}

            {/* ── 本次晋升解锁玩法 ── */}
            {(() => {
              const line = (save.careerPathLine ?? '行政线') as string;
              const rank = save.rankLevel;
              type UnlockItem = { icon: string; label: string; desc: string };
              const unlockMap: Record<string, Record<number, UnlockItem[]>> = {
                '行政线': {
                  1: [{ icon: '🏗️', label: '城市建设', desc: '主导基础设施投入与工程项目' }, { icon: '📝', label: '行政审批', desc: '掌控行政许可与政务流程' }],
                  2: [{ icon: '📐', label: '城市规划', desc: '制定城市发展方向与空间布局' }, { icon: '💼', label: '招商引资', desc: '引进外部资本推动经济增长' }],
                  3: [{ icon: '💵', label: '财政管理', desc: '统筹预算与财政资金分配' }, { icon: '🗺️', label: '区域管理', desc: '管辖下属区域行政事务' }],
                  4: [{ icon: '🪟', label: '政策窗口', desc: '争取上级政策支持与专项红利' }, { icon: '🏘️', label: '土地财政', desc: '通过土地出让获取城市建设资金' }],
                  5: [{ icon: '📋', label: '五年规划', desc: '制定地区五年发展纲要' }, { icon: '📈', label: '经济周期', desc: '把握宏观经济节奏调控' }],
                  7: [{ icon: '✈️', label: '外交出访', desc: '代表地方开展对外交流' }, { icon: '🏙️', label: '城市面貌', desc: '推动城市形象与软实力提升' }],
                },
                '党务线': {
                  1: [{ icon: '🔴', label: '党建工作', desc: '主持基层党组织建设与党务工作' }, { icon: '🎖️', label: '党务深度', desc: '开展深层党务专项行动' }],
                  2: [{ icon: '📋', label: '干部选拔', desc: '考察培养后备干部人才库' }, { icon: '🏗️', label: '干部提拔', desc: '提名推荐优秀干部晋升' }],
                  3: [{ icon: '🎯', label: '人事提拔', desc: '主导干部职务晋升安排' }, { icon: '👥', label: '人事任免', desc: '行使干部任免核心权力' }],
                  5: [{ icon: '🏛️', label: '党委会议', desc: '主持召开党委会议研究重要事项' }, { icon: '⚡', label: '派系争夺', desc: '在路线竞争中扩大党内影响力' }],
                  7: [{ icon: '🔱', label: '派系关系', desc: '经营党内派系网络与盟友体系' }, { icon: '🔍', label: '巡视工作', desc: '参与上级巡视组工作监督' }],
                  9: [{ icon: '📜', label: '党代会报告', desc: '起草并宣读重要党代会报告' }],
                },
                '纪检线': {
                  1: [{ icon: '🔍', label: '纪检深度', desc: '开展纪检监察专项深度行动' }],
                  2: [{ icon: '⚖️', label: '案件查处', desc: '立案调查违纪违法案件' }, { icon: '🛡️', label: '廉政建设', desc: '推进党风廉政建设工程' }],
                  3: [{ icon: '📋', label: '专项整治', desc: '开展行业领域专项整治行动' }, { icon: '🔎', label: '巡视反腐', desc: '参与上级巡视组开展反腐工作' }],
                  5: [{ icon: '📬', label: '举报受理', desc: '受理群众信访举报线索' }, { icon: '🔱', label: '派系关系', desc: '借助查案扩大政治影响力' }],
                  7: [{ icon: '🏛️', label: '上级巡视', desc: '配合或主导上级巡视工作' }, { icon: '🏛️', label: '司法系统', desc: '协同司法机关处理大案' }],
                },
                '团派线': {
                  1: [{ icon: '🌱', label: '青年工作', desc: '统领青年联合会与团务工作' }, { icon: '🤝', label: '团派深度', desc: '开展团务专项深度行动' }],
                  2: [{ icon: '🌟', label: '青年服务', desc: '推进青年就业创业服务体系' }, { icon: '🌐', label: '社会工作', desc: '组织社会公益与群团工作' }],
                  3: [{ icon: '🎓', label: '人才培养', desc: '打造青年人才培养选拔通道' }, { icon: '📋', label: '干部选拔', desc: '向上输送团派系优秀干部' }],
                  5: [{ icon: '🔱', label: '派系关系', desc: '建立团派系全国性人脉网络' }, { icon: '⚡', label: '路线竞争', desc: '与其他路线争夺关键职位' }],
                  7: [{ icon: '🔍', label: '巡视工作', desc: '参与上级组织巡视工作' }, { icon: '👥', label: '人事任免', desc: '推动团派干部系统性布局' }],
                },
              };
              const lineUnlocks = unlockMap[line] ?? {};
              // 找到本次晋升到当前职级时解锁的玩法
              const currentItems = lineUnlocks[rank] ?? [];
              if (currentItems.length === 0) return null;
              return (
                <Animated.View entering={FadeInDown.duration(400).delay(350)} style={{ backgroundColor: 'rgba(255,184,0,0.08)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.35)', borderRadius: 12, padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ color: '#FFB800', fontSize: 11, fontWeight: '800', letterSpacing: 1 }}>🔓 本次晋升解锁玩法</Text>
                  </View>
                  {currentItems.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10 }}>
                      <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>{item.desc}</Text>
                      </View>
                      <View style={{ backgroundColor: 'rgba(255,184,0,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#FFB800', fontSize: 9, fontWeight: '700' }}>已解锁</Text>
                      </View>
                    </View>
                  ))}
                </Animated.View>
              );
            })()}

            <Pressable
              onPress={() => {
                router.replace('/(app)/home');
              }}
              style={{ backgroundColor: '#FFB800', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 }}
            >
              <Text style={{ color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 2 }}>开始新任期 ›</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : (

        /* ════════════════════════════════════════════════════════
           晋升程序主界面 - 沉浸式干部晋升评审
           ════════════════════════════════════════════════════════ */
        <View style={{ flex: 1, backgroundColor: '#080C18' }}>

          {/* ── 顶部 Header：沉浸式深色 + 职级光晕 ── */}
          <View style={{ paddingTop: insets.top, backgroundColor: '#080C18', borderBottomWidth: 1, borderBottomColor: 'rgba(255,184,0,0.12)' }}>
            {/* 顶部装饰光条 */}
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#FFB800' }} />

            {/* 面包屑行 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 6 }}>
              <Pressable onPress={() => router.back()} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '400', lineHeight: 18 }}>✕</Text>
              </Pressable>
              <Text style={{ color: 'rgba(255,184,0,0.7)', fontSize: 10, flex: 1, marginLeft: 4, letterSpacing: 0.5 }}>
                干部选拔任用考核系统 · {save.cityName} · RANK {save.rankLevel}
              </Text>
              <View style={{ backgroundColor: canPromoteFinal ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: canPromoteFinal ? '#22C55E' : 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '700' }}>
                  {canPromoteFinal ? '可申请晋升' : '条件待完善'}
                </Text>
              </View>
            </View>

            {/* 标题主卡 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 14 }}>
              {/* 职级徽章 */}
              <View style={{ position: 'relative' }}>
                <View style={{ width: 56, height: 56, borderRadius: 14, borderWidth: 2, borderColor: '#FFB800', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.1)' }}>
                  <Text style={{ color: '#FFB800', fontSize: 26, fontWeight: '900', lineHeight: 32 }}>{save.rankLevel}</Text>
                </View>
                {/* 右下角箭头徽标 */}
                <View style={{ position: 'absolute', bottom: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#FFB800', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#000', fontSize: 10, fontWeight: '900' }}>↑</Text>
                </View>
              </View>

              {/* 标题与副标题 */}
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFD700', fontSize: 19, fontWeight: '900', letterSpacing: 1.5 }}>干部晋升评审</Text>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, marginTop: 3 }}>
                  《党政领导干部选拔任用工作条例》实施
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{save.rankName}</Text>
                  <Text style={{ color: 'rgba(255,184,0,0.5)', fontSize: 10 }}>→</Text>
                  <Text style={{ color: '#FFB800', fontSize: 10, fontWeight: '700' }}>{nextRankDisplayName}</Text>
                </View>
              </View>

              {/* 积分圆形徽章 */}
              <View style={{ alignItems: 'center' }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 28,
                  borderWidth: 2.5,
                  borderColor: compositeScore >= 75 ? '#22C55E' : compositeScore >= 50 ? '#FFB800' : '#E74C3C',
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: compositeScore >= 75 ? 'rgba(34,197,94,0.1)' : compositeScore >= 50 ? 'rgba(255,184,0,0.1)' : 'rgba(231,76,60,0.1)',
                }}>
                  <Text style={{ color: compositeScore >= 75 ? '#22C55E' : compositeScore >= 50 ? '#FFB800' : '#E74C3C', fontSize: 22, fontWeight: '900', lineHeight: 28 }}>{compositeScore}</Text>
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, marginTop: 3, letterSpacing: 0.5 }}>综合积分</Text>
              </View>
            </View>

            {/* ── Tab 导航栏（Pill 样式）── */}
            <View style={{ flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 8, gap: 6 }}>
              {TABS.map(tab => {
                const isActive = activeTab === tab.key;
                return (
                  <Pressable
                    key={tab.key}
                    onPress={() => setActiveTab(tab.key)}
                    style={{
                      flex: 1, alignItems: 'center', paddingVertical: 7, gap: 2, borderRadius: 10,
                      backgroundColor: isActive ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.04)',
                      borderWidth: 1,
                      borderColor: isActive ? 'rgba(255,184,0,0.5)' : 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>{tab.icon}</Text>
                    <Text style={{ fontSize: 9, color: isActive ? '#FFB800' : 'rgba(255,255,255,0.35)', fontWeight: isActive ? '800' : '400' }}>{tab.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* ── Tab 内容区 ── */}
          <ScrollView style={{ flex: 1, backgroundColor: '#080C18' }} contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>

            {/* ════════════════════════════════════════
                TAB: 总览
               ════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <Animated.View entering={FadeInDown.duration(280).springify()} style={{ gap: 12 }}>
                {/* 当前职级卡 */}
                <View style={{ backgroundColor: 'rgba(255,184,0,0.04)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.18)', borderRadius: 18, padding: 16, gap: 14 }}>
                  {/* 职级 + 职名行 */}
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                    <View style={{ width: 52, height: 52, borderRadius: 14, borderWidth: 2, borderColor: '#FFB800', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,184,0,0.12)' }}>
                      <Text style={{ color: '#FFB800', fontSize: 22, fontWeight: '900' }}>{save.rankLevel}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>{save.rankName}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>下一职级</Text>
                          <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '700' }}>{nextRankDisplayName}</Text>
                        </View>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 3 }}>
                        {save.cityName} · {save.bossName}
                      </Text>
                    </View>
                  </View>

                  {/* 有效任期进度条 */}
                  <View style={{ gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>有效任期</Text>
                      <Text style={{ color: tenurePass ? '#22C55E' : '#FFB800', fontSize: 12, fontWeight: '700' }}>
                        {save.tenureYears.toFixed(1)} / {effectiveTenureReq} 年{tenurePass ? ' ✓' : ''}
                      </Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: 8, width: `${tenurePct}%`, backgroundColor: tenurePass ? '#22C55E' : '#FFB800', borderRadius: 4 }} />
                    </View>
                  </View>

                  {/* 状态三格 */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: hasVacancy ? 'rgba(34,197,94,0.5)' : 'rgba(200,40,41,0.4)', borderRadius: 10, backgroundColor: hasVacancy ? 'rgba(34,197,94,0.08)' : 'rgba(200,40,41,0.06)', padding: 10, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14 }}>{hasVacancy ? '🟢' : '🔴'}</Text>
                      <Text style={{ color: hasVacancy ? '#22C55E' : '#E74C3C', fontSize: 11, fontWeight: '700' }}>{hasVacancy ? '名额充足' : '名额紧张'}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center' }}>职数管控</Text>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: factors.every(f => f.met) ? 'rgba(34,197,94,0.5)' : 'rgba(255,184,0,0.4)', borderRadius: 10, backgroundColor: factors.every(f => f.met) ? 'rgba(34,197,94,0.08)' : 'rgba(255,184,0,0.06)', padding: 10, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 14 }}>{factors.every(f => f.met) ? '✅' : '⚠️'}</Text>
                      <Text style={{ color: factors.every(f => f.met) ? '#22C55E' : '#FFB800', fontSize: 11, fontWeight: '700' }}>{factors.every(f => f.met) ? '红线通过' : '条件待满足'}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center' }}>一票否决</Text>
                    </View>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(34,197,94,0.4)', borderRadius: 10, backgroundColor: 'rgba(34,197,94,0.06)', padding: 10, alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: '#22C55E', fontSize: 20, fontWeight: '900', lineHeight: 24 }}>{compositeScore}</Text>
                      <Text style={{ color: '#22C55E', fontSize: 9, fontWeight: '700' }}>百分制积分</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, textAlign: 'center' }}>竞争排序</Text>
                    </View>
                  </View>
                </View>

                {/* 晋升行动按钮 */}
                {canPromoteFinal ? (
                  <Animated.View entering={FadeIn.duration(400)}>
                    <Pressable
                      onPress={handleConfirmPromotion}
                      disabled={isProcessing}
                      style={{
                        backgroundColor: '#FFB800', borderRadius: 16,
                        paddingVertical: 18, alignItems: 'center',
                        flexDirection: 'row', justifyContent: 'center', gap: 10,
                        opacity: isProcessing ? 0.7 : 1,
                        shadowColor: '#FFB800', shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.45, shadowRadius: 16, elevation: 8,
                      }}
                    >
                      {isProcessing
                        ? <ActivityIndicator color="#000" size="small" />
                        : <Text style={{ fontSize: 22 }}>🚀</Text>}
                      <Text style={{ color: '#000', fontWeight: '900', fontSize: 16, letterSpacing: 2 }}>
                        {isProcessing ? '处理中...' : `申请晋升 → ${nextRankDisplayName}`}
                      </Text>
                    </Pressable>
                  </Animated.View>
                ) : (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 16, paddingVertical: 18, alignItems: 'center', gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>🔒</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 15 }}>暂不符合申请条件</Text>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
                      {massIncidentRequired > 0 && (
                        <View style={{ marginTop: 6, marginBottom: 2, gap: 3 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>重大舆情处置进度（副部级≥1起 / 副部以上≥2起 / 部级以上≥3起）</Text>
                            <Text style={{ fontSize: 9, color: massIncidentReady ? '#7CFC00' : '#FFD700', fontWeight: '700' }}>
                              {save.massIncidentCount ?? 0} / {massIncidentRequired} 起
                            </Text>
                          </View>
                          <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: massIncidentReady ? '#7CFC00' : '#FFD700',
                              width: `${Math.min(100, Math.round(((save.massIncidentCount ?? 0) / massIncidentRequired) * 100))}%`,
                            }} />
                          </View>
                        </View>
                      )}
                      {!canPromote ? '晋升条件未满足，请前往「积分」查看' : massIncidentReady ? '✅ 舆情门槛已达标，可申请晋升' : `还需处理 ${massIncidentRequired - (save.massIncidentCount ?? 0)} 起重大舆情事件`}
                    </Text>
                  </View>
                )}

                {/* 快速条件预览 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderRadius: 16, padding: 14, gap: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 2, marginBottom: 2 }}>CONDITIONS · 条件速览</Text>
                  {factors.slice(0, 5).map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 13 }}>{f.met ? '✅' : '❌'}</Text>
                      <Text style={{ flex: 1, color: f.met ? 'rgba(255,255,255,0.75)' : 'rgba(255,100,100,0.9)', fontSize: 12 }}>{f.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{f.desc}</Text>
                    </View>
                  ))}
                  {factors.length > 5 && (
                    <Pressable onPress={() => setActiveTab('score')}>
                      <Text style={{ color: '#FFB800', fontSize: 11, textAlign: 'center', marginTop: 4 }}>查看全部 {factors.length} 项条件 →</Text>
                    </Pressable>
                  )}
                </View>

                {/* 晋升基本原则 */}
                <View style={{ backgroundColor: 'rgba(255,184,0,0.04)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.15)', borderRadius: 16, padding: 14, gap: 6 }}>
                  <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '800' }}>📌 晋升基本原则</Text>
                  {[
                    '原则上禁止越级晋升，仅保留严格限制的破格通道',
                    '职数总量封顶：满编状态下暂停所有晋升，只有空缺才能升',
                    '同批竞争积分从高到低择优，连续3次落选触发「职业倦怠」debuff（积分-10%）',
                    '年龄硬线：达到职级年龄天花板，只能转人大/政协二线岗位',
                  ].map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                      <Text style={{ color: 'rgba(255,184,0,0.6)', fontSize: 10, marginTop: 2 }}>•</Text>
                      <Text style={{ flex: 1, color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 18 }}>{rule}</Text>
                    </View>
                  ))}
                </View>
              </Animated.View>
            )}

            {/* ════════════════════════════════════════
                TAB: 积分
               ════════════════════════════════════════ */}
            {activeTab === 'score' && (
              <Animated.View entering={FadeInDown.duration(280).springify()} style={{ gap: 14 }}>
                {/* 综合积分大卡 */}
                <View style={{ backgroundColor: 'rgba(34,197,94,0.06)', borderWidth: 1.5, borderColor: 'rgba(34,197,94,0.3)', borderRadius: 16, padding: 16, alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 }}>综合评估积分</Text>
                  <Text style={{ color: '#22C55E', fontSize: 56, fontWeight: '900', lineHeight: 64 }}>{compositeScore}</Text>
                  <View style={{ height: 6, width: '80%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${compositeScore}%`, backgroundColor: '#22C55E', borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                    {compositeScore >= 80 ? '优秀 · 竞争力强' : compositeScore >= 60 ? '良好 · 符合要求' : '尚需提升'}
                  </Text>
                </View>

                {/* KPI面板 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>📊 KPI 考核面板</Text>
                  {kpiPanel.map((item, i) => (
                    <View key={i} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{item.label}</Text>
                        <Text style={{ color: item.score >= 70 ? '#22C55E' : item.score >= 50 ? '#FFB800' : '#E74C3C', fontSize: 12, fontWeight: '700' }}>{item.score}</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 2 }}>
                        <View style={{ height: 4, width: `${item.score}%`, backgroundColor: item.score >= 70 ? '#22C55E' : item.score >= 50 ? '#FFB800' : '#E74C3C', borderRadius: 2 }} />
                      </View>
                    </View>
                  ))}
                </View>

                {/* 政绩进度 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', marginBottom: 10, letterSpacing: 1 }}>🏅 政绩积累</Text>
                  <MeritBar current={save.meritPoints} required={currentRankConfig.requiredMerit} />
                </View>

                {/* 全部晋升条件明细 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>✅ 晋升条件明细</Text>
                    <View style={{ backgroundColor: factors.every(f => f.met) ? 'rgba(34,197,94,0.2)' : 'rgba(255,184,0,0.2)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: factors.every(f => f.met) ? '#22C55E' : '#FFB800', fontSize: 10, fontWeight: '700' }}>
                        {factors.filter(f => f.met).length}/{factors.length} 已达标
                      </Text>
                    </View>
                  </View>
                  {factors.map((f, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6, borderBottomWidth: i < factors.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                      <Text style={{ fontSize: 14, marginTop: 1 }}>{f.met ? '✅' : '❌'}</Text>
                      <View style={{ flex: 1, gap: 2 }}>
                        <Text style={{ color: f.met ? 'rgba(255,255,255,0.85)' : 'rgba(255,120,120,0.9)', fontSize: 12, fontWeight: '600' }}>{f.label}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{f.desc}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 路线KPI加成 */}
                {save.rankLevel >= 3 && (
                  <View style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' }}>📈 {lineKpiSys.lineName} KPI加成</Text>
                      <Text style={{ color: lineKpiSys.totalBonus >= 70 ? '#22C55E' : '#FFB800', fontSize: 14, fontWeight: '900' }}>{lineKpiSys.bonusLabel}</Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2 }}>
                      <View style={{ height: 4, width: `${lineKpiSys.totalBonus}%`, backgroundColor: lineKpiSys.totalBonus >= 70 ? '#22C55E' : '#FFB800', borderRadius: 2 }} />
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>{lineKpiSys.summary}</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ════════════════════════════════════════
                TAB: 流程
               ════════════════════════════════════════ */}
            {activeTab === 'process' && (
              <Animated.View entering={FadeInDown.duration(280).springify()} style={{ gap: 14 }}>
                {/* 职务空缺 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 12 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>📋 职务空缺核查</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: hasVacancy ? 'rgba(34,197,94,0.15)' : 'rgba(200,40,41,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 22 }}>{hasVacancy ? '🟢' : '🔴'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: hasVacancy ? '#22C55E' : '#E74C3C', fontSize: 15, fontWeight: '800' }}>
                        {hasVacancy ? `空缺 ${vacantSlots}/${totalSlots} 个` : '暂无空缺'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 2 }}>
                        {hasVacancy ? '晋升基础概率+15%' : '满员竞争，难度上升'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {Array.from({ length: totalSlots }).map((_, i) => (
                      <View key={i} style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: i < (totalSlots - vacantSlots) ? 'rgba(200,40,41,0.7)' : 'rgba(34,197,94,0.7)' }} />
                    ))}
                  </View>
                </View>

                {/* 晋升路线信息 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>🗺️ 仕途路线</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>当前职级</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{save.rankName}</Text>
                    </View>
                    <Text style={{ color: '#FFB800', fontSize: 22, fontWeight: '900' }}>›</Text>
                    <View style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 10, backgroundColor: 'rgba(255,184,0,0.08)', padding: 12, alignItems: 'center', gap: 4 }}>
                      <Text style={{ color: '#FFB800', fontSize: 9 }}>晋升至</Text>
                      <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '700', textAlign: 'center' }}>{nextRankDisplayName}</Text>
                    </View>
                  </View>
                  {[
                    { label: '调任情况', value: willChangeCity ? '随机调任新城市' : '留任原地' },
                    { label: '政绩清零', value: '晋升后积累归零' },
                    { label: '任期重置', value: `从0年重新计算（最高${nextRankConfig.maxTenureYears}年）` },
                    { label: '目标城市级别', value: nextCityTypeLabel[nextRankLevel] ?? '—' },
                  ].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>{item.label}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '600' }}>{item.value}</Text>
                    </View>
                  ))}
                </View>

                {/* 分叉路线指派提示 */}
                {isForkPoint && (() => {
                  const pathColors: Record<string, string> = { party: '#D87070', government: '#70A870', discipline: '#7090D8', league: '#70B8A8' };
                  const pathLabels: Record<string, string> = { party: '党务路线', government: '行政路线', discipline: '纪检路线', league: '团派路线' };
                  const pathIcons: Record<string, string> = { party: '🔴', government: '🏛️', discipline: '⚖️', league: '🌱' };
                  const ALL_PATHS = ['government', 'party', 'discipline', 'league'] as const;
                  return (
                    <View style={{ gap: 10 }}>
                      {/* 组织指派提示 */}
                      <View style={{ borderRadius: 10, borderWidth: 1, borderColor: (pathColors[assignedPath] ?? '#FFB800') + '40', backgroundColor: (pathColors[assignedPath] ?? '#FFB800') + '10', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 18 }}>{pathIcons[assignedPath]}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: pathColors[assignedPath] ?? '#FFB800', fontSize: 10, fontWeight: '800' }}>📋 组织默认指派</Text>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{pathLabels[assignedPath]}　→　{CAREER_POSITIONS[nextRankLevel]?.[assignedPath]?.name ?? '—'}</Text>
                        </View>
                      </View>
                      {/* 玩家主动选择路线按钮组 */}
                      <Text style={{ color: 'rgba(255,215,0,0.9)', fontSize: 11, fontWeight: '700' }}>🗺️ 主动选择路线方向（点击确认）</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {ALL_PATHS.map(path => {
                          const isChosen = finalChosenPath === path;
                          const col = pathColors[path] ?? '#888';
                          const posData2 = CAREER_POSITIONS[nextRankLevel]?.[path];
                          return (
                            <Pressable key={path} onPress={() => setPlayerChosenPath(path)}
                              style={{ flex: 1, minWidth: '45%', borderRadius: 10, borderWidth: isChosen ? 2 : 1, borderColor: isChosen ? col : col + '40', backgroundColor: isChosen ? col + '20' : col + '08', padding: 10, gap: 4, alignItems: 'flex-start' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                <Text style={{ fontSize: 14 }}>{pathIcons[path]}</Text>
                                <Text style={{ color: isChosen ? col : col + 'AA', fontSize: 11, fontWeight: isChosen ? '800' : '600' }}>{pathLabels[path]}</Text>
                                {isChosen && <Text style={{ color: col, fontSize: 9, fontWeight: '800' }}>✓ 已选</Text>}
                              </View>
                              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }} numberOfLines={1}>{posData2?.name ?? '—'}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {/* 四路线喜好设置 */}
                {(() => {
                  const ALL_LINES: CareerLine[] = ['党务线', '行政线', '纪检线', '团派线'];
                  const pathToLineMap: Record<string, CareerLine> = { party: '党务线', government: '行政线', discipline: '纪检线', league: '团派线' };
                  const currentLineName = pathToLineMap[save.careerPath ?? 'government'] ?? '行政线';
                  return (
                    <View style={{ backgroundColor: 'rgba(255,215,0,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,215,0,0.2)', padding: 14, gap: 10 }}>
                      <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '800' }}>⭐ 设定喜好路线（提拔加成+20%）</Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {ALL_LINES.map(line => {
                          const isSelected = effectivePreferredLine === line;
                          const isCurrent = currentLineName === line;
                          const lineColor = getLineBaseColor(line);
                          return (
                            <Pressable key={line} onPress={() => setPreferredLine(line)} style={{ flex: 1, borderRadius: 10, borderWidth: isSelected ? 1.5 : 1, borderColor: isSelected ? lineColor : 'rgba(255,255,255,0.1)', backgroundColor: isSelected ? lineColor + '20' : 'rgba(255,255,255,0.04)', padding: 8, alignItems: 'center', gap: 4 }}>
                              <Text style={{ fontSize: 20 }}>{LINE_ICON[line]}</Text>
                              <Text style={{ fontSize: 9, fontWeight: isSelected ? '800' : '500', color: isSelected ? lineColor : 'rgba(255,255,255,0.5)', textAlign: 'center' }}>{line.replace('线', '')}</Text>
                              {(isCurrent || isSelected) && (
                                <View style={{ backgroundColor: isCurrent ? 'rgba(245,158,11,0.3)' : lineColor + '40', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 7, color: isCurrent ? '#F59E0B' : lineColor, fontWeight: '700' }}>{isCurrent ? '当前' : '喜好'}</Text>
                                </View>
                              )}
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}
              </Animated.View>
            )}

            {/* ════════════════════════════════════════
                TAB: 特通
               ════════════════════════════════════════ */}
            {activeTab === 'special' && (
              <Animated.View entering={FadeInDown.duration(280).springify()} style={{ gap: 14 }}>
                {/* 总理投票 */}
                {isPremierPromotion && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, gap: 12 }}>
                    <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800' }}>🗳️ 领导人名单投票</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ alignItems: 'center', borderWidth: 2, borderColor: currentVoteSupport >= PREMIER_VOTE_THRESHOLD ? '#22C55E' : 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'rgba(34,197,94,0.05)' }}>
                        <Text style={{ color: currentVoteSupport >= PREMIER_VOTE_THRESHOLD ? '#22C55E' : 'rgba(255,255,255,0.7)', fontSize: 28, fontWeight: '900' }}>{currentVoteSupport}%</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>需≥{PREMIER_VOTE_THRESHOLD}%</Text>
                      </View>
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                          <View style={{ height: 6, width: `${Math.min(100, currentVoteSupport)}%`, backgroundColor: currentVoteSupport >= PREMIER_VOTE_THRESHOLD ? '#22C55E' : '#FFB800', borderRadius: 3 }} />
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>
                          {currentVoteSupport >= PREMIER_VOTE_THRESHOLD ? '✅ 已达线，可申请晋升' : '❌ 未达线，需提高好感与政绩'}
                        </Text>
                      </View>
                    </View>
                    <Pressable onPress={handleLaunchVote} disabled={isProcessing} style={{ backgroundColor: 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                      {isProcessing ? <ActivityIndicator color="#FFB800" size="small" /> : <Text style={{ color: '#FFB800', fontWeight: '700', fontSize: 13 }}>发起领导人名单投票</Text>}
                    </Pressable>
                  </View>
                )}

                {/* 党代会选举 */}
                {isSecretaryGeneralPromotion && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: 14, gap: 12 }}>
                    <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800' }}>★ 党代会选举</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      <View style={{ alignItems: 'center', borderWidth: 2, borderColor: currentCongressVote >= CONGRESS_VOTE_THRESHOLD ? '#22C55E' : 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 }}>
                        <Text style={{ color: currentCongressVote >= CONGRESS_VOTE_THRESHOLD ? '#22C55E' : 'rgba(255,255,255,0.7)', fontSize: 28, fontWeight: '900' }}>{currentCongressVote}%</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>需≥{CONGRESS_VOTE_THRESHOLD}%</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 3 }}>
                          <View style={{ height: 6, width: `${Math.min(100, currentCongressVote)}%`, backgroundColor: currentCongressVote >= CONGRESS_VOTE_THRESHOLD ? '#22C55E' : '#FFB800', borderRadius: 3 }} />
                        </View>
                      </View>
                    </View>
                    <Pressable onPress={handleLaunchCongressVote} disabled={isProcessing} style={{ backgroundColor: 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                      {isProcessing ? <ActivityIndicator color="#FFB800" size="small" /> : <Text style={{ color: '#FFB800', fontWeight: '700', fontSize: 13 }}>发起党代会选举</Text>}
                    </Pressable>
                  </View>
                )}

                {/* 行贿促晋 */}
                <View style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: bribeUsed ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 10 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '800' }}>💰 行贿促晋</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>灰色收入余额</Text>
                    <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '700' }}>{(save.grayIncomeTotal ?? 0).toLocaleString()} 万</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>需花费</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{5 + save.rankLevel * 2} 万（好感+10，风险+15）</Text>
                  </View>
                  {bribeUsed ? (
                    <View style={{ backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#22C55E', fontWeight: '700', fontSize: 12 }}>✅ 已使用（本次晋升生效）</Text>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handleBribe}
                      disabled={bribeProcessing || (save.grayIncomeTotal ?? 0) < 5 + save.rankLevel * 2}
                      style={{ backgroundColor: (save.grayIncomeTotal ?? 0) >= 5 + save.rankLevel * 2 ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: (save.grayIncomeTotal ?? 0) >= 5 + save.rankLevel * 2 ? 'rgba(255,184,0,0.4)' : 'rgba(255,255,255,0.08)', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    >
                      {bribeProcessing ? <ActivityIndicator color="#FFB800" size="small" /> : (
                        <Text style={{ color: (save.grayIncomeTotal ?? 0) >= 5 + save.rankLevel * 2 ? '#FFB800' : 'rgba(255,255,255,0.3)', fontWeight: '700', fontSize: 12 }}>
                          {(save.grayIncomeTotal ?? 0) >= 5 + save.rankLevel * 2 ? '使用行贿通道' : '灰色收入不足'}
                        </Text>
                      )}
                    </Pressable>
                  )}
                  <Text style={{ color: 'rgba(255,100,100,0.6)', fontSize: 9, textAlign: 'center' }}>⚠️ 东窗事发风险随巡视强度上升</Text>
                </View>

                {/* 破格提升（年龄不足） */}
                {!ageGatePass && (
                  <View style={{ backgroundColor: 'rgba(255,184,0,0.06)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.25)', borderRadius: 14, padding: 14, gap: 8 }}>
                    <Text style={{ color: '#FFB800', fontSize: 13, fontWeight: '800' }}>⚡ 破格提升通道</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                      您当前年龄 {playerRealAge} 岁，下一职级要求 {minAgeForNextRank} 岁以上。
                    </Text>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 10, gap: 4 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>破格概率</Text>
                      <Text style={{ color: '#FFB800', fontSize: 20, fontWeight: '900' }}>{Math.round(exceptionalChance * 100)}%</Text>
                      <View style={{ height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
                        <View style={{ height: 4, width: `${Math.round(exceptionalChance * 100)}%`, backgroundColor: '#FFB800', borderRadius: 2 }} />
                      </View>
                    </View>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>
                      已破格次数：{exceptionalUsed} 次 · 政绩越高、廉洁值越高概率越大（上限30%）
                    </Text>
                  </View>
                )}

                {/* 能力门槛提示 */}
                {!abilityGatePass && (
                  <View style={{ backgroundColor: 'rgba(200,40,41,0.08)', borderWidth: 1, borderColor: 'rgba(200,40,41,0.3)', borderRadius: 14, padding: 14, gap: 6 }}>
                    <Text style={{ color: '#E74C3C', fontSize: 13, fontWeight: '800' }}>🚫 能力值不足</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                      当前能力值 {abilityValue}，晋升至下一职级需要 ≥ {abilityMin}
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>通过培训、学习、实践等方式提升能力值。</Text>
                  </View>
                )}

                {!isPremierPromotion && !isSecretaryGeneralPromotion && (
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11 }}>当前职级无特殊晋升通道</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, marginTop: 4 }}>领导人名单投票 / 党代会选举仅对应特定职级开放</Text>
                  </View>
                )}
              </Animated.View>
            )}

            {/* ════════════════════════════════════════
                TAB: 规则
               ════════════════════════════════════════ */}
            {activeTab === 'rules' && (
              <Animated.View entering={FadeInDown.duration(280).springify()} style={{ gap: 14 }}>
                {[
                  {
                    title: '📌 晋升基本规则',
                    items: [
                      '原则上禁止越级晋升，仅保留严格限制的破格通道（最高30%概率）',
                      '职数总量封顶：满编状态下暂停所有晋升，只有空缺才能升',
                      '同批竞争积分从高到低择优，连续3次落选触发「职业倦怠」debuff（积分-10%）',
                      '年龄硬线：达到职级年龄天花板，只能转人大/政协二线岗位',
                    ],
                  },
                  {
                    title: '⚖️ 条件要求',
                    items: [
                      `任职年限：当前级别需满 ${effectiveTenureReq} 年`,
                      `政绩积累：需达到 ${currentRankConfig.requiredMerit} 分`,
                      `道德底线：纪检线≥55，党务线≥48，团派线≥45，行政线≥40`,
                      '民主测评与专项考核均需≥60分（可在「干部制度」页发起）',
                      `能力门槛：下一职级最低能力值需≥${abilityMin}`,
                    ],
                  },
                  {
                    title: '🗺️ 路线晋升说明',
                    items: [
                      '四条路线（行政/党务/纪检/团派）在特定节点收敛后可重选',
                      '收敛节点：县委书记（R6）、市委书记（R9）为两路线合并点',
                      '分叉点由组织部随机指派，确认后自动执行路线设定',
                      '喜好路线可随时调整，与当前路线匹配时NPC提拔概率+20%',
                    ],
                  },
                  {
                    title: '💰 特殊通道',
                    items: [
                      '行贿促晋：消耗灰色收入，上司好感+10，但巡视风险+15',
                      '东窗事发概率与inspectionRisk成正比（风险越高越危险）',
                      '总理晋升（R13→R14）需领导人名单投票支持率≥65%',
                      '党主席晋升（R14→R15）需党代会选举票数≥75%',
                    ],
                  },
                ].map((section, si) => (
                  <View key={si} style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 14, gap: 8 }}>
                    <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800' }}>{section.title}</Text>
                    {section.items.map((item, ii) => (
                      <View key={ii} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                        <Text style={{ color: 'rgba(255,184,0,0.5)', fontSize: 10, marginTop: 3 }}>•</Text>
                        <Text style={{ flex: 1, color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 18 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </Animated.View>
            )}

          </ScrollView>

          {/* ── 东窗事发弹窗 ── */}
          {exposedAlert && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
              <View style={{ backgroundColor: '#1a1f2e', borderWidth: 2, borderColor: exposedLevel === 'case' ? '#E74C3C' : exposedLevel === 'suspend' ? '#E67E22' : '#FFB800', borderRadius: 20, padding: 24, gap: 16, width: '100%', maxWidth: 340 }}>
                <Text style={{ color: exposedLevel === 'case' ? '#E74C3C' : exposedLevel === 'suspend' ? '#E67E22' : '#FFB800', fontSize: 20, fontWeight: '900', textAlign: 'center' }}>
                  {exposedLevel === 'case' ? '⚖️ 东窗事发！立案调查' : exposedLevel === 'suspend' ? '⚠️ 行为暴露！停职处理' : '📢 风声走漏！党内警告'}
                </Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 22, textAlign: 'center' }}>
                  {exposedLevel === 'case' ? '您的行贿行为被中央纪委掌握，已启动正式立案调查程序。仕途危机！'
                    : exposedLevel === 'suspend' ? '行贿行为被上级察觉，已予停职检查。政绩-100，晋升失败。'
                    : '有关部门收到举报，已给予党内警告处分。此次晋升受阻，需重新积累。'}
                </Text>
                <Pressable onPress={() => { setExposedAlert(false); }} style={{ backgroundColor: exposedLevel === 'case' ? 'rgba(231,76,60,0.2)' : 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: exposedLevel === 'case' ? 'rgba(231,76,60,0.5)' : 'rgba(255,184,0,0.4)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: exposedLevel === 'case' ? '#E74C3C' : '#FFB800', fontWeight: '800', fontSize: 14 }}>知道了</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── 提示消息 Toast ── */}
          {!!msg && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 120, paddingHorizontal: 24, pointerEvents: 'none' }}>
              <View style={{ backgroundColor: msgOk ? 'rgba(34,197,94,0.95)' : 'rgba(231,76,60,0.95)', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, maxWidth: '100%', shadowColor: msgOk ? '#22C55E' : '#E74C3C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{msg}</Text>
              </View>
            </View>
          )}

          {/* ── 下属跟随弹窗 ── */}
          {showFollowModal && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#1a1f2e', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', borderRadius: 20, padding: 20, gap: 14, width: '100%', maxWidth: 360 }}>
                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>📦 调任下属随行</Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' }}>以下下属申请跟随您赴任 {pendingCity}，请决定是否批准：</Text>
                <ScrollView style={{ maxHeight: 240 }} showsVerticalScrollIndicator={false}>
                  {followCandidates.map(c => (
                    <Pressable key={c.id} onPress={() => setFollowDecisions(prev => ({ ...prev, [c.id]: !prev[c.id] }))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}>
                      <View style={{ width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: followDecisions[c.id] ? '#22C55E' : 'rgba(255,255,255,0.3)', backgroundColor: followDecisions[c.id] ? 'rgba(34,197,94,0.2)' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                        {followDecisions[c.id] && <Text style={{ color: '#22C55E', fontSize: 10, fontWeight: '900' }}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '600' }}>{c.name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>忠诚度 {c.loyalty} · {c.appointedRole ?? '普通下属'}</Text>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => { setShowFollowModal(false); void handleFollowConfirm(); }} style={{ flex: 1, backgroundColor: 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#FFB800', fontWeight: '700' }}>确认</Text>
                  </Pressable>
                  <Pressable onPress={() => { setShowFollowModal(false); void handleFollowConfirm(); }} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>全不带</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {/* ── 秘书选择弹窗 ── */}
          {showSecretaryPick && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#1a1f2e', borderWidth: 1, borderColor: 'rgba(255,184,0,0.3)', borderRadius: 20, padding: 20, gap: 14, width: '100%', maxWidth: 360 }}>
                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>🗂️ 选任新秘书</Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, textAlign: 'center' }}>从下属中选定一位担任您的贴身秘书：</Text>
                <ScrollView style={{ maxHeight: 280 }} showsVerticalScrollIndicator={false}>
                  {secretaryCandidates.map(s => (
                    <Pressable key={s.id} onPress={() => setSelectedSecretaryId(s.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', borderRadius: 8, backgroundColor: selectedSecretaryId === s.id ? 'rgba(255,184,0,0.08)' : 'transparent', paddingHorizontal: 4 }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: selectedSecretaryId === s.id ? 2 : 1, borderColor: selectedSecretaryId === s.id ? '#FFB800' : 'rgba(255,255,255,0.15)', backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 20 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, fontWeight: '600' }}>{s.name}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>能力 {s.ability} · Rank {s.rankLevel}</Text>
                      </View>
                      {selectedSecretaryId === s.id && <Text style={{ color: '#FFB800', fontSize: 16 }}>✓</Text>}
                    </Pressable>
                  ))}
                </ScrollView>
                <Pressable
                  onPress={async () => {
                    if (!selectedSecretaryId) return;
                    setShowSecretaryPick(false);
                    setIsProcessing(true);
                    const { appointSubAsSecretary } = await import('@/db/gameApi');
                    const picked = secretaryCandidates.find(s => s.id === selectedSecretaryId);
                    if (picked) await appointSubAsSecretary(save.id, { id: picked.id, name: picked.name, avatarId: picked.avatarId, ability: picked.ability });
                    // ⚡ 终态提交：强制注入内存+延长60秒冷却，彻底防止 refreshSave 从 DB 读回旧 rankLevel
                    commitPromotion();
                    setShowCelebration(true);
                    setConfirmed(true);
                    if (nextRankLevel === 13) setShowTrackModal(true);
                    setIsProcessing(false);
                    unlockAdvance(); // 解锁：秘书选任完成，晋升全流程结束
                  }}
                  disabled={!selectedSecretaryId}
                  style={{ backgroundColor: selectedSecretaryId ? 'rgba(255,184,0,0.15)' : 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: selectedSecretaryId ? 'rgba(255,184,0,0.4)' : 'rgba(255,255,255,0.08)', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
                >
                  <Text style={{ color: selectedSecretaryId ? '#FFB800' : 'rgba(255,255,255,0.3)', fontWeight: '800', fontSize: 14 }}>
                    {selectedSecretaryId ? '确认任命' : '请先选择秘书'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* ── 分管线弹窗（晋升副总理） ── */}
          {showTrackModal && assignedCabinetTrack && (
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <View style={{ backgroundColor: '#1a1f2e', borderWidth: 2, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 20, padding: 24, gap: 14, width: '100%', maxWidth: 340 }}>
                <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '900', textAlign: 'center' }}>📋 分管线任命</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, lineHeight: 22, textAlign: 'center' }}>
                  您已被随机分配分管 <Text style={{ color: '#FFB800', fontWeight: '800' }}>
                    {{ economy: '经济领域', social: '社会领域', hmt: '港澳台事务', military: '军事领域' }[assignedCabinetTrack]}
                  </Text>，此后施政与晋升路径将与该分管线紧密相关。
                </Text>
                <Pressable onPress={() => setShowTrackModal(false)} style={{ backgroundColor: 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#FFB800', fontWeight: '800', fontSize: 14 }}>接受任命</Text>
                </Pressable>
              </View>
            </View>
          )}

        </View>
      )}
      {/* ── 全屏晋升庆祝动画浮层（showCelebration=true时出现，3秒后自动消失）── */}
      {showCelebration && (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(600)}
          style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.72)', zIndex: 999 }}
          pointerEvents="none"
        >
          {/* 粒子烟花：固定位置散射光点 */}
          {[
            { topR: 0.15, leftR: 0.10, color: '#FFB800', size: 10, delay: 0 },
            { topR: 0.10, leftR: 0.55, color: '#FF6B35', size: 8,  delay: 80 },
            { topR: 0.20, leftR: 0.80, color: '#FFD700', size: 12, delay: 150 },
            { topR: 0.35, leftR: 0.05, color: '#FF4466', size: 7,  delay: 60 },
            { topR: 0.30, leftR: 0.90, color: '#66DDFF', size: 9,  delay: 200 },
            { topR: 0.60, leftR: 0.08, color: '#FFB800', size: 11, delay: 100 },
            { topR: 0.65, leftR: 0.85, color: '#FF6B35', size: 8,  delay: 40 },
            { topR: 0.75, leftR: 0.50, color: '#FFD700', size: 10, delay: 180 },
            { topR: 0.80, leftR: 0.20, color: '#FF4466', size: 7,  delay: 120 },
            { topR: 0.12, leftR: 0.35, color: '#66DDFF', size: 9,  delay: 220 },
          ].map((p, i) => (
            <Animated.View
              key={i}
              entering={ZoomIn.duration(400).delay(p.delay)}
              exiting={FadeOut.duration(400)}
              style={{
                position: 'absolute',
                top: SCREEN_H * p.topR,
                left: SCREEN_W * p.leftR,
                width: p.size, height: p.size, borderRadius: p.size / 2,
                backgroundColor: p.color,
                shadowColor: p.color, shadowOpacity: 1, shadowRadius: 8,
              }}
            />
          ))}
          {/* 中心徽章 */}
          <Animated.View
            entering={ZoomIn.duration(500).springify().damping(10)}
            exiting={FadeOut.duration(300)}
            style={{ alignItems: 'center', gap: 10 }}
          >
            <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 5, borderColor: '#FFB800', backgroundColor: 'rgba(255,184,0,0.12)', alignItems: 'center', justifyContent: 'center', shadowColor: '#FFB800', shadowOpacity: 0.8, shadowRadius: 24 }}>
              <Text style={{ fontSize: 42, color: '#FFB800', fontWeight: '900', lineHeight: 50 }}>晋</Text>
              <Text style={{ fontSize: 16, color: '#FFB800', fontWeight: '800', letterSpacing: 4 }}>升</Text>
            </View>
            <Animated.View entering={FadeInDown.duration(350).delay(300)}>
              <Text style={{ fontSize: 22, color: '#fff', fontWeight: '900', letterSpacing: 3, textAlign: 'center' }}>{save.rankName}</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', textAlign: 'center', marginTop: 4, letterSpacing: 1 }}>组织任命令已下达</Text>
            </Animated.View>
          </Animated.View>
          {/* 自动消失计时器（用 useEffect 控制） */}
        </Animated.View>
      )}
    </View>
  );
}

