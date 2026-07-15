import { GameStoreSlice } from '../createStore';
import { getPlayerRepository } from '../../index';
import { PromotionService } from '@/domains/career/services/PromotionService';
import { KPIEngine } from '@/domains/city/services/KPIEngine';
import { FormulaRegistry } from '@/domains/city/formulas/FormulaRegistry';

const promotionService = new PromotionService(
  {} as any, // bandRepo
  {} as any, // factionRepo
  new KPIEngine(new Map(), new FormulaRegistry()),
  new FormulaRegistry(),
  { maxRank: 15, forkRanks: [6, 9], exceptionalBaseChance: 0.15 }
);

export const createCareerSlice: GameStoreSlice<{
  career: {
    checkPromotionReady: () => any;
    requestPromotion: (path: string) => Promise<any>;
    switchCareerLine: (line: string) => Promise<void>;
    launchVote: () => Promise<any>;
    attendPartyCongress: () => Promise<any>;
  };
  save: any;
}> = (set, get) => ({
  career: {
    checkPromotionReady: () => {
      const save = get().save;
      if (!save) return { ready: false, reasons: ['无存档'] };
      return promotionService.evaluateReadiness(save);
    },

    requestPromotion: async (path: string) => {
      const save = get().save;
      if (!save) return { success: false, error: '无存档' };
      
      set(state => ({ isAdvancing: true }));
      try {
        const result = await promotionService.executePromotion(save, path as any);
        if (result.success && result.event) {
          // 发布领域事件
          // domainEventBus.publish(result.event);
        }
        return result;
      } catch (err) {
        return { success: false, error: (err as Error).message };
      } finally {
        set(state => ({ isAdvancing: false }));
      }
    },

    switchCareerLine: async (line: string) => {
      const repo = getPlayerRepository();
      const save = get().save;
      if (!save) return;
      
      await repo.savePartial(save.id, { preferredCareerLine: line });
      set(state => ({ save: { ...state.save, career: { ...state.save.career, preferredCareerLine: line } } }));
    },

    launchVote: async () => {
      return { success: false, error: '未实现' };
    },

    attendPartyCongress: async () => {
      return { success: false, error: '未实现' };
    },
  },
});