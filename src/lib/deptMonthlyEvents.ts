// 部门专属月度随机事件库 + 军转干部专属剧情事件
// 每部门 3-5 个事件，每个事件含 2-3 个选择分支，分支效果影响城市指标与干部属性

export interface EventChoice {
  label: string;               // 选项文字（≤20字）
  icon?: string;               // 选项图标
  desc?: string;               // 选择后的结果描述
  /** 选择后记录到 lastEventChainKey，影响下月事件池 */
  chainKey?: string;
  /** 解锁此选项所需的最低人脉值（0=无限制） */
  minNetworkValue?: number;
  effects: Partial<{
    meritPoints: number;
    bossFavor: number;
    moralValue: number;
    fundBalance: number;       // 万元，正=增收，负=支出
    cityGdp: number;
    cityLivelihood: number;
    cityEcology: number;
    cityBusiness: number;
    securityIndex: number;
    abilityValue: number;
    healthValue: number;
    networkValue: number;      // 人脉值变化
    /** 军转专属：触发破格晋升弹窗 */
    triggerPromotion?: boolean;
  }>;
}

export interface DeptMonthlyEvent {
  id: string;
  /** 适用部门key（对应DeptKey）或 'military' 军转专属 */
  deptKey: string;
  title: string;
  icon: string;
  /** 剧情场景描述 */
  scenario: string;
  choices: EventChoice[];
  /** 月度触发概率 0-1 */
  triggerChance: number;
  /** 是否为军转专属重大事件（影响破格晋升） */
  isMilitarySpecial?: boolean;
  /**
   * 正面事件标志——高职级/高KPI时权重提升
   * true=正面事件，false/undefined=挑战性事件
   */
  isPositive?: boolean;
  /**
   * 连锁触发key：上月选项的 chainKey 必须与此值匹配才能触发
   * 空/undefined 表示普通事件，随机可触发
   */
  requiredChainKey?: string;
}

