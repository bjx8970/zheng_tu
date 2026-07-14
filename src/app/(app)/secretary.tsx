// 秘书处页面 — 按职级配备对应办公室人员，全层级开放，功能随职级差异化
import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getOrCreateSecretary, doDocwork, updateSecretarySchedule, updateSecretaryAbility, getSubordinates, getAllReports, appointSubordinate, appointSubAsSecretary, recallSecretary, assignLeadershipRole, assessSubordinate } from '@/db/gameApi';
import type { Secretary, Subordinate, MonthlyReport, PlayerSave } from '@/types/game';
import { gameDaysToDate, getDeptNameByRank, DEPT_CONFIG, LEADERSHIP_ROLES } from '@/types/game';
import type { DeptKey } from '@/types/game';

// ── 文件批示系统 ─────────────────────────────────────────────────────────────
type FilingAction = '批准' | '修改' | '驳回' | '搁置' | null;
interface FilingEff {
  label: string;
  meritGain?: number;
  bossFavorGain?: number;
  cityGdpGain?: number;
  cityLivelihoodGain?: number;
  cityEcologyGain?: number;
  cityBusinessGain?: number;
  securityGain?: number;
}
interface DraftFile {
  id: number;
  icon: string;
  title: string;
  issuer: string;
  urgency: 'high' | 'mid' | 'low';
  category: string;
  summary: string;
  approveEff: FilingEff;
  reviseEff:  FilingEff;
  rejectEff:  FilingEff;
  shelveEff:  FilingEff;
  action: FilingAction;
}

const DRAFT_FILE_POOL: Omit<DraftFile, 'id' | 'action'>[] = [
  { icon: '📈', title: '关于申请重大项目专项资金的请示', issuer: '城乡发展局', urgency: 'high', category: '经济发展',
    summary: '申请基础设施补短板专项资金2000万元，用于城区道路改造及供水管网提升工程，项目可研报告已完成。',
    approveEff: { label: '批准：GDP+4，资金+50，政绩+8', cityGdpGain: 4, meritGain: 8 },
    reviseEff:  { label: '修改：退回完善，政绩+3', meritGain: 3 },
    rejectEff:  { label: '驳回：项目暂缓，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：等待时机，政绩+2', meritGain: 2 } },
  { icon: '👥', title: '关于调整干部职务分工的请示', issuer: '组织人事处', urgency: 'high', category: '干部管理',
    summary: '建议对3名科级干部进行岗位轮换，以进一步充实关键岗位，提升整体工作效能。',
    approveEff: { label: '批准：下属能力提升，政绩+6，上司好感+1', meritGain: 6, bossFavorGain: 1 },
    reviseEff:  { label: '修改：调整方案，政绩+2', meritGain: 2 },
    rejectEff:  { label: '驳回：维持现状，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：后续研究，政绩+1', meritGain: 1 } },
  { icon: '🌿', title: '关于开展生态修复专项行动的方案', issuer: '生态环保局', urgency: 'mid', category: '生态环保',
    summary: '拟对辖区3条入城河道进行综合整治，预计改善生态指数4个点，工期约6个月。',
    approveEff: { label: '批准：生态+4，民生+2，政绩+7', cityEcologyGain: 4, cityLivelihoodGain: 2, meritGain: 7 },
    reviseEff:  { label: '修改：优化方案，政绩+3', meritGain: 3 },
    rejectEff:  { label: '驳回：暂不实施，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：纳入规划，政绩+2', meritGain: 2 } },
  { icon: '🏛️', title: '关于党政机关节约经费的实施方案', issuer: '财政局', urgency: 'low', category: '行政管理',
    summary: '提出压减三公经费支出15%，优化会议管控，推行无纸化办公，预计全年节支120万元。',
    approveEff: { label: '批准：上司好感+2，政绩+5', bossFavorGain: 2, meritGain: 5 },
    reviseEff:  { label: '修改：调整指标，政绩+2', meritGain: 2 },
    rejectEff:  { label: '驳回：执行过严，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：研究后定，政绩+1', meritGain: 1 } },
  { icon: '🚔', title: '关于加强社会治安综合整治的报告', issuer: '公安局', urgency: 'high', category: '社会治理',
    summary: '辖区近期多发电信诈骗案件，建议启动专项整治行动，申请专项经费50万元，预计治安指数提升3点。',
    approveEff: { label: '批准：治安+4，政绩+7', securityGain: 4, meritGain: 7 },
    reviseEff:  { label: '修改：压缩经费，政绩+3', meritGain: 3 },
    rejectEff:  { label: '驳回：内部消化，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：等待上级指示，政绩+2', meritGain: 2 } },
  { icon: '🤝', title: '关于开展对口帮扶合作的请示', issuer: '发展改革局', urgency: 'mid', category: '区域合作',
    summary: '建议与邻市签署产业转移合作协议，引入电子制造企业3家，预计增加就业岗位500个。',
    approveEff: { label: '批准：GDP+3，营商+2，政绩+8', cityGdpGain: 3, cityBusinessGain: 2, meritGain: 8 },
    reviseEff:  { label: '修改：调整条款，政绩+3', meritGain: 3 },
    rejectEff:  { label: '驳回：条件不成熟，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：下季度研究，政绩+2', meritGain: 2 } },
  { icon: '🎓', title: '关于新建社区教育培训中心的立项申请', issuer: '教育体育局', urgency: 'low', category: '民生建设',
    summary: '拟在城南新区建设社区教育培训中心，总投资1200万元，服务居民约3万人，提升民生满意度。',
    approveEff: { label: '批准：民生+4，政绩+6', cityLivelihoodGain: 4, meritGain: 6 },
    reviseEff:  { label: '修改：缩减规模，政绩+2', meritGain: 2 },
    rejectEff:  { label: '驳回：暂无预算，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：纳入明年计划，政绩+2', meritGain: 2 } },
  { icon: '💼', title: '关于举办重大招商引资推介会的方案', issuer: '招商引资办公室', urgency: 'mid', category: '招商引资',
    summary: '拟于下月举办全市招商引资推介会，邀请省内外企业代表200家，预计签约项目总金额超10亿元。',
    approveEff: { label: '批准：营商+3，GDP+2，政绩+9', cityBusinessGain: 3, cityGdpGain: 2, meritGain: 9 },
    reviseEff:  { label: '修改：优化方案，政绩+4', meritGain: 4 },
    rejectEff:  { label: '驳回：时机不当，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：下季度举办，政绩+2', meritGain: 2 } },
  { icon: '⚖️', title: '关于依法处置违规建设行为的报告', issuer: '自然资源局', urgency: 'high', category: '执法监管',
    summary: '发现辖区内3处违规占地建设行为，建议依法立即启动行政执法程序，拆除违建并追缴罚款。',
    approveEff: { label: '批准：治安+2，上司好感+2，政绩+8', securityGain: 2, bossFavorGain: 2, meritGain: 8 },
    reviseEff:  { label: '修改：审慎处置，政绩+3', meritGain: 3 },
    rejectEff:  { label: '驳回：暂缓执法，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：调查核实后再定，政绩+2', meritGain: 2 } },
  { icon: '🌾', title: '关于强化粮食安全保障措施的意见', issuer: '农业农村局', urgency: 'mid', category: '农业安全',
    summary: '建议新增粮食储备库容5万吨，完善粮食应急预案体系，确保辖区粮食安全稳定。',
    approveEff: { label: '批准：民生+3，GDP+2，政绩+7', cityLivelihoodGain: 3, cityGdpGain: 2, meritGain: 7 },
    reviseEff:  { label: '修改：优化储备方案，政绩+3', meritGain: 3 },
    rejectEff:  { label: '驳回：现有库存充足，政绩+1', meritGain: 1 },
    shelveEff:  { label: '搁置：年度规划研究，政绩+1', meritGain: 1 } },
];

function generateDraftFiles(seed: number, count: number): DraftFile[] {
  const pool = [...DRAFT_FILE_POOL];
  const result: DraftFile[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    const rng = Math.abs(Math.sin(seed * 7919 + i * 3571)) % 1;
    let idx = Math.floor(rng * pool.length);
    let tries = 0;
    while (used.has(idx) && tries < 20) { idx = (idx + 1) % pool.length; tries++; }
    used.add(idx);
    result.push({ ...pool[idx], id: i, action: null });
  }
  return result;
}

// ── 舆情管理系统 ─────────────────────────────────────────────────────────────
type OpinionSentiment = 'positive' | 'negative' | 'neutral';
interface PublicOpinion {
  id: number;
  icon: string;
  topic: string;
  source: string;
  sentiment: OpinionSentiment;
  heatLevel: number; // 1-10
  summary: string;
  // 处理选项
  responses: { key: string; label: string; desc: string; eff: { label: string; meritGain?: number; bossFavorGain?: number; cityLivelihoodGain?: number; securityGain?: number } }[];
  chosenResponse: string | null;
}

const OPINION_POOL: Omit<PublicOpinion, 'id' | 'chosenResponse'>[] = [
  { icon: '🎉', topic: '领导班子推动重点项目获居民好评', source: '政务微博', sentiment: 'positive', heatLevel: 7,
    summary: '近期辖区老旧小区改造工程进展顺利，居民代表联名写信表扬政府办实事，相关报道获大量转发。',
    responses: [
      { key: 'amplify', label: '官方扩散宣传', desc: '官方媒体发文扩散正面信息，提升政府形象', eff: { label: '民生+2，上司好感+2，政绩+6', cityLivelihoodGain: 2, bossFavorGain: 2, meritGain: 6 } },
      { key: 'reply', label: '回应表态感谢', desc: '官方账号发表回复，表达对群众理解和支持的感谢', eff: { label: '民生+1，政绩+4', cityLivelihoodGain: 1, meritGain: 4 } },
      { key: 'quiet', label: '保持低调处理', desc: '不过度宣传，正常推进工作', eff: { label: '政绩+2', meritGain: 2 } },
      { key: 'report', label: '形成专报上报', desc: '整理相关信息，形成专题报告报送上级', eff: { label: '上司好感+3，政绩+5', bossFavorGain: 3, meritGain: 5 } },
    ] },
  { icon: '😡', topic: '部分群众反映征地补偿不透明', source: '网络论坛', sentiment: 'negative', heatLevel: 8,
    summary: '网络出现帖子称辖区某村土地征收补偿标准不统一，部分村民反映程序不透明，已引发讨论热议。',
    responses: [
      { key: 'explain', label: '官方公开澄清', desc: '发布情况说明，公开补偿标准及依据，消除误解', eff: { label: '民生+2，热度降低，政绩+5', cityLivelihoodGain: 2, meritGain: 5 } },
      { key: 'visit', label: '派员入户走访', desc: '派专人逐户走访解释政策，收集诉求上报', eff: { label: '民生+3，政绩+7', cityLivelihoodGain: 3, meritGain: 7 } },
      { key: 'delete', label: '联系平台删帖', desc: '联系平台删除相关不实信息', eff: { label: '热度降，但民意-1，政绩+2', cityLivelihoodGain: -1, meritGain: 2 } },
      { key: 'ignore', label: '暂不回应观望', desc: '观察舆情走向，暂不主动介入', eff: { label: '政绩+1，存在扩散风险', meritGain: 1 } },
    ] },
  { icon: '📰', topic: '媒体报道辖区营商环境显著改善', source: '省级媒体', sentiment: 'positive', heatLevel: 6,
    summary: '省内主流媒体刊发深度报道，称赞辖区近年来大力推进"放管服"改革，市场主体满意度大幅提升。',
    responses: [
      { key: 'share', label: '转发扩散报道', desc: '官方账号转发报道，扩大正面影响力', eff: { label: '营商感知+1，上司好感+2，政绩+5', bossFavorGain: 2, meritGain: 5 } },
      { key: 'interview', label: '安排领导专访', desc: '安排主要领导接受媒体专访，进一步发声', eff: { label: '上司好感+3，政绩+7', bossFavorGain: 3, meritGain: 7 } },
      { key: 'quiet', label: '正常接收不主动', desc: '让报道自然传播，不额外干预', eff: { label: '政绩+2', meritGain: 2 } },
      { key: 'compile', label: '整理形成经验总结', desc: '将改革成果梳理形成经验材料，报送上级推广', eff: { label: '上司好感+2，政绩+6', bossFavorGain: 2, meritGain: 6 } },
    ] },
  { icon: '😰', topic: '突发安全事故引发网络关注', source: '网络平台', sentiment: 'negative', heatLevel: 9,
    summary: '辖区一工地发生轻微事故，伤者已第一时间送医，但相关视频在网络扩散，引发舆论对施工安全的质疑。',
    responses: [
      { key: 'response', label: '立即发布通报', desc: '第一时间发布事故处置通报，公布救援进展，占据舆论主动', eff: { label: '热度降低，民心稳，政绩+6', cityLivelihoodGain: 1, meritGain: 6 } },
      { key: 'presser', label: '召开新闻发布会', desc: '安排新闻发布会，官方统一口径，全面回应社会关切', eff: { label: '民生+2，治安+1，政绩+8', cityLivelihoodGain: 2, securityGain: 1, meritGain: 8 } },
      { key: 'mute', label: '管控信息传播', desc: '协调相关平台限制信息扩散', eff: { label: '热度降，但公信力有损，政绩+2', meritGain: 2 } },
      { key: 'wait', label: '等待热度自然消退', desc: '不主动干预，等待舆论自然平息', eff: { label: '政绩+1，存在持续发酵风险', meritGain: 1 } },
    ] },
  { icon: '🌟', topic: '辖区获评全国文明城市典型案例', source: '央级媒体', sentiment: 'positive', heatLevel: 8,
    summary: '辖区在全国文明城市建设中被作为典型案例专题推介，中央媒体刊发深度报道，引发广泛关注。',
    responses: [
      { key: 'celebrate', label: '举办表彰大会', desc: '召开全市表彰大会，表彰作出贡献的集体和个人', eff: { label: '民生+3，上司好感+4，政绩+10', cityLivelihoodGain: 3, bossFavorGain: 4, meritGain: 10 } },
      { key: 'report', label: '向上级专题汇报', desc: '形成专题汇报材料，报送上级党委政府', eff: { label: '上司好感+3，政绩+7', bossFavorGain: 3, meritGain: 7 } },
      { key: 'expand', label: '扩大宣传影响', desc: '在全辖区开展宣传活动，凝聚社会共识', eff: { label: '民生+2，政绩+6', cityLivelihoodGain: 2, meritGain: 6 } },
      { key: 'normal', label: '正常接收不扩大', desc: '低调接收荣誉，继续专注工作', eff: { label: '政绩+3', meritGain: 3 } },
    ] },
  { icon: '😤', topic: '部分市民投诉政务服务效率低下', source: '政务热线', sentiment: 'negative', heatLevel: 6,
    summary: '政务服务热线近期收到多起投诉，反映某部门窗口办事等待时间过长，服务态度较差，引发轻微舆论关注。',
    responses: [
      { key: 'rectify', label: '责令相关部门整改', desc: '下发通知要求相关部门限期整改，公开处理结果', eff: { label: '民生+2，政绩+5', cityLivelihoodGain: 2, meritGain: 5 } },
      { key: 'investigate', label: '开展专项暗访督查', desc: '安排督查组开展暗访，发现问题直接问责', eff: { label: '民生+3，上司好感+1，政绩+7', cityLivelihoodGain: 3, bossFavorGain: 1, meritGain: 7 } },
      { key: 'reply', label: '公开回复投诉群众', desc: '逐一回复群众投诉，公开处理进展', eff: { label: '民生+2，政绩+4', cityLivelihoodGain: 2, meritGain: 4 } },
      { key: 'train', label: '开展服务能力培训', desc: '组织窗口人员开展服务意识与能力培训', eff: { label: '政绩+3', meritGain: 3 } },
    ] },
  { icon: '🌊', topic: '防汛应急响应获网络点赞', source: '本地自媒体', sentiment: 'positive', heatLevel: 5,
    summary: '近期强降雨天气中，辖区防汛应急响应速度快、处置得力，相关视频和报道在本地媒体广泛传播，获得好评。',
    responses: [
      { key: 'thank', label: '发文感谢干群共同努力', desc: '官方致谢一线干部群众，凝聚正能量', eff: { label: '民生+2，治安+1，政绩+5', cityLivelihoodGain: 2, securityGain: 1, meritGain: 5 } },
      { key: 'report', label: '形成经验材料上报', desc: '将应急处置经验整理成材料，报送上级推广', eff: { label: '上司好感+2，政绩+6', bossFavorGain: 2, meritGain: 6 } },
      { key: 'normal', label: '继续正常推进工作', desc: '不刻意宣传，保持正常工作节奏', eff: { label: '政绩+2', meritGain: 2 } },
      { key: 'live', label: '直播防汛抢险一线', desc: '官方账号直播展示应急响应全过程', eff: { label: '民生+3，政绩+7', cityLivelihoodGain: 3, meritGain: 7 } },
    ] },
];

function generateOpinions(seed: number, count: number): PublicOpinion[] {
  const pool = [...OPINION_POOL];
  const result: PublicOpinion[] = [];
  const used = new Set<number>();
  for (let i = 0; i < count; i++) {
    const rng = Math.abs(Math.sin(seed * 6271 + i * 8191)) % 1;
    let idx = Math.floor(rng * pool.length);
    let tries = 0;
    while (used.has(idx) && tries < 20) { idx = (idx + 1) % pool.length; tries++; }
    used.add(idx);
    result.push({ ...pool[idx], id: i, chosenResponse: null });
  }
  return result;
}

// ── 秘书成长等级系统 ──────────────────────────────────────────────────────────
interface SecLevel { level: number; title: string; color: string; min: number; max: number; perks: string[] }
const SEC_LEVELS: SecLevel[] = [
  { level: 1, title: '初级秘书',   color: '#6B7F9E', min: 0,  max: 19,  perks: ['基础公文处理', '日程安排'] },
  { level: 2, title: '助理秘书',   color: '#2B7A4B', min: 20, max: 39,  perks: ['情报初步汇总', '辅助联络协调'] },
  { level: 3, title: '主任秘书',   color: '#1D3B5E', min: 40, max: 59,  perks: ['决策预研参考', '接待安排统筹', '文件批示辅助'] },
  { level: 4, title: '资深秘书',   color: '#7B3B9E', min: 60, max: 79,  perks: ['深度情报研判', '危机预警推送', '舆情趋势分析'] },
  { level: 5, title: '首席秘书',   color: '#B8860B', min: 80, max: 100, perks: ['全权代理授权', '顶层战略参谋', '核心机密管理'] },
];
function getSecLevel(ability: number): SecLevel {
  return SEC_LEVELS.find(l => ability >= l.min && ability <= l.max) ?? SEC_LEVELS[0];
}

// ── 候选秘书生成系统 ─────────────────────────────────────────────────────────
const SURNAMES = ['王','李','张','刘','陈','杨','赵','黄','周','吴','徐','孙','马','朱','胡'];
const MALE_GIVEN = ['建国','志远','明辉','伟强','永康','晓峰','思远','国栋','正阳','鸿飞','天翼','启明'];
const FEMALE_GIVEN = ['晓燕','雅琴','文静','佳慧','淑华','美玲','思雨','婷婷','丽媛','菁菁','静雯','芳华'];
const SPECIALTIES = ['公文处理','情报收集','干部协调','政务研究','危机处置'] as const;
const TRAIT_MAP: Record<string, string> = {
  '公文处理': '文字功底扎实，熟悉党政公文规范，办文效率极高',
  '情报收集': '消息灵通，善于观察人际动态，信息汇报及时准确',
  '干部协调': '人缘广泛，善于润滑关系，协调干部矛盾经验丰富',
  '政务研究': '政策敏锐度强，善于分析研判，可为决策提供参谋建议',
  '危机处置': '心理素质过硬，遇突发事件沉着冷静，处置能力出众',
};
const BACKGROUND_MAP: Record<string, string[]> = {
  '公文处理': ['前县委办文书科长','省委办研究生','机关文字秘书出身'],
  '情报收集': ['曾任组织部干事','纪检监察室工作多年','与多方关系深厚'],
  '干部协调': ['历任多个部门联络员','善于跨部门沟通','官场人脉丰富'],
  '政务研究': ['政策研究室出身','有省级智库挂职经历','理论功底扎实'],
  '危机处置': ['曾处理多起群体事件','维稳工作经验丰富','应急处置能手'],
};

interface SecretaryCandidate {
  id: number;
  name: string;
  gender: 'male' | 'female';
  ability: number;
  loyalty: number;
  specialty: typeof SPECIALTIES[number];
  background: string;
}

