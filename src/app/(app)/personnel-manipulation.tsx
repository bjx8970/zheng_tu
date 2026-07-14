// 插手人事任免 + 考试录用 — 党务路线专属（rank>=3解锁）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// ── 配色 ─────────────────────────────────────────────────────────────────────
const C = {
  bg:       '#0D1520',
  bgCard:   '#111D2C',
  bgPanel:  '#0A1218',
  border:   '#1A2D40',
  primary:  '#1A56B0',
  accent:   '#C8A84B',
  red:      '#C82829',
  redBg:    'rgba(200,40,41,0.10)',
  text:     '#E8F0FA',
  textMid:  '#8AA0BA',
  textDim:  '#4A6080',
  green:    '#34C759',
  greenBg:  'rgba(52,199,89,0.10)',
  amber:    '#FF9F0A',
  amberBg:  'rgba(255,159,10,0.10)',
};

// ── 人事干预行动 ──────────────────────────────────────────────────────────────
interface PersonnelAction {
  key: string;
  category: '任免干预' | '考试录用';
  icon: string;
  title: string;
  desc: string;
  cost: { type: 'network' | 'merit' | 'money'; amount: number };
  outcomes: {
    success: { label: string; meritDelta?: number; networkDelta?: number; bossFavorDelta?: number; fundDelta?: number };
    fail:    { label: string; meritDelta?: number; networkDelta?: number; bossFavorDelta?: number };
  };
  successRate: number;
  cooldownDays: number;
  minRank: number;
}

const PERSONNEL_ACTIONS: PersonnelAction[] = [
  // ── 任免干预 ──
  {
    key: 'pa_nominate_ally',
    category: '任免干预',
    icon: '📌',
    title: '定向提名盟友',
    desc: '在干部考察环节，利用组织部话语权为己方人马定向提名，绕过常规竞争上岗程序，将盟友推入候选名单。',
    cost: { type: 'network', amount: 20 },
    successRate: 70,
    cooldownDays: 60,
    minRank: 3,
    outcomes: {
      success: { label: '盟友成功进入候选名单，派系影响力上升', meritDelta: 30, networkDelta: 5 },
      fail:    { label: '提名遭上级否决，引起关注，上司好感下降', bossFavorDelta: -8 },
    },
  },
  {
    key: 'pa_block_rival',
    category: '任免干预',
    icon: '🚫',
    title: '卡住竞争对手',
    desc: '通过组织程序或"发现问题"的方式，将竞争对手的晋升材料搁置或否决，阻止其进入更高岗位。',
    cost: { type: 'network', amount: 15 },
    successRate: 65,
    cooldownDays: 45,
    minRank: 3,
    outcomes: {
      success: { label: '竞争对手晋升受阻，你的地位进一步稳固', meritDelta: 20 },
      fail:    { label: '手段被察觉，派系矛盾激化，政绩受损', meritDelta: -20, bossFavorDelta: -10 },
    },
  },
  {
    key: 'pa_arrange_position',
    category: '任免干预',
    icon: '🎯',
    title: '安排要职出缺',
    desc: '借助手中的人事权限，将空缺要职定向安排给亲信，而非走公开遴选程序。权大责大，一旦失败后果严重。',
    cost: { type: 'network', amount: 30 },
    successRate: 55,
    cooldownDays: 90,
    minRank: 5,
    outcomes: {
      success: { label: '亲信顺利就位，组织系统进一步被你掌控', meritDelta: 50, networkDelta: 10 },
      fail:    { label: '安排曝光，引发纪检关注，信任大损', meritDelta: -50, bossFavorDelta: -20 },
    },
  },
  {
    key: 'pa_force_retire',
    category: '任免干预',
    icon: '🔄',
    title: '促使异见者提前退休',
    desc: '利用"照顾身体"或"政策规定"为由，推动不听话的下属或竞争对手提前退休，腾出位置。',
    cost: { type: 'network', amount: 25 },
    successRate: 60,
    cooldownDays: 75,
    minRank: 5,
    outcomes: {
      success: { label: '对方顺利提前退休，你的阵营更加统一', meritDelta: 30, networkDelta: 5 },
      fail:    { label: '对方不肯配合，且向上级反映情况，影响恶劣', meritDelta: -30, bossFavorDelta: -15 },
    },
  },
  {
    key: 'pa_reassign_rival',
    category: '任免干预',
    icon: '✈️',
    title: '平调竞争对手',
    desc: '以"工作需要"为名，将竞争对手平调至偏远或无关紧要的岗位，削弱其影响力和上升通道。',
    cost: { type: 'network', amount: 20 },
    successRate: 65,
    cooldownDays: 60,
    minRank: 4,
    outcomes: {
      success: { label: '对手被调离核心岗位，你的影响力明显增强', meritDelta: 25, networkDelta: 8 },
      fail:    { label: '调动被否决，对手反而获得上级同情', bossFavorDelta: -10, meritDelta: -15 },
    },
  },
  // ── 考试录用 ──
  {
    key: 'pa_exam_leak',
    category: '考试录用',
    icon: '📝',
    title: '定向泄露考题',
    desc: '在公务员遴选考试前，将部分考题或答题方向透露给特定人员，确保己方人马高分通过笔试。',
    cost: { type: 'money', amount: 50 },
    successRate: 75,
    cooldownDays: 90,
    minRank: 3,
    outcomes: {
      success: { label: '目标人员以高分通过考试，成功入围', meritDelta: 20, networkDelta: 5 },
      fail:    { label: '泄题被发现，考试成绩无效，被纪检约谈', meritDelta: -40, bossFavorDelta: -15 },
    },
  },
  {
    key: 'pa_interview_fix',
    category: '考试录用',
    icon: '🗣️',
    title: '操控面试评分',
    desc: '在面试评审环节，通过向评委施压或更换评委成员，确保己方候选人获得高分通过面试。',
    cost: { type: 'network', amount: 12 },
    successRate: 70,
    cooldownDays: 45,
    minRank: 3,
    outcomes: {
      success: { label: '候选人顺利通过面试，成功录用', meritDelta: 15 },
      fail:    { label: '评委之一拒绝配合并举报，影响恶劣', meritDelta: -25, bossFavorDelta: -12 },
    },
  },
  {
    key: 'pa_direct_appoint',
    category: '考试录用',
    icon: '👤',
    title: '绕过考试直接任命',
    desc: '借助"紧急需要"或"特殊人才引进"名义，为特定人员直接办理任命手续，绕开正常考试录用程序。',
    cost: { type: 'money', amount: 100 },
    successRate: 50,
    cooldownDays: 120,
    minRank: 6,
    outcomes: {
      success: { label: '人才引进成功，直接上岗，绕过竞争', meritDelta: 40, networkDelta: 10 },
      fail:    { label: '程序违规被组织部否决，且已记录在案', meritDelta: -60, bossFavorDelta: -25 },
    },
  },
];

