/**
 * 四条仕途路线玩法引擎
 * 党务线 / 行政线 / 纪检线 / 团派线
 * 每条线包含：各级玩法事件池、专属部门、KPI指标、上级任务池
 */

export type CareerLine = '党务线' | '行政线' | '纪检线' | '团派线';

// ── 职级分组 ──────────────────────────────────────────────────────────────
export type RankTier =
  | 'keyuan'   // 1-3  科员/副乡镇长/乡镇长
  | 'fuzhenke' // 4    县委常委/副县长
  | 'zhengke'  // 5-6  县长/县委书记
  | 'fuchu'    // 7    副市长
  | 'zhengchu' // 8-9  市长/市委书记
  | 'futing'   // 10   省长/副省长
  | 'zhengting'// 11   省委书记
  | 'buji';    // 12-15 部级+

export function getRankTier(rankLevel: number): RankTier {
  if (rankLevel <= 3) return 'keyuan';
  if (rankLevel === 4) return 'fuzhenke';
  if (rankLevel <= 6) return 'zhengke';
  if (rankLevel === 7) return 'fuchu';
  if (rankLevel <= 9) return 'zhengchu';
  if (rankLevel === 10) return 'futing';
  if (rankLevel === 11) return 'zhengting';
  return 'buji';
}

// ── 玩法行动定义 ──────────────────────────────────────────────────────────
export interface LineAction {
  key: string;
  name: string;
  desc: string;
  icon: string;
  cooldownDays: number;
  /** 执行结果 */
  effects: {
    meritPoints?: number;
    moralValue?: number;
    bossFavor?: number;
    reformFaction?: number;
    pragmaticFaction?: number;
    inspectionRisk?: number;
    publicOpinion?: number;
    assets?: number;
    lineKpi?: number; // 路线专属KPI积分
  };
  /** 可选：灰色收益（接受会降廉洁） */
  grayOption?: {
    name: string;
    extraMerit: number;
    moralPenalty: number;
  };
  /** 解锁等级（rank） */
  unlockRank: number;
  /** 后置触发剧情文本（1-3行） */
  story: string[];
}

// ── 部门定义 ─────────────────────────────────────────────────────────────
export interface LineDepartment {
  name: string;
  icon: string;
  desc: string;
  rankRange: [number, number];
  actions: LineAction[];
}

// ── KPI指标 ──────────────────────────────────────────────────────────────
export interface LineKpiMetric {
  key: string;
  name: string;
  unit: string;
  icon: string;
  target: number;
  weight: number; // 占总KPI权重 0-1，合计=1
  desc: string;
}

