/**
 * 路线间竞争随机事件数据层
 * 类型：排挤 / 拉拢 / 跳槽
 * 每次推进时间时按概率触发
 */

type CompetitionEventType = '排挤' | '拉拢' | '跳槽';
export type CareerLineName = '党务线' | '行政线' | '纪检线' | '团派线';

export interface CompetitionChoice {
  key: string;
  label: string;
  desc: string;
  effects: {
    meritPoints?: number;
    bossFavor?: number;
    reformFaction?: number;
    pragmaticFaction?: number;
    inspectionRisk?: number;
    publicOpinionIndex?: number;
    moralValue?: number;
    lineKpiScore?: number;
  };
  /** 是否切换路线（跳槽专用） */
  switchLine?: CareerLineName;
  /** 是否为灰色选项 */
  isGray?: boolean;
}

export interface CompetitionEvent {
  key: string;
  type: CompetitionEventType;
  /** 事件发起者所在路线 */
  sourceLine: CareerLineName;
  /** 触发所需最低职级 */
  minRank: number;
  /** 触发所需最高职级（-1=不限） */
  maxRank: number;
  title: string;
  desc: string;
  /** 发起者姓名/身份描述 */
  actor: string;
  actorIcon: string;
  /** 选项列表（2-3个） */
  choices: CompetitionChoice[];
}

