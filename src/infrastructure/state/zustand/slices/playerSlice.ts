import { GameStoreSlice, PlayerActions, UIState } from '../createStore';
import { getPlayerRepository } from '../../index';
import type { Player } from '@/domains/shared/types';

export const createPlayerSlice: GameStoreSlice<{
  player: PlayerActions;
  save: Player | null;
  isLoading: boolean;
  lastSyncedAt: number | null;
  isAdvancing: boolean;
  pendingOps: any[];
  uiFlags: UIState;
}> = (set, get) => ({
  // State
  save: null,
  isLoading: true,
  lastSyncedAt: null,
  isAdvancing: false,
  pendingOps: [],
  uiFlags: {
    activeTab: 'home',
    modals: {},
    expandedSections: {},
    scrollPositions: {},
  },

  // Actions
  player: {
    refreshSave: async () => {
      set({ isLoading: true });
      try {
        const repo = getPlayerRepository();
        const player = await repo.findByUserId('current-user'); // TODO: 从 auth 获取真实 userId
        if (player) {
          set({ save: player, lastSyncedAt: Date.now(), isLoading: false });
        } else {
          set({ isLoading: false });
        }
      } catch (err) {
        console.error('[PlayerSlice] refreshSave failed:', err);
        set({ isLoading: false });
      }
    },

    forceRefreshSave: async () => {
      const repo = getPlayerRepository();
      const player = await repo.findByUserId('current-user');
      if (player) {
        set({ save: player, lastSyncedAt: Date.now() });
      }
    },

    applyOptimistic: (updates) => {
      const current = get().save;
      if (!current) return;
      const optimistic = { ...current, ...updates } as Player;
      set({ save: optimistic, pendingOps: [...get().pendingOps, updates] });
    },

    commitOptimistic: async () => {
      const ops = get().pendingOps;
      if (ops.length === 0) return;
      
      const repo = getPlayerRepository();
      const current = get().save;
      if (!current) return;

      try {
        for (const op of ops) {
          await repo.savePartial(current.id, op);
        }
        const refreshed = await repo.findById(current.id);
        if (refreshed) {
          set({ save: refreshed, pendingOps: [], lastSyncedAt: Date.now() });
        }
      } catch (err) {
        console.error('[PlayerSlice] commitOptimistic failed:', err);
        // 回滚由调用方决定
      }
    },

    rollbackOptimistic: () => {
      const repo = getPlayerRepository();
      const current = get().save;
      if (!current) return;
      
      repo.findById(current.id).then((fresh) => {
        if (fresh) set({ save: fresh, pendingOps: [] });
      });
    },
  },
});