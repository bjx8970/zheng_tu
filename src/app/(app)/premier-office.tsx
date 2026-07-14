// 总理办公室页面 — rank13+可进入，rank14拥有完整权限
// v67+：指令费用=专项经费10%-20%随机波动；副总理分化（每人单独分管）；UI全面重构
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getAllSubordinates } from '@/db/gameApi';
import premierOfficeData from '@/config/premier-office.json';
import type { Subordinate } from '@/types/game';
import { formatMoney, estimateNationalGdp } from '@/types/game';
import { getHotlineTargets } from '@/lib/leaders';

// 副总理分管板块
interface VPArea {
  id: string;
  icon: string;
  title: string;
  desc: string;
  // cost 字段已移除——执行时动态计算为专项经费的 10%~20%
  effects: { key: keyof typeof EFFECT_LABELS; delta: number }[];
  meritReward: number;
  isMilExercise?: boolean;      // 军事演习：费用×100
  isMilResearch?: boolean;      // 装备研发：政绩+50%
  isPartyDirective?: boolean;   // 执政党中央指令（rank15）
  isCongressDirective?: boolean;// 联邦国会指令（rank15）
  isBudgetApproval?: boolean;   // 财政总预算批准：额外经费+5%
}

const EFFECT_LABELS: Record<string, string> = {
  cityGdp: 'GDP', cityLivelihood: '民生', cityEcology: '生态',
  cityBusiness: '营商', securityIndex: '安全',
};

// ── 联邦国会议员定义 ──
interface CongressMember {
  id: string;
  name: string;
  faction: '执政党' | '在野党' | '无党籍';
  committee: string;
  province: string;
  seniority: number; // 资历届数
}

interface LegislativeTask {
  id: string;
  title: string;
  desc: string;
  committee: string; // 适用委员会
  meritReward: number;
  duration: string;
}

const CONGRESS_MEMBERS: CongressMember[] = premierOfficeData.congressMembers as CongressMember[];

const LEGISLATIVE_TASKS: LegislativeTask[] = premierOfficeData.legislativeTasks as LegislativeTask[];

// 每个副总理独立分管一个领域；枢武府由总理直管
const VP_AREAS: VPArea[] = premierOfficeData.vpAreas as VPArea[];

// 计算本次下达指令费用：专项经费的10%~20%随机
function calcDirectiveCost(fundBalance: number): number {
  const rate = 0.10 + Math.random() * 0.10;
  return Math.max(1, Math.round(fundBalance * rate));
}

// 副总理分管关系配置（每人只负责一个板块）
const VP_CONFIG = premierOfficeData.vpConfig;

const AREA_TABS = premierOfficeData.areaTabs;

// KPI评级标准（依据政绩&四项指标）
function calcKpiScore(s: Subordinate): number {
  return s.experience * 0.4 + s.integrity * 0.3 + s.loyalty * 0.15 + s.ability * 0.15;
}

// ── 特批晋升/调任岗位数据 ────────────────────────────────────────────
interface SpecialPost {
  id: string;
  title: string;        // 岗位名称
  org: string;          // 所在单位
  level: number;        // 岗位职级（subLevel）
  levelName: string;    // 职级名称
  type: '晋升' | '调任';
  desc: string;
  cost: number;         // 政绩消耗
  meritReward: number;  // 政绩奖励（调任赋权后的政绩）
}

const SPECIAL_POSTS: SpecialPost[] = premierOfficeData.specialPosts as SpecialPost[];

// ── 专线电话传达任务数据（由 leaders.ts 动态生成）──────────────────

const HOTLINE_TASKS = premierOfficeData.hotlineTasks;

// ── 述职报告部署：联邦内阁向各部委及省级下达述职任务 ─────────────────
interface DebriefTask {
  id: string;
  unit: string;     // 单位名称
  type: '部委' | '省级';
  topic: string;    // 述职主题
  kpiTarget: string;
  deadline: string; // 截止季度描述
  status: 'pending' | 'submitted' | 'passed' | 'failed';
  score?: number;
}

const DEBRIEF_UNITS: DebriefTask[] = premierOfficeData.debriefUnits as DebriefTask[];

