// 历史评价系统
// 机制：退休前3年解锁（距maxTenureYears剩余3年内），四维度评价，生成历史定性
import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { RANK_CONFIG } from '@/types/game';

// 历史定性标准
interface HistoricalVerdict {
  label: string;
  desc: string;
  color: string;
  bgColor: string;
  minScore: number;   // 综合评分下限
  icon: string;
}

const HISTORICAL_VERDICTS: HistoricalVerdict[] = [
  {
    label: '杰出领导人',
    desc: '执政业绩卓著，在经济、民生、廉洁、改革四个维度均有突出贡献，载入史册，受民众长期敬仰。',
    color: '#B8860B',
    bgColor: '#FFFDE7',
    minScore: 85,
    icon: '🏆',
  },
  {
    label: '功勋官员',
    desc: '任期内政绩突出，在多个重要领域取得显著成就，赢得广泛认可，为后续发展奠定良好基础。',
    color: '#1565C0',
    bgColor: '#E3F2FD',
    minScore: 70,
    icon: '🎖️',
  },
  {
    label: '称职干部',
    desc: '任期内基本履行职责，完成各项指标，工作有起色，但在某些领域表现平平，历史评价属于中等。',
    color: '#2E7D32',
    bgColor: '#E8F5E9',
    minScore: 55,
    icon: '✅',
  },
  {
    label: '平庸之辈',
    desc: '任期内工作缺乏亮点，部分指标未达标，存在明显短板，历史评价偏低，难以留下深刻印记。',
    color: '#E65100',
    bgColor: '#FFF3E0',
    minScore: 40,
    icon: '📋',
  },
  {
    label: '遗留问题者',
    desc: '执政期间存在明显失误，在廉洁、民生或经济方面有重大缺陷，给后继者留下沉重包袱。',
    color: '#B71C1C',
    bgColor: '#FFEBEE',
    minScore: 0,
    icon: '⚠️',
  },
];

function getVerdict(score: number): HistoricalVerdict {
  return HISTORICAL_VERDICTS.find(v => score >= v.minScore) ?? HISTORICAL_VERDICTS[HISTORICAL_VERDICTS.length - 1];
}

// 雷达图组件（简化版，用矩形条形图模拟）
function RadarBar({ label, score, color, icon }: { label: string; score: number; color: string; icon: string }) {
  const pct = Math.min(100, Math.max(0, score));
  const barColor = pct >= 80 ? '#2E7D32' : pct >= 60 ? '#1565C0' : pct >= 40 ? '#E65100' : '#B71C1C';
  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 16 }}>{icon}</Text>
          <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{label}</Text>
        </View>
        <Text style={{ fontSize: 15, fontWeight: '800', color: barColor }}>{pct}分</Text>
      </View>
      <View style={{ height: 10, backgroundColor: '#f0f0f0', borderRadius: 5, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: 5 }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 }}>
        <Text style={{ fontSize: 9, color: '#aaa' }}>0</Text>
        <Text style={{ fontSize: 9, color: '#aaa' }}>50</Text>
        <Text style={{ fontSize: 9, color: '#aaa' }}>100</Text>
      </View>
    </View>
  );
}

