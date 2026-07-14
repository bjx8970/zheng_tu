// 双规审查系统 — 多量刑结局 + 子女仕途牵连
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { updateSave, getFamilyMembers, updateFamilyMember } from '@/db/gameApi';
import type { FamilyMember } from '@/types/game';

interface Evidence {
  key: string;
  title: string;
  tag: '关键证据' | '重要线索' | '一般材料';
  tagColor: string;
  dotColor: string;
  desc: string;
  active: boolean;
}

interface Lawyer {
  tier: 'basic' | 'senior' | 'elite';
  name: string;
  title: string;
  successBonus: number;
  cost: number;
  desc: string;
  tag: string;
  tagColor: string;
}

interface Verdict {
  key: string;
  label: string;
  labelColor: string;
  labelBg: string;
  icon: string;
  evidMin: number;
  evidMax: number;
  rankPenalty: number;
  meritPenalty: number;
  moralPenalty: number;
  happyPenalty: number;
  isGameOver: boolean;
  childSeverity: 'none' | 'light' | 'medium' | 'severe';
  desc: string;
}

const VERDICTS: Verdict[] = [
  {
    key: 'warning', label: '党内警告', labelColor: '#7B5E2A', labelBg: '#FFF9E6', icon: '⚠️',
    evidMin: 1, evidMax: 2, rankPenalty: 0, meritPenalty: 50, moralPenalty: 10, happyPenalty: 10,
    isGameOver: false, childSeverity: 'none',
    desc: '证据不足，组织给予党内警告处分，须向党组织作书面检查，留党察看半年。',
  },
  {
    key: 'serious_warning', label: '严重警告', labelColor: '#9B4400', labelBg: '#FFF5EE', icon: '📋',
    evidMin: 2, evidMax: 3, rankPenalty: -1, meritPenalty: 150, moralPenalty: 15, happyPenalty: 20,
    isGameOver: false, childSeverity: 'light',
    desc: '受到党内严重警告处分，职级降一级，在党内通报批评，留党察看一年。',
  },
  {
    key: 'probation', label: '留党察看', labelColor: '#1D3B5E', labelBg: '#EEF2F7', icon: '🔵',
    evidMin: 2, evidMax: 3, rankPenalty: -1, meritPenalty: 120, moralPenalty: 18, happyPenalty: 25,
    isGameOver: false, childSeverity: 'light',
    desc: '留党察看两年，期间不得担任领导职务，须定期向组织汇报思想。',
  },
  {
    key: 'removal', label: '撤销党内职务', labelColor: '#C82829', labelBg: '#FFF0F0', icon: '🔴',
    evidMin: 3, evidMax: 4, rankPenalty: -2, meritPenalty: 250, moralPenalty: 25, happyPenalty: 35,
    isGameOver: false, childSeverity: 'medium',
    desc: '撤销党内全部职务，职级降两级，移送纪检继续审查，留党察看两年。',
  },
  {
    key: 'expel_party', label: '开除党籍', labelColor: '#8B0000', labelBg: '#FFE8E8', icon: '❌',
    evidMin: 4, evidMax: 5, rankPenalty: -999, meritPenalty: 500, moralPenalty: 40, happyPenalty: 60,
    isGameOver: true, childSeverity: 'severe',
    desc: '开除党籍，公职人员身份终止，移送司法机关追诉刑事责任，从政生涯彻底终结。',
  },
  {
    key: 'imprisonment', label: '有期徒刑', labelColor: '#5a0000', labelBg: '#FFE0E0', icon: '⛓️',
    evidMin: 4, evidMax: 5, rankPenalty: -999, meritPenalty: 999, moralPenalty: 50, happyPenalty: 80,
    isGameOver: true, childSeverity: 'severe',
    desc: '被判处有期徒刑，丧失政治权利，家产被没收，从政生涯就此画上终止符。',
  },
];

const SEVERITY_META: Record<'light' | 'medium' | 'severe', { label: string; color: string; bg: string; blockReason: string }> = {
  light:  { label: '轻微影响', color: '#7B5E2A', bg: '#FFF9E6', blockReason: '父母受党纪处分，子女晋升通道暂时受限' },
  medium: { label: '中度受阻', color: '#9B4400', bg: '#FFF5EE', blockReason: '父母撤职处分，子女仕途审查受到负面备注' },
  severe: { label: '永久受阻', color: '#8B0000', bg: '#FFE8E8', blockReason: '父母开除党籍/入狱，子女体制内职务被免除，仕途彻底断绝' },
};

function determineVerdict(evidLevel: number, confessed: boolean): Verdict {
  const eff = confessed ? Math.max(1, evidLevel - 1) : evidLevel;
  if (eff <= 1) return VERDICTS[0];
  if (eff === 2) return Math.random() < 0.55 ? VERDICTS[2] : VERDICTS[1];
  if (eff === 3) return Math.random() < 0.5 ? VERDICTS[3] : VERDICTS[2];
  if (eff === 4) return Math.random() < 0.6 ? VERDICTS[4] : VERDICTS[3];
  return Math.random() < 0.7 ? VERDICTS[5] : VERDICTS[4];
}

