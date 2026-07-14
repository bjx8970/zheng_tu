// 官职体系查阅页 — 县级 / 市级 / 省级 / 副省级城市 / 国家级
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView,
} from 'react-native';
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  NATIONAL_ORGAN_ORDER,
  NATIONAL_TIER_COLOR,
  NATIONAL_TIER_LABEL,
  getNationalByOrgan,
  type CountyPosition,
  type CityPosition,
  type ProvincePosition,
  type SubProvincePosition,
  type NationalPosition,
  type NationalOrgan,
} from '@/types/game';

// ── 类型联合 ──────────────────────────────────────────────────
type AnyPosition =
  | (CountyPosition & { _level: 'county' })
  | (CityPosition & { _level: 'city' })
  | (ProvincePosition & { _level: 'province' })
  | (SubProvincePosition & { _level: 'sub' });

// ── Tab 配置 ──────────────────────────────────────────────────
type TabKey = 'county' | 'city' | 'province' | 'sub' | 'national' | 'guide';
const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  { key: 'county',   label: '县级',   subtitle: '正处／副处／正科' },
  { key: 'city',     label: '市级',   subtitle: '正厅／副厅／正处' },
  { key: 'province', label: '省级',   subtitle: '正部／副部／正厅' },
  { key: 'sub',      label: '副省级', subtitle: '副部／正厅／副厅' },
  { key: 'national', label: '国家级', subtitle: '常委/政务院/内阁' },
  { key: 'guide',    label: '晋升指南', subtitle: '路线·条件·通道' },
];

// ── 级别色系 ─────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  // 县级
  '正处级': '#C82829',
  '副处级': '#A04020',
  '正科级': '#2B4B6F',
  '副科级': '#5A7A9F',
  // 市级
  '正厅级': '#7B0E0E',
  '副厅级': '#C82829',
  // 省级
  '正部级': '#4A0000',
  '副部级': '#7B0E0E',
  // 副省级城市
  '副部级_spc': '#7B0E0E',
};

function getTierColor(tier: string): string {
  return TIER_COLOR[tier] ?? '#2B4B6F';
}

// ── 器官(所属机关)背景色 ──────────────────────────────────────
const ORGAN_BG: Record<string, string> = {
  // 县级
  县委: '#F0EAE0', 县政府: '#EAF0F8', 县人大: '#F8F0EA', 县政协: '#EAF8F0',
  县纪委: '#F8EAEA', 政法: '#F5F0E8', 职能局: '#EDF5F8', 乡镇: '#F0F8ED',
  团委: '#FFF5E6', 人武部: '#EEF0E8',
  // 市级
  市委: '#F0EAE0', 市政府: '#EAF0F8', 市人大: '#F8F0EA', 市政协: '#EAF8F0',
  市纪委: '#F8EAEA', 市直属局: '#EDF5F8', '区（县）': '#F0F8ED',
  军分区: '#E8EDE8', 市武警: '#ECEDE8',
  // 省级
  省委: '#F0EAE0', 省政府: '#EAF0F8', 省人大: '#F8F0EA', 省政协: '#EAF8F0',
  省纪委: '#F8EAEA', 省直属厅: '#EDF5F8', 地市: '#F0F8ED',
  省军区: '#E8EDE8', 武警: '#ECEDE8',
  // 副省级城市
  区委: '#F0EAE0', 区政府: '#EAF0F8', 街道: '#F5F5E8', 市直属局副省: '#EDF5F8',
};

