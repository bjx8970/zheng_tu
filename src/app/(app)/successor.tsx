// 接班人培养系统 — 扶植子女/同派系干部/同校干部，传承政治遗产
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getFamilyMembers } from '@/db/gameApi';
import type { FamilyMember } from '@/types/game';

// ── 接班人来源类型 ──────────────────────────────────────────────────
type SuccessorSource = 'child' | 'faction' | 'school';

interface SuccessorCandidate {
  id: string;
  name: string;
  source: SuccessorSource;
  sourceLabel: string;
  sourceColor: string;
  relation: string; // 关系描述
  ability: number;  // 初始能力值
  loyalty: number;  // 初始忠诚度
  tag: string;
  tagColor: string;
  desc: string;
}

// ── 培养行动定义 ──────────────────────────────────────────────────
interface TrainAction {
  key: string;
  label: string;
  icon: string;
  abilityDelta: number;
  loyaltyDelta: number;
  rankDelta: number;
  meritCost: number;
  cooldownDays: number;
  desc: string;
  tag: string;
  tagColor: string;
}

const TRAIN_ACTIONS: TrainAction[] = [
  {
    key: 'guide',
    label: '政治指导',
    icon: '📋',
    abilityDelta: 6,
    loyaltyDelta: 8,
    rankDelta: 0,
    meritCost: 20,
    cooldownDays: 30,
    desc: '亲自传授从政经验，分享政治智慧，增强接班人对您路线的认同',
    tag: '忠诚',
    tagColor: '#1D3B5E',
  },
  {
    key: 'training',
    label: '业务培训',
    icon: '🏫',
    abilityDelta: 12,
    loyaltyDelta: 3,
    rankDelta: 0,
    meritCost: 35,
    cooldownDays: 45,
    desc: '安排接班人参加高级干部培训班，提升专业治理能力',
    tag: '能力',
    tagColor: '#2a7a3b',
  },
  {
    key: 'resource',
    label: '资源扶持',
    icon: '💼',
    abilityDelta: 4,
    loyaltyDelta: 10,
    rankDelta: 0,
    meritCost: 50,
    cooldownDays: 60,
    desc: '动用人脉资源，为接班人争取重要项目与晋升机会',
    tag: '资源',
    tagColor: '#7B5E2A',
  },
  {
    key: 'network',
    label: '人脉引荐',
    icon: '🤝',
    abilityDelta: 3,
    loyaltyDelta: 5,
    rankDelta: 0,
    meritCost: 30,
    cooldownDays: 40,
    desc: '将接班人引荐给关键上级与盟友，拓展其政治关系网络',
    tag: '人脉',
    tagColor: '#4a2c8a',
  },
  {
    key: 'promote',
    label: '推荐晋升',
    icon: '🏅',
    abilityDelta: 0,
    loyaltyDelta: 15,
    rankDelta: 1,
    meritCost: 80,
    cooldownDays: 90,
    desc: '利用职权为接班人争取职级提升，直接推动仕途进阶',
    tag: '晋升',
    tagColor: '#C82829',
  },
];

// ── 接班人职级体系 ──────────────────────────────────────────────────
const SUCCESSOR_RANKS = ['科员', '副科', '正科', '副处', '正处', '副厅', '正厅', '副部', '正部'];

// ── 成就里程碑 ──────────────────────────────────────────────────────
interface Milestone {
  key: string;
  label: string;
  abilityReq: number;
  loyaltyReq: number;
  rankReq: number;
  desc: string;
  icon: string;
}

const MILESTONES: Milestone[] = [
  { key: 'm1', label: '初露锋芒', icon: '🌱', abilityReq: 20, loyaltyReq: 20, rankReq: 1, desc: '接班人已初具政治素养，开始独当一面' },
  { key: 'm2', label: '独当一面', icon: '⭐', abilityReq: 40, loyaltyReq: 40, rankReq: 3, desc: '能力与忠诚双达标，可主持重要工作' },
  { key: 'm3', label: '深受信任', icon: '🏆', abilityReq: 60, loyaltyReq: 60, rankReq: 5, desc: '在派系中建立威望，成为您路线的坚定捍卫者' },
  { key: 'm4', label: '政治接班', icon: '👑', abilityReq: 80, loyaltyReq: 80, rankReq: 7, desc: '完全具备接班条件，政治遗产得以传承' },
];

