// 上司关系与任务页面（四大系统感知版）
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getBossTasks, completeTask, addNewTask, postponeTask,
  getBossInteractions, performBossAction,
} from '@/db/gameApi';
import type { BossTask } from '@/types/game';
import type { BossInteraction } from '@/db/gameApi';
import { gameDaysToDate } from '@/types/game';

// ── 类型 ──
type PageTab = 'relation' | 'tasks';
type BossStyle = 'result' | 'relation' | 'steady' | 'dominant' | 'expert';
type ActionType = 'report' | 'consult' | 'greet';

// ── 四大系统元信息 ──
const SYSTEM_META: Record<string, { name: string; kpiLabel: string; color: string; icon: string; deptLabel: string }> = {
  '党务线': { name: '党委工作系统', kpiLabel: '党建工作考核', color: '#8B1A1A', icon: '🔴', deptLabel: '党务办' },
  '纪检线': { name: '政法综治系统', kpiLabel: '廉政指数考核', color: '#4A235A', icon: '⚖️', deptLabel: '派出所/信访室' },
  '行政线': { name: '政府职能系统', kpiLabel: '城市治理考核', color: '#1A3A5C', icon: '🏛️', deptLabel: '发改站·财政所·建设站·教育办·卫生站·环保站·市监所·农业站·人事办·招商办·税务所' },
  '团派线': { name: '团派系统',     kpiLabel: '青年工作考核', color: '#1a7a4a', icon: '🌱', deptLabel: '团委' },
};

// ── 从 title "[站所名]任务标题" 解析站所标签 ──
function parseDeptTag(title: string): { dept: string; cleanTitle: string } {
  const m = title.match(/^\[([^\]]+)\]/);
  if (m) return { dept: m[1], cleanTitle: title.slice(m[0].length).trim() };
  return { dept: '', cleanTitle: title };
}

// ── 上司个性风格 ──
function getBossStyle(name: string): BossStyle {
  if (!name) return 'steady';
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const styles: BossStyle[] = ['result', 'relation', 'steady', 'dominant', 'expert'];
  return styles[hash % styles.length];
}

const STYLE_META: Record<BossStyle, { label: string; color: string; desc: string; tip: string }> = {
  result:   { label: '结果导向', color: '#C82829', desc: '只看成绩、重视数字、不谈虚的', tip: '汇报工作效果更佳 (+40%)' },
  relation: { label: '关系优先', color: '#7B3F00', desc: '人情往来、广结善缘、情感投入型', tip: '请示事项效果更佳 (+25%)' },
  steady:   { label: '保守稳健', color: '#2B4B6F', desc: '求稳为主、中规中矩、不喜冒进', tip: '各种操作效果均衡' },
  dominant: { label: '强势主导', color: '#4A235A', desc: '独断专行、要求服从、容不得违拗', tip: '汇报工作有效，请示事项适得其反' },
  expert:   { label: '技术专家', color: '#1A5276', desc: '注重实务、依靠数据、不讲政治', tip: '汇报工作效果最佳 (+60%)' },
};

const ACTION_MULTIPLIER: Record<BossStyle, Record<ActionType, number>> = {
  result:   { report: 1.4, consult: 0.75, greet: 0.67 },
  relation: { report: 0.8, consult: 1.25, greet: 1.67 },
  steady:   { report: 1.0, consult: 1.0,  greet: 1.0  },
  dominant: { report: 1.2, consult: 0.5,  greet: 0.67 },
  expert:   { report: 1.6, consult: 0.75, greet: 0.33 },
};

const ACTION_META: Record<ActionType, { label: string; energyCost: number; baseFavor: number; icon: string; desc: string }> = {
  report:  { label: '汇报工作', energyCost: 10, baseFavor: 5, icon: '📊', desc: '向上司汇报近期工作进展，展示执行力与成效。' },
  consult: { label: '请示事项', energyCost: 15, baseFavor: 8, icon: '🤝', desc: '就重大决策事前请示，体现对上司权威的尊重。' },
  greet:   { label: '节日问候', energyCost: 5,  baseFavor: 3, icon: '🎉', desc: '节假日送去问候，维持日常人情关系。' },
};

