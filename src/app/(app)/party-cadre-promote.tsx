// 干部提拔深度玩法（党务线专属）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface PromoteAction {
  id: string;
  title: string;
  desc: string;
  icon: string;
  cooldownDays: number;
  rewards: { merit: number; bossFavor?: number; boss2Favor?: number; lineKpi?: number };
  risk: number; // 0-100 政治风险
  rankRequire: number;
  tag: string;
}

const PROMOTE_ACTIONS: PromoteAction[] = [
  {
    id: 'recommend_cadre', title: '推荐优秀干部', icon: '📝', tag: '提名',
    desc: '向上级组织部门推荐优秀基层干部，展示识人用人能力',
    cooldownDays: 60, rankRequire: 1, risk: 5,
    rewards: { merit: 8, bossFavor: 5, lineKpi: 4 },
  },
  {
    id: 'talent_scout', title: '人才公开选拔', icon: '🔎', tag: '选拔',
    desc: '组织公开选拔活动，引进外部优质人才充实队伍，提升团队竞争力',
    cooldownDays: 90, rankRequire: 2, risk: 10,
    rewards: { merit: 12, bossFavor: 4, lineKpi: 6 },
  },
  {
    id: 'exchange_post', title: '干部交流轮岗', icon: '🔄', tag: '轮岗',
    desc: '推行干部挂职交流制度，打破本位主义，优化人才资源配置',
    cooldownDays: 120, rankRequire: 2, risk: 8,
    rewards: { merit: 14, bossFavor: 6, lineKpi: 7 },
  },
  {
    id: 'party_school_rec', title: '推送党校培训', icon: '🏛️', tag: '培训',
    desc: '推荐关键岗位干部参加省级党校培训，提升理论素养与仕途资本',
    cooldownDays: 60, rankRequire: 2, risk: 3,
    rewards: { merit: 10, boss2Favor: 5, lineKpi: 5 },
  },
  {
    id: 'insider_promotion', title: '内部晋升提案', icon: '🎖️', tag: '晋升',
    desc: '就重要岗位向上级常委会提出内部晋升提案，彰显掌控人事的政治影响力',
    cooldownDays: 180, rankRequire: 3, risk: 20,
    rewards: { merit: 20, bossFavor: 8, lineKpi: 12 },
  },
  {
    id: 'purge_incompetent', title: '不胜任干部调整', icon: '🚫', tag: '调整',
    desc: '依规对不胜任现职干部进行调整撤换，展示铁腕治党的政治决心',
    cooldownDays: 150, rankRequire: 3, risk: 15,
    rewards: { merit: 18, bossFavor: 10, lineKpi: 8 },
  },
  {
    id: 'faction_building', title: '核心圈层建设', icon: '🤝', tag: '圈层',
    desc: '培育忠诚骨干队伍，构建稳固核心政治圈层，强化个人政治影响力',
    cooldownDays: 240, rankRequire: 4, risk: 30,
    rewards: { merit: 25, bossFavor: 6, boss2Favor: 8, lineKpi: 15 },
  },
];

const TAG_STYLE: Record<string, { bg: string; text: string }> = {
  提名: { bg: '#DBEAFE', text: '#1D4ED8' },
  选拔: { bg: '#D1FAE5', text: '#065F46' },
  轮岗: { bg: '#EDE9FE', text: '#5B21B6' },
  培训: { bg: '#FEF3C7', text: '#92400E' },
  晋升: { bg: '#FEE2E2', text: '#991B1B' },
  调整: { bg: '#FFF7ED', text: '#C2410C' },
  圈层: { bg: '#F5F3FF', text: '#6D28D9' },
};

