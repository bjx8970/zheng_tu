/**
 * 行政线专属：民生工作页面
 * 教育 / 医疗 / 就业 / 社会保障
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface LivelihoodAction {
  key: string; label: string; icon: string; desc: string;
  minRank: number; cooldownDays: number;
  meritEffect: number; publicOpinionEffect: number; moralEffect: number; gdpEffect: number;
  category: '教育' | '医疗' | '就业' | '社保' | '扶贫';
}

const LIVELIHOOD_ACTIONS: LivelihoodAction[] = [
  { key: 'liv_school', label: '新建学校与教育扩容', icon: '🏫', category: '教育',
    desc: '推动城区义务教育学校扩建，新增学位，缓解"入学难"问题。',
    minRank: 3, cooldownDays: 120, meritEffect: 30, publicOpinionEffect: 8, moralEffect: 3, gdpEffect: 0 },
  { key: 'liv_hospital', label: '推进县级医院达标建设', icon: '🏥', category: '医疗',
    desc: '协调卫健委资金，推动县级人民医院晋升三甲医院资格认定。',
    minRank: 4, cooldownDays: 180, meritEffect: 45, publicOpinionEffect: 12, moralEffect: 3, gdpEffect: 0 },
  { key: 'liv_employment', label: '开展大规模职业技能培训', icon: '🎯', category: '就业',
    desc: '整合人社部门资金，组织辖区失业人员和农村劳动力参加职业技能培训。',
    minRank: 3, cooldownDays: 60, meritEffect: 25, publicOpinionEffect: 6, moralEffect: 2, gdpEffect: 0 },
  { key: 'liv_social_insurance', label: '推进全民参保计划', icon: '🛡️', category: '社保',
    desc: '组织推进城乡居民基本医疗保险和养老保险全覆盖工作。',
    minRank: 4, cooldownDays: 90, meritEffect: 35, publicOpinionEffect: 10, moralEffect: 3, gdpEffect: 0 },
  { key: 'liv_poverty', label: '实施精准脱贫专项行动', icon: '🏚️', category: '扶贫',
    desc: '深入推进建档立卡贫困户精准帮扶，确保脱贫不返贫。',
    minRank: 3, cooldownDays: 60, meritEffect: 40, publicOpinionEffect: 10, moralEffect: 5, gdpEffect: 1 },
  { key: 'liv_elderly', label: '建设养老服务综合体', icon: '👴', category: '社保',
    desc: '建设集日间照料、居家护理、医疗康复于一体的综合养老服务中心。',
    minRank: 5, cooldownDays: 180, meritEffect: 40, publicOpinionEffect: 10, moralEffect: 5, gdpEffect: 0 },
  { key: 'liv_child', label: '推进普惠性幼儿园建设', icon: '🧒', category: '教育',
    desc: '新建和认定一批普惠性幼儿园，解决"入园贵"问题，提升学前教育覆盖率。',
    minRank: 3, cooldownDays: 90, meritEffect: 28, publicOpinionEffect: 8, moralEffect: 3, gdpEffect: 0 },
  { key: 'liv_food_safety', label: '开展食品安全专项整治', icon: '🍱', category: '医疗',
    desc: '联合市场监管局开展食品安全专项整治行动，严查学校食堂、农贸市场违规问题。',
    minRank: 3, cooldownDays: 45, meritEffect: 20, publicOpinionEffect: 6, moralEffect: 4, gdpEffect: 0 },
  { key: 'liv_housing', label: '建设保障性租赁住房', icon: '🏠', category: '社保',
    desc: '筹建面向低收入群体的保障性租赁住房小区，缓解城市住房压力。',
    minRank: 5, cooldownDays: 180, meritEffect: 50, publicOpinionEffect: 14, moralEffect: 4, gdpEffect: 0 },
  { key: 'liv_minority', label: '保障少数民族权益工作', icon: '🌐', category: '社保',
    desc: '专项推进辖区少数民族聚居村教育、医疗、就业一体化帮扶工作。',
    minRank: 4, cooldownDays: 90, meritEffect: 30, publicOpinionEffect: 8, moralEffect: 6, gdpEffect: 0 },
  { key: 'liv_university', label: '争取高校在本地设立分院', icon: '🎓', category: '教育',
    desc: '赴教育部及目标高校游说，争取知名大学在辖区设立分院或研究院，提升城市教育层次。',
    minRank: 7, cooldownDays: 365, meritEffect: 70, publicOpinionEffect: 15, moralEffect: 2, gdpEffect: 3 },
  { key: 'liv_community', label: '推进城乡社区治理现代化', icon: '🏘️', category: '社保',
    desc: '建设智慧社区综合服务平台，推进网格化管理，提升社区自治能力。',
    minRank: 4, cooldownDays: 90, meritEffect: 30, publicOpinionEffect: 8, moralEffect: 3, gdpEffect: 0 },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  教育: { bg: '#DBEAFE', text: '#1D4ED8' },
  医疗: { bg: '#DCFCE7', text: '#166534' },
  就业: { bg: '#FEF3C7', text: '#92400E' },
  社保: { bg: '#F3E8FF', text: '#6B21A8' },
  扶贫: { bg: '#FEE2E2', text: '#B91C1C' },
};

export default function AdminLivelihoodScreen() {
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [loading, setLoading] = useState(false);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);


  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;
  if (save.careerPathLine !== '行政线') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>此页面仅限行政线官员查阅</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#1D3B63', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const theme = getRankThemeWithLine(save.rankLevel, '行政线');
  const rank = save.rankLevel;
  const opinion = save.publicOpinionIndex ?? 50;

  function isCool(key: string, days: number) { return (key in cooldowns) && ((cooldowns[key] ?? -1) + days) > (save?.gameDays ?? 0); }
  function coolLeft(key: string, days: number) { return (key in cooldowns) ? Math.max(0, (cooldowns[key] ?? -1) + days - (save?.gameDays ?? 0)) : 0; }
  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  async function handleAction(action: LivelihoodAction) {
    if (!save) return;
    if (rank < action.minRank) { showMsg(`需达到职级 ${action.minRank}`, false); return; }
    if (isCool(action.key, action.cooldownDays)) { showMsg(`冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, false); return; }
    setLoading(true);
    const nc = { ...cooldowns, [action.key]: save.gameDays };
    const desc = `${action.label}完成！政绩 +${action.meritEffect}，群众满意度 +${action.publicOpinionEffect}`;
    await saveResult('livelihood_' + action.key, { ok: true, desc, day: save.gameDays }, {
      meritPoints: save.meritPoints + action.meritEffect,
      publicOpinionIndex: Math.min(100, opinion + action.publicOpinionEffect),
      moralValue: Math.min(100, Math.max(0, save.moralValue + action.moralEffect)),
      cityGdp: save.cityGdp ? Math.round(save.cityGdp * (1 + action.gdpEffect / 100)) : save.cityGdp,
      careerPathCooldowns: { ...(save.careerPathCooldowns ?? {}), ...nc },
    });
    setCooldowns(nc);
    showMsg(`✅ ${desc}`);
    setLoading(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ backgroundColor: theme.headerBg, borderRadius: 14, padding: 16, borderCurve: 'continuous' } as object}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>❤️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>民生工作</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>行政线专属 · 教育医疗就业社保</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>满意度 {opinion}</Text>
            </View>
          </View>
        </View>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: msg.ok ? '#86EFAC' : '#FECACA', borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#166534' : '#B91C1C', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: '900', color: theme.labelText }}>民生工作行动</Text>
        {LIVELIHOOD_ACTIONS.map(action => {
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
              {(() => { const r = getResult('livelihood_' + action.key); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 3 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 11, color: r.ok ? '#047857' : '#DC2626', lineHeight: 16 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>政绩<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.meritEffect}</Text></Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>满意度<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.publicOpinionEffect}</Text></Text>
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
