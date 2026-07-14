// 特供情报系统 — 11级以上内参订阅
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankThemeWithLine } from '@/lib/rankTheme';

// ── 内参简报模板（随机抽取） ─────────────────────────────────────────────────
const RIVAL_INTEL = [
  { key: 'rival_promotion', title: '竞争对手晋升动向', icon: '📈', risk: '中', effect: '提前布局人脉，好感度维护+5', riskKey: 'rival_promo' },
  { key: 'rival_scandal',   title: '竞争对手违规线索', icon: '📋', risk: '低', effect: '掌握情报可在关键时刻施压，政治资本+3', riskKey: 'rival_scan' },
  { key: 'rival_faction',   title: '派系内部分裂信号', icon: '⚡', risk: '高', effect: '顺势调整站队，两大派系关系重新分配', riskKey: 'rival_fact' },
  { key: 'rival_visit',     title: '上级考察行程预告', icon: '🚁', risk: '低', effect: '提前准备，视察期好感度增益+8', riskKey: 'rival_vis' },
];

const LOCAL_INTEL = [
  { key: 'local_unrest',    title: '地方群体性事件隐患', icon: '🚨', risk: '高', effect: '提前维稳，廉洁度+3，避免事件爆发', riskKey: 'local_unr' },
  { key: 'local_economy',   title: '重点企业经营困难预警', icon: '🏭', risk: '中', effect: '提前协调，GDP指数-2减少为0', riskKey: 'local_eco' },
  { key: 'local_corrupt',   title: '下属腐败线索汇报', icon: '⚖️', risk: '中', effect: '主动处理，廉洁度+5，被查风险-10', riskKey: 'local_cor' },
  { key: 'local_election',  title: '地方人大换届摸底', icon: '🗳️', risk: '低', effect: '布局提前，相关派系关系+5', riskKey: 'local_ele' },
];

const INTERNATIONAL_INTEL = [
  { key: 'intl_policy',     title: '中央涉外政策风向', icon: '🌐', risk: '低', effect: '调整招商引资策略，GDP+2', riskKey: 'intl_pol' },
  { key: 'intl_trade',      title: '区域贸易摩擦预警', icon: '📦', risk: '高', effect: '提前备案，商业指数降幅减半', riskKey: 'intl_tra' },
  { key: 'intl_investment', title: '外资撤离风险分析', icon: '💹', risk: '中', effect: '转型应对，经济韧性+3', riskKey: 'intl_inv' },
];

type IntelItem = typeof RIVAL_INTEL[0];

// ── 获取本月可用内参（根据 gameDays 确定本月期数）────────────────────────────
function getMonthlyBriefing(gameDays: number): IntelItem[] {
  const month = Math.floor(gameDays / 30);
  const rng   = (arr: IntelItem[]) => arr[month % arr.length];
  return [rng(RIVAL_INTEL), rng(LOCAL_INTEL), rng(INTERNATIONAL_INTEL)];
}

// ── 行动效果应用 ─────────────────────────────────────────────────────────────
function getActionPatch(key: string, save: Record<string, unknown>): Record<string, unknown> {
  const merit = (save.meritPoints as number) ?? 0;
  const favor = (save.bossFavor as number) ?? 50;
  const moral = (save.moralValue as number) ?? 80;
  const risk  = (save.inspectionRisk as number) ?? 20;
  const polCap= (save.politicalCapital as number) ?? 0;
  const gdp   = (save.cityGdp as number) ?? 50;
  const biz   = (save.cityBusiness as number) ?? 50;
  switch (key) {
    case 'rival_promotion': return { bossFavor: Math.min(100, favor + 5), meritPoints: merit + 100 };
    case 'rival_scandal':   return { politicalCapital: polCap + 3, meritPoints: merit + 80 };
    case 'rival_faction':   return { meritPoints: merit + 120 };
    case 'rival_visit':     return { bossFavor: Math.min(100, favor + 8), meritPoints: merit + 60 };
    case 'local_unrest':    return { moralValue: Math.min(100, moral + 3), meritPoints: merit + 150 };
    case 'local_economy':   return { meritPoints: merit + 100 };
    case 'local_corrupt':   return { moralValue: Math.min(100, moral + 5), inspectionRisk: Math.max(0, risk - 10), meritPoints: merit + 200 };
    case 'local_election':  return { meritPoints: merit + 80 };
    case 'intl_policy':     return { cityGdp: Math.min(100, gdp + 2), meritPoints: merit + 100 };
    case 'intl_trade':      return { meritPoints: merit + 80 };
    case 'intl_investment': return { cityBusiness: Math.min(100, biz + 3), meritPoints: merit + 120 };
    default: return { meritPoints: merit + 50 };
  }
}

function RiskBadge({ risk }: { risk: string }) {
  const color = risk === '高' ? '#C62828' : risk === '中' ? '#E65100' : '#2E7D32';
  const bg    = risk === '高' ? '#FFEBEE' : risk === '中' ? '#FBE9E7' : '#E8F5E9';
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
      <Text style={{ color, fontSize: 10, fontWeight: '700' }}>风险 {risk}</Text>
    </View>
  );
}

