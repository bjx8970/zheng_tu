// 五年规划专项提案（行政线专属）
// 机制：每届1个专项，通过后同类项目自动加政绩，周期5年
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// 规划选题类型
interface PlanTopic {
  key: string;
  title: string;
  desc: string;
  icon: string;
  type: 'gdp' | 'livelihood' | 'ecology' | 'business';
  minRank: number;
  politicalCost: number;
  basePassRate: number;
  // 通过后：同类项目建设政绩自动+X%加成（记录到planProjectBonus中）
  bonusPct: number;
  // 通过后一次性政绩奖励
  meritReward: number;
}

const PLAN_TOPICS: PlanTopic[] = [
  {
    key: 'plan_economy',
    title: '经济高质量发展五年规划',
    desc: '制定并推动大会审议通过以GDP增长为核心的五年经济发展规划，确立经济优先的施政方向，同类经济类项目政绩额外加成。',
    icon: '📈',
    type: 'gdp',
    minRank: 7,
    politicalCost: 5,
    basePassRate: 0.60,
    bonusPct: 30,
    meritReward: 150,
  },
  {
    key: 'plan_livelihood',
    title: '民生保障与共同富裕五年规划',
    desc: '以民生改善为核心导向制定五年规划，推动教育、医疗、住房等领域全面提升，同类民生项目政绩额外加成。',
    icon: '🏥',
    type: 'livelihood',
    minRank: 6,
    politicalCost: 4,
    basePassRate: 0.62,
    bonusPct: 28,
    meritReward: 130,
  },
  {
    key: 'plan_ecology',
    title: '生态文明建设五年规划',
    desc: '将绿色发展和生态文明作为五年规划核心，系统推进生态修复与绿色低碳转型，同类生态项目政绩额外加成。',
    icon: '🌿',
    type: 'ecology',
    minRank: 5,
    politicalCost: 4,
    basePassRate: 0.65,
    bonusPct: 28,
    meritReward: 120,
  },
  {
    key: 'plan_business',
    title: '营商环境优化五年规划',
    desc: '以营商环境全面提升为主线规划五年施政方向，系统破解行政壁垒，打造一流营商示范区，同类营商项目政绩额外加成。',
    icon: '🏗️',
    type: 'business',
    minRank: 6,
    politicalCost: 5,
    basePassRate: 0.58,
    bonusPct: 30,
    meritReward: 140,
  },
];

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  gdp:        { label: 'GDP类', color: '#1976D2' },
  livelihood: { label: '民生类', color: '#388E3C' },
  ecology:    { label: '生态类', color: '#00796B' },
  business:   { label: '营商类', color: '#F57C00' },
};

