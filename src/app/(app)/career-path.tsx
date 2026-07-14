/**
 * 仕途路线页面
 * 四条专属路线：党务线 / 行政线 / 纪检线 / 团派线
 * 每条路线独立事件池、专属福利、分级解锁玩法
 * 部门玩法不再展示（departments 保留底层数据，但入口迁移至此）
 */
import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { updateSave } from '@/db/gameApi';

// ── 色彩系统 ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6FA', card: '#FFFFFF', border: '#E2E8F0', label: '#1A2744', sub: '#64748B',
  green: '#16A34A', greenLight: '#DCFCE7', greenMid: '#86EFAC',
  blue: '#1D4ED8', blueLight: '#DBEAFE', blueMid: '#93C5FD',
  red: '#DC2626', redLight: '#FEE2E2',
  gold: '#B45309', goldLight: '#FEF3C7', goldMid: '#FCD34D',
  indigo: '#4338CA', indigoLight: '#E0E7FF',
  purple: '#7C3AED', purpleLight: '#EDE9FE',
  orange: '#EA580C', orangeLight: '#FFEDD5',
};

// ── 仕途路线定义 ──────────────────────────────────────────────────────────────
type CareerLine = '党务线' | '行政线' | '纪检线' | '团派线';

interface LineConfig {
  key: CareerLine;
  icon: string;
  color: string;
  lightBg: string;
  midColor: string;
  desc: string;
  channel: string; // 晋升通道描述
  perks: string[];
}
const LINE_CONFIGS: LineConfig[] = [
  {
    key: '党务线', icon: '🔴', color: C.red, lightBg: C.redLight, midColor: '#FCA5A5',
    desc: '深耕党的建设与组织工作，通过组织部推荐、思想建设、党内选举积累晋升资本。',
    channel: '党支部书记 → 乡镇党委书记 → 县委书记 → 市委常委 → 省委常委 → 中央委员',
    perks: ['rank4解锁：组织推荐加成（晋升概率+15%）', 'rank6解锁：党校挂职培训（能力+10）', 'rank8解锁：组织部直荐通道（跨级提名权）', 'rank10解锁：中央组织部提名资格'],
  },
  {
    key: '行政线', icon: '🔵', color: C.blue, lightBg: C.blueLight, midColor: C.blueMid,
    desc: '以政绩考核为核心，通过项目推进、城市建设、GDP增长积累晋升资本，走实干路线。',
    channel: '乡镇助理 → 县长助理 → 副县长 → 县长 → 副市长 → 市长 → 省委副书记 → 省长',
    perks: ['rank5解锁：重大项目审批权（GDP加成+8%）', 'rank7解锁：招商引资优先通道', 'rank9解锁：国家重点项目申请资格', 'rank11解锁：国务院跨省协调权限'],
  },
  {
    key: '纪检线', icon: '🟡', color: C.gold, lightBg: C.goldLight, midColor: C.goldMid,
    desc: '以廉洁执法为核心，通过反腐行动、巡视配合、廉洁奖励积累晋升资本，走清廉路线。',
    channel: '纪检委员 → 纪检副书记 → 纪委书记 → 市纪委书记 → 省纪委书记 → 中央纪委委员',
    perks: ['rank4解锁：廉洁奖励加倍（拒贿+6廉洁度）', 'rank6解锁：反腐行动参与权（巡视风险-20）', 'rank8解锁：双规特别权限（可主动对NPC发起调查）', 'rank10解锁：中央纪委提名通道'],
  },
  {
    key: '团派线', icon: '🟢', color: C.green, lightBg: C.greenLight, midColor: C.greenMid,
    desc: '以群众基础为核心，通过青年工作、群众路线、基层联系积累晋升资本，走民心路线。',
    channel: '团支部书记 → 县团委书记 → 市团委书记 → 省团委书记 → 共青团中央 → 地方党委',
    perks: ['rank4解锁：群众路线加成（民心值+10）', 'rank6解锁：青年就业专项（舆情+10）', 'rank8解锁：基层调研特权（全面了解辖区民情）', 'rank10解锁：全国青联委员提名'],
  },
];

