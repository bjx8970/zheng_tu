// 职能管理总览页 — 按官职体系（党委/政法/政府）分组显示
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getSubordinates, getDeptStaffCounts, rewardDeptHead,
  getOrCreateSecretary, getActiveNationalPolicy, respondToPolicy,
  updateSave,
} from '@/db/gameApi';
import {
  DEPT_CONFIG,
  getDeptNameByRank,
  getDeptHeadTitle,
  getDeptStaffQuota,
  DISCIPLINE_LINE_INSTITUTIONS,
  LEAGUE_LINE_INSTITUTIONS,
  DISCIPLINE_LINE_POSITIONS,
  LEAGUE_LINE_POSITIONS,
} from '@/types/game';
import type { DeptKey, SubInstitution, Subordinate, Secretary, NationalPolicy } from '@/types/game';

// ── 编制位掩码常量 ────────────────────────────────────────────────
// staffApplyBits 低4位：本年申请标志
//   bit0 (1)  = 本年已申请领导岗位扩编
// staffApplyBits 高位（>> 4）：累计永久扩编次数（每次+20人/每部门）
const STAFF_BIT_EXPAND = 1; // 本年领导扩编申请标志

/** 应急编制有效期天数 */
const EMERGENCY_STAFF_DAYS = 90;
/** 应急编制额外增加名额 */
const EMERGENCY_EXTRA_QUOTA = 15;

// ─── 各部门所属系统分组 ──────────────────────────────────────
type DeptSystem = 'party' | 'politic' | 'gov';

const DEPT_SYSTEM: Record<DeptKey, DeptSystem> = {
  organization: 'party',
  propaganda:   'party',   // 宣传部 → 党委系统
  discipline:   'party',   // 纪检委 → 党委系统
  police:       'politic',
  petition:     'politic',
  ndrc:         'gov',
  finance:      'gov',
  urban:        'gov',
  education:    'gov',
  health:       'gov',
  ecology:      'gov',
  market:       'gov',
  agriculture:  'gov',
  personnel:    'gov',
  invest:       'gov',
  tax:          'gov',
  govoffice:    'gov',     // 政府办公室 → 政府系统
  industry:     'gov',     // 工信局 → 政府系统
  naturalres:   'gov',     // 自然资源局 → 政府系统
  construction: 'gov',     // 住建局 → 政府系统
  transport:    'gov',     // 交通局 → 政府系统
  health2:      'gov',     // 卫健委 → 政府系统
};

// ─── 各系统按职级显示的上级机构标签 ─────────────────────────
function getSystemLabel(system: DeptSystem, rankLevel: number) {
  const level =
    rankLevel <= 3  ? 'town'     :
    rankLevel <= 6  ? 'county'   :
    rankLevel <= 9  ? 'city'     :
    rankLevel <= 11 ? 'province' : 'national';

  const LABELS: Record<DeptSystem, Record<string, string>> = {
    party: {
      town:     '乡镇党委  ·  党委工作系统',
      county:   '县委  ·  党委工作系统',
      city:     '市委  ·  党委工作系统',
      province: '省执政委  ·  党委工作系统',
      national: '中央  ·  党委工作系统',
    },
    politic: {
      town:     '乡镇政法  ·  政法综治系统',
      county:   '县政法委  ·  政法综治系统',
      city:     '市政法委  ·  政法综治系统',
      province: '省政法委  ·  政法综治系统',
      national: '联邦政法委  ·  政法综治系统',
    },
    gov: {
      town:     '乡镇人民政府  ·  行政职能系统',
      county:   '县人民政府  ·  行政职能系统',
      city:     '市人民政府  ·  行政职能系统',
      province: '省人民政府  ·  行政职能系统',
      national: '联邦内阁  ·  行政职能系统',
    },
  };
  return LABELS[system][level];
}

// ─── 各系统的主色 ─────────────────────────────────────────────
const SYSTEM_COLOR: Record<DeptSystem, string> = {
  party:   '#7A1B1E',
  politic: '#1a3a5c',
  gov:     '#1a4a2e',
};

const SYSTEM_TITLE: Record<DeptSystem, string> = {
  party:   '党委工作系统',
  politic: '政法综治系统',
  gov:     '政府职能系统',
};

