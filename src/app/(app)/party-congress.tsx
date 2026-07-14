/**
 * 党代会报告起草（党务线解锁）
 * 每5年一次党代会，玩家参与政治报告关键词博弈
 * 选择方向影响后续5年政策环境加成/限制
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// 党代会报告主题方向
interface CongressTopic {
  key: string;
  label: string;
  icon: string;
  desc: string;
  effect: string;
  econBonus: number;
  ecoBonus: number;
  secBonus: number;
  meritEffect: number;
  riskNote: string;
  color: string;
  bg: string;
}

const TOPICS: CongressTopic[] = [
  {
    key: 'economy',
    label: '经济发展优先',
    icon: '📈',
    desc: '将"高质量发展"与"共同富裕"作为报告核心，强调GDP增速与产业结构升级，凝聚全党发展共识。',
    effect: '后5年：GDP增速+15%，民营投资+20%，财政收入提升加成',
    econBonus: 25, ecoBonus: 0, secBonus: 0,
    meritEffect: 60,
    riskNote: '生态压力增大，若生态指数低于40将触发环保问责',
    color: '#166534', bg: '#D1FAE5',
  },
  {
    key: 'ecology',
    label: '生态优先战略',
    icon: '🌿',
    desc: '将"绿水青山就是金山银山"写入报告核心，推动高污染行业退出，发展绿色低碳产业。',
    effect: '后5年：生态指数+20，绿色产业GDP+10%，碳排放指标改善',
    econBonus: 0, ecoBonus: 25, secBonus: 0,
    meritEffect: 50,
    riskNote: '短期GDP可能下滑，若GDP增速低于3%将触发经济预警',
    color: '#166534', bg: '#ECFDF5',
  },
  {
    key: 'security',
    label: '安全底线守护',
    icon: '🛡️',
    desc: '以"总体国家安全观"为统领，强化政治安全、粮食安全、能源安全、金融安全四大底线。',
    effect: '后5年：维稳加成+20%，廉洁加成+5，风险事件概率-30%',
    econBonus: 0, ecoBonus: 0, secBonus: 25,
    meritEffect: 45,
    riskNote: '对外开放有所收紧，外资吸引力下降',
    color: '#B45309', bg: '#FEF3C7',
  },
  {
    key: 'reform',
    label: '全面深化改革',
    icon: '🔑',
    desc: '以"全面深化改革"为主基调，推动政治体制、经济体制、文化体制协同改革，激发发展动力。',
    effect: '后5年：各类改革行动收益+20%，政绩加成+15，民心上升',
    econBonus: 10, ecoBonus: 5, secBonus: 5,
    meritEffect: 70,
    riskNote: '改革阻力增大，路线内部分歧概率提升',
    color: '#1D4ED8', bg: '#DBEAFE',
  },
  {
    key: 'people',
    label: '以人民为中心',
    icon: '🏘️',
    desc: '以"人民至上"为报告核心主题，强调民生改善、脱贫攻坚、教育医疗均等化。',
    effect: '后5年：民心+20，民生工程收益×1.5，底层信访减少',
    econBonus: 5, ecoBonus: 0, secBonus: 5,
    meritEffect: 55,
    riskNote: '地方财政支出压力增大，专项经费消耗加速',
    color: '#7E22CE', bg: '#F5F3FF',
  },
];

// 起草行动（影响报告质量与影响力）
interface DraftAction {
  key: string;
  label: string;
  icon: string;
  desc: string;
  qualityBonus: number;
  cooldownDays: number;
}

const DRAFT_ACTIONS: DraftAction[] = [
  { key: 'cg_research', label: '赴地方调研起草素材', icon: '🚌',
    desc: '带队赴重点省份调研，收集一线鲜活素材，增强报告说服力。',
    qualityBonus: 8, cooldownDays: 60 },
  { key: 'cg_expert', label: '召集专家智库论证', icon: '🎓',
    desc: '组织国内顶尖智库学者对报告关键主题进行深度论证。',
    qualityBonus: 10, cooldownDays: 90 },
  { key: 'cg_inner_review', label: '党内征求意见', icon: '📋',
    desc: '将报告草案在党内核心层征求修改意见，增强党内共识。',
    qualityBonus: 7, cooldownDays: 60 },
  { key: 'cg_data', label: '补充核心数据支撑', icon: '📊',
    desc: '整合5年来全面量化数据，增强报告论据的科学性。',
    qualityBonus: 6, cooldownDays: 45 },
  { key: 'cg_history', label: '引述历史经典论述', icon: '📜',
    desc: '援引党内经典文献与历史论述，强化理论依据的权威性。',
    qualityBonus: 5, cooldownDays: 45 },
];

function gameDaysToYear(d: number) { return Math.floor(d / 360) + 1; }

export default function PartyCongressPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [acting, setActing] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<CongressTopic | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useFocusEffect(useCallback(() => { setMsg(''); }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  if (save.careerPathLine !== '党务线') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>此功能为党务线专属，其他路线不可操作</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#C82829', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cooldowns = save.careerPathCooldowns ?? {};
  const gameDays = save.gameDays ?? 0;
  const currentYear = gameDaysToYear(gameDays);
  const lastCongressYear = save.partyCongressYear ?? -1;
  const congressTopics = save.partyCongressTopics ?? [];
  const yearsSinceCongress = lastCongressYear >= 0 ? currentYear - lastCongressYear : 999;
  const canSubmit = yearsSinceCongress >= 5 || lastCongressYear < 0;

  const econBonus = save.partyCongressEconBonus ?? 0;
  const ecoBonus = save.partyCongressEcoBonus ?? 0;
  const secBonus = save.partyCongressSecBonus ?? 0;

  const handleDraftAction = async (action: DraftAction) => {
    if (acting) return;
    const lastDay = cooldowns[action.key] ?? 0;
    if (gameDays - lastDay < action.cooldownDays) return;
    setActing(action.key);
    try {
      const nc = { ...cooldowns, [action.key]: gameDays };
      await updateGameSave({ careerPathCooldowns: nc });
      setMsg(`✅ 【${action.label}】完成！报告质量 +${action.qualityBonus}，报告影响力提升。`);
      setMsgOk(true);
    } catch {
      setMsg('❌ 操作失败，请重试');
      setMsgOk(false);
    } finally {
      setActing(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedTopic || submitting || !canSubmit) return;
    setSubmitting(true);
    setShowConfirm(false);
    try {
      const newTopics = [...congressTopics.slice(-4), selectedTopic.label];
      await updateGameSave({
        partyCongressYear: currentYear,
        partyCongressTopics: newTopics,
        partyCongressEconBonus: econBonus + selectedTopic.econBonus,
        partyCongressEcoBonus: ecoBonus + selectedTopic.ecoBonus,
        partyCongressSecBonus: secBonus + selectedTopic.secBonus,
        meritPoints: Math.min(9999, (save.meritPoints ?? 0) + selectedTopic.meritEffect),
      });
      setMsg(`🎉 第${currentYear}届党代会政治报告以"${selectedTopic.label}"为主方向正式通过！${selectedTopic.effect}`);
      setMsgOk(true);
      setSelectedTopic(null);
    } catch {
      setMsg('❌ 提交失败，请重试');
      setMsgOk(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF5F5' }}>
      <StatusBar style="light" />
      {/* 顶栏 */}
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16, backgroundColor: '#C82829' }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 22 }}>‹ 返回</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View>
            <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 10, letterSpacing: 2 }}>党务线 · 党代会</Text>
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '800', marginTop: 2 }}>📜 党代会报告起草</Text>
          </View>
          <View style={{ backgroundColor: canSubmit ? '#FEF3C7' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
            <Text style={{ fontSize: 9, color: canSubmit ? '#B45309' : '#64748B' }}>下届党代会</Text>
            <Text style={{ fontSize: 12, fontWeight: '800', color: canSubmit ? '#B45309' : '#64748B' }}>
              {canSubmit ? '现可举行' : `${5 - yearsSinceCongress}年后`}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        {/* 反馈消息 */}
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: 12 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 13, fontWeight: '600', lineHeight: 20 }}>{msg}</Text>
          </View>
        )}

        {/* 当前政策加成 */}
        {(econBonus > 0 || ecoBonus > 0 || secBonus > 0) && (
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#C82829', marginBottom: 10 }}>📊 当前政策加成（历届党代会累计）</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '经济发展加成', val: econBonus, color: '#166534', bg: '#D1FAE5' },
                { label: '生态优先加成', val: ecoBonus, color: '#065F46', bg: '#ECFDF5' },
                { label: '安全底线加成', val: secBonus, color: '#B45309', bg: '#FEF3C7' },
              ].map(d => (
                <View key={d.label} style={{ flex: 1, backgroundColor: d.bg, borderRadius: 8, padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 9, color: '#64748B', marginBottom: 2, textAlign: 'center' }}>{d.label}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: d.color }}>+{d.val}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 历次主题记录 */}
        {congressTopics.length > 0 && (
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#C82829', marginBottom: 10 }}>📅 历届党代会主题</Text>
            {congressTopics.map((t, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
                  <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>第{i + 1}届</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#374151' }}>{t}</Text>
              </View>
            ))}
          </View>
        )}

        {/* 报告起草行动 */}
        <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#C82829', marginBottom: 12 }}>📝 报告起草准备</Text>
          {DRAFT_ACTIONS.map(action => {
            const lastDay = cooldowns[action.key] ?? 0;
            const remain = action.cooldownDays - (gameDays - lastDay);
            const onCd = remain > 0;
            const isActing = acting === action.key;
            return (
              <View key={action.key} style={{ borderWidth: 1, borderColor: '#FCA5A5', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 28 }}>{action.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1E293B', marginBottom: 3 }}>{action.label}</Text>
                    <Text style={{ fontSize: 11, color: '#64748B', lineHeight: 16 }}>{action.desc}</Text>
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                      <Text style={{ fontSize: 10, color: '#C82829' }}>📜 报告质量 +{action.qualityBonus}</Text>
                      <Text style={{ fontSize: 10, color: '#94A3B8' }}>冷却 {action.cooldownDays}天</Text>
                    </View>
                  </View>
                </View>
                <Pressable onPress={() => handleDraftAction(action)} disabled={onCd || !!acting}
                  style={{ marginTop: 10, borderRadius: 8, padding: 10, alignItems: 'center',
                    backgroundColor: isActing ? '#FCA5A5' : onCd ? '#E5E7EB' : '#C82829' }}>
                  <Text style={{ color: onCd ? '#9CA3AF' : '#FFF', fontSize: 12, fontWeight: '700' }}>
                    {isActing ? '执行中...' : onCd ? `冷却中（剩余${remain}天）` : '立即执行'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 主题选择 */}
        {canSubmit && (
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#C82829', marginBottom: 4 }}>🗳️ 选择第{currentYear}届报告核心方向</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 12 }}>选择将深刻影响未来5年政策环境，请慎重决策</Text>
            {TOPICS.map(topic => (
              <Pressable key={topic.key} onPress={() => setSelectedTopic(selectedTopic?.key === topic.key ? null : topic)}>
                <View style={{
                  borderRadius: 12, padding: 14, marginBottom: 10,
                  borderWidth: selectedTopic?.key === topic.key ? 2 : 1,
                  borderColor: selectedTopic?.key === topic.key ? '#C82829' : '#FCA5A5',
                  backgroundColor: selectedTopic?.key === topic.key ? '#FFF5F5' : '#FAFAFA',
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Text style={{ fontSize: 30 }}>{topic.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: '#1E293B' }}>{topic.label}</Text>
                        {selectedTopic?.key === topic.key && (
                          <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700' }}>已选</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{topic.desc}</Text>
                    </View>
                  </View>
                  <View style={{ backgroundColor: topic.bg, borderRadius: 8, padding: 8, marginBottom: 6 }}>
                    <Text style={{ fontSize: 11, color: topic.color, fontWeight: '600', lineHeight: 17 }}>✅ {topic.effect}</Text>
                  </View>
                  <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 8 }}>
                    <Text style={{ fontSize: 10, color: '#B91C1C', lineHeight: 15 }}>⚠️ 风险：{topic.riskNote}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                    {[
                      { l: '经济加成', v: topic.econBonus, c: '#166534', bg: '#D1FAE5' },
                      { l: '生态加成', v: topic.ecoBonus, c: '#065F46', bg: '#ECFDF5' },
                      { l: '安全加成', v: topic.secBonus, c: '#B45309', bg: '#FEF3C7' },
                      { l: '政绩奖励', v: topic.meritEffect, c: '#1D4ED8', bg: '#DBEAFE' },
                    ].map(d => (
                      <View key={d.l} style={{ flex: 1, backgroundColor: d.bg, borderRadius: 6, padding: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 8, color: '#64748B' }}>{d.l}</Text>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: d.c }}>+{d.v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            ))}
            {selectedTopic && (
              <Pressable onPress={() => setShowConfirm(true)} disabled={submitting}
                style={{ backgroundColor: submitting ? '#94A3B8' : '#C82829', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '800' }}>
                  {submitting ? '提交中...' : `📜 提交报告：${selectedTopic.label}`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {!canSubmit && (
          <View style={{ backgroundColor: '#FFF', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#FCA5A5', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 8 }}>⏳</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#374151' }}>距下届党代会还需 {5 - yearsSinceCongress} 年</Text>
            <Text style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>可先完成报告起草准备行动，为下届党代会积累优势</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* 提交确认弹窗 */}
      <Modal visible={showConfirm} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#FFF', borderRadius: 16, padding: 20 }}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#C82829', marginBottom: 8 }}>确认提交党代会报告？</Text>
            {selectedTopic && (
              <>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 6 }}>
                  {selectedTopic.icon} {selectedTopic.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#475569', lineHeight: 18, marginBottom: 16 }}>
                  {selectedTopic.effect}{'\n\n'}⚠️ 风险：{selectedTopic.riskNote}
                </Text>
              </>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setShowConfirm(false)}
                style={{ flex: 1, backgroundColor: '#F1F5F9', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#64748B' }}>再想想</Text>
              </Pressable>
              <Pressable onPress={handleSubmit}
                style={{ flex: 1, backgroundColor: '#C82829', borderRadius: 8, padding: 12, alignItems: 'center' }}>
                <Text style={{ fontWeight: '700', color: '#FFF' }}>确认提交</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
