/**
 * 行政线专属：管辖区域管理页面
 * 涵盖辖区行政规划、人口管理、镇村治理
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface RegionAction {
  key: string; label: string; icon: string; desc: string;
  minRank: number; cooldownDays: number;
  meritEffect: number; popEffect: number; businessEffect: number; moralEffect: number;
  category: '行政' | '人口' | '农村' | '城乡';
}

const REGION_ACTIONS: RegionAction[] = [
  { key: 'reg_census', label: '开展户籍人口普查', icon: '📊', category: '人口',
    desc: '组织全辖区人口普查，摸清人口基数，为决策提供精准数据。',
    minRank: 3, cooldownDays: 365, meritEffect: 30, popEffect: 0, businessEffect: 0, moralEffect: 3 },
  { key: 'reg_merge_towns', label: '推进镇村行政合并', icon: '🗺️', category: '行政',
    desc: '将辖区内部分撤并小型行政村，优化基层治理结构，提升行政效率。',
    minRank: 4, cooldownDays: 180, meritEffect: 40, popEffect: 0, businessEffect: 5, moralEffect: -2 },
  { key: 'reg_hukou_reform', label: '推动户籍制度改革', icon: '📝', category: '人口',
    desc: '放开辖区城镇户籍限制，吸引农村劳动力向城区转移，扩大城镇人口规模。',
    minRank: 5, cooldownDays: 180, meritEffect: 35, popEffect: 5, businessEffect: 3, moralEffect: 2 },
  { key: 'reg_special_zone', label: '申报经济特别功能区', icon: '🏭', category: '城乡',
    desc: '向省发改委申报特色产业功能区，为辖区争取差异化政策支持。',
    minRank: 6, cooldownDays: 240, meritEffect: 60, popEffect: 2, businessEffect: 8, moralEffect: 0 },
  { key: 'reg_rural_reform', label: '推进农村土地制度改革', icon: '🌾', category: '农村',
    desc: '在辖区试点农村宅基地有偿使用，探索土地流转新机制，激活农村资产。',
    minRank: 5, cooldownDays: 150, meritEffect: 45, popEffect: 0, businessEffect: 5, moralEffect: -1 },
  { key: 'reg_smart_gov', label: '建设数字政务服务平台', icon: '💻', category: '行政',
    desc: '整合辖区政务数据，建设一网通办平台，压缩行政审批时限，提升群众满意度。',
    minRank: 4, cooldownDays: 120, meritEffect: 35, popEffect: 0, businessEffect: 6, moralEffect: 2 },
  { key: 'reg_border_dispute', label: '处置行政界线纠纷', icon: '⚖️', category: '行政',
    desc: '协调处置与邻县之间的行政界线历史遗留纠纷，维护辖区行政主权。',
    minRank: 4, cooldownDays: 90, meritEffect: 25, popEffect: 0, businessEffect: 0, moralEffect: 5 },
  { key: 'reg_county_upgrade', label: '推动县改市升格申报', icon: '🏙️', category: '城乡',
    desc: '向省政府提交县改市申报材料，争取辖区行政级别提升。',
    minRank: 7, cooldownDays: 365, meritEffect: 80, popEffect: 8, businessEffect: 10, moralEffect: 0 },
  { key: 'reg_beautify', label: '推进美丽乡村建设', icon: '🌿', category: '农村',
    desc: '整合农村人居环境整治资金，推进辖区农村厕所革命、垃圾分类、污水治理工程。',
    minRank: 3, cooldownDays: 60, meritEffect: 20, popEffect: 0, businessEffect: 0, moralEffect: 3 },
  { key: 'reg_immigration', label: '招引人才落户政策', icon: '🎓', category: '人口',
    desc: '推出人才安居补贴、子女入学绿色通道等政策，吸引高学历人才落户辖区。',
    minRank: 6, cooldownDays: 90, meritEffect: 45, popEffect: 8, businessEffect: 5, moralEffect: 0 },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  行政: { bg: '#DBEAFE', text: '#1D4ED8' },
  人口: { bg: '#DCFCE7', text: '#166534' },
  农村: { bg: '#FEF3C7', text: '#92400E' },
  城乡: { bg: '#F3E8FF', text: '#6B21A8' },
};

export default function AdminRegionScreen() {
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
  const pop = save.cityPopulation ?? 50;
  const gdp = save.cityGdp ?? 1000;
  const business = save.cityBusiness ?? 50;

  function isCool(key: string, days: number) {
    return ((cooldowns[key] ?? 0) + days) > (save?.gameDays ?? 0);
  }
  function coolLeft(key: string, days: number) {
    return Math.max(0, (cooldowns[key] ?? 0) + days - (save?.gameDays ?? 0));
  }
  function showMsg(text: string, ok = true) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3500);
  }

  async function handleAction(action: RegionAction) {
    if (!save) return;
    if (rank < action.minRank) { showMsg(`需达到职级 ${action.minRank}`, false); return; }
    if (isCool(action.key, action.cooldownDays)) { showMsg(`冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, false); return; }
    setLoading(true);
    const nc = { ...cooldowns, [action.key]: save.gameDays };
    const desc = `${action.label}完成！政绩 +${action.meritEffect}` +
      (action.popEffect ? `，人口 +${action.popEffect}万` : '') +
      (action.businessEffect ? `，营商 +${action.businessEffect}` : '');
    await saveResult('region_' + action.key, { ok: true, desc, day: save.gameDays }, {
      meritPoints: save.meritPoints + action.meritEffect,
      cityPopulation: Math.max(0, pop + action.popEffect),
      cityBusiness: Math.min(100, Math.max(0, business + action.businessEffect)),
      moralValue: Math.min(100, Math.max(0, save.moralValue + action.moralEffect)),
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
            <Text style={{ fontSize: 28 }}>🗺️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>管辖区域管理</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>行政线专属 · 辖区规划与人口治理</Text>
            </View>
          </View>
        </View>

        {/* 区域数据 */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 12, padding: 14,
          borderWidth: 1, borderColor: theme.cardBorder, borderCurve: 'continuous' } as object}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.labelText, marginBottom: 10 }}>辖区基本情况</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { label: '辖区人口', value: `${pop}万人`, color: '#166534' },
              { label: 'GDP总量', value: `${gdp.toLocaleString()}亿`, color: '#1D4ED8' },
              { label: '营商环境', value: `${business}分`, color: '#B45309' },
              { label: '职级', value: `第${rank}级`, color: theme.primary },
            ].map(s => (
              <View key={s.label} style={{ flex: 1, backgroundColor: theme.pageBg, borderRadius: 8, padding: 10,
                alignItems: 'center', borderWidth: 1, borderColor: theme.cardBorder, borderCurve: 'continuous' } as object}>
                <Text style={{ fontSize: 14, fontWeight: '900', color: s.color }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: theme.mutedText, marginTop: 2 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: msg.ok ? '#86EFAC' : '#FECACA', borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#166534' : '#B91C1C', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: '900', color: theme.labelText }}>辖区治理行动</Text>
        {REGION_ACTIONS.map(action => {
          const locked = rank < action.minRank;
          const cool = isCool(action.key, action.cooldownDays);
          const cc = CAT_COLORS[action.category];
          return (
            <View key={action.key} style={{ backgroundColor: theme.cardBg, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: locked ? theme.cardBorder : theme.cardBorder,
              opacity: locked ? 0.6 : 1, borderCurve: 'continuous' } as object}>
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
              {(() => { const r = getResult('region_' + action.key); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 3 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 11, color: r.ok ? '#047857' : '#DC2626', lineHeight: 16 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>政绩<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.meritEffect}</Text></Text>
                  {action.popEffect !== 0 && <Text style={{ fontSize: 11, color: theme.mutedText }}>人口<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.popEffect}万</Text></Text>}
                  {action.businessEffect !== 0 && <Text style={{ fontSize: 11, color: theme.mutedText }}>营商<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.businessEffect}</Text></Text>}
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