const SYSTEM_ICON: Record<DeptSystem, string> = {
  party:   '🏛️',
  politic: '⚖️',
  gov:     '🏢',
};

// ─── 各部门深色卡片背景 ──────────────────────────────────────
const DEPT_BG: Record<DeptKey, string> = {
  organization:'#3a0a1a',
  propaganda:  '#2a0a2a',
  discipline:  '#1a0a0a',
  police:      '#0e2a42',
  petition:    '#1a1030',
  ndrc:        '#1a4a2e',
  finance:     '#3a2000',
  urban:       '#1a1040',
  education:   '#003040',
  health:      '#3a0010',
  ecology:     '#103010',
  market:      '#2a1a00',
  agriculture: '#1e2e00',
  personnel:   '#102030',
  invest:      '#28103a',
  tax:         '#201010',
  govoffice:   '#102020',
  industry:    '#1a2a10',
  naturalres:  '#0a2a1a',
  construction:'#2a1a0a',
  transport:   '#0a1a2a',
  health2:     '#2a0020',
};

type DeptReward = { subId: string; deptKey: DeptKey; isReward: boolean };

// ─── 下辖机构卡片组件 ──────────────────────────────────────────────
function SubInstitutionCard({ inst, accent }: { inst: SubInstitution; accent: string }) {
  return (
    <View style={{
      backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4,
      borderLeftWidth: 3, borderLeftColor: accent,
      padding: 12, marginBottom: 8,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={{ fontSize: 20 }}>{inst.icon}</Text>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#E8D5A0', fontSize: 13, fontWeight: '700' }}>{inst.name}</Text>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9 }}>编制 {inst.staffCount} 人</Text>
            </View>
          </View>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3, lineHeight: 15 }}>{inst.desc}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── 纪检政法路线专属视图 ────────────────────────────────────────────
function DisciplineLineView() {
  return (
    <View style={{ gap: 14 }}>
      {/* 路线说明 */}
      <View style={{ backgroundColor: '#1a0a2a', borderWidth: 1, borderColor: '#5a2a8a', borderRadius: 2, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Text style={{ fontSize: 22 }}>⚖️</Text>
          <View>
            <Text style={{ color: '#D0A0FF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>纪检政法路线</Text>
            <Text style={{ color: 'rgba(208,160,255,0.6)', fontSize: 10, marginTop: 1 }}>
              纪委监委系统 · 独立监督体系
            </Text>
          </View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 18 }}>
          纪检政法路线不归属于任何行政职能部门，独立行使党纪监督和监察权。下辖各派驻机构渗透全部职能部门，向同级党委负责，超然于各系统之上。
        </Text>
      </View>

      {/* 晋升职务序列 */}
      <View style={{ backgroundColor: '#0d1a2a', borderWidth: 1, borderColor: '#1E3050', borderRadius: 2, padding: 14 }}>
        <Text style={{ color: '#E8D5A0', fontSize: 12, fontWeight: '700', marginBottom: 10 }}>📋 路线晋升序列</Text>
        {DISCIPLINE_LINE_POSITIONS.map((pos, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            paddingVertical: 8,
            borderBottomWidth: i < DISCIPLINE_LINE_POSITIONS.length - 1 ? 1 : 0,
            borderBottomColor: 'rgba(255,255,255,0.08)',
          }}>
            <View style={{ width: 28, height: 28, backgroundColor: '#3a1a5a', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#D0A0FF', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#E8D5A0', fontSize: 12, fontWeight: '700' }}>{pos.title}</Text>
                <View style={{ backgroundColor: 'rgba(90,42,138,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                  <Text style={{ color: '#D0A0FF', fontSize: 9 }}>{pos.rank}</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>{pos.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 下辖机构 */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ width: 3, height: 14, backgroundColor: '#8a4aCA' }} />
          <Text style={{ color: '#D0A0FF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            下辖机构体系
          </Text>
          <View style={{ backgroundColor: 'rgba(138,74,202,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ color: '#D0A0FF', fontSize: 9 }}>{DISCIPLINE_LINE_INSTITUTIONS.length} 个机构</Text>
          </View>
        </View>
        {DISCIPLINE_LINE_INSTITUTIONS.map((inst, i) => (
          <SubInstitutionCard key={i} inst={inst} accent="#8a4aCA" />
        ))}
      </View>
    </View>
  );
}

// ─── 团派路线专属视图 ────────────────────────────────────────────────
function LeagueLineView() {
  return (
    <View style={{ gap: 14 }}>
      {/* 路线说明 */}
      <View style={{ backgroundColor: '#0a1a2a', borderWidth: 1, borderColor: '#1a5a8a', borderRadius: 2, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <Text style={{ fontSize: 22 }}>🏆</Text>
          <View>
            <Text style={{ color: '#80D0FF', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>共青团派路线</Text>
            <Text style={{ color: 'rgba(128,208,255,0.6)', fontSize: 10, marginTop: 1 }}>
              共青团系统 · 青年干部培养体系
            </Text>
          </View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 18 }}>
          团派路线依托共青团系统培养青年干部，晋升至一定级别后横向转任地方政府或党委岗位。具有年龄优势、群众基础广、跨系统流动能力强等特点。
        </Text>
      </View>

      {/* 晋升职务序列 */}
      <View style={{ backgroundColor: '#0d1a2a', borderWidth: 1, borderColor: '#1E3050', borderRadius: 2, padding: 14 }}>
        <Text style={{ color: '#E8D5A0', fontSize: 12, fontWeight: '700', marginBottom: 10 }}>📋 路线晋升序列</Text>
        {LEAGUE_LINE_POSITIONS.map((pos, i) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 10,
            paddingVertical: 8,
            borderBottomWidth: i < LEAGUE_LINE_POSITIONS.length - 1 ? 1 : 0,
            borderBottomColor: 'rgba(255,255,255,0.08)',
          }}>
            <View style={{ width: 28, height: 28, backgroundColor: '#0a3a5a', borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#80D0FF', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#E8D5A0', fontSize: 12, fontWeight: '700' }}>{pos.title}</Text>
                <View style={{ backgroundColor: 'rgba(26,90,138,0.5)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3 }}>
                  <Text style={{ color: '#80D0FF', fontSize: 9 }}>{pos.rank}</Text>
                </View>
              </View>
              <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>{pos.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 下辖机构 */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ width: 3, height: 14, backgroundColor: '#1a8aCA' }} />
          <Text style={{ color: '#80D0FF', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            所属团系机构
          </Text>
          <View style={{ backgroundColor: 'rgba(26,138,202,0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ color: '#80D0FF', fontSize: 9 }}>{LEAGUE_LINE_INSTITUTIONS.length} 个机构</Text>
          </View>
        </View>
        {LEAGUE_LINE_INSTITUTIONS.map((inst, i) => (
          <SubInstitutionCard key={i} inst={inst} accent="#1a8aCA" />
        ))}
      </View>
    </View>
  );
}

// ─── 部门路线下辖机构视图 ─────────────────────────────────────────────
function DeptInstitutionView({ deptKey, rankLevel }: { deptKey: DeptKey; rankLevel: number }) {
  const cfg = DEPT_CONFIG[deptKey];
  const deptName = getDeptNameByRank(deptKey, rankLevel);
  const sysColor = DEPT_BG[deptKey];
  const institutions = cfg.subInstitutions;

  return (
    <View style={{ gap: 14 }}>
      {/* 部门信息头 */}
      <View style={{ backgroundColor: sysColor, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 2, padding: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 28 }}>{cfg.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#E8D5A0', fontSize: 15, fontWeight: '700', letterSpacing: 0.5 }}>{deptName}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>{cfg.fullName}</Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 3 }}>
            <Text style={{ color: '#E8D5A0', fontSize: 10, fontWeight: '700' }}>部门正职</Text>
          </View>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, lineHeight: 18 }}>{cfg.desc}</Text>

        {/* 职能标签 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {cfg.functions.map((f, i) => (
            <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 3 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>{f}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 下辖机构列表 */}
      <View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <View style={{ width: 3, height: 14, backgroundColor: '#E8D5A0' }} />
          <Text style={{ color: '#E8D5A0', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
            下辖机构
          </Text>
          <View style={{ backgroundColor: 'rgba(232,213,160,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
            <Text style={{ color: '#E8D5A0', fontSize: 9 }}>{institutions.length} 个机构</Text>
          </View>
        </View>
        {institutions.map((inst, i) => (
          <SubInstitutionCard key={i} inst={inst} accent="#E8D5A0" />
        ))}
      </View>
    </View>
  );
}

export default function DepartmentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [chiefMap, setChiefMap] = useState<Partial<Record<DeptKey, Subordinate>>>({});
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [rewardModal, setRewardModal] = useState<DeptReward | null>(null);
  const [toastMsg, setToastMsg] = useState('');

  // 秘书能力（保留用于政策运动展示）
  const [secretary, setSecretary] = useState<Secretary | null>(null);
  // 国家政策
  const [activePolicy, setActivePolicy] = useState<NationalPolicy | null>(null);
  const [policyFeedback, setPolicyFeedback] = useState('');

  const loadData = useCallback(async () => {
    if (!save) return;
    const [subs, counts, sec, policy] = await Promise.all([
      getSubordinates(save.id),
      getDeptStaffCounts(save.id),
      getOrCreateSecretary(save.id, save.userId),
      getActiveNationalPolicy(save.id),
    ]);
    const map: Partial<Record<DeptKey, Subordinate>> = {};
    subs.filter(s => s.isAppointed && s.appointedDept && s.deptPosition === 'head')
      .forEach((s: Subordinate) => {
        if (s.appointedDept) map[s.appointedDept] = s;
      });
    setChiefMap(map);
    setStaffCounts(counts);
    setSecretary(sec);
    setActivePolicy(policy);
  }, [save]);

  useFocusEffect(useCallback(() => { void loadData(); }, [loadData]));

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleReward = async (pending: DeptReward) => {
    if (!pending.subId) return;
    await rewardDeptHead(pending.subId, pending.isReward);
    setRewardModal(null);
    showToast(pending.isReward ? '✅ 已发出表扬，局长忠诚度提升' : '⚠️ 已实施问责，局长需改进工作');
    await loadData();
  };

  // 响应国家政策运动
  const handleRespondPolicy = async () => {
    if (!save || !activePolicy) return;
    const { meritBonus } = await respondToPolicy(save.id, activePolicy.id, save.gameDays);
    if (meritBonus > 0) {
      setPolicyFeedback(`✅ 积极响应政策运动！获得政绩+${meritBonus}`);
      setActivePolicy({ ...activePolicy, responded: true });
    } else {
      setPolicyFeedback('已响应过本次政策运动');
    }
    setTimeout(() => setPolicyFeedback(''), 3000);
  };

  // ── 申请领导岗位扩编（每年只能点一次，+20人/每部门总编） ────────────
  const handleApplyExpand = async () => {
    if (!save) return;
    const gameYear = Math.floor(save.gameDays / 365);
    const bits = save.staffApplyBits ?? 0;
    const lastYear = save.lastStaffQuotaYear ?? 0;
    // 跨年则重置低4位
    const curBits = lastYear < gameYear ? (bits & ~0xF) : bits;
    if (curBits & STAFF_BIT_EXPAND) {
      showToast('⚠ 本年度已申请过领导岗位扩编，明年方可再次申请');
      return;
    }
    // 标记本年已申请（bit0=1），高位+1（累计扩编次数，每次+20编）
    const expandCount = (curBits >> 4) + 1;
    const newBits = (expandCount << 4) | (curBits & 0xF) | STAFF_BIT_EXPAND;
    const updated = await updateSave(save.id, {
      staffApplyBits: newBits,
      lastStaffQuotaYear: gameYear,
    });
    if (updated) {
      await updateGameSave({ staffApplyBits: newBits, lastStaffQuotaYear: gameYear });
      showToast(`✅ 扩编申请批准！总编制每部门+20（累计第${expandCount}次扩编）`);
    }
  };

  // ── 申请应急编制（立即生效90天，期间每部门额外+15人编制） ──────────
  const handleApplyEmergency = async () => {
    if (!save) return;
    const now = save.gameDays;
    if (save.emergencyStaffExpiry > 0 && now < save.emergencyStaffExpiry) {
      const remaining = save.emergencyStaffExpiry - now;
      showToast(`⚠ 当前应急编制仍在有效期，剩余 ${remaining} 天（到期后方可重新申请）`);
      return;
    }
    const expiry = now + EMERGENCY_STAFF_DAYS;
    const updated = await updateSave(save.id, { emergencyStaffExpiry: expiry });
    if (updated) {
      await updateGameSave({ emergencyStaffExpiry: expiry });
      showToast(`✅ 应急编制批准！每部门临时扩充${EMERGENCY_EXTRA_QUOTA}人，有效期${EMERGENCY_STAFF_DAYS}天`);
    }
  };

  if (!save) return null;

  const rankLevel = save.rankLevel;
  const gameYear = Math.floor(save.gameDays / 365);
  const bits = save.staffApplyBits ?? 0;
  const lastYear = save.lastStaffQuotaYear ?? 0;
  const curBits = lastYear < gameYear ? (bits & ~0xF) : bits;
  const expandCount = curBits >> 4; // 累计扩编次数
  const yearExpandUsed = !!(curBits & STAFF_BIT_EXPAND); // 本年已申请
  const baseQuota = getDeptStaffQuota(rankLevel);
  const permanentExtra = expandCount * 20;
  const now = save.gameDays;
  const emergencyActive = save.emergencyStaffExpiry > 0 && now < save.emergencyStaffExpiry;
  const emergencyRemaining = emergencyActive ? save.emergencyStaffExpiry - now : 0;
  const effectiveQuota = baseQuota + permanentExtra + (emergencyActive ? EMERGENCY_EXTRA_QUOTA : 0);

  const deptKeys = Object.keys(DEPT_CONFIG) as DeptKey[];
  const totalStaff = deptKeys.reduce((sum, k) => sum + (staffCounts[k] ?? 0), 0);
  const totalQuota = effectiveQuota * deptKeys.length;

  void secretary; // 保留用于后续扩展

  // ── 判断玩家路线类型，决定职能管理页展示内容 ──────────────────────────
  // 纪检政法路线 → 展示纪检专属视图
  // 团派路线    → 展示团派专属视图
  // 部门路线（有appointedDept或initialDeptKey）→ 展示所属部门下辖机构
  // 党政路线（默认）→ 展示全部三大系统
  const careerPath = save.careerPath ?? '';
  const isDisciplineLine = careerPath === 'discipline';
  const isLeagueLine = careerPath === 'league';
  const playerDeptKey: DeptKey | null = (save.initialDeptKey ?? null) as DeptKey | null;
  // 部门路线：有具体部门分配，且不属于党政主线
  const isDeptLine = !isDisciplineLine && !isLeagueLine
    && playerDeptKey !== null
    && careerPath !== 'party' && careerPath !== 'government';
  // 党政主线（传统路线）：展示全部部门
  const isPartyGovLine = !isDisciplineLine && !isLeagueLine && !isDeptLine;

  // 按系统分组（仅党政主线使用）
  const groups: Record<DeptSystem, DeptKey[]> = { party: [], politic: [], gov: [] };
  deptKeys.forEach(k => groups[DEPT_SYSTEM[k]].push(k));
  const systemOrder: DeptSystem[] = ['party', 'politic', 'gov'];

  // ── 顶栏副标题文字 ──────────────────────────────────────────────────
  const subTitle = isDisciplineLine ? '纪检政法路线 · 独立监督体系'
    : isLeagueLine ? '共青团派路线 · 青年干部体系'
    : isDeptLine && playerDeptKey ? `${getDeptNameByRank(playerDeptKey, rankLevel)} · 下辖机构`
    : `辖区职能架构 · ${deptKeys.length} 个部门`;

  return (
    <View style={{ flex: 1, backgroundColor: '#0D1B2A' }}>
      <StatusBar style="light" backgroundColor="#0D1B2A" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D1B2A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#1E3050' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#6688AA', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#5577AA', fontSize: 10, letterSpacing: 2 }}>政府职能架构</Text>
          <Text style={{ color: '#E8D5A0', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>职能管理</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#5577AA', fontSize: 10 }}>{save.rankName}</Text>
          <Text style={{ color: '#C8E0F4', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
        </View>
      </View>

      {/* 当前所属行政层级说明 */}
      <View style={{ backgroundColor: '#111E30', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E3050' }}>
        <Text style={{ fontSize: 11, color: '#7799BB', lineHeight: 17 }}>
          {subTitle}
        </Text>
      </View>

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 14, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >

            {/* ═══ 纪检政法路线专属视图 ═══ */}
            {isDisciplineLine && <DisciplineLineView />}

            {/* ═══ 团派路线专属视图 ═══ */}
            {isLeagueLine && <LeagueLineView />}

            {/* ═══ 部门路线：展示本部门下辖机构 ═══ */}
            {isDeptLine && playerDeptKey && (
              <DeptInstitutionView deptKey={playerDeptKey} rankLevel={rankLevel} />
            )}

            {/* ═══ 党政主线：展示全部职能系统+编制管理 ═══ */}
            {isPartyGovLine && (<>
            {/* ── 编制管理摘要卡 ── */}
            <View style={{ backgroundColor: '#0a1e35', borderWidth: 1, borderColor: '#1E3050', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 16 }}>📊</Text>
                <Text style={{ color: '#E8D5A0', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>编制管理</Text>
                {expandCount > 0 && (
                  <View style={{ backgroundColor: '#2a5a3e', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: '#7aCC9a', fontSize: 9 }}>已扩编×{expandCount}</Text>
                  </View>
                )}
              </View>

              {/* 编制数据行 */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10 }}>
                  <Text style={{ color: '#5577AA', fontSize: 9, marginBottom: 3 }}>基础编制（每部门）</Text>
                  <Text style={{ color: '#E8D5A0', fontSize: 15, fontWeight: '700' }}>{baseQuota}</Text>
                  {permanentExtra > 0 && <Text style={{ color: '#7aCC9a', fontSize: 9, marginTop: 2 }}>+{permanentExtra} 扩编增量</Text>}
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10 }}>
                  <Text style={{ color: '#5577AA', fontSize: 9, marginBottom: 3 }}>有效总编（全辖区）</Text>
                  <Text style={{ color: '#E8D5A0', fontSize: 15, fontWeight: '700' }}>{totalQuota}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>每部门上限 {effectiveQuota} 人</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10 }}>
                  <Text style={{ color: '#5577AA', fontSize: 9, marginBottom: 3 }}>当前在编</Text>
                  <Text style={{
                    color: totalStaff > totalQuota ? '#FF8844' : '#E8D5A0',
                    fontSize: 15, fontWeight: '700',
                  }}>{totalStaff}</Text>
                  <Text style={{ color: totalStaff > totalQuota ? '#FF8844' : 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
                    {totalStaff > totalQuota ? '⚠ 超编' : `余 ${totalQuota - totalStaff} 人`}
                  </Text>
                </View>
              </View>

              {/* 应急编制状态条 */}
              {emergencyActive && (
                <View style={{ backgroundColor: '#1a3a10', borderWidth: 1, borderColor: '#3a8a2a', padding: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 14 }}>🚨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#7aCC9a', fontSize: 11, fontWeight: '700' }}>应急编制生效中</Text>
                    <Text style={{ color: 'rgba(122,204,154,0.7)', fontSize: 9, marginTop: 2 }}>
                      每部门+{EMERGENCY_EXTRA_QUOTA}人 · 剩余{emergencyRemaining}天到期
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#3a8a2a', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 9 }}>临时扩编</Text>
                  </View>
                </View>
              )}

              {/* 申请按钮组 */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {/* 申请领导岗位扩编 */}
                <Pressable
                  onPress={() => { void handleApplyExpand(); }}
                  style={{
                    flex: 1, paddingVertical: 9, alignItems: 'center',
                    backgroundColor: yearExpandUsed ? '#0d2a1a' : '#1a4a2e',
                    borderWidth: 1,
                    borderColor: yearExpandUsed ? '#1a4a2e' : '#3aAA5a',
                    opacity: yearExpandUsed ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: yearExpandUsed ? '#5a8a6a' : '#7aCC9a', fontSize: 11, fontWeight: '700' }}>
                    {yearExpandUsed ? '✓ 本年已扩编' : '📋 申请扩编'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
                    {yearExpandUsed ? '明年可再次申请' : '每年1次 · 每部门+20人'}
                  </Text>
                </Pressable>

                {/* 申请应急编制 */}
                <Pressable
                  onPress={() => { void handleApplyEmergency(); }}
                  style={{
                    flex: 1, paddingVertical: 9, alignItems: 'center',
                    backgroundColor: emergencyActive ? '#0d1e30' : '#2a1000',
                    borderWidth: 1,
                    borderColor: emergencyActive ? '#1a3a50' : '#AA4400',
                    opacity: emergencyActive ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: emergencyActive ? '#5a8aAA' : '#FFB060', fontSize: 11, fontWeight: '700' }}>
                    {emergencyActive ? '🚨 应急编制中' : '🚨 申请应急编制'}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, marginTop: 2 }}>
                    {emergencyActive ? `剩余${emergencyRemaining}天` : `每部门+${EMERGENCY_EXTRA_QUOTA}人·有效${EMERGENCY_STAFF_DAYS}天`}
                  </Text>
                </Pressable>
              </View>

              {/* 晋升说明 */}
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, marginTop: 8, textAlign: 'center' }}>
                玩家晋升后系统自动为辖区分配正职1名、副职2名
              </Text>
            </View>

            {/* ── 国家重大政策运动横幅 ── */}
            {activePolicy && (
              <View style={{
                backgroundColor: activePolicy.responded ? '#0a2010' : '#2a1000',
                borderWidth: 1, borderColor: activePolicy.responded ? '#1a5a2a' : '#AA4400',
                padding: 14, borderRadius: 2,
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 20 }}>🚩</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#FFD580', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 }}>
                      国家重大政策运动
                    </Text>
                    <Text style={{ color: '#FF8844', fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                      {activePolicy.policyName}
                    </Text>
                  </View>
                  {activePolicy.responded ? (
                    <View style={{ backgroundColor: '#1a5a2a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                      <Text style={{ color: '#5aCC7a', fontSize: 10, fontWeight: '700' }}>已响应</Text>
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#AA4400', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                      <Text style={{ color: '#FFD580', fontSize: 10, fontWeight: '700' }}>待响应</Text>
                    </View>
                  )}
                </View>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, lineHeight: 17, marginBottom: 10 }}>
                  持续时长：{activePolicy.durationDays} 天{' '}
                  （已进行 {save.gameDays - activePolicy.startGameDay} 天）
                </Text>
                {!activePolicy.responded && (
                  <Pressable
                    onPress={() => { void handleRespondPolicy(); }}
                    style={{
                      backgroundColor: '#AA4400', paddingVertical: 10, alignItems: 'center',
                      flexDirection: 'row', justifyContent: 'center', gap: 8,
                    }}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text style={{ color: '#FFD580', fontWeight: '700', fontSize: 13, letterSpacing: 0.5 }}>
                      📣 积极响应政策运动（获政绩奖励）
                    </Text>
                  </Pressable>
                )}
                {policyFeedback !== '' && (
                  <Text style={{ color: '#5aCC7a', fontSize: 11, textAlign: 'center', marginTop: 6 }}>{policyFeedback}</Text>
                )}
              </View>
            )}

            {/* ── 三大职能系统分组展示 ── */}
            {systemOrder.map(system => {
              const keys = groups[system];
              const sysColor = SYSTEM_COLOR[system];
              const sysLabel = getSystemLabel(system, rankLevel);
              return (
                <View key={system}>
                  {/* 系统分组标题栏 */}
                  <View style={{
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    backgroundColor: sysColor + 'CC',
                    paddingHorizontal: 14, paddingVertical: 10,
                    borderRadius: 2, marginBottom: 6,
                    borderLeftWidth: 3, borderLeftColor: '#E8D5A0',
                  }}>
                    <Text style={{ fontSize: 18 }}>{SYSTEM_ICON[system]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#E8D5A0', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 }}>
                        {SYSTEM_TITLE[system]}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 1 }}>
                        {sysLabel}
                      </Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: '#E8D5A0', fontSize: 10, fontWeight: '700' }}>{keys.length} 个部门</Text>
                    </View>
                  </View>

                  {/* 各部门卡片 */}
                  <View style={{ gap: 6 }}>
                    {keys.map((key) => {
                      const cfg = DEPT_CONFIG[key];
                      const chief = chiefMap[key] ?? null;
                      const count = staffCounts[key] ?? 0;
                      const bgColor = DEPT_BG[key];
                      const deptDisplayName = getDeptNameByRank(key, rankLevel);
                      const headTitle = getDeptHeadTitle(key, rankLevel);
                      return (
                        <Pressable
                          key={key}
                          onPress={() => router.push({ pathname: '/(app)/dept-detail', params: { type: key } })}
                          onLongPress={() => {
                            if (chief) setRewardModal({ subId: chief.id, deptKey: key, isReward: true });
                          }}
                          style={{ backgroundColor: bgColor, padding: 14, borderRadius: 2, borderLeftWidth: 2, borderLeftColor: sysColor }}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                              <Text style={{ fontSize: 26 }}>{cfg.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ color: '#E8D5A0', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 }}>
                                  {deptDisplayName}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, marginTop: 2 }}>
                                  {cfg.desc.slice(0, 24)}…
                                </Text>
                              </View>
                            </View>
                            <View style={{ alignItems: 'flex-end', minWidth: 80 }}>
                              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, letterSpacing: 0.3 }}>
                                {headTitle}
                              </Text>
                              {chief ? (
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 2 }}>
                                  在任：{chief.name}
                                </Text>
                              ) : (
                                <Text style={{ color: 'rgba(255,120,100,0.9)', fontSize: 10, marginTop: 2 }}>
                                  暂无一把手
                                </Text>
                              )}
                            </View>
                          </View>

                          {/* 编制 + 职能标签 */}
                          <View style={{
                            marginTop: 10, paddingTop: 8,
                            borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
                            flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5,
                          }}>
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                              <Text style={{ color: '#E8D5A0', fontSize: 9 }}>👥 {count}/{effectiveQuota} 人</Text>
                            </View>
                            {cfg.functions.map((f, i) => (
                              <View key={i} style={{ backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{f}</Text>
                              </View>
                            ))}
                          </View>

                          <View style={{ position: 'absolute', right: 10, top: 16 }}>
                            <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 14 }}>›</Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}

            <View style={{ height: 20 }} />
            </>)}

            {/* 非党政路线底部间距 */}
            {(isDisciplineLine || isLeagueLine || isDeptLine) && <View style={{ height: 20 }} />}
          </ScrollView>

      {/* Toast */}
      {toastMsg !== '' && (
        <View style={{ position: 'absolute', bottom: 48, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 6, maxWidth: '85%' }}>
          <Text style={{ color: '#fff', fontSize: 12, textAlign: 'center' }}>{toastMsg}</Text>
        </View>
      )}

      {/* 表扬/问责弹窗 */}
      {rewardModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', margin: 32, padding: 24, borderRadius: 4, width: 300 }}>
            <Text style={{ fontSize: 11, color: '#5577AA', letterSpacing: 2, marginBottom: 4 }}>
              干部考核
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#E8D5A0', marginBottom: 8 }}>
              {getDeptNameByRank(rewardModal.deptKey, rankLevel)}
            </Text>
            <Text style={{ fontSize: 11, color: '#7799BB', marginBottom: 20, lineHeight: 18 }}>
              对当前一把手进行表扬或问责，将影响其忠诚度与工作效率。
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => { void handleReward({ ...rewardModal, isReward: true }); }}
                style={{ flex: 1, backgroundColor: '#1a4a2e', paddingVertical: 10, alignItems: 'center', borderRadius: 2 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>表扬</Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>忠诚+8 能力+2</Text>
              </Pressable>
              <Pressable
                onPress={() => { void handleReward({ ...rewardModal, isReward: false }); }}
                style={{ flex: 1, backgroundColor: '#7a1a1a', paddingVertical: 10, alignItems: 'center', borderRadius: 2 }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>问责</Text>
                <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, marginTop: 2 }}>忠诚-8 能力-2</Text>
              </Pressable>
            </View>
            <Pressable onPress={() => setRewardModal(null)} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: '#5577AA', fontSize: 12 }}>取消</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}