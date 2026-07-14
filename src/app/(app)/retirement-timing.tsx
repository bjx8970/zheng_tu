// 卸任时机选择
// 机制：主动退休（锁定评价+遗产加成）vs 强行续任（续任风险+50%，强制退休惩罚）
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { RANK_CONFIG } from '@/types/game';

export default function RetirementTimingScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { save, updateGameSave } = useGame();
  const [confirm, setConfirm] = useState<'retire' | 'extend' | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!save) return null;

  const rankLevel   = save.rankLevel ?? 1;
  const tenureYears = save.tenureYears ?? 0;
  const maxTenure   = RANK_CONFIG[rankLevel]?.maxTenureYears ?? 5;
  const yearsLeft   = Math.max(0, maxTenure - tenureYears);
  const isRetired   = save.retiredVoluntarily || save.retirementForced;

  // 历史评分（简化版）
  const econScore = Math.round(
    (save.cityGdp ?? 50) * 0.35 +
    (save.cityBusiness ?? 50) * 0.35 +
    Math.min(30, (save.fundBalance ?? 0) > 0 ? 30 : Math.max(0, 30 + (save.fundBalance ?? 0) / 10000 * 10))
  );
  const livelScore = Math.round((save.cityLivelihood ?? 50) * 0.55 + (save.cityEcology ?? 50) * 0.45);
  const integrityScore = Math.min(100, Math.round(
    (save.moralValue ?? 80) * 0.7 + (100 - Math.min(100, (save.inspectionRisk ?? 20))) * 0.3
  ));
  let propCount = 0;
  try { propCount = (JSON.parse(save.majorProposals ?? '[]') as string[]).length; } catch { propCount = 0; }
  const reformScore = Math.min(100, 40 + propCount * 12 + (save.fiveYearPlanPassed ? 20 : 0));
  const totalScore = Math.round(econScore * 0.30 + livelScore * 0.25 + integrityScore * 0.25 + reformScore * 0.20);

  // 遗产加成：主动退休可获得 totalScore / 5 的遗产加成分
  const legacyGain = Math.round(totalScore / 5);

  // 强行续任惩罚：任期满后继续，inspectionRisk +50%，moralValue -10
  const extendRiskPenalty = Math.round((100 - (save.inspectionRisk ?? 20)) * 0.5);

  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 5000); }

  // 主动退休
  async function handleVoluntaryRetire() {
    if (!save) return;
    if (loading || isRetired) return;
    setLoading(true);

    // 确定历史定性
    const VERDICTS = [
      { label: '杰出领导人', minScore: 85 },
      { label: '功勋官员', minScore: 70 },
      { label: '称职干部', minScore: 55 },
      { label: '平庸之辈', minScore: 40 },
      { label: '遗留问题者', minScore: 0 },
    ];
    const lockedLabel = VERDICTS.find(v => totalScore >= v.minScore)?.label ?? '称职干部';

    await updateGameSave({
      retiredVoluntarily: true,
      historicalLabel: lockedLabel,
      legacyBonus: (save.legacyBonus ?? 0) + legacyGain,
      meritPoints: (save.meritPoints ?? 0) + legacyGain * 50,
      gameDays: (save.gameDays ?? 0) + 30,
    } as Parameters<typeof updateGameSave>[0]);

    showMsg(`✅ 主动退休，历史定性锁定为【${lockedLabel}】，获得遗产加成 +${legacyGain}，政绩 +${legacyGain * 50}`);
    setConfirm(null);
    setLoading(false);
  }

  // 强行续任
  async function handleForceExtend() {
    if (!save) return;
    if (loading || isRetired) return;
    setLoading(true);
    await updateGameSave({
      retirementForced: true,
      inspectionRisk: Math.min(100, (save.inspectionRisk ?? 20) + 50),
      moralValue: Math.max(0, (save.moralValue ?? 80) - 10),
      gameDays: (save.gameDays ?? 0) + 30,
    } as Parameters<typeof updateGameSave>[0]);
    showMsg(`⚠️ 强行续任！被查风险 +50，廉洁度 -10。续任期间如被查处则历史评价大幅下降。`, false);
    setConfirm(null);
    setLoading(false);
  }

  const PRIMARY = '#2C1810';

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F4EF' }}>
      {/* 页头 */}
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#c8a878', fontSize: 10, letterSpacing: 2 }}>生涯终局 · 卸任时机</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>卸任时机选择</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#c8a878', fontSize: 10 }}>剩余任期</Text>
          <Text style={{ color: isRetired ? '#aaa' : yearsLeft === 0 ? '#FF7878' : '#FFD700', fontSize: 14, fontWeight: '700' }}>
            {isRetired ? '已卸任' : `${yearsLeft}年`}
          </Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>
        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: msg.ok ? '#2a7a3b' : '#e53935', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 12, color: msg.ok ? '#2a7a3b' : '#c62828', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 当前状态卡 */}
        <View style={{ backgroundColor: PRIMARY, borderRadius: 12, padding: 16 }}>
          <Text style={{ color: '#c8a878', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>当前生涯状态</Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: '当前职级', value: `${rankLevel}级` },
              { label: '已任年数', value: `${tenureYears}年` },
              { label: '任期上限', value: `${maxTenure}年` },
              { label: '历史评分', value: `${totalScore}分` },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, minWidth: 80, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: 10 }}>
                <Text style={{ color: '#c8a878', fontSize: 10 }}>{item.label}</Text>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 2 }}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 已卸任提示 */}
        {isRetired && (
          <View style={{ backgroundColor: '#EDE7F6', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#9575CD', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, marginBottom: 8 }}>🎗️</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#4527A0', textAlign: 'center' }}>
              {save.retiredVoluntarily ? '主动退休，历史定性已锁定' : '强行续任状态'}
            </Text>
            {save.historicalLabel && (
              <Text style={{ fontSize: 13, color: '#5E35B1', marginTop: 6 }}>
                历史定性：【{save.historicalLabel}】
              </Text>
            )}
            {save.retirementForced && !save.retiredVoluntarily && (
              <Text style={{ fontSize: 11, color: '#E65100', marginTop: 6, textAlign: 'center' }}>
                ⚠️ 强行续任期间，被查风险大幅上升，廉洁度持续下降
              </Text>
            )}
          </View>
        )}

        {/* 主动退休 vs 强行续任 */}
        {!isRetired && (
          <>
            {/* 选项对比 */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* 主动退休 */}
              <Pressable
                onPress={() => setConfirm(confirm === 'retire' ? null : 'retire')}
                style={{ flex: 1, backgroundColor: confirm === 'retire' ? '#E8F5E9' : '#fff', borderRadius: 10, padding: 14, borderWidth: 2, borderColor: confirm === 'retire' ? '#2E7D32' : '#e0e0e0' }}
              >
                <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>🎖️</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#2E7D32', textAlign: 'center', marginBottom: 6 }}>主动退休</Text>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 16, textAlign: 'center' }}>
                  锁定当前历史定性，获得遗产加成，以功成身退的方式结束政治生涯
                </Text>
                <View style={{ marginTop: 10, backgroundColor: '#E8F5E9', borderRadius: 8, padding: 8 }}>
                  <Text style={{ fontSize: 11, color: '#2E7D32', fontWeight: '700', textAlign: 'center' }}>
                    遗产加成 +{legacyGain}{'\n'}政绩 +{legacyGain * 50}
                  </Text>
                </View>
              </Pressable>

              {/* 强行续任 */}
              <Pressable
                onPress={() => setConfirm(confirm === 'extend' ? null : 'extend')}
                style={{ flex: 1, backgroundColor: confirm === 'extend' ? '#FFEBEE' : '#fff', borderRadius: 10, padding: 14, borderWidth: 2, borderColor: confirm === 'extend' ? '#C62828' : '#e0e0e0' }}
              >
                <Text style={{ fontSize: 24, textAlign: 'center', marginBottom: 8 }}>⚠️</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#C62828', textAlign: 'center', marginBottom: 6 }}>强行续任</Text>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 16, textAlign: 'center' }}>
                  无视届期限制强行续任，承担极高政治风险，廉洁度大幅下降
                </Text>
                <View style={{ marginTop: 10, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 8 }}>
                  <Text style={{ fontSize: 11, color: '#C62828', fontWeight: '700', textAlign: 'center' }}>
                    被查风险 +50%{'\n'}廉洁度 -10
                  </Text>
                </View>
              </Pressable>
            </View>

            {/* 确认区域 */}
            {confirm === 'retire' && (
              <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#4CAF50' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B5E20', marginBottom: 8 }}>确认主动退休？</Text>
                <Text style={{ fontSize: 12, color: '#2E7D32', lineHeight: 18, marginBottom: 12 }}>
                  主动退休将：{'\n'}
                  · 以【{['杰出领导人','功勋官员','称职干部','平庸之辈','遗留问题者'].find((_, i) => totalScore >= [85,70,55,40,0][i]) ?? '称职干部'}】锁定历史定性{'\n'}
                  · 获得遗产加成 +{legacyGain}（政绩 +{legacyGain * 50}）{'\n'}
                  · 政治生涯正式结束，不可撤销
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setConfirm(null)} style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#555', fontWeight: '600' }}>取消</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleVoluntaryRetire()} disabled={loading} style={{ flex: 1, backgroundColor: '#2E7D32', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? '处理中...' : '确认退休'}</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {confirm === 'extend' && (
              <View style={{ backgroundColor: '#FFEBEE', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E53935' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#B71C1C', marginBottom: 8 }}>⚠️ 确认强行续任？</Text>
                <Text style={{ fontSize: 12, color: '#C62828', lineHeight: 18, marginBottom: 12 }}>
                  强行续任将：{'\n'}
                  · 被查风险立即 +{extendRiskPenalty}（强制惩罚）{'\n'}
                  · 廉洁度 -10，且每年持续下降{'\n'}
                  · 如在续任期间被查处，历史定性降为最低级{'\n'}
                  · 此操作不可撤销
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable onPress={() => setConfirm(null)} style={{ flex: 1, backgroundColor: '#f5f5f5', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#555', fontWeight: '600' }}>取消</Text>
                  </Pressable>
                  <Pressable onPress={() => void handleForceExtend()} disabled={loading} style={{ flex: 1, backgroundColor: '#C62828', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>{loading ? '处理中...' : '确认续任'}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}

        {/* 卸任后建议 */}
        {isRetired && save.retirementForced && !save.retiredVoluntarily && (
          <View style={{ backgroundColor: '#FFF3E0', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#FF9800', marginBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#E65100', marginBottom: 6 }}>⚡ 强行续任后应对建议</Text>
            <Text style={{ fontSize: 11, color: '#555', lineHeight: 18 }}>
              · 立即通过"卸任时机"页面提交主动退休申请可停止风险累积{'\n'}
              · 提升廉洁度（道德值）和降低被查风险是当务之急{'\n'}
              · 尽量减少高风险行动，防止被查处导致历史评价崩塌
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
