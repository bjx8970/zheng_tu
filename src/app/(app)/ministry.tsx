import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getAllSubordinates, assessSubordinate } from '@/db/gameApi';
import type { Subordinate } from '@/types/game';
import { MINISTRY_POOL, gameDaysToDate, formatMoney, formatFund } from '@/types/game';
import type { PlayerSave } from '@/types/game';

// 国家级指标策略行动池
const NATIONAL_POLICIES: Record<string, { id: string; label: string; cost: number; desc: string; effect: Partial<Record<'gdp' | 'livelihood' | 'ecology' | 'business' | 'security', number>>; meritReward: number }[]> = {
  'GDP经济': [
    { id: 'n1', label: '推进供给侧结构性改革', cost: 50, desc: '优化产业结构，提升全要素生产率', effect: { gdp: 3 }, meritReward: 8 },
    { id: 'n2', label: '发布营商环境改善方案', cost: 40, desc: '降低市场准入门槛，激发市场活力', effect: { gdp: 2, business: 2 }, meritReward: 6 },
    { id: 'n3', label: '出台稳增长一揽子政策', cost: 80, desc: '财政政策+货币政策协同发力', effect: { gdp: 5 }, meritReward: 12 },
  ],
  '民生保障': [
    { id: 'n4', label: '全国就业优先政策', cost: 60, desc: '扩大就业容量，提升居民收入', effect: { livelihood: 4 }, meritReward: 10 },
    { id: 'n5', label: '推进基本公共服务均等化', cost: 70, desc: '缩小城乡差距，保障基本民生', effect: { livelihood: 3 }, meritReward: 8 },
    { id: 'n6', label: '健全社会保障体系', cost: 50, desc: '完善养老、医疗保险制度', effect: { livelihood: 2 }, meritReward: 6 },
  ],
  '生态文明': [
    { id: 'n7', label: '碳达峰碳中和行动方案', cost: 80, desc: '推动绿色低碳转型，完成双碳目标', effect: { ecology: 5 }, meritReward: 12 },
    { id: 'n8', label: '全国生态保护红线划定', cost: 60, desc: '保护生物多样性，守住生态底线', effect: { ecology: 3 }, meritReward: 8 },
    { id: 'n9', label: '污染防治攻坚战', cost: 70, desc: '系统治理大气、水、土壤污染', effect: { ecology: 4 }, meritReward: 10 },
  ],
  '营商环境': [
    { id: 'n10', label: '清理不合理政商壁垒', cost: 50, desc: '打破地方保护主义，统一大市场', effect: { business: 4 }, meritReward: 10 },
    { id: 'n11', label: '数字政务改革', cost: 40, desc: '提升行政效能，实现"一网通办"', effect: { business: 3 }, meritReward: 7 },
    { id: 'n12', label: '知识产权强国建设', cost: 60, desc: '完善知识产权保护体系，激励创新', effect: { business: 3, gdp: 1 }, meritReward: 8 },
  ],
  '社会治安': [
    { id: 'n13', label: '扫黑除恶专项整治', cost: 60, desc: '打击有组织犯罪，维护社会稳定', effect: { security: 5 }, meritReward: 12 },
    { id: 'n14', label: '完善公共安全应急体系', cost: 50, desc: '提升重大突发事件应对能力', effect: { security: 3 }, meritReward: 8 },
    { id: 'n15', label: '加强网络安全综合治理', cost: 40, desc: '防范网络违法犯罪，保护数据安全', effect: { security: 2 }, meritReward: 5 },
  ],
  '外交事务': [
    { id: 'n16', label: '推进多边贸易合作', cost: 60, desc: '主导区域合作框架，扩大朋友圈', effect: { gdp: 2, business: 2 }, meritReward: 8 },
    { id: 'n17', label: '构建人类命运共同体倡议', cost: 80, desc: '深化南南合作，提升国际影响力', effect: { business: 3 }, meritReward: 10 },
    { id: 'n18', label: '主办国际重要论坛', cost: 50, desc: '展示大国形象，争取国际话语权', effect: { gdp: 1, livelihood: 1 }, meritReward: 6 },
  ],
  '国家安全': [
    { id: 'n19', label: '国防科技创新工程', cost: 80, desc: '推进自主创新，提升战略威慑力', effect: { security: 5 }, meritReward: 15 },
    { id: 'n20', label: '维权护权专项行动', cost: 60, desc: '坚决捍卫国家主权和领土完整', effect: { security: 4 }, meritReward: 12 },
  ],
};

// 各部委下设办公室模板 + 独立编制人员（与玩家下属体系完全独立）
type MinistryStaff = { name: string; title: string; level: 'head' | 'deputy' | 'staff' };
type MinistryOffice = { name: string; headTitle: string; duty: string; staff: MinistryStaff[] };

const MINISTRY_OFFICES: Record<string, MinistryOffice[]> = {
  'GDP经济': [
    { name: '综合发展司', headTitle: '司长', duty: '统筹全国经济发展规划',
      staff: [{ name: '张宏远', title: '司长', level: 'head' }, { name: '李思成', title: '副司长', level: 'deputy' }, { name: '王立群', title: '副司长', level: 'deputy' }] },
    { name: '产业政策司', headTitle: '司长', duty: '推进产业结构调整升级',
      staff: [{ name: '陈博文', title: '司长', level: 'head' }, { name: '刘晓燕', title: '副司长', level: 'deputy' }] },
    { name: '数字经济司', headTitle: '司长', duty: '引导数字经济与实体经济融合',
      staff: [{ name: '孙志远', title: '司长', level: 'head' }, { name: '周磊', title: '副司长', level: 'deputy' }] },
    { name: '财务与预算处', headTitle: '处长', duty: '负责部委年度预算编制',
      staff: [{ name: '吴建国', title: '处长', level: 'head' }, { name: '赵晓梅', title: '副处长', level: 'deputy' }] },
  ],
  '民生保障': [
    { name: '社会保障司', headTitle: '司长', duty: '统筹城乡社会保障政策',
      staff: [{ name: '林德义', title: '司长', level: 'head' }, { name: '杨春梅', title: '副司长', level: 'deputy' }, { name: '黄志强', title: '副司长', level: 'deputy' }] },
    { name: '就业促进司', headTitle: '司长', duty: '推动就业政策落地见效',
      staff: [{ name: '马国华', title: '司长', level: 'head' }, { name: '钱思远', title: '副司长', level: 'deputy' }] },
    { name: '基层民生处', headTitle: '处长', duty: '直接对接基层群众诉求',
      staff: [{ name: '朱明辉', title: '处长', level: 'head' }, { name: '许丽华', title: '副处长', level: 'deputy' }] },
    { name: '政策法规处', headTitle: '处长', duty: '负责民生相关法规研制',
      staff: [{ name: '何昌盛', title: '处长', level: 'head' }, { name: '郑思华', title: '副处长', level: 'deputy' }] },
  ],
  '生态文明': [
    { name: '生态保护司', headTitle: '司长', duty: '推进自然保护区建设管理',
      staff: [{ name: '宋建民', title: '司长', level: 'head' }, { name: '冯志远', title: '副司长', level: 'deputy' }] },
    { name: '大气环境司', headTitle: '司长', duty: '统筹大气污染防治攻坚',
      staff: [{ name: '韩世杰', title: '司长', level: 'head' }, { name: '蒋玉清', title: '副司长', level: 'deputy' }] },
    { name: '资源节约处', headTitle: '处长', duty: '推动能源节约与循环利用',
      staff: [{ name: '唐建华', title: '处长', level: 'head' }, { name: '曾志强', title: '副处长', level: 'deputy' }] },
    { name: '环境监测处', headTitle: '处长', duty: '全国环境质量数据汇总分析',
      staff: [{ name: '彭国梁', title: '处长', level: 'head' }, { name: '邓思远', title: '副处长', level: 'deputy' }] },
  ],
  '营商环境': [
    { name: '市场准入司', headTitle: '司长', duty: '降低市场准入壁垒',
      staff: [{ name: '卢建中', title: '司长', level: 'head' }, { name: '苏明远', title: '副司长', level: 'deputy' }] },
    { name: '公平竞争司', headTitle: '司长', duty: '维护市场公平竞争秩序',
      staff: [{ name: '廖国建', title: '司长', level: 'head' }, { name: '姜思成', title: '副司长', level: 'deputy' }] },
    { name: '政务服务处', headTitle: '处长', duty: '推进"一网通办"改革',
      staff: [{ name: '谭志华', title: '处长', level: 'head' }, { name: '崔晓东', title: '副处长', level: 'deputy' }] },
    { name: '中小企业处', headTitle: '处长', duty: '扶持中小企业发展',
      staff: [{ name: '侯建国', title: '处长', level: 'head' }, { name: '史思远', title: '副处长', level: 'deputy' }] },
  ],
  '社会治安': [
    { name: '治安管理司', headTitle: '司长', duty: '统筹全国治安防控体系',
      staff: [{ name: '龙世明', title: '司长', level: 'head' }, { name: '贺国栋', title: '副司长', level: 'deputy' }] },
    { name: '应急管理司', headTitle: '司长', duty: '重大突发事件协调处置',
      staff: [{ name: '尹建军', title: '司长', level: 'head' }, { name: '潘志远', title: '副司长', level: 'deputy' }] },
    { name: '反诈中心处', headTitle: '处长', duty: '打击电信网络诈骗',
      staff: [{ name: '邹国华', title: '处长', level: 'head' }, { name: '石思思', title: '副处长', level: 'deputy' }] },
    { name: '网络安全处', headTitle: '处长', duty: '维护国家网络安全',
      staff: [{ name: '熊建明', title: '处长', level: 'head' }, { name: '雷志远', title: '副处长', level: 'deputy' }] },
  ],
  '外交事务': [
    { name: '亚洲事务司', headTitle: '司长', duty: '主管周边国家外交事务',
      staff: [{ name: '秦国华', title: '司长', level: 'head' }, { name: '武志成', title: '副司长', level: 'deputy' }] },
    { name: '多边合作司', headTitle: '司长', duty: '参与国际多边机制谈判',
      staff: [{ name: '孟建华', title: '司长', level: 'head' }, { name: '江思远', title: '副司长', level: 'deputy' }] },
    { name: '礼宾处', headTitle: '处长', duty: '承办国际外交接待礼仪',
      staff: [{ name: '叶国明', title: '处长', level: 'head' }, { name: '魏志华', title: '副处长', level: 'deputy' }] },
    { name: '信息资讯处', headTitle: '处长', duty: '对外新闻发布与信息管理',
      staff: [{ name: '丁建中', title: '处长', level: 'head' }, { name: '沈思远', title: '副处长', level: 'deputy' }] },
  ],
  '国家安全': [
    { name: '战略规划司', headTitle: '司长', duty: '统筹国家安全战略规划',
      staff: [{ name: '付国强', title: '司长', level: 'head' }, { name: '范志远', title: '副司长', level: 'deputy' }, { name: '康建华', title: '副司长', level: 'deputy' }] },
    { name: '科技装备司', headTitle: '司长', duty: '推进国防科技自主创新',
      staff: [{ name: '任世杰', title: '司长', level: 'head' }, { name: '袁志成', title: '副司长', level: 'deputy' }] },
    { name: '综合协调处', headTitle: '处长', duty: '协调各系统安全事务',
      staff: [{ name: '方建国', title: '处长', level: 'head' }, { name: '汪思远', title: '副处长', level: 'deputy' }] },
    { name: '保密管理处', headTitle: '处长', duty: '国家机密保护与管理',
      staff: [{ name: '柳志华', title: '处长', level: 'head' }, { name: '严国栋', title: '副处长', level: 'deputy' }] },
  ],
};

