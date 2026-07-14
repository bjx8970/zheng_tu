// 全国省份平面地图 — 格子式省份地图 + 历任职务轨迹 + 省份GDP政绩排名
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 省份数据（34个省级行政区，含直辖市+自治区+特别行政区）──────────────
interface ProvinceData {
  id: string;
  name: string;
  abbr: string;
  capital: string;
  population: number;
  gdp: number;
  area: number;
  region: '华北' | '东北' | '华东' | '华中' | '华南' | '西南' | '西北' | '特别行政区';
  row: number;
  col: number;
  cities: CityInfo[];
}

interface CityInfo {
  name: string;
  population: number;
  gdp: number;
  isCapital: boolean;
}

const REGION_COLOR: Record<string, { bg: string; border: string; text: string }> = {
  华北: { bg: '#1E3A5F', border: '#2563EB', text: '#93C5FD' },
  东北: { bg: '#1B3A2D', border: '#16A34A', text: '#86EFAC' },
  华东: { bg: '#3B1F0E', border: '#EA580C', text: '#FED7AA' },
  华中: { bg: '#3B1218', border: '#DC2626', text: '#FCA5A5' },
  华南: { bg: '#1F2D3A', border: '#0891B2', text: '#A5F3FC' },
  西南: { bg: '#2D1A3E', border: '#7C3AED', text: '#DDD6FE' },
  西北: { bg: '#2D2208', border: '#D97706', text: '#FDE68A' },
  特别行政区: { bg: '#1A1A2E', border: '#E5C55D', text: '#FEF3C7' },
};

