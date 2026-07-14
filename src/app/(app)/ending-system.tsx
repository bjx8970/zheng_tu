// 多结局收尾系统 — 7种人生结局综合计算
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { RANK_CONFIG } from '@/types/game';

// ── 结局定义 ────────────────────────────────────────────────────────────────
const ENDINGS = [
  {
    key: 'pillar',
    icon: '🏅',
    title: '国之柱石',
    subtitle: '廉洁高尚，政绩卓著，青史留名',
    color: '#B8860B',
    bgColor: '#FFFDE7',
    borderColor: '#F9A825',
    desc: '廉洁指数长期高位，政绩积累丰厚，历史遗产留存深远。您的名字将镌刻于国家发展的历史丰碑，后世传颂，万古流芳。',
    requirements: '廉洁≥80 + 政绩≥5000 + 遗产加成≥8',
    bonusDesc: '历史评价+20，接班人政绩翻倍，解锁名人堂',
    check: (s: ReturnType<typeof getScores>) =>
      s.integrity >= 80 && s.merit >= 5000 && s.legacy >= 8,
  },
  {
    key: 'memoir',
    icon: '📖',
    title: '著述立说',
    subtitle: '笔耕不辍，思想影响深远',
    color: '#1565C0',
    bgColor: '#E3F2FD',
    borderColor: '#1976D2',
    desc: '仕途中积累的丰富经验化为思想著述，政绩虽非顶尖，却以理论贡献影响一代又一代后继者，学界与政界皆深受启迪。',
    requirements: '重大议案通过≥3 + 政策工具解锁≥2',
    bonusDesc: '每届两会新增1份影响力，派系关系长期维持',
    check: (s: ReturnType<typeof getScores>) =>
      s.majorProposalCount >= 3 && s.policyToolCount >= 2,
  },
  {
    key: 'retire_peak',
    icon: '🌅',
    title: '功成身退',
    subtitle: '在巅峰主动退休，接班人顺利接位',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    borderColor: '#388E3C',
    desc: '在政治生命最辉煌的时刻，您选择主动让贤，接班人成功接棒，展现了高尚的政治胸怀。历史将铭记您的远见与无私。',
    requirements: '主动退休 + 遗产加成≥5 + 廉洁≥60',
    bonusDesc: '遗产加成永久+3，接班人成功率+20%',
    check: (s: ReturnType<typeof getScores>) =>
      s.retiredVoluntarily && s.legacy >= 5 && s.integrity >= 60,
  },
  {
    key: 'backroom',
    icon: '🤝',
    title: '幕后掌舵',
    subtitle: '退休后仍操控多名现任要员',
    color: '#6A1B9A',
    bgColor: '#F3E5F5',
    borderColor: '#7B1FA2',
    desc: '虽已退休，但多年积累的人脉网络令您在幕后依旧举足轻重，现任要员们的重大决策仍需向您请示，影响力跨越任期。',
    requirements: '派系忠诚≥70（两大派系） + 主导议案≥2',
    bonusDesc: '退休后每年获得政治资本+2，影响力持续5年',
    check: (s: ReturnType<typeof getScores>) =>
      s.factionTotal >= 140 && s.majorProposalCount >= 2,
  },
  {
    key: 'ordinary',
    icon: '😶',
    title: '平淡终老',
    subtitle: '无功无过，安稳度日',
    color: '#546E7A',
    bgColor: '#ECEFF1',
    borderColor: '#78909C',
    desc: '一生在体制内兢兢业业，未曾大起大落，也未留下特别深刻的印记。普通却真实，是绝大多数官员最终的归宿。',
    requirements: '其余情况默认结局',
    bonusDesc: '无特殊加成，安稳退休',
    check: () => true, // 兜底结局
  },
  {
    key: 'late_corrupt',
    icon: '⚖️',
    title: '晚节不保',
    subtitle: '廉洁在最后阶段崩塌',
    color: '#E65100',
    bgColor: '#FBE9E7',
    borderColor: '#F4511E',
    desc: '数十年清廉的仕途，却在权力顶峰时期出现致命失误。晚节不保的污点抹去了您大部分的历史功绩，令人扼腕叹息。',
    requirements: '廉洁≤40 + 曾经廉洁≥70',
    bonusDesc: '历史评价-15，接班人忠诚-20',
    check: (s: ReturnType<typeof getScores>) =>
      s.integrity <= 40 && s.merit >= 2000,
  },
  {
    key: 'imprisoned',
    icon: '🔒',
    title: '身陷囹圄',
    subtitle: '被查处，政治生命终结',
    color: '#B71C1C',
    bgColor: '#FFEBEE',
    borderColor: '#C62828',
    desc: '长期的腐败行为终于东窗事发，被纪检部门立案查处。曾经的权势化为泡影，您将在牢狱中度过余生，成为反面教材。',
    requirements: '廉洁≤20 或 被查风险≥80',
    bonusDesc: '一切政绩清零，历史评价最低',
    check: (s: ReturnType<typeof getScores>) =>
      s.integrity <= 20 || s.inspectionRisk >= 80,
  },
] as const;

