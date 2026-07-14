// 组织部页面 - 招募新干部 / 年度编制分配 / 申请调任历史下属 / 年度晋升提报
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import {
  getOrCreateQuarterCandidates,
  getCurrentRecruitKey,
  getRecruitRoundLabel,
  getRecruitOrg,
  triggerAutoRecruit,
  getTransferredSubordinates,
  recallSubordinate,
  getSubordinatesByRank,
  getSubordinates,
} from '@/db/gameApi';
import type { RecruitCandidate, Subordinate } from '@/types/game';
import { getSubAvatarEmoji, getAvatarBgColor, DEPT_CONFIG, FACTION_LABEL, FACTION_COLOR, SUB_LEVEL_NAMES } from '@/types/game';
import { StatBar } from '@/components/StatBar';

type Tab = 'recruit' | 'orgdept' | 'staff' | 'recall' | 'nominate';

// ── 年度编制分配：按职级确定性计算各部门编制配额（不随机，保证重载稳定）──
function getDeptQuotaFixed(rankLevel: number): { deptKey: string; deptName: string; quota: number }[] {
  const base = rankLevel <= 3 ? 2 : rankLevel <= 6 ? 3 : rankLevel <= 8 ? 5 : rankLevel <= 10 ? 8 : rankLevel <= 12 ? 12 : 15;
  return Object.entries(DEPT_CONFIG).map(([key, cfg]) => ({
    deptKey: key,
    deptName: cfg.name,
    quota: base,
  }));
}

// 年度编制申请选项
const STAFF_REQUEST_TYPES = [
  { label: '增加行政人员编制', desc: '向组织部申请增加1名行政岗人员', meritCost: 10, result: '核准增编1名', minRank: 1 },
  { label: '申请技术专家岗',   desc: '引进高水平专业技术人才',         meritCost: 20, result: '专家入编，能力+15', minRank: 4 },
  { label: '申请领导岗扩编',   desc: '增加副职领导岗位名额（市级组织部审批）', meritCost: 30, result: '副职名额+1', minRank: 7 },
  { label: '申请应急编制',     desc: '特殊事项临时增设岗位',           meritCost: 15, result: '临时编制2名', minRank: 1 },
];

// ── 现实化招募背景信息 ─────────────────────────────────────────────
const RECRUIT_BG: { rankRange: [number, number]; title: string; org: string; desc: string; examName: string }[] = [
  {
    rankRange: [1, 3],
    title: '基层公务员招录',
    org: '县委组织部 · 人力资源和社会保障局',
    desc: '通过国家/省级公务员考试招录基层科员，经笔试、面试、政治审查后录用，由县委组织部审批备案，统一分配到乡镇各职能部门。',
    examName: '国考（11月）& 省考（3-4月）',
  },
  {
    rankRange: [4, 6],
    title: '县级机关公务员补充',
    org: '市委组织部 · 县委人力资源和社会保障局',
    desc: '县级机关干部主要通过省考招录，补充科员至副科级职位。录用人员经组织部政治考察后，按能力专长分配至各职能局，严禁超编招录。',
    examName: '省级公务员考试（每年2批次）',
  },
  {
    rankRange: [7, 9],
    title: '市级机关干部统筹',
    org: '省执政委组织部 · 市委人力资源和社会保障局',
    desc: '市级以上机关干部由省执政委组织部统一调配，以调任、遴选为主，公开考试为辅。重要岗位须经市委常委会研究通过。',
    examName: '遴选考试 & 组织调配',
  },
  {
    rankRange: [10, 15],
    title: '党政人事院统筹分配',
    org: '党政人事院',
    desc: '省部级及以上干部由党政人事院统一管理，通过考察、推荐、联邦政务常委会审议等程序产生，不通过公开考试招录。',
    examName: '中央统一调配',
  },
];

function getRecruitBg(rankLevel: number) {
  return RECRUIT_BG.find(b => rankLevel >= b.rankRange[0] && rankLevel <= b.rankRange[1]) ?? RECRUIT_BG[0];
}

/**
 * 现实层级对照：召回/展示的"主要人员"范围
 *   乡镇(rank1-3)    → 无下属可召回（不参与管干部）
 *   县级(rank4-6)    → 正科(3)、副科(2)  [乡镇主要领导]
 *   市级(rank7-9)    → 正处(5)、副处(4)  [县级主要领导]
 *   省级(rank10-11)  → 正厅(7)、副厅(6)  [市级主要领导]
 *   国家级(rank12+)  → 正部(9)、副部(8)  [省级主要领导]
 */
function getMainSubLevelRange(rankLevel: number): { min: number; max: number } {
  if (rankLevel <= 3)   return { min: 1, max: 1 };  // 乡镇仅科员
  if (rankLevel <= 6)   return { min: 2, max: 3 };  // 县级 → 副科/正科
  if (rankLevel <= 9)   return { min: 4, max: 5 };  // 市级 → 副处/正处
  if (rankLevel <= 11)  return { min: 6, max: 7 };  // 省级 → 副厅/正厅
  return { min: 8, max: 9 };                        // 国家级 → 副部/正部
}

function getRecallLevelDesc(rankLevel: number): string {
  if (rankLevel <= 3)  return '科员级';
  if (rankLevel <= 6)  return '副科至正科级（乡镇主要领导）';
  if (rankLevel <= 9)  return '副处至正处级（县区主要领导）';
  if (rankLevel <= 11) return '副厅至正厅级（地市主要领导）';
  return '副部至正部级（省级主要领导）';
}

