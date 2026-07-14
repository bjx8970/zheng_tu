// 部门子页面 - 通用模板，支持十四大部门（含信访办+组织部）
import { useState, useCallback } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, getEnterprises, getPersonnelCandidates, promoteSubordinate, getPetitionEvents, processPetitionEvent, inspectEnterprise, regulateEnterprise, optimizeBusinessService, generateImmediateEnterprises, fillDeptStaff, batchAssessSubordinates, getSubResumes } from '@/db/gameApi';
import { DEPT_CONFIG, SUB_LEVEL_NAMES, getDeptNameByRank, getDeptStaffQuota, gameDaysToDate } from '@/types/game';
import type { DeptKey, Subordinate, Enterprise, PetitionEvent, SubResume } from '@/types/game';
import { getSubAvatarEmoji } from '@/types/game';
import { StatBar } from '@/components/StatBar';

// 每个部门可执行的施政行动
import type { PolicyActionConfig } from '@/config/dept-policies.types';
import _deptPoliciesJson from '@/config/dept-policies.json';

/**
 * 运行时使用的 PolicyAction：在 PolicyActionConfig 基础上，
 * 将 JSON 中的 checkField/checkExpr 还原为可执行的 check 函数。
 * 修改行动数值只需编辑 src/config/dept-policies.json，无需改此处逻辑。
 */
type PolicyAction = Omit<PolicyActionConfig, 'enhanceCondition'> & {
  enhanceCondition?: {
    label: string;
    check: (s: import('@/types/game').PlayerSave) => boolean;
    multiplier?: number;
  };
};

/** 将 JSON 配置还原为带 check 函数的运行时对象 */
function hydrateAction(cfg: PolicyActionConfig): PolicyAction {
  if (!cfg.enhanceCondition) return cfg as PolicyAction;
  const ec = cfg.enhanceCondition;
  let check: (s: import('@/types/game').PlayerSave) => boolean;
  if (ec.checkExpr) {
    // 多字段加法，如 "cityGdp+cityBusiness"
    const fields = ec.checkExpr.split('+') as (keyof import('@/types/game').PlayerSave)[];
    check = (s) => fields.reduce((sum, f) => sum + ((s[f] as number) ?? 0), 0) >= ec.checkValue;
  } else {
    const field = ec.checkField as keyof import('@/types/game').PlayerSave;
    check = (s) => ((s[field] as number) ?? 0) >= ec.checkValue;
  }
  return { ...cfg, enhanceCondition: { label: ec.label, check, multiplier: ec.multiplier } };
}

const _rawPolicies = (_deptPoliciesJson as { DEPT_POLICIES: Record<string, PolicyActionConfig[]> }).DEPT_POLICIES;

// 从 JSON 配置加载并还原 check 函数，修改数值只需编辑 src/config/dept-policies.json
const DEPT_POLICIES: Record<DeptKey, PolicyAction[]> = Object.fromEntries(
  Object.entries(_rawPolicies).map(([key, actions]) => [
    key as DeptKey,
    (actions as PolicyActionConfig[]).map(hydrateAction),
  ])
) as Record<DeptKey, PolicyAction[]>;


