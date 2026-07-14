// 政策窗口期（行政线专属）
// 机制：每年2-3个随机窗口，消耗政治资本推动，成功获得政绩加成+政策领域加成
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// 政策窗口类型
interface PolicyWindow {
  key: string;
  title: string;
  desc: string;
  icon: string;
  type: 'gdp' | 'livelihood' | 'ecology' | 'business' | 'security';
  politicalCost: number;    // 政治资本消耗
  baseSuccessRate: number;  // 基础成功率（0-1）
  meritOnSuccess: number;   // 成功政绩奖励
  bonusValue: number;       // 成功后政策领域加成值
  minRank: number;
}

const POLICY_WINDOWS: PolicyWindow[] = [
  {
    key: 'pw_gdp_special',
    title: '重大项目审批绿色通道',
    desc: '借助政策窗口为本地重大项目开辟审批绿色通道，加速引资落地，实现GDP快速提升。',
    icon: '🚀',
    type: 'gdp',
    politicalCost: 4,
    baseSuccessRate: 0.55,
    meritOnSuccess: 90,
    bonusValue: 8,
    minRank: 7,
  },
  {
    key: 'pw_livelihood',
    title: '民生短板专项补贴',
    desc: '争取中央/省级专项转移支付，集中弥补教育医疗短板，提升民生综合指数。',
    icon: '🏥',
    type: 'livelihood',
    politicalCost: 3,
    baseSuccessRate: 0.60,
    meritOnSuccess: 70,
    bonusValue: 7,
    minRank: 5,
  },
  {
    key: 'pw_ecology_national',
    title: '国家生态补偿政策对接',
    desc: '主动对接国家生态文明建设新政策，争取生态补偿资金，推进绿色发展转型。',
    icon: '🌿',
    type: 'ecology',
    politicalCost: 3,
    baseSuccessRate: 0.62,
    meritOnSuccess: 65,
    bonusValue: 7,
    minRank: 5,
  },
  {
    key: 'pw_business_reform',
    title: '营商环境综合改革试点',
    desc: '把握国家营商环境改革窗口，争取试点资格，大幅提升营商指数，吸引优质企业。',
    icon: '🏗️',
    type: 'business',
    politicalCost: 4,
    baseSuccessRate: 0.50,
    meritOnSuccess: 85,
    bonusValue: 9,
    minRank: 6,
  },
  {
    key: 'pw_security_upgrade',
    title: '社会治安综合整治专项',
    desc: '承接上级维稳专项行动，集中资源开展综合整治，大幅提升社会安全感。',
    icon: '🔒',
    type: 'security',
    politicalCost: 2,
    baseSuccessRate: 0.65,
    meritOnSuccess: 55,
    bonusValue: 6,
    minRank: 4,
  },
  {
    key: 'pw_fiscal_special',
    title: '争取专项财政转移支付',
    desc: '利用政策窗口机会，主动向上争取专项转移支付资金，补充地方财政收入。',
    icon: '💰',
    type: 'gdp',
    politicalCost: 3,
    baseSuccessRate: 0.55,
    meritOnSuccess: 60,
    bonusValue: 6,
    minRank: 5,
  },
  {
    key: 'pw_innovation_zone',
    title: '国家级创新示范区申报',
    desc: '把握政策窗口申报国家级创新示范区，一旦获批将带来长期的资金和政策红利。',
    icon: '💡',
    type: 'business',
    politicalCost: 5,
    baseSuccessRate: 0.45,
    meritOnSuccess: 120,
    bonusValue: 12,
    minRank: 8,
  },
];

const TYPE_LABELS: Record<string, { label: string; color: string; fieldKey: string }> = {
  gdp:        { label: 'GDP类',  color: '#1976D2', fieldKey: 'cityGdp' },
  livelihood: { label: '民生类', color: '#388E3C', fieldKey: 'cityLivelihood' },
  ecology:    { label: '生态类', color: '#00796B', fieldKey: 'cityEcology' },
  business:   { label: '营商类', color: '#F57C00', fieldKey: 'cityBusiness' },
  security:   { label: '安全类', color: '#7B1FA2', fieldKey: 'securityIndex' },
};