// 全局指标颜色
const INDEX_COLOR = { gdp: '#2B4B6F', livelihood: '#2a7a3b', ecology: '#1a6b3a', business: '#7B5E2A', security: '#7a1a1a' };
const INDEX_LABEL = { gdp: 'GDP增速', livelihood: '民生保障', ecology: '生态文明', business: '营商环境', security: '社会治安' };

type MinTab = 'policy' | 'building' | 'staff' | 'events' | 'scitech' | 'discipline' | 'path-discipline' | 'path-party' | 'path-league';

// 重要工作事项配置
const MINISTRY_EVENTS = [
  {
    key: 'state_council_meeting',
    icon: '🏛️',
    title: '联邦内阁常务会议',
    subtitle: '联邦内阁 · 每季度定期召开',
    desc: '主持联邦内阁常务会议，汇报分管领域工作进展，审议重要政策文件，协调跨部门重大事项。',
    cooldownDays: 90,
    cost: 0,
    meritReward: 300,
    favorReward: 8,
    effects: { gdp: 2 },
    badge: '核心会议',
    badgeColor: '#B71C1C',
  },
  {
    key: 'press_conference',
    icon: '🎙️',
    title: '部长记者会',
    subtitle: '新闻中心 · 两会期间举行',
    desc: '出席全国两会部长通道记者会，就国内外媒体关注的政策热点问题作权威解答，展示施政成果。',
    cooldownDays: 60,
    cost: 0,
    meritReward: 150,
    favorReward: 5,
    effects: { livelihood: 2, business: 1 },
    badge: '媒体曝光',
    badgeColor: '#E65100',
  },
  {
    key: 'national_work_conf',
    icon: '📋',
    title: '全国工作会议',
    subtitle: '部委主办 · 全国省市代表参加',
    desc: '召开全国系统工作会议，部署本年度重点工作任务，传达中央指示精神，推动政策落地执行。',
    cooldownDays: 120,
    cost: 20,
    meritReward: 250,
    favorReward: 5,
    effects: { gdp: 1, livelihood: 1, ecology: 1, business: 1, security: 1 },
    badge: '全国部署',
    badgeColor: '#1565C0',
  },
  {
    key: 'special_inspection',
    icon: '🔍',
    title: '专项督察行动',
    subtitle: '派驻督察组 · 下沉地方督导',
    desc: '组织专项督察组赴重点省市，对重大政策落实情况实施全面督导检查，形成督察整改闭环。',
    cooldownDays: 60,
    cost: 30,
    meritReward: 180,
    favorReward: 3,
    effects: { security: 3, livelihood: 1 },
    badge: '监督落实',
    badgeColor: '#212121',
  },
  {
    key: 'legislative_review',
    icon: '⚖️',
    title: '立法审查工作',
    subtitle: '与联邦国会联动 · 部门规章制定',
    desc: '推进本部门职责范围内的立法和规章修订工作，提交联邦国会常委会审议，完善法规制度体系。',
    cooldownDays: 90,
    cost: 20,
    meritReward: 200,
    favorReward: 5,
    effects: { business: 2 },
    badge: '制度建设',
    badgeColor: '#4527A0',
  },
  {
    key: 'budget_meeting',
    icon: '💰',
    title: '年度预算分配会议',
    subtitle: '财政部协同 · 全国预算分配',
    desc: '与财政部协商年度专项预算资金分配方案，向各省市下达政策资金，推动重大项目资金到位。',
    cooldownDays: 120,
    cost: 0,
    meritReward: 180,
    favorReward: 4,
    effects: { gdp: 2 },
    badge: '资金调配',
    badgeColor: '#1B5E20',
  },
  {
    key: 'national_survey',
    icon: '🚌',
    title: '全国调研视察',
    subtitle: '深入基层 · 掌握第一手情况',
    desc: '赴典型省市开展专项调研，走访基层单位和群众，收集一线政策执行反馈，形成高质量调研报告。',
    cooldownDays: 30,
    cost: 10,
    meritReward: 80,
    favorReward: 3,
    effects: { livelihood: 1 },
    badge: '基层视察',
    badgeColor: '#2E7D32',
  },
  {
    key: 'intl_cooperation',
    icon: '🌐',
    title: '对外合作与交流',
    subtitle: '外交协同 · 国际组织参与',
    desc: '参加相关领域国际会议或双多边会谈，推动签署合作协议，拓展对外合作空间，提升国际影响力。',
    cooldownDays: 60,
    cost: 20,
    meritReward: 150,
    favorReward: 4,
    effects: { business: 2, gdp: 1 },
    badge: '对外开放',
    badgeColor: '#006064',
  },
] as const;
type EventKey = typeof MINISTRY_EVENTS[number]['key'];

// ── 副总理以上：只读部委年度工作总览 ──────────────────────────────
// 参照现实政府考核维度：GDP、民生、生态、营商、安全 对应5类关注焦点
const FOCUS_SCORE_MAP: Record<string, { label: string; color: string }> = {
  'GDP经济':  { label: 'GDP增速', color: '#2B4B6F' },
  '民生保障': { label: '民生改善', color: '#2a7a3b' },
  '生态文明': { label: '生态达标', color: '#5a8a3b' },
  '营商环境': { label: '营商评分', color: '#7B5E2A' },
  '社会治安': { label: '治安指数', color: '#8B1A1A' },
  '外交事务': { label: '外交评分', color: '#4B3B8C' },
  '国家安全': { label: '安全指数', color: '#8B1A1A' },
};

function buildAnnualRecord(
  m: typeof MINISTRY_POOL[number],
  save: PlayerSave,
  idx: number,
) {
  // 用各指标和部委焦点确定性地生成"完成率"
  const focusValue = (() => {
    const f = m.focus;
    if (f === 'GDP经济')  return save.cityGdp;
    if (f === '民生保障') return save.cityLivelihood;
    if (f === '生态文明') return save.cityEcology;
    if (f === '营商环境') return save.cityBusiness;
    return save.securityIndex;
  })();
  // 加上稳定扰动（deterministic by idx）
  const noise = ((idx * 13 + 7) % 15) - 7;          // ±7
  const completionRate = Math.min(100, Math.max(30, Math.round(focusValue * 0.7 + noise + 25)));
  const staffFillRate  = Math.min(100, Math.max(70, 88 + ((idx * 7) % 12)));
  const grade = completionRate >= 85 ? '优秀' : completionRate >= 70 ? '良好' : completionRate >= 55 ? '合格' : '待改善';
  const gradeColor = completionRate >= 85 ? '#2a7a3b' : completionRate >= 70 ? '#7B5E2A' : completionRate >= 55 ? '#2B4B6F' : '#C82829';
  return { completionRate, staffFillRate, grade, gradeColor };
}

