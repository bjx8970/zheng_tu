// 经济周期波动系统 — 12级+行政线专属
// 繁荣→过热→衰退→复苏4阶段，顺势操作翻倍，逆势减半
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// ── 周期定义（每个阶段约180天）────────────────────────────────────────────────
const CYCLE_PHASES = [
  {
    key: 'boom',
    label: '繁荣期',
    icon: '📈',
    color: '#1565C0',
    bgColor: '#E3F2FD',
    desc: '经济高速增长，税收充盈，投资活跃。此阶段最优策略是加大税收、扩大财政收入，避免过度刺激导致过热。',
    optimalActions: ['收税', '增加财政储备', '引导资本规范'],
    riskyActions:   ['大规模基建', '降税刺激', '大量举债'],
    bonusField: 'cityGdp',
    bonusLabel: 'GDP指数',
  },
  {
    key: 'overheat',
    label: '过热期',
    icon: '🌡️',
    color: '#E65100',
    bgColor: '#FBE9E7',
    desc: '经济泡沫膨胀，通胀压力上升，房产市场虚高。此阶段关键在于主动降温：收紧信贷、提高利率、遏制投机。',
    optimalActions: ['收紧信贷', '调控房价', '打击投机'],
    riskyActions:   ['继续刺激', '大规模举债', '降准降息'],
    bonusField: 'cityBusiness',
    bonusLabel: '商业指数',
  },
  {
    key: 'recession',
    label: '衰退期',
    icon: '📉',
    color: '#B71C1C',
    bgColor: '#FFEBEE',
    desc: '经济增速下滑，失业率上升，企业盈利下降。此阶段需要积极财政政策刺激需求，加大基建投入托底经济。',
    optimalActions: ['扩大基建', '降税让利', '稳就业保企业'],
    riskyActions:   ['紧缩财政', '大幅提税', '压缩支出'],
    bonusField: 'cityLivelihood',
    bonusLabel: '民生指数',
  },
  {
    key: 'recovery',
    label: '复苏期',
    icon: '🌱',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    desc: '经济触底反弹，市场信心恢复。此阶段应把握时机推动结构性改革，优化营商环境，为下一轮繁荣打好基础。',
    optimalActions: ['推动改革', '优化营商环境', '吸引外资'],
    riskyActions:   ['过早紧缩', '拖延改革', '依赖旧模式'],
    bonusField: 'cityEcology',
    bonusLabel: '生态指数',
  },
] as const;

type PhaseKey = typeof CYCLE_PHASES[number]['key'];

// ── 周期操作定义 ─────────────────────────────────────────────────────────────
const PHASE_ACTIONS: Record<PhaseKey, Array<{
  key: string; label: string; icon: string;
  isOptimal: boolean; cost: number; meritBase: number; desc: string;
}>> = {
  boom: [
    { key: 'tax_increase',   label: '加大税收征管',   icon: '💰', isOptimal: true,  cost: 5, meritBase: 200, desc: '繁荣期顺势收税，财政收入翻倍' },
    { key: 'fiscal_reserve', label: '扩充财政储备',   icon: '🏦', isOptimal: true,  cost: 5, meritBase: 150, desc: '为衰退期储备资金，长期战略收益' },
    { key: 'big_stimulus',   label: '大规模刺激投资', icon: '🏗️', isOptimal: false, cost: 6, meritBase: 100, desc: '逆势操作，效益减半且加重过热风险' },
  ],
  overheat: [
    { key: 'credit_tighten', label: '收紧信贷发放',   icon: '🔒', isOptimal: true,  cost: 5, meritBase: 200, desc: '顺势降温，有效压制通胀' },
    { key: 'housing_control',label: '调控房产市场',   icon: '🏠', isOptimal: true,  cost: 6, meritBase: 180, desc: '遏制房价虚高，提升民生满意度' },
    { key: 'more_stimulus',  label: '继续刺激经济',   icon: '💸', isOptimal: false, cost: 5, meritBase: 80,  desc: '逆势推波助澜，增加经济崩盘风险' },
  ],
  recession: [
    { key: 'infra_boost',    label: '扩大基建投资',   icon: '🏗️', isOptimal: true,  cost: 6, meritBase: 250, desc: '顺势托底，就业和GDP双提升' },
    { key: 'tax_cut',        label: '降税让利于民',   icon: '📋', isOptimal: true,  cost: 5, meritBase: 200, desc: '激活市场活力，商业指数快速回升' },
    { key: 'fiscal_cut',     label: '紧缩财政支出',   icon: '✂️', isOptimal: false, cost: 4, meritBase: 60,  desc: '逆势操作，加速经济下滑' },
  ],
  recovery: [
    { key: 'reform_push',    label: '推动结构性改革', icon: '⚙️', isOptimal: true,  cost: 7, meritBase: 300, desc: '顺势改革，为下一轮繁荣奠基' },
    { key: 'biz_optimize',   label: '优化营商环境',   icon: '📊', isOptimal: true,  cost: 5, meritBase: 220, desc: '吸引外资，商业活力大幅提升' },
    { key: 'old_model',      label: '延续旧有模式',   icon: '😴', isOptimal: false, cost: 3, meritBase: 80,  desc: '逆势守旧，错失改革红利' },
  ],
};

