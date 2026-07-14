// 以权谋私 — 灰色收入玩法，高回报高风险，触发双规风险
// 新增：贪污行动模块，贪污累计至阈值触发双规结局
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// ── 贪污行动定义 ──────────────────────────────────────────────────────────────
interface CorruptAction {
  key: string;
  icon: string;
  title: string;
  desc: string;
  amount: number;       // 贪污金额（万元）
  riskDelta: number;    // 巡视风险增加
  moralDelta: number;   // 道德值变化
  cooldownDays: number;
  minRank: number;
  severity: 'low' | 'mid' | 'high'; // 严重程度
}

const CORRUPT_ACTIONS: CorruptAction[] = [
  {
    key: 'budget_skim',
    icon: '💸',
    title: '截留专项资金',
    desc: '在项目拨款过程中截留部分资金，挪作私用。金额适中，隐蔽性较强。',
    amount: 50,
    riskDelta: 8,
    moralDelta: -8,
    cooldownDays: 20,
    minRank: 3,
    severity: 'low',
  },
  {
    key: 'procurement_kickback',
    icon: '🏗️',
    title: '工程回扣',
    desc: '在政府采购和工程项目中收取供应商回扣，金额较大，易留证据。',
    amount: 150,
    riskDelta: 15,
    moralDelta: -12,
    cooldownDays: 35,
    minRank: 5,
    severity: 'mid',
  },
  {
    key: 'land_transfer',
    icon: '🏚️',
    title: '土地出让暗操',
    desc: '在土地出让过程中压低出让金，与开发商分成。金额巨大，风险极高。',
    amount: 500,
    riskDelta: 25,
    moralDelta: -20,
    cooldownDays: 60,
    minRank: 7,
    severity: 'high',
  },
  {
    key: 'state_asset_transfer',
    icon: '🏦',
    title: '国有资产转移',
    desc: '低价变卖国有资产给关联方，从中牟利。金额最大，一旦暴露无法辩解。',
    amount: 1000,
    riskDelta: 35,
    moralDelta: -25,
    cooldownDays: 90,
    minRank: 9,
    severity: 'high',
  },
];

// 双规触发条件（满足任意一个即触发）
function checkShuangguiTrigger(
  risk: number,
  corruptTotal: number,
  moral: number,
  bribery: number,
): { triggered: boolean; reason: string } {
  if (risk >= 85) return { triggered: true, reason: '巡视风险过高，被举报立案' };
  if (corruptTotal >= 500) return { triggered: true, reason: '累计贪污金额超500万，纪委掌握证据' };
  if (moral <= 10) return { triggered: true, reason: '道德值极低，行为败露' };
  if (bribery >= 200000 && risk >= 60) return { triggered: true, reason: '受贿金额巨大且风险超标，被内部举报' };
  if (corruptTotal >= 200 && risk >= 75) return { triggered: true, reason: '贪污证据链形成，纪委介入' };
  return { triggered: false, reason: '' };
}
interface GrayAction {
  key: string;
  icon: string;
  title: string;
  subtitle: string;
  desc: string;
  riskLabel: string;
  riskColor: string;
  riskBg: string;
  cooldownDays: number; // 冷却天数
  minRank: number;
  effects: {
    grayIncome: number;          // 灰色收入（元）
    meritDelta?: number;         // 政绩变化
    moralDelta: number;          // 道德值（负数）
    riskDelta: number;           // 巡视风险（正数）
    briberyDelta?: number;       // 受贿金额
  };
}

