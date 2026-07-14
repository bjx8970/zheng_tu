/**
 * 行政线专属：政府职能系统
 * 11个职能站所，各有2-3个工作行动，冷却持久化至careerPathCooldowns
 */
import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { useActionResults } from '@/lib/useActionResults';
import { getRankThemeWithLine } from '@/lib/rankTheme';

interface StationAction {
  key: string;
  label: string;
  desc: string;
  cooldownDays: number;
  meritEffect: number;
  extraEffect?: { field: string; value: number; label: string };
  minRank: number;
  apCost: number;
}
interface Station {
  key: string;
  name: string;
  icon: string;
  desc: string;
  actions: StationAction[];
}

const STATIONS: Station[] = [
  {
    key: 'fagaizhan', name: '发改站', icon: '📐', desc: '发展改革规划，统筹区域经济发展方向与重大项目立项',
    actions: [
      { key: 'fgz_plan', label: '编制年度发展规划', desc: '牵头编制辖区经济社会发展年度计划，报上级审批备案。', cooldownDays: 90, meritEffect: 40, minRank: 3, apCost: 3 },
      { key: 'fgz_project', label: '重大项目立项审批', desc: '对辖区重大投资项目开展可行性论证，完成立项审批流程。', cooldownDays: 60, meritEffect: 30, extraEffect: { field: 'cityGdp', value: 50, label: 'GDP+50亿' }, minRank: 4, apCost: 3 },
      { key: 'fgz_reform', label: '推进体制机制改革', desc: '向上争取改革试点资格，推进行政审批制度改革落地。', cooldownDays: 120, meritEffect: 55, minRank: 5, apCost: 4 },
    ],
  },
  {
    key: 'caizhengsuo', name: '财政所', icon: '💰', desc: '负责财政资金管理、预算编制与转移支付',
    actions: [
      { key: 'czs_budget', label: '编制年度财政预算', desc: '组织编制下年度财政收支预算，统筹安排各项资金需求。', cooldownDays: 90, meritEffect: 35, minRank: 3, apCost: 2 },
      { key: 'czs_special', label: '争取专项转移支付', desc: '向省级财政厅争取重大民生专项资金拨付，保障重点项目推进。', cooldownDays: 60, meritEffect: 45, extraEffect: { field: 'cityBusiness', value: 5, label: '营商+5' }, minRank: 4, apCost: 3 },
    ],
  },
  {
    key: 'jianshezhan', name: '建设站', icon: '🏗️', desc: '负责辖区城乡建设、工程规划审批与施工监管',
    actions: [
      { key: 'jsz_inspect', label: '开展工程质量大检查', desc: '对辖区在建工程开展安全质量专项检查，及时排查安全隐患。', cooldownDays: 45, meritEffect: 25, minRank: 3, apCost: 2 },
      { key: 'jsz_plan', label: '推进村庄规划编制', desc: '组织完成辖区各行政村村庄规划编制，指导美丽乡村建设。', cooldownDays: 90, meritEffect: 40, extraEffect: { field: 'cityLivelihood', value: 3, label: '民生+3' }, minRank: 4, apCost: 3 },
      { key: 'jsz_infra', label: '实施基础设施改造', desc: '启动老旧小区改造工程，改善居民生活条件，提升城镇化品质。', cooldownDays: 120, meritEffect: 60, extraEffect: { field: 'cityLivelihood', value: 5, label: '民生+5' }, minRank: 5, apCost: 4 },
    ],
  },
  {
    key: 'jiaoyuban', name: '教育办', icon: '📚', desc: '统筹辖区基础教育、师资队伍建设与教育资源均衡',
    actions: [
      { key: 'jyb_teacher', label: '组织教师培训交流', desc: '联合上级教育局开展骨干教师培训，提升整体师资水平。', cooldownDays: 60, meritEffect: 28, extraEffect: { field: 'cityLivelihood', value: 2, label: '民生+2' }, minRank: 3, apCost: 2 },
      { key: 'jyb_school', label: '新建扩建学校', desc: '推进辖区学校新建改扩建工程，有效缓解"大班额"问题。', cooldownDays: 120, meritEffect: 55, extraEffect: { field: 'cityLivelihood', value: 5, label: '民生+5' }, minRank: 5, apCost: 4 },
    ],
  },
  {
    key: 'weishengzhan', name: '卫生站', icon: '🏥', desc: '负责基层医疗卫生、公共卫生与健康管理服务',
    actions: [
      { key: 'wsz_clinic', label: '提升村卫生室标准化', desc: '推动辖区村卫生室全面达到标准化建设要求，完善基本医疗服务。', cooldownDays: 60, meritEffect: 30, extraEffect: { field: 'cityLivelihood', value: 3, label: '民生+3' }, minRank: 3, apCost: 2 },
      { key: 'wsz_epidemic', label: '开展公共卫生应急演练', desc: '组织辖区各单位开展突发公共卫生事件应急演练，检验应急处置能力。', cooldownDays: 90, meritEffect: 35, minRank: 4, apCost: 3 },
      { key: 'wsz_elder', label: '推进居家养老服务', desc: '建设居家和社区养老服务中心，扩大普惠养老服务供给。', cooldownDays: 90, meritEffect: 40, extraEffect: { field: 'cityLivelihood', value: 4, label: '民生+4' }, minRank: 4, apCost: 3 },
    ],
  },
  {
    key: 'huanbaozhan', name: '环保站', icon: '🌿', desc: '负责生态环境保护、污染治理与环境执法监督',
    actions: [
      { key: 'hbz_inspect', label: '开展环保执法检查', desc: '对辖区重点排污企业开展突击检查，查处环境违法行为。', cooldownDays: 45, meritEffect: 25, extraEffect: { field: 'cityEcology', value: 3, label: '生态+3' }, minRank: 3, apCost: 2 },
      { key: 'hbz_river', label: '推进河长制落实', desc: '督导辖区河长制工作落实，开展河流水质提升专项行动。', cooldownDays: 60, meritEffect: 35, extraEffect: { field: 'cityEcology', value: 5, label: '生态+5' }, minRank: 4, apCost: 3 },
    ],
  },
  {
    key: 'shijiangsuo', name: '市监所', icon: '🔎', desc: '负责市场监管执法、食品安全与商事登记',
    actions: [
      { key: 'sjs_food', label: '开展食品安全大检查', desc: '对辖区餐饮单位、食品生产加工小作坊开展专项检查，保障群众舌尖安全。', cooldownDays: 45, meritEffect: 25, extraEffect: { field: 'cityLivelihood', value: 2, label: '民生+2' }, minRank: 3, apCost: 2 },
      { key: 'sjs_biz', label: '推进证照分离改革', desc: '落实证照分离改革，优化营业执照审批流程，降低企业制度性交易成本。', cooldownDays: 90, meritEffect: 35, extraEffect: { field: 'cityBusiness', value: 4, label: '营商+4' }, minRank: 4, apCost: 3 },
      { key: 'sjs_price', label: '查处价格违法行为', desc: '针对民众投诉集中的物价哄抬行为开展专项打击，维护市场价格秩序。', cooldownDays: 45, meritEffect: 22, minRank: 3, apCost: 2 },
    ],
  },
  {
    key: 'nongyezhan', name: '农业站', icon: '🌾', desc: '负责农业生产技术指导、惠农政策落实与农村经济发展',
    actions: [
      { key: 'nyz_tech', label: '推广农业新技术', desc: '邀请农业专家下乡指导，推广病虫害绿色防控、测土配方施肥等新技术。', cooldownDays: 60, meritEffect: 28, extraEffect: { field: 'cityGdp', value: 30, label: 'GDP+30亿' }, minRank: 3, apCost: 2 },
      { key: 'nyz_brand', label: '培育农产品品牌', desc: '推动辖区特色农产品申报地理标志认证，打造区域农业品牌。', cooldownDays: 120, meritEffect: 45, extraEffect: { field: 'cityBusiness', value: 3, label: '营商+3' }, minRank: 4, apCost: 3 },
    ],
  },
  {
    key: 'renshiban', name: '人事办', icon: '📋', desc: '负责机关干部考核、编制管理与人才引进工作',
    actions: [
      { key: 'rsb_assess', label: '组织年度干部考核', desc: '统筹组织辖区机关工作人员年度考核工作，形成考核报告报上级备案。', cooldownDays: 90, meritEffect: 30, minRank: 4, apCost: 2 },
      { key: 'rsb_talent', label: '实施人才引进计划', desc: '拟定高层次人才引进方案，向上级申请专项编制，吸引高学历人才到岗任职。', cooldownDays: 120, meritEffect: 50, extraEffect: { field: 'cityBusiness', value: 5, label: '营商+5' }, minRank: 5, apCost: 4 },
    ],
  },
  {
    key: 'zhaoshangban', name: '招商办', icon: '🤝', desc: '负责对外招商引资、开发区建设与投资环境优化',
    actions: [
      { key: 'zsb_road', label: '赴外地开展招商推介', desc: '率团赴主要城市开展系列招商推介活动，宣传本地投资优惠政策。', cooldownDays: 60, meritEffect: 38, extraEffect: { field: 'cityGdp', value: 80, label: 'GDP+80亿' }, minRank: 4, apCost: 3 },
      { key: 'zsb_zone', label: '申报经济开发区扩区', desc: '向省级部门申请经济开发区扩区调整，为新签约项目提供土地空间保障。', cooldownDays: 120, meritEffect: 60, extraEffect: { field: 'cityGdp', value: 150, label: 'GDP+150亿' }, minRank: 6, apCost: 4 },
      { key: 'zsb_policy', label: '出台招商优惠政策', desc: '制定出台新一轮招商引资优惠政策，进一步降低企业落户门槛。', cooldownDays: 90, meritEffect: 42, extraEffect: { field: 'cityBusiness', value: 6, label: '营商+6' }, minRank: 5, apCost: 3 },
    ],
  },
  {
    key: 'shuiwusuo', name: '税务所', icon: '🏛️', desc: '负责辖区税收征管、纳税服务与税源培育',
    actions: [
      { key: 'sws_service', label: '推进税务便民改革', desc: '落实"最多跑一次"改革要求，优化纳税服务流程，压缩办税时限。', cooldownDays: 60, meritEffect: 28, extraEffect: { field: 'cityBusiness', value: 3, label: '营商+3' }, minRank: 3, apCost: 2 },
      { key: 'sws_cultivate', label: '培育重点税源企业', desc: '走访辖区重点纳税企业，协调解决企业发展困难，稳定税收基本盘。', cooldownDays: 90, meritEffect: 38, extraEffect: { field: 'cityGdp', value: 60, label: 'GDP+60亿' }, minRank: 4, apCost: 3 },
    ],
  },
];