// ─── 排挤事件池 ───────────────────────────────────────────
const SQUEEZE_EVENTS: CompetitionEvent[] = [
  {
    key: 'squeeze_report_001', type: '排挤', sourceLine: '党务线',
    minRank: 2, maxRank: 8,
    title: '党务系统的举报',
    actor: '县委组织部副部长', actorIcon: '🔴',
    desc: '县委组织部副部长以"行政作风问题"为由，向上级组织部门提交了一份针对你的考察报告，内容失实，疑似借刀整人。',
    choices: [
      { key: 'counter_report', label: '正面回应，提交工作台账', desc: '整理近期工作台账、政绩数据，向上级提交书面说明，正面澄清。', effects: { meritPoints: -10, bossFavor: 5, inspectionRisk: -5 } },
      { key: 'seek_faction', label: '联系同派系力量反制', desc: '通过派系人脉网络施加影响，让对方失去上级信任。', effects: { reformFaction: 5, pragmaticFaction: -8, bossFavor: -3 } },
      { key: 'endure_quietly', label: '隐忍不发，暗中积累证据', desc: '暂时按兵不动，收集对方工作失职证据，留待时机反击。', effects: { meritPoints: -5, lineKpiScore: 3 } },
    ],
  },
  {
    key: 'squeeze_resource_002', type: '排挤', sourceLine: '行政线',
    minRank: 4, maxRank: 10,
    title: '项目资源争夺',
    actor: '市发改委主任（行政线）', actorIcon: '🔵',
    desc: '市发改委主任趁你不在时，将原定由你负责的重大基建项目调配给了自己分管的部门，这将直接影响你的绩效考核。',
    choices: [
      { key: 'formal_protest', label: '向市长办公室提交异议', desc: '通过正式公文程序主张项目权限，有50%概率要回项目。', effects: { meritPoints: 15, bossFavor: -5, inspectionRisk: 3 } },
      { key: 'trade_resource', label: '以其他项目换取合作', desc: '主动找对方谈判，互换部分项目权限，化竞争为合作。', effects: { meritPoints: 5, reformFaction: 3, pragmaticFaction: 3 } },
      { key: 'find_new_project', label: '另辟蹊径争取新项目', desc: '放弃内耗，主动申报新的专项资金项目，开辟新政绩点。', effects: { meritPoints: 20, lineKpiScore: 5, bossFavor: 3 } },
    ],
  },
  {
    key: 'squeeze_slander_003', type: '排挤', sourceLine: '纪检线',
    minRank: 3, maxRank: 9,
    title: '纪检线的阴影',
    actor: '市纪委某科长', actorIcon: '🟡',
    desc: '一名纪检线官员向上级施压，暗示你在某次招商引资中有"程序瑕疵"，并放出风声称将启动初步了解程序。',
    choices: [
      { key: 'proactive_explain', label: '主动约谈说明，配合调查', desc: '开诚布公地说明招商过程，提供完整程序文件，争取息事宁人。', effects: { moralValue: 5, inspectionRisk: -10, meritPoints: -8 } },
      { key: 'boss_intercede', label: '请直接上级出面协调', desc: '请直属上级在内部协调，降低事态升级风险。', effects: { bossFavor: -8, inspectionRisk: -15, meritPoints: 0 } },
      { key: 'counterattack', label: '暗中查对方履历漏洞', desc: '通过熟悉的渠道收集该科长工作中的违规线索，形成威慑。', effects: { moralValue: -5, inspectionRisk: 5, meritPoints: 5 }, isGray: true },
    ],
  },
  {
    key: 'squeeze_youth_004', type: '排挤', sourceLine: '团派线',
    minRank: 2, maxRank: 7,
    title: '团派的舆论施压',
    actor: '市团委书记（团派线）', actorIcon: '🟢',
    desc: '市团委书记在一次干部交流会上公开批评你分管工作"缺乏群众基础"，并在系统内部散发负面评价，引发部分同僚侧目。',
    choices: [
      { key: 'public_rebuttal', label: '会上直接回应，列举政绩', desc: '当场以数据反驳，展现工作实绩，赢得现场认可。', effects: { publicOpinionIndex: 8, bossFavor: 3, meritPoints: 10 } },
      { key: 'private_reconcile', label: '私下联系沟通，寻求和解', desc: '事后约其喝茶，以退为进化解矛盾，维护系统内部关系。', effects: { bossFavor: 5, reformFaction: 2, pragmaticFaction: 2 } },
      { key: 'let_go', label: '不予理会，专注本职工作', desc: '不与之争论，让扎实的工作成绩说话。', effects: { meritPoints: 15, lineKpiScore: 8 } },
    ],
  },
  {
    key: 'squeeze_appointment_005', type: '排挤', sourceLine: '党务线',
    minRank: 5, maxRank: 11,
    title: '组织部内部施压',
    actor: '省委组织部某副处长', actorIcon: '🔴',
    desc: '组织部内线透露，有人在酝酿晋升考察方案时刻意将你排除在候选名单之外，理由是"担任职务时间较短"。',
    choices: [
      { key: 'lobby_boss', label: '争取直接上级力荐', desc: '请求直属上级在组织程序内为你发声，强调业绩数据。', effects: { bossFavor: -10, meritPoints: 20, lineKpiScore: 5 } },
      { key: 'submit_materials', label: '补充专项工作材料', desc: '赶在考察窗口前提交详尽工作材料，增强考察印象。', effects: { meritPoints: 25, bossFavor: 5, inspectionRisk: -3 } },
      { key: 'accept_delay', label: '接受现实，等待下一个窗口', desc: '沉住气等待，持续积累政绩争取下次机会。', effects: { meritPoints: 10, lineKpiScore: 10, moralValue: 3 } },
    ],
  },
];

