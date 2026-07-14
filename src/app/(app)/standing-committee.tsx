/**
 * 常委序列博弈（13级以上解锁）
 * 7个常委席位竞争：需分管领域政绩排名前3、廉洁值≥85、派系支持票≥60%
 * 常委内部位次1-7，位次决定分管权力范围，每年底重新排名
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// 常委7个席位职权
const PSC_POSITIONS = [
  { rank: 1, label: '总书记', power: '党政军最高权力，主持中央全局工作', icon: '👑' },
  { rank: 2, label: '国务院总理', power: '主持政府全面工作，掌管国家经济行政', icon: '🏛️' },
  { rank: 3, label: '全国人大委员长', power: '主持立法机关，审议重大法案', icon: '⚖️' },
  { rank: 4, label: '全国政协主席', power: '主持协商机构，统筹多党合作', icon: '🤝' },
  { rank: 5, label: '中央纪委书记', power: '主持反腐工作，监督党纪国法', icon: '🔍' },
  { rank: 6, label: '中央办公厅主任', power: '统筹党中央日常运转，分管重点综合事务', icon: '📋' },
  { rank: 7, label: '中央政法委书记', power: '主持政法工作，统管维稳治安', icon: '🛡️' },
];

// 位次分管权力范围
const RANK_POWER: Record<number, string[]> = {
  1: ['外交决策', '军事指挥', '重大人事', '战略规划'],
  2: ['经济政策', '财政预算', '产业规划', '对外经贸'],
  3: ['立法审议', '宪法监督', '重大法案', '国家机构'],
  4: ['民主协商', '统战工作', '人民团体', '海外事务'],
  5: ['纪律审查', '反腐监督', '廉政建设', '问责追责'],
  6: ['党务日常', '秘书工作', '信息枢纽', '会议协调'],
  7: ['政法综治', '公安司法', '维稳工作', '国家安全'],
};

// 博弈行动
interface PSCAction {
  key: string;
  label: string;
  icon: string;
  desc: string;
  rankBonus: number;
  moralCost: number;
  cooldownDays: number;
  category: '政绩' | '派系' | '廉洁' | '综合';
}

const PSC_ACTIONS: PSCAction[] = [
  { key: 'psc_merit_push', label: '冲刺分管领域政绩', icon: '📊', category: '政绩',
    desc: '集中资源在分管领域创造重大政绩成就，提升政绩排名至前3。',
    rankBonus: 3, moralCost: 0, cooldownDays: 90, minRank: 13 } as PSCAction & { minRank: number },
  { key: 'psc_faction_vote', label: '深度整合派系资源', icon: '🤝', category: '派系',
    desc: '加强与本派系核心成员的沟通协调，确保派系支持票超过60%门槛。',
    rankBonus: 4, moralCost: 0, cooldownDays: 60, minRank: 13 } as PSCAction & { minRank: number },
  { key: 'psc_moral_build', label: '廉洁自律专项行动', icon: '🌟', category: '廉洁',
    desc: '主动参与廉政教育，清除身边腐败隐患，将廉洁值保持在85以上。',
    rankBonus: 0, moralCost: -8, cooldownDays: 60, minRank: 13 } as PSCAction & { minRank: number },
  { key: 'psc_policy_lead', label: '主导重大政策突破', icon: '🔑', category: '政绩',
    desc: '在关键领域主导推出具有全国影响力的重大政策，快速提升政绩排名。',
    rankBonus: 5, moralCost: 0, cooldownDays: 120, minRank: 13 } as PSCAction & { minRank: number },
  { key: 'psc_cross_ally', label: '跨派系结盟谈判', icon: '⚖️', category: '派系',
    desc: '与其他派系就重要职位分配进行秘密谈判，争取额外票仓支持。',
    rankBonus: 6, moralCost: 3, cooldownDays: 120, minRank: 13 } as PSCAction & { minRank: number },
  { key: 'psc_rank_up', label: '争取位次提升', icon: '⬆️', category: '综合',
    desc: '综合运用政绩、派系、民心各方面优势，在年底重排位次时争取上升。',
    rankBonus: 7, moralCost: 0, cooldownDays: 180, minRank: 13 } as PSCAction & { minRank: number },
  { key: 'psc_crisis_handle', label: '处置重大危机事件', icon: '🛡️', category: '综合',
    desc: '主动承担处置全国性重大突发事件，在危局中展示大局担当。',
    rankBonus: 8, moralCost: -5, cooldownDays: 180, minRank: 13 } as PSCAction & { minRank: number },
];

const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  政绩: { bg: '#DBEAFE', text: '#1D4ED8' },
  派系: { bg: '#FDF4FF', text: '#7E22CE' },
  廉洁: { bg: '#F0FDF4', text: '#166534' },
  综合: { bg: '#FEF3C7', text: '#B45309' },
};

function gameDaysToYear(d: number) { return Math.floor(d / 360) + 1; }

export default function StandingCommitteePage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [showElectModal, setShowElectModal] = useState(false);
  const [electing, setElecting] = useState(false);
  const [showRankModal, setShowRankModal] = useState(false);
  const [reranking, setReranking] = useState(false);

  useFocusEffect(useCallback(() => { setMsg(''); }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>
          需达到13级（副国级）后解锁常委序列博弈
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#7F1D1D', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cooldowns = save.careerPathCooldowns ?? {};
  const gameDays = save.gameDays ?? 0;
  const currentYear = gameDaysToYear(gameDays);
  const pscRank = save.standingCommitteeRank ?? 0;
  const lastElectionYear = save.lastStandingElectionYear ?? -1;
  const rankDelta = save.standingRankDelta ?? 0;
  const hasPolitburo = save.politburoSeat ?? false;
  const yearsSinceElection = lastElectionYear >= 0 ? currentYear - lastElectionYear : 999;
  const canElect = (yearsSinceElection >= 5 || lastElectionYear < 0) && hasPolitburo;

  const moral = save.moralValue ?? 60;
  const merits = save.meritPoints ?? 0;
  const factionRelation: Record<string, number> = {
    reform: save.reformFaction ?? 30,
    pragmatic: save.pragmaticFaction ?? 30,
    cyl: save.cylRelation ?? 30,
    techno: save.technoRelation ?? 30,
    local: save.localRelation ?? 30,
  };
  const primaryFaction = save.primaryFaction ?? 'reform';
  const factionPct = Math.min(100, (factionRelation[primaryFaction] ?? 30));

  const condMerit   = merits >= 1500;
  const condMoral   = moral >= 85;
  const condFaction = factionPct >= 60;

  const handleAction = async (action: PSCAction) => {
    if (acting) return;
    const lastDay = cooldowns[action.key] ?? 0;
    if (gameDays - lastDay < action.cooldownDays) return;
    setActing(action.key);
    try {
      const nc = { ...cooldowns, [action.key]: gameDays };
      const newMoral = action.moralCost !== 0
        ? Math.max(0, Math.min(100, moral + (action.moralCost < 0 ? -action.moralCost : -action.moralCost)))
        : undefined;
      await updateGameSave({
        careerPathCooldowns: nc,
        ...(newMoral !== undefined ? { moralValue: newMoral } : {}),
      });
      const pscMsg = `✅ 【${action.label}】执行完成！常委竞选优势 +${action.rankBonus}分。${action.moralCost < 0 ? `廉洁值 +${-action.moralCost}` : action.moralCost > 0 ? `廉洁值 -${action.moralCost}` : ''}`;
      await saveResult('psc_' + action.key, { ok: true, desc: pscMsg, day: save.gameDays });
      setMsg(pscMsg);
      setMsgOk(true);
    } catch {
      setMsg('❌ 操作失败，请重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  const handleElect = async () => {
    if (!canElect || electing) return;
    setElecting(true);
    setShowElectModal(false);
    try {
      const meritFactor = condMerit ? 25 : merits >= 1000 ? 15 : 5;
      const moralFactor = condMoral ? 20 : moral >= 70 ? 10 : 0;
      const factionFactor = condFaction ? 20 : factionPct >= 40 ? 10 : 0;
      const randomFactor = Math.floor(Math.random() * 20) - 5;
      const score = meritFactor + moralFactor + factionFactor + randomFactor;

      const allCond = condMerit && condMoral && condFaction;
      if (allCond) {
        // 三条件同时满足：随机分配1-7位次（越高约难，score决定区间）
        const assignedRank = score >= 55 ? 1 : score >= 45 ? 2 : score >= 35 ? 3 : score >= 25 ? 4 : score >= 15 ? 5 : 6 + (Math.random() > 0.5 ? 0 : 1);
        const clampedRank = Math.min(7, Math.max(1, assignedRank));
        await updateGameSave({
          standingCommitteeRank: clampedRank,
          lastStandingElectionYear: currentYear,
          standingRankDelta: 0,
          politburoSeat: true,
        });
        const pos = PSC_POSITIONS.find(p => p.rank === clampedRank);
        setMsg(`🎉 成功入常！担任 ${pos?.label ?? '常委'} 职位，位次第${clampedRank}位！分管权力：${(RANK_POWER[clampedRank] ?? []).join('、')}`);
        setMsgOk(true);
      } else {
        await updateGameSave({ lastStandingElectionYear: currentYear });
        const missing: string[] = [];
        if (!condMerit)   missing.push(`政绩不足（${merits}/1500）`);
        if (!condMoral)   missing.push(`廉洁值不达标（${moral}/85）`);
        if (!condFaction) missing.push(`派系支持票不足（${factionPct}%/60%）`);
        setMsg(`❌ 未能入常，缺少条件：${missing.join('、')}。强化上述条件后可在下届竞选。`);
        setMsgOk(false);
      }
    } catch {
      setMsg('❌ 选举出错，请重试');
      setMsgOk(false);
    } finally {
      setElecting(false);
    }
  };

  // 年底重排位次
  const handleRerank = async () => {
    if (pscRank <= 0 || reranking) return;
    setReranking(true);
    setShowRankModal(false);
    try {
      const meritFactor = (merits >= 2000 ? 2 : merits >= 1500 ? 1 : 0);
      const moralFactor = (moral >= 90 ? 1 : 0);
      const factionFactor = (factionPct >= 70 ? 1 : factionPct < 50 ? -1 : 0);
      const randomFactor = Math.floor(Math.random() * 3) - 1;
      const delta = meritFactor + moralFactor + factionFactor + randomFactor;
      const newRank = Math.max(1, Math.min(7, pscRank - delta));
      const actualDelta = pscRank - newRank;

      await updateGameSave({
        standingCommitteeRank: newRank,
        standingRankDelta: actualDelta,
      });

      const pos = PSC_POSITIONS.find(p => p.rank === newRank);
      if (actualDelta > 0) {
        setMsg(`⬆️ 年底重排：位次从第${pscRank}位上升至第${newRank}位！担任：${pos?.label ?? '常委'}，分管权力扩大。`);
      } else if (actualDelta < 0) {
        setMsg(`⬇️ 年底重排：位次从第${pscRank}位下降至第${newRank}位。分权事件触发，注意应对。`);
      } else {
        setMsg(`➡️ 年底重排：位次维持第${pscRank}位不变，继续担任：${pos?.label ?? '常委'}。`);
      }
      setMsgOk(actualDelta >= 0);
    } catch {
      setMsg('❌ 重排失败，请重试');
      setMsgOk(false);
    } finally {
      setReranking(false);
    }
  };

  const currentPos = PSC_POSITIONS.find(p => p.rank === pscRank);
  const currentPowers = RANK_POWER[pscRank] ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5F5' }}>
      <StatusBar style="light" />
      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#7F1D1D' }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 10, letterSpacing: 2 }}>副国级 · 常委序列</Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>🔱 常委序列博弈</Text>
          </View>
          {pscRank > 0 && (
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 9, color: '#B45309' }}>当前位次</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#B45309' }}>第{pscRank}位</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* 反馈消息 */}
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: 12 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 13, fontWeight: '600', lineHeight: 20 }}>{msg}</Text>
          </View>
        )}

        {/* 入常状态 */}
        {pscRank > 0 && currentPos ? (
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 2, borderColor: '#FCA5A5' }}>
            <Text style={{ fontSize: 11, color: '#B91C1C', fontWeight: '700', marginBottom: 6 }}>📍 当前常委席位</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 36 }}>{currentPos.icon}</Text>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '800', color: '#1E293B' }}>第{pscRank}位 · {currentPos.label}</Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>{currentPos.power}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
              {currentPowers.map(p => (
                <View key={p} style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>{p}</Text>
                </View>
              ))}
            </View>
            {rankDelta !== 0 && (
              <View style={{ backgroundColor: rankDelta > 0 ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 11, color: rankDelta > 0 ? '#065F46' : '#991B1B' }}>
                  {rankDelta > 0 ? `⬆️ 上次重排上升 ${rankDelta} 位` : `⬇️ 上次重排下降 ${Math.abs(rankDelta)} 位`}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => setShowRankModal(true)}
              style={{ marginTop: 10, backgroundColor: '#7F1D1D', borderRadius: 8, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>📈 执行年底位次重排</Text>
            </Pressable>
          </View>
        ) : (
          /* 入常条件 */
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#7F1D1D', marginBottom: 10 }}>入常三条件</Text>
            {[
              { label: '分管领域政绩排名前3（政绩值≥1500）', met: condMerit, hint: `当前政绩：${merits}，目标≥1500` },
              { label: '廉洁值 ≥ 85', met: condMoral, hint: `当前廉洁值：${moral}` },
              { label: '派系支持票 ≥ 60%', met: condFaction, hint: `当前派系关系：${factionPct}%` },
            ].map(c => (
              <View key={c.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 14, marginTop: 1 }}>{c.met ? '✅' : '⭕'}</Text>
                <View>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: c.met ? '#065F46' : '#475569' }}>{c.label}</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>{c.hint}</Text>
                </View>
              </View>
            ))}
            {!hasPolitburo && (
              <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#B45309' }}>⚠️ 须先完成政治局委员选举才能参加常委竞选</Text>
              </View>
            )}
            {canElect ? (
              <Pressable onPress={() => setShowElectModal(true)} disabled={electing}
                style={{ backgroundColor: electing ? '#94A3B8' : '#7F1D1D', borderRadius: 10, padding: 14, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>
                  {electing ? '竞选中...' : `🗳️ 参加第${currentYear}届常委竞选`}
                </Text>
              </Pressable>
            ) : (
              <View style={{ backgroundColor: '#F1F5F9', borderRadius: 8, padding: 10 }}>
                <Text style={{ fontSize: 11, color: '#64748B', textAlign: 'center' }}>
                  {!hasPolitburo ? '先完成政治局委员选举' : `距下届选举还需 ${Math.max(0, 5 - yearsSinceElection)} 年`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* 7席位图 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#7F1D1D', marginBottom: 10 }}>常委7席位图谱</Text>
          {PSC_POSITIONS.map(pos => (
            <View key={pos.rank} style={{
              flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8,
              backgroundColor: pscRank === pos.rank ? '#FEF2F2' : '#F8FAFC',
              borderRadius: 8, padding: 10,
              borderWidth: pscRank === pos.rank ? 1.5 : 0.5,
              borderColor: pscRank === pos.rank ? '#F87171' : '#E2E8F0',
            }}>
              <Text style={{ fontSize: 22 }}>{pos.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: '#7F1D1D', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700' }}>第{pos.rank}位</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1E293B' }}>{pos.label}</Text>
                  {pscRank === pos.rank && <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>← 你的位次</Text>}
                </View>
                <Text style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{pos.power}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 博弈行动 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#7F1D1D', marginBottom: 12 }}>竞选博弈行动</Text>
          {PSC_ACTIONS.map(action => {
            const lastDay = cooldowns[action.key] ?? 0;
            const remain = action.cooldownDays - (gameDays - lastDay);
            const onCd = remain > 0;
            const isActing = acting === action.key;
            const catCol = CAT_COLOR[action.category] ?? { bg: '#F1F5F9', text: '#374151' };
            return (
              <View key={action.key} style={{ borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B' }}>{action.label}</Text>
                      <View style={{ backgroundColor: catCol.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ fontSize: 9, color: catCol.text, fontWeight: '700' }}>{action.category}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>{action.desc}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                      <Text style={{ fontSize: 10, color: '#7F1D1D' }}>🔱 竞争优势 +{action.rankBonus}</Text>
                      {action.moralCost < 0 && <Text style={{ fontSize: 10, color: '#166534' }}>廉洁 +{-action.moralCost}</Text>}
                      {action.moralCost > 0 && <Text style={{ fontSize: 10, color: '#991B1B' }}>廉洁 -{action.moralCost}</Text>}
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => handleAction(action)} disabled={onCd || !!acting}
                  style={{ marginTop: 10, borderRadius: 8, padding: 10, alignItems: 'center',
                    backgroundColor: isActing ? '#FCA5A5' : onCd ? '#E5E7EB' : '#7F1D1D' }}>
                  <Text style={{ color: onCd ? '#9CA3AF' : '#FFF', fontSize: 12, fontWeight: '700' }}>
                    {isActing ? '执行中...' : onCd ? `冷却中（剩余${remain}天）` : '立即执行'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 入常确认弹窗 */}
      <Modal visible={showElectModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#7F1D1D', marginBottom: 8 }}>确认参加常委竞选？</Text>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 }}>
              将综合评估政绩排名、廉洁值、派系支持票三项指标。三项条件同时满足方可入常，并根据综合得分决定入常位次（1-7位）。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowElectModal(false)}
                style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#64748B' }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleElect}
                style={{ flex: 1, backgroundColor: '#7F1D1D', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#FFF' }}>确认竞选</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 重排位次确认弹窗 */}
      <Modal visible={showRankModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#7F1D1D', marginBottom: 8 }}>年底位次重排</Text>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 }}>
              将根据本年政绩表现、廉洁值、派系支持情况对常委位次进行重新排序。位次下滑将触发分权事件，请确认是否执行重排。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowRankModal(false)}
                style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#64748B' }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleRerank}
                style={{ flex: 1, backgroundColor: '#7F1D1D', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#FFF' }}>执行重排</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
