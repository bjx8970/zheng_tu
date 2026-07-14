/**
 * 城市治理经费 —— 统一入口页面
 * 取代原专项经费（fund-channels/admin-finance/admin-grant/line-grant）
 * 数据字段: save.cityGovFund (万元)，save.cityGovFundAutoMonth (最后一次月度拨付日)
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// ── 格式化（输入单位：万元）────────────────────────────────────────────────────
function fmt(val: number): string {
  if (val >= 100_000) return `${(val / 10_000).toFixed(0)}亿`;
  if (val >= 10_000)  return `${(val / 10_000).toFixed(1)}亿`;
  return `${val}万`;
}

// ── 经费来源数据（静态配置）──────────────────────────────────────────────────
interface FundSource {
  key: string;
  icon: string;
  title: string;
  desc: string;
  grantBase: number;   // 基础拨付万元
  cooldownDays: number;
  successRate: number;
}

const FUND_SOURCES: FundSource[] = [
  {
    key: 'budget_annual',
    icon: '📋',
    title: '年度财政预算',
    desc: '向上级财政部门申请年度城市治理预算拨款，资金稳定但申请周期长。',
    grantBase: 500,
    cooldownDays: 365,
    successRate: 90,
  },
  {
    key: 'budget_special',
    icon: '🏛️',
    title: '专项中央转移支付',
    desc: '向国家发改委申请专项城市建设转移支付资金，金额大但审核严格。',
    grantBase: 2000,
    cooldownDays: 180,
    successRate: 60,
  },
  {
    key: 'land_income',
    icon: '🗺️',
    title: '土地出让金划拨',
    desc: '从辖区土地出让收益中划拨一定比例用于城市治理，资金灵活。',
    grantBase: 800,
    cooldownDays: 90,
    successRate: 75,
  },
  {
    key: 'policy_bank',
    icon: '🏦',
    title: '政策性银行贷款',
    desc: '向国家开发银行申请城市基础设施政策性贷款，成本低但需偿还。',
    grantBase: 1500,
    cooldownDays: 120,
    successRate: 65,
  },
  {
    key: 'social_capital',
    icon: '🤝',
    title: '社会资本引入',
    desc: '通过PPP模式引入社会资本参与城市治理项目，盘活存量资产。',
    grantBase: 1000,
    cooldownDays: 60,
    successRate: 70,
  },
  {
    key: 'emergency_dispatch',
    icon: '🚨',
    title: '应急调拨',
    desc: '申请应急财政调拨，适用于突发治理事件，金额较小但快速到位。',
    grantBase: 200,
    cooldownDays: 30,
    successRate: 95,
  },
];

// ── 城市治理经费用途说明 ──────────────────────────────────────────────────────
const EXPENSE_ITEMS = [
  { icon: '⚖️', label: '纪检线行动',     desc: '巡视反腐 / 案件查处 / 廉政建设 / 专项整治' },
  { icon: '🎖️', label: '党务线行动',     desc: '组织建设 / 干部工作 / 宣传思想 / 党纪党规' },
  { icon: '🌱', label: '团派线行动',     desc: '青年服务 / 社会工作 / 人才培养 / 团组织建设' },
  { icon: '🏗️', label: '城市基础建设',  desc: '城市规划 / 道路交通 / 公共设施投资' },
  { icon: '🏘️', label: '民生福利项目',  desc: '医疗卫生 / 教育文化 / 社区服务' },
];

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function CityGovFund() {
  const router   = useRouter();
  const insets   = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();

  const [acting, setActing]   = useState<string | null>(null);
  const [lastMsg, setLastMsg] = useState<{ key: string; text: string; ok: boolean } | null>(null);

  if (!save) return null;

  const balance     = save.cityGovFund ?? 0;
  const rankLevel   = save.rankLevel   ?? 1;
  const gameDays    = save.gameDays    ?? 0;
  const rankMult    = rankLevel <= 3 ? 1 : rankLevel <= 6 ? 2 : rankLevel <= 9 ? 4 : rankLevel <= 11 ? 8 : 15;
  const cooldowns: Record<string, number> = save.careerPathCooldowns ?? {};

  // 冷却检查
  function isCool(key: string, days: number): boolean {
    const last = cooldowns[`cgf_${key}`] ?? -9999;
    return (gameDays - last) < days;
  }
  function cdLeft(key: string, days: number): number {
    const last = cooldowns[`cgf_${key}`] ?? -9999;
    return Math.max(0, days - (gameDays - last));
  }

  async function handleGrant(src: FundSource) {
    if (!save) return;
    setActing(src.key);
    const ok      = Math.random() * 100 < src.successRate;
    // 变动区间统一为 500~1000 万，成功率决定能否申请到
    const amount  = ok ? Math.round(500 + Math.random() * 500) : 0;
    const newBal  = balance + amount;
    const newCds  = { ...cooldowns, [`cgf_${src.key}`]: gameDays };
    if (ok) {
      await updateGameSave({ cityGovFund: newBal, careerPathCooldowns: newCds });
      const okText = `申请成功！到账 ${fmt(amount)} 万元，余额 ${fmt(newBal)} 万元`;
      await saveResult('cityGovFund_' + src.key, { ok: true, desc: okText, day: gameDays });
      setLastMsg({ key: src.key, ok: true, text: okText });
    } else {
      await updateGameSave({ careerPathCooldowns: newCds });
      const failText = '申请未获批准，请等待下次机会';
      await saveResult('cityGovFund_' + src.key, { ok: false, desc: failText, day: gameDays });
      setLastMsg({ key: src.key, ok: false, text: failText });
    }
    setActing(null);
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1B2A' }}>
      <StatusBar style="light" backgroundColor="#0D1B2A" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D1B2A', paddingTop: insets.top + 6, paddingBottom: 14, paddingHorizontal: 18 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: '#F59E0B', fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 2 }}>🏛️ 城市治理经费</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>统一经费入口 · 多渠道融资 · 支撑城市治理</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 14, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 余额卡片 */}
        <View style={{ backgroundColor: '#1E3A5F', borderRadius: 16, padding: 18, borderWidth: 1, borderColor: '#2563EB66' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>当前可用余额（万元）</Text>
          <Text style={{ color: '#F59E0B', fontSize: 32, fontWeight: '900', letterSpacing: 1 }}>{fmt(balance)}<Text style={{ fontSize: 14, fontWeight: '400', color: 'rgba(255,255,255,0.5)' }}> 元</Text></Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
            <View style={{ flex: 1, backgroundColor: 'rgba(5,150,105,0.2)', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>上级月度拨款</Text>
              <Text style={{ color: '#34D399', fontSize: 14, fontWeight: '700', marginTop: 2 }}>50~500万/月</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(37,99,235,0.2)', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>当前职级</Text>
              <Text style={{ color: '#60A5FA', fontSize: 14, fontWeight: '700', marginTop: 2 }}>Lv.{rankLevel}</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: 'rgba(245,158,11,0.15)', borderRadius: 8, padding: 10 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>申请倍率</Text>
              <Text style={{ color: '#FCD34D', fontSize: 14, fontWeight: '700', marginTop: 2 }}>×{rankMult}</Text>
            </View>
          </View>
        </View>

        {/* 经费来源 */}
        <View>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 10, letterSpacing: 1 }}>💰 申请经费来源</Text>
          {FUND_SOURCES.map(src => {
            const cool    = isCool(src.key, src.cooldownDays);
            const msg     = lastMsg?.key === src.key ? lastMsg : null;
            const amount  = Math.round(src.grantBase * rankMult);
            return (
              <View key={src.key} style={{ backgroundColor: '#1C2E40', borderRadius: 12, borderWidth: 1, borderColor: '#2D4A63', padding: 14, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 22 }}>{src.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{src.title}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 3, lineHeight: 16 }}>{src.desc}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                  <View style={{ backgroundColor: '#064E3B', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#6EE7B7', fontWeight: '700' }}>预计 500~1000万元</Text>
                  </View>
                  <View style={{ backgroundColor: '#1E3A5F', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 10, color: '#93C5FD' }}>成功率 {src.successRate}%</Text>
                  </View>
                  {cool && (
                    <View style={{ backgroundColor: '#3B1515', borderRadius: 5, paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, color: '#FCA5A5' }}>冷却 {cdLeft(src.key, src.cooldownDays)}天</Text>
                    </View>
                  )}
                </View>
                {msg && (
                  <View style={{ backgroundColor: msg.ok ? '#064E3B' : '#3B1515', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: msg.ok ? '#065F46' : '#7F1D1D' }}>
                    <Text style={{ fontSize: 11, color: msg.ok ? '#6EE7B7' : '#FCA5A5' }}>{msg.ok ? '✅ ' : '❌ '}{msg.text}</Text>
                  </View>
                )}
                <Pressable
                  onPress={() => handleGrant(src)}
                  disabled={!!acting || cool}
                  style={{ backgroundColor: cool ? '#374151' : '#1D4ED8', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                >
                  {acting === src.key
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: cool ? '#9CA3AF' : '#fff', fontSize: 13, fontWeight: '700' }}>
                        {cool ? `⏳ 冷却 ${cdLeft(src.key, src.cooldownDays)}天` : '申请拨款'}
                      </Text>}
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 经费用途说明 */}
        <View style={{ backgroundColor: '#1C2E40', borderRadius: 12, borderWidth: 1, borderColor: '#2D4A63', padding: 14 }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 10 }}>📊 经费适用范围</Text>
          {EXPENSE_ITEMS.map(item => (
            <View key={item.label} style={{ flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ fontSize: 18 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{item.label}</Text>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