// ─── 拉拢事件池 ───────────────────────────────────────────
const ALLY_EVENTS: CompetitionEvent[] = [
  {
    key: 'ally_party_001', type: '拉拢', sourceLine: '党务线',
    minRank: 3, maxRank: 12,
    title: '党务系统的橄榄枝',
    actor: '市委组织部部长（党务线）', actorIcon: '🔴',
    desc: '市委组织部部长在一次私下场合约见你，暗示党务线正值用人之际，希望你能向党务线靠拢，以获得更稳定的晋升通道。',
    choices: [
      { key: 'polite_decline', label: '婉言谢绝，坚守本线', desc: '客气地表示暂无意向，维护本线独立性。', effects: { lineKpiScore: 5, bossFavor: 3, reformFaction: -3 } },
      { key: 'partial_cooperation', label: '接受部分合作，保持独立', desc: '在某些议题上与党务线协作，但不放弃本线核心利益。', effects: { reformFaction: 8, pragmaticFaction: 5, bossFavor: 5 } },
      { key: 'deep_ally', label: '深度结盟，争取共同推进', desc: '与党务线高层建立稳固联系，获得晋升加持但需承担派系义务。', effects: { bossFavor: 15, reformFaction: 15, lineKpiScore: -5, moralValue: -3 }, isGray: true },
    ],
  },
  {
    key: 'ally_admin_002', type: '拉拢', sourceLine: '行政线',
    minRank: 4, maxRank: 12,
    title: '行政线的利益输送',
    actor: '市长秘书（行政线核心圈）', actorIcon: '🔵',
    desc: '市长秘书以"协调重大项目"为名，私下约见你，表示行政线愿意将一个GDP达标的示范项目划归你管辖，条件是在下次班子会议上支持行政线的某项政策主张。',
    choices: [
      { key: 'reject_deal', label: '拒绝政治交换，保持独立', desc: '明确表示公务行为不参与幕后政治交易。', effects: { moralValue: 5, inspectionRisk: -5, meritPoints: 5 } },
      { key: 'accept_project', label: '接受项目，会议上中立', desc: '接受项目安排，但在会议上不公开表态支持其主张。', effects: { meritPoints: 30, lineKpiScore: 8, moralValue: -3 }, isGray: true },
      { key: 'full_cooperation', label: '全面合作，形成利益共同体', desc: '公开支持行政线在会议上的主张，换取长期项目资源倾斜。', effects: { meritPoints: 50, bossFavor: 10, moralValue: -8, inspectionRisk: 8 }, isGray: true },
    ],
  },
  {
    key: 'ally_discipline_003', type: '拉拢', sourceLine: '纪检线',
    minRank: 5, maxRank: 11,
    title: '纪检高层的秘密邀约',
    actor: '省纪委副书记（纪检线）', actorIcon: '🟡',
    desc: '省纪委副书记私下联系你，表示正在牵头一个反腐专项行动，希望你能协助提供某地官员的相关线索，作为交换，纪检线将在下次巡视中为你的分管领域"护航"。',
    choices: [
      { key: 'refuse_quietly', label: '婉拒，称掌握信息有限', desc: '礼貌回避，避免卷入纪检系统内部的政治博弈。', effects: { inspectionRisk: 5, bossFavor: -2, lineKpiScore: 3 } },
      { key: 'provide_minor_info', label: '提供无关痛痒的普通信息', desc: '给出一些无实质价值的线索，维系表面合作关系。', effects: { inspectionRisk: -10, bossFavor: 5, moralValue: -2 }, isGray: true },
      { key: 'full_cooperate_discipline', label: '全力配合，深化跨线合作', desc: '提供核心线索并形成稳固利益关系，获得纪检系统长期保护。', effects: { inspectionRisk: -20, bossFavor: 12, moralValue: -10, pragmaticFaction: 10 }, isGray: true },
    ],
  },
  {
    key: 'ally_league_004', type: '拉拢', sourceLine: '团派线',
    minRank: 2, maxRank: 9,
    title: '团派系统的共青团召集',
    actor: '省团委书记（团派核心）', actorIcon: '🟢',
    desc: '省团委书记通过中间人传话，表示团派系统正在为下届人大代表名单运作，希望你以"青年干部代表"身份参与，有意将你纳入团派晋升梯队。',
    choices: [
      { key: 'decline_gracefully', label: '表示感谢，婉言不参与', desc: '客气拒绝，避免被贴上团派标签影响本线发展。', effects: { lineKpiScore: 5, publicOpinionIndex: 5 } },
      { key: 'attend_as_observer', label: '以个人身份出席活动，不入团', desc: '参加团派举办的公开活动，扩大人脉，但不正式加入阵营。', effects: { publicOpinionIndex: 10, bossFavor: 5, reformFaction: 5 } },
      { key: 'join_league_network', label: '正式融入团派人脉圈', desc: '参与团派运作，获得青年系统支持，但需承担相应义务。', effects: { publicOpinionIndex: 15, bossFavor: 12, lineKpiScore: -5, reformFaction: 10 }, isGray: true },
    ],
  },
  {
    key: 'ally_highrank_005', type: '拉拢', sourceLine: '行政线',
    minRank: 7, maxRank: 13,
    title: '省委大佬的私人约见',
    actor: '省委副书记（行政线大佬）', actorIcon: '🔵',
    desc: '省委副书记以"个人交流"为由，在官邸约见了你。谈话中他暗示将在下届常委会改选中力推你进入省委常委班子，前提是对行政线的某项重大政策保持公开支持。',
    choices: [
      { key: 'firm_refuse', label: '坚定拒绝，称以能力说话', desc: '表明自己不参与派系交换，以工作成绩争取提拔。', effects: { moralValue: 8, lineKpiScore: 8, bossFavor: -5 } },
      { key: 'ambiguous_promise', label: '含糊应承，保留空间', desc: '措辞模糊表示"会认真考虑"，暂时安抚对方，不承诺。', effects: { bossFavor: 8, pragmaticFaction: 8, moralValue: -2 } },
      { key: 'formal_alliance', label: '正式表态，进入大佬阵营', desc: '明确表示支持，获得常委提名，但政治独立性大为削弱。', effects: { bossFavor: 25, reformFaction: 20, moralValue: -12, inspectionRisk: 10 }, isGray: true },
    ],
  },
];