const LAWYERS: Lawyer[] = [
  { tier: 'basic', name: '张明辉', title: '普通律师', successBonus: 10, cost: 20, tag: '基础', tagColor: '#7B5E2A', desc: '执业5年，熟悉行政诉讼程序，胜诉率一般' },
  { tier: 'senior', name: '李志远', title: '资深律师', successBonus: 25, cost: 60, tag: '推荐', tagColor: '#1D3B5E', desc: '前检察院官员，深谙纪检体系，多次成功辩护' },
  { tier: 'elite', name: '王国栋', title: '顶级律师', successBonus: 45, cost: 120, tag: '精英', tagColor: '#6B0000', desc: '中央高层专案顾问，处理数十件省部级案件' },
];

function calcEvidenceLevel(bribery: number, moral: number, risk: number, corruptTotal: number): number {
  let s = 0;
  if (bribery >= 500000) s += 3; else if (bribery >= 100000) s += 2; else if (bribery > 0) s += 1;
  if (moral < 30) s += 2; else if (moral < 50) s += 1;
  if (risk >= 80) s += 2; else if (risk >= 60) s += 1;
  // 贪污金额纳入证据等级
  if (corruptTotal >= 50000000) s += 3;      // 5000万以上：重大贪污
  else if (corruptTotal >= 10000000) s += 2; // 1000万以上：较大贪污
  else if (corruptTotal >= 1000000) s += 1;  // 100万以上：一般贪污
  return Math.min(5, Math.max(1, s));
}

function buildEvidences(bribery: number, moral: number, risk: number, grayIncome: number): Evidence[] {
  return [
    { key: 'bribery', title: '受贿证据', tag: '关键证据', tagColor: '#8B0000', dotColor: '#C82829',
      desc: bribery > 0 ? `多名行贿人已配合调查，涉及资金约 ¥${bribery.toLocaleString()}元` : '暂未发现直接受贿记录',
      active: bribery >= 50000 },
    { key: 'wealth', title: '财产申报异常', tag: '关键证据', tagColor: '#8B0000', dotColor: '#C82829',
      desc: grayIncome > 0 ? `名下房产及存款超出合法收入，差额约¥${grayIncome.toLocaleString()}元` : '财产申报数额与合法收入基本吻合',
      active: grayIncome >= 200000 || moral < 40 },
    { key: 'approval', title: '违规审批记录', tag: '重要线索', tagColor: '#7B5E2A', dotColor: '#D4A012',
      desc: risk >= 60 ? '多份违规审批文件已被查获，当事人签字清晰' : '部分审批文件正在核查中',
      active: risk >= 60 },
    { key: 'comm', title: '通讯记录', tag: '重要线索', tagColor: '#7B5E2A', dotColor: '#D4A012',
      desc: bribery > 0 ? '与商人频繁往来的通讯记录已被调取分析' : '通讯记录暂未发现明显异常',
      active: bribery > 0 && moral < 60 },
    { key: 'witness', title: '证人证词', tag: '一般材料', tagColor: '#555', dotColor: '#888',
      desc: moral < 50 ? '2名知情同事已就相关事实提供书面证词' : '暂无人员主动提供证词',
      active: moral < 50 },
    { key: 'lifestyle', title: '生活作风问题线索', tag: '一般材料', tagColor: '#555', dotColor: '#888',
      desc: '群众举报材料汇总，部分内容待核实',
      active: risk >= 40 },
  ];
}

function calcBaseSuccessRate(evidLevel: number, moral: number): number {
  return Math.min(85, Math.max(10, Math.round(70 - evidLevel * 10 + Math.max(0, moral - 50) * 0.3)));
}

