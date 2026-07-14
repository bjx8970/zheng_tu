// 青年人才培养页面（团派线专属）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import { gameDaysToDate } from '@/types/game';

interface TalentProject {
  id: string;
  title: string;
  desc: string;
  icon: string;
  durationDays: number;
  cooldownDays: number;
  rewards: { merit: number; lineKpi: number; bossFavor?: number; abilityBonus?: number };
  rankRequire: number;
  stage: string;
}

const TALENT_PROJECTS: TalentProject[] = [
  {
    id: 'young_cadre', title: '青年干部培养计划', icon: '🎓', stage: '基层',
    desc: '选拔优秀青年干部，通过挂职锻炼、岗位轮换培育后备人才',
    durationDays: 90, cooldownDays: 180, rankRequire: 1,
    rewards: { merit: 12, lineKpi: 8, bossFavor: 3 },
  },
  {
    id: 'talent_exchange', title: '青年人才交流项目', icon: '🔄', stage: '交流',
    desc: '与外地团委开展人才交流，拓宽视野，提升团派影响力',
    durationDays: 60, cooldownDays: 120, rankRequire: 2,
    rewards: { merit: 10, lineKpi: 6, bossFavor: 4 },
  },
  {
    id: 'stem_training', title: '科技青年培育工程', icon: '🔬', stage: '科技',
    desc: '重点培育科技创新青年人才，建立青年科学家培育体系',
    durationDays: 120, cooldownDays: 240, rankRequire: 2,
    rewards: { merit: 16, lineKpi: 10, abilityBonus: 2 },
  },
  {
    id: 'reserve_pool', title: '青年后备干部库', icon: '🗂️', stage: '储备',
    desc: '建立规范化青年后备干部信息库，为组织选拔干部提供有力支撑',
    durationDays: 150, cooldownDays: 365, rankRequire: 3,
    rewards: { merit: 22, lineKpi: 15, bossFavor: 7 },
  },
  {
    id: 'national_program', title: '全国青年英才计划', icon: '🏆', stage: '国家',
    desc: '向上级推荐优秀青年参加全国人才培育计划，提升地方青年工作声誉',
    durationDays: 180, cooldownDays: 365, rankRequire: 4,
    rewards: { merit: 30, lineKpi: 20, bossFavor: 10, abilityBonus: 3 },
  },
];

