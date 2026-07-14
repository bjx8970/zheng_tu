// 权色/权钱交易玩法 — 厅级（rank7）以上解锁，每次有概率触发双规落马
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { updateSave } from '@/db/gameApi';

// ── 配色 ─────────────────────────────────────────────────────────────────────
const C = {
  bg:         '#0A0E1A',
  bgCard:     '#101828',
  bgPanel:    '#0C1423',
  border:     '#1E2D45',
  accent:     '#C8253A',
  accentBg:   'rgba(200,37,58,0.12)',
  gold:       '#C8A84B',
  goldBg:     'rgba(200,168,75,0.10)',
  text:       '#E8F0FA',
  textMid:    '#8AA0BA',
  textDim:    '#4A6080',
  green:      '#34C759',
  greenBg:    'rgba(52,199,89,0.10)',
  purple:     '#AF52DE',
  purpleBg:   'rgba(175,82,222,0.12)',
  warn:       '#FF9F0A',
  warnBg:     'rgba(255,159,10,0.10)',
};

// ── 交易行动类型 ──────────────────────────────────────────────────────────────
interface TradeAction {
  key: string;
  category: '权钱' | '权色';
  icon: string;
  title: string;
  desc: string;
  reward: string;        // 收益描述
  moneyGain: number;     // 财政余额增加（万元，0=无）
  moralDelta: number;    // 道德值变化（负数）
  riskAdd: number;       // 巡视风险增加（%）
  fallProbBase: number;  // 落马基础概率（%）
  cooldownDays: number;
  minRank: number;
}

const TRADE_ACTIONS: TradeAction[] = [
  // ── 权钱交易 ──
  {
    key: 'pt_project_bid',
    category: '权钱',
    icon: '🏗️',
    title: '工程招标暗箱操作',
    desc: '在重大工程招标中暗中操纵评审，帮助特定企业中标，收取高额"感谢费"。证据链复杂，但金额巨大。',
    reward: '财政余额 +200万，道德 -12',
    moneyGain: 200, moralDelta: -12, riskAdd: 12, fallProbBase: 8,
    cooldownDays: 60, minRank: 7,
  },
  {
    key: 'pt_license_sell',
    category: '权钱',
    icon: '📋',
    title: '许可证倒卖',
    desc: '利用审批权限，向急需资质许可的企业暗中收取"加急费"，跳过正常审批流程。操作隐蔽，风险适中。',
    reward: '财政余额 +80万，道德 -6',
    moneyGain: 80, moralDelta: -6, riskAdd: 6, fallProbBase: 4,
    cooldownDays: 30, minRank: 7,
  },
  {
    key: 'pt_land_insider',
    category: '权钱',
    icon: '🏠',
    title: '土地内幕交易',
    desc: '提前将即将升值的土地信息泄露给特定商人，收取"信息费"。涉及金额大，一旦查处后果严重。',
    reward: '财政余额 +350万，道德 -18',
    moneyGain: 350, moralDelta: -18, riskAdd: 20, fallProbBase: 12,
    cooldownDays: 90, minRank: 9,
  },
  {
    key: 'pt_fine_pocket',
    category: '权钱',
    icon: '💰',
    title: '罚没款截留',
    desc: '将执法部门的罚没款项截留入私囊，以各种名义做账掩盖。金额适中，但监察部门重点关注此类行为。',
    reward: '财政余额 +50万，道德 -5',
    moneyGain: 50, moralDelta: -5, riskAdd: 8, fallProbBase: 5,
    cooldownDays: 25, minRank: 7,
  },
  {
    key: 'pt_state_asset',
    category: '权钱',
    icon: '🏭',
    title: '国资低价转让',
    desc: '将国有企业或资产以远低于市场价格转让给关联方，从中抽取大额回扣。金额极大，属于重大腐败行为。',
    reward: '财政余额 +600万，道德 -25',
    moneyGain: 600, moralDelta: -25, riskAdd: 30, fallProbBase: 18,
    cooldownDays: 120, minRank: 10,
  },
  // ── 权色交易 ──
  {
    key: 'pt_dinner_seduction',
    category: '权色',
    icon: '🍷',
    title: '宴会桃色接待',
    desc: '接受商人安排的特殊宴会接待，借助"关系维护"名义建立私人纽带。发展私人关系，但一旦被举报后果严重。',
    reward: '上司好感 +5，道德 -10',
    moneyGain: 0, moralDelta: -10, riskAdd: 10, fallProbBase: 8,
    cooldownDays: 45, minRank: 7,
  },
  {
    key: 'pt_mistress_cover',
    category: '权色',
    icon: '💋',
    title: '包养关系维持',
    desc: '与特定人员建立长期不正当关系，换取各方面资源支持。长期关系增加被举报风险，道德持续下滑。',
    reward: '人脉值 +10，道德 -20',
    moneyGain: 0, moralDelta: -20, riskAdd: 18, fallProbBase: 14,
    cooldownDays: 60, minRank: 7,
  },
  {
    key: 'pt_sex_bribe_accept',
    category: '权色',
    icon: '🌹',
    title: '接受色情贿赂',
    desc: '利用职权换取性贿赂，以此获取施事者在商业或政治上的支持。此举风险极高，纪检部门严厉打击。',
    reward: '道德 -30，巡视风险大增',
    moneyGain: 0, moralDelta: -30, riskAdd: 25, fallProbBase: 20,
    cooldownDays: 90, minRank: 8,
  },
];

