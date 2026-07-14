/**
 * 行政线专属：城市建设工作台（导航总页）
 * 顶部显示专项资金余额 + 领取入口，下方分区展示各功能模块入口
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface NavItem {
  icon: string;
  label: string;
  desc: string;
  route: string;
  accent?: boolean;
}

const MODULES: NavItem[] = [
  { icon: '🏗️', label: '城市建设',    desc: '基础设施/民生建设/产业招商/规划立项', route: '/(app)/admin-city-build' },
  { icon: '🏦', label: '城市金融',    desc: '城市治理经费管理、预算申请、政绩奖励',    route: '/(app)/city-gov-fund' },
  { icon: '🗺️', label: '区域管理',    desc: '行政规划、人口管理、镇村治理',         route: '/(app)/admin-region' },
  { icon: '🏘️', label: '民生工作',    desc: '教育/医疗/就业/社会保障',             route: '/(app)/admin-livelihood' },
  { icon: '📐', label: '城市规划',    desc: '土地规划、用途管制、特色建设',         route: '/(app)/admin-city-plan',  accent: true },
  { icon: '💼', label: '招商引资',    desc: '引进项目、产业园区、投资促进',         route: '/(app)/admin-investment', accent: true },
];

export default function AdminUrbanScreen() {
  const router = useRouter();
  const { save } = useGame();
  const [, setTick] = useState(0);

  useFocusEffect(useCallback(() => { setTick(t => t + 1); }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  if (save.careerPathLine !== '行政线') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>此页面仅限行政线官员查阅</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#1D3B5E', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const theme = getRankThemeWithLine(save.rankLevel, '行政线');
  const rank = save.rankLevel ?? 1;
  const currentFund = save.cityGovFund ?? 0;
  const merit = save.meritPoints ?? 0;
  const gdp = save.cityGdp ?? 0;
  const moral = save.moralValue ?? 60;
  const kpi = save.lineKpiScore ?? 0;

  const fundColor = currentFund >= 300 ? '#166534' : currentFund >= 80 ? '#B45309' : '#B91C1C';
  const fundBg    = currentFund >= 300 ? '#D1FAE5' : currentFund >= 80 ? '#FEF3C7' : '#FEE2E2';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>

        {/* 页头 */}
        <View style={{ backgroundColor: theme.headerBg, borderRadius: 14, padding: 16, borderCurve: 'continuous' } as object}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
            </Pressable>
            <Text style={{ fontSize: 24 }}>🏛️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: '#fff' }}>行政线工作台</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 2 }}>城市治理 · 全面统筹</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '政绩', val: merit, color: '#FDE68A' },
              { label: 'GDP（亿）', val: gdp, color: '#86EFAC' },
              { label: '民心', val: moral, color: '#C4B5FD' },
              { label: 'KPI', val: kpi, color: '#FCA5A5' },
            ].map(d => (
              <View key={d.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 8, padding: 7, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: d.color }}>{d.val}</Text>
                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', marginTop: 1 }}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── 专项资金卡片 ── */}
        <Pressable
          onPress={() => router.push('/(app)/city-gov-fund' as never)}
          style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#C7D7EA' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 24 }}>💰</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: '#64748B', letterSpacing: 1, marginBottom: 2 }}>行政线 · 专项资金</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#1D3B5E' }}>行政专项资金募集</Text>
              <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>申请转移支付、城投债、PPP等渠道补充资金</Text>
            </View>
            <View style={{ backgroundColor: fundBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 9, color: fundColor, marginBottom: 1 }}>可用余额</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: fundColor }}>{currentFund}万</Text>
            </View>
          </View>
          {currentFund < 50 && (
            <View style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#B91C1C', fontWeight: '600' }}>
                ⚠️ 专项资金不足 50万，城市建设行动将无法执行！点此补充资金 →
              </Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 }}>
            <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>进入募资 →</Text>
            </View>
          </View>
        </Pressable>

        {/* ── 功能模块入口 ── */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <View style={{ width: 3, height: 13, backgroundColor: theme.primary, borderRadius: 2 }} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.labelText }}>功能模块</Text>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {MODULES.map(m => (
              <Pressable
                key={m.route}
                onPress={() => router.push(m.route as never)}
                style={{
                  width: '47%', backgroundColor: m.accent ? theme.primary + '15' : '#F8FAFC',
                  borderRadius: 12, padding: 14, borderWidth: 1,
                  borderColor: m.accent ? theme.primary + '40' : theme.cardBorder,
                }}>
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{m.icon}</Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.labelText, marginBottom: 3 }}>{m.label}</Text>
                <Text style={{ fontSize: 10, color: theme.mutedText, lineHeight: 14 }}>{m.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 级别提示 */}
        <View style={{ backgroundColor: '#F1F5F9', borderRadius: 10, padding: 12 }}>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 18 }}>
            📌 当前职级 {rank} 级 · 城市建设类行动需消耗行政专项资金，资金不足时请先进行募资。各模块均有独立冷却时间管理。
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