const GRAY_ACTIONS: GrayAction[] = [
  {
    key: 'project_kickback',
    icon: '🏗️',
    title: '项目批复回扣',
    subtitle: '帮助企业审批项目',
    desc: '利用行政审批权，为特定企业开绿灯，收取工程项目回扣。涉及资金大，但证据链明显。',
    riskLabel: '高风险',
    riskColor: '#C82829',
    riskBg: '#FFF0F0',
    cooldownDays: 15,
    minRank: 3,
    effects: {
      grayIncome: 80000,
      moralDelta: -8,
      riskDelta: 6,
      briberyDelta: 80000,
    },
  },
  {
    key: 'land_profit',
    icon: '🏠',
    title: '土地出让暗利',
    subtitle: '操控土地拍卖价格',
    desc: '操作土地评估价格，为关系开发商压低底价，从中收取暗利分成。资金来源隐蔽但财产申报易露馅。',
    riskLabel: '高风险',
    riskColor: '#C82829',
    riskBg: '#FFF0F0',
    cooldownDays: 20,
    minRank: 4,
    effects: {
      grayIncome: 150000,
      moralDelta: -10,
      riskDelta: 8,
      briberyDelta: 150000,
    },
  },
  {
    key: 'illegal_approval',
    icon: '📋',
    title: '违规审批开绿灯',
    subtitle: '跳过审批流程',
    desc: '绕过正规审批程序，为关系户企业快速放行，收取手续费。短期GDP有提升，但违规记录留存。',
    riskLabel: '中高风险',
    riskColor: '#9B4400',
    riskBg: '#FFF5EE',
    cooldownDays: 10,
    minRank: 3,
    effects: {
      grayIncome: 50000,
      meritDelta: 3,
      moralDelta: -12,
      riskDelta: 9,
      briberyDelta: 50000,
    },
  },
  {
    key: 'nepotism',
    icon: '👥',
    title: '安插关系户就业',
    subtitle: '为亲属安排要职',
    desc: '利用人事权力，将亲属或关系人安排到重要岗位，虽不直接涉财但道德受损较大。',
    riskLabel: '中等风险',
    riskColor: '#7B5E2A',
    riskBg: '#FFF9E6',
    cooldownDays: 25,
    minRank: 3,
    effects: {
      grayIncome: 0,
      meritDelta: 8,
      moralDelta: -5,
      riskDelta: 3,
    },
  },
  {
    key: 'public_funds',
    icon: '💳',
    title: '公款私用',
    subtitle: '挪用公款消费',
    desc: '将部分财政资金转为个人消费，以公务名义报销私人花费，金额虽小但频率高，累积效应强。',
    riskLabel: '低风险',
    riskColor: '#2a7a3b',
    riskBg: '#F0FAF0',
    cooldownDays: 7,
    minRank: 3,
    effects: {
      grayIncome: 15000,
      moralDelta: -3,
      riskDelta: 2,
    },
  },
  {
    key: 'info_leak',
    icon: '📊',
    title: '内幕信息套现',
    subtitle: '泄露政策信息变现',
    desc: '提前向商人透露项目选址、政策走向等内幕，收取"顾问费"。操作隐蔽，但知情者多难保密。',
    riskLabel: '中等风险',
    riskColor: '#7B5E2A',
    riskBg: '#FFF9E6',
    cooldownDays: 12,
    minRank: 5,
    effects: {
      grayIncome: 60000,
      moralDelta: -6,
      riskDelta: 5,
      briberyDelta: 30000,
    },
  },
  {
    key: 'whitewash_assets',
    icon: '🧹',
    title: '洗白资产',
    subtitle: '通过合法渠道掩盖资金来源',
    desc: '委托专业中介将灰色收入以投资、咨询费等形式合法化，消耗资金换取巡视风险大幅下降。操作隐蔽性强，但费用高昂。',
    riskLabel: '低风险',
    riskColor: '#2a7a3b',
    riskBg: '#F0FAF0',
    cooldownDays: 30,
    minRank: 5,
    effects: {
      grayIncome: -120000,  // 消耗12万洗白
      moralDelta: -2,
      riskDelta: -20,       // 风险大幅下降
    },
  },
  {
    key: 'protection_network',
    icon: '🕸️',
    title: '构建保护关系网',
    subtitle: '经营官场人脉降低风险',
    desc: '投入政绩资源打点上下关系，在关键岗位安排自己人。消耗政绩但巡视风险显著降低，同时提升上司好感。',
    riskLabel: '极低风险',
    riskColor: '#1D3B5E',
    riskBg: '#EEF2F7',
    cooldownDays: 45,
    minRank: 6,
    effects: {
      grayIncome: 0,
      meritDelta: -60,      // 消耗60政绩
      moralDelta: -4,
      riskDelta: -25,       // 风险大幅下降
    },
  },
];