// ── 路线行动事件 ──────────────────────────────────────────────────────────────
interface LineAction {
  key: string; label: string; desc: string; icon: string;
  meritDelta: number; moralDelta: number; abilityDelta: number; meritCost: number;
  minRank: number; cooldownDays: number;
  specialEffect?: string;
}

const LINE_ACTIONS: Record<CareerLine, LineAction[]> = {
  '党务线': [
    { key: 'study_session', label: '组织政治学习', desc: '召集党员开展集中学习，宣传最新政策精神，提升思想统一性。', icon: '📕', meritDelta: 15, moralDelta: 3, abilityDelta: 2, meritCost: 0, minRank: 1, cooldownDays: 14 },
    { key: 'party_build', label: '推进党建工作', desc: '深化基层党建，吸收积极分子入党，壮大基层组织战斗力。', icon: '🔴', meritDelta: 25, moralDelta: 2, abilityDelta: 3, meritCost: 0, minRank: 2, cooldownDays: 21 },
    { key: 'org_recommend', label: '争取组织推荐', desc: '向上级组织部门汇报工作，争取年度考核优秀等次，纳入重点培养名单。', icon: '📋', meritDelta: 40, moralDelta: 0, abilityDelta: 5, meritCost: 10, minRank: 4, cooldownDays: 30, specialEffect: '晋升概率+15%' },
    { key: 'party_school', label: '申请党校培训', desc: '参加省级党校中青年干部培训班，系统提升理论水平与综合能力。', icon: '🏛️', meritDelta: 35, moralDelta: 5, abilityDelta: 10, meritCost: 0, minRank: 6, cooldownDays: 90, specialEffect: '能力+10' },
    { key: 'inner_election', label: '参与党内选举', desc: '在党代会上积极发言展现政绩，争取代表票数支持，建立党内广泛认可。', icon: '🗳️', meritDelta: 60, moralDelta: 0, abilityDelta: 3, meritCost: 20, minRank: 8, cooldownDays: 60, specialEffect: '派系内部积分+30' },
  ],
  '行政线': [
    { key: 'daily_admin', label: '处理日常政务', desc: '批复文件、协调部门工作、处理群众来信，完成日常行政职责。', icon: '📄', meritDelta: 12, moralDelta: 1, abilityDelta: 2, meritCost: 0, minRank: 1, cooldownDays: 7 },
    { key: 'infrastructure', label: '推进基础设施项目', desc: '推动道路、学校、医院等民生基础设施立项与建设，提升城市宜居度。', icon: '🏗️', meritDelta: 40, moralDelta: 0, abilityDelta: 4, meritCost: 20, minRank: 3, cooldownDays: 30, specialEffect: 'GDP+3%' },
    { key: 'major_project', label: '主导重大项目审批', desc: '统筹协调重大产业园区或新区规划审批，引进龙头企业落户。', icon: '🏭', meritDelta: 70, moralDelta: 0, abilityDelta: 6, meritCost: 30, minRank: 5, cooldownDays: 45, specialEffect: 'GDP+8%' },
    { key: 'investment', label: '招商引资出访', desc: '率队赴长三角、大湾区开展招商活动，签署项目合作协议。', icon: '✈️', meritDelta: 55, moralDelta: 0, abilityDelta: 5, meritCost: 15, minRank: 7, cooldownDays: 60, specialEffect: '城市营商+5' },
    { key: 'national_project', label: '申报国家重点项目', desc: '联合省厅向国家发改委申报重点支持项目，争取专项资金支持。', icon: '🏆', meritDelta: 120, moralDelta: 0, abilityDelta: 8, meritCost: 50, minRank: 9, cooldownDays: 90, specialEffect: '资金+5000万' },
  ],
  '纪检线': [
    { key: 'refuse_bribe', label: '廉洁拒贿宣示', desc: '公开宣誓廉洁从政，拒绝一切形式的利益输送，树立廉洁形象。', icon: '🛡️', meritDelta: 10, moralDelta: 8, abilityDelta: 1, meritCost: 0, minRank: 1, cooldownDays: 14, specialEffect: '廉洁度+8' },
    { key: 'report_tip', label: '举报违纪线索', desc: '向上级纪委提供辖区违纪违规线索，协助纪检部门开展调查。', icon: '📞', meritDelta: 20, moralDelta: 5, abilityDelta: 2, meritCost: 0, minRank: 2, cooldownDays: 21 },
    { key: 'anti_corrupt', label: '反腐专项行动', desc: '主导或配合省纪委开展反腐专项行动，查处辖区内违纪案件。', icon: '⚖️', meritDelta: 50, moralDelta: 10, abilityDelta: 5, meritCost: 0, minRank: 6, cooldownDays: 45, specialEffect: '巡视风险-20' },
    { key: 'inspect_coop', label: '配合中央巡视组', desc: '全力配合中央巡视组进驻工作，提交详实自查报告，展示廉洁担当。', icon: '🔍', meritDelta: 45, moralDelta: 12, abilityDelta: 3, meritCost: 0, minRank: 4, cooldownDays: 30, specialEffect: '廉洁度+12' },
    { key: 'double_regulate', label: '主导双规特别程序', desc: '对辖区腐败高危NPC启动双规程序，清除腐败分子，展示执纪铁腕。', icon: '🔒', meritDelta: 100, moralDelta: 5, abilityDelta: 6, meritCost: 0, minRank: 8, cooldownDays: 60, specialEffect: '对NPC发起调查' },
  ],
  '团派线': [
    { key: 'youth_work', label: '开展青年工作', desc: '组织青年干部座谈会，收集青年诉求，宣传就业创业政策。', icon: '🌱', meritDelta: 15, moralDelta: 2, abilityDelta: 2, meritCost: 0, minRank: 1, cooldownDays: 14 },
    { key: 'mass_line', label: '践行群众路线', desc: '深入基层开展走访调研，了解群众困难，现场办理民生实事。', icon: '🏘️', meritDelta: 30, moralDelta: 3, abilityDelta: 3, meritCost: 0, minRank: 2, cooldownDays: 21, specialEffect: '民心+10' },
    { key: 'petition_handle', label: '化解信访压力', desc: '直接接待信访群众，现场解决问题，将矛盾化解在基层。', icon: '📬', meritDelta: 35, moralDelta: 4, abilityDelta: 3, meritCost: 0, minRank: 3, cooldownDays: 30, specialEffect: '舆情+10' },
    { key: 'youth_employ', label: '推动青年就业专项', desc: '主导辖区青年就业政策落地，组织企业专场招聘，缓解青年失业问题。', icon: '💼', meritDelta: 55, moralDelta: 5, abilityDelta: 5, meritCost: 10, minRank: 6, cooldownDays: 45, specialEffect: '舆情+15' },
    { key: 'national_youth', label: '争取全国青联资格', desc: '参加全国青年联合会代表评选，建立全国性青年工作人脉网络。', icon: '🏅', meritDelta: 80, moralDelta: 3, abilityDelta: 6, meritCost: 20, minRank: 8, cooldownDays: 60, specialEffect: '全国人脉+20' },
  ],
};

