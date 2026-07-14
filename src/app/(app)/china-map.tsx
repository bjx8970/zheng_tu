// 全国地图页面（辅助功能）
// 31省级行政区平面地图，点击省份查看下级城市、GDP、人口、官员等信息
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { PROVINCE_CITY_MAP } from '@/types/game';

// ── 常量 ────────────────────────────────────────────────────
const BG = '#F4F4F0';
const HEADER = '#1D3B5E';
const CARD = '#FFFFFF';
const BORDER = '#D6CFC4';
const PRIMARY = '#1D3B5E';
const MUTED = '#888';

// 派系颜色映射
const FACTION_COLORS: Record<string, string> = {
  reform:     '#1565C0',
  pragmatic:  '#1B5E20',
  neutral:    '#E65100',
  economy:    '#4A148C',
  discipline: '#B71C1C',
};
const FACTION_NAMES: Record<string, string> = {
  reform:     '改革系',
  pragmatic:  '国家系',
  neutral:    '团派系',
  economy:    '技术系',
  discipline: '纪检系',
};

// 省级基础数据（含简称、类型、经济/人口基准参数）
interface ProvData {
  name: string;       // 省全名（与 PROVINCE_CITY_MAP key 一致）
  abbr: string;       // 简称（用于版图 key）
  type: string;
  gdpBase: number;    // GDP 基准（亿元）
  popBase: number;    // 人口（万人）
  perCapitaIncome: number; // 人均年收入（元）
  icon: string;
  color: string;      // 地图格子颜色
}

