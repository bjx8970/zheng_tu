/**
 * 行政线专属：城市建设行动页面
 * 基础设施 / 民生建设 / 产业招商 / 规划立项
 * 所有行动消耗 cityGovFund（行政专项资金），请先在"专项资金募集"页面补充资金
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface UrbanAction {
  key: string; label: string; icon: string; desc: string;
  minRank: number; cooldownDays: number;
  category: '基础设施' | '民生建设' | '产业招商' | '规划立项';
  grantCost: number;
  meritEffect: number;
  gdpPct: number;
  moralEffect: number;
  extraField?: string; extraValue?: number; extraLabel?: string;
}

const URBAN_ACTIONS: UrbanAction[] = [
  // ─ 基础设施 ─
  { key: 'urb_road',      label: '推进主干道扩建工程',  icon: '🛣️', category: '基础设施',
    desc: '推动城区主干道拓宽改造工程，缓解交通拥堵，提升城市通行能力。',
    minRank: 3, cooldownDays: 90, grantCost: 30, meritEffect: 25, gdpPct: 1, moralEffect: 2 },
  { key: 'urb_waterway',  label: '实施河道综合整治',    icon: '🌊', category: '基础设施',
    desc: '推进城区黑臭水体治理和河道景观综合整治，创建国家生态文明示范区。',
    minRank: 4, cooldownDays: 90, grantCost: 20, meritEffect: 35, gdpPct: 0, moralEffect: 6 },
  { key: 'urb_subway',    label: '申报轨道交通建设',    icon: '🚇', category: '基础设施',
    desc: '向国家发改委提交城市地铁（轻轨）建设申报，争取进入国家建设计划。',
    minRank: 7, cooldownDays: 365, grantCost: 200, meritEffect: 80, gdpPct: 5, moralEffect: 0 },
  { key: 'urb_airport',   label: '推进机场改扩建',      icon: '✈️', category: '基础设施',
    desc: '推动辖区机场扩建项目立项审批，新增航站楼面积和停机位，提升对外开放水平。',
    minRank: 8, cooldownDays: 365, grantCost: 300, meritEffect: 100, gdpPct: 8, moralEffect: 0 },
  // ─ 民生建设 ─
  { key: 'urb_park',      label: '建设城市综合公园',    icon: '🌳', category: '民生建设',
    desc: '新建大型城市综合性公园，增加城区公共绿地面积，改善人居环境。',
    minRank: 3, cooldownDays: 120, grantCost: 15, meritEffect: 30, gdpPct: 0, moralEffect: 5 },
  { key: 'urb_shantytown',label: '推进棚改安置房建设',  icon: '🏗️', category: '民生建设',
    desc: '启动棚户区改造安置房建设工程，改善居民居住条件，消除安全隐患。',
    minRank: 4, cooldownDays: 180, grantCost: 50, meritEffect: 40, gdpPct: 2, moralEffect: 8 },
  { key: 'urb_hospital',  label: '新建区域医疗中心',    icon: '🏥', category: '民生建设',
    desc: '引进优质医疗资源，新建三甲医院或区域医疗中心，提升辖区医疗卫生水平。',
    minRank: 5, cooldownDays: 180, grantCost: 60, meritEffect: 45, gdpPct: 0, moralEffect: 10 },
  { key: 'urb_school',    label: '新建高标准中小学',    icon: '🏫', category: '民生建设',
    desc: '推动建设高标准中小学（含幼儿园），引进优质教育资源，解决入学难题。',
    minRank: 4, cooldownDays: 150, grantCost: 40, meritEffect: 38, gdpPct: 0, moralEffect: 9 },
  // ─ 产业招商 ─
  { key: 'urb_indpark',   label: '建设产业园区',        icon: '🏭', category: '产业招商',
    desc: '规划建设新型产业园区，配套完善基础设施，吸引战略性新兴产业项目落地。',
    minRank: 4, cooldownDays: 120, grantCost: 25, meritEffect: 35, gdpPct: 3, moralEffect: 0,
    extraField: 'cityBusiness', extraValue: 5, extraLabel: '商业+5' },
  { key: 'urb_expo',      label: '举办产业博览会',      icon: '🎪', category: '产业招商',
    desc: '举办产业投资博览会，邀请国内外知名企业参展，扩大招商引资规模。',
    minRank: 5, cooldownDays: 180, grantCost: 35, meritEffect: 50, gdpPct: 2, moralEffect: 2,
    extraField: 'cityBusiness', extraValue: 8, extraLabel: '商业+8' },
  { key: 'urb_hq',        label: '引进世界500强总部',   icon: '🏢', category: '产业招商',
    desc: '专项引进世界500强或行业龙头企业区域总部落地，打造辖区高端产业高地。',
    minRank: 7, cooldownDays: 270, grantCost: 100, meritEffect: 80, gdpPct: 6, moralEffect: 0,
    extraField: 'cityBusiness', extraValue: 15, extraLabel: '商业+15' },
  // ─ 规划立项 ─
  { key: 'urb_masterplan',label: '修订城市总体规划',    icon: '📋', category: '规划立项',
    desc: '组织编制或修订城市总体规划，优化城市空间布局，引导城市有序发展。',
    minRank: 4, cooldownDays: 180, grantCost: 10, meritEffect: 30, gdpPct: 0, moralEffect: 0,
    extraField: 'lineKpiScore', extraValue: 8, extraLabel: 'KPI+8' },
  { key: 'urb_land',      label: '推进土地整理出让',    icon: '🌐', category: '规划立项',
    desc: '完成片区土地整理，依法依规推进国有土地使用权公开出让，优化土地资源配置。',
    minRank: 3, cooldownDays: 90, grantCost: 10, meritEffect: 20, gdpPct: 1, moralEffect: 0 },
  { key: 'urb_special',   label: '创建特色小镇示范区',  icon: '🏡', category: '规划立项',
    desc: '申报省级特色小镇示范区，推动传统村落保护与活化利用，打造城乡融合发展样板。',
    minRank: 5, cooldownDays: 180, grantCost: 30, meritEffect: 45, gdpPct: 2, moralEffect: 5,
    extraField: 'lineKpiScore', extraValue: 10, extraLabel: 'KPI+10' },
];

const CAT_ORDER = ['基础设施', '民生建设', '产业招商', '规划立项'] as const;
const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  基础设施: { bg: '#DBEAFE', text: '#1D4ED8' },
  民生建设: { bg: '#D1FAE5', text: '#065F46' },
  产业招商: { bg: '#FEF3C7', text: '#B45309' },
  规划立项: { bg: '#F3E8FF', text: '#6D28D9' },
};

export default function AdminCityBuildScreen() {
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [expandedCat, setExpandedCat] = useState<Record<string, boolean>>({ 基础设施: true });
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // useFocusEffect cooldowns 同步已由直接读 save 替代

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const theme = getRankThemeWithLine(save.rankLevel, '行政线');
  const rank = save.rankLevel ?? 1;
  const grantFund = save.cityGovFund ?? 0;
  const gameDays = save.gameDays ?? 0;

  function isCool(key: string, days: number) { return ((cooldowns[key] ?? 0) + days) > gameDays; }
  function coolLeft(key: string, days: number) { return Math.max(0, Math.ceil(((cooldowns[key] ?? 0) + days) - gameDays)); }
  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  async function handleAction(action: UrbanAction) {
    if (!save) return;
    if (rank < action.minRank) { showMsg(`需达到职级 ${action.minRank}`, false); return; }
    if (isCool(action.key, action.cooldownDays)) { showMsg(`冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, false); return; }
    if (grantFund < action.grantCost) {
      showMsg(`💰 专项资金不足！需 ${action.grantCost} 万，当前 ${grantFund} 万，请先前往募资页面补充`, false); return;
    }
    setLoading(l => ({ ...l, [action.key]: true }));
    const nc = { ...cooldowns, [action.key]: gameDays };
    const updates: Parameters<typeof updateGameSave>[0] = {
      meritPoints:        (save.meritPoints ?? 0) + action.meritEffect,
      cityGovFund:      Math.max(0, grantFund - action.grantCost),
      cityGdp:            action.gdpPct > 0 ? Math.round((save.cityGdp ?? 1000) * (1 + action.gdpPct / 100)) : (save.cityGdp ?? 1000),
      moralValue:         Math.min(100, (save.moralValue ?? 60) + action.moralEffect),
      careerPathCooldowns: { ...(save.careerPathCooldowns ?? {}), ...nc },
    };
    if (action.extraField && action.extraValue) {
      (updates as Record<string, unknown>)[action.extraField] =
        ((save as unknown as Record<string, unknown>)[action.extraField] as number ?? 0) + action.extraValue;
    }
    const desc = `${action.label}完成！政绩 +${action.meritEffect}，专项资金 -${action.grantCost}万${action.extraLabel ? '，' + action.extraLabel : ''}`;
    await saveResult('cityBuild_' + action.key, { ok: true, desc, day: gameDays }, updates);
    setCooldowns(nc);
    showMsg(`✅ ${desc}`);
    setLoading(l => ({ ...l, [action.key]: false }));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 14, gap: 12 }}>
        {/* 头部 */}
        <View style={{ backgroundColor: theme.headerBg, borderRadius: 14, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
              <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
            </Pressable>
            <Text style={{ fontSize: 22 }}>🏗️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#FFFFFF' }}>城市建设行动</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>行政线专属 · 专项资金统筹建设</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>专项资金</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: grantFund >= 80 ? '#86EFAC' : '#FCA5A5' }}>{grantFund}万</Text>
            </View>
          </View>
        </View>

        {/* 资金状态 */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.cardBorder }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '专项资金', val: `${grantFund}万`, color: grantFund >= 80 ? '#166534' : '#B91C1C', bg: grantFund >= 80 ? '#DCFCE7' : '#FEE2E2' },
              { label: '城市GDP', val: `${save.cityGdp ?? 0}亿`, color: '#1D4ED8', bg: '#DBEAFE' },
              { label: '民心指数', val: `${save.moralValue ?? 60}`, color: '#6B21A8', bg: '#F3E8FF' },
              { label: 'KPI', val: `${save.lineKpiScore ?? 0}`, color: '#92400E', bg: '#FEF3C7' },
            ].map(d => (
              <View key={d.label} style={{ flex: 1, backgroundColor: d.bg, borderRadius: 8, padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#6B7280', fontSize: 9 }}>{d.label}</Text>
                <Text style={{ color: d.color, fontSize: 14, fontWeight: '900', marginTop: 2 }}>{d.val}</Text>
              </View>
            ))}
          </View>
          {grantFund < 50 && (
            <Pressable
              onPress={() => router.push('/(app)/city-gov-fund' as never)}
              style={{ backgroundColor: '#FEE2E2', borderRadius: 8, padding: 10, marginTop: 10 }}>
              <Text style={{ color: '#B91C1C', fontSize: 11, fontWeight: '600' }}>
                ⚠️ 专项资金不足，点此前往募资页面补充资金 →
              </Text>
            </Pressable>
          )}
        </View>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: msg.ok ? '#86EFAC' : '#FECACA' }}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#166534' : '#B91C1C', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 按分类展示 */}
        {CAT_ORDER.map(cat => {
          const actions = URBAN_ACTIONS.filter(a => a.category === cat);
          const cc = CAT_COLORS[cat];
          const isExpanded = expandedCat[cat] ?? false;
          return (
            <View key={cat} style={{ backgroundColor: theme.cardBg, borderRadius: 12, borderWidth: 1, borderColor: theme.cardBorder, overflow: 'hidden' }}>
              <Pressable onPress={() => setExpandedCat(p => ({ ...p, [cat]: !p[cat] }))}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: theme.sectionHeaderBg, gap: 8 }}>
                <View style={{ backgroundColor: cc.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                  <Text style={{ color: cc.text, fontSize: 11, fontWeight: '800' }}>{cat}</Text>
                </View>
                <Text style={{ flex: 1, color: theme.sectionHeaderText, fontSize: 12, fontWeight: '700' }}>
                  {cat === '基础设施' ? '道路/河道/轨交/机场' :
                   cat === '民生建设' ? '公园/棚改/医院/学校' :
                   cat === '产业招商' ? '园区/博览会/世500强总部' : '规划/土地/特色小镇'}
                </Text>
                <Text style={{ color: theme.mutedText, fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</Text>
              </Pressable>
              {isExpanded && (
                <View style={{ padding: 10, gap: 8 }}>
                  {actions.map(action => {
                    const locked = rank < action.minRank;
                    const cool = isCool(action.key, action.cooldownDays);
                    const isLoading = loading[action.key];
                    const canAfford = grantFund >= action.grantCost;
                    return (
                      <View key={action.key} style={{ backgroundColor: locked ? '#F9FAFB' : '#FAFCFF', borderRadius: 8, padding: 12,
                        borderWidth: 1, borderColor: theme.cardBorder, opacity: locked ? 0.6 : 1 }}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                          <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: theme.labelText }}>{action.label}</Text>
                            <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 3, lineHeight: 16 }}>{action.desc}</Text>
                          </View>
                        </View>
                        {(() => { const r = getResult('cityBuild_' + action.key); return r ? (
                          <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 7, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                            <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                          </View>
                        ) : null; })()}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                            <Text style={{ fontSize: 10, color: canAfford ? '#1D4ED8' : '#B91C1C', fontWeight: '700' }}>💰 {action.grantCost}万</Text>
                            {action.gdpPct > 0 && <Text style={{ fontSize: 10, color: '#1D4ED8' }}>GDP+{action.gdpPct}%</Text>}
                            {action.moralEffect > 0 && <Text style={{ fontSize: 10, color: '#6B21A8' }}>民心+{action.moralEffect}</Text>}
                            {action.extraLabel && <Text style={{ fontSize: 10, color: '#92400E' }}>{action.extraLabel}</Text>}
                            <Text style={{ fontSize: 10, color: theme.mutedText }}>冷却{action.cooldownDays}天</Text>
                            {locked && <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>需级别{action.minRank}</Text>}
                          </View>
                          <Pressable onPress={() => !isLoading && !locked && !cool && handleAction(action)}
                            style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, minWidth: 60, alignItems: 'center',
                              backgroundColor: locked ? '#E5E7EB' : cool ? '#FEF3C7' : !canAfford ? '#FEE2E2' : theme.primary }}>
                            <Text style={{ fontSize: 12, fontWeight: '700',
                              color: locked ? '#9CA3AF' : cool ? '#B45309' : !canAfford ? '#B91C1C' : theme.primaryText }}>
                              {isLoading ? '…' : locked ? '未解锁' : cool ? `${coolLeft(action.key, action.cooldownDays)}天` : !canAfford ? '资金不足' : '执行'}
                            </Text>
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

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
