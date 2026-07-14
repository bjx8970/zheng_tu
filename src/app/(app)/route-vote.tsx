/**
 * 路线博弈 — 全国路线方向投票（行政线 15级）
 * 每5年举行一次，玩家执政成绩影响民意，得票最多方向提供下一周期全国性加成
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';
import { getRankTheme } from '@/lib/rankTheme';

type RouteKey = 'economy' | 'balanced' | 'ecology' | 'security';

interface RouteOption {
  key: RouteKey;
  label: string;
  icon: string;
  desc: string;
  bonusDesc: string;
  color: string;
  basePct: number; // 基础民意支持率（%）
  scoreFactors: { field: keyof import('@/types/game').PlayerSave; weight: number }[];
  bonus: { merit?: number; moral?: number; ability?: number; cityGovFund?: number; politicalCapital?: number };
}

const ROUTES: RouteOption[] = [
  {
    key: 'economy',
    label: '经济型',
    icon: '📈',
    desc: '以GDP增长为核心，扩大招商引资、拉动基础设施投资',
    bonusDesc: '每季度政绩+15，专项经费+80万',
    color: '#D97706',
    basePct: 25,
    scoreFactors: [{ field: 'meritPoints', weight: 0.8 }, { field: 'cityGdp', weight: 0.6 }],
    bonus: { merit: 15, cityGovFund: 80 },
  },
  {
    key: 'balanced',
    label: '均衡型',
    icon: '⚖️',
    desc: '兼顾经济发展与社会稳定，稳健推进各领域协调发展',
    bonusDesc: '每季度政绩+10，廉洁+5，能力+3',
    color: '#2563EB',
    basePct: 30,
    scoreFactors: [{ field: 'moralValue', weight: 0.5 }, { field: 'abilityValue', weight: 0.5 }, { field: 'meritPoints', weight: 0.3 }],
    bonus: { merit: 10, moral: 5, ability: 3 },
  },
  {
    key: 'ecology',
    label: '生态型',
    icon: '🌿',
    desc: '绿色发展优先，强调生态文明建设与可持续发展理念',
    bonusDesc: '每季度廉洁+10，政治资本+2，政绩+8',
    color: '#059669',
    basePct: 22,
    scoreFactors: [{ field: 'moralValue', weight: 0.9 }, { field: 'reformFaction', weight: 0.5 }],
    bonus: { moral: 10, politicalCapital: 2, merit: 8 },
  },
  {
    key: 'security',
    label: '安全型',
    icon: '🛡️',
    desc: '维护社会稳定与国家安全，强化治理体系和风险防控',
    bonusDesc: '每季度政治资本+3，能力+8，政绩+12',
    color: '#7C3AED',
    basePct: 23,
    scoreFactors: [{ field: 'abilityValue', weight: 0.8 }, { field: 'moralValue', weight: 0.6 }],
    bonus: { politicalCapital: 3, ability: 8, merit: 12 },
  },
];

const COOLDOWN_DAYS = 1825; // 5年

function calcSupport(route: RouteOption, save: import('@/types/game').PlayerSave): number {
  let bonus = 0;
  for (const f of route.scoreFactors) {
    const val = (save[f.field] as number | undefined) ?? 0;
    bonus += (val / 100) * f.weight * 20;
  }
  return Math.min(60, Math.max(8, Math.round(route.basePct + bonus)));
}

function normalizeSupports(raw: Record<RouteKey, number>): Record<RouteKey, number> {
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const result = {} as Record<RouteKey, number>;
  for (const k of Object.keys(raw) as RouteKey[]) {
    result[k] = Math.round((raw[k] / total) * 100);
  }
  return result;
}

export default function RouteVotePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);

  useFocusEffect(useCallback(() => { setMsg(''); }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const theme = getRankTheme(save.rankLevel ?? 1);

  // 权限检查
  if (save.careerPathLine !== '行政线' || (save.rankLevel ?? 0) < 15) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: theme.pageBg }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: theme.valueText, textAlign: 'center' }}>此功能仅限行政线15级（正国级）开放</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const gameDays = save.gameDays ?? 0;
  const lastVoteDay = save.routeVoteDay ?? 0;
  const cooldownLeft = lastVoteDay > 0 ? Math.max(0, lastVoteDay + COOLDOWN_DAYS - gameDays) : 0;
  const canVote = cooldownLeft === 0;

  const rawSupports: Record<RouteKey, number> = {
    economy:  calcSupport(ROUTES[0], save),
    balanced: calcSupport(ROUTES[1], save),
    ecology:  calcSupport(ROUTES[2], save),
    security: calcSupport(ROUTES[3], save),
  };
  const supports = normalizeSupports(rawSupports);
  const winnerKey = (Object.keys(supports) as RouteKey[]).reduce((a, b) => supports[a] >= supports[b] ? a : b);
  const winner = ROUTES.find(r => r.key === winnerKey)!;
  const currentBonus = ROUTES.find(r => r.key === (save.routeVoteResult as RouteKey));

  async function handleVote() {
    if (!save || !canVote || acting) return;
    setActing(true);
    try {
      // 胜出路线立即给予一次性政治资本奖励
      const bonusBoost = winner.bonus;
      const newSave = await updateSave(save.id, {
        routeVoteResult: winnerKey,
        routeVoteDay: gameDays,
        politicalCapital: (save.politicalCapital ?? 0) + (bonusBoost.politicalCapital ?? 0) + 3,
        meritPoints: (save.meritPoints ?? 0) + (bonusBoost.merit ?? 0),
        moralValue: Math.min(100, (save.moralValue ?? 0) + (bonusBoost.moral ?? 0)),
        abilityValue: Math.min(100, (save.abilityValue ?? 0) + (bonusBoost.ability ?? 0)),
        cityGovFund: (save.cityGovFund ?? 0) + (bonusBoost.cityGovFund ?? 0),
      });
      if (newSave) {
        updateGameSave(newSave);
        setMsgOk(true);
        setMsg(`「${winner.label}」方向以 ${supports[winnerKey]}% 民意高票胜出！下一周期：${winner.bonusDesc}`);
      } else {
        setMsgOk(false);
        setMsg('网络异常，请稍后重试');
      }
    } catch {
      setMsgOk(false);
      setMsg('操作失败，请稍后重试');
    } finally {
      setActing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: theme.primary, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>全国路线博弈</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>每5年一次 · 行政线正国级</Text>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

        {/* 当前生效路线 */}
        {currentBonus && (
          <View style={{ backgroundColor: currentBonus.color + '18', borderWidth: 1.5, borderColor: currentBonus.color + '50', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 11, color: currentBonus.color, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>当前生效路线</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 28 }}>{currentBonus.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: theme.valueText }}>{currentBonus.label}</Text>
                <Text style={{ fontSize: 12, color: theme.mutedText, marginTop: 2 }}>{currentBonus.bonusDesc}</Text>
              </View>
            </View>
          </View>
        )}

        {/* 民意支持率预测 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 12, color: theme.valueText, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>当前民意测算</Text>
          {ROUTES.map(r => (
            <View key={r.key} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>{r.icon}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: theme.valueText }}>{r.label}</Text>
                  {r.key === winnerKey && <View style={{ backgroundColor: r.color, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>领先</Text></View>}
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: r.color }}>{supports[r.key]}%</Text>
              </View>
              <View style={{ backgroundColor: theme.progressBg, borderRadius: 4, height: 6, overflow: 'hidden' }}>
                <View style={{ width: `${supports[r.key]}%`, height: 6, backgroundColor: r.color, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>

        {/* 路线详情 */}
        {ROUTES.map(r => (
          <View key={r.key} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: r.key === winnerKey ? r.color + '70' : theme.cardBorder, borderRadius: 12, padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
              <Text style={{ fontSize: 26 }}>{r.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: r.color }}>{r.label}</Text>
                  <View style={{ backgroundColor: r.color + '20', borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: r.color, fontSize: 10, fontWeight: '700' }}>民意 {supports[r.key]}%</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 18 }}>{r.desc}</Text>
                <View style={{ marginTop: 8, backgroundColor: r.color + '12', borderRadius: 6, padding: 8 }}>
                  <Text style={{ fontSize: 11, color: r.color, fontWeight: '600' }}>胜出加成：{r.bonusDesc}</Text>
                </View>
              </View>
            </View>
          </View>
        ))}

        {/* 冷却 / 操作 */}
        {!canVote ? (
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: theme.mutedText, textAlign: 'center' }}>
              距下次全国路线投票：{Math.ceil(cooldownLeft / 360)} 年 {Math.ceil((cooldownLeft % 360) / 30)} 个月
            </Text>
          </View>
        ) : (
          <>
            {msg ? (
              <View style={{ backgroundColor: msgOk ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: msgOk ? '#86efac' : '#fca5a5', borderRadius: 10, padding: 12 }}>
                <Text style={{ color: msgOk ? '#166534' : '#991b1b', fontSize: 13, lineHeight: 20 }}>{msg}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={handleVote}
              disabled={acting}
              style={{ backgroundColor: winner.color, borderRadius: 12, padding: 16, alignItems: 'center', opacity: acting ? 0.6 : 1 }}
            >
              {acting ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>发起全国路线博弈投票</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 }}>预计「{winner.label}」以 {supports[winnerKey]}% 胜出</Text>
                </>
              )}
            </Pressable>
          </>
        )}
        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