const PROV_DATA: ProvData[] = [
  { name: '京都市',         abbr: '京', type: '直辖市',   gdpBase: 40270,  popBase: 2189,  perCapitaIncome: 75000, icon: '🏛️', color: '#EF5350' },
  { name: '津门市',         abbr: '津', type: '直辖市',   gdpBase: 16311,  popBase: 1372,  perCapitaIncome: 51000, icon: '🌊', color: '#42A5F5' },
  { name: '沪海市',         abbr: '沪', type: '直辖市',   gdpBase: 44652,  popBase: 2489,  perCapitaIncome: 79000, icon: '🌆', color: '#FF7043' },
  { name: '渝江市',         abbr: '渝', type: '直辖市',   gdpBase: 29129,  popBase: 3213,  perCapitaIncome: 38000, icon: '🏔️', color: '#26A69A' },
  { name: '燕赵省',         abbr: '冀', type: '省份',     gdpBase: 42370,  popBase: 7448,  perCapitaIncome: 32000, icon: '🌾', color: '#66BB6A' },
  { name: '中原省',         abbr: '豫', type: '省份',     gdpBase: 61345,  popBase: 9883,  perCapitaIncome: 30000, icon: '🏟️', color: '#FFA726' },
  { name: '滇南省',         abbr: '云', type: '省份',     gdpBase: 29900,  popBase: 4720,  perCapitaIncome: 27000, icon: '🌿', color: '#26C6DA' },
  { name: '辽东省',         abbr: '辽', type: '省份',     gdpBase: 28975,  popBase: 4259,  perCapitaIncome: 39000, icon: '❄️', color: '#7E57C2' },
  { name: '龙江省',         abbr: '黑', type: '省份',     gdpBase: 15901,  popBase: 3175,  perCapitaIncome: 29000, icon: '🌲', color: '#5C6BC0' },
  { name: '湘楚省',         abbr: '湘', type: '省份',     gdpBase: 48899,  popBase: 6618,  perCapitaIncome: 38000, icon: '🌶️', color: '#EC407A' },
  { name: '皖江省',         abbr: '皖', type: '省份',     gdpBase: 44680,  popBase: 6127,  perCapitaIncome: 35000, icon: '🍵', color: '#AB47BC' },
  { name: '齐鲁省',         abbr: '鲁', type: '省份',     gdpBase: 92069,  popBase: 10162, perCapitaIncome: 42000, icon: '⛩️', color: '#8D6E63' },
  { name: '西域维吾尔自治区', abbr: '新', type: '自治区',  gdpBase: 17716,  popBase: 2585,  perCapitaIncome: 30000, icon: '🐪', color: '#D4E157' },
  { name: '江淮省',         abbr: '苏', type: '省份',     gdpBase: 122875, popBase: 8505,  perCapitaIncome: 58000, icon: '🌸', color: '#EF5350' },
  { name: '浙越省',         abbr: '浙', type: '省份',     gdpBase: 82553,  popBase: 6540,  perCapitaIncome: 62000, icon: '🌊', color: '#26A69A' },
  { name: '赣鄱省',         abbr: '赣', type: '省份',     gdpBase: 32200,  popBase: 4527,  perCapitaIncome: 31000, icon: '🐲', color: '#FF7043' },
  { name: '荆楚省',         abbr: '鄂', type: '省份',     gdpBase: 55803,  popBase: 5775,  perCapitaIncome: 40000, icon: '🌸', color: '#FFCA28' },
  { name: '桂南壮族自治区', abbr: '桂', type: '自治区',   gdpBase: 26396,  popBase: 5046,  perCapitaIncome: 27000, icon: '🎋', color: '#66BB6A' },
  { name: '陇西省',         abbr: '甘', type: '省份',     gdpBase: 11200,  popBase: 2502,  perCapitaIncome: 25000, icon: '🐪', color: '#FFA726' },
  { name: '晋中省',         abbr: '晋', type: '省份',     gdpBase: 22590,  popBase: 3491,  perCapitaIncome: 32000, icon: '⛰️', color: '#78909C' },
  { name: '内蒙古自治区',   abbr: '蒙', type: '自治区',   gdpBase: 22753,  popBase: 2400,  perCapitaIncome: 37000, icon: '🐎', color: '#26C6DA' },
  { name: '关中省',         abbr: '陕', type: '省份',     gdpBase: 33786,  popBase: 3954,  perCapitaIncome: 37000, icon: '🏯', color: '#8D6E63' },
  { name: '吉辽省',         abbr: '吉', type: '省份',     gdpBase: 13070,  popBase: 2407,  perCapitaIncome: 30000, icon: '🌾', color: '#42A5F5' },
  { name: '闽台省',         abbr: '闽', type: '省份',     gdpBase: 54355,  popBase: 4194,  perCapitaIncome: 55000, icon: '🌺', color: '#EC407A' },
  { name: '黔贵省',         abbr: '贵', type: '省份',     gdpBase: 20165,  popBase: 3856,  perCapitaIncome: 25000, icon: '🎵', color: '#AB47BC' },
  { name: '粤港省',         abbr: '粤', type: '省份',     gdpBase: 129118, popBase: 12601, perCapitaIncome: 68000, icon: '🌃', color: '#EF5350' },
  { name: '川蜀省',         abbr: '川', type: '省份',     gdpBase: 60132,  popBase: 8374,  perCapitaIncome: 36000, icon: '🐼', color: '#FFCA28' },
  { name: '青藏省',         abbr: '青', type: '省份',     gdpBase: 3799,   popBase: 592,   perCapitaIncome: 28000, icon: '🏔️', color: '#7E57C2' },
  { name: '琼州省',         abbr: '琼', type: '省份',     gdpBase: 6818,   popBase: 1008,  perCapitaIncome: 34000, icon: '🏝️', color: '#26A69A' },
  { name: '宁川回族自治区', abbr: '宁', type: '自治区',   gdpBase: 5313,   popBase: 725,   perCapitaIncome: 28000, icon: '🌙', color: '#D4E157' },
  { name: '雪域藏族自治区', abbr: '藏', type: '自治区',   gdpBase: 2132,   popBase: 364,   perCapitaIncome: 22000, icon: '⛰️', color: '#5C6BC0' },
];

// 随机生成一个官员名字（固定哈希，保证稳定显示）
function hashName(seed: string, gender: '男' | '女'): string {
  const surnames = ['王', '李', '张', '刘', '陈', '杨', '黄', '赵', '吴', '周', '徐', '孙'];
  const maleNames = ['建国', '志远', '宏伟', '学平', '正华', '友明', '立民', '德强', '承志', '文博'];
  const femaleNames = ['玉英', '慧敏', '秀兰', '燕华', '丽萍', '春梅', '晓燕', '玉梅', '敏君', '桂芳'];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const s = surnames[h % surnames.length];
  const names = gender === '男' ? maleNames : femaleNames;
  return s + names[(h >> 4) % names.length];
}