function getFavorLevel(favor: number): { label: string; color: string } {
  if (favor >= 85) return { label: '深度信赖', color: '#2a7a3b' };
  if (favor >= 70) return { label: '器重有加', color: '#2B6CB0' };
  if (favor >= 55) return { label: '关系融洽', color: '#276749' };
  if (favor >= 40) return { label: '正常同事', color: '#888' };
  if (favor >= 25) return { label: '态度冷淡', color: '#e67e22' };
  return { label: '关系紧张', color: '#C82829' };
}

function getBossInfo(level: number, save: { bossName: string; boss2Name: string; boss3Name: string; bossFavor: number; boss2Favor: number; boss3Favor: number }) {
  if (level === 2) return { label: '分管上司', name: save.boss2Name, favor: save.boss2Favor, rankHint: '上级主管领导' };
  if (level === 3) return { label: '主要领导', name: save.boss3Name, favor: save.boss3Favor, rankHint: '上级核心领导' };
  return { label: '直属上司', name: save.bossName, favor: save.bossFavor, rankHint: '直接管辖上司' };
}

// ── 冷却检查（30天）——使用稳定的 ref 存储快照，避免重渲染 ──
const COOLDOWN = 30;
function getCooldownRemain(level: number, action: ActionType, gameDays: number, interactions: BossInteraction[]): number {
  const last = interactions
    .filter(i => i.bossLevel === level && i.actionType === action)
    .sort((a, b) => b.gameDay - a.gameDay)[0];
  if (!last) return 0;
  const remain = COOLDOWN - (gameDays - last.gameDay);
  return remain > 0 ? remain : 0;
}

const TASK_TYPE_LABEL: Record<string, string> = {
  merit: '政绩考核', city: '城市发展', security: '治安维稳',
};

const URGENCY_META: Record<string, { label: string; color: string; bg: string }> = {
  normal:    { label: '普通', color: '#555', bg: '#f5f5f5' },
  important: { label: '重要', color: '#1A5276', bg: '#EBF5FB' },
  urgent:    { label: '紧急', color: '#C82829', bg: '#FFEBEE' },
};

function getTaskProgress(
  task: BossTask,
  save: { cityGdp: number; cityLivelihood: number; cityBusiness: number; securityIndex: number; meritPoints: number },
): number {
  switch (task.taskType) {
    case 'city': {
      const t = task.title;
      if (t.includes('GDP') || t.includes('财政') || t.includes('营商') || t.includes('园区') ||
          t.includes('项目') || t.includes('招商') || t.includes('税收') || t.includes('经济'))
        return save.cityGdp;
      if (t.includes('民生') || t.includes('老旧') || t.includes('医疗') || t.includes('教育') ||
          t.includes('卫生') || t.includes('农田') || t.includes('乡村') || t.includes('青年') ||
          t.includes('帮扶') || t.includes('安全生产') || t.includes('食品'))
        return save.cityLivelihood;
      if (t.includes('舆情') || t.includes('意识形态') || t.includes('廉政') || t.includes('党史') ||
          t.includes('反诈') || t.includes('禁毒') || t.includes('网络文明'))
        return (save.cityGdp + save.cityLivelihood + save.cityBusiness) / 3;
      return (save.cityGdp + save.cityLivelihood + save.cityBusiness) / 3;
    }
    case 'security': return save.securityIndex;
    case 'merit':    return Math.min(task.targetValue, save.meritPoints);
    default:         return 0;
  }
}

function isTaskComplete(task: BossTask, save: { cityGdp: number; cityLivelihood: number; cityBusiness: number; securityIndex: number; meritPoints: number }): boolean {
  return getTaskProgress(task, save) >= task.targetValue;
}

function progressColor(pct: number): string {
  if (pct < 25) return '#C82829';
  if (pct < 60) return '#e67e22';
  return '#2a7a3b';
}

