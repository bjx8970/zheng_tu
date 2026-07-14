// 土地财政系统 — 土地拍卖、出让金管理、债务管控
import { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';


const C = {
  bg: '#EEF0E8', header: '#2D4A1E', headerDark: '#1E3311',
  gold: '#C9953A', goldLight: '#F5E9CC', goldBorder: '#D4A843',
  red: '#B91C1C', redLight: '#FEF2F2', redMid: '#FECACA',
  green: '#166534', greenLight: '#F0FDF4', greenMid: '#BBF7D0',
  blue: '#1E40AF', blueLight: '#EFF6FF', blueMid: '#BFDBFE',
  orange: '#C2410C', orangeLight: '#FFF7ED', orangeBorder: '#FED7AA',
  card: '#FDFAF5', border: '#D6CFBF', muted: '#7A7065', label: '#4A3F2F',
  navy: '#1A2B3C', divider: '#E0D9CD',
};

// ── 土地地块配置（根据城市GDP动态定价）──
interface LandParcel {
  key: string; icon: string; name: string; area: number; // 亩
  category: '商业用地' | '工业用地' | '住宅用地' | '混合用地';
  gdpMultiplier: number; // 基础价 × GDP倍率
  ecologyImpact: number; // 负值=影响生态
  livelihoodImpact: number; // 正值=利民
  meritImpact: number;
  desc: string;
}

const LAND_PARCELS: LandParcel[] = [
  { key: 'cbd_plot', icon: '🏢', name: 'CBD核心商业地块', area: 120, category: '商业用地',
    gdpMultiplier: 0.08, ecologyImpact: -2, livelihoodImpact: 5, meritImpact: 8,
    desc: '城市核心地段，商业价值最高，出让金丰厚，可引入大型商业综合体' },
  { key: 'industrial_zone', icon: '🏭', name: '工业园区配套用地', area: 500, category: '工业用地',
    gdpMultiplier: 0.03, ecologyImpact: -5, livelihoodImpact: 3, meritImpact: 5,
    desc: '承接产业转移，出让价格适中，有利于招商引资和GDP增长' },
  { key: 'residential_north', icon: '🏘️', name: '北区保障房建设用地', area: 300, category: '住宅用地',
    gdpMultiplier: 0.02, ecologyImpact: 0, livelihoodImpact: 12, meritImpact: 10,
    desc: '用于保障性住房建设，出让金较低但显著改善民生，有利于考核加分' },
  { key: 'mixed_riverside', icon: '🌊', name: '滨河综合开发地块', area: 200, category: '混合用地',
    gdpMultiplier: 0.06, ecologyImpact: -3, livelihoodImpact: 8, meritImpact: 12,
    desc: '生态景观与商业开发并重，综合效益好，打造城市名片' },
  { key: 'suburb_commercial', icon: '🏬', name: '郊区商业综合体用地', area: 400, category: '商业用地',
    gdpMultiplier: 0.04, ecologyImpact: -4, livelihoodImpact: 4, meritImpact: 6,
    desc: '疏解城区商业压力，带动郊区发展，建设成本较低' },
  { key: 'eco_reserve', icon: '🌿', name: '生态保护修复区', area: 800, category: '混合用地',
    gdpMultiplier: 0.005, ecologyImpact: 15, livelihoodImpact: 6, meritImpact: 8,
    desc: '将闲置地转为生态绿地，出让金极低但生态加分丰厚，长期利好' },
];

const CATEGORY_CONFIG = {
  '商业用地': { color: C.orange, bg: C.orangeLight, border: C.orangeBorder },
  '工业用地': { color: C.navy, bg: C.blueLight, border: C.blueMid },
  '住宅用地': { color: C.green, bg: C.greenLight, border: C.greenMid },
  '混合用地': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

// ── GDP产业结构配置 ──────────────────────────────
const INDUSTRY_POLICY = [
  { key: 'primary', label: '第一产业（农林牧渔）', icon: '🌾', boost: '提升农业补贴，稳定粮食安全', cost: 500,
    opinionDelta: 8, gdpDelta: 2, meritDelta: 3 },
  { key: 'secondary', label: '第二产业（制造业）', icon: '🏗️', boost: '招引高端制造项目，优化工业结构', cost: 2000,
    opinionDelta: 3, gdpDelta: 8, meritDelta: 6 },
  { key: 'tertiary', label: '第三产业（服务业）', icon: '🛍️', boost: '发展现代服务业，打造消费中心', cost: 1500,
    opinionDelta: 10, gdpDelta: 6, meritDelta: 8 },
];

export default function LandFinanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [loading, setLoading] = useState(false);
  const [soldToday, setSoldToday] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'land' | 'industry' | 'debt'>('land');

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gdp = save.cityGdp;
  const debtTotal = save.govDebtTotal;
  const debtRatio = gdp > 0 ? Math.round((debtTotal / (gdp * 10000)) * 100) : 0;
  const landTotal = save.landFinanceTotal;
  const landRatioOfBudget = save.fundBalance > 0 ? Math.round((landTotal / (save.fundBalance + landTotal)) * 100) : 0;

  // 地价 = GDP * 倍率（万元/亩）
  function calcPrice(parcel: LandParcel): number {
    return Math.round(gdp * parcel.gdpMultiplier * parcel.area);
  }

  async function handleAuction(parcel: LandParcel) {
    if (!save) return;
    if (soldToday.has(parcel.key)) return;
    const price = calcPrice(parcel);
    setLoading(true);
    const newFund = save.fundBalance + price;
    const newLandTotal = landTotal + price;
    const newLandCount = save.landParcelsSold + 1;
    const newGdp = Math.round(gdp * (1 + 0.01)); // 拍卖带动GDP微增
    const newEcology = Math.max(0, Math.min(100, save.cityEcology + parcel.ecologyImpact));
    const newLivelihood = Math.min(100, save.cityLivelihood + parcel.livelihoodImpact);
    const newMerit = save.meritPoints + parcel.meritImpact;
    // 土地出让金占比过高会降低廉洁度
    const moralPenalty = landRatioOfBudget > 60 ? -3 : 0;
    const newMoral = Math.max(0, save.moralValue + moralPenalty);
    await updateGameSave({
      fundBalance: newFund, landFinanceTotal: newLandTotal, landParcelsSold: newLandCount,
      cityGdp: newGdp, cityEcology: newEcology, cityLivelihood: newLivelihood,
      meritPoints: newMerit, moralValue: newMoral,
    });
    setSoldToday(prev => new Set([...prev, parcel.key]));
    const note = moralPenalty < 0 ? '（土地出让金占比过高，廉洁度-3）' : '';
    { const _lf1=`${parcel.name}拍卖成功！获得 ${price >= 10000 ? `${(price / 10000).toFixed(1)}亿` : `${price}万`} 元出让金。${note}`; void saveResult('landFinance_auction_'+parcel.name.replace(/ /g,'_'), {ok:true,desc:_lf1,day:save.gameDays??0}); setMsg({ text: _lf1, type: moralPenalty < 0 ? 'warn' : 'success' }); }
    setLoading(false);
  }

  async function handleIndustryBoost(policy: typeof INDUSTRY_POLICY[0]) {
    if (!save) return;
    if (save.fundBalance < policy.cost) { setMsg({ text: '财政资金不足', type: 'error' }); return; }
    setLoading(true);
    const newFund = save.fundBalance - policy.cost;
    const newOpinion = Math.min(100, save.publicOpinionIndex + policy.opinionDelta);
    const newGdp = Math.round(gdp * (1 + policy.gdpDelta / 100));
    const newMerit = save.meritPoints + policy.meritDelta;
    // 调整产业结构比例
    let { gdpPrimaryShare: p, gdpSecondaryShare: s, gdpTertiaryShare: t } = save;
    if (policy.key === 'primary') { p = Math.min(30, p + 3); s = Math.max(20, s - 1); t = Math.max(20, t - 2); }
    if (policy.key === 'secondary') { s = Math.min(60, s + 4); p = Math.max(5, p - 2); t = Math.max(20, t - 2); }
    if (policy.key === 'tertiary') { t = Math.min(70, t + 5); s = Math.max(20, s - 3); p = Math.max(5, p - 2); }
    await updateGameSave({
      fundBalance: newFund, publicOpinionIndex: newOpinion, cityGdp: newGdp,
      meritPoints: newMerit, gdpPrimaryShare: p, gdpSecondaryShare: s, gdpTertiaryShare: t,
    });
    { const _lf2=`${policy.label}扶持政策落地！GDP+${policy.gdpDelta}%，舆情+${policy.opinionDelta}，政绩+${policy.meritDelta}`; void saveResult('landFinance_policy_'+policy.key, {ok:true,desc:_lf2,day:save.gameDays??0}); setMsg({ text: _lf2, type: 'success' }); }
    setLoading(false);
  }

  async function handleDebtAction(action: 'borrow' | 'repay') {
    if (!save) return;
    const amount = action === 'borrow' ? Math.round(gdp * 500) : Math.round(debtTotal * 0.2);
    if (action === 'repay' && save.fundBalance < amount) { setMsg({ text: '财政资金不足，无法偿还债务', type: 'error' }); return; }
    setLoading(true);
    const newDebt = action === 'borrow' ? debtTotal + amount : Math.max(0, debtTotal - amount);
    const newFund = action === 'borrow' ? save.fundBalance + amount : save.fundBalance - amount;
    const meritDelta = action === 'borrow' ? (debtRatio >= 60 ? -5 : 2) : 3;
    await updateGameSave({ govDebtTotal: newDebt, fundBalance: newFund, meritPoints: save.meritPoints + meritDelta });
    setMsg({
      text: action === 'borrow'
        ? `成功申请专项债 ${(amount / 10000).toFixed(0)}万元。${debtRatio >= 60 ? '⚠️ 债务率已超警戒线，政绩-5' : '政绩+2'}`
        : `偿还债务 ${(amount / 10000).toFixed(0)}万元，债务率改善，政绩+3`,
      type: action === 'borrow' && debtRatio >= 60 ? 'warn' : 'success',
    });
    setLoading(false);
  }

  // GDP产业结构图
  const gdpShares = [
    { label: '第一产业', value: save.gdpPrimaryShare, color: '#4CAF50' },
    { label: '第二产业', value: save.gdpSecondaryShare, color: '#2196F3' },
    { label: '第三产业', value: save.gdpTertiaryShare, color: '#FF9800' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.header} />
      <View style={{ backgroundColor: C.header, paddingTop: insets.top + 6, paddingBottom: 14, paddingHorizontal: 18 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: C.goldLight, fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 }}>土地财政系统</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>土地拍卖 · 产业结构 · 债务管控</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: C.headerDark }}>
        {([['land', '🏗️ 土地拍卖'], ['industry', '📊 产业结构'], ['debt', '💳 债务管控']] as const).map(([tab, label]) => (
          <Pressable key={tab} onPress={() => setActiveTab(tab)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center',
            borderBottomWidth: activeTab === tab ? 3 : 0, borderBottomColor: C.gold }}>
            <Text style={{ fontSize: 12, fontWeight: activeTab === tab ? '900' : '400',
              color: activeTab === tab ? C.gold : 'rgba(255,255,255,0.55)' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>

        {msg && (
          <View style={{ borderRadius: 8, padding: 12, borderLeftWidth: 4,
            backgroundColor: msg.type === 'success' ? C.greenLight : msg.type === 'warn' ? C.goldLight : C.redLight,
            borderLeftColor: msg.type === 'success' ? C.green : msg.type === 'warn' ? C.gold : C.red }}>
            <Text style={{ fontSize: 12, color: msg.type === 'success' ? C.green : msg.type === 'warn' ? C.orange : C.red, fontWeight: '700', lineHeight: 18 }}>{msg.text}</Text>
            <Pressable onPress={() => setMsg(null)}><Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>点击关闭</Text></Pressable>
          </View>
        )}

        {/* 财政概览 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.label, marginBottom: 10 }}>💰 财政总览</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '城市GDP', value: `${gdp}亿`, color: C.navy },
              { label: '财政余额', value: save.fundBalance >= 10000 ? `${(save.fundBalance / 10000).toFixed(1)}亿` : `${save.fundBalance}万`, color: C.green },
              { label: '土地出让', value: landTotal >= 10000 ? `${(landTotal / 10000).toFixed(1)}亿` : `${landTotal}万`, color: '#C2410C' },
              { label: '债务率', value: `${debtRatio}%`, color: debtRatio >= 60 ? C.red : C.navy },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, alignItems: 'center', padding: 8,
                backgroundColor: '#F5F0E8', borderRadius: 6, borderWidth: 1, borderColor: C.divider }}>
                <Text style={{ fontSize: 13, fontWeight: '900', color: item.color }}>{item.value}</Text>
                <Text style={{ fontSize: 9, color: C.muted, marginTop: 2 }}>{item.label}</Text>
              </View>
            ))}
          </View>
          {debtRatio >= 60 && (
            <View style={{ marginTop: 10, backgroundColor: C.redLight, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: C.redMid, flexDirection: 'row', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>⚠️</Text>
              <Text style={{ fontSize: 11, color: C.red, flex: 1 }}>债务率 {debtRatio}% 已超警戒线(60%)，影响晋升考核评分，请及时偿还债务</Text>
            </View>
          )}
        </View>

        {/* ══ TAB: 土地拍卖 ══ */}
        {activeTab === 'land' && (
          <>
            <View style={{ backgroundColor: C.goldLight, borderRadius: 8, padding: 10, borderWidth: 1, borderColor: C.goldBorder, flexDirection: 'row', gap: 6 }}>
              <Text style={{ fontSize: 14 }}>ℹ️</Text>
              <Text style={{ fontSize: 11, color: C.label, flex: 1, lineHeight: 16 }}>
                土地出让金占财政收入比例过高（超60%）会降低廉洁度，建议多元化财政来源。本届已拍卖 {save.landParcelsSold} 块地块。
              </Text>
            </View>
            {LAND_PARCELS.map(parcel => {
              const price = calcPrice(parcel);
              const alreadySold = soldToday.has(parcel.key);
              const catConf = CATEGORY_CONFIG[parcel.category];
              return (
                <View key={parcel.key} style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: alreadySold ? 1 : 1.5,
                  borderColor: alreadySold ? C.divider : catConf.border, overflow: 'hidden', opacity: alreadySold ? 0.65 : 1 }}>
                  <View style={{ padding: 12, flexDirection: 'row', gap: 10 }}>
                    <Text style={{ fontSize: 30 }}>{parcel.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: C.navy }}>{parcel.name}</Text>
                        <View style={{ backgroundColor: catConf.bg, paddingHorizontal: 6, paddingVertical: 2,
                          borderRadius: 4, borderWidth: 1, borderColor: catConf.border }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: catConf.color }}>{parcel.category}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 15 }}>{parcel.desc}</Text>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>用地面积：{parcel.area} 亩</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        {[
                          { label: `出让金 ${price >= 10000 ? `${(price / 10000).toFixed(1)}亿` : `${price}万`}`, color: C.gold },
                          { label: `生态 ${parcel.ecologyImpact >= 0 ? '+' : ''}${parcel.ecologyImpact}`, color: parcel.ecologyImpact >= 0 ? C.green : C.red },
                          { label: `民生 +${parcel.livelihoodImpact}`, color: C.green },
                          { label: `政绩 +${parcel.meritImpact}`, color: C.blue },
                        ].map(badge => (
                          <View key={badge.label} style={{ paddingHorizontal: 7, paddingVertical: 3,
                            borderRadius: 4, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: badge.color + '40' }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                    <Pressable onPress={() => !loading && handleAuction(parcel)} disabled={loading || alreadySold}
                      style={{ borderRadius: 6, paddingVertical: 11, alignItems: 'center',
                        backgroundColor: alreadySold ? C.divider : C.green }}>
                      {loading && !alreadySold ? <ActivityIndicator color="#fff" /> :
                        <Text style={{ color: alreadySold ? C.muted : '#fff', fontWeight: '900', fontSize: 14 }}>
                          {alreadySold ? '✓ 已拍卖' : '🔨 立即拍卖'}
                        </Text>}
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ══ TAB: 产业结构 ══ */}
        {activeTab === 'industry' && (
          <>
            {/* 产业结构饼状进度 */}
            <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.label, marginBottom: 12 }}>📊 当前产业结构</Text>
              <View style={{ gap: 8 }}>
                {gdpShares.map(s => (
                  <View key={s.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 12, color: C.label, fontWeight: '600' }}>{s.label}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: s.color }}>{s.value}%</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: '#E5E0D8', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: '100%', borderRadius: 4, width: `${s.value}%`, backgroundColor: s.color }} />
                    </View>
                  </View>
                ))}
              </View>
              {save.gdpTertiaryShare >= 50 && (
                <View style={{ marginTop: 10, backgroundColor: C.greenLight, borderRadius: 6, padding: 8, borderWidth: 1, borderColor: C.greenMid, flexDirection: 'row', gap: 6 }}>
                  <Text>🏆</Text>
                  <Text style={{ fontSize: 11, color: C.green, fontWeight: '700', flex: 1 }}>第三产业占比已达{save.gdpTertiaryShare}%，超过50%目标，已获得产业优化政绩奖励！</Text>
                </View>
              )}
            </View>

            {/* 产业政策 */}
            {INDUSTRY_POLICY.map(policy => (
              <View key={policy.key} style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1.5, borderColor: C.border, overflow: 'hidden' }}>
                <View style={{ padding: 12, flexDirection: 'row', gap: 10 }}>
                  <Text style={{ fontSize: 28 }}>{policy.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '900', color: C.navy }}>{policy.label}</Text>
                    <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 15 }}>{policy.boost}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                      {[
                        { label: `花费 ${policy.cost}万`, color: C.orange },
                        { label: `GDP +${policy.gdpDelta}%`, color: C.blue },
                        { label: `舆情 +${policy.opinionDelta}`, color: C.green },
                        { label: `政绩 +${policy.meritDelta}`, color: '#7C3AED' },
                      ].map(b => (
                        <View key={b.label} style={{ paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: b.color + '40' }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: b.color }}>{b.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
                <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                  <Pressable onPress={() => !loading && handleIndustryBoost(policy)} disabled={loading}
                    style={{ borderRadius: 6, paddingVertical: 11, alignItems: 'center', backgroundColor: C.blue }}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>落实扶持政策 (-{policy.cost}万)</Text>}
                  </Pressable>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ══ TAB: 债务管控 ══ */}
        {activeTab === 'debt' && (
          <>
            {/* 债务状态 */}
            <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.label, marginBottom: 12 }}>💳 债务状态</Text>
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: C.label }}>政府债务总额</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: C.navy }}>
                    {debtTotal >= 10000 ? `${(debtTotal / 10000).toFixed(1)}亿` : `${debtTotal}万`} 元
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: C.label }}>债务率（债务/GDP）</Text>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: debtRatio >= 60 ? C.red : C.green }}>
                    {debtRatio}% {debtRatio >= 80 ? '🚨' : debtRatio >= 60 ? '⚠️' : '✅'}
                  </Text>
                </View>
                <View>
                  <View style={{ height: 10, backgroundColor: '#E5E0D8', borderRadius: 5, overflow: 'hidden' }}>
                    <View style={{ height: '100%', borderRadius: 5, width: `${Math.min(100, debtRatio)}%`,
                      backgroundColor: debtRatio >= 80 ? C.red : debtRatio >= 60 ? C.orange : C.green }} />
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3 }}>
                    <Text style={{ fontSize: 9, color: C.muted }}>警戒线 60%</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* 举债操作 */}
            <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
              <View style={{ backgroundColor: C.navy, padding: 12 }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>🏦 专项债申请</Text>
              </View>
              <View style={{ padding: 14, gap: 10 }}>
                <Text style={{ fontSize: 11, color: C.muted, lineHeight: 16 }}>
                  申请专项债可快速补充财政资金用于基础设施建设，但将增加债务率。债务率超60%将影响晋升考核评分，超80%触发财政危机警告。
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => !loading && handleDebtAction('borrow')} disabled={loading}
                    style={{ flex: 1, backgroundColor: debtRatio >= 80 ? '#E0D9CD' : C.blue, borderRadius: 6, padding: 12, alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 16 }}>📋</Text>
                    <Text style={{ color: debtRatio >= 80 ? C.muted : '#fff', fontWeight: '900', fontSize: 13 }}>申请专项债</Text>
                    <Text style={{ color: debtRatio >= 80 ? C.muted : 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                      约{(gdp * 500 / 10000).toFixed(0)}亿元
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => !loading && handleDebtAction('repay')} disabled={loading || debtTotal <= 0}
                    style={{ flex: 1, backgroundColor: debtTotal <= 0 ? '#E0D9CD' : C.green, borderRadius: 6, padding: 12, alignItems: 'center', gap: 3 }}>
                    <Text style={{ fontSize: 16 }}>💰</Text>
                    <Text style={{ color: debtTotal <= 0 ? C.muted : '#fff', fontWeight: '900', fontSize: 13 }}>提前偿债</Text>
                    <Text style={{ color: debtTotal <= 0 ? C.muted : 'rgba(255,255,255,0.7)', fontSize: 10 }}>
                      偿还20%（{(debtTotal * 0.2 / 10000).toFixed(0)}亿）
                    </Text>
                  </Pressable>
                </View>
                {debtRatio >= 80 && (
                  <View style={{ backgroundColor: C.redLight, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.redMid, flexDirection: 'row', gap: 6 }}>
                    <Text style={{ fontSize: 14 }}>🚨</Text>
                    <Text style={{ fontSize: 11, color: C.red, flex: 1, fontWeight: '700' }}>
                      债务率已超80%，财政危机警告！已暂停新增举债，请优先偿还债务。
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