export default function RecruitScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [tab, setTab] = useState<Tab>(() => (save && save.rankLevel >= 7) ? 'orgdept' : 'recruit');

  // ── Tab1: 招募（自动模式）──
  const [recruitedList, setRecruitedList] = useState<RecruitCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [recruiting, setRecruiting] = useState(false); // 自动招募进行中
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [assignmentLog, setAssignmentLog] = useState<{ name: string; dept: string; position: string }[]>([]);
  const [recruitType, setRecruitType] = useState<'national' | 'provincial'>('national');

  // ── Tab2: 编制分配 ──
  const currentYear = save ? Math.floor(save.gameDays / 365) : 0;
  // 从 save 持久化字段读取：若年份不匹配说明新年度已自动重置
  const staffYear = currentYear;
  const isNewYearReset = save ? (save.lastStaffQuotaYear < currentYear) : false;
  // 已申请标志位（新年度 GameContext 年底已重置为0）
  const staffApplyBits = (save && save.lastStaffQuotaYear >= currentYear) ? (save.staffApplyBits ?? 0) : 0;
  // 编制配额（确定性，按职级）
  const deptQuotaFixed = save ? getDeptQuotaFixed(save.rankLevel) : [];
  // 真实在编人数（useFocusEffect 加载）
  const [deptCurrentMap, setDeptCurrentMap] = useState<Record<string, number>>({});

  // ── Tab3: 调任历史下属 ──
  const [transferred, setTransferred] = useState<Subordinate[]>([]);
  const [recallLoading, setRecallLoading] = useState(false);
  const [recalledIds, setRecalledIds] = useState<Set<string>>(new Set());

  // ── Tab4: 年度晋升提报（市委以上 rankLevel >= 7）──
  const [nominateSubs, setNominateSubs] = useState<Subordinate[]>([]);
  const [nominateLoading, setNominateLoading] = useState(false);
  const [nominatedIds, setNominatedIds] = useState<Set<string>>(new Set());
  const [nominateSubmitted, setNominateSubmitted] = useState(false);
  const alreadyNominated = save ? (save.lastAnnualPromoteYear ?? -1) >= currentYear && currentYear > 0 : false;

  // ── 年度招募批次（每年2次，春0/秋1）──
  const currentRecruitKey = save ? getCurrentRecruitKey(save.gameDays) : 0;
  const alreadyRecruited = save ? (save.lastRecruitQuarter ?? 0) >= currentRecruitKey && currentRecruitKey > 0 : false;
  const recruitBg = save ? getRecruitBg(save.rankLevel) : RECRUIT_BG[0];
  // 当前批次类型：春季=国考，秋季=省考
  const isNationalExam = currentRecruitKey % 10 === 0;
  // 是否有新批次待处理（用于徽标提醒）
  const hasRecruitAlert = save ? save.rankLevel < 7 && !alreadyRecruited : false;

  const showMsg = (msg: string, ok = true) => {
    setFeedback(msg); setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  useFocusEffect(useCallback(() => {
    if (!save) return;
    setLoading(true);
    Promise.all([
      getOrCreateQuarterCandidates(save.id, save.userId, currentRecruitKey, save.rankLevel),
      getTransferredSubordinates(save.id),
      getSubordinates(save.id),
    ]).then(([cands, trans, subs]) => {
      // 已经被选中（自动录用）的候选人作为本批次录用名单
      setRecruitedList(cands.filter(c => c.status === 'selected').sort((a, b) => (a.rankOrder ?? 99) - (b.rankOrder ?? 99)));
      setTransferred(trans);
      // 统计各部门真实在编人数
      const map: Record<string, number> = {};
      for (const s of subs) {
        if (s.isAppointed && s.appointedDept) {
          map[s.appointedDept] = (map[s.appointedDept] ?? 0) + 1;
        }
      }
      setDeptCurrentMap(map);
      setLoading(false);
    });
    // 加载提报候选人（市委以上 rankLevel >= 7）
    if (save.rankLevel >= 7) {
      setNominateLoading(true);
      getSubordinatesByRank(save.id, save.rankLevel).then(subs => {
        const eligible = subs.filter(s => !s.transferredCity && s.subLevel >= 1 && s.subLevel <= Math.max(1, save.rankLevel - 2));
        setNominateSubs(eligible);
        setNominateLoading(false);
      });
    }
  }, [save, currentRecruitKey]));

  if (!save) return null;

  // ─── 自动招募操作（一键触发系统自动录用）───
  const handleAutoRecruit = async () => {
    if (!save || recruiting) return;
    setRecruiting(true);
    const result = await triggerAutoRecruit(save.id, save.userId, currentRecruitKey, save.rankLevel);
    await refreshSave();
    setRecruitedList(result.recruited);
    setAssignmentLog(result.assignments);
    setRecruitType(result.recruitType);
    const typeLabel = result.recruitType === 'national' ? '国考' : '省考';
    { const _rc1=`✅ 系统已完成${typeLabel}本批次录用，共录用${result.count}名干部并分配部门`; void saveResult('recruit_batch_'+(result.recruitType??'exam'), {ok:true,desc:_rc1,day:save.gameDays??0}); showMsg(_rc1); }
    setRecruiting(false);
  };

  // ─── 编制申请操作 ───
  const handleStaffRequest = async (idx: number) => {
    if (!save) return;
    const bit = 1 << idx;
    // 用持久化位标志判断是否已申请
    if ((staffApplyBits & bit) !== 0) return;
    const req = STAFF_REQUEST_TYPES[idx];
    if (save.meritPoints < req.meritCost) {
      showMsg(`政绩不足，需 ${req.meritCost} 点`, false); return;
    }
    // 同步写入 save：扣政绩 + 设置申请标志位
    const newBits = staffApplyBits | bit;
    await updateGameSave({
      meritPoints: save.meritPoints - req.meritCost,
      lastStaffQuotaYear: currentYear,
      staffApplyBits: newBits,
    });
    { const _rc2=`✅ 「${req.label}」申请成功：${req.result}`; void saveResult('recruit_req_'+req.label.slice(0,15), {ok:true,desc:_rc2,day:save.gameDays??0}); showMsg(_rc2); }
  };

  // ─── 召回历史下属 ───
  const handleRecall = async (sub: Subordinate) => {
    if (!save || recalledIds.has(sub.id)) return;
    setRecallLoading(true);
    const ok = await recallSubordinate(sub.id);
    if (ok) {
      setRecalledIds(prev => new Set([...prev, sub.id]));
      setTransferred(prev => prev.filter(s => s.id !== sub.id));
      { const _rc3=`✅ ${sub.name} 已从${sub.transferredCity}调回，重新加入您的下属队伍`; void saveResult('recruit_recall_'+sub.id, {ok:true,desc:_rc3,day:save.gameDays??0}); showMsg(_rc3); }
    } else {
      showMsg('召回失败，请稍后重试', false);
    }
    setRecallLoading(false);
  };

  // ─── 年度晋升提报 ───
  const handleToggleNominate = (sub: Subordinate) => {
    setNominatedIds(prev => {
      const next = new Set(prev);
      if (next.has(sub.id)) next.delete(sub.id);
      else next.add(sub.id);
      return next;
    });
  };

  const handleSubmitNominate = async () => {
    if (!save || nominatedIds.size === 0) return;
    // 记录本年度已提报，奖励政绩
    const meritBonus = nominatedIds.size * 15;
    await updateGameSave({
      meritPoints: save.meritPoints + meritBonus,
      lastAnnualPromoteYear: currentYear,
    });
    setNominateSubmitted(true);
    { const _rc4=`✅ 已向上级组织部提报 ${nominatedIds.size} 名干部，政绩+${meritBonus}`; void saveResult('recruit_nominate', {ok:true,desc:_rc4,day:save.gameDays??0}); showMsg(_rc4); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 4 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>人事管理</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>组织部</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 1 }}>{save.rankName} · {save.cityName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 3 }}>
            <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>第{staffYear + 1}年</Text>
            {hasRecruitAlert ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#C82829', paddingHorizontal: 7, paddingVertical: 3 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFD700' }} />
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                  {isNationalExam ? '国考招募开放' : '省考招募开放'}
                </Text>
              </View>
            ) : (
              <Text style={{ color: '#a0b4cc', fontSize: 9 }}>历史下属 {transferred.length} 人可召回</Text>
            )}
          </View>
        </View>
        {/* Tab 切换 */}
        <View style={{ flexDirection: 'row', gap: 0, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          {([
            // rank7以下才显示手动招募
            ...(save.rankLevel < 7 ? [{ key: 'recruit', label: '招募干部', badge: hasRecruitAlert }] : []),
            ...(save.rankLevel >= 7 ? [{ key: 'orgdept', label: '组织部分配', badge: false }] : []),
            { key: 'staff',    label: '编制分配', badge: false },
            { key: 'recall',   label: `召回下属${transferred.length > 0 ? `(${transferred.length})` : ''}`, badge: false },
            ...(save.rankLevel >= 7 ? [{ key: 'nominate', label: '年度提报', badge: false }] : []),
          ] as { key: Tab; label: string; badge: boolean }[]).map(t => (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key as Tab)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: tab === t.key ? '#C82829' : 'transparent' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
                {t.badge && (
                  <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#FFD700', marginTop: -4 }} />
                )}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C82829" />
        </View>
      ) : (
        <>
          {/* ══════ 组织部自动分配（rank7+）══════ */}
          {tab === 'orgdept' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic">
              <View style={{ padding: 14, gap: 12 }}>
                {/* 说明横幅 */}
                <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
                  <Text style={{ color: 'rgba(180,210,255,0.6)', fontSize: 9, letterSpacing: 2 }}>中央组织部 · 干部统一分配</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🏛️ 市级以上干部由组织部统筹</Text>
                  <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                    根据全国干部库统筹调配，每季度自动完成选拔与分配。综合考核分值≥85者纳入中央选调生，优先赴各地市重要岗位任职。
                  </Text>
                </View>

                {/* 本年度分配状态 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2 }}>本年度招募动态</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '当前年度', val: `第${currentYear + 1}年`, color: '#2B4B6F' },
                      { label: '已录用', val: `${Math.min(12, (currentYear % 5) + 3)}名`, color: '#2a7a3b' },
                      { label: '选调生数', val: `${(currentYear % 3) + 1}名`, color: '#C82829' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F5F4F1', padding: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: s.color }}>{s.val}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 选调生名单 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#C82829', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>⭐ 中央选调生名单（综合≥85分）</Text>
                  </View>
                  {[
                    { name: '王思远', univ: '清华大学', score: 92, dest: '粤海省珠澳市' },
                    { name: '陈晓雨', univ: '北京大学', score: 89, dest: '瓯越省钱塘市' },
                    { name: '刘嘉诚', univ: '复旦大学', score: 87, dest: '汉东省京岳市' },
                    { name: '张婷婷', univ: '中国人民大学', score: 86, dest: '蜀州省锦城市' },
                  ].map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#F0F0F0', gap: 10 }}>
                      <View style={{ width: 28, height: 28, backgroundColor: '#C82829', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{s.name}</Text>
                          <View style={{ backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#C82829', paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#C82829', fontWeight: '700' }}>选调生</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{s.univ} · 综合{s.score}分 → {s.dest}任职</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 普通干部分配 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#2B4B6F', padding: 10 }}>
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>📋 组织部统筹分配干部</Text>
                  </View>
                  {[
                    { name: '李明辉', score: 78, dept: '经济发展部门', level: '副处级', city: '本辖区' },
                    { name: '孙晓莉', score: 74, dept: '农业农村部门', level: '科级',   city: '本辖区' },
                    { name: '赵建国', score: 71, dept: '城市管理部门', level: '副科级', city: '本辖区' },
                    { name: '吴雅琴', score: 68, dept: '社会事务部门', level: '科级',   city: '本辖区' },
                  ].map((s, i) => (
                    <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 11, borderBottomWidth: i < 3 ? 1 : 0, borderBottomColor: '#F0F0F0', gap: 8 }}>
                      <View style={{ width: 28, height: 28, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>{i + 1}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{s.name}</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{s.dept} · {s.level} · 综合{s.score}分</Text>
                      </View>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>分配至{s.city}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* 说明 */}
                <View style={{ backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: '#2B4B6F' }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    市级以上干部选拔由中央组织部统一管理，每季度自动完成。综合考核满分100分，85分及以上进入中央选调生通道，优先赴重点城市关键岗位任职。
                  </Text>
                </View>
              </View>
            </ScrollView>
          )}

          {/* ══════ Tab1：招募干部 ══════ */}
          {tab === 'recruit' && (
            alreadyRecruited || recruitedList.length > 0 ? (
              /* ── 已完成：展示本批次录用公示 ── */
              <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
                {/* 完成横幅 */}
                <View style={{ backgroundColor: '#2B4B6F', padding: 16, alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 28 }}>{recruitType === 'national' ? '🏆' : '📋'}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', marginTop: 4 }}>
                    {recruitType === 'national' ? '国考录用公示' : '省考录用公示'}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#a0b4cc', textAlign: 'center', lineHeight: 17 }}>
                    {getRecruitRoundLabel(currentRecruitKey)}
                  </Text>
                  <View style={{ backgroundColor: recruitType === 'national' ? '#C82829' : '#2a7a3b', paddingHorizontal: 10, paddingVertical: 4, marginTop: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>
                      {recruitType === 'national'
                        ? `名额精少·含选调生通道 · ${recruitBg.org}`
                        : `按编制空缺补充 · ${recruitBg.org}`}
                    </Text>
                  </View>
                </View>

                  {recruitedList.length > 0 ? (
                  <View style={{ gap: 10 }}>
                    <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1 }}>
                      📄 录用人员档案（共{recruitedList.length}人 · {recruitType === 'national' ? '国考批次' : '省考批次'}）
                    </Text>
                    {recruitedList.map((c, idx) => {
                      const avatar = getSubAvatarEmoji(c.avatarId, c.gender);
                      const entryYear = c.birthYear ? (Math.floor(currentRecruitKey / 10) + 2000) : null;
                      const age = c.birthYear ? ((Math.floor(currentRecruitKey / 10) + 2000) - c.birthYear) : null;
                      // 国考第1名且高分 = 选调生
                      const isZhuandiaosheng = recruitType === 'national' && idx === 0 && (c.score ?? 0) >= 80;
                      return (
                        <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: isZhuandiaosheng ? 2 : 1, borderColor: isZhuandiaosheng ? '#C82829' : '#D1D1D1', overflow: 'hidden' }}>
                          {/* 档案头部 */}
                          <View style={{ backgroundColor: isZhuandiaosheng ? '#C82829' : '#F0F4F8', flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: isZhuandiaosheng ? 'rgba(255,255,255,0.3)' : '#E0E0E0' }}>
                            <View style={{ width: 48, height: 48, backgroundColor: isZhuandiaosheng ? 'rgba(255,255,255,0.2)' : '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 24 }}>{avatar}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: isZhuandiaosheng ? '#fff' : '#222' }}>{c.name}</Text>
                                <Text style={{ fontSize: 11, color: isZhuandiaosheng ? 'rgba(255,255,255,0.8)' : '#888' }}>{c.gender}</Text>
                                {age && <Text style={{ fontSize: 11, color: isZhuandiaosheng ? 'rgba(255,255,255,0.8)' : '#888' }}>{age}岁</Text>}
                              </View>
                              <View style={{ flexDirection: 'row', gap: 4, marginTop: 3 }}>
                                {isZhuandiaosheng ? (
                                  <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 6, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#7B4A00', fontWeight: '700' }}>⭐ 选调生 · 副科级起步</Text>
                                  </View>
                                ) : (
                                  <View style={{ backgroundColor: recruitType === 'national' ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 6, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 9, color: '#fff', fontWeight: '600' }}>
                                      {recruitType === 'national' ? `国考录用第${idx + 1}名` : `省考录用第${idx + 1}名`}
                                    </Text>
                                  </View>
                                )}
                                <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#DDD' }}>
                                  <Text style={{ fontSize: 9, color: '#555' }}>{c.trait}</Text>
                                </View>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Text style={{ fontSize: 20, fontWeight: '700', color: isZhuandiaosheng ? '#FFD700' : '#C82829' }}>{c.score}</Text>
                              <Text style={{ fontSize: 9, color: isZhuandiaosheng ? 'rgba(255,255,255,0.7)' : '#888', marginTop: 1 }}>综合评分</Text>
                            </View>
                          </View>
                          {/* 档案详情 */}
                          <View style={{ padding: 10, gap: 6 }}>
                            {/* 基本信息行 */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              {[
                                { label: '出生年份', val: c.birthYear ? `${c.birthYear}年` : '--' },
                                { label: '入职年份', val: entryYear ? `${entryYear}年` : '--' },
                                { label: '籍贯', val: c.hometown ?? '--' },
                              ].map(f => (
                                <View key={f.label} style={{ flex: 1, backgroundColor: '#F9F9F9', padding: 6, borderWidth: 1, borderColor: '#EEE', alignItems: 'center' }}>
                                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#333' }}>{f.val}</Text>
                                  <Text style={{ fontSize: 9, color: '#999', marginTop: 1 }}>{f.label}</Text>
                                </View>
                              ))}
                            </View>
                            {/* 教育背景 */}
                            <View style={{ backgroundColor: '#F0F4F8', padding: 8, gap: 3, borderLeftWidth: 3, borderLeftColor: isZhuandiaosheng ? '#C82829' : '#2B4B6F' }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>🎓 毕业院校</Text>
                                <Text style={{ fontSize: 11, color: '#222', fontWeight: '700' }}>{c.university ?? '--'}</Text>
                              </View>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>📚 所学专业</Text>
                                <Text style={{ fontSize: 11, color: '#2B4B6F' }}>{c.major ?? '--'}</Text>
                              </View>
                            </View>
                            {/* 能力指标 */}
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <View style={{ flex: 1 }}>
                                <StatBar label="能力" value={c.ability} />
                                <StatBar label="忠诚" value={c.loyalty} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <StatBar label="廉洁" value={c.integrity} />
                                <StatBar label="经验" value={c.experience} />
                              </View>
                            </View>
                            {/* 分配结果 */}
                            {assignmentLog.find(a => a.name === c.name) && (() => {
                              const a = assignmentLog.find(a2 => a2.name === c.name)!;
                              return (
                                <View style={{ backgroundColor: isZhuandiaosheng ? '#FFF5CC' : '#E8F5E9', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 11, color: isZhuandiaosheng ? '#7B4A00' : '#2a7a3b' }}>
                                    {isZhuandiaosheng ? '⭐ 选调生分配至：' : '🏢 分配至：'}
                                  </Text>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: isZhuandiaosheng ? '#7B4A00' : '#2a7a3b', flex: 1 }}>{a.dept} · {a.position}</Text>
                                </View>
                              );
                            })()}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#F5F4F1', padding: 14, alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 14, color: '#888' }}>📭 本批次暂无录用公示数据</Text>
                    <Text style={{ fontSize: 11, color: '#aaa' }}>本批次可能尚未开放，或录用结果还未生成</Text>
                  </View>
                )}

                {/* 下次招募提示 */}
                <View style={{ backgroundColor: '#FFF8E7', borderWidth: 1, borderColor: '#F0C040', padding: 12, gap: 4 }}>
                  <Text style={{ fontSize: 11, color: '#7a5c00', fontWeight: '700' }}>📅 下次招募时间</Text>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    {currentRecruitKey % 10 === 0
                      ? '秋季省考批次将于本年后半期开放（约第183天起）—— 人数多，按编制空缺补充'
                      : '明年春季国考批次将于次年前半期开放（约次年第1天起）—— 名额精少，含选调生通道'}
                  </Text>
                  <Text style={{ fontSize: 10, color: '#888' }}>主管机构：{recruitBg.org}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setTab('recall')} style={{ flex: 1, backgroundColor: '#2B4B6F', paddingVertical: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>查看可召回历史下属</Text>
                  </Pressable>
                  <Pressable onPress={() => router.back()} style={{ flex: 1, paddingVertical: 12, borderWidth: 1, borderColor: '#DDD', alignItems: 'center' }}>
                    <Text style={{ color: '#666', fontSize: 13 }}>返回</Text>
                  </Pressable>
                </View>
              </ScrollView>
            ) : (
              /* ── 未招募：显示考试信息 + 一键触发按钮 ── */
              <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }}>
                {/* 招募机构背景 */}
                <View style={{ backgroundColor: isNationalExam ? '#1A2B4A' : '#1A3A2A', padding: 16, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: isNationalExam ? '#C82829' : '#2a7a3b', paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>
                        {isNationalExam ? '🏛️ 国家公务员考试' : '📋 省级公务员考试'}
                      </Text>
                    </View>
                    <Text style={{ color: '#FFD700', fontSize: 10 }}>
                      {isNationalExam ? '春季批次' : '秋季批次'}
                    </Text>
                  </View>
                  <Text style={{ color: 'rgba(160,180,210,0.8)', fontSize: 9, letterSpacing: 2 }}>{recruitBg.org}</Text>
                  <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{recruitBg.title}</Text>
                  <Text style={{ color: 'rgba(160,180,210,0.9)', fontSize: 11, lineHeight: 17 }}>{recruitBg.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 6, flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '700', marginBottom: 2 }}>考试批次</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{recruitBg.examName}</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 6, flex: 1 }}>
                      <Text style={{ color: '#FFD700', fontSize: 9, fontWeight: '700', marginBottom: 2 }}>当前批次</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{isNationalExam ? '春季（国考）批次' : '秋季（省考）批次'}</Text>
                    </View>
                  </View>
                </View>

                {/* 国考/省考对比说明 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, gap: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#2B4B6F', letterSpacing: 1, marginBottom: 4 }}>
                    {isNationalExam ? '🏆 国考特点（精英通道）' : '📊 省考特点（编制补充）'}
                  </Text>
                  {isNationalExam ? [
                    '候选人共12名，竞争激烈，整体素质高',
                    `录取名额：${save.rankLevel <= 3 ? '1名' : '2名'}（严格按综合评分择优）`,
                    '⭐ 综合评分≥80分者认定为选调生，直接定副科级',
                    '选调生优先分配至发改委、财政局等重要岗位',
                    '985/211院校候选人占比高，博士/硕士比例更多',
                    '录用后系统自动分配，无法人工干预录取名单',
                  ].map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700', marginTop: 1 }}>·</Text>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, flex: 1 }}>{rule}</Text>
                    </View>
                  )) : [
                    '候选人共8名，难度相对较低，注重实际工作能力',
                    '录取名额：依据编制空缺自动计算（2~6名）',
                    '省考无选调生通道，录取者均为普通公务员',
                    '按编制最空缺的部门顺序依次补充，填满空缺',
                    '录用后统一定科员级，分配至缺编最多的部门',
                    '院校层次分布更广，本科/大专均有机会录取',
                  ].map((rule, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 8 }}>
                      <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '700', marginTop: 1 }}>·</Text>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, flex: 1 }}>{rule}</Text>
                    </View>
                  ))}
                </View>

                {/* 本年度分配状态 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2 }}>本年度招募动态</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {[
                      { label: '当前年度', val: `第${currentYear + 1}年`, color: '#2B4B6F' },
                      { label: isNationalExam ? '国考名额' : '省考名额',
                        val: isNationalExam
                          ? (save.rankLevel <= 3 ? '1名' : '2名')
                          : '依编制定',
                        color: isNationalExam ? '#C82829' : '#2a7a3b' },
                      { label: isNationalExam ? '含选调生' : '补充空缺',
                        val: isNationalExam ? '可能1名' : '最多6名',
                        color: '#7B5E2A' },
                    ].map(s => (
                      <View key={s.label} style={{ flex: 1, alignItems: 'center', backgroundColor: '#F5F4F1', padding: 10 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: s.color }}>{s.val}</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{s.label}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* 触发自动招募按钮 */}
                <Pressable
                  onPress={() => void handleAutoRecruit()}
                  disabled={recruiting}
                  style={{ backgroundColor: recruiting ? '#888' : (isNationalExam ? '#C82829' : '#2a7a3b'), paddingVertical: 14, alignItems: 'center', gap: 4 }}
                >
                  {recruiting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>组织部正在审核评分中…</Text>
                    </View>
                  ) : (
                    <>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        {isNationalExam ? '📋 查看国考录用结果' : '📋 查看省考录用结果'}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>系统将自动按评分录用，无需人工干预</Text>
                    </>
                  )}
                </Pressable>

                <View style={{ backgroundColor: '#F0F4F8', padding: 12, borderLeftWidth: 3, borderLeftColor: isNationalExam ? '#C82829' : '#2a7a3b' }}>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17 }}>
                    {isNationalExam
                      ? '根据《公务员法》规定，国家公务员考试竞争激烈，录取率低，选调生为高层次人才选拔通道，直接进入重要岗位任职。录取结果由系统依法生成，不受干预。'
                      : '省级公务员考试主要补充基层部门编制空缺，录取相对宽松，录用后系统自动按最空缺部门分配，保证各部门人员充足。'}
                  </Text>
                </View>
              </ScrollView>
            )
          )}

          {/* ══════ Tab2：年度编制分配 ══════ */}
          {tab === 'staff' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} contentInsetAdjustmentBehavior="automatic">

              {/* 年度重置提示 */}
              {isNewYearReset && (
                <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14 }}>🔄</Text>
                  <Text style={{ fontSize: 11, color: '#2a7a3b', flex: 1, lineHeight: 17 }}>
                    新年度编制已自动重置！根据职级重新分配编制名额，本年度增编申请名额已刷新。
                  </Text>
                </View>
              )}

              {/* 今年编制概况 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>第{staffYear + 1}年度</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 8 }}>分管部门编制情况</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(() => {
                    const totalQuota = deptQuotaFixed.reduce((s, d) => s + d.quota, 0);
                    const totalUsed = deptQuotaFixed.reduce((s, d) => s + (deptCurrentMap[d.deptKey] ?? 0), 0);
                    return [
                      { label: '总编制', value: totalQuota, color: '#FFD700' },
                      { label: '在编',   value: totalUsed,  color: '#90CAF9' },
                      { label: '空缺',   value: totalQuota - totalUsed, color: '#A5D6A7' },
                    ].map(item => (
                      <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', padding: 8, alignItems: 'center' }}>
                        <Text style={{ color: item.color, fontSize: 18, fontWeight: '700' }}>{item.value}</Text>
                        <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{item.label}</Text>
                      </View>
                    ));
                  })()}
                </View>
              </View>

              {/* 各部门编制明细 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>各部门编制明细</Text>
                {deptQuotaFixed.map((dept) => {
                  const current = deptCurrentMap[dept.deptKey] ?? 0;
                  const pct = Math.min(100, Math.round((current / dept.quota) * 100));
                  const fill = pct >= 90 ? '#C82829' : pct >= 60 ? '#2a7a3b' : '#7B5E2A';
                  return (
                    <View key={dept.deptKey} style={{ gap: 4 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#222' }}>{dept.deptName}</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{current}/{dept.quota} 人</Text>
                      </View>
                      <View style={{ height: 6, backgroundColor: '#EEE' }}>
                        <View style={{ height: 6, width: `${pct}%`, backgroundColor: fill }} />
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* 编制申请 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, gap: 8 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>📋 申请增加编制</Text>
                <Text style={{ fontSize: 11, color: '#888', marginBottom: 6, lineHeight: 17 }}>
                  每年可向组织部提交编制申请，经审批后即时增加部门人力资源配额。
                  {save.rankLevel >= 7 ? '市级及以上可申请组织部扩编。' : ''}
                </Text>
                {STAFF_REQUEST_TYPES.map((req, idx) => {
                  const bit = 1 << idx;
                  const isDone = (staffApplyBits & bit) !== 0;
                  const canAfford = save.meritPoints >= req.meritCost;
                  const rankOk = save.rankLevel >= req.minRank;
                  return (
                    <View key={idx} style={{
                      flexDirection: 'row', alignItems: 'center',
                      borderWidth: 1, borderColor: isDone ? '#2a7a3b' : rankOk ? '#D1D1D1' : '#EEE',
                      padding: 10, gap: 8,
                      backgroundColor: isDone ? '#f0faf3' : !rankOk ? '#F9F9F9' : '#fff',
                      opacity: !rankOk ? 0.6 : 1,
                    }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: isDone ? '#2a7a3b' : '#222' }}>{req.label}</Text>
                          <View style={{ backgroundColor: isDone ? '#2a7a3b' : '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 9 }}>{isDone ? '✓已申请' : `${req.meritCost}政绩`}</Text>
                          </View>
                          {!rankOk && (
                            <View style={{ backgroundColor: '#888', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>需{req.minRank >= 7 ? '市级以上' : req.minRank >= 4 ? '县级以上' : '基层'}职级</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{req.desc}</Text>
                        {isDone && <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>✅ 已获批：{req.result}</Text>}
                      </View>
                      {!isDone && rankOk && (
                        <Pressable
                          onPress={() => void handleStaffRequest(idx)}
                          disabled={!canAfford}
                          style={{ backgroundColor: canAfford ? '#2B4B6F' : '#CCC', paddingHorizontal: 12, paddingVertical: 7 }}
                        >
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>申请</Text>
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>

              <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 10 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>编制规则说明</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 18 }}>
                  · 编制情况每年（365天）自动重置，根据职级重新分配{'\n'}
                  · 政绩充足时可申请增编，审批结果即时生效{'\n'}
                  · 每项申请在本年度内只能提交一次{'\n'}
                  · 申请记录持久保存，换届/晋升后新年度自动重置{'\n'}
                  · 「申请领导岗扩编」需市级（rankLevel≥7）以上职级
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ══════ Tab3：申请召回历史下属 ══════ */}
          {tab === 'recall' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: insets.bottom + 24 }}>
              <View style={{ backgroundColor: '#2B4B6F', padding: 12, marginBottom: 4 }}>
                <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700', marginBottom: 4 }}>召回历史下属</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11, lineHeight: 17 }}>
                  这里列出了您曾经共事、后调任他处的下属干部中的主要人员（
                  {save ? getRecallLevelDesc(save.rankLevel) : ''}
                  ）。您可申请将其召回，重新纳入当前职位的管辖队伍。
                </Text>
              </View>

              {recallLoading && <ActivityIndicator size="small" color="#C82829" />}

              {(() => {
                // 按玩家职级过滤"主要人员"（只展示直接下级层次）
                const recallFiltered = save
                  ? transferred.filter(s => {
                      const { min, max } = getMainSubLevelRange(save.rankLevel);
                      return s.subLevel >= min && s.subLevel <= max;
                    })
                  : transferred;
                if (recallFiltered.length === 0) {
                  return (
                    <View style={{ alignItems: 'center', padding: 40 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>📭</Text>
                      <Text style={{ fontSize: 14, color: '#888', fontWeight: '600', marginBottom: 6 }}>暂无可召回的主要人员</Text>
                      <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                        在下属管理中将{getRecallLevelDesc(save?.rankLevel ?? 3)}干部调任后，可在此召回。
                      </Text>
                    </View>
                  );
                }
                return recallFiltered.map(sub => {
                  const emoji = getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男');
                  const bg    = getAvatarBgColor(sub.avatarId ?? 0, sub.faction ?? 'neutral');
                  const factionLabel = FACTION_LABEL[sub.faction] ?? '无';
                  const factionColor = FACTION_COLOR[sub.faction] ?? '#888';
                  const levelName = SUB_LEVEL_NAMES[sub.subLevel] ?? '待定';
                  const recalled = recalledIds.has(sub.id);
                  return (
                    <View key={sub.id} style={{ backgroundColor: recalled ? '#f0faf3' : '#fff', borderWidth: 1, borderColor: recalled ? '#2a7a3b' : '#D1D1D1', padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 22 }}>{emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                            <View style={{ backgroundColor: factionColor + '22', borderWidth: 1, borderColor: factionColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: factionColor, fontSize: 9, fontWeight: '700' }}>{factionLabel}</Text>
                            </View>
                            <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{levelName}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>
                            {sub.position} · 现任职于 {sub.transferredCity}
                          </Text>
                        </View>
                        {recalled ? (
                          <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 6 }}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>已召回</Text>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => void handleRecall(sub)}
                            disabled={recallLoading}
                            style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 6 }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>申请召回</Text>
                          </Pressable>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <StatBar label="能力" value={sub.ability} />
                          <StatBar label="忠诚" value={sub.loyalty} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <StatBar label="廉洁" value={sub.integrity} />
                          <StatBar label="经验" value={sub.experience} />
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </ScrollView>
          )}

          {/* ══════ Tab4：年度晋升提报 ══════ */}
          {tab === 'nominate' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic">
              {/* 说明横幅 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 14, gap: 4 }}>
                <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, letterSpacing: 2 }}>组织部 · 年度干部考察提报</Text>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>📋 第 {currentYear + 1} 年度晋升提报</Text>
                <Text style={{ color: 'rgba(160,180,204,0.85)', fontSize: 11, lineHeight: 17, marginTop: 4 }}>
                  每年由组织部对市委以上干部进行考察提报，选拔优秀人才报上级党委审核晋升。
                  省级以下干部由省长/省委书记自行决定，无需通过此通道。每年度只能提报一次。
                </Text>
              </View>

              {/* 已完成提示 */}
              {(alreadyNominated || nominateSubmitted) ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 }}>
                  <Text style={{ fontSize: 40 }}>✅</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>本年度提报已完成</Text>
                  <Text style={{ fontSize: 12, color: '#888', textAlign: 'center' }}>
                    第 {currentYear + 1} 年度干部晋升提报已提交组织部，等待上级党委审批。
                    {'\n'}下一年度可重新提报。
                  </Text>
                </View>
              ) : (
                <View style={{ padding: 14, gap: 10 }}>
                  {nominateLoading ? (
                    <View style={{ alignItems: 'center', padding: 30 }}>
                      <ActivityIndicator color="#1D3B5E" />
                    </View>
                  ) : nominateSubs.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                      <Text style={{ color: '#888', fontSize: 14 }}>暂无符合条件的提报对象</Text>
                      <Text style={{ color: '#aaa', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
                        需下属在职且职级在市委级别以下
                      </Text>
                    </View>
                  ) : (
                    <>
                      <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#E8D080', padding: 10 }}>
                        <Text style={{ fontSize: 11, color: '#7B5E2A' }}>
                          📌 已选 {nominatedIds.size} 人提报 · 建议优先选取能力值≥70、廉洁值≥60的干部
                        </Text>
                      </View>

                      {nominateSubs.map(sub => {
                        const isSelected = nominatedIds.has(sub.id);
                        const avatarEmoji = getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男');
                        const avatarBg    = getAvatarBgColor(sub.avatarId ?? 0, sub.faction ?? 'neutral');
                        const factionLabel = FACTION_LABEL[sub.faction] ?? '无';
                        const factionColor = FACTION_COLOR[sub.faction] ?? '#888';
                        const levelName   = SUB_LEVEL_NAMES[sub.subLevel] ?? '待定';
                        // 综合评分：能力40+廉洁30+忠诚20+政绩10
                        const score = Math.round(sub.ability * 0.4 + sub.integrity * 0.3 + sub.loyalty * 0.2 + Math.min(100, sub.experience / 50) * 0.1);
                        const isHighScore = score >= 65;

                        return (
                          <Pressable
                            key={sub.id}
                            onPress={() => handleToggleNominate(sub)}
                            style={{
                              backgroundColor: isSelected ? '#EEF4FF' : '#fff',
                              borderWidth: 1.5,
                              borderColor: isSelected ? '#2B4B6F' : '#D0D0D0',
                              padding: 12,
                              flexDirection: 'row',
                              gap: 10,
                              alignItems: 'flex-start',
                            }}
                          >
                            {/* 头像 */}
                            <View style={{ width: 38, height: 38, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 18 }}>{avatarEmoji}</Text>
                            </View>

                            {/* 信息 */}
                            <View style={{ flex: 1, gap: 3 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                                {isHighScore && (
                                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                                    <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>优秀</Text>
                                  </View>
                                )}
                                <View style={{ backgroundColor: factionColor + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: factionColor }}>{factionLabel}</Text>
                                </View>
                              </View>
                              <Text style={{ fontSize: 10, color: '#888' }}>{levelName} · 综合评分 {score}</Text>
                              <View style={{ flexDirection: 'row', gap: 8, marginTop: 2 }}>
                                <Text style={{ fontSize: 9, color: '#555' }}>能力 {sub.ability}</Text>
                                <Text style={{ fontSize: 9, color: '#555' }}>廉洁 {sub.integrity}</Text>
                                <Text style={{ fontSize: 9, color: '#555' }}>忠诚 {sub.loyalty}</Text>
                              </View>
                            </View>

                            {/* 勾选状态 */}
                            <View style={{
                              width: 22, height: 22,
                              backgroundColor: isSelected ? '#2B4B6F' : '#fff',
                              borderWidth: 1.5, borderColor: isSelected ? '#2B4B6F' : '#CCC',
                              alignItems: 'center', justifyContent: 'center',
                            }}>
                              {isSelected && <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>✓</Text>}
                            </View>
                          </Pressable>
                        );
                      })}

                      {/* 提交按钮 */}
                      <Pressable
                        onPress={() => void handleSubmitNominate()}
                        disabled={nominatedIds.size === 0}
                        style={{
                          backgroundColor: nominatedIds.size > 0 ? '#2B4B6F' : '#CCC',
                          paddingVertical: 14,
                          alignItems: 'center',
                          marginTop: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                          {nominatedIds.size > 0
                            ? `📤 提报 ${nominatedIds.size} 名干部至上级组织部`
                            : '请先选择提报对象'}
                        </Text>
                      </Pressable>
                    </>
                  )}
                </View>
              )}
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}
