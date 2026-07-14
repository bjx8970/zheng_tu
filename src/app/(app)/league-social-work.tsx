// 社会工作推进页面（团派线专属）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';
interface SocialWorkItem {
  id: string;
  title: string;
  desc: string;
  icon: string;
  cooldownDays: number;
  category: string;
  rewards: { merit: number; cityLivelihood?: number; publicOpinion?: number; lineKpi?: number; bossFavor?: number };
  rankRequire: number;
}

const SOCIAL_WORKS: SocialWorkItem[] = [
  {
    id: 'community_build', title: '社区建设推进', icon: '🏘️', category: '社区',
    desc: '推动基层社区治理创新，完善居委会工作机制，增强社区凝聚力',
    cooldownDays: 30, rankRequire: 1,
    rewards: { merit: 5, cityLivelihood: 2, publicOpinion: 4 },
  },
  {
    id: 'ngo_support', title: '社会组织培育', icon: '🌐', category: '公益',
    desc: '扶持非营利性社会组织发展，推动社会公益事业，激活社会力量',
    cooldownDays: 60, rankRequire: 2,
    rewards: { merit: 8, publicOpinion: 6, lineKpi: 4 },
  },
  {
    id: 'elderly_care', title: '老幼关爱行动', icon: '👴', category: '福利',
    desc: '组织关爱老人儿童专项行动，完善社区养老和托育服务体系',
    cooldownDays: 45, rankRequire: 1,
    rewards: { merit: 7, cityLivelihood: 3, publicOpinion: 8 },
  },
  {
    id: 'public_safety', title: '平安社区创建', icon: '🛡️', category: '安全',
    desc: '开展平安社区创建活动，强化基层治安防控，提升居民安全感',
    cooldownDays: 60, rankRequire: 2,
    rewards: { merit: 9, publicOpinion: 7, lineKpi: 3, bossFavor: 2 },
  },
  {
    id: 'grassroots_gov', title: '基层治理改革', icon: '⚙️', category: '改革',
    desc: '推进基层网格化治理，运用数字化手段提升服务效能',
    cooldownDays: 90, rankRequire: 3,
    rewards: { merit: 14, cityLivelihood: 4, lineKpi: 7, bossFavor: 3 },
  },
  {
    id: 'social_harmony', title: '社会矛盾化解', icon: '🕊️', category: '调解',
    desc: '建立健全社会矛盾多元化解机制，维护社会稳定和谐局面',
    cooldownDays: 75, rankRequire: 3,
    rewards: { merit: 12, publicOpinion: 10, lineKpi: 5, bossFavor: 4 },
  },
  {
    id: 'charity_fund', title: '公益慈善引导', icon: '❤️', category: '慈善',
    desc: '倡导全社会参与慈善，建立公益基金，推动共同富裕',
    cooldownDays: 120, rankRequire: 4,
    rewards: { merit: 18, cityLivelihood: 5, publicOpinion: 12, lineKpi: 10 },
  },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  社区: { bg: '#DBEAFE', text: '#1D4ED8' },
  公益: { bg: '#D1FAE5', text: '#065F46' },
  福利: { bg: '#FEF3C7', text: '#92400E' },
  安全: { bg: '#FEE2E2', text: '#991B1B' },
  改革: { bg: '#EDE9FE', text: '#5B21B6' },
  调解: { bg: '#E0F2FE', text: '#0369A1' },
  慈善: { bg: '#FCE7F3', text: '#9D174D' },
};

export default function LeagueSocialWorkPage() {
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

  const handleAction = async (item: SocialWorkItem) => {
    if (acting) return;
    const key = `league_social_${item.id}`;
    const lastDay = cooldowns[key] ?? -1;
    if (lastDay >= 0 && gameDays - lastDay < item.cooldownDays) {
      setMsg(`冷却中，还需 ${item.cooldownDays - (gameDays - lastDay)} 天`);
      setMsgOk(false);
      return;
    }
    setActing(item.id);
    const newCooldowns = { ...cooldowns, [key]: gameDays };
    const updates: Record<string, unknown> = {
      meritPoints: (save.meritPoints ?? 0) + item.rewards.merit,
      careerPathCooldowns: newCooldowns,
    };
    if (item.rewards.cityLivelihood) updates.cityLivelihood = Math.min(100, (save.cityLivelihood ?? 50) + item.rewards.cityLivelihood);
    if (item.rewards.publicOpinion) updates.publicOpinionIndex = Math.min(100, (save.publicOpinionIndex ?? 60) + item.rewards.publicOpinion);
    if (item.rewards.bossFavor) updates.bossFavor = Math.min(100, (save.bossFavor ?? 60) + item.rewards.bossFavor);
    if (item.rewards.lineKpi) updates.lineKpiScore = (save.lineKpiScore ?? 0) + item.rewards.lineKpi;
    try {
      await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
      setCooldowns(newCooldowns);
      const parts = [
        `政绩 +${item.rewards.merit}`,
        item.rewards.cityLivelihood ? `民生 +${item.rewards.cityLivelihood}` : null,
        item.rewards.publicOpinion ? `舆情 +${item.rewards.publicOpinion}` : null,
        item.rewards.lineKpi ? `团派积分 +${item.rewards.lineKpi}` : null,
        item.rewards.bossFavor ? `上司好感 +${item.rewards.bossFavor}` : null,
      ].filter(Boolean).join('，');
      const successMsg = `「${item.title}」推进成功！${parts}`;
      await saveResult('leagueSocial_' + item.id, { ok: true, desc: successMsg, day: gameDays });
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
    <View style={{ flex: 1, backgroundColor: '#F0FDF4' }}>
      <StatusBar style="dark" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#14532D', flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>团委 · 社会工作</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>社会工作推进</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>民生 {save.cityLivelihood ?? 50}</Text>
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
            🌐 社会工作是团派系干部的重要政绩载体。深耕基层、服务民众，可同步提升民生指数与舆情，积累团派核心竞争力。
          </Text>
        </View>

        {SOCIAL_WORKS.filter(w => w.rankRequire <= save.rankLevel).map(item => {
          const key = `league_social_${item.id}`;
          const lastDay = cooldowns[key] ?? -1;
          const remaining = lastDay >= 0 ? Math.max(0, item.cooldownDays - (gameDays - lastDay)) : 0;
          const onCd = remaining > 0;
          const catStyle = CAT_COLORS[item.category] ?? { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <View key={item.id} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#D1FAE5', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{item.title}</Text>
                    <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: catStyle.text, fontWeight: '700' }}>{item.category}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 17 }}>{item.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>政绩 +{item.rewards.merit}</Text>
                    </View>
                    {item.rewards.cityLivelihood && (
                      <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#C2410C', fontWeight: '600' }}>民生 +{item.rewards.cityLivelihood}</Text>
                      </View>
                    )}
                    {item.rewards.publicOpinion && (
                      <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>舆情 +{item.rewards.publicOpinion}</Text>
                      </View>
                    )}
                    {item.rewards.lineKpi && (
                      <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                        <Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '600' }}>团派积分 +{item.rewards.lineKpi}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>冷却 {item.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
              </View>
              {(() => { const r = getResult('leagueSocial_' + item.id); return r ? (
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
                  backgroundColor: onCd ? '#F3F4F6' : acting === item.id ? '#9CA3AF' : '#14532D',
                  borderRadius: 7, paddingVertical: 10, alignItems: 'center',
                }}
              >
                <Text style={{ color: onCd ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: '700' }}>
                  {acting === item.id ? '推进中...' : onCd ? `冷却中 (${remaining}天)` : '立即推进'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