export default function GovtSystemScreen() {
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const { getResult, saveResult } = useActionResults();
  // cooldowns 直接从 save 读（乐观更新后立即同步，无闭包问题）
  const cooldowns = (save?.careerPathCooldowns ?? {}) as Record<string, number>;
  const setCooldowns = (_: Record<string, number>) => {}; // noop, save已乐观更新
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // useFocusEffect cooldowns 同步已由直接读 save 替代

  if (!save) return null;

  const theme = getRankThemeWithLine(save.rankLevel, '行政线');
  const gameDays = save.gameDays ?? 0;
  // 职级档位：科员(0-1)→副股(2)→正股(3-4)→副科(5-6)→正科(7+)
  const GRADE_LABELS = ['科员', '科员', '副股级', '正股级', '正股级', '副科级', '副科级', '正科级'];
  const gradeLabel = GRADE_LABELS[Math.min(save.rankLevel, GRADE_LABELS.length - 1)];

  function isCool(key: string, days: number) { return ((cooldowns[key] ?? 0) + days) > gameDays; }
  function coolLeft(key: string, days: number) { return Math.max(0, (cooldowns[key] ?? 0) + days - gameDays); }
  function showMsg(text: string, ok = true) { setMsg({ text, ok }); setTimeout(() => setMsg(null), 3000); }

  async function handleAction(station: Station, action: StationAction) {
    if (!save) return;
    if (save.rankLevel < action.minRank) { showMsg(`需达到职级 ${action.minRank} 才可操作`, false); return; }
    if (isCool(action.key, action.cooldownDays)) { showMsg(`冷却中，还需 ${coolLeft(action.key, action.cooldownDays)} 天`, false); return; }
    setLoading(l => ({ ...l, [action.key]: true }));
    const newGameDays = (save.gameDays ?? 0) + action.apCost * 15;
    const nc = { ...(save.careerPathCooldowns ?? {}), [action.key]: newGameDays };
    const patch: Record<string, unknown> = {
      meritPoints: (save.meritPoints ?? 0) + action.meritEffect,
      gameDays: newGameDays,
      careerPathCooldowns: nc,
    };
    if (action.extraEffect) {
      const cur = (save as unknown as Record<string, unknown>)[action.extraEffect.field] as number ?? 0;
      patch[action.extraEffect.field] = cur + action.extraEffect.value;
    }
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    setCooldowns(nc);
    const tip = `✅ ${action.label} 完成！政绩 +${action.meritEffect}${action.extraEffect ? `，${action.extraEffect.label}` : ''}`;
    await saveResult('govtSys_' + action.key, { ok: true, desc: tip, day: save.gameDays ?? 0 });
    showMsg(tip);
    setLoading(l => ({ ...l, [action.key]: false }));
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.pageBg }} contentInsetAdjustmentBehavior="automatic">
      <View style={{ padding: 14, gap: 10 }}>
        {/* 页头 */}
        <View style={{ backgroundColor: '#1a5fa8', borderRadius: 10, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
            <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 }}>🏛️ 政府职能系统</Text>
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 }}>行政线专属 · {STATIONS.length}个职能站所 · 当前职级：{gradeLabel}</Text>
          </View>
        </View>

        {/* 消息提示 */}
        {msg && (
          <View style={{ backgroundColor: msg.ok ? '#f0fdf4' : '#fef2f2', borderWidth: 1, borderColor: msg.ok ? '#86efac' : '#fca5a5', borderRadius: 8, padding: 10 }}>
            <Text style={{ color: msg.ok ? '#166534' : '#991b1b', fontSize: 12, fontWeight: '600' }}>{msg.text}</Text>
          </View>
        )}

        {/* 站所列表 */}
        {STATIONS.map(station => {
          const isOpen = expanded[station.key] ?? false;
          return (
            <View key={station.key} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: 3, borderTopColor: '#1a5fa8', borderRadius: 10 }}>
              {/* 站所标题行 */}
              <Pressable
                onPress={() => setExpanded(e => ({ ...e, [station.key]: !isOpen }))}
                style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}
              >
                <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(26,95,168,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 18 }}>{station.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.valueText }}>{station.name}</Text>
                  <Text style={{ fontSize: 11, color: theme.labelText, marginTop: 1 }}>{station.desc}</Text>
                </View>
                <Text style={{ fontSize: 16, color: theme.labelText }}>{isOpen ? '▲' : '▼'}</Text>
              </Pressable>

              {/* 展开：行动列表 */}
              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, padding: 10, gap: 8 }}>
                  {station.actions.map(action => {
                    const cooling = isCool(action.key, action.cooldownDays);
                    const locked = save.rankLevel < action.minRank;
                    const busy = loading[action.key];
                    return (
                      <View key={action.key} style={{ backgroundColor: locked ? 'rgba(0,0,0,0.03)' : cooling ? 'rgba(0,0,0,0.03)' : 'rgba(26,95,168,0.05)', borderWidth: 1, borderColor: cooling || locked ? theme.cardBorder : '#1a5fa8', borderRadius: 8, padding: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1, gap: 3 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: locked ? theme.labelText : theme.valueText }}>{action.label}</Text>
                            <Text style={{ fontSize: 11, color: theme.labelText, lineHeight: 16 }}>{action.desc}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                              <Text style={{ fontSize: 10, color: '#1a5fa8', backgroundColor: 'rgba(26,95,168,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>政绩 +{action.meritEffect}</Text>
                              {action.extraEffect && <Text style={{ fontSize: 10, color: '#166534', backgroundColor: 'rgba(22,101,52,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>{action.extraEffect.label}</Text>}
                              <Text style={{ fontSize: 10, color: theme.labelText, backgroundColor: theme.sectionHeaderBg, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>⏱ {action.cooldownDays}天冷却</Text>
                              {action.minRank > 1 && <Text style={{ fontSize: 10, color: '#92400e', backgroundColor: 'rgba(146,64,14,0.08)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>需级别≥{action.minRank}</Text>}
                            </View>
                            {(() => { const r = getResult('govtSys_' + action.key); return r ? (
                              <View style={{ backgroundColor: r.ok ? '#ECFDF5' : '#FEF2F2', borderRadius: 6, padding: 7, marginTop: 6, borderWidth: 1, borderColor: r.ok ? '#BBF7D0' : '#FECACA' }}>
                                <Text style={{ fontSize: 10, fontWeight: '700', color: r.ok ? '#065F46' : '#B91C1C', marginBottom: 1 }}>{r.ok ? '✅ 上次成功' : '❌ 上次失败'} · 第{r.day}天</Text>
                                <Text style={{ fontSize: 10, color: r.ok ? '#047857' : '#DC2626', lineHeight: 14 }}>{r.desc}</Text>
                              </View>
                            ) : null; })()}
                          </View>
                          <Pressable
                            onPress={() => handleAction(station, action)}
                            disabled={cooling || locked || busy}
                            style={{ marginLeft: 8, backgroundColor: locked ? '#e5e7eb' : cooling ? '#e5e7eb' : '#1a5fa8', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, minWidth: 56, alignItems: 'center' }}
                          >
                            {busy ? <ActivityIndicator size="small" color="#fff" /> : (
                              <Text style={{ color: locked || cooling ? '#9ca3af' : '#fff', fontSize: 11, fontWeight: '700' }}>
                                {locked ? '🔒' : cooling ? `${coolLeft(action.key, action.cooldownDays)}天` : '执行'}
                              </Text>
                            )}
                          </Pressable>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
        <View style={{ height: 24 }} />
      </View>
    </ScrollView>
  );
}
