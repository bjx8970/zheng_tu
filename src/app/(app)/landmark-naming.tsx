// 重大工程命名权 — 行政线专属，全国级基础设施命名成为历史遗产
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 工程类型 ──────────────────────────────────────────────────────────────────
type ProjectType = {
  key: string; icon: string; label: string;
  minMerit: number; minRank: number; cost: number; meritReward: number; legacyReward: number;
  desc: string; nameSuffixes: readonly string[]; namePrefixes: readonly string[];
};
const PROJECT_TYPES: ProjectType[] = [
  {
    key: 'bridge',     icon: '🌉', label: '跨江大桥',
    minMerit: 3000,   minRank: 12, cost: 8,  meritReward: 500, legacyReward: 2,
    desc: '横跨大江的千米跨度大桥，工程规模全国领先，造福两岸百姓',
    nameSuffixes: ['大桥', '跨江桥', '长江桥', '通惠桥'],
    namePrefixes: ['振华', '腾飞', '天桑', '鸿图', '鼎新', '锦程', '盛世', '鹏程'],
  },
  {
    key: 'expressway', icon: '🛣️', label: '省际高速',
    minMerit: 4000,   minRank: 12, cost: 10, meritReward: 600, legacyReward: 2,
    desc: '连接多省的高速公路干线，显著缩短区域通行时间，带动沿线经济腾飞',
    nameSuffixes: ['高速', '快速通道', '大道', '联通路'],
    namePrefixes: ['腾达', '鸿运', '铸远', '长青', '安澜', '锦绣', '振兴'],
  },
  {
    key: 'airport',    icon: '✈️', label: '区域枢纽机场',
    minMerit: 5000,   minRank: 13, cost: 12, meritReward: 800, legacyReward: 3,
    desc: '辐射周边数省的航空枢纽，年旅客吞吐量超千万人次，打造区域门户',
    nameSuffixes: ['国际机场', '航空港', '国际航站'],
    namePrefixes: ['鸿翔', '凌云', '翔宇', '展翼', '飞鸿', '振翅'],
  },
  {
    key: 'dam',        icon: '💧', label: '大型水利枢纽',
    minMerit: 6000,   minRank: 13, cost: 15, meritReward: 1000, legacyReward: 4,
    desc: '集防洪、发电、灌溉于一体的流域性水利工程，惠及数千万人口，功在当代利在千秋',
    nameSuffixes: ['水利枢纽', '水坝', '水库', '治水工程'],
    namePrefixes: ['安澜', '定波', '济民', '惠农', '兴水', '丰泽', '利民'],
  },
  {
    key: 'new_city',   icon: '🏙️', label: '新城规划区',
    minMerit: 8000,   minRank: 14, cost: 20, meritReward: 1500, legacyReward: 5,
    desc: '面向未来的国家级新区规划建设，集产业、科技、居住为一体，成为区域发展新引擎',
    nameSuffixes: ['新区', '科技城', '创新港', '发展区'],
    namePrefixes: ['启航', '未来', '创谷', '腾飞', '筑梦', '领航', '聚智'],
  },
] as const;

// ── 随机名称生成 ──────────────────────────────────────────────────────────────
function generateName(type: typeof PROJECT_TYPES[0], seed: number): string {
  const pIdx = seed % type.namePrefixes.length;
  const sIdx = Math.floor(seed / 10) % type.nameSuffixes.length;
  return `${type.namePrefixes[pIdx]}${type.nameSuffixes[sIdx]}`;
}

