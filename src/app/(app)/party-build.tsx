/**
 * 党务线专属：党建工作管理页面
 * 党组织建设 / 意识形态 / 干部培养 / 宣传教育
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface PartyBuildAction {
  key: string; label: string; icon: string; desc: string;
  minRank: number; cooldownDays: number;
  meritEffect: number; factionEffect: number; moralEffect: number; opinionEffect: number;
  category: '组织' | '宣传' | '干部' | '意识形态' | '统战';
}

const PARTY_BUILD_ACTIONS: PartyBuildAction[] = [
  { key: 'pb_org_congress', label: '召开党代表大会', icon: '🏛️', category: '组织',
    desc: '按程序召开辖区党代表大会，选举产生新一届领导班子，强化党的执政基础。',
    minRank: 4, cooldownDays: 365*5, meritEffect: 60, factionEffect: 10, moralEffect: 3, opinionEffect: 8 },
  { key: 'pb_edu_campaign', label: '开展主题教育活动', icon: '📚', category: '意识形态',
    desc: '在全辖区机关事业单位开展党的创新理论主题教育，推动学习走深走实。',
    minRank: 2, cooldownDays: 90, meritEffect: 20, factionEffect: 5, moralEffect: 2, opinionEffect: 5 },
  { key: 'pb_cadre_training', label: '举办干部培训班', icon: '🎓', category: '干部',
    desc: '选派辖区中层干部赴党校学习，培育党务系统后备骨干力量。',
    minRank: 3, cooldownDays: 120, meritEffect: 25, factionEffect: 8, moralEffect: 2, opinionEffect: 0 },
  { key: 'pb_grass_root', label: '整顿软弱涣散基层党组织', icon: '🔧', category: '组织',
    desc: '排查并整顿辖区软弱涣散基层党支部，配强书记，夯实党建基础。',
    minRank: 3, cooldownDays: 90, meritEffect: 30, factionEffect: 5, moralEffect: 5, opinionEffect: 5 },
  { key: 'pb_newspaper', label: '主导党报党刊宣传策划', icon: '📰', category: '宣传',
    desc: '策划系列深度报道，在党报党刊上推广辖区典型经验，扩大政治影响力。',
    minRank: 4, cooldownDays: 60, meritEffect: 25, factionEffect: 5, moralEffect: 0, opinionEffect: 8 },
  { key: 'pb_united_front', label: '开展统一战线工作', icon: '🤝', category: '统战',
    desc: '召开党外人士座谈会，做好民主党派、社会各界的联系沟通工作，巩固爱国统一战线。',
    minRank: 4, cooldownDays: 90, meritEffect: 28, factionEffect: 8, moralEffect: 2, opinionEffect: 5 },
  { key: 'pb_discipline_campaign', label: '开展廉洁党风建设运动', icon: '🛡️', category: '意识形态',
    desc: '在党员干部中开展廉政警示教育，压实两个责任，打造廉洁政治生态。',
    minRank: 3, cooldownDays: 60, meritEffect: 22, factionEffect: 5, moralEffect: 6, opinionEffect: 5 },
  { key: 'pb_develop_members', label: '发展吸收优秀党员', icon: '🌱', category: '组织',
    desc: '按照严格程序，在优秀工人、农民、知识分子中发展党员，扩大党的阶级基础。',
    minRank: 2, cooldownDays: 120, meritEffect: 15, factionEffect: 8, moralEffect: 2, opinionEffect: 3 },
  { key: 'pb_provincial_commend', label: '争取省委通报表扬', icon: '🏆', category: '干部',
    desc: '将辖区党建创新案例向省委组织部推荐，争取获得全省通报表扬，提升知名度。',
    minRank: 5, cooldownDays: 180, meritEffect: 55, factionEffect: 12, moralEffect: 2, opinionEffect: 10 },
  { key: 'pb_ideology_forum', label: '举办意识形态安全研讨会', icon: '🧠', category: '意识形态',
    desc: '组织辖区宣传部门开展意识形态领域安全风险研判，制定防范预案。',
    minRank: 4, cooldownDays: 90, meritEffect: 25, factionEffect: 6, moralEffect: 3, opinionEffect: 4 },
  { key: 'pb_national_model', label: '申报全国先进基层党组织', icon: '🥇', category: '组织',
    desc: '向中组部推荐辖区优秀基层党支部申报全国先进基层党组织荣誉称号。',
    minRank: 5, cooldownDays: 365, meritEffect: 65, factionEffect: 15, moralEffect: 3, opinionEffect: 12 },
  { key: 'pb_winter_school', label: '举办党员冬训学习', icon: '❄️', category: '宣传',
    desc: '利用农闲季节举办党员冬训，系统学习党的路线方针政策，强化理论武装。',
    minRank: 2, cooldownDays: 365, meritEffect: 18, factionEffect: 6, moralEffect: 2, opinionEffect: 4 },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  组织: { bg: '#FEE2E2', text: '#B91C1C' },
  宣传: { bg: '#FEF3C7', text: '#92400E' },
  干部: { bg: '#DBEAFE', text: '#1D4ED8' },
  意识形态: { bg: '#F3E8FF', text: '#6B21A8' },
  统战: { bg: '#DCFCE7', text: '#166534' },
};

export default function PartyBuildScreen() {
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);


  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;
  if (save.careerPathLine !== '党务线') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>此页面仅限党务线官员查阅</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#B01020', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const theme = getRankThemeWithLine(save.rankLevel, '党务线');
  const rank = save.rankLevel;
  const faction = save.reformFaction ?? 50;
  // 直接从 save 读取持久化冷却，避免本地 state 每次进页面重置
  const cooldowns = save.careerPathCooldowns ?? {};

  function isCool(key: string, days: number) { return ((cooldowns[key] ?? 0) + days) > (save?.gameDays ?? 0); }
  function coolLeft(key: string, days: number) { return Math.max(0, (cooldowns[key] ?? 0) + days - (save?.gameDays ?? 0)); }
  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  async function handleAction(action: PartyBuildAction) {
    if (!save) return;
    if (rank < action.minRank) { showMsg(`需达到职级 ${action.minRank}`, false); return; }
    if (isCool(action.key, action.cooldownDays)) { showMsg(`冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, false); return; }
    setLoading(true);
    const nc = { ...(save.careerPathCooldowns ?? {}), [action.key]: save.gameDays };
    await updateGameSave({
      meritPoints: save.meritPoints + action.meritEffect,
      reformFaction: Math.min(100, Math.max(0, faction + action.factionEffect)),
      moralValue: Math.min(100, Math.max(0, save.moralValue + action.moralEffect)),
      publicOpinionIndex: Math.min(100, (save.publicOpinionIndex ?? 50) + action.opinionEffect),
      careerPathCooldowns: nc,
    });
    const tip = `✅ ${action.label} 完成！政绩 +${action.meritEffect}，派系威望 +${action.factionEffect}`;
    await saveResult('partyBuild_' + action.key, { ok: true, desc: tip, day: save.gameDays });
    showMsg(tip);
    setLoading(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ backgroundColor: theme.headerBg, borderRadius: 14, padding: 16, borderCurve: 'continuous' } as object}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>🔴</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>党建工作管理</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>党务线专属 · 组织建设与意识形态</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, color: '#FFFFFF', fontWeight: '700' }}>派系威望 {faction}</Text>
            </View>
          </View>
        </View>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: msg.ok ? '#86EFAC' : '#FECACA', borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#166534' : '#B91C1C', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: '900', color: theme.labelText }}>党建专项行动</Text>
        {PARTY_BUILD_ACTIONS.map(action => {
          const locked = rank < action.minRank;
          const cool = isCool(action.key, action.cooldownDays);
          const cc = CAT_COLORS[action.category];
          return (
            <View key={action.key} style={{ backgroundColor: theme.cardBg, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: theme.cardBorder, opacity: locked ? 0.6 : 1, borderCurve: 'continuous' } as object}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.labelText }}>{action.label}</Text>
                    <View style={{ backgroundColor: cc.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, color: cc.text, fontWeight: '700' }}>{action.category}</Text>
                    </View>
                    {locked && <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>需职级{action.minRank}</Text>
                    </View>}
                  </View>
                  <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 17 }}>{action.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>政绩<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.meritEffect}</Text></Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>派系<Text style={{ color: '#B91C1C', fontWeight: '700' }}> +{action.factionEffect}</Text></Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>冷却{action.cooldownDays}天</Text>
                </View>
                <Pressable onPress={() => !loading && !locked && !cool && handleAction(action)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: locked ? theme.cardBorder : cool ? '#FEF3C7' : theme.primary,
                    opacity: loading ? 0.7 : 1, borderCurve: 'continuous' } as object}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: locked ? theme.mutedText : cool ? '#B45309' : theme.primaryText }}>
                    {locked ? '未解锁' : cool ? `${coolLeft(action.key, action.cooldownDays)}天` : '执行'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        <Pressable onPress={() => router.back()}
          style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
            paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderCurve: 'continuous' } as object}>
          <Text style={{ color: theme.labelText, fontSize: 14, fontWeight: '600' }}>← 返回</Text>
        </Pressable>
        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
