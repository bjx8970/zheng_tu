// 派系关系页面 —— 真实中国政治生态版（全面重写）
// 五大阵营：改革开放系 / 稳健国家系 / 共青团/民生系 / 技术官僚系 / 纪检法治系
// 功能：格局总览（多轴路线张力+关系矩阵）/ 关系经营 / 政见表态（10议题）/ 上司经营 / NPC派系图谱
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  RANK_CONFIG,
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  FACTION_DESC,
  FACTION_VOTE_BIAS,
  type Faction,
} from '@/types/game';

// ═══════════════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════════════
function clamp(v: number, min = 0, max = 100) { return Math.max(min, Math.min(max, v)); }

/** 根据姓名哈希派发 NPC 归属阵营 */
function hashNameToFaction(name: string): Faction {
  if (!name) return 'pragmatic';
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const f: Faction[] = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'];
  return f[h % 5];
}

/** Faction 类型 → 玩家关系键（与 game.ts 五列相对应） */
function factionToRelKey(f: Faction): string {
  const m: Record<Faction, string> = {
    reform:     'reform',
    pragmatic:  'pragmatic',
    neutral:    'cyl',
    economy:    'techno',
    discipline: 'pragmatic',
  };
  return m[f];
}

function getRelLabel(v: number): { label: string; color: string } {
  if (v >= 80) return { label: '坚定盟友', color: '#D4AF37' };
  if (v >= 60) return { label: '友好合作', color: '#2E7D32' };
  if (v >= 40) return { label: '中立观望', color: '#546E7A' };
  if (v >= 20) return { label: '冷淡疏离', color: '#E65100' };
  return { label: '潜在对立', color: '#B71C1C' };
}

// ═══════════════════════════════════════════════════════════
// 常量：五大派系 UI 配置（扩展版，贴近现实）
// ═══════════════════════════════════════════════════════════
interface FactionConfig {
  key: string;
  name: string;
  short: string;
  icon: string;
  headerColor: string;
  accentColor: string;
  tagline: string;
  desc: string;           // 简介文字
  background: string;     // 历史源流
  representative: string; // 典型人物/路线
  stronghold: string;     // 势力范围
  weakness: string;       // 弱点/威胁
  perks: string[];
}

// 默认冷却天数（isCool/coolLeft 不传 days 时使用）
const COOLDOWN = 60;

const FACTIONS: FactionConfig[] = [
  {
    key: 'reform',
    name: '改革开放系',
    short: '改革系',
    icon: '🔓',
    headerColor: '#1A3B66',
    accentColor: '#1E4D8C',
    tagline: '推进体制改革，扩大对外开放',
    desc: '以市场化改革为旗帜，强调简政放权与对外开放，是推动中国融入全球经济体系的核心力量。与沿海商界及外资机构联系密切，在经济领域影响力最为突出。',
    background: '邓小平改革路线的继承者，发迹于广东、浙江等沿海改革前沿省份，与外资企业界及国际机构联系密切。',
    representative: '以广东系、浙商背景干部为代表，主张简政放权与营商环境优化。',
    stronghold: '广东、浙江、上海、福建；国家发改委、商务部、财政部部分系统。',
    weakness: '被质疑"让利于西方"，遇重大外部压力时政治风险骤升，与纪检系摩擦明显。',
    perks: ['改革政务行动政绩+30%', '晋升审批加速 5 天', '廉政考核优秀概率+10%', '招商引资GDP加成+15%'],
  },
  {
    key: 'pragmatic',
    name: '稳健国家系',
    short: '国家系',
    icon: '🏛️',
    headerColor: '#8B0000',
    accentColor: '#A00000',
    tagline: '党管一切，以稳定为压倒一切的任务',
    desc: '以党纪党风与意识形态管理为核心，以"稳定压倒一切"为行动准则。在中央党政要害部门长期深耕，对政治忠诚和制度权威有天然执著，是维护党的执政根基的中坚力量。',
    background: '以中央党政机关为核心阵地，强调党纪党风和意识形态管理，发迹于组织部、宣传部、党务总枢府办公厅等要害部门。',
    representative: '以"内陆党务系统"出身干部为代表，强调政治忠诚与意识形态统一。',
    stronghold: '中央党政机关、中组部、中宣部、国企央企；北京、河北、东北、内陆省份。',
    weakness: '改革动力不足，易被指"因循守旧"，在市场化改革呼声高涨时影响力相对下降。',
    perks: ['党务类行动效果+25%', '上司忠诚好感+5', '意识形态安全系数+10%', '任期考核优秀+15%'],
  },
  {
    key: 'cyl',
    name: '共青团/民生系',
    short: '团系',
    icon: '🎓',
    headerColor: '#2E6B3E',
    accentColor: '#357A47',
    tagline: '以人民满意为第一标准，深耕群众工作',
    desc: '从共青团中央系统起步，深耕青年工作、媒体传播与群众调研，以民生为最大政绩抓手。在教育、医疗、扶贫等领域号召力强，善于构建与普通民众的情感联结。',
    background: '从共青团中央系统起步，历经基层团委—省团委—全国团委的晋升通道，擅长青年工作、媒体传播与群众调研。',
    representative: '以胡锦涛为代表的"团派"路线；重视教育、医疗、民生支出，走群众路线。',
    stronghold: '团中央系统、教育部、卫生健康委、文化旅游部；中西部省份基层。',
    weakness: '被质疑缺乏经济建设经验，在经济下行期被务实派边缘化；与国家系存在结构性路线之争。',
    perks: ['民生施政类政绩+25%', '上司汇报好感+5', '群众满意度提升+10%', '形象舆论管控解锁'],
  },
  {
    key: 'techno',
    name: '技术官僚系',
    short: '技官系',
    icon: '🔬',
    headerColor: '#7A5C00',
    accentColor: '#8A6800',
    tagline: '以数据治国，推动治理现代化',
    desc: '以"专业主义"和"科技兴国"为旗帜，理工科出身为主，擅长将技术路径融入政策制定。在数字经济、战略性新兴产业领域独具话语权，是推动新质生产力的核心派系。',
    background: '理工科出身为主，在国家发改委、工信部、科技部及国有重点企业体系中影响深远，以"专业主义"和"科技兴国"为旗帜。',
    representative: '以"工程师治国"路线为代表，数字经济、战略性新兴产业的强力推手。',
    stronghold: '工信部、国家发改委、科技部、中科院系统；航天军工、半导体、数字经济领域。',
    weakness: '政治动员能力弱，易被纪检系盯上技术领域腐败，与国家系的意识形态路线时有摩擦。',
    perks: ['科技/数字政务行动效果+20%', '城市GDP加成+10%', '科研专项政绩+25%', '大数据治理项目解锁'],
  },
  {
    key: 'local',
    name: '地方实力派',
    short: '地方派',
    icon: '🗺️',
    headerColor: '#3A2010',
    accentColor: '#4E2A14',
    tagline: '根植地方，深耕人脉资源',
    desc: '长期在县市省层级深耕，掌握庞大的基层人脉、土地资源与地方企业关系网络，善于在中央政策框架下寻找地方操作空间。是推动基建投资与地方财政运转的主导力量。',
    background: '长期在县市省层级深耕，掌握庞大的基层人脉、土地资源、地方企业关系网络，善于在中央政策下寻找地方操作空间。',
    representative: '以各省"地方保护主义"势力为代表，在土地财政、基建项目上具有相当话语权。',
    stronghold: '省市县基层政府；建设局、国土局、城投公司；土地开发商；地方银行、商会。',
    weakness: '与中央改革路线摩擦，是反腐风暴的重灾区，纪检系对地方利益输送高度警惕。',
    perks: ['基建项目政绩+30%', '下属招募成本-30%', '干部交流负面事件豁免', '地方资源调配解锁'],
  },
];

// ── 派系间历史关系矩阵（供NPC派系Tab展示）──────────────────
// 正值=友好/合作，负值=竞争/对立，0=中立工具性关系
const FACTION_RELATION_MATRIX: Record<string, Record<string, number>> = {
  reform:     { reform: 0, pragmatic: -2, cyl: 1,  techno: 2,  local: -1 },
  pragmatic:  { reform: -2, pragmatic: 0, cyl: -2, techno: 0,  local: 1  },
  cyl:        { reform: 1,  pragmatic: -2, cyl: 0, techno: 0,  local: 0  },
  techno:     { reform: 2,  pragmatic: 0, cyl: 0,  techno: 0,  local: -1 },
  local:      { reform: -1, pragmatic: 1, cyl: 0,  techno: -1, local: 0  },
};

// ── 政见表态（10 个现实议题，逐一牵动各阵营）──────────────
interface PolicyStance {
  key: string;
  title: string;
  subtitle: string;
  background: string; // 政策背景说明
  effects: { fkey: string; delta: number }[];
  merit: number;
  gdpDelta: number;
  livelihoodDelta: number;
  cooldown: number;
  risk: string; // 政治风险提示
}