// ── 晋升年龄限制表 ──────────────────────────────────────────────────────────
export const PROMOTION_AGE_LIMITS: Record<number, number> = {
  1: 22, 2: 24, 3: 25, 4: 27, 5: 28, 6: 30, 7: 32,
  8: 35, 9: 38, 10: 40, 11: 44, 12: 48, 13: 52, 14: 55,
};
export const RANK_NAMES: Record<number, string> = {
  1: '科员', 2: '副股级', 3: '股级', 4: '副科级', 5: '正科级',
  6: '副处级', 7: '正处级', 8: '副厅级', 9: '正厅级',
  10: '副部级', 11: '正部级', 12: '副国级', 13: '正国级', 14: '最高领导',
};

export default function CareerPathScreen() {
  const { save, refreshSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [loading, setLoading] = useState(false);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [showSwitch, setShowSwitch] = useState(false);

  useFocusEffect(React.useCallback(() => {
    refreshSave();
    if (save?.careerPathCooldowns) setCooldowns(save.careerPathCooldowns);
  }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} color={C.indigo} />;

  const currentLine = save.careerPathLine ?? '行政线';
  const lineConfig = LINE_CONFIGS.find(l => l.key === currentLine)!;
  const actions = LINE_ACTIONS[currentLine];
  const rank = save.rankLevel;
  const playerAge = new Date().getFullYear() - (save.birthYear ?? 1990) + (save.gameDays ? Math.floor(save.gameDays / 365) : 0);
  const nextRankAge = PROMOTION_AGE_LIMITS[rank + 1] ?? 99;
  const canPromoteByAge = playerAge >= nextRankAge;

  function isCool(key: string, days: number) {
    const cd = save?.careerPathCooldowns ?? cooldowns;
    return ((cd[key] ?? 0) + days) > (save?.gameDays ?? 0);
  }
  function coolLeft(key: string, days: number) {
    const cd = save?.careerPathCooldowns ?? cooldowns;
    return Math.max(0, (cd[key] ?? 0) + days - (save?.gameDays ?? 0));
  }

  function showMsg(text: string, type: 'success' | 'warn' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleAction(action: LineAction) {
    if (!save) return;
    if (rank < action.minRank) { showMsg(`需达到职级 ${action.minRank} 才能执行此行动`, 'warn'); return; }
    if (isCool(action.key, action.cooldownDays)) { showMsg(`此行动冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, 'warn'); return; }
    if (action.meritCost > 0 && save.meritPoints < action.meritCost) {
      showMsg(`政绩不足，此行动需消耗 ${action.meritCost} 政绩点`, 'error'); return;
    }
    setLoading(true);
    const updates: Record<string, number | string> = {};
    if (action.meritDelta !== 0) updates.meritPoints = save.meritPoints + action.meritDelta - action.meritCost;
    if (action.moralDelta !== 0) updates.moralValue = Math.min(100, Math.max(0, save.moralValue + action.moralDelta));
    if (action.abilityDelta !== 0) updates.abilityValue = Math.min(100, Math.max(0, save.abilityValue + action.abilityDelta));
    // 特效处理
    if (action.specialEffect?.includes('GDP')) {
      const pct = parseInt(action.specialEffect.match(/\d+/)?.[0] ?? '0');
      updates.cityGdp = Math.round(save.cityGdp * (1 + pct / 100));
    }
    if (action.specialEffect?.includes('舆情')) {
      const delta = parseInt(action.specialEffect.match(/\d+/)?.[0] ?? '0');
      updates.publicOpinionIndex = Math.min(100, save.publicOpinionIndex + delta);
    }
    if (action.specialEffect?.includes('廉洁度')) {
      const delta = parseInt(action.specialEffect.match(/\d+/)?.[0] ?? '0');
      updates.moralValue = Math.min(100, save.moralValue + delta);
    }
    if (action.specialEffect?.includes('巡视风险')) {
      const delta = parseInt(action.specialEffect.match(/\d+/)?.[0] ?? '0');
      updates.inspectionRisk = Math.max(0, save.inspectionRisk - delta);
    }
    if (action.specialEffect?.includes('营商')) {
      const delta = parseInt(action.specialEffect.match(/\d+/)?.[0] ?? '0');
      updates.cityBusiness = Math.min(100, save.cityBusiness + delta);
    }
    // 持久化冷却时间到 DB，同时保存本次结果
    const newCooldowns = { ...(save.careerPathCooldowns ?? {}), [action.key]: save.gameDays };
    const desc = `${action.label}完成！政绩 +${action.meritDelta - action.meritCost}${action.specialEffect ? '，' + action.specialEffect : ''}`;
    await saveResult('careerPath_' + action.key, { ok: true, desc, day: save.gameDays }, {
      ...(updates as Parameters<typeof updateSave>[1]),
      careerPathCooldowns: newCooldowns,
    } as Parameters<typeof updateSave>[1]);
    setCooldowns(newCooldowns);
    await refreshSave();
    showMsg(`✅ ${desc}`, 'success');
    setLoading(false);
  }

  async function handleSwitchLine(line: CareerLine) {
    if (!save) return;
    if (line === currentLine) { setShowSwitch(false); return; }
    setLoading(true);
    await updateSave(save.id, { careerPathLine: line });
    await refreshSave();
    setShowSwitch(false);
    showMsg(`已切换至${line}，新的晋升通道已开启`, 'success');
    setLoading(false);
  }

  const msgColor: Record<string, string> = { success: C.green, warn: C.gold, error: C.red };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>

        {/* 当前路线总览卡 */}
        <View style={{ backgroundColor: lineConfig.color, borderRadius: 16, padding: 18, borderCurve: 'continuous' } as object}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Text style={{ fontSize: 30 }}>{lineConfig.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 19, fontWeight: '900', color: '#FFFFFF' }}>{currentLine}</Text>
              <Text style={{ fontSize: 11, color: '#FFFFFF', opacity: 0.8, marginTop: 2 }}>{lineConfig.desc}</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '700' }}>专属路线</Text>
            </View>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 11, color: '#FFFFFF', opacity: 0.7, marginBottom: 3 }}>晋升通道</Text>
            <Text style={{ fontSize: 12, color: '#FFFFFF', lineHeight: 18 }}>{lineConfig.channel}</Text>
          </View>
        </View>

        {/* 晋升年龄状态 */}
        <View style={{ backgroundColor: canPromoteByAge ? C.greenLight : C.goldLight, borderRadius: 12, padding: 14,
          borderWidth: 1, borderColor: canPromoteByAge ? C.greenMid : C.goldMid, flexDirection: 'row', gap: 10, alignItems: 'center', borderCurve: 'continuous' }}>
          <Text style={{ fontSize: 22 }}>{canPromoteByAge ? '✅' : '⏳'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: canPromoteByAge ? C.green : C.gold }}>
              {canPromoteByAge ? '已达到晋升年龄要求' : '未达到最低晋升年龄'}
            </Text>
            <Text style={{ fontSize: 11, color: C.sub, marginTop: 2 }}>
              当前年龄：{playerAge}岁 · {RANK_NAMES[rank + 1] ?? '顶级'}最低年龄：{nextRankAge}岁
              {!canPromoteByAge && ` · 还需 ${nextRankAge - playerAge} 年`}
            </Text>
          </View>
        </View>

        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: `${msgColor[msg.type]}15`, borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: `${msgColor[msg.type]}50`, borderCurve: 'continuous' }}>
            <Text style={{ fontSize: 13, color: msgColor[msg.type], fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 路线专属福利 */}
        <View style={{ backgroundColor: lineConfig.lightBg, borderRadius: 12, padding: 14,
          borderWidth: 1, borderColor: lineConfig.midColor, borderCurve: 'continuous' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: lineConfig.color, marginBottom: 8 }}>🎁 {currentLine}专属福利</Text>
          {lineConfig.perks.map((perk, i) => {
            const reqRank = parseInt(perk.match(/rank(\d+)/)?.[1] ?? '0');
            const unlocked = rank >= reqRank;
            return (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginTop: 5, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 12, color: unlocked ? lineConfig.color : C.sub }}>
                  {unlocked ? '✓' : '○'}
                </Text>
                <Text style={{ fontSize: 12, color: unlocked ? C.label : C.sub, flex: 1, opacity: unlocked ? 1 : 0.6 }}>
                  {perk}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 行动事件列表 */}
        <Text style={{ fontSize: 15, fontWeight: '900', color: C.label }}>可执行行动</Text>
        {actions.map(action => {
          const locked = rank < action.minRank;
          const cool = isCool(action.key, action.cooldownDays);
          return (
            <View key={action.key} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16,
              borderWidth: 1, borderColor: locked ? C.border : cool ? C.goldMid : lineConfig.midColor,
              opacity: locked ? 0.6 : 1, borderCurve: 'continuous' }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontSize: 26 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.label }}>{action.label}</Text>
                    {locked && (
                      <View style={{ backgroundColor: C.redLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Text style={{ fontSize: 10, color: C.red, fontWeight: '700' }}>需职级{action.minRank}</Text>
                      </View>
                    )}
                    {action.specialEffect && !locked && (
                      <View style={{ backgroundColor: lineConfig.lightBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                        <Text style={{ fontSize: 10, color: lineConfig.color, fontWeight: '700' }}>{action.specialEffect}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: C.sub, lineHeight: 17 }}>{action.desc}</Text>
                </View>
              </View>
              {(() => { const r = getResult('careerPath_' + action.key); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 3 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 11, color: r.ok ? '#047857' : '#DC2626', lineHeight: 16 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 11, color: C.sub }}>政绩 <Text style={{ color: C.green, fontWeight: '700' }}>+{action.meritDelta}</Text></Text>
                  {action.moralDelta !== 0 && <Text style={{ fontSize: 11, color: C.sub }}>廉洁 <Text style={{ color: action.moralDelta > 0 ? C.green : C.red, fontWeight: '700' }}>{action.moralDelta > 0 ? '+' : ''}{action.moralDelta}</Text></Text>}
                  {action.abilityDelta !== 0 && <Text style={{ fontSize: 11, color: C.sub }}>能力 <Text style={{ color: C.blue, fontWeight: '700' }}>+{action.abilityDelta}</Text></Text>}
                  {action.meritCost > 0 && <Text style={{ fontSize: 11, color: C.red }}>消耗 -{action.meritCost}政绩</Text>}
                  <Text style={{ fontSize: 11, color: C.sub }}>冷却 {action.cooldownDays}天</Text>
                </View>
                <Pressable onPress={() => !loading && !locked && !cool && handleAction(action)}
                  style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderCurve: 'continuous',
                    backgroundColor: locked ? C.border : cool ? C.goldLight : lineConfig.color,
                    opacity: loading ? 0.7 : 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700',
                    color: locked ? C.sub : cool ? C.gold : '#FFFFFF' }}>
                    {locked ? '未解锁' : cool ? `${coolLeft(action.key, action.cooldownDays)}天后` : '执行'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* 晋升通道完整图 */}
        <View style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.border, borderCurve: 'continuous' }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: C.label, marginBottom: 12 }}>📊 晋升年龄要求一览</Text>
          {Object.entries(RANK_NAMES).map(([rankStr, name]) => {
            const r = parseInt(rankStr);
            const minAge = PROMOTION_AGE_LIMITS[r] ?? 0;
            const isCurrent = r === rank;
            return (
              <View key={r} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4,
                  backgroundColor: isCurrent ? lineConfig.color : r < rank ? C.greenMid : C.border }} />
                <Text style={{ fontSize: 12, color: isCurrent ? lineConfig.color : r < rank ? C.green : C.sub,
                  fontWeight: isCurrent ? '800' : '500', flex: 1 }}>
                  {name} {isCurrent ? '← 当前' : ''}
                </Text>
                <Text style={{ fontSize: 11, color: C.sub }}>最低 {minAge} 岁</Text>
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
