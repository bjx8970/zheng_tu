/**
 * 最高领导人玩法页面（rank 13-15 专属）
 * 四路线各有专属定位：
 *   行政线 rank13-15 → 国务院总理/国家主席  → 国策制定、国际峰会、重大工程
 *   党务线 rank13-15 → 总书记/执政党主席    → 党内运动、路线纲领、派系清洗、国际党际外交
 *   纪检线 rank13-15 → 中纪委书记/首席监察官 → 全国反腐风暴、司法独立、大案要案
 *   团派线 rank13-15 → 政协主席/青年最高委员 → 协商民主、青年国策、国际青年外交
 *
 * 国际玩法：外交博弈、国际峰会、制裁与反制裁、战略竞争、联合国提案
 * 国内玩法：各路线专属重大行动
 */
import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useGame } from "@/ctx/GameContext";
import { useActionResults } from '@/lib/useActionResults';
import { getLineNameByPath } from '@/lib/lineRankTitles';

// ─── 颜色系统 ────────────────────────────────────────────────────────────────
const C = {
  bg:        '#06080F',
  card:      '#0C101E',
  border:    '#1A2540',
  gold:      '#C8A84B',
  goldDim:   '#7A6020',
  text:      '#E8EAF0',
  textMid:   '#9AA3B8',
  textDim:   '#4A5268',
  green:     '#2ECC71',
  greenBg:   '#071A10',
  red:       '#E74C3C',
  redBg:     '#1A0808',
  yellow:    '#F1C40F',
  yellowBg:  '#1A1800',
  purple:    '#9B59B6',
  purpleBg:  '#120818',
  blue:      '#3498DB',
  blueBg:    '#081018',
  teal:      '#1ABC9C',
  tealBg:    '#061210',
};

// ─── 行动定义 ────────────────────────────────────────────────────────────────
interface SupremeAction {
  id: string;
  title: string;
  icon: string;
  desc: string;
  category: '国际' | '国内';
  lines: string[];        // 适用路线（'all' = 全线）
  minRank: number;
  cooldownDays: number;   // 冷却（游戏天）
  effects: {
    meritDelta?: number;
    moralDelta?: number;
    bossFavorDelta?: number;
    publicOpinionDelta?: number;
    lineKpiDelta?: number;
    cityGovFundDelta?: number;
    riskDelta?: number;   // 正数=风险上升
  };
  color: string;
  bgColor: string;
}