function EffectTag({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? '#2a7a3b' : '#C82829';
  const prefix = value > 0 ? '+' : '';
  return (
    <View style={{ backgroundColor: value > 0 ? '#e8f5e9' : '#ffebee', paddingHorizontal: 8, paddingVertical: 3, marginRight: 5, marginBottom: 4 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '600' }}>{label}{prefix}{value}</Text>
    </View>
  );
}

export default function DepartmentScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [personnelCandidates, setPersonnelCandidates] = useState<Subordinate[]>([]);
  const [petitionEvents, setPetitionEvents] = useState<PetitionEvent[]>([]);
  const [feedback, setFeedback] = useState('');
  // 施政行动持久冷却：{ actionId: lastExecutedDay }，从 kpiRankingResult |DEPT_CD: 段读取
  const [policyCD, setPolicyCD] = useState<Record<string, number>>({});
  // 申请配合冷却追踪（最近一次配合的 gameDays）
  const [coopCooldownDay, setCoopCooldownDay] = useState(0);
  // KPI 结果弹窗
  const [kpiResult, setKpiResult] = useState<{
    title: string;
    lines: { label: string; value: number; color: string }[];
    fundMsg: string;
    ok: boolean;
  } | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [marketActionLoading, setMarketActionLoading] = useState<string | null>(null);
  const [onekeyLoading, setOnekeyLoading] = useState(false);
  // 个人档案弹窗
  const [profileSub, setProfileSub] = useState<Subordinate | null>(null);
  const [profileResumes, setProfileResumes] = useState<SubResume[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);
  const [staffCollapsed, setStaffCollapsed] = useState(true); // 科员列表默认折叠

  const deptKey = type as DeptKey;
  const cfg = DEPT_CONFIG[deptKey];
  const rankLevel = save?.rankLevel ?? 1;
  const deptDisplayName = getDeptNameByRank(deptKey, rankLevel);
  const staffQuota = getDeptStaffQuota(rankLevel);
  // 人事局额外追加人事考试/培训行动（已迁移到 personnel 部门）
  const policies = DEPT_POLICIES[deptKey] ?? [];

  // 县长（5级）以上可以任命，以下为申请配合模式
  const canAppoint = (save?.rankLevel ?? 0) >= 5;

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      // 解析持久冷却：从 kpiRankingResult |DEPT_CD: 段
      try {
        const raw = save.kpiRankingResult ?? '';
        const cdMarker = '|DEPT_CD:';
        const coopMarker = '|COOP_CD:';
        if (raw.includes(cdMarker)) {
          const cdStr = raw.slice(raw.indexOf(cdMarker) + cdMarker.length).split('|')[0];
          setPolicyCD(JSON.parse(cdStr) as Record<string, number>);
        }
        if (raw.includes(coopMarker)) {
          const coopStr = raw.slice(raw.indexOf(coopMarker) + coopMarker.length).split('|')[0];
          setCoopCooldownDay(Number(coopStr) || 0);
        }
      } catch { /* 解析失败忽略 */ }
      getSubordinates(save.id).then(allSubs => {
        const deptSubs = allSubs.filter(s => s.appointedDept === deptKey);
        setSubordinates(deptSubs);

        // 若该部门有正职但科员不足2人，自动补充
        const hasHead = deptSubs.some(s => s.deptPosition === 'head');
        const staffCount = deptSubs.filter(s => s.deptPosition === 'staff').length;
        if (hasHead && staffCount < 2) {
          fillDeptStaff(save.id, save.userId, deptKey).then(added => {
            if (added > 0) {
              getSubordinates(save.id).then(fresh => {
                setSubordinates(fresh.filter(s => s.appointedDept === deptKey));
              });
            }
          });
        }
      });
      if (deptKey === 'invest' || deptKey === 'market') {
        getEnterprises(save.id).then(setEnterprises);
      }
      if (deptKey === 'personnel') {
        getPersonnelCandidates(save.id).then(setPersonnelCandidates);
      }
      if (deptKey === 'petition') {
        getPetitionEvents(save.id).then(setPetitionEvents);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [save?.id, save?.kpiRankingResult, deptKey])
  );

  /** 构建持久冷却字符串写入 kpiRankingResult */
  const buildCDStr = (newCD: Record<string, number>, newCoopDay: number): string => {
    const raw = save?.kpiRankingResult ?? '';
    // 提取并保留 AUTO:1 前缀（始终放在最前）
    const autoPrefix = raw.includes('|AUTO:1') ? '|AUTO:1' : '';
    let base = raw.replace(/\|AUTO:1/g, '');
    // 清除旧的 DEPT_CD / COOP_CD 段
    for (const marker of ['|DEPT_CD:', '|COOP_CD:']) {
      if (base.includes(marker)) base = base.slice(0, base.indexOf(marker));
    }
    return autoPrefix + base + `|DEPT_CD:${JSON.stringify(newCD)}|COOP_CD:${newCoopDay}`;
  };

  /**
   * 按月重置冷却：每自然月（gameDays/30 整数部分）只能执行一次。
   * 返回值：0 = 本月可执行；>0 = 冷却剩余天数（下月首日才能执行）
   * lastDay = 0 表示从未执行，立即可用。
   */
  const policyRemain = (action: PolicyAction): number => {
    if (!save) return 0;
    const last = policyCD[action.id] ?? 0;
    if (last === 0) return 0; // 从未执行，立即可用
    const currentMonth = Math.floor(save.gameDays / 30);
    const lastMonth    = Math.floor(last / 30);
    if (currentMonth > lastMonth) return 0; // 已进入新月份，可再次执行
    // 同一个月内，计算距下月首日还有几天
    const nextMonthStart = (currentMonth + 1) * 30;
    return Math.max(0, nextMonthStart - save.gameDays);
  };

  const handleExecutePolicy = async (action: PolicyAction) => {
    if (!save) return;
    const remain = policyRemain(action);
    if (remain > 0) {
      setFeedback(`本月已施政，下月可再次执行（还需 ${remain} 天）`);
      setTimeout(() => setFeedback(''), 2500);
      return;
    }

    // 强化判断：正部级（rankLevel >= 11）且满足行动专属条件
    const isEnhanced = save.rankLevel >= 11
      && !!action.enhanceCondition
      && action.enhanceCondition.check(save);
    const multiplier = isEnhanced ? (action.enhanceCondition?.multiplier ?? 1.5) : 1;

    /** 对某字段的效果值应用倍率并取整 */
    const e = (v: number | undefined) => v !== undefined ? Math.round(v * multiplier) : undefined;

    // 执行效果
    const updates: Parameters<typeof updateGameSave>[0] = {};
    const fx = action.effect;
    const gdp  = e(fx.cityGdp);
    const lhd  = e(fx.cityLivelihood);
    const eco  = e(fx.cityEcology);
    const biz  = e(fx.cityBusiness);
    const sec  = e(fx.securityIndex);
    const pf   = e(fx.policeForce);
    const mp   = e(fx.meritPoints);
    const bf   = e(fx.bossFavor);
    const mv   = e(fx.moralValue);
    const fund = e(fx.fundBalance);
    const tax  = e(fx.taxRevenue);
    if (gdp  !== undefined) updates.cityGdp         = Math.max(0, Math.min(100, save.cityGdp + gdp));
    if (lhd  !== undefined) updates.cityLivelihood   = Math.max(0, Math.min(100, save.cityLivelihood + lhd));
    if (eco  !== undefined) updates.cityEcology      = Math.max(0, Math.min(100, save.cityEcology + eco));
    if (biz  !== undefined) updates.cityBusiness     = Math.max(0, Math.min(100, save.cityBusiness + biz));
    if (sec  !== undefined) updates.securityIndex    = Math.max(0, Math.min(100, save.securityIndex + sec));
    if (pf   !== undefined) updates.policeForce      = Math.max(0, save.policeForce + pf);
    if (mp   !== undefined) updates.meritPoints      = save.meritPoints + mp;
    if (bf   !== undefined) updates.bossFavor        = Math.max(0, Math.min(100, save.bossFavor + bf));
    if (mv   !== undefined) updates.moralValue       = Math.max(0, Math.min(100, save.moralValue + mv));
    if (fund !== undefined) updates.fundBalance      = Math.max(0, (save.fundBalance ?? 0) + fund);
    if (tax  !== undefined) updates.taxRevenue       = Math.max(0, (save.taxRevenue ?? 0) + tax);

    // 持久化冷却 - 立即更新本地状态防止重复点击
    const newCD = { ...policyCD, [action.id]: save.gameDays };
    setPolicyCD(newCD); // 先同步更新UI，立即禁用按钮
    updates.kpiRankingResult = buildCDStr(newCD, coopCooldownDay);

    await updateGameSave(updates);

    // 构建 KPI 变化行（展示强化后实际值）
    const lines: { label: string; value: number; color: string }[] = [];
    if (gdp  !== undefined) lines.push({ label: 'GDP',  value: gdp,  color: '#2B4B6F' });
    if (lhd  !== undefined) lines.push({ label: '民生', value: lhd,  color: '#2a7a3b' });
    if (eco  !== undefined) lines.push({ label: '生态', value: eco,  color: '#1a7a5a' });
    if (biz  !== undefined) lines.push({ label: '营商', value: biz,  color: '#7a5a2a' });
    if (sec  !== undefined) lines.push({ label: '治安', value: sec,  color: '#4a2c8a' });
    if (pf   !== undefined) lines.push({ label: '警力', value: pf,   color: '#1D2D44' });
    if (mp   !== undefined) lines.push({ label: '政绩', value: mp,   color: '#C82829' });
    if (bf   !== undefined) lines.push({ label: '上司好感', value: bf, color: '#7B5E2A' });

    const fundV   = fund ?? 0;
    const fundMsg = fundV > 0 ? `💰 资金 +${fundV}万` : fundV < 0 ? `💸 支出 ${Math.abs(fundV)}万` : '';
    const enhancedPrefix = isEnhanced ? '⭐ 强化·' : '';

    // 招商局特效：企业入驻
    if (deptKey === 'invest' && (action.id === 'inv1' || action.id === 'inv2' || action.id === 'inv3')) {
      const headAbility = deptChief?.ability ?? 50;
      // 强化时引进企业数翻倍
      const entCount = isEnhanced ? 2 : 1;
      const newEnts = await generateImmediateEnterprises(save.id, save.userId, save.gameDays, headAbility, entCount);
      if (newEnts.length > 0) {
        setEnterprises(prev => [...newEnts, ...prev]);
        const names = newEnts.map(e => e.name).join('、');
        lines.push({ label: '税收/月', value: newEnts.reduce((s, e) => s + e.taxContribution, 0), color: '#2a7a3b' });
        setKpiResult({ title: `✅ ${enhancedPrefix}${action.title} · 企业入驻`, lines, fundMsg: `🎉 ${names} 等 ${newEnts.length} 家企业成功入驻`, ok: true });
        return;
      }
    }

    setKpiResult({ title: `✅ ${enhancedPrefix}${action.title}`, lines, fundMsg, ok: true });
  };

  // 一键实施推荐行动：执行第一个未冷却的施政行动
  const handleOnekeyAction = async () => {
    if (!save || onekeyLoading) return;
    const available = policies.find(a => policyRemain(a) === 0);
    if (!available) {
      setFeedback('所有行动均在冷却中，请等待');
      setTimeout(() => setFeedback(''), 2500);
      return;
    }
    setOnekeyLoading(true);
    await handleExecutePolicy(available);
    setOnekeyLoading(false);
  };

  // 组织部：一键考评所有在岗下属
  const handleOrgBatchAssess = async () => {
    if (!save || onekeyLoading) return;
    setOnekeyLoading(true);
    const count = await batchAssessSubordinates(save.id, save.gameDays);
    setOnekeyLoading(false);
    setFeedback(count > 0 ? `✅ 一键考评完成，共考评 ${count} 名在岗人员，政绩+${count * 2}` : '暂无在岗下属可考评');
    setTimeout(() => setFeedback(''), 4000);
  };

  // 打开个人档案弹窗
  const openProfile = async (sub: Subordinate) => {
    setProfileSub(sub);
    setProfileLoading(true);
    const resumes = await getSubResumes(sub.id);
    setProfileResumes(resumes);
    setProfileLoading(false);
  };

  const handlePromote = async (sub: Subordinate) => {
    if (!save) return;
    const maxSubLevel = Math.min(12, save.rankLevel);
    if (sub.subLevel >= maxSubLevel) {
      setFeedback(`⚠️ ${sub.name} 级别已达主角级别上限，无法继续晋升`);
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    setPromotingId(sub.id);
    const deptName = DEPT_CONFIG[sub.appointedDept ?? 'personnel']?.name ?? '人事局';
    await promoteSubordinate(save.id, sub.id, sub.subLevel, save.gameDays, sub.position, deptName);
    setPersonnelCandidates(prev => prev.map(s => s.id === sub.id ? { ...s, subLevel: Math.min(12, s.subLevel + 1) } : s));
    setFeedback(`✓ ${sub.name} 晋升为 ${SUB_LEVEL_NAMES[Math.min(12, sub.subLevel + 1)]}，履历已更新`);
    setTimeout(() => setFeedback(''), 3000);
    setPromotingId(null);
  };

  if (!cfg) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <Text style={{ color: '#888' }}>部门不存在</Text>
      </View>
    );
  }

  // 该部门指定的下属（正职/副职/科员）
  const deptChief  = subordinates.find(s => s.isAppointed && s.deptPosition === 'head');
  const deptDeputy = subordinates.find(s => s.isAppointed && s.deptPosition === 'deputy');
  const deptStaff  = subordinates.filter(s => s.isAppointed && s.deptPosition === 'staff');

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* ── KPI 结果弹窗 ── */}
      <Modal visible={!!kpiResult} transparent animationType="fade" onRequestClose={() => setKpiResult(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 32 }} onPress={() => setKpiResult(null)}>
          <View style={{ backgroundColor: '#fff', width: '100%', borderTopWidth: 4, borderTopColor: kpiResult?.ok ? '#2a7a3b' : '#C82829', padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: kpiResult?.ok ? '#2a7a3b' : '#C82829', letterSpacing: 1 }}>{kpiResult?.title}</Text>
            {/* 指标变化行 */}
            <View style={{ gap: 8 }}>
              {(kpiResult?.lines ?? []).map((line, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, height: 4, backgroundColor: '#F0F0F0' }}>
                    <View style={{ height: 4, width: `${Math.min(100, Math.abs(line.value) * 8)}%`, backgroundColor: line.color }} />
                  </View>
                  <View style={{ backgroundColor: line.color, paddingHorizontal: 8, paddingVertical: 3, minWidth: 80, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {line.label} {line.value > 0 ? '+' : ''}{line.value}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
            {kpiResult?.fundMsg !== '' && (
              <Text style={{ fontSize: 13, color: '#555', fontWeight: '600', backgroundColor: '#F5F5F0', padding: 8 }}>{kpiResult?.fundMsg}</Text>
            )}
            <Pressable onPress={() => setKpiResult(null)} style={{ backgroundColor: '#1D3B5E', paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>确认</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ── 个人档案弹窗 ── */}
      <Modal visible={!!profileSub} transparent animationType="slide" onRequestClose={() => setProfileSub(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0D1520', maxHeight: '85%', borderTopWidth: 2, borderTopColor: '#2D4A6B' }}>
            {/* 弹窗头部 */}
            <View style={{ backgroundColor: '#1D2D44', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, backgroundColor: '#0D1520', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2D5A8E' }}>
                <Text style={{ fontSize: 28 }}>{profileSub ? getSubAvatarEmoji(profileSub.avatarId ?? 0, profileSub.gender ?? '男') : '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F0E8C8', fontSize: 16, fontWeight: '700' }}>{profileSub?.name ?? ''}</Text>
                <Text style={{ color: '#8AAAC8', fontSize: 11, marginTop: 2 }}>
                  {profileSub?.position ?? ''} · {profileSub?.gender ?? ''} · {SUB_LEVEL_NAMES[profileSub?.subLevel ?? 1]}
                </Text>
              </View>
              <Pressable onPress={() => setProfileSub(null)} style={{ padding: 6 }}>
                <Text style={{ color: '#8AAAC8', fontSize: 22 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              {/* 基本信息卡 */}
              <View style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2D3A50', padding: 12, gap: 6 }}>
                <Text style={{ color: '#C8A832', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>📋 基本信息</Text>
                {[
                  { label: '出生年份', value: profileSub?.birthYear ? `${profileSub.birthYear}年` : '—' },
                  { label: '籍　　贯', value: profileSub?.hometown ?? '—' },
                  { label: '毕业院校', value: profileSub?.university ?? '—' },
                  { label: '所学专业', value: profileSub?.major ?? '—' },
                  { label: '当前职级', value: SUB_LEVEL_NAMES[profileSub?.subLevel ?? 1] },
                  { label: '能力指数', value: String(profileSub?.ability ?? 0) },
                  { label: '忠诚指数', value: String(profileSub?.loyalty ?? 0) },
                  { label: '廉洁指数', value: String(profileSub?.integrity ?? 0) },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#1E2D3D' }}>
                    <Text style={{ color: '#6A8AAA', fontSize: 11, width: 72 }}>{row.label}</Text>
                    <Text style={{ color: '#D0D8E8', fontSize: 11, flex: 1 }}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {/* 仕途历程 */}
              <View style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2D3A50', padding: 12 }}>
                <Text style={{ color: '#C8A832', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>🗂️ 仕途历程</Text>
                {profileLoading ? (
                  <ActivityIndicator color="#5588CC" style={{ marginVertical: 16 }} />
                ) : profileResumes.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#5A7A9A', fontSize: 12 }}>暂无仕途记录</Text>
                  </View>
                ) : (
                  <View style={{ gap: 0 }}>
                    {profileResumes.map((r, idx) => (
                      <View key={r.id} style={{ flexDirection: 'row', gap: 10 }}>
                        {/* 时间轴线 */}
                        <View style={{ alignItems: 'center', width: 20 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: idx === 0 ? '#C8A832' : '#3A5A7A', marginTop: 3 }} />
                          {idx < profileResumes.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#2D3A50', marginTop: 2 }} />}
                        </View>
                        {/* 内容 */}
                        <View style={{ flex: 1, paddingBottom: 12 }}>
                          <Text style={{ color: '#F0E8C8', fontSize: 12, fontWeight: '600' }}>{r.position}</Text>
                          <Text style={{ color: '#6A8AAA', fontSize: 10, marginTop: 2 }}>{r.deptName}</Text>
                          <Text style={{ color: '#4A6A8A', fontSize: 9, marginTop: 1 }}>
                            {gameDaysToDate(r.startDay)}{r.endDay ? ` — ${gameDaysToDate(r.endDay)}` : ' — 至今'}
                            {r.note ? `  · ${r.note}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 24, marginRight: 8 }}>{cfg.icon}</Text>
          <View>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>{cfg.fullName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{deptDisplayName}</Text>
          </View>
        </View>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 10 }}>
          <Text style={{ color: '#2a7a3b', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* 部门简介 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>部门职能</Text>
          <Text style={{ fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 10 }}>{cfg.desc}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cfg.functions.map((f, i) => (
              <View key={i} style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E' }}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 当前负责人 / 申请配合 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
            {canAppoint ? '部门负责人' : '协作关系'}
          </Text>

          {canAppoint ? (
            // 县长及以上：显示已任命负责人或提示任命
            deptChief ? (
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => void openProfile(deptChief)}
                  android_ripple={{ color: 'rgba(29,59,94,0.08)' }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <View style={{ width: 44, height: 44, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 24 }}>{getSubAvatarEmoji(deptChief.avatarId ?? 0, deptChief.gender ?? '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{deptChief.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{cfg.headTitle} · {deptChief.gender}</Text>
                    <Text style={{ fontSize: 10, color: '#1D3B5E', marginTop: 1 }}>点击查看档案 →</Text>
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#555' }}>能力 {deptChief.ability}</Text>
                    <Text style={{ fontSize: 10, color: '#555' }}>廉洁 {deptChief.integrity}</Text>
                  </View>
                </Pressable>
                {/* 自动行动提示 */}
                <View style={{ backgroundColor: '#F0F7E8', borderWidth: 1, borderColor: '#C8E6C9', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11 }}>⚙️</Text>
                  <Text style={{ fontSize: 11, color: '#2a7a3b', flex: 1 }}>
                    每月自动执行【{cfg.autoActionName}】，效果随能力提升
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#C82829' }}>⚠️ 当前{cfg.headTitle}职位空缺</Text>
                <Pressable onPress={() => router.push('/(app)/subordinates')} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1D3B5E' }}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>前往任命</Text>
                </Pressable>
              </View>
            )
          ) : (
            // 县长以下：申请配合模式
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 10 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                  您当前级别不具备直接任命{cfg.headTitle}的权力。{'\n'}
                  可通过【申请配合】方式请求该部门给予工作协助，获得相关指数加成。每次申请冷却30天。
                </Text>
              </View>
              {(() => {
                const coopRemain = (save && coopCooldownDay > 0) ? Math.max(0, 30 - (save.gameDays - coopCooldownDay)) : 0;
                return (
                  <Pressable
                    onPress={async () => {
                      if (!save) return;
                      if (coopRemain > 0) {
                        setFeedback(`配合申请冷却中，还需等待 ${coopRemain} 天`);
                        setTimeout(() => setFeedback(''), 2500);
                        return;
                      }
                      const bonus = 4 + (save.rankLevel * 1);
                      const newCoopDay = save.gameDays;
                      await updateGameSave({
                        meritPoints: save.meritPoints + 8,
                        cityGdp: Math.min(100, save.cityGdp + (deptKey === 'ndrc' || deptKey === 'finance' || deptKey === 'agriculture' ? bonus * 0.5 : 0)),
                        cityLivelihood: Math.min(100, save.cityLivelihood + (deptKey === 'education' || deptKey === 'health' || deptKey === 'police' ? bonus * 0.6 : 0)),
                        cityEcology: Math.min(100, save.cityEcology + (deptKey === 'ecology' ? bonus : 0)),
                        cityBusiness: Math.min(100, save.cityBusiness + (deptKey === 'market' ? bonus : 0)),
                        securityIndex: Math.min(100, save.securityIndex + (deptKey === 'police' ? bonus * 0.5 : 0)),
                        kpiRankingResult: buildCDStr(policyCD, newCoopDay),
                      });
                      setCoopCooldownDay(newCoopDay);
                      setFeedback(`✓ 已向${deptDisplayName}申请配合，获得协助加成（下次冷却30天）`);
                      setTimeout(() => setFeedback(''), 3500);
                    }}
                    style={{ backgroundColor: coopRemain > 0 ? '#aaa' : '#1D3B5E', paddingVertical: 10, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>
                      {coopRemain > 0 ? `申请配合（冷却${coopRemain}天）` : '申请配合'}
                    </Text>
                  </Pressable>
                );
              })()}
            </View>
          )}
        </View>

        {/* 部门班子成员（副职+科员） */}
        {canAppoint && (deptDeputy || deptStaff.length > 0) && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>部门班子成员</Text>
              <Text style={{ fontSize: 10, color: '#888' }}>在编 {subordinates.filter(s => s.isAppointed).length}/{staffQuota} 人</Text>
            </View>
            {/* 副职 */}
            {deptDeputy && (
              <Pressable
                onPress={() => void openProfile(deptDeputy)}
                android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}
              >
                <View style={{ width: 36, height: 36, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                  <Text style={{ fontSize: 20 }}>{getSubAvatarEmoji(deptDeputy.avatarId ?? 0, deptDeputy.gender ?? '男')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{deptDeputy.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{cfg.deputyTitle} · {deptDeputy.gender}</Text>
                  <Text style={{ fontSize: 9, color: '#1D3B5E', marginTop: 1 }}>查看档案 →</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ fontSize: 10, color: '#555' }}>能力 {deptDeputy.ability}</Text>
                  <Text style={{ fontSize: 10, color: '#555' }}>廉洁 {deptDeputy.integrity}</Text>
                </View>
              </Pressable>
            )}
            {/* 科员列表（默认折叠） */}
            {deptStaff.length > 0 && (
              <>
                {/* 折叠标题行 */}
                <Pressable
                  onPress={() => setStaffCollapsed(v => !v)}
                  android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F0F0F0' }}
                >
                  <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '600', letterSpacing: 1 }}>
                    科员名单（{deptStaff.length}人）
                  </Text>
                  <Text style={{ fontSize: 14, color: '#1D3B5E', fontWeight: '700' }}>
                    {staffCollapsed ? '∨' : '∧'}
                  </Text>
                </Pressable>

                {/* 展开内容 */}
                {!staffCollapsed && deptStaff.map((s, idx) => (
                  <Pressable
                    key={s.id}
                    onPress={() => void openProfile(s)}
                    android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      paddingVertical: 6,
                      borderBottomWidth: idx < deptStaff.length - 1 ? 1 : 0,
                      borderBottomColor: '#F0F0F0',
                    }}
                  >
                    <View style={{ width: 32, height: 32, backgroundColor: '#F7F7F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0' }}>
                      <Text style={{ fontSize: 18 }}>{getSubAvatarEmoji(s.avatarId ?? 0, s.gender ?? '男')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '600', color: '#444' }}>{s.name}</Text>
                      <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{s.position} · {s.gender}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#888' }}>能力 {s.ability}</Text>
                  </Pressable>
                ))}
              </>
            )}
            <Pressable
              onPress={() => router.push('/(app)/subordinates')}
              style={{ marginTop: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: '#1D3B5E' }}
            >
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '600' }}>管理人员 →</Text>
            </Pressable>
          </View>
        )}

        {/* 当前影响 */}
        {save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>关联指数</Text>
            {deptKey === 'police' && (
              <>
                <StatBar label="警力储备" value={Math.min(100, save.policeForce)} color="#1D3B5E" />
                <StatBar label="治安指数" value={save.securityIndex} color="#1D3B5E" />
              </>
            )}
            {(deptKey === 'ndrc' || deptKey === 'finance' || deptKey === 'urban' || deptKey === 'agriculture') && (
              <>
                <StatBar label="经济发展" value={save.cityGdp} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
            {(deptKey === 'education' || deptKey === 'health') && (
              <StatBar label="民生满意度" value={save.cityLivelihood} color="#1D3B5E" />
            )}
            {deptKey === 'ecology' && (
              <StatBar label="生态环境" value={save.cityEcology} color="#2a7a3b" />
            )}
            {deptKey === 'market' && (
              <>
                <StatBar label="营商环境" value={save.cityBusiness} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
            {deptKey === 'petition' && (
              <>
                <StatBar label="上司满意度" value={save.bossFavor} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
          </View>
        )}

        {/* 施政行动 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>施政行动</Text>
            <Pressable
              onPress={() => void handleOnekeyAction()}
              disabled={onekeyLoading || policies.every(a => policyRemain(a) > 0)}
              style={{ backgroundColor: (onekeyLoading || policies.every(a => policyRemain(a) > 0)) ? '#ccc' : '#1D2D44', paddingHorizontal: 12, paddingVertical: 6 }}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {onekeyLoading ? '执行中…' : '⚡ 一键实施推荐行动'}
              </Text>
            </Pressable>
          </View>
          {/* 正部级强化提示横幅 */}
          {save && save.rankLevel >= 11 && (
            <View style={{ backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#F9A825', padding: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 13 }}>⭐</Text>
              <Text style={{ fontSize: 11, color: '#7B4F00', fontWeight: '600', flex: 1 }}>
                正部级强化已激活 · 满足条件的行动效果提升×1.5
              </Text>
            </View>
          )}
          <View style={{ gap: 10 }}>
            {policies.map(action => {
              const remain = policyRemain(action);
              const done = remain > 0;
              const fundChange = action.effect.fundBalance ?? 0;
              const taxChange = action.effect.taxRevenue ?? 0;
              // 强化判断
              const canEnhance = !!(save && save.rankLevel >= 11 && action.enhanceCondition);
              const isEnhanced = canEnhance && action.enhanceCondition!.check(save!);
              const multiplier = isEnhanced ? (action.enhanceCondition?.multiplier ?? 1.5) : 1;
              const eVal = (v: number | undefined) => v !== undefined ? Math.round(v * multiplier) : undefined;
              return (
                <View key={action.id} style={{
                  borderWidth: 1,
                  borderColor: isEnhanced ? '#F9A825' : (done ? '#E0E0E0' : '#D1D1D1'),
                  padding: 12,
                  backgroundColor: isEnhanced ? '#FFFDF0' : (done ? '#FAFAFA' : '#fff'),
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{action.title}</Text>
                      {/* 强化徽章（最高优先级显示） */}
                      {isEnhanced && (
                        <View style={{ backgroundColor: '#FFD600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                          <Text style={{ fontSize: 9, color: '#5D3A00', fontWeight: '800' }}>⭐ 正部强化</Text>
                        </View>
                      )}
                      {/* 条件提示（正部级但未满足条件） */}
                      {canEnhance && !isEnhanced && !done && (
                        <View style={{ backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: '#E0E0E0' }}>
                          <Text style={{ fontSize: 9, color: '#999', fontWeight: '600' }}>🔒 强化条件：{action.enhanceCondition!.label}</Text>
                        </View>
                      )}
                      {/* KPI维度标签 */}
                      {action.kpiDim && (
                        <View style={{ backgroundColor: done ? '#F0F0F0' : '#E8F3FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                          <Text style={{ fontSize: 9, color: done ? '#aaa' : '#1D3B5E', fontWeight: '700' }}>📊 {action.kpiDim}</Text>
                        </View>
                      )}
                      {action.tag && (
                        <View style={{ backgroundColor: done ? '#F0F0F0' : '#F0F8E8', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
                          <Text style={{ fontSize: 9, color: done ? '#aaa' : '#2a7a3b', fontWeight: '600' }}>{action.tag}</Text>
                        </View>
                      )}
                      {done && (
                        <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#E65100', fontWeight: '600' }}>
                            {remain <= 5 ? `${remain}天后可用` : '本月已用'}
                          </Text>
                        </View>
                      )}
                      {(policyCD[action.id] ?? 0) > 0 && (
                        <Text style={{ fontSize: 9, color: '#999' }}>上次：第{policyCD[action.id]}天</Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => void handleExecutePolicy(action)}
                      disabled={done}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 6, marginLeft: 8,
                        backgroundColor: done ? '#E0E0E0' : (isEnhanced ? '#B8860B' : '#1D3B5E'),
                      }}
                    >
                      <Text style={{ fontSize: 11, color: done ? '#aaa' : '#fff', fontWeight: '700' }}>
                        {done ? '本月已用' : isEnhanced ? '⭐执行' : '执行'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>{action.desc}</Text>
                  {/* 效果标签：强化时显示强化后的数值 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {action.effect.cityGdp !== undefined && <EffectTag label={`GDP${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.cityGdp)!} />}
                    {action.effect.cityLivelihood !== undefined && <EffectTag label={`民生${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.cityLivelihood)!} />}
                    {action.effect.cityEcology !== undefined && <EffectTag label={`生态${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.cityEcology)!} />}
                    {action.effect.cityBusiness !== undefined && <EffectTag label={`营商${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.cityBusiness)!} />}
                    {action.effect.securityIndex !== undefined && <EffectTag label={`治安${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.securityIndex)!} />}
                    {action.effect.policeForce !== undefined && <EffectTag label={`警力${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.policeForce)!} />}
                    {action.effect.meritPoints !== undefined && <EffectTag label={`政绩${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.meritPoints)!} />}
                    {action.effect.bossFavor !== undefined && <EffectTag label={`上司好感${isEnhanced ? '🔥' : ' '}`} value={eVal(action.effect.bossFavor)!} />}
                    {fundChange !== 0 && (
                      <View style={{ backgroundColor: fundChange > 0 ? '#e8f5e9' : '#fff3e0', paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: fundChange > 0 ? '#2a7a3b' : '#e65100', fontWeight: '600' }}>
                          {fundChange > 0
                            ? `💰+${isEnhanced ? Math.round(fundChange * multiplier) : fundChange}万`
                            : `💸${isEnhanced ? Math.round(fundChange * multiplier) : fundChange}万`}
                        </Text>
                      </View>
                    )}
                    {taxChange > 0 && (
                      <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>
                          税收+{isEnhanced ? Math.round(taxChange * multiplier) : taxChange}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ height: 16 }} />

        {/* ===== 人事局：晋升评审面板 ===== */}
        {deptKey === 'personnel' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>年度晋升评审</Text>
            {personnelCandidates.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无符合晋升条件的干部</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>条件：能力≥60，经验≥50，未达最高职级</Text>
              </View>
            ) : (
              personnelCandidates.map(sub => (
                <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 22 }}>{getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: '#e8f0ff', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#1D3B5E' }}>
                          {SUB_LEVEL_NAMES[sub.subLevel]} → {SUB_LEVEL_NAMES[Math.min(12, sub.subLevel + 1)]}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#666' }}>能力 {sub.ability}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void handlePromote(sub)}
                    disabled={promotingId === sub.id || sub.subLevel >= Math.min(12, save?.rankLevel ?? 12)}
                    style={{ backgroundColor: sub.subLevel >= Math.min(12, save?.rankLevel ?? 12) ? '#ccc' : '#1D3B5E', paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {promotingId === sub.id ? '处理中…' : sub.subLevel >= Math.min(12, save?.rankLevel ?? 12) ? '已达上限' : '批准晋升'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* ===== 招商局：企业名单入口 ===== */}
        {deptKey === 'invest' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>招商引资成果</Text>
              <Pressable
                onPress={() => router.push('/(app)/enterprise-list')}
                style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>企业名单 ›</Text>
              </Pressable>
            </View>
            {/* 成果数字卡片 */}
            {(() => {
              const operating = enterprises.filter(e => e.status === 'operating');
              const totalTax = operating.reduce((s, e) => s + e.taxContribution, 0);
              const totalInvest = enterprises.reduce((s, e) => s + e.investAmount, 0);
              const largeCount = enterprises.filter(e => e.scale === 'large').length;
              const mediumCount = enterprises.filter(e => e.scale === 'medium').length;
              // 行业分布
              const industryMap: Record<string, number> = {};
              for (const e of operating) {
                industryMap[e.industry] = (industryMap[e.industry] ?? 0) + 1;
              }
              const topIndustry = Object.entries(industryMap).sort((a, b) => b[1] - a[1])[0];
              return (
                <>
                  {/* 4格统计 */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
                    <View style={{ flex: 1, backgroundColor: '#F0F8FF', padding: 10, borderLeftWidth: 3, borderLeftColor: '#2B4B6F' }}>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: '#2B4B6F', fontVariant: ['tabular-nums'] }}>{operating.length}</Text>
                      <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>在营企业（家）</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F0FFF4', padding: 10, borderLeftWidth: 3, borderLeftColor: '#2a7a3b' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#2a7a3b', fontVariant: ['tabular-nums'] }} numberOfLines={1}>{totalTax}万</Text>
                      <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>月税收贡献</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#FFF8E1', padding: 10, borderLeftWidth: 3, borderLeftColor: '#E8A020' }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#7B4F00', fontVariant: ['tabular-nums'] }} numberOfLines={1}>{totalInvest >= 10000 ? `${(totalInvest / 10000).toFixed(1)}亿` : `${totalInvest}万`}</Text>
                      <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>累计引入投资</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#F5F0FF', padding: 10, borderLeftWidth: 3, borderLeftColor: '#7B52C8' }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: '#5B2D8B', fontVariant: ['tabular-nums'] }}>{largeCount}</Text>
                      <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>大型企业（家）</Text>
                    </View>
                  </View>
                  {/* 规模分布条形图 */}
                  {enterprises.length > 0 && (
                    <View style={{ marginBottom: 14 }}>
                      <Text style={{ fontSize: 10, color: '#888', marginBottom: 5 }}>企业规模结构（共 {enterprises.length} 家）</Text>
                      <View style={{ flexDirection: 'row', height: 10, borderRadius: 2, overflow: 'hidden', backgroundColor: '#f0f0f0' }}>
                        {largeCount > 0 && <View style={{ flex: largeCount, backgroundColor: '#2B4B6F' }} />}
                        {mediumCount > 0 && <View style={{ flex: mediumCount, backgroundColor: '#7B52C8' }} />}
                        {enterprises.length - largeCount - mediumCount > 0 && <View style={{ flex: enterprises.length - largeCount - mediumCount, backgroundColor: '#a0b4cc' }} />}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 10, marginTop: 5 }}>
                        {largeCount > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <View style={{ width: 7, height: 7, backgroundColor: '#2B4B6F', borderRadius: 1 }} />
                            <Text style={{ fontSize: 9, color: '#555' }}>大型 {largeCount}</Text>
                          </View>
                        )}
                        {mediumCount > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <View style={{ width: 7, height: 7, backgroundColor: '#7B52C8', borderRadius: 1 }} />
                            <Text style={{ fontSize: 9, color: '#555' }}>中型 {mediumCount}</Text>
                          </View>
                        )}
                        {enterprises.length - largeCount - mediumCount > 0 && (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <View style={{ width: 7, height: 7, backgroundColor: '#a0b4cc', borderRadius: 1 }} />
                            <Text style={{ fontSize: 9, color: '#555' }}>小型 {enterprises.length - largeCount - mediumCount}</Text>
                          </View>
                        )}
                        {topIndustry && (
                          <Text style={{ fontSize: 9, color: '#888', marginLeft: 4 }}>· 主导行业：{topIndustry[0]} ({topIndustry[1]}家)</Text>
                        )}
                      </View>
                    </View>
                  )}
                </>
              );
            })()}
            {/* 企业列表 */}
            {enterprises.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>🏢</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>尚未引进任何企业</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>通过招商行动立即引进企业入驻</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F8', padding: 8, marginBottom: 6 }}>
                  <Text style={{ flex: 2, fontSize: 11, color: '#1D3B5E', fontWeight: '700' }}>企业名称</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#1D3B5E', fontWeight: '700', textAlign: 'center' }}>行业</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#2a7a3b', fontWeight: '700', textAlign: 'right' }}>月税收</Text>
                </View>
                {enterprises.slice(0, 5).map(ent => (
                  <View key={ent.id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                    <Text style={{ flex: 2, fontSize: 12, color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#666', textAlign: 'center' }}>{ent.industry}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#2a7a3b', fontWeight: '600', textAlign: 'right' }}>{ent.taxContribution}万</Text>
                  </View>
                ))}
                {enterprises.length > 5 && (
                  <Pressable onPress={() => router.push('/(app)/enterprise-list')}>
                    <Text style={{ fontSize: 11, color: '#1D3B5E', textAlign: 'center', marginTop: 8 }}>共 {enterprises.length} 家企业，点击查看全部 ›</Text>
                  </Pressable>
                )}
                <View style={{ flexDirection: 'row', backgroundColor: '#FFF8E1', padding: 10, marginTop: 10 }}>
                  <Text style={{ flex: 1, fontSize: 12, color: '#7a5c00' }}>月度总税收（在营企业）</Text>
                  <Text style={{ fontSize: 13, color: '#7a5c00', fontWeight: '700' }}>
                    {enterprises.filter(e => e.status === 'operating').reduce((s, e) => s + e.taxContribution, 0)}万元
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ===== 税务局：税收概览 ===== */}
        {deptKey === 'tax' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>税收情况概览</Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>当前资金余额</Text>
                <Text style={{ fontSize: 14, color: '#1D3B5E', fontWeight: '700' }}>{save.fundBalance.toFixed(0)} 万元</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>城市税率</Text>
                <Text style={{ fontSize: 14, color: '#444', fontWeight: '600' }}>{((save.cityTaxRate ?? 0.12) * 100).toFixed(1)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>本年累计税收</Text>
                <Text style={{ fontSize: 14, color: '#2a7a3b', fontWeight: '700' }}>{save.taxRevenue.toFixed(0)} 万元</Text>
              </View>
              <View style={{ backgroundColor: '#F0F8FF', padding: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 18 }}>
                  💡 招商局引进更多企业可提高每月税收入账，税收自动计入城市资金余额。
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ===== 工商局：企业管理面板 ===== */}
        {deptKey === 'market' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>企业监管管理</Text>
              <Pressable
                onPress={() => router.push('/(app)/enterprise-list')}
                style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>企业名录 ›</Text>
              </Pressable>
            </View>

            {/* 一键优化营商服务 */}
            <View style={{ backgroundColor: '#F0F8F0', borderWidth: 1, borderColor: '#B8DDB8', padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a5c2a', marginBottom: 4 }}>🌱 优化营商服务环境</Text>
              <Text style={{ fontSize: 11, color: '#3a7a4a', lineHeight: 16, marginBottom: 8 }}>
                为全市所有运营企业提供政策扶持与服务优化，批量提升企业税收贡献 5~10%。
              </Text>
              <Pressable
                onPress={async () => {
                  if (!save || marketActionLoading) return;
                  setMarketActionLoading('optimize');
                  const pct = await optimizeBusinessService(save.id);
                  if (pct > 0) {
                    getEnterprises(save.id).then(setEnterprises);
                    setFeedback(`✓ 营商服务优化完成！全市企业税收贡献提升 ${pct}%`);
                  } else {
                    setFeedback('暂无可优化的运营企业');
                  }
                  setMarketActionLoading(null);
                  setTimeout(() => setFeedback(''), 3000);
                }}
                disabled={!!marketActionLoading}
                style={{ backgroundColor: marketActionLoading === 'optimize' ? '#aaa' : '#2a7a3b', paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {marketActionLoading === 'optimize' ? '处理中…' : '批量优化服务'}
                </Text>
              </Pressable>
            </View>

            {/* 逐企业操作 */}
            {enterprises.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 26, marginBottom: 6 }}>🏢</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无企业数据</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>由招商局引进企业后可在此管理</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  逐企业操作（共 {enterprises.filter(e => e.status === 'operating').length} 家运营中）
                </Text>
                {enterprises.filter(e => e.status === 'operating').slice(0, 8).map(ent => (
                  <View key={ent.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ent.industry} · {ent.scale === 'large' ? '大型' : ent.scale === 'medium' ? '中型' : '小型'} · 月税 {ent.taxContribution}万</Text>
                    </View>
                    {/* 专项检查 */}
                    <Pressable
                      onPress={async () => {
                        if (marketActionLoading) return;
                        setMarketActionLoading(`inspect_${ent.id}`);
                        const result = await inspectEnterprise(ent.id);
                        if (result) {
                          getEnterprises(save.id).then(setEnterprises);
                          const sign = result.delta >= 0 ? '+' : '';
                          setFeedback(`📋 ${ent.name} 专项检查完成，税收变化 ${sign}${result.delta}万`);
                        }
                        setMarketActionLoading(null);
                        setTimeout(() => setFeedback(''), 3000);
                      }}
                      disabled={!!marketActionLoading}
                      style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>检查</Text>
                    </Pressable>
                    {/* 违规整改 */}
                    <Pressable
                      onPress={async () => {
                        if (marketActionLoading) return;
                        setMarketActionLoading(`regulate_${ent.id}`);
                        await regulateEnterprise(ent.id);
                        getEnterprises(save.id).then(setEnterprises);
                        setFeedback(`⚠️ ${ent.name} 已责令整改关停`);
                        setMarketActionLoading(null);
                        setTimeout(() => setFeedback(''), 3000);
                      }}
                      disabled={!!marketActionLoading}
                      style={{ backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>整改</Text>
                    </Pressable>
                  </View>
                ))}
                {enterprises.filter(e => e.status === 'operating').length > 8 && (
                  <Pressable onPress={() => router.push('/(app)/enterprise-list')}>
                    <Text style={{ fontSize: 11, color: '#1D3B5E', textAlign: 'center', marginTop: 8 }}>查看全部企业 ›</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ===== 信访办：信访事件面板 ===== */}
        {deptKey === 'petition' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
              📮 信访事件处理
            </Text>

            {/* 统计概览 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#FFF3F3', borderWidth: 1, borderColor: '#FFCCCC', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#c0392b' }}>
                  {petitionEvents.filter(e => e.eventType === 'complaint' && !e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>待处理投诉</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F0FFF0', borderWidth: 1, borderColor: '#B8DDB8', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#2a7a3b' }}>
                  {petitionEvents.filter(e => e.eventType === 'praise' && !e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>待阅示好评</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1D3B5E' }}>
                  {petitionEvents.filter(e => e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>已处理</Text>
              </View>
            </View>

            {petitionEvents.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📬</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无信访事件</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>每月约有30%概率产生信访事件</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {petitionEvents.map(event => {
                  const isComplaint = event.eventType === 'complaint';
                  const processed = event.isProcessed;
                  return (
                    <View
                      key={event.id}
                      style={{
                        borderWidth: 1,
                        borderColor: processed ? '#E0E0E0' : isComplaint ? '#FFCCCC' : '#B8DDB8',
                        backgroundColor: processed ? '#FAFAFA' : isComplaint ? '#FFF8F8' : '#F8FFF8',
                        padding: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={{
                              paddingHorizontal: 6, paddingVertical: 2,
                              backgroundColor: isComplaint ? '#c0392b' : '#2a7a3b',
                            }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>
                                {isComplaint ? '投诉' : '表扬'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: processed ? '#999' : '#222' }} numberOfLines={1}>
                              {event.title}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }} numberOfLines={3}>
                            {event.content}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                            <Text style={{ fontSize: 10, color: isComplaint ? '#c0392b' : '#2a7a3b' }}>
                              上司好感 {event.bosFavorDelta > 0 ? '+' : ''}{event.bosFavorDelta}
                            </Text>
                            <Text style={{ fontSize: 10, color: isComplaint ? '#c0392b' : '#2a7a3b' }}>
                              政绩 {event.meritDelta > 0 ? '+' : ''}{event.meritDelta}
                            </Text>
                          </View>
                        </View>
                        {!processed && (
                          <Pressable
                            onPress={async () => {
                              const result = await processPetitionEvent(event.id);
                              if (result && save) {
                                setPetitionEvents(prev => prev.map(e => e.id === event.id ? { ...e, isProcessed: true } : e));
                                const updates: Parameters<typeof updateGameSave>[0] = {
                                  bossFavor: Math.max(0, Math.min(100, save.bossFavor + result.bosFavorDelta)),
                                  meritPoints: save.meritPoints + result.meritDelta,
                                };
                                await updateGameSave(updates);
                                const sign = result.meritDelta >= 0 ? '+' : '';
                                setFeedback(`✓ 已处理 "${event.title}"，政绩 ${sign}${result.meritDelta}，上司好感 ${result.bosFavorDelta > 0 ? '+' : ''}${result.bosFavorDelta}`);
                                setTimeout(() => setFeedback(''), 3500);
                              }
                            }}
                            style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                              {isComplaint ? '处理' : '阅示'}
                            </Text>
                          </Pressable>
                        )}
                        {processed && (
                          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' }}>
                            <Text style={{ color: '#aaa', fontSize: 11 }}>已完成</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={{ backgroundColor: '#FFF8E1', padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#7a5c00', lineHeight: 17 }}>
                💡 信访事件每月约30%概率自动产生。及时处理可获政绩加成，投诉若不处理将持续消耗上司满意度。
              </Text>
            </View>
          </View>
        )}

        {/* ===== 组织部：一键考评 + 正职任命面板 ===== */}
        {deptKey === 'organization' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>干部考评与任命</Text>

            {/* 一键考评按钮 */}
            <Pressable
              onPress={() => void handleOrgBatchAssess()}
              disabled={onekeyLoading}
              style={{ backgroundColor: onekeyLoading ? '#ccc' : '#C82829', padding: 13, alignItems: 'center', marginBottom: 14 }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {onekeyLoading ? '考评中…' : '📋 一键考评所有在岗干部'}
              </Text>
              <Text style={{ color: '#ffcdd2', fontSize: 10, marginTop: 3 }}>
                对所有在岗下属实施综合考核，能力/忠诚/经验随机浮动
              </Text>
            </Pressable>

            {/* 部门正职任命状态 */}
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>本部门任职情况</Text>
            {subordinates.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>🏛️</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无人员任职组织部</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>请在下属管理中任命组织部正职</Text>
              </View>
            ) : (
              subordinates.map(sub => {
                const posLabel = sub.deptPosition === 'head' ? '部长（正职）' : sub.deptPosition === 'deputy' ? '副部长（副职）' : '科员';
                const tagColor = sub.deptPosition === 'head' ? '#C82829' : sub.deptPosition === 'deputy' ? '#1D2D44' : '#888';
                return (
                  <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 }}>
                    <View style={{ width: 40, height: 40, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                      <Text style={{ fontSize: 22 }}>{getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                        <View style={{ backgroundColor: tagColor + '22', borderWidth: 1, borderColor: tagColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: tagColor, fontWeight: '700' }}>{posLabel}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#666' }}>能力 {sub.ability}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#666' }}>忠诚 {sub.loyalty}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <View style={{ backgroundColor: '#EEF2F7', padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 17 }}>
                💡 组织部负责全市干部考评与任用工作。一键考评将对所有在岗下属进行综合测评，影响其能力、忠诚与经验值。正职任命请在「下属管理」页面操作。
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
