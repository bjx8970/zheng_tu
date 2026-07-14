// 突发事件模板数据库（按职级分层）
// isMajor=true 的事件触发领导班子集体决策投票
import type { EventTemplate } from '@/types/game';

// ─────────────────────────────────────────────
// 乡镇级（rank 1-3）
// ─────────────────────────────────────────────
const EVENTS_TOWN: EventTemplate[] = [
  {
    type: 'opinion',
    title: '村民纠纷激化',
    description: '辖区两户村民因宅基地边界问题发生激烈争吵，聚集村民约三十余人，情绪激动，存在械斗风险，已有人拨打信访热线。',
    choices: [
      { text: '亲赴现场调解，组织村委会共同协商', meritChange: 15, moralChange: 5, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '当场化解矛盾，民心凝聚，树立良好形象。' },
      { text: '委托村委会按规章处理，保持观望', meritChange: 5, moralChange: 0, gdpChange: 0, livelihoodChange: 2, ecologyChange: 0, businessChange: 0, description: '事件缓慢平息，但民众感觉缺乏关怀。' },
      { text: '移交派出所处理，不参与介入', meritChange: -5, moralChange: -5, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '村民认为领导推诿，信访投诉增多。' },
    ],
  },
  {
    type: 'opinion',
    title: '基层信访集中',
    description: '本月辖区信访量激增，有群众反映农村低保发放不公正，多人结伴前往县信访办投诉，已引起县委关注。',
    choices: [
      { text: '主动约谈信访群众，开展低保专项核查', meritChange: 20, moralChange: 8, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '问题查实整改，群众满意度上升。' },
      { text: '安排专职干部接访，分类处理诉求', meritChange: 8, moralChange: 3, gdpChange: 0, livelihoodChange: 4, ecologyChange: 0, businessChange: 0, description: '部分诉求得到回应，信访量有所下降。' },
      { text: '要求村委会自行协调，劝阻群众上访', meritChange: -10, moralChange: -10, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '群众情绪恶化，越级上访至市级。' },
    ],
  },
  {
    type: 'disaster',
    title: '农村道路塌方',
    description: '连日暴雨后，辖区一条通村主干道发生塌方，交通中断，数个村庄出行受阻，农产品滞销，村民怨声载道。',
    choices: [
      { text: '紧急申请修缮经费，组织机械抢修', meritChange: 18, moralChange: 4, gdpChange: -5, livelihoodChange: 12, ecologyChange: 0, businessChange: -3, description: '道路迅速恢复通行，群众拍手称快。' },
      { text: '上报灾情等待县级拨款，临时绕行方案', meritChange: 7, moralChange: 0, gdpChange: -8, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, description: '等待期间农损较大，但流程规范。' },
      { text: '仅发布绕行通知，暂不修缮', meritChange: -5, moralChange: -5, gdpChange: -10, livelihoodChange: -8, ecologyChange: 0, businessChange: -8, description: '村民强烈不满，集体投诉。' },
    ],
  },
  {
    type: 'security',
    title: '乡镇企业安全事故',
    description: '辖区一家小型化工厂发生轻微泄漏事故，无人员伤亡，但周边居民恐慌，要求关停该厂，工厂主坚决反对，双方对峙。',
    choices: [
      { text: '立即启动安全核查，责令停产整改', meritChange: 15, moralChange: 6, gdpChange: -5, livelihoodChange: 5, ecologyChange: 8, businessChange: -8, securityChange: 5, description: '安全隐患消除，民众放心，厂主配合。' },
      { text: '组织第三方检测，依结果处理', meritChange: 10, moralChange: 3, gdpChange: -3, livelihoodChange: 3, ecologyChange: 3, businessChange: -3, securityChange: 2, description: '程序正当，双方接受结果。' },
      { text: '维持现状，以经济发展为由驳回诉求', meritChange: -8, moralChange: -10, gdpChange: 3, livelihoodChange: -10, ecologyChange: -8, businessChange: 5, securityChange: -8, description: '民众持续上访，媒体介入，舆情恶化。' },
    ],
  },
  {
    type: 'economic',
    title: '村级换届选举纠纷',
    description: '村委会换届选举过程中出现选票争议，落选候选人声称存在拉票行为，组织数十名村民聚集抗议，要求重新选举。',
    choices: [
      { text: '成立核查小组，重新核验全部选票', meritChange: 18, moralChange: 10, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '选举公信力得到维护，群众信服。' },
      { text: '宣布选举结果有效，安抚落选方', meritChange: 5, moralChange: -3, gdpChange: 0, livelihoodChange: -3, ecologyChange: 0, businessChange: 0, description: '事件暂平息但留有隐患，双方存在隔阂。' },
      { text: '强行压制诉求，以扰乱秩序为由处置', meritChange: -12, moralChange: -15, gdpChange: 0, livelihoodChange: -10, ecologyChange: 0, businessChange: 0, description: '被上级纪委关注，涉嫌打压民主权利。' },
    ],
  },
  {
    type: 'disaster',
    title: '农田水利纠纷',
    description: '上游村庄截流导致下游农田干旱，双方村民爆发冲突，农业损失严重，需要协调用水分配。',
    isMajor: true,
    choices: [
      { text: '召集两村代表与水利部门联合协商，制定用水分配方案', meritChange: 35, moralChange: 8, gdpChange: 5, livelihoodChange: 15, ecologyChange: 5, businessChange: 0, description: '建立长效机制，两村矛盾彻底化解，农业生产恢复正常。' },
      { text: '依据水利法规强制执行均等分水', meritChange: 20, moralChange: 3, gdpChange: 0, livelihoodChange: 8, ecologyChange: 3, businessChange: 0, description: '冲突平息，但上游村不满，留有隐患。' },
      { text: '向上级推卸责任，要求县水利局处理', meritChange: -10, moralChange: -8, gdpChange: -5, livelihoodChange: -10, ecologyChange: -5, businessChange: 0, description: '被批评失职，农业损失持续扩大。' },
    ],
  },
  // ── 新增乡镇级事件 ──
  {
    type: 'opinion',
    title: '网络舆情涉农事件',
    description: '辖区一农民在网络发帖，反映村干部截留扶贫款，视频被大量转发，引发舆论广泛关注，县委已收到上级关注函。',
    choices: [
      { text: '立即成立专项核查组，全程公开调查结果', meritChange: 22, moralChange: 10, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '公开透明获民心，问题干部被处分，舆情迅速平息。' },
      { text: '内部调查、低调处理，不主动公开', meritChange: 6, moralChange: -2, gdpChange: 0, livelihoodChange: 2, ecologyChange: 0, businessChange: 0, description: '暂时平息，但舆论仍有质疑声。' },
      { text: '以"谣言"为由要求平台删帖、追查发帖者', meritChange: -18, moralChange: -20, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '适得其反，引发更大舆论反弹，上级介入。' },
    ],
  },
  {
    type: 'economic',
    title: '村级集体经济亏损',
    description: '镇上三个行政村的集体经济项目（农产品加工合作社）因管理混乱今年合计亏损超过50万元，村集体账户几近清零，村民强烈不满。',
    choices: [
      { text: '引入第三方经营主体接管，推进股权改革', meritChange: 18, moralChange: 5, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 8, description: '改革初见成效，村集体经济逐步复苏，获乡村振兴表彰。' },
      { text: '撤换管理层，安排镇干部驻村监督整改', meritChange: 8, moralChange: 3, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '亏损停止，但发展动力不足。' },
      { text: '以"历史遗留问题"上报，要求县里拨款填补亏损', meritChange: -10, moralChange: -8, gdpChange: -3, livelihoodChange: -5, ecologyChange: 0, businessChange: -3, description: '县财政局拒绝，被批评缺乏主观能动性。' },
    ],
  },
  {
    type: 'security',
    title: '电信诈骗集中爆发',
    description: '辖区一个月内发生电信诈骗案件17起，损失金额逾80万元，多名老人被骗光积蓄，群众恐慌情绪蔓延，要求镇政府有所作为。',
    choices: [
      { text: '联合派出所开展防诈进村宣传，对涉案线索快速上报', meritChange: 16, moralChange: 8, gdpChange: 0, livelihoodChange: 6, ecologyChange: 0, businessChange: 0, securityChange: 8, description: '发案率明显下降，群众安全感增强，派出所通报表扬。' },
      { text: '组织村委会进行普通宣传，配合公安工作', meritChange: 7, moralChange: 3, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, securityChange: 3, description: '工作到位，发案率有所下降。' },
      { text: '认为属公安职责，镇里无需额外介入', meritChange: -8, moralChange: -8, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, securityChange: -6, description: '群众强烈批评镇政府不作为，县政法委约谈。' },
    ],
  },
  {
    type: 'disaster',
    title: '山体滑坡险情预警',
    description: '气象部门发出预警：连续降雨后辖区山区一处坡体出现位移，地质专家判断有中度滑坡风险，山下共有3个村庄约400人。',
    isMajor: true,
    choices: [
      { text: '立即启动应急预案，当日完成全部400人转移安置', meritChange: 40, moralChange: 15, gdpChange: -3, livelihoodChange: 12, ecologyChange: 3, businessChange: 0, description: '零伤亡转移，被省应急厅通报表扬，成为样板案例。' },
      { text: '疏散最危险区域约100人，对其余村民发警告通知', meritChange: 18, moralChange: 5, gdpChange: -3, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '部分转移，险情虽未酿大祸，但留有遗憾。' },
      { text: '以群众不愿转移为由暂缓行动，继续观察', meritChange: -25, moralChange: -18, gdpChange: -5, livelihoodChange: -15, ecologyChange: -5, businessChange: 0, description: '发生小规模滑坡，有人员受伤，被县委紧急约谈追责。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 县处级（rank 4-6）
// ─────────────────────────────────────────────
const EVENTS_COUNTY: EventTemplate[] = [
  {
    type: 'economic',
    title: '招商引资项目流产',
    description: '一家承诺投资5亿元的企业突然宣布撤资，理由是营商环境不理想，相关报道被媒体转载，县委问责压力巨大。',
    choices: [
      { text: '主动约谈企业负责人，提供专项政策支持', meritChange: 20, moralChange: 3, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 15, description: '企业重新考量，达成意向协议。' },
      { text: '公开回应媒体，说明县域发展优势', meritChange: 8, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '舆论压力缓解，但投资未能挽回。' },
      { text: '低调处理，暗中压制相关报道', meritChange: -10, moralChange: -12, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -5, description: '被更多媒体追问，舆情进一步恶化。' },
    ],
  },
  {
    type: 'security',
    title: '学校食品安全事故',
    description: '县城一所中学爆发集体食物中毒，共62名学生送医，家长聚集医院闹事，教育局和卫生局相互推诿，事态升级。',
    choices: [
      { text: '亲赴医院慰问并成立联合调查组，第一时间公开通报', meritChange: 25, moralChange: 10, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, securityChange: 5, description: '处置及时透明，家长情绪平稳，舆论正面。' },
      { text: '召开紧急会议协调各部门，对外低调处理', meritChange: 10, moralChange: 2, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, securityChange: 2, description: '事态平息但外界观感一般。' },
      { text: '要求教育局独立处理，保持距离', meritChange: -15, moralChange: -10, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, securityChange: -5, description: '被家长投诉不作为，省级媒体介入。' },
    ],
  },
  {
    type: 'corruption',
    title: '工厂排污举报',
    description: '辖区一家重点税源企业被群众举报长期偷排污水，环保部门核查属实，但该企业是县财政重要来源，县委内部意见分歧。',
    isMajor: true,
    choices: [
      { text: '召开常委会研究，依法依规责令停产整改', meritChange: 30, moralChange: 12, gdpChange: -8, livelihoodChange: 8, ecologyChange: 20, businessChange: -5, description: '法治形象确立，生态改善，长期营商环境受益。' },
      { text: '给予限期整改期限，暂不停产', meritChange: 12, moralChange: -3, gdpChange: 3, livelihoodChange: 0, ecologyChange: 5, businessChange: 5, description: '短期经济未受损，但环保问题未彻底解决。' },
      { text: '以经济利益为由压下不处理', meritChange: -20, moralChange: -20, gdpChange: 5, livelihoodChange: -5, ecologyChange: -15, businessChange: 3, description: '被省级环保督察组点名，面临问责。' },
    ],
  },
  {
    type: 'opinion',
    title: '旧城改造拆迁矛盾',
    description: '县城旧改项目拆迁工作中，有12户居民拒绝签约，声称补偿标准过低，引发网络关注，相关视频播放量过百万。',
    choices: [
      { text: '启动第三方评估，提高补偿标准，组织公开协商', meritChange: 22, moralChange: 8, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 8, description: '矛盾化解，项目推进，获民众认可。' },
      { text: '维持原方案，加强法律宣传耐心疏导', meritChange: 8, moralChange: -2, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 3, description: '部分居民接受，但舆论关注持续。' },
      { text: '强制推进拆迁，动用法律手段驱离', meritChange: -18, moralChange: -20, gdpChange: 8, livelihoodChange: -15, ecologyChange: 0, businessChange: 5, description: '引发大规模抗议，被媒体列为典型负面案例。' },
    ],
  },
  {
    type: 'corruption',
    title: '教育经费挪用举报',
    description: '县教育局一名科长被举报挪用上千万教育专项经费用于违规投资，相关证据已流出，家长群体情绪激愤。',
    isMajor: true,
    choices: [
      { text: '召开常委会，移送纪委立案，公开通报处理结果', meritChange: 40, moralChange: 15, gdpChange: 0, livelihoodChange: 10, ecologyChange: 0, businessChange: 0, description: '重拳反腐，赢得群众极大信任，上级通报表扬。' },
      { text: '内部核查，低调处理，避免舆论扩大', meritChange: 10, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '短期平息，但被质疑包庇，留下隐患。' },
      { text: '以证据不足为由暂缓处理', meritChange: -25, moralChange: -25, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '被上级纪委直接介入调查，连带问责。' },
    ],
  },
  {
    type: 'disaster',
    title: '县城内涝应急',
    description: '暴雨导致县城主城区严重内涝，多条主干道积水超1米，数百辆车被淹，群众强烈要求追责城市规划问题。',
    choices: [
      { text: '启动应急预案，亲赴现场统一指挥排涝', meritChange: 20, moralChange: 6, gdpChange: -5, livelihoodChange: 10, ecologyChange: -3, businessChange: -5, description: '处置高效，灾损降至最低，形象加分。' },
      { text: '协调城建局与气象局开展灾后评估', meritChange: 8, moralChange: 2, gdpChange: -8, livelihoodChange: 3, ecologyChange: -3, businessChange: -8, description: '处置平稳但缺乏担当形象。' },
      { text: '推责于规划局，要求追溯历史问题', meritChange: -8, moralChange: -8, gdpChange: -10, livelihoodChange: -8, ecologyChange: -5, businessChange: -10, description: '互相推诿，群众怒火高涨，媒体批评。' },
    ],
  },
  // ── 新增县处级事件 ──
  {
    type: 'opinion',
    title: '土地违规占用举报',
    description: '县域内某工业园区被实名举报占用基本农田260亩，自然资源部已启动核查程序，牵涉到本届班子多个在建项目，局面棘手。',
    choices: [
      { text: '主动暂停涉嫌项目，全力配合上级核查，并启动内部责任追究', meritChange: 20, moralChange: 15, gdpChange: -8, livelihoodChange: 3, ecologyChange: 5, businessChange: -5, description: '配合彻查，顶格处理违规人员，上级评价处置规范，避免更大损失。' },
      { text: '申请补办土地手续，同时继续推进项目', meritChange: 5, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: -3, businessChange: 3, description: '手续勉强补齐，但留下监管隐患。' },
      { text: '施压举报人并延迟上级核查回复', meritChange: -25, moralChange: -20, gdpChange: -3, livelihoodChange: -3, ecologyChange: -5, businessChange: -5, description: '压制行为被媒体曝光，省纪委直接介入，性质恶化。' },
    ],
  },
  {
    type: 'economic',
    title: '民营企业主跑路危机',
    description: '县内最大私营纺织企业老板因资金链断裂出走，留下2000名工人3个月工资拖欠及3亿元债务，工人聚集县政府门口。',
    isMajor: true,
    choices: [
      { text: '紧急成立处置小组，协调银行续贷并垫付工资，推进资产重组', meritChange: 35, moralChange: 10, gdpChange: -5, livelihoodChange: 15, ecologyChange: 0, businessChange: -3, description: '稳住工人情绪，企业逐步走上重组正轨，成功避免群体性事件。' },
      { text: '向上级报告争取专项资金垫付工资，企业破产处置', meritChange: 15, moralChange: 5, gdpChange: -8, livelihoodChange: 8, ecologyChange: 0, businessChange: -8, description: '工资补发，但县域就业损失较大。' },
      { text: '以"市场行为"为由拒绝介入，移交法院', meritChange: -20, moralChange: -15, gdpChange: -8, livelihoodChange: -12, ecologyChange: 0, businessChange: -10, description: '工人聚集演变为群体性事件，市委主要领导赶赴现场，县委被通报批评。' },
    ],
  },
  {
    type: 'security',
    title: '校园安保事件',
    description: '辖区一所初中发生持刀伤人事件，4名学生受伤，家长情绪极度激动，已有数十名家长聚集学校门口，事件迅速扩散至社交媒体。',
    isMajor: true,
    choices: [
      { text: '第一时间赶赴现场，安抚家长，启动问责并宣布全面校园安保升级方案', meritChange: 30, moralChange: 12, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, securityChange: 10, description: '情绪平息，家长认可担当态度，教育厅通报表扬。' },
      { text: '委托教育局和公安局联合处置，书面回应家长', meritChange: 12, moralChange: 3, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, securityChange: 3, description: '事件平息但家长仍感到失望。' },
      { text: '强调是孤立事件，要求媒体不得炒作', meritChange: -18, moralChange: -15, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, securityChange: -8, description: '压制信息适得其反，引发更大舆论反弹，省教育厅直接介入。' },
    ],
  },
  {
    type: 'economic',
    title: '县级财政超支危机',
    description: '审计发现今年县级财政收支缺口达1.2亿元，且债务滚动压力巨大，债务率逼近红线，多个在建民生项目面临停工风险。',
    choices: [
      { text: '公开压减行政支出，优先保障民生项目，向上争取专项转移支付', meritChange: 18, moralChange: 8, gdpChange: -3, livelihoodChange: 5, ecologyChange: 0, businessChange: -3, description: '透明施策赢得民心，获省财政厅赞赏，债务压力逐步缓解。' },
      { text: '发行城投债填补缺口，维持现有支出结构', meritChange: 5, moralChange: -3, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 3, description: '短期平稳，但债务风险后移。' },
      { text: '拖延不报，寄望下半年土地出让金填补', meritChange: -15, moralChange: -10, gdpChange: -3, livelihoodChange: -5, ecologyChange: 0, businessChange: -3, description: '年底缺口暴露，省财政厅约谈问责，信用评级下调。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 地厅级（rank 7-9）
// ─────────────────────────────────────────────
const EVENTS_CITY: EventTemplate[] = [
  {
    type: 'economic',
    title: 'GDP增速下滑',
    description: '本季度地区GDP增速跌破全省平均水平，排名落至倒数第三，省执政委主要领导点名要求市委书记赴省汇报情况。',
    choices: [
      { text: '召开经济分析会，推出针对性稳增长方案', meritChange: 25, moralChange: 3, gdpChange: 10, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '政策精准发力，下季度增速明显回升。' },
      { text: '赴省诚恳汇报，争取专项支持政策', meritChange: 12, moralChange: 0, gdpChange: 5, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '获得省级政策倾斜，形势逐步好转。' },
      { text: '以客观因素为由解释，请求延期考核', meritChange: -5, moralChange: -5, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '省执政委对推责态度不满，问责压力持续。' },
    ],
  },
  {
    type: 'security',
    title: '跨县群体性事件',
    description: '两县交界处数百名农民因环境污染问题聚集抗议，人数持续增加，已有激进者冲击县政府大门，局势危急。',
    isMajor: true,
    choices: [
      { text: '召开市常委会研判形势，带队赴现场对话疏导，同步启动污染整治', meritChange: 40, moralChange: 10, gdpChange: -5, livelihoodChange: 12, ecologyChange: 15, businessChange: -5, securityChange: 10, description: '沉着应对，化解危机，省执政委批示表扬。' },
      { text: '启动应急预案，加派警力维稳，同步追责污染源', meritChange: 20, moralChange: 0, gdpChange: -3, livelihoodChange: 5, ecologyChange: 8, businessChange: -3, securityChange: 4, description: '局势控制，但被批评处置偏硬。' },
      { text: '等待省级介入，以超出权限为由推卸责任', meritChange: -30, moralChange: -15, gdpChange: -5, livelihoodChange: -10, ecologyChange: -5, businessChange: -5, securityChange: -10, description: '事态恶化，省执政委直接派工作组接管，严厉批评。' },
    ],
  },
  {
    type: 'security',
    title: '重大刑事案件',
    description: '市区发生一起持刀伤人案，造成3死5伤，案犯在逃，社会恐慌蔓延，媒体追问市委市政府的治安举措。',
    choices: [
      { text: '第一时间召开新闻发布会，宣布限期破案并强化巡逻部署', meritChange: 22, moralChange: 5, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: -5, securityChange: 12, description: '48小时内告破，市民安心，形象大幅提升。' },
      { text: '全力配合公安侦破，对外保持低调', meritChange: 10, moralChange: 3, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, securityChange: 5, description: '案件告破，但社会安全感恢复慢。' },
      { text: '将压力完全转嫁给公安局，不予置评', meritChange: -10, moralChange: -8, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: -8, securityChange: -10, description: '被批评推诿，公安系统士气受损。' },
    ],
  },
  {
    type: 'economic',
    title: '地区债务危机',
    description: '城投公司债务违约信号出现，评级机构下调地方信用评级，已有债权人登门催债，银行收紧授信，财政压力骤增。',
    isMajor: true,
    choices: [
      { text: '召开常委会研究化债方案，引入省级国有资本注资', meritChange: 35, moralChange: 5, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '危机有序化解，信用评级恢复，省执政委给予充分肯定。' },
      { text: '组建化债工作组，争取债务展期协议', meritChange: 18, moralChange: 3, gdpChange: -8, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, description: '短期风险缓释，但长期问题未解决。' },
      { text: '压制消息，避免债务问题公开扩散', meritChange: -25, moralChange: -18, gdpChange: -10, livelihoodChange: -5, ecologyChange: 0, businessChange: -10, description: '危机持续发酵，被省财政厅通报预警。' },
    ],
  },
  {
    type: 'corruption',
    title: '联邦国会代表联名质询',
    description: '本市20名联邦国会代表联名提出质询，指出市政工程建设存在系统性腐败嫌疑，相关质询材料已提交省联邦国会监督委。',
    isMajor: true,
    choices: [
      { text: '正式出席联邦国会会议作答，承诺启动独立核查并向省纪委汇报', meritChange: 38, moralChange: 15, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '以负责任姿态回应监督，问题彻查，获省联邦国会肯定。' },
      { text: '组织内部审计，在联邦国会层面寻求解释', meritChange: 15, moralChange: 3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '代表暂时接受，但监督压力持续。' },
      { text: '以程序问题为由拖延答复时间', meritChange: -20, moralChange: -15, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '被省联邦国会要求限时回应，舆论高度关注。' },
    ],
  },
  {
    type: 'economic',
    title: '省属重点企业亏损问责',
    description: '省政府直属一家在本市注册的国有企业连续三年亏损，省国资委要求市委协助展开问责，涉及市国资局官员多人。',
    choices: [
      { text: '积极配合省级调查，同步推动企业改革重组', meritChange: 18, moralChange: 8, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: 3, description: '配合有力，省级肯定，企业走上正轨。' },
      { text: '配合调查的同时力争保留部分市级利益', meritChange: 8, moralChange: -3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '平稳过渡，但被批评立场不够坚定。' },
      { text: '以维稳为由拖延配合', meritChange: -15, moralChange: -12, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '省国资委绕开市委直接处理，面子尽失。' },
    ],
  },
  // ── 新增地厅级事件 ──
  {
    type: 'economic',
    title: '房地产开发商暴雷',
    description: '本市最大楼盘开发商资金链断裂，7个在建楼盘共计4000余名购房者面临烂尾风险，购房者组团上访，银行催贷压力骤增。',
    isMajor: true,
    choices: [
      { text: '成立"保交楼"工作专班，协调国资平台托管续建，妥善处置购房者诉求', meritChange: 45, moralChange: 12, gdpChange: -5, livelihoodChange: 15, ecologyChange: 0, businessChange: -5, description: '保交楼任务全面完成，购房者情绪稳定，获省执政委通报表扬。' },
      { text: '引入其他开发商接盘，争取部分楼盘保交', meritChange: 20, moralChange: 5, gdpChange: -8, livelihoodChange: 8, ecologyChange: 0, businessChange: -8, description: '部分楼盘续建，但仍有千余购房者诉求未解决。' },
      { text: '以"市场风险"为由拒绝政府背书，移交司法处理', meritChange: -25, moralChange: -15, gdpChange: -10, livelihoodChange: -15, ecologyChange: 0, businessChange: -10, description: '购房者群体性维权升级，中央媒体介入曝光，省执政委责成整改。' },
    ],
  },
  {
    type: 'security',
    title: '网络谣言引发恐慌',
    description: '社交媒体出现"本市某水库将溃坝"谣言，已有数万人自发撤离，交通拥堵严重，谣言持续扩散，实际水库安全状态正常。',
    choices: [
      { text: '市委书记亲自出镜直播，公开辟谣并现场展示水库安全数据', meritChange: 22, moralChange: 10, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 3, securityChange: 8, description: '权威声音迅速平息恐慌，市委形象大幅提升。' },
      { text: '通过官方媒体发布辟谣公告，联合公安追查谣言源头', meritChange: 10, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, securityChange: 3, description: '谣言逐步平息，但部分市民仍将信将疑。' },
      { text: '以"不予理会会自然平息"为由暂不介入', meritChange: -15, moralChange: -12, gdpChange: -3, livelihoodChange: -8, ecologyChange: 0, businessChange: -5, securityChange: -8, description: '谣言持续发酵，引发更大社会恐慌，省应急厅要求问责。' },
    ],
  },
  {
    type: 'economic',
    title: '重点企业外迁危机',
    description: '市内纳税额排名前五的制造企业宣布拟将总部及主力产能迁往营商环境更优的省会城市，预计带走税收15亿元及5000个就业岗位。',
    isMajor: true,
    choices: [
      { text: '市委书记亲赴企业谈判，推出定制化留商政策包并快速审批落地', meritChange: 42, moralChange: 5, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '企业决定留下，并宣布扩产，成为全省营商环境标杆。' },
      { text: '提供税收减免和用地优惠，争取保留部分产能', meritChange: 18, moralChange: 3, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '保留了约60%的产能，基本稳住就业。' },
      { text: '以"优化产业结构"为由坦然接受迁移', meritChange: -20, moralChange: -8, gdpChange: -8, livelihoodChange: -8, ecologyChange: 0, businessChange: -10, description: '税收缺口引发一系列连锁反应，被省发改委质询。' },
    ],
  },
  {
    type: 'disaster',
    title: '危化品运输事故',
    description: '深夜一辆运载危化品的罐车在市区公路翻车，泄漏半径已危及周边500米范围内的居民区，情况紧急，伤亡尚不明确。',
    isMajor: true,
    choices: [
      { text: '第一时间启动Ⅰ级应急响应，疏散居民，专业处置队全速驰援', meritChange: 40, moralChange: 12, gdpChange: -3, livelihoodChange: 10, ecologyChange: -5, businessChange: -3, description: '处置迅速，将伤亡降至最低，被应急管理部通报表扬。' },
      { text: '启动常规应急程序，协调消防和公安到场处置', meritChange: 18, moralChange: 5, gdpChange: -3, livelihoodChange: 3, ecologyChange: -8, businessChange: -3, description: '事态受控，有少量财产损失，无重大人员伤亡。' },
      { text: '指示各单位按职责分工自行处置，夜间不开指挥中心', meritChange: -28, moralChange: -18, gdpChange: -5, livelihoodChange: -12, ecologyChange: -10, businessChange: -5, description: '应急响应迟滞，造成一定人员伤亡，引发严肃追责。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 副部省级（rank 10-11）
// ─────────────────────────────────────────────
const EVENTS_PROVINCE: EventTemplate[] = [
  {
    type: 'economic',
    title: '省级财政赤字警报',
    description: '本年度省级财政预计缺口达800亿元，土地财政收入大幅萎缩，社保资金压力骤增，联邦内阁财政部已介入关注。',
    isMajor: true,
    choices: [
      { text: '召开省常委会研究压减非刚性支出，同步向财政部汇报化解方案', meritChange: 45, moralChange: 8, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: 3, description: '方案获中央认可，财政压力有序化解，获通报表扬。' },
      { text: '向联邦内阁申请专项转移支付缓解压力', meritChange: 22, moralChange: 2, gdpChange: -8, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '争取到部分支持，问题缓解但未根本解决。' },
      { text: '加快出让土地回笼资金，压缩民生支出', meritChange: -15, moralChange: -12, gdpChange: 5, livelihoodChange: -15, ecologyChange: -10, businessChange: 5, description: '被联邦内阁发改委点名批评，社会矛盾加剧。' },
    ],
  },
  {
    type: 'disaster',
    title: '重大环境污染事故',
    description: '省内一条主要河流发生大规模工业污染，波及三个地级市，数百万人饮水受威胁，中央环保督察组已宣布进驻。',
    isMajor: true,
    choices: [
      { text: '省执政委紧急部署，启动省级应急预案，书记省长同赴现场', meritChange: 50, moralChange: 12, gdpChange: -8, livelihoodChange: 8, ecologyChange: 20, businessChange: -8, description: '处置有力，中央通报肯定，树立负责任省执政委形象。' },
      { text: '协调相关市县迅速处置，争取在督察进驻前自查整改', meritChange: 25, moralChange: 3, gdpChange: -5, livelihoodChange: 3, ecologyChange: 10, businessChange: -5, description: '整改态度积极，被督察组评为"边查边改"典型。' },
      { text: '延迟上报，试图在中央督察前掩盖污染规模', meritChange: -40, moralChange: -25, gdpChange: 0, livelihoodChange: -10, ecologyChange: -15, businessChange: -5, description: '督察组掌握证据，中央通报批评，主要领导被问责。' },
    ],
  },
  {
    type: 'corruption',
    title: '省内腐败窝案爆发',
    description: '省纪委查明，省内一个地级市多名官员涉及系统性腐败，案件牵涉人数超百人，肃宪督察院已派驻调查组，社会震动极大。',
    isMajor: true,
    choices: [
      { text: '全力配合肃宪督察院调查，省执政委主动向中央汇报，启动系统整治', meritChange: 55, moralChange: 20, gdpChange: -3, livelihoodChange: 5, ecologyChange: 0, businessChange: 0, description: '以零容忍态度赢得中央高度信任，成为全国廉政建设典范。' },
      { text: '配合调查同时稳定干部队伍，防止工作瘫痪', meritChange: 25, moralChange: 8, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '处置稳妥，省级秩序维持，获中央肯定。' },
      { text: '以稳定大局为由要求调查组放缓节奏', meritChange: -35, moralChange: -25, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '被中央认定妨碍调查，主要领导被约谈。' },
    ],
  },
  {
    type: 'security',
    title: '重大工程事故',
    description: '省重点基础设施项目发生坍塌事故，造成15人死亡，工程违规问题被曝光，国家安监局和住建部联合调查组进驻。',
    isMajor: true,
    choices: [
      { text: '立即停工全面排查，省级领导赴现场，追责违规参建方', meritChange: 40, moralChange: 10, gdpChange: -5, livelihoodChange: 5, ecologyChange: 0, businessChange: -5, securityChange: 8, description: '第一时间止损，调查组评价省执政委态度坚决，获通报肯定。' },
      { text: '配合调查，向遇难者家属充分赔偿，低调推进整改', meritChange: 20, moralChange: 5, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, securityChange: 3, description: '事态平稳处置，但省级监管漏洞被指出。' },
      { text: '优先推进工期，对外最小化事故定性', meritChange: -40, moralChange: -30, gdpChange: 3, livelihoodChange: -10, ecologyChange: 0, businessChange: 0, securityChange: -10, description: '被国家调查组定性为瞒报，主要领导被撤职处分。' },
    ],
  },
  {
    type: 'economic',
    title: '外资大规模撤离',
    description: '省内多家跨国企业宣布将生产基地迁往东南亚，涉及就业岗位超10万个，省内经济学家公开批评营商环境恶化。',
    isMajor: true,
    choices: [
      { text: '召开省营商环境紧急整治会，省长亲自约谈外资代表', meritChange: 38, moralChange: 5, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 20, description: '专项政策奏效，部分企业宣布暂缓撤离，营商信心回升。' },
      { text: '推出留商奖励政策，争取三年过渡期', meritChange: 18, moralChange: 0, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 10, description: '部分奏效，损失可控，但结构性问题未解决。' },
      { text: '以产业升级为名放任外资撤离', meritChange: -20, moralChange: -8, gdpChange: -10, livelihoodChange: -12, ecologyChange: 0, businessChange: -15, description: '就业大量流失，引发省内社会稳定问题。' },
    ],
  },
  {
    type: 'opinion',
    title: '省内重大群体性事件',
    description: '某市数千名工人因欠薪问题聚集，冲击市政府，现场警民对峙，事件在全国社交媒体引发广泛关注，中央高度重视。',
    isMajor: true,
    choices: [
      { text: '省执政委书记亲赴现场与工人代表对话，承诺7日内解决欠薪', meritChange: 50, moralChange: 15, gdpChange: -3, livelihoodChange: 15, ecologyChange: 0, businessChange: -3, description: '以担当化解危机，获中央高度评价，成全国样板。' },
      { text: '省政府迅速协调企业补发欠薪，同步维稳', meritChange: 22, moralChange: 5, gdpChange: -3, livelihoodChange: 8, ecologyChange: 0, businessChange: -3, description: '事件平息，舆论好转，但体制性问题待解。' },
      { text: '以警力强制清场，随后再谈赔偿', meritChange: -40, moralChange: -25, gdpChange: -3, livelihoodChange: -15, ecologyChange: 0, businessChange: -5, description: '激化矛盾，引发全国舆论强烈谴责，中央通报批评。' },
    ],
  },
  // ── 新增副部省级事件 ──
  {
    type: 'economic',
    title: '省属国企重大腐败案',
    description: '省检察院对省内最大国有集团董事长启动立案调查，涉案金额逾10亿，省执政委面临是否彻查整个集团管理层的重大抉择。',
    isMajor: true,
    choices: [
      { text: '省执政委常委会一致决定全面配合检察院，并主动向肃宪督察院通报', meritChange: 55, moralChange: 18, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, description: '展现省执政委肃清决心，中央高度认可，省内政治生态明显改善。' },
      { text: '配合调查董事长个人，尽量避免波及集团整体', meritChange: 18, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 3, description: '平稳处置，但肃宪督察院认为力度不足，另行督导。' },
      { text: '以"稳定大局"为由向检察院施压，要求低调处理', meritChange: -45, moralChange: -25, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '干预司法行为被举报，中央巡视组介入，省执政委主要领导受到严肃处理。' },
    ],
  },
  {
    type: 'economic',
    title: '省级重大专项债违规使用',
    description: '审计署发现本省5年内累计违规挪用专项债资金逾80亿元用于填补一般性支出，引发联邦内阁高度关注，要求限期整改并追责。',
    isMajor: true,
    choices: [
      { text: '省长亲自挂帅整改，公开向社会通报处理进度，严肃追责违规责任人', meritChange: 48, moralChange: 15, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: -3, description: '整改彻底，联邦内阁评价高度正面，作为全国财政规范化典型通报。' },
      { text: '制定整改方案向联邦内阁报备，内部处分相关人员', meritChange: 18, moralChange: 3, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '整改完成，但力度被认为偏软，审计署仍持续跟踪。' },
      { text: '以"历史原因"为由对审计结论提出异议，拖延整改', meritChange: -35, moralChange: -18, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '联邦内阁指定工作组驻省督导，省执政委声誉重创。' },
    ],
  },
  {
    type: 'security',
    title: '跨省黑恶势力渗透',
    description: '公安部向省执政委通报：经侦查确认本省多个区县已被跨省黑恶组织系统性渗透，涉及地方政府多名官员，案件高度敏感。',
    choices: [
      { text: '省执政委书记直接对接公安部，启动省级专案组彻查，同步排查涉案官员', meritChange: 40, moralChange: 15, gdpChange: 0, livelihoodChange: 5, ecologyChange: 0, businessChange: 3, securityChange: 15, description: '一举端掉黑恶网络，涉案官员被查处，公安部高度赞扬。' },
      { text: '委托省公安厅主导处置，省执政委保持一定距离', meritChange: 18, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, securityChange: 6, description: '案件推进平稳，但省执政委的主导态度被认为有些保守。' },
      { text: '以"影响社会稳定"为由要求低调处理，不追究官员', meritChange: -35, moralChange: -22, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: -3, securityChange: -12, description: '公安部绕开省执政委直接处置，多名省级官员被肃宪督察院立案。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 正部省级（rank 12-13）
// ─────────────────────────────────────────────
const EVENTS_MINISTRY: EventTemplate[] = [
  {
    type: 'economic',
    title: '部委政策执行重大争议',
    description: '主管部委推出一项新政策，引发全国多省市强烈反弹，数位省执政委书记联名致函联邦内阁要求暂缓执行，政治风险极高。',
    isMajor: true,
    choices: [
      { text: '主动召集各省代表座谈，听取意见，提交联邦内阁修订建议', meritChange: 50, moralChange: 10, gdpChange: 5, livelihoodChange: 8, ecologyChange: 0, businessChange: 10, description: '协调各方利益，政策优化后顺利推进，获总理批示表扬。' },
      { text: '坚持政策立场，选择性回应部分省份诉求', meritChange: 22, moralChange: 0, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '政策推进，但地方摩擦持续。' },
      { text: '强势推行，压制异见声音', meritChange: -25, moralChange: -15, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: -5, description: '被联邦内阁叫停，主要领导被约谈批评。' },
    ],
  },
  {
    type: 'economic',
    title: '全国性行业系统性危机',
    description: '主管行业多家龙头企业同时陷入债务危机，牵涉数十万就业岗位和数千亿债务，联邦内阁责成本部委提交三日内化解方案。',
    isMajor: true,
    choices: [
      { text: '组建跨部委应急专班，联合央行、发改委提出系统性化解方案', meritChange: 60, moralChange: 8, gdpChange: 8, livelihoodChange: 8, ecologyChange: 0, businessChange: 12, description: '方案获联邦内阁批准，危机有序化解，部委获表彰。' },
      { text: '分批化解，优先保障就业，争取银行展期', meritChange: 30, moralChange: 3, gdpChange: 3, livelihoodChange: 5, ecologyChange: 0, businessChange: 5, description: '危机受控，联邦内阁评价"处置合理"。' },
      { text: '寄希望于市场自我修复，延缓干预', meritChange: -40, moralChange: -15, gdpChange: -10, livelihoodChange: -10, ecologyChange: 0, businessChange: -12, description: '危机蔓延，联邦内阁紧急派驻工作组，部委领导被问责。' },
    ],
  },
  {
    type: 'opinion',
    title: '重大外交摩擦',
    description: '主管部委发布的一份政策文件被多个国家解读为立场强硬，引发国际社会广泛争议，外交部向本部委施压要求澄清。',
    isMajor: true,
    choices: [
      { text: '主动与外交部协商，发布补充说明并开展外交沟通', meritChange: 45, moralChange: 8, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '外交紧张消除，国际形象修复，获中央肯定。' },
      { text: '坚持政策解读，委托外交部处理国际舆论', meritChange: 15, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '外交压力缓解，但摩擦未完全消除。' },
      { text: '拒绝修改立场，将责任推给对方国家误读', meritChange: -30, moralChange: -10, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -8, description: '外交局势升级，联邦内阁被迫介入，本部委被批评处置不当。' },
    ],
  },
  {
    type: 'economic',
    title: '国有企业重组风波',
    description: '主管央企重组计划引发大规模员工抗议，工会发表公开声明，多家媒体追问重组是否存在国有资产流失，社会舆论沸腾。',
    isMajor: true,
    choices: [
      { text: '召开部委常委扩大会议，邀请职工代表参与讨论，公开透明推进重组', meritChange: 48, moralChange: 12, gdpChange: 5, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '重组方案优化，员工诉求吸纳，舆论转向正面，联邦内阁通报表扬。' },
      { text: '加大安置补偿力度，快速推进重组', meritChange: 22, moralChange: 3, gdpChange: 5, livelihoodChange: -3, ecologyChange: 0, businessChange: 8, description: '效率优先，部分抗议平息，但舆论监督持续。' },
      { text: '强行推进，以维稳手段处理抗议', meritChange: -35, moralChange: -25, gdpChange: 3, livelihoodChange: -10, ecologyChange: 0, businessChange: 3, description: '引发全国性舆论批评，联邦内阁介入处置，主要领导被约谈。' },
    ],
  },
  {
    type: 'opinion',
    title: '全国性社会舆论危机',
    description: '主管领域一起执法事件被拍摄并在网络广泛传播，质疑声浪迅速席卷全国，人民日报发表批评性评论，国情传导署约谈。',
    isMajor: true,
    choices: [
      { text: '第一时间认错，启动内部调查，责令违规人员停职', meritChange: 42, moralChange: 15, gdpChange: 0, livelihoodChange: 8, ecologyChange: 0, businessChange: 0, description: '坦诚担当，舆情快速平息，中央通报表扬处置得当。' },
      { text: '发表澄清声明，同步开展内部整顿', meritChange: 18, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '危机可控，但外界对诚意存疑。' },
      { text: '以国家利益为由要求媒体撤稿，压制讨论', meritChange: -38, moralChange: -20, gdpChange: 0, livelihoodChange: -5, ecologyChange: 0, businessChange: 0, description: '引发更强烈反弹，国情传导署批评"处置失当"。' },
    ],
  },
  {
    type: 'economic',
    title: '科技领域国际封锁',
    description: '多国宣布联合封锁我国主管领域核心技术出口，涉及芯片、高端装备等关键环节，严重威胁产业链安全。',
    isMajor: true,
    choices: [
      { text: '召开部委紧急会议，启动国产替代攻关专项，联合发改委、财政部制定支持方案', meritChange: 55, moralChange: 8, gdpChange: -5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '国产化攻关加速，中央高度肯定，部委获专项授权。' },
      { text: '通过外交和贸易谈判争取豁免，同步布局自主研发', meritChange: 28, moralChange: 3, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 5, description: '争取到部分缓冲时间，长期压力持续。' },
      { text: '以为时过早为由暂不启动国产替代，等待外交解决', meritChange: -28, moralChange: -10, gdpChange: -8, livelihoodChange: -5, ecologyChange: 0, businessChange: -10, description: '产业损失持续扩大，被联邦内阁批评缺乏战略预判。' },
    ],
  },
  // ── 新增正部省级事件 ──
  {
    type: 'economic',
    title: '部委预算大幅压缩',
    description: '财政部通知本部委年度预算削减18%，多个重大在建项目面临中断风险，研究人员和行政人员超标，需要在效率与稳定间做艰难决策。',
    isMajor: true,
    choices: [
      { text: '主动提出改革方案，优化人员结构，将有限资源集中于核心项目', meritChange: 50, moralChange: 8, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '改革成效显著，财政部将本部委作为机构精简标杆。' },
      { text: '保项目砍行政，维持现有人员规模', meritChange: 22, moralChange: 3, gdpChange: 3, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, description: '核心工作基本稳住，但内部矛盾有所激化。' },
      { text: '向联邦内阁申诉，坚持预算不能削减', meritChange: -15, moralChange: -8, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -3, description: '申诉被驳回，且被认为缺乏大局意识，主要领导被约谈。' },
    ],
  },
  {
    type: 'security',
    title: '部级重大数据泄露事件',
    description: '本部委信息系统遭高水平黑客攻击，大量涉及国计民生的敏感数据存在泄露风险，国家互联网安全部门已紧急介入，追责压力极大。',
    choices: [
      { text: '立即启动最高级别安全响应，全面排查并向中央如实汇报', meritChange: 35, moralChange: 10, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, securityChange: 10, description: '处置及时规范，获中央认可，此后安全体系大幅升级。' },
      { text: '分级隔离受影响系统，修复漏洞后再报告', meritChange: 15, moralChange: 0, gdpChange: 0, livelihoodChange: 0, ecologyChange: 0, businessChange: 0, securityChange: 3, description: '技术层面处置完毕，但延迟报告被认为程序不合规。' },
      { text: '以"危害不大"为由压低级别处理，不启动追责', meritChange: -30, moralChange: -18, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, securityChange: -12, description: '后续数据泄露影响扩散，肃宪督察院直接追责问责，形象严重受损。' },
    ],
  },
  {
    type: 'opinion',
    title: '部委政策引发强烈反弹',
    description: '本部委出台的新规中一项关于市场准入的条款引发工商界和学界的强烈批评，全国两会多名代表联名提出质询，舆论压力持续升温。',
    isMajor: true,
    choices: [
      { text: '主动召开政策解读会并公开征求意见，承诺限期修订争议条款', meritChange: 45, moralChange: 15, gdpChange: 3, livelihoodChange: 5, ecologyChange: 0, businessChange: 8, description: '以开放态度化解危机，政策修订后普遍赞誉，树立立法典范。' },
      { text: '针对代表质询逐条书面回应，适度修改部分表述', meritChange: 18, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 3, description: '争议暂平息，但政策实质未变，外界期待落空。' },
      { text: '坚持政策不变，要求宣传系统引导舆论', meritChange: -25, moralChange: -15, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, description: '逆势压制激化矛盾，联邦内阁介入要求限期重新研究。' },
    ],
  },
];

// ─────────────────────────────────────────────
// 国家级（rank 14-15）
// ─────────────────────────────────────────────
const EVENTS_NATIONAL: EventTemplate[] = [
  {
    type: 'economic',
    title: '国际贸易战升级',
    description: '主要贸易伙伴宣布对我国商品加征高额关税，涉及金额超2万亿人民币，出口企业告急，就业冲击迅速显现，全球市场剧烈波动。',
    isMajor: true,
    choices: [
      { text: '召开联邦政务常委会紧急会议，发布反制清单同步启动多边磋商', meritChange: 60, moralChange: 8, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 15, description: '精准反制赢得主动，国际社会多方斡旋，危机有序化解，历史性外交胜利。' },
      { text: '先谈判争取缓冲期，同步扩大内需拉动增长', meritChange: 35, moralChange: 3, gdpChange: 3, livelihoodChange: 8, ecologyChange: 0, businessChange: 5, description: '损失可控，经济结构获得调整契机。' },
      { text: '保持克制，以静制动，寄望对方主动让步', meritChange: -25, moralChange: -8, gdpChange: -12, livelihoodChange: -8, ecologyChange: 0, businessChange: -15, description: '对方加大施压，经济损失持续扩大，国内批评声浪高涨。' },
    ],
  },
  {
    type: 'economic',
    title: '金融系统性风险',
    description: '国内多家大型商业银行同时出现流动性紧张，资本市场单日跌幅超8%，外资持续流出，央行向联邦内阁紧急报告，触发系统性金融风险预警。',
    isMajor: true,
    choices: [
      { text: '召集央行、金融监管总局、财政部负责人联席研判，启动历史级别流动性注入', meritChange: 65, moralChange: 8, gdpChange: 10, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '危机48小时内受控，金融市场平稳，成功阻断系统性风险传导，载入政策史册。' },
      { text: '定向向问题机构注资，引导市场预期', meritChange: 35, moralChange: 3, gdpChange: 5, livelihoodChange: 3, ecologyChange: 0, businessChange: 8, description: '危机缓释，市场信心部分恢复。' },
      { text: '相信市场自我纠偏机制，暂不干预', meritChange: -45, moralChange: -15, gdpChange: -15, livelihoodChange: -10, ecologyChange: 0, businessChange: -18, description: '危机全面爆发，经济陷入衰退，历史性失职。' },
    ],
  },
  {
    type: 'disaster',
    title: '全国性重大自然灾害',
    description: '强烈地震波及五省，数百万人受灾，基础设施大规模受损，国际社会高度关注，救援物资和人力调配面临空前挑战。',
    isMajor: true,
    choices: [
      { text: '宣布进入国家紧急状态，统一调度全军及国家救援体系全力驰援', meritChange: 65, moralChange: 20, gdpChange: -5, livelihoodChange: 20, ecologyChange: -5, businessChange: -5, description: '救援创历史最快响应纪录，全国凝聚，国际高度赞誉，赢得史诗级政治信任。' },
      { text: '协调各省救援力量并行驰援，联邦内阁成立前线指挥部', meritChange: 38, moralChange: 12, gdpChange: -8, livelihoodChange: 12, ecologyChange: -8, businessChange: -8, description: '救援有序，数十万人获救，获国际社会高度肯定。' },
      { text: '按常规程序逐级汇报处置，等待详细灾情评估', meritChange: -30, moralChange: -20, gdpChange: -10, livelihoodChange: -20, ecologyChange: -10, businessChange: -10, description: '救援黄金时间丧失，伤亡人数激增，成为历史性过失。' },
    ],
  },
  {
    type: 'security',
    title: '国家安全重大危机',
    description: '境外情报机构渗透国家核心机构的案件被证实，涉及国防与科技领域多个部门，国际舆论高度关注，内部整肃需要在维稳与效率间抉择。',
    isMajor: true,
    choices: [
      { text: '召集国家安全委员会全体会议，启动全面排查与系统性安全升级', meritChange: 58, moralChange: 12, gdpChange: -3, livelihoodChange: 3, ecologyChange: 0, businessChange: -5, securityChange: 18, description: '渗透网络彻底清除，安全体系系统升级，国家核心能力大幅强化。' },
      { text: '分步骤精准清查，将干扰降至最低', meritChange: 32, moralChange: 6, gdpChange: -3, livelihoodChange: 0, ecologyChange: 0, businessChange: -3, securityChange: 8, description: '威胁清除，运转稳定，但国际舆论持续施压。' },
      { text: '低调内部处置，对外否认危机存在', meritChange: -35, moralChange: -20, gdpChange: -3, livelihoodChange: -3, ecologyChange: 0, businessChange: -5, securityChange: -15, description: '信息泄露后引发更大信任危机，国家安全委员会要求问责。' },
    ],
  },
  {
    type: 'economic',
    title: '重大科技战略决策',
    description: '国家科学院提交报告：人工智能与量子计算领域中美差距持续拉大，建议实施"举国体制"专项攻关，需联邦内阁拍板定向投入万亿级资源。',
    isMajor: true,
    choices: [
      { text: '常委会全体研究通过，发布国家科技战略新纲领，组建国家实验室集群', meritChange: 62, moralChange: 6, gdpChange: 8, livelihoodChange: 5, ecologyChange: 0, businessChange: 12, description: '举国科技攻关开局，十年后缩小关键差距，成为时代性战略决策。' },
      { text: '试点部分领域先行，评估后再全面推进', meritChange: 30, moralChange: 3, gdpChange: 3, livelihoodChange: 3, ecologyChange: 0, businessChange: 5, description: '稳健推进，但与最佳窗口期存在差距。' },
      { text: '以财政压力为由搁置，等待市场资本主导', meritChange: -30, moralChange: -8, gdpChange: -5, livelihoodChange: -3, ecologyChange: 0, businessChange: -8, description: '差距进一步扩大，被学界批评错失战略窗口期。' },
    ],
  },
  {
    type: 'opinion',
    title: '宪法修正草案重大争议',
    description: '联邦国会法律委员会提交宪法修正草案，涉及土地制度与公民数据权利章节引发社会广泛讨论，学界、媒体、地方代表意见高度分歧。',
    isMajor: true,
    choices: [
      { text: '召开多轮立法听证会，广泛听取各方意见，修订完善后提交联邦国会审议', meritChange: 58, moralChange: 15, gdpChange: 3, livelihoodChange: 8, ecologyChange: 0, businessChange: 3, description: '立法过程开放透明，草案质量大幅提升，联邦国会高票通过，成为宪政典范。' },
      { text: '小范围修改争议条款后提交审议', meritChange: 28, moralChange: 5, gdpChange: 0, livelihoodChange: 3, ecologyChange: 0, businessChange: 0, description: '顺利推进，但部分争议延续。' },
      { text: '坚持原稿，压制异见声音，强行推进审议', meritChange: -35, moralChange: -20, gdpChange: 0, livelihoodChange: -8, ecologyChange: 0, businessChange: 0, description: '引发全社会强烈反响，被认为破坏立法民主化进程，历史评价极差。' },
    ],
  },
];

/**
 * 按玩家职级返回事件模板池
 * rank 1-3  → 乡镇级
 * rank 4-6  → 县处级
 * rank 7-9  → 地厅级
 * rank 10-11→ 副部省级
 * rank 12-13→ 正部省级
 * rank 14-15→ 国家级
 */
function getPoolForRank(rankLevel: number): EventTemplate[] {
  if (rankLevel <= 3) return EVENTS_TOWN;
  if (rankLevel <= 6) return EVENTS_COUNTY;
  if (rankLevel <= 9) return EVENTS_CITY;
  if (rankLevel <= 11) return EVENTS_PROVINCE;
  if (rankLevel <= 13) return EVENTS_MINISTRY;
  return EVENTS_NATIONAL;
}

/** 按职级随机获取一个事件模板 */
export function getRandomEvent(rankLevel = 1): EventTemplate {
  const pool = getPoolForRank(rankLevel);
  return pool[Math.floor(Math.random() * pool.length)];
}


