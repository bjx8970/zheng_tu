// 传承系统 — 政治遗产、人脉传承、退休后继任规划
import { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { updateSave } from '@/db/gameApi';

const C = {
  bg: '#F5EFE8', header: '#4A2C0A', headerDark: '#2E1A04',
  gold: '#C9953A', goldLight: '#F5E9CC', goldBorder: '#D4A843',
  red: '#B91C1C', redLight: '#FEF2F2', redMid: '#FECACA',
  green: '#166534', greenLight: '#F0FDF4', greenMid: '#BBF7D0',
  blue: '#1E40AF', blueLight: '#EFF6FF', blueMid: '#BFDBFE',
  purple: '#6D28D9', purpleLight: '#F5F3FF', purpleBorder: '#DDD6FE',
  card: '#FDFAF5', border: '#D6CFBF', muted: '#7A7065', label: '#4A3F2F',
  navy: '#1A2B3C', divider: '#E0D9CD',
};

// ── 传承资产类型 ──────────────────────────────────
const INHERITANCE_ITEMS = [
  {
    key: 'political', icon: '🏛️', label: '政治遗产', unit: '点',
    desc: '历届任职积累的政治声望与人脉背书。传承给继承人后，可加快其晋升速度、提升起点',
    color: C.purple, bg: C.purpleLight, border: C.purpleBorder,
    inheritRatio: 0.5, // 可传承比例
    howToAccumulate: '每届任职优秀可+10，派系领袖加成+20/年，每完成一次出色施政+3',
  },
  {
    key: 'network', icon: '🤝', label: '人脉资产', unit: '点',
    desc: '覆盖各领域的人际关系网络。传承后继承人可直接继承50%的关键人脉，免去从头积累',
    color: C.blue, bg: C.blueLight, border: C.blueMid,
    inheritRatio: 0.5,
    howToAccumulate: '每次经营上司关系+5，派系关系≥80时每月+3，出访其他地区+8',
  },
];

// ── 继承人路径选项 ────────────────────────────────
const HEIR_PATHS = [
  { key: 'child', icon: '👶', label: '子女从政', desc: '培养子女走仕途，起点直接对应家庭背景加成', bonus: '子女起始职级+1，派系关系直接继承40%', requiresChildren: true },
  { key: 'protege', icon: '👔', label: '亲信接班', desc: '重点培养一名心腹下属，退休后辅佐其接班', bonus: '亲信能力值+20，继承人际关系网络60%', requiresChildren: false },
  { key: 'faction', icon: '🌐', label: '派系传承', desc: '将政治遗产捐给派系，提升派系整体实力', bonus: '派系积分+50，派系内所有成员实力+5%', requiresChildren: false },
];

// ── 传承积累行动 ──────────────────────────────────
const ACCUMULATE_ACTIONS = [
  { key: 'write_memoir', icon: '📖', label: '撰写政务回忆录', politicalGain: 8, networkGain: 3, cost: 0, cooldown: 60, desc: '记录施政心得，提升政治遗产+8，人脉+3' },
  { key: 'alumni_meet', icon: '🎓', label: '出席同僚联谊会', politicalGain: 3, networkGain: 10, cost: 30000, cooldown: 30, desc: '维系同僚网络，人脉+10，需花费3万' },
  { key: 'mentor_heir', icon: '🏫', label: '私下传授仕途经验', politicalGain: 5, networkGain: 5, cost: 0, cooldown: 45, desc: '将经验传授给继承人，双维度均+5' },
  { key: 'publish_policy', icon: '📜', label: '发表施政理念文章', politicalGain: 12, networkGain: 5, cost: 0, cooldown: 90, desc: '公开施政理念，大幅提升政治遗产+12' },
];

export default function InheritanceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, refreshSave } = useGame();
  const [loading, setLoading] = useState(false);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [selectedHeir, setSelectedHeir] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'warn' | 'error' } | null>(null);
  const [executed, setExecuted] = useState<string | null>(null); // 已执行的传承

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const politicalPts = save.inheritancePolitical;
  const networkPts   = save.inheritanceNetwork;
  const isRetired    = save.rankLevel === 0;
  const isLeader     = save.factionInternalRank === 'leader';

  // 冷却判断
  const isCool = (key: string, days: number) => (cooldowns[key] ?? 0) + days > save.gameDays;
  const coolLeft = (key: string, days: number) => Math.max(0, (cooldowns[key] ?? 0) + days - save.gameDays);
  const markCool = (key: string) => setCooldowns({ ...cooldowns, [key]: save.gameDays });

  async function handleAccumulate(action: typeof ACCUMULATE_ACTIONS[0]) {
    if (!save) return;
    if (isCool(action.key, action.cooldown)) return;
    if (action.cost > 0 && save.fundBalance < action.cost) {
      setMsg({ text: '资金不足，无法执行此行动', type: 'error' }); return;
    }
    setLoading(true);
    const newPolitical = Math.min(999, politicalPts + action.politicalGain);
    const newNetwork   = Math.min(999, networkPts   + action.networkGain);
    const updates: Record<string, unknown> = { inheritancePolitical: newPolitical, inheritanceNetwork: newNetwork };
    if (action.cost > 0) updates.fundBalance = save.fundBalance - action.cost;
    try {
      await updateSave(save.id, updates as Parameters<typeof updateSave>[1]);
      await refreshSave();
      markCool(action.key);
      setMsg({ text: `${action.label}完成！政治遗产+${action.politicalGain}，人脉+${action.networkGain}`, type: 'success' });
    } catch {
      setMsg({ text: '操作失败，请稍后重试', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleInherit(path: typeof HEIR_PATHS[0]) {
    if (!save) return;
    if (politicalPts < 20 && networkPts < 20) {
      setMsg({ text: '传承资产不足（至少需要20点），请先积累后再传承', type: 'warn' }); return;
    }
    setLoading(true);
    const meritBonus = Math.round((politicalPts * 0.3 + networkPts * 0.2));
    const newPolitical = Math.round(politicalPts * 0.5);
    const newNetwork   = Math.round(networkPts   * 0.5);
    try {
      await updateSave(save.id, {
        inheritancePolitical: newPolitical,
        inheritanceNetwork: newNetwork,
        meritPoints: save.meritPoints + meritBonus,
      });
      await refreshSave();
      setExecuted(path.key);
      setMsg({ text: `传承完成！选择「${path.label}」路径，政绩+${meritBonus}，${path.bonus}`, type: 'success' });
    } catch {
      setMsg({ text: '操作失败，请稍后重试', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  // 退休倒计时：级别15不退休，否则按60岁推算
  const retireAge = 60;
  const currentAge = save.playerAge ?? 30;
  const yearsToRetire = Math.max(0, retireAge - currentAge);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" backgroundColor={C.header} />
      <View style={{ backgroundColor: C.header, paddingTop: insets.top + 6, paddingBottom: 14, paddingHorizontal: 18 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 8 }}>
          <Text style={{ color: C.goldLight, fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: 4 }}>政治传承系统</Text>
        <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>积累政治遗产 · 培育继承人 · 薪火相传</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}>

        {msg && (
          <View style={{ borderRadius: 8, padding: 12, borderLeftWidth: 4,
            backgroundColor: msg.type === 'success' ? C.greenLight : msg.type === 'warn' ? C.goldLight : C.redLight,
            borderLeftColor: msg.type === 'success' ? C.green : msg.type === 'warn' ? C.gold : C.red }}>
            <Text style={{ fontSize: 12, color: msg.type === 'success' ? C.green : msg.type === 'warn' ? '#C2410C' : C.red, fontWeight: '700', lineHeight: 18 }}>{msg.text}</Text>
            <Pressable onPress={() => setMsg(null)}><Text style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>点击关闭</Text></Pressable>
          </View>
        )}

        {/* 传承状态概览 */}
        <View style={{ backgroundColor: C.header, borderRadius: 8, padding: 14 }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, letterSpacing: 3, marginBottom: 12 }}>传承资产储备</Text>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            {INHERITANCE_ITEMS.map(item => {
              const pts = item.key === 'political' ? politicalPts : networkPts;
              return (
                <View key={item.key} style={{ flex: 1, backgroundColor: item.bg, borderRadius: 8, padding: 12, borderWidth: 1.5, borderColor: item.border }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: item.color }}>{item.label}</Text>
                  </View>
                  <Text style={{ fontSize: 26, fontWeight: '900', color: item.color }}>{pts}</Text>
                  <Text style={{ fontSize: 9, color: C.muted, marginTop: 3 }}>{item.unit} · 可传承{Math.round(pts * item.inheritRatio)}{item.unit}</Text>
                </View>
              );
            })}
          </View>
          {/* 退休倒计时 */}
          <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 6, padding: 10, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 18 }}>⏳</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                当前年龄：{currentAge} 岁 · {yearsToRetire > 0 ? `距退休还有约 ${yearsToRetire} 年` : '已达退休年龄'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, marginTop: 2 }}>
                {isLeader ? '派系领袖可延迟退休至65岁' : '建议在退休前完成传承规划'}
              </Text>
            </View>
          </View>
        </View>

        {/* 积累行动 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.navy, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 16 }}>📈</Text>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>传承资产积累</Text>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            <Text style={{ fontSize: 11, color: C.muted, lineHeight: 16 }}>
              通过以下行动积累政治遗产与人脉资产。退休后可将资产传承给子女或亲信，提供从政起点加成。
            </Text>
            {ACCUMULATE_ACTIONS.map(action => {
              const onCool = isCool(action.key, action.cooldown);
              const canAfford = action.cost === 0 || save.fundBalance >= action.cost;
              const disabled = onCool || !canAfford;
              return (
                <View key={action.key} style={{ borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
                  <View style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 22 }}>{action.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: C.label }}>{action.label}</Text>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 15 }}>{action.desc}</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                        <View style={{ backgroundColor: C.purpleLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: C.purpleBorder }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: C.purple }}>政治遗产 +{action.politicalGain}</Text>
                        </View>
                        <View style={{ backgroundColor: C.blueLight, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: C.blueMid }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: C.blue }}>人脉 +{action.networkGain}</Text>
                        </View>
                        {action.cost > 0 && <View style={{ backgroundColor: '#FFF7ED', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: '#C2410C' }}>-{action.cost / 10000}万</Text>
                        </View>}
                        <View style={{ backgroundColor: '#F5F5F5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, color: C.muted }}>冷却 {action.cooldown} 天</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                  <Pressable onPress={() => !loading && !disabled && handleAccumulate(action)} disabled={loading || disabled}
                    style={{ paddingVertical: 11, alignItems: 'center', borderTopWidth: 1, borderTopColor: C.divider,
                      backgroundColor: disabled ? '#F5F0E8' : C.navy }}>
                    {loading ? <ActivityIndicator color="#fff" size="small" /> :
                      <Text style={{ fontWeight: '800', fontSize: 13, color: disabled ? C.muted : C.goldLight }}>
                        {onCool ? `冷却中（${coolLeft(action.key, action.cooldown)} 天）` : !canAfford ? '资金不足' : '执行'}
                      </Text>}
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>

        {/* 传承路径选择 */}
        <View style={{ backgroundColor: C.card, borderRadius: 8, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
          <View style={{ backgroundColor: C.gold, padding: 12, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Text style={{ fontSize: 16 }}>🌟</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>传承路径（退休时触发）</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10 }}>选择继承人类型，锁定传承方向</Text>
            </View>
          </View>
          <View style={{ padding: 14, gap: 10 }}>
            {executed && (
              <View style={{ backgroundColor: C.greenLight, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.greenMid, flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 20 }}>✅</Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: C.green, flex: 1 }}>传承已完成！继承人已获得政治遗产加成。</Text>
              </View>
            )}
            {HEIR_PATHS.map(path => {
              const locked = path.requiresChildren && false; // 子女状态通过 familyMembers 异步获取，默认不锁定
              const isSelected = selectedHeir === path.key;
              return (
                <Pressable key={path.key} onPress={() => !locked && setSelectedHeir(path.key)}
                  style={{ borderRadius: 8, borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? C.gold : C.border,
                    backgroundColor: isSelected ? C.goldLight : locked ? '#F5F0E8' : C.card,
                    padding: 14, opacity: locked ? 0.5 : 1 }}>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                    <Text style={{ fontSize: 28 }}>{path.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: isSelected ? C.gold : C.label }}>{path.label}</Text>
                        {isSelected && <View style={{ backgroundColor: C.gold, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>已选</Text>
                        </View>}
                        {locked && <View style={{ backgroundColor: C.redLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: C.red, fontSize: 9, fontWeight: '800' }}>需要子女</Text>
                        </View>}
                      </View>
                      <Text style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 16 }}>{path.desc}</Text>
                      <View style={{ marginTop: 6, backgroundColor: C.goldLight, borderRadius: 4, padding: 6, borderWidth: 1, borderColor: C.goldBorder }}>
                        <Text style={{ fontSize: 11, color: C.label, fontWeight: '700' }}>✦ {path.bonus}</Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            {selectedHeir && !executed && (
              <Pressable onPress={() => {
                const path = HEIR_PATHS.find(p => p.key === selectedHeir)!;
                void handleInherit(path);
              }} disabled={loading}
                style={{ backgroundColor: C.gold, borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}>
                {loading ? <ActivityIndicator color="#fff" /> :
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>✦ 确认传承（消耗50%积累）</Text>}
              </Pressable>
            )}
          </View>
        </View>

        {/* 传承说明 */}
        <View style={{ backgroundColor: C.goldLight, borderRadius: 8, padding: 12, borderWidth: 1, borderColor: C.goldBorder }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.label, marginBottom: 6 }}>💡 传承系统说明</Text>
          {[
            '政治遗产：每届任期优秀评定可+10，派系骨干+5/年，领袖+20/年',
            '人脉资产：维系上司/派系关系每月可+3~5，出访活动+8',
            '传承时机：建议在退休前1~2年完成传承，确保继承人充分获益',
            '派系领袖传承：额外解锁50%派系资源传递，效果最优',
            '传承消耗：执行传承后，50%积累值转化为继承人起点加成（政绩奖励）',
          ].map((tip, i) => (
            <Text key={i} style={{ fontSize: 11, color: C.label, marginBottom: 4, lineHeight: 17 }}>• {tip}</Text>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
