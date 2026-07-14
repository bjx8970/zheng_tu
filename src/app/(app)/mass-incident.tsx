// 群体性事件 & 舆情管理系统
import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';

// 舆情处置：每365游戏天随机5%~25%概率触发一批事件
const OPINION_TRIGGER_PERIOD = 365;
const OPINION_TRIGGER_CHANCE_MIN = 0.05;
const OPINION_TRIGGER_CHANCE_MAX = 0.25;
// careerPathCooldowns 中使用的 key 前缀
const MI_KEY_PREFIX = 'mi_';       // mi_<incidentKey> → 最近处理时的 gameDays
const MI_TRIGGER_KEY = 'mi_trigger_day'; // 上次成功触发的 gameDays


const C = {
  bg: '#F0EDE6', header: '#7C1C1C', headerDark: '#5A0F0F',
  gold: '#C9953A', goldLight: '#F5E9CC', goldBorder: '#D4A843',
  red: '#B91C1C', redLight: '#FEF2F2', redMid: '#FECACA',
  green: '#166534', greenLight: '#F0FDF4', greenMid: '#BBF7D0',
  blue: '#1E40AF', blueLight: '#EFF6FF', blueMid: '#BFDBFE',
  orange: '#C2410C', orangeLight: '#FFF7ED', orangeBorder: '#FED7AA',
  card: '#FDFAF5', border: '#D6CFBF', muted: '#7A7065', label: '#4A3F2F',
  navy: '#1A2B3C', divider: '#E0D9CD',
};

// ── 群体性事件模板 ─────────────────────────────────
interface IncidentTemplate {
  key: string; icon: string; title: string; desc: string;
  category: '土地纠纷' | '劳资矛盾' | '环境抗议' | '信访上访' | '网络舆情';
  urgency: 'critical' | 'high' | 'medium';
  options: { label: string; icon: string; opinionDelta: number; moralDelta: number; meritDelta: number; stabilityDesc: string }[];
}

const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    key: 'land_dispute', icon: '🏗️', title: '征地补偿纠纷', category: '土地纠纷', urgency: 'critical',
    desc: '某村300余名村民因征地补偿金额过低，聚集在县政府门前上访，情绪激动，要求提高补偿标准。已持续2天，媒体开始关注。',
    options: [
      { label: '提高补偿标准', icon: '💰', opinionDelta: 15, moralDelta: 3, meritDelta: -5, stabilityDesc: '村民满意，事件平息，但增加财政支出' },
      { label: '依法调解处理', icon: '⚖️', opinionDelta: 5, moralDelta: 5, meritDelta: 3, stabilityDesc: '按规程处理，稳妥但周期较长' },
      { label: '强制清场', icon: '🚔', opinionDelta: -20, moralDelta: -10, meritDelta: -15, stabilityDesc: '短期压制，舆情持续发酵，风险极高' },
    ],
  },
  {
    key: 'labor_conflict', icon: '👷', title: '工厂欠薪事件', category: '劳资矛盾', urgency: 'high',
    desc: '辖区某大型制造企业因经营困难，拖欠200余名工人3个月工资，工人聚集在厂门口维权，已有媒体到场直播。',
    options: [
      { label: '政府垫付工资', icon: '💳', opinionDelta: 20, moralDelta: 5, meritDelta: -8, stabilityDesc: '立即解决问题，工人满意，但需动用财政资金' },
      { label: '协调企业分批发放', icon: '🤝', opinionDelta: 8, moralDelta: 3, meritDelta: 2, stabilityDesc: '协商方案，工人接受度中等' },
      { label: '移交劳动仲裁', icon: '📋', opinionDelta: -5, moralDelta: 2, meritDelta: 0, stabilityDesc: '程序合规但耗时，舆情持续' },
    ],
  },
  {
    key: 'env_protest', icon: '🌫️', title: '化工厂污染抗议', category: '环境抗议', urgency: 'critical',
    desc: '居民反映辖区某化工厂排放有害气体，周边500余名居民自发聚集抗议，要求立即关停工厂。环保部门检测数据尚未完成。',
    options: [
      { label: '立即责令停产整改', icon: '🔴', opinionDelta: 18, moralDelta: 8, meritDelta: -10, stabilityDesc: '舆情平息，但损失税收来源' },
      { label: '等检测结果再决定', icon: '⏳', opinionDelta: -10, moralDelta: 0, meritDelta: 0, stabilityDesc: '程序正确但民众不满，舆情发酵' },
      { label: '承诺限期整改', icon: '📝', opinionDelta: 5, moralDelta: 2, meritDelta: 5, stabilityDesc: '折中方案，短期平息但需跟进落实' },
    ],
  },
  {
    key: 'petition', icon: '📮', title: '群众集体信访', category: '信访上访', urgency: 'medium',
    desc: '某社区居民因小区物业纠纷，组织50余人前往市信访局集体上访，反映物业收费不透明、服务质量低下等问题。',
    options: [
      { label: '成立专项工作组调查', icon: '🔍', opinionDelta: 10, moralDelta: 5, meritDelta: 5, stabilityDesc: '积极回应，居民评价较好' },
      { label: '转交街道办处理', icon: '📁', opinionDelta: -3, moralDelta: 1, meritDelta: 0, stabilityDesc: '分级处理，但居民认为被推诿' },
      { label: '领导接待并承诺解决', icon: '👥', opinionDelta: 15, moralDelta: 3, meritDelta: -3, stabilityDesc: '领导出面效果好，但承诺需兑现' },
    ],
  },
  {
    key: 'social_media', icon: '📱', title: '网络舆情危机', category: '网络舆情', urgency: 'high',
    desc: '一段反映辖区干部吃拿卡要的视频在社交媒体上爆发式传播，短时间内获得百万播放，舆论哗然，要求追责。',
    options: [
      { label: '立即开展内部调查', icon: '🔎', opinionDelta: 12, moralDelta: 8, meritDelta: -5, stabilityDesc: '主动作为，公众满意度提升' },
      { label: '要求平台删除视频', icon: '🗑️', opinionDelta: -25, moralDelta: -8, meritDelta: -10, stabilityDesc: '引发更大舆情，极度危险' },
      { label: '发布官方声明说明情况', icon: '📢', opinionDelta: 5, moralDelta: 3, meritDelta: 0, stabilityDesc: '稳定舆论，但效果有限' },
    ],
  },
];