// ── 同派系候选人（基于玩家派系动态生成）──────────────────────────
const FACTION_CANDIDATES: Record<string, { name: string; desc: string }[]> = {
  reform:    [{ name: '沈昌平', desc: '改革派骨干，主张行政体制创新' }, { name: '陈若华', desc: '改革系青年才俊，善于突破体制障碍' }],
  pragmatic: [{ name: '吴建国', desc: '务实干将，注重经济数据与实效' }, { name: '林秀梅', desc: '务实派代表，长期扎根基层工作' }],
  cyl:       [{ name: '孔令辉', desc: '共青团系新锐，晋升路径清晰' }, { name: '赵文博', desc: '团系出身，善于青年群众工作' }],
  techno:    [{ name: '钱博远', desc: '技术官僚，精通数字经济与产业政策' }, { name: '江卓然', desc: '理工科背景，善于推动科技型政绩' }],
  local:     [{ name: '周大伟', desc: '地方派元老，深耕本地政治生态' }, { name: '许志远', desc: '土生土长，在地方根基深厚' }],
};

// ── 同校候选人（基于玩家大学） ──────────────────────────────────
function getSchoolCandidates(university: string): { name: string; desc: string }[] {
  if (university.includes('北京') || university.includes('清华') || university.includes('北大')) {
    return [{ name: '张浩宇', desc: '京校同学，人脉遍及央地两级机关' }, { name: '王思远', desc: '顶尖学府出身，理论功底扎实' }];
  }
  if (university.includes('复旦') || university.includes('交大') || university.includes('同济')) {
    return [{ name: '李晓东', desc: '沪校同学，视野开阔、思维活跃' }, { name: '刘芸汐', desc: '海派风格，兼具学术与实务经验' }];
  }
  return [{ name: '胡国峰', desc: '同校学弟，对您十分钦佩与认可' }, { name: '马晴雯', desc: '同届同学，曾共事多年颇为信任' }];
}

// ── 进度条组件 ──────────────────────────────────────────────────────
function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <View style={{ height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden', flex: 1 }}>
      <View style={{ height: 6, width: `${pct}%` as `${number}%`, backgroundColor: color, borderRadius: 3 }} />
    </View>
  );
}

