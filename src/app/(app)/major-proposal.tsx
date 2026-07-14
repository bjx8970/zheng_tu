// 重大议案系统（全线通用）
// 机制：每5年两会期间（gameDays % 1825 < 60）触发，拉拢代表票数，议案通过解锁政策工具
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

// 议案类型配置
interface ProposalType {
  key: string;
  title: string;
  desc: string;
  icon: string;
  minRank: number;
  baseSupportRate: number;   // 基础支持率（0-1）
  politicalCost: number;     // 政治资本消耗
  policyToolUnlocked: string; // 通过后解锁的政策工具
  meritReward: number;
}

const PROPOSAL_TYPES: ProposalType[] = [
  {
    key: 'prop_economy',
    title: '区域经济振兴议案',
    desc: '提请大会审议通过区域经济振兴规划，争取配套政策支持与专项转移支付，打造经济增长极。',
    icon: '📈',
    minRank: 5,
    baseSupportRate: 0.55,
    politicalCost: 3,
    policyToolUnlocked: 'tool_economy_boost',
    meritReward: 80,
  },
  {
    key: 'prop_livelihood',
    title: '民生保障专项议案',
    desc: '推动大会通过民生保障综合改善方案，涵盖教育、医疗、养老等领域，提升群众获得感。',
    icon: '🏥',
    minRank: 4,
    baseSupportRate: 0.60,
    politicalCost: 2,
    policyToolUnlocked: 'tool_livelihood_boost',
    meritReward: 65,
  },
  {
    key: 'prop_ecology',
    title: '生态文明建设议案',
    desc: '倡议大会通过生态文明先行示范区建设方案，推动绿色低碳转型，争取国家生态专项资金。',
    icon: '🌿',
    minRank: 4,
    baseSupportRate: 0.58,
    politicalCost: 2,
    policyToolUnlocked: 'tool_ecology_boost',
    meritReward: 60,
  },
  {
    key: 'prop_reform',
    title: '行政体制改革议案',
    desc: '提请大会审议推进政府职能转变和行政体制综合改革，压缩机构层级、提高行政效能。',
    icon: '⚙️',
    minRank: 6,
    baseSupportRate: 0.48,
    politicalCost: 4,
    policyToolUnlocked: 'tool_reform_advance',
    meritReward: 100,
  },
  {
    key: 'prop_security',
    title: '社会综合治理议案',
    desc: '推动大会通过社会综合治理体系建设方案，建立健全多元化矛盾化解与维稳协调机制。',
    icon: '🔒',
    minRank: 5,
    baseSupportRate: 0.52,
    politicalCost: 3,
    policyToolUnlocked: 'tool_security_boost',
    meritReward: 75,
  },
  {
    key: 'prop_innovation',
    title: '科技创新驱动议案',
    desc: '联合提请大会通过科技创新驱动发展战略，设立专项研发基金，吸引高端人才落户。',
    icon: '💡',
    minRank: 7,
    baseSupportRate: 0.50,
    politicalCost: 5,
    policyToolUnlocked: 'tool_innovation_unlock',
    meritReward: 120,
  },
];

// 政策工具展示配置
const POLICY_TOOL_LABELS: Record<string, { label: string; icon: string; effect: string }> = {
  tool_economy_boost:     { label: '经济振兴令',   icon: '📈', effect: 'GDP类行动政绩+30%' },
  tool_livelihood_boost:  { label: '民生改善令',   icon: '🏥', effect: '民生类行动政绩+30%' },
  tool_ecology_boost:     { label: '生态专项令',   icon: '🌿', effect: '生态类行动政绩+30%' },
  tool_reform_advance:    { label: '改革推进令',   icon: '⚙️', effect: '廉洁/改革类行动政绩+40%' },
  tool_security_boost:    { label: '综治强化令',   icon: '🔒', effect: '安全类行动政绩+30%' },
  tool_innovation_unlock: { label: '创新驱动令',   icon: '💡', effect: '解锁科技专项投资渠道' },
};