// ── 得分结构 ─────────────────────────────────────────────────────────────────
function getScores(save: NonNullable<ReturnType<typeof useGame>['save']>) {
  const majorProposals: string[] = (() => { try { return JSON.parse(save.majorProposals ?? '[]'); } catch { return []; } })();
  const policyTools: string[] = (() => { try { return JSON.parse(save.policyTools ?? '[]'); } catch { return []; } })();
  return {
    integrity:         save.moralValue ?? 80,
    merit:             save.meritPoints ?? 0,
    legacy:            save.legacyBonus ?? 0,
    inspectionRisk:    save.inspectionRisk ?? 0,
    retiredVoluntarily: save.retiredVoluntarily ?? false,
    factionTotal:      (save.reformFaction ?? 0) + (save.pragmaticFaction ?? 0),
    majorProposalCount: majorProposals.length,
    policyToolCount:   policyTools.length,
    rankLevel:         save.rankLevel ?? 1,
  };
}

// ── 结局评定逻辑（优先级从高到低）──────────────────────────────────────────
function evaluateEnding(scores: ReturnType<typeof getScores>) {
  // 最高优先：被查/廉洁崩塌
  if (ENDINGS[6].check(scores)) return ENDINGS[6]; // 身陷囹圄
  if (ENDINGS[5].check(scores)) return ENDINGS[5]; // 晚节不保
  // 正向结局（按条件严苛度排序）
  if (ENDINGS[0].check(scores)) return ENDINGS[0]; // 国之柱石
  if (ENDINGS[2].check(scores)) return ENDINGS[2]; // 功成身退
  if (ENDINGS[3].check(scores)) return ENDINGS[3]; // 幕后掌舵
  if (ENDINGS[1].check(scores)) return ENDINGS[1]; // 著述立说
  return ENDINGS[4]; // 平淡终老（兜底）
}

