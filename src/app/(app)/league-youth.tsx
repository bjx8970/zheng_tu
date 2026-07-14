/**
 * 团派线专属：青年工作与团组织建设页面
 * 青年就业 / 团组织建设 / 青年志愿者 / 创新创业 / 青联工作 / 高级团派行动
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface LeagueAction {
  key: string; label: string; icon: string; desc: string;
  minRank: number; cooldownDays: number;
  meritEffect: number; publicOpinionEffect: number; moralEffect: number; factionEffect: number;
  category: '就业' | '组织' | '志愿' | '创业' | '青联' | '战略';
  /** 是否每届（rankLevel）只能使用一次 */
  oncePerRank?: boolean;
  /** 额外说明标签 */
  badge?: string;
}

const LEAGUE_ACTIONS: LeagueAction[] = [
  { key: 'lg_youth_forum', label: '举办青年干部论坛', icon: '🎤', category: '青联',
    desc: '主办全市青年干部交流论坛，扩大在青年系统中的个人影响力。',
    minRank: 2, cooldownDays: 90, meritEffect: 20, publicOpinionEffect: 8, moralEffect: 2, factionEffect: 5 },
  { key: 'lg_job_fair', label: '组织大学生就业专场招聘', icon: '💼', category: '就业',
    desc: '联合人社部门举办大学生专场招聘会，解决应届毕业生就业难题。',
    minRank: 2, cooldownDays: 60, meritEffect: 22, publicOpinionEffect: 10, moralEffect: 2, factionEffect: 3 },
  { key: 'lg_volunteer', label: '组建青年志愿者服务团', icon: '❤️', category: '志愿',
    desc: '在全市组建常态化青年志愿者服务队，开展社区服务、环保、助老等公益活动。',
    minRank: 2, cooldownDays: 60, meritEffect: 18, publicOpinionEffect: 10, moralEffect: 4, factionEffect: 4 },
  // 43. 社会舆论引领（4级）
  { key: 'lg_opinion_lead', label: '社会舆论引领', icon: '📢', category: '战略',
    desc: '主动发起"正能量传播活动"，组织媒体矩阵传播正面素材，提升公众对政府的信任度，抵消负面事件影响。团派擅长舆论工作，效果显著。',
    minRank: 4, cooldownDays: 60, meritEffect: 25, publicOpinionEffect: 18, moralEffect: 3, factionEffect: 6, badge: '舆论专长' },
  // 45. 团中央背书申请（4级，每届限一次）
  { key: 'lg_cyl_central_backing', label: '团中央背书申请', icon: '🏅', category: '战略',
    desc: '向团中央申请就重大政策或施政举措发声背书，一经背书将大幅提升政治信誉与团派声望，但每届任期只能使用一次，需慎重选择时机。',
    minRank: 4, cooldownDays: 0, meritEffect: 60, publicOpinionEffect: 20, moralEffect: 5, factionEffect: 20,
    oncePerRank: true, badge: '每届限一次' },
  { key: 'lg_startup', label: '设立青年创新创业基金', icon: '🚀', category: '创业',
    desc: '联合团省委和地方财政，设立专项青年创新创业扶持基金，孵化青年创业项目。',
    minRank: 4, cooldownDays: 120, meritEffect: 40, publicOpinionEffect: 12, moralEffect: 2, factionEffect: 5 },
  { key: 'lg_build_org', label: '扩大基层团组织覆盖', icon: '🌱', category: '组织',
    desc: '推进非公企业、社会组织团组织全覆盖，扩大团的工作覆盖面。',
    minRank: 3, cooldownDays: 90, meritEffect: 28, publicOpinionEffect: 6, moralEffect: 3, factionEffect: 6 },
  { key: 'lg_youth_camp', label: '举办青年干部训练营', icon: '⛺', category: '组织',
    desc: '举办青年干部素质拓展训练营，培育青年骨干，储备团派系统接班力量。',
    minRank: 3, cooldownDays: 90, meritEffect: 25, publicOpinionEffect: 5, moralEffect: 2, factionEffect: 7 },
  { key: 'lg_charity', label: '推进希望工程捐建活动', icon: '🏫', category: '志愿',
    desc: '牵头开展希望工程公益募捐，为贫困地区援建希望小学，提升团派公众形象。',
    minRank: 3, cooldownDays: 120, meritEffect: 35, publicOpinionEffect: 15, moralEffect: 5, factionEffect: 4 },
  // 39. 群团组织活动（8级）
  { key: 'lg_mass_org', label: '群团组织联合活动', icon: '🤝', category: '组织',
    desc: '定期举办青年联合会、妇联、工会等群团联合活动，活动质量直接影响团派声望和基层动员能力，是团派系统深耕基层的重要抓手。',
    minRank: 8, cooldownDays: 90, meritEffect: 45, publicOpinionEffect: 15, moralEffect: 4, factionEffect: 12, badge: '基层动员' },
  // 41. 校园政治布局（8级）
  { key: 'lg_campus_layout', label: '校园政治布局', icon: '🎓', category: '战略',
    desc: '在重点高校培植影响力，扶持有潜力的青年学生骨干，毕业后进入官僚体系将自然倾向支持你，形成延迟回报的长期政治投资。',
    minRank: 8, cooldownDays: 180, meritEffect: 40, publicOpinionEffect: 8, moralEffect: 2, factionEffect: 18, badge: '长期布局' },
  // 42. 全国青联席位争夺（8级）
  { key: 'lg_national_youth_seat', label: '全国青联席位争夺', icon: '🗳️', category: '青联',
    desc: '每届全国青联换届争取更多团派人员进入核心席位，席位数量直接决定团派整体政治资源量与话语权，是派系实力扩张的关键节点。',
    minRank: 8, cooldownDays: 365, meritEffect: 80, publicOpinionEffect: 10, moralEffect: 0, factionEffect: 25, badge: '每届一次' },
  { key: 'lg_npc_candidate', label: '运作青年人大代表候选', icon: '🏛️', category: '青联',
    desc: '在系统内运作推荐青年代表参加各级人大代表换届选举，扩大团派政治版图。',
    minRank: 5, cooldownDays: 365, meritEffect: 55, publicOpinionEffect: 8, moralEffect: 0, factionEffect: 12 },
  { key: 'lg_innovate_platform', label: '搭建青年创新孵化基地', icon: '🏭', category: '创业',
    desc: '协调落实专项用地和配套资金，建设大学生创新创业孵化基地。',
    minRank: 5, cooldownDays: 180, meritEffect: 50, publicOpinionEffect: 12, moralEffect: 2, factionEffect: 6 },
  { key: 'lg_model_youth', label: '评选表彰青年先进典型', icon: '🥇', category: '青联',
    desc: '策划组织"青年榜样"年度评选，表彰各行业优秀青年代表，强化价值观引领。',
    minRank: 3, cooldownDays: 365, meritEffect: 32, publicOpinionEffect: 12, moralEffect: 3, factionEffect: 6 },
  { key: 'lg_poverty_youth', label: '推进农村青年技能帮扶', icon: '🌾', category: '就业',
    desc: '面向农村留守青年开展免费职业技能培训，助力乡村振兴与青年人才培育。',
    minRank: 3, cooldownDays: 60, meritEffect: 25, publicOpinionEffect: 10, moralEffect: 4, factionEffect: 3 },
  { key: 'lg_cultural_festival', label: '举办青年文化节活动', icon: '🎨', category: '青联',
    desc: '策划举办城市青年文化节，展示青年创意文化，提升城市活力形象。',
    minRank: 4, cooldownDays: 90, meritEffect: 30, publicOpinionEffect: 14, moralEffect: 2, factionEffect: 5 },
  // 38. 青年干部孵化营（10级）
  { key: 'lg_cadre_incubator', label: '青年干部孵化营', icon: '🌟', category: '战略',
    desc: '选拔优秀年轻干部送入孵化计划，5年后成为省级潜力股，忠诚度极高，是团派布局的核心棋子，此举将在团派内部建立稳固的人脉传承网络。',
    minRank: 10, cooldownDays: 365, meritEffect: 100, publicOpinionEffect: 15, moralEffect: 5, factionEffect: 35, badge: '团派核心' },
];

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  就业: { bg: '#DBEAFE', text: '#1D4ED8' },
  组织: { bg: '#DCFCE7', text: '#166534' },
  志愿: { bg: '#FEE2E2', text: '#B91C1C' },
  创业: { bg: '#FEF3C7', text: '#92400E' },
  青联: { bg: '#F3E8FF', text: '#6B21A8' },
  战略: { bg: '#ECFDF5', text: '#065F46' },
};