// ─── 跳槽事件池 ───────────────────────────────────────────
const TRANSFER_EVENTS: CompetitionEvent[] = [
  {
    key: 'transfer_to_party', type: '跳槽', sourceLine: '党务线',
    minRank: 6, maxRank: 10,
    title: '组织部的特殊调令',
    actor: '省委组织部部长', actorIcon: '🔴',
    desc: '省委组织部部长通知你，组织上研究决定，拟将你调整至党务线工作，以弥补党建系统干部缺口。此次调整属于正常组织安排，但意味着你要放弃现有路线上的积累。',
    choices: [
      { key: 'accept_transfer', label: '服从组织安排，接受调入党务线', desc: '接受调令，晋升积累减少，但开辟新路线通道。', effects: { meritPoints: -20, lineKpiScore: -15, bossFavor: 10 }, switchLine: '党务线' },
      { key: 'request_stay', label: '提交书面申请，请求留守原线', desc: '以本线工作尚未完成为由申请留岗，概率60%成功。', effects: { bossFavor: -8, meritPoints: 5, lineKpiScore: 5 } },
    ],
  },
  {
    key: 'transfer_to_admin', type: '跳槽', sourceLine: '行政线',
    minRank: 6, maxRank: 11,
    title: '省政府的借调邀请',
    actor: '省政府办公厅主任（行政线）', actorIcon: '🔵',
    desc: '省政府办公厅发出邀请，希望你以借调方式参与一个重大专项工作，时间一年。借调结束后，可能正式转入行政线序列，也可能回归原线。',
    choices: [
      { key: 'accept_secondment', label: '接受借调，搭乘行政线快车', desc: '借调期间积累行政线人脉与政绩，但原线积分暂停。', effects: { meritPoints: 30, bossFavor: 8, lineKpiScore: -10 }, switchLine: '行政线' },
      { key: 'decline_secondment', label: '婉拒借调，坚守本线深耕', desc: '以本线任务重为由拒绝，维护原有路线积累。', effects: { meritPoints: 8, lineKpiScore: 10, bossFavor: -3 } },
    ],
  },
  {
    key: 'transfer_to_discipline', type: '跳槽', sourceLine: '纪检线',
    minRank: 5, maxRank: 10,
    title: '纪委系统的强制调令',
    actor: '中央纪委驻地监察专员', actorIcon: '🟡',
    desc: '中央纪委驻地监察专员宣读调令，组织决定从地方抽调干部充实纪检监察力量，你被列为候选。此调令具有强制性，若无正当理由拒绝，将影响组织评价。',
    choices: [
      { key: 'obey_discipline', label: '服从调令，加入纪检线', desc: '服从组织安排，进入纪检监察系统，廉洁度加成明显。', effects: { moralValue: 10, inspectionRisk: -15, lineKpiScore: -10, meritPoints: -15 }, switchLine: '纪检线' },
      { key: 'medical_excuse', label: '以身体原因申请缓调', desc: '以医疗检查报告申请延缓，有40%概率获批，获批后不需转线。', effects: { bossFavor: -5, lineKpiScore: 3 } },
    ],
  },
  {
    key: 'transfer_to_league', type: '跳槽', sourceLine: '团派线',
    minRank: 4, maxRank: 8,
    title: '团系统的挂职邀请',
    actor: '团省委书记（团派线）', actorIcon: '🟢',
    desc: '团省委书记邀请你以挂职形式出任某市青年工作副主任，为期一年半，挂职期满可择优留用或回原单位，但期间绩效计入团派线KPI体系。',
    choices: [
      { key: 'accept_league', label: '接受挂职，转入团派路线', desc: '进入团派序列，群众基础大幅提升，原线积分损失。', effects: { publicOpinionIndex: 15, meritPoints: -10, lineKpiScore: -8 }, switchLine: '团派线' },
      { key: 'decline_league', label: '婉谢邀请，继续原线工作', desc: '以在研项目未完成为由，礼貌拒绝挂职邀请。', effects: { meritPoints: 10, lineKpiScore: 8 } },
    ],
  },
];

