// 巡视组反腐系统 — 廉洁度审查、保护伞、双规流程
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';


// ── 配色 ──────────────────────────────────────────
const C = {
  bg: '#F0EDE6', header: '#1A2B3C', headerAccent: '#2E4A6A',
  gold: '#C9953A', goldLight: '#F5E9CC', goldBorder: '#D4A843',
  red: '#B91C1C', redLight: '#FEF2F2', redMid: '#FECACA',
  green: '#166534', greenLight: '#F0FDF4', greenMid: '#BBF7D0',
  blue: '#1E40AF', blueLight: '#EFF6FF', blueMid: '#BFDBFE',
  orange: '#C2410C', orangeLight: '#FFF7ED', orangeBorder: '#FED7AA',
  purple: '#6D28D9', purpleLight: '#F5F3FF', purpleBorder: '#DDD6FE',
  card: '#FDFAF5', border: '#D6CFBF', muted: '#7A7065', label: '#4A3F2F',
  navy: '#1A2B3C', divider: '#E0D9CD',
};

// ── 巡视类型配置 ──────────────────────────────────
const INSPECTION_TYPES = [
  { key: 'central', label: '中央巡视组', icon: '🏛️', color: C.red, bg: C.redLight, border: C.redMid, minRank: 10,
    desc: '中央纪律检查委员会直属巡视，级别最高，廉洁度要求≥40' },
  { key: 'provincial', label: '省级巡视组', icon: '🏢', color: C.blue, bg: C.blueLight, border: C.blueMid, minRank: 5,
    desc: '省委派驻巡视工作组，重点审查县处级干部廉洁情况' },
  { key: 'municipal', label: '市级巡视组', icon: '🏙️', color: C.green, bg: C.greenLight, border: C.greenMid, minRank: 1,
    desc: '市纪委联合督察，常规性廉洁检查，廉洁度要求≥25' },
];

// ── 保护伞选项 ────────────────────────────────────
const UMBRELLA_OPTIONS = [
  { level: 1, label: '乡镇级保护', icon: '🌂', cost: 50000, protection: 15,
    desc: '向乡镇主要领导行贿，获得低级保护，被市级以下巡视时有30%概率预警' },
  { level: 2, label: '县市级保护', icon: '☂️', cost: 200000, protection: 35,
    desc: '打通县市级关节，被省级以下巡视时有50%概率预警，降低风险30点' },
  { level: 3, label: '省部级保护', icon: '🛡️', cost: 800000, protection: 60,
    desc: '结交省部级实权人物，应对中央巡视时有40%概率获得内部预警' },
];

// ── 群众举报选项 ──────────────────────────────────
const SELF_REPORT_EFFECT = { moralBonus: 15, riskReduction: 25, meritPenalty: -10 };