function FavorBar({ value, color }: { value: number; color: string }) {
  return (
    <View style={{ height: 6, backgroundColor: '#EEE', flex: 1, borderRadius: 3 }}>
      <View style={{ height: 6, width: `${value}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ── 主组件 ──
export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [activeTab, setActiveTab] = useState<PageTab>('relation');
  const [tasks, setTasks] = useState<BossTask[]>([]);
  const [interactions, setInteractions] = useState<BossInteraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [postponingId, setPostponingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 使用 saveId + gameDays 作为稳定依赖，避免 save 对象引用变化触发无限刷新
  const saveId = save?.id;
  const gameDays = save?.gameDays ?? 0;

  useFocusEffect(
    useCallback(() => {
      if (!saveId) return;
      setLoading(true);
      Promise.all([
        getBossTasks(saveId),
        getBossInteractions(saveId),
      ]).then(([t, i]) => {
        setTasks(t);
        setInteractions(i);
        setLoading(false);
      });
    }, [saveId])
  );

  // 用 ref 保存最新 interactions，供 handleAction 同步读取（避免闭包旧值问题）
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  // 当前路线系统信息
  const lineKey = (save?.careerPathLine ?? '行政线') as string;
  const sysMeta = SYSTEM_META[lineKey] ?? SYSTEM_META['行政线'];

  // ── 关系经营操作 ──
  const handleAction = async (bossLevel: number, action: ActionType) => {
    if (!save) return;
    const key = `${bossLevel}-${action}`;
    setActionLoading(key);
    const meta = ACTION_META[action];
    const currentEnergy = (save as unknown as Record<string, number>).playerEnergy ?? 100;

    if (currentEnergy < meta.energyCost) {
      showFeedback(`精力不足（需要${meta.energyCost}点，当前${currentEnergy}点）`, false);
      setActionLoading(null);
      return;
    }

    // 用 ref 读取最新互动记录，确保冷却计算准确
    const currentInteractions = interactionsRef.current;
    const remain = getCooldownRemain(bossLevel, action, save.gameDays, currentInteractions);
    if (remain > 0) {
      showFeedback(`操作冷却中，还需等待 ${remain} 天`, false);
      setActionLoading(null);
      return;
    }

    const baseDelta = await performBossAction(save.id, bossLevel, action, save.gameDays, currentInteractions);
    if (baseDelta === 0) {
      showFeedback('操作失败，请重试', false);
      setActionLoading(null);
      return;
    }

    const bossInfo = getBossInfo(bossLevel, save);
    const style = getBossStyle(bossInfo.name);
    const mult = ACTION_MULTIPLIER[style][action];
    const finalDelta = Math.round(baseDelta * mult);

    const favUpdate = bossLevel === 2
      ? { boss2Favor: Math.min(100, save.boss2Favor + finalDelta) }
      : bossLevel === 3
        ? { boss3Favor: Math.min(100, save.boss3Favor + finalDelta) }
        : { bossFavor: Math.min(100, save.bossFavor + finalDelta) };

    const energyUpdate = currentEnergy > 0 ? { playerEnergy: Math.max(0, currentEnergy - meta.energyCost) } : {};

    await updateGameSave({ ...favUpdate, ...energyUpdate });
    // 刷新互动记录（立即更新 ref，防止双击重复触发）
    const fresh = await getBossInteractions(save.id);
    setInteractions(fresh);
    interactionsRef.current = fresh;

    showFeedback(`✓ 已${meta.label}——与${bossInfo.name || '上司'}好感 +${finalDelta}（${STYLE_META[style].label}风格）`, true);
    setActionLoading(null);
  };

  // ── 任务操作 ──
  const handleComplete = async (task: BossTask) => {
    if (!save) return;
    if (!isTaskComplete(task, save)) {
      showFeedback('任务条件尚未达成，请继续努力！', false);
      return;
    }
    await completeTask(task.id);
    const favField = task.bossLevel === 2
      ? { boss2Favor: Math.min(100, save.boss2Favor + task.rewardFavor) }
      : task.bossLevel === 3
        ? { boss3Favor: Math.min(100, save.boss3Favor + task.rewardFavor) }
        : { bossFavor: Math.min(100, save.bossFavor + task.rewardFavor) };
    await updateGameSave({ meritPoints: save.meritPoints + task.rewardMerit, ...favField });
    showFeedback(`✓ 任务完成！获得政绩+${task.rewardMerit}，好感+${task.rewardFavor}`, true);
    getBossTasks(save.id).then(setTasks);
  };

  const handlePostpone = async (task: BossTask) => {
    if (!save) return;
    if (task.isPostponed) { showFeedback('已申请过延期，不可重复申请', false); return; }
    if (save.meritPoints < 10) { showFeedback('申请减负需消耗10政绩（当前不足）', false); return; }
    setPostponingId(task.id);
    const ok = await postponeTask(task.id, 30);
    if (ok) {
      await updateGameSave({ meritPoints: save.meritPoints - 10 });
      showFeedback('减负申请已通过，任务期限延长30天', true);
      getBossTasks(save.id).then(setTasks);
    } else {
      showFeedback('申请失败，请重试', false);
    }
    setPostponingId(null);
  };

  const handleRequestNewTask = async () => {
    if (!save) return;
    const activeTasks = tasks.filter(t => t.status === 'active');
    if (activeTasks.length >= 5) { showFeedback('当前任务过多，请先完成现有任务', false); return; }
    await addNewTask(save.id, save.userId, save.gameDays, save.careerPathLine);
    getBossTasks(save.id).then(setTasks);
    showFeedback(`${sysMeta.name}已下达新任务`, true);
  };

  const activeTasks = tasks.filter(t => t.status === 'active');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // ── 渲染：上司档案卡 ──
  const renderBossCard = (level: number) => {
    if (!save) return null;
    const info = getBossInfo(level, save);
    if (!info.name) return null;
    const style = getBossStyle(info.name);
    const styleMeta = STYLE_META[style];
    const favorLevel = getFavorLevel(info.favor);
    const actions: ActionType[] = ['report', 'consult', 'greet'];

    return (
      <View key={level} style={{
        backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0',
        borderLeftWidth: 3, borderLeftColor: styleMeta.color,
        marginBottom: 14, padding: 14,
      }}>
        {/* 上司基础信息 */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 }}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={{ fontSize: 9, color: '#888', letterSpacing: 1 }}>{info.label}</Text>
              <Text style={{ fontSize: 9, color: '#aaa' }}>{info.rankHint}</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A', letterSpacing: 0.5 }}>{info.name}</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: styleMeta.color, paddingHorizontal: 7, paddingVertical: 3 }}>
            <Text style={{ fontSize: 10, color: styleMeta.color, fontWeight: '700' }}>{styleMeta.label}</Text>
          </View>
        </View>

        <Text style={{ fontSize: 11, color: '#666', marginBottom: 10, lineHeight: 16 }}>{styleMeta.desc}</Text>

        {/* 好感度仪表 */}
        <View style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <Text style={{ fontSize: 10, color: '#888' }}>上司好感度</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: favorLevel.color, fontVariant: ['tabular-nums'] }}>
                {info.favor}
              </Text>
              <View style={{ borderWidth: 1, borderColor: favorLevel.color, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: favorLevel.color, fontWeight: '600' }}>{favorLevel.label}</Text>
              </View>
            </View>
          </View>
          <FavorBar value={info.favor} color={favorLevel.color} />
          <Text style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>
            {info.favor >= 70 ? '🔑 晋升推荐加成已激活' :
              info.favor >= 55 ? '📋 年度考核评优有利' :
                info.favor < 30 ? '⚠️ 注意！关系恶化可能影响晋升' : '维护好感，有助于年底评定'}
          </Text>
        </View>

        <View style={{ height: 1, backgroundColor: '#F0F0F0', marginBottom: 10 }} />
        <Text style={{ fontSize: 10, color: '#999', marginBottom: 8 }}>💡 {styleMeta.tip}</Text>

        {/* 三种操作按钮 */}
        <View style={{ gap: 6 }}>
          {actions.map(action => {
            const meta = ACTION_META[action];
            const mult = ACTION_MULTIPLIER[style][action];
            const estFavor = Math.round(meta.baseFavor * mult);
            const remain = getCooldownRemain(level, action, gameDays, interactionsRef.current);
            const onCooldown = remain > 0;
            const aKey = `${level}-${action}`;
            const isLoading = actionLoading === aKey;

            return (
              <Pressable
                key={action}
                onPress={() => void handleAction(level, action)}
                disabled={onCooldown || !!actionLoading}
                style={{
                  flexDirection: 'row', alignItems: 'center',
                  borderWidth: 1,
                  borderColor: onCooldown ? '#DDD' : styleMeta.color,
                  backgroundColor: onCooldown ? '#FAFAFA' : '#fff',
                  paddingVertical: 8, paddingHorizontal: 10,
                }}
              >
                <Text style={{ fontSize: 14, marginRight: 8 }}>{meta.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: onCooldown ? '#BBB' : '#222' }}>
                    {meta.label}
                    <Text style={{ fontSize: 10, fontWeight: '400', color: '#aaa' }}>  消耗精力{meta.energyCost}</Text>
                  </Text>
                  <Text style={{ fontSize: 10, color: '#888', lineHeight: 14, marginTop: 1 }}>{meta.desc}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2, minWidth: 64 }}>
                  {onCooldown ? (
                    <Text style={{ fontSize: 10, color: '#BBB' }}>冷却{remain}天</Text>
                  ) : isLoading ? (
                    <ActivityIndicator size="small" color={styleMeta.color} />
                  ) : (
                    <>
                      <Text style={{ fontSize: 12, color: styleMeta.color, fontWeight: '700' }}>+{estFavor} 好感</Text>
                      {mult !== 1 && (
                        <Text style={{ fontSize: 9, color: '#aaa' }}>
                          {mult > 1 ? `×${mult.toFixed(2)} ↑` : `×${mult.toFixed(2)} ↓`}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  // ── 渲染：任务卡片 ──
  const renderTask = (task: BossTask) => {
    if (!save) return null;
    const canComplete = isTaskComplete(task, save);
    const rawProgress = getTaskProgress(task, save);
    const pctNum = Math.min(100, Math.round((rawProgress / task.targetValue) * 100));
    const barColor = progressColor(pctNum);
    const remainDays = task.deadlineDays - save.gameDays;
    const isNearDeadline = remainDays < 90 && task.status === 'active';
    const urgencyMeta = URGENCY_META[task.urgency] ?? URGENCY_META.normal;
    const { dept, cleanTitle } = parseDeptTag(task.title);

    return (
      <View key={task.id} style={{
        backgroundColor: '#fff', borderWidth: 1,
        borderColor: isNearDeadline ? '#FFCDD2' : '#E0E0E0',
        borderLeftWidth: 3,
        borderLeftColor: task.urgency === 'urgent' ? '#C82829' : task.urgency === 'important' ? '#1A5276' : '#bbb',
        padding: 13, marginBottom: 10,
      }}>
        {/* 标签行 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6, flexWrap: 'wrap' }}>
          {/* 来源站所标签 */}
          {dept !== '' && (
            <View style={{ backgroundColor: sysMeta.color, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{dept}</Text>
            </View>
          )}
          <View style={{ borderWidth: 1, borderColor: '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, color: '#2B4B6F', fontWeight: '600' }}>{TASK_TYPE_LABEL[task.taskType] ?? task.taskType}</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: urgencyMeta.color, backgroundColor: urgencyMeta.bg, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ fontSize: 9, color: urgencyMeta.color, fontWeight: '700' }}>{urgencyMeta.label}</Text>
          </View>
          {task.isPostponed && (
            <View style={{ borderWidth: 1, borderColor: '#e67e22', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#e67e22' }}>已延期</Text>
            </View>
          )}
          <Text style={{ fontSize: 10, color: remainDays < 90 ? '#C82829' : '#aaa', marginLeft: 'auto' }}>
            截止 {gameDaysToDate(task.deadlineDays)}（剩{remainDays}天）
          </Text>
        </View>

        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>{cleanTitle}</Text>
        <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginBottom: 10 }}>{task.description}</Text>

        {/* 进度条 */}
        <View style={{ marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ fontSize: 10, color: '#888' }}>完成进度</Text>
            <Text style={{ fontSize: 10, color: barColor, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
              {rawProgress.toFixed(0)} / {task.targetValue}（{pctNum}%）
            </Text>
          </View>
          <View style={{ height: 5, backgroundColor: '#E8E6E2' }}>
            <View style={{ height: 5, width: `${pctNum}%`, backgroundColor: barColor }} />
          </View>
        </View>

        {/* 奖惩说明 */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 10 }}>
          <View style={{ flex: 1, backgroundColor: '#F0FFF4', padding: 6 }}>
            <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700', marginBottom: 2 }}>完成奖励</Text>
            <Text style={{ fontSize: 10, color: '#2a7a3b' }}>政绩 +{task.rewardMerit}  好感 +{task.rewardFavor}</Text>
          </View>
          {(task.penaltyMerit > 0 || task.penaltyFavor > 0) && (
            <View style={{ flex: 1, backgroundColor: isNearDeadline ? '#FFEBEE' : '#FFF8F8', padding: 6 }}>
              <Text style={{ fontSize: 9, color: '#C82829', fontWeight: '700', marginBottom: 2 }}>
                {isNearDeadline ? '⚠️ 即将超时惩罚' : '超时惩罚'}
              </Text>
              <Text style={{ fontSize: 10, color: '#C82829' }}>政绩 -{task.penaltyMerit}  好感 -{task.penaltyFavor}</Text>
            </View>
          )}
        </View>

        {/* 操作按钮 */}
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 6 }}>
          <Pressable
            onPress={() => void handlePostpone(task)}
            disabled={task.isPostponed || postponingId === task.id}
            style={{
              paddingHorizontal: 10, paddingVertical: 6,
              borderWidth: 1, borderColor: task.isPostponed ? '#CCC' : '#e67e22',
              backgroundColor: '#fff',
            }}
          >
            <Text style={{ fontSize: 10, color: task.isPostponed ? '#CCC' : '#e67e22', fontWeight: '600' }}>
              {postponingId === task.id ? '...' : task.isPostponed ? '已延期' : '申请减负 -10政'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => void handleComplete(task)}
            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: canComplete ? '#2a7a3b' : '#CCC' }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
              {canComplete ? '领取奖励' : '未达成'}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶部导航栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 0, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
              <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
            </Pressable>
            <View>
              <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>BOSS</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>上司关系与任务</Text>
            </View>
          </View>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>{save?.rankName}</Text>
        </View>

        {/* 系统标识横条 */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: sysMeta.color + '22', borderWidth: 1, borderColor: sysMeta.color + '55',
          paddingHorizontal: 10, paddingVertical: 5, marginBottom: 10,
        }}>
          <Text style={{ fontSize: 12 }}>{sysMeta.icon}</Text>
          <Text style={{ fontSize: 11, color: sysMeta.color === '#1A3A5C' ? '#a0b4cc' : '#fff', fontWeight: '700', flex: 1 }}>
            {sysMeta.name}
          </Text>
          <Text style={{ fontSize: 9, color: '#7a93b0' }}>{sysMeta.deptLabel.split('·')[0]}</Text>
        </View>

        {/* Tab 切换 */}
        <View style={{ flexDirection: 'row' }}>
          {(['relation', 'tasks'] as PageTab[]).map(tab => {
            const label = tab === 'relation' ? '上司关系' : `上级任务${activeTasks.length > 0 ? `（${activeTasks.length}）` : ''}`;
            const active = activeTab === tab;
            return (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={{
                  flex: 1, paddingVertical: 9, alignItems: 'center',
                  borderBottomWidth: active ? 2 : 0,
                  borderBottomColor: active ? '#e8c97a' : 'transparent',
                }}
              >
                <Text style={{ fontSize: 13, fontWeight: active ? '700' : '400', color: active ? '#e8c97a' : '#7a93b0' }}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback !== '' && (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C82829" />
        </View>
      ) : activeTab === 'relation' ? (
        /* ═══════ Tab：上司关系 ═══════ */
        <ScrollView contentContainerStyle={{ padding: 14 }} contentInsetAdjustmentBehavior="automatic">
          <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F5D98A', padding: 10, marginBottom: 14 }}>
            <Text style={{ fontSize: 11, color: '#7a6200', lineHeight: 17 }}>
              {'💡 体制内生存法则：主动维护上司关系，是晋升的隐性前提。不同上司有不同偏好，选择正确的方式事半功倍。每种操作每30天只能使用一次。'}
            </Text>
          </View>
          {[1, 2, 3].map(level => {
            if (!save) return null;
            const info = getBossInfo(level, save);
            if (!info.name) return null;
            return renderBossCard(level);
          })}
        </ScrollView>
      ) : (
        /* ═══════ Tab：上级任务 ═══════ */
        <ScrollView contentContainerStyle={{ padding: 14 }} contentInsetAdjustmentBehavior="automatic">
          {/* 系统任务说明 */}
          <View style={{
            backgroundColor: sysMeta.color + '11', borderWidth: 1, borderColor: sysMeta.color + '44',
            borderLeftWidth: 3, borderLeftColor: sysMeta.color,
            padding: 10, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: sysMeta.color, marginBottom: 3 }}>
              {sysMeta.icon} {sysMeta.kpiLabel} · 上级任务
            </Text>
            <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
              {'所属系统上级依据岗位职能下达专项任务。完成任务可获政绩与上司好感，超时未完成将受到相应处分。'}
            </Text>
          </View>

          {/* 申请新任务 */}
          <Pressable
            onPress={() => void handleRequestNewTask()}
            style={{
              flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
              borderWidth: 1, borderColor: sysMeta.color,
              padding: 10, marginBottom: 14, backgroundColor: '#fff',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12 }}>{sysMeta.icon}</Text>
              <Text style={{ fontSize: 12, color: sysMeta.color, fontWeight: '700' }}>申请{sysMeta.deptLabel.split('·')[0]}新任务</Text>
            </View>
            <Text style={{ fontSize: 11, color: '#aaa' }}>当前{activeTasks.length}/5 ›</Text>
          </Pressable>

          {activeTasks.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Text style={{ fontSize: 20, marginBottom: 8 }}>{sysMeta.icon}</Text>
              <Text style={{ color: '#888', fontSize: 14 }}>暂无进行中的任务</Text>
              <Text style={{ color: '#aaa', fontSize: 12, marginTop: 6 }}>向{sysMeta.name}申请新任务，展现工作主动性</Text>
            </View>
          ) : (
            <>
              {[1, 2, 3].map(level => {
                if (!save) return null;
                const levelTasks = activeTasks.filter(t => t.bossLevel === level);
                if (levelTasks.length === 0) return null;
                const info = getBossInfo(level, save);
                const style = getBossStyle(info.name);
                const styleMeta = STYLE_META[style];
                return (
                  <View key={level} style={{ marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                      <View style={{ width: 3, height: 16, backgroundColor: styleMeta.color }} />
                      <Text style={{ fontSize: 12, color: styleMeta.color, fontWeight: '700', letterSpacing: 0.5 }}>
                        {info.label}：{info.name}
                      </Text>
                      <View style={{ borderWidth: 1, borderColor: styleMeta.color, paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: styleMeta.color }}>{styleMeta.label}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>{levelTasks.length}个任务</Text>
                    </View>
                    {levelTasks.map(renderTask)}
                  </View>
                );
              })}
            </>
          )}

          {/* 已完成任务折叠 */}
          {completedTasks.length > 0 && (
            <View style={{ marginTop: 4 }}>
              <Pressable
                onPress={() => setShowHistory(v => !v)}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E0E0E0' }}
              >
                <Text style={{ fontSize: 12, color: '#888', letterSpacing: 1 }}>已完成任务历史</Text>
                <Text style={{ fontSize: 11, color: '#2B4B6F' }}>{showHistory ? '收起' : `${completedTasks.length}项 ›`}</Text>
              </Pressable>
              {showHistory && completedTasks.map(t => {
                const { dept: cDept, cleanTitle: cTitle } = parseDeptTag(t.title);
                return (
                  <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#EEE', padding: 10, marginBottom: 6 }}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      {cDept !== '' && (
                        <Text style={{ fontSize: 9, color: sysMeta.color, fontWeight: '700', marginBottom: 2 }}>{cDept}</Text>
                      )}
                      <Text style={{ fontSize: 12, color: '#555', fontWeight: '600' }}>{cTitle}</Text>
                      <Text style={{ fontSize: 10, color: '#aaa' }}>{TASK_TYPE_LABEL[t.taskType]} · {gameDaysToDate(t.createdDay)}完成</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 10, color: '#2a7a3b' }}>+{t.rewardMerit}政绩</Text>
                      <Text style={{ fontSize: 10, color: '#2B4B6F' }}>+{t.rewardFavor}好感</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}