// ── 上级任务 ──────────────────────────────────────────────────────────────
export interface LineTask {
  key: string;
  name: string;
  desc: string;
  icon: string;
  durationDays: number;
  unlockRank: number;
  reward: {
    meritPoints: number;
    bossFavor: number;
    lineKpi?: number;
  };
  story: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// ████████████████  党务线  ████████████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────
export const PARTY_LINE_DEPARTMENTS: LineDepartment[] = [
  {
    name: '乡镇党支部',
    icon: '🏘️',
    desc: '基层党组织，负责党员管理与思想教育',
    rankRange: [1, 3],
    actions: [
      { key: 'p_study', name: '政治理论学习', desc: '组织党员开展习近平新时代中国特色社会主义思想学习', icon: '📖', cooldownDays: 7, effects: { meritPoints: 8, moralValue: 2, lineKpi: 5 }, unlockRank: 1, story: ['学习会议圆满结束', '党员们踊跃发言，理论素养显著提升', '学习情况被上报县委组织部，获得表扬'] },
      { key: 'p_member', name: '发展党员', desc: '审查入党积极分子申请，推荐优秀人选入党', icon: '🎖️', cooldownDays: 30, effects: { meritPoints: 15, lineKpi: 12 }, unlockRank: 1, story: ['经过严格考察，本批2名积极分子通过初审', '材料报送县委组织部审核', '党员队伍得到充实'] },
      { key: 'p_discipline', name: '纪律检查', desc: '对支部成员进行作风纪律专项检查', icon: '🔍', cooldownDays: 14, effects: { meritPoints: 10, moralValue: 1, inspectionRisk: -5, lineKpi: 8 }, unlockRank: 1, story: ['检查发现一般性违规行为2起', '已督促当事人整改', '支部纪律风气明显好转'] },
      { key: 'p_propaganda', name: '党建宣传', desc: '制作党建宣传栏，组织红色教育活动', icon: '📢', cooldownDays: 10, effects: { meritPoints: 6, publicOpinion: 3, lineKpi: 4 }, unlockRank: 1, story: ['宣传栏内容新鲜活泼，群众反响热烈', '本月党建活动参与率达到95%'] },
      { key: 'p_assess', name: '党建考核', desc: '对支部党建工作进行年度考核打分', icon: '📊', cooldownDays: 90, effects: { meritPoints: 25, lineKpi: 20, bossFavor: 5 }, unlockRank: 2, story: ['年度党建考核得分85分，位居全镇第二', '县委组织部下发通报表扬', '晋升材料中加分明显'] },
    ],
  },
  {
    name: '县委组织部',
    icon: '🏛️',
    desc: '负责干部选拔、党员管理、组织建设',
    rankRange: [4, 6],
    actions: [
      { key: 'p_cadre_eval', name: '干部考察', desc: '对拟提拔干部开展全面考察，听取多方意见', icon: '🧐', cooldownDays: 21, effects: { meritPoints: 40, lineKpi: 30, bossFavor: 8 }, unlockRank: 4, story: ['考察组走访了13个单位', '候选人口碑良好，无重大问题', '考察报告上报市委组织部'] },
      { key: 'p_org_assess', name: '基层组织评优', desc: '评选优秀基层党组织，树立示范标杆', icon: '🏆', cooldownDays: 30, effects: { meritPoints: 35, lineKpi: 25, publicOpinion: 5 }, unlockRank: 4, story: ['全县共评出5个优秀基层党组织', '典型经验在全市推广', '县委书记在全县大会上点名表扬'] },
      { key: 'p_party_congress', name: '党代会代表提名', desc: '提名推荐优秀干部参加县党代会', icon: '🗳️', cooldownDays: 60, effects: { meritPoints: 50, lineKpi: 40, bossFavor: 10, reformFaction: 8 }, unlockRank: 5, story: ['代表提名工作严格按程序推进', '所推荐的3名代表均通过资格审查', '组织部门的公信力进一步提升'] },
      { key: 'p_org_talk', name: '组织部谈话', desc: '与拟提拔干部谈话，了解思想动态与廉洁情况', icon: '💬', cooldownDays: 14, effects: { meritPoints: 30, moralValue: 5, lineKpi: 20 }, unlockRank: 5, story: ['此次谈话共涉及8名干部', '谈话中发现一人存在轻微违规', '已按程序移交纪检部门处理'] },
      { key: 'p_rotation', name: '干部轮岗交流', desc: '推动干部跨部门、跨区域交流轮岗', icon: '🔄', cooldownDays: 45, effects: { meritPoints: 45, lineKpi: 35, bossFavor: 6, pragmaticFaction: 5 }, unlockRank: 6, story: ['本批次交流干部20人', '干部队伍活力明显增强', '市委对此次轮岗给予高度评价'] },
      { key: 'p_cadre_reserve', name: '后备干部库建设', desc: '建立年轻干部后备库，实施跟踪培养', icon: '📋', cooldownDays: 60, effects: { meritPoints: 55, lineKpi: 45, bossFavor: 12 }, unlockRank: 6, story: ['全县后备干部库纳入105人', '其中35岁以下占比达到40%', '市委组织部给予充分肯定'] },
    ],
  },
  {
    name: '市委组织部',
    icon: '🏢',
    desc: '全市干部体系建设，党委重要决策辅助机构',
    rankRange: [7, 9],
    actions: [
      { key: 'p_city_org', name: '省委扩大会议筹备', desc: '承办省委扩大会议，协调各市参会事宜', icon: '📍', cooldownDays: 60, effects: { meritPoints: 120, lineKpi: 90, bossFavor: 15 }, unlockRank: 7, story: ['会议筹备工作获省委领导高度认可', '参会代表对会务安排给予好评', '政治影响力显著提升'] },
      { key: 'p_large_cadre', name: '重要职务公选', desc: '组织开展重要领导职位公开选拔工作', icon: '🎯', cooldownDays: 90, effects: { meritPoints: 150, lineKpi: 120, bossFavor: 18, reformFaction: 15 }, unlockRank: 8, story: ['公选工作严格透明，受到各界好评', '最终确定3名优秀人选', '干部选拔公信度大幅提升'] },
      { key: 'p_inspection_coop', name: '配合中央巡视', desc: '配合中央巡视组开展对本市党建工作的巡视', icon: '🔎', cooldownDays: 120, effects: { meritPoints: 100, moralValue: 10, lineKpi: 80, inspectionRisk: -15 }, unlockRank: 9, story: ['巡视期间全力配合，准备材料详实', '巡视组对党建工作整体评价良好', '已就反馈问题制定整改方案'] },
    ],
  },
  {
    name: '省委组织部',
    icon: '🏛️',
    desc: '省级干部体系总控，中央组织工作对接',
    rankRange: [10, 11],
    actions: [
      { key: 'p_prov_congress', name: '省党代会代表大会', desc: '主持省党代会代表大会，推进重大人事议程', icon: '🎖️', cooldownDays: 120, effects: { meritPoints: 300, lineKpi: 250, bossFavor: 25, reformFaction: 30 }, unlockRank: 10, story: ['党代会顺利召开，共选举产生代表287人', '大会通过了多项重要人事决议', '省委政治生态进一步净化'] },
      { key: 'p_cadre_inspect', name: '干部考察审核（厅级）', desc: '对拟提拔厅级干部开展全面组织考察', icon: '🧐', cooldownDays: 90, effects: { meritPoints: 250, lineKpi: 200, bossFavor: 20 }, unlockRank: 11, story: ['考察组深入6个省直部门', '候选人整体素质过硬', '报告已呈送省委常委会审议'] },
    ],
  },
  {
    name: '中央组织部',
    icon: '⭐',
    desc: '全国干部体系最高管理机构',
    rankRange: [12, 15],
    actions: [
      { key: 'p_plenary', name: '中央全会参与', desc: '以中央委员身份参加中央全会，参与重大决策', icon: '🌟', cooldownDays: 120, effects: { meritPoints: 800, lineKpi: 600, bossFavor: 30, reformFaction: 50 }, unlockRank: 12, story: ['全会讨论多项国家重大战略', '您的发言被收录入全会纪要', '政治地位显著提升'] },
      { key: 'p_politburo', name: '政治局会议', desc: '参与政治局会议，讨论全国党建与干部工作', icon: '🏅', cooldownDays: 180, effects: { meritPoints: 1500, lineKpi: 1200, bossFavor: 50, reformFaction: 80 }, unlockRank: 14, story: ['政治局会议历时3天', '您主导的干部改革方案获得通过', '这是中国干部制度的历史性变革'] },
      { key: 'p_central_org_reform', name: '党的组织建设改革', desc: '推动新时代党的建设制度改革顶层设计', icon: '🔑', cooldownDays: 365, effects: { meritPoints: 3000, lineKpi: 2500, bossFavor: 60, reformFaction: 120 }, unlockRank: 15, story: ['改革方案经广泛征求意见后出台', '被誉为党的建设史上的重要里程碑', '您的政治遗产将影响未来数十年'] },
    ],
  },
];

export const PARTY_LINE_KPI: LineKpiMetric[] = [
  { key: 'org_build', name: '组织建设率', unit: '%', icon: '🏗️', target: 90, weight: 0.30, desc: '基层党组织覆盖率与规范化程度' },
  { key: 'member_dev', name: '党员发展数', unit: '人', icon: '👥', target: 20, weight: 0.25, desc: '本考核期内新发展正式党员数量' },
  { key: 'ideol_edu', name: '思想教育分', unit: '分', icon: '📚', target: 85, weight: 0.25, desc: '理论学习考试平均得分' },
  { key: 'discipline', name: '纪律执行率', unit: '%', icon: '⚖️', target: 95, weight: 0.20, desc: '违纪案件查处及时率与处分执行率' },
];

export const PARTY_LINE_TASKS: LineTask[] = [
  { key: 'pt_inspect', name: '组织巡察任务', desc: '带队赴下级党组织开展专项巡察，排查党建隐患', icon: '🔍', durationDays: 30, unlockRank: 1, reward: { meritPoints: 50, bossFavor: 8, lineKpi: 40 }, story: ['巡察组历时一个月走访了全镇12个基层组织', '发现问题15个，已全部转交整改', '上级对巡察结果给予肯定'] },
  { key: 'pt_discipline_review', name: '党纪审查任务', desc: '依纪依规审查一起党员违纪线索，形成审查报告', icon: '📝', durationDays: 21, unlockRank: 2, reward: { meritPoints: 60, bossFavor: 10, lineKpi: 50 }, story: ['审查工作严格按照条规推进', '涉案党员受到党内警告处分', '纪律权威得到有效维护'] },
  { key: 'pt_cadre_talk', name: '干部谈话任务', desc: '对近期存在苗头性问题的干部开展警示谈话', icon: '💬', durationDays: 14, unlockRank: 3, reward: { meritPoints: 40, bossFavor: 6, lineKpi: 30 }, story: ['此次共谈话干部6人', '谈话后均表示认识到了自身问题', '党内风气进一步好转'] },
  { key: 'pt_ideology', name: '思想工作任务', desc: '针对干部队伍中出现的错误思潮开展教育引导', icon: '🧠', durationDays: 20, unlockRank: 4, reward: { meritPoints: 70, bossFavor: 12, lineKpi: 55 }, story: ['思想教育覆盖全县干部2300余人', '问卷调查显示思想状态明显改观', '县委对此次教育活动给予高度评价'] },
  { key: 'pt_org_consolidate', name: '软弱涣散组织整顿', desc: '对软弱涣散基层党组织开展专项整顿', icon: '🔨', durationDays: 60, unlockRank: 5, reward: { meritPoints: 100, bossFavor: 15, lineKpi: 80 }, story: ['全市共整顿软弱涣散党组织18个', '被整顿组织全部达到合格标准', '市委在全省会议上作经验介绍'] },
  { key: 'pt_central_inspection', name: '迎接中央纪律检查', desc: '全面梳理党建工作，迎接中央纪委巡视检查', icon: '⭐', durationDays: 45, unlockRank: 9, reward: { meritPoints: 200, bossFavor: 25, lineKpi: 160 }, story: ['为迎检准备材料厚达500余页', '中央巡视组对本省党建工作评价良好', '提出的5条意见均已制定整改方案'] },
  { key: 'pt_party_reform', name: '新时代党建改革专项', desc: '牵头推进省级党建制度创新与改革试点', icon: '🌟', durationDays: 90, unlockRank: 11, reward: { meritPoints: 400, bossFavor: 35, lineKpi: 300 }, story: ['改革方案在全省试点推进', '3个地市反映效果显著', '中央组织部将在全国推广试点经验'] },
  { key: 'pt_plenary_proposal', name: '全会工作报告起草', desc: '牵头起草全国党建工作报告，提交中央全会审议', icon: '🏛️', durationDays: 120, unlockRank: 12, reward: { meritPoints: 800, bossFavor: 50, lineKpi: 600 }, story: ['报告历经十余次修改，最终版本精炼深刻', '全会审议通过时获得全场起立鼓掌', '被认为是新时代党建的纲领性文件'] },
];

// ─────────────────────────────────────────────────────────────────────────
// ████████████████  行政线  ████████████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────
export const GOVT_LINE_DEPARTMENTS: LineDepartment[] = [
  {
    name: '乡镇人民政府',
    icon: '🏠',
    desc: '基层行政单位，统筹乡镇经济社会发展',
    rankRange: [1, 3],
    actions: [
      { key: 'g_doc', name: '公文处理', desc: '处理上级下发的各类公文、通知，形成执行方案', icon: '📄', cooldownDays: 3, effects: { meritPoints: 6, lineKpi: 4 }, unlockRank: 1, story: ['本周共处理公文23份', '重要事项均已及时落实', '上级满意度提高'] },
      { key: 'g_petition', name: '信访接待', desc: '接待来访群众，妥善处理诉求，化解矛盾', icon: '🤝', cooldownDays: 7, effects: { meritPoints: 12, publicOpinion: 5, lineKpi: 8 }, unlockRank: 1, story: ['本次接访共接待群众12批次', '成功化解矛盾纠纷8起', '群众满意度明显提升'] },
      { key: 'g_project_small', name: '小额项目审批', desc: '审批乡镇级小额基础设施建设项目', icon: '🔨', cooldownDays: 14, effects: { meritPoints: 15, lineKpi: 10 }, unlockRank: 2, story: ['本批审批项目3个，总投资200万', '项目符合规划，手续齐全', '已通知施工方开始建设'] },
      { key: 'g_budget_basic', name: '预算编制', desc: '编制乡镇下半年工作经费预算方案', icon: '💰', cooldownDays: 30, effects: { meritPoints: 20, lineKpi: 15, bossFavor: 4 }, unlockRank: 2, story: ['预算方案经党委会审议通过', '资金安排较合理，重点突出', '县财政局给予初步认可'] },
      { key: 'g_poverty', name: '帮扶困难群众', desc: '入户走访困难群众，落实帮扶政策', icon: '❤️', cooldownDays: 10, effects: { meritPoints: 18, publicOpinion: 8, moralValue: 3, lineKpi: 12 }, unlockRank: 3, story: ['走访困难户32户', '落实帮扶资金5.6万元', '群众对政府工作满意度大幅提升'] },
    ],
  },
  {
    name: '县发展和改革局',
    icon: '📈',
    desc: '统筹县域经济发展规划，推动项目建设与招商',
    rankRange: [4, 6],
    actions: [
      { key: 'g_project_approve', name: '重点项目审批', desc: '审核重点基础设施项目可行性研究报告，批准立项', icon: '🏗️', cooldownDays: 21, effects: { meritPoints: 50, lineKpi: 40, bossFavor: 8 }, unlockRank: 4, story: ['审批项目总投资8亿元', '项目建成后可新增就业岗位2000个', '县委书记批示表扬'] },
      { key: 'g_invest', name: '招商引资', desc: '赴外省开展招商引资，签署投资意向协议', icon: '💼', cooldownDays: 30, effects: { meritPoints: 60, lineKpi: 50, bossFavor: 10 }, unlockRank: 4, story: ['此次招商行程历时5天', '共签署投资意向协议15份，意向投资额32亿元', '省商务厅发来贺电'] },
      { key: 'g_urban_plan', name: '城市规划审批', desc: '审批县城区新建项目的城市规划方案', icon: '🗺️', cooldownDays: 14, effects: { meritPoints: 35, lineKpi: 28, bossFavor: 6 }, unlockRank: 5, story: ['本批次审批建设项目12个', '均符合控制性详细规划要求', '城市建设管理秩序良好'] },
      { key: 'g_gdp_target', name: 'GDP目标分解', desc: '将全年GDP增长目标分解到各镇各部门，督促落实', icon: '📊', cooldownDays: 90, effects: { meritPoints: 80, lineKpi: 65, bossFavor: 12 }, unlockRank: 5, story: ['目标分解方案获县委全票通过', '各镇签订目标责任书', '全年GDP增速有望达到6.8%'] },
      { key: 'g_industry', name: '产业结构调整', desc: '推动县域产业由第一产业向第二三产业升级', icon: '🏭', cooldownDays: 60, effects: { meritPoints: 70, lineKpi: 55, bossFavor: 10, reformFaction: 8 }, unlockRank: 6, story: ['第三产业占比提升至38%', '传统农业镇向特色旅游镇转型初见成效', '省委书记在调研中对此给予肯定'] },
      { key: 'g_bond_finance', name: '专项债申报', desc: '申报地方政府专项债券，为重大基础设施提供资金', icon: '🏦', cooldownDays: 45, effects: { meritPoints: 65, lineKpi: 50, bossFavor: 8 }, unlockRank: 6, story: ['成功申报专项债额度5亿元', '资金将用于城市地下管网改造', '财政部对申报材料质量给予高度评价'] },
    ],
  },
  {
    name: '市政府办公室',
    icon: '🏙️',
    desc: '市级行政核心，统筹全市重大行政事务',
    rankRange: [7, 9],
    actions: [
      { key: 'g_major_project', name: '重大项目拍板', desc: '主持审议全市重大投资项目，作出最终决策', icon: '✅', cooldownDays: 30, effects: { meritPoints: 150, lineKpi: 120, bossFavor: 18 }, unlockRank: 7, story: ['本次会议审议重大项目5个，总投资150亿', '4个项目获批通过，1个要求补充资料', '批复项目将拉动全市GDP增长0.5%'] },
      { key: 'g_city_coord', name: '省级统筹协调', desc: '代表本市参与省级重大政策的协调制定', icon: '🌐', cooldownDays: 60, effects: { meritPoints: 200, lineKpi: 160, bossFavor: 22 }, unlockRank: 8, story: ['本次协调历时3个月', '成功争取省级专项补贴资金8亿元', '市委书记对争取结果表示满意'] },
      { key: 'g_emergency', name: '重大突发事件处置', desc: '指挥处置全市重大自然灾害或公共安全突发事件', icon: '🚨', cooldownDays: 90, effects: { meritPoints: 250, lineKpi: 200, bossFavor: 25, publicOpinion: 20 }, unlockRank: 9, story: ['事件发生后6小时内完成紧急部署', '成功转移群众15000人', '将人员伤亡降至最低，获省委省政府通报表彰'] },
    ],
  },
  {
    name: '省级人民政府',
    icon: '🏛️',
    desc: '省级行政最高机构，统筹全省发展',
    rankRange: [10, 11],
    actions: [
      { key: 'g_prov_budget', name: '省级财政预算审议', desc: '主持或参与省级年度财政预算编制与审议', icon: '💰', cooldownDays: 90, effects: { meritPoints: 400, lineKpi: 320, bossFavor: 30 }, unlockRank: 10, story: ['省级财政预算总额达1.2万亿', '民生支出占比提升至65%', '省人大审议全票通过'] },
      { key: 'g_prov_reform', name: '省级重大改革推进', desc: '牵头推进省级行政体制改革专项工作', icon: '🔄', cooldownDays: 120, effects: { meritPoints: 500, lineKpi: 400, bossFavor: 35, reformFaction: 40 }, unlockRank: 11, story: ['改革方案获国务院批准', '在全省15个设区市全面推开', '被国务院列为全国改革示范省份'] },
    ],
  },
  {
    name: '联邦国家机关',
    icon: '⭐',
    desc: '国家最高行政决策机构',
    rankRange: [12, 15],
    actions: [
      { key: 'g_npc', name: '全国人大审议', desc: '作为代表参与全国人民代表大会，审议重大法律与政策', icon: '🏛️', cooldownDays: 365, effects: { meritPoints: 1000, lineKpi: 800, bossFavor: 40, reformFaction: 60 }, unlockRank: 12, story: ['人大审议历时15天', '您提出的法律修正案被采纳', '被称为年度最具影响力的立法贡献'] },
      { key: 'g_policy_national', name: '国家政策制定', desc: '主导研究起草重大国家发展政策', icon: '📜', cooldownDays: 180, effects: { meritPoints: 2000, lineKpi: 1600, bossFavor: 55, reformFaction: 100 }, unlockRank: 13, story: ['政策历经18个月调研论证', '在国务院常务会议上通过', '预计将影响未来10年经济发展走向'] },
    ],
  },
];

export const GOVT_LINE_KPI: LineKpiMetric[] = [
  { key: 'gdp_growth', name: 'GDP增长率', unit: '%', icon: '📈', target: 6.5, weight: 0.30, desc: '辖区GDP年增长率，高于全省平均为优秀' },
  { key: 'fiscal_rev', name: '财政收入', unit: '亿元', icon: '💰', target: 50, weight: 0.25, desc: '年度地方财政一般预算收入' },
  { key: 'project_done', name: '项目完成率', unit: '%', icon: '🏗️', target: 90, weight: 0.25, desc: '年度重点项目按期完工比例' },
  { key: 'livelihood', name: '民生满意度', unit: '分', icon: '😊', target: 80, weight: 0.20, desc: '群众对政府民生工作满意度调查得分' },
];

export const GOVT_LINE_TASKS: LineTask[] = [
  { key: 'gt_gdp', name: 'GDP攻坚任务', desc: '完成年度GDP增长目标考核，确保高于省均水平', icon: '📊', durationDays: 90, unlockRank: 1, reward: { meritPoints: 80, bossFavor: 12, lineKpi: 60 }, story: ['经过一季度奋战，GDP增速达6.9%', '超额完成上级下达的6.5%目标', '被省统计局列为优秀案例'] },
  { key: 'gt_project', name: '重大项目推进任务', desc: '督促年度重点项目按期完工，确保项目完成率≥90%', icon: '🏗️', durationDays: 60, unlockRank: 2, reward: { meritPoints: 90, bossFavor: 14, lineKpi: 70 }, story: ['启动重点项目督查机制', '本年度12个重点项目全部按期完工', '省级评优中排名全省第二'] },
  { key: 'gt_invest', name: '招商引资任务', desc: '完成年度招商引资目标，引进落地项目≥3个', icon: '💼', durationDays: 45, unlockRank: 3, reward: { meritPoints: 100, bossFavor: 15, lineKpi: 80 }, story: ['赴粤港澳大湾区开展精准招商', '引进先进制造业项目3个，到位资金12亿', '市委书记专程出席签约仪式'] },
  { key: 'gt_disaster', name: '灾后重建任务', desc: '统筹推进灾区基础设施重建，确保群众尽快回归正常生活', icon: '🏠', durationDays: 120, unlockRank: 4, reward: { meritPoints: 150, bossFavor: 20, lineKpi: 120 }, story: ['灾后重建工作快速启动', '3000户受灾群众全部搬入新居', '被民政部列为灾后重建样板'] },
  { key: 'gt_reform_pilot', name: '行政改革试点任务', desc: '承接省级行政审批制度改革试点任务', icon: '🔄', durationDays: 90, unlockRank: 6, reward: { meritPoints: 160, bossFavor: 22, lineKpi: 130 }, story: ['全面推行政务服务"一网通办"', '企业开办时间压缩至1个工作日', '国务院督查组予以高度评价'] },
  { key: 'gt_national_strategy', name: '国家战略对接任务', desc: '将本省发展规划与国家战略深度对接，争取政策支持', icon: '🌐', durationDays: 150, unlockRank: 10, reward: { meritPoints: 500, bossFavor: 40, lineKpi: 400 }, story: ['成功将本省纳入国家重大战略实施范围', '争取到中央专项资金200亿', '省委省政府将此列为年度最大政治成果'] },
];

// ─────────────────────────────────────────────────────────────────────────
// ████████████████  纪检线  ████████████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────
export const DISCIPLINE_LINE_DEPARTMENTS: LineDepartment[] = [
  {
    name: '乡镇纪检委',
    icon: '⚖️',
    desc: '基层纪检监察机构，负责党纪监督与腐败查处',
    rankRange: [1, 3],
    actions: [
      { key: 'd_report', name: '举报线索登记', desc: '接收群众举报，对线索进行初步核实登记', icon: '📥', cooldownDays: 7, effects: { meritPoints: 10, moralValue: 2, lineKpi: 8 }, unlockRank: 1, story: ['本周共接收举报线索8条', '经初核，3条具有查办价值', '已移交上级纪委审查'] },
      { key: 'd_clean_edu', name: '廉政教育', desc: '组织干部开展廉洁从政专题教育活动', icon: '📖', cooldownDays: 14, effects: { meritPoints: 12, moralValue: 3, lineKpi: 10, inspectionRisk: -5 }, unlockRank: 1, story: ['廉政教育覆盖干部260余人', '观看警示教育片后多人表示触动很大', '廉洁指数同比提升5个百分点'] },
      { key: 'd_minor_case', name: '一般违纪处理', desc: '查处一起一般性违反工作纪律案件', icon: '🔨', cooldownDays: 21, effects: { meritPoints: 20, lineKpi: 16, bossFavor: 4, moralValue: 2 }, unlockRank: 2, story: ['经过21天调查，违纪事实清楚', '当事人被给予警告处分', '案件处理获当地群众点赞'] },
      { key: 'd_self_inspect', name: '自查自纠', desc: '组织开展党员干部违规行为自查自纠专项活动', icon: '🔍', cooldownDays: 30, effects: { meritPoints: 15, moralValue: 4, lineKpi: 12, inspectionRisk: -8 }, unlockRank: 3, story: ['共有6名干部主动上报问题', '按照坦白从宽原则予以轻处', '纪律正风肃纪氛围显著改善'] },
    ],
  },
  {
    name: '县纪委监察委',
    icon: '🏛️',
    desc: '县级纪检监察机关，承接案件查办与监督执纪',
    rankRange: [4, 6],
    actions: [
      { key: 'd_major_case', name: '重大腐败案立案', desc: '对一起重大腐败案件正式立案，开展全面调查', icon: '📂', cooldownDays: 45, effects: { meritPoints: 80, lineKpi: 65, bossFavor: 12, moralValue: 5 }, unlockRank: 4, story: ['经过30天初步调查，已掌握关键证据', '案件正式立案调查', '当事人被留置审查，涉案金额约500万'] },
      { key: 'd_shuanggui', name: '双规流程执行', desc: '对涉案干部实施双规措施，开展集中调查', icon: '🔒', cooldownDays: 60, effects: { meritPoints: 100, lineKpi: 80, bossFavor: 15, inspectionRisk: -15 }, unlockRank: 5, story: ['双规期间，当事人如实交代了全部违纪违法行为', '涉案金额最终认定为1200万元', '案件移送司法机关处理'] },
      { key: 'd_umbrella', name: '查处保护伞', desc: '揪出为腐败分子提供保护的上级干部', icon: '🎯', cooldownDays: 90, effects: { meritPoints: 150, lineKpi: 120, bossFavor: 20, moralValue: 8 }, grayOption: { name: '放过保护伞（换取好处）', extraMerit: 50, moralPenalty: 20 }, unlockRank: 5, story: ['历经90天深挖，发现保护伞关系', '涉案上级干部被一并立案调查', '打虎拍蝇成效受到中央纪委表扬'] },
      { key: 'd_patrol_assist', name: '配合省级巡视', desc: '全力配合省级巡视组对本县开展的专项巡视', icon: '🔎', cooldownDays: 30, effects: { meritPoints: 60, lineKpi: 48, bossFavor: 8, inspectionRisk: -20 }, unlockRank: 6, story: ['配合工作扎实有序，材料准备充分', '巡视组对本县纪检工作整体满意', '反馈问题8个，均已制定整改时间表'] },
    ],
  },
  {
    name: '市纪委监察委',
    icon: '🏢',
    desc: '市级纪检监察机关，统筹全市反腐败斗争',
    rankRange: [7, 9],
    actions: [
      { key: 'd_anti_corrupt_action', name: '反腐专项行动', desc: '部署开展全市重点领域专项整治行动', icon: '⚡', cooldownDays: 60, effects: { meritPoints: 200, lineKpi: 160, bossFavor: 25, moralValue: 10 }, unlockRank: 7, story: ['专项行动历时2个月', '共立案60件，给予纪律处分52人', '营商环境廉洁度明显改善'] },
      { key: 'd_campaign', name: '省级反腐专项行动主导', desc: '主导省级反腐败斗争专项行动，统筹部署各地市', icon: '🌊', cooldownDays: 90, effects: { meritPoints: 300, lineKpi: 240, bossFavor: 30, moralValue: 12 }, unlockRank: 9, story: ['省级专项行动覆盖全省21个地市', '共查处厅级以上干部8人', '中央纪委对本次行动给予充分肯定'] },
    ],
  },
  {
    name: '省纪委监察委',
    icon: '🏛️',
    desc: '省级纪检监察最高机关',
    rankRange: [10, 11],
    actions: [
      { key: 'd_prov_anti_corrupt', name: '省级重大腐败案查处', desc: '主导查处一起省级重大腐败案件', icon: '⭐', cooldownDays: 120, effects: { meritPoints: 500, lineKpi: 400, bossFavor: 40, moralValue: 15 }, unlockRank: 10, story: ['历时4个月，成功查处副省级腐败案', '涉案金额高达2.5亿元', '案件被评为年度全国十大反腐败典型案例'] },
      { key: 'd_system_build', name: '廉政制度建设', desc: '推动省级廉政制度体系改革，建立长效机制', icon: '🏗️', cooldownDays: 90, effects: { meritPoints: 400, lineKpi: 320, bossFavor: 35 }, unlockRank: 11, story: ['廉政制度体系建设方案通过省委审议', '新制度堵塞了12个重要廉政风险点', '获中央纪委在全国推广'] },
    ],
  },
  {
    name: '中央纪律检查委员会',
    icon: '⭐',
    desc: '全国纪检监察最高机关',
    rankRange: [12, 15],
    actions: [
      { key: 'd_central_patrol', name: '中央纪委巡视', desc: '率巡视组对重点省份开展中央纪委专项巡视', icon: '🔍', cooldownDays: 180, effects: { meritPoints: 1000, lineKpi: 800, bossFavor: 50, moralValue: 20 }, unlockRank: 12, story: ['巡视组深入6个省份', '发现重大问题线索12条', '3名厅级以上干部被立案审查'] },
      { key: 'd_central_case', name: '中央专案组查处', desc: '牵头成立中央专案组，查处重大政治案件', icon: '🏅', cooldownDays: 365, effects: { meritPoints: 3000, lineKpi: 2400, bossFavor: 70, moralValue: 30 }, unlockRank: 14, story: ['中央专案组历时一年', '成功查处正部级腐败案件，在全国引发强烈反响', '被誉为新时代反腐败斗争的里程碑'] },
    ],
  },
];

export const DISCIPLINE_LINE_KPI: LineKpiMetric[] = [
  { key: 'case_handle', name: '违纪查处率', unit: '%', icon: '⚖️', target: 95, weight: 0.30, desc: '纪检线索查处率与案件办结率' },
  { key: 'integrity', name: '廉洁度评分', unit: '分', icon: '🌟', target: 85, weight: 0.30, desc: '辖区党政干部廉洁度综合评价' },
  { key: 'report_resp', name: '举报响应率', unit: '%', icon: '📥', target: 100, weight: 0.20, desc: '群众举报线索在规定时限内响应处理的比例' },
  { key: 'case_close', name: '案件办结率', unit: '%', icon: '✅', target: 90, weight: 0.20, desc: '当期立案案件在规定期限内办结的比例' },
];

export const DISCIPLINE_LINE_TASKS: LineTask[] = [
  { key: 'dt_anti_corrupt', name: '反腐专项任务', desc: '在重点领域开展一轮反腐败专项排查行动', icon: '🔍', durationDays: 45, unlockRank: 1, reward: { meritPoints: 70, bossFavor: 10, lineKpi: 56 }, story: ['专项排查覆盖8个重点部门', '发现问题线索14条', '5条已移交查办，反腐态势有效遏制'] },
  { key: 'dt_patrol_coop', name: '巡视配合任务', desc: '接受上级巡视组巡视，提供全面翔实的材料配合', icon: '📋', durationDays: 30, unlockRank: 2, reward: { meritPoints: 60, bossFavor: 9, lineKpi: 48 }, story: ['巡视材料准备工作历时1个月', '共提供各类佐证材料600余份', '巡视组评价配合工作"扎实有效"'] },
  { key: 'dt_case_crack', name: '案件侦破任务', desc: '完成一起重大违纪违法案件的侦查取证工作', icon: '🔦', durationDays: 60, unlockRank: 3, reward: { meritPoints: 90, bossFavor: 13, lineKpi: 72 }, story: ['历时60天，关键证据全部收集到位', '案件事实清楚，证据链完整', '当事人认罪认罚，移送检察院审查起诉'] },
  { key: 'dt_clean_edu2', name: '廉洁教育推进任务', desc: '全面推进辖区干部廉洁教育，廉洁指数提升5个点', icon: '📚', durationDays: 30, unlockRank: 4, reward: { meritPoints: 50, bossFavor: 7, lineKpi: 40 }, story: ['廉洁教育形式多样，包括案例警示、知识竞赛、宣誓活动', '参与率达到99%', '廉洁指数同比提升6.2个百分点'] },
  { key: 'dt_systemic', name: '系统性腐败治理任务', desc: '针对某一领域系统性腐败问题开展专项治理', icon: '🏗️', durationDays: 90, unlockRank: 6, reward: { meritPoints: 150, bossFavor: 20, lineKpi: 120 }, story: ['系统性治理覆盖工程建设领域全链条', '共处理责任人23人', '该领域腐败问题得到有效遏制'] },
  { key: 'dt_national_campaign', name: '全国反腐专项行动部署', desc: '承接中央部署，在全国范围内推进重点领域反腐专项行动', icon: '🌟', durationDays: 120, unlockRank: 10, reward: { meritPoints: 500, bossFavor: 40, lineKpi: 400 }, story: ['全国专项行动覆盖31个省区市', '共立案5200件，处分5100人', '被称为党的十八大以来规模最大的反腐行动'] },
];

// ─────────────────────────────────────────────────────────────────────────
// ████████████████  团派线  ████████████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────
export const LEAGUE_LINE_DEPARTMENTS: LineDepartment[] = [
  {
    name: '乡镇团支部',
    icon: '🌱',
    desc: '基层共青团组织，负责青年活动与志愿服务',
    rankRange: [1, 3],
    actions: [
      { key: 'l_activity', name: '青年团活动', desc: '组织青年志愿者开展社区服务与公益活动', icon: '🙌', cooldownDays: 7, effects: { meritPoints: 8, publicOpinion: 5, lineKpi: 6 }, unlockRank: 1, story: ['本次志愿者活动吸引了50余名青年参与', '完成了道路清洁、敬老服务等任务', '群众反响热烈，媒体进行了报道'] },
      { key: 'l_volunteer', name: '志愿服务队组建', desc: '组建青年志愿服务队，建立长效服务机制', icon: '💪', cooldownDays: 14, effects: { meritPoints: 12, publicOpinion: 8, lineKpi: 10 }, unlockRank: 1, story: ['成立了一支100人规模的青年志愿服务队', '建立了服务积分制度，激励青年持续参与', '已挂牌"青年之家"服务站'] },
      { key: 'l_youth_employ', name: '青年就业帮扶', desc: '为辖区失业青年提供就业信息与技能培训', icon: '👔', cooldownDays: 21, effects: { meritPoints: 18, publicOpinion: 10, lineKpi: 14 }, unlockRank: 2, story: ['本期帮扶培训覆盖青年60人', '已有32人成功就业或创业', '被县人社局评为优秀就业帮扶项目'] },
      { key: 'l_village_official', name: '大学生村官管理', desc: '管理辖区大学生村官，为其提供成长路径', icon: '🎓', cooldownDays: 30, effects: { meritPoints: 20, lineKpi: 16, bossFavor: 4 }, unlockRank: 3, story: ['辖区大学生村官共22人', '本年度组织技能培训6次', '3人被评为省级优秀大学生村官'] },
    ],
  },
  {
    name: '县团委',
    icon: '🏢',
    desc: '县级共青团领导机关，统筹青年工作',
    rankRange: [4, 6],
    actions: [
      { key: 'l_startup_fund', name: '青年创业基金', desc: '设立并管理青年创业专项扶持基金，支持青年创业', icon: '💡', cooldownDays: 45, effects: { meritPoints: 60, lineKpi: 48, bossFavor: 10, publicOpinion: 8 }, unlockRank: 4, story: ['本期青年创业基金发放100万元', '支持20个青年创业项目', '3个项目已实现盈利，带动就业80余人'] },
      { key: 'l_congress_chair', name: '团代会主席', desc: '主持召开县级共青团代表大会', icon: '🎖️', cooldownDays: 90, effects: { meritPoints: 80, lineKpi: 65, bossFavor: 12, reformFaction: 8 }, unlockRank: 5, story: ['团代会共选举代表120人', '大会通过了未来5年青年工作规划', '县委书记出席并给予充分肯定'] },
      { key: 'l_youth_league', name: '青年发展规划', desc: '制定县级青年发展五年规划，报县委批准实施', icon: '📋', cooldownDays: 60, effects: { meritPoints: 70, lineKpi: 56, bossFavor: 10 }, unlockRank: 6, story: ['规划历时6个月调研起草', '经县委常委会审议通过', '被省团委列为省级示范规划'] },
    ],
  },
  {
    name: '市团委',
    icon: '🏙️',
    desc: '市级共青团领导机构，统筹全市青年工作',
    rankRange: [7, 9],
    actions: [
      { key: 'l_youth_assoc', name: '全国青联委员提名', desc: '推荐优秀青年代表参加全国青年联合会', icon: '🌐', cooldownDays: 90, effects: { meritPoints: 180, lineKpi: 144, bossFavor: 22 }, unlockRank: 7, story: ['经过严格遴选，推荐了5名青年代表', '其中2人入选全国青联第十四届委员', '全市青年工作影响力显著提升'] },
      { key: 'l_prov_youth', name: '省级青年工作部署', desc: '统筹部署全市对接省级青年发展战略的工作方案', icon: '📍', cooldownDays: 60, effects: { meritPoints: 200, lineKpi: 160, bossFavor: 25 }, unlockRank: 9, story: ['工作方案获省团委高度认可', '全市青年参与公益活动人次达到100万', '被评为全省青年工作优秀市'] },
    ],
  },
  {
    name: '省团委',
    icon: '🏛️',
    desc: '省级共青团领导机关',
    rankRange: [10, 11],
    actions: [
      { key: 'l_prov_congress', name: '省团代会召开', desc: '主持召开省级共青团代表大会，确定未来5年工作方向', icon: '🎖️', cooldownDays: 120, effects: { meritPoints: 400, lineKpi: 320, bossFavor: 30, reformFaction: 30 }, unlockRank: 10, story: ['省团代会历时3天', '共选举代表500人，通过新一届领导班子方案', '省委书记发表重要讲话，对青年工作高度重视'] },
      { key: 'l_youth_summit', name: '青年领袖峰会', desc: '主办省级青年领袖峰会，邀请各地优秀青年代表参与', icon: '🌟', cooldownDays: 90, effects: { meritPoints: 350, lineKpi: 280, bossFavor: 28, publicOpinion: 25 }, unlockRank: 11, story: ['峰会吸引了来自全省的500名青年领袖参与', '峰会成果获中央媒体广泛报道', '省委高度评价，认为这是青年工作的创新突破'] },
    ],
  },
  {
    name: '共青团中央',
    icon: '⭐',
    desc: '全国共青团最高领导机关',
    rankRange: [12, 15],
    actions: [
      { key: 'l_national_congress', name: '共青团全国代表大会', desc: '作为核心领导参与共青团全国代表大会', icon: '🏛️', cooldownDays: 365, effects: { meritPoints: 1000, lineKpi: 800, bossFavor: 45, reformFaction: 60 }, unlockRank: 12, story: ['全国团代会历时5天', '通过了未来5年共青团工作纲要', '会议引起全国青年的广泛关注与响应'] },
      { key: 'l_global_youth', name: '国际青年合作项目', desc: '主导推进与多国青年组织的合作交流项目', icon: '🌍', cooldownDays: 180, effects: { meritPoints: 2000, lineKpi: 1600, bossFavor: 55, reformFaction: 80 }, unlockRank: 13, story: ['合作项目涉及20个国家的青年组织', '开展互访交流活动50余次', '被誉为新时代青年外交的重要创举'] },
    ],
  },
];

export const LEAGUE_LINE_KPI: LineKpiMetric[] = [
  { key: 'youth_engage', name: '青年参与度', unit: '%', icon: '👥', target: 80, weight: 0.30, desc: '辖区青年参与团组织活动的比例' },
  { key: 'employ_aid', name: '就业帮扶率', unit: '%', icon: '💼', target: 85, weight: 0.25, desc: '需帮扶青年中成功实现就业或创业的比例' },
  { key: 'public_satis', name: '群众满意度', unit: '分', icon: '😊', target: 82, weight: 0.25, desc: '群众对青年工作满意度调查综合得分' },
  { key: 'activity_impact', name: '活动影响力', unit: '分', icon: '🌟', target: 75, weight: 0.20, desc: '重大活动的社会影响力评估得分' },
];

export const LEAGUE_LINE_TASKS: LineTask[] = [
  { key: 'lt_youth_work', name: '青年工作专项任务', desc: '开展一次大型青年公益活动，扩大团组织影响力', icon: '🎯', durationDays: 21, unlockRank: 1, reward: { meritPoints: 50, bossFavor: 8, lineKpi: 40 }, story: ['大型公益活动参与青年超过500人', '活动内容丰富，社会反响热烈', '被县委宣传部评为年度优秀社会活动'] },
  { key: 'lt_poverty', name: '扶贫帮困任务', desc: '带领青年志愿者开展扶贫帮困活动', icon: '❤️', durationDays: 30, unlockRank: 2, reward: { meritPoints: 60, bossFavor: 9, lineKpi: 48 }, story: ['深入偏远山区开展帮扶活动', '为32户困难家庭送去物资和关爱', '村民自发为志愿者送来锦旗'] },
  { key: 'lt_research', name: '基层调研任务', desc: '带领调研团队深入基层，了解青年诉求与困难', icon: '📋', durationDays: 20, unlockRank: 3, reward: { meritPoints: 45, bossFavor: 7, lineKpi: 36 }, story: ['调研覆盖12个乡镇，访谈青年360人', '形成8000字调研报告', '省团委将调研成果作为政策制定重要参考'] },
  { key: 'lt_major_event', name: '重大活动统筹任务', desc: '统筹举办全市青年文化节，展示青年风采', icon: '🎉', durationDays: 45, unlockRank: 4, reward: { meritPoints: 80, bossFavor: 12, lineKpi: 64 }, story: ['青年文化节历时一周', '吸引观众10万人次', '市电视台进行全程直播，社会影响广泛'] },
  { key: 'lt_intl_youth', name: '国际青年交流任务', desc: '组织代表团参与国际青年交流活动', icon: '🌍', durationDays: 30, unlockRank: 7, reward: { meritPoints: 150, bossFavor: 20, lineKpi: 120 }, story: ['代表团赴欧洲参加国际青年论坛', '与来自20个国家的青年组织签署合作备忘录', '外交部对代表团表现给予高度评价'] },
  { key: 'lt_national_plan', name: '全国青年发展规划制定', desc: '牵头起草全国青年发展五年规划，提交国务院审议', icon: '📜', durationDays: 120, unlockRank: 12, reward: { meritPoints: 600, bossFavor: 45, lineKpi: 480 }, story: ['规划历经2年调研论证', '经国务院常务会议审议通过', '被视为新时代青年发展领域最重要的政策文件'] },
];

// ─────────────────────────────────────────────────────────────────────────
// ████████████████  综合查询函数  ███████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────

type LineDataMap = {
  departments: LineDepartment[];
  kpi: LineKpiMetric[];
  tasks: LineTask[];
  color: string;
  name: string;
};

export const LINE_DATA: Record<CareerLine, LineDataMap> = {
  '党务线': { departments: PARTY_LINE_DEPARTMENTS, kpi: PARTY_LINE_KPI, tasks: PARTY_LINE_TASKS, color: '#c0392b', name: '党务线' },
  '行政线': { departments: GOVT_LINE_DEPARTMENTS, kpi: GOVT_LINE_KPI, tasks: GOVT_LINE_TASKS, color: '#1a5fa8', name: '行政线' },
  '纪检线': { departments: DISCIPLINE_LINE_DEPARTMENTS, kpi: DISCIPLINE_LINE_KPI, tasks: DISCIPLINE_LINE_TASKS, color: '#7d6608', name: '纪检线' },
  '团派线': { departments: LEAGUE_LINE_DEPARTMENTS, kpi: LEAGUE_LINE_KPI, tasks: LEAGUE_LINE_TASKS, color: '#1a7a4a', name: '团派线' },
};

/** 获取当前职级对应的部门列表（只显示 rankRange 包含该级别的部门） */
export function getDepartmentsForRank(line: CareerLine, rankLevel: number): LineDepartment[] {
  return LINE_DATA[line].departments.filter(
    d => rankLevel >= d.rankRange[0] && rankLevel <= d.rankRange[1],
  );
}

/** 获取当前职级可用的所有行动（含部门行动，过滤 unlockRank） */
export function getActionsForRank(line: CareerLine, rankLevel: number): LineAction[] {
  const depts = getDepartmentsForRank(line, rankLevel);
  const all: LineAction[] = [];
  for (const dept of depts) {
    for (const action of dept.actions) {
      if (action.unlockRank <= rankLevel) all.push(action);
    }
  }
  return all;
}

/** 获取当前职级可用的上级任务 */
export function getTasksForRank(line: CareerLine, rankLevel: number): LineTask[] {
  return LINE_DATA[line].tasks.filter(t => t.unlockRank <= rankLevel);
}

/** 根据路线获取KPI指标 */
export function getKpiForLine(line: CareerLine): LineKpiMetric[] {
  return LINE_DATA[line].kpi;
}

/** 玩家喜好路线 → 上级提拔概率加成系数（+20%） */
export const PREFERRED_LINE_PROMO_BONUS = 0.20;

/** 四条线卖点文案（晋升选线页面使用） */
export const LINE_PITCH: Record<CareerLine, { tagline: string; advantages: string[]; icon: string }> = {
  '党务线': {
    icon: '🔴',
    tagline: '党心所向，组织先行',
    advantages: ['干部选拔核心话语权', '党代会晋升通道', '组织部庇护体系'],
  },
  '行政线': {
    icon: '🔵',
    tagline: '治国理政，实干为民',
    advantages: ['GDP政绩直接可见', '招商引资快速晋升', '财政资源掌控权'],
  },
  '纪检线': {
    icon: '🟡',
    tagline: '铁面无私，执纪如铁',
    advantages: ['廉洁度加成显著', '反腐功勋晋升加速', '不受行贿事件影响'],
  },
  '团派线': {
    icon: '🟢',
    tagline: '青春领航，薪火相传',
    advantages: ['年龄优势晋升更快', '群众口碑天然加分', '国际交流积累人脉'],
  },
};

/** 每日线KPI分数（用于GameContext月度自动更新时给线KPI小幅增长） */
export function getMonthlyLineKpiGain(line: CareerLine, rankLevel: number): number {
  const base = rankLevel * 3;
  const lineBonus: Record<CareerLine, number> = { '党务线': 5, '行政线': 8, '纪检线': 6, '团派线': 4 };
  return base + lineBonus[line];
}

// ─────────────────────────────────────────────────────────────────────────
// ████  路线行动动态花费 & 名额职数  ████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────

/**
 * 按职级 tier 返回专项资金花费倍率（万元/次）
 * rank 1-3  →  基准倍率 ×1     (基础政绩奖励的 80 倍，万元)
 * rank 4-6  →  基准倍率 ×5
 * rank 7-9  →  基准倍率 ×20
 * rank 10-11 → 基准倍率 ×60
 * rank 12-15 → 基准倍率 ×200
 */
export function getRankCostMultiplier(rankLevel: number): number {
  if (rankLevel <= 3)  return 1;
  if (rankLevel <= 6)  return 5;
  if (rankLevel <= 9)  return 20;
  if (rankLevel <= 11) return 60;
  return 200;
}

/**
 * 计算该行动在当前职级下的专项资金花费（万元）。
 * 基础公式：max(1, meritReward) × 80 × rankMultiplier
 * 确保返回整数万元，最低1万。
 */
export function getActionCost(action: LineAction, rankLevel: number): number {
  const meritBase = Math.max(1, action.effects.meritPoints ?? 1);
  const multiplier = getRankCostMultiplier(rankLevel);
  return Math.max(1, Math.round(meritBase * 80 * multiplier / 10000) * 10000);
}

/**
 * 按职级和花费倍率缩放行动奖励（政绩 × rankMultiplier / 基准倍率）。
 * 用于在 UI 显示"本级实际奖励"，高级职位政绩基数也更高。
 */
export function getActionRewardForRank(action: LineAction, rankLevel: number): LineAction['effects'] {
  const m = getRankCostMultiplier(rankLevel);
  const base = getRankCostMultiplier(action.unlockRank);
  const scale = m / base;
  const scale1 = (v?: number) => v !== undefined ? Math.round(v * scale) : undefined;
  return {
    meritPoints:     scale1(action.effects.meritPoints),
    moralValue:      scale1(action.effects.moralValue),
    bossFavor:       action.effects.bossFavor,          // 好感不放大
    reformFaction:   action.effects.reformFaction,
    pragmaticFaction: action.effects.pragmaticFaction,
    inspectionRisk:  action.effects.inspectionRisk,
    publicOpinion:   scale1(action.effects.publicOpinion),
    lineKpi:         scale1(action.effects.lineKpi),
  };
}

/**
 * 获取当前部门在指定职级下的名额职数（越高级越稀缺）。
 * rank 1-3  → 12名  rank 4-6  → 8名  rank 7-9  → 5名
 * rank 10-11 → 3名  rank 12-15 → 2名
 * 加上随机波动：每次按 gameDays 种子偏移 ±1
 */
export function getDeptQuota(dept: LineDepartment, rankLevel: number, gameDays: number): number {
  const base = rankLevel <= 3 ? 12 : rankLevel <= 6 ? 8 : rankLevel <= 9 ? 5 : rankLevel <= 11 ? 3 : 2;
  // 用部门名+gameDays做伪随机扰动，每月变动
  const seed = (dept.name.charCodeAt(0) * 31 + Math.floor(gameDays / 30)) % 3;
  return Math.max(1, base + seed - 1); // 扰动 -1 ~ +1
}

// ─────────────────────────────────────────────────────────────────────────
// ████  专项资金来源渠道  ███████████████████████████████████████████████████
// ─────────────────────────────────────────────────────────────────────────

export interface FundChannel {
  key: 'grant_application' | 'performance_reward' | 'annual_budget' | 'emergency_fund' | 'special_project';
  title: string;
  icon: string;
  desc: string;
  /** 冷却：每年1次（返回年份冷却字段名） */
  cooldownField: 'grantApplicationLastYear' | 'performanceRewardLastYear' | 'annualBudgetLastYear';
  /** 金额计算函数（万元） */
  calcAmount: (rankLevel: number, meritPoints: number, lineKpiScore: number) => number;
  /** 解锁条件描述 */
  requireDesc: string;
  /** 是否需要 meritPoints 达标 */
  meritReq?: number;
  /** 是否自动（年度预算）*/
  isAuto: boolean;
  color: string;
  bgColor: string;
}

export const FUND_CHANNELS: FundChannel[] = [
  {
    key: 'grant_application',
    title: '上级专项拨款申请',
    icon: '📋',
    desc: '向上级主管部门提交专项工作经费申请报告，经审批后拨付。每年限申请1次，批复金额与职级和路线KPI挂钩。',
    cooldownField: 'grantApplicationLastYear',
    calcAmount: (rank, _merit, kpi) => {
      // 基础：rank × 500万，KPI加成最高+50%
      const base = rank * 500;
      const kpiBonus = Math.round(base * (kpi / 200)); // kpi满分100 → 最高+50%
      return base + kpiBonus;
    },
    requireDesc: '无特殊要求，每年可申请1次',
    isAuto: false,
    color: '#1B4F8A',
    bgColor: '#0D2A4D',
  },
  {
    key: 'performance_reward',
    title: '政绩突出专项奖励',
    icon: '🏆',
    desc: '年度政绩考核优秀（≥90分），由上级党委发放绩效专项奖励资金，用于推进重点工作。每年限领1次。',
    cooldownField: 'performanceRewardLastYear',
    calcAmount: (rank, merit, _kpi) => {
      // 政绩90+满分；政绩越高奖励越多
      const perfBonus = Math.max(0, merit - 90) * rank * 80;
      return rank * 300 + perfBonus;
    },
    requireDesc: '需政绩积分 ≥ 90 分',
    meritReq: 90,
    isAuto: false,
    color: '#8B6914',
    bgColor: '#3D2E08',
  },
  {
    key: 'annual_budget',
    title: '年度例行预算拨付',
    icon: '📅',
    desc: '每年年初由同级财政部门按编制拨付路线专项工作经费，为固定收入来源，金额稳定可预期。每年自动拨付，需手动领取。',
    cooldownField: 'annualBudgetLastYear',
    calcAmount: (rank, _merit, _kpi) => {
      // 固定 = rank × 200万，省部级以上翻倍
      return rank >= 10 ? rank * 500 : rank * 200;
    },
    requireDesc: '每年自动到账，手动领取即可',
    isAuto: true,
    color: '#1A6B3A',
    bgColor: '#0A3320',
  },
];

/**
 * 计算路线KPI晋升加成分数（0-100）
 * 综合 lineKpiScore + 各维度表现，影响晋升概率
 */
export function calcLineKpiBonus(
  careerPath: string,
  lineKpiScore: number,
  meritPoints: number,
  moralValue: number,
  bossFavor: number,
): number {
  const pathWeights: Record<string, { kpi: number; merit: number; moral: number; favor: number }> = {
    party:       { kpi: 0.35, merit: 0.25, moral: 0.25, favor: 0.15 }, // 党务：KPI+道德最重
    discipline:  { kpi: 0.30, merit: 0.20, moral: 0.40, favor: 0.10 }, // 纪检：道德廉洁最重
    league:      { kpi: 0.30, merit: 0.30, moral: 0.20, favor: 0.20 }, // 团派：政绩+KPI并重
    government:  { kpi: 0.25, merit: 0.35, moral: 0.20, favor: 0.20 }, // 行政：政绩最重
  };
  const w = pathWeights[careerPath] ?? pathWeights.government;
  const kpiNorm  = Math.min(100, lineKpiScore);
  const meritN   = Math.min(100, meritPoints);
  const moralN   = Math.min(100, moralValue);
  const favorN   = Math.min(100, bossFavor);
  return Math.round(kpiNorm * w.kpi + meritN * w.merit + moralN * w.moral + favorN * w.favor);
}

/**
 * 路线专属高级职称（rank 10-15）
 * 返回该路线该职级的中文职位名称（用于 RANK_CONFIG name 覆盖显示）
 */
export const HIGH_RANK_TITLES: Record<string, Record<number, string>> = {
  government: {
    10: '副省长 / 省长助理',
    11: '省长 / 省执政委书记',
    12: '国务院部长 / 国务委员',
    13: '国务院副总理',
    14: '国务院总理',
    15: '国家主席 · 执政党总书记',
  },
  party: {
    10: '省委常委 / 省委副书记',
    11: '省委书记 / 省委政治局委员',
    12: '中央委员 / 中央政治局委员',
    13: '中央政治局常委',
    14: '中央委员会总书记',
    15: '执政党主席 · 最高领导人',
  },
  discipline: {
    10: '省纪委副书记 / 省监委副主任',
    11: '省纪委书记 / 省监委主任',
    12: '中央纪委委员 / 中央纪委副书记',
    13: '中央纪委书记',
    14: '国家监察委员会主任',
    15: '首席监察官 · 最高监察长',
  },
  league: {
    10: '省团委书记 / 省青联主席',
    11: '全国青联副主席 / 共青团中央书记处书记',
    12: '共青团中央副书记',
    13: '共青团中央书记 / 全国青联主席',
    14: '党中央青年工作委员会主任',
    15: '青年工作最高委员 · 全国政协副主席',
  },
};

/** 获取某路线某职级的专属显示名（rank10以下回退到通用RANK_CONFIG.name） */
export function getHighRankTitle(careerPath: string, rankLevel: number): string | null {
  if (rankLevel < 10) return null;
  return HIGH_RANK_TITLES[careerPath]?.[rankLevel] ?? null;
}