export default function LeagueYouthScreen() {
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);


  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;
  if (save.careerPathLine !== '团派线') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>此页面仅限团派线官员查阅</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 16, backgroundColor: '#1a7a4a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const theme = getRankThemeWithLine(save.rankLevel, '团派线');
  const rank = save.rankLevel;
  const opinion = save.publicOpinionIndex ?? 50;
  const faction = save.reformFaction ?? 50;
  // 直接从 save 读取持久化冷却，避免本地 state 每次进页面重置
  const cooldowns = save.careerPathCooldowns ?? {};

  function isCool(key: string, days: number) { return ((cooldowns[key] ?? 0) + days) > (save?.gameDays ?? 0); }
  function coolLeft(key: string, days: number) { return Math.max(0, (cooldowns[key] ?? 0) + days - (save?.gameDays ?? 0)); }
  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3500); }

  /** 团中央背书：用 careerPathCooldowns['lg_cyl_backing_rankX'] 记录每届使用 */
  function isCylBackingUsed(): boolean {
    return !!cooldowns[`lg_cyl_backing_rank${rank}`];
  }

  async function handleAction(action: LeagueAction) {
    if (!save) return;
    if (rank < action.minRank) { showMsg(`需达到职级 ${action.minRank} 才可解锁`, false); return; }
    // 每届限一次（团中央背书 / 全国青联席位争夺）
    if (action.oncePerRank) {
      const usedKey = `lg_cyl_backing_rank${rank}`;
      if (cooldowns[usedKey]) { showMsg(`本届任期已使用过「${action.label}」，下一届任期方可再次申请`, false); return; }
    } else if (action.cooldownDays > 0 && isCool(action.key, action.cooldownDays)) {
      showMsg(`冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, false); return;
    }
    setLoading(true);
    const usedKey = action.oncePerRank ? `lg_cyl_backing_rank${rank}` : action.key;
    const nc = { ...(save.careerPathCooldowns ?? {}), [usedKey]: save.gameDays };
    await updateGameSave({
      meritPoints: save.meritPoints + action.meritEffect,
      publicOpinionIndex: Math.min(100, opinion + action.publicOpinionEffect),
      moralValue: Math.min(100, Math.max(0, save.moralValue + action.moralEffect)),
      reformFaction: Math.min(100, Math.max(0, faction + action.factionEffect)),
      careerPathCooldowns: nc,
    });
    const tip = `✅ ${action.label} 完成！政绩 +${action.meritEffect}，群众基础 +${action.publicOpinionEffect}，派系 +${action.factionEffect}`;
    await saveResult('leagueYouth_' + action.key, { ok: true, desc: tip, day: save.gameDays });
    showMsg(tip);
    setLoading(false);
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ backgroundColor: theme.headerBg, borderRadius: 14, padding: 16, borderCurve: 'continuous' } as object}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ fontSize: 28 }}>🟢</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#FFFFFF' }}>青年工作管理</Text>
              <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>团派线专属 · 青年就业与团组织建设</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 10 }}>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{opinion}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>群众基础</Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', flex: 1, borderRadius: 8, padding: 8, alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '900', color: '#fff' }}>{faction}</Text>
              <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>派系声望</Text>
            </View>
          </View>
        </View>

        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#F0FDF4' : '#FEF2F2', borderRadius: 10, padding: 12,
            borderWidth: 1, borderColor: msg.ok ? '#86EFAC' : '#FECACA', borderCurve: 'continuous' } as object}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#166534' : '#B91C1C', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        <Text style={{ fontSize: 15, fontWeight: '900', color: theme.labelText }}>青年工作行动</Text>
        {LEAGUE_ACTIONS.map(action => {
          const locked = rank < action.minRank;
          // 每届限次行动用单独 key 判断
          const usedThisRank = action.oncePerRank && !!cooldowns[`lg_cyl_backing_rank${rank}`];
          const cool = !action.oncePerRank && action.cooldownDays > 0 && isCool(action.key, action.cooldownDays);
          const cc = CAT_COLORS[action.category] ?? { bg: '#F0F4FF', text: '#3730A3' };
          return (
            <View key={action.key} style={{ backgroundColor: theme.cardBg, borderRadius: 14, padding: 14,
              borderWidth: 1, borderColor: theme.cardBorder, opacity: locked ? 0.6 : 1, borderCurve: 'continuous' } as object}>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <Text style={{ fontSize: 24 }}>{action.icon}</Text>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: theme.labelText }}>{action.label}</Text>
                    <View style={{ backgroundColor: cc.bg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, color: cc.text, fontWeight: '700' }}>{action.category}</Text>
                    </View>
                    {action.badge && <View style={{ backgroundColor: '#EDE9FE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, color: '#6D28D9', fontWeight: '700' }}>{action.badge}</Text>
                    </View>}
                    {locked && <View style={{ backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 }}>
                      <Text style={{ fontSize: 10, color: '#B91C1C', fontWeight: '700' }}>需职级{action.minRank}</Text>
                    </View>}
                  </View>
                  <Text style={{ fontSize: 12, color: theme.mutedText, lineHeight: 17 }}>{action.desc}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>政绩<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.meritEffect}</Text></Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>民望<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.publicOpinionEffect}</Text></Text>
                  <Text style={{ fontSize: 11, color: theme.mutedText }}>派系<Text style={{ color: '#166534', fontWeight: '700' }}> +{action.factionEffect}</Text></Text>
                  {!action.oncePerRank && action.cooldownDays > 0 && (
                    <Text style={{ fontSize: 11, color: theme.mutedText }}>冷却{action.cooldownDays}天</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => !loading && !locked && !cool && !usedThisRank && void handleAction(action)}
                  style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8,
                    backgroundColor: locked ? theme.cardBorder : usedThisRank ? '#D1FAE5' : cool ? '#FEF3C7' : theme.primary,
                    opacity: loading ? 0.7 : 1, borderCurve: 'continuous' } as object}>
                  <Text style={{ fontSize: 12, fontWeight: '700',
                    color: locked ? theme.mutedText : usedThisRank ? '#065F46' : cool ? '#B45309' : theme.primaryText }}>
                    {locked ? '未解锁' : usedThisRank ? '✓本届已用' : cool ? `${coolLeft(action.key, action.cooldownDays)}天` : '执行'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        <Pressable onPress={() => router.back()}
          style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
            paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderCurve: 'continuous' } as object}>
          <Text style={{ color: theme.labelText, fontSize: 14, fontWeight: '600' }}>← 返回</Text>
        </Pressable>
        <View style={{ height: 32 }} />
      </View>
    </ScrollView>
  );
}
