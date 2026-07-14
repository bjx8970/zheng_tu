/**
 * SecretaryReleaseModal
 * 玩家升职/平调时弹出，让玩家为原秘书选择下放到原辖区的党务/政府职务。
 * - 秘书能力 > 60 时显示"一键下放"按钮（自动选第一个可用职位）
 * - 选好职务后点确认，调用 assignLeadershipRole + recallSecretary 完成下放
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { LEADERSHIP_ROLES } from '@/types/game';
import { assignLeadershipRole, recallSecretary } from '@/db/gameApi';
import type { SecretaryReleaseTrigger } from '@/ctx/GameContext';

interface Props {
  trigger: SecretaryReleaseTrigger;
  onConfirm: () => void;
  onSkip: () => void;
}

export function SecretaryReleaseModal({ trigger, onConfirm, onSkip }: Props) {
  const [selectedRoleKey, setSelectedRoleKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const {
    saveId, saveUserId,
    secretarySubId, secretaryName, secretaryAbility,
    secretaryAvatarId, secretaryGender,
    fromRankLevel, fromCityName,
    moveType,
  } = trigger;

  // 原辖区可用职位（按当前职级过滤，党务+政府职位）
  const availableRoles = (LEADERSHIP_ROLES[fromRankLevel] ?? []).filter(r => {
    // 优先展示党务与政府班子职位（非团委类）
    return !r.key.includes('league') && !r.key.includes('military');
  });

  const partyRoles = availableRoles.filter(r =>
    r.organ.includes('党委') || r.organ.includes('纪委') || r.organ.includes('党委办') || r.organ.includes('组织')
  );
  const govRoles = availableRoles.filter(r =>
    r.organ.includes('政府') || r.organ.includes('联邦国会') || r.organ.includes('国策协理堂')
  );

  const canOneClick = secretaryAbility > 60;

  const handleConfirm = async (autoRoleKey?: string) => {
    const roleKey = autoRoleKey ?? selectedRoleKey;
    if (!roleKey) { setFeedback('请选择一个职务'); return; }
    const role = availableRoles.find(r => r.key === roleKey);
    if (!role) return;

    setSubmitting(true);
    // 1. 为秘书在原辖区分配领导职务
    const ok1 = await assignLeadershipRole(
      saveId, saveUserId, secretarySubId,
      role.key, role.label,
      secretaryName, secretaryAvatarId, secretaryGender, 0,
    );
    // 2. 解除秘书任命（释放回下属池）
    const ok2 = await recallSecretary(saveId, secretarySubId);

    if (ok1 && ok2) {
      setFeedback(`✅ ${secretaryName} 已下放至${fromCityName}${role.label}职位`);
      setTimeout(() => onConfirm(), 1000);
    } else {
      setFeedback('下放失败，请稍后重试');
    }
    setSubmitting(false);
  };

  const handleOneClick = () => {
    // 优先选党务正职，其次任意
    const preferredRoles = [...partyRoles, ...govRoles];
    const auto = preferredRoles[0];
    if (!auto) { setFeedback('暂无可用职位，请手动跳过'); return; }
    void handleConfirm(auto.key);
  };

  const moveLabel = moveType === 'promotion' ? '升职' : '平调';

  return (
    <Modal visible transparent animationType="slide">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#F7F7F5', maxHeight: '85%', borderTopWidth: 2, borderTopColor: '#1D3B5E' }}>

          {/* 标题 */}
          <View style={{ backgroundColor: '#1D3B5E', padding: 16 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>人事安排</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>
              🔄 {moveLabel}秘书安置
            </Text>
            <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 4, lineHeight: 17 }}>
              您即将{moveLabel}，秘书 {secretaryName} 无法跨行政区随行。{'\n'}
              请为其在原辖区 {fromCityName} 安排一个职务。
            </Text>
          </View>

          {/* 秘书信息卡 */}
          <View style={{ backgroundColor: '#fff', margin: 14, padding: 12, borderWidth: 1, borderColor: '#D1D1CF', flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, backgroundColor: '#1D3B5E', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 24 }}>🤵</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{secretaryName}</Text>
                <View style={{ backgroundColor: secretaryAbility > 60 ? '#2a7a3b' : '#7B5E2A', paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>能力 {secretaryAbility}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>原辖区：{fromCityName} · 即将离任</Text>
            </View>
            {/* 一键安置 */}
            {canOneClick && (
              <Pressable
                onPress={handleOneClick}
                disabled={submitting}
                style={{ backgroundColor: '#D4A030', paddingHorizontal: 10, paddingVertical: 8, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>⚡ 一键</Text>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>安置</Text>
              </Pressable>
            )}
          </View>

          {/* 反馈 */}
          {feedback ? (
            <View style={{ marginHorizontal: 14, backgroundColor: feedback.startsWith('✅') ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: feedback.startsWith('✅') ? '#2a7a3b' : '#C82829', padding: 8, marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: feedback.startsWith('✅') ? '#2a7a3b' : '#C82829' }}>{feedback}</Text>
            </View>
          ) : null}

          <ScrollView contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
            {/* 党务职位 */}
            {partyRoles.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: '#7A1B1E', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>党务职位</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888' }}>{fromCityName}党委</Text>
                </View>
                {partyRoles.map(role => (
                  <Pressable
                    key={role.key}
                    onPress={() => setSelectedRoleKey(role.key)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      padding: 12, borderWidth: 1,
                      borderColor: selectedRoleKey === role.key ? '#7A1B1E' : '#D1D1CF',
                      backgroundColor: selectedRoleKey === role.key ? '#FFF0F0' : '#fff',
                    }}
                  >
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selectedRoleKey === role.key ? '#7A1B1E' : '#ccc', backgroundColor: selectedRoleKey === role.key ? '#7A1B1E' : 'transparent' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{role.label}</Text>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{role.organ}{role.concurrentLabel ? ` · ${role.concurrentLabel}` : ''}</Text>
                    </View>
                    <View style={{ backgroundColor: '#7A1B1E22', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#7A1B1E' }}>党务</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {/* 政府职位 */}
            {govRoles.length > 0 && (
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ backgroundColor: '#1A3A4A', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>政府职位</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888' }}>{fromCityName}政府</Text>
                </View>
                {govRoles.map(role => (
                  <Pressable
                    key={role.key}
                    onPress={() => setSelectedRoleKey(role.key)}
                    style={{
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                      padding: 12, borderWidth: 1,
                      borderColor: selectedRoleKey === role.key ? '#1A3A4A' : '#D1D1CF',
                      backgroundColor: selectedRoleKey === role.key ? '#EEF4F8' : '#fff',
                    }}
                  >
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: selectedRoleKey === role.key ? '#1A3A4A' : '#ccc', backgroundColor: selectedRoleKey === role.key ? '#1A3A4A' : 'transparent' }} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{role.label}</Text>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{role.organ}{role.concurrentLabel ? ` · ${role.concurrentLabel}` : ''}</Text>
                    </View>
                    <View style={{ backgroundColor: '#1A3A4A22', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#1A3A4A' }}>政府</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}

            {availableRoles.length === 0 && (
              <View style={{ padding: 24, alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>
                  当前职级暂无可用安置职位，秘书将直接返回下属池等待重新分配。
                </Text>
              </View>
            )}
          </ScrollView>

          {/* 底部按钮 */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: '#E0E0E0', backgroundColor: '#fff' }}>
            <Pressable
              onPress={onSkip}
              disabled={submitting}
              style={{ flex: 1, padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#F5F5F5' }}
            >
              <Text style={{ fontSize: 13, color: '#888' }}>稍后处理</Text>
            </Pressable>
            <Pressable
              onPress={() => void handleConfirm()}
              disabled={submitting || !selectedRoleKey}
              style={{ flex: 2, padding: 13, alignItems: 'center', backgroundColor: submitting || !selectedRoleKey ? '#ccc' : '#1D3B5E', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : null}
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                {submitting ? '处理中…' : '确认安置'}
              </Text>
            </Pressable>
          </View>

        </View>
      </View>
    </Modal>
  );
}