// ── 主组件 ─────────────────────────────────────────────────────────
export default function ShuangguiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, isLoading } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [selectedLawyer, setSelectedLawyer] = useState<Lawyer | null>(null);
  const [showLawyerPanel, setShowLawyerPanel] = useState(false);
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<{
    msg: string; ok: boolean; final: boolean;
    verdict?: Verdict; childrenAffected?: FamilyMember[];
  } | null>(null);

  useFocusEffect(useCallback(() => {
    setResult(null); setSelectedLawyer(null); setShowLawyerPanel(false);
  }, []));

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a0a0a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#C82829" />
      </View>
    );
  }

  const bribery = save.briberyAccepted ?? 0;
  const moral = save.moralValue ?? 50;
  const risk = save.inspectionRisk ?? 0;
  const grayIncome = save.grayIncomeTotal ?? 0;
  const corruptTotal = save.corruptTotal ?? 0;
  const evidLevel = calcEvidenceLevel(bribery, moral, risk, corruptTotal);
  const evidences = buildEvidences(bribery, moral, risk, grayIncome);
  const activeCount = evidences.filter(e => e.active).length;
  const baseRate = calcBaseSuccessRate(evidLevel, moral);
  const finalRate = Math.min(90, baseRate + (selectedLawyer?.successBonus ?? 0));

  // ── 量刑 + 子女牵连 ───────────────────────────────────────────
  const applyVerdict = async (verdict: Verdict, _confessed: boolean) => {
    const children = await getFamilyMembers(save.id);
    const adultChildren = children.filter(c => c.memberType === 'child' && c.isAdult && c.adultPath === '从政');
    const affectedChildren: FamilyMember[] = [];
    if (verdict.childSeverity !== 'none' && adultChildren.length > 0) {
      const meta = SEVERITY_META[verdict.childSeverity];
      for (const child of adultChildren) {
        await updateFamilyMember(child.id, { careerBlocked: true, blockReason: meta.blockReason, blockSeverity: verdict.childSeverity });
        affectedChildren.push(child);
      }
    }

    // ── 派系牵连：双规时主派系关系大幅受损，友好派系也受波及 ──────────────
    const factionPenalty = verdict.isGameOver ? 35 : verdict.rankPenalty < 0 ? 25 : 15;
    const factionUpdates: Partial<import('@/types/game').PlayerSave> = {};
    const pf = save.primaryFaction ?? '';
    // 主派系重伤（被抓后派系视为包袱，急于切割）
    if (pf === 'reform')    factionUpdates.reformFaction    = Math.max(0, (save.reformFaction    ?? 50) - factionPenalty);
    if (pf === 'pragmatic') factionUpdates.pragmaticFaction = Math.max(0, (save.pragmaticFaction ?? 50) - factionPenalty);
    if (pf === 'cyl')       factionUpdates.cylRelation      = Math.max(0, (save.cylRelation      ?? 30) - factionPenalty);
    if (pf === 'techno')    factionUpdates.technoRelation   = Math.max(0, (save.technoRelation   ?? 30) - factionPenalty);
    if (pf === 'local')     factionUpdates.localRelation    = Math.max(0, (save.localRelation    ?? 30) - factionPenalty);
    // 非主派系也受轻微牵连（-8，连带形象受损）
    const minorPenalty = 8;
    if (pf !== 'reform')    factionUpdates.reformFaction    = Math.max(0, (save.reformFaction    ?? 50) - minorPenalty);
    if (pf !== 'pragmatic') factionUpdates.pragmaticFaction = Math.max(0, (save.pragmaticFaction ?? 50) - minorPenalty);
    if (pf !== 'cyl')       factionUpdates.cylRelation      = Math.max(0, (save.cylRelation      ?? 30) - minorPenalty);
    if (pf !== 'techno')    factionUpdates.technoRelation   = Math.max(0, (save.technoRelation   ?? 30) - minorPenalty);
    if (pf !== 'local')     factionUpdates.localRelation    = Math.max(0, (save.localRelation    ?? 30) - minorPenalty);
    // 被双规时也释放所辖省份（清空该省的派系归属归为中立）
    const curProvinceMap = { ...(save.factionProvinceMap ?? {}) };
    Object.keys(curProvinceMap).forEach(abbr => {
      if (curProvinceMap[abbr] === pf) delete curProvinceMap[abbr];
    });
    factionUpdates.factionProvinceMap = curProvinceMap;

    const verdictText = `${verdict.label}：${verdict.desc}`;
    if (verdict.isGameOver) {
      await updateSave(save.id, {
        isUnderInvestigation: false, gameOverType: 'corruption', gameOverVerdict: verdictText,
        inspectionRisk: 0, investigationDay: 0, investigationEvidenceLevel: 0,
        moralValue: Math.max(0, moral - verdict.moralPenalty),
        familyHappiness: Math.max(0, save.familyHappiness - verdict.happyPenalty),
      });
      await updateGameSave(factionUpdates);
    } else {
      const newRank = verdict.rankPenalty < 0 ? Math.max(1, (save.rankLevel ?? 1) + verdict.rankPenalty) : save.rankLevel;
      await updateGameSave({
        isUnderInvestigation: false, inspectionRisk: 0,
        moralValue: Math.max(0, moral - verdict.moralPenalty),
        rankLevel: newRank,
        meritPoints: Math.max(0, save.meritPoints - verdict.meritPenalty),
        familyHappiness: Math.max(0, save.familyHappiness - verdict.happyPenalty),
        investigationDay: 0, investigationEvidenceLevel: 0,
        ...factionUpdates,
      });
    }
    // 生成派系牵连摘要文本
    const factionNote = pf
      ? `\n\n⚠️ 派系牵连：${['reform','pragmatic','cyl','techno','local'].includes(pf)
          ? ({ reform:'改革开放系', pragmatic:'国家系', cyl:'共青团系', techno:'技术官僚系', local:'纪检法治系' }[pf as 'reform'|'pragmatic'|'cyl'|'techno'|'local'])
          : pf}关系 -${factionPenalty}，各派系形象普遍受损 -${minorPenalty}。`
      : '';
    void saveResult('shuanggui_verdict_'+verdict.key, {ok:!verdict.isGameOver,desc:`【${verdict.label}】${verdict.desc}`,day:save.gameDays??0});
    setResult({ msg: `【${verdict.label}】\n${verdict.desc}${factionNote}`, ok: !verdict.isGameOver, final: true, verdict, childrenAffected: affectedChildren });
    if (verdict.isGameOver) setTimeout(() => router.replace('/(app)/game-over'), 3000);
  };

  // ── 协议谈判：消耗meritPoints换取降低1档量刑 ──────────────────────────────
  const handleNegotiate = async () => {
    if (acting || result?.final) return;
    const cost = 200;
    if (save.meritPoints < cost) {
      setResult({ msg: `政绩不足！协议谈判需消耗 ${cost} 政绩（当前${save.meritPoints}）`, ok: false, final: false });
      return;
    }
    setActing(true);
    try {
      const successRate = Math.min(75, 30 + moral * 0.5);
      if (Math.random() * 100 < successRate) {
        // 成功：降低1档证据等级，相当于协议认罪但争取到更轻处分
        const reducedEvid = Math.max(1, evidLevel - 1);
        const verdict = determineVerdict(reducedEvid, true);
        await updateGameSave({ meritPoints: Math.max(0, save.meritPoints - cost) });
        await applyVerdict(verdict, true);
        setResult(prev => prev ? { ...prev, msg: `谈判成功！检察官接受协议，证据等级下降1档。\n${prev.msg}` } : null);
      } else {
        await updateGameSave({ meritPoints: Math.max(0, save.meritPoints - cost) });
        setResult({ msg: `谈判失败！检察官拒绝协议请求，消耗了 ${cost} 政绩，且态度更加强硬。`, ok: false, final: false });
      }
    } catch {
      setResult({ msg: '操作失败，请稍后重试', ok: false, final: false });
    } finally {
      setActing(false);
    }
  };

  // ── 检举他人：消耗bossFavor换取降低证据等级 ────────────────────────────────
  const handleInform = async () => {
    if (acting || result?.final) return;
    const favorCost = 30;
    const curFavor = save.bossFavor ?? 0;
    if (curFavor < favorCost) {
      setResult({ msg: `上司好感度不足！检举他人需消耗 ${favorCost} 好感度（当前${curFavor}），需先维护好与上司的关系。`, ok: false, final: false });
      return;
    }
    if (evidLevel <= 1) {
      setResult({ msg: '当前证据已是最低等级，无需检举他人。', ok: true, final: false });
      return;
    }
    setActing(true);
    try {
      // 检举他人：降低自身证据1级，但好感度大幅下降，道德-10
      await updateGameSave({
        bossFavor: Math.max(0, curFavor - favorCost),
        moralValue: Math.max(0, moral - 10),
        investigationEvidenceLevel: Math.max(1, (save.investigationEvidenceLevel ?? evidLevel) - 1),
      });
      setResult({
        msg: `检举成功！向调查组提供了同僚的违规线索，检察官将注意力部分转移，证据等级降低1档。\n\n代价：上司好感 -${favorCost}，道德 -10。你的政治信誉在圈子里受损，日后晋升更加艰难。`,
        ok: true,
        final: false,
      });
    } catch {
      setResult({ msg: '操作失败，请稍后重试', ok: false, final: false });
    } finally {
      setActing(false);
    }
  };

  // ── 庭外和解：花费灰色收入换取关键证据撤销 ────────────────────────────────
  const handleSettle = async () => {
    if (acting || result?.final) return;
    const settleCost = Math.max(500000, Math.round((grayIncome * 0.4) / 10000) * 10000);
    if (grayIncome < settleCost) {
      setResult({ msg: `灰色收入不足！庭外和解需支付 ¥${settleCost.toLocaleString()}，当前灰色收入¥${grayIncome.toLocaleString()}。`, ok: false, final: false });
      return;
    }
    if (evidLevel <= 1) {
      setResult({ msg: '证据等级已很低，无需高额和解。', ok: true, final: false });
      return;
    }
    setActing(true);
    try {
      const successRate = Math.min(70, 40 + (settleCost / 1000000) * 5);
      if (Math.random() * 100 < successRate) {
        await updateGameSave({
          grayIncomeTotal: Math.max(0, grayIncome - settleCost),
          investigationEvidenceLevel: Math.max(1, (save.investigationEvidenceLevel ?? evidLevel) - 1),
          inspectionRisk: Math.max(0, (save.inspectionRisk ?? 0) - 15),
        });
        setResult({
          msg: `庭外和解成功！支付了 ¥${settleCost.toLocaleString()} 疏通关系，关键证据被部分撤销，证据等级降低1档，巡视风险 -15。`,
          ok: true,
          final: false,
        });
      } else {
        await updateGameSave({ grayIncomeTotal: Math.max(0, grayIncome - Math.round(settleCost * 0.3)) });
        setResult({
          msg: `和解失败！对方收了定金但拒绝配合，损失 ¥${Math.round(settleCost * 0.3).toLocaleString()}，且此举可能引起纪委注意。`,
          ok: false,
          final: false,
        });
      }
    } catch {
      setResult({ msg: '操作失败，请稍后重试', ok: false, final: false });
    } finally {
      setActing(false);
    }
  };

  const handleConfess = async () => {
    if (acting || result?.final) return;
    setActing(true);
    try {
      await applyVerdict(determineVerdict(evidLevel, true), true);
    } catch {
      setResult({ msg: '操作失败，请稍后重试', ok: false, final: false });
    } finally {
      setActing(false);
    }
  };

  const handleDefend = async () => {
    if (acting || result?.final) return;
    if (selectedLawyer && save.meritPoints < selectedLawyer.cost) {
      setResult({ msg: `政绩不足，无法支付${selectedLawyer.name}的律师费（需${selectedLawyer.cost}）`, ok: false, final: false });
      return;
    }
    setActing(true);
    const meritCost = selectedLawyer?.cost ?? 0;
    try {
      if (Math.random() * 100 < finalRate) {
        await updateGameSave({ isUnderInvestigation: false, inspectionRisk: 0, meritPoints: Math.max(0, save.meritPoints - meritCost), investigationDay: 0, investigationEvidenceLevel: 0 });
        setResult({ msg: `辩护成功！证据不足，案件被撤销，你重获自由。律师费消耗${meritCost}政绩。`, ok: true, final: true });
      } else {
        await applyVerdict(determineVerdict(evidLevel, false), false);
      }
    } catch {
      setResult({ msg: '操作失败，请稍后重试', ok: false, final: false });
    } finally {
      setActing(false);
    }
  };

  const evidLevelLabel = ['极弱', '较弱', '一般', '较强', '极强'][evidLevel - 1] ?? '一般';
  const evidLevelColor = ['#2a7a3b', '#5a8a2a', '#D4A012', '#C82829', '#8B0000'][evidLevel - 1] ?? '#888';

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0505' }}>
      <StatusBar style="light" backgroundColor="#0f0505" />
      <View style={{ backgroundColor: '#1a0505', paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}>
          <Text style={{ color: '#cc4444', fontSize: 22 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#cc4444', fontSize: 11, letterSpacing: 4, marginBottom: 4 }}>▲  双规审查  ▲</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>双规审查</Text>
          <Text style={{ color: 'rgba(255,150,150,0.6)', fontSize: 10, letterSpacing: 2, marginTop: 3 }}>
            中央纪律检查委员会 · 专案审查组
          </Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        <View style={{ padding: 14, gap: 14 }}>

          {/* 量刑结局预览 */}
          <View style={{ backgroundColor: '#1e0808', borderWidth: 1, borderColor: '#5a1010', padding: 12 }}>
            <Text style={{ color: '#ff9999', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 10 }}>⚖️ 可能量刑结局</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {VERDICTS.map(v => (
                <View key={v.key} style={{ backgroundColor: v.labelBg, borderWidth: 1, borderColor: v.labelColor, paddingHorizontal: 7, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Text style={{ fontSize: 10 }}>{v.icon}</Text>
                  <Text style={{ color: v.labelColor, fontSize: 9, fontWeight: '700' }}>{v.label}</Text>
                  {v.isGameOver && <Text style={{ color: '#8B0000', fontSize: 7 }}>终局</Text>}
                </View>
              ))}
            </View>
            <Text style={{ color: 'rgba(255,180,180,0.6)', fontSize: 9, marginTop: 8, lineHeight: 14 }}>
              量刑由证据强度与认罪态度综合决定。坦白可降低一档量刑，辩护失败则按原证据等级处置。
            </Text>
          </View>

          {/* 证据材料 */}
          <View style={{ backgroundColor: '#1e0a0a', borderWidth: 1, borderColor: '#5a1010', padding: 14, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>📁</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 }}>案件证据材料</Text>
              <View style={{ marginLeft: 'auto', backgroundColor: evidLevelColor, paddingHorizontal: 8, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>证据强度 {evidLevelLabel}</Text>
              </View>
            </View>
            <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 11, lineHeight: 16 }}>
              纪检机关已掌握以下证据，审讯前请仔细了解，选择应对策略。
            </Text>
            {evidences.map(ev => (
              <View key={ev.key} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ev.active ? ev.dotColor : '#444', marginTop: 4 }} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ color: ev.active ? '#ff9999' : '#666', fontSize: 12, fontWeight: '700' }}>{ev.title}</Text>
                    <View style={{ backgroundColor: ev.active ? ev.tagColor : '#333', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 8 }}>{ev.tag}</Text>
                    </View>
                  </View>
                  <Text style={{ color: ev.active ? 'rgba(255,200,200,0.8)' : '#555', fontSize: 10, lineHeight: 15 }}>{ev.desc}</Text>
                </View>
              </View>
            ))}
            <View style={{ backgroundColor: '#2a0808', borderWidth: 1, borderColor: '#5a1010', padding: 10, flexDirection: 'row', gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 12 }}>⚠️</Text>
              <Text style={{ color: 'rgba(255,200,150,0.9)', fontSize: 10, flex: 1, lineHeight: 15 }}>
                当前激活证据 {activeCount}/6 条，证据越多量刑越重。
              </Text>
            </View>
          </View>

          {/* 数值卡 */}
          <View style={{ backgroundColor: '#1a0a0a', borderWidth: 1, borderColor: '#4a1010', padding: 12, flexDirection: 'row' }}>
            {[
              { label: '受贿金额', val: `¥${bribery.toLocaleString()}`, color: bribery > 0 ? '#C82829' : '#555' },
              { label: '道德指数', val: String(moral), color: moral < 40 ? '#C82829' : moral < 60 ? '#D4A012' : '#2a7a3b' },
              { label: '巡视风险', val: `${risk}%`, color: risk >= 70 ? '#C82829' : risk >= 50 ? '#D4A012' : '#2a7a3b' },
            ].map((item, i) => (
              <View key={item.label} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: '#3a0a0a' }}>
                <Text style={{ color: '#666', fontSize: 9 }}>{item.label}</Text>
                <Text style={{ color: item.color, fontSize: 14, fontWeight: '900', marginTop: 2 }}>{item.val}</Text>
              </View>
            ))}
          </View>

          {/* ── 贪污档案卡片 ── */}
          {corruptTotal > 0 && (() => {
            const corruptLevel =
              corruptTotal >= 50000000 ? { label: '特别重大', color: '#8B0000', bg: '#FFE0E0', weight: '重大贪污罪，最高无期/死刑' } :
              corruptTotal >= 10000000 ? { label: '重大', color: '#C82829', bg: '#FFECEC', weight: '重大贪污罪，通常判处10年以上有期徒刑' } :
              corruptTotal >= 3000000  ? { label: '较大', color: '#9B4400', bg: '#FFF5EE', weight: '较大金额，通常判处5-10年有期徒刑' } :
              corruptTotal >= 1000000  ? { label: '一般', color: '#7B5E2A', bg: '#FFF9E6', weight: '达到刑事追诉标准，通常判处3年以上有期徒刑' } :
                                         { label: '轻微', color: '#555', bg: '#F5F5F5', weight: '未达到重大犯罪标准，党纪处分为主' };
            return (
              <View style={{ backgroundColor: '#1e0a0a', borderWidth: 1, borderColor: '#7a2020', padding: 14, gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <Text style={{ fontSize: 16 }}>🗂️</Text>
                  <Text style={{ color: '#ff9999', fontSize: 13, fontWeight: '900', letterSpacing: 1 }}>贪污违纪档案</Text>
                  <View style={{ marginLeft: 'auto', backgroundColor: corruptLevel.bg, borderWidth: 1, borderColor: corruptLevel.color, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: corruptLevel.color, fontSize: 9, fontWeight: '900' }}>{corruptLevel.label}贪污</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <View style={{ flex: 1, backgroundColor: '#2a0808', padding: 10, borderWidth: 1, borderColor: '#5a1010' }}>
                    <Text style={{ color: '#888', fontSize: 9, marginBottom: 2 }}>累计贪污金额</Text>
                    <Text style={{ color: '#ff6666', fontSize: 20, fontWeight: '900' }}>¥{corruptTotal.toLocaleString()}</Text>
                    <Text style={{ color: 'rgba(255,150,150,0.5)', fontSize: 8, marginTop: 2 }}>元人民币</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#2a0808', padding: 10, borderWidth: 1, borderColor: '#5a1010' }}>
                    <Text style={{ color: '#888', fontSize: 9, marginBottom: 2 }}>证据对量刑的影响</Text>
                    <Text style={{ color: corruptLevel.color, fontSize: 10, fontWeight: '700', lineHeight: 15 }}>
                      {corruptTotal >= 50000000 ? '证据等级 +3' :
                       corruptTotal >= 10000000 ? '证据等级 +2' :
                       corruptTotal >= 1000000  ? '证据等级 +1' : '影响轻微'}
                    </Text>
                    <Text style={{ color: 'rgba(255,180,180,0.5)', fontSize: 8, marginTop: 2 }}>(已纳入当前证据强度)</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#300a0a', borderWidth: 1, borderColor: '#6a1a1a', padding: 10, gap: 4 }}>
                  <Text style={{ color: '#ffcccc', fontSize: 10, fontWeight: '700' }}>⚖️ 司法量刑参考</Text>
                  <Text style={{ color: 'rgba(255,180,180,0.75)', fontSize: 10, lineHeight: 16 }}>{corruptLevel.weight}</Text>
                  <Text style={{ color: 'rgba(255,150,150,0.5)', fontSize: 9, marginTop: 4, lineHeight: 14 }}>
                    坦白认罪可争取宽大处理，辩护抵赖若败诉则从重量刑。贪污档案将作为本次审查的核心证据。
                  </Text>
                </View>
              </View>
            );
          })()}

          {/* 律师选择面板 */}
          {showLawyerPanel && (
            <View style={{ backgroundColor: '#1e0a0a', borderWidth: 1, borderColor: '#5a1010', padding: 14, gap: 10 }}>
              <Text style={{ color: '#ff9999', fontSize: 12, fontWeight: '900', letterSpacing: 2 }}>⚖️ 选择辩护律师</Text>
              {LAWYERS.map(l => {
                const isSel = selectedLawyer?.tier === l.tier;
                return (
                  <Pressable key={l.tier} onPress={() => setSelectedLawyer(isSel ? null : l)}
                    style={{ borderWidth: 1, borderColor: isSel ? '#C82829' : '#3a1010', backgroundColor: isSel ? '#2a0808' : '#150505', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{l.name}</Text>
                        <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 10 }}>{l.title}</Text>
                        <View style={{ backgroundColor: l.tagColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ color: '#fff', fontSize: 8 }}>{l.tag}</Text>
                        </View>
                      </View>
                      <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 10, marginTop: 2 }}>{l.desc}</Text>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                        <Text style={{ color: '#2a7a3b', fontSize: 10, fontWeight: '700' }}>成功率 +{l.successBonus}%</Text>
                        <Text style={{ color: '#D4A012', fontSize: 10 }}>消耗 {l.cost} 政绩</Text>
                      </View>
                    </View>
                    {isSel && <Text style={{ color: '#C82829', fontSize: 16 }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* 辩护成功率 */}
          <View style={{ backgroundColor: '#1a0505', borderWidth: 1, borderColor: '#3a0a0a', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text style={{ color: '#888', fontSize: 10 }}>当前辩护成功率</Text>
            <Text style={{ color: finalRate >= 60 ? '#2a7a3b' : finalRate >= 40 ? '#D4A012' : '#C82829', fontSize: 22, fontWeight: '900' }}>
              {finalRate}%
            </Text>
            <Text style={{ color: '#555', fontSize: 10, flex: 1 }}>
              基础{baseRate}%{selectedLawyer ? `+律师${selectedLawyer.successBonus}%` : '，选律师可提升'}
            </Text>
          </View>

          {/* 操作按钮 */}
          {!result?.final && (
            <View style={{ gap: 10 }}>
              {/* ── 危机公关策略（先于认罪/辩护使用）── */}
              <Text style={{ color: '#ff9999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 2 }}>🛡️ 危机公关策略（可叠加使用）</Text>

              {/* 协议谈判 */}
              <Pressable onPress={() => void handleNegotiate()} disabled={acting}
                style={{ backgroundColor: '#2a1a3a', borderWidth: 1, borderColor: '#6a3a8a', paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: acting ? 0.6 : 1 }}>
                <Text style={{ fontSize: 18 }}>🤝</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#ddb8ff', fontWeight: '700', fontSize: 13 }}>协议谈判</Text>
                  <Text style={{ color: 'rgba(200,180,255,0.6)', fontSize: 9, marginTop: 2 }}>
                    消耗 200 政绩 · 成功率{Math.round(Math.min(75, 30 + moral * 0.5))}% · 证据降1档 + 协议认罪宽大
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(106,58,138,0.4)', paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#ddb8ff', fontSize: 10, fontWeight: '700' }}>-200政绩</Text>
                </View>
              </Pressable>

              {/* 检举他人 */}
              <Pressable onPress={() => void handleInform()} disabled={acting}
                style={{ backgroundColor: '#1a2a1a', borderWidth: 1, borderColor: '#3a5a3a', paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: acting ? 0.6 : 1 }}>
                <Text style={{ fontSize: 18 }}>🗣️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#88ff88', fontWeight: '700', fontSize: 13 }}>检举他人</Text>
                  <Text style={{ color: 'rgba(140,255,140,0.6)', fontSize: 9, marginTop: 2 }}>
                    消耗 30 好感度 + 道德-10 · 证据降1档 · 出卖同僚获宽大
                  </Text>
                </View>
                <View style={{ backgroundColor: 'rgba(58,90,58,0.4)', paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#88ff88', fontSize: 10, fontWeight: '700' }}>-30好感</Text>
                </View>
              </Pressable>

              {/* 庭外和解 */}
              {grayIncome >= 200000 && (
                <Pressable onPress={() => void handleSettle()} disabled={acting}
                  style={{ backgroundColor: '#2a1a0a', borderWidth: 1, borderColor: '#8a5a1a', paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: acting ? 0.6 : 1 }}>
                  <Text style={{ fontSize: 18 }}>💰</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#D4A012', fontWeight: '700', fontSize: 13 }}>庭外和解</Text>
                    <Text style={{ color: 'rgba(212,160,18,0.6)', fontSize: 9, marginTop: 2 }}>
                      花费灰色收入40% · 成功率~60% · 证据降1档+风险-15
                    </Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(138,90,26,0.4)', paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: '#D4A012', fontSize: 10, fontWeight: '700' }}>¥{Math.round(Math.max(500000, grayIncome * 0.4) / 10000)}万</Text>
                  </View>
                </Pressable>
              )}

              <View style={{ backgroundColor: '#3a0808', height: 1, marginVertical: 4 }} />
              <Text style={{ color: '#ff9999', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 2 }}>⚖️ 最终处置（不可撤销）</Text>

              <Pressable onPress={() => setShowLawyerPanel(v => !v)}
                style={{ backgroundColor: '#2a1010', borderWidth: 1, borderColor: '#6a2020', paddingVertical: 14, alignItems: 'center' }}>
                <Text style={{ color: '#ffbbbb', fontWeight: '700', fontSize: 13 }}>
                  ⚖️ 选择辩护律师{selectedLawyer ? `（已选：${selectedLawyer.name}）` : '（可选）'}
                </Text>
              </Pressable>
              <Pressable onPress={() => void handleConfess()} disabled={acting}
                style={{ backgroundColor: '#1D3B5E', paddingVertical: 16, alignItems: 'center', opacity: acting ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>🤝 坦白认罪（宽大处理）</Text>
                <Text style={{ color: 'rgba(200,220,255,0.6)', fontSize: 9, marginTop: 2 }}>
                  降低一档量刑 · 可能留党察看/严重警告/撤职 · 保留部分仕途
                </Text>
              </Pressable>
              <Pressable onPress={() => void handleDefend()} disabled={acting}
                style={{ backgroundColor: '#8B0000', paddingVertical: 16, alignItems: 'center', opacity: acting ? 0.6 : 1 }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>⚔️ 辩护抵赖（赌成败）</Text>
                <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9, marginTop: 2 }}>
                  成功→无罪释放 · 失败→按原证据等级量刑（成功率 {finalRate}%）
                </Text>
              </Pressable>
            </View>
          )}

          {/* 判决结果 */}
          {result && (
            <View style={{ backgroundColor: result.ok ? '#0a1a0a' : '#200808', borderWidth: 2, borderColor: result.ok ? '#2a7a3b' : '#8B0000', padding: 16, gap: 10 }}>
              {result.verdict && (
                <View style={{ backgroundColor: result.verdict.labelBg, borderWidth: 1, borderColor: result.verdict.labelColor, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14 }}>{result.verdict.icon}</Text>
                  <Text style={{ color: result.verdict.labelColor, fontSize: 13, fontWeight: '900' }}>{result.verdict.label}</Text>
                  {result.verdict.isGameOver && (
                    <View style={{ backgroundColor: '#8B0000', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 8 }}>游戏结束</Text>
                    </View>
                  )}
                </View>
              )}
              <Text style={{ color: result.ok ? '#88ff88' : '#ff8888', fontSize: 12, lineHeight: 20 }}>{result.msg}</Text>

              {/* 子女牵连详情 */}
              {(result.childrenAffected?.length ?? 0) > 0 && result.verdict && result.verdict.childSeverity !== 'none' && (
                <View style={{ backgroundColor: '#1a0000', borderWidth: 1, borderColor: '#6a1010', padding: 10, gap: 6 }}>
                  <Text style={{ color: '#ff9999', fontSize: 11, fontWeight: '700' }}>👨‍👩‍👧 子女仕途牵连</Text>
                  {result.childrenAffected!.map(c => {
                    const sev = result.verdict!.childSeverity as 'light' | 'medium' | 'severe';
                    const meta = SEVERITY_META[sev];
                    return (
                      <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 14 }}>👤</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#ffcccc', fontSize: 11, fontWeight: '700' }}>{c.name}</Text>
                          <Text style={{ color: 'rgba(255,180,180,0.7)', fontSize: 10 }}>{meta.blockReason}</Text>
                        </View>
                        <View style={{ backgroundColor: meta.bg, borderWidth: 1, borderColor: meta.color, paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ color: meta.color, fontSize: 8, fontWeight: '700' }}>{meta.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {result.final && result.ok && (
                <Pressable onPress={() => router.back()} style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 24, paddingVertical: 10, marginTop: 4, alignSelf: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>返回主界面</Text>
                </Pressable>
              )}
              {/* 量刑结局等级说明 */}
              {result.final && result.verdict && (
                <View style={{ backgroundColor: '#2a0808', borderWidth: 1, borderColor: '#5a1010', padding: 10, gap: 6, marginTop: 4 }}>
                  <Text style={{ color: '#ff9999', fontSize: 10, fontWeight: '900' }}>📋 量刑影响详情</Text>
                  {result.verdict.rankPenalty < 0 && (
                    <Text style={{ color: 'rgba(255,180,180,0.8)', fontSize: 10 }}>
                      ▸ 职级影响：{result.verdict.rankPenalty === -999 ? '职务全部撤销（终局）' : `降级 ${Math.abs(result.verdict.rankPenalty)} 级`}
                    </Text>
                  )}
                  {result.verdict.meritPenalty > 0 && (
                    <Text style={{ color: 'rgba(255,180,180,0.8)', fontSize: 10 }}>
                      ▸ 政绩扣除：{result.verdict.meritPenalty} 点
                    </Text>
                  )}
                  {result.verdict.moralPenalty > 0 && (
                    <Text style={{ color: 'rgba(255,180,180,0.8)', fontSize: 10 }}>
                      ▸ 道德值扣除：{result.verdict.moralPenalty} 点
                    </Text>
                  )}
                  {corruptTotal > 0 && (
                    <Text style={{ color: 'rgba(255,150,120,0.8)', fontSize: 10 }}>
                      ▸ 贪污金额 ¥{corruptTotal.toLocaleString()} 元已作为核心证据纳入量刑
                    </Text>
                  )}
                  {result.verdict.isGameOver && (
                    <View style={{ backgroundColor: '#400000', borderWidth: 1, borderColor: '#8B0000', padding: 8, marginTop: 4 }}>
                      <Text style={{ color: '#ff4444', fontSize: 11, fontWeight: '900', textAlign: 'center' }}>
                        ⛓️ 从政生涯就此终结
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}