export default function LandmarkNamingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [acting, setActing] = useState<string | null>(null);
  const [namingPreviews, setNamingPreviews] = useState<Record<string, string>>({});

  useFocusEffect(useCallback(() => { setMsg(null); }, []));

  if (!save) return null;

  if (save.careerPath !== 'government') {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <StatusBar style="dark" />
        <Text style={{ fontSize: 36, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#333', marginBottom: 8, textAlign: 'center' }}>行政线专属功能</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>重大工程命名权仅对行政线官员开放，需选择行政路线后方可使用。</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, backgroundColor: '#333', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cooldowns   = (save.careerPathCooldowns ?? {}) as Record<string, number>;
  const gameDays    = save.gameDays ?? 0;
  const polCap      = save.politicalCapital ?? 0;
  const rankLevel   = save.rankLevel ?? 1;
  const merit       = save.meritPoints ?? 0;
  // 已命名工程列表（JSON数组）
  const namedWorks: string[] = (() => { try { return JSON.parse((save as unknown as Record<string, string>).namedLandmarks ?? '[]'); } catch { return []; } })();

  function isOnCooldown(key: string) {
    return (cooldowns[`land_${key}`] ?? 0) > gameDays - 365;
  }

  function getPreview(type: typeof PROJECT_TYPES[0]) {
    if (namingPreviews[type.key]) return namingPreviews[type.key];
    const seed = gameDays + type.key.charCodeAt(0) * 7 + rankLevel * 13;
    return generateName(type, seed);
  }

  function refreshPreview(key: string, type: typeof PROJECT_TYPES[0]) {
    const seed = Date.now() % 1000 + type.key.charCodeAt(0) * 7;
    setNamingPreviews(p => ({ ...p, [key]: generateName(type, seed) }));
  }

  async function handleName(type: typeof PROJECT_TYPES[0]) {
    if (!save) return;
    if (acting) return;
    const name = getPreview(type);
    setActing(type.key);
    const newWorks = [...namedWorks, `${type.icon}${name}（${type.label}）`];
    const newGameDays = gameDays + 90;
    await updateGameSave({
      politicalCapital: Math.max(0, polCap - type.cost),
      meritPoints: merit + type.meritReward,
      legacyBonus: (save.legacyBonus ?? 0) + type.legacyReward,
      gameDays: newGameDays,
      careerPathCooldowns: { ...cooldowns, [`land_${type.key}`]: gameDays },
      namedLandmarks: JSON.stringify(newWorks),
    } as Parameters<typeof updateGameSave>[0]);
    setMsg({ text: `🏛️ 成功命名「${name}」！历史遗产 +${type.legacyReward}，政绩 +${type.meritReward}`, ok: true });
    setActing(null);
  }

  const PRIMARY = '#1B3A2D';

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F7F0' }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 16, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#A5D6A7', fontSize: 16, fontWeight: '800', letterSpacing: 1 }}>重大工程命名权</Text>
          <View style={{ marginLeft: 8, backgroundColor: '#2E7D32', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>行政线专属</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 16 }}>
          <Text style={{ color: '#81C784', fontSize: 11 }}>政治资本：{polCap}</Text>
          <Text style={{ color: '#81C784', fontSize: 11 }}>已命名工程：{namedWorks.length} 项</Text>
          <Text style={{ color: '#81C784', fontSize: 11 }}>历史遗产：{save.legacyBonus ?? 0}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#E8F5E9' : '#FFEBEE', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: msg.ok ? '#A5D6A7' : '#FFCDD2' }}>
            <Text style={{ fontSize: 12, color: msg.ok ? '#2E7D32' : '#C62828', fontWeight: '700' }}>{msg.text}</Text>
          </View>
        )}

        {/* ── 已命名工程展示 ── */}
        {namedWorks.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#A5D6A7', padding: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E7D32', marginBottom: 8, letterSpacing: 1 }}>🏛️ 历史遗产工程录</Text>
            {namedWorks.map((w, i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: i < namedWorks.length - 1 ? 1 : 0, borderColor: '#f0f0f0' }}>
                <View style={{ width: 20, height: 20, backgroundColor: '#E8F5E9', borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <Text style={{ fontSize: 9, color: '#2E7D32', fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#333', flex: 1 }}>{w}</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── 工程列表 ── */}
        {PROJECT_TYPES.map(type => {
          const locked   = rankLevel < type.minRank || merit < type.minMerit;
          const cooldown = isOnCooldown(type.key);
          const canAfford= polCap >= type.cost;
          const preview  = getPreview(type);
          const isActing = acting === type.key;

          return (
            <View
              key={type.key}
              style={{
                backgroundColor: '#fff', borderRadius: 12, borderWidth: 1,
                borderColor: locked ? '#e0e0e0' : cooldown ? '#f0f0f0' : '#A5D6A7',
                overflow: 'hidden', opacity: locked ? 0.6 : 1,
              }}
            >
              {/* 头部 */}
              <View style={{ backgroundColor: locked ? '#f5f5f5' : '#E8F5E9', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22 }}>{type.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: locked ? '#aaa' : '#1B5E20' }}>{type.label}</Text>
                  <Text style={{ fontSize: 10, color: '#888' }}>政治资本 {type.cost} · 政绩 +{type.meritReward} · 遗产 +{type.legacyReward}</Text>
                </View>
                {locked && <View style={{ backgroundColor: '#e0e0e0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#888', fontSize: 10 }}>🔒 未解锁</Text></View>}
                {!locked && cooldown && <View style={{ backgroundColor: '#FFF9C4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#F57F17', fontSize: 10 }}>冷却中</Text></View>}
              </View>

              <View style={{ padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 10 }}>{type.desc}</Text>

                {!locked && (
                  <>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>解锁条件：{type.minRank}级 + 政绩≥{type.minMerit}</Text>

                    {/* 名称预览 */}
                    <View style={{ backgroundColor: '#F1F8E9', borderRadius: 8, padding: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#33691E' }}>「{preview}」</Text>
                      <Pressable onPress={() => refreshPreview(type.key, type)} style={{ backgroundColor: '#558B2F', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 }}>
                        <Text style={{ color: '#fff', fontSize: 10 }}>换一个</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => handleName(type)}
                      disabled={!canAfford || cooldown || !!acting}
                      style={{
                        backgroundColor: !canAfford || cooldown ? '#e0e0e0' : '#2E7D32',
                        borderRadius: 8, paddingVertical: 10, alignItems: 'center',
                      }}
                    >
                      {isActing ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={{ color: !canAfford || cooldown ? '#aaa' : '#fff', fontSize: 12, fontWeight: '700' }}>
                          {cooldown ? '⏳ 冷却中（1年后可再次命名）' : !canAfford ? `政治资本不足（需${type.cost}）` : `🏛️ 正式命名（消耗 ${type.cost} 政治资本）`}
                        </Text>
                      )}
                    </Pressable>
                  </>
                )}
                {locked && (
                  <Text style={{ fontSize: 10, color: '#aaa' }}>解锁条件：达到{type.minRank}级 且 政绩≥{type.minMerit}</Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ backgroundColor: '#E8F5E9', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#A5D6A7' }}>
          <Text style={{ fontSize: 11, color: '#2E7D32', lineHeight: 18 }}>
            💡 命名的工程将永久记录于「历史遗产工程录」，每项工程带来遗产加成，影响最终人生结局评定，并在退休后作为历史功绩展示。
          </Text>
        </View>

        <View style={{ height: insets.bottom + 8 }} />
      </ScrollView>
    </View>
  );
}