export default function PremierOfficeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();  const [tab, setTab] = useState('economy');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [debriefTasks, setDebriefTasks] = useState<DebriefTask[]>(DEBRIEF_UNITS);
  const [debriefActing, setDebriefActing] = useState<string | null>(null);
  // 整改结果记录：taskId -> 整改措施描述
  const [reformResults, setReformResults] = useState<Record<string, string>>({});
  // 特批晋升：已批准的岗位ID集合
  const [approvedPosts, setApprovedPosts] = useState<Set<string>>(new Set());
  // 专线电话：已选联系人、已选任务
  const [hotlineTarget, setHotlineTarget] = useState<ReturnType<typeof getHotlineTargets>[0] | null>(null);
  const [hotlineTask, setHotlineTask] = useState<typeof HOTLINE_TASKS[0] | null>(null);
  const [hotlineFilter, setHotlineFilter] = useState<'全部' | '副总理' | '部长' | '省执政委书记'>('全部');
  const [hotlineSent, setHotlineSent] = useState<Set<string>>(new Set());
  // 月度GDP增长：记录上次领取的月份
  const [lastGdpMonth, setLastGdpMonth] = useState<number>(-1);
  // 国防预算月扣：记录上次扣款月份
  const [lastDefenseMonth, setLastDefenseMonth] = useState<number>(-1);
  // 党代会上次召开的游戏天数（从存档读取，执行后写回）
  const [lastPartyCongressDay, setLastPartyCongressDay] = useState<number>(-1);
  // 联邦国会议员：已分配任务 {memberId -> taskId}
  const [memberTasks, setMemberTasks] = useState<Record<string, string>>({});
  // 国会议员筛选
  const [congressFilter, setCongressFilter] = useState<'全部' | '执政党' | '在野党' | '无党籍'>('全部');
  // 已完成的立法任务
  const [completedLegTasks, setCompletedLegTasks] = useState<Set<string>>(new Set());

  // 动态专线联系人（基于存档ID，全局统一名字）
  const hotlineTargets = save ? getHotlineTargets(save.id) : [];

  // 从存档初始化党代会记录（仅一次）
  const [partyCongressInited, setPartyCongressInited] = useState(false);
  useFocusEffect(useCallback(() => {
    if (save && !partyCongressInited) {
      setLastPartyCongressDay(save.lastPartyCongressDay ?? 0);
      setPartyCongressInited(true);
      // rank13 副总统：初始 tab 自动定位到分管线，避免显示无权限的 economy tab
      if (save.rankLevel === 13 && save.cabinetTrack) {
        setTab(save.cabinetTrack);
      }
      // rank13-14 非行政路线：初始 tab 定位到路线专属 tab
      if (save.rankLevel <= 14) {
        const cp = save.careerPath || 'government';
        const pathTabMap: Record<string, string> = { discipline: 'discipline-work', party: 'party-work', league: 'league-work' };
        if (pathTabMap[cp]) setTab(pathTabMap[cp]);
      }
    }
  }, [save, partyCongressInited]));

  useFocusEffect(
    useCallback(() => {
      if (!save || tab !== 'kpi') return;
      setKpiLoading(true);
      getAllSubordinates(save.id).then(list => {
        setSubs(list);
        setKpiLoading(false);
      });
    }, [save, tab]),
  );

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#8B1A1A" /></View>;
  }
  // rank13+（副总理）即可进入，rank14（总理）拥有全权
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F5F4F1' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🏛️</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至联邦副总统（级别13）后解锁内阁总理办公室</Text>
      </View>
    );
  }

  // 月度专项金额：每月自动增长全国GDP的1%（联邦内阁专项拨款）
  const currentMonth = Math.floor(save.gameDays / 30);
  const nationalGdpAmt = estimateNationalGdp(save.rankLevel, save.cityGdp); // 亿元
  const monthlyGdpBonus = Math.round(nationalGdpAmt * 0.01); // GDP的1%（亿元）
  const canCollectMonthly = currentMonth > lastGdpMonth && save.rankLevel >= 13;

  // 国防预算月扣：每月从专项经费随机扣除2%~3%
  const defenseDeductRate = 0.02 + Math.random() * 0.01; // 2%~3%（每次渲染固定，实际扣款时重算）
  const defenseDeductAmt = Math.round(save.fundBalance * defenseDeductRate);
  const canDefenseDeduct = currentMonth > lastDefenseMonth && save.rankLevel >= 13 && tab === 'military';

  const handleCollectMonthly = async () => {
    if (!canCollectMonthly || acting) return;
    setActing(true);
    try {
      await updateGameSave({ fundBalance: save.fundBalance + monthlyGdpBonus * 10_000 });
      setLastGdpMonth(currentMonth);
      setResult(`💰 本月专项拨款已到账 ¥${formatMoney(monthlyGdpBonus * 10_000)}（全国GDP×1%）`);
      setTimeout(() => setResult(''), 4000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  const handleDefenseDeduct = async () => {
    if (!canDefenseDeduct || acting) return;
    setActing(true);
    const rate = 0.02 + Math.random() * 0.01;
    const amt = Math.round(save.fundBalance * rate);
    try {
      await updateGameSave({ fundBalance: save.fundBalance - amt, securityIndex: Math.min(100, save.securityIndex + 2) });
      setLastDefenseMonth(currentMonth);
      setResult(`⚔️ 本月国防预算已划拨 ¥${formatMoney(amt)}（专项经费${(rate * 100).toFixed(1)}%），安全指数+2`);
      setTimeout(() => setResult(''), 4000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  const currentAreaActions = AREA_TABS.find(t => t.id === tab)?.ids.map(id => VP_AREAS.find(a => a.id === id)!).filter(Boolean) ?? [];

  // rank15路线专权行动冷却天数定义（游戏天数）
  const R15_COOLDOWNS: Record<string, number> = {
    r15p1: 365, // 颁布路线纲领：1年
    r15p2: 365, // 政治局级专项问责：1年
    r15p3: 180, // 省委书记一对一谈话：6个月
    r15g1: 180, // 国情咨文演说：6个月
    r15g2: 180, // 签署国家紧急状态令：6个月
    r15g3: 180, // 国家元首峰会出访：6个月
    r15l1: 180, // 国会特别调查委员会：6个月
    r15l2: 365, // 宪法权威解释令：1年
    r15l3:  90, // 国会全体紧急表决：3个月
    r15d1: 180, // 全国扫黑除恶专项收网：6个月
    r15d2: 365, // 联邦最高法院法官提名：1年
    r15d3: 180, // 司法体系大检查令：6个月
  };
  /** 计算某个r15行动的剩余冷却天数（0=可用） */
  const getR15Cooldown = (actionId: string): number => {
    const cooldowns = save.r15ActionCooldowns ?? {};
    const lastDay = cooldowns[actionId] ?? 0;
    if (!lastDay) return 0;
    const cd = R15_COOLDOWNS[actionId] ?? 0;
    return Math.max(0, cd - (save.gameDays - lastDay));
  };

  const handleAction = async (action: VPArea) => {
    if (acting) return;
    // 党代会10年周期 + 政绩条件检查
    if (action.id === 'p1') {
      const CONGRESS_INTERVAL = 10 * 365; // 10游戏年
      const CONGRESS_MERIT_REQ = 50000;   // 政绩门槛
      const daysSinceLast = save.gameDays - (lastPartyCongressDay > 0 ? lastPartyCongressDay : 0);
      const yearsLeft = Math.ceil((CONGRESS_INTERVAL - daysSinceLast) / 365);
      if (lastPartyCongressDay > 0 && daysSinceLast < CONGRESS_INTERVAL) {
        setResult(`⏳ 党代会10年一届，距下届还需约${yearsLeft}年（已过${Math.floor(daysSinceLast / 365)}年）`);
        setTimeout(() => setResult(''), 4000);
        return;
      }
      if (save.meritPoints < CONGRESS_MERIT_REQ) {
        setResult(`⚠️ 政绩不足：召开全国党代会需累计政绩≥50,000，当前 ${save.meritPoints.toLocaleString()}`);
        setTimeout(() => setResult(''), 4000);
        return;
      }
    }
    // rank15路线专权行动冷却检查
    if (action.id.startsWith('r15')) {
      const cdRemain = getR15Cooldown(action.id);
      if (cdRemain > 0) {
        const cdMonths = Math.ceil(cdRemain / 30);
        setResult(`⏳ 冷却中：${action.title} 还需约${cdMonths}个月后可再次执行`);
        setTimeout(() => setResult(''), 3500);
        return;
      }
    }
    // 军事演习费用×100；其余正常10%~20%
    const baseCost = calcDirectiveCost(save.fundBalance);
    const cost = action.isMilExercise ? baseCost * 100 : baseCost;
    // 装备研发政绩+50%；执政党/国会高阶指令及r15专属行动政绩+80%
    const meritMult = action.isMilResearch ? 1.5 : (action.isPartyDirective || action.isCongressDirective || action.id.startsWith('r15')) ? 1.8 : 1;
    const merit = Math.round(action.meritReward * meritMult);
    if (save.fundBalance < cost) {
      setResult(`⚠️ 经费不足：${action.title}需要 ¥${formatMoney(cost)}，当前仅 ¥${formatMoney(save.fundBalance)}`);
      setTimeout(() => setResult(''), 3000);
      return;
    }
    setActing(true);
    const patch: Record<string, unknown> = {
      fundBalance: save.fundBalance - cost,
      meritPoints: save.meritPoints + merit,
    };
    if (action.isBudgetApproval) {
      const bonus = Math.round(save.fundBalance * 0.05);
      patch.fundBalance = (patch.fundBalance as number) + bonus;
    }
    if (action.id === 'p1') {
      patch.lastPartyCongressDay = save.gameDays;
    }
    if (action.id.startsWith('r15')) {
      patch.r15ActionCooldowns = { ...(save.r15ActionCooldowns ?? {}), [action.id]: save.gameDays };
      if (action.id === 'r15p2') {
        patch.pendingOpinionEvent = {
          type: 'party_purge',
          title: '🔴 政治局级专项问责：全国舆论震动',
          desc: '最高领导层对政治局级别失职官员启动问责，国内外媒体铺天盖地报道。民间情绪复杂——既有对反腐力度的高度认可，也有部分派系对政治格局震荡的深度担忧。此次问责被历史学家认定为执政以来力度最强的自我净化行动。',
          gameDays: save.gameDays,
        };
      } else if (action.id === 'r15d1') {
        patch.pendingOpinionEvent = {
          type: 'sweep_gang',
          title: '🕵️ 全国扫黑除恶专项收网：法治威严震慑全国',
          desc: '联邦政法委最高首长一声令下，全国同步收网，数百个重大黑恶势力团伙被一举捣毁。案件细节经官方媒体披露后，社会舆论空前沸腾。人民群众对执法机关和最高监察权威的信任度大幅攀升，相关话题登上全国舆论热搜榜首。',
          gameDays: save.gameDays,
        };
      }
    }
    action.effects.forEach(e => {
      const cur = (save as unknown as Record<string, number>)[e.key] ?? 0;
      (patch as Record<string, number>)[e.key] = Math.min(100, cur + e.delta);
    });
    try {
      await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
      if (action.id === 'p1') setLastPartyCongressDay(save.gameDays);
      const effectStr = action.effects.map(e => `${EFFECT_LABELS[e.key] ?? e.key}+${e.delta}`).join(' ');
      const cdText = R15_COOLDOWNS[action.id] ? `【冷却${Math.round(R15_COOLDOWNS[action.id] / 30)}个月】` : '';
      const extra = action.isMilExercise ? '【演习耗资巨大】'
        : action.isMilResearch ? '【研发政绩+50%】'
        : action.isBudgetApproval ? '【预算批准·经费回补5%】'
        : action.id === 'p1' ? '【党代会召开·10年冷却开始】'
        : action.id.startsWith('r15') ? `【路线专权·政绩+80%】${cdText}`
        : (action.isPartyDirective || action.isCongressDirective) ? '【高阶指令·政绩+80%】'
        : '';
      const premierMsg = `✅ ${action.title}完成 ${extra}· 花费 ¥${formatMoney(cost)} · 政绩+${merit} · ${effectStr}`;
      await saveResult('premier_' + action.id, { ok: true, desc: premierMsg, day: save.gameDays });
      setResult(premierMsg);
      setTimeout(() => setResult(''), 4000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  // KPI - 三年不达标撤职（meritPoints < 2000 视为不达标，3次）
  const handleDismiss = async (sub: Subordinate) => {
    if (acting) return;
    setActing(true);
    try {
      await updateGameSave({ meritPoints: save.meritPoints + 20 });
      setDismissed(prev => new Set(prev).add(sub.id));
      setResult(`📉 已撤销 ${sub.name} 职务（KPI连续不达标）`);
      setTimeout(() => setResult(''), 3000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  // 述职报告：下达述职任务 / 批复审核
  const REFORM_OUTCOMES: Record<string, string> = {
    d1: '发改委已提交整改方案：加快重大项目审批，出台GDP增速专项支持政策',
    d2: '财政部整改落实：压减一般性支出5%，优化财政赤字管理机制',
    d3: '工信部整改措施：加大数字经济专项投入，引进重点企业落地',
    d4: '农业农村部整改方案：扩大高标准农田建设，加强粮食仓储保障',
    d5: '生态环境部整改：出台碳达峰专项行动方案，加强重点区域治理',
    d6: '教育部整改部署：增加义务教育专项投入，推进优质师资均衡配置',
    d7: '卫健委整改落实：扩大医保覆盖范围，完善基层医疗服务网络',
    d8: '公安部整改措施：开展专项打击行动，强化技防手段建设',
    d9: '粤海省整改方案：出台产业转型升级专项政策，优化营商环境指标',
    d10: '瓯越省整改部署：发布数字经济新三年行动方案，助推民营经济活力',
    d11: '汉东省整改措施：加快制造业智能化改造，提升高技术产业比重',
    d12: '齐鲁省整改落实：设立新旧动能转换专项基金，聚焦六大传统产业',
  };

  const handleDebriefAction = async (task: DebriefTask, action: 'issue' | 'pass' | 'fail') => {
    if (debriefActing) return;
    setDebriefActing(task.id);
    const score = Math.floor(Math.random() * 40) + 55;
    try {
      if (action === 'issue') {
        setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'submitted', score } : t));
        setResult(`📋 已向${task.unit}下达述职任务`);
      } else if (action === 'pass') {
        setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'passed' } : t));
        await updateGameSave({ meritPoints: save.meritPoints + 15 });
        setResult(`✅ ${task.unit}述职报告审核通过，政绩+15`);
      } else {
        const outcome = REFORM_OUTCOMES[task.id] ?? `${task.unit}已接受约谈，承诺45天内提交整改落实方案`;
        setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
        setReformResults(prev => ({ ...prev, [task.id]: outcome }));
        await updateGameSave({ meritPoints: save.meritPoints + 8 });
        setResult(`⚠️ ${task.unit}约谈整改已发出，整改追踪+8政绩`);
      }
      setTimeout(() => setResult(''), 3500);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setDebriefActing(null);
    }
  };
  const handleDebriefReset = () => {
    setDebriefTasks(DEBRIEF_UNITS.map(t => ({ ...t, status: 'pending' as const })));
    setResult('🔄 新一轮述职周期已开启');
    setTimeout(() => setResult(''), 2500);
  };

  // 特批晋升/调任
  const handleSpecialApprove = async (post: SpecialPost) => {
    if (acting || approvedPosts.has(post.id)) return;
    if ((save?.meritPoints ?? 0) < post.cost) {
      setResult(`⚠️ 政绩不足，需要 ${post.cost} 政绩`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    try {
      await updateGameSave({
        meritPoints: (save?.meritPoints ?? 0) - post.cost + post.meritReward,
      });
      setApprovedPosts(prev => new Set(prev).add(post.id));
      setResult(`✅ 已${post.type === '晋升' ? '特批晋升' : '调任'}${post.title} · 政绩${post.cost > post.meritReward ? '-' : '+'}${Math.abs(post.cost - post.meritReward)}`);
      setTimeout(() => setResult(''), 3000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  const handleHotlineSend = async () => {
    if (!hotlineTarget || !hotlineTask || acting) return;
    const key = `${hotlineTarget.id}_${hotlineTask.id}`;
    if (hotlineSent.has(key)) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      meritPoints: (save?.meritPoints ?? 0) + hotlineTask.meritReward,
    };
    const cur = (save as unknown as Record<string, number>)[hotlineTask.effect] ?? 0;
    (patch as Record<string, number>)[hotlineTask.effect] = Math.min(100, cur + hotlineTask.delta);
    try {
      await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
      setHotlineSent(prev => new Set(prev).add(key));
      setResult(`☎️ 已向${hotlineTarget.title}${hotlineTarget.name}传达「${hotlineTask.label}」任务 · 政绩+${hotlineTask.meritReward}`);
      setHotlineTarget(null);
      setHotlineTask(null);
      setTimeout(() => setResult(''), 3000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  const rankedSubs = [...subs].sort((a, b) => calcKpiScore(b) - calcKpiScore(a));
  const currentYear = Math.floor(save.gameDays / 365);

  // ── 分管线权限计算 ──
  // rank13：仅可管理 cabinetTrack 对应一条线
  // rank14（联邦内阁总理）：全管4条线 + 枢武府
  // rank15（联邦总统·执政党主席·枢武府主席）：全管4条线 + 最高枢武府权限
  const isTotalPresident = save.rankLevel >= 15; // 联邦总统
  const isPremier = save.rankLevel === 14;        // 联邦内阁总理
  const isPresident = save.rankLevel >= 14;       // 总理及以上（全管）
  const track = save.cabinetTrack;

  // 路线专属 tab 标识（rank13-14 非行政路线）— 需提前声明供下方 PATH_BADGE 使用
  const PATH_TABS: Record<string, string> = { discipline: 'discipline-work', party: 'party-work', league: 'league-work' };
  const careerPath = save.careerPath || 'government';
  const pathTab = PATH_TABS[careerPath];
  const isNonGovPath = !isPresident && !!pathTab;

  // 各职级信息映射（非行政路线 rank13-14 使用路线专属标识）
  const PATH_BADGE: Record<string, Record<number, { badge: string; color: string; sub: string }>> = {
    discipline: {
      13: { badge: '联邦肃宪院长（副国级）',       color: '#4A1A00', sub: '主持联邦肃宪督察院全面工作' },
      14: { badge: '联邦政法委书记·肃宪院正国级',  color: '#2D0A00', sub: '统领联邦政法体系与肃宪院最高职权' },
    },
    party: {
      13: { badge: '执政党政务常委（副国级）',      color: '#2A0040', sub: '参与执政党中央常委重要决策' },
      14: { badge: '执政党中央主席（正国级）',      color: '#1A0030', sub: '主持执政党中央全面工作' },
    },
    league: {
      13: { badge: '联邦国会副委员长（副国级）',    color: '#003060', sub: '协助主持联邦国会常务工作' },
      14: { badge: '联邦国会议长（正国级）',        color: '#001A40', sub: '主持联邦国会全面立法与监督工作' },
    },
  };
  const RANK_IDENTITY: Record<number, { badge: string; color: string; sub: string }> = {
    13: { badge: '联邦副总统', color: '#1B4F8A', sub: '主持内阁部分分管工作' },
    14: { badge: '联邦内阁总理', color: '#1A0A2E', sub: '主持联邦内阁全面工作' },
    15: { badge: '联邦总统·执政党主席·枢武府主席', color: '#8B1A1A', sub: '统领联邦最高权力机关' },
  };
  // 非行政路线 rank13-14 优先用路线专属标识
  const pathIdentity = (!isPresident && PATH_BADGE[careerPath]?.[save.rankLevel]) || null;
  const identity = pathIdentity ?? (RANK_IDENTITY[save.rankLevel] ?? RANK_IDENTITY[14]);

  // 副总理分管线颜色映射
  const TRACK_COLOR: Record<string, string> = {
    economy: '#1B4F8A', social: '#1B6B3A', hmt: '#5B2D8B', military: '#8B1A1A',
  };
  const TRACK_VP_TITLE: Record<string, string> = {
    economy: '第一副总理（经济金融线）', social: '第二副总理（社会民生线）',
    hmt: '第三副总理（港澳台外交线）', military: '枢武府副主席（国防安全线）',
  };

  // 可见的 AREA_TABS（非行动类tab始终可见：kpi/debrief/hotline/promote）
  const NON_ACTION_TABS = new Set(['kpi', 'debrief', 'hotline', 'promote']);
  const PRESIDENT_ONLY_TABS = new Set(['party', 'congress']); // rank15专属

  const visibleAreaTabs = AREA_TABS.filter(t => {
    if (NON_ACTION_TABS.has(t.id)) return true;
    if (PRESIDENT_ONLY_TABS.has(t.id)) return isTotalPresident; // rank15才可见
    if (t.id === 'r15-exclusive') return isTotalPresident;       // rank15路线专属tab
    // 路线专属 tab：仅当前路线且rank13-14可见
    if (t.id === 'discipline-work') return !isPresident && careerPath === 'discipline';
    if (t.id === 'party-work')      return !isPresident && careerPath === 'party';
    if (t.id === 'league-work')     return !isPresident && careerPath === 'league';
    // 非行政路线（discipline/party/league）rank13-14：隐藏内阁分管线行动 tab
    if (isNonGovPath) return false;
    if (isPresident) return true;   // 总理及以上全管其余四线
    if (!track) return true;        // 兼容旧存档
    return t.id === track;           // rank13行政路线只显示分管线
  });

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#3D0808" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: isTotalPresident ? '#3D0000' : isPremier ? '#1A0A2E' : careerPath === 'discipline' ? '#2D1000' : careerPath === 'party' ? '#1A0030' : careerPath === 'league' ? '#001A30' : '#0B2547', paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Pressable onPress={() => router.replace('/(app)/home')} style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#ffaacc', fontSize: 20 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(200,180,255,0.55)', fontSize: 9, letterSpacing: 3 }}>
              {isTotalPresident ? '执政党中央 · 枢武府主席'
                : isPremier ? '联邦内阁 · 总理职权中枢'
                : careerPath === 'discipline' ? '联邦肃宪督察院 · 纪检监察系统'
                : careerPath === 'party' ? '执政党中央 · 党务决策核心'
                : careerPath === 'league' ? '联邦国会 · 立法人事中枢'
                : '联邦内阁 · 副总理分管职权'}
            </Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>
              {isTotalPresident ? '🏛️ 总统官邸'
                : isPremier ? '🏛️ 总理办公室'
                : careerPath === 'discipline' ? '⚖️ 肃宪督察院'
                : careerPath === 'party' ? '🎖️ 执政党中央'
                : careerPath === 'league' ? '🏛️ 联邦国会'
                : '🏛️ 内阁专权'}
            </Text>
            <Text style={{ color: 'rgba(200,180,255,0.7)', fontSize: 10, marginTop: 1 }}>
              {save.playerName} · {identity.sub}
            </Text>
          </View>
          <View style={{ backgroundColor: identity.color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
            <Text style={{ color: '#FFD700', fontSize: 8, fontWeight: '700', letterSpacing: 1 }}>
              {isTotalPresident ? '总统' : isPremier ? '总理' : '副总理'}
            </Text>
          </View>
        </View>
        {/* 资源栏 */}
        <View style={{ flexDirection: 'row', marginTop: 14, gap: 6 }}>
          {[
            { label: '专项经费', value: `¥${formatMoney(save.fundBalance)}`, color: '#FFD700', flex: 2 },
            { label: '政绩积分', value: save.meritPoints.toFixed(0), color: '#A5F3D0', flex: 1 },
            { label: '任职年限', value: `${save.tenureYears}年`, color: '#A5C8F3', flex: 1 },
          ].map(item => (
            <View key={item.label} style={{ flex: item.flex, backgroundColor: 'rgba(255,255,255,0.07)', paddingVertical: 8, paddingHorizontal: 6, alignItems: 'center' }}>
              <Text style={{ color: 'rgba(200,180,255,0.55)', fontSize: 8 }}>{item.label}</Text>
              <Text style={{ color: item.color, fontWeight: '700', fontSize: 13, marginTop: 1 }}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 月度专项拨款提示条 */}
      {canCollectMonthly && (
        <Pressable
          onPress={() => void handleCollectMonthly()}
          style={{ backgroundColor: '#2A1060', paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(165,140,255,0.2)' }}
        >
          <View>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>💰 本月专项拨款可领取</Text>
            <Text style={{ color: 'rgba(200,180,255,0.7)', fontSize: 9, marginTop: 1 }}>
              全国GDP×1% ≈ ¥{formatMoney(monthlyGdpBonus * 10_000)}
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 5 }}>
            <Text style={{ color: '#1A0A2E', fontSize: 11, fontWeight: '700' }}>领取</Text>
          </View>
        </Pressable>
      )}

      {/* 副总理分管说明 / 职权状态栏 */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EBEBEB' }}>
        {isTotalPresident ? (
          // ── rank15：联邦总统·执政党主席·枢武府主席 ──
          <>
            <View style={{ backgroundColor: '#1A0000', padding: 12, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>🗺️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#FFD580', fontSize: 9, letterSpacing: 3 }}>执政党中央 · 最高统帅部</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '900' }}>联邦总统 · 执政党主席 · 枢武府主席</Text>
                <Text style={{ color: 'rgba(255,220,180,0.7)', fontSize: 9, marginTop: 1 }}>统领联邦政务院、枢武府及执政党全国委员会</Text>
              </View>
            </View>
            {/* 四条线全管展示 */}
            <View style={{ flexDirection: 'row', gap: 5, marginBottom: 8 }}>
              {VP_CONFIG.map(vp => (
                <View key={vp.tabId} style={{ flex: 1, backgroundColor: vp.vpColor + '18', borderWidth: 1, borderColor: vp.vpColor + '66', padding: 7, alignItems: 'center', gap: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: vp.vpColor }}>{vp.vpTitle}</Text>
                  <Text style={{ fontSize: 8, color: '#555', textAlign: 'center' }}>{vp.vpLabel}</Text>
                  <Text style={{ fontSize: 7, color: '#2a7a3b' }}>✅ 全管</Text>
                </View>
              ))}
              <View style={{ flex: 1, backgroundColor: '#8B1A1A18', borderWidth: 1, borderColor: '#8B1A1A66', padding: 7, alignItems: 'center', gap: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#8B1A1A' }}>枢武府主席</Text>
                <Text style={{ fontSize: 8, color: '#555', textAlign: 'center' }}>⚔️ 枢武府</Text>
                <Text style={{ fontSize: 7, color: '#2a7a3b' }}>✅ 全权</Text>
              </View>
            </View>
            {/* 核心职务班子 */}
            <View style={{ backgroundColor: '#F8F0FF', borderWidth: 1, borderColor: '#C8B8E8', padding: 9, gap: 4 }}>
              <Text style={{ fontSize: 9, color: '#5B2D8B', fontWeight: '700', letterSpacing: 1, marginBottom: 2 }}>📋 直属政务常委班子</Text>
              {[
                { label: '联邦内阁总理', role: '主持内阁日常工作', color: '#1A0A2E' },
                { label: '联邦国会议长（政务常委）', role: '主持联邦国会常委会', color: '#1B4F8A' },
                { label: '联邦政法委书记（政务委员）', role: '统筹全国政法工作', color: '#7B0026' },
              ].map(r => (
                <View key={r.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, backgroundColor: r.color, borderRadius: 1 }} />
                  <Text style={{ fontSize: 10, color: r.color, fontWeight: '600', flex: 1 }}>{r.label}</Text>
                  <Text style={{ fontSize: 9, color: '#888' }}>{r.role}</Text>
                </View>
              ))}
            </View>
          </>
        ) : isPremier ? (
          // ── rank14：联邦内阁总理 ──
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ backgroundColor: '#1A0A2E', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>联邦内阁总理</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#333', fontWeight: '700' }}>统领联邦内阁 · 四条分管线全权在握</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {VP_CONFIG.map(vp => (
                <View key={vp.tabId} style={{ flex: 1, backgroundColor: vp.vpColor + '18', borderWidth: 1, borderColor: vp.vpColor + '55', padding: 7, alignItems: 'center', gap: 1 }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: vp.vpColor }}>{vp.vpTitle}</Text>
                  <Text style={{ fontSize: 8, color: '#555', textAlign: 'center' }}>{vp.vpLabel}</Text>
                </View>
              ))}
              <View style={{ flex: 1, backgroundColor: '#8B1A1A18', borderWidth: 1, borderColor: '#8B1A1A55', padding: 7, alignItems: 'center', gap: 1 }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#8B1A1A' }}>总理直管</Text>
                <Text style={{ fontSize: 8, color: '#555', textAlign: 'center' }}>⚔️ 枢武府</Text>
              </View>
            </View>
            <Text style={{ fontSize: 9, color: '#aaa', marginTop: 7, textAlign: 'center' }}>每次下达指令花费：当前专项经费的 10%~20%（随机波动）</Text>
          </>
        ) : track ? (
          // ── rank13：已分配分管线的副总理 ──
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <View style={{ backgroundColor: TRACK_COLOR[track] ?? '#1A0A2E', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>副总理</Text>
              </View>
              <Text style={{ fontSize: 10, color: '#333', fontWeight: '700' }} numberOfLines={1}>
                {TRACK_VP_TITLE[track] ?? '分管副总理'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {AREA_TABS.filter(t => !NON_ACTION_TABS.has(t.id)).map(t => {
                const vpConf = VP_CONFIG.find(v => v.tabId === t.id);
                const isOwn = t.id === track;
                const tColor = TRACK_COLOR[t.id] ?? '#888';
                return (
                  <View key={t.id} style={{
                    flex: 1, minWidth: 70,
                    backgroundColor: isOwn ? tColor + '22' : '#F5F5F5',
                    borderWidth: isOwn ? 2 : 1,
                    borderColor: isOwn ? tColor : '#DDD',
                    padding: 7, alignItems: 'center', gap: 2,
                    opacity: isOwn ? 1 : 0.4,
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: isOwn ? '700' : '400', color: isOwn ? tColor : '#aaa' }}>
                      {vpConf?.vpLabel ?? t.label}
                    </Text>
                    <Text style={{ fontSize: 7, color: isOwn ? '#2a7a3b' : '#ccc' }}>
                      {isOwn ? '✅ 您分管' : '🔒 不分管'}
                    </Text>
                  </View>
                );
              })}
            </View>
            <Text style={{ fontSize: 9, color: '#aaa', marginTop: 7, textAlign: 'center' }}>
              分管范围受限 · 晋升联邦内阁总理后解锁全管 · 指令花费专项经费10%~20%
            </Text>
          </>
        ) : (
          // ── 旧存档兼容：未设置分管线 ──
          <>
            <Text style={{ fontSize: 9, color: '#aaa', letterSpacing: 2, marginBottom: 8 }}>副总理分管架构</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {VP_CONFIG.map(vp => (
                <View key={vp.tabId} style={{ flex: 1, backgroundColor: vp.vpColor + '12', borderWidth: 1, borderColor: vp.vpColor + '44', padding: 8, alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: vp.vpColor }}>{vp.vpTitle}</Text>
                  <Text style={{ fontSize: 9, color: '#555', textAlign: 'center' }}>{vp.vpLabel}</Text>
                </View>
              ))}
              <View style={{ flex: 1, backgroundColor: '#8B1A1A12', borderWidth: 1, borderColor: '#8B1A1A44', padding: 8, alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#8B1A1A' }}>总理直管</Text>
                <Text style={{ fontSize: 9, color: '#555', textAlign: 'center' }}>⚔️ 枢武府</Text>
              </View>
            </View>
            <Text style={{ fontSize: 9, color: '#aaa', marginTop: 7, textAlign: 'center' }}>每次下达指令花费：当前专项经费的 10%~20%（随机波动）</Text>
          </>
        )}
      </View>

      {/* 功能Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {visibleAreaTabs.map(t => {
          // r15-exclusive：根据路线动态显示标签
          const label = t.id === 'r15-exclusive'
            ? (careerPath === 'party'       ? '🎖️ 党主席专权'
              : careerPath === 'government' ? '🏳️ 总统专权'
              : careerPath === 'league'     ? '🏛️ 议长专权'
              : careerPath === 'discipline' ? '⚖️ 监察专权'
              : '⭐ 路线专权')
            : t.label;
          return (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={{ paddingHorizontal: 11, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t.id ? (t.id === 'r15-exclusive' ? '#8B4500' : '#1A0A2E') : 'transparent' }}
            >
              <Text style={{ fontSize: 11, fontWeight: tab === t.id ? '700' : '400', color: tab === t.id ? (t.id === 'r15-exclusive' ? '#8B4500' : '#1A0A2E') : '#888' }} numberOfLines={1}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic">

        {/* 行动列表 — economy/social/hmt/military/party/congress */}
        {['economy','social','hmt','military'].includes(tab) && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 当前分管副总理信息卡片（非枢武府 tab 时显示） */}
            {(() => {
              const vpConf = VP_CONFIG.find(v => v.tabId === tab);
              if (!vpConf) return null;
              return (
                <View style={{ backgroundColor: vpConf.vpColor, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700', textAlign: 'center' }}>副总理</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, letterSpacing: 2 }}>联邦内阁 · 分管领导</Text>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{vpConf.vpTitle} · {vpConf.vpLabel}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10, marginTop: 2 }}>{vpConf.desc}</Text>
                  </View>
                </View>
              );
            })()}
            {tab === 'military' && (
              <>
                {/* ── 中央军事委员会 主题头部 ── */}
                <View style={{ backgroundColor: '#0D0D0D', padding: 0, overflow: 'hidden' }}>
                  {/* 顶部标题带 */}
                  <View style={{ backgroundColor: '#8B1A1A', paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#FFD580', fontSize: 8, letterSpacing: 4, fontWeight: '700' }}>CENTRAL MILITARY COMMISSION</Text>
                    <View style={{ backgroundColor: 'rgba(255,213,0,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#FFD580', fontSize: 7, fontWeight: '700', letterSpacing: 2 }}>TOP SECRET</Text>
                    </View>
                  </View>
                  {/* 主标题 */}
                  <View style={{ padding: 14, gap: 4 }}>
                    <Text style={{ color: 'rgba(255,200,200,0.5)', fontSize: 8, letterSpacing: 3 }}>
                      {isTotalPresident ? '枢武府主席 · 联邦最高军事统帅' : isPremier ? '联邦内阁总理 · 枢武府日常工作主持' : '枢武府副主席 · 分管国防安全'}
                    </Text>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 1 }}>
                      ⚔️ 中央军事委员会（枢武府）
                    </Text>
                    <Text style={{ color: 'rgba(255,220,180,0.7)', fontSize: 10, lineHeight: 16 }}>
                      {isTotalPresident
                        ? '执政党主席兼任枢武府主席，统率全国武装力量，负责国家战略安全、核决策与军事行动授权'
                        : isPremier
                        ? '总理协助枢武府主席主持日常军事委员会工作，负责军事预算审核、国防装备立项及联合演习部署'
                        : '副总理（枢武府线）协助主席处理枢武府日常工作，负责国防建设与军事委员会专项事务'}
                    </Text>
                  </View>
                  {/* 权限等级展示 */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                    {[
                      { label: '战略决策', granted: isTotalPresident, icon: '🗺️' },
                      { label: '核心预算', granted: isPresident, icon: '💰' },
                      { label: '演习部署', granted: isPresident || track === 'military', icon: '🪖' },
                      { label: '装备研发', granted: isPresident || track === 'military', icon: '🔬' },
                    ].map(item => (
                      <View key={item.label} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)', gap: 3 }}>
                        <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                        <Text style={{ fontSize: 8, color: item.granted ? '#FFD580' : '#666', fontWeight: item.granted ? '700' : '400' }}>{item.label}</Text>
                        <Text style={{ fontSize: 7, color: item.granted ? '#4CAF50' : '#555' }}>{item.granted ? '✅ 授权' : '🔒 受限'}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                {/* 月度国防预算扣款横幅 */}
                <View style={{ backgroundColor: canDefenseDeduct ? '#2A0000' : '#1A1A1A', borderWidth: 1, borderColor: canDefenseDeduct ? '#8B1A1A' : '#333', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 18 }}>🛡️</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD580', fontSize: 11, fontWeight: '700' }}>国防预算月度专项拨付</Text>
                    <Text style={{ color: 'rgba(255,220,180,0.75)', fontSize: 10, marginTop: 2 }}>
                      {canDefenseDeduct
                        ? `本月未完成划拨，预计从专项经费扣除 ¥${formatMoney(defenseDeductAmt)}（约2%~3%）`
                        : '本月已完成国防预算划拨（安全指数+2）'}
                    </Text>
                  </View>
                  {canDefenseDeduct && (
                    <Pressable onPress={() => void handleDefenseDeduct()} disabled={acting} style={{ backgroundColor: '#8B1A1A', paddingHorizontal: 12, paddingVertical: 7 }}>
                      <Text style={{ color: '#FFD580', fontSize: 11, fontWeight: '700' }}>立即划拨</Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
            {/* 费用说明 */}
            <View style={{ backgroundColor: tab === 'military' ? '#1A0000' : '#FFF9E6', borderWidth: 1, borderColor: tab === 'military' ? '#5A1A1A' : '#E0C87A', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11 }}>💡</Text>
              <Text style={{ fontSize: 10, color: tab === 'military' ? '#FFD580' : '#7B5E2A', flex: 1 }}>
                {tab === 'military'
                  ? `军委指令费用：常规指令专项经费10%~20%，军事演习×100倍，当前经费 ¥${formatMoney(save.fundBalance)}`
                  : `下达指令将从专项经费扣除 `}
                {tab !== 'military' && <Text style={{ fontWeight: '700' }}>10%~20%（随机波动）</Text>}
                {tab !== 'military' && `，当前经费 ¥${formatMoney(save.fundBalance)}`}
              </Text>
            </View>
            {currentAreaActions.map(action => {
              // 预估费用区间展示（军演×100）
              const baseMin = Math.round(save.fundBalance * 0.10);
              const baseMax = Math.round(save.fundBalance * 0.20);
              const minCost = action.isMilExercise ? baseMin * 100 : baseMin;
              const maxCost = action.isMilExercise ? baseMax * 100 : baseMax;
              const displayMerit = action.isMilResearch ? Math.round(action.meritReward * 1.5) : action.meritReward;
              const canAct = save.fundBalance >= minCost;
              const isMil = tab === 'military';
              return (
                <View key={action.id} style={{ backgroundColor: isMil ? '#111' : '#fff', borderWidth: 1, borderColor: action.isMilExercise ? '#8B1A1A' : action.isMilResearch ? '#1B4F8A' : isMil ? '#2A2A2A' : '#D8D8D8', overflow: 'hidden' }}>
                  <View style={{ padding: 13, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isMil ? '#FFD580' : '#1A0A2E' }}>{action.title}</Text>
                          <Text style={{ fontSize: 11, color: isMil ? 'rgba(255,220,180,0.7)' : '#777', lineHeight: 16, marginTop: 2 }}>{action.desc}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: action.isMilResearch ? '#1B4F8A' : isMil ? '#8B1A1A' : '#F0EAF8', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>+{displayMerit}政绩{action.isMilResearch ? '(+50%)' : ''}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                      <View style={{ backgroundColor: action.isMilExercise ? '#3A0000' : isMil ? '#1A1A1A' : '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: action.isMilExercise ? '#FF8080' : isMil ? '#FFD580' : '#7B5E2A' }}>
                          费用 ¥{formatMoney(minCost)}~¥{formatMoney(maxCost)}{action.isMilExercise ? '（演习×100）' : ''}
                        </Text>
                      </View>
                      {action.effects.map(e => (
                        <View key={e.key} style={{ backgroundColor: isMil ? '#1A2030' : '#EEF4FF', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: isMil ? '#A5C8F3' : '#2B4B6F' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void handleAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: !canAct ? '#333' : action.isMilExercise ? '#6B0000' : action.isMilResearch ? '#1B3A6B' : isMil ? '#8B1A1A' : '#1A0A2E', paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: !canAct ? '#666' : '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : !canAct ? '⚠️ 经费不足' : action.isMilExercise ? `▶ 启动演习（¥${formatMoney(minCost)}起）` : action.isMilResearch ? '▶ 立项研发（政绩+50%）' : '▶ 下达指示（经费10-20%随机扣除）'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 执政党中央（rank15专属） ── */}
        {tab === 'party' && (
          <View style={{ gap: 0 }}>
            {/* 顶部标识带 */}
            <View style={{ backgroundColor: '#8B0000' }}>
              <View style={{ backgroundColor: '#6A0000', paddingVertical: 7, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#FFD580', fontSize: 8, letterSpacing: 4, fontWeight: '700' }}>RULING PARTY CENTRAL COMMITTEE</Text>
                <View style={{ backgroundColor: 'rgba(255,213,0,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#FFD580', fontSize: 7, fontWeight: '700', letterSpacing: 2 }}>CLASSIFIED</Text>
                </View>
              </View>
              {/* 主标题 */}
              <View style={{ padding: 16, gap: 5 }}>
                <Text style={{ color: 'rgba(255,210,210,0.55)', fontSize: 8, letterSpacing: 3 }}>执政党中央委员会 · 主席专属职权</Text>
                <Text style={{ color: '#FFD700', fontWeight: '900', fontSize: 17 }}>🎖️ 执政党中央</Text>
                <Text style={{ color: 'rgba(255,230,200,0.8)', fontSize: 11, lineHeight: 17 }}>
                  以执政党主席身份主持执政党全国代表大会、党务总枢府全体会议，统领全国党务工作体系
                </Text>
              </View>
              {/* 职权说明行 */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                {[
                  { label: '全代会', icon: '🎖️', desc: '5年一届' },
                  { label: '纪律整顿', icon: '⚖️', desc: '年度专项' },
                  { label: '宣传统筹', icon: '📢', desc: '常态部署' },
                  { label: '全体会议', icon: '🏛️', desc: '党务核心' },
                ].map(item => (
                  <View key={item.label} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.08)', gap: 2 }}>
                    <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 8, color: '#FFD580', fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ fontSize: 7, color: 'rgba(255,210,200,0.6)' }}>{item.desc}</Text>
                  </View>
                ))}
              </View>
            </View>
            {/* 费用说明 */}
            <View style={{ backgroundColor: '#2A0000', borderBottomWidth: 1, borderBottomColor: '#5A1A1A', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11 }}>💡</Text>
              <Text style={{ fontSize: 10, color: '#FFD580', flex: 1 }}>
                执政党中央指令费用：专项经费10%~20%（随机波动）· <Text style={{ fontWeight: '700' }}>政绩加成+80%</Text>
              </Text>
            </View>
            {/* 指令卡片 */}
            <View style={{ padding: 14, gap: 10 }}>
              {(AREA_TABS.find(t => t.id === 'party')?.ids ?? []).map(id => {
                const action = VP_AREAS.find(a => a.id === id);
                if (!action) return null;
                const baseMin = Math.round(save.fundBalance * 0.10);
                const baseMax = Math.round(save.fundBalance * 0.20);
                const displayMerit = Math.round(action.meritReward * 1.8);
                const canAct = save.fundBalance >= baseMin;
                // 党代会：10年周期 + 50000政绩门槛
                const CONGRESS_INTERVAL = 10 * 365;
                const CONGRESS_MERIT_REQ = 50000;
                const daysSinceLast = save.gameDays - (lastPartyCongressDay > 0 ? lastPartyCongressDay : 0);
                const yearsSinceLast = Math.floor(daysSinceLast / 365);
                const yearsLeft = Math.ceil((CONGRESS_INTERVAL - daysSinceLast) / 365);
                const isCongressAction = action.id === 'p1';
                const congressCooldown = isCongressAction && lastPartyCongressDay > 0 && daysSinceLast < CONGRESS_INTERVAL;
                const congressMeritOk = save.meritPoints >= CONGRESS_MERIT_REQ;
                const canActFull = canAct && (!isCongressAction || (!congressCooldown && congressMeritOk));
                return (
                  <View key={action.id} style={{ backgroundColor: '#1A0000', borderWidth: 1, borderColor: isCongressAction ? (congressCooldown ? '#5A3A00' : '#8B0000') : '#5A1A1A', overflow: 'hidden' }}>
                    {/* 党代会状态条 */}
                    {isCongressAction && (
                      <View style={{ backgroundColor: congressCooldown ? '#3A2000' : (lastPartyCongressDay === 0 || lastPartyCongressDay === -1) ? '#1A0000' : '#1A3A00', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#3A1A00' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 10 }}>{congressCooldown ? '⏳' : '🟢'}</Text>
                          <Text style={{ fontSize: 10, color: congressCooldown ? '#FFA040' : '#A5F3D0', fontWeight: '700' }}>
                            {congressCooldown
                              ? `冷却中：已过${yearsSinceLast}年，距下届还需${yearsLeft}年`
                              : lastPartyCongressDay > 0 ? `上届已过${yearsSinceLast}年，可召开新一届` : '首届党代会·可立即召开'}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: congressMeritOk ? '#1A3A00' : '#3A0000', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, color: congressMeritOk ? '#A5F3D0' : '#FF9090', fontWeight: '700' }}>
                            政绩{save.meritPoints.toLocaleString()}/{CONGRESS_MERIT_REQ.toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    )}
                    <View style={{ padding: 14, gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFD580' }}>{action.title}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: 'rgba(255,220,180,0.75)', lineHeight: 16 }}>{action.desc}</Text>
                          {isCongressAction && (
                            <Text style={{ fontSize: 9, color: 'rgba(255,160,60,0.85)', marginTop: 4 }}>
                              📋 条件：政绩≥50,000 · 10年一届（上届{lastPartyCongressDay > 0 ? `已过${yearsSinceLast}年` : '尚未召开'}）
                            </Text>
                          )}
                        </View>
                        <View style={{ backgroundColor: '#8B0000', paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 9, color: '#FFD580', fontWeight: '700' }}>+{displayMerit}</Text>
                          <Text style={{ fontSize: 7, color: 'rgba(255,213,0,0.7)' }}>政绩(×1.8)</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        <View style={{ backgroundColor: '#2A0000', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#FF9090' }}>
                            费用 ¥{formatMoney(baseMin)}~¥{formatMoney(baseMax)}
                          </Text>
                        </View>
                        {action.effects.map(e => (
                          <View key={e.key} style={{ backgroundColor: '#1A1A30', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#A5C8F3' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => void handleAction(action)}
                      disabled={!canActFull || acting}
                      style={{ backgroundColor: !canActFull ? '#2A1A00' : '#8B0000', paddingVertical: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: !canActFull ? '#666' : '#FFD580', fontWeight: '700', fontSize: 12 }}>
                        {acting ? '执行中…'
                          : !canAct ? '⚠️ 经费不足'
                          : congressCooldown ? `⏳ 冷却中·还需${yearsLeft}年`
                          : isCongressAction && !congressMeritOk ? `⚠️ 政绩不足（需${CONGRESS_MERIT_REQ.toLocaleString()}）`
                          : `▶ 下达党中央指示（政绩×1.8）`}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ── 联邦国会（rank15专属） ── */}
        {tab === 'congress' && (
          <View style={{ gap: 0 }}>
            {/* 顶部标识带 */}
            <View style={{ backgroundColor: '#0A1E3D' }}>
              <View style={{ backgroundColor: '#071428', paddingVertical: 7, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#A5C8F3', fontSize: 8, letterSpacing: 4, fontWeight: '700' }}>FEDERAL NATIONAL CONGRESS</Text>
                <View style={{ backgroundColor: 'rgba(165,200,243,0.1)', paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#A5C8F3', fontSize: 7, fontWeight: '700', letterSpacing: 2 }}>OFFICIAL</Text>
                </View>
              </View>
              <View style={{ padding: 16, gap: 5 }}>
                <Text style={{ color: 'rgba(165,200,255,0.5)', fontSize: 8, letterSpacing: 3 }}>联邦国会 · 最高立法机关</Text>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 17 }}>🏛️ 联邦国会</Text>
                <Text style={{ color: 'rgba(180,210,255,0.8)', fontSize: 11, lineHeight: 17 }}>
                  行使最高立法权，审议并通过联邦基本法律、批准国家预算及授权重大对外事务；国会议长协助主持日常工作
                </Text>
              </View>
              {/* 四大职权 */}
              <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
                {[
                  { label: '立法权', icon: '📜', desc: '基本法律' },
                  { label: '预算权', icon: '💰', desc: '财政总预算' },
                  { label: '修宪权', icon: '🔏', desc: '宪法修正' },
                  { label: '条约权', icon: '🌐', desc: '国际协议' },
                ].map(item => (
                  <View key={item.label} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)', gap: 2 }}>
                    <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 8, color: '#A5C8F3', fontWeight: '700' }}>{item.label}</Text>
                    <Text style={{ fontSize: 7, color: 'rgba(165,200,255,0.55)' }}>{item.desc}</Text>
                  </View>
                ))}
              </View>
              {/* 国会议长信息 */}
              <View style={{ marginHorizontal: 14, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(165,200,255,0.15)', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>⚖️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#A5C8F3', fontSize: 10, fontWeight: '700' }}>联邦国会议长（联邦政务常委）</Text>
                  <Text style={{ color: 'rgba(165,200,255,0.65)', fontSize: 9, marginTop: 1 }}>协助执政党主席主持国会常委会，负责议程安排与表决程序</Text>
                </View>
              </View>
            </View>
            {/* 费用说明 */}
            <View style={{ backgroundColor: '#071428', borderBottomWidth: 1, borderBottomColor: '#1B3A6B', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 11 }}>💡</Text>
              <Text style={{ fontSize: 10, color: '#A5C8F3', flex: 1 }}>
                国会指令费用：专项经费10%~20% · <Text style={{ fontWeight: '700' }}>政绩加成+80%</Text> · 预算批准可额外回补5%经费
              </Text>
            </View>
            {/* 议案卡片 */}
            <View style={{ padding: 14, gap: 10 }}>
              {(AREA_TABS.find(t => t.id === 'congress')?.ids ?? []).map(id => {
                const action = VP_AREAS.find(a => a.id === id);
                if (!action) return null;
                const baseMin = Math.round(save.fundBalance * 0.10);
                const baseMax = Math.round(save.fundBalance * 0.20);
                const displayMerit = Math.round(action.meritReward * 1.8);
                const canAct = save.fundBalance >= baseMin;
                const isBudget = action.isBudgetApproval;
                const isConstitution = action.id === 'c3';
                return (
                  <View key={action.id} style={{ backgroundColor: '#0A1830', borderWidth: 1, borderColor: isBudget ? '#2B6B2A' : isConstitution ? '#8B4500' : '#1B3A6B', overflow: 'hidden' }}>
                    <View style={{ padding: 14, gap: 8 }}>
                      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: isBudget ? '#A5F3D0' : isConstitution ? '#FFD580' : '#fff' }}>
                              {action.title}
                            </Text>
                            {isBudget && (
                              <View style={{ backgroundColor: '#1B5E1A', paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 7, color: '#A5F3D0', fontWeight: '700' }}>回补经费</Text>
                              </View>
                            )}
                            {isConstitution && (
                              <View style={{ backgroundColor: '#8B4500', paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 7, color: '#FFD580', fontWeight: '700' }}>最高效力</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ fontSize: 11, color: 'rgba(165,200,255,0.75)', lineHeight: 16 }}>{action.desc}</Text>
                        </View>
                        <View style={{ backgroundColor: isBudget ? '#1B5E1A' : isConstitution ? '#6B3500' : '#1B3A6B', paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 9, color: '#A5C8F3', fontWeight: '700' }}>+{displayMerit}</Text>
                          <Text style={{ fontSize: 7, color: 'rgba(165,200,255,0.6)' }}>政绩(×1.8)</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                        <View style={{ backgroundColor: '#071428', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#7BA8D0' }}>
                            费用 ¥{formatMoney(baseMin)}~¥{formatMoney(baseMax)}{isBudget ? '（批准后+5%回补）' : ''}
                          </Text>
                        </View>
                        {action.effects.map(e => (
                          <View key={e.key} style={{ backgroundColor: '#0F1F35', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#A5C8F3' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <Pressable
                      onPress={() => void handleAction(action)}
                      disabled={!canAct || acting}
                      style={{ backgroundColor: !canAct ? '#1A1A2A' : isBudget ? '#1B5E1A' : isConstitution ? '#6B3500' : '#1B3A6B', paddingVertical: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: !canAct ? '#555' : '#fff', fontWeight: '700', fontSize: 12 }}>
                        {acting ? '审议中…' : !canAct ? '⚠️ 经费不足' : isBudget ? '▶ 批准财政总预算（回补5%经费）' : isConstitution ? '▶ 启动宪法修正案审议' : '▶ 提请国会审议表决（政绩×1.8）'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>

            {/* ── 联邦国会议员名单管理 ── */}
            <View style={{ backgroundColor: '#071428', borderTopWidth: 2, borderTopColor: '#1B3A6B', paddingTop: 14, gap: 10 }}>
              {/* 议员名单标题 */}
              <View style={{ paddingHorizontal: 14 }}>
                <View style={{ backgroundColor: '#0A1830', padding: 14, borderWidth: 1, borderColor: '#1B3A6B' }}>
                  <Text style={{ color: 'rgba(165,200,255,0.55)', fontSize: 8, letterSpacing: 3 }}>联邦国会 · 议员名册管理</Text>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15, marginTop: 3 }}>⚖️ 国会议员名单</Text>
                  <Text style={{ color: 'rgba(165,200,255,0.75)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                    共 {CONGRESS_MEMBERS.length} 名议员，向议员安排立法任务可获得政绩奖励。执政党议员配合度更高。
                  </Text>
                  {/* 议席分布 */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                    {[
                      { label: '执政党', count: CONGRESS_MEMBERS.filter(m => m.faction === '执政党').length, color: '#8B0000', textColor: '#FFD580' },
                      { label: '在野党', count: CONGRESS_MEMBERS.filter(m => m.faction === '在野党').length, color: '#1B5E1A', textColor: '#A5F3D0' },
                      { label: '无党籍', count: CONGRESS_MEMBERS.filter(m => m.faction === '无党籍').length, color: '#3A3A3A', textColor: '#D0D0D0' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, backgroundColor: s.color, padding: 8, alignItems: 'center', gap: 2 }}>
                        <Text style={{ color: s.textColor, fontSize: 16, fontWeight: '900' }}>{s.count}</Text>
                        <Text style={{ color: s.textColor, fontSize: 9, opacity: 0.85 }}>{s.label}</Text>
                      </View>
                    ))}
                    <View style={{ flex: 1, backgroundColor: '#1B3A6B', padding: 8, alignItems: 'center', gap: 2 }}>
                      <Text style={{ color: '#A5C8F3', fontSize: 16, fontWeight: '900' }}>{Object.keys(memberTasks).length}</Text>
                      <Text style={{ color: '#A5C8F3', fontSize: 9, opacity: 0.85 }}>已分配</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 筛选条 */}
              <View style={{ paddingHorizontal: 14 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {(['全部', '执政党', '在野党', '无党籍'] as const).map(f => (
                      <Pressable
                        key={f}
                        onPress={() => setCongressFilter(f)}
                        style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: congressFilter === f ? '#1B3A6B' : '#0A1830', borderWidth: 1, borderColor: congressFilter === f ? '#4B7ADB' : '#1B3A6B' }}
                      >
                        <Text style={{ fontSize: 11, color: congressFilter === f ? '#A5C8F3' : '#6B8AAA', fontWeight: congressFilter === f ? '700' : '400' }}>{f}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* 议员卡片列表 */}
              <View style={{ paddingHorizontal: 14, gap: 8 }}>
                {CONGRESS_MEMBERS
                  .filter(m => congressFilter === '全部' || m.faction === congressFilter)
                  .map(member => {
                    const assignedTaskId = memberTasks[member.id];
                    const assignedTask = LEGISLATIVE_TASKS.find(t => t.id === assignedTaskId);
                    const isDone = assignedTaskId ? completedLegTasks.has(`${member.id}:${assignedTaskId}`) : false;
                    const factionColor = member.faction === '执政党' ? '#8B0000' : member.faction === '在野党' ? '#1B5E1A' : '#3A3A5A';
                    const factionTextColor = member.faction === '执政党' ? '#FFD580' : member.faction === '在野党' ? '#A5F3D0' : '#C8C8D8';
                    const factionBg = member.faction === '执政党' ? 'rgba(139,0,0,0.3)' : member.faction === '在野党' ? 'rgba(27,94,26,0.3)' : 'rgba(58,58,90,0.3)';
                    return (
                      <View key={member.id} style={{ backgroundColor: '#0A1830', borderWidth: 1, borderColor: isDone ? '#2B5E2A' : assignedTaskId ? '#2B4B8B' : '#1B3A6B' }}>
                        {/* 议员信息行 */}
                        <View style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                          <View style={{ width: 36, height: 36, backgroundColor: factionColor, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 13, fontWeight: '900', color: factionTextColor }}>
                              {member.name.slice(0, 1)}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{member.name}</Text>
                              <View style={{ backgroundColor: factionBg, paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ fontSize: 8, color: factionTextColor, fontWeight: '700' }}>{member.faction}</Text>
                              </View>
                              {Array.from({ length: member.seniority }, (_, i) => (
                                <Text key={i} style={{ fontSize: 7, color: '#7BA8D0' }}>★</Text>
                              ))}
                            </View>
                            <Text style={{ color: 'rgba(165,200,255,0.6)', fontSize: 9, marginTop: 1 }}>
                              {member.committee} · {member.province}
                            </Text>
                          </View>
                          {isDone && (
                            <View style={{ backgroundColor: '#1B5E1A', paddingHorizontal: 6, paddingVertical: 3 }}>
                              <Text style={{ color: '#A5F3D0', fontSize: 9, fontWeight: '700' }}>✓ 已完成</Text>
                            </View>
                          )}
                        </View>

                        {/* 已分配任务显示 */}
                        {assignedTask && !isDone && (
                          <View style={{ backgroundColor: 'rgba(27,58,107,0.5)', marginHorizontal: 12, marginBottom: 10, padding: 10, borderWidth: 1, borderColor: '#2B4B8B', gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Text style={{ color: '#A5C8F3', fontSize: 11, fontWeight: '700' }}>📜 {assignedTask.title}</Text>
                              <Text style={{ color: '#7BA8D0', fontSize: 9 }}>预计{assignedTask.duration}</Text>
                            </View>
                            <Text style={{ color: 'rgba(165,200,255,0.65)', fontSize: 10 }}>{assignedTask.desc}</Text>
                            <View style={{ flexDirection: 'row', gap: 6 }}>
                              <Pressable
                                onPress={() => {
                                  setCompletedLegTasks(prev => new Set([...prev, `${member.id}:${assignedTaskId}`]));
                                  void updateGameSave({ meritPoints: save.meritPoints + assignedTask.meritReward });
                                  setResult(`✅ ${member.name}完成《${assignedTask.title}》· 政绩+${assignedTask.meritReward}`);
                                  setTimeout(() => setResult(''), 3000);
                                }}
                                style={{ flex: 1, backgroundColor: '#1B5E1A', paddingVertical: 8, alignItems: 'center' }}
                              >
                                <Text style={{ color: '#A5F3D0', fontSize: 11, fontWeight: '700' }}>✓ 审批通过 +{assignedTask.meritReward}政绩</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => setMemberTasks(prev => { const n = { ...prev }; delete n[member.id]; return n; })}
                                style={{ backgroundColor: '#2A0000', paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' }}
                              >
                                <Text style={{ color: '#FF9090', fontSize: 11 }}>撤回</Text>
                              </Pressable>
                            </View>
                          </View>
                        )}

                        {/* 未分配：立法任务选择器 */}
                        {!assignedTask && !isDone && (
                          <View style={{ marginHorizontal: 12, marginBottom: 10, gap: 6 }}>
                            <Text style={{ color: 'rgba(165,200,255,0.5)', fontSize: 9, letterSpacing: 1 }}>安排立法任务</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View style={{ flexDirection: 'row', gap: 6 }}>
                                {LEGISLATIVE_TASKS
                                  .filter(t => t.committee === member.committee || member.faction === '执政党')
                                  .map(task => (
                                    <Pressable
                                      key={task.id}
                                      onPress={() => setMemberTasks(prev => ({ ...prev, [member.id]: task.id }))}
                                      style={{ backgroundColor: '#0F1F35', borderWidth: 1, borderColor: '#1B3A6B', paddingHorizontal: 10, paddingVertical: 7, gap: 2, minWidth: 130 }}
                                    >
                                      <Text style={{ color: '#A5C8F3', fontSize: 10, fontWeight: '700' }} numberOfLines={1}>{task.title}</Text>
                                      <Text style={{ color: '#6B8AAA', fontSize: 8 }}>{task.committee} · +{task.meritReward}</Text>
                                    </Pressable>
                                  ))
                                }
                              </View>
                            </ScrollView>
                          </View>
                        )}
                      </View>
                    );
                  })
                }
              </View>
              <View style={{ height: 10 }} />
            </View>
          </View>
        )}

        {/* ── 纪检路线专属（rank13-14 discipline）：肃宪督察院 ── */}
        {tab === 'discipline-work' && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 机构身份卡 */}
            <View style={{ backgroundColor: '#1A0A00', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,120,0.6)', fontSize: 9, letterSpacing: 3 }}>
                {save.rankLevel === 13 ? '联邦肃宪督察院 · 副国级 · 院长' : '联邦政法委 · 肃宪院 · 正国级'}
              </Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 4 }}>
                {save.rankLevel === 13 ? '⚖️ 联邦肃宪院长' : '⚖️ 联邦政法委书记 · 肃宪院最高首长'}
              </Text>
              <Text style={{ color: 'rgba(255,200,120,0.85)', fontSize: 11, marginTop: 6, lineHeight: 18 }}>
                {save.rankLevel === 13
                  ? '主持联邦肃宪督察院全面工作，统筹全国纪检监察体系，依法开展重大案件审查、全国巡视督察与廉政建设工作。'
                  : '以政法委书记身份统领全国司法、检察与纪检监察体系，协调公安、司法、肃宪院联动，确保国家法制权威。'}
              </Text>
            </View>
            {/* 职权行动 */}
            {VP_AREAS.filter(a => ['dw1','dw2','dw3','dw4','dw5','dw6'].includes(a.id)).map(action => (
              <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D8C4A0', overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#2D1A00', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{action.title}</Text>
                    <Text style={{ color: 'rgba(255,200,120,0.75)', fontSize: 10, marginTop: 2 }}>
                      政绩 +{action.meritReward} · 消耗经费10-20%
                    </Text>
                  </View>
                </View>
                <View style={{ padding: 10, gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {action.effects.map(e => (
                      <View key={e.key} style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D8C4A0' }}>
                        <Text style={{ fontSize: 9, color: '#7B3F00' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => void handleAction(action)}
                    disabled={acting}
                    style={{ backgroundColor: acting ? '#999' : '#2D1A00', paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : '▶ 下达指示（经费10-20%随机扣除）'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 党务路线专属（rank13-14 party）：执政党常委 / 执政党主席 ── */}
        {tab === 'party-work' && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 机构身份卡 */}
            <View style={{ backgroundColor: '#1A0020', padding: 14 }}>
              <Text style={{ color: 'rgba(200,160,255,0.6)', fontSize: 9, letterSpacing: 3 }}>
                {save.rankLevel === 13 ? '执政党中央政务常委会 · 副国级 · 常委' : '执政党中央 · 正国级 · 党务委员长'}
              </Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 4 }}>
                {save.rankLevel === 13 ? '🎖️ 执政党政务常委（副国级）' : '🎖️ 执政党中央主席 · 党务委员长'}
              </Text>
              <Text style={{ color: 'rgba(200,160,255,0.85)', fontSize: 11, marginTop: 6, lineHeight: 18 }}>
                {save.rankLevel === 13
                  ? '以政务常委身份参与执政党最高决策，分管意识形态与党建系统，推动全党思想路线统一与干部队伍建设。'
                  : '以执政党中央主席身份统领党务系统，主持全国代表大会、常委会议，掌握干部任免与路线方针最终决定权。'}
              </Text>
            </View>
            {/* 职权行动 */}
            {VP_AREAS.filter(a => ['pw1','pw2','pw3','pw4','pw5','pw6'].includes(a.id)).map(action => (
              <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0B8E0', overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#2A0040', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{action.title}</Text>
                    <Text style={{ color: 'rgba(200,160,255,0.75)', fontSize: 10, marginTop: 2 }}>
                      政绩 +{action.meritReward} · 消耗经费10-20%
                    </Text>
                  </View>
                </View>
                <View style={{ padding: 10, gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {action.effects.map(e => (
                      <View key={e.key} style={{ backgroundColor: '#F5F0FF', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#C8A8F0' }}>
                        <Text style={{ fontSize: 9, color: '#4A0080' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => void handleAction(action)}
                    disabled={acting}
                    style={{ backgroundColor: acting ? '#999' : '#2A0040', paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : '▶ 下达指示（经费10-20%随机扣除）'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 团派路线专属（rank13-14 league）：联邦国会 / 人事院 ── */}
        {tab === 'league-work' && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 机构身份卡 */}
            <View style={{ backgroundColor: '#001A30', padding: 14 }}>
              <Text style={{ color: 'rgba(100,200,255,0.6)', fontSize: 9, letterSpacing: 3 }}>
                {save.rankLevel === 13 ? '联邦国会 · 副国级 · 副委员长' : '联邦国会 · 正国级 · 国会议长'}
              </Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 4 }}>
                {save.rankLevel === 13 ? '🏛️ 联邦国会副委员长（副国级）' : '🏛️ 联邦国会议长 · 立法最高领导人'}
              </Text>
              <Text style={{ color: 'rgba(100,200,255,0.85)', fontSize: 11, marginTop: 6, lineHeight: 18 }}>
                {save.rankLevel === 13
                  ? '协助国会议长主持常委会立法与监督工作，兼任党政人事院联络协调职，推进干部队伍年轻化建设。'
                  : '以国会议长身份统领联邦立法机关，主持宪法修正、重大立法审议与国会外交，同时负责政务院联席政策协调。'}
              </Text>
            </View>
            {/* 职权行动 */}
            {VP_AREAS.filter(a => ['lw1','lw2','lw3','lw4','lw5','lw6'].includes(a.id)).map(action => (
              <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#A0C8E8', overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#002A50', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{action.title}</Text>
                    <Text style={{ color: 'rgba(100,200,255,0.75)', fontSize: 10, marginTop: 2 }}>
                      政绩 +{action.meritReward} · 消耗经费10-20%
                    </Text>
                  </View>
                </View>
                <View style={{ padding: 10, gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {action.effects.map(e => (
                      <View key={e.key} style={{ backgroundColor: '#E8F5FF', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#80B8D8' }}>
                        <Text style={{ fontSize: 9, color: '#003060' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => void handleAction(action)}
                    disabled={acting}
                    style={{ backgroundColor: acting ? '#999' : '#002A50', paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : '▶ 下达指示（经费10-20%随机扣除）'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}





        {/* ── rank15 路线专属职权（⭐ 路线专权 tab） ── */}
        {tab === 'r15-exclusive' && (() => {
          // 路线配置映射
          const R15_CONFIG: Record<string, {
            bg: string; headerBg: string; accent: string; labelColor: string; tagBg: string; tagBorder: string; tagText: string;
            badge: string; title: string; subtitle: string; titleLine2: string;
            caps: Array<{ icon: string; label: string; desc: string }>;
            actionIds: string[];
            meritMult: number;
          }> = {
            party: {
              bg: '#3A0000', headerBg: '#8B0000', accent: '#FFD580', labelColor: '#FFD580',
              tagBg: '#2A0000', tagBorder: '#8B0000', tagText: '#FF9090',
              badge: '执政党中央委员会 · 主席专属职权',
              title: '🎖️ 执政党最高领导人专属职权',
              titleLine2: '路线方针 · 纪律问责 · 干部领导',
              subtitle: '以执政党主席身份行使党内最高决策权：颁布纲领、震慑高层、直接约谈省委书记。这是全党运转的最高意志',
              caps: [
                { icon: '📋', label: '纲领权', desc: '最高路线' },
                { icon: '🔴', label: '问责权', desc: '政治局级' },
                { icon: '🤝', label: '谈话权', desc: '省委直控' },
              ],
              actionIds: ['r15p1', 'r15p2', 'r15p3'],
              meritMult: 1.8,
            },
            government: {
              bg: '#001830', headerBg: '#0A3060', accent: '#A5D8FF', labelColor: '#A5D8FF',
              tagBg: '#001020', tagBorder: '#1B4A8A', tagText: '#90C8FF',
              badge: '联邦总统府 · 国家元首专属职权',
              title: '🏳️ 联邦总统专属职权',
              titleLine2: '国情咨文 · 紧急状态 · 元首外交',
              subtitle: '以联邦总统身份行使国家最高行政权：发表国情咨文、签署紧急状态令、以国家元首身份出席国际峰会缔结战略伙伴关系',
              caps: [
                { icon: '📣', label: '咨文权', desc: '年度国情' },
                { icon: '🚨', label: '紧急令', desc: '非常授权' },
                { icon: '🌏', label: '元首外交', desc: '国际峰会' },
              ],
              actionIds: ['r15g1', 'r15g2', 'r15g3'],
              meritMult: 1.8,
            },
            league: {
              bg: '#001A30', headerBg: '#083060', accent: '#A5E8C0', labelColor: '#A5E8C0',
              tagBg: '#001020', tagBorder: '#1B5A3A', tagText: '#80DDA0',
              badge: '联邦国会 · 议长专属职权',
              title: '🏛️ 联邦国会议长专属职权',
              titleLine2: '特别调查 · 宪法解释 · 全体表决',
              subtitle: '以联邦国会议长身份行使最高立法监督权：发起特别调查委员会、颁布宪法权威解释、推动国会全体紧急表决',
              caps: [
                { icon: '🔎', label: '调查权', desc: '特委听证' },
                { icon: '🔏', label: '释宪权', desc: '宪法解释' },
                { icon: '🗳️', label: '表决权', desc: '全体国会' },
              ],
              actionIds: ['r15l1', 'r15l2', 'r15l3'],
              meritMult: 1.8,
            },
            discipline: {
              bg: '#1A0A00', headerBg: '#4A1A00', accent: '#FFA060', labelColor: '#FFA060',
              tagBg: '#120500', tagBorder: '#6A2A00', tagText: '#FF8040',
              badge: '联邦政法委 · 最高监察专属职权',
              title: '⚖️ 最高监察官专属职权',
              titleLine2: '扫黑除恶 · 最高法官提名 · 司法大检查',
              subtitle: '以联邦政法委最高首长身份行使最高监察权：发起全国扫黑专项、提名最高法院法官、对全国司法体系下达大检查令',
              caps: [
                { icon: '🕵️', label: '扫黑权', desc: '专项收网' },
                { icon: '🏛️', label: '提名权', desc: '最高法院' },
                { icon: '📑', label: '大检查', desc: '司法清查' },
              ],
              actionIds: ['r15d1', 'r15d2', 'r15d3'],
              meritMult: 1.8,
            },
          };
          const cfg = R15_CONFIG[careerPath] ?? R15_CONFIG['government'];
          const actions = cfg.actionIds.map(id => VP_AREAS.find(a => a.id === id)).filter(Boolean) as typeof VP_AREAS;
          const baseMin = Math.round(save.fundBalance * 0.10);
          const baseMax = Math.round(save.fundBalance * 0.20);
          return (
            <View style={{ gap: 0 }}>
              {/* 顶部标识带 */}
              <View style={{ backgroundColor: cfg.bg }}>
                <View style={{ backgroundColor: cfg.headerBg, paddingVertical: 7, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Text style={{ color: cfg.accent, fontSize: 8, letterSpacing: 3, fontWeight: '700' }}>{cfg.badge.toUpperCase()}</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: cfg.accent, fontSize: 7, fontWeight: '700', letterSpacing: 2 }}>EXCLUSIVE</Text>
                  </View>
                </View>
                <View style={{ padding: 16, gap: 5 }}>
                  <Text style={{ color: `${cfg.accent}60`, fontSize: 8, letterSpacing: 3 }}>{cfg.badge}</Text>
                  <Text style={{ color: cfg.accent, fontWeight: '900', fontSize: 17 }}>{cfg.title}</Text>
                  <Text style={{ color: `${cfg.accent}90`, fontSize: 10, letterSpacing: 1 }}>{cfg.titleLine2}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 17, marginTop: 2 }}>{cfg.subtitle}</Text>
                </View>
                {/* 职权图标栏 */}
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                  {cfg.caps.map(item => (
                    <View key={item.label} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.07)', gap: 2 }}>
                      <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                      <Text style={{ fontSize: 8, color: cfg.accent, fontWeight: '700' }}>{item.label}</Text>
                      <Text style={{ fontSize: 7, color: `${cfg.accent}60` }}>{item.desc}</Text>
                    </View>
                  ))}
                </View>
              </View>
              {/* 费用说明 */}
              <View style={{ backgroundColor: cfg.headerBg, borderBottomWidth: 1, borderBottomColor: `${cfg.accent}30`, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11 }}>⭐</Text>
                <Text style={{ fontSize: 10, color: cfg.accent, flex: 1 }}>
                  路线专属最高职权指令 · 费用：专项经费10%~20% · <Text style={{ fontWeight: '700' }}>政绩加成×1.8</Text>
                </Text>
              </View>
              {/* 行动卡片 */}
              <View style={{ padding: 14, gap: 12 }}>
                {actions.map(action => {
                  const displayMerit = Math.round(action.meritReward * cfg.meritMult);
                  const canAct = save.fundBalance >= baseMin;
                  const cdRemain = getR15Cooldown(action.id);
                  const isCooling = cdRemain > 0;
                  const cdMonths = Math.ceil(cdRemain / 30);
                  return (
                    <View key={action.id} style={{ backgroundColor: cfg.bg, borderWidth: 1, borderColor: isCooling ? `${cfg.accent}20` : `${cfg.accent}40`, overflow: 'hidden', opacity: isCooling ? 0.72 : 1 }}>
                      {/* 冷却提示条 */}
                      {isCooling && (
                        <View style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 11 }}>⏳</Text>
                          <Text style={{ color: cfg.accent, fontSize: 10, fontWeight: '700', flex: 1 }}>冷却中 · 约{cdMonths}个月后可再次执行</Text>
                          <View style={{ backgroundColor: cfg.tagBg, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: cfg.tagBorder }}>
                            <Text style={{ fontSize: 9, color: cfg.tagText }}>{cdRemain}天</Text>
                          </View>
                        </View>
                      )}
                      {/* 行动头部 */}
                      <View style={{ backgroundColor: cfg.headerBg, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Text style={{ fontSize: 26 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: cfg.accent, fontWeight: '900', fontSize: 14 }}>{action.title}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 3, lineHeight: 16 }}>{action.desc}</Text>
                        </View>
                        <View style={{ backgroundColor: `${cfg.accent}25`, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center', minWidth: 48 }}>
                          <Text style={{ fontSize: 11, color: cfg.accent, fontWeight: '800' }}>+{displayMerit}</Text>
                          <Text style={{ fontSize: 8, color: `${cfg.accent}80` }}>政绩×1.8</Text>
                        </View>
                      </View>
                      {/* 效果标签 */}
                      <View style={{ padding: 12, gap: 10 }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {action.effects.map(e => (
                            <View key={e.key} style={{ backgroundColor: cfg.tagBg, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: cfg.tagBorder }}>
                              <Text style={{ fontSize: 10, color: cfg.tagText, fontWeight: '600' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                            </View>
                          ))}
                          <View style={{ backgroundColor: cfg.tagBg, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: cfg.tagBorder }}>
                            <Text style={{ fontSize: 10, color: `${cfg.accent}90` }}>费用 ¥{formatMoney(baseMin)}~¥{formatMoney(baseMax)}</Text>
                          </View>
                          <View style={{ backgroundColor: cfg.tagBg, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: cfg.tagBorder }}>
                            <Text style={{ fontSize: 10, color: `${cfg.accent}70` }}>
                              冷却 {(R15_COOLDOWNS[action.id] ?? 0) >= 365 ? `${Math.round((R15_COOLDOWNS[action.id] ?? 0) / 365)}年` : `${Math.round((R15_COOLDOWNS[action.id] ?? 0) / 30)}个月`}
                            </Text>
                          </View>
                        </View>
                        <Pressable
                          onPress={() => void handleAction(action)}
                          disabled={!canAct || acting || isCooling}
                          android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                          style={{ backgroundColor: (!canAct || isCooling) ? `${cfg.headerBg}80` : cfg.headerBg, paddingVertical: 13, alignItems: 'center' }}
                        >
                          <Text style={{ color: (!canAct || isCooling) ? '#666' : cfg.accent, fontWeight: '800', fontSize: 13, letterSpacing: 1 }}>
                            {acting ? '执行中…' : isCooling ? `⏳ 冷却中（${cdMonths}个月后）` : !canAct ? '⚠️ 经费不足' : `⭐ 行使${cfg.title.slice(2, 6).trim()}专属职权（政绩×1.8）`}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* 述职报告部署 */}
        {tab === 'debrief' && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 统计局说明栏 */}
            <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
              <Text style={{ color: 'rgba(180,210,255,0.7)', fontSize: 9, letterSpacing: 2 }}>联邦内阁 · 述职报告管理</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>📋 年度述职报告部署</Text>
              <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                国家统计局根据各部委及省级KPI完成情况自动汇总。向各单位下达述职任务，审核报告并决定奖励或约谈。
              </Text>
            </View>

            {/* 统计摘要 */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '待下达', val: debriefTasks.filter(t => t.status === 'pending').length,    color: '#888' },
                { label: '已提交', val: debriefTasks.filter(t => t.status === 'submitted').length,  color: '#7B5E2A' },
                { label: '通过',   val: debriefTasks.filter(t => t.status === 'passed').length,     color: '#2a7a3b' },
                { label: '不达标', val: debriefTasks.filter(t => t.status === 'failed').length,     color: '#C82829' },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.val}</Text>
                  <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* 单位列表 */}
            {debriefTasks.map(task => {
              const statusConfig = {
                pending:   { label: '待下达', color: '#888',    bg: '#F5F5F5' },
                submitted: { label: '已提交', color: '#7B5E2A', bg: '#FFFBF0' },
                passed:    { label: '已通过', color: '#2a7a3b', bg: '#F0FAF0' },
                failed:    { label: '不达标', color: '#C82829', bg: '#FFF5F5' },
              }[task.status];

              return (
                <View key={task.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', overflow: 'hidden' }}>
                  <View style={{ padding: 12, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: task.type === '部委' ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{task.type}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{task.unit}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#555', marginTop: 4, lineHeight: 16 }}>{task.topic}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#2B4B6F' }}>目标：{task.kpiTarget}</Text>
                          </View>
                          <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A' }}>截止：{task.deadline}</Text>
                          </View>
                          {task.score !== undefined && (
                            <View style={{ backgroundColor: statusConfig.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: statusConfig.color, fontWeight: '700' }}>得分：{task.score}分</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ backgroundColor: statusConfig.bg, borderWidth: 1, borderColor: statusConfig.color, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: statusConfig.color, fontWeight: '700' }}>{statusConfig.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                    {task.status === 'pending' && (
                      <Pressable
                        onPress={() => handleDebriefAction(task, 'issue')}
                        disabled={debriefActing === task.id}
                        style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2B4B6F' }}
                      >
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📤 下达述职任务</Text>
                      </Pressable>
                    )}
                    {task.status === 'submitted' && (
                      <>
                        <Pressable
                          onPress={() => handleDebriefAction(task, 'pass')}
                          disabled={debriefActing === task.id}
                          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2a7a3b' }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>✅ 批复通过</Text>
                        </Pressable>
                        <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
                        <Pressable
                          onPress={() => handleDebriefAction(task, 'fail')}
                          disabled={debriefActing === task.id}
                          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#8B0000' }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>⚠️ 约谈整改</Text>
                        </Pressable>
                      </>
                    )}
                    {(task.status === 'passed' || task.status === 'failed') && (
                      <View style={{ flex: 1 }}>
                        <View style={{ paddingVertical: 9, alignItems: 'center', backgroundColor: statusConfig.bg }}>
                          <Text style={{ fontSize: 10, color: statusConfig.color, fontWeight: '700' }}>
                            {task.status === 'passed' ? '✅ 审核完毕，已归档' : '⚠️ 整改通知已下发'}
                          </Text>
                        </View>
                        {/* 整改结果展示 */}
                        {task.status === 'failed' && reformResults[task.id] && (
                          <View style={{ backgroundColor: '#FFFBF0', borderTopWidth: 1, borderTopColor: '#F5DCB0', padding: 10 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '700', marginBottom: 3 }}>📑 整改落实情况</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{reformResults[task.id]}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* 开启新一轮 */}
            <Pressable
              onPress={handleDebriefReset}
              style={{ backgroundColor: '#2B4B6F', paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 开启新一轮述职周期</Text>
            </Pressable>
          </View>
        )}

        {/* KPI 述职排名 */}
        {tab === 'kpi' && (
          <View style={{ padding: 14, gap: 12 }}>
            <View style={{ backgroundColor: '#3D0808', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 9, letterSpacing: 2 }}>国家统计局 · KPI考评系统</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>📊 年度述职排名与考评</Text>
              <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                依据政绩积分（40%）+ 廉洁指数（30%）+ 忠诚（15%）+ 能力（15%）自动排名。三年连续末位可撤职。
              </Text>
            </View>

            {kpiLoading ? (
              <View style={{ alignItems: 'center', padding: 24 }}><ActivityIndicator color="#8B1A1A" /></View>
            ) : rankedSubs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: '#888', fontSize: 14 }}>暂无下属数据</Text>
              </View>
            ) : (
              rankedSubs.map((sub, idx) => {
                const score = calcKpiScore(sub);
                const isBottom = idx >= rankedSubs.length - Math.max(1, Math.floor(rankedSubs.length * 0.2));
                const isDismissed = dismissed.has(sub.id);
                const kpiGrade = score >= 70 ? '优秀' : score >= 50 ? '良好' : score >= 35 ? '合格' : '不合格';
                const gradeColor = score >= 70 ? '#2a7a3b' : score >= 50 ? '#7B5E2A' : score >= 35 ? '#C82829' : '#8B0000';

                return (
                  <View key={sub.id} style={{ backgroundColor: isDismissed ? '#F0F0F0' : '#fff', borderWidth: 1, borderColor: isBottom && !isDismissed ? '#C82829' : '#DDD', overflow: 'hidden', opacity: isDismissed ? 0.5 : 1 }}>
                    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {/* 排名 */}
                      <View style={{ width: 28, height: 28, backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#F0F0F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: idx < 3 ? '#fff' : '#888' }}>
                          {isDismissed ? '📤' : idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDismissed ? '#aaa' : '#222' }}>{sub.name}</Text>
                          <View style={{ backgroundColor: gradeColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{isDismissed ? '已撤职' : kpiGrade}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{sub.position} · KPI分：{score.toFixed(1)}</Text>
                        <View style={{ height: 4, backgroundColor: '#EEE', borderRadius: 2, marginTop: 5 }}>
                          <View style={{ width: `${Math.min(100, score)}%`, height: 4, backgroundColor: gradeColor, borderRadius: 2 }} />
                        </View>
                      </View>
                    </View>

                    {/* 奖励谈话 or 撤职按钮 */}
                    {!isDismissed && (
                      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                        {idx === 0 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#F0FAF0' }}>
                            <Text style={{ fontSize: 11, color: '#2a7a3b', fontWeight: '600' }}>🏆 排名第一 · 已谈话嘉奖</Text>
                          </View>
                        )}
                        {isBottom && currentYear - (save.kpiRankingYear ?? 0) >= 3 && (
                          <Pressable
                            onPress={() => handleDismiss(sub)}
                            disabled={acting}
                            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#8B0000' }}
                          >
                            <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📉 KPI三年不达标 · 撤职</Text>
                          </Pressable>
                        )}
                        {!isBottom && idx !== 0 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#888' }}>暂无处置</Text>
                          </View>
                        )}
                        {isBottom && currentYear - (save.kpiRankingYear ?? 0) < 3 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FFF5F5' }}>
                            <Text style={{ fontSize: 10, color: '#C82829' }}>末位警示（{3 - (currentYear - (save.kpiRankingYear ?? 0))}年后可撤职）</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* 当年KPI更新按钮 */}
            <Pressable
              onPress={async () => {
                await updateGameSave({ kpiRankingYear: currentYear, kpiRankingResult: `第${currentYear}年度考评完成` });
                setResult('📊 KPI年度考评已更新');
                setTimeout(() => setResult(''), 2500);
              }}
              style={{ backgroundColor: '#3D0808', paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 刷新年度KPI排名</Text>
            </Pressable>
          </View>
        )}

        {/* ── 特批晋升/调任 ── */}
        {tab === 'promote' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#3D0808', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 9, letterSpacing: 2 }}>联邦内阁 · 特批人事权</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🚀 特批晋升 / 调任岗位</Text>
              <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                总理可对总理以下任何岗位行使特批晋升或调任权。审批须消耗相应政绩，批准后自动生效并获得政绩奖励。
              </Text>
            </View>
            {/* 政绩余额 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#555' }}>当前政绩余额</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#3D0808' }}>{save?.meritPoints.toFixed(0) ?? 0} 分</Text>
            </View>
            {/* 按职级分组展示岗位 */}
            {[13, 12, 11, 10].map(level => {
              const levelPosts = SPECIAL_POSTS.filter(p => p.level === level);
              if (levelPosts.length === 0) return null;
              const levelNames: Record<number, string> = { 13: '副国级（副总理）', 12: '正部级（部长/省长）', 11: '副部级（省执政委书记）', 10: '副部级' };
              return (
                <View key={level}>
                  <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#3D0808' }}>
                    <Text style={{ fontSize: 10, color: '#3D0808', fontWeight: '700', letterSpacing: 1 }}>{levelNames[level]}</Text>
                  </View>
                  {levelPosts.map(post => {
                    const approved = approvedPosts.has(post.id);
                    const canApprove = (save?.meritPoints ?? 0) >= post.cost && !approved;
                    return (
                      <View key={post.id} style={{ backgroundColor: approved ? '#F0FAF0' : '#fff', borderWidth: 1, borderColor: approved ? '#2a7a3b' : '#DDD', marginBottom: 8, overflow: 'hidden' }}>
                        <View style={{ padding: 12, gap: 5 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: post.type === '晋升' ? '#C82829' : '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{post.type}</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{post.title}</Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{post.org} · {post.levelName}</Text>
                              <Text style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 15 }}>{post.desc}</Text>
                            </View>
                            {approved && (
                              <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已批准</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                            <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#7B5E2A' }}>消耗 {post.cost} 政绩</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0F8F0', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#2a7a3b' }}>奖励 +{post.meritReward} 政绩</Text>
                            </View>
                          </View>
                        </View>
                        {!approved && (
                          <Pressable
                            onPress={() => void handleSpecialApprove(post)}
                            disabled={!canApprove || acting}
                            style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canApprove ? '#3D0808' : '#CCC' }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                              {acting ? '审批中…' : canApprove ? `▶ 批准${post.type}（消耗${post.cost}政绩）` : '政绩不足'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        )}

        {/* ── 专线电话 ── */}
        {tab === 'hotline' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
              <Text style={{ color: 'rgba(160,200,255,0.7)', fontSize: 9, letterSpacing: 2 }}>联邦内阁 · 专线通讯</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>☎️ 专线电话传达任务</Text>
              <Text style={{ color: 'rgba(160,200,255,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                通过专线向联邦副总统、内阁部长及省执政委书记传达工作任务，强化执行力，快速推动政策落地。
              </Text>
            </View>

            {/* 联系人筛选 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['全部', '副总理', '部长', '省执政委书记'] as const).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setHotlineFilter(f)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: hotlineFilter === f ? '#1D3B5E' : '#E8EEF5' }}
                  >
                    <Text style={{ fontSize: 11, color: hotlineFilter === f ? '#fff' : '#555', fontWeight: hotlineFilter === f ? '700' : '400' }}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* 联系人选择 */}
            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1 }}>① 选择联系人</Text>
            {hotlineTargets
              .filter(t => {
                if (hotlineFilter === '副总理') return t.level === 13;
                if (hotlineFilter === '部长') return t.level === 12;
                if (hotlineFilter === '省执政委书记') return t.level === 11;
                return true;
              })
              .map(target => {
                const isSelected = hotlineTarget?.id === target.id;
                return (
                  <Pressable
                    key={target.id}
                    onPress={() => setHotlineTarget(isSelected ? null : target)}
                    style={{ backgroundColor: isSelected ? '#1D3B5E' : '#fff', borderWidth: 1, borderColor: isSelected ? '#1D3B5E' : '#DDD', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ fontSize: 18 }}>{target.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#111' }}>{target.name}</Text>
                      <Text style={{ fontSize: 10, color: isSelected ? 'rgba(200,220,255,0.8)' : '#888' }}>{target.title} · {target.org}</Text>
                    </View>
                    {isSelected && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓ 已选</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            }

            {/* 任务选择 */}
            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, marginTop: 4 }}>② 选择传达任务</Text>
            {HOTLINE_TASKS.map(task => {
              const isSelected = hotlineTask?.id === task.id;
              return (
                <Pressable
                  key={task.id}
                  onPress={() => setHotlineTask(isSelected ? null : task)}
                  style={{ backgroundColor: isSelected ? '#C82829' : '#fff', borderWidth: 1, borderColor: isSelected ? '#C82829' : '#DDD', padding: 10, gap: 3 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#111' }}>{task.label}</Text>
                    <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,200,200,0.9)' : '#2a7a3b', fontWeight: '700' }}>+{task.meritReward}政绩</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,220,220,0.9)' : '#888' }}>{task.desc}</Text>
                </Pressable>
              );
            })}

            {/* 发起专线 */}
            <Pressable
              onPress={() => void handleHotlineSend()}
              disabled={!hotlineTarget || !hotlineTask || acting}
              style={{ backgroundColor: hotlineTarget && hotlineTask ? '#1D3B5E' : '#CCC', paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {acting ? '传达中…' : hotlineTarget && hotlineTask ? `☎️ 向${hotlineTarget.name}传达「${hotlineTask.label}」` : '请选择联系人和任务'}
              </Text>
            </Pressable>

            {/* 已传达记录 */}
            {hotlineSent.size > 0 && (
              <View style={{ backgroundColor: '#F0F4F8', padding: 10, gap: 4 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', marginBottom: 4 }}>✅ 本轮已传达记录（{hotlineSent.size}条）</Text>
                {Array.from(hotlineSent).map(k => {
                  const [tid, taskId] = k.split('_');
                  const t = hotlineTargets.find(x => x.id === tid);
                  const tk = HOTLINE_TASKS.find(x => x.id === taskId);
                  if (!t || !tk) return null;
                  return (
                    <Text key={k} style={{ fontSize: 10, color: '#555' }}>• {t.title}{t.name} ← {tk.label}</Text>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1A0A2E', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
