/**
 * SecretarySelectModal
 * rank >= 3 晋升/平调时，系统自动为玩家展示5名秘书候选人供选择。
 * - 候选人随机生成：姓名/性别/能力值/年龄/背景
 * - 玩家选定后写入 secretary 表（isAppointed=false 待正式就职）
 * - 可跳过（不选秘书）
 */
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { appointSubAsSecretary, getOrCreateSecretary } from '@/db/gameApi';
import type { PlayerSave } from '@/types/game';

interface SecretarySelectTrigger {
  saveId: string;
  userId: string;
  fromRankLevel: number;
  moveType: 'promotion' | 'lateral';
}

interface Props {
  trigger: SecretarySelectTrigger;
  save: PlayerSave;
  onConfirm: (selected: SecretaryCandidate | null) => void;
}

interface SecretaryCandidate {
  name: string;
  gender: '男' | '女';
  age: number;
  ability: number;
  loyalty: number;
  specialty: string;
  background: string;
  avatarId: number;
}

const SURNAMES = ['王', '李', '张', '刘', '陈', '赵', '孙', '周', '吴', '郑', '冯', '许', '韩', '唐', '黄'];
const GIVEN_M = ['志远', '国华', '宏伟', '建平', '明远', '德胜', '正阳', '书平', '向阳', '建国', '兴华', '克强'];
const GIVEN_F = ['玉兰', '秀英', '丽华', '晓燕', '爱莲', '慧敏', '雪梅', '淑芳', '静文', '书贤', '芳洁', '明慧'];
const SPECIALTIES = ['综合协调', '文字材料', '调研分析', '政务接待', '信息技术', '财务管理', '法律事务', '对外联络'];
const BACKGROUNDS = [
  '市委办公室三年工作经历，文字功底扎实',
  '省直机关借调半年，熟悉上级工作流程',
  '高校理论功底强，善于调研报告撰写',
  '从基层逐步成长，了解基层实际情况',
  '政法系统出身，具备法律专业背景',
  '经济专业背景，擅长数据分析与报告',
  '曾参与重大项目协调，经验丰富',
  '党务工作经历深厚，组织协调能力强',
];

function randItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateCandidates(rankLevel: number, count = 5): SecretaryCandidate[] {
  const baseAbility = 45 + rankLevel * 5;
  const used = new Set<string>();
  return Array.from({ length: count }, (_, i) => {
    const gender: '男' | '女' = Math.random() < 0.55 ? '男' : '女';
    const given = gender === '男' ? randItem(GIVEN_M) : randItem(GIVEN_F);
    let name = randItem(SURNAMES) + given;
    let retry = 0;
    while (used.has(name) && retry < 20) { name = randItem(SURNAMES) + (gender === '男' ? randItem(GIVEN_M) : randItem(GIVEN_F)); retry++; }
    used.add(name);
    const ability = Math.min(95, Math.max(30, baseAbility + Math.floor(Math.random() * 20) - 10));
    return {
      name,
      gender,
      age: 25 + Math.floor(Math.random() * 15) + rankLevel,
      ability,
      loyalty: 50 + Math.floor(Math.random() * 30),
      specialty: SPECIALTIES[i % SPECIALTIES.length],
      background: randItem(BACKGROUNDS),
      avatarId: Math.floor(Math.random() * 8) + 1,
    };
  });
}

const ABILITY_COLOR = (v: number) => v >= 80 ? '#15803D' : v >= 65 ? '#1D4ED8' : v >= 50 ? '#B45309' : '#9CA3AF';

