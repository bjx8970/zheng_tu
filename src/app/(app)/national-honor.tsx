/**
 * 国家最高荣誉 — 国家勋章系统
 * 累积重大成就后由最高机关授予一级荣誉/特等荣誉，触发专属结局
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankTheme } from '@/lib/rankTheme';
import { updateSave } from '@/db/gameApi';

// ── 成就条目 ──────────────────────────────────────────────────────────────────
interface Achievement {
  key: string;
  label: string;
  icon: string;
  desc: string;
  check: (s: import('@/types/game').PlayerSave) => boolean;
  tier: 1 | 2; // 1=一级荣誉要求，2=特等荣誉要求
}

const ACHIEVEMENTS: Achievement[] = [
  { key: 'rank15',      label: '正国级职务',   icon: '🏛️', tier: 1, desc: '晋升至正国级（15级）', check: s => (s.rankLevel ?? 0) >= 15 },
  { key: 'merit5000',   label: '政绩卓越',     icon: '🏆', tier: 1, desc: '累计政绩积分达5000', check: s => (s.meritPoints ?? 0) >= 5000 },
  { key: 'moral90',     label: '廉洁典范',     icon: '🔮', tier: 1, desc: '廉洁值达90分', check: s => (s.moralValue ?? 0) >= 90 },
  { key: 'ability90',   label: '治国之才',     icon: '📚', tier: 1, desc: '能力值达90分', check: s => (s.abilityValue ?? 0) >= 90 },
  { key: 'landmark3',   label: '三大历史工程', icon: '🏗️', tier: 1, desc: '命名3项以上全国级历史工程', check: s => { try { return JSON.parse(s.namedLandmarks ?? '[]').length >= 3; } catch { return false; } } },
  { key: 'successor8',  label: '桃李满天下',   icon: '🌱', tier: 1, desc: '接班人能力达80分', check: s => (s.successorAbility ?? 0) >= 80 },
  { key: 'routeWin',    label: '路线主导者',   icon: '🗳️', tier: 2, desc: '赢得全国路线博弈投票', check: s => (s.routeVoteResult ?? '') !== '' },
  { key: 'retired',     label: '从容卸任',     icon: '🎗️', tier: 2, desc: '主动退休（非被迫）', check: s => !!(s.retiredVoluntarily) },
  { key: 'merit8000',   label: '旷世功勋',     icon: '⭐', tier: 2, desc: '累计政绩积分达8000', check: s => (s.meritPoints ?? 0) >= 8000 },
  { key: 'memoir',      label: '青史留名',     icon: '📖', tier: 2, desc: '已撰写并发布回忆录', check: s => !!(s.memoirWritten) },
];

const TIER1_REQ = 4; // 需满足4项成就
const TIER2_REQ = 8; // 需满足8项成就

export default function NationalHonorPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);

  useFocusEffect(useCallback(() => { setMsg(''); }, []));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;

  const theme = getRankTheme(save.rankLevel ?? 1);
  const honorLevel = save.honorLevel ?? 0;
  const achieved = ACHIEVEMENTS.filter(a => a.check(save));
  const count = achieved.length;
  const canTier1 = count >= TIER1_REQ && honorLevel < 1;
  const canTier2 = count >= TIER2_REQ && honorLevel < 2;

  async function handleGrant(tier: 1 | 2) {
    if (!save || acting) return;
    setActing(true);
    try {
      const bonuses = tier === 1
        ? { politicalCapital: (save.politicalCapital ?? 0) + 8, meritPoints: (save.meritPoints ?? 0) + 200 }
        : { politicalCapital: (save.politicalCapital ?? 0) + 20, meritPoints: (save.meritPoints ?? 0) + 500, moralValue: Math.min(100, (save.moralValue ?? 0) + 5) };
      const newSave = await updateSave(save.id, {
        honorLevel: tier,
        honorDay: save.gameDays ?? 0,
        ...bonuses,
      });
      if (newSave) {
        updateGameSave(newSave);
        const honorMsg = tier === 2
          ? '🎖️ 恭贺荣获国家特等荣誉勋章！这是最高国家荣誉，您的名字将永载史册。'
          : '🥇 荣获国家一级荣誉勋章！这是国家对您卓越贡献的最高认可。';
        await saveResult('nationalHonor_tier' + tier, { ok: true, desc: honorMsg, day: save.gameDays ?? 0 });
        setMsgOk(true);
        setMsg(honorMsg);
      } else {
        setMsgOk(false);
        setMsg('网络异常，请稍后重试');
      }
    } catch {
      setMsgOk(false);
      setMsg('操作失败');
    } finally {
      setActing(false);
    }
  }

  const MEDAL_BG: Record<number, string> = { 0: '#6B7280', 1: '#D97706', 2: '#7C3AED' };
  const MEDAL_LABEL: Record<number, string> = { 0: '尚未授勋', 1: '国家一级荣誉勋章', 2: '国家特等荣誉勋章' };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: theme.primary, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <Pressable onPress={() => router.back()} style={{ marginBottom: 6 }}>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>← 返回</Text>
        </Pressable>
        <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800' }}>国家最高荣誉</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 }}>国家勋章 · 最高荣誉认证</Text>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

        {/* 当前勋章状态 */}
        <View style={{ backgroundColor: MEDAL_BG[honorLevel] + '15', borderWidth: 2, borderColor: MEDAL_BG[honorLevel] + '60', borderRadius: 16, padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 52, marginBottom: 8 }}>{honorLevel === 0 ? '🏅' : honorLevel === 1 ? '🥇' : '🎖️'}</Text>
          <Text style={{ fontSize: 16, fontWeight: '800', color: MEDAL_BG[honorLevel] }}>{MEDAL_LABEL[honorLevel]}</Text>
          {honorLevel > 0 && (
            <Text style={{ fontSize: 12, color: theme.mutedText, marginTop: 4 }}>
              授勋于第 {Math.floor((save.honorDay ?? 0) / 360) + 1} 年
            </Text>
          )}
        </View>

        {/* 成就进度 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '700' }}>成就达成进度</Text>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700' }}>{count} / {ACHIEVEMENTS.length}</Text>
          </View>
          {/* 进度条 */}
          <View style={{ backgroundColor: theme.progressBg, borderRadius: 6, height: 8, marginBottom: 12 }}>
            <View style={{ width: `${(count / ACHIEVEMENTS.length) * 100}%`, height: 8, backgroundColor: theme.primary, borderRadius: 6 }} />
          </View>
          <View style={{ flexDirection: 'row', gap: 12, marginBottom: 4 }}>
            <View style={{ flex: 1, backgroundColor: '#D97706' + '15', borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#D97706', fontWeight: '700' }}>一级荣誉</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#D97706' }}>{count}/{TIER1_REQ}</Text>
              <Text style={{ fontSize: 10, color: theme.mutedText, textAlign: 'center' }}>需满足{TIER1_REQ}项成就</Text>
            </View>
            <View style={{ flex: 1, backgroundColor: '#7C3AED' + '15', borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: '#7C3AED', fontWeight: '700' }}>特等荣誉</Text>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#7C3AED' }}>{count}/{TIER2_REQ}</Text>
              <Text style={{ fontSize: 10, color: theme.mutedText, textAlign: 'center' }}>需满足{TIER2_REQ}项成就</Text>
            </View>
          </View>
        </View>

        {/* 成就列表 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14 }}>
          <Text style={{ fontSize: 13, color: theme.valueText, fontWeight: '700', marginBottom: 10 }}>成就清单</Text>
          {ACHIEVEMENTS.map(a => {
            const done = a.check(save);
            return (
              <View key={a.key} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: theme.cardBorder + '80', gap: 10 }}>
                <Text style={{ fontSize: 22, opacity: done ? 1 : 0.3 }}>{a.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: done ? theme.valueText : theme.mutedText }}>{a.label}</Text>
                    <View style={{ backgroundColor: a.tier === 2 ? '#7C3AED20' : '#D9770620', borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: a.tier === 2 ? '#7C3AED' : '#D97706', fontWeight: '700' }}>
                        {a.tier === 1 ? '一级' : '特等'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>{a.desc}</Text>
                </View>
                <Text style={{ fontSize: 16 }}>{done ? '✅' : '⬜'}</Text>
              </View>
            );
          })}
        </View>

        {/* 消息 */}
        {msg ? (
          <View style={{ backgroundColor: msgOk ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: msgOk ? '#86efac' : '#fca5a5', borderRadius: 10, padding: 12 }}>
            <Text style={{ color: msgOk ? '#166534' : '#991b1b', fontSize: 13, lineHeight: 20 }}>{msg}</Text>
          </View>
        ) : null}

        {/* 授勋按钮 */}
        {honorLevel < 2 && (
          <View style={{ gap: 10 }}>
            {canTier2 && (
              <Pressable
                onPress={() => handleGrant(2)}
                disabled={acting}
                style={{ backgroundColor: '#7C3AED', borderRadius: 12, padding: 16, alignItems: 'center', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>🎖️ 申请国家特等荣誉勋章</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 3 }}>政治资本+20，政绩+500，廉洁+5</Text>
                  </>
                )}
              </Pressable>
            )}
            {canTier1 && !canTier2 && (
              <Pressable
                onPress={() => handleGrant(1)}
                disabled={acting}
                style={{ backgroundColor: '#D97706', borderRadius: 12, padding: 16, alignItems: 'center', opacity: acting ? 0.6 : 1 }}
              >
                {acting ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800' }}>🥇 申请国家一级荣誉勋章</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 3 }}>政治资本+8，政绩+200</Text>
                  </>
                )}
              </Pressable>
            )}
            {!canTier1 && !canTier2 && (
              <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 12, padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 13, color: theme.mutedText }}>
                  还需达成 {Math.max(0, TIER1_REQ - count)} 项成就方可申请一级荣誉
                </Text>
              </View>
            )}
          </View>
        )}

        {honorLevel === 2 && (
          <View style={{ backgroundColor: '#7C3AED10', borderWidth: 1.5, borderColor: '#7C3AED40', borderRadius: 12, padding: 16, alignItems: 'center' }}>
            <Text style={{ fontSize: 24, marginBottom: 6 }}>🎖️</Text>
            <Text style={{ fontSize: 14, fontWeight: '800', color: '#7C3AED' }}>已获国家最高荣誉</Text>
            <Text style={{ fontSize: 12, color: theme.mutedText, marginTop: 4, textAlign: 'center' }}>您的历史地位已达巅峰，功勋永载史册</Text>
          </View>
        )}

        <View style={{ height: insets.bottom + 20 }} />
      </ScrollView>
    </View>
  );
}