// 拉票行动
interface LobbyAction {
  key: string;
  label: string;
  desc: string;
  politicalCost: number;
  supportGain: number;  // 基础拉票支持率提升（0-1）
  riskDesc: string;
}

const LOBBY_ACTIONS: LobbyAction[] = [
  { key: 'lobby_dinner',    label: '宴请代表团',   desc: '设宴招待各代表团，联络感情、交换利益',           politicalCost: 1, supportGain: 0.06, riskDesc: '廉洁风险低' },
  { key: 'lobby_meeting',   label: '逐一拜访',     desc: '亲赴各代表团驻地，逐一登门拜访，直接游说',       politicalCost: 2, supportGain: 0.10, riskDesc: '效果稳定' },
  { key: 'lobby_faction',   label: '联络派系盟友', desc: '调动本派系人脉，请联盟各方代表联名支持',         politicalCost: 3, supportGain: 0.15, riskDesc: '需派系资源' },
  { key: 'lobby_media',     label: '舆论造势',     desc: '通过媒体和网络渠道引导民意，为议案营造舆论支持',  politicalCost: 2, supportGain: 0.08, riskDesc: '随机性较高' },
];

export default function MajorProposalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [selectedProposal, setSelectedProposal] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!save) return null;

  const theme = getRankThemeWithLine(save.rankLevel, save.careerLine ?? '行政线');
  const gameDays   = save.gameDays ?? 0;
  const polCap     = save.politicalCapital ?? 0;
  const rankLevel  = save.rankLevel ?? 1;

  // 已通过的议案列表
  let passedProposals: string[] = [];
  try { passedProposals = JSON.parse(save.majorProposals ?? '[]') as string[]; } catch { passedProposals = []; }

  // 已解锁的政策工具
  let unlockedTools: string[] = [];
  try { unlockedTools = JSON.parse(save.policyTools ?? '[]') as string[]; } catch { unlockedTools = []; }

  // 当前两会窗口状态（每5年：gameDays % 1825 < 60 表示两会期间）
  const yearCycle  = Math.floor(gameDays / 365);
  const fiveYearCycle = Math.floor(gameDays / 1825);
  const dayInCycle = gameDays % 1825;
  const isCongressWindow = dayInCycle < 60 && rankLevel >= 4;
  const daysToNextCongress = isCongressWindow ? 0 : 1825 - dayInCycle;
  const currentYear = yearCycle + 1;

  // 每届两会只能提一个议案（以fiveYearCycle为届次）
  const sessionKey = `prop_session_${fiveYearCycle}`;
  const cooldowns  = (save.careerPathCooldowns ?? {}) as Record<string, number>;
  const hasSubmittedThisSession = Object.keys(cooldowns).includes(sessionKey);

  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 4000); }

  // 拉票行动
  async function handleLobby(action: LobbyAction) {
    if (!save) return;
    if (polCap < action.politicalCost) { showMsg(`政治资本不足（需 ${action.politicalCost}，当前 ${polCap}）`, false); return; }
    if (!selectedProposal) { showMsg('请先选择要提交的议案', false); return; }
    setLoading(true);
    // 随机浮动 ±30%
    const actualGain = action.supportGain * (0.7 + Math.random() * 0.6);
    const newCoolKey = `lobby_${action.key}_${fiveYearCycle}`;
    if (cooldowns[newCoolKey]) { showMsg('本届已使用过此行动', false); setLoading(false); return; }
    await updateGameSave({
      politicalCapital: Math.max(0, polCap - action.politicalCost),
      gameDays: gameDays + 15,
      careerPathCooldowns: { ...cooldowns, [newCoolKey]: gameDays },
    } as Parameters<typeof updateGameSave>[0]);
    const _mp1=`✅ ${action.label}：预计拉票支持率 +${(actualGain * 100).toFixed(1)}%`; void saveResult('majorProp_'+action.key, {ok:true,desc:_mp1,day:save.gameDays??0}); showMsg(_mp1);
    setLoading(false);
  }

  // 正式提交议案
  async function handleSubmit() {
    if (!save) return;
    if (!selectedProposal) { showMsg('请先选择要提交的议案', false); return; }
    if (!isCongressWindow) { showMsg('当前不在两会召开期间，无法提交议案', false); return; }
    if (hasSubmittedThisSession) { showMsg('本届两会已提交议案，下届方可再次提交', false); return; }
    const prop = PROPOSAL_TYPES.find(p => p.key === selectedProposal);
    if (!prop) return;
    if (polCap < prop.politicalCost) { showMsg(`政治资本不足（需 ${prop.politicalCost}，当前 ${polCap}）`, false); return; }

    setLoading(true);

    // 计算支持率：基础率 + 好感度加成 + 本届拉票行动加成
    const favorBonus   = ((save.bossFavor ?? 50) - 50) * 0.002;
    const lobbyBonus   = LOBBY_ACTIONS.reduce((sum, la) => {
      const lk = `lobby_${la.key}_${fiveYearCycle}`;
      return sum + (cooldowns[lk] ? la.supportGain * (0.7 + Math.random() * 0.6) : 0);
    }, 0);
    const meritBonus   = Math.min(0.15, (save.meritPoints ?? 0) / 5000 * 0.05);
    const totalSupport = prop.baseSupportRate + favorBonus + lobbyBonus + meritBonus;
    const passed       = totalSupport >= 0.5;
    const supportPct   = Math.min(0.95, Math.max(0.05, totalSupport));

    const newProposals = passed ? [...passedProposals, prop.key] : passedProposals;
    const newTools     = passed && !unlockedTools.includes(prop.policyToolUnlocked)
      ? [...unlockedTools, prop.policyToolUnlocked] : unlockedTools;

    await updateGameSave({
      politicalCapital: Math.max(0, polCap - prop.politicalCost),
      meritPoints: passed ? (save.meritPoints ?? 0) + prop.meritReward : (save.meritPoints ?? 0) + 20,
      majorProposals: JSON.stringify(newProposals),
      policyTools: JSON.stringify(newTools),
      gameDays: gameDays + 30,
      careerPathCooldowns: { ...cooldowns, [sessionKey]: gameDays },
    } as Parameters<typeof updateGameSave>[0]);

    if (passed) {
      showMsg(`🎉 议案通过！支持率 ${(supportPct * 100).toFixed(1)}%，政绩 +${prop.meritReward}，解锁【${POLICY_TOOL_LABELS[prop.policyToolUnlocked]?.label}】`);
    } else {
      showMsg(`❌ 议案未获通过（支持率 ${(supportPct * 100).toFixed(1)}%，未达50%），政绩 +20`, false);
    }
    setLoading(false);
  }

  const PRIMARY = '#8B1A1A';

  return (
    <View style={{ flex: 1, backgroundColor: '#F9F5F0' }}>
      {/* 页头 */}
      <View style={{ backgroundColor: PRIMARY, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#cca', fontSize: 10, letterSpacing: 2 }}>全国两会 · 重大议案系统</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>重大议案</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: '#cca', fontSize: 10 }}>政治资本</Text>
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

        {/* 两会状态横幅 */}
        <View style={{ backgroundColor: isCongressWindow ? '#FFF3E0' : '#F5F5F5', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: isCongressWindow ? '#FF9800' : '#e0e0e0' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{isCongressWindow ? '🏛️' : '⏳'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: isCongressWindow ? '#E65100' : '#666' }}>
                {isCongressWindow ? '两会窗口期（60天）· 可提交议案' : '两会休会期'}
              </Text>
              <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                {isCongressWindow
                  ? `本届两会 · 第 ${fiveYearCycle + 1} 届 · 第 ${currentYear} 年${hasSubmittedThisSession ? ' · ✅ 本届已提交' : ' · 尚未提交'}`
                  : `距下届两会还有 ${daysToNextCongress} 天（第 ${fiveYearCycle + 2} 届）`}
              </Text>
            </View>
          </View>
        </View>

        {/* 已解锁政策工具 */}
        {unlockedTools.length > 0 && (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>✨ 已解锁政策工具</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {unlockedTools.map(tk => {
                const info = POLICY_TOOL_LABELS[tk];
                if (!info) return null;
                return (
                  <View key={tk} style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#FFD700', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 }}>
                    <Text style={{ fontSize: 13 }}>{info.icon} {info.label}</Text>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{info.effect}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 议案列表 */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>📋 选择提交议案（本届仅可提交一份）</Text>
          {PROPOSAL_TYPES.map(prop => {
            const isSelected  = selectedProposal === prop.key;
            const isPassed    = passedProposals.includes(prop.key);
            const isAvailable = rankLevel >= prop.minRank;
            return (
              <Pressable
                key={prop.key}
                onPress={() => isAvailable && !isPassed ? setSelectedProposal(prop.key) : undefined}
                style={{
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isPassed ? '#4CAF50' : isSelected ? PRIMARY : '#e0e0e0',
                  borderRadius: 8, padding: 12, marginBottom: 8,
                  backgroundColor: isPassed ? '#F9FFF0' : isSelected ? '#FFF5F5' : '#fafafa',
                  opacity: isAvailable ? 1 : 0.5,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                  <Text style={{ fontSize: 22, marginTop: 2 }}>{prop.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{prop.title}</Text>
                      {isPassed && <View style={{ backgroundColor: '#4CAF50', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已通过</Text></View>}
                      {!isAvailable && <View style={{ backgroundColor: '#888', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 }}><Text style={{ fontSize: 9, color: '#fff' }}>需职级{prop.minRank}</Text></View>}
                    </View>
                    <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }}>{prop.desc}</Text>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                      <View style={{ backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ fontSize: 10, color: '#E65100' }}>政治资本 -{prop.politicalCost}</Text>
                      </View>
                      <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ fontSize: 10, color: '#2E7D32' }}>通过+{prop.meritReward}政绩</Text>
                      </View>
                      <View style={{ backgroundColor: '#EDE7F6', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                        <Text style={{ fontSize: 10, color: '#4527A0' }}>基础支持率{Math.round(prop.baseSupportRate * 100)}%</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 拉票行动（仅两会期间 + 已选议案） */}
        {isCongressWindow && selectedProposal && !hasSubmittedThisSession && (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#e0e6ed' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>🤝 拉票行动（可多次叠加，提升支持率）</Text>
            {LOBBY_ACTIONS.map(la => {
              const used = !!cooldowns[`lobby_${la.key}_${fiveYearCycle}`];
              const canAfford = polCap >= la.politicalCost;
              return (
                <View key={la.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f5f5f5' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: used ? '#aaa' : '#222' }}>{la.label}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{la.desc}</Text>
                    <Text style={{ fontSize: 10, color: '#f57c00', marginTop: 2 }}>预计支持率 +{Math.round(la.supportGain * 100)}% · {la.riskDesc}</Text>
                  </View>
                  <Pressable
                    onPress={() => void handleLobby(la)}
                    disabled={used || !canAfford || loading}
                    style={{ backgroundColor: used ? '#e0e0e0' : canAfford ? PRIMARY : '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 60, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                      {used ? '已用' : `-${la.politicalCost}`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* 提交按钮 */}
        {isCongressWindow && !hasSubmittedThisSession && (
          <Pressable
            onPress={() => void handleSubmit()}
            disabled={!selectedProposal || loading}
            style={{ backgroundColor: selectedProposal ? PRIMARY : '#ccc', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 20 }}
          >
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '800', letterSpacing: 1 }}>
              {loading ? '提交中...' : selectedProposal ? '🏛️ 正式向大会提交议案' : '请先选择议案'}
            </Text>
          </Pressable>
        )}

        {rankLevel < 4 && (
          <View style={{ backgroundColor: '#FFF8E1', borderRadius: 10, padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#E65100', fontWeight: '700' }}>需达到职级4（县级）才可参与两会议案</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