// 生成官员列表
function getOfficials(abbr: string): { role: string; name: string; faction: string }[] {
  const factions = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'];
  const getFaction = (seed: string) => factions[seed.charCodeAt(0) % 5];
  return [
    { role: '党委书记', name: hashName(abbr + '书记', '男'), faction: getFaction(abbr + 'A') },
    { role: '省长/市长', name: hashName(abbr + '省长', '男'), faction: getFaction(abbr + 'B') },
    { role: '人大主任', name: hashName(abbr + '人大', '男'), faction: getFaction(abbr + 'C') },
    { role: '纪委书记', name: hashName(abbr + '纪委', '女'), faction: getFaction(abbr + 'D') },
  ];
}

export default function ChinaMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [selectedProv, setSelectedProv] = useState<ProvData | null>(null);
  const [detailTab, setDetailTab] = useState<'info' | 'cities' | 'officials'>('info');

  const provinceMap = save?.factionProvinceMap ?? {};
  const myFaction = save?.primaryFaction ?? '';
  const myCityName = save?.cityName ?? '';

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="light" backgroundColor={HEADER} />

      {/* 顶部 */}
      <View style={{ backgroundColor: HEADER, paddingTop: 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => selectedProv ? setSelectedProv(null) : router.back()}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 13 }}>{selectedProv ? '返回地图' : '返回'}</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>
          🗺️ {selectedProv ? selectedProv.name : '全国地图'}
        </Text>
        {!selectedProv && (
          <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 2 }}>
            共 {PROV_DATA.length} 个省级行政区 · 当前任职：{myCityName}
          </Text>
        )}
      </View>

      {selectedProv ? (
        // ── 省份详情 ────────────────────────────────────────
        <View style={{ flex: 1 }}>
          {/* 省份基本信息条 */}
          <View style={{ backgroundColor: selectedProv.color + 'DD', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>{selectedProv.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{selectedProv.name}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 1 }}>
                {selectedProv.type} · {selectedProv.abbr}
                {provinceMap[selectedProv.abbr]
                  ? ` · 派系：${FACTION_NAMES[provinceMap[selectedProv.abbr]] ?? provinceMap[selectedProv.abbr]}`
                  : ' · 派系：中立'}
              </Text>
            </View>
          </View>

          {/* 详情 Tab */}
          <View style={{ flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
            {([['info', '📊 基本数据'], ['cities', '🏙️ 下级城市'], ['officials', '👤 主要官员']] as [string, string][]).map(([key, label]) => (
              <Pressable key={key} onPress={() => setDetailTab(key as typeof detailTab)}
                style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: detailTab === key ? PRIMARY : 'transparent' }}>
                <Text style={{ fontSize: 11, fontWeight: detailTab === key ? '700' : '400', color: detailTab === key ? PRIMARY : MUTED }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 40 }}>
            {detailTab === 'info' && (
              <>
                {/* GDP/人口/收入卡片 */}
                {[
                  { label: 'GDP 总量', value: `${(selectedProv.gdpBase / 10000).toFixed(2)} 万亿元`, icon: '💰' },
                  { label: '常住人口', value: `${selectedProv.popBase.toLocaleString()} 万人`, icon: '👥' },
                  { label: '人均年收入', value: `${selectedProv.perCapitaIncome.toLocaleString()} 元`, icon: '💵' },
                  { label: '行政类型', value: selectedProv.type, icon: '🏛️' },
                  { label: '下辖城市', value: `${(PROVINCE_CITY_MAP[selectedProv.name] ?? []).length} 个`, icon: '🏙️' },
                ].map(item => (
                  <View key={item.label} style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: MUTED }}>{item.label}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: PRIMARY, marginTop: 2 }}>{item.value}</Text>
                    </View>
                  </View>
                ))}
                {/* 派系控制 */}
                {provinceMap[selectedProv.abbr] && (
                  <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12 }}>
                    <Text style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>派系控制</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: FACTION_COLORS[provinceMap[selectedProv.abbr]] ?? '#888' }} />
                      <Text style={{ fontSize: 14, fontWeight: '700', color: FACTION_COLORS[provinceMap[selectedProv.abbr]] ?? '#333' }}>
                        {FACTION_NAMES[provinceMap[selectedProv.abbr]] ?? provinceMap[selectedProv.abbr]}
                      </Text>
                      {provinceMap[selectedProv.abbr] === myFaction && (
                        <Text style={{ fontSize: 11, color: '#2E7D32', backgroundColor: '#E8F5E9', paddingHorizontal: 6, paddingVertical: 2 }}>己方</Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}

            {detailTab === 'cities' && (
              (PROVINCE_CITY_MAP[selectedProv.name] ?? []).length === 0 ? (
                <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 20, alignItems: 'center' }}>
                  <Text style={{ color: MUTED, fontSize: 13 }}>暂无城市数据</Text>
                </View>
              ) : (
                (PROVINCE_CITY_MAP[selectedProv.name] ?? []).map((city, i) => (
                  <View key={i} style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ width: 24, height: 24, textAlign: 'center', lineHeight: 24, fontSize: 11, color: '#fff', backgroundColor: selectedProv.color, borderRadius: 12, overflow: 'hidden', fontWeight: '700' }}>
                      {i + 1}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: city === myCityName ? '800' : '600', color: city === myCityName ? PRIMARY : '#333' }}>
                        {city} {city === myCityName ? '📍 当前任职' : ''}
                      </Text>
                      <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>
                        人均年收入约 {Math.round(selectedProv.perCapitaIncome * (0.7 + Math.random() * 0.6)).toLocaleString()} 元
                      </Text>
                    </View>
                  </View>
                ))
              )
            )}

            {detailTab === 'officials' && (
              getOfficials(selectedProv.abbr).map((off, i) => (
                <View key={i} style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: selectedProv.color + '44', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: selectedProv.color }}>{off.name.slice(-1)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>{off.name}</Text>
                    <Text style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{off.role}</Text>
                  </View>
                  <View style={{ backgroundColor: (FACTION_COLORS[off.faction] ?? '#888') + '22', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                    <Text style={{ fontSize: 11, color: FACTION_COLORS[off.faction] ?? '#888', fontWeight: '700' }}>
                      {FACTION_NAMES[off.faction] ?? off.faction}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      ) : (
        // ── 全国地图网格 ────────────────────────────────────────
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }}>
          {/* 图例 */}
          <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 10, marginBottom: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY, marginBottom: 6 }}>派系版图图例</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(FACTION_NAMES).map(([key, name]) => (
                <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: FACTION_COLORS[key] }} />
                  <Text style={{ fontSize: 11, color: '#333' }}>{name}</Text>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#ccc' }} />
                <Text style={{ fontSize: 11, color: '#333' }}>中立</Text>
              </View>
            </View>
          </View>

          {/* 省份网格（5列布局）*/}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PROV_DATA.map(prov => {
              const factionKey = provinceMap[prov.abbr];
              const factionColor = factionKey ? (FACTION_COLORS[factionKey] ?? '#888') : '#ccc';
              const isMyFaction = factionKey === myFaction;
              const isCurrentCity = (PROVINCE_CITY_MAP[prov.name] ?? []).some(c => c === myCityName) ||
                prov.name === myCityName;
              return (
                <Pressable
                  key={prov.abbr}
                  onPress={() => setSelectedProv(prov)}
                  style={{
                    width: '18%',
                    aspectRatio: 1,
                    backgroundColor: prov.color + (isMyFaction ? 'FF' : '99'),
                    borderWidth: isCurrentCity ? 2.5 : isMyFaction ? 1.5 : 1,
                    borderColor: isCurrentCity ? '#FFD700' : isMyFaction ? '#fff' : 'rgba(0,0,0,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}>
                  {/* 派系角标 */}
                  {factionKey && (
                    <View style={{ position: 'absolute', top: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: factionColor }} />
                  )}
                  <Text style={{ fontSize: 11, color: '#fff', fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 }}>{prov.abbr}</Text>
                  <Text style={{ fontSize: 8, color: 'rgba(255,255,255,0.9)', marginTop: 1 }}>{prov.icon}</Text>
                  {isCurrentCity && (
                    <Text style={{ fontSize: 8, color: '#FFD700', fontWeight: '700' }}>📍</Text>
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* 统计区 */}
          <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12, marginTop: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: PRIMARY, marginBottom: 8 }}>全国概况</Text>
            <View style={{ gap: 4 }}>
              {[
                { label: '省级行政区总数', value: `${PROV_DATA.length} 个` },
                { label: '总人口（估算）', value: `${Math.round(PROV_DATA.reduce((s, p) => s + p.popBase, 0) / 100) / 10} 亿` },
                { label: 'GDP 总量（估算）', value: `${(PROV_DATA.reduce((s, p) => s + p.gdpBase, 0) / 10000).toFixed(1)} 万亿元` },
                { label: '派系已控省份', value: `${Object.keys(provinceMap).length} / ${PROV_DATA.length}` },
              ].map(row => (
                <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 12, color: MUTED }}>{row.label}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY }}>{row.value}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