// ── 主组件 ──────────────────────────────────────────────────────────
export default function SuccessorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, isLoading } = useGame();
  const { getResult, saveResult } = useActionResults();

  const [children, setChildren] = useState<FamilyMember[]>([]);
  const [activeTab, setActiveTab] = useState<SuccessorSource>('child');
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    setMsg(null);
    (async () => {
      const members = await getFamilyMembers(save.id);
      setChildren(members.filter(m => m.memberType === 'child' && m.isAdult));
    })();
  }, [save?.id]));

  if (isLoading || !save) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#1D3B5E" />
      </View>
    );
  }

  const playerFaction = save.primaryFaction ?? '';
  const playerUniversity = save.universityName ?? '';
  const successorName = save.successorName ?? '';
  const successorFaction = save.successorFaction ?? '';
  const successorSchool = save.successorSchool ?? '';
  const successorAbility = save.successorAbility ?? 0;
  const successorLoyalty = save.successorLoyalty ?? 0;
  const successorRankLevel = save.successorRankLevel ?? 0;
  const successorInvestDays = save.successorInvestDays ?? 0;
  const successorLastActDay = save.successorLastActDay ?? 0;
  const hasSuccessor = successorName !== '';

  // ── 生成候选人列表 ──────────────────────────────────────────────
  const childCandidates: SuccessorCandidate[] = children.map(c => ({
    id: c.id,
    name: c.name,
    source: 'child',
    sourceLabel: '子女',
    sourceColor: '#4a2c8a',
    relation: `您的${c.gender === '女' ? '女儿' : '儿子'}`,
    ability: Math.min(60, Math.round(c.studyScore * 0.5 + c.moralScore * 0.3)),
    loyalty: Math.min(90, 60 + Math.round(c.moralScore * 0.3)),
    tag: c.adultPath?.includes('从政') ? '从政' : c.job,
    tagColor: c.adultPath?.includes('从政') ? '#C82829' : '#888',
    desc: `学业${c.studyScore}·品德${c.moralScore}，与您血脉相连，天然高忠诚`,
  }));

  const factionRaw = FACTION_CANDIDATES[playerFaction] ?? FACTION_CANDIDATES.reform;
  const factionCandidates: SuccessorCandidate[] = factionRaw.map((f, i) => ({
    id: `faction_${i}`,
    name: f.name,
    source: 'faction',
    sourceLabel: '同派系',
    sourceColor: '#1D3B5E',
    relation: '派系同僚',
    ability: 45 + i * 8,
    loyalty: 55 + i * 5,
    tag: '同派',
    tagColor: '#1D3B5E',
    desc: f.desc,
  }));

  const schoolRaw = getSchoolCandidates(playerUniversity);
  const schoolCandidates: SuccessorCandidate[] = schoolRaw.map((s, i) => ({
    id: `school_${i}`,
    name: s.name,
    source: 'school',
    sourceLabel: '同学',
    sourceColor: '#2a7a3b',
    relation: `${playerUniversity || '大学'}同学`,
    ability: 40 + i * 10,
    loyalty: 50 + i * 8,
    tag: '同学',
    tagColor: '#2a7a3b',
    desc: s.desc,
  }));

  const candidateMap: Record<SuccessorSource, SuccessorCandidate[]> = {
    child: childCandidates,
    faction: factionCandidates,
    school: schoolCandidates,
  };
  const currentCandidates = candidateMap[activeTab];

  const handleSelect = async (c: SuccessorCandidate) => {
    if (hasSuccessor || acting) return;
    setActing(true);
    try {
      await updateGameSave({
        successorName: c.name,
        successorFaction: c.source === 'faction' ? playerFaction : '',
        successorSchool: c.source === 'school' ? playerUniversity : '',
        successorAbility: c.ability,
        successorLoyalty: c.loyalty,
        successorRankLevel: 1,
        successorInvestDays: 0,
        successorLastActDay: save.gameDays,
      });
      { const _su1=`✓ 已将 ${c.name} 确定为政治接班人，开始系统培养`; void saveResult('successor_appoint', {ok:true,desc:_su1,day:save.gameDays??0}); setMsg({ text: _su1, ok: true }); }
    } catch {
      setMsg({ text: '操作失败，请稍后重试', ok: false });
    } finally {
      setActing(false);
    }
  };

  const handleTrain = async (action: TrainAction) => {
    if (!hasSuccessor || acting) return;
    if (save.meritPoints < action.meritCost) {
      setMsg({ text: `政绩不足，${action.label}需要 ${action.meritCost} 政绩`, ok: false });
      return;
    }
    const lastDay = successorLastActDay;
    const elapsed = save.gameDays - lastDay;
    if (elapsed < action.cooldownDays && lastDay >= 0) {
      const remain = action.cooldownDays - elapsed;
      setMsg({ text: `${action.label}冷却中，还需 ${remain} 天`, ok: false });
      return;
    }
    setActing(true);
    const newAbility = Math.min(100, successorAbility + action.abilityDelta);
    const newLoyalty = Math.min(100, successorLoyalty + action.loyaltyDelta);
    const newRank = Math.min(SUCCESSOR_RANKS.length - 1, successorRankLevel + action.rankDelta);
    const newDays = successorInvestDays + action.cooldownDays;
    try {
      await updateGameSave({
        successorAbility: newAbility,
        successorLoyalty: newLoyalty,
        successorRankLevel: newRank,
        successorInvestDays: newDays,
        successorLastActDay: save.gameDays,
        meritPoints: Math.max(0, save.meritPoints - action.meritCost),
      });
      { const _su2=`✓ 【${action.label}】完成！能力+${action.abilityDelta} 忠诚+${action.loyaltyDelta}${action.rankDelta > 0 ? ` 职级提升至${SUCCESSOR_RANKS[newRank]}` : ''}`; void saveResult('successor_train_'+action.key, {ok:true,desc:_su2,day:save.gameDays??0}); setMsg({ text: _su2, ok: true }); }
    } catch {
      setMsg({ text: '操作失败，请稍后重试', ok: false });
    } finally {
      setActing(false);
    }
  };

  const handleAbandon = async () => {
    if (!hasSuccessor || acting) return;
    setActing(true);
    try {
      await updateGameSave({
        successorName: '',
        successorFaction: '',
        successorSchool: '',
        successorAbility: 0,
        successorLoyalty: 0,
        successorRankLevel: 0,
        successorInvestDays: 0,
        successorLastActDay: 0,
      });
      setMsg({ text: '已解除接班人关系', ok: false });
    } catch {
      setMsg({ text: '操作失败，请稍后重试', ok: false });
    } finally {
      setActing(false);
    }
  };

  // 当前成就里程碑
  const achievedMilestones = MILESTONES.filter(
    m => successorAbility >= m.abilityReq && successorLoyalty >= m.loyaltyReq && successorRankLevel >= m.rankReq
  );
  const latestMilestone = achievedMilestones[achievedMilestones.length - 1];
  const nextMilestone = MILESTONES.find(m => !achievedMilestones.includes(m));
  const rankLabel = SUCCESSOR_RANKS[successorRankLevel] ?? '科员';

  const TABS: { key: SuccessorSource; label: string; icon: string }[] = [
    { key: 'child', label: '子女', icon: '👨‍👩‍👧' },
    { key: 'faction', label: '同派系', icon: '⚖️' },
    { key: 'school', label: '同学', icon: '🎓' },
  ];

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 10, paddingBottom: 16, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 10 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: 'rgba(200,220,255,0.8)', fontSize: 10, letterSpacing: 4, marginBottom: 4 }}>政治遗产传承</Text>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 2 }}>接班人培养</Text>
          <Text style={{ color: 'rgba(200,220,255,0.6)', fontSize: 10, marginTop: 3 }}>
            扶植可信之人，延续您的从政路线
          </Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        <View style={{ padding: 14, gap: 14 }}>

          {/* 反馈消息 */}
          {msg && (
            <View style={{ backgroundColor: msg.ok ? '#F0FFF4' : '#FFF5F5', borderWidth: 1, borderColor: msg.ok ? '#2a7a3b' : '#C82829', padding: 10 }}>
              <Text style={{ color: msg.ok ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{msg.text}</Text>
            </View>
          )}

          {/* ── 已有接班人：详情卡 ── */}
          {hasSuccessor && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#1D3B5E', padding: 14, gap: 12 }}>
              {/* 头部 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 52, height: 52, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 26 }}>👤</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: '#1D3B5E' }}>{successorName}</Text>
                    {latestMilestone && (
                      <View style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{latestMilestone.icon}{latestMilestone.label}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                    职级：{rankLabel} · 累计培养 {successorInvestDays} 天
                    {successorFaction ? ` · 同派系` : successorSchool ? ` · 同学` : ' · 子女'}
                  </Text>
                </View>
              </View>

              {/* 能力/忠诚度进度条 */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 44, fontSize: 11, color: '#666' }}>能力值</Text>
                  <ProgressBar value={successorAbility} color="#1D3B5E" />
                  <Text style={{ width: 28, fontSize: 11, fontWeight: '700', color: '#1D3B5E', textAlign: 'right' }}>{successorAbility}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ width: 44, fontSize: 11, color: '#666' }}>忠诚度</Text>
                  <ProgressBar value={successorLoyalty} color="#4a2c8a" />
                  <Text style={{ width: 28, fontSize: 11, fontWeight: '700', color: '#4a2c8a', textAlign: 'right' }}>{successorLoyalty}</Text>
                </View>
              </View>

              {/* 职级进度 */}
              <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
                {SUCCESSOR_RANKS.map((r, i) => (
                  <View key={r} style={{ paddingHorizontal: 6, paddingVertical: 3, backgroundColor: i <= successorRankLevel ? '#1D3B5E' : '#F0F4F8', borderWidth: 1, borderColor: i === successorRankLevel ? '#C82829' : '#D1D1D1' }}>
                    <Text style={{ fontSize: 9, color: i <= successorRankLevel ? '#fff' : '#AAA', fontWeight: i === successorRankLevel ? '900' : '400' }}>{r}</Text>
                  </View>
                ))}
              </View>

              {/* 里程碑进度 */}
              {nextMilestone && (
                <View style={{ backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#D1D1D6', padding: 10 }}>
                  <Text style={{ fontSize: 10, color: '#888', fontWeight: '700', marginBottom: 4 }}>📍 下一里程碑：{nextMilestone.icon} {nextMilestone.label}</Text>
                  <Text style={{ fontSize: 10, color: '#666' }}>需要：能力{nextMilestone.abilityReq}（当前{successorAbility}）· 忠诚{nextMilestone.loyaltyReq}（当前{successorLoyalty}）· 职级{SUCCESSOR_RANKS[nextMilestone.rankReq - 1]}</Text>
                </View>
              )}
              {achievedMilestones.length === MILESTONES.length && (
                <View style={{ backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#2a7a3b', padding: 10 }}>
                  <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '700' }}>👑 政治接班完成！{successorName}已完全具备接班条件，您的政治遗产将得以传承。</Text>
                </View>
              )}

              {/* 培养行动 */}
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '900', letterSpacing: 1 }}>🎯 培养行动</Text>
              <View style={{ gap: 8 }}>
                {TRAIN_ACTIONS.map(action => {
                  const elapsed = save.gameDays - (successorLastActDay > 0 ? successorLastActDay : 0);
                  const onCD = elapsed < action.cooldownDays && successorLastActDay > 0;
                  const remain = onCD ? action.cooldownDays - elapsed : 0;
                  const canAfford = save.meritPoints >= action.meritCost;
                  return (
                    <Pressable key={action.key} onPress={() => void handleTrain(action)}
                      disabled={acting || onCD || !canAfford}
                      style={{ borderWidth: 1, borderColor: onCD ? '#D1D1D1' : canAfford ? '#1D3B5E' : '#EEE', backgroundColor: onCD || !canAfford ? '#F9F9F9' : '#fff', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: onCD || !canAfford ? 0.6 : 1 }}>
                      <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{action.label}</Text>
                          <View style={{ backgroundColor: action.tagColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 8 }}>{action.tag}</Text>
                          </View>
                          {onCD && (
                            <Text style={{ fontSize: 10, color: '#C82829' }}>冷却 {remain}天</Text>
                          )}
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{action.desc}</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                          {action.abilityDelta > 0 && <Text style={{ fontSize: 10, color: '#1D3B5E' }}>能力+{action.abilityDelta}</Text>}
                          {action.loyaltyDelta > 0 && <Text style={{ fontSize: 10, color: '#4a2c8a' }}>忠诚+{action.loyaltyDelta}</Text>}
                          {action.rankDelta > 0 && <Text style={{ fontSize: 10, color: '#C82829' }}>职级+1</Text>}
                          <Text style={{ fontSize: 10, color: '#D4A012' }}>消耗{action.meritCost}政绩</Text>
                        </View>
                      </View>
                      {!onCD && canAfford && <Text style={{ color: '#1D3B5E', fontSize: 14 }}>›</Text>}
                    </Pressable>
                  );
                })}
              </View>

              {/* 放弃按钮 */}
              <Pressable onPress={() => void handleAbandon()} disabled={acting}
                style={{ borderWidth: 1, borderColor: '#EEE', paddingVertical: 10, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#AAA', fontSize: 11 }}>解除接班人关系</Text>
              </Pressable>
            </View>
          )}

          {/* ── 未有接班人：候选人选择 ── */}
          {!hasSuccessor && (
            <>
              {/* 说明卡 */}
              <View style={{ backgroundColor: '#F8F9FF', borderWidth: 1, borderColor: '#C5D1E8', padding: 12, gap: 4 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D3B5E' }}>🎓 培养您的政治接班人</Text>
                <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>
                  从子女、同派系干部或同学中选定一位接班人，通过政治指导、业务培训等系统培养，将您的从政路线与政治资源传承下去。接班人成长越强，您的政治遗产越稳固。
                </Text>
              </View>

              {/* 来源选择Tabs */}
              <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F8', borderRadius: 4, padding: 3, gap: 2 }}>
                {TABS.map(tab => (
                  <Pressable key={tab.key} onPress={() => setActiveTab(tab.key)}
                    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: activeTab === tab.key ? '#1D3B5E' : 'transparent', borderRadius: 3 }}>
                    <Text style={{ fontSize: 12, fontWeight: activeTab === tab.key ? '700' : '400', color: activeTab === tab.key ? '#fff' : '#888' }}>
                      {tab.icon} {tab.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* 候选人列表 */}
              {currentCandidates.length === 0 ? (
                <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#EEE', padding: 20, alignItems: 'center' }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>👶</Text>
                  <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>
                    {activeTab === 'child' ? '暂无已成年子女，在家庭页面培育子女后方可在此选定' : '暂无合适候选人'}
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  {currentCandidates.map(c => (
                    <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ width: 44, height: 44, backgroundColor: c.sourceColor, alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 22 }}>{c.source === 'child' ? '👦' : c.source === 'faction' ? '⚖️' : '🎓'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{c.name}</Text>
                            <View style={{ backgroundColor: c.sourceColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>{c.sourceLabel}</Text>
                            </View>
                            <View style={{ backgroundColor: c.tagColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>{c.tag}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{c.relation}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#555', lineHeight: 16 }}>{c.desc}</Text>
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ width: 44, fontSize: 10, color: '#888' }}>初始能力</Text>
                          <ProgressBar value={c.ability} color="#1D3B5E" />
                          <Text style={{ width: 24, fontSize: 10, color: '#1D3B5E', fontWeight: '700', textAlign: 'right' }}>{c.ability}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ width: 44, fontSize: 10, color: '#888' }}>初始忠诚</Text>
                          <ProgressBar value={c.loyalty} color="#4a2c8a" />
                          <Text style={{ width: 24, fontSize: 10, color: '#4a2c8a', fontWeight: '700', textAlign: 'right' }}>{c.loyalty}</Text>
                        </View>
                      </View>
                      <Pressable onPress={() => void handleSelect(c)} disabled={acting}
                        style={{ backgroundColor: '#1D3B5E', paddingVertical: 12, alignItems: 'center', opacity: acting ? 0.6 : 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>确定培养 {c.name} 为接班人</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>
    </View>
  );
}