const SUPREME_ACTIONS: SupremeAction[] = [
  // ═══════════════ 国际玩法（全线通用 + 路线特化） ═══════════════
  {
    id: 'intl_summit',
    title: '主持国际峰会',
    icon: '🌐',
    desc: '以最高领导人身份主持多边国际峰会，推动全球议题达成共识。大国博弈中展现外交智慧，提升国家国际影响力。',
    category: '国际',
    lines: ['all'],
    minRank: 13,
    cooldownDays: 180,
    effects: { meritDelta: 800, publicOpinionDelta: 8, lineKpiDelta: 15, bossFavorDelta: 5 },
    color: '#3498DB',
    bgColor: '#081018',
  },
  {
    id: 'intl_sanction_counter',
    title: '反制裁外交博弈',
    icon: '⚔️',
    desc: '针对外部制裁采取对等反制措施，通过多边外交框架构建反制裁联盟，捍卫国家主权与核心利益。',
    category: '国际',
    lines: ['all'],
    minRank: 13,
    cooldownDays: 120,
    effects: { meritDelta: 600, lineKpiDelta: 12, riskDelta: -5, publicOpinionDelta: 6 },
    color: '#E74C3C',
    bgColor: '#1A0808',
  },
  {
    id: 'intl_un_proposal',
    title: '联合国重大提案',
    icon: '🇺🇳',
    desc: '在联合国安理会或大会提出重大改革提案，构建有利于本国的国际规则体系，争取更多国家支持。',
    category: '国际',
    lines: ['all'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 1200, publicOpinionDelta: 10, lineKpiDelta: 20, cityGovFundDelta: 5000 },
    color: '#9B59B6',
    bgColor: '#120818',
  },
  {
    id: 'intl_belt_road',
    title: '全球战略基础设施布局',
    icon: '🏗️',
    desc: '推动跨国战略基础设施项目，在重要地缘节点建立影响力支点，打造利益共同体网络。',
    category: '国际',
    lines: ['government', 'party'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 1000, cityGovFundDelta: -3000, lineKpiDelta: 18, publicOpinionDelta: 7 },
    color: '#F1C40F',
    bgColor: '#1A1800',
  },
  {
    id: 'intl_party_diplomacy',
    title: '国际党际外交',
    icon: '🤝',
    desc: '以执政党最高领导人身份访问友党，深化意识形态联盟，输出治理模式与政党理念，扩大全球影响力。',
    category: '国际',
    lines: ['party'],
    minRank: 13,
    cooldownDays: 180,
    effects: { meritDelta: 700, bossFavorDelta: 8, lineKpiDelta: 15, publicOpinionDelta: 5 },
    color: '#C82829',
    bgColor: '#1A0808',
  },
  {
    id: 'intl_anticorrupt_treaty',
    title: '国际反腐协作条约',
    icon: '⚖️',
    desc: '主导缔结多边国际反腐协作条约，推动跨境追逃追赃机制，塑造廉洁大国形象。',
    category: '国际',
    lines: ['discipline'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 900, moralDelta: 5, lineKpiDelta: 20, publicOpinionDelta: 8 },
    color: '#1ABC9C',
    bgColor: '#061210',
  },
  {
    id: 'intl_youth_forum',
    title: '世界青年领袖论坛',
    icon: '🌏',
    desc: '主办世界青年峰会，凝聚全球青年领袖共识，推动青年议题进入国际议程，传递大国青年外交主张。',
    category: '国际',
    lines: ['league'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 800, publicOpinionDelta: 12, lineKpiDelta: 18, bossFavorDelta: 6 },
    color: '#2ECC71',
    bgColor: '#071A10',
  },
  {
    id: 'intl_strategic_game',
    title: '大国战略博弈',
    icon: '♟️',
    desc: '在关键地缘政治危机中运筹帷幄，通过战略模糊、利益交换与红线划定，主导地区秩序重塑。',
    category: '国际',
    lines: ['all'],
    minRank: 14,
    cooldownDays: 365,
    effects: { meritDelta: 1500, lineKpiDelta: 25, riskDelta: 10, publicOpinionDelta: 10 },
    color: '#C8A84B',
    bgColor: '#181008',
  },

  // ═══════════════ 国内玩法（路线专属重大行动）═══════════════
  {
    id: 'domestic_policy_charter',
    title: '颁布国家治理总纲',
    icon: '📜',
    desc: '以国家主席身份颁布新时期国家治理总纲领，确定未来十年施政方向，调整各级政府权责边界。',
    category: '国内',
    lines: ['government'],
    minRank: 13,
    cooldownDays: 1825,
    effects: { meritDelta: 2000, publicOpinionDelta: 15, lineKpiDelta: 30, cityGovFundDelta: 10000 },
    color: '#3498DB',
    bgColor: '#081018',
  },
  {
    id: 'domestic_mega_project',
    title: '国家级重大工程决策',
    icon: '⚡',
    desc: '拍板国家战略级重大基础设施工程（航天工程、高铁干线、能源安全工程），彰显行政最高决断力。',
    category: '国内',
    lines: ['government'],
    minRank: 13,
    cooldownDays: 730,
    effects: { meritDelta: 1200, cityGovFundDelta: -8000, publicOpinionDelta: 12, lineKpiDelta: 20 },
    color: '#F1C40F',
    bgColor: '#1A1800',
  },
  {
    id: 'domestic_party_rectify',
    title: '全党整风运动',
    icon: '🔴',
    desc: '在全党范围发起整风运动，批判自由主义与形式主义，强化政治纪律，整顿党风政风。（懂的都懂）',
    category: '国内',
    lines: ['party'],
    minRank: 13,
    cooldownDays: 730,
    effects: { meritDelta: 1000, moralDelta: 3, lineKpiDelta: 25, bossFavorDelta: 10, riskDelta: -15 },
    color: '#C82829',
    bgColor: '#1A0808',
  },
  {
    id: 'domestic_line_document',
    title: '制定党的历史决议',
    icon: '📋',
    desc: '主导制定党的历史决议，对重大历史问题作出权威定性，巩固个人在党内的核心地位。（懂的都懂）',
    category: '国内',
    lines: ['party'],
    minRank: 14,
    cooldownDays: 1825,
    effects: { meritDelta: 3000, bossFavorDelta: 20, lineKpiDelta: 40, riskDelta: -30 },
    color: '#8B0000',
    bgColor: '#1A0808',
  },
  {
    id: 'domestic_constitutional_amend',
    title: '推动修宪',
    icon: '📖',
    desc: '在全国人民代表大会提出宪法修正案，调整国家根本大法，确立新的执政框架。（懂的都懂）',
    category: '国内',
    lines: ['party'],
    minRank: 15,
    cooldownDays: 3650,
    effects: { meritDelta: 5000, bossFavorDelta: 30, lineKpiDelta: 50, riskDelta: 20 },
    color: '#FFD700',
    bgColor: '#1A1000',
  },
  {
    id: 'domestic_anticorrupt_storm',
    title: '反腐风暴：打虎行动',
    icon: '🐅',
    desc: '以中央纪委书记身份部署全国性重大反腐专项行动，对省部级以上腐败案件立案调查，不论山高水深。（懂的都懂）',
    category: '国内',
    lines: ['discipline'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 1500, moralDelta: 8, lineKpiDelta: 30, riskDelta: -20, publicOpinionDelta: 12 },
    color: '#1ABC9C',
    bgColor: '#061210',
  },
  {
    id: 'domestic_judicial_reform',
    title: '司法体制重大改革',
    icon: '⚖️',
    desc: '推动司法机关独立性改革，完善法治国家建设顶层设计，以制度反腐代替运动反腐。',
    category: '国内',
    lines: ['discipline'],
    minRank: 13,
    cooldownDays: 730,
    effects: { meritDelta: 1000, moralDelta: 5, lineKpiDelta: 25, publicOpinionDelta: 10 },
    color: '#3498DB',
    bgColor: '#081018',
  },
  {
    id: 'domestic_megacase',
    title: '大案要案亲自督办',
    icon: '🔍',
    desc: '亲自批示督办重大腐败窝案，彰显反腐决心，以零容忍姿态震慑全党全社会腐败行为。',
    category: '国内',
    lines: ['discipline'],
    minRank: 14,
    cooldownDays: 365,
    effects: { meritDelta: 2000, moralDelta: 10, lineKpiDelta: 35, riskDelta: -25, publicOpinionDelta: 15 },
    color: '#E74C3C',
    bgColor: '#1A0808',
  },
  {
    id: 'domestic_cppcc_proposal',
    title: '全国政协重大提案推动',
    icon: '🏛️',
    desc: '以全国政协主席身份统筹政协各专委会，推动重大民生提案转化为国家政策，展现协商民主新成效。',
    category: '国内',
    lines: ['league'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 900, publicOpinionDelta: 14, lineKpiDelta: 22, bossFavorDelta: 7 },
    color: '#2ECC71',
    bgColor: '#071A10',
  },
  {
    id: 'domestic_youth_policy',
    title: '国家青年发展纲要',
    icon: '🌱',
    desc: '制定实施国家青年发展五年纲要，将青年就业、教育、住房纳入国策保障体系，赢得全社会认同。',
    category: '国内',
    lines: ['league'],
    minRank: 13,
    cooldownDays: 730,
    effects: { meritDelta: 1100, publicOpinionDelta: 16, lineKpiDelta: 28, cityGovFundDelta: 3000 },
    color: '#1ABC9C',
    bgColor: '#061210',
  },
  {
    id: 'domestic_mass_line',
    title: '群众路线教育实践活动',
    icon: '🏘️',
    desc: '全面部署党的群众路线教育实践活动，深入基层调研，倾听百姓声音，密切党群干群关系。（懂的都懂）',
    category: '国内',
    lines: ['league', 'party'],
    minRank: 13,
    cooldownDays: 365,
    effects: { meritDelta: 700, publicOpinionDelta: 18, lineKpiDelta: 20, moralDelta: 3 },
    color: '#F1C40F',
    bgColor: '#1A1800',
  },
];