const POLICY_STANCES: PolicyStance[] = [
  {
    key: 'pol_common_prosperity',
    title: '共同富裕论',
    subtitle: '以调节分配差距为核心，推进社会公平',
    background: '强调"第三次分配"，倡导平台经济承担社会责任，压缩资本过度扩张，在民间具有高支持度。',
    effects: [
      { fkey: 'cyl', delta: 22 }, { fkey: 'pragmatic', delta: 10 },
      { fkey: 'reform', delta: -12 }, { fkey: 'techno', delta: -5 }, { fkey: 'local', delta: -8 },
    ],
    merit: 20, gdpDelta: -2, livelihoodDelta: 8, cooldown: 90,
    risk: '改革系和技官系认为此论调损害市场活力，可能在招商引资上承压。',
  },
  {
    key: 'pol_soe_strengthen',
    title: '国企做强做大论',
    subtitle: '强化国有企业主导地位，增强经济控制力',
    background: '主张国企在战略行业保持垄断，通过兼并重组做大规模，以国资委为核心建立央地协调机制。',
    effects: [
      { fkey: 'pragmatic', delta: 20 }, { fkey: 'local', delta: 8 },
      { fkey: 'reform', delta: -18 }, { fkey: 'techno', delta: -5 }, { fkey: 'cyl', delta: 5 },
    ],
    merit: 15, gdpDelta: 3, livelihoodDelta: 0, cooldown: 75,
    risk: '改革系激烈反对，认为此论调阻碍民营经济活力，外资撤离风险上升。',
  },
  {
    key: 'pol_market_reform',
    title: '市场化深化论',
    subtitle: '让市场在资源配置中发挥决定性作用',
    background: '推动要素市场化配置改革，打破行政垄断，扩大民营企业准入，对标国际一流营商环境。',
    effects: [
      { fkey: 'reform', delta: 20 }, { fkey: 'techno', delta: 10 },
      { fkey: 'pragmatic', delta: -15 }, { fkey: 'local', delta: -10 }, { fkey: 'cyl', delta: 3 },
    ],
    merit: 22, gdpDelta: 10, livelihoodDelta: 0, cooldown: 90,
    risk: '国家系强烈抵制，被扣"历史虚无主义"帽子的政治风险较高。',
  },
  {
    key: 'pol_dual_circulation',
    title: '新发展格局（双循环）',
    subtitle: '以国内大循环为主体，国内国际双循环相互促进',
    background: '在中美博弈背景下，以内需拉动替代出口依赖，强化产业链自主可控，属于技官系与国家系共识最多的政策方向。',
    effects: [
      { fkey: 'techno', delta: 16 }, { fkey: 'pragmatic', delta: 14 },
      { fkey: 'reform', delta: 5 }, { fkey: 'cyl', delta: 5 }, { fkey: 'local', delta: -3 },
    ],
    merit: 18, gdpDelta: 6, livelihoodDelta: 2, cooldown: 75,
    risk: '政治风险低，但易被认为是向保守主义妥协，改革派部分人士有异议。',
  },
  {
    key: 'pol_anticorruption',
    title: '反腐常态化论',
    subtitle: '将反腐败斗争进行到底，构建不敢腐机制',
    background: '主张将巡视组、派驻纪检组制度化，同步推进官员财产公示，打破"腐败亚文化"。',
    effects: [
      { fkey: 'reform', delta: 12 }, { fkey: 'cyl', delta: 8 }, { fkey: 'pragmatic', delta: 5 },
      { fkey: 'local', delta: -22 }, { fkey: 'techno', delta: -3 },
    ],
    merit: 25, gdpDelta: 0, livelihoodDelta: 3, cooldown: 90,
    risk: '地方实力派将视为直接威胁，可能触发地方官员结成防御联盟对抗。',
  },
  {
    key: 'pol_digital_economy',
    title: '数字经济强国论',
    subtitle: '以数字经济为引擎推动高质量发展',
    background: '在人工智能、工业互联网、大数据基础设施领域加大国家投入，推动政务数字化，对标欧美数字竞争力。',
    effects: [
      { fkey: 'techno', delta: 22 }, { fkey: 'reform', delta: 10 },
      { fkey: 'pragmatic', delta: 3 }, { fkey: 'cyl', delta: 0 }, { fkey: 'local', delta: -5 },
    ],
    merit: 20, gdpDelta: 10, livelihoodDelta: 0, cooldown: 80,
    risk: '需配套较大财政投入；被纪检系警惕"数字腐败"新形式。',
  },
  {
    key: 'pol_rural_revitalization',
    title: '乡村振兴战略论',
    subtitle: '全面推进乡村振兴，缩小城乡差距',
    background: '接棒脱贫攻坚，强调农村基础设施、产业振兴、人才下乡，是团系和地方基层最重要的施政抓手之一。',
    effects: [
      { fkey: 'cyl', delta: 20 }, { fkey: 'local', delta: 12 },
      { fkey: 'reform', delta: 3 }, { fkey: 'techno', delta: -3 }, { fkey: 'pragmatic', delta: 8 },
    ],
    merit: 16, gdpDelta: 2, livelihoodDelta: 10, cooldown: 60,
    risk: '政治安全，但易被质疑重民生轻效率；地方财政压力较大。',
  },
  {
    key: 'pol_full_reform',
    title: '全面深化改革论',
    subtitle: '以制度创新突破利益固化，推进国家治理体系现代化',
    background: '十八届三中全会精神的延伸，以顶层设计方式推进各领域系统性改革，改革范围宽泛但力度强于单项改革。',
    effects: [
      { fkey: 'reform', delta: 22 }, { fkey: 'techno', delta: 10 }, { fkey: 'cyl', delta: 6 },
      { fkey: 'pragmatic', delta: -12 }, { fkey: 'local', delta: -10 },
    ],
    merit: 25, gdpDelta: 5, livelihoodDelta: 2, cooldown: 100,
    risk: '是改革系最为偏好的论调，但国家系会质疑是否动摇党的执政根基。',
  },
  {
    key: 'pol_party_leads_all',
    title: '党的全面领导论',
    subtitle: '坚持和加强党对一切工作的领导',
    background: '强调在党政军民学、东西南北中，党是领导一切的；主张将党委前置嵌入企业、高校、社会组织各领域。',
    effects: [
      { fkey: 'pragmatic', delta: 22 }, { fkey: 'local', delta: 5 },
      { fkey: 'reform', delta: -15 }, { fkey: 'techno', delta: -8 }, { fkey: 'cyl', delta: -3 },
    ],
    merit: 12, gdpDelta: -3, livelihoodDelta: 0, cooldown: 75,
    risk: '政治安全性最高，但市场主体信心下降风险较明显，长期GDP承压。',
  },
  {
    key: 'pol_open_to_world',
    title: '高水平对外开放论',
    subtitle: '扩大制度型开放，打造国际合作竞争新优势',
    background: '推进"第二个开放"：从商品和要素流动的开放，转向规则、规制、管理、标准的制度型开放；对接CPTPP规则体系。',
    effects: [
      { fkey: 'reform', delta: 18 }, { fkey: 'techno', delta: 12 },
      { fkey: 'pragmatic', delta: -10 }, { fkey: 'cyl', delta: 5 }, { fkey: 'local', delta: -8 },
    ],
    merit: 20, gdpDelta: 12, livelihoodDelta: 0, cooldown: 90,
    risk: '在民族主义情绪高涨时政治风险上升，被指"崇洋"，需拿捏表达尺度。',
  },
];

// ── 关系行动（每派 4~5 条，含现实政治描述）──────────────────
interface FactionAction {
  key: string;
  fkey: string;
  type: '联络' | '合作' | '拉拢' | '打压';
  label: string;
  desc: string;
  relDelta: number;
  otherEffects: { fkey?: string; merit?: number; gdpDelta?: number; livelihoodDelta?: number; fundCost?: number; bossFavorDelta?: number; moralDelta?: number }[];
  cooldown: number;
  minRank: number;
  riskLevel: '低' | '中' | '高';
}

const FACTION_ACTIONS: FactionAction[] = [
  // ── 改革开放系 ──
  { key: 'rf_meet',     fkey: 'reform', type: '联络', label: '约见改革派核心干部',   desc: '拜访广东/浙江系改革派重要人物，就市场化改革路径深度交流，强化互信。',       relDelta: 10, otherEffects: [{ merit: 5, fundCost: 50000 }],              cooldown: 45,  minRank: 0, riskLevel: '低' },
  { key: 'rf_gov',      fkey: 'reform', type: '合作', label: '联合推进政务公开项目', desc: '与改革派合作建立阳光政务信息公开平台，展示施政透明度，双方声誉提升。',       relDelta: 15, otherEffects: [{ merit: 18, gdpDelta: 2 }],                   cooldown: 60,  minRank: 2, riskLevel: '低' },
  { key: 'rf_biz',      fkey: 'reform', type: '合作', label: '共推营商环境优化方案', desc: '联合推出优化营商环境白皮书，减少行政审批，获得改革派和企业界双重认可。',     relDelta: 14, otherEffects: [{ merit: 20, gdpDelta: 8, fundCost: 80000 }],  cooldown: 75,  minRank: 3, riskLevel: '低' },
  { key: 'rf_rally',    fkey: 'reform', type: '拉拢', label: '邀入城市重大决策会议', desc: '在关键决策会议中为改革派开放席位，彰显政治诚意，但国家系关系略受影响。',     relDelta: 22, otherEffects: [{ merit: 25, fkey: 'pragmatic' }],           cooldown: 90,  minRank: 4, riskLevel: '中' },
  { key: 'rf_suppress', fkey: 'reform', type: '打压', label: '质疑改革方案危及稳定', desc: '在公开场合以"操之过急"为由阻挠某改革方案，削弱改革派声势，风险较高。',     relDelta: -20, otherEffects: [{ merit: 20, fkey: 'pragmatic' }],          cooldown: 120, minRank: 5, riskLevel: '高' },

  // ── 稳健国家系 ──
  { key: 'pr_meet',     fkey: 'pragmatic', type: '联络', label: '拜访国家系组织骨干', desc: '低调拜访中央系统出身的国家系核心人物，以私人情谊铺垫政治合作。',              relDelta: 10, otherEffects: [{ merit: 5, fundCost: 40000 }],              cooldown: 45,  minRank: 0, riskLevel: '低' },
  { key: 'pr_party',    fkey: 'pragmatic', type: '合作', label: '共同推进党建示范工程', desc: '联合推出党建工作品牌，获国家系高度认可，以示范工程换取党务系统话语权。',    relDelta: 16, otherEffects: [{ merit: 15, bossFavorDelta: 5 }],           cooldown: 60,  minRank: 1, riskLevel: '低' },
  { key: 'pr_gdp',      fkey: 'pragmatic', type: '合作', label: '共推稳增长计划',      desc: '联合国家系推出稳增长数字化目标，强调经济安全与稳定优先，获务实系认可。',     relDelta: 14, otherEffects: [{ merit: 15, gdpDelta: 6 }],                   cooldown: 60,  minRank: 2, riskLevel: '低' },
  { key: 'pr_pact',     fkey: 'pragmatic', type: '拉拢', label: '建立施政路线默契',    desc: '与国家系在几项核心路线上达成非正式共识，互相背书，大幅提升关系。',           relDelta: 20, otherEffects: [{ merit: 22, fkey: 'reform' }],                cooldown: 90,  minRank: 4, riskLevel: '中' },
  { key: 'pr_suppress', fkey: 'pragmatic', type: '打压', label: '揭批保守主义路线',    desc: '在内部会议上指出国家系的因循守旧，以改革话语打压其影响力，风险较高。',       relDelta: -18, otherEffects: [{ merit: 18, fkey: 'reform' }],             cooldown: 120, minRank: 5, riskLevel: '高' },

  // ── 共青团/民生系 ──
  { key: 'cyl_event',   fkey: 'cyl', type: '联络', label: '出席团系重要政治活动',   desc: '参加共青团系组织的主题活动，公开表达对青年培养的重视，提升形象分。',           relDelta: 10, otherEffects: [{ merit: 8 }],                                cooldown: 45,  minRank: 0, riskLevel: '低' },
  { key: 'cyl_network', fkey: 'cyl', type: '联络', label: '拜访团系骨干建立情谊',   desc: '私下与团系中层建立联系，在非正式场合深化感情，为人事合作铺路。',               relDelta: 14, otherEffects: [{ merit: 10, fundCost: 30000 }],              cooldown: 50,  minRank: 0, riskLevel: '低' },
  { key: 'cyl_media',   fkey: 'cyl', type: '合作', label: '借团系媒体宣传施政亮点', desc: '借助团系媒体渠道对外发布施政成果，增强公众认知，积累团系好感与民生声誉。',     relDelta: 12, otherEffects: [{ merit: 20, livelihoodDelta: 2 }],           cooldown: 60,  minRank: 2, riskLevel: '低' },
  { key: 'cyl_support', fkey: 'cyl', type: '拉拢', label: '力推团系干部人事安排',   desc: '在组织推荐环节为团系干部站台，换取其在晋升投票上的关键支持。',                 relDelta: 20, otherEffects: [{ merit: 15, fkey: 'reform' }],                cooldown: 90,  minRank: 3, riskLevel: '中' },
  { key: 'cyl_welfare', fkey: 'cyl', type: '合作', label: '联合推进民生保障计划',   desc: '与团系联合发布教育/医疗/养老三联惠民方案，拉动民生指数，双方均获政绩。',       relDelta: 18, otherEffects: [{ merit: 22, livelihoodDelta: 5 }],           cooldown: 75,  minRank: 2, riskLevel: '低' },

  // ── 技术官僚系 ──
  { key: 'tc_consult',  fkey: 'techno', type: '联络', label: '聘请技官系专家顾问',   desc: '聘请技官派院士、专家担任政务顾问，借其专业背书提升施政公信力。',               relDelta: 10, otherEffects: [{ merit: 12, fundCost: 60000 }],              cooldown: 45,  minRank: 0, riskLevel: '低' },
  { key: 'tc_project',  fkey: 'techno', type: '合作', label: '共推数字政务升级项目', desc: '邀请技官系骨干主导电子政务平台全面升级，双方共享政绩与声望。',                 relDelta: 14, otherEffects: [{ merit: 15, gdpDelta: 4 }],                   cooldown: 50,  minRank: 2, riskLevel: '低' },
  { key: 'tc_fund',     fkey: 'techno', type: '合作', label: '申请科技创新专项资金', desc: '联合技官系提报新兴产业专项，争取科研经费和政策支持，共同推动产业转型。',       relDelta: 12, otherEffects: [{ merit: 18, fundCost: 80000 }],              cooldown: 60,  minRank: 3, riskLevel: '低' },
  { key: 'tc_bigdata',  fkey: 'techno', type: '拉拢', label: '共建大数据城市治理平台', desc: '推出大数据城市治理方案，将技官系路线嵌入本地治理，大幅提升双方关系。',        relDelta: 22, otherEffects: [{ merit: 28, gdpDelta: 5, fkey: 'reform' }],  cooldown: 90,  minRank: 5, riskLevel: '低' },

  // ── 地方实力派 ──
  { key: 'lc_visit',    fkey: 'local', type: '联络', label: '登门拜会地方实力要员', desc: '携带厚礼拜访地方派核心人物，以私人情谊奠定政治合作基础。',                     relDelta: 12, otherEffects: [{ merit: 8, fundCost: 80000 }],               cooldown: 45,  minRank: 0, riskLevel: '低' },
  { key: 'lc_land',     fkey: 'local', type: '合作', label: '联合推进土地出让项目', desc: '与地方派协同推进辖区土地出让与旧城改造项目，共享财政收益与政绩资源。',         relDelta: 14, otherEffects: [{ merit: 18, gdpDelta: 8, fundCost: 150000 }], cooldown: 70, minRank: 2, riskLevel: '中' },
  { key: 'lc_project',  fkey: 'local', type: '合作', label: '联手承接基建大项目',   desc: '与地方派共同推进基础设施项目，共享政绩并绑定利益，关系大幅提升。',             relDelta: 16, otherEffects: [{ merit: 22, gdpDelta: 6, fundCost: 200000 }], cooldown: 75, minRank: 3, riskLevel: '低' },
  { key: 'lc_ally',     fkey: 'local', type: '拉拢', label: '结盟地方骨干核心人物', desc: '与地方派核心人物建立正式政治盟约，换取稳固支持，但改革派关系受损。',           relDelta: 25, otherEffects: [{ merit: 20, fkey: 'reform' }],                cooldown: 120, minRank: 5, riskLevel: '中' },
  { key: 'lc_expose',   fkey: 'local', type: '打压', label: '向纪委反映利益输送线索', desc: '秘密向纪委举报地方派的腐败线索，以反腐名义大幅削弱其根基，政治风险极高。',   relDelta: -30, otherEffects: [{ merit: 40, moralDelta: 5, bossFavorDelta: -5 }], cooldown: 180, minRank: 6, riskLevel: '高' },

  // ── 改革派 · 高阶行动（rank10+）──
  { key: 'rf_national_pilot',   fkey: 'reform',    type: '合作', label: '发起全国性改革试点倡议',      desc: '联合改革派核心省市牵头推出全国改革试点议案，若获批将成为历史性政绩。',          relDelta: 28, otherEffects: [{ merit: 120, gdpDelta: 12, fkey: 'pragmatic' }], cooldown: 180, minRank: 10, riskLevel: '中' },
  { key: 'rf_central_caucus',   fkey: 'reform',    type: '拉拢', label: '组建改革派跨部委联席会议',    desc: '以改革派旗帜整合多部委资源，形成强大的制度性联盟，大幅巩固路线话语权。',          relDelta: 35, otherEffects: [{ merit: 150, fkey: 'pragmatic' }],               cooldown: 270, minRank: 12, riskLevel: '高' },

  // ── 稳健国家系 · 高阶行动（rank10+）──
  { key: 'pr_constitution_rev',  fkey: 'pragmatic', type: '合作', label: '推动行政体系深度优化方案',    desc: '与国家系联手推进机构精简改革，有效提升政府效能，同时绑定务实系核心利益。',          relDelta: 25, otherEffects: [{ merit: 100, bossFavorDelta: 10 }],              cooldown: 180, minRank: 10, riskLevel: '低' },
  { key: 'pr_security_pact',     fkey: 'pragmatic', type: '拉拢', label: '缔结跨省国家安全协调协议',   desc: '以国家安全名义协调多省联合行动，借势将务实系影响力拓展至全国战略层级。',            relDelta: 30, otherEffects: [{ merit: 130, fkey: 'reform' }],                  cooldown: 240, minRank: 11, riskLevel: '中' },

  // ── 共青团/民生系 · 高阶行动（rank10+）──
  { key: 'cyl_national_youth',   fkey: 'cyl',       type: '合作', label: '主导全国青年创业政策制定',   desc: '联合团系推出青年创业扶持政策体系，将民生系路线写入国家政策议程，声望大涨。',          relDelta: 28, otherEffects: [{ merit: 110, livelihoodDelta: 8 }],              cooldown: 180, minRank: 10, riskLevel: '低' },
  { key: 'cyl_welfare_reform',   fkey: 'cyl',       type: '合作', label: '推动全国社会保障体系改革',   desc: '与团系合力推进养老、教育、医疗三大领域联动改革，民间声誉与民生指数双提升。',          relDelta: 32, otherEffects: [{ merit: 140, livelihoodDelta: 12, fundCost: 500000 }], cooldown: 270, minRank: 12, riskLevel: '低' },

  // ── 技术官僚系 · 高阶行动（rank10+）──
  { key: 'tc_ai_governance',     fkey: 'techno',    type: '合作', label: '主导全国AI与数字治理立法',   desc: '联合技官系推出AI治理与数字政府立法草案，占据新兴技术政策高地，声誉卓著。',            relDelta: 26, otherEffects: [{ merit: 120, gdpDelta: 10 }],                    cooldown: 180, minRank: 10, riskLevel: '低' },
  { key: 'tc_industrial_upgrade', fkey: 'techno',   type: '合作', label: '发布国家产业升级战略白皮书', desc: '牵头发布国家级产业升级路线图，将技官系路线嵌入五年规划，对GDP和声誉均有显著提升。', relDelta: 30, otherEffects: [{ merit: 135, gdpDelta: 15, fundCost: 300000 }],  cooldown: 240, minRank: 11, riskLevel: '低' },

  // ── 地方实力派 · 高阶行动（rank10+）──
  { key: 'lc_mega_project',      fkey: 'local',     type: '合作', label: '推动跨省级联合重大基建项目', desc: '协调多个地方派省市联合申报国家级战略基建，绑定地方派核心利益，政绩极为丰厚。',        relDelta: 28, otherEffects: [{ merit: 125, gdpDelta: 18, fundCost: 800000 }], cooldown: 240, minRank: 10, riskLevel: '中' },
  { key: 'lc_regional_bloc',     fkey: 'local',     type: '拉拢', label: '构建跨省地方政治利益同盟',   desc: '以地方派为核心组建跨省政治同盟，形成地方系最强硬的支持基本盘，风险较高。',              relDelta: 38, otherEffects: [{ merit: 160, fkey: 'reform' }],                  cooldown: 365, minRank: 13, riskLevel: '高' },
];

