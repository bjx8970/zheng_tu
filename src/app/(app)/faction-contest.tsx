// 派系版图争夺页面
// 玩家主动投入派系积分/人脉资源，对抗敌对派系，争夺省份控制权
import { useState, useCallback } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';
import { RANK_CONFIG } from '@/types/game';

// ── 常量 ────────────────────────────────────────────────────
const BG = '#F4F4F0';
const HEADER = '#1D3B5E';
const CARD = '#FFFFFF';
const BORDER = '#D6CFC4';
const PRIMARY = '#1D3B5E';
const ACCENT = '#C82829';
const MUTED = '#888';
const GREEN = '#2E7D32';

// 五大派系配置
const FACTION_UI: Record<string, { name: string; short: string; color: string; bg: string }> = {
  reform:     { name: '改革开放系', short: '改革系', color: '#1565C0', bg: '#E3F2FD' },
  pragmatic:  { name: '稳健国家系', short: '国家系', color: '#1B5E20', bg: '#E8F5E9' },
  neutral:    { name: '共青团系',   short: '团派系', color: '#E65100', bg: '#FFF3E0' },
  economy:    { name: '技术官僚系', short: '技术系', color: '#4A148C', bg: '#F3E5F5' },
  discipline: { name: '纪检法治系', short: '纪检系', color: '#B71C1C', bg: '#FFEBEE' },
};

// 31省份简称→省全名（与 agingLeadershipBand 中版图使用相同 key）
const ABBR_TO_PROV: Record<string, string> = {
  '京': '京都市', '津': '津门市', '沪': '沪海市', '渝': '渝江市',
  '冀': '燕赵省', '豫': '中原省', '云': '滇南省', '辽': '辽东省',
  '黑': '龙江省', '湘': '湘楚省', '皖': '皖江省', '鲁': '齐鲁省',
  '新': '西域维吾尔自治区', '苏': '江淮省', '浙': '浙越省', '赣': '赣鄱省',
  '鄂': '荆楚省', '桂': '桂南壮族自治区', '甘': '陇西省', '晋': '晋中省',
  '蒙': '内蒙古自治区', '陕': '关中省', '吉': '吉辽省', '闽': '闽台省',
  '贵': '黔贵省', '粤': '粤港省', '川': '川蜀省', '青': '青藏省',
  '琼': '琼州省', '宁': '宁川回族自治区', '藏': '雪域藏族自治区',
};

// 争夺行动配置
interface ContestAction {
  id: string;
  label: string;
  desc: string;
  costPoints: number;    // 消耗派系积分
  costNetwork: number;   // 消耗人脉值
  baseSuccessRate: number; // 基础成功率
  icon: string;
}
const CONTEST_ACTIONS: ContestAction[] = [
  { id: 'probe',     label: '试探渗透',  icon: '🔍', desc: '低调布局，成本低但成效小',      costPoints: 10, costNetwork: 2,  baseSuccessRate: 0.65 },
  { id: 'lobby',     label: '游说拉拢',  icon: '🤝', desc: '争取当地官员转投己方',          costPoints: 25, costNetwork: 5,  baseSuccessRate: 0.50 },
  { id: 'resources', label: '资源倾斜',  icon: '💰', desc: '调配大量资源支持目标省份',      costPoints: 50, costNetwork: 8,  baseSuccessRate: 0.60 },
  { id: 'alliance',  label: '政治联盟',  icon: '⚖️', desc: '与目标省官员结成正式联盟',      costPoints: 80, costNetwork: 15, baseSuccessRate: 0.45 },
  { id: 'takeover',  label: '全面接管',  icon: '🏛️', desc: '彻底将该省纳入本派系版图',      costPoints: 150, costNetwork: 25, baseSuccessRate: 0.35 },
];

interface ContestResult {
  success: boolean;
  action: ContestAction;
  province: string;
  enemyFaction: string;
  meritDelta: number;
  inspectionDelta: number;
  msg: string;
}

