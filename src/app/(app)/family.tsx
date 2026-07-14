// 家族页 —— 家族声望 / 产业 / 活动 / 婚育 / 族谱，融合原家庭生活
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getFamilyMembers, addSpouse, addChild, updateFamilyMember, updateSave } from '@/db/gameApi';
import type { FamilyMember, BlindDateNpc } from '@/types/game';

// ── 子女成长阶段 ──────────────────────────────────────────────────
type GrowthStage = '婴幼儿' | '小学' | '中学' | '大学' | '工作' | '成家';
function getGrowthStage(age: number, child: FamilyMember): GrowthStage {
  if (age < 6)  return '婴幼儿';
  if (age < 12) return '小学';
  if (age < 18) return '中学';
  if (age < 23) return '大学';
  if (!child.adultPath?.includes('已婚')) return '工作';
  return '成家';
}
const STAGE_COLOR: Record<GrowthStage, string> = {
  '婴幼儿': '#888', '小学': '#1D3B5E', '中学': '#7B5E2A',
  '大学': '#2a7a3b', '工作': '#C82829', '成家': '#4a2c8a',
};

const CHILD_INVEST_OPTIONS = [
  { label: '加强学习', desc: '报课外辅导班', studyDelta: 8, moralDelta: -2, cost: 20 },
  { label: '品德教育', desc: '培养良好品格', moralDelta: 8, studyDelta: -1, cost: 15 },
  { label: '体育锻炼', desc: '参加体育运动', healthDelta: 10, cost: 10 },
  { label: '综合培养', desc: '全面均衡发展', studyDelta: 4, moralDelta: 4, healthDelta: 3, cost: 30 },
];
type InvestOption = typeof CHILD_INVEST_OPTIONS[number];

const SCHOOL_OPTIONS = [
  { label: '普通学校',   desc: '均衡发展，学业+4·品德+2',      studyBonus: 4,  moralBonus: 2,  cost: 0,   tag: '免费' },
  { label: '重点学校',   desc: '学业提升明显，学业+10·品德+3',  studyBonus: 10, moralBonus: 3,  cost: 30,  tag: '推荐' },
  { label: '国际学校',   desc: '视野开阔，学业+6·品德+6',      studyBonus: 6,  moralBonus: 6,  cost: 60,  tag: '精英' },
  { label: '贵族寄宿校', desc: '全面发展，学业+8·品德+8·健康+5', studyBonus: 8,  moralBonus: 8,  cost: 100, tag: '豪华' },
];

const CAREER_OPTIONS = [
  { label: '考公务员', desc: '走上仕途，品德+5·每年为您带来政绩奖励', meritBonus: 10, moralBonus: 5,  tag: '稳定' },
  { label: '经商创业', desc: '白手起家，每年为您带来更多资金',           meritBonus: 15, moralBonus: 0,  tag: '高薪' },
  { label: '学术研究', desc: '从事科研，声望与品德双提升',               meritBonus: 5,  moralBonus: 8,  tag: '声望' },
  { label: '出国发展', desc: '赴海外发展，开阔眼界，声望+10',            meritBonus: 8,  moralBonus: 3,  tag: '海外' },
  { label: '艺术从业', desc: '投身文艺，家庭幸福度持续提升',             meritBonus: 3,  moralBonus: 6,  tag: '幸福' },
];

const MARRIAGE_OPTIONS = [
  { label: '自由恋爱', desc: '子女自行择偶，幸福度+10',           meritBonus: 0,  moralBonus: 5,  tag: '民心' },
  { label: '父母介绍', desc: '你为其物色对象，增进家庭关系值',     meritBonus: 5,  moralBonus: 3,  tag: '关系' },
  { label: '政治联姻', desc: '与官宦家庭联姻，政绩+20但幸福度-5', meritBonus: 20, moralBonus: -3, tag: '仕途' },
  { label: '商业联姻', desc: '与富商家庭结亲，政绩+15',           meritBonus: 15, moralBonus: 0,  tag: '财力' },
];

const CHILD_RANKS = [
  { rank: 1,  label: '办事员', nextCost: 5,   meritGain: 2 },
  { rank: 2,  label: '科员',   nextCost: 8,   meritGain: 3 },
  { rank: 3,  label: '副科级', nextCost: 10,  meritGain: 4 },
  { rank: 4,  label: '正科级', nextCost: 12,  meritGain: 5 },
  { rank: 5,  label: '副处级', nextCost: 15,  meritGain: 6 },
  { rank: 6,  label: '正处级', nextCost: 20,  meritGain: 8 },
  { rank: 7,  label: '副厅级', nextCost: 28,  meritGain: 10 },
  { rank: 8,  label: '正厅级', nextCost: 38,  meritGain: 13 },
  { rank: 9,  label: '副部级', nextCost: 50,  meritGain: 18 },
  { rank: 10, label: '正部级', nextCost: 0,   meritGain: 25 },
];

const CHILD_TRANSFER_DEPTS = [
  { dept: '联邦内阁办公厅', tag: '核心', minPlayerRank: 13 },
  { dept: '财政部',         tag: '要职', minPlayerRank: 11 },
  { dept: '发改委',         tag: '要职', minPlayerRank: 11 },
  { dept: '省执政委组织部', tag: '省级', minPlayerRank: 9 },
  { dept: '省政府办公厅',   tag: '省级', minPlayerRank: 9 },
  { dept: '市委组织部',     tag: '市级', minPlayerRank: 7 },
  { dept: '市政府办公室',   tag: '市级', minPlayerRank: 7 },
  { dept: '区县政府',       tag: '基层', minPlayerRank: 5 },
];

