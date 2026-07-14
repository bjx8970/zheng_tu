// 领导班子会议弹窗——重大事件集体决策投票
import { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Animated } from 'react-native';
import type { EventTemplate, EventChoice } from '@/types/game';
import {
  type TeamMember,
  type VoteResult,
  generateTeamMembers,
  calcAiVote,
  calcVoteMultiplier,
  getLeadershipConfig,
} from '@/lib/leadershipTeam';

// ─────────────────────────────────────────────
// 样式常量（公文档案风）
// ─────────────────────────────────────────────
const C = {
  bg: '#F5F4F1',
  headerBg: '#1A3B6E', // 钢笔墨蓝
  red: '#C8161D',
  dark: '#222222',
  muted: '#666666',
  border: '#CCCCCC',
  gold: '#B8860B',
  supportBg: '#E8F5E9',
  supportText: '#1B5E20',
  opposeBg: '#FFEBEE',
  opposeText: '#B71C1C',
  abstainBg: '#F5F5F5',
  abstainText: '#616161',
  white: '#FFFFFF',
};

const VOTE_LABEL: Record<VoteResult, string> = {
  support: '赞成',
  oppose: '反对',
  abstain: '弃权',
};

const VOTE_BG: Record<VoteResult, string> = {
  support: C.supportBg,
  oppose: C.opposeBg,
  abstain: C.abstainBg,
};
const VOTE_COLOR: Record<VoteResult, string> = {
  support: C.supportText,
  oppose: C.opposeText,
  abstain: C.abstainText,
};

// ─────────────────────────────────────────────
// 应用投票倍率到选项数值
// ─────────────────────────────────────────────
function applyMultiplier(choice: EventChoice, multiplier: number | null, playerVote: VoteResult): EventChoice {
  if (multiplier === null) {
    // 否决——强制执行负面效果
    return {
      ...choice,
      meritChange: Math.round(choice.meritChange * -0.5),
      moralChange: Math.round(choice.moralChange * -0.5) - 5,
      gdpChange: Math.round(choice.gdpChange * -0.5),
      livelihoodChange: Math.round(choice.livelihoodChange * -0.5),
      ecologyChange: Math.round(choice.ecologyChange * -0.5),
      businessChange: Math.round(choice.businessChange * -0.5),
      description: '【方案被否决】领导班子未能形成共识，情况被迫搁置，各指标受到负面影响。',
    };
  }
  // 玩家弃权：道德小惩，整体效果打折
  const playerMod = playerVote === 'abstain' ? 0.85 : playerVote === 'oppose' ? 0.70 : 1.0;
  const moralPenalty = playerVote === 'abstain' ? -3 : playerVote === 'oppose' ? -8 : 0;
  return {
    ...choice,
    meritChange: Math.round(choice.meritChange * multiplier * playerMod),
    moralChange: Math.round(choice.moralChange * multiplier * playerMod) + moralPenalty,
    gdpChange: Math.round(choice.gdpChange * multiplier * playerMod),
    livelihoodChange: Math.round(choice.livelihoodChange * multiplier * playerMod),
    ecologyChange: Math.round(choice.ecologyChange * multiplier * playerMod),
    businessChange: Math.round(choice.businessChange * multiplier * playerMod),
  };
}

// ─────────────────────────────────────────────
// 投票阶段状态
// ─────────────────────────────────────────────
type Stage = 'select' | 'player_vote' | 'voting' | 'result';

interface VoteState {
  member: TeamMember;
  vote: VoteResult | null;
}

// ─────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────
interface Props {
  event: EventTemplate;
  rankLevel: number;
  playerName: string;
  onConfirm: (finalChoice: EventChoice, updatedMembers: TeamMember[]) => void;
  onClose?: () => void;
}

