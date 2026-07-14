/**
 * 城市治理深度玩法 — 共享逻辑 Hook
 *
 * 封装以下判断逻辑（不可写在入口文件）：
 * - 行动费用计算（按职级动态定价，消耗城市治理经费）
 * - 冷却检查（含"每年仅一次"逻辑）
 * - 冷却剩余天数
 * - 执行行动（随机判定、持久化结果、更新存档）
 */
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankCostMultiplier } from '@/lib/lineGameplay';
import type { DeepAction, ActionResult, DeepActionOption } from './types';

type CooldownsField = 'discDeepCooldowns' | 'partyDeepCooldowns' | 'leagueDeepCooldowns' | 'adminDeepCooldowns';
type ResultsField   = 'discDeepResults'   | 'partyDeepResults'   | 'leagueDeepResults'   | 'adminDeepResults';

interface UseDeepActionOptions {
  cooldownsField: CooldownsField;
  resultsField: ResultsField;
}

export function useDeepAction({ cooldownsField, resultsField }: UseDeepActionOptions) {
  const { save, updateGameSave } = useGame();
  const [acting, setActing]               = useState<string | null>(null);
  const [cooldowns, setCooldowns]         = useState<Record<string, number>>({});
  const [savedResults, setSavedResults]   = useState<Record<string, ActionResult>>({});

  // 每次聚焦时从存档重新读取冷却和持久化结果
  useFocusEffect(useCallback(() => {
    if (!save) return;
    setCooldowns((save[cooldownsField] as Record<string, number>) ?? {});
    try {
      setSavedResults(JSON.parse((save[resultsField] as string) ?? '{}') as Record<string, ActionResult>);
    } catch {
      setSavedResults({});
    }
  }, [save, cooldownsField, resultsField]));

  const rank     = save?.rankLevel ?? 1;
  const gameDays = save?.gameDays  ?? 0;
  const gameYear = Math.floor(gameDays / 365);
  // 城市治理经费余额
  const balance  = save?.cityGovFund ?? 0;

  /** 行动费用 = baseCost（万元）× 职级倍率，最低100万元，返回万元 */
  function actionCost(a: DeepAction): number {
    return Math.max(100, Math.round(a.baseCost * getRankCostMultiplier(rank)));
  }

  /** 是否处于冷却中 */
  function isCool(key: string, cooldownDays: number, once?: boolean): boolean {
    const last = cooldowns[key] ?? -1;
    if (last < 0) return false;
    if (once) return Math.floor(last / 365) >= gameYear; // 同一游戏年内不可重复
    return gameDays - last < cooldownDays;
  }

  /** 冷却剩余天数 */
  function cdLeft(key: string, cooldownDays: number, once?: boolean): number {
    if (once) {
      const nextYearStart = (gameYear + 1) * 365;
      return Math.ceil(nextYearStart - gameDays);
    }
    return Math.ceil(cooldownDays - (gameDays - (cooldowns[key] ?? 0)));
  }

  /** 执行行动：随机判定、扣城市治理经费、持久化结果 */
  async function handleAction(action: DeepAction): Promise<void> {
    if (!save) return;
    if (acting) return;
    if (isCool(action.key, action.cooldownDays, action.once)) return;
    const cost = actionCost(action);
    if (cost > 0 && balance < cost) return;

    setActing(action.key);
    const isSuccess = Math.random() * 100 < action.successRate;
    const outcome   = isSuccess ? action.successOutcome : action.failOutcome;

    const newCooldowns  = { ...cooldowns, [action.key]: gameDays };
    const newResult: ActionResult = { ok: isSuccess, desc: outcome.desc, day: gameDays };
    const newResults    = { ...savedResults, [action.key]: newResult };

    try {
      const updates: Parameters<typeof updateGameSave>[0] = {
        [cooldownsField]: newCooldowns,
        [resultsField]:   JSON.stringify(newResults),
        meritPoints:      Math.round((save.meritPoints ?? 0) + outcome.merit),
      };
      // 城市治理经费消耗与回流
      if (cost > 0) updates.cityGovFund = Math.max(0, balance - cost);
      if (outcome.fundDelta) {
        updates.cityGovFund = Math.max(0, (updates.cityGovFund ?? balance) + outcome.fundDelta);
      }
      if (outcome.bossFavor     !== undefined) updates.bossFavor        = Math.min(100, Math.max(0, (save.bossFavor ?? 60) + outcome.bossFavor));
      if (outcome.publicOpinion !== undefined) updates.publicOpinionIndex = Math.min(100, Math.max(0, (save.publicOpinionIndex ?? 60) + outcome.publicOpinion));
      if (outcome.inspectionRisk !== undefined) updates.inspectionRisk  = Math.min(100, Math.max(0, (save.inspectionRisk ?? 20) + outcome.inspectionRisk));
      if (outcome.lineKpi       !== undefined) updates.lineKpiScore     = Math.max(0, (save.lineKpiScore ?? 0) + outcome.lineKpi);
      if (outcome.networkValue  !== undefined) updates.networkValue     = Math.min(100, Math.max(0, (save.networkValue ?? 50) + outcome.networkValue));
      if (outcome.moralValue    !== undefined) updates.moralValue       = Math.min(100, Math.max(0, (save.moralValue ?? 80) + outcome.moralValue));

      await updateGameSave(updates);
      setCooldowns(newCooldowns);
      setSavedResults(newResults);
    } catch {
      // 静默失败，不阻断 UI
    } finally {
      setActing(null);
    }
  }

  /** 突发事件多选项处置：直接按选项outcome执行，不走随机成败 */
  async function handleActionWithOption(action: DeepAction, option: DeepActionOption): Promise<void> {
    if (!save) return;
    if (acting) return;
    if (isCool(action.key, action.cooldownDays, action.once)) return;
    const baseCost = actionCost(action);
    const cost = Math.round(baseCost * (option.costMultiplier ?? 1.0));
    if (cost > 0 && balance < cost) return;

    setActing(action.key + '_' + option.key);
    const outcome = option.outcome;
    const newCooldowns = { ...cooldowns, [action.key]: gameDays };
    const newResult: ActionResult = { ok: true, desc: `[${option.label}] ${outcome.desc}`, day: gameDays };
    const newResults = { ...savedResults, [action.key]: newResult };

    try {
      const updates: Parameters<typeof updateGameSave>[0] = {
        [cooldownsField]: newCooldowns,
        [resultsField]:   JSON.stringify(newResults),
        meritPoints:      Math.round((save.meritPoints ?? 0) + outcome.merit),
      };
      if (cost > 0) updates.cityGovFund = Math.max(0, balance - cost);
      if (outcome.fundDelta !== undefined)       updates.cityGovFund        = Math.max(0, (updates.cityGovFund ?? balance) + outcome.fundDelta);
      if (outcome.bossFavor !== undefined)       updates.bossFavor          = Math.min(100, Math.max(0, (save.bossFavor ?? 60) + outcome.bossFavor));
      if (outcome.publicOpinion !== undefined)   updates.publicOpinionIndex = Math.min(100, Math.max(0, (save.publicOpinionIndex ?? 60) + outcome.publicOpinion));
      if (outcome.inspectionRisk !== undefined)  updates.inspectionRisk     = Math.min(100, Math.max(0, (save.inspectionRisk ?? 20) + outcome.inspectionRisk));
      if (outcome.lineKpi !== undefined)         updates.lineKpiScore       = Math.max(0, (save.lineKpiScore ?? 0) + outcome.lineKpi);
      if (outcome.networkValue !== undefined)    updates.networkValue       = Math.min(100, Math.max(0, (save.networkValue ?? 50) + outcome.networkValue));
      if (outcome.moralValue !== undefined)      updates.moralValue         = Math.min(100, Math.max(0, (save.moralValue ?? 80) + outcome.moralValue));
      await updateGameSave(updates);
      setCooldowns(newCooldowns);
      setSavedResults(newResults);
    } catch {
      // 静默失败
    } finally {
      setActing(null);
    }
  }

  return { save, acting, cooldowns, savedResults, balance, rank, gameDays,
           actionCost, isCool, cdLeft, handleAction, handleActionWithOption };
}

/** 城市治理经费格式化显示（输入单位：万元） */
export function fmtGovFund(n: number): string {
  if (n >= 100_000) return `${(n / 10_000).toFixed(0)}亿`;
  if (n >= 10_000)  return `${(n / 10_000).toFixed(1)}亿`;
  return `${n}万`;
}