// ─────────────────────────────────────────────
//  公安局 — 治安事件
// ─────────────────────────────────────────────
const POLICE_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'police_1',
    deptKey: 'police',
    title: '辖区发生持刀伤人案',
    icon: '🔪',
    scenario: '今日凌晨，辖区某商业街发生持刀伤人案件，1人重伤。市局要求48小时内破案，舆论压力巨大。你如何应对？',
    triggerChance: 0.30,
    isPositive: false,
    choices: [
      {
        label: '紧急调兵破案',
        icon: '🚔',
        desc: '全员出动，48小时告破，民众大呼称快，上司满意',
        chainKey: 'police_solved_fast',
        effects: { securityIndex: 12, meritPoints: 15, bossFavor: 5, healthValue: -3, fundBalance: -5 },
      },
      {
        label: '常规侦办流程',
        icon: '📋',
        desc: '按流程侦办，72小时告破，舆论稍有不满但总体可控',
        effects: { securityIndex: 6, meritPoints: 8, bossFavor: 1 },
      },
      {
        label: '公开悬赏线索',
        icon: '📢',
        desc: '发布悬赏令，群众举报线索，一周内破案，民意支持度上升',
        chainKey: 'police_reward_notice',
        effects: { securityIndex: 8, cityLivelihood: 5, meritPoints: 10, fundBalance: -3, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'police_1_chain',
    deptKey: 'police',
    title: '速破案后省厅专项嘉奖',
    icon: '🏅',
    scenario: '上月快速侦破持刀案，引起省厅关注，发来专项通报表扬函，并追加安保经费支持，请回复落实。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'police_solved_fast',
    choices: [
      {
        label: '公开致谢并表彰队员',
        icon: '🎖️',
        desc: '鼓舞士气，队伍凝聚力大增，人脉积累+5',
        effects: { securityIndex: 5, meritPoints: 12, bossFavor: 4, networkValue: 5 },
      },
      {
        label: '低调接受经费支持',
        icon: '📦',
        desc: '专注业务，财力有所充实',
        effects: { fundBalance: 15, meritPoints: 8, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'police_1_chain_b',
    deptKey: 'police',
    title: '悬赏公告引来新案线索',
    icon: '📨',
    scenario: '上月发出悬赏公告后，市民反响热烈，本月又收到3份重要举报，其中一份涉及某黑恶势力窝点。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'police_reward_notice',
    choices: [
      {
        label: '立即组织突击行动',
        icon: '⚡',
        desc: '一举捣毁窝点，治安大幅提升，上司高度认可',
        effects: { securityIndex: 18, meritPoints: 20, bossFavor: 6, fundBalance: -8, healthValue: -2 },
      },
      {
        label: '移交刑侦队深入侦查',
        icon: '🔍',
        desc: '稳扎稳打，减少风险，政绩稳步增长',
        effects: { securityIndex: 10, meritPoints: 14, bossFavor: 3 },
      },
      {
        label: '借助人脉压低舆论风险',
        icon: '🤝',
        desc: '调动媒体关系，既破案又掌控舆情',
        minNetworkValue: 25,
        effects: { securityIndex: 14, meritPoints: 18, cityLivelihood: 4, bossFavor: 5, networkValue: -3 },
      },
    ],
  },
  {
    id: 'police_2',
    deptKey: 'police',
    title: '网络诈骗案激增',
    icon: '💻',
    scenario: '本月接报网络诈骗案件47起，损失超200万元，群众反映强烈。省厅下发指令，要求限期整治。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '成立反诈专班',
        icon: '🛡',
        desc: '专班成立，诈骗案发率下降40%，获省厅通报表扬',
        chainKey: 'police_anti_fraud_team',
        effects: { securityIndex: 15, meritPoints: 18, bossFavor: 4, fundBalance: -8, abilityValue: 1 },
      },
      {
        label: '联合银行预警拦截',
        icon: '🏦',
        desc: '建立资金预警机制，成本低，拦截效果立竿见影',
        effects: { securityIndex: 10, cityBusiness: 3, meritPoints: 12, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'police_2_chain',
    deptKey: 'police',
    title: '反诈专班成果被媒体报道',
    icon: '📰',
    scenario: '上月建立的反诈专班成效显著，省级媒体主动联系采访，这是一次提升知名度的好机会。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'police_anti_fraud_team',
    choices: [
      {
        label: '接受采访扩大影响',
        icon: '📡',
        desc: '宣传力度大，市民防诈意识提升，政绩与人脉双收',
        effects: { meritPoints: 15, cityLivelihood: 6, networkValue: 8, bossFavor: 4 },
      },
      {
        label: '婉拒曝光，低调办案',
        icon: '🔕',
        desc: '保持低调，专注执行，效率不受干扰',
        effects: { meritPoints: 8, securityIndex: 5, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'police_3',
    deptKey: 'police',
    title: '群体性聚集苗头',
    icon: '👥',
    scenario: '城郊某工厂拖欠工资，百余名工人情绪激动，有聚集上访苗头。需在事态激化前妥善处置。',
    triggerChance: 0.20,
    isPositive: false,
    choices: [
      {
        label: '联合劳动局调解',
        icon: '🤝',
        desc: '工资问题当月解决，工人满意，负面舆情消散',
        chainKey: 'police_labor_mediation',
        effects: { cityLivelihood: 10, meritPoints: 14, moralValue: 3, bossFavor: 3 },
      },
      {
        label: '警力布控维稳',
        icon: '🔒',
        desc: '强硬布控，事态暂时压住，但民众反感有所上升',
        effects: { securityIndex: 5, meritPoints: 5, cityLivelihood: -5, moralValue: -3, bossFavor: 1 },
      },
      {
        label: '协调企业立即补发',
        icon: '💰',
        desc: '当场开具工资补发承诺函，矛盾化解于萌芽',
        effects: { cityLivelihood: 8, meritPoints: 18, moralValue: 5, bossFavor: 5, fundBalance: -2 },
      },
    ],
  },
  {
    id: 'police_3_chain',
    deptKey: 'police',
    title: '劳动纠纷调解获省劳动厅认可',
    icon: '🌿',
    scenario: '上月联合劳动局成功调解劳资纠纷，事迹上报省劳动厅，对方来函希望推广经验。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'police_labor_mediation',
    choices: [
      {
        label: '参与经验推广研讨',
        icon: '🎤',
        desc: '省级平台露面，提升知名度，人脉网络扩大',
        effects: { meritPoints: 18, cityLivelihood: 5, networkValue: 10, bossFavor: 5 },
      },
      {
        label: '书面总结上报即可',
        icon: '📝',
        desc: '稳健处理，不显山不露水',
        effects: { meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'police_4',
    deptKey: 'police',
    title: '交通违法专项整治',
    icon: '🚦',
    scenario: '交通事故多发，上级要求开展为期一个月的交通违法专项整治，部分群众对严格执法有抵触情绪。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '严格执法不手软',
        icon: '⚖️',
        desc: '罚款增加，事故率下降，市民逐渐接受',
        effects: { securityIndex: 12, meritPoints: 10, cityLivelihood: 3, fundBalance: 5 },
      },
      {
        label: '宣传教育为主',
        icon: '📣',
        desc: '发放宣传资料，开展驾驶安全讲座，温和有效',
        effects: { securityIndex: 7, cityLivelihood: 5, meritPoints: 8, moralValue: 2 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  财政局 — 预算博弈事件
// ─────────────────────────────────────────────
const FINANCE_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'finance_1',
    deptKey: 'finance',
    title: '年度预算超支危机',
    icon: '📉',
    scenario: '本财年已过3/4，当前支出已达预算105%。若不压缩开支，年末将出现资金缺口，上级审计在即。',
    triggerChance: 0.28,
    isPositive: false,
    choices: [
      {
        label: '削减非关键支出',
        icon: '✂️',
        desc: '压缩行政经费，暂停部分项目，账面恢复健康',
        chainKey: 'finance_austerity',
        effects: { fundBalance: 30, meritPoints: 10, bossFavor: 3, cityLivelihood: -4 },
      },
      {
        label: '发行专项债补缺口',
        icon: '📜',
        desc: '短期弥补缺口，但利息增加未来财政压力',
        effects: { fundBalance: 50, meritPoints: 5, bossFavor: 1 },
      },
      {
        label: '加大税收征缴力度',
        icon: '🧾',
        desc: '向企业追缴历史欠税，补充财政，但营商环境略有影响',
        chainKey: 'finance_tax_drive',
        effects: { fundBalance: 40, cityBusiness: -5, meritPoints: 8, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'finance_1_chain_austerity',
    deptKey: 'finance',
    title: '节支成效获审计肯定',
    icon: '✅',
    scenario: '上月压缩开支举措得到上级审计部门通报表扬，要求全市推广经验，请尽快形成材料。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'finance_austerity',
    choices: [
      {
        label: '形成标准化节支规范',
        icon: '📋',
        desc: '机制固化，未来预算管控更精准，人脉扩展',
        effects: { meritPoints: 18, bossFavor: 5, networkValue: 6, abilityValue: 1 },
      },
      {
        label: '上报材料即可，不铺开推广',
        icon: '📁',
        desc: '稳健保守，政绩积累适中',
        effects: { meritPoints: 10, bossFavor: 2, fundBalance: 5 },
      },
    ],
  },
  {
    id: 'finance_1_chain_tax',
    deptKey: 'finance',
    title: '企业抗拒税务追缴引发矛盾',
    icon: '⚠️',
    scenario: '上月加大征缴力度，部分企业联合施压，在市人大提交联名申诉，局面需妥善处理。',
    triggerChance: 1.0,
    isPositive: false,
    requiredChainKey: 'finance_tax_drive',
    choices: [
      {
        label: '联合商务局协调，分批补缴',
        icon: '🤝',
        desc: '化解对抗，达成分期协议，税款如期到位',
        effects: { fundBalance: 25, cityBusiness: 5, meritPoints: 15, moralValue: 3, bossFavor: 3 },
      },
      {
        label: '借助人脉向人大解释',
        icon: '🗣️',
        desc: '疏通人大关系，申诉不了了之，业务继续推进',
        minNetworkValue: 30,
        effects: { fundBalance: 35, meritPoints: 12, bossFavor: 4, networkValue: -5 },
      },
      {
        label: '坚持依法征缴，不妥协',
        icon: '⚖️',
        desc: '强硬立场，最终胜诉，但与企业关系受损',
        effects: { fundBalance: 40, moralValue: 8, meritPoints: 10, cityBusiness: -8, bossFavor: 1 },
      },
    ],
  },
  {
    id: 'finance_2',
    deptKey: 'finance',
    title: '上级专项转移支付到账',
    icon: '💵',
    scenario: '省财政厅批复本年度专项转移支付资金1200万元，用途为农村基础设施。如何分配使用？',
    triggerChance: 0.22,
    isPositive: true,
    choices: [
      {
        label: '全部用于农村道路',
        icon: '🛤️',
        desc: '道路大幅改善，农民满意度飙升，媒体正面报道',
        chainKey: 'finance_rural_road',
        effects: { cityLivelihood: 12, cityGdp: 5, meritPoints: 20, bossFavor: 3, fundBalance: 80 },
      },
      {
        label: '农业基础设施为主，余额备用',
        icon: '🌾',
        desc: '灵活运用，兼顾短期和长期需求',
        effects: { cityLivelihood: 8, cityGdp: 3, meritPoints: 15, fundBalance: 100 },
      },
    ],
  },
  {
    id: 'finance_2_chain',
    deptKey: 'finance',
    title: '农村道路竣工典礼邀请',
    icon: '🎉',
    scenario: '上月专项资金建设的农村公路竣工，村民自发组织典礼，省媒体请求随行采访报道。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'finance_rural_road',
    choices: [
      {
        label: '出席典礼并接受采访',
        icon: '📸',
        desc: '正面形象传播全省，人脉与政绩双丰收',
        effects: { meritPoints: 22, cityLivelihood: 8, networkValue: 10, bossFavor: 6 },
      },
      {
        label: '派副职出席，自己低调',
        icon: '🎗️',
        desc: '稳健处理，政绩平稳增长',
        effects: { meritPoints: 12, cityLivelihood: 5, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'finance_3',
    deptKey: 'finance',
    title: '某企业要求减免税费',
    icon: '🏭',
    scenario: '辖区某重点纳税企业以经营困难为由，申请减免今年税费180万元，并暗示若不批准可能迁离。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '依法拒绝，按章征收',
        icon: '⚖️',
        desc: '企业未迁离，税收照收，但关系有所疏远',
        effects: { fundBalance: 20, moralValue: 5, meritPoints: 8, cityBusiness: -3 },
      },
      {
        label: '部分减免以留住企业',
        icon: '🤝',
        desc: '企业稳定，带动就业，财政少收80万',
        chainKey: 'finance_tax_relief',
        effects: { cityGdp: 6, cityBusiness: 8, meritPoints: 12, bossFavor: 2, fundBalance: -8 },
      },
      {
        label: '要求审计后再决定',
        icon: '🔍',
        desc: '核查账目，发现企业实际盈利，拒绝申请',
        effects: { fundBalance: 18, moralValue: 8, meritPoints: 15, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'finance_3_chain',
    deptKey: 'finance',
    title: '获减免企业大幅扩产',
    icon: '🏭',
    scenario: '上月获得税费减免的企业经营好转，宣布追加投资5000万元扩大产能，主动感谢政府支持。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'finance_tax_relief',
    choices: [
      {
        label: '联合招商局发布投资成功案例',
        icon: '📣',
        desc: '吸引更多企业，营商环境口碑大升，人脉拓展',
        effects: { cityBusiness: 12, cityGdp: 8, meritPoints: 20, networkValue: 8, bossFavor: 5 },
      },
      {
        label: '跟踪纳税额回补情况',
        icon: '📊',
        desc: '确保减免资金如期回收，财政账面良好',
        effects: { fundBalance: 30, meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  发改委 — 项目审批事件
// ─────────────────────────────────────────────
const NDRC_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'ndrc_1',
    deptKey: 'ndrc',
    title: '重大项目环评争议',
    icon: '🏗️',
    scenario: '某投资30亿元的化工园区项目已完成立项，但环评报告显示周边居民存在健康隐患，开发商施压要求加快审批。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '暂停审批，要求整改',
        icon: '🛑',
        desc: '项目延期，开发商不满，但守住了环保底线，获民众称赞',
        chainKey: 'ndrc_eco_block',
        effects: { cityEcology: 15, moralValue: 10, meritPoints: 8, bossFavor: -3, cityBusiness: -5 },
      },
      {
        label: '有条件批准（限制排污标准）',
        icon: '📋',
        desc: '项目落地，就业增加，环保措施跟上',
        chainKey: 'ndrc_cond_approve',
        effects: { cityGdp: 12, cityBusiness: 8, meritPoints: 18, bossFavor: 4, cityEcology: -3 },
      },
      {
        label: '要求第三方重新评估',
        icon: '🔬',
        desc: '谨慎处理，延缓3个月，平衡发展与环保',
        effects: { cityGdp: 5, cityEcology: 5, meritPoints: 12, bossFavor: 1 },
      },
    ],
  },
  {
    id: 'ndrc_1_chain_eco',
    deptKey: 'ndrc',
    title: '坚持环保获省厅通报表扬',
    icon: '🌱',
    scenario: '上月暂停高污染项目后，省生态厅专程来函表扬，并优先推送一个低碳产业项目落地资格。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'ndrc_eco_block',
    choices: [
      {
        label: '积极引进低碳产业项目',
        icon: '♻️',
        desc: '绿色GDP双增，形象大幅提升，人脉扩展',
        effects: { cityGdp: 10, cityEcology: 8, meritPoints: 22, networkValue: 8, bossFavor: 5 },
      },
      {
        label: '暂缓，继续观察市场',
        icon: '🔍',
        desc: '稳健操作，政绩小幅增长',
        effects: { meritPoints: 10, cityEcology: 4, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'ndrc_1_chain_cond',
    deptKey: 'ndrc',
    title: '有条件批准后排污超标举报',
    icon: '⚠️',
    scenario: '上月批准的化工园区开工后，环保部门收到周边居民举报，称排污浓度超标，需要介入处理。',
    triggerChance: 1.0,
    isPositive: false,
    requiredChainKey: 'ndrc_cond_approve',
    choices: [
      {
        label: '责令停工整改达标',
        icon: '🛑',
        desc: '项目暂停整改，生态恢复，但经济损失短暂',
        effects: { cityEcology: 12, moralValue: 8, meritPoints: 10, cityGdp: -5, bossFavor: 1 },
      },
      {
        label: '借助人脉协调媒体压热度',
        icon: '🤝',
        desc: '舆论降温，企业继续生产，生态问题延后处理',
        minNetworkValue: 35,
        effects: { cityBusiness: 5, meritPoints: 8, bossFavor: 3, networkValue: -6, cityEcology: -5, moralValue: -3 },
      },
      {
        label: '联合环保局出具整改期限',
        icon: '📋',
        desc: '给企业3个月整改期，监督落实，折中处理',
        effects: { cityEcology: 5, meritPoints: 14, bossFavor: 3, cityGdp: 3 },
      },
    ],
  },
  {
    id: 'ndrc_2',
    deptKey: 'ndrc',
    title: 'GDP增速目标压力',
    icon: '📊',
    scenario: '前三季度GDP增速仅4.2%，低于年度目标5.5%，市委主要领导约谈，要求第四季度发力冲刺。',
    triggerChance: 0.30,
    isPositive: false,
    choices: [
      {
        label: '启动基础设施投资拉动',
        icon: '🏛',
        desc: '政府兜底投资，GDP冲上5.3%，但财政压力加大',
        chainKey: 'ndrc_infra_push',
        effects: { cityGdp: 15, meritPoints: 20, bossFavor: 6, fundBalance: -50 },
      },
      {
        label: '招商引资冲季末',
        icon: '🤝',
        desc: '签约3个项目，预期带动增速0.8个百分点',
        effects: { cityGdp: 8, cityBusiness: 10, meritPoints: 15, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'ndrc_2_chain',
    deptKey: 'ndrc',
    title: '基建项目超额完成引关注',
    icon: '🏗️',
    scenario: '上月基建投资拉动GDP超预期，引来国家发改委研究员来市调研，希望总结推广经验。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'ndrc_infra_push',
    choices: [
      {
        label: '热情接待，汇报成绩',
        icon: '🎤',
        desc: '国家级平台曝光，人脉大幅提升，政绩亮眼',
        effects: { meritPoints: 25, networkValue: 12, bossFavor: 7, cityGdp: 5 },
      },
      {
        label: '低调汇报，不扩大化',
        icon: '📄',
        desc: '稳健应对，避免过度关注带来压力',
        effects: { meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'ndrc_3',
    deptKey: 'ndrc',
    title: '土地指标告急',
    icon: '📍',
    scenario: '当年新增建设用地指标已用尽，多个项目排队等候，省厅追加指标申请难以审批，如何破局？',
    triggerChance: 0.20,
    isPositive: false,
    choices: [
      {
        label: '盘活存量闲置土地',
        icon: '🔄',
        desc: '处置8宗闲置地，释放指标，项目顺利推进',
        effects: { cityGdp: 8, meritPoints: 15, bossFavor: 4, abilityValue: 1 },
      },
      {
        label: '优先保障重大项目',
        icon: '⭐',
        desc: '将剩余指标集中用于最高产值项目',
        effects: { cityGdp: 12, cityBusiness: 5, meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  教育局 — 教育治理事件
// ─────────────────────────────────────────────
const EDUCATION_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'edu_1',
    deptKey: 'education',
    title: '校园霸凌事件曝光',
    icon: '📢',
    scenario: '本市某中学校园霸凌视频在网络疯传，家长强烈谴责，省教育厅要求限时整改。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '立即处分涉事学生，校长问责',
        icon: '⚖️',
        desc: '迅速处置，舆论平息，树立零容忍态度',
        chainKey: 'edu_bully_zero',
        effects: { cityLivelihood: 8, meritPoints: 15, bossFavor: 4, moralValue: 3 },
      },
      {
        label: '建立反霸凌长效机制',
        icon: '🛡',
        desc: '治标更治本，获家长和媒体正面评价',
        effects: { cityLivelihood: 12, meritPoints: 18, bossFavor: 3, moralValue: 5, fundBalance: -5 },
      },
      {
        label: '大事化小，内部处理',
        icon: '🤐',
        desc: '暂时平息，但后续若再出事风险更大',
        effects: { meritPoints: -5, moralValue: -8, bossFavor: -2 },
      },
    ],
  },
  {
    id: 'edu_1_chain',
    deptKey: 'education',
    title: '零容忍获省教育督查肯定',
    icon: '🏅',
    scenario: '上月处置霸凌事件果断，省教育督查组来校调研，赞扬本市校园安全治理经验，建议全省推广。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'edu_bully_zero',
    choices: [
      {
        label: '参与全省经验推广交流',
        icon: '🎤',
        desc: '省级平台露面，人脉网络大幅扩展',
        effects: { meritPoints: 20, cityLivelihood: 8, networkValue: 10, bossFavor: 6 },
      },
      {
        label: '书面总结上报，不参会',
        icon: '📝',
        desc: '保持低调，政绩稳步增长',
        effects: { meritPoints: 12, cityLivelihood: 4, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'edu_2',
    deptKey: 'education',
    title: '优质教师流失危机',
    icon: '👨‍🏫',
    scenario: '本市骨干教师赴大城市高薪挖角，本学期已离职12人，农村学校教师缺口尤其突出。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '大幅提高教师绩效工资',
        icon: '💰',
        desc: '留住多数骨干教师，财政支出增加，民众满意',
        chainKey: 'edu_teacher_raise',
        effects: { cityLivelihood: 10, meritPoints: 18, bossFavor: 3, fundBalance: -20 },
      },
      {
        label: '引进外地优秀教师补充',
        icon: '🌟',
        desc: '弥补缺口，整体教学质量保持',
        effects: { cityLivelihood: 6, meritPoints: 12, bossFavor: 2, fundBalance: -10 },
      },
    ],
  },
  {
    id: 'edu_2_chain',
    deptKey: 'education',
    title: '提薪举措获教师工会感谢',
    icon: '🎗️',
    scenario: '上月教师薪资大幅提升，教师工会主席亲自来函感谢，媒体争相报道，成为全省标杆。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'edu_teacher_raise',
    choices: [
      {
        label: '接受媒体采访推广经验',
        icon: '📺',
        desc: '省级正面报道，知名度大升，人脉扩展',
        effects: { meritPoints: 18, cityLivelihood: 6, networkValue: 8, bossFavor: 5 },
      },
      {
        label: '继续追加农村教师补贴',
        icon: '🌾',
        desc: '补全短板，城乡教育差距缩小',
        effects: { cityLivelihood: 10, meritPoints: 14, bossFavor: 4, fundBalance: -10 },
      },
    ],
  },
  {
    id: 'edu_3',
    deptKey: 'education',
    title: '高考移民举报',
    icon: '🎓',
    scenario: '收到举报，辖区有数十名外省考生通过虚假户籍参加本地高考，波及本地生利益，家长群情激奋。',
    triggerChance: 0.18,
    isPositive: false,
    choices: [
      {
        label: '彻查户籍，核实处理',
        icon: '🔍',
        desc: '查处17人，维护本地考生权益，获广泛好评',
        effects: { cityLivelihood: 10, moralValue: 8, meritPoints: 15, bossFavor: 4 },
      },
      {
        label: '上报省厅统一处理',
        icon: '📤',
        desc: '规避直接矛盾，但进度较慢',
        effects: { meritPoints: 8, bossFavor: 2 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  卫健局 — 公共卫生事件
// ─────────────────────────────────────────────
const HEALTH_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'health_1',
    deptKey: 'health2',
    title: '医院急救资源告急',
    icon: '🚑',
    scenario: '节假日期间急诊量暴增，市区三家医院急救床位均已爆满，有患者在走廊等候，媒体开始关注。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '启用应急备用床位',
        icon: '🏥',
        desc: '临时扩充急救能力，缓解压力，民众感谢',
        chainKey: 'health_emergency_bed',
        effects: { cityLivelihood: 12, meritPoints: 15, bossFavor: 3, fundBalance: -10 },
      },
      {
        label: '分流至周边县市医院',
        icon: '🚌',
        desc: '协调转运，减轻本市压力，但部分患者路途增加',
        effects: { cityLivelihood: 6, meritPoints: 8, bossFavor: 1 },
      },
      {
        label: '紧急采购医疗设备',
        icon: '💊',
        desc: '根本解决问题，设备到位，长期提升医疗能力',
        chainKey: 'health_equip_invest',
        effects: { cityLivelihood: 15, meritPoints: 20, bossFavor: 4, fundBalance: -30 },
      },
    ],
  },
  {
    id: 'health_1_chain_bed',
    deptKey: 'health2',
    title: '急救扩容获省卫健委点赞',
    icon: '🏅',
    scenario: '上月应急扩充床位的举措，被省卫健委作为典型案例推广，邀请你参加全省医疗应急管理研讨会。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'health_emergency_bed',
    choices: [
      {
        label: '参加研讨会并发言分享',
        icon: '🎤',
        desc: '省级平台露面，医疗系统人脉大幅拓展',
        effects: { meritPoints: 18, cityLivelihood: 5, networkValue: 10, bossFavor: 5 },
      },
      {
        label: '派副职代为参会',
        icon: '👤',
        desc: '稳健处理，政绩正常积累',
        effects: { meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'health_1_chain_equip',
    deptKey: 'health2',
    title: '新医疗设备运抵引关注',
    icon: '🏥',
    scenario: '上月采购的先进医疗设备到位，省级媒体来拍摄专题报道，当地群众纷纷点赞。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'health_equip_invest',
    choices: [
      {
        label: '配合拍摄并组织开放日',
        icon: '📸',
        desc: '市民信任大增，媒体正面报道，政绩突出',
        effects: { cityLivelihood: 10, meritPoints: 22, bossFavor: 6, networkValue: 6 },
      },
      {
        label: '低调投入使用',
        icon: '🔧',
        desc: '扎实干活，口碑内部积累',
        effects: { cityLivelihood: 7, meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'health_2',
    deptKey: 'health2',
    title: '食品安全事故',
    icon: '🍱',
    scenario: '辖区某学校食堂发生集体食物中毒，53名学生就医，家长聚集校门，舆情急速发酵。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '第一时间发布公告处置',
        icon: '📢',
        desc: '透明应对，全力救治，舆情迅速平息',
        effects: { cityLivelihood: 8, moralValue: 6, meritPoints: 18, bossFavor: 5 },
      },
      {
        label: '封锁消息，悄然处理',
        icon: '🤐',
        desc: '短期压住，但后续一旦泄露后果严重',
        effects: { meritPoints: -10, moralValue: -12, bossFavor: -5, cityLivelihood: -8 },
      },
    ],
  },
  {
    id: 'health_3',
    deptKey: 'health2',
    title: '流感季来袭',
    icon: '🤒',
    scenario: '进入流感高峰期，辖区多所学校出现聚集性病例，卫生防疫部门要求提前应对。',
    triggerChance: 0.28,
    isPositive: false,
    choices: [
      {
        label: '全面推进流感疫苗接种',
        icon: '💉',
        desc: '接种率85%，流感季平稳度过，防控成效显著',
        effects: { cityLivelihood: 10, meritPoints: 14, bossFavor: 3, fundBalance: -15, healthValue: 3 },
      },
      {
        label: '加强学校监测预警',
        icon: '📊',
        desc: '早发现早隔离，控制传播，成本较低',
        effects: { cityLivelihood: 7, meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  农业局 — 农业事件
// ─────────────────────────────────────────────
const AGRICULTURE_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'ag_1',
    deptKey: 'agriculture',
    title: '农作物病虫害爆发',
    icon: '🐛',
    scenario: '辖区水稻主产区爆发稻飞虱虫害，波及耕地面积15万亩，若不及时处置将导致粮食减产30%以上。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '紧急调拨农药物资统防',
        icon: '💊',
        desc: '联防联治，减产控制在5%以内，农民情绪稳定',
        chainKey: 'ag_pest_unified',
        effects: { cityGdp: 5, cityLivelihood: 8, meritPoints: 20, bossFavor: 5, fundBalance: -15 },
      },
      {
        label: '建议农民自行购药防治',
        icon: '🌾',
        desc: '部分农民反应迟缓，最终减产约20%',
        effects: { cityGdp: -5, cityLivelihood: -6, meritPoints: -5, bossFavor: -3 },
      },
      {
        label: '申请上级救灾资金',
        icon: '📤',
        desc: '获批800万救灾补贴，配合防治，效果良好',
        chainKey: 'ag_pest_subsidy',
        effects: { cityGdp: 3, cityLivelihood: 10, meritPoints: 15, fundBalance: 80, bossFavor: 4 },
      },
    ],
  },
  {
    id: 'ag_1_chain_unified',
    deptKey: 'agriculture',
    title: '统防统治经验被省农业厅采纳',
    icon: '🌾',
    scenario: '上月统一组织的病虫害防治效果出色，省农业厅来函希望在全省推广本市经验。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'ag_pest_unified',
    choices: [
      {
        label: '参与省级推广交流',
        icon: '🎤',
        desc: '省级平台露面，人脉扩展，政绩突出',
        effects: { meritPoints: 20, cityLivelihood: 6, networkValue: 10, bossFavor: 6 },
      },
      {
        label: '书面上报，继续专注工作',
        icon: '📄',
        desc: '低调处理，政绩稳步增长',
        effects: { meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'ag_1_chain_subsidy',
    deptKey: 'agriculture',
    title: '救灾补贴来后农民要求追加',
    icon: '📋',
    scenario: '上月争取到补贴后，部分农民认为补贴标准偏低，联名请求追加，你如何应对？',
    triggerChance: 1.0,
    isPositive: false,
    requiredChainKey: 'ag_pest_subsidy',
    choices: [
      {
        label: '再次向上级争取追加',
        icon: '📤',
        desc: '为民请命，若成功则民心大获，但需消耗人情',
        minNetworkValue: 20,
        effects: { cityLivelihood: 10, meritPoints: 18, bossFavor: 3, networkValue: -4, fundBalance: 50 },
      },
      {
        label: '按现有标准执行，解释政策',
        icon: '📢',
        desc: '向农民解释政策，维持既有安排',
        effects: { meritPoints: 8, moralValue: 3, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'ag_2',
    deptKey: 'agriculture',
    title: '旱情持续，灌溉告急',
    icon: '☀️',
    scenario: '持续高温致辖区多条河流水位下降，农业灌溉用水严重不足，主产粮区告急。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '启动抗旱应急预案',
        icon: '🚿',
        desc: '调水抗旱，保住7成粮食产量',
        effects: { cityGdp: 3, cityLivelihood: 10, meritPoints: 18, bossFavor: 4, fundBalance: -20 },
      },
      {
        label: '推广节水灌溉技术',
        icon: '🌊',
        desc: '长效解决方案，但本季损失较大',
        effects: { cityGdp: -2, cityLivelihood: 5, meritPoints: 12, abilityValue: 1 },
      },
    ],
  },
  {
    id: 'ag_3',
    deptKey: 'agriculture',
    title: '农产品滞销危机',
    icon: '📦',
    scenario: '本季大量新鲜蔬菜积压滞销，菜农损失惨重，有人准备进城上访。',
    triggerChance: 0.20,
    isPositive: false,
    choices: [
      {
        label: '联系电商平台助农直播',
        icon: '📱',
        desc: '开展助农直播，一周内滞销蔬菜销出80%',
        chainKey: 'ag_ecommerce_live',
        effects: { cityLivelihood: 12, cityGdp: 5, meritPoints: 18, bossFavor: 4, abilityValue: 1 },
      },
      {
        label: '组织机关食堂集中采购',
        icon: '🛒',
        desc: '解决部分积压，菜农稍感宽慰',
        effects: { cityLivelihood: 6, meritPoints: 10, moralValue: 4, fundBalance: -5 },
      },
      {
        label: '争取省级农产品补贴',
        icon: '💰',
        desc: '获批补贴资金120万，菜农损失基本弥补',
        effects: { cityLivelihood: 10, meritPoints: 15, bossFavor: 3, fundBalance: 100 },
      },
    ],
  },
  {
    id: 'ag_3_chain',
    deptKey: 'agriculture',
    title: '助农直播走红，平台邀请续合作',
    icon: '📱',
    scenario: '上月助农直播大获成功，视频全网播放量超500万，电商平台邀请签署长期合作协议。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'ag_ecommerce_live',
    choices: [
      {
        label: '签署长期助农合作协议',
        icon: '🤝',
        desc: '农产品销路稳定，农民收入持续增长，人脉大幅扩展',
        effects: { cityLivelihood: 15, cityGdp: 8, meritPoints: 22, networkValue: 12, bossFavor: 6 },
      },
      {
        label: '此次为一次性活动',
        icon: '📋',
        desc: '不签长期协议，但政绩已有积累',
        effects: { cityLivelihood: 6, meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  环保局 — 生态事件
// ─────────────────────────────────────────────
const ECOLOGY_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'eco_1',
    deptKey: 'ecology',
    title: '河流污染举报',
    icon: '🌊',
    scenario: '辖区某河流水体变色变臭，周边居民举报多次无果，此事被媒体曝光，引发舆论关注。',
    triggerChance: 0.28,
    isPositive: false,
    choices: [
      {
        label: '立即排查溯源，追责处罚',
        icon: '🔍',
        desc: '24小时内锁定排污企业，重罚并责令整改，民众拍手称快',
        chainKey: 'eco_pollution_punish',
        effects: { cityEcology: 15, moralValue: 8, meritPoints: 18, bossFavor: 4, cityBusiness: -3 },
      },
      {
        label: '责令企业自查自纠',
        icon: '📋',
        desc: '推诿时间较长，舆情持续，最终仍需处理',
        effects: { cityEcology: 5, meritPoints: 5, moralValue: -5, bossFavor: -2 },
      },
      {
        label: '启动生态修复应急方案',
        icon: '🌿',
        desc: '投入修复资金，同步追责，两手抓两手硬',
        chainKey: 'eco_restoration',
        effects: { cityEcology: 18, meritPoints: 20, moralValue: 6, bossFavor: 3, fundBalance: -25 },
      },
    ],
  },
  {
    id: 'eco_1_chain_punish',
    deptKey: 'ecology',
    title: '追责企业获国家生态奖项提名',
    icon: '🏅',
    scenario: '上月依法重罚排污企业，引发全国关注，国家生态环境部门来函提名参评"年度执法典型案例"。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'eco_pollution_punish',
    choices: [
      {
        label: '积极参评，配合材料报送',
        icon: '📋',
        desc: '获奖后知名度大幅提升，人脉扩展，官员形象极佳',
        effects: { meritPoints: 25, cityEcology: 5, networkValue: 15, bossFavor: 8 },
      },
      {
        label: '婉拒，低调处理',
        icon: '🔕',
        desc: '稳健应对，不过度曝光',
        effects: { meritPoints: 12, bossFavor: 3, moralValue: 3 },
      },
    ],
  },
  {
    id: 'eco_1_chain_restore',
    deptKey: 'ecology',
    title: '生态修复完成，媒体正面报道',
    icon: '🌱',
    scenario: '上月启动的应急修复方案效果显著，河流水质恢复，省级媒体来拍摄专题纪录片。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'eco_restoration',
    choices: [
      {
        label: '配合拍摄，公开成果',
        icon: '📹',
        desc: '正面形象全面传播，市民满意，人脉大增',
        effects: { cityEcology: 8, cityLivelihood: 6, meritPoints: 20, networkValue: 10, bossFavor: 6 },
      },
      {
        label: '谢绝采访，聚焦后续工作',
        icon: '🔧',
        desc: '专注持续改善，生态指数稳步提升',
        effects: { cityEcology: 10, meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'eco_2',
    deptKey: 'ecology',
    title: '空气质量超标警报',
    icon: '🌫️',
    scenario: 'PM2.5指数连续三天超过国家标准的1.5倍，省生态厅下发橙色预警，要求本周内改善。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '限产限工限行',
        icon: '🚫',
        desc: '临时限制，空气质量迅速改善，但企业有怨言',
        effects: { cityEcology: 18, cityGdp: -5, meritPoints: 12, bossFavor: 2 },
      },
      {
        label: '倡导绿色出行，加强工地管控',
        icon: '🚲',
        desc: '柔性措施，慢慢改善，避免经济损失',
        effects: { cityEcology: 10, cityLivelihood: 4, meritPoints: 10, bossFavor: 1 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  市场监管局 — 营商事件
// ─────────────────────────────────────────────
const MARKET_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'market_1',
    deptKey: 'market',
    title: '假冒伪劣产品泛滥',
    icon: '🚫',
    scenario: '节前市场检查发现大量假冒品牌商品，涉及食品、药品、日用品，问题商贩集中在某农贸市场。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '突击检查，当场没收销毁',
        icon: '⚡',
        desc: '雷霆行动，捣毁假货窝点，市场秩序明显改善',
        effects: { cityBusiness: 8, cityLivelihood: 10, moralValue: 5, meritPoints: 18, bossFavor: 4 },
      },
      {
        label: '设置投诉热线，鼓励举报',
        icon: '📞',
        desc: '发动群众力量，长效机制建立，但短期效果慢',
        effects: { cityBusiness: 4, cityLivelihood: 6, meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'market_2',
    deptKey: 'market',
    title: '价格垄断举报',
    icon: '📊',
    scenario: '辖区燃气公司涉嫌滥用市场支配地位，擅自提价23%，居民怨声载道，多人联名举报。',
    triggerChance: 0.20,
    isPositive: false,
    choices: [
      {
        label: '立案调查，责令降价',
        icon: '⚖️',
        desc: '燃气公司被罚80万，价格回归合理，居民叫好',
        effects: { cityLivelihood: 12, moralValue: 6, meritPoints: 18, bossFavor: 5, cityBusiness: -3 },
      },
      {
        label: '协调双方协商定价',
        icon: '🤝',
        desc: '价格降回8%，各方勉强接受',
        effects: { cityLivelihood: 6, meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'market_3',
    deptKey: 'market',
    title: '营业执照审批压力',
    icon: '📋',
    scenario: '上级推进"证照分离"改革，要求本月完成全部存量证照数字化，工作量是平时的3倍。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '加班加点，按期完成',
        icon: '⏰',
        desc: '任务提前完成，获省厅通报表扬，干部辛苦了',
        effects: { cityBusiness: 10, meritPoints: 15, bossFavor: 5, healthValue: -5 },
      },
      {
        label: '申请延期，稳妥推进',
        icon: '📅',
        desc: '质量有保障，但进度落后同级',
        effects: { cityBusiness: 5, meritPoints: 8, bossFavor: -1 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  税务局 — 税收事件
// ─────────────────────────────────────────────
const TAX_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'tax_1',
    deptKey: 'tax',
    title: '大型企业偷税漏税核查',
    icon: '🧾',
    scenario: '稽查大数据发现辖区某上市企业有隐匿收入、虚开发票嫌疑，涉案金额预估超600万元。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '立即启动税务稽查',
        icon: '🔍',
        desc: '追缴税款610万加罚款，树立了税法权威',
        effects: { fundBalance: 60, moralValue: 8, meritPoints: 20, bossFavor: 5, cityBusiness: -5 },
      },
      {
        label: '约谈企业主动补缴',
        icon: '🤝',
        desc: '企业主动补缴560万，维系了合作关系',
        effects: { fundBalance: 50, meritPoints: 15, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'tax_2',
    deptKey: 'tax',
    title: '税收任务缺口',
    icon: '📉',
    scenario: '距年底还有两个月，全年税收完成率仅82%，与任务目标差距较大，上级施压明显。',
    triggerChance: 0.28,
    isPositive: false,
    choices: [
      {
        label: '集中清缴历史欠税',
        icon: '⚡',
        desc: '追缴历年欠税1200万，年终顺利完成任务',
        effects: { fundBalance: 100, meritPoints: 18, bossFavor: 5 },
      },
      {
        label: '吸引新企业入驻增税源',
        icon: '🏭',
        desc: '引进两家企业，增加税源，但短期贡献有限',
        effects: { cityGdp: 8, cityBusiness: 8, meritPoints: 12, bossFavor: 2 },
      },
      {
        label: '向上级如实汇报，争取调整目标',
        icon: '📊',
        desc: '如实汇报，目标略作调整，保住诚信形象',
        effects: { meritPoints: 8, moralValue: 5, bossFavor: 1 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  住建局 — 城市建设事件
// ─────────────────────────────────────────────
const URBAN_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'urban_1',
    deptKey: 'urban',
    title: '在建工地安全事故',
    icon: '⚠️',
    scenario: '辖区某在建高层工地发生脚手架坍塌，2名工人受伤，安监部门要求全市工地停工自查。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '立即停工，全市安全大检查',
        icon: '🔍',
        desc: '排查安全隐患152处，整改后复工，树立安全生产红线',
        effects: { cityLivelihood: 6, moralValue: 8, meritPoints: 15, bossFavor: 3, cityGdp: -3, fundBalance: -5 },
      },
      {
        label: '涉事工地停工，其余正常',
        icon: '📋',
        desc: '精准处置，平衡安全和进度',
        effects: { cityLivelihood: 4, meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'urban_2',
    deptKey: 'urban',
    title: '老旧小区改造民意分歧',
    icon: '🏘',
    scenario: '计划改造的老旧小区中，30%居民反对拆除违章建筑，担忧停车位减少，改造工作受阻。',
    triggerChance: 0.20,
    isPositive: false,
    choices: [
      {
        label: '召开居民大会协商方案',
        icon: '🗣',
        desc: '充分协商，方案获70%居民支持，改造顺利推进',
        effects: { cityLivelihood: 10, meritPoints: 15, moralValue: 5, bossFavor: 3 },
      },
      {
        label: '依法强制推进改造',
        icon: '📜',
        desc: '工程加速完成，但部分居民不满，信访增加',
        effects: { cityLivelihood: 5, meritPoints: 10, moralValue: -5, bossFavor: 1 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  人事局 — 干部管理事件
// ─────────────────────────────────────────────
const PERSONNEL_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'per_1',
    deptKey: 'personnel',
    title: '干部带病提拔举报',
    icon: '📨',
    scenario: '收到匿名举报信，称即将提拔的某科级干部生活作风有问题，上级要求核实。如何处置？',
    triggerChance: 0.20,
    isPositive: false,
    choices: [
      {
        label: '认真核实，暂缓提拔',
        icon: '🔍',
        desc: '核查属实，提拔暂停，树立了公正用人导向',
        effects: { moralValue: 10, meritPoints: 12, bossFavor: 4 },
      },
      {
        label: '不予理会，照常提拔',
        icon: '🚫',
        desc: '若后续坐实则影响极大，存在风险',
        effects: { meritPoints: -8, moralValue: -10, bossFavor: -4 },
      },
      {
        label: '责成纪检介入核查',
        icon: '⚖️',
        desc: '程序规范，结果公正，此后无后患',
        effects: { moralValue: 8, meritPoints: 15, bossFavor: 5 },
      },
    ],
  },
  {
    id: 'per_2',
    deptKey: 'personnel',
    title: '年终考核争议',
    icon: '📊',
    scenario: '年终干部考核中，某副科长对"基本称职"评级不满，当场拍桌，扬言申诉，现场氛围紧张。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '坚守标准，告知申诉渠道',
        icon: '⚖️',
        desc: '坚持原则，按程序处理，评级有据可查',
        effects: { moralValue: 6, meritPoints: 10, bossFavor: 3 },
      },
      {
        label: '私下沟通，调整为称职',
        icon: '🤝',
        desc: '息事宁人，但影响考核公信力',
        effects: { meritPoints: -5, moralValue: -6, bossFavor: -2 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  招商局 — 招商引资事件
// ─────────────────────────────────────────────
const INVEST_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'inv_1',
    deptKey: 'invest',
    title: '外资谈判破裂风险',
    icon: '🤝',
    scenario: '与韩国某电子企业谈判已历时3个月，对方突然提出要求追加10亩建设用地，超出原定方案，谈判濒临破裂。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '追加用地，争取签约',
        icon: '📍',
        desc: '项目落地，带动就业3000人，GDP贡献显著',
        effects: { cityGdp: 15, cityBusiness: 10, meritPoints: 25, bossFavor: 6, fundBalance: -20 },
      },
      {
        label: '坚守方案，据理拒绝',
        icon: '🚫',
        desc: '谈判破裂，损失一个大项目，但节省用地资源',
        effects: { cityGdp: -3, meritPoints: -5, bossFavor: -3 },
      },
      {
        label: '寻找替代方案协商',
        icon: '🔄',
        desc: '提出以分期供地代替，对方勉强接受',
        effects: { cityGdp: 8, cityBusiness: 6, meritPoints: 15, bossFavor: 3 },
      },
    ],
  },
  {
    id: 'inv_2',
    deptKey: 'invest',
    title: '招商引资造假曝光',
    icon: '🚨',
    scenario: '媒体报道称辖区多个"招商项目"实为空壳公司，实际投资额虚报，上级责令彻查。',
    triggerChance: 0.18,
    isPositive: false,
    choices: [
      {
        label: '主动公开自查结果',
        icon: '📢',
        desc: '如实通报，取消3个空壳项目，获得上级理解',
        effects: { moralValue: 8, meritPoints: 8, bossFavor: 2, cityGdp: -5 },
      },
      {
        label: '对外统一口径，内部整改',
        icon: '🤐',
        desc: '暂时遮掩，但一旦深查后果更严重',
        effects: { meritPoints: -10, moralValue: -10, bossFavor: -5 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  信访局 — 信访维稳事件
// ─────────────────────────────────────────────
const PETITION_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'pet_1',
    deptKey: 'petition',
    title: '进京上访人员拦截压力',
    icon: '🚌',
    scenario: '某村村民因征地补偿纠纷长期上访，即将赴京，截访还是解决根本问题？',
    triggerChance: 0.28,
    isPositive: false,
    choices: [
      {
        label: '推动补偿问题彻底解决',
        icon: '✅',
        desc: '当地政府追加补偿款，村民满意，自愿撤访',
        effects: { cityLivelihood: 12, moralValue: 10, meritPoints: 18, bossFavor: 4, fundBalance: -20 },
      },
      {
        label: '临时截访后调解',
        icon: '🤝',
        desc: '截访成功，问题未根本解决，可能复发',
        effects: { meritPoints: 5, moralValue: -5, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'pet_2',
    deptKey: 'petition',
    title: '积案清零专项行动',
    icon: '📂',
    scenario: '上级要求月底前清理3年以上历史信访积案，共15件，时间紧任务重。',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '组建专班逐案攻克',
        icon: '💪',
        desc: '12件成功化解，3件依法终结，圆满完成任务',
        effects: { cityLivelihood: 10, meritPoints: 20, bossFavor: 6, healthValue: -5 },
      },
      {
        label: '重点突破高风险案件',
        icon: '🎯',
        desc: '化解8件，进度达标，但还有隐患',
        effects: { cityLivelihood: 6, meritPoints: 12, bossFavor: 3 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  组织部 — 干部任免事件
// ─────────────────────────────────────────────
const ORGANIZATION_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'org_1',
    deptKey: 'organization',
    title: '后备干部名单争议',
    icon: '📋',
    scenario: '拟提交的后备干部名单中，有一名候选人被举报背景复杂，家属有违规经商行为，是否保留其资格？',
    triggerChance: 0.22,
    isPositive: false,
    choices: [
      {
        label: '核查后移除名单',
        icon: '🔍',
        desc: '审慎处理，维护名单纯洁性，上级认可',
        effects: { moralValue: 8, meritPoints: 12, bossFavor: 4 },
      },
      {
        label: '保留名单，继续观察',
        icon: '👁',
        desc: '模糊处理，若后期出问题将牵连自身',
        effects: { meritPoints: 5, moralValue: -5, bossFavor: 1 },
      },
    ],
  },
  {
    id: 'org_2',
    deptKey: 'organization',
    title: '干部选拔跑官要官',
    icon: '🚶',
    scenario: '有三名副科级干部通过各种渠道私下向您打招呼，希望进入晋升快车道。',
    triggerChance: 0.25,
    isPositive: false,
    choices: [
      {
        label: '一律拒绝，按程序办',
        icon: '⚖️',
        desc: '坚守原则，树立公正形象，风气为之一正',
        effects: { moralValue: 10, meritPoints: 15, bossFavor: 3 },
      },
      {
        label: '酌情关照，适当提携',
        icon: '🤝',
        desc: '人脉拓展，但若被举报将影响口碑',
        effects: { moralValue: -8, bossFavor: 2, meritPoints: 5 },
      },
    ],
  },
];

// ─────────────────────────────────────────────
//  军转干部专属剧情事件
// ─────────────────────────────────────────────
const MILITARY_TRANSFER_EVENTS: DeptMonthlyEvent[] = [
  {
    id: 'mil_1',
    deptKey: 'military',
    title: '老首长来电关怀',
    icon: '☎️',
    scenario: '昔日老首长意外来电，询问你转业后的工作情况，言谈间表示自己仍在某部门有影响力，可为你提供助力。你感受到这是一次难得的机会。',
    triggerChance: 0.15,
    isPositive: true,
    isMilitarySpecial: true,
    choices: [
      {
        label: '请老首长出面协助晋升',
        icon: '⭐',
        desc: '老首长活动人脉，破格提拔机会增加30%，但需承受人情债',
        chainKey: 'mil_old_chief_help',
        effects: { bossFavor: 15, meritPoints: 20, triggerPromotion: true },
      },
      {
        label: '婉拒，靠自身努力晋升',
        icon: '💪',
        desc: '坚持自力更生，道德值提升，老首长也赞赏你的品格',
        effects: { moralValue: 12, abilityValue: 2, meritPoints: 8 },
      },
      {
        label: '感谢老首长，请他指导工作',
        icon: '📚',
        desc: '从老首长的丰富经验中学习，能力和见识大幅提升',
        chainKey: 'mil_old_chief_mentor',
        effects: { abilityValue: 3, meritPoints: 12, bossFavor: 5 },
      },
    ],
  },
  {
    id: 'mil_1_chain_help',
    deptKey: 'military',
    title: '老首长人脉推动晋升通道打开',
    icon: '🌟',
    scenario: '上月请老首长活动人脉后，组织部收到了来自上级的内部推荐函，晋升机会已摆在眼前。',
    triggerChance: 1.0,
    isPositive: true,
    isMilitarySpecial: true,
    requiredChainKey: 'mil_old_chief_help',
    choices: [
      {
        label: '全力把握机会，积极表现',
        icon: '🚀',
        desc: '晋升成功，但人情债沉重，需回报老首长',
        effects: { meritPoints: 30, bossFavor: 10, networkValue: -10, triggerPromotion: true },
      },
      {
        label: '临时收手，待时机更成熟',
        icon: '🛡',
        desc: '暂缓晋升，积累实力，减少风险',
        effects: { moralValue: 5, meritPoints: 10, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'mil_1_chain_mentor',
    deptKey: 'military',
    title: '老首长指导讲座引发圈内关注',
    icon: '📚',
    scenario: '上月老首长来指导工作，其精彩言论被现场人员发到内部圈子，你借机结识多名高级官员。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'mil_old_chief_mentor',
    choices: [
      {
        label: '主动联系新结识的官员',
        icon: '🤝',
        desc: '人脉网络大幅扩展，政治资本积累',
        effects: { networkValue: 15, meritPoints: 15, bossFavor: 5, abilityValue: 1 },
      },
      {
        label: '专注自身工作，被动维系',
        icon: '📋',
        desc: '低调处理，人脉适度增长',
        effects: { networkValue: 6, meritPoints: 8, bossFavor: 2 },
      },
    ],
  },
  {
    id: 'mil_2',
    deptKey: 'military',
    title: '战友聚会叙旧',
    icon: '🍻',
    scenario: '原部队班里的几位战友在本市相聚，席间大家分享各自转业后的经历，还有战友如今已是地方企业家，表示愿意支持你的工作。',
    triggerChance: 0.25,
    isPositive: true,
    choices: [
      {
        label: '接受战友的商业合作建议',
        icon: '🤝',
        desc: '战友企业助力招商引资，GDP和财政双丰收',
        chainKey: 'mil_buddy_biz',
        effects: { cityGdp: 8, cityBusiness: 10, fundBalance: 30, bossFavor: 3, networkValue: 5 },
      },
      {
        label: '只叙旧不谈公事',
        icon: '🎖️',
        desc: '纯粹的战友情谊，心情愉悦，健康和道德都有收益',
        effects: { healthValue: 5, moralValue: 5, abilityValue: 1, networkValue: 3 },
      },
    ],
  },
  {
    id: 'mil_2_chain',
    deptKey: 'military',
    title: '战友企业引资项目超预期',
    icon: '🏭',
    scenario: '上月战友企业正式落地，当月产值超预期，市领导主动问询合作情况，希望继续扩大引资规模。',
    triggerChance: 1.0,
    isPositive: true,
    requiredChainKey: 'mil_buddy_biz',
    choices: [
      {
        label: '联合战友扩大招商引资',
        icon: '📈',
        desc: '引入更多项目，GDP与营商双赢，人脉进一步扩展',
        effects: { cityGdp: 12, cityBusiness: 10, meritPoints: 22, networkValue: 8, bossFavor: 6 },
      },
      {
        label: '维持现有规模，不过度扩张',
        icon: '⚖️',
        desc: '稳健推进，规避利益冲突风险',
        effects: { cityGdp: 5, meritPoints: 12, bossFavor: 3, moralValue: 3 },
      },
    ],
  },
  {
    id: 'mil_3',
    deptKey: 'military',
    title: '军旅岁月激励',
    icon: '🎖️',
    scenario: '深夜整理旧物，翻到了当年的立功证书和军装照，想起那些艰苦岁月和战友情谊，内心涌起一股力量。',
    triggerChance: 0.30,
    isPositive: true,
    choices: [
      {
        label: '以军人作风严要求自己',
        icon: '💪',
        desc: '重拾军人本色，工作效率大增，能力飞速提升',
        effects: { abilityValue: 3, meritPoints: 10, moralValue: 5, healthValue: 3 },
      },
      {
        label: '分享军旅故事激励下属',
        icon: '📢',
        desc: '带动整个团队士气，下属工作积极性提高，政绩加成',
        effects: { meritPoints: 15, bossFavor: 4, cityLivelihood: 5 },
      },
    ],
  },
  {
    id: 'mil_4',
    deptKey: 'military',
    title: '部队心理辅导邀请',
    icon: '🧠',
    scenario: '原部队邀请你回去给新兵讲转业经验，同时参加心理健康辅导课程，对于转业后的心理适应颇有帮助。',
    triggerChance: 0.18,
    isPositive: true,
    choices: [
      {
        label: '积极参与，分享经验',
        icon: '🌟',
        desc: '心理状态改善，健康回升，也为部队留下好口碑',
        effects: { healthValue: 8, moralValue: 6, abilityValue: 2, networkValue: 4 },
      },
      {
        label: '工作繁忙，婉拒邀请',
        icon: '⏰',
        desc: '专注工作，政绩略增，但健康未能调整',
        effects: { meritPoints: 8, bossFavor: 2 },
      },
    ],
  },
];

/** 全量事件池（按 deptKey 索引） */
const ALL_DEPT_EVENTS: DeptMonthlyEvent[] = [
  ...POLICE_EVENTS,
  ...FINANCE_EVENTS,
  ...NDRC_EVENTS,
  ...EDUCATION_EVENTS,
  ...HEALTH_EVENTS,
  ...AGRICULTURE_EVENTS,
  ...ECOLOGY_EVENTS,
  ...MARKET_EVENTS,
  ...TAX_EVENTS,
  ...URBAN_EVENTS,
  ...PERSONNEL_EVENTS,
  ...INVEST_EVENTS,
  ...PETITION_EVENTS,
  ...ORGANIZATION_EVENTS,
  ...MILITARY_TRANSFER_EVENTS,
];

/**
 * 根据玩家当前职位 deptKey / 军转状态 / 上月chainKey / 职级 / KPI 随机抽取一个月度事件
 *
 * @param currentDeptKey       当前部门key（从 playerPosition 解析）
 * @param isMilitaryTransfer   是否军转干部
 * @param lastChainKey         上月选项携带的 chainKey（'' = 无连锁）
 * @param rankLevel            玩家职级（1-15），影响正面事件权重
 * @param kpiScore             上届KPI综合得分（0-100），影响正面事件权重
 * @param networkValue         人脉值（0-100），不影响抽取，由 UI 层过滤选项
 */
export function drawMonthlyDeptEvent(
  currentDeptKey: string | null,
  isMilitaryTransfer: boolean,
  lastChainKey?: string,
  rankLevel?: number,
  kpiScore?: number,
  networkValue?: number,
): DeptMonthlyEvent | null {
  void networkValue; // 仅 UI 层使用，此处保留参数签名

  const rank = rankLevel ?? 1;
  const kpi  = kpiScore  ?? 60;

  // ── 权重因子 ──────────────────────────────────────────────────
  // 正面事件加权（职级+KPI越高，正面事件越易触发）
  const positiveBoost  = 1 + rank * 0.08 + kpi  * 0.008;
  // 挑战性事件加权（职级+KPI越低，挑战事件越易触发）
  const challengeBoost = 1 + (12 - Math.min(rank, 12)) * 0.06 + (100 - kpi) * 0.005;

  const effectiveChance = (e: DeptMonthlyEvent): number => {
    const base = e.triggerChance;
    if (e.isPositive)       return Math.min(base * positiveBoost,  0.9);
    if (e.isPositive === false) return Math.min(base * challengeBoost, 0.85);
    return base; // isPositive undefined → 中性事件，不调整
  };

  // ── 1. 优先尝试连锁事件 ─────────────────────────────────────
  if (lastChainKey && lastChainKey.length > 0) {
    const chainPool = ALL_DEPT_EVENTS.filter(
      e => e.requiredChainKey === lastChainKey &&
           (e.deptKey === currentDeptKey || e.deptKey === 'military'),
    );
    const chainHit = chainPool.find(() => Math.random() < 0.75);
    if (chainHit) return chainHit;
  }

  // ── 2. 军转专属事件 ─────────────────────────────────────────
  const candidates: DeptMonthlyEvent[] = [];
  if (isMilitaryTransfer) {
    const milEvents = MILITARY_TRANSFER_EVENTS.filter(
      e => !e.requiredChainKey && Math.random() < effectiveChance(e),
    );
    candidates.push(...milEvents);
  }

  // ── 3. 部门专属事件 ─────────────────────────────────────────
  if (currentDeptKey) {
    const deptEvents = ALL_DEPT_EVENTS.filter(
      e => e.deptKey === currentDeptKey &&
           !e.requiredChainKey &&
           Math.random() < effectiveChance(e),
    );
    candidates.push(...deptEvents);
  }

  if (candidates.length === 0) return null;

  // ── 4. 军转重大事件保底权重 ─────────────────────────────────
  const special = candidates.find(e => e.isMilitarySpecial);
  if (special && Math.random() < 0.4) return special;

  // ── 5. 按权重加权随机 ───────────────────────────────────────
  const weightedPool: DeptMonthlyEvent[] = [];
  candidates.forEach(e => {
    const copies = e.isPositive ? Math.ceil(positiveBoost * 2) :
                   e.isPositive === false ? Math.ceil(challengeBoost * 2) : 2;
    for (let i = 0; i < copies; i++) weightedPool.push(e);
  });

  return weightedPool[Math.floor(Math.random() * weightedPool.length)] ?? null;
}

/**
 * 从 playerPosition（职位名称）反推 deptKey
 * 例："县公安局局长" -> "police"
 */
export function inferDeptKeyFromPosition(playerPosition: string): string | null {
  const MAP: Array<[RegExp, string]> = [
    [/公安|警察/, 'police'],
    [/财政/, 'finance'],
    [/发改|发展改革/, 'ndrc'],
    [/教育/, 'education'],
    [/卫.*健|卫生/, 'health2'],
    [/农业|农村|农委/, 'agriculture'],
    [/环保|生态|资源/, 'ecology'],
    [/市场监管|工商/, 'market'],
    [/税务/, 'tax'],
    [/住建|城乡建设/, 'urban'],
    [/人事|干部/, 'personnel'],
    [/招商|投资促进/, 'invest'],
    [/信访/, 'petition'],
    [/组织部/, 'organization'],
  ];
  for (const [re, key] of MAP) {
    if (re.test(playerPosition)) return key;
  }
  return null;
}
