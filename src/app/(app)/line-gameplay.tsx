import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import {
  LINE_DATA, LINE_PITCH,
  getDepartmentsForRank, getActionsForRank,
  getActionCost, getActionRewardForRank, getDeptQuota,
  type CareerLine, type LineAction,
} from '@/lib/lineGameplay';
import { getLineTheme, LINE_ICON } from '@/lib/lineTheme';
import { useActionResults } from '@/lib/useActionResults';

// 路线玩法统一冷却时间：1个月（30天）
const LINE_COOLDOWN_DAYS = 30;

/** 格式化万元为易读字符串 */
function fmtFund(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}亿`;
  if (n >= 10000) return `${Math.round(n / 10000)}万`;
  return `${n}元`;
}

export default function LineGameplay() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [activeTab, setActiveTab] = useState<'actions' | 'dept' | 'pitch'>('actions');
  const [processing, setProcessing] = useState<string | null>(null);
  const [msgMap, setMsgMap] = useState<Record<string, string>>({});
  const [storyAction, setStoryAction] = useState<LineAction | null>(null);

  if (!save) return null;

  const line = (save.careerPathLine ?? '行政线') as CareerLine;
  const rank = save.rankLevel ?? 1;
  const theme = getLineTheme(line, rank);
  const lineData = LINE_DATA[line];
  const departments = getDepartmentsForRank(line, rank);
  const actions = getActionsForRank(line, rank);
  const pitch = LINE_PITCH[line];
  const cooldowns: Record<string, number> = save.careerPathCooldowns ?? {};

  function isCool(key: string) {
    return ((cooldowns[key] ?? 0) + LINE_COOLDOWN_DAYS) > (save?.gameDays ?? 0);
  }
  function coolLeft(key: string) {
    return Math.max(0, Math.ceil((cooldowns[key] ?? 0) + LINE_COOLDOWN_DAYS - (save?.gameDays ?? 0)));
  }

  async function doAction(action: LineAction, useGray = false) {
    if (!save || processing) return;
    // ── 专项资金检查 ──────────────────────────────────────────────────────
    const cost = getActionCost(action, rank);
    if ((save.fundBalance ?? 0) < cost) {
      setMsgMap(prev => ({ ...prev, [action.key]: `专项资金不足（需 ${fmtFund(cost)}，当前 ${fmtFund(save.fundBalance ?? 0)}）` }));
      return;
    }
    setProcessing(action.key);
    // ── 按当前职级缩放奖励 ────────────────────────────────────────────────
    const e = getActionRewardForRank(action, rank);
    const updates: Partial<typeof save> = {
      meritPoints: (save.meritPoints ?? 0) + (e.meritPoints ?? 0),
      bossFavor: Math.min(100, (save.bossFavor ?? 60) + (e.bossFavor ?? 0)),
      reformFaction: (save.reformFaction ?? 50) + (e.reformFaction ?? 0),
      pragmaticFaction: (save.pragmaticFaction ?? 50) + (e.pragmaticFaction ?? 0),
      inspectionRisk: Math.max(0, (save.inspectionRisk ?? 20) + (e.inspectionRisk ?? 0)),
      publicOpinionIndex: Math.min(100, Math.max(0, (save.publicOpinionIndex ?? 50) + (e.publicOpinion ?? 0))),
      lineKpiScore: (save.lineKpiScore ?? 0) + (e.lineKpi ?? 0),
      // 扣除专项资金
      fundBalance: Math.max(0, (save.fundBalance ?? 0) - cost),
      careerPathCooldowns: { ...cooldowns, [action.key]: save.gameDays },
    };
    if (useGray && action.grayOption) {
      updates.meritPoints = (updates.meritPoints ?? 0) + action.grayOption.extraMerit;
      updates.moralValue = Math.max(0, (save.moralValue ?? 80) - action.grayOption.moralPenalty);
    } else {
      updates.moralValue = Math.min(100, (save.moralValue ?? 80) + (e.moralValue ?? 0));
    }
    if (e.assets !== undefined) updates.personalAssets = [...(save.personalAssets ?? [])];
    try {
      await updateGameSave(updates);
      // 持久化行动结果，返回后仍可展示
      const rewardDesc = [
        (e.meritPoints ?? 0) > 0 && `政绩+${e.meritPoints}`,
        (e.lineKpi ?? 0) > 0 && `路线积分+${e.lineKpi}`,
        (e.bossFavor ?? 0) > 0 && `上司好感+${e.bossFavor}`,
        useGray && action.grayOption && `（灰色操作，廉洁-${action.grayOption.moralPenalty}）`,
      ].filter(Boolean).join('，') || '行动完成';
      await saveResult('linePlay_' + action.key, { ok: true, desc: rewardDesc, day: save.gameDays }, {});
      setStoryAction(action);
      setMsgMap(prev => ({ ...prev, [action.key]: '' }));
    } catch {
      setMsgMap(prev => ({ ...prev, [action.key]: '操作失败，请重试' }));
    } finally {
      setProcessing(null);
    }
  }

  const isDark = rank >= 12;
  const headerBg = theme.primary;
  const bodyBg = theme.bg;
  const cardBg = theme.cardBg;
  const border = theme.border;
  const titleC = theme.titleColor;
  const textC = theme.textColor;
  const descC = theme.descColor;

  return (
    <View style={{ flex: 1, backgroundColor: bodyBg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: headerBg, paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 }}>
            {LINE_ICON[line]} {line} · {theme.tierLabel}
          </Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: '#fff', fontSize: 11 }}>rank {rank}</Text>
          </View>
        </View>
        {/* KPI分 */}
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          {[
            { label: '路线积分', value: save.lineKpiScore ?? 0, icon: '🏆' },
            { label: '政绩', value: save.meritPoints ?? 0, icon: '📊' },
            { label: '廉洁', value: save.moralValue ?? 80, icon: '🌟' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 16 }}>{s.icon}</Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{s.value}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 10 }}>{s.label}</Text>
            </View>
          ))}
        </View>
        {/* Tab 切换 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {([['actions', '🎮 行动'], ['dept', '🏢 部门'], ['pitch', '⭐ 路线优势']] as const).map(([tab, label]) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={{
                flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
                backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: activeTab === tab ? '700' : '400' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 剧情弹窗 */}
      {storyAction && (
        <Pressable
          onPress={() => setStoryAction(null)}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 99, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ backgroundColor: cardBg, borderRadius: 16, padding: 20, margin: 24, borderWidth: 2, borderColor: theme.primary }}>
            <Text style={{ fontSize: 20, textAlign: 'center', marginBottom: 8 }}>{storyAction.icon}</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: titleC, textAlign: 'center', marginBottom: 12 }}>{storyAction.name} 完成</Text>
            {storyAction.story.map((s, i) => (
              <Text key={i} style={{ fontSize: 13, color: textC, marginBottom: 5, lineHeight: 20 }}>• {s}</Text>
            ))}
            <Pressable
              onPress={() => setStoryAction(null)}
              style={{ marginTop: 14, backgroundColor: theme.primary, borderRadius: 10, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>继续</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} contentInsetAdjustmentBehavior="automatic">

        {/* ── 行动面板 ── */}
        {activeTab === 'actions' && (
          <View style={{ gap: 12 }}>
            {/* 专项资金余额 */}
            <View style={{ backgroundColor: cardBg, borderRadius: 10, borderWidth: 1, borderColor: border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 20 }}>💰</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: descC }}>专项资金余额</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: titleC }}>{fmtFund(save.fundBalance ?? 0)}</Text>
              </View>
              <Text style={{ fontSize: 11, color: descC, textAlign: 'right' }}>
                {actions.length} 项行动可用
              </Text>
            </View>
            {actions.map(action => {
              const cool = isCool(action.key);
              const left = cool ? coolLeft(action.key) : 0;
              const busy = processing === action.key;
              const cost = getActionCost(action, rank);
              const reward = getActionRewardForRank(action, rank);
              const canAfford = (save.fundBalance ?? 0) >= cost;
              const errMsg = msgMap[action.key];
              return (
                <View key={action.key} style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: titleC }}>{action.name}</Text>
                      <Text style={{ fontSize: 12, color: descC, marginTop: 2, lineHeight: 18 }}>{action.desc}</Text>
                    </View>
                    {cool && (
                      <View style={{ backgroundColor: '#f3f4f6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ fontSize: 10, color: '#888' }}>冷却{left}天</Text>
                      </View>
                    )}
                  </View>
                  {/* 花费 & 奖励预览 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                    <View style={{ backgroundColor: canAfford ? '#fff7e6' : '#fde8e8', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: canAfford ? '#e67e22' : '#e74c3c' }}>
                      <Text style={{ fontSize: 11, color: canAfford ? '#b7510e' : '#c0392b', fontWeight: '700' }}>💰 花费 {fmtFund(cost)}</Text>
                    </View>
                    {(reward.meritPoints ?? 0) > 0 && <View style={{ backgroundColor: '#e8f5e9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 11, color: '#2a7a3b' }}>政绩+{reward.meritPoints}</Text></View>}
                    {(reward.lineKpi ?? 0) > 0 && <View style={{ backgroundColor: '#e3f2fd', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 11, color: '#1565c0' }}>路线积分+{reward.lineKpi}</Text></View>}
                    {(reward.moralValue ?? 0) > 0 && <View style={{ backgroundColor: '#fce4ec', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 11, color: '#880e4f' }}>廉洁+{reward.moralValue}</Text></View>}
                    {(reward.bossFavor ?? 0) > 0 && <View style={{ backgroundColor: '#fff3e0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 11, color: '#e65100' }}>上司好感+{reward.bossFavor}</Text></View>}
                    {(reward.inspectionRisk ?? 0) < 0 && <View style={{ backgroundColor: '#e8f5e9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 11, color: '#2a7a3b' }}>巡视风险{reward.inspectionRisk}</Text></View>}
                    {(reward.publicOpinion ?? 0) > 0 && <View style={{ backgroundColor: '#f3e5f5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}><Text style={{ fontSize: 11, color: '#6a1b9a' }}>舆情+{reward.publicOpinion}</Text></View>}
                  </View>
                  {/* 上次执行结果（持久化，返回后仍显示） */}
                  {(() => { const r = getResult('linePlay_' + action.key); return r ? (
                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#BBF7D0' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#065F46', marginBottom: 2 }}>✅ 上次执行 · 第{r.day}天</Text>
                      <Text style={{ fontSize: 11, color: '#047857', lineHeight: 16 }}>{r.desc}</Text>
                    </View>
                  ) : null; })()}
                  {/* 错误提示 */}
                  {!!errMsg && (
                    <Text style={{ fontSize: 11, color: '#c0392b', marginBottom: 6, fontWeight: '600' }}>⚠️ {errMsg}</Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => !cool && !busy && canAfford && doAction(action, false)}
                      style={{ flex: 1, backgroundColor: (cool || busy || !canAfford) ? '#e5e7eb' : theme.primary, borderRadius: 8, paddingVertical: 9, alignItems: 'center' }}
                    >
                      <Text style={{ color: (cool || busy || !canAfford) ? '#999' : '#fff', fontSize: 13, fontWeight: '600' }}>
                        {busy ? '执行中…' : cool ? `冷却${left}天` : !canAfford ? '资金不足' : '执行'}
                      </Text>
                    </Pressable>
                    {action.grayOption && !cool && canAfford && (
                      <Pressable
                        onPress={() => !busy && doAction(action, true)}
                        style={{ flex: 1, backgroundColor: busy ? '#e5e7eb' : '#fff0e0', borderRadius: 8, paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#e67e22' }}
                      >
                        <Text style={{ color: '#c0392b', fontSize: 12, fontWeight: '600' }}>⚠️ {action.grayOption.name}</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 部门面板 ── */}
        {activeTab === 'dept' && (
          <View style={{ gap: 14 }}>
            {departments.length === 0 ? (
              <View style={{ alignItems: 'center', padding: 32 }}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
                <Text style={{ fontSize: 15, color: descC, textAlign: 'center' }}>当前路线暂无专属部门数据</Text>
              </View>
            ) : departments.map(dept => {
              const quota = getDeptQuota(dept, rank, save.gameDays ?? 0);
              return (
                <View key={dept.name} style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: border, overflow: 'hidden' }}>
                  <View style={{ backgroundColor: theme.primary, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{dept.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{dept.name}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>{dept.desc}</Text>
                    </View>
                    {/* 名额职数 */}
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{quota}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9 }}>名额</Text>
                    </View>
                  </View>
                  <View style={{ padding: 10, gap: 6 }}>
                    {/* 全部行动（无等级锁定），花费按职级动态定价 */}
                    {dept.actions.map(action => {
                      const cost = getActionCost(action, rank);
                      const reward = getActionRewardForRank(action, rank);
                      const isProcessingThis = processing === action.key;
                      const msg = msgMap[action.key];
                      return (
                        <View key={action.key} style={{ borderBottomWidth: 1, borderBottomColor: border, paddingVertical: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 16 }}>{action.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: textC }}>{action.name}</Text>
                              <Text style={{ fontSize: 11, color: descC }}>{action.desc}</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5, paddingLeft: 24 }}>
                            <View style={{ backgroundColor: '#fff7e6', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, color: '#b7510e', fontWeight: '700' }}>花费 {fmtFund(cost)}</Text>
                            </View>
                            {(reward.meritPoints ?? 0) > 0 && <View style={{ backgroundColor: '#e8f5e9', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>政绩+{reward.meritPoints}</Text></View>}
                            {(reward.lineKpi ?? 0) > 0 && <View style={{ backgroundColor: '#e3f2fd', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#1565c0' }}>积分+{reward.lineKpi}</Text></View>}
                          </View>
                          {msg ? (
                            <Text style={{ fontSize: 11, color: '#e74c3c', marginTop: 4, paddingLeft: 24 }}>{msg}</Text>
                          ) : null}
                          <Pressable
                            onPress={() => doAction(action)}
                            disabled={!!processing}
                            style={{ marginTop: 6, marginLeft: 24, backgroundColor: (save.fundBalance ?? 0) >= cost ? theme.primary : '#ccc', borderRadius: 6, paddingVertical: 5, paddingHorizontal: 12, alignSelf: 'flex-start', opacity: isProcessingThis ? 0.6 : 1 }}
                          >
                            {isProcessingThis
                              ? <Text style={{ color: '#fff', fontSize: 11 }}>执行中…</Text>
                              : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>执行（专项资金 {fmtFund(cost)}）</Text>
                            }
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── 路线优势 ── */}
        {activeTab === 'pitch' && (
          <View style={{ gap: 14 }}>
            <View style={{ backgroundColor: cardBg, borderRadius: 16, borderWidth: 2, borderColor: theme.primary, padding: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>{LINE_ICON[line]}</Text>
              <Text style={{ fontSize: 20, fontWeight: '700', color: titleC }}>{line}</Text>
              <Text style={{ fontSize: 14, color: descC, marginTop: 4, textAlign: 'center' }}>{pitch.tagline}</Text>
            </View>
            <View style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: titleC, marginBottom: 12 }}>🎯 核心优势</Text>
              {pitch.advantages.map((adv, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: textC }}>{adv}</Text>
                </View>
              ))}
            </View>
            <View style={{ backgroundColor: cardBg, borderRadius: 12, borderWidth: 1, borderColor: border, padding: 16 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: titleC, marginBottom: 12 }}>📈 路线晋升体系</Text>
              {lineData.departments.map((dept, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <Text style={{ fontSize: 16 }}>{dept.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: textC }}>{dept.name}</Text>
                    <Text style={{ fontSize: 11, color: descC }}>Rank {dept.rankRange[0]}–{dept.rankRange[1]} · {dept.actions.length} 项专属行动</Text>
                  </View>
                  {rank >= dept.rankRange[0] && rank <= dept.rankRange[1] && (
                    <View style={{ backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 10 }}>当前</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
