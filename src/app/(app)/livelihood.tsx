// 民生详情页面 — 全面展示城市民生状况，数据随全局操作动态变化
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useGame } from '@/ctx/GameContext';
import { getPlayerCareerHistory } from '@/db/gameApi';

// ────────────────────────────────────────────────────────
// 人口基准数据（参照2020年全国人口普查及行政区划实际数据）
//
// 乡镇级（1-3）：中国乡镇平均常住人口约1.5万，范围0.5-5万
// 县级（4-6）：县级行政区平均约43万，范围20-120万
// 地级市（7-9）：地级市平均约400万，范围50-2000万
// 省级（10-11）：省份平均约9400万，范围80万(西藏)-1.26亿(广东)
// 国家级（12+）：管辖全国约14.1亿
// ────────────────────────────────────────────────────────
const BASE_POPULATION: Record<number, number> = {
  1:  8000,      // 乡镇科员：所在乡镇约0.8万
  2:  12000,     // 副乡镇长：乡镇约1.2万
  3:  22000,     // 乡镇长：乡镇约2.2万
  4:  400000,    // 副县长：县约40万
  5:  500000,    // 县长：县约50万
  6:  620000,    // 县委书记：县约62万
  7:  2500000,   // 副市长：地级市约250万
  8:  3800000,   // 市长：地级市约380万
  9:  5000000,   // 市委书记：地级市约500万
  10: 50000000,  // 省长：省份约5000万
  11: 65000000,  // 省执政委书记：省份约6500万
  12: 1410000000,// 部长：全国约14.1亿
  13: 1410000000,
  14: 1410000000,
  15: 1410000000,
};

// 城镇化率基准（%）
const URBAN_RATE_BASE: Record<number, number> = {
  1: 25, 2: 28, 3: 32,        // 乡镇：城镇化率较低
  4: 48, 5: 52, 6: 55,        // 县级
  7: 62, 8: 65, 9: 68,        // 地级市
  10: 72, 11: 74,              // 省级
  12: 67, 13: 67, 14: 67, 15: 67, // 全国
};

function calcPopulation(rankLevel: number, livelihood: number): number {
  const base = BASE_POPULATION[rankLevel] ?? 50000;
  // 民生指数影响人口（高民生吸引外来人口，低民生导致人口流失）
  const factor = 0.85 + (livelihood / 100) * 0.30;
  return Math.round(base * factor);
}

