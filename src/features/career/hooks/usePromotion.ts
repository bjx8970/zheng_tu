import { useCallback } from 'react';
import { getGameStore } from '@/infrastructure';

export interface PromotionReadiness {
  ready: boolean;
  nextRank?: number;
  reasons: string[];
  hardRequirements: {
    tenure: boolean;
    kpi: boolean;
    certificate: boolean;
    age: boolean;
    ability: boolean;
    integrity: boolean;
  };
  softRequirements: {
    vote: boolean;
    congress: boolean;
    massIncident: boolean;
  };
}

export interface PromotionResult {
  success: boolean;
  newRankName?: string;
  requiresFollowDecision: boolean;
  followCandidates?: Array<{ id: string; name: string; loyalty: number }>;
  requiresSecretaryPick: boolean;
  secretaryCandidates?: Array<{ id: string; name: string; ability: number }>;
  error?: string;
}

export function usePromotionReadiness(): PromotionReadiness {
  const store = getGameStore();
  const state = store.getState();

  if (!state.save) {
    return {
      ready: false,
      reasons: ['无存档'],
      hardRequirements: { tenure: false, kpi: false, certificate: false, age: false, ability: false, integrity: false },
      softRequirements: { vote: false, congress: false, massIncident: false },
    };
  }

  const readiness = state.career.checkPromotionReady();
  return readiness;
}

export function usePromotionExecution() {
  const store = getGameStore();

  const execute = useCallback(async (path: string): Promise<PromotionResult> => {
    const state = store.getState();

    if (!state.save) {
      return { success: false, error: '无存档', requiresFollowDecision: false, requiresSecretaryPick: false };
    }

    try {
      const result = await state.career.requestPromotion(path);

      if (!result.success) {
        state.ui.showToast(result.error || '晋升失败', 'error');
      }

      return result;
    } catch (err) {
      state.ui.showToast('晋升操作失败，请稍后重试', 'error');
      return { success: false, error: String(err), requiresFollowDecision: false, requiresSecretaryPick: false };
    }
  }, [store]);

  return { execute };
}

export function useCareerLineSwitch() {
  const store = getGameStore();

  const switchLine = useCallback(async (line: string) => {
    const state = store.getState();
    try {
      await state.career.switchCareerLine(line);
      state.ui.showToast(`已切换至 ${line} 路线`, 'success');
    } catch {
      state.ui.showToast('路线切换失败', 'error');
    }
  }, [store]);

  return { switchLine };
}

export function useAdvanceTime() {
  const store = getGameStore();

  const advance = useCallback(async () => {
    const state = store.getState();
    await state.system.advanceTime();
  }, [store]);

  return { advance };
}

export function useCareerActions() {
  return {
    ...usePromotionExecution(),
    ...useCareerLineSwitch(),
    ...useAdvanceTime(),
  };
}