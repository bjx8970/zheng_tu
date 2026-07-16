import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useGame } from '@/ctx/GameContext';
import type { DebriefResultEvent, SecAutoGovEvent, DeptMonthlyEvent, EventChoice } from '@/ctx/GameContext';
import type { UpperInspectEvent } from '@/ctx/GameContext';
import { getBossTasks, getPoliceCases, deleteSave, resolveSubVisit, getAllReports, markReportsRead, updateSave, getPlayerPartySchoolCerts, getOrCreateFinance, listSaveSlots, writeSaveSlot, loadSaveSlot, deleteSaveSlot } from '@/db/gameApi';
import type { SaveSlotInfo } from '@/db/gameApi';
import { gameDaysToDate, RANK_CONFIG, getAvatarEmoji, getAvatarBgColor, getDeptNameByRank, CONCURRENT_POST_CONFIG, getAvailableConcurrentPosts, MINISTRY_POOL, formatMoney, estimateNationalGdp, getRetirementConfig, checkRetirementStatus, getRequiredPartySchoolLevel, PARTY_SCHOOL_CONFIG, INVEST_TEMPLATES, getPostLocation, getDepartmentForPlayer } from '@/types/game';
import type { InvestmentRecord } from '@/types/game';
import { getLineRankTitle, type CareerLineName } from '@/lib/lineRankTitles';
import { StatBar } from '@/components/StatBar';
import { NavCard } from '@/components/NavCard';
import { RetirementModal } from '@/components/RetirementModal';
import { RenewalVoteModal } from '@/components/RenewalVoteModal';
import { DisciplineWarnModal } from '@/components/DisciplineWarnModal';
import { BossChangeModal } from '@/components/BossChangeModal';
import BriberyEventModal from '@/components/BriberyEventModal';
import { SecretaryReleaseModal } from '@/components/SecretaryReleaseModal';
import { SecretarySelectModal } from '@/components/SecretarySelectModal';
import { PromotionReadyModal } from '@/components/PromotionReadyModal';
import { LateralTransferModal } from '@/components/LateralTransferModal';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import { computeKpi, getKpiPanel, getPromotionSummary, getDeptKpiResult } from '@/lib/kpiEngine';
import { LINE_ICON, getLineBaseColor } from '@/lib/lineTheme';
import type { CareerLine } from '@/lib/lineGameplay';
import type { KpiResult, DeptKpiResult } from '@/lib/kpiEngine';