export default function PartyCadrePromotePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新

  const theme = getRankThemeWithLine(save?.rankLevel ?? 1, save?.careerPathLine ?? '党务线');

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) {
      setCooldowns(save.careerPathCooldowns as Record<string, number>);
    }
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;

  const handleAction = async (action: PromoteAction) => {
    if (acting) return;
    const key = `party_promote_${action.id}`;
    const lastDay = cooldowns[key] ?? -1;
    if (lastDay >= 0 && gameDays - lastDay < action.cooldownDays) {
      setMsg(`冷却中，还需 ${action.cooldownDays - (gameDays - lastDay)} 天`);
      setMsgOk(false);
      return;
    }
    setActing(action.id);
    const newCooldowns = { ...cooldowns, [key]: gameDays };
    const updates: Record<string, unknown> = {
      meritPoints: (save.meritPoints ?? 0) + action.rewards.merit,
      careerPathCooldowns: newCooldowns,
    };
    if (action.rewards.bossFavor) updates.bossFavor = Math.min(100, (save.bossFavor ?? 60) + action.rewards.bossFavor);
    if (action.rewards.boss2Favor) updates.boss2Favor = Math.min(100, (save.boss2Favor ?? 50) + action.rewards.boss2Favor);
    if (action.rewards.lineKpi) updates.lineKpiScore = (save.lineKpiScore ?? 0) + action.rewards.lineKpi;
    if (action.risk > 0 && Math.random() * 100 < action.risk) {
      updates.inspectionRisk = Math.min(100, (save.inspectionRisk ?? 0) + Math.round(action.risk * 0.3));
    }
    try {
      await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
      setCooldowns(newCooldowns);
      const parts = [
        `政绩 +${action.rewards.merit}`,
        action.rewards.bossFavor ? `上司好感 +${action.rewards.bossFavor}` : null,
        action.rewards.lineKpi ? `党务积分 +${action.rewards.lineKpi}` : null,
      ].filter(Boolean).join('，');
      const successMsg = `「${action.title}」执行成功！${parts}`;
      await saveResult('partyCadre_' + action.id, { ok: true, desc: successMsg, day: gameDays });
      setMsg(successMsg);
      setMsgOk(true);
    } catch {
      setMsg('操作失败，请稍后重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5F5' }}>
      <StatusBar style="light" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#7F1D1D', flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>党委 · 组织工作</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>干部提拔深度玩法</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>上司好感 {save.bossFavor ?? 60}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 6, padding: 10 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 12, fontWeight: '600' }}>{msg}</Text>
          </View>
        )}
        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#FECACA' }}>
          <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 18 }}>
            🎖️ 干部提拔是党务线的核心权力资源。善用人事权力推动队伍建设，可快速积累政治资本与上级好感，但高风险操作需谨慎。
          </Text>
        </View>

        {PROMOTE_ACTIONS.filter(a => a.rankRequire <= save.rankLevel).map(action => {
          const key = `party_promote_${action.id}`;
          const lastDay = cooldowns[key] ?? -1;
          const remaining = lastDay >= 0 ? Math.max(0, action.cooldownDays - (gameDays - lastDay)) : 0;
          const onCd = remaining > 0;
          const tagStyle = TAG_STYLE[action.tag] ?? { bg: '#F3F4F6', text: '#6B7280' };

          return (
            <View key={action.id} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#FECACA', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{action.title}</Text>
                    <View style={{ backgroundColor: tagStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: tagStyle.text, fontWeight: '700' }}>{action.tag}</Text>
                    </View>
                    {action.risk >= 20 && (
                      <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, color: '#B45309', fontWeight: '700' }}>⚠ 高风险</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 17 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>政绩 +{action.rewards.merit}</Text>
                    </View>
                    {action.rewards.bossFavor && (
                      <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#C2410C', fontWeight: '600' }}>上司好感 +{action.rewards.bossFavor}</Text>
                      </View>
                    )}
                    {action.rewards.lineKpi && (
                      <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#991B1B', fontWeight: '600' }}>党务积分 +{action.rewards.lineKpi}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
              </View>
              {(() => { const r = getResult('partyCadre_' + action.id); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 7, padding: 8, marginTop: 8, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <Pressable
                onPress={() => handleAction(action)}
                disabled={!!acting || onCd}
                style={{
                  marginTop: 12,
                  backgroundColor: onCd ? '#F3F4F6' : acting === action.id ? '#9CA3AF' : '#7F1D1D',
                  borderRadius: 7, paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ color: onCd ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: '700' }}>
                  {acting === action.id ? '执行中...' : onCd ? `冷却中 (${remaining}天)` : '执行'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