const PROVINCES: ProvinceData[] = [
  { id: 'bj', name: '北京', abbr: '京', capital: '北京', population: 2185, gdp: 41611, area: 1.64, region: '华北', row: 1, col: 5,
    cities: [{ name: '北京（直辖）', population: 2185, gdp: 41611, isCapital: true }] },
  { id: 'tj', name: '天津', abbr: '津', capital: '天津', population: 1388, gdp: 16311, area: 1.19, region: '华北', row: 2, col: 6,
    cities: [{ name: '天津（直辖）', population: 1388, gdp: 16311, isCapital: true }] },
  { id: 'hb', name: '河北', abbr: '冀', capital: '石家庄', population: 7448, gdp: 42370, area: 18.8, region: '华北', row: 2, col: 5,
    cities: [{ name: '石家庄', population: 1122, gdp: 7012, isCapital: true }, { name: '唐山', population: 797, gdp: 8900, isCapital: false }, { name: '保定', population: 1178, gdp: 4680, isCapital: false }] },
  { id: 'sx', name: '山西', abbr: '晋', capital: '太原', population: 3480, gdp: 25674, area: 15.6, region: '华北', row: 2, col: 4,
    cities: [{ name: '太原', population: 537, gdp: 5200, isCapital: true }, { name: '大同', population: 303, gdp: 1980, isCapital: false }] },
  { id: 'nmg', name: '内蒙古', abbr: '蒙', capital: '呼和浩特', population: 2405, gdp: 23161, area: 118.3, region: '华北', row: 1, col: 4,
    cities: [{ name: '呼和浩特', population: 345, gdp: 3300, isCapital: true }, { name: '包头', population: 298, gdp: 3700, isCapital: false }] },
  { id: 'ln', name: '辽宁', abbr: '辽', capital: '沈阳', population: 4197, gdp: 30073, area: 14.8, region: '东北', row: 1, col: 7,
    cities: [{ name: '沈阳', population: 914, gdp: 7268, isCapital: true }, { name: '大连', population: 745, gdp: 8430, isCapital: false }] },
  { id: 'jl', name: '吉林', abbr: '吉', capital: '长春', population: 2407, gdp: 13101, area: 18.7, region: '东北', row: 0, col: 7,
    cities: [{ name: '长春', population: 906, gdp: 6500, isCapital: true }, { name: '吉林市', population: 415, gdp: 2300, isCapital: false }] },
  { id: 'hlj', name: '黑龙江', abbr: '黑', capital: '哈尔滨', population: 3120, gdp: 16231, area: 47.3, region: '东北', row: 0, col: 6,
    cities: [{ name: '哈尔滨', population: 1007, gdp: 5800, isCapital: true }, { name: '大庆', population: 280, gdp: 2400, isCapital: false }] },
  { id: 'sh', name: '上海', abbr: '沪', capital: '上海', population: 2489, gdp: 47219, area: 0.63, region: '华东', row: 3, col: 7,
    cities: [{ name: '上海（直辖）', population: 2489, gdp: 47219, isCapital: true }] },
  { id: 'js', name: '江苏', abbr: '苏', capital: '南京', population: 8505, gdp: 122875, area: 10.7, region: '华东', row: 3, col: 6,
    cities: [{ name: '南京', population: 931, gdp: 17000, isCapital: true }, { name: '苏州', population: 1285, gdp: 24000, isCapital: false }, { name: '无锡', population: 748, gdp: 14000, isCapital: false }] },
  { id: 'zj', name: '浙江', abbr: '浙', capital: '杭州', population: 6540, gdp: 87550, area: 10.2, region: '华东', row: 4, col: 7,
    cities: [{ name: '杭州', population: 1237, gdp: 20000, isCapital: true }, { name: '宁波', population: 940, gdp: 15700, isCapital: false }] },
  { id: 'ah', name: '安徽', abbr: '皖', capital: '合肥', population: 6113, gdp: 44395, area: 14.0, region: '华东', row: 3, col: 5,
    cities: [{ name: '合肥', population: 985, gdp: 12011, isCapital: true }, { name: '芜湖', population: 440, gdp: 4600, isCapital: false }] },
  { id: 'fj', name: '福建', abbr: '闽', capital: '福州', population: 4154, gdp: 53109, area: 12.4, region: '华东', row: 5, col: 7,
    cities: [{ name: '福州', population: 829, gdp: 12000, isCapital: true }, { name: '厦门', population: 516, gdp: 7200, isCapital: false }] },
  { id: 'jx', name: '江西', abbr: '赣', capital: '南昌', population: 4520, gdp: 32200, area: 16.7, region: '华东', row: 4, col: 6,
    cities: [{ name: '南昌', population: 625, gdp: 7000, isCapital: true }, { name: '赣州', population: 920, gdp: 4500, isCapital: false }] },
  { id: 'sd', name: '山东', abbr: '鲁', capital: '济南', population: 10153, gdp: 92069, area: 15.7, region: '华东', row: 2, col: 6,
    cities: [{ name: '济南', population: 923, gdp: 10300, isCapital: true }, { name: '青岛', population: 1025, gdp: 15000, isCapital: false }] },
  { id: 'ha', name: '河南', abbr: '豫', capital: '郑州', population: 9872, gdp: 61345, area: 16.7, region: '华中', row: 3, col: 4,
    cities: [{ name: '郑州', population: 1274, gdp: 12690, isCapital: true }, { name: '洛阳', population: 717, gdp: 5500, isCapital: false }] },
  { id: 'hbei', name: '湖北', abbr: '鄂', capital: '武汉', population: 5775, gdp: 55803, area: 18.6, region: '华中', row: 4, col: 5,
    cities: [{ name: '武汉', population: 1365, gdp: 20011, isCapital: true }, { name: '宜昌', population: 421, gdp: 5000, isCapital: false }] },
  { id: 'hn', name: '湖南', abbr: '湘', capital: '长沙', population: 6604, gdp: 48670, area: 21.2, region: '华中', row: 5, col: 5,
    cities: [{ name: '长沙', population: 1024, gdp: 12000, isCapital: true }, { name: '衡阳', population: 700, gdp: 3400, isCapital: false }] },
  { id: 'gd', name: '广东', abbr: '粤', capital: '广州', population: 12601, gdp: 135673, area: 18.0, region: '华南', row: 6, col: 5,
    cities: [{ name: '广州', population: 1874, gdp: 30000, isCapital: true }, { name: '深圳', population: 1776, gdp: 32388, isCapital: false }] },
  { id: 'gx', name: '广西', abbr: '桂', capital: '南宁', population: 5013, gdp: 27202, area: 23.7, region: '华南', row: 6, col: 4,
    cities: [{ name: '南宁', population: 883, gdp: 5400, isCapital: true }, { name: '桂林', population: 512, gdp: 2600, isCapital: false }] },
  { id: 'hi', name: '海南', abbr: '琼', capital: '海口', population: 1027, gdp: 7200, area: 3.5, region: '华南', row: 7, col: 5,
    cities: [{ name: '海口', population: 287, gdp: 2100, isCapital: true }, { name: '三亚', population: 98, gdp: 900, isCapital: false }] },
  { id: 'cq', name: '重庆', abbr: '渝', capital: '重庆', population: 3213, gdp: 30145, area: 8.2, region: '西南', row: 4, col: 3,
    cities: [{ name: '重庆（直辖）', population: 3213, gdp: 30145, isCapital: true }] },
  { id: 'sc', name: '四川', abbr: '川', capital: '成都', population: 8374, gdp: 62011, area: 48.6, region: '西南', row: 4, col: 2,
    cities: [{ name: '成都', population: 2094, gdp: 22000, isCapital: true }, { name: '绵阳', population: 490, gdp: 3600, isCapital: false }] },
  { id: 'gz', name: '贵州', abbr: '黔', capital: '贵阳', population: 3856, gdp: 20165, area: 17.6, region: '西南', row: 5, col: 3,
    cities: [{ name: '贵阳', population: 598, gdp: 4500, isCapital: true }, { name: '遵义', population: 750, gdp: 4200, isCapital: false }] },
  { id: 'yn', name: '云南', abbr: '滇', capital: '昆明', population: 4720, gdp: 30021, area: 38.4, region: '西南', row: 5, col: 2,
    cities: [{ name: '昆明', population: 846, gdp: 7300, isCapital: true }, { name: '大理', population: 364, gdp: 1700, isCapital: false }] },
  { id: 'xz', name: '西藏', abbr: '藏', capital: '拉萨', population: 365, gdp: 2132, area: 122.8, region: '西南', row: 5, col: 1,
    cities: [{ name: '拉萨', population: 97, gdp: 750, isCapital: true }] },
  { id: 'snx', name: '陕西', abbr: '陕', capital: '西安', population: 3954, gdp: 33786, area: 20.6, region: '西北', row: 3, col: 3,
    cities: [{ name: '西安', population: 1296, gdp: 11486, isCapital: true }, { name: '宝鸡', population: 380, gdp: 2500, isCapital: false }] },
  { id: 'gs', name: '甘肃', abbr: '甘', capital: '兰州', population: 2490, gdp: 11201, area: 42.6, region: '西北', row: 2, col: 2,
    cities: [{ name: '兰州', population: 432, gdp: 3000, isCapital: true }] },
  { id: 'qh', name: '青海', abbr: '青', capital: '西宁', population: 594, gdp: 3799, area: 72.2, region: '西北', row: 3, col: 1,
    cities: [{ name: '西宁', population: 248, gdp: 1600, isCapital: true }] },
  { id: 'nx', name: '宁夏', abbr: '宁', capital: '银川', population: 720, gdp: 5101, area: 6.6, region: '西北', row: 2, col: 3,
    cities: [{ name: '银川', population: 286, gdp: 2200, isCapital: true }] },
  { id: 'xj', name: '新疆', abbr: '新', capital: '乌鲁木齐', population: 2585, gdp: 17168, area: 166.0, region: '西北', row: 1, col: 0,
    cities: [{ name: '乌鲁木齐', population: 412, gdp: 3900, isCapital: true }] },
  { id: 'hk', name: '香港', abbr: '港', capital: '香港', population: 750, gdp: 34500, area: 0.11, region: '特别行政区', row: 6, col: 6,
    cities: [{ name: '香港（特别行政区）', population: 750, gdp: 34500, isCapital: true }] },
  { id: 'mo', name: '澳门', abbr: '澳', capital: '澳门', population: 68, gdp: 2300, area: 0.003, region: '特别行政区', row: 7, col: 6,
    cities: [{ name: '澳门（特别行政区）', population: 68, gdp: 2300, isCapital: true }] },
  { id: 'tw', name: '台湾', abbr: '台', capital: '台北', population: 2340, gdp: 65000, area: 3.6, region: '特别行政区', row: 5, col: 8,
    cities: [{ name: '台北', population: 265, gdp: 16000, isCapital: true }, { name: '台中', population: 282, gdp: 12000, isCapital: false }] },
];

