/**
 * useActionResults — 通用行动结果日志 Hook
 *
 * 所有卡片行动点击后的结果（成功/失败 + 描述）持久化到
 * player_saves.action_results_log（JSON）中，页面切换不丢失。
 *
 * Key 规范：{pagePrefix}_{actionKey}，如 careerPath_study_session
 */
import { useCallback } from 'react';
import { useGame } from '@/ctx/GameContext';

export interface ActionResult {
  ok: boolean;
  desc: string;
  day: number;
}

/** 解析 actionResultsLog JSON，返回 Record */
function parseLog(raw: string | undefined): Record<string, ActionResult> {
  try { return JSON.parse(raw ?? '{}') as Record<string, ActionResult>; }
  catch { return {}; }
}

export function useActionResults() {
  const { save, updateGameSave } = useGame();

  /** 读取某条行动的历史结果 */
  const getResult = useCallback(
    (key: string): ActionResult | null => {
      const log = parseLog(save?.actionResultsLog);
      return log[key] ?? null;
    },
    [save?.actionResultsLog],
  );

  /**
   * 保存行动结果到 DB（合并写入，不覆盖其他 key）
   * 同时调用 updateGameSave 的 extraUpdates 一并写入（如 meritPoints 等）
   */
  const saveResult = useCallback(
    async (
      key: string,
      result: ActionResult,
      extraUpdates?: Parameters<typeof updateGameSave>[0],
    ): Promise<void> => {
      const existing = parseLog(save?.actionResultsLog);
      const next = { ...existing, [key]: result };
      await updateGameSave({
        ...(extraUpdates ?? {}),
        actionResultsLog: JSON.stringify(next),
      });
    },
    [save?.actionResultsLog, updateGameSave],
  );

  /** 读取所有结果（用于批量展示） */
  const getAllResults = useCallback(
    (): Record<string, ActionResult> => parseLog(save?.actionResultsLog),
    [save?.actionResultsLog],
  );

  return { getResult, saveResult, getAllResults };
}

/** 结果气泡 UI 数据——供各页面统一渲染 */
export function resultBg(ok: boolean) {
  return {
    bg:     ok ? '#ECFDF5' : '#FEF2F2',
    border: ok ? '#BBF7D0' : '#FECACA',
    label:  ok ? '#065F46' : '#B91C1C',
    body:   ok ? '#047857' : '#DC2626',
  };
}