// ── 上司经营行动 ────────────────────────────────────────────
interface BossAction {
  key: string;
  bossLevel: 1 | 2 | 3;
  label: string;
  desc: string;
  favorDelta: number;
  meritDelta: number;
  cooldown: number;
}
const BOSS_ACTIONS: BossAction[] = [
  { key: 'b1_report',  bossLevel: 1, label: '主动汇报近期工作进展', desc: '整理施政亮点数据，向直属上司主动提交汇报材料，强化其对你执行力的信任。',     favorDelta: 8,  meritDelta: 5, cooldown: 30 },
  { key: 'b1_intel',   bossLevel: 1, label: '传递独家内部情报',     desc: '向上司提供一则有价值的内部线索，以信息优势换取额外好感与信任资本。',         favorDelta: 12, meritDelta: 8, cooldown: 60 },
  { key: 'b1_gift',    bossLevel: 1, label: '节日私下登门拜访',     desc: '在节假日以非正式方式登门拜访，私人情谊加分显著，但需把握分寸避免风险。',     favorDelta: 15, meritDelta: 0, cooldown: 90 },
  { key: 'b1_backup',  bossLevel: 1, label: '在重要场合公开背书',   desc: '在局内会议上主动为上司的重要决策发声支持，彰显忠诚度，好感提升明显。',       favorDelta: 10, meritDelta: 5, cooldown: 75 },
  { key: 'b2_brief',   bossLevel: 2, label: '专题汇报城市施政成果', desc: '精心准备专题汇报材料向二级上司展示，跨层级提升存在感与施政视野。',           favorDelta: 6,  meritDelta: 3, cooldown: 45 },
  { key: 'b2_align',   bossLevel: 2, label: '关键议题上公开表态跟进', desc: '在公开场合追随二级上司的立场，显示政治上的高度一致性，赢得好感。',          favorDelta: 10, meritDelta: 5, cooldown: 75 },
  { key: 'b3_inspect', bossLevel: 3, label: '安排三级上司视察亮点',  desc: '精心部署三级上司的视察行程，展示辖区建设亮点，在其脑海中留下深刻印象。',     favorDelta: 5,  meritDelta: 3, cooldown: 60 },
];

// ═══════════════════════════════════════════════════════════
// 子组件
// ═══════════════════════════════════════════════════════════

function RelBar({ value, color }: { value: number; color: string }) {
  const { label, color: lc } = getRelLabel(value);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 10, color: lc, fontWeight: '700' }}>{label}</Text>
        <Text style={{ fontSize: 10, color: '#555', fontVariant: ['tabular-nums'] }}>{value}/100</Text>
      </View>
      <View style={{ height: 5, backgroundColor: '#E8E8E8', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 5, width: `${value}%`, backgroundColor: color, borderRadius: 2 }} />
      </View>
    </View>
  );
}