const GRADE_COLOR: Record<string, string> = {
  '优秀': '#2a7a3b',
  '良好': '#2B4B6F',
  '合格': '#888',
  '不合格': '#C82829',
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, timeGranularity, isRunning, setTimeGranularity, setIsRunning, advanceTime, refreshSave, unreadReports, clearUnreadReports, exchangeOfficer, upperInspectEvent, clearUpperInspectEvent, meetingTaskFeedback, clearMeetingTaskFeedback, retirementTrigger, clearRetirementTrigger, renewalVoteTrigger, clearRenewalVoteTrigger, bossChangeEvent, clearBossChangeEvent, disciplineWarnEvent, clearDisciplineWarnEvent, lineKpiWarnEvent, clearLineKpiWarnEvent, gameOverTrigger, updateGameSave, promotionReadyTrigger, clearPromotionReadyTrigger, lateralTransferTrigger, clearLateralTransferTrigger, secretaryReleaseTrigger, clearSecretaryReleaseTrigger, secretarySelectTrigger, clearSecretarySelectTrigger, debriefResultTrigger, clearDebriefResultTrigger, secAutoGovTrigger, clearSecAutoGovTrigger, deptMonthlyEvent, clearDeptMonthlyEvent, speedMultiplier, setSpeedMultiplier, isOffline } = useGame();

  // ── 主页滚动位置保持（进入子页面再返回时不跳顶）──────────────────────────
  const scrollRef = useRef<import('react-native').ScrollView>(null);
  const savedScrollY = useRef(0);
  const [pendingTaskCount, setPendingTaskCount] = useState(0);
  const [pendingCaseCount, setPendingCaseCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingArchive, setDeletingArchive] = useState(false);
  // 管理员标记
  const [isAdmin, setIsAdmin] = useState(false);
  // 下属拜访弹窗
  const [visitModal, setVisitModal] = useState(false);
  // 月度报告弹窗
  const [showReportModal, setShowReportModal] = useState(false);
  // 头像弹窗（点击头像触发）
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  // 仕途总结 + 重开确认弹窗
  const [showRestartSummary, setShowRestartSummary] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);
  // 兑换码
  const [redeemCode, setRedeemCode] = useState('');
  const [redeemMsg, setRedeemMsg] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  // 全国性舆情事件弹窗：save.pendingOpinionEvent 有值时展示，关闭时清空
  const [showOpinionEvent, setShowOpinionEvent] = useState(false);
  const opinionEventShownRef = useRef(false);
  // 党校证书缓存（用于晋升条件面板）
  const [playerCerts, setPlayerCerts] = useState<string[]>([]);
  // 攻略卡片展开/收缩（默认收起）
  const [guideExpanded, setGuideExpanded] = useState(false);
  // 多存档系统
  const [saveSlots, setSaveSlots] = useState<SaveSlotInfo[]>([]);
  const [saveSlotsLoading, setSaveSlotsLoading] = useState(false);
  const [slotOpLoading, setSlotOpLoading] = useState<number | null>(null); // 正在操作的槽位号
  const [slotMsg, setSlotMsg] = useState('');
  const [loadConfirmSlot, setLoadConfirmSlot] = useState<number | null>(null); // 等待确认的载入槽位
  // 存档重命名弹窗
  const [renamingSlot, setRenamingSlot] = useState<number | null>(null); // 正在重命名的槽位号
  const [renameText, setRenameText] = useState('');

  const [showNetworkModal, setShowNetworkModal] = useState(false); // 人脉值说明弹窗

  // 升级解锁弹窗
  const [unlockModal, setUnlockModal] = useState<{ features: { icon: string; label: string; desc: string }[] } | null>(null);

  // 全部功能解锁表（rankLevel → 解锁列表）
  const RANK_UNLOCK_FEATURES: Record<number, { icon: string; label: string; desc: string }[]> = {
    2:  [{ icon: '📋', label: '干部选拔',       desc: '可查看并推荐辖区干部候选人' },
         { icon: '📊', label: '工作报告',        desc: '开始接收月度工作绩效报告' },
         { icon: '🏗️', label: '城市建设',        desc: '解锁基建项目投资功能' },
         { icon: '📬', label: '社会工作（团派）', desc: '团派线专属社会工作台解锁' }],
    3:  [{ icon: '🎖️', label: '干部提拔',        desc: '可主动推荐干部晋升职位' },
         { icon: '🛡️', label: '廉政建设',         desc: '纪检线廉政风险建设面板' },
         { icon: '🎓', label: '人才培养（团派）', desc: '团派线人才培养系统解锁' },
         { icon: '📝', label: '月度会议',         desc: '可召开月度工作例会' }],
    4:  [{ icon: '📬', label: '举报受理',         desc: '纪检线专属举报线索处理' },
         { icon: '🏦', label: '城市金融',          desc: '贷款、投资等金融工具解锁' },
         { icon: '🤝', label: '派系关系',          desc: '可主动维护和影响各派系关系' }],
    5:  [{ icon: '🔨', label: '专项整治',         desc: '发起辖区专项违规整治行动' },
         { icon: '🗺️', label: '管辖区域',          desc: '查看并管理下辖区域发展状况' }],
    6:  [{ icon: '🏙️', label: '城市规划',         desc: '启动大型城市发展规划项目' },
         { icon: '💰', label: '财政管理',          desc: '掌管辖区财政预算与专项资金' }],
    7:  [{ icon: '⚔️', label: '路线斗争（党委）', desc: '党委线：参与高层路线选择博弈' }],
    8:  [{ icon: '🔄', label: '干部交流任职',     desc: '接受或婉拒跨区域干部挂职' }],
    9:  [{ icon: '🌐', label: '人脉资本',          desc: '人脉值体系完全激活，影响晋升成功率' }],
    10: [{ icon: '🔍', label: '巡视组派驻（党委）',desc: '党委线：向下级派驻巡视组博弈' },
         { icon: '📢', label: '意识形态宣传战（党委）', desc: '党委线：发表讲话影响派系舆论走向' },
         { icon: '🎓', label: '党校培训体系（党委）', desc: '党委线：送接班人赴党校进修' },
         { icon: '🏛️', label: '代会提名',          desc: '参与全国人大代表换届提名' }],
    11: [{ icon: '🏛️', label: '党代会战略部署（党委）', desc: '党委线最高权力：选定10年执政主轴' },
         { icon: '⚖️', label: '党纪执行连锁（党委）',  desc: '党委线：问责官员引发政治格局重组' },
         { icon: '🏅', label: '政治局扩大会议（党委）', desc: '党委线：每季度选3议题上会' },
         { icon: '🏛️', label: '全国人大', desc: '省级以上职权：参与最高立法机构事务' }],
    12: [{ icon: '📌', label: '省份管理',          desc: '部级以上：统筹管理全国各省工作' },
         { icon: '🔬', label: '科技委',             desc: '主导全国科技创新战略方向' },
         { icon: '⚖️', label: '军事委员会',        desc: '部级以上：参与军队政策决策' }],
    13: [{ icon: '🌍', label: '外交出访',           desc: '副国级：主导国家外交议题' },
         { icon: '📊', label: '国家建设',            desc: '统筹全国基础设施与经济体系建设' }],
    14: [{ icon: '⭐', label: '执政党主席职权',     desc: '最高领导人：掌握全国最高施政权力' }],
  };

  const [runningInvestments, setRunningInvestments] = useState<InvestmentRecord[]>([]);
  useFocusEffect(
    useCallback(() => {
      refreshSave();
      // 加载招商引资进行中项目（rank4+）
      if (save && save.rankLevel >= 4) {
        void getOrCreateFinance(save.id, save.userId).then(f => {
          setRunningInvestments((f?.investments ?? []).filter(i => i.status === 'running'));
        });
      }
    }, [refreshSave, save?.id, save?.userId, save?.rankLevel])
  );

  // Game Over 跳转：触发时暂停时间并导航到结局页
  useEffect(() => {
    if (gameOverTrigger) {
      setIsRunning(false);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace({ pathname: '/(app)/game-over' as any, params: { type: gameOverTrigger } });
    }
  }, [gameOverTrigger, setIsRunning, router]);

  useEffect(() => {
    if (!save) return;
    getBossTasks(save.id).then(tasks => {
      setPendingTaskCount(tasks.filter(t => t.status === 'active').length);
    });
    getPoliceCases(save.id).then(cases => {
      setPendingCaseCount(cases.filter(c => c.status === 'pending').length);
    });
    // 加载党校证书列表（用于晋升条件面板展示）
    getPlayerPartySchoolCerts(save.id).then(certs => setPlayerCerts(certs));
    // 若有下属拜访待处理则弹出
    if (save.subVisitPending) {
      setVisitModal(true);
    }
    // 检查当前登录用户是否为管理员
    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email) {
          const username = user.email.replace('@miaoda.com', '');
          const { data } = await supabase.from('admin_users').select('username').eq('username', username).maybeSingle();
          setIsAdmin(!!data);
        }
      } catch {}
    })();
  }, [save]);

  // 全国性舆情事件弹窗：save 首次含 pendingOpinionEvent 时触发一次
  useEffect(() => {
    if (save?.pendingOpinionEvent && !opinionEventShownRef.current) {
      opinionEventShownRef.current = true;
      setShowOpinionEvent(true);
    }
  }, [save?.pendingOpinionEvent]);

  // 升级解锁弹窗：rankLevel 超过上次通知等级时触发
  useEffect(() => {
    if (!save) return;
    const notified = save.rankUnlockNotifiedLevel ?? 0;
    if (save.rankLevel > notified) {
      const newly: { icon: string; label: string; desc: string }[] = [];
      for (let lvl = notified + 1; lvl <= save.rankLevel; lvl++) {
        const feats = RANK_UNLOCK_FEATURES[lvl];
        if (feats) newly.push(...feats);
      }
      if (newly.length > 0) {
        setUnlockModal({ features: newly });
        void updateGameSave({ rankUnlockNotifiedLevel: save.rankLevel });
      }
    }
  // RANK_UNLOCK_FEATURES 是静态常量，无需放入 deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save?.rankLevel]);

  // 恩师触发：rank<7 且无恩师时，每次升级有10%概率遇见部级以上领导
  useEffect(() => {
    if (!save) return;
    if (save.mentorName) return; // 已有恩师
    if (save.rankLevel >= 7) return; // 已过市级任职窗口
    if (save.rankLevel < 1) return;
    if (Math.random() > 0.10) return; // 10% 概率
    const MENTOR_NPCS_LOCAL = [
      { name: '魏国栋', rank: 12, faction: '实干派' },
      { name: '林泰平', rank: 12, faction: '改革派' },
      { name: '钟汉民', rank: 13, faction: '实干派' },
      { name: '赵远山', rank: 12, faction: '改革派' },
      { name: '方鸿才', rank: 13, faction: '实干派' },
    ];
    const npc = MENTOR_NPCS_LOCAL[Math.floor(Math.random() * MENTOR_NPCS_LOCAL.length)];
    void updateGameSave({
      mentorName: npc.name,
      mentorRankLevel: npc.rank,
      mentorFaction: npc.faction,
      mentorAcquiredDay: save.gameDays,
      mentorPromoted: false,
      mentorRelation: 20,
      mentorLastContactDay: 0,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save?.rankLevel]);

  // 恩师晋升：玩家升至 rank≥10 且恩师未晋升时自动触发
  useEffect(() => {
    if (!save) return;
    if (!save.mentorName) return;
    if (save.mentorPromoted) return;
    if (save.rankLevel < 10) return;
    void updateGameSave({
      mentorRankLevel: Math.min(14, save.mentorRankLevel + 1),
      mentorPromoted: true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save?.rankLevel]);

  const handleDismissOpinionEvent = async () => {
    setShowOpinionEvent(false);
    opinionEventShownRef.current = false;
    if (save) {
      await updateGameSave({ pendingOpinionEvent: null });
    }
  };

  const handleLogout = async () => {
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  const handleDeleteSave = async () => {
    if (!save) return;
    setDeletingArchive(true);
    await deleteSave(save.id);
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  // 重开仕途：删除存档后不登出，刷新 save 创建新存档 → 自动跳转干部履历登记表
  const handleRestartGame = async () => {
    if (!save) return;
    setRestartLoading(true);
    setIsRunning(false);
    await deleteSave(save.id);
    // 不登出，直接刷新 — getOrCreateSave 会为当前用户生成新存档（needsCharacterCreation=true）
    await refreshSave();
    setShowRestartSummary(false);
    setShowAvatarModal(false);
    setRestartLoading(false);
    // home.tsx 检测到 needsCharacterCreation 自动跳 character-create
  };

  /** 打开头像弹窗时刷新存档槽列表 */
  const openAvatarModal = () => {
    setShowAvatarModal(true);
    setSlotMsg('');
    setLoadConfirmSlot(null);
    setSaveSlotsLoading(true);
    listSaveSlots().then(slots => {
      setSaveSlots(slots);
      setSaveSlotsLoading(false);
    });
  };

  /** 手动保存到指定槽位 */
  const handleWriteSlot = async (slotNum: 1 | 2 | 3) => {
    if (!save || slotOpLoading !== null) return;
    setSlotOpLoading(slotNum);
    setSlotMsg('');
    const label = `${save.rankName}·${save.cityName}（第${Math.floor(save.gameDays / 365) + 1}年）`;
    const ok = await writeSaveSlot(save.id, slotNum, label);
    if (ok) {
      const fresh = await listSaveSlots();
      setSaveSlots(fresh);
      setSlotMsg(`✅ 已存入槽位 ${slotNum}`);
    } else {
      setSlotMsg('❌ 存档失败，请重试');
    }
    setSlotOpLoading(null);
    setTimeout(() => setSlotMsg(''), 2500);
  };

  /** 重命名存档槽位 */
  const handleRenameSlot = async (slotNum: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) { setRenamingSlot(null); return; }
    const slot = saveSlots.find(s => s.slotNumber === slotNum);
    if (!slot) { setRenamingSlot(null); return; }
    // 复用 writeSaveSlot 的 slotName 字段：只更新名称，用已有快照（重写当前存档内容不变）
    const { updateSaveSlotName } = await import('@/db/gameApi');
    const ok = await updateSaveSlotName(slot.id, trimmed);
    if (ok) {
      const fresh = await listSaveSlots();
      setSaveSlots(fresh);
      setSlotMsg('✅ 命名已更新');
    } else {
      setSlotMsg('❌ 更新失败');
    }
    setRenamingSlot(null);
    setRenameText('');
    setTimeout(() => setSlotMsg(''), 2000);
  };

  /** 从指定槽位载入（两步确认） */
  const handleLoadSlot = async (slotNum: 1 | 2 | 3) => {
    if (!save || slotOpLoading !== null) return;
    if (loadConfirmSlot !== slotNum) {
      setLoadConfirmSlot(slotNum);
      setSlotMsg('⚠️ 再次点击确认载入（当前进度将被覆盖）');
      return;
    }
    setSlotOpLoading(slotNum);
    setSlotMsg('');
    setLoadConfirmSlot(null);
    const loaded = await loadSaveSlot(save.id, slotNum);
    if (loaded) {
      await refreshSave();
      setSlotMsg('✅ 存档已载入');
      setShowAvatarModal(false);
    } else {
      setSlotMsg('❌ 载入失败，请重试');
    }
    setSlotOpLoading(null);
    setTimeout(() => setSlotMsg(''), 2500);
  };

  /** 删除指定槽位 */
  const handleDeleteSlot = async (slotNum: 1 | 2 | 3) => {
    if (slotOpLoading !== null) return;
    setSlotOpLoading(slotNum);
    await deleteSaveSlot(slotNum);
    const fresh = await listSaveSlots();
    setSaveSlots(fresh);
    setSlotMsg(`已清空槽位 ${slotNum}`);
    setSlotOpLoading(null);
    setTimeout(() => setSlotMsg(''), 2000);
  };

  const handleVisitResponse = async (accept: boolean) => {
    if (!save) return;
    await resolveSubVisit(save.id, save.subVisitSubId ?? '', accept);
    setVisitModal(false);
    await refreshSave();
  };

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#C82829" />
        <Text style={{ marginTop: 12, color: '#666', fontSize: 13 }}>正在加载存档...</Text>
      </View>
    );
  }

  // 新玩家未完成角色创建，强制跳转
  if (save.needsCharacterCreation) {
    router.replace('/(app)/character-create');
    return null;
  }

  const rankConfig = RANK_CONFIG[save.rankLevel] ?? RANK_CONFIG[1];
  // 任职年限要求（不再受优秀排名影响，固定为职级标准年限）
  const effectiveTenureRequired = rankConfig.requiredTenureYears;
  const tenureProgress = Math.min(100, (save.tenureYears / Math.max(1, effectiveTenureRequired)) * 100);
  const meritProgress = Math.min(100, (save.meritPoints / Math.max(1, rankConfig.requiredMerit)) * 100);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg    = getAvatarBgColor(save.avatarId, save.reformFaction >= save.pragmaticFaction ? 'reform' : 'pragmatic');

  // 任期倒计时预警：maxTenureYears 为最大届限，计算剩余游戏天数
  const maxTenureYears = save.maxTenureYears ?? effectiveTenureRequired * 2;
  const tenureDaysRemaining = Math.max(0, maxTenureYears * 365 - save.tenureDays);
  // ≤30天且未晋升且职级未达顶峰时触发倒计时预警横幅
  const showTenureCountdown = tenureDaysRemaining <= 30 && !save.isPromotionAvailable && (save.rankLevel ?? 1) < 12 && (save.sameLocTerms ?? 0) < 2;

  // 退休相关计算
  const retireCfg    = getRetirementConfig(save.rankLevel);
  const retireStatus = checkRetirementStatus(save.rankLevel, save.playerAge, save.retirementDelayYears ?? 0);
  // 有效退休年龄（正国家级显示自主退休年龄70岁；其余显示基准+延迟）
  const displayRetireAge = retireCfg.isVoluntaryAt !== null
    ? retireCfg.isVoluntaryAt
    : retireCfg.baseAge !== null
      ? retireCfg.baseAge + (save.retirementDelayYears ?? 0)
      : null;
  // 距退休不足1年才显示倒计时
  const showRetireWarning = retireStatus.type === 'approaching' && displayRetireAge !== null;

  // 头像下方地区路径（如汉东省·京岳市·某县），中央级别返回空字符串
  const postLocation = getPostLocation(save.rankLevel, save.cityName);

  // ── 管辖区域 ──
  const getJurisdiction = (): { label: string; type: string; typeColor: string } => {
    const rl = save.rankLevel;
    if (rl <= 3) return { label: save.cityName, type: '乡镇', typeColor: '#4a7c59' };
    if (rl <= 6) return { label: save.cityName, type: '县（区）', typeColor: '#2B4B6F' };
    if (rl <= 9) return { label: save.cityName, type: '地级市', typeColor: '#7B3F00' };
    if (rl <= 11) return { label: save.cityName, type: '省级行政区', typeColor: '#6B0F1A' };
    if (rl === 12) return { label: '全国（联邦内阁分管领域）', type: '国家级', typeColor: '#4B0082' };
    return { label: '全国（联邦内阁）', type: '国家级', typeColor: '#4B0082' };
  };
  const jurisdiction = getJurisdiction();

  // ── 分层级 KPI 考核面板 ─────────────────────────────────────────────────────
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
  };
  const kpiResult: KpiResult = computeKpi(kpiSnapshot);
  const kpiPanel = getKpiPanel(kpiSnapshot);
  const promotionSummaryText = getPromotionSummary(kpiResult, save.tenureYears, effectiveTenureRequired);

  // ── 非行政线：使用路线专属 KPI 维度 ──────────────────────────────────────
  const cpLineForKpi = (save.careerPathLine ?? '') as string;
  const lineKpiDeptKey =
    cpLineForKpi === '党务线' ? 'party' :
    cpLineForKpi === '纪检线' ? 'discipline_line' :
    cpLineForKpi === '团派线' ? 'league' : null;
  const lineKpiResult: DeptKpiResult | null = lineKpiDeptKey
    ? getDeptKpiResult(lineKpiDeptKey, kpiSnapshot)
    : null;

  // ── 线路专属职称（替代模板化 "xx线考核" 标题）─────────────────────────────
  const lineRankTitleObj = getLineRankTitle((save.careerPathLine ?? '行政线') as CareerLineName, save.rankLevel);
  const lineSpecificTitle = lineRankTitleObj.title;  // 如"县委常委（分管组织/宣传）"

  // ── 本月是否已施政（读取 DEPT_CD 中当月已有行动执行）─────────────────────
  const isMinistryLevel = save.rankLevel >= 12;
  const isPremierLevel  = save.rankLevel >= 14;
  const foundMinistry = isMinistryLevel ? MINISTRY_POOL.find(m => m.name === save.cityName) : null;
  const ministryFocus = foundMinistry?.focus ?? 'GDP经济';
  // 总理级：全国综合指数（0-100面板 → 展示为万亿/万亿换算后的500+分值）
  const nationalGdp        = Math.max(500, Math.round(save.cityGdp * 1.5 + 500));
  const nationalLivelihood = Math.max(500, Math.round(save.cityLivelihood * 1.4 + 520));
  const nationalEco        = Math.max(500, Math.round(save.cityEcology * 1.3 + 510));
  const nationalBusiness   = Math.max(500, Math.round(save.cityBusiness * 1.6 + 490));
  const getMinistryKpis = (focus: string) => {
    const base = { a: save.cityGdp, b: save.cityLivelihood, c: save.cityEcology, d: save.cityBusiness };
    const map: Record<string, { aLabel: string; bLabel: string; cLabel: string; dLabel: string }> = {
      'GDP经济':  { aLabel: '经济发展指数', bLabel: '财税收入指数', cLabel: '重大项目推进', dLabel: '区域协调发展' },
      '民生保障': { aLabel: '民生保障指数', bLabel: '教育医疗水平', cLabel: '社会保障覆盖', dLabel: '就业促进效果' },
      '生态文明': { aLabel: '生态保护指数', bLabel: '环境治理成效', cLabel: '资源节约利用', dLabel: '绿色发展水平' },
      '营商环境': { aLabel: '营商便利指数', bLabel: '市场准入水平', cLabel: '企业扶持成效', dLabel: '外资引进指数' },
      '社会治安': { aLabel: '社会治安指数', bLabel: '网络安全水平', cLabel: '执法规范程度', dLabel: '综合协作效能' },
      '外交事务': { aLabel: '双边关系指数', bLabel: '多边合作水平', cLabel: '国际形象建设', dLabel: '涉外事务处置' },
      '国家安全': { aLabel: '国家安全指数', bLabel: '情报研判水平', cLabel: '战略威慑能力', dLabel: '综合国防效能' },
    };
    const labels = map[focus] ?? map['GDP经济'];
    return [
      { label: labels.aLabel, value: base.a },
      { label: labels.bLabel, value: base.b },
      { label: labels.cLabel, value: base.c },
      { label: labels.dLabel, value: base.d },
    ];
  };
  const ministryKpis = getMinistryKpis(ministryFocus);

  // ── 中央线判断 ──
  const isCentralLine = save.careerLine === '中央';
  // 中央线四维KPI标签（对应 cityGdp/cityLivelihood/cityEcology/cityBusiness）
  const centralKpiLabels = isCentralLine && save.ministryName
    ? (() => {
        const m = MINISTRY_POOL.find(mm => mm.name === save.ministryName);
        const focus = m?.focus ?? 'GDP经济';
        const map: Record<string, [string, string, string, string]> = {
          'GDP经济':  ['政策落实率', '审批处理效率', '法规建设水平', '廉洁自律考评'],
          '民生保障': ['民生政策落实', '行政审批效率', '制度规范建设', '廉洁自律考评'],
          '生态文明': ['生态政策执行', '审批合规效率', '法规标准建设', '廉洁自律考评'],
          '营商环境': ['营商政策推进', '审批便利程度', '规章制度健全', '廉洁自律考评'],
          '社会治安': ['执法政策落实', '审批处置效率', '法规执行水平', '廉洁自律考评'],
          '外交事务': ['外交政策推进', '涉外审批效率', '条约规范建设', '廉洁自律考评'],
          '国家安全': ['安全政策落实', '保密审批效率', '规章制度建设', '廉洁自律考评'],
        };
        return map[focus] ?? map['GDP经济'];
      })()
    : null;

  const theme = getRankThemeWithLine(save.rankLevel, (save.careerPathLine as CareerLine | undefined));

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* ══ 离线保护提示条（网络不佳时显示）══ */}
      {isOffline && (
        <View style={{ backgroundColor: '#7B3F00', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 12, paddingTop: insets.top + 5 }}>
          <Text style={{ fontSize: 11, color: '#FFD580' }}>📶</Text>
          <Text style={{ fontSize: 11, color: '#FFD580', fontWeight: '600', letterSpacing: 0.3 }}>网络不佳 · 操作将在恢复后自动同步，请勿关闭游戏</Text>
        </View>
      )}

      {/* ══ 顶部导航栏 ══ */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 0 }}>
        <View style={{ height: theme.decorLineHeight, backgroundColor: theme.decorLine, marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 12 }}>
          {/* 头像 */}
          <Pressable
            onPress={() => openAvatarModal()}
            style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.decorLine, marginRight: 10 }}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 24 }}
          >
            <Text style={{ fontSize: 22 }}>{avatarEmoji}</Text>
          </Pressable>
          {/* 姓名 + 职务 */}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700' }}>{save.playerName}</Text>
              <Text style={{ color: theme.headerSub, fontSize: 10 }}>{save.playerGender} · {save.playerAge}岁</Text>
            </View>
            <Text style={{ color: theme.headerSub, fontSize: 10, marginTop: 2 }} numberOfLines={1}>
              {(() => {
                const line = save.careerPathLine ?? '行政线';
                const lineIconMap: Record<string, string> = { '行政线': '🏛️', '党务线': '🔴', '纪检线': '⚖️', '团派线': '🌱', '政法线': '🛡️' };
                const lineTag = `${lineIconMap[line] ?? '🏛️'}${line}`;
                const rankTitle = getLineRankTitle(line as CareerLineName, save.rankLevel).title;
                return `${lineTag} · ${rankTitle}${postLocation ? ' · ' + postLocation : ''}`;
              })()}
            </Text>
          </View>
          {/* 右侧：日期 + 操作 */}
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{gameDaysToDate(save.gameDays)}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowDeleteConfirm(true)}>
                <Text style={{ color: theme.headerSub, fontSize: 10, opacity: 0.65 }}>删除存档</Text>
              </Pressable>
              <Pressable onPress={handleLogout}>
                <Text style={{ color: theme.headerSub, fontSize: 10, opacity: 0.65 }}>退出</Text>
              </Pressable>
            </View>
          </View>
        </View>
        {/* ── 时间控制条（嵌入 header 底部）── */}
        <View style={{ flexDirection: 'row', gap: 0, marginBottom: 0, borderTopWidth: 1, borderTopColor: theme.decorLine, opacity: 1 }}>
          {(['天', '周', '月'] as const).map(g => (
            <Pressable
              key={g}
              onPress={() => setTimeGranularity(g)}
              style={{
                flex: 1, paddingVertical: 7, alignItems: 'center',
                backgroundColor: timeGranularity === g ? 'rgba(255,255,255,0.15)' : 'transparent',
                borderRightWidth: g !== '月' ? 1 : 0,
                borderRightColor: theme.decorLine,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: timeGranularity === g ? '700' : '400', color: timeGranularity === g ? theme.headerText : theme.headerSub }}>
                按{g}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => { void advanceTime(); }}
            style={{ flex: 2, paddingVertical: 7, alignItems: 'center', backgroundColor: theme.accentSub, borderLeftWidth: 1, borderLeftColor: theme.decorLine }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>▶ 推进</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              const autoUnlocked = (save?.kpiRankingResult ?? '').includes('|AUTO:1');
              if (!autoUnlocked) {
                // 未解锁：提示用户在头像面板输入兑换码
                openAvatarModal();
                return;
              }
              setIsRunning(!isRunning);
            }}
            style={{
              flex: 2, paddingVertical: 7, alignItems: 'center',
              backgroundColor: isRunning ? theme.primary : 'transparent',
              borderLeftWidth: 1, borderLeftColor: theme.decorLine,
            }}
          >
            <Text style={{ fontWeight: '700', fontSize: 12, color: isRunning ? theme.primaryText : theme.headerSub }}>
              {(() => {
                const autoUnlocked = (save?.kpiRankingResult ?? '').includes('|AUTO:1');
                if (!autoUnlocked) return '🔒 自动';
                return isRunning ? '⏸ 暂停' : '⏯ 自动';
              })()}
            </Text>
          </Pressable>
          {/* 速度档位：仅自动推进已解锁时显示 */}
          {(save?.kpiRankingResult ?? '').includes('|AUTO:1') && (
            <Pressable
              onPress={() => {
                const next = speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 4 : speedMultiplier === 4 ? 8 : 1;
                setSpeedMultiplier(next as 1 | 2 | 4 | 8);
              }}
              style={{
                paddingVertical: 7, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center',
                borderLeftWidth: 1, borderLeftColor: theme.decorLine,
                backgroundColor: speedMultiplier > 1 ? 'rgba(255,184,0,0.12)' : 'transparent',
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 11, color: speedMultiplier > 1 ? '#FFB800' : theme.headerSub }}>
                {speedMultiplier}x
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* ══ 届数预警横幅（sameLocTerms>=2 时全宽显示）══ */}
      {(save.sameLocTerms ?? 0) >= 2 && (save.rankLevel ?? 1) < 12 && (
        <Pressable
          onPress={() => router.push('/(app)/promotion')}
          style={{
            backgroundColor: '#7F1D1D',
            paddingVertical: 9,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 14 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FEF2F2', fontSize: 12, fontWeight: '700' }}>
              本地已任满 {save.sameLocTerms} 届，须晋升或平调
            </Text>
            <Text style={{ color: '#FCA5A5', fontSize: 10, marginTop: 1 }}>
              继续留任将影响仕途发展 · 点击查看晋升通道
            </Text>
          </View>
          <Text style={{ color: '#FCA5A5', fontSize: 16 }}>›</Text>
        </Pressable>
      )}
      {/* ══ 任期倒计时预警横幅（剩余≤30天且条件未达标时显示）══ */}
      {showTenureCountdown && (
        <Pressable
          onPress={() => router.push('/(app)/promotion')}
          style={{
            backgroundColor: '#78350F',
            paddingVertical: 9,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 14 }}>⏳</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FEF3C7', fontSize: 12, fontWeight: '700' }}>
              任期仅剩 {tenureDaysRemaining} 天，晋升条件尚未达标
            </Text>
            <Text style={{ color: '#FCD34D', fontSize: 10, marginTop: 1 }}>
              点击查看晋升所需条件，抓紧完成冲刺
            </Text>
          </View>
          <Text style={{ color: '#FCD34D', fontSize: 16 }}>›</Text>
        </Pressable>
      )}

      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 12, gap: 8 }}
        showsVerticalScrollIndicator={false}
        onScroll={e => { savedScrollY.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={100}
        onContentSizeChange={() => {
          // 等内容渲染完成后恢复位置
          if (savedScrollY.current > 0) {
            scrollRef.current?.scrollTo({ y: savedScrollY.current, animated: false });
          }
        }}
      >
        {/* ── 通知区域（只在有通知时显示）── */}
        {(save.isPromotionAvailable || save.isEventPending
          || ((save.lastRecruitQuarter ?? 0) < Math.floor(save.gameDays / 90) && Math.floor(save.gameDays / 90) > 0)
          || unreadReports.length > 0
          || (!!exchangeOfficer && save.rankLevel === 8)
        ) && (
          <View style={{ gap: 6 }}>
            {save.isPromotionAvailable && (
              <Pressable
                onPress={() => router.push('/(app)/promotion')}
                style={{ backgroundColor: theme.primary, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10, borderLeftWidth: 4, borderLeftColor: theme.accent }}
              >
                <Text style={{ fontSize: 16 }}>{theme.rankEmoji}</Text>
                <Text style={{ color: theme.primaryText, fontWeight: '700', fontSize: 13, flex: 1 }}>晋升条件已满足 — 点击申请 ›</Text>
              </Pressable>
            )}
            {save.isEventPending && (
              <Pressable
                onPress={() => router.push('/(app)/events')}
                style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.alertBorder, borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>⚠️</Text>
                <Text style={{ color: theme.alertText, fontWeight: '700', fontSize: 12, flex: 1 }}>有突发事件待处置，立即处理 ›</Text>
              </Pressable>
            )}
            {(save.lastRecruitQuarter ?? 0) < Math.floor(save.gameDays / 90) && Math.floor(save.gameDays / 90) > 0 && (
              <Pressable
                onPress={() => router.push('/(app)/recruit')}
                style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.decorLine, borderLeftWidth: 4, borderLeftColor: theme.accent, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>📢</Text>
                <Text style={{ color: theme.sectionHeaderText, fontWeight: '700', fontSize: 12, flex: 1 }}>本期可招募新干部 ›</Text>
              </Pressable>
            )}
            {unreadReports.length > 0 && (
              <Pressable
                onPress={() => setShowReportModal(true)}
                style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, borderLeftWidth: 4, borderLeftColor: theme.accentSub, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>📋</Text>
                <Text style={{ color: theme.sectionHeaderText, fontWeight: '700', fontSize: 12, flex: 1 }}>{unreadReports.length} 份工作报告待查阅 ›</Text>
              </Pressable>
            )}
            {exchangeOfficer && save.rankLevel === 8 && (
              <Pressable
                onPress={() => router.push('/(app)/exchange-officer' as never)}
                style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.alertBorder, borderLeftWidth: 4, paddingHorizontal: 12, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Text style={{ fontSize: 16 }}>🏛️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.alertText, fontWeight: '700', fontSize: 12 }}>干部交流任职通知</Text>
                  <Text style={{ color: theme.labelText, fontSize: 11, marginTop: 1 }}>{exchangeOfficer.fromCity} · {exchangeOfficer.name} 申请来访 ›</Text>
                </View>
                <View style={{ backgroundColor: theme.primary, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Text style={{ color: theme.primaryText, fontSize: 10, fontWeight: '700' }}>待处理</Text>
                </View>
              </Pressable>
            )}
          </View>
        )}

        {/* ── 全国GDP横幅（副总理以上 rank13+）── */}
        {save.rankLevel >= 13 && (
          <View style={{ backgroundColor: theme.quickStatBg, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 9, gap: 8, borderWidth: 1, borderColor: theme.accent }}>
            <Text style={{ fontSize: 15 }}>🌏</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.headerSub, fontSize: 9, letterSpacing: 1 }}>国家统计局 · 年度数据</Text>
              <Text style={{ color: theme.accent, fontWeight: '700', fontSize: 12, marginTop: 1 }}>
                全国GDP：¥{formatMoney(estimateNationalGdp(save.rankLevel, save.cityGdp))} 元
              </Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: theme.accent, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ color: theme.accent, fontSize: 10, fontWeight: '700' }}>经济指数 {save.cityGdp}</Text>
            </View>
          </View>
        )}

        {/* ══ 干部档案 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine }}>
          {/* 顶行：头衔 + 考核等级 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 }}>
              <Text style={{ fontSize: 12 }}>{theme.rankEmoji}</Text>
              <Text style={{ fontSize: 10, color: theme.sectionHeaderText, fontWeight: '700', letterSpacing: 1 }}>干部档案</Text>
              <Text style={{ fontSize: 10, color: theme.mutedText }}>·</Text>
              <Text style={{ fontSize: 10, color: theme.headerSub, letterSpacing: 0.5 }}>{theme.rankBanner}</Text>
            </View>
            <View style={{ borderWidth: 1, borderColor: GRADE_COLOR[save.assessmentGrade] ?? theme.mutedText, paddingHorizontal: 7, paddingVertical: 2 }}>
              <Text style={{ fontSize: 10, color: GRADE_COLOR[save.assessmentGrade] ?? theme.mutedText, fontWeight: '600' }}>考核 {save.assessmentGrade}</Text>
            </View>
          </View>

          {/* 主体：职务 + 六格状态 */}
          <View style={{ padding: 12, gap: 10 }}>
            {/* 职位信息行 — 根据路线+职级实时生成职务名称 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              {/* 路线标签 */}
              {(() => {
                const line = save.careerPathLine ?? '行政线';
                const lineColorMap: Record<string, string> = { '行政线': '#1E3A5F', '党务线': '#7F1D1D', '纪检线': '#1A3A1A', '团派线': '#1A2F1A', '政法线': '#1A1A3F' };
                const lineTextMap: Record<string, string> = { '行政线': '🏛️ 行政线', '党务线': '🔴 党务线', '纪检线': '⚖️ 纪检线', '团派线': '🌱 团派线', '政法线': '🛡️ 政法线' };
                return (
                  <View style={{ backgroundColor: lineColorMap[line] ?? '#1E3A5F', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '700' }}>{lineTextMap[line] ?? line}</Text>
                  </View>
                );
              })()}
              <View style={{ backgroundColor: theme.primary, paddingHorizontal: 7, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, color: theme.primaryText, fontWeight: '700' }}>
                  {getLineRankTitle((save.careerPathLine ?? '行政线') as CareerLineName, save.rankLevel).title}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: theme.sectionHeaderText, flex: 1 }} numberOfLines={1}>📍 {save.cityName}</Text>
              <Text style={{ fontSize: 11, color: theme.mutedText }} numberOfLines={1}>🎓 {save.school}</Text>
            </View>

            {/* 任职届数提示 */}
            {(save.rankLevel ?? 1) < 12 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
                <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 0.5 }}>本地任职</Text>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
                {(() => {
                  const terms = save.sameLocTerms ?? 0;
                  const maxTerms = 2;
                  const remaining = maxTerms - terms;
                  const danger = remaining <= 0;
                  return (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {[0, 1].map(i => (
                        <View key={i} style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i < terms ? (danger ? '#C82829' : theme.primary) : theme.cardBorder }} />
                      ))}
                      <Text style={{ fontSize: 9, color: danger ? '#C82829' : theme.mutedText, fontWeight: danger ? '700' : '400' }}>
                        {danger ? '⚠️ 已满2届，须晋升或平调' : `第${terms + 1}届 · 最多2届`}
                      </Text>
                    </View>
                  );
                })()}
              </View>
            )}

            {/* 所属机构行 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 0.5 }}>所属机构</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: theme.cardBorder }} />
              <Text style={{ fontSize: 10, color: theme.headerSub, fontWeight: '600' }} numberOfLines={1}>
                🏛️ {getDepartmentForPlayer(save.rankLevel, save.careerPath)}
              </Text>
            </View>

            {/* ── 四属性条（能力/健康/道德/政绩）── */}
            <View style={{ backgroundColor: theme.quickStatBg, borderRadius: 2, padding: 10, gap: 6 }}>
              <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: 1.5, marginBottom: 2 }}>干部综合素质</Text>
              {[
                {
                  label: '能力',
                  icon: '⚡',
                  value: save.abilityValue ?? 40,
                  color: '#60A5FA',
                  desc: save.abilityValue >= 90 ? '卓越' : save.abilityValue >= 70 ? '优秀' : save.abilityValue >= 50 ? '良好' : '一般',
                },
                {
                  label: '健康',
                  icon: '❤️',
                  value: save.healthValue ?? 100,
                  color: '#34D399',
                  desc: save.healthValue >= 80 ? '强健' : save.healthValue >= 60 ? '良好' : save.healthValue >= 40 ? '一般' : '虚弱',
                },
                {
                  label: '道德',
                  icon: '🌿',
                  value: save.moralValue,
                  color: save.moralValue >= 60 ? '#86EFAC' : save.moralValue >= 30 ? '#FCD34D' : '#F87171',
                  desc: save.moralValue >= 80 ? '廉洁' : save.moralValue >= 60 ? '正常' : save.moralValue >= 30 ? '偏低' : '危险',
                },
                {
                  label: '政绩',
                  icon: '📊',
                  value: Math.min(100, Math.floor((save.meritPoints / Math.max(1, save.requiredMerit ?? 100)) * 100)),
                  color: '#FCD34D',
                  desc: `${Math.floor(save.meritPoints)}/${save.requiredMerit ?? 100}`,
                },
              ].map(attr => (
                <View key={attr.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11, width: 14 }}>{attr.icon}</Text>
                  <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', width: 26, letterSpacing: 0.5 }}>{attr.label}</Text>
                  {/* 进度条 */}
                  <View style={{ flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${attr.value}%`, height: '100%', backgroundColor: attr.color, borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 9, color: attr.color, fontWeight: '700', width: 38, textAlign: 'right' }}>{attr.desc}</Text>
                </View>
              ))}
            </View>

            {/* 六格状态网格 2×3 */}
            <View style={{ flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: theme.cardBorder }}>
              {(() => {
                // 偶数格 = cardBg（浅色背景），奇数格 = quickStatBg（深色背景）
                // lightColor：浅背景下的数字颜色（需深色保证对比度）
                // darkColor：深背景下的数字颜色（需亮色保证对比度）
                const moralLight = save.moralValue >= 60 ? '#1a6b2a' : save.moralValue >= 30 ? '#92600A' : '#B80000';
                const moralDark  = save.moralValue >= 60 ? theme.statHigh : save.moralValue >= 30 ? '#FFD54F' : '#FF6B6B';
                const bossLight  = save.bossFavor >= 60 ? '#1a6b2a' : save.bossFavor >= 25 ? '#92600A' : '#B80000';
                const bossDark   = save.bossFavor >= 60 ? theme.statHigh : save.bossFavor >= 25 ? '#FFD54F' : '#FF6B6B';
                const tenureOk   = save.tenureYears >= effectiveTenureRequired;
                // 判断是否非行政线（党务/纪检/团派/政法/中央以外均为行政线）
                const _cpLine2 = (save.careerPathLine ?? '') as string;
                const _isNonAdmin = _cpLine2 === '党务线' || _cpLine2 === '纪检线' || _cpLine2 === '团派线' || _cpLine2 === '政法线';
                const stats = [
                  { label: '政绩', value: Math.floor(save.meritPoints).toString(), lightColor: theme.valueText, darkColor: '#FFFFFF' },
                  { label: '财政余额', value: _isNonAdmin ? `${save.cityGovFund ?? 0}万` : formatMoney(save.fundBalance), lightColor: theme.valueText, darkColor: '#FFFFFF' },
                  // 偶数格
                  { label: '道德', value: save.moralValue.toString(),               lightColor: moralLight,              darkColor: moralDark },
                  // 奇数格
                  { label: '上司', value: save.bossFavor.toString(),                lightColor: bossLight,               darkColor: bossDark },
                  // 偶数格
                  { label: '派系', value: save.reformFaction >= save.pragmaticFaction ? '改革' : '务实', lightColor: theme.primary, darkColor: '#FFFFFF' },
                  // 奇数格
                  { label: '任期', value: `${save.tenureYears}/${effectiveTenureRequired}年`, lightColor: tenureOk ? '#1a6b2a' : theme.valueText, darkColor: tenureOk ? theme.statHigh : '#FFFFFF' },
                ];
                return stats.map((item, i) => {
                  const isDeepBg = i % 2 === 1; // 奇数格深色背景
                  const numColor  = isDeepBg ? item.darkColor : item.lightColor;
                  const lblColor  = isDeepBg ? 'rgba(255,255,255,0.62)' : theme.mutedText;
                  // 财政余额格（index=1）全部路线统一跳转专项资金渠道
                  const isFiscal = item.label === '财政余额';
                  const fiscalPath = '/(app)/city-gov-fund';
                  return (
                    <Pressable
                      key={item.label}
                      onPress={isFiscal ? () => router.push(fiscalPath as never) : undefined}
                      style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderRightWidth: i < 5 ? 1 : 0, borderRightColor: theme.cardBorder, backgroundColor: isDeepBg ? theme.quickStatBg : theme.cardBg }}
                    >
                      <Text style={{ fontSize: 8, color: lblColor, letterSpacing: 0.5, marginBottom: 3 }}>
                        {item.label}{isFiscal ? ' ▸' : ''}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: numColor, fontVariant: ['tabular-nums'] }} numberOfLines={1}>{item.value}</Text>
                    </Pressable>
                  );
                });
              })()}
            </View>

            {/* 人脉值条 */}
            {(() => {
              const nv = save.networkValue ?? 0;
              const nvColor = nv >= 50 ? '#2a7a3b' : nv >= 20 ? '#C87820' : '#1D3B5E';
              const promoBonus = Math.min(16, Math.floor(nv / 25) * 2);
              const shieldBonus = Math.min(10, Math.floor(nv / 20) * 1);
              return (
                <Pressable
                  onPress={() => setShowNetworkModal(true)}
                  android_ripple={{ color: 'rgba(29,59,94,0.1)' }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 12, paddingVertical: 7 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13 }}>🤝</Text>
                    <Text style={{ fontSize: 10, color: theme.labelText, fontWeight: '600' }}>人脉资源</Text>
                    {promoBonus > 0 && (
                      <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>破格+{promoBonus}%</Text>
                      </View>
                    )}
                    {shieldBonus > 0 && (
                      <View style={{ backgroundColor: '#e8f0ff', borderWidth: 1, borderColor: '#5B4AA0', paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: '#5B4AA0', fontWeight: '700' }}>风险-{shieldBonus}%</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: nvColor, fontVariant: ['tabular-nums'] }}>{nv}</Text>
                    <Text style={{ fontSize: 9, color: theme.mutedText }}>点  ▸</Text>
                  </View>
                </Pressable>
              );
            })()}

            {/* 进度条 */}
            <View style={{ gap: 7 }}>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 10, color: theme.labelText }}>任职年限</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: save.tenureYears >= effectiveTenureRequired ? theme.statHigh : theme.accentSub, fontVariant: ['tabular-nums'] }}>
                    {save.tenureYears}年 / 需{effectiveTenureRequired}年
                    {save.tenureYears >= effectiveTenureRequired ? ' ✓' : ''}
                  </Text>
                </View>
                <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                  <View style={{ height: 5, width: `${tenureProgress}%`, backgroundColor: tenureProgress >= 100 ? '#2a7a3b' : theme.accentSub }} />
                </View>
              </View>
              <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.labelText }}>政绩积累</Text>
                  <Text style={{ fontSize: 10, color: meritProgress >= 100 ? theme.statHigh : theme.primary, fontVariant: ['tabular-nums'] }}>
                    {save.meritPoints.toFixed(0)} / {rankConfig?.requiredMerit ?? 100}
                    {meritProgress >= 100 ? ' ✓' : ''}
                  </Text>
                </View>
                <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                  <View style={{ height: 5, width: `${meritProgress}%`, backgroundColor: meritProgress >= 100 ? '#2a7a3b' : theme.primary }} />
                </View>
              </View>
              {displayRetireAge !== null && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 10, color: theme.mutedText }}>{retireCfg.isVoluntaryAt !== null ? '自主退休' : '退休年龄'}</Text>
                    {(save.retirementDelayYears ?? 0) > 0 && (
                      <View style={{ backgroundColor: '#FFF0C0', borderWidth: 1, borderColor: '#D4A017', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#8B6A00', fontWeight: '700' }}>已延迟{save.retirementDelayYears}年</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <Text style={{ fontSize: 10, color: showRetireWarning ? theme.statLow : theme.mutedText, fontWeight: showRetireWarning ? '700' : '400' }}>
                      {retireCfg.isVoluntaryAt !== null ? `${displayRetireAge}岁可自主选择` : `${displayRetireAge}岁`}
                    </Text>
                    {showRetireWarning && (
                      <View style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.statLow, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: theme.statLow, fontWeight: '700' }}>⚠ 不足1年</Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* 管理员入口移至头像弹窗，此处已删除 */}
          </View>
        </View>

        {/* ══ 城市经营面板 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accentSub, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <View style={{ backgroundColor: isCentralLine ? '#1D3B5E' : jurisdiction.typeColor, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{isCentralLine ? '部委机关' : jurisdiction.type}</Text>
            </View>
            <Text style={{ fontSize: 12, color: theme.sectionHeaderText, fontWeight: '600', flex: 1 }}>
              {isCentralLine ? `联邦内阁 · ${save.ministryName}` : jurisdiction.label}
            </Text>
            <Text style={{ fontSize: 10, color: '#888' }}>任期 {save.tenureYears}/{save.maxTenureYears}年</Text>
            {(() => {
              const cityScore = isPremierLevel
                ? Math.round((nationalGdp + nationalLivelihood + nationalEco + nationalBusiness) / 4)
                : Math.round((save.cityGdp + save.cityLivelihood + save.cityEcology + save.cityBusiness) / 4);
              const scoreColor = isPremierLevel ? '#4B0082' : cityScore >= 70 ? '#2a7a3b' : cityScore >= 40 ? '#e67e22' : '#C82829';
              return (
                <View style={{ backgroundColor: scoreColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>综合{cityScore}</Text>
                </View>
              );
            })()}
          </View>
          {isPremierLevel ? (
            <>
              <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, color: theme.sectionHeaderText }}>🏛️ 施政范围</Text>
                <Text style={{ fontSize: 11, color: theme.sectionHeaderText, fontWeight: '700' }}>全国综合治理</Text>
                <Text style={{ fontSize: 9, color: theme.mutedText, marginLeft: 4 }}>数值下限 500</Text>
              </View>
              {[
                { label: '经济发展总指数', value: nationalGdp, max: 1200 },
                { label: '民生保障总指数', value: nationalLivelihood, max: 1200 },
                { label: '生态治理总指数', value: nationalEco, max: 1200 },
                { label: '营商环境总指数', value: nationalBusiness, max: 1200 },
              ].map(kpi => (
                <View key={kpi.label} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: theme.labelText }}>{kpi.label}</Text>
                    <Text style={{ fontSize: 11, color: theme.accent, fontWeight: '700' }}>{kpi.value}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: theme.progressBg }}>
                    <View style={{ height: 4, width: `${Math.min(100, Math.round(kpi.value / kpi.max * 100))}%`, backgroundColor: theme.progressFill }} />
                  </View>
                </View>
              ))}
            </>
          ) : isMinistryLevel ? (
            <>
              <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 9, color: theme.sectionHeaderText }}>🏛️ 分管领域</Text>
                <Text style={{ fontSize: 11, color: theme.sectionHeaderText, fontWeight: '700' }}>{ministryFocus}</Text>
              </View>
              {ministryKpis.map(kpi => (
                <StatBar key={kpi.label} label={kpi.label} value={kpi.value} theme={theme} />
              ))}
            </>
          ) : (
            <>
              {/* 中央线：部委四维KPI指标 */}
              {isCentralLine && centralKpiLabels ? (
                <>
                  <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)' }}>🏛️ 部委考核指标</Text>
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>{save.ministryName}</Text>
                  </View>
                  {([
                    { label: centralKpiLabels[0], value: save.cityGdp },
                    { label: centralKpiLabels[1], value: save.cityLivelihood },
                    { label: centralKpiLabels[2], value: save.cityEcology },
                    { label: centralKpiLabels[3], value: save.cityBusiness },
                  ] as { label: string; value: number }[]).map(kpi => {
                    const barColor = kpi.value >= 70 ? '#2a7a3b' : kpi.value >= 40 ? '#e67e22' : '#C82829';
                    return (
                      <View key={kpi.label} style={{ marginBottom: 9 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                          <Text style={{ fontSize: 11, color: theme.labelText }}>{kpi.label}</Text>
                          <Text style={{ fontSize: 11, color: barColor, fontWeight: '700' }}>{kpi.value}</Text>
                        </View>
                        <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                          <View style={{ height: 5, width: `${kpi.value}%`, backgroundColor: barColor }} />
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 4, paddingTop: 6 }}>
                    <Text style={{ fontSize: 10, color: theme.mutedText }}>
                      💡 部委考核以政策执行质量与廉洁自律为核心，每年年底组织部综合评定
                    </Text>
                  </View>
                </>
              ) : (
              <>
              {/* 按仕途路线渲染对应 KPI 维度 */}
              {lineKpiResult ? (
                /* 党务/纪检/团派线：路线专属维度 */
                <>
                  {lineKpiResult.dims.map(dim => {
                    const barColor = dim.warning ? '#e67e22' : dim.score >= 70 ? '#2a7a3b' : theme.primary;
                    return (
                      <View key={dim.key} style={{ marginBottom: 9 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                            <Text style={{ fontSize: 11, color: theme.labelText }}>{dim.label}</Text>
                            {dim.warning && <Text style={{ fontSize: 9, color: '#e67e22' }}>⚠</Text>}
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            <Text style={{ fontSize: 9, color: theme.mutedText }}>权重{Math.round(dim.weight * 100)}%</Text>
                            <Text style={{ fontSize: 11, color: barColor, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 28, textAlign: 'right' }}>
                              {dim.score}
                            </Text>
                          </View>
                        </View>
                        <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                          <View style={{ height: 5, width: `${dim.score}%`, backgroundColor: barColor }} />
                        </View>
                        <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>{dim.desc}</Text>
                      </View>
                    );
                  })}
                  {/* 路线综合得分 */}
                  <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 4, paddingTop: 8, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 10, color: theme.labelText, fontWeight: '700' }}>综合考核得分</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 9, color: theme.mutedText }}>及格线 {lineKpiResult.scoreThreshold}分</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'],
                          color: lineKpiResult.eligible ? '#2a7a3b' : '#C82829' }}>
                          {lineKpiResult.totalScore}分
                        </Text>
                      </View>
                    </View>
                    <View style={{ height: 7, backgroundColor: theme.progressBg }}>
                      <View style={{ height: 7, width: `${Math.min(100, lineKpiResult.totalScore)}%`,
                        backgroundColor: lineKpiResult.eligible ? '#2a7a3b' : theme.primary }} />
                      <View style={{ position: 'absolute', left: `${lineKpiResult.scoreThreshold}%`, top: 0, bottom: 0, width: 1.5, backgroundColor: '#C82829' }} />
                    </View>
                    <View style={{ backgroundColor: lineKpiResult.eligible ? '#e8f5e9' : '#fffbe6',
                      borderWidth: 1, borderColor: lineKpiResult.eligible ? '#2a7a3b' : '#e67e22',
                      paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 }}>
                      <Text style={{ fontSize: 10, color: lineKpiResult.eligible ? '#2a7a3b' : '#8B6914', fontWeight: '600', lineHeight: 16 }}>
                        {lineKpiResult.eligible
                          ? `✅ 【${lineSpecificTitle}】考核达标，晋升通道开启`
                          : `📊 【${lineSpecificTitle}】得分 ${lineKpiResult.totalScore}分，需达 ${lineKpiResult.scoreThreshold}分`}
                      </Text>
                    </View>
                    {lineKpiResult.gaps.length > 0 && (
                      <View style={{ gap: 2, marginTop: 2 }}>
                        {lineKpiResult.gaps.map((g, i) => (
                          <Text key={i} style={{ fontSize: 9, color: '#8B6914', lineHeight: 14 }}>⚠️ {g}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                </>
              ) : (
              /* 行政线（默认）：分层级 KPI 考核指标 */
              <>
              {kpiPanel.map(item => {
                const barColor = item.vetoed
                  ? '#C82829'
                  : item.warning
                    ? '#e67e22'
                    : item.score >= 70
                      ? '#2a7a3b'
                      : theme.primary;
                return (
                  <View key={item.key} style={{ marginBottom: 9 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
                        {item.isTop && (
                          <View style={{ backgroundColor: theme.primary, paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 7, color: theme.primaryText, fontWeight: '700' }}>核心</Text>
                          </View>
                        )}
                        <Text style={{ fontSize: 11, color: theme.labelText, fontWeight: item.isTop ? '700' : '400' }}>{item.label}</Text>
                        {item.warning && !item.vetoed && (
                          <Text style={{ fontSize: 9, color: '#e67e22' }}>⚠</Text>
                        )}
                        {item.vetoed && (
                          <Text style={{ fontSize: 9, color: '#C82829', fontWeight: '700' }}>⛔</Text>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 9, color: theme.mutedText }}>权重{Math.round(item.weight * 100)}%</Text>
                        <Text style={{ fontSize: 11, color: barColor, fontWeight: '700', fontVariant: ['tabular-nums'], minWidth: 28, textAlign: 'right' }}>
                          {item.score}
                        </Text>
                      </View>
                    </View>
                    <View style={{ height: 5, backgroundColor: theme.progressBg }}>
                      <View style={{ height: 5, width: `${item.score}%`, backgroundColor: barColor }} />
                    </View>
                    <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>{item.desc}</Text>
                  </View>
                );
              })}
              {/* 综合得分 + 晋升状态 */}
              <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, marginTop: 4, paddingTop: 8, gap: 5 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: theme.labelText, fontWeight: '700' }}>综合考核得分</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 9, color: theme.mutedText }}>门槛 {kpiResult.scoreThreshold}分</Text>
                    <Text style={{
                      fontSize: 13, fontWeight: '700', fontVariant: ['tabular-nums'],
                      color: kpiResult.scoreReady ? '#2a7a3b' : '#C82829',
                    }}>
                      {kpiResult.totalScore}分
                    </Text>
                  </View>
                </View>
                <View style={{ height: 7, backgroundColor: theme.progressBg }}>
                  <View style={{ height: 7, width: `${Math.min(100, kpiResult.totalScore)}%`, backgroundColor: kpiResult.scoreReady ? '#2a7a3b' : theme.primary }} />
                  {/* 门槛标记线 */}
                  <View style={{ position: 'absolute', left: `${kpiResult.scoreThreshold}%`, top: 0, bottom: 0, width: 1.5, backgroundColor: '#C82829' }} />
                </View>
                <View style={{ backgroundColor: kpiResult.eligible ? '#e8f5e9' : kpiResult.hasVeto ? '#fff0f0' : '#fffbe6', borderWidth: 1, borderColor: kpiResult.eligible ? '#2a7a3b' : kpiResult.hasVeto ? '#C82829' : '#e67e22', paddingHorizontal: 8, paddingVertical: 5, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: kpiResult.eligible ? '#2a7a3b' : kpiResult.hasVeto ? '#C82829' : '#8B6914', fontWeight: '600', lineHeight: 16 }}>
                    {promotionSummaryText}
                  </Text>
                </View>
                {kpiResult.hasVeto && (
                  <View style={{ gap: 3, marginTop: 2 }}>
                    {kpiResult.vetoItems.filter(v => v.triggered).map(v => (
                      <Text key={v.label} style={{ fontSize: 9, color: '#C82829', lineHeight: 14 }}>
                        ⛔ {v.label}：{v.desc}（当前 {v.value}，需≥{v.threshold}）
                      </Text>
                    ))}
                  </View>
                )}
                {/* 党校证书晋升条件提示 */}
                {(() => {
                  const reqLevel = getRequiredPartySchoolLevel(save.rankLevel);
                  if (!reqLevel) return null;
                  const LEVEL_ORDER = ['county', 'city', 'basic', 'middle', 'advanced', 'national'] as const;
                  const reqIdx = LEVEL_ORDER.indexOf(reqLevel);
                  const hasCert = playerCerts.some(c => LEVEL_ORDER.indexOf(c as typeof LEVEL_ORDER[number]) >= reqIdx);
                  const cfg = PARTY_SCHOOL_CONFIG[reqLevel];
                  if (hasCert) {
                    return (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', paddingHorizontal: 8, paddingVertical: 5 }}>
                        <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>🏛️ 党校证书</Text>
                        <Text style={{ fontSize: 9, color: '#2a7a3b', flex: 1 }}>已持有{cfg.certName}，晋升资格满足 ✓</Text>
                      </View>
                    );
                  }
                  return (
                    <Pressable
                      onPress={() => router.push('/(app)/health' as never)}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, backgroundColor: '#fff8e6', borderWidth: 1, borderColor: '#e67e22', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ fontSize: 9, color: '#C86A00', fontWeight: '700' }}>🏛️ 党校证书</Text>
                      <Text style={{ fontSize: 9, color: '#8B5000', flex: 1 }}>缺少晋升必备证书：{cfg.certName}（{cfg.schoolName}{cfg.label}）</Text>
                      <Text style={{ fontSize: 9, color: '#e67e22', fontWeight: '700' }}>去报名 ›</Text>
                    </Pressable>
                  );
                })()}
                {/* ── 本月未施政警告已移除（部门玩法取消）── */}
              </View>
            </>
            )}
            </>
          )}
            </>
          )}
        </View>

        {/* ══ 核心政务（按路线隔离） ══ */}
        {(() => {
          const cpLine = (save.careerPathLine ?? '') as string;
          const isPartyLine       = cpLine === '党务线';
          const isDisciplineLineV = cpLine === '纪检线';
          const isLeagueLineV     = cpLine === '团派线';
          const isJudicialLine    = cpLine === '政法线';
          const isAdminLine       = !isPartyLine && !isDisciplineLineV && !isLeagueLineV && !isJudicialLine;
          const isNonAdminLine    = !isAdminLine;

          // 各线面板标题与主色
          const panelTitle = isPartyLine ? '党务工作台' : isDisciplineLineV ? '纪检工作台' : isLeagueLineV ? '青年工作台' : '核心政务';
          const panelColor = isPartyLine ? '#c0392b' : isDisciplineLineV ? '#7d6608' : isLeagueLineV ? '#1a7a4a' : theme.primary;

          return (
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: panelColor, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <View style={{ width: 3, height: 13, backgroundColor: panelColor }} />
                <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>{panelTitle}</Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {/* 上司关系/晋升申请：所有线均显示 */}
                <View style={{ width: '31%' }}>
                  <NavCard label="上司关系" icon="🤝" badge={pendingTaskCount} onPress={() => router.push('/(app)/tasks')} accent theme={theme} />
                </View>
                <View style={{ width: '31%' }}>
                  <NavCard label="晋升申请" icon="🏅" badge={save.isPromotionAvailable ? 1 : 0} onPress={() => router.push('/(app)/promotion')} accent theme={theme} />
                </View>
                {save.rankLevel < 12 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label={save.rankLevel >= 12 ? '述职报告' : '工作报告'} icon="📑" badge={unreadReports.length} onPress={() => router.push('/(app)/monthly-report')} theme={theme} />
                  </View>
                )}
                {save.rankLevel >= 12 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="述职报告" icon="📑" badge={unreadReports.length} onPress={() => router.push('/(app)/monthly-report')} theme={theme} />
                  </View>
                )}

                {/* 突发事件：所有线 rank<12 显示 */}
                {save.rankLevel < 12 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="突发事件" icon="⚠️" badge={save.isEventPending ? 1 : 0} onPress={() => router.push('/(app)/events')} accent theme={theme} />
                  </View>
                )}

                {/* 行政线专属入口 */}
                {isAdminLine && save.rankLevel >= 4 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="区域规划" icon="🗺️" onPress={() => router.push('/(app)/admin-region' as never)} theme={theme} />
                  </View>
                )}
                {isAdminLine && save.rankLevel >= 4 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="民生工作" icon="🏘️" onPress={() => router.push('/(app)/admin-livelihood' as never)} theme={theme} />
                  </View>
                )}
                {isAdminLine && save.rankLevel >= 4 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="行政治理" icon="🏛️" onPress={() => router.push('/(app)/admin-governance' as never)} theme={theme} />
                  </View>
                )}

                {/* 党务线专属入口 */}
                {isPartyLine && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="党建工作" icon="🎖️" onPress={() => router.push('/(app)/party-build' as never)} theme={theme} />
                  </View>
                )}
                {isPartyLine && save.rankLevel >= 7 && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="党委高阶" icon="🏛️" onPress={() => router.push('/(app)/party-committee' as never)} theme={theme} />
                  </View>
                )}

                {/* 纪检线专属入口 */}
                {isDisciplineLineV && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="案件查处" icon="🔍" onPress={() => router.push('/(app)/discipline-investigation' as never)} theme={theme} />
                  </View>
                )}

                {/* 政法线专属入口 */}
                {cpLine === '政法线' && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="政法执法" icon="⚖️" onPress={() => router.push('/(app)/judicial-system' as never)} theme={theme} />
                  </View>
                )}

                {/* 团派线专属入口 */}
                {isLeagueLineV && (
                  <View style={{ width: '31%' }}>
                    <NavCard label="青年工作" icon="🤝" onPress={() => router.push('/(app)/league-youth' as never)} theme={theme} />
                  </View>
                )}
              </View>
            </View>
          );
        })()}

        {/* ══ 人事管理（仅党务线）══ */}
        {save.careerPathLine === '党务线' && (
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>人事管理</Text>
            {/* 路线切换入口 rank<8 才可切换 */}
            {save.rankLevel < 8 && (
              <Pressable
                onPress={() => router.push('/(app)/career-switch' as never)}
                style={{ marginLeft: 'auto', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}
              >
                <Text style={{ fontSize: 9, color: '#B45309', fontWeight: '700' }}>🛤️ 路线切换</Text>
              </Pressable>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {/* 下属管理：仅党务线 */}
            {save.careerPathLine === '党务线' && (
              <View style={{ width: '31%' }}>
                <NavCard label="下属管理" icon="👥" onPress={() => router.push('/(app)/subordinates')} theme={theme} />
              </View>
            )}
            {/* 招募干部：仅党务线 */}
            {save.careerPathLine === '党务线' && (
              <View style={{ width: '31%' }}>
                {save.rankLevel < 7 ? (
                  <NavCard
                    label="党建·招募干部"
                    icon="🎓"
                    badge={(save.lastRecruitQuarter ?? 0) < Math.floor(save.gameDays / 90) && Math.floor(save.gameDays / 90) > 0 ? 1 : 0}
                    onPress={() => router.push('/(app)/recruit')}
                    theme={theme}
                  />
                ) : (
                  <NavCard label="央管干部" icon="🎖️" onPress={() => router.push('/(app)/cadre-appointment')} accent theme={theme} />
                )}
              </View>
            )}
            {/* 派系关系：所有路线 */}
            <View style={{ width: '31%' }}>
              <NavCard label="派系关系" icon="⚖️" onPress={() => router.push('/(app)/factions')} theme={theme} />
            </View>
            {save.rankLevel >= 7 && save.rankLevel < 10 && save.careerPathLine === '党务线' && (
              <View style={{ width: '31%' }}>
                <NavCard
                  label={save.rankLevel >= 8 ? '市管干部' : '干部名单'}
                  icon="🏙️"
                  onPress={() => router.push('/(app)/city-appointment')}
                  accent={save.rankLevel >= 8}
                  theme={theme}
                />
              </View>
            )}
            {save.rankLevel >= 8 && save.rankLevel < 12 && save.careerPathLine === '党务线' && (
              <View style={{ width: '31%' }}>
                <NavCard label="交流干部" icon="🔄" badge={exchangeOfficer ? 1 : 0} onPress={() => router.push('/(app)/exchange-officer')} theme={theme} />
              </View>
            )}
            <View style={{ width: '31%' }}>
              <NavCard label="代会提名" icon="🏛️" onPress={() => router.push('/(app)/npc-congress')} theme={theme} />
            </View>
            {save.rankLevel >= 12 && save.careerPathLine === '党务线' && (
              <View style={{ width: '31%' }}>
                <NavCard label="选调生" icon="🎓" onPress={() => router.push('/(app)/cadre-selection')} accent theme={theme} />
              </View>
            )}
            {/* 政治局席位竞争：12级以上所有线路 */}
            {save.rankLevel >= 12 && (
              <View style={{ width: '31%' }}>
                <NavCard label="政治局选举" icon="⭐"
                  onPress={() => router.push('/(app)/politburo' as never)}
                  accent theme={theme} />
              </View>
            )}
            {/* 常委序列博弈：13级以上 */}
            {save.rankLevel >= 13 && (
              <View style={{ width: '31%' }}>
                <NavCard label="常委序列" icon="🔱"
                  onPress={() => router.push('/(app)/standing-committee' as never)}
                  accent theme={theme} />
              </View>
            )}
          </View>
        </View>
        )}

        {/* ══ 城市治理（rank < 12，且为地方线）══ */}
        {save.rankLevel < 12 && !isCentralLine && (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accentSub, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 3, height: 13, backgroundColor: theme.accentSub }} />
              <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>城市治理</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(() => {
                // ── 路线判断：优先 careerPathLine，兼容旧存档从 careerPath 推断 ──
                let cpLine2 = (save.careerPathLine ?? '') as string;
                if (!cpLine2) {
                  const cp = save.careerPath ?? '';
                  if (cp === 'party') cpLine2 = '党务线';
                  else if (cp === 'discipline') cpLine2 = '纪检线';
                  else if (cp === 'league') cpLine2 = '团派线';
                  else cpLine2 = '行政线';
                }
                // ── 系统站所：按路线+职级动态显示具体部门 ──
                const getSystemDept = (line: string, rank: number): { label: string; icon: string; path: string } => {
                  if (line === '党务线') {
                    if (rank <= 3) return { label: '党务办', icon: '🔴', path: '/(app)/party-deep' };
                    if (rank <= 6) return { label: '党务办·组织科', icon: '🔴', path: '/(app)/party-deep' };
                    if (rank <= 9) return { label: '党委宣传科', icon: '🔴', path: '/(app)/party-deep' };
                    return { label: '统战部', icon: '🔴', path: '/(app)/party-deep' };
                  }
                  if (line === '纪检线') {
                    if (rank <= 4) return { label: '派出所', icon: '⚖️', path: '/(app)/discipline-deep' };
                    if (rank <= 8) return { label: '信访室', icon: '⚖️', path: '/(app)/discipline-deep' };
                    return { label: '政法委', icon: '⚖️', path: '/(app)/discipline-deep' };
                  }
                  if (line === '团派线') {
                    if (rank <= 3) return { label: '团委', icon: '🌱', path: '/(app)/league-deep' };
                    if (rank <= 6) return { label: '青年服务中心', icon: '🌱', path: '/(app)/league-deep' };
                    if (rank <= 9) return { label: '团市委', icon: '🌱', path: '/(app)/league-deep' };
                    return { label: '团省委', icon: '🌱', path: '/(app)/league-deep' };
                  }
                  // 行政线：11个站所按职级轮转
                  const adminDepts = [
                    { label: '发改站', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '财政所', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '建设站', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '教育办', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '卫生站', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '环保站', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '市监所', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '农业站', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '人事办', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '招商办', icon: '🏛️', path: '/(app)/govt-system' },
                    { label: '税务所', icon: '🏛️', path: '/(app)/govt-system' },
                  ];
                  const idx = Math.min(rank - 1, adminDepts.length - 1);
                  return adminDepts[idx];
                };
                const sysDept = getSystemDept(cpLine2, save.rankLevel);
                // ── cityItems 按路线分组 ──
                type CityItem = { label: string; icon: string; badge: number; path: string; lock: boolean; unlock?: number };
                let cityItems: CityItem[];
                if (cpLine2 === '党务线') {
                  cityItems = [
                    { label: sysDept.label, icon: sysDept.icon, badge: pendingCaseCount, path: sysDept.path, lock: false },
                    { label: '干部选拔', icon: '📋', badge: 0, path: '/(app)/cadre-selection', lock: false },
                    { label: '党建工作', icon: '🔴', badge: 0, path: '/(app)/party-build', lock: false },
                    { label: '干部提拔', icon: '🎖️', badge: 0, path: '/(app)/party-cadre-promote', lock: false },
                    { label: '人事任免', icon: '👥', badge: 0, path: '/(app)/personnel-manipulation', lock: false },
                    { label: '民生详情', icon: '🏘️', badge: 0, path: '/(app)/livelihood', lock: false },
                  ];
                } else if (cpLine2 === '纪检线') {
                  cityItems = [
                    { label: sysDept.label, icon: sysDept.icon, badge: pendingCaseCount, path: sysDept.path, lock: false },
                    { label: '纪检深度', icon: '🔍', badge: 0, path: '/(app)/discipline-deep', lock: false },
                    { label: '案件查处', icon: '⚖️', badge: 0, path: '/(app)/discipline-deep', lock: false },
                    { label: '廉政建设', icon: '🛡️', badge: 0, path: '/(app)/discipline-deep', lock: false },
                    { label: '巡视反腐', icon: '🔎', badge: 0, path: '/(app)/discipline-deep', lock: false },
                    { label: '专项整治', icon: '📋', badge: 0, path: '/(app)/discipline-deep', lock: false },
                  ];
                } else if (cpLine2 === '政法线') {
                  cityItems = [
                    { label: sysDept.label, icon: sysDept.icon, badge: pendingCaseCount, path: sysDept.path, lock: false },
                    { label: '案件侦办', icon: '🔍', badge: 0, path: '/(app)/judicial-system', lock: false },
                    { label: '维稳系统', icon: '🛡️', badge: 0, path: '/(app)/judicial-system', lock: false },
                    { label: '信访接待', icon: '📮', badge: 0, path: '/(app)/judicial-system', lock: false },
                    { label: '扫黑除恶', icon: '⚡', badge: 0, path: '/(app)/judicial-system', lock: false },
                    { label: '城治经费', icon: '🏛️', badge: 0, path: '/(app)/city-gov-fund', lock: false },
                  ];
                } else if (cpLine2 === '团派线') {
                  cityItems = [
                    { label: sysDept.label, icon: sysDept.icon, badge: pendingCaseCount, path: sysDept.path, lock: false },
                    { label: '青年服务', icon: '🌱', badge: 0, path: '/(app)/league-youth-service', lock: false },
                    { label: '社会工作', icon: '🌐', badge: 0, path: '/(app)/league-social-work', lock: false },
                    { label: '人才培养', icon: '🎓', badge: 0, path: '/(app)/league-talent', lock: false },
                    { label: '青年工作', icon: '🌟', badge: 0, path: '/(app)/league-youth', lock: false },
                    { label: '团派深度', icon: '🤝', badge: 0, path: '/(app)/league-deep', lock: false },
                  ];
                } else {
                  // 行政线（默认）
                  cityItems = [
                    { label: sysDept.label, icon: sysDept.icon, badge: pendingCaseCount, path: sysDept.path, lock: false },
                    { label: '城市建设', icon: '🏗️', badge: 0, path: '/(app)/construction', lock: save.rankLevel < 2, unlock: 2 },
                    { label: '行政治理', icon: '⚙️', badge: 0, path: '/(app)/admin-governance', lock: save.rankLevel < 3, unlock: 3 },
                    { label: '管辖区域', icon: '🗺️', badge: 0, path: '/(app)/governing-areas', lock: save.rankLevel < 5, unlock: 5 },
                    { label: '民生详情', icon: '🏘️', badge: 0, path: '/(app)/livelihood', lock: false },
                    { label: '城治经费', icon: '🏛️', badge: 0, path: '/(app)/city-gov-fund', lock: false },
                  ];
                }
                return cityItems.map(item => (
                  <View key={item.label} style={{ width: '31%' }}>
                    <NavCard
                      label={item.label} icon={item.icon}
                      badge={item.badge > 0 ? item.badge : undefined}
                      onPress={() => router.push(item.path as never)}
                      locked={item.lock}
                      unlockLevel={item.unlock}
                      theme={theme}
                    />
                  </View>
                ));
              })()}
            </View>
          </View>
        )}

        {/* ══ 新系统入口：反腐/舆情/土地财政/传承/外交/仕途路线 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: '#8B0000', padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: '#8B0000' }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>专项系统</Text>
            {/* 实时预警徽章 */}
            {((save.inspectionRisk ?? 0) >= 60 || (save.massIncidentPending ?? 0) > 0 || !!save.pendingBriberyEvent || (save.npcVacancyNotices ?? []).length > 0) && (
              <View style={{ backgroundColor: '#B91C1C', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, marginLeft: 4 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>⚠ 需处理</Text>
              </View>
            )}
          </View>
          {/* NPC职位空缺通知 */}
          {(save.npcVacancyNotices ?? []).length > 0 && (
            <View style={{ backgroundColor: '#1A2D10', borderRadius: 8, borderWidth: 1, borderColor: '#2D5A1B', padding: 10, marginBottom: 10, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#4ADE80', fontSize: 11, fontWeight: '800' }}>🔔 职位空缺通知</Text>
                <Text style={{ color: '#16A34A', fontSize: 9 }}>（你有机会优先填补）</Text>
              </View>
              {(save.npcVacancyNotices ?? []).map((notice: string, idx: number) => (
                <Text key={idx} style={{ color: '#86EFAC', fontSize: 11, lineHeight: 17 }}>• {notice}</Text>
              ))}
              <Pressable
                onPress={() => updateGameSave({ npcVacancyNotices: [] })}
                style={{ backgroundColor: '#166534', borderRadius: 6, paddingVertical: 6, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#D1FAE5', fontSize: 12, fontWeight: '700' }}>已知悉，清除通知</Text>
              </Pressable>
            </View>
          )}
          {/* 快速状态栏 */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: (save.inspectionRisk ?? 0) >= 60 ? '#FEE2E2' : '#F0F9E8', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 12 }}>🔍</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: (save.inspectionRisk ?? 0) >= 60 ? '#B91C1C' : '#166534' }}>
                廉洁风险 {save.inspectionRisk ?? 0}%
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: (save.publicOpinionIndex ?? 60) < 40 ? '#FEE2E2' : '#EFF6FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
              <Text style={{ fontSize: 12 }}>📢</Text>
              <Text style={{ fontSize: 10, fontWeight: '700', color: (save.publicOpinionIndex ?? 60) < 40 ? '#B91C1C' : '#1E40AF' }}>
                舆情 {save.publicOpinionIndex ?? 60}
              </Text>
            </View>
            {/* 舆情晋升门槛进度（rank9+） */}
            {(() => {
              const rank = save.rankLevel ?? 1;
              const required = rank >= 11 ? 3 : rank >= 10 ? 2 : rank >= 9 ? 1 : 0;
              if (required === 0) return null;
              const done = save.massIncidentCount ?? 0;
              const ready = done >= required;
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ready ? '#F0FDF4' : '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 12 }}>{ready ? '✅' : '⏳'}</Text>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: ready ? '#166534' : '#92400E' }}>
                    舆情门槛 {done}/{required}起
                  </Text>
                </View>
              );
            })()}
            {(save.massIncidentPending ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 12 }}>⚡</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#C2410C' }}>
                  群体事件 {save.massIncidentPending ?? 0} 件
                </Text>
              </View>
            )}
            {save.landFinanceTotal > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 12 }}>🏗️</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#92400E' }}>
                  土地收入 ¥{(save.landFinanceTotal / 10000).toFixed(0)}万
                </Text>
              </View>
            )}
            {/* 双规预警横幅 */}
            {save.isUnderInvestigation && (
              <Pressable
                onPress={() => router.push('/(app)/shuanggui' as never)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7f0000', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 12 }}>🚨</Text>
                <Text style={{ fontSize: 10, fontWeight: '900', color: '#fff' }}>双规立案中 — 点击应对 ›</Text>
              </Pressable>
            )}
            {(save.diplomacyPoints ?? 0) > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 12 }}>🌐</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: '#4338CA' }}>
                  外交积分 {save.diplomacyPoints ?? 0}
                </Text>
              </View>
            )}
            {!!(save.careerPathLine) && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0FDF4', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 12 }}>{LINE_ICON[(save.careerPathLine as CareerLine)] ?? '🛤️'}</Text>
                <Text style={{ fontSize: 10, fontWeight: '700', color: getLineBaseColor(save.careerPathLine as CareerLine) ?? '#166534' }}>
                  {save.careerPathLine} · {save.lineKpiScore ?? 0}分
                </Text>
                {/* rank8+ 路线已固定标记 */}
                {save.rankLevel >= 8 ? (
                  <View style={{ backgroundColor: '#8B1A1A', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>路线锁定</Text>
                  </View>
                ) : (
                  <View style={{ borderWidth: 1, borderColor: '#e67e22', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                    <Text style={{ color: '#e67e22', fontSize: 8, fontWeight: '700' }}>8级锁定</Text>
                  </View>
                )}
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '31%' }}>
              <NavCard label="仕途路线" icon="🛤️"
                onPress={() => router.push('/(app)/career-path')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="巡视反腐" icon="🔍"
                badge={(save.inspectionRisk ?? 0) >= 60 ? 1 : undefined}
                onPress={() => router.push('/(app)/inspection')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="舆情处置" icon="📢"
                badge={(save.massIncidentPending ?? 0) > 0 ? (save.massIncidentPending ?? 0) : undefined}
                onPress={() => router.push('/(app)/mass-incident')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="土地财政" icon="🏗️"
                onPress={() => router.push('/(app)/land-finance')}
                locked={save.rankLevel < 3} unlockLevel={3} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="外交援助" icon="🌐"
                onPress={() => router.push('/(app)/diplomacy')}
                locked={save.rankLevel < 6} unlockLevel={6} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="政治传承" icon="🌟"
                onPress={() => router.push('/(app)/inheritance')}
                locked={save.rankLevel < 6} unlockLevel={6} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard
                label={save.mentorName ? `师承·${save.mentorName}` : '师承系统'}
                icon="🎓"
                badge={save.mentorName && !save.mentorLastContactDay ? 1 : 0}
                onPress={() => router.push('/(app)/mentor' as never)}
                theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="专项经费" icon="🏦"
                onPress={() => router.push('/(app)/city-gov-fund' as never)}
                accent theme={theme} />
            </View>
          </View>

          {/* ── 路线专属深度玩法（内嵌专项系统） ── */}
          {(() => {
            const line = (save.careerPathLine ?? save.careerPath ?? '行政线') as string;
            const lineColor = getLineBaseColor(line as CareerLine) ?? '#2980b9';
            const lineLabel = line.includes('党') ? '党务线' : line.includes('纪') ? '纪检线' : line.includes('团') ? '团派线' : '行政线';
            const lineIcon = LINE_ICON[lineLabel as CareerLine] ?? '🛤️';
            return (
            <View style={{ borderTopWidth: 1, borderTopColor: lineColor + '40', paddingTop: 10, marginTop: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <View style={{ width: 3, height: 12, backgroundColor: lineColor, borderRadius: 2 }} />
                <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: lineColor }}>{lineIcon} {lineLabel}深度玩法</Text>
                <View style={{ backgroundColor: lineColor + '22', borderWidth: 1, borderColor: lineColor + '55', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ color: lineColor, fontSize: 9, fontWeight: '700' }}>Lv.{save.rankLevel} · 积分 {save.lineKpiScore ?? 0}</Text>
                </View>
              </View>

              {/* ── 行政线专属功能（城市治理深度玩法） ── */}
              {lineLabel === '行政线' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  {/* 常驻可见：行政深度 + 城治经费 */}
                  <View style={{ width: '31%' }}>
                    <NavCard label="行政深度" icon="🏛️"
                      onPress={() => router.push('/(app)/admin-deep' as never)} accent theme={theme} />
                  </View>
                  <View style={{ width: '31%' }}>
                    <NavCard label="城治经费" icon="💵"
                      onPress={() => router.push('/(app)/city-gov-fund' as never)} theme={theme} />
                  </View>
                  {/* rank≥2 解锁：招商引资 + 区域管理 */}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="招商引资" icon="💼"
                        onPress={() => router.push('/(app)/admin-investment' as never)} accent theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="区域管理" icon="🗺️"
                        onPress={() => router.push('/(app)/admin-region' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥4 解锁：政策窗口 + 土地财政 */}
                  {save.rankLevel >= 4 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="政策窗口" icon="🪟"
                        badge={(() => {
                          const yr = Math.floor((save.gameDays ?? 0) / 365);
                          const cds = (save.careerPathCooldowns ?? {}) as Record<string, number>;
                          return Object.keys(cds).some(k => k.startsWith('pw_') && k.endsWith(`_year`) && (cds[k] as number) === yr) ? 0 : 1;
                        })()}
                        onPress={() => router.push('/(app)/policy-window' as never)} accent theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 4 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="土地财政" icon="🏘️"
                        onPress={() => router.push('/(app)/land-finance' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥5 解锁：五年规划 + 经济周期 */}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="五年规划" icon="📋"
                        badge={save.fiveYearPlanPassed ? 0 : 1}
                        onPress={() => router.push('/(app)/five-year-plan' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="经济周期" icon="📈"
                        onPress={() => router.push('/(app)/economic-cycle' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥7 解锁：外交出访 + 城市面貌 */}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="外交出访" icon="✈️"
                        onPress={() => router.push('/(app)/diplomacy' as never)} accent theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="城市面貌" icon="🏙️"
                        onPress={() => router.push('/(app)/admin-urban' as never)} theme={theme} />
                    </View>
                  )}
                </View>
              )}

              {/* ── 党务线专属功能（含干部提拔） ── */}
              {lineLabel === '党务线' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <View style={{ width: '31%' }}>
                    <NavCard label="党建工作" icon="🔴"
                      onPress={() => router.push('/(app)/party-build' as never)} accent theme={theme} />
                  </View>
                  <View style={{ width: '31%' }}>
                    <NavCard label="党务深度" icon="🎖️"
                      onPress={() => router.push('/(app)/party-deep' as never)} accent theme={theme} />
                  </View>
                  {/* rank≥2 解锁：干部选拔 + 组织工作 */}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="干部选拔" icon="📋"
                        onPress={() => router.push('/(app)/cadre-selection' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="干部提拔" icon="🏗️"
                        onPress={() => router.push('/(app)/recruit' as never)} accent theme={theme} />
                    </View>
                  )}
                  {/* rank≥3 解锁：人事提拔 + 人事任免 */}
                  {save.rankLevel >= 3 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="人事提拔" icon="🎯"
                        onPress={() => router.push('/(app)/party-cadre-promote' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 3 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="人事任免" icon="👥"
                        onPress={() => router.push('/(app)/personnel-manipulation' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥5 解锁：党委会议 + 派系争夺 */}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="党委会议" icon="🏛️"
                        onPress={() => router.push('/(app)/party-committee' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="派系争夺" icon="⚡"
                        onPress={() => router.push('/(app)/faction-contest' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥7 解锁：派系关系 + 巡视工作 */}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="派系关系" icon="🔱"
                        onPress={() => router.push('/(app)/factions' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="巡视工作" icon="🔍"
                        onPress={() => router.push('/(app)/inspection' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 9 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="党代会报告" icon="📜"
                        onPress={() => router.push('/(app)/party-congress' as never)} accent theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 13 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="最高权力" icon="👑"
                        onPress={() => router.push('/(app)/supreme-leader' as never)} accent theme={theme} />
                    </View>
                  )}
                </View>
              )}

              {/* ── 纪检线专属功能（廉政+巡视+专项整治） ── */}
              {lineLabel === '纪检线' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <View style={{ width: '31%' }}>
                    <NavCard label="纪检深度" icon="🔍"
                      onPress={() => router.push('/(app)/discipline-deep' as never)} accent theme={theme} />
                  </View>
                  {/* rank≥2 解锁：案件深查 + 廉政建设 */}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="案件查处" icon="⚖️"
                        onPress={() => router.push('/(app)/discipline-deep' as never)} accent theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="廉政建设" icon="🛡️"
                        onPress={() => router.push('/(app)/discipline-deep' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥3 解锁：专项整治 + 巡视反腐 */}
                  {save.rankLevel >= 3 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="专项整治" icon="📋"
                        onPress={() => router.push('/(app)/discipline-deep' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 3 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="巡视反腐" icon="🔎"
                        onPress={() => router.push('/(app)/discipline-deep' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥5 解锁：举报受理 + 派系势力 */}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="举报受理" icon="📬"
                        onPress={() => router.push('/(app)/discipline-deep' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="派系关系" icon="🔱"
                        onPress={() => router.push('/(app)/factions' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥7 解锁：上级巡视 + 政法委工作 */}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="上级巡视" icon="🏛️"
                        onPress={() => router.push('/(app)/inspection' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="司法系统" icon="🏛️"
                        onPress={() => router.push('/(app)/judicial-system' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 13 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="最高监察" icon="🏛️"
                        onPress={() => router.push('/(app)/supreme-leader' as never)} accent theme={theme} />
                    </View>
                  )}
                </View>
              )}

              {/* ── 团派线专属功能（青年服务） ── */}
              {lineLabel === '团派线' && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                  <View style={{ width: '31%' }}>
                    <NavCard label="青年工作" icon="🌱"
                      onPress={() => router.push('/(app)/league-youth' as never)} accent theme={theme} />
                  </View>
                  <View style={{ width: '31%' }}>
                    <NavCard label="团派深度" icon="🤝"
                      onPress={() => router.push('/(app)/league-deep' as never)} accent theme={theme} />
                  </View>
                  {/* rank≥2 解锁：青年服务 + 社会工作 */}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="青年服务" icon="🌟"
                        onPress={() => router.push('/(app)/league-youth-service' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 2 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="社会工作" icon="🌐"
                        onPress={() => router.push('/(app)/league-social-work' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥3 解锁：人才培养 + 干部选拔 */}
                  {save.rankLevel >= 3 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="人才培养" icon="🎓"
                        onPress={() => router.push('/(app)/league-talent' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 3 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="干部选拔" icon="📋"
                        onPress={() => router.push('/(app)/cadre-selection' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥5 解锁：派系关系 + 路线竞争 */}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="派系关系" icon="🔱"
                        onPress={() => router.push('/(app)/factions' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 5 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="路线竞争" icon="⚡"
                        onPress={() => router.push('/(app)/line-competition' as never)} theme={theme} />
                    </View>
                  )}
                  {/* rank≥7 解锁：巡视工作 + 人事任免 */}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="巡视工作" icon="🔍"
                        onPress={() => router.push('/(app)/inspection' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 7 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="人事任免" icon="👥"
                        onPress={() => router.push('/(app)/personnel-manipulation' as never)} theme={theme} />
                    </View>
                  )}
                  {save.rankLevel >= 13 && (
                    <View style={{ width: '31%' }}>
                      <NavCard label="最高政协" icon="🏛️"
                        onPress={() => router.push('/(app)/supreme-leader' as never)} accent theme={theme} />
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })()}
        </View>

        {/* ══ 部委工作台（中央线专属，rank < 12）══ */}
        {isCentralLine && save.rankLevel < 12 && (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: '#1D3B5E', borderTopWidth: theme.decorLineHeight, borderTopColor: '#1D3B5E', padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 3, height: 13, backgroundColor: '#1D3B5E' }} />
              <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>部委工作台</Text>
              <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>🏛️ {save.ministryName}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              <View style={{ width: '31%' }}>
                <NavCard label="部委工作" icon="📋" onPress={() => router.push('/(app)/ministry-work' as never)} accent theme={theme} />
              </View>
              <View style={{ width: '31%' }}>
                <NavCard label="民生详情" icon="🏘️" onPress={() => router.push('/(app)/livelihood')} theme={theme} />
              </View>
              <View style={{ width: '31%' }}>
                <NavCard label="城治经费" icon="🏛️" onPress={() => router.push('/(app)/city-gov-fund' as never)} theme={theme} />
              </View>
            </View>
          </View>
        )}

        {/* ══ 终局系统（全线通用）══ */}
        {save.rankLevel >= 4 && (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: '#5C3A1E', borderTopWidth: theme.decorLineHeight, borderTopColor: '#8B4513', padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={{ width: 3, height: 13, backgroundColor: '#8B4513' }} />
              <Text style={{ fontSize: 10, color: '#6B3A1E', fontWeight: '700', letterSpacing: 2 }}>终局系统</Text>
              {/* 政治资本徽章 */}
              {(save.politicalCapital ?? 0) > 0 && (
                <View style={{ backgroundColor: '#8B4513', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 4 }}>
                  <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '800' }}>政治资本 {save.politicalCapital}</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {/* 重大议案：全线，职级4+，两会窗口期高亮 */}
              <View style={{ width: '31%' }}>
                <NavCard
                  label="重大议案"
                  icon="🏛️"
                  badge={(() => {
                    const fiveCycle = Math.floor((save.gameDays ?? 0) / 1825);
                    const cds = (save.careerPathCooldowns ?? {}) as Record<string, number>;
                    const submitted = Object.keys(cds).includes(`prop_session_${fiveCycle}`);
                    const inWindow  = (save.gameDays ?? 0) % 1825 < 60;
                    return inWindow && !submitted ? 1 : 0;
                  })()}
                  onPress={() => router.push('/(app)/major-proposal' as never)}
                  accent={(() => {
                    const inWindow = (save.gameDays ?? 0) % 1825 < 60;
                    return inWindow;
                  })()}
                  theme={theme}
                />
              </View>
              {/* 历史评价：退休前3年解锁 */}
              <View style={{ width: '31%' }}>
                <NavCard
                  label="历史评价"
                  icon="📜"
                  badge={save.retiredVoluntarily ? 0 : (save.rankLevel >= 8 ? 1 : 0)}
                  onPress={() => router.push('/(app)/historical-evaluation' as never)}
                  locked={false}
                  theme={theme}
                />
              </View>
              {/* 卸任时机：全线，职级4+，已退休显示状态 */}
              <View style={{ width: '31%' }}>
                <NavCard
                  label="卸任时机"
                  icon="🎗️"
                  badge={save.retirementForced && !save.retiredVoluntarily ? 1 : 0}
                  onPress={() => router.push('/(app)/retirement-timing' as never)}
                  accent={save.retirementForced && !save.retiredVoluntarily}
                  theme={theme}
                />
              </View>
              {/* 多结局收尾：全线，职级4+ */}
              <View style={{ width: '31%' }}>
                <NavCard
                  label="人生结局"
                  icon="🏅"
                  badge={save.retiredVoluntarily ? 1 : 0}
                  onPress={() => router.push('/(app)/ending-system' as never)}
                  accent={save.retiredVoluntarily}
                  theme={theme}
                />
              </View>
              {/* 特供情报：11级+ */}
              {save.rankLevel >= 11 && (
                <View style={{ width: '31%' }}>
                  <NavCard
                    label="特供内参"
                    icon="📰"
                    badge={(() => {
                      const month = Math.floor((save.gameDays ?? 0) / 30);
                      const cds = (save.careerPathCooldowns ?? {}) as Record<string, number>;
                      const used = ['rival_promo','local_unr','intl_pol'].every(k => (cds[`intel_${k}`] ?? -999) >= month * 30 - 30);
                      return used ? 0 : 1;
                    })()}
                    onPress={() => router.push('/(app)/intelligence-briefing' as never)}
                    accent theme={theme}
                  />
                </View>
              )}
            </View>
            {/* 行政线终局专属：命名权 + 经济周期 + 路线博弈 */}
            {save.careerPath === 'government' && save.rankLevel >= 12 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <View style={{ width: '31%' }}>
                  <NavCard
                    label="工程命名"
                    icon="🏗️"
                    badge={0}
                    onPress={() => router.push('/(app)/landmark-naming' as never)}
                    theme={theme}
                  />
                </View>
                <View style={{ width: '31%' }}>
                  <NavCard
                    label="经济周期"
                    icon="📈"
                    badge={1}
                    onPress={() => router.push('/(app)/economic-cycle' as never)}
                    accent theme={theme}
                  />
                </View>
                {save.rankLevel >= 15 && (
                  <View style={{ width: '31%' }}>
                    <NavCard
                      label="路线博弈"
                      icon="🗳️"
                      badge={(() => {
                        const last = save.routeVoteDay ?? 0;
                        return (save.gameDays ?? 0) - last >= 1825 ? 1 : 0;
                      })()}
                      onPress={() => router.push('/(app)/route-vote' as never)}
                      accent={(save.gameDays ?? 0) - (save.routeVoteDay ?? 0) >= 1825}
                      theme={theme}
                    />
                  </View>
                )}
              </View>
            )}
            {/* 全线终局：国家荣誉 + 回忆录（退休后或接近退休时可见）*/}
            {save.rankLevel >= 8 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                <View style={{ width: '31%' }}>
                  <NavCard
                    label="国家荣誉"
                    icon="🎖️"
                    badge={(save.honorLevel ?? 0) === 0 ? 0 : 1}
                    onPress={() => router.push('/(app)/national-honor' as never)}
                    accent={(save.honorLevel ?? 0) > 0}
                    theme={theme}
                  />
                </View>
                <View style={{ width: '31%' }}>
                  <NavCard
                    label="回忆录"
                    icon="📖"
                    badge={save.memoirWritten ? 1 : 0}
                    onPress={() => router.push('/(app)/memoir' as never)}
                    accent={!save.memoirWritten && save.retiredVoluntarily}
                    theme={theme}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* ══ 辅助功能 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.decorLine, padding: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary }} />
            <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>辅助功能</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <View style={{ width: '31%' }}>
              {(save.careerPathLine === '党务线' || save.careerPathLine === '行政线' || !save.careerPathLine) && (
                save.rankLevel < 12
                  ? <NavCard label="月度会议" icon="📝" locked={save.rankLevel < 3} unlockLevel={3} onPress={() => router.push('/(app)/meeting')} theme={theme} />
                  : <NavCard label="联邦内阁会议" icon="🏛️" onPress={() => router.push('/(app)/meeting')} theme={theme} />
              )}
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="专属秘书" icon="🤵" locked={false} unlockLevel={1} onPress={() => router.push('/(app)/secretary')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="领导班子" icon="🫂" locked={save.rankLevel < 3} unlockLevel={3} onPress={() => router.push('/(app)/leadership')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="健康党校" icon="🏥" onPress={() => router.push('/(app)/health')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="家族" icon="🏯" onPress={() => router.push('/(app)/family')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard
                label="接班人"
                icon="🎓"
                badge={(save.successorName ?? '') !== '' ? undefined : undefined}
                locked={save.rankLevel < 5}
                unlockLevel={5}
                onPress={() => router.push('/(app)/successor' as never)}
                theme={theme}
              />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="政治资产" icon="💎" onPress={() => router.push('/(app)/personal-wealth')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="官职体系" icon="📜" onPress={() => router.push('/(app)/official-hierarchy')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard label="领导人档案" icon="📋" onPress={() => router.push('/(app)/national-leaders')} theme={theme} />
            </View>
            <View style={{ width: '31%' }}>
              <NavCard
                label="干部制度"
                icon="📐"
                badge={(() => {
                  const demoOk = (save.democraticEvalScore ?? 0) >= 60;
                  const assessOk = (save.specialAssessScore ?? 0) >= 60;
                  return (!demoOk || !assessOk) ? 1 : 0;
                })()}
                onPress={() => router.push('/(app)/promotion-system' as never)}
                theme={theme}
              />
            </View>
            {/* 以权谋私（职级3+解锁）*/}
            {save.rankLevel >= 3 && (
              <View style={{ width: '31%' }}>
                <NavCard
                  label="特殊渠道"
                  icon="🌑"
                  badge={(save.grayIncomeTotal ?? 0) > 0 ? 1 : undefined}
                  onPress={() => router.push('/(app)/gray-income' as never)}
                  theme={theme}
                />
              </View>
            )}
            {/* 权色/权钱交易（厅级rank7+解锁）*/}
            {save.rankLevel >= 7 && (
              <View style={{ width: '31%' }}>
                <NavCard
                  label="权色交易"
                  icon="🔐"
                  badge={(save.inspectionRisk ?? 0) >= 50 ? 1 : undefined}
                  onPress={() => router.push('/(app)/power-trade' as never)}
                  theme={theme}
                />
              </View>
            )}
            {/* rank4-7：职务兼职入口（rank8+时已在高层职权区显示） */}
            {save.rankLevel >= 4 && save.rankLevel < 8 && (
              <View style={{ width: '31%' }}>
                <NavCard label="职务兼职" icon="🎖️" badge={(save.concurrentPosts ?? []).length > 0 ? (save.concurrentPosts ?? []).length : undefined} onPress={() => router.push('/(app)/concurrent-posts')} theme={theme} />
              </View>
            )}
            {/* 人脉资源（rank2+）*/}
            {save.rankLevel >= 2 && (
              <View style={{ width: '31%' }}>
                <NavCard label="人脉资源" icon="🤝" badge={(save.networkValue ?? 0) > 0 ? undefined : undefined} onPress={() => router.push('/(app)/network-resources' as never)} theme={theme} />
              </View>
            )}
            {/* 全国地图（辅助功能，所有级别均可查看）*/}
            <View style={{ width: '31%' }}>
              <NavCard label="全国地图" icon="🗺️" onPress={() => router.push('/(app)/provinces-map' as never)} theme={theme} />
            </View>
            {/* 纪委调查（所有级别均可查看合规风险）*/}
            <View style={{ width: '31%' }}>
              <NavCard
                label="纪委调查"
                icon="🔒"
                badge={(save.inspectionRisk ?? 0) >= 60 ? 1 : undefined}
                onPress={() => router.push('/(app)/discipline-investigation' as never)}
                theme={theme}
              />
            </View>
            {/* 派系版图争夺（rank8+）*/}
            {save.rankLevel >= 8 && (
              <View style={{ width: '31%' }}>
                <NavCard label="版图争夺" icon="⚔️" locked={false} onPress={() => router.push('/(app)/faction-contest' as never)} theme={theme} />
              </View>
            )}
          </View>
        </View>

        {/* ══ 高层职权（rank 8+）══ */}
        {save.rankLevel >= 8 && (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.primary, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.primary, padding: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <View style={{ width: 3, height: 13, backgroundColor: theme.accent }} />
              <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700', letterSpacing: 2 }}>高层职权</Text>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {save.rankLevel < 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="职务兼职" icon="🎖️" badge={(save.concurrentPosts ?? []).length} onPress={() => router.push('/(app)/concurrent-posts')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 10 && save.rankLevel < 13 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="省管干部" icon="🏛️" onPress={() => router.push('/(app)/province-appointment')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 10 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="军事力量" icon="⚔️" onPress={() => router.push('/(app)/military')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 11 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="四大班子" icon="🏛️" onPress={() => router.push('/(app)/four-organs')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 12 && save.rankLevel <= 12 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="部委治国" icon="🏛️" onPress={() => router.push('/(app)/ministry')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 13 && (
                <View style={{ width: '31%' }}>
                  <NavCard
                    label={
                      save.rankLevel >= 15 ? '总统官邸'
                        : save.rankLevel >= 14 ? (save.careerPath === 'discipline' ? '政法肃宪院' : save.careerPath === 'party' ? '执政党中央' : save.careerPath === 'league' ? '联邦国会' : '总理办公室')
                        : (save.careerPath === 'discipline' ? '肃宪督察院' : save.careerPath === 'party' ? '党务中央' : save.careerPath === 'league' ? '国会政务' : '内阁专权')
                    }
                    icon={save.careerPath === 'discipline' ? '⚖️' : save.careerPath === 'party' ? '🎖️' : save.careerPath === 'league' ? '🏛️' : '⭐'}
                    onPress={() => router.push('/(app)/premier-office')}
                    accent theme={theme}
                  />
                </View>
              )}
              {save.rankLevel >= 13 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="央管干部" icon="🎖️" onPress={() => router.push('/(app)/cadre-appointment')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="各省管理" icon="🗺️" onPress={() => router.push('/(app)/provinces-manage')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="国家建设" icon="🏗️" onPress={() => router.push('/(app)/national-construction')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="枢武府职权" icon="🎖️" onPress={() => router.push('/(app)/military-commission')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 15 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="国家中枢" icon="🏯" onPress={() => router.push('/(app)/national-center')} accent theme={theme} />
                </View>
              )}
              {save.rankLevel >= 12 && save.rankLevel < 14 && (
                <View style={{ width: '31%' }}>
                  <NavCard label="选调生" icon="🎓" onPress={() => router.push('/(app)/cadre-selection')} accent theme={theme} />
                </View>
              )}
            </View>

            {/* 兼职摘要条 */}
            {(save.concurrentPosts ?? []).length > 0 && (() => {
              const myPosts = CONCURRENT_POST_CONFIG.filter(p => (save.concurrentPosts ?? []).includes(p.key));
              return (
                <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.decorLine, borderLeftWidth: 3, borderLeftColor: theme.primary, padding: 10, marginTop: 10, gap: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.sectionHeaderText, fontWeight: '700', marginBottom: 3 }}>🎖️ 当前兼职职务</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {myPosts.map(p => (
                      <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 12 }}>{p.icon}</Text>
                        <Text style={{ fontSize: 11, color: theme.labelText, fontWeight: '600' }}>{p.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}
          </View>
        )}

        {/* ══ 上司关系速览 ══ */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: theme.accentSub, padding: 12, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ width: 3, height: 13, backgroundColor: theme.accentSub }} />
              <Text style={{ fontSize: 10, color: theme.valueText, fontWeight: '700', letterSpacing: 2 }}>上级关系</Text>
            </View>
            {pendingTaskCount > 0 && (
              <Pressable onPress={() => router.push('/(app)/tasks')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ backgroundColor: theme.primary, paddingHorizontal: 7, paddingVertical: 2 }}>
                  <Text style={{ color: theme.primaryText, fontSize: 9, fontWeight: '700' }}>{pendingTaskCount}项待完成</Text>
                </View>
              </Pressable>
            )}
          </View>
          {/* 直属上司 */}
          <View style={{ marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <View>
                <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>直属上司</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '700' }}>{save.bossName || RANK_CONFIG[save.rankLevel]?.bossTitle || '—'}</Text>
                  {/* 上司派系标签 */}
                  {save.bossFaction ? (
                    <View style={{
                      paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
                      backgroundColor: save.bossFaction === '改革派' ? 'rgba(30,100,220,0.15)'
                        : save.bossFaction === '实干派' ? 'rgba(30,140,60,0.15)'
                        : 'rgba(150,80,20,0.15)',
                    }}>
                      <Text style={{
                        fontSize: 10, fontWeight: '700',
                        color: save.bossFaction === '改革派' ? '#1E64DC'
                          : save.bossFaction === '实干派' ? '#1E8C3C'
                          : '#966414',
                      }}>{save.bossFaction}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 9, color: theme.mutedText }}>好感度</Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color: save.bossFavor >= 60 ? theme.statHigh : save.bossFavor >= 25 ? theme.statMid : theme.statLow }}>
                  {save.bossFavor}
                </Text>
              </View>
            </View>
            <View style={{ height: 5, backgroundColor: theme.progressBg }}>
              <View style={{ height: 5, width: `${save.bossFavor}%`, backgroundColor: save.bossFavor >= 60 ? theme.statHigh : save.bossFavor >= 25 ? theme.statMid : theme.statLow }} />
            </View>
          </View>
          {/* 上司2 */}
          {save.boss2Name ? (
            <View style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View>
                  <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>{RANK_CONFIG[save.rankLevel]?.bossTitle2 || '二级上司'}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText, fontWeight: '600', marginTop: 2 }}>{save.boss2Name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: save.boss2Favor >= 60 ? theme.statHigh : save.boss2Favor >= 25 ? theme.statMid : theme.statLow }}>
                  {save.boss2Favor}
                </Text>
              </View>
              <View style={{ height: 3, backgroundColor: theme.progressBg }}>
                <View style={{ height: 3, width: `${save.boss2Favor}%`, backgroundColor: save.boss2Favor >= 60 ? theme.statHigh : save.boss2Favor >= 25 ? theme.statMid : theme.statLow }} />
              </View>
            </View>
          ) : null}
          {/* 上司3 */}
          {save.boss3Name ? (
            <View style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View>
                  <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>{RANK_CONFIG[save.rankLevel]?.bossTitle3 || '三级上司'}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText, fontWeight: '600', marginTop: 2 }}>{save.boss3Name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: save.boss3Favor >= 60 ? theme.statHigh : save.boss3Favor >= 25 ? theme.statMid : theme.statLow }}>
                  {save.boss3Favor}
                </Text>
              </View>
              <View style={{ height: 3, backgroundColor: theme.progressBg }}>
                <View style={{ height: 3, width: `${save.boss3Favor}%`, backgroundColor: save.boss3Favor >= 60 ? theme.statHigh : save.boss3Favor >= 25 ? theme.statMid : theme.statLow }} />
              </View>
            </View>
          ) : null}
          <StatBar label="改革派声望" value={save.reformFaction} theme={theme} />
          <StatBar label="务实派声望" value={save.pragmaticFaction} theme={theme} />
        </View>
      </ScrollView>

      {/* 退休弹窗 */}
      {retirementTrigger && (
        <RetirementModal
          visible={!!retirementTrigger}
          triggerType={retirementTrigger}
          onClose={clearRetirementTrigger}
        />
      )}

      {/* 续任投票弹窗（rank14 总理第一届届满 / rank15 执政党主席每届届满） */}
      {renewalVoteTrigger && (
        <RenewalVoteModal
          visible={!!renewalVoteTrigger}
          rankLevel={renewalVoteTrigger.rankLevel}
          voteRate={renewalVoteTrigger.voteRate}
          passed={renewalVoteTrigger.passed}
          termsAfter={renewalVoteTrigger.termsAfter}
          onClose={clearRenewalVoteTrigger}
        />
      )}

      {/* 纪委约谈 / 立案审查弹窗 */}
      {disciplineWarnEvent && save && (
        <DisciplineWarnModal
          event={disciplineWarnEvent}
          onConfirm={async () => {
            const penalty = disciplineWarnEvent.meritPenalty;
            const moralDelta = disciplineWarnEvent.moralChange;
            await updateGameSave({
              meritPoints: Math.max(0, save.meritPoints - penalty),
              moralValue: Math.max(0, Math.min(100, save.moralValue + moralDelta)),
            });
            clearDisciplineWarnEvent();
          }}
        />
      )}

      {/* 路线KPI低分警告弹窗 */}
      {lineKpiWarnEvent && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', zIndex: 9000,
        }}>
          <View style={{
            backgroundColor: '#fff', margin: 24, padding: 20,
            borderRadius: 4, borderTopWidth: 4, borderTopColor: '#e67e22', maxWidth: 380,
          }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#8B4513', marginBottom: 8 }}>
              ⚠️ {lineKpiWarnEvent.line}考核预警
            </Text>
            <Text style={{ fontSize: 12, color: '#555', marginBottom: 10, lineHeight: 18 }}>
              【{lineKpiWarnEvent.dimLabel}】当前评分 {lineKpiWarnEvent.score} 分，低于合格线（40分）。
            </Text>
            <Text style={{ fontSize: 12, color: '#8B4513', marginBottom: 16, lineHeight: 18 }}>
              {lineKpiWarnEvent.warnMsg}
            </Text>
            <Pressable
              onPress={clearLineKpiWarnEvent}
              style={{ backgroundColor: '#e67e22', paddingVertical: 10, borderRadius: 4, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>知悉，立即整改</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* 贿赂收受事件弹窗 */}
      {save && !!save.pendingBriberyEvent && (
        <BriberyEventModal
          visible={!!save.pendingBriberyEvent}
          onClose={() => refreshSave()}
        />
      )}

      {/* 上司换届通知弹窗 */}
      {bossChangeEvent && (
        <BossChangeModal
          event={bossChangeEvent}
          onConfirm={clearBossChangeEvent}
        />
      )}

      {/* 秘书下放安置弹窗（升职/平调时触发） */}
      {secretaryReleaseTrigger && (
        <SecretaryReleaseModal
          trigger={secretaryReleaseTrigger}
          onConfirm={clearSecretaryReleaseTrigger}
          onSkip={clearSecretaryReleaseTrigger}
        />
      )}

      {/* 新秘书候选弹窗（rank>=3 晋升/平调后触发） */}
      {secretarySelectTrigger && save && (
        <SecretarySelectModal
          trigger={secretarySelectTrigger}
          save={save}
          onConfirm={clearSecretarySelectTrigger}
        />
      )}

      {/* 年末述职考核结果弹窗 */}
      {debriefResultTrigger && (
        <DebriefResultModal event={debriefResultTrigger} onClose={clearDebriefResultTrigger} theme={theme} />
      )}

      {/* 秘书自动施政月度通知 */}
      {secAutoGovTrigger && (
        <SecAutoGovModal event={secAutoGovTrigger} onClose={clearSecAutoGovTrigger} theme={theme} />
      )}

      {/* 部门月度事件 / 军转专属剧情 */}
      {deptMonthlyEvent && save && (
        <DeptMonthlyEventModal
          event={deptMonthlyEvent}
          save={save}
          onClose={clearDeptMonthlyEvent}
          onApplyEffects={(updates) => { void updateGameSave(updates); }}
          theme={theme}
        />
      )}

      {/* 晋升通知弹窗（届满自动晋升 / 破格晋升） */}
      {promotionReadyTrigger && (
        <PromotionReadyModal
          trigger={promotionReadyTrigger}
          onContinue={clearPromotionReadyTrigger}
          onDismiss={clearPromotionReadyTrigger}
        />
      )}

      {/* 平调通知弹窗（届满 KPI 未达标） */}
      {lateralTransferTrigger && (
        <LateralTransferModal
          trigger={lateralTransferTrigger}
          onDone={clearLateralTransferTrigger}
        />
      )}

      {/* 删除存档确认弹窗 */}
      {showDeleteConfirm && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, padding: 24, width: '82%', borderTopWidth: 3, borderTopColor: '#C82829' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#C82829', marginBottom: 8 }}>⚠️ 删除存档</Text>
            <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, marginBottom: 20 }}>
              此操作将永久删除当前存档及所有游戏数据，无法恢复。确认删除？
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, paddingVertical: 11, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center' }}
              >
                <Text style={{ color: theme.labelText, fontSize: 14, fontWeight: '600' }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteSave}
                disabled={deletingArchive}
                style={{ flex: 1, paddingVertical: 11, backgroundColor: '#C82829', alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                  {deletingArchive ? '删除中…' : '确认删除'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 下属拜访弹窗 */}
      {visitModal && save.subVisitSubName && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, padding: 22, width: '82%', borderTopWidth: 3, borderTopColor: theme.accentSub }}>
            <Text style={{ fontSize: 18, textAlign: 'center', marginBottom: 8 }}>🤝</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.sectionHeaderText, marginBottom: 6, textAlign: 'center' }}>
              下属来访
            </Text>
            <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, marginBottom: 18, textAlign: 'center' }}>
              {save.subVisitSubName} 前来拜访，希望加深与您的关系。是否接待？
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => handleVisitResponse(false)}
                style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center' }}
              >
                <Text style={{ color: theme.mutedText, fontSize: 13 }}>婉拒</Text>
              </Pressable>
              <Pressable
                onPress={() => handleVisitResponse(true)}
                style={{ flex: 1, paddingVertical: 10, backgroundColor: theme.accentSub, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>热情接待（+忠诚）</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 人脉值说明弹窗 */}
      {showNetworkModal && save && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.cardBg, width: '100%', maxWidth: 400, borderWidth: 1, borderColor: theme.cardBorder }}>
            {/* 标题 */}
            <View style={{ backgroundColor: theme.headerBg, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>🤝 人脉资源说明</Text>
              <Pressable onPress={() => setShowNetworkModal(false)}>
                <Text style={{ color: theme.headerText, fontSize: 20, lineHeight: 22 }}>×</Text>
              </Pressable>
            </View>
            <View style={{ padding: 16, gap: 14 }}>
              {/* 当前数值 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <Text style={{ fontSize: 36, fontWeight: '800', color: (save.networkValue ?? 0) >= 50 ? '#2a7a3b' : (save.networkValue ?? 0) >= 20 ? '#C87820' : theme.primary, fontVariant: ['tabular-nums'] }}>
                  {save.networkValue ?? 0}
                </Text>
                <View>
                  <Text style={{ fontSize: 12, color: theme.labelText, fontWeight: '700' }}>人脉积分</Text>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>
                    {(save.networkValue ?? 0) >= 80 ? '深厚背景' : (save.networkValue ?? 0) >= 50 ? '人脉广泛' : (save.networkValue ?? 0) >= 25 ? '有所积累' : '尚需经营'}
                  </Text>
                </View>
              </View>

              {/* 加成效果 */}
              <View style={{ backgroundColor: theme.sectionHeaderBg ?? '#F5F3EE', borderWidth: 1, borderColor: theme.cardBorder, padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700', letterSpacing: 1, marginBottom: 2 }}>▎当前人脉加成效果</Text>
                {(() => {
                  const nv = save.networkValue ?? 0;
                  const promoBonus = Math.min(16, Math.floor(nv / 25) * 2);
                  const shieldBonus = Math.min(10, Math.floor(nv / 20) * 1);
                  return (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                        <Text style={{ fontSize: 11, color: theme.labelText }}>⭐ 破格晋升概率加成</Text>
                        <View style={{ backgroundColor: promoBonus > 0 ? '#e8f5e9' : theme.sectionHeaderBg ?? '#F5F3EE', borderWidth: 1, borderColor: promoBonus > 0 ? '#2a7a3b' : theme.cardBorder, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: promoBonus > 0 ? '#2a7a3b' : theme.mutedText }}>+{promoBonus}%</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                        <Text style={{ fontSize: 11, color: theme.labelText }}>🛡 纪委调查风险降低</Text>
                        <View style={{ backgroundColor: shieldBonus > 0 ? '#e8f0ff' : theme.sectionHeaderBg ?? '#F5F3EE', borderWidth: 1, borderColor: shieldBonus > 0 ? '#5B4AA0' : theme.cardBorder, paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: shieldBonus > 0 ? '#5B4AA0' : theme.mutedText }}>-{shieldBonus}%</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.labelText }}>🔒 高人脉事件可解锁</Text>
                        <Text style={{ fontSize: 11, color: theme.mutedText }}>多个专属选项</Text>
                      </View>
                    </>
                  );
                })()}
              </View>

              {/* 计算公式 */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 10, color: theme.mutedText, letterSpacing: 0.5 }}>▎加成计算规则</Text>
                <Text style={{ fontSize: 10, color: theme.mutedText, lineHeight: 18 }}>
                  · 破格晋升：每 25 点人脉 +2%，上限 +16%{'\n'}
                  · 纪委风险：每 20 点人脉 -1%，上限 -10%
                </Text>
              </View>

              {/* 来源说明 */}
              <View style={{ gap: 4 }}>
                <Text style={{ fontSize: 10, color: theme.mutedText, letterSpacing: 0.5 }}>▎人脉积分来源</Text>
                <Text style={{ fontSize: 10, color: theme.mutedText, lineHeight: 18 }}>
                  · 军转干部：初始 +15 点{'\n'}
                  · 选调生：初始 +10 点{'\n'}
                  · 月度事件特定选项（老首长、校友会等）{'\n'}
                  · 述职汇报部分奖励
                </Text>
              </View>

              <Pressable
                onPress={() => setShowNetworkModal(false)}
                style={{ backgroundColor: theme.primary, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>知悉</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 月度工作报告弹窗 */}
      {showReportModal && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, width: '90%', maxHeight: '75%' }}>
            <View style={{ backgroundColor: theme.headerBg, padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 15 }}>📋 月度工作报告</Text>
              <Pressable onPress={async () => {
                if (save) {
                  const monthKey = Math.floor(save.gameDays / 30);
                  await markReportsRead(save.id, monthKey);
                  clearUnreadReports();
                }
                setShowReportModal(false);
              }}>
                <Text style={{ color: theme.headerSub, fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              {unreadReports.length === 0 ? (
                <Text style={{ color: theme.mutedText, textAlign: 'center', padding: 20 }}>暂无新报告</Text>
              ) : unreadReports.map(r => (
                <View key={r.id} style={{ borderWidth: 1, borderColor: theme.cardBorder, borderLeftWidth: 3, borderLeftColor: theme.accentSub, padding: 12 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.sectionHeaderText, marginBottom: 4 }}>{r.title}</Text>
                  <Text style={{ fontSize: 11, color: theme.labelText, lineHeight: 18, marginBottom: 8 }}>{r.content}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {r.gdpChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>GDP +{r.gdpChange.toFixed(1)}</Text></View>}
                    {r.livelihoodChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>民生 +{r.livelihoodChange.toFixed(1)}</Text></View>}
                    {r.ecologyChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>生态 +{r.ecologyChange.toFixed(1)}</Text></View>}
                    {r.businessChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>营商 +{r.businessChange.toFixed(1)}</Text></View>}
                    <View style={{ backgroundColor: theme.sectionHeaderBg, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: theme.sectionHeaderText }}>政绩 +{r.meritReward}</Text></View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <Pressable
              onPress={async () => {
                if (save) {
                  const monthKey = Math.floor(save.gameDays / 30);
                  await markReportsRead(save.id, monthKey);
                  clearUnreadReports();
                }
                setShowReportModal(false);
                router.push('/(app)/monthly-report');
              }}
              style={{ backgroundColor: theme.headerBg, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 13 }}>查看全部报告 ›</Text>
            </Pressable>
          </View>
        </View>
      )}
      {/* 月度会议任务结算通知条 */}
      {!!meetingTaskFeedback && (
        <Pressable
          onPress={clearMeetingTaskFeedback}
          style={{ position: 'absolute', bottom: 80, left: 16, right: 16, backgroundColor: theme.headerBg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderLeftWidth: 3, borderLeftColor: theme.accent }}
        >
          <Text style={{ color: theme.headerText, fontSize: 12, flex: 1, lineHeight: 18 }}>{meetingTaskFeedback}</Text>
          <Text style={{ color: theme.headerSub, fontSize: 16 }}>×</Text>
        </Pressable>
      )}

      {/* 上级来访考察弹窗 */}
      {upperInspectEvent && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: theme.cardBg, width: '90%' }}>
            {/* 标题 */}
            <View style={{
              backgroundColor: upperInspectEvent.result === 'excellent' ? '#1a4a2e' :
                upperInspectEvent.result === 'good' ? theme.headerBg :
                upperInspectEvent.result === 'pass' ? '#5a4010' : '#7a1a1a',
              padding: 14,
            }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>上级单位 · 来访考察</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 2 }}>
                {upperInspectEvent.result === 'excellent' ? '🏅' :
                  upperInspectEvent.result === 'good' ? '📋' :
                  upperInspectEvent.result === 'pass' ? '⚠️' : '🚨'} {upperInspectEvent.resultLabel}
              </Text>
            </View>
            {/* 考察官信息 */}
            <View style={{ padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                <View style={{ width: 44, height: 44, backgroundColor: theme.accentSub, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 22 }}>👔</Text>
                </View>
                <View>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.sectionHeaderText }}>{upperInspectEvent.inspectorName}</Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>{upperInspectEvent.inspectorTitle}</Text>
                </View>
                <View style={{ marginLeft: 'auto' }}>
                  <View style={{ backgroundColor: theme.sectionHeaderBg, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: theme.sectionHeaderText, fontWeight: '600' }}>考察重点：{upperInspectEvent.focusLabel}</Text>
                  </View>
                </View>
              </View>
              {/* 考察意见 */}
              <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: upperInspectEvent.result === 'fail' ? theme.statLow : theme.accentSub }}>
                {upperInspectEvent.comment}
              </Text>
              {/* 奖惩结果 */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: upperInspectEvent.meritDelta >= 0 ? '#e8f5e9' : '#fff5f5', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: upperInspectEvent.meritDelta >= 0 ? '#c8e6c9' : '#ffcdd2' }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>政绩变动</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: upperInspectEvent.meritDelta >= 0 ? '#2a7a3b' : '#C82829', marginTop: 2 }}>
                    {upperInspectEvent.meritDelta >= 0 ? '+' : ''}{upperInspectEvent.meritDelta}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: upperInspectEvent.favorDelta >= 0 ? '#e8f5e9' : '#fff5f5', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: upperInspectEvent.favorDelta >= 0 ? '#c8e6c9' : '#ffcdd2' }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>上司好感</Text>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: upperInspectEvent.favorDelta >= 0 ? '#2a7a3b' : '#C82829', marginTop: 2 }}>
                    {upperInspectEvent.favorDelta >= 0 ? '+' : ''}{upperInspectEvent.favorDelta}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => clearUpperInspectEvent()}
                style={{ backgroundColor: theme.headerBg, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
              >
                <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 13 }}>收悉考察结果</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* ── 头像弹窗：仕途档案 ── */}
      {showAvatarModal && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#F5F4F1', width: '100%', maxWidth: 400, borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' }}>

            {/* ── 头部 ── */}
            <View style={{ backgroundColor: theme.headerBg, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' }}>
                <Text style={{ fontSize: 20 }}>{avatarEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700', letterSpacing: 0.3 }}>{save.playerName}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 1 }}>
                  {save.playerGender} · {save.playerAge}岁 · {save.rankName}
                </Text>
              </View>
              <Pressable onPress={() => setShowAvatarModal(false)} hitSlop={14} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 18, fontWeight: '300' }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* ── 数据概览 ── */}
              <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 2, gap: 6 }}>
                {/* 4项数据横排 */}
                <View style={{ flexDirection: 'row', gap: 5 }}>
                  {[
                    { label: '在职', value: `${Math.floor(save.gameDays / 365)}年`, color: theme.headerBg },
                    { label: '政绩', value: `${Math.round(save.meritPoints)}`, color: '#2a7a3b' },
                    { label: '道德', value: `${save.moralValue}`, color: save.moralValue < 30 ? '#C82829' : save.moralValue < 60 ? '#C87820' : '#2a7a3b' },
                    { label: '存款', value: `¥${(save.personalSavings / 10000).toFixed(0)}万`, color: '#7B3F00' },
                  ].map(item => (
                    <View key={item.label} style={{ flex: 1, backgroundColor: '#FEFCF8', borderWidth: 1, borderColor: '#E4DFDA', borderRadius: 5, paddingVertical: 7, alignItems: 'center' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: item.color, lineHeight: 17 }}>{item.value}</Text>
                      <Text style={{ fontSize: 9, color: '#999', marginTop: 1 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                {/* 职务一行 */}
                <View style={{ backgroundColor: '#FEFCF8', borderWidth: 1, borderColor: '#E4DFDA', borderRadius: 5, paddingHorizontal: 10, paddingVertical: 7, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 10 }}>🏛️</Text>
                  <Text style={{ fontSize: 11, color: '#1A2B3C', fontWeight: '600', flex: 1 }} numberOfLines={1}>
                    {save.cityName} · {save.rankName}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#AAA' }}>任期{save.tenureYears}年</Text>
                </View>
              </View>

              <View style={{ paddingHorizontal: 12, paddingBottom: 12, paddingTop: 8, gap: 7 }}>
                {/* ── 游玩攻略（可折叠） ── */}
                <View style={{ borderWidth: 1, borderColor: '#D4BC74', borderRadius: 5, backgroundColor: '#FFFBEF', overflow: 'hidden' }}>
                  <Pressable
                    onPress={() => setGuideExpanded(v => !v)}
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 }}
                    android_ripple={{ color: 'rgba(200,168,75,0.12)' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Text style={{ fontSize: 12 }}>📜</Text>
                      <Text style={{ fontSize: 11, color: '#7B5200', fontWeight: '700', letterSpacing: 0.5 }}>官方游玩攻略</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#C8A84B', fontWeight: '600' }}>{guideExpanded ? '∧ 收起' : '∨ 展开'}</Text>
                  </Pressable>
                  {guideExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#EFE0A0', paddingHorizontal: 10, paddingBottom: 10, paddingTop: 8, gap: 6 }}>
                      {[
                        { icon: '🎯', title: '新手入门', tip: '优先完成上司交办任务，快速积累政绩。任期前3年务必拉满GDP和民生，为KPI达标打好基础。' },
                        { icon: '📊', title: 'KPI考核', tip: 'GDP、民生、生态、营商四项均衡发展，任意一项过低触发一票否决。道德值保持60+，防止被纪委约谈。' },
                        { icon: '🤝', title: '维系关系', tip: '三位上司好感度均保持在70分以上。每逢节庆拜访，参与重要会议，不可轻易驳回上级指令。' },
                        { icon: '🛤️', title: '晋升路线', tip: '党务路线晋升快但波动大；行政路线稳健；纪检路线考核严苛但政绩加成高；团派路线需优先拉派系关系。' },
                        { icon: '💰', title: '资金管理', tip: '月供不超资金余额30%，切勿过度举债。招商投资优先高ROI项目，营商指数累积提升税收。' },
                        { icon: '⚠️', title: '避坑指南', tip: '连续两届KPI不达标将触发强制退休！道德值归零或连续重大事故直接Game Over，请务必谨慎行事。' },
                      ].map(item => (
                        <View key={item.icon} style={{ flexDirection: 'row', gap: 7, alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 12, lineHeight: 17, marginTop: 1 }}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, color: '#7B5200', fontWeight: '700', marginBottom: 1 }}>{item.title}</Text>
                            <Text style={{ fontSize: 9, color: '#7A6030', lineHeight: 14 }}>{item.tip}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                {/* ── 仕途历程时间线 ── */}
                {(() => {
                  const careerHistory = save.playerCareerHistory ?? [];
                  if (careerHistory.length === 0) return null;
                  return (
                    <View style={{ borderWidth: 1, borderColor: '#DDD8CF', borderRadius: 5, overflow: 'hidden', backgroundColor: '#FEFCF8' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#F5F3EF', borderBottomWidth: 1, borderBottomColor: '#EEE9E3' }}>
                        <Text style={{ fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.5, flex: 1 }}>📋 仕途历程</Text>
                        <Text style={{ fontSize: 9, color: '#AAA' }}>{careerHistory.length} 段任职记录</Text>
                      </View>
                      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                        {careerHistory.map((item, idx) => {
                          const rankColor = item.rankLevel >= 12 ? '#C0392B' : item.rankLevel >= 9 ? '#8B44AC' : item.rankLevel >= 6 ? '#1A5F8A' : item.rankLevel >= 3 ? '#2a7a3b' : '#666';
                          const isLast = idx === careerHistory.length - 1;
                          const startYear = item.startDay != null ? Math.floor(item.startDay / 365) + 2000 : null;
                          const endYear = item.endDay != null ? Math.floor(item.endDay / 365) + 2000 : null;
                          return (
                            <View key={idx} style={{ flexDirection: 'row', gap: 8 }}>
                              {/* 时间轴 */}
                              <View style={{ alignItems: 'center', width: 16 }}>
                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: rankColor, borderWidth: 2, borderColor: '#F5F3EF', marginTop: 3, zIndex: 1 }} />
                                {!isLast && <View style={{ width: 2, flex: 1, backgroundColor: '#DDD8CF', marginTop: 2, minHeight: 16 }} />}
                              </View>
                              {/* 内容 */}
                              <View style={{ flex: 1, paddingBottom: isLast ? 0 : 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                                  <View style={{ backgroundColor: rankColor, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 }}>
                                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>R{item.rankLevel}</Text>
                                  </View>
                                  <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700' }}>{item.position}</Text>
                                </View>
                                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                                  {'📍 '}{item.city}
                                  {startYear != null ? `  ${startYear}年` : ''}
                                  {endYear != null ? ` — ${endYear}年` : (isLast ? ' — 至今' : '')}
                                </Text>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })()}

                {/* ── 多存档系统 ── */}
                <View style={{ borderWidth: 1, borderColor: '#DDD8CF', borderRadius: 5, overflow: 'hidden', backgroundColor: '#FEFCF8' }}>
                  {/* 标题行 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EEE9E3', backgroundColor: '#F5F3EF' }}>
                    <Text style={{ fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.5 }}>💾 存档管理</Text>
                    {saveSlotsLoading && <ActivityIndicator size="small" color="#999" />}
                  </View>
                  {/* 槽位列表 */}
                  {[1, 2, 3].map((slotNum, idx) => {
                    const slot = saveSlots.find(s => s.slotNumber === slotNum);
                    const isOp = slotOpLoading === slotNum;
                    const isConfirming = loadConfirmSlot === slotNum;
                    const isRenaming = renamingSlot === slotNum;
                    return (
                      <View key={slotNum} style={{
                        borderTopWidth: idx > 0 ? 1 : 0, borderTopColor: '#EDEAE5',
                        backgroundColor: isConfirming ? '#FFF5F5' : idx % 2 === 0 ? '#FEFCF8' : '#FAF9F6',
                      }}>
                        {/* 主行 */}
                        <View style={{
                          flexDirection: 'row', alignItems: 'center', gap: 6,
                          paddingHorizontal: 10, paddingVertical: 7,
                        }}>
                          {/* 序号徽标 */}
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: slot ? theme.headerBg : '#DDD8CF', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 9, color: slot ? '#fff' : '#999', fontWeight: '700' }}>{slotNum}</Text>
                          </View>
                          {/* 描述 */}
                          <View style={{ flex: 1, minWidth: 0 }}>
                            {slot ? (
                              <>
                                <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '600' }} numberOfLines={1}>
                                  {slot.slotName || `${slot.rankName}·${slot.cityName}`}
                                </Text>
                                <Text style={{ fontSize: 9, color: '#AAA', marginTop: 1 }}>
                                  {slot.rankName} · {slot.cityName} · 第{Math.floor(slot.gameDays / 365) + 1}年 · {new Date(slot.updatedAt).toLocaleDateString('zh-CN')}
                                </Text>
                              </>
                            ) : (
                              <Text style={{ fontSize: 10, color: '#CCC' }}>— 空槽位</Text>
                            )}
                          </View>
                          {/* 操作按钮组 */}
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {slot && (
                              <Pressable
                                onPress={() => { setRenamingSlot(isRenaming ? null : slotNum); setRenameText(slot.slotName || ''); }}
                                disabled={isOp}
                                style={{ backgroundColor: isRenaming ? 'rgba(255,184,0,0.18)' : '#EDE8E2', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4 }}
                                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                              >
                                <Text style={{ color: isRenaming ? '#B8860B' : '#888', fontSize: 9, fontWeight: '700' }}>改名</Text>
                              </Pressable>
                            )}
                            <Pressable
                              onPress={() => void handleWriteSlot(slotNum as 1 | 2 | 3)}
                              disabled={isOp}
                              style={{ backgroundColor: isOp ? '#D0CCC8' : '#1D3B5E', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                            >
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{isOp ? '…' : '存档'}</Text>
                            </Pressable>
                            {slot && (
                              <Pressable
                                onPress={() => void handleLoadSlot(slotNum as 1 | 2 | 3)}
                                disabled={isOp}
                                style={{ backgroundColor: isOp ? '#D0CCC8' : isConfirming ? '#C82829' : '#2a7a3b', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 }}
                                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                              >
                                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{isConfirming ? '确认?' : '载入'}</Text>
                              </Pressable>
                            )}
                            {slot && (
                              <Pressable
                                onPress={() => void handleDeleteSlot(slotNum as 1 | 2 | 3)}
                                disabled={isOp}
                                style={{ backgroundColor: isOp ? '#E0DCd8' : '#EDE8E2', borderRadius: 4, paddingHorizontal: 7, paddingVertical: 4 }}
                                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}
                              >
                                <Text style={{ color: '#999', fontSize: 9, fontWeight: '700' }}>删</Text>
                              </Pressable>
                            )}
                          </View>
                        </View>
                        {/* 改名行内展开区 */}
                        {isRenaming && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 8, gap: 6 }}>
                            <TextInput
                              value={renameText}
                              onChangeText={setRenameText}
                              placeholder="输入新存档名称…"
                              placeholderTextColor="#BBB"
                              maxLength={30}
                              style={{ flex: 1, fontSize: 11, color: '#1D3B5E', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: '#FFFDF6' }}
                            />
                            <Pressable
                              onPress={() => void handleRenameSlot(slotNum, renameText)}
                              style={{ backgroundColor: 'rgba(255,184,0,0.15)', borderWidth: 1, borderColor: 'rgba(255,184,0,0.4)', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 }}
                            >
                              <Text style={{ color: '#B8860B', fontSize: 10, fontWeight: '700' }}>确定</Text>
                            </Pressable>
                            <Pressable onPress={() => setRenamingSlot(null)} style={{ paddingHorizontal: 6, paddingVertical: 5 }}>
                              <Text style={{ color: '#AAA', fontSize: 10 }}>取消</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                  {slotMsg !== '' && (
                    <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#EDEAE5' }}>
                      <Text style={{ fontSize: 10, color: slotMsg.startsWith('✅') ? '#2a7a3b' : slotMsg.startsWith('⚠️') ? '#C87820' : '#C82829', fontWeight: '600' }}>
                        {slotMsg}
                      </Text>
                    </View>
                  )}
                </View>

                {/* ── 兑换码 ── */}
                <View style={{ borderWidth: 1, borderColor: '#DDD8CF', borderRadius: 5, overflow: 'hidden', backgroundColor: '#FEFCF8' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#EEE9E3', backgroundColor: '#F5F3EF' }}>
                    <Text style={{ fontSize: 10 }}>🎟️</Text>
                    <Text style={{ fontSize: 10, color: '#666', fontWeight: '700', letterSpacing: 0.5 }}>兑换码</Text>
                  </View>
                  <View style={{ paddingHorizontal: 10, paddingVertical: 8, gap: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <TextInput
                        value={redeemCode}
                        onChangeText={t => { setRedeemCode(t); setRedeemMsg(''); }}
                        placeholder="请输入兑换码"
                        placeholderTextColor="#CCC"
                        autoCapitalize="none"
                        style={{ flex: 1, borderWidth: 1, borderColor: '#D8D3CC', borderRadius: 4, paddingHorizontal: 9, paddingVertical: 6, fontSize: 12, color: '#333', backgroundColor: '#FEFCF8' }}
                      />
                      <Pressable
                        disabled={redeemLoading}
                        onPress={async () => {
                          if (!save) return;
                          const code = redeemCode.trim();
                          if (!code) return;
                          setRedeemLoading(true);
                          setRedeemMsg('');
                          try {
                            const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
                            const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
                            const resp = await fetch(`${supabaseUrl}/functions/v1/use-redeem-code`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${anonKey}`,
                                apikey: anonKey,
                              },
                              body: JSON.stringify({ code: code.toUpperCase(), saveId: save.id }),
                            });
                            const json = await resp.json() as { success: boolean; message: string };
                            setRedeemMsg(json.message ?? (json.success ? '✅ 兑换成功' : '❌ 兑换失败'));
                            if (json.success) {
                              setRedeemCode('');
                              await refreshSave();
                            }
                          } catch {
                            setRedeemMsg('❌ 网络错误，请重试');
                          }
                          setRedeemLoading(false);
                        }}
                        style={{ backgroundColor: redeemLoading ? '#CCC' : theme.headerBg, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 6 }}
                      >
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{redeemLoading ? '…' : '确认'}</Text>
                      </Pressable>
                    </View>
                    {redeemMsg !== '' && (
                      <Text style={{ fontSize: 10, color: redeemMsg.startsWith('✅') ? '#2a7a3b' : '#C82829', fontWeight: '600' }}>{redeemMsg}</Text>
                    )}
                  </View>
                </View>

                {/* ── 底部操作行 ── */}
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <Pressable
                    onPress={() => { setShowAvatarModal(false); setShowRestartSummary(true); }}
                    style={{ flex: 1, backgroundColor: '#8B1A1A', borderRadius: 5, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ fontSize: 12 }}>🔁</Text>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 }}>重开仕途</Text>
                  </Pressable>
                  {isAdmin && (
                    <Pressable
                      onPress={() => { setShowAvatarModal(false); router.push('/(app)/admin-panel' as never); }}
                      style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, backgroundColor: '#0D1F35', borderRadius: 5, borderWidth: 1, borderColor: '#C8A84B' }}
                      android_ripple={{ color: 'rgba(200,168,75,0.15)' }}
                    >
                      <Text style={{ fontSize: 12 }}>🛡</Text>
                      <Text style={{ color: '#C8A84B', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 }}>后台管理</Text>
                    </Pressable>
                  )}
                </View>

                <Pressable
                  onPress={() => setShowAvatarModal(false)}
                  style={{ paddingVertical: 9, alignItems: 'center', borderRadius: 5, borderWidth: 1, borderColor: '#D5D0C8' }}
                  android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                >
                  <Text style={{ color: '#999', fontSize: 12 }}>关 闭</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      )}

      {/* ── 仕途总结 + 重开确认弹窗 ── */}
      {showRestartSummary && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.72)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <View style={{ backgroundColor: '#F5F4F1', width: '100%', maxHeight: '88%', borderTopWidth: 4, borderTopColor: '#8B1A1A' }}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* 总结档案头 */}
              <View style={{ backgroundColor: '#1A0A0A', paddingVertical: 16, paddingHorizontal: 20, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 4 }}>仕途总结</Text>
                <Text style={{ color: '#E8D5A0', fontSize: 22, fontWeight: '700', letterSpacing: 6, marginTop: 4, fontFamily: 'serif' }}>
                  干部档案
                </Text>
                <View style={{ height: 1, width: 60, backgroundColor: '#C8A84B', marginTop: 8 }} />
              </View>

              <View style={{ padding: 16, gap: 12 }}>
                {/* 人员信息卡 */}
                <View style={{ borderWidth: 1, borderColor: '#8B1A1A', padding: 14, backgroundColor: '#FEFCF8' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E8E0D0' }}>
                    <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#8B1A1A' }}>
                      <Text style={{ fontSize: 28 }}>{avatarEmoji}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', fontFamily: 'serif' }}>
                        {save.playerName} 同志
                      </Text>
                      <Text style={{ fontSize: 11, color: '#666', marginTop: 3 }}>
                        {save.playerGender} · {save.playerAge} 岁 · {save.school ?? ''}
                      </Text>
                    </View>
                  </View>
                  {/* 仕途数据表 */}
                  <View style={{ gap: 0, marginTop: 4 }}>
                    {[
                      { label: '最终职级', value: save.rankName, color: '#8B1A1A' },
                      { label: '任职城市', value: save.cityName },
                      { label: '仕途年数', value: `${Math.floor(save.gameDays / 365)} 年` },
                      { label: '政绩积分', value: `${Math.round(save.meritPoints).toLocaleString()} 分` },
                      { label: '道德指数', value: `${save.moralValue} / 100`, color: save.moralValue < 20 ? '#C82829' : save.moralValue < 40 ? '#C87820' : '#2a7a3b' },
                      { label: '任期起止', value: `${gameDaysToDate(0)} — ${gameDaysToDate(save.gameDays)}` },
                      { label: '个人存款', value: `¥ ${(save.personalSavings / 10000).toFixed(1)} 万元` },
                    ].map(row => (
                      <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#F0EAE0' }}>
                        <Text style={{ fontSize: 12, color: '#888' }}>{row.label}</Text>
                        <Text style={{ fontSize: 13, color: row.color ?? '#1D3557', fontWeight: '600' }}>{row.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 历史评价 */}
                <View style={{ borderWidth: 1, borderColor: '#D0C8B8', backgroundColor: '#FEFCF8' }}>
                  <View style={{ backgroundColor: '#3C3228', paddingVertical: 8, paddingHorizontal: 14 }}>
                    <Text style={{ color: '#D4B896', fontSize: 11, fontWeight: '700', letterSpacing: 2 }}>历史评价</Text>
                  </View>
                  <View style={{ padding: 14 }}>
                    <Text style={{ fontSize: 13, color: '#444', lineHeight: 22, fontStyle: 'italic', fontFamily: 'serif', textAlign: 'center' }}>
                      「{save.meritPoints > 8000
                        ? '勤勉为民，政绩斐然，留名青史，后人当继。'
                        : save.meritPoints > 3000
                          ? '任职一方，兢兢业业，虽有遗憾，亦属尽责之官。'
                          : save.moralValue < 30
                            ? '廉洁防线失守，德行有亏，此仕途引以为戒，重拾初心再出发。'
                            : '宦海沉浮，经此磨砺，方知为官之难。人生如棋，重开亦是新局。'}」
                    </Text>
                  </View>
                </View>

                {/* 重开说明 */}
                <View style={{ backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#E8C87A', padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#7B5E2A', lineHeight: 18 }}>
                    ⚠️ 确认重开后，本届存档将永久删除，回到<Text style={{ fontWeight: '700' }}>干部履历登记表</Text>重新填写个人信息，开启新的仕途历程。
                  </Text>
                </View>

                {/* 操作按钮 */}
                <View style={{ flexDirection: 'row', gap: 10, paddingBottom: 8 }}>
                  <Pressable
                    onPress={() => setShowRestartSummary(false)}
                    style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#C8C0B0', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#666', fontSize: 14 }}>取消</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => { void handleRestartGame(); }}
                    disabled={restartLoading}
                    style={{ flex: 2, backgroundColor: restartLoading ? '#aaa' : '#8B1A1A', paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    {restartLoading
                      ? <ActivityIndicator size="small" color="#fff" />
                      : null
                    }
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                      {restartLoading ? '处理中…' : '确认重开，另起炉灶'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      )}
      {/* ── 全国性舆情事件弹窗（r15p2问责 / r15d1扫黑收网触发） ── */}
      {showOpinionEvent && save?.pendingOpinionEvent && (() => {
        const ev = save.pendingOpinionEvent!;
        const isPurge   = ev.type === 'party_purge';
        const headerBg  = isPurge ? '#6A0000' : '#1A3A20';
        const accentClr = isPurge ? '#FF9090' : '#80E0A0';
        const tagBg     = isPurge ? '#3A0000' : '#0A2A10';
        const tagBorder = isPurge ? '#8B0000' : '#1B6A30';
        const topLabel  = isPurge
          ? '执政党中央委员会 · 全国政治舆论动态'
          : '联邦政法委 · 全国法治舆论热点';
        const newsItems = isPurge ? [
          { icon: '📰', src: '联邦官方媒体',   text: '中央决定对相关责任人启动最高级别问责，此举彰显执政党以铁腕净化自身的坚定决心。' },
          { icon: '📡', src: '境外主流媒体',   text: '国际社会密切关注此次问责，分析人士认为这是执政层高层权力格局深度调整的信号。' },
          { icon: '💬', src: '网络舆情热词',   text: '#反腐问责 #政治局风云 #清廉政治 登上全国舆论热搜榜前三，话题阅读量破亿。' },
          { icon: '🧑‍🤝‍🧑', src: '民间舆论感知', text: '多数民众对此次问责表示支持，但也有部分观察者对后续高层稳定性保持审慎态度。' },
        ] : [
          { icon: '📰', src: '联邦官方媒体',   text: '全国扫黑专项收网行动宣告圆满成功，公安机关披露多起大案细节，引发广泛关注。' },
          { icon: '📡', src: '各省地方媒体',   text: '各省公安厅同步发布收网战报，彰显联邦政法体系高效协同作战能力与立体打击优势。' },
          { icon: '💬', src: '网络舆情热词',   text: '#扫黑除恶 #法治中国 #平安建设 三大话题刷屏，全国民众踊跃为行动喝彩点赞。' },
          { icon: '🧑‍🤝‍🧑', src: '民间舆论感知', text: '民众安全感显著提升，社区微信群大量转发捷报，基层干部群众反映社会秩序明显改善。' },
        ];
        const bonusText = isPurge
          ? '安全指数 +10  道德指数 +8  政绩 ×1.8（专权行动已结算）'
          : '安全指数 +14  民生指数 +5  道德 +4  政绩 ×1.8（专权行动已结算）';
        return (
          <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <View style={{ backgroundColor: '#0A0A0A', width: '100%', maxWidth: 420, borderWidth: 1, borderColor: accentClr + '40', overflow: 'hidden' }}>
              {/* 顶部标识 */}
              <View style={{ backgroundColor: headerBg, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: accentClr, fontSize: 8, letterSpacing: 3, fontWeight: '700' }}>{topLabel.toUpperCase()}</Text>
                <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: accentClr, fontSize: 7, fontWeight: '700', letterSpacing: 2 }}>BREAKING NEWS</Text>
                </View>
              </View>
              {/* 标题 */}
              <View style={{ padding: 16, gap: 6, borderBottomWidth: 1, borderBottomColor: accentClr + '20' }}>
                <Text style={{ color: accentClr, fontWeight: '900', fontSize: 16, lineHeight: 22 }}>{ev.title}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, lineHeight: 17 }}>{ev.desc}</Text>
              </View>
              {/* 新闻信息流 */}
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, letterSpacing: 2 }}>全国媒体舆论快报</Text>
                {newsItems.map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, backgroundColor: tagBg, padding: 10, borderWidth: 1, borderColor: tagBorder }}>
                    <Text style={{ fontSize: 16, lineHeight: 20 }}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: accentClr, fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 3 }}>{item.src}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, lineHeight: 16 }}>{item.text}</Text>
                    </View>
                  </View>
                ))}
              </View>
              {/* 奖励结算条 */}
              <View style={{ backgroundColor: tagBg, borderTopWidth: 1, borderTopColor: accentClr + '30', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 12 }}>📊</Text>
                <Text style={{ color: accentClr, fontSize: 10, flex: 1, lineHeight: 15 }}>{bonusText}</Text>
              </View>
              {/* 关闭按钮 */}
              <Pressable
                onPress={() => { void handleDismissOpinionEvent(); }}
                android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
                style={{ backgroundColor: headerBg, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: accentClr, fontWeight: '800', fontSize: 13, letterSpacing: 2 }}>
                  已阅  ·  继续执政
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })()}

      {/* ── 升级解锁弹窗 ── */}
      <Modal
        visible={!!unlockModal}
        transparent
        animationType="fade"
        onRequestClose={() => setUnlockModal(null)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#7C3AED', padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🎉</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF', textAlign: 'center' }}>职级晋升！新功能已解锁</Text>
              <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, textAlign: 'center' }}>
                以下功能现已向您开放，请前往对应页面体验
              </Text>
            </View>
            <ScrollView style={{ maxHeight: 340 }} contentContainerStyle={{ padding: 16, gap: 10 }}>
              {(unlockModal?.features ?? []).map((feat: { icon: string; label: string; desc: string }, i: number) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <Text style={{ fontSize: 22, marginRight: 10 }}>{feat.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#4C1D95' }}>{feat.label}</Text>
                    <Text style={{ fontSize: 12, color: '#6D28D9', marginTop: 2 }}>{feat.desc}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <View style={{ padding: 16 }}>
              <Pressable
                onPress={() => setUnlockModal(null)}
                style={{ backgroundColor: '#7C3AED', borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>知道了，前去体验！</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── 年末述职考核结果弹窗 ─────────────────────────────────────────────────────
function DebriefResultModal({
  event, onClose, theme,
}: { event: DebriefResultEvent; onClose: () => void; theme: ReturnType<typeof getRankThemeWithLine> }) {
  const { passed, keyLabel, targetValue, currentValue, bonusBefore, bonusAfter } = event;
  const bonusDelta = bonusAfter - bonusBefore;
  const bonusDeltaSign = bonusDelta > 0 ? '+' : '';
  const progressPct = Math.min(100, Math.round((currentValue / Math.max(1, targetValue)) * 100));
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ backgroundColor: theme.cardBg, width: '88%', borderTopWidth: 4, borderTopColor: passed ? '#1a8a3c' : '#C82829' }}>
        {/* 标题行 */}
        <View style={{ backgroundColor: passed ? '#0e4d20' : '#6b0e0e', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 22 }}>{passed ? '🏆' : '📋'}</Text>
          <View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 }}>
              年度述职考核{passed ? '·达标' : '·未达标'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 2 }}>
              {passed ? '核心指标顺利完成，上级予以肯定' : '核心指标未达目标，需加强工作力度'}
            </Text>
          </View>
        </View>
        {/* 考核指标卡片 */}
        <View style={{ padding: 16, gap: 12 }}>
          <View style={{ backgroundColor: theme.progressBg, padding: 12, gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.labelText, fontSize: 12, fontWeight: '600' }}>考核指标：{keyLabel}</Text>
              <Text style={{ color: passed ? '#1a8a3c' : '#C82829', fontSize: 12, fontWeight: '700' }}>
                {passed ? '✅ 已达标' : '❌ 未达标'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: theme.mutedText, fontSize: 11 }}>目标值：<Text style={{ color: theme.valueText, fontWeight: '700' }}>{targetValue}</Text></Text>
              <Text style={{ color: theme.mutedText, fontSize: 11 }}>实际值：<Text style={{ color: passed ? '#1a8a3c' : '#C82829', fontWeight: '700' }}>{currentValue}</Text></Text>
            </View>
            {/* 进度条 */}
            <View style={{ height: 6, backgroundColor: theme.cardBorder, borderRadius: 3 }}>
              <View style={{ height: 6, width: `${progressPct}%`, backgroundColor: passed ? '#1a8a3c' : '#C82829', borderRadius: 3 }} />
            </View>
          </View>
          {/* 破格晋升概率变化 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.progressBg, padding: 10 }}>
            <Text style={{ color: theme.mutedText, fontSize: 11 }}>破格晋升概率调整</Text>
            <Text style={{ fontSize: 13, fontWeight: '700', color: bonusDelta >= 0 ? '#1a8a3c' : '#C82829' }}>
              {(bonusBefore * 100).toFixed(0)}%  →  {(bonusAfter * 100).toFixed(0)}%
              {'  '}
              <Text style={{ fontSize: 11 }}>({bonusDeltaSign}{(bonusDelta * 100).toFixed(0)}%)</Text>
            </Text>
          </View>
          {/* 提示语 */}
          <Text style={{ color: theme.mutedText, fontSize: 11, lineHeight: 17, textAlign: 'center' }}>
            {passed
              ? '述职达标将小幅提升届满破格晋升概率，继续保持优秀表现。'
              : '述职未达标将降低破格晋升机会，请尽快提升相关城市指标。'}
          </Text>
        </View>
        {/* 关闭按钮 */}
        <Pressable
          onPress={onClose}
          style={{ backgroundColor: passed ? '#1a8a3c' : '#8a1a1a', paddingVertical: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 2 }}>
            {passed ? '再接再厉  ·  继续执政' : '知悉  ·  奋发图强'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── 秘书自动施政月度通知弹窗 ─────────────────────────────────────────────────
function SecAutoGovModal({
  event, onClose, theme,
}: { event: SecAutoGovEvent; onClose: () => void; theme: ReturnType<typeof getRankThemeWithLine> }) {
  const { abilityTier, probPct, consecutiveMonths, isLimit } = event;
  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ backgroundColor: theme.cardBg, width: '84%', borderTopWidth: 3, borderTopColor: isLimit ? '#C87629' : '#2B7DC8' }}>
        <View style={{ backgroundColor: isLimit ? '#6b3a0e' : '#0e2e6b', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{isLimit ? '⚠️' : '📂'}</Text>
          <View>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
              {isLimit ? '秘书提醒：本月需亲自施政' : '秘书代办施政完成'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 }}>
              {isLimit ? `已连续由秘书施政 5 个月，请本月亲自施政` : `能力 ${abilityTier}·触发概率 ${probPct}%·连续第 ${consecutiveMonths} 月`}
            </Text>
          </View>
        </View>
        <View style={{ padding: 14, gap: 8 }}>
          {isLimit ? (
            <Text style={{ color: theme.labelText, fontSize: 13, lineHeight: 20 }}>
              秘书已连续代办施政 <Text style={{ fontWeight: '700', color: '#C87629' }}>5 个月</Text>，
              本月须由您亲自前往各部门施政，下月起可重新由秘书代办。
            </Text>
          ) : (
            <>
              <Text style={{ color: theme.labelText, fontSize: 13, lineHeight: 20 }}>
                您的秘书（能力 <Text style={{ fontWeight: '700', color: '#2B7DC8' }}>{abilityTier}</Text>）
                本月代您完成了全部施政行动，城市各项指标已获加成。
              </Text>
              <View style={{ backgroundColor: theme.progressBg, padding: 10, gap: 4 }}>
                <Text style={{ color: theme.mutedText, fontSize: 11 }}>本月施政加成（聚合效果）</Text>
                <Text style={{ color: theme.valueText, fontSize: 12, fontWeight: '600' }}>
                  GDP +5 · 民生 +5 · 生态 +3 · 营商 +4 · 治安 +3 · 政绩 +3
                </Text>
                <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 2 }}>
                  连续代办 {consecutiveMonths}/5 月（第 6 月须亲自施政）
                </Text>
              </View>
            </>
          )}
        </View>
        <Pressable
          onPress={onClose}
          style={{ backgroundColor: isLimit ? '#7a4010' : '#0e2e6b', paddingVertical: 13, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>
            {isLimit ? '知悉，本月亲自施政' : '好的，感谢秘书'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ── 部门月度事件弹窗 ───────────────────────────────────────────────────────────
function DeptMonthlyEventModal({
  event,
  save,
  onClose,
  onApplyEffects,
  theme,
}: {
  event: DeptMonthlyEvent;
  save: import('@/types/game').PlayerSave;
  onClose: () => void;
  onApplyEffects: (updates: Parameters<typeof updateSave>[1]) => void;
  theme: ReturnType<typeof getRankThemeWithLine>;
}) {
  const [chosen, setChosen] = useState<EventChoice | null>(null);
  const [pressedChoice, setPressedChoice] = useState<string | null>(null);
  const isMilitary = event.deptKey === 'military';
  const playerNetwork = save.networkValue ?? 0;

  const headerBg = isMilitary ? '#1B3A1E' : theme.headerBg;
  const accentColor = isMilitary ? '#4CAF50' : '#B91C1C';
  const badgeBg = isMilitary ? '#2E5E32' : 'rgba(255,255,255,0.15)';

  const handleChoose = (choice: EventChoice) => {
    if ((choice.minNetworkValue ?? 0) > playerNetwork) return; // 人脉不足，锁定
    setChosen(choice);
    const fx = choice.effects;
    const updates: Parameters<typeof updateSave>[1] = {};
    if (fx.meritPoints    != null) updates.meritPoints    = Math.max(0, (save.meritPoints ?? 0) + fx.meritPoints);
    if (fx.bossFavor      != null) updates.bossFavor      = Math.min(100, Math.max(0, (save.bossFavor ?? 50) + fx.bossFavor));
    if (fx.moralValue     != null) updates.moralValue     = Math.min(100, Math.max(0, (save.moralValue ?? 60) + fx.moralValue));
    if (fx.fundBalance    != null) updates.fundBalance    = Math.round(((save.fundBalance ?? 0) + fx.fundBalance) * 10) / 10;
    if (fx.cityGdp        != null) updates.cityGdp        = Math.min(100, Math.max(0, (save.cityGdp ?? 50) + fx.cityGdp));
    if (fx.cityLivelihood != null) updates.cityLivelihood = Math.min(100, Math.max(0, (save.cityLivelihood ?? 50) + fx.cityLivelihood));
    if (fx.cityEcology    != null) updates.cityEcology    = Math.min(100, Math.max(0, (save.cityEcology ?? 50) + fx.cityEcology));
    if (fx.cityBusiness   != null) updates.cityBusiness   = Math.min(100, Math.max(0, (save.cityBusiness ?? 50) + fx.cityBusiness));
    if (fx.securityIndex  != null) updates.securityIndex  = Math.min(100, Math.max(0, (save.securityIndex ?? 50) + fx.securityIndex));
    if (fx.abilityValue   != null) updates.abilityValue   = Math.min(100, Math.max(0, (save.abilityValue ?? 40) + fx.abilityValue));
    if (fx.healthValue    != null) updates.healthValue    = Math.min(100, Math.max(0, (save.healthValue ?? 100) + fx.healthValue));
    // 人脉值增减
    if (fx.networkValue   != null) updates.networkValue   = Math.max(0, (save.networkValue ?? 0) + fx.networkValue);
    // 连锁事件记录：将本次选择的 chainKey 存入 lastEventChainKey
    updates.lastEventChainKey = choice.chainKey ?? '';
    if (Object.keys(updates).length > 0) onApplyEffects(updates);
  };

  const renderEffectTags = (fx: EventChoice['effects']) => {
    const tags: { label: string; pos: boolean }[] = [];
    if (fx.meritPoints    != null) tags.push({ label: `政绩 ${fx.meritPoints > 0 ? '+' : ''}${fx.meritPoints}`,       pos: fx.meritPoints > 0 });
    if (fx.bossFavor      != null) tags.push({ label: `好感 ${fx.bossFavor > 0 ? '+' : ''}${fx.bossFavor}`,           pos: fx.bossFavor > 0 });
    if (fx.moralValue     != null) tags.push({ label: `道德 ${fx.moralValue > 0 ? '+' : ''}${fx.moralValue}`,         pos: fx.moralValue > 0 });
    if (fx.fundBalance    != null) tags.push({ label: `财政 ${fx.fundBalance > 0 ? '+' : ''}${fx.fundBalance}万`,     pos: fx.fundBalance > 0 });
    if (fx.cityGdp        != null) tags.push({ label: `GDP ${fx.cityGdp > 0 ? '+' : ''}${fx.cityGdp}`,               pos: fx.cityGdp > 0 });
    if (fx.cityLivelihood != null) tags.push({ label: `民生 ${fx.cityLivelihood > 0 ? '+' : ''}${fx.cityLivelihood}`, pos: fx.cityLivelihood > 0 });
    if (fx.cityEcology    != null) tags.push({ label: `生态 ${fx.cityEcology > 0 ? '+' : ''}${fx.cityEcology}`,       pos: fx.cityEcology > 0 });
    if (fx.cityBusiness   != null) tags.push({ label: `营商 ${fx.cityBusiness > 0 ? '+' : ''}${fx.cityBusiness}`,     pos: fx.cityBusiness > 0 });
    if (fx.securityIndex  != null) tags.push({ label: `治安 ${fx.securityIndex > 0 ? '+' : ''}${fx.securityIndex}`,   pos: fx.securityIndex > 0 });
    if (fx.abilityValue   != null) tags.push({ label: `能力 ${fx.abilityValue > 0 ? '+' : ''}${fx.abilityValue}`,     pos: fx.abilityValue > 0 });
    if (fx.healthValue    != null) tags.push({ label: `健康 ${fx.healthValue > 0 ? '+' : ''}${fx.healthValue}`,       pos: fx.healthValue > 0 });
    if (fx.networkValue   != null) tags.push({ label: `人脉 ${fx.networkValue > 0 ? '+' : ''}${fx.networkValue}`,     pos: fx.networkValue > 0 });
    if (fx.triggerPromotion) tags.push({ label: '✦ 破格晋升机会', pos: true });
    return (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
        {tags.map((t, i) => (
          <View key={i} style={{ backgroundColor: t.pos ? '#E8F5E9' : '#FFEBEE', borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: t.pos ? '#2E7D32' : '#C62828' }}>{t.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.62)', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <View style={{ backgroundColor: theme.cardBg, width: '100%', maxWidth: 400, overflow: 'hidden', borderTopWidth: 3, borderTopColor: accentColor }}>

        {/* 标题栏 */}
        <View style={{ backgroundColor: headerBg, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ backgroundColor: badgeBg, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 20 }}>{event.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 }}>{event.title}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>
              {isMilitary ? '🎖 军转干部专属事件' : `📋 ${save.playerPosition ?? '部门'} · 月度事件`}
            </Text>
          </View>
        </View>

        <View style={{ padding: 14, gap: 12 }}>
          {/* 剧情描述 */}
          <View style={{ backgroundColor: isMilitary ? '#F1F8E9' : '#FFF8F0', borderLeftWidth: 3, borderLeftColor: accentColor, padding: 10 }}>
            <Text style={{ fontSize: 13, color: theme.labelText ?? '#4A3F2F', lineHeight: 21 }}>{event.scenario}</Text>
          </View>

          {!chosen ? (
            /* 选择阶段 */
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 11, color: theme.mutedText ?? '#8A7F6E', fontWeight: '700', letterSpacing: 1 }}>── 请作出决策 ──</Text>
              {event.choices.map((choice) => {
                const requiredNet = choice.minNetworkValue ?? 0;
                const locked = requiredNet > playerNetwork;
                return (
                  <Pressable
                    key={choice.label}
                    onPress={() => !locked && handleChoose(choice)}
                    onPressIn={() => !locked && setPressedChoice(choice.label)}
                    onPressOut={() => setPressedChoice(null)}
                    style={{
                      backgroundColor: locked ? '#F5F5F5' : pressedChoice === choice.label ? '#F5F0E8' : theme.cardBg,
                      borderWidth: 1,
                      borderColor: locked ? '#E0E0E0' : isMilitary ? '#81C784' : '#D6CFBF',
                      padding: 10,
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      gap: 8,
                      opacity: locked ? 0.7 : 1,
                    }}
                  >
                    <View style={{ width: 28, height: 28, backgroundColor: locked ? '#EEEEEE' : isMilitary ? '#E8F5E9' : '#F5E9CC', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      <Text style={{ fontSize: 15 }}>{locked ? '🔒' : (choice.icon ?? '▶')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: locked ? '#9E9E9E' : (theme.labelText ?? '#4A3F2F') }}>{choice.label}</Text>
                      {locked && (
                        <Text style={{ fontSize: 10, color: '#E65100', marginTop: 2, fontWeight: '600' }}>
                          🤝 需人脉值 ≥ {requiredNet}（当前 {playerNetwork}）
                        </Text>
                      )}
                      {!locked && renderEffectTags(choice.effects)}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            /* 结果阶段 */
            <View style={{ gap: 8 }}>
              <View style={{ backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC', padding: 10, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <Text style={{ fontSize: 16, marginTop: 1 }}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#166534' }}>决策：{chosen.label}</Text>
                  <Text style={{ fontSize: 12, color: '#166534', marginTop: 4, lineHeight: 18 }}>
                    {chosen.desc ?? '决策已执行，效果已生效。'}
                  </Text>
                  {renderEffectTags(chosen.effects)}
                </View>
              </View>
              {chosen.effects.triggerPromotion && (
                <View style={{ backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FCD34D', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>⭐</Text>
                  <Text style={{ flex: 1, fontSize: 12, color: '#92400E', fontWeight: '600', lineHeight: 18 }}>
                    老首长已活动人脉，破格晋升概率大幅提升，请关注后续晋升通知！
                  </Text>
                </View>
              )}
              <Pressable
                onPress={onClose}
                style={{ backgroundColor: headerBg, paddingVertical: 13, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>收悉，继续工作</Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}


