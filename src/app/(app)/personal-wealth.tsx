/**
 * 个人财产系统 v281
 * 全面重构：存款 / 房产 / 股权 / 境外资产
 * 反腐风险关联：资产越多越不透明，被查风险越高
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { RANK_SALARY, RANK_MONTHLY_ALLOWANCE } from '@/types/game';
import _personalAssetsJson from '@/config/personal-assets.json';

// ── 工具 ────────────────────────────────────────────────────────────────────
function fmtMoney(yuan: number): string {
  if (yuan >= 1_0000_0000) return `${(yuan / 1_0000_0000).toFixed(2)} 亿`;
  if (yuan >= 10_000) return `${(yuan / 10_000).toFixed(1)} 万`;
  return `${Math.round(yuan).toLocaleString()} 元`;
}

// ── 房产配置 ──────────────────────────────────────────────────────────────────
interface HouseItem {
  key: string;
  name: string;
  city: string;
  area: number;       // ㎡
  price: number;      // 购入总价（元）
  monthlyRent: number; // 月租金（元）
  appreciation: number; // 年化升值率（0.03=3%/年）
  minRank: number;
  riskAdd: number;    // 增加廉洁风险点数
  desc: string;
}

// 从 JSON 配置加载，修改数值只需编辑 src/config/personal-assets.json
const HOUSES: HouseItem[] = (_personalAssetsJson as { HOUSES: HouseItem[] }).HOUSES;

// ── 股权配置 ──────────────────────────────────────────────────────────────────
interface StockItem {
  key: string;
  name: string;
  type: string;
  invest: number;     // 投入金额（元）
  annualReturn: number; // 年化回报（可负）
  volatility: number; // 波动系数（每月±volatility随机浮动）
  minRank: number;
  riskAdd: number;
  desc: string;
}

// 从 JSON 配置加载，修改数值只需编辑 src/config/personal-assets.json
const STOCKS: StockItem[] = (_personalAssetsJson as { STOCKS: StockItem[] }).STOCKS;

// ── 境外资产配置 ──────────────────────────────────────────────────────────────
interface OverseasItem {
  key: string;
  name: string;
  country: string;
  cost: number;       // 购入成本（元）
  annualReturn: number;
  minRank: number;
  riskAdd: number;    // 高度敏感
  desc: string;
  legalWarning: string;
}

// 从 JSON 配置加载，修改数值只需编辑 src/config/personal-assets.json
const OVERSEAS: OverseasItem[] = (_personalAssetsJson as { OVERSEAS: OverseasItem[] }).OVERSEAS;

export default function PersonalWealthPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [activeTab, setActiveTab] = useState<'overview' | 'house' | 'stock' | 'overseas'>('overview');
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    void refreshSave();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const ownedAssets: string[] = save.personalAssets ?? [];
  const savings = save.personalSavings ?? 0;
  const rankLevel = save.rankLevel ?? 1;
  const salary = RANK_SALARY[rankLevel] ?? 5500;
  const allowance = RANK_MONTHLY_ALLOWANCE[rankLevel] ?? 500;
  const monthlyIncome = salary + allowance;
  const inspRisk = save.inspectionRisk ?? 0;

  // 计算各类资产价值
  const ownedHouses = HOUSES.filter(h => ownedAssets.includes(h.key));
  const ownedStocks = STOCKS.filter(s => ownedAssets.includes(s.key));
  const ownedOverseas = OVERSEAS.filter(o => ownedAssets.includes(o.key));

  const houseValue = ownedHouses.reduce((s, h) => s + h.price, 0);
  const stockValue = ownedStocks.reduce((s, st) => s + st.invest, 0);
  const overseasValue = ownedOverseas.reduce((s, o) => s + o.cost, 0);
  const totalWealth = savings + houseValue + stockValue + overseasValue;

  // 月租金收入
  const monthlyRentIncome = ownedHouses.reduce((s, h) => s + h.monthlyRent, 0);
  // 月股息预估
  const monthlyDividend = Math.round(ownedStocks.reduce((s, st) => s + st.invest * st.annualReturn / 12, 0));

  // 反腐风险评估
  const assetRiskAdd = [
    ...ownedHouses.map(h => h.riskAdd),
    ...ownedStocks.map(st => st.riskAdd),
    ...ownedOverseas.map(o => o.riskAdd),
  ].reduce((a, b) => a + b, 0);
  const totalRisk = Math.min(100, inspRisk + assetRiskAdd);

  const showFeedback = (msg: string, ok: boolean) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  // 购置资产（房产/股权/境外）
  const handleBuy = async (key: string, cost: number, riskAdd: number, name: string) => {
    if (acting) return;
    if (savings < cost) { showFeedback(`存款不足，需要 ${fmtMoney(cost)}`, false); return; }
    if (ownedAssets.includes(key)) { showFeedback('已持有该资产', false); return; }
    setActing(key);
    try {
      const newSavings = savings - cost;
      const newAssets = [...ownedAssets, key];
      const newRisk = Math.min(100, (save.inspectionRisk ?? 0) + riskAdd);
      await updateGameSave({ personalSavings: newSavings, personalAssets: newAssets, inspectionRisk: newRisk });
      showFeedback(`✅ 成功购入「${name}」，廉洁风险 +${riskAdd}`, true);
    } catch { showFeedback('操作失败，请重试', false); }
    finally { setActing(null); }
  };

  // 出售资产（房产）：回收原价×0.85
  const handleSell = async (key: string, price: number, name: string) => {
    if (acting) return;
    setActing(key + '_sell');
    try {
      const revenue = Math.round(price * 0.85);
      const newSavings = savings + revenue;
      const newAssets = ownedAssets.filter(k => k !== key);
      await updateGameSave({ personalSavings: newSavings, personalAssets: newAssets });
      showFeedback(`💰 出售「${name}」，回款 ${fmtMoney(revenue)}`, true);
    } catch { showFeedback('操作失败，请重试', false); }
    finally { setActing(null); }
  };

  // 领取租金收入（结算当月）
  const handleCollectRent = async () => {
    if (acting || monthlyRentIncome <= 0) return;
    setActing('collect_rent');
    try {
      await updateGameSave({ personalSavings: savings + monthlyRentIncome });
      showFeedback(`💵 租金到账 ${fmtMoney(monthlyRentIncome)}`, true);
    } catch { showFeedback('操作失败', false); }
    finally { setActing(null); }
  };

  // 颜色工具
  const riskColor = totalRisk >= 70 ? '#C82829' : totalRisk >= 45 ? '#E67E22' : '#16A34A';

  const TAB_LABELS: { key: typeof activeTab; label: string; icon: string }[] = [
    { key: 'overview', label: '总览', icon: '📊' },
    { key: 'house',    label: '房产', icon: '🏠' },
    { key: 'stock',    label: '股权', icon: '📈' },
    { key: 'overseas', label: '境外', icon: '🌏' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F6F2' }}>
      <StatusBar style="dark" />
      {/* 顶部栏 */}
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#1A3A5C',
        flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#8BAFCF', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#8BAFCF', fontSize: 10, letterSpacing: 2 }}>个人财产管理</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>💼 财产档案</Text>
        </View>
        <View style={{
          backgroundColor: totalRisk >= 60 ? 'rgba(200,40,41,0.25)' : 'rgba(255,255,255,0.12)',
          paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
          borderWidth: 1, borderColor: totalRisk >= 60 ? '#C82829' : 'transparent',
        }}>
          <Text style={{ color: riskColor, fontSize: 10, fontWeight: '700' }}>廉洁风险 {totalRisk}%</Text>
        </View>
      </View>

      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#EEF0F4', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {TAB_LABELS.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: 3,
              borderBottomColor: activeTab === tab.key ? '#1A3A5C' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: activeTab === tab.key ? '800' : '500', color: activeTab === tab.key ? '#1A3A5C' : '#888' }}>
              {tab.icon} {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* ══ 总览 Tab ══ */}
        {activeTab === 'overview' && (<>

          {/* 财富总额卡 */}
          <View style={{ backgroundColor: '#1A3A5C', borderRadius: 14, padding: 18, gap: 8 }}>
            <Text style={{ color: '#8BAFCF', fontSize: 10, letterSpacing: 2 }}>个人净资产（估值）</Text>
            <Text style={{ color: '#fff', fontSize: 28, fontWeight: '900' }}>{fmtMoney(totalWealth)}</Text>
            <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 4 }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {[
                { label: '存款', value: fmtMoney(savings), color: '#7EC8E3' },
                { label: '房产', value: fmtMoney(houseValue), color: '#F9C74F' },
                { label: '股权', value: fmtMoney(stockValue), color: '#90BE6D' },
                { label: '境外', value: fmtMoney(overseasValue), color: '#FF6B6B' },
              ].map(item => (
                <View key={item.label} style={{ alignItems: 'center', flex: 1 }}>
                  <Text style={{ color: item.color, fontSize: 12, fontWeight: '700' }}>{item.value}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, marginTop: 2 }}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 月收入预估 */}
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8EAF0', gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A3A5C', letterSpacing: 1 }}>📥 月度收入预估</Text>
            {[
              { label: '工资 + 津贴', value: monthlyIncome, color: '#1A3A5C' },
              { label: '房产租金', value: monthlyRentIncome, color: '#D97706' },
              { label: '股权分红', value: monthlyDividend, color: '#16A34A' },
            ].map(item => (
              <View key={item.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#555' }}>{item.label}</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: item.color }}>+{fmtMoney(item.value)}</Text>
              </View>
            ))}
            <View style={{ height: 1, backgroundColor: '#EEE' }} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#333', fontWeight: '700' }}>月度合计</Text>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#1A3A5C' }}>+{fmtMoney(monthlyIncome + monthlyRentIncome + monthlyDividend)}</Text>
            </View>
            {monthlyRentIncome > 0 && (
              <Pressable
                onPress={handleCollectRent}
                disabled={!!acting}
                style={{ backgroundColor: acting ? '#E5E7EB' : '#D97706', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  {acting === 'collect_rent' ? '结算中…' : `🏠 手动结算租金收入 (+${fmtMoney(monthlyRentIncome)})`}
                </Text>
              </Pressable>
            )}
          </View>

          {/* 反腐风险评估 */}
          <View style={{ backgroundColor: totalRisk >= 70 ? '#FEF2F2' : '#F0FDF4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: totalRisk >= 70 ? '#FECACA' : '#BBF7D0', gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: riskColor }}>⚠️ 反腐风险评估</Text>
              <Text style={{ fontSize: 14, fontWeight: '900', color: riskColor }}>{totalRisk}%</Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: 8, width: `${totalRisk}%`, backgroundColor: riskColor, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
              {totalRisk >= 70
                ? '⛔ 资产配置高度敏感！境外资产或代持股权可能触发专项调查，建议立即处置高风险资产。'
                : totalRisk >= 45
                ? '⚠️ 资产不透明度较高，需注意合规申报，避免被举报。'
                : '✅ 资产结构相对合理，廉洁风险可控。'}
            </Text>
            {assetRiskAdd > 0 && (
              <Text style={{ fontSize: 10, color: '#888' }}>持有资产带来额外风险：+{assetRiskAdd}点（基础风险：{inspRisk}点）</Text>
            )}
          </View>

          {/* 持有资产清单 */}
          {ownedAssets.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8EAF0', gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#333', letterSpacing: 1 }}>📋 持有资产清单</Text>
              {ownedHouses.map(h => (
                <View key={h.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>🏠</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{h.name}</Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>{h.city} · {h.area}㎡ · 月租 {fmtMoney(h.monthlyRent)}</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A3A5C' }}>{fmtMoney(h.price)}</Text>
                </View>
              ))}
              {ownedStocks.map(s => (
                <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>📈</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{s.name}</Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>{s.type} · 年化 {Math.round(s.annualReturn * 100)}%</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#16A34A' }}>{fmtMoney(s.invest)}</Text>
                </View>
              ))}
              {ownedOverseas.map(o => (
                <View key={o.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>🌏</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{o.name}</Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>{o.country} · 年化 {Math.round(o.annualReturn * 100)}%</Text>
                  </View>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#C82829' }}>{fmtMoney(o.cost)}</Text>
                </View>
              ))}
            </View>
          )}
        </>)}

        {/* ══ 房产 Tab ══ */}
        {activeTab === 'house' && (<>
          <View style={{ backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
            <Text style={{ fontSize: 11, color: '#92400E', lineHeight: 18 }}>
              🏠 购置房产可每月获得租金收入，同时随通货膨胀升值。房产出售按购入价85折回款。廉洁风险会随持有资产增加。
            </Text>
          </View>
          {HOUSES.map(house => {
            const owned = ownedAssets.includes(house.key);
            const locked = rankLevel < house.minRank;
            const canBuy = !owned && !locked && savings >= house.price;
            return (
              <View key={house.key} style={{
                backgroundColor: '#fff', borderRadius: 12, borderWidth: locked ? 1 : 2,
                borderColor: owned ? '#D97706' : locked ? '#E5E7EB' : '#1A3A5C',
                padding: 14, opacity: locked ? 0.5 : 1,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 32 }}>🏠</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: owned ? '#D97706' : '#1A3A5C' }}>{house.name}</Text>
                      {owned && <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#D97706', fontWeight: '700' }}>✓ 持有中</Text></View>}
                      {locked && <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#9CA3AF' }}>🔒 {house.minRank}级</Text></View>}
                    </View>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{house.city} · {house.area}㎡</Text>
                    <Text style={{ fontSize: 10, color: '#555', marginTop: 4, lineHeight: 16 }}>{house.desc}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>总价 {fmtMoney(house.price)}</Text>
                  </View>
                  <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#D97706', fontWeight: '600' }}>月租 {fmtMoney(house.monthlyRent)}</Text>
                  </View>
                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '600' }}>年化升值 {Math.round(house.appreciation * 100)}%</Text>
                  </View>
                  <View style={{ backgroundColor: house.riskAdd >= 8 ? '#FEF2F2' : '#F9FAFB', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: house.riskAdd >= 8 ? '#C82829' : '#6B7280' }}>廉洁风险 +{house.riskAdd}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                  {!owned && (
                    <Pressable
                      onPress={() => handleBuy(house.key, house.price, house.riskAdd, house.name)}
                      disabled={locked || !canBuy || !!acting}
                      style={{
                        flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center',
                        backgroundColor: !canBuy || locked ? '#F3F4F6' : '#1A3A5C',
                      }}
                    >
                      <Text style={{ color: !canBuy || locked ? '#9CA3AF' : '#fff', fontSize: 12, fontWeight: '700' }}>
                        {locked ? `🔒 需${house.minRank}级` : savings < house.price ? '存款不足' : '购置房产'}
                      </Text>
                    </Pressable>
                  )}
                  {owned && (
                    <Pressable
                      onPress={() => handleSell(house.key, house.price, house.name)}
                      disabled={!!acting}
                      style={{ flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#D97706' }}
                    >
                      <Text style={{ color: '#D97706', fontSize: 12, fontWeight: '700' }}>
                        出售（回款 {fmtMoney(Math.round(house.price * 0.85))}）
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            );
          })}
        </>)}

        {/* ══ 股权 Tab ══ */}
        {activeTab === 'stock' && (<>
          <View style={{ backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' }}>
            <Text style={{ fontSize: 11, color: '#166534', lineHeight: 18 }}>
              📈 股权投资可获得年化收益，每月自动计息入账到存款。亲属代持股权收益高但廉洁风险极高，需谨慎。
            </Text>
          </View>
          {STOCKS.map(stock => {
            const owned = ownedAssets.includes(stock.key);
            const locked = rankLevel < stock.minRank;
            const canBuy = !owned && !locked && savings >= stock.invest;
            return (
              <View key={stock.key} style={{
                backgroundColor: '#fff', borderRadius: 12, borderWidth: locked ? 1 : 2,
                borderColor: owned ? '#16A34A' : locked ? '#E5E7EB' : '#1F5C2B',
                padding: 14, opacity: locked ? 0.5 : 1,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 32 }}>📈</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: owned ? '#16A34A' : '#1F5C2B' }}>{stock.name}</Text>
                      {owned && <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#16A34A', fontWeight: '700' }}>✓ 持仓中</Text></View>}
                      {locked && <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#9CA3AF' }}>🔒 {stock.minRank}级</Text></View>}
                    </View>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{stock.type}</Text>
                    <Text style={{ fontSize: 10, color: '#555', marginTop: 4, lineHeight: 16 }}>{stock.desc}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>投入 {fmtMoney(stock.invest)}</Text>
                  </View>
                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '600' }}>年化 {Math.round(stock.annualReturn * 100)}%</Text>
                  </View>
                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '600' }}>月收益 ≈{fmtMoney(Math.round(stock.invest * stock.annualReturn / 12))}</Text>
                  </View>
                  {stock.riskAdd > 0 && (
                    <View style={{ backgroundColor: stock.riskAdd >= 10 ? '#FEF2F2' : '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                      <Text style={{ fontSize: 10, color: stock.riskAdd >= 10 ? '#C82829' : '#D97706' }}>廉洁风险 +{stock.riskAdd}</Text>
                    </View>
                  )}
                </View>
                {!owned && (
                  <Pressable
                    onPress={() => handleBuy(stock.key, stock.invest, stock.riskAdd, stock.name)}
                    disabled={locked || !canBuy || !!acting}
                    style={{ marginTop: 10, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: !canBuy || locked ? '#F3F4F6' : '#1F5C2B' }}
                  >
                    <Text style={{ color: !canBuy || locked ? '#9CA3AF' : '#fff', fontSize: 12, fontWeight: '700' }}>
                      {locked ? `🔒 需${stock.minRank}级` : savings < stock.invest ? '存款不足' : `投入 ${fmtMoney(stock.invest)}`}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </>)}

        {/* ══ 境外资产 Tab ══ */}
        {activeTab === 'overseas' && (<>
          <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA', gap: 4 }}>
            <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '700' }}>⚠️ 高度敏感警告</Text>
            <Text style={{ fontSize: 11, color: '#991B1B', lineHeight: 18 }}>
              持有境外资产需严格履行申报义务。离岸账户和境外豪宅属于高危资产，一旦被查将面临双规乃至刑事追诉。
            </Text>
          </View>
          {OVERSEAS.map(overseas => {
            const owned = ownedAssets.includes(overseas.key);
            const locked = rankLevel < overseas.minRank;
            const canBuy = !owned && !locked && savings >= overseas.cost;
            return (
              <View key={overseas.key} style={{
                backgroundColor: '#fff', borderRadius: 12, borderWidth: locked ? 1 : 2,
                borderColor: owned ? '#C82829' : locked ? '#E5E7EB' : '#7F1D1D',
                padding: 14, opacity: locked ? 0.5 : 1,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 32 }}>🌏</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: owned ? '#C82829' : '#7F1D1D' }}>{overseas.name}</Text>
                      {owned && <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#C82829', fontWeight: '700' }}>⚠️ 持有中</Text></View>}
                      {locked && <View style={{ backgroundColor: '#F3F4F6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 9, color: '#9CA3AF' }}>🔒 {overseas.minRank}级</Text></View>}
                    </View>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{overseas.country}</Text>
                    <Text style={{ fontSize: 10, color: '#555', marginTop: 4, lineHeight: 16 }}>{overseas.desc}</Text>
                  </View>
                </View>
                <View style={{ backgroundColor: '#FEF2F2', borderRadius: 6, padding: 8, marginTop: 8 }}>
                  <Text style={{ fontSize: 10, color: '#991B1B', fontWeight: '600' }}>{overseas.legalWarning}</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: '#EFF6FF', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#1D4ED8', fontWeight: '600' }}>成本 {fmtMoney(overseas.cost)}</Text>
                  </View>
                  <View style={{ backgroundColor: '#F0FDF4', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#16A34A', fontWeight: '600' }}>年化 {Math.round(overseas.annualReturn * 100)}%</Text>
                  </View>
                  <View style={{ backgroundColor: '#FEF2F2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>廉洁风险 +{overseas.riskAdd}⚠️</Text>
                  </View>
                </View>
                {!owned && (
                  <Pressable
                    onPress={() => handleBuy(overseas.key, overseas.cost, overseas.riskAdd, overseas.name)}
                    disabled={locked || !canBuy || !!acting}
                    style={{ marginTop: 10, borderRadius: 8, paddingVertical: 10, alignItems: 'center', backgroundColor: !canBuy || locked ? '#F3F4F6' : '#7F1D1D' }}
                  >
                    <Text style={{ color: !canBuy || locked ? '#9CA3AF' : '#FF9090', fontSize: 12, fontWeight: '700' }}>
                      {locked ? `🔒 需${overseas.minRank}级` : savings < overseas.cost ? '存款不足' : `⚠️ 购入（风险自负）`}
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </>)}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* 操作反馈 */}
      {feedback !== '' && (
        <View style={{
          position: 'absolute', bottom: insets.bottom + 16, left: 14, right: 14,
          backgroundColor: feedbackOk ? '#1A3A5C' : '#C82829',
          borderRadius: 10, padding: 12,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center' }}>{feedback}</Text>
        </View>
      )}
    </View>
  );
}