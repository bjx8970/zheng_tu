/**
 * 路线间竞争事件处理页面
 * 支持排挤 / 拉拢 / 跳槽三类随机事件
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  ALL_COMPETITION_EVENTS,
  rollCompetitionEvent,
  type CompetitionEvent,
  type CompetitionChoice,
  type CareerLineName,
} from '@/lib/lineCompetitionEvents';
import { getRankThemeWithLine } from '@/lib/rankTheme';

const TYPE_COLOR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  排挤: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA', label: '🗡️ 排挤事件' },
  拉拢: { bg: '#FFFBEB', text: '#B45309', border: '#FCD34D', label: '🤝 拉拢事件' },
  跳槽: { bg: '#EFF6FF', text: '#1D4ED8', border: '#93C5FD', label: '🔀 转线事件' },
};

export default function LineCompetitionScreen() {
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<CompetitionEvent | null>(null);
  const [result, setResult] = useState<{ choice: CompetitionChoice; event: CompetitionEvent } | null>(null);
  const [history, setHistory] = useState<{ event: CompetitionEvent; choiceKey: string }[]>([]);


  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const currentLine = (save.careerPathLine ?? '行政线') as CareerLineName;
  const rank = save.rankLevel;
  const theme = getRankThemeWithLine(rank, currentLine);

  // 手动触发随机事件（测试 / 演示 / 从 home 跳转时）
  function triggerRandom() {
    const evt = rollCompetitionEvent(currentLine, rank, 0, 9999);
    if (evt) setActiveEvent(evt);
    else setActiveEvent(ALL_COMPETITION_EVENTS[Math.floor(Math.random() * ALL_COMPETITION_EVENTS.length)]);
  }

  async function handleChoice(event: CompetitionEvent, choice: CompetitionChoice) {
    if (!save) return;
    setLoading(true);
    const updates: Record<string, number | string | Record<string, number>> = {};
    const fx = choice.effects;

    if (fx.meritPoints)        updates.meritPoints        = Math.max(0, save.meritPoints        + fx.meritPoints);
    if (fx.bossFavor)          updates.bossFavor          = Math.min(100, Math.max(0, (save.bossFavor ?? 50)          + fx.bossFavor));
    if (fx.reformFaction)      updates.reformFaction      = Math.min(100, Math.max(0, (save.reformFaction ?? 50)      + fx.reformFaction));
    if (fx.pragmaticFaction)   updates.pragmaticFaction   = Math.min(100, Math.max(0, (save.pragmaticFaction ?? 50)   + fx.pragmaticFaction));
    if (fx.inspectionRisk)     updates.inspectionRisk     = Math.min(100, Math.max(0, (save.inspectionRisk ?? 20)     + fx.inspectionRisk));
    if (fx.publicOpinionIndex) updates.publicOpinionIndex = Math.min(100, Math.max(0, (save.publicOpinionIndex ?? 50) + fx.publicOpinionIndex));
    if (fx.moralValue)         updates.moralValue         = Math.min(100, Math.max(0, save.moralValue                 + fx.moralValue));
    if (fx.lineKpiScore)       updates.lineKpiScore       = Math.max(0, (save.lineKpiScore ?? 0) + fx.lineKpiScore);

    // 跳槽处理
    if (choice.switchLine) {
      updates.careerPathLine = choice.switchLine;
    }
    updates.lastCompetitionEventDay = save.gameDays;

    await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);

    setHistory(prev => [{ event, choiceKey: choice.key }, ...prev.slice(0, 9)]);
    setResult({ choice, event });
    setActiveEvent(null);
    setLoading(false);
  }

  const tInfo = activeEvent ? TYPE_COLOR[activeEvent.type] : null;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>

        {/* 页头 */}
        <View style={{ backgroundColor: theme.headerBg, borderRadius: 14, padding: 16, borderCurve: 'continuous' } as object}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>⚔️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>路线间博弈</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>
                {currentLine} · 职级 {rank} · 每月随机触发竞争事件
              </Text>
            </View>
          </View>
        </View>

        {/* 结果反馈 */}
        {result && !activeEvent && (
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 12, padding: 16,
            borderWidth: 1, borderColor: '#86EFAC', borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#166534', marginBottom: 6 }}>
              ✅ 已处置：{result.event.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#15803D' }}>
              选择了「{result.choice.label}」
            </Text>
            <View style={{ marginTop: 8, gap: 4 }}>
              {Object.entries(result.choice.effects).map(([k, v]) => {
                if (!v) return null;
                const labels: Record<string, string> = {
                  meritPoints: '政绩', bossFavor: '上司信任', reformFaction: '改革派',
                  pragmaticFaction: '实干派', inspectionRisk: '巡视风险',
                  publicOpinionIndex: '舆情', moralValue: '廉洁度', lineKpiScore: '线路积分',
                };
                return (
                  <Text key={k} style={{ fontSize: 11, color: (v as number) >= 0 ? '#166534' : '#B91C1C' }}>
                    {labels[k] ?? k} {(v as number) >= 0 ? '+' : ''}{v}
                  </Text>
                );
              })}
            </View>
            <Pressable onPress={() => setResult(null)}
              style={{ marginTop: 10, backgroundColor: '#166534', paddingVertical: 8, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>关闭</Text>
            </Pressable>
          </View>
        )}

        {/* 活动事件卡 */}
        {activeEvent && tInfo && (
          <View style={{ backgroundColor: tInfo.bg, borderRadius: 14, borderWidth: 1.5, borderColor: tInfo.border,
            overflow: 'hidden', borderCurve: 'continuous' } as object}>
            {/* 事件类型标题栏 */}
            <View style={{ backgroundColor: tInfo.border, paddingHorizontal: 14, paddingVertical: 10,
              flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '900', color: tInfo.text }}>{tInfo.label}</Text>
              <View style={{ flex: 1 }} />
              <View style={{ backgroundColor: activeEvent.sourceLine === currentLine ? tInfo.text : '#6B7280',
                paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>
                  {activeEvent.sourceLine === currentLine ? '本线内部' : `来自${activeEvent.sourceLine}`}
                </Text>
              </View>
            </View>

            <View style={{ padding: 14, gap: 12 }}>
              {/* 发起者 */}
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 26 }}>{activeEvent.actorIcon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: tInfo.text }}>{activeEvent.title}</Text>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>事件发起：{activeEvent.actor}</Text>
                </View>
              </View>

              {/* 事件描述 */}
              <View style={{ backgroundColor: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 12, borderCurve: 'continuous' } as object}>
                <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20 }}>{activeEvent.desc}</Text>
              </View>

              {/* 选项 */}
              <Text style={{ fontSize: 13, fontWeight: '800', color: tInfo.text }}>请选择应对方式：</Text>
              {activeEvent.choices.map((choice) => (
                <Pressable key={choice.key}
                  onPress={() => !loading && handleChoice(activeEvent, choice)}
                  style={{ backgroundColor: choice.isGray ? '#FEF2F2' : '#FFFFFF', borderRadius: 12,
                    borderWidth: 1, borderColor: choice.isGray ? '#FECACA' : tInfo.border, padding: 14,
                    opacity: loading ? 0.7 : 1, borderCurve: 'continuous' } as object}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800',
                          color: choice.isGray ? '#B91C1C' : tInfo.text }}>{choice.label}</Text>
                        {choice.isGray && (
                          <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                            <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>灰色选项</Text>
                          </View>
                        )}
                        {choice.switchLine && (
                          <View style={{ backgroundColor: '#DBEAFE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                            <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '700' }}>转入{choice.switchLine}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 12, color: '#6B7280', lineHeight: 17, marginBottom: 8 }}>{choice.desc}</Text>
                      {/* 效果预览 */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {Object.entries(choice.effects).map(([k, v]) => {
                          if (!v) return null;
                          const short: Record<string, string> = {
                            meritPoints: '政绩', bossFavor: '信任', reformFaction: '改革派',
                            pragmaticFaction: '实干派', inspectionRisk: '巡视险',
                            publicOpinionIndex: '舆情', moralValue: '廉洁', lineKpiScore: '线路分',
                          };
                          const positive = (v as number) >= 0;
                          return (
                            <View key={k} style={{ backgroundColor: positive ? '#F0FDF4' : '#FEF2F2',
                              paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5,
                              borderWidth: 1, borderColor: positive ? '#86EFAC' : '#FECACA' }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: positive ? '#166534' : '#B91C1C' }}>
                                {short[k] ?? k} {positive ? '+' : ''}{v}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                    {loading ? (
                      <ActivityIndicator size="small" color={tInfo.text} />
                    ) : (
                      <View style={{ backgroundColor: choice.isGray ? '#FEE2E2' : tInfo.bg,
                        paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: tInfo.text }}>选择</Text>
                      </View>
                    )}
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {/* 无活动事件 */}
        {!activeEvent && !result && (
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 12, padding: 20,
            borderWidth: 1, borderColor: theme.cardBorder, alignItems: 'center', gap: 12,
            borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 40 }}>🏛️</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.labelText }}>当前无待处置竞争事件</Text>
            <Text style={{ fontSize: 12, color: theme.mutedText, textAlign: 'center', lineHeight: 18 }}>
              路线间博弈事件将在时间推进中随机触发。{'\n'}职级越高，遭遇的事件越复杂。
            </Text>
            <Pressable onPress={triggerRandom}
              style={{ backgroundColor: theme.primary, paddingHorizontal: 20, paddingVertical: 10,
                borderRadius: 8, marginTop: 4 }}>
              <Text style={{ color: theme.primaryText, fontSize: 13, fontWeight: '700' }}>模拟触发竞争事件</Text>
            </Pressable>
          </View>
        )}

        {/* 事件类型说明 */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 12, padding: 16,
          borderWidth: 1, borderColor: theme.cardBorder, gap: 10, borderCurve: 'continuous' } as object}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: theme.labelText }}>📖 竞争事件类型</Text>
          {[
            { type: '排挤', icon: '🗡️', desc: '其他路线官员打压、告状、争夺资源，处置失当将损失政绩或增加巡视风险。', prob: '约10%/月' },
            { type: '拉拢', icon: '🤝', desc: '其他路线高层主动接触、利益交换、派系拉拢，接受有利但需承担义务。', prob: '约8%/月' },
            { type: '跳槽', icon: '🔀', desc: '特定条件下组织安排或邀请转线，有代价但可能开辟新晋升通道。', prob: '约4%/月' },
          ].map(item => (
            <View key={item.type} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 20 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: theme.labelText }}>{item.type}</Text>
                  <View style={{ backgroundColor: theme.accentBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                    <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '600' }}>{item.prob}</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 17 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 历史记录 */}
        {history.length > 0 && (
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 12, padding: 16,
            borderWidth: 1, borderColor: theme.cardBorder, borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: theme.labelText, marginBottom: 10 }}>📜 近期处置记录</Text>
            {history.map((h, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 16 }}>{TYPE_COLOR[h.event.type]?.label?.charAt(0) ?? '·'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: theme.labelText, fontWeight: '600' }}>{h.event.title}</Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>
                    {h.event.choices.find(c => c.key === h.choiceKey)?.label ?? h.choiceKey}
                  </Text>
                </View>
                <View style={{ backgroundColor: TYPE_COLOR[h.event.type]?.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: TYPE_COLOR[h.event.type]?.text }}>{h.event.type}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* 返回 */}
        <Pressable onPress={() => router.back()}
          style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
            paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderCurve: 'continuous' } as object}>
          <Text style={{ color: theme.labelText, fontSize: 14, fontWeight: '600' }}>← 返回主界面</Text>
        </Pressable>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
