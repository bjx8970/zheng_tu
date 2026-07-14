/**
 * PromotionReadyModal
 * 届满自动晋升 / 破格晋升触发时弹出。
 * - normal 模式：届满，引导进入代会程序（100% 通过走形式）
 * - exceptional 模式：任期第一年 KPI >= 90，可选破格晋升或继续干满一届
 */
import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import type { PromotionReadyTrigger } from '@/ctx/GameContext';

interface Props {
  trigger: PromotionReadyTrigger;
  onContinue: () => void; // 继续干满一届（仅 exceptional 模式）
  onDismiss: () => void;  // 关闭弹窗（进入代会程序后关闭）
}

export function PromotionReadyModal({ trigger, onContinue, onDismiss }: Props) {
  const router = useRouter();
  const isExceptional = trigger.mode === 'exceptional';

  const handleProceed = () => {
    onDismiss();
    router.push('/(app)/promotion' as RelativePathString);
  };

  return (
    <Modal visible transparent animationType="fade">
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center', alignItems: 'center', padding: 24,
      }}>
        <View style={{
          backgroundColor: '#F7F7F5', width: '100%',
          borderTopWidth: 4, borderTopColor: isExceptional ? '#C87000' : '#C82829',
        }}>

          {/* 顶部标题栏 */}
          <View style={{
            backgroundColor: isExceptional ? '#4A2800' : '#1A0808',
            paddingHorizontal: 18, paddingVertical: 14,
          }}>
            <Text style={{ color: isExceptional ? '#D4A030' : '#E05050', fontSize: 10, letterSpacing: 2 }}>
              {isExceptional ? '破格晋升通知' : '届满晋升通知'}
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', marginTop: 4 }}>
              {isExceptional ? '⚡ 破格晋升条件已触发' : '🎖️ 届满晋升条件已满足'}
            </Text>
          </View>

          {/* 内容 */}
          <View style={{ padding: 18, gap: 12 }}>
            {/* 当前职务信息 */}
            <View style={{
              backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF',
              padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <View style={{
                width: 44, height: 44,
                backgroundColor: isExceptional ? '#4A2800' : '#1A0808',
                justifyContent: 'center', alignItems: 'center',
              }}>
                <Text style={{ fontSize: 22 }}>{isExceptional ? '⚡' : '🎖️'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>
                  {trigger.rankName}
                </Text>
                <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  {trigger.cityName} · 任期 {trigger.tenureYears} 年
                </Text>
              </View>
              <View style={{
                backgroundColor: isExceptional ? '#C87000' : '#C82829',
                paddingHorizontal: 8, paddingVertical: 4,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  KPI {trigger.kpiScore}
                </Text>
              </View>
            </View>

            {/* 说明文字 */}
            <View style={{
              backgroundColor: isExceptional ? '#FFF8EC' : '#FFF5F5',
              borderLeftWidth: 3,
              borderLeftColor: isExceptional ? '#C87000' : '#C82829',
              padding: 12,
            }}>
              {isExceptional ? (
                <>
                  <Text style={{ fontSize: 13, color: '#7A4000', fontWeight: '700', marginBottom: 4 }}>
                    任期第三年综合考核及格（{trigger.kpiScore} 分），符合破格晋升条件。
                  </Text>
                  {trigger.mentorName ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF0D0', borderWidth: 1, borderColor: '#DFA040', padding: 8, marginBottom: 6, gap: 6 }}>
                      <Text style={{ fontSize: 16 }}>🤝</Text>
                      <Text style={{ fontSize: 12, color: '#7A4000', flex: 1, lineHeight: 18 }}>
                        <Text style={{ fontWeight: '700' }}>{trigger.mentorName}</Text>
                        {' '}（同校/同派系部级老学长）已为您疏通关系，助力本次破格晋升。
                      </Text>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 12, color: '#7A4000', lineHeight: 18, marginBottom: 6 }}>
                      同校或同派系的部级以上老学长已从旁助力，推动本次破格晋升机会。
                    </Text>
                  )}
                  <Text style={{ fontSize: 12, color: '#7A4000', lineHeight: 19 }}>
                    您可选择立即启动代会程序，在第四年办理破格晋升手续；也可以选择继续干满一届（5年），积累更多资历与政绩。
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ fontSize: 13, color: '#7A0000', fontWeight: '700', marginBottom: 4 }}>
                    任期已满 {trigger.tenureYears} 年，KPI 考核达标，正式进入晋升程序。
                  </Text>
                  <Text style={{ fontSize: 12, color: '#7A0000', lineHeight: 19 }}>
                    组织部将启动代会程序为您办理晋升手续。请前往"晋升程序"页面走完代会形式，即可完成本次晋升。
                  </Text>
                </>
              )}
            </View>

            {/* 按钮区 */}
            <View style={{ gap: 8, marginTop: 4 }}>
              <Pressable
                onPress={handleProceed}
                style={{
                  backgroundColor: isExceptional ? '#C87000' : '#C82829',
                  paddingVertical: 14, alignItems: 'center',
                }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>
                  {isExceptional ? '⚡ 立即启动破格晋升程序' : '前往代会晋升程序 →'}
                </Text>
              </Pressable>

              {isExceptional && (
                <Pressable
                  onPress={onContinue}
                  style={{
                    borderWidth: 1, borderColor: '#D1D1CF',
                    paddingVertical: 12, alignItems: 'center',
                    backgroundColor: '#F5F5F5',
                  }}
                >
                  <Text style={{ color: '#888', fontSize: 13 }}>继续干满一届（不破格晋升）</Text>
                </Pressable>
              )}
            </View>
          </View>

        </View>
      </View>
    </Modal>
  );
}