/** 全部事件池 */
export const ALL_COMPETITION_EVENTS: CompetitionEvent[] = [
  ...SQUEEZE_EVENTS,
  ...ALLY_EVENTS,
  ...TRANSFER_EVENTS,
];

/** 触发概率配置 */
const COMPETITION_TRIGGER_RATES: Record<CompetitionEventType, number> = {
  排挤: 0.10,
  拉拢: 0.08,
  跳槽: 0.04,
};

/**
 * 每日推进时按职级和当前路线随机选取一个竞争事件
 * 返回 null 表示本日无触发
 */
export function rollCompetitionEvent(
  currentLine: CareerLineName,
  rankLevel: number,
  lastEventDay: number,
  gameDays: number,
): CompetitionEvent | null {
  // 事件间隔至少30天
  if (gameDays - lastEventDay < 30) return null;

  // 汇总全部可触发事件（排除玩家自身路线的跳槽目标）
  const pool = ALL_COMPETITION_EVENTS.filter(e => {
    if (rankLevel < e.minRank || (e.maxRank !== -1 && rankLevel > e.maxRank)) return false;
    if (e.type === '跳槽') {
      const switchLine = e.choices.find(c => c.switchLine)?.switchLine;
      if (switchLine === currentLine) return false; // 不跳到自己所在的线
    }
    if (e.sourceLine === currentLine) return true; // 同线事件（内部竞争）
    return true; // 跨线事件均可触发
  });

  if (pool.length === 0) return null;

  // 按类型汇总触发率
  const roll = Math.random();
  const baseRate =
    COMPETITION_TRIGGER_RATES['排挤'] +
    COMPETITION_TRIGGER_RATES['拉拢'] +
    COMPETITION_TRIGGER_RATES['跳槽'];

  if (roll > baseRate) return null;

  // 按类型分层抽取
  let typePick: CompetitionEventType;
  const r2 = Math.random();
  if (r2 < 0.45) typePick = '排挤';
  else if (r2 < 0.80) typePick = '拉拢';
  else typePick = '跳槽';

  const typedPool = pool.filter(e => e.type === typePick);
  if (typedPool.length === 0) return pool[Math.floor(Math.random() * pool.length)];
  return typedPool[Math.floor(Math.random() * typedPool.length)];
}