// ── 巡视风险颜色 ────────────────────────────────────────────────
function getRiskColor(risk: number) {
  if (risk >= 80) return '#C82829';
  if (risk >= 60) return '#9B4400';
  if (risk >= 40) return '#D4A012';
  return '#2a7a3b';
}

function getRiskLabel(risk: number) {
  if (risk >= 80) return '危险！极易被举报';
  if (risk >= 60) return '警戒，风险较高';
  if (risk >= 40) return '注意，有一定风险';
  return '相对安全';
}

export default function GrayIncomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, isLoading } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [acting, setActing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [tab, setTab] = useState<'gray' | 'corrupt'>('gray');
  const [showConfirm, setShowConfirm] = useState<CorruptAction | null>(null);

  useFocusEffect(useCallback(() => {
    setFeedback('');
  }, []));

  const showMsg = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a1a', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#888" />
      </View>
    );
  }

  if ((save.rankLevel ?? 0) < 3) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F7F5F0', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 36, marginBottom: 14 }}>🔒</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至科长级（职级3+）后解锁此特殊渠道</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 20, backgroundColor: '#333', paddingHorizontal: 24, paddingVertical: 10 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cooldowns = save.grayIncomeCooldowns ?? {};
  const risk = save.inspectionRisk ?? 0;
  const riskColor = getRiskColor(risk);
  const riskLabel = getRiskLabel(risk);
  const grayTotal = save.grayIncomeTotal ?? 0;
  const corruptTotal = save.corruptTotal ?? 0;
  const corruptCooldowns: Record<string, number> = {}; // 贪污冷却从 grayIncomeCooldowns 同一存储
  const allCooldowns = cooldowns;

  const handleAction = async (action: GrayAction) => {
    if (acting) return;
    const lastDay = cooldowns[action.key] ?? -1;
    const elapsed = save.gameDays - lastDay;
    if (lastDay >= 0 && elapsed < action.cooldownDays) {
      showMsg(`冷却中，还需 ${action.cooldownDays - elapsed} 天后可再次操作`, false);
      return;
    }
    // 特殊处理：洗白资产需要有足够灰色收入
    if (action.key === 'whitewash_assets' && grayTotal < Math.abs(action.effects.grayIncome)) {
      showMsg(`灰色收入不足！洗白资产需 ¥${Math.abs(action.effects.grayIncome).toLocaleString()}，当前 ¥${grayTotal.toLocaleString()}`, false);
      return;
    }
    // 特殊处理：保护关系网需要足够政绩
    if (action.key === 'protection_network' && (save.meritPoints ?? 0) < Math.abs(action.effects.meritDelta ?? 0)) {
      showMsg(`政绩不足！构建关系网需消耗 ${Math.abs(action.effects.meritDelta ?? 0)} 政绩`, false);
      return;
    }
    // 风险超80：追加举报风险提示（仅警告，不阻止普通行动；但洗白/保护不阻止）
    if (risk >= 80 && action.key !== 'whitewash_assets' && action.key !== 'protection_network') {
      showMsg('⚠️ 当前巡视风险极高，此时操作极易被举报！', false);
    }

    setActing(true);
    const eff = action.effects;
    const newGray = Math.max(0, grayTotal + eff.grayIncome);
    const newMoral = Math.max(0, (save.moralValue ?? 50) + eff.moralDelta);
    const newRisk = Math.min(100, Math.max(0, risk + eff.riskDelta));
    const newMerit = Math.max(0, (save.meritPoints ?? 0) + (eff.meritDelta ?? 0));
    const newBribery = (save.briberyAccepted ?? 0) + (eff.briberyDelta ?? 0);
    const newCooldowns = { ...cooldowns, [action.key]: save.gameDays };
    // 保护关系网额外提升bossFavor
    const bossFavorDelta = action.key === 'protection_network' ? 10 : 0;
    try {
      await updateGameSave({
        grayIncomeTotal: newGray,
        moralValue: newMoral,
        inspectionRisk: newRisk,
        meritPoints: newMerit,
        briberyAccepted: newBribery,
        grayIncomeCooldowns: newCooldowns,
        ...(bossFavorDelta > 0 ? { bossFavor: Math.min(100, (save.bossFavor ?? 0) + bossFavorDelta) } : {}),
        ...(newRisk >= 85 && action.key !== 'whitewash_assets' && action.key !== 'protection_network' ? {
          isUnderInvestigation: true,
          investigationDay: save.gameDays,
          investigationEvidenceLevel: Math.min(5, Math.floor(newRisk / 20)),
        } : {}),
      });
      let msg = '';
      if (action.key === 'whitewash_assets') {
        msg = `🧹 洗白成功！消耗 ¥${Math.abs(eff.grayIncome).toLocaleString()}，巡视风险降低${Math.abs(eff.riskDelta)}%（当前${newRisk}%）`;
      } else if (action.key === 'protection_network') {
        msg = `🕸️ 关系网构建完成！消耗${Math.abs(eff.meritDelta ?? 0)}政绩，巡视风险降低${Math.abs(eff.riskDelta)}%，上司好感+${bossFavorDelta}`;
      } else {
        if (eff.grayIncome > 0) msg += `灰色收入 +¥${eff.grayIncome.toLocaleString()} `;
        if (eff.meritDelta && eff.meritDelta > 0) msg += `· 政绩 +${eff.meritDelta} `;
        msg += `· 道德值 ${eff.moralDelta} · 巡视风险 +${eff.riskDelta}`;
        if (newRisk >= 85) msg += '\n⚠️ 风险爆表！已被举报立案，双规程序启动！';
        else if (newRisk >= 70) msg += '\n⚠️ 巡视风险已超70%，极度危险！';
      }
      const msgOk = newRisk < 85 || action.key === 'whitewash_assets' || action.key === 'protection_network';
      await saveResult('grayIncome_' + action.key, { ok: msgOk, desc: msg, day: save.gameDays });
      showMsg(msg, msgOk);
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 贪污行动处理 ─────────────────────────────────────────────────────────────
  const handleCorrupt = async (action: CorruptAction) => {
    if (acting) return;
    setShowConfirm(null);
    const lastDay = allCooldowns[`corrupt_${action.key}`] ?? -1;
    const elapsed = save.gameDays - lastDay;
    if (lastDay >= 0 && elapsed < action.cooldownDays) {
      showMsg(`冷却中，还需 ${action.cooldownDays - elapsed} 天`, false);
      return;
    }
    setActing(true);
    const newMoral   = Math.max(0, (save.moralValue ?? 50) + action.moralDelta);
    const newRisk    = Math.min(100, risk + action.riskDelta);
    const newCorrupt = corruptTotal + action.amount;
    const newCooldowns = { ...allCooldowns, [`corrupt_${action.key}`]: save.gameDays };
    const shuangui = checkShuangguiTrigger(newRisk, newCorrupt, newMoral, save.briberyAccepted ?? 0);
    try {
      await updateGameSave({
        corruptTotal: newCorrupt,
        moralValue: newMoral,
        inspectionRisk: newRisk,
        grayIncomeCooldowns: newCooldowns,
        ...(shuangui.triggered ? {
          isUnderInvestigation: true,
          investigationDay: save.gameDays,
          investigationEvidenceLevel: Math.min(5, Math.max(3, Math.floor(newRisk / 18))),
        } : {}),
      });
      let msg = `💸 贪污 ${action.amount}万元！道德${action.moralDelta}，巡视风险+${action.riskDelta}%`;
      if (shuangui.triggered) msg += `\n🚨 双规触发！${shuangui.reason}`;
      else if (newRisk >= 75) msg += '\n⚠️ 风险极高，建议立即停手！';
      else if (newCorrupt >= 300) msg += '\n⚠️ 累计贪污已达300万，纪委关注度上升！';
      showMsg(msg, !shuangui.triggered);
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F2EFE8' }}>
      <StatusBar style="dark" backgroundColor="#F2EFE8" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2A2A2A', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: '#aaa', fontSize: 22 }}>‹ 返回</Text>        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: 'rgba(200,200,200,0.5)', fontSize: 9, letterSpacing: 3 }}>特殊渠道 · 机密</Text>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '900' }}>🌑 以权谋私</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: 'rgba(200,200,200,0.5)', fontSize: 9 }}>累计灰色收入</Text>
            <Text style={{ color: '#D4A012', fontSize: 16, fontWeight: '900' }}>¥{grayTotal.toLocaleString()}</Text>
            <Text style={{ color: 'rgba(200,50,50,0.8)', fontSize: 9, marginTop: 2 }}>贪污累计：{corruptTotal}万</Text>
          </View>
        </View>
      </View>

      {/* 巡视风险横幅 */}
      <View style={{ backgroundColor: riskColor, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>🔍 巡视风险 {risk}%</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>— {riskLabel}</Text>
        {risk >= 70 && (
          <View style={{ marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 9 }}>⚠️ 立即停手</Text>
          </View>
        )}
      </View>

      {/* 风险条 */}
      <View style={{ backgroundColor: '#E0DDD6', height: 4 }}>
        <View style={{ width: `${risk}%` as `${number}%`, height: 4, backgroundColor: riskColor }} />
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 14, gap: 10 }}>

          {/* Tab 切换 */}
          <View style={{ flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 8, padding: 3, gap: 3 }}>
            {([['gray', '🌑 灰色收入'], ['corrupt', '💸 贪污系统']] as const).map(([key, label]) => (
              <Pressable key={key} onPress={() => setTab(key)} style={{ flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: tab === key ? '#D4A012' : 'transparent' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: tab === key ? '#1A1A1A' : '#888' }}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* ── 灰色收入Tab ── */}
          {tab === 'gray' && (
            <>
          {/* 警示说明 */}
          <View style={{ backgroundColor: '#2A2A2A', padding: 12, flexDirection: 'row', gap: 10 }}>
            <Text style={{ fontSize: 16 }}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', marginBottom: 3 }}>特殊渠道 — 高风险区域</Text>
              <Text style={{ color: '#aaa', fontSize: 10, lineHeight: 15 }}>
                以下行动均为违规操作，执行后将降低道德值、增加巡视风险。巡视风险超85%将自动触发双规立案，届时进入双规审查系统，请谨慎决策。
              </Text>
            </View>
          </View>

          {/* 行动列表 */}
          {GRAY_ACTIONS.map(action => {
            const lastDay = cooldowns[action.key] ?? -1;
            const elapsed = save.gameDays - lastDay;
            const onCooldown = lastDay >= 0 && elapsed < action.cooldownDays;
            const cdLeft = action.cooldownDays - elapsed;
            const locked = (save.rankLevel ?? 0) < action.minRank;

            return (
              <View key={action.key} style={{
                backgroundColor: '#fff',
                borderWidth: 1,
                borderColor: locked ? '#E0E0E0' : onCooldown ? '#E8E4DC' : '#C0B8A8',
                opacity: locked ? 0.5 : 1,
                overflow: 'hidden',
              }}>
                {/* 行动头 */}
                <View style={{ padding: 12, paddingBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>{action.icon}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '900', color: '#222' }}>{action.title}</Text>
                        <View style={{ backgroundColor: action.riskBg, borderWidth: 1, borderColor: action.riskColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 8, color: action.riskColor, fontWeight: '700' }}>{action.riskLabel}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{action.subtitle}</Text>
                    </View>
                    {locked && (
                      <View style={{ backgroundColor: '#888', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 8 }}>需职级{action.minRank}+</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 16, marginTop: 6 }}>{action.desc}</Text>

                  {/* 效果标签 */}
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                    {action.effects.grayIncome > 0 && (
                      <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#D4A012', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#7B5E2A', fontSize: 9, fontWeight: '700' }}>灰色收入 +¥{action.effects.grayIncome.toLocaleString()}</Text>
                      </View>
                    )}
                    {action.effects.meritDelta && action.effects.meritDelta > 0 && (
                      <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#1D3B5E', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#1D3B5E', fontSize: 9 }}>政绩 +{action.effects.meritDelta}</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#C82829', fontSize: 9 }}>道德 {action.effects.moralDelta}</Text>
                    </View>
                    <View style={{ backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#888', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#666', fontSize: 9 }}>巡视风险 +{action.effects.riskDelta}%</Text>
                    </View>
                    <View style={{ backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#999', fontSize: 9 }}>冷却{action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>

                {/* 执行按钮 */}
                {(() => { const r = getResult('grayIncome_' + action.key); return r ? (
                  <View style={{ backgroundColor: r.ok ? '#1a1a1a' : '#2a0a0a', borderRadius: 6, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: r.ok ? '#2d5a27' : '#5a1a1a' }}>
                    <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#86efac' : '#fca5a5', marginBottom: 2 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                    <Text style={{ fontSize: 10, color: r.ok ? '#4ade80' : '#f87171', lineHeight: 15 }}>{r.desc}</Text>
                  </View>
                ) : null; })()}
                <Pressable
                  onPress={() => void handleAction(action)}
                  disabled={locked || onCooldown || acting}
                  style={{
                    backgroundColor: locked ? '#DDD' : onCooldown ? '#DDD' : risk >= 80 ? '#6B0000' : '#2A2A2A',
                    paddingVertical: 11,
                    alignItems: 'center',
                    opacity: acting ? 0.6 : 1,
                  }}
                >
                  <Text style={{ color: locked || onCooldown ? '#999' : '#fff', fontWeight: '700', fontSize: 12 }}>
                    {locked ? `🔒 需职级 ${action.minRank}+` : onCooldown ? `⏳ 冷却中（剩余 ${cdLeft} 天）` : risk >= 80 ? '⚠️ 极危！仍要操作' : '▶ 执行操作'}
                  </Text>
                </Pressable>
              </View>
            );
          })}

          {/* 底部提示 */}
          <View style={{ backgroundColor: '#2A2A2A', padding: 12, gap: 4 }}>
            <Text style={{ color: '#aaa', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>风险说明</Text>
            <Text style={{ color: '#777', fontSize: 10, lineHeight: 16 }}>
              · 巡视风险每次行动后累积，随游戏时间自然缓慢下降{'\n'}
              · 道德值&lt;30时，巡视风险增速翻倍{'\n'}
              · 巡视风险≥85%将自动触发立案，跳转双规审查系统{'\n'}
              · 坦白认罪可降级保命，辩护风险视证据强度而定
            </Text>
          </View>
            </>
          )}

          {/* ── 贪污系统Tab ── */}
          {tab === 'corrupt' && (
            <>
              {/* 贪污状态总览 */}
              <View style={{ backgroundColor: '#1A1A1A', borderRadius: 10, padding: 12, gap: 6 }}>
                <Text style={{ color: '#D4A012', fontSize: 12, fontWeight: '800', marginBottom: 4 }}>💸 贪污档案</Text>
                {[
                  { label: '累计贪污金额', value: `${corruptTotal} 万元`, warn: corruptTotal >= 300 },
                  { label: '当前巡视风险', value: `${risk}%`, warn: risk >= 60 },
                  { label: '当前道德值',   value: `${save.moralValue ?? 50}`, warn: (save.moralValue ?? 50) <= 20 },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 11, color: '#888' }}>{row.label}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: row.warn ? '#EF4444' : '#D4A012' }}>{row.value}</Text>
                  </View>
                ))}
                <View style={{ backgroundColor: '#2A2A2A', borderRadius: 6, padding: 8, marginTop: 4 }}>
                  <Text style={{ fontSize: 10, color: '#888', lineHeight: 15 }}>
                    双规触发条件：风险≥85% · 贪污≥500万 · 道德≤10 · 受贿≥20万且风险≥60% · 贪污≥200万且风险≥75%
                  </Text>
                </View>
              </View>

              {/* 贪污行动列表 */}
              {CORRUPT_ACTIONS.map(action => {
                const lastDay = allCooldowns[`corrupt_${action.key}`] ?? -1;
                const elapsed = save.gameDays - lastDay;
                const onCd = lastDay >= 0 && elapsed < action.cooldownDays;
                const cdLeft = action.cooldownDays - elapsed;
                const locked = (save.rankLevel ?? 0) < action.minRank;
                const severityColor = action.severity === 'high' ? '#991B1B' : action.severity === 'mid' ? '#92400E' : '#4B5563';
                const severityBg    = action.severity === 'high' ? '#FEE2E2' : action.severity === 'mid' ? '#FEF3C7' : '#F3F4F6';
                return (
                  <View key={action.key} style={{ backgroundColor: '#FFF', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: locked ? '#E5E7EB' : '#C0B8A8', opacity: locked ? 0.5 : 1 }}>
                    <View style={{ padding: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#111', flex: 1 }}>{action.title}</Text>
                        <View style={{ backgroundColor: severityBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, color: severityColor, fontWeight: '700' }}>
                            {action.severity === 'high' ? '极高风险' : action.severity === 'mid' ? '中等风险' : '低风险'}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>{action.desc}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#D4A012', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '700' }}>贪污 +{action.amount}万</Text>
                        </View>
                        <View style={{ backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#EF4444', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, color: '#991B1B', fontWeight: '700' }}>道德 {action.moralDelta}</Text>
                        </View>
                        <View style={{ backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#888', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, color: '#666' }}>风险 +{action.riskDelta}%</Text>
                        </View>
                        <View style={{ backgroundColor: '#F5F5F5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, color: '#999' }}>冷却{action.cooldownDays}天</Text>
                        </View>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => !locked && !onCd && setShowConfirm(action)}
                      disabled={locked || onCd || acting}
                      style={{ backgroundColor: locked ? '#DDD' : onCd ? '#DDD' : '#6B0000', paddingVertical: 11, alignItems: 'center' }}
                    >
                      <Text style={{ color: locked || onCd ? '#999' : '#FFF', fontWeight: '700', fontSize: 12 }}>
                        {locked ? `🔒 需职级 ${action.minRank}+` : onCd ? `⏳ 冷却中（剩余 ${cdLeft} 天）` : '▶ 实施贪污'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </>
          )}

          <View style={{ height: 30 }} />
        </View>
      </ScrollView>

      {/* 贪污确认弹窗 */}
      <Modal visible={!!showConfirm} transparent animationType="fade" onRequestClose={() => setShowConfirm(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.75)', padding: 24 }}>
          <View style={{ backgroundColor: '#1A1A1A', borderRadius: 16, padding: 24, width: '100%', borderWidth: 1, borderColor: '#6B0000' }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFF', marginBottom: 6 }}>⚠️ 确认实施贪污？</Text>
            {showConfirm && (
              <>
                <Text style={{ fontSize: 13, color: '#aaa', lineHeight: 20, marginBottom: 16 }}>
                  「{showConfirm.title}」{'\n'}
                  贪污金额：+{showConfirm.amount}万元{'\n'}
                  道德值：{showConfirm.moralDelta} · 巡视风险：+{showConfirm.riskDelta}%{'\n\n'}
                  此行为将增加被查风险，累计达到阈值将触发双规结局，请谨慎决策。
                </Text>
                <Pressable onPress={() => void handleCorrupt(showConfirm)} disabled={acting}
                  style={{ backgroundColor: '#991B1B', borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>{acting ? '执行中…' : '💸 确认实施'}</Text>
                </Pressable>
              </>
            )}
            <Pressable onPress={() => setShowConfirm(null)} style={{ padding: 10, alignItems: 'center' }}>
              <Text style={{ color: '#666', fontSize: 14 }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 反馈浮层 */}
      {!!feedback && (
        <View style={{
          position: 'absolute', bottom: 24, left: 14, right: 14,
          backgroundColor: feedbackOk ? '#1D3B5E' : '#6B0000',
          padding: 12,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
            {feedback}
          </Text>
        </View>
      )}
    </View>
  );
}
