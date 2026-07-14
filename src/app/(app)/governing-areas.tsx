// 管辖区域页面 - 含汇总面板、排行榜、全区普查、发展等级标签、冷却时间、特色发展
import React, { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getGoverningAreas, initGoverningAreas, investArea, visitArea } from '@/db/gameApi';
import { generateAreas, AREA_TYPE_LABEL } from '@/types/game';
import type { GoverningArea } from '@/types/game';

function getAreaTier(rankLevel: number): GoverningArea['areaType'] {
  if (rankLevel <= 3) return 'village';
  if (rankLevel <= 6) return 'town';
  if (rankLevel <= 9) return 'district';
  return 'city_level';
}

// ── 发展指数折线图（以年为单位，每12月聚合年均值）──────────────────────────
const CHART_W = 260, CHART_H = 90, CHART_PAD = 14;
function DevHistoryChart({ history }: { history: { m: number; v: number }[] }) {
  if (history.length < 2) {
    return (
      <View style={{ height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <Text style={{ fontSize: 10, color: '#bbb' }}>暂无历史（满2个月后显示趋势）</Text>
      </View>
    );
  }

  // 按12个月聚合成年均值；若数据不足12个月则每月为一个点（按月显示）
  const useYearly = history.length >= 12;
  type Pt = { label: string; v: number };
  let points: Pt[];
  if (useYearly) {
    const yearMap: Map<number, number[]> = new Map();
    history.forEach(h => {
      const yr = Math.floor((h.m - 1) / 12) + 1;
      if (!yearMap.has(yr)) yearMap.set(yr, []);
      yearMap.get(yr)!.push(h.v);
    });
    points = Array.from(yearMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([yr, vals]) => ({
        label: `第${yr}年`,
        v: Math.round(vals.reduce((s, x) => s + x, 0) / vals.length),
      }));
  } else {
    points = history.map(h => ({ label: `M${h.m}`, v: h.v }));
  }

  if (points.length < 2) {
    return (
      <View style={{ height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' }}>
        <Text style={{ fontSize: 10, color: '#bbb' }}>数据积累中…</Text>
      </View>
    );
  }

  const vals = points.map(p => p.v);
  const minV = Math.max(0,   Math.min(...vals) - 5);
  const maxV = Math.min(100, Math.max(...vals) + 5);
  const range = maxV - minV || 1;
  const innerW = CHART_W - CHART_PAD * 2;
  const innerH = CHART_H - CHART_PAD * 2 - 14; // 底部留x轴标签

  const toX = (i: number) => CHART_PAD + (i / (points.length - 1)) * innerW;
  const toY = (v: number) => CHART_PAD + (1 - (v - minV) / range) * innerH;
  const polyPts = points.map((p, i) => `${toX(i)},${toY(p.v)}`).join(' ');

  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ fontSize: 9, color: '#999', marginBottom: 3 }}>
        发展指数历史趋势（{useYearly ? `近${points.length}年年均` : `近${points.length}月`}）
      </Text>
      <Svg width={CHART_W} height={CHART_H} style={{ backgroundColor: '#F8F9FA' }}>
        {/* 参考线 50 */}
        <Line x1={CHART_PAD} y1={toY(50)} x2={CHART_W - CHART_PAD} y2={toY(50)}
          stroke="#D8D8D6" strokeWidth={0.8} strokeDasharray="3,3" />
        <SvgText x={CHART_W - CHART_PAD} y={toY(50) - 2} fontSize={7} fill="#ccc" textAnchor="end">50</SvgText>
        {/* 折线 */}
        <Polyline points={polyPts} fill="none" stroke="#1D2D44" strokeWidth={1.8} />
        {/* 数据点 + x轴标签 */}
        {points.map((p, i) => {
          const cx = toX(i); const cy = toY(p.v);
          const isFirst = i === 0; const isLast = i === points.length - 1;
          const showLabel = points.length <= 6 || isFirst || isLast;
          return (
            <React.Fragment key={i}>
              <Circle cx={cx} cy={cy} r={2.5} fill={isLast ? '#C82829' : '#1D2D44'} />
              {showLabel && (
                <SvgText x={cx} y={CHART_H - 2} fontSize={7} fill="#aaa" textAnchor="middle">{p.label}</SvgText>
              )}
              {isLast && (
                <SvgText x={cx + 5} y={cy - 3} fontSize={8} fill="#C82829" fontWeight="bold">{p.v}</SvgText>
              )}
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

// ── 多区域发展指数对比折线图 ────────────────────────────────────────────────
const AREA_COLORS = ['#1D2D44','#C82829','#2a7a3b','#e67e22','#7B5E2A','#2B4B6F','#8e44ad','#16a085','#c0392b','#27ae60'];
const CMP_W = 300, CMP_H = 110, CPAD = 16;

function MultiAreaCompareChart({ areas }: { areas: GoverningArea[] }) {
  // 只取有历史数据（>=2条）的区域
  const active = areas.filter(a => a.devHistory.length >= 2);
  if (active.length === 0) {
    return (
      <View style={{ height: 50, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 10, color: '#999' }}>暂无历史数据（各辖区满2个月后显示）</Text>
      </View>
    );
  }

  // 取所有月序并集，以年为单位聚合
  const buildYearPoints = (history: { m: number; v: number }[]) => {
    const useYearly = history.length >= 12;
    if (!useYearly) return history.map(h => ({ x: h.m, v: h.v }));
    const ym = new Map<number, number[]>();
    history.forEach(h => {
      const yr = Math.floor((h.m - 1) / 12) + 1;
      if (!ym.has(yr)) ym.set(yr, []);
      ym.get(yr)!.push(h.v);
    });
    return Array.from(ym.entries()).sort(([a],[b])=>a-b)
      .map(([yr, vs]) => ({ x: yr, v: Math.round(vs.reduce((s,x)=>s+x,0)/vs.length) }));
  };

  // 所有区域点序列
  const series = active.map((a, ci) => ({
    name: a.areaName,
    color: AREA_COLORS[ci % AREA_COLORS.length],
    pts: buildYearPoints(a.devHistory),
  }));

  // 确定 x/y 范围
  const allX = series.flatMap(s => s.pts.map(p => p.x));
  const allV = series.flatMap(s => s.pts.map(p => p.v));
  const minX = Math.min(...allX); const maxX = Math.max(...allX);
  const minV = Math.max(0, Math.min(...allV) - 5);
  const maxV = Math.min(100, Math.max(...allV) + 5);
  const rangeX = maxX - minX || 1; const rangeV = maxV - minV || 1;
  const innerW = CMP_W - CPAD * 2; const innerH = CMP_H - CPAD * 2 - 14;
  const toX = (x: number) => CPAD + ((x - minX) / rangeX) * innerW;
  const toY = (v: number) => CPAD + (1 - (v - minV) / rangeV) * innerH;

  return (
    <View style={{ marginTop: 8 }}>
      <Svg width={CMP_W} height={CMP_H} style={{ backgroundColor: '#F8F9FA' }}>
        {/* 参考线50 */}
        <Line x1={CPAD} y1={toY(50)} x2={CMP_W - CPAD} y2={toY(50)}
          stroke="#D8D8D6" strokeWidth={0.8} strokeDasharray="3,3" />
        <SvgText x={CMP_W - CPAD} y={toY(50) - 2} fontSize={6} fill="#ccc" textAnchor="end">50</SvgText>
        {series.map((s, si) => {
          const polyPts = s.pts.map(p => `${toX(p.x)},${toY(p.v)}`).join(' ');
          const last = s.pts[s.pts.length - 1];
          return (
            <React.Fragment key={si}>
              <Polyline points={polyPts} fill="none" stroke={s.color} strokeWidth={1.5} />
              <Circle cx={toX(last.x)} cy={toY(last.v)} r={2.5} fill={s.color} />
              <SvgText x={toX(last.x) + 4} y={toY(last.v)} fontSize={7} fill={s.color}>{last.v}</SvgText>
            </React.Fragment>
          );
        })}
        {/* x轴年份标注：首尾 */}
        <SvgText x={CPAD} y={CMP_H - 2} fontSize={7} fill="#aaa" textAnchor="middle">第{minX}{series[0].pts.length >= 12 ? '年' : '月'}</SvgText>
        <SvgText x={CMP_W - CPAD} y={CMP_H - 2} fontSize={7} fill="#aaa" textAnchor="middle">第{maxX}{series[0].pts.length >= 12 ? '年' : '月'}</SvgText>
      </Svg>
      {/* 图例 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
        {series.map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <View style={{ width: 10, height: 3, backgroundColor: s.color }} />
            <Text style={{ fontSize: 9, color: '#555' }} numberOfLines={1}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function getDevLevelLabel(devIndex: number): { label: string; color: string; bg: string } {
  if (devIndex >= 80) return { label: '先进', color: '#fff', bg: '#2a7a3b' };
  if (devIndex >= 60) return { label: '良好', color: '#fff', bg: '#2B4B6F' };
  if (devIndex >= 40) return { label: '一般', color: '#fff', bg: '#e67e22' };
  return { label: '落后', color: '#fff', bg: '#C82829' };
}

/** 冷却剩余天数（30天冷却） */
function cooldownLeft(lastDay: number, currentDay: number, cd = 30): number {
  return Math.max(0, cd - (currentDay - lastDay));
}

function IndexBar({ label, value, color = '#1D2D44' }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 10, color: '#666' }}>{label}</Text>
        <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'], fontWeight: '600' }}>{value}</Text>
      </View>
      <View style={{ height: 3, backgroundColor: '#E8E8E5' }}>
        <View style={{ height: 3, width: `${value}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function AreaCard({
  area, rank, gameDays, onInvest, onVisit, onInspect, onSpecial, loading, lastActionResult,
}: {
  area: GoverningArea; rank: number; gameDays: number;
  onInvest: (id: string) => void;
  onVisit: (id: string) => void;
  onInspect: (id: string) => void;
  onSpecial: (id: string) => void;
  loading: string | null;
  lastActionResult?: { desc: string; day: number } | null;
}) {
  const isLoading = loading === area.id;
  const devLevel = getDevLevelLabel(area.devIndex);
  const rankBadgeColor = rank === 1 ? '#C82829' : rank === 2 ? '#7a5c2a' : rank === 3 ? '#2B4B6F' : '#888';

  const investCd = cooldownLeft(area.lastInvestedDay, gameDays);
  const visitCd = cooldownLeft(area.lastVisitedDay, gameDays);
  const isLagging = area.devIndex < 40;
  const [showChart, setShowChart] = useState(false);

  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isLagging ? '#ffcdd2' : '#D1D1D1', marginBottom: 10, padding: 14 }}>
      {/* 落后标记 */}
      {isLagging && (
        <View style={{ backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>⚠️ 落后辖区 — 建议优先投资扶持</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 20, height: 20, backgroundColor: rankBadgeColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{rank}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>{area.areaName}</Text>
            <View style={{ backgroundColor: devLevel.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: devLevel.color, fontSize: 9, fontWeight: '700' }}>{devLevel.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ borderWidth: 1, borderColor: '#D1D1D1', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ color: '#888', fontSize: 9 }}>{AREA_TYPE_LABEL[area.areaType]}</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#aaa' }}>好感{area.favorIndex}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: '#888' }}>综合发展</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: devLevel.bg, fontVariant: ['tabular-nums'] }}>
            {area.devIndex}
          </Text>
        </View>
      </View>

      <IndexBar label="发展指数" value={area.devIndex} color="#1D2D44" />
      <IndexBar label="群众好感" value={area.favorIndex} color="#2a7a3b" />

      {/* 历史趋势图折叠 */}
      <Pressable
        onPress={() => setShowChart(v => !v)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4, marginBottom: 2 }}
      >
        <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '600' }}>
          {showChart ? '▲ 收起趋势图' : '▼ 查看历史趋势'}
        </Text>
        {area.devHistory.length >= 2 && (
          <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 4, paddingVertical: 1 }}>
            <Text style={{ fontSize: 8, color: '#2B4B6F' }}>{area.devHistory.length}期数据</Text>
          </View>
        )}
      </Pressable>
      {showChart && <DevHistoryChart history={area.devHistory} />}

      {isLoading ? (
        <ActivityIndicator size="small" color="#1D2D44" style={{ marginTop: 10 }} />
      ) : (
        <View style={{ gap: 6, marginTop: 10 }}>
          {/* 上次操作结果（永久保存，跨会话可见）*/}
          {lastActionResult && (
            <View style={{ backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#BBF7D0', padding: 7, marginBottom: 2 }}>
              <Text style={{ fontSize: 10, color: '#065F46' }}>📋 上次操作（第{lastActionResult.day}天）：{lastActionResult.desc}</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 投资拨款 */}
            <Pressable
              onPress={() => onInvest(area.id)}
              disabled={investCd > 0}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: investCd > 0 ? '#E8E8E5' : '#1D2D44' }}
            >
              <Text style={{ color: investCd > 0 ? '#aaa' : '#fff', fontSize: 11, fontWeight: '700' }}>
                {investCd > 0 ? `投资（冷却${investCd}天）` : '投资拨款'}
              </Text>
              <Text style={{ color: investCd > 0 ? '#bbb' : '#aac0d8', fontSize: 9, marginTop: 2 }}>
                {investCd > 0 ? '— 冷却中 —' : '消耗20政绩 · 发展+8'}
              </Text>
            </Pressable>
            {/* 实地走访 */}
            <Pressable
              onPress={() => onVisit(area.id)}
              disabled={visitCd > 0}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: visitCd > 0 ? '#ccc' : '#2a7a3b', backgroundColor: '#fff' }}
            >
              <Text style={{ color: visitCd > 0 ? '#aaa' : '#2a7a3b', fontSize: 11, fontWeight: '700' }}>
                {visitCd > 0 ? `走访（冷却${visitCd}天）` : '实地走访'}
              </Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>
                {visitCd > 0 ? '— 冷却中 —' : '好感+12 · +8政绩'}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 视察检查 */}
            <Pressable
              onPress={() => onInspect(area.id)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C82829', backgroundColor: '#fff' }}
            >
              <Text style={{ color: '#C82829', fontSize: 11, fontWeight: '700' }}>视察检查</Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>发现问题+15政绩</Text>
            </Pressable>
            {/* 特色发展（落后辖区额外增益）*/}
            <Pressable
              onPress={() => onSpecial(area.id)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: isLagging ? '#C82829' : '#7B5E2A' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {isLagging ? '精准帮扶' : '特色发展'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 }}>
                {isLagging ? '消耗30政绩 · 发展+15' : '消耗25政绩 · 好感+15'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function GoverningAreasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [areas, setAreas] = useState<GoverningArea[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [surveying, setSurveying] = useState(false);
  const [sortMode, setSortMode] = useState<'rank' | 'lagging'>('rank');
  const [showCompareChart, setShowCompareChart] = useState(false);

  const rankLevel = save?.rankLevel ?? 1;
  const currentTier = getAreaTier(rankLevel);
  const gameDays = save?.gameDays ?? 0;
  // 当月 key（每30天一期）及月度行动计数（从 kpiRankingResult |AREA_CNT: 段读取）
  const monthKey = Math.floor(gameDays / 30);
  const [monthCounts, setMonthCounts] = useState<{ mk: number; invest: number; visit: number }>({ mk: monthKey, invest: 0, visit: 0 });

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  const MONTHLY_LIMIT = 2; // 投资/走访每月上限次数

  /** 从 kpiRankingResult 解析当月投资/走访计数，跨月自动归零 */
  const parseMonthCounts = (raw: string, mk: number) => {
    try {
      const marker = '|AREA_CNT:';
      if (!raw.includes(marker)) return { mk, invest: 0, visit: 0 };
      const seg = raw.slice(raw.indexOf(marker) + marker.length).split('|')[0];
      const parsed = JSON.parse(seg) as { mk: number; invest: number; visit: number };
      // 跨月则归零
      return parsed.mk === mk ? parsed : { mk, invest: 0, visit: 0 };
    } catch { return { mk, invest: 0, visit: 0 }; }
  };

  /** 写入月度计数到 kpiRankingResult */
  const buildAreaCntStr = (base: string, counts: { mk: number; invest: number; visit: number }) => {
    const marker = '|AREA_CNT:';
    // 提取并保留 AUTO:1 前缀（始终放在最前）
    const autoPrefix = base.includes('|AUTO:1') ? '|AUTO:1' : '';
    const stripped = (base.includes(marker)
      ? base.slice(0, base.indexOf(marker))
      : base
    ).replace(/\|AUTO:1/g, '');
    return autoPrefix + stripped + marker + JSON.stringify(counts);
  };

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      // 解析月度计数
      const counts = parseMonthCounts(save.kpiRankingResult ?? '', monthKey);
      setMonthCounts(counts);
      setPageLoading(true);
      getGoverningAreas(save.id).then(async list => {
        const needReinit = list.length === 0 || (list.length > 0 && list[0].areaType !== currentTier);
        if (needReinit) {
          const generated = generateAreas(rankLevel, save.cityName);
          await initGoverningAreas(save.id, save.userId, generated);
          const fresh = await getGoverningAreas(save.id);
          setAreas(fresh);
        } else {
          setAreas(list);
        }
        setPageLoading(false);
      });
    }, [save, rankLevel, currentTier, monthKey])
  );

  const handleInvest = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    if (cooldownLeft(area.lastInvestedDay, gameDays) > 0) { showFeedback(`投资冷却中，请等待${cooldownLeft(area.lastInvestedDay, gameDays)}天`, false); return; }
    // 月度次数限制
    const curCounts = parseMonthCounts(save.kpiRankingResult ?? '', monthKey);
    if (curCounts.invest >= MONTHLY_LIMIT) { showFeedback(`本月投资次数已达上限（${MONTHLY_LIMIT}次），下月可继续`, false); return; }
    if (save.meritPoints < 20) { showFeedback('政绩值不足（需20）', false); return; }
    setActionLoading(areaId);
    await investArea(areaId, 8);
    const newCounts = { ...curCounts, invest: curCounts.invest + 1 };
    await updateGameSave({
      meritPoints: save.meritPoints - 20,
      kpiRankingResult: buildAreaCntStr(save.kpiRankingResult ?? '', newCounts),
    });
    setMonthCounts(newCounts);
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
    const msg = `✓ 向${area.areaName}拨款，发展指数+8（本月已投资${newCounts.invest}/${MONTHLY_LIMIT}次）`;
    void saveResult('govArea_invest_' + areaId, { ok: true, desc: msg, day: save.gameDays ?? 0 });
    showFeedback(msg, true);
  };

  const handleVisit = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    if (cooldownLeft(area.lastVisitedDay, gameDays) > 0) { showFeedback(`走访冷却中，请等待${cooldownLeft(area.lastVisitedDay, gameDays)}天`, false); return; }
    // 月度次数限制
    const curCounts = parseMonthCounts(save.kpiRankingResult ?? '', monthKey);
    if (curCounts.visit >= MONTHLY_LIMIT) { showFeedback(`本月走访次数已达上限（${MONTHLY_LIMIT}次），下月可继续`, false); return; }
    setActionLoading(areaId);
    await visitArea(areaId, gameDays, 12);
    const newCounts = { ...curCounts, visit: curCounts.visit + 1 };
    await updateGameSave({
      meritPoints: save.meritPoints + 8,
      kpiRankingResult: buildAreaCntStr(save.kpiRankingResult ?? '', newCounts),
    });
    setMonthCounts(newCounts);
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
    const msg = `✓ 走访${area.areaName}完成，好感+12，获8政绩（本月已走访${newCounts.visit}/${MONTHLY_LIMIT}次）`;
    void saveResult('govArea_visit_' + areaId, { ok: true, desc: msg, day: save.gameDays ?? 0 });
    showFeedback(msg, true);
  };

  const handleInspect = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    const foundIssue = Math.random() < 0.5;
    setActionLoading(areaId);
    let msg: string;
    if (foundIssue) {
      // 视察发现问题：发展指数略降但政绩+好感大增
      await investArea(areaId, -3);
      await updateGameSave({ meritPoints: save.meritPoints + 15, bossFavor: Math.min(100, (save.bossFavor ?? 50) + 3) });
      msg = `⚠️ 在${area?.areaName ?? '辖区'}发现违规问题，启动整改，政绩+15，上司好感+3`;
      void saveResult('govArea_inspect_' + areaId, { ok: true, desc: msg, day: save.gameDays ?? 0 });
      showFeedback(msg, true);
    } else {
      await updateGameSave({ meritPoints: save.meritPoints + 5 });
      msg = `✓ ${area?.areaName ?? '辖区'}工作正常有序，获5政绩`;
      void saveResult('govArea_inspect_' + areaId, { ok: true, desc: msg, day: save.gameDays ?? 0 });
      showFeedback(msg, true);
    }
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
  };

  /** 精准帮扶（落后辖区）/ 特色发展 */
  const handleSpecial = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const isLagging = area.devIndex < 40;
    const cost = isLagging ? 30 : 25;
    if (save.meritPoints < cost) { showFeedback(`政绩不足（需${cost}）`, false); return; }
    setActionLoading(areaId);
    let msg: string;
    if (isLagging) {
      await investArea(areaId, 15);
      await updateGameSave({ meritPoints: save.meritPoints - cost });
      msg = `✓ 精准帮扶${area.areaName}，发展指数+15`;
      void saveResult('govArea_special_' + areaId, { ok: true, desc: msg, day: save.gameDays ?? 0 });
      showFeedback(msg, true);
    } else {
      await visitArea(areaId, gameDays, 15);
      await updateGameSave({ meritPoints: save.meritPoints - cost });
      msg = `✓ ${area.areaName}特色发展启动，好感+15`;
      void saveResult('govArea_special_' + areaId, { ok: true, desc: msg, day: save.gameDays ?? 0 });
      showFeedback(msg, true);
    }
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
  };

  // 全区普查（消耗50政绩，全辖区发展+3，好感+5）
  const handleSurvey = async () => {
    if (!save) return;
    if (save.meritPoints < 50) { showFeedback('全区普查需50政绩（当前不足）', false); return; }
    setSurveying(true);
    // 并行处理所有辖区，减少等待时间
    await Promise.all(areas.flatMap(area => [
      investArea(area.id, 3),
      visitArea(area.id, gameDays, 5),
    ]));
    await updateGameSave({ meritPoints: save.meritPoints - 50 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setSurveying(false);
    showFeedback(`✓ 全区普查完成，全辖区发展+3，好感+5，消耗50政绩`, true);
  };

  // 汇总统计
  const avgDevIndex = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.devIndex, 0) / areas.length) : 0;
  const avgFavor = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.favorIndex, 0) / areas.length) : 0;
  const advancedCount = areas.filter(a => a.devIndex >= 80).length;
  const laggingCount = areas.filter(a => a.devIndex < 40).length;

  const rankedAreas = [...areas].sort((a, b) => b.devIndex - a.devIndex);
  const displayAreas = sortMode === 'lagging'
    ? [...areas].sort((a, b) => a.devIndex - b.devIndex)
    : rankedAreas;

  const tierDesc: Record<GoverningArea['areaType'], string> = {
    village: '村级管理：深入基层，走访群众，推动乡村振兴。',
    town: '乡镇管理：统筹乡镇发展，协调各村工作，推进项目落地。',
    district: '区县管理：推动城乡统筹，优化产业布局，提升整体竞争力。',
    city_level: '地级市管理：全面统筹辖区经济社会发展，做大做强城市影响力。',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>GOVERNING AREAS</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>管辖区域</Text>
          </View>
          <Pressable
            onPress={() => void handleSurvey()}
            disabled={surveying}
            style={{ borderWidth: 1, borderColor: '#a0b4cc', paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ color: '#a0b4cc', fontSize: 11, fontWeight: '700' }}>
              {surveying ? '普查中...' : '全区普查-50政'}
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: '#a0b4cc', fontSize: 10 }}>
          {save?.rankName} · {save?.cityName} · {AREA_TYPE_LABEL[currentTier]} · 政绩余额 {save?.meritPoints ?? 0}
        </Text>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {pageLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D2D44" />
          <Text style={{ color: '#888', marginTop: 12, fontSize: 13 }}>加载辖区数据...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

          {/* 汇总面板 */}
          <View style={{ backgroundColor: '#1D2D44', padding: 14 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>辖区汇总</Text>
            <View style={{ flexDirection: 'row', gap: 0 }}>
              {[
                { label: '平均发展指数', value: avgDevIndex, color: avgDevIndex >= 60 ? '#81c784' : '#ef9a9a' },
                { label: '平均群众好感', value: avgFavor, color: '#90caf9' },
                { label: '辖区总数', value: areas.length, color: '#fff' },
              ].map((item, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: item.color, fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                  <Text style={{ fontSize: 9, color: '#a0b4cc', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(42,122,59,0.25)', padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#81c784', fontSize: 16, fontWeight: '700' }}>{advancedCount}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>先进辖区(≥80)</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(200,40,41,0.25)', padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#ef9a9a', fontSize: 16, fontWeight: '700' }}>{laggingCount}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>落后辖区(&lt;40)</Text>
              </View>
              <Pressable
                onPress={() => setSortMode(m => m === 'rank' ? 'lagging' : 'rank')}
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {sortMode === 'rank' ? '📉 看落后' : '📈 看排行'}
                </Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>切换排序</Text>
              </Pressable>
            </View>
          </View>

          {/* 多区域发展指数对比折线图（可折叠）*/}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Pressable
              onPress={() => setShowCompareChart(v => !v)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2 }}>📈 全辖区趋势对比</Text>
                {areas.filter(a => a.devHistory.length >= 2).length > 0 && (
                  <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, color: '#2B4B6F' }}>{areas.filter(a => a.devHistory.length >= 2).length}区有数据</Text>
                  </View>
                )}
              </View>
              <Text style={{ color: '#2B4B6F', fontSize: 13 }}>{showCompareChart ? '▲' : '▼'}</Text>
            </Pressable>
            {showCompareChart && (
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 9, color: '#999', marginBottom: 4 }}>
                  各辖区发展指数历史趋势叠加（≥12个月时以年均值显示）
                </Text>
                <MultiAreaCompareChart areas={areas} />
              </View>
            )}
          </View>

          {/* 排行榜（前3）*/}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>发展排行榜 TOP 3</Text>
            {rankedAreas.slice(0, 3).map((area, i) => {
              const devLevel = getDevLevelLabel(area.devIndex);
              const medalColors = ['#C82829', '#7a5c2a', '#2B4B6F'];
              return (
                <View key={area.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#F0EEEA' }}>
                  <View style={{ width: 24, height: 24, backgroundColor: medalColors[i], alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: '#222', fontWeight: '600' }}>{area.areaName}</Text>
                  <View style={{ backgroundColor: devLevel.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{devLevel.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: devLevel.bg, fontVariant: ['tabular-nums'], minWidth: 30, textAlign: 'right' }}>
                    {area.devIndex}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 辖区描述 */}
          <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
            <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 18 }}>
              {tierDesc[currentTier]}共{areas.length}个{AREA_TYPE_LABEL[currentTier]}。
              投资/走访每月各限{MONTHLY_LIMIT}次（30天单区冷却），视察随机触发整改，精准帮扶可加速落后辖区发展。本月已投资 {monthCounts.invest}/{MONTHLY_LIMIT} 次，走访 {monthCounts.visit}/{MONTHLY_LIMIT} 次。
            </Text>
          </View>

          {/* 辖区列表 */}
          {displayAreas.map((area, idx) => {
            // 找该辖区最近一次操作结果（invest/visit/inspect/special 取最新day的那条）
            const keys = ['govArea_invest_', 'govArea_visit_', 'govArea_inspect_', 'govArea_special_'].map(p => getResult(p + area.id));
            const latest = keys.filter(Boolean).reduce<{ desc: string; day: number } | null>((best, r) => {
              if (!r) return best;
              return (!best || r.day > best.day) ? { desc: r.desc, day: r.day } : best;
            }, null);
            return (
              <AreaCard
                key={area.id}
                area={area}
                rank={sortMode === 'rank' ? idx + 1 : rankedAreas.findIndex(a => a.id === area.id) + 1}
                gameDays={gameDays}
                onInvest={handleInvest}
                onVisit={handleVisit}
                onInspect={handleInspect}
                onSpecial={handleSpecial}
                loading={actionLoading}
                lastActionResult={latest}
              />
            );
          })}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