function formatPop(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(2)}亿`;
  if (n >= 10000)     return `${(n / 10000).toFixed(1)}万`;
  return `${n}`;
}

// 月人均可支配收入（元）推算
// 参照2023年统计公报，全国城镇居民月均可支配收入约3700元，农村约1650元
function calcMonthlyIncome(rankLevel: number, residentIncome: number): number {
  const base = rankLevel >= 10 ? 4200 : rankLevel >= 7 ? 3600 : rankLevel >= 4 ? 2800 : 1800;
  return Math.round(base * (0.5 + residentIncome / 100 * 1.0));
}

// 医疗保险覆盖率（%）：全国基本医保已覆盖95%+，模拟中低端值为初始
function calcMedicalCoverage(healthcareRate: number): number {
  return Math.min(99, Math.round(50 + healthcareRate * 0.48));
}

// 义务教育巩固率（%）参照全国2023年九年义务教育巩固率约95.7%
function calcEduRetention(eduLevel: number): number {
  return Math.min(99, Math.round(60 + eduLevel * 0.38));
}

// 万人拥有病床数（张/万人）：全国约68张（2023）
function calcBedsPerWan(rankLevel: number, healthcareRate: number): number {
  const base = rankLevel >= 10 ? 75 : rankLevel >= 7 ? 60 : rankLevel >= 4 ? 45 : 28;
  return Math.round(base * (0.5 + healthcareRate / 100 * 1.0));
}

// 保障房覆盖率（%）
function calcHousingSecurity(housingRate: number): number {
  return Math.min(60, Math.round(5 + housingRate * 0.55));
}

// 城镇化率（%）
function calcUrbanRate(rankLevel: number, cityLivelihood: number): number {
  const base = URBAN_RATE_BASE[rankLevel] ?? 55;
  return Math.min(95, Math.round(base + cityLivelihood * 0.12));
}

// 人口自然增长率（‰）：全国2023年约-1.5‰
function calcNaturalGrowth(residentIncome: number, healthcareRate: number): number {
  const raw = -2 + (residentIncome + healthcareRate) / 100 * 4;
  return Math.round(raw * 10) / 10;
}

// 万人拥有学校数
function calcSchoolsPerWan(rankLevel: number, eduLevel: number): number {
  const base = rankLevel <= 3 ? 3.5 : rankLevel <= 6 ? 2.8 : rankLevel <= 9 ? 2.2 : 1.8;
  return Math.round((base * (0.6 + eduLevel / 100 * 0.8)) * 10) / 10;
}

// 社会消费品零售总额增速（%）
function calcRetailGrowth(residentIncome: number, cityGdp: number): number {
  return Math.round((residentIncome * 0.04 + cityGdp * 0.02) * 10) / 10;
}

function ProgressBar({ value, color, height = 6 }: { value: number; color: string; height?: number }) {
  return (
    <View style={{ height, backgroundColor: '#EBEBEB', flex: 1, borderRadius: 1 }}>
      <View style={{ height, width: `${Math.min(100, Math.max(0, value))}%` as `${number}%`, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

interface StatRowProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  indent?: boolean;
}
function StatRow({ label, value, sub, color = '#222', indent }: StatRowProps) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 5, paddingLeft: indent ? 12 : 0, borderBottomWidth: 1, borderBottomColor: '#F0EEEA' }}>
      <Text style={{ fontSize: 12, color: '#555', flex: 1 }}>{label}</Text>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color }}>{value}</Text>
        {sub ? <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{sub}</Text> : null}
      </View>
    </View>
  );
}

interface SectionProps { title: string; icon: string; children: React.ReactNode }
function Section({ title, icon, children }: SectionProps) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
        <Text style={{ fontSize: 14 }}>{icon}</Text>
        <Text style={{ fontSize: 11, color: '#666', letterSpacing: 1.5, fontWeight: '600' }}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// 影响因素来源说明（含页面跳转路由）
const IMPACT_SOURCES = [
  { icon: '📋', title: '秘书室·起草文件', desc: '党建/整治类公文 → 下属廉洁+；社会治理类 → 治安提升；民生类公文 → 城市民生指数+', route: '/(app)/secretary' },
  { icon: '🏗️', title: '城市建设', desc: '基础设施建设 → GDP/民生+；教育文化设施 → 教育+；医疗项目 → 医疗覆盖+', route: '/(app)/construction' },
  { icon: '💰', title: '招商投资·财政', desc: '企业入驻 → 就业岗位增加 → 居民收入+；财政盈余充裕时月结算自动小幅提升民生基础指标', route: '/(app)/finance' },
  { icon: '🚔', title: '公安系统', desc: '破获案件、专项整治 → 治安指数+；扫黑除恶行动 → 民生满意度+', route: '/(app)/police' },
  { icon: '🏛️', title: '职能部门管理', desc: '民政局慰问、教育局专项、卫健委普查等活动 → 对应民生分项+；各部门绩效直接联动民生数据', route: '/(app)/departments' },
  { icon: '⚖️', title: '四大班子', desc: '开展廉洁自查、配合巡视 → 下属廉洁+ → 间接提升民心满意度', route: '/(app)/four-organs' },
  { icon: '🗓️', title: '重要会议', desc: '召开专题民生会议、联邦国会国策协理堂联席会议 → 政绩+；布置民生专项部署 → 各分项+', route: '/(app)/meeting' },
  { icon: '💵', title: '城市财政管理', desc: '合理控制城市财政收支，盈余越高月度自动民生补贴越多；降低债务比例 → 民生更可持续', route: '/(app)/fiscal' },
];

export default function LivelihoodPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, refreshSave } = useGame();
  const { width: screenWidth } = useWindowDimensions();
  const [careerHistory, setCareerHistory] = useState<{ position: string; city: string; rankLevel: number; startYear: number | null; endYear: number | null; livelihoodScore: number }[]>([]);

  useFocusEffect(useCallback(() => {
    refreshSave();
    if (save?.id) {
      (async () => {
        const hist = await getPlayerCareerHistory(save.id);
        setCareerHistory(hist);
      })();
    }
  }, [refreshSave, save?.id]));

  if (!save) return null;

  const rl = save.rankLevel;

  // 基础计算
  const population      = calcPopulation(rl, save.cityLivelihood);
  const urbanRate       = calcUrbanRate(rl, save.cityLivelihood);
  const monthlyIncome   = calcMonthlyIncome(rl, save.residentIncome);
  const annualIncome    = monthlyIncome * 12;
  const medCoverage     = calcMedicalCoverage(save.healthcareRate);
  const eduRetention    = calcEduRetention(save.eduLevel);
  const bedsPerWan      = calcBedsPerWan(rl, save.healthcareRate);
  const schoolsPerWan   = calcSchoolsPerWan(rl, save.eduLevel);
  const housingSec      = calcHousingSecurity(save.housingRate);
  const naturalGrowth   = calcNaturalGrowth(save.residentIncome, save.healthcareRate);
  const retailGrowth    = calcRetailGrowth(save.residentIncome, save.cityGdp);
  const isNational      = rl >= 12;

  // 民心综合得分
  const compositeScore = Math.round(
    save.residentIncome * 0.30 +
    save.healthcareRate * 0.28 +
    save.eduLevel       * 0.22 +
    save.housingRate    * 0.20
  );
  const scoreLevel =
    compositeScore >= 80 ? { label: '优秀', color: '#2a7a3b', bg: '#f0faf3' } :
    compositeScore >= 65 ? { label: '良好', color: '#2B4B6F', bg: '#f0f4fa' } :
    compositeScore >= 45 ? { label: '一般', color: '#b35900', bg: '#fff8f0' } :
    { label: '较差', color: '#C82829', bg: '#fff5f5' };

  // 人口趋势方向
  const popTrend = naturalGrowth > 0.5 ? '↑ 净流入' : naturalGrowth < -1 ? '↓ 净流出' : '→ 基本稳定';
  const popTrendColor = naturalGrowth > 0.5 ? '#2a7a3b' : naturalGrowth < -1 ? '#C82829' : '#888';

  // 贫困率估算（越低越好）
  const povertyRate = Math.max(0.1, 15 - save.residentIncome * 0.12 - save.cityLivelihood * 0.05).toFixed(1);

  // 就业率
  const employRate = Math.min(99, Math.round(88 + save.cityBusiness * 0.06 + save.cityGdp * 0.04));

  // 人均GDP（万元）估算
  const gdpPerCapita = (() => {
    const base = rl >= 10 ? 12 : rl >= 7 ? 7 : rl >= 4 ? 4 : 2;
    return (base * (0.6 + save.cityGdp / 100 * 0.9)).toFixed(1);
  })();

  // 刑事案件万人发案率（越低越好）
  const crimeRate = Math.max(0.5, 8 - save.securityIndex * 0.06).toFixed(1);

  const securityLevel =
    save.securityIndex >= 75 ? { label: '优良', color: '#2a7a3b' } :
    save.securityIndex >= 50 ? { label: '一般', color: '#b35900' } :
    { label: '较差', color: '#C82829' };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>民生与社会事业</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>民生详情</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save.rankName}</Text>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

        {/* ── 综合概览横幅 ── */}
        <View style={{ backgroundColor: '#2B4B6F', padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            {/* 人口区 */}
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 2, marginBottom: 2 }}>
                {isNational ? '全国常住人口' : '辖区常住人口'}
              </Text>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                {formatPop(population)}
              </Text>
              <Text style={{ color: popTrendColor, fontSize: 11, marginTop: 3 }}>
                {popTrend} · 自然增长率 {naturalGrowth}‰
              </Text>
            </View>
            {/* 民心分 */}
            <View style={{ alignItems: 'center', borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.18)', paddingLeft: 16 }}>
              <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>民心综合评分</Text>
              <Text style={{ color: '#fff', fontSize: 32, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{compositeScore}</Text>
              <View style={{ backgroundColor: scoreLevel.bg, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 }}>
                <Text style={{ fontSize: 10, color: scoreLevel.color, fontWeight: '700' }}>{scoreLevel.label}</Text>
              </View>
            </View>
          </View>

          {/* 城镇/农村人口分布 */}
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>城镇化率</Text>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{urbanRate}%</Text>
            </View>
            <View style={{ flexDirection: 'row', height: 6, gap: 1 }}>
              <View style={{ flex: urbanRate, backgroundColor: '#4FC3F7', borderRadius: 1 }} />
              <View style={{ flex: 100 - urbanRate, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 1 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>城镇 {formatPop(Math.round(population * urbanRate / 100))}</Text>
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>农村 {formatPop(Math.round(population * (100 - urbanRate) / 100))}</Text>
            </View>
          </View>
        </View>

        {/* ── 四维指标（进度条 + 绩效来源） ── */}
        <Section title="民生核心四维指标" icon="📊">
          {([
            {
              label: '居民收入水平', value: save.residentIncome, color: '#2B4B6F',
              sub: `月均可支配 ${(monthlyIncome / 1000).toFixed(1)}k元`,
              kpiKey: 'residentIncome',
              sources: [
                { icon: '🏭', src: '招商引资', effect: '企业入驻 → 就业岗位↑ → 居民收入+', active: save.cityGdp >= 60 },
                { icon: '📄', src: '经济类公文', effect: '秘书室·发展实体经济 → +2~4/次', active: save.meritPoints > 500 },
                { icon: '🏗️', src: '城市建设·产业', effect: '完成产业类项目 → 收入/GDP同步+', active: save.cityGdp >= 55 },
                { icon: '⚠️', src: '通货膨胀风险', effect: 'GDP过高而收入偏低时引发民怨', active: save.cityGdp - save.residentIncome > 30 },
              ],
            },
            {
              label: '医疗卫生保障', value: save.healthcareRate, color: '#C82829',
              sub: `基本医保覆盖率 ${medCoverage}%`,
              kpiKey: 'healthcareRate',
              sources: [
                { icon: '🏥', src: '卫健委·专项整治', effect: '每次部门行动 → 医疗保障+2~5', active: save.healthcareRate >= 50 },
                { icon: '📄', src: '民生类公文', effect: '秘书室·申请医疗补贴 → +1~3/次', active: true },
                { icon: '🏗️', src: '城建·医疗设施', effect: '医院/诊所建设 → 床位数+，覆盖率+', active: save.healthcareRate >= 40 },
                { icon: '💊', src: '人口健康联动', effect: '预期寿命每提升1岁 → 医疗指数隐性+0.5', active: save.healthcareRate >= 65 },
              ],
            },
            {
              label: '教育文化水平', value: save.eduLevel, color: '#2a7a3b',
              sub: `义务教育巩固率 ${eduRetention}%`,
              kpiKey: 'eduLevel',
              sources: [
                { icon: '🎓', src: '教育局·专项行动', effect: '教育局行动 → 教育水平+2~6', active: save.eduLevel >= 45 },
                { icon: '📄', src: '教育类公文', effect: '秘书室·教育经费申请 → +1~3/次', active: true },
                { icon: '🏗️', src: '城建·教育设施', effect: '学校/图书馆建设 → 入学率+，水平+', active: save.eduLevel >= 35 },
                { icon: '💼', src: '收入联动', effect: '居民收入↑→教育投入意愿↑→入学率提升', active: save.residentIncome >= 55 },
              ],
            },
            {
              label: '住房保障程度', value: save.housingRate, color: '#7a5c2a',
              sub: `保障房覆盖率 ${housingSec}%`,
              kpiKey: 'housingRate',
              sources: [
                { icon: '🏘️', src: '城建·保障性住房', effect: '保障房项目完成 → 住房+3~8', active: save.housingRate >= 40 },
                { icon: '📄', src: '保障房补贴公文', effect: '秘书室·住房补贴申请 → +1~2/次', active: true },
                { icon: '🏛️', src: '民政局·社会保障', effect: '民政局行动 → 住房+社保协同提升', active: save.housingRate >= 30 },
                { icon: '📈', src: '城镇化推进', effect: '人口净流入 → 租房压力↑，需主动增供', active: naturalGrowth > 1 },
              ],
            },
          ] as const).map(ind => {
            const activeSources  = ind.sources.filter(s => s.active);
            const inactiveSources = ind.sources.filter(s => !s.active);
            // KPI绩效趋势：与50对比估算
            const kpiTrend = ind.value >= 70 ? { label: '优秀', color: '#2a7a3b' }
              : ind.value >= 50 ? { label: '达标', color: '#2B4B6F' }
              : ind.value >= 35 ? { label: '待提升', color: '#b35900' }
              : { label: '不达标', color: '#C82829' };
            return (
              <View key={ind.label} style={{ marginBottom: 14, borderWidth: 1, borderColor: '#E8E6E2', padding: 12 }}>
                {/* 标题行 */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <Text style={{ fontSize: 12, color: '#333', fontWeight: '700' }}>{ind.label}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: kpiTrend.color + '18', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: kpiTrend.color, fontWeight: '700' }}>KPI {kpiTrend.label}</Text>
                    </View>
                    <Text style={{ fontSize: 13, color: ind.color, fontWeight: '700', fontVariant: ['tabular-nums'] }}>
                      {ind.value}<Text style={{ fontSize: 9, fontWeight: '400' }}>/100</Text>
                    </Text>
                  </View>
                </View>
                <ProgressBar value={ind.value} color={ind.color} height={7} />
                <Text style={{ fontSize: 10, color: '#aaa', marginTop: 3, marginBottom: 8 }}>{ind.sub}</Text>
                {/* 绩效来源标签 */}
                <Text style={{ fontSize: 9, color: '#888', letterSpacing: 1, marginBottom: 5 }}>绩效影响来源</Text>
                <View style={{ gap: 4 }}>
                  {activeSources.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#F0FAF0', borderWidth: 1, borderColor: '#C8E6C9', padding: 7 }}>
                      <Text style={{ fontSize: 13, lineHeight: 16 }}>{s.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>{s.src}</Text>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{s.effect}</Text>
                      </View>
                      <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 8, color: '#fff' }}>活跃</Text>
                      </View>
                    </View>
                  ))}
                  {inactiveSources.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: '#FAFAFA', borderWidth: 1, borderColor: '#E0E0E0', padding: 7, opacity: 0.65 }}>
                      <Text style={{ fontSize: 13, lineHeight: 16 }}>{s.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 9, color: '#888', fontWeight: '700' }}>{s.src}</Text>
                        <Text style={{ fontSize: 10, color: '#999', lineHeight: 15 }}>{s.effect}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })}
          {/* 权重说明 */}
          <View style={{ backgroundColor: '#F8F7F5', padding: 10, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              📐 民心综合分权重：居民收入 30% · 医疗卫生 28% · 教育水平 22% · 住房保障 20%
            </Text>
          </View>
        </Section>

        {/* ── 居民收入与就业 ── */}
        <Section title="居民收入与就业" icon="💼">
          <StatRow label="城镇居民月均可支配收入" value={`${(monthlyIncome / 1000).toFixed(1)}k 元/月`} sub="（模拟估算值）" color="#2B4B6F" />
          <StatRow label="城镇居民年均可支配收入" value={`${(annualIncome / 10000).toFixed(2)}万元/年`} color="#2B4B6F" />
          <StatRow label="农村居民月均可支配收入" value={`${(monthlyIncome * 0.48 / 1000).toFixed(1)}k 元/月`} />
          <StatRow label="人均GDP（估算）" value={`${gdpPerCapita}万元`} sub={`全国均对应约${rl >= 10 ? '12' : rl >= 7 ? '7' : rl >= 4 ? '4' : '2'}万元`} />
          <StatRow label="城镇就业率" value={`${employRate}%`} color={employRate >= 95 ? '#2a7a3b' : employRate >= 90 ? '#b35900' : '#C82829'} />
          <StatRow label="社会消费品零售总额增速" value={`+${retailGrowth}%`} sub="同比" color="#2a7a3b" />
          <StatRow label="贫困率（估算）" value={`${povertyRate}%`} color={parseFloat(povertyRate) < 2 ? '#2a7a3b' : parseFloat(povertyRate) < 5 ? '#b35900' : '#C82829'} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：招商局·企业入驻 → 就业岗位↑；秘书室·经济类公文 → 居民收入+；城市建设·产业项目 → 收入/GDP+
            </Text>
          </View>
        </Section>

        {/* ── 医疗卫生 ── */}
        <Section title="医疗卫生与健康" icon="🏥">
          <StatRow label="基本医疗保险覆盖率" value={`${medCoverage}%`} color={medCoverage >= 90 ? '#2a7a3b' : medCoverage >= 70 ? '#b35900' : '#C82829'} />
          <StatRow label="每万人病床数" value={`${bedsPerWan} 张/万人`} sub={`全国平均约68张（2023）`} />
          <StatRow label="卫生机构数估算" value={`约${Math.round(population / 10000 * (bedsPerWan / 15))}所`} sub="（含诊所、卫生室）" />
          <StatRow label="人均预期寿命" value={`${Math.min(80, 68 + Math.round(save.healthcareRate * 0.12))}岁`} sub="（全国均约78.6岁）" />
          <StatRow label="婴儿死亡率" value={`${Math.max(2, 12 - Math.round(save.healthcareRate * 0.09))}‰`} sub="（全国约4.9‰）" />
          <StatRow label="城镇职工医保参保率" value={`${Math.min(98, 55 + Math.round(save.healthcareRate * 0.43))}%`} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：职能部门·卫健委 → 医疗覆盖+；城市建设·医疗设施 → 床位数+；秘书室·民生类公文 → 医疗保障+
            </Text>
          </View>
        </Section>

        {/* ── 教育文化 ── */}
        <Section title="教育文化与人才" icon="📚">
          <StatRow label="义务教育九年巩固率" value={`${eduRetention}%`} color={eduRetention >= 95 ? '#2a7a3b' : '#b35900'} sub="（全国约95.7%）" />
          <StatRow label="高中阶段毛入学率" value={`${Math.min(97, Math.round(55 + save.eduLevel * 0.40))}%`} sub="（全国约91.6%）" />
          <StatRow label="高等教育毛入学率" value={`${Math.min(75, Math.round(20 + save.eduLevel * 0.50))}%`} sub="（全国约60.2%）" />
          <StatRow label="万人拥有学校数" value={`${schoolsPerWan} 所/万人`} />
          <StatRow label="在校学生人数估算" value={`约${formatPop(Math.round(population * 0.17 * (0.6 + save.eduLevel / 100 * 0.8)))}`} sub="含中小学" />
          <StatRow label="劳动力受教育年限" value={`${(9 + save.eduLevel * 0.06).toFixed(1)}年`} sub="（全国均约11年）" />
          <StatRow label="公共文化机构数" value={`约${Math.round(1 + save.eduLevel * 0.05 * (rl >= 10 ? 20 : rl >= 7 ? 5 : 1))}`} sub="图书馆/文化馆/博物馆" />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：职能部门·教育局 → 教育水平+；秘书室·教育类公文 → 入学率+；城市建设·教育设施 → 教育+
            </Text>
          </View>
        </Section>

        {/* ── 住房保障 ── */}
        <Section title="住房与社会保障" icon="🏘️">
          <StatRow label="保障性住房覆盖率" value={`${housingSec}%`} color={housingSec >= 25 ? '#2a7a3b' : housingSec >= 15 ? '#b35900' : '#C82829'} />
          <StatRow label="城镇居民人均住房面积" value={`${(25 + save.housingRate * 0.25).toFixed(0)} ㎡`} sub="（全国约39.8㎡）" />
          <StatRow label="城镇家庭自有住房率" value={`${Math.min(90, 60 + Math.round(save.housingRate * 0.28))}%`} />
          <StatRow label="公租房/廉租房套数" value={`约${formatPop(Math.round(population * housingSec / 100 * 0.25))}套`} />
          <StatRow label="城镇低保覆盖率" value={`${(2.5 - save.residentIncome * 0.015).toFixed(1)}%`} sub="（全国约2.5%）" />
          <StatRow label="养老保险参保率" value={`${Math.min(97, 50 + Math.round(save.housingRate * 0.47))}%`} />
          <StatRow label="失业保险参保人数" value={`约${formatPop(Math.round(population * 0.35 * (0.3 + save.housingRate / 100 * 0.5)))}`} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：城市建设·保障房项目 → 住房保障+；秘书室·申请保障性住房补贴 → +；职能部门·民政局 → 社保覆盖+
            </Text>
          </View>
        </Section>

        {/* ── 社会治安 ── */}
        <Section title="社会治安与稳定" icon="🚔">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0EEEA' }}>
            <Text style={{ fontSize: 12, color: '#555' }}>社会治安综合指数</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ProgressBar value={save.securityIndex} color={securityLevel.color} height={5} />
              <Text style={{ fontSize: 12, fontWeight: '700', color: securityLevel.color, minWidth: 48 }}>
                {save.securityIndex} <Text style={{ fontSize: 10 }}>({securityLevel.label})</Text>
              </Text>
            </View>
          </View>
          <StatRow label="刑事案件万人发案率" value={`${crimeRate} 件/万人`} color={parseFloat(crimeRate) < 3 ? '#2a7a3b' : parseFloat(crimeRate) < 6 ? '#b35900' : '#C82829'} sub="（全国约5件/万人）" />
          <StatRow label="群众安全感满意率" value={`${Math.min(99, 60 + Math.round(save.securityIndex * 0.38))}%`} sub="（全国约98.3%）" />
          <StatRow label="信访投诉处理率" value={`${Math.min(99, 55 + Math.round(save.securityIndex * 0.40))}%`} />
          <StatRow label="安全生产事故发生率" value={`${Math.max(0.1, (5 - save.securityIndex * 0.04)).toFixed(1)}‰`} />
          <View style={{ backgroundColor: '#F8F7F5', padding: 8, marginTop: 6, borderWidth: 1, borderColor: '#E8E6E2' }}>
            <Text style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
              💡 影响来源：公安局·专项整治/破案 → 治安+；秘书室·社会治理类公文 → 治安+；纪检委·反腐行动 → 间接提升
            </Text>
          </View>
        </Section>

        {/* ── 民生与城市发展关联 ── */}
        <Section title="民生与城市发展关联" icon="🔗">
          <View style={{ gap: 8 }}>
            {[
              { a: '居民收入↑', b: 'GDP增速加快，消费市场扩大', icon: '→' },
              { a: '教育水平↑', b: '营商环境改善，高素质劳动力增加', icon: '→' },
              { a: '医疗覆盖↑', b: '劳动力健康水平提升，人口净增长', icon: '→' },
              { a: '住房保障↑', b: '外来人口净流入，城镇化率提升', icon: '→' },
              { a: '民生指数↑', b: '晋升考核加分，政绩积累加速', icon: '→' },
              { a: '社会治安↑', b: '营商环境改善，招商引资更顺利', icon: '→' },
            ].map(row => (
              <View key={row.a} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', minWidth: 90 }}>{row.a}</Text>
                <Text style={{ fontSize: 11, color: '#aaa' }}>{row.icon}</Text>
                <Text style={{ fontSize: 11, color: '#555', flex: 1, lineHeight: 16 }}>{row.b}</Text>
              </View>
            ))}
          </View>
        </Section>

        {/* ── 民生指数历史趋势折线图 ── */}
        {(() => {
          // 构造折线图数据点：历史任期 + 当届当前值
          const rawPoints: { label: string; score: number }[] = [];
          careerHistory.forEach(h => {
            if (h.livelihoodScore > 0 || h.startYear !== null) {
              const yr = h.endYear ?? h.startYear;
              rawPoints.push({
                label: yr ? `${yr}年` : h.position.slice(0, 3),
                score: h.livelihoodScore,
              });
            }
          });
          // 始终附加当前任期值
          const currentYear = Math.floor(save.gameDays / 365) + 2000;
          rawPoints.push({ label: `${currentYear}年（现）`, score: save.cityLivelihood });

          if (rawPoints.length < 2) {
            return (
              <Section title="民生指数历史趋势" icon="📈">
                <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center', paddingVertical: 20 }}>
                  完成至少一次晋升后将展示历届民生指数折线图
                </Text>
              </Section>
            );
          }

          const PAD_L = 36, PAD_R = 14, PAD_T = 16, PAD_B = 28;
          const chartW = screenWidth - 28 - 28; // 页面padding 14*2, Section内padding 14*2
          const chartH = 140;
          const innerW = chartW - PAD_L - PAD_R;
          const innerH = chartH - PAD_T - PAD_B;

          const scores = rawPoints.map(p => p.score);
          const minScore = Math.max(0, Math.min(...scores) - 10);
          const maxScore = Math.min(100, Math.max(...scores) + 10);
          const range = maxScore - minScore || 1;

          const toX = (i: number) => PAD_L + (i / (rawPoints.length - 1)) * innerW;
          const toY = (s: number) => PAD_T + innerH - ((s - minScore) / range) * innerH;

          const pointsStr = rawPoints.map((p, i) => `${toX(i)},${toY(p.score)}`).join(' ');

          // Y轴刻度
          const yTicks = [minScore, Math.round((minScore + maxScore) / 2), maxScore];

          return (
            <Section title="民生指数历史趋势" icon="📈">
              <Svg width={chartW} height={chartH} style={{ overflow: 'visible' }}>
                {/* Y轴参考线 */}
                {yTicks.map(v => {
                  const y = toY(v);
                  return (
                    <React.Fragment key={v}>
                      <Line x1={PAD_L} y1={y} x2={chartW - PAD_R} y2={y} stroke="#E8E8E8" strokeWidth={1} />
                      <SvgText x={PAD_L - 4} y={y + 4} fontSize={9} fill="#aaa" textAnchor="end">{v}</SvgText>
                    </React.Fragment>
                  );
                })}
                {/* 折线 */}
                <Polyline points={pointsStr} fill="none" stroke="#2B4B6F" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {/* 数据点 */}
                {rawPoints.map((p, i) => {
                  const x = toX(i);
                  const y = toY(p.score);
                  const isLast = i === rawPoints.length - 1;
                  const dotColor = p.score >= 70 ? '#2a7a3b' : p.score >= 50 ? '#e67e22' : '#C82829';
                  return (
                    <React.Fragment key={i}>
                      <Circle cx={x} cy={y} r={isLast ? 5 : 3.5} fill={dotColor} stroke="#fff" strokeWidth={1.5} />
                      {/* X轴标签（只显示首/尾/当前，避免拥挤） */}
                      {(i === 0 || isLast || rawPoints.length <= 5) && (
                        <SvgText
                          x={x}
                          y={chartH - 4}
                          fontSize={8}
                          fill={isLast ? '#2B4B6F' : '#999'}
                          textAnchor="middle"
                          fontWeight={isLast ? '700' : '400'}
                        >
                          {p.label.length > 5 ? p.label.slice(0, 5) : p.label}
                        </SvgText>
                      )}
                      {/* 当前值标签（悬浮在点上方） */}
                      {isLast && (
                        <SvgText x={x} y={y - 9} fontSize={10} fill="#2B4B6F" textAnchor="middle" fontWeight="700">
                          {p.score}
                        </SvgText>
                      )}
                    </React.Fragment>
                  );
                })}
              </Svg>
              {/* 图例 */}
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 4, justifyContent: 'center' }}>
                {[{ color: '#2a7a3b', label: '≥70 优良' }, { color: '#e67e22', label: '50-69 一般' }, { color: '#C82829', label: '<50 较差' }].map(it => (
                  <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: it.color }} />
                    <Text style={{ fontSize: 9, color: '#888' }}>{it.label}</Text>
                  </View>
                ))}
              </View>
            </Section>
          );
        })()}

        {/* ── 提升民生的途径说明 ── */}
        <Section title="提升民生的主要途径" icon="💡">
          <Text style={{ fontSize: 10, color: '#aaa', marginBottom: 10, lineHeight: 16 }}>
            点击下方各系统可直接进入操作，民生指标由以下系统实装功能驱动
          </Text>
          {IMPACT_SOURCES.map(src => (
            <Pressable
              key={src.title}
              onPress={() => router.push(src.route as Parameters<typeof router.push>[0])}
              android_ripple={{ color: 'rgba(43,75,111,0.08)' }}
              style={{ flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0EEEA', alignItems: 'center' }}
            >
              {/* 图标 */}
              <View style={{ width: 36, height: 36, backgroundColor: '#EEF3FA', alignItems: 'center', justifyContent: 'center', borderRadius: 2 }}>
                <Text style={{ fontSize: 18 }}>{src.icon}</Text>
              </View>
              {/* 文字 */}
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '700', marginBottom: 2 }}>{src.title}</Text>
                <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>{src.desc}</Text>
              </View>
              {/* 进入箭头 */}
              <Text style={{ fontSize: 18, color: '#2B4B6F', lineHeight: 22 }}>›</Text>
            </Pressable>
          ))}
        </Section>

        {/* ── 人口结构说明 ── */}
        <Section title="人口动态详情" icon="👥">
          {/* 总人口卡 */}
          <View style={{ backgroundColor: '#2B4B6F', padding: 12, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
              <View>
                <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 2 }}>{isNational ? '全国常住人口' : '辖区常住人口'}</Text>
                <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700', marginTop: 2 }}>{formatPop(population)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: naturalGrowth > 0 ? '#80E0A0' : naturalGrowth < 0 ? '#FF9090' : '#aaa', fontSize: 13, fontWeight: '700' }}>
                  {naturalGrowth > 0 ? '▲' : naturalGrowth < 0 ? '▼' : '→'} {popTrend}
                </Text>
                <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>自然增长率 {naturalGrowth}‰</Text>
              </View>
            </View>
            {/* 城镇/农村条形图 */}
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', marginBottom: 4 }}>
                <View style={{ flex: urbanRate, backgroundColor: '#5891BF', height: 8, borderRadius: 1 }} />
                <View style={{ flex: 100 - urbanRate, backgroundColor: '#4A8C5A', height: 8, borderRadius: 1 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>城镇 {urbanRate}% · {formatPop(Math.round(population * urbanRate / 100))}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>农村 {100 - urbanRate}% · {formatPop(Math.round(population * (100 - urbanRate) / 100))}</Text>
              </View>
            </View>
          </View>

          {/* 核心人口指标 */}
          <StatRow label="人口自然增长率" value={`${naturalGrowth}‰`} color={naturalGrowth > 0 ? '#2a7a3b' : '#C82829'} sub="（全国2023年约-1.5‰）" />
          <StatRow label="城镇化率" value={`${urbanRate}%`} sub="全国均约66.2%（2023）" />
          <StatRow label="老龄化率（65岁+）" value={`${Math.min(28, Math.max(8, 14 - naturalGrowth * 0.5 + (100 - save.residentIncome) * 0.04)).toFixed(1)}%`} sub="（全国约15.4%）" />
          <StatRow label="劳动年龄人口（15-64岁）" value={`${formatPop(Math.round(population * 0.68))}`} sub="约占总人口68%" />
          <StatRow label="外出务工人口比例" value={`${Math.max(5, 25 - Math.round(save.cityGdp * 0.15))}%`} sub="与本地就业机会负相关" color={save.cityGdp >= 60 ? '#2a7a3b' : '#b35900'} />
          <StatRow label="外来常住人口比例" value={`${Math.max(2, Math.round(save.cityBusiness * 0.10 + save.residentIncome * 0.05))}%`} color={save.cityBusiness >= 50 ? '#2a7a3b' : '#888'} />
          <StatRow label="出生率（估算）" value={`${Math.max(5, Math.round(8 + save.residentIncome * 0.03 + save.healthcareRate * 0.02))}‰`} sub="全国2023年约6.39‰" />
          <StatRow label="死亡率（估算）" value={`${Math.max(4, Math.round(7 - save.healthcareRate * 0.02))}‰`} sub="全国2023年约7.87‰" />

          {/* 人口变动驱动因素 */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 9, color: '#888', letterSpacing: 1, marginBottom: 6 }}>人口变动驱动因素</Text>
            {[
              {
                icon: '💰', factor: '经济吸引力',
                desc: `GDP ${save.cityGdp} · 就业率 ${employRate}%`,
                effect: save.cityGdp >= 65 ? '高薪就业岗位充足，外来人口持续净流入' : save.cityGdp >= 45 ? '就业形势一般，人口轻微净流入' : '就业机会不足，人口外流压力较大',
                color: save.cityGdp >= 65 ? '#2a7a3b' : save.cityGdp >= 45 ? '#b35900' : '#C82829',
              },
              {
                icon: '🏥', factor: '医疗健康水平',
                desc: `医疗保障 ${save.healthcareRate}/100`,
                effect: save.healthcareRate >= 65 ? '医疗资源丰富，出生率平稳，老龄化可控' : save.healthcareRate >= 45 ? '医疗基本完善，人口健康状况趋于改善' : '医疗资源匮乏，婴儿死亡率偏高，出生意愿低',
                color: save.healthcareRate >= 65 ? '#2a7a3b' : save.healthcareRate >= 45 ? '#b35900' : '#C82829',
              },
              {
                icon: '🎓', factor: '教育人才吸引',
                desc: `教育水平 ${save.eduLevel}/100`,
                effect: save.eduLevel >= 60 ? '优质教育资源吸引高素质人才聚集' : save.eduLevel >= 40 ? '教育质量一般，人才外流现象存在' : '教育薄弱，高学历劳动力持续向外流出',
                color: save.eduLevel >= 60 ? '#2a7a3b' : save.eduLevel >= 40 ? '#b35900' : '#C82829',
              },
              {
                icon: '🏘️', factor: '住房生活成本',
                desc: `住房保障 ${save.housingRate}/100`,
                effect: save.housingRate >= 55 ? '保障房供给充足，生活成本可控，定居意愿强' : save.housingRate >= 35 ? '住房压力较大，但尚在可承受范围' : '住房保障严重不足，外来人口难以定居',
                color: save.housingRate >= 55 ? '#2a7a3b' : save.housingRate >= 35 ? '#b35900' : '#C82829',
              },
            ].map((item, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 8, padding: 9, marginBottom: 5, backgroundColor: '#F8F7F5', borderLeftWidth: 3, borderLeftColor: item.color }}>
                <Text style={{ fontSize: 16, lineHeight: 20 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#333' }}>{item.factor}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{item.desc}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: item.color, lineHeight: 15 }}>{item.effect}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 综合人口健康预判 */}
          {(() => {
            const score = Math.round((save.cityGdp + save.residentIncome + save.healthcareRate + save.eduLevel + save.housingRate) / 5);
            const lvl = score >= 65 ? { label: '人口形势良好', desc: '各项条件优越，辖区有望持续迎来人口净流入，劳动力充裕，城镇化推进顺利。', color: '#2a7a3b', bg: '#F0FAF0' }
              : score >= 45 ? { label: '人口形势平稳', desc: '当前条件下人口基本稳定，小幅净流入或持平，需持续提升经济与公共服务质量。', color: '#2B4B6F', bg: '#F0F4FA' }
              : { label: '存在人口流失风险', desc: '综合条件偏低，外出务工人口较多，建议优先提升就业与民生保障。', color: '#C82829', bg: '#FFF5F5' };
            return (
              <View style={{ backgroundColor: lvl.bg, borderWidth: 1, borderColor: lvl.color + '40', borderLeftWidth: 4, borderLeftColor: lvl.color, padding: 11, marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: lvl.color, marginBottom: 4 }}>📌 综合人口形势：{lvl.label}</Text>
                <Text style={{ fontSize: 10, color: '#555', lineHeight: 16 }}>{lvl.desc}</Text>
              </View>
            );
          })()}

          <View style={{ backgroundColor: '#F0F4FA', padding: 8, marginTop: 8, borderWidth: 1, borderColor: '#D0DAE8' }}>
            <Text style={{ fontSize: 10, color: '#2B4B6F', lineHeight: 16 }}>
              📌 人口数据基于2020年全国人口普查数据换算，根据民生/GDP/就业指数动态浮动±15%
            </Text>
          </View>
        </Section>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