export default function HistoricalEvaluationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();

  if (!save) return null;

  const rankLevel   = save.rankLevel ?? 1;
  const gameDays    = save.gameDays ?? 0;
  const tenureYears = save.tenureYears ?? 0;
  const maxTenure   = RANK_CONFIG[rankLevel]?.maxTenureYears ?? 5;
  const yearsLeft   = Math.max(0, maxTenure - tenureYears);

  // 是否已解锁（退休前3年，或已退休）
  const isUnlocked = yearsLeft <= 3 || save.retiredVoluntarily || save.retirementForced;

  // 四维度评分计算
  const scores = useMemo(() => {
    // 经济维度：GDP + 营商 + fundBalance
    const econScore = Math.round(
      (save.cityGdp ?? 50) * 0.35 +
      (save.cityBusiness ?? 50) * 0.35 +
      Math.min(30, (save.fundBalance ?? 0) > 0 ? 30 : Math.max(0, 30 + (save.fundBalance ?? 0) / 10000 * 10))
    );
    // 民生维度：民生 + 生态
    const livelScore = Math.round(
      (save.cityLivelihood ?? 50) * 0.55 +
      (save.cityEcology ?? 50) * 0.45
    );
    // 廉洁维度：道德值 + 未被查处
    const integrityScore = Math.min(100, Math.round(
      (save.moralValue ?? 80) * 0.7 +
      (100 - Math.min(100, (save.inspectionRisk ?? 20))) * 0.3
    ));
    // 改革维度：已通过的重大议案数 + 政策工具数
    let proposalCount = 0;
    let toolCount = 0;
    try { proposalCount = (JSON.parse(save.majorProposals ?? '[]') as string[]).length; } catch { proposalCount = 0; }
    try { toolCount = (JSON.parse(save.policyTools ?? '[]') as string[]).length; } catch { toolCount = 0; }
    const reformScore = Math.min(100, Math.round(
      40 + proposalCount * 12 + toolCount * 8 +
      (save.fiveYearPlanPassed ? 20 : 0)
    ));

    return { econScore, livelScore, integrityScore, reformScore };
  }, [save]);

  // 综合评分（加权）
  const totalScore = Math.round(
    scores.econScore * 0.30 +
    scores.livelScore * 0.25 +
    scores.integrityScore * 0.25 +
    scores.reformScore * 0.20
  );

  const verdict = getVerdict(totalScore);

  // 已定性（主动退休后锁定）
  const lockedLabel = save.historicalLabel ?? '';
  const isLocked    = lockedLabel.length > 0;
  const displayVerdict = isLocked
    ? (HISTORICAL_VERDICTS.find(v => v.label === lockedLabel) ?? verdict)
    : verdict;

  // 任期亮点
  const highlights: string[] = [];
  if ((save.cityGdp ?? 50) >= 80) highlights.push(`GDP指数达 ${save.cityGdp} 分（优秀）`);
  if ((save.moralValue ?? 80) >= 90) highlights.push('廉洁自律，道德值达90+');
  if ((save.cityLivelihood ?? 50) >= 75) highlights.push(`民生指数达 ${save.cityLivelihood} 分`);
  let propCount = 0;
  try { propCount = (JSON.parse(save.majorProposals ?? '[]') as string[]).length; } catch { propCount = 0; }
  if (propCount > 0) highlights.push(`共 ${propCount} 项重大议案获大会通过`);
  if (save.fiveYearPlanPassed) highlights.push('五年规划专项提案顺利通过');

  const PRIMARY = '#3E2B1A';

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F6F0' }}>
      {/* 页头 */}
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#c8b890', fontSize: 10, letterSpacing: 2 }}>生涯档案 · 历史评价</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>历史评价系统</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#c8b890', fontSize: 10 }}>任期剩余</Text>
          <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700' }}>{yearsLeft}年</Text>
        </View>
      </View>

      {!isUnlocked ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 }}>
          <Text style={{ fontSize: 40, marginBottom: 16 }}>🔒</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#333', textAlign: 'center', marginBottom: 8 }}>历史评价尚未解锁</Text>
          <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
            距离任期届满还有 {yearsLeft} 年，退休前3年方可查阅历史评价预估。{'\n'}
            继续积累政绩，推动改革，提升廉洁度，为历史留下好评。
          </Text>
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 历史定性卡 */}
          <View style={{ backgroundColor: displayVerdict.bgColor, borderRadius: 12, padding: 16, borderWidth: 2, borderColor: displayVerdict.color + '60' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 36 }}>{displayVerdict.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>{isLocked ? '已定性（主动退休锁定）' : '预估历史定性'}</Text>
                <Text style={{ fontSize: 22, fontWeight: '800', color: displayVerdict.color }}>{displayVerdict.label}</Text>
              </View>
              <View style={{ backgroundColor: displayVerdict.color, borderRadius: 24, width: 52, height: 52, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{totalScore}</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>{displayVerdict.desc}</Text>
          </View>

          {/* 四维度雷达评分 */}
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 14 }}>四维度执政评分</Text>
            <RadarBar label="经济建设" score={scores.econScore}      color="#1976D2" icon="📈" />
            <RadarBar label="民生改善" score={scores.livelScore}     color="#388E3C" icon="🏥" />
            <RadarBar label="廉洁自律" score={scores.integrityScore} color="#7B1FA2" icon="⚖️" />
            <RadarBar label="改革推进" score={scores.reformScore}    color="#E65100" icon="🔧" />
            {/* 综合总分 */}
            <View style={{ backgroundColor: '#1A3C5A', borderRadius: 8, padding: 12, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#8ba8c8', fontSize: 12 }}>综合评分（加权）</Text>
              <Text style={{ color: '#FFD700', fontSize: 22, fontWeight: '800' }}>{totalScore}分</Text>
            </View>
          </View>

          {/* 评分说明 */}
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>📊 评分权重说明</Text>
            {[
              { dim: '经济建设', weight: '30%', factors: 'GDP指数(35%) + 营商环境(35%) + 财政余额(30%)' },
              { dim: '民生改善', weight: '25%', factors: '民生指数(55%) + 生态指数(45%)' },
              { dim: '廉洁自律', weight: '25%', factors: '道德值(70%) + 风险管控(30%)' },
              { dim: '改革推进', weight: '20%', factors: '重大议案(+12/项) + 政策工具(+8/项) + 五年规划(+20)' },
            ].map(item => (
              <View key={item.dim} style={{ paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#333' }}>{item.dim}</Text>
                  <Text style={{ fontSize: 12, color: '#1976D2', fontWeight: '700' }}>{item.weight}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#888' }}>{item.factors}</Text>
              </View>
            ))}
          </View>

          {/* 任期亮点 */}
          {highlights.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>🌟 任期亮点</Text>
              {highlights.map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: i < highlights.length - 1 ? 1 : 0, borderColor: '#f5f5f5' }}>
                  <Text style={{ fontSize: 14, color: '#FFD700' }}>★</Text>
                  <Text style={{ fontSize: 12, color: '#333', flex: 1 }}>{h}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 历史定性等级对照 */}
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed', marginBottom: 20 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>📜 历史定性等级对照</Text>
            {HISTORICAL_VERDICTS.map(v => (
              <View key={v.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderColor: '#f5f5f5', opacity: totalScore >= v.minScore && (v.minScore === HISTORICAL_VERDICTS.find(x => totalScore >= x.minScore)?.minScore) ? 1 : 0.5 }}>
                <Text style={{ fontSize: 16 }}>{v.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: v.color }}>{v.label}</Text>
                </View>
                <View style={{ backgroundColor: v.bgColor, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 }}>
                  <Text style={{ fontSize: 11, color: v.color, fontWeight: '700' }}>≥{v.minScore}分</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