// ── 指标进度条 ───────────────────────────────────────────────────────────────
function MetricBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 11, color: '#555' }}>{label}</Text>
        <Text style={{ fontSize: 11, color, fontWeight: '700' }}>{value}<Text style={{ color: '#aaa', fontWeight: '400' }}>/{max}</Text></Text>
      </View>
      <View style={{ height: 6, backgroundColor: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ── 主页面 ───────────────────────────────────────────────────────────────────
export default function EndingSystemPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [showAll, setShowAll] = useState(false);

  if (!save) return null;

  const scores    = getScores(save);
  const current   = evaluateEnding(scores);
  const rankLabel = (RANK_CONFIG[scores.rankLevel] as { label?: string })?.label ?? '乡镇';
  const careerYrs = Math.floor((save.gameDays ?? 0) / 365);

  const PRIMARY = '#1A0A00';

  return (
    <View style={{ flex: 1, backgroundColor: '#FDF8F0' }}>
      <StatusBar style="light" />
      {/* 页头 */}
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '800', letterSpacing: 1 }}>多结局收尾系统</Text>
        </View>
        <Text style={{ color: '#aaa', fontSize: 11, textAlign: 'center' }}>
          根据廉洁指数 · 政绩积累 · 历史遗产 · 派系忠诚综合评定
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* ── 当前预测结局 ── */}
        <View style={{ backgroundColor: current.bgColor, borderRadius: 14, borderWidth: 2, borderColor: current.borderColor, padding: 18, alignItems: 'center' }}>
          <Text style={{ fontSize: 40, marginBottom: 6 }}>{current.icon}</Text>
          <Text style={{ fontSize: 20, fontWeight: '900', color: current.color, marginBottom: 4 }}>{current.title}</Text>
          <Text style={{ fontSize: 12, color: '#666', marginBottom: 10, fontStyle: 'italic' }}>{current.subtitle}</Text>
          <View style={{ height: 1, backgroundColor: current.borderColor + '40', width: '80%', marginBottom: 10 }} />
          <Text style={{ fontSize: 12, color: '#444', lineHeight: 19, textAlign: 'center', marginBottom: 8 }}>{current.desc}</Text>
          <View style={{ backgroundColor: current.color + '15', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
            <Text style={{ fontSize: 11, color: current.color, fontWeight: '700' }}>🎁 {current.bonusDesc}</Text>
          </View>
        </View>

        {/* ── 综合指标面板 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e8e0d0' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#333', marginBottom: 12, letterSpacing: 1 }}>📊 综合指标评估</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {[
              { label: '任职年限', value: `${careerYrs}年`, color: '#455A64' },
              { label: '当前职级', value: rankLabel, color: '#1565C0' },
              { label: '仕途路线', value: save.careerPath === 'government' ? '行政线' : save.careerPath === 'party' ? '党务线' : save.careerPath === 'discipline' ? '纪检线' : save.careerPath === 'league' ? '团派线' : '综合', color: '#6A1B9A' },
              { label: '历史评定', value: save.historicalLabel || '待评定', color: '#E65100' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, minWidth: '45%', backgroundColor: '#f9f6f0', borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>{item.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>{item.value}</Text>
              </View>
            ))}
          </View>
          <MetricBar label="廉洁指数" value={scores.integrity} max={100} color={scores.integrity >= 70 ? '#2E7D32' : scores.integrity >= 40 ? '#F57F17' : '#C62828'} />
          <MetricBar label="政绩积累" value={Math.min(scores.merit, 10000)} max={10000} color="#1565C0" />
          <MetricBar label="历史遗产加成" value={scores.legacy} max={20} color="#B8860B" />
          <MetricBar label="派系忠诚合计" value={Math.min(scores.factionTotal, 200)} max={200} color="#6A1B9A" />
          <MetricBar label="被查风险" value={scores.inspectionRisk} max={100} color={scores.inspectionRisk >= 60 ? '#C62828' : '#FF8F00'} />
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1, backgroundColor: '#f9f6f0', borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#888' }}>重大议案通过</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#1565C0' }}>{scores.majorProposalCount}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f9f6f0', borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#888' }}>政策工具解锁</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#2E7D32' }}>{scores.policyToolCount}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#f9f6f0', borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 10, color: '#888' }}>政治资本</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#B8860B' }}>{save.politicalCapital ?? 0}</Text>
            </View>
          </View>
        </View>

        {/* ── 所有结局一览 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#e8e0d0', overflow: 'hidden' }}>
          <Pressable
            onPress={() => setShowAll(v => !v)}
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 }}
          >
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#333', letterSpacing: 1 }}>🗺️ 七种结局一览</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>{showAll ? '收起 ▲' : '展开 ▼'}</Text>
          </Pressable>
          {showAll && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
              {ENDINGS.map(e => {
                const isCurrent = e.key === current.key;
                const isUnlocked = e.check(scores);
                return (
                  <View
                    key={e.key}
                    style={{
                      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                      backgroundColor: isCurrent ? e.bgColor : '#fafafa',
                      borderRadius: 10, padding: 12,
                      borderWidth: isCurrent ? 2 : 1,
                      borderColor: isCurrent ? e.borderColor : '#eeeeee',
                      opacity: isUnlocked || isCurrent ? 1 : 0.5,
                    }}
                  >
                    <Text style={{ fontSize: 22, marginTop: 2 }}>{e.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: isCurrent ? e.color : '#333' }}>{e.title}</Text>
                        {isCurrent && <View style={{ backgroundColor: e.color, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>当前预测</Text></View>}
                        {!isCurrent && isUnlocked && <View style={{ backgroundColor: '#4CAF50', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: '#fff', fontSize: 9 }}>已达成</Text></View>}
                      </View>
                      <Text style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{e.subtitle}</Text>
                      <Text style={{ fontSize: 10, color: '#999' }}>条件：{e.requirements}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── 提升建议 ── */}
        <View style={{ backgroundColor: '#E8EAF6', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#9FA8DA' }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#283593', marginBottom: 8, letterSpacing: 1 }}>💡 历史评价提升建议</Text>
          {scores.integrity < 80 && (
            <Text style={{ fontSize: 11, color: '#444', lineHeight: 18, marginBottom: 4 }}>• 廉洁指数偏低，建议减少高风险决策，主动通过「历史评价」廉洁提升行动</Text>
          )}
          {scores.merit < 5000 && (
            <Text style={{ fontSize: 11, color: '#444', lineHeight: 18, marginBottom: 4 }}>• 政绩积累不足5000，可通过提交「重大议案」和「五年规划」大幅提升</Text>
          )}
          {scores.legacy < 5 && (
            <Text style={{ fontSize: 11, color: '#444', lineHeight: 18, marginBottom: 4 }}>• 历史遗产加成不足，主动退休可解锁遗产奖励，增强长期评价</Text>
          )}
          {scores.inspectionRisk >= 50 && (
            <Text style={{ fontSize: 11, color: '#C62828', lineHeight: 18, marginBottom: 4 }}>⚠️ 被查风险已达 {scores.inspectionRisk}，建议立即通过廉政行动降低风险！</Text>
          )}
          {scores.integrity >= 80 && scores.merit >= 5000 && scores.legacy >= 8 && (
            <Text style={{ fontSize: 11, color: '#2E7D32', lineHeight: 18 }}>✅ 各项指标均达到「国之柱石」要求，可考虑主动退休锁定最高评价！</Text>
          )}
        </View>

        <View style={{ height: insets.bottom + 8 }} />
      </ScrollView>
    </View>
  );
}
