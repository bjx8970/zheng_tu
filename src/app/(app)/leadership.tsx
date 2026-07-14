// 领导班子综合管理 — NPC班子/人事任命/仕途档案/城市指标/政策运动
import { useCallback, useState, useMemo } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getLeadershipBand, assignLeadershipRole, removeLeadershipRole, getSubordinatesByRank,
  getNpcBand, initLeadershipBand,
  getActiveNationalPolicy, respondToPolicy,
  getCityMetrics, getPlayerCareerHistory, getPlayerHealth,
} from '@/db/gameApi';
import {
  getSubAvatarEmoji, LEADERSHIP_ROLES, RANK_CONFIG, FACTION_LABEL, FACTION_COLOR,
  getAppointmentApprovalLevel, SUB_LEVEL_NAMES, RETIREMENT_AGE_MAP, MALE_AVATARS, FEMALE_AVATARS,
  getAvatarImageUrl,
} from '@/types/game';
import type {
  LeadershipMember, Subordinate, ApprovalLevel,
  LeadershipBand, NationalPolicy, CityMetrics, PlayerHealth,
} from '@/types/game';
import { DemocraticReview } from '@/components/DemocraticReview';
import { getRankTheme } from '@/lib/rankTheme';

type MainTab = 'npc' | 'appoint' | 'career' | 'city' | 'policy' | 'reform';
type BandGroupTab = 'party' | 'gov' | 'nda';

const FACTION_ICONS: Record<string, string> = { reform: '🔵', pragmatic: '🟠', neutral: '⚪' };

// ─── 代会/联邦国会/国策协理堂/政府 窗口期判断 ──────────────────────────────────────
// 游戏开始日 2020-01-01 = gameDays 0
// 【党代会】约每5年一次（开幕前90天～闭幕后30天）
const PARTY_CONGRESS_DAYS: Record<number, number[]> = {
  3: [606, 606+1825, 606+3650], 4: [606, 606+1825, 606+3650],
  5: [606, 606+1825, 606+3650], 6: [606, 606+1825, 606+3650],
  7: [640, 640+1825, 640+3650], 8: [640, 640+1825, 640+3650], 9: [640, 640+1825, 640+3650],
  10: [882, 882+1825, 882+3650], 11: [882, 882+1825, 882+3650],
  12: [1004, 1004+1825, 1004+3650], 13: [1004, 1004+1825, 1004+3650],
  14: [1004, 1004+1825, 1004+3650], 15: [1004, 1004+1825, 1004+3650],
};
// 【联邦国会/国策协理堂/政府】每年召开一次（两会，1-3月）；窗口：开幕前30天～闭幕后20天
// 县级联邦国会：2021-11开始，每年11月；市级：2022-01；省级/国家级：2023-01/03
// 为覆盖多年，展开前10届
function buildAnnualSessions(firstDay: number, count = 10): number[] {
  return Array.from({ length: count }, (_, i) => firstDay + i * 365);
}
const NPC_SESSION_DAYS: Record<number, number[]> = {
  // 县级联邦国会（rank 4-6）：2021-11 ≈ day 700
  4: buildAnnualSessions(700), 5: buildAnnualSessions(700), 6: buildAnnualSessions(700),
  // 市级联邦国会（rank 7-9）：2022-01 ≈ day 730
  7: buildAnnualSessions(730), 8: buildAnnualSessions(730), 9: buildAnnualSessions(730),
  // 省级联邦国会（rank 10-11）：2023-01 ≈ day 1095
  10: buildAnnualSessions(1095), 11: buildAnnualSessions(1095),
  // 联邦国会（rank 12+）：2023-03 ≈ day 1156
  12: buildAnnualSessions(1156), 13: buildAnnualSessions(1156),
  14: buildAnnualSessions(1156), 15: buildAnnualSessions(1156),
};
// 国策协理堂与联邦国会同期（提前5天）
const CPPCC_SESSION_DAYS: Record<number, number[]> = Object.fromEntries(
  Object.entries(NPC_SESSION_DAYS).map(([k, v]) => [k, v.map(d => d - 5)])
);

type OrganCategory = 'party' | 'npc' | 'cppcc' | 'gov_senior' | 'gov_deputy' | 'free';

/** 判断职位所属机构类别 */
function getOrganCategory(organ: string, roleKey: string): OrganCategory {
  if (organ.includes('党委') || organ.includes('县委') || organ === '省执政委' || organ === '市委'
    || organ.includes('纪委') || organ.includes('镇党委')) return 'party';
  if (organ.includes('联邦国会')) return 'npc';
  if (organ.includes('国策协理堂')) return 'cppcc';
  // 政府正职（县长/市长/省长/联邦内阁总理等）须经联邦国会选举，限制最严
  if ((organ.includes('政府') || organ.includes('乡镇') || organ.includes('联邦内阁') || organ.includes('区（县）'))
    && (roleKey.includes('_head') || roleKey.includes('_mayor') || roleKey.includes('_governor')
      || roleKey.includes('_premier') || roleKey.includes('county_gov') || roleKey.includes('city_mayor')
      || roleKey.includes('prov_governor') || roleKey.includes('exec_deputy'))) return 'gov_senior';
  // 政府副职（副县长/副市长/副省长等）可由联邦国会常委会审议，限制较轻
  if (organ.includes('政府') || organ.includes('乡镇') || organ.includes('联邦内阁')
    || organ.includes('区（县）')) return 'gov_deputy';
  return 'free'; // 完全自由任命（如职能局、政法等）
}

/** 是否在对应窗口期内 */
function isInSessionWindow(category: OrganCategory, rankLevel: number, gameDays: number): boolean {
  if (category === 'free') return true;
  if (category === 'party') {
    const opens = PARTY_CONGRESS_DAYS[rankLevel] ?? PARTY_CONGRESS_DAYS[4]!;
    return opens.some(d => gameDays >= d - 90 && gameDays <= d + 37);
  }
  if (category === 'npc' || category === 'gov_senior' || category === 'gov_deputy') {
    const opens = NPC_SESSION_DAYS[rankLevel] ?? NPC_SESSION_DAYS[4]!;
    return opens.some(d => gameDays >= d - 30 && gameDays <= d + 20);
  }
  if (category === 'cppcc') {
    const opens = CPPCC_SESSION_DAYS[rankLevel] ?? CPPCC_SESSION_DAYS[4]!;
    return opens.some(d => gameDays >= d - 30 && gameDays <= d + 20);
  }
  return false;
}

/** 距下次会议窗口期还有多少天 */
function daysToNextSession(category: OrganCategory, rankLevel: number, gameDays: number): number {
  let days: number[];
  if (category === 'party') {
    days = PARTY_CONGRESS_DAYS[rankLevel] ?? PARTY_CONGRESS_DAYS[4]!;
    for (const d of days) { if (gameDays < d - 90) return (d - 90) - gameDays; }
  } else if (category === 'npc' || category === 'gov_senior' || category === 'gov_deputy') {
    days = NPC_SESSION_DAYS[rankLevel] ?? NPC_SESSION_DAYS[4]!;
    for (const d of days) { if (gameDays < d - 30) return (d - 30) - gameDays; }
  } else if (category === 'cppcc') {
    days = CPPCC_SESSION_DAYS[rankLevel] ?? CPPCC_SESSION_DAYS[4]!;
    for (const d of days) { if (gameDays < d - 30) return (d - 30) - gameDays; }
  }
  return 9999;
}

/** 补缺代价配置 */
const VACANCY_PENALTY: Record<OrganCategory, { merit: number; favor: number; label: string; sessionName: string; color: string }> = {
  party:      { merit: 15, favor: 5, label: '党代会选举', sessionName: '党代会换届期', color: '#CC4444' },
  npc:        { merit: 10, favor: 3, label: '联邦国会会议选举', sessionName: '联邦国会会议期', color: '#4477CC' },
  cppcc:      { merit: 8,  favor: 2, label: '国策协理堂会议通过', sessionName: '国策协理堂会议期', color: '#44AA77' },
  gov_senior: { merit: 15, favor: 5, label: '联邦国会选举任命', sessionName: '联邦国会会议期', color: '#CC6622' },
  gov_deputy: { merit: 8,  favor: 2, label: '联邦国会常委会审议', sessionName: '联邦国会常委会审议', color: '#CC8833' },
  free:       { merit: 0,  favor: 0, label: '本级决定', sessionName: '', color: '#888' },
};

// ─── 向后兼容：party organ 判断（供 UI 渲染徽章用）──────────────────────────
function isPartyOrgan(organ: string): boolean {
  return getOrganCategory(organ, '') === 'party';
}
function isPartyCongressWindow(rankLevel: number, gameDays: number): boolean {
  return isInSessionWindow('party', rankLevel, gameDays);
}
function daysToNextCongress(rankLevel: number, gameDays: number): number {
  return daysToNextSession('party', rankLevel, gameDays);
}

/** 年龄接近退休时显示警告色 */
function ageColor(age: number, rankLevel: number): string {
  const retireAge = RETIREMENT_AGE_MAP[rankLevel] ?? 60;
  if (age >= retireAge) return '#C82829';
  if (age >= retireAge - 2) return '#E67E22';
  return '#5577AA';
}

/** 计算班子综合能力加成 */
function calcBandBonus(band: LeadershipMember[], subs: Subordinate[]) {
  if (band.length === 0) return { avgAbility: 0, avgLoyalty: 0 };
  let abilitySum = 0, loyaltySum = 0;
  for (const m of band) {
    const sub = subs.find(s => s.id === m.subId);
    if (sub) { abilitySum += sub.ability; loyaltySum += sub.loyalty; }
  }
  return {
    avgAbility: Math.max(0, Math.round(abilitySum / band.length)),
    avgLoyalty: Math.max(0, Math.round(loyaltySum / band.length)),
  };
}

