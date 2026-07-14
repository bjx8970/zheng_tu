// 人脉资源玩法页面
// 通过多种渠道积累人脉值，消费人脉解锁特殊选项、加速晋升、降低调查风险等
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { RANK_CONFIG } from '@/types/game';

// ── 常量 ────────────────────────────────────────────────────
const BG = '#F4F4F0';
const HEADER = '#1D3B5E';
const CARD = '#FFFFFF';
const BORDER = '#D6CFC4';
const PRIMARY = '#1D3B5E';
const ACCENT = '#C82829';
const GOLD = '#C87820';
const GREEN = '#2E7D32';
const MUTED = '#888';

// 人脉积累行动（每次行动有冷却：通过 lastNetworkActionDay 判断）
interface NetworkAction {
  id: string;
  label: string;
  desc: string;
  icon: string;
  networkGain: number;      // 人脉值增加
  costMerit?: number;       // 消耗政绩（可选）
  costFactionPoints?: number; // 消耗派系积分（可选）
  cooldownDays: number;     // 冷却天数（游戏内）
  minRank: number;
}

const NETWORK_ACTIONS: NetworkAction[] = [
  { id: 'alumni',     label: '校友聚会',    icon: '🎓', desc: '联络校友，扩大人脉圈',         networkGain: 5,  costMerit: 0,  cooldownDays: 30,  minRank: 1 },
  { id: 'banquet',    label: '政商宴请',    icon: '🍽️', desc: '宴请商界人士，建立利益关系',   networkGain: 8,  costMerit: 3,  cooldownDays: 30,  minRank: 2 },
  { id: 'mentor',     label: '拜访导师',    icon: '👴', desc: '登门拜访政界前辈，获得提携',   networkGain: 10, costMerit: 5,  cooldownDays: 60,  minRank: 3 },
  { id: 'forum',      label: '参加论坛',    icon: '🎤', desc: '在重要论坛发言，提升知名度',   networkGain: 12, costMerit: 5,  cooldownDays: 60,  minRank: 4 },
  { id: 'research',   label: '调研考察',    icon: '🔍', desc: '主动赴基层调研，积累信任',     networkGain: 8,  cooldownDays: 30,  minRank: 2 },
  { id: 'cross_dept', label: '跨部联络',    icon: '🤝', desc: '主动与其他部门建立沟通机制',   networkGain: 10, costFactionPoints: 5,  cooldownDays: 45,  minRank: 5 },
  { id: 'media',      label: '媒体公关',    icon: '📺', desc: '接受媒体采访，扩大影响力',     networkGain: 15, costMerit: 8,  cooldownDays: 90,  minRank: 6 },
  { id: 'high_level', label: '高层拜会',    icon: '🏛️', desc: '进京拜会高层领导，扩大政治资本', networkGain: 20, costFactionPoints: 15, cooldownDays: 90, minRank: 8 },
];

// 人脉消费效果
interface NetworkSpend {
  id: string;
  label: string;
  desc: string;
  icon: string;
  cost: number;
  effect: string;
  minRank: number;
}
const NETWORK_SPENDS: NetworkSpend[] = [
  { id: 'reduce_risk',  label: '疏通关系',    icon: '🛡️', desc: '消除一部分巡视风险',         cost: 10, effect: '巡视风险 -8',      minRank: 1 },
  { id: 'boost_merit',  label: '争取项目',    icon: '📋', desc: '借助人脉争取重点项目，增加政绩', cost: 15, effect: '政绩 +10',      minRank: 2 },
  { id: 'accelerate',   label: '加速审批',    icon: '⚡', desc: '借助人脉加速城市建设项目',     cost: 20, effect: '下次施政成功率+15%', minRank: 3 },
  { id: 'intel',        label: '情报获取',    icon: '🔎', desc: '获取对立派系内部动向',        cost: 25, effect: '对立关系 -5，派系积分+15', minRank: 5 },
  { id: 'promotion_pr', label: '晋升公关',    icon: '🚀', desc: '托关系提前知会上级，增加晋升筹码', cost: 30, effect: '上司好感 +8',   minRank: 4 },
  { id: 'immunity',     label: '保护伞强化',  icon: '☂️', desc: '利用人脉加固保护关系网',      cost: 50, effect: '保护伞等级 +1',   minRank: 7 },
];

