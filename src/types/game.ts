// 游戏核心类型定义

export type AssessmentGrade = '优秀' | '良好' | '合格' | '不合格';
export type TimeGranularity = '天' | '周' | '月';
export type TaskStatus = 'active' | 'completed' | 'failed' | 'expired';
export type CaseStatus = 'pending' | 'solving' | 'solved' | 'failed';
export type EventType = 'disaster' | 'corruption' | 'opinion' | 'economic' | 'security';
export type CaseType = 'criminal' | 'corruption' | 'drug' | 'fraud';
export type FactionType = 'reform' | 'pragmatic';
export type MarriageStatus = 'single' | 'married';
export type MemberType = 'spouse' | 'child';

// ============ 职级定义（对应华夏人民共和国公务员体系）============
export type RankConfig = {
  name: string;
  cityType: string;          // 城市层级描述
  requiredMerit: number;
  requiredTenureYears: number;
  maxTenureYears: number;
  randomCity: boolean;       // 晋升时是否随机换城市
  bossTitle: string;         // 直属上司职衔
  bossTitle2: string;        // 上司2职衔
  bossTitle3: string;        // 上司3职衔
  department: string;        // 所在单位
};

// ============ JSON 配置文件导入（数据与逻辑分离）============
import _ranksJson     from '@/config/ranks.json';
import _citiesJson    from '@/config/cities.json';
import _shopJson      from '@/config/shop.json';
import _positionsJson from '@/config/positions.json';
import _deptsJson     from '@/config/departments.json';

// ── 职级配置 ───────────────────────────────────────────────────
export const RANK_CONFIG = _ranksJson.RANK_CONFIG as unknown as Record<number, RankConfig>;
export const RANK_SALARY = _ranksJson.RANK_SALARY as unknown as Record<number, number>;
export const RANK_INITIAL_FUND = _ranksJson.RANK_INITIAL_FUND as unknown as Record<number, number>;
export const RANK_FUND_MULTIPLIER = _ranksJson.RANK_FUND_MULTIPLIER as unknown as Record<number, number>;
export const RANK_GROSS_SALARY = _ranksJson.RANK_GROSS_SALARY as unknown as Record<number, number>;
export const RANK_PERSONAL_SOCIAL_INSURANCE = _ranksJson.RANK_PERSONAL_SOCIAL_INSURANCE as unknown as Record<number, number>;
export const RANK_PERSONAL_HPF = _ranksJson.RANK_PERSONAL_HPF as unknown as Record<number, number>;
export const RANK_MONTHLY_ALLOWANCE = _ranksJson.RANK_MONTHLY_ALLOWANCE as unknown as Record<number, number>;
export const RANK_ANNUAL_BONUS_MONTHS = _ranksJson.RANK_ANNUAL_BONUS_MONTHS as unknown as Record<number, number>;
export const RANK_ALLOWANCE_DETAIL = _ranksJson.RANK_ALLOWANCE_DETAIL as unknown as Record<number, Array<{ label: string; amount: number }>>;
export const RANK_HOUSING = _ranksJson.RANK_HOUSING as unknown as Record<number, string | null>;

// MinistryInfo 显式声明（JSON 导入后不能用 typeof MINISTRY_POOL[number] 自推断）
export type MinistryInfo = { name: string; focus: string; emoji: string };

// ── 城市池 ────────────────────────────────────────────────────
export const CITY_POOLS = _citiesJson.CITY_POOLS as Record<string, string[]>;
export const MINISTRY_POOL = _citiesJson.MINISTRY_POOL as MinistryInfo[];
export const DEFAULT_CITY_BY_LEVEL = _citiesJson.DEFAULT_CITY_BY_LEVEL as unknown as Record<number, string>;

// ── 商城物品 ──────────────────────────────────────────────────
export const PURCHASABLE_ITEMS = _shopJson.PURCHASABLE_ITEMS as unknown as PurchasableItem[];

// ── 官员职位表 ────────────────────────────────────────────────
export const COUNTY_OFFICIAL_POSITIONS = _positionsJson.COUNTY_OFFICIAL_POSITIONS as unknown as CountyPosition[];
export const CITY_OFFICIAL_POSITIONS = _positionsJson.CITY_OFFICIAL_POSITIONS as unknown as CityPosition[];
export const PROVINCE_OFFICIAL_POSITIONS = _positionsJson.PROVINCE_OFFICIAL_POSITIONS as unknown as ProvincePosition[];
export const SUB_PROVINCE_CITY_POSITIONS = _positionsJson.SUB_PROVINCE_CITY_POSITIONS as unknown as SubProvincePosition[];

// ── 部门配置 ──────────────────────────────────────────────────
export const DEPT_CONFIG = _deptsJson.DEPT_CONFIG as unknown as Record<DeptKey, DeptConfig>;

export function getRandomMinistry(): MinistryInfo {
  return MINISTRY_POOL[Math.floor(Math.random() * MINISTRY_POOL.length)];
}

export function getRandomCityForRank(rankLevel: number): string {
  if (rankLevel >= 12) {
    const m = getRandomMinistry();
    return m.name;
  }
  const config = RANK_CONFIG[rankLevel];
  const pool = CITY_POOLS[config.cityType] ?? CITY_POOLS['地级市'];
  return pool[Math.floor(Math.random() * pool.length)];
}

// ============ 默认城市（固定起始，低级别动态生成）============
// rank 1-3 的真实起始镇名由 gameApi 中 randRealStartTown() 动态生成
// 此处保留 rank 4+ 的真实城市名
// ============ 头像系统 ============
// emoji池（角色创建时选择界面使用）
export const MALE_AVATARS = ['👨‍💼', '👨‍🏫', '👨‍⚕️', '👨‍🔬', '🧑‍💼', '👮‍♂️', '👨‍⚖️', '🧔', '👨‍🦱', '👨‍🦲'];
export const FEMALE_AVATARS = ['👩‍💼', '👩‍🏫', '👩‍⚕️', '👩‍🔬', '🧑‍💼', '👮‍♀️', '👩‍⚖️', '👩‍🦱', '👩‍🦳', '👩'];
export const SUB_MALE_AVATARS = ['🧑‍💼', '👨‍💻', '👨‍🏭', '👨‍🌾', '👨', '🧔‍♂️', '👱‍♂️', '👨‍🦯'];
export const SUB_FEMALE_AVATARS = ['👩‍💻', '👩‍🏭', '👩‍🌾', '👩', '👱‍♀️', '👩‍🦰', '🧕'];

// ── 卡通证件照图片池（NPC头像，扁平卡通风）──────────────────────
export const MALE_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_621c9218-19a0-43e9-b95d-f2d4ae3f9e92.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_924ae4e5-1a80-4181-9b8c-7339d311a0fc.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_99914b11-1dff-4dcf-858c-30f4e5eeb460.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_b7a5e3d5-c031-4df6-a678-a1dcdfe0c25b.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_00f033be-e75d-407f-aa89-77ce429e4328.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_5f219e03-1028-4de8-a9c2-ce7d6079f968.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_4ea31af7-d365-430e-8de7-1af355a47cd3.jpg',
  // 新增扁平卡通官员头像
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_b45972f2-4401-4764-bd0f-6ca4a4a145bb.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_d5608b5d-b503-4723-8a42-1e1067273717.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_c0202944-425b-412e-816b-19e759fef575.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_32026d5c-e7bf-480d-8799-3807d71d8c75.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_70af69aa-81a8-48a3-9a59-32e326579115.jpg',
];
export const FEMALE_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_6b0ad6c1-809a-47c3-ab75-3d678d663d27.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_25f1c571-9e3a-4802-8f48-e7190775540c.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_9b2d296a-6fa1-4ade-a808-c41467021031.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_140bb22d-7c64-43df-9b0b-9ce63580579f.jpg',
];
export const MILITARY_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_d8949df0-f9e9-41f1-9a17-58d7d38150b7.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_07ea4fbb-c32b-4d1d-861d-b0f48a6244ed.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/MiaoTu_82193f37-2b86-4edd-b6f4-a95cc3967fdb.jpg',
];
export const POLICE_AVATAR_URLS: string[] = [
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_2e801fd7-befc-4df1-8a77-0b519156ef51.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_c70863ab-b122-4ca5-8234-b74fa4cce9c1.jpg',
  'https://miaoda-site-img.cdn.bcebos.com/images/baidu_image_search_a635c1e5-604a-40da-aa51-ac399e1dded8.jpg',
];

// ============ 官员头像系统 ============
/** 根据 avatarId + 性别获取玩家头像 emoji（角色创建/旧UI兼容） */
export function getAvatarEmoji(avatarId: number, gender: string): string {
  const pool = gender === '女' ? FEMALE_AVATARS : MALE_AVATARS;
  return pool[avatarId % pool.length];
}

/** 根据 avatarId + 性别获取下属头像 emoji（兼容旧UI） */
export function getSubAvatarEmoji(avatarId: number, gender: string): string {
  const pool = gender === '女' ? SUB_FEMALE_AVATARS : SUB_MALE_AVATARS;
  return pool[avatarId % pool.length];
}

/** 根据 avatarId + 性别 + 职位关键字 返回卡通证件照 URL */
export function getAvatarImageUrl(avatarId: number, gender: string, positionLabel = ''): string {
  const isMil = /军委|战区|军区|军分区|人武部|海军|空军|陆军|火箭军|联勤|联参/.test(positionLabel);
  const isPol = /公安|警察|武警/.test(positionLabel);
  if (isMil) return MILITARY_AVATAR_URLS[avatarId % MILITARY_AVATAR_URLS.length];
  if (isPol) return POLICE_AVATAR_URLS[avatarId % POLICE_AVATAR_URLS.length];
  if (gender === '女') return FEMALE_AVATAR_URLS[avatarId % FEMALE_AVATAR_URLS.length];
  return MALE_AVATAR_URLS[avatarId % MALE_AVATAR_URLS.length];
}

/** 派系背景色（五大阵营） */
export const AVATAR_BG_BY_FACTION: Record<string, string[]> = {
  reform:     ['#1D3B5E', '#1a4a7a', '#253f6a', '#2b527e'],
  pragmatic:  ['#6B2020', '#7a2a2a', '#5a1a1a', '#8a3030'],
  neutral:    ['#2E6B3E', '#2a6040', '#1e5c38', '#356b45'],
  economy:    ['#7A5C00', '#8a6a10', '#6b4e00', '#9a7020'],
  discipline: ['#4A1A6B', '#5a2a7a', '#3d1255', '#621e8a'],
};

export function getAvatarBgColor(avatarId: number, faction: string): string {
  const pool = AVATAR_BG_BY_FACTION[faction] ?? AVATAR_BG_BY_FACTION['neutral'];
  return pool[avatarId % pool.length];
}

/** 文字首字（备用占位符） */
export function getAvatarChar(name: string): string {
  return name ? name[0] : '员';
}

// ============ 学校影响 ============
export const SCHOOL_BONUS: Record<string, number> = {
  '985院校': 10,
  '211院校': 5,
  '普通本科': 0,
  '大专院校': -5,
  '985院校（选调生）': 20,  // 中央选调生专属，能力加成更高
};

// ============ 学历类型 ============
export type DegreeType = '本科' | '硕士' | '博士';

/** 判断是否满足中央选调条件 */
export function canApplyZhongXuanDiao(school: string, degree: DegreeType): boolean {
  return school === '985院校' && (degree === '硕士' || degree === '博士');
}

/** 中央选调最低入职年龄（985硕士≥23岁，博士≥25岁）*/
export function getZhongXuanDiaoMinAge(degree: DegreeType): number {
  if (degree === '博士') return 25;
  if (degree === '硕士') return 23;
  return 22;
}

/** 选调生起始职级（硕士→副科/rank2，博士→正科/rank3）*/
export function getZhongXuanDiaoStartRank(degree: DegreeType): number {
  if (degree === '博士') return 3;  // 乡镇长（正科级）
  return 2;                          // 副乡镇长（副科级）
}

// ============ 个人薪资系统 ============
/** 各职级月薪（元/月，参照现实体制内薪资适当游戏化放大）*/
// ============ 个人薪资拆解系统（公积金 + 五险 + 补贴）============

/**
 * 各职级「应发工资」（税前），RANK_SALARY是税后到手
 * 公式参考：应发 = 职务工资 + 级别工资 + 地方补贴
 * 实际体制内税前约为税后的1.15~1.25倍（含扣缴五险一金后）
 */
// ============ 可购买物品系统 ============
export interface PurchasableItem {
  key: string;
  name: string;
  emoji: string;
  price: number;       // 单位：元
  desc: string;        // 效果描述
  effectDesc: string;  // 游戏效果
  category: '出行' | '房产' | '投资' | '进修' | '生活' | '礼品';
  // 效果数值（可选）
  meritBonus?: number;
  moralBonus?: number;
  abilityBonus?: number;
  familyHappiness?: number;
  bossFavorBonus?: number;
  isMonthlyReturn?: boolean; // 每月产生收益（股票）
  monthlyReturnRate?: number; // 月收益率（股票，可正可负）
}

// ============ 十四大职能部门（含信访办+组织部）============
export type DeptKey = 'police' | 'ndrc' | 'finance' | 'urban' | 'education' | 'health' | 'ecology' | 'market' | 'agriculture' | 'personnel' | 'invest' | 'tax' | 'petition' | 'organization' | 'propaganda' | 'discipline' | 'govoffice' | 'industry' | 'naturalres' | 'construction' | 'transport' | 'health2';

// ============ 五大阵营系统 ============
// reform=改革开放系（邓系/沿海改革），pragmatic=稳健国家主义（党管一切），
// neutral=共青团/民生系，economy=技术官僚/经济发展，discipline=纪检法治系
export type Faction = 'reform' | 'pragmatic' | 'neutral' | 'economy' | 'discipline';

export const FACTION_LABEL: Record<Faction, string> = {
  reform:     '改革开放系',
  pragmatic:  '稳健国家系',
  neutral:    '共青团/民生系',
  economy:    '技术官僚系',
  discipline: '纪检法治系',
};

// 短标签（用于NPC徽章等空间有限场景）
export const FACTION_SHORT: Record<Faction, string> = {
  reform:     '改革系',
  pragmatic:  '国家系',
  neutral:    '团系',
  economy:    '技官系',
  discipline: '纪检系',
};

export const FACTION_COLOR: Record<Faction, string> = {
  reform:     '#1A3B66',  // 深蓝：改革开放系
  pragmatic:  '#8B0000',  // 深红：稳健国家系
  neutral:    '#2E6B3E',  // 深绿：共青团/民生系
  economy:    '#7A5C00',  // 深金：技术官僚系
  discipline: '#4A1A6B',  // 深紫：纪检法治系
};

/** 各阵营的简要政治理念说明（对标现实中国政治生态）*/
export const FACTION_DESC: Record<Faction, string> = {
  reform:     '邓小平改革路线继承者，主张扩大对外开放、简政放权、允许市场在资源配置中发挥决定性作用；在沿海省份根基深厚，与外资企业界关系密切',
  pragmatic:  '强调党对一切工作的领导，以政治稳定为压倒一切的任务，主张国企做强做大、强化意识形态管理；在中央系统和北方省份影响力较强',
  neutral:    '发迹于共青团系统，长于群众工作与基层调研，主张以人民满意度为施政标尺，偏重民生投入与社会公平；在中西部和青年干部群体中有广泛基础',
  economy:    '理工科出身的专业技术型干部，以数据说话、追求治理现代化，主张大力发展数字经济和战略性新兴产业；在国家发改委、工业和信息化系统影响深远',
  discipline: '深耕纪委检察系统，以反腐肃纪为己任，主张将权力关进制度的笼子；在党的巡视组、肃宪督察院系统及政法机关广受重用，令各派系都有所忌惮',
};

/** 各阵营对重要人事任命的投票倾向（相互关系矩阵：正值=倾向赞成，负值=倾向反对）*/
export const FACTION_VOTE_BIAS: Record<Faction, Record<Faction, number>> = {
  // 改革系：欢迎改革同路人和技官，警惕国家系管控倾向和纪检干预
  reform:     { reform: 3, pragmatic: -2, neutral: 1,  economy: 2,  discipline: -1 },
  // 国家系：警惕改革系松动党纪，重视纪检系维护党权，对经济派保持工具性合作
  pragmatic:  { reform: -2, pragmatic: 3, neutral: -1, economy: 0,  discipline: 2  },
  // 团系：偏向改革开放路线，与国家系路线之争最为明显，倚重民生和教育投入
  neutral:    { reform: 1,  pragmatic: -2, neutral: 3, economy: 0,  discipline: 0  },
  // 技官系：最注重专业主义，与改革系天然亲近，与纪检系关系较差（担心干预业务）
  economy:    { reform: 2,  pragmatic: 0,  neutral: 0, economy: 3,  discipline: -2 },
  // 纪检系：超然于各派，对地方利益集团和经济系利益输送特别警惕
  discipline: { reform: -1, pragmatic: 2, neutral: 0,  economy: -2, discipline: 3 },
};

export const ALL_FACTIONS: Faction[] = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'];

// ============ 县级官职完整架构（正处/副处/正科/副科）============
/** 县级职位条目 */
export interface CountyPosition {
  key: string;          // 唯一标识
  title: string;        // 职位名称
  tier: '正处级' | '副处级' | '正科级' | '副科级';
  organ: '县委' | '县政府' | '县联邦国会' | '县国策协理堂' | '县纪委' | '政法' | '职能局' | '乡镇' | '团委' | '人武部';
  desc: string;         // 说明
  isHighProfile?: boolean;
  highProfileNote?: string;
}

// ============ 市级官职完整架构（正厅/副厅/正处/副处）============
export interface CityPosition {
  key: string;
  title: string;
  tier: '正厅级' | '副厅级' | '正处级' | '副处级';
  organ: '市委' | '市政府' | '市联邦国会' | '市国策协理堂' | '市纪委' | '政法' | '市直属局' | '区（县）' | '团委' | '军分区' | '市武警';
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}

// ============ 省级官职完整架构（正部/副部/正厅/副厅）============
export interface ProvincePosition {
  key: string;
  title: string;
  tier: '正部级' | '副部级' | '正厅级' | '副厅级';
  organ: '省执政委' | '省政府' | '省联邦国会' | '省国策协理堂' | '省纪委' | '政法' | '省直属厅' | '地市' | '团委' | '省军区' | '武警';
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}
export interface SubProvincePosition {
  key: string;
  title: string;
  tier: '副部级' | '正厅级' | '副厅级' | '正处级';
  organ: '市委' | '市政府' | '市联邦国会' | '市国策协理堂' | '市直属局' | '区委' | '区政府' | '街道' | '军分区' | '市武警';
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}

export function getCountyPositionsByTier(tier: CountyPosition['tier']): CountyPosition[] {
  return COUNTY_OFFICIAL_POSITIONS.filter(p => p.tier === tier);
}

// ============ 市级官职完整数据（正厅/副厅/正处/副处）============
export function getCityPositionsByTier(tier: CityPosition['tier']): CityPosition[] {
  return CITY_OFFICIAL_POSITIONS.filter(p => p.tier === tier);
}

// ============ 省级官职完整数据（正部/副部/正厅/副厅）============
export function getProvincePositionsByTier(tier: ProvincePosition['tier']): ProvincePosition[] {
  return PROVINCE_OFFICIAL_POSITIONS.filter(p => p.tier === tier);
}

// ============ 副省级城市官职架构（副部/正厅/副厅/正处）============
export function getSubProvincePositionsByTier(tier: SubProvincePosition['tier']): SubProvincePosition[] {
  return SUB_PROVINCE_CITY_POSITIONS.filter(p => p.tier === tier);
}

/** 重要人事任命的逐级审批层级 */
export type ApprovalLevel = '本级决定' | '县级联邦国会/组织部审批' | '地市级审批' | '省级审批' | '中央审批';

/**
 * 政府行政班子职位（本级决定，一键任命可直接通过）
 * 以 roleKey 前缀判断：gov / deputy_gov / exec_deputy / dep_gov / office / gov_sec / gov_office
 */
const GOV_ROLE_PREFIXES = [
  'town_deputy_gov', 'town_office_dir',       // 乡镇政府
  'cty_exec_deputy', 'cty_deputy_gov', 'cty_gov_sec',       // 县政府
  'city_exec_deputy', 'city_dep_gov', 'city_gov_sec', 'city_gov_office', 'city_deputy_gov', // 市政府
  'prov_exec_deputy', 'prov_dep_gov', 'prov_gov_sec',       // 省政府
  'vice_premier', 'state_councilor', 'state_sec_gen',       // 联邦内阁
  'min_vice', 'min_exec_deputy',                            // 部委副职
];

/** 根据玩家职级和任命职务判断所需审批层级 */
export function getAppointmentApprovalLevel(playerRank: number, roleKey: string): ApprovalLevel {
  // 政府行政职位（副镇长/副县长/副市长/副省长等）→ 本级决定，无需民主评议
  if (GOV_ROLE_PREFIXES.some(prefix => roleKey.startsWith(prefix))) return '本级决定';

  // 党委系列职位（纪委/组织/宣传/政法/常委等）需民主评议
  if (playerRank <= 4) return '县级联邦国会/组织部审批';
  if (playerRank <= 6) return '地市级审批';
  if (playerRank <= 9) return '省级审批';
  return '中央审批';
}
export const SUB_LEVEL_NAMES = [
  '', // 0 占位
  '科员', '副科级', '正科级', '副处级',
  '正处级', '副厅级', '正厅级', '副部级',
  '正部级', '副国级', '正国级', '副总理级',
];
export const SUB_LEVEL_COUNT = 12;

/**
 * 各职级下属的全局人数上限（金字塔结构）
 * 防止反复晋升导致大量高级别干部堆积
 */
export const SUB_LEVEL_MAX_COUNT: Record<number, number> = {
  1: 999, 2: 999,   // 科员/副科级 不限
  3: 30,  4: 20,    // 正科/副处
  5: 12,  6: 8,     // 正处/副厅
  7: 5,   8: 3,     // 正厅/副部
  9: 2,             // 正部（玩家团队最多2名正部级下属）
  10: 1, 11: 1, 12: 0,
};

export interface SubInstitution {
  name: string;    // 机构名称
  icon: string;    // emoji图标
  desc: string;    // 职能简介
  staffCount: number; // 编制人数
}

export interface DeptConfig {
  key: DeptKey;
  name: string;
  fullName: string;
  icon: string;
  headTitle: string;
  deputyTitle: string; // 副职称谓
  affectIndex: string;
  desc: string;
  functions: string[];
  // 有正职时每月自动执行的效果（按能力系数缩放）
  autoEffect: Partial<{
    cityGdp: number;
    cityLivelihood: number;
    cityEcology: number;
    cityBusiness: number;
    securityIndex: number;
    meritPoints: number;
    bossFavor: number;
    fundBalance: number;
    taxRevenue: number;
  }>;
  autoActionName: string; // 自动行动的名称，用于日志/提示
  subInstitutions: SubInstitution[]; // 下辖机构列表
}

// ============ 纪检政法路线 / 团派路线 专属下辖机构 ============
// 这两条路线不走部门正职任命，而是走各自体系的专属晋升通道

/** 纪检政法路线下辖机构（按职级层级展示） */
export const DISCIPLINE_LINE_INSTITUTIONS: SubInstitution[] = [
  { name: '纪委监委合署办公室', icon: '🏛️', desc: '纪检委与监察委合署运行，统筹反腐败工作', staffCount: 20 },
  { name: '案件审查调查室', icon: '🔎', desc: '对涉嫌违纪违法党员干部开展立案调查', staffCount: 15 },
  { name: '巡察工作办公室', icon: '👁️', desc: '统筹开展对下级党组织的巡察', staffCount: 10 },
  { name: '驻检察院纪检监察组', icon: '⚖️', desc: '派驻检察机关，对司法人员实施监督', staffCount: 8 },
  { name: '驻公安局纪检监察组', icon: '🚔', desc: '派驻公安机关，防范执法腐败和渎职', staffCount: 8 },
  { name: '驻法院纪检监察组', icon: '🔨', desc: '派驻法院，监督司法廉洁，防范司法腐败', staffCount: 8 },
  { name: '廉政教育基地', icon: '🏫', desc: '开展廉政警示教育，筑牢不敢腐防线', staffCount: 6 },
  { name: '举报受理中心', icon: '📞', desc: '受理群众来信来访举报，严格保密保护', staffCount: 6 },
];

/** 纪检政法路线晋升职务序列 */
export const DISCIPLINE_LINE_POSITIONS = [
  { rank: '乡镇', title: '纪检委委员', desc: '参与乡镇党委纪检工作，负责基层廉政监督' },
  { rank: '乡镇副科', title: '乡镇纪委副书记', desc: '协助主持纪委日常工作，分管案件查处' },
  { rank: '乡镇正科', title: '乡镇纪委书记', desc: '主持乡镇纪委全面工作，对乡镇党委负责' },
  { rank: '县级副职', title: '县纪委副书记·监委副主任', desc: '进入县纪委监委领导班子，主管审查调查工作' },
  { rank: '县级正职', title: '县纪委书记·监委主任', desc: '主持县纪委监委全面工作，代行监察权' },
  { rank: '市级副职', title: '市纪委副书记·监委副主任', desc: '分管全市纪检监察某一方面重要工作' },
  { rank: '市级正职', title: '市纪委书记·监委主任', desc: '主持市级纪检监察全面工作，向市委负责' },
  { rank: '省级副职', title: '省纪委副书记', desc: '协助主持省级纪委工作，统筹一方面业务' },
  { rank: '省级正职', title: '省纪委书记', desc: '主持省纪委全面工作，参加省委常委会' },
  { rank: '国家级', title: '联邦监察委委员', desc: '进入国家级纪检监察机构，行使最高监察权力' },
];

/** 团派路线下辖机构 */
export const LEAGUE_LINE_INSTITUTIONS: SubInstitution[] = [
  { name: '共青团委员会', icon: '🏆', desc: '领导辖区共青团工作，凝聚青年围绕党的中心任务', staffCount: 15 },
  { name: '青年就业创业中心', icon: '💼', desc: '搭建青年就业创业平台，联系企业开展招聘', staffCount: 10 },
  { name: '学生联合会', icon: '🎓', desc: '指导高校学生联合会工作，开展大学生实践活动', staffCount: 8 },
  { name: '青年志愿者总队', icon: '❤️', desc: '统筹青年志愿服务工作，培育服务型社会', staffCount: 12 },
  { name: '少先队工作部', icon: '⭐', desc: '指导中小学少先队活动，推进红色基因传承', staffCount: 6 },
  { name: '青年发展研究中心', icon: '🔬', desc: '研究青年思想动态，为决策提供参考', staffCount: 5 },
  { name: '网络青年工作站', icon: '💻', desc: '管理网络青年活动平台，引导网络舆论', staffCount: 8 },
];

/** 团派路线晋升职务序列 */
export const LEAGUE_LINE_POSITIONS = [
  { rank: '乡镇', title: '乡镇团委书记', desc: '主持乡镇团委工作，是团派路线在基层的起步岗位' },
  { rank: '县级副职', title: '团县委副书记', desc: '协助主持团县委工作，分管青年活动及就业' },
  { rank: '县级正职', title: '团县委书记', desc: '主持团县委全面工作，是团派晋升的关键一跳' },
  { rank: '市级副职', title: '团市委副书记', desc: '进入团市委领导班子，统筹全市青年工作' },
  { rank: '市级正职', title: '团市委书记', desc: '主持团市委工作，对接全国青年联合组织' },
  { rank: '省级副职', title: '团省委副书记', desc: '进入团省委领导班子，通道向地方政府转任打开' },
  { rank: '省级正职', title: '团省委书记', desc: '主持省级团委工作，通常经此转任省厅局或挂职' },
  { rank: '国家级', title: '全国青年联合会常委', desc: '进入国家级政治舞台，参与青年领域重大政策制定' },
];

// ============ 职能部门名称随职级动态切换 ============
// 乡镇→所/站/办, 县市→局, 省→厅, 国→部委
export const DEPT_NAME_BY_RANK: Record<DeptKey, Record<'town'|'county'|'city'|'province'|'national', string>> = {
  police:       { town: '派出所',     county: '公安局',     city: '公安局',     province: '公安厅',       national: '公安部' },
  ndrc:         { town: '发改站',     county: '发展改革局', city: '发展改革局', province: '发展改革委',   national: '国家发展改革委' },
  finance:      { town: '财政所',     county: '财政局',     city: '财政局',     province: '财政厅',       national: '财政部' },
  urban:        { town: '建设站',     county: '住建局',     city: '住建局',     province: '住房建设厅',   national: '住房和城乡建设部' },
  education:    { town: '教育办',     county: '教育局',     city: '教育局',     province: '教育厅',       national: '教育部' },
  health:       { town: '卫生站',     county: '卫健局',     city: '卫健委',     province: '卫健委',       national: '国家卫生健康委' },
  ecology:      { town: '环保站',     county: '生态环保局', city: '生态环境局', province: '生态环境厅',   national: '生态环境部' },
  market:       { town: '市监所',     county: '市场监管局', city: '市场监管局', province: '市场监管局',   national: '市场监管总局' },
  agriculture:  { town: '农业站',     county: '农业农村局', city: '农业农村局', province: '农业农村厅',   national: '农业农村部' },
  personnel:    { town: '人事办',     county: '人社局',     city: '人社局',     province: '人力资源厅',   national: '人力资源和社会保障部' },
  invest:       { town: '招商办',     county: '招商局',     city: '投资促进局', province: '投资促进厅',   national: '商务部' },
  tax:          { town: '税务所',     county: '税务局',     city: '税务局',     province: '税务局',       national: '国家税务总局' },
  petition:     { town: '信访室',     county: '信访局',     city: '信访局',     province: '信访局',       national: '国家信访局' },
  organization: { town: '党务办',     county: '组织部',     city: '组织部',     province: '组织部',       national: '党政人事院' },
  propaganda:   { town: '宣传办',     county: '宣传部',     city: '宣传部',     province: '宣传部',       national: '中央宣传部' },
  discipline:   { town: '纪检办',     county: '纪检委',     city: '纪检委',     province: '纪检委',       national: '中央纪检委' },
  govoffice:    { town: '政务办',     county: '政府办',     city: '政府办',     province: '省政府办',     national: '国务院办公厅' },
  industry:     { town: '工信站',     county: '工信局',     city: '工信局',     province: '工信厅',       national: '工业和信息化部' },
  naturalres:   { town: '国土所',     county: '自然资源局', city: '自然资源局', province: '自然资源厅',   national: '自然资源部' },
  construction: { town: '建设站',     county: '住建局',     city: '住建局',     province: '住建厅',       national: '住房和城乡建设部' },
  transport:    { town: '交通站',     county: '交通运输局', city: '交通运输局', province: '交通运输厅',   national: '交通运输部' },
  health2:      { town: '卫生站',     county: '卫健局',     city: '卫健委',     province: '卫健委',       national: '国家卫生健康委' },
};

/** 根据主角职级返回对应部门显示名称 */
export function getDeptNameByRank(key: DeptKey, rankLevel: number): string {
  const map = DEPT_NAME_BY_RANK[key];
  if (!map) return DEPT_CONFIG[key].name;
  if (rankLevel <= 3) return map.town;
  if (rankLevel <= 6) return map.county;
  if (rankLevel <= 9) return map.city;
  if (rankLevel <= 11) return map.province;
  return map.national;
}

