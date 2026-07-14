/**
 * LateralTransferModal
 * 届满且 KPI 未达标时触发平调弹窗。
 * 确认后执行平调：同级换城市、重置任期。
 * ★ 新增：AI 上级路线指派卡片 + 累计2次平调后触发退休结局。
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import { getRandomCityForRank, RANK_CONFIG } from '@/types/game';
import { initBossTasks, refreshSubordinatesForNewPost, initLeadershipBand, fillAllDeptsStaff, writeSaveSlot } from '@/db/gameApi';
import { useGame } from '@/ctx/GameContext';
import type { LateralTransferTrigger } from '@/ctx/GameContext';

interface Props {
  trigger: LateralTransferTrigger;
  onDone: () => void; // 关闭弹窗
}

// 路线标签/颜色（与 promotion.tsx 保持一致）
const PATH_LABELS: Record<string, string> = {
  party:       '▲ 党务路线',
  government:  '■ 行政路线',
  discipline:  '▼ 纪检政法路线',
  league:      '◆ 团派路线',
};
const PATH_COLORS: Record<string, string> = {
  party:       '#2B4B6F',
  government:  '#5a6a4a',
  discipline:  '#7a4a4a',
  league:      '#7a5a00',
};

export function LateralTransferModal({ trigger, onDone }: Props) {
  const { save, updateGameSave, refreshSave } = useGame();
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [newCity, setNewCity] = useState<string>('');

  if (!save) return null;

  // ★ 计算本次平调后的 lateralCount（+1）
  const nextLateralCount = (save.lateralCount ?? 0) + 1;
  // ★ 第2次及以上平调：提示"下届任期满若仍不达标将触发退休结局"
  const isSecondOrMore = nextLateralCount >= 2;

  // ★ AI 上级随机指派路线（确定性随机：基于游戏天数+级别）
  const _ALL_PATHS = ['party', 'government', 'discipline', 'league'] as const;
  const assignedPath: string = _ALL_PATHS[(save.gameDays * 31 + save.rankLevel * 7) % 4];
  const pathLabel = PATH_LABELS[assignedPath] ?? assignedPath;
  const pathColor = PATH_COLORS[assignedPath] ?? '#1D3B5E';

  const handleConfirm = async () => {
    setProcessing(true);

    // 平调前自动存档到槽位3（保留平调前状态）
    const autoSaveLabel = `平调前·${save.rankName}·${save.cityName}（第${Math.floor(save.gameDays / 365) + 1}年）`;
    void writeSaveSlot(save.id, 3, autoSaveLabel);

    const assignedCity = getRandomCityForRank(trigger.rankLevel);
    const rankCfg = RANK_CONFIG[trigger.rankLevel];
    const nextRankName = trigger.rankName; // 平调，职级名称不变

    // 平调：重置任期、城市指数、上司关系，职级不变；★ 平调计数+1；★ 更新路线
    await updateGameSave({
      cityName: assignedCity,
      tenureYears: 0,
      tenureDays: 0,
      isPromotionAvailable: false,
      meritPoints: 0,
      maxTenureYears: rankCfg?.maxTenureYears ?? 5,
      requiredMerit: rankCfg?.requiredMerit ?? 60,
      bossFavor: 60,
      boss2Favor: 60,
      boss3Favor: 60,
      // 平调：城市指数重置为50（赴任新城市，一切从基准重新建设）
      cityGdp: 50,
      cityLivelihood: 50,
      cityEcology: 50,
      cityBusiness: 50,
      securityIndex: 50,
      careerPath: assignedPath,
      lateralCount: nextLateralCount,
    });

    // 刷新下属（平调后旧辖区人员不跟随）
    if (save.userId) {
      await Promise.all([
        refreshSubordinatesForNewPost(save.id, save.userId, trigger.rankLevel, assignedCity, []),
        initBossTasks(save.id, save.userId, save.careerPathLine ?? '行政线', save.gameDays),
      ]);
      // 补全所有部门额定编制
      await fillAllDeptsStaff(save.id, save.userId);
      // 初始化新辖区领导班子
      void initLeadershipBand(
        save.id, trigger.rankLevel, save.playerName, nextRankName,
        { province: save.birthProvince, city: save.birthCity, universityName: save.universityName ?? '' },
        assignedCity,
      );
    }

    await refreshSave();
    setNewCity(assignedCity);
    setDone(true);
    setProcessing(false);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
      }}>
        <View style={{
          backgroundColor: '#F7F7F5', width: '100%',
          borderTopWidth: 4, borderTopColor: '#1D3B5E',
        }}>

          {/* 顶部标题栏 */}
          <View style={{ backgroundColor: '#1D2D44', paddingHorizontal: 18, paddingVertical: 14 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>组织部通知</Text>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 4 }}>
              🔄 平级调配通知
            </Text>
          </View>

          <View style={{ padding: 18, gap: 12 }}>

            {done ? (
              // 平调完成界面
              <View style={{ alignItems: 'center', gap: 14, paddingVertical: 12 }}>
                <View style={{
                  width: 64, height: 64, backgroundColor: '#1D3B5E',
                  justifyContent: 'center', alignItems: 'center',
                }}>
                  <Text style={{ fontSize: 32 }}>📋</Text>
                </View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#222', letterSpacing: 1 }}>
                  调令已下达
                </Text>
                <View style={{
                  backgroundColor: '#EEF4F8', borderWidth: 1,
                  borderColor: '#1D3B5E', padding: 12, width: '100%',
                }}>
                  <Text style={{ fontSize: 13, color: '#1D3B5E', fontWeight: '600', textAlign: 'center' }}>
                    📍 调任 → {newCity}
                  </Text>
                  <Text style={{ fontSize: 11, color: '#888', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                    平调至同级职位，任期重新计算{'\n'}
                    组织已为您指定 <Text style={{ color: pathColor, fontWeight: '700' }}>{pathLabel}</Text> 方向
                  </Text>
                </View>
                {isSecondOrMore && (
                  <View style={{ backgroundColor: '#fff5f0', borderWidth: 2, borderColor: '#C82829', padding: 10, width: '100%' }}>
                    <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '800', marginBottom: 4 }}>⚠️ 组织警告</Text>
                    <Text style={{ fontSize: 11, color: '#C82829', lineHeight: 17 }}>
                      这已是您第 {nextLateralCount} 次被平调。若本届任期考核仍未达标，组织部将启动提前退休程序。
                    </Text>
                  </View>
                )}
                <Pressable
                  onPress={onDone}
                  style={{
                    backgroundColor: '#1D3B5E', width: '100%',
                    paddingVertical: 13, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>知悉，前往新任职地</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* 当前职务信息 */}
                <View style={{
                  backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF',
                  padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
                }}>
                  <View style={{
                    width: 44, height: 44, backgroundColor: '#1D2D44',
                    justifyContent: 'center', alignItems: 'center',
                  }}>
                    <Text style={{ fontSize: 22 }}>📋</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>
                      {trigger.rankName}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      {trigger.cityName} · 任期 {trigger.tenureYears}/{trigger.maxTenureYears} 年
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: '#7B5E2A', paddingHorizontal: 8, paddingVertical: 4,
                  }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>平调</Text>
                  </View>
                </View>

                {/* 平调原因 */}
                <View style={{
                  backgroundColor: '#F5F3EE', borderLeftWidth: 3,
                  borderLeftColor: '#7B5E2A', padding: 12,
                }}>
                  <Text style={{ fontSize: 11, color: '#7B5E2A', fontWeight: '700', marginBottom: 4 }}>
                    ⚖️ 组织部意见
                  </Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 19 }}>
                    {trigger.reason}
                  </Text>
                </View>

                {/* ★ AI 上级路线指派卡片 */}
                <View style={{ borderWidth: 2, borderColor: pathColor, padding: 10, backgroundColor: '#F7F7F5', gap: 4 }}>
                  <Text style={{ fontSize: 10, color: pathColor, fontWeight: '800', letterSpacing: 1 }}>
                    📋 组织部已为您调整仕途方向
                  </Text>
                  <Text style={{ fontSize: 13, color: pathColor, fontWeight: '700' }}>
                    {pathLabel}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#888', lineHeight: 15 }}>
                    平调至新辖区后，将按此路线方向重新配置职务，任期内专注本方向考核。
                  </Text>
                </View>

                {/* ★ 二次平调警告 */}
                {isSecondOrMore && (
                  <View style={{ backgroundColor: '#fff5f0', borderWidth: 2, borderColor: '#C82829', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '800', marginBottom: 4 }}>⚠️ 组织警告</Text>
                    <Text style={{ fontSize: 11, color: '#C82829', lineHeight: 17 }}>
                      这已是您第 {nextLateralCount} 次被平调。若本届任期考核仍未达标，组织部将启动提前退休程序，请务必奋发作为。
                    </Text>
                  </View>
                )}

                {/* 提示 */}
                <Text style={{ fontSize: 11, color: '#888', lineHeight: 17 }}>
                  · 平调后职级不变，调任同级另一辖区{'\n'}
                  · 任期清零，城市指数重置，下属不随调{'\n'}
                  · 平调后将由您重新任命秘书和部门人员
                </Text>

                {/* 确认按钮 */}
                <Pressable
                  onPress={() => { void handleConfirm(); }}
                  disabled={processing}
                  style={{
                    backgroundColor: processing ? '#aaa' : '#1D3B5E',
                    paddingVertical: 14, alignItems: 'center',
                    flexDirection: 'row', justifyContent: 'center', gap: 8, marginTop: 4,
                  }}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                >
                  {processing ? <ActivityIndicator size="small" color="#fff" /> : null}
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {processing ? '办理调令中…' : '接受平调安排'}
                  </Text>
                </Pressable>
              </>
            )}

          </View>
        </View>
      </View>
    </Modal>
  );
}