// 效果等级标签
function getNetworkLevel(v: number): { label: string; color: string; desc: string } {
  if (v >= 90) return { label: '政界权贵', color: '#B8860B', desc: '人脉遍布全国，呼风唤雨' };
  if (v >= 70) return { label: '深厚背景', color: GREEN,     desc: '官场经营多年，关系广泛' };
  if (v >= 50) return { label: '人脉广泛', color: PRIMARY,   desc: '在圈子内颇有知名度' };
  if (v >= 30) return { label: '有所积累', color: '#546E7A', desc: '具备一定的人际资源' };
  if (v >= 10) return { label: '初步经营', color: MUTED,     desc: '刚刚开始积累人脉' };
  return { label: '几乎空白', color: ACCENT, desc: '尚无有效人脉网络' };
}

export default function NetworkResourcesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [tab, setTab] = useState<'gain' | 'spend'>('gain');
  const [actionMsg, setActionMsg] = useState<{ id: string; msg: string; success: boolean } | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  if (!save) return null;

  const networkValue = save.networkValue ?? 0;
  const rankLevel = save.rankLevel ?? 1;
  const gameDays = save.gameDays ?? 0;
  const factionPoints = save.factionPoints ?? 0;
  const meritPoints = save.meritPoints ?? 0;
  const netLevel = getNetworkLevel(networkValue);
  // 冷却记录：复用 careerPathCooldowns，key 前缀 net_
  const cooldowns: Record<string, number> = (save.careerPathCooldowns ?? {}) as Record<string, number>;
  function isCool(id: string, days: number) { return ((cooldowns[`net_${id}`] ?? 0) + days) > gameDays; }
  function coolLeft(id: string, days: number) { return Math.max(0, Math.ceil((cooldowns[`net_${id}`] ?? 0) + days - gameDays)); }

  const handleGain = async (action: NetworkAction) => {
    if (processing) return;
    if (rankLevel < action.minRank) return;
    if (isCool(action.id, action.cooldownDays)) {
      setActionMsg({ id: action.id, msg: `冷却中，还需 ${coolLeft(action.id, action.cooldownDays)} 天`, success: false });
      return;
    }
    if ((action.costMerit ?? 0) > meritPoints) {
      setActionMsg({ id: action.id, msg: '政绩不足', success: false });
      return;
    }
    if ((action.costFactionPoints ?? 0) > factionPoints) {
      setActionMsg({ id: action.id, msg: '派系积分不足', success: false });
      return;
    }
    setProcessing(action.id);

    const newNetwork = Math.min(100, networkValue + action.networkGain);
    const newCooldowns = { ...(save.careerPathCooldowns ?? {}), [`net_${action.id}`]: gameDays };
    const updates: Parameters<typeof updateGameSave>[0] = {
      networkValue: newNetwork,
      careerPathCooldowns: newCooldowns,
    };
    if (action.costMerit) updates.meritPoints = Math.max(0, meritPoints - action.costMerit);
    if (action.costFactionPoints) updates.factionPoints = Math.max(0, factionPoints - action.costFactionPoints);

    await updateGameSave(updates);
    void saveResult('netRes_gain_'+action.id, {ok:true,desc:`人脉 +${action.networkGain}，当前 ${newNetwork}`,day:save.gameDays??0});
    setActionMsg({ id: action.id, msg: `人脉 +${action.networkGain}，当前 ${newNetwork}`, success: true });
    setProcessing(null);
  };

  const handleSpend = async (spend: NetworkSpend) => {
    if (processing) return;
    if (rankLevel < spend.minRank) return;
    if (networkValue < spend.cost) {
      setActionMsg({ id: spend.id, msg: '人脉值不足', success: false });
      return;
    }
    setProcessing(spend.id);

    const updates: Parameters<typeof updateGameSave>[0] = {
      networkValue: Math.max(0, networkValue - spend.cost),
    };
    // 各效果实际落地
    if (spend.id === 'reduce_risk') updates.inspectionRisk = Math.max(0, (save.inspectionRisk ?? 0) - 8);
    else if (spend.id === 'boost_merit') updates.meritPoints = Math.min(999, meritPoints + 10);
    else if (spend.id === 'intel') { updates.factionPoints = Math.min(999, factionPoints + 15); }
    else if (spend.id === 'promotion_pr') updates.bossFavor = Math.min(100, (save.bossFavor ?? 50) + 8);
    else if (spend.id === 'immunity') {
      const cur = save.protectionUmbrellaLevel ?? 0;
      if (cur < 5) updates.protectionUmbrellaLevel = cur + 1;
    }

    await updateGameSave(updates);
    void saveResult('netRes_spend_'+spend.id, {ok:true,desc:`已消耗人脉 ${spend.cost}，${spend.effect}已生效`,day:save.gameDays??0});
    setActionMsg({ id: spend.id, msg: `已消耗人脉 ${spend.cost}，${spend.effect}已生效`, success: true });
    setProcessing(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="light" backgroundColor={HEADER} />

      {/* 顶部 */}
      <View style={{ backgroundColor: HEADER, paddingTop: 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 13 }}>返回</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🤝 人脉资源</Text>
        <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 2 }}>
          {RANK_CONFIG[rankLevel]?.name ?? ''} · 人脉值 {networkValue}/100
        </Text>
      </View>

      {/* Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        {([['gain', '💼 积累人脉'], ['spend', '🎯 消费人脉']] as [string, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key as 'gain' | 'spend')}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? PRIMARY : 'transparent' }}>
            <Text style={{ fontSize: 13, fontWeight: tab === key ? '700' : '400', color: tab === key ? PRIMARY : MUTED }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}>
        {/* 当前人脉状态 */}
        <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View>
              <Text style={{ fontSize: 28, fontWeight: '800', color: netLevel.color }}>{networkValue}</Text>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>人脉值（满分100）</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <View style={{ backgroundColor: netLevel.color + '22', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: netLevel.color }}>{netLevel.label}</Text>
              </View>
              <Text style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{netLevel.desc}</Text>
            </View>
          </View>
          {/* 进度条 */}
          <View style={{ height: 8, backgroundColor: '#eee', borderRadius: 4 }}>
            <View style={{ width: `${networkValue}%`, height: 8, backgroundColor: netLevel.color, borderRadius: 4 }} />
          </View>
          {/* 人脉效果说明 */}
          <View style={{ marginTop: 12, gap: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY, marginBottom: 4 }}>人脉值效果：</Text>
            {[
              { threshold: 10, label: '解锁特殊事件对话选项' },
              { threshold: 20, label: '晋升评分 +3%' },
              { threshold: 40, label: '上司好感自然增长加速' },
              { threshold: 60, label: '巡视风险每月自动 -1' },
              { threshold: 80, label: '版图争夺成功率 +10%' },
              { threshold: 90, label: '派系积分每月额外 +3' },
            ].map(e => (
              <View key={e.threshold} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: networkValue >= e.threshold ? GREEN : '#ccc' }} />
                <Text style={{ fontSize: 11, color: networkValue >= e.threshold ? '#333' : '#aaa' }}>
                  {e.threshold}+ {e.label} {networkValue >= e.threshold ? '✓' : ''}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 行动列表 */}
        {actionMsg && (
          <View style={{ backgroundColor: actionMsg.success ? '#E8F5E9' : '#FFEBEE', borderWidth: 1, borderColor: actionMsg.success ? GREEN : ACCENT, padding: 10 }}>
            <Text style={{ fontSize: 12, color: actionMsg.success ? GREEN : ACCENT, fontWeight: '700' }}>{actionMsg.msg}</Text>
            <Pressable onPress={() => setActionMsg(null)} style={{ alignSelf: 'flex-end' }}>
              <Text style={{ fontSize: 11, color: MUTED }}>关闭</Text>
            </Pressable>
          </View>
        )}

        {tab === 'gain' ? (
          NETWORK_ACTIONS.map(action => {
            const locked = rankLevel < action.minRank;
            const cool = isCool(action.id, action.cooldownDays);
            const cantAfford = (action.costMerit ?? 0) > meritPoints || (action.costFactionPoints ?? 0) > factionPoints;
            const isProcessing = processing === action.id;
            const disabled = locked || cool || cantAfford || !!processing;
            const left = cool ? coolLeft(action.id, action.cooldownDays) : 0;
            return (
              <Pressable key={action.id}
                onPress={() => !disabled && handleGain(action)}
                style={{
                  backgroundColor: CARD, borderWidth: 1,
                  borderColor: cool ? '#FEF3C7' : locked ? BORDER : cantAfford ? '#FFE0E0' : BORDER,
                  padding: 13, opacity: locked ? 0.5 : 1,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}>
                <Text style={{ fontSize: 26 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>{action.label}</Text>
                    {locked && <Text style={{ fontSize: 10, color: ACCENT, backgroundColor: '#FFEBEE', paddingHorizontal: 5, paddingVertical: 1 }}>
                      需级别{action.minRank}
                    </Text>}
                    {cool && <Text style={{ fontSize: 10, color: '#B45309', backgroundColor: '#FEF3C7', paddingHorizontal: 5, paddingVertical: 1 }}>
                      冷却{left}天
                    </Text>}
                  </View>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: GREEN, fontWeight: '600' }}>人脉 +{action.networkGain}</Text>
                    {action.costMerit ? <Text style={{ fontSize: 11, color: ACCENT }}>政绩 -{action.costMerit}</Text> : null}
                    {action.costFactionPoints ? <Text style={{ fontSize: 11, color: '#4A148C' }}>积分 -{action.costFactionPoints}</Text> : null}
                    <Text style={{ fontSize: 11, color: MUTED }}>冷却{action.cooldownDays}天</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: disabled ? '#eee' : PRIMARY, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: disabled ? MUTED : '#fff', fontSize: 12, fontWeight: '700' }}>
                    {isProcessing ? '…' : locked ? '🔒' : cool ? `${left}天` : cantAfford ? '不足' : '执行'}
                  </Text>
                </View>
              </Pressable>
            );
          })
        ) : (
          NETWORK_SPENDS.map(spend => {
            const locked = rankLevel < spend.minRank;
            const canAfford = networkValue >= spend.cost;
            const isProcessing = processing === spend.id;
            return (
              <Pressable key={spend.id}
                onPress={() => !locked && canAfford && handleSpend(spend)}
                style={{
                  backgroundColor: CARD, borderWidth: 1,
                  borderColor: locked ? BORDER : !canAfford ? '#FFE0E0' : BORDER,
                  padding: 13, opacity: locked ? 0.5 : 1,
                  flexDirection: 'row', alignItems: 'center', gap: 12,
                }}>
                <Text style={{ fontSize: 26 }}>{spend.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>{spend.label}</Text>
                    {locked && <Text style={{ fontSize: 10, color: ACCENT, backgroundColor: '#FFEBEE', paddingHorizontal: 5, paddingVertical: 1 }}>
                      需级别{spend.minRank}
                    </Text>}
                  </View>
                  <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{spend.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: ACCENT, fontWeight: '600' }}>人脉 -{spend.cost}</Text>
                    <Text style={{ fontSize: 11, color: PRIMARY }}>效果：{spend.effect}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: locked || !canAfford ? '#eee' : GOLD, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ color: locked || !canAfford ? MUTED : '#fff', fontSize: 12, fontWeight: '700' }}>
                    {isProcessing ? '…' : locked ? '🔒' : !canAfford ? '不足' : '使用'}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}