// 随机生成本年度开放的政策窗口（根据gameDays年份和rankLevel决定2-3个）
function getOpenWindows(gameDays: number, rankLevel: number): PolicyWindow[] {
  const year = Math.floor(gameDays / 365);
  // 使用年份和职级作为种子，保证同年份每次进入看到相同窗口
  const seed = year * 100 + rankLevel;
  const available = POLICY_WINDOWS.filter(pw => rankLevel >= pw.minRank);
  if (available.length === 0) return [];
  // 伪随机选2-3个（基于seed）
  const count = 2 + (seed % 2);
  const indices = new Set<number>();
  let s = seed;
  while (indices.size < Math.min(count, available.length)) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    indices.add(s % available.length);
  }
  return [...indices].map(i => available[i]);
}

export default function PolicyWindowScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  if (!save) return null;

  // 仅行政线可用
  if (save.careerPath !== 'government') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30, backgroundColor: '#F4F6F9' }}>
        <Pressable onPress={() => router.back()} style={{ position: 'absolute', top: 60, left: 16 }}>
          <Text style={{ fontSize: 22, color: '#333' }}>‹</Text>
        </Pressable>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>政策窗口期为行政线专属功能</Text>
        <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', marginTop: 8 }}>当前线路：{save.careerPath}</Text>
      </View>
    );
  }

  const gameDays    = save.gameDays ?? 0;
  const rankLevel   = save.rankLevel ?? 1;
  const polCap      = save.politicalCapital ?? 0;
  const cooldowns   = (save.careerPathCooldowns ?? {}) as Record<string, number>;
  const currentYear = Math.floor(gameDays / 365);

  const openWindows = useMemo(() => getOpenWindows(gameDays, rankLevel), [gameDays, rankLevel]);

  // 已保存的政策加成
  let policyFieldBonus: Record<string, number> = {};
  try { policyFieldBonus = JSON.parse(save.policyFieldBonus ?? '{}') as Record<string, number>; } catch { policyFieldBonus = {}; }

  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); }

  function isCool(key: string): boolean {
    const coolYear = cooldowns[`pw_${key}_year`] as number | undefined;
    return coolYear === currentYear;
  }

  async function handlePush(pw: PolicyWindow) {
    if (!save) return;
    if (polCap < pw.politicalCost) { showMsg(`政治资本不足（需 ${pw.politicalCost}，当前 ${polCap}）`, false); return; }
    if (isCool(pw.key)) { showMsg('本年度已推动过此窗口', false); return; }

    setLoading(l => ({ ...l, [pw.key]: true }));

    // 成功率：基础率 + 好感度 + 能力值加成
    const favorBonus    = ((save.bossFavor ?? 50) - 50) * 0.003;
    const abilityBonus  = Math.min(0.15, (Math.min(50, (save.meritPoints ?? 0) / 500) - 50) * 0.003);
    const successRate   = Math.min(0.9, pw.baseSuccessRate + favorBonus + abilityBonus);
    const success       = Math.random() < successRate;
    const newGameDays   = gameDays + 45;

    const nc = { ...cooldowns, [`pw_${pw.key}_year`]: currentYear };
    const patch: Record<string, unknown> = {
      politicalCapital: Math.max(0, polCap - pw.politicalCost),
      gameDays: newGameDays,
      careerPathCooldowns: nc,
    };

    if (success) {
      const typeInfo = TYPE_LABELS[pw.type];
      const curField = (save as unknown as Record<string, unknown>)[typeInfo.fieldKey] as number ?? 50;
      patch[typeInfo.fieldKey] = Math.min(100, curField + pw.bonusValue);
      patch.meritPoints = (save.meritPoints ?? 0) + pw.meritOnSuccess;
      const newBonus = { ...policyFieldBonus, [pw.type]: (policyFieldBonus[pw.type] ?? 0) + pw.bonusValue };
      patch.policyFieldBonus = JSON.stringify(newBonus);
    } else {
      patch.meritPoints = (save.meritPoints ?? 0) + 15;  // 失败小安慰
    }

    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);

    if (success) {
      showMsg(`✅ 【${pw.title}】推动成功！政绩 +${pw.meritOnSuccess}，${TYPE_LABELS[pw.type].label} +${pw.bonusValue}`);
    } else {
      showMsg(`❌ 推动未成功（成功率${Math.round(successRate * 100)}%），政绩 +15（安慰奖）`, false);
    }
    setLoading(l => ({ ...l, [pw.key]: false }));
  }

  const PRIMARY = '#1A3A5C';

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F6F9' }}>
      {/* 页头 */}
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#aac', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#8ba8c8', fontSize: 10, letterSpacing: 2 }}>行政线专属 · 政策窗口期</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>政策窗口期</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#8ba8c8', fontSize: 10 }}>政治资本</Text>
          <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: '800' }}>{polCap}</Text>
        </View>
      </View>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>
        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: msg.ok ? '#2a7a3b' : '#e53935', borderRadius: 8, padding: 10 }}>
            <Text style={{ fontSize: 12, color: msg.ok ? '#2a7a3b' : '#c62828', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 说明卡 */}
        <View style={{ backgroundColor: PRIMARY, borderRadius: 12, padding: 14 }}>
          <Text style={{ color: '#8ba8c8', fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>第 {currentYear + 1} 年度 · 政策窗口</Text>
          <Text style={{ color: '#fff', fontSize: 13, lineHeight: 20 }}>
            每年度系统随机开放2-3个政策窗口，抓住窗口期消耗政治资本推动，成功可获得城市指标提升与政绩加成。窗口每年重置。
          </Text>
          {rankLevel < 4 && (
            <View style={{ backgroundColor: 'rgba(255,100,100,0.2)', borderRadius: 6, padding: 8, marginTop: 8 }}>
              <Text style={{ color: '#FF9E80', fontSize: 11 }}>⚠️ 职级4以上才能接入政策窗口系统</Text>
            </View>
          )}
        </View>

        {/* 政策加成累计 */}
        {Object.keys(policyFieldBonus).length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>📊 历史政策加成累计</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {Object.entries(policyFieldBonus).map(([type, bonus]) => {
                const info = TYPE_LABELS[type];
                if (!info) return null;
                return (
                  <View key={type} style={{ backgroundColor: info.color + '15', borderWidth: 1, borderColor: info.color + '40', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 11, color: info.color, fontWeight: '700' }}>{info.label} 累计+{bonus}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 本年度政策窗口 */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>🗓️ 本年度开放窗口（共{openWindows.length}个）</Text>
          {openWindows.length === 0 ? (
            <Text style={{ fontSize: 12, color: '#aaa', textAlign: 'center', paddingVertical: 20 }}>当前职级暂无可用政策窗口</Text>
          ) : openWindows.map(pw => {
            const used    = isCool(pw.key);
            const canAfford = polCap >= pw.politicalCost;
            const typeInfo  = TYPE_LABELS[pw.type];
            const successRate = Math.min(0.9, pw.baseSuccessRate + ((save.bossFavor ?? 50) - 50) * 0.003 + Math.min(0.15, (Math.min(50, (save.meritPoints ?? 0) / 500) - 50) * 0.003));
            return (
              <View key={pw.key} style={{
                borderWidth: 1,
                borderColor: used ? '#f0f0f0' : canAfford ? '#d0e8ff' : '#f0f0f0',
                borderRadius: 10, padding: 14, marginBottom: 10,
                backgroundColor: used ? '#fafafa' : canAfford ? '#f7fbff' : '#fafafa',
              }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 22, marginTop: 2 }}>{pw.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: used ? '#aaa' : '#222' }}>{pw.title}</Text>
                      <View style={{ backgroundColor: typeInfo.color + '20', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                        <Text style={{ fontSize: 9, color: typeInfo.color, fontWeight: '700' }}>{typeInfo.label}</Text>
                      </View>
                      {used && <View style={{ backgroundColor: '#4CAF50', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                        <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>本年已用</Text>
                      </View>}
                    </View>
                    <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }}>{pw.desc}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, color: '#E65100' }}>政治资本 -{pw.politicalCost}</Text>
                  </View>
                  <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, color: '#2E7D32' }}>成功+{pw.meritOnSuccess}政绩</Text>
                  </View>
                  <View style={{ backgroundColor: typeInfo.color + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, color: typeInfo.color }}>成功{typeInfo.label}+{pw.bonusValue}</Text>
                  </View>
                  <View style={{ backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 10, color: '#1565C0' }}>成功率约{Math.round(successRate * 100)}%</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => void handlePush(pw)}
                  disabled={used || !canAfford || !!loading[pw.key]}
                  style={{ backgroundColor: used ? '#e0e0e0' : canAfford ? PRIMARY : '#e0e0e0', borderRadius: 8, paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {loading[pw.key] ? '推动中...' : used ? '本年已推动' : canAfford ? '🚀 推动政策窗口' : `政治资本不足（差${pw.politicalCost - polCap}点）`}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
