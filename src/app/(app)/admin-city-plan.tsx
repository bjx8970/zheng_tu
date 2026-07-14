// 城市规划深度玩法（行政线专属）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import type { PlanProjectConfig } from '@/config/city-plan.types';
import _cityPlanJson from '@/config/city-plan.json';

// 从 JSON 配置加载，修改数值只需编辑 src/config/city-plan.json
type PlanProject = PlanProjectConfig;
const PLAN_PROJECTS: PlanProject[] = (_cityPlanJson as { PLAN_PROJECTS: PlanProjectConfig[] }).PLAN_PROJECTS;

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  总规: { bg: '#DBEAFE', text: '#1D4ED8' },
  产业: { bg: '#FEF3C7', text: '#92400E' },
  住房: { bg: '#D1FAE5', text: '#065F46' },
  交通: { bg: '#E0F2FE', text: '#0369A1' },
  生态: { bg: '#F0FDF4', text: '#166534' },
  智慧: { bg: '#EDE9FE', text: '#5B21B6' },
  文旅: { bg: '#FCE7F3', text: '#9D174D' },
  战略: { bg: '#FEE2E2', text: '#991B1B' },
};

export default function AdminCityPlanPage() {
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

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) {
      setCooldowns(save.careerPathCooldowns as Record<string, number>);
    }
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;
  const fund = save.fundBalance ?? 0;

  const handleAction = async (proj: PlanProject) => {
    if (acting) return;
    const key = `admin_plan_${proj.id}`;
    const lastDay = cooldowns[key] ?? -1;
    if (lastDay >= 0 && gameDays - lastDay < proj.cooldownDays) {
      const remain = proj.cooldownDays - (gameDays - lastDay);
      setMsg(`冷却中，还需 ${remain} 天`);
      setMsgOk(false);
      return;
    }
    if (proj.cost > 0 && fund < proj.cost) {
      setMsg(`财政资金不足（需${proj.cost}万元，当前${fund}万元）`);
      setMsgOk(false);
      return;
    }
    setActing(proj.id);
    const newCooldowns = { ...cooldowns, [key]: gameDays };
    try {
      const updates: Record<string, unknown> = {
        meritPoints: (save.meritPoints ?? 0) + proj.rewards.merit,
        careerPathCooldowns: newCooldowns,
      };
      if (proj.cost > 0) updates.fundBalance = Math.max(0, fund - proj.cost);
      if (proj.rewards.cityGdp) updates.cityGdp = Math.min(100, (save.cityGdp ?? 50) + proj.rewards.cityGdp);
      if (proj.rewards.cityLivelihood) updates.cityLivelihood = Math.min(100, (save.cityLivelihood ?? 50) + proj.rewards.cityLivelihood);
      if (proj.rewards.cityEcology) updates.cityEcology = Math.min(100, (save.cityEcology ?? 50) + proj.rewards.cityEcology);
      if ((proj.rewards as {cityBusiness?: number}).cityBusiness) updates.cityBusiness = Math.min(100, (save.cityBusiness ?? 50) + ((proj.rewards as {cityBusiness?: number}).cityBusiness ?? 0));
      if (proj.rewards.publicOpinion) updates.publicOpinionIndex = Math.min(100, (save.publicOpinionIndex ?? 60) + proj.rewards.publicOpinion);
      if (proj.rewards.lineKpi) updates.lineKpiScore = (save.lineKpiScore ?? 0) + proj.rewards.lineKpi;
      if (proj.rewards.bossFavor) updates.bossFavor = Math.min(100, (save.bossFavor ?? 60) + proj.rewards.bossFavor);
      await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
      setCooldowns(newCooldowns);
      const parts = [
        `政绩 +${proj.rewards.merit}`,
        proj.rewards.cityGdp ? `GDP +${proj.rewards.cityGdp}` : null,
        proj.rewards.cityLivelihood ? `民生 +${proj.rewards.cityLivelihood}` : null,
        proj.rewards.cityEcology ? `生态 +${proj.rewards.cityEcology}` : null,
        proj.rewards.publicOpinion ? `舆情 +${proj.rewards.publicOpinion}` : null,
        proj.rewards.lineKpi ? `行政积分 +${proj.rewards.lineKpi}` : null,
        proj.cost > 0 ? `支出 ${proj.cost}万` : null,
      ].filter(Boolean).join('，');
      const desc = `「${proj.title}」推进完成！${parts}`;
      await saveResult('cityPlan_' + proj.id, { ok: true, desc, day: gameDays });
      setMsg(desc);
      setMsgOk(true);
    } catch {
      setMsg('操作失败，请稍后重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#EFF6FF' }}>
      <StatusBar style="light" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#1E3A8A', flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>行政线 · 城市建设</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>城市规划</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>财政 {fund}万</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 6, padding: 10 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 12, fontWeight: '600' }}>{msg}</Text>
          </View>
        )}
        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 18 }}>
            🏛️ 城市规划是行政线核心政绩载体。科学规划城市发展空间，可带动GDP、民生、生态多维指标提升，展现行政统筹能力。
          </Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            {[{ l: 'GDP', v: save.cityGdp ?? 50 }, { l: '民生', v: save.cityLivelihood ?? 50 }, { l: '生态', v: save.cityEcology ?? 50 }].map(s => (
              <View key={s.l} style={{ flex: 1, backgroundColor: '#EFF6FF', borderRadius: 6, padding: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>{s.l}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D4ED8' }}>{s.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {PLAN_PROJECTS.filter(p => p.rankRequire <= save.rankLevel).map(proj => {
          const key = `admin_plan_${proj.id}`;
          const lastDay = cooldowns[key] ?? -1;
          const remaining = lastDay >= 0 ? Math.max(0, proj.cooldownDays - (gameDays - lastDay)) : 0;
          const onCd = remaining > 0;
          const noFund = proj.cost > 0 && fund < proj.cost;
          const catStyle = CAT_COLORS[proj.category] ?? { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <View key={proj.id} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{proj.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{proj.title}</Text>
                    <View style={{ backgroundColor: catStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: catStyle.text, fontWeight: '700' }}>{proj.category}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 17 }}>{proj.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>政绩 +{proj.rewards.merit}</Text>
                    </View>
                    {proj.rewards.cityGdp && <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>GDP +{proj.rewards.cityGdp}</Text></View>}
                    {proj.rewards.cityLivelihood && <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#C2410C', fontWeight: '600' }}>民生 +{proj.rewards.cityLivelihood}</Text></View>}
                    {proj.rewards.cityEcology && <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>生态 +{proj.rewards.cityEcology}</Text></View>}
                    {proj.rewards.lineKpi && <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '600' }}>行政积分 +{proj.rewards.lineKpi}</Text></View>}
                    {proj.cost > 0 && <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#B45309', fontWeight: '600' }}>需 {proj.cost}万</Text></View>}
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>冷却 {proj.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
              </View>
              {(() => { const r = getResult('cityPlan_' + proj.id); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 7, padding: 8, marginTop: 10, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <Pressable
                onPress={() => handleAction(proj)}
                disabled={!!acting || onCd || noFund}
                style={{
                  marginTop: 12, borderRadius: 7, paddingVertical: 10, alignItems: 'center',
                  backgroundColor: onCd ? '#F3F4F6' : noFund ? '#FEF3C7' : acting === proj.id ? '#9CA3AF' : '#1E3A8A',
                }}
              >
                <Text style={{ color: onCd ? '#9CA3AF' : noFund ? '#B45309' : '#fff', fontSize: 13, fontWeight: '700' }}>
                  {acting === proj.id ? '推进中...' : onCd ? `冷却中 (${remaining}天)` : noFund ? '财政不足' : '立即推进'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