export default function EconomicCyclePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [acting, setActing] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { setMsg(null); }, []));

  if (!save) return null;

  if (save.rankLevel < 12 || save.careerPath !== 'government') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' }}>
          {save.careerPath !== 'government' ? '行政线专属功能' : '需达12级方可解锁'}
        </Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          经济周期波动系统需行政线12级（省部级）以上官员方可使用。
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const gameDays  = save.gameDays ?? 0;
  const polCap    = save.politicalCapital ?? 0;
  const cooldowns = (save.careerPathCooldowns ?? {}) as Record<string, number>;
  const merit     = save.meritPoints ?? 0;

  // 当前周期阶段（每180天一个阶段，4个阶段循环）
  const phaseIndex= Math.floor(gameDays / 180) % 4;
  const phase     = CYCLE_PHASES[phaseIndex];
  const actions   = PHASE_ACTIONS[phase.key];
  const daysInPhase    = gameDays % 180;
  const daysLeftPhase  = 180 - daysInPhase;
  const cycleRound     = Math.floor(gameDays / 720) + 1; // 第几轮完整周期

  function isActed(key: string) {
    const lastUse = cooldowns[`cycle_${key}`] ?? -999;
    return lastUse >= gameDays - 180; // 同阶段内只能用一次
  }

  async function handleAction(action: typeof actions[0]) {
    if (!save) return;
    if (acting) return;
    if (polCap < action.cost) { setMsg({ text: `政治资本不足（需 ${action.cost}，当前 ${polCap}）`, ok: false }); return; }
    if (isActed(action.key)) { setMsg({ text: '本阶段内已执行过此操作', ok: false }); return; }

    setActing(action.key);
    const multiplier    = action.isOptimal ? 2.0 : 0.5; // 顺势翻倍，逆势减半
    const actualMerit   = Math.round(action.meritBase * multiplier);
    const newGameDays   = gameDays + 45;
    const fieldKey      = phase.bonusField as string;
    const curField      = (save as unknown as Record<string, number>)[fieldKey] ?? 50;
    const fieldDelta    = action.isOptimal ? 3 : 1;

    await updateGameSave({
      politicalCapital: Math.max(0, polCap - action.cost),
      meritPoints: merit + actualMerit,
      [fieldKey]: Math.min(100, curField + fieldDelta),
      gameDays: newGameDays,
      careerPathCooldowns: { ...cooldowns, [`cycle_${action.key}`]: gameDays },
    } as Parameters<typeof updateGameSave>[0]);

    const tip = action.isOptimal
      ? `✅ 顺势操作！政绩 ×2 = +${actualMerit}，${phase.bonusLabel} +${fieldDelta}`
      : `⚠️ 逆势操作，效益减半。政绩 ×0.5 = +${actualMerit}，${phase.bonusLabel} +${fieldDelta}`;
    await saveResult('econCycle_' + action.key, { ok: action.isOptimal, desc: tip, day: gameDays });
    setMsg({ text: tip, ok: action.isOptimal });
    setActing(null);
  }

  const PRIMARY = '#0D2137';

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F5FF' }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#90CAF9', fontSize: 16, fontWeight: '800', letterSpacing: 1 }}>经济周期波动系统</Text>
          <View style={{ marginLeft: 8, backgroundColor: '#1565C0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>12级+行政线</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={{ color: '#64B5F6', fontSize: 11 }}>第 {cycleRound} 轮周期</Text>
          <Text style={{ color: '#64B5F6', fontSize: 11 }}>政治资本：{polCap}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* ── 当前阶段指示器 ── */}
        <View style={{ backgroundColor: phase.bgColor, borderRadius: 14, borderWidth: 2, borderColor: phase.color, padding: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <Text style={{ fontSize: 32 }}>{phase.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: phase.color }}>{phase.label}</Text>
              <Text style={{ fontSize: 11, color: '#666' }}>剩余 {daysLeftPhase} 天 · 阶段进度 {Math.round(daysInPhase / 1.8)}%</Text>
            </View>
          </View>
          {/* 阶段进度条 */}
          <View style={{ height: 6, backgroundColor: '#e0e0e0', borderRadius: 3, overflow: 'hidden', marginBottom: 10 }}>
            <View style={{ width: `${(daysInPhase / 180) * 100}%`, height: '100%', backgroundColor: phase.color, borderRadius: 3 }} />
          </View>
          <Text style={{ fontSize: 12, color: '#444', lineHeight: 19 }}>{phase.desc}</Text>
        </View>

        {/* ── 4阶段周期示意图 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#CFD8DC', padding: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#333', marginBottom: 10, letterSpacing: 1 }}>🔄 宏观经济周期</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {CYCLE_PHASES.map((p, i) => (
              <View key={p.key} style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 36, height: 36, borderRadius: 18, backgroundColor: i === phaseIndex ? p.color : '#f0f0f0',
                  alignItems: 'center', justifyContent: 'center', marginBottom: 4,
                  borderWidth: i === phaseIndex ? 0 : 1, borderColor: '#ddd',
                }}>
                  <Text style={{ fontSize: 16 }}>{p.icon}</Text>
                </View>
                <Text style={{ fontSize: 9, color: i === phaseIndex ? p.color : '#aaa', fontWeight: i === phaseIndex ? '800' : '400', textAlign: 'center' }}>{p.label}</Text>
                {i < CYCLE_PHASES.length - 1 && (
                  <View style={{ position: 'absolute', right: -8, top: 12, width: 16, height: 2, backgroundColor: '#e0e0e0' }} />
                )}
              </View>
            ))}
          </View>
        </View>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#E8F5E9' : '#FFF3E0', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: msg.ok ? '#A5D6A7' : '#FFB74D' }}>
            <Text style={{ fontSize: 12, color: msg.ok ? '#2E7D32' : '#E65100', fontWeight: '700' }}>{msg.text}</Text>
          </View>
        )}

        {/* ── 本阶段操作 ── */}
        <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#CFD8DC', overflow: 'hidden' }}>
          <View style={{ backgroundColor: phase.color, paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 }}>📌 当前阶段可选操作</Text>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            {actions.map(action => {
              const used      = isActed(action.key);
              const canAfford = polCap >= action.cost;
              const isAct     = acting === action.key;
              const multiplier= action.isOptimal ? 2.0 : 0.5;
              const displayMerit = Math.round(action.meritBase * multiplier);
              return (
                <View key={action.key} style={{
                  backgroundColor: used ? '#fafafa' : action.isOptimal ? '#F3FBF4' : '#FFF8E1',
                  borderRadius: 10, borderWidth: 1,
                  borderColor: used ? '#eee' : action.isOptimal ? '#A5D6A7' : '#FFE082',
                  padding: 12,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 20 }}>{action.icon}</Text>
                    <Text style={{ flex: 1, fontSize: 13, fontWeight: '700', color: used ? '#aaa' : '#222' }}>{action.label}</Text>
                    <View style={{ backgroundColor: action.isOptimal ? '#2E7D32' : '#E65100', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{action.isOptimal ? '✅ 顺势 ×2' : '⚠️ 逆势 ×0.5'}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#555', marginBottom: 6, lineHeight: 17 }}>{action.desc}</Text>
                  {(() => { const r = getResult('econCycle_' + action.key); return r ? (
                    <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 7, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '⚠️ 上次失败'} · 第{r.day}天</Text>
                      <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                    </View>
                  ) : null; })()}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#888' }}>消耗 {action.cost} 政治资本 · 政绩 +{displayMerit}</Text>
                    <Pressable
                      onPress={() => handleAction(action)}
                      disabled={used || !canAfford || !!acting}
                      style={{ backgroundColor: used ? '#e0e0e0' : !canAfford ? '#e0e0e0' : action.isOptimal ? '#2E7D32' : '#F57F17', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                    >
                      {isAct ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: (used || !canAfford) ? '#aaa' : '#fff', fontSize: 11, fontWeight: '700' }}>
                          {used ? '✓ 已执行' : !canAfford ? '资本不足' : '执行'}
                        </Text>
                      )}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 最优策略提示 */}
        <View style={{ backgroundColor: phase.bgColor, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: phase.color + '80' }}>
          <Text style={{ fontSize: 11, color: phase.color, fontWeight: '800', marginBottom: 4 }}>💡 {phase.label}最优策略</Text>
          {phase.optimalActions.map((a, i) => (
            <Text key={i} style={{ fontSize: 11, color: '#444', lineHeight: 18 }}>✅ {a}</Text>
          ))}
          <Text style={{ fontSize: 11, color: '#aaa', marginTop: 6, fontWeight: '700' }}>规避操作：</Text>
          {phase.riskyActions.map((a, i) => (
            <Text key={i} style={{ fontSize: 11, color: '#888', lineHeight: 18 }}>❌ {a}</Text>
          ))}
        </View>

        <View style={{ height: insets.bottom + 8 }} />
      </ScrollView>
    </View>
  );
}