function fmtEffect(key: string, val: number): string {
  const labels: Record<string, string> = {
    meritDelta: '政绩', moralDelta: '道德', bossFavorDelta: '上级好感',
    publicOpinionDelta: '舆情', lineKpiDelta: 'KPI积分', cityGovFundDelta: '专项资金(万)',
    riskDelta: '巡视风险',
  };
  const sign = val > 0 ? '+' : '';
  return `${labels[key] ?? key} ${sign}${val}`;
}

export default function SupremeLeaderPage() {
  const router  = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [busy, setBusy]     = useState<string | null>(null);
  const [msgs, setMsgs]     = useState<Record<string, string>>({});
  const [tab, setTab]       = useState<'国际' | '国内'>('国际');

  useFocusEffect(React.useCallback(() => { refreshSave(); }, []));

  if (!save) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={C.gold} />
      </View>
    );
  }

  const rank    = save.rankLevel ?? 1;
  const cp      = save.careerPath ?? 'government';
  const lineName = getLineNameByPath(cp);
  const gameDays = save.gameDays ?? 0;
  const cooldowns = (save.supremeLeaderCooldowns ?? {}) as Record<string, number>;

  if (rank < 13) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔒</Text>
        <Text style={{ color: C.gold, fontSize: 16, fontWeight: '800', textAlign: 'center', marginBottom: 8 }}>最高领导人玩法未解锁</Text>
        <Text style={{ color: C.textMid, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
          需晋升至 rank 13（{lineName}专属高级职称）方可进入最高权力系统
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: C.border, borderRadius: 8 }}>
          <Text style={{ color: C.textMid }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const lineLabel: Record<string, { title: string; icon: string; color: string }> = {
    government: { title: '国务院·行政最高决策', icon: '🏛️', color: '#3498DB' },
    party:      { title: '执政党·最高权力核心', icon: '⭐', color: '#C82829' },
    discipline: { title: '中纪委·最高廉洁权威', icon: '⚖️', color: '#1ABC9C' },
    league:     { title: '全国政协·协商最高机构', icon: '🌱', color: '#2ECC71' },
  };
  const lineInfo = lineLabel[cp] ?? lineLabel.government;

  const filteredActions = SUPREME_ACTIONS.filter(a => {
    if (a.minRank > rank) return false;
    if (!a.lines.includes('all') && !a.lines.includes(cp)) return false;
    if (a.category !== tab) return false;
    return true;
  });

  async function handleAction(action: SupremeAction) {
    if (busy) return;
    const lastDay = cooldowns[action.id] ?? -9999;
    const remaining = action.cooldownDays - (gameDays - lastDay);
    if (remaining > 0) {
      setMsgs(p => ({ ...p, [action.id]: `冷却中，还需 ${Math.ceil(remaining / 30)} 个月` }));
      return;
    }
    setBusy(action.id);
    const s = save!;
    const e = action.effects;
    const updates: Record<string, unknown> = {
      supremeLeaderCooldowns: { ...cooldowns, [action.id]: gameDays },
    };
    if (e.meritDelta)         updates.meritPoints       = Math.max(0, (s.meritPoints ?? 0) + e.meritDelta);
    if (e.moralDelta)         updates.moralValue         = Math.min(100, Math.max(0, (s.moralValue ?? 50) + e.moralDelta));
    if (e.bossFavorDelta)     updates.bossFavor          = Math.min(100, Math.max(0, (s.bossFavor ?? 50) + e.bossFavorDelta));
    if (e.publicOpinionDelta) updates.publicOpinionIndex = Math.min(100, Math.max(0, (s.publicOpinionIndex ?? 60) + e.publicOpinionDelta));
    if (e.lineKpiDelta)       updates.lineKpiScore       = Math.min(999, (s.lineKpiScore ?? 0) + e.lineKpiDelta);
    if (e.cityGovFundDelta) updates.cityGovFund      = Math.max(0, (s.cityGovFund ?? 0) + e.cityGovFundDelta);
    if (e.riskDelta != null)  updates.inspectionRisk     = Math.min(100, Math.max(0, (s.inspectionRisk ?? 10) + e.riskDelta));

    await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
    await refreshSave();
    const positive = Object.entries(e).filter(([, v]) => typeof v === 'number' && v > 0)
      .map(([k, v]) => fmtEffect(k, v as number)).join('  ');
    const supMsg = `✅ ${action.title}执行成功\n${positive}`;
    await saveResult('supreme_' + action.id, { ok: true, desc: `✅ ${action.title}执行成功 ${positive}`, day: gameDays });
    setMsgs(p => ({ ...p, [action.id]: supMsg }));
    setBusy(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* 顶部 */}
      <View style={{ paddingTop: 56, paddingHorizontal: 16, paddingBottom: 0, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: C.gold, fontSize: 16 }}>‹ 返回</Text>
          </Pressable>
          <Text style={{ flex: 1, color: C.gold, fontSize: 16, fontWeight: '900', letterSpacing: 1 }}>
            {lineInfo.icon} 最高领导人玩法
          </Text>
          <View style={{ backgroundColor: lineInfo.color + '22', borderWidth: 1, borderColor: lineInfo.color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: lineInfo.color, fontSize: 10, fontWeight: '700' }}>Rank {rank}</Text>
          </View>
        </View>
        {/* 路线标题 */}
        <View style={{ backgroundColor: lineInfo.color + '15', borderWidth: 1, borderColor: lineInfo.color + '55', borderRadius: 10, padding: 10, marginBottom: 10 }}>
          <Text style={{ color: lineInfo.color, fontSize: 12, fontWeight: '800' }}>{lineInfo.title}</Text>
          <Text style={{ color: C.textMid, fontSize: 10, marginTop: 2 }}>
            {lineName} · 专属最高权力行动系统
          </Text>
        </View>
        {/* 分类Tab */}
        <View style={{ flexDirection: 'row', gap: 0, marginBottom: 0 }}>
          {(['国际', '国内'] as const).map(t => (
            <Pressable key={t} onPress={() => setTab(t)}
              style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? C.gold : 'transparent' }}>
              <Text style={{ color: tab === t ? C.gold : C.textDim, fontSize: 13, fontWeight: tab === t ? '800' : '400' }}>
                {t === '国际' ? '🌐 国际玩法' : '🏛️ 国内玩法'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} contentInsetAdjustmentBehavior="automatic">
        {filteredActions.length === 0 && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🔒</Text>
            <Text style={{ color: C.textMid, fontSize: 13, textAlign: 'center' }}>
              暂无可用的{tab}行动{'\n'}需晋升更高职级解锁更多行动
            </Text>
          </View>
        )}

        {filteredActions.map(action => {
          const lastDay   = cooldowns[action.id] ?? -9999;
          const remaining = Math.max(0, action.cooldownDays - (gameDays - lastDay));
          const onCD      = remaining > 0;
          const feedback  = msgs[action.id];
          const isLoading = busy === action.id;
          const posEffects = Object.entries(action.effects).filter(([, v]) => typeof v === 'number' && v !== 0);

          return (
            <View key={action.id} style={{ backgroundColor: C.card, borderRadius: 14, borderWidth: 1.5, borderColor: onCD ? C.border : action.color + '77', overflow: 'hidden' }}>
              {/* 标题栏 */}
              <View style={{ backgroundColor: onCD ? C.border : action.bgColor, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }}>
                <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: onCD ? C.textDim : C.text, fontSize: 14, fontWeight: '800' }}>{action.title}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: action.color + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: action.color, fontSize: 9, fontWeight: '700' }}>{action.category}</Text>
                    </View>
                    {action.minRank >= 14 && (
                      <View style={{ backgroundColor: '#FFD70022', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '700' }}>Rank{action.minRank}+</Text>
                      </View>
                    )}
                    {onCD && (
                      <View style={{ backgroundColor: C.textDim + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: C.textDim, fontSize: 9 }}>冷却 {Math.ceil(remaining / 30)} 个月</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* 描述 + 效果 */}
              <View style={{ padding: 12, gap: 8 }}>
                <Text style={{ color: C.textMid, fontSize: 12, lineHeight: 18 }}>{action.desc}</Text>

                {/* 效果标签 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {posEffects.map(([key, val]) => {
                    const v = val as number;
                    const isNeg = key === 'riskDelta' ? v > 0 : v < 0;
                    const color = key === 'riskDelta'
                      ? (v > 0 ? C.red : C.green)
                      : v > 0 ? C.green : C.red;
                    return (
                      <View key={key} style={{ backgroundColor: color + '15', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: color + '44' }}>
                        <Text style={{ color: isNeg ? C.red : color, fontSize: 10, fontWeight: '700' }}>
                          {fmtEffect(key, v)}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={{ backgroundColor: C.textDim + '22', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ color: C.textDim, fontSize: 10 }}>
                      冷却 {action.cooldownDays >= 365 ? `${action.cooldownDays / 365}年` : `${action.cooldownDays / 30}个月`}
                    </Text>
                  </View>
                </View>

                {/* 反馈消息 */}
                {!!feedback && (
                  <View style={{ backgroundColor: feedback.startsWith('✅') ? C.greenBg : C.redBg, borderRadius: 8, padding: 8 }}>
                    <Text style={{ color: feedback.startsWith('✅') ? C.green : C.red, fontSize: 11, lineHeight: 17 }}>{feedback}</Text>
                  </View>
                )}

                {/* 执行按钮 */}
                <Pressable
                  onPress={() => void handleAction(action)}
                  disabled={onCD || isLoading}
                  style={{ backgroundColor: onCD ? C.border : action.color, borderRadius: 10, paddingVertical: 11, alignItems: 'center' }}
                >
                  {isLoading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Text style={{ color: onCD ? C.textDim : '#fff', fontSize: 13, fontWeight: '800' }}>
                        {onCD ? `冷却中（${Math.ceil(remaining / 30)} 个月后可用）` : `执行：${action.title}`}
                      </Text>
                  }
                </Pressable>
              </View>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}
