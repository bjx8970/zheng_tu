/**
 * 贿赂收受事件弹窗组件
 * 由 GameContext 月度推进时 15% 概率设置 pendingBriberyEvent
 * home.tsx 检测到该字段非 null 时渲染此组件
 */
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, ActivityIndicator } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';

const C = {
  overlay: 'rgba(0,0,0,0.55)',
  bg: '#FFFFFF', border: '#E2E8F0', label: '#1A2744', sub: '#64748B',
  red: '#DC2626', redLight: '#FEE2E2', redMid: '#FCA5A5',
  green: '#16A34A', greenLight: '#DCFCE7',
  gold: '#B45309', goldLight: '#FEF3C7',
  orange: '#EA580C', orangeLight: '#FFEDD5',
};

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function BriberyEventModal({ visible, onClose }: Props) {
  const { save, refreshSave } = useGame();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ choice: 'accept' | 'reject'; text: string } | null>(null);

  if (!save || !save.pendingBriberyEvent) return null;
  const evt = save.pendingBriberyEvent;

  const npcTypeEmoji: Record<string, string> = {
    '商人': '💼', '承包商': '🏗️', '下属': '👤', '开发商': '🏢',
  };
  const icon = npcTypeEmoji[evt.npcType] ?? '👤';
  const amountWan = Math.round(evt.amount / 10000);

  async function handleChoice(choice: 'accept' | 'reject') {
    if (!save) return;
    setLoading(true);
    if (choice === 'accept') {
      const newSavings = save.personalSavings + evt.amount;
      const newMoral = Math.max(0, save.moralValue - 5);
      const newRisk = Math.min(100, save.inspectionRisk + 10);
      await updateSave(save.id, {
        personalSavings: newSavings,
        moralValue: newMoral,
        inspectionRisk: newRisk,
        briberyAccepted: save.briberyAccepted + evt.amount,
        pendingBriberyEvent: null,
      });
      setResult({ choice: 'accept', text: `收受 ${amountWan} 万元。个人资产 +${amountWan}万，廉洁度 -5，巡视风险 +10。` });
    } else {
      const newMoral = Math.min(100, save.moralValue + 3);
      await updateSave(save.id, {
        moralValue: newMoral,
        meritPoints: save.meritPoints + 2,
        briberyRejected: save.briberyRejected + 1,
        pendingBriberyEvent: null,
      });
      setResult({ choice: 'reject', text: `严词拒绝。廉洁度 +3，政绩 +2，briberyRejected +1。` });
    }
    await refreshSave();
    setLoading(false);
  }

  function handleClose() {
    setResult(null);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={{ flex: 1, backgroundColor: C.overlay, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ backgroundColor: C.bg, borderRadius: 20, width: '100%', maxWidth: 380, overflow: 'hidden', borderCurve: 'continuous' } as object}>

          {/* 顶部警示栏 */}
          <View style={{ backgroundColor: C.orange, paddingVertical: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>⚠️</Text>
            <View>
              <Text style={{ fontSize: 15, fontWeight: '900', color: '#FFFFFF' }}>行贿事件</Text>
              <Text style={{ fontSize: 11, color: '#FED7AA' }}>有人正在试图向您行贿</Text>
            </View>
          </View>

          <View style={{ padding: 20, gap: 16 }}>
            {/* NPC 信息 */}
            <View style={{ backgroundColor: C.orangeLight, borderRadius: 12, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center', borderCurve: 'continuous' }}>
              <Text style={{ fontSize: 36 }}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '900', color: C.orange }}>{evt.npcName}</Text>
                <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>{evt.npcType} · 私下接触</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.orange, marginTop: 4 }}>
                  主动行贿 <Text style={{ fontSize: 17, fontWeight: '900' }}>{amountWan} 万元</Text>
                </Text>
              </View>
            </View>

            {/* 事件描述 */}
            <Text style={{ fontSize: 13, color: C.label, lineHeight: 20 }}>
              {evt.npcName}（{evt.npcType}）在非正式场合主动向您递送了一笔{amountWan}万元的现金，
              声称"只是一点心意"，请求您在相关业务审批上"行个方便"。
              {'\n\n'}这是一个危险的时刻——您的每一个决定都可能改变仕途走向。
            </Text>

            {/* 后果预览 */}
            {!result && (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, backgroundColor: C.redLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.redMid, borderCurve: 'continuous' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: C.red, marginBottom: 4 }}>💰 接受后果</Text>
                  <Text style={{ fontSize: 11, color: C.red }}>资产 +{amountWan}万{'\n'}廉洁度 -5{'\n'}巡视风险 +10</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: C.greenLight, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.greenLight, borderCurve: 'continuous' }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: C.green, marginBottom: 4 }}>🛡️ 拒绝奖励</Text>
                  <Text style={{ fontSize: 11, color: C.green }}>廉洁度 +3{'\n'}政绩 +2{'\n'}拒贿记录 +1</Text>
                </View>
              </View>
            )}

            {/* 结果展示 */}
            {result && (
              <View style={{ backgroundColor: result.choice === 'accept' ? C.redLight : C.greenLight,
                borderRadius: 12, padding: 14, borderWidth: 1,
                borderColor: result.choice === 'accept' ? C.redMid : '#86EFAC', borderCurve: 'continuous' }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: result.choice === 'accept' ? C.red : C.green, marginBottom: 4 }}>
                  {result.choice === 'accept' ? '💰 您接受了行贿' : '✅ 您严词拒绝了行贿'}
                </Text>
                <Text style={{ fontSize: 12, color: C.label, lineHeight: 18 }}>{result.text}</Text>
              </View>
            )}

            {/* 操作按钮 */}
            {!result ? (
              loading ? (
                <ActivityIndicator color={C.orange} />
              ) : (
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => handleChoice('reject')}
                    style={{ flex: 1, backgroundColor: C.green, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderCurve: 'continuous' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>🛡️ 严词拒绝</Text>
                  </Pressable>
                  <Pressable onPress={() => handleChoice('accept')}
                    style={{ flex: 1, backgroundColor: C.redLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                      borderWidth: 1, borderColor: C.redMid, borderCurve: 'continuous' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.red }}>💰 私下接受</Text>
                  </Pressable>
                </View>
              )
            ) : (
              <Pressable onPress={handleClose}
                style={{ backgroundColor: C.label, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderCurve: 'continuous' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFFFFF' }}>确认知晓</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