const URGENCY_CONFIG = {
  critical: { label: '紧急', color: C.red, bg: C.redLight, border: C.redMid, icon: '🚨' },
  high:     { label: '较急', color: C.orange, bg: C.orangeLight, border: C.orangeBorder, icon: '⚠️' },
  medium:   { label: '一般', color: C.gold, bg: C.goldLight, border: C.goldBorder, icon: '📌' },
};
const CATEGORY_COLOR: Record<string, string> = {
  '土地纠纷': '#7C3AED', '劳资矛盾': C.orange, '环境抗议': C.green,
  '信访上访': C.blue, '网络舆情': C.red,
};

export default function MassIncidentScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warn' } | null>(null);
  // 是否本次聚焦周期内已触发过事件（避免重复掷骰）
  const triggeredRef = useRef(false);

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const gameDays = save.gameDays ?? 0;
  const cooldowns: Record<string, number> = save.careerPathCooldowns ?? {};

  // ── 5% 年度触发检查 ──────────────────────────────────────────────────────
  // 上次触发时的 gameDays（-1 表示从未触发）
  const lastTriggerDay = cooldowns[MI_TRIGGER_KEY] ?? -1;
  // 是否本年度内已触发：距离上次触发不满365天则认为已触发
  const isTriggered = lastTriggerDay >= 0 && (gameDays - lastTriggerDay) < OPINION_TRIGGER_PERIOD;

  // ── 持久化处理状态：从 massIncidentResults 读取，与 gameDays 无关 ────────
  // 只要 massIncidentResults 中有该 key 的记录，就视为已处理（永久保存）
  const parsedResults = useMemo<Record<string, string>>(() => {
    try { return JSON.parse(save.massIncidentResults ?? '{}') as Record<string, string>; } catch { return {}; }
  }, [save.massIncidentResults]);

  function isHandled(key: string): boolean {
    return !!parsedResults[key];
  }

  const opinion = save.publicOpinionIndex;
  const opinionColor = opinion >= 70 ? C.green : opinion >= 40 ? C.gold : C.red;
  const opinionLabel = opinion >= 80 ? '舆情平稳' : opinion >= 60 ? '基本稳定' : opinion >= 40 ? '略有波动' : opinion >= 20 ? '舆情紧张' : '舆情危机';

  // 随机决定今日活跃事件（基于gameDays做伪随机，固定当日事件列表）
  const activeIncidents = useMemo(() => {
    const seed = gameDays;
    const shuffled = [...INCIDENT_TEMPLATES].sort((a, b) => {
      const ha = (seed * a.key.charCodeAt(0) * 31) % 100;
      const hb = (seed * b.key.charCodeAt(0) * 31) % 100;
      return ha - hb;
    });
    return shuffled.slice(0, 3);
  }, [gameDays]);

  // ── 5% 触发逻辑：每次聚焦时掷骰一次，若触发则持久化 ──────────────────
  useFocusEffect(useCallback(() => {
    triggeredRef.current = false;
    setMsg(null);
  }, []));

  // 用 useEffect 在组件渲染后执行一次触发检查（依赖 isTriggered 和 gameDays）
  useEffect(() => {
    if (isTriggered) return;                 // 本年度已触发，不重复
    if (triggeredRef.current) return;        // 本次聚焦已掷过骰
    triggeredRef.current = true;
    if (Math.random() < OPINION_TRIGGER_CHANCE_MIN + Math.random() * (OPINION_TRIGGER_CHANCE_MAX - OPINION_TRIGGER_CHANCE_MIN)) {
      // 5% 概率触发：写入触发时间
      void updateGameSave({
        careerPathCooldowns: { ...cooldowns, [MI_TRIGGER_KEY]: gameDays },
      });
    }
    // 未触发时不写入，下次进入仍可掷骰（概率积累效果）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameDays]);

  async function handleOption(incident: IncidentTemplate, optIdx: number) {
    if (!save) return;
    if (isHandled(incident.key)) return;
    setLoading(true);
    const opt = incident.options[optIdx]!;
    const newOpinion = Math.min(100, Math.max(0, opinion + opt.opinionDelta));
    const newMoral = Math.min(100, Math.max(0, save.moralValue + opt.moralDelta));
    const newMerit = save.meritPoints + opt.meritDelta;
    const newCount = save.massIncidentCount + 1;
    // 持久化处置结果文本（包含选项标签+稳定性描述+舆情变化）
    let prevResults: Record<string, string> = {};
    try { prevResults = JSON.parse(save.massIncidentResults ?? '{}') as Record<string, string>; } catch { /* ignore */ }
    const delta = opt.opinionDelta >= 0 ? `+${opt.opinionDelta}` : `${opt.opinionDelta}`;
    const resultText = `【${opt.label}】${opt.stabilityDesc}，舆情${delta}→${newOpinion}（第${gameDays}天）`;
    const newResults = { ...prevResults, [incident.key]: resultText };
    // ── 自动解锁晋升：舆情处置完成后，若已满足晋升前置条件则自动开启 ──────
    // 副部级以上（rank>=10）晋升需至少处理1次舆情事件；此处为刚完成第一次时自动触发
    const rankLevel = save.rankLevel ?? 1;
    const needsMassCheck = rankLevel >= 10;
    const justUnlocksMassReq = needsMassCheck && newCount === 1; // 刚好满足舆情条件
    const promoAlreadyOpen = save.isPromotionAvailable ?? false;
    // 若晋升窗口尚未开启且刚满足舆情要求，则同步写入 isPromotionAvailable=true
    const shouldAutoUnlockPromo = justUnlocksMassReq && !promoAlreadyOpen;

    await updateGameSave({
      publicOpinionIndex: newOpinion,
      moralValue: newMoral,
      meritPoints: newMerit,
      massIncidentCount: newCount,
      careerPathCooldowns: cooldowns,
      massIncidentResults: JSON.stringify(newResults),
      ...(shouldAutoUnlockPromo ? { isPromotionAvailable: true } : {}),
    });
    setMsg({
      text: shouldAutoUnlockPromo
        ? `${incident.title}处理完毕。舆情${delta}→${newOpinion}，🎉 晋升系统已自动解锁！`
        : `${incident.title}处理完毕。舆情${delta}→${newOpinion}，${opt.stabilityDesc}`,
      type: opt.opinionDelta >= 0 ? 'success' : 'warn',
    });
    setLoading(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.header} />
      <View style={{ backgroundColor: C.header, paddingTop: insets.top + 6, paddingBottom: 14, paddingHorizontal: 18 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: C.goldLight, fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 }}>群体性事件管理</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>舆情监控 · 事件处置 · 社会稳定</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>

        {/* 消息 */}
        {msg && (
          <View style={{ borderRadius: 8, padding: 12, borderLeftWidth: 4,
            backgroundColor: msg.type === 'success' ? C.greenLight : msg.type === 'warn' ? C.goldLight : C.redLight,
            borderLeftColor: msg.type === 'success' ? C.green : msg.type === 'warn' ? C.gold : C.red }}>
            <Text style={{ fontSize: 12, color: msg.type === 'success' ? C.green : msg.type === 'warn' ? C.orange : C.red, fontWeight: '700', lineHeight: 18 }}>{msg.text}</Text>
            <Pressable onPress={() => setMsg(null)}>
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>点击关闭</Text>
            </Pressable>
          </View>
        )}

        {/* 舆情总览 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.label, marginBottom: 12 }}>📊 舆情总览</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {[
              { label: '舆情指数', value: opinion, color: opinionColor, sub: opinionLabel },
              { label: '本届事件', value: save.massIncidentCount, color: C.navy, sub: '次', isRaw: true },
              { label: '本届未处置', value: save.massIncidentPending, color: save.massIncidentPending > 0 ? C.red : C.green, sub: '件', isRaw: true },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, alignItems: 'center', padding: 10, borderRadius: 8,
                backgroundColor: '#F5F0E8', borderWidth: 1, borderColor: C.divider }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: item.color }}>
                  {item.isRaw ? item.value : `${item.value}`}
                </Text>
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.label}</Text>
                <Text style={{ fontSize: 9, color: item.color, fontWeight: '700', marginTop: 1 }}>{item.sub}</Text>
              </View>
            ))}
          </View>
          {/* 舆情进度条 */}
          <View style={{ height: 8, backgroundColor: '#E5E0D8', borderRadius: 4, overflow: 'hidden' }}>
            <View style={{ height: '100%', borderRadius: 4, width: `${opinion}%`, backgroundColor: opinionColor }} />
          </View>
          <Text style={{ fontSize: 10, color: C.muted, marginTop: 5 }}>
            舆情指数{'<'}30 时影响晋升考核。通过处理群体性事件提升舆情。
          </Text>
        </View>

        {/* 处置指南 */}
        <View style={{ backgroundColor: C.goldLight, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.goldBorder, flexDirection: 'row', gap: 8 }}>
          <Text style={{ fontSize: 16 }}>💡</Text>
          <Text style={{ fontSize: 11, color: C.muted, flex: 1, lineHeight: 17 }}>
            舆情处置事件每年以5%~25%随机概率触发。触发后处置结果将永久保存，全部处置完可点刷新获取新一批事件。副部级以上晋升需至少处置过1次事件。
          </Text>
        </View>

        {/* 未触发提示 */}
        {!isTriggered && (
          <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 32 }}>🕊️</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: C.label }}>本年度暂无舆情事件</Text>
            <Text style={{ fontSize: 11, color: C.muted, textAlign: 'center', lineHeight: 17 }}>
              舆情处置事件每年有5%~25%随机概率触发，当前社会舆情总体平稳。{'\n'}
              推进时间后有机会触发新的群体性事件。
            </Text>
            {lastTriggerDay >= 0 && (
              <Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>
                距上次触发已过 {gameDays - lastTriggerDay} 天（满365天后可再次掷骰）
              </Text>
            )}
          </View>
        )}

        {/* 事件列表（仅触发时显示） */}
        {isTriggered && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: C.label, letterSpacing: 1 }}>
                📋 当前待处置事件（{activeIncidents.filter(i => !isHandled(i.key)).length} 件）
              </Text>
              {/* 刷新按钮：全部处置完后显示 */}
              {activeIncidents.every(i => isHandled(i.key)) && (
                <Pressable
                  disabled={loading}
                  onPress={async () => {
                    setLoading(true);
                    // 重置触发天，让下次推进时重新掷骰触发
                    const newCooldowns = { ...cooldowns };
                    delete (newCooldowns as Record<string, number>)[MI_TRIGGER_KEY];
                    // 同时清除本批事件的处理记录（cooldowns + massIncidentResults）
                    for (const inc of activeIncidents) delete (newCooldowns as Record<string, number>)[MI_KEY_PREFIX + inc.key];
                    const newResults = { ...parsedResults };
                    for (const inc of activeIncidents) delete newResults[inc.key];
                    await updateGameSave({ careerPathCooldowns: newCooldowns, massIncidentResults: JSON.stringify(newResults) });
                    setMsg({ text: '✅ 事件批次已刷新，新一批事件已就绪', type: 'success' });
                    setLoading(false);
                  }}
                  style={{ backgroundColor: C.gold, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>🔄 刷新事件</Text>
                </Pressable>
              )}
            </View>

            {activeIncidents.map(incident => {
              const urg = URGENCY_CONFIG[incident.urgency];
              const handled = isHandled(incident.key);
              const catColor = CATEGORY_COLOR[incident.category] ?? C.muted;
              // 读取该事件的持久化处置结果文本
              let savedResultText = '';
              try {
                const allResults = JSON.parse(save.massIncidentResults ?? '{}') as Record<string, string>;
                savedResultText = allResults[incident.key] ?? '';
              } catch { /* ignore */ }

              return (
                <View key={incident.key} style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: handled ? 1 : 1.5,
                  borderColor: handled ? C.divider : urg.border, overflow: 'hidden', opacity: handled ? 0.75 : 1 }}>
                  {/* 头部 */}
                  <View style={{ padding: 12, flexDirection: 'row', gap: 10, backgroundColor: handled ? '#F5F0E8' : urg.bg }}>
                    <Text style={{ fontSize: 28 }}>{incident.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: C.navy }}>{incident.title}</Text>
                        <View style={{ backgroundColor: urg.bg, paddingHorizontal: 6, paddingVertical: 2,
                          borderRadius: 4, borderWidth: 1, borderColor: urg.border }}>
                          <Text style={{ fontSize: 9, fontWeight: '800', color: urg.color }}>{urg.icon} {urg.label}</Text>
                        </View>
                        <View style={{ backgroundColor: catColor + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 9, fontWeight: '700', color: catColor }}>{incident.category}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 4, lineHeight: 16 }}>{incident.desc}</Text>
                    </View>
                  </View>

                  {/* 已处理：显示持久化结果 */}
                  {handled && (
                    <View style={{ padding: 12, backgroundColor: C.greenLight, borderTopWidth: 1, borderTopColor: C.greenMid }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Text style={{ fontSize: 16 }}>✅</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: C.green }}>已处置</Text>
                      </View>
                      {savedResultText ? (
                        <Text style={{ fontSize: 11, color: C.green, lineHeight: 16 }}>{savedResultText}</Text>
                      ) : (
                        <Text style={{ fontSize: 11, color: C.muted }}>处置结果已记录</Text>
                      )}
                    </View>
                  )}

                  {/* 未处理：显示选项 */}
                  {!handled && (
                    <View style={{ padding: 12, gap: 8 }}>
                      <Text style={{ fontSize: 11, color: C.label, fontWeight: '700', marginBottom: 2 }}>请选择处置方案：</Text>
                      {incident.options.map((opt, idx) => {
                        const positive = opt.opinionDelta >= 0;
                        return (
                          <Pressable key={idx} onPress={() => !loading && handleOption(incident, idx)}
                            disabled={loading}
                            style={{ borderRadius: 8, borderWidth: 1.5,
                              borderColor: positive ? C.greenMid : C.redMid,
                              backgroundColor: positive ? C.greenLight : C.redLight,
                              padding: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                              <Text style={{ fontSize: 20, marginTop: 1 }}>{opt.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: positive ? C.green : C.red }}>{opt.label}</Text>
                                <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 15 }}>{opt.stabilityDesc}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                                  {[
                                    { label: `舆情 ${opt.opinionDelta >= 0 ? '+' : ''}${opt.opinionDelta}`, color: opt.opinionDelta >= 0 ? C.green : C.red },
                                    { label: `廉洁 ${opt.moralDelta >= 0 ? '+' : ''}${opt.moralDelta}`, color: opt.moralDelta >= 0 ? C.green : C.red },
                                    { label: `政绩 ${opt.meritDelta >= 0 ? '+' : ''}${opt.meritDelta}`, color: opt.meritDelta >= 0 ? C.green : C.red },
                                  ].map(badge => (
                                    <View key={badge.label} style={{ paddingHorizontal: 7, paddingVertical: 3,
                                      borderRadius: 4, backgroundColor: '#fff', borderWidth: 1, borderColor: badge.color + '40' }}>
                                      <Text style={{ fontSize: 10, fontWeight: '700', color: badge.color }}>{badge.label}</Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                </View>
              )}
            </View>
          );
        })}
          </>
        )}

        {/* 舆情管理策略 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.navy, padding: 12 }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>📈 舆情提升策略</Text>
          </View>
          <View style={{ padding: 14, gap: 8 }}>
            {[
              { icon: '🏥', label: '改善民生设施', desc: '加大民生投入可持续提升舆情指数，每次施政+3~8' },
              { icon: '📣', label: '主动信息公开', desc: '定期发布施政报告，透明施政提升公众信任' },
              { icon: '🌿', label: '环境治理项目', desc: '开展生态文明建设，有效提升舆情和民心' },
              { icon: '🏘️', label: '解决信访积案', desc: '清理历史信访积案可大幅提升舆情+10~20' },
            ].map(item => (
              <View key={item.label} style={{ flexDirection: 'row', gap: 10, padding: 10,
                backgroundColor: '#F5F0E8', borderRadius: 6, alignItems: 'flex-start' }}>
                <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: C.label }}>{item.label}</Text>
                  <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{item.desc}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