// ─── organ → 系统颜色与图标 ───────────────────────────────────
type OrganSystem = { color: string; icon: string; label: string };
function getOrganSystem(organ: string): OrganSystem {
  if (organ === '联邦国会' || organ === '联邦国会') return { color: '#1a3a2a', icon: '📜', label: '联邦国会' };
  if (organ === '国策协理堂' || organ === '中国人民政治协商会议') return { color: '#2a3a1a', icon: '🤝', label: '国策协理堂' };
  if (organ === '枢武府' || organ === '枢武府') return { color: '#1a2840', icon: '🎖️', label: '枢武府' };
  if (organ.includes('党委') || organ === '省执政委' || organ === '省执政委系统') return { color: '#7A1B1E', icon: '🏛️', label: organ };
  if (organ.includes('纪委')) return { color: '#4a1a4a', icon: '⚖️', label: organ };
  if (organ.includes('政法') || organ.includes('司法')) return { color: '#1a2a4a', icon: '🔏', label: organ };
  if (organ.includes('联邦国会')) return { color: '#1a3a2a', icon: '📜', label: organ };
  if (organ.includes('国策协理堂')) return { color: '#2a3a1a', icon: '🤝', label: organ };
  if (organ.includes('联邦内阁')) return { color: '#2a1a00', icon: '🇨🇳', label: organ };
  if (organ.includes('政府') || organ.includes('省政府')) return { color: '#1a3a4a', icon: '🏢', label: organ };
  if (organ.includes('乡') || organ.includes('村') || organ.includes('社区')) return { color: '#1a3a1a', icon: '🏘️', label: organ };
  return { color: '#1e2a3a', icon: '🏗️', label: organ };
}

/** NPC个人档案弹窗 */
function CareerModal({ member, onClose, rankLevel, playerBirthProvince, playerBirthCity, playerUniversity, saveCityName }: {
  member: LeadershipBand;
  onClose: () => void;
  rankLevel: number;
  playerBirthProvince?: string;
  playerBirthCity?: string;
  playerUniversity?: string;
  saveCityName?: string;
}) {
  const retireAge = RETIREMENT_AGE_MAP[rankLevel] ?? 60;
  const birthYear = member.age > 0 ? 2025 - member.age : 0;
  const theme = getRankTheme(rankLevel);

  // 同乡/同省/同校提示
  const sameCity = !!playerBirthCity && !!member.birthCity && playerBirthCity === member.birthCity;
  const sameProv = !sameCity && !!playerBirthProvince && !!member.birthProvince && playerBirthProvince === member.birthProvince;
  // 大学匹配（universityName格式为"xx大学（硕士）"，取括号前部分比对）
  const memberUniBase = member.universityName.split('（')[0];
  const playerUniBase = (playerUniversity ?? '').split('（')[0];
  const sameUni = !!playerUniBase && !!memberUniBase && playerUniBase === memberUniBase;

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: theme.cardBg, maxHeight: '80%' }}>
        <View style={{ backgroundColor: theme.headerBg, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 1.5 }}>个人档案</Text>
            <Text style={{ color: theme.headerText, fontSize: 15, fontWeight: '700', marginTop: 2 }}>{member.name} · {member.positionLabel}</Text>
          </View>
          <Pressable onPress={onClose} style={{ padding: 4 }}><Text style={{ color: theme.headerSub, fontSize: 22 }}>×</Text></Pressable>
        </View>

        {/* 标签行 */}
        <View style={{ flexDirection: 'row', gap: 6, padding: 10, backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, flexWrap: 'wrap' }}>
          <View style={{ backgroundColor: theme.accentBg, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: theme.cardBorder }}>
            <Text style={{ fontSize: 11, color: theme.valueText }}>年龄 {member.age} 岁</Text>
          </View>
          <View style={{ backgroundColor: '#FFF8EE', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#F5B041' }}>
            <Text style={{ fontSize: 11, color: '#875A12' }}>距退休 {Math.max(0, retireAge - member.age)} 年</Text>
          </View>
          <View style={{ backgroundColor: FACTION_COLOR[member.faction] + '22', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: FACTION_COLOR[member.faction] }}>
            <Text style={{ fontSize: 11, color: FACTION_COLOR[member.faction] }}>{FACTION_ICONS[member.faction]} {FACTION_LABEL[member.faction]}</Text>
          </View>
          <View style={{ backgroundColor: '#F0F8F0', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#7BAD7E' }}>
            <Text style={{ fontSize: 11, color: '#2a5a3e' }}>能力 {member.ability} · 廉洁 {member.integrity}</Text>
          </View>
          {sameCity && <View style={{ backgroundColor: '#FFF0E0', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#E8A040' }}>
            <Text style={{ fontSize: 11, color: '#C07020' }}>🏡 同乡 +12好感</Text>
          </View>}
          {sameProv && <View style={{ backgroundColor: '#FFF8EE', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D0B060' }}>
            <Text style={{ fontSize: 11, color: '#996620' }}>🗺 同省 +7好感</Text>
          </View>}
          {sameUni && <View style={{ backgroundColor: '#F0F0FF', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#8888CC' }}>
            <Text style={{ fontSize: 11, color: '#4444AA' }}>🎓 校友 +10好感</Text>
          </View>}
        </View>

        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 基本信息 */}
          <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 10, gap: 5 }}>
            <Text style={{ fontSize: 11, color: theme.mutedText, fontWeight: '700', marginBottom: 2 }}>基本信息</Text>
            {birthYear > 0 && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>出生年份</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>{birthYear} 年</Text>
              </View>
            )}
            {(member.birthProvince || member.birthCity) && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>籍贯</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>
                  {member.birthProvince}{member.birthCity}
                </Text>
              </View>
            )}
            {member.universityName && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>学历</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>{member.universityName}</Text>
              </View>
            )}
            {member.graduationYear > 0 && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, width: 56 }}>毕业年份</Text>
                <Text style={{ fontSize: 11, color: theme.labelText, flex: 1 }}>{member.graduationYear} 年</Text>
              </View>
            )}
          </View>

          {/* 仕途历程 */}
          <Text style={{ fontSize: 11, color: theme.mutedText, fontWeight: '700' }}>仕途历程</Text>
          {member.careerHistory.length === 0 ? (
            <Text style={{ color: theme.mutedText, fontSize: 12, textAlign: 'center', marginTop: 10 }}>暂无历史档案记录</Text>
          ) : (
            member.careerHistory.map((entry, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ width: 32, alignItems: 'center' }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.headerBg, marginTop: 4 }} />
                  {i < member.careerHistory.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: theme.cardBorder, marginTop: 2 }} />}
                </View>
                <View style={{ flex: 1, paddingBottom: 12 }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>{entry.yearStart} — {entry.yearEnd ?? '至今'}</Text>
                  <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '600' }}>{entry.city}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText }}>{entry.position}</Text>
                </View>
              </View>
            ))
          )}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ width: 32, alignItems: 'center' }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: theme.primary }}>
                {member.careerHistory.length > 0
                  ? `${member.careerHistory[member.careerHistory.length - 1]?.yearEnd ?? 2025} — 至今（现职）`
                  : '2025 — 至今（现职）'}
              </Text>
              {saveCityName ? (
                <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 1 }}>{saveCityName}</Text>
              ) : null}
              <Text style={{ fontSize: 13, color: theme.primary, fontWeight: '700' }}>{member.positionLabel}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