// ── 家族活动配置 ─────────────────────────────────────────────────
const CLAN_ACTIVITIES = [
  {
    key: 'ritual',       icon: '🏮', label: '祭祖仪式',
    desc: '举行祖先祭祀仪式，凝聚族心，传承家训。',
    cooldownDays: 365, meritCost: 10, clanFundCost: 0,
    effects: { prestigeDelta: 20, heritageDelta: 8, moralDelta: 5, elderFavorDelta: 10 },
    lastDayField: 'clanLastRitualDay' as const,
  },
  {
    key: 'meeting',      icon: '🪑', label: '家族会议',
    desc: '召集族内骨干，商讨家族大事与未来规划。',
    cooldownDays: 180, meritCost: 8, clanFundCost: 0,
    effects: { prestigeDelta: 10, elderFavorDelta: 15, memberCountDelta: 0 },
    lastDayField: 'clanLastMeetingDay' as const,
  },
  {
    key: 'support_edu',  icon: '📚', label: '资助族人求学',
    desc: '设立家族奖学金，资助贫困族人完成学业。',
    cooldownDays: 365, meritCost: 0, clanFundCost: 30,
    effects: { prestigeDelta: 15, heritageDelta: 5, moralDelta: 8, memberCountDelta: 1 },
    lastDayField: null,
  },
  {
    key: 'support_job',  icon: '💼', label: '扶持族人就业',
    desc: '利用关系网络，为有能力的族人安排工作机会。',
    cooldownDays: 180, meritCost: 20, clanFundCost: 0,
    effects: { prestigeDelta: 10, memberCountDelta: 1, elderFavorDelta: 8 },
    lastDayField: null,
  },
  {
    key: 'feast',        icon: '🍽️', label: '族宴聚餐',
    desc: '设宴款待族内老少，增进族人感情与凝聚力。',
    cooldownDays: 180, meritCost: 0, clanFundCost: 20,
    effects: { prestigeDelta: 8, elderFavorDelta: 12, memberCountDelta: 0 },
    lastDayField: null,
  },
  {
    key: 'genealogy',    icon: '📜', label: '修订族谱',
    desc: '整理家族历史，完善谱系记录，彰显家族底蕴。',
    cooldownDays: 730, meritCost: 5, clanFundCost: 0,
    effects: { prestigeDelta: 25, heritageDelta: 20, elderFavorDelta: 5 },
    lastDayField: null,
  },
];

// ── 家族产业配置 ─────────────────────────────────────────────────
const CLAN_INDUSTRY_TYPES = [
  { type: '农业', icon: '🌾', desc: '耕地经营、农产品加工，稳定收益', upgradeCostMerit: [0, 15, 30, 50], monthlyIncome: [0, 5, 12, 25] },
  { type: '工业', icon: '🏭', desc: '制造业、建材供应，产能持续扩张', upgradeCostMerit: [0, 20, 40, 70], monthlyIncome: [0, 8, 18, 40] },
  { type: '商业', icon: '🏬', desc: '零售批发、连锁门店，现金流充裕', upgradeCostMerit: [0, 18, 35, 60], monthlyIncome: [0, 10, 22, 45] },
  { type: '教育', icon: '🎓', desc: '培训机构、民办学校，声誉双丰收', upgradeCostMerit: [0, 12, 25, 45], monthlyIncome: [0, 6, 14, 30] },
  { type: '金融', icon: '💰', desc: '投资咨询、小额信贷，回报率最高', upgradeCostMerit: [0, 25, 50, 90], monthlyIncome: [0, 12, 28, 60] },
];

function getIndustryCfg(type: string) {
  return CLAN_INDUSTRY_TYPES.find(i => i.type === type) ?? CLAN_INDUSTRY_TYPES[0];
}

function calcClanPrestigeLabel(p: number) {
  if (p < 50)  return { label: '无名小族', color: '#888' };
  if (p < 150) return { label: '乡绅之家', color: '#7B5E2A' };
  if (p < 300) return { label: '望族名门', color: '#1D3B5E' };
  if (p < 500) return { label: '百年世家', color: '#2a7a3b' };
  return { label: '显赫名族', color: '#C82829' };
}

function ScoreMini({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <Text style={{ fontSize: 9, color: '#888' }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '700', color: color ?? '#222' }}>{value}</Text>
    </View>
  );
}

function calcChildAge(birthDay: number, gameDays: number): number {
  return Math.floor((gameDays - birthDay) / 365);
}
function getChildMilestone(child: FamilyMember): string | null {
  if (child.studyScore >= 80 && child.moralScore >= 80) return '🏆 品学兼优';
  if (child.studyScore >= 80) return '📚 学业优秀';
  if (child.moralScore >= 80) return '🌟 品德高尚';
  return null;
}
function getChildOfficialRank(child: FamilyMember): number {
  const m = child.adultPath?.match(/官职级(\d+)/);
  return m ? parseInt(m[1]) : 1;
}
function getChildOfficialDept(child: FamilyMember): string {
  const m = child.adultPath?.match(/部门:([^|]+)/);
  return m ? m[1] : '基层单位';
}

type TabKey = 'overview' | 'marriage' | 'industry' | 'activity' | 'genealogy';

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { saveResult } = useActionResults();  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [tab, setTab] = useState<TabKey>('overview');

  // 婚育状态
  const [showMarryForm, setShowMarryForm] = useState(false);
  const [spouseName, setSpouseName] = useState('');
  const [spouseGender, setSpouseGender] = useState<'男' | '女'>('女');
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [selectedNpc, setSelectedNpc] = useState<BlindDateNpc | null>(null);

  // 产业状态
  const [selectedIndustry, setSelectedIndustry] = useState('');

  const isMarried = save?.marriageStatus === 'married';
  const spouse = members.find(m => m.memberType === 'spouse');
  const children = members.filter(m => m.memberType === 'child');

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      getFamilyMembers(save.id).then(data => {
        setMembers(data);
        setLoading(false);
      });
    }, [save])
  );

  const showMsg = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  // ── 婚育操作 ─────────────────────────────────────────────────────
  const handleMarry = async () => {
    if (!save || !spouseName.trim()) return;
    const newSpouse = await addSpouse(save.id, save.userId, spouseName.trim(), spouseGender, save.gameDays);
    if (!newSpouse) { showMsg('结婚操作失败，请重试', false); return; }
    await updateGameSave({ marriageStatus: 'married', familyHappiness: Math.min(100, save.familyHappiness + 20), spouseRelationValue: 70, marriageDay: save.gameDays });
    setShowMarryForm(false); setSpouseName('');
    getFamilyMembers(save.id).then(setMembers);
    const marryMsg = `🎊 恭喜！与 ${spouseName} 步入婚姻殿堂`;
    void saveResult('family_marry', { ok: true, desc: marryMsg, day: save.gameDays });
    showMsg(marryMsg, true);
  };

  const handleDate = async () => {
    if (!save || !isMarried) return;
    if (save.meritPoints < 10) { showMsg('约会需消耗10政绩（当前不足）', false); return; }
    await updateGameSave({ meritPoints: save.meritPoints - 10, spouseRelationValue: Math.min(100, (save.spouseRelationValue ?? 50) + 15), familyHappiness: Math.min(100, save.familyHappiness + 5) });
    const dateMsg = '💑 约会愉快！配偶关系值+15，幸福度+5';
    void saveResult('family_date', { ok: true, desc: dateMsg, day: save.gameDays });
    showMsg(dateMsg);
  };

  const handleBoostNpcFavor = async (npc: BlindDateNpc) => {
    if (!save) return;
    if (save.meritPoints < 5) { showMsg('联系对方需要5点政绩（当前不足）', false); return; }
    const updated = save.blindDateNpcs.map(n => n.id === npc.id ? { ...n, favor: Math.min(100, n.favor + 5), introduced: true } : n);
    await updateSave(save.id, { blindDateNpcs: updated });
    await updateGameSave({ meritPoints: save.meritPoints - 5, blindDateNpcs: updated });
    if (selectedNpc?.id === npc.id) setSelectedNpc(prev => prev ? { ...prev, favor: Math.min(100, prev.favor + 5) } : prev);
    showMsg(`💬 主动联系了 ${npc.name}，好感度+5`);
  };

  const handleProposeNpc = async (npc: BlindDateNpc) => {
    if (!save) return;
    if (npc.favor < 60) { showMsg('对方好感度未达到60，暂时不接受求婚', false); return; }
    const newSpouse = await addSpouse(save.id, save.userId, npc.name, npc.gender, save.gameDays);
    if (!newSpouse) { showMsg('求婚操作失败，请重试', false); return; }
    await updateGameSave({ marriageStatus: 'married', familyHappiness: Math.min(100, save.familyHappiness + 20), spouseRelationValue: npc.favor, marriageDay: save.gameDays, blindDateNpcs: [] });
    setSelectedNpc(null);
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🎊 恭喜！${npc.name} 接受了您的求婚！`);
  };

  const handleHaveChild = async (gender: '男' | '女') => {
    if (!save || !isMarried) return;
    const familyName = save.playerName.charAt(0);
    const child = await addChild(save.id, save.userId, gender, save.gameDays, familyName);
    if (!child) { showMsg('操作失败，请重试', false); return; }
    await updateGameSave({ familyHappiness: Math.min(100, save.familyHappiness + 15) });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🍼 恭喜！迎来一位${gender}宝宝`);
  };

  const handleInvest = async (child: FamilyMember, opt: InvestOption) => {
    if (!save) return;
    const updates: Parameters<typeof updateFamilyMember>[1] = {};
    if ((opt as {studyDelta?:number}).studyDelta) updates.studyScore = Math.min(100, child.studyScore + ((opt as {studyDelta?:number}).studyDelta ?? 0));
    if ((opt as {moralDelta?:number}).moralDelta) updates.moralScore = Math.min(100, child.moralScore + ((opt as {moralDelta?:number}).moralDelta ?? 0));
    if ((opt as {healthDelta?:number}).healthDelta) updates.healthScore = Math.min(100, child.healthScore + ((opt as {healthDelta?:number}).healthDelta ?? 0));
    await updateFamilyMember(child.id, updates);
    getFamilyMembers(save.id).then(setMembers);
    setExpandedChild(null);
    showMsg(`✓ 对 ${child.name} 实施「${opt.label}」，效果已更新`);
  };

  const handleChooseSchool = async (child: FamilyMember, opt: typeof SCHOOL_OPTIONS[0]) => {
    if (!save) return;
    if (save.meritPoints < opt.cost) { showMsg(`政绩不足，需 ${opt.cost} 点政绩`, false); return; }
    await updateFamilyMember(child.id, { studyScore: Math.min(100, child.studyScore + opt.studyBonus), moralScore: Math.min(100, child.moralScore + opt.moralBonus), adultPath: `学校:${opt.label}` });
    if (opt.cost > 0) await updateGameSave({ meritPoints: save.meritPoints - opt.cost });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`✅ ${child.name} 就读${opt.label}！学业+${opt.studyBonus} 品德+${opt.moralBonus}`);
  };

  const handleChooseCareer = async (child: FamilyMember, opt: typeof CAREER_OPTIONS[0]) => {
    if (!save) return;
    await updateFamilyMember(child.id, { job: opt.label, isAdult: true, adultPath: `职业:${opt.label}`, moralScore: Math.min(100, child.moralScore + opt.moralBonus) });
    if (opt.meritBonus > 0) await updateGameSave({ meritPoints: save.meritPoints + opt.meritBonus });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🎓 ${child.name} 选择了「${opt.label}」！政绩+${opt.meritBonus}`);
  };

  const handleChildPromote = async (child: FamilyMember) => {
    if (!save) return;
    const curRank = getChildOfficialRank(child);
    const rankInfo = CHILD_RANKS[curRank - 1];
    if (!rankInfo || rankInfo.nextCost === 0) { showMsg(`${child.name} 已是最高级别`, false); return; }
    if (save.meritPoints < rankInfo.nextCost) { showMsg(`政绩不足，晋升需${rankInfo.nextCost}点政绩`, false); return; }
    const nextLabel = CHILD_RANKS[curRank]?.label ?? '顶级';
    const newPath = (child.adultPath ?? '').includes('官职级')
      ? (child.adultPath ?? '').replace(/官职级\d+/, `官职级${curRank + 1}`)
      : `${child.adultPath ?? ''}|官职级${curRank + 1}|职级:${nextLabel}`;
    await updateFamilyMember(child.id, { adultPath: newPath });
    await updateGameSave({ meritPoints: save.meritPoints - rankInfo.nextCost });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🎖️ ${child.name} 晋升至【${nextLabel}】！消耗${rankInfo.nextCost}政绩`);
  };

  const handleChildTransfer = async (child: FamilyMember, dept: typeof CHILD_TRANSFER_DEPTS[0]) => {
    if (!save) return;
    if (save.meritPoints < 15) { showMsg('调任需消耗15点政绩', false); return; }
    const curPath = child.adultPath ?? '';
    const newPath = curPath.includes('部门:') ? curPath.replace(/部门:[^|]+/, `部门:${dept.dept}`) : `${curPath}|部门:${dept.dept}`;
    await updateFamilyMember(child.id, { adultPath: newPath });
    await updateGameSave({ meritPoints: save.meritPoints - 15 });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`📋 ${child.name} 已调任至【${dept.dept}】`);
  };

  const handleArrangeMarriage = async (child: FamilyMember, opt: typeof MARRIAGE_OPTIONS[0]) => {
    if (!save) return;
    await updateFamilyMember(child.id, { adultPath: `${child.adultPath ?? ''}|已婚:${opt.label}`, moralScore: Math.min(100, Math.max(0, child.moralScore + opt.moralBonus)) });
    await updateGameSave({ meritPoints: save.meritPoints + opt.meritBonus, familyHappiness: Math.min(100, save.familyHappiness + 8) });
    getFamilyMembers(save.id).then(setMembers);
    showMsg(`🎊 ${child.name} 通过「${opt.label}」完成婚配！政绩+${opt.meritBonus}`);
  };

  // ── 家族活动操作 ─────────────────────────────────────────────────
  const handleClanActivity = async (act: typeof CLAN_ACTIVITIES[0]) => {
    if (!save) return;
    // 冷却检查
    const lastDay = act.lastDayField ? (save[act.lastDayField] ?? 0) : 0;
    if (act.lastDayField && save.gameDays - lastDay < act.cooldownDays) {
      const remaining = act.cooldownDays - (save.gameDays - lastDay);
      showMsg(`「${act.label}」冷却中，还需 ${remaining} 天`, false); return;
    }
    if (act.meritCost > 0 && save.meritPoints < act.meritCost) {
      showMsg(`政绩不足，需 ${act.meritCost} 点政绩`, false); return;
    }
    const fund = save.clanFund ?? 0;
    if (act.clanFundCost > 0 && fund < act.clanFundCost) {
      showMsg(`家族基金不足，需 ${act.clanFundCost} 万元`, false); return;
    }
    const e = act.effects;
    const updates: Parameters<typeof updateGameSave>[0] = {
      meritPoints: save.meritPoints - act.meritCost,
      clanFund: Math.max(0, fund - act.clanFundCost),
      clanPrestige:    Math.min(999, (save.clanPrestige ?? 0) + (e.prestigeDelta ?? 0)),
      clanHeritage:    Math.min(500, (save.clanHeritage ?? 0) + (e.heritageDelta ?? 0)),
      clanElderFavor:  Math.min(100, (save.clanElderFavor ?? 50) + (e.elderFavorDelta ?? 0)),
      clanMemberCount: Math.max(1, (save.clanMemberCount ?? 1) + (e.memberCountDelta ?? 0)),
      moralValue:      Math.min(100, (save.moralValue ?? 50) + (e.moralDelta ?? 0)),
    };
    if (act.key === 'ritual')   updates.clanLastRitualDay  = save.gameDays;
    if (act.key === 'meeting')  updates.clanLastMeetingDay = save.gameDays;
    // 记录事件日志
    const log = [...((save.clanEventsLog ?? []).slice(-49)), `[第${Math.floor(save.gameDays/30)}月] ${act.icon}${act.label}`];
    updates.clanEventsLog = log;
    await updateGameSave(updates);
    const clanMsg = `${act.icon} 「${act.label}」完成！声望+${e.prestigeDelta ?? 0}${e.moralDelta ? ` 道德+${e.moralDelta}` : ''}`;
    void saveResult('family_clan_' + act.key, { ok: true, desc: clanMsg, day: save.gameDays });
    showMsg(clanMsg);
  };

  // ── 家族产业操作 ─────────────────────────────────────────────────
  const handleChooseIndustry = async (type: string) => {
    if (!save) return;
    if (save.clanIndustryLevel > 0) { showMsg('已有产业，请升级现有产业', false); return; }
    await updateGameSave({ clanIndustryType: type, clanIndustryLevel: 1, clanPrestige: Math.min(999, (save.clanPrestige ?? 0) + 15) });
    const industryMsg = `🏗️ 家族产业「${type}」正式创立！声望+15`;
    void saveResult('family_industry_found', { ok: true, desc: industryMsg, day: save.gameDays });
    showMsg(industryMsg);
  };

  const handleUpgradeIndustry = async () => {
    if (!save) return;
    const level = save.clanIndustryLevel ?? 0;
    if (level >= 3) { showMsg('产业已达最高等级（集团级）', false); return; }
    const cfg = getIndustryCfg(save.clanIndustryType);
    const cost = cfg.upgradeCostMerit[level + 1] ?? 999;
    if (save.meritPoints < cost) { showMsg(`升级需 ${cost} 点政绩（当前不足）`, false); return; }
    const levelLabels = ['', '小作坊', '企业', '集团'];
    await updateGameSave({
      meritPoints: save.meritPoints - cost,
      clanIndustryLevel: level + 1,
      clanPrestige: Math.min(999, (save.clanPrestige ?? 0) + 20),
    });
    const upgradeMsg = `🏭 产业升级为【${levelLabels[level + 1]}】！声望+20`;
    void saveResult('family_industry_upgrade', { ok: true, desc: upgradeMsg, day: save.gameDays });
    showMsg(upgradeMsg);
  };

  const handleDonateToFund = async () => {
    if (!save) return;
    if (save.meritPoints < 20) { showMsg('捐资需消耗20政绩', false); return; }
    await updateGameSave({ meritPoints: save.meritPoints - 20, clanFund: (save.clanFund ?? 0) + 50, clanPrestige: Math.min(999, (save.clanPrestige ?? 0) + 5) });
    const donateMsg = '💰 捐资50万元入家族基金，声望+5';
    void saveResult('family_donate', { ok: true, desc: donateMsg, day: save.gameDays });
    showMsg(donateMsg);
  };

  if (loading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <ActivityIndicator size="large" color="#7B5E2A" />
      </View>
    );
  }

  const prestige = save.clanPrestige ?? 0;
  const clanLabel = calcClanPrestigeLabel(prestige);
  const clanLevel = save.clanIndustryLevel ?? 0;
  const clanFund  = save.clanFund ?? 0;
  const elderFavor = save.clanElderFavor ?? 50;
  const heritage  = save.clanHeritage ?? 0;
  const industryType = save.clanIndustryType ?? '';
  const industryCfg  = industryType ? getIndustryCfg(industryType) : null;
  const monthlyIndustryIncome = industryCfg ? (industryCfg.monthlyIncome[clanLevel] ?? 0) : 0;
  const levelLabels = ['无', '小作坊', '企业', '集团'];
  const relationValue = save.spouseRelationValue ?? 50;
  const relationColor = relationValue >= 70 ? '#2a7a3b' : relationValue >= 40 ? '#e67e22' : '#C82829';

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'overview',  label: '总览',  icon: '🏯' },
    { key: 'marriage',  label: '婚育',  icon: '👨‍👩‍👧‍👦' },
    { key: 'industry',  label: '产业',  icon: '🏭' },
    { key: 'activity',  label: '活动',  icon: '🎋' },
    { key: 'genealogy', label: '族谱',  icon: '📜' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#7B4E2A" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#7B4E2A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#e0c9a6', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#d4a76a', fontSize: 10, letterSpacing: 2 }}>私人生活</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>🏯 家族</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: clanLabel.color === '#888' ? '#d4a76a' : clanLabel.color, fontSize: 12, fontWeight: '700' }}>{clanLabel.label}</Text>
          <Text style={{ color: '#d4a76a', fontSize: 10, marginTop: 1 }}>声望 {prestige}</Text>
        </View>
      </View>

      {/* 反馈条 */}
      {!!feedback && (
        <View style={{ backgroundColor: feedbackOk ? '#fdf6e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#d4a76a' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#7B4E2A' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      )}

      {/* Tab导航 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0D0BC' }}>
        {TABS.map(t => (
          <Pressable key={t.key} onPress={() => setTab(t.key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#7B4E2A' : 'transparent' }}>
            <Text style={{ fontSize: 14 }}>{t.icon}</Text>
            <Text style={{ fontSize: 9, color: tab === t.key ? '#7B4E2A' : '#999', fontWeight: tab === t.key ? '700' : '400', marginTop: 1 }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* ═══════════ 总览 Tab ═══════════ */}
        {tab === 'overview' && (
          <>
            {/* 家族核心数据 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>🏯 家族核心数据</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { label: '家族声望', value: prestige, max: 500, color: '#7B4E2A', icon: '⭐' },
                  { label: '族老满意', value: elderFavor, max: 100, color: '#2a7a3b', icon: '🧓' },
                  { label: '家族传承', value: heritage, max: 500, color: '#1D3B5E', icon: '📜' },
                ].map(item => (
                  <View key={item.label} style={{ flex: 1, backgroundColor: '#FDF6E9', borderWidth: 1, borderColor: '#E0D0BC', padding: 10, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: item.color }}>{item.value}</Text>
                    <Text style={{ fontSize: 9, color: '#888' }}>{item.label}</Text>
                    <View style={{ width: '100%', height: 3, backgroundColor: '#E0D0BC' }}>
                      <View style={{ height: 3, width: `${Math.min(100, (item.value / item.max) * 100)}%`, backgroundColor: item.color }} />
                    </View>
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1, backgroundColor: '#FDF6E9', borderWidth: 1, borderColor: '#E0D0BC', padding: 10, alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 16 }}>💰</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#2a7a3b' }}>{clanFund} 万</Text>
                  <Text style={{ fontSize: 9, color: '#888' }}>家族基金</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FDF6E9', borderWidth: 1, borderColor: '#E0D0BC', padding: 10, alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 16 }}>👥</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D3B5E' }}>{save.clanMemberCount ?? 1} 人</Text>
                  <Text style={{ fontSize: 9, color: '#888' }}>族人数量</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#FDF6E9', borderWidth: 1, borderColor: '#E0D0BC', padding: 10, alignItems: 'center', gap: 2 }}>
                  <Text style={{ fontSize: 16 }}>{industryCfg?.icon ?? '🏗️'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#7B4E2A' }}>{clanLevel > 0 ? levelLabels[clanLevel] : '尚未建立'}</Text>
                  <Text style={{ fontSize: 9, color: '#888' }}>{industryType || '家族产业'}</Text>
                </View>
              </View>
            </View>

            {/* 家族月度效益 */}
            {clanLevel > 0 && (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>📈 家族月度效益</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#555' }}>{industryCfg?.icon} {industryType}产业（{levelLabels[clanLevel]}）月收益</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#2a7a3b' }}>+{monthlyIndustryIncome} 万/月</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#aaa' }}>※ 月度结算时自动划入家族基金</Text>
              </View>
            )}

            {/* 捐资家族基金 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 8 }}>
              <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>💰 家族基金管理</Text>
              <Text style={{ fontSize: 12, color: '#666' }}>家族基金用于活动开支、产业投入和扶持族人，是家族运转的基石。</Text>
              <Pressable onPress={() => void handleDonateToFund()} style={{ backgroundColor: '#7B4E2A', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>💰 捐资入基金（消耗20政绩 +50万）</Text>
              </Pressable>
            </View>
          </>
        )}

        {/* ═══════════ 婚育 Tab ═══════════ */}
        {tab === 'marriage' && (
          <>
            {/* 婚姻 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>👑 婚姻</Text>
                <Text style={{ fontSize: 11, color: '#888' }}>家庭幸福度 {save.familyHappiness}</Text>
              </View>
              {isMarried && spouse ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 48, height: 48, backgroundColor: '#FDF6E9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0D0BC' }}>
                      <Text style={{ fontSize: 26 }}>{spouse.gender === '女' ? '👩' : '👨'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>{spouse.name}</Text>
                      <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{spouse.gender} · {spouse.job}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#555' }}>配偶关系值</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: relationColor }}>{relationValue}</Text>
                  </View>
                  <View style={{ height: 5, backgroundColor: '#E8E6E2' }}>
                    <View style={{ height: 5, width: `${relationValue}%`, backgroundColor: relationColor }} />
                  </View>
                  <Pressable onPress={() => void handleDate()} style={{ backgroundColor: '#C82829', paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>💑 安排约会（消耗10政绩 · 关系+15）</Text>
                  </Pressable>
                </>
              ) : showMarryForm ? (
                <View style={{ gap: 10 }}>
                  <TextInput value={spouseName} onChangeText={setSpouseName} placeholder="输入配偶姓名" style={{ borderWidth: 1, borderColor: '#D1D1D1', padding: 10, fontSize: 14 }} placeholderTextColor="#aaa" />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['女', '男'] as const).map(g => (
                      <Pressable key={g} onPress={() => setSpouseGender(g)} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: spouseGender === g ? '#7B4E2A' : '#D1D1D1', backgroundColor: spouseGender === g ? '#7B4E2A' : '#fff' }}>
                        <Text style={{ color: spouseGender === g ? '#fff' : '#555', fontWeight: '600' }}>{g}方</Text>
                      </Pressable>
                    ))}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => void handleMarry()} style={{ flex: 1, backgroundColor: '#7B4E2A', paddingVertical: 11, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700' }}>确认成婚</Text>
                    </Pressable>
                    <Pressable onPress={() => setShowMarryForm(false)} style={{ flex: 1, borderWidth: 1, borderColor: '#D1D1D1', paddingVertical: 11, alignItems: 'center' }}>
                      <Text style={{ color: '#666' }}>取消</Text>
                    </Pressable>
                  </View>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 13, color: '#888' }}>您目前尚未婚配，成婚可壮大家族门楣。</Text>
                  <Pressable onPress={() => setShowMarryForm(true)} style={{ backgroundColor: '#7B4E2A', paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>💍 登记结婚</Text>
                  </Pressable>
                  {(save.blindDateNpcs?.length ?? 0) > 0 && (
                    <View style={{ gap: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#7B5E2A' }}>💌 本月相亲对象</Text>
                      {save.blindDateNpcs.map(npc => {
                        const isSelected = selectedNpc?.id === npc.id;
                        const favorColor = npc.favor >= 80 ? '#2a7a3b' : npc.favor >= 60 ? '#e67e22' : '#888';
                        return (
                          <View key={npc.id}>
                            <Pressable onPress={() => setSelectedNpc(isSelected ? null : npc)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: isSelected ? '#FFF8F0' : '#F7F7F5', borderWidth: 1, borderColor: isSelected ? '#e67e22' : '#E0D0BC' }}>
                              <Text style={{ fontSize: 22 }}>{npc.gender === '女' ? '👩' : '👨'}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700' }}>{npc.name}</Text>
                                <Text style={{ fontSize: 10, color: '#888' }}>{npc.gender} · {npc.age}岁 · {npc.job}</Text>
                              </View>
                              <View style={{ backgroundColor: favorColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>好感 {npc.favor}</Text>
                              </View>
                            </Pressable>
                            {isSelected && (
                              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#e67e22', borderTopWidth: 0, padding: 10, gap: 8 }}>
                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                  <Pressable onPress={() => void handleBoostNpcFavor(npc)} style={{ flex: 1, backgroundColor: '#F0F4F8', paddingVertical: 9, alignItems: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                                    <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '600' }}>💬 主动联系（-5政绩 +5好感）</Text>
                                  </Pressable>
                                  {npc.favor >= 60 && (
                                    <Pressable onPress={() => void handleProposeNpc(npc)} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 9, alignItems: 'center' }}>
                                      <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>💍 求婚</Text>
                                    </Pressable>
                                  )}
                                </View>
                              </View>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* 子女 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>👶 子女</Text>
                {isMarried && children.length < 3 && (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable onPress={() => void handleHaveChild('男')} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#1D3B5E' }}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>生男孩</Text>
                    </Pressable>
                    <Pressable onPress={() => void handleHaveChild('女')} style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#C82829' }}>
                      <Text style={{ color: '#fff', fontSize: 11 }}>生女孩</Text>
                    </Pressable>
                  </View>
                )}
              </View>
              {children.length === 0 ? (
                <Text style={{ fontSize: 13, color: '#888' }}>{isMarried ? '尚无子女，可选择生育。' : '成婚后可养育子女。'}</Text>
              ) : (
                children.map(child => {
                  const age = calcChildAge(child.birthDay, save.gameDays);
                  const isExpanded = expandedChild === child.id;
                  const milestone = getChildMilestone(child);
                  const stage = getGrowthStage(age, child);
                  const stageColor = STAGE_COLOR[stage];
                  return (
                    <Pressable key={child.id} onPress={() => setExpandedChild(isExpanded ? null : child.id)} style={{ borderWidth: 1, borderColor: isExpanded ? '#7B4E2A' : '#E0D0BC', padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 44, height: 44, backgroundColor: '#FDF6E9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0D0BC' }}>
                          <Text style={{ fontSize: 24 }}>{child.gender === '女' ? '👧' : '👦'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{child.name}</Text>
                            {milestone && <View style={{ backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{milestone}</Text></View>}
                            <View style={{ backgroundColor: stageColor, paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{stage}</Text></View>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{child.gender} · {age}岁 · {child.isAdult ? child.job : '学生'}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <ScoreMini label="学业" value={child.studyScore} color="#1D3B5E" />
                          <ScoreMini label="品德" value={child.moralScore} color="#2a7a3b" />
                        </View>
                      </View>
                      {isExpanded && (
                        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, gap: 8 }}>
                          {stage === '婴幼儿' && <Text style={{ fontSize: 12, color: '#888', fontStyle: 'italic' }}>宝宝还小，用心陪伴是最好的礼物。</Text>}
                          {(stage === '小学' || stage === '中学') && (
                            <>
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1 }}>📚 日常培养</Text>
                              {CHILD_INVEST_OPTIONS.map(opt => (
                                <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0D0BC', padding: 10 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700' }}>{opt.label}</Text>
                                    <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                  </View>
                                  <Pressable onPress={() => void handleInvest(child, opt)} style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 5 }}>
                                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>投入</Text>
                                  </Pressable>
                                </View>
                              ))}
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1, marginTop: 4 }}>🏫 选择学校</Text>
                              {SCHOOL_OPTIONS.map(opt => (
                                <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0D0BC', padding: 10 }}>
                                  <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700' }}>{opt.label} <Text style={{ fontSize: 9, color: '#7B4E2A' }}>{opt.tag}</Text></Text>
                                    <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                  </View>
                                  <Pressable onPress={() => void handleChooseSchool(child, opt)} style={{ backgroundColor: '#7B4E2A', paddingHorizontal: 10, paddingVertical: 5 }}>
                                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>择校</Text>
                                  </Pressable>
                                </View>
                              ))}
                            </>
                          )}
                          {stage === '工作' && (
                            <>
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1 }}>💼 职业方向</Text>
                              {child.isAdult && child.job ? (
                                <View style={{ backgroundColor: '#FDF6E9', padding: 10, borderWidth: 1, borderColor: '#E0D0BC' }}>
                                  <Text style={{ fontSize: 12, color: '#7B4E2A', fontWeight: '600' }}>{child.name} 现从事：{child.job}</Text>
                                  {child.job === '考公务员' && (
                                    <View style={{ marginTop: 8, gap: 6 }}>
                                      <Text style={{ fontSize: 11, color: '#555' }}>当前职级：{CHILD_RANKS[getChildOfficialRank(child) - 1]?.label ?? '办事员'}</Text>
                                      <Text style={{ fontSize: 11, color: '#555' }}>所在单位：{getChildOfficialDept(child)}</Text>
                                      <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Pressable onPress={() => void handleChildPromote(child)} style={{ flex: 1, backgroundColor: '#1D3B5E', paddingVertical: 9, alignItems: 'center' }}>
                                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>⬆️ 晋升</Text>
                                        </Pressable>
                                        {CHILD_TRANSFER_DEPTS.filter(d => d.minPlayerRank <= (save.rankLevel ?? 0)).slice(0, 1).map(d => (
                                          <Pressable key={d.dept} onPress={() => void handleChildTransfer(child, d)} style={{ flex: 2, backgroundColor: '#7B4E2A', paddingVertical: 9, alignItems: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>调任 {d.dept}</Text>
                                          </Pressable>
                                        ))}
                                      </View>
                                    </View>
                                  )}
                                </View>
                              ) : (
                                CAREER_OPTIONS.map(opt => (
                                  <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0D0BC', padding: 10 }}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '700' }}>{opt.label} <Text style={{ fontSize: 9, color: '#C82829' }}>{opt.tag}</Text></Text>
                                      <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                    </View>
                                    <Pressable onPress={() => void handleChooseCareer(child, opt)} style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 5 }}>
                                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>选择</Text>
                                    </Pressable>
                                  </View>
                                ))
                              )}
                            </>
                          )}
                          {stage === '成家' && (
                            <>
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1 }}>💑 婚配状态</Text>
                              {child.adultPath?.includes('已婚') ? (
                                <View style={{ backgroundColor: '#F0FBF3', borderWidth: 1, borderColor: '#B2DFDB', padding: 10, marginBottom: 4 }}>
                                  <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '700' }}>✅ {child.name} 已完成婚配</Text>
                                  {child.adultPath?.match(/已婚:([^|]+)/)?.[1] && (
                                    <Text style={{ fontSize: 11, color: '#555', marginTop: 3 }}>对象：{child.adultPath.match(/已婚:([^|]+)/)?.[1]}</Text>
                                  )}
                                </View>
                              ) : (
                                MARRIAGE_OPTIONS.map(opt => (
                                  <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0D0BC', padding: 10 }}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '700' }}>{opt.label} <Text style={{ fontSize: 9, color: '#7B4E2A' }}>{opt.tag}</Text></Text>
                                      <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                    </View>
                                    <Pressable onPress={() => void handleArrangeMarriage(child, opt)} style={{ backgroundColor: '#7B4E2A', paddingHorizontal: 10, paddingVertical: 5 }}>
                                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>安排</Text>
                                    </Pressable>
                                  </View>
                                ))
                              )}
                              {/* 婚后仍可操作职业发展 */}
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', letterSpacing: 1, marginTop: 6 }}>💼 职业发展</Text>
                              {child.isAdult && child.job ? (
                                <View style={{ backgroundColor: '#FDF6E9', padding: 10, borderWidth: 1, borderColor: '#E0D0BC' }}>
                                  <Text style={{ fontSize: 12, color: '#7B4E2A', fontWeight: '600' }}>{child.name} 现从事：{child.job}</Text>
                                  {child.job === '考公务员' && (
                                    <View style={{ marginTop: 8, gap: 6 }}>
                                      <Text style={{ fontSize: 11, color: '#555' }}>当前职级：{CHILD_RANKS[getChildOfficialRank(child) - 1]?.label ?? '办事员'}</Text>
                                      <Text style={{ fontSize: 11, color: '#555' }}>所在单位：{getChildOfficialDept(child)}</Text>
                                      <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <Pressable onPress={() => void handleChildPromote(child)} style={{ flex: 1, backgroundColor: '#1D3B5E', paddingVertical: 9, alignItems: 'center' }}>
                                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>⬆️ 晋升</Text>
                                        </Pressable>
                                        {CHILD_TRANSFER_DEPTS.filter(d => d.minPlayerRank <= (save.rankLevel ?? 0)).slice(0, 1).map(d => (
                                          <Pressable key={d.dept} onPress={() => void handleChildTransfer(child, d)} style={{ flex: 2, backgroundColor: '#7B4E2A', paddingVertical: 9, alignItems: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>调任 {d.dept}</Text>
                                          </Pressable>
                                        ))}
                                      </View>
                                    </View>
                                  )}
                                </View>
                              ) : (
                                CAREER_OPTIONS.map(opt => (
                                  <View key={opt.label} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: '#E0D0BC', padding: 10 }}>
                                    <View style={{ flex: 1 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '700' }}>{opt.label} <Text style={{ fontSize: 9, color: '#C82829' }}>{opt.tag}</Text></Text>
                                      <Text style={{ fontSize: 10, color: '#888' }}>{opt.desc}</Text>
                                    </View>
                                    <Pressable onPress={() => void handleChooseCareer(child, opt)} style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 5 }}>
                                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>选择</Text>
                                    </Pressable>
                                  </View>
                                ))
                              )}
                            </>
                          )}
                        </View>
                      )}
                    </Pressable>
                  );
                })
              )}
            </View>
          </>
        )}

        {/* ═══════════ 产业 Tab ═══════════ */}
        {tab === 'industry' && (
          <>
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>🏭 家族产业</Text>
              {clanLevel > 0 ? (
                <>
                  <View style={{ backgroundColor: '#FDF6E9', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 32 }}>{industryCfg?.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#7B4E2A' }}>{industryType}产业</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{industryCfg?.desc}</Text>
                      </View>
                      <View style={{ backgroundColor: '#7B4E2A', paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{levelLabels[clanLevel]}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#888' }}>月度收益</Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#2a7a3b' }}>+{monthlyIndustryIncome}万</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 10, alignItems: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#888' }}>当前等级</Text>
                        <Text style={{ fontSize: 14, fontWeight: '700', color: '#7B4E2A' }}>Lv.{clanLevel} / 3</Text>
                      </View>
                    </View>
                    {clanLevel < 3 && (
                      <Pressable onPress={() => void handleUpgradeIndustry()} style={{ backgroundColor: '#1D3B5E', paddingVertical: 11, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                          ⬆️ 升级至{levelLabels[clanLevel + 1]}（消耗{getIndustryCfg(industryType).upgradeCostMerit[clanLevel + 1]}政绩）
                        </Text>
                      </Pressable>
                    )}
                    {clanLevel >= 3 && (
                      <View style={{ backgroundColor: '#e8f5e9', padding: 10, borderWidth: 1, borderColor: '#c8e6c9', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13, color: '#2a7a3b', fontWeight: '700' }}>🏆 已达最高等级——集团级产业</Text>
                      </View>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: '#666' }}>家族尚无产业基础。选择一个产业类型，开始家族的商业版图。</Text>
                  <View style={{ gap: 8 }}>
                    {CLAN_INDUSTRY_TYPES.map(ind => (
                      <Pressable key={ind.type} onPress={() => setSelectedIndustry(selectedIndustry === ind.type ? '' : ind.type)} style={{ borderWidth: 1, borderColor: selectedIndustry === ind.type ? '#7B4E2A' : '#E0D0BC', padding: 12, backgroundColor: selectedIndustry === ind.type ? '#FDF6E9' : '#fff', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <Text style={{ fontSize: 28 }}>{ind.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{ind.type}产业</Text>
                          <Text style={{ fontSize: 10, color: '#888' }}>{ind.desc}</Text>
                          <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>Lv1月收益 {ind.monthlyIncome[1]}万 → Lv3 {ind.monthlyIncome[3]}万</Text>
                        </View>
                        {selectedIndustry === ind.type && (
                          <View style={{ backgroundColor: '#7B4E2A', paddingHorizontal: 6, paddingVertical: 3 }}>
                            <Text style={{ color: '#fff', fontSize: 10 }}>已选</Text>
                          </View>
                        )}
                      </Pressable>
                    ))}
                  </View>
                  {!!selectedIndustry && (
                    <Pressable onPress={() => void handleChooseIndustry(selectedIndustry)} style={{ backgroundColor: '#7B4E2A', paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>🏗️ 创立「{selectedIndustry}」家族产业</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          </>
        )}

        {/* ═══════════ 活动 Tab ═══════════ */}
        {tab === 'activity' && (
          <>
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 6 }}>
              <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>🎋 家族活动</Text>
              {CLAN_ACTIVITIES.map(act => {
                const lastDay = act.lastDayField ? (save[act.lastDayField] ?? 0) : 0;
                const inCooldown = !!(act.lastDayField && save.gameDays - lastDay < act.cooldownDays);
                const cdLeft = inCooldown ? act.cooldownDays - (save.gameDays - lastDay) : 0;
                const cantAfford = (act.meritCost > 0 && save.meritPoints < act.meritCost) || (act.clanFundCost > 0 && clanFund < act.clanFundCost);
                const disabled = inCooldown || cantAfford;
                return (
                  <View key={act.key} style={{ borderWidth: 1, borderColor: '#E0D0BC', padding: 12, gap: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 24 }}>{act.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{act.label}</Text>
                        <Text style={{ fontSize: 10, color: '#888' }}>{act.desc}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                      {act.meritCost > 0 && <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#1D3B5E' }}>政绩 -{act.meritCost}</Text></View>}
                      {act.clanFundCost > 0 && <View style={{ backgroundColor: '#FDF6E9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#7B4E2A' }}>基金 -{act.clanFundCost}万</Text></View>}
                      {act.effects.prestigeDelta ? <View style={{ backgroundColor: '#FDF6E9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#7B4E2A' }}>声望 +{act.effects.prestigeDelta}</Text></View> : null}
                      {act.effects.moralDelta ? <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#2a7a3b' }}>道德 +{act.effects.moralDelta}</Text></View> : null}
                      {act.effects.heritageDelta ? <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#1D3B5E' }}>传承 +{act.effects.heritageDelta}</Text></View> : null}
                    </View>
                    <Pressable onPress={() => !disabled && void handleClanActivity(act)} style={{ backgroundColor: disabled ? '#E5E7EB' : '#7B4E2A', paddingVertical: 9, alignItems: 'center' }}>
                      <Text style={{ color: disabled ? '#999' : '#fff', fontWeight: '700', fontSize: 12 }}>
                        {inCooldown ? `⏳ 冷却中（还需 ${cdLeft} 天）` : cantAfford ? '资源不足' : '执行活动'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ═══════════ 族谱 Tab ═══════════ */}
        {tab === 'genealogy' && (
          <>
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>📜 家族谱系</Text>
              {/* 玩家自身 */}
              <View style={{ backgroundColor: '#FDF6E9', borderWidth: 1, borderColor: '#E0D0BC', padding: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                  <View>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#7B4E2A' }}>{save.playerName} <Text style={{ fontSize: 10, color: '#888' }}>（您）</Text></Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>{save.rankName} · {save.cityName} · {save.playerGender}</Text>
                  </View>
                  <View style={{ marginLeft: 'auto', backgroundColor: '#7B4E2A', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>族长</Text>
                  </View>
                </View>
              </View>
              {/* 配偶 */}
              {isMarried && spouse && (
                <View style={{ borderWidth: 1, borderColor: '#E0D0BC', padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{spouse.gender === '女' ? '👩' : '👨'}</Text>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: '700' }}>{spouse.name}</Text>
                      <Text style={{ fontSize: 10, color: '#888' }}>配偶 · {spouse.gender} · {spouse.job}</Text>
                    </View>
                  </View>
                </View>
              )}
              {/* 子女列表 */}
              {children.map(child => {
                const age = calcChildAge(child.birthDay, save.gameDays);
                return (
                  <View key={child.id} style={{ borderWidth: 1, borderColor: '#E0D0BC', padding: 12, marginLeft: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 20 }}>{child.gender === '女' ? '👧' : '👦'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700' }}>{child.name}</Text>
                        <Text style={{ fontSize: 10, color: '#888' }}>{child.gender} · {age}岁 · {child.isAdult ? child.job : '学生'}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                          <Text style={{ fontSize: 9, color: '#1D3B5E' }}>学业 {child.studyScore}</Text>
                          <Text style={{ fontSize: 9, color: '#2a7a3b' }}>品德 {child.moralScore}</Text>
                          <Text style={{ fontSize: 9, color: '#C82829' }}>健康 {child.healthScore}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
              {children.length === 0 && !isMarried && (
                <Text style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>尚无配偶和子女记录。</Text>
              )}
            </View>

            {/* 家族事件日志 */}
            {(save.clanEventsLog ?? []).length > 0 && (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0D0BC', padding: 14, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#7B4E2A', fontWeight: '700', letterSpacing: 2 }}>📋 家族事件记录</Text>
                {[...(save.clanEventsLog ?? [])].reverse().slice(0, 10).map((entry, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4, borderBottomWidth: i < 9 ? 1 : 0, borderBottomColor: '#F0EAE0' }}>
                    <Text style={{ fontSize: 9, color: '#aaa', marginTop: 2 }}>{i + 1}</Text>
                    <Text style={{ fontSize: 12, color: '#555', flex: 1 }}>{entry}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
