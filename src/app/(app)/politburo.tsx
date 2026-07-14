/**
 * 政治局席位竞争（12级以上解锁）
 * 每届任期结束前举行票选，玩家需经营各省委书记、部长关系网
 * 得票过半（>50%）才能晋升政治局委员
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// 选举周期：每5年一届（1800天）
const ELECTION_CYCLE = 1800;
// 得票过半才能当选
const WIN_THRESHOLD = 51;

// 关系经营行动
interface CampaignAction {
  key: string;
  label: string;
  icon: string;
  desc: string;
  voteBonus: number;
  moralCost: number;
  cooldownDays: number;
  minRank: number;
  category: '省委' | '部委' | '军队' | '派系';
}

const CAMPAIGN_ACTIONS: CampaignAction[] = [
  { key: 'pb_prov_visit', label: '赴省调研座谈', icon: '✈️', category: '省委',
    desc: '亲赴重点省份与省委书记深度交流，争取省级代表团支持票。',
    voteBonus: 4, moralCost: 0, cooldownDays: 60, minRank: 12 },
  { key: 'pb_prov_project', label: '为省级争取重点项目', icon: '📦', category: '省委',
    desc: '利用部委资源，为特定省份争取国家重点项目，换取支持承诺。',
    voteBonus: 6, moralCost: 3, cooldownDays: 90, minRank: 12 },
  { key: 'pb_ministry_consult', label: '部委高层联络', icon: '📞', category: '部委',
    desc: '与国务院各部委主要负责人深度沟通，展示施政纲领，争取认可。',
    voteBonus: 5, moralCost: 0, cooldownDays: 60, minRank: 12 },
  { key: 'pb_policy_speech', label: '发表重要政策讲话', icon: '📢', category: '部委',
    desc: '在全国性会议上就核心政策议题发表讲话，扩大政治影响力。',
    voteBonus: 7, moralCost: 0, cooldownDays: 120, minRank: 12 },
  { key: 'pb_army_relation', label: '军队系统公务联络', icon: '🎖️', category: '军队',
    desc: '参与军民融合重大项目，建立与军队系统的正式工作联系。',
    voteBonus: 5, moralCost: 0, cooldownDays: 90, minRank: 12 },
  { key: 'pb_faction_unite', label: '派系内部整合', icon: '🤝', category: '派系',
    desc: '协调派系内部分歧，强化本派系团结，确保本派系代表团支持票。',
    voteBonus: 8, moralCost: 0, cooldownDays: 90, minRank: 12 },
  { key: 'pb_faction_bridge', label: '跨派系政策妥协', icon: '⚖️', category: '派系',
    desc: '在重要政策立场上向另一派系作出一定让步，换取其投票支持。',
    voteBonus: 10, moralCost: 5, cooldownDays: 120, minRank: 12 },
  { key: 'pb_merit_report', label: '政绩专项汇报', icon: '📊', category: '部委',
    desc: '向党中央全面汇报分管领域政绩成就，展示执政实力与施政成效。',
    voteBonus: 6, moralCost: 0, cooldownDays: 60, minRank: 12 },
  { key: 'pb_anti_corruption', label: '主导重大反腐案件', icon: '🔍', category: '派系',
    desc: '主导查处重大腐败案件，树立廉洁形象，赢得广泛政治好感。',
    voteBonus: 9, moralCost: -5, cooldownDays: 180, minRank: 12 },
  { key: 'pb_media_image', label: '塑造正面舆论形象', icon: '📺', category: '部委',
    desc: '通过媒体渠道展示施政成效与个人形象，提升党内外认知度。',
    voteBonus: 4, moralCost: 0, cooldownDays: 45, minRank: 12 },
];

const CAT_COLOR: Record<string, { bg: string; text: string }> = {
  省委: { bg: '#DBEAFE', text: '#1D4ED8' },
  部委: { bg: '#F0FDF4', text: '#166534' },
  军队: { bg: '#FEF3C7', text: '#B45309' },
  派系: { bg: '#FDF4FF', text: '#7E22CE' },
};

function gameDaysToYear(d: number) { return Math.floor(d / 360) + 1; }

export default function PolitburoPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [showElectModal, setShowElectModal] = useState(false);
  const [electing, setElecting] = useState(false);

  // 每次进入刷新（保持冷却时间同步）
  useFocusEffect(useCallback(() => { setMsg(''); }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  if (save.rankLevel < 12) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>
          需达到12级（国家级）后解锁政治局选举
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#4B0082', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cooldowns = save.careerPathCooldowns ?? {};
  const gameDays = save.gameDays ?? 0;
  const currentYear = gameDaysToYear(gameDays);
  const electionYear = save.lastPolitburoElectionYear ?? -1;
  const hasSeat = save.politburoSeat ?? false;
  const currentVotes = save.politburoVotes ?? 0;

  // 上次选举距今游戏年数
  const yearsSinceElection = electionYear >= 0 ? currentYear - electionYear : 999;
  const canElect = yearsSinceElection >= 5 || electionYear < 0;

  // 按派系关系计算基础票仓（影响选举结果）
  const factionRelation: Record<string, number> = {
    reform: save.reformFaction ?? 30,
    pragmatic: save.pragmaticFaction ?? 30,
    cyl: save.cylRelation ?? 30,
    techno: save.technoRelation ?? 30,
    local: save.localRelation ?? 30,
  };
  const primaryFaction = save.primaryFaction ?? 'reform';
  const baseVotePool = Math.min(30, (factionRelation[primaryFaction] ?? 30) * 0.3);

  const handleAction = async (action: CampaignAction) => {
    if (acting) return;
    const lastDay = cooldowns[action.key] ?? 0;
    if (gameDays - lastDay < action.cooldownDays) return;

    setActing(action.key);
    try {
      const nc = { ...cooldowns, [action.key]: gameDays };
      const morDelta = action.moralCost;
      const newMoral = Math.max(0, Math.min(100, (save.moralValue ?? 60) + morDelta));
      await updateGameSave({
        careerPathCooldowns: nc,
        moralValue: morDelta !== 0 ? newMoral : save.moralValue,
      });
      const pbMsg = `✅ 【${action.label}】完成！预计获得选举支持票 +${action.voteBonus}%。`;
      await saveResult('politburo_' + action.key, { ok: true, desc: pbMsg, day: save.gameDays });
      setMsg(pbMsg);
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
      // 综合计算得票率：基础票仓 + 行动加成 + 政绩 + 廉洁 + 随机浮动
      const meritFactor = Math.min(20, (save.meritPoints ?? 0) / 500);
      const moralFactor = save.moralValue >= 85 ? 15 : save.moralValue >= 70 ? 8 : 0;
      const randomFactor = Math.floor(Math.random() * 20) - 5;
      const totalVotes = Math.min(100, Math.floor(baseVotePool + meritFactor + moralFactor + randomFactor + 20));

      const success = totalVotes > WIN_THRESHOLD;
      await updateGameSave({
        politburoSeat: success,
        lastPolitburoElectionYear: currentYear,
        politburoVotes: totalVotes,
      });
      setMsg(success
        ? `🎉 选举成功！以 ${totalVotes}% 得票率当选政治局委员！`
        : `❌ 选举落败，得票率仅 ${totalVotes}%，未超过过半数门槛（51%）。深耕关系网后可在下届选举中再试。`);
      setMsgOk(success);
    } catch {
      setMsg('❌ 选举出错，请重试');
      setMsgOk(false);
    } finally {
      setElecting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F0FF' }}>
      <StatusBar style="light" />
      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#4B0082' }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: 'rgba(220,200,255,0.7)', fontSize: 10, letterSpacing: 2 }}>国家级 · 政治局</Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>⭐ 政治局席位竞争</Text>
          </View>
          {hasSeat && (
            <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 10, color: '#B45309' }}>身份</Text>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#B45309' }}>政治局委员</Text>
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

        {/* 状态概览 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8B4FE' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B0082', marginBottom: 10 }}>选举状态</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '当前席位', val: hasSeat ? '✅委员' : '待选', color: hasSeat ? '#166534' : '#64748B', bg: hasSeat ? '#D1FAE5' : '#F1F5F9' },
              { label: '上届得票', val: electionYear >= 0 ? `${currentVotes}%` : '未参选', color: currentVotes >= 51 ? '#166534' : '#991B1B', bg: currentVotes >= 51 ? '#D1FAE5' : '#FEE2E2' },
              { label: '下届选举', val: canElect ? '现可参选' : `${5 - yearsSinceElection}年后`, color: canElect ? '#15803D' : '#B45309', bg: canElect ? '#D1FAE5' : '#FEF3C7' },
            ].map(d => (
              <View key={d.label} style={{ flex: 1, backgroundColor: d.bg, borderRadius: 8, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 9, color: '#64748B', marginBottom: 2 }}>{d.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: '800', color: d.color }}>{d.val}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 选举触发条件 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8B4FE' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B0082', marginBottom: 10 }}>当选条件</Text>
          {[
            { label: '得票率 > 50%（票选过半）', met: currentVotes > WIN_THRESHOLD, hint: '通过关系经营行动积累支持票' },
            { label: '政绩积累（政绩值影响得票率）', met: (save.meritPoints ?? 0) >= 500, hint: `当前政绩：${save.meritPoints ?? 0}，目标≥500` },
            { label: '廉洁值 ≥ 70', met: (save.moralValue ?? 0) >= 70, hint: `当前廉洁值：${save.moralValue ?? 0}` },
            { label: '5年一届任期届满', met: canElect, hint: canElect ? '当前可参加选举' : `距下届选举还需 ${5 - yearsSinceElection} 年` },
          ].map(c => (
            <View key={c.label} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
              <Text style={{ fontSize: 14, marginTop: 1 }}>{c.met ? '✅' : '⭕'}</Text>
              <View>
                <Text style={{ fontSize: 12, fontWeight: '600', color: c.met ? '#065F46' : '#475569' }}>{c.label}</Text>
                <Text style={{ fontSize: 10, color: '#94A3B8' }}>{c.hint}</Text>
              </View>
            </View>
          ))}

          {canElect && (
            <Pressable
              onPress={() => setShowElectModal(true)}
              disabled={electing}
              style={{ backgroundColor: electing ? '#94A3B8' : '#4B0082', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 }}>
              <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>
                {electing ? '选举进行中...' : `🗳️ 参加第${currentYear}届政治局选举`}
              </Text>
            </Pressable>
          )}
        </View>

        {/* 关系经营行动 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8B4FE' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B0082', marginBottom: 12 }}>关系经营行动</Text>
          {CAMPAIGN_ACTIONS.map(action => {
            const lastDay = cooldowns[action.key] ?? 0;
            const remain = action.cooldownDays - (gameDays - lastDay);
            const onCd = remain > 0;
            const isActing = acting === action.key;
            const catCol = CAT_COLOR[action.category] ?? { bg: '#F1F5F9', text: '#374151' };
            return (
              <View key={action.key} style={{ borderWidth: 1, borderColor: '#E2D9F3', borderRadius: 10, padding: 12, marginBottom: 10 }}>
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
                      <Text style={{ fontSize: 10, color: '#7E22CE' }}>🗳️ 支持票 +{action.voteBonus}%</Text>
                      {action.moralCost < 0 && <Text style={{ fontSize: 10, color: '#166534' }}>廉洁 +{Math.abs(action.moralCost)}</Text>}
                      {action.moralCost > 0 && <Text style={{ fontSize: 10, color: '#991B1B' }}>廉洁 -{action.moralCost}</Text>}
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
                <Pressable
                  onPress={() => handleAction(action)}
                  disabled={onCd || !!acting}
                  style={{
                    marginTop: 10, borderRadius: 8, padding: 10, alignItems: 'center',
                    backgroundColor: isActing ? '#C4B5FD' : onCd ? '#E5E7EB' : '#4B0082',
                  }}>
                  <Text style={{ color: onCd ? '#9CA3AF' : '#FFF', fontSize: 12, fontWeight: '700' }}>
                    {isActing ? '执行中...' : onCd ? `冷却中（剩余${remain}天）` : '立即执行'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 规则说明 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#D8B4FE' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#4B0082', marginBottom: 8 }}>选举规则</Text>
          <Text style={{ fontSize: 11, color: '#475569', lineHeight: 20 }}>
            {'• 每届任期5年，任期届满可参加政治局委员票选\n• 得票率超过50%方可当选政治局委员\n• 得票率受：派系关系、政绩表现、廉洁值、关系经营行动共同影响\n• 当选后可解锁常委序列博弈（13级达成后）\n• 未当选不影响继续担任现职，可在下届选举中再次参选'}
          </Text>
        </View>
        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 选举确认弹窗 */}
      <Modal visible={showElectModal} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#4B0082', marginBottom: 8 }}>确认参加选举？</Text>
            <Text style={{ fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 }}>
              将根据当前派系关系、政绩表现、廉洁值及本届关系经营情况进行综合评估。结果将即时公布，请确认是否参选。
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowElectModal(false)}
                style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#64748B' }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleElect}
                style={{ flex: 1, backgroundColor: '#4B0082', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#FFF' }}>确认参选</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