export default function FiveYearPlanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [selected, setSelected] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!save) return null;

  // 仅行政线可用
  if (save.careerPath !== 'government') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F4F6F9' }}>
        <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: 60, left: 16 }}>
          <Text style={{ fontSize: 22, color: '#333' }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>五年规划为行政线专属功能</Text>
        <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 }}>当前线路：{save.careerPath}</Text>
      </View>
    );
  }

  const gameDays    = save.gameDays ?? 0;
  const rankLevel   = save.rankLevel ?? 1;
  const polCap      = save.politicalCapital ?? 0;
  const tenureYears = save.tenureYears ?? 0;

  // 当届届次（每5年一届）
  const currentSession = Math.floor(gameDays / 1825);

  // 本届是否已提交
  const hasPlanThisSession = save.fiveYearPlanYear === currentSession;
  const planPassed         = save.fiveYearPlanPassed ?? false;
  const planTopic          = save.fiveYearPlanTopic ?? '';

  // 已解锁的规划加成
  let planProjectBonus: Record<string, number> = {};
  try { planProjectBonus = JSON.parse(save.planProjectBonus ?? '{}') as Record<string, number>; } catch { planProjectBonus = {}; }

  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4500); }

  async function handleSubmit() {
    if (!save) return;
    if (!selected) { showMsg('请先选择规划方向', false); return; }
    if (hasPlanThisSession) { showMsg('本届任期已提交五年规划，下届方可重新选择', false); return; }
    const topic = PLAN_TOPICS.find(t => t.key === selected);
    if (!topic) return;
    if (rankLevel < topic.minRank) { showMsg(`需达到职级 ${topic.minRank} 才可提交此规划`, false); return; }
    if (polCap < topic.politicalCost) { showMsg(`政治资本不足（需 ${topic.politicalCost}，当前 ${polCap}）`, false); return; }
    setLoading(true);

    // 通过率：基础 + 好感度 + 能力值 + 政绩
    const favorBonus   = ((save.bossFavor ?? 50) - 50) * 0.003;
    const abilityBonus = Math.min(0.15, (Math.min(50, (save.meritPoints ?? 0) / 500) - 50) * 0.003);
    const meritBonus   = Math.min(0.10, (save.meritPoints ?? 0) / 10000 * 0.05);
    const passRate     = Math.min(0.90, topic.basePassRate + favorBonus + abilityBonus + meritBonus);
    const passed       = Math.random() < passRate;
    const newGameDays  = gameDays + 60;

    const newBonus = passed
      ? { ...planProjectBonus, [topic.type]: (planProjectBonus[topic.type] ?? 0) + topic.bonusPct }
      : planProjectBonus;

    await updateGameSave({
      politicalCapital: Math.max(0, polCap - topic.politicalCost),
      fiveYearPlanYear: currentSession,
      fiveYearPlanTopic: topic.key,
      fiveYearPlanPassed: passed,
      planProjectBonus: JSON.stringify(newBonus),
      meritPoints: (save.meritPoints ?? 0) + (passed ? topic.meritReward : 25),
      gameDays: newGameDays,
    } as Parameters<typeof updateGameSave>[0]);

    if (passed) {
      const _fy1=`🎉 五年规划获批通过！政绩 +${topic.meritReward}，未来${TYPE_LABELS[topic.type].label}项目政绩+${topic.bonusPct}%`; void saveResult('fiveYear_'+topic.key, {ok:true,desc:_fy1,day:save.gameDays??0}); showMsg(_fy1);
    } else {
      const _fy2=`❌ 规划审议未通过（通过率${Math.round(passRate * 100)}%），政绩 +25。建议提升好感度后重新提交。`; void saveResult('fiveYear_'+topic.key, {ok:false,desc:_fy2,day:save.gameDays??0}); showMsg(_fy2, false);
    }
    setSelected(null);
    setLoading(false);
  }

  const PRIMARY = '#1B4332';

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F8F4' }}>
      {/* 页头 */}
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#9bc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#8abca0', fontSize: 10, letterSpacing: 2 }}>行政线专属 · 五年规划</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>五年规划专项提案</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#8abca0', fontSize: 10 }}>政治资本</Text>
          <Text style={{ color: '#7DFFB3', fontSize: 16, fontWeight: '800' }}>{polCap}</Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>
        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: msg.ok ? '#2a7a3b' : '#e53935', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 12, color: msg.ok ? '#2a7a3b' : '#c62828', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 届次状态卡 */}
        <View style={{ backgroundColor: PRIMARY, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: '#8abca0', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>第 {currentSession + 1} 届任期 · 五年规划</Text>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: '#8abca0', fontSize: 10 }}>当届状态</Text>
              <Text style={{ color: hasPlanThisSession ? (planPassed ? '#7DFFB3' : '#FF9E80') : '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                {hasPlanThisSession ? (planPassed ? '✅ 已通过' : '❌ 未通过') : '未提交'}
              </Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: '#8abca0', fontSize: 10 }}>累计届次</Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>{currentSession + 1}届</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: '#8abca0', fontSize: 10 }}>政绩加成条数</Text>
              <Text style={{ color: '#7DFFB3', fontSize: 13, fontWeight: '700', marginTop: 2 }}>{Object.keys(planProjectBonus).length}条</Text>
            </View>
          </View>
        </View>

        {/* 本届已通过的规划展示 */}
        {hasPlanThisSession && planPassed && (
          <View style={{ backgroundColor: '#D4EDDA', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#4CAF50' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B5E20', marginBottom: 4 }}>
              🎉 本届五年规划已通过：【{PLAN_TOPICS.find(t => t.key === planTopic)?.title ?? planTopic}】
            </Text>
            <Text style={{ fontSize: 11, color: '#2E7D32', lineHeight: 16 }}>
              {PLAN_TOPICS.find(t => t.key === planTopic)?.desc}
            </Text>
          </View>
        )}

        {/* 已解锁规划加成 */}
        {Object.keys(planProjectBonus).length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>🎯 规划项目加成（持续生效）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(planProjectBonus).map(([type, pct]) => {
                const info = TYPE_LABELS[type];
                if (!info) return null;
                return (
                  <View key={type} style={{ backgroundColor: info.color + '15', borderWidth: 1, borderColor: info.color + '40', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, color: info.color, fontWeight: '700' }}>{info.label}项目</Text>
                    <Text style={{ fontSize: 14, color: info.color, fontWeight: '800', marginTop: 2 }}>政绩 +{pct}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 规划选题 */}
        {(!hasPlanThisSession || !planPassed) && (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>
              📋 选择本届规划方向{hasPlanThisSession && !planPassed ? '（上届未通过，可重新提交）' : ''}
            </Text>
            {PLAN_TOPICS.map(topic => {
              const isSelected  = selected === topic.key;
              const isAvailable = rankLevel >= topic.minRank;
              const typeInfo    = TYPE_LABELS[topic.type];
              const passRate    = Math.min(0.90, topic.basePassRate +
                ((save.bossFavor ?? 50) - 50) * 0.003 +
                Math.min(0.15, (Math.min(50, (save.meritPoints ?? 0) / 500) - 50) * 0.003));
              return (
                <Pressable
                  key={topic.key}
                  onPress={() => isAvailable ? setSelected(isSelected ? null : topic.key) : undefined}
                  style={{
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? PRIMARY : '#e0e0e0',
                    borderRadius: 10, padding: 12, marginBottom: 10,
                    backgroundColor: isSelected ? '#F0FFF4' : '#fafafa',
                    opacity: isAvailable ? 1 : 0.5,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ fontSize: 24, marginTop: 2 }}>{topic.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{topic.title}</Text>
                        <View style={{ backgroundColor: typeInfo.color + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                          <Text style={{ fontSize: 9, color: typeInfo.color, fontWeight: '700' }}>{typeInfo.label}</Text>
                        </View>
                        {!isAvailable && <View style={{ backgroundColor: '#888', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                          <Text style={{ fontSize: 9, color: '#fff' }}>需职级{topic.minRank}</Text>
                        </View>}
                      </View>
                      <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>{topic.desc}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, color: '#E65100' }}>政治资本 -{topic.politicalCost}</Text>
                        </View>
                        <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, color: '#2E7D32' }}>通过+{topic.meritReward}政绩</Text>
                        </View>
                        <View style={{ backgroundColor: typeInfo.color + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, color: typeInfo.color }}>同类项目+{topic.bonusPct}%政绩</Text>
                        </View>
                        <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                          <Text style={{ fontSize: 10, color: '#1565C0' }}>通过率约{Math.round(passRate * 100)}%</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 提交按钮 */}
        {!hasPlanThisSession || !planPassed ? (
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={!selected || loading}
            style={{ backgroundColor: selected ? PRIMARY : '#ccc', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 20 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 }}>
              {loading ? '提案中...' : selected ? '📋 提交五年规划提案' : '请先选择规划方向'}
            </Text>
          </Pressable>
        ) : (
          <View style={{ backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ fontSize: 13, color: '#888' }}>本届规划已提交，下届任期可重新规划</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
