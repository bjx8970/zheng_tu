/**
 * 师承系统：
 * - 恩师：rank<7时10%概率邂逅部级以上NPC（只能一个）
 *   · 玩家升至 rank≥10 后恩师晋升一级（仅一次）
 *   · 定期汇报工作维系关系，享受政绩/派系加成
 * - 门生：rank≥12解锁，可培养一名心腹门生
 *   · 定期投入提升门生能力/忠诚
 *   · 关键晋升：推动门生升职（365天冷却）
 *   · 委以重任：让门生主导重大项目获政绩加成
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import type { CareerLine } from '@/lib/lineGameplay';

// ── 恩师 NPC 素材 ─────────────────────────────────────────────────────────────
const MENTOR_NPCS = [
  { name: '魏国栋', rank: 12, faction: '实干派', title: '联邦内阁部长', trait: '务实派系领袖，善于协调各方利益', bonusType: 'merit' as const },
  { name: '林泰平', rank: 12, faction: '改革派', title: '联邦国家部长', trait: '锐意改革，在派系内享有高声望',   bonusType: 'reform' as const },
  { name: '钟汉民', rank: 13, faction: '实干派', title: '联邦副总统',   trait: '历经三届，政坛资历深厚，人脉广布', bonusType: 'favor' as const },
  { name: '赵远山', rank: 12, faction: '改革派', title: '联邦内阁常务部长', trait: '知人善任，门生遍布各省',       bonusType: 'kpi'   as const },
  { name: '方鸿才', rank: 13, faction: '实干派', title: '联邦政务常委',  trait: '政治经验丰富，擅长风险化解',      bonusType: 'risk'  as const },
];

const RANK_NAME: Record<number, string> = {
  12: '内阁部长（正部级）', 13: '联邦副总统（副国级）', 14: '联邦内阁总理（正国级）',
  4: '副科长',  5: '科长', 6: '副局长', 7: '局长', 8: '副市长', 9: '市长',
};

const PROTEGE_FACTIONS = ['改革派', '实干派', '中立派'] as const;

// ── 门生培养行动 ─────────────────────────────────────────────────────────────
const PROTEGE_ACTIONS = [
  { key: 'train_ability', icon: '📚', label: '专项培训',   desc: '系统讲授施政经验，能力+8·忠诚+3。',     abGain: 8,  loGain: 3, coolDays: 30, meritCost: 0  },
  { key: 'assign_task',   icon: '📋', label: '委派重要任务', desc: '让门生主导重点工程，历练实战能力+5·忠诚+5·政绩+20。', abGain: 5, loGain: 5, coolDays: 45, meritCost: 0, meritBonus: 20 },
  { key: 'political_res', icon: '🤝', label: '引荐人脉资源', desc: '将核心人脉介绍给门生，忠诚+10·上司好感+3，但消耗政治资本。', abGain: 2, loGain: 10, coolDays: 60, meritCost: 0, favorBonus: 3 },
];

export default function MentorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();

  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [showCreateProtege, setShowCreateProtege] = useState(false);
  const [protegeName, setProtegeName] = useState('');
  const [protegeFaction, setProtegeFaction] = useState<typeof PROTEGE_FACTIONS[number]>('实干派');

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) setCooldowns(save.careerPathCooldowns);
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const theme = getRankThemeWithLine(save.rankLevel, (save.careerPathLine as CareerLine | undefined));
  const gameDays = save.gameDays;

  const isCool = (key: string, days: number) => (cooldowns[key] ?? 0) > 0 && gameDays - (cooldowns[key] ?? 0) < days;
  const coolLeft = (key: string, days: number) => Math.max(0, days - (gameDays - (cooldowns[key] ?? 0)));
  const isCoolDb = (lastDay: number, days: number) => lastDay >= 0 && gameDays - lastDay < days;
  const coolLeftDb = (lastDay: number, days: number) => Math.max(0, days - (gameDays - lastDay));
  const showMsg = (text: string, ok: boolean) => { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4500); };

  const hasMentor = !!save.mentorName;
  const hasProtege = !!save.protegeName;
  const canHaveProtege = save.rankLevel >= 12;

  // ── 恩师：汇报工作 ───────────────────────────────────────────────────────────
  const handleMentorContact = async () => {
    if (acting || !hasMentor) return;
    if (isCoolDb(save.mentorLastContactDay, 30)) {
      showMsg(`⏳ 刚汇报过，还需 ${coolLeftDb(save.mentorLastContactDay, 30)} 天`, false); return;
    }
    setActing(true);
    try {
      const rel = save.mentorRelation;
      const relBonus = Math.floor(rel / 20); // 0-5 级别加成
      const mentor = MENTOR_NPCS.find(m => m.name === save.mentorName);
      const bonusType = mentor?.bonusType ?? 'merit';
      const meritGain = 15 + relBonus * 5;
      const relGain = rel < 95 ? 5 : 0;
      const updates: Parameters<typeof updateGameSave>[0] = {
        mentorRelation: Math.min(100, rel + relGain),
        mentorLastContactDay: gameDays,
        meritPoints: save.meritPoints + meritGain,
      };
      if (bonusType === 'reform')  updates.reformFaction  = Math.min(100, save.reformFaction + 3 + relBonus);
      if (bonusType === 'favor')   updates.bossFavor      = Math.min(100, save.bossFavor + 4 + relBonus);
      if (bonusType === 'kpi')     updates.lineKpiScore   = save.lineKpiScore + 20 + relBonus * 5;
      if (bonusType === 'risk')    updates.inspectionRisk = Math.max(0, save.inspectionRisk - 5 - relBonus);
      await updateGameSave(updates);
      const relLabel = rel >= 80 ? '知己之情' : rel >= 50 ? '上下默契' : '初步信任';
      { const _mt1=`✅ 向${save.mentorName}汇报工作，政绩+${meritGain}（关系：${relLabel}）`; void saveResult('mentor_report', {ok:true,desc:_mt1,day:save.gameDays??0}); showMsg(_mt1, true); }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 门生：创建 ───────────────────────────────────────────────────────────────
  const handleCreateProtege = async () => {
    if (acting || !canHaveProtege || hasProtege) return;
    if (!protegeName.trim()) { showMsg('请输入门生姓名', false); return; }
    setActing(true);
    try {
      await updateGameSave({
        protegeName: protegeName.trim(),
        protegeRankLevel: 4, // 从处级起步
        protegeAbility: 20,
        protegeLoyalty: 60,
        protegeInvestDays: 0,
        protegeLastActDay: 0,
        protegePromotedDay: 0,
      });
      setShowCreateProtege(false);
      setProtegeName('');
      { const _mt2=`✅ 已收「${protegeName.trim()}」为门生，从副科级起步，悉心培养！`; void saveResult('mentor_recruit_protege', {ok:true,desc:_mt2,day:save.gameDays??0}); showMsg(_mt2, true); }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 门生：培养行动 ────────────────────────────────────────────────────────────
  const handleProtegeAction = async (action: typeof PROTEGE_ACTIONS[0]) => {
    if (acting || !hasProtege) return;
    if (isCool(`protege_${action.key}`, action.coolDays)) return;
    setActing(true);
    try {
      const nc = { ...cooldowns, [`protege_${action.key}`]: gameDays };
      setCooldowns(nc);
      const newAbility = Math.min(100, save.protegeAbility + action.abGain);
      const newLoyalty = Math.min(100, save.protegeLoyalty + action.loGain);
      const updates: Parameters<typeof updateGameSave>[0] = {
        protegeAbility: newAbility,
        protegeLoyalty: newLoyalty,
        protegeInvestDays: save.protegeInvestDays + 1,
        protegeLastActDay: gameDays,
        careerPathCooldowns: nc,
      };
      if (action.meritBonus) updates.meritPoints = save.meritPoints + action.meritBonus;
      if (action.favorBonus) updates.bossFavor   = Math.min(100, save.bossFavor + action.favorBonus);
      await updateGameSave(updates);
      { const _mt3=`✅ 「${save.protegeName}」${action.label}完成！能力+${action.abGain}·忠诚+${action.loGain}`; void saveResult('mentor_train_'+action.key, {ok:true,desc:_mt3,day:save.gameDays??0}); showMsg(_mt3, true); }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 门生：关键晋升 ────────────────────────────────────────────────────────────
  const handleProtegePromote = async () => {
    if (acting || !hasProtege) return;
    if (isCoolDb(save.protegePromotedDay, 365)) {
      showMsg(`⏳ 还需 ${coolLeftDb(save.protegePromotedDay, 365)} 天才可再次推动晋升`, false); return;
    }
    if (save.protegeAbility < 40) { showMsg('⚠️ 门生能力不足（需≥40），继续培养后再推动晋升', false); return; }
    setActing(true);
    try {
      const loyaltyBonus = save.protegeLoyalty >= 80 ? 0.2 : 0;
      const success = Math.random() < (0.6 + loyaltyBonus);
      if (success) {
        const newRank = Math.min(14, save.protegeRankLevel + 1);
        await updateGameSave({
          protegeRankLevel: newRank,
          protegePromotedDay: gameDays,
          meritPoints: save.meritPoints + 60,
          bossFavor: Math.min(100, save.bossFavor + 8),
        });
        showMsg(`🎉 「${save.protegeName}」成功晋升至 ${RANK_NAME[newRank] ?? `第${newRank}级`}！政绩+60·上司好感+8`, true);
      } else {
        await updateGameSave({
          protegePromotedDay: gameDays,
          meritPoints: Math.max(0, save.meritPoints - 20),
          inspectionRisk: Math.min(100, save.inspectionRisk + 5),
        });
        showMsg(`⚠️ 运作失败，阻力较大，暂时搁置。政绩-20·巡视风险+5`, false);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  const mentorNpcInfo = MENTOR_NPCS.find(m => m.name === save.mentorName);
  const relLabel = save.mentorRelation >= 80 ? '知己之情🌟' : save.mentorRelation >= 50 ? '上下默契💼' : save.mentorRelation >= 20 ? '初步信任🤝' : '生疏阶段';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F6F0' }}>
      <StatusBar style="light" />
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ fontSize: 20, color: '#FFF' }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>🎓 师承系统</Text>
        <View style={{ marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, color: '#FFF', fontWeight: '600' }}>恩师 · 门生</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#D1FAE5' : '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#065F46' : '#991B1B', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* ══ 恩师版块 ══ */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8D9B5', shadowColor: '#C9953A', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 22, marginRight: 8 }}>👴</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>恩师</Text>
              <Text style={{ fontSize: 12, color: '#92400E' }}>市级任职前邂逅，部级以上领导的提携</Text>
            </View>
            {hasMentor && (
              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '700' }}>已激活</Text>
              </View>
            )}
          </View>

          {!hasMentor ? (
            <View style={{ backgroundColor: '#FEF9C3', borderRadius: 12, padding: 14 }}>
              <Text style={{ fontSize: 22, textAlign: 'center', marginBottom: 6 }}>🔮</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#78350F', textAlign: 'center', marginBottom: 4 }}>尚未遇见恩师</Text>
              <Text style={{ fontSize: 12, color: '#92400E', textAlign: 'center', lineHeight: 18 }}>
                {save.rankLevel < 7
                  ? `在市级任职前（当前${save.rankLevel}级），每次升职有10%概率得到部级以上领导的赏识\n每次进入主页均有机会触发`
                  : '已过市级任职窗口期，恩师缘分已错过'}
              </Text>
            </View>
          ) : (
            <>
              {/* 恩师信息卡 */}
              <View style={{ backgroundColor: '#FFFBEB', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#FDE68A' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: '#C9953A' }}>
                    <Text style={{ fontSize: 22 }}>👴</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#78350F' }}>{save.mentorName}</Text>
                    <Text style={{ fontSize: 12, color: '#92400E' }}>{mentorNpcInfo?.title ?? `第${save.mentorRankLevel}级领导`} · {save.mentorFaction}</Text>
                  </View>
                  <View style={{ backgroundColor: save.mentorPromoted ? '#F0FDF4' : '#EFF6FF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, color: save.mentorPromoted ? '#166534' : '#1D4ED8', fontWeight: '600' }}>
                      {save.mentorPromoted ? '已晋升' : `职级 Lv.${save.mentorRankLevel}`}
                    </Text>
                  </View>
                </View>
                {mentorNpcInfo && (
                  <Text style={{ fontSize: 12, color: '#7C4A03', fontStyle: 'italic', marginBottom: 8 }}>「{mentorNpcInfo.trait}」</Text>
                )}
                {/* 关系值 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: '#6B7280', width: 52 }}>关系：</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: '#FEE2E2', borderRadius: 3 }}>
                    <View style={{ width: `${save.mentorRelation}%`, height: 6, backgroundColor: '#C9953A', borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: 12, color: '#78350F', marginLeft: 8, fontWeight: '600' }}>{save.mentorRelation}/100</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#92400E', textAlign: 'right' }}>{relLabel}</Text>
              </View>

              {/* 汇报工作 */}
              {isCoolDb(save.mentorLastContactDay, 30) ? (
                <View style={{ backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, marginRight: 6 }}>⏳</Text>
                  <Text style={{ fontSize: 13, color: '#92400E' }}>还需 {coolLeftDb(save.mentorLastContactDay, 30)} 天可再次汇报</Text>
                </View>
              ) : (
                <Pressable
                  onPress={handleMentorContact}
                  disabled={acting}
                  style={{ backgroundColor: acting ? '#D1D5DB' : '#C9953A', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>
                    {acting ? '汇报中…' : '📞 向恩师汇报工作（30天冷却）'}
                  </Text>
                </Pressable>
              )}

              {/* 恩师加成说明 */}
              <View style={{ marginTop: 10, backgroundColor: '#FFF7ED', borderRadius: 10, padding: 10 }}>
                <Text style={{ fontSize: 12, color: '#78350F', fontWeight: '600', marginBottom: 4 }}>🎁 恩师加成效果</Text>
                <Text style={{ fontSize: 11, color: '#92400E', lineHeight: 18 }}>
                  · 每次汇报：政绩+{15 + Math.floor(save.mentorRelation / 20) * 5}（关系越深越高）{'\n'}
                  · {mentorNpcInfo?.bonusType === 'reform' ? '改革派好感额外加成' : mentorNpcInfo?.bonusType === 'favor' ? '上司好感额外加成' : mentorNpcInfo?.bonusType === 'kpi' ? '线路KPI额外加成' : mentorNpcInfo?.bonusType === 'risk' ? '巡视风险额外降低' : '政绩额外加成'}{'\n'}
                  · 关系≥60 后解锁"重大事件庇护"概率
                </Text>
              </View>

              {/* 恩师晋升提示 */}
              {save.rankLevel >= 10 && !save.mentorPromoted && (
                <View style={{ marginTop: 10, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🌟</Text>
                  <Text style={{ fontSize: 12, color: '#166534' }}>你已升至省级，恩师随之晋升一级，将自动于下次登录时生效</Text>
                </View>
              )}
              {save.mentorPromoted && (
                <View style={{ marginTop: 10, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, marginRight: 8 }}>🏅</Text>
                  <Text style={{ fontSize: 12, color: '#1D4ED8' }}>恩师已随你晋升，但他已至巅峰，不再往上。</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* ══ 门生版块 ══ */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#DBEAFE', shadowColor: '#1D4ED8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Text style={{ fontSize: 22, marginRight: 8 }}>👔</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#111827' }}>门生</Text>
              <Text style={{ fontSize: 12, color: '#1D4ED8' }}>部级以上解锁，培养心腹，关键时推动晋升</Text>
            </View>
            {!canHaveProtege && (
              <View style={{ backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, color: '#9CA3AF' }}>🔒 部级解锁</Text>
              </View>
            )}
          </View>

          {!canHaveProtege ? (
            <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginBottom: 6 }}>🔒</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 4 }}>需达到部级（rank 12）解锁</Text>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>当前职级 Lv.{save.rankLevel}，还差 {12 - save.rankLevel} 级</Text>
            </View>
          ) : !hasProtege ? (
            <View>
              <View style={{ backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 6 }}>🌱 尚未收下门生</Text>
                <Text style={{ fontSize: 12, color: '#3B82F6', lineHeight: 18 }}>
                  你已位至部级，可以选择一名有潜力的年轻干部悉心培养。{'\n'}
                  门生从副科级起步，通过培训和历练逐步成长，关键时刻可推动他晋升。
                </Text>
              </View>
              <Pressable
                onPress={() => setShowCreateProtege(true)}
                style={{ backgroundColor: '#1D4ED8', borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>➕ 物色并收纳门生</Text>
              </Pressable>
            </View>
          ) : (
            <>
              {/* 门生信息卡 */}
              <View style={{ backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 2, borderColor: '#3B82F6' }}>
                    <Text style={{ fontSize: 22 }}>👔</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E40AF' }}>{save.protegeName}</Text>
                    <Text style={{ fontSize: 12, color: '#3B82F6' }}>{RANK_NAME[save.protegeRankLevel] ?? `职级 Lv.${save.protegeRankLevel}`}</Text>
                  </View>
                  <View style={{ backgroundColor: '#FFF', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#BFDBFE' }}>
                    <Text style={{ fontSize: 11, color: '#1D4ED8', fontWeight: '600' }}>培养 {save.protegeInvestDays} 次</Text>
                  </View>
                </View>
                {/* 能力 & 忠诚 */}
                {[{ label: '能力', val: save.protegeAbility, color: '#3B82F6' }, { label: '忠诚', val: save.protegeLoyalty, color: '#059669' }].map(stat => (
                  <View key={stat.label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: '#6B7280', width: 36 }}>{stat.label}：</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3 }}>
                      <View style={{ width: `${stat.val}%`, height: 6, backgroundColor: stat.color, borderRadius: 3 }} />
                    </View>
                    <Text style={{ fontSize: 12, color: '#1E40AF', marginLeft: 8, fontWeight: '600', width: 40 }}>{stat.val}/100</Text>
                  </View>
                ))}
              </View>

              {/* 培养行动 */}
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, fontWeight: '600' }}>📋 培养行动</Text>
              <View style={{ gap: 8, marginBottom: 12 }}>
                {PROTEGE_ACTIONS.map(a => {
                  const onCd = isCool(`protege_${a.key}`, a.coolDays);
                  const left = coolLeft(`protege_${a.key}`, a.coolDays);
                  return (
                    <Pressable
                      key={a.key}
                      onPress={() => handleProtegeAction(a)}
                      disabled={acting || onCd}
                      style={{ backgroundColor: onCd ? '#F9FAFB' : '#EFF6FF', borderRadius: 10, padding: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: onCd ? '#E5E7EB' : '#BFDBFE' }}>
                      <Text style={{ fontSize: 18, marginRight: 10 }}>{a.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: onCd ? '#9CA3AF' : '#1E40AF' }}>{a.label}</Text>
                        <Text style={{ fontSize: 11, color: onCd ? '#D1D5DB' : '#6B7280' }}>{onCd ? `冷却中 · 还需 ${left} 天` : a.desc}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {/* 关键晋升 */}
              <View style={{ backgroundColor: '#FFF7ED', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FED7AA' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#92400E', marginBottom: 6 }}>🚀 关键晋升（365天冷却）</Text>
                <Text style={{ fontSize: 12, color: '#7C4A03', marginBottom: 10, lineHeight: 18 }}>
                  运用政治资本推动门生晋升一级。忠诚≥80可提升成功率（基础60%+忠诚加成）。{'\n'}
                  当前胜率：约{Math.round((0.6 + (save.protegeLoyalty >= 80 ? 0.2 : 0)) * 100)}%
                </Text>
                {isCoolDb(save.protegePromotedDay, 365) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 14, marginRight: 6 }}>⏳</Text>
                    <Text style={{ fontSize: 13, color: '#92400E' }}>还需 {coolLeftDb(save.protegePromotedDay, 365)} 天</Text>
                  </View>
                ) : save.protegeAbility < 40 ? (
                  <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10 }}>
                    <Text style={{ fontSize: 13, color: '#DC2626' }}>⚠️ 能力不足（需≥40），继续培养中</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleProtegePromote}
                    disabled={acting}
                    style={{ backgroundColor: acting ? '#D1D5DB' : '#D97706', borderRadius: 12, padding: 12, alignItems: 'center' }}>
                    <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 14 }}>
                      {acting ? '运作中…' : `推动「${save.protegeName}」晋升`}
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* 创建门生弹窗 */}
      <Modal visible={showCreateProtege} transparent animationType="slide" onRequestClose={() => setShowCreateProtege(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>➕ 物色门生</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>填写门生信息，他将从副科级起步，由你一手栽培。</Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 }}>姓名</Text>
            <TextInput
              value={protegeName}
              onChangeText={setProtegeName}
              placeholder="输入门生姓名"
              style={{ borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, fontSize: 14, color: '#111827', marginBottom: 14 }}
              maxLength={6}
            />
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 }}>派系倾向</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
              {PROTEGE_FACTIONS.map(f => (
                <Pressable
                  key={f}
                  onPress={() => setProtegeFaction(f)}
                  style={{ flex: 1, backgroundColor: protegeFaction === f ? '#1D4ED8' : '#F3F4F6', borderRadius: 10, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: protegeFaction === f ? '#1D4ED8' : '#E5E7EB' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: protegeFaction === f ? '#FFF' : '#374151' }}>{f}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={handleCreateProtege}
              disabled={acting || !protegeName.trim()}
              style={{ backgroundColor: !protegeName.trim() ? '#D1D5DB' : '#1D4ED8', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 15 }}>{acting ? '收纳中…' : '确认收纳门生'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowCreateProtege(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
