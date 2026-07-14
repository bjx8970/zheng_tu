import { ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { getKpiForLine, type CareerLine } from '@/lib/lineGameplay';
import { getLineTheme, LINE_ICON } from '@/lib/lineTheme';

/** 各路线对应的考核体系名称 */
const LINE_EXAM_NAME: Record<CareerLine, string> = {
  '行政线': '城市治理考核',
  '纪检线': '廉政指数考核',
  '党务线': '党建工作考核',
  '团派线': '青年工作考核',
};

export default function LineKpi() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save } = useGame();

  if (!save) return null;

  const line = (save.careerPathLine ?? '行政线') as CareerLine;
  const rank = save.rankLevel ?? 1;
  const theme = getLineTheme(line, rank);
  const kpis = getKpiForLine(line);
  const totalLineKpi = save.lineKpiScore ?? 0;
  const isDark = rank >= 12;
  const examName = LINE_EXAM_NAME[line] ?? `${line}考核`;

  // 模拟各 KPI 分项当前值（基于 lineKpiScore 按权重分配显示）
  function getKpiCurrent(weight: number, target: number): number {
    const ratio = Math.min(1, totalLineKpi / Math.max(1, rank * 200));
    return Math.round(target * ratio * weight * 4);
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: theme.primary, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', flex: 1 }}>
            {LINE_ICON[line]} {examName} · 面板
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{totalLineKpi}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>路线积分</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{rank}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>当前职级</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '700' }}>{theme.tierLabel.slice(0, 3)}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>当前岗位</Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 24 }} contentInsetAdjustmentBehavior="automatic">

        {/* 说明卡片 */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.titleColor, marginBottom: 6 }}>
            {LINE_ICON[line]} {examName}体系
          </Text>
          <Text style={{ fontSize: 12, color: theme.descColor, lineHeight: 18 }}>
            不同仕途路线的考核指标完全不同。{examName}的晋升考核以下方四项核心指标为准，总分影响「晋升可行」评分。执行专属行动可积累路线积分。
          </Text>
        </View>

        {/* KPI 指标卡片 */}
        {kpis.map(kpi => {
          const current = getKpiCurrent(kpi.weight, kpi.target);
          const pct = Math.min(100, Math.round((current / kpi.target) * 100));
          const isGood = pct >= 80;
          const isWarn = pct >= 50 && pct < 80;
          const barColor = isGood ? '#22c55e' : isWarn ? '#f59e0b' : '#ef4444';
          return (
            <View key={kpi.key} style={{ backgroundColor: theme.cardBg, borderRadius: 14, borderWidth: 1, borderColor: theme.border, padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>{kpi.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: theme.titleColor }}>{kpi.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.descColor }}>{kpi.desc}</Text>
                </View>
                <View style={{ backgroundColor: isGood ? '#e8f5e9' : isWarn ? '#fff8e1' : '#ffebee', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: barColor }}>{pct}%</Text>
                </View>
              </View>
              {/* 进度条 */}
              <View style={{ height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginBottom: 8 }}>
                <View style={{ height: 8, width: `${pct}%`, backgroundColor: barColor, borderRadius: 4 }} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 11, color: theme.descColor }}>当前：{current}{kpi.unit}</Text>
                <Text style={{ fontSize: 11, color: theme.descColor }}>目标：{kpi.target}{kpi.unit}</Text>
                <Text style={{ fontSize: 11, color: theme.descColor }}>权重：{Math.round(kpi.weight * 100)}%</Text>
              </View>
              {/* 状态评语 */}
              <View style={{ marginTop: 8, backgroundColor: isGood ? '#e8f5e9' : isWarn ? '#fff8e1' : '#ffebee', borderRadius: 8, padding: 8 }}>
                <Text style={{ fontSize: 11, color: barColor }}>
                  {isGood ? `✅ 达标！继续保持，晋升评分加成` : isWarn ? `⚠️ 接近目标，再完成几项专属行动可达标` : `❌ 不达标，需重点提升此项指标`}
                </Text>
              </View>
            </View>
          );
        })}

        {/* 综合评级 */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 14, borderWidth: 2, borderColor: theme.primary, padding: 16 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.titleColor, marginBottom: 12 }}>📊 综合评级</Text>
          {(() => {
            const avgPct = kpis.reduce((sum, k) => sum + Math.min(100, Math.round((getKpiCurrent(k.weight, k.target) / k.target) * 100)) * k.weight, 0);
            const grade = avgPct >= 85 ? '优秀' : avgPct >= 70 ? '良好' : avgPct >= 55 ? '合格' : '待提升';
            const gradeColor = avgPct >= 85 ? '#22c55e' : avgPct >= 70 ? '#3b82f6' : avgPct >= 55 ? '#f59e0b' : '#ef4444';
            return (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: gradeColor, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>{grade}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: theme.titleColor }}>综合得分：{Math.round(avgPct)}分</Text>
                    <Text style={{ fontSize: 12, color: theme.descColor, marginTop: 2 }}>
                      {`${examName}：`}{grade === '优秀' ? '晋升评分大幅加成，上级提拔概率+15%' :
                        grade === '良好' ? '晋升评分正常加成，继续执行专属行动' :
                          grade === '合格' ? '已满足晋升最低要求，建议继续提升' :
                            '低于晋升要求，须提升路线KPI后再申请晋升'}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })()}
        </View>

        {/* 如何提升 */}
        <View style={{ backgroundColor: theme.cardBg, borderRadius: 12, borderWidth: 1, borderColor: theme.border, padding: 14 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.titleColor, marginBottom: 10 }}>💡 提升路线积分方法</Text>
          <Text style={{ fontSize: 12, color: theme.descColor, lineHeight: 20 }}>
            1. 前往「{line}玩法」执行专属行动{'\n'}
            2. 完成上级发布的路线专属任务{'\n'}
            3. 每月系统自动奖励少量路线积分{'\n'}
            4. 路线积分是晋升考核的重要参考指标
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}