export default function LeadershipScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<MainTab>('npc');
  const [bandGroupTab, setBandGroupTab] = useState<BandGroupTab>('party');

  // ── 人事任命状态 ──
  const [band, setBand] = useState<LeadershipMember[]>([]);
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [selectingRole, setSelectingRole] = useState<{ key: string; label: string; requiredSubLevel: number; organ: string } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [search, setSearch] = useState('');
  const [reviewState, setReviewState] = useState<{
    sub: Subordinate;
    role: { key: string; label: string; requiredSubLevel: number; organ: string };
    approvalLevel: ApprovalLevel;
  } | null>(null);
  // 代会补缺确认弹窗
  const [congressAlert, setCongressAlert] = useState<{
    sub: Subordinate;
    role: { key: string; label: string; requiredSubLevel: number; organ: string };
    daysLeft: number;
    category: OrganCategory;
  } | null>(null);

  // ── NPC班子 / 档案 / 指标 / 政策状态 ──
  const [npcMembers, setNpcMembers] = useState<LeadershipBand[]>([]);
  const [playerCareer, setPlayerCareer] = useState<{ position: string; city: string; rankLevel: number; startYear: number | null; endYear: number | null }[]>([]);
  const [cityMetrics, setCityMetrics] = useState<CityMetrics | null>(null);
  const [activePolicy, setActivePolicy] = useState<NationalPolicy | null>(null);
  const [playerHealth, setPlayerHealth] = useState<PlayerHealth | null>(null);
  const [selectedMember, setSelectedMember] = useState<LeadershipBand | null>(null);
  const [policyFeedback, setPolicyFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [initializingBand, setInitializingBand] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      Promise.all([
        getLeadershipBand(save.id),
        getSubordinatesByRank(save.id, save.rankLevel),
        getNpcBand(save.id),
        getPlayerCareerHistory(save.id),
        getCityMetrics(save.id),
        getActiveNationalPolicy(save.id),
        getPlayerHealth(save.id),
      ]).then(async ([b, s, npc, career, metrics, policy, health]) => {
        setBand(b);
        setSubs(s);
        setPlayerCareer(career);
        setCityMetrics(metrics);
        setActivePolicy(policy);
        setPlayerHealth(health);
        // 自动初始化：首次进入且NPC班子为空时自动生成
        if (npc.length === 0) {
          setInitializingBand(true);
          await initLeadershipBand(save.id, save.rankLevel, save.playerName, save.rankName,
            { province: save.birthProvince, city: save.birthCity, universityName: save.universityName ?? '' },
            save.cityName);
          const fresh = await getNpcBand(save.id);
          setNpcMembers(fresh);
          setInitializingBand(false);
        } else {
          setNpcMembers(npc);
        }
        setLoading(false);
      });
    }, [save])
  );

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 2500);
  };

  // ── 书记判定（有干部任命权，其他职务仅有提名权） ──
  const isPartySecretary = !!(save?.rankName?.includes('书记') && !save?.rankName?.includes('副书记'));

  // ── 人事任命逻辑 ──
  const handleAssign = async (sub: Subordinate) => {
    if (!save || !selectingRole) return;
    const required = selectingRole.requiredSubLevel ?? 1;
    if (sub.subLevel < required) {
      const reqName = SUB_LEVEL_NAMES[required] ?? `${required}级`;
      const subName = SUB_LEVEL_NAMES[sub.subLevel] ?? `${sub.subLevel}级`;
      showFeedback(`❌ ${sub.name}（${subName}）不符合任职要求：${selectingRole.label} 需要 ${reqName} 及以上`);
      return;
    }

    // ── 所有非"本级自由"职位：须在对应会议窗口期内换届；窗口外触发补缺确认 ──
    const category = getOrganCategory(selectingRole.organ, selectingRole.key);
    if (category !== 'free' && !isInSessionWindow(category, save.rankLevel, save.gameDays)) {
      const days = daysToNextSession(category, save.rankLevel, save.gameDays);
      setCongressAlert({ sub, role: selectingRole, daysLeft: days, category });
      setSelectingRole(null);
      setSearch('');
      return;
    }

    const approvalLevel = getAppointmentApprovalLevel(save.rankLevel, selectingRole.key);

    // 书记有干部任命权 → 直接任命（进入组织考察）
    if (isPartySecretary) {
      await doAssign(sub, selectingRole, true);
      setSelectingRole(null);
      setSearch('');
      return;
    }

    // 非书记仅有提名权 → 必须走民主评议提名流程
    if (approvalLevel !== '本级决定') {
      setReviewState({ sub, role: selectingRole, approvalLevel });
      setSelectingRole(null);
      setSearch('');
      return;
    }
    await doAssign(sub, selectingRole, false);
  };

  const doAssign = async (sub: Subordinate, role: { key: string; label: string }, underInspection = false) => {
    if (!save) return;
    const ok = await assignLeadershipRole(
      save.id, save.userId, sub.id,
      role.key, role.label,
      sub.name, sub.avatarId ?? 0, sub.gender ?? '男',
      save.gameDays,
    );
    if (ok) {
      const updated = await getLeadershipBand(save.id);
      setBand(updated);
      if (underInspection) {
        showFeedback(`✅ 已任命 ${sub.name} 为 ${role.label}（书记直接任命，进入30天组织考察期）`);
      } else {
        showFeedback(`已任命 ${sub.name} 为 ${role.label}`);
      }
    }
  };

  /** 补缺任命：上级主导，玩家主动推动需按机构类型付代价 */
  const handleCongressAlertConfirm = async () => {
    if (!congressAlert || !save) return;
    const { sub, role, category } = congressAlert;
    const penalty = VACANCY_PENALTY[category];
    const newMerit = Math.max(0, (save.meritPoints ?? 0) - penalty.merit);
    const newFavor = Math.max(0, save.bossFavor - penalty.favor);
    if (penalty.merit > 0 || penalty.favor > 0) {
      await updateGameSave({ meritPoints: newMerit, bossFavor: newFavor });
    }
    await doAssign(sub, role);
    setCongressAlert(null);
    const costTip = penalty.merit > 0 ? `政绩-${penalty.merit}，上司好感-${penalty.favor}` : '无代价';
    showFeedback(`⚠️ 补缺任命完成：${role.label} → ${sub.name}（${costTip}）`);
  };

  const handleReviewConfirm = async () => {
    if (!reviewState || !save) return;
    const { sub, role, approvalLevel } = reviewState;
    // 提名通过（非书记路径），同样进入组织考察
    await doAssign(sub, role, true);
    setReviewState(null);
    showFeedback(`✅ ${role.label} 提名已通过${approvalLevel !== '本级决定' ? `（${approvalLevel}）` : ''}，进入30天组织考察期`);
  };

  const handleReviewForceConfirm = async () => {
    if (!reviewState || !save) return;
    const { sub, role, approvalLevel } = reviewState;
    const newFavor = Math.max(0, save.bossFavor - 10);
    await updateGameSave({ bossFavor: newFavor });
    await doAssign(sub, role, true);
    setReviewState(null);
    showFeedback(`⚡ ${role.label} 强制任命执行（${approvalLevel}未通过），上司好感 -10，进入30天考察期`);
  };

  const handleRemove = async (m: LeadershipMember) => {
    if (!save) return;
    const roleObj = allRoles.find(r => r.key === m.roleKey);
    if (roleObj) {
      const category = getOrganCategory(roleObj.organ, roleObj.key);
      if (category !== 'free' && !isInSessionWindow(category, save.rankLevel, save.gameDays)) {
        const penalty = VACANCY_PENALTY[category];
        const newMerit = Math.max(0, (save.meritPoints ?? 0) - Math.round(penalty.merit * 0.6));
        const newFavor = Math.max(0, save.bossFavor - penalty.favor);
        await updateGameSave({ meritPoints: newMerit, bossFavor: newFavor });
        await removeLeadershipRole(save.id, m.roleKey);
        setBand(prev => prev.filter(b => b.roleKey !== m.roleKey));
        showFeedback(`⚠️ 非会议期撤销 ${VACANCY_PENALTY[category].label} 职务，政绩-${Math.round(penalty.merit * 0.6)}，好感-${penalty.favor}`);
        return;
      }
    }
    await removeLeadershipRole(save.id, m.roleKey);
    setBand(prev => prev.filter(b => b.roleKey !== m.roleKey));
    showFeedback(`已撤销 ${m.subName} 的 ${m.roleLabel} 职务`);
  };

  const handleAssignAll = async () => {
    if (!save) return;
    // 只填补"真正空缺"（NPC在位不算空缺，玩家替换才算）
    const vacantRoles = allRoles.filter(r =>
      !bandMap.has(r.key) &&
      !npcByLabel.has(r.label) &&
      getAppointmentApprovalLevel(save.rankLevel, r.key) === '本级决定'
    );
    const reviewableCount = allRoles.filter(r =>
      !bandMap.has(r.key) && !npcByLabel.has(r.label) &&
      getAppointmentApprovalLevel(save.rankLevel, r.key) !== '本级决定'
    ).length;
    if (vacantRoles.length === 0) {
      showFeedback(reviewableCount > 0
        ? `党委系列职位（${reviewableCount}个）须逐一经民主评议`
        : 'NPC已全部在位，如需替换请逐一操作');
      return;
    }
    const available = subs
      .filter(s => !s.transferredCity && !band.some(b => b.subId === s.id))
      .sort((a, b) => b.ability - a.ability);
    if (available.length === 0) { showFeedback('暂无可用下属，请先培养下属'); return; }
    let assigned = 0, levelBlocked = 0;
    const usedIds = new Set<string>();
    for (const role of vacantRoles) {
      const candidate = available.find(s => !usedIds.has(s.id) && s.subLevel >= (role.requiredSubLevel ?? 1));
      if (!candidate) { levelBlocked++; continue; }
      const ok = await assignLeadershipRole(save.id, save.userId, candidate.id, role.key, role.label, candidate.name, candidate.avatarId ?? 0, candidate.gender ?? '男', save.gameDays);
      if (ok) { usedIds.add(candidate.id); assigned++; }
    }
    const updated = await getLeadershipBand(save.id);
    setBand(updated);
    const levelTip = levelBlocked > 0 ? `，${levelBlocked}个职位因职级不足未填充` : '';
    const reviewTip = reviewableCount > 0 ? `，另有${reviewableCount}个党委职位须单独评议` : '';
    showFeedback(`✅ 一键替换完成，共任命 ${assigned} 名干部${levelTip}${reviewTip}`);
  };

  const handleRemoveAll = async () => {
    if (!save || band.length === 0) { showFeedback('当前班子为空，无需操作'); return; }
    await Promise.all(band.map(m => removeLeadershipRole(save.id, m.roleKey)));
    setBand([]);
    showFeedback(`已撤销全部 ${band.length} 名班子成员任命`);
  };

  const handleRespondPolicy = async () => {
    if (!save || !activePolicy) return;
    const { meritBonus } = await respondToPolicy(save.id, activePolicy.id, save.gameDays);
    if (meritBonus > 0) {
      setPolicyFeedback(`✅ 积极响应政策运动！获得政绩+${meritBonus}`);
      setActivePolicy({ ...activePolicy, responded: true });
    }
  };

  if (!save) return null;

  const playerRank = save.rankLevel;
  const theme = getRankTheme(playerRank);
  const TIER_BAND: Record<number, number[]> = {
    3: [3], 4: [3], 5: [4, 5], 6: [5],
    7: [6, 7], 8: [7], 9: [7, 8],
    10: [9, 10], 11: [10],
    12: [11, 12], 13: [12],
    14: [14], 15: [15],
  };
  const bandLevels = TIER_BAND[playerRank] ?? [playerRank];
  const allRoles = bandLevels.flatMap(r => LEADERSHIP_ROLES[r] ?? []);
  const bandMap = new Map(band.map(m => [m.roleKey, m]));
  // NPC成员按职位名称索引，用于在人事任命中显示"NPC在位"状态
  const npcByLabel = new Map(npcMembers.filter(m => !m.isRetired).map(m => [m.positionLabel, m]));
  const playerRankName = RANK_CONFIG[playerRank]?.name ?? '';
  // 玩家已替换数 / NPC在位数 / 真正空缺数
  const playerFilledCount = band.length;
  const npcHeldCount = allRoles.filter(r => !bandMap.has(r.key) && npcByLabel.has(r.label)).length;
  const totalCount = allRoles.length;
  const trueVacantCount = totalCount - playerFilledCount - npcHeldCount;
  const bonus = calcBandBonus(band, subs);
  const retireAge = RETIREMENT_AGE_MAP[playerRank] ?? 60;

  // organ 分组
  const organOrder: string[] = [];
  const organRoleMap: Record<string, typeof allRoles> = {};
  for (const role of allRoles) {
    const org = role.organ;
    if (!organOrder.includes(org)) organOrder.push(org);
    (organRoleMap[org] ??= []).push(role);
  }

  const filteredSubs = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return subs.filter(s => {
      if (s.transferredCity) return false;
      if (kw && !s.name.includes(kw) && !(s.position ?? '').includes(kw)) return false;
      return true;
    }).sort((a, b) => b.ability - a.ability);
  }, [subs, search]);

  const tabs: [MainTab, string, string][] = [
    ['npc',    '当届班子', '👥'],
    ['appoint','代会任命', '🏛️'],
    ['career', '个人档案', '📄'],
    ['city',   '城市指标', '📊'],
    ['policy', '政策运动', '📢'],
    ['reform', '班子改革', '⚡'],
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: theme.headerSub, fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 2 }}>权力中枢</Text>
            <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>领导班子</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.headerSub, fontSize: 10 }}>{playerRankName}</Text>
            <Text style={{ color: theme.headerText, fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
            {activePolicy && !activePolicy.responded && (
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>政策运动进行中</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tab 导航 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.quickStatBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {tabs.map(([t, label, icon]) => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? theme.accentSub : 'transparent' }}>
            <Text style={{ fontSize: 14 }}>{icon}</Text>
            <Text style={{ fontSize: 9, color: tab === t ? theme.accentSub : theme.headerSub, fontWeight: tab === t ? '700' : '400', marginTop: 1 }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: theme.statHigh, fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.accentSub} />
          {initializingBand && <Text style={{ color: theme.headerSub, fontSize: 12, marginTop: 12 }}>正在自动生成领导班子成员…</Text>}
        </View>
      ) : (
        <>
          {/* ════════ TAB: 当届班子 (NPC) ════════ */}
          {tab === 'npc' && (() => {
            const partyMembers = npcMembers.filter(m => m.bandGroup === 'party');
            const govMembers   = npcMembers.filter(m => m.bandGroup === 'gov');
            const ndaMembers   = npcMembers.filter(m => m.bandGroup === 'nda');
            const GROUP_TABS: [BandGroupTab, string, string, string][] = [
              ['party', '党委班子', '🏛️', '#7A1B1E'],
              ['gov',   '政府班子', '🏢', '#1A3A4A'],
              ['nda',   '联邦国会班子', '📜', '#1A3A2A'],
            ];
            const currentList = bandGroupTab === 'party' ? partyMembers : bandGroupTab === 'gov' ? govMembers : ndaMembers;
            const groupColor = GROUP_TABS.find(g => g[0] === bandGroupTab)?.[3] ?? theme.headerBg;
            return (
              <View style={{ flex: 1 }}>
                {/* 三组小 Tab */}
                <View style={{ flexDirection: 'row', backgroundColor: theme.quickStatBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
                  {GROUP_TABS.map(([g, label, icon, color]) => (
                    <Pressable key={g} onPress={() => setBandGroupTab(g)}
                      style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: bandGroupTab === g ? color : 'transparent' }}>
                      <Text style={{ fontSize: 13 }}>{icon}</Text>
                      <Text style={{ fontSize: 9, color: bandGroupTab === g ? color : theme.headerSub, fontWeight: bandGroupTab === g ? '700' : '400', marginTop: 1 }}>{label}</Text>
                      <Text style={{ fontSize: 8, color: theme.mutedText, marginTop: 1 }}>
                        {(g === 'party' ? partyMembers : g === 'gov' ? govMembers : ndaMembers).filter(m => !m.isRetired).length}人
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <FlatList
                  data={currentList}
                  keyExtractor={m => m.id}
                  contentContainerStyle={{ padding: 14, gap: 8 }}
                  contentInsetAdjustmentBehavior="automatic"
                  ListHeaderComponent={
                    <>
                      {/* 关系积分面板 */}
                      <View style={{ backgroundColor: theme.alertBg, borderWidth: 1, borderColor: theme.alertBorder, padding: 10, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: theme.alertText, fontSize: 11, fontWeight: '700', marginBottom: 2 }}>
                            🎓 老学长关系积分：{save.alumniScore ?? 0} / 100
                          </Text>
                          <View style={{ height: 5, backgroundColor: theme.cardBorder, borderRadius: 3 }}>
                            <View style={{ height: 5, width: `${Math.min(save.alumniScore ?? 0, 100)}%`, backgroundColor: theme.alertText, borderRadius: 3 }} />
                          </View>
                          <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 3 }}>
                            每年与同校部级老学长共事可+1分；有同派系部级老学长时每月额外+20分，积分越高破格晋升概率越大（最高+5%）
                          </Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: groupColor, padding: 10, marginBottom: 4 }}>
                        <Text style={{ color: groupColor, fontSize: 11, fontWeight: '700' }}>
                          {GROUP_TABS.find(g => g[0] === bandGroupTab)?.[1]} · 共{currentList.filter(m => !m.isRetired).length}人 · 退休年龄{retireAge}岁
                        </Text>
                        <Text style={{ color: theme.headerSub, fontSize: 10, marginTop: 2 }}>
                          点击成员可查看仕途档案。橙色/红色年龄提示临近/到达退休年龄。
                        </Text>
                      </View>
                    </>
                  }
                  ListEmptyComponent={
                    <View style={{ alignItems: 'center', marginTop: 60 }}>
                      <Text style={{ fontSize: 32, marginBottom: 12 }}>👥</Text>
                      <Text style={{ fontSize: 13, color: theme.headerSub, textAlign: 'center' }}>
                        {npcMembers.length === 0 ? '领导班子成员正在生成…\n请稍后刷新' : '该组暂无成员'}
                      </Text>
                    </View>
                  }
                  renderItem={({ item: m }) => (
                    <Pressable
                      onPress={() => { if (m.age > 0) setSelectedMember(m); }}
                      style={{
                        backgroundColor: m.isRetired ? theme.sectionHeaderBg : theme.quickStatBg,
                        borderWidth: 1, borderColor: m.isRetired ? theme.cardBorder : theme.sectionHeaderBorder,
                        flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10,
                        opacity: m.isRetired ? 0.5 : 1,
                        borderLeftWidth: 3, borderLeftColor: m.age === 0 ? '#C82829' : (FACTION_COLOR[m.faction] ?? groupColor),
                      }}
                    >
                      {/* 证件照头像 */}
                      <View style={{ width: 40, height: 48, backgroundColor: '#EDE8DF', borderWidth: 1, borderColor: FACTION_COLOR[m.faction] + '66', overflow: 'hidden', flexShrink: 0 }}>
                        {m.age > 0 ? (
                          <Image
                            source={{ uri: getAvatarImageUrl(m.avatarId ?? 0, m.gender ?? '男', m.positionLabel) }}
                            style={{ width: 40, height: 48 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#aaa', fontSize: 10 }}>空缺</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2, flexWrap: 'wrap' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: m.age === 0 ? theme.primary : theme.headerText }}>{m.name}</Text>
                          {m.age > 0 && (
                            <Text style={{ fontSize: 11, color: ageColor(m.age, playerRank), fontWeight: '600' }}>{m.age}岁</Text>
                          )}
                          {m.gender && m.age > 0 && (
                            <View style={{ backgroundColor: m.gender === '女' ? '#880044' : '#003388', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>{m.gender}</Text>
                            </View>
                          )}
                          {m.age > 0 && m.age >= retireAge - 1 && !m.isRetired && (
                            <View style={{ backgroundColor: theme.primary, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 8 }}>临近退休</Text>
                            </View>
                          )}
                          {m.isRetired && (
                            <View style={{ backgroundColor: '#3a3a3a', paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ color: '#888', fontSize: 8 }}>已退休</Text>
                            </View>
                          )}
                        </View>
                        <Text style={{ fontSize: 12, color: theme.accentSub, fontWeight: '600', marginBottom: 3 }}>{m.positionLabel}</Text>
                        {m.age > 0 && (
                          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 10, color: FACTION_COLOR[m.faction] }}>
                              {FACTION_ICONS[m.faction]} {FACTION_LABEL[m.faction]}
                            </Text>
                            <Text style={{ fontSize: 10, color: theme.headerSub }}>能力{m.ability}</Text>
                            <Text style={{ fontSize: 10, color: theme.headerSub }}>廉洁{m.integrity}</Text>
                            <Text style={{ fontSize: 10, color: m.loyalty >= 70 ? '#4CAF50' : m.loyalty < 40 ? '#C82829' : '#5577AA' }}>
                              好感{m.loyalty}
                            </Text>
                            {(m.birthProvince || m.birthCity) && (
                              <Text style={{ fontSize: 10, color: theme.mutedText }}>
                                📍{m.birthProvince}{m.birthCity}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                      {m.age > 0 && <Text style={{ fontSize: 11, color: theme.headerSub }}>›</Text>}
                    </Pressable>
                  )}
                />
              </View>
            );
          })()}

          {/* ════════ TAB: 代会任命 → 跳转代会系统 ════════ */}
          {tab === 'appoint' && (
            <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>
              {/* 书记权限 / 提名权说明 */}
              <View style={{
                backgroundColor: isPartySecretary ? '#1A3A1A' : '#1A2A3A',
                borderLeftWidth: 3,
                borderLeftColor: isPartySecretary ? '#3A8A3A' : theme.accentSub,
                padding: 12,
              }}>
                <Text style={{ color: isPartySecretary ? '#6AC96A' : theme.accentSub, fontSize: 13, fontWeight: '700' }}>
                  {isPartySecretary ? '🏛️ 您是党委书记 · 拥有干部任命权' : '📋 当前职务仅有干部提名权'}
                </Text>
                <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4, lineHeight: 18 }}>
                  {isPartySecretary
                    ? '作为辖区党委书记，您可直接任命班子干部（含党委、政府系列），任命后干部进入30天组织考察期。'
                    : '仅书记有干部直接任命权。您可通过代会程序提名候选，经民主评议通过后，提名干部同样进入组织考察。'}
                </Text>
              </View>

              {/* 说明标题 */}
              <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: theme.accentSub, padding: 12 }}>
                <Text style={{ color: theme.accentSub, fontSize: 13, fontWeight: '700' }}>🏛️ 人事任命须经代表大会</Text>
                <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4, lineHeight: 18 }}>
                  根据宪法及党章规定，领导班子成员的任命须经各级代表大会提名、审议与表决通过，不得由个人擅自决定。
                </Text>
              </View>

              {/* 三大代会入口 */}
              {[
                {
                  key: 'party',
                  title: '党代会',
                  icon: '🏛️',
                  desc: '党委书记、副书记、常委的选举与任命，须经同级党代表大会或党代会常委会审议。',
                  color: '#7A1B1E',
                  windowInfo: (() => {
                    const inW = isInSessionWindow('party', save.rankLevel, save.gameDays);
                    const days = daysToNextSession('party', save.rankLevel, save.gameDays);
                    return inW ? '✅ 当前处于换届窗口期，可提交提名' : `⏳ 距下次换届约 ${days >= 9999 ? '—' : days} 天`;
                  })(),
                },
                {
                  key: 'gov',
                  title: '联邦国会代表大会',
                  icon: '📜',
                  desc: '县长/市长/省长/副职等政府领导成员，须经联邦国会代表大会选举产生或联邦国会常委会批准。',
                  color: '#1A3A4A',
                  windowInfo: (() => {
                    const inW = isInSessionWindow('gov_senior', save.rankLevel, save.gameDays);
                    const days = daysToNextSession('gov_senior', save.rankLevel, save.gameDays);
                    return inW ? '✅ 当前联邦国会会议期，可提交提名' : `⏳ 距下次联邦国会会议约 ${days >= 9999 ? '—' : days} 天`;
                  })(),
                },
                {
                  key: 'nda',
                  title: '联邦国会常委会',
                  icon: '⚖️',
                  desc: '联邦国会主任、副主任等联邦国会班子成员，须经联邦国会代表大会选举或联邦国会常委会审议任命。',
                  color: '#1A3A2A',
                  windowInfo: (() => {
                    const inW = isInSessionWindow('npc', save.rankLevel, save.gameDays);
                    const days = daysToNextSession('npc', save.rankLevel, save.gameDays);
                    return inW ? '✅ 当前联邦国会会议期，可提交提名' : `⏳ 距下次联邦国会会议约 ${days >= 9999 ? '—' : days} 天`;
                  })(),
                },
              ].map(entry => (
                <Pressable
                  key={entry.key}
                  onPress={() => router.push('/(app)/npc-congress')}
                  style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, borderLeftWidth: 4, borderLeftColor: entry.color, padding: 14, gap: 8 }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{entry.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: entry.color, fontSize: 14, fontWeight: '700' }}>{entry.title}</Text>
                      <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 2 }}>{entry.desc}</Text>
                    </View>
                    <Text style={{ color: theme.headerSub, fontSize: 18 }}>›</Text>
                  </View>
                  <View style={{ backgroundColor: theme.sectionHeaderBg, padding: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 11, color: theme.mutedText }}>{entry.windowInfo}</Text>
                  </View>
                </Pressable>
              ))}

              {/* 说明提示 */}
              <View style={{ backgroundColor: theme.sectionHeaderBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12 }}>
                <Text style={{ fontSize: 11, color: theme.mutedText, lineHeight: 18 }}>
                  📌 提名须在代表大会会议期内提交，非会议期提交属"补缺程序"，将扣除政绩与上司好感。{'\n'}
                  🔵 当届班子中的 NPC 成员通过代会程序选举产生，如需替换请前往对应代会提交提名。{'\n'}
                  🟡 经代会通过后，任命结果将自动同步至"当届班子"展示。{'\n'}
                  🤖 系统每月自动执行 NPC 代会换届：退休职位自动补缺，每届满5年整体换届，无需手动触发。
                </Text>
              </View>
            </ScrollView>
          )}

          {/* ════════ TAB: 个人档案 ════════ */}
          {tab === 'career' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} contentInsetAdjustmentBehavior="automatic">

              {/* ── 基本信息卡 ── */}
              <View style={{ backgroundColor: '#1D3B6C', padding: 12, borderLeftWidth: 3, borderLeftColor: '#7EB8D4' }}>
                <Text style={{ color: '#B8C8E0', fontSize: 9, letterSpacing: 2, marginBottom: 4 }}>PERSONAL RECORD · 个人档案</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 52, height: 64, backgroundColor: '#EDE8DF', borderWidth: 2, borderColor: '#7EB8D4', overflow: 'hidden' }}>
                    <Image
                      source={{ uri: getAvatarImageUrl(save.avatarId ?? 0, save.playerGender ?? '男', save.rankName ?? '') }}
                      style={{ width: 52, height: 64 }}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{save.playerName}</Text>
                    <Text style={{ color: '#93A8C0', fontSize: 11, marginTop: 2 }}>
                      {save.playerGender} · {save.playerAge} 岁
                    </Text>
                    {save.birthYear > 0 && (
                      <Text style={{ color: '#7799BB', fontSize: 11, marginTop: 1 }}>
                        {save.birthYear} 年生
                        {save.birthProvince ? `于${save.birthProvince}` : ''}
                        {save.birthCity ? save.birthCity : ''}
                      </Text>
                    )}
                    <Text style={{ color: '#E8D5A0', fontSize: 11, fontWeight: '600', marginTop: 3 }}>
                      {save.rankName}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ── 学历信息 ── */}
              <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', padding: 12 }}>
                <Text style={{ color: '#E8D5A0', fontSize: 11, fontWeight: '700', marginBottom: 8 }}>🎓 学历信息</Text>
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>院校层级</Text>
                    <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>{save.school || '未知'}</Text>
                  </View>
                  {save.universityName && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>毕业院校</Text>
                      <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>{save.universityName}</Text>
                    </View>
                  )}
                  {save.birthYear > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>出生年份</Text>
                      <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>{save.birthYear} 年</Text>
                    </View>
                  )}
                  {(save.birthProvince || save.birthCity) && (
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                      <Text style={{ color: '#5577AA', fontSize: 11, width: 60 }}>籍贯</Text>
                      <Text style={{ color: '#C8E0F4', fontSize: 12, flex: 1 }}>
                        {save.birthProvince}{save.birthCity}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* ── 仕途历程时间线 ── */}
              <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', padding: 14 }}>
                <Text style={{ color: '#E8D5A0', fontSize: 11, fontWeight: '700', marginBottom: 10 }}>📋 仕途历程</Text>
                {playerCareer.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                    <Text style={{ fontSize: 28, marginBottom: 8 }}>📄</Text>
                    <Text style={{ fontSize: 12, color: '#5577AA', textAlign: 'center' }}>仕途历程尚未记录{'\n'}每次晋升后将自动写入档案</Text>
                  </View>
                ) : (
                  playerCareer.map((entry, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ width: 32, alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#7EB8D4', marginTop: 5 }} />
                        {i < playerCareer.length - 1 && (
                          <View style={{ width: 2, flex: 1, backgroundColor: '#2D4A6B', marginTop: 2 }} />
                        )}
                      </View>
                      <View style={{ flex: 1, paddingBottom: 14 }}>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>
                          {entry.startYear ?? '——'} — {entry.endYear ?? '至今'}
                        </Text>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: '#C8E0F4', marginTop: 1 }}>
                          {entry.city}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#7799BB' }}>{entry.position}</Text>
                      </View>
                    </View>
                  ))
                )}
                {/* 当前职务节点 */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ width: 32, alignItems: 'center' }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary }} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: theme.primary }}>2025 — 至今（现职）</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginBottom: 1 }}>{save.cityName}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#C82829' }}>{save.rankName}</Text>
                  </View>
                </View>
              </View>

              {/* ── 健康状态 ── */}
              {playerHealth && (
                <View style={{ backgroundColor: '#111E30', borderWidth: 1, borderColor: '#2D4A6B', padding: 12 }}>
                  <Text style={{ fontSize: 11, color: '#E8D5A0', fontWeight: '700', marginBottom: 8 }}>🏥 当前身体状态</Text>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1, backgroundColor: '#1a0a0a', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3a1515' }}>
                      <Text style={{ fontSize: 10, color: '#7799BB' }}>健康值</Text>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: playerHealth.health < 30 ? '#C82829' : '#4CAF50', marginTop: 2 }}>{playerHealth.health}</Text>
                      <Text style={{ fontSize: 9, color: '#5577AA' }}>/ 100</Text>
                      {playerHealth.isOnLeave && <Text style={{ fontSize: 9, color: '#C82829', marginTop: 2 }}>因病休假中</Text>}
                    </View>
                    <View style={{ flex: 1, backgroundColor: '#0a0a1a', padding: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1a1a3a' }}>
                      <Text style={{ fontSize: 10, color: '#7799BB' }}>精力值</Text>
                      <Text style={{ fontSize: 22, fontWeight: '700', color: playerHealth.energy < 30 ? '#E67E22' : '#7EB8D4', marginTop: 2 }}>{playerHealth.energy}</Text>
                      <Text style={{ fontSize: 9, color: '#5577AA' }}>/ 100</Text>
                    </View>
                  </View>
                  <Pressable onPress={() => router.push('/(app)/health')} style={{ marginTop: 10, backgroundColor: '#1D3B6C', padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>前往健康管理 →</Text>
                  </Pressable>
                </View>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}


          {/* ════════ TAB: 城市指标 ════════ */}
          {tab === 'city' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} contentInsetAdjustmentBehavior="automatic">
              <View style={{ backgroundColor: theme.headerBg, padding: 12 }}>
                <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 1.5 }}>CITY METRICS</Text>
                <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700', marginTop: 2 }}>{save.cityName} · 综合治理指标</Text>
              </View>
              {!cityMetrics ? (
                <Text style={{ color: theme.headerSub, textAlign: 'center', marginTop: 40 }}>城市指标暂未初始化</Text>
              ) : (
                <>
                  {([
                    { label: 'GDP增长', key: 'gdp', icon: '📈', color: '#7EB8D4', desc: 'GDP每提升→带动财政收入增加' },
                    { label: '财政收入', key: 'finance', icon: '💰', color: '#4CAF50', desc: '财政充裕→教育/医疗投入上限提升' },
                    { label: '环境质量', key: 'ecology', icon: '🌿', color: '#81C784', desc: `当前招商加成 +${cityMetrics.investBonus}%` },
                    { label: '社会稳定', key: 'stability', icon: '🛡️', color: '#E8D5A0', desc: `当前信访减少 ${cityMetrics.petitionReduction}%` },
                    { label: '教育投入', key: 'education', icon: '📚', color: '#FFB74D', desc: `人才积累指数 ${cityMetrics.talentPool}` },
                    { label: '医疗投入', key: 'healthcare', icon: '🏥', color: '#CE93D8', desc: '医疗水平影响人口健康增长' },
                  ] as { label: string; key: keyof CityMetrics; icon: string; color: string; desc: string }[]).map(item => {
                    const val = cityMetrics[item.key] as number;
                    return (
                      <View key={item.key} style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.headerText }}>{item.label}</Text>
                          </View>
                          <Text style={{ fontSize: 20, fontWeight: '700', color: item.color }}>{val}</Text>
                        </View>
                        <View style={{ height: 5, backgroundColor: '#1E3050', marginBottom: 4 }}>
                          <View style={{ height: 5, width: `${val}%`, backgroundColor: item.color }} />
                        </View>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>{item.desc}</Text>
                      </View>
                    );
                  })}
                  <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: theme.sectionHeaderBorder, padding: 12 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accentSub, marginBottom: 6 }}>🔗 当前联动效果</Text>
                    <Text style={{ fontSize: 11, color: theme.headerSub, lineHeight: 18 }}>
                      📈 GDP→财政：每+1点GDP带来约+0.5财政{'\n'}
                      🌿 生态→招商：+{cityMetrics.investBonus}% 招商引资成功率{'\n'}
                      🛡️ 稳定→信访：减少 {cityMetrics.petitionReduction}% 信访事件{'\n'}
                      📚 教育→人才：累积分 {cityMetrics.talentPool}（满200享受晋升加成）
                    </Text>
                  </View>
                </>
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ════════ TAB: 政策运动 ════════ */}
          {tab === 'policy' && (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} contentInsetAdjustmentBehavior="automatic">
              <View style={{ backgroundColor: theme.headerBg, padding: 12 }}>
                <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 1.5 }}>NATIONAL POLICY</Text>
                <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700', marginTop: 2 }}>国家重大政策运动</Text>
              </View>
              {!activePolicy ? (
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 24, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24, marginBottom: 8 }}>🕊️</Text>
                  <Text style={{ fontSize: 13, color: theme.headerSub, textAlign: 'center' }}>当前无进行中的国家政策运动{'\n'}运动随机在每年年初触发（30%概率）</Text>
                </View>
              ) : (
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 2, borderColor: theme.primary, overflow: 'hidden' }}>
                  <View style={{ backgroundColor: '#C82829', padding: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9, letterSpacing: 2 }}>执政党中央 · 联邦内阁</Text>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
                      关于深入开展{activePolicy.policyName}的通知
                    </Text>
                  </View>
                  <View style={{ padding: 14 }}>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: theme.alertBg, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.alertBorder }}>
                        <Text style={{ fontSize: 11, color: theme.alertText }}>📅 开始第 {activePolicy.startGameDay} 天</Text>
                      </View>
                      <View style={{ backgroundColor: theme.alertBg, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.alertBorder }}>
                        <Text style={{ fontSize: 11, color: theme.alertText }}>⏱ 持续 {activePolicy.durationDays} 天</Text>
                      </View>
                      {activePolicy.responded && (
                        <View style={{ backgroundColor: '#0e2a1a', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#1a5a2a' }}>
                          <Text style={{ fontSize: 11, color: '#4CAF50' }}>✅ 已响应</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#C8E0F4', lineHeight: 20, marginBottom: 14 }}>
                      各地区各部门须高度重视，将{activePolicy.policyName}列为当前重点工作任务，
                      落实责任，确保取得实效。积极响应者予以政绩加分，消极应对者予以通报批评。
                    </Text>
                    {policyFeedback ? (
                      <View style={{ backgroundColor: theme.accentBg, padding: 10, borderWidth: 1, borderColor: theme.cardBorder }}>
                        <Text style={{ fontSize: 12, color: theme.statHigh }}>{policyFeedback}</Text>
                      </View>
                    ) : !activePolicy.responded ? (
                      <Pressable onPress={() => void handleRespondPolicy()} style={{ backgroundColor: theme.primary, padding: 12, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>积极响应政策运动</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              )}
              <View style={{ backgroundColor: theme.quickStatBg, borderLeftWidth: 3, borderLeftColor: theme.sectionHeaderBorder, padding: 12 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.accentSub, marginBottom: 6 }}>📖 运动说明</Text>
                <Text style={{ fontSize: 10, color: theme.headerSub, lineHeight: 16 }}>
                  国家重大政策运动每年有30%概率随机触发，持续90-180天。{'\n'}
                  积极响应可获得政绩+35~+60及晋升加分+4~+8。{'\n'}
                  消极应对将受到政绩处罚，影响年度考核。{'\n'}
                  运动类型涵盖：扫黑除恶、环保督查、反腐败、乡村振兴、共同富裕、安全生产、教育提升、经济攻坚。
                </Text>
              </View>
              <View style={{ height: 24 }} />
            </ScrollView>
          )}

          {/* ══════ 班子改革 tab ══════ */}
          {tab === 'reform' && (() => {
            const activeMembers = npcMembers.filter(m => !m.isRetired && m.age > 0);
            const factionCount: Record<string, number> = { reform: 0, pragmatic: 0, neutral: 0 };
            activeMembers.forEach(m => { factionCount[m.faction] = (factionCount[m.faction] ?? 0) + 1; });
            const total        = activeMembers.length || 1;
            const avgLoyalty   = activeMembers.length ? Math.round(activeMembers.reduce((s, m) => s + m.loyalty, 0)   / activeMembers.length) : 0;
            const avgAbility   = activeMembers.length ? Math.round(activeMembers.reduce((s, m) => s + m.ability, 0)   / activeMembers.length) : 0;
            const avgIntegrity = activeMembers.length ? Math.round(activeMembers.reduce((s, m) => s + m.integrity, 0) / activeMembers.length) : 0;
            const maxFaction   = Math.max(...Object.values(factionCount));
            const dominanceIdx = Math.round((maxFaction / total) * 100);
            const diversity    = 100 - dominanceIdx;
            const disloyalMembers    = activeMembers.filter(m => m.loyalty < 40);
            const corruptRiskMembers = activeMembers.filter(m => m.integrity < 40);

            type Proposal = { key: string; icon: string; title: string; desc: string; req: string; reqMet: boolean; merit: number; kpi: number; publicOpinion: number; bossFavor: number; inspectionRisk: number };
            const proposals: Proposal[] = [
              { key: 'prop_efficiency',     icon: '⚡', title: '效能提升改革',     desc: '精简行政层级，推行首席负责制，大幅提高政务办理效率',                         req: `平均能力 ≥ 65（当前 ${avgAbility}）`,     reqMet: avgAbility >= 65,            merit: 60, kpi: 40, publicOpinion: 15, bossFavor: 8,  inspectionRisk: -5  },
              { key: 'prop_transparency',   icon: '🔎', title: '权力透明化改革',   desc: '推行重大事项公示制度，建立全程留痕机制，主动接受社会监督',                     req: `平均廉洁 ≥ 70（当前 ${avgIntegrity}）`,   reqMet: avgIntegrity >= 70,          merit: 50, kpi: 30, publicOpinion: 25, bossFavor: 5,  inspectionRisk: -15 },
              { key: 'prop_faction_balance',icon: '⚖️', title: '派系均衡调整',     desc: '引入多元派系人才，打破一家独大格局，提升班子决策包容性',                       req: `多元化指数 ≥ 50（当前 ${diversity}）`,    reqMet: diversity >= 50,             merit: 40, kpi: 25, publicOpinion: 10, bossFavor: 10, inspectionRisk: 0   },
              { key: 'prop_anticorrupt',    icon: '🛡️', title: '廉政整顿运动',     desc: '在班子内部开展廉政教育与自查自纠，清除腐败隐患',                               req: `廉洁风险成员 ≤ 2人（当前 ${corruptRiskMembers.length}人）`, reqMet: corruptRiskMembers.length <= 2, merit: 45, kpi: 20, publicOpinion: 20, bossFavor: 6, inspectionRisk: -20 },
              { key: 'prop_talent_intro',   icon: '🎓', title: '外引高端人才',     desc: '向上级申请破格引进技术型、学者型高端人才进入班子',                             req: `班子人数 ≥ 6人（当前 ${activeMembers.length}人）`, reqMet: activeMembers.length >= 6,   merit: 55, kpi: 35, publicOpinion: 8,  bossFavor: 7,  inspectionRisk: 0   },
            ];
            const [proposalDone, setProposalDone] = useState<Record<string, boolean>>({});
            const [reformActing, setReformActing] = useState<string | null>(null);
            const [reformMsg, setReformMsg]       = useState<{ ok: boolean; text: string } | null>(null);

            async function executeProposal(p: Proposal) {
              if (!save || !p.reqMet || proposalDone[p.key] || reformActing) return;
              setReformActing(p.key);
              const isSuccess = Math.random() < 0.82;
              try {
                const updates: Record<string, number> = { meritPoints: Math.round((save.meritPoints ?? 0) + (isSuccess ? p.merit : Math.round(p.merit * 0.2))) };
                if (isSuccess) {
                  if (p.kpi)            updates.lineKpiScore       = Math.max(0, (save.lineKpiScore ?? 0) + p.kpi);
                  if (p.publicOpinion)  updates.publicOpinionIndex = Math.min(100, Math.max(0, (save.publicOpinionIndex ?? 60) + p.publicOpinion));
                  if (p.bossFavor)      updates.bossFavor          = Math.min(100, Math.max(0, (save.bossFavor ?? 60) + p.bossFavor));
                  if (p.inspectionRisk) updates.inspectionRisk     = Math.min(100, Math.max(0, (save.inspectionRisk ?? 20) + p.inspectionRisk));
                }
                await updateGameSave(updates);
                setProposalDone(prev => ({ ...prev, [p.key]: true }));
                setReformMsg({ ok: isSuccess, text: isSuccess ? `✅ 《${p.title}》推行成功，政绩+${p.merit}，KPI积分+${p.kpi}` : `❌ 《${p.title}》遭班子阻挠未能落地，政绩仅+${Math.round(p.merit * 0.2)}` });
              } catch { /* 静默失败 */ } finally { setReformActing(null); }
            }

            async function improveLoyal(m: LeadershipBand) {
              if (!save || reformActing) return;
              setReformActing('loyal_' + m.id);
              try {
                const gain = 8 + Math.round(Math.random() * 7);
                const newLoyalty = Math.min(100, m.loyalty + gain);
                setNpcMembers(prev => prev.map(n => n.id === m.id ? { ...n, loyalty: newLoyalty } : n));
                await updateGameSave({ meritPoints: Math.round((save.meritPoints ?? 0) + 5) });
                setReformMsg({ ok: true, text: `✅ 与 ${m.name} 个别谈话，好感+${gain}（→${newLoyalty}），政绩+5` });
              } catch { /* 静默失败 */ } finally { setReformActing(null); }
            }

            async function purgeDisloyal(m: LeadershipBand) {
              if (!save || reformActing) return;
              setReformActing('purge_' + m.id);
              try {
                const success = Math.random() < 0.65;
                if (success) {
                  setNpcMembers(prev => prev.map(n => n.id === m.id ? { ...n, isRetired: true } : n));
                  await updateGameSave({ meritPoints: Math.round((save.meritPoints ?? 0) + 20), inspectionRisk: Math.min(100, (save.inspectionRisk ?? 20) + 8), bossFavor: Math.max(0, (save.bossFavor ?? 60) - 5) });
                  setReformMsg({ ok: true, text: `✅ 成功免职 ${m.name}（好感${m.loyalty}），政绩+20，廉洁风险微升` });
                } else {
                  await updateGameSave({ bossFavor: Math.max(0, (save.bossFavor ?? 60) - 12) });
                  setReformMsg({ ok: false, text: `❌ 免职 ${m.name} 遭上级否决，上司好感-12，建议先提升关系再行动` });
                }
              } catch { /* 静默失败 */ } finally { setReformActing(null); }
            }

            return (
              <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }} contentInsetAdjustmentBehavior="automatic">
                {/* 消息提示 */}
                {reformMsg && (
                  <Pressable onPress={() => setReformMsg(null)} style={{ backgroundColor: reformMsg.ok ? '#F0FDF4' : '#FEF2F2', borderWidth: 1, borderColor: reformMsg.ok ? '#BBF7D0' : '#FECACA', borderRadius: 8, padding: 12 }}>
                    <Text style={{ fontSize: 12, color: reformMsg.ok ? '#065F46' : '#B91C1C', lineHeight: 18 }}>{reformMsg.text}</Text>
                    <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>点击关闭</Text>
                  </Pressable>
                )}

                {/* 班子政治生态 */}
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 10, padding: 14, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View style={{ width: 3, height: 14, backgroundColor: theme.primary }} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.headerText }}>班子政治生态</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {([
                      { label: '平均能力', val: avgAbility,   color: '#3B82F6' },
                      { label: '平均好感', val: avgLoyalty,   color: avgLoyalty >= 60 ? '#22C55E' : avgLoyalty < 40 ? '#EF4444' : '#F59E0B' },
                      { label: '平均廉洁', val: avgIntegrity, color: avgIntegrity >= 60 ? '#22C55E' : '#EF4444' },
                    ] as const).map(({ label, val, color }) => (
                      <View key={label} style={{ flex: 1, backgroundColor: theme.sectionHeaderBg, borderRadius: 8, padding: 10, alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 18, fontWeight: '900', color }}>{val}</Text>
                        <Text style={{ fontSize: 9, color: theme.mutedText }}>{label}</Text>
                        <View style={{ height: 3, width: '100%', backgroundColor: theme.cardBorder, borderRadius: 2 }}>
                          <View style={{ height: 3, width: `${val}%`, backgroundColor: color, borderRadius: 2 }} />
                        </View>
                      </View>
                    ))}
                  </View>
                  {/* 派系分布 */}
                  <View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.headerSub, marginBottom: 6 }}>派系分布（共{activeMembers.length}人）</Text>
                    {(['reform', 'pragmatic', 'neutral'] as const).map(fk => {
                      const cnt = factionCount[fk] ?? 0;
                      const pct = Math.round((cnt / total) * 100);
                      return (
                        <View key={fk} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <Text style={{ fontSize: 10, color: FACTION_COLOR[fk], width: 52, fontWeight: '700' }}>{FACTION_LABEL[fk]}</Text>
                          <View style={{ flex: 1, height: 8, backgroundColor: theme.cardBorder, borderRadius: 4 }}>
                            <View style={{ height: 8, width: `${pct}%`, backgroundColor: FACTION_COLOR[fk], borderRadius: 4 }} />
                          </View>
                          <Text style={{ fontSize: 10, color: theme.mutedText, width: 36, textAlign: 'right' }}>{cnt}人 {pct}%</Text>
                        </View>
                      );
                    })}
                  </View>
                  {/* 一言堂/多元化指数 */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: dominanceIdx > 70 ? '#FEF2F2' : '#F0FDF4', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: dominanceIdx > 70 ? '#B91C1C' : '#166534' }}>{dominanceIdx}%</Text>
                      <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>一言堂指数</Text>
                      <Text style={{ fontSize: 8, color: dominanceIdx > 70 ? '#B91C1C' : '#166534', marginTop: 2, textAlign: 'center' }}>
                        {dominanceIdx > 80 ? '⚠ 高度集权，决策偏差风险大' : dominanceIdx > 60 ? '班子意见较统一' : '✅ 权力分散，决策稳健'}
                      </Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: diversity >= 50 ? '#F0FDF4' : '#FFFBEB', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                      <Text style={{ fontSize: 16, fontWeight: '900', color: diversity >= 50 ? '#166534' : '#92400E' }}>{diversity}%</Text>
                      <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>多元化指数</Text>
                      <Text style={{ fontSize: 8, color: diversity >= 50 ? '#166534' : '#92400E', marginTop: 2, textAlign: 'center' }}>
                        {diversity >= 60 ? '✅ 派系均衡，利于稳定执政' : diversity >= 40 ? '派系多元度一般' : '⚠ 派系单一，存在政治风险'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 重大改革提案 */}
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 10, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <View style={{ width: 3, height: 14, backgroundColor: '#7C3AED' }} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.headerText }}>重大改革提案</Text>
                    <Text style={{ fontSize: 10, color: theme.mutedText, marginLeft: 4 }}>成功率82%，每次仅限一任期</Text>
                  </View>
                  <View style={{ gap: 8 }}>
                    {proposals.map(p => {
                      const done  = proposalDone[p.key];
                      const isAct = reformActing === p.key;
                      return (
                        <View key={p.key} style={{ backgroundColor: done ? '#F0FDF4' : p.reqMet ? theme.sectionHeaderBg : theme.alertBg, borderRadius: 8, borderWidth: 1, borderColor: done ? '#BBF7D0' : p.reqMet ? theme.sectionHeaderBorder : theme.alertBorder, padding: 12, gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 20 }}>{p.icon}</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.headerText }}>{p.title}</Text>
                              <Text style={{ fontSize: 10, color: theme.mutedText, marginTop: 1, lineHeight: 15 }}>{p.desc}</Text>
                            </View>
                            {done && <View style={{ backgroundColor: '#22C55E', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>已推行</Text></View>}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            <View style={{ backgroundColor: '#EFF6FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#1E40AF', fontWeight: '700' }}>政绩+{p.merit}</Text></View>
                            <View style={{ backgroundColor: '#F3E8FF', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#6B21A8', fontWeight: '700' }}>KPI+{p.kpi}</Text></View>
                            {p.publicOpinion > 0 && <View style={{ backgroundColor: '#F0FDF4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#166534', fontWeight: '700' }}>舆情+{p.publicOpinion}</Text></View>}
                            {p.inspectionRisk < 0 && <View style={{ backgroundColor: '#F0FDF4', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#166534', fontWeight: '700' }}>廉洁风险{p.inspectionRisk}</Text></View>}
                          </View>
                          <Text style={{ fontSize: 10, color: p.reqMet ? '#166534' : theme.alertText, fontWeight: '600' }}>
                            {p.reqMet ? '✅ 条件已满足' : `⚠ 条件未达: ${p.req}`}
                          </Text>
                          {!done && (
                            <Pressable onPress={() => void executeProposal(p)} disabled={!p.reqMet || !!reformActing} style={{ backgroundColor: !p.reqMet || !!reformActing ? '#9CA3AF' : '#7C3AED', borderRadius: 7, paddingVertical: 8, alignItems: 'center' }}>
                              {isAct ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>提交班子表决</Text>}
                            </Pressable>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* 班子风险预警 */}
                {(disloyalMembers.length > 0 || corruptRiskMembers.length > 0) && (
                  <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                      <View style={{ width: 3, height: 14, backgroundColor: '#DC2626' }} />
                      <Text style={{ fontSize: 13, fontWeight: '800', color: theme.headerText }}>⚠ 班子风险预警</Text>
                    </View>
                    <View style={{ gap: 8 }}>
                      {disloyalMembers.map(m => (
                        <View key={m.id} style={{ backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', padding: 10, gap: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>😠</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7F1D1D' }}>{m.name} · {m.positionLabel}</Text>
                              <Text style={{ fontSize: 10, color: '#B91C1C' }}>好感度 {m.loyalty} — 不服从风险，可能在关键表决中投反对票</Text>
                            </View>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <Pressable onPress={() => void improveLoyal(m)} disabled={!!reformActing} style={{ flex: 1, backgroundColor: '#1E40AF', borderRadius: 6, paddingVertical: 7, alignItems: 'center' }}>
                              {reformActing === 'loyal_' + m.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>💬 个别谈话</Text>}
                            </Pressable>
                            <Pressable onPress={() => void purgeDisloyal(m)} disabled={!!reformActing} style={{ flex: 1, backgroundColor: '#7F1D1D', borderRadius: 6, paddingVertical: 7, alignItems: 'center' }}>
                              {reformActing === 'purge_' + m.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🔨 申请免职</Text>}
                            </Pressable>
                          </View>
                        </View>
                      ))}
                      {corruptRiskMembers.filter(m => m.loyalty >= 40).map(m => (
                        <View key={m.id} style={{ backgroundColor: '#FFFBEB', borderRadius: 8, borderWidth: 1, borderColor: '#FDE68A', padding: 10 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={{ fontSize: 18 }}>⚠️</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: '#78350F' }}>{m.name} · {m.positionLabel}</Text>
                              <Text style={{ fontSize: 10, color: '#92400E' }}>廉洁度 {m.integrity} — 存在腐败风险，可能引发巡视问题</Text>
                            </View>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 全班子一览 */}
                <View style={{ backgroundColor: theme.quickStatBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 10, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <View style={{ width: 3, height: 14, backgroundColor: theme.primary }} />
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.headerText }}>全班子人员一览</Text>
                  </View>
                  {activeMembers.length === 0 ? (
                    <Text style={{ color: theme.mutedText, textAlign: 'center', padding: 20 }}>班子成员加载中…</Text>
                  ) : (
                    <View style={{ gap: 6 }}>
                      {activeMembers.map(m => (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.sectionHeaderBg, borderRadius: 7, padding: 9, borderLeftWidth: 3, borderLeftColor: FACTION_COLOR[m.faction] ?? '#888' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                              <Text style={{ fontSize: 12, fontWeight: '700', color: theme.headerText }}>{m.name}</Text>
                              <Text style={{ fontSize: 9, color: FACTION_COLOR[m.faction] }}>{FACTION_ICONS[m.faction]}{FACTION_LABEL[m.faction]}</Text>
                            </View>
                            <Text style={{ fontSize: 10, color: theme.accentSub, marginTop: 1 }}>{m.positionLabel}</Text>
                            <View style={{ flexDirection: 'row', gap: 10, marginTop: 3 }}>
                              <Text style={{ fontSize: 9, color: theme.mutedText }}>能力{m.ability}</Text>
                              <Text style={{ fontSize: 9, color: m.loyalty >= 60 ? '#22C55E' : m.loyalty < 40 ? '#EF4444' : '#F59E0B' }}>好感{m.loyalty}</Text>
                              <Text style={{ fontSize: 9, color: m.integrity >= 60 ? '#22C55E' : '#EF4444' }}>廉洁{m.integrity}</Text>
                            </View>
                          </View>
                          {m.loyalty < 40    && <View style={{ backgroundColor: '#7F1D1D', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>不服从</Text></View>}
                          {m.integrity < 40  && <View style={{ backgroundColor: '#78350F', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>廉洁隐患</Text></View>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </ScrollView>
            );
          })()}
        </>
      )}

      {/* 选人弹窗 */}
      {selectingRole && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: theme.pageBg, maxHeight: '75%', borderTopWidth: 1, borderTopColor: theme.cardBorder }}>
            <View style={{ backgroundColor: theme.quickStatBg, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ color: theme.accentSub, fontWeight: '700', fontSize: 14 }}>选择 {selectingRole.label} 人选</Text>
                <Pressable onPress={() => { setSelectingRole(null); setSearch(''); }}>
                  <Text style={{ color: theme.headerSub, fontSize: 22 }}>×</Text>
                </Pressable>
              </View>
              <TextInput
                value={search} onChangeText={setSearch}
                placeholder="搜索姓名或职务…" placeholderTextColor={theme.mutedText}
                style={{ backgroundColor: theme.sectionHeaderBg, color: theme.valueText, paddingHorizontal: 12, paddingVertical: 7, fontSize: 13, borderWidth: 1, borderColor: theme.cardBorder }}
              />
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
              {filteredSubs.length === 0 ? (
                <Text style={{ color: theme.mutedText, textAlign: 'center', padding: 20 }}>{search ? '无符合条件的下属' : '暂无可用下属'}</Text>
              ) : filteredSubs.map(sub => {
                const inBand = band.some(b => b.subId === sub.id);
                const required = selectingRole.requiredSubLevel ?? 1;
                const levelOk = sub.subLevel >= required;
                const reqName = SUB_LEVEL_NAMES[required] ?? `${required}级`;
                const subLevelName = SUB_LEVEL_NAMES[sub.subLevel] ?? `${sub.subLevel}级`;
                const fColor = FACTION_COLOR[sub.faction] ?? '#888';
                const disabled = inBand || !levelOk;
                return (
                  <Pressable key={sub.id} onPress={() => { if (!disabled) void handleAssign(sub); }}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: !levelOk ? theme.alertBorder : inBand ? theme.cardBorder : theme.sectionHeaderBorder, backgroundColor: !levelOk ? theme.alertBg : inBand ? theme.sectionHeaderBg : theme.quickStatBg, opacity: disabled ? 0.55 : 1 }}
                  >
                    <View style={{ width: 38, height: 48, backgroundColor: '#EDE8DF', borderWidth: 1, borderColor: fColor + '66', overflow: 'hidden' }}>
                      <Image
                        source={{ uri: getAvatarImageUrl(sub.avatarId ?? 0, sub.gender ?? '男', sub.position ?? '') }}
                        style={{ width: 38, height: 48 }}
                        contentFit="cover"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: disabled ? theme.mutedText : theme.headerText }}>{sub.name}</Text>
                        <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor + '66', paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: fColor }}>{FACTION_LABEL[sub.faction]}</Text>
                        </View>
                        <View style={{ backgroundColor: levelOk ? '#1a3a2e' : '#3a1a1a', borderWidth: 1, borderColor: levelOk ? '#2a5a3e' : '#6a2a2a', paddingHorizontal: 4, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: levelOk ? '#4CAF90' : '#CC5544' }}>{subLevelName}</Text>
                        </View>
                        {inBand && <View style={{ backgroundColor: '#1E3050', paddingHorizontal: 5, paddingVertical: 1 }}><Text style={{ fontSize: 9, color: '#5577AA' }}>已在班子</Text></View>}
                      </View>
                      <Text style={{ fontSize: 11, color: '#5577AA' }}>能力 {sub.ability} · 忠诚 {sub.loyalty} · 廉洁 {sub.integrity}</Text>
                      {!levelOk && <Text style={{ fontSize: 10, color: theme.primary, marginTop: 2 }}>⚠ 需 {reqName}，当前 {subLevelName}，职级不足</Text>}
                    </View>
                    {!disabled && (
                      <View style={{ backgroundColor: theme.statHigh, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>选择</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 民主评议弹窗 */}
      {reviewState && save && (
        <DemocraticReview
          visible={!!reviewState}
          candidate={{ name: reviewState.sub.name, faction: reviewState.sub.faction, ability: reviewState.sub.ability, loyalty: reviewState.sub.loyalty, integrity: reviewState.sub.integrity, targetRole: reviewState.role.label }}
          participants={band.map(m => subs.find(s => s.id === m.subId)).filter((s): s is Subordinate => !!s)}
          approvalLevel={reviewState.approvalLevel}
          onConfirm={() => void handleReviewConfirm()}
          onForceConfirm={() => void handleReviewForceConfirm()}
          onCancel={() => setReviewState(null)}
        />
      )}

      {/* NPC个人档案弹窗 */}
      {selectedMember && (
        <CareerModal
          member={selectedMember}
          onClose={() => setSelectedMember(null)}
          rankLevel={playerRank}
          playerBirthProvince={save.birthProvince}
          playerBirthCity={save.birthCity}
          playerUniversity={save.universityName}
          saveCityName={save.cityName}
        />
      )}
    </View>
  );
}
