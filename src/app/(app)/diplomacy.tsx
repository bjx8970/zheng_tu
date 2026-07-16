/**
 * 外交/援助系统页面
 * 解锁条件：rank >= 6（副处级）
 * 三大板块：对口支援 / 省际合作 / 涉外事务
 * 完成任务后给予 diplomacyPoints 和 meritPoints 晋升加成
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';

// ── 色彩系统 ─────────────────────────────────────────────────────────────────
const C = {
  bg: '#F4F6FA', card: '#FFFFFF', border: '#E2E8F0', label: '#1A2744',
  sub: '#64748B', green: '#16A34A', greenLight: '#DCFCE7', greenMid: '#86EFAC',
  blue: '#1D4ED8', blueLight: '#DBEAFE', blueMid: '#93C5FD',
  gold: '#B45309', goldLight: '#FEF3C7', goldMid: '#FCD34D',
  red: '#DC2626', redLight: '#FEE2E2',
  indigo: '#4338CA', indigoLight: '#E0E7FF',
  locked: '#94A3B8',
};

// ── 对口支援任务 ──────────────────────────────────────────────────────────────
interface SupportTask {
  key: string; title: string; region: string; type: string;
  desc: string; duration: number; meritReward: number; diplomacyReward: number;
  minRank: number; icon: string;
}
const SUPPORT_TASKS: SupportTask[] = [
  { key: 'poverty_relief', title: '脱贫攻坚对口帮扶', region: '贵州黔东南', type: '贫困地区', desc: '选派挂职干部赴黔东南州开展精准帮扶工作，推动产业脱贫，提升当地GDP。', duration: 180, meritReward: 80, diplomacyReward: 30, minRank: 6, icon: '🏡' },
  { key: 'disaster_relief', title: '受灾地区灾后重建', region: '云南震区', type: '受灾地区', desc: '紧急派驻工作组赴受灾地区协调灾后重建，保障民生基本供给。', duration: 120, meritReward: 100, diplomacyReward: 25, minRank: 6, icon: '🏗️' },
  { key: 'rural_revitalize', title: '乡村振兴对口协作', region: '甘肃定西', type: '欠发展地区', desc: '协调农业产业资金与技术援助，助力定西实现乡村振兴目标。', duration: 150, meritReward: 70, diplomacyReward: 20, minRank: 7, icon: '🌾' },
  { key: 'tibet_support', title: '援藏援疆挂职轮换', region: '西藏拉萨', type: '边疆地区', desc: '参与中央援藏计划，担任挂职副市长，推动社会稳定发展。', duration: 365, meritReward: 200, diplomacyReward: 60, minRank: 8, icon: '🏔️' },
];

// ── 省际合作协议 ──────────────────────────────────────────────────────────────
interface CoopAgreement {
  key: string; title: string; partner: string; desc: string;
  gdpBonus: number; meritReward: number; diplomacyReward: number; minRank: number; icon: string;
}
const COOP_AGREEMENTS: CoopAgreement[] = [
  { key: 'yangtze_belt', title: '长三角一体化协作', partner: '沪苏浙', desc: '签署长三角区域一体化合作协议，推动产业链协同，吸引沪资落地。', gdpBonus: 5, meritReward: 60, diplomacyReward: 20, minRank: 6, icon: '🤝' },
  { key: 'bay_area', title: '粤港澳产业互补协议', partner: '广东/深圳', desc: '与深圳开发区签署产业转移协议，引进先进制造业项目，提升本地就业。', gdpBonus: 8, meritReward: 80, diplomacyReward: 25, minRank: 7, icon: '🏭' },
  { key: 'jing_jin_ji', title: '京津冀协同发展合作', partner: '北京/天津', desc: '纳入京津冀协同发展框架，承接北京非首都功能疏解，获国家政策支持。', gdpBonus: 10, meritReward: 100, diplomacyReward: 35, minRank: 8, icon: '🏙️' },
  { key: 'chengdu_chongqing', title: '成渝双城经济圈', partner: '四川/重庆', desc: '加入成渝双城经济圈建设，推动西部陆海新通道项目落地。', gdpBonus: 7, meritReward: 75, diplomacyReward: 28, minRank: 7, icon: '🚄' },
];

// ── 涉外事务 ──────────────────────────────────────────────────────────────────
interface ForeignAffair {
  key: string; title: string; partner: string; desc: string;
  meritReward: number; diplomacyReward: number; minRank: number; icon: string;
}
const FOREIGN_AFFAIRS: ForeignAffair[] = [
  { key: 'foreign_invest', title: '外资引进谈判', partner: '德国巴伐利亚州', desc: '接待德方招商代表团，推动汽车零部件制造合资项目落地，外资引进5亿美元。', meritReward: 90, diplomacyReward: 40, minRank: 7, icon: '🌍' },
  { key: 'friendly_city', title: '友好城市缔结', partner: '日本横滨市', desc: '与横滨市签署友好城市协议，开展文化教育交流，提升城市国际形象。', meritReward: 50, diplomacyReward: 30, minRank: 6, icon: '🏛️' },
  { key: 'forum_attend', title: '博鳌亚洲论坛出席', partner: '多国代表团', desc: '代表省委出席博鳌亚洲论坛，发表省域经济发展成果演讲，获央媒报道。', meritReward: 120, diplomacyReward: 50, minRank: 8, icon: '🎤' },
  { key: 'belt_road', title: '一带一路产能合作', partner: '哈萨克斯坦', desc: '参与一带一路产能合作框架谈判，签署基础设施共建协议，扩大对外影响力。', meritReward: 150, diplomacyReward: 60, minRank: 9, icon: '🛤️' },
];

// ── 冷却天数配置 ──────────────────────────────────────────────────────────────
const COOLDOWN_DAYS: Record<string, number> = {
  support: 90, coop: 120, foreign: 60,
};

type TabKey = 'support' | 'coop' | 'foreign';

export default function DiplomacyScreen() {
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [tab, setTab] = useState<TabKey>('support');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);

  if (!save) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}><ActivityIndicator testID="activity-indicator" color={C.blue} /></View>;

  const rank = save.rankLevel;
  const isLocked = rank < 6;
  const diplomacy = save.diplomacyPoints;
  const gameDays = save.gameDays;

  // 冷却判断：key = 任务key，cooldownDays 按类型
  function isCooldown(key: string, days: number) {
    const last = (save?.careerPathCooldowns ?? {})[`dip_${key}`] ?? 0;
    return last + days > gameDays;
  }
  function coolLeft(key: string, days: number) {
    const last = (save?.careerPathCooldowns ?? {})[`dip_${key}`] ?? 0;
    return Math.max(0, last + days - gameDays);
  }

  async function markCooldown(key: string, extraUpdates: Parameters<typeof updateGameSave>[0] = {}) {
    if (!save) return;
    const next = { ...(save.careerPathCooldowns ?? {}), [`dip_${key}`]: gameDays };
    await updateGameSave({ ...extraUpdates, careerPathCooldowns: next });
  }

  function showMsg(text: string, type: 'success' | 'warn' | 'error') {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3500);
  }

  // ── 对口支援 ──────────────────────────────────────────────────────────────
  async function handleSupport(task: SupportTask) {
    if (!save) return;
    if (rank < task.minRank) { showMsg(`需要达到职级 ${task.minRank} 方可申请此支援任务`, 'warn'); return; }
    if (isCooldown(task.key, COOLDOWN_DAYS.support)) { showMsg(`此任务冷却中，还需 ${coolLeft(task.key, COOLDOWN_DAYS.support)} 天`, 'warn'); return; }
    setLoading(true);
    await markCooldown(task.key, {
      meritPoints: save.meritPoints + task.meritReward,
      diplomacyPoints: diplomacy + task.diplomacyReward,
      isDiplomacyActive: true,
    });
    const _dm1 = `✅ ${task.title}已启动！政绩 +${task.meritReward}，外交积分 +${task.diplomacyReward}`;
    void saveResult('diplomacy_task_' + task.key, { ok: true, desc: _dm1, day: save.gameDays ?? 0 });
    showMsg(_dm1, 'success');
    setLoading(false);
  }

  // ── 省际合作 ──────────────────────────────────────────────────────────────
  async function handleCoop(ag: CoopAgreement) {
    if (!save) return;
    if (rank < ag.minRank) { showMsg(`需要达到职级 ${ag.minRank} 方可签署此协议`, 'warn'); return; }
    if (isCooldown(ag.key, COOLDOWN_DAYS.coop)) { showMsg(`此协议冷却中，还需 ${coolLeft(ag.key, COOLDOWN_DAYS.coop)} 天`, 'warn'); return; }
    setLoading(true);
    const gdpIncrease = Math.round(save.cityGdp * ag.gdpBonus / 100);
    await markCooldown(ag.key, {
      cityGdp: save.cityGdp + gdpIncrease,
      meritPoints: save.meritPoints + ag.meritReward,
      diplomacyPoints: diplomacy + ag.diplomacyReward,
    });
    const _dm2 = `✅ 《${ag.title}》已签署！GDP +${gdpIncrease}万，政绩 +${ag.meritReward}，外交积分 +${ag.diplomacyReward}`;
    void saveResult('diplomacy_agree_' + ag.key, { ok: true, desc: _dm2, day: save.gameDays ?? 0 });
    showMsg(_dm2, 'success');
    setLoading(false);
  }

  // ── 涉外事务 ──────────────────────────────────────────────────────────────
  async function handleForeign(affair: ForeignAffair) {
    if (!save) return;
    if (rank < affair.minRank) { showMsg(`需要达到职级 ${affair.minRank} 方可参与此涉外事务`, 'warn'); return; }
    if (isCooldown(affair.key, COOLDOWN_DAYS.foreign)) { showMsg(`此事务冷却中，还需 ${coolLeft(affair.key, COOLDOWN_DAYS.foreign)} 天`, 'warn'); return; }
    setLoading(true);
    await markCooldown(affair.key, {
      meritPoints: save.meritPoints + affair.meritReward,
      diplomacyPoints: diplomacy + affair.diplomacyReward,
      cityBusiness: Math.min(100, save.cityBusiness + 3),
    });
    const _dm3 = `✅ ${affair.title}完成！政绩 +${affair.meritReward}，外交积分 +${affair.diplomacyReward}，营商环境 +3`;
    void saveResult('diplomacy_affair_' + affair.key, { ok: true, desc: _dm3, day: save.gameDays ?? 0 });
    showMsg(_dm3, 'success');
    setLoading(false);
  }

  const TABS: { key: TabKey; label: string; icon: string }[] = [
    { key: 'support', label: '对口支援', icon: '🏡' },
    { key: 'coop',    label: '省际合作', icon: '🤝' },
    { key: 'foreign', label: '涉外事务', icon: '🌍' },
  ];

  const msgColor: Record<string, string> = { success: C.green, warn: C.gold, error: C.red };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>

        {/* 标题 */}
        <View style={{ backgroundColor: C.indigo, borderRadius: 14, padding: 18, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <Text style={{ fontSize: 28 }}>🌐</Text>
            <View>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>外交 / 援助系统</Text>
              <Text style={{ fontSize: 12, color: '#C7D2FE', marginTop: 2 }}>对口支援 · 省际合作 · 涉外事务</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{diplomacy}</Text>
              <Text style={{ fontSize: 11, color: '#C7D2FE' }}>外交积分</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#818CF8' }} />
            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#FFFFFF' }}>{rank}</Text>
              <Text style={{ fontSize: 11, color: '#C7D2FE' }}>当前职级</Text>
            </View>
            {diplomacy >= 50 && (
              <>
                <View style={{ width: 1, backgroundColor: '#818CF8' }} />
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 22, fontWeight: '900', color: '#FCD34D' }}>+{Math.floor(diplomacy / 50)}</Text>
                  <Text style={{ fontSize: 11, color: '#C7D2FE' }}>晋升加成档</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* 解锁提示 */}
        {isLocked && (
          <View style={{ backgroundColor: C.redLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FCA5A5', flexDirection: 'row', gap: 8, alignItems: 'center', borderCurve: 'continuous' }}>
            <Text style={{ fontSize: 20 }}>🔒</Text>
            <Text style={{ fontSize: 13, color: C.red, fontWeight: '600', flex: 1 }}>外交系统需达到副处级（职级6）后解锁。当前职级：{rank}</Text>
          </View>
        )}

        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: `${msgColor[msg.type]}15`, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: `${msgColor[msg.type]}50`, borderCurve: 'continuous' }}>
            <Text style={{ fontSize: 13, color: msgColor[msg.type], fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* Tab 选择 */}
        <View style={{ flexDirection: 'row', backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border, borderCurve: 'continuous' }}>
          {TABS.map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center',
                backgroundColor: tab === t.key ? C.indigo : 'transparent' }}>
              <Text style={{ fontSize: 11, fontWeight: tab === t.key ? '800' : '500',
                color: tab === t.key ? '#FFFFFF' : C.sub }}>{t.icon} {t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* 对口支援列表 */}
        {tab === 'support' && SUPPORT_TASKS.map(task => {
          const cool = isCooldown(task.key, COOLDOWN_DAYS.support);
          const locked = rank < task.minRank;
          const isDone = !!getResult('diplomacy_task_' + task.key);
          return (
            <View key={task.key} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isDone ? C.greenMid : C.border, borderCurve: 'continuous' }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>{task.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.label }}>{task.title}</Text>
                    {isDone && <Text style={{ fontSize: 11, color: C.green, fontWeight: '700' }}>✓ 已派驻</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <View style={{ backgroundColor: C.indigoLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: C.indigo, fontWeight: '700' }}>{task.region}</Text>
                    </View>
                    <View style={{ backgroundColor: C.greenLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: C.green, fontWeight: '700' }}>{task.type}</Text>
                    </View>
                    {locked && (
                      <View style={{ backgroundColor: C.redLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, color: C.red, fontWeight: '700' }}>需职级{task.minRank}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18 }}>{task.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 11, color: C.sub }}>政绩 <Text style={{ color: C.green, fontWeight: '700' }}>+{task.meritReward}</Text></Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>外交 <Text style={{ color: C.indigo, fontWeight: '700' }}>+{task.diplomacyReward}</Text></Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>时长 <Text style={{ color: C.label, fontWeight: '600' }}>{task.duration}天</Text></Text>
                </View>
                <Pressable onPress={() => !loading && !isLocked && !locked && !cool && !isDone && handleSupport(task)}
                  style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderCurve: 'continuous',
                    backgroundColor: isLocked || locked || isDone ? C.border : cool ? C.goldLight : C.green,
                    opacity: loading ? 0.7 : 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700',
                    color: isLocked || locked || isDone ? C.locked : cool ? C.gold : '#FFFFFF' }}>
                    {isDone ? '已派驻' : cool ? `${coolLeft(task.key, COOLDOWN_DAYS.support)}天后` : '立即派驻'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* 省际合作列表 */}
        {tab === 'coop' && COOP_AGREEMENTS.map(ag => {
          const cool = isCooldown(ag.key, COOLDOWN_DAYS.coop);
          const locked = rank < ag.minRank;
          const isDone = !!getResult('diplomacy_agree_' + ag.key);
          return (
            <View key={ag.key} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isDone ? C.blueMid : C.border, borderCurve: 'continuous' }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>{ag.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.label }}>{ag.title}</Text>
                    {isDone && <Text style={{ fontSize: 11, color: C.blue, fontWeight: '700' }}>✓ 已签署</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <View style={{ backgroundColor: C.blueLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: C.blue, fontWeight: '700' }}>{ag.partner}</Text>
                    </View>
                    {locked && (
                      <View style={{ backgroundColor: C.redLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, color: C.red, fontWeight: '700' }}>需职级{ag.minRank}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18 }}>{ag.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 11, color: C.sub }}>GDP <Text style={{ color: C.blue, fontWeight: '700' }}>+{ag.gdpBonus}%</Text></Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>政绩 <Text style={{ color: C.green, fontWeight: '700' }}>+{ag.meritReward}</Text></Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>外交 <Text style={{ color: C.indigo, fontWeight: '700' }}>+{ag.diplomacyReward}</Text></Text>
                </View>
                <Pressable onPress={() => !loading && !isLocked && !locked && !cool && !isDone && handleCoop(ag)}
                  style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderCurve: 'continuous',
                    backgroundColor: isLocked || locked || isDone ? C.border : cool ? C.goldLight : C.blue,
                    opacity: loading ? 0.7 : 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700',
                    color: isLocked || locked || isDone ? C.locked : cool ? C.gold : '#FFFFFF' }}>
                    {isDone ? '已签署' : cool ? `${coolLeft(ag.key, COOLDOWN_DAYS.coop)}天后` : '签署协议'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* 涉外事务列表 */}
        {tab === 'foreign' && FOREIGN_AFFAIRS.map(affair => {
          const cool = isCooldown(affair.key, COOLDOWN_DAYS.foreign);
          const locked = rank < affair.minRank;
          const isDone = !!getResult('diplomacy_affair_' + affair.key);
          return (
            <View key={affair.key} style={{ backgroundColor: C.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: isDone ? C.goldMid : C.border, borderCurve: 'continuous' }}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                <Text style={{ fontSize: 28 }}>{affair.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.label }}>{affair.title}</Text>
                    {isDone && <Text style={{ fontSize: 11, color: C.gold, fontWeight: '700' }}>✓ 已完成</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                    <View style={{ backgroundColor: C.goldLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                      <Text style={{ fontSize: 10, color: C.gold, fontWeight: '700' }}>{affair.partner}</Text>
                    </View>
                    {locked && (
                      <View style={{ backgroundColor: C.redLight, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                        <Text style={{ fontSize: 10, color: C.red, fontWeight: '700' }}>需职级{affair.minRank}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: C.sub, lineHeight: 18 }}>{affair.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <Text style={{ fontSize: 11, color: C.sub }}>政绩 <Text style={{ color: C.green, fontWeight: '700' }}>+{affair.meritReward}</Text></Text>
                  <Text style={{ fontSize: 11, color: C.sub }}>外交 <Text style={{ color: C.indigo, fontWeight: '700' }}>+{affair.diplomacyReward}</Text></Text>
                </View>
                <Pressable onPress={() => !loading && !isLocked && !locked && !cool && !isDone && handleForeign(affair)}
                  style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8, borderCurve: 'continuous',
                    backgroundColor: isLocked || locked || isDone ? C.border : cool ? C.goldLight : C.gold,
                    opacity: loading ? 0.7 : 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700',
                    color: isLocked || locked || isDone ? C.locked : cool ? C.gold : '#FFFFFF' }}>
                    {isDone ? '已完成' : cool ? `${coolLeft(affair.key, COOLDOWN_DAYS.foreign)}天后` : '立即参与'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        {/* 外交积分说明 */}
        <View style={{ backgroundColor: C.indigoLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#A5B4FC', borderCurve: 'continuous' }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.indigo, marginBottom: 6 }}>📊 外交积分与晋升加成</Text>
          {[
            '每积累50点外交积分，可获得1档晋升加成（晋升时政绩考核+10）',
            '对口支援任务可激活「挂职干部」标签，提升晋升竞争力',
            '涉外事务可提升营商环境指数，吸引更多外资落地',
            '省际合作协议生效后持续贡献GDP增长，无需额外操作',
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <Text style={{ fontSize: 11, color: C.indigo }}>·</Text>
              <Text style={{ fontSize: 11, color: C.indigo, flex: 1 }}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