// ── 行项组件 ─────────────────────────────────────────────────
interface PositionRowProps {
  title: string;
  tier: string;
  organ: string;
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}
function PositionRow({ title, tier, organ, desc, isHighProfile, highProfileNote }: PositionRowProps) {
  const [open, setOpen] = useState(false);
  const tierColor = getTierColor(tier);
  const organBg = ORGAN_BG[organ] ?? '#F5F4F1';

  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{ borderBottomWidth: 1, borderBottomColor: '#E8E5DC' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, gap: 8 }}>
        {/* 级别色标 */}
        <View style={{ width: 4, height: 36, backgroundColor: tierColor }} />
        {/* 主内容 */}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', letterSpacing: 0.3 }}>{title}</Text>
            {isHighProfile && (
              <View style={{ backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#F0C050', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700' }}>⭐高配</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ backgroundColor: tierColor, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{tier}</Text>
            </View>
            <View style={{ backgroundColor: organBg, borderWidth: 1, borderColor: tierColor + '44', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: tierColor }}>{organ}</Text>
            </View>
          </View>
        </View>
        {/* 展开箭头 */}
        <Text style={{ color: '#999', fontSize: 14 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 展开内容 */}
      {open && (
        <View style={{ backgroundColor: '#FAFAF7', borderTopWidth: 1, borderTopColor: '#E8E5DC', paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
          <Text style={{ fontSize: 12, color: '#444', lineHeight: 18 }}>{desc}</Text>
          {isHighProfile && highProfileNote && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4, backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 7 }}>
              <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700', marginTop: 1 }}>高配说明：</Text>
              <Text style={{ fontSize: 11, color: '#7A5C00', flex: 1, lineHeight: 16 }}>{highProfileNote}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 分区标题 ─────────────────────────────────────────────────
function SectionHeader({ tier, color }: { tier: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '18', borderLeftWidth: 4, borderLeftColor: color, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 1.5 }}>— {tier} —</Text>
    </View>
  );
}

// ── 国家级：机构标题 ──────────────────────────────────────────
const NATIONAL_ORGAN_STYLE: Record<NationalOrgan, { bg: string; accent: string; icon: string }> = {
  '联邦政务常委会':       { bg: '#1C0808', accent: '#E05050', icon: '★' },
  '联邦政务院':             { bg: '#1A0A18', accent: '#C060A0', icon: '🏛️' },
  '党务总枢府秘书处':             { bg: '#150D20', accent: '#9070D0', icon: '📋' },
  '肃宪督察院':     { bg: '#12101C', accent: '#7080C0', icon: '⚖️' },
  '联邦国会常委会': { bg: '#0D1610', accent: '#508060', icon: '📜' },
  '中国人民政治协商会议':   { bg: '#101610', accent: '#608050', icon: '🤝' },
  '枢武府':         { bg: '#0D1018', accent: '#506080', icon: '🎖️' },
  '联邦内阁':                 { bg: '#0D1520', accent: '#4A8AAA', icon: '🏢' },
  '国情传导署':             { bg: '#1A1008', accent: '#D08030', icon: '📢' },
  '联邦统筹部':             { bg: '#0E1818', accent: '#40A080', icon: '🤝' },
  '联邦政法委':             { bg: '#140C10', accent: '#A04060', icon: '🚔' },
  '社会治理部':         { bg: '#0E1014', accent: '#4880A0', icon: '🏘️' },
  '联邦行政学院':               { bg: '#141008', accent: '#A08030', icon: '🏫' },
  '中央网信委办公室':       { bg: '#0C1418', accent: '#3090B0', icon: '🌐' },
  '共青团中央':             { bg: '#12100A', accent: '#B0802A', icon: '◆' },
};

function NationalOrganHeader({ organ }: { organ: NationalOrgan }) {
  const s = NATIONAL_ORGAN_STYLE[organ];
  return (
    <View style={{ backgroundColor: s.bg, borderLeftWidth: 4, borderLeftColor: s.accent, paddingHorizontal: 14, paddingVertical: 10, marginTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>{s.icon}</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: s.accent, letterSpacing: 1.5 }}>{organ}</Text>
      </View>
    </View>
  );
}

// ── 国家级：职位行 ────────────────────────────────────────────
function NationalPositionRow({ pos }: { pos: NationalPosition }) {
  const [open, setOpen] = useState(false);
  const tierColor = NATIONAL_TIER_COLOR[pos.tier];
  const tierLabel = NATIONAL_TIER_LABEL[pos.tier];
  const organStyle = NATIONAL_ORGAN_STYLE[pos.organ];

  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{ borderBottomWidth: 1, borderBottomColor: organStyle.bg + 'CC' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 8, backgroundColor: '#141414' }}>
        {/* 层级色标 */}
        <View style={{ width: 4, height: 38, backgroundColor: tierColor }} />
        {/* 主内容 */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#F0E8D8', letterSpacing: 0.3 }}>{pos.title}</Text>
            {pos.isPSC && (
              <View style={{ backgroundColor: '#8B0000', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#FFD0A0', fontWeight: '700' }}>★ 常委</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <View style={{ backgroundColor: tierColor + 'CC', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{tierLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={{ color: '#556', fontSize: 13 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 展开内容 */}
      {open && (
        <View style={{ backgroundColor: '#1A1A1A', borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#C8C0B0', lineHeight: 18 }}>{pos.desc}</Text>
          {pos.concurrentNote && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, backgroundColor: organStyle.bg, borderWidth: 1, borderColor: organStyle.accent + '55', padding: 8, marginTop: 2 }}>
              <Text style={{ fontSize: 9, color: organStyle.accent, fontWeight: '700', marginTop: 1 }}>兼任说明：</Text>
              <Text style={{ fontSize: 11, color: organStyle.accent + 'DD', flex: 1, lineHeight: 16 }}>{pos.concurrentNote}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 渲染列表 ─────────────────────────────────────────────────
function buildCounty(): AnyPosition[] {
  return COUNTY_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'county' as const }));
}
function buildCity(): AnyPosition[] {
  return CITY_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'city' as const }));
}
function buildProvince(): AnyPosition[] {
  return PROVINCE_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'province' as const }));
}
function buildSub(): AnyPosition[] {
  return SUB_PROVINCE_CITY_POSITIONS.map(p => ({ ...p, _level: 'sub' as const }));
}

// 不同级别的分区顺序
const COUNTY_TIERS   = ['正处级', '副处级', '正科级', '副科级'];
const CITY_TIERS     = ['正厅级', '副厅级', '正处级', '副处级'];
const PROVINCE_TIERS = ['正部级', '副部级', '正厅级', '副厅级'];
const SUB_TIERS      = ['副部级', '正厅级', '副厅级', '正处级'];

function getTierOrder(tab: TabKey): string[] {
  if (tab === 'county')   return COUNTY_TIERS;
  if (tab === 'city')     return CITY_TIERS;
  if (tab === 'province') return PROVINCE_TIERS;
  return SUB_TIERS;
}

function getData(tab: TabKey): AnyPosition[] {
  if (tab === 'county')   return buildCounty();
  if (tab === 'city')     return buildCity();
  if (tab === 'province') return buildProvince();
  if (tab === 'national') return [];
  if (tab === 'guide')    return [];
  return buildSub();
}

// ── 晋升指南：每个阶段的晋升路径数据 ────────────────────────────
const PROMOTION_STAGES = [
  {
    rank: 'rank 1–3', label: '科员 → 副科 → 正科', color: '#2B4B6F', icon: '🌱',
    years: '约 2–4 年/级',
    requirements: ['本科及以上学历', '年度考核合格', '无违规记录'],
    conditions: ['公务员录取（通过省考/国考）', '参加选调生项目可加速晋升', '基层工作经历在此阶段积累'],
    routes: [
      { name: '行政线', bonus: '县直机关一把手优先', icon: '🏛️' },
      { name: '党务线', bonus: '县委系统快速晋升通道', icon: '🔴' },
      { name: '团派线', bonus: '团委书记为正科起点', icon: '◆' },
    ],
    tips: '此阶段是基层工作经历的主要积累期（rank 1–6 累计满 5 年方可晋升厅级）。建议在乡镇、县直机关多岗位历练，为后续晋升打基础。',
  },
  {
    rank: 'rank 4–6', label: '副处 → 正处 → 副厅（预备）', color: '#C82829', icon: '📈',
    years: '约 3–5 年/级',
    requirements: ['大学本科及以上', '任现职满 2 年以上', '基层工作经历累计 ≥ 5 年（厅级以下）'],
    conditions: ['通过干部考察与组织考核', '需完成专项考核（得分 ≥ 60）', '派系关系与上级好感度达标', '参加党校培训或挂职锻炼'],
    routes: [
      { name: '行政线', bonus: '县长→副市长通道顺畅', icon: '🏛️' },
      { name: '政法线', bonus: '法检机关副处→正处加速', icon: '⚖️' },
      { name: '团派线', bonus: '团县委书记→市团委副书记', icon: '◆' },
    ],
    tips: '正处级是"仕途分水岭"：此后晋升竞争急剧加大，且正处→副厅需由市委常委会研究决定。建议此阶段确定主攻路线，并积累足够的政绩分和上级好感。',
  },
  {
    rank: 'rank 7–8', label: '副厅 → 正厅', color: '#7B0E0E', icon: '🏛️',
    years: '约 4–5 年/级',
    requirements: ['任现职满 3 年', '党龄 ≥ 10 年', '基层工作经历达标', '无重大违规记录'],
    conditions: ['省委组织部考察', '省委常委会研究通过', '民主推荐得票率 ≥ 50%', '参加中央党校省部级班（正厅级要求）'],
    routes: [
      { name: '行政线', bonus: '副市长→市长快车道', icon: '🏛️' },
      { name: '党务线', bonus: '市委副书记→书记晋升优势', icon: '🔴' },
      { name: '团派线', bonus: '团市委书记届满转实职副厅', icon: '◆' },
    ],
    tips: '厅级干部需进入省委视野，建议主动承担重大专项任务、在舆情应对中展现能力。正厅级（市委书记/市长）是晋升副部级的关键门槛，需提前布局省委派系关系。',
  },
  {
    rank: 'rank 9–10', label: '副部 → 正部（省部级）', color: '#4A0000', icon: '⭐',
    years: '约 5 年/级',
    requirements: ['担任过正厅级一把手', '任现职满 3 年', '年龄 ≤ 55 岁（副部提名）', '中央组织部考察认可'],
    conditions: ['中央组织部提名', '政治局成员推荐', '全国人大常委或政协常委背书（省级），是加分项', '派系在中央有一定影响力'],
    routes: [
      { name: '行政线', bonus: '副省长→省长晋升自然衔接', icon: '🏛️' },
      { name: '党务线', bonus: '省委常委→省委书记为正部核心通道', icon: '🔴' },
      { name: '团派线', bonus: '团省委书记→副省长→省长，团派最强通道', icon: '◆' },
    ],
    tips: '省部级是仕途天花板的前一道门。多数干部在此终老，晋升副国家级需极强的派系支撑与全国影响力。建议确保"三重门"：省委书记力推、中央常委背书、无重大历史污点。',
  },
  {
    rank: 'rank 11–13', label: '副国家级 → 正国家级', color: '#1A0A18', icon: '🔱',
    years: '约 5 年/级，可延退',
    requirements: ['担任过省委书记或国务院副总理等', '政治局委员背景', '年龄 ≤ 63 岁（副国）', '政治可靠，无历史问题'],
    conditions: ['政治局常委会酝酿与讨论', '党代会选举（正国家级需全国人大投票）', '派系平衡（大联合格局）', '全国范围政绩与声望'],
    routes: [
      { name: '全路线', bonus: '党务、行政、政法均可抵达，但党务线最稳', icon: '🌟' },
      { name: '特殊通道', bonus: '军委系统（枢武府）可走军事路线进入核心', icon: '🎖️' },
    ],
    tips: '此阶段晋升已超越单纯政绩，更依赖政治格局与历史时机。建议保持低调，避免成为各方打击目标，等待"时间窗口"出现。正国家级不设强制退休年龄，70岁可自主退休。',
  },
];

// 路线说明数据
const LINE_GUIDE = [
  {
    name: '行政线（政府系统）', icon: '🏛️', color: '#2B4B6F',
    path: '科员 → 副科乡镇干部 → 正科乡镇长 → 副处局长助理 → 正处县长 → 副厅副市长 → 正厅市长 → 副部副省长 → 正部省长 → 副国国务院副总理 → 正国总理/主席',
    strengths: ['行政资源调配能力强，晋升路径清晰', '县长/市长等一把手经历是上级考察重点', '政绩可量化，项目建设成绩具有说服力'],
    weaknesses: ['竞争激烈，同级一把手岗位唯一', '地方经济负债风险可能影响考核', '需同时维护党委系统关系'],
  },
  {
    name: '党务线（党委系统）', icon: '🔴', color: '#8B0000',
    path: '科员 → 副科组织干事 → 正科组织部副部长 → 副处组织部长 → 正处县委书记 → 副厅市委副书记 → 正厅市委书记 → 副部省委副书记 → 正部省委书记 → 副国/正国党内核心职务',
    strengths: ['直接掌握组织、宣传、纪检等关键权力', '派系建设能力强，可形成政治势力', '县委书记、省委书记是最关键的跳板岗位'],
    weaknesses: ['需承担重大政治责任，风险较高', '舆情失控可能导致政治前途断送', '对"平衡艺术"要求极高'],
  },
  {
    name: '政法线（公检法系统）', icon: '⚖️', color: '#5A3000',
    path: '基层检察员/法官 → 副处检察长助理 → 正处检察长/法院院长 → 副厅政法委副书记 → 正厅政法委书记 → 副部政法委常务副书记 → 正部政法委书记',
    strengths: ['掌握司法权力，可影响反腐走向', '政法线官员通常具有法学背景，晋升受教育加成', '政法委书记是地方权力核心之一'],
    weaknesses: ['晋升到副部级后通道较窄', '涉及敏感案件可能引火烧身', '与其他路线衔接性不如行政/党务线'],
  },
  {
    name: '团派线（共青团系统）', icon: '◆', color: '#7B5E00',
    path: '团委干事 → 副科团委书记 → 正科县团委书记（省委常委兼） → 副厅团市委书记→转任实职副厅 → 副部团省委书记→省委常委 → 团中央书记处书记 → 正部全国团中央第一书记',
    strengths: ['起点低但上升快，团委书记任满后多转实职', '团派系在高层有稳定传统人脉', '形象清新，舆论风险相对较低'],
    weaknesses: ['脱离团系统后需要重新积累地方资源', '被标签为"团派"可能在某些政治时期受压制', '晋升至副部后通道显著收窄'],
  },
];

// 晋升指南渲染组件
function GuideScreen() {
  const [openStage, setOpenStage] = useState<number | null>(null);
  const [openLine, setOpenLine] = useState<number | null>(null);

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: 40 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: '#F5F4F1' }}
    >
      {/* 总览说明 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 16, paddingVertical: 14 }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 1 }}>📋 晋升体系总览</Text>
        <Text style={{ color: '#a0b4cc', fontSize: 11, lineHeight: 17, marginTop: 6 }}>
          本游戏官员晋升共分 15 个 rank 级别，对应现实中的科员→副科→正科→副处→正处→副厅→正厅→副部→正部→副国→正国五大层级。
          晋升需同时满足：任职年限、政绩积累、上级好感、派系支持、专项考核等多维度条件。
          {'\n'}⚠️ 从 rank 4 起，须在厅级以下（rank 1–6）累计任职满 <Text style={{ fontWeight: '700', color: '#FFD080' }}>5 年</Text>，方可晋升。
        </Text>
      </View>

      {/* 晋升阶段卡 */}
      <View style={{ paddingHorizontal: 12, paddingTop: 14, gap: 8 }}>
        <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2, paddingLeft: 2 }}>— 晋升阶段详解 —</Text>
        {PROMOTION_STAGES.map((stage, i) => (
          <Pressable key={stage.rank} onPress={() => setOpenStage(openStage === i ? null : i)}
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8CC', overflow: 'hidden' }}>
            {/* 卡头 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: stage.color + '12', borderLeftWidth: 4, borderLeftColor: stage.color }}>
              <Text style={{ fontSize: 22 }}>{stage.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: stage.color, letterSpacing: 0.5 }}>{stage.label}</Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{stage.rank} · 平均任期 {stage.years}</Text>
              </View>
              <Text style={{ color: '#999', fontSize: 14 }}>{openStage === i ? '▲' : '▼'}</Text>
            </View>
            {/* 展开详情 */}
            {openStage === i && (
              <View style={{ padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#E0D8CC' }}>
                {/* 基本条件 */}
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1 }}>📋 基本要求</Text>
                  {stage.requirements.map(r => (
                    <View key={r} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 10, color: stage.color, marginTop: 1 }}>•</Text>
                      <Text style={{ fontSize: 11, color: '#444', flex: 1, lineHeight: 16 }}>{r}</Text>
                    </View>
                  ))}
                </View>
                {/* 晋升条件 */}
                <View style={{ gap: 4, backgroundColor: '#F8F6F0', padding: 10, borderWidth: 1, borderColor: '#E0D8CC' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1 }}>⚙️ 晋升条件（游戏内）</Text>
                  {stage.conditions.map(c => (
                    <View key={c} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 10, color: '#C82829', marginTop: 1 }}>▸</Text>
                      <Text style={{ fontSize: 11, color: '#555', flex: 1, lineHeight: 16 }}>{c}</Text>
                    </View>
                  ))}
                </View>
                {/* 路线加成 */}
                <View style={{ gap: 5 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#555', letterSpacing: 1 }}>🗺️ 路线加成</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {stage.routes.map(r => (
                      <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F0EAE0', borderWidth: 1, borderColor: '#D0C8B8', paddingHorizontal: 8, paddingVertical: 5, flex: 1 }}>
                        <Text style={{ fontSize: 14 }}>{r.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#7B4E2A' }}>{r.name}</Text>
                          <Text style={{ fontSize: 9, color: '#888', lineHeight: 13 }}>{r.bonus}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
                {/* 攻略提示 */}
                <View style={{ backgroundColor: '#FFFBEA', borderWidth: 1, borderColor: '#F0C050', padding: 10 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#7A5C00' }}>💡 攻略提示</Text>
                  <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 17, marginTop: 4 }}>{stage.tips}</Text>
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* 路线深度攻略 */}
      <View style={{ paddingHorizontal: 12, paddingTop: 18, gap: 8 }}>
        <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2, paddingLeft: 2 }}>— 仕途路线深度指南 —</Text>
        {LINE_GUIDE.map((line, i) => (
          <Pressable key={line.name} onPress={() => setOpenLine(openLine === i ? null : i)}
            style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8CC', overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10, backgroundColor: line.color + '12', borderLeftWidth: 4, borderLeftColor: line.color }}>
              <Text style={{ fontSize: 22 }}>{line.icon}</Text>
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '800', color: line.color }}>{line.name}</Text>
              <Text style={{ color: '#999', fontSize: 14 }}>{openLine === i ? '▲' : '▼'}</Text>
            </View>
            {openLine === i && (
              <View style={{ padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: '#E0D8CC' }}>
                <View style={{ backgroundColor: '#F5F0E8', padding: 10, borderWidth: 1, borderColor: '#E0D8CC' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#7B4E2A', marginBottom: 4 }}>📍 晋升路径示意</Text>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 18 }}>{line.path}</Text>
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#2a7a3b', letterSpacing: 1 }}>✅ 优势</Text>
                  {line.strengths.map(s => (
                    <View key={s} style={{ flexDirection: 'row', gap: 6 }}>
                      <Text style={{ color: '#2a7a3b', fontSize: 11 }}>+</Text>
                      <Text style={{ fontSize: 11, color: '#444', flex: 1, lineHeight: 16 }}>{s}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: '#C82829', letterSpacing: 1 }}>⚠️ 劣势与风险</Text>
                  {line.weaknesses.map(w => (
                    <View key={w} style={{ flexDirection: 'row', gap: 6 }}>
                      <Text style={{ color: '#C82829', fontSize: 11 }}>−</Text>
                      <Text style={{ fontSize: 11, color: '#444', flex: 1, lineHeight: 16 }}>{w}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {/* 关键年龄节点 */}
      <View style={{ margin: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D8CC', overflow: 'hidden' }}>
        <View style={{ backgroundColor: '#1D3B5E', padding: 12 }}>
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>⏰ 关键年龄节点</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 3 }}>超龄即不再被提拔，请合理规划仕途节奏</Text>
        </View>
        {[
          { age: '35岁前', event: '进入副处级（rank 4），是"后备干部"入门门槛' },
          { age: '40岁前', event: '进入正处级（rank 5-6），争取市委/市政府要职' },
          { age: '45岁前', event: '进入副厅级（rank 7-8），进省委视野' },
          { age: '50岁前', event: '进入正厅级（rank 8），参加"省部级干部"考察名单' },
          { age: '55岁前', event: '进入副部级（rank 9-10），省委书记/副省长等核心职务' },
          { age: '60岁',   event: 'rank 1–10 基准退休年龄，副部级可申请延至 63 岁' },
          { age: '65岁',   event: 'rank 11–12（副国家级）基准退休，最晚 68 岁' },
          { age: '70岁',   event: 'rank 13–15（正国家级）可自主退休，无强制规定' },
        ].map(item => (
          <View key={item.age} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F0EDE6', gap: 10 }}>
            <View style={{ backgroundColor: '#C82829', paddingHorizontal: 7, paddingVertical: 3, minWidth: 52, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{item.age}</Text>
            </View>
            <Text style={{ fontSize: 12, color: '#333', flex: 1, lineHeight: 18 }}>{item.event}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── 主页 ─────────────────────────────────────────────────────
export default function OfficialHierarchyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('county');

  const data = getData(activeTab);
  const tiers = getTierOrder(activeTab);

  // 普通 tab 渲染（按级别分组）
  const renderContent = useCallback(() => {
    if (activeTab === 'national' || activeTab === 'guide') return null;
    return tiers.map(tier => {
      const items = data.filter(p => p.tier === tier);
      if (items.length === 0) return null;
      return (
        <View key={tier}>
          <SectionHeader tier={tier} color={getTierColor(tier)} />
          {items.map(item => (
            <PositionRow
              key={item.key}
              title={item.title}
              tier={item.tier}
              organ={item.organ}
              desc={item.desc}
              isHighProfile={item.isHighProfile}
              highProfileNote={item.highProfileNote}
            />
          ))}
        </View>
      );
    });
  }, [activeTab, data, tiers]);

  // 国家级 tab 渲染（按机构分组，深色主题）
  const renderNational = useCallback(() => {
    if (activeTab !== 'national') return null;
    return NATIONAL_ORGAN_ORDER.map(organ => {
      const positions = getNationalByOrgan(organ as NationalOrgan);
      if (positions.length === 0) return null;
      return (
        <View key={organ}>
          <NationalOrganHeader organ={organ as NationalOrgan} />
          {positions.map(pos => (
            <NationalPositionRow key={pos.key} pos={pos} />
          ))}
        </View>
      );
    });
  }, [activeTab]);

  const isNational = activeTab === 'national';
  const isGuide    = activeTab === 'guide';
  const currentTab = TABS.find(t => t.key === activeTab)!;
  const highProfileCount = isNational ? 7 : isGuide ? 0 : data.filter(p => p.isHighProfile).length;
  const leagueCount = isNational || isGuide ? 0 : data.filter(p => p.organ === '团委').length;
  const totalCount = isNational
    ? NATIONAL_ORGAN_ORDER.reduce((n, o) => n + getNationalByOrgan(o as NationalOrgan).length, 0)
    : isGuide ? 0 : data.length;

  return (
    <View style={{ flex: 1, backgroundColor: isNational ? '#0D0D0D' : '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor={isNational ? '#100808' : '#1D3B5E'} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: isNational ? '#140A0A' : '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>人事制度 · 职位体系</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>官职体系</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            {isGuide ? (
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>路线 · 条件 · 通道</Text>
            ) : (
              <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 10 }}>{currentTab.label} · {totalCount}个职位</Text>
            )}
            {isNational && (
              <Text style={{ color: '#E08060', fontSize: 10 }}>★ 7名联邦政务常委 · 9大机构</Text>
            )}
            {!isNational && !isGuide && highProfileCount > 0 && (
              <Text style={{ color: '#F0C050', fontSize: 10 }}>
                ⭐ {highProfileCount}个高配{leagueCount > 0 ? ` · ◆ ${leagueCount}个团委` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Tab栏 */}
        <View style={{ flexDirection: 'row', gap: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isNatTab = tab.key === 'national';
            const isGuideTab = tab.key === 'guide';
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 7,
                  backgroundColor: isActive
                    ? (isNatTab ? '#8B0000' : isGuideTab ? '#1D3B5E' : '#C82829')
                    : 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: isActive
                    ? (isNatTab ? '#8B0000' : isGuideTab ? '#1D3B5E' : '#C82829')
                    : 'rgba(255,255,255,0.15)',
                  marginHorizontal: 2,
                }}
              >
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: isActive ? '700' : '400' }}>{tab.label}</Text>
                <Text style={{ fontSize: 8, color: isActive ? (isNatTab ? '#FFB090' : '#FFD0A0') : '#a0b4cc', marginTop: 1 }}>{tab.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 说明条 */}
      {!isNational && !isGuide && (
        <View style={{ backgroundColor: '#FFF9E6', borderBottomWidth: 1, borderBottomColor: '#F0C050', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 16 }}>
            点击职位可展开详细说明。⭐高配职位为非常规升格安排，实际级别高于标注等级。<Text style={{ color: '#B07000', fontWeight: '700' }}>◆团委</Text> 职位为团派路线专属通道。
          </Text>
        </View>
      )}
      {isNational && (
        <View style={{ backgroundColor: '#1C0A0A', borderBottomWidth: 1, borderBottomColor: '#8B0000', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#CC8060', lineHeight: 16 }}>
            ★ 点击职位可展开职权说明。联邦政务常委会7名常委为最高决策核心；联邦内阁统筹国家行政；共青团中央为团派路线核心晋升通道。
          </Text>
        </View>
      )}

      {/* 退休年龄规则说明条（非指南Tab） */}
      {!isNational && !isGuide && (
        <View style={{ backgroundColor: '#F0EEF8', borderBottomWidth: 1, borderBottomColor: '#C0B0E0', paddingHorizontal: 14, paddingVertical: 8 }}>
          {activeTab === 'county' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              科员至正处级（rank 1–6），基准退休年龄均为 <Text style={{ fontWeight: '700' }}>60岁</Text>，不设弹性延迟退休。
              团委书记为团派路线起点，届满可平级转任乡镇或县委系统实职。
            </Text>
          )}
          {activeTab === 'city' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              副厅级（rank 7–8）、正厅级（rank 7–8正职）基准退休年龄 <Text style={{ fontWeight: '700' }}>60岁</Text>，不设延迟；
              副部级（rank 9–10）基准 <Text style={{ fontWeight: '700' }}>60岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>3年</Text>（最晚63岁）。
              团市委书记届满后多转任政府实职副厅级岗位。
            </Text>
          )}
          {activeTab === 'province' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              正部级（rank 11–12）基准 <Text style={{ fontWeight: '700' }}>60岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>3年</Text>；
              副国家级（rank 13）基准 <Text style={{ fontWeight: '700' }}>65岁</Text>，最多延迟3年（最晚68岁）；
              正国家级（rank 14–15）<Text style={{ fontWeight: '700' }}>不设强制退休年龄</Text>，70岁可自主退休。
              团省委书记（省委常委兼任）届满后多转任副省长，是团派路线进入副部级实职的核心通道。
            </Text>
          )}
          {activeTab === 'sub' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              副省级城市正职为副部级（rank 9–10），基准退休年龄 <Text style={{ fontWeight: '700' }}>60岁</Text>，
              经组织批准可延迟最长 <Text style={{ fontWeight: '700' }}>3年</Text>（最晚63岁）。
            </Text>
          )}
        </View>
      )}
      {isNational && (
        <View style={{ backgroundColor: '#120808', borderBottomWidth: 1, borderBottomColor: '#3A1818', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#906060', lineHeight: 17 }}>
            🕐 <Text style={{ fontWeight: '700', color: '#C08060' }}>退休规则：</Text>
            正国家级（rank 14–15）<Text style={{ fontWeight: '700', color: '#E09060' }}>不设强制退休年龄</Text>，70周岁时可自主选择退休。每届任期5年，届满后经联邦党代会/人大投票决定是否续任；联邦内阁总理依宪法连任不超过两届，联邦总统·执政党主席任期由联邦党代会决定，无届次上限。
          </Text>
        </View>
      )}

      {/* 内容区 */}
      {isGuide ? (
        <GuideScreen />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          style={{ backgroundColor: isNational ? '#0D0D0D' : '#F5F4F1' }}
        >
          {renderContent()}
          {renderNational()}
        </ScrollView>
      )}
    </View>
  );
}