/** 各部门按层级的正职称谓 */
export const DEPT_HEAD_TITLE_BY_RANK: Record<DeptKey, Record<'town'|'county'|'city'|'province'|'national', string>> = {
  police:       { town: '所长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  ndrc:         { town: '站长',   county: '局长',   city: '委主任',   province: '委主任',   national: '主任' },
  finance:      { town: '所长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  urban:        { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  education:    { town: '办主任', county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  health:       { town: '站长',   county: '局长',   city: '委主任',   province: '委主任',   national: '主任' },
  ecology:      { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  market:       { town: '所长',   county: '局长',   city: '局长',     province: '局长',     national: '总局长' },
  agriculture:  { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  personnel:    { town: '办主任', county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  invest:       { town: '办主任', county: '局长',   city: '促进局长', province: '促进厅长', national: '部长' },
  tax:          { town: '所长',   county: '局长',   city: '局长',     province: '局长',     national: '总局长' },
  petition:     { town: '室主任', county: '局长',   city: '局长',     province: '局长',     national: '局长' },
  organization: { town: '书记',   county: '部长',   city: '部长',     province: '部长',     national: '部长' },
  propaganda:   { town: '书记',   county: '部长',   city: '部长',     province: '部长',     national: '部长' },
  discipline:   { town: '书记',   county: '书记',   city: '书记',     province: '书记',     national: '书记' },
  govoffice:    { town: '主任',   county: '主任',   city: '秘书长',   province: '秘书长',   national: '主任' },
  industry:     { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  naturalres:   { town: '所长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  construction: { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  transport:    { town: '站长',   county: '局长',   city: '局长',     province: '厅长',     national: '部长' },
  health2:      { town: '站长',   county: '局长',   city: '委主任',   province: '委主任',   national: '主任' },
};

/** 各部门按层级的副职称谓 */
export const DEPT_DEPUTY_TITLE_BY_RANK: Record<DeptKey, Record<'town'|'county'|'city'|'province'|'national', string>> = {
  police:       { town: '副所长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  ndrc:         { town: '副站长',   county: '副局长',   city: '委副主任',   province: '委副主任',   national: '副主任' },
  finance:      { town: '副所长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  urban:        { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  education:    { town: '副主任',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  health:       { town: '副站长',   county: '副局长',   city: '委副主任',   province: '委副主任',   national: '副主任' },
  ecology:      { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  market:       { town: '副所长',   county: '副局长',   city: '副局长',     province: '副局长',     national: '副总局长' },
  agriculture:  { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  personnel:    { town: '副主任',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  invest:       { town: '副主任',   county: '副局长',   city: '副促进局长', province: '副促进厅长', national: '副部长' },
  tax:          { town: '副所长',   county: '副局长',   city: '副局长',     province: '副局长',     national: '副总局长' },
  petition:     { town: '副主任',   county: '副局长',   city: '副局长',     province: '副局长',     national: '副局长' },
  organization: { town: '副书记',   county: '副部长',   city: '副部长',     province: '副部长',     national: '副部长' },
  propaganda:   { town: '副书记',   county: '副部长',   city: '副部长',     province: '副部长',     national: '副部长' },
  discipline:   { town: '副书记',   county: '副书记',   city: '副书记',     province: '副书记',     national: '副书记' },
  govoffice:    { town: '副主任',   county: '副主任',   city: '副秘书长',   province: '副秘书长',   national: '副主任' },
  industry:     { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  naturalres:   { town: '副所长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  construction: { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  transport:    { town: '副站长',   county: '副局长',   city: '副局长',     province: '副厅长',     national: '副部长' },
  health2:      { town: '副站长',   county: '副局长',   city: '委副主任',   province: '委副主任',   national: '副主任' },
};

/** 根据部门key和职级返回正职动态称谓（带机构名前缀）*/
export function getDeptHeadTitle(key: DeptKey, rankLevel: number): string {
  const deptName = getDeptNameByRank(key, rankLevel);
  const titleMap = DEPT_HEAD_TITLE_BY_RANK[key];
  let title: string;
  if (rankLevel <= 3) title = titleMap.town;
  else if (rankLevel <= 6) title = titleMap.county;
  else if (rankLevel <= 9) title = titleMap.city;
  else if (rankLevel <= 11) title = titleMap.province;
  else title = titleMap.national;
  return `${deptName}${title}`;
}

/** 根据部门key和职级返回副职动态称谓（带机构名前缀）*/
export function getDeptDeputyTitle(key: DeptKey, rankLevel: number): string {
  const deptName = getDeptNameByRank(key, rankLevel);
  const titleMap = DEPT_DEPUTY_TITLE_BY_RANK[key];
  let title: string;
  if (rankLevel <= 3) title = titleMap.town;
  else if (rankLevel <= 6) title = titleMap.county;
  else if (rankLevel <= 9) title = titleMap.city;
  else if (rankLevel <= 11) title = titleMap.province;
  else title = titleMap.national;
  return `${deptName}${title}`;
}

/** 根据主角职级返回职能部门编制人数（总额） */
export function getDeptStaffQuota(rankLevel: number): number {
  if (rankLevel <= 3) return 10;
  if (rankLevel <= 6) return 40;
  if (rankLevel <= 9) return 100;
  if (rankLevel <= 11) return 300;
  return 560;
}

/**
 * 根据玩家职级返回单部门人员范围（写实配置）
 *   乡镇：2-4（只有负责人+1-2工作人员）
 *   县级：6-15（局长+副局长+3-10科员）
 *   地市：15-50（局长+多副局长+若干科室）
 *   省级：50-200（厅级部门，各处室+人员）
 *   国家级：200-500（部级，含多个司局）
 */
export function getDeptStaffRange(rankLevel: number): { min: number; max: number } {
  if (rankLevel <= 3) return { min: 2, max: 4 };
  if (rankLevel <= 6) return { min: 6, max: 15 };
  if (rankLevel <= 9) return { min: 15, max: 50 };
  if (rankLevel <= 11) return { min: 50, max: 200 };
  return { min: 200, max: 500 };
}

/**
 * 根据部门、玩家职级和岗位，返回应有的现实职级(sub_level)
 * 参考现实逻辑：
 *   - 所有层级部门正职基准 = rankLevel - 1（乡镇最低保证副科级=2）
 *   - 公安/纪检等"强力部门"额外高配 +1（如县公安局长普遍高配副处）
 *   - 副职 = rankLevel - 2（乡镇最低保证科员级=1）
 * 例：乡镇(rank3) 派出所所长=2(副科)，副所长=1(科员)
 *     县级(rank5)  公安局长=4(副处)，副局长=3(正科)
 *     市级(rank7)  公安局长=6(副厅)，副局长=5(正处)
 */
// 高配部门：公安/纪检/组织/税务，头部高配比普通部门高一级
const HIGH_CONFIG_DEPTS: DeptKey[] = ['police', 'organization', 'tax', 'discipline', 'propaganda'];
export function getDeptPositionSubLevel(
  deptKey: DeptKey, rankLevel: number, position: 'head' | 'deputy'
): number {
  const isHighConfig = HIGH_CONFIG_DEPTS.includes(deptKey) && rankLevel >= 5;
  if (position === 'head') {
    // 高配：rankLevel（即高出副职一级）；普通：rankLevel - 1
    const base = isHighConfig ? rankLevel : Math.max(2, rankLevel - 1);
    return Math.min(12, Math.max(2, base));
  }
  // 副职：比正职低一级
  return Math.min(12, Math.max(1, rankLevel - 2));
}

/**
 * 兼职配置：哪个领导班子职位兼任哪个职能部门的正职
 * 现实依据：
 *   乡镇：政法委员兼任派出所长；副镇长一分管综合，副镇长二分管财政，副镇长三分管农业等
 *   县级：政法委书记兼公安局长；党政人事院院长分管人事局；肃宪院长分管纪检系统
 *   市级：副市长兼公安局局长（高配）；分管副市长对口各系统
 */
export const LEADERSHIP_CONCURRENT: Record<string, { deptKey: DeptKey; label: string }> = {
  // 乡镇
  town_law:          { deptKey: 'police',      label: '兼任派出所所长' },
  town_deputy_gov1:  { deptKey: 'police',      label: '分管综治安全·兼任派出所所长' },
  town_deputy_gov2:  { deptKey: 'finance',     label: '分管财政经济·兼任财政所所长' },
  town_deputy_gov3:  { deptKey: 'agriculture', label: '分管农业农村·兼任农业站站长' },
  town_org:          { deptKey: 'personnel',   label: '分管组织人事·协管人事办' },
  // 县级
  cty_law:           { deptKey: 'police',      label: '兼任公安局局长' },
  cty_org:           { deptKey: 'personnel',   label: '分管组织·协管人社局' },
  cty_exec_standing: { deptKey: 'finance',     label: '分管财政·协管财政局' },
  cty_deputy_gov1:   { deptKey: 'police',      label: '分管政法·兼管公安局' },
  cty_deputy_gov2:   { deptKey: 'finance',     label: '分管财政经济·兼管财政局' },
  cty_deputy_gov3:   { deptKey: 'education',   label: '分管教育卫生·兼管教育局' },
  // 市级
  city_deputy_gov1:  { deptKey: 'police',      label: '分管政法·兼任公安局局长' },
  city_deputy_gov2:  { deptKey: 'finance',     label: '分管财政经济·协管财政局' },
  city_deputy_gov3:  { deptKey: 'education',   label: '分管教育文化·协管教育局' },
  city_dep_gov1:     { deptKey: 'police',      label: '分管政法·兼任公安局局长' },
  city_dep_gov2:     { deptKey: 'finance',     label: '分管财政经济·协管财政局' },
  city_dep_gov3:     { deptKey: 'education',   label: '分管教育文化·协管教育局' },
  city_dep_gov4:     { deptKey: 'ecology',     label: '分管生态环保·协管生态环保局' },
};

// ============ 玩家存档 ============
export interface PlayerSave {
  id: string;
  userId: string;
  playerName: string;
  playerGender: string;
  playerAge: number;
  playerBirthDay: number;
  avatarId: number;
  school: string;
  needsCharacterCreation: boolean;
  // 个人档案
  birthYear: number;
  birthProvince: string;
  birthCity: string;
  universityName: string;
  rankLevel: number;
  rankName: string;
  meritPoints: number;
  moralValue: number;
  assessmentGrade: AssessmentGrade;
  tenureYears: number;
  tenureDays: number;
  maxTenureYears: number;
  gameDays: number;
  cityName: string;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  policeForce: number;
  securityIndex: number;
  policeChiefName: string | null;
  reformFaction: number;
  pragmaticFaction: number;
  // 三大额外派系关系值（0-100）
  cylRelation: number;
  technoRelation: number;
  localRelation: number;
  // 玩家主派系 key（'reform' | 'pragmatic' | 'cyl' | 'techno' | 'local' | ''）
  primaryFaction: string;
  /** 省级一把手派系归属动态地图（省简称 → factionKey），NPC/玩家晋升时更新 */
  factionProvinceMap: Record<string, string>;
  bossName: string;
  bossFavor: number;
  requiredMerit: number;
  requiredTenureYears: number;
  isPromotionAvailable: boolean;
  isEventPending: boolean;
  /** 上次路线竞争事件发生的 gameDays（冷却 180 天）*/
  lastCompetitionEventDay: number;
  familyHappiness: number;
  marriageStatus: MarriageStatus;
  eventsThisYear: number;
  lastRankDay: number;
  annualRankPct: number;
  isExcellentRank: boolean;
  // 民生扩展字段
  cityPopulation: number;
  residentIncome: number;
  eduLevel: number;
  healthcareRate: number;
  housingRate: number;
  // 资金余额
  fundBalance: number;
  // 三上司字段
  boss2Name: string;
  boss2Favor: number;
  boss3Name: string;
  boss3Favor: number;
  // 年度招募追踪
  lastRecruitYear: number;
  // 季度招募追踪（gameDays / 91 的商值）
  lastRecruitQuarter: number;
  // 城市税收
  cityTaxRate: number;
  cityTaxIncome: number;
  taxRevenue: number;  // 税收指数（招商引资累积提升）
  // 月度报告追踪
  lastMonthDay: number;
  // 年度KPI
  kpiGdpTarget: number;
  kpiLivelihoodTarget: number;
  kpiEcologyTarget: number;
  kpiBusinessTarget: number;
  kpiYear: number;
  // 下属拜访
  subVisitPending: boolean;
  subVisitSubId: string | null;
  subVisitSubName: string | null;
  // 人事局年底评审追踪
  lastPersonnelYear: number;
  // 部门月度汇报追踪
  deptReportDay: number;
  // 干部交流任职追踪（每180天触发）
  lastExchangeDay: number;
  // 部委轮换追踪（级别12时每365天触发）
  lastMinistryRotateDay: number;
  // 配偶关系值与结婚纪念日
  spouseRelationValue: number;
  marriageDay: number;
  // 玩家当前职务名称（晋升时同步更新）
  playerPosition: string;
  // 职务兼职（记录担任的兼职key列表）
  concurrentPosts: string[];
  // 投票支持率（晋升总理用）
  voteSupport: number;
  lastVoteDay: number;
  // 党代会选举支持率（晋升执政党主席用）
  partyCongressVote: number;
  lastPartyCongressDay: number;
  /** 正国家级（rank 14-15）已连续执政届数（0=未届满一届） */
  nationalTermsServed: number;
  // 仕途路线：'party'=党务, 'government'=行政, ''=未选择/共同段
  careerPath: string;
  // 全国GDP总量（亿元，rank12+显示）
  nationalGdp: number;
  // 科技委研发数据
  sciTechInvestTotal: number;
  sciTechResearchDir: string;
  sciTechProgress: number;
  sciTechLastActDay: number;
  // 纪检委案件追踪
  disciplineLastActDay: number;
  // KPI述职排名（总理办公室用）
  kpiRankingYear: number;
  kpiRankingResult: string;
  // 年度提报晋升追踪
  lastAnnualPromoteYear: number;
  // 个人财富系统
  personalSavings: number;         // 个人存款（元）
  personalAssets: string[];        // 已购置资产key列表
  lastSalaryDay: number;           // 上次发薪game_days，避免重复发
  providentFundBalance: number;    // 住房公积金账户累计余额（元，个人+单位双倍缴存）
  lastAnnualBonusDay: number;      // 上次发年终奖的game_days
  // 退休系统
  retirementDelayYears: number;   // 已批准延迟退休年数（0~3）
  isRetired: boolean;             // 是否已退休
  // 上司生命周期
  bossTenureStart: number;        // 上司1任期开始游戏天
  bossTenureDuration: number;     // 上司1任期总天数
  boss2TenureStart: number;
  boss2TenureDuration: number;
  boss3TenureStart: number;
  boss3TenureDuration: number;
  // 纪委风险追踪
  lastDisciplineWarnDay: number;  // 上次纪委约谈游戏天
  lastCaseCheckDay: number;       // 上次立案审查检测游戏天
  // 重大事故风险
  consecutiveFailEvents: number;  // 连续"不作为"突发事件次数
  // 连续优秀/特等加速晋升计数（每年考核后更新，非优秀时清零）
  consecutiveExcellentYears: number;
  // 累计平调次数（每次平调+1，晋升清零）
  lateralCount: number;
  /** 任期KPI不及格次数（连续计数，晋升后清零）用于多档惩罚机制 */
  kpiFailedTerms: number;
  /** 当前地方连续任期届数（每届满+1，晋升或平调后重置为0；rank<12时达2届强制平调）*/
  sameLocTerms: number;
  /** 上月部门事件所选选项的chainKey（空串=无连锁）*/
  lastEventChainKey: string;
  /** 人脉值（0-100，影响事件选项解锁/晋升加成/纪委风险） */
  networkValue: number;
  // Game Over结局类型
  gameOverType: 'corruption' | 'accident' | 'purge' | null;
  // 代会换届追踪
  lastCongressDay: number;       // 上次代会换届游戏天（默认0）
  // 交流干部自动处理模式：'manual'=手动, 'auto-accept'=自动接收, 'auto-decline'=自动婉拒
  exchangeAutoMode: 'manual' | 'auto-accept' | 'auto-decline';
  // 关系积分：同校/同派系部级以上老学长加权积累（0-100）
  alumniScore: number;
  // 相亲NPC列表（每月刷新5个，未婚时有效）
  blindDateNpcs: BlindDateNpc[];
  // 怀孕起始游戏天（0=未怀孕，>0=怀孕开始的gameDays）
  pregnantDay: number;
  // 民生指数历史快照（每届任期记录一次）
  livelihoodSnapshots: LivelihoodSnapshot[];
  // 任职途径：'地方'=地方政府线, '中央'=联邦内阁部委线
  careerLine: '地方' | '中央';
  // 所在部委名称（中央线有效，如"发展改革委"）
  ministryName: string;
  // 编制年度追踪：上次重置的游戏年份
  lastStaffQuotaYear: number;
  // 本年度编制申请位标志（bit0~3 各对应一种申请类型）
  staffApplyBits: number;
  /** 内阁分管线：rank13副总理随机分配('economy'|'social'|'hmt'|'military')，rank14+总统为null（全管） */
  cabinetTrack: 'economy' | 'social' | 'hmt' | 'military' | null;
  /** rank15 路线专权行动冷却追踪（key=行动id，value=最后执行gameDays） */
  r15ActionCooldowns: Record<string, number>;
  /** 最高领导人专属行动冷却追踪（rank13+，key=行动id，value=最后执行gameDays） */
  supremeLeaderCooldowns: Record<string, number>;
  /** 待展示的全国性舆情事件（高层职权触发后写入，home.tsx弹窗消费） */
  pendingOpinionEvent: { type: string; title: string; desc: string; gameDays: number } | null;
  /** 破格晋升已错过的任期次数（第1次错过→下届75%，第2次及以上→90%） */
  exceptionalMissedTerms: number;
  /** 破格晋升概率累计奖惩（+0.01=述职达标奖励，-0.10=述职未达标惩罚，可叠加） */
  exceptionalPromoBonus: number;
  /** 年度述职核心指标 key（gdp/livelihood/ecology/business/security） */
  annualDebriefTargetKey: string;
  /** 年度述职核心指标目标值（由上司在年初设定） */
  annualDebriefTargetValue: number;
  /** 上司施政风格派系（改革派/实干派/保守派），影响KPI目标难度与侧重 */
  bossFaction: '改革派' | '实干派' | '保守派';
  /** 秘书连续自动施政月数（最多6，第6月须手动） */
  secAutoConsecutiveMonths: number;
  /** 秘书自动施政开关（手动开启，能力≥70 生效） */
  secAutoGovEnabled: boolean;
  /** 秘书自动招募开关（手动开启，能力≥60 生效） */
  secAutoRecruitEnabled: boolean;
  /** 应急编制到期游戏天（0=无应急编制；>0=有效截止日） */
  emergencyStaffExpiry: number;
  // ── 家庭背景 & 军转干部 & 能力/健康 ──────────────────────────────────────
  /** 家庭背景（角色创建时选定，影响初期人脉加成） */
  familyBackground: string;
  /** 是否军转干部路线（年龄≥30，破格晋升概率+10%） */
  isMilitaryTransfer: boolean;
  /** 个人能力值（0-100，初始40，每月+1，影响民生指数与晋升门槛） */
  abilityValue: number;
  /** 健康值（0-100，初始100） */
  healthValue: number;
  /** 角色创建时选择的初始政治倾向派系 */
  initFaction: string;
  /** 角色创建时AI随机分配的初始任职部门key（null=通用科员，无具体部门） */
  initialDeptKey: DeptKey | null;

  // ══════════════════════════════════════════
  // v2.0 新增系统字段
  // ══════════════════════════════════════════

  /** 舆情指数（0-100，影响民心与晋升评分）*/
  publicOpinionIndex: number;
  /** 巡视风险度（0-100，moralValue过低时累积，触发巡视组检查）*/
  inspectionRisk: number;
  /** 上次巡视触发的游戏天（用于冷却计算）*/
  lastInspectionDay: number;
  /** 是否正在接受调查（双规/立案）*/
  isUnderInvestigation: boolean;
  /** 保护伞等级：0=无 1=乡镇级 2=县市级 3=省部级 */
  protectionUmbrellaLevel: number;
  /** 保护伞来源上司姓名（空串=无）*/
  protectionUmbrellaName: string;
  /** 本届土地出让总收入（万元）*/
  landFinanceTotal: number;
  /** 本届已拍卖地块数 */
  landParcelsSold: number;
  /** 第一产业GDP占比（0-100）*/
  gdpPrimaryShare: number;
  /** 第二产业GDP占比（0-100）*/
  gdpSecondaryShare: number;
  /** 第三产业GDP占比（0-100）*/
  gdpTertiaryShare: number;
  /** 政府债务总额（万元）*/
  govDebtTotal: number;
  /** 本届群体性事件总数 */
  massIncidentCount: number;
  /** 本届群体性事件未处置数（超时罚分）*/
  massIncidentPending: number;
  /** 派系内部层级：'member'=普通成员 'backbone'=骨干 'leader'=领袖 */
  factionInternalRank: 'member' | 'backbone' | 'leader';
  /** 派系内部积分（升级backbone需50，leader需150）*/
  factionPoints: number;
  /** 累计已接受贿赂总金额（元，隐性收入）*/
  briberyAccepted: number;
  /** 累计已拒绝贿赂次数（廉洁积分来源）*/
  briberyRejected: number;
  /** 传承政治遗产值（退休时累积，传至下一代）*/
  inheritancePolitical: number;
  /** 传承人脉值（退休时可传50%给继承人）*/
  inheritanceNetwork: number;

  // ══════════════════════════════════════════
  // 家族系统
  // ══════════════════════════════════════════
  /** 家族声望（0-500，影响政治加成与事件触发）*/
  clanPrestige: number;
  /** 家族传承值（来自继承人成就、族谱完善、祖训传承）*/
  clanHeritage: number;
  /** 家族公共基金（万元，用于族内活动、产业投入）*/
  clanFund: number;
  /** 族老满意度（0-100，影响族内决策效率）*/
  clanElderFavor: number;
  /** 家族成员总数（影响声望加成上限）*/
  clanMemberCount: number;
  /** 家族事件日志（最近50条）*/
  clanEventsLog: string[];
  /** 家族产业等级（0=无, 1=小作坊, 2=企业, 3=集团）*/
  clanIndustryLevel: number;
  /** 家族产业类型（农业/工业/商业/教育/金融）*/
  clanIndustryType: string;
  /** 最后一次祭祖日（游戏天数）*/
  clanLastRitualDay: number;
  /** 最后一次家族会议日（游戏天数）*/
  clanLastMeetingDay: number;

  // ══════════════════════════════════════════
  // v2.1 新增系统字段
  // ══════════════════════════════════════════

  /** 外交/援助积分（完成外交任务后积累，晋升加成来源之一）*/
  diplomacyPoints: number;
  /** 上次外交任务完成游戏天（冷却追踪）*/
  lastDiplomacyDay: number;
  /** 仕途路线：党务线/行政线/纪检线/团派线 */
  careerPathLine: '党务线' | '行政线' | '纪检线' | '团派线';
  /** 玩家喜好路线（影响上级NPC提拔+20%概率加成） */
  preferredCareerLine: '党务线' | '行政线' | '纪检线' | '团派线';
  /** 路线专属KPI积分（路线行动和任务积累） */
  lineKpiScore: number;
  /** 各仕途路线专属行动冷却追踪 key=actionKey value=gameDays */
  careerPathCooldowns: Record<string, number>;
  /** 路线专属任务状态持久化 key=taskKey value={startDay,completed} */
  lineTaskState: Record<string, { startDay: number; completed: boolean }>;
  /** 破格提升已无视年龄次数（终身累计） */
  exceptionalAgeOverrideCount: number;
  /** 挂职支援标志（正在对口支援中） */
  isDiplomacyActive: boolean;
  /** 贿赂收受事件待处理（true时home弹出Modal） */
  pendingBriberyEvent: { npcName: string; npcType: string; amount: number } | null;
  /** 以权谋私累计灰色收入（元）*/
  grayIncomeTotal: number;
  /** 双规触发的游戏天数 */
  investigationDay: number;
  /** 双规证据强度等级（1-5，基于受贿/廉洁/风险综合计算）*/
  investigationEvidenceLevel: number;
  /** 父母健康状态：'healthy'=健在 'sick'=患病 'deceased'=去世 */
  parentStatus: 'healthy' | 'sick' | 'deceased';
  /** 以权谋私行动冷却追踪 key=actionKey value=gameDays */
  grayIncomeCooldowns: Record<string, number>;
  /** 权色/权钱交易冷却追踪 key=actionKey value=gameDays */
  powerTradeCooldowns: Record<string, number>;
  /** 插手人事任免+考试录用冷却追踪 key=actionKey value=gameDays */
  personnelCooldowns: Record<string, number>;
  /** NPC空缺待填补通知列表（positionLabel列表，玩家确认后清空）*/
  npcVacancyNotices: string[];
  /** 双规判决结果文本（用于game-over页展示）*/
  gameOverVerdict: string | null;
  /** 纪委年度合规检查最后触发天数（避免重复触发）*/
  lastInvestigationCheckDay: number;
  /** 玩家历任职务轨迹（省份+职务+级别，按时间顺序）*/
  playerCareerHistory: { rankLevel: number; position: string; province: string; city: string; startDay: number; endDay: number | null }[];
  /** 接班人姓名 */
  successorName: string;
  /** 接班人派系 */
  successorFaction: string;
  /** 接班人毕业院校 */
  successorSchool: string;
  /** 接班人当前职级 */
  successorRankLevel: number;
  /** 接班人能力值（0-100）*/
  successorAbility: number;
  /** 接班人忠诚度（0-100）*/
  successorLoyalty: number;
  /** 接班人累计培养天数 */
  successorInvestDays: number;
  /** 接班人上次行动游戏天 */
  successorLastActDay: number;

  // ── 党委线专属 ──────────────────────────────────────────────────────────────
  /** 当前执政主轴（党代会战略部署选定，10年有效）*/
  partyCongressAxis: '经济优先' | '生态立国' | '安全强国' | '';
  /** 上次党代会战略部署游戏天（用于3650天冷却）*/
  partyCongressAxisDay: number;
  /** 上次已通知解锁功能的职级（升级弹窗用，0=从未通知）*/
  rankUnlockNotifiedLevel: number;

  // ── 党委高阶功能 v2 ──────────────────────────────────────────────────────
  /** 党报舆论管控上次操作游戏天 */
  partyMediaControlDay: number;
  /** 过度管控累积的失察风险值（0-100，超80将随机触发反噬）*/
  mediaOvercontrolRisk: number;
  /** 组织部暗线上次操作游戏天 */
  orgDeptInsiderDay: number;
  /** 暗线当前布局的竞争对手名字（展示用）*/
  orgInsiderTarget: string;
  /** 组织部暗线多目标潜伏列表（JSON字符串，最多3个目标）*/
  orgInsiderTargets: string;
  /** 中央全会文件传达上次操作游戏天 */
  plenaryConferenceDay: number;
  /** 党风廉政责任状上次签订游戏天 */
  disciplineContractDay: number;
  /** 本年已签廉政责任状的下属ID列表（JSON字符串）*/
  disciplineContractSigned: string;

  // ── 政法线专属字段 ─────────────────────────────────────────────────────────
  /** 社会稳定指数（0-100，80以上绿色，60-79黄色，40-59橙色，40以下红色）*/
  judicialStabilityIndex: number;
  /** 信访积压件数 */
  judicialPetitionBacklog: number;
  /** 扫黑除恶成功次数 */
  judicialSweepCount: number;
  /** 网络言论管控指数（0-100，≥80触发言论管制危机）*/
  judicialSpeechControl: number;
  /** 案件证据链完整度（0-100，起诉时重置）*/
  judicialEvidenceLevel: number;
  /** 政法委协调会召开次数 */
  judicialCoordCount: number;
  /** 发展线人数量（上限20）*/
  informantCount: number;
  /** 执法整风清除次数 */
  lawEnforcePurgeCount: number;
  /** 死刑复核批准/驳回次数 */
  deathReviewCount: number;
  /** 20-23号功能冷却记录 */
  judicialExtraCooldowns: Record<string, number>;

  // ── 行政线治理字段（25-29号功能）─────────────────────────────────────────
  /** 行政线25-29号功能冷却记录 */
  adminGovCooldowns: Record<string, number>;
  discDeepCooldowns: Record<string, number>;
  partyDeepCooldowns: Record<string, number>;
  leagueDeepCooldowns: Record<string, number>;
  adminDeepCooldowns: Record<string, number>;
  /** 纪检深度行动最近结果 JSON: Record<key,{ok,desc,day}> */
  discDeepResults?: string;
  /** 党务深度行动最近结果 JSON: Record<key,{ok,desc,day}> */
  partyDeepResults?: string;
  /** 团派深度行动最近结果 JSON: Record<key,{ok,desc,day}> */
  leagueDeepResults?: string;
  /** 行政线深度行动最近结果 JSON: Record<key,{ok,desc,day}> */
  adminDeepResults?: string;
  /** 全局行动结果日志 JSON: Record<pagePrefix_actionKey, {ok,desc,day}> */
  actionResultsLog?: string;
  /** 舆情处置结果 JSON: Record<key,{ok,desc,day,optLabel}> */
  massIncidentResults?: string;
  /** 政策试点申请次数 */
  policyPilotCount: number;
  /** 机构改革裁员次数 */
  institutionReformCount: number;
  /** 行政审批提速竞赛次数 */
  approvalRaceCount: number;
  /** 政务大厅满意度抽查次数 */
  hallSatisfyCount: number;
  /** 数字政府是否已建成 */
  digitalGovBuilt: boolean;
  /** 数字政府建成游戏天数 */
  digitalGovBuiltDay: number;

  /** 政府信息公开次数 */
  infoPublicCount: number;
  /** 行政诉讼应对次数 */
  adminLitigationCount: number;
  /** 专项督查次数 */
  inspectionCount: number;
  /** 联席会议外交次数 */
  jointMeetingCount: number;
  /** 行政成本预警处置次数 */
  fiscalWarningCount: number;
  /** 政绩/民生工程选择次数 */
  projectTypeCount: number;
  /** 专项经费危机标志（余额耗尽时触发） */

  // ── 非行政线上级拨款 ───────────────────────────────────────────────────────
  /** 非行政线当前可用拨款余额（万元）*/
  cityGovFund: number;
  /** 上次拨款的游戏年份（-1=从未拨款）*/
  lineGrantLastYear: number;
  /** 上次拨款申请的游戏年份（每年限1次）*/
  grantApplicationLastYear: number;
  /** 上次政绩奖励领取的游戏年份（每年限1次）*/
  performanceRewardLastYear: number;
  /** 上次年度预算领取的游戏年份（每年自动拨付1次）*/
  annualBudgetLastYear: number;
  /** 路线专属KPI晋升加成积分（满分100，影响晋升概率）*/
  lineKpiBonus: number;
  /** 专项经费上次自动入账的游戏月份（Math.floor(gameDays/30)）*/
  cityGovFundAutoMonth?: number;
  /** 秘书候选人列表（JSON字符串，晋升后生成，选完清空）*/
  secretaryCandidates?: string;
  /** 生成秘书候选人时的职级，用于检测是否需要重新生成 */
  secretaryCandidateRank?: number;

  // ── 贪腐字段 ──────────────────────────────────────────────────────────────
  /** 累计贪污金额（元）*/
  corruptTotal: number;

  // ── 师承系统 ──────────────────────────────────────────────────────────────
  /** 恩师姓名（空=尚无恩师）*/
  mentorName: string;
  /** 恩师当前职级（12=部级 13=副国级 14=正国级）*/
  mentorRankLevel: number;
  /** 恩师所属派系 */
  mentorFaction: string;
  /** 获得恩师的游戏天 */
  mentorAcquiredDay: number;
  /** 恩师是否已随玩家晋升而晋升（最多晋升一次后止步）*/
  mentorPromoted: boolean;
  /** 与恩师的关系值（0-100，影响加成强度）*/
  mentorRelation: number;
  /** 上次向恩师汇报工作的游戏天 */
  mentorLastContactDay: number;

  // ── 门生系统（rank≥12解锁）────────────────────────────────────────────────
  /** 门生姓名（空=尚无门生）*/
  protegeName: string;
  /** 门生当前职级 */
  protegeRankLevel: number;
  /** 门生能力值（0-100）*/
  protegeAbility: number;
  /** 门生忠诚度（0-100）*/
  protegeLoyalty: number;
  /** 对门生的累计培养天数 */
  protegeInvestDays: number;
  /** 门生上次行动游戏天 */
  protegeLastActDay: number;
  /** 关键晋升操作的游戏天（365天冷却）*/
  protegePromotedDay: number;

  // ── 政治局 / 常委序列 ─────────────────────────────────────────────────────
  /** 是否已当选政治局委员（12级+解锁）*/
  politburoSeat: boolean;
  /** 上次政治局选举的游戏年份（-1=未参选）*/
  lastPolitburoElectionYear: number;
  /** 政治局得票数（0-100，上次选举结果）*/
  politburoVotes: number;
  /** 常委位次（1-7=入常，0=未入常）*/
  standingCommitteeRank: number;
  /** 上次常委竞选的游戏年份（-1=未参选）*/
  lastStandingElectionYear: number;
  /** 年底常委重排后的位次变化（正=上升，负=下降，0=未变）*/
  standingRankDelta: number;

  // ── 党代会报告 ─────────────────────────────────────────────────────────────
  /** 上次党代会的游戏年份（-1=未参与）*/
  partyCongressYear: number;
  /** 历次党代会选择的报告主题（最多保存5次）*/
  partyCongressTopics: string[];
  /** 党代会选题累计影响：经济/生态/安全各自的政策加成值 */
  partyCongressEconBonus: number;
  partyCongressEcoBonus: number;
  partyCongressSecBonus: number;

  // ── v2.7 终局系统 ──────────────────────────────────────────────────────────
  /** 政治资本（用于议案/政策窗口/五年规划等高阶消耗）*/
  politicalCapital: number;
  /** 重大议案列表（JSON数组，每届两会提交）*/
  majorProposals: string;
  /** 已解锁政策工具（JSON数组，议案通过后解锁）*/
  policyTools: string;
  /** 政策领域加成（JSON对象，成功推动政策窗口后记录）*/
  policyFieldBonus: string;
  /** 五年规划专项提案：当届年份（-1=未提交）*/
  fiveYearPlanYear: number;
  /** 五年规划专项提案：选题（空字符串=未提交）*/
  fiveYearPlanTopic: string;
  /** 五年规划专项提案：是否通过 */
  fiveYearPlanPassed: boolean;
  /** 规划项目加成（JSON对象，通过提案后自动加政绩）*/
  planProjectBonus: string;
  /** 历史评价：经济维度得分（0-100）*/
  historicalEconScore: number;
  /** 历史评价：民生维度得分（0-100）*/
  historicalLivelihoodScore: number;
  /** 历史评价：廉洁维度得分（0-100）*/
  historicalIntegrityScore: number;
  /** 历史评价：改革维度得分（0-100）*/
  historicalReformScore: number;
  /** 历史定性标签（空字符串=未评定）*/
  historicalLabel: string;
  /** 政治遗产加成分（接班人顺利接位获得）*/
  legacyBonus: number;
  /** 是否选择强行续任 */
  retirementForced: boolean;
  /** 已主动退休（锁定高评价）*/
  retiredVoluntarily: boolean;

  // ── v2.9 新增系统字段 ──────────────────────────────────────────────────────
  /** 已命名历史遗产工程列表（JSON数组，每项格式："icon名称（类型）"）*/
  namedLandmarks: string;
  /** 路线博弈投票胜出方向（行政线15级）*/
  routeVoteResult: '' | 'economy' | 'balanced' | 'ecology' | 'security';
  /** 上次路线博弈游戏天（5年=1825天冷却）*/
  routeVoteDay: number;
  /** 国家荣誉等级（0=无,1=一级荣誉,2=特等荣誉）*/
  honorLevel: number;
  /** 国家荣誉授予游戏天 */
  honorDay: number;
  /** 是否已撰写回忆录 */
  memoirWritten: boolean;
  /** 回忆录披露风格 */
  memoirStyle: '' | 'conservative' | 'moderate' | 'bold';
  /** 回忆录带来的社会影响力加成 */
  memoirInfluence: number;

  // ── v3.0 干部晋升制度字段 ──────────────────────────────────────────────────
  /** 职级轨当前职级（1-27，与职务轨并行，"职级并行制度"）*/
  professionalRankLevel: number;
  /** 基层工作经历年数（rank1-3工作年数累计，晋升高级岗位的硬性前提）*/
  grassrootsExpYears: number;
  /** 最近一次专项考核分（0-100，上级专项检查）*/
  specialAssessScore: number;
  /** 最近一次民主测评分（0-100，下属同事评分）*/
  democraticEvalScore: number;
  /** 名额等待年数（0=有名额可晋升，>0=需等待）*/
  slotWaitYears: number;
  /** 上次发起民主测评的游戏天 */
  lastDemoEvalDay: number;
  /** 上次专项考核游戏天 */
  lastSpecialAssessDay: number;

  createdAt: string;
  updatedAt: string;
}

// ── 家庭背景常量 ────────────────────────────────────────────────────────────
export interface FamilyBackground {
  key: string;
  label: string;
  icon: string;
  desc: string;
  /** 初期人脉加成（reformFaction / pragmaticFaction 各加一半） */
  connectionBonus: number;
  /** 道德值加成（初始值调整） */
  moralBonus: number;
  /** 特殊标签说明 */
  tag: string;
}

export const FAMILY_BACKGROUNDS: FamilyBackground[] = [
  {
    key: '普通家庭',
    label: '普通家庭',
    icon: '🏠',
    desc: '来自普通工薪家庭，白手起家，脚踏实地',
    connectionBonus: 0,
    moralBonus: 5,
    tag: '道德 +5，无派系加成',
  },
  {
    key: '干部家庭',
    label: '干部家庭',
    icon: '🏛️',
    desc: '父辈有从政经历，拥有一定政治人脉资源',
    connectionBonus: 15,
    moralBonus: 0,
    tag: '初期人脉 +15，双派系各 +5',
  },
  {
    key: '军人家庭',
    label: '军人家庭',
    icon: '⭐',
    desc: '军人子弟，纪律严明，选择军转路线时有额外加成',
    connectionBonus: 10,
    moralBonus: 8,
    tag: '人脉 +10，道德 +8，军转加成翻倍',
  },
  {
    key: '商人家庭',
    label: '商人家庭',
    icon: '💼',
    desc: '商业世家，资源广博，但须警惕作风问题',
    connectionBonus: 20,
    moralBonus: -8,
    tag: '人脉 +20，道德 -8（初始道德较低）',
  },
];

// ── 初始政治倾向派系常量 ────────────────────────────────────────────────────
export interface InitFactionDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  desc: string;
  /** 对应的 primaryFaction key */
  factionKey: string;
  /** 初始该派系关系值加成 */
  relationBonus: number;
}

export const INIT_FACTIONS: InitFactionDef[] = [
  {
    key: '改革派',
    label: '改革派',
    icon: '🔥',
    color: '#B91C1C',
    bg: '#FEF2F2',
    desc: '锐意进取，推动改革开放，GDP导向',
    factionKey: 'reform',
    relationBonus: 20,
  },
  {
    key: '实干派',
    label: '实干派',
    icon: '🔧',
    color: '#1E40AF',
    bg: '#EFF6FF',
    desc: '踏实务实，注重执行与民生建设',
    factionKey: 'pragmatic',
    relationBonus: 20,
  },
  {
    key: '共青团系',
    label: '共青团系',
    icon: '🌟',
    color: '#C2410C',
    bg: '#FFF7ED',
    desc: '团系出身，群众路线，注重年轻干部培养',
    factionKey: 'cyl',
    relationBonus: 25,
  },
  {
    key: '技术官僚系',
    label: '技术官僚系',
    icon: '🔬',
    color: '#6D28D9',
    bg: '#F5F3FF',
    desc: '专业技术背景，政策导向理性务实',
    factionKey: 'techno',
    relationBonus: 25,
  },
  {
    key: '地方实力派',
    label: '地方实力派',
    icon: '🌄',
    color: '#166534',
    bg: '#F0FDF4',
    desc: '深耕地方，根基深厚，擅长地方经营',
    factionKey: 'local',
    relationBonus: 25,
  },
];

// ── 能力值与职级门槛 ────────────────────────────────────────────────────────
/** 各职级晋升所需最低能力值（低于此值无法晋升） */
export const ABILITY_RANK_MIN: Record<number, number> = {
  1: 0,   2: 0,   3: 0,
  4: 40,  5: 40,  6: 40,   // 县级
  7: 50,  8: 50,  9: 50,   // 市级
  10: 60, 11: 65,           // 副省/省级
  12: 70, 13: 70, 14: 70, 15: 70, // 国家级
};

/** 能力值影响民生指数每月随机加点数 */
export function getAbilityLivelihoodBonus(ability: number): number {
  if (ability >= 90) return 8;
  if (ability >= 80) return 5;
  if (ability >= 60) return 4;
  if (ability >= 50) return 2;
  return 0;
}

/** 14个可任职部门（晋升路径选择用） */
/** 晋升路径类型标签 */
export type DeptPromotionPathType = 'dept' | 'linecadre'; // dept=部门正职, linecadre=线上正职（非部门）

export interface DeptPromotionPath {
  deptKey: string;
  deptName: string;
  icon: string;
  headTitle: string;   // 对应职级的正职名称
  desc: string;
  pathType?: DeptPromotionPathType; // 默认 dept
}

/** 各职级可选的22部门正职晋升路径（含部门内和线上双轨） */
export function getDeptPromotionPaths(rankLevel: number): DeptPromotionPath[] {
  // 乡镇级（rank1-3）：乡镇科室负责人
  if (rankLevel >= 1 && rankLevel <= 3) {
    return [
      { deptKey: 'police',       deptName: '派出所',   icon: '🚔', headTitle: '派出所所长',     desc: '维护乡镇治安，户籍管理',   pathType: 'dept' },
      { deptKey: 'finance',      deptName: '财政所',   icon: '💰', headTitle: '财政所所长',     desc: '乡镇财政预算管理',         pathType: 'dept' },
      { deptKey: 'agriculture',  deptName: '农业站',   icon: '🌾', headTitle: '农业站站长',     desc: '农业技术推广、乡村振兴',   pathType: 'dept' },
      { deptKey: 'education',    deptName: '教育办',   icon: '📚', headTitle: '教育办主任',     desc: '管理辖区中小学校',         pathType: 'dept' },
      { deptKey: 'health2',      deptName: '卫生站',   icon: '🏥', headTitle: '卫生站站长',     desc: '基层医疗卫生服务',         pathType: 'dept' },
      { deptKey: 'transport',    deptName: '交通站',   icon: '🚗', headTitle: '交通站站长',     desc: '道路养护、运输管理',       pathType: 'dept' },
      { deptKey: 'ecology',      deptName: '环保站',   icon: '🌿', headTitle: '环保站站长',     desc: '环境保护与监测',           pathType: 'dept' },
      { deptKey: 'petition',     deptName: '信访室',   icon: '📮', headTitle: '信访室主任',     desc: '群众来信来访处置',         pathType: 'dept' },
      { deptKey: 'govoffice',    deptName: '政务办',   icon: '📋', headTitle: '政务办主任',     desc: '综合协调、文件起草',       pathType: 'dept' },
      { deptKey: 'market',       deptName: '市监所',   icon: '⚖️', headTitle: '市监所所长',     desc: '市场监管、食品安全',       pathType: 'dept' },
      // 线上路径：直接升镇党委委员/副镇长
      { deptKey: 'linecadre_deputy_town',  deptName: '副乡镇长', icon: '🏛️', headTitle: '副乡镇长（综合线）', desc: '进入乡镇政府领导班子，分管综合事务', pathType: 'linecadre' },
      { deptKey: 'linecadre_party_town',   deptName: '党委委员', icon: '🎖️', headTitle: '镇党委委员（党务线）', desc: '进入乡镇党委班子，分管党建组织工作', pathType: 'linecadre' },
    ];
  }
  // 县处级（rank4-6）：县/区下属局局长
  if (rankLevel >= 4 && rankLevel <= 6) {
    return [
      { deptKey: 'organization', deptName: '组织部',   icon: '🏛️', headTitle: '县委组织部部长', desc: '管理干部人事，党建工作',   pathType: 'dept' },
      { deptKey: 'propaganda',   deptName: '宣传部',   icon: '📢', headTitle: '县委宣传部部长', desc: '意识形态、文化宣传工作',   pathType: 'dept' },
      { deptKey: 'discipline',   deptName: '纪检委',   icon: '⚖️', headTitle: '县纪检委书记',   desc: '党风廉政、反腐败工作',   pathType: 'dept' },
      { deptKey: 'govoffice',    deptName: '政府办公室', icon: '📋', headTitle: '县政府办公室主任', desc: '综合协调、行政管理',   pathType: 'dept' },
      { deptKey: 'ndrc',         deptName: '发改委',   icon: '📊', headTitle: '县发展改革局局长', desc: 'GDP发展、项目审批',     pathType: 'dept' },
      { deptKey: 'finance',      deptName: '财政局',   icon: '💰', headTitle: '县财政局局长',   desc: '财政收支、预算管理',     pathType: 'dept' },
      { deptKey: 'police',       deptName: '公安局',   icon: '🚔', headTitle: '县公安局局长',   desc: '治安管理、刑事侦查',     pathType: 'dept' },
      { deptKey: 'agriculture',  deptName: '农业局',   icon: '🌾', headTitle: '县农业农村局局长', desc: '农业生产、乡村振兴',   pathType: 'dept' },
      { deptKey: 'education',    deptName: '教育局',   icon: '🎓', headTitle: '县教育局局长',   desc: '教育资源、学校管理',     pathType: 'dept' },
      { deptKey: 'health2',      deptName: '卫健局',   icon: '🏥', headTitle: '县卫生健康局局长', desc: '医疗卫生、公共健康',   pathType: 'dept' },
      { deptKey: 'industry',     deptName: '工业信息化局', icon: '🏭', headTitle: '县工信局局长', desc: '工业发展、数字经济',   pathType: 'dept' },
      { deptKey: 'naturalres',   deptName: '自然资源局', icon: '🌿', headTitle: '县自然资源局局长', desc: '土地管理、矿产资源', pathType: 'dept' },
      { deptKey: 'construction', deptName: '住建局',   icon: '🏗️', headTitle: '县住房城乡建设局局长', desc: '城市建设、住房管理', pathType: 'dept' },
      { deptKey: 'transport',    deptName: '交通运输局', icon: '🚗', headTitle: '县交通运输局局长', desc: '交通基础设施建设', pathType: 'dept' },
      // 线上路径：直接升副县长/县政协副主席
      { deptKey: 'linecadre_deputy_county', deptName: '副县长',    icon: '🏛️', headTitle: '副县长（综合线）',   desc: '进入县政府领导班子，分管经济社会事务', pathType: 'linecadre' },
      { deptKey: 'linecadre_standing',      deptName: '县委常委',  icon: '🎖️', headTitle: '县委常委（党务线）', desc: '进入县委常委班子，分管组织人事党务', pathType: 'linecadre' },
    ];
  }
  // 市厅级（rank7-9）：市直属局/委正职
  if (rankLevel >= 7 && rankLevel <= 9) {
    return [
      { deptKey: 'organization', deptName: '组织部',     icon: '🏛️', headTitle: '市委组织部部长', desc: '管理市级干部人事',   pathType: 'dept' },
      { deptKey: 'propaganda',   deptName: '宣传部',     icon: '📢', headTitle: '市委宣传部部长', desc: '意识形态、文化宣传', pathType: 'dept' },
      { deptKey: 'discipline',   deptName: '纪检委',     icon: '⚖️', headTitle: '市纪检委书记',   desc: '党纪监督、反腐工作', pathType: 'dept' },
      { deptKey: 'govoffice',    deptName: '政府办公室', icon: '📋', headTitle: '市政府秘书长',   desc: '市级综合协调',       pathType: 'dept' },
      { deptKey: 'ndrc',         deptName: '发改委',     icon: '📊', headTitle: '市发展改革委主任', desc: '城市经济规划',     pathType: 'dept' },
      { deptKey: 'finance',      deptName: '财政局',     icon: '💰', headTitle: '市财政局局长',   desc: '市级财政管理',       pathType: 'dept' },
      { deptKey: 'police',       deptName: '公安局',     icon: '🚔', headTitle: '市公安局局长',   desc: '城市治安、刑侦',     pathType: 'dept' },
      { deptKey: 'agriculture',  deptName: '农业农村委', icon: '🌾', headTitle: '市农业农村委主任', desc: '农业农村发展',     pathType: 'dept' },
      { deptKey: 'education',    deptName: '教育局',     icon: '🎓', headTitle: '市教育局局长',   desc: '市级教育管理',       pathType: 'dept' },
      { deptKey: 'health2',      deptName: '卫健委',     icon: '🏥', headTitle: '市卫生健康委主任', desc: '市级医疗卫生',     pathType: 'dept' },
      { deptKey: 'industry',     deptName: '工业信息化局', icon: '🏭', headTitle: '市工业和信息化局局长', desc: '工业信息化', pathType: 'dept' },
      { deptKey: 'naturalres',   deptName: '自然资源局', icon: '🌿', headTitle: '市自然资源局局长', desc: '土地资源管理',   pathType: 'dept' },
      { deptKey: 'construction', deptName: '住建局',     icon: '🏗️', headTitle: '市住房城乡建设局局长', desc: '城市建设规划', pathType: 'dept' },
      { deptKey: 'transport',    deptName: '交通运输局', icon: '🚗', headTitle: '市交通运输局局长', desc: '交通运输管理',   pathType: 'dept' },
      // 线上路径：直接升副市长/市委常委
      { deptKey: 'linecadre_deputy_city',  deptName: '副市长',   icon: '🏛️', headTitle: '副市长（综合线）',   desc: '进入市政府领导班子，分管重点专项工作', pathType: 'linecadre' },
      { deptKey: 'linecadre_city_standing',deptName: '市委常委', icon: '🎖️', headTitle: '市委常委（党务线）', desc: '进入市委常委班子，负责重大决策协商', pathType: 'linecadre' },
    ];
  }
  // 省部级（rank10-11）：省直属厅/委正职
  if (rankLevel >= 10 && rankLevel <= 11) {
    return [
      { deptKey: 'organization', deptName: '组织部',   icon: '🏛️', headTitle: '省委组织部部长', desc: '省级干部人事管理',     pathType: 'dept' },
      { deptKey: 'propaganda',   deptName: '宣传部',   icon: '📢', headTitle: '省委宣传部部长', desc: '省级意识形态工作',     pathType: 'dept' },
      { deptKey: 'discipline',   deptName: '纪检委',   icon: '⚖️', headTitle: '省纪检委书记',   desc: '省级党纪监督',         pathType: 'dept' },
      { deptKey: 'govoffice',    deptName: '政府办',   icon: '📋', headTitle: '省政府秘书长',   desc: '省级行政综合协调',     pathType: 'dept' },
      { deptKey: 'ndrc',         deptName: '发改委',   icon: '📊', headTitle: '省发展改革委主任', desc: '省级经济规划',       pathType: 'dept' },
      { deptKey: 'finance',      deptName: '财政厅',   icon: '💰', headTitle: '省财政厅厅长',   desc: '省级财政管理',         pathType: 'dept' },
      { deptKey: 'police',       deptName: '公安厅',   icon: '🚔', headTitle: '省公安厅厅长',   desc: '省级公安工作',         pathType: 'dept' },
      { deptKey: 'agriculture',  deptName: '农业农村厅', icon: '🌾', headTitle: '省农业农村厅厅长', desc: '省级农业农村工作', pathType: 'dept' },
      { deptKey: 'education',    deptName: '教育厅',   icon: '🎓', headTitle: '省教育厅厅长',   desc: '省级教育工作',         pathType: 'dept' },
      { deptKey: 'health2',      deptName: '卫健委',   icon: '🏥', headTitle: '省卫生健康委主任', desc: '省级卫生健康',       pathType: 'dept' },
      { deptKey: 'industry',     deptName: '工信厅',   icon: '🏭', headTitle: '省工业和信息化厅厅长', desc: '省级工业信息化', pathType: 'dept' },
      { deptKey: 'naturalres',   deptName: '自然资源厅', icon: '🌿', headTitle: '省自然资源厅厅长', desc: '省级自然资源管理', pathType: 'dept' },
      { deptKey: 'construction', deptName: '住建厅',   icon: '🏗️', headTitle: '省住房城乡建设厅厅长', desc: '省级住建工作',   pathType: 'dept' },
      { deptKey: 'transport',    deptName: '交通运输厅', icon: '🚗', headTitle: '省交通运输厅厅长', desc: '省级交通管理',   pathType: 'dept' },
      // 线上路径：直接升副省长/省委常委
      { deptKey: 'linecadre_deputy_prov',  deptName: '副省长',   icon: '🏛️', headTitle: '副省长（综合线）',   desc: '进入省政府领导班子，分管重大经济社会工作', pathType: 'linecadre' },
      { deptKey: 'linecadre_prov_standing',deptName: '省委常委', icon: '🎖️', headTitle: '省委常委（党务线）', desc: '进入省委常委班子，负责省级重大事务决策', pathType: 'linecadre' },
    ];
  }
  return [];
}

/** 相亲NPC */
export interface BlindDateNpc {
  id: string;           // uuid
  name: string;
  gender: '男' | '女';
  age: number;
  job: string;
  favor: number;        // 好感度 50-90
  introduced: boolean;  // 已认识
}

/** 民生指数历史快照（每届任期末或晋升时记录） */
export interface LivelihoodSnapshot {
  year: number;            // 游戏年份（gameDays/365 + 2000）
  score: number;           // 民生指数 0-100
  rankName: string;        // 当时职级名称
  cityName: string;        // 当时城市
}

// ============ 月度报告 ============
// ============ 信访事件 ============
export interface PetitionEvent {
  id: string;
  saveId: string;
  userId: string;
  eventType: 'complaint' | 'praise';
  title: string;
  content: string;
  gameDay: number;
  monthKey: number;
  bosFavorDelta: number;
  meritDelta: number;
  isProcessed: boolean;
  createdAt: string;
}

export interface MonthlyReport {
  id: string;
  saveId: string;
  monthKey: number;
  yearKey: number;
  deptKey: string;
  title: string;
  content: string;
  gdpChange: number;
  livelihoodChange: number;
  ecologyChange: number;
  businessChange: number;
  meritReward: number;
  isRead: boolean;
  createdAt: string;
}

// ============ 领导班子 ============
export interface LeadershipMember {
  id: string;
  saveId: string;
  subId: string | null;
  roleKey: string;
  roleLabel: string;
  subName: string;
  subAvatar: number;
  subGender: string;
  assignedDay: number;
}

// 各级别的领导班子角色（按现实党政体制配置）
export const LEADERSHIP_ROLES: Record<number, { key: string; label: string; tierLabel: string; organ: string; requiredSubLevel: number; concurrentLabel?: string }[]> = {
  1: [],
  2: [],

  // ── rank 3：乡镇长（党委副书记兼），可任命镇党委常委会其余成员 + 政府班子 ──
  3: [
    // 镇党委常委会（玩家为党委副书记、镇长；下列为其余8席）
    { key: 'town_party_full',    label: '专职党委副书记',  tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 3 }, // 正科级
    { key: 'town_disc',          label: '肃宪院长',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 }, // 副科级
    { key: 'town_org',           label: '组织委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '分管组织人事·协管人事办' },
    { key: 'town_prop',          label: '宣传委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_law',           label: '政法委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '兼任派出所所长' },
    { key: 'town_military',      label: '武装部长',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_npc',           label: '联邦国会主席',         tierLabel: '镇党委常委会', organ: '镇联邦国会',  requiredSubLevel: 3 }, // 正科级
    // 镇政府班子（政府办公会）
    { key: 'town_deputy_gov1',   label: '副镇长一',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管综治安全·兼任派出所所长' },
    { key: 'town_deputy_gov2',   label: '副镇长二',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管财政经济·兼任财政所所长' },
    { key: 'town_deputy_gov3',   label: '副镇长三',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管农业农村·兼任农业站站长' },
    { key: 'town_office_dir',    label: '政府办公室主任',   tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2 },
    { key: 'town_league_sec',    label: '镇团委书记',        tierLabel: '镇党委常委会', organ: '镇团委',  requiredSubLevel: 2, concurrentLabel: '团派路线基层起点·兼管青年工作站' },
  ],

  // ── rank 4：县委常委 / 副县长，与 rank 3 共用乡镇一级职位表 ──
  4: [
    { key: 'town_party_full',    label: '专职党委副书记',  tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 3 },
    { key: 'town_disc',          label: '肃宪院长',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_org',           label: '组织委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '分管组织人事·协管人事办' },
    { key: 'town_prop',          label: '宣传委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_law',           label: '政法委员',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2, concurrentLabel: '兼任派出所所长' },
    { key: 'town_military',      label: '武装部长',         tierLabel: '镇党委常委会', organ: '镇党委',  requiredSubLevel: 2 },
    { key: 'town_npc',           label: '联邦国会主席',         tierLabel: '镇党委常委会', organ: '镇联邦国会',  requiredSubLevel: 3 },
    { key: 'town_deputy_gov1',   label: '副镇长一',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管综治安全·兼任派出所所长' },
    { key: 'town_deputy_gov2',   label: '副镇长二',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管财政经济·兼任财政所所长' },
    { key: 'town_deputy_gov3',   label: '副镇长三',         tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2, concurrentLabel: '分管农业农村·兼任农业站站长' },
    { key: 'town_office_dir',    label: '政府办公室主任',   tierLabel: '镇政府班子',   organ: '镇政府',  requiredSubLevel: 2 },
    { key: 'town_league_sec',    label: '镇团委书记',        tierLabel: '镇党委常委会', organ: '镇团委',  requiredSubLevel: 2, concurrentLabel: '团派路线基层起点·兼管青年工作站' },
  ],

  // ── rank 5：县长（政府常务会） ──
  5: [
    { key: 'cty_exec_deputy',    label: '常务副县长',       tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4 }, // 副处级
    { key: 'cty_deputy_gov1',    label: '副县长一',         tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4, concurrentLabel: '分管政法·兼管公安局' },
    { key: 'cty_deputy_gov2',    label: '副县长二',         tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4, concurrentLabel: '分管财政经济·兼管财政局' },
    { key: 'cty_deputy_gov3',    label: '副县长三',         tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 4, concurrentLabel: '分管教育卫生·兼管教育局' },
    { key: 'cty_gov_sec',        label: '县政府办公室主任', tierLabel: '县政府常务会', organ: '县政府',  requiredSubLevel: 3 }, // 正科级
  ],

  // ── rank 6：县委书记（县委常委会，11人，玩家为书记） ──
  6: [
    { key: 'cty_party_deputy_sec', label: '县委副书记、县长',       tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 5 }, // 正处级
    { key: 'cty_party_full_sec',   label: '专职县委副书记',          tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 5 },
    { key: 'cty_disc',             label: '县肃宪院长',              tierLabel: '县委常委会', organ: '县纪委',  requiredSubLevel: 5 },
    { key: 'cty_org',              label: '县委党政人事院院长',            tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4, concurrentLabel: '分管组织·协管人社局' },
    { key: 'cty_prop',             label: '县委宣传部长',            tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4 },
    { key: 'cty_law',              label: '县委政法委书记',          tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4, concurrentLabel: '兼任公安局局长' },
    { key: 'cty_military',         label: '县人武部部长',            tierLabel: '县委常委会', organ: '县人武部',requiredSubLevel: 4 },
    { key: 'cty_exec_standing',    label: '常务副县长（县委常委）',  tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4, concurrentLabel: '分管财政·协管财政局' },
    { key: 'cty_united',           label: '县委统战部长',            tierLabel: '县委常委会', organ: '县委',    requiredSubLevel: 4 },
    { key: 'cty_npc',              label: '联邦国会主任',                tierLabel: '县委常委会', organ: '县联邦国会',  requiredSubLevel: 5 },
    { key: 'cty_league_sec',       label: '团县委书记',              tierLabel: '县委常委会', organ: '团委',    requiredSubLevel: 3, concurrentLabel: '团派路线县级关键岗·兼管青年联合会' },
  ],

  // ── rank 7：副市长，同时可管辖部分县委职位 ──
  7: [
    { key: 'city_deputy_gov1',   label: '副市长一',         tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管政法·兼任公安局局长' },
    { key: 'city_deputy_gov2',   label: '副市长二',         tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管财政经济·协管财政局' },
    { key: 'city_deputy_gov3',   label: '副市长三',         tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管教育文化·协管教育局' },
    { key: 'city_gov_office',    label: '市政府办公室主任', tierLabel: '市政府班子', organ: '市政府',  requiredSubLevel: 5 }, // 正处级
  ],

  // ── rank 8：市长（市政府常务会） ──
  8: [
    { key: 'city_exec_deputy',   label: '常务副市长',       tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6 }, // 副厅级
    { key: 'city_dep_gov1',      label: '副市长一',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管政法·兼任公安局局长' },
    { key: 'city_dep_gov2',      label: '副市长二',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管财政经济·协管财政局' },
    { key: 'city_dep_gov3',      label: '副市长三',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管教育文化·协管教育局' },
    { key: 'city_dep_gov4',      label: '副市长四',         tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 6, concurrentLabel: '分管生态环保·协管生态环保局' },
    { key: 'city_gov_sec',       label: '市政府秘书长',     tierLabel: '市政府常务会', organ: '市政府',  requiredSubLevel: 5 }, // 正处级
  ],

  // ── rank 9：市委书记（市委常委会，13人，玩家为书记） ──
  9: [
    { key: 'city_party_dep_sec',   label: '市委副书记、市长',       tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 7 }, // 正厅级
    { key: 'city_party_full_sec',  label: '专职市委副书记',          tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 7 },
    { key: 'city_disc',            label: '市肃宪院长',              tierLabel: '市委常委会', organ: '市纪委',  requiredSubLevel: 7 },
    { key: 'city_org',             label: '市委党政人事院院长',            tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 }, // 副厅级
    { key: 'city_prop',            label: '市委宣传部长',            tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_law',             label: '市委政法委书记',          tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_exec_standing',   label: '常务副市长（市委常委）',  tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_united',          label: '市委统战部长',            tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_military',        label: '市人武部政委',            tierLabel: '市委常委会', organ: '市人武部',requiredSubLevel: 6 },
    { key: 'city_sec_gen',         label: '市委秘书长',              tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 6 },
    { key: 'city_party_sec2',      label: '市委副书记（专职）',      tierLabel: '市委常委会', organ: '市委',    requiredSubLevel: 7 },
    { key: 'city_npc',             label: '联邦国会常委会主任',          tierLabel: '市委常委会', organ: '市联邦国会',  requiredSubLevel: 7 },
    { key: 'city_league_sec',      label: '团市委书记',              tierLabel: '市委常委会', organ: '团委',    requiredSubLevel: 5, concurrentLabel: '团派路线市级关键岗·常委级配置' },
  ],

  // ── rank 10：省长（省政府常务会） ──
  10: [
    { key: 'prov_exec_deputy',   label: '常务副省长',       tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 }, // 副部级
    { key: 'prov_dep_gov1',      label: '副省长一',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov2',      label: '副省长二',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov3',      label: '副省长三',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov4',      label: '副省长四',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_dep_gov5',      label: '副省长五',         tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 8 },
    { key: 'prov_gov_sec',       label: '省政府秘书长',     tierLabel: '省政府常务会', organ: '省政府',  requiredSubLevel: 7 }, // 正厅级
  ],

  // ── rank 11：省执政委书记（省执政委常委会，13人，玩家为书记） ──
  11: [
    { key: 'prov_party_dep_sec',  label: '省执政委副书记、省长',       tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 9 }, // 正部级
    { key: 'prov_party_full_sec', label: '专职省执政委副书记',          tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 9 },
    { key: 'prov_disc',           label: '省肃宪院长',              tierLabel: '省执政委常委会', organ: '省纪委',  requiredSubLevel: 8 }, // 副部级
    { key: 'prov_org',            label: '省执政委党政人事院院长',            tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 7 }, // 正厅
    { key: 'prov_prop',           label: '省执政委宣传部长',            tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 7 },
    { key: 'prov_law',            label: '省执政委政法委书记',          tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 7 },
    { key: 'prov_exec_standing',  label: '常务副省长（省执政委常委）',  tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 8 },
    { key: 'prov_united',         label: '省执政委统战部长',            tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 7 },
    { key: 'prov_sec_gen',        label: '省执政委秘书长',              tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 7 },
    { key: 'prov_military',       label: '省军区政委',              tierLabel: '省执政委常委会', organ: '省军区',  requiredSubLevel: 8 },
    { key: 'prov_party_sec2',     label: '省执政委副书记',              tierLabel: '省执政委常委会', organ: '省执政委',    requiredSubLevel: 8 },
    { key: 'prov_npc',            label: '联邦国会常委会主任',          tierLabel: '省执政委常委会', organ: '省联邦国会',  requiredSubLevel: 9 },
    { key: 'prov_league_sec',     label: '团省执政委书记',              tierLabel: '省执政委常委会', organ: '团委',    requiredSubLevel: 7, concurrentLabel: '团派路线省级核心岗·常委级配置' },
  ],

  // ── rank 12：部委副部长 ──
  12: [
    { key: 'min_exec_deputy',    label: '党委副书记（常务副部长）',  tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 }, // 副部级
    { key: 'min_vice1',          label: '副部长一（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 },
    { key: 'min_vice2',          label: '副部长二（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 },
    { key: 'min_disc',           label: '纪检组长',                  tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 }, // 正厅级
    { key: 'min_assist',         label: '部长助理（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 8 },
    { key: 'min_org',            label: '机关党委书记（党委委员）',  tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 },
    { key: 'min_tech',           label: '总工程师（党委委员）',      tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 },
    { key: 'min_policy',         label: '政策研究室主任（党委委员）',tierLabel: '部党委常委会', organ: '部党委',  requiredSubLevel: 7 },
  ],

  // ── rank 13：联邦副总统 ──
  13: [
    { key: 'vice_premier1',   label: '联邦副总统一',  tierLabel: '联邦内阁常务会', organ: '联邦内阁',  requiredSubLevel: 9 }, // 正部级
    { key: 'vice_premier2',   label: '联邦副总统二',  tierLabel: '联邦内阁常务会', organ: '联邦内阁',  requiredSubLevel: 9 },
    { key: 'vice_premier3',   label: '联邦副总统三',  tierLabel: '联邦内阁常务会', organ: '联邦内阁',  requiredSubLevel: 9 },
    { key: 'state_councilor1',label: '国务委员一',       tierLabel: '联邦内阁常务会', organ: '联邦内阁',  requiredSubLevel: 9 },
    { key: 'state_councilor2',label: '国务委员二',       tierLabel: '联邦内阁常务会', organ: '联邦内阁',  requiredSubLevel: 9 },
    { key: 'state_sec_gen',   label: '内阁秘书长',     tierLabel: '联邦内阁常务会', organ: '联邦内阁',  requiredSubLevel: 9 },
  ],

  // ── rank 14：联邦内阁总理任命班子（副总理/国务委员/各部部长/省执政委书记） ──
  14: [
    { key: 'vp_finance',     label: '主管财经副总理',           tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 }, // 副国级
    { key: 'vp_agriculture', label: '主管农业副总理',           tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 },
    { key: 'vp_science',     label: '主管科技副总理',           tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 },
    { key: 'vp_social',      label: '主管民生副总理',           tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 },
    { key: 'sc_foreign',     label: '主管外交国务委员',         tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 },
    { key: 'sc_defense',     label: '主管国防国务委员',         tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 },
    { key: 'sc_security',    label: '主管安全国务委员',         tierLabel: '联邦内阁班子', organ: '联邦内阁',        requiredSubLevel: 10 },
    { key: 'min_ndr',        label: '国家发改委主任',           tierLabel: '部级正职', organ: '发展改革系统',    requiredSubLevel: 9 },
    { key: 'min_finance',    label: '财政部部长',               tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_commerce',   label: '商务部部长',               tierLabel: '部级正职', organ: '经贸系统',        requiredSubLevel: 9 },
    { key: 'min_industry',   label: '工业和信息化部部长',       tierLabel: '部级正职', organ: '工业系统',        requiredSubLevel: 9 },
    { key: 'min_edu',        label: '教育部部长',               tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_sci',        label: '科学技术部部长',           tierLabel: '部级正职', organ: '科技系统',        requiredSubLevel: 9 },
    { key: 'min_agri',       label: '农业农村部部长',           tierLabel: '部级正职', organ: '农业系统',        requiredSubLevel: 9 },
    { key: 'min_civil',      label: '民政部部长',               tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_justice',    label: '司法部部长',               tierLabel: '部级正职', organ: '政法系统',        requiredSubLevel: 9 },
    { key: 'min_hr',         label: '人力资源和社会保障部部长', tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_natural',    label: '自然资源部部长',           tierLabel: '部级正职', organ: '资源环境系统',    requiredSubLevel: 9 },
    { key: 'min_eco',        label: '生态环境部部长',           tierLabel: '部级正职', organ: '资源环境系统',    requiredSubLevel: 9 },
    { key: 'min_housing',    label: '住房和城乡建设部部长',     tierLabel: '部级正职', organ: '建设系统',        requiredSubLevel: 9 },
    { key: 'min_transport',  label: '交通运输部部长',           tierLabel: '部级正职', organ: '基础设施系统',    requiredSubLevel: 9 },
    { key: 'min_water',      label: '水利部部长',               tierLabel: '部级正职', organ: '基础设施系统',    requiredSubLevel: 9 },
    { key: 'min_culture',    label: '文化和旅游部部长',         tierLabel: '部级正职', organ: '文化系统',        requiredSubLevel: 9 },
    { key: 'min_health',     label: '国家卫生健康委主任',       tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_veterans',   label: '退役军人事务部部长',       tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_emergency',  label: '应急管理部部长',           tierLabel: '部级正职', organ: '社会安全系统',    requiredSubLevel: 9 },
    { key: 'min_medins',     label: '国家医疗保障局局长',       tierLabel: '部级正职', organ: '社会民生系统',    requiredSubLevel: 9 },
    { key: 'min_fin_reg',    label: '国家金融监督管理总局局长', tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_csrc',       label: '中国证监会主席',           tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_tax',        label: '国家税务总局局长',         tierLabel: '部级正职', organ: '财税金融系统',    requiredSubLevel: 9 },
    { key: 'min_ethnic',     label: '国家民族事务委员会主任',   tierLabel: '部级正职', organ: '民族宗教系统',    requiredSubLevel: 9 },
    { key: 'min_sports',     label: '国家体育总局局长',         tierLabel: '部级正职', organ: '文化系统',        requiredSubLevel: 9 },
    { key: 'min_broadcast',  label: '国家广播电视总局局长',     tierLabel: '部级正职', organ: '文化系统',        requiredSubLevel: 9 },
    { key: 'min_stats',      label: '国家统计局局长',           tierLabel: '部级正职', organ: '综合行政系统',    requiredSubLevel: 9 },
    { key: 'cyd_league',     label: '共青团党务总枢府首席秘书长', tierLabel: '部级正职', organ: '群团系统',        requiredSubLevel: 9, concurrentLabel: '团派路线最高岗，届满后通常进省部级岗位' },
    { key: 'pbs_guangdong',  label: '粤海省执政委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_jiangsu',    label: '汉东省执政委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_zhejiang',   label: '瓯越省执政委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_shandong',   label: '齐鲁省执政委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_beijing',    label: '京都市委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_shanghai',   label: '沪海市委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_sichuan',    label: '蜀州省执政委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
    { key: 'pbs_hubei',      label: '楚北省执政委书记',             tierLabel: '省执政委书记级', organ: '省执政委系统',       requiredSubLevel: 9 },
  ],

  // ── rank 15：执政党主席（联邦政务常委、联邦政务委员、党务总枢府秘书处、肃宪督察院、联邦国会/国策协理堂、枢武府） ──
  15: [
    // 联邦政务常委会
    { key: 'r15_psc2',     label: '联邦内阁总理（联邦政务常委）',        tierLabel: '联邦政务常委会', organ: '联邦政务常委会', requiredSubLevel: 11 }, // 正国级
    { key: 'r15_psc3',     label: '联邦国会议长（联邦政务常委）',    tierLabel: '联邦政务常委会', organ: '联邦政务常委会', requiredSubLevel: 11 },
    { key: 'r15_psc4',     label: '国策协理堂主席（联邦政务常委）',      tierLabel: '联邦政务常委会', organ: '联邦政务常委会', requiredSubLevel: 11 },
    { key: 'r15_psc5',     label: '联邦政务常委（分管宣传）',          tierLabel: '联邦政务常委会', organ: '联邦政务常委会', requiredSubLevel: 11 },
    { key: 'r15_psc6',     label: '联邦政务常委（分管政法）',          tierLabel: '联邦政务常委会', organ: '联邦政务常委会', requiredSubLevel: 11 },
    { key: 'r15_psc7',     label: '肃宪院长（联邦政务常委）',        tierLabel: '联邦政务常委会', organ: '联邦政务常委会', requiredSubLevel: 11 },
    // 联邦政务委员
    { key: 'r15_pb_vp1',   label: '联邦副总统一（联邦政务委员）',    tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 }, // 副国级
    { key: 'r15_pb_vp2',   label: '联邦副总统二（联邦政务委员）',    tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 },
    { key: 'r15_pb_sc',    label: '国务委员（联邦政务委员）',          tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 },
    { key: 'r15_pb_bj',    label: '京都市委书记（联邦政务委员）',      tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 },
    { key: 'r15_pb_sh',    label: '沪海市委书记（联邦政务委员）',      tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 },
    { key: 'r15_pb_gd',    label: '粤海省执政委书记（联邦政务委员）',      tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 },
    { key: 'r15_pb_org',   label: '党政人事院院长（联邦政务委员）',    tierLabel: '联邦政务院', organ: '联邦政务院', requiredSubLevel: 10 },
    // 党务总枢府秘书处
    { key: 'r15_sec1',     label: '党务总枢府首席秘书长',              tierLabel: '党务总枢府秘书处', organ: '党务总枢府秘书处', requiredSubLevel: 10 },
    { key: 'r15_sec2',     label: '党务总枢府书记（组织）',          tierLabel: '党务总枢府秘书处', organ: '党务总枢府秘书处', requiredSubLevel: 9 },
    { key: 'r15_sec3',     label: '党务总枢府书记（宣传）',          tierLabel: '党务总枢府秘书处', organ: '党务总枢府秘书处', requiredSubLevel: 9 },
    { key: 'r15_office',   label: '党务总枢府办公厅主任',                  tierLabel: '党务总枢府秘书处', organ: '党务总枢府秘书处', requiredSubLevel: 9 },
    // 肃宪督察院
    { key: 'r15_ccdi_d1',  label: '肃宪副院长（常务）',                tierLabel: '肃宪督察院', organ: '肃宪督察院', requiredSubLevel: 10 },
    { key: 'r15_ccdi_d2',  label: '肃宪副院长（监督执纪）',        tierLabel: '肃宪督察院', organ: '肃宪督察院', requiredSubLevel: 9 },
    // 联邦国会常委会
    { key: 'r15_npc_d1',   label: '联邦国会第一副议长',      tierLabel: '联邦国会', organ: '联邦国会', requiredSubLevel: 10 },
    { key: 'r15_npc_d2',   label: '联邦国会副议长',          tierLabel: '联邦国会', organ: '联邦国会', requiredSubLevel: 9 },
    // 国策协理堂
    { key: 'r15_cppcc_d1', label: '国策协理堂第一副主席',              tierLabel: '国策协理堂', organ: '国策协理堂', requiredSubLevel: 10 },
    { key: 'r15_cppcc_d2', label: '国策协理堂副主席',                  tierLabel: '国策协理堂', organ: '国策协理堂', requiredSubLevel: 9 },
    // 枢武府
    { key: 'r15_cmc_v1',   label: '枢武府副主席一',                tierLabel: '枢武府', organ: '枢武府', requiredSubLevel: 10 },
    { key: 'r15_cmc_v2',   label: '枢武府副主席二',                tierLabel: '枢武府', organ: '枢武府', requiredSubLevel: 10 },
    { key: 'r15_cmc_jcs',  label: '枢武府参谋长',        tierLabel: '枢武府', organ: '枢武府', requiredSubLevel: 9 },
    // 中央直属机构要职
    { key: 'r15_cpd',      label: '国情传导署署长（联邦政务委员）',    tierLabel: '党务总枢府秘书处', organ: '国情传导署', requiredSubLevel: 10 },
    { key: 'r15_cuf',      label: '联邦统筹部部长（联邦政务委员）',    tierLabel: '党务总枢府秘书处', organ: '联邦统筹部', requiredSubLevel: 9 },
    { key: 'r15_cswa',     label: '社会治理部部长',              tierLabel: '党务总枢府秘书处', organ: '社会治理部', requiredSubLevel: 9 },
    { key: 'r15_cclc',     label: '联邦政法委书记（联邦政务委员）',    tierLabel: '党务总枢府秘书处', organ: '联邦政法委', requiredSubLevel: 10 },
    { key: 'r15_cybm',     label: '联邦网信办主任', tierLabel: '党务总枢府秘书处', organ: '联邦网信办', requiredSubLevel: 9 },
    { key: 'r15_partysch', label: '联邦行政学院院长',    tierLabel: '党务总枢府秘书处', organ: '联邦行政学院', requiredSubLevel: 10 },
  ],
};

// ============ 下属 ============
// 干部特长：影响岗位匹配加成与随机事件类型
export type CadreSpecialty = 'economy' | 'social' | 'legal' | 'agriculture' | 'tech' | 'party' | 'finance' | 'military';
export const CADRE_SPECIALTY_LABEL: Record<CadreSpecialty, string> = {
  economy: '经济', social: '社会', legal: '政法', agriculture: '农业',
  tech: '科技', party: '党务', finance: '财务', military: '军事',
};
export const CADRE_SPECIALTY_COLOR: Record<CadreSpecialty, string> = {
  economy: '#2B4B6F', social: '#2a7a3b', legal: '#7B0026', agriculture: '#5c7a1a',
  tech: '#4B0082', party: '#C82829', finance: '#7B5E2A', military: '#4a4a4a',
};

// 干部随机事件
export type SubEventType = 'transfer_request' | 'corruption_risk' | 'achievement' | 'complaint' | 'borrow';
export const SUB_EVENT_CONFIG: Record<SubEventType, { label: string; icon: string; urgency: 'high' | 'medium' | 'low' }> = {
  transfer_request:  { label: '申请调动',   icon: '📤', urgency: 'medium' },
  corruption_risk:   { label: '廉洁风险',   icon: '⚠️', urgency: 'high'   },
  achievement:       { label: '重大立功',   icon: '🏆', urgency: 'low'    },
  complaint:         { label: '群众投诉',   icon: '📩', urgency: 'high'   },
  borrow:            { label: '上级借调',   icon: '🔄', urgency: 'medium' },
};

// 任命提名状态
export type NominationStatus = 'idle' | 'reviewing' | 'approved' | 'rejected';

export interface Subordinate {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  position: string;
  role: string;
  avatarId: number;
  gender: string;
  ability: number;
  loyalty: number;
  integrity: number;
  experience: number;
  faction: Faction;      // 派系归属
  subLevel: number;      // 干部职级 1-12
  isAppointed: boolean;
  appointedRole: string | null;
  appointedDept: DeptKey | null;
  deptPosition: 'head' | 'deputy' | 'staff'; // 部门正职/副职/科员
  transferredCity: string | null;  // 调任城市记录
  lastAssessedDay: number;
  createdAt: string;
  // ── 新增字段 ──────────────────────────────────
  specialty: CadreSpecialty;          // 干部特长
  isReserve: boolean;                 // 是否列入后备干部库
  nominationStatus: NominationStatus; // 任命提名流程状态
  nominationDept: DeptKey | null;     // 提名目标部门
  nominationPosition: 'head' | 'deputy' | null; // 提名职位
  nominationStartDay: number | null;  // 考察开始游戏天
  eventType: SubEventType | null;     // 当前待处理事件
  eventDay: number | null;            // 事件发生游戏天
  eventHandled: boolean;              // 事件是否已处理
  satisfaction: number;               // 干部满意度 0-100
  lastReviewScores: string | null;    // 最近五维考核json
  cadreAge: number | null;            // 干部年龄
  borrowedTo: string | null;          // 借调单位（非空=被借调）
  // ── 个人档案 ──────────────────────────────────
  birthYear: number | null;           // 出生年份
  university: string | null;          // 毕业院校
  major: string | null;               // 所学专业
  hometown: string | null;            // 籍贯
}

// ============ 下属履历 ============
export interface SubResume {
  id: string;
  saveId: string;
  subId: string;
  position: string;    // 职务名称
  deptName: string;    // 所在部门
  startDay: number;    // 开始游戏天
  endDay: number | null; // 离任游戏天（null=仍在职）
  note: string;
  createdAt: string;
}

// ============ 招商引资企业 ============
export interface Enterprise {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  industry: string;       // 行业类型
  scale: 'small' | 'medium' | 'large'; // 规模
  investAmount: number;   // 投资额（万元）
  taxContribution: number; // 月税收贡献（万元）
  employeeCount: number;  // 从业人数
  introducedMonth: number; // 引进月份（游戏月）
  status: 'operating' | 'suspended' | 'closed';
  foundedDay: number;
  createdAt: string;
}

export const INDUSTRY_TYPES = [
  '制造业', '信息技术', '新能源', '生物医药', '高端装备',
  '商贸零售', '农业产业化', '文化旅游', '现代物流', '金融服务',
];

export const ENTERPRISE_NAME_PREFIXES = [
  '华盛', '鼎兴', '腾远', '宏达', '聚力', '鑫源', '瑞丰', '卓越', '恒信', '晨阳',
  '盛世', '创合', '博远', '同兴', '智汇', '龙腾', '福瑞', '康泰', '永业', '嘉和',
];
export const ENTERPRISE_NAME_SUFFIXES = [
  '科技有限公司', '实业有限公司', '投资集团', '新材料有限公司', '装备制造有限公司',
  '生物科技有限公司', '能源科技有限公司', '集团有限公司', '产业有限公司', '发展有限公司',
];

// ============ 招募候选人 ============
export interface RecruitCandidate {
  id: string;
  saveId: string;
  userId: string;
  yearKey: number;
  name: string;
  gender: string;
  avatarId: number;
  ability: number;
  loyalty: number;
  integrity: number;
  experience: number;
  trait: string;
  rankOrder: number | null;
  status: 'pending' | 'selected' | 'dismissed';
  createdAt: string;
  // ── 个人档案 ──────────────────────────────────
  birthYear: number | null;   // 出生年份
  university: string | null;  // 毕业院校
  major: string | null;       // 所学专业
  hometown: string | null;    // 籍贯
  score: number | null;       // 综合考试评分
}

// 下属特质标签（招募时随机带1个）
export const SUB_TRAITS = ['实干型', '才思敏捷', '忠诚可靠', '善于协调', '创新思维', '稳健务实', '敢于担当', '廉洁自律', '善于汇报', '执行力强'];


// ============ 家庭成员 ============
export interface FamilyMember {
  id: string;
  saveId: string;
  userId: string;
  memberType: MemberType;
  name: string;
  gender: string;
  birthDay: number;
  personality: string;
  job: string;
  studyScore: number;
  healthScore: number;
  moralScore: number;
  isAdult: boolean;
  adultPath: string | null;
  /** 是否受双规牵连，仕途受阻 */
  careerBlocked: boolean;
  /** 牵连原因说明 */
  blockReason: string;
  /** 牵连严重程度：'light' | 'medium' | 'severe' */
  blockSeverity: string;
  createdAt: string;
}

// ============ 上司任务 ============
export interface BossTask {
  id: string;
  saveId: string;
  userId: string;
  title: string;
  description: string;
  taskType: string;
  targetValue: number;
  currentValue: number;
  rewardMerit: number;
  rewardFavor: number;
  status: TaskStatus;
  deadlineDays: number;
  createdDay: number;
  bossLevel: number; // 1=直属 2=二级 3=三级
  isPostponed: boolean;
  createdAt: string;
  urgency: 'normal' | 'important' | 'urgent';
  penaltyMerit: number;
  penaltyFavor: number;
}

// ============ 事件记录 ============
export interface EventRecord {
  id: string;
  saveId: string;
  userId: string;
  eventType: EventType;
  title: string;
  description: string;
  choiceIndex: number | null;
  choiceText: string | null;
  meritChange: number;
  moralChange: number;
  gdpChange: number;
  livelihoodChange: number;
  ecologyChange: number;
  businessChange: number;
  gameDay: number;
  createdAt: string;
}

// ============ 案件 ============
export interface PoliceCase {
  id: string;
  saveId: string;
  userId: string;
  title: string;
  description: string;
  caseType: CaseType;
  difficulty: number;
  requiredPolice: number;
  rewardMerit: number;
  securityChange: number;
  status: CaseStatus;
  createdDay: number;
  solvedDay: number | null;
  createdAt: string;
}

// ============ 突发事件 ============
export interface EventChoice {
  text: string;
  meritChange: number;
  moralChange: number;
  gdpChange: number;
  livelihoodChange: number;
  ecologyChange: number;
  businessChange: number;
  securityChange?: number; // 治安指数变化（治安类事件专用）
  description: string;
}

export interface EventTemplate {
  type: EventType;
  title: string;
  description: string;
  choices: EventChoice[];
  /** 是否为重大事件——重大事件触发领导班子集体决策投票 */
  isMajor?: boolean;
}

// ============ 下属数量上限（每级增加10人）============
export const SUBORDINATE_LIMIT: Record<number, number> = {
  1: 10, 2: 20, 3: 30, 4: 40, 5: 50,
  6: 60, 7: 70, 8: 80, 9: 90, 10: 100,
  11: 110, 12: 120, 13: 130,
};

// ============ 建设项目 ============
export type BuildCategory = 'town' | 'county' | 'city' | 'province';
export type EffectType = 'gdp' | 'livelihood' | 'ecology' | 'business';

export interface BuildProject {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  category: BuildCategory;
  costMerit: number;
  costFund: number;
  durationDays: number;
  startDay: number;
  finishDay: number;
  status: 'building' | 'done';
  effectType: EffectType;
  effectValue: number;
  meritReward: number;
  createdAt: string;
}

export interface BuildProjectTemplate {
  name: string;
  desc: string;
  category: BuildCategory;
  /** 财政投入（元）—— 主要消耗 */
  costFund: number;
  durationDays: number;
  effectType: EffectType;
  effectValue: number;
  /** 竣工政绩奖励 */
  meritReward: number;
}

// ────────────────────────────────────────────────────────
// 城市建设项目模板
//
// costFund 单位：万元（与 player_saves.fund_balance 一致）
// 数值参照现实：乡镇5-80万 / 县级200-4000万 / 市级5000-80000万 / 省级50000-600000万
// 每个项目全局只能建设一次（已建或在建名称均屏蔽）
// ────────────────────────────────────────────────────────
export const BUILD_TEMPLATES: BuildProjectTemplate[] = [

  // ══════════════════ 乡镇级（rank 2-3）══════════════════

  // 交通基础设施
  { name: '通村公路硬化',      desc: '将泥土路改为水泥路，解决晴通雨阻问题，村民出行从根本改善',                                     category: 'town', costFund: 15,    durationDays: 60,  effectType: 'livelihood', effectValue: 8,  meritReward: 20 },
  { name: '通组路网建设',      desc: '打通各村民小组之间的道路断头路，完善乡镇路网体系',                                             category: 'town', costFund: 10,    durationDays: 45,  effectType: 'business',   effectValue: 6,  meritReward: 15 },
  { name: '危桥改造工程',      desc: '对辖区内评级为危桥的桥梁进行整体重建，消除安全隐患',                                           category: 'town', costFund: 12,    durationDays: 50,  effectType: 'livelihood', effectValue: 6,  meritReward: 14 },

  // 公共卫生
  { name: '乡镇卫生院扩建',    desc: '扩建现有卫生院门诊楼与住院楼，新增床位，提升基层诊疗能力',                                     category: 'town', costFund: 40,    durationDays: 120, effectType: 'livelihood', effectValue: 12, meritReward: 35 },
  { name: '村级卫生室建设',    desc: '在每个行政村配备标准卫生室，实现农村医疗服务"最后一公里"覆盖',                                 category: 'town', costFund: 5,     durationDays: 40,  effectType: 'livelihood', effectValue: 7,  meritReward: 18 },

  // 教育文化
  { name: '村小学修缮工程',    desc: '修缮危旧校舍，更新教学设施，改善农村儿童就学环境',                                             category: 'town', costFund: 20,    durationDays: 60,  effectType: 'livelihood', effectValue: 7,  meritReward: 18 },
  { name: '乡镇文化活动中心',  desc: '建设综合文化活动室，含图书角、文体器材，丰富群众精神文化生活',                                 category: 'town', costFund: 12,    durationDays: 45,  effectType: 'livelihood', effectValue: 5,  meritReward: 12 },

  // 商贸经济
  { name: '农村综合市场',      desc: '新建标准化农贸市场，结束露天摆摊历史，促进农产品流通',                                         category: 'town', costFund: 30,    durationDays: 70,  effectType: 'business',   effectValue: 8,  meritReward: 22 },
  { name: '电商服务站',        desc: '引进电商平台设立村镇服务站，帮助农户将农产品直接对接城市消费者',                               category: 'town', costFund: 4,     durationDays: 30,  effectType: 'business',   effectValue: 7,  meritReward: 15 },
  { name: '冷链储存仓库',      desc: '建设农产品冷链仓储设施，减少果蔬损耗，提高农业附加值',                                         category: 'town', costFund: 25,    durationDays: 80,  effectType: 'gdp',        effectValue: 8,  meritReward: 20 },

  // 生态环保
  { name: '农村污水处理站',    desc: '建设集中式污水处理设施，告别污水乱排，改善农村人居环境',                                       category: 'town', costFund: 35,    durationDays: 90,  effectType: 'ecology',    effectValue: 10, meritReward: 28 },
  { name: '生活垃圾处理站',    desc: '建设垃圾分类收集与无害化处理设施，推进农村人居环境整治',                                       category: 'town', costFund: 15,    durationDays: 50,  effectType: 'ecology',    effectValue: 7,  meritReward: 16 },
  { name: '农田防护林网',      desc: '营造防护林带，改善农田小气候，兼具水土保持与生态涵养功能',                                     category: 'town', costFund: 8,    durationDays: 60,  effectType: 'ecology',    effectValue: 6,  meritReward: 14 },

  // 民生保障
  { name: '公租房建设（乡镇）', desc: '建设低租金公租房，优先保障农村困难群体和外来务工人员居住需求',                               category: 'town', costFund: 60,    durationDays: 150, effectType: 'livelihood', effectValue: 10, meritReward: 30 },
  { name: '养老服务站',        desc: '建设乡镇养老服务中心，提供日间照料、助餐助浴等服务，应对农村老龄化',                           category: 'town', costFund: 14,    durationDays: 55,  effectType: 'livelihood', effectValue: 7,  meritReward: 16 },

  // ══════════════════ 县级（rank 4-6）══════════════════

  // 交通
  { name: '县城互通立交桥',    desc: '在主要干道交叉节点建设立交桥，缓解县城交通拥堵，提升通行效率',                                 category: 'county', costFund: 2000,   durationDays: 180, effectType: 'gdp',        effectValue: 10, meritReward: 60 },
  { name: '农村公路网提升',    desc: '对全县乡村公路实施提档升级，达到双车道技术标准，打通断头路',                                   category: 'county', costFund: 1500,   durationDays: 120, effectType: 'business',   effectValue: 8,  meritReward: 40 },
  { name: '公共停车场体系',    desc: '在县城商业区、医院、学校周边建设立体停车场，系统解决停车难题',                                 category: 'county', costFund: 800,   durationDays: 90,  effectType: 'business',   effectValue: 7,  meritReward: 30 },

  // 医疗卫生
  { name: '县人民医院扩建',    desc: '新建县人民医院外科楼，购置大型医疗设备，争创二级甲等医院',                                     category: 'county', costFund: 3000,   durationDays: 240, effectType: 'livelihood', effectValue: 15, meritReward: 90 },
  { name: '县中医院建设',      desc: '新建标准化中医院，发展中医药诊疗特色，传承地方中医资源',                                       category: 'county', costFund: 2000,   durationDays: 180, effectType: 'livelihood', effectValue: 10, meritReward: 60 },
  { name: '疾控与卫生监督中心', desc: '新建疾控中心实验室，提升重大疫情和突发公共卫生事件处置能力',                                  category: 'county', costFund: 1200,   durationDays: 150, effectType: 'livelihood', effectValue: 8,  meritReward: 45 },

  // 教育
  { name: '县职业技术学校',    desc: '建设一所涵盖汽修、电子、农业技术等专业的职业学校，培养本地技能人才',                           category: 'county', costFund: 2500,   durationDays: 200, effectType: 'livelihood', effectValue: 12, meritReward: 70 },
  { name: '县高中新校区',      desc: '在城东新区建设现代化高中校区，扩大优质教育资源供给，提升升学率',                               category: 'county', costFund: 3500,   durationDays: 270, effectType: 'livelihood', effectValue: 13, meritReward: 80 },

  // 产业经济
  { name: '县级工业园区',      desc: '规划建设标准厂房、配套道路和供排水体系，吸引劳动密集型企业入驻',                               category: 'county', costFund: 5000,   durationDays: 300, effectType: 'gdp',        effectValue: 18, meritReward: 110 },
  { name: '农产品加工园',      desc: '建设农副产品初加工与深加工园区，延伸农业产业链，提高农产品附加值',                             category: 'county', costFund: 3000,   durationDays: 200, effectType: 'gdp',        effectValue: 12, meritReward: 70 },
  { name: '现代物流中心',      desc: '建设县城骨干仓储物流园区，引入快递电商仓配一体化运营，降低物流成本',                           category: 'county', costFund: 2000,   durationDays: 150, effectType: 'business',   effectValue: 10, meritReward: 55 },

  // 生态
  { name: '城市湿地公园',      desc: '依托河道建设湿地生态公园，集生态保护、科普教育和市民休闲为一体',                               category: 'county', costFund: 1500,   durationDays: 150, effectType: 'ecology',    effectValue: 12, meritReward: 55 },
  { name: '生态防护林带',      desc: '沿县城周边营造绿化隔离林带，防止城镇扩张侵占农田，构建生态屏障',                               category: 'county', costFund: 800,   durationDays: 120, effectType: 'ecology',    effectValue: 10, meritReward: 40 },

  // 民生
  { name: '保障性住房小区（县）', desc: '新建廉租房和公租房小区，解决城镇低收入家庭和新市民住房困难',                               category: 'county', costFund: 4000,   durationDays: 240, effectType: 'livelihood', effectValue: 12, meritReward: 70 },
  { name: '综合体育场馆',      desc: '建设含体育场、游泳馆、篮球馆的综合体育中心，满足居民体育健身需求',                             category: 'county', costFund: 1500,   durationDays: 180, effectType: 'livelihood', effectValue: 8,  meritReward: 45 },
  { name: '县文化馆与图书馆',  desc: '建设现代化文化馆和公共图书馆，提升公共文化服务效能',                                           category: 'county', costFund: 1200,   durationDays: 150, effectType: 'livelihood', effectValue: 7,  meritReward: 38 },

  // ══════════════════ 市级（rank 7-9）══════════════════

  // 交通枢纽
  { name: '高铁站综合枢纽',    desc: '建设集高铁、城际、公交、出租于一体的综合交通枢纽，显著提升城市交通地位',                       category: 'city', costFund: 50000,   durationDays: 730, effectType: 'gdp',        effectValue: 22, meritReward: 320 },
  { name: '城市快速路环线',    desc: '建设城市一环快速路，实现城区重要节点快速联通，支撑城市空间扩展',                               category: 'city', costFund: 40000,   durationDays: 600, effectType: 'gdp',        effectValue: 16, meritReward: 240 },
  { name: '城市轨道交通1号线', desc: '建设城市轨道交通一期工程，缓解地面交通压力，引导城市沿轨道方向发展',                           category: 'city', costFund: 80000,   durationDays: 900, effectType: 'gdp',        effectValue: 25, meritReward: 380 },
  { name: '过境高速公路',      desc: '积极推动过境高速公路立项建设，打通对外交通通道，接入全国干线公路网',                           category: 'city', costFund: 45000,   durationDays: 720, effectType: 'business',   effectValue: 18, meritReward: 280 },
  { name: '跨江（河）特大桥',  desc: '建设跨越主要水系的特大型桥梁，将两岸发展要素高效连通',                                         category: 'city', costFund: 25000,   durationDays: 540, effectType: 'gdp',        effectValue: 14, meritReward: 200 },

  // 产业园区
  { name: '国家级高新技术开发区', desc: '申建国家高新区，引进高端制造、生物医药、电子信息等战略性新兴产业',                          category: 'city', costFund: 50000,   durationDays: 720, effectType: 'business',   effectValue: 24, meritReward: 360 },
  { name: '出口加工贸易区',    desc: '建设出口加工保税区，承接沿海产业转移，发展加工贸易与跨境电商',                                 category: 'city', costFund: 35000,   durationDays: 540, effectType: 'business',   effectValue: 18, meritReward: 260 },
  { name: '现代服务业集聚区',  desc: '规划建设金融、电商、文创、商务等现代服务业集聚区，推动经济结构优化',                           category: 'city', costFund: 20000,   durationDays: 450, effectType: 'gdp',        effectValue: 14, meritReward: 200 },

  // 教育
  { name: '大学城规划建设',    desc: '引进2-3所高校入驻大学城，补强城市高等教育短板，集聚科技创新资源',                              category: 'city', costFund: 40000,   durationDays: 720, effectType: 'livelihood', effectValue: 18, meritReward: 280 },
  { name: '职业教育园区',      desc: '建设现代职教园区，整合本地职业学校，打造区域职业教育高地',                                     category: 'city', costFund: 15000,   durationDays: 360, effectType: 'livelihood', effectValue: 12, meritReward: 180 },

  // 医疗
  { name: '三甲医院新建',      desc: '新建一所三级甲等综合医院，全面提升城市高端医疗服务能力',                                       category: 'city', costFund: 30000,   durationDays: 600, effectType: 'livelihood', effectValue: 16, meritReward: 250 },
  { name: '区域医学中心',      desc: '建设区域医学研究与临床诊疗中心，承担疑难危重病人救治和医学科研任务',                           category: 'city', costFund: 20000,   durationDays: 480, effectType: 'livelihood', effectValue: 12, meritReward: 190 },

  // 生态
  { name: '城市综合污染整治',  desc: '实施大气、水、土壤污染三位一体综合整治工程，环境质量达到国家标准',                             category: 'city', costFund: 20000,   durationDays: 450, effectType: 'ecology',    effectValue: 20, meritReward: 200 },
  { name: '城市生态绿道体系',  desc: '沿河道、山脉构建城市绿道网络，建成串联公园绿地的生态廊道',                                     category: 'city', costFund: 10000,   durationDays: 360, effectType: 'ecology',    effectValue: 14, meritReward: 150 },
  { name: '固体废弃物处理中心', desc: '建设生活垃圾焚烧发电厂和建筑垃圾循环利用基地，实现城市固废无害化处理',                        category: 'city', costFund: 15000,   durationDays: 400, effectType: 'ecology',    effectValue: 14, meritReward: 160 },

  // 民生
  { name: '保障房大规模建设',  desc: '推进保障性住房三年行动计划，大批量供应公租房、安置房，稳定房价预期',                           category: 'city', costFund: 50000,   durationDays: 600, effectType: 'livelihood', effectValue: 16, meritReward: 240 },
  { name: '市体育中心',        desc: '建设可承办省级赛事的综合体育中心，含体育场、馆和游泳跳水馆',                                   category: 'city', costFund: 15000,   durationDays: 400, effectType: 'livelihood', effectValue: 10, meritReward: 140 },
  { name: '会展经济中心',      desc: '建设大型会展综合体，举办行业博览会与贸易洽谈会，拉动消费与投资',                               category: 'city', costFund: 25000,   durationDays: 480, effectType: 'business',   effectValue: 16, meritReward: 220 },

  // ══════════════════ 省级（rank 10-11）══════════════════

  // 综合交通
  { name: '省会机场扩建（T3）', desc: '建设省会国际机场三期航站楼，将年旅客吞吐量提升至6000万人次',                                  category: 'province', costFund: 200000,  durationDays: 1460, effectType: 'gdp',        effectValue: 28, meritReward: 900 },
  { name: '城际铁路网络',      desc: '规划建设省内城际铁路主骨架，实现省会与主要地级市"1小时交通圈"',                               category: 'province', costFund: 500000,  durationDays: 1800, effectType: 'gdp',        effectValue: 30, meritReward: 1000 },
  { name: '高速公路千公里提速', desc: '对全省高速公路网进行扩容改造，新增高速里程超过1000公里，构建省内快速通道',                     category: 'province', costFund: 300000,  durationDays: 1200, effectType: 'business',   effectValue: 22, meritReward: 700 },

  // 开放型经济
  { name: '自由贸易试验区',    desc: '经联邦内阁批复设立自贸试验区，探索制度创新，打造对外开放新高地',                                 category: 'province', costFund: 400000,  durationDays: 1500, effectType: 'business',   effectValue: 32, meritReward: 1100 },
  { name: '国家级经济技术开发区', desc: '申建并建设国家级经开区，优化营商环境，大规模引进世界500强企业',                              category: 'province', costFund: 350000,  durationDays: 1300, effectType: 'gdp',        effectValue: 26, meritReward: 900 },
  { name: '跨境电商综合试验区', desc: '申建跨境电商综合试验区，发展数字贸易，打造内陆开放型经济增长极',                              category: 'province', costFund: 150000,  durationDays: 900,  effectType: 'business',   effectValue: 20, meritReward: 650 },

  // 高端产业
  { name: '集成电路产业基地',  desc: '建设集成电路设计、制造、封测全链条产业基地，补强电子信息产业短板',                             category: 'province', costFund: 600000,  durationDays: 1800, effectType: 'gdp',        effectValue: 30, meritReward: 1000 },
  { name: '新能源汽车产业园',  desc: '引进整车及配套企业，建设新能源汽车产业集群，打造省级支柱产业',                                 category: 'province', costFund: 400000,  durationDays: 1500, effectType: 'gdp',        effectValue: 26, meritReward: 900 },
  { name: '生物医药产业园区',  desc: '建设从研发到生产的生物医药全产业链园区，承接国家重大新药创制专项',                             category: 'province', costFund: 300000,  durationDays: 1200, effectType: 'gdp',        effectValue: 22, meritReward: 750 },

  // 生态
  { name: '国家生态文明试验区', desc: '创建国家生态文明建设示范省份，建立绿水青山转化为金山银山的体制机制',                          category: 'province', costFund: 200000,  durationDays: 1000, effectType: 'ecology',    effectValue: 30, meritReward: 700 },
  { name: '重大流域综合治理',  desc: '对省内重要流域实施系统治理，统筹上下游防洪、生态、供水，建设幸福河湖',                         category: 'province', costFund: 300000,  durationDays: 1200, effectType: 'ecology',    effectValue: 26, meritReward: 750 },
  { name: '百万亩国土绿化',    desc: '推进国家储备林和退耕还林工程，绿化国土100万亩，提高森林覆盖率',                               category: 'province', costFund: 150000,  durationDays: 900,  effectType: 'ecology',    effectValue: 20, meritReward: 580 },

  // 教育科技
  { name: '国家重点实验室',    desc: '争取在省内高校建设国家重点实验室，提升基础科研能力和人才引进竞争力',                           category: 'province', costFund: 200000,  durationDays: 1000, effectType: 'livelihood', effectValue: 18, meritReward: 620 },
  { name: '高校扩张工程',      desc: '支持省内高校新建或扩建校区，提升高等教育毛入学率，优化高校学科布局',                           category: 'province', costFund: 250000,  durationDays: 1200, effectType: 'livelihood', effectValue: 20, meritReward: 680 },

  // 民生
  { name: '超大规模保障房工程', desc: '建设百万套以上保障性住房，从根本解决城镇低收入家庭住房困难问题',                               category: 'province', costFund: 500000,  durationDays: 1800, effectType: 'livelihood', effectValue: 22, meritReward: 850 },
  { name: '全省医疗体系提升',  desc: '推动优质医疗资源扩容下沉，每个县至少配备一所三级医院，看病难在县域解决',                       category: 'province', costFund: 350000,  durationDays: 1400, effectType: 'livelihood', effectValue: 24, meritReward: 800 },
];

// 获取当前级别可用的项目
export function getAvailableProjects(rankLevel: number): BuildProjectTemplate[] {
  if (rankLevel <= 1) return [];
  if (rankLevel <= 3) return BUILD_TEMPLATES.filter(p => p.category === 'town');
  if (rankLevel <= 6) return BUILD_TEMPLATES.filter(p => p.category === 'county');
  if (rankLevel <= 9) return BUILD_TEMPLATES.filter(p => p.category === 'city');
  return BUILD_TEMPLATES.filter(p => p.category === 'province');
}

// ============ 管辖区域 ============
export interface GoverningArea {
  id: string;
  saveId: string;
  userId: string;
  areaName: string;
  areaType: 'village' | 'town' | 'district' | 'city_level';
  devIndex: number;
  favorIndex: number;
  lastVisitedDay: number;
  lastInvestedDay: number;
  createdAt: string;
  /** 发展指数历史记录，格式 [{m:月序, v:指数值}]，最多24条 */
  devHistory: { m: number; v: number }[];
}

// 各级地名池
const VILLAGE_NAMES = ['红星村', '幸福村', '桃花村', '青山村', '石桥村', '梅岭村', '竹溪村', '金沙村', '双龙村', '白云村', '清泉村', '丰收村'];
const TOWN_NAMES = ['清河镇', '桥头镇', '金桥镇', '阳光镇', '新华镇', '红旗镇', '兴隆镇', '庙街镇', '平原镇', '双溪镇', '白马镇', '梅林镇'];
const DISTRICT_NAMES = ['新城区', '东城区', '西城区', '南湖区', '开发区', '滨江区', '高新区', '经开区', '工业区', '文化区'];
const CITY_NAMES = ['清远市', '龙江市', '兴安市', '平川市', '云峰市', '临泉市', '漓江市', '锦阳市', '合阳市', '秀水市', '金明市'];

/** areaType 对应的中文标签 */
export const AREA_TYPE_LABEL: Record<GoverningArea['areaType'], string> = {
  village: '下辖村庄',
  town: '下辖乡镇',
  district: '下辖区县',
  city_level: '下辖地级市',
};

export function generateAreas(rankLevel: number, cityName: string): { name: string; type: GoverningArea['areaType'] }[] {
  let pool: string[];
  let type: GoverningArea['areaType'];
  let count: number;

  if (rankLevel <= 3) {
    pool = VILLAGE_NAMES; type = 'village'; count = 6;
  } else if (rankLevel <= 6) {
    pool = TOWN_NAMES; type = 'town'; count = 6;
  } else if (rankLevel <= 9) {
    pool = DISTRICT_NAMES; type = 'district'; count = 5;
  } else {
    pool = CITY_NAMES; type = 'city_level'; count = 5;
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const prefix = cityName.length > 2 ? cityName.slice(0, 2) : cityName;
  return shuffled.slice(0, count).map((n, i) => ({
    name: i === 0 ? n : `${prefix.charAt(i % prefix.length)}${n}`,
    type,
  }));
}

// ============ 游戏日期工具 ============
export function gameDaysToDate(days: number): string {
  const startDate = new Date(2020, 0, 1);
  startDate.setDate(startDate.getDate() + days);
  const year = startDate.getFullYear();
  const month = startDate.getMonth() + 1;
  const day = startDate.getDate();
  return `${year}年${month}月${day}日`;
}

// 根据出生日（游戏天数）和当前天数计算年龄
export function calcAge(birthDay: number, currentDay: number): number {
  return 22 + Math.floor((currentDay - birthDay) / 365);
}

// ============ 月度工作会议 ============
export type KpiType = 'gdp' | 'livelihood' | 'ecology' | 'business';
export const KPI_LABELS: Record<KpiType, string> = {
  gdp: 'GDP增长', livelihood: '民生提升', ecology: '生态改善', business: '营商环境',
};

export interface MeetingTask {
  subordinateId: string;
  subordinateName: string;
  kpiType: KpiType;
  targetValue: number; // 目标提升点数
  deadlineDay: number;
  status: 'pending' | 'done' | 'failed';
  completedDay: number | null;
}

export interface MonthlyMeeting {
  id: string;
  saveId: string;
  userId: string;
  monthKey: string;  // Math.floor(gameDays/30).toString()
  heldDay: number;
  tasks: MeetingTask[];
  createdAt: string;
}

// ============ 秘书 ============
export interface Secretary {
  id: string;
  saveId: string;
  userId: string;
  name: string;
  avatarId: number;
  ability: number;      // 0-100 秘书能力值
  lastDocworkDay: number;
  dailySchedule: string | null;
  createdAt: string;
  // 任命下属为专属秘书
  subId: string | null;       // 关联的下属id
  isAppointed: boolean;       // 是否已任命具体下属担任秘书
}

// ============ 城市金融 ============
export interface LoanRecord {
  id: string;
  amount: number;       // 万元
  rate: number;         // 年利率 0.xx
  startDay: number;
  dueDay: number;
  monthlyPay: number;
  status: 'active' | 'paid';
}

export interface InvestmentRecord {
  id: string;
  name: string;
  amount: number;       // 万元
  startDay: number;
  endDay: number;
  effectType: EffectType;
  effectValue: number;  // 到期时提升城市指数点数
  status: 'running' | 'done';
}

export interface CityFinance {
  id: string;
  saveId: string;
  userId: string;
  fundBalance: number;
  debtTotal: number;
  loans: LoanRecord[];
  investments: InvestmentRecord[];
  investGroupEstDay: number | null;
  createdAt: string;
  updatedAt: string;
}

// 贷款模板
export interface LoanTemplate {
  name: string;
  amount: number;
  rateYearly: number;
  durationDays: number;
  desc: string;
}
export const LOAN_TEMPLATES: LoanTemplate[] = [
  { name: '小额政策贷款',       amount: 50,     rateYearly: 0.038, durationDays: 365,  desc: '乡镇专用，小额短期政策性贷款，支持乡镇基础设施建设与民生项目' },
  { name: '县域发展专项贷款',   amount: 1000,   rateYearly: 0.042, durationDays: 730,  desc: '县级专用，县域经济发展专项贷款，支持工业园区和民生工程' },
  { name: '城市建设债券',       amount: 10000,  rateYearly: 0.035, durationDays: 1825, desc: '地级市专用，城投债，用于市政基础设施和重大工程建设' },
  { name: '省级重点项目贷款',   amount: 100000, rateYearly: 0.030, durationDays: 3650, desc: '省级专用，国家政策性银行低息贷款，支持省级重大产业和基础设施项目' },
];

// 招商引资项目模板
export interface InvestTemplate {
  name: string;
  minRank: number;  // 最低可用职级
  maxRank: number;  // 最高可用职级（-1不限）
  amount: number;
  durationDays: number;
  effectType: EffectType;
  effectValue: number;
  profitRate: number;   // 年化盈利率（如 0.08 = 8%）
  desc: string;
}
export const INVEST_TEMPLATES: InvestTemplate[] = [
  // 乡镇级（rank 1-3）：小额农业/特色产业，投资50-150万
  { name: '🌾 乡镇农业招商',     minRank: 1, maxRank: 3,  amount: 30,     durationDays: 180, effectType: 'gdp',        effectValue: 5,  profitRate: 0.12, desc: '引进农业龙头企业，建立订单农业基地，带动村民增收，提升乡镇GDP' },
  { name: '🏕 乡村生态旅游',     minRank: 1, maxRank: 3,  amount: 50,     durationDays: 240, effectType: 'ecology',    effectValue: 6,  profitRate: 0.10, desc: '依托山水资源发展农家乐、民宿旅游，改善生态的同时增加税收' },
  { name: '🏭 乡镇小微工业园',   minRank: 2, maxRank: 3,  amount: 80,     durationDays: 300, effectType: 'business',   effectValue: 6,  profitRate: 0.14, desc: '建设小微企业创业园，引进劳动密集型小企业，解决农村就业问题' },
  // 县级（rank 4-6）：中等产业园，投资500-3000万
  { name: '🏭 县域工业园招商',   minRank: 4, maxRank: 6,  amount: 500,    durationDays: 365, effectType: 'business',   effectValue: 10, profitRate: 0.13, desc: '招引制造业企业入驻县级工业园，改善营商环境，扩大就业规模' },
  { name: '🌿 县域生态旅游开发', minRank: 4, maxRank: 6,  amount: 300,    durationDays: 360, effectType: 'ecology',    effectValue: 8,  profitRate: 0.11, desc: '开发县域绿色生态旅游资源，打造特色旅游目的地，改善生态同时带来税收' },
  { name: '🏙 县城商业综合体',   minRank: 4, maxRank: 6,  amount: 800,    durationDays: 420, effectType: 'business',   effectValue: 12, profitRate: 0.15, desc: '引进商业地产企业开发购物中心，带动县城商业繁荣，增加财政税收' },
  { name: '🌾 农产品加工招商',   minRank: 4, maxRank: 6,  amount: 600,    durationDays: 300, effectType: 'gdp',        effectValue: 10, profitRate: 0.14, desc: '引进农业龙头企业在本地建立加工基地，延伸产业链，提高农民收入' },
  // 市级（rank 7-9）：大型产业，投资5000-50000万
  { name: '💡 市级科技产业园',   minRank: 7, maxRank: 9,  amount: 8000,   durationDays: 540, effectType: 'gdp',        effectValue: 18, profitRate: 0.18, desc: '引进高新技术企业集群，优化产业结构，打造城市创新发展引擎' },
  { name: '🏗 城市综合体开发',   minRank: 7, maxRank: 9,  amount: 5000,   durationDays: 480, effectType: 'business',   effectValue: 15, profitRate: 0.16, desc: '引进大型商业地产企业开发城市综合体，建设商业、办公、酒店一体化项目' },
  { name: '🏭 市级先进制造业基地', minRank: 7, maxRank: 9, amount: 15000, durationDays: 600, effectType: 'gdp',        effectValue: 20, profitRate: 0.14, desc: '引进国内外大型制造业企业建立区域生产基地，形成千亿产业集群' },
  { name: '🌊 现代服务业集聚',   minRank: 7, maxRank: 9,  amount: 10000,  durationDays: 540, effectType: 'business',   effectValue: 18, profitRate: 0.17, desc: '打造金融、电商、文创等现代服务业集聚区，推动产业升级转型' },
  // 省级（rank 10-11）：重大产业，投资10万-50万亿万
  { name: '🔬 省级高端产业招商', minRank: 10, maxRank: 11, amount: 80000,  durationDays: 730, effectType: 'gdp',        effectValue: 28, profitRate: 0.16, desc: '引进世界500强和国内头部企业建立区域总部，打造省级经济增长极' },
  { name: '🏗 省级平台公司投资', minRank: 10, maxRank: -1, amount: 120000, durationDays: 900, effectType: 'business',   effectValue: 25, profitRate: 0.12, desc: '省级城投平台统筹全省基础设施投资建设，稳定收益、激活营商环境' },
  // 国家级（rank 12+）
  { name: '🌐 国家战略产业布局', minRank: 12, maxRank: -1, amount: 500000, durationDays: 1095, effectType: 'gdp',       effectValue: 35, profitRate: 0.14, desc: '推动集成电路、航空航天、量子计算等国家战略性新兴产业布局，引领全球竞争' },
];


// ============ 职务兼职系统 ============
export interface ConcurrentPost {
  key: string;         // 唯一标识
  label: string;       // 显示名称
  category: string;    // 分类：联邦国会/国策协理堂/党委/其他
  minRank: number;     // 最低所需职级
  maxRank: number;     // 最高适用职级（-1不限）
  meritBonus: number;  // 每次会议/活动政绩加成
  favorBonus: number;  // 好感度加成
  desc: string;        // 职位描述
  icon: string;
}

/** 可担任的兼职职务配置（按级别分组） */
export const CONCURRENT_POST_CONFIG: ConcurrentPost[] = [
  // 联邦国会相关（全国级，12+）
  { key: 'npc_member',        label: '联邦国会代表',       category: '联邦国会',   minRank: 8,  maxRank: -1, meritBonus: 80,  favorBonus: 5,  desc: '参与联邦国会年度会议，审议国家法律法规，提交议案建议。', icon: '🏛️' },
  { key: 'npc_standing',      label: '联邦国会常委',       category: '联邦国会',   minRank: 11, maxRank: -1, meritBonus: 150, favorBonus: 10, desc: '联邦国会常委会委员，参与法律审议和重大事项决定。', icon: '⚖️' },
  { key: 'npc_vice_chair',    label: '联邦国会副委员长',   category: '联邦国会',   minRank: 13, maxRank: -1, meritBonus: 300, favorBonus: 15, desc: '联邦国会副议长，协助委员长工作，领导专项委员会。', icon: '🎖️' },
  // 国策协理堂相关
  { key: 'cppcc_member',      label: '国策协理堂委员',       category: '国策协理堂',   minRank: 8,  maxRank: -1, meritBonus: 60,  favorBonus: 5,  desc: '参与全国政治协商会议，就国家重大事务提出国策协理堂提案与意见。', icon: '🤝' },
  { key: 'cppcc_standing',    label: '国策协理堂常委',       category: '国策协理堂',   minRank: 11, maxRank: -1, meritBonus: 120, favorBonus: 8,  desc: '国策协理堂常务委员会委员，参与协商议事和重要提案审查。', icon: '📋' },
  { key: 'cppcc_vice_chair',  label: '国策协理堂副主席',     category: '国策协理堂',   minRank: 13, maxRank: -1, meritBonus: 250, favorBonus: 12, desc: '国策协理堂副主席，协助主席开展政治协商工作。', icon: '🌟' },
  // 党委相关兼职
  { key: 'central_committee', label: '中央委员',           category: '党委',       minRank: 11, maxRank: -1, meritBonus: 200, favorBonus: 12, desc: '中国共产党党务总枢府委员，参与党的重大方针政策讨论。', icon: '🔴' },
  { key: 'alternate_cc',      label: '中央候补委员',       category: '党委',       minRank: 10, maxRank: 12, meritBonus: 120, favorBonus: 8,  desc: '党务总枢府候补委员，可列席中央会议，为正式委员资格储备。', icon: '🟠' },
  { key: 'politburo',         label: '联邦政务委员',     category: '党委',       minRank: 13, maxRank: -1, meritBonus: 500, favorBonus: 20, desc: '联邦政务委员，参与最高政治决策，主导重要政策制定。', icon: '⭐' },
  // 省/市级联邦国会国策协理堂（地方级）
  { key: 'prov_npc_member',   label: '省联邦国会代表',         category: '地方联邦国会代表大会',   minRank: 6,  maxRank: 10, meritBonus: 30,  favorBonus: 3,  desc: '省级联邦国会代表大会代表，参与地方立法和监督工作。', icon: '🏠' },
  { key: 'prov_cppcc_member', label: '省国策协理堂委员',         category: '地方国策协理堂',   minRank: 6,  maxRank: 10, meritBonus: 25,  favorBonus: 3,  desc: '省级政治协商会议委员，就地方重大事务提案。', icon: '💬' },
  { key: 'city_npc_member',   label: '市联邦国会代表',         category: '地方联邦国会代表大会',   minRank: 4,  maxRank: 8,  meritBonus: 15,  favorBonus: 2,  desc: '地级市联邦国会代表大会代表，参与市级立法与监督。', icon: '🏙️' },
  // 其他专项职务
  { key: 'discipline_insp',   label: '纪检监察特派员',     category: '纪检',       minRank: 9,  maxRank: -1, meritBonus: 100, favorBonus: -3, desc: '负责专项纪检监察工作，开展廉政督查，提升整体廉洁度。', icon: '🔍' },
  { key: 'cyber_security',    label: '网络安全工作领导组成员', category: '专项',    minRank: 10, maxRank: -1, meritBonus: 80,  favorBonus: 4,  desc: '参与国家网络安全领导协调，推动数字治理体系建设。', icon: '💻' },
  { key: 'ecology_leader',    label: '生态文明建设专项组组长', category: '专项',    minRank: 9,  maxRank: -1, meritBonus: 90,  favorBonus: 5,  desc: '牵头推进生态文明建设重点工作，统筹协调绿色发展政策落地。', icon: '🌿' },
];

/** 获取当前职级可担任的兼职职务 */
export function getAvailableConcurrentPosts(rankLevel: number): ConcurrentPost[] {
  return CONCURRENT_POST_CONFIG.filter(
    p => p.minRank <= rankLevel && (p.maxRank === -1 || p.maxRank >= rankLevel),
  );
}

// ============ 退休年龄与退休机制配置 ============

/**
 * 各职级退休配置
 * baseAge    基准退休年龄（岁）；正国家级为 null（不强制）
 * maxDelayYears  可申请延迟退休的最长年数（0=不可延迟）
 * isVoluntaryAt  自主退休触发年龄（正国家级专用，null=不适用）
 * tier       职级层次描述
 * costPerDelay   申请1年延迟退休消耗的政绩值
 */
export interface RetirementConfig {
  baseAge: number | null;
  maxDelayYears: number;
  isVoluntaryAt: number | null;
  tier: string;
  costPerDelay: number;   // 每次申请延迟退休的政绩消耗
  delayNote: string;
}

export const RETIREMENT_CONFIG: Record<number, RetirementConfig> = {
  // rank 1-8：正厅级及以下，基准60岁，不可延迟
  1:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '科员级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  2:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '副科级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  3:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '正科级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  4:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '副处级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  5:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '正处级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  6:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '正处级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  7:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '副厅级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  8:  { baseAge: 60, maxDelayYears: 0, isVoluntaryAt: null, tier: '正厅级',   costPerDelay: 0,   delayNote: '基准退休年龄60周岁' },
  // rank 9-10：副部级，基准60岁，可延迟最长3年
  9:  { baseAge: 60, maxDelayYears: 3, isVoluntaryAt: null, tier: '副部级',   costPerDelay: 100, delayNote: '基准60岁，经组织批准可延迟最长3年（最晚63岁）' },
  10: { baseAge: 60, maxDelayYears: 3, isVoluntaryAt: null, tier: '副部级',   costPerDelay: 100, delayNote: '基准60岁，经组织批准可延迟最长3年（最晚63岁）' },
  // rank 11-12：正部级，基准60岁，可延迟最长3年
  11: { baseAge: 60, maxDelayYears: 3, isVoluntaryAt: null, tier: '正部级',   costPerDelay: 150, delayNote: '基准60岁，经组织批准可延迟最长3年（最晚63岁）' },
  12: { baseAge: 60, maxDelayYears: 3, isVoluntaryAt: null, tier: '正部级',   costPerDelay: 150, delayNote: '基准60岁，经组织批准可延迟最长3年（最晚63岁）' },
  // rank 13：副国家级，基准65岁，可延迟最长3年
  13: { baseAge: 65, maxDelayYears: 3, isVoluntaryAt: null, tier: '副国家级', costPerDelay: 200, delayNote: '基准65岁，经组织批准可延迟最长3年（最晚68岁）' },
  // rank 14-15：正国家级，不设强制退休，70岁可自主选择
  14: { baseAge: null, maxDelayYears: 0, isVoluntaryAt: 70, tier: '正国家级', costPerDelay: 0, delayNote: '不设法定强制退休年龄，70周岁时可自主选择' },
  15: { baseAge: null, maxDelayYears: 0, isVoluntaryAt: 70, tier: '正国家级', costPerDelay: 0, delayNote: '不设法定强制退休年龄，70周岁时可自主选择' },
};

/** 获取指定职级的退休配置 */
export function getRetirementConfig(rankLevel: number): RetirementConfig {
  return RETIREMENT_CONFIG[rankLevel] ?? RETIREMENT_CONFIG[1];
}

/** 获取有效退休年龄（计入已批准的延迟年数） */
export function getEffectiveRetirementAge(rankLevel: number, delayYearsGranted: number): number | null {
  const cfg = getRetirementConfig(rankLevel);
  if (cfg.baseAge === null) return null; // 正国家级无强制退休年龄
  return cfg.baseAge + Math.min(delayYearsGranted, cfg.maxDelayYears);
}

/**
 * 退休状态检查结果
 * none         — 未到退休相关节点
 * approaching  — 距退休不足12个月
 * voluntary    — 正国家级达到70岁，弹出自主选择弹窗
 * mandatory    — 已达有效退休年龄，强制退休（含延迟期满）
 */
export type RetirementStatusType = 'none' | 'approaching' | 'voluntary' | 'mandatory';

export interface RetirementStatus {
  type: RetirementStatusType;
  /** 距退休剩余岁数（approaching 时有意义）*/
  remainingYears?: number;
  /** 当前有效退休年龄（强制退休时使用）*/
  effectiveRetirementAge?: number;
  config: RetirementConfig;
}

/** 检查当前玩家的退休状态 */
export function checkRetirementStatus(
  rankLevel: number,
  playerAge: number,
  delayYearsGranted: number,
): RetirementStatus {
  const cfg = getRetirementConfig(rankLevel);

  // 正国家级——自主退休逻辑
  if (cfg.isVoluntaryAt !== null && playerAge >= cfg.isVoluntaryAt) {
    return { type: 'voluntary', config: cfg };
  }

  // 有基准退休年龄——强制/临近逻辑
  if (cfg.baseAge !== null) {
    const effective = cfg.baseAge + Math.min(delayYearsGranted, cfg.maxDelayYears);
    if (playerAge >= effective) {
      return { type: 'mandatory', effectiveRetirementAge: effective, config: cfg };
    }
    const remaining = effective - playerAge;
    if (remaining <= 1) {
      return { type: 'approaching', remainingYears: remaining, effectiveRetirementAge: effective, config: cfg };
    }
  }

  return { type: 'none', config: cfg };
}

/**
 * 正国家级续任投票（rank15 每届届满触发）
 * 参照现实：执政党主席、联邦总统、枢武府主席均由党代会、联邦国会等机构投票决定是否续任
 * 机制：基础通过率85%，绩优加成最高+12%；投票通过继续执政，失败则荣退
 */
export interface RenewalVoteResult {
  voteRate: number;     // 最终得票率（0-100）
  passed: boolean;      // 是否通过（>= 75）
  termsAfter: number;   // 投票通过后的届数
  breakdown: {
    base: number;       // 85
    moralBonus: number;
    meritBonus: number;
    favorBonus: number;
    stabilityBonus: number;
    random: number;     // ±随机波动
  };
}

/** 计算续任投票结果 */
export function calcRenewalVote(
  moralValue: number,
  meritPoints: number,
  cityGdp: number,
  bossFavor: number,
  boss2Favor: number,
  nationalTermsServed: number,
): RenewalVoteResult {
  const base = 85;
  // 道德值加成（廉洁形象）
  const moralBonus = moralValue >= 80 ? 5 : moralValue >= 60 ? 3 : moralValue >= 40 ? 1 : -2;
  // 政绩加成（GDP + 民生综合）
  const avgMetric = (cityGdp + meritPoints / 1000) / 2;
  const meritBonus = avgMetric >= 70 ? 4 : avgMetric >= 50 ? 2 : 0;
  // 上司好感（联邦政务常委会及联邦国会）
  const favorBonus = bossFavor >= 80 ? 3 : bossFavor >= 65 ? 1 : 0;
  // 稳定性加成：执政越久反而略降（党内年轻化压力）
  const stabilityBonus = nationalTermsServed === 0 ? 0 : nationalTermsServed >= 3 ? -5 : -2;
  // 随机波动 ±4（模拟党代会讨论变数）
  const random = Math.round((Math.random() * 8 - 4) * 10) / 10;

  const voteRate = Math.min(99, Math.max(60, base + moralBonus + meritBonus + favorBonus + stabilityBonus + random));
  return {
    voteRate: Math.round(voteRate * 10) / 10,
    passed: voteRate >= 75,
    termsAfter: nationalTermsServed + 1,
    breakdown: { base, moralBonus, meritBonus, favorBonus, stabilityBonus, random },
  };
}

// ============ 资金自动简写（全局通用）============
export function formatMoney(val: number): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000_000_000) return `${sign}${(abs / 1_000_000_000_000).toFixed(1)}万亿`;
  if (abs >= 100_000_000)       return `${sign}${(abs / 100_000_000).toFixed(1)}亿`;
  if (abs >= 10_000_000)        return `${sign}${(abs / 10_000_000).toFixed(1)}千万`;
  if (abs >= 10_000)            return `${sign}${(abs / 10_000).toFixed(1)}万`;
  return `${sign}${abs.toLocaleString()}`;
}

/**
 * 格式化财政资金（单位：万元）
 * 1亿 = 10000万；1万亿 = 100000000万
 * 超1万亿万元 → "X.X万亿元"；超1亿万元 → "X.X亿元"；超1万万元 → "X.X万元"；否则直接显示
 */
export function formatFund(wan: number): string {
  const abs = Math.abs(wan);
  const sign = wan < 0 ? '-' : '';
  if (abs >= 100_000_000) return `${sign}${(abs / 100_000_000).toFixed(1)}万亿元`;
  if (abs >= 10_000)      return `${sign}${(abs / 10_000).toFixed(1)}亿元`;
  if (abs >= 1_000)       return `${sign}${(abs / 1_000).toFixed(1)}千万元`;
  return `${sign}${abs.toLocaleString()}万元`;
}

// 全国GDP估算（根据rankLevel和cityGdp指数计算，单位亿）
export function estimateNationalGdp(rankLevel: number, cityGdp: number): number {
  // 基础值：模拟全国GDP约120万亿，根据指数上下浮动
  const base = 1_200_000_000_000_000; // 1200万亿分（显示为120万亿）
  const factor = 0.7 + (cityGdp / 100) * 0.6;
  return Math.round((base * factor) / 100_000_000); // 返回亿元
}


// =====================================================================
// ========  中央核心权力架构（国家级职位体系）  ========================
// =====================================================================

/** 职位等级：L1=联邦政务常委会成员 | L2=联邦政务委员 | L3=副国家级/正部辅助 | L4=正部辅助 */
export type NationalRankTier = 'L1' | 'L2' | 'L3' | 'L4';

/** 中央职位所属权力机构 */
export type NationalOrgan =
  | '联邦政务常委会'
  | '联邦政务院'
  | '党务总枢府秘书处'
  | '肃宪督察院'
  | '联邦国会常委会'
  | '中国人民政治协商会议'
  | '枢武府'
  | '联邦内阁'
  | '国情传导署'
  | '联邦统筹部'
  | '联邦政法委'
  | '社会治理部'
  | '联邦行政学院'
  | '中央网信委办公室'
  | '共青团中央';

export interface NationalPosition {
  key: string;
  title: string;
  tier: NationalRankTier;
  organ: NationalOrgan;
  /** 是否为联邦政务常委会核心成员（七人决议机制参与者） */
  isPSC: boolean;
  desc: string;
  /** 常见兼任说明 */
  concurrentNote?: string;
}


// ─── 联邦政务常委会（7名常委）────────────────────────────────────
export const PSC_POSITIONS: NationalPosition[] = [
  { key:'psc_1', title:'执政党中央执政党主席', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'党的最高领导职务，主持联邦政务院、联邦政务常委会工作，统领全党全军全国工作。',
    concurrentNote:'兼任联邦总统、枢武府主席，集党政军最高权力于一身' },
  { key:'psc_2', title:'联邦内阁总理', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'主持联邦内阁工作，是国家最高行政机关的负责人，统筹协调全国经济社会发展与政府日常运转。',
    concurrentNote:'同时担任联邦政务常委，党内第二号领导人' },
  { key:'psc_3', title:'联邦国会议长', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'主持联邦国会常委会工作，负责立法、监督与联邦国会常委会各专门委员会事务。',
    concurrentNote:'同时担任联邦政务常委，党内第三号领导人，兼任联邦国会常委会党委书记' },
  { key:'psc_4', title:'国策协理堂主席', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'主持中国人民政治协商会议全国委员会工作，负责政治协商、民主监督与参政议政。',
    concurrentNote:'同时担任联邦政务常委，部分届次兼任党务总枢府首席秘书长' },
  { key:'psc_5', title:'党务总枢府首席秘书长', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'主持党务总枢府秘书处日常工作，协调党联邦政务院决议的贯彻执行，分管宣传意识形态与精神文明建设。',
    concurrentNote:'同时担任联邦政务常委，兼任中央宣传思想文化工作领导小组组长' },
  { key:'psc_6', title:'内阁常务副总统', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'协助总理主持联邦内阁常务工作，排名第一的联邦副总统，统筹协调重大经济与民生发展事项。',
    concurrentNote:'同时担任联邦政务常委，党内第六号领导人' },
  { key:'psc_7', title:'肃宪院长', tier:'L1', organ:'联邦政务常委会', isPSC:true,
    desc:'主持肃宪督察院、肃宪督察院工作，负责党纪国法监督执行。',
    concurrentNote:'兼任肃宪督察院主任，是反腐败斗争的最高主持者' },
];


// ─── 联邦政务委员（约18名非常委委员）────────────────────────
export const POLITBURO_POSITIONS: NationalPosition[] = [
  { key:'pb_premier_dep', title:'联邦副总统（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'协助总理分管经济、农业、科技、民生等专项工作，通常同时担任联邦政务委员。' },
  { key:'pb_state_council', title:'国务委员（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'协助总理处理重大综合性事务，常分管外交、国防、公安等特定领域。',
    concurrentNote:'可能兼任外交部长或国防部长' },
  { key:'pb_bj_sec', title:'京都市委书记（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'主持京都市委工作，首都地位使该职通常配备联邦政务委员资格。',
    concurrentNote:'首都重要省执政委书记，惯例配联邦政务委员' },
  { key:'pb_sh_sec', title:'沪海市委书记（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'主持沪海市委工作，全国最大经济中心的党委负责人，惯例享联邦政务委员级别。' },
  { key:'pb_gd_sec', title:'粤海省执政委书记（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'主持粤海省执政委工作，作为经济第一大省，省执政委书记通常为联邦政务委员。' },
  { key:'pb_xj_sec', title:'新疆党委书记（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'主持西域维吾尔自治区党委工作，重要边疆地区负责人，配联邦政务委员资格。' },
  { key:'pb_cmc_vice', title:'枢武府副主席（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'协助枢武府主席领导全国武装力量，通常为军队最高实职将领。',
    concurrentNote:'通常配备两位，为军队系统最高代表' },
  { key:'pb_org_dept', title:'党政人事院院长（联邦政务委员）', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'主管全国干部选拔任用、党员管理与党建工作，掌握人事核心资源。' },
  { key:'pb_others', title:'其他联邦政务委员', tier:'L2', organ:'联邦政务院', isPSC:false,
    desc:'担任重要党政职务的联邦政务委员，包括重要省份及部门负责人等。' },
];


// ─── 党务总枢府秘书处 ──────────────────────────────────────────────
export const SECRETARIAT_POSITIONS: NationalPosition[] = [
  { key:'sec_first', title:'党务总枢府首席秘书长', tier:'L2', organ:'党务总枢府秘书处', isPSC:false,
    desc:'主持党务总枢府秘书处日常工作，负责党的日常事务与联邦政务院决议的贯彻执行。',
    concurrentNote:'通常由联邦政务常委兼任（排名第五）' },
  { key:'sec_m1', title:'党务总枢府书记（组织）', tier:'L3', organ:'党务总枢府秘书处', isPSC:false,
    desc:'协助处理党的中枢工作，分管党务组织建设与干部事务协调。' },
  { key:'sec_m2', title:'党务总枢府书记（宣传）', tier:'L3', organ:'党务总枢府秘书处', isPSC:false,
    desc:'协助处理宣传意识形态领域党务，协调中央媒体与舆论工作。' },
  { key:'sec_m3', title:'党务总枢府书记（统战）', tier:'L3', organ:'党务总枢府秘书处', isPSC:false,
    desc:'协助统一战线与民族宗教领域党务事项，联络各民主党派和无党派人士。' },
  { key:'sec_general_office', title:'党务总枢府办公厅主任', tier:'L3', organ:'党务总枢府秘书处', isPSC:false,
    desc:'负责中共党务总枢府办公厅工作，是党中央日常运转的最高执行协调者。',
    concurrentNote:'党务总枢府书记兼任，掌握党中枢信息流' },
];

// ─── 肃宪督察院 ──────────────────────────────────────
export const CCDI_POSITIONS: NationalPosition[] = [
  { key:'ccdi_deputy1', title:'肃宪副院长（常务）', tier:'L2', organ:'肃宪督察院', isPSC:false,
    desc:'协助书记主持肃宪督察院日常工作，负责纪检监察体系的具体运营管理。' },
  { key:'ccdi_deputy2', title:'肃宪副院长（监督执纪）', tier:'L3', organ:'肃宪督察院', isPSC:false,
    desc:'分管监督执纪问责领域，负责重要案件查处与问责制度建设。' },
  { key:'ccdi_deputy3', title:'肃宪副院长（审查调查）', tier:'L3', organ:'肃宪督察院', isPSC:false,
    desc:'分管案件审查调查工作，负责违纪违法干部的立案审查。' },
  { key:'ccdi_inspection', title:'中央巡视工作领导小组组长', tier:'L3', organ:'肃宪督察院', isPSC:false,
    desc:'负责统筹协调中央巡视工作，对各省、央企、金融机构开展政治巡视。',
    concurrentNote:'通常由肃宪副院长兼任' },
];


// ─── 联邦国会常委会 ──────────────────────────────
export const NPC_POSITIONS: NationalPosition[] = [
  { key:'npc_deputy1', title:'联邦国会第一副议长', tier:'L2', organ:'联邦国会常委会', isPSC:false,
    desc:'协助委员长主持联邦国会常委会工作，分管特定立法领域或联系省级联邦国会。',
    concurrentNote:'通常为联邦政务委员或退休联邦政务常委转任' },
  { key:'npc_deputy2', title:'联邦国会副议长（若干）', tier:'L3', organ:'联邦国会常委会', isPSC:false,
    desc:'分管各专门委员会工作，通常由退休正部级干部或民主党派主要负责人担任。' },
  { key:'npc_sec_gen', title:'联邦国会常委会秘书长', tier:'L4', organ:'联邦国会常委会', isPSC:false,
    desc:'负责联邦国会常委会办公厅工作，协调联邦国会日常行政事务与会议筹备。' },
];

// ─── 中国人民政治协商会议全国委员会 ─────────────────────────
export const CPPCC_POSITIONS: NationalPosition[] = [
  { key:'cppcc_deputy1', title:'国策协理堂第一副主席', tier:'L2', organ:'中国人民政治协商会议', isPSC:false,
    desc:'协助主席主持国策协理堂工作，负责联系重要社会阶层与统一战线工作。',
    concurrentNote:'通常为联邦政务委员' },
  { key:'cppcc_deputy2', title:'国策协理堂副主席（若干）', tier:'L3', organ:'中国人民政治协商会议', isPSC:false,
    desc:'分管联系特定界别，通常由各民主党派主席、无党派人士代表或退休省部级干部担任。' },
  { key:'cppcc_sec_gen', title:'国策协理堂秘书长', tier:'L4', organ:'中国人民政治协商会议', isPSC:false,
    desc:'负责国策协理堂办公厅及日常行政工作，协调提案办理与委员联络服务。' },
];

// ─── 枢武府 ─────────────────────────────────────────
export const CMC_POSITIONS: NationalPosition[] = [
  { key:'cmc_vice1', title:'枢武府副主席（主持联合作战）', tier:'L2', organ:'枢武府', isPSC:false,
    desc:'协助主席主持枢武府日常工作，分管联合作战指挥体系与重大军事行动统筹协调。',
    concurrentNote:'通常为联邦政务委员，上将军衔' },
  { key:'cmc_vice2', title:'枢武府副主席（主持战略后勤）', tier:'L2', organ:'枢武府', isPSC:false,
    desc:'协助主席主持枢武府日常工作，分管军队战略建设、后勤装备与国防科工体系。',
    concurrentNote:'通常为联邦政务委员，上将军衔' },
  { key:'cmc_jcs', title:'枢武府参谋长', tier:'L3', organ:'枢武府', isPSC:false,
    desc:'统筹协调全军联合作战行动，是军队作战指挥体系的最高运筹参谋长。',
    concurrentNote:'枢武府委员，上将军衔' },
  { key:'cmc_political', title:'枢武府政治工作部主任', tier:'L3', organ:'枢武府', isPSC:false,
    desc:'主管全军政治工作，负责思想建军、党的领导制度在军队中的落实。',
    concurrentNote:'枢武府委员，上将军衔' },
  { key:'cmc_logistics', title:'枢武府后勤保障部部长', tier:'L3', organ:'枢武府', isPSC:false,
    desc:'统管全军后勤保障、装备物资供给与战时后勤动员体系。',
    concurrentNote:'枢武府委员，上将军衔' },
  { key:'cmc_office', title:'枢武府办公厅主任', tier:'L4', organ:'枢武府', isPSC:false,
    desc:'负责枢武府办公厅日常运转，协调枢武府文件下发与重要会议组织。' },
];


// ─── 联邦内阁（正部级常委会成员 + 重要部委）────────────────────
export const STATE_COUNCIL_POSITIONS: NationalPosition[] = [
  // ── 联邦内阁常委会成员（非联邦政务常委的副总理/国务委员）──
  { key:'sc_vp1', title:'联邦副总统（分管农业·科技）', tier:'L2', organ:'联邦内阁', isPSC:false,
    desc:'协助总理分管农业农村、科学技术、粮食安全等领域，联系农业农村部、科技部等。',
    concurrentNote:'通常同时担任联邦政务委员（见联邦政务院板块）' },
  { key:'sc_vp2', title:'联邦副总统（分管工业·能源）', tier:'L2', organ:'联邦内阁', isPSC:false,
    desc:'协助总理分管工业经济、能源、交通、国有资产等领域，联系工信部、发改委、国资委等。' },
  { key:'sc_vp3', title:'联邦副总统（分管民生·社保）', tier:'L2', organ:'联邦内阁', isPSC:false,
    desc:'协助总理分管教育、卫生、社保、就业等民生工作，联系教育部、卫健委、人社部等。' },
  { key:'sc_councilor1', title:'国务委员（分管外交）', tier:'L2', organ:'联邦内阁', isPSC:false,
    desc:'协助总理处理外交事务，通常担任国家外交委员会副主任，处理重大双边外交。',
    concurrentNote:'可能兼任外交部部长，为正部级高配国务委员' },
  { key:'sc_councilor2', title:'国务委员（分管国防·国安）', tier:'L2', organ:'联邦内阁', isPSC:false,
    desc:'协助总理处理国防与国家安全事务，联系国防部、国家安全部等。',
    concurrentNote:'可能兼任国防部部长' },
  { key:'sc_sec_gen', title:'内阁秘书长', tier:'L2', organ:'联邦内阁', isPSC:false,
    desc:'负责联邦内阁办公厅工作，协调联邦内阁各机构日常运转，是联邦内阁最重要的后台管理者。',
    concurrentNote:'通常兼任国务委员，联邦内阁常委会固定成员' },

  // ── 外交·国防·政法 ──
  { key:'sc_mfa', title:'外交部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持外交部工作，代表国家开展双边多边外交，参与重大国际事务谈判与磋商。',
    concurrentNote:'常由国务委员兼任（正部级高配）' },
  { key:'sc_mod', title:'国防部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国防部工作，负责对外军事交流与国防政策对外宣示，对内统筹国防建设事务。',
    concurrentNote:'常由国务委员兼任，同时担任枢武府委员' },
  { key:'sc_mps', title:'公安部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持公安部工作，统筹全国公安系统社会治安与侦查工作，负责出入境管理。' },
  { key:'sc_mss', title:'国家安全部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家安全部工作，负责国内反间谍与境外情报搜集，职权高度保密。' },
  { key:'sc_moj', title:'司法部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持司法部工作，统筹全国法律事务、司法行政管理、律师与公证行业监管。' },

  // ── 经济·财政·金融 ──
  { key:'sc_ndrc', title:'国家发展和改革委员会主任', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'统筹全国经济体制改革与发展规划，审批重大投资项目，负责宏观调控综合协调。' },
  { key:'sc_mof', title:'财政部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持财政部工作，管理国家预算、税收分配与国债发行，是国家财政资源最高管理者。' },
  { key:'sc_pboc', title:'中国人民银行行长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持中国人民银行工作，负责货币政策制定与实施、金融稳定与外汇管理。' },
  { key:'sc_sasac', title:'联邦内阁国资委主任', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'代表联邦内阁对中央国有企业行使出资人职责，监管重要行业央企的人事与绩效考核。' },
  { key:'sc_mofcom', title:'商务部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持商务部工作，统筹国内贸易与对外经贸合作，负责外商投资管理与反倾销工作。' },
  { key:'sc_samr', title:'国家市场监督管理总局局长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'统一监管市场秩序、食品药品安全、知识产权与反垄断，是最大的综合市场监管机构。' },
  { key:'sc_nao', title:'审计署审计长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家审计署工作，对中央预算执行与财政收支开展独立审计监督。' },

  // ── 产业·民生·科教 ──
  { key:'sc_miit', title:'工业和信息化部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'统筹工业经济发展、信息化建设与国防科工，管理电信频率与互联网行业。' },
  { key:'sc_mee', title:'生态环境部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持生态环境部工作，统筹大气、水、土壤污染防治与应对气候变化政策。' },
  { key:'sc_moe', title:'教育部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持教育部工作，统筹全国基础教育、高等教育与职业教育政策，负责高考制度管理。' },
  { key:'sc_most', title:'科学技术部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持科技部工作，统筹国家重大科技专项，推进科技体制改革与创新驱动发展战略。' },
  { key:'sc_nhc', title:'国家卫生健康委员会主任', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持卫健委工作，统筹全国医疗卫生体系、公共卫生应急与人口健康政策。' },
  { key:'sc_mara', title:'农业农村部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持农业农村部工作，统筹农业生产、农村改革与乡村振兴战略实施。' },
  { key:'sc_mot', title:'交通运输部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持交通运输部工作，统筹公路、铁路、水运、民航综合交通运输体系建设。' },
  { key:'sc_mohr', title:'人力资源和社会保障部部长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持人社部工作，统筹全国就业促进、社会保险、工资收入分配与人事管理。' },
  { key:'sc_ndrc_dep', title:'国家发改委常务副主任', tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'协助主任主持发改委日常工作，分管综合、投资、价格等核心业务部门。' },
  { key:'sc_mof_dep', title:'财政部常务副部长', tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'协助部长主持财政部日常工作，负责预算编制审核与地方财政关系统筹协调。' },

  // ── 民生·住建·水利·自然资源 ──
  { key:'sc_mca',    title:'民政部部长',             tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持民政部工作，统筹全国低保救助、养老服务、殡葬管理、婚姻登记与基层自治，是民生保障的核心主管部门。' },
  { key:'sc_mhurd',  title:'住房和城乡建设部部长',   tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持住建部工作，统筹全国城乡规划建设、住房保障体系与建筑市场管理，负责房地产市场宏观调控政策协调。' },
  { key:'sc_mwr',    title:'水利部部长',             tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持水利部工作，统筹全国水资源管理、重大水利工程建设与防汛抗旱应急，负责河长制、南水北调等重点工作。' },
  { key:'sc_mnr',    title:'自然资源部部长',         tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持自然资源部工作，统一管理土地、矿产、海洋、地质等自然资源，负责国土空间规划与自然保护地体系建设。' },
  { key:'sc_mct',    title:'文化和旅游部部长',       tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持文旅部工作，统筹全国文化事业发展、旅游产业促进与非物质文化遗产保护，负责文化外交与"走出去"工程。' },

  // ── 新设与改革部委 ──
  { key:'sc_mvaa',   title:'退役军人事务部部长',     tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持退役军人事务部工作（2018年新设），统筹全国退役军人安置保障、权益维护与烈士褒扬，维护军人优待制度体系。' },
  { key:'sc_mem',    title:'应急管理部部长',         tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持应急管理部工作（2018年新设），统筹全国安全生产监管、自然灾害防治、消防救援与重大突发事件应急处置。' },
  { key:'sc_neac',   title:'国家民族事务委员会主任', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家民委工作，统筹全国民族关系协调、少数民族经济社会发展与民族政策研究，是民族团结工作最高行政机构。' },

  // ── 金融·市场监管 ──
  { key:'sc_nhsa',   title:'国家金融监督管理总局局长', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持金融监管总局工作（2023年由银保监会升格），统一监管银行业、保险业与非银行金融机构，维护金融系统安全。' },
  { key:'sc_csrc',   title:'中国证券监督管理委员会主席', tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持证监会工作，统一监管全国证券、期货与基金市场，负责上市公司信披监管与资本市场稳定。' },
  { key:'sc_nhia',   title:'国家医疗保障局局长',     tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家医保局工作（2018年新设），统筹全国基本医疗保险、药品集采与医保基金安全监管，是"灵魂砍价"集采政策决策核心。' },
  { key:'sc_sta',    title:'国家税务总局局长',       tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家税务总局工作，统一管理全国税收征管与稽查，负责税收政策执行与纳税服务优化，是财政收入核心保障机构。' },
  { key:'sc_nrta',   title:'国家广播电视总局局长',   tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持广电总局工作，监管全国广播电视与网络视听节目内容，负责影视许可证审批，与宣传部共同把控舆论导向。' },
  { key:'sc_gsa',    title:'国家体育总局局长',       tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家体育总局工作，统筹全国竞技体育与大众健身政策，负责奥运会等重大赛事备战与体育产业发展。' },
  { key:'sc_nbs',    title:'国家统计局局长',         tier:'L3', organ:'联邦内阁', isPSC:false,
    desc:'主持国家统计局工作，负责全国GDP、CPI等重要经济社会数据统计发布，维护统计数据真实性，是宏观决策数据基础的守护者。' },

  // ── 副部级直属机构 ──
  { key:'sc_nfga',   title:'国家粮食和物资储备局局长', tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'统筹全国粮食收购储运与战略物资储备，负责国家粮食安全战略执行与应急储备体系建设，受发改委管理的副部级直属机构。' },
  { key:'sc_nfla',   title:'国家林业和草原局局长',   tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'统筹全国林草资源保护与合理利用，负责退耕还林、湿地保护与国家公园体系建设，副部级、由自然资源部管理。' },
  { key:'sc_nrca',   title:'国家铁路局局长',         tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'负责全国铁路安全监管与行业监管，制定铁路技术标准，监督国家铁路集团安全运营，交通运输部管理的副部级机构。' },
  { key:'sc_cma',    title:'中国气象局局长',         tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'主持中国气象局工作，提供全国气象预报预警服务，开展气候变化应对研究，维护气象探测网络安全稳定运行。' },
  { key:'sc_cnipa',  title:'国家知识产权局局长',     tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'主持国家知识产权局工作，负责专利、商标审查注册与知识产权保护，推进"知识产权强国"战略实施，由市场监管总局管理。' },
  { key:'sc_gao',    title:'联邦内阁研究室主任',       tier:'L4', organ:'联邦内阁', isPSC:false,
    desc:'主持联邦内阁研究室工作，为总理和联邦内阁起草重要文稿，开展重大政策理论研究，是最高行政机构的核心智囊参谋机构。' },
];

// ─── 国情传导署（意识形态核心机构）─────────────────────────
export const CPD_POSITIONS: NationalPosition[] = [
  { key:'cpd_minister', title:'国情传导署署长', tier:'L2', organ:'国情传导署', isPSC:false,
    desc:'主持国情传导署全面工作，统筹党的意识形态工作、新闻舆论管理与文化产业政策，向党务总枢府秘书处负责。',
    concurrentNote:'通常由联邦政务委员担任（副国级高配正部级）' },
  { key:'cpd_deputy1', title:'国情传导署常务副部长', tier:'L3', organ:'国情传导署', isPSC:false,
    desc:'协助部长主持宣传部日常工作，分管新闻出版、网络宣传与对外传播等核心业务。' },
  { key:'cpd_deputy2', title:'国情传导署副部长（网络舆论）', tier:'L3', organ:'国情传导署', isPSC:false,
    desc:'分管互联网内容管理、网络舆论引导与新媒体平台监管，兼联系国家广播电视总局。' },
  { key:'cpd_deputy3', title:'国情传导署副部长（文化产业）', tier:'L3', organ:'国情传导署', isPSC:false,
    desc:'分管文化艺术、出版发行、影视管理与文化产业发展，联系中国作家协会、中国文联等团体。' },
  { key:'cpd_xinhua', title:'新华通讯社社长', tier:'L3', organ:'国情传导署', isPSC:false,
    desc:'主持新华社全面工作，统领全球200余个驻外分社，是国家最重要的官方通讯社负责人。',
    concurrentNote:'副部级正职，受国情传导署业务指导' },
  { key:'cpd_people_daily', title:'人民日报社总编辑', tier:'L3', organ:'国情传导署', isPSC:false,
    desc:'主持人民日报社编辑出版工作，是党中央机关报的最高新闻决策者，负责重要舆论定调。' },
  { key:'cpd_cctv', title:'中央广播电视总台台长', tier:'L3', organ:'国情传导署', isPSC:false,
    desc:'主持中央广播电视总台全面工作，统管CCTV、中国国际电视台（CGTN）等多个频道平台。' },
];

// ─── 中央统一战线工作部（统战工作核心机构）────────────────
export const UFWD_POSITIONS: NationalPosition[] = [
  { key:'ufwd_minister', title:'联邦统筹部部长', tier:'L2', organ:'联邦统筹部', isPSC:false,
    desc:'主持联邦统筹部全面工作，统筹非中共党派、无党派人士、少数民族、宗教界与港澳台海外侨胞联络工作。',
    concurrentNote:'通常由党务总枢府书记兼任' },
  { key:'ufwd_deputy1', title:'联邦统筹部常务副部长', tier:'L3', organ:'联邦统筹部', isPSC:false,
    desc:'协助部长主持日常统战工作，分管民主党派与无党派人士联络，兼联系全国工商联等团体。' },
  { key:'ufwd_deputy2', title:'联邦统筹部副部长（港澳台）', tier:'L3', organ:'联邦统筹部', isPSC:false,
    desc:'分管港澳台工作协调与对台统战工作，联系全国台湾同胞投资企业联谊会等港澳台涉侨机构。' },
  { key:'ufwd_deputy3', title:'联邦统筹部副部长（民族宗教）', tier:'L3', organ:'联邦统筹部', isPSC:false,
    desc:'分管少数民族事务与宗教工作，兼联系国家民族事务委员会、国家宗教事务局业务。' },
  { key:'ufwd_cppcc_liai', title:'全国工商联主席', tier:'L3', organ:'联邦统筹部', isPSC:false,
    desc:'主持全国工商业联合会工作，联系非公有制经济代表人士，是统战系统联系民营企业家的重要渠道。',
    concurrentNote:'正部级，受联邦统筹部指导' },
];

// ─── 联邦政法委员会（政法系统最高协调机构）────────────────
export const CPLC_POSITIONS: NationalPosition[] = [
  { key:'cplc_sec', title:'联邦政法委员会书记', tier:'L2', organ:'联邦政法委', isPSC:false,
    desc:'主持联邦政法委工作，统筹协调公检法司等政法机关，负责维护社会稳定与重大政治敏感案件协调处理。',
    concurrentNote:'通常由联邦政务委员担任（副国级高配正部级）' },
  { key:'cplc_deputy', title:'联邦政法委秘书长', tier:'L3', organ:'联邦政法委', isPSC:false,
    desc:'负责联邦政法委日常运转与综合协调，是政法委核心行政运作的具体执行负责人。' },
  { key:'cplc_spc', title:'联邦联邦最高法院院长', tier:'L3', organ:'联邦政法委', isPSC:false,
    desc:'主持联邦联邦最高法院全面工作，行使最高司法解释权，统管全国法院审判工作，是国家最高审判机关的负责人。',
    concurrentNote:'正部级，党党务总枢府委员，联邦最高法院同时接受联邦国会监督' },
  { key:'cplc_spp', title:'联邦总检察署检察长', tier:'L3', organ:'联邦政法委', isPSC:false,
    desc:'主持联邦总检察署全面工作，负责对全国刑事案件的法律监督，统管职务犯罪检察与公益诉讼工作。' },
  { key:'cplc_mps', title:'公安部部长（联邦政法委委员）', tier:'L3', organ:'联邦政法委', isPSC:false,
    desc:'作为联邦政法委委员参与政法协调，同时主持公安部工作，是政法委中权力最大的成员之一。' },
  { key:'cplc_mss', title:'国家安全部部长（联邦政法委委员）', tier:'L3', organ:'联邦政法委', isPSC:false,
    desc:'作为联邦政法委委员参与政法协调，同时主持国家安全部工作，负责反间谍与境外情报工作。' },
  { key:'cplc_moj', title:'司法部部长（联邦政法委委员）', tier:'L3', organ:'联邦政法委', isPSC:false,
    desc:'作为联邦政法委委员参与政法协调，统管全国司法行政体系、律师公证行业与社区矫正工作。' },
];

// ─── 社会治理部（2023年新设，基层治理核心）────────────
export const CSWB_POSITIONS: NationalPosition[] = [
  { key:'cswb_minister', title:'社会治理部部长', tier:'L3', organ:'社会治理部', isPSC:false,
    desc:'主持社会治理部全面工作。该部2023年新设，统筹党建引领基层治理、新经济组织和新社会组织党建工作。',
    concurrentNote:'正部级，中央直属机构' },
  { key:'cswb_deputy', title:'社会治理部副部长', tier:'L3', organ:'社会治理部', isPSC:false,
    desc:'协助部长分管社区治理、网格化管理与新兴领域党建工作，推进党的建设向社会末梢延伸。' },
];

// ─── 联邦行政学院（联邦行政学院）（干部教育培训核心机构）────────
export const CPCSCHOOL_POSITIONS: NationalPosition[] = [
  { key:'cpcschool_pres', title:'联邦行政学院院长', tier:'L2', organ:'联邦行政学院', isPSC:false,
    desc:'主持联邦行政学院暨联邦行政学院工作，负责高级干部政治理论培训与党的理论研究工作。',
    concurrentNote:'通常由党务总枢府书记兼任，是高级干部晋升培训的枢纽' },
  { key:'cpcschool_exec_vp', title:'联邦行政学院常务副校长', tier:'L3', organ:'联邦行政学院', isPSC:false,
    desc:'协助校长主持联邦行政学院日常教学与行政管理，是党校具体运营的最高执行官。' },
  { key:'cpcschool_vp', title:'联邦行政学院副校长（联邦行政学院副院长）', tier:'L3', organ:'联邦行政学院', isPSC:false,
    desc:'协助主持党校或联邦行政学院工作，分管特定教研领域或学员管理工作。' },
];

// ─── 中央网络安全和信息化委员会办公室（网信办）────────────
export const CAC_POSITIONS: NationalPosition[] = [
  { key:'cac_dir', title:'联邦网信办主任（国家互联网信息办公室主任）', tier:'L2', organ:'中央网信委办公室', isPSC:false,
    desc:'统筹网络安全与信息化工作，监管互联网内容、数据安全与网络平台合规，是数字中国建设的核心主管部门负责人。',
    concurrentNote:'正部级，通常由联邦政务委员担任（高配）' },
  { key:'cac_dep_dir', title:'联邦网信办副主任', tier:'L3', organ:'中央网信委办公室', isPSC:false,
    desc:'协助主任分管网络安全审查、算法治理、个人信息保护或国际网络合作，是数字治理具体推进的核心官员。' },
  { key:'cac_dep_content', title:'联邦网信办副主任（网络内容管理）', tier:'L3', organ:'中央网信委办公室', isPSC:false,
    desc:'专责互联网内容生态治理，负责有害信息清查、网络平台内容合规审查与"清朗"系列专项行动统筹。' },
];

// ─── 共青团中央（团派路线的出发地与重要晋升节点）────────────
export const CYCL_POSITIONS: NationalPosition[] = [
  { key:'cycl_first', title:'共青团中央第一书记', tier:'L3', organ:'共青团中央', isPSC:false,
    desc:'主持共青团中央全面工作，是全国青年组织的最高负责人。正部级，党务总枢府委员。',
    concurrentNote:'团派路线核心高位，届满后多转任省执政委书记或中央部委部长' },
  { key:'cycl_standing', title:'共青团党务总枢府秘书处常务书记', tier:'L3', organ:'共青团中央', isPSC:false,
    desc:'协助第一书记主持团党务总枢府秘书处日常工作，分管基层团建与青年工作统筹。副部级。',
    concurrentNote:'届满常转任省执政委副书记或副部级职务' },
  { key:'cycl_sec1', title:'共青团党务总枢府书记（组织·宣传）', tier:'L4', organ:'共青团中央', isPSC:false,
    desc:'分管团中央组织建设与宣传工作，协调全国各省团委业务。副部级。' },
  { key:'cycl_sec2', title:'共青团党务总枢府书记（青年工作）', tier:'L4', organ:'共青团中央', isPSC:false,
    desc:'分管青年权益保护、就业创业服务与大学生工作。副部级。' },
  { key:'cycl_youth_fed', title:'中华全国青年联合会主席', tier:'L4', organ:'共青团中央', isPSC:false,
    desc:'主持全国青联工作，联系各界青年代表，开展对外青年交流与爱国统战工作。副部级。',
    concurrentNote:'通常由团党务总枢府书记兼任' },
  { key:'cycl_school', title:'全国学生联合会主席', tier:'L4', organ:'共青团中央', isPSC:false,
    desc:'主持全国学联工作，代表全国学生群体参与重大事务，是团派路线的重要培养平台。正厅级。' },
];

/** 全量国家级职位（按各机构合并，PSC 成员在各机构中不重复列示） */
export const NATIONAL_OFFICIAL_POSITIONS: NationalPosition[] = [
  ...PSC_POSITIONS,
  ...POLITBURO_POSITIONS,
  ...SECRETARIAT_POSITIONS,
  ...CCDI_POSITIONS,
  ...NPC_POSITIONS,
  ...CPPCC_POSITIONS,
  ...CMC_POSITIONS,
  ...STATE_COUNCIL_POSITIONS,
  ...CPD_POSITIONS,
  ...UFWD_POSITIONS,
  ...CPLC_POSITIONS,
  ...CSWB_POSITIONS,
  ...CPCSCHOOL_POSITIONS,
  ...CAC_POSITIONS,
  ...CYCL_POSITIONS,
];

/** 各机构展示顺序 */
export const NATIONAL_ORGAN_ORDER: NationalOrgan[] = [
  '联邦政务常委会',
  '联邦政务院',
  '党务总枢府秘书处',
  '肃宪督察院',
  '联邦国会常委会',
  '中国人民政治协商会议',
  '枢武府',
  '联邦内阁',
  '国情传导署',
  '联邦统筹部',
  '联邦政法委',
  '社会治理部',
  '联邦行政学院',
  '中央网信委办公室',
  '共青团中央',
];

/** 层级颜色（国家级） */
export const NATIONAL_TIER_COLOR: Record<NationalRankTier, string> = {
  L1: '#8B0000',
  L2: '#4A0E2E',
  L3: '#1a2a4a',
  L4: '#1a3a2a',
};

/** 层级中文标签（国家级） */
export const NATIONAL_TIER_LABEL: Record<NationalRankTier, string> = {
  L1: '正国家级·最高核心',
  L2: '正/副国家级',
  L3: '副国/正部级',
  L4: '正部级辅助',
};

/** 按机构获取国家级职位（含 PSC 成员，PSC 成员不重复出现在子机构中） */
export function getNationalByOrgan(organ: NationalOrgan): NationalPosition[] {
  if (organ === '联邦政务常委会') return PSC_POSITIONS;
  // 其他机构：排除已在常委会中出现的 key（psc_7 是肃宪院长，psc_3是联邦国会，psc_4是国策协理堂）
  const pscKeys = new Set(PSC_POSITIONS.map(p => p.key));
  return NATIONAL_OFFICIAL_POSITIONS.filter(p => p.organ === organ && !pscKeys.has(p.key));
}

// ======================================================================
// ★ 新系统：领导班子 / 仕途档案 / 健康精力 / 党校 / 政策运动 / 城市指标
// ======================================================================

/** 仕途历史条目 */
export interface CareerEntry {
  yearStart: number;   // 现实年份（如2015）
  yearEnd: number | null;
  position: string;    // 职务名称
  city: string;        // 任职城市/单位
  rankLevel: number;
}

/** 领导班子成员（NPC） */
export interface LeadershipBand {
  id: string;
  saveId: string;
  positionKey: string;
  positionLabel: string;
  rankLevel: number;
  name: string;
  gender: string;
  age: number;
  faction: 'reform' | 'pragmatic' | 'neutral';
  ability: number;       // 0-100
  loyalty: number;       // 好感度 0-100
  integrity: number;     // 廉洁度 0-100
  careerHistory: CareerEntry[];
  isRetired: boolean;
  retireGameDay: number | null;
  // 个人档案扩展
  birthProvince: string;
  birthCity: string;
  universityName: string;
  graduationYear: number;
  birthYear: number;
  // 班子分组
  bandGroup: 'party' | 'gov' | 'nda';
  // 头像
  avatarId?: number;
}

/** 玩家健康精力 */
export interface PlayerHealth {
  id: string;
  saveId: string;
  health: number;    // 0-100
  energy: number;    // 0-100
  isOnLeave: boolean;
  leaveEndDay: number | null;
  lastMonthlyCareDay: number; // 上次月度医疗保健加成的game_days
}

// ============ 健康 / 精力联动系统 ============

/**
 * 各职级「月度健康自然恢复」（单位：点/月）
 * 来源：住房环境改善 + 医疗保健配套 + 生活条件提升
 * 叠加规则：基础值 + 下列联动加成
 */
export const RANK_MONTHLY_HEALTH_REGEN: Record<number, number> = {
  1:  1,   // 科员：几乎无保障，略有自然恢复
  2:  2,   // 副科：乡镇宿舍，条件有限
  3:  2,   // 正科：干部公寓，略好一些
  4:  3,   // 副处：享有县级干部保健
  5:  4,   // 正处：县级单位配备卫生室
  6:  4,   // 正处（书记）：同上稍优
  7:  6,   // 副厅：市级干部保健，定期体检
  8:  7,   // 正厅：专属保健医生跟诊
  9:  8,   // 正厅（书记）：中央保健委委托市级医院专案
  10: 10,  // 副部：省级领导专属保健医生，高端医院绿色通道
  11: 12,  // 正部：中央保健委直管，顶级医疗资源
  12: 15,  // 内阁部长：中央保健委直管+专属医疗组
  13: 18,  // 副总理：24小时医疗保障
  14: 20,  // 总理：国家领导人医疗保障体系
  15: 25,  // 执政党主席：最高级中央保健团队
};

/**
 * 各职级「每日精力自然恢复加成」（基础值之上的增量）
 * 基础每日恢复 = 5点；此表为额外加成
 * 来源：住房质量 / 医疗条件 / 职务待遇
 */
export const RANK_DAILY_ENERGY_BONUS: Record<number, number> = {
  1: 0, 2: 0, 3: 1,
  4: 1, 5: 1, 6: 2,
  7: 2, 8: 2, 9: 3,
  10: 3, 11: 4,
  12: 4, 13: 5,
  14: 5, 15: 6,
};

/**
 * 各职级医疗保健级别名称及说明
 */
export const RANK_MEDICAL_TIER: Record<number, { tier: string; desc: string; emoji: string }> = {
  1:  { tier: '社区卫生',     emoji: '🏥', desc: '享有基本医保，就诊社区卫生中心，无专属保健待遇' },
  2:  { tier: '单位医务室',   emoji: '🩺', desc: '单位配备基本医务室，可享受简单诊疗' },
  3:  { tier: '单位医务室',   emoji: '🩺', desc: '单位医务室，乡镇卫生院合作定期巡诊' },
  4:  { tier: '县级干部保健', emoji: '💊', desc: '纳入县级干部保健计划，享有县人民医院优先就诊通道' },
  5:  { tier: '县级干部保健', emoji: '💊', desc: '县级干部保健，年度全面体检，重大疾病绿色通道' },
  6:  { tier: '处级干部保健', emoji: '💊', desc: '处级干部保健计划，每年享有专项体检及疗养机会' },
  7:  { tier: '市级专属保健', emoji: '🏨', desc: '市级领导专属保健，市三甲医院专家团队定期随诊' },
  8:  { tier: '市级专属保健', emoji: '🏨', desc: '市级保健委直管，专属保健医生，疗养院年度疗养' },
  9:  { tier: '省级委托保健', emoji: '🌟', desc: '中央保健委委托省级医院专案管理，顶级医疗资源' },
  10: { tier: '省级专属医疗', emoji: '🌟', desc: '省级领导专属保健医生跟诊，高端医院全程绑定' },
  11: { tier: '中央保健委直管', emoji: '⭐', desc: '中央保健委直接管理，北京顶级医院专属病房待命' },
  12: { tier: '中央保健委直管', emoji: '⭐', desc: '中央保健委直管，专属医疗组24小时随行保障' },
  13: { tier: '国家领导人保健', emoji: '🔴', desc: '国家领导人医疗保障体系，顶级医疗专家24小时待命' },
  14: { tier: '国家领导人保健', emoji: '🔴', desc: '同上，额外配备国际顶级医学资源' },
  15: { tier: '最高保健规格',   emoji: '🏅', desc: '中央最高级别保健待遇，中南海专属医疗团队全程保障' },
};

/**
 * 购买资产对健康/精力的月度加成
 * key = 资产key，value = { healthBonus, energyBonusDaily }
 */
export const ASSET_HEALTH_BONUS: Record<string, { healthBonus: number; energyBonusDaily: number; desc: string }> = {
  car_basic:        { healthBonus: 0, energyBonusDaily: 0.3, desc: '通勤更便捷，减轻疲劳' },
  car_luxury:       { healthBonus: 0, energyBonusDaily: 0.5, desc: '豪华车载休息区，精力微恢复' },
  house_self:       { healthBonus: 2, energyBonusDaily: 1,   desc: '自购住房改善居住环境' },
  house_premium:    { healthBonus: 4, energyBonusDaily: 1.5, desc: '高档住宅，空气和环境明显改善' },
  gym_membership:   { healthBonus: 3, energyBonusDaily: 1,   desc: '健身房会员，每月锻炼效果' },
  health_checkup:   { healthBonus: 5, energyBonusDaily: 0,   desc: '定期深度体检，早发现早治疗' },
};

/** 党校培训类型 */
export type PartySchoolLevel = 'county' | 'city' | 'basic' | 'middle' | 'advanced' | 'national';

export interface PartySchoolRecord {
  id: string;
  saveId: string;
  targetType: 'player' | 'subordinate';
  targetId: string | null;
  targetName: string;
  trainLevel: PartySchoolLevel;
  startGameDay: number;
  endGameDay: number;
  isComplete: boolean;
  abilityBonus: number;
  loyaltyBonus: number;
  promoteBonus: number;
  networkBonus: number; // 人脉加成（上司好感度）
  certName: string;     // 结业证书名称
}

/** 国家政策运动 */
export interface NationalPolicy {
  id: string;
  saveId: string;
  policyKey: string;
  policyName: string;
  startGameDay: number;
  durationDays: number;
  isActive: boolean;
  responded: boolean;
}

/** 城市指标联动 */
export interface CityMetrics {
  id: string;
  saveId: string;
  gdp: number;        // 0-100
  finance: number;
  ecology: number;
  stability: number;
  education: number;
  healthcare: number;
  investBonus: number;         // 招商引资加成%
  petitionReduction: number;   // 信访减少%
  talentPool: number;          // 人才积累
}

// ── 退休年龄上限（按职级区间） ──────────────────────────────────────────
// rank 1-3 乡科级：60岁  rank 4-6 县处级：58岁
// rank 7-9 地厅级：60岁  rank 10-11 副/正省部级：63岁
// rank 12-13 正部级：63岁  rank 14-15 国家级：68岁
export const RETIREMENT_AGE_MAP: Record<number, number> = {
  1: 60, 2: 60, 3: 60,
  4: 58, 5: 58, 6: 58,
  7: 60, 8: 60, 9: 60,
  10: 63, 11: 63,
  12: 63, 13: 65,
  14: 68, 15: 68,
};

/** 各职级 NPC 合理年龄范围 [min, max] */
export const NPC_AGE_RANGE: Record<number, [number, number]> = {
  1: [28, 40], 2: [30, 43], 3: [33, 46],
  4: [36, 50], 5: [40, 52], 6: [42, 54],
  7: [44, 55], 8: [46, 57], 9: [47, 58],
  10: [50, 60], 11: [52, 62],
  12: [53, 62], 13: [55, 63],
  14: [57, 65], 15: [60, 67],
};

/**
 * 根据玩家当前职级返回晋升所需的最低党校培训级别。
 * rank<=2（科员/副科）无门槛，返回 null。
 *
 * 晋升时的当前职级 → 所需完成的党校班次：
 *  1-2  → null（无要求）
 *  3-4  → county（县委党校科级班）
 *  5-6  → city  （市委党校处级班）
 *  7-8  → basic （省执政委党校初级班）
 *  9    → middle（省执政委党校厅级班）
 *  10-11→ advanced（联邦行政学院高级班）
 *  12+  → national（联邦行政学院国家级研修）
 */
export function getRequiredPartySchoolLevel(rankLevel: number): PartySchoolLevel | null {
  if (rankLevel <= 2)  return null;
  if (rankLevel <= 4)  return 'county';
  if (rankLevel <= 6)  return 'city';
  if (rankLevel <= 8)  return 'basic';
  if (rankLevel === 9) return 'middle';
  if (rankLevel <= 11) return 'advanced';
  return 'national';
}

/** 党校培训配置 */
export const PARTY_SCHOOL_CONFIG: Record<PartySchoolLevel, {
  label: string;
  schoolName: string;
  fullName: string;
  durationDays: number;
  costMerit: number;     // 报名消耗政绩
  meritReward: number;   // 结业后发放政绩奖励（学以致用）
  moralBonus: number;    // 结业后廉洁值加成
  abilityBonus: number;
  loyaltyBonus: number;
  promoteBonus: number;
  networkBonus: number;  // 完成后上司好感度加成
  certName: string;      // 结业证书
  minRank: number;
  color: string;
  desc: string;          // 培训简介
}> = {
  county:   {
    label: '科级班', schoolName: '乡镇/县委党校',
    fullName: '县委党校（乡镇干部培训班）',
    durationDays: 14, costMerit: 30, meritReward: 20, moralBonus: 2,
    abilityBonus: 2, loyaltyBonus: 5, promoteBonus: 0, networkBonus: 0,
    certName: '县委党校结业证书',
    minRank: 1, color: '#5A7A40',
    desc: '适合科员至副科级干部，以基层治理、党的理论基础为主要内容。就近参加，不占用较多时间。',
  },
  city:     {
    label: '处级班', schoolName: '市委党校',
    fullName: '市委党校（处级干部进修班）',
    durationDays: 21, costMerit: 60, meritReward: 40, moralBonus: 3,
    abilityBonus: 4, loyaltyBonus: 8, promoteBonus: 0, networkBonus: 2,
    certName: '市委党校进修结业证书',
    minRank: 3, color: '#2B6B4F',
    desc: '适合科级至处级干部，聚焦城市治理、经济发展、党的建设，可结识同级干部、拓展地方人脉。',
  },
  basic:    {
    label: '初级班', schoolName: '省执政委党校',
    fullName: '省执政委党校（县处级干部培训班）',
    durationDays: 30, costMerit: 100, meritReward: 70, moralBonus: 5,
    abilityBonus: 5, loyaltyBonus: 10, promoteBonus: 0, networkBonus: 3,
    certName: '省执政委党校结业证书',
    minRank: 4, color: '#2a5a3e',
    desc: '适合县处级干部，系统学习习近平新时代中国特色社会主义思想，兼修治理能力与执政能力，结识省内厅处级同学。',
  },
  middle:   {
    label: '中级班', schoolName: '省执政委党校',
    fullName: '省执政委党校（厅级领导干部进修班）',
    durationDays: 60, costMerit: 200, meritReward: 150, moralBonus: 8,
    abilityBonus: 10, loyaltyBonus: 15, promoteBonus: 5, networkBonus: 5,
    certName: '省执政委党校厅级干部进修结业证书',
    minRank: 7, color: '#1D3B6C',
    desc: '适合厅级干部，深入研习新发展理念与宏观治理，有助于晋升副省级，可建立省际干部交流网络。',
  },
  advanced: {
    label: '高级班', schoolName: '联邦行政学院',
    fullName: '联邦行政学院（省部级干部研讨班）',
    durationDays: 90, costMerit: 400, meritReward: 300, moralBonus: 12,
    abilityBonus: 15, loyaltyBonus: 20, promoteBonus: 10, networkBonus: 10,
    certName: '联邦行政学院结业证书',
    minRank: 10, color: '#7B3F00',
    desc: '适合省部级领导干部，在联邦行政学院深度研修国家治理，参与高层研讨，与其他省部级同学建立全国性人脉网络。',
  },
  national: {
    label: '国家级研修', schoolName: '联邦行政学院（联邦行政学院）',
    fullName: '联邦行政学院（联邦行政学院）（国家级领导干部专题研修班）',
    durationDays: 30, costMerit: 600, meritReward: 500, moralBonus: 15,
    abilityBonus: 20, loyaltyBonus: 25, promoteBonus: 15, networkBonus: 15,
    certName: '联邦行政学院（联邦行政学院）研修结业证书',
    minRank: 12, color: '#4A0E0E',
    desc: '面向正部级及以上领导干部，联邦行政学院与联邦行政学院合并后的最高级别研修，参与党和国家重大战略研讨，接触核心圈层人脉。',
  },
};

/** 国家重大政策运动池 */
export interface NationalPolicyDef {
  key: string;
  name: string;
  desc: string;
  durationDays: number; // 持续天数
  affectedMetric: 'ecology' | 'stability' | 'gdp' | 'education' | 'healthcare' | 'integrity';
  meritBonus: number;   // 积极响应获得的政绩加成
  meritPenalty: number; // 消极应对的政绩惩罚
  promoteBonus: number; // 晋升加分
}

export const NATIONAL_POLICY_POOL: NationalPolicyDef[] = [
  { key: 'sweepEvil',    name: '扫黑除恶专项行动',  desc: '全面打击黑恶势力，整顿社会治安，提升群众安全感。',   durationDays: 120, affectedMetric: 'stability',  meritBonus: 60,  meritPenalty: -30, promoteBonus: 8  },
  { key: 'ecoSupervise', name: '中央环保督查',       desc: '国家环保督查组进驻，对环境问题实施严格检查和问责。',  durationDays: 90,  affectedMetric: 'ecology',    meritBonus: 50,  meritPenalty: -40, promoteBonus: 6  },
  { key: 'antiCorrupt',  name: '反腐败专项行动',     desc: '深入推进反腐败斗争，持续形成高压态势。',              durationDays: 150, affectedMetric: 'integrity',  meritBonus: 40,  meritPenalty: -50, promoteBonus: 5  },
  { key: 'ruralRevival', name: '乡村振兴攻坚',       desc: '全面推进乡村振兴战略，加快农业农村现代化步伐。',      durationDays: 180, affectedMetric: 'education',  meritBonus: 55,  meritPenalty: -25, promoteBonus: 7  },
  { key: 'commonPros',   name: '共同富裕示范行动',   desc: '扎实推进共同富裕，缩小城乡差距，提升居民收入。',      durationDays: 120, affectedMetric: 'healthcare', meritBonus: 50,  meritPenalty: -30, promoteBonus: 6  },
  { key: 'safetyCheck',  name: '安全生产专项整治',   desc: '开展安全生产大检查，消除重大安全隐患。',              durationDays: 60,  affectedMetric: 'stability',  meritBonus: 35,  meritPenalty: -35, promoteBonus: 4  },
  { key: 'eduImprove',   name: '教育质量提升行动',   desc: '深化教育改革，提升教育公平与质量。',                  durationDays: 90,  affectedMetric: 'education',  meritBonus: 45,  meritPenalty: -20, promoteBonus: 5  },
  { key: 'gdpDrive',     name: '经济高质量发展攻坚', desc: '坚持质量第一，效益优先，推动经济高质量发展。',        durationDays: 120, affectedMetric: 'gdp',        meritBonus: 60,  meritPenalty: -35, promoteBonus: 8  },
];

// ── 领导班子职位配置（按玩家rank层级） ──────────────────────────────────
export interface BandPositionDef {
  key: string;
  label: string;
  isPlayerRole?: boolean; // 玩家自身职位，不生成NPC
}

export const BAND_POSITIONS: Record<number, BandPositionDef[]> = {
  // 乡镇级（rank 1-3）镇党委常委会9人
  1: [
    { key: 'town_party_sec',   label: '镇党委书记' },
    { key: 'town_vice_sec',    label: '党委副书记兼镇长', isPlayerRole: true }, // rank3玩家
    { key: 'town_full_vice',   label: '专职党委副书记' },
    { key: 'town_discipline',  label: '肃宪院长' },
    { key: 'town_org',         label: '组织委员' },
    { key: 'town_prop',        label: '宣传委员' },
    { key: 'town_legal',       label: '政法委员' },
    { key: 'town_armed',       label: '武装部长' },
    { key: 'town_npc',         label: '联邦国会主席' },
  ],
  2: [
    { key: 'town_party_sec',   label: '镇党委书记' },
    { key: 'town_vice_sec',    label: '党委副书记兼镇长', isPlayerRole: true },
    { key: 'town_full_vice',   label: '专职党委副书记' },
    { key: 'town_discipline',  label: '肃宪院长' },
    { key: 'town_org',         label: '组织委员' },
    { key: 'town_prop',        label: '宣传委员' },
    { key: 'town_legal',       label: '政法委员' },
    { key: 'town_armed',       label: '武装部长' },
    { key: 'town_npc',         label: '联邦国会主席' },
  ],
  3: [
    { key: 'town_party_sec',   label: '镇党委书记' },
    { key: 'town_mayor',       label: '镇长', isPlayerRole: true },
    { key: 'town_full_vice',   label: '专职党委副书记' },
    { key: 'town_discipline',  label: '肃宪院长' },
    { key: 'town_org',         label: '组织委员' },
    { key: 'town_prop',        label: '宣传委员' },
    { key: 'town_legal',       label: '政法委员' },
    { key: 'town_armed',       label: '武装部长' },
    { key: 'town_npc',         label: '联邦国会主席' },
  ],
  // 县处级（rank 4-6）县委常委会11人
  4: [
    { key: 'county_party_sec', label: '县委书记' },
    { key: 'county_gov_sec',   label: '县委副书记兼县长' },
    { key: 'county_full_vice', label: '专职县委副书记' },
    { key: 'county_discipline',label: '县肃宪院长' },
    { key: 'county_org',       label: '县委党政人事院院长' },
    { key: 'county_prop',      label: '县委宣传部长' },
    { key: 'county_legal',     label: '县委政法委书记' },
    { key: 'county_armed',     label: '县人武部部长' },
    { key: 'county_exec_vice', label: '常务副县长', isPlayerRole: true },
    { key: 'county_united',    label: '县委统战部长' },
    { key: 'county_npc',       label: '联邦国会主任' },
  ],
  5: [
    { key: 'county_party_sec', label: '县委书记' },
    { key: 'county_mayor',     label: '县长', isPlayerRole: true },
    { key: 'county_full_vice', label: '专职县委副书记' },
    { key: 'county_discipline',label: '县肃宪院长' },
    { key: 'county_org',       label: '县委党政人事院院长' },
    { key: 'county_prop',      label: '县委宣传部长' },
    { key: 'county_legal',     label: '县委政法委书记' },
    { key: 'county_armed',     label: '县人武部部长' },
    { key: 'county_exec_vice', label: '常务副县长' },
    { key: 'county_united',    label: '县委统战部长' },
    { key: 'county_npc',       label: '联邦国会主任' },
  ],
  6: [
    { key: 'county_party_sec', label: '县委书记', isPlayerRole: true },
    { key: 'county_mayor',     label: '县长' },
    { key: 'county_full_vice', label: '专职县委副书记' },
    { key: 'county_discipline',label: '县肃宪院长' },
    { key: 'county_org',       label: '县委党政人事院院长' },
    { key: 'county_prop',      label: '县委宣传部长' },
    { key: 'county_legal',     label: '县委政法委书记' },
    { key: 'county_armed',     label: '县人武部部长' },
    { key: 'county_exec_vice', label: '常务副县长' },
    { key: 'county_united',    label: '县委统战部长' },
    { key: 'county_npc',       label: '联邦国会主任' },
  ],
  // 地厅级（rank 7-9）市委常委会13人
  7: [
    { key: 'city_party_sec',   label: '市委书记' },
    { key: 'city_mayor',       label: '市长' },
    { key: 'city_full_vice',   label: '专职市委副书记' },
    { key: 'city_discipline',  label: '市肃宪院长' },
    { key: 'city_org',         label: '市委党政人事院院长' },
    { key: 'city_prop',        label: '市委宣传部长' },
    { key: 'city_legal',       label: '市委政法委书记' },
    { key: 'city_exec_vice',   label: '常务副市长', isPlayerRole: true },
    { key: 'city_united',      label: '市委统战部长' },
    { key: 'city_armed',       label: '市人武部政委' },
    { key: 'city_sec_gen',     label: '市委秘书长' },
    { key: 'city_vice2',       label: '市委副书记（专职）' },
    { key: 'city_npc',         label: '联邦国会常委会主任' },
  ],
  8: [
    { key: 'city_party_sec',   label: '市委书记' },
    { key: 'city_mayor',       label: '市长', isPlayerRole: true },
    { key: 'city_full_vice',   label: '专职市委副书记' },
    { key: 'city_discipline',  label: '市肃宪院长' },
    { key: 'city_org',         label: '市委党政人事院院长' },
    { key: 'city_prop',        label: '市委宣传部长' },
    { key: 'city_legal',       label: '市委政法委书记' },
    { key: 'city_exec_vice',   label: '常务副市长' },
    { key: 'city_united',      label: '市委统战部长' },
    { key: 'city_armed',       label: '市人武部政委' },
    { key: 'city_sec_gen',     label: '市委秘书长' },
    { key: 'city_vice2',       label: '市委副书记（专职）' },
    { key: 'city_npc',         label: '联邦国会常委会主任' },
  ],
  9: [
    { key: 'city_party_sec',   label: '市委书记', isPlayerRole: true },
    { key: 'city_mayor',       label: '市长' },
    { key: 'city_full_vice',   label: '专职市委副书记' },
    { key: 'city_discipline',  label: '市肃宪院长' },
    { key: 'city_org',         label: '市委党政人事院院长' },
    { key: 'city_prop',        label: '市委宣传部长' },
    { key: 'city_legal',       label: '市委政法委书记' },
    { key: 'city_exec_vice',   label: '常务副市长' },
    { key: 'city_united',      label: '市委统战部长' },
    { key: 'city_armed',       label: '市人武部政委' },
    { key: 'city_sec_gen',     label: '市委秘书长' },
    { key: 'city_vice2',       label: '市委副书记（专职）' },
    { key: 'city_npc',         label: '联邦国会常委会主任' },
  ],
  // 副部省级（rank 10-11）省执政委常委会13人
  10: [
    { key: 'prov_party_sec',   label: '省执政委书记' },
    { key: 'prov_gov',         label: '省长' },
    { key: 'prov_full_vice',   label: '专职省执政委副书记' },
    { key: 'prov_discipline',  label: '省肃宪院长' },
    { key: 'prov_org',         label: '省执政委党政人事院院长' },
    { key: 'prov_prop',        label: '省执政委宣传部长' },
    { key: 'prov_legal',       label: '省执政委政法委书记' },
    { key: 'prov_exec_vice',   label: '常务副省长', isPlayerRole: true },
    { key: 'prov_united',      label: '省执政委统战部长' },
    { key: 'prov_sec_gen',     label: '省执政委秘书长' },
    { key: 'prov_armed',       label: '省军区政委' },
    { key: 'prov_vice2',       label: '省执政委副书记' },
    { key: 'prov_npc',         label: '联邦国会常委会主任' },
  ],
  11: [
    { key: 'prov_party_sec',   label: '省执政委书记', isPlayerRole: true },
    { key: 'prov_gov',         label: '省长' },
    { key: 'prov_full_vice',   label: '专职省执政委副书记' },
    { key: 'prov_discipline',  label: '省肃宪院长' },
    { key: 'prov_org',         label: '省执政委党政人事院院长' },
    { key: 'prov_prop',        label: '省执政委宣传部长' },
    { key: 'prov_legal',       label: '省执政委政法委书记' },
    { key: 'prov_exec_vice',   label: '常务副省长' },
    { key: 'prov_united',      label: '省执政委统战部长' },
    { key: 'prov_sec_gen',     label: '省执政委秘书长' },
    { key: 'prov_armed',       label: '省军区政委' },
    { key: 'prov_vice2',       label: '省执政委副书记' },
    { key: 'prov_npc',         label: '联邦国会常委会主任' },
  ],
  // 正部省级（rank 12-13）部党委常委会9人
  12: [
    { key: 'min_sec',          label: '部党委书记（部长）', isPlayerRole: true },
    { key: 'min_exec_vice',    label: '常务副部长' },
    { key: 'min_vice1',        label: '副部长1' },
    { key: 'min_vice2',        label: '副部长2' },
    { key: 'min_discipline',   label: '纪检组长' },
    { key: 'min_asst1',        label: '部长助理' },
    { key: 'min_party',        label: '机关党委书记' },
    { key: 'min_expert',       label: '总工程师' },
    { key: 'min_policy',       label: '政研室主任' },
  ],
  13: [
    { key: 'sc_vice_pm',       label: '联邦副总统', isPlayerRole: true },
    { key: 'sc_pm',            label: '联邦内阁总理' },
    { key: 'sc_exec_vice',     label: '内阁常务副总统' },
    { key: 'sc_vice2',         label: '联邦副总统2' },
    { key: 'sc_sec_gen',       label: '内阁秘书长' },
    { key: 'sc_state1',        label: '国务委员1' },
    { key: 'sc_state2',        label: '国务委员2' },
  ],
  // 国家级（rank 14-15）联邦政务常委会7人
  14: [
    { key: 'sc_pm',            label: '联邦内阁总理', isPlayerRole: true },
    { key: 'psc_general_sec',  label: '执政党主席' },
    { key: 'psc_npc',          label: '联邦国会议长' },
    { key: 'psc_cppcc',        label: '国策协理堂主席' },
    { key: 'psc_discipline',   label: '肃宪院长' },
    { key: 'psc_exec_vice',    label: '内阁常务副总统' },
    { key: 'psc_secretariat',  label: '党务总枢府书记' },
  ],
  15: [
    { key: 'psc_general_sec',  label: '执政党主席', isPlayerRole: true },
    { key: 'psc_pm',           label: '联邦内阁总理' },
    { key: 'psc_npc',          label: '联邦国会议长' },
    { key: 'psc_cppcc',        label: '国策协理堂主席' },
    { key: 'psc_discipline',   label: '肃宪院长' },
    { key: 'psc_exec_vice',    label: '内阁常务副总统' },
    { key: 'psc_secretariat',  label: '党务总枢府书记' },
  ],
};

// ─── 政府班子职位配置（按玩家rank层级）─────────────────────────────────────
// 政府由联邦国会产生，正职须经联邦国会全会选举，副职经联邦国会常委会任命
export const GOVT_POSITIONS: Record<number, BandPositionDef[]> = {
  // 乡镇（rank 1-3）政府班子：镇长+副镇长
  1: [
    { key: 'town_mayor_gov',       label: '镇长' },
    { key: 'town_exec_vice_gov',   label: '常务副镇长' },
    { key: 'town_vice1_gov',       label: '副镇长（分管民政）' },
    { key: 'town_vice2_gov',       label: '副镇长（分管经济）' },
  ],
  2: [
    { key: 'town_mayor_gov',       label: '镇长' },
    { key: 'town_exec_vice_gov',   label: '常务副镇长' },
    { key: 'town_vice1_gov',       label: '副镇长（分管民政）' },
    { key: 'town_vice2_gov',       label: '副镇长（分管经济）' },
  ],
  3: [
    { key: 'town_mayor_gov',       label: '镇长', isPlayerRole: true },
    { key: 'town_exec_vice_gov',   label: '常务副镇长' },
    { key: 'town_vice1_gov',       label: '副镇长（分管民政）' },
    { key: 'town_vice2_gov',       label: '副镇长（分管经济）' },
  ],
  // 县级（rank 4-6）政府班子：县长+4-5名副县长
  4: [
    { key: 'county_mayor_gov',      label: '县长' },
    { key: 'county_exec_vice_gov',  label: '常务副县长', isPlayerRole: true },
    { key: 'county_vice1_gov',      label: '副县长（分管农业）' },
    { key: 'county_vice2_gov',      label: '副县长（分管工业）' },
    { key: 'county_vice3_gov',      label: '副县长（分管民政教育）' },
    { key: 'county_vice4_gov',      label: '副县长（分管政法）' },
  ],
  5: [
    { key: 'county_mayor_gov',      label: '县长', isPlayerRole: true },
    { key: 'county_exec_vice_gov',  label: '常务副县长' },
    { key: 'county_vice1_gov',      label: '副县长（分管农业）' },
    { key: 'county_vice2_gov',      label: '副县长（分管工业）' },
    { key: 'county_vice3_gov',      label: '副县长（分管民政教育）' },
    { key: 'county_vice4_gov',      label: '副县长（分管政法）' },
  ],
  6: [
    { key: 'county_mayor_gov',      label: '县长' },
    { key: 'county_exec_vice_gov',  label: '常务副县长' },
    { key: 'county_vice1_gov',      label: '副县长（分管农业）' },
    { key: 'county_vice2_gov',      label: '副县长（分管工业）' },
    { key: 'county_vice3_gov',      label: '副县长（分管民政教育）' },
    { key: 'county_vice4_gov',      label: '副县长（分管政法）' },
  ],
  // 地市级（rank 7-9）政府班子：市长+6名副市长
  7: [
    { key: 'city_mayor_gov',        label: '市长' },
    { key: 'city_exec_vice_gov',    label: '常务副市长', isPlayerRole: true },
    { key: 'city_vice1_gov',        label: '副市长（分管经济）' },
    { key: 'city_vice2_gov',        label: '副市长（分管城建）' },
    { key: 'city_vice3_gov',        label: '副市长（分管农业）' },
    { key: 'city_vice4_gov',        label: '副市长（分管教科文卫）' },
    { key: 'city_vice5_gov',        label: '副市长（分管政法安全）' },
  ],
  8: [
    { key: 'city_mayor_gov',        label: '市长', isPlayerRole: true },
    { key: 'city_exec_vice_gov',    label: '常务副市长' },
    { key: 'city_vice1_gov',        label: '副市长（分管经济）' },
    { key: 'city_vice2_gov',        label: '副市长（分管城建）' },
    { key: 'city_vice3_gov',        label: '副市长（分管农业）' },
    { key: 'city_vice4_gov',        label: '副市长（分管教科文卫）' },
    { key: 'city_vice5_gov',        label: '副市长（分管政法安全）' },
  ],
  9: [
    { key: 'city_mayor_gov',        label: '市长' },
    { key: 'city_exec_vice_gov',    label: '常务副市长' },
    { key: 'city_vice1_gov',        label: '副市长（分管经济）' },
    { key: 'city_vice2_gov',        label: '副市长（分管城建）' },
    { key: 'city_vice3_gov',        label: '副市长（分管农业）' },
    { key: 'city_vice4_gov',        label: '副市长（分管教科文卫）' },
    { key: 'city_vice5_gov',        label: '副市长（分管政法安全）' },
  ],
  // 省级（rank 10-11）政府班子：省长+7名副省长
  10: [
    { key: 'prov_gov_gov',          label: '省长' },
    { key: 'prov_exec_vice_gov',    label: '常务副省长', isPlayerRole: true },
    { key: 'prov_vice1_gov',        label: '副省长（分管经济）' },
    { key: 'prov_vice2_gov',        label: '副省长（分管农业农村）' },
    { key: 'prov_vice3_gov',        label: '副省长（分管科教文卫）' },
    { key: 'prov_vice4_gov',        label: '副省长（分管工业投资）' },
    { key: 'prov_vice5_gov',        label: '副省长（分管民政法制）' },
    { key: 'prov_vice6_gov',        label: '副省长（分管生态环保）' },
  ],
  11: [
    { key: 'prov_gov_gov',          label: '省长' },
    { key: 'prov_exec_vice_gov',    label: '常务副省长' },
    { key: 'prov_vice1_gov',        label: '副省长（分管经济）' },
    { key: 'prov_vice2_gov',        label: '副省长（分管农业农村）' },
    { key: 'prov_vice3_gov',        label: '副省长（分管科教文卫）' },
    { key: 'prov_vice4_gov',        label: '副省长（分管工业投资）' },
    { key: 'prov_vice5_gov',        label: '副省长（分管民政法制）' },
    { key: 'prov_vice6_gov',        label: '副省长（分管生态环保）' },
  ],
  // 国家级（rank 12-15）
  12: [
    { key: 'sc_pm_gov',             label: '联邦内阁总理', isPlayerRole: true },
    { key: 'sc_exec_vice_gov',      label: '内阁常务副总统' },
    { key: 'sc_vice1_gov',          label: '联邦副总统（分管经济）' },
    { key: 'sc_vice2_gov',          label: '联邦副总统（分管农业）' },
    { key: 'sc_state1_gov',         label: '国务委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国务委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '内阁秘书长' },
  ],
  13: [
    { key: 'sc_pm_gov',             label: '联邦内阁总理' },
    { key: 'sc_exec_vice_gov',      label: '内阁常务副总统' },
    { key: 'sc_vice1_gov',          label: '联邦副总统（分管经济）' },
    { key: 'sc_vice2_gov',          label: '联邦副总统（分管农业）' },
    { key: 'sc_state1_gov',         label: '国务委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国务委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '内阁秘书长' },
  ],
  14: [
    { key: 'sc_pm_gov',             label: '联邦内阁总理', isPlayerRole: true },
    { key: 'sc_exec_vice_gov',      label: '内阁常务副总统' },
    { key: 'sc_vice1_gov',          label: '联邦副总统（分管经济）' },
    { key: 'sc_vice2_gov',          label: '联邦副总统（分管农业）' },
    { key: 'sc_state1_gov',         label: '国务委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国务委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '内阁秘书长' },
  ],
  15: [
    { key: 'sc_pm_gov',             label: '联邦内阁总理' },
    { key: 'sc_exec_vice_gov',      label: '内阁常务副总统' },
    { key: 'sc_vice1_gov',          label: '联邦副总统（分管经济）' },
    { key: 'sc_vice2_gov',          label: '联邦副总统（分管农业）' },
    { key: 'sc_state1_gov',         label: '国务委员（分管外事）' },
    { key: 'sc_state2_gov',         label: '国务委员（分管公安）' },
    { key: 'sc_secgen_gov',         label: '内阁秘书长' },
  ],
};

// ─── 联邦国会班子职位配置（按玩家rank层级）─────────────────────────────────────
// 联邦国会常委会成员：主任1名、副主任若干、秘书长1名
export const NDA_POSITIONS: Record<number, BandPositionDef[]> = {
  // 乡镇（rank 1-3）：镇联邦国会主席团
  1: [
    { key: 'town_nda_chair',    label: '镇联邦国会主席' },
    { key: 'town_nda_vice1',    label: '镇联邦国会副主席' },
  ],
  2: [
    { key: 'town_nda_chair',    label: '镇联邦国会主席' },
    { key: 'town_nda_vice1',    label: '镇联邦国会副主席' },
  ],
  3: [
    { key: 'town_nda_chair',    label: '镇联邦国会主席' },
    { key: 'town_nda_vice1',    label: '镇联邦国会副主席' },
  ],
  // 县级（rank 4-6）：县联邦国会常委会
  4: [
    { key: 'county_nda_chair',  label: '县联邦国会常委会主任' },
    { key: 'county_nda_vice1',  label: '县联邦国会常委会副主任1' },
    { key: 'county_nda_vice2',  label: '县联邦国会常委会副主任2' },
    { key: 'county_nda_secgen', label: '县联邦国会常委会秘书长' },
  ],
  5: [
    { key: 'county_nda_chair',  label: '县联邦国会常委会主任' },
    { key: 'county_nda_vice1',  label: '县联邦国会常委会副主任1' },
    { key: 'county_nda_vice2',  label: '县联邦国会常委会副主任2' },
    { key: 'county_nda_secgen', label: '县联邦国会常委会秘书长' },
  ],
  6: [
    { key: 'county_nda_chair',  label: '县联邦国会常委会主任' },
    { key: 'county_nda_vice1',  label: '县联邦国会常委会副主任1' },
    { key: 'county_nda_vice2',  label: '县联邦国会常委会副主任2' },
    { key: 'county_nda_secgen', label: '县联邦国会常委会秘书长' },
  ],
  // 地市级（rank 7-9）：市联邦国会常委会
  7: [
    { key: 'city_nda_chair',    label: '市联邦国会常委会主任' },
    { key: 'city_nda_vice1',    label: '市联邦国会常委会副主任1' },
    { key: 'city_nda_vice2',    label: '市联邦国会常委会副主任2' },
    { key: 'city_nda_vice3',    label: '市联邦国会常委会副主任3' },
    { key: 'city_nda_secgen',   label: '市联邦国会常委会秘书长' },
  ],
  8: [
    { key: 'city_nda_chair',    label: '市联邦国会常委会主任' },
    { key: 'city_nda_vice1',    label: '市联邦国会常委会副主任1' },
    { key: 'city_nda_vice2',    label: '市联邦国会常委会副主任2' },
    { key: 'city_nda_vice3',    label: '市联邦国会常委会副主任3' },
    { key: 'city_nda_secgen',   label: '市联邦国会常委会秘书长' },
  ],
  9: [
    { key: 'city_nda_chair',    label: '市联邦国会常委会主任' },
    { key: 'city_nda_vice1',    label: '市联邦国会常委会副主任1' },
    { key: 'city_nda_vice2',    label: '市联邦国会常委会副主任2' },
    { key: 'city_nda_vice3',    label: '市联邦国会常委会副主任3' },
    { key: 'city_nda_secgen',   label: '市联邦国会常委会秘书长' },
  ],
  // 省级（rank 10-11）：省联邦国会常委会
  10: [
    { key: 'prov_nda_chair',    label: '省联邦国会常委会主任' },
    { key: 'prov_nda_vice1',    label: '省联邦国会常委会副主任1' },
    { key: 'prov_nda_vice2',    label: '省联邦国会常委会副主任2' },
    { key: 'prov_nda_vice3',    label: '省联邦国会常委会副主任3' },
    { key: 'prov_nda_vice4',    label: '省联邦国会常委会副主任4' },
    { key: 'prov_nda_secgen',   label: '省联邦国会常委会秘书长' },
  ],
  11: [
    { key: 'prov_nda_chair',    label: '省联邦国会常委会主任' },
    { key: 'prov_nda_vice1',    label: '省联邦国会常委会副主任1' },
    { key: 'prov_nda_vice2',    label: '省联邦国会常委会副主任2' },
    { key: 'prov_nda_vice3',    label: '省联邦国会常委会副主任3' },
    { key: 'prov_nda_vice4',    label: '省联邦国会常委会副主任4' },
    { key: 'prov_nda_secgen',   label: '省联邦国会常委会秘书长' },
  ],
  // 全国（rank 12-15）
  12: [
    { key: 'npc_chair',         label: '联邦国会议长' },
    { key: 'npc_vice1',         label: '联邦国会副议长1' },
    { key: 'npc_vice2',         label: '联邦国会副议长2' },
    { key: 'npc_vice3',         label: '联邦国会副议长3' },
    { key: 'npc_secgen',        label: '联邦国会常委会秘书长' },
  ],
  13: [
    { key: 'npc_chair',         label: '联邦国会议长' },
    { key: 'npc_vice1',         label: '联邦国会副议长1' },
    { key: 'npc_vice2',         label: '联邦国会副议长2' },
    { key: 'npc_vice3',         label: '联邦国会副议长3' },
    { key: 'npc_secgen',        label: '联邦国会常委会秘书长' },
  ],
  14: [
    { key: 'npc_chair',         label: '联邦国会议长', isPlayerRole: true },
    { key: 'npc_vice1',         label: '联邦国会副议长1' },
    { key: 'npc_vice2',         label: '联邦国会副议长2' },
    { key: 'npc_vice3',         label: '联邦国会副议长3' },
    { key: 'npc_secgen',        label: '联邦国会常委会秘书长' },
  ],
  15: [
    { key: 'npc_chair',         label: '联邦国会议长' },
    { key: 'npc_vice1',         label: '联邦国会副议长1' },
    { key: 'npc_vice2',         label: '联邦国会副议长2' },
    { key: 'npc_vice3',         label: '联邦国会副议长3' },
    { key: 'npc_secgen',        label: '联邦国会常委会秘书长' },
  ],
};

// =====================================================================
// ★ 大学名单 & 出生地数据
// =====================================================================

/** 全国31个省级行政区（含直辖市），值为[省名, [代表城市/县]] */
export const PROVINCE_CITY_MAP: Record<string, string[]> = {
  /* ── 直辖市（区级）── */
  '京都市': [
    '东城区', '西城区', '朝阳区', '海淀区', '丰台区', '石景山区',
    '门头沟区', '房山区', '通州区', '顺义区', '昌平区', '大兴区',
    '怀柔区', '平谷区', '密云区', '延庆区',
  ],
  '津门市': [
    '和平区', '河东区', '河西区', '南开区', '河北区', '红桥区',
    '东丽区', '西青区', '津南区', '北辰区', '武清区', '宝坻区',
    '滨海区', '宁河区', '静海区', '蓟州区',
  ],
  '沪海市': [
    '黄浦区', '徐汇区', '长宁区', '静安区', '普陀区', '虹口区',
    '杨浦区', '宝山区', '闵行区', '嘉定区', '滨江新区', '金山区',
    '松江区', '青浦区', '奉贤区', '崇明区',
  ],
  '渝江市': [
    '渝中区', '大渡口区', '江北区', '沙坪坝区', '九龙区', '南岸区',
    '北碚区', '渝北区', '巴南区', '长寿区', '江津区', '合江区',
    '永川区', '南川区', '綦江区', '大足区', '璧山区', '铜梁区',
    '潼南区', '荣昌区', '涪州区', '万州区', '黔江区', '忠县区',
  ],

  /* ── 省份 ── */
  '冀州省': [
    '正定市', '保州市', '曹妃市', '廊道市', '邯郸市', '邢都市',
    '张垣市', '热河市', '沧州市', '衡水市', '秦皇市',
    '定州市', '雄安市', '霸州市', '高碑店市', '安国市', '白沟市',
    '南宫市', '沙河市', '武安市', '涿州市', '迁安市', '遵化市',
    '滦州市', '玉田县', '滦南县', '抚宁区', '青龙县',
  ],
  '晋阳省': [
    '并州市', '平城市', '长治市', '河东市', '平阳市', '晋中市',
    '朔州市', '忻州市', '泽州市', '阳泉市', '吕梁市', '芮城县',
    '永济市', '侯马市', '介休市', '古县', '洪洞县', '襄汾县',
    '临猗县', '万荣县', '稷山县', '新绛县', '平遥县', '祁县',
    '太谷区', '灵石县', '高平市', '阳城县', '沁水县', '陵川县',
  ],
  '漠北自治区': [
    '青城市', '鹿城市', '赤峰市', '科尔沁市', '准格市', '海拉市',
    '河套市', '乌海市', '兴安市', '锡林市', '阿拉善市',
    '托克托县', '和林格尔县', '清水河县', '武川县', '土默特左旗', '土默特右旗',
    '固阳县', '达茂联合旗', '东河区', '昆都仑区', '青山区',
    '石拐区', '白云矿区', '九原区',
  ],
  '辽东省': [
    '盛京市', '旅顺市', '鞍山市', '抚阳市', '本溪市', '安东市',
    '锦阳市', '营州市', '辽阳市', '盘锦市', '铁岭市', '朝阳市',
    '葫芦岛市', '瓦州市', '庄河市', '北镇市', '凌海市', '兴城市',
    '绥中县', '建昌县', '朝阳县', '建平县', '喀左县', '凌源市',
    '北票市', '海州市', '岫岩县', '台安县', '辽中区',
  ],
  '吉阳省': [
    '松都市', '龙潭市', '柳城市', '集安市', '浑江市', '延边自治州',
    '松嫩市', '白城市', '辽源市', '舒阳市', '磐石市', '梅江市',
    '扶阳市', '蛟河市', '桦甸市', '九台区', '农安县', '德惠市',
    '榆树市', '双辽市', '公主岭市', '伊通县', '永吉县', '汪清县',
    '图们市', '珲春市', '龙井市', '敦化市', '和龙市',
  ],
  '乌龙江省': [
    '滨城市', '卜奎市', '油城市', '牡丹市', '合江市', '绥化市',
    '鸡宁市', '双鸭山市', '伊春市', '七台河市', '鹤岗市', '黑河市',
    '大兴安岭市', '阿阳区', '尚志市', '五常市', '方正县', '宾县',
    '延寿县', '巴彦县', '木兰县', '富江市', '肇阳市', '安达市',
    '肇州县', '肇源县', '兰西县', '绥化县', '海伦市', '望奎县',
  ],
  '汉东省': [
    '京岳市', '姑苏市', '锡城市', '通海市', '常武市', '润州市',
    '广陵市', '盐淮市', '彭城市', '洪泽市', '连云市',
    '启云市', '昆玉市', '江渚市', '丹台市', '句云市', '溧水市',
    '宜泉市', '金淮县', '盱源县', '海滨区', '澄江市',
    '泰兴市', '姜堰区', '靖江市', '兴化市', '东台市', '大丰区',
    '响水县', '滨海县', '阜宁县', '射阳县', '建湖县', '沛县',
    '丰县', '睢宁县', '邳州市', '新沂市', '铜山区', '贾汪区',
  ],
  '瓯越省': [
    '钱塘市', '甬江市', '瓯江市', '越州市', '嘉湖市', '菱湖市',
    '婺州市', '椒江市', '括苍市', '信安市',
    '义阳市', '慈江市', '象湾县', '余湖市', '平泽市', '桐岭县',
    '建溪市', '淳湖县', '海盐县', '江岭市', '龙越县', '温海市',
    '平阳县', '苍南县', '瑞安市', '乐清市', '洞头区', '文成县',
    '泰顺县', '嘉善县', '海宁市', '桐乡市', '德清县', '长兴县',
    '安吉县', '武义县', '浦江县', '磐安县', '龙泉市', '青田县',
    '云和县', '庆元县', '遂昌县', '松阳县', '景宁县',
  ],
  '皖淮省': [
    '庐州市', '芜江市', '马鞍市', '皖城市', '蚌城市', '淮滨市',
    '阜水市', '宣德市', '滁阳市', '徽州市',
    '庐西县', '无江市', '界河市', '明岭市', '全椒县', '来江县',
    '定远县', '凤阳县', '颍上县', '阜南县', '临泉县', '太和县',
    '界首市', '涡阳县', '蒙城县', '利辛县', '怀远县', '固镇县',
    '五河县', '天长市', '明光市', '南陵县', '繁昌区', '当涂县',
    '含山县', '和县', '广德市', '泾县', '旌德县', '绩溪县',
    '祁门县', '休宁县', '黟县', '歙县', '石台县', '东至县',
    '青阳县', '贵池区', '枞阳县', '桐城市', '岳西县', '潜山市',
    '宿松县', '太湖县', '望江县', '怀宁县',
  ],
  '闽南省': [
    '闽都市', '鹭岛市', '刺桐市', '龙溪市', '兴化市', '沙溪市',
    '剑津市', '汀川市', '宁海市',
    '晋水市', '福川市', '南阳市', '龙溪区', '永泰市', '沙溪区',
    '尤水县', '建阳市', '汀州县', '连川县', '武平县',
    '长乐区', '闽侯县', '连江县', '罗源县', '闽清县', '永泰县',
    '平潭县', '惠安县', '安溪县', '永春县', '德化县', '云霄县',
    '漳浦县', '诏安县', '长泰区', '东山县', '南靖县', '平和县',
    '华安县', '仙游县', '荔城区', '秀屿区', '建瓯市', '松溪县',
    '政和县', '浦城县', '光泽县', '邵武市', '顺昌县', '将乐县',
    '泰宁县', '建宁县', '明溪县', '清流县', '宁化县', '大田县',
    '永安市', '上杭县', '漳平市', '永定区', '古田县', '屏南县',
    '寿宁县', '周宁县', '柘荣县', '福安市', '福鼎市', '霞浦县',
  ],
  '洪都省': [
    '洪都市', '赣南市', '庐陵市', '宜水市', '信州市', '陶瓷市',
    '浔阳市', '萍江市', '新渝市', '宁水县', '临川市',
    '于江县', '兴盛县', '信江县', '大余县', '上游县', '崇义县',
    '安源县', '进贤县', '南康区', '章贡区', '赣县区', '石城县',
    '瑞金市', '龙南市', '定南县', '全南县', '寻乌县', '会昌县',
    '遂川县', '井冈山市', '万安县', '泰和县', '峡江县', '新干县',
    '永丰县', '吉水县', '安福县', '永新县', '莲花县', '上栗县',
    '芦溪县', '武宁县', '修水县', '永修县', '德安县', '庐山市',
    '都昌县', '湖口县', '彭泽县', '乐平市', '浮梁县', '余干县',
    '鄱阳县', '万年县', '横峰县', '弋阳县', '贵溪市', '铅山县',
    '广昌县', '南丰县', '崇仁县', '乐安县', '宜黄县', '金溪县',
    '资溪县', '东乡区', '黎川县', '靖安县', '奉新县', '高安市',
    '宜丰县', '铜鼓县', '上高县', '分宜县', '万载县', '袁州区',
  ],
  '齐鲁省': [
    '历城市', '胶州市', '芝罘市', '潍城市', '沂蒙市', '任城市',
    '淄临市', '威洋市', '黄河市', '岱岳市',
    '邹颜市', '阙里市', '招金市', '寿丰市', '章旗区', '安岭市',
    '高洲市', '昌盛市', '邹邑市', '诸安市',
    '莱芜区', '章丘区', '平阴县', '济阳区', '商河县', '长清区',
    '黄岛区', '城阳区', '即墨区', '胶州市', '平度市', '莱西市',
    '桓台县', '高青县', '沂源县', '临淄区', '博山区', '张店区',
    '福山区', '莱山区', '牟平区', '海阳市', '莱阳市', '莱州市',
    '栖霞市', '蓬莱区', '长岛县', '临朐县', '昌乐县', '青州市',
    '寿光市', '昌邑市', '高密市', '安丘市', '诸城市', '五莲县',
    '莒县', '沂水县', '沂南县', '郯城县', '苍山县', '费县',
    '平邑县', '莒南县', '蒙阴县', '临沭县', '鱼台县', '金乡县',
    '嘉祥县', '汶上县', '泗水县', '梁山县', '微山县',
    '文登区', '荣成市', '乳山市', '垦利区', '利津县', '广饶县',
    '宁津县', '庆云县', '乐陵市', '禹城市', '临邑县', '齐河县',
    '平原县', '夏津县', '武城县', '陵城区', '郓城县', '巨野县',
    '成武县', '单县', '定陶区', '曹县', '东明县',
    '博兴县', '邹平市', '无棣县', '沾化区',
  ],
  '中原省': [
    '中州市', '洛都市', '汴梁市', '宛都市', '新汲市', '信江市',
    '驿城市', '殷都市', '怀州市', '颍都市',
    '新郑市', '荥泽市', '巩洛市', '嵩阳市', '长岗市', '项阳市',
    '三门峡市', '商丘市', '周口市', '漯河市', '平顶山市', '鹤壁市',
    '濮阳市', '济源市', '偃师区', '孟津区', '新安县', '栾川县',
    '嵩县', '汝阳县', '宜阳县', '洛宁县', '伊川县', '汝州市',
    '舞钢市', '叶县', '鲁山县', '郏县', '宝丰县', '滑县',
    '浚县', '淇县', '内黄县', '汤阴县', '林州市', '卫辉市',
    '辉县市', '获嘉县', '修武县', '武陟县', '温县', '孟州市',
    '沁阳市', '封丘县', '原阳县', '延津县', '长垣市', '民权县',
    '宁陵县', '柘城县', '虞城县', '夏邑县', '永城市', '睢县',
    '扶沟县', '西华县', '商水县', '太康县', '鹿邑县', '郸城县',
    '淮阳区', '沈丘县', '邓州市', '方城县', '西峡县', '镇平县',
    '内乡县', '淅川县', '社旗县', '唐河县', '新野县', '桐柏县',
    '罗山县', '光山县', '新县', '商城县', '固始县', '潢川县',
    '淮滨县', '息县', '平舆县', '上蔡县', '汝南县', '新蔡县',
    '确山县', '泌阳县', '遂平县', '西平县', '舞阳县',
  ],
  '楚北省': [
    '江夏市', '夷陵市', '汉阳市', '荆沙市', '荆鄂市', '黄州市',
    '孝义市', '大冶市', '郧阳市', '巴东民族自治州',
    '钟阳市', '京岳市', '沙江县', '监洲市', '石津市', '赤江市',
    '鄂州市', '仙桃市', '天门市', '潜江市', '恩施市',
    '武穴市', '黄梅县', '蕲春县', '浠水县', '团风县', '红安县',
    '麻城市', '罗田县', '英山县', '孝昌县', '大悟县', '云梦县',
    '安陆市', '汉川市', '应城市', '远安县', '兴山县', '秭归县',
    '长阳县', '五峰县', '枝江市', '松滋市', '公安县', '石首市',
    '监利市', '江陵县', '洪湖市', '嘉鱼县', '赤壁市', '通城县',
    '崇阳县', '通山县', '咸宁市', '曾都区', '广水市', '随县',
  ],
  '楚南省': [
    '湘都市', '株江市', '湘水市', '衡山市', '邵阳市', '巴陵市',
    '沅陵市', '益水市', '娄邵市', '郴江市', '零陵市',
    '浏江市', '宁静市', '醴泉市', '攸水县', '茶山县', '炎帝县',
    '汨江市', '平溪县', '容湖县', '张家界市', '怀化市', '湘西自治州',
    '醴陵市', '茶陵县', '炎陵县', '攸县', '株洲县', '湘潭县',
    '韶山市', '湘乡市', '衡南县', '衡山县', '衡东县', '祁东县',
    '常宁市', '耒阳市', '邵东市', '新邵县', '邵阳县', '隆回县',
    '洞口县', '绥宁县', '新宁县', '城步县', '武冈市', '汨罗市',
    '临湘市', '华容县', '湘阴县', '平江县', '岳阳县',
    '安化县', '沅江市', '南县', '桃江县', '冷水江市', '涟源市',
    '新化县', '双峰县', '桂阳县', '宜章县', '永兴县', '嘉禾县',
    '临武县', '汝城县', '桂东县', '安仁县', '苏仙区',
    '蓝山县', '新田县', '宁远县', '道县', '江永县', '江华县',
    '双牌县', '祁阳市', '东安县', '新圩县',
    '靖州县', '会同县', '溆浦县', '辰溪县', '沅陵县', '麻阳县',
    '通道县', '洪江市', '中方县', '芷江县', '新晃县', '芙蓉区',
  ],
  '粤海省': [
    '穗城市', '鹏城市', '禅城市', '莞城市', '珠澳市', '惠阳市',
    '汕海市', '香山市', '新会市', '梅岭市', '潮汕市',
    '增华区', '台海市', '高凉市', '博阳县', '惠泉县', '龙华县',
    '高明区', '四河市', '德江县',
    '韶关市', '河源市', '清远市', '阳江市', '湛江市', '茂名市',
    '揭州市', '云浮市', '汕尾市',
    '从化区', '花都区', '南沙区', '番禺区', '白云区', '天河区',
    '龙岗区', '宝安区', '龙华区', '坪山区', '盐田区', '光明区',
    '南山区', '福田区', '罗湖区', '顺德区', '南海区', '三水区',
    '高明区', '鹤山市', '台山市', '开平市', '恩平市', '惠城区',
    '惠阳区', '博罗县', '惠东县', '龙门县', '斗门区', '金湾区',
    '香洲区', '潮安区', '饶平县', '澄海区', '南澳县', '潮阳区',
    '潮南区', '普宁市', '惠来县', '揭东区', '揭西县',
    '陆丰市', '海丰县', '陆河县', '连平县', '和平县', '龙川县',
    '紫金县', '东源县', '英德市', '连州市', '佛冈县', '阳山县',
    '连山县', '连南县', '清城区', '清新区', '阳春市', '阳西县',
    '阳东区', '廉江市', '遂溪县', '雷州市', '吴川市', '徐闻县',
    '茂名市区', '高州市', '化州市', '信宜市', '电白区',
    '新兴县', '罗定市', '云安区', '郁南县',
  ],
  '南桂壮族自治区': [
    '桂城市', '漓江市', '龙城市', '苍梧市', '合浦市', '郁林市',
    '临贺市', '钦州市', '右江市',
    '防城港市', '崇左市', '来宾市', '河池市', '贺州市',
    '横州市', '宾阳县', '上林县', '隆安县', '马山县', '武鸣区',
    '平南县', '桂平市', '容县', '陆川县', '博白县', '兴业县',
    '北流市', '苍梧县', '藤县', '蒙山县', '岑溪市',
    '象州县', '武宣县', '合山市', '金秀县', '兴宾区',
    '宜州区', '凤山县', '东兰县', '罗城县', '环江县', '巴马县',
    '都安县', '大化县', '南丹县', '天峨县',
    '扶绥县', '宁明县', '龙州县', '大新县', '天等县', '江州区',
    '灵山县', '浦北县', '上思县', '防城区', '东兴市',
    '昭平县', '富川县', '钟山县',
  ],
  '琼岛省': [
    '琼城市', '崖城市', '儋水市', '文阳市', '琼海市', '万宁市',
    '五指山市', '东方市', '定安县', '屯昌县', '澄迈县',
    '临高县', '白沙县', '昌江县', '乐东县', '陵水县', '保亭县',
    '琼中县', '洋浦区',
  ],
  '蜀州省': [
    '锦城市', '涪城市', '旌城市', '翠屏市', '顺庆市', '通川市',
    '江阳市', '盐都市', '攀川市', '利州市', '遂川市',
    '简城市', '灌城市', '绵水市', '雒城市', '阆苑市', '仁水县',
    '雅安市', '巴中市', '眉山市', '资阳市', '内江市', '乐山市',
    '凉山市', '甘孜州', '阿坝州',
    '金堂县', '双流区', '温江区', '郫都区', '新都区', '龙泉驿区',
    '彭州市', '邛崃市', '崇州市', '大邑县', '蒲江县', '新津区',
    '安州区', '三台县', '盐亭县', '梓潼县', '北川县', '平武县',
    '江油市', '什邡市', '绵竹市', '罗江区', '中江县',
    '富顺县', '荣县', '大安区', '贡井区', '沿滩区',
    '威远县', '资中县', '隆昌市', '东兴区',
    '犍为县', '井研县', '夹江县', '沐川县', '峨边县', '马边县',
    '峨眉山市', '仁寿县', '彭山区', '洪雅县', '丹棱县', '青神县',
    '安岳县', '乐至县', '雁江区',
    '宣汉县', '开江县', '大竹县', '渠县', '万源市',
    '旺苍县', '青川县', '剑阁县', '苍溪县', '朝天区',
    '荣州市', '富顺市', '南溪区', '江安县', '长宁县',
    '高县', '筠连县', '珙县', '兴文县', '屏山县',
    '岳池县', '武胜县', '邻水县', '华蓥市', '广安区', '前锋区',
    '恩阳区', '通江县', '南江县', '平昌县',
    '东坡区', '丹棱县', '青神县', '洪雅县',
    '沙湾区', '五通桥区', '金口河区',
  ],
  '黔贵省': [
    '筑城市', '播州市', '毕西市', '六盘市', '安顺市', '铜川市',
    '黔水自治州', '黔东南自治州', '黔南自治州',
    '清镇市', '息烽县', '修文县', '开阳县', '白云区', '乌当区',
    '花溪区', '观山湖区', '南明区', '云岩区',
    '赤水市', '仁怀市', '绥阳县', '正安县', '道真县', '务川县',
    '凤冈县', '湄潭县', '余庆县', '习水县',
    '大方县', '黔西市', '金沙县', '织金县', '纳雍县', '赫章县',
    '威宁县',
    '水城区', '盘州市', '钟山区',
    '镇宁县', '普定县', '关岭县', '紫云县', '西秀区',
    '玉屏县', '印江县', '德江县', '思南县', '石阡县', '沿河县',
    '松桃县', '碧江区',
    '都匀市', '福泉市', '贵定县', '瓮安县', '独山县', '平塘县',
    '罗甸县', '长顺县', '龙里县', '惠水县', '三都县',
    '凯里市', '麻江县', '丹寨县', '黄平县', '施秉县', '三穗县',
    '镇远县', '岑巩县', '天柱县', '锦屏县', '剑河县', '台江县',
    '黎平县', '榕江县', '从江县', '雷山县', '苗岭县', '丹江县',
  ],
  '滇南省': [
    '春城市', '曲水市', '大理自治州', '红水自治州', '文岭自治州',
    '玉溪市', '楚雄自治州', '保山市',
    '昭通市', '丽江市', '普洱市', '临沧市', '西双版纳自治州',
    '德宏自治州', '怒江自治州', '迪庆自治州',
    '晋宁区', '安宁市', '富民县', '嵩明县', '禄劝县', '寻甸县',
    '宜良县', '石林县', '东川区',
    '麒麟区', '沾益区', '马龙区', '陆良县', '师宗县', '罗平县',
    '富源县', '会泽县', '宣威市',
    '峨山县', '新平县', '元江县', '易门县', '华宁县', '通海县',
    '澄江市', '江川区', '红塔区',
    '腾冲市', '施甸县', '隆阳区', '龙陵县', '昌宁县',
    '昭阳区', '鲁甸县', '巧家县', '盐津县', '大关县', '永善县',
    '绥江县', '镇雄县', '彝良县', '威信县', '水富市',
    '大姚县', '姚安县', '南华县', '牟定县', '武定县', '禄丰市',
    '双柏县', '元谋县', '永仁县', '楚雄市',
    '澜沧县', '西盟县', '孟连县', '江城县', '墨江县', '景谷县',
    '景东县', '宁洱县', '镇沅县', '思茅区',
  ],
  '藏羌自治区': [
    '藏都市', '日喀市', '林芝市', '山南市', '昌都市',
    '那曲市', '阿里地区',
    '堆龙德庆区', '曲水县', '尼木县', '当雄县', '林周县',
    '达孜区', '墨竹工卡县',
    '桑珠孜区', '南木林县', '江孜县', '定日县', '萨迦县', '拉孜县',
    '昂仁县', '谢通门县', '白朗县', '仁布县', '康马县', '定结县',
    '仲巴县', '亚东县', '吉隆县', '聂拉木县', '萨嘎县', '岗巴县',
    '乃东区', '扎囊县', '贡嘎县', '桑日县', '琼结县', '曲松县',
    '措美县', '洛扎县', '加查县', '隆子县', '错那县', '浪卡子县',
    '卡若区', '江达县', '贡觉县', '类乌齐县', '丁青县', '察雅县',
    '八宿县', '左贡县', '芒康县', '洛隆县', '边坝县',
    '巴宜区', '工布江达县', '米林县', '墨脱县', '波密县',
    '察隅县', '朗县',
  ],
  '秦陕省': [
    '长安市', '陈仓市', '秦都市', '渭水市', '延城市', '汉台市',
    '榆阳市', '安康市',
    '三原县', '泾阳县', '礼泉县', '乾州县', '兴平市', '韩原市',
    '蒲城县', '富平县',
    '华阴市', '潼关县', '大荔县', '合阳县', '澄城县', '白水县',
    '蒲城县', '临渭区', '华州区',
    '商州区', '洛南县', '丹凤县', '商南县', '山阳县', '镇安县',
    '柞水县',
    '铜川市', '耀州区', '印台区', '王益区', '宜君县',
    '神木市', '府谷县', '横山区', '靖边县', '定边县', '绥德县',
    '米脂县', '佳县', '吴堡县', '清涧县', '子洲县', '子长市',
    '洋县', '西乡县', '勉县', '宁强县', '略阳县', '镇巴县',
    '留坝县', '佛坪县',
    '旬阳市', '汉阴县', '石泉县', '宁陕县', '紫阳县', '岚皋县',
    '平利县', '镇坪县', '白河县',
    '麟游县', '凤翔区', '岐山县', '扶风县', '眉县', '陇县',
    '千阳县', '凤县', '太白县',
    '宜川县', '黄龙县', '洛川县', '富县', '甘泉县', '黄陵县',
    '志丹县', '吴起县', '安塞区', '子长市',
    '三原县', '泾阳县', '礼泉县', '永寿县', '淳化县',
    '武功县', '长武县', '旬邑县',
  ],
  '陇西省': [
    '皋兰市', '秦州市', '凉州市', '甘州市', '肃州市', '安定市',
    '庆州市', '平川市',
    '永登县', '榆中县', '兰州新区', '红古区',
    '麦积区', '清水县', '秦安县', '甘谷县', '武山县', '张家川县',
    '天祝县', '古浪县', '民勤县', '永昌县', '山丹县',
    '高台县', '临泽县', '民乐县', '肃南县',
    '金塔县', '瓜州县', '肃北县', '阿克塞县', '玉门市', '敦煌市',
    '陇西县', '渭源县', '临洮县', '漳县', '岷县', '通渭县',
    '庄浪县', '静宁县', '华亭市', '崇信县', '灵台县', '泾川县',
    '环县', '华池县', '合水县', '正宁县', '宁县', '镇原县',
    '临夏市', '临夏县', '康乐县', '永靖县', '广河县', '和政县',
    '东乡县', '积石山县',
    '合作市', '临潭县', '卓尼县', '舟曲县', '迭部县', '玛曲县',
    '碌曲县', '夏河县',
    '两当县', '徽县', '成县', '康县', '文县', '宕昌县', '礼县',
    '西和县', '武都区',
  ],
  '青湖省': [
    '湟源市', '海东市', '海西蒙古族藏族自治州', '海北藏族自治州',
    '玉树藏族自治州', '果洛藏族自治州', '黄南藏族自治州',
    '湟中区', '大通县', '乐都区', '平安区', '民和县', '互助县',
    '化隆县', '循化县', '格尔木市', '德令哈市', '都兰县',
    '乌兰县', '天峻县', '大柴旦行委', '茫崖市', '冷湖行委',
    '海晏县', '祁连县', '刚察县', '门源县', '平安区',
    '同仁市', '尖扎县', '泽库县', '河南县',
    '玉树市', '囊谦县', '称多县', '治多县', '杂多县', '曲麻莱县',
    '玛沁县', '班玛县', '甘德县', '达日县', '久治县', '玛多县',
  ],
  '宁川回族自治区': [
    '朔方市', '石嘴市', '灵州市', '原州市', '中卫市',
    '兴庆区', '金凤区', '西夏区', '贺兰县', '永宁县', '灵武市',
    '大武口区', '惠农区', '平罗县',
    '吴忠市区', '青铜峡市', '盐池县', '同心县', '红寺堡区',
    '海原县', '彭阳县', '西吉县', '隆德县', '泾源县',
    '沙坡头区', '中宁县', '海原县',
  ],
  '西域维吾尔自治区': [
    '迪化市', '疏勒地区', '伊犁自治州', '昌吉自治州', '巴州自治州',
    '天山地区', '克拉玛依市', '吐鲁番市', '哈密市',
    '和田地区', '阿勒泰地区', '塔城地区', '克孜勒苏自治州',
    '博尔塔拉自治州',
    '天山区', '沙依巴克区', '新市区', '水磨沟区', '头屯河区',
    '达坂城区', '迪化区', '安宁城区',
    '奎屯市', '霍城县', '巩留县', '新源县', '昭苏县', '特克斯县',
    '尼勒克县', '察布查尔县', '伊宁县', '伊宁市',
    '昌吉市', '呼图壁县', '玛纳县', '阜康市', '吉木萨尔县',
    '奇台县', '木垒县',
    '库尔勒市', '轮台县', '尉犁县', '若羌县', '且末县', '焉耆县',
    '和静县', '和硕县', '博湖县',
    '喀什市', '疏附县', '疏勒县', '英吉沙县', '泽普县', '莎车县',
    '叶城县', '麦盖提县', '岳普湖县', '伽师县', '巴楚县',
  ],
};

export const PROVINCE_LIST = Object.keys(PROVINCE_CITY_MAP);

/**
 * 33省级行政区省会/首府城市映射
 * 直辖市（京都/津门/沪海/渝江）省会即为自身，下辖区级行政单位
 */
export const PROVINCIAL_CAPITAL: Record<string, string> = {
  '京都市':             '京都市',        // 直辖市
  '津门市':             '津门市',        // 直辖市
  '沪海市':             '沪海市',        // 直辖市
  '渝江市':             '渝江市',        // 直辖市
  '冀州省':             '正定市',
  '晋阳省':             '并州市',
  '漠北自治区':         '青城市',
  '辽东省':             '盛京市',
  '吉阳省':             '松都市',
  '乌龙江省':           '滨城市',
  '汉东省':             '京岳市',
  '瓯越省':             '钱塘市',
  '皖淮省':             '庐州市',
  '闽南省':             '闽都市',
  '洪都省':             '洪都市',
  '齐鲁省':             '历城市',
  '中原省':             '中州市',
  '楚北省':             '江夏市',
  '楚南省':             '湘都市',
  '粤海省':             '穗城市',
  '南桂壮族自治区':     '桂城市',
  '琼岛省':             '琼城市',
  '蜀州省':             '锦城市',
  '黔贵省':             '筑城市',
  '滇南省':             '春城市',
  '藏羌自治区':         '藏都市',
  '秦陕省':             '长安市',
  '陇西省':             '皋兰市',
  '青湖省':             '湟源市',
  '宁川回族自治区':     '朔方市',
  '西域维吾尔自治区':   '迪化市',
  '港岛特别行政区':     '港岛',
  '濠江特别行政区':     '濠江',
};

/** 四大直辖市集合（省会=本身，下辖为区） */
export const MUNICIPALITY_SET = new Set(['京都市', '津门市', '沪海市', '渝江市']);

/**
 * 解析 cityName 字段，返回 { province, prefCity, district }
 *  - rank1-3: "汉东省姑苏市龙泉镇"
 *  - rank4-6: "汉东省昆玉市" / "汉东省昆玉市京岳县"
 *  - rank7-9: "汉东省姑苏市"
 *  - rank10-11: "汉东省"
 *  - rank12+: 部委/中央
 */
export function parseCityName(cityName: string): { province: string; prefCity: string; district: string } {
  for (const prov of PROVINCE_LIST) {
    if (cityName.startsWith(prov)) {
      const rest = cityName.slice(prov.length);
      const cities = PROVINCE_CITY_MAP[prov] ?? [];
      let foundCity = '';
      let district  = '';
      for (const c of cities) {
        if (rest.startsWith(c)) {
          foundCity = c;
          district  = rest.slice(c.length);
          break;
        }
      }
      if (!foundCity) {
        // rest 本身是镇/县级地名（无法匹配地级市）
        foundCity = '';
        district  = rest;
      }
      return { province: prov, prefCity: foundCity, district };
    }
  }
  // 直辖市或部委
  return { province: '', prefCity: cityName, district: '' };
}

/**
 * 根据 rankLevel + cityName 生成头像下方的职务地区说明
 *  县长(5/6)  → 某省某市某县（省会直辖县为区）
 *  市长(7/8/9)→ 某省某市
 *  省长(10/11)→ 某省
 *  中央(12+)  → 不变，返回空（由调用方决定展示）
 */
export function getPostLocation(rankLevel: number, cityName: string): string {
  if (rankLevel >= 12) return '';
  const { province, prefCity, district } = parseCityName(cityName);
  if (!province) return cityName; // 直辖市/部委兜底

  const isMunicipality = MUNICIPALITY_SET.has(province);

  if (rankLevel <= 3) {
    // 镇级：省·市·镇
    if (isMunicipality) {
      // 直辖市下镇：直辖市·区·镇
      return `${province}·${prefCity || district}`;
    }
    const pref = prefCity || PROVINCIAL_CAPITAL[province] || '';
    return `${province}·${pref}·${district || prefCity}`;
  }
  if (rankLevel <= 6) {
    // 县级：省·市·县（直辖市只展示到区）
    if (isMunicipality) {
      return `${province}·${prefCity || district}`;
    }
    const pref = prefCity || PROVINCIAL_CAPITAL[province] || '';
    const dist = district || prefCity;
    return dist ? `${province}·${pref}·${dist}` : `${province}·${pref}`;
  }
  if (rankLevel <= 9) {
    // 市级：省·市（直辖市只展示到直辖市本身）
    if (isMunicipality) return province;
    const pref = prefCity || PROVINCIAL_CAPITAL[province] || '';
    return `${province}·${pref}`;
  }
  // 省级 rank10-11
  return province;
}

/** 随机取出生地 */
export function randBirthPlace(): { province: string; city: string } {
  const provinces = PROVINCE_LIST;
  const province = provinces[Math.floor(Math.random() * provinces.length)];
  const cities = PROVINCE_CITY_MAP[province]!;
  const city = cities[Math.floor(Math.random() * cities.length)];
  return { province, city };
}

// 真实风格镇名前缀（40个，供随机生成起始镇）
const _REAL_TOWN_PREFIXES = [
  '清河', '兴华', '龙泉', '南湖', '北溪', '桃源', '柳林', '石桥', '金沙', '铜山',
  '梅岭', '凤凰', '荷花', '莲湖', '白云', '青山', '新兴', '永安', '兴隆', '平原',
  '东风', '红星', '向阳', '太平', '广济', '福安', '长寿', '大同', '永丰', '富民',
  '天马', '玉泉', '惠民', '安平', '通达', '望江', '临江', '泉山', '宝兴', '瑞云',
];

/**
 * 随机生成一个真实省市+镇的起始地名
 * 格式：xx省xx市xx镇
 */
export function randRealStartTown(): string {
  const province = PROVINCE_LIST[Math.floor(Math.random() * PROVINCE_LIST.length)];
  const cities = PROVINCE_CITY_MAP[province]!;
  const city = cities[Math.floor(Math.random() * cities.length)];
  const prefix = _REAL_TOWN_PREFIXES[Math.floor(Math.random() * _REAL_TOWN_PREFIXES.length)];
  return `${province}${city}${prefix}镇`;
}

/** 根据指定籍贯省市生成起始镇名（用于角色创建后同步开局地点） */
export function randRealStartTownByProvCity(province: string, city: string): string {
  // 省份校验：如果传入省份不在列表中则随机降级
  const validProv = PROVINCE_LIST.includes(province) ? province : PROVINCE_LIST[Math.floor(Math.random() * PROVINCE_LIST.length)];
  const cities = PROVINCE_CITY_MAP[validProv] ?? [];
  // 城市校验：如果传入城市不在该省列表中则随机选一个
  const validCity = cities.includes(city) ? city : cities[Math.floor(Math.random() * cities.length)] ?? city;
  const prefix = _REAL_TOWN_PREFIXES[Math.floor(Math.random() * _REAL_TOWN_PREFIXES.length)];
  return `${validProv}${validCity}${prefix}镇`;
}

// ── 985大学（38所）──
export const UNIVERSITY_985: string[] = [
  '清华大学', '北京大学', '浙江大学', '复旦大学', '上海交通大学',
  '南京大学', '中国科学技术大学', '哈尔滨工业大学', '西安交通大学',
  '北京航空航天大学', '北京理工大学', '中国人民大学', '中山大学',
  '华中科技大学', '武汉大学', '四川大学', '同济大学', '南开大学',
  '天津大学', '厦门大学', '山东大学', '中南大学', '吉林大学',
  '大连理工大学', '华南理工大学', '重庆大学', '湖南大学', '兰州大学',
  '电子科技大学', '东北大学', '东南大学', '北京师范大学', '中国农业大学',
  '国防科技大学', '西北工业大学', '中国海洋大学', '中央民族大学', '华东师范大学',
];

// ── 211大学（非985，约73所代表性院校）──
export const UNIVERSITY_211: string[] = [
  '北京交通大学', '北京工业大学', '北京化工大学', '北京邮电大学',
  '北京林业大学', '中国传媒大学', '对外经济贸易大学', '中央财经大学',
  '中国政法大学', '华北电力大学', '南京航空航天大学', '南京理工大学',
  '河海大学', '江南大学', '苏州大学', '南京师范大学',
  '合肥工业大学', '福州大学', '南昌大学', '郑州大学', '武汉理工大学',
  '华中农业大学', '华中师范大学', '中南财经政法大学', '中国地质大学（武汉）',
  '湘潭大学', '广西大学', '海南大学', '贵州大学', '云南大学',
  '西北农林科技大学', '陕西师范大学', '新疆大学', '内蒙古大学',
  '延边大学', '西藏大学', '青海大学', '宁夏大学',
  '太原理工大学', '辽宁大学', '大连海事大学', '东北农业大学', '东北林业大学',
  '上海大学', '上海财经大学', '华东理工大学', '东华大学',
  '浙江工业大学', '安徽大学', '中国矿业大学', '中国石油大学（华东）',
  '暨南大学', '华南师范大学', '深圳大学', '广州大学',
  '四川农业大学', '重庆医科大学', '贵州医科大学',
  '哈尔滨工程大学', '长安大学', '西南大学', '西南财经大学',
  '西南交通大学', '西北大学', '西安电子科技大学',
  '中国海洋大学（青岛）', '山东农业大学', '中国石油大学（北京）',
  '北京科技大学', '首都经济贸易大学', '北京外国语大学',
];

// ── 普通本科（代表性院校名）──
export const UNIVERSITY_NORMAL: string[] = [
  '河北大学', '山西大学', '内蒙古师范大学', '沈阳大学', '长春大学',
  '哈尔滨学院', '苏州科技大学', '安徽工业大学', '赣南师范大学', '烟台大学',
  '中原工学院', '湖北工业大学', '湖南科技大学', '广东工业大学', '广西师范大学',
  '海南师范大学', '重庆工商大学', '贵州师范大学', '云南师范大学',
  '西安工业大学', '兰州交通大学', '青海师范大学', '宁夏医科大学',
  '新疆师范大学', '桂林电子科技大学', '南京工业大学', '浙江工商大学',
  '上海工程技术大学', '天津师范大学', '石家庄铁道大学', '山东理工大学',
  '福建农林大学', '江西理工大学', '湖南农业大学', '广西财经学院',
  '四川理工学院', '西华大学', '昆明理工大学', '兰州理工大学',
];

// ── 专科院校（随机后缀生成模板）──
export const UNIVERSITY_ZHUANKE_SUFFIXES: string[] = [
  '职业技术学院', '职业学院', '技术学院', '工程职业学院',
  '财经职业学院', '医学高等专科学校', '农业职业技术学院', '旅游职业学院',
];

/** 按学校类型返回大学名（DegreeType × school级别） */
export function pickUniversityName(schoolTier: '985' | '211' | '普通本科' | '大专', province?: string): string {
  if (schoolTier === '985') {
    // 40%概率清北，60%随机985
    if (Math.random() < 0.4) return Math.random() < 0.5 ? '清华大学' : '北京大学';
    return UNIVERSITY_985[Math.floor(Math.random() * UNIVERSITY_985.length)];
  }
  if (schoolTier === '211') {
    return UNIVERSITY_211[Math.floor(Math.random() * UNIVERSITY_211.length)];
  }
  if (schoolTier === '普通本科') {
    return UNIVERSITY_NORMAL[Math.floor(Math.random() * UNIVERSITY_NORMAL.length)];
  }
  // 专科：取省份前缀 + 随机后缀
  const cityNames = province ? (PROVINCE_CITY_MAP[province] ?? []) : [];
  const prefix = cityNames.length > 0
    ? cityNames[Math.floor(Math.random() * cityNames.length)].replace(/市|区|县/, '')
    : ['江南', '淮海', '云岭', '南湖', '桂江'][Math.floor(Math.random() * 5)];
  const suffix = UNIVERSITY_ZHUANKE_SUFFIXES[Math.floor(Math.random() * UNIVERSITY_ZHUANKE_SUFFIXES.length)];
  return prefix + suffix;
}

/** NPC按级别随机分配学历层次（级别越高学历越好） */
export function npcSchoolTier(rankLevel: number): '985' | '211' | '普通本科' | '大专' {
  if (rankLevel >= 12) {
    // 部级以上：70%985，28%211，2%普本
    const r = Math.random();
    if (r < 0.70) return '985';
    if (r < 0.98) return '211';
    return '普通本科';
  }
  if (rankLevel >= 9) {
    // 省部级：40%985，45%211，15%普本
    const r = Math.random();
    if (r < 0.40) return '985';
    if (r < 0.85) return '211';
    return '普通本科';
  }
  if (rankLevel >= 6) {
    // 厅级：20%985，50%211，30%普本
    const r = Math.random();
    if (r < 0.20) return '985';
    if (r < 0.70) return '211';
    return '普通本科';
  }
  if (rankLevel >= 3) {
    // 县处级：8%985，30%211，55%普本，7%专科
    const r = Math.random();
    if (r < 0.08) return '985';
    if (r < 0.38) return '211';
    if (r < 0.93) return '普通本科';
    return '大专';
  }
  // 科级及以下：5%985，15%211，55%普本，25%专科
  const r = Math.random();
  if (r < 0.05) return '985';
  if (r < 0.20) return '211';
  if (r < 0.75) return '普通本科';
  return '大专';
}

/** NPC学历对应学位名称 */
export function npcDegreeLabel(schoolTier: '985' | '211' | '普通本科' | '大专', rankLevel: number): string {
  if (schoolTier === '大专') return '专科';
  if (schoolTier === '985' && rankLevel >= 6) {
    const r = Math.random();
    if (r < 0.50) return '博士';
    if (r < 0.80) return '硕士';
    return '本科';
  }
  if (schoolTier === '211' && rankLevel >= 8) {
    const r = Math.random();
    if (r < 0.25) return '博士';
    if (r < 0.65) return '硕士';
    return '本科';
  }
  const r = Math.random();
  if (r < 0.10) return '博士';
  if (r < 0.35) return '硕士';
  return '本科';
}

// ============ rank12-15 路线-部门映射 ============
/**
 * 根据职级 + 仕途路线（careerPath）返回玩家所属部门名称。
 * 用于晋升提示、月度述职、个人档案等展示场景。
 * @param rankLevel  当前职级（1-15）
 * @param careerPath 仕途路线：'party'|'government'|'discipline'|'league'，低于12级或为空时忽略
 */
export function getDepartmentForPlayer(rankLevel: number, careerPath?: string): string {
  // rank1-11：直接使用 RANK_CONFIG 中的 department
  if (rankLevel < 12) {
    return RANK_CONFIG[rankLevel]?.department ?? '人民政府';
  }
  // rank15 三位一体，不分路线
  if (rankLevel >= 15) {
    return '执政党中央·联邦内阁·枢武府';
  }

  // rank12-14：按路线细分
  const DEPT_MAP: Record<number, Record<string, string>> = {
    12: {
      party:      '执政党中央政务委（正部级）',
      government: '联邦内阁（正部级）',
      discipline: '联邦肃宪督察院（正部级）',
      league:     '联邦党政人事院（正部级）',
    },
    13: {
      party:      '执政党中央政务常委会（副国级）',
      government: '联邦内阁（副国级常务副总统）',
      discipline: '联邦肃宪院（副国级）',
      league:     '联邦国会（副国级）',
    },
    14: {
      party:      '执政党中央（正国级·党务委员长）',
      government: '联邦内阁（正国级·行政总理）',
      discipline: '联邦政法委·肃宪院（正国级）',
      league:     '联邦国会（正国级·国会议长）',
    },
  };

  const pathDepts = DEPT_MAP[rankLevel];
  if (pathDepts && careerPath && pathDepts[careerPath]) {
    return pathDepts[careerPath];
  }
  // 兜底：使用 RANK_CONFIG 默认 department
  return RANK_CONFIG[rankLevel]?.department ?? '联邦国家机关';
}