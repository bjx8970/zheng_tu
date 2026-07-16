/**
 * 团派线深度玩法 —— 入口文件（仅 JSX 框架）
 * 行动数据 → src/lib/deepActions/leagueActions.ts
 * 判断逻辑 → src/lib/deepActions/useDeepAction.ts
 */
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import { useDeepAction, fmtGovFund } from '@/lib/deepActions/useDeepAction';
import {
  LEAGUE_ACTIONS, LEAGUE_CATEGORIES, LEAGUE_CAT_ICONS,
  type LeagueCategory,
} from '@/lib/deepActions/leagueActions';

export default function LeagueDeep() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeCategory, setActiveCategory] = useState<LeagueCategory>('青年服务');

  const {
    save, acting, savedResults, balance,
    rank, actionCost, isCool, cdLeft, handleAction,
  } = useDeepAction({ cooldownsField: 'leagueDeepCooldowns', resultsField: 'leagueDeepResults' });

  if (!save) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1' }}><ActivityIndicator testID="activity-indicator" size="large" color="#C82829" /></View>;

  const theme      = getRankThemeWithLine(rank, '团派线');
  const catActions = LEAGUE_ACTIONS.filter(a => a.category === activeCategory);

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="dark" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: theme.primary, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 }}>🌱 团派深度玩法</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 11 }}>城市治理经费 {fmtGovFund(balance)}</Text>
          </View>
        </View>
        {/* 分类 Tab */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {LEAGUE_CATEGORIES.map(cat => (
            <Pressable key={cat} onPress={() => setActiveCategory(cat)}
              style={{ flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
                backgroundColor: activeCategory === cat ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)' }}>
              <Text style={{ fontSize: 13 }}>{LEAGUE_CAT_ICONS[cat]}</Text>
              <Text style={{ color: '#fff', fontSize: 9, marginTop: 2, fontWeight: activeCategory === cat ? '700' : '400' }}>{cat}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}>
        {catActions.map(action => {
          const cost       = actionCost(action);
          const cool       = isCool(action.key, action.cooldownDays, action.once);
          const canAfford  = balance >= cost;
          const lastResult = savedResults[action.key];
          return (
            <View key={action.key} style={{ backgroundColor: theme.cardBg, borderRadius: 14, borderWidth: 1, borderColor: theme.cardBorder, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.labelText }}>{action.title}</Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>{action.subtitle}</Text>
                  <Text style={{ fontSize: 11, color: theme.labelText, marginTop: 4, lineHeight: 17 }}>{action.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                <View style={{ backgroundColor: '#FEF3C7', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '700' }}>🏛️ 城治经费 {fmtGovFund(cost)}</Text>
                </View>
                <View style={{ backgroundColor: '#ECFDF5', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, color: '#065F46' }}>成功率 {action.successRate}%</Text>
                </View>
                <View style={{ backgroundColor: '#EFF6FF', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 10, color: '#1E40AF' }}>政绩+{action.successOutcome.merit}</Text>
                </View>
                {(action.successOutcome.lineKpi ?? 0) > 0 && (
                  <View style={{ backgroundColor: '#F3E8FF', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#6B21A8' }}>积分+{action.successOutcome.lineKpi}</Text>
                  </View>
                )}
                {cool && (
                  <View style={{ backgroundColor: '#FEE2E2', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#B91C1C' }}>冷却 {cdLeft(action.key, action.cooldownDays, action.once)}天</Text>
                  </View>
                )}
              </View>
              {lastResult && (
                <View style={{ backgroundColor: lastResult.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: lastResult.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: lastResult.ok ? '#065F46' : '#B91C1C', marginBottom: 3 }}>
                    {lastResult.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{lastResult.day}天
                  </Text>
                  <Text style={{ fontSize: 11, color: lastResult.ok ? '#047857' : '#DC2626', lineHeight: 16 }}>{lastResult.desc}</Text>
                </View>
              )}
              <Pressable
                onPress={() => handleAction(action)}
                disabled={!!acting || cool}
                style={{ backgroundColor: cool ? '#9CA3AF' : canAfford ? theme.primary : '#D1D5DB', borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
              >
                {acting === action.key
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                      {cool ? `⏳ 冷却 ${cdLeft(action.key, action.cooldownDays, action.once)}天` : canAfford ? '执行行动' : '城治经费不足'}
                    </Text>}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
