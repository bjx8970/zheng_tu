/**
 * 回忆录撰写系统 — 退休前可选择披露程度
 * 保守/适度/大胆三档，影响退休后社会影响力、历史评价、后辈传承程度
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';
import { getRankTheme } from '@/lib/rankTheme';

type MemoirStyle = 'conservative' | 'moderate' | 'bold';

interface StyleOption {
  key: MemoirStyle;
  label: string;
  subLabel: string;
  icon: string;
  color: string;
  desc: string;
  effects: string[];
  influenceBonus: number;
  legacyBonus: number;
  moralDelta: number;
  meritBonus: number;
  risk: string;
}

const STYLES: StyleOption[] = [
  {
    key: 'conservative',
    label: '保守',
    subLabel: '官方叙述，点到为止',
    icon: '📕',
    color: '#4B5563',
    desc: '以官方立场为主，仅记录公开成就与政绩，保守处理敏感内容，维护良好形象。',
    effects: ['社会影响力+15', '历史评价稳健', '传承程度适中'],
    influenceBonus: 15,
    legacyBonus: 10,
    moralDelta: 2,
    meritBonus: 50,
    risk: '影响力较低，后辈传承有限',
  },
  {
    key: 'moderate',
    label: '适度',
    subLabel: '坦诚适度，留有余地',
    icon: '📗',
    color: '#2563EB',
    desc: '在官方叙述基础上，适度披露决策背景与政策初衷，展现真实人格魅力与历史担当。',
    effects: ['社会影响力+30', '历史评价提升', '传承程度显著'],
    influenceBonus: 30,
    legacyBonus: 20,
    moralDelta: 4,
    meritBonus: 120,
    risk: '少量争议，总体形象正面',
  },
  {
    key: 'bold',
    label: '大胆',
    subLabel: '披肝沥胆，直面历史',
    icon: '📘',
    color: '#DC2626',
    desc: '全面披露重大决策内幕、政治斗争细节与历史教训，引发广泛社会讨论，成为时代镜鉴。',
    effects: ['社会影响力+55', '历史评价重塑', '传承程度极高'],
    influenceBonus: 55,
    legacyBonus: 35,
    moralDelta: -3,
    meritBonus: 200,
    risk: '可能引发争议，廉洁-3，但影响深远',
  },
];

// 身后影响力三维度计算
function calcLegacyIndex(save: import('@/types/game').PlayerSave): { infra: number; successor: number; institution: number; total: number } {
  // 1. 基础设施：已命名工程数量
  let named = 0;
  try { named = JSON.parse(save.namedLandmarks ?? '[]').length; } catch { named = 0; }
  const infra = Math.min(100, named * 15 + (save.meritPoints ?? 0) / 100);

  // 2. 接班人：接班人能力×忠诚度
  const successorScore = ((save.successorAbility ?? 0) * 0.6 + (save.successorLoyalty ?? 0) * 0.4);
  const successor = Math.min(100, successorScore);

  // 3. 制度框架：廉洁+能力+改革派声望
  const institution = Math.min(100, ((save.moralValue ?? 0) * 0.4 + (save.abilityValue ?? 0) * 0.3 + (save.reformFaction ?? 0) * 0.3));

  const total = Math.round((infra + successor + institution) / 3);
  return { infra: Math.round(infra), successor: Math.round(successor), institution: Math.round(institution), total };
}

export default function MemoirPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [selected, setSelected] = useState<MemoirStyle | null>(null);
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);

  useFocusEffect(useCallback(() => {
    setMsg('');
    setSelected(null);
  }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const theme = getRankTheme(save.rankLevel ?? 1);
  const legacy = calcLegacyIndex(save);
  const alreadyWritten = save.memoirWritten ?? false;
  const currentStyle = STYLES.find(s => s.key === (save.memoirStyle as MemoirStyle));

  async function handleWrite() {
    if (!save || !selected || acting) return;
    const opt = STYLES.find(s => s.key === selected)!;
    setActing(true);
    try {
      const newSave = await updateSave(save.id, {
        memoirWritten: true,
        memoirStyle: selected,
        memoirInfluence: opt.influenceBonus,
        legacyBonus: (save.legacyBonus ?? 0) + opt.legacyBonus,
        moralValue: Math.min(100, Math.max(0, (save.moralValue ?? 0) + opt.moralDelta)),
        meritPoints: (save.meritPoints ?? 0) + opt.meritBonus,
        politicalCapital: (save.politicalCapital ?? 0) + 2,
      });
      if (newSave) {
        updateGameSave(newSave);
        setMsgOk(true);
        setMsg(`《回忆录·${opt.label}版》已完成！社会影响力+${opt.influenceBonus}，遗产指数+${opt.legacyBonus}，政绩+${opt.meritBonus}`);
      } else {
        setMsgOk(false);
        setMsg('网络异常，请稍后重试');
      }
    } catch {
      setMsgOk(false);
      setMsg('操作失败');
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
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>回忆录撰写</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>退休前唯一机会 · 影响历史评价</Text>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

        {/* 身后影响力三维度 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '700' }}>历史遗产指数</Text>
            <View style={{ backgroundColor: theme.primary + '20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Text style={{ color: theme.primary, fontSize: 14, fontWeight: '800' }}>{legacy.total}</Text>
            </View>
          </View>
          {[
            { label: '基础设施遗产', icon: '🏗️', val: legacy.infra, desc: '主导修建的基础设施与工程' },
            { label: '接班人位置',   icon: '🌱', val: legacy.successor, desc: '培养接班人的能力与忠诚度' },
            { label: '制度框架',     icon: '📜', val: legacy.institution, desc: '廉洁、能力与改革声望综合' },
          ].map(d => (
            <View key={d.label} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 16 }}>{d.icon}</Text>
                  <View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: theme.valueText }}>{d.label}</Text>
                    <Text style={{ fontSize: 10, color: theme.mutedText }}>{d.desc}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 13, fontWeight: '700', color: theme.primary }}>{d.val}</Text>
              </View>
              <View style={{ backgroundColor: theme.progressBg, borderRadius: 4, height: 6 }}>
                <View style={{ width: `${d.val}%`, height: 6, backgroundColor: theme.primary, borderRadius: 4 }} />
              </View>
            </View>
          ))}
        </View>

        {/* 已撰写状态 */}
        {alreadyWritten && currentStyle ? (
          <View style={{ backgroundColor: currentStyle.color + '12', borderWidth: 1.5, borderColor: currentStyle.color + '50', borderRadius: 12, padding: 14 }}>
            <Text style={{ fontSize: 11, color: currentStyle.color, fontWeight: '700', marginBottom: 6 }}>已完成回忆录</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 32 }}>{currentStyle.icon}</Text>
              <View>
                <Text style={{ fontSize: 15, fontWeight: '800', color: theme.valueText }}>{currentStyle.label}版 · {currentStyle.subLabel}</Text>
                <Text style={{ fontSize: 12, color: theme.mutedText, marginTop: 2 }}>社会影响力 +{currentStyle.influenceBonus}</Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            {/* 风格选择 */}
            <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '600', letterSpacing: 1 }}>选择披露风格</Text>
            {STYLES.map(opt => (
              <Pressable
                key={opt.key}
                onPress={() => setSelected(opt.key)}
                style={{
                  backgroundColor: theme.cardBg,
                  borderWidth: selected === opt.key ? 2 : 1,
                  borderColor: selected === opt.key ? opt.color : theme.cardBorder,
                  borderRadius: 12,
                  padding: 14,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Text style={{ fontSize: 15, fontWeight: '800', color: opt.color }}>{opt.label}</Text>
                      <Text style={{ fontSize: 12, color: theme.mutedText }}>{opt.subLabel}</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 18, marginBottom: 8 }}>{opt.desc}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {opt.effects.map(e => (
                        <View key={e} style={{ backgroundColor: opt.color + '15', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11, color: opt.color, fontWeight: '600' }}>{e}</Text>
                        </View>
                      ))}
                    </View>
                    <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 6, fontStyle: 'italic' }}>⚠️ {opt.risk}</Text>
                  </View>
                </View>
              </Pressable>
            ))}

            {/* 消息 */}
            {msg ? (
              <View style={{ backgroundColor: msgOk ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: msgOk ? '#86efac' : '#fca5a5', borderRadius: 10, padding: 12 }}>
                <Text style={{ color: msgOk ? '#166534' : '#991b1b', fontSize: 13, lineHeight: 20 }}>{msg}</Text>
              </View>
            ) : null}

            {/* 提交 */}
            {!alreadyWritten && (
              <Pressable
                onPress={handleWrite}
                disabled={!selected || acting}
                style={{
                  backgroundColor: selected ? (STYLES.find(s => s.key === selected)?.color ?? theme.primary) : '#9CA3AF',
                  borderRadius: 12, padding: 16, alignItems: 'center',
                  opacity: (!selected || acting) ? 0.6 : 1,
                }}
              >
                {acting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>完成撰写并发布</Text>
                    {selected && (
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 3 }}>
                        {STYLES.find(s => s.key === selected)?.label}版 · 此操作不可撤销
                      </Text>
                    )}
                  </>
                )}
              </Pressable>
            )}
          </>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
