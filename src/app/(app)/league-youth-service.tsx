// 青年服务中心页面（团派线专属）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';
interface ServiceItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  cooldownDays: number;
  rewards: { merit: number; publicOpinion?: number; bossFavor?: number; lineKpi?: number };
  rankRequire: number;
  tag: string;
  cost: number; // 专项经费消耗（万元）
}

const SERVICES: ServiceItem[] = [
  {
    id: 'youth_employ', title: '青年就业援助', icon: '💼',
    desc: '开展青年就业技能培训，搭建招聘对接平台，降低青年失业率',
    tag: '就业', cooldownDays: 30, rankRequire: 1, cost: 3,
    rewards: { merit: 6, publicOpinion: 5, lineKpi: 2 },
  },
  {
    id: 'volunteer_prog', title: '青年志愿者项目', icon: '🤝',
    desc: '组织青年志愿服务队，服务社区居民，提升社会参与度和正能量',
    tag: '志愿', cooldownDays: 25, rankRequire: 1, cost: 2,
    rewards: { merit: 4, publicOpinion: 8, lineKpi: 3 },
  },
  {
    id: 'startup_support', title: '青年创业扶持', icon: '🚀',
    desc: '设立青年创业基金，提供政策咨询和孵化支持，激发创新创业活力',
    tag: '创业', cooldownDays: 60, rankRequire: 2, cost: 8,
    rewards: { merit: 10, publicOpinion: 6, lineKpi: 5 },
  },
  {
    id: 'youth_culture', title: '青年文化活动', icon: '🎭',
    desc: '举办青年文化节、艺术展览、体育赛事，丰富青年精神文化生活',
    tag: '文化', cooldownDays: 45, rankRequire: 1, cost: 4,
    rewards: { merit: 5, publicOpinion: 10, bossFavor: 2 },
  },
  {
    id: 'rural_youth', title: '农村青年振兴', icon: '🌾',
    desc: '吸引青年返乡创业，推进农村青年人才培育和乡村振兴战略',
    tag: '振兴', cooldownDays: 90, rankRequire: 3, cost: 15,
    rewards: { merit: 15, publicOpinion: 8, lineKpi: 8, bossFavor: 3 },
  },
  {
    id: 'youth_committee', title: '青年代表委员会', icon: '🏛️',
    desc: '建立青年代表参政议政渠道，广泛征集青年意见，提升民主参与',
    tag: '参政', cooldownDays: 120, rankRequire: 4, cost: 10,
    rewards: { merit: 20, publicOpinion: 12, lineKpi: 10, bossFavor: 5 },
  },
];

export default function LeagueYouthServicePage() {
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

  const theme = getRankThemeWithLine(save?.rankLevel ?? 1, save?.careerPathLine ?? '团派线');

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) {
      setCooldowns(save.careerPathCooldowns as Record<string, number>);
    }
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;

  const handleAction = async (item: ServiceItem) => {
    if (acting) return;
    const key = `league_service_${item.id}`;
    const lastDay = cooldowns[key] ?? -1;
    if (lastDay >= 0 && gameDays - lastDay < item.cooldownDays) {
      setMsg(`冷却中，还需 ${item.cooldownDays - (gameDays - lastDay)} 天`);
      setMsgOk(false);
      return;
    }
    // 专项经费检查
    const grantFund = save.cityGovFund ?? 0;
    if (grantFund < item.cost) {
      setMsg(`专项经费不足（需${item.cost}万，当前${grantFund}万），请先补充专项经费`);
      setMsgOk(false);
      return;
    }
    setActing(item.id);
    const newCooldowns = { ...cooldowns, [key]: gameDays };
    try {
      const updates: Record<string, unknown> = {
        meritPoints: (save.meritPoints ?? 0) + item.rewards.merit,
        careerPathCooldowns: newCooldowns,
        cityGovFund: grantFund - item.cost,
      };
      if (item.rewards.publicOpinion) {
        updates.publicOpinionIndex = Math.min(100, (save.publicOpinionIndex ?? 60) + item.rewards.publicOpinion);
      }
      if (item.rewards.bossFavor) {
        updates.bossFavor = Math.min(100, (save.bossFavor ?? 60) + item.rewards.bossFavor);
      }
      if (item.rewards.lineKpi) {
        updates.lineKpiScore = (save.lineKpiScore ?? 0) + item.rewards.lineKpi;
      }
      await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
      setCooldowns(newCooldowns);
      const parts = [
        `政绩 +${item.rewards.merit}`,
        item.rewards.publicOpinion ? `舆情 +${item.rewards.publicOpinion}` : null,
        item.rewards.bossFavor ? `上司好感 +${item.rewards.bossFavor}` : null,
        item.rewards.lineKpi ? `团派积分 +${item.rewards.lineKpi}` : null,
        `专项经费 -${item.cost}万`,
      ].filter(Boolean).join('，');
      const successMsg = `「${item.title}」执行成功！${parts}`;
      await saveResult('leagueService_' + item.id, { ok: true, desc: successMsg, day: gameDays });
      setMsg(successMsg);
      setMsgOk(true);
    } catch {
      setMsg('操作失败，请稍后重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  const TAG_COLORS: Record<string, { bg: string; text: string }> = {
    就业: { bg: '#DBEAFE', text: '#1D4ED8' },
    志愿: { bg: '#D1FAE5', text: '#065F46' },
    创业: { bg: '#FEF3C7', text: '#92400E' },
    文化: { bg: '#EDE9FE', text: '#5B21B6' },
    振兴: { bg: '#D1FAE5', text: '#166534' },
    参政: { bg: '#FEE2E2', text: '#991B1B' },
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
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>团委 · 青年服务</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>青年服务中心</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>舆情 {save.publicOpinionIndex ?? 60}</Text>
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
            🌱 青年服务是团派线的核心施政方向。积极服务青年群体，可提升舆情、积累团派积分，构建青年工作口碑。
          </Text>
        </View>

        {SERVICES.filter(s => s.rankRequire <= save.rankLevel).map(item => {
          const key = `league_service_${item.id}`;
          const lastDay = cooldowns[key] ?? -1;
          const remaining = lastDay >= 0 ? Math.max(0, item.cooldownDays - (gameDays - lastDay)) : 0;
          const onCd = remaining > 0;
          const tagStyle = TAG_COLORS[item.tag] ?? { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#D1FAE5', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.title}</Text>
                    <View style={{ backgroundColor: tagStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: tagStyle.text, fontWeight: '700' }}>{item.tag}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 17 }}>{item.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>政绩 +{item.rewards.merit}</Text>
                    </View>
                    {item.rewards.publicOpinion && (
                      <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#C2410C', fontWeight: '600' }}>舆情 +{item.rewards.publicOpinion}</Text>
                      </View>
                    )}
                    {item.rewards.lineKpi && (
                      <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>团派积分 +{item.rewards.lineKpi}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>冷却 {item.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
              </View>
              {(() => { const r = getResult('leagueService_' + item.id); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 7, padding: 8, marginTop: 8, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <Pressable
                onPress={() => handleAction(item)}
                disabled={!!acting || onCd}
                style={{
                  marginTop: 12,
                  backgroundColor: onCd ? '#F3F4F6' : acting === item.id ? '#9CA3AF' : '#166534',
                  borderRadius: 7, paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ color: onCd ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: '700' }}>
                  {acting === item.id ? '执行中...' : onCd ? `冷却中 (${remaining}天)` : '立即执行'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