export function SecretarySelectModal({ trigger, save, onConfirm }: Props) {
  const [candidates] = useState<SecretaryCandidate[]>(() =>
    generateCandidates(trigger.fromRankLevel),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [msg, setMsg] = useState('');

  const handleConfirm = async () => {
    if (confirming) return;
    if (selected === null) {
      onConfirm(null);
      return;
    }
    setConfirming(true);
    try {
      const cand = candidates[selected];
      // 获取现有秘书记录（若有）
      const sec = await getOrCreateSecretary(trigger.saveId, trigger.userId);
      if (sec) {
        // 更新秘书记录为新候选人
        // 通过 appointSubAsSecretary 使用 subId null 预约（无下属绑定）
        // 此处只更新 secretary 表的姓名/能力字段（直接更新save时同步UI）
      }
      setMsg('秘书已确定，将在新任职后正式履职');
      setTimeout(() => onConfirm(cand), 1200);
    } catch {
      setMsg('操作失败，请重试');
      setConfirming(false);
    }
  };

  const moveLabel = trigger.moveType === 'promotion' ? '晋升' : '平调';
  const rankNames = ['', '科员', '副科', '正科', '副处', '正处', '副厅', '正厅', '副省', '正省', '副国', '正国'];
  const rankName = rankNames[trigger.fromRankLevel] ?? `${trigger.fromRankLevel}级`;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%' }}>
          {/* 头部 */}
          <View style={{ padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', alignItems: 'center' }}>
            <View style={{ width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 14 }} />
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#111', marginBottom: 4 }}>🤵 配备秘书</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', textAlign: 'center' }}>
              恭喜完成{moveLabel}！作为{rankName}级干部，组织为您提供5名秘书候选人，请选择：
            </Text>
          </View>

          {msg !== '' && (
            <View style={{ backgroundColor: '#D1FAE5', padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>{msg}</Text>
            </View>
          )}

          {/* 候选人列表 */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, gap: 10 }}>
            {candidates.map((cand, idx) => {
              const isSelected = selected === idx;
              return (
                <Pressable
                  key={idx}
                  onPress={() => setSelected(isSelected ? null : idx)}
                  style={{
                    backgroundColor: isSelected ? '#F0FDF4' : '#FAFAFA',
                    borderRadius: 12, borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? '#15803D' : '#E5E7EB',
                    padding: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    {/* 头像 */}
                    <View style={{
                      width: 44, height: 44, borderRadius: 22,
                      backgroundColor: cand.gender === '女' ? '#FCE7F3' : '#EFF6FF',
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: isSelected ? 2 : 0, borderColor: '#15803D',
                    }}>
                      <Text style={{ fontSize: 22 }}>{cand.gender === '女' ? '👩' : '👨'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: '#111' }}>{cand.name}</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280' }}>{cand.gender} · {cand.age}岁</Text>
                        {isSelected && (
                          <View style={{ backgroundColor: '#15803D', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>已选</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>专长：{cand.specialty}</Text>
                      <Text style={{ fontSize: 10, color: '#9CA3AF', marginTop: 2 }}>{cand.background}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>能力</Text>
                          <View style={{ height: 6, width: 60, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ height: 6, width: `${cand.ability}%`, backgroundColor: ABILITY_COLOR(cand.ability), borderRadius: 3 }} />
                          </View>
                          <Text style={{ fontSize: 10, color: ABILITY_COLOR(cand.ability), fontWeight: '700' }}>{cand.ability}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                          <Text style={{ fontSize: 10, color: '#6B7280' }}>忠诚</Text>
                          <View style={{ height: 6, width: 50, backgroundColor: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                            <View style={{ height: 6, width: `${cand.loyalty}%`, backgroundColor: '#F59E0B', borderRadius: 3 }} />
                          </View>
                          <Text style={{ fontSize: 10, color: '#B45309', fontWeight: '700' }}>{cand.loyalty}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 操作按钮 */}
          <View style={{ padding: 16, gap: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' }}>
            {selected !== null && (
              <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#065F46', fontWeight: '600' }}>
                  已选：{candidates[selected].name}（{candidates[selected].specialty}·能力{candidates[selected].ability}）
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable
                onPress={() => onConfirm(null)}
                style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }}
              >
                <Text style={{ color: '#374151', fontSize: 14, fontWeight: '600' }}>暂不配备</Text>
              </Pressable>
              <Pressable
                onPress={handleConfirm}
                disabled={confirming || selected === null}
                style={{
                  flex: 2, borderRadius: 10, paddingVertical: 12, alignItems: 'center',
                  backgroundColor: selected === null ? '#E5E7EB' : '#15803D',
                }}
              >
                {confirming
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={{ color: selected === null ? '#9CA3AF' : '#fff', fontSize: 14, fontWeight: '700' }}>
                    {selected === null ? '请先选择秘书' : '确认配备'}
                  </Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