// ─────────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────────
export default function LeadershipMeetingModal({
  event,
  rankLevel,
  playerName,
  onConfirm,
  onClose,
}: Props) {
  const [stage, setStage] = useState<Stage>('select');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [playerVote, setPlayerVote] = useState<VoteResult>('support');
  const [members] = useState<TeamMember[]>(() =>
    generateTeamMembers(rankLevel, playerName)
  );
  const [voteStates, setVoteStates] = useState<VoteState[]>([]);
  const [revealedCount, setRevealedCount] = useState(0);
  const [multiplier, setMultiplier] = useState<number | null>(1);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meetingName = getLeadershipConfig(rankLevel).levelName;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -6, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // 确认方案 → 进入玩家投票选择阶段
  const handleConfirmChoice = () => {
    if (selectedIndex === null) return;
    setPlayerVote('support'); // 默认赞成
    setStage('player_vote');
  };

  // 玩家选好票后 → 进入AI投票阶段
  const handleConfirmPlayerVote = () => {
    const initial: VoteState[] = members.map((m, i) => ({
      member: m,
      vote: i === 0 ? playerVote : null, // 玩家那票已定
    }));
    setVoteStates(initial);
    setRevealedCount(1);
    setStage('voting');
  };

  // 逐一揭示 AI 成员投票（每480ms一票）
  useEffect(() => {
    if (stage !== 'voting') return;

    const nextIndex = revealedCount;
    if (nextIndex >= members.length) {
      timerRef.current = setTimeout(() => {
        const supportCount = voteStates.filter(v => v.vote === 'support').length;
        const mul = calcVoteMultiplier(supportCount, members.length);
        setMultiplier(mul);
        setStage('result');
        triggerShake();
      }, 600);
      return;
    }

    timerRef.current = setTimeout(() => {
      const aiVote = calcAiVote(members[nextIndex].favorability);
      setVoteStates(prev => {
        const next = [...prev];
        next[nextIndex] = { ...next[nextIndex], vote: aiVote };
        return next;
      });
      setRevealedCount(prev => prev + 1);
    }, 480);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [stage, revealedCount, members, voteStates]);

  // 最终确认
  const handleFinalConfirm = () => {
    if (selectedIndex === null) return;
    const choice = event.choices[selectedIndex];
    const finalChoice = applyMultiplier(choice, multiplier, playerVote);

    // 更新好感度：赞成的成员 +3，反对的成员 -5
    const updatedMembers = members.map((m, i) => {
      if (i === 0) return m;
      const vote = voteStates[i]?.vote;
      if (vote === 'support') return { ...m, favorability: Math.min(100, m.favorability + 3) };
      if (vote === 'oppose') return { ...m, favorability: Math.max(0, m.favorability - 5) };
      return m;
    });

    onConfirm(finalChoice, updatedMembers);
  };

  const supportCount = voteStates.filter(v => v.vote === 'support').length;
  const opposeCount = voteStates.filter(v => v.vote === 'oppose').length;
  const abstainCount = voteStates.filter(v => v.vote === 'abstain').length;
  const passed = multiplier !== null;

  // ────────────────────────────────────────────
  // 渲染
  // ────────────────────────────────────────────
  return (
    <Modal visible transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Animated.View style={{ width: '100%', maxWidth: 480, backgroundColor: C.bg, transform: [{ translateX: shakeAnim }] }}>

          {/* 红头——重大事件标识 */}
          <View style={{ backgroundColor: C.red, paddingVertical: 6, alignItems: 'center' }}>
            <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 11, letterSpacing: 2 }}>
              ■ 重大事项集体决策 ■
            </Text>
          </View>

          {/* 蓝色标题栏 */}
          <View style={{ backgroundColor: C.headerBg, paddingVertical: 14, paddingHorizontal: 16 }}>
            <Text style={{ color: C.white, fontSize: 15, fontWeight: 'bold', letterSpacing: 1 }}>
              {meetingName}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 3 }}>
              议题：{event.title}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 540 }} showsVerticalScrollIndicator={false}>
            <View style={{ padding: 16, gap: 14 }}>

              {/* 事件描述 */}
              <View style={{ borderLeftWidth: 3, borderLeftColor: C.red, paddingLeft: 10 }}>
                <Text style={{ color: C.dark, fontSize: 13, lineHeight: 20 }}>
                  {event.description}
                </Text>
              </View>

              {/* ── 阶段一：选择方案 ── */}
              {stage === 'select' && (
                <>
                  <Text style={{ color: C.dark, fontSize: 13, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }}>
                    请提出您的主导方案：
                  </Text>
                  {event.choices.map((choice, idx) => {
                    const selected = selectedIndex === idx;
                    return (
                      <Pressable
                        key={idx}
                        onPress={() => setSelectedIndex(idx)}
                        style={{ borderWidth: selected ? 2 : 1, borderColor: selected ? C.headerBg : C.border, backgroundColor: selected ? 'rgba(26,59,110,0.06)' : C.white, padding: 12 }}
                      >
                        <Text style={{ color: selected ? C.headerBg : C.dark, fontSize: 13, fontWeight: selected ? 'bold' : 'normal', lineHeight: 20 }}>
                          {`方案${['一', '二', '三'][idx]}：${choice.text}`}
                        </Text>
                        <Text style={{ color: C.muted, fontSize: 11, marginTop: 4 }}>
                          政绩 {choice.meritChange > 0 ? `+${choice.meritChange}` : choice.meritChange}
                          {'  '}道德 {choice.moralChange > 0 ? `+${choice.moralChange}` : choice.moralChange}
                        </Text>
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={handleConfirmChoice}
                    style={{ backgroundColor: selectedIndex !== null ? C.headerBg : C.border, paddingVertical: 13, alignItems: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }}>
                      提交方案，交付班子表决
                    </Text>
                  </Pressable>
                </>
              )}

              {/* ── 阶段二：玩家投票选择 ── */}
              {stage === 'player_vote' && (
                <>
                  {/* 被选方案回显 */}
                  {selectedIndex !== null && (
                    <View style={{ borderWidth: 1, borderColor: C.headerBg, backgroundColor: 'rgba(26,59,110,0.05)', padding: 10 }}>
                      <Text style={{ color: C.headerBg, fontSize: 12, fontWeight: 'bold' }}>
                        主导方案：{event.choices[selectedIndex].text}
                      </Text>
                    </View>
                  )}

                  <View style={{ borderLeftWidth: 3, borderLeftColor: C.gold, paddingLeft: 10, paddingVertical: 4 }}>
                    <Text style={{ color: C.dark, fontSize: 13, fontWeight: 'bold' }}>您的投票意向</Text>
                    <Text style={{ color: C.muted, fontSize: 11, marginTop: 2 }}>作为主要负责人，您的投票将影响最终执行效果</Text>
                  </View>

                  {/* 三选项按钮 */}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {(['support', 'abstain', 'oppose'] as VoteResult[]).map(v => {
                      const isSelected = playerVote === v;
                      return (
                        <Pressable
                          key={v}
                          onPress={() => setPlayerVote(v)}
                          style={{
                            flex: 1, paddingVertical: 14, alignItems: 'center',
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? VOTE_COLOR[v] : C.border,
                            backgroundColor: isSelected ? VOTE_BG[v] : C.white,
                          }}
                        >
                          <Text style={{ fontSize: 15, fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? VOTE_COLOR[v] : C.muted }}>
                            {VOTE_LABEL[v]}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  {/* 效果提示 */}
                  <View style={{ backgroundColor: '#FAFAF5', borderWidth: 1, borderColor: C.border, padding: 10, gap: 4 }}>
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      🟢 <Text style={{ color: C.supportText }}>赞成</Text>：方案正常推进，效果全额
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      ⚪ <Text style={{ color: C.abstainText }}>弃权</Text>：方案推进但效果降低15%，道德-3
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 11 }}>
                      🔴 <Text style={{ color: C.opposeText }}>反对</Text>：方案仍执行但效果降低30%，道德-8
                    </Text>
                  </View>

                  <Pressable
                    onPress={handleConfirmPlayerVote}
                    style={{ backgroundColor: VOTE_COLOR[playerVote], paddingVertical: 13, alignItems: 'center', marginTop: 4 }}
                  >
                    <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }}>
                      确认投票：{VOTE_LABEL[playerVote]}，进入表决
                    </Text>
                  </Pressable>
                </>
              )}

              {/* ── 阶段三/四：投票 & 结果 ── */}
              {(stage === 'voting' || stage === 'result') && (
                <>
                  {selectedIndex !== null && (
                    <View style={{ borderWidth: 1, borderColor: C.headerBg, backgroundColor: 'rgba(26,59,110,0.05)', padding: 10 }}>
                      <Text style={{ color: C.headerBg, fontSize: 12, fontWeight: 'bold' }}>
                        主导方案：{event.choices[selectedIndex].text}
                      </Text>
                    </View>
                  )}

                  <Text style={{ color: C.dark, fontSize: 13, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: C.border, paddingBottom: 6 }}>
                    领导班子表决情况（共{members.length}人）：
                  </Text>
                  {voteStates.map((vs, i) => {
                    const revealed = vs.vote !== null;
                    const isPlayer = i === 0;
                    return (
                      <View key={i} style={{
                        flexDirection: 'row', alignItems: 'center',
                        paddingVertical: 8, paddingHorizontal: 4,
                        borderBottomWidth: 1, borderBottomColor: '#EFEFEF',
                        backgroundColor: isPlayer ? 'rgba(26,59,110,0.04)' : C.white,
                      }}>
                        <Text style={{ width: 22, color: C.muted, fontSize: 11 }}>{i + 1}.</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: isPlayer ? C.headerBg : C.dark, fontSize: 12, fontWeight: isPlayer ? 'bold' : 'normal' }}>
                            {vs.member.position}{isPlayer ? '（您）' : ''}
                          </Text>
                          <Text style={{ color: C.muted, fontSize: 11 }}>{vs.member.name}</Text>
                        </View>
                        {revealed ? (
                          <View style={{
                            paddingHorizontal: 10, paddingVertical: 4,
                            backgroundColor: VOTE_BG[vs.vote!],
                            borderWidth: 1, borderColor: VOTE_COLOR[vs.vote!],
                          }}>
                            <Text style={{ fontWeight: 'bold', fontSize: 12, color: VOTE_COLOR[vs.vote!] }}>
                              {VOTE_LABEL[vs.vote!]}
                            </Text>
                          </View>
                        ) : (
                          <View style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: C.border }}>
                            <Text style={{ color: C.muted, fontSize: 12 }}>表决中…</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </>
              )}

              {/* ── 阶段四：结果汇总 ── */}
              {stage === 'result' && (
                <>
                  <View style={{ flexDirection: 'row', borderWidth: 2, borderColor: passed ? C.headerBg : C.red, marginTop: 4 }}>
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.supportBg }}>
                      <Text style={{ color: C.supportText, fontSize: 18, fontWeight: 'bold' }}>{supportCount}</Text>
                      <Text style={{ color: C.supportText, fontSize: 11 }}>赞成</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.opposeBg }}>
                      <Text style={{ color: C.opposeText, fontSize: 18, fontWeight: 'bold' }}>{opposeCount}</Text>
                      <Text style={{ color: C.opposeText, fontSize: 11 }}>反对</Text>
                    </View>
                    <View style={{ flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: C.abstainBg }}>
                      <Text style={{ color: C.abstainText, fontSize: 18, fontWeight: 'bold' }}>{abstainCount}</Text>
                      <Text style={{ color: C.abstainText, fontSize: 11 }}>弃权</Text>
                    </View>
                  </View>

                  {/* 玩家投票注记 */}
                  {playerVote !== 'support' && (
                    <View style={{ backgroundColor: VOTE_BG[playerVote], borderWidth: 1, borderColor: VOTE_COLOR[playerVote], padding: 8 }}>
                      <Text style={{ color: VOTE_COLOR[playerVote], fontSize: 11 }}>
                        ℹ️ 您投票「{VOTE_LABEL[playerVote]}」，{playerVote === 'abstain' ? '方案效果降低15%，道德-3' : '方案效果降低30%，道德-8'}
                      </Text>
                    </View>
                  )}

                  <View style={{ borderWidth: 2, borderColor: passed ? C.headerBg : C.red, backgroundColor: passed ? 'rgba(26,59,110,0.05)' : 'rgba(200,22,29,0.05)', padding: 12 }}>
                    <Text style={{ color: passed ? C.headerBg : C.red, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>
                      {passed ? '▶ 决议通过' : '✕ 决议未通过'}
                      {passed && multiplier !== null && multiplier !== 1.0 && (
                        <Text style={{ fontSize: 12, fontWeight: 'normal' }}>
                          {multiplier > 1 ? `（效果加成 ×${multiplier}）` : `（效果削减 ×${multiplier}）`}
                        </Text>
                      )}
                    </Text>
                    {selectedIndex !== null && (
                      <Text style={{ color: C.dark, fontSize: 12, lineHeight: 19 }}>
                        {applyMultiplier(event.choices[selectedIndex], multiplier, playerVote).description}
                      </Text>
                    )}
                  </View>

                  <Pressable
                    onPress={handleFinalConfirm}
                    style={{ backgroundColor: C.red, paddingVertical: 13, alignItems: 'center' }}
                  >
                    <Text style={{ color: C.white, fontWeight: 'bold', fontSize: 14, letterSpacing: 1 }}>
                      确认执行决议
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

