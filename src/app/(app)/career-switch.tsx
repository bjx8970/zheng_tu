// 职业路线切换页面
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

type CareerLine = '行政线' | '党务线' | '纪检线' | '团派线';

interface LineInfo {
  label: CareerLine;
  icon: string;
  color: string;
  bg: string;
  desc: string;
  strengths: string[];
  weaknesses: string[];
  switchRequire: string;
  penaltyCost: { lineKpi: number; bossFavor: number; merit: number };
}

import careerLinesData from '@/config/career-lines.json';

const LINE_DATA: LineInfo[] = careerLinesData.lines as LineInfo[];

function checkSwitchCondition(
  target: CareerLine,
  save: { meritPoints?: number; bossFavor?: number; factionPoints?: number; inspectionRisk?: number; publicOpinionIndex?: number; rankLevel?: number; lineKpiScore?: number },
): { ok: boolean; reason: string } {
  const merit   = save.meritPoints ?? 0;
  const favor   = save.bossFavor ?? 60;
  const faction = save.factionPoints ?? 0;
  const risk    = save.inspectionRisk ?? 0;
  const opinion = save.publicOpinionIndex ?? 60;
  const rank    = save.rankLevel ?? 1;
  const kpi     = save.lineKpiScore ?? 0;

  const g = careerLinesData.globalConditions;
  if (rank >= g.rankLockAbove) return { ok: false, reason: g.rankLockReason };
  if (kpi < g.minLineKpi) return { ok: false, reason: `当前路线积分不足（需≥${g.minLineKpi}，当前${kpi}），先积累路线经验再切换` };

  const lineConf = careerLinesData.lines.find(l => l.label === target);
  if (!lineConf) return { ok: false, reason: '未知路线' };
  // 用 unknown 过渡再转 Record 避免 TS 类型收窄报错
  const cond = lineConf.switchCondition as unknown as Record<string, number | undefined>;

  if (cond.meritMin  !== undefined && merit   < cond.meritMin)  return { ok: false, reason: `政绩积分不足（需≥${cond.meritMin}，当前${merit}）` };
  if (cond.favorMin  !== undefined && favor   < cond.favorMin)  return { ok: false, reason: `上司好感不足（需≥${cond.favorMin}，当前${favor}）` };
  if (cond.factionMin!== undefined && faction < cond.factionMin) return { ok: false, reason: `派系积分不足（需≥${cond.factionMin}，当前${faction}）` };
  if (cond.riskMax   !== undefined && risk    > cond.riskMax)   return { ok: false, reason: `廉洁风险过高（需≤${cond.riskMax}，当前${risk}%）` };
  if (cond.opinionMin!== undefined && opinion < cond.opinionMin) return { ok: false, reason: `舆情指数不足（需≥${cond.opinionMin}，当前${opinion}）` };

  return { ok: true, reason: '条件已满足' };
}

