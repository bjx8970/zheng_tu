import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { getTasksForRank, type CareerLine, type LineTask } from '@/lib/lineGameplay';
import { getLineTheme, LINE_ICON } from '@/lib/lineTheme';

export default function LineTasks() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave, refreshSave } = useGame();
  const [storyTask, setStoryTask] = useState<LineTask | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  // 每次聚焦时从 DB 刷新存档（确保任务状态最新）
  useFocusEffect(React.useCallback(() => { refreshSave(); }, []));

  if (!save) return null;

  const line = (save.careerPathLine ?? '行政线') as CareerLine;
  const rank = save.rankLevel ?? 1;
  const theme = getLineTheme(line, rank);
  const tasks = getTasksForRank(line, rank);
  const isDark = rank >= 12;
  // 从持久化存档读取任务状态，无需本地 state，翻页不丢失
  const taskState = save.lineTaskState ?? {};

  function getTaskEntry(key: string) { return taskState[key]; }
  function isCompleted(key: string) { return taskState[key]?.completed === true; }
  function isActive(key: string) { const e = taskState[key]; return e !== undefined && !e.completed; }

  function getDaysLeft(key: string, durationDays: number): number {
    const e = taskState[key];
    if (!e) return durationDays;
    return Math.max(0, e.startDay + durationDays - (save?.gameDays ?? 0));
  }
  function getProgress(key: string, durationDays: number): number {
    const e = taskState[key];
    if (!e) return 0;
    const elapsed = (save?.gameDays ?? 0) - e.startDay;
    return Math.min(1, elapsed / durationDays);
  }

  async function startTask(task: LineTask) {
    if (!save || processing) return;
    setProcessing(task.key);
    const newState = {
      ...taskState,
      [task.key]: { startDay: save.gameDays, completed: false },
    };
    await updateGameSave({ lineTaskState: newState });
    setProcessing(null);
  }

  async function completeTask(task: LineTask) {
    if (!save || processing) return;
    setProcessing(task.key);
    const newState = {
      ...taskState,
      [task.key]: { startDay: taskState[task.key]?.startDay ?? save.gameDays, completed: true },
    };
    await updateGameSave({
      meritPoints: (save.meritPoints ?? 0) + task.reward.meritPoints,
      bossFavor: Math.min(100, (save.bossFavor ?? 60) + task.reward.bossFavor),
      lineKpiScore: (save.lineKpiScore ?? 0) + (task.reward.lineKpi ?? 0),
      lineTaskState: newState,
    });
    setStoryTask(task);
    setProcessing(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: theme.primary, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 }}>
            {LINE_ICON[line]} 上级专属任务
          </Text>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 }}>
          上级已针对{line}下发 {tasks.length} 项专属任务，完成后获得政绩与好感奖励
        </Text>
      </View>

      {/* 剧情完成弹窗（绝对定位遮罩） */}
      {storyTask && (
        <Pressable
          onPress={() => setStoryTask(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ backgroundColor: theme.cardBg, borderRadius: 16, padding: 20, marginHorizontal: 24, borderWidth: 2, borderColor: theme.primary }}>
            <Text style={{ fontSize: 22, textAlign: 'center', marginBottom: 8 }}>🎉</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.titleColor, textAlign: 'center', marginBottom: 8 }}>任务完成！</Text>
            <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textColor, textAlign: 'center', marginBottom: 12 }}>{storyTask.name}</Text>
            {storyTask.story.map((s, i) => (
              <Text key={i} style={{ fontSize: 13, color: theme.textColor, marginBottom: 5, lineHeight: 20 }}>• {s}</Text>
            ))}
            <View style={{ marginTop: 12, padding: 10, backgroundColor: '#e8f5e9', borderRadius: 10 }}>
              <Text style={{ fontSize: 13, color: '#2a7a3b', fontWeight: '600' }}>
                奖励：政绩+{storyTask.reward.meritPoints} · 上司好感+{storyTask.reward.bossFavor}{storyTask.reward.lineKpi ? ` · 路线积分+${storyTask.reward.lineKpi}` : ''}
              </Text>
            </View>
            <Pressable
              onPress={() => setStoryTask(null)}
              style={{ marginTop: 14, backgroundColor: theme.primary, borderRadius: 10, padding: 10, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700' }}>收下奖励</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {tasks.length === 0 ? (
          <View style={{ alignItems: 'center', padding: 48 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
            <Text style={{ fontSize: 15, color: theme.descColor, textAlign: 'center' }}>暂无专属任务，晋升后将解锁更多</Text>
          </View>
        ) : tasks.map(task => {
          const done = isCompleted(task.key);
          const active = isActive(task.key);
          const entry = getTaskEntry(task.key);
          const busy = processing === task.key;
          const daysLeft = getDaysLeft(task.key, task.durationDays);
          const progress = getProgress(task.key, task.durationDays);
          const canComplete = active && daysLeft === 0;

          return (
            <View
              key={task.key}
              style={{
                backgroundColor: done ? '#f0fdf4' : theme.cardBg,
                borderRadius: 14, borderWidth: 1,
                borderColor: done ? '#86efac' : active ? theme.primary : theme.border,
                padding: 16,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 26 }}>{task.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: done ? '#15803d' : theme.titleColor }}>{task.name}</Text>
                  <Text style={{ fontSize: 12, color: theme.descColor, lineHeight: 18, marginTop: 2 }}>{task.desc}</Text>
                </View>
                {done && <Text style={{ fontSize: 20 }}>✅</Text>}
                {!done && !active && (
                  <View style={{ backgroundColor: '#eff6ff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 10, color: '#1d4ed8' }}>{task.durationDays}天</Text>
                  </View>
                )}
              </View>

              {/* 奖励预览 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                <View style={{ backgroundColor: '#e8f5e9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: '#2a7a3b' }}>政绩+{task.reward.meritPoints}</Text>
                </View>
                <View style={{ backgroundColor: '#fff3e0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: '#e65100' }}>上司好感+{task.reward.bossFavor}</Text>
                </View>
                {(task.reward.lineKpi ?? 0) > 0 && (
                  <View style={{ backgroundColor: '#e3f2fd', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: '#1565c0' }}>路线积分+{task.reward.lineKpi}</Text>
                  </View>
                )}
              </View>

              {/* 进度条（任务进行中） */}
              {active && entry && (
                <View style={{ marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: theme.descColor }}>进度 {Math.round(progress * 100)}%</Text>
                    <Text style={{ fontSize: 11, color: theme.descColor }}>
                      {daysLeft === 0 ? '✅ 可领取' : `剩余 ${daysLeft} 天`}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#e5e7eb', borderRadius: 3 }}>
                    <View style={{ height: 6, width: `${Math.round(progress * 100)}%`, backgroundColor: canComplete ? '#22c55e' : theme.primary, borderRadius: 3 }} />
                  </View>
                </View>
              )}

              {/* 操作按钮 */}
              {!done && (
                <Pressable
                  onPress={() => {
                    if (busy) return;
                    if (canComplete) { void completeTask(task); }
                    else if (!active) { void startTask(task); }
                    // active && !canComplete: 进行中，不可操作，显示进度即可
                  }}
                  style={{
                    borderRadius: 10, paddingVertical: 10, alignItems: 'center',
                    backgroundColor: busy ? '#e5e7eb' : canComplete ? '#22c55e' : active ? '#e5e7eb' : theme.primary,
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  <Text style={{ color: busy ? '#999' : canComplete ? '#fff' : active ? '#666' : '#fff', fontSize: 13, fontWeight: '700' }}>
                    {busy ? '处理中…' : canComplete ? '🎉 领取奖励' : active ? `执行中（还需 ${daysLeft} 天）` : '接受任务'}
                  </Text>
                </Pressable>
              )}
              {done && (
                <View style={{ borderRadius: 10, paddingVertical: 10, alignItems: 'center', backgroundColor: '#dcfce7' }}>
                  <Text style={{ color: '#15803d', fontSize: 13, fontWeight: '700' }}>✅ 任务已完成</Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
