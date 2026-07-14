// 招商引资深度玩法（行政线专属）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

interface InvestDeal {
  id: string;
  title: string;
  company: string;
  industry: string;
  icon: string;
  investAmount: number; // 亿元
  cooldownDays: number;
  rewards: {
    merit: number;
    cityGdp: number;
    taxRevenue?: number;
    cityBusiness?: number;
    lineKpi?: number;
    bossFavor?: number;
    fundMonthly?: number; // 每月财政增量(万)
  };
  rankRequire: number;
  risk: number; // 失败概率 0-100
}

const INVEST_DEALS: InvestDeal[] = [
  {
    id: 'factory_small', title: '引进中小型制造企业', company: '制造业', industry: '制造',
    icon: '🏭', investAmount: 0.5, cooldownDays: 60, rankRequire: 1, risk: 10,
    rewards: { merit: 5, cityGdp: 2, taxRevenue: 1, lineKpi: 3 },
  },
  {
    id: 'retail_chain', title: '大型连锁商业综合体', company: '商业地产', industry: '商业',
    icon: '🏬', investAmount: 2, cooldownDays: 90, rankRequire: 2, risk: 15,
    rewards: { merit: 8, cityGdp: 3, cityBusiness: 4, taxRevenue: 2, lineKpi: 5 },
  },
  {
    id: 'tech_park', title: '高新技术产业园招商', company: '科技产业', industry: '科技',
    icon: '💻', investAmount: 5, cooldownDays: 120, rankRequire: 2, risk: 20,
    rewards: { merit: 14, cityGdp: 5, cityBusiness: 5, lineKpi: 8, bossFavor: 3 },
  },
  {
    id: 'logistics_hub', title: '现代物流枢纽建设', company: '物流产业', industry: '物流',
    icon: '🚚', investAmount: 3, cooldownDays: 90, rankRequire: 2, risk: 12,
    rewards: { merit: 10, cityGdp: 4, taxRevenue: 2, cityBusiness: 3, lineKpi: 5 },
  },
  {
    id: 'central_soe', title: '央企子公司落地洽谈', company: '央企', industry: '能源',
    icon: '⚡', investAmount: 10, cooldownDays: 180, rankRequire: 3, risk: 30,
    rewards: { merit: 22, cityGdp: 8, taxRevenue: 5, lineKpi: 12, bossFavor: 5 },
  },
  {
    id: 'foreign_invest', title: '外资企业引进谈判', company: '外资', industry: '外资',
    icon: '🌐', investAmount: 8, cooldownDays: 150, rankRequire: 3, risk: 25,
    rewards: { merit: 18, cityGdp: 7, cityBusiness: 6, lineKpi: 10, bossFavor: 4 },
  },
  {
    id: 'industrial_cluster', title: '产业集群专项招商', company: '产业集群', industry: '集群',
    icon: '🏗️', investAmount: 20, cooldownDays: 240, rankRequire: 4, risk: 20,
    rewards: { merit: 30, cityGdp: 12, taxRevenue: 8, lineKpi: 18, bossFavor: 8 },
  },
];

const IND_COLORS: Record<string, { bg: string; text: string }> = {
  制造: { bg: '#FEF3C7', text: '#92400E' },
  商业: { bg: '#DBEAFE', text: '#1D4ED8' },
  科技: { bg: '#EDE9FE', text: '#5B21B6' },
  物流: { bg: '#E0F2FE', text: '#0369A1' },
  能源: { bg: '#FEE2E2', text: '#991B1B' },
  外资: { bg: '#D1FAE5', text: '#065F46' },
  集群: { bg: '#FFF7ED', text: '#C2410C' },
};