export default function CareerSwitchPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [confirming, setConfirming] = useState<CareerLine | null>(null);
  const [switching, setSwitching] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);

  useFocusEffect(useCallback(() => {
    setConfirming(null);
    setMsg('');
  }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const currentLine = (save.careerPathLine ?? '行政线') as CareerLine;

  const handleSwitch = async (target: CareerLine) => {
    if (switching) return;
    const check = checkSwitchCondition(target, save);
    if (!check.ok) {
      setMsg(check.reason);
      setMsgOk(false);
      return;
    }
    setSwitching(true);
    const penalty = LINE_DATA.find(l => l.label === target)?.penaltyCost ?? { lineKpi: 30, bossFavor: 5, merit: 0 };
    // Bug7修复：同时更新 careerPath 枚举（promotion.tsx doPromotion用此字段取职位名）
    const lineToPath: Record<CareerLine, string> = {
      '行政线': 'government', '党务线': 'party', '纪检线': 'discipline', '团派线': 'league',
    };
    await updateGameSave({
      careerPathLine: target,
      careerPath: lineToPath[target],
      lineKpiScore: Math.max(0, (save.lineKpiScore ?? 0) - penalty.lineKpi),
      bossFavor: Math.max(0, (save.bossFavor ?? 60) - penalty.bossFavor),
    });
    setConfirming(null);
    setMsg(`✅ 已成功切换至【${target}】！路线积分扣除 ${penalty.lineKpi} 分（路线磨合期）`);
    setMsgOk(true);
    setSwitching(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <StatusBar style="light" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: '#1C2833', flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>职业发展</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>仕途路线切换</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>当前：{currentLine}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
        {msg !== '' && (
          <View style={{ backgroundColor: msgOk ? '#D1FAE5' : '#FEE2E2', borderRadius: 8, padding: 12 }}>
            <Text style={{ color: msgOk ? '#065F46' : '#991B1B', fontSize: 13, fontWeight: '600' }}>{msg}</Text>
          </View>
        )}

        {/* 说明卡 */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111', marginBottom: 6 }}>📌 路线切换说明</Text>
          <Text style={{ fontSize: 11, color: '#6B7280', lineHeight: 19 }}>
            • 每条路线代表不同的施政方向和权力来源{'\n'}
            • 切换路线需满足特定条件，并扣除一定路线积分{'\n'}
            • <Text style={{ color: '#B91C1C', fontWeight: '600' }}>8级（正厅）及以上路线锁定，无法再切换</Text>{'\n'}
            • 路线积分 ≥ 15 才可申请切换{'\n'}
            • 新路线磨合期（切换后30天内）绩效考核有轻微惩罚
          </Text>
        </View>

        {/* 当前路线状态 */}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          {[
            { label: '政绩', value: save.meritPoints ?? 0 },
            { label: '上司好感', value: save.bossFavor ?? 60 },
            { label: '路线积分', value: save.lineKpiScore ?? 0 },
            { label: '廉洁风险', value: `${save.inspectionRisk ?? 0}%` },
            { label: '舆情', value: save.publicOpinionIndex ?? 60 },
            { label: '派系积分', value: save.factionPoints ?? 0 },
          ].map(stat => (
            <View key={stat.label} style={{ backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E5E7EB', minWidth: '30%', flex: 1 }}>
              <Text style={{ fontSize: 9, color: '#9CA3AF' }}>{stat.label}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>{stat.value}</Text>
            </View>
          ))}
        </View>

        {/* 路线卡片 */}
        {LINE_DATA.map(line => {
          const isCurrent = line.label === currentLine;
          const check = isCurrent ? { ok: false, reason: '当前路线' } : checkSwitchCondition(line.label, save);
          const isConfirming = confirming === line.label;
          return (
            <View key={line.label} style={{
              backgroundColor: isCurrent ? line.bg : '#fff',
              borderRadius: 12, borderWidth: isCurrent ? 2 : 1,
              borderColor: isCurrent ? line.color : '#E5E7EB',
              padding: 14,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>{line.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: line.color }}>{line.label}</Text>
                    {isCurrent && (
                      <View style={{ backgroundColor: line.color, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>当前路线</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{line.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#15803D', fontWeight: '700', marginBottom: 3 }}>优势</Text>
                  {line.strengths.map(s => (
                    <Text key={s} style={{ fontSize: 10, color: '#374151' }}>• {s}</Text>
                  ))}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700', marginBottom: 3 }}>劣势</Text>
                  {line.weaknesses.map(w => (
                    <Text key={w} style={{ fontSize: 10, color: '#374151' }}>• {w}</Text>
                  ))}
                </View>
              </View>
              <View style={{ backgroundColor: '#F9FAFB', borderRadius: 6, padding: 8, marginBottom: 10 }}>
                <Text style={{ fontSize: 10, color: '#6B7280' }}>
                  <Text style={{ fontWeight: '700' }}>切换条件：</Text>{line.switchRequire}
                  {'\n'}
                  <Text style={{ fontWeight: '700' }}>切换代价：</Text>路线积分 -{line.penaltyCost.lineKpi}，上司好感 -{line.penaltyCost.bossFavor}
                </Text>
              </View>

              {!isCurrent && !isConfirming && (
                <Pressable
                  onPress={() => {
                    const c = checkSwitchCondition(line.label, save);
                    if (!c.ok) { setMsg(c.reason); setMsgOk(false); return; }
                    setConfirming(line.label);
                    setMsg('');
                  }}
                  style={{
                    backgroundColor: check.ok ? line.color : '#E5E7EB',
                    borderRadius: 8, paddingVertical: 10, alignItems: 'center',
                  }}
                >
                  <Text style={{ color: check.ok ? '#fff' : '#9CA3AF', fontSize: 13, fontWeight: '700' }}>
                    {check.ok ? `切换至${line.label}` : `条件不足`}
                  </Text>
                </Pressable>
              )}

              {!isCurrent && isConfirming && (
                <View style={{ gap: 8 }}>
                  <View style={{ backgroundColor: '#FEF3C7', borderRadius: 6, padding: 10 }}>
                    <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600', textAlign: 'center' }}>
                      ⚠️ 确认切换至【{line.label}】？{'\n'}
                      路线积分 -{line.penaltyCost.lineKpi}，上司好感 -{line.penaltyCost.bossFavor}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable
                      onPress={() => setConfirming(null)}
                      style={{ flex: 1, backgroundColor: '#F3F4F6', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#374151', fontSize: 13, fontWeight: '600' }}>取消</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleSwitch(line.label)}
                      disabled={switching}
                      style={{ flex: 2, backgroundColor: line.color, borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                        {switching ? '切换中...' : `确认切换`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