// ── 工具函数 ──────────────────────────────────────────────────────────────────
function formatCooldown(lastDay: number, cd: number, gameDays: number): string {
  const remaining = (lastDay + cd) - gameDays;
  if (remaining <= 0) return '';
  return `冷却 ${remaining} 天`;
}

// ── 主组件 ─────────────────────────────────────────────────────────────────────
export default function PowerTrade() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();

  const [loading, setLoading] = useState(false);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [activeCategory, setActiveCategory] = useState<'权钱' | '权色'>('权钱');
  const [result, setResult] = useState<{ title: string; desc: string; success: boolean; fallen?: boolean } | null>(null);
  const [acting, setActing] = useState(false);

  useFocusEffect(useCallback(() => {
    setCooldowns((save?.powerTradeCooldowns as Record<string, number>) ?? {});
  }, [save]));

  const gameDays = save?.gameDays ?? 0;
  const rank = save?.rankLevel ?? 1;
  const moral = save?.moralValue ?? 80;
  const inspRisk = save?.inspectionRisk ?? 0;

  const isCool = (key: string, cd: number) => {
    const last = cooldowns[key] ?? 0;
    return gameDays - last < cd;
  };

  const cdLeft = (key: string, cd: number) => {
    const last = cooldowns[key] ?? 0;
    return Math.max(0, cd - (gameDays - last));
  };

  // 执行交易
  const doTrade = async (action: TradeAction) => {
    if (acting) return;
    if (!save) return;
    if (rank < action.minRank) {
      setResult({ title: '等级不足', desc: `需达到 ${action.minRank} 级（厅级）才能解锁此交易`, success: false });
      return;
    }
    if (isCool(action.key, action.cooldownDays)) {
      setResult({ title: '冷却中', desc: `还需 ${cdLeft(action.key, action.cooldownDays)} 天后才能再次进行`, success: false });
      return;
    }

    setActing(true);
    try {
      const newCooldowns = { ...cooldowns, [action.key]: gameDays };

      // 计算实际落马概率（受道德值和风险值影响）
      const moralFactor = Math.max(0, (100 - moral) / 100);
      const riskFactor  = Math.min(1, (inspRisk + action.riskAdd) / 100);
      const fallProb    = action.fallProbBase + moralFactor * 15 + riskFactor * 20;
      const fallen      = Math.random() * 100 < fallProb;

      if (fallen) {
        const newMoral   = Math.max(0, moral - 40);
        const newRisk    = Math.min(100, inspRisk + action.riskAdd * 3);
        await updateGameSave({
          powerTradeCooldowns: newCooldowns,
          moralValue:          newMoral,
          inspectionRisk:      newRisk,
          grayIncomeTotal:     (save.grayIncomeTotal ?? 0) + action.moneyGain,
          meritPoints: Math.max(0, (save.meritPoints ?? 0) - 500),
          bossFavor:   Math.max(0, (save.bossFavor ?? 50) - 30),
        });
        setCooldowns(newCooldowns);
        { const _pt_f=`${action.title}被举报！纪检部门已对你实施双规调查。道德-40，政绩-500，上司好感-30。`; void saveResult('powerTrade_'+action.key, {ok:false,desc:'⚠️ 双规！'+_pt_f,day:save.gameDays??0}); }
        setResult({
          title: '⚠️ 双规！东窗事发',
          desc: `${action.title}被举报！纪检部门已对你实施双规调查。道德-40，政绩-500，上司好感-30。情节严重可能导致晋升受阻，请尽快通过灰色收入页面处理。`,
          success: false,
          fallen: true,
        });
      } else {
        const newMoral = Math.max(0, moral + action.moralDelta);
        const newRisk  = Math.min(100, inspRisk + action.riskAdd);
        const updates: Parameters<typeof updateGameSave>[0] = {
          powerTradeCooldowns: newCooldowns,
          moralValue:          newMoral,
          inspectionRisk:      newRisk,
          grayIncomeTotal:     (save.grayIncomeTotal ?? 0) + action.moneyGain,
        };
        if (action.moneyGain > 0) {
          updates.fundBalance = Math.round(((save.fundBalance ?? 0) + action.moneyGain) * 10) / 10;
        }
        if (action.key === 'pt_dinner_seduction') {
          updates.bossFavor = Math.min(100, (save.bossFavor ?? 50) + 5);
        }
        if (action.key === 'pt_mistress_cover') {
          updates.networkValue = Math.min(200, (save.networkValue ?? 0) + 10);
        }
        await updateGameSave(updates);
        setCooldowns(newCooldowns);

        const rewardDesc = action.moneyGain > 0
          ? `获得 +${action.moneyGain}万 私房钱。道德-${Math.abs(action.moralDelta)}，巡视风险+${action.riskAdd}%。`
          : `行动完成。道德-${Math.abs(action.moralDelta)}，巡视风险+${action.riskAdd}%。`;
        const _pt_ok = rewardDesc + `（当前巡视风险：${newRisk.toFixed(0)}%）`;
        void saveResult('powerTrade_'+action.key, {ok:true,desc:`✅ ${action.title} `+_pt_ok,day:save.gameDays??0});
        setResult({
          title: `✅ ${action.title}`,
          desc: _pt_ok,
          success: true,
        });
      }
    } catch {
      setResult({ title: '操作失败', desc: '网络异常，请稍后重试', success: false });
    } finally {
      setActing(false);
    }
  };

  const filtered = TRADE_ACTIONS.filter(a => a.category === activeCategory);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.bg} />

      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 14,
        backgroundColor: C.bgPanel, borderBottomWidth: 1, borderBottomColor: C.border }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: C.textMid, fontSize: 22 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: C.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' }}>高风险 · 厅级解锁</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>🔐 权色/权钱交易</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: C.textMid, fontSize: 9 }}>巡视风险</Text>
            <Text style={{ color: inspRisk >= 60 ? C.accent : inspRisk >= 30 ? C.warn : C.green,
              fontSize: 18, fontWeight: '800' }}>{inspRisk.toFixed(0)}%</Text>
          </View>
        </View>

        {/* 解锁状态 */}
        {rank < 7 && (
          <View style={{ backgroundColor: C.accentBg, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6, marginTop: 8 }}>
            <Text style={{ color: C.accent, fontSize: 11 }}>⚠️ 需要达到厅级（7级）才可解锁权色/权钱交易，当前职级：{rank} 级</Text>
          </View>
        )}

        {/* 道德/风险状态 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          {[
            { label: '道德值', value: moral, max: 100, color: moral >= 60 ? C.green : moral >= 30 ? C.warn : C.accent },
            { label: '巡视风险', value: inspRisk, max: 100, color: inspRisk >= 60 ? C.accent : inspRisk >= 30 ? C.warn : C.green },
          ].map(item => (
            <View key={item.label} style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ color: C.textMid, fontSize: 9 }}>{item.label}</Text>
                <Text style={{ color: item.color, fontSize: 9, fontWeight: '700' }}>{item.value.toFixed(0)}</Text>
              </View>
              <View style={{ height: 4, backgroundColor: C.border, borderRadius: 2, overflow: 'hidden' }}>
                <View style={{ width: `${item.value}%`, height: '100%', backgroundColor: item.color }} />
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* 分类切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: C.bgPanel,
        borderBottomWidth: 1, borderBottomColor: C.border }}>
        {(['权钱', '权色'] as const).map(cat => (
          <Pressable key={cat} onPress={() => setActiveCategory(cat)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeCategory === cat ? C.accent : 'transparent' }}>
            <Text style={{ color: activeCategory === cat ? C.accent : C.textMid,
              fontSize: 13, fontWeight: activeCategory === cat ? '700' : '500' }}>
              {cat === '权钱' ? '💰 权钱交易' : '🌹 权色交易'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        {/* 风险提示 */}
        <View style={{ margin: 12, marginBottom: 0, backgroundColor: C.warnBg,
          borderRadius: 8, borderWidth: 1, borderColor: C.warn, padding: 10 }}>
          <Text style={{ color: C.warn, fontSize: 11, lineHeight: 17 }}>
            ⚠️ 每次交易均有概率触发双规落马。道德值越低、巡视风险越高，落马概率越大。落马后政绩大幅扣减，晋升受阻。
          </Text>
        </View>

        <View style={{ padding: 12, gap: 10 }}>
          {filtered.map(action => {
            const locked   = rank < action.minRank;
            const cooling  = isCool(action.key, action.cooldownDays);
            const disabled = locked || cooling || acting;
            const cdStr    = cooling ? formatCooldown(cooldowns[action.key] ?? 0, action.cooldownDays, gameDays) : '';

            return (
              <View key={action.key} style={{
                backgroundColor: C.bgCard,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: locked ? C.textDim : action.category === '权色' ? C.purple : C.gold,
                opacity: locked ? 0.4 : 1,
                overflow: 'hidden',
              }}>
                {/* 头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
                  padding: 12, backgroundColor: action.category === '权色' ? C.purpleBg : C.goldBg }}>
                  <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{action.title}</Text>
                    <Text style={{ color: action.category === '权色' ? C.purple : C.gold, fontSize: 10, marginTop: 2 }}>
                      {action.category === '权色' ? '🌹 权色交易' : '💰 权钱交易'} · 最低 {action.minRank} 级
                    </Text>
                  </View>
                  {/* 落马风险标签 */}
                  <View style={{ backgroundColor: C.accentBg, borderRadius: 4,
                    paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: C.accent }}>
                    <Text style={{ color: C.accent, fontSize: 9, fontWeight: '700' }}>
                      落马 ~{action.fallProbBase}%+
                    </Text>
                  </View>
                </View>

                {/* 描述 */}
                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={{ color: C.textMid, fontSize: 12, lineHeight: 18 }}>{action.desc}</Text>

                  {/* 效果行 */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    {action.moneyGain > 0 && (
                      <View style={{ backgroundColor: C.greenBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                        <Text style={{ color: C.green, fontSize: 10, fontWeight: '600' }}>+{action.moneyGain}万</Text>
                      </View>
                    )}
                    <View style={{ backgroundColor: C.accentBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                      <Text style={{ color: C.accent, fontSize: 10 }}>道德 {action.moralDelta}</Text>
                    </View>
                    <View style={{ backgroundColor: C.warnBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                      <Text style={{ color: C.warn, fontSize: 10 }}>风险 +{action.riskAdd}%</Text>
                    </View>
                    <View style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                      <Text style={{ color: C.textMid, fontSize: 10 }}>CD {action.cooldownDays}天</Text>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <Pressable
                    onPress={() => !disabled && doTrade(action)}
                    style={{
                      backgroundColor: disabled ? C.bgPanel : C.accent,
                      borderRadius: 6, paddingVertical: 10, alignItems: 'center',
                      borderWidth: 1,
                      borderColor: disabled ? C.border : C.accent,
                      opacity: disabled ? 0.6 : 1,
                    }}>
                    {acting ? (
                      <ActivityIndicator size="small" color={C.text} />
                    ) : (
                      <Text style={{ color: disabled ? C.textMid : '#fff', fontSize: 13, fontWeight: '700' }}>
                        {locked ? `🔒 需${action.minRank}级解锁` : cooling ? cdStr : '执行交易'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* 历史统计 */}
        <View style={{ margin: 12, marginTop: 0, backgroundColor: C.bgCard,
          borderRadius: 10, borderWidth: 1, borderColor: C.border, padding: 14, gap: 6 }}>
          <Text style={{ color: C.textMid, fontSize: 11, fontWeight: '700', letterSpacing: 1 }}>📊 交易统计</Text>
          <View style={{ flexDirection: 'row', gap: 16 }}>
            <View>
              <Text style={{ color: C.textDim, fontSize: 9 }}>累计灰色收入</Text>
              <Text style={{ color: C.gold, fontSize: 16, fontWeight: '800' }}>
                {Math.floor(save?.grayIncomeTotal ?? 0).toLocaleString()}万
              </Text>
            </View>
            <View>
              <Text style={{ color: C.textDim, fontSize: 9 }}>当前道德值</Text>
              <Text style={{ color: moral >= 60 ? C.green : moral >= 30 ? C.warn : C.accent,
                fontSize: 16, fontWeight: '800' }}>{moral.toFixed(0)}</Text>
            </View>
            <View>
              <Text style={{ color: C.textDim, fontSize: 9 }}>巡视风险</Text>
              <Text style={{ color: inspRisk >= 60 ? C.accent : C.warn,
                fontSize: 16, fontWeight: '800' }}>{inspRisk.toFixed(0)}%</Text>
            </View>
          </View>
        </View>

        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* 结果弹窗 */}
      <Modal visible={!!result} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setResult(null)}>
          <View style={{ width: 300, backgroundColor: C.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: result?.fallen ? C.accent : result?.success ? C.green : C.border,
            padding: 20, gap: 12 }} onStartShouldSetResponder={() => true}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
              {result?.title}
            </Text>
            {result?.fallen && (
              <View style={{ backgroundColor: C.accentBg, borderRadius: 8, padding: 10 }}>
                <Text style={{ color: C.accent, fontSize: 11, textAlign: 'center', fontWeight: '700' }}>
                  🚨 双规警告：纪检机关已介入
                </Text>
              </View>
            )}
            <Text style={{ color: C.textMid, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>
              {result?.desc}
            </Text>
            <Pressable onPress={() => setResult(null)} style={{
              backgroundColor: result?.fallen ? C.accent : C.bgPanel,
              borderRadius: 8, paddingVertical: 10, alignItems: 'center',
              borderWidth: 1, borderColor: result?.fallen ? C.accent : C.border }}>
              <Text style={{ color: C.text, fontSize: 13, fontWeight: '700' }}>
                {result?.fallen ? '接受调查' : '确认'}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