function generateCandidates(rankLevel: number, seed: number): SecretaryCandidate[] {
  const abilityBase = Math.min(60 + rankLevel * 3, 85);
  return Array.from({ length: 5 }, (_, i) => {
    const rng = (offset: number) => {
      const x = Math.sin(seed * 9301 + i * 49297 + offset * 233) * 93847;
      return x - Math.floor(x);
    };
    const gender: 'male' | 'female' = rng(1) > 0.45 ? 'male' : 'female';
    const given = gender === 'male' ? MALE_GIVEN[Math.floor(rng(2) * MALE_GIVEN.length)] : FEMALE_GIVEN[Math.floor(rng(2) * FEMALE_GIVEN.length)];
    const surname = SURNAMES[Math.floor(rng(3) * SURNAMES.length)];
    const specialty = SPECIALTIES[Math.floor(rng(4) * SPECIALTIES.length)];
    const bgs = BACKGROUND_MAP[specialty];
    return {
      id: i,
      name: surname + given,
      gender,
      ability: Math.round(abilityBase + rng(5) * 15 - 5),
      loyalty: Math.round(50 + rng(6) * 40),
      specialty,
      background: bgs[Math.floor(rng(7) * bgs.length)],
    };
  });
}

type Tab = 'main' | 'filing' | 'opinion' | 'coord' | 'appoint' | 'todo' | 'report' | 'draft' | 'apply' | 'transfer' | 'guard' | 'inspect';

// ── 公共工具：将 DraftEffect 转换为 updateGameSave 所需的字段增量 ──────────
interface DraftEffect {
  label: string;
  meritGain?: number;
  bossFavorGain?: number;
  cityGdpGain?: number;
  cityLivelihoodGain?: number;
  cityEcologyGain?: number;
  cityBusinessGain?: number;
  securityGain?: number;
  fundGain?: number;
  subLoyaltyGain?: number;
  subAbilityGain?: number;
  subIntegrityGain?: number;
}

function buildEffectUpdates(save: PlayerSave, eff: DraftEffect): Partial<PlayerSave> {
  const u: Partial<PlayerSave> = {};
  if (eff.meritGain)          u.meritPoints    = save.meritPoints + eff.meritGain;
  if (eff.bossFavorGain)      u.bossFavor      = Math.min(100, save.bossFavor + eff.bossFavorGain);
  if (eff.cityGdpGain)        u.cityGdp        = Math.min(100, save.cityGdp + eff.cityGdpGain);
  if (eff.cityLivelihoodGain) u.cityLivelihood = Math.min(100, save.cityLivelihood + eff.cityLivelihoodGain);
  if (eff.cityEcologyGain)    u.cityEcology    = Math.min(100, save.cityEcology + eff.cityEcologyGain);
  if (eff.cityBusinessGain)   u.cityBusiness   = Math.min(100, save.cityBusiness + eff.cityBusinessGain);
  if (eff.securityGain)       u.securityIndex  = Math.min(100, save.securityIndex + eff.securityGain);
  if (eff.fundGain)           u.fundBalance    = (save.fundBalance ?? 0) + eff.fundGain;
  return u;
}

/** 对所有在岗下属批量执行评估增益（统一替代多处 Promise.all + assessSubordinate 循环） */
async function applySubEffects(
  subordinates: Subordinate[],
  eff: DraftEffect,
  gameDays: number,
): Promise<void> {
  const loy = eff.subLoyaltyGain ?? 0;
  const abi = eff.subAbilityGain ?? 0;
  const int = eff.subIntegrityGain ?? 0;
  if (!loy && !abi && !int) return;
  await Promise.all(
    subordinates
      .filter(s => s.isAppointed)
      .map(s => assessSubordinate(s.id, gameDays, abi, loy, int, 0)),
  );
}

// ── 秘书处职位体系（全层级，参照现实） ─────────────────────────────────
interface SecretaryConfig {
  title: string;           // 秘书/办公室主任头衔
  officeTitle: string;     // 办公室名称
  subTitle: string;        // 秘书职级说明
  abilityMax: number;      // 能力值上限
  docworkGainBonus: number;
  features: string[];      // 解锁功能
  badge: string;
  canRecommend: boolean;   // 是否可推荐干部任职
  canIntelligence: boolean;// 是否可收集情报
  canCounsel: boolean;     // 是否可决策参谋
}

