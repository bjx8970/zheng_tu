// 国家中枢页面 — rank15（执政党主席/联邦总统/枢武府主席）专属
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { formatMoney } from '@/types/game';
import centralActionsData from '@/config/central-actions.json';

// 国家中枢权力行动
interface CentralAction {
  id: string;
  icon: string;
  category: string;
  title: string;
  desc: string;
  cost: number;
  meritReward: number;
  effects: { label: string; delta: number; key: string }[];
  cooldownDays: number;
}

const CENTRAL_ACTIONS: CentralAction[] = centralActionsData.actions as CentralAction[];
const CATEGORY_COLORS: Record<string, string> = centralActionsData.categoryColors;

export default function NationalCenterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [actionDays, setActionDays] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState('联邦政务院');

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#1D3B5E" /></View>;
  }
  if (save.rankLevel < 15) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#0D1F35' }}>
        <Text style={{ fontSize: 36, marginBottom: 14 }}>🏛️</Text>
        <Text style={{ fontSize: 15, color: '#a0b4cc', textAlign: 'center' }}>
          晋升至联邦总统/执政党主席（级别15）后可访问国家中枢
        </Text>
      </View>
    );
  }

  const categories = [...new Set(CENTRAL_ACTIONS.map(a => a.category))];
  const filtered = CENTRAL_ACTIONS.filter(a => a.category === activeCategory);

  const handleAction = async (action: CentralAction) => {
    if (acting) return;
    const lastDay = actionDays[action.id] ?? 0;
    if (save.gameDays - lastDay < action.cooldownDays) {
      const remain = action.cooldownDays - (save.gameDays - lastDay);
      setResult(`⏳ ${action.title}冷却中，还需 ${remain} 天`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    if (action.cost > 0 && save.fundBalance < action.cost) {
      setResult(`⚠️ 专项经费不足，需 ¥${formatMoney(action.cost)}万`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);

    const patch: Record<string, number> = {
      meritPoints: save.meritPoints + action.meritReward,
      fundBalance: save.fundBalance - action.cost,
    };
    action.effects.forEach(e => {
      if (e.key === 'meritPoints') { patch.meritPoints = (patch.meritPoints ?? save.meritPoints) + e.delta; return; }
      const cur = (save as unknown as Record<string, number>)[e.key] ?? 0;
      patch[e.key] = Math.min(100, cur + e.delta);
    });
    try {
      await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
      setActionDays(prev => ({ ...prev, [action.id]: save.gameDays }));
      const effectStr = action.effects.map(e => `${e.label}+${e.delta}`).join(' ');
      const successMsg = `✅ ${action.title}完成 · 政绩+${action.meritReward} · ${effectStr}`;
      await saveResult('natCenter_' + action.id, { ok: true, desc: successMsg, day: save.gameDays });
      setResult(successMsg);
      setTimeout(() => setResult(''), 4000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1F35' }}>
      <StatusBar style="light" backgroundColor="#060F1A" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#060F1A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.back()}>
          <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(200,220,255,0.4)', fontSize: 9, letterSpacing: 3 }}>执政党中央 · 国家最高权力机构</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🏛️ 国家中枢</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: 'rgba(200,220,255,0.4)', fontSize: 9 }}>{save.rankName}</Text>
          <Text style={{ color: '#FFD700', fontWeight: '600', fontSize: 12 }}>{save.playerName}</Text>
        </View>
      </View>

      {/* 综合指标 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#0D1F35', paddingVertical: 10, paddingHorizontal: 14, gap: 8 }}>
        {[
          { label: 'GDP', value: save.cityGdp, color: '#5BD8FF' },
          { label: '民生', value: save.cityLivelihood, color: '#4CAF50' },
          { label: '生态', value: save.cityEcology, color: '#66BB6A' },
          { label: '营商', value: save.cityBusiness, color: '#FFD700' },
          { label: '安全', value: save.securityIndex, color: '#FF7043' },
        ].map(item => (
          <View key={item.label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ color: 'rgba(200,220,255,0.5)', fontSize: 8 }}>{item.label}</Text>
            <Text style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>{item.value.toFixed(0)}</Text>
          </View>
        ))}
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1.5, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(200,220,255,0.5)', fontSize: 8 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 11 }}>¥{formatMoney(save.fundBalance)}万</Text>
        </View>
      </View>

      {/* 分类Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: '#111D2C', flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}>
        {categories.map(cat => (
          <Pressable
            key={cat}
            onPress={() => setActiveCategory(cat)}
            style={{
              paddingHorizontal: 12, paddingVertical: 6,
              backgroundColor: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? '#2B4B6F') : 'transparent',
              borderWidth: 1,
              borderColor: activeCategory === cat ? (CATEGORY_COLORS[cat] ?? '#2B4B6F') : 'rgba(200,220,255,0.2)',
            }}
          >
            <Text style={{ fontSize: 11, color: activeCategory === cat ? '#fff' : 'rgba(200,220,255,0.6)', fontWeight: activeCategory === cat ? '700' : '400' }}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 14, gap: 10 }}>
          {filtered.map(action => {
            const lastDay = actionDays[action.id] ?? 0;
            const onCooldown = save.gameDays - lastDay < action.cooldownDays;
            const canAfford = action.cost === 0 || save.fundBalance >= action.cost;
            const canAct = !onCooldown && canAfford;
            const remain = action.cooldownDays - (save.gameDays - lastDay);

            return (
              <View key={action.id} style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <View style={{ padding: 14, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>{action.title}</Text>
                        <View style={{ backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#FFD700' }}>政绩 +{action.meritReward}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: 'rgba(200,220,255,0.7)', lineHeight: 16, marginTop: 3 }}>{action.desc}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                    {action.effects.map(e => (
                      <View key={e.key} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: 'rgba(200,220,255,0.8)' }}>{e.label} +{e.delta}</Text>
                      </View>
                    ))}
                    {action.cost > 0 && (
                      <View style={{ backgroundColor: 'rgba(255,215,0,0.1)', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#FFD700' }}>¥{formatMoney(action.cost)}万</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: 'rgba(200,220,255,0.5)' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleAction(action)}
                  disabled={!canAct || acting}
                  style={{
                    backgroundColor: canAct
                      ? (CATEGORY_COLORS[action.category] ?? '#2B4B6F')
                      : 'rgba(255,255,255,0.08)',
                    paddingVertical: 11, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: canAct ? '#fff' : 'rgba(200,220,255,0.4)', fontWeight: '700', fontSize: 12 }}>
                    {acting ? '执行中…'
                      : onCooldown ? `⏳ 冷却中（剩余 ${remain} 天）`
                      : !canAfford ? '⚠️ 经费不足'
                      : `▶ 执行：${action.title}`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: 'rgba(6,15,26,0.95)', padding: 12, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)' }}>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
