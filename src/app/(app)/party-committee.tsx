/**
 * 党委线专属高阶玩法：
 * 1. 党代会战略部署（rank≥11，10年冷却）
 * 2. 巡视组派驻博弈（rank≥10）
 * 3. 意识形态宣传战（rank≥10）
 * 4. 党纪执行连锁（rank≥11）
 * 5. 党校培训体系（rank≥10）
 * 6. 政治局扩大会议（rank≥11，季度冷却91天）
 * 7. 路线斗争事件（rank≥7）
 * 8. 党报舆论管控（rank≥7，30天冷却）
 * 9. 组织部暗线（rank≥4，60天冷却）
 * 10. 中央全会文件传达（rank≥7，365天冷却）
 * 11. 党风廉政责任状（rank≥7，365天冷却）
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';
import type { CareerLine } from '@/lib/lineGameplay';

// ── 常量 ─────────────────────────────────────────────────────────────────────

const CONGRESS_AXES = [
  {
    key: '经济优先',
    icon: '📈',
    desc: '以GDP为核心导向，未来10年政绩考核加成+30%，招商引资效率提升，财政收入加速增长。',
    effect: '政绩+80 · 招商线KPI×1.3 · 公众认可+10',
    meritBonus: 80, opinionBonus: 10, kpiBonus: 50,
  },
  {
    key: '生态立国',
    icon: '🌿',
    desc: '以绿色发展为核心，生态指标权重提升，民心基础更稳固，道德形象显著改善。',
    effect: '政绩+80 · 道德值+8 · 公众认可+15',
    meritBonus: 80, opinionBonus: 15, kpiBonus: 40, moralBonus: 8,
  },
  {
    key: '安全强国',
    icon: '🛡️',
    desc: '以政治安全与社会稳定为核心，巡视风险降低，问责权威性提升，派系整合能力增强。',
    effect: '政绩+80 · 巡视风险-20 · 上司好感+15',
    meritBonus: 80, opinionBonus: 5, kpiBonus: 30, inspRiskBonus: -20, favorBonus: 15,
  },
];

const IDEOLOGY_TOPICS = [
  { key: 'ideo_reform',     icon: '🔄', label: '改革深化路线',   desc: '主导推进体制改革，提升改革派好感度，中间派认可加深。', reformGain: 15, pragGain: 3, opGain: 8 },
  { key: 'ideo_stability',  icon: '🏛️', label: '稳定优先路线',   desc: '强调政治稳定与秩序，实干派认同上升，审慎派好感提升。', reformGain: 3, pragGain: 15, opGain: 6 },
  { key: 'ideo_nationalism',icon: '🇨🇳', label: '民族复兴论述',   desc: '发表振奋人心的民族复兴讲话，公众好感暴涨，上司满意度提升。', reformGain: 5, pragGain: 5, opGain: 18, favorGain: 8 },
  { key: 'ideo_anticorrupt',icon: '⚔️',  label: '反腐廉政宣示',   desc: '高调宣示廉政立场，道德值上升，巡视风险降低，民心大幅提升。', reformGain: 5, pragGain: 5, opGain: 12, moralGain: 6, inspRiskGain: -10 },
];

const PARTY_DISCIPLINE_TARGETS = [
  { key: 'disc_reform',   icon: '🔴', label: '问责改革派官员', desc: '问责辖区内改革派官员作风问题，中立派好感+10，改革派好感-12。', reformDelta: -12, pragDelta: 5, opDelta: 5 },
  { key: 'disc_prag',     icon: '🔵', label: '问责实干派官员', desc: '问责辖区内实干派干部违规行为，改革派好感+8，实干派好感-12。', reformDelta: 8, pragDelta: -12, opDelta: 5 },
  { key: 'disc_corrupt',  icon: '⚫', label: '问责腐败嫌疑人', desc: '不针对特定派系，通过廉洁问责树立威望，道德值+8，全派系+3。', reformDelta: 3, pragDelta: 3, opDelta: 10, moralDelta: 8, inspRiskDelta: -8 },
];

const POLITBURO_ISSUES = [
  { key: 'pb_eco',      label: '推动经济高质量发展',   icon: '📊', merit: 120, kpi: 80, reform: 10, prag: 5  },
  { key: 'pb_security', label: '加强政治安全与稳定',   icon: '🔐', merit: 100, kpi: 70, reform: 5,  prag: 8  },
  { key: 'pb_cadre',    label: '深化干部制度改革',     icon: '🎖️', merit: 110, kpi: 75, reform: 12, prag: 3  },
  { key: 'pb_eco2',     label: '推进生态文明建设',     icon: '🌳', merit: 90,  kpi: 60, reform: 8,  prag: 8  },
  { key: 'pb_tech',     label: '科技创新战略布局',     icon: '🔬', merit: 105, kpi: 70, reform: 10, prag: 5  },
  { key: 'pb_intl',     label: '外交战略方向调整',     icon: '🌐', merit: 95,  kpi: 65, reform: 5,  prag: 10 },
];

const LINE_STRUGGLE_SIDES = [
  {
    key: 'side_a', icon: '🔴', label: '站队改革路线',
    desc: '支持进一步深化改革，短期内实干派-15，若改革路线最终胜出可获政绩+200。',
    riskMerit: -20, winMerit: 200, reform: 15, prag: -15, winChance: 0.55,
  },
  {
    key: 'side_b', icon: '🔵', label: '站队稳健路线',
    desc: '力主稳健推进，改革派-10，若稳健路线主导则获政绩+150，风险较低。',
    riskMerit: -10, winMerit: 150, reform: -10, prag: 12, winChance: 0.65,
  },
];

// ── 新增功能常量 ──────────────────────────────────────────────────────────────

const MEDIA_ACTIONS = [
  { key: 'suppress_negative', icon: '🚫', label: '压制负面新闻',  desc: '对不利于自己的报道实施封锁。舆论+8，但失察风险+15。', opGain: 8, riskGain: 15, meritGain: 20 },
  { key: 'set_agenda',        icon: '📋', label: '设置正面议程',  desc: '主导舆论风向，推送施政成果。舆论+12，失察风险+8，政绩+15。', opGain: 12, riskGain: 8,  meritGain: 15 },
  { key: 'propaganda_blitz',  icon: '📣', label: '发起宣传攻势',  desc: '全面铺开形象工程宣传，舆论+18，失察风险+20，上司好感+5。', opGain: 18, riskGain: 20, meritGain: 10, favorGain: 5 },
];

const PLENARY_TOPICS = [
  { key: 'pt_eco',       icon: '📈', label: '经济发展精神传达',  desc: '传达全会经济部署，落地效率高，政绩+40·KPI+25。',   merit: 40, kpi: 25, inspRisk: 0, moral: 0, reform: 5, prag: 3 },
  { key: 'pt_security',  icon: '🔐', label: '政治安全精神传达',  desc: '传达政治安全部署，降低巡视风险，政绩+30·风险-8。', merit: 30, kpi: 20, inspRisk: -8, moral: 0, reform: 3, prag: 5 },
  { key: 'pt_cadre',     icon: '🎖️', label: '干部作风精神传达',  desc: '传达干部规范要求，道德形象提升，政绩+35·道德+5。', merit: 35, kpi: 18, inspRisk: 0, moral: 5, reform: 6, prag: 4 },
  { key: 'pt_reform',    icon: '🔄', label: '改革深化精神传达',  desc: '传达改革部署，派系支持增强，政绩+35·改革派+8。',   merit: 35, kpi: 22, inspRisk: 0, moral: 0, reform: 8, prag: 2 },
];

// 廉政候选人随机生成（基于gameDays做伪随机，保证同一天结果一致）
const CONTRACT_SURNAMES = ['李','王','张','刘','陈','杨','赵','黄','周','吴','徐','孙'];
const CONTRACT_GIVEN  = ['志远','建国','明德','正平','光辉','文博','思成','继业','培源','仁贵'];
function genContractCandidates(seed: number) {
  const rng = (n: number) => Math.abs(Math.sin(seed * 9301 + n * 49297 + 233) * 100000) % 1;
  return [0,1,2].map(i => ({
    id: `cc_${seed}_${i}`,
    name: CONTRACT_SURNAMES[Math.floor(rng(i*3) * CONTRACT_SURNAMES.length)] + CONTRACT_GIVEN[Math.floor(rng(i*3+1) * CONTRACT_GIVEN.length)],
    risk: (['低','中','高'] as const)[Math.floor(rng(i*3+2) * 3)],
    riskVal: Math.floor(rng(i*7+4) * 3), // 0=低 1=中 2=高
  }));
}

// ── 主组件 ────────────────────────────────────────────────────────────────────
export default function PartyCommitteeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();

  const [acting, setActing] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  // 党代会选轴弹窗
  const [showCongressModal, setShowCongressModal] = useState(false);
  // 政治局议题选择
  const [pbSelected, setPbSelected] = useState<string[]>([]);
  const [showPbModal, setShowPbModal] = useState(false);
  // 党报舆论管控弹窗
  const [showMediaModal, setShowMediaModal] = useState(false);
  // 中央全会传达弹窗
  const [showPlenaryModal, setShowPlenaryModal] = useState(false);
  // 廉政责任状签约弹窗
  const [showContractModal, setShowContractModal] = useState(false);

  useFocusEffect(useCallback(() => {
    if (save?.careerPathCooldowns) {
      setCooldowns(save.careerPathCooldowns);
    }
  }, [save?.careerPathCooldowns]));

  if (!save) return <ActivityIndicator style={{ flex: 1 }} />;
  if (save.careerPathLine !== '党务线') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ fontSize: 40, marginBottom: 12 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#374151', textAlign: 'center' }}>此页面仅限党务线官员使用</Text>
      </View>
    );
  }

  const theme = getRankThemeWithLine(save.rankLevel, (save.careerPathLine as CareerLine | undefined));
  const rank = save.rankLevel;
  const gameDays = save.gameDays;

  // 冷却工具
  const isCool = (key: string, days: number) => (cooldowns[key] ?? 0) > 0 && gameDays - (cooldowns[key] ?? 0) < days;
  const coolLeft = (key: string, days: number) => Math.max(0, days - (gameDays - (cooldowns[key] ?? 0)));
  const markCool = (key: string) => {
    const nc = { ...cooldowns, [key]: gameDays };
    setCooldowns(nc);
    return nc;
  };

  const showMsg = (text: string, ok: boolean) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 4000);
  };

  // ── 1. 党代会战略部署 ────────────────────────────────────────────────────────
  const handleCongress = async (axis: typeof CONGRESS_AXES[0]) => {
    if (acting) return;
    setActing(true);
    try {
      const nc = markCool('party_congress_axis');
      await updateGameSave({
        meritPoints: save.meritPoints + axis.meritBonus,
        publicOpinionIndex: Math.min(100, save.publicOpinionIndex + axis.opinionBonus),
        lineKpiScore: save.lineKpiScore + axis.kpiBonus,
        inspectionRisk: axis.inspRiskBonus ? Math.max(0, save.inspectionRisk + axis.inspRiskBonus) : save.inspectionRisk,
        moralValue: axis.moralBonus ? Math.min(100, save.moralValue + axis.moralBonus) : save.moralValue,
        bossFavor: axis.favorBonus ? Math.min(100, save.bossFavor + axis.favorBonus) : save.bossFavor,
        partyCongressAxis: axis.key as '经济优先' | '生态立国' | '安全强国',
        partyCongressAxisDay: gameDays,
        careerPathCooldowns: nc,
      });
      setShowCongressModal(false);
      { const _pc1=`✅ 党代会战略主轴确定为「${axis.key}」· 政绩+${axis.meritBonus} · 执政方向已布局`; void saveResult('partyComm_axis_'+axis.key, {ok:true,desc:_pc1,day:save.gameDays??0}); showMsg(_pc1, true); }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 2. 巡视组派驻博弈 ───────────────────────────────────────────────────────
  const handleInspectionTeam = async () => {
    if (acting) return;
    setActing(true);
    try {
      const nc = markCool('inspection_team_deploy');
      const found = Math.random() < 0.7; // 70%查到下级问题
      if (found) {
        await updateGameSave({
          meritPoints: save.meritPoints + 50,
          publicOpinionIndex: Math.min(100, save.publicOpinionIndex + 5),
          lineKpiScore: save.lineKpiScore + 30,
          careerPathCooldowns: nc,
        });
        void saveResult('partyComm_inspect', {ok:true,desc:'✅ 巡视组发现下级严重违规问题，已上报！政绩+50 · 公众好感+5',day:save.gameDays??0}); showMsg('✅ 巡视组发现下级严重违规问题，已上报！政绩+50 · 公众好感+5', true);
      } else {
        // 30%：查到本辖区黑料，反噬
        await updateGameSave({
          meritPoints: Math.max(0, save.meritPoints - 30),
          inspectionRisk: Math.min(100, save.inspectionRisk + 10),
          careerPathCooldowns: nc,
        });
        showMsg('⚠️ 巡视发现本辖区管理疏漏，上级通报批评！政绩-30 · 巡视风险+10', false);
      }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 3. 意识形态宣传战 ───────────────────────────────────────────────────────
  const handleIdeology = async (topic: typeof IDEOLOGY_TOPICS[0]) => {
    if (acting) return;
    setActing(true);
    try {
      const nc = markCool('ideology_war');
      await updateGameSave({
        meritPoints: save.meritPoints + 35,
        reformFaction: Math.min(100, save.reformFaction + topic.reformGain),
        pragmaticFaction: Math.min(100, save.pragmaticFaction + topic.pragGain),
        publicOpinionIndex: Math.min(100, save.publicOpinionIndex + topic.opGain),
        bossFavor: topic.favorGain ? Math.min(100, save.bossFavor + topic.favorGain) : save.bossFavor,
        moralValue: topic.moralGain ? Math.min(100, save.moralValue + topic.moralGain) : save.moralValue,
        inspectionRisk: topic.inspRiskGain ? Math.max(0, save.inspectionRisk + topic.inspRiskGain) : save.inspectionRisk,
        lineKpiScore: save.lineKpiScore + 20,
        careerPathCooldowns: nc,
      });
      { const _pc2=`✅ 「${topic.label}」宣传效果显著！政绩+35 · 舆论+${topic.opGain}`; void saveResult('partyComm_prop_'+topic.key, {ok:true,desc:_pc2,day:save.gameDays??0}); showMsg(_pc2, true); }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 4. 党纪执行连锁 ─────────────────────────────────────────────────────────
  const handleDiscipline = async (target: typeof PARTY_DISCIPLINE_TARGETS[0]) => {
    if (acting) return;
    setActing(true);
    try {
      const nc = markCool('party_discipline_chain');
      await updateGameSave({
        meritPoints: save.meritPoints + 40,
        reformFaction: Math.min(100, Math.max(0, save.reformFaction + target.reformDelta)),
        pragmaticFaction: Math.min(100, Math.max(0, save.pragmaticFaction + target.pragDelta)),
        publicOpinionIndex: Math.min(100, save.publicOpinionIndex + target.opDelta),
        moralValue: target.moralDelta ? Math.min(100, save.moralValue + target.moralDelta) : save.moralValue,
        inspectionRisk: target.inspRiskDelta ? Math.max(0, save.inspectionRisk + target.inspRiskDelta) : save.inspectionRisk,
        lineKpiScore: save.lineKpiScore + 25,
        careerPathCooldowns: nc,
      });
      { const _pc3=`✅ 「${target.label}」执行完毕，政治格局已重组！政绩+40`; void saveResult('partyComm_faction_'+target.key, {ok:true,desc:_pc3,day:save.gameDays??0}); showMsg(_pc3, true); }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 5. 党校培训体系 ─────────────────────────────────────────────────────────
  const handlePartySchool = async () => {
    if (acting) return;
    setActing(true);
    try {
      const nc = markCool('party_school');
      await updateGameSave({
        meritPoints: save.meritPoints + 30,
        successorAbility: Math.min(100, save.successorAbility + 10),
        successorLoyalty: Math.min(100, save.successorLoyalty + 5),
        bossFavor: Math.min(100, save.bossFavor + 5),
        lineKpiScore: save.lineKpiScore + 20,
        careerPathCooldowns: nc,
      });
      void saveResult('partyComm_succTrain', {ok:true,desc:'✅ 接班人已送入党校培训，能力+10 · 忠诚+5 · 政绩+30',day:save.gameDays??0}); showMsg('✅ 接班人已送入党校培训，能力+10 · 忠诚+5 · 政绩+30', true);
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 6. 政治局扩大会议 ───────────────────────────────────────────────────────
  const handlePolitburo = async () => {
    if (acting || pbSelected.length !== 3) return;
    setActing(true);
    try {
      const nc = markCool('politburo_meeting');
      const issues = POLITBURO_ISSUES.filter(i => pbSelected.includes(i.key));
      // 通过率 = 派系支持度加权
      const passRate = Math.min(0.95, (save.reformFaction + save.pragmaticFaction) / 200 + 0.3);
      let totalMerit = 0, totalKpi = 0, totalReform = 0, totalPrag = 0;
      const passed: string[] = [], failed: string[] = [];
      for (const issue of issues) {
        if (Math.random() < passRate) {
          totalMerit += issue.merit;
          totalKpi += issue.kpi;
          totalReform += issue.reform;
          totalPrag += issue.prag;
          passed.push(issue.label);
        } else {
          failed.push(issue.label);
        }
      }
      await updateGameSave({
        meritPoints: save.meritPoints + totalMerit,
        lineKpiScore: save.lineKpiScore + totalKpi,
        reformFaction: Math.min(100, save.reformFaction + totalReform),
        pragmaticFaction: Math.min(100, save.pragmaticFaction + totalPrag),
        careerPathCooldowns: nc,
      });
      setShowPbModal(false);
      setPbSelected([]);
      const passStr = passed.length > 0 ? `通过：${passed.join('、')}` : '无议题通过';
      const failStr = failed.length > 0 ? ` · 未通过：${failed.join('、')}` : '';
      showMsg(`✅ 政治局会议结束！政绩+${totalMerit} · ${passStr}${failStr}`, passed.length > 0);
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 7. 路线斗争事件 ─────────────────────────────────────────────────────────
  const handleLineStruggle = async (side: typeof LINE_STRUGGLE_SIDES[0]) => {
    if (acting) return;
    setActing(true);
    try {
      const nc = markCool('line_struggle');
      const win = Math.random() < side.winChance;
      const meritDelta = win ? side.winMerit : side.riskMerit;
      await updateGameSave({
        meritPoints: Math.max(0, save.meritPoints + meritDelta),
        reformFaction: Math.min(100, Math.max(0, save.reformFaction + side.reform)),
        pragmaticFaction: Math.min(100, Math.max(0, save.pragmaticFaction + side.prag)),
        lineKpiScore: save.lineKpiScore + (win ? 40 : 10),
        careerPathCooldowns: nc,
      });
      if (win) {
        showMsg(`🏆 路线斗争胜利！站队「${side.label}」最终胜出，政绩+${side.winMerit}`, true);
      } else {
        showMsg(`⚠️ 路线斗争受挫，「${side.label}」未占主导，政绩${side.riskMerit}`, false);
      }
    } catch {
      showMsg('操作失败，请稍后重试', false);
    } finally {
      setActing(false);
    }
  };

  // ── 冷却辅助（独立DB字段方式）────────────────────────────────────────────────
  const isCoolDb = (lastDay: number, coolDays: number) => lastDay >= 0 && gameDays - lastDay < coolDays;
  const coolLeftDb = (lastDay: number, coolDays: number) => Math.max(0, coolDays - (gameDays - lastDay));

  // ── 8. 党报舆论管控 ──────────────────────────────────────────────────────────
  const handleMedia = async (action: typeof MEDIA_ACTIONS[0]) => {
    if (acting) return;
    setActing(true);
    try {
      const curRisk = save.mediaOvercontrolRisk ?? 0;
      const newRisk = Math.min(100, curRisk + action.riskGain);
      // 失察风险超80时有概率触发反噬
      const backfire = newRisk > 80 && Math.random() < 0.35;
      if (backfire) {
        await updateGameSave({
          meritPoints: Math.max(0, save.meritPoints - 40),
          publicOpinionIndex: Math.max(0, save.publicOpinionIndex - 15),
          inspectionRisk: Math.min(100, save.inspectionRisk + 12),
          mediaOvercontrolRisk: Math.max(0, newRisk - 20),
          partyMediaControlDay: gameDays,
        });
        setShowMediaModal(false);
        showMsg('⚠️ 过度管控引发"新闻失察"风险！上级介入，政绩-40·舆论-15·巡视风险+12', false);
      } else {
        await updateGameSave({
          meritPoints: save.meritPoints + action.meritGain,
          publicOpinionIndex: Math.min(100, save.publicOpinionIndex + action.opGain),
          bossFavor: action.favorGain ? Math.min(100, save.bossFavor + action.favorGain) : save.bossFavor,
          lineKpiScore: save.lineKpiScore + 15,
          mediaOvercontrolRisk: newRisk,
          partyMediaControlDay: gameDays,
        });
        setShowMediaModal(false);
        showMsg(`✅ 「${action.label}」成功！政绩+${action.meritGain}·舆论+${action.opGain}（失察风险：${newRisk}/100）`, true);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 9. 组织部暗线（持续潜伏多目标模式）────────────────────────────────────
  // 目标数据结构：{ id, name, addedDay, status: 'lurking'|'intercepted'|'failed' }
  type InsiderTarget = { id: string; name: string; addedDay: number; status: 'lurking' | 'intercepted' | 'failed' };
  const parseTargets = (): InsiderTarget[] => {
    try { return JSON.parse(save.orgInsiderTargets ?? '[]'); } catch { return []; }
  };
  const activeTargets = parseTargets().filter(t => t.status === 'lurking');

  const handleAddInsiderTarget = async () => {
    if (acting) return;
    const current = parseTargets();
    if (current.filter(t => t.status === 'lurking').length >= 3) {
      showMsg('⚠️ 潜伏槽位已满（最多3个），请先发动或等待结束', false); return;
    }
    setActing(true);
    try {
      const rivalNames = ['周建国','陈志远','赵明德','刘正平','孙光辉','韩博远','吴思源','徐正国','方贤德','林志平'];
      const used = current.map(t => t.name);
      const available = rivalNames.filter(n => !used.includes(n));
      const rival = available[Math.floor(Math.random() * available.length)] ?? `竞争对手${current.length + 1}`;
      const newTarget: InsiderTarget = { id: `t_${gameDays}_${Math.floor(Math.random()*9999)}`, name: rival, addedDay: gameDays, status: 'lurking' };
      const updated = [...current, newTarget];
      await updateGameSave({ orgInsiderTargets: JSON.stringify(updated) });
      showMsg(`🕵️ 已在组织部埋下暗线，开始监控「${rival}」。60天后可发动阻截。`, true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  const handleStrikeInsiderTarget = async (target: InsiderTarget) => {
    if (acting) return;
    if (gameDays - target.addedDay < 60) {
      showMsg(`⏳ 「${target.name}」潜伏期未满，还需 ${60 - (gameDays - target.addedDay)} 天`, false); return;
    }
    setActing(true);
    try {
      const success = Math.random() < 0.65;
      const current = parseTargets();
      const updated = current.map(t => t.id === target.id ? { ...t, status: success ? ('intercepted' as const) : ('failed' as const) } : t);
      if (success) {
        await updateGameSave({
          meritPoints: save.meritPoints + 50,
          bossFavor: Math.min(100, save.bossFavor + 10),
          reformFaction: Math.min(100, save.reformFaction + 5),
          lineKpiScore: save.lineKpiScore + 35,
          orgInsiderTargets: JSON.stringify(updated),
          orgInsiderTarget: target.name,
        });
        showMsg(`✅ 发动成功！阻截「${target.name}」晋升，政绩+50·上司好感+10`, true);
      } else {
        await updateGameSave({
          inspectionRisk: Math.min(100, save.inspectionRisk + 10),
          bossFavor: Math.max(0, save.bossFavor - 5),
          orgInsiderTargets: JSON.stringify(updated),
        });
        showMsg(`⚠️ 行动失败！「${target.name}」察觉异动，巡视风险+10·上司好感-5`, false);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 10. 中央全会文件传达 ─────────────────────────────────────────────────────
  const handlePlenary = async (topic: typeof PLENARY_TOPICS[0]) => {
    if (acting) return;
    setActing(true);
    try {
      // 传达效果由公众舆论+道德值决定
      const orgCapacity = (save.publicOpinionIndex + save.moralValue) / 200;
      const effectMult = orgCapacity > 0.7 ? 1.3 : orgCapacity > 0.45 ? 1.0 : 0.6;
      const actualMerit = Math.round(topic.merit * effectMult);
      const actualKpi = Math.round(topic.kpi * effectMult);
      await updateGameSave({
        meritPoints: save.meritPoints + actualMerit,
        lineKpiScore: save.lineKpiScore + actualKpi,
        reformFaction: Math.min(100, save.reformFaction + topic.reform),
        pragmaticFaction: Math.min(100, save.pragmaticFaction + topic.prag),
        inspectionRisk: topic.inspRisk ? Math.max(0, save.inspectionRisk + topic.inspRisk) : save.inspectionRisk,
        moralValue: topic.moral ? Math.min(100, save.moralValue + topic.moral) : save.moralValue,
        plenaryConferenceDay: gameDays,
      });
      setShowPlenaryModal(false);
      const effLabel = effectMult >= 1.3 ? '（高效传达🌟）' : effectMult >= 1.0 ? '（正常传达）' : '（流于形式⚠️）';
      showMsg(`✅ 「${topic.label}」完成${effLabel} 政绩+${actualMerit}·KPI+${actualKpi}`, true);
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };

  // ── 11. 党风廉政责任状 ───────────────────────────────────────────────────────
  const handleContract = async (candidate: ReturnType<typeof genContractCandidates>[0]) => {
    if (acting) return;
    setActing(true);
    try {
      // 高风险下属有概率出事，中等概率，低概率安全
      const backfireChance = candidate.riskVal === 2 ? 0.45 : candidate.riskVal === 1 ? 0.2 : 0.05;
      const backfire = Math.random() < backfireChance;
      const signed = (() => { try { return JSON.parse(save.disciplineContractSigned ?? '[]'); } catch { return []; } })();
      if (backfire) {
        await updateGameSave({
          meritPoints: Math.max(0, save.meritPoints - 50),
          moralValue: Math.max(0, save.moralValue - 10),
          inspectionRisk: Math.min(100, save.inspectionRisk + 15),
          disciplineContractDay: gameDays,
          disciplineContractSigned: JSON.stringify([...signed, candidate.id]),
        });
        setShowContractModal(false);
        showMsg(`⚠️ 下属「${candidate.name}」履约期间出现违规问题！连带通报批评，政绩-50·道德-10·巡视风险+15`, false);
      } else {
        await updateGameSave({
          meritPoints: save.meritPoints + 35,
          moralValue: Math.min(100, save.moralValue + 6),
          bossFavor: Math.min(100, save.bossFavor + 5),
          lineKpiScore: save.lineKpiScore + 20,
          disciplineContractDay: gameDays,
          disciplineContractSigned: JSON.stringify([...signed, candidate.id]),
        });
        setShowContractModal(false);
        showMsg(`✅ 与「${candidate.name}」签订廉政责任状！廉洁形象提升，政绩+35·道德+6·上司好感+5`, true);
      }
    } catch { showMsg('操作失败，请稍后重试', false); } finally { setActing(false); }
  };
  const activeAxis = save.partyCongressAxis;
  const congressCd = isCool('party_congress_axis', 3650);
  const congressLeft = coolLeft('party_congress_axis', 3650);

  const SectionCard = ({
    title, icon, badge, rankReq, coolKey, coolDays, children,
  }: {
    title: string; icon: string; badge?: string; rankReq: number;
    coolKey: string; coolDays: number; children: React.ReactNode;
  }) => {
    const locked = rank < rankReq;
    const onCd = isCool(coolKey, coolDays);
    const left = coolLeft(coolKey, coolDays);
    return (
      <View style={{
        backgroundColor: '#FFFFFF', borderRadius: 16, marginBottom: 16,
        padding: 16, borderWidth: 1, borderColor: '#E5E7EB',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06, shadowRadius: 8,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ fontSize: 22, marginRight: 8 }}>{icon}</Text>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#111827', flex: 1 }}>{title}</Text>
          {badge && (
            <View style={{ backgroundColor: '#FEF3C7', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ fontSize: 11, color: '#92400E', fontWeight: '600' }}>{badge}</Text>
            </View>
          )}
        </View>
        {locked ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>🔒</Text>
            <Text style={{ fontSize: 13, color: '#9CA3AF' }}>需达到 {rankReq} 级解锁</Text>
          </View>
        ) : onCd ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10 }}>
            <Text style={{ fontSize: 16, marginRight: 6 }}>⏳</Text>
            <Text style={{ fontSize: 13, color: '#92400E' }}>冷却中，还需 {left} 天</Text>
          </View>
        ) : children}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F7F4' }}>
      <StatusBar style="dark" />
      <View style={{
        paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16,
        backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12, padding: 4 }}>
          <Text style={{ fontSize: 20, color: '#FFF' }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFF' }}>🏛️ 党委高阶职权</Text>
        <View style={{ marginLeft: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: 11, color: '#FFF', fontWeight: '600' }}>党务线专属</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
        {/* 当前执政主轴 */}
        {activeAxis ? (
          <View style={{ backgroundColor: '#ECFDF5', borderRadius: 12, padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, marginRight: 8 }}>✅</Text>
            <View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#065F46' }}>当前执政主轴：{activeAxis}</Text>
              <Text style={{ fontSize: 11, color: '#047857' }}>10年战略已确定，剩余冷却 {congressLeft} 天</Text>
            </View>
          </View>
        ) : null}

        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#D1FAE5' : '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 12 }}>
            <Text style={{ fontSize: 13, color: msg.ok ? '#065F46' : '#991B1B', fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 1. 党代会战略部署 */}
        <SectionCard title="党代会战略部署" icon="🏛️" badge="10年一次" rankReq={11} coolKey="party_congress_axis" coolDays={3650}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            每届党代会选定执政主轴，决定未来10年政绩加成方向，是党委线最高政治权力行使。
          </Text>
          <Pressable
            onPress={() => setShowCongressModal(true)}
            disabled={acting}
            style={{ backgroundColor: '#7C3AED', borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>选择执政主轴 →</Text>
          </Pressable>
        </SectionCard>

        {/* 2. 巡视组派驻博弈 */}
        <SectionCard title="巡视组派驻博弈" icon="🔍" badge="180天冷却" rankReq={10} coolKey="inspection_team_deploy" coolDays={180}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            向下级派驻巡视组。70%概率发现下级违规，政绩+50；30%概率查到本辖区黑料，政绩-30·风险+10。
          </Text>
          <Pressable
            onPress={handleInspectionTeam}
            disabled={acting}
            style={{ backgroundColor: acting ? '#9CA3AF' : '#1D4ED8', borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
              {acting ? '处理中…' : '派驻巡视组'}
            </Text>
          </Pressable>
        </SectionCard>

        {/* 3. 意识形态宣传战 */}
        <SectionCard title="意识形态宣传战" icon="📢" badge="60天冷却" rankReq={10} coolKey="ideology_war" coolDays={60}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            发表重大理论文章或讲话，选择不同议题倾向影响派系好感度与全国舆论走向。
          </Text>
          <View style={{ gap: 8 }}>
            {IDEOLOGY_TOPICS.map(t => (
              <Pressable
                key={t.key}
                onPress={() => handleIdeology(t)}
                disabled={acting}
                style={{ backgroundColor: acting ? '#F3F4F6' : '#F0F9FF', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#BAE6FD' }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#0C4A6E' }}>{t.label}</Text>
                  <Text style={{ fontSize: 11, color: '#0369A1' }}>{t.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        {/* 4. 党纪执行连锁 */}
        <SectionCard title="党纪执行连锁" icon="⚖️" badge="90天冷却" rankReq={11} coolKey="party_discipline_chain" coolDays={90}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            问责一名官员将引发政治格局重组：目标派系好感降低，中立派好感上升，政治生态重新平衡。
          </Text>
          <View style={{ gap: 8 }}>
            {PARTY_DISCIPLINE_TARGETS.map(t => (
              <Pressable
                key={t.key}
                onPress={() => handleDiscipline(t)}
                disabled={acting}
                style={{ backgroundColor: acting ? '#F3F4F6' : '#FFF7ED', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#FED7AA' }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#7C2D12' }}>{t.label}</Text>
                  <Text style={{ fontSize: 11, color: '#9A3412' }}>{t.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        {/* 5. 党校培训体系 */}
        <SectionCard title="党校培训体系" icon="🎓" badge="120天冷却" rankReq={10} coolKey="party_school" coolDays={120}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            送接班人赴党校进修，提升其能力与忠诚度，强化门生网络，形成党校系长期政治资产。
          </Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            接班人当前 · 能力：{save.successorAbility ?? 0}/100 · 忠诚：{save.successorLoyalty ?? 0}/100
          </Text>
          <Pressable
            onPress={handlePartySchool}
            disabled={acting}
            style={{ backgroundColor: acting ? '#9CA3AF' : '#059669', borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
              {acting ? '培训中…' : '送入党校培训 · 政绩+30'}
            </Text>
          </Pressable>
        </SectionCard>

        {/* 6. 政治局扩大会议 */}
        <SectionCard title="政治局扩大会议" icon="🏅" badge="91天冷却" rankReq={11} coolKey="politburo_meeting" coolDays={91}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            每季度选择3个议题提交政治局，通过率由派系支持度决定，通过后产生全局政策红利。
          </Text>
          <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8 }}>
            改革派支持：{save.reformFaction}/100 · 实干派支持：{save.pragmaticFaction}/100
          </Text>
          <Pressable
            onPress={() => { setPbSelected([]); setShowPbModal(true); }}
            disabled={acting}
            style={{ backgroundColor: '#7C3AED', borderRadius: 10, padding: 12, alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>选择会议议题 →</Text>
          </Pressable>
        </SectionCard>

        {/* 7. 路线斗争事件 */}
        <SectionCard title="路线斗争事件" icon="⚔️" badge="180天冷却" rankReq={7} coolKey="line_struggle" coolDays={180}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 10 }}>
            路线争论触发，玩家需选择站队。站队胜出方获丰厚政绩，失利则短期受损，考验政治判断力。
          </Text>
          <View style={{ gap: 8 }}>
            {LINE_STRUGGLE_SIDES.map(s => (
              <Pressable
                key={s.key}
                onPress={() => handleLineStruggle(s)}
                disabled={acting}
                style={{ backgroundColor: acting ? '#F3F4F6' : '#FAFAFA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ fontSize: 18, marginRight: 6 }}>{s.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{s.label}</Text>
                  <View style={{ marginLeft: 8, backgroundColor: '#F0FDF4', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, color: '#166534' }}>胜率 {Math.round(s.winChance * 100)}%</Text>
                  </View>
                </View>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>{s.desc}</Text>
              </Pressable>
            ))}
          </View>
        </SectionCard>

        {/* 8. 党报舆论管控 */}
        <SectionCard title="党报舆论管控" icon="📰" badge="30天冷却" rankReq={7} coolKey="_none_" coolDays={0}>
          {isCoolDb(save.partyMediaControlDay, 30) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>⏳</Text>
              <Text style={{ fontSize: 13, color: '#92400E' }}>冷却中，还需 {coolLeftDb(save.partyMediaControlDay, 30)} 天</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
                掌控官媒，主动发起舆论议程设置，压制负面新闻。过度管控将累积"失察风险"，超过80有概率反噬。
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>失察风险累积：</Text>
                <View style={{ flex: 1, height: 6, backgroundColor: '#FEE2E2', borderRadius: 3, marginLeft: 8 }}>
                  <View style={{ width: `${save.mediaOvercontrolRisk ?? 0}%`, height: 6, backgroundColor: (save.mediaOvercontrolRisk ?? 0) > 80 ? '#DC2626' : (save.mediaOvercontrolRisk ?? 0) > 50 ? '#F59E0B' : '#10B981', borderRadius: 3 }} />
                </View>
                <Text style={{ fontSize: 12, color: '#374151', marginLeft: 8 }}>{save.mediaOvercontrolRisk ?? 0}/100</Text>
              </View>
              <Pressable
                onPress={() => setShowMediaModal(true)}
                disabled={acting}
                style={{ backgroundColor: acting ? '#9CA3AF' : '#BE185D', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>发起舆论管控 →</Text>
              </Pressable>
            </>
          )}
        </SectionCard>

        {/* 9. 组织部暗线（持续潜伏多目标模式）*/}
        <SectionCard title="组织部暗线" icon="🕵️" badge="最多3个目标" rankReq={4} coolKey="_none_" coolDays={0}>
          <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 8 }}>
            在组织部埋下暗线，持续监控多名竞争对手。每个目标潜伏60天后可发动阻截（65%成功率）。最多同时潜伏3个目标。
          </Text>
          {/* 当前潜伏目标列表 */}
          {activeTargets.length > 0 ? (
            <View style={{ gap: 8, marginBottom: 10 }}>
              {activeTargets.map(t => {
                const elapsed = gameDays - t.addedDay;
                const ready = elapsed >= 60;
                const remaining = Math.max(0, 60 - elapsed);
                return (
                  <View key={t.id} style={{ backgroundColor: ready ? '#F0FDF4' : '#EFF6FF', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: ready ? '#86EFAC' : '#BFDBFE' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={{ fontSize: 16, marginRight: 6 }}>🎯</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: ready ? '#166534' : '#1E40AF', flex: 1 }}>{t.name}</Text>
                      <View style={{ backgroundColor: ready ? '#D1FAE5' : '#DBEAFE', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, color: ready ? '#065F46' : '#1D4ED8', fontWeight: '600' }}>
                          {ready ? '✅ 可发动' : `⏳ 潜伏中 ${remaining}天`}
                        </Text>
                      </View>
                    </View>
                    {ready && (
                      <Pressable
                        onPress={() => handleStrikeInsiderTarget(t)}
                        disabled={acting}
                        style={{ backgroundColor: acting ? '#9CA3AF' : '#166534', borderRadius: 8, padding: 9, alignItems: 'center' }}>
                        <Text style={{ color: '#FFF', fontSize: 13, fontWeight: '700' }}>
                          {acting ? '行动中…' : '立即发动阻截'}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={{ backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, marginBottom: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#9CA3AF' }}>暂无潜伏目标，点击下方按钮添加</Text>
            </View>
          )}
          {activeTargets.length < 3 ? (
            <Pressable
              onPress={handleAddInsiderTarget}
              disabled={acting}
              style={{ backgroundColor: acting ? '#9CA3AF' : '#1D4ED8', borderRadius: 10, padding: 12, alignItems: 'center' }}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>
                {acting ? '布局中…' : `➕ 新增潜伏目标（${activeTargets.length}/3 槽位）`}
              </Text>
            </Pressable>
          ) : (
            <View style={{ backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10, alignItems: 'center' }}>
              <Text style={{ fontSize: 13, color: '#DC2626', fontWeight: '600' }}>槽位已满，发动后方可添加新目标</Text>
            </View>
          )}
        </SectionCard>

        {/* 10. 中央全会文件传达 */}
        <SectionCard title="中央全会文件传达" icon="📜" badge="365天冷却" rankReq={7} coolKey="_none_" coolDays={0}>
          {isCoolDb(save.plenaryConferenceDay, 365) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>⏳</Text>
              <Text style={{ fontSize: 13, color: '#92400E' }}>冷却中，还需 {coolLeftDb(save.plenaryConferenceDay, 365)} 天</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
                每次全会后向辖区干部传达精神，效果由组织力（舆论×道德）决定：高效传达政绩×1.3，流于形式×0.6。
              </Text>
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 10 }}>
                当前组织力：舆论 {save.publicOpinionIndex}/100 · 道德 {save.moralValue}/100
              </Text>
              <Pressable
                onPress={() => setShowPlenaryModal(true)}
                disabled={acting}
                style={{ backgroundColor: acting ? '#9CA3AF' : '#7C3AED', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>选择传达议题 →</Text>
              </Pressable>
            </>
          )}
        </SectionCard>

        {/* 11. 党风廉政责任状 */}
        <SectionCard title="党风廉政责任状" icon="📝" badge="365天冷却" rankReq={7} coolKey="_none_" coolDays={0}>
          {isCoolDb(save.disciplineContractDay, 365) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF9C3', borderRadius: 10, padding: 10 }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>⏳</Text>
              <Text style={{ fontSize: 13, color: '#92400E' }}>冷却中，还需 {coolLeftDb(save.disciplineContractDay, 365)} 天</Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>
                每年与下级签订廉政责任状。需评估下级风险再决定签谁：若签约对象出事，玩家连带被通报批评。
              </Text>
              <Pressable
                onPress={() => setShowContractModal(true)}
                disabled={acting}
                style={{ backgroundColor: acting ? '#9CA3AF' : '#065F46', borderRadius: 10, padding: 12, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>评估下级 · 签订责任状 →</Text>
              </Pressable>
            </>
          )}
        </SectionCard>

      </ScrollView>

      {/* 党代会选轴弹窗 */}
      <Modal visible={showCongressModal} transparent animationType="slide" onRequestClose={() => setShowCongressModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>🏛️ 选择执政主轴</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>此决策将影响未来10年施政方向，请慎重选择。</Text>
            {CONGRESS_AXES.map(ax => (
              <Pressable
                key={ax.key}
                onPress={() => handleCongress(ax)}
                disabled={acting}
                style={{ backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 22, marginRight: 8 }}>{ax.icon}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#111827' }}>{ax.key}</Text>
                </View>
                <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{ax.desc}</Text>
                <View style={{ backgroundColor: '#ECFDF5', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 11, color: '#065F46', fontWeight: '600' }}>{ax.effect}</Text>
                </View>
              </Pressable>
            ))}
            <Pressable onPress={() => setShowCongressModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 政治局议题选择弹窗 */}
      <Modal visible={showPbModal} transparent animationType="slide" onRequestClose={() => setShowPbModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>🏅 政治局扩大会议</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              选择3个议题上会（已选 {pbSelected.length}/3）
            </Text>
            <View style={{ gap: 8, marginBottom: 16 }}>
              {POLITBURO_ISSUES.map(issue => {
                const sel = pbSelected.includes(issue.key);
                return (
                  <Pressable
                    key={issue.key}
                    onPress={() => {
                      if (sel) { setPbSelected(prev => prev.filter(k => k !== issue.key)); }
                      else if (pbSelected.length < 3) { setPbSelected(prev => [...prev, issue.key]); }
                    }}
                    style={{
                      backgroundColor: sel ? '#EDE9FE' : '#F9FAFB',
                      borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center',
                      borderWidth: 1, borderColor: sel ? '#7C3AED' : '#E5E7EB',
                    }}>
                    <Text style={{ fontSize: 18, marginRight: 8 }}>{issue.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: sel ? '#5B21B6' : '#111827' }}>{issue.label}</Text>
                      <Text style={{ fontSize: 11, color: '#6B7280' }}>政绩+{issue.merit} · KPI+{issue.kpi}</Text>
                    </View>
                    {sel && <Text style={{ fontSize: 16, color: '#7C3AED' }}>✓</Text>}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={handlePolitburo}
              disabled={acting || pbSelected.length !== 3}
              style={{
                backgroundColor: pbSelected.length === 3 ? '#7C3AED' : '#D1D5DB',
                borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 8,
              }}>
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>
                {acting ? '会议进行中…' : pbSelected.length === 3 ? '召开政治局会议' : `还需选择 ${3 - pbSelected.length} 个议题`}
              </Text>
            </Pressable>
            <Pressable onPress={() => setShowPbModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 党报舆论管控弹窗 */}
      <Modal visible={showMediaModal} transparent animationType="slide" onRequestClose={() => setShowMediaModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>📰 发起舆论管控</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              失察风险当前：{save.mediaOvercontrolRisk ?? 0}/100{(save.mediaOvercontrolRisk ?? 0) > 80 ? '  ⚠️ 高风险，操作可能反噬！' : ''}
            </Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              {MEDIA_ACTIONS.map(a => (
                <Pressable
                  key={a.key}
                  onPress={() => handleMedia(a)}
                  disabled={acting}
                  style={{ backgroundColor: acting ? '#F3F4F6' : '#FFF1F2', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#FECDD3' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>{a.icon}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#9F1239' }}>{a.label}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>{a.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ backgroundColor: '#ECFDF5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, color: '#065F46' }}>政绩+{a.meritGain} · 舆论+{a.opGain}</Text>
                    </View>
                    <View style={{ backgroundColor: '#FEF2F2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, color: '#DC2626' }}>失察风险+{a.riskGain}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowMediaModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 中央全会文件传达弹窗 */}
      <Modal visible={showPlenaryModal} transparent animationType="slide" onRequestClose={() => setShowPlenaryModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>📜 选择传达议题</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              传达效果由组织力（舆论+道德）决定，当前组织力：{Math.round((save.publicOpinionIndex + save.moralValue) / 2)}/100
            </Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              {PLENARY_TOPICS.map(t => (
                <Pressable
                  key={t.key}
                  onPress={() => handlePlenary(t)}
                  disabled={acting}
                  style={{ backgroundColor: acting ? '#F3F4F6' : '#F5F3FF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#DDD6FE' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ fontSize: 20, marginRight: 8 }}>{t.icon}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#4C1D95' }}>{t.label}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: '#6B7280' }}>{t.desc}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowPlenaryModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* 廉政责任状签约弹窗 */}
      <Modal visible={showContractModal} transparent animationType="slide" onRequestClose={() => setShowContractModal(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: insets.bottom + 24 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 }}>📝 选择签约对象</Text>
            <Text style={{ fontSize: 13, color: '#6B7280', marginBottom: 16 }}>评估下级廉洁风险，谨慎选择。高风险干部若出事，你将被连带追责。</Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              {genContractCandidates(save.gameDays).map(c => {
                const riskColor = c.risk === '高' ? '#DC2626' : c.risk === '中' ? '#D97706' : '#059669';
                const riskBg = c.risk === '高' ? '#FEF2F2' : c.risk === '中' ? '#FFFBEB' : '#F0FDF4';
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => handleContract(c)}
                    disabled={acting}
                    style={{ backgroundColor: acting ? '#F3F4F6' : riskBg, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: riskColor + '40' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={{ fontSize: 20, marginRight: 8 }}>👤</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 14, fontWeight: '700', color: '#111827' }}>{c.name}</Text>
                          <Text style={{ fontSize: 12, color: '#6B7280' }}>签约将提升廉政形象，但承担连带风险</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: riskBg, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: riskColor, marginLeft: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: riskColor }}>风险：{c.risk}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <Pressable onPress={() => setShowContractModal(false)} style={{ padding: 12, alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: '#9CA3AF' }}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