// 参照现实：镇长（rank1-2）无专属秘书；正科级镇长（rank3）可配党政办主任兼助；县级（rank4+）起才有专属秘书
// rank1-2无秘书，在页面层拦截不进入此配置
const SECRETARY_CONFIG: Record<number, SecretaryConfig> = {
  3:  {
    title: '党政办主任', officeTitle: '党政综合办公室', subTitle: '（正科级，兼任）',
    abilityMax: 70, docworkGainBonus: 1, badge: '基层',
    features: ['公文处理', '日程安排'],
    canRecommend: false, canIntelligence: false, canCounsel: false,
  },
  4:  {
    title: '县委办秘书', officeTitle: '县委办公室', subTitle: '（副科级）',
    abilityMax: 74, docworkGainBonus: 2, badge: '初级',
    features: ['公文处理', '日程安排', '起草文件'],
    canRecommend: false, canIntelligence: false, canCounsel: false,
  },
  5:  {
    title: '县委办主任秘书', officeTitle: '县委办公室', subTitle: '（正科级）',
    abilityMax: 78, docworkGainBonus: 3, badge: '初级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请'],
    canRecommend: true, canIntelligence: false, canCounsel: false,
  },
  6:  {
    title: '县委办主任', officeTitle: '县委办公室', subTitle: '（正科级）',
    abilityMax: 80, docworkGainBonus: 4, badge: '初级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报'],
    canRecommend: true, canIntelligence: true, canCounsel: false,
  },
  7:  {
    title: '市委办副主任秘书', officeTitle: '市委办公室', subTitle: '（副处级）',
    abilityMax: 82, docworkGainBonus: 6, badge: '中级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调'],
    canRecommend: true, canIntelligence: true, canCounsel: false,
  },
  8:  {
    title: '市委办主任', officeTitle: '市委办公室', subTitle: '（正处级）',
    abilityMax: 85, docworkGainBonus: 8, badge: '中级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  9:  {
    title: '市委秘书长', officeTitle: '市委办公室', subTitle: '（正处/副厅级）',
    abilityMax: 87, docworkGainBonus: 10, badge: '高级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  10: {
    title: '省执政委办公厅副主任', officeTitle: '省执政委办公厅', subTitle: '（副厅级）',
    abilityMax: 89, docworkGainBonus: 12, badge: '高级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '省级协调'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  11: {
    title: '省执政委秘书长', officeTitle: '省执政委办公厅', subTitle: '（正厅级）',
    abilityMax: 92, docworkGainBonus: 14, badge: '高级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '省级协调'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  12: {
    title: '联邦内阁部委秘书长', officeTitle: '联邦内阁办公厅', subTitle: '（副部级）',
    abilityMax: 94, docworkGainBonus: 16, badge: '核心',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '联邦内阁协调'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  13: {
    title: '党务总枢府办公厅副主任', officeTitle: '党务总枢府办公厅', subTitle: '（正部级）',
    abilityMax: 97, docworkGainBonus: 18, badge: '核心',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '联邦政务院联络'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  14: {
    title: '党务总枢府办公厅主任', officeTitle: '党务总枢府办公厅', subTitle: '（正国级）',
    abilityMax: 100, docworkGainBonus: 20, badge: '最高',
    features: ['全权代理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '最高级情报'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
};

function getSecretaryConfig(rankLevel: number): SecretaryConfig {
  const levels = Object.keys(SECRETARY_CONFIG).map(Number).sort((a, b) => a - b);
  let cfg = SECRETARY_CONFIG[levels[0]]; // rank3兜底
  for (const lv of levels) {
    if (rankLevel >= lv) cfg = SECRETARY_CONFIG[lv];
  }
  return cfg;
}

// ── 干部推荐任职：可推荐到哪些职位 ───────────────────────────────────────
// 玩家通过秘书协调，将下属推荐到适合职位（相当于组织部协调）
const RECOMMEND_POSITIONS: { label: string; pos: 'head' | 'deputy' | 'staff'; desc: string }[] = [
  { label: '推荐为正职（局长/主任）', pos: 'head',   desc: '担任该部门主要负责人，需能力70+' },
  { label: '推荐为副职（副局长）',   pos: 'deputy', desc: '担任该部门副职，需能力55+' },
  { label: '推荐为科员（工作人员）', pos: 'staff',  desc: '安排具体工作岗位，无能力门槛' },
];

const TALK_TOPICS = [
  { icon: '📋', label: '工作汇报', desc: '询问近期工作进展，了解下属动态', loyaltyDelta: +2 },
  { icon: '⚠️', label: '批评告诫', desc: '就失职行为进行批评教育', loyaltyDelta: -5 },
  { icon: '🤝', label: '关怀慰问', desc: '嘘寒问暖，增进关系', loyaltyDelta: +5 },
  { icon: '📌', label: '委派重任', desc: '委以重要任务，表达信任', loyaltyDelta: +3 },
];

const SCHEDULE_TEMPLATES = [
  '08:00 晨会·部署当日工作\n10:00 接待来访群众\n14:00 项目现场视察\n16:00 部门工作汇报',
  '09:00 政务会议\n11:00 信访接待\n14:30 调研走访\n17:00 文件批阅',
  '08:30 党委扩大会议\n11:00 招商引资座谈\n15:00 工程项目调研\n18:00 专题研讨',
];

// ── 职级分层辅助 ─────────────────────────────────────────────
// 1-3:乡科  4-6:县处  7-9:市厅  10-11:省部  12+:国家
function getRankTier(rankLevel: number): 1 | 2 | 3 | 4 | 5 {
  if (rankLevel <= 3)  return 1;
  if (rankLevel <= 6)  return 2;
  if (rankLevel <= 9)  return 3;
  if (rankLevel <= 11) return 4;
  return 5;
}
const TIER_LABEL: Record<number, string> = { 1: '乡科级', 2: '县处级', 3: '市厅级', 4: '省部级', 5: '国家级' };

// ── 下发文件效果类型（已移至文件顶部 buildEffectUpdates 工具函数） ──────────

interface DraftTemplate {
  icon: string;
  title: string;
  category: string;
  desc: string;
  tier: 1 | 2 | 3 | 4 | 5;
  effect: DraftEffect;
  content: (city: string, playerName: string, rankName: string) => string;
}

const DRAFT_TEMPLATES: DraftTemplate[] = [
  // ══════════════ 乡科级（1-3）══════════════
  {
    icon: '📋', tier: 1, title: '关于开展人居环境整治的通知',
    category: '乡村治理',
    desc: '部署村庄清洁行动，改善农村卫生和居住环境',
    effect: { label: '民生+3，政绩+5', cityLivelihoodGain: 3, meritGain: 5 },
    content: (city, name, rankName) =>
      `关于在${city}辖区开展人居环境整治专项行动的通知\n\n各村（居）委会：\n\n为切实改善农村人居环境，按照县委、县政府部署要求，现就开展人居环境整治专项行动有关事项通知如下：\n\n一、整治范围\n\n全镇各行政村及自然村组，重点抓好村庄道路、房前屋后、公共区域清洁整治。\n\n二、主要任务\n\n（一）清理生活垃圾、农业废弃物及乱堆乱放；\n（二）疏通整治排水沟渠，消除积水点；\n（三）规范畜禽养殖管理，推进"厕所革命"。\n\n三、工作要求\n\n各村组长为第一责任人，每周报送整治进度，镇政府将组织检查验收。\n\n${city}镇人民政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌾', tier: 1, title: '关于加强春耕生产保障的工作方案',
    category: '农业生产',
    desc: '统筹调配农资供应，保障辖区粮食生产',
    effect: { label: 'GDP+2，民生+2，政绩+6', cityGdpGain: 2, cityLivelihoodGain: 2, meritGain: 6 },
    content: (city, name, rankName) =>
      `关于切实做好${city}辖区春耕生产保障工作的方案\n\n各村（居）委会、农业服务站：\n\n当前正值春耕备耕关键时期，为确保粮食生产安全，保障农民增收，特制定本方案。\n\n一、目标任务\n\n确保粮食种植面积不减少，良种推广率达90%以上，化肥农药使用量负增长。\n\n二、主要措施\n\n（一）组织农技人员深入田间地头开展技术指导；\n（二）协调供销社做好农资储备保障，杜绝假冒伪劣；\n（三）落实惠农政策宣传，确保补贴及时兑付到位；\n（四）加强气象灾害预警，完善应急处置预案。\n\n${city}镇人民政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🏛️', tier: 1, title: '关于加强基层党建规范化建设的意见',
    category: '党建工作',
    desc: '规范村级党组织运作，强化党员管理和教育',
    effect: { label: '下属忠诚+3，下属廉洁+2，政绩+7，上司好感+1', subLoyaltyGain: 3, subIntegrityGain: 2, meritGain: 7, bossFavorGain: 1 },
    content: (city, name, rankName) =>
      `关于加强${city}基层党建规范化建设的意见\n\n各党支部：\n\n为进一步夯实基层党组织战斗堡垒作用，根据上级组织部门要求，提出以下意见。\n\n一、严格执行"三会一课"制度\n\n各支部每月至少召开一次支委会、一次党员大会，每季度讲一次党课，书记亲自上课。\n\n二、推行党员积分制管理\n\n从政治理论学习、志愿服务、联系群众、完成急难险重任务等方面对党员进行积分考核。\n\n三、开展"主题党日"活动\n\n每月固定一天为"主题党日"，围绕中心工作开展有内涵、有实效的党建活动。\n\n四、建立党员档案动态管理机制\n\n及时更新党员基本信息，流动党员须进行报到登记。\n\n${city}镇党委\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '⚖️', tier: 1, title: '关于开展矛盾纠纷排查化解的通知',
    category: '综治维稳',
    desc: '排查化解基层矛盾，维护辖区社会稳定',
    effect: { label: '治安+3，政绩+6', securityGain: 3, meritGain: 6 },
    content: (city, name, rankName) =>
      `关于在${city}开展矛盾纠纷大排查大化解专项行动的通知\n\n各村（居）综治网格员：\n\n为将矛盾纠纷化解在萌芽状态，维护辖区社会和谐稳定，即日起开展矛盾纠纷大排查大化解专项行动。\n\n一、排查重点\n\n土地纠纷、邻里矛盾、婚姻家庭纠纷、涉法涉诉及群体性隐患。\n\n二、化解措施\n\n坚持"调解优先"，综合运用法律、行政、教育手段。对涉及重大利益的矛盾，提请上级部门协同化解。\n\n三、工作要求\n\n排查情况每周报告，重大风险即时上报，做到事事有记录、件件有回音。\n\n${city}镇综治中心\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 县处级（4-6）══════════════
  {
    icon: '📈', tier: 2, title: '关于推进重点招商引资项目落地的工作方案',
    category: '经济发展',
    desc: '出台优惠政策吸引优质企业，推动项目快速落地',
    effect: { label: 'GDP+4，营商+3，政绩+10', cityGdpGain: 4, cityBusinessGain: 3, meritGain: 10 },
    content: (city, name, rankName) =>
      `关于推进${city}重点招商引资项目落地的工作方案\n\n各乡镇、各相关部门：\n\n为加快经济高质量发展，发挥区位比较优势，吸引更多优质企业落地，制定本方案。\n\n一、招商重点领域\n\n优先引进先进制造业、农产品加工、商贸物流及特色文旅产业，鼓励电商企业和返乡创业项目。\n\n二、优惠政策\n\n（一）新引进规上企业，给予一次性奖补；\n（二）对新建标准厂房企业提供2年租金补贴；\n（三）为高层次人才提供安家补贴及优惠住房。\n\n三、服务保障\n\n建立"一企一专员"跟踪服务机制，全程代办各类审批，重大项目报县委县政府协调推进。\n\n${city}县（区）人民政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🏗️', tier: 2, title: '关于加快推进城乡基础设施建设的决定',
    category: '基础建设',
    desc: '统筹推进道路、供水、污水处理等基础设施项目',
    effect: { label: 'GDP+3，民生+3，政绩+10', cityGdpGain: 3, cityLivelihoodGain: 3, meritGain: 10 },
    content: (city, name, rankName) =>
      `关于加快推进${city}城乡基础设施建设的决定\n\n各乡镇、相关部门：\n\n基础设施是高质量发展的重要支撑。为补齐制约发展的基础设施短板，作出如下决定。\n\n一、重点建设任务\n\n（一）新建改建农村公路，打通"最后一公里"；\n（二）完善城区供水、排水及污水处理设施；\n（三）加快推进5G基站和数字乡村基础设施建设；\n（四）实施老旧小区改造，改善群众居住条件。\n\n二、资金来源\n\n综合运用政府专项债、财政预算资金和社会资本，建立项目清单，明确建设时序。\n\n三、推进机制\n\n实行项目负责制，县级领导挂帅督导重点项目，将建设进度纳入年度考核。\n\n${city}县委、县政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '📋', tier: 2, title: '关于深化"放管服"改革优化营商环境的实施意见',
    category: '行政改革',
    desc: '压缩审批时限、推行"最多跑一次"，提升市场主体满意度',
    effect: { label: '营商+4，政绩+9，上司好感+1', cityBusinessGain: 4, meritGain: 9, bossFavorGain: 1 },
    content: (city, name, rankName) =>
      `关于深化${city}"放管服"改革优化营商环境的实施意见\n\n为进一步激发市场活力，降低制度性交易成本，提升${city}营商环境综合排名，提出以下实施意见。\n\n一、深化行政审批改革\n\n全面梳理权责清单，精简不必要审批，企业注册登记时间压缩至1个工作日。\n\n二、推行"一窗受理"模式\n\n整合各部门窗口服务，实行前台综合受理、后台分类办理，推进电子证照互认。\n\n三、建立政企沟通机制\n\n定期召开企业家座谈会，设立营商环境投诉举报热线，对投诉事项限期回复。\n\n四、加强事中事后监管\n\n推广"双随机一公开"监管模式，防止监管缺位与过度干预并存。\n\n${city}县（区）政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌿', tier: 2, title: '关于推进农村生活污水治理的工作方案',
    category: '生态环保',
    desc: '整治农村污水排放，改善农村生态环境质量',
    effect: { label: '生态+4，民生+2，政绩+8', cityEcologyGain: 4, cityLivelihoodGain: 2, meritGain: 8 },
    content: (city, name, rankName) =>
      `关于推进${city}农村生活污水治理的工作方案\n\n各乡镇人民政府、生态环保局：\n\n农村生活污水治理是农村人居环境整治的重要内容。现制定本工作方案。\n\n一、目标任务\n\n到年底，行政村生活污水处理覆盖率达70%以上，黑臭水体全面消除。\n\n二、主要举措\n\n（一）因地制宜选择纳管处理、集中处理、分散处理等模式；\n（二）加强已建污水处理设施运营管护；\n（三）将污水治理纳入乡村建设评价指标。\n\n三、资金保障\n\n积极申请省级农村污水治理专项资金，县级配套不少于20%。\n\n${city}县委、县政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 市厅级（7-9）══════════════
  {
    icon: '🔬', tier: 3, title: '关于推进科技创新驱动高质量发展的实施方案',
    category: '创新发展',
    desc: '搭建创新平台，引育科技人才，推动产学研深度融合',
    effect: { label: 'GDP+5，营商+4，政绩+14，上司好感+2', cityGdpGain: 5, cityBusinessGain: 4, meritGain: 14, bossFavorGain: 2 },
    content: (city, name, rankName) =>
      `关于推进${city}科技创新驱动高质量发展的实施方案\n\n各县（市、区）、市直相关部门：\n\n科技创新是推动高质量发展的第一动力。为充分激活${city}科技创新活力，制定本方案。\n\n一、发展目标\n\n全社会研发投入占GDP比重达2.8%，高新技术企业数量年均增长25%，国家级创新平台实现突破。\n\n二、重点举措\n\n（一）支持龙头企业牵头建设省级重点实验室，开展关键技术攻关；\n（二）实施"人才强市"战略，引进海内外高层次创新人才不少于500名；\n（三）推动高校院所与企业共建创新联合体，促进科技成果就地转化；\n（四）设立市级科技创新引导基金，引导社会资本加大研发投入。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌆', tier: 3, title: '关于加快新型城镇化建设的若干意见',
    category: '城镇化发展',
    desc: '提升城市综合承载力，推进城乡一体化协调发展',
    effect: { label: 'GDP+4，民生+4，政绩+13', cityGdpGain: 4, cityLivelihoodGain: 4, meritGain: 13 },
    content: (city, name, rankName) =>
      `关于加快${city}新型城镇化建设的若干意见\n\n各县（市、区）、市直相关部门：\n\n加快新型城镇化建设，是扩大内需、促进经济高质量发展的战略举措。现提出以下意见。\n\n一、优化城镇空间格局\n\n构建以中心城区为核心、县城为骨干、特色小镇为补充的多层次城镇体系。\n\n二、提升城市承载能力\n\n加快城市更新改造，补齐停车、排涝、绿化等基础设施短板，推进智慧城市建设。\n\n三、深化农业转移人口市民化\n\n加快户籍制度改革，完善随迁子女就学、社会保障等公共服务保障。\n\n四、推进城乡融合发展\n\n建立城乡产业协同发展机制，鼓励工商资本下乡，促进乡村振兴与城镇化协调推进。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🛡️', tier: 3, title: '关于加强社会治理创新提升城市安全水平的决定',
    category: '社会治理',
    desc: '完善立体化社会治安防控体系，提升城市本质安全水平',
    effect: { label: '治安+5，民生+2，下属廉洁+3，政绩+12，下属能力+2', securityGain: 5, cityLivelihoodGain: 2, meritGain: 12, subAbilityGain: 2, subIntegrityGain: 3 },
    content: (city, name, rankName) =>
      `关于加强${city}社会治理创新提升城市安全水平的决定\n\n各相关部门：\n\n为持续提升${city}城市安全治理能力现代化水平，作出如下决定。\n\n一、构建立体化防控体系\n\n整合公安、综治、应急等部门力量，建设市域社会治理综合指挥平台，实现"一网统管"。\n\n二、深化平安${city}建设\n\n推进"雪亮工程"向农村延伸，扩大社会面视频覆盖率，压降刑事案件发案率。\n\n三、创新基层治理模式\n\n推广"网格化+大数据"治理模式，配齐配强网格员队伍，做到"人在格中走、事在网中办"。\n\n四、加强安全生产监管\n\n开展重点行业安全生产专项整治，严防各类重特大事故发生。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌿', tier: 3, title: '关于坚决打好污染防治攻坚战的实施方案',
    category: '生态文明',
    desc: '系统推进大气、水、土壤污染治理，改善生态环境质量',
    effect: { label: '生态+5，民生+3，政绩+13，上司好感+1', cityEcologyGain: 5, cityLivelihoodGain: 3, meritGain: 13, bossFavorGain: 1 },
    content: (city, name, rankName) =>
      `关于${city}坚决打好污染防治攻坚战的实施方案\n\n各县（市、区）、市直生态环境部门：\n\n为深入贯彻习近平生态文明思想，坚决打好蓝天、碧水、净土三大保卫战，制定本方案。\n\n一、打好蓝天保卫战\n\nPM2.5年均浓度下降10%，空气质量优良天数比率达85%以上。\n\n二、打好碧水保卫战\n\n县级以上集中式饮用水水源地水质达标率100%，消灭劣V类断面。\n\n三、打好净土保卫战\n\n受污染耕地安全利用率达90%，危险废物处置率100%。\n\n四、制度保障\n\n实行生态环境保护"一票否决"，对造成严重环境问题的，依法追究责任。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 省部级（10-11）══════════════
  {
    icon: '🏭', tier: 4, title: '关于加快构建现代化产业体系的决定',
    category: '产业政策',
    desc: '优化产业结构，培育壮大新兴产业，推动制造业转型升级',
    effect: { label: 'GDP+7，营商+5，政绩+20，上司好感+2', cityGdpGain: 7, cityBusinessGain: 5, meritGain: 20, bossFavorGain: 2 },
    content: (city, name, rankName) =>
      `关于加快构建${city}现代化产业体系的决定\n\n各市（州）、省直相关部门：\n\n构建现代化产业体系是高质量发展的重要基础。省执政委、省政府作出如下决定。\n\n一、战略目标\n\n到"十五五"末，全省GDP突破XX万亿，先进制造业占规上工业比重超50%，数字经济规模居全国前列。\n\n二、重点任务\n\n（一）聚焦打造3-5个具有全国竞争力的产业集群；\n（二）深化国有企业改革，推进战略性重组整合；\n（三）加大对"专精特新"企业政策扶持力度；\n（四）构建"链主企业—配套企业—公共服务平台"产业生态圈。\n\n三、政策保障\n\n省级财政每年安排不低于100亿元产业发展引导基金，撬动社会资本共同参与。\n\n${city}省执政委、省政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🎓', tier: 4, title: '关于深化高等教育改革提升创新人才培养质量的意见',
    category: '教育科技',
    desc: '推进高校学科建设，优化人才培养模式，服务区域发展战略',
    effect: { label: '民生+5，下属能力+3，政绩+16', cityLivelihoodGain: 5, subAbilityGain: 3, meritGain: 16 },
    content: (city, name, rankName) =>
      `关于深化${city}高等教育改革提升创新人才培养质量的意见\n\n各高等院校、省教育厅：\n\n高等教育是科技第一生产力和人才第一资源的重要结合点。为服务全省经济社会发展战略需求，提出以下意见。\n\n一、优化学科专业结构\n\n根据产业发展需求动态调整学科专业，大力发展新工科、新医科、新农科和新文科。\n\n二、深化产教融合\n\n支持高校与行业龙头企业共建产业学院，推行"工程师培养"订单式人才培养模式。\n\n三、提升科研创新能力\n\n引导高校聚焦关键技术攻关，承接省重大科研专项，推动科研成果在省内转化落地。\n\n四、加强高层次人才引育\n\n实施"省杰青""省特支计划"，打造区域人才高地，防止人才外流。\n\n${city}省执政委、省政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌉', tier: 4, title: '关于推进区域协调发展的战略部署',
    category: '区域战略',
    desc: '统筹推进城乡区域协调，构建优势互补的区域经济格局',
    effect: { label: 'GDP+6，生态+3，下属廉洁+4，政绩+18，上司好感+3', cityGdpGain: 6, cityEcologyGain: 3, meritGain: 18, bossFavorGain: 3, subIntegrityGain: 4 },
    content: (city, name, rankName) =>
      `关于推进${city}区域协调发展的战略部署\n\n各市（州）、省直相关部门：\n\n促进区域协调发展，是贯彻新发展理念、构建新发展格局的内在要求。省执政委、省政府作出以下战略部署。\n\n一、构建"一核多极"区域格局\n\n做强省会城市核心引领，培育区域性中心城市，形成多点支撑的发展格局。\n\n二、推进山区帮扶振兴\n\n制定差异化政策，加大对欠发达地区转移支付力度，鼓励发达地区结对帮扶。\n\n三、深化省际合作\n\n主动融入国家重大区域发展战略，积极承接产业转移，拓展发展空间。\n\n四、完善生态补偿机制\n\n建立横向生态补偿机制，推进跨区域流域综合治理，实现绿色协调发展。\n\n${city}省执政委、省政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 国家级（12+）══════════════
  {
    icon: '🇨🇳', tier: 5, title: '关于深化供给侧结构性改革的指导意见',
    category: '宏观经济',
    desc: '优化要素配置，化解过剩产能，推动经济高质量发展',
    effect: { label: 'GDP+10，营商+6，下属廉洁+5，政绩+30，上司好感+4', cityGdpGain: 10, cityBusinessGain: 6, meritGain: 30, bossFavorGain: 4, subIntegrityGain: 5 },
    content: (_city, name, rankName) =>
      `关于深化供给侧结构性改革推动经济高质量发展的指导意见\n\n各省（自治区、直辖市）人民政府，各部委：\n\n当前经济运行面临的结构性矛盾依然突出，深化供给侧结构性改革是推动高质量发展的根本举措。\n\n一、总体目标\n\n"十五五"期间，全要素生产率持续提升，经济结构明显优化，发展质量和效益显著提高。\n\n二、重点任务\n\n（一）持续推进去产能、去库存，淘汰落后产能；\n（二）加快推进制度型开放，激发市场主体活力；\n（三）深化财税金融改革，优化资源配置效率；\n（四）强化国家战略科技力量，突破"卡脖子"技术瓶颈。\n\n三、保障措施\n\n联邦内阁建立协调推进机制，定期督导，将改革任务完成情况纳入省级政府绩效考核。\n\n联邦内阁\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌏', tier: 5, title: '关于推进高水平对外开放的战略部署',
    category: '对外开放',
    desc: '拓展国际合作空间，主动融入全球价值链，推进制度型开放',
    effect: { label: 'GDP+8，营商+7，政绩+28，上司好感+3', cityGdpGain: 8, cityBusinessGain: 7, meritGain: 28, bossFavorGain: 3 },
    content: (_city, name, rankName) =>
      `关于推进高水平对外开放的战略部署\n\n各省（自治区、直辖市）人民政府，各部委、委员会：\n\n对外开放是我国的基本国策。在世界百年未有之大变局背景下，加快推进高水平对外开放意义重大。\n\n一、战略方向\n\n稳步扩大规则、规制、管理、标准等制度型开放，主动对接高标准国际经贸规则。\n\n二、重点举措\n\n（一）高质量推进自由贸易试验区扩区提级；\n（二）深化"一带一路"高质量共建，拓展多元化市场；\n（三）完善外商投资促进和保护法律体系，提升外资吸引力；\n（四）推进跨境数据流动、数字贸易等新领域规则谈判。\n\n联邦内阁\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🏥', tier: 5, title: '关于深化医疗卫生体制改革的决定',
    category: '民生保障',
    desc: '破解看病难看病贵难题，健全全民医疗保障和公共卫生服务体系',
    effect: { label: '民生+8，下属廉洁+5，政绩+25，下属忠诚+3', cityLivelihoodGain: 8, meritGain: 25, subLoyaltyGain: 3, subIntegrityGain: 5 },
    content: (_city, name, rankName) =>
      `关于深化医疗卫生体制改革的决定\n\n各省（自治区、直辖市），联邦内阁各部委、委员会：\n\n深化医疗卫生体制改革，是保障和改善民生的重大举措，是维护社会公平正义的内在要求。\n\n一、改革目标\n\n到2030年，基本建立覆盖城乡居民的基本医疗卫生制度，人均预期寿命达到79岁以上。\n\n二、重点任务\n\n（一）推进公立医院综合改革，破除以药补医机制；\n（二）健全分级诊疗制度，引导优质医疗资源下沉基层；\n（三）深化医保支付方式改革，建立DRG/DIP付费体系；\n（四）加快推进罕见病用药保障，将更多新药纳入医保目录。\n\n联邦内阁\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
];

// ── 辅助申请类型 ──────────────────────────────────────────────
interface ApplyType {
  icon: string;
  title: string;
  category: string;
  desc: string;
  condition: string;
  successRate: number;
  tier: 1 | 2 | 3 | 4 | 5;
  effect: {
    label: string;
    meritGain?: number;
    bossFavorGain?: number;
    cityGdpGain?: number;
    cityLivelihoodGain?: number;
    cityEcologyGain?: number;
    cityBusinessGain?: number;
    securityGain?: number;
    fundGain?: number;
    subLoyaltyGain?: number;
    subAbilityGain?: number;
    subIntegrityGain?: number;  // 下属廉洁度增益
  };
  failEffect?: { label: string; meritGain?: number };
}

const APPLY_TYPES: ApplyType[] = [
  // ══════════════ 乡科级（1-3）══════════════
  {
    icon: '🏅', tier: 1, title: '申请"文明村镇"称号',
    category: '表彰激励',
    desc: '向县级文明办申报文明村镇荣誉称号，提升辖区形象',
    condition: '需治安及民生指数≥40，由县级文明委评审',
    successRate: 0.75,
    effect: { label: '民生+3，治安+2，下属廉洁+2，政绩+8，上司好感+1', cityLivelihoodGain: 3, securityGain: 2, meritGain: 8, bossFavorGain: 1, subIntegrityGain: 2 },
    failEffect: { label: '评审未通过，政绩+2', meritGain: 2 },
  },
  {
    icon: '💰', tier: 1, title: '申请农村基础设施补短板专项资金',
    category: '资金争取',
    desc: '向县财政申请农村道路、水利、电网等基础设施补短板专项资金',
    condition: '需提交项目清单，由县发改委和财政局联合审批',
    successRate: 0.6,
    effect: { label: '资金+30万，政绩+5', fundGain: 30, meritGain: 5 },
    failEffect: { label: '申请未获批，政绩+1', meritGain: 1 },
  },
  {
    icon: '🌾', tier: 1, title: '申请粮食生产功能区认定',
    category: '农业发展',
    desc: '申报粮食生产功能区认定，争取农业补贴和政策支持',
    condition: '需具备一定规模连片耕地，由县农业农村局评审',
    successRate: 0.7,
    effect: { label: 'GDP+2，民生+2，政绩+6', cityGdpGain: 2, cityLivelihoodGain: 2, meritGain: 6 },
    failEffect: { label: '认定材料不足，政绩+1', meritGain: 1 },
  },
  {
    icon: '🎓', tier: 1, title: '申请基层干部培训名额',
    category: '干部培养',
    desc: '向县委组织部申请干部学院或党校培训名额',
    condition: '向县委组织部申请，名额有限按需分配',
    successRate: 0.8,
    effect: { label: '下属能力+3，政绩+5', subAbilityGain: 3, meritGain: 5 },
    failEffect: { label: '本批名额已满，政绩+1', meritGain: 1 },
  },

  // ══════════════ 县处级（4-6）══════════════
  {
    icon: '🏆', tier: 2, title: '申请年度县级先进集体',
    category: '表彰激励',
    desc: '由秘书代拟年度优秀集体申报材料，经市级主管部门评审',
    condition: '需政绩值≥50，由市级主管部门评审',
    successRate: 0.75,
    effect: { label: '政绩+12，下属忠诚+4，上司好感+2', meritGain: 12, subLoyaltyGain: 4, bossFavorGain: 2 },
    failEffect: { label: '申报未通过，政绩+3', meritGain: 3 },
  },
  {
    icon: '🏗️', tier: 2, title: '申请县域重点项目立项',
    category: '项目申报',
    desc: '对重大基础设施和产业项目进行立项申请，争取省市支持',
    condition: '需工可研报告完整，经市发改委审批',
    successRate: 0.65,
    effect: { label: 'GDP+3，资金+60万，政绩+10', cityGdpGain: 3, fundGain: 60, meritGain: 10 },
    failEffect: { label: '项目暂缓立项，政绩+2', meritGain: 2 },
  },
  {
    icon: '💰', tier: 2, title: '申请基础设施补短板专项债',
    category: '资金争取',
    desc: '面向省市发改、财政部门争取基础设施专项债，加快补齐民生短板',
    condition: '需提交项目清单和偿债方案，省市级审批',
    successRate: 0.5,
    effect: { label: 'GDP+3，民生+3，资金+120万，政绩+14', cityGdpGain: 3, cityLivelihoodGain: 3, fundGain: 120, meritGain: 14 },
    failEffect: { label: '专项债未获批，政绩+4', meritGain: 4 },
  },
  {
    icon: '🌿', tier: 2, title: '申报国家级生态示范区',
    category: '品牌建设',
    desc: '以生态建设成果为基础，申报国家级生态文明建设示范县（市）',
    condition: '生态指数须≥55，经省生态环境厅评审报国家评定',
    successRate: 0.55,
    effect: { label: '生态+5，营商+3，政绩+15，上司好感+2', cityEcologyGain: 5, cityBusinessGain: 3, meritGain: 15, bossFavorGain: 2 },
    failEffect: { label: '申报未通过，政绩+4', meritGain: 4 },
  },

  // ══════════════ 市厅级（7-9）══════════════
  {
    icon: '🌟', tier: 3, title: '申报全国文明城市',
    category: '品牌建设',
    desc: '争创全国文明城市称号，全面提升城市形象和软实力',
    condition: '需综合指数较高，由中央文明办组织测评',
    successRate: 0.5,
    effect: { label: '民生+5，治安+4，下属廉洁+3，政绩+20，上司好感+3', cityLivelihoodGain: 5, securityGain: 4, meritGain: 20, bossFavorGain: 3, subIntegrityGain: 3 },
    failEffect: { label: '本届未入选，政绩+5', meritGain: 5 },
  },
  {
    icon: '💼', tier: 3, title: '申请国家级经济技术开发区',
    category: '开发区建设',
    desc: '向商务部申请升格为国家级经济技术开发区，争取更多政策支持',
    condition: '需省级开发区运营3年以上，报商务部审批',
    successRate: 0.45,
    effect: { label: 'GDP+6，营商+5，资金+200万，政绩+22', cityGdpGain: 6, cityBusinessGain: 5, fundGain: 200, meritGain: 22 },
    failEffect: { label: '申请暂缓，政绩+6', meritGain: 6 },
  },
  {
    icon: '🎓', tier: 3, title: '申请高层次人才引进专项资金',
    category: '人才引育',
    desc: '向省级人才办申请高层次人才引进补贴和安家费专项资金',
    condition: '需提供引才计划和岗位说明，省人才办审批',
    successRate: 0.7,
    effect: { label: '下属能力+4，下属忠诚+3，政绩+16', subAbilityGain: 4, subLoyaltyGain: 3, meritGain: 16 },
    failEffect: { label: '本批资金已分配完，政绩+4', meritGain: 4 },
  },
  {
    icon: '🤝', tier: 3, title: '申请区域协调发展合作框架协议',
    category: '区域合作',
    desc: '与周边城市签署战略合作协议，拓展区域合作空间',
    condition: '双方主要领导达成意向，经省政府备案',
    successRate: 0.8,
    effect: { label: 'GDP+4，营商+4，政绩+18，上司好感+2', cityGdpGain: 4, cityBusinessGain: 4, meritGain: 18, bossFavorGain: 2 },
    failEffect: { label: '合作暂搁置，政绩+4', meritGain: 4 },
  },

  // ══════════════ 省部级（10-11）══════════════
  {
    icon: '🏅', tier: 4, title: '申请国家重大战略项目落地',
    category: '战略布局',
    desc: '向国家发改委等部委争取重大战略性项目在本省落地',
    condition: '需充分准备可研材料，报国家发改委审核',
    successRate: 0.5,
    effect: { label: 'GDP+8，营商+6，资金+500万，政绩+28', cityGdpGain: 8, cityBusinessGain: 6, fundGain: 500, meritGain: 28 },
    failEffect: { label: '项目暂未批复，政绩+7', meritGain: 7 },
  },
  {
    icon: '🌱', tier: 4, title: '申报国家绿色发展示范省',
    category: '生态战略',
    desc: '全面推进绿色转型，争创国家绿色发展示范省称号',
    condition: '生态、民生、GDP等综合指数均衡，报生态环境部',
    successRate: 0.55,
    effect: { label: '生态+7，民生+4，政绩+25，上司好感+4', cityEcologyGain: 7, cityLivelihoodGain: 4, meritGain: 25, bossFavorGain: 4 },
    failEffect: { label: '申报未通过，政绩+7', meritGain: 7 },
  },
  {
    icon: '🎓', tier: 4, title: '申请"双一流"高校建设资金',
    category: '科教战略',
    desc: '向教育部争取省内高校入选"双一流"及配套建设经费',
    condition: '需高校有突出学科优势，教育部评审',
    successRate: 0.6,
    effect: { label: '民生+6，下属能力+5，政绩+22', cityLivelihoodGain: 6, subAbilityGain: 5, meritGain: 22 },
    failEffect: { label: '本批未能入选，政绩+6', meritGain: 6 },
  },

  // ══════════════ 国家级（12+）══════════════
  {
    icon: '🌐', tier: 5, title: '提请联邦国会审议重大法律修订',
    category: '立法工作',
    desc: '就社会高度关注的法律问题提请联邦国会常委会审议修订',
    condition: '需充分调研论证，提交法律修订草案',
    successRate: 0.65,
    effect: { label: '民生+10，下属忠诚+5，下属廉洁+6，政绩+40，上司好感+5', cityLivelihoodGain: 10, subLoyaltyGain: 5, meritGain: 40, bossFavorGain: 5, subIntegrityGain: 6 },
    failEffect: { label: '草案需进一步完善，政绩+10', meritGain: 10 },
  },
  {
    icon: '💹', tier: 5, title: '申请设立国家级产业投资基金',
    category: '战略投资',
    desc: '向联邦内阁申请设立国家级战略性新兴产业投资基金',
    condition: '需经财政部、发改委联合评审，联邦内阁审批',
    successRate: 0.55,
    effect: { label: 'GDP+12，营商+8，资金+2000万，政绩+45', cityGdpGain: 12, cityBusinessGain: 8, fundGain: 2000, meritGain: 45 },
    failEffect: { label: '方案需调整，政绩+12', meritGain: 12 },
  },
  {
    icon: '🤝', tier: 5, title: '推动签署重大国际合作协议',
    category: '外交合作',
    desc: '主导推进与主要经济体签署贸易、科技等领域合作协议',
    condition: '需外交部协调，双方谈判达成一致后正式签署',
    successRate: 0.7,
    effect: { label: 'GDP+10，营商+9，政绩+38，上司好感+4', cityGdpGain: 10, cityBusinessGain: 9, meritGain: 38, bossFavorGain: 4 },
    failEffect: { label: '谈判暂未达成，政绩+10', meritGain: 10 },
  },
];

// ── 情报汇报（中高层解锁）──────────────────────────────────────
const INTEL_ITEMS = [
  { icon: '👁️', title: '下属动态分析',   desc: '梳理在岗干部近期言行，识别异常情况',          gain: '政绩+5，风险-2' },
  { icon: '📡', title: '舆情监控报告',   desc: '汇总互联网及民间舆论，提前预判风险',           gain: '稳定+3，政绩+4' },
  { icon: '🤝', title: '上级意图研判',   desc: '分析上级最近动态，研判政策走向',               gain: '上司好感+3' },
  { icon: '🏢', title: '关键部门摸底',   desc: '了解关键部门实际运转情况与内部生态',           gain: '政绩+6' },
];

// ── 决策参谋（高层解锁）────────────────────────────────────────
const COUNSEL_ITEMS = [
  { icon: '💡', title: '重大事项预研',   desc: '就即将面临的重要决策提供专业意见',             gain: '政绩+8，风险-3' },
  { icon: '⚖️', title: '政策利弊评估',   desc: '对拟出台政策进行系统性利弊评估',               gain: 'GDP+2，政绩+6' },
  { icon: '🎯', title: '重点工作排序',   desc: '结合当前形势帮助排定工作优先级',               gain: '政绩+7，效率+5' },
];

// ── 警卫处 ─────────────────────────────────────────────────────
interface GuardConfig {
  level: string; totalGuards: number; personalGuards: number;
  vehicleGuards: number; residenceGuards: number; rank: string; upgradeDesc: string;
}
function getGuardConfig(rankLevel: number): GuardConfig {
  if (rankLevel >= 14) return { level: '国家领导人警卫规格', totalGuards: 100, personalGuards: 12, vehicleGuards: 20, residenceGuards: 68, rank: '中央警卫局直属', upgradeDesc: '总理警卫工作由中央警卫局统筹安排，配备专属警卫车队及驻地警卫分队' };
  if (rankLevel >= 13) return { level: '副国级警卫规格', totalGuards: 60, personalGuards: 8, vehicleGuards: 12, residenceGuards: 40, rank: '中央警卫局协管', upgradeDesc: '晋升正国级后警卫升格为国家领导人规格' };
  if (rankLevel >= 12) return { level: '省部级警卫规格', totalGuards: 20, personalGuards: 4, vehicleGuards: 4, residenceGuards: 12, rank: '省公安厅/中央直属', upgradeDesc: '晋升副国级后可申请升格警卫规格' };
  if (rankLevel >= 10) return { level: '厅局级警卫规格', totalGuards: 8, personalGuards: 2, vehicleGuards: 2, residenceGuards: 4, rank: '省公安厅统一安排', upgradeDesc: '晋升省部级后可申请配备更高规格警卫' };
  if (rankLevel >= 8)  return { level: '市厅级警卫规格', totalGuards: 4, personalGuards: 1, vehicleGuards: 1, residenceGuards: 2, rank: '市公安局配备', upgradeDesc: '晋升副省级后升格为厅局级警卫规格' };
  if (rankLevel >= 6)  return { level: '处级安保规格', totalGuards: 2, personalGuards: 1, vehicleGuards: 0, residenceGuards: 1, rank: '县公安局配备', upgradeDesc: '晋升市厅级后配备正式警卫规格' };
  return { level: '暂无专属警卫', totalGuards: 0, personalGuards: 0, vehicleGuards: 0, residenceGuards: 0, rank: '—', upgradeDesc: '晋升至县处级（6级）后方可配备安保' };
}
const GUARD_TASKS = [
  { icon: '🔍', name: '安全审查', desc: '对即将参加的重要活动进行安全预评估', cost: 20, secGain: 2 },
  { icon: '🚨', name: '反侦察演练', desc: '组织警卫人员进行应急处置演练', cost: 50, secGain: 5 },
  { icon: '🏛️', name: '住所安保升级', desc: '对住所及办公室进行安保升级', cost: 100, secGain: 8 },
  { icon: '🛡️', name: '特勤装备更换', desc: '为警卫配备新型防护装备', cost: 200, secGain: 12 },
];

// ── 巡查督导：各部门督导配置 ─────────────────────────────────
interface InspectConfig {
  goodFindings: string[];
  issueFindings: string[];
  meritBase: number;
  effectDesc: string;
  effectKey: Partial<{ meritGain: number; cityGdpGain: number; cityLivelihoodGain: number; cityEcologyGain: number; cityBusinessGain: number; securityGain: number; subLoyaltyGain: number }>;
}
const DEPT_INSPECT: Record<DeptKey, InspectConfig> = {
  police:       { goodFindings: ['巡逻覆盖率达标，辖区案件同比下降'], issueFindings: ['发现个别执法人员行为不规范，责令整改'], meritBase: 8,  effectDesc: '治安+2，政绩+8',  effectKey: { securityGain: 2,       meritGain: 8 } },
  ndrc:         { goodFindings: ['重点项目推进有序，审批流程优化明显'], issueFindings: ['项目报批材料积压，流程存在梗阻'],           meritBase: 9,  effectDesc: 'GDP+2，政绩+9',   effectKey: { cityGdpGain: 2,        meritGain: 9 } },
  finance:      { goodFindings: ['预算执行规范，资金拨付及时到位'],     issueFindings: ['发现财务报表存在瑕疵，要求补正'],           meritBase: 8,  effectDesc: '政绩+8',          effectKey: { meritGain: 8 } },
  urban:        { goodFindings: ['在建项目进度达标，施工安全规范'],     issueFindings: ['工程台账记录不全，督促完善'],               meritBase: 8,  effectDesc: 'GDP+1，民生+1',   effectKey: { cityGdpGain: 1,  cityLivelihoodGain: 1, meritGain: 8 } },
  education:    { goodFindings: ['教学质量稳步提升，师资配备到位'],     issueFindings: ['学校安全隐患需尽快排查整改'],               meritBase: 9,  effectDesc: '民生+3，政绩+9',  effectKey: { cityLivelihoodGain: 3, meritGain: 9 } },
  health:       { goodFindings: ['医疗服务质量好评率较高，运转正常'],   issueFindings: ['部分基层卫生院设施老化，提出更新计划'],       meritBase: 9,  effectDesc: '民生+2，政绩+9',  effectKey: { cityLivelihoodGain: 2, meritGain: 9 } },
  ecology:      { goodFindings: ['环境监测数据达标，执法处理到位'],     issueFindings: ['个别企业排污指标临界，需加强监控'],           meritBase: 10, effectDesc: '生态+2，政绩+10', effectKey: { cityEcologyGain: 2,    meritGain: 10 } },
  market:       { goodFindings: ['市场监管到位，违规行为有效遏制'],     issueFindings: ['发现虚假广告问题，已立案调查'],               meritBase: 8,  effectDesc: '营商+2，政绩+8',  effectKey: { cityBusinessGain: 2,   meritGain: 8 } },
  agriculture:  { goodFindings: ['农业技术指导入户，惠农政策落实良好'], issueFindings: ['部分农资补贴未及时兑付，督促落实'],            meritBase: 8,  effectDesc: '民生+2，政绩+8',  effectKey: { cityLivelihoodGain: 2, meritGain: 8 } },
  personnel:    { goodFindings: ['干部档案管理规范，培训体系完善'],     issueFindings: ['发现人事档案存在信息缺漏'],                   meritBase: 9,  effectDesc: '下属忠诚+2，政绩+9', effectKey: { subLoyaltyGain: 2, meritGain: 9 } },
  invest:       { goodFindings: ['招商引资进展顺利，签约项目兑现率高'], issueFindings: ['部分项目对接联络不及时，需跟进督促'],          meritBase: 10, effectDesc: 'GDP+2，营商+1',  effectKey: { cityGdpGain: 2,  cityBusinessGain: 1, meritGain: 10 } },
  tax:          { goodFindings: ['税收征管规范，重点税源稳定'],         issueFindings: ['个别纳税人欠缴问题需重点跟进'],               meritBase: 8,  effectDesc: '政绩+8',          effectKey: { meritGain: 8 } },
  petition:     { goodFindings: ['信访事项及时化解，零积案'],           issueFindings: ['发现部分信访事项处理程序需规范'],             meritBase: 8,  effectDesc: '治安+1，民生+1',  effectKey: { securityGain: 1, cityLivelihoodGain: 1, meritGain: 8 } },
  organization: { goodFindings: ['党建工作扎实推进，组织生活正常化'],   issueFindings: ['基层党支部"三会一课"记录不完整'],             meritBase: 9,  effectDesc: '下属忠诚+2，政绩+9', effectKey: { subLoyaltyGain: 2, meritGain: 9 } },
  propaganda:   { goodFindings: ['主旋律宣传深入人心，社会风气积极'],     issueFindings: ['部分媒体报道存在导向偏差问题'],               meritBase: 8,  effectDesc: '民生+2，政绩+8',   effectKey: { subLoyaltyGain: 0, meritGain: 8 } },
  discipline:   { goodFindings: ['党风廉政建设有力推进，干部作风明显好转'], issueFindings: ['个别干部存在违规接受宴请行为'],              meritBase: 10, effectDesc: '上司满意+2，政绩+10', effectKey: { subLoyaltyGain: 1, meritGain: 10 } },
  govoffice:    { goodFindings: ['政务协调高效，文件流转规范有序'],         issueFindings: ['部分报告材料质量有待提升'],                  meritBase: 8,  effectDesc: '上司满意+2，政绩+8', effectKey: { subLoyaltyGain: 0, meritGain: 8 } },
  industry:     { goodFindings: ['工业园区招商引资形势良好'],               issueFindings: ['部分企业环保合规问题需跟进'],                meritBase: 7,  effectDesc: 'GDP+2，政绩+7',    effectKey: { subLoyaltyGain: 0, meritGain: 7 } },
  naturalres:   { goodFindings: ['土地规划管理规范，无违规占地问题'],       issueFindings: ['矿产资源开采手续存在历史遗留问题'],           meritBase: 7,  effectDesc: '生态+2，政绩+7',   effectKey: { subLoyaltyGain: 0, meritGain: 7 } },
  construction: { goodFindings: ['老旧小区改造进度超预期，群众满意度高'],   issueFindings: ['部分工程存在质量隐患，需整改'],               meritBase: 8,  effectDesc: '民生+2，政绩+8',   effectKey: { subLoyaltyGain: 0, meritGain: 8 } },
  transport:    { goodFindings: ['农村公路硬化完成率达标，出行明显改善'],   issueFindings: ['国道部分路段病害较严重，亟需修缮'],           meritBase: 7,  effectDesc: '营商+1，政绩+7',   effectKey: { subLoyaltyGain: 0, meritGain: 7 } },
  health2:      { goodFindings: ['基层卫生院服务能力显著提升'],             issueFindings: ['个别村卫生室药品储备不足'],                  meritBase: 8,  effectDesc: '民生+3，政绩+8',   effectKey: { subLoyaltyGain: 0, meritGain: 8 } },
};

// ── 可复用操作行组件 ─────────────────────────────────────────────────────
interface SecActionRowProps {
  icon: string; title: string; desc: string; effect: string;
  onPress: () => void; disabled?: boolean; done?: boolean;
  btnLabel?: string; btnColor?: string; accentColor?: string;
}
function SecActionRow({ icon, title, desc, effect, onPress, disabled, done, btnLabel = '执行', btnColor = '#1D3B5E', accentColor }: SecActionRowProps) {
  const ac = accentColor ?? btnColor;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || done}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: done ? '#F9F9F9' : '#EEF2F7', opacity: done ? 0.7 : 1 }}
      android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
    >
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : ac }}>{title}</Text>
        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{desc}</Text>
        <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>预期：{effect}</Text>
      </View>
      {done ? (
        <Text style={{ fontSize: 10, color: '#888' }}>✓ 已完成</Text>
      ) : (
        <View style={{ backgroundColor: btnColor, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{btnLabel}</Text>
        </View>
      )}
    </Pressable>
  );
}

function AbilityBar({ value }: { value: number }) {
  const color = value >= 60 ? '#2a7a3b' : value >= 30 ? '#e07a00' : '#C82829';
  return (
    <View style={{ height: 8, backgroundColor: '#e8e8e6', marginTop: 4, flex: 1 }}>
      <View style={{ height: 8, width: `${value}%`, backgroundColor: color }} />
    </View>
  );
}

export default function SecretaryPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [secretary, setSecretary] = useState<Secretary | null>(null);
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('main');
  const [selectedSub, setSelectedSub] = useState<Subordinate | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [scheduleText, setScheduleText] = useState('');
  const [draftIdx, setDraftIdx] = useState<number | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftDone, setDraftDone] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [acting, setActing] = useState(false);
  const [applyDone, setApplyDone] = useState<Set<number>>(new Set());
  const [intelDone, setIntelDone] = useState<Set<number>>(new Set());
  const [counselDone, setCounselDone] = useState<Set<number>>(new Set());
  const [recSub, setRecSub]   = useState<Subordinate | null>(null);
  const [recDept, setRecDept] = useState<DeptKey | null>(null);
  const [recPos,  setRecPos]  = useState<'head' | 'deputy' | 'staff' | null>(null);
  const [recResult, setRecResult] = useState('');
  // 任命秘书
  const [appointSub, setAppointSub] = useState<Subordinate | null>(null);
  // 调任官职
  const [transferRoleKey, setTransferRoleKey] = useState<string | null>(null);
  // 巡查督导
  const [inspectDone, setInspectDone] = useState<Set<DeptKey>>(new Set());
  const [inspectResults, setInspectResults] = useState<Record<string, { text: string; isIssue: boolean }>>({});
  // 候选秘书选择
  const [showCandidates, setShowCandidates] = useState(false);
  const [candidates, setCandidates] = useState<SecretaryCandidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<SecretaryCandidate | null>(null);
  const [confirmingCandidate, setConfirmingCandidate] = useState(false);
  // 文件批示系统
  const [draftFiles, setDraftFiles] = useState<DraftFile[]>([]);
  const [filingDone, setFilingDone] = useState<Set<number>>(new Set());
  // 舆情管理系统
  const [opinions, setOpinions] = useState<PublicOpinion[]>([]);
  const [opinionDone, setOpinionDone] = useState<Set<number>>(new Set());
  // 公务协调 tabs（合并原recommend/上下协调/接待）
  const [coordSubTab, setCoordSubTab] = useState<'contact' | 'reception' | 'recommend' | 'pref'>('contact');
  // 联络操作每日冷却（30游戏天），通过 saveResult 持久化，无需本地 state

  const showMsg = (text: string, ok = true) => {
    setMsg(text); setMsgOk(ok);
    setTimeout(() => setMsg(''), 4000);
  };

  // 文件刷新批次计数（每次"刷新一批"+1，改变种子）
  const [filingRefreshCount, setFilingRefreshCount] = useState(0);

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    try {
      const [sec, subs, rpts] = await Promise.all([
        getOrCreateSecretary(save.id, save.userId),
        getSubordinates(save.id),
        getAllReports(save.id),
      ]);
      setSecretary(sec);
      setSubordinates(subs);
      setReports(rpts);
      if (sec?.dailySchedule) setScheduleText(sec.dailySchedule);
      // 每次进入页面生成文件批示 & 舆情数据（基于当前游戏时间做种子，filingRefreshCount不影响load触发的重置）
      const fileSeed = (save.gameDays ?? 0) * 31 + save.rankLevel * 7;
      const fileCount = 3 + (save.rankLevel >= 6 ? 2 : save.rankLevel >= 4 ? 1 : 0);
      const generatedFiles = generateDraftFiles(fileSeed, fileCount);
      setDraftFiles(generatedFiles);
      // 按月份持久化已处理文件集合，下月新种子即为新文件（自动刷新）
      const filingMonthKey = Math.floor((save.gameDays ?? 0) / 30);
      const savedDone = getResult('sec_filing_done_' + filingMonthKey);
      if (savedDone?.desc) {
        try {
          const doneIds: number[] = JSON.parse(savedDone.desc);
          setFilingDone(new Set(doneIds));
        } catch { setFilingDone(new Set()); }
      } else {
        setFilingDone(new Set());
      }
      setFilingRefreshCount(0);
      const opinionSeed = (save.gameDays ?? 0) * 53 + save.rankLevel * 11;
      const opinionCount = save.rankLevel >= 8 ? 3 : save.rankLevel >= 5 ? 2 : 1;
      setOpinions(generateOpinions(opinionSeed, opinionCount));
      setOpinionDone(new Set());
      // 检测是否需要展示候选秘书选择（晋升后首次进入 OR 从未选过）
      const needCandidate =
        save.rankLevel >= 3 &&
        (save.secretaryCandidateRank ?? 0) !== save.rankLevel &&
        (!sec || !sec.isAppointed);
      if (needCandidate) {
        const seed = save.rankLevel * 1000 + (save.gameDays ?? 0);
        setCandidates(generateCandidates(save.rankLevel, seed));
        setShowCandidates(true);
      }
    } catch (e) {
      // 捕获异常，防止白屏闪退
    }
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  // ── hooks 必须在任何条件 return 之前调用 ────────────────────────────────
  // 危机扫描（memoized，基于 save 派生，无额外查询）
  const crisisItems = useMemo(() => {
    if (!save) return [];
    const items: { icon: string; label: string; level: 'high' | 'mid' | 'low' }[] = [];
    if ((save.fundBalance ?? 0) < 50)        items.push({ icon: '💸', label: `资金余额仅${save.fundBalance ?? 0}万，财政风险高`, level: 'high' });
    if (save.bossFavor < 30)                  items.push({ icon: '😰', label: `上司好感度${save.bossFavor}，升迁形势不利`, level: 'high' });
    if (save.cityGdp < 30)                    items.push({ icon: '📉', label: `GDP指数${save.cityGdp}，经济发展滞后`, level: 'mid' });
    if (save.cityLivelihood < 30)             items.push({ icon: '👥', label: `民生满意度${save.cityLivelihood}，群众意见较大`, level: 'mid' });
    if (save.cityEcology < 25)                items.push({ icon: '🌫️', label: `生态指数${save.cityEcology}，环境问题突出`, level: 'mid' });
    if (save.securityIndex < 30)              items.push({ icon: '🚨', label: `治安指数${save.securityIndex}，社会稳定风险较高`, level: 'high' });
    if (save.moralValue < 30)                 items.push({ icon: '⚠️', label: `廉政评分${save.moralValue}，纪委关注风险上升`, level: 'high' });
    const lowLoyaltySub = subordinates.find(s => s.isAppointed && s.loyalty < 20);
    if (lowLoyaltySub)                        items.push({ icon: '🔴', label: `${lowLoyaltySub.name}忠诚度危险(${lowLoyaltySub.loyalty})，需加强管控`, level: 'high' });
    if (save.gameDays - save.lastRankDay >= 330) items.push({ icon: '📊', label: '年度绩效排名即将截止，不足30天', level: 'mid' });
    if (save.tenureYears >= save.maxTenureYears - 1) items.push({ icon: '⏳', label: `任期将满（${save.tenureYears}/${save.maxTenureYears}年），需尽快达晋升条件`, level: 'mid' });
    return items;
  }, [save, subordinates]);

  // 可用部门列表（memoized，依赖 rankLevel 不变时无需重算）
  const availableDepts = useMemo(() => Object.keys(DEPT_CONFIG) as DeptKey[], []);

  if (!save) return null;

  const secCfg = getSecretaryConfig(save.rankLevel);
  const effectiveAbility = (secretary?.isAppointed) ? Math.min(secretary.ability, secCfg.abilityMax) : 0;
  const secLevel = getSecLevel(effectiveAbility);

  // ── 候选秘书选择确认 ─────────────────────────────────────────────────────
  const handleConfirmCandidate = async () => {
    if (!selectedCandidate || confirmingCandidate) return;
    setConfirmingCandidate(true);
    try {
      // 更新秘书表：用候选人信息任命
      await appointSubAsSecretary(save.id, {
        id: '',
        name: selectedCandidate.name,
        avatarId: selectedCandidate.gender === 'male' ? 1 : 2,
        ability: selectedCandidate.ability,
      });
      // 记录已完成候选选择的职级，避免重复弹出
      await updateGameSave({ secretaryCandidateRank: save.rankLevel, secretaryCandidates: '[]' });
      await refreshSave();
      await load();
      setShowCandidates(false);
      setSelectedCandidate(null);
      { const _se1=`✅ 已接受上级派驻秘书 ${selectedCandidate.name}，请善加利用！`; void saveResult('secretary_appoint', {ok:true,desc:_se1,day:save.gameDays??0}); showMsg(_se1); }
    } catch {
      showMsg('任命失败，请稍后重试', false);
    } finally {
      setConfirmingCandidate(false);
    }
  };

  // ── 候选秘书选择界面（全屏覆盖）──────────────────────────────────────────
  if (showCandidates) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0A1020' }}>
        <View style={{ backgroundColor: '#0D1E35', paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1E3A5A' }}>
          <Text style={{ color: '#C8A84B', fontSize: 18, fontWeight: '900', letterSpacing: 2 }}>🏛️ 上级派驻秘书</Text>
          <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 4 }}>
            恭喜晋升！上级为您遴选了5名候选秘书，请选择一位接受任命
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#1E3A5A', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 }}>
            <Text style={{ fontSize: 12 }}>🎖️</Text>
            <Text style={{ color: '#C8A84B', fontSize: 10, fontWeight: '700' }}>当前职级：{secCfg.title} {secCfg.subTitle}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 24 }}>
          {candidates.map(c => {
            const isSelected = selectedCandidate?.id === c.id;
            const specialtyColor = { '公文处理':'#2E86AB','情报收集':'#8B2FC9','干部协调':'#2D6A4F','政务研究':'#B5451B','危机处置':'#C62828' }[c.specialty] ?? '#555';
            return (
              <Pressable
                key={c.id}
                onPress={() => setSelectedCandidate(c)}
                style={{ backgroundColor: isSelected ? '#0D2B45' : '#0F1E30', borderRadius: 12, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? '#C8A84B' : '#1E3A5A', overflow: 'hidden' }}
              >
                {/* 候选人头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 }}>
                  <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: isSelected ? '#C8A84B' : '#1E3A5A', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 26 }}>{c.gender === 'male' ? '👨‍💼' : '👩‍💼'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: isSelected ? '#C8A84B' : '#E8EAF0', fontSize: 16, fontWeight: '900' }}>{c.name}</Text>
                      <View style={{ backgroundColor: specialtyColor + '25', borderWidth: 1, borderColor: specialtyColor + '60', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: specialtyColor, fontSize: 9, fontWeight: '800' }}>特长：{c.specialty}</Text>
                      </View>
                    </View>
                    <Text style={{ color: '#7A8BA0', fontSize: 10, marginTop: 3 }}>{c.background}</Text>
                  </View>
                  {isSelected && <Text style={{ fontSize: 20 }}>✅</Text>}
                </View>
                {/* 属性条 */}
                <View style={{ flexDirection: 'row', gap: 0, borderTopWidth: 1, borderTopColor: '#1E3A5A' }}>
                  {[
                    { label: '能力', value: c.ability, color: c.ability >= 75 ? '#2ECC71' : c.ability >= 60 ? '#F1C40F' : '#E74C3C' },
                    { label: '忠诚', value: c.loyalty, color: c.loyalty >= 75 ? '#2ECC71' : c.loyalty >= 55 ? '#F1C40F' : '#E74C3C' },
                  ].map((attr, idx) => (
                    <View key={attr.label} style={{ flex: 1, padding: 10, borderRightWidth: idx === 0 ? 1 : 0, borderRightColor: '#1E3A5A', gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#7A8BA0', fontSize: 10 }}>{attr.label}</Text>
                        <Text style={{ color: attr.color, fontSize: 10, fontWeight: '800' }}>{attr.value}</Text>
                      </View>
                      <View style={{ height: 4, backgroundColor: '#1E3A5A', borderRadius: 2, overflow: 'hidden' }}>
                        <View style={{ height: 4, width: `${attr.value}%`, backgroundColor: attr.color, borderRadius: 2 }} />
                      </View>
                    </View>
                  ))}
                </View>
                {/* 特长描述 */}
                <View style={{ paddingHorizontal: 14, paddingBottom: 10 }}>
                  <Text style={{ color: '#5A6A80', fontSize: 10, lineHeight: 15 }}>💬 {TRAIT_MAP[c.specialty]}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
        {/* 底部确认栏 */}
        <View style={{ backgroundColor: '#0D1E35', borderTopWidth: 1, borderTopColor: '#1E3A5A', padding: 16, paddingBottom: insets.bottom + 12, gap: 8 }}>
          {selectedCandidate ? (
            <>
              <Text style={{ color: '#9AA3B8', fontSize: 11, textAlign: 'center' }}>
                已选择：<Text style={{ color: '#C8A84B', fontWeight: '700' }}>{selectedCandidate.name}</Text>
                （{selectedCandidate.specialty} · 能力{selectedCandidate.ability} · 忠诚{selectedCandidate.loyalty}）
              </Text>
              <Pressable
                onPress={handleConfirmCandidate}
                disabled={confirmingCandidate}
                style={{ backgroundColor: confirmingCandidate ? '#5A6278' : '#C8A84B', borderRadius: 10, paddingVertical: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#0A0E1A', fontSize: 15, fontWeight: '900' }}>
                  {confirmingCandidate ? '任命中...' : `✅ 确认任命 ${selectedCandidate.name} 为秘书`}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={{ color: '#5A6278', fontSize: 12, textAlign: 'center' }}>↑ 点击上方候选人查看详情并选择</Text>
          )}
        </View>
      </View>
    );
  }

  // 整理公文
  const handleDocwork = async () => {
    if (!secretary) return;
    if (secretary.ability < 20) { showMsg('办公室工作人员能力值不足，请等待月度自动恢复', false); return; }
    setActing(true);
    try {
      const result = await doDocwork(secretary.id, save.gameDays);
      if (result) {
        await updateGameSave({ meritPoints: save.meritPoints + result.meritGain + secCfg.docworkGainBonus });
        await refreshSave();
        await load();
        showMsg(`整理公文完成，政绩 +${result.meritGain + secCfg.docworkGainBonus} 点`);
      } else {
        showMsg('整理公文失败', false);
      }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  const handleSaveSchedule = async () => {
    if (!secretary || !scheduleText.trim()) return;
    setActing(true);
    try {
      const ok = await updateSecretarySchedule(secretary.id, scheduleText);
      showMsg(ok ? '日程已保存' : '保存失败', ok);
      if (ok) await load();
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // 起草文件 — 选择模板
  const handleSelectDraft = (idx: number) => {
    setDraftIdx(idx);
    setDraftContent(DRAFT_TEMPLATES[idx].content(save.cityName, save.playerName ?? '本人', save.rankName ?? ''));
  };

  // 起草文件 — 定稿报送（使用共享工具函数）
  const handleDraftSubmit = async () => {
    if (draftIdx === null || draftDone.has(draftIdx)) return;
    const tpl = DRAFT_TEMPLATES[draftIdx];
    const eff = tpl.effect;
    setActing(true);
    try {
      await updateGameSave(buildEffectUpdates(save, eff));
      await applySubEffects(subordinates, eff, save.gameDays);
      setDraftDone(prev => new Set([...prev, draftIdx]));
      { const _se2=`✅ 「${tpl.title}」已定稿报送！${eff.label}`; void saveResult('secretary_report_'+tpl.title.replace(/ /g,'_').slice(0,20), {ok:true,desc:_se2,day:save.gameDays??0}); showMsg(_se2); }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  const handleApply = async (idx: number) => {
    if (!save || applyDone.has(idx)) return;
    const ap = APPLY_TYPES[idx];
    setActing(true);
    try {
      const success = Math.random() < ap.successRate;
      const eff = success ? ap.effect : ap.failEffect;
      if (!eff) return;
      await updateGameSave(success ? buildEffectUpdates(save, ap.effect) : { meritPoints: save.meritPoints + (eff.meritGain ?? 0) });
      if (success) await applySubEffects(subordinates, ap.effect, save.gameDays);
      setApplyDone(prev => new Set([...prev, idx]));
      { const _se3=success ? `✅ ${ap.title}已批准！${ap.effect.label}` : `⚠️ ${ap.title}申请未获批。${eff.label}`; void saveResult('secretary_approval_'+ap.title.replace(/ /g,'_').slice(0,20), {ok:success,desc:_se3,day:save.gameDays??0}); showMsg(_se3, success); }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  const handleIntel = async (idx: number) => {
    if (intelDone.has(idx)) return;
    setActing(true);
    try {
      await updateGameSave({ meritPoints: save.meritPoints + 5 });
      { const _se4=`✅ ${INTEL_ITEMS[idx].title}已完成，${INTEL_ITEMS[idx].gain}`; void saveResult('secretary_intel_'+idx, {ok:true,desc:_se4,day:save.gameDays??0}); showMsg(_se4); }
      setIntelDone(prev => new Set([...prev, idx]));
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  const handleCounsel = async (idx: number) => {
    if (counselDone.has(idx)) return;
    setActing(true);
    try {
      await updateGameSave({ meritPoints: save.meritPoints + 7 });
      { const _se5=`✅ ${COUNSEL_ITEMS[idx].title}已完成，${COUNSEL_ITEMS[idx].gain}`; void saveResult('secretary_counsel_'+idx, {ok:true,desc:_se5,day:save.gameDays??0}); showMsg(_se5); }
      setCounselDone(prev => new Set([...prev, idx]));
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  const handleInspect = async (deptKey: DeptKey) => {
    if (!secretary || inspectDone.has(deptKey)) return;
    const abilityCost = 15;
    if (secretary.ability < abilityCost) { showMsg(`能力值不足${abilityCost}，请等待恢复`, false); return; }
    setActing(true);
    const cfg = DEPT_INSPECT[deptKey];
    const isIssue = Math.random() < 0.35;
    const findings = isIssue ? cfg.issueFindings : cfg.goodFindings;
    const finding = findings[Math.floor(Math.random() * findings.length)];
    const meritBonus = isIssue ? Math.max(3, cfg.meritBase - 3) : cfg.meritBase;
    const effUpdate: DraftEffect = { ...cfg.effectKey, meritGain: meritBonus, label: cfg.effectDesc };
    try {
      await updateGameSave(buildEffectUpdates(save, effUpdate));
      if (cfg.effectKey.subLoyaltyGain) await applySubEffects(subordinates, effUpdate, save.gameDays);
      await updateSecretaryAbility(secretary.id, secretary.ability - abilityCost);
      await load();
      setInspectDone(prev => { const n = new Set(prev); n.add(deptKey); return n; });
      setInspectResults(prev => ({ ...prev, [deptKey]: { text: finding, isIssue } }));
      const deptName = getDeptNameByRank(deptKey, save.rankLevel);
      showMsg(isIssue
        ? `⚠️ 督导${deptName}：${finding}，政绩+${meritBonus}`
        : `✅ 督导${deptName}：${finding}，政绩+${meritBonus}`
      , !isIssue);
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 干部推荐任职 ──
  const handleRecommend = async () => {
    if (!recSub || !recDept || !recPos) { showMsg('请选择推荐对象、目标部门和职位', false); return; }
    if (recPos === 'head' && recSub.ability < 70) { showMsg('正职要求能力70+，请选择其他干部或职位', false); return; }
    if (recPos === 'deputy' && recSub.ability < 55) { showMsg('副职要求能力55+，请选择其他干部或职位', false); return; }
    setActing(true);
    const deptLabel = getDeptNameByRank(recDept, save.rankLevel);
    const posLabel = recPos === 'head' ? `${deptLabel}局长` : recPos === 'deputy' ? `${deptLabel}副局长` : `${deptLabel}科员`;
    try {
      const ok = await appointSubordinate(recSub.id, posLabel, posLabel, recDept, recPos, save.rankLevel);
      if (ok) {
        setRecResult(`✅ ${recSub.name}已由办公室协调任命为${posLabel}`);
        await updateGameSave({ meritPoints: save.meritPoints + 3 });
        await load();
        setRecSub(null); setRecDept(null); setRecPos(null);
      } else {
        showMsg('推荐任职失败，请稍后再试', false);
      }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  const handleAppointSub = async () => {
    if (!appointSub || !save || !secretary) return;
    setActing(true);
    try {
      const ok = await appointSubAsSecretary(save.id, {
        id: appointSub.id,
        name: appointSub.name,
        avatarId: appointSub.avatarId ?? 1,
        ability: appointSub.ability,
      });
      if (ok) {
        showMsg(`✅ 已任命 ${appointSub.name} 为专属秘书`);
        setAppointSub(null);
        setTab('main');
        await load();
      } else {
        showMsg('任命失败，请稍后再试', false);
      }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 解除秘书任命 ──
  const handleRecallSecretary = async () => {
    if (!secretary?.subId || !save) return;
    setActing(true);
    const ok = await recallSecretary(save.id, secretary.subId);
    if (ok) {
      showMsg('已解除专属秘书任命');
      await load();
    } else {
      showMsg('解除任命失败', false);
    }
    setActing(false);
  };

  // ── 调任秘书至官职 ──
  const handleTransferSecretary = async () => {
    if (!secretary?.subId || !save || !transferRoleKey) return;
    const roles = LEADERSHIP_ROLES[save.rankLevel] ?? [];
    const role = roles.find(r => r.key === transferRoleKey);
    if (!role) return;
    setActing(true);
    // 找到当前秘书对应的下属
    const secSub = subordinates.find(s => s.id === secretary.subId);
    if (!secSub) { showMsg('秘书下属信息不存在', false); setActing(false); return; }
    try {
      const ok1 = await assignLeadershipRole(
        save.id, save.userId, secSub.id,
        role.key, role.label,
        secSub.name, secSub.avatarId ?? 1, secSub.gender ?? '男', save.gameDays,
      );
      const ok2 = await recallSecretary(save.id, secretary.subId);
      if (ok1 && ok2) {
        showMsg(`✅ 已将 ${secSub.name} 调任为${role.label}`);
        setTransferRoleKey(null);
        setTab('main');
        await load();
      } else {
        showMsg('调任失败，请稍后再试', false);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // 待办计算
  const unassigned = subordinates.filter(s => !s.isAppointed && !s.transferredCity);
  const needAssess = subordinates.filter(s => s.isAppointed && save.gameDays - s.lastAssessedDay >= 90);

  const todos = [
    !reports.find(r => Number(r.monthKey) === Math.floor(save.gameDays / 30))
      ? { icon: '📋', text: '本月工作会议待召开', link: '/(app)/meeting', urgent: true }
      : null,
    save.gameDays - save.lastRankDay >= 330
      ? { icon: '📊', text: '年度排名结算即将来临（≤30天）', link: null, urgent: true }
      : null,
    needAssess.length > 0
      ? { icon: '⚠️', text: `有 ${needAssess.length} 名下属待考评`, link: '/(app)/subordinates', urgent: false }
      : null,
    unassigned.length > 2
      ? { icon: '👥', text: `${unassigned.length} 名干部未分配岗位`, link: '/(app)/subordinates', urgent: false }
      : null,
    (save.fundBalance ?? 0) < 50
      ? { icon: '💸', text: '城市资金余额不足50万，注意财政风险', link: '/(app)/fiscal', urgent: true }
      : null,
  ].filter(Boolean) as { icon: string; text: string; link: string | null; urgent: boolean }[];

  // Tab配置（根据职级动态显示）
  const TABS: { key: Tab; label: string; badge?: number }[] = [
    { key: 'main',     label: '秘书台' },
    { key: 'filing',   label: '📋 文件批示' },
    ...(save.rankLevel >= 4 ? [{ key: 'opinion' as Tab, label: '📡 舆情管理' }] : []),
    { key: 'coord',    label: '🤝 公务协调' },
    ...(save.rankLevel >= 3 ? [{ key: 'appoint' as Tab, label: secretary?.isAppointed ? '更换秘书' : '任命秘书' }] : []),
    ...(secretary?.isAppointed && (LEADERSHIP_ROLES[save.rankLevel] ?? []).length > 0 ? [{ key: 'transfer' as Tab, label: '调任官职' }] : []),
    { key: 'todo',     label: '待办提醒', badge: todos.filter(t => t.urgent).length || undefined },
    { key: 'report',   label: '报告摘要' },
    { key: 'draft',    label: '起草文件' },
    { key: 'apply',    label: '辅助申请' },
    ...(save.rankLevel >= 5 && secretary?.isAppointed ? [{ key: 'inspect' as Tab, label: '🔍 巡查督导' }] : []),
    { key: 'guard',    label: '🛡️ 安保' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>{save?.rankName} · {save?.cityName}</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{secCfg.officeTitle}</Text>
        </View>
        {secretary?.isAppointed ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 11 }}>能力值</Text>
            <View style={{ backgroundColor: effectiveAbility >= 60 ? '#2a7a3b' : '#C82829', paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{effectiveAbility}/{secCfg.abilityMax}</Text>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 11 }}>待任命</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Tab栏 — 外层View固定高度，隔离Android flex高度计算异常 */}
          <View style={{ height: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D1D1CF' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', alignItems: 'stretch' }}>
              {TABS.map(t => (
                <Pressable
                  key={t.key}
                  onPress={() => { setTab(t.key); setMsg(''); }}
                  style={{ paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#C82829' : 'transparent', flexDirection: 'row', gap: 4 }}
                >
                  <Text style={{ fontSize: 13, color: tab === t.key ? '#C82829' : '#888', fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
                  {t.badge ? (
                    <View style={{ backgroundColor: '#C82829', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t.badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ padding: 16, gap: 14 }}>
            {msg ? (
              <View style={{ backgroundColor: msgOk ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: msgOk ? '#2a7a3b' : '#C82829', padding: 10 }}>
                <Text style={{ fontSize: 12, color: msgOk ? '#2a7a3b' : '#C82829' }}>{msg}</Text>
              </View>
            ) : null}

            {/* ══════ 秘书台 ══════ */}
            {tab === 'main' && secretary && (
              <View style={{ gap: 14 }}>
                {/* rank1-2：无秘书提示 */}
                {save.rankLevel < 3 ? (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 36 }}>🔒</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>本级别暂无专属秘书</Text>
                    <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 }}>
                      参照现实，乡镇股级、副科级干部一般无配备专属秘书的条件。{'\n'}晋升至正科级镇长（3级）及以上后方可任命。
                    </Text>
                  </View>
                ) : !secretary.isAppointed ? (
                  /* 已达职级但尚未任命秘书 */
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 36 }}>🤵</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>尚未任命专属秘书</Text>
                    <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 }}>
                      请从下属列表中选择合适人选担任{secCfg.title}。{'\n'}秘书同时在{secCfg.officeTitle}挂职。
                    </Text>
                    <Pressable
                      onPress={() => setTab('appoint')}
                      style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 28, paddingVertical: 12, marginTop: 6 }}
                      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📋 立即任命专属秘书</Text>
                    </Pressable>
                  </View>
                ) : (
                  /* ── 已任命：正常秘书台内容 ── */
                  <View style={{ gap: 14 }}>
                    {/* 秘书信息卡 */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={{ width: 56, height: 56, backgroundColor: '#1D3B5E', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 28 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>{secretary.name}</Text>
                          <View style={{ backgroundColor: secCfg.badge === '最高' ? '#4a2c8a' : secCfg.badge === '核心' ? '#C82829' : secCfg.badge === '高级' ? '#2a7a3b' : secCfg.badge === '中级' ? '#2B4B6F' : '#7B5E2A', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{secCfg.badge}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{secCfg.title} · {secCfg.officeTitle} {secCfg.subTitle}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <AbilityBar value={effectiveAbility} />
                        </View>
                        <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                          能力值 {effectiveAbility}/{secCfg.abilityMax}（上限随职级提升）
                        </Text>
                        {/* 秘书成长进度 */}
                        <View style={{ marginTop: 6 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                            <Text style={{ fontSize: 9, color: secLevel.color, fontWeight: '700' }}>
                              {secLevel.title}（Lv.{secLevel.level}）
                            </Text>
                            <Text style={{ fontSize: 9, color: '#888' }}>
                              能力 {effectiveAbility}/{secCfg.abilityMax}
                            </Text>
                          </View>
                          <View style={{ height: 5, backgroundColor: '#E8EDF2', overflow: 'hidden', borderRadius: 2 }}>
                            <View style={{
                              height: 5,
                              width: `${Math.round((effectiveAbility / secCfg.abilityMax) * 100)}%` as `${number}%`,
                              backgroundColor: secLevel.color,
                            }} />
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                            {secLevel.perks.map(p => (
                              <View key={p} style={{ backgroundColor: secLevel.color, paddingHorizontal: 5, paddingVertical: 1 }}>
                                <Text style={{ color: '#fff', fontSize: 8 }}>{p}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                      {/* 解除任命 */}
                      <Pressable
                        onPress={() => void handleRecallSecretary()}
                        disabled={acting}
                        style={{ paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#C82829' }}
                      >
                        <Text style={{ color: '#C82829', fontSize: 10, fontWeight: '600' }}>解除</Text>
                      </Pressable>
                    </View>

                    {/* 解锁能力 */}
                    <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1CF', padding: 12 }}>
                      <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>✨ 当前解锁能力</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {secCfg.features.map(f => (
                          <View key={f} style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: '#fff', fontSize: 10 }}>{f}</Text>
                          </View>
                        ))}
                      </View>
                      {secCfg.docworkGainBonus > 0 && (
                        <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 6 }}>
                          🎖️ 职位加成：公文整理额外获得 +{secCfg.docworkGainBonus} 政绩
                        </Text>
                      )}
                    </View>

                    {/* ── 危机扫描 ─────────────────────────────── */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>危机扫描</Text>
                        {crisisItems.length > 0 && (
                          <View style={{ backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{crisisItems.length} 项风险</Text>
                          </View>
                        )}
                      </View>
                      {crisisItems.length === 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 8, backgroundColor: '#F0F8F1' }}>
                          <Text style={{ fontSize: 18 }}>✅</Text>
                          <Text style={{ fontSize: 11, color: '#2a7a3b' }}>暂未检测到明显风险，运转正常</Text>
                        </View>
                      ) : (
                        crisisItems.map((item, i) => (
                          <View
                            key={i}
                            style={{
                              flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 8,
                              backgroundColor: item.level === 'high' ? '#FFF0F0' : item.level === 'mid' ? '#FFF9E6' : '#F5F5F5',
                              borderLeftWidth: 3,
                              borderLeftColor: item.level === 'high' ? '#C82829' : item.level === 'mid' ? '#D08A1A' : '#999',
                            }}
                          >
                            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, color: item.level === 'high' ? '#C82829' : item.level === 'mid' ? '#7B5E2A' : '#555', lineHeight: 16 }}>
                                {item.label}
                              </Text>
                              <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>
                                {item.level === 'high' ? '🔴 高风险' : item.level === 'mid' ? '🟡 中风险' : '⚪ 低风险'}
                              </Text>
                            </View>
                          </View>
                        ))
                      )}
                    </View>

                {/* ── 秘书智能开关 ────────────────────────────────────── */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 0 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>🤖 秘书智能功能</Text>

                  {/* 自动施政开关（能力≥70） */}
                  <Pressable
                    onPress={() => { if (!acting) void updateGameSave({ secAutoGovEnabled: !save.secAutoGovEnabled }); }}
                    disabled={acting}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}
                  >
                    <View style={{ marginTop: 2 }}>
                      <View style={{
                        width: 42, height: 24, borderRadius: 12,
                        backgroundColor: save.secAutoGovEnabled ? '#1D3B5E' : (effectiveAbility < 70 ? '#E0E0E0' : '#D1D1CF'),
                        justifyContent: 'center', paddingHorizontal: 2,
                      }}>
                        <View style={{
                          width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                          alignSelf: save.secAutoGovEnabled ? 'flex-end' : 'flex-start',
                        }} />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>自动施政</Text>
                        {effectiveAbility < 70 && (
                          <View style={{ backgroundColor: '#F5E6C8', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '700' }}>需能力≥70</Text>
                          </View>
                        )}
                        {save.secAutoGovEnabled && (
                          <View style={{ backgroundColor: '#E8F4EA', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>已开启</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 16 }}>
                        每月自动完成全部施政行动（GDP+5·民生+5·生态+3·营商+4·治安+3·政绩+3），连续5月后第6月须亲自施政。
                        {effectiveAbility < 70 ? `当前能力${effectiveAbility}，需达到70方可启用。` : ''}
                      </Text>
                    </View>
                  </Pressable>

                  {/* 自动招募开关（能力≥60） */}
                  <Pressable
                    onPress={() => { if (!acting) void updateGameSave({ secAutoRecruitEnabled: !save.secAutoRecruitEnabled }); }}
                    disabled={acting}
                    style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 }}
                  >
                    <View style={{ marginTop: 2 }}>
                      <View style={{
                        width: 42, height: 24, borderRadius: 12,
                        backgroundColor: save.secAutoRecruitEnabled ? '#1D3B5E' : (effectiveAbility < 60 ? '#E0E0E0' : '#D1D1CF'),
                        justifyContent: 'center', paddingHorizontal: 2,
                      }}>
                        <View style={{
                          width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff',
                          alignSelf: save.secAutoRecruitEnabled ? 'flex-end' : 'flex-start',
                        }} />
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>自动招募干部</Text>
                        {effectiveAbility < 60 && (
                          <View style={{ backgroundColor: '#F5E6C8', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '700' }}>需能力≥60</Text>
                          </View>
                        )}
                        {save.secAutoRecruitEnabled && (
                          <View style={{ backgroundColor: '#E8F4EA', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>已开启</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#888', marginTop: 2, lineHeight: 16 }}>
                        每季度自动完成基层公务员招录，按编制空缺录用2~6名干部并分配部门，无需手动前往组织部。
                        {effectiveAbility < 60 ? `当前能力${effectiveAbility}，需达到60方可启用。` : ''}
                      </Text>
                    </View>
                  </Pressable>
                </View>

                {/* 整理公文 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>公文处理</Text>
                  <Text style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 18 }}>
                    {secCfg.title}协助整理公文，消耗10点能力值，获得 {5 + Math.floor(effectiveAbility / 20) + secCfg.docworkGainBonus} 点政绩。能力值每月自动恢复，上限{secCfg.abilityMax}。
                  </Text>
                  <Pressable
                    onPress={() => void handleDocwork()}
                    disabled={acting || effectiveAbility < 20}
                    style={{ backgroundColor: effectiveAbility >= 20 ? '#1D3B5E' : '#ccc', padding: 13, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                      {effectiveAbility >= 20 ? `整理公文（政绩+${5 + Math.floor(effectiveAbility / 20) + secCfg.docworkGainBonus}）` : '能力不足（需≥20），等待月度恢复'}
                    </Text>
                  </Pressable>
                  {secretary.lastDocworkDay > 0 && (
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' }}>上次整理：{gameDaysToDate(secretary.lastDocworkDay)}</Text>
                  )}
                </View>

                {/* 情报汇报（副科级+解锁） */}
                {secCfg.canIntelligence && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>情报汇报</Text>
                    {INTEL_ITEMS.map((item, i) => {
                      const done = intelDone.has(i);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => !done && void handleIntel(i)}
                          disabled={done || acting}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: done ? '#F9F9F9' : '#EEF2F7', padding: 10, opacity: done ? 0.7 : 1 }}
                        >
                          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{item.title}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.desc}</Text>
                            <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>预期：{item.gain}</Text>
                          </View>
                          {done ? (
                            <Text style={{ fontSize: 10, color: '#888' }}>✓ 已完成</Text>
                          ) : (
                            <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>执行</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* 决策参谋（正处级+解锁） */}
                {secCfg.canCounsel && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>决策参谋</Text>
                    <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 6 }}>
                      {secCfg.title}基于当前形势，为您提供重大事项的专业参谋意见。
                    </Text>
                    {COUNSEL_ITEMS.map((item, i) => {
                      const done = counselDone.has(i);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => !done && void handleCounsel(i)}
                          disabled={done || acting}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: done ? '#F9F9F9' : '#FFF9E6', padding: 10, opacity: done ? 0.7 : 1 }}
                        >
                          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{item.title}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.desc}</Text>
                            <Text style={{ fontSize: 10, color: '#7B5E2A', marginTop: 2 }}>预期：{item.gain}</Text>
                          </View>
                          {done ? (
                            <Text style={{ fontSize: 10, color: '#888' }}>✓ 已完成</Text>
                          ) : (
                            <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>咨询</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* ── 与秘书交流 ──────────────────────────────── */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>与秘书交流</Text>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 6 }}>
                    与{secCfg.title}进行工作交流，不同话题产生不同效果。
                  </Text>
                  {TALK_TOPICS.map((topic, i) => {
                    const isSel = selectedTopic === i;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => setSelectedTopic(isSel ? null : i)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1.5, borderColor: isSel ? '#1D3B5E' : '#E0E0E0', backgroundColor: isSel ? '#EEF2F7' : '#fafafa' }}
                      >
                        <Text style={{ fontSize: 22 }}>{topic.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isSel ? '#1D3B5E' : '#222' }}>{topic.label}</Text>
                          <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{topic.desc}</Text>
                          <Text style={{ fontSize: 10, color: topic.loyaltyDelta > 0 ? '#2a7a3b' : '#C82829', marginTop: 2 }}>
                            政绩 {topic.loyaltyDelta > 0 ? `+${topic.loyaltyDelta}` : topic.loyaltyDelta}
                          </Text>
                        </View>
                        {isSel && (
                          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                  {selectedTopic !== null && (
                    <Pressable
                      onPress={async () => {
                        if (acting) return;
                        const topic = TALK_TOPICS[selectedTopic];
                        setActing(true);
                        try {
                          const delta = topic.loyaltyDelta;
                          await updateGameSave({ meritPoints: save.meritPoints + Math.max(0, delta) });
                          await refreshSave();
                          showMsg(delta > 0
                            ? `✅ 「${topic.label}」交流完成，政绩+${delta}`
                            : `⚠️ 「${topic.label}」反馈不佳，注意处理关系`);
                          setSelectedTopic(null);
                        } catch { showMsg('操作失败，请稍后重试'); } finally { setActing(false); }
                      }}
                      disabled={acting}
                      style={{ backgroundColor: '#1D3B5E', padding: 12, alignItems: 'center', marginTop: 4 }}
                      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        {acting ? '处理中…' : `💬 执行「${TALK_TOPICS[selectedTopic].label}」`}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* ── 安排日程 ─────────────────────────────────── */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>今日日程</Text>
                  <TextInput
                    value={scheduleText}
                    onChangeText={setScheduleText}
                    multiline
                    numberOfLines={6}
                    placeholder="输入今日日程安排…"
                    placeholderTextColor="#aaa"
                    style={{ borderWidth: 1, borderColor: '#D1D1CF', padding: 10, fontSize: 12, color: '#222', lineHeight: 20, minHeight: 130, textAlignVertical: 'top', backgroundColor: '#fafafa', marginBottom: 8 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {SCHEDULE_TEMPLATES.map((tpl, i) => (
                      <Pressable key={i} onPress={() => setScheduleText(tpl)} style={{ flex: 1, backgroundColor: '#EEF2F7', padding: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#1D3B5E' }}>模板{i + 1}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => void handleSaveSchedule()}
                    disabled={acting}
                    style={{ backgroundColor: '#1D3B5E', padding: 11, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>保存日程</Text>
                  </Pressable>
                </View>
                  </View>
                )}
              </View>
            )}

            {/* ══════ 任命专属秘书 ══════ */}
            {tab === 'appoint' && (
              <View style={{ gap: 14 }}>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    👔 从在职下属中选择合适人选担任{secCfg.title}，同时挂职于{secCfg.officeTitle}。
                    {'\n'}秘书任职期间仍保留原有下属身份，可随时更换或调任官职。
                  </Text>
                </View>
                {/* 当前秘书提示 */}
                {secretary?.isAppointed && (
                  <View style={{ backgroundColor: '#fff9e6', borderWidth: 1, borderColor: '#f0c040', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#7B5E2A', lineHeight: 17 }}>
                      ⚠️ 当前已任命 <Text style={{ fontWeight: '700' }}>{secretary.name}</Text> 为专属秘书。选择新人选后将自动替换。
                    </Text>
                  </View>
                )}
                {/* 确认任命 */}
                <Pressable
                  onPress={() => void handleAppointSub()}
                  disabled={acting || !appointSub}
                  style={{ backgroundColor: appointSub ? '#1D3B5E' : '#ccc', padding: 14, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {acting ? '任命中…' : appointSub ? `📋 任命 ${appointSub.name} 为${secCfg.title}` : '请先从下方选择人选'}
                  </Text>
                </Pressable>
                {/* 下属候选列表 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>选择秘书人选</Text>
                  {subordinates.filter(s => !s.transferredCity && s.id !== secretary?.subId).length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#aaa' }}>暂无可任命的下属</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={subordinates.filter(s => !s.transferredCity && s.id !== secretary?.subId)}
                      keyExtractor={s => s.id}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
                      renderItem={({ item: s }) => {
                        const isSel = appointSub?.id === s.id;
                        return (
                          <Pressable
                            onPress={() => setAppointSub(isSel ? null : s)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: isSel ? '#EEF2F7' : '#fff' }}
                          >
                            <View style={{ width: 40, height: 40, backgroundColor: isSel ? '#1D3B5E' : '#D1D1CF', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 20 }}>👤</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: isSel ? '700' : '400', color: isSel ? '#1D3B5E' : '#222' }}>{s.name}</Text>
                              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                                {s.appointedRole ?? '待分配'} · 能力 {s.ability} · 忠诚 {s.loyalty}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>
                                {s.appointedDept ? getDeptNameByRank(s.appointedDept, save.rankLevel) : '无归属部门'}
                              </Text>
                            </View>
                            {isSel && (
                              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      }}
                    />
                  )}
                </View>
              </View>
            )}

            {/* ══════ 调任官职（秘书→领导班子职位） ══════ */}
            {tab === 'transfer' && secretary?.isAppointed && (
              <View style={{ gap: 14 }}>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    🔄 根据代会任命程序，可将专属秘书调任为领导班子正式职位。{'\n'}
                    调任后秘书职位自动空缺，可重新任命新人选。
                  </Text>
                </View>
                {/* 当前秘书 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D3B5E' }}>{secretary.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{secCfg.title} · {secCfg.officeTitle}</Text>
                  </View>
                  <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>待调任</Text>
                  </View>
                </View>
                {/* 可调任的官职列表 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>选择目标职位（本级代会任命职务）</Text>
                  {(LEADERSHIP_ROLES[save.rankLevel] ?? []).length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#aaa' }}>本级无可调任职位</Text>
                    </View>
                  ) : (
                    (LEADERSHIP_ROLES[save.rankLevel] ?? []).map(role => {
                      const isSel = transferRoleKey === role.key;
                      return (
                        <Pressable
                          key={role.key}
                          onPress={() => setTransferRoleKey(isSel ? null : role.key)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, marginBottom: 4, borderWidth: 1.5, borderColor: isSel ? '#C82829' : '#E0E0E0', backgroundColor: isSel ? '#fff5f5' : '#fafafa' }}
                        >
                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: isSel ? '#C82829' : '#ccc', backgroundColor: isSel ? '#C82829' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                            {isSel && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '400', color: isSel ? '#C82829' : '#222' }}>
                              {role.label}
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '400' }}>  {role.tierLabel}</Text>
                            </Text>
                            {role.concurrentLabel && (
                              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{role.concurrentLabel}</Text>
                            )}
                          </View>
                          <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#1D3B5E' }}>需职级≥{role.requiredSubLevel}</Text>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
                {/* 确认调任 */}
                <Pressable
                  onPress={() => void handleTransferSecretary()}
                  disabled={acting || !transferRoleKey}
                  style={{ backgroundColor: transferRoleKey ? '#C82829' : '#ccc', padding: 14, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {acting ? '调任中…' : transferRoleKey
                      ? `🏛️ 调任 ${secretary.name} → ${(LEADERSHIP_ROLES[save.rankLevel] ?? []).find(r => r.key === transferRoleKey)?.label ?? ''}`
                      : '请从上方选择目标职位'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ══════ 待办提醒 ══════ */}
            {tab === 'todo' && (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>
                  待办事项 — 由{secretary?.name ?? '办公室'}整理
                </Text>
                {todos.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                    <Text style={{ fontSize: 14, color: '#2a7a3b', fontWeight: '600' }}>暂无待办事项</Text>
                    <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>各项工作均已处理，继续保持！</Text>
                  </View>
                ) : todos.map((t, i) => (
                  <Pressable
                    key={i}
                    onPress={() => t.link && router.push(t.link as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f0f0f0' }}
                  >
                    <View style={{ width: 32, height: 32, backgroundColor: t.urgent ? '#ffebee' : '#EEF2F7', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: t.urgent ? '#C82829' : '#333', fontWeight: t.urgent ? '700' : '400' }}>{t.text}</Text>
                      {t.link && <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>点击前往处理 ›</Text>}
                    </View>
                    {t.urgent && (
                      <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>紧急</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* ══════ 报告摘要 ══════ */}
            {tab === 'report' && (
              <>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    📄 {secretary?.name ?? '办公室'}为您整理了最近 {Math.min(reports.length, 6)} 份月度工作报告摘要，点击可查看详情。
                  </Text>
                </View>
                {reports.length === 0 ? (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                    <Text style={{ fontSize: 14, color: '#888' }}>暂无月度报告</Text>
                    <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>每月结算后自动生成工作报告</Text>
                  </View>
                ) : reports.slice(0, 6).map(r => {
                  const isGood = r.meritReward >= 30;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => router.push('/(app)/monthly-report')}
                      style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isGood ? '#c8e6c9' : '#D1D1CF', padding: 14 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>第{r.monthKey}月工作报告</Text>
                        <View style={{ backgroundColor: isGood ? '#2a7a3b' : '#888', paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>政绩+{r.meritReward}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {r.gdpChange !== 0 && <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#1D2D44' }}>GDP {r.gdpChange > 0 ? '+' : ''}{r.gdpChange}</Text></View>}
                        {r.livelihoodChange !== 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>民生 {r.livelihoodChange > 0 ? '+' : ''}{r.livelihoodChange}</Text></View>}
                        {r.ecologyChange !== 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>生态 {r.ecologyChange > 0 ? '+' : ''}{r.ecologyChange}</Text></View>}
                        {r.businessChange !== 0 && <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#1D2D44' }}>营商 {r.businessChange > 0 ? '+' : ''}{r.businessChange}</Text></View>}
                      </View>
                      <Text style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>第{r.yearKey}年 · 点击查看完整报告 ›</Text>
                    </Pressable>
                  );
                })}
                {reports.length > 6 && (
                  <Pressable onPress={() => router.push('/(app)/monthly-report')} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '600' }}>查看全部 {reports.length} 份报告 ›</Text>
                  </Pressable>
                )}
              </>
            )}

            {/* ══════ 起草文件 ══════ */}
            {tab === 'draft' && (() => {
              const currentTier = getRankTier(save.rankLevel);
              // 当前职级及下一档可预览（锁定展示）
              const visible = DRAFT_TEMPLATES.filter(t => t.tier <= currentTier + 1);
              return (
                <View style={{ gap: 14 }}>
                  {/* 说明栏 */}
                  <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18 }}>✍️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '700', marginBottom: 2 }}>{secretary?.name ?? '办公室'} 协助起草公文</Text>
                      <Text style={{ fontSize: 11, color: '#4A6080', lineHeight: 17 }}>
                        当前{TIER_LABEL[currentTier]}可用{visible.filter(t => t.tier === currentTier).length}种公文。随职级晋升解锁更高规格文件，定稿后效果立即生效，每份本轮限发一次。
                      </Text>
                    </View>
                  </View>

                  {/* 按 tier 分组展示 */}
                  {([1, 2, 3, 4, 5] as const).filter(tier => visible.some(t => t.tier === tier)).map(tier => {
                    const tierItems = visible.filter(t => t.tier === tier);
                    const isLocked = tier > currentTier;
                    const tierColors = { 1: '#5C8A5C', 2: '#5C7A9A', 3: '#8A5C5C', 4: '#7A5C8A', 5: '#8A6A2A' };
                    const tierColor = tierColors[tier] ?? '#666';
                    return (
                      <View key={tier} style={{ gap: 6 }}>
                        {/* 职级档位标题 */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                          <View style={{ backgroundColor: isLocked ? '#F0F0F0' : tierColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isLocked && <Text style={{ fontSize: 10 }}>🔒</Text>}
                            <Text style={{ fontSize: 10, color: isLocked ? '#bbb' : '#fff', fontWeight: '700' }}>{TIER_LABEL[tier]}</Text>
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                        </View>

                        {tierItems.map((tpl, _idx) => {
                          const i = DRAFT_TEMPLATES.indexOf(tpl);
                          const done = draftDone.has(i);
                          const isSelected = draftIdx === i;
                          return (
                            <Pressable
                              key={i}
                              onPress={() => { if (!done && !isLocked) handleSelectDraft(i); }}
                              style={{ borderWidth: 1, borderColor: isSelected ? '#C82829' : done ? '#E8E8E8' : isLocked ? '#E8E8E8' : '#D1D1CF', backgroundColor: isSelected ? '#fff5f5' : done ? '#f7f7f7' : '#fafafa', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: isLocked ? 0.5 : 1 }}
                              android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                              disabled={isLocked}
                            >
                              <Text style={{ fontSize: 18 }}>{tpl.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 12, color: isLocked ? '#bbb' : isSelected ? '#C82829' : done ? '#999' : '#222', fontWeight: isSelected ? '700' : '500', flex: 1 }}>{tpl.title}</Text>
                                  <View style={{ backgroundColor: isSelected ? '#fff0f0' : '#F0F4F8', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                                    <Text style={{ fontSize: 9, color: isSelected ? '#C82829' : '#5A7A9A', fontWeight: '600' }}>{tpl.category}</Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 10, color: isLocked ? '#ccc' : isSelected ? '#C82829' : done ? '#aaa' : '#888', marginTop: 2 }}>
                                  {isLocked ? `晋升${TIER_LABEL[tier]}后解锁` : done ? '✓ 本轮已发文' : `效果：${tpl.effect.label}`}
                                </Text>
                              </View>
                              {done && !isLocked && <Text style={{ fontSize: 11, color: '#bbb' }}>已发✓</Text>}
                            </Pressable>
                          );
                        })}
                      </View>
                    );
                  })}

                  {/* 编辑区 + 效果预览 + 定稿按钮 */}
                  {draftIdx !== null && !draftDone.has(draftIdx) && (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                      <View style={{ backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F0D080', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>⚡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#7A5C00', fontWeight: '700' }}>定稿后立即生效</Text>
                          <Text style={{ fontSize: 11, color: '#A07800', marginTop: 1 }}>{DRAFT_TEMPLATES[draftIdx].effect.label}</Text>
                        </View>
                      </View>
                      {(DRAFT_TEMPLATES[draftIdx].effect.subLoyaltyGain || DRAFT_TEMPLATES[draftIdx].effect.subAbilityGain || DRAFT_TEMPLATES[draftIdx].effect.subIntegrityGain) && (
                        <View style={{ backgroundColor: '#F0FBF4', borderWidth: 1, borderColor: '#B0DCC0', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14 }}>👥</Text>
                          <Text style={{ fontSize: 11, color: '#1A6B3A' }}>
                            将对 <Text style={{ fontWeight: '700' }}>{subordinates.filter(s => s.isAppointed).length} 名在职下属</Text> 生效
                            {DRAFT_TEMPLATES[draftIdx].effect.subLoyaltyGain ? `，忠诚+${DRAFT_TEMPLATES[draftIdx].effect.subLoyaltyGain}` : ''}
                            {DRAFT_TEMPLATES[draftIdx].effect.subAbilityGain ? `，能力+${DRAFT_TEMPLATES[draftIdx].effect.subAbilityGain}` : ''}
                            {DRAFT_TEMPLATES[draftIdx].effect.subIntegrityGain ? `，廉洁+${DRAFT_TEMPLATES[draftIdx].effect.subIntegrityGain}` : ''}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>编辑正文（可修改后定稿）</Text>
                      <TextInput
                        value={draftContent}
                        onChangeText={setDraftContent}
                        multiline
                        style={{ borderWidth: 1, borderColor: '#D1D1CF', padding: 10, fontSize: 12, color: '#222', lineHeight: 20, minHeight: 220, textAlignVertical: 'top', backgroundColor: '#fafafa' }}
                      />
                      <Pressable
                        onPress={() => void handleDraftSubmit()}
                        disabled={acting}
                        style={{ backgroundColor: acting ? '#aaa' : '#C82829', padding: 13, alignItems: 'center' }}
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                          {acting ? '报送中…' : '📤 定稿并正式报送'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {draftIdx !== null && draftDone.has(draftIdx) && (
                    <View style={{ backgroundColor: '#f0faf3', borderWidth: 1, borderColor: '#2a7a3b', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>✅</Text>
                      <Text style={{ fontSize: 12, color: '#2a7a3b', flex: 1 }}>「{DRAFT_TEMPLATES[draftIdx].title}」已报送归档，本轮效果已生效。</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* ══════ 辅助申请 ══════ */}
            {tab === 'apply' && (() => {
              const currentTier = getRankTier(save.rankLevel);
              const visible = APPLY_TYPES.filter(a => a.tier <= currentTier + 1);
              return (
                <View style={{ gap: 14 }}>
                  <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18 }}>🏛️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '700', marginBottom: 2 }}>{secretary?.name ?? '办公室'} 协助处理行政申请</Text>
                      <Text style={{ fontSize: 11, color: '#4A6080', lineHeight: 17 }}>
                        当前{TIER_LABEL[currentTier]}可申请{visible.filter(a => a.tier === currentTier).length}种事项，晋升后解锁更高规格申请。各类申请本轮各限一次。
                      </Text>
                    </View>
                  </View>

                  {([1, 2, 3, 4, 5] as const).filter(tier => visible.some(a => a.tier === tier)).map(tier => {
                    const tierItems = visible.filter(a => a.tier === tier);
                    const isLocked = tier > currentTier;
                    const tierColors = { 1: '#5C8A5C', 2: '#5C7A9A', 3: '#8A5C5C', 4: '#7A5C8A', 5: '#8A6A2A' };
                    const tierColor = tierColors[tier] ?? '#666';
                    return (
                      <View key={tier} style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                          <View style={{ backgroundColor: isLocked ? '#F0F0F0' : tierColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isLocked && <Text style={{ fontSize: 10 }}>🔒</Text>}
                            <Text style={{ fontSize: 10, color: isLocked ? '#bbb' : '#fff', fontWeight: '700' }}>{TIER_LABEL[tier]}</Text>
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                        </View>

                        {tierItems.map((ap) => {
                          const i = APPLY_TYPES.indexOf(ap);
                          const done = applyDone.has(i);
                          const srPct = Math.round(ap.successRate * 100);
                          return (
                            <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: done ? '#E8E8E8' : isLocked ? '#ECECEC' : '#D1D1CF', overflow: 'hidden', opacity: isLocked ? 0.55 : 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10 }}>
                                <Text style={{ fontSize: 26, marginTop: 2 }}>{ap.icon}</Text>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isLocked ? '#bbb' : done ? '#999' : '#1A1A1A', flex: 1 }}>{ap.title}</Text>
                                    <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                                      <Text style={{ fontSize: 9, color: '#5A7A9A', fontWeight: '600' }}>{ap.category}</Text>
                                    </View>
                                  </View>
                                  <Text style={{ fontSize: 11, color: isLocked ? '#ccc' : '#888', lineHeight: 16 }}>{ap.desc}</Text>
                                  {isLocked && (
                                    <Text style={{ fontSize: 10, color: '#C0A050', marginTop: 3 }}>🔒 晋升{TIER_LABEL[tier]}后可申请</Text>
                                  )}
                                </View>
                              </View>

                              {!isLocked && (
                                <View style={{ backgroundColor: '#F8F9FB', borderTopWidth: 1, borderTopColor: '#EAEAEA', padding: 10, gap: 5 }}>
                                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                    {ap.effect.label.split('，').map((tag, ti) => (
                                      <View key={ti} style={{ backgroundColor: done ? '#F0F0F0' : '#E8F0E8', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3 }}>
                                        <Text style={{ fontSize: 10, color: done ? '#aaa' : '#2A6A2A', fontWeight: '600' }}>{tag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', width: 60, backgroundColor: '#E0E0E0' }}>
                                        <View style={{ height: 4, width: `${srPct}%` as `${number}%`, backgroundColor: srPct >= 75 ? '#2a7a3b' : srPct >= 50 ? '#F59E0B' : '#C82829', borderRadius: 2 }} />
                                      </View>
                                      <Text style={{ fontSize: 10, color: '#666' }}>批准率{srPct}%</Text>
                                    </View>
                                    <Text style={{ fontSize: 10, color: '#999', flex: 1 }}>{ap.condition}</Text>
                                  </View>
                                  {ap.failEffect && (
                                    <Text style={{ fontSize: 10, color: '#aaa' }}>未获批：{ap.failEffect.label}</Text>
                                  )}
                                </View>
                              )}

                              {!isLocked && (
                                <Pressable
                                  onPress={() => void handleApply(i)}
                                  disabled={done || acting}
                                  style={{ backgroundColor: done ? '#F0F0F0' : '#1D2D44', padding: 12, alignItems: 'center' }}
                                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                                >
                                  <Text style={{ color: done ? '#aaa' : '#fff', fontWeight: '700', fontSize: 12 }}>
                                    {done ? '✓ 本轮已申请' : acting ? '申请中…' : '🚀 提交申请'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* ══════ 干部协调（推荐任职） ══════ */}
            {tab === 'filing' && (
              <View style={{ gap: 12 }}>
                {/* 头部说明 */}
                <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <Text style={{ fontSize: 28 }}>📋</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>文件批示台</Text>
                      <Text style={{ color: 'rgba(200,220,240,0.8)', fontSize: 10, marginTop: 2 }}>待批 {draftFiles.filter(f => !filingDone.has(f.id)).length} 份 · 本月已处理 {filingDone.size}/{draftFiles.length}</Text>
                    </View>
                    {/* 刷新一批按钮 */}
                    <Pressable
                      onPress={async () => {
                        const REFRESH_COST = 10;
                        if (acting) return;
                        if ((save.meritPoints ?? 0) < REFRESH_COST) { showMsg(`政绩不足（需${REFRESH_COST}点）`, false); return; }
                        setActing(true);
                        try {
                          await updateGameSave({ meritPoints: (save.meritPoints ?? 0) - REFRESH_COST });
                          const nextCount = filingRefreshCount + 1;
                          setFilingRefreshCount(nextCount);
                          const newSeed = (save.gameDays ?? 0) * 31 + save.rankLevel * 7 + nextCount * 100;
                          const fileCount = 3 + (save.rankLevel >= 6 ? 2 : save.rankLevel >= 4 ? 1 : 0);
                          setDraftFiles(generateDraftFiles(newSeed, fileCount));
                          setFilingDone(new Set());
                          showMsg(`🔄 已刷新一批新文件，消耗${REFRESH_COST}政绩`);
                        } catch { showMsg('刷新失败，请稍后重试', false); } finally { setActing(false); }
                      }}
                      disabled={acting}
                      style={{ backgroundColor: (save.meritPoints ?? 0) >= 10 ? '#7B5E2A' : '#555', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}
                      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>🔄 刷新一批</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8, textAlign: 'center' }}>消耗10政绩</Text>
                    </Pressable>
                    <View style={{ backgroundColor: filingDone.size === draftFiles.length && draftFiles.length > 0 ? '#2a7a3b' : '#7B5E2A', paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                        {filingDone.size === draftFiles.length && draftFiles.length > 0 ? '✅ 全部批示' : '📝 待批示'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: 'rgba(200,220,240,0.7)', fontSize: 10, lineHeight: 15 }}>
                    {secCfg.title}整理并呈报下列文件，请您选择批示方式。批准可获得对应资源加成，不同方式产生不同政绩与效果。
                  </Text>
                </View>

                {draftFiles.filter(f => !filingDone.has(f.id)).map(file => {
                  const done = filingDone.has(file.id);
                  const urgencyColor = file.urgency === 'high' ? '#C82829' : file.urgency === 'mid' ? '#7B5E2A' : '#2B4B6F';
                  const urgencyLabel = file.urgency === 'high' ? '紧急' : file.urgency === 'mid' ? '较急' : '一般';
                  return (
                    <View key={file.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: done ? '#C3E6CB' : '#D1D1CF', overflow: 'hidden' }}>
                      {/* 文件头 */}
                      <View style={{ backgroundColor: done ? '#F5FFF7' : '#F9F9F9', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <Text style={{ fontSize: 26 }}>{file.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', flex: 1 }} numberOfLines={2}>{file.title}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: urgencyColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{urgencyLabel}</Text>
                            </View>
                            <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#1D3B5E', fontSize: 8 }}>{file.category}</Text>
                            </View>
                            <Text style={{ fontSize: 9, color: '#aaa' }}>呈报：{file.issuer}</Text>
                          </View>
                        </View>
                        {done && (
                          <View style={{ backgroundColor: '#F0F8F1', borderWidth: 1, borderColor: '#C3E6CB', paddingHorizontal: 8, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '700' }}>
                              {draftFiles[file.id]?.action ?? '已处理'}
                            </Text>
                          </View>
                        )}
                      </View>

                      {/* 文件摘要 */}
                      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                        <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{file.summary}</Text>
                      </View>

                      {/* 批示选项 */}
                      {!done && (
                        <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                          <Text style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>请选择批示方式：</Text>
                          {([
                            { key: '批准' as FilingAction, label: '✅ 批准', eff: file.approveEff, color: '#2a7a3b', bg: '#F0F8F1', border: '#C3E6CB' },
                            { key: '修改' as FilingAction, label: '✏️ 修改', eff: file.reviseEff,  color: '#7B5E2A', bg: '#FFF9E6', border: '#F0D9A0' },
                            { key: '驳回' as FilingAction, label: '❌ 驳回', eff: file.rejectEff,  color: '#C82829', bg: '#FFF5F5', border: '#F5C6C6' },
                            { key: '搁置' as FilingAction, label: '⏸ 搁置', eff: file.shelveEff,  color: '#555',    bg: '#F5F5F5', border: '#D8D8D8' },
                          ] as const).map(opt => (
                            <Pressable
                              key={opt.key}
                              disabled={acting}
                              onPress={async () => {
                                if (acting) return;
                                setActing(true);
                                try {
                                  const e = opt.eff;
                                  const updates: Record<string, number> = {};
                                  if (e.meritGain)             updates.meritPoints           = (save.meritPoints ?? 0) + e.meritGain;
                                  if (e.bossFavorGain)         updates.bossFavor             = Math.min(100, (save.bossFavor ?? 50) + e.bossFavorGain);
                                  if (e.cityGdpGain)           updates.cityGdp               = Math.min(100, (save.cityGdp ?? 50) + e.cityGdpGain);
                                  if (e.cityLivelihoodGain)    updates.cityLivelihood        = Math.min(100, (save.cityLivelihood ?? 50) + e.cityLivelihoodGain);
                                  if (e.cityEcologyGain)       updates.cityEcology           = Math.min(100, (save.cityEcology ?? 50) + e.cityEcologyGain);
                                  if (e.cityBusinessGain)      updates.cityBusiness          = Math.min(100, (save.cityBusiness ?? 50) + e.cityBusinessGain);
                                  if (e.securityGain)          updates.securityIndex         = Math.min(100, (save.securityIndex ?? 50) + e.securityGain);
                                  if (Object.keys(updates).length > 0) {
                                    await updateGameSave(updates);
                                    await refreshSave();
                                  }
                                  setDraftFiles(prev => prev.map(f => f.id === file.id ? { ...f, action: opt.key } : f));
                                  setFilingDone(prev => {
                                    const next = new Set([...prev, file.id]);
                                    // 持久化当月已处理集合
                                    const mk = Math.floor((save.gameDays ?? 0) / 30);
                                    void saveResult('sec_filing_done_' + mk, { ok: true, desc: JSON.stringify([...next]), day: save.gameDays ?? 0 });
                                    return next;
                                  });
                                  showMsg(`📋 已${opt.key}：${file.title.slice(0, 15)}… · ${e.label}`);
                                } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
                              }}
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 9, backgroundColor: opt.bg, borderWidth: 1, borderColor: opt.border }}
                              android_ripple={{ color: 'rgba(0,0,0,0.07)' }}
                            >
                              <Text style={{ fontSize: 12, fontWeight: '700', color: opt.color, minWidth: 40 }}>{opt.label}</Text>
                              <Text style={{ flex: 1, fontSize: 10, color: '#666' }}>{opt.eff.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      )}
                    </View>
                  );
                })}

                {filingDone.size === draftFiles.length && draftFiles.length > 0 && (
                  <View style={{ backgroundColor: '#F0F8F1', borderWidth: 1, borderColor: '#C3E6CB', padding: 16, alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 22 }}>✅</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2a7a3b' }}>本批文件已全部批示完毕</Text>
                    <Text style={{ fontSize: 11, color: '#2a7a3b' }}>下个月将自动刷新新一批文件</Text>
                  </View>
                )}
              </View>
            )}

            {/* ══════ 舆情管理 (rank4+) ══════ */}
            {tab === 'opinion' && (
              <View style={{ gap: 12 }}>
                {save.rankLevel < 4 ? (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 28, alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 36 }}>🔒</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#333' }}>舆情管理尚未解锁</Text>
                    <Text style={{ fontSize: 11, color: '#888', textAlign: 'center', lineHeight: 17 }}>晋升至正科级（4级）后解锁舆情监测与应对功能</Text>
                  </View>
                ) : (
                  <>
                    <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <Text style={{ fontSize: 28 }}>📡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>舆情监测中心</Text>
                          <Text style={{ color: 'rgba(200,220,240,0.8)', fontSize: 10, marginTop: 2 }}>
                            监测到 {opinions.length} 条舆情 · 已处置 {opinionDone.size}/{opinions.length}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: opinionDone.size === opinions.length ? '#2a7a3b' : '#C82829', paddingHorizontal: 8, paddingVertical: 3 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                            {opinionDone.size === opinions.length ? '全部处置' : '待处置'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: 'rgba(200,220,240,0.7)', fontSize: 10, lineHeight: 15 }}>
                        {secCfg.title}实时监测网络舆论动态，对各类舆情进行研判并提出应对建议，请您决策处置方式。
                      </Text>
                      {/* 晋升舆情门槛进度条（rank9+才有门槛要求） */}
                      {(() => {
                        const rank = save.rankLevel ?? 1;
                        const required = rank >= 11 ? 3 : rank >= 10 ? 2 : rank >= 9 ? 1 : 0;
                        if (required === 0) return null;
                        const done = save.massIncidentCount ?? 0;
                        const pct = Math.min(100, Math.round((done / required) * 100));
                        const ready = done >= required;
                        return (
                          <View style={{ marginTop: 10, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                              <Text style={{ color: '#B0C8E8', fontSize: 9, fontWeight: '700', letterSpacing: 1 }}>
                                📈 晋升舆情门槛（副部级以上要求）
                              </Text>
                              <Text style={{ color: ready ? '#4ADE80' : '#FCD34D', fontSize: 10, fontWeight: '900' }}>
                                {done} / {required} 起 {ready ? '✅' : ''}
                              </Text>
                            </View>
                            <View style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3 }}>
                              <View style={{ height: 5, width: `${pct}%`, backgroundColor: ready ? '#4ADE80' : '#F59E0B', borderRadius: 3 }} />
                            </View>
                            <Text style={{ color: 'rgba(200,220,240,0.6)', fontSize: 9, marginTop: 4 }}>
                              {ready ? '门槛已达标，可申请晋升' : `还需处置 ${required - done} 起重大舆情事件方可晋升`}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>

                    {opinions.map(op => {
                      const done = opinionDone.has(op.id);
                      const sentimentColor = op.sentiment === 'positive' ? '#2a7a3b' : op.sentiment === 'negative' ? '#C82829' : '#7B5E2A';
                      const sentimentLabel = op.sentiment === 'positive' ? '正面' : op.sentiment === 'negative' ? '负面' : '中性';
                      const heatBars = Math.round(op.heatLevel / 2);
                      return (
                        <View key={op.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: done ? '#C3E6CB' : '#D1D1CF', overflow: 'hidden' }}>
                          {/* 舆情头部 */}
                          <View style={{ backgroundColor: done ? '#F5FFF7' : op.sentiment === 'negative' ? '#FFF8F8' : '#F9F9F9', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                              <Text style={{ fontSize: 26 }}>{op.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{op.topic}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, alignItems: 'center', flexWrap: 'wrap' }}>
                                  <View style={{ backgroundColor: sentimentColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                                    <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{sentimentLabel}舆情</Text>
                                  </View>
                                  <Text style={{ fontSize: 9, color: '#888' }}>来源：{op.source}</Text>
                                </View>
                                {/* 热度条 */}
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                                  <Text style={{ fontSize: 9, color: '#888', width: 28 }}>热度</Text>
                                  <View style={{ flexDirection: 'row', gap: 2 }}>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                      <View key={i} style={{ width: 12, height: 6, backgroundColor: i < heatBars ? (op.heatLevel >= 8 ? '#C82829' : op.heatLevel >= 5 ? '#7B5E2A' : '#2a7a3b') : '#E8EDF2' }} />
                                    ))}
                                  </View>
                                  <Text style={{ fontSize: 9, color: op.heatLevel >= 8 ? '#C82829' : op.heatLevel >= 5 ? '#7B5E2A' : '#2a7a3b', fontWeight: '700' }}>
                                    {op.heatLevel}/10
                                  </Text>
                                </View>
                              </View>
                              {done && (
                                <View style={{ backgroundColor: '#F0F8F1', borderWidth: 1, borderColor: '#C3E6CB', paddingHorizontal: 7, paddingVertical: 3 }}>
                                  <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>已处置</Text>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* 舆情内容 */}
                          <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
                            <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>{op.summary}</Text>
                          </View>

                          {/* 应对选项 */}
                          {!done && (
                            <View style={{ paddingHorizontal: 12, paddingBottom: 12, gap: 6 }}>
                              <Text style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>选择应对方式：</Text>
                              {op.responses.map(resp => (
                                <Pressable
                                  key={resp.key}
                                  disabled={acting}
                                  onPress={async () => {
                                    if (acting) return;
                                    setActing(true);
                                    try {
                                      const e = resp.eff;
                                      const updates: Record<string, number> = {};
                                      if (e.meritGain)             updates.meritPoints   = (save.meritPoints ?? 0) + e.meritGain;
                                      if (e.bossFavorGain)         updates.bossFavor     = Math.min(100, (save.bossFavor ?? 50) + e.bossFavorGain);
                                      if (e.cityLivelihoodGain)    updates.cityLivelihood = Math.min(100, Math.max(0, (save.cityLivelihood ?? 50) + e.cityLivelihoodGain));
                                      if (e.securityGain)          updates.securityIndex  = Math.min(100, (save.securityIndex ?? 50) + e.securityGain);
                                      // 处理舆情即累计重大事件次数（用于晋升门槛判断）
                                      updates.massIncidentCount = (save.massIncidentCount ?? 0) + 1;
                                      if (Object.keys(updates).length > 0) {
                                        await updateGameSave(updates);
                                        await refreshSave();
                                      }
                                      setOpinions(prev => prev.map(o => o.id === op.id ? { ...o, chosenResponse: resp.key } : o));
                                      setOpinionDone(prev => new Set([...prev, op.id]));
                                      showMsg(`📡 舆情处置完成：${resp.label} · ${e.label}`);
                                    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
                                  }}
                                  style={{ padding: 10, backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#E0E0E0', gap: 2 }}
                                  android_ripple={{ color: 'rgba(0,0,0,0.07)' }}
                                >
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E' }}>{resp.label}</Text>
                                  <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>{resp.desc}</Text>
                                  <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>效果：{resp.eff.label}</Text>
                                </Pressable>
                              ))}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </>
                )}
              </View>
            )}

            {/* ══════ 公务协调（合并原上下协调+接待+干部协调） ══════ */}
            {tab === 'coord' && (
              <View style={{ gap: 12 }}>
                {/* 子Tab切换 */}
                <View style={{ flexDirection: 'row', backgroundColor: '#EEF2F7', padding: 3, gap: 2 }}>
                  {([
                    { key: 'contact',   label: '联络协调' },
                    { key: 'reception', label: '接待安排' },
                    { key: 'recommend', label: '干部推荐' },
                    ...(save.rankLevel >= 8 ? [{ key: 'pref', label: '干部偏好' }] : []),
                  ] as { key: typeof coordSubTab; label: string }[]).map(st => (
                    <Pressable
                      key={st.key}
                      onPress={() => setCoordSubTab(st.key)}
                      style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: coordSubTab === st.key ? '#1D3B5E' : 'transparent' }}
                      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: coordSubTab === st.key ? '#fff' : '#555' }}>{st.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* 联络协调 */}
                {coordSubTab === 'contact' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                      <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                        📞 {secCfg.title}代为联络上下级，疏通工作关系，推动重点事项落实。每项联络每30天可使用一次。
                      </Text>
                    </View>
                    {[
                      { icon: '📞', title: '联络上级部门', desc: '请秘书代为联络上级主管部门，传递工作诉求', effect: '上司好感+2，政绩+3', eff: { meritGain: 3, bossFavorGain: 2 } },
                      { icon: '📋', title: '协调平级单位', desc: '与同级单位沟通协调，消除工作阻碍，增强协作', effect: '政绩+4', eff: { meritGain: 4 } },
                      { icon: '🏢', title: '指导下级工作', desc: '通过秘书渠道向下级传达工作指示，督促落实', effect: '政绩+5，治安+1', eff: { meritGain: 5, securityGain: 1 } },
                      ...(save.rankLevel >= 8 ? [
                        { icon: '🌐', title: '跨省对口联络', desc: '协调省级以上部门，推动重大项目及政策落地', effect: '政绩+8，上司好感+3', eff: { meritGain: 8, bossFavorGain: 3 } },
                      ] : []),
                      ...(save.rankLevel >= 10 ? [
                        { icon: '🏛️', title: '国家部委沟通', desc: '协调国家部委，争取专项政策支持与资金倾斜', effect: '政绩+12，上司好感+4', eff: { meritGain: 12, bossFavorGain: 4 } },
                      ] : []),
                    ].map(item => {
                      const CONTACT_COOLDOWN = 30;
                      const contactKey = 'sec_contact_' + item.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
                      const lastResult = getResult(contactKey);
                      const gameDays = save.gameDays ?? 0;
                      const inCooldown = lastResult ? (gameDays - lastResult.day) < CONTACT_COOLDOWN : false;
                      const cdLeft = inCooldown ? CONTACT_COOLDOWN - (gameDays - lastResult!.day) : 0;
                      return (
                        <View key={item.title} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: inCooldown ? '#D1D1CF' : '#D0DCE8', borderRadius: 6, overflow: 'hidden' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10 }}>
                            <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: inCooldown ? '#999' : '#1D3B5E' }}>{item.title}</Text>
                              <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{item.desc}</Text>
                              <Text style={{ fontSize: 10, color: inCooldown ? '#aaa' : '#2a7a3b', marginTop: 2 }}>
                                {inCooldown ? `⏳ 冷却中，还需 ${cdLeft} 天` : item.effect}
                              </Text>
                              {lastResult && (
                                <View style={{ backgroundColor: '#ECFDF5', borderRadius: 4, padding: 5, marginTop: 5, borderWidth: 1, borderColor: '#BBF7D0' }}>
                                  <Text style={{ fontSize: 9, color: '#065F46' }}>✅ 上次完成 · 第{lastResult.day}天 · {lastResult.desc.replace('✅ ', '').slice(0, 30)}</Text>
                                </View>
                              )}
                            </View>
                            <Pressable
                              onPress={async () => {
                                if (acting || inCooldown) return;
                                setActing(true);
                                try {
                                  await updateGameSave(buildEffectUpdates(save, { ...item.eff, label: '' }));
                                  await saveResult(contactKey, { ok: true, desc: `✅ ${item.title}完成，${item.effect}`, day: save.gameDays ?? 0 });
                                  showMsg(`✅ ${item.title}完成，${item.effect}`);
                                } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
                              }}
                              disabled={acting || inCooldown}
                              style={{ backgroundColor: inCooldown ? '#e5e7eb' : '#1D3B5E', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8, minWidth: 56, alignItems: 'center' }}
                            >
                              <Text style={{ color: inCooldown ? '#9ca3af' : '#fff', fontSize: 11, fontWeight: '700' }}>
                                {inCooldown ? `${cdLeft}天` : '联络'}
                              </Text>
                            </Pressable>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 接待安排 */}
                {coordSubTab === 'reception' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                      <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                        🏛️ {secCfg.title}负责统筹安排各类重要接待工作，展示地方形象与领导风范。
                      </Text>
                    </View>
                    {save.rankLevel < 7 ? (
                      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 32 }}>🔒</Text>
                        <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>接待安排功能在副处级（7级）后解锁</Text>
                      </View>
                    ) : (
                      [
                        { icon: '🏛️', title: '上级领导来访接待', desc: '精心安排上级领导考察参观，展示辖区亮点成效', effect: '上司好感+4，政绩+6', eff: { meritGain: 6, bossFavorGain: 4 } },
                        { icon: '🤝', title: '重要客商商务接待', desc: '高规格接待意向投资客商，助力招商引资工作', effect: '政绩+8，GDP+1', eff: { meritGain: 8, cityGdpGain: 1 } },
                        { icon: '🌐', title: '友好交流访问接待', desc: '接待兄弟省市代表团，加强区域协作联络', effect: '政绩+5，营商+1', eff: { meritGain: 5, cityBusinessGain: 1 } },
                        ...(save.rankLevel >= 10 ? [{ icon: '🏅', title: '外国代表团国事接待', desc: '按外事礼宾规范接待外国政府代表团，提升城市国际影响力', effect: '政绩+12，营商+2', eff: { meritGain: 12, cityBusinessGain: 2 } }] : []),
                      ].map(item => (
                        <SecActionRow
                          key={item.title}
                          icon={item.icon} title={item.title} desc={item.desc} effect={item.effect}
                          btnLabel="安排" btnColor="#7B5E2A" accentColor="#7B5E2A"
                          disabled={acting}
                          onPress={async () => {
                            if (acting) return;
                            setActing(true);
                            try {
                              await updateGameSave(buildEffectUpdates(save, { ...item.eff, label: '' }));
                              await refreshSave();
                              showMsg(`✅ ${item.title}顺利完成，${item.effect}`);
                            } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
                          }}
                        />
                      ))
                    )}
                  </View>
                )}

                {/* 干部推荐（原recommend tab内容） */}
                {coordSubTab === 'recommend' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                      <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                        🤝 {secCfg.title}可通过办公室渠道，协调将合适干部推荐至对应职位。职级越高，协调能力越强。
                      </Text>
                    </View>

                    {!secCfg.canRecommend ? (
                      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 32 }}>🔒</Text>
                        <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>干部推荐功能随职级提升后解锁</Text>
                      </View>
                    ) : recResult ? (
                      <View style={{ backgroundColor: '#f0faf3', borderWidth: 1, borderColor: '#2a7a3b', padding: 12 }}>
                        <Text style={{ fontSize: 13, color: '#2a7a3b', fontWeight: '600' }}>{recResult}</Text>
                        <Pressable onPress={() => setRecResult('')} style={{ marginTop: 8 }}>
                          <Text style={{ fontSize: 11, color: '#2a7a3b' }}>继续推荐 ›</Text>
                        </Pressable>
                      </View>
                    ) : (
                      <>
                        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>第一步：选择推荐干部</Text>
                          {subordinates.filter(s => !s.transferredCity).length === 0 ? (
                            <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>暂无可推荐干部</Text>
                          ) : (
                            <FlatList
                              data={subordinates.filter(s => !s.transferredCity)}
                              keyExtractor={s => s.id}
                              scrollEnabled={false}
                              renderItem={({ item: s }) => {
                                const isSelected = recSub?.id === s.id;
                                return (
                                  <Pressable
                                    onPress={() => setRecSub(s)}
                                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: isSelected ? '#EEF2F7' : '#fff', paddingHorizontal: 8 }}
                                    android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                                  >
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? '#1D3B5E' : '#D1D1CF', marginRight: 10 }} />
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '400', color: '#222' }}>{s.name}</Text>
                                      <Text style={{ fontSize: 10, color: '#888' }}>{s.appointedRole ?? '待分配'} · 能力{s.ability} · 忠诚{s.loyalty}</Text>
                                    </View>
                                    {isSelected && <Text style={{ color: '#1D3B5E', fontSize: 12, fontWeight: '700' }}>✓ 已选</Text>}
                                  </Pressable>
                                );
                              }}
                            />
                          )}
                        </View>
                        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>第二步：选择目标部门</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            {availableDepts.map(dk => {
                              const dName = getDeptNameByRank(dk, save.rankLevel);
                              const isSel = recDept === dk;
                              return (
                                <Pressable
                                  key={dk}
                                  onPress={() => setRecDept(dk)}
                                  style={{ backgroundColor: isSel ? '#1D3B5E' : '#EEF2F7', paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: isSel ? '#1D3B5E' : '#D1D1CF' }}
                                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                                >
                                  <Text style={{ fontSize: 11, color: isSel ? '#fff' : '#333' }}>{dName}</Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>第三步：选择推荐职位</Text>
                          {RECOMMEND_POSITIONS.map(rp => {
                            const isSel = recPos === rp.pos;
                            return (
                              <Pressable
                                key={rp.pos}
                                onPress={() => setRecPos(rp.pos)}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 6, borderWidth: 1.5, borderColor: isSel ? '#C82829' : '#E0E0E0', backgroundColor: isSel ? '#fff5f5' : '#fafafa' }}
                                android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                              >
                                <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isSel ? '#C82829' : '#ccc', backgroundColor: isSel ? '#C82829' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                                  {isSel && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '600', color: isSel ? '#C82829' : '#333' }}>{rp.label}</Text>
                                  <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{rp.desc}</Text>
                                </View>
                              </Pressable>
                            );
                          })}
                        </View>
                        <Pressable
                          onPress={() => void handleRecommend()}
                          disabled={acting || !recSub || !recDept || !recPos}
                          style={{ backgroundColor: (!recSub || !recDept || !recPos) ? '#ccc' : '#C82829', padding: 14, alignItems: 'center' }}
                          android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                        >
                          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                            {acting ? '处理中…' : recSub && recDept && recPos
                              ? `📋 由${secCfg.title}协调推荐 ${recSub.name} 至 ${getDeptNameByRank(recDept, save.rankLevel)}`
                              : '请完成上述三步选择'}
                          </Text>
                        </Pressable>
                      </>
                    )}
                  </View>
                )}

                {/* 干部交流偏好 */}
                {coordSubTab === 'pref' && save.rankLevel >= 8 && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                      <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                        ⚙️ 设置{secCfg.title}对每180天触发的干部交流任职请求的自动处理方式。
                      </Text>
                    </View>
                    {(['manual', 'auto-accept', 'auto-decline'] as const).map(mode => {
                      const labels: Record<string, string> = {
                        'manual':       '📋 手动处理（每次弹窗让您决定）',
                        'auto-accept':  '✅ 自动接收（秘书代为接收交流干部入编）',
                        'auto-decline': '🚫 自动婉拒（秘书代为婉拒，不入编）',
                      };
                      const descs: Record<string, string> = {
                        'manual':       '收到请求时显示弹窗，由您亲自决定是否接收。',
                        'auto-accept':  '自动接收所有交流干部，扩充人才储备，但需额外管理成本。',
                        'auto-decline': '自动婉拒所有交流请求，保持团队稳定，减少管理负担。',
                      };
                      const isActive = (save.exchangeAutoMode ?? 'manual') === mode;
                      return (
                        <Pressable
                          key={mode}
                          onPress={async () => {
                            if (isActive) return;
                            await updateGameSave({ exchangeAutoMode: mode });
                            await refreshSave();
                            showMsg('✅ 干部交流偏好已更新');
                          }}
                          style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderWidth: 1.5, borderColor: isActive ? '#1D3B5E' : '#DDD', backgroundColor: isActive ? '#EEF2F7' : '#fafafa' }}
                          android_ripple={{ color: 'rgba(0,0,0,0.06)' }}
                        >
                          <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isActive ? '#1D3B5E' : '#bbb', backgroundColor: isActive ? '#1D3B5E' : 'transparent', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                            {isActive && <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#fff' }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, color: isActive ? '#1D3B5E' : '#333', fontWeight: isActive ? '700' : '400' }}>{labels[mode]}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 4, lineHeight: 15 }}>{descs[mode]}</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {acting && tab !== 'main' && <ActivityIndicator color="#1D3B5E" />}

            {/* ══════ 巡查督导 (rank5+) ══════ */}
            {tab === 'inspect' && (
              <View style={{ gap: 14 }}>
                {/* 说明栏 */}
                <View style={{ backgroundColor: '#1D3B5E', padding: 14, gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 28 }}>🔍</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>巡查督导</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 2 }}>
                        派秘书赴各部门开展督导检查，每次消耗15点能力值
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 6 }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{inspectDone.size}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>已督导</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{availableDepts.length - inspectDone.size}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>待督导</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ color: effectiveAbility >= 15 ? '#7fd9a0' : '#f9a8a8', fontSize: 16, fontWeight: '700' }}>{effectiveAbility}</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>当前能力值</Text>
                    </View>
                  </View>
                </View>

                {/* 能力值不足提示 */}
                {effectiveAbility < 15 && (
                  <View style={{ backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F5C6C6', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>⚠️</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#C82829', lineHeight: 16 }}>
                      秘书当前能力值不足15点，无法执行巡查。能力值每月自动恢复，上限{secCfg.abilityMax}点。
                    </Text>
                  </View>
                )}

                {/* 本次巡查统计 */}
                {inspectDone.size > 0 && (
                  <View style={{ backgroundColor: '#F0F8F1', borderWidth: 1, borderColor: '#C3E6CB', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#2a7a3b', fontWeight: '700', marginBottom: 4 }}>📋 本次巡查记录</Text>
                    {Array.from(inspectDone).map(dk => {
                      const res = inspectResults[dk];
                      const deptName = getDeptNameByRank(dk, save.rankLevel);
                      return res ? (
                        <View key={dk} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
                          <Text style={{ fontSize: 12, marginTop: 1 }}>{res.isIssue ? '⚠️' : '✅'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: res.isIssue ? '#7B5E2A' : '#2a7a3b' }}>{deptName}</Text>
                            <Text style={{ fontSize: 10, color: '#666', lineHeight: 14, marginTop: 1 }}>{res.text}</Text>
                          </View>
                        </View>
                      ) : null;
                    })}
                  </View>
                )}

                {/* 部门列表 */}
                {availableDepts.map(dk => {
                  const cfg = DEPT_INSPECT[dk];
                  const deptName = getDeptNameByRank(dk, save.rankLevel);
                  const done = inspectDone.has(dk);
                  const res = inspectResults[dk];
                  const canInspect = !done && effectiveAbility >= 15 && !acting;
                  const deptCfg = DEPT_CONFIG[dk];
                  return (
                    <View
                      key={dk}
                      style={{
                        backgroundColor: '#fff', borderWidth: 1,
                        borderColor: done ? (res?.isIssue ? '#F5C6C6' : '#C3E6CB') : '#D1D1CF',
                        overflow: 'hidden',
                      }}
                    >
                      {/* 部门标题行 */}
                      <View style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12,
                        backgroundColor: done ? (res?.isIssue ? '#FFF8F8' : '#F5FFF7') : '#F9F9F9',
                        borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
                      }}>
                        <Text style={{ fontSize: 24 }}>{deptCfg.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{deptName}</Text>
                          <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{cfg.effectDesc}</Text>
                        </View>
                        {done ? (
                          <View style={{
                            paddingHorizontal: 8, paddingVertical: 3,
                            backgroundColor: res?.isIssue ? '#FFF0F0' : '#F0F8F1',
                            borderWidth: 1, borderColor: res?.isIssue ? '#F5C6C6' : '#C3E6CB',
                          }}>
                            <Text style={{ fontSize: 10, color: res?.isIssue ? '#C82829' : '#2a7a3b', fontWeight: '700' }}>
                              {res?.isIssue ? '⚠️ 发现问题' : '✅ 督导完成'}
                            </Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => void handleInspect(dk)}
                            disabled={!canInspect}
                            style={{
                              backgroundColor: canInspect ? '#1D3B5E' : '#ccc',
                              paddingHorizontal: 12, paddingVertical: 6,
                            }}
                            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🔍 巡查</Text>
                          </Pressable>
                        )}
                      </View>

                      {/* 督导结果详情 */}
                      {done && res && (
                        <View style={{ padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                          <Text style={{ fontSize: 16 }}>{res.isIssue ? '📋' : '📄'}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{res.text}</Text>
                            <Text style={{ fontSize: 9, color: '#aaa', marginTop: 3 }}>
                              政绩+{res.isIssue ? Math.max(3, cfg.meritBase - 3) : cfg.meritBase} · 消耗能力值15
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ══════ 警卫安保 ══════ */}
            {tab === 'guard' && (() => {
              const guardCfg = getGuardConfig(save.rankLevel);
              return (
                <>
                  <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Text style={{ fontSize: 32 }}>🛡️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{guardCfg.level}</Text>
                        <Text style={{ color: 'rgba(180,200,230,0.8)', fontSize: 10, marginTop: 2 }}>{guardCfg.rank}</Text>
                      </View>
                      <View style={{ backgroundColor: save.rankLevel >= 14 ? '#C82829' : save.rankLevel >= 12 ? '#7B5E2A' : save.rankLevel >= 8 ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                          {save.rankLevel >= 14 ? '国家级' : save.rankLevel >= 12 ? '省部级' : save.rankLevel >= 8 ? '厅局级' : '处级'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: 'rgba(200,220,240,0.8)', fontSize: 11, lineHeight: 17 }}>{guardCfg.upgradeDesc}</Text>
                  </View>

                  {guardCfg.totalGuards > 0 ? (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF' }}>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 1 }}>警卫人员配置</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>参照中央警卫条例，按职级标准配备</Text>
                      </View>
                      {[
                        { label: '贴身警卫', count: guardCfg.personalGuards, icon: '👮', desc: '24小时随身护卫，具备反恐特训资质' },
                        { label: '随车警卫', count: guardCfg.vehicleGuards, icon: '🚗', desc: '出行车队护卫，含前导车辆和后卫车辆' },
                        { label: '住所警卫', count: guardCfg.residenceGuards, icon: '🏛️', desc: '驻守官邸及办公场所' },
                        { label: '警卫总人数', count: guardCfg.totalGuards, icon: '🎖️', desc: '警卫队伍总规模（含后备人员）' },
                      ].map((item, i) => (
                        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F0F0F0', gap: 10 }}>
                          <View style={{ width: 40, height: 40, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{item.label}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{item.desc}</Text>
                          </View>
                          <View style={{ backgroundColor: item.label === '警卫总人数' ? '#1D3B5E' : '#F0F4F8', paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: item.label === '警卫总人数' ? '#fff' : '#1D3B5E', fontVariant: ['tabular-nums'] }}>{item.count}</Text>
                            <Text style={{ fontSize: 8, color: item.label === '警卫总人数' ? 'rgba(255,255,255,0.7)' : '#888' }}>人</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center' }}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                      <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>当前级别暂未配备专属警卫</Text>
                      <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>晋升至县处级（6级）后配备基础安保</Text>
                    </View>
                  )}

                  {guardCfg.totalGuards > 0 && (
                    <>
                      <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                        <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700' }}>🔐 安保特勤任务</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>指派警卫处执行安保任务，提升安全指数</Text>
                      </View>
                      {GUARD_TASKS.map((task, i) => {
                        const canAfford = (save.fundBalance ?? 0) >= task.cost;
                        return (
                          <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 22 }}>{task.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{task.name}</Text>
                                <Text style={{ fontSize: 10, color: '#888', marginTop: 2, lineHeight: 14 }}>{task.desc}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                  <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 5, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 9, color: '#7B5E2A' }}>费用 ¥{task.cost}万</Text>
                                  </View>
                                  <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 5, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 9, color: '#1D3B5E' }}>安全+{task.secGain}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                            <Pressable
                              onPress={async () => {
                                if (!canAfford || acting) return;
                                setActing(true);
                                try {
                                  const curSec = save.securityIndex ?? 50;
                                  await updateGameSave({ fundBalance: (save.fundBalance ?? 0) - task.cost, securityIndex: Math.min(100, curSec + task.secGain) });
                                  await refreshSave();
                                  showMsg(`✅ ${task.name}完成，安全指数+${task.secGain}`);
                                } catch { showMsg('操作失败，请稍后重试'); } finally { setActing(false); }
                              }}
                              disabled={!canAfford || acting}
                              style={{ backgroundColor: canAfford ? '#1D3B5E' : '#CCC', paddingVertical: 9, alignItems: 'center' }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                                {canAfford ? `▶ 执行（¥${task.cost}万）` : '经费不足'}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}