function MinistryReadonlyView({
  save,
  router,
}: { save: PlayerSave; router: ReturnType<typeof useRouter> }) {
  const insets = useSafeAreaInsets();
  const [focusFilter, setFocusFilter] = useState('全部');
  const [expanded, setExpanded]       = useState<string | null>(null);

  const focusList = ['全部', ...Array.from(new Set(MINISTRY_POOL.map(m => m.focus)))];
  const filtered  = focusFilter === '全部'
    ? MINISTRY_POOL
    : MINISTRY_POOL.filter(m => m.focus === focusFilter);

  const currentYear = Math.floor(save.gameDays / 365) + 1;

  // 汇总统计
  const allRecords = MINISTRY_POOL.map((m, i) => buildAnnualRecord(m, save, i));
  const avgCompletion = Math.round(allRecords.reduce((s, r) => s + r.completionRate, 0) / allRecords.length);
  const excellentCount = allRecords.filter(r => r.grade === '优秀').length;
  const poorCount      = allRecords.filter(r => r.grade === '待改善').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D1F35', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,204,0.6)', fontSize: 9, letterSpacing: 3 }}>联邦内阁 · 部委治国</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>🏛️ 部委年度工作总览</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>第 {currentYear} 年度 · {save.rankName} · 只读模式</Text>
          </View>
        </View>
        {/* 汇总条 */}
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {[
            { label: '平均完成率', value: `${avgCompletion}%`, color: '#FFD700' },
            { label: '优秀部委',   value: `${excellentCount}个`, color: '#90EE90' },
            { label: '待改善',     value: `${poorCount}个`,     color: '#FF8888' },
            { label: '部委总数',   value: `${MINISTRY_POOL.length}个`, color: '#a0b4cc' },
          ].map(item => (
            <View key={item.label} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8 }}>
              <Text style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>{item.value}</Text>
              <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 8, marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 领域筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={{ paddingHorizontal: 6 }}>
        {focusList.map(f => (
          <Pressable
            key={f}
            onPress={() => setFocusFilter(f)}
            style={{ paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: focusFilter === f ? '#0D1F35' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: focusFilter === f ? '700' : '400', color: focusFilter === f ? '#0D1F35' : '#888' }}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 12, gap: 8 }}>
        {filtered.map((m, rawIdx) => {
          // 找到在原数组的idx以确保扰动一致
          const idx = MINISTRY_POOL.findIndex(x => x.name === m.name);
          const rec = buildAnnualRecord(m, save, idx);
          const isOpen = expanded === m.name;
          const focusMeta = FOCUS_SCORE_MAP[m.focus] ?? { label: m.focus, color: '#555' };

          return (
            <Pressable
              key={m.name}
              onPress={() => setExpanded(isOpen ? null : m.name)}
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isOpen ? '#0D1F35' : '#D8D8D8' }}
            >
              {/* 卡片头 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D2D44' }}>{m.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ backgroundColor: focusMeta.color + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: focusMeta.color, fontWeight: '600' }}>{focusMeta.label}</Text>
                    </View>
                    <View style={{ backgroundColor: rec.gradeColor + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: rec.gradeColor, fontWeight: '700' }}>{rec.grade}</Text>
                    </View>
                  </View>
                </View>
                {/* 完成率数字 */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: rec.gradeColor }}>{rec.completionRate}%</Text>
                  <Text style={{ fontSize: 8, color: '#aaa' }}>年度完成率</Text>
                </View>
              </View>

              {/* 进度条（始终显示） */}
              <View style={{ height: 4, backgroundColor: '#F0F0F0' }}>
                <View style={{ width: `${rec.completionRate}%`, height: 4, backgroundColor: rec.gradeColor }} />
              </View>

              {/* 展开详情 */}
              {isOpen && (
                <View style={{ padding: 12, gap: 10 }}>
                  {/* 人员情况 */}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>人员编制到位率</Text>
                      <Text style={{ fontSize: 10, color: rec.staffFillRate >= 95 ? '#2a7a3b' : '#E08030' }}>
                        {rec.staffFillRate}%{rec.staffFillRate < 95 ? '（补员中）' : '（满编）'}
                      </Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: '#EEE', borderRadius: 2 }}>
                      <View style={{ width: `${rec.staffFillRate}%`, height: 4, backgroundColor: rec.staffFillRate >= 95 ? '#2a7a3b' : '#E08030', borderRadius: 2 }} />
                    </View>
                  </View>

                  {/* 年度工作完成情况 */}
                  <View style={{ backgroundColor: '#F5F4F1', padding: 10, gap: 6 }}>
                    <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>第 {currentYear} 年度工作报告摘要</Text>
                    <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
                      {rec.completionRate >= 85
                        ? `${m.name}本年度超额完成各项工作指标，在${focusMeta.label}方面表现突出，获联邦内阁年度通报表扬。`
                        : rec.completionRate >= 70
                        ? `${m.name}本年度基本完成工作任务，${focusMeta.label}指标稳中有升，整体运行有序。`
                        : rec.completionRate >= 55
                        ? `${m.name}本年度完成主要指标，但${focusMeta.label}方面仍有提升空间，需加强工作部署。`
                        : `${m.name}本年度部分核心指标未达预期，在${focusMeta.label}上存在明显短板，联邦内阁已要求整改。`
                      }
                    </Text>
                  </View>

                  {/* 提示：只读 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: '#aaa' }}>ℹ️ 副总理以上级别不直接兼管部委，如需干预请通过总理办公室下达指示</Text>
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── 科技委内嵌数据 ─────────────────────────────────────────────────────
const SCITECH_DIRS = [
  { id: 'ai',      icon: '🤖', name: '人工智能与大数据',   cost: 500,  merit: 20, gdpD: 3, bizD: 4, ecoD: 0 },
  { id: 'space',   icon: '🚀', name: '航天与深空探测',     cost: 800,  merit: 30, gdpD: 2, bizD: 2, ecoD: 0 },
  { id: 'bio',     icon: '🧬', name: '生物医药与生命科学', cost: 400,  merit: 18, gdpD: 1, bizD: 2, ecoD: 2 },
  { id: 'energy',  icon: '⚡', name: '新能源与氢能技术',   cost: 350,  merit: 16, gdpD: 2, bizD: 1, ecoD: 5 },
  { id: 'chip',    icon: '💻', name: '芯片与集成电路',     cost: 600,  merit: 25, gdpD: 4, bizD: 3, ecoD: 0 },
  { id: 'quantum', icon: '⚛️', name: '量子科技',           cost: 700,  merit: 28, gdpD: 2, bizD: 2, ecoD: 0 },
];

const CORRUPT_CHARGES = [
  '涉嫌违规收受礼品', '滥用职权干预工程项目', '违规使用公款消费',
  '在下属企业违规持股', '利用职权为亲属谋利', '收受贿赂批准违规项目',
  '私设"小金库"挪用公款', '违规插手干预司法案件',
];

// 部委施政 / 科技委 每次花费：1000万~3000万随机（万元为单位）
function randomMinistryCost(): number {
  return (1000 + Math.floor(Math.random() * 2001)) * 10_000; // 万 → 元
}

// 施政冷却：60游戏天（约2个月）
const MINISTRY_POLICY_CD = 60;

export default function MinistryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [daysLeft, setDaysLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<MinTab>('policy');
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  // 重要工作事项冷却追踪（key -> 最近执行游戏天）
  const [eventLastDays, setEventLastDays] = useState<Record<EventKey, number>>({} as Record<EventKey, number>);
  const [actingEvent, setActingEvent] = useState<EventKey | null>(null);
  // 施政命令 CD：记录上次施政的游戏天（60天CD）
  const [policyLastDay, setPolicyLastDay] = useState<number>(0);
  // 科技委 CD：记录上次投入的游戏天（60天CD）
  const [sciTechLastDay, setSciTechLastDay] = useState<number>(0);
  // 纪检委：真实下属数据 + 已处理案件
  const [discSubs, setDiscSubs] = useState<Subordinate[]>([]);
  const [discHandled, setDiscHandled] = useState<Set<string>>(new Set());
  const [discLoading, setDiscLoading] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    const rotateDay = save.lastMinistryRotateDay ?? 0;
    const remaining = Math.max(0, 365 - (save.gameDays - rotateDay));
    setDaysLeft(remaining);
    // 纪检委切换时加载下属
    if (activeTab === 'discipline') {
      setDiscLoading(true);
      getAllSubordinates(save.id).then(list => {
        setDiscSubs(list);
        setDiscLoading(false);
      });
    }
  }, [save, activeTab]));

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#C82829" /></View>;
  }
  if (save.rankLevel < 12) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至内阁部长级（级别12）后解锁此页面</Text>
      </View>
    );
  }

  // ── rank13+（副总理以上）：只读查看各部委年度工作情况 ──
  if (save.rankLevel >= 13) {
    return <MinistryReadonlyView save={save} router={router} />;
  }

  const ministryName = save.cityName || '联邦内阁部委';
  const foundMinistry = MINISTRY_POOL.find(m => m.name === ministryName);
  const ministryInfo = foundMinistry ?? { name: ministryName, focus: 'GDP经济' as 'GDP经济', emoji: '🏛️' as '🏛️' };
  const policiesForMinistry = NATIONAL_POLICIES[ministryInfo.focus] ?? NATIONAL_POLICIES['GDP经济'];
  const officesForMinistry = MINISTRY_OFFICES[ministryInfo.focus] ?? MINISTRY_OFFICES['GDP经济'];

  // 国家级五大指标（复用城市指标字段）
  const nationalIndices = [
    { key: 'gdp', value: save.cityGdp },
    { key: 'livelihood', value: save.cityLivelihood },
    { key: 'ecology', value: save.cityEcology },
    { key: 'business', value: save.cityBusiness },
    { key: 'security', value: save.securityIndex },
  ] as { key: keyof typeof INDEX_LABEL; value: number }[];

  // 施政后同步更新 DEPT_CD 打标，供首页"本月未施政"检测使用
  const markMinistryPolicy = (currentKpiStr: string, gameDays: number): string => {
    const DEPT_CD_MARKER = '|DEPT_CD:';
    const COOP_CD_MARKER = '|COOP_CD:';
    // 提取并保留 AUTO:1 前缀（始终放在最前）
    const autoPrefix = currentKpiStr.includes('|AUTO:1') ? '|AUTO:1' : '';
    let base = (currentKpiStr ?? '').replace(/\|AUTO:1/g, '');
    let coopDay = 0;
    // 提取并保留原有 COOP_CD
    if (base.includes(COOP_CD_MARKER)) {
      const coopStr = base.slice(base.indexOf(COOP_CD_MARKER) + COOP_CD_MARKER.length).split('|')[0];
      coopDay = parseInt(coopStr, 10) || 0;
    }
    // 提取原有 DEPT_CD 并更新 ministry_policy key
    let cd: Record<string, number> = {};
    if (base.includes(DEPT_CD_MARKER)) {
      try {
        const cdStr = base.slice(base.indexOf(DEPT_CD_MARKER) + DEPT_CD_MARKER.length).split('|')[0];
        cd = JSON.parse(cdStr) as Record<string, number>;
      } catch {}
    }
    cd['ministry_policy'] = gameDays;
    // 清除旧段，重建
    for (const marker of [DEPT_CD_MARKER, COOP_CD_MARKER]) {
      if (base.includes(marker)) base = base.slice(0, base.indexOf(marker));
    }
    return autoPrefix + base + `${DEPT_CD_MARKER}${JSON.stringify(cd)}${COOP_CD_MARKER}${coopDay}`;
  };

  const handleExecutePolicy = async (policy: typeof policiesForMinistry[0]) => {
    if (acting) return;
    // 60天施政冷却检查
    const cdRemaining = MINISTRY_POLICY_CD - (save.gameDays - policyLastDay);
    if (policyLastDay > 0 && cdRemaining > 0) {
      setResult(`⏳ 施政冷却中，还需 ${cdRemaining} 天（约${Math.ceil(cdRemaining / 30)}个月）`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    // 随机1000万~3000万花费
    const cost = randomMinistryCost();
    if (save.fundBalance < cost) {
      setResult(`⚠️ 专项经费不足，本次需 ¥${formatMoney(cost)}`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    const MERIT_REWARD = 200;
    const updates: Partial<Parameters<typeof updateGameSave>[0]> = {
      fundBalance: save.fundBalance - cost,
      meritPoints: save.meritPoints + MERIT_REWARD,
    };
    if (policy.effect.gdp) updates.cityGdp = Math.min(100, save.cityGdp + policy.effect.gdp);
    if (policy.effect.livelihood) updates.cityLivelihood = Math.min(100, save.cityLivelihood + policy.effect.livelihood);
    if (policy.effect.ecology) updates.cityEcology = Math.min(100, save.cityEcology + policy.effect.ecology);
    if (policy.effect.business) updates.cityBusiness = Math.min(100, save.cityBusiness + policy.effect.business);
    if (policy.effect.security) updates.securityIndex = Math.min(100, save.securityIndex + policy.effect.security);
    updates.kpiRankingResult = markMinistryPolicy(save.kpiRankingResult ?? '', save.gameDays);
    try {
      await updateGameSave(updates);
      setPolicyLastDay(save.gameDays);
      const policyMsg = `✅ 已颁布《${policy.label}》· 花费 ¥${formatMoney(cost)} · 政绩 +${MERIT_REWARD}`;
      await saveResult('ministry_policy_' + policy.id, { ok: true, desc: policyMsg, day: save.gameDays });
      setResult(policyMsg);
      setTimeout(() => setResult(''), 3000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActing(false);
    }
  };

  const handleExecuteEvent = async (ev: typeof MINISTRY_EVENTS[number]) => {
    if (!save || actingEvent) return;
    const lastDay = eventLastDays[ev.key] ?? -1;
    const remaining = ev.cooldownDays - (save.gameDays - lastDay);
    if (remaining > 0 && lastDay >= 0) {
      setResult(`⏳ 冷却中，还需 ${remaining} 天`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    if (ev.cost > 0 && save.fundBalance < ev.cost) {
      setResult('⚠️ 专项经费不足');
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActingEvent(ev.key);
    const updates: Partial<Parameters<typeof updateGameSave>[0]> = {
      meritPoints: save.meritPoints + ev.meritReward,
      bossFavor: Math.min(100, save.bossFavor + ev.favorReward),
    };
    if (ev.cost > 0) updates.fundBalance = save.fundBalance - ev.cost;
    if ('gdp' in ev.effects && ev.effects.gdp) updates.cityGdp = Math.min(100, save.cityGdp + ev.effects.gdp);
    if ('livelihood' in ev.effects && ev.effects.livelihood) updates.cityLivelihood = Math.min(100, save.cityLivelihood + ev.effects.livelihood);
    if ('ecology' in ev.effects && ev.effects.ecology) updates.cityEcology = Math.min(100, save.cityEcology + ev.effects.ecology);
    if ('business' in ev.effects && ev.effects.business) updates.cityBusiness = Math.min(100, save.cityBusiness + ev.effects.business);
    if ('security' in ev.effects && ev.effects.security) updates.securityIndex = Math.min(100, save.securityIndex + ev.effects.security);
    updates.kpiRankingResult = markMinistryPolicy(save.kpiRankingResult ?? '', save.gameDays);
    try {
      await updateGameSave(updates);
      setEventLastDays(prev => ({ ...prev, [ev.key]: save.gameDays }));
      const costText = ev.cost > 0 ? ` · 经费-${ev.cost}万` : '';
      const evMsg = `✅ 完成【${ev.title}】，政绩+${ev.meritReward}，上司好感+${ev.favorReward}${costText}`;
      await saveResult('ministry_event_' + ev.key, { ok: true, desc: evMsg, day: save.gameDays });
      setResult(evMsg);
      setTimeout(() => setResult(''), 4000);
    } catch {
      setResult('操作失败，请稍后重试');
      setTimeout(() => setResult(''), 3000);
    } finally {
      setActingEvent(null);
    }
  };
  const allMinistryStaff = officesForMinistry.flatMap(o => o.staff);
  const headCount   = allMinistryStaff.filter(s => s.level === 'head').length;
  const deputyCount = allMinistryStaff.filter(s => s.level === 'deputy').length;
  const staffCount  = allMinistryStaff.filter(s => s.level === 'staff').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F4F0' }} contentInsetAdjustmentBehavior="automatic">
      <StatusBar style="light" backgroundColor="#0D1F35" />
      {/* 页眉 */}
      <View style={{ backgroundColor: '#0D1F35', padding: 18, paddingTop: insets.top + 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 }}>联邦内阁 · 部委治国</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Text style={{ fontSize: 32 }}>{ministryInfo.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>{ministryName}</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 12, marginTop: 2 }}>
              {save.playerName}  ·  {ministryName}部长  ·  任期第 {save.tenureYears} 年
            </Text>
          </View>
          {/* 返回主页 */}
          <Pressable
            onPress={() => router.replace('/(app)/home')}
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🏠 主页</Text>
          </Pressable>
        </View>
        {/* 部委轮换倒计时 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)', padding: 10 }}>
          <Text style={{ color: '#ffcc80', fontSize: 12 }}>🔄 部委轮换倒计时：</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{daysLeft} 天</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 10, marginLeft: 'auto' }}>轮换后继续积累政绩</Text>
        </View>
      </View>

      {/* 资金余额 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: '#2B4B6F', borderBottomWidth: 3, borderBottomColor: '#C82829' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>专项经费余额</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 16, marginTop: 2 }}>
            {formatFund(save.fundBalance)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>本届政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{save.meritPoints}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>晋升所需</Text>
          <Text style={{ color: '#FF8A65', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{save.requiredMerit}</Text>
        </View>
      </View>

      {/* 全国五大指标 */}
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginBottom: 2 }}>全国发展指标</Text>
        {nationalIndices.map(({ key, value }) => (
          <View key={key}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{INDEX_LABEL[key]}</Text>
              <Text style={{ fontSize: 12, color: INDEX_COLOR[key], fontWeight: '700' }}>{value.toFixed(1)}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3 }}>
              <View style={{ width: `${value}%`, height: 6, backgroundColor: INDEX_COLOR[key], borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>

      {/* 分割线 */}
      <View style={{ height: 1, backgroundColor: '#D0D0C8', marginHorizontal: 14 }} />

      {/* 标签切换 */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#D0D0C8', marginHorizontal: 14, marginTop: 10 }}>
        {(([
          { key: 'policy',           label: '施政命令',      paths: ['government', ''] },
          { key: 'events',           label: '重要工作',      paths: ['government', ''] },
          { key: 'building',         label: '部委大楼',      paths: ['government', ''] },
          { key: 'staff',            label: '部委人员',      paths: ['government', ''] },
          { key: 'scitech',          label: '🔬 科技委',     paths: ['government', ''] },
          { key: 'discipline',       label: '⚖️ 纪检委',    paths: ['government', ''] },
          { key: 'path-discipline',  label: '🔍 肃宪专权',  paths: ['discipline'] },
          { key: 'path-party',       label: '🎖️ 党务专权',  paths: ['party'] },
          { key: 'path-league',      label: '🏛️ 人事专权',  paths: ['league'] },
        ] as { key: MinTab; label: string; paths: string[] }[])
          // 仅显示与当前路线匹配的 tab（government 路线或空路线 → 原有 6 个 tab；非 government → 3 个通用 + 1 路线专属）
          .filter(t => {
            const cp = save.careerPath || 'government';
            if (cp === 'government') return t.paths.includes('government') || t.paths.includes('');
            // 非行政路线：隐藏 government 专属的 policy/events/building/staff/scitech/discipline，改用路线专属 tab
            const common = ['events', 'building', 'staff'] as string[];
            if (common.includes(t.key)) return true;
            if (t.key === `path-${cp}`) return true;
            return false;
          })
        ).map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: activeTab === tab.key ? 2 : 0,
              borderBottomColor: tab.key.startsWith('path-') ? '#8B0A1A' : '#C82829',
              marginBottom: -2,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: activeTab === tab.key ? '700' : '400', color: activeTab === tab.key ? (tab.key.startsWith('path-') ? '#8B0A1A' : '#C82829') : '#777' }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── 施政命令 ── */}
      {activeTab === 'policy' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 部长/副部长分化说明 */}
          <View style={{ backgroundColor: '#0D1F35', padding: 12, gap: 6 }}>
            <Text style={{ color: 'rgba(160,180,204,0.65)', fontSize: 9, letterSpacing: 2 }}>内阁部委 · 职级分工</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 8 }}>
                <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>🏛️ 部长（全管）</Text>
                <Text style={{ color: 'rgba(180,210,255,0.8)', fontSize: 9, marginTop: 2 }}>统管全部施政领域</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', padding: 8 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, fontWeight: '700' }}>📋 副部长（分管）</Text>
                <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, marginTop: 2 }}>各副部长只负责单一领域</Text>
              </View>
            </View>
          </View>
          {/* CD状态与费用说明 */}
          {(() => {
            const cdRemaining = MINISTRY_POLICY_CD - (save.gameDays - policyLastDay);
            const inCD = policyLastDay > 0 && cdRemaining > 0;
            return inCD ? (
              <View style={{ backgroundColor: '#FFF5E6', borderWidth: 1, borderColor: '#E0A060', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>⏳</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: '#7B4400', fontWeight: '700' }}>施政冷却中</Text>
                  <Text style={{ fontSize: 10, color: '#7B4400', marginTop: 2 }}>距下次施政还需 <Text style={{ fontWeight: '700' }}>{cdRemaining} 天</Text>（约{Math.ceil(cdRemaining / 30)}个月）</Text>
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#66BB6A', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>✅</Text>
                <Text style={{ fontSize: 10, color: '#1B5E20', flex: 1 }}>可以颁布施政命令 · 花费 <Text style={{ fontWeight: '700' }}>1000万~3000万</Text>（随机）· 每60天一次</Text>
              </View>
            );
          })()}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>施政重点：{ministryInfo.focus}</Text>
            <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>共 {policiesForMinistry.length} 项政策</Text>
            </View>
          </View>
          {policiesForMinistry.map(policy => {
            const cdRemaining = MINISTRY_POLICY_CD - (save.gameDays - policyLastDay);
            const inCD = policyLastDay > 0 && cdRemaining > 0;
            const canAct = !inCD && save.fundBalance >= 10_000_000; // 至少1000万起步
            return (
              <View key={policy.id} style={{ borderWidth: 1, borderColor: inCD ? '#E0E0E0' : '#D1D1CF', backgroundColor: inCD ? '#FAFAFA' : '#fff' }}>
                <View style={{ padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: inCD ? '#aaa' : '#1D2D44', flex: 1 }}>{policy.label}</Text>
                    <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                      <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '600' }}>政绩 +200</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{policy.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#7B5E2A' }}>花费：1000万~3000万（随机）</Text>
                    </View>
                    {Object.entries(policy.effect).map(([k, v]) => (
                      <View key={k} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{INDEX_LABEL[k as keyof typeof INDEX_LABEL]} +{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Pressable
                  onPress={() => void handleExecutePolicy(policy)}
                  disabled={!canAct || acting}
                  style={{ backgroundColor: inCD ? '#9E9E9E' : canAct ? '#C82829' : '#ccc', paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    {acting ? '颁布中…' : inCD ? `⏳ 冷却中（${cdRemaining}天）` : canAct ? '▶ 颁布政令（1000-3000万）' : '⚠️ 经费不足'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 部委大楼 ── */}
      {activeTab === 'building' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 大楼概况 */}
          <View style={{ backgroundColor: '#0D1F35', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 28 }}>🏛️</Text>
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{ministryName}办公大楼</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11 }}>京都市西城区 · 联邦内阁部委区</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '建筑面积', value: '3.2万㎡' },
                { label: '楼层', value: '18层' },
                { label: '启用年份', value: '2003年' },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{item.label}</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 2 }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 下设办公室 */}
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginTop: 4 }}>下设机构</Text>
          {officesForMinistry.map((office, i) => (
            <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 6, paddingVertical: 3, marginTop: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9 }}>{office.headTitle}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                  <Text style={{ fontSize: 11, color: '#777', marginTop: 3, lineHeight: 16 }}>{office.duty}</Text>
                </View>
                {/* 机构人数（随机模拟编制规模）*/}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>{20 + i * 8}人</Text>
                  <Text style={{ fontSize: 9, color: '#aaa' }}>编制</Text>
                </View>
              </View>
            </View>
          ))}

          {/* 配套设施 */}
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginTop: 4 }}>配套设施</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['🏟️ 大会议室', '📚 资料室', '🖥️ 信息中心', '🍽️ 食堂', '🚗 公务车队', '🏋️ 职工活动室'].map(item => (
              <View key={item} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, color: '#555' }}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 当前任命档案 */}
          <View style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff', padding: 12, gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>当前任命档案</Text>
            <Text style={{ fontSize: 12, color: '#333' }}>任命部委：<Text style={{ fontWeight: '700', color: '#2B4B6F' }}>{ministryName}</Text></Text>
            <Text style={{ fontSize: 12, color: '#333' }}>任命日期：<Text style={{ color: '#555' }}>{gameDaysToDate(save.lastMinistryRotateDay || save.lastRankDay)}</Text></Text>
            <Text style={{ fontSize: 12, color: '#333' }}>施政重点：<Text style={{ color: '#555' }}>{ministryInfo.focus}</Text></Text>
            <Text style={{ fontSize: 12, color: '#C82829' }}>距下次轮换：<Text style={{ fontWeight: '700' }}>{daysLeft} 天</Text></Text>
          </View>
        </View>
      )}

      {/* ── 重要工作 ── */}
      {activeTab === 'events' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#E8EAF6', borderWidth: 1, borderColor: '#9FA8DA', padding: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: '#283593', fontWeight: '700', marginBottom: 2 }}>📌 部长级重要工作事项</Text>
            <Text style={{ fontSize: 11, color: '#333', lineHeight: 17 }}>
              以下为部长级核心职务工作，每项有独立冷却周期。完成后获得政绩、上司好感及指标加成，是区别于施政命令的高层次活动。
            </Text>
          </View>

          {MINISTRY_EVENTS.map(ev => {
            const lastDay = eventLastDays[ev.key] ?? -1;
            const cooldownRemaining = lastDay >= 0 ? Math.max(0, ev.cooldownDays - (save.gameDays - lastDay)) : 0;
            const isReady = cooldownRemaining === 0;
            const canAfford = ev.cost === 0 || save.fundBalance >= ev.cost;
            const isActing = actingEvent === ev.key;

            return (
              <View key={ev.key} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isReady ? '#9FA8DA' : '#DDD', overflow: 'hidden' }}>
                {/* 头部 */}
                <View style={{ backgroundColor: isReady ? '#E8EAF6' : '#F5F5F5', padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{ev.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{ev.title}</Text>
                        <View style={{ backgroundColor: ev.badgeColor + '22', borderWidth: 1, borderColor: ev.badgeColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: ev.badgeColor, fontWeight: '700' }}>{ev.badge}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ev.subtitle}</Text>
                    </View>
                    {/* 奖励信息 */}
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={{ fontSize: 12, color: '#7B5E2A', fontWeight: '700' }}>政绩 +{ev.meritReward}</Text>
                      <Text style={{ fontSize: 10, color: '#2a7a3b' }}>好感 +{ev.favorReward}</Text>
                      {ev.cost > 0 && <Text style={{ fontSize: 10, color: '#C82829' }}>费用 -{ev.cost}万</Text>}
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginTop: 4 }}>{ev.desc}</Text>

                  {/* 指标效果 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                    {Object.entries(ev.effects).map(([k, v]) => v ? (
                      <View key={k} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: INDEX_COLOR[k as keyof typeof INDEX_COLOR] ?? '#555' }}>
                          {INDEX_LABEL[k as keyof typeof INDEX_LABEL] ?? k} +{v}
                        </Text>
                      </View>
                    ) : null)}
                  </View>

                  {/* 冷却状态 */}
                  {!isReady && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{ flex: 1, height: 4, backgroundColor: '#E0E0E0' }}>
                        <View style={{
                          height: 4,
                          backgroundColor: '#7986CB',
                          width: `${((ev.cooldownDays - cooldownRemaining) / ev.cooldownDays) * 100}%`,
                        }} />
                      </View>
                      <Text style={{ fontSize: 10, color: '#888' }}>冷却剩余 {cooldownRemaining} 天</Text>
                    </View>
                  )}
                </View>

                {/* 执行按钮 */}
                <Pressable
                  onPress={() => void handleExecuteEvent(ev)}
                  disabled={!isReady || !canAfford || !!actingEvent}
                  style={{ backgroundColor: !isReady ? '#9E9E9E' : !canAfford ? '#E57373' : '#3949AB', paddingVertical: 10, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  {isActing
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                        {!isReady ? `⏳ 冷却中（${cooldownRemaining}天）` : !canAfford ? '经费不足' : `▶ 执行此项工作`}
                      </Text>
                  }
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 部委人员 ── */}
      {activeTab === 'staff' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 部长/副部长职级分化说明 */}
          <View style={{ backgroundColor: '#0D1F35', padding: 12, gap: 8 }}>
            <Text style={{ color: 'rgba(160,180,204,0.6)', fontSize: 9, letterSpacing: 2 }}>内阁部委 · 领导职级分工</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(200,40,41,0.15)', borderWidth: 1, borderColor: 'rgba(200,40,41,0.4)', padding: 10 }}>
                <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>🏛️ 部长</Text>
                <Text style={{ color: 'rgba(180,210,255,0.8)', fontSize: 9, marginTop: 3, lineHeight: 14 }}>
                  统管本部委全部施政领域{'\n'}主持部务委员会
                </Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(43,75,111,0.3)', borderWidth: 1, borderColor: 'rgba(43,75,111,0.5)', padding: 10 }}>
                <Text style={{ color: '#a0c4ff', fontSize: 11, fontWeight: '700' }}>📋 副部长</Text>
                <Text style={{ color: 'rgba(160,180,204,0.8)', fontSize: 9, marginTop: 3, lineHeight: 14 }}>
                  各副部长只分管单一领域{'\n'}向部长负责汇报
                </Text>
              </View>
            </View>
          </View>
          {/* 人员统计 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '司/处级正职', count: headCount, color: '#C82829' },
              { label: '司/处级副职', count: deputyCount, color: '#2B4B6F' },
              { label: '科员及以下', count: staffCount, color: '#7B5E2A' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: item.color }}>{item.count}</Text>
                <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>各机构在岗人员</Text>

          {/* 各办公室展开列表 */}
          {officesForMinistry.map((office) => {
            const isExpanded = expandedOffice === office.name;
            return (
              <View key={office.name} style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff' }}>
                {/* 机构行（可点击展开） */}
                <Pressable
                  onPress={() => setExpandedOffice(isExpanded ? null : office.name)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}
                >
                  <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 9 }}>{office.headTitle}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{office.duty}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>{office.staff.length} 人</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{isExpanded ? '▲ 收起' : '▼ 展开'}</Text>
                  </View>
                </Pressable>

                {/* 展开：人员明细 */}
                {isExpanded && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F0EEEA' }}>
                    {office.staff.map((s, si) => {
                      const levelColor = s.level === 'head' ? '#C82829' : s.level === 'deputy' ? '#2B4B6F' : '#7B5E2A';
                      const levelLabel = s.level === 'head' ? '正职' : s.level === 'deputy' ? '副职' : '科员';
                      return (
                        <View key={si} style={{
                          flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8,
                          borderBottomWidth: si < office.staff.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5',
                          backgroundColor: si % 2 === 0 ? '#FAFAFA' : '#fff',
                        }}>
                          <View style={{ backgroundColor: levelColor, paddingHorizontal: 5, paddingVertical: 2, minWidth: 30, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{levelLabel}</Text>
                          </View>
                          <Text style={{ flex: 1, fontSize: 13, color: '#222', fontWeight: '600' }}>{s.name}</Text>
                          <Text style={{ fontSize: 11, color: '#888' }}>{s.title}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
            以上人员为部委独立编制，由组织部统一调配，独立于您的个人班底
          </Text>
        </View>
      )}

      {/* ── 科技委 Tab ── */}
      {activeTab === 'scitech' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 标题栏 */}
          <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
            <Text style={{ color: 'rgba(180,210,255,0.6)', fontSize: 9, letterSpacing: 2 }}>国家科学技术委员会</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🔬 科技战略投入</Text>
            <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              确定科研方向，拨付专项科研经费，推动核心技术攻关与成果转化。
            </Text>
          </View>
          {/* 统计数据 */}
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', padding: 12, gap: 10 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 9 }}>科技投入总额</Text>
              <Text style={{ color: '#2B4B6F', fontWeight: '700', fontSize: 14 }}>¥{formatMoney(save.sciTechInvestTotal ?? 0)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#EEE' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 9 }}>专项经费</Text>
              <Text style={{ color: '#C82829', fontWeight: '700', fontSize: 14 }}>¥{formatMoney(save.fundBalance)}</Text>
            </View>
          </View>
          {/* 冷却/可用状态 */}
          {(() => {
            const cdRem = MINISTRY_POLICY_CD - (save.gameDays - sciTechLastDay);
            const inCD = sciTechLastDay > 0 && cdRem > 0;
            return inCD ? (
              <View style={{ backgroundColor: '#FFF5E6', borderWidth: 1, borderColor: '#E0A060', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>⏳</Text>
                <Text style={{ fontSize: 10, color: '#7B4400', flex: 1 }}>科技经费冷却中，距下次还需 <Text style={{ fontWeight: '700' }}>{cdRem} 天</Text>（约{Math.ceil(cdRem / 30)}个月）</Text>
              </View>
            ) : (
              <View style={{ backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#66BB6A', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 14 }}>✅</Text>
                <Text style={{ fontSize: 10, color: '#1B5E20', flex: 1 }}>可拨付科研经费 · 花费 <Text style={{ fontWeight: '700' }}>1000万~3000万</Text>（随机）· 每60天一次</Text>
              </View>
            );
          })()}
          {/* 科技方向列表 */}
          {SCITECH_DIRS.map(dir => {
            const cdRem = MINISTRY_POLICY_CD - (save.gameDays - sciTechLastDay);
            const inCD = sciTechLastDay > 0 && cdRem > 0;
            const canAct = !acting && !inCD && save.fundBalance >= 10_000_000;
            return (
              <View key={dir.id} style={{ backgroundColor: inCD ? '#FAFAFA' : '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                <View style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22 }}>{dir.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: inCD ? '#aaa' : '#1D2D44' }}>{dir.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#7B5E2A' }}>花费：1000万~3000万（随机）</Text>
                      </View>
                      <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2a7a3b' }}>政绩+{dir.merit}</Text>
                      </View>
                      {dir.gdpD > 0 && <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#7B5E2A' }}>GDP+{dir.gdpD}</Text></View>}
                      {dir.bizD > 0 && <View style={{ backgroundColor: '#F0F8FF', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#1565C0' }}>营商+{dir.bizD}</Text></View>}
                      {dir.ecoD > 0 && <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#2a7a3b' }}>生态+{dir.ecoD}</Text></View>}
                    </View>
                  </View>
                </View>
                <Pressable
                  disabled={!canAct}
                  onPress={async () => {
                    if (!canAct) return;
                    const cost = randomMinistryCost();
                    if (save.fundBalance < cost) {
                      setResult(`⚠️ 经费不足，本次需 ¥${formatMoney(cost)}`);
                      setTimeout(() => setResult(''), 2500);
                      return;
                    }
                    setActing(true);
                    try {
                      await updateGameSave({
                        fundBalance: save.fundBalance - cost,
                        meritPoints: save.meritPoints + dir.merit,
                        cityGdp: Math.min(100, (save.cityGdp ?? 0) + dir.gdpD),
                        cityBusiness: Math.min(100, (save.cityBusiness ?? 0) + dir.bizD),
                        cityEcology: Math.min(100, (save.cityEcology ?? 0) + dir.ecoD),
                        sciTechInvestTotal: (save.sciTechInvestTotal ?? 0) + cost,
                      });
                      setSciTechLastDay(save.gameDays);
                      setResult(`✅ 已投入${dir.name}研究 · 花费¥${formatMoney(cost)} · 政绩+${dir.merit}`);
                      setTimeout(() => setResult(''), 3000);
                    } catch {
                      setResult('操作失败，请稍后重试');
                      setTimeout(() => setResult(''), 3000);
                    } finally {
                      setActing(false);
                    }
                  }}
                  style={{ backgroundColor: inCD ? '#9E9E9E' : canAct ? '#2B4B6F' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {inCD ? `⏳ 冷却中（${cdRem}天）` : canAct ? '▶ 拨付科研经费（1000-3000万）' : '⚠️ 经费不足'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 纪检委 Tab（真实下属数据） ── */}
      {activeTab === 'discipline' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 标题 */}
          <View style={{ backgroundColor: '#2D1A00', padding: 14 }}>
            <Text style={{ color: 'rgba(255,210,150,0.6)', fontSize: 9, letterSpacing: 2 }}>中央纪律检查委员会</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>⚖️ 反腐纠风行动</Text>
            <Text style={{ color: 'rgba(255,210,150,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              对廉洁指数低的下属干部开展纪律审查，维护党纪国法，筑牢廉政防线。
            </Text>
          </View>
          {/* 说明栏 */}
          <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#E0C87A', padding: 10, flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontSize: 11 }}>📋</Text>
            <Text style={{ fontSize: 10, color: '#7B5E2A', flex: 1 }}>
              以下名单来自你的真实下属档案，廉洁值低于60者列为重点监察对象。
              立案可获得政绩+30、廉洁值+3；诫勉获政绩+10。
            </Text>
          </View>
          {/* 加载状态 */}
          {discLoading && (
            <View style={{ alignItems: 'center', paddingVertical: 20 }}>
              <ActivityIndicator size="small" color="#2D1A00" />
              <Text style={{ color: '#888', fontSize: 11, marginTop: 8 }}>正在读取下属档案…</Text>
            </View>
          )}
          {/* 无数据 */}
          {!discLoading && discSubs.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Text style={{ fontSize: 24 }}>✅</Text>
              <Text style={{ fontSize: 14, color: '#2a7a3b', fontWeight: '700', marginTop: 8 }}>暂无下属档案</Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>当前名下无可审查干部</Text>
            </View>
          )}
          {/* 真实下属列表 - 按廉洁值升序（最低=最需监察） */}
          {!discLoading && [...discSubs]
            .sort((a, b) => a.integrity - b.integrity)
            .slice(0, 12)
            .map(sub => {
              const integrityLevel = sub.integrity < 40 ? '严重风险' : sub.integrity < 60 ? '存在风险' : '基本廉洁';
              const integrityColor = sub.integrity < 40 ? '#8B0000' : sub.integrity < 60 ? '#C82829' : '#2a7a3b';
              const chargeIdx = Math.abs(sub.name.charCodeAt(0) + sub.integrity) % CORRUPT_CHARGES.length;
              const charge = sub.integrity < 60 ? CORRUPT_CHARGES[chargeIdx] : '暂无问题线索';
              const levelLabel = ['','科员','副科','正科','副处','正处','副厅','正厅','副部','正部','副国','正国','内阁委员','常委','总理'][sub.subLevel] ?? `${sub.subLevel}级`;
              const isHandled = discHandled.has(sub.id);
              return (
                <View key={sub.id} style={{ backgroundColor: isHandled ? '#F5F5F5' : '#fff', borderWidth: 1, borderColor: isHandled ? '#E0E0E0' : '#D0D0D0', overflow: 'hidden', opacity: isHandled ? 0.7 : 1 }}>
                  <View style={{ padding: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>
                          {sub.name}
                          <Text style={{ fontSize: 10, color: '#888', fontWeight: '400' }}> · {levelLabel} · {sub.position}</Text>
                        </Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>
                          派系：{sub.faction ?? '无派'} · 能力{sub.ability} · 忠诚{sub.loyalty}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: integrityColor, paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{integrityLevel}</Text>
                      </View>
                    </View>
                    {/* 廉洁度条 */}
                    <View style={{ height: 4, backgroundColor: '#EEE', marginTop: 2 }}>
                      <View style={{ height: 4, width: `${sub.integrity}%`, backgroundColor: integrityColor }} />
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 9, color: integrityColor, fontWeight: '600' }}>廉洁值：{sub.integrity}/100</Text>
                      {sub.integrity < 60 && <Text style={{ fontSize: 9, color: '#888' }}>线索：{charge}</Text>}
                    </View>
                  </View>
                  {!isHandled && (
                    <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                      <Pressable
                        disabled={acting}
                        onPress={async () => {
                          setActing(true);
                          try {
                            await Promise.all([
                              assessSubordinate(sub.id, save.gameDays, -3, -5, 8, 0),
                              updateGameSave({ meritPoints: save.meritPoints + 30, moralValue: Math.min(100, (save.moralValue ?? 50) + 3) }),
                            ]);
                            setDiscHandled(prev => new Set(prev).add(sub.id));
                            setResult(`✅ 已对${sub.name}立案调查，政绩+30，廉洁+3`);
                            setTimeout(() => setResult(''), 2500);
                          } catch { setResult('操作失败，请稍后重试'); } finally { setActing(false); }
                        }}
                        style={{ flex: 2, paddingVertical: 10, alignItems: 'center', backgroundColor: '#2D1A00' }}
                      >
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>🔍 立案调查</Text>
                      </Pressable>
                      <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
                      <Pressable
                        disabled={acting}
                        onPress={async () => {
                          setActing(true);
                          try {
                            await Promise.all([
                              assessSubordinate(sub.id, save.gameDays, 0, 0, 5, 0),
                              updateGameSave({ meritPoints: save.meritPoints + 10 }),
                            ]);
                            setDiscHandled(prev => new Set(prev).add(sub.id));
                            setResult(`📋 已对${sub.name}予以诫勉谈话，政绩+10`);
                            setTimeout(() => setResult(''), 2500);
                          } catch { setResult('操作失败，请稍后重试'); } finally { setActing(false); }
                        }}
                        style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: '#7B5E2A' }}
                      >
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📋 诫勉</Text>
                      </Pressable>
                    </View>
                  )}
                  {isHandled && (
                    <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: '#EEEEEE' }}>
                      <Text style={{ fontSize: 11, color: '#888' }}>✅ 本次已处理</Text>
                    </View>
                  )}
                </View>
              );
            })
          }
        </View>
      )}


      {/* ── 纪检路线专属：肃宪督察院职权 ── */}
      {activeTab === 'path-discipline' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#1A0A00', padding: 14 }}>
            <Text style={{ color: 'rgba(255,200,120,0.6)', fontSize: 9, letterSpacing: 3 }}>联邦肃宪督察院 · 正部级 · 反腐利剑</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 4 }}>⚖️ 肃宪督察院副书记</Text>
            <Text style={{ color: 'rgba(255,200,120,0.85)', fontSize: 11, marginTop: 6, lineHeight: 18 }}>
              协助肃宪院长主持全国纪检监察工作，统筹督察专项行动，对涉嫌违纪违法案件进行立案审查，向司法机关移送案件，确保党规国法严肃执行。
            </Text>
          </View>
          {([
            { id: 'disc1', icon: '🔍', title: '派驻全国巡视组',      cost: 300, merit: 40, bfav: 2, moral: 0, sec: 5, gdp: 0, biz: 0, liv: 0, desc: '向重点省市派驻中央巡视组，督察地方执行党纪国法情况，形成全国性反腐震慑效应。' },
            { id: 'disc2', icon: '📂', title: '重大案件立案侦查',    cost: 200, merit: 55, bfav: 0, moral: 3, sec: 7, gdp: 0, biz: 0, liv: 0, desc: '对举报线索明确的副厅级以上干部启动立案程序，依规依纪开展审查调查，强化法治权威。' },
            { id: 'disc3', icon: '⚖️', title: '向司法机关移送案件',  cost: 80,  merit: 35, bfav: 1, moral: 0, sec: 4, gdp: 0, biz: 2, liv: 0, desc: '将审查结束的案件依法移送检察机关提起公诉，形成纪法衔接完整链条，提升司法公信力。' },
            { id: 'disc4', icon: '📜', title: '发布廉政白皮书',      cost: 120, merit: 25, bfav: 3, moral: 0, sec: 2, gdp: 0, biz: 3, liv: 2, desc: '汇总年度督察成果，公开发布廉政建设报告，向全社会宣示反腐决心，增强政府公信力。' },
            { id: 'disc5', icon: '🎓', title: '廉政教育培训班',      cost: 150, merit: 20, bfav: 0, moral: 5, sec: 0, gdp: 0, biz: 0, liv: 3, desc: '组织厅局级干部参加廉政教育培训，提升党纪党规意识，以"治未病"思路防腐于未然。' },
            { id: 'disc6', icon: '🤝', title: '国际反腐合作会议',    cost: 200, merit: 30, bfav: 2, moral: 0, sec: 3, gdp: 0, biz: 4, liv: 0, desc: '牵头召开涉外反腐合作会议，追缴境外资产，推动外逃腐败分子引渡归案，彰显国际形象。' },
          ] as { id: string; icon: string; title: string; cost: number; merit: number; bfav: number; moral: number; sec: number; gdp: number; biz: number; liv: number; desc: string }[]).map(action => (
            <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D8C4A0', overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#2D1A00', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{action.title}</Text>
                  <Text style={{ color: 'rgba(255,200,120,0.7)', fontSize: 10, marginTop: 2 }}>经费 ¥{action.cost}万 · 政绩 +{action.merit}</Text>
                </View>
              </View>
              <View style={{ padding: 10, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{action.desc}</Text>
                {/* 多维效果标签 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {action.sec > 0  && <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#D8C4A0' }}><Text style={{ fontSize: 9, color: '#7B3F00' }}>治安 +{action.sec}</Text></View>}
                  {action.gdp > 0  && <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#A8D8B0' }}><Text style={{ fontSize: 9, color: '#1A6B30' }}>GDP +{action.gdp}</Text></View>}
                  {action.biz > 0  && <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#90CAF9' }}><Text style={{ fontSize: 9, color: '#1B4F8A' }}>营商 +{action.biz}</Text></View>}
                  {action.liv > 0  && <View style={{ backgroundColor: '#FCE4EC', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#F48FB1' }}><Text style={{ fontSize: 9, color: '#880E4F' }}>民生 +{action.liv}</Text></View>}
                  {action.moral > 0 && <View style={{ backgroundColor: '#EDE7F6', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#B39DDB' }}><Text style={{ fontSize: 9, color: '#4A148C' }}>道德 +{action.moral}</Text></View>}
                  {action.bfav > 0  && <View style={{ backgroundColor: '#FFF9C4', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FFF176' }}><Text style={{ fontSize: 9, color: '#7B5B00' }}>好感 +{action.bfav}</Text></View>}
                </View>
                <Pressable
                  onPress={async () => {
                    if (acting) return;
                    const cost = action.cost * 10_000;
                    if (save.fundBalance < cost) { setResult('⚠️ 经费不足'); setTimeout(() => setResult(''), 2000); return; }
                    setActing(true);
                    try {
                      await updateGameSave({
                        meritPoints: save.meritPoints + action.merit,
                        fundBalance: save.fundBalance - cost,
                        ...(action.bfav  > 0 ? { bossFavor:       Math.min(100, save.bossFavor       + action.bfav)  } : {}),
                        ...(action.moral > 0 ? { moralValue:      Math.min(100, save.moralValue      + action.moral) } : {}),
                        ...(action.sec   > 0 ? { securityIndex:   Math.min(100, save.securityIndex   + action.sec)   } : {}),
                        ...(action.gdp   > 0 ? { cityGdp:         save.cityGdp         + action.gdp  } : {}),
                        ...(action.biz   > 0 ? { cityBusiness:    Math.min(100, save.cityBusiness    + action.biz)   } : {}),
                        ...(action.liv   > 0 ? { cityLivelihood:  Math.min(100, save.cityLivelihood  + action.liv)   } : {}),
                      });
                      setResult(`✅ 完成【${action.title}】，政绩+${action.merit}`);
                      setTimeout(() => setResult(''), 3000);
                    } catch { setResult('操作失败，请稍后重试'); } finally { setActing(false); }
                  }}
                  style={{ backgroundColor: acting ? '#999' : '#2D1A00', padding: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{acting ? '执行中…' : `⚡ 执行（-¥${action.cost}万）`}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 党务路线专属：执政党中央政务委职权 ── */}
      {activeTab === 'path-party' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#1A0020', padding: 14 }}>
            <Text style={{ color: 'rgba(200,160,255,0.6)', fontSize: 9, letterSpacing: 3 }}>执政党中央政务委 · 正部级 · 党务核心</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 4 }}>🎖️ 联邦政务委员（分管党务）</Text>
            <Text style={{ color: 'rgba(200,160,255,0.85)', fontSize: 11, marginTop: 6, lineHeight: 18 }}>
              分管全国意识形态、党建工作及干部思想政治教育，参与执政党重大路线方针决策讨论，统筹党务系统工作安排，协调宣传、组织系统各级机构。
            </Text>
          </View>
          {([
            { id: 'pty1', icon: '📢', title: '意识形态专项部署',      cost: 150, merit: 35, bfav: 3, moral: 0, sec: 2, gdp: 0, biz: 2, liv: 3, desc: '召集宣传系统工作会议，统一思想方向，强化执政党理论体系在全国各级党政机关的有效传播。' },
            { id: 'pty2', icon: '🗂️', title: '干部任前廉洁审查',      cost: 80,  merit: 25, bfav: 0, moral: 4, sec: 3, gdp: 0, biz: 0, liv: 0, desc: '对拟提拔厅局级干部进行党性、廉洁、能力综合考察，严把干部入口关，防止带病提拔。' },
            { id: 'pty3', icon: '📋', title: '全国党建工作考核',      cost: 120, merit: 30, bfav: 2, moral: 0, sec: 2, gdp: 0, biz: 3, liv: 2, desc: '对各省市党委党建工作开展综合考核，形成排名通报并向社会公示，推动末位整改落实。' },
            { id: 'pty4', icon: '🏛️', title: '主持执政党中央研讨会',  cost: 200, merit: 45, bfav: 4, moral: 0, sec: 0, gdp: 3, biz: 3, liv: 0, desc: '组织召开执政党中央理论研讨会，推进党内民主与集体领导机制建设，凝聚路线共识。' },
            { id: 'pty5', icon: '🎓', title: '党校重点班次招募',      cost: 100, merit: 20, bfav: 0, moral: 3, sec: 0, gdp: 2, biz: 0, liv: 2, desc: '统筹安排全国省部级后备干部参加党校进修，系统强化理论武装、党性修养与执政能力。' },
            { id: 'pty6', icon: '🤝', title: '统战联络工作部署',      cost: 180, merit: 35, bfav: 2, moral: 0, sec: 0, gdp: 2, biz: 4, liv: 3, desc: '协调各民主党派及无党派人士工作，推进多党合作政治协商制度落实，扩大执政社会基础。' },
          ] as { id: string; icon: string; title: string; cost: number; merit: number; bfav: number; moral: number; sec: number; gdp: number; biz: number; liv: number; desc: string }[]).map(action => (
            <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0B8E0', overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#2A0040', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{action.title}</Text>
                  <Text style={{ color: 'rgba(200,160,255,0.7)', fontSize: 10, marginTop: 2 }}>经费 ¥{action.cost}万 · 政绩 +{action.merit}</Text>
                </View>
              </View>
              <View style={{ padding: 10, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{action.desc}</Text>
                {/* 多维效果标签 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {action.sec  > 0 && <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#D8C4A0' }}><Text style={{ fontSize: 9, color: '#7B3F00' }}>治安 +{action.sec}</Text></View>}
                  {action.gdp  > 0 && <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#A8D8B0' }}><Text style={{ fontSize: 9, color: '#1A6B30' }}>GDP +{action.gdp}</Text></View>}
                  {action.biz  > 0 && <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#90CAF9' }}><Text style={{ fontSize: 9, color: '#1B4F8A' }}>营商 +{action.biz}</Text></View>}
                  {action.liv  > 0 && <View style={{ backgroundColor: '#FCE4EC', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#F48FB1' }}><Text style={{ fontSize: 9, color: '#880E4F' }}>民生 +{action.liv}</Text></View>}
                  {action.moral > 0 && <View style={{ backgroundColor: '#EDE7F6', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#B39DDB' }}><Text style={{ fontSize: 9, color: '#4A148C' }}>道德 +{action.moral}</Text></View>}
                  {action.bfav  > 0 && <View style={{ backgroundColor: '#FFF9C4', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FFF176' }}><Text style={{ fontSize: 9, color: '#7B5B00' }}>好感 +{action.bfav}</Text></View>}
                </View>
                <Pressable
                  onPress={async () => {
                    if (acting) return;
                    const cost = action.cost * 10_000;
                    if (save.fundBalance < cost) { setResult('⚠️ 经费不足'); setTimeout(() => setResult(''), 2000); return; }
                    setActing(true);
                    try {
                      await updateGameSave({
                        meritPoints: save.meritPoints + action.merit,
                        fundBalance: save.fundBalance - cost,
                        ...(action.bfav  > 0 ? { bossFavor:       Math.min(100, save.bossFavor       + action.bfav)  } : {}),
                        ...(action.moral > 0 ? { moralValue:      Math.min(100, save.moralValue      + action.moral) } : {}),
                        ...(action.sec   > 0 ? { securityIndex:   Math.min(100, save.securityIndex   + action.sec)   } : {}),
                        ...(action.gdp   > 0 ? { cityGdp:         save.cityGdp         + action.gdp  } : {}),
                        ...(action.biz   > 0 ? { cityBusiness:    Math.min(100, save.cityBusiness    + action.biz)   } : {}),
                        ...(action.liv   > 0 ? { cityLivelihood:  Math.min(100, save.cityLivelihood  + action.liv)   } : {}),
                      });
                      setResult(`✅ 完成【${action.title}】，政绩+${action.merit}`);
                      setTimeout(() => setResult(''), 3000);
                    } catch { setResult('操作失败，请稍后重试'); } finally { setActing(false); }
                  }}
                  style={{ backgroundColor: acting ? '#999' : '#2A0040', padding: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{acting ? '执行中…' : `⚡ 执行（-¥${action.cost}万）`}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 团派路线专属：党政人事院职权 ── */}
      {activeTab === 'path-league' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#001A10', padding: 14 }}>
            <Text style={{ color: 'rgba(120,220,160,0.6)', fontSize: 9, letterSpacing: 3 }}>联邦党政人事院 · 正部级 · 干部枢纽</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16, marginTop: 4 }}>🏛️ 联邦政务委员 / 党政人事院院长</Text>
            <Text style={{ color: 'rgba(120,220,160,0.85)', fontSize: 11, marginTop: 6, lineHeight: 18 }}>
              主持全国干部人事制度改革，统筹党政干部培养选拔、职级评定与考核晋升，协调共青团系统与执政党中央的人才输送渠道，推进干部队伍年轻化建设。
            </Text>
          </View>
          {([
            { id: 'lge1', icon: '📊', title: '全国干部考核排名',      cost: 100, merit: 30, bfav: 3, moral: 0, sec: 0, gdp: 2, biz: 2, liv: 2, desc: '对省部级干部开展综合绩效考核，形成全国干部梯队排名，为精准晋升提供数据支撑。' },
            { id: 'lge2', icon: '🎓', title: '青年干部培养专项',      cost: 150, merit: 35, bfav: 0, moral: 2, sec: 0, gdp: 2, biz: 0, liv: 4, desc: '启动全国青年干部培养计划，在地厅级干部中遴选优秀后备人才挂职锻炼，拓宽晋升通道。' },
            { id: 'lge3', icon: '🔄', title: '干部交流挂职安排',      cost: 80,  merit: 20, bfav: 2, moral: 0, sec: 0, gdp: 3, biz: 3, liv: 2, desc: '统筹跨省跨系统干部交流挂职计划，优化干部地域和行业分布结构，促进经验互通。' },
            { id: 'lge4', icon: '📜', title: '职务职级制度完善',      cost: 200, merit: 45, bfav: 4, moral: 0, sec: 0, gdp: 4, biz: 3, liv: 0, desc: '推进公务员职务与职级并行改革，出台晋升激励制度，增强干部干事动力与政策稳定性。' },
            { id: 'lge5', icon: '🏛️', title: '主持政务院联席会议',    cost: 180, merit: 35, bfav: 3, moral: 0, sec: 2, gdp: 2, biz: 2, liv: 2, desc: '协调联邦政务委各委员开展联席会议，统一部署年度人事政策重点工作，提升行政协调效率。' },
            { id: 'lge6', icon: '🌐', title: '团系统干部输送对接',    cost: 120, merit: 25, bfav: 0, moral: 3, sec: 0, gdp: 0, biz: 0, liv: 5, desc: '与共青团中央对接，将优秀团干部纳入党政系统培养序列，拓宽干部来源，注入年轻血液。' },
          ] as { id: string; icon: string; title: string; cost: number; merit: number; bfav: number; moral: number; sec: number; gdp: number; biz: number; liv: number; desc: string }[]).map(action => (
            <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#A8D8B8', overflow: 'hidden' }}>
              <View style={{ backgroundColor: '#003020', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{action.title}</Text>
                  <Text style={{ color: 'rgba(120,220,160,0.7)', fontSize: 10, marginTop: 2 }}>经费 ¥{action.cost}万 · 政绩 +{action.merit}</Text>
                </View>
              </View>
              <View style={{ padding: 10, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{action.desc}</Text>
                {/* 多维效果标签 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {action.sec  > 0 && <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#D8C4A0' }}><Text style={{ fontSize: 9, color: '#7B3F00' }}>治安 +{action.sec}</Text></View>}
                  {action.gdp  > 0 && <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#A8D8B0' }}><Text style={{ fontSize: 9, color: '#1A6B30' }}>GDP +{action.gdp}</Text></View>}
                  {action.biz  > 0 && <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#90CAF9' }}><Text style={{ fontSize: 9, color: '#1B4F8A' }}>营商 +{action.biz}</Text></View>}
                  {action.liv  > 0 && <View style={{ backgroundColor: '#FCE4EC', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#F48FB1' }}><Text style={{ fontSize: 9, color: '#880E4F' }}>民生 +{action.liv}</Text></View>}
                  {action.moral > 0 && <View style={{ backgroundColor: '#EDE7F6', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#B39DDB' }}><Text style={{ fontSize: 9, color: '#4A148C' }}>道德 +{action.moral}</Text></View>}
                  {action.bfav  > 0 && <View style={{ backgroundColor: '#FFF9C4', paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#FFF176' }}><Text style={{ fontSize: 9, color: '#7B5B00' }}>好感 +{action.bfav}</Text></View>}
                </View>
                <Pressable
                  onPress={async () => {
                    if (acting) return;
                    const cost = action.cost * 10_000;
                    if (save.fundBalance < cost) { setResult('⚠️ 经费不足'); setTimeout(() => setResult(''), 2000); return; }
                    setActing(true);
                    try {
                      await updateGameSave({
                        meritPoints: save.meritPoints + action.merit,
                        fundBalance: save.fundBalance - cost,
                        ...(action.bfav  > 0 ? { bossFavor:       Math.min(100, save.bossFavor       + action.bfav)  } : {}),
                        ...(action.moral > 0 ? { moralValue:      Math.min(100, save.moralValue      + action.moral) } : {}),
                        ...(action.sec   > 0 ? { securityIndex:   Math.min(100, save.securityIndex   + action.sec)   } : {}),
                        ...(action.gdp   > 0 ? { cityGdp:         save.cityGdp         + action.gdp  } : {}),
                        ...(action.biz   > 0 ? { cityBusiness:    Math.min(100, save.cityBusiness    + action.biz)   } : {}),
                        ...(action.liv   > 0 ? { cityLivelihood:  Math.min(100, save.cityLivelihood  + action.liv)   } : {}),
                      });
                      setResult(`✅ 完成【${action.title}】，政绩+${action.merit}`);
                      setTimeout(() => setResult(''), 3000);
                    } catch { setResult('操作失败，请稍后重试'); } finally { setActing(false); }
                  }}
                  style={{ backgroundColor: acting ? '#999' : '#003020', padding: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{acting ? '执行中…' : `⚡ 执行（-¥${action.cost}万）`}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}


      {/* 操作结果提示 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#2a7a3b', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}