const GRID_COLS = 9;
const GRID_ROWS = 8;

function buildGrid(): (ProvinceData | null)[][] {
  const grid: (ProvinceData | null)[][] = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null));
  for (const p of PROVINCES) {
    if (p.row < GRID_ROWS && p.col < GRID_COLS) grid[p.row][p.col] = p;
  }
  return grid;
}

function fmtPop(n: number): string { return n >= 10000 ? `${(n / 10000).toFixed(1)}亿` : `${n}万`; }
function fmtGdp(n: number): string { return n >= 10000 ? `${(n / 10000).toFixed(1)}万亿` : `${n}亿`; }

const RANK_LABELS: Record<number, string> = {
  1: '科员', 2: '副股级', 3: '正股级', 4: '副科级', 5: '正科级', 6: '副科级',
  7: '正科级', 8: '副处级', 9: '正处级', 10: '副厅级', 11: '正厅级',
  12: '副部级', 13: '正部级', 14: '副国级', 15: '正国级',
};

// ── 主页面 ────────────────────────────────────────────────────
export default function ProvincesMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [selected, setSelected] = useState<ProvinceData | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'career' | 'rank'>('map');
  const [filterRegion, setFilterRegion] = useState<string>('全部');

  const grid = buildGrid();
  const regions = ['全部', ...Array.from(new Set(PROVINCES.map(p => p.region)))];
  const totalPop = PROVINCES.reduce((s, p) => s + p.population, 0);
  const totalGdp = PROVINCES.reduce((s, p) => s + p.gdp, 0);
  const CELL_SIZE = 36;

  // 玩家历任职务轨迹
  const careerHistory = save?.playerCareerHistory ?? [];
  // 当前职务作为最新条目（如无历史记录）
  const currentEntry = save ? {
    rankLevel: save.rankLevel,
    position: save.rankName,
    province: save.cityName.split('省')[0] + (save.cityName.includes('省') ? '省' : ''),
    city: save.cityName,
    startDay: save.gameDays,
    endDay: null as number | null,
  } : null;
  const allCareer = currentEntry
    ? [...careerHistory.filter(c => c.endDay !== null), currentEntry]
    : careerHistory;

  // 获取任职过的省份集合（用 province 字段匹配），标记在地图上
  // 同时用城市GDP评估"相当于全国哪个省份级别"
  const playerGdp = save?.cityGdp ?? 0;
  const gdpRanked = [...PROVINCES].sort((a, b) => b.gdp - a.gdp);

  return (
    <View style={{ flex: 1, backgroundColor: '#0F1923', paddingTop: insets.top }}>
      <StatusBar style="light" />

      {/* 头部 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3044' }}>
        <Pressable onPress={() => router.back()} style={{ paddingRight: 12, paddingVertical: 4 }}>
          <Text style={{ color: '#5B9BD5', fontSize: 15 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#E8D5A3', fontSize: 15, fontWeight: '800', letterSpacing: 1 }}>🗺️ 全国省份地图</Text>
          <Text style={{ color: '#5B7A9B', fontSize: 10 }}>总人口 {fmtPop(totalPop)} · 总GDP {fmtGdp(totalGdp)}</Text>
        </View>
      </View>

      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#0F1923', borderBottomWidth: 1, borderBottomColor: '#1E3044' }}>
        {([['map', '🗺️ 省份地图'], ['career', '📋 从政轨迹'], ['rank', '📊 政绩排名']] as [typeof activeTab, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setActiveTab(key)} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === key ? '#E8D5A3' : 'transparent' }}>
            <Text style={{ color: activeTab === key ? '#E8D5A3' : '#4A6080', fontSize: 12, fontWeight: activeTab === key ? '800' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Tab: 省份地图 */}
      {activeTab === 'map' && (
        <ScrollView contentContainerStyle={{ padding: 12 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {regions.map(r => {
                const active = filterRegion === r;
                const cfg = r === '全部' ? { bg: '#1E3044', border: '#2563EB', text: '#93C5FD' } : REGION_COLOR[r];
                return (
                  <Pressable key={r} onPress={() => setFilterRegion(r)}
                    style={{ backgroundColor: active ? cfg.bg : '#1A2535', borderWidth: 1, borderColor: active ? cfg.border : '#2A3A50', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: active ? cfg.text : '#5B7A9B', fontSize: 11, fontWeight: active ? '700' : '400' }}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ gap: 2 }}>
              {grid.map((row, ri) => (
                <View key={ri} style={{ flexDirection: 'row', gap: 2 }}>
                  {row.map((prov, ci) => {
                    if (!prov) return <View key={ci} style={{ width: CELL_SIZE, height: CELL_SIZE }} />;
                    const cfg = REGION_COLOR[prov.region];
                    const dimmed = filterRegion !== '全部' && prov.region !== filterRegion;
                    return (
                      <Pressable key={ci} onPress={() => setSelected(prov)}
                        style={{ width: CELL_SIZE, height: CELL_SIZE, backgroundColor: dimmed ? '#1A2535' : cfg.bg, borderWidth: 1, borderColor: dimmed ? '#1E3044' : cfg.border, borderRadius: 3, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: dimmed ? '#2A3A50' : cfg.text, fontSize: 10, fontWeight: '700' }}>{prov.abbr}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {Object.entries(REGION_COLOR).map(([region, cfg]) => (
              <View key={region} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={{ width: 8, height: 8, backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border, borderRadius: 1 }} />
                <Text style={{ color: '#5B7A9B', fontSize: 9 }}>{region}</Text>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 16, gap: 6 }}>
            <Text style={{ color: '#E8D5A3', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
              {filterRegion === '全部' ? '全部省级行政区' : `${filterRegion}（${PROVINCES.filter(p => p.region === filterRegion).length}个）`}
            </Text>
            {PROVINCES.filter(p => filterRegion === '全部' || p.region === filterRegion)
              .sort((a, b) => b.gdp - a.gdp)
              .map((p, idx) => {
                const cfg = REGION_COLOR[p.region];
                const rank = [...PROVINCES].sort((a, b) => b.gdp - a.gdp).findIndex(x => x.id === p.id) + 1;
                return (
                  <Pressable key={p.id} onPress={() => setSelected(p)}
                    style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#1E3044', borderRadius: 6, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ color: idx < 3 ? '#FFD700' : '#4A6080', fontSize: 12, fontWeight: '700', width: 22, textAlign: 'center' }}>#{rank}</Text>
                    <View style={{ width: 28, height: 28, backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: cfg.text, fontSize: 11, fontWeight: '800' }}>{p.abbr}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ color: '#E8D5A3', fontSize: 13, fontWeight: '700' }}>{p.name}</Text>
                        <Text style={{ color: cfg.text, fontSize: 9, backgroundColor: cfg.bg, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 }}>{p.region}</Text>
                      </View>
                      <Text style={{ color: '#5B7A9B', fontSize: 10, marginTop: 2 }}>省会：{p.capital} · {p.area}万km²</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={{ color: '#86EFAC', fontSize: 11, fontWeight: '700' }}>{fmtGdp(p.gdp)}</Text>
                      <Text style={{ color: '#93C5FD', fontSize: 10 }}>{fmtPop(p.population)}</Text>
                    </View>
                  </Pressable>
                );
              })}
          </View>
        </ScrollView>
      )}

      {/* Tab: 从政轨迹 */}
      {activeTab === 'career' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} showsVerticalScrollIndicator={false}>
          {/* 玩家档案摘要 */}
          {save && (
            <View style={{ backgroundColor: '#1A2535', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A3A50' }}>
              <Text style={{ color: '#E8D5A3', fontSize: 14, fontWeight: '800', marginBottom: 8 }}>📁 个人档案</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { label: '姓名', val: save.playerName },
                  { label: '当前职级', val: `${RANK_LABELS[save.rankLevel] ?? `${save.rankLevel}级`}（${save.rankName}）` },
                  { label: '从政路线', val: save.careerPathLine },
                  { label: '任职地', val: save.cityName },
                  { label: '累计政绩', val: `${save.meritPoints}分` },
                  { label: '在任天数', val: `第${save.gameDays}天` },
                ].map(d => (
                  <View key={d.label} style={{ backgroundColor: '#0F1923', borderRadius: 8, padding: 8, minWidth: '45%', flex: 1 }}>
                    <Text style={{ color: '#5B7A9B', fontSize: 9 }}>{d.label}</Text>
                    <Text style={{ color: '#E8D5A3', fontSize: 11, fontWeight: '700', marginTop: 2 }}>{d.val}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 时间线 */}
          <Text style={{ color: '#E8D5A3', fontSize: 13, fontWeight: '800' }}>📌 历任职务轨迹</Text>
          {allCareer.length === 0 ? (
            <View style={{ backgroundColor: '#1A2535', borderRadius: 10, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#4A6080', fontSize: 13 }}>暂无历任职务记录</Text>
              <Text style={{ color: '#374B60', fontSize: 11, marginTop: 4 }}>每次晋升后将自动记录任职轨迹</Text>
            </View>
          ) : (
            <View style={{ gap: 0 }}>
              {[...allCareer].reverse().map((entry, idx) => {
                const isLatest = idx === 0 && entry.endDay === null;
                const rankLabel = RANK_LABELS[entry.rankLevel] ?? `${entry.rankLevel}级`;
                const years = entry.endDay !== null
                  ? `第${entry.startDay}天 → 第${entry.endDay}天`
                  : `第${entry.startDay}天起（现任）`;
                return (
                  <View key={idx} style={{ flexDirection: 'row', gap: 10 }}>
                    {/* 时间线轴 */}
                    <View style={{ alignItems: 'center', width: 20 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: isLatest ? '#FFD700' : '#2A3A50', borderWidth: 2, borderColor: isLatest ? '#FFD700' : '#4A6080', marginTop: 14 }} />
                      {idx < allCareer.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#1E3044', marginVertical: 2 }} />}
                    </View>
                    {/* 内容卡片 */}
                    <View style={{ flex: 1, backgroundColor: isLatest ? '#1E2D1A' : '#1A2535', borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: isLatest ? '#3D7A3D' : '#1E3044' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        {isLatest && <View style={{ backgroundColor: '#3D7A3D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                          <Text style={{ color: '#86EFAC', fontSize: 9, fontWeight: '700' }}>现任</Text>
                        </View>}
                        <Text style={{ color: '#E8D5A3', fontSize: 13, fontWeight: '800' }}>{rankLabel}</Text>
                        <Text style={{ color: '#5B7A9B', fontSize: 11 }}>· {entry.position}</Text>
                      </View>
                      <Text style={{ color: '#93C5FD', fontSize: 11, marginBottom: 3 }}>📍 {entry.city}</Text>
                      {entry.province && entry.province !== entry.city && (
                        <Text style={{ color: '#4A6080', fontSize: 10 }}>所属省份：{entry.province}</Text>
                      )}
                      <Text style={{ color: '#374B60', fontSize: 10, marginTop: 4 }}>{years}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* 晋升提示 */}
          <View style={{ backgroundColor: '#1A2535', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#2A3A50' }}>
            <Text style={{ color: '#5B7A9B', fontSize: 11 }}>💡 每次晋升时，系统将自动在此记录任职轨迹，包含职务、任职地点和任期天数。</Text>
          </View>
        </ScrollView>
      )}

      {/* Tab: 政绩排名 */}
      {activeTab === 'rank' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>
          {/* 玩家城市GDP对标 */}
          {save && (
            <View style={{ backgroundColor: '#1A2535', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2A3A50', marginBottom: 4 }}>
              <Text style={{ color: '#E8D5A3', fontSize: 13, fontWeight: '800', marginBottom: 8 }}>🏙️ 我的城市政绩对标</Text>
              <Text style={{ color: '#93C5FD', fontSize: 12, marginBottom: 4 }}>
                当前城市GDP：<Text style={{ fontWeight: '800', color: '#86EFAC' }}>{fmtGdp(playerGdp)}</Text>
              </Text>
              {(() => {
                // 找到比玩家城市GDP大的最小省份，以及比玩家城市GDP小的最大省份
                const above = gdpRanked.filter(p => p.gdp > playerGdp);
                const below = gdpRanked.filter(p => p.gdp <= playerGdp);
                const nearAbove = above[above.length - 1];
                const nearBelow = below[0];
                const pctOfTop = Math.round((playerGdp / (gdpRanked[0]?.gdp ?? 1)) * 100);
                return (
                  <View style={{ gap: 6 }}>
                    <View style={{ backgroundColor: '#0F1923', borderRadius: 8, padding: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ color: '#5B7A9B', fontSize: 11 }}>占全国GDP最高省份比例</Text>
                        <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '800' }}>{pctOfTop}%</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: '#1E3044', borderRadius: 3, overflow: 'hidden' }}>
                        <View style={{ width: `${pctOfTop}%`, height: '100%', backgroundColor: '#D4AF37', borderRadius: 3 }} />
                      </View>
                    </View>
                    {nearAbove && (
                      <Text style={{ color: '#5B7A9B', fontSize: 11 }}>
                        接近省份：<Text style={{ color: '#FDE68A', fontWeight: '700' }}>{nearAbove.name}</Text>（{fmtGdp(nearAbove.gdp)}，排名 #{gdpRanked.findIndex(p => p.id === nearAbove.id) + 1}）
                      </Text>
                    )}
                    {nearBelow && (
                      <Text style={{ color: '#5B7A9B', fontSize: 11 }}>
                        超越省份：<Text style={{ color: '#86EFAC', fontWeight: '700' }}>{nearBelow.name}</Text>（{fmtGdp(nearBelow.gdp)}，排名 #{gdpRanked.findIndex(p => p.id === nearBelow.id) + 1}）
                      </Text>
                    )}
                  </View>
                );
              })()}
            </View>
          )}

          {/* 全国GDP排行榜 */}
          <Text style={{ color: '#E8D5A3', fontSize: 13, fontWeight: '800' }}>🏆 全国省份GDP排行榜</Text>
          {gdpRanked.map((p, idx) => {
            const cfg = REGION_COLOR[p.region];
            const isNear = save && Math.abs(p.gdp - playerGdp) < playerGdp * 0.15;
            const barPct = Math.round((p.gdp / (gdpRanked[0]?.gdp ?? 1)) * 100);
            return (
              <Pressable key={p.id} onPress={() => setSelected(p)}
                style={{ backgroundColor: isNear ? '#1E2D1A' : '#1A2535', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: isNear ? '#3D7A3D' : '#1E3044', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ color: idx < 3 ? '#FFD700' : idx < 10 ? '#93C5FD' : '#4A6080', fontSize: 13, fontWeight: '800', width: 24, textAlign: 'center' }}>{idx + 1}</Text>
                <View style={{ width: 28, height: 28, backgroundColor: cfg.bg, borderWidth: 1, borderColor: cfg.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: cfg.text, fontSize: 10, fontWeight: '800' }}>{p.abbr}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    <Text style={{ color: '#E8D5A3', fontSize: 12, fontWeight: '700' }}>{p.name}</Text>
                    {isNear && <Text style={{ color: '#86EFAC', fontSize: 9 }}>◀ 接近</Text>}
                  </View>
                  <View style={{ height: 4, backgroundColor: '#0F1923', borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{ width: `${barPct}%`, height: '100%', backgroundColor: cfg.border, borderRadius: 2 }} />
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#86EFAC', fontSize: 12, fontWeight: '700' }}>{fmtGdp(p.gdp)}</Text>
                  <Text style={{ color: '#4A6080', fontSize: 9 }}>{fmtPop(p.population)}</Text>
                </View>
              </Pressable>
            );
          })}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* 省份详情 Modal */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          {selected && (() => {
            const cfg = REGION_COLOR[selected.region];
            const gdpRankIdx = gdpRanked.findIndex(p => p.id === selected.id) + 1;
            const popRank = [...PROVINCES].sort((a, b) => b.population - a.population).findIndex(p => p.id === selected.id) + 1;
            return (
              <View style={{ backgroundColor: '#0F1923', borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: insets.bottom + 20, maxHeight: '85%' }}>
                <View style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
                  <View style={{ width: 36, height: 4, backgroundColor: '#2A3A50', borderRadius: 2 }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#1E3044' }}>
                  <View style={{ width: 40, height: 40, backgroundColor: cfg.bg, borderWidth: 2, borderColor: cfg.border, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginRight: 10 }}>
                    <Text style={{ color: cfg.text, fontSize: 16, fontWeight: '800' }}>{selected.abbr}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#E8D5A3', fontSize: 18, fontWeight: '800' }}>{selected.name}</Text>
                    <Text style={{ color: '#5B7A9B', fontSize: 11 }}>{selected.region} · 省会：{selected.capital}</Text>
                  </View>
                  <Pressable onPress={() => setSelected(null)} style={{ padding: 8 }}>
                    <Text style={{ color: '#5B9BD5', fontSize: 16 }}>✕</Text>
                  </Pressable>
                </View>
                <ScrollView style={{ paddingHorizontal: 16, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'GDP总量', value: fmtGdp(selected.gdp), sub: `全国第${gdpRankIdx}`, color: '#86EFAC' },
                      { label: '常住人口', value: fmtPop(selected.population), sub: `全国第${popRank}`, color: '#93C5FD' },
                      { label: '土地面积', value: `${selected.area}万km²`, sub: '', color: '#FDE68A' },
                    ].map(d => (
                      <View key={d.label} style={{ flex: 1, backgroundColor: '#1A2535', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                        <Text style={{ color: '#5B7A9B', fontSize: 9, marginBottom: 4 }}>{d.label}</Text>
                        <Text style={{ color: d.color, fontSize: 15, fontWeight: '800' }}>{d.value}</Text>
                        {!!d.sub && <Text style={{ color: '#3B5268', fontSize: 9, marginTop: 2 }}>{d.sub}</Text>}
                      </View>
                    ))}
                  </View>
                  <View style={{ backgroundColor: '#1A2535', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ color: '#5B7A9B', fontSize: 11 }}>人均GDP</Text>
                      <Text style={{ color: '#86EFAC', fontSize: 13, fontWeight: '700' }}>
                        {Math.round((selected.gdp * 100000000) / (selected.population * 10000) / 1000)}千元
                      </Text>
                    </View>
                    {(() => {
                      const maxGdpPerCapita = Math.max(...PROVINCES.map(p => p.gdp / p.population));
                      const myPct = (selected.gdp / selected.population) / maxGdpPerCapita;
                      return (
                        <View style={{ height: 6, backgroundColor: '#0F1923', borderRadius: 3, overflow: 'hidden' }}>
                          <View style={{ width: `${Math.round(myPct * 100)}%`, height: '100%', backgroundColor: cfg.border, borderRadius: 3 }} />
                        </View>
                      );
                    })()}
                  </View>
                  <Text style={{ color: '#E8D5A3', fontSize: 12, fontWeight: '700', marginBottom: 8 }}>主要城市</Text>
                  <View style={{ gap: 6, marginBottom: 16 }}>
                    {selected.cities.map(city => (
                      <View key={city.name} style={{ backgroundColor: '#1A2535', borderRadius: 6, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ color: '#E8D5A3', fontSize: 12, fontWeight: '600' }}>{city.name}</Text>
                            {city.isCapital && (
                              <View style={{ backgroundColor: cfg.bg, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ color: cfg.text, fontSize: 9 }}>省会</Text>
                              </View>
                            )}
                          </View>
                          <Text style={{ color: '#5B7A9B', fontSize: 10, marginTop: 2 }}>人口 {fmtPop(city.population)}</Text>
                        </View>
                        <Text style={{ color: '#86EFAC', fontSize: 12, fontWeight: '700' }}>GDP {fmtGdp(city.gdp)}</Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