// ── 主组件 ─────────────────────────────────────────────────────────────────────
export default function PersonnelManipulation() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();

  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [activeCategory, setActiveCategory] = useState<'任免干预' | '考试录用'>('任免干预');
  const [result, setResult] = useState<{ title: string; desc: string; success: boolean } | null>(null);
  const [acting, setActing] = useState(false);

  useFocusEffect(useCallback(() => {
    setCooldowns((save?.personnelCooldowns as Record<string, number>) ?? {});
  }, [save]));

  const gameDays   = save?.gameDays ?? 0;
  const rank       = save?.rankLevel ?? 1;
  const network    = save?.networkValue ?? 0;
  const merit      = save?.meritPoints ?? 0;
  const fundBal    = save?.fundBalance ?? 0;
  const careerLine = save?.careerPathLine ?? '';

  const isCool = (key: string, cd: number) => {
    const last = cooldowns[key] ?? 0;
    return gameDays - last < cd;
  };
  const cdLeft = (key: string, cd: number) => Math.max(0, cd - (gameDays - (cooldowns[key] ?? 0)));

  const canAfford = (cost: PersonnelAction['cost']) => {
    if (cost.type === 'network') return network >= cost.amount;
    if (cost.type === 'merit')   return merit >= cost.amount;
    if (cost.type === 'money')   return fundBal >= cost.amount;
    return true;
  };
  const costLabel = (cost: PersonnelAction['cost']) => {
    if (cost.type === 'network') return `消耗人脉 ${cost.amount}`;
    if (cost.type === 'merit')   return `消耗政绩 ${cost.amount}`;
    return `消耗资金 ${cost.amount}万`;
  };

  const doAction = async (action: PersonnelAction) => {
    if (acting) return;
    if (!save) return;
    if (rank < action.minRank) {
      setResult({ title: '等级不足', desc: `需达到 ${action.minRank} 级才能使用此手段`, success: false });
      return;
    }
    if (isCool(action.key, action.cooldownDays)) {
      setResult({ title: '冷却中', desc: `还需 ${cdLeft(action.key, action.cooldownDays)} 天后才能再次操作`, success: false });
      return;
    }
    if (!canAfford(action.cost)) {
      setResult({ title: '资源不足', desc: `${costLabel(action.cost)}，当前不足`, success: false });
      return;
    }

    setActing(true);
    try {
      const newCooldowns = { ...cooldowns, [action.key]: gameDays };
      // 非党务线降低成功率
      const effectiveRate = careerLine !== '党务线'
        ? Math.max(10, action.successRate - 25)
        : action.successRate;
      const success = Math.random() * 100 < effectiveRate;
      const outcome = success ? action.outcomes.success : action.outcomes.fail;

      const updates: Parameters<typeof updateGameSave>[0] = {
        personnelCooldowns: newCooldowns,
      };
      // 扣除成本
      if (action.cost.type === 'network') updates.networkValue = Math.max(0, network - action.cost.amount);
      if (action.cost.type === 'money')   updates.fundBalance  = Math.max(0, Math.round((fundBal - action.cost.amount) * 10) / 10);
      if (action.cost.type === 'merit')   updates.meritPoints  = Math.max(0, merit - action.cost.amount);

      // 应用效果
      if (outcome.meritDelta)     updates.meritPoints  = Math.max(0, (updates.meritPoints ?? merit) + outcome.meritDelta);
      if (outcome.bossFavorDelta) updates.bossFavor    = Math.min(100, Math.max(0, (save.bossFavor ?? 50) + outcome.bossFavorDelta));
      if (outcome.networkDelta)   updates.networkValue = Math.max(0, (updates.networkValue ?? network) + outcome.networkDelta);

      await updateGameSave(updates);
      setCooldowns(newCooldowns);
      void saveResult('personnel_'+action.key, {ok:success,desc:(success?'✅':'❌')+` ${action.title}: `+outcome.label,day:save.gameDays??0});
      setResult({
        title: success ? `✅ ${action.title}成功` : `❌ ${action.title}失败`,
        desc: outcome.label,
        success,
      });
    } catch {
      setResult({ title: '操作失败', desc: '网络异常，请稍后重试', success: false });
    } finally {
      setActing(false);
    }
  };

  const filtered = PERSONNEL_ACTIONS.filter(a => a.category === activeCategory);

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
            <Text style={{ color: C.accent, fontSize: 10, letterSpacing: 2, fontWeight: '700' }}>党务路线专属</Text>
            <Text style={{ color: C.text, fontSize: 18, fontWeight: '900' }}>👥 插手人事任免</Text>
          </View>
          <View style={{ gap: 4, alignItems: 'flex-end' }}>
            <Text style={{ color: C.textMid, fontSize: 9 }}>可用资源</Text>
            <Text style={{ color: C.accent, fontSize: 12, fontWeight: '700' }}>
              🤝 人脉 {network}  |  💰 {Math.floor(fundBal)}万
            </Text>
          </View>
        </View>

        {/* 非党务线提示 */}
        {careerLine !== '党务线' && (
          <View style={{ backgroundColor: C.redBg, borderRadius: 6, paddingHorizontal: 10,
            paddingVertical: 7, marginTop: 10, borderWidth: 1, borderColor: C.red }}>
            <Text style={{ color: C.red, fontSize: 11 }}>
              ⚠️ 此功能为党务路线专属，当前路线（{careerLine || '未知'}）操作成功率大幅降低，且风险更高。
            </Text>
          </View>
        )}
      </View>

      {/* 分类切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: C.bgPanel,
        borderBottomWidth: 1, borderBottomColor: C.border }}>
        {(['任免干预', '考试录用'] as const).map(cat => (
          <Pressable key={cat} onPress={() => setActiveCategory(cat)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeCategory === cat ? C.accent : 'transparent' }}>
            <Text style={{ color: activeCategory === cat ? C.accent : C.textMid,
              fontSize: 13, fontWeight: activeCategory === cat ? '700' : '500' }}>
              {cat === '任免干预' ? '📋 任免干预' : '📝 考试录用'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        <View style={{ padding: 12, gap: 10 }}>
          {filtered.map(action => {
            const locked   = rank < action.minRank;
            const cooling  = isCool(action.key, action.cooldownDays);
            const afford   = canAfford(action.cost);
            const disabled = locked || cooling || !afford || acting;
            // 非党务线降低成功率显示
            const displayRate = careerLine !== '党务线'
              ? Math.max(10, action.successRate - 25)
              : action.successRate;

            return (
              <View key={action.key} style={{
                backgroundColor: C.bgCard,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: locked ? C.textDim : C.border,
                opacity: locked ? 0.4 : 1,
                overflow: 'hidden',
              }}>
                {/* 头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10,
                  padding: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.text, fontSize: 14, fontWeight: '700' }}>{action.title}</Text>
                    <Text style={{ color: C.textMid, fontSize: 10, marginTop: 2 }}>
                      最低 {action.minRank} 级 · 冷却 {action.cooldownDays} 天
                    </Text>
                  </View>
                  <View style={{ alignItems: 'center', gap: 2 }}>
                    <Text style={{ color: displayRate >= 65 ? C.green : C.amber,
                      fontSize: 18, fontWeight: '900' }}>{displayRate}%</Text>
                    <Text style={{ color: C.textDim, fontSize: 8 }}>成功率</Text>
                  </View>
                </View>

                {/* 内容 */}
                <View style={{ padding: 12, gap: 8 }}>
                  <Text style={{ color: C.textMid, fontSize: 12, lineHeight: 18 }}>{action.desc}</Text>

                  {/* 成功/失败效果 */}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Text style={{ color: C.green, fontSize: 10, width: 40, fontWeight: '600' }}>成功</Text>
                      <Text style={{ color: C.textMid, fontSize: 11, flex: 1, lineHeight: 16 }}>
                        {action.outcomes.success.label}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                      <Text style={{ color: C.red, fontSize: 10, width: 40, fontWeight: '600' }}>失败</Text>
                      <Text style={{ color: C.textMid, fontSize: 11, flex: 1, lineHeight: 16 }}>
                        {action.outcomes.fail.label}
                      </Text>
                    </View>
                  </View>

                  {/* 成本标签 */}
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <View style={{ backgroundColor: C.amberBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3 }}>
                      <Text style={{ color: C.amber, fontSize: 10 }}>
                        {costLabel(action.cost)}
                        {!afford ? ' ⚠️不足' : ''}
                      </Text>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <Pressable
                    onPress={() => !disabled && doAction(action)}
                    style={{
                      backgroundColor: disabled ? C.bgPanel : C.primary,
                      borderRadius: 6, paddingVertical: 10, alignItems: 'center',
                      borderWidth: 1, borderColor: disabled ? C.border : C.primary,
                      opacity: disabled ? 0.6 : 1,
                    }}>
                    {acting ? (
                      <ActivityIndicator size="small" color={C.text} />
                    ) : (
                      <Text style={{ color: disabled ? C.textMid : '#fff', fontSize: 13, fontWeight: '700' }}>
                        {locked ? `🔒 需${action.minRank}级解锁`
                          : cooling ? `冷却中 (${cdLeft(action.key, action.cooldownDays)}天)`
                            : !afford ? '资源不足'
                              : '执行操作'}
                      </Text>
                    )}
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: insets.bottom + 24 }} />
      </ScrollView>

      {/* 结果弹窗 */}
      <Modal visible={!!result} transparent animationType="fade">
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' }}
          onPress={() => setResult(null)}>
          <View style={{ width: 290, backgroundColor: C.bgCard, borderRadius: 14,
            borderWidth: 1, borderColor: result?.success ? C.green : C.red,
            padding: 20, gap: 12 }} onStartShouldSetResponder={() => true}>
            <Text style={{ color: C.text, fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
              {result?.title}
            </Text>
            <Text style={{ color: C.textMid, fontSize: 12, lineHeight: 19, textAlign: 'center' }}>
              {result?.desc}
            </Text>
            <Pressable onPress={() => setResult(null)} style={{
              backgroundColor: C.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