export default function FactionContestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [selectedProv, setSelectedProv] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<ContestAction | null>(null);
  const [result, setResult] = useState<ContestResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<'map' | 'history'>('map');
  const [history, setHistory] = useState<ContestResult[]>([]);

  if (!save) return null;

  const myFaction = save.primaryFaction ?? '';
  const provinceMap = save.factionProvinceMap ?? {};
  const factionPoints = save.factionPoints ?? 0;
  const networkValue = save.networkValue ?? 0;
  const rankLevel = save.rankLevel ?? 1;

  // rank<8 不允许参与版图争夺
  if (rankLevel < 8) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
        <StatusBar style="light" backgroundColor={HEADER} />
        <View style={{ backgroundColor: HEADER, paddingTop: 8, paddingBottom: 14, paddingHorizontal: 16 }}>
          <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 13 }}>返回</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>⚔️ 派系版图争夺</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: PRIMARY, textAlign: 'center' }}>副省级（级别8）以上解锁</Text>
          <Text style={{ fontSize: 13, color: MUTED, marginTop: 8, textAlign: 'center' }}>晋升至副省级干部后，方可参与派系版图争夺，影响全国政治格局。</Text>
        </View>
      </View>
    );
  }

  // 构建可争夺省份列表：非己方控制的省份
  const contestableProvs = Object.entries(provinceMap)
    .filter(([, faction]) => faction !== myFaction)
    .map(([abbr, faction]) => ({ abbr, faction, name: ABBR_TO_PROV[abbr] ?? abbr }));

  // 我方控制省份数量
  const myCount = Object.values(provinceMap).filter(f => f === myFaction).length;
  const total = Object.keys(provinceMap).length || 31;

  // 执行争夺
  const handleContest = async () => {
    if (!selectedProv || !selectedAction || submitting) return;
    const action = selectedAction;
    const provAbbr = selectedProv;
    const provFaction = provinceMap[provAbbr] ?? 'neutral';
    if (factionPoints < action.costPoints || networkValue < action.costNetwork) return;

    setSubmitting(true);

    // 成功率计算：基础 + 职级加成 + 内部排名加成
    const rankBonus = (rankLevel - 8) * 0.03;
    const rankBonus2 = save.factionInternalRank === 'leader' ? 0.10 : save.factionInternalRank === 'backbone' ? 0.05 : 0;
    const finalRate = Math.min(0.90, action.baseSuccessRate + rankBonus + rankBonus2);
    const success = Math.random() < finalRate;

    // 后果计算
    const meritDelta = success ? Math.floor(5 + Math.random() * 10) : -3;
    const inspectionDelta = success ? Math.floor(2 + Math.random() * 3) : 1;

    // 更新版图
    const newMap = { ...provinceMap };
    if (success) {
      newMap[provAbbr] = myFaction;
    }

    const updates: Parameters<typeof updateGameSave>[0] = {
      factionProvinceMap: newMap,
      factionPoints: Math.max(0, factionPoints - action.costPoints),
      networkValue: Math.max(0, networkValue - action.costNetwork),
      meritPoints: Math.min(999, (save.meritPoints ?? 0) + meritDelta),
      inspectionRisk: Math.min(100, (save.inspectionRisk ?? 0) + inspectionDelta),
    };
    await updateGameSave(updates);

    const r: ContestResult = {
      success,
      action,
      province: ABBR_TO_PROV[provAbbr] ?? provAbbr,
      enemyFaction: FACTION_UI[provFaction]?.name ?? provFaction,
      meritDelta,
      inspectionDelta,
      msg: success
        ? `成功！${ABBR_TO_PROV[provAbbr] ?? provAbbr}已纳入${FACTION_UI[myFaction]?.name ?? '己方'}版图，政绩+${meritDelta}`
        : `失败。${FACTION_UI[provFaction]?.name ?? '对方'}守住了该省，巡视风险+${inspectionDelta}`,
    };
    setResult(r);
    setHistory(prev => [r, ...prev.slice(0, 9)]);
    setSelectedProv(null);
    setSelectedAction(null);
    setSubmitting(false);
  };

  const myFactionUi = FACTION_UI[myFaction];

  return (
    <View style={{ flex: 1, backgroundColor: BG, paddingTop: insets.top }}>
      <StatusBar style="light" backgroundColor={HEADER} />
      {/* 顶部 */}
      <View style={{ backgroundColor: HEADER, paddingTop: 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 13 }}>返回</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>⚔️ 派系版图争夺</Text>
        <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 2 }}>
          {myFactionUi?.name ?? '未加入派系'} · 控制 {myCount}/{total} 省 · 积分 {factionPoints} · 人脉 {networkValue}
        </Text>
      </View>

      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: CARD, borderBottomWidth: 1, borderBottomColor: BORDER }}>
        {([['map', '🗺️ 争夺版图'], ['history', '📜 历史记录']] as [string, string][]).map(([key, label]) => (
          <Pressable key={key} onPress={() => setTab(key as 'map' | 'history')}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? PRIMARY : 'transparent' }}>
            <Text style={{ fontSize: 13, fontWeight: tab === key ? '700' : '400', color: tab === key ? PRIMARY : MUTED }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: 40 }}>
        {tab === 'map' ? (
          <>
            {/* 结果提示 */}
            {result && (
              <View style={{ backgroundColor: result.success ? '#E8F5E9' : '#FFEBEE', borderWidth: 1, borderColor: result.success ? GREEN : ACCENT, padding: 12 }}>
                <Text style={{ fontWeight: '700', color: result.success ? GREEN : ACCENT, fontSize: 13 }}>
                  {result.success ? '✅ 争夺成功！' : '❌ 争夺失败'}
                </Text>
                <Text style={{ fontSize: 12, color: '#333', marginTop: 4 }}>{result.msg}</Text>
                <Pressable onPress={() => setResult(null)} style={{ alignSelf: 'flex-end', marginTop: 6 }}>
                  <Text style={{ fontSize: 11, color: MUTED }}>关闭</Text>
                </Pressable>
              </View>
            )}

            {/* 我方版图概览 */}
            <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 12 }}>
              <Text style={{ fontWeight: '700', color: PRIMARY, fontSize: 13, marginBottom: 8 }}>📊 我方版图概览</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, height: 10, backgroundColor: '#eee', borderRadius: 5 }}>
                  <View style={{ width: `${(myCount / Math.max(total, 1)) * 100}%`, height: 10, backgroundColor: myFactionUi?.color ?? PRIMARY, borderRadius: 5 }} />
                </View>
                <Text style={{ fontSize: 12, color: PRIMARY, fontWeight: '700' }}>{myCount}/{total}</Text>
              </View>
              {/* 各派系占比 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                {Object.entries(FACTION_UI).map(([key, ui]) => {
                  const cnt = Object.values(provinceMap).filter(f => f === key).length;
                  if (cnt === 0) return null;
                  return (
                    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: ui.bg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                      <Text style={{ fontSize: 11, color: ui.color, fontWeight: '700' }}>{ui.short}</Text>
                      <Text style={{ fontSize: 11, color: ui.color }}>{cnt}省</Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* 可争夺省份列表 */}
            <Text style={{ fontSize: 12, fontWeight: '700', color: PRIMARY, letterSpacing: 1 }}>▌ 可争夺省份（{contestableProvs.length}个）</Text>
            {contestableProvs.length === 0 ? (
              <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 30, marginBottom: 6 }}>🏆</Text>
                <Text style={{ fontSize: 13, color: PRIMARY, fontWeight: '700' }}>当前已控制所有已知省份</Text>
              </View>
            ) : (
              contestableProvs.map(p => {
                const enemyUi = FACTION_UI[p.faction];
                const isSelected = selectedProv === p.abbr;
                return (
                  <Pressable key={p.abbr} onPress={() => setSelectedProv(isSelected ? null : p.abbr)}
                    style={{ backgroundColor: CARD, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? PRIMARY : BORDER, padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ backgroundColor: enemyUi?.bg ?? '#eee', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 }}>
                          <Text style={{ fontSize: 12, color: enemyUi?.color ?? '#333', fontWeight: '700' }}>{p.abbr}</Text>
                        </View>
                        <View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#333' }}>{p.name}</Text>
                          <Text style={{ fontSize: 11, color: MUTED }}>当前：{enemyUi?.name ?? p.faction}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: isSelected ? PRIMARY : MUTED, fontWeight: isSelected ? '700' : '400' }}>
                        {isSelected ? '已选定 ✓' : '点击选择'}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            )}

            {/* 行动方案 */}
            {selectedProv && (
              <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: PRIMARY, padding: 12 }}>
                <Text style={{ fontWeight: '700', color: PRIMARY, fontSize: 13, marginBottom: 8 }}>
                  🎯 选择争夺方案 → {ABBR_TO_PROV[selectedProv] ?? selectedProv}
                </Text>
                {CONTEST_ACTIONS.map(action => {
                  const canAfford = factionPoints >= action.costPoints && networkValue >= action.costNetwork;
                  const isSelected = selectedAction?.id === action.id;
                  return (
                    <Pressable key={action.id}
                      onPress={() => canAfford && setSelectedAction(isSelected ? null : action)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 10,
                        borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? PRIMARY : BORDER,
                        backgroundColor: isSelected ? '#EEF2F8' : canAfford ? '#FAFAF8' : '#F5F5F5',
                        padding: 10, marginBottom: 6, opacity: canAfford ? 1 : 0.5,
                      }}>
                      <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: canAfford ? '#333' : MUTED }}>{action.label}</Text>
                        <Text style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>{action.desc}</Text>
                        <Text style={{ fontSize: 11, color: canAfford ? '#555' : '#bbb', marginTop: 2 }}>
                          积分 {action.costPoints} · 人脉 {action.costNetwork} · 成功率约 {Math.round(action.baseSuccessRate * 100)}%
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}

                <Pressable
                  onPress={handleContest}
                  disabled={!selectedAction || submitting}
                  style={{
                    backgroundColor: selectedAction && !submitting ? ACCENT : '#bbb',
                    paddingVertical: 13, alignItems: 'center', marginTop: 4,
                  }}>
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>
                      {selectedAction ? `发动「${selectedAction.label}」` : '请先选择方案'}
                    </Text>
                  }
                </Pressable>
              </View>
            )}
          </>
        ) : (
          /* 历史记录 */
          history.length === 0 ? (
            <View style={{ backgroundColor: CARD, borderWidth: 1, borderColor: BORDER, padding: 24, alignItems: 'center' }}>
              <Text style={{ color: MUTED, fontSize: 13 }}>暂无争夺记录</Text>
            </View>
          ) : (
            history.map((h, i) => (
              <View key={i} style={{ backgroundColor: CARD, borderWidth: 1, borderColor: h.success ? '#C8E6C9' : '#FFCDD2', padding: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: h.success ? GREEN : ACCENT }}>
                    {h.success ? '✅' : '❌'} {h.action.label} · {h.province}
                  </Text>
                </View>
                <Text style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{h.msg}</Text>
                <Text style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>
                  消耗积分 {h.action.costPoints} · 人脉 {h.action.costNetwork} · 政绩 {h.meritDelta > 0 ? '+' : ''}{h.meritDelta}
                </Text>
              </View>
            ))
          )
        )}
      </ScrollView>
    </View>
  );
}
