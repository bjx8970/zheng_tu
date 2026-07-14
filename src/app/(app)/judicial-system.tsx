/**
 * 政法线专属系统（7大功能）
 * 13. 案件侦办链（科员起）
 * 14. 维稳等级系统（科员起）
 * 15. 扫黑除恶专项（10级解锁）
 * 16. 司法独立 vs 政治干预（10级解锁）
 * 17. 信访接待系统（科员起）
 * 18. 监狱/看守所管理（8级解锁）
 * 19. 网络舆情执法（8级解锁）
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import type { CareerLine } from '@/lib/lineGameplay';

// ─── 案件阶段 ──────────────────────────────────────────────────────────────────
const CASE_STAGES = [
  { key: 'collect_evidence', label: '取证调查',  icon: '🔍', desc: '深入现场勘查，收集物证书证，提升定罪证据链完整性。', meritGain: 12, evidenceGain: 25, coolDays: 20 },
  { key: 'interrogation',    label: '审讯嫌疑人', icon: '🗣️', desc: '运用审讯技术突破嫌疑人心理防线，获取口供关键信息。', meritGain: 15, evidenceGain: 30, coolDays: 25 },
  { key: 'prosecute',        label: '移交起诉',   icon: '⚖️', desc: '将案件移交检察机关，正式进入司法程序，定罪率大幅提升。', meritGain: 20, evidenceGain: 0, coolDays: 30 },
];

// ─── 维稳行动 ──────────────────────────────────────────────────────────────────
const STABILITY_ACTIONS = [
  { key: 'police_patrol',  label: '加强警力巡逻', icon: '🚔', desc: '调配警力开展高频次巡逻，社会稳定+10，民心-3。', stabilityGain: 10, moralCost: 3,  publicCost: 0, coolDays: 15 },
  { key: 'community_work', label: '社区矛盾调处', icon: '🤝', desc: '深入基层化解矛盾，社会稳定+8，提升民心+5。',       stabilityGain: 8,  moralCost: 0,  publicCost: 0, coolDays: 20 },
  { key: 'crackdown',      label: '专项整治行动', icon: '🛡️', desc: '集中警力整治重点区域，稳定+18，民心-8，道德-5（需橙色以上）。', stabilityGain: 18, moralCost: 8, publicCost: 5, coolDays: 45, minLevel: 3 },
];

// ─── 扫黑线索 ──────────────────────────────────────────────────────────────────
const SWEEP_CLUES = [
  { key: 'gang_a', name: '新兴地下钱庄',   riskLevel: '低',  meritGain: 40, shieldProb: 0,    inspRisk: 5  },
  { key: 'gang_b', name: '跨区域走私团伙', riskLevel: '中',  meritGain: 70, shieldProb: 0.25, inspRisk: 10 },
  { key: 'gang_c', name: '政商勾连集团',   riskLevel: '高',  meritGain: 120, shieldProb: 0.5, inspRisk: 20 },
];

// ─── 信访案件类型 ───────────────────────────────────────────────────────────────
const PETITION_CASES = [
  { key: 'land_dispute',    label: '土地征收纠纷', icon: '🏗️', desc: '农民反映征地补偿不足，要求重新核算。' },
  { key: 'labor_rights',    label: '劳动权益投诉', icon: '👷', desc: '企业拖欠工资，工人集体上访要求追讨。' },
  { key: 'env_pollution',   label: '环境污染投诉', icon: '🌫️', desc: '工厂排污影响居民生活，要求关停整改。' },
  { key: 'edu_fairness',    label: '教育资源不均', icon: '🏫', desc: '家长反映学区划分不公平，要求重新划定。' },
  { key: 'medical_dispute', label: '医疗纠纷投诉', icon: '🏥', desc: '患者家属对医院处置不满，要求赔偿。' },
];

// ─── 网络执法强度 ───────────────────────────────────────────────────────────────
const NET_ACTIONS = [
  { key: 'minor_rumor',  label: '处置轻微谣言', icon: '📵', desc: '依法处置散布轻微谣言账号，政绩+10，言论管控+5。',  meritGain: 10, controlGain: 5,  opGain: -3,  coolDays: 10 },
  { key: 'major_rumor',  label: '重拳打击谣言', icon: '🔒', desc: '大规模处置谣言账号，政绩+20，言论管控+15，民心-8。', meritGain: 20, controlGain: 15, opGain: -8,  coolDays: 25 },
  { key: 'positive_pub', label: '正面舆论引导', icon: '📢', desc: '发布权威信息引导舆论，政绩+8，民心+5，言论管控-5。', meritGain: 8,  controlGain: -5, opGain: 5,   coolDays: 15 },
];

// ─── 稳定等级 ───────────────────────────────────────────────────────────────────
function getStabilityLevel(idx: number): { label: string; color: string; bg: string; level: number } {
  if (idx >= 80) return { label: '🟢 绿色稳定', color: '#166534', bg: '#D1FAE5', level: 1 };
  if (idx >= 60) return { label: '🟡 黄色预警', color: '#92400E', bg: '#FEF3C7', level: 2 };
  if (idx >= 40) return { label: '🟠 橙色预警', color: '#9A3412', bg: '#FFEDD5', level: 3 };
  return           { label: '🔴 红色警报', color: '#991B1B', bg: '#FEE2E2', level: 4 };
}

export default function JudicialSystemPage() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();

  const [acting, setActing] = useState(false);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'depts' | 'case' | 'stability' | 'sweep' | 'judicial' | 'petition' | 'detention' | 'net' | 'coord' | 'informant' | 'purge' | 'death'>('depts');
  const [showCaseModal, setShowCaseModal] = useState(false);
  const [showJudicialModal, setShowJudicialModal] = useState(false);
  const [showPetitionModal, setShowPetitionModal] = useState<typeof PETITION_CASES[0] | null>(null);
  const [sweepResult, setSweepResult] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) setCooldowns(save.careerPathCooldowns as Record<string, number>);
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;
  const isCool = (key: string, days: number) => (key in cooldowns) && (cooldowns[key] + days) > gameDays;
  const coolLeft = (key: string, days: number) => (key in cooldowns) ? Math.max(0, cooldowns[key] + days - gameDays) : 0;
  const showMsg = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4500); };

  const theme = getRankThemeWithLine(save.rankLevel, (save.careerPathLine as CareerLine | undefined));

  const stabilityIdx = save.judicialStabilityIndex ?? 80;
  const stLevel = getStabilityLevel(stabilityIdx);
  const petitionBacklog = save.judicialPetitionBacklog ?? 0;
  const evidenceLevel = save.judicialEvidenceLevel ?? 0;
  const speechControl = save.judicialSpeechControl ?? 0;
  const extraCooldowns = save.judicialExtraCooldowns ?? {};
  const isExtraCool = (key: string, days: number) => (key in extraCooldowns) && (extraCooldowns[key] + days) > gameDays;
  const extraLeft   = (key: string, days: number) => (key in extraCooldowns) ? Math.max(0, extraCooldowns[key] + days - gameDays) : 0;

  const doUpdate = async (partial: Parameters<typeof updateGameSave>[0], nc?: Record<string, number>) => {
    const updates = nc ? { ...partial, careerPathCooldowns: nc } : partial;
    await updateGameSave(updates);
    if (nc) setCooldowns(nc);
  };
  const doExtraUpdate = async (partial: Parameters<typeof updateGameSave>[0], nec: Record<string, number>) => {
    await updateGameSave({ ...partial, judicialExtraCooldowns: nec });
  };

  // ── 13. 案件侦办 ──────────────────────────────────────────────────────────────
  const handleCaseStage = async (stage: typeof CASE_STAGES[0]) => {
    if (acting || isCool(`judicial_case_${stage.key}`, stage.coolDays)) return;
    setActing(true);
    const nc = { ...cooldowns, [`judicial_case_${stage.key}`]: gameDays };
    try {
      const newEvidence = Math.min(100, evidenceLevel + stage.evidenceGain);
      const meritBonus = stage.key === 'prosecute' ? Math.round(newEvidence / 100 * 20) : 0;
      await doUpdate({
        meritPoints: save.meritPoints + stage.meritGain + meritBonus,
        judicialEvidenceLevel: stage.key === 'prosecute' ? 0 : newEvidence, // 起诉后重置
        lineKpiScore: save.lineKpiScore + Math.round(stage.meritGain * 0.5),
      }, nc);
      const convMsg = stage.key === 'prosecute' ? `（定罪率：${newEvidence}%，政绩额外+${meritBonus}）` : `（证据链：${newEvidence}%）`;
      const _jd1=`✅ 「${stage.label}」完成！政绩+${stage.meritGain}${convMsg}`; void saveResult('judicial_trial_'+stage.key, {ok:true,desc:_jd1,day:save.gameDays??0}); showMsg(_jd1, true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 14. 维稳 ──────────────────────────────────────────────────────────────────
  const handleStabilityAction = async (action: typeof STABILITY_ACTIONS[0]) => {
    if (acting || isCool(`judicial_stab_${action.key}`, action.coolDays)) return;
    if (action.minLevel && stLevel.level < action.minLevel) {
      showMsg(`⚠️ 仅在橙色预警或以上才可发动「${action.label}」`, false); return;
    }
    setActing(true);
    const nc = { ...cooldowns, [`judicial_stab_${action.key}`]: gameDays };
    try {
      await doUpdate({
        judicialStabilityIndex: Math.min(100, stabilityIdx + action.stabilityGain),
        moralValue: Math.max(0, save.moralValue - action.moralCost),
        publicOpinionIndex: Math.max(0, (save.publicOpinionIndex ?? 60) - action.publicCost),
        meritPoints: save.meritPoints + Math.round(action.stabilityGain * 1.5),
      }, nc);
      const _jd2=`✅ 「${action.label}」完成！稳定指数+${action.stabilityGain}${action.moralCost ? `，道德-${action.moralCost}` : ''}`; void saveResult('judicial_stability_'+action.key, {ok:true,desc:_jd2,day:save.gameDays??0}); showMsg(_jd2, true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 15. 扫黑除恶 ──────────────────────────────────────────────────────────────
  const handleSweep = async (clue: typeof SWEEP_CLUES[0]) => {
    if (acting || isCool(`judicial_sweep_${clue.key}`, 90)) return;
    if (save.rankLevel < 10) { showMsg('⚠️ 需达到10级方可发起扫黑专项', false); return; }
    setActing(true);
    const nc = { ...cooldowns, [`judicial_sweep_${clue.key}`]: gameDays };
    try {
      const hasShield = Math.random() < clue.shieldProb;
      if (hasShield) {
        await doUpdate({
          inspectionRisk: Math.min(100, save.inspectionRisk + clue.inspRisk),
          bossFavor: Math.max(0, save.bossFavor - 8),
          meritPoints: save.meritPoints + 10,
        }, nc);
        setSweepResult(`⚠️ 「${clue.name}」背后存在官员保护伞，行动受阻！巡视风险+${clue.inspRisk}，上司好感-8，谨慎行事。`);
      } else {
        await doUpdate({
          meritPoints: save.meritPoints + clue.meritGain,
          judicialSweepCount: (save.judicialSweepCount ?? 0) + 1,
          lineKpiScore: save.lineKpiScore + 50,
          publicOpinionIndex: Math.min(100, (save.publicOpinionIndex ?? 60) + 15),
        }, nc);
        setSweepResult(`🎉 「${clue.name}」被成功打掉！政绩+${clue.meritGain}，行政积分+50，民心+15。`);
      }
      setShowCaseModal(false);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 16. 司法干预 ──────────────────────────────────────────────────────────────
  const handleJudicial = async (choice: 'legal' | 'intervene') => {
    if (acting) return;
    if (save.rankLevel < 10) { showMsg('⚠️ 需达到10级方可启用此功能', false); return; }
    if (isCool('judicial_judicial', 60)) { showMsg(`⏳ 还需 ${coolLeft('judicial_judicial', 60)} 天`, false); return; }
    setActing(true);
    const nc = { ...cooldowns, judicial_judicial: gameDays };
    try {
      if (choice === 'legal') {
        await doUpdate({
          meritPoints: save.meritPoints + 25,
          moralValue: Math.min(100, save.moralValue + 5),
          lineKpiScore: save.lineKpiScore + 30,
        }, nc);
        showMsg('⚖️ 依法处置完成。政绩+25，道德+5，积分+30。正义之路虽慢，但终将到达。', true);
      } else {
        const success = Math.random() < 0.5;
        if (success) {
          await doUpdate({
            meritPoints: save.meritPoints + 50,
            bossFavor: Math.min(100, save.bossFavor + 12),
            moralValue: Math.max(0, save.moralValue - 10),
          }, nc);
          showMsg('🎭 政治干预成功！政绩+50，上司好感+12，但道德-10。权力的阴影笼罩司法。', true);
        } else {
          await doUpdate({
            inspectionRisk: Math.min(100, save.inspectionRisk + 25),
            moralValue: Math.max(0, save.moralValue - 15),
            bossFavor: Math.max(0, save.bossFavor - 10),
            meritPoints: Math.max(0, save.meritPoints - 30),
          }, nc);
          showMsg('🚨 证据外泄！干预失败引发重大丑闻！巡视风险+25，道德-15，上司好感-10，政绩-30！', false);
        }
      }
      setShowJudicialModal(false);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 17. 信访接待 ──────────────────────────────────────────────────────────────
  const handlePetition = async (petCase: typeof PETITION_CASES[0], quality: 'fast' | 'thorough') => {
    if (acting) return;
    if (isCool(`judicial_petition_${petCase.key}`, 30)) {
      showMsg(`⏳ 该案还需 ${coolLeft(`judicial_petition_${petCase.key}`, 30)} 天`, false); return;
    }
    setActing(true);
    const nc = { ...cooldowns, [`judicial_petition_${petCase.key}`]: gameDays };
    try {
      const meritGain = quality === 'thorough' ? 18 : 10;
      const backlogChange = quality === 'thorough' ? -2 : -1;
      const publicGain = quality === 'thorough' ? 8 : 3;
      await doUpdate({
        meritPoints: save.meritPoints + meritGain,
        judicialPetitionBacklog: Math.max(0, petitionBacklog + backlogChange),
        publicOpinionIndex: Math.min(100, (save.publicOpinionIndex ?? 60) + publicGain),
        lineKpiScore: save.lineKpiScore + 15,
      }, nc);
      const _jd3=`✅ 「${petCase.label}」${quality === 'thorough' ? '深入处理' : '快速处理'}完成！政绩+${meritGain}，积压-${Math.abs(backlogChange)}`; void saveResult('judicial_petition_'+petCase.key, {ok:true,desc:_jd3,day:save.gameDays??0}); showMsg(_jd3, true);
      setShowPetitionModal(null);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 18. 拘留所管理 ────────────────────────────────────────────────────────────
  const handleDetention = async (method: 'extend' | 'soft' | 'exchange') => {
    if (acting || save.rankLevel < 8) { showMsg('⚠️ 需达到8级解锁拘留所管理', false); return; }
    if (isCool(`judicial_detention_${method}`, 45)) {
      showMsg(`⏳ 还需 ${coolLeft(`judicial_detention_${method}`, 45)} 天`, false); return;
    }
    setActing(true);
    const nc = { ...cooldowns, [`judicial_detention_${method}`]: gameDays };
    const configs = {
      extend:   { meritGain: 15, evidenceGain: 20, inspGain: 5,  moralCost: 5,  label: '延长羁押期限' },
      soft:     { meritGain: 10, evidenceGain: 30, inspGain: 0,  moralCost: 0,  label: '人性化处置' },
      exchange: { meritGain: 25, evidenceGain: 40, inspGain: 10, moralCost: 10, label: '情报交换' },
    };
    const cfg = configs[method];
    try {
      await doUpdate({
        meritPoints: save.meritPoints + cfg.meritGain,
        judicialEvidenceLevel: Math.min(100, evidenceLevel + cfg.evidenceGain),
        inspectionRisk: Math.min(100, save.inspectionRisk + cfg.inspGain),
        moralValue: Math.max(0, save.moralValue - cfg.moralCost),
      }, nc);
      const _jd4=`✅ 「${cfg.label}」：政绩+${cfg.meritGain}，证据链+${cfg.evidenceGain}%${cfg.moralCost ? `，道德-${cfg.moralCost}` : ''}`; void saveResult('judicial_evidence_'+cfg.label.slice(0,12), {ok:true,desc:_jd4,day:save.gameDays??0}); showMsg(_jd4, true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 19. 网络舆情执法 ──────────────────────────────────────────────────────────
  const handleNetAction = async (action: typeof NET_ACTIONS[0]) => {
    if (acting || save.rankLevel < 8) { showMsg('⚠️ 需达到8级解锁网络舆情执法', false); return; }
    if (isCool(`judicial_net_${action.key}`, action.coolDays)) return;
    if (speechControl >= 80 && action.controlGain > 0) {
      showMsg('⚠️ 言论管控指数已过高！继续执法将引发"言论管制"负评危机', false); return;
    }
    setActing(true);
    const nc = { ...cooldowns, [`judicial_net_${action.key}`]: gameDays };
    try {
      await doUpdate({
        meritPoints: save.meritPoints + action.meritGain,
        judicialSpeechControl: Math.max(0, Math.min(100, speechControl + action.controlGain)),
        publicOpinionIndex: Math.max(0, Math.min(100, (save.publicOpinionIndex ?? 60) + action.opGain)),
      }, nc);
      const warnText = speechControl + action.controlGain >= 80 ? ' ⚠️ 管控指数接近危险线！' : '';
      const _jd5=`✅ 「${action.label}」完成！政绩+${action.meritGain}${warnText}`; void saveResult('judicial_action_'+action.key, {ok:true,desc:_jd5,day:save.gameDays??0}); showMsg(_jd5, true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 20. 政法委协调会 ──────────────────────────────────────────────────────────
  const handleCoordMeeting = async () => {
    if (acting || save.rankLevel < 11) { showMsg('⚠️ 需达到11级解锁政法委协调会', false); return; }
    if (isExtraCool('coord_meeting', 60)) return;
    const grantFund = save.cityGovFund ?? 0;
    if (grantFund < 20) { showMsg(`专项经费不足（需20万，当前${grantFund}万），请先补充专项经费`, false); return; }
    setActing(true);
    const nec = { ...extraCooldowns, coord_meeting: gameDays };
    try {
      const success = Math.random() > 0.25;
      if (success) {
        await doExtraUpdate({ meritPoints: save.meritPoints + 35, judicialStabilityIndex: Math.min(100, stabilityIdx + 12), bossFavor: Math.min(100, (save.bossFavor ?? 60) + 6), judicialCoordCount: (save.judicialCoordCount ?? 0) + 1, cityGovFund: grantFund - 20 }, nec);
        showMsg('✅ 协调会召开成功！统一处置口径，社会稳定+12，上司好感+6，政绩+35，专项经费-20万', true);
      } else {
        await doExtraUpdate({ meritPoints: Math.max(0, save.meritPoints - 8), judicialStabilityIndex: Math.max(0, stabilityIdx - 10), publicOpinionIndex: Math.max(0, (save.publicOpinionIndex ?? 60) - 15), judicialCoordCount: (save.judicialCoordCount ?? 0) + 1, cityGovFund: grantFund - 20 }, nec);
        showMsg('❌ 协调会破裂！各部门意见分歧，案件失控，舆论-15，稳定-10，政绩-8，专项经费-20万', false);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 21. 线人情报网络 ──────────────────────────────────────────────────────────
  const handleInformant = async (action: 'develop' | 'activate') => {
    if (acting) return;
    const informantCnt = save.informantCount ?? 0;
    const grantFund = save.cityGovFund ?? 0;
    if (action === 'develop') {
      if (isExtraCool('informant_develop', 30)) return;
      if (informantCnt >= 20) { showMsg('⚠️ 线人数量已达上限（20人）', false); return; }
      if (grantFund < 8) { showMsg(`专项经费不足（需8万，当前${grantFund}万），请先补充专项经费`, false); return; }
      setActing(true);
      const nec = { ...extraCooldowns, informant_develop: gameDays };
      try {
        const exposed = Math.random() < 0.1;
        if (exposed) {
          await doExtraUpdate({ meritPoints: Math.max(0, save.meritPoints - 15), inspectionRisk: Math.min(100, (save.inspectionRisk ?? 0) + 12), publicOpinionIndex: Math.max(0, (save.publicOpinionIndex ?? 60) - 20), cityGovFund: grantFund - 8 }, nec);
          showMsg('⚠️ 线人身份暴露！引发公关危机，政绩-15，巡视风险+12，民心-20，专项经费-8万', false);
        } else {
          await doExtraUpdate({ meritPoints: save.meritPoints + 8, informantCount: informantCnt + 1, cityGovFund: grantFund - 8 }, nec);
          showMsg(`✅ 成功发展新线人！当前线人：${informantCnt + 1}人，政绩+8，专项经费-8万`, true);
        }
      } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
    } else {
      if (informantCnt <= 0) { showMsg('⚠️ 尚无可激活的线人', false); return; }
      if (isExtraCool('informant_activate', 15)) return;
      if (grantFund < 5) { showMsg(`专项经费不足（需5万，当前${grantFund}万），请先补充专项经费`, false); return; }
      setActing(true);
      const nec = { ...extraCooldowns, informant_activate: gameDays };
      try {
        const merit = informantCnt * 5 + Math.floor(Math.random() * 20);
        await doExtraUpdate({ meritPoints: save.meritPoints + merit, judicialStabilityIndex: Math.min(100, stabilityIdx + 5), cityGovFund: grantFund - 5 }, nec);
        showMsg(`✅ 情报网络激活！获取${informantCnt}条线索，政绩+${merit}，稳定+5，专项经费-5万`, true);
      } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
    }
  };

  // ── 22. 执法队伍整风 ──────────────────────────────────────────────────────────
  const handlePurge = async () => {
    if (acting || save.rankLevel < 11) { showMsg('⚠️ 需达到11级解锁执法整风', false); return; }
    if (isExtraCool('law_enforce_purge', 90)) return;
    const grantFund = save.cityGovFund ?? 0;
    if (grantFund < 30) { showMsg(`专项经费不足（需30万，当前${grantFund}万），请先补充专项经费`, false); return; }
    setActing(true);
    const nec = { ...extraCooldowns, law_enforce_purge: gameDays };
    try {
      const backlash = Math.random() < 0.3;
      await doExtraUpdate({
        meritPoints: save.meritPoints + (backlash ? 10 : 30),
        judicialStabilityIndex: Math.min(100, stabilityIdx + (backlash ? 3 : 15)),
        bossFavor: backlash ? Math.max(0, (save.bossFavor ?? 60) - 8) : Math.min(100, (save.bossFavor ?? 60) + 5),
        inspectionRisk: backlash ? Math.min(100, (save.inspectionRisk ?? 0) + 15) : (save.inspectionRisk ?? 0),
        lawEnforcePurgeCount: (save.lawEnforcePurgeCount ?? 0) + 1,
        cityGovFund: grantFund - 30,
      }, nec);
      if (backlash) showMsg('⚠️ 被清除者反咬！内部调查触发，巡视风险+15，上司好感-8，政绩+10，专项经费-30万', false);
      else showMsg('✅ 整风完成！清除害群之马，战斗力提升，稳定+15，上司好感+5，政绩+30，专项经费-30万', true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 23. 死刑复核审批 ──────────────────────────────────────────────────────────
  const handleDeathReview = async (choice: 'approve' | 'reject') => {
    if (acting || save.rankLevel < 10) { showMsg('⚠️ 需达到10级解锁死刑复核权', false); return; }
    if (isExtraCool('death_review', 45)) return;
    setActing(true);
    const nec = { ...extraCooldowns, death_review: gameDays };
    try {
      if (choice === 'approve') {
        await doExtraUpdate({ meritPoints: save.meritPoints + 20, bossFavor: Math.min(100, (save.bossFavor ?? 60) + 4), moralValue: Math.max(0, (save.moralValue ?? 50) - 5), deathReviewCount: (save.deathReviewCount ?? 0) + 1 }, nec);
        showMsg('⚖️ 核准死刑！政绩+20，上司好感+4，道德-5。权力的重量需承担。', true);
      } else {
        await doExtraUpdate({ meritPoints: save.meritPoints + 15, moralValue: Math.min(100, (save.moralValue ?? 50) + 8), publicOpinionIndex: Math.min(100, (save.publicOpinionIndex ?? 60) + 10), deathReviewCount: (save.deathReviewCount ?? 0) + 1 }, nec);
        showMsg('✅ 驳回死刑！发回重审，道德+8，民心+10，政绩+15。体现司法审慎原则。', true);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

// ─── 纪检线机构分级行动数据 ────────────────────────────────────────────────────
interface JudTier { label: string; desc: string; meritEffect: number; extraEffect?: { field: string; value: number; label: string }; grantCost: number; }
interface JudAction { key: string; cooldownDays: number; minRank: number; tiers: [JudTier, JudTier, JudTier]; }
interface JudDept { key: string; name: string; icon: string; desc: string; actions: JudAction[]; }

function getTierIdx(rankLevel: number) { return rankLevel >= 9 ? 2 : rankLevel >= 5 ? 1 : 0; }

const JUD_DEPTS: JudDept[] = [
  {
    key: 'paichusuo', name: '派出所', icon: '🚔', desc: '辖区公安基层机构，负责治安管理、刑事侦查与社区警务',
    actions: [
      {
        key: 'pcs_patrol', cooldownDays: 30, minRank: 3,
        tiers: [
          { label: '强化日常巡逻机制', desc: '优化警力部署，提升日常巡逻频次，震慑辖区违法犯罪。', meritEffect: 22, extraEffect: { field: 'judicialStabilityIndex', value: 8, label: '稳定+8' }, grantCost: 1 },
          { label: '建立智能化巡逻网络', desc: '配备巡逻车辆与无人机，实现全域高密度立体化巡逻覆盖。', meritEffect: 38, extraEffect: { field: 'judicialStabilityIndex', value: 15, label: '稳定+15' }, grantCost: 5 },
          { label: '打造全国示范智慧警务', desc: '建设AI驱动智慧警务指挥平台，实现秒级精准出警，获全国样板命名。', meritEffect: 65, extraEffect: { field: 'judicialStabilityIndex', value: 25, label: '稳定+25' }, grantCost: 14 },
        ],
      },
      {
        key: 'pcs_case', cooldownDays: 45, minRank: 3,
        tiers: [
          { label: '重点案件专项侦破', desc: '集中警力对积压重点案件展开专项攻坚，提升破案率。', meritEffect: 30, extraEffect: { field: 'judicialEvidenceLevel', value: 20, label: '证据+20' }, grantCost: 2 },
          { label: '跨区域联合侦查专项', desc: '与周边地区联合部署跨区域犯罪打击行动，侦破重大系列案件。', meritEffect: 48, extraEffect: { field: 'judicialEvidenceLevel', value: 35, label: '证据+35' }, grantCost: 7 },
          { label: '主导全省重大专案侦破', desc: '组织省级跨部门联合专案组，侦破震惊全省的重大刑事案件。', meritEffect: 80, extraEffect: { field: 'judicialEvidenceLevel', value: 60, label: '证据+60' }, grantCost: 18 },
        ],
      },
    ],
  },
  {
    key: 'xinfangshi', name: '信访室', icon: '📮', desc: '群众来信来访接待处理机构，化解社会矛盾，疏导群众诉求',
    actions: [
      {
        key: 'xfs_resolve', cooldownDays: 30, minRank: 3,
        tiers: [
          { label: '批量化解积压信访', desc: '召开专项信访联席会议，集中解决积压已久的历史遗留信访案件。', meritEffect: 28, extraEffect: { field: 'publicOpinionIndex', value: 6, label: '民心+6' }, grantCost: 1 },
          { label: '建立信访联动调解机制', desc: '整合信访、司法、民政资源，建立"一站式"矛盾化解联动平台。', meritEffect: 42, extraEffect: { field: 'publicOpinionIndex', value: 10, label: '民心+10' }, grantCost: 4 },
          { label: '推广无积压信访示范区建设', desc: '在全市推广"无积压信访示范区"经验，实现群众诉求100%回应。', meritEffect: 68, extraEffect: { field: 'publicOpinionIndex', value: 18, label: '民心+18' }, grantCost: 12 },
        ],
      },
      {
        key: 'xfs_early', cooldownDays: 60, minRank: 4,
        tiers: [
          { label: '推进矛盾早介入化解', desc: '建立社区矛盾预警机制，将矛盾化解在萌芽阶段，防止上访。', meritEffect: 35, extraEffect: { field: 'judicialStabilityIndex', value: 10, label: '稳定+10' }, grantCost: 3 },
          { label: '构建矛盾排查网格化体系', desc: '将矛盾排查延伸到最小网格单元，实现社区矛盾零积压零上访。', meritEffect: 52, extraEffect: { field: 'judicialStabilityIndex', value: 18, label: '稳定+18' }, grantCost: 8 },
          { label: '建立全市智慧信访预警系统', desc: '上线AI社情分析系统，提前预判矛盾风险，在全省复制推广。', meritEffect: 85, extraEffect: { field: 'judicialStabilityIndex', value: 30, label: '稳定+30' }, grantCost: 22 },
        ],
      },
    ],
  },
  {
    key: 'jianchashi', name: '检察室', icon: '🔍', desc: '基层检察监督机构，负责侦查监督、案件复核与公益诉讼',
    actions: [
      {
        key: 'jcs_supervise', cooldownDays: 45, minRank: 4,
        tiers: [
          { label: '开展执法执纪监督检查', desc: '对辖区执法部门开展专项监督，纠正违规执法行为，规范执法程序。', meritEffect: 32, extraEffect: { field: 'lineKpiScore', value: 6, label: 'KPI+6' }, grantCost: 2 },
          { label: '推进检察监督专项行动', desc: '聚焦重点领域开展检察监督专项行动，通报整改典型案例。', meritEffect: 50, extraEffect: { field: 'lineKpiScore', value: 10, label: 'KPI+10' }, grantCost: 6 },
          { label: '实施全域检察一体化监督', desc: '整合各类监督力量，建立覆盖全域的检察监督网络，获省级表彰。', meritEffect: 82, extraEffect: { field: 'lineKpiScore', value: 18, label: 'KPI+18' }, grantCost: 18 },
        ],
      },
      {
        key: 'jcs_pubinterest', cooldownDays: 60, minRank: 5,
        tiers: [
          { label: '提起行政公益诉讼', desc: '对违规行政行为提起公益诉讼，维护国家和社会公共利益。', meritEffect: 42, extraEffect: { field: 'publicOpinionIndex', value: 5, label: '民心+5' }, grantCost: 3 },
          { label: '开展重大环境公益诉讼', desc: '对重大生态破坏行为提起公益诉讼，实现环境损害赔偿，获广泛关注。', meritEffect: 65, extraEffect: { field: 'publicOpinionIndex', value: 9, label: '民心+9' }, grantCost: 9 },
          { label: '主办全国典型公益诉讼案件', desc: '主办具有全国示范意义的公益诉讼案件，推动立法完善，影响深远。', meritEffect: 100, extraEffect: { field: 'publicOpinionIndex', value: 15, label: '民心+15' }, grantCost: 24 },
        ],
      },
    ],
  },
  {
    key: 'fazhiban', name: '法制办', icon: '📜', desc: '负责行政执法监督、规范性文件审查与政府法律事务',
    actions: [
      {
        key: 'fzb_review', cooldownDays: 45, minRank: 3,
        tiers: [
          { label: '清理规范性文件', desc: '对现行规范性文件开展合法性审查，清理废止不适当文件，规范执法依据。', meritEffect: 25, extraEffect: { field: 'lineKpiScore', value: 5, label: 'KPI+5' }, grantCost: 1 },
          { label: '推进依法行政示范创建', desc: '开展依法行政示范单位创建，提升政府治理法治化水平。', meritEffect: 38, extraEffect: { field: 'lineKpiScore', value: 8, label: 'KPI+8' }, grantCost: 4 },
          { label: '争创全省法治政府建设标杆', desc: '系统推进法治政府各项指标建设，在全省法治政府测评中取得优秀。', meritEffect: 62, extraEffect: { field: 'lineKpiScore', value: 14, label: 'KPI+14' }, grantCost: 12 },
        ],
      },
      {
        key: 'fzb_compliance', cooldownDays: 60, minRank: 5,
        tiers: [
          { label: '开展行政执法专项培训', desc: '组织全体执法人员参加专项法律培训，统一规范执法标准。', meritEffect: 30, extraEffect: { field: 'judicialStabilityIndex', value: 5, label: '稳定+5' }, grantCost: 2 },
          { label: '建立行政执法全程规范体系', desc: '制定行政执法操作手册，建立全流程规范执法监督体系。', meritEffect: 45, extraEffect: { field: 'judicialStabilityIndex', value: 10, label: '稳定+10' }, grantCost: 6 },
          { label: '推出全国行政执法规范样本', desc: '形成系统化行政执法规范化建设经验，在全国推广复制。', meritEffect: 72, extraEffect: { field: 'judicialStabilityIndex', value: 18, label: '稳定+18' }, grantCost: 16 },
        ],
      },
    ],
  },
  {
    key: 'anquanban', name: '安全办', icon: '🛡️', desc: '负责辖区安全生产监督管理，防范重大生产事故',
    actions: [
      {
        key: 'aqb_inspect', cooldownDays: 30, minRank: 3,
        tiers: [
          { label: '开展安全生产大检查', desc: '对重点行业企业开展安全生产专项检查，消除安全隐患。', meritEffect: 28, extraEffect: { field: 'securityIndex', value: 8, label: '安全+8' }, grantCost: 1 },
          { label: '实施高风险行业全面整治', desc: '对危险化学品、建筑施工等高风险行业实施全面系统整治。', meritEffect: 45, extraEffect: { field: 'securityIndex', value: 15, label: '安全+15' }, grantCost: 5 },
          { label: '建立全市安全生产双重预防体系', desc: '建成覆盖全市的安全风险分级管控和隐患排查双重预防机制。', meritEffect: 72, extraEffect: { field: 'securityIndex', value: 25, label: '安全+25' }, grantCost: 14 },
        ],
      },
      {
        key: 'aqb_emergency', cooldownDays: 60, minRank: 4,
        tiers: [
          { label: '完善应急救援预案体系', desc: '修订完善各类突发事件应急预案，开展应急演练提升响应能力。', meritEffect: 35, extraEffect: { field: 'securityIndex', value: 10, label: '安全+10' }, grantCost: 3 },
          { label: '建设区域应急救援基地', desc: '建成多功能综合应急救援基地，装备现代化救援力量。', meritEffect: 55, extraEffect: { field: 'securityIndex', value: 18, label: '安全+18' }, grantCost: 9 },
          { label: '打造全国应急救援示范中心', desc: '建设全国一流应急指挥中心，获应急管理部命名表彰。', meritEffect: 90, extraEffect: { field: 'securityIndex', value: 30, label: '安全+30' }, grantCost: 24 },
        ],
      },
      {
        key: 'aqb_accident', cooldownDays: 90, minRank: 5,
        tiers: [
          { label: '督查重大事故整改落实', desc: '对发生生产事故的单位开展全面整改督查，形成警示教育。', meritEffect: 40, extraEffect: { field: 'lineKpiScore', value: 6, label: 'KPI+6' }, grantCost: 4 },
          { label: '推进安全生产责任制落地', desc: '建立安全生产企业主体责任体系，形成全员全链条安全责任闭环。', meritEffect: 60, extraEffect: { field: 'lineKpiScore', value: 10, label: 'KPI+10' }, grantCost: 10 },
          { label: '推出全国安全生产治理样本', desc: '形成系统化安全生产治理经验，参与国家安全生产法规修订工作。', meritEffect: 95, extraEffect: { field: 'lineKpiScore', value: 18, label: 'KPI+18' }, grantCost: 28 },
        ],
      },
    ],
  },
];

const TABS = [
    { key: 'depts' as const,     label: '机构行动', icon: '🏛️', rank: 1  },
    { key: 'case' as const,      label: '案件侦办', icon: '🔍', rank: 1  },
    { key: 'petition' as const,  label: '信访',     icon: '📮', rank: 1  },
    { key: 'informant' as const, label: '线人网络', icon: '🕵️', rank: 5  },
    { key: 'sweep' as const,     label: '扫黑',     icon: '⚡', rank: 10 },
    { key: 'judicial' as const,  label: '司法干预', icon: '⚖️', rank: 10 },
    { key: 'coord' as const,     label: '协调会',   icon: '🤝', rank: 11 },
    { key: 'death' as const,     label: '死刑复核', icon: '☠️', rank: 10 },
    { key: 'detention' as const, label: '拘留所',   icon: '🏢', rank: 8  },
    { key: 'purge' as const,     label: '执法整风', icon: '🔨', rank: 11 },
    { key: 'net' as const,       label: '舆情执法', icon: '🌐', rank: 8  },
  ];

  // ── 机构行动（分级，消耗cityGovFund）─────────────────────────────────────
  const [deptExpanded, setDeptExpanded] = useState<Record<string, boolean>>({});
  const tierIdx = getTierIdx(save.rankLevel ?? 0);
  const TIER_LABELS = ['初级档', '晋升档', '高阶档'];
  const handleDeptAction = async (action: JudAction) => {
    if (acting) return;
    const tier = action.tiers[tierIdx];
    const grantFund = save.cityGovFund ?? 0;
    if (save.rankLevel < action.minRank) { showMsg(`需达到职级 ${action.minRank} 才可操作`, false); return; }
    if (isCool(`jud_dept_${action.key}`, action.cooldownDays)) { showMsg(`冷却中，还需 ${coolLeft(`jud_dept_${action.key}`, action.cooldownDays)} 天`, false); return; }
    if (grantFund < tier.grantCost) { showMsg(`💰 上级拨款不足！需 ${tier.grantCost} 万元，当前余额 ${grantFund} 万元`, false); return; }
    setActing(true);
    const nc = { ...cooldowns, [`jud_dept_${action.key}`]: gameDays };
    const patch: Parameters<typeof updateGameSave>[0] & Record<string, unknown> = {
      meritPoints: save.meritPoints + tier.meritEffect,
      cityGovFund: grantFund - tier.grantCost,
    };
    if (tier.extraEffect) {
      const cur = (save as unknown as Record<string, unknown>)[tier.extraEffect.field] as number ?? 0;
      (patch as Record<string, unknown>)[tier.extraEffect.field] = cur + tier.extraEffect.value;
    }
    try {
      await doUpdate(patch, nc);
      showMsg(`✅ ${tier.label} 完成！政绩 +${tier.meritEffect}，拨款 -${tier.grantCost}万${tier.extraEffect ? `，${tier.extraEffect.label}` : ''}`, true);
    } catch { showMsg('操作失败', false); } finally { setActing(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F3FF' }}>
      <StatusBar style="light" />
      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: '#4C1D95', flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ fontSize: 20, color: '#FFF' }}>←</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 2 }}>政法线 · 专属系统</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFF' }}>⚖️ 政法执法系统</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>社会稳定</Text>
          <Text style={{ fontSize: 14, fontWeight: '700', color: stabilityIdx >= 60 ? '#86EFAC' : '#FCA5A5' }}>{stabilityIdx}/100</Text>
        </View>
      </View>

      {/* 标签栏 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#3B0764' }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {TABS.map(tab => {
          const locked = save.rankLevel < tab.rank;
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => !locked && setActiveTab(tab.key)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                backgroundColor: active ? '#FFF' : locked ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)' }}>
              <Text style={{ fontSize: 13 }}>{tab.icon}</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: active ? '#4C1D95' : locked ? 'rgba(255,255,255,0.4)' : '#FFF' }}>
                {tab.label}{locked ? `🔒${tab.rank}` : ''}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#D1FAE5' : '#FEE2E2', borderRadius: 10, padding: 12 }}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#065F46' : '#991B1B', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* ══ 机构行动（分级，消耗cityGovFund）══ */}
        {activeTab === 'depts' && (
          <View style={{ gap: 10 }}>
            {/* 档位说明 */}
            <View style={{ backgroundColor: '#EDE9FE', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 16 }}>{['🟢','🟡','🔴'][tierIdx]}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#4C1D95' }}>当前解锁档位：{TIER_LABELS[tierIdx]}</Text>
                <Text style={{ fontSize: 10, color: '#6B7280', marginTop: 1 }}>
                  {tierIdx === 0 ? '职级5以下：基础行动，消耗少、效果适中' : tierIdx === 1 ? '职级5-8：进阶行动，消耗增加、成效显著' : '职级9+：高阶行动，消耗大、效果卓著'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#4C1D95', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>上级拨款</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{save.cityGovFund ?? 0}<Text style={{ fontSize: 10, fontWeight: '400' }}> 万</Text></Text>
              </View>
            </View>

            {JUD_DEPTS.map(dept => {
              const isOpen = deptExpanded[dept.key] ?? false;
              return (
                <View key={dept.key} style={{ backgroundColor: '#FFF', borderRadius: 14, borderWidth: 1, borderTopWidth: 3, borderColor: '#DDD6FE', borderTopColor: '#4C1D95', overflow: 'hidden' }}>
                  <Pressable onPress={() => setDeptExpanded(e => ({ ...e, [dept.key]: !isOpen }))} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                    <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{dept.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>{dept.name}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 1 }}>{dept.desc}</Text>
                    </View>
                    <Text style={{ fontSize: 14, color: '#6B7280' }}>{isOpen ? '▲' : '▼'}</Text>
                  </Pressable>
                  {isOpen && (
                    <View style={{ borderTopWidth: 1, borderTopColor: '#EDE9FE', padding: 10, gap: 8 }}>
                      {dept.actions.map(action => {
                        const tier = action.tiers[tierIdx];
                        const cooling = isCool(`jud_dept_${action.key}`, action.cooldownDays);
                        const locked = save.rankLevel < action.minRank;
                        const noFund = (save.cityGovFund ?? 0) < tier.grantCost;
                        const busy = acting;
                        const disabled = cooling || locked || busy;
                        return (
                          <View key={action.key} style={{ backgroundColor: locked || cooling ? '#F9FAFB' : '#F5F3FF', borderWidth: 1, borderColor: locked || cooling ? '#E5E7EB' : '#DDD6FE', borderRadius: 10, padding: 10 }}>
                            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                              <View style={{ flex: 1, gap: 3 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: locked ? '#9CA3AF' : '#1F2937' }}>{tier.label}</Text>
                                <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 16 }}>{tier.desc}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
                                  <Text style={{ fontSize: 10, color: '#4C1D95', backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>政绩 +{tier.meritEffect}</Text>
                                  {tier.extraEffect && <Text style={{ fontSize: 10, color: '#065F46', backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{tier.extraEffect.label}</Text>}
                                  <Text style={{ fontSize: 10, color: noFund && !locked ? '#991B1B' : '#92400E', backgroundColor: noFund && !locked ? '#FEE2E2' : '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>💰 {tier.grantCost}万</Text>
                                  <Text style={{ fontSize: 10, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>⏱ {action.cooldownDays}天</Text>
                                </View>
                              </View>
                              <Pressable
                                onPress={() => !disabled && void handleDeptAction(action)}
                                disabled={disabled}
                                style={{ marginLeft: 4, backgroundColor: locked || cooling ? '#E5E7EB' : noFund ? '#FEE2E2' : '#4C1D95', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 56, alignItems: 'center' }}>
                                {busy && !locked && !cooling ? <Text style={{ color: '#fff', fontSize: 11 }}>…</Text> : (
                                  <Text style={{ color: locked || cooling ? '#9CA3AF' : noFund ? '#991B1B' : '#fff', fontSize: 11, fontWeight: '700' }}>
                                    {locked ? '🔒' : cooling ? `${coolLeft(`jud_dept_${action.key}`, action.cooldownDays)}天` : noFund ? '不足' : '执行'}
                                  </Text>
                                )}
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ══ 13. 案件侦办链 ══ */}
        {activeTab === 'case' && (
          <View style={{ gap: 10 }}>
            <View style={{ backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14 }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C1D95', marginBottom: 4 }}>📁 当前案件进展</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, height: 8, backgroundColor: '#DDD6FE', borderRadius: 4 }}>
                  <View style={{ width: `${evidenceLevel}%`, height: 8, backgroundColor: '#7C3AED', borderRadius: 4 }} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#4C1D95' }}>证据链 {evidenceLevel}%</Text>
              </View>
              <Text style={{ fontSize: 11, color: '#6D28D9', marginTop: 6 }}>
                证据链达70%以上起诉，定罪率大幅提升；起诉后案件重置，可受理新案件。
              </Text>
            </View>
            {CASE_STAGES.map(stage => {
              const onCd = isCool(`judicial_case_${stage.key}`, stage.coolDays);
              const left = coolLeft(`judicial_case_${stage.key}`, stage.coolDays);
              const canProsecute = stage.key === 'prosecute' && evidenceLevel < 40;
              return (
                <View key={stage.key} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 22, marginRight: 10 }}>{stage.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>{stage.label}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{stage.desc}</Text>
                    </View>
                    <View style={{ backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 11, color: '#5B21B6', fontWeight: '600' }}>政绩+{stage.meritGain}</Text>
                    </View>
                  </View>
                  {canProsecute ? (
                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8 }}>
                      <Text style={{ fontSize: 12, color: '#92400E' }}>⚠️ 证据链不足40%，不建议贸然起诉，继续取证审讯</Text>
                    </View>
                  ) : onCd ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>⏳ 冷却中，还需 {left} 天</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleCaseStage(stage)} disabled={acting}
                      style={{ backgroundColor: acting ? '#D1D5DB' : '#4C1D95', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acting ? '执行中…' : `执行 ${stage.label}`}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ══ 14. 维稳系统 ══ */}
        {activeTab === 'stability' && (
          <View style={{ gap: 10 }}>
            <View style={{ backgroundColor: stLevel.bg, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: stLevel.color }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: stLevel.color, marginBottom: 4 }}>{stLevel.label}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1, height: 10, backgroundColor: '#E5E7EB', borderRadius: 5 }}>
                  <View style={{ width: `${stabilityIdx}%`, height: 10, backgroundColor: stLevel.level === 1 ? '#059669' : stLevel.level === 2 ? '#D97706' : stLevel.level === 3 ? '#EA580C' : '#DC2626', borderRadius: 5 }} />
                </View>
                <Text style={{ fontSize: 14, fontWeight: '700', color: stLevel.color }}>{stabilityIdx}/100</Text>
              </View>
              <Text style={{ fontSize: 11, color: stLevel.color, marginTop: 6, lineHeight: 18 }}>
                橙色/红色预警时可调用专项整治；社会稳定过低将触发群体事件危机。
              </Text>
            </View>
            {STABILITY_ACTIONS.map(action => {
              const onCd = isCool(`judicial_stab_${action.key}`, action.coolDays);
              const left = coolLeft(`judicial_stab_${action.key}`, action.coolDays);
              const locked = action.minLevel && stLevel.level < action.minLevel;
              return (
                <View key={action.key} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE9FE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 22, marginRight: 10 }}>{action.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937' }}>{action.label}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>{action.desc}</Text>
                    </View>
                  </View>
                  {locked ? (
                    <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 8 }}>
                      <Text style={{ fontSize: 12, color: '#92400E' }}>⚠️ 仅橙色预警（稳定≤60）以上可用</Text>
                    </View>
                  ) : onCd ? (
                    <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF' }}>⏳ 冷却中，还需 {left} 天</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleStabilityAction(action)} disabled={acting}
                      style={{ backgroundColor: acting ? '#D1D5DB' : '#7C3AED', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acting ? '行动中…' : action.label}</Text>
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* ══ 15. 扫黑除恶 ══ */}
        {activeTab === 'sweep' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 10 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 4 }}>需达到10级解锁</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF' }}>当前 Lv.{save.rankLevel}，还差 {10 - save.rankLevel} 级</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#4C1D95', borderRadius: 14, padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF', marginBottom: 4 }}>🏆 扫黑战果</Text>
                  <Text style={{ fontSize: 24, fontWeight: '900', color: '#C4B5FD' }}>{save.judicialSweepCount ?? 0}</Text>
                  <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>成功打掉黑势力团伙</Text>
                </View>
                {sweepResult && (
                  <View style={{ backgroundColor: sweepResult.startsWith('🎉') ? '#D1FAE5' : '#FEF3C7', borderRadius: 10, padding: 12 }}>
                    <Text style={{ fontSize: 13, color: sweepResult.startsWith('🎉') ? '#065F46' : '#92400E', fontWeight: '600' }}>{sweepResult}</Text>
                  </View>
                )}
                {SWEEP_CLUES.map(clue => {
                  const onCd = isCool(`judicial_sweep_${clue.key}`, 90);
                  const left = coolLeft(`judicial_sweep_${clue.key}`, 90);
                  return (
                    <View key={clue.key} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 16, marginRight: 8 }}>🎯</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1F2937', flex: 1 }}>{clue.name}</Text>
                        <View style={{ backgroundColor: clue.riskLevel === '高' ? '#FEE2E2' : clue.riskLevel === '中' ? '#FEF3C7' : '#D1FAE5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: clue.riskLevel === '高' ? '#991B1B' : clue.riskLevel === '中' ? '#92400E' : '#065F46' }}>
                            {clue.riskLevel}风险 · 政绩+{clue.meritGain}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>
                        保护伞风险：{Math.round(clue.shieldProb * 100)}%　揭露后巡视风险+{clue.inspRisk}
                      </Text>
                      {onCd ? (
                        <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>⏳ 行动冷却中，还需 {left} 天</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleSweep(clue)} disabled={acting}
                          style={{ backgroundColor: acting ? '#D1D5DB' : '#1D4ED8', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acting ? '行动中…' : '发起专项打击'}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ══ 16. 司法干预 ══ */}
        {activeTab === 'judicial' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 10 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到10级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#1E1B4B', borderRadius: 14, padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF', marginBottom: 6 }}>⚖️ 司法独立 vs 政治干预</Text>
                  <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 }}>
                    面对重大案件，你可以依照法律程序处置，或运用政治影响力干预结果。{'\n'}
                    干预成功率50%，失败将导致证据外泄，引发重大丑闻！
                  </Text>
                </View>
                {isCool('judicial_judicial', 60) ? (
                  <View style={{ backgroundColor: '#FEF9C3', borderRadius: 14, padding: 14, alignItems: 'center' }}>
                    <Text style={{ fontSize: 28, marginBottom: 4 }}>⏳</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: '#92400E' }}>冷却中，还需 {coolLeft('judicial_judicial', 60)} 天</Text>
                  </View>
                ) : (
                  <Pressable onPress={() => setShowJudicialModal(true)} style={{ backgroundColor: '#4C1D95', borderRadius: 14, padding: 16, alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>🎭 面对重大案件，如何处置？</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>60天冷却</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ 17. 信访接待 ══ */}
        {activeTab === 'petition' && (
          <View style={{ gap: 10 }}>
            <View style={{ backgroundColor: petitionBacklog >= 5 ? '#FEE2E2' : '#EDE9FE', borderRadius: 14, padding: 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: petitionBacklog >= 5 ? '#991B1B' : '#4C1D95' }}>
                  📮 信访积压状态
                </Text>
                <View style={{ backgroundColor: petitionBacklog >= 5 ? '#DC2626' : petitionBacklog >= 3 ? '#D97706' : '#059669', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>积压 {petitionBacklog} 件</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 18 }}>
                {petitionBacklog >= 8 ? '🚨 积压严重！已触发越级上访风险，必须立即处理！' :
                 petitionBacklog >= 5 ? '⚠️ 积压较多，继续增加将触发越级上访危机' : '✅ 信访状态良好，继续保持'}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: '#6B7280', fontWeight: '600' }}>本月上访案件（点击处理）：</Text>
            {PETITION_CASES.slice(0, 3).map(petCase => {
              const onCd = isCool(`judicial_petition_${petCase.key}`, 30);
              const left = coolLeft(`judicial_petition_${petCase.key}`, 30);
              return (
                <Pressable key={petCase.key} onPress={() => !onCd && setShowPetitionModal(petCase)}
                  style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: onCd ? '#E5E7EB' : '#DDD6FE', flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, marginRight: 12 }}>{petCase.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: onCd ? '#9CA3AF' : '#1F2937' }}>{petCase.label}</Text>
                    <Text style={{ fontSize: 11, color: '#9CA3AF' }}>{onCd ? `⏳ 已处理，还需 ${left} 天` : petCase.desc}</Text>
                  </View>
                  {!onCd && <Text style={{ fontSize: 16, color: '#7C3AED' }}>›</Text>}
                </Pressable>
              );
            })}
          </View>
        )}

        {/* ══ 18. 拘留所管理 ══ */}
        {activeTab === 'detention' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 8 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到8级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C1D95', marginBottom: 4 }}>🏢 拘留所管理</Text>
                  <Text style={{ fontSize: 12, color: '#6D28D9', lineHeight: 18 }}>
                    通过不同处置方式，提升被关押者的证据配合度，获取关键情报助力案件侦办。
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>当前证据链：</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#DDD6FE', borderRadius: 3 }}>
                      <View style={{ width: `${evidenceLevel}%`, height: 6, backgroundColor: '#7C3AED', borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#4C1D95' }}>{evidenceLevel}%</Text>
                  </View>
                </View>
                {[
                  { method: 'extend' as const, icon: '🔒', label: '延长羁押期限', desc: '延长羁押时间施加压力，证据链+20，政绩+15，但巡视风险+5，道德-5。' },
                  { method: 'soft' as const,   icon: '🤝', label: '人性化处置',   desc: '以人道方式感化被关押者，证据链+30，政绩+10，无副作用。' },
                  { method: 'exchange' as const, icon: '💎', label: '情报交换',   desc: '以宽大处理换取关键情报，证据链+40，政绩+25，但巡视风险+10，道德-10。' },
                ].map(item => {
                  const onCd = isCool(`judicial_detention_${item.method}`, 45);
                  const left = coolLeft(`judicial_detention_${item.method}`, 45);
                  return (
                    <View key={item.method} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 22, marginRight: 10 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>{item.label}</Text>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>{item.desc}</Text>
                        </View>
                      </View>
                      {onCd ? (
                        <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>⏳ 冷却中，还需 {left} 天</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleDetention(item.method)} disabled={acting}
                          style={{ backgroundColor: acting ? '#D1D5DB' : '#4C1D95', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acting ? '执行中…' : item.label}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ══ 19. 网络舆情执法 ══ */}
        {activeTab === 'net' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 8 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到8级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: speechControl >= 80 ? '#FEE2E2' : '#EDE9FE', borderRadius: 14, padding: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: speechControl >= 80 ? '#991B1B' : '#4C1D95' }}>🌐 言论管控指数</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: speechControl >= 80 ? '#DC2626' : '#7C3AED' }}>{speechControl}/100</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: '#DDD6FE', borderRadius: 4 }}>
                    <View style={{ width: `${speechControl}%`, height: 8, backgroundColor: speechControl >= 80 ? '#DC2626' : '#7C3AED', borderRadius: 4 }} />
                  </View>
                  {speechControl >= 80 && (
                    <Text style={{ fontSize: 11, color: '#991B1B', marginTop: 6, fontWeight: '600' }}>
                      ⚠️ 管控指数过高！继续执法将引发"言论管制"危机。建议发布正面引导降低指数。
                    </Text>
                  )}
                </View>
                {NET_ACTIONS.map(action => {
                  const onCd = isCool(`judicial_net_${action.key}`, action.coolDays);
                  const left = coolLeft(`judicial_net_${action.key}`, action.coolDays);
                  return (
                    <View key={action.key} style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ fontSize: 22, marginRight: 10 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937' }}>{action.label}</Text>
                          <Text style={{ fontSize: 11, color: '#6B7280' }}>{action.desc}</Text>
                        </View>
                        <View style={{ backgroundColor: '#EDE9FE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, color: '#5B21B6', fontWeight: '600' }}>+{action.meritGain}</Text>
                        </View>
                      </View>
                      {onCd ? (
                        <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>⏳ 冷却中，还需 {left} 天</Text>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleNetAction(action)} disabled={acting}
                          style={{ backgroundColor: acting ? '#D1D5DB' : '#4C1D95', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                          <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acting ? '执行中…' : action.label}</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}

        {/* ══ 20. 政法委协调会 ══ */}
        {activeTab === 'coord' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 11 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到11级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C1D95', marginBottom: 4 }}>🤝 政法委协调会</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>
                    定期召集公检法领导开协调会，统一口径处理敏感案件。成功率75%，协调失败则案件走向失控，引发稳定危机。
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {[
                      { label: '✅ 成功', desc: '稳定+12 好感+6 政绩+35', bg: '#D1FAE5', tc: '#065F46' },
                      { label: '❌ 失败', desc: '稳定-10 舆论-15 政绩-8', bg: '#FEE2E2', tc: '#991B1B' },
                    ].map(r => (
                      <View key={r.label} style={{ flex: 1, backgroundColor: r.bg, borderRadius: 8, padding: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: r.tc }}>{r.label}</Text>
                        <Text style={{ fontSize: 10, color: r.tc, marginTop: 2 }}>{r.desc}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: '#7C3AED' }}>已召开：{save.judicialCoordCount ?? 0} 次</Text>
                    <Text style={{ fontSize: 11, color: '#7C3AED' }}>冷却：60天</Text>
                  </View>
                </View>
                {isExtraCool('coord_meeting', 60) ? (
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#9CA3AF' }}>⏳ 冷却中，还需 {extraLeft('coord_meeting', 60)} 天</Text>
                  </View>
                ) : (
                  <Pressable onPress={handleCoordMeeting} disabled={acting}
                    style={{ backgroundColor: acting ? '#D1D5DB' : '#4C1D95', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{acting ? '召开中…' : '🤝 召开协调会（75%成功率）'}</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ 21. 线人情报网络 ══ */}
        {activeTab === 'informant' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 5 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到5级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C1D95' }}>🕵️ 线人情报网络</Text>
                    <View style={{ backgroundColor: '#7C3AED', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 }}>
                      <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>{save.informantCount ?? 0} / 20 人</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>
                    发展社会线人，定期获取辖区违法情报，提前介入可预防危机。线人暴露（10%概率）将引发公关危机。
                  </Text>
                </View>
                {/* 发展线人 */}
                <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>➕ 发展新线人</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>成功+1线人，政绩+8 | 暴露：巡视风险+12，民心-20（冷却30天）</Text>
                  {isExtraCool('informant_develop', 30) ? (
                    <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>⏳ 冷却中，还需 {extraLeft('informant_develop', 30)} 天</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleInformant('develop')} disabled={acting}
                      style={{ backgroundColor: acting ? '#D1D5DB' : '#5B21B6', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acting ? '执行中…' : '🕵️ 发展线人'}</Text>
                    </Pressable>
                  )}
                </View>
                {/* 激活情报 */}
                <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F2937', marginBottom: 4 }}>📡 激活情报网络</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 8 }}>利用现有线人获取情报，政绩+{(save.informantCount ?? 0) * 5}~+{(save.informantCount ?? 0) * 5 + 20}，稳定+5（冷却15天）</Text>
                  {isExtraCool('informant_activate', 15) ? (
                    <View style={{ backgroundColor: '#F3F4F6', borderRadius: 8, padding: 8 }}>
                      <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>⏳ 冷却中，还需 {extraLeft('informant_activate', 15)} 天</Text>
                    </View>
                  ) : (
                    <Pressable onPress={() => handleInformant('activate')} disabled={acting || (save.informantCount ?? 0) === 0}
                      style={{ backgroundColor: (save.informantCount ?? 0) === 0 ? '#E5E7EB' : acting ? '#D1D5DB' : '#4C1D95', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>
                        {(save.informantCount ?? 0) === 0 ? '尚无线人' : acting ? '执行中…' : '📡 激活情报'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        )}

        {/* ══ 22. 执法队伍整风 ══ */}
        {activeTab === 'purge' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 11 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到11级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#EDE9FE', borderRadius: 14, padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#4C1D95', marginBottom: 4 }}>🔨 执法队伍整风</Text>
                  <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 18 }}>
                    定期开展内部整顿，清除害群之马提升队伍战斗力。但被清除者可能反咬（30%），触发内部调查事件。
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    {[
                      { label: '✅ 顺利', desc: '稳定+15 好感+5 政绩+30', bg: '#D1FAE5', tc: '#065F46' },
                      { label: '⚠️ 反咬', desc: '风险+15 好感-8 政绩+10', bg: '#FEF3C7', tc: '#92400E' },
                    ].map(r => (
                      <View key={r.label} style={{ flex: 1, backgroundColor: r.bg, borderRadius: 8, padding: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: r.tc }}>{r.label}</Text>
                        <Text style={{ fontSize: 10, color: r.tc, marginTop: 2 }}>{r.desc}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: '#7C3AED' }}>已整风：{save.lawEnforcePurgeCount ?? 0} 次</Text>
                    <Text style={{ fontSize: 11, color: '#7C3AED' }}>冷却：90天</Text>
                  </View>
                </View>
                {isExtraCool('law_enforce_purge', 90) ? (
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#9CA3AF' }}>⏳ 冷却中，还需 {extraLeft('law_enforce_purge', 90)} 天</Text>
                  </View>
                ) : (
                  <Pressable onPress={handlePurge} disabled={acting}
                    style={{ backgroundColor: acting ? '#D1D5DB' : '#4C1D95', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{acting ? '整风中…' : '🔨 开展执法整风'}</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ══ 23. 死刑复核审批 ══ */}
        {activeTab === 'death' && (
          <View style={{ gap: 10 }}>
            {save.rankLevel < 10 ? (
              <View style={{ backgroundColor: '#F3F4F6', borderRadius: 14, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151' }}>需达到10级解锁</Text>
              </View>
            ) : (
              <>
                <View style={{ backgroundColor: '#1F2937', borderRadius: 14, padding: 14 }}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#F9FAFB', marginBottom: 4 }}>☠️ 死刑复核审批</Text>
                  <Text style={{ fontSize: 12, color: '#9CA3AF', lineHeight: 18 }}>
                    高级别解锁死刑复核权。核准与驳回各有政治影响，引入道德重压决策场景。冷却45天。
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>已复核：{save.deathReviewCount ?? 0} 次</Text>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>冷却：45天</Text>
                  </View>
                </View>
                {isExtraCool('death_review', 45) ? (
                  <View style={{ backgroundColor: '#F3F4F6', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, color: '#9CA3AF' }}>⏳ 冷却中，还需 {extraLeft('death_review', 45)} 天</Text>
                  </View>
                ) : (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#991B1B', marginBottom: 4 }}>⚡ 核准死刑</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 10, lineHeight: 17 }}>
                        维护法律威严，政绩+20，上司好感+4。但执行后道德-5，是沉重的权力代价。
                      </Text>
                      <Pressable onPress={() => handleDeathReview('approve')} disabled={acting}
                        style={{ backgroundColor: acting ? '#D1D5DB' : '#DC2626', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{acting ? '处理中…' : '⚡ 核准执行'}</Text>
                      </Pressable>
                    </View>
                    <View style={{ backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46', marginBottom: 4 }}>🔍 驳回发回重审</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginBottom: 10, lineHeight: 17 }}>
                        体现司法审慎，道德+8，民心+10，政绩+15。彰显人道主义精神。
                      </Text>
                      <Pressable onPress={() => handleDeathReview('reject')} disabled={acting}
                        style={{ backgroundColor: acting ? '#D1D5DB' : '#059669', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>{acting ? '处理中…' : '🔍 驳回重审'}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}

      </ScrollView>

      {/* ══ 20. 政法委协调会 JSX ══ */}
      {false && activeTab === 'coord' && null}

      {/* 司法干预弹窗 */}
      <Modal visible={showJudicialModal} transparent animationType="fade" onRequestClose={() => setShowJudicialModal(false)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 20, padding: 24, width: '100%' }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E1B4B', marginBottom: 8 }}>⚖️ 如何处理重大案件？</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', lineHeight: 20, marginBottom: 20 }}>
              「依法处置」：政绩+25，道德+5，积分+30，维护司法公正。{'\n'}
              「政治干预」：成功→政绩+50，上司好感+12；失败→证据外泄，丑闻爆发！
            </Text>
            <Pressable onPress={() => handleJudicial('legal')} disabled={acting}
              style={{ backgroundColor: '#059669', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>⚖️ 依法处置</Text>
            </Pressable>
            <Pressable onPress={() => handleJudicial('intervene')} disabled={acting}
              style={{ backgroundColor: '#DC2626', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>🎭 政治干预（50%成功率）</Text>
            </Pressable>
            <Pressable onPress={() => setShowJudicialModal(false)} style={{ padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#9CA3AF', fontSize: 14 }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 信访处理弹窗 */}
      <Modal visible={!!showPetitionModal} transparent animationType="slide" onRequestClose={() => setShowPetitionModal(null)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            {showPetitionModal && (
              <>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1F2937', marginBottom: 4 }}>
                  {showPetitionModal.icon} {showPetitionModal.label}
                </Text>
                <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 20 }}>{showPetitionModal.desc}</Text>
                <Pressable onPress={() => handlePetition(showPetitionModal, 'fast')} disabled={acting}
                  style={{ backgroundColor: '#4C1D95', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>⚡ 快速处理（政绩+10，积压-1）</Text>
                </Pressable>
                <Pressable onPress={() => handlePetition(showPetitionModal, 'thorough')} disabled={acting}
                  style={{ backgroundColor: '#059669', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>🔍 深入处理（政绩+18，积压-2）</Text>
                </Pressable>
                <Pressable onPress={() => setShowPetitionModal(null)} style={{ padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#9CA3AF', fontSize: 14 }}>暂不处理</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