export default function InspectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warn' } | null>(null);
  const [showShuanggui, setShowShuanggui] = useState(false);
  const [shuangguiChoice, setShuangguiChoice] = useState<'confess' | 'deny' | null>(null);
  const [shuangguiResult, setShuangguiResult] = useState<string | null>(null);

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const risk = save.inspectionRisk;
  const moral = save.moralValue;
  const umbrella = save.protectionUmbrellaLevel;

  // 风险等级
  const riskLevel = risk >= 75 ? 'critical' : risk >= 50 ? 'high' : risk >= 25 ? 'medium' : 'low';
  const riskColor = { critical: C.red, high: C.orange, medium: C.gold, low: C.green }[riskLevel];
  const riskBg = { critical: C.redLight, high: C.orangeLight, medium: C.goldLight, low: C.greenLight }[riskLevel];
  const riskLabel = { critical: '极危', high: '偏高', medium: '适中', low: '安全' }[riskLevel];

  // 当前适用巡视组
  const applicableInspections = INSPECTION_TYPES.filter(t => save.rankLevel >= t.minRank);

  // 主动坦白
  async function handleSelfReport() {
    if (!save) return;
    setLoading(true);
    const newMoral = Math.min(100, moral + SELF_REPORT_EFFECT.moralBonus);
    const newRisk = Math.max(0, risk + SELF_REPORT_EFFECT.riskReduction * -1);
    const newMerit = save.meritPoints + SELF_REPORT_EFFECT.meritPenalty;
    await updateGameSave({ moralValue: newMoral, inspectionRisk: newRisk, meritPoints: newMerit });
    
    { const _in1=`主动坦白完成。廉洁度 +${SELF_REPORT_EFFECT.moralBonus}，巡视风险 -${SELF_REPORT_EFFECT.riskReduction}，政绩 ${SELF_REPORT_EFFECT.meritPenalty}`; void saveResult('inspection_selfReport', {ok:true,desc:_in1,day:save.gameDays??0}); setMsg({ text: _in1, type: 'success' }); }
    setLoading(false);
  }

  // 购买保护伞
  async function handleBuyUmbrella(opt: typeof UMBRELLA_OPTIONS[0]) {
    if (!save) return;
    if (save.personalSavings < opt.cost) {
      setMsg({ text: '个人资金不足，无法建立保护关系', type: 'error' }); return;
    }
    if (umbrella >= opt.level) {
      setMsg({ text: '已有同等或更高级别的保护关系', type: 'warn' }); return;
    }
    setLoading(true);
    const newSavings = save.personalSavings - opt.cost;
    const newMoral = Math.max(0, moral - 10); // 行贿降低廉洁度
    const newBribery = save.briberyAccepted + opt.cost;
    await updateGameSave({
      personalSavings: newSavings,
      moralValue: newMoral,
      protectionUmbrellaLevel: opt.level,
      protectionUmbrellaName: save.bossName,
      briberyAccepted: newBribery,
      inspectionRisk: Math.max(0, risk - opt.protection),
    });
    
    { const _in2=`已与${save.bossName}建立保护关系。廉洁度 -10，巡视风险 -${opt.protection}`; void saveResult('inspection_umbrella_'+opt.level, {ok:true,desc:_in2,day:save.gameDays??0}); setMsg({ text: _in2, type: 'warn' }); }
    setLoading(false);
  }

  // 拒绝贿赂（廉洁自律）
  async function handleRefuseBribe() {
    if (!save) return;
    setLoading(true);
    const newMoral = Math.min(100, moral + 5);
    const newRisk = Math.max(0, risk - 10);
    const newRejected = save.briberyRejected + 1;
    await updateGameSave({ moralValue: newMoral, inspectionRisk: newRisk, briberyRejected: newRejected, meritPoints: save.meritPoints + 5 });
    
    { const _in3='廉洁自律加分！廉洁度 +5，巡视风险 -10，政绩 +5'; void saveResult('inspection_refuseBribe', {ok:true,desc:_in3,day:save.gameDays??0}); setMsg({ text: _in3, type: 'success' }); }
    setLoading(false);
  }

  // 双规流程
  async function handleShuanggui(choice: 'confess' | 'deny') {
    if (!save) return;
    setShuangguiChoice(choice);
    setLoading(true);
    if (choice === 'confess') {
      // 主动认罪：降级处理
      const newRank = Math.max(1, save.rankLevel - 2);
      const newMoral = 30;
      const newRisk = 20;
      await updateGameSave({
        rankLevel: newRank, rankName: `降级处理（原${save.rankName}）`,
        moralValue: newMoral, inspectionRisk: newRisk, isUnderInvestigation: false,
        meritPoints: 0,
      });
      setShuangguiResult(`主动认罪，从宽处理。降级2级至${newRank}级，保留公职。廉洁度重置为30，开始廉政考察期。`);
    } else {
      // 拒不认罪：开除处分
      await updateGameSave({
        moralValue: 0, inspectionRisk: 100, isUnderInvestigation: true,
        gameOverType: 'corruption',
      });
      setShuangguiResult('拒不认罪，被开除党籍、开除公职，移送司法机关处理。仕途就此终结。');
    }
    
    setLoading(false);
  }

  // 检查是否需要触发双规
  const shouldTriggerShuanggui = moral < 20 && risk >= 80 && save.isUnderInvestigation;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.header} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: C.header, paddingTop: insets.top + 6, paddingBottom: 14, paddingHorizontal: 18 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: C.goldLight, fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 }}>巡视组反腐系统</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>廉洁度管理 · 巡视风险 · 双规流程</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>

        {/* 消息提示 */}
        {msg && (
          <View style={{ borderRadius: 8, padding: 12, borderLeftWidth: 4,
            backgroundColor: msg.type === 'success' ? C.greenLight : msg.type === 'error' ? C.redLight : C.goldLight,
            borderLeftColor: msg.type === 'success' ? C.green : msg.type === 'error' ? C.red : C.gold }}>
            <Text style={{ fontSize: 13, color: msg.type === 'success' ? C.green : msg.type === 'error' ? C.red : C.orange, fontWeight: '700' }}>{msg.text}</Text>
            <Pressable onPress={() => setMsg(null)}>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>点击关闭</Text>
            </Pressable>
          </View>
        )}

        {/* 双规流程弹出 */}
        {shouldTriggerShuanggui && !shuangguiResult && (
          <View style={{ borderRadius: 8, overflow: 'hidden', borderWidth: 2.5, borderColor: C.red }}>
            <View style={{ backgroundColor: C.red, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 2 }}>纪委已下达双规通知</Text>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 }}>廉洁度严重不达标，已立案审查</Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#FFF5F5', padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 13, color: C.label, lineHeight: 20 }}>
                经查，你在任期间存在严重违规违纪行为，廉洁度已降至危险水平。请在规定时间内配合调查，选择处理方式：
              </Text>
              {!shuangguiChoice && (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => !loading && handleShuanggui('confess')} disabled={loading}
                    style={{ flex: 1, backgroundColor: C.green, borderRadius: 8, padding: 14, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 16 }}>🙏</Text>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>主动认罪</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center' }}>从宽处理，降级保留公职</Text>
                  </Pressable>
                  <Pressable onPress={() => !loading && handleShuanggui('deny')} disabled={loading}
                    style={{ flex: 1, backgroundColor: C.red, borderRadius: 8, padding: 14, alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 16 }}>✊</Text>
                    <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>拒不认罪</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, textAlign: 'center' }}>可能被开除移送司法</Text>
                  </Pressable>
                </View>
              )}
              {shuangguiResult && (
                <View style={{ backgroundColor: C.goldLight, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: C.goldBorder }}>
                  <Text style={{ fontSize: 13, color: C.label, lineHeight: 20 }}>{shuangguiResult}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 廉洁状态概览 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.header, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🔍</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 }}>廉洁状态概览</Text>
          </View>
          <View style={{ padding: 14, gap: 12 }}>
            {/* 廉洁度进度条 */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: C.label, fontWeight: '700' }}>廉洁度</Text>
                <Text style={{ fontSize: 14, fontWeight: '900',
                  color: moral >= 70 ? C.green : moral >= 40 ? C.gold : C.red }}>{moral} / 100</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#E5E0D8', borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 5, width: `${moral}%`,
                  backgroundColor: moral >= 70 ? C.green : moral >= 40 ? C.gold : C.red }} />
              </View>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                {moral >= 80 ? '廉洁自律，无巡视风险' : moral >= 60 ? '基本廉洁，保持警惕' : moral >= 40 ? '偏低，建议提升' : moral >= 20 ? '危险，随时可能被查' : '极危，立案风险极高'}
              </Text>
            </View>
            {/* 巡视风险进度条 */}
            <View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text style={{ fontSize: 12, color: C.label, fontWeight: '700' }}>巡视风险</Text>
                <View style={{ backgroundColor: riskBg, paddingHorizontal: 8, paddingVertical: 2,
                  borderRadius: 4, borderWidth: 1, borderColor: riskColor + '50' }}>
                  <Text style={{ fontSize: 12, fontWeight: '900', color: riskColor }}>{risk} / 100 · {riskLabel}</Text>
                </View>
              </View>
              <View style={{ height: 10, backgroundColor: '#E5E0D8', borderRadius: 5, overflow: 'hidden' }}>
                <View style={{ height: '100%', borderRadius: 5, width: `${risk}%`, backgroundColor: riskColor }} />
              </View>
            </View>
            {/* 保护伞状态 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10,
              backgroundColor: umbrella > 0 ? C.blueLight : '#F5F5F5',
              borderRadius: 6, borderWidth: 1, borderColor: umbrella > 0 ? C.blueMid : C.divider }}>
              <Text style={{ fontSize: 20 }}>{umbrella > 0 ? '🛡️' : '⬜'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: umbrella > 0 ? C.blue : C.muted }}>
                  {umbrella > 0
                    ? UMBRELLA_OPTIONS[umbrella - 1]?.label + ' · ' + save.protectionUmbrellaName
                    : '暂无保护关系'}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  {umbrella > 0 ? `预警概率：${[30, 50, 40][umbrella - 1]}%` : '建立保护关系可降低被查风险'}
                </Text>
              </View>
            </View>
            {/* 贿赂统计 */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, padding: 10, backgroundColor: '#FFF7ED', borderRadius: 6,
                borderWidth: 1, borderColor: C.orangeBorder, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 18 }}>💰</Text>
                <Text style={{ fontSize: 11, color: C.orange, fontWeight: '800' }}>累计受贿</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.orange }}>
                  {save.briberyAccepted >= 10000 ? `${(save.briberyAccepted / 10000).toFixed(1)}万` : `${save.briberyAccepted}元`}
                </Text>
              </View>
              <View style={{ flex: 1, padding: 10, backgroundColor: C.greenLight, borderRadius: 6,
                borderWidth: 1, borderColor: C.greenMid, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 18 }}>🏅</Text>
                <Text style={{ fontSize: 11, color: C.green, fontWeight: '800' }}>拒绝贿赂</Text>
                <Text style={{ fontSize: 14, fontWeight: '900', color: C.green }}>{save.briberyRejected} 次</Text>
              </View>
            </View>
          </View>
        </View>

        {/* 行动区：主动坦白 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.green, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>✅</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14, flex: 1 }}>廉洁自律行动</Text>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            {/* 主动坦白 */}
            <View style={{ padding: 12, backgroundColor: C.greenLight, borderRadius: 8, borderWidth: 1, borderColor: C.greenMid }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 24 }}>📣</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: C.green }}>主动坦白轻微问题</Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 }}>
                    主动向纪委坦白轻微违规行为，获得从宽处理。廉洁度 +{SELF_REPORT_EFFECT.moralBonus}，巡视风险 -{SELF_REPORT_EFFECT.riskReduction}，政绩 {SELF_REPORT_EFFECT.meritPenalty}
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => !loading && handleSelfReport()} disabled={loading}
                style={{ backgroundColor: C.green, borderRadius: 6, padding: 12, alignItems: 'center' }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>主动坦白</Text>}
              </Pressable>
            </View>
            {/* 廉洁自律（拒绝贿赂） */}
            <View style={{ padding: 12, backgroundColor: C.blueLight, borderRadius: 8, borderWidth: 1, borderColor: C.blueMid }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 24 }}>🚫</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '900', color: C.blue }}>廉洁自律（拒绝礼金）</Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 }}>
                    主动退还礼金，坚持廉洁从政。廉洁度 +5，巡视风险 -10，政绩 +5
                  </Text>
                </View>
              </View>
              <Pressable onPress={() => !loading && handleRefuseBribe()} disabled={loading}
                style={{ backgroundColor: C.blue, borderRadius: 6, padding: 12, alignItems: 'center' }}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>拒绝礼金</Text>}
              </Pressable>
            </View>
          </View>
        </View>

        {/* 保护伞系统 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.navy, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>🌂</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>保护伞系统</Text>
              <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>⚠️ 高风险操作，将大幅降低廉洁度</Text>
            </View>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: C.orangeLight, borderRadius: 6, padding: 10, borderWidth: 1, borderColor: C.orangeBorder, flexDirection: 'row', gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ fontSize: 11, color: C.orange, flex: 1, lineHeight: 16 }}>
                建立保护伞关系将消耗个人资金并降低廉洁度 -10。此类行为属于行贿，一旦暴露将加重处分。当前资金：{(save.personalSavings / 10000).toFixed(1)}万元
              </Text>
            </View>
            {UMBRELLA_OPTIONS.map(opt => {
              const owned = umbrella >= opt.level;
              const canAfford = save.personalSavings >= opt.cost;
              return (
                <View key={opt.level} style={{ padding: 12, borderRadius: 8, borderWidth: owned ? 2 : 1,
                  borderColor: owned ? C.blue : C.border, backgroundColor: owned ? C.blueLight : C.card }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: owned ? C.blue : C.label }}>{opt.label}</Text>
                        {owned && <View style={{ backgroundColor: C.blue, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 3 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>已建立</Text>
                        </View>}
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{opt.desc}</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, backgroundColor: '#FFF7ED', borderRadius: 4, padding: 6 }}>
                      <Text style={{ fontSize: 11, color: C.orange, fontWeight: '700' }}>
                        花费 {opt.cost >= 10000 ? `${(opt.cost / 10000).toFixed(0)}万` : `${opt.cost}`} 元 · 廉洁度 -10 · 风险 -{opt.protection}
                      </Text>
                    </View>
                    {!owned && (
                      <Pressable onPress={() => !loading && handleBuyUmbrella(opt)} disabled={loading || !canAfford}
                        style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 6,
                          backgroundColor: canAfford ? C.orange : '#E0D9CD' }}>
                        <Text style={{ color: canAfford ? '#fff' : C.muted, fontWeight: '900', fontSize: 13 }}>
                          {canAfford ? '建立关系' : '资金不足'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* 巡视组说明 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.purple, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 16 }}>📋</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>巡视组说明</Text>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            {applicableInspections.map(ins => (
              <View key={ins.key} style={{ padding: 12, borderRadius: 8, borderWidth: 1.5,
                borderColor: ins.border, backgroundColor: ins.bg, flexDirection: 'row', gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{ins.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: ins.color }}>{ins.label}</Text>
                  <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 }}>{ins.desc}</Text>
                </View>
              </View>
            ))}
            <View style={{ padding: 10, backgroundColor: C.goldLight, borderRadius: 6, borderWidth: 1, borderColor: C.goldBorder }}>
              <Text style={{ fontSize: 11, color: C.label, lineHeight: 17 }}>
                💡 巡视组由系统每90天随机触发一次检查。当廉洁度{'<'}30时巡视风险每月自动+5；廉洁度{'<'}20且风险≥80时触发双规流程。保持廉洁是最稳妥的策略。
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
