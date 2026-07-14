/**
 * 干部晋升制度系统
 * 以《公务员法》为基础，呈现职务职级双轨制、考核评估、年限资历、名额职数、组织决策五大维度
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { updateSave, getSubordinates } from '@/db/gameApi';
import { getRankTheme } from '@/lib/rankTheme';
import { RANK_CONFIG } from '@/types/game';

// ── 职级并行制度：职级对照表 ──────────────────────────────────────────────────
// 职务级（1-15）→ 职级区间（综合管理类）
const PROF_RANK_RANGE: Record<number, { min: number; max: number; label: string }> = {
  1:  { min: 1,  max: 5,  label: '一级至五级科员' },
  2:  { min: 3,  max: 8,  label: '三级主任科员至八级科员' },
  3:  { min: 2,  max: 6,  label: '二级至六级主任科员' },
  4:  { min: 1,  max: 4,  label: '一级主任科员至四级调研员' },
  5:  { min: 1,  max: 3,  label: '一级至三级调研员' },
  6:  { min: 1,  max: 4,  label: '一级调研员至四级巡视员' },
  7:  { min: 1,  max: 3,  label: '二级至四级巡视员' },
  8:  { min: 1,  max: 2,  label: '一至二级巡视员' },
  9:  { min: 1,  max: 2,  label: '一至二级巡视员' },
  10: { min: 1,  max: 2,  label: '超级别（省部级对应）' },
  11: { min: 1,  max: 1,  label: '正省部级' },
  12: { min: 1,  max: 1,  label: '副国级' },
  13: { min: 1,  max: 1,  label: '正国级' },
  14: { min: 1,  max: 1,  label: '国家最高领导级' },
  15: { min: 1,  max: 1,  label: '国家最高领导级' },
};

// 职级晋升所需年限（职级年功积累）
const PROF_RANK_YEARS: Record<number, number> = {
  1: 1, 2: 1, 3: 2, 4: 2, 5: 3,
  6: 3, 7: 4, 8: 4, 9: 5, 10: 5,
};

// 基层经历要求（职务级到达时需要的基层（rank≤6/厅级以下）累计年数）
// 厅级以下（rank1-6）统一要求>5年
const GRASSROOTS_REQ: Record<number, number> = {
  4: 5, 5: 5, 6: 5, 7: 5, 8: 5, 9: 5,
  10: 5, 11: 5, 12: 5, 13: 5, 14: 5, 15: 5,
};

// 各职务级职数限制（全局模拟，越高越稀缺）
const SLOT_TOTAL: Record<number, number> = {
  1: 9999, 2: 5000, 3: 2000, 4: 1000, 5: 500,
  6: 200,  7: 100,  8: 50,   9: 30,   10: 15,
  11: 8,   12: 4,   13: 2,   14: 1,   15: 1,
};

// 考核冷却天数
const DEMO_EVAL_COOLDOWN = 360;    // 民主测评：每年一次
const SPECIAL_ASSESS_COOLDOWN = 720; // 专项考核：每两年一次

// ── 计算职级晋升 ──────────────────────────────────────────────────────────────
function calcProfRankUp(
  rankLevel: number,
  profRank: number,
  tenureYears: number,
): { canUp: boolean; nextProfRank: number; label: string } {
  const range = PROF_RANK_RANGE[rankLevel] ?? { min: 1, max: 1 };
  const nextProfRank = profRank + 1;
  const yearsReq = PROF_RANK_YEARS[profRank] ?? 3;
  const withinRange = nextProfRank <= range.max;
  return {
    canUp: withinRange && tenureYears >= yearsReq,
    nextProfRank: withinRange ? nextProfRank : profRank,
    label: range.label,
  };
}

// ── 组织决策阶段配置 ──────────────────────────────────────────────────────────
interface OrgDecisionPhase {
  step: number;
  icon: string;
  title: string;
  desc: string;
  req: (save: import('@/types/game').PlayerSave) => boolean;
  hint: string;
}

const ORG_PHASES: OrgDecisionPhase[] = [
  {
    step: 1, icon: '📋', title: '民主推荐',
    desc: '由同级干部及下属进行民主推荐，得票情况作为考察参考',
    req: s => (s.democraticEvalScore ?? 0) >= 60,
    hint: '民主测评分需≥60',
  },
  {
    step: 2, icon: '🔍', title: '组织考察',
    desc: '组织部门对候选人的政治素质、廉洁自律、能力实绩进行实地考察',
    req: s => (s.moralValue ?? 0) >= 50 && (s.specialAssessScore ?? 0) >= 60,
    hint: '廉洁值≥50且专项考核分≥60',
  },
  {
    step: 3, icon: '💬', title: '征求意见',
    desc: '征求拟任职地区或单位主要领导及有关部门意见，听取多方建议',
    req: s => (s.bossFavor ?? 0) >= 50 && (s.boss2Favor ?? 0) >= 40,
    hint: '直属上司好感≥50，二级上司好感≥40',
  },
  {
    step: 4, icon: '🗳️', title: '讨论决定',
    desc: '党委（党组）集体讨论，按票决制或表决制决定拟任人选',
    req: s => (s.meritPoints ?? 0) >= ((RANK_CONFIG[s.rankLevel ?? 1])?.requiredMerit ?? 100),
    hint: '政绩积分达到本级晋升要求',
  },
  {
    step: 5, icon: '📢', title: '任前公示',
    desc: '在一定范围内公示拟提任人选，接受群众监督，公示期不少于5个工作日',
    req: s => (s.tenureYears ?? 0) >= ((RANK_CONFIG[s.rankLevel ?? 1])?.requiredTenureYears ?? 2),
    hint: '任职年限达到本级晋升要求',
  },
];

// ── 辅助：基于年份+职级的伪随机种子（确保同年同级相同值）──────────────────
function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed + 1) * 10000;
  const frac = x - Math.floor(x);
  return Math.round(min + frac * (max - min));
}

// ── 计算某级别当年已占用职数 ────────────────────────────────────────────────
function calcOccupied(lvl: number, total: number, gameYear: number, npcCount: number): number {
  const baseRate = lvl >= 10 ? 0.97 : lvl >= 7 ? 0.92 : lvl >= 5 ? 0.87 : 0.80;
  const baseOcc = Math.round(total * baseRate);
  const swingRange = Math.max(1, Math.round(total * 0.06));
  const yearSwing = seededInt(gameYear * 31 + lvl * 7, -swingRange, swingRange);
  const rawOcc = baseOcc + yearSwing + npcCount;
  return Math.min(total - 1, Math.max(0, rawOcc));
}

// ── 主页面 ────────────────────────────────────────────────────────────────────
export default function PromotionSystemPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [activeTab, setActiveTab] = useState<'dual' | 'assess' | 'tenure' | 'slot' | 'org'>('dual');
  // NPC干部数量（按 subLevel 分组，用于动态职数计算）
  const [npcByLevel, setNpcByLevel] = useState<Record<number, number>>({});

  useFocusEffect(useCallback(() => {
    setMsg('');
    if (save?.id) {
      void getSubordinates(save.id).then(subs => {
        const cnt: Record<number, number> = {};
        for (const s of subs) {
          const lv = s.subLevel ?? 1;
          cnt[lv] = (cnt[lv] ?? 0) + 1;
        }
        setNpcByLevel(cnt);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [save?.id]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const theme = getRankTheme(save.rankLevel ?? 1);
  const rankLevel = save.rankLevel ?? 1;
  const profRank = save.professionalRankLevel ?? 1;
  const grassroots = save.grassrootsExpYears ?? 0;
  const specialScore = save.specialAssessScore ?? 0;
  const demoScore = save.democraticEvalScore ?? 0;
  const slotWait = save.slotWaitYears ?? 0;
  const gameDays = save.gameDays ?? 0;
  const gameYear = Math.floor(gameDays / 365);

  const profRankInfo = calcProfRankUp(rankLevel, profRank, save.tenureYears ?? 0);
  const grassrootsReq = GRASSROOTS_REQ[rankLevel] ?? 0;
  const slotTotal = SLOT_TOTAL[rankLevel] ?? 1;
  // 当前级别动态职数
  const curOccupied = calcOccupied(rankLevel, slotTotal, gameYear, npcByLevel[rankLevel] ?? 0);
  const curVacancy = slotTotal - curOccupied;

  // 冷却检查
  const demoCooldownLeft = Math.max(0, (save.lastDemoEvalDay ?? 0) + DEMO_EVAL_COOLDOWN - gameDays);
  const specialCooldownLeft = Math.max(0, (save.lastSpecialAssessDay ?? 0) + SPECIAL_ASSESS_COOLDOWN - gameDays);
  const canDemoEval = demoCooldownLeft === 0;
  const canSpecialAssess = specialCooldownLeft === 0;

  // ── 处理函数 ────────────────────────────────────────────────────────────────
  // 发起民主测评
  async function handleDemoEval() {
    if (!save || !canDemoEval || acting) return;
    setActing(true);
    try {
      // 测评分 = 廉洁×0.4 + 能力×0.3 + 上司好感均值×0.2 + 随机±10
      const base = (save.moralValue ?? 0) * 0.4 + (save.abilityValue ?? 0) * 0.3
        + ((save.bossFavor ?? 0) + (save.boss2Favor ?? 0)) / 2 * 0.2;
      const noise = (Math.random() - 0.5) * 20;
      const score = Math.min(100, Math.max(10, Math.round(base + noise)));
  // 基层经历：rank1-6时（厅级以下）每次测评+0.5年基层经历（自动积累）
      const newGrassroots = rankLevel <= 6 ? grassroots + 0.5 : grassroots;
      const newSave = await updateSave(save.id, {
        democraticEvalScore: score,
        lastDemoEvalDay: gameDays,
        grassrootsExpYears: newGrassroots,
      });
      if (newSave) {
        updateGameSave(newSave);
        setMsgOk(score >= 60);
        { const _ps1=`民主测评完成，得分：${score}分${score >= 60 ? '（达标 ✓）' : '（未达标，需60分以上）'}${rankLevel <= 6 ? '\n基层工作经历 +0.5年' : ''}`; void saveResult('promoSys_assess', {ok:score>=60,desc:_ps1,day:save.gameDays??0}); setMsg(_ps1); }
      } else { setMsgOk(false); setMsg('网络异常，请稍后重试'); }
    } catch { setMsgOk(false); setMsg('操作失败'); } finally { setActing(false); }
  }

  // 发起专项考核
  async function handleSpecialAssess() {
    if (!save || !canSpecialAssess || acting) return;
    setActing(true);
    try {
      // 专项考核分 = 政绩达标率×40 + 廉洁×30 + 能力×20 + 随机±10
      const meritRate = Math.min(1, (save.meritPoints ?? 0) / Math.max(1, RANK_CONFIG[rankLevel]?.requiredMerit ?? 100));
      const base = meritRate * 40 + (save.moralValue ?? 0) * 0.3 + (save.abilityValue ?? 0) * 0.2;
      const noise = (Math.random() - 0.5) * 20;
      const score = Math.min(100, Math.max(10, Math.round(base + noise)));
      const newSave = await updateSave(save.id, {
        specialAssessScore: score,
        lastSpecialAssessDay: gameDays,
      });
      if (newSave) {
        updateGameSave(newSave);
        setMsgOk(score >= 60);
        setMsg(`专项考核完成，得分：${score}分${score >= 60 ? '（合格 ✓）' : '（不合格，需60分以上）'}`);
      } else { setMsgOk(false); setMsg('网络异常'); }
    } catch { setMsgOk(false); setMsg('操作失败'); } finally { setActing(false); }
  }

  // 职级晋升（职级轨，独立于职务晋升）
  async function handleProfRankUp() {
    if (!save || !profRankInfo.canUp || acting) return;
    setActing(true);
    try {
      const newSave = await updateSave(save.id, {
        professionalRankLevel: profRankInfo.nextProfRank,
        meritPoints: (save.meritPoints ?? 0) + 30,
      });
      if (newSave) {
        updateGameSave(newSave);
        setMsgOk(true);
        setMsg(`职级晋升！当前职级：${profRankInfo.nextProfRank}级（政绩+30）`);
      } else { setMsgOk(false); setMsg('网络异常'); }
    } catch { setMsgOk(false); setMsg('操作失败'); } finally { setActing(false); }
  }

  // ── Tab 内容 ─────────────────────────────────────────────────────────────────
  const TABS: { key: typeof activeTab; icon: string; label: string }[] = [
    { key: 'dual',   icon: '⚖️', label: '双轨制' },
    { key: 'assess', icon: '📊', label: '考核评估' },
    { key: 'tenure', icon: '📅', label: '年限资历' },
    { key: 'slot',   icon: '🎯', label: '名额职数' },
    { key: 'org',    icon: '🏛️', label: '组织决策' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      {/* 标题栏 */}
      <View style={{ backgroundColor: theme.primary, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>干部晋升制度</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>职务职级并行 · 五大维度综合考量</Text>
      </View>

      {/* Tab 导航 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.cardBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            onPress={() => { setActiveTab(t.key); setMsg(''); }}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === t.key ? theme.primary : 'transparent' }}
          >
            <Text style={{ fontSize: 14 }}>{t.icon}</Text>
            <Text style={{ fontSize: 10, color: activeTab === t.key ? theme.primary : theme.mutedText, fontWeight: activeTab === t.key ? '700' : '400', marginTop: 2 }}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

        {/* ── Tab 1: 职务职级双轨制 ── */}
        {activeTab === 'dual' && (
          <>
            {/* 说明 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.valueText, marginBottom: 6 }}>职务与职级并行制度</Text>
              <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 20 }}>
                根据《公务员法》，综合管理类公务员实行职务与职级并行制度：{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>职务轨</Text>：领导职务（正职/副职），需通过晋升页面提拔{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>职级轨</Text>：非领导职级（科员→主任科员→调研员→巡视员），按年限自动晋升，享受相应待遇
              </Text>
            </View>

            {/* 当前状态 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>当前双轨状态</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: theme.primary + '15', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: theme.primary, fontWeight: '700' }}>职务轨</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.primary, marginVertical: 4 }}>
                    {rankLevel}级
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText, textAlign: 'center' }}>{RANK_CONFIG[rankLevel]?.name ?? ''}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#7C3AED15', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700' }}>职级轨</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#7C3AED', marginVertical: 4 }}>
                    {profRank}级
                  </Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText, textAlign: 'center' }}>{PROF_RANK_RANGE[rankLevel]?.label ?? '—'}</Text>
                </View>
              </View>
            </View>

            {/* 职级晋升 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700', letterSpacing: 1, marginBottom: 10 }}>职级轨晋升（年功积累）</Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: theme.valueText }}>当前职级：{profRank}级</Text>
                <Text style={{ fontSize: 12, color: theme.valueText }}>区间：{PROF_RANK_RANGE[rankLevel]?.min}~{PROF_RANK_RANGE[rankLevel]?.max}级</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <Text style={{ fontSize: 12, color: theme.mutedText }}>所需年限：{PROF_RANK_YEARS[profRank] ?? 3}年</Text>
                <Text style={{ fontSize: 12, color: theme.mutedText }}>已任职：{save.tenureYears ?? 0}年</Text>
              </View>
              {msg ? (
                <View style={{ backgroundColor: msgOk ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: msgOk ? '#86efac' : '#fca5a5', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                  <Text style={{ color: msgOk ? '#166534' : '#991b1b', fontSize: 12, lineHeight: 18 }}>{msg}</Text>
                </View>
              ) : null}
              <Pressable
                onPress={handleProfRankUp}
                disabled={!profRankInfo.canUp || acting}
                style={{ backgroundColor: profRankInfo.canUp ? '#7C3AED' : '#D1D5DB', borderRadius: 10, padding: 12, alignItems: 'center', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    {profRankInfo.canUp ? `申请职级晋升 → ${profRankInfo.nextProfRank}级（政绩+30）` : '年限未满，暂无法晋升职级'}
                  </Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        {/* ── Tab 2: 考核评估 ── */}
        {activeTab === 'assess' && (
          <>
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.valueText, marginBottom: 6 }}>考核评估体系</Text>
              <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 20 }}>
                通过多元考核量化干部表现，作为晋升的核心依据：{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>年度考核</Text>：每年末对本年度工作进行全面考评，结果分优秀/良好/称职/不称职{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>专项考核</Text>：上级就某项重点工作开展专题督查，每两年一次，成绩计入档案{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>民主测评</Text>：同级及下属无记名打分，重点考察廉洁、协作与群众认可度，每年一次
              </Text>
            </View>

            {/* 当前分数 */}
            {[
              { label: '年度考核等级', icon: '📅', value: save.assessmentGrade ?? '未评', unit: '', color: save.assessmentGrade === '优秀' ? '#059669' : save.assessmentGrade === '良好' ? '#2563EB' : '#D97706', pct: 0 },
              { label: '专项考核得分', icon: '🔍', value: String(specialScore), unit: '分', color: specialScore >= 80 ? '#059669' : specialScore >= 60 ? '#2563EB' : '#DC2626', pct: specialScore },
              { label: '民主测评得分', icon: '🗳️', value: String(demoScore), unit: '分', color: demoScore >= 80 ? '#059669' : demoScore >= 60 ? '#2563EB' : '#DC2626', pct: demoScore },
            ].map(item => (
              <View key={item.label} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 10, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: item.pct > 0 ? 8 : 0 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '600' }}>{item.label}</Text>
                  </View>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: item.color }}>{item.value}{item.unit}</Text>
                </View>
                {item.pct > 0 && (
                  <View style={{ backgroundColor: theme.progressBg, borderRadius: 4, height: 6 }}>
                    <View style={{ width: `${item.pct}%`, height: 6, backgroundColor: item.color, borderRadius: 4 }} />
                  </View>
                )}
              </View>
            ))}

            {/* 操作按钮 */}
            {msg ? (
              <View style={{ backgroundColor: msgOk ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: msgOk ? '#86efac' : '#fca5a5', borderRadius: 8, padding: 10 }}>
                <Text style={{ color: msgOk ? '#166534' : '#991b1b', fontSize: 12, lineHeight: 18 }}>{msg}</Text>
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <Pressable
                onPress={handleDemoEval}
                disabled={!canDemoEval || acting}
                style={{ backgroundColor: canDemoEval ? '#2563EB' : '#D1D5DB', borderRadius: 10, padding: 14, alignItems: 'center', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                      {canDemoEval ? '🗳️ 发起民主测评（每年一次）' : `民主测评冷却中：${Math.ceil(demoCooldownLeft / 30)}个月后可用`}
                    </Text>
                    {canDemoEval && (
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>由廉洁值、能力值、上司好感综合计算</Text>
                    )}
                  </>
                )}
              </Pressable>
              <Pressable
                onPress={handleSpecialAssess}
                disabled={!canSpecialAssess || acting}
                style={{ backgroundColor: canSpecialAssess ? '#059669' : '#D1D5DB', borderRadius: 10, padding: 14, alignItems: 'center', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                      {canSpecialAssess ? '🔍 接受专项考核（每两年一次）' : `专项考核冷却中：${Math.ceil(specialCooldownLeft / 30)}个月后可用`}
                    </Text>
                    {canSpecialAssess && (
                      <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>由政绩达标率、廉洁值、能力值综合评定</Text>
                    )}
                  </>
                )}
              </Pressable>
            </View>
          </>
        )}

        {/* ── Tab 3: 年限与资历 ── */}
        {activeTab === 'tenure' && (
          <>
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.valueText, marginBottom: 6 }}>年限与资历要求</Text>
              <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 20 }}>
                晋升须满足以下硬性条件：{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>最低任职年限</Text>：在现职岗位须满一定年限方可晋升{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>基层工作经历</Text>：晋升厅级及以上须有基层（乡镇/县区）工作经历累计≥5年{'\n'}
                • <Text style={{ fontWeight: '700', color: theme.valueText }}>破格提拔</Text>：重大贡献者可经程序破格，但须有说明理由
              </Text>
            </View>

            {/* 任职年限进度 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700', marginBottom: 10 }}>当前任职年限</Text>
              {(() => {
                const req = RANK_CONFIG[rankLevel]?.requiredTenureYears ?? 2;
                const cur = save.tenureYears ?? 0;
                const pct = Math.min(100, (cur / req) * 100);
                const ok = cur >= req;
                return (
                  <>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                      <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '600' }}>{cur} 年</Text>
                      <Text style={{ fontSize: 13, color: ok ? '#059669' : '#D97706', fontWeight: '700' }}>要求 {req} 年 {ok ? '✓' : '…'}</Text>
                    </View>
                    <View style={{ backgroundColor: theme.progressBg, borderRadius: 6, height: 8 }}>
                      <View style={{ width: `${pct}%`, height: 8, backgroundColor: ok ? '#059669' : theme.primary, borderRadius: 6 }} />
                    </View>
                    {!ok && <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 4 }}>还需 {req - cur} 年</Text>}
                  </>
                );
              })()}
            </View>

            {/* 基层工作经历 */}
            {grassrootsReq > 0 && (
              <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
                <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700', marginBottom: 10 }}>基层工作经历（厅级以下需≥5年）</Text>
                {(() => {
                  const pct = Math.min(100, (grassroots / grassrootsReq) * 100);
                  const ok = grassroots >= grassrootsReq;
                  return (
                    <>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '600' }}>{grassroots.toFixed(1)} 年</Text>
                        <Text style={{ fontSize: 13, color: ok ? '#059669' : '#D97706', fontWeight: '700' }}>要求 {grassrootsReq} 年 {ok ? '✓' : '…'}</Text>
                      </View>
                      <View style={{ backgroundColor: theme.progressBg, borderRadius: 6, height: 8 }}>
                        <View style={{ width: `${pct}%`, height: 8, backgroundColor: ok ? '#059669' : '#D97706', borderRadius: 6 }} />
                      </View>
        <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 4 }}>在厅级以下（1~6级）任职的工作年数{'\n'}通过发起民主测评可积累基层经历（每次+0.5年）</Text>
                    </>
                  );
                })()}
              </View>
            )}

            {/* 各级年限一览 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700', marginBottom: 10 }}>全职级年限要求一览</Text>
              {([1,2,3,4,5,6,7,8,9,10,11,12,13,14] as const).map(lvl => {
                const cfg = RANK_CONFIG[lvl];
                const isNow = lvl === rankLevel;
                return (
                  <View key={lvl} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder + '60', backgroundColor: isNow ? theme.primary + '10' : 'transparent', borderRadius: isNow ? 6 : 0, paddingHorizontal: isNow ? 6 : 0 }}>
                    <Text style={{ width: 28, fontSize: 12, color: theme.mutedText }}>{lvl}级</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: isNow ? theme.primary : theme.valueText, fontWeight: isNow ? '700' : '400' }}>{cfg.name}</Text>
                    <Text style={{ fontSize: 12, color: theme.mutedText }}>≥ {cfg.requiredTenureYears} 年</Text>
                    {GRASSROOTS_REQ[lvl] ? <Text style={{ fontSize: 11, color: '#D97706', marginLeft: 8 }}>基层≥{GRASSROOTS_REQ[lvl]}年</Text> : null}
                    {isNow && <Text style={{ fontSize: 11, color: theme.primary, marginLeft: 4, fontWeight: '700' }}>← 当前</Text>}
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Tab 4: 名额与职数 ── */}
        {activeTab === 'slot' && (
          <>
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.valueText, marginBottom: 6 }}>名额与职数限制</Text>
              <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 20 }}>
                各级职务职数有严格限制，是影响晋升时机的客观约束：{'\n'}
                • 职数满员时，即使达到所有晋升条件也须等待{'\n'}
                • 领导职务"一正多副"，副职人数有上限规定{'\n'}
                • 撤退（退休/调任/免职）时将释放职数名额{'\n'}
                • 职数每年随人事调整动态变化，年初更新
              </Text>
            </View>

            {/* 当前级别职数（动态） */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700' }}>当前级别职数状态</Text>
                <View style={{ backgroundColor: theme.primary + '22', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, color: theme.primary, fontWeight: '700' }}>{Math.floor(gameDays / 365) + 2000}年度</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1, backgroundColor: '#2563EB15', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#2563EB', fontWeight: '700' }}>编制总额</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#2563EB' }}>{slotTotal.toLocaleString()}</Text>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>{RANK_CONFIG[rankLevel]?.name}</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#92400E15', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: '#92400E', fontWeight: '700' }}>已占用</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#92400E' }}>{curOccupied.toLocaleString()}</Text>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>NPC+在职干部</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: curVacancy > 0 ? '#05966915' : '#DC262615', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: curVacancy > 0 ? '#059669' : '#DC2626', fontWeight: '700' }}>空缺名额</Text>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: curVacancy > 0 ? '#059669' : '#DC2626' }}>{curVacancy}</Text>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>{curVacancy > 0 ? '可晋升' : '需等待'}</Text>
                </View>
              </View>
              {/* 占用进度条 */}
              <View style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 10, color: theme.mutedText }}>职数占用率</Text>
                  <Text style={{ fontSize: 10, color: theme.mutedText, fontWeight: '700' }}>
                    {Math.round((curOccupied / slotTotal) * 100)}%
                  </Text>
                </View>
                <View style={{ backgroundColor: theme.progressBg, borderRadius: 4, height: 8 }}>
                  <View style={{
                    width: `${Math.min(100, Math.round((curOccupied / slotTotal) * 100))}%`,
                    height: 8, borderRadius: 4,
                    backgroundColor: curVacancy > 0 ? theme.primary : '#DC2626',
                  }} />
                </View>
              </View>
              <Text style={{ fontSize: 11, color: theme.mutedText, lineHeight: 17 }}>
                本年度含 {npcByLevel[rankLevel] ?? 0} 名同级NPC干部在职，每年人事调整后数据更新。
                {slotWait > 0 ? `\n⚠️ 系统预估需等待约 ${slotWait} 年方有空缺。` : '\n✅ 当前有晋升空缺，条件满足即可申报。'}
              </Text>
            </View>

            {/* 全职级职数一览（动态） */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 12, color: theme.mutedText, fontWeight: '700', marginBottom: 10 }}>全职级职数配额（{Math.floor(gameDays / 365) + 2000}年度）</Text>
              {([1,2,3,4,5,6,7,8,9,10,11,12,13,14] as const).map(lvl => {
                const isNow = lvl === rankLevel;
                const total = SLOT_TOTAL[lvl];
                const occ = calcOccupied(lvl, total, gameYear, npcByLevel[lvl] ?? 0);
                const vac = total - occ;
                const occPct = Math.min(100, Math.round((occ / total) * 100));
                const barColor = isNow ? theme.primary : vac > 0 ? '#059669' : '#DC2626';
                return (
                  <View key={lvl} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <Text style={{ fontSize: 11, color: isNow ? theme.primary : theme.valueText, fontWeight: isNow ? '800' : '400' }}>
                        {RANK_CONFIG[lvl]?.name ?? `${lvl}级`}{isNow ? ' ◀ 当前' : ''}
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: theme.mutedText }}>
                          {total >= 1000 ? (total / 1000).toFixed(0) + 'k' : total}编
                        </Text>
                        <Text style={{ fontSize: 10, color: barColor, fontWeight: '700' }}>
                          空缺{vac >= 1000 ? (vac / 1000).toFixed(1) + 'k' : vac}
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: theme.progressBg, borderRadius: 3, height: 5 }}>
                      <View style={{ width: `${occPct}%`, height: 5, backgroundColor: barColor, borderRadius: 3 }} />
                    </View>
                  </View>
                );
              })}
              <Text style={{ fontSize: 10, color: theme.mutedText, marginTop: 4, lineHeight: 16 }}>
                * 数据含全国NPC在职干部及年度人事变动，每年浮动3~8%。正国级（13级）全国仅2席，正常情况须等待职数自然释放。
              </Text>
            </View>
          </>
        )}

        {/* ── Tab 5: 组织决策 ── */}
        {activeTab === 'org' && (
          <>
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: theme.valueText, marginBottom: 6 }}>组织决策程序</Text>
              <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 20 }}>
                干部晋升由党委（党组）或组织部门主导，经过五个法定程序，确保公正、透明、可监督。
              </Text>
            </View>

            {ORG_PHASES.map(phase => {
              const passed = phase.req(save);
              return (
                <View key={phase.step} style={{ backgroundColor: theme.cardBg, borderWidth: 1.5, borderColor: passed ? '#05966950' : theme.cardBorder, borderRadius: 12, padding: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: passed ? '#05966920' : theme.progressBg, justifyContent: 'center', alignItems: 'center' }}>
                      <Text style={{ fontSize: 18 }}>{passed ? '✅' : phase.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <View style={{ backgroundColor: theme.primary, borderRadius: 10, width: 20, height: 20, justifyContent: 'center', alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>{phase.step}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: passed ? '#059669' : theme.valueText }}>
                          {phase.title}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 18, marginBottom: 6 }}>{phase.desc}</Text>
                      <View style={{ backgroundColor: passed ? '#05966910' : '#FEF9C3', borderRadius: 6, padding: 8 }}>
                        <Text style={{ fontSize: 11, color: passed ? '#059669' : '#92400E', fontWeight: '600' }}>
                          {passed ? '✓ 已达成' : `⚠️ 未达成：${phase.hint}`}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}

            {/* 整体达标情况 */}
            {(() => {
              const passedCount = ORG_PHASES.filter(p => p.req(save)).length;
              const allPassed = passedCount === ORG_PHASES.length;
              return (
                <View style={{ backgroundColor: allPassed ? '#05966915' : theme.cardBg, borderWidth: 1.5, borderColor: allPassed ? '#059669' : theme.cardBorder, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, marginBottom: 6 }}>{allPassed ? '🎉' : '⏳'}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: allPassed ? '#059669' : theme.valueText }}>
                    组织决策程序：{passedCount} / {ORG_PHASES.length} 项已达成
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.mutedText, marginTop: 4, textAlign: 'center' }}>
                    {allPassed ? '所有程序条件已满足，可前往晋升页面申请提拔' : '前往各维度完善相关条件后，方可启动组织程序'}
                  </Text>
                  {allPassed && (
                    <Pressable
                      onPress={() => router.push('/(app)/promotion' as never)}
                      style={{ marginTop: 12, backgroundColor: '#059669', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>前往晋升申请 →</Text>
                    </Pressable>
                  )}
                </View>
              );
            })()}
          </>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