/** NPC 派系徽章 */
function FactionBadge({ faction, size = 'sm' }: { faction: Faction; size?: 'sm' | 'md' }) {
  const bg = FACTION_BG[faction];
  const label = FACTION_SHORT[faction];
  const pad = size === 'md' ? { paddingHorizontal: 8, paddingVertical: 3 } : { paddingHorizontal: 5, paddingVertical: 1 };
  const fs  = size === 'md' ? 11 : 9;
  return (
    <View style={{ backgroundColor: bg, ...pad, borderRadius: 2 }}>
      <Text style={{ color: '#fff', fontSize: fs, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const FACTION_BG: Record<Faction, string> = {
  reform:     '#1A3B66',
  pragmatic:  '#8B0000',
  neutral:    '#2E6B3E',
  economy:    '#7A5C00',
  discipline: '#4A1A6B',
};



// ═══════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════

export default function FactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();

  const [activeTab, setActiveTab] = useState<'overview' | 'relations' | 'policy' | 'dynamics' | 'bosses' | 'rank' | 'territory'>('overview');
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [expandedFaction, setExpandedFaction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [choosingPrimary, setChoosingPrimary] = useState(false);

  useFocusEffect(useCallback(() => { /* 刷新时不做额外操作 */ }, []));

  if (!save) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1' }}><ActivityIndicator testID="activity-indicator" size="large" color="#C82829" /></View>;

  const rankConfig = RANK_CONFIG[save.rankLevel] ?? RANK_CONFIG[1];

  // 当前各派关系值（统一接口）
  const relOf = (fkey: string): number => {
    if (fkey === 'reform')    return save.reformFaction;
    if (fkey === 'pragmatic') return save.pragmaticFaction;
    if (fkey === 'cyl')       return save.cylRelation;
    if (fkey === 'techno')    return save.technoRelation;
    if (fkey === 'local')     return save.localRelation;
    return 0;
  };

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  const isCool = (key: string, days = COOLDOWN) => (cooldowns[key] ?? 0) + days > save.gameDays;
  const coolLeft = (key: string, days = COOLDOWN) => Math.max(0, (cooldowns[key] ?? 0) + days - save.gameDays);
  const markCool = (key: string) => setCooldowns({ ...cooldowns, [key]: save.gameDays });

  // ── 选择主派 ─────────────────────────────────────────────
  const handleChoosePrimary = async (fkey: string) => {
    const alreadyHas = !!save.primaryFaction;
    if (alreadyHas && save.primaryFaction !== fkey) {
      if ((save.meritPoints ?? 0) < 100) {
        showFeedback('更换主派需消耗 100 政绩，当前政绩不足', false);
        return;
      }
      await updateGameSave({ primaryFaction: fkey, meritPoints: (save.meritPoints ?? 0) - 100 });
      showFeedback(`✓ 已更换主派系为「${FACTIONS.find(f => f.key === fkey)?.name}」，耗费 100 政绩`, true);
    } else {
      const bonus = 20;
      const updates: Record<string, number | string> = { primaryFaction: fkey };
      if (fkey === 'reform')    updates.reformFaction    = clamp(save.reformFaction    + bonus);
      if (fkey === 'pragmatic') updates.pragmaticFaction = clamp(save.pragmaticFaction + bonus);
      if (fkey === 'cyl')       updates.cylRelation      = clamp(save.cylRelation      + bonus);
      if (fkey === 'techno')    updates.technoRelation   = clamp(save.technoRelation   + bonus);
      if (fkey === 'local')     updates.localRelation    = clamp(save.localRelation    + bonus);
      await updateGameSave(updates);
      showFeedback(`✓ 已加入「${FACTIONS.find(f => f.key === fkey)?.name}」，初始关系 +20，特权已激活`, true);
    }
    setChoosingPrimary(false);
  };

  // ── 执行关系行动 ─────────────────────────────────────────
  const handleFactionAction = async (action: FactionAction) => {
    if (isCool(action.key, action.cooldown)) {
      showFeedback(`冷却中，还需 ${coolLeft(action.key, action.cooldown)} 天`, false);
      return;
    }
    const fundCost = action.otherEffects.find(e => e.fundCost)?.fundCost ?? 0;
    if (fundCost > 0 && (save.fundBalance ?? 0) < fundCost) {
      showFeedback(`资金不足，需 ¥${(fundCost / 10000).toFixed(0)}万`, false);
      return;
    }

    // 组装更新
    const u: Record<string, number> = {};
    // 主派系关系变化
    const cur = relOf(action.fkey);
    const newRel = clamp(cur + action.relDelta);
    if (action.fkey === 'reform')    u.reformFaction    = newRel;
    if (action.fkey === 'pragmatic') u.pragmaticFaction = newRel;
    if (action.fkey === 'cyl')       u.cylRelation      = newRel;
    if (action.fkey === 'techno')    u.technoRelation   = newRel;
    if (action.fkey === 'local')     u.localRelation    = newRel;

    // 附带效果
    let meritSum = 0;
    let gdpSum = 0;
    let lifeSum = 0;
    let moralSum = 0;
    let bossFSum = 0;
    for (const e of action.otherEffects) {
      if (e.merit    !== undefined) meritSum  += e.merit;
      if (e.gdpDelta !== undefined) gdpSum    += e.gdpDelta;
      if (e.livelihoodDelta !== undefined) lifeSum += e.livelihoodDelta;
      if (e.moralDelta      !== undefined) moralSum += e.moralDelta;
      if (e.bossFavorDelta  !== undefined) bossFSum += e.bossFavorDelta;
      // 其他派系关系联动（action.otherEffects[x].fkey 表示该派系减少的量，merit字段在fkey有值时表示负delta）
      if (e.fkey) {
        const cf = relOf(e.fkey);
        const delta = action.type === '打压' ? 10 : -8; // 打压另一派给自己，反之拉拢一方会疏远另一方
        const nf = clamp(cf + delta);
        if (e.fkey === 'reform')    u.reformFaction    = nf;
        if (e.fkey === 'pragmatic') u.pragmaticFaction = nf;
        if (e.fkey === 'cyl')       u.cylRelation      = nf;
        if (e.fkey === 'techno')    u.technoRelation   = nf;
        if (e.fkey === 'local')     u.localRelation    = nf;
      }
    }
    if (meritSum)  u.meritPoints  = clamp((save.meritPoints ?? 0) + meritSum, 0, 9999);
    if (gdpSum)    u.cityGdp      = clamp((save.cityGdp ?? 50) + gdpSum);
    if (lifeSum)   u.cityLivelihood = clamp((save.cityLivelihood ?? 50) + lifeSum);
    if (moralSum)  u.moralValue   = clamp((save.moralValue ?? 50) + moralSum);
    if (bossFSum)  u.bossFavor    = clamp((save.bossFavor ?? 50) + bossFSum);
    if (fundCost)  u.fundBalance  = Math.max(0, (save.fundBalance ?? 0) - fundCost);

    await updateGameSave(u);
    markCool(action.key);

    const relSign = action.relDelta >= 0 ? '+' : '';
    const merSign = meritSum >= 0 ? '+' : '';
    const extraDesc = fundCost > 0 ? ` ·资金-¥${(fundCost / 10000).toFixed(0)}万` : '';
    showFeedback(`✓ ${action.label}：关系${relSign}${action.relDelta}${extraDesc}，政绩${merSign}${meritSum}`, action.type !== '打压');
  };

  // ── 执行政见表态 ─────────────────────────────────────────
  const handlePolicyStance = async (p: PolicyStance) => {
    if (isCool(p.key, p.cooldown)) {
      showFeedback(`冷却中，还需 ${coolLeft(p.key, p.cooldown)} 天`, false);
      return;
    }
    const u: Record<string, number> = {};
    for (const e of p.effects) {
      const cur2 = relOf(e.fkey);
      const nv = clamp(cur2 + e.delta);
      if (e.fkey === 'reform')    u.reformFaction    = nv;
      if (e.fkey === 'pragmatic') u.pragmaticFaction = nv;
      if (e.fkey === 'cyl')       u.cylRelation      = nv;
      if (e.fkey === 'techno')    u.technoRelation   = nv;
      if (e.fkey === 'local')     u.localRelation    = nv;
    }
    if (p.merit)           u.meritPoints     = clamp((save.meritPoints ?? 0) + p.merit, 0, 9999);
    if (p.gdpDelta)        u.cityGdp         = clamp((save.cityGdp ?? 50) + p.gdpDelta);
    if (p.livelihoodDelta) u.cityLivelihood  = clamp((save.cityLivelihood ?? 50) + p.livelihoodDelta);
    await updateGameSave(u);
    markCool(p.key);

    const gains = p.effects.filter(e => e.delta > 0).map(e => `${FACTIONS.find(f => f.key === e.fkey)?.short}+${e.delta}`).join('，');
    const losses = p.effects.filter(e => e.delta < 0).map(e => `${FACTIONS.find(f => f.key === e.fkey)?.short}${e.delta}`).join('，');
    showFeedback(`✓「${p.title}」：${gains}${losses ? '；' + losses : ''}，政绩+${p.merit}`, true);
  };

  // ── 执行上司行动 ─────────────────────────────────────────
  const handleBossAction = async (action: BossAction) => {
    if (isCool(action.key, action.cooldown)) {
      showFeedback(`冷却中，还需 ${coolLeft(action.key, action.cooldown)} 天`, false);
      return;
    }
    const u: Record<string, number> = {};
    if (action.bossLevel === 1) u.bossFavor  = clamp((save.bossFavor  ?? 0) + action.favorDelta);
    if (action.bossLevel === 2) u.boss2Favor = clamp((save.boss2Favor ?? 0) + action.favorDelta);
    if (action.bossLevel === 3) u.boss3Favor = clamp((save.boss3Favor ?? 0) + action.favorDelta);
    if (action.meritDelta) u.meritPoints = clamp((save.meritPoints ?? 0) + action.meritDelta, 0, 9999);
    await updateGameSave(u);
    markCool(action.key);
    showFeedback(`✓ ${action.label}：好感+${action.favorDelta}${action.meritDelta ? `，政绩+${action.meritDelta}` : ''}`, true);
  };

  // 主派 config
  const primaryCfg = FACTIONS.find(f => f.key === save.primaryFaction);

  // ═══════════════════════════════════════════════════════════
  // 渲染
  // ═══════════════════════════════════════════════════════════

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3F0' }}>
      <StatusBar style="light" backgroundColor="#1D3A5C" />

      {/* ── 顶部 ── */}
      <View style={{ backgroundColor: '#1D3A5C', paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12, paddingRight: 4 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POLITICAL FACTIONS</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>政治关系网络</Text>
          </View>
          {/* 主派徽章 */}
          {primaryCfg ? (
            <Pressable onPress={() => setChoosingPrimary(true)} style={{ backgroundColor: primaryCfg.accentColor, paddingHorizontal: 10, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={{ fontSize: 13 }}>{primaryCfg.icon}</Text>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{primaryCfg.short}</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setChoosingPrimary(true)} style={{ borderWidth: 1, borderColor: '#8eb4d8', paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 10 }}>选择主派 ›</Text>
            </Pressable>
          )}
        </View>

        {/* Tab 栏 */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)' }}>
          {([
            { key: 'overview', label: '格局总览' },
            { key: 'relations', label: '关系经营' },
            { key: 'policy', label: '政见表态' },
            { key: 'dynamics', label: '派系动态' },
            { key: 'bosses', label: '上司经营' },
            { key: 'rank', label: '派系层级' },
            { key: 'territory', label: '势力版图' },
          ] as const).map(t => (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === t.key ? '#FFD700' : 'transparent' }}
            >
              <Text style={{ fontSize: 11, fontWeight: activeTab === t.key ? '700' : '400', color: activeTab === t.key ? '#FFD700' : '#8eb4d8' }}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {!!feedback && (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#fff3e0', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#a5d6a7' : '#ffcc80', paddingHorizontal: 14, paddingVertical: 9, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Text style={{ fontSize: 15 }}>{feedbackOk ? '✓' : '⚠'}</Text>
          <Text style={{ flex: 1, color: feedbackOk ? '#1b5e20' : '#e65100', fontSize: 12, fontWeight: '600', lineHeight: 18 }}>{feedback}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* ══════════ Tab 1：格局总览 ══════════ */}
        {activeTab === 'overview' && (
          <>
            {/* 五派势力地图 */}
            <View style={{ backgroundColor: '#1D3A5C', padding: 14 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2, marginBottom: 12 }}>五大派系 · 实力格局</Text>
              {FACTIONS.map(f => {
                const rel = relOf(f.key);
                const isPrimary = save.primaryFaction === f.key;
                const { label: rl, color: rc } = getRelLabel(rel);
                return (
                  <View key={f.key} style={{ marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 18 }}>{f.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{f.name}</Text>
                          {isPrimary && (
                            <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#1D3A5C', fontSize: 8, fontWeight: '700' }}>主派</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ color: '#8eb4d8', fontSize: 9, marginTop: 1 }}>{f.tagline}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 2 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff', fontVariant: ['tabular-nums'] }}>{rel}</Text>
                        <Text style={{ fontSize: 9, color: rc, fontWeight: '700' }}>{rl}</Text>
                      </View>
                    </View>
                    <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${rel}%`, backgroundColor: f.accentColor, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
            </View>

            {/* 改革/务实两派张力 */}
            {(() => {
              const diff = save.reformFaction - save.pragmaticFaction;
              const absD = Math.abs(diff);
              const warn = absD > 30;
              const reformW = save.reformFaction / (save.reformFaction + save.pragmaticFaction) * 100;
              return (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#2B4B6F', padding: 14 }}>
                  <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>改革·务实 路线张力</Text>
                  <View style={{ flexDirection: 'row', marginBottom: 8 }}>
                    <View style={{ flex: 1, backgroundColor: '#EFF4FB', padding: 10, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#DDD' }}>
                      <Text style={{ color: '#1565C0', fontSize: 20, fontWeight: '700' }}>{save.reformFaction}</Text>
                      <Text style={{ color: '#1565C0', fontSize: 10, marginTop: 3 }}>改革开放派</Text>
                    </View>
                    <View style={{ justifyContent: 'center', paddingHorizontal: 12, alignItems: 'center' }}>
                      <Text style={{ fontSize: 9, color: warn ? '#C62828' : '#555', fontWeight: warn ? '700' : '400', textAlign: 'center' }}>
                        {diff > 0 ? '改革偏强' : diff < 0 ? '务实偏强' : '势均力敌'}
                      </Text>
                      <Text style={{ fontSize: 16, color: warn ? '#C62828' : '#aaa', marginTop: 2 }}>⇌</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F5F5F5', padding: 10, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#DDD' }}>
                      <Text style={{ color: '#455A64', fontSize: 20, fontWeight: '700' }}>{save.pragmaticFaction}</Text>
                      <Text style={{ color: '#455A64', fontSize: 10, marginTop: 3 }}>稳健务实派</Text>
                    </View>
                  </View>
                  <View style={{ height: 8, flexDirection: 'row', overflow: 'hidden', borderRadius: 2 }}>
                    <View style={{ width: `${reformW}%`, backgroundColor: '#1565C0' }} />
                    <View style={{ flex: 1, backgroundColor: '#455A64' }} />
                  </View>
                  {warn && (
                    <View style={{ backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffb300', borderLeftWidth: 3, borderLeftColor: '#C62828', padding: 9, marginTop: 10 }}>
                      <Text style={{ color: '#b71c1c', fontSize: 10, fontWeight: '700', marginBottom: 2 }}>⚠ 路线失衡警告</Text>
                      <Text style={{ color: '#7f4c00', fontSize: 10, lineHeight: 16 }}>
                        {diff > 0 ? '务实' : '改革'}派声望差距超过 30 点，劣势派系可能在晋升审批中投反对票，建议通过「政见表态」恢复平衡。
                      </Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* 主派特权说明 */}
            {primaryCfg && (
              <View style={{ backgroundColor: primaryCfg.headerColor, padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Text style={{ fontSize: 22 }}>{primaryCfg.icon}</Text>
                  <View>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, letterSpacing: 1 }}>主派归属 · 激活特权</Text>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{primaryCfg.name}</Text>
                  </View>
                  <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>关系 {relOf(primaryCfg.key)}</Text>
                  </View>
                </View>
                <View style={{ gap: 5 }}>
                  {primaryCfg.perks.map((perk, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Text style={{ color: '#FFD700', fontSize: 11 }}>◆</Text>
                      <Text style={{ flex: 1, color: relOf(primaryCfg.key) >= 60 ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 11, lineHeight: 16 }}>
                        {perk}{relOf(primaryCfg.key) < 60 ? '（需关系≥60激活）' : ''}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {!primaryCfg && (
              <Pressable
                onPress={() => setChoosingPrimary(true)}
                style={{ backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#2B4B6F', borderStyle: 'dashed', padding: 16, alignItems: 'center', gap: 6 }}
              >
                <Text style={{ fontSize: 22 }}>🏛️</Text>
                <Text style={{ color: '#2B4B6F', fontSize: 13, fontWeight: '700' }}>选择您的政治归属</Text>
                <Text style={{ color: '#888', fontSize: 11, textAlign: 'center', lineHeight: 17 }}>
                  加入主派将获得 +20 初始关系加成{'\n'}并解锁专属特权与事件触发
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* ══════════ Tab 2：关系经营 ══════════ */}
        {activeTab === 'relations' && FACTIONS.map(f => {
          const rel = relOf(f.key);
          const { label: rl } = getRelLabel(rel);
          const isExp = expandedFaction === f.key;
          const actions = FACTION_ACTIONS.filter(a => a.fkey === f.key && a.minRank <= save.rankLevel);
          return (
            <View key={f.key} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: f.accentColor }}>
              {/* 折叠头 */}
              <Pressable
                onPress={() => setExpandedFaction(isExp ? null : f.key)}
                style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Text style={{ fontSize: 22 }}>{f.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{f.name}</Text>
                    {save.primaryFaction === f.key && (
                      <View style={{ backgroundColor: f.accentColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>主派</Text>
                      </View>
                    )}
                  </View>
                  <RelBar value={rel} color={f.accentColor} />
                </View>
                <Text style={{ color: '#999', fontSize: 16, marginLeft: 6 }}>{isExp ? '▲' : '▼'}</Text>
              </Pressable>

              {/* 展开内容 */}
              {isExp && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', padding: 14, gap: 8 }}>
                  {/* 简介 */}
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, borderLeftWidth: 3, borderLeftColor: f.accentColor, paddingLeft: 10, marginBottom: 4 }}>
                    {f.desc}
                  </Text>
                  {/* 特权 */}
                  <View style={{ backgroundColor: rel >= 60 ? '#F1F8E9' : '#F5F5F5', borderWidth: 1, borderColor: rel >= 60 ? '#AED581' : '#DDD', padding: 10, marginBottom: 4 }}>
                    <Text style={{ fontSize: 9, color: rel >= 60 ? '#33691E' : '#888', fontWeight: '700', letterSpacing: 1, marginBottom: 5 }}>
                      {rel >= 60 ? '✓ 特权已激活' : `特权（关系≥60 解锁，当前 ${rl}）`}
                    </Text>
                    {f.perks.map((p, i) => (
                      <Text key={i} style={{ fontSize: 10, color: rel >= 60 ? '#33691E' : '#AAA', lineHeight: 17 }}>◆ {p}</Text>
                    ))}
                  </View>
                  {/* 行动列表 */}
                  <Text style={{ fontSize: 9, color: '#888', letterSpacing: 2, marginBottom: 4 }}>可用行动</Text>
                  {actions.map(action => {
                    const cd = isCool(action.key, action.cooldown);
                    const typeColor = action.type === '打压' ? '#B71C1C' : action.type === '拉拢' ? '#1B5E20' : action.type === '合作' ? '#1A237E' : '#37474F';
                    const riskColor = action.riskLevel === '高' ? '#C62828' : action.riskLevel === '中' ? '#E65100' : '#2E7D32';
                    const fundCost = action.otherEffects.find(e => e.fundCost)?.fundCost ?? 0;
                    const meritGain = action.otherEffects.find(e => e.merit)?.merit ?? 0;
                    return (
                      <View
                        key={action.key}
                        style={{ borderWidth: 1, borderColor: cd ? '#EEE' : '#E0E4EA', padding: 11, opacity: cd ? 0.6 : 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                          <View style={{ backgroundColor: typeColor + '18', borderWidth: 1, borderColor: typeColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: typeColor, fontSize: 9, fontWeight: '700' }}>{action.type}</Text>
                          </View>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#111', flex: 1 }}>{action.label}</Text>
                          <View style={{ backgroundColor: riskColor + '18', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: riskColor }}>风险{action.riskLevel}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#666', lineHeight: 15, marginBottom: 7 }}>{action.desc}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 10, color: action.relDelta >= 0 ? '#1B5E20' : '#B71C1C', fontWeight: '600' }}>
                              关系{action.relDelta >= 0 ? '+' : ''}{action.relDelta}
                            </Text>
                            {meritGain !== 0 && <Text style={{ fontSize: 10, color: '#1A237E' }}>政绩+{meritGain}</Text>}
                            {fundCost > 0 && <Text style={{ fontSize: 10, color: '#E65100' }}>资金-¥{(fundCost / 10000).toFixed(0)}万</Text>}
                          </View>
                          <Pressable
                            onPress={() => handleFactionAction(action)}
                            style={{ backgroundColor: cd ? '#CCC' : typeColor, paddingHorizontal: 14, paddingVertical: 6 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                              {cd ? `冷却${coolLeft(action.key, action.cooldown)}天` : '执行'}
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                  {actions.length === 0 && (
                    <View style={{ backgroundColor: '#F5F5F5', padding: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#AAA', fontSize: 11 }}>当前级别暂无可用行动，晋升后解锁更多选项</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* ══════════ Tab 3：派系动态 ══════════ */}
        {activeTab === 'dynamics' && (() => {
          // 派系冲突事件：基于各派关系计算当前潜在冲突
          const conflicts: Array<{ fa: string; fb: string; severity: '高' | '中' | '低'; desc: string }> = [];
          const rf = relOf('reform'); const pr = relOf('pragmatic');
          const cy = relOf('cyl');    const tc = relOf('techno'); const lc = relOf('local');
          if (Math.abs(rf - pr) > 35) conflicts.push({
            fa: 'reform', fb: 'pragmatic',
            severity: Math.abs(rf - pr) > 55 ? '高' : '中',
            desc: `改革派与务实派路线张力达 ${Math.abs(rf - pr)} 点，双方在施政方向上形成明显对立，重大政策审批将遭遇激烈博弈。`,
          });
          if (lc >= 60 && rf <= 40) conflicts.push({
            fa: 'local', fb: 'reform',
            severity: '中',
            desc: `地方实力派（关系 ${lc}）与改革派（关系 ${rf}）因土地开发与市场化路线产生利益分歧，地方派倾向阻挠激进改革方案。`,
          });
          if (tc >= 70 && cy <= 35) conflicts.push({
            fa: 'techno', fb: 'cyl',
            severity: '低',
            desc: `技术官僚系（关系 ${tc}）主导数字化议题，压缩了民生系在教育和青年事务上的话语权，双方存在政策资源竞争。`,
          });
          if (pr >= 65 && lc >= 65) conflicts.push({
            fa: 'pragmatic', fb: 'local',
            severity: '低',
            desc: `务实派与地方派双双保持高关系，形成保守-稳健联盟倾向，改革声音可能受到压制。`,
          });

          // 派系联动增益：多派高关系时的协同效果
          const synergies: Array<{ label: string; factions: string[]; active: boolean; effect: string }> = [
            {
              label: '改革-技术联盟',
              factions: ['reform', 'techno'],
              active: rf >= 60 && tc >= 60,
              effect: '每季度额外GDP+3，政绩加成+5%',
            },
            {
              label: '民生-务实稳定盘',
              factions: ['cyl', 'pragmatic'],
              active: cy >= 60 && pr >= 60,
              effect: '民生指数月度自然衰减减半，KPI评分稳定加成',
            },
            {
              label: '地方-技官发展引擎',
              factions: ['local', 'techno'],
              active: lc >= 65 && tc >= 65,
              effect: 'GDP+5%，基建项目政绩加成×1.2',
            },
            {
              label: '五派鼎立均衡格局',
              factions: ['reform', 'pragmatic', 'cyl', 'techno', 'local'],
              active: rf >= 50 && pr >= 50 && cy >= 50 && tc >= 50 && lc >= 50,
              effect: '晋升投票全员不反对，破格晋升概率+10%',
            },
          ];

          // 月度动态：基于当前关系数值生成叙事性事件描述
          const monthlyEvents: Array<{ icon: string; title: string; desc: string; color: string }> = [];
          if (rf >= 70) monthlyEvents.push({ icon: '📰', title: '改革派媒体发声', desc: '改革派系下的官方媒体本月高调报道您的施政亮点，政绩加成效果悄然扩散至全国舆论场。', color: '#1565C0' });
          if (pr >= 65) monthlyEvents.push({ icon: '🏛️', title: '国家系内部提名', desc: '务实派在内部会议上对您给予正面评价，您的名字出现在省部级储备干部内部推荐名单中。', color: '#455A64' });
          if (cy >= 60) monthlyEvents.push({ icon: '🎯', title: '团系推送民生政绩', desc: '共青团系统将您主导的民生项目作为全国样板进行宣推，民间好评度显著提升。', color: '#2E7D32' });
          if (tc >= 60) monthlyEvents.push({ icon: '🔬', title: '技官系发布评估报告', desc: '技官派智库发布施政质量评估，您的数字政务和产业创新数据获得最高评级，学术声誉提升。', color: '#4527A0' });
          if (lc >= 55) monthlyEvents.push({ icon: '💼', title: '地方派商业合作洽谈', desc: '地方实力派核心企业主动寻求合作，辖区招商引资渠道悄然拓宽，经济活力隐性提升。', color: '#BF360C' });
          if (rf <= 25) monthlyEvents.push({ icon: '⚠️', title: '改革派发出不满信号', desc: '改革派对您近期保守施政风格表达不满，内部会议中出现对您任职表现的质疑声音。', color: '#C62828' });
          if (lc <= 20) monthlyEvents.push({ icon: '🚧', title: '地方派设置隐性阻力', desc: '地方实力派对您的某项政策拖延执行，本月有两个基建项目审批被无故延迟。', color: '#E65100' });
          if (monthlyEvents.length === 0) monthlyEvents.push({ icon: '📊', title: '本月派系格局平稳', desc: '各大派系本月未出现明显动向，施政环境总体稳定，是推进长期规划的良好时机。', color: '#555' });

          const severityColor: Record<string, string> = { '高': '#C62828', '中': '#E65100', '低': '#F9A825' };
          const activeSynergies = synergies.filter(s => s.active);

          return (
            <View style={{ gap: 12 }}>
              {/* ─ 本月派系动态 ─ */}
              <View style={{ backgroundColor: '#1D3A5C', padding: 14 }}>
                <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2, marginBottom: 10 }}>本月派系动态 · 实时情报</Text>
                {monthlyEvents.map((ev, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, backgroundColor: 'rgba(255,255,255,0.06)', padding: 10 }}>
                    <Text style={{ fontSize: 18, lineHeight: 22 }}>{ev.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 3 }}>{ev.title}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, lineHeight: 15 }}>{ev.desc}</Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* ─ 当前冲突态势 ─ */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#C62828' }}>
                <View style={{ backgroundColor: '#7f1414', padding: 12 }}>
                  <Text style={{ color: '#FFB3B3', fontSize: 9, letterSpacing: 2 }}>CONFLICT MONITOR</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>⚡ 派系冲突态势</Text>
                </View>
                <View style={{ padding: 14, gap: 10 }}>
                  {conflicts.length === 0 ? (
                    <View style={{ backgroundColor: '#F1F8E9', borderWidth: 1, borderColor: '#A5D6A7', padding: 12, alignItems: 'center', gap: 4 }}>
                      <Text style={{ fontSize: 18 }}>☮️</Text>
                      <Text style={{ color: '#2E7D32', fontSize: 12, fontWeight: '700' }}>当前无明显派系冲突</Text>
                      <Text style={{ color: '#558B2F', fontSize: 10, textAlign: 'center', lineHeight: 15 }}>各派关系较为均衡，政治生态稳定，适合推进重大改革。</Text>
                    </View>
                  ) : conflicts.map((c, i) => {
                    const faName = FACTIONS.find(f => f.key === c.fa)?.short ?? c.fa;
                    const fbName = FACTIONS.find(f => f.key === c.fb)?.short ?? c.fb;
                    const faIcon = FACTIONS.find(f => f.key === c.fa)?.icon ?? '';
                    const fbIcon = FACTIONS.find(f => f.key === c.fb)?.icon ?? '';
                    return (
                      <View key={i} style={{ borderWidth: 1, borderColor: severityColor[c.severity] + '50', borderLeftWidth: 4, borderLeftColor: severityColor[c.severity], padding: 11 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <Text style={{ fontSize: 14 }}>{faIcon}</Text>
                          <Text style={{ color: '#111', fontSize: 11, fontWeight: '700' }}>{faName}</Text>
                          <Text style={{ color: '#888', fontSize: 12 }}>⇌</Text>
                          <Text style={{ fontSize: 14 }}>{fbIcon}</Text>
                          <Text style={{ color: '#111', fontSize: 11, fontWeight: '700' }}>{fbName}</Text>
                          <View style={{ marginLeft: 'auto', backgroundColor: severityColor[c.severity] + '18', paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: severityColor[c.severity] }}>
                            <Text style={{ fontSize: 9, color: severityColor[c.severity], fontWeight: '700' }}>冲突{c.severity}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{c.desc}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* ─ 多派联动增益 ─ */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#2a7a3b' }}>
                <View style={{ backgroundColor: '#1B4A2A', padding: 12 }}>
                  <Text style={{ color: '#A5D6A7', fontSize: 9, letterSpacing: 2 }}>SYNERGY BONUS</Text>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>🤝 多派联动增益</Text>
                </View>
                <View style={{ padding: 14, gap: 8 }}>
                  {activeSynergies.length > 0 && (
                    <View style={{ backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7', padding: 10, marginBottom: 4 }}>
                      <Text style={{ color: '#1B5E20', fontSize: 10, fontWeight: '700', marginBottom: 4 }}>✅ 当前激活 {activeSynergies.length} 项联动增益</Text>
                      {activeSynergies.map((s, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginBottom: 3 }}>
                          <Text style={{ color: '#2E7D32', fontSize: 12 }}>◆</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ color: '#1B5E20', fontSize: 10, fontWeight: '700' }}>{s.label}</Text>
                            <Text style={{ color: '#33691E', fontSize: 10, lineHeight: 15 }}>{s.effect}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  {synergies.map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 10, backgroundColor: s.active ? '#F1F8E9' : '#FAFAFA', borderWidth: 1, borderColor: s.active ? '#A5D6A7' : '#E0E0E0', opacity: s.active ? 1 : 0.7 }}>
                      <Text style={{ fontSize: 16, lineHeight: 20 }}>{s.active ? '✅' : '🔒'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: s.active ? '#1B5E20' : '#555', marginBottom: 3 }}>{s.label}</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                          {s.factions.map(fk => {
                            const fc = FACTIONS.find(f => f.key === fk);
                            const rel2 = relOf(fk);
                            const needed = fk === 'local' || fk === 'techno' ? 65 : 60;
                            const met = rel2 >= needed;
                            return (
                              <View key={fk} style={{ backgroundColor: met ? fc?.accentColor ?? '#888' : '#CCC', paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{fc?.short ?? fk} {rel2}</Text>
                              </View>
                            );
                          })}
                        </View>
                        <Text style={{ fontSize: 10, color: s.active ? '#33691E' : '#888', lineHeight: 15 }}>
                          {s.active ? '✓ 已激活：' : '🔒 未达成：'}{s.effect}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>

              {/* ─ 高阶行动解锁提示（rank10+）─ */}
              {save.rankLevel >= 10 && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#4527A0' }}>
                  <View style={{ backgroundColor: '#2A1580', padding: 12 }}>
                    <Text style={{ color: '#CE93D8', fontSize: 9, letterSpacing: 2 }}>HIGH-LEVEL ACTIONS UNLOCKED</Text>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', marginTop: 2 }}>⭐ 高阶派系行动已解锁</Text>
                  </View>
                  <View style={{ padding: 12 }}>
                    <Text style={{ color: '#555', fontSize: 11, lineHeight: 17, marginBottom: 10 }}>
                      已解锁 rank10+ 专属高阶派系行动，每项均具备更高政绩奖励与更深远的政治影响。前往「关系经营」标签中展开各派查看。
                    </Text>
                    {FACTIONS.map(f => {
                      const highActions = FACTION_ACTIONS.filter(a => a.fkey === f.key && a.minRank >= 10 && a.minRank <= save.rankLevel);
                      if (highActions.length === 0) return null;
                      return (
                        <View key={f.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <Text style={{ fontSize: 16 }}>{f.icon}</Text>
                          <Text style={{ fontSize: 11, color: '#333', fontWeight: '700', flex: 1 }}>{f.name}</Text>
                          <View style={{ backgroundColor: '#EDE7F6', paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ color: '#4527A0', fontSize: 9, fontWeight: '700' }}>{highActions.length} 项高阶行动</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          );
        })()}

        {/* ══════════ Tab 4：政见表态 ══════════ */}

        {activeTab === 'policy' && (
          <>
            <View style={{ backgroundColor: '#1D3A5C', padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
              <Text style={{ fontSize: 16, marginTop: 1 }}>📢</Text>
              <View>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', marginBottom: 3 }}>政见表态机制</Text>
                <Text style={{ color: '#8eb4d8', fontSize: 10, lineHeight: 16 }}>
                  公开表达政治立场，牵一发而动全身。每项表态都会同时影响多个派系关系，请深思熟虑后再行表态。
                </Text>
              </View>
            </View>
            {POLICY_STANCES.map(p => {
              const cd = isCool(p.key, p.cooldown);
              const gains = p.effects.filter(e => e.delta > 0);
              const losses = p.effects.filter(e => e.delta < 0);
              return (
                <View key={p.key} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#2B4B6F', padding: 14, opacity: cd ? 0.65 : 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{p.title}</Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>{p.subtitle}</Text>
                    </View>
                    {cd && (
                      <View style={{ backgroundColor: '#EEE', paddingHorizontal: 7, paddingVertical: 3, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#888' }}>冷却 {coolLeft(p.key, p.cooldown)}天</Text>
                      </View>
                    )}
                  </View>

                  {/* 派系影响预览 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
                    {gains.map(e => {
                      const fc = FACTIONS.find(f => f.key === e.fkey);
                      return (
                        <View key={e.fkey} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#A5D6A7', paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11 }}>{fc?.icon}</Text>
                          <Text style={{ fontSize: 10, color: '#1B5E20', fontWeight: '600' }}>{fc?.short} +{e.delta}</Text>
                        </View>
                      );
                    })}
                    {losses.map(e => {
                      const fc = FACTIONS.find(f => f.key === e.fkey);
                      return (
                        <View key={e.fkey} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#FFCDD2', paddingHorizontal: 7, paddingVertical: 3 }}>
                          <Text style={{ fontSize: 11 }}>{fc?.icon}</Text>
                          <Text style={{ fontSize: 10, color: '#B71C1C', fontWeight: '600' }}>{fc?.short} {e.delta}</Text>
                        </View>
                      );
                    })}
                    <View style={{ backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9', paddingHorizontal: 7, paddingVertical: 3 }}>
                      <Text style={{ fontSize: 10, color: '#1565C0', fontWeight: '600' }}>政绩 +{p.merit}</Text>
                    </View>
                    {p.gdpDelta > 0 && (
                      <View style={{ backgroundColor: '#F3E5F5', borderWidth: 1, borderColor: '#CE93D8', paddingHorizontal: 7, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, color: '#6A1B9A' }}>GDP +{p.gdpDelta}</Text>
                      </View>
                    )}
                    {p.livelihoodDelta > 0 && (
                      <View style={{ backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFE082', paddingHorizontal: 7, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 10, color: '#F57F17' }}>民生 +{p.livelihoodDelta}</Text>
                      </View>
                    )}
                  </View>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9, color: '#AAA' }}>冷却周期：{p.cooldown} 天</Text>
                    <Pressable
                      onPress={() => handlePolicyStance(p)}
                      style={{ backgroundColor: cd ? '#CCC' : '#2B4B6F', paddingHorizontal: 18, paddingVertical: 8 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{cd ? '表态冷却中' : '公开表态'}</Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* ══════════ Tab 4：上司经营 ══════════ */}
        {activeTab === 'bosses' && (
          <>
            {/* 直属上司 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#2B4B6F', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 44, height: 44, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>👔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 9, color: '#888', letterSpacing: 1 }}>直属上司 · {rankConfig?.bossTitle ?? ''}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111', marginTop: 2 }}>{save.bossName || rankConfig?.bossTitle ?? ''}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', fontVariant: ['tabular-nums'], color: save.bossFavor >= 60 ? '#2E7D32' : save.bossFavor >= 25 ? '#E65100' : '#B71C1C' }}>
                    {save.bossFavor}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#888' }}>好感度</Text>
                </View>
              </View>
              <RelBar value={save.bossFavor} color="#2B4B6F" />
              <View style={{ gap: 6, marginTop: 12 }}>
                {BOSS_ACTIONS.filter(a => a.bossLevel === 1).map(action => {
                  const cd = isCool(action.key, action.cooldown);
                  return (
                    <Pressable
                      key={action.key}
                      onPress={() => handleBossAction(action)}
                      style={{ borderWidth: 1, borderColor: cd ? '#EEE' : '#D0D8E4', padding: 11, opacity: cd ? 0.6 : 1 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#111', marginBottom: 2 }}>{action.label}</Text>
                          <Text style={{ fontSize: 10, color: '#666', lineHeight: 15 }}>{action.desc}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 4 }}>
                          <View style={{ backgroundColor: cd ? '#EEE' : '#2B4B6F', paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ color: cd ? '#888' : '#fff', fontSize: 10, fontWeight: '700' }}>
                              {cd ? `${coolLeft(action.key, action.cooldown)}天` : '执行'}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 9, color: '#AAA' }}>好感+{action.favorDelta}{action.meritDelta ? ` 政绩+${action.meritDelta}` : ''}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* 二级上司 */}
            {save.boss2Name ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#455A64', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: '#455A64', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 20 }}>🤝</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: '#888', letterSpacing: 1 }}>二级上司 · {rankConfig?.bossTitle2 ?? ''}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#222', marginTop: 2 }}>{save.boss2Name}</Text>
                  </View>
                  <Text style={{ fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'], color: save.boss2Favor >= 60 ? '#2E7D32' : save.boss2Favor >= 25 ? '#E65100' : '#B71C1C' }}>
                    {save.boss2Favor}
                  </Text>
                </View>
                <RelBar value={save.boss2Favor} color="#455A64" />
                <View style={{ gap: 6, marginTop: 12 }}>
                  {BOSS_ACTIONS.filter(a => a.bossLevel === 2).map(action => {
                    const cd = isCool(action.key, action.cooldown);
                    return (
                      <Pressable
                        key={action.key}
                        onPress={() => handleBossAction(action)}
                        style={{ borderWidth: 1, borderColor: cd ? '#EEE' : '#D0D8E4', padding: 10, opacity: cd ? 0.6 : 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#222', marginBottom: 2 }}>{action.label}</Text>
                            <Text style={{ fontSize: 10, color: '#666' }}>{action.desc}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 3 }}>
                            <View style={{ backgroundColor: cd ? '#EEE' : '#455A64', paddingHorizontal: 10, paddingVertical: 4 }}>
                              <Text style={{ color: cd ? '#888' : '#fff', fontSize: 10, fontWeight: '700' }}>
                                {cd ? `${coolLeft(action.key, action.cooldown)}天` : '执行'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 9, color: '#AAA' }}>好感+{action.favorDelta}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* 三级上司 */}
            {save.boss3Name ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', borderTopWidth: 3, borderTopColor: '#78909C', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <View style={{ width: 36, height: 36, backgroundColor: '#78909C', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>🎩</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: '#888', letterSpacing: 1 }}>三级上司 · {rankConfig?.bossTitle3 ?? '上级领导'}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#333', marginTop: 2 }}>{save.boss3Name}</Text>
                  </View>
                  <Text style={{ fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'], color: save.boss3Favor >= 60 ? '#2E7D32' : save.boss3Favor >= 25 ? '#E65100' : '#B71C1C' }}>
                    {save.boss3Favor}
                  </Text>
                </View>
                <RelBar value={save.boss3Favor} color="#78909C" />
                <View style={{ gap: 6, marginTop: 10 }}>
                  {BOSS_ACTIONS.filter(a => a.bossLevel === 3).map(action => {
                    const cd = isCool(action.key, action.cooldown);
                    return (
                      <Pressable
                        key={action.key}
                        onPress={() => handleBossAction(action)}
                        style={{ borderWidth: 1, borderColor: cd ? '#EEE' : '#D0D8E4', padding: 10, opacity: cd ? 0.6 : 1 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 11, fontWeight: '600', color: '#333', marginBottom: 2 }}>{action.label}</Text>
                            <Text style={{ fontSize: 10, color: '#666' }}>{action.desc}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end', gap: 3 }}>
                            <View style={{ backgroundColor: cd ? '#EEE' : '#78909C', paddingHorizontal: 10, paddingVertical: 4 }}>
                              <Text style={{ color: cd ? '#888' : '#fff', fontSize: 10, fontWeight: '700' }}>
                                {cd ? `${coolLeft(action.key, action.cooldown)}天` : '执行'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 9, color: '#AAA' }}>好感+{action.favorDelta}</Text>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* 规则说明 */}
            <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#CBD5E1', padding: 12 }}>
              <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', marginBottom: 6 }}>上司关系影响说明</Text>
              <Text style={{ fontSize: 10, color: '#555', lineHeight: 17 }}>
                · 直属上司好感 {'<'} 25：工作推进阻力显著增大，KPI扣分风险上升{'\n'}
                · 直属上司好感 ≥ 60：晋升审批加快，突发事件通过率+15%{'\n'}
                · 二级上司好感影响组织部推荐，三级影响省委/中央背书{'\n'}
                · 每位上司有任期限制，届满后将更换，届时好感度归零重置
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ── 主派选择弹窗 ── */}
      {choosingPrimary && (
        <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1D3A5C', width: '92%', maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)' }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, letterSpacing: 2 }}>政治归属</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 2 }}>选择主派系</Text>
              </View>
              <Pressable onPress={() => setChoosingPrimary(false)}>
                <Text style={{ color: '#8eb4d8', fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            {save.primaryFaction && (
              <View style={{ backgroundColor: 'rgba(255,200,0,0.15)', padding: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 14 }}>⚠️</Text>
                <Text style={{ flex: 1, color: '#FFD700', fontSize: 10, lineHeight: 16 }}>
                  您已有主派归属，更换主派需消耗 <Text style={{ fontWeight: '700' }}>100 政绩</Text>（当前：{Math.floor(save.meritPoints ?? 0)}）
                </Text>
              </View>
            )}
            <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
              {FACTIONS.map(f => {
                const isCurrent = save.primaryFaction === f.key;
                const rel = relOf(f.key);
                return (
                  <Pressable
                    key={f.key}
                    onPress={() => handleChoosePrimary(f.key)}
                    style={{ backgroundColor: isCurrent ? f.accentColor : 'rgba(255,255,255,0.07)', padding: 14, flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderWidth: 1, borderColor: isCurrent ? f.accentColor : 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ fontSize: 26, marginTop: 2 }}>{f.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{f.name}</Text>
                        {isCurrent && <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: '#1D3A5C', fontSize: 8, fontWeight: '700' }}>当前</Text></View>}
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 15, marginBottom: 6 }}>{f.tagline}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>当前关系：</Text>
                        <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>{rel}</Text>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9 }}>加入可得 +20</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* ══════════ Tab 6：派系内部层级 ══════════ */}
      {activeTab === 'rank' && (() => {
        const rank = save.factionInternalRank ?? 'member';
        const pts  = save.factionPoints ?? 0;
        const primaryCfgRank = FACTIONS.find(f => f.key === save.primaryFaction);
        const RANK_CONFIG_LOCAL = [
          { key: 'member',   label: '普通成员', icon: '🟢', next: 'backbone', needed: 50,  color: '#4CAF50', desc: '刚入派系，享有基础庇护，可参与派系低级活动' },
          { key: 'backbone', label: '核心骨干', icon: '🔵', next: 'leader',   needed: 150, color: '#2196F3', desc: '深度参与派系决策，提名晋升时享受额外加权，可影响地方人事' },
          { key: 'leader',   label: '派系领袖', icon: '👑', next: null,       needed: 0,   color: '#FFD700', desc: '成为派系实际核心，可主导派系内部政治资源分配，晋升加成最高' },
        ];
        const rankData = RANK_CONFIG_LOCAL.find(r => r.key === rank)!;
        const nextRankData = RANK_CONFIG_LOCAL.find(r => r.key === rankData.next);
        const progress = nextRankData ? Math.min(100, Math.round((pts / nextRankData.needed) * 100)) : 100;

        // 升级行动：消耗政绩和资金提升派系积分
        const RANK_ACTIONS = [
          { key: 'attend_meeting', label: '参加派系内部会议', icon: '🏛️', pointsGain: 5, meritCost: 0, fundCost: 0, cooldownDays: 7, desc: '出席派系内部会议，提升存在感，增加5积分' },
          { key: 'submit_report',  label: '提交政绩报告给派系', icon: '📊', pointsGain: 8, meritCost: 0, fundCost: 0, cooldownDays: 14, desc: '向派系核心提交优秀政绩报告，增加8积分' },
          { key: 'fund_activity',  label: '资助派系活动经费',  icon: '💰', pointsGain: 15, meritCost: 0, fundCost: 100000, cooldownDays: 30, desc: '出资10万资助派系活动，大幅提升积分+15' },
          { key: 'lobby_support',  label: '游说争取派系资源',  icon: '🤝', pointsGain: 20, meritCost: 10, fundCost: 200000, cooldownDays: 60, desc: '联合争取政策资源，消耗10政绩+20万，积分+20' },
        ];

        return (
          <View style={{ gap: 10 }}>
            {!save.primaryFaction ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 20, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 28 }}>⚠️</Text>
                <Text style={{ color: '#555', fontSize: 14, fontWeight: '700' }}>尚未加入主派系</Text>
                <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>请先在「格局总览」选择主派系，才能提升派系内部层级</Text>
                <Pressable onPress={() => setActiveTab('overview')} style={{ backgroundColor: '#1D3A5C', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 4, marginTop: 4 }}>
                  <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>前往选择主派系</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* 当前层级 */}
                <View style={{ backgroundColor: '#1D3A5C', padding: 14 }}>
                  <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2, marginBottom: 10 }}>
                    {primaryCfgRank?.name ?? ''} · 内部层级
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <Text style={{ fontSize: 36 }}>{rankData.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{rankData.label}</Text>
                        <View style={{ backgroundColor: rankData.color + '30', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: rankData.color + '60' }}>
                          <Text style={{ color: rankData.color, fontSize: 10, fontWeight: '800' }}>Lv.{RANK_CONFIG_LOCAL.findIndex(r => r.key === rank) + 1}</Text>
                        </View>
                      </View>
                      <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>{rankData.desc}</Text>
                    </View>
                  </View>
                  {nextRankData && (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                        <Text style={{ color: '#8eb4d8', fontSize: 10 }}>升级进度 → {nextRankData.label}</Text>
                        <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>{pts} / {nextRankData.needed} 积分</Text>
                      </View>
                      <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                        <View style={{ height: '100%', width: `${progress}%`, backgroundColor: nextRankData.color, borderRadius: 4 }} />
                      </View>
                      {progress >= 100 && (
                        <View style={{ backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: '#FFD700', padding: 10, borderRadius: 4, marginTop: 10 }}>
                          <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: '800', textAlign: 'center' }}>🎉 积分已满！可申请晋升至{nextRankData.label}</Text>
                        </View>
                      )}
                    </>
                  )}
                  {rank === 'leader' && (
                    <View style={{ backgroundColor: 'rgba(255,215,0,0.15)', borderWidth: 1, borderColor: '#FFD700', padding: 12, borderRadius: 4, marginTop: 6 }}>
                      <Text style={{ color: '#FFD700', fontSize: 13, fontWeight: '900', textAlign: 'center' }}>👑 你已是派系领袖，掌控派系最高政治资源</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, textAlign: 'center', marginTop: 4 }}>晋升审批：+30%加权 · 人事提名权 · 派系保护最高级</Text>
                    </View>
                  )}
                </View>

                {/* 三级层级路线 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 14 }}>
                  <Text style={{ fontSize: 10, color: '#666', letterSpacing: 2, fontWeight: '700', marginBottom: 12 }}>层级晋升路线</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    {RANK_CONFIG_LOCAL.map((r, i) => {
                      const isCurrent = r.key === rank;
                      const isPast = RANK_CONFIG_LOCAL.findIndex(x => x.key === rank) > i;
                      return (
                        <View key={r.key} style={{ flex: 1, alignItems: 'center', gap: 5 }}>
                          <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                            backgroundColor: isCurrent ? r.color : isPast ? r.color + '60' : '#F0F0F0',
                            borderWidth: isCurrent ? 2 : 1, borderColor: isCurrent ? r.color : '#DDD' }}>
                            <Text style={{ fontSize: 16 }}>{r.icon}</Text>
                          </View>
                          <Text style={{ fontSize: 10, fontWeight: isCurrent ? '800' : '400',
                            color: isCurrent ? r.color : isPast ? '#888' : '#AAA', textAlign: 'center' }}>{r.label}</Text>
                          {r.next && <Text style={{ fontSize: 18, color: '#CCC', marginTop: -4 }}>›</Text>}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 层级加成说明 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 14 }}>
                  <Text style={{ fontSize: 10, color: '#666', letterSpacing: 2, fontWeight: '700', marginBottom: 10 }}>层级专属加成</Text>
                  {[
                    { icon: '🟢', rank: '普通成员', bonuses: ['派系基础庇护（巡视风险-5）', '组织部提名额外+1票'] },
                    { icon: '🔵', rank: '核心骨干', bonuses: ['派系庇护升级（巡视风险-15）', '晋升审批+15%加权', '地方人事影响力+10'] },
                    { icon: '👑', rank: '派系领袖', bonuses: ['派系全面保护（巡视风险-30）', '晋升审批+30%加权', '人事提名一票否决权', '传承系统解锁：可传承50%派系资源'] },
                  ].map(item => (
                    <View key={item.rank} style={{ marginBottom: 10, padding: 10, backgroundColor: '#F9F9F9', borderRadius: 6,
                      borderLeftWidth: 3, borderLeftColor: item.icon === '👑' ? '#FFD700' : item.icon === '🔵' ? '#2196F3' : '#4CAF50',
                      opacity: RANK_CONFIG_LOCAL.findIndex(r => r.label === item.rank) <= RANK_CONFIG_LOCAL.findIndex(r => r.key === rank) ? 1 : 0.45 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '800', color: '#333' }}>{item.rank}</Text>
                      </View>
                      {item.bonuses.map(b => (
                        <Text key={b} style={{ fontSize: 11, color: '#555', marginLeft: 20, marginTop: 2 }}>• {b}</Text>
                      ))}
                    </View>
                  ))}
                </View>

                {/* 积分行动 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 14 }}>
                  <Text style={{ fontSize: 10, color: '#666', letterSpacing: 2, fontWeight: '700', marginBottom: 12 }}>获取积分行动</Text>
                  {RANK_ACTIONS.map(action => {
                    const onCooldown = isCool(action.key, action.cooldownDays);
                    const remaining = coolLeft(action.key, action.cooldownDays);
                    const canAfford = (save.fundBalance ?? 0) >= action.fundCost && (save.meritPoints ?? 0) >= action.meritCost;
                    const disabled = onCooldown || !canAfford || !save.primaryFaction;
                    return (
                      <View key={action.key} style={{ padding: 12, backgroundColor: '#F9F9F9', borderRadius: 6, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                          <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#222' }}>{action.label}</Text>
                            <Text style={{ fontSize: 11, color: '#666', marginTop: 3, lineHeight: 15 }}>{action.desc}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 5 }}>
                              <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                                <Text style={{ fontSize: 10, color: '#1565C0', fontWeight: '700' }}>+{action.pointsGain} 积分</Text>
                              </View>
                              {action.fundCost > 0 && <View style={{ backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                                <Text style={{ fontSize: 10, color: '#E65100', fontWeight: '700' }}>-{action.fundCost / 10000}万</Text>
                              </View>}
                              {action.meritCost > 0 && <View style={{ backgroundColor: '#F3E5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                                <Text style={{ fontSize: 10, color: '#6A1B9A', fontWeight: '700' }}>-{action.meritCost} 政绩</Text>
                              </View>}
                              <View style={{ backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                                <Text style={{ fontSize: 10, color: '#888' }}>冷却 {action.cooldownDays} 天</Text>
                              </View>
                            </View>
                          </View>
                        </View>
                        <Pressable
                          onPress={async () => {
                            if (disabled) return;
                            const updates: Record<string, unknown> = { factionPoints: Math.min(999, pts + action.pointsGain) };
                            if (action.fundCost > 0) updates.fundBalance = (save.fundBalance ?? 0) - action.fundCost;
                            if (action.meritCost > 0) updates.meritPoints = (save.meritPoints ?? 0) - action.meritCost;
                            // 自动升级检查
                            const newPts = (pts + action.pointsGain);
                            if (rank === 'member' && newPts >= 50) { updates.factionInternalRank = 'backbone'; updates.factionPoints = newPts - 50; }
                            if (rank === 'backbone' && newPts >= 150) { updates.factionInternalRank = 'leader'; updates.factionPoints = newPts - 150; }
                            await updateGameSave(updates as Parameters<typeof updateGameSave>[0]);
                            markCool(action.key);
                            showFeedback(`✓ ${action.label}：派系积分 +${action.pointsGain}${updates.factionInternalRank ? `，已升级为${updates.factionInternalRank === 'backbone' ? '核心骨干' : '派系领袖'}！` : ''}`, true);
                          }}
                          disabled={disabled}
                          style={{ borderRadius: 4, paddingVertical: 10, alignItems: 'center',
                            backgroundColor: disabled ? '#F0F0F0' : '#1D3A5C' }}>
                          <Text style={{ color: disabled ? '#AAA' : '#FFD700', fontWeight: '700', fontSize: 13 }}>
                            {onCooldown ? `冷却中 (${remaining}天)` : !canAfford ? '资源不足' : '执行行动'}
                          </Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        );
      })()}

      {/* ══════════ Tab 7：势力版图 ══════════ */}
      {activeTab === 'territory' && (() => {
        // 静态省级一把手派系归属（NPC 默认基线，玩家晋升后被动态覆盖）
        const PROVINCE_FACTION_BASE: { name: string; abbr: string; icon: string; faction: string; secretary: string }[] = [
          { name: '粤海省',   abbr: '粤', icon: '🌺', faction: 'reform',     secretary: '黄坤明' },
          { name: '汉东省',   abbr: '苏', icon: '🌾', faction: 'pragmatic',  secretary: '信长星' },
          { name: '齐鲁省',   abbr: '鲁', icon: '⛵', faction: 'economy',    secretary: '林武' },
          { name: '瓯越省',   abbr: '浙', icon: '🍵', faction: 'reform',     secretary: '易炼红' },
          { name: '沪海市',   abbr: '沪', icon: '🏙️', faction: 'economy',    secretary: '陈吉宁' },
          { name: '中原省',   abbr: '豫', icon: '🌽', faction: 'pragmatic',  secretary: '楼阳生' },
          { name: '蜀州省',   abbr: '川', icon: '🐼', faction: 'neutral',    secretary: '王晓晖' },
          { name: '楚北省',   abbr: '鄂', icon: '🌸', faction: 'pragmatic',  secretary: '王蒙徽' },
          { name: '闽南省',   abbr: '闽', icon: '🌊', faction: 'reform',     secretary: '周祖翼' },
          { name: '京都市',   abbr: '京', icon: '🏯', faction: 'discipline', secretary: '尹力' },
          { name: '楚南省',   abbr: '湘', icon: '🏔️', faction: 'neutral',    secretary: '沈晓明' },
          { name: '皖淮省',   abbr: '皖', icon: '🌿', faction: 'pragmatic',  secretary: '梁言顺' },
          { name: '秦陕省',   abbr: '陕', icon: '🏺', faction: 'economy',    secretary: '赵一德' },
          { name: '黔贵省',   abbr: '黔', icon: '🌄', faction: 'neutral',    secretary: '徐麟' },
          { name: '滇南省',   abbr: '滇', icon: '🌻', faction: 'neutral',    secretary: '王宁' },
          { name: '洪都省',   abbr: '赣', icon: '🌹', faction: 'reform',     secretary: '尹弘' },
          { name: '渝江市',   abbr: '渝', icon: '🌉', faction: 'pragmatic',  secretary: '袁家军' },
          { name: '辽东省',   abbr: '辽', icon: '❄️', faction: 'discipline', secretary: '郝鹏' },
          { name: '乌龙江省', abbr: '黑', icon: '🌲', faction: 'pragmatic',  secretary: '许勤' },
          { name: '吉阳省',   abbr: '吉', icon: '🌾', faction: 'economy',    secretary: '景俊海' },
          { name: '晋阳省',   abbr: '晋', icon: '⛏️', faction: 'discipline', secretary: '任振鹤' },
          { name: '西域自治区', abbr: '新', icon: '🏜️', faction: 'discipline', secretary: '马兴瑞' },
          { name: '漠北自治区', abbr: '蒙', icon: '🐎', faction: 'pragmatic',  secretary: '孙绍骋' },
          { name: '陇西省',   abbr: '甘', icon: '🌵', faction: 'neutral',    secretary: '胡昌升' },
          { name: '宁夏回族自治区', abbr: '宁', icon: '🌙', faction: 'reform', secretary: '张雨浦' },
          { name: '青藏高原省', abbr: '藏', icon: '🏔️', faction: 'discipline', secretary: '王君正' },
          { name: '青海省',   abbr: '青', icon: '🦅', faction: 'neutral',    secretary: '陈刚' },
          { name: '海南岛',   abbr: '琼', icon: '🌴', faction: 'reform',     secretary: '冯飞' },
          { name: '津沽市',   abbr: '津', icon: '⚓', faction: 'economy',    secretary: '陈敏尔' },
          { name: '燕山市',   abbr: '冀', icon: '🦁', faction: 'pragmatic',  secretary: '倪岳峰' },
          { name: '桂南省',   abbr: '桂', icon: '🎋', faction: 'neutral',    secretary: '刘宁' },
        ];

        // 动态合并：factionProvinceMap 中有记录的省份覆盖静态数据
        const dynMap = save.factionProvinceMap ?? {};
        // playerFaction key→版图 faction key 映射（PlayerSave 用cyl/techno/local，版图用neutral/economy/discipline）
        const PF_TO_TERRITORY: Record<string, string> = {
          reform: 'reform', pragmatic: 'pragmatic',
          cyl: 'neutral', techno: 'economy', local: 'discipline',
        };
        const PROVINCE_FACTION = PROVINCE_FACTION_BASE.map(p => {
          const dynRaw = dynMap[p.abbr];
          const dynFaction = dynRaw ? (PF_TO_TERRITORY[dynRaw] ?? dynRaw) : null;
          return dynFaction ? { ...p, faction: dynFaction, secretary: dynRaw === save.primaryFaction ? `${save.playerName}（玩家）` : p.secretary } : p;
        });

        // 统计各派系控制省份数（含动态更新后的数据）
        const dynamicProvinceCount = Object.keys(dynMap).length;

        // 派系配置（颜色与名称）
        const FACTION_UI: Record<string, { name: string; short: string; color: string; bg: string; icon: string }> = {
          reform:     { name: '改革开放系', short: '改革系', color: '#1565C0', bg: '#E3F2FD', icon: '🔷' },
          pragmatic:  { name: '稳健国家系', short: '国家系', color: '#1B5E20', bg: '#E8F5E9', icon: '🟩' },
          neutral:    { name: '共青团系',   short: '团派系', color: '#E65100', bg: '#FFF3E0', icon: '🟧' },
          economy:    { name: '技术官僚系', short: '技术系', color: '#4A148C', bg: '#F3E5F5', icon: '🟪' },
          discipline: { name: '纪检法治系', short: '纪检系', color: '#B71C1C', bg: '#FFEBEE', icon: '🟥' },
        };

        // 统计各派系省份数
        const counts: Record<string, number> = {};
        PROVINCE_FACTION.forEach(p => { counts[p.faction] = (counts[p.faction] ?? 0) + 1; });
        const total = PROVINCE_FACTION.length;

        // 玩家主派系 key（转换为版图 faction key）
        const playerFactionRaw = save.primaryFaction ?? '';
        const playerFaction = PF_TO_TERRITORY[playerFactionRaw] ?? playerFactionRaw;
        const playerFactionUi = FACTION_UI[playerFaction];
        const myProvinces = PROVINCE_FACTION.filter(p => p.faction === playerFaction);

        return (
          <View style={{ gap: 10 }}>
            {/* 版图概览条 */}
            <View style={{ backgroundColor: '#1D3A5C', padding: 14 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>
                省级一把手 · 派系归属版图（共{total}个省级单位）
              </Text>
              {dynamicProvinceCount > 0 && (
                <Text style={{ color: '#FFD700', fontSize: 9, marginBottom: 8 }}>
                  🔄 已动态更新 {dynamicProvinceCount} 个省份归属
                </Text>
              )}
              {/* 比例条 */}
              <View style={{ flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 10 }}>
                {Object.entries(counts).map(([fk, cnt]) => {
                  const ui = FACTION_UI[fk];
                  return (
                    <View key={fk} style={{ flex: cnt, backgroundColor: ui?.color ?? '#555' }} />
                  );
                })}
              </View>
              {/* 图例 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(FACTION_UI).map(([fk, ui]) => (
                  <View key={fk} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: ui.color }} />
                    <Text style={{ color: '#8eb4d8', fontSize: 9 }}>{ui.short} {counts[fk] ?? 0}席</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* 玩家主派系控制区 */}
            {playerFaction ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: playerFactionUi?.color ?? '#555' }}>
                <View style={{ backgroundColor: playerFactionUi?.color ?? '#555', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18 }}>{playerFactionUi?.icon ?? '🔵'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD700', fontSize: 9, letterSpacing: 2, fontWeight: '700' }}>我方势力控制区</Text>
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>{playerFactionUi?.name ?? playerFaction}</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '900' }}>{myProvinces.length}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>省级单位</Text>
                  </View>
                </View>
                <View style={{ padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {myProvinces.length > 0 ? myProvinces.map(p => (
                    <View key={p.name} style={{ backgroundColor: playerFactionUi?.bg ?? '#eee', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: playerFactionUi?.color ?? '#555' }}>
                      <Text style={{ fontSize: 13 }}>{p.icon}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: playerFactionUi?.color ?? '#333', marginTop: 2 }}>{p.abbr}</Text>
                      <Text style={{ fontSize: 9, color: '#666', marginTop: 1 }}>{p.secretary}书记</Text>
                    </View>
                  )) : (
                    <Text style={{ color: '#999', fontSize: 12, padding: 8 }}>本派系暂无省级控制区</Text>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 20, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 28 }}>🗺️</Text>
                <Text style={{ color: '#555', fontSize: 13, fontWeight: '700' }}>尚未加入主派系</Text>
                <Text style={{ color: '#888', fontSize: 11, textAlign: 'center' }}>请先在「格局总览」选择主派系，才能查看我方控制区域</Text>
                <Pressable onPress={() => setActiveTab('overview')} style={{ backgroundColor: '#1D3A5C', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, marginTop: 4 }}>
                  <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 12 }}>前往选择主派系</Text>
                </Pressable>
              </View>
            )}

            {/* 全部派系省级分布 */}
            {Object.entries(FACTION_UI).map(([fk, ui]) => {
              const provinces = PROVINCE_FACTION.filter(p => p.faction === fk);
              const isMyFaction = fk === playerFaction;
              return (
                <View key={fk} style={{ backgroundColor: '#fff', borderWidth: isMyFaction ? 2 : 1, borderColor: isMyFaction ? ui.color : '#DDD' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: isMyFaction ? ui.color : '#F5F5F5' }}>
                    <Text style={{ fontSize: 16 }}>{ui.icon}</Text>
                    <Text style={{ flex: 1, fontSize: 12, fontWeight: '700', color: isMyFaction ? '#fff' : '#333' }}>
                      {ui.name}
                    </Text>
                    <View style={{ backgroundColor: isMyFaction ? 'rgba(255,255,255,0.2)' : ui.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: isMyFaction ? '#FFD700' : ui.color }}>{provinces.length} 席</Text>
                    </View>
                  </View>
                  <View style={{ padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {provinces.map(p => (
                      <View key={p.name} style={{ backgroundColor: ui.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 11 }}>{p.icon}</Text>
                        <Text style={{ fontSize: 10, color: ui.color, fontWeight: '700' }}>{p.abbr}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}

            <View style={{ backgroundColor: '#1D3A5C', padding: 12 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 1, lineHeight: 15 }}>
                📌 说明：省级控制区以当前省执政委书记的派系归属为准。一旦该干部离任或失去职位，该省将转为中立或由接任者派系控制。
              </Text>
            </View>
          </View>
        );
      })()}
    </View>
  );
}
