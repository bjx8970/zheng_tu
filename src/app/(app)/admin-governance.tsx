/**
 * 行政线专项系统 —— 综合治理深度玩法
 * 涵盖：政策改革 / 行政效能 / 社会治理 / 区域发展 四大类
 * 全部行动无等级锁定，专项资金按职级动态定价
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import { getRankCostMultiplier } from '@/lib/lineGameplay';

// ─────────────────────────── 类型定义 ─────────────────────────────────────────

type Category = '政策改革' | '行政效能' | '社会治理' | '区域发展';

interface Outcome {
  desc: string;
  merit: number;
  fundDelta?: number;
  bossFavor?: number;
  publicOpinion?: number;
  networkValue?: number;
  inspectionRisk?: number;
  lineKpi?: number;
}

interface GovAction {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  category: Category;
  baseCost: number;      // 万元专项资金（Rank1-3基准，按职级自动放大）
  cooldownDays: number;
  successRate: number;   // 0–100
  successOutcome: Outcome;
  failOutcome: Outcome;
  countField?: keyof import('@/types/game').PlayerSave; // 累计计数字段
  once?: boolean;        // 一次性行动
  networkCost?: number;  // 消耗人脉
}

// ─────────────────────────── 行动数据表 ───────────────────────────────────────

const ACTIONS: GovAction[] = [
  // ── 政策改革 ────────────────────────────────────────────────────────────────
  {
    key: 'policy_pilot', icon: '🧪', category: '政策改革',
    title: '改革试点申报', subtitle: '向上级争取试点城市资格',
    desc: '向省委申请成为改革试点城市，获批后享受专项政策红利；失败则遭上级通报批评。',
    baseCost: 80, cooldownDays: 180, successRate: 60,
    countField: 'policyPilotCount',
    successOutcome: { merit: 80, bossFavor: 8, fundDelta: 150, publicOpinion: 8, lineKpi: 15, desc: '试点申报获批！享受政策红利，争取到省级专项补贴 +150万' },
    failOutcome:    { merit: -20, publicOpinion: -15, fundDelta: -30, lineKpi: 0, desc: '申报失败，上级通报批评，前期公关费用打水漂' },
  },
  {
    key: 'institution_reform', icon: '✂️', category: '政策改革',
    title: '机构精简改革', subtitle: '裁撤冗余行政机构节约成本',
    desc: '精简行政机构，裁撤冗余部门，降低行政运营成本。被裁员工可能引发群体事件。',
    baseCost: 50, cooldownDays: 120, successRate: 70,
    countField: 'institutionReformCount',
    successOutcome: { merit: 40, bossFavor: 5, fundDelta: 80, publicOpinion: 5, lineKpi: 10, desc: '机构精简成功，节约行政支出 +80万，内部管理效率大幅提升' },
    failOutcome:    { merit: 15, publicOpinion: -20, fundDelta: -40, lineKpi: 0, desc: '裁员引发群体上访，舆论持续发酵，付出安抚费用 -40万' },
  },
  {
    key: 'policy_pilot_national', icon: '🌟', category: '政策改革',
    title: '国家级政策争取', subtitle: '争取国家级特殊政策支持',
    desc: '联合其他地市向国家部委争取差异化政策支持，打造区域政策高地。',
    baseCost: 120, cooldownDays: 365, successRate: 45,
    networkCost: 20,
    successOutcome: { merit: 120, bossFavor: 15, fundDelta: 300, publicOpinion: 12, lineKpi: 25, networkValue: 10, desc: '国家级政策落地！引发全国关注，专项拨款 +300万' },
    failOutcome:    { merit: -10, publicOpinion: -5, fundDelta: -50, desc: '国家部委未予批复，前期公关投入付诸东流' },
  },
  {
    key: 'regulatory_sandbox', icon: '🏖️', category: '政策改革',
    title: '监管沙盒试验', subtitle: '为新兴产业建立包容监管体系',
    desc: '针对新兴业态建立"边发展边规范"的包容性监管机制，吸引先进产业落户。',
    baseCost: 60, cooldownDays: 150, successRate: 65,
    successOutcome: { merit: 55, bossFavor: 6, fundDelta: 100, lineKpi: 12, publicOpinion: 8, desc: '监管沙盒获得企业好评，多家创新型企业申请入驻' },
    failOutcome:    { merit: 10, publicOpinion: -10, desc: '沙盒机制遭传统监管部门抵制，政策落地效果打折' },
  },

  // ── 行政效能 ────────────────────────────────────────────────────────────────
  {
    key: 'approval_race', icon: '⚡', category: '行政效能',
    title: '行政审批提速竞赛', subtitle: '压缩审批时限、打通堵点',
    desc: '在全系统开展"最多跑一次"审批提速竞赛，设立负面清单，倒逼流程优化。',
    baseCost: 30, cooldownDays: 90, successRate: 80,
    countField: 'approvalRaceCount',
    successOutcome: { merit: 35, bossFavor: 4, publicOpinion: 10, lineKpi: 8, desc: '审批时限压缩 40%，营商环境评分显著提升' },
    failOutcome:    { merit: 8, publicOpinion: -8, desc: '部分部门阳奉阴违，提速效果大打折扣，舆论质疑声不断' },
  },
  {
    key: 'digital_gov', icon: '💻', category: '行政效能',
    title: '数字政府平台建设', subtitle: '一网通办·数字化转型',
    desc: '统筹建设政务服务综合平台，实现跨部门数据共享，推动政务服务全程网办。',
    baseCost: 200, cooldownDays: 0, successRate: 100,
    once: true,
    countField: 'digitalGovBuilt' as never,
    successOutcome: { merit: 100, bossFavor: 12, publicOpinion: 20, lineKpi: 30, fundDelta: -200, desc: '数字政府平台上线！政务服务效率提升 60%，全国通报表扬' },
    failOutcome:    { merit: 0, desc: '平台已建成，无需重复建设' },
  },
  {
    key: 'hall_satisfy', icon: '🏛️', category: '行政效能',
    title: '政务大厅满意度攻坚', subtitle: '提升群众办事体验',
    desc: '全面整改政务大厅服务短板，开展暗访督查，实行末位淘汰制度。',
    baseCost: 25, cooldownDays: 60, successRate: 85,
    countField: 'hallSatisfyCount',
    successOutcome: { merit: 28, publicOpinion: 15, bossFavor: 3, lineKpi: 6, desc: '政务大厅满意度提升至 92%，省级通报表扬' },
    failOutcome:    { merit: 5, publicOpinion: -12, desc: '暗访发现服务依然问题突出，媒体曝光引发舆论压力' },
  },
  {
    key: 'info_public', icon: '📣', category: '行政效能',
    title: '政府信息公开攻坚', subtitle: '主动公开政府决策过程',
    desc: '推行权力清单和责任清单公开，开展预算信息主动公开专项行动，接受社会监督。',
    baseCost: 15, cooldownDays: 60, successRate: 90,
    countField: 'infoPublicCount',
    successOutcome: { merit: 22, publicOpinion: 12, bossFavor: 2, lineKpi: 5, inspectionRisk: -3, desc: '信息公开获得公众好评，廉洁形象大幅提升' },
    failOutcome:    { merit: 5, publicOpinion: -5, desc: '公开内容不完整，被媒体点名批评，舆论信任度下降' },
  },

  // ── 社会治理 ────────────────────────────────────────────────────────────────
  {
    key: 'admin_litigation', icon: '⚖️', category: '社会治理',
    title: '行政诉讼应对体系', subtitle: '规范行政执法降低败诉率',
    desc: '建立行政应诉工作机制，行政机关负责人出庭应诉，倒逼行政执法规范化。',
    baseCost: 20, cooldownDays: 90, successRate: 75,
    countField: 'adminLitigationCount',
    successOutcome: { merit: 30, publicOpinion: 8, inspectionRisk: -5, lineKpi: 7, bossFavor: 3, desc: '行政败诉率下降 30%，依法行政形象显著提升' },
    failOutcome:    { merit: -5, publicOpinion: -15, inspectionRisk: 8, desc: '应诉机制形同虚设，连续败诉引发巡视组关注' },
  },
  {
    key: 'inspection_check', icon: '🔍', category: '社会治理',
    title: '专项督查循环', subtitle: '发现整改政府工作突出问题',
    desc: '组织跨部门综合督查组，对重点领域、重点工程开展专项督查，限时整改。',
    baseCost: 35, cooldownDays: 60, successRate: 80,
    countField: 'inspectionCount',
    successOutcome: { merit: 35, bossFavor: 5, publicOpinion: 5, lineKpi: 8, desc: '督查发现 12 个重大问题，全部完成整改，获上级肯定' },
    failOutcome:    { merit: 8, publicOpinion: -8, bossFavor: -3, desc: '督查浮于表面，整改落实不到位，被上级批评走过场' },
  },
  {
    key: 'joint_meeting', icon: '🤝', category: '社会治理',
    title: '联席会议协调机制', subtitle: '跨部门协同处理复杂问题',
    desc: '建立重大问题联席会议制度，打破部门壁垒，提升多部门协同作战能力。',
    baseCost: 10, cooldownDays: 45, successRate: 85,
    countField: 'jointMeetingCount',
    successOutcome: { merit: 20, bossFavor: 4, publicOpinion: 6, lineKpi: 5, desc: '联席会议协调解决 3 项历史积案，跨部门协作机制成熟' },
    failOutcome:    { merit: 3, publicOpinion: -3, desc: '各部门推诿扯皮，联席机制形同虚设，协调工作收效甚微' },
  },
  {
    key: 'mass_appeal_resolve', icon: '📮', category: '社会治理',
    title: '信访积案化解专项', subtitle: '集中化解长期信访积案',
    desc: '对辖区长期未解决的信访积案开展集中攻坚，实行领导包案责任制。',
    baseCost: 45, cooldownDays: 120, successRate: 65,
    successOutcome: { merit: 50, publicOpinion: 18, bossFavor: 6, lineKpi: 12, inspectionRisk: -5, desc: '历史积案全面化解，群众满意度大幅提升，社会稳定明显改善' },
    failOutcome:    { merit: 5, publicOpinion: -20, inspectionRisk: 10, desc: '部分积案化解不彻底，上访群众再次进京，引发省委关注' },
  },

  // ── 区域发展 ────────────────────────────────────────────────────────────────
  {
    key: 'fiscal_warning', icon: '💰', category: '区域发展',
    title: '财政风险预警处置', subtitle: '化解地方隐性债务风险',
    desc: '建立债务风险预警系统，对高风险债务进行重组置换，防范系统性财政风险。',
    baseCost: 100, cooldownDays: 180, successRate: 70,
    countField: 'fiscalWarningCount',
    successOutcome: { merit: 60, bossFavor: 8, fundDelta: 200, lineKpi: 15, inspectionRisk: -8, desc: '成功化解 20 亿元隐性债务，获省级财政改革示范称号' },
    failOutcome:    { merit: -15, publicOpinion: -10, fundDelta: -80, desc: '债务处置不当引发债权人挤兑，财政紧张局面进一步加剧' },
  },
  {
    key: 'project_type', icon: '🏗️', category: '区域发展',
    title: '重大项目类型优化', subtitle: '调整投资结构优化产业布局',
    desc: '对在建项目结构进行系统性审查，清退低效项目，引导优质资源向高附加值领域集中。',
    baseCost: 60, cooldownDays: 120, successRate: 75,
    countField: 'projectTypeCount',
    successOutcome: { merit: 45, bossFavor: 6, fundDelta: 120, lineKpi: 10, publicOpinion: 8, desc: '产业结构优化成效显著，高技术产业占比提升 15 个百分点' },
    failOutcome:    { merit: 10, publicOpinion: -10, fundDelta: -30, desc: '项目调整触动既有利益格局，阻力重重，效果未达预期' },
  },
  {
    key: 'regional_brand', icon: '🏆', category: '区域发展',
    title: '区域品牌塑造工程', subtitle: '打造辖区城市核心竞争力',
    desc: '系统策划辖区城市品牌，整合文旅、产业、生态资源，提升区域综合竞争力。',
    baseCost: 80, cooldownDays: 180, successRate: 65,
    networkCost: 15,
    successOutcome: { merit: 65, bossFavor: 8, publicOpinion: 15, lineKpi: 14, networkValue: 8, fundDelta: 150, desc: '区域品牌获全国媒体广泛报道，招商引资额同比增长 35%' },
    failOutcome:    { merit: 5, publicOpinion: -5, fundDelta: -50, desc: '品牌推广定位模糊，市场反响平淡，预算严重超支' },
  },
  {
    key: 'green_economy', icon: '🌿', category: '区域发展',
    title: '绿色经济转型攻坚', subtitle: '推动传统产业低碳化转型',
    desc: '对高耗能、高污染企业实施差异化环境标准倒逼机制，引导绿色低碳转型。',
    baseCost: 90, cooldownDays: 150, successRate: 60,
    successOutcome: { merit: 70, bossFavor: 10, publicOpinion: 18, lineKpi: 16, fundDelta: 100, inspectionRisk: -5, desc: '绿色转型成效获生态环境部通报表扬，绿色企业税收大幅增加' },
    failOutcome:    { merit: -5, publicOpinion: -12, fundDelta: -60, desc: '传统企业抵制改造，失业率上升引发社会不稳定因素增加' },
  },
];

const CATEGORY_LIST: Category[] = ['政策改革', '行政效能', '社会治理', '区域发展'];

const CAT_ICON: Record<Category, string> = {
  政策改革: '🧪', 行政效能: '⚡', 社会治理: '🛡️', 区域发展: '🏗️',
};

const CAT_COLOR: Record<Category, string> = {
  政策改革: '#7C3AED', 行政效能: '#0369A1', 社会治理: '#065F46', 区域发展: '#9A3412',
};

// ─────────────────────────── 辅助函数 ─────────────────────────────────────────

function fmtFund(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}亿`;
  if (n >= 1) return `${Math.round(n)}万`;
  return `${n}元`;
}

interface ResultModal { title: string; desc: string; ok: boolean; rewards: string[] }

// ─────────────────────────── 主页面 ───────────────────────────────────────────

export default function AdminGovernancePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, isLoading } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [activeCategory, setActiveCategory] = useState<Category>('政策改革');
  const [acting, setActing] = useState<string | null>(null);
  const [result, setResult] = useState<ResultModal | null>(null);

  const theme = getRankThemeWithLine(save?.rankLevel ?? 1, '行政线');

  // cooldowns 直接从 save 读（乐观更新后自动同步）
  const cooldowns = (save?.adminGovCooldowns ?? {}) as Record<string, number>;

  useFocusEffect(useCallback(() => {}, []));

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.pageBg }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const rank = save.rankLevel ?? 1;
  /** 动态计算当前职级的行动花费（基准 × 职级倍率） */
  function actionCost(action: GovAction): number {
    return Math.max(1, Math.round(action.baseCost * getRankCostMultiplier(rank) / 10000) * 10000 || action.baseCost);
  }

  const gameDays = save.gameDays ?? 0;
  const balance = save.fundBalance ?? 0;

  function isCool(key: string, days: number): boolean {
    if (days === 0) return false;
    const last = cooldowns[key] ?? -1;
    return last >= 0 && gameDays - last < days;
  }
  function cdLeft(key: string, days: number): number {
    return Math.ceil(days - (gameDays - (cooldowns[key] ?? 0)));
  }
  function isOnce(action: GovAction): boolean {
    if (!action.once) return false;
    if (action.key === 'digital_gov') return !!(save?.digitalGovBuilt);
    return false;
  }

  const handleAction = async (action: GovAction) => {
    if (acting) return;
    if (isOnce(action)) {
      setResult({ title: '已完成', ok: false, desc: '该建设项目已完成，无需重复建设', rewards: [] });
      return;
    }
    if (isCool(action.key, action.cooldownDays)) {
      setResult({ title: '冷却中', ok: false, desc: `距下次可执行还需 ${cdLeft(action.key, action.cooldownDays)} 天`, rewards: [] });
      return;
    }
    if (actionCost(action) > 0 && balance < actionCost(action)) {
      setResult({ title: '资金不足', ok: false, desc: `需专项资金 ${fmtFund(actionCost(action))}，当前仅有 ${fmtFund(balance)}，请先通过城市财政渠道补充`, rewards: [] });
      return;
    }
    if (action.networkCost && (save.networkValue ?? 0) < action.networkCost) {
      setResult({ title: '人脉不足', ok: false, desc: `需消耗人脉值 ${action.networkCost}，当前 ${save.networkValue ?? 0}，请先积累人脉`, rewards: [] });
      return;
    }

    setActing(action.key);
    const isSuccess = action.successRate >= 100 ? true : Math.random() * 100 < action.successRate;
    const outcome = isSuccess ? action.successOutcome : action.failOutcome;
    const newCooldowns = { ...cooldowns, [action.key]: gameDays };

    try {
      const updates: Parameters<typeof updateGameSave>[0] = {
        adminGovCooldowns: newCooldowns,
        meritPoints: Math.round((save.meritPoints ?? 0) + outcome.merit),
      };
      if (actionCost(action) > 0) {
        updates.fundBalance = Math.max(0, balance - actionCost(action));
      }
      if (outcome.fundDelta) {
        const base = (updates.fundBalance ?? balance);
        updates.fundBalance = Math.max(0, base + outcome.fundDelta);
      }
      if (outcome.bossFavor !== undefined)
        updates.bossFavor = Math.min(100, Math.max(0, (save.bossFavor ?? 60) + outcome.bossFavor));
      if (outcome.publicOpinion !== undefined)
        updates.publicOpinionIndex = Math.min(100, Math.max(0, (save.publicOpinionIndex ?? 60) + outcome.publicOpinion));
      if (outcome.networkValue !== undefined)
        updates.networkValue = Math.min(100, Math.max(0, (save.networkValue ?? 50) + outcome.networkValue));
      if (outcome.inspectionRisk !== undefined)
        updates.inspectionRisk = Math.min(100, Math.max(0, (save.inspectionRisk ?? 20) + outcome.inspectionRisk));
      if (outcome.lineKpi !== undefined)
        updates.lineKpiScore = Math.max(0, (save.lineKpiScore ?? 0) + outcome.lineKpi);
      if (action.networkCost)
        updates.networkValue = Math.max(0, (updates.networkValue ?? save.networkValue ?? 50) - action.networkCost);
      // 计数字段
      if (action.countField && action.countField !== 'digitalGovBuilt' as never && isSuccess) {
        const cur = (save[action.countField] as number) ?? 0;
        (updates as Record<string, unknown>)[action.countField as string] = cur + 1;
      }
      if (action.key === 'digital_gov' && isSuccess) {
        updates.digitalGovBuilt = true;
        updates.digitalGovBuiltDay = gameDays;
      }

      await updateGameSave(updates);

      const rewards: string[] = [];
      if (outcome.merit > 0) rewards.push(`政绩 +${outcome.merit}`);
      if (outcome.merit < 0) rewards.push(`政绩 ${outcome.merit}`);
      if (outcome.bossFavor && outcome.bossFavor > 0) rewards.push(`上司好感 +${outcome.bossFavor}`);
      if (outcome.publicOpinion && outcome.publicOpinion > 0) rewards.push(`舆情 +${outcome.publicOpinion}`);
      if (outcome.publicOpinion && outcome.publicOpinion < 0) rewards.push(`舆情 ${outcome.publicOpinion}`);
      if (outcome.lineKpi && outcome.lineKpi > 0) rewards.push(`路线积分 +${outcome.lineKpi}`);
      if (outcome.fundDelta && outcome.fundDelta > 0) rewards.push(`资金 +${fmtFund(outcome.fundDelta)}`);
      if (outcome.fundDelta && outcome.fundDelta < 0) rewards.push(`资金 ${fmtFund(outcome.fundDelta)}`);
      if (outcome.inspectionRisk && outcome.inspectionRisk < 0) rewards.push(`廉洁风险 ${outcome.inspectionRisk}%`);
      if (outcome.networkValue && outcome.networkValue > 0) rewards.push(`人脉 +${outcome.networkValue}`);

      const resultDesc = `${outcome.desc}${rewards.length ? ' | ' + rewards.join('，') : ''}`;
      await saveResult('adminGov_' + action.key, { ok: isSuccess, desc: resultDesc, day: gameDays });
      setResult({
        title: isSuccess ? `✅ ${action.title} · 成功` : `⚠️ ${action.title} · 受阻`,
        desc: outcome.desc,
        ok: isSuccess,
        rewards,
      });
    } catch {
      setResult({ title: '系统错误', ok: false, desc: '操作失败，请稍后重试', rewards: [] });
    } finally {
      setActing(null);
    }
  };

  const visibleActions = ACTIONS.filter(a => a.category === activeCategory);

  // 综合治理指数：完成行动数累计
  const govScore =
    (save.policyPilotCount ?? 0) * 3 +
    (save.institutionReformCount ?? 0) * 2 +
    (save.approvalRaceCount ?? 0) * 2 +
    (save.hallSatisfyCount ?? 0) +
    (save.digitalGovBuilt ? 10 : 0) +
    (save.infoPublicCount ?? 0) +
    (save.adminLitigationCount ?? 0) * 2 +
    (save.inspectionCount ?? 0) +
    (save.jointMeetingCount ?? 0) +
    (save.fiscalWarningCount ?? 0) * 3 +
    (save.projectTypeCount ?? 0) * 2;

  const catColor = CAT_COLOR[activeCategory];

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />

      {/* ── 顶栏 ── */}
      <View style={{ backgroundColor: '#1e40af', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', flex: 1 }}>⚙️ 行政治理专项系统</Text>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>治理指数 {govScore}</Text>
          </View>
        </View>

        {/* 核心指标栏 */}
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[
            { icon: '💰', label: '专项资金', value: fmtFund(balance) },
            { icon: '📊', label: '政绩', value: save.meritPoints ?? 0 },
            { icon: '🌐', label: '舆情', value: save.publicOpinionIndex ?? 60 },
            { icon: '🏆', label: '路线积分', value: save.lineKpiScore ?? 0 },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 13 }}>{s.icon}</Text>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{s.value}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* 分类Tab */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {CATEGORY_LIST.map(cat => (
            <Pressable
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={{
                flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center',
                backgroundColor: activeCategory === cat ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.1)',
              }}
            >
              <Text style={{ fontSize: 14 }}>{CAT_ICON[cat]}</Text>
              <Text style={{ color: '#fff', fontSize: 9, fontWeight: activeCategory === cat ? '700' : '400', marginTop: 1 }}>{cat}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── 结果弹窗 ── */}
      {result && (
        <Pressable
          onPress={() => setResult(null)}
          style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 99, justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 24, margin: 28, width: '88%' }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: result.ok ? '#15803d' : '#b91c1c', marginBottom: 10, textAlign: 'center' }}>
              {result.title}
            </Text>
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 20, marginBottom: 14, textAlign: 'center' }}>{result.desc}</Text>
            {result.rewards.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 14 }}>
                {result.rewards.map((r, i) => (
                  <View key={i} style={{ backgroundColor: result.ok ? '#dcfce7' : '#fee2e2', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ color: result.ok ? '#166534' : '#991b1b', fontSize: 12, fontWeight: '700' }}>{r}</Text>
                  </View>
                ))}
              </View>
            )}
            <Pressable
              onPress={() => setResult(null)}
              style={{ backgroundColor: '#1e40af', borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>确认</Text>
            </Pressable>
          </View>
        </Pressable>
      )}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 28, gap: 12 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 分类说明 */}
        <View style={{ backgroundColor: catColor + '18', borderRadius: 10, borderLeftWidth: 4, borderLeftColor: catColor, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 20 }}>{CAT_ICON[activeCategory]}</Text>
          <Text style={{ flex: 1, fontSize: 12, color: catColor, fontWeight: '700' }}>
            {activeCategory === '政策改革' && '主导制度性变革，争取政策红利'}
            {activeCategory === '行政效能' && '优化政府服务效率，提升营商环境'}
            {activeCategory === '社会治理' && '化解社会矛盾，维护稳定秩序'}
            {activeCategory === '区域发展' && '统筹区域资源，驱动高质量发展'}
          </Text>
        </View>

        {/* 已解锁行动 */}
        {visibleActions.map(action => {
          const cool = isCool(action.key, action.cooldownDays);
          const done = isOnce(action);
          const busy = acting === action.key;
          const canAfford = actionCost(action) <= 0 || balance >= actionCost(action);
          const netOk = !action.networkCost || (save.networkValue ?? 0) >= action.networkCost;
          const blocked = cool || done || !canAfford || !netOk;

          return (
            <View key={action.key} style={{
              backgroundColor: theme.cardBg,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: done ? '#d1d5db' : cool ? '#e5e7eb' : theme.cardBorder,
              overflow: 'hidden',
              opacity: done ? 0.6 : 1,
            }}>
              {/* 卡片头部 */}
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12 }}>
                <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: catColor + '20', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: theme.valueText }}>{action.title}</Text>
                    {done && <View style={{ backgroundColor: '#d1d5db', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#6b7280' }}>已完成</Text></View>}
                    {cool && !done && <View style={{ backgroundColor: '#fef9c3', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#854d0e' }}>冷却 {cdLeft(action.key, action.cooldownDays)} 天</Text></View>}
                  </View>
                  <Text style={{ fontSize: 11, color: catColor, fontWeight: '600', marginTop: 2 }}>{action.subtitle}</Text>
                  <Text style={{ fontSize: 12, color: theme.labelText, marginTop: 4, lineHeight: 18 }}>{action.desc}</Text>
                </View>
              </View>

              {/* 成本 & 奖励预览 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 14, paddingBottom: 10 }}>
                {actionCost(action) > 0 && (
                  <View style={{ backgroundColor: canAfford ? '#fff7ed' : '#fee2e2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: canAfford ? '#fed7aa' : '#fca5a5' }}>
                    <Text style={{ fontSize: 11, color: canAfford ? '#9a3412' : '#b91c1c', fontWeight: '700' }}>💰 {fmtFund(actionCost(action))}</Text>
                  </View>
                )}
                {action.networkCost && (
                  <View style={{ backgroundColor: netOk ? '#ede9fe' : '#fee2e2', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: netOk ? '#c4b5fd' : '#fca5a5' }}>
                    <Text style={{ fontSize: 11, color: netOk ? '#5b21b6' : '#b91c1c', fontWeight: '700' }}>🤝 人脉 -{action.networkCost}</Text>
                  </View>
                )}
                <View style={{ backgroundColor: '#f0fdf4', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 11, color: '#166534' }}>成功率 {action.successRate}%</Text>
                </View>
                {action.successOutcome.merit > 0 && (
                  <View style={{ backgroundColor: '#f0f9ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: '#0369a1' }}>政绩 +{action.successOutcome.merit}</Text>
                  </View>
                )}
                {action.successOutcome.lineKpi ? (
                  <View style={{ backgroundColor: '#faf5ff', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: '#7c3aed' }}>积分 +{action.successOutcome.lineKpi}</Text>
                  </View>
                ) : null}
                {action.cooldownDays > 0 && (
                  <View style={{ backgroundColor: '#f9fafb', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>冷却 {action.cooldownDays} 天</Text>
                  </View>
                )}
              </View>

              {/* 执行按钮 */}
              <View style={{ padding: 12, paddingTop: 0 }}>
                {(() => { const r = getResult('adminGov_' + action.key); return r ? (
                  <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 8, padding: 9, marginBottom: 8, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '⚠️ 上次失败'} · 第{r.day}天</Text>
                    <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 15 }}>{r.desc}</Text>
                  </View>
                ) : null; })()}
                <Pressable
                  onPress={() => !blocked && !busy && handleAction(action)}
                  style={{
                    borderRadius: 10,
                    paddingVertical: 12,
                    alignItems: 'center',
                    backgroundColor: blocked || busy ? '#e5e7eb' : catColor,
                  }}
                >
                  <Text style={{ color: blocked || busy ? '#9ca3af' : '#fff', fontSize: 14, fontWeight: '700' }}>
                    {busy ? '执行中…' : done ? '已完成' : !canAfford ? '资金不足' : !netOk ? '人脉不足' : cool ? `冷却中 (${cdLeft(action.key, action.cooldownDays)}天)` : '立即执行'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {visibleActions.length === 0 && (
          <View style={{ alignItems: 'center', padding: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>🏗️</Text>
            <Text style={{ fontSize: 14, color: theme.labelText, textAlign: 'center' }}>该分类暂无可用行动</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