export default function IntelligenceBriefingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [loading, setLoading] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useFocusEffect(useCallback(() => { setMsg(null); }, []));

  if (!save) return null;
  if (save.rankLevel < 11) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' }}>需达11级方可订阅内参</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>特供情报系统仅向省部级以上官员开放，当前职级不足。</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const theme       = getRankThemeWithLine(save.rankLevel, save.careerPath ?? '');
  const gameDays    = save.gameDays ?? 0;
  const cooldowns   = (save.careerPathCooldowns ?? {}) as Record<string, number>;
  const currentMonth= Math.floor(gameDays / 30);
  const briefings   = getMonthlyBriefing(gameDays);

  function isUsed(riskKey: string) {
    return (cooldowns[`intel_${riskKey}`] ?? -999) >= currentMonth * 30 - 30;
  }

  async function handleUse(item: IntelItem) {
    if (!save) return;
    if (isUsed(item.riskKey)) return;
    setLoading(item.key);
    const patch = getActionPatch(item.key, save as unknown as Record<string, unknown>);
    const newGameDays = gameDays + 30;
    await updateGameSave({
      ...patch,
      gameDays: newGameDays,
      careerPathCooldowns: { ...cooldowns, [`intel_${item.riskKey}`]: gameDays },
    } as Parameters<typeof updateGameSave>[0]);
    setMsg({ text: `✅ 已根据情报布局，${item.effect}`, ok: true });
    setLoading(null);
  }

  const PRIMARY = theme.primary ?? '#1B2A4A';

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4FA' }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 }}>特供情报内参</Text>
          <View style={{ marginLeft: 8, backgroundColor: '#FFD700', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#1A1A1A', fontSize: 10, fontWeight: '800' }}>限11级+</Text>
          </View>
        </View>
        <Text style={{ color: '#8ab0d8', fontSize: 11 }}>
          第 {currentMonth + 1} 期内参 · 每月更新 · 据此提前布局规避风险
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#E8F5E9' : '#FFEBEE', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: msg.ok ? '#A5D6A7' : '#FFCDD2' }}>
            <Text style={{ fontSize: 12, color: msg.ok ? '#2E7D32' : '#C62828', fontWeight: '700' }}>{msg.text}</Text>
          </View>
        )}

        {/* ── 竞争对手动向 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#DCEEFF', overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#1565C0', paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>📈 竞争对手动向</Text>
          </View>
          <View style={{ padding: 14 }}>
            {briefings.slice(0, 1).map(item => (
              <IntelCard key={item.key} item={item} used={isUsed(item.riskKey)} loading={loading === item.key} onUse={() => handleUse(item)} />
            ))}
          </View>
        </View>

        {/* ── 地方隐患 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#FFDCC0', overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#E65100', paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>🚨 地方隐患预警</Text>
          </View>
          <View style={{ padding: 14 }}>
            {briefings.slice(1, 2).map(item => (
              <IntelCard key={item.key} item={item} used={isUsed(item.riskKey)} loading={loading === item.key} onUse={() => handleUse(item)} />
            ))}
          </View>
        </View>

        {/* ── 国际风险 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#C8E6C9', overflow: 'hidden' }}>
          <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>🌐 国际风险分析</Text>
          </View>
          <View style={{ padding: 14 }}>
            {briefings.slice(2, 3).map(item => (
              <IntelCard key={item.key} item={item} used={isUsed(item.riskKey)} loading={loading === item.key} onUse={() => handleUse(item)} />
            ))}
          </View>
        </View>

        {/* ── 说明 ── */}
        <View style={{ backgroundColor: '#E8EAF6', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#9FA8DA' }}>
          <Text style={{ fontSize: 11, color: '#283593', lineHeight: 18 }}>
            💡 内参每月更新，每期可对3类情报各采取1次行动。根据情报提前布局可获得政绩、好感度、廉洁度等多维提升，错过则失效至下期。
          </Text>
        </View>

        <View style={{ height: insets.bottom + 8 }} />
      </ScrollView>
    </View>
  );
}

function IntelCard({ item, used, loading, onUse }: { item: IntelItem; used: boolean; loading: boolean; onUse: () => void }) {
  return (
    <View style={{ backgroundColor: used ? '#F9F9F9' : '#FAFEFF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: used ? '#EEEEEE' : '#C8E3FF' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
        <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: used ? '#aaa' : '#222' }}>{item.title}</Text>
        <RiskBadge risk={item.risk} />
      </View>
      <Text style={{ fontSize: 11, color: '#666', marginBottom: 8, lineHeight: 17 }}>效益：{item.effect}</Text>
      <Pressable
        onPress={onUse}
        disabled={used || loading}
        style={{
          backgroundColor: used ? '#f0f0f0' : '#1565C0',
          borderRadius: 8, paddingVertical: 8, alignItems: 'center',
        }}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={{ color: used ? '#aaa' : '#fff', fontSize: 12, fontWeight: '700' }}>
            {used ? '✓ 本期已采取行动' : '📌 根据情报布局'}
          </Text>
        )}
      </Pressable>
    </View>
  );
}