export default function LeagueTalentPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [acting, setActing] = useState<string | null>(null);
  const [projectStatus, setProjectStatus] = useState<Record<string, { startDay: number; done: boolean }>>({});
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);

  const theme = getRankThemeWithLine(save?.rankLevel ?? 1, save?.careerPathLine ?? '团派线');

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) {
      // 用 careerPathCooldowns 存储 talent 项目状态
      const raw = save.careerPathCooldowns as Record<string, unknown>;
      const status: Record<string, { startDay: number; done: boolean }> = {};
      TALENT_PROJECTS.forEach(p => {
        const key = `talent_proj_${p.id}`;
        if (typeof raw[key] === 'number') {
          const startDay = raw[key] as number;
          const done = typeof raw[`${key}_done`] === 'number';
          status[p.id] = { startDay, done };
        }
      });
      setProjectStatus(status);
    }
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;

  const handleStart = async (proj: TalentProject) => {
    if (acting) return;
    const entry = projectStatus[proj.id];
    if (entry && !entry.done) return;
    // 冷却判断
    const raw = (save.careerPathCooldowns ?? {}) as Record<string, number>;
    const cdKey = `talent_cd_${proj.id}`;
    const lastFinish = raw[cdKey] ?? 0;
    if (lastFinish > 0 && gameDays - lastFinish < proj.cooldownDays) {
      setMsg(`冷却中，还需 ${proj.cooldownDays - (gameDays - lastFinish)} 天`);
      setMsgOk(false);
      return;
    }
    setActing(proj.id);
    const newCooldowns = { ...(save.careerPathCooldowns ?? {}), [`talent_proj_${proj.id}`]: gameDays };
    try {
      await updateGameSave({ careerPathCooldowns: newCooldowns as Record<string, number> });
      setProjectStatus(prev => ({ ...prev, [proj.id]: { startDay: gameDays, done: false } }));
      setMsg(`「${proj.title}」已启动，预计 ${proj.durationDays} 天后可领取成果`);
      setMsgOk(true);
    } catch {
      setMsg('操作失败，请稍后重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  const handleClaim = async (proj: TalentProject) => {
    if (acting) return;
    setActing(proj.id);
    const raw = { ...(save.careerPathCooldowns ?? {}) } as Record<string, number>;
    raw[`talent_proj_${proj.id}_done`] = gameDays;
    raw[`talent_cd_${proj.id}`] = gameDays;
    delete raw[`talent_proj_${proj.id}`];
    const updates: Record<string, unknown> = {
      meritPoints: (save.meritPoints ?? 0) + proj.rewards.merit,
      lineKpiScore: (save.lineKpiScore ?? 0) + proj.rewards.lineKpi,
      careerPathCooldowns: raw as Record<string, number>,
    };
    if (proj.rewards.bossFavor) updates.bossFavor = Math.min(100, (save.bossFavor ?? 60) + proj.rewards.bossFavor);
    if (proj.rewards.abilityBonus) updates.abilityValue = Math.min(100, (save.abilityValue ?? 50) + proj.rewards.abilityBonus);
    try {
      await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
      setProjectStatus(prev => ({ ...prev, [proj.id]: { ...prev[proj.id], done: true } }));
      const parts = [
        `政绩 +${proj.rewards.merit}`,
        `团派积分 +${proj.rewards.lineKpi}`,
        proj.rewards.bossFavor ? `上司好感 +${proj.rewards.bossFavor}` : null,
        proj.rewards.abilityBonus ? `能力 +${proj.rewards.abilityBonus}` : null,
      ].filter(Boolean).join('，');
      setMsg(`「${proj.title}」培养成果已收获！${parts}`);
      setMsgOk(true);
    } catch {
      setMsg('操作失败，请稍后重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
    基层: { bg: '#DBEAFE', text: '#1D4ED8' },
    交流: { bg: '#EDE9FE', text: '#5B21B6' },
    科技: { bg: '#D1FAE5', text: '#065F46' },
    储备: { bg: '#FEF3C7', text: '#92400E' },
    国家: { bg: '#FEE2E2', text: '#991B1B' },
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <StatusBar style="dark" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#166534', flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>团委 · 人才培养</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>青年人才培养</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>团派积分 {save.lineKpiScore ?? 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 6, padding: 10 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 12, fontWeight: '600' }}>{msg}</Text>
          </View>
        )}
        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
          <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 18 }}>
            🎓 青年人才培养是团派线的核心政绩亮点。启动培养项目后需等待完成时间，届时领取奖励并积累团派竞争优势。
          </Text>
        </View>

        {TALENT_PROJECTS.filter(p => p.rankRequire <= save.rankLevel).map(proj => {
          const entry = projectStatus[proj.id];
          const isRunning = entry && !entry.done;
          const daysLeft = isRunning ? Math.max(0, entry.startDay + proj.durationDays - gameDays) : 0;
          const canClaim = isRunning && daysLeft === 0;
          const isDone = entry?.done === true;
          const raw = (save.careerPathCooldowns ?? {}) as Record<string, number>;
          const cdKey = `talent_cd_${proj.id}`;
          const lastFinish = raw[cdKey] ?? 0;
          const cdRemain = isDone && lastFinish > 0 ? Math.max(0, proj.cooldownDays - (gameDays - lastFinish)) : 0;
          const stageStyle = STAGE_COLORS[proj.stage] ?? { bg: '#F3F4F6', text: '#6B7280' };

          return (
            <View key={proj.id} style={{
              backgroundColor: isDone ? '#F0FDF4' : '#fff',
              borderRadius: 10, borderWidth: 1,
              borderColor: canClaim ? '#22C55E' : isRunning ? '#86EFAC' : '#D1FAE5',
              padding: 14,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{proj.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{proj.title}</Text>
                    <View style={{ backgroundColor: stageStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: stageStyle.text, fontWeight: '700' }}>{proj.stage}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 17 }}>{proj.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>政绩 +{proj.rewards.merit}</Text>
                    </View>
                    <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>团派积分 +{proj.rewards.lineKpi}</Text>
                    </View>
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>历时 {proj.durationDays}天</Text>
                    </View>
                  </View>
                </View>
              </View>

              {isRunning && (
                <View style={{ marginTop: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 11, color: '#6B7280' }}>
                      进度 {Math.round(Math.min(1, (gameDays - entry.startDay) / proj.durationDays) * 100)}%
                    </Text>
                    <Text style={{ fontSize: 11, color: daysLeft === 0 ? '#15803D' : '#6B7280', fontWeight: daysLeft === 0 ? '700' : '400' }}>
                      {daysLeft === 0 ? '✅ 可领取！' : `剩余 ${daysLeft} 天`}
                    </Text>
                  </View>
                  <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                    <View style={{
                      height: 6,
                      width: `${Math.round(Math.min(1, (gameDays - entry.startDay) / proj.durationDays) * 100)}%`,
                      backgroundColor: canClaim ? '#22C55E' : '#166834',
                      borderRadius: 3,
                    }} />
                  </View>
                </View>
              )}

              <Pressable
                onPress={() => {
                  if (acting) return;
                  if (canClaim) void handleClaim(proj);
                  else if (!isRunning) void handleStart(proj);
                }}
                disabled={!!acting || (isRunning && !canClaim) || (isDone && cdRemain > 0)}
                style={{
                  marginTop: 12, borderRadius: 7, paddingVertical: 10, alignItems: 'center',
                  backgroundColor:
                    canClaim ? '#22C55E' :
                    isRunning ? '#E5E7EB' :
                    isDone && cdRemain > 0 ? '#F3F4F6' :
                    acting === proj.id ? '#9CA3AF' : '#166534',
                }}
              >
                <Text style={{
                  fontSize: 13, fontWeight: '700',
                  color: canClaim ? '#fff' : isRunning ? '#6B7280' : isDone && cdRemain > 0 ? '#9CA3AF' : '#fff',
                }}>
                  {acting === proj.id ? '处理中...' :
                   canClaim ? '🎉 领取培养成果' :
                   isRunning ? `培养中（剩余 ${daysLeft} 天）` :
                   isDone && cdRemain > 0 ? `冷却中 (${cdRemain}天)` :
                   isDone ? '重启项目' : '启动培养计划'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