export default function AdminInvestmentPage() {
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
  const [results, setResults] = useState<Record<string, boolean>>({});

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) {
      setCooldowns(save.careerPathCooldowns as Record<string, number>);
    }
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;

  const handleAction = async (deal: InvestDeal) => {
    if (acting) return;
    const key = `admin_invest_${deal.id}`;
    const lastDay = cooldowns[key] ?? -1;
    if (lastDay >= 0 && gameDays - lastDay < deal.cooldownDays) {
      const remain = deal.cooldownDays - (gameDays - lastDay);
      setMsg(`冷却中，还需 ${remain} 天`);
      setMsgOk(false);
      return;
    }
    setActing(deal.id);
    const newCooldowns = { ...cooldowns, [key]: gameDays };
    try {
      const isSuccess = Math.random() * 100 >= deal.risk;
      setResults(prev => ({ ...prev, [deal.id]: isSuccess }));
      const updates: Record<string, unknown> = { careerPathCooldowns: newCooldowns };
      if (isSuccess) {
        updates.meritPoints = (save.meritPoints ?? 0) + deal.rewards.merit;
        updates.cityGdp = Math.min(100, (save.cityGdp ?? 50) + deal.rewards.cityGdp);
        if (deal.rewards.cityBusiness) updates.cityBusiness = Math.min(100, (save.cityBusiness ?? 50) + deal.rewards.cityBusiness);
        if (deal.rewards.taxRevenue) updates.taxRevenue = (save.taxRevenue ?? 0) + deal.rewards.taxRevenue;
        if (deal.rewards.lineKpi) updates.lineKpiScore = (save.lineKpiScore ?? 0) + deal.rewards.lineKpi;
        if (deal.rewards.bossFavor) updates.bossFavor = Math.min(100, (save.bossFavor ?? 60) + deal.rewards.bossFavor);
      } else {
        updates.meritPoints = Math.max(0, (save.meritPoints ?? 0) - 3);
        updates.bossFavor = Math.max(0, (save.bossFavor ?? 60) - 5);
      }
      await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
      setCooldowns(newCooldowns);
      let msgText: string;
      if (isSuccess) {
        const parts = [
          `政绩 +${deal.rewards.merit}`,
          `GDP +${deal.rewards.cityGdp}`,
          deal.rewards.cityBusiness ? `商业 +${deal.rewards.cityBusiness}` : null,
          deal.rewards.taxRevenue ? `税收 +${deal.rewards.taxRevenue}亿` : null,
          deal.rewards.lineKpi ? `行政积分 +${deal.rewards.lineKpi}` : null,
        ].filter(Boolean).join('，');
        msgText = `🎉 「${deal.title}」招商成功！${parts}`;
      } else {
        msgText = `❌ 「${deal.title}」谈判破裂！政绩 -3，上司好感 -5（对方选择了其他城市）`;
      }
      await saveResult('invest_' + deal.id, { ok: isSuccess, desc: msgText, day: gameDays });
      setMsg(msgText);
      setMsgOk(isSuccess);
    } catch {
      setMsg('操作失败，请稍后重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  const totalGdp = save.cityGdp ?? 50;
  const totalBiz = save.cityBusiness ?? 50;
  const totalTax = save.taxRevenue ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#EFF6FF' }}>
      <StatusBar style="light" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#1E40AF', flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 2 }}>行政线 · 经济工作</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>招商引资</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>GDP {totalGdp}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 6, padding: 10 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 12, fontWeight: '600' }}>{msg}</Text>
          </View>
        )}
        <View style={{ backgroundColor: '#fff', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
          <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 18, marginBottom: 8 }}>
            💼 招商引资是行政线快速拉升GDP的核心手段。谈判有一定失败风险，需权衡收益与风险。
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[{ l: 'GDP', v: totalGdp }, { l: '商业', v: totalBiz }, { l: '税收(亿)', v: totalTax }].map(s => (
              <View key={s.l} style={{ flex: 1, backgroundColor: '#EFF6FF', borderRadius: 6, padding: 6, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#6B7280' }}>{s.l}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D4ED8' }}>{s.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {INVEST_DEALS.filter(d => d.rankRequire <= save.rankLevel).map(deal => {
          const key = `admin_invest_${deal.id}`;
          const lastDay = cooldowns[key] ?? -1;
          const remaining = lastDay >= 0 ? Math.max(0, deal.cooldownDays - (gameDays - lastDay)) : 0;
          const onCd = remaining > 0;
          const indStyle = IND_COLORS[deal.industry] ?? { bg: '#F3F4F6', text: '#6B7280' };
          const riskColor = deal.risk >= 25 ? '#B91C1C' : deal.risk >= 15 ? '#B45309' : '#15803D';

          return (
            <View key={deal.id} style={{ backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                <Text style={{ fontSize: 28 }}>{deal.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{deal.title}</Text>
                    <View style={{ backgroundColor: indStyle.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: indStyle.text, fontWeight: '700' }}>{deal.industry}</Text>
                    </View>
                    <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 9, color: riskColor, fontWeight: '700' }}>失败率 {deal.risk}%</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280' }}>{deal.company} · 预期投资 {deal.investAmount}亿元</Text>
                  <View style={{ flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>政绩 +{deal.rewards.merit}</Text>
                    </View>
                    <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '600' }}>GDP +{deal.rewards.cityGdp}</Text>
                    </View>
                    {deal.rewards.taxRevenue && <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#B45309', fontWeight: '600' }}>税收 +{deal.rewards.taxRevenue}亿</Text></View>}
                    {deal.rewards.lineKpi && <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}><Text style={{ fontSize: 10, color: '#5B21B6', fontWeight: '600' }}>行政积分 +{deal.rewards.lineKpi}</Text></View>}
                    <View style={{ backgroundColor: '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: '#6B7280' }}>冷却 {deal.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
              </View>
              {(() => { const r = getResult('invest_' + deal.id); return r ? (
                <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 7, padding: 8, marginTop: 8, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                  <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                </View>
              ) : null; })()}
              <Pressable
                onPress={() => handleAction(deal)}
                disabled={!!acting || onCd}
                style={{
                  marginTop: 12, borderRadius: 7, paddingVertical: 10, alignItems: 'center',
                  backgroundColor: onCd ? '#F3F4F6' : acting === deal.id ? '#9CA3AF' : '#1E40AF',
                }}
              >
                <Text style={{ color: onCd ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: '700' }}>
                  {acting === deal.id ? '洽谈中...' : onCd ? `冷却中 (${remaining}天)` : '开始洽谈'}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
