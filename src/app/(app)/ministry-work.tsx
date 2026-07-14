// 部委日常工作台 — 中央线专属
import { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';
import { MINISTRY_POOL } from '@/types/game';

/* ─── 配色 ─── */
const C = {
  bg:         '#F2EFEA',
  headerBg:   '#1A2B3C',
  navy:       '#1A2B3C',
  blue:       '#1D3B5E',
  blueLight:  '#EDF3FA',
  gold:       '#C8A84B',
  cardBg:     '#FEFCF8',
  border:     '#D0DCE8',
  muted:      '#7A8A9A',
  red:        '#C82829',
  green:      '#2a7a3b',
  warn:       '#e67e22',
  divider:    '#E0D8CC',
};

/* ─── 工作类型定义 ─── */
interface WorkItem {
  key: string;
  icon: string;
  title: string;
  desc: string;
  detail: string;
  energyCost: number;
  meritGain: number;
  statKey: 'cityGdp' | 'cityLivelihood' | 'cityEcology' | 'cityBusiness';
  statGain: number;
  cooldownKey: string;
  cooldownDays: number;
  unlockRank: number;
}

// 部委焦点 → 工作侧重的四维KPI映射
const FOCUS_KPI_MAP: Record<string, WorkItem['statKey'][]> = {
  'GDP经济':  ['cityGdp', 'cityBusiness', 'cityEcology', 'cityLivelihood'],
  '民生保障': ['cityLivelihood', 'cityEcology', 'cityGdp', 'cityBusiness'],
  '生态文明': ['cityEcology', 'cityLivelihood', 'cityGdp', 'cityBusiness'],
  '营商环境': ['cityBusiness', 'cityGdp', 'cityLivelihood', 'cityEcology'],
  '社会治安': ['cityGdp', 'cityBusiness', 'cityLivelihood', 'cityEcology'],
  '外交事务': ['cityGdp', 'cityLivelihood', 'cityBusiness', 'cityEcology'],
  '国家安全': ['cityGdp', 'cityEcology', 'cityBusiness', 'cityLivelihood'],
};

const STAT_LABEL: Record<WorkItem['statKey'], string> = {
  cityGdp: '政策落实率',
  cityLivelihood: '审批效率',
  cityEcology: '法规建设',
  cityBusiness: '廉洁考评',
};

function buildWorkItems(focus: string): WorkItem[] {
  const keys = FOCUS_KPI_MAP[focus] ?? FOCUS_KPI_MAP['GDP经济'];
  return [
    {
      key: 'policy_draft',
      icon: '📜',
      title: '政策起草',
      desc: '主导起草部门重点政策文件，提升政策落实指数',
      detail: '耗时伏案研究，深度挖掘本部门职责范围内的政策痛点，形成一份具有参考价值的政策草案，经科长、处长逐级审阅后上报。',
      energyCost: 25,
      meritGain: 8,
      statKey: keys[0],
      statGain: 4,
      cooldownKey: 'policy_draft_day',
      cooldownDays: 30,
      unlockRank: 1,
    },
    {
      key: 'approval_work',
      icon: '✅',
      title: '行政审批',
      desc: '高效处理积压审批件，提升行政效能评分',
      detail: '整理当前待处理审批件，逐项核查材料完整性，按程序流转批示。高效率完成积压审批，有助于提升效能考核得分，也会让企业和群众留下良好印象。',
      energyCost: 20,
      meritGain: 5,
      statKey: keys[1],
      statGain: 5,
      cooldownKey: 'approval_work_day',
      cooldownDays: 14,
      unlockRank: 1,
    },
    {
      key: 'research_trip',
      icon: '🔍',
      title: '调研考察',
      desc: '赴基层或地方调研，掌握第一手材料',
      detail: '带队前往相关省份或企业单位开展实地调研，收集典型案例与数据，回部后形成调研报告。调研频次是衡量干部工作态度的重要指标，也有助于建立地方人脉。',
      energyCost: 30,
      meritGain: 10,
      statKey: keys[0],
      statGain: 3,
      cooldownKey: 'research_trip_day',
      cooldownDays: 60,
      unlockRank: 2,
    },
    {
      key: 'law_build',
      icon: '⚖️',
      title: '法规建设',
      desc: '参与部门规章修订，完善法规制度体系',
      detail: '牵头或参与部门规章、规范性文件的修订工作，与法制局对接，确保文件符合上位法要求。此项工作见效慢但影响深远，是衡量干部专业素养的重要方面。',
      energyCost: 35,
      meritGain: 12,
      statKey: keys[2],
      statGain: 6,
      cooldownKey: 'law_build_day',
      cooldownDays: 90,
      unlockRank: 3,
    },
    {
      key: 'clean_gov',
      icon: '🛡️',
      title: '廉政教育',
      desc: '组织廉政专题学习，强化廉洁从政意识',
      detail: '组织本处室（科室）人员参加廉政教育专题活动，学习近期典型案例，签署廉政承诺书，并向纪检监察部门提交廉政报告，有助于提升廉洁自律考评分。',
      energyCost: 15,
      meritGain: 4,
      statKey: keys[3],
      statGain: 6,
      cooldownKey: 'clean_gov_day',
      cooldownDays: 30,
      unlockRank: 1,
    },
    {
      key: 'inter_dept',
      icon: '🤝',
      title: '部际协调',
      desc: '与兄弟部门协商协作，推进跨部门议题',
      detail: '就当前推进中的重大议题，主动与相关部委对接，协调各方立场，推动形成一致意见。部际协调能力强的干部往往被视为"有担当、善于合作"，晋升评价中加分明显。',
      energyCost: 25,
      meritGain: 9,
      statKey: keys[1],
      statGain: 4,
      cooldownKey: 'inter_dept_day',
      cooldownDays: 30,
      unlockRank: 4,
    },
  ];
}

/* ─── 主组件 ─── */
export default function MinistryWorkScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, refreshSave } = useGame();

  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<{
    title: string;
    meritGain: number;
    statLabel: string;
    statGain: number;
    statNewVal: number;
    ok: boolean;
  } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  // 读取冷却状态存储（借用 save 的 sciTechLastActDay 等字段映射，用 JSON 存在 kpiRankingResult 里）
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新

  useFocusEffect(useCallback(() => {
    if (!save) return;
    // 从 save.kpiRankingResult 的第二个JSON段解析冷却（如果有）
    try {
      const raw = save.kpiRankingResult ?? '';
      const marker = '|MW_CD:';
      const idx = raw.indexOf(marker);
      if (idx >= 0) {
        const parsed = JSON.parse(raw.slice(idx + marker.length));
        setCooldowns(parsed as Record<string, number>);
      } else {
        setCooldowns({});
      }
    } catch {
      setCooldowns({});
    }
  }, [save?.id, save?.gameDays]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} color={C.blue} />;

  const ministryInfo = MINISTRY_POOL.find(m => m.name === save.ministryName) ?? MINISTRY_POOL[0];
  const workItems = buildWorkItems(ministryInfo.focus);

  const canDo = (item: WorkItem): { ok: boolean; reason: string } => {
    if (save.rankLevel < item.unlockRank) return { ok: false, reason: `需达到职级 ${item.unlockRank}` };
    const lastDay = cooldowns[item.cooldownKey] ?? 0;
    const remaining = item.cooldownDays - (save.gameDays - lastDay);
    if (remaining > 0) return { ok: false, reason: `冷却中（还需约${Math.ceil(remaining / 30)}个月）` };
    return { ok: true, reason: '' };
  };

  const handleWork = async (item: WorkItem) => {
    if (acting || !canDo(item).ok) return;
    setActing(true);
    setResult(null);

    const newCooldowns = { ...cooldowns, [item.cooldownKey]: save.gameDays };
    const raw = save.kpiRankingResult ?? '';
    const marker = '|MW_CD:';
    const autoPrefix = raw.includes('|AUTO:1') ? '|AUTO:1' : '';
    const stripped = raw.replace(/\|AUTO:1/g, '');
    const baseStr = stripped.includes(marker) ? stripped.slice(0, stripped.indexOf(marker)) : stripped;
    const newRankingResult = autoPrefix + baseStr + marker + JSON.stringify(newCooldowns);

    const currentVal = save[item.statKey] as number;
    const newVal = Math.min(100, currentVal + item.statGain);

    try {
      const updated = await updateSave(save.id, {
        meritPoints: save.meritPoints + item.meritGain,
        [item.statKey]: newVal,
        kpiRankingResult: newRankingResult,
      });

      if (updated) {
        setCooldowns(newCooldowns);
        await refreshSave();
        setResult({
          title: `✅ ${item.title}完成`,
          meritGain: item.meritGain,
          statLabel: STAT_LABEL[item.statKey],
          statGain: item.statGain,
          statNewVal: newVal,
          ok: true,
        });
      } else {
        setResult({ title: '操作失败', meritGain: 0, statLabel: '', statGain: 0, statNewVal: 0, ok: false });
      }
    } catch {
      setResult({ title: '操作失败', meritGain: 0, statLabel: '', statGain: 0, statNewVal: 0, ok: false });
    } finally {
      setActing(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.headerBg} />
      {/* 顶栏 */}
      <View style={{ backgroundColor: C.headerBg, paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12 }}>
        <View style={{ height: 2, backgroundColor: C.gold, marginBottom: 10 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} android_ripple={{ color: 'rgba(255,255,255,0.15)', borderless: true, radius: 20 }}>
            <Text style={{ color: C.gold, fontSize: 18, fontWeight: '700' }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(200,168,75,0.7)', fontSize: 9, letterSpacing: 3 }}>联邦内阁 · 部委机关</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginTop: 1 }}>
              {ministryInfo.emoji} {save.ministryName} — 日常工作
            </Text>
          </View>
          <View style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: 'rgba(200,168,75,0.3)' }}>
            <Text style={{ color: C.gold, fontSize: 10, fontWeight: '700' }}>科员</Text>
          </View>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
        <View style={{ padding: 14, gap: 12 }}>

          {/* 说明横幅 */}
          <View style={{ backgroundColor: C.blueLight, borderWidth: 1, borderColor: C.blue, padding: 12, flexDirection: 'row', gap: 8 }}>
            <Text style={{ fontSize: 14 }}>🏛️</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: C.blue }}>部委日常工作</Text>
              <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 17 }}>
                通过完成各类部委工作，积累政绩、提升考核指标，为晋升副处、正处等职级打好基础。
                每项常规工作每月（30天）只能执行一次；行政审批14天冷却，调研考察、法规建设属特殊工作，冷却期更长，合理规划以最大化政绩产出。
              </Text>
            </View>
          </View>

          {/* 当前指标概览 */}
          <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.border, padding: 14 }}>
            <Text style={{ fontSize: 10, color: C.blue, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>📊 部委考核指标概览</Text>
            {([
              { label: '政策落实率', value: save.cityGdp },
              { label: '审批处理效率', value: save.cityLivelihood },
              { label: '法规建设水平', value: save.cityEcology },
              { label: '廉洁自律考评', value: save.cityBusiness },
            ] as { label: string; value: number }[]).map(kpi => {
              const color = kpi.value >= 70 ? C.green : kpi.value >= 40 ? C.warn : C.red;
              return (
                <View key={kpi.label} style={{ marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 11, color: C.navy }}>{kpi.label}</Text>
                    <Text style={{ fontSize: 11, color, fontWeight: '700' }}>{kpi.value}</Text>
                  </View>
                  <View style={{ height: 4, backgroundColor: '#E8E4DC' }}>
                    <View style={{ height: 4, width: `${kpi.value}%`, backgroundColor: color }} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* 操作反馈 KPI 卡 */}
          {result && (
            <Pressable onPress={() => setResult(null)} style={{ backgroundColor: result.ok ? '#f0faf0' : '#fff0f0', borderWidth: 1, borderColor: result.ok ? C.green : C.red, padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: result.ok ? C.green : C.red }}>{result.title}</Text>
              {result.ok && (
                <View style={{ gap: 8 }}>
                  {/* 政绩变化 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 11, color: '#555', width: 56 }}>政绩</Text>
                    <View style={{ flex: 1, height: 6, backgroundColor: '#E0E0E0' }}>
                      <View style={{ height: 6, width: `${Math.min(100, result.meritGain * 5)}%`, backgroundColor: '#C82829' }} />
                    </View>
                    <View style={{ backgroundColor: '#C82829', paddingHorizontal: 8, paddingVertical: 2, minWidth: 48, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+{result.meritGain}</Text>
                    </View>
                  </View>
                  {/* 指标变化 */}
                  {result.statLabel !== '' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Text style={{ fontSize: 11, color: '#555', width: 56 }}>{result.statLabel}</Text>
                      <View style={{ flex: 1, height: 6, backgroundColor: '#E0E0E0' }}>
                        <View style={{ height: 6, width: `${Math.min(100, result.statNewVal)}%`, backgroundColor: '#2B4B6F' }} />
                      </View>
                      <View style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 8, paddingVertical: 2, minWidth: 48, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>+{result.statGain} → {result.statNewVal}</Text>
                      </View>
                    </View>
                  )}
                </View>
              )}
              <Text style={{ fontSize: 10, color: '#999', textAlign: 'right' }}>点击关闭</Text>
            </Pressable>
          )}

          {/* 工作列表 */}
          <Text style={{ fontSize: 10, color: C.muted, letterSpacing: 2, marginBottom: 2 }}>可选工作项目</Text>
          {workItems.map(item => {
            const { ok, reason } = canDo(item);
            const isExpanded = expanded === item.key;
            return (
              <View key={item.key} style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: ok ? C.border : '#E0E0E0', overflow: 'hidden' }}>
                {/* 卡头 */}
                <Pressable
                  onPress={() => setExpanded(isExpanded ? null : item.key)}
                  style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: ok ? C.cardBg : '#F8F8F8' }}
                  android_ripple={{ color: 'rgba(29,59,94,0.08)' }}
                >
                  <View style={{ width: 44, height: 44, backgroundColor: ok ? C.blueLight : '#F0F0F0', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: ok ? C.blue : '#DDD' }}>
                    <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: ok ? C.navy : '#AAA' }}>{item.title}</Text>
                      {!ok && (
                        <View style={{ backgroundColor: '#EEE', paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: '#999' }}>冷却</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 11, color: ok ? C.muted : '#BBB', marginTop: 2 }}>{item.desc}</Text>
                    {!ok && reason ? (
                      <Text style={{ fontSize: 10, color: C.warn, marginTop: 2 }}>⏳ {reason}</Text>
                    ) : (
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 10, color: C.blue }}>政绩 +{item.meritGain}</Text>
                        <Text style={{ fontSize: 10, color: C.green }}>{STAT_LABEL[item.statKey]} +{item.statGain}</Text>
                        <Text style={{ fontSize: 10, color: C.muted }}>耗能 {item.energyCost}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ color: C.muted, fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</Text>
                </Pressable>

                {/* 展开详情 */}
                {isExpanded && (
                  <View style={{ borderTopWidth: 1, borderTopColor: C.divider, padding: 14, gap: 12 }}>
                    <Text style={{ fontSize: 11, color: '#5A6A7A', lineHeight: 18 }}>{item.detail}</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <View style={{ flex: 1, backgroundColor: C.blueLight, padding: 10, gap: 3 }}>
                        <Text style={{ fontSize: 9, color: C.muted }}>政绩奖励</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: C.blue }}>+{item.meritGain}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#F0FAF0', padding: 10, gap: 3 }}>
                        <Text style={{ fontSize: 9, color: C.muted }}>{STAT_LABEL[item.statKey]}</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: C.green }}>+{item.statGain}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#FFF8EC', padding: 10, gap: 3 }}>
                        <Text style={{ fontSize: 9, color: C.muted }}>冷却期</Text>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: C.warn }}>{item.cooldownDays}天</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => void handleWork(item)}
                      disabled={acting || !ok}
                      style={{ backgroundColor: ok ? C.blue : '#CCC', padding: 14, alignItems: 'center' }}
                      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    >
                      {acting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                            {ok ? `📋 执行：${item.title}` : reason}
                          </Text>
                      }
                    </Pressable>
                  </View>
                )}
              </View>
            );
          })}

          {/* 底部提示 */}
          <View style={{ backgroundColor: C.cardBg, borderWidth: 1, borderColor: C.divider, padding: 12, gap: 6, marginBottom: 20 }}>
            <Text style={{ fontSize: 10, color: C.blue, fontWeight: '700', letterSpacing: 1 }}>💡 晋升提示</Text>
            <Text style={{ fontSize: 11, color: C.muted, lineHeight: 17 }}>
              部委线晋升路径：科员 → 副科 → 正科 → 副处 → 正处 → 副厅 → 正厅 → 副部 → 正部{'\n'}
              持续积累政绩、保持考核指标稳定，通过上司关系维护和年度考核，逐步实现晋升。
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
