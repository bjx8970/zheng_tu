import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import type { StateCreator } from 'zustand';

// ===== Type Definitions =====

export interface GameStoreState {
  // Core save state
  save: any | null;
  isLoading: boolean;
  lastSyncedAt: number | null;
  
  // Runtime state
  isAdvancing: boolean;
  pendingOps: any[];
  uiFlags: UIState;
  
  // Action groups (injected by slices)
  player: PlayerActions;
  career: CareerActions;
  governance: GovernanceActions;
  personnel: PersonnelActions;
  finance: FinanceActions;
  political: PoliticalActions;
  system: SystemActions;
  ui: UIActions;
}

export interface UIState {
  activeTab: string;
  modals: Record<string, boolean>;
  expandedSections: Record<string, boolean>;
  scrollPositions: Record<string, number>;
  toasts: Toast[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
}

// ===== Action Interfaces =====

export interface PlayerActions {
  refreshSave: () => Promise<void>;
  forceRefreshSave: () => Promise<void>;
  applyOptimistic: (updates: Record<string, any>) => void;
  commitOptimistic: () => Promise<void>;
  rollbackOptimistic: () => void;
  setSave: (save: any) => void;
}

export interface CareerActions {
  checkPromotionReady: () => any;
  requestPromotion: (path: string) => Promise<any>;
  switchCareerLine: (line: string) => Promise<void>;
  launchVote: () => Promise<any>;
  attendPartyCongress: () => Promise<any>;
}

export interface GovernanceActions {
  executePolicy: (policy: any) => Promise<any>;
  allocateCityFund: (project: any) => Promise<void>;
  adjustDepartmentBudget: (dept: string, delta: number) => void;
  launchFiveYearPlan: (plan: any) => Promise<void>;
}

export interface PersonnelActions {
  recruit: (type: string) => Promise<any>;
  appoint: (subId: string, position: string) => Promise<any>;
  assess: (subId: string) => Promise<any>;
  transfer: (subId: string, targetCity: string) => Promise<void>;
  dismiss: (subId: string) => Promise<void>;
  assignSecretary: (subId: string) => Promise<void>;
}

export interface FinanceActions {
  investPersonal: (template: any) => Promise<any>;
  claimSalary: () => Promise<void>;
  manageProvidentFund: (action: any) => Promise<void>;
  tradeStocks: (order: any) => Promise<void>;
}

export interface PoliticalActions {
  joinFaction: (faction: string) => Promise<void>;
  donateToFaction: (amount: number) => Promise<void>;
  triggerDisciplineInspection: (target: string) => Promise<any>;
  handleBriberyEvent: (choice: any) => Promise<void>;
  manageLeagueWork: (action: any) => Promise<void>;
}

export interface SystemActions {
  setTimeGranularity: (g: 'day' | 'week' | 'month') => void;
  setAutoAdvance: (enabled: boolean) => void;
  setSpeedMultiplier: (m: 1 | 2 | 4 | 8) => void;
  redeemCode: (code: string) => Promise<any>;
  createSaveSlot: (label: string) => Promise<void>;
  loadSaveSlot: (slot: number) => Promise<void>;
  resetGame: () => Promise<void>;
  advanceTime: () => Promise<void>;
}

export interface UIActions {
  setActiveTab: (tab: string) => void;
  openModal: (name: string) => void;
  closeModal: (name: string) => void;
  toggleSection: (name: string) => void;
  setScrollPosition: (key: string, y: number) => void;
  showToast: (message: string, type: Toast['type']) => void;
  dismissToast: (id: string) => void;
}

// ===== Slice Creators =====

type StoreSlice<T> = StateCreator<
  GameStoreState,
  [['zustand/devtools', never], ['zustand/persist', never]],
  [],
  T
>;

const initialUIState: UIState = {
  activeTab: 'home',
  modals: {},
  expandedSections: {},
  scrollPositions: {},
  toasts: [],
};

// Player Slice
export const createPlayerSlice: StoreSlice<Pick<GameStoreState, 'player'>> = (set, get) => ({
  player: {
    refreshSave: async () => {
      set({ isLoading: true });
      try {
        // TODO: 调用 Repository
        // const save = await playerRepository.findByUserId(currentUserId);
        // get().player.setSave(save);
      } catch (e) {
        console.error('[PlayerSlice] refreshSave failed:', e);
      } finally {
        set({ isLoading: false });
      }
    },
    
    forceRefreshSave: async () => {
      // 强制从服务器拉取最新
      await get().player.refreshSave();
    },
    
    applyOptimistic: (updates) => {
      set(state => ({
        save: state.save ? { ...state.save, ...updates } : null,
        pendingOps: [...state.pendingOps, updates],
      }));
    },
    
    commitOptimistic: async () => {
      const { pendingOps, save } = get();
      if (!save || pendingOps.length === 0) return;
      
      try {
        // TODO: 批量写入 Repository
        // await playerRepository.savePartial(save.id, mergedOps);
        set({ pendingOps: [], lastSyncedAt: Date.now() });
      } catch (e) {
        console.error('[PlayerSlice] commitOptimistic failed:', e);
        // 可选择 rollback 或保留 pendingOps 重试
      }
    },
    
    rollbackOptimistic: () => {
      // 丢弃本地乐观更新，重新拉取服务器数据
      get().player.refreshSave();
      set({ pendingOps: [] });
    },
    
    setSave: (save) => set({ save, isLoading: false, lastSyncedAt: Date.now() }),
  },
});

// Career Slice
export const createCareerSlice: StoreSlice<Pick<GameStoreState, 'career'>> = (set, get) => ({
  career: {
    checkPromotionReady: () => {
      const save = get().save;
      if (!save) return { ready: false, reasons: ['无存档'] };
      // TODO: 调用 PromotionService.evaluateReadiness
      return { ready: false, reasons: [] };
    },
    
    requestPromotion: async (path: string) => {
      const save = get().save;
      if (!save) return { success: false, error: '无存档' };
      
      set({ isAdvancing: true });
      try {
        // TODO: 调用 PromotionService.executePromotion
        // const result = await promotionService.executePromotion(save, path);
        // if (result.success) get().player.setSave(result.updatedSave);
        return { success: false, error: '未实现' };
      } finally {
        set({ isAdvancing: false });
      }
    },
    
    switchCareerLine: async (line: string) => {
      get().player.applyOptimistic({ preferredCareerLine: line });
      await get().player.commitOptimistic();
    },
    
    launchVote: async () => {
      return { success: false, error: '未实现' };
    },
    
    attendPartyCongress: async () => {
      return { success: false, error: '未实现' };
    },
  },
});

// Governance Slice
export const createGovernanceSlice: StoreSlice<Pick<GameStoreState, 'governance'>> = (set, get) => ({
  governance: {
    executePolicy: async (policy) => {
      return { success: false, error: '未实现' };
    },
    
    allocateCityFund: async (project) => {
      const save = get().save;
      if (!save) return;
      
      const currentFund = save.resources?.cityGovFund ?? 0;
      const cost = project.cost ?? 0;
      
      if (currentFund < cost) {
        get().ui.showToast(`城建经费不足（当前${currentFund}，需${cost}）`, 'error');
        return;
      }
      
      get().player.applyOptimistic({ 
        resources: { ...save.resources, cityGovFund: currentFund - cost } 
      });
      await get().player.commitOptimistic();
    },
    
    adjustDepartmentBudget: (dept: string, delta: number) => {
      // TODO
    },
    
    launchFiveYearPlan: async (plan) => {
      return { success: false, error: '未实现' };
    },
  },
});

// Personnel Slice
export const createPersonnelSlice: StoreSlice<Pick<GameStoreState, 'personnel'>> = (set, get) => ({
  personnel: {
    recruit: async (type) => ({ success: false, error: '未实现' }),
    appoint: async (subId, position) => ({ success: false, error: '未实现' }),
    assess: async (subId) => ({ success: false, error: '未实现' }),
    transfer: async (subId, targetCity) => {},
    dismiss: async (subId) => {},
    assignSecretary: async (subId) => {},
  },
});

// Finance Slice
export const createFinanceSlice: StoreSlice<Pick<GameStoreState, 'finance'>> = (set, get) => ({
  finance: {
    investPersonal: async (template) => ({ success: false, error: '未实现' }),
    claimSalary: async () => {},
    manageProvidentFund: async (action) => {},
    tradeStocks: async (order) => {},
  },
});

// Political Slice
export const createPoliticalSlice: StoreSlice<Pick<GameStoreState, 'political'>> = (set, get) => ({
  political: {
    joinFaction: async (faction) => {},
    donateToFaction: async (amount) => {},
    triggerDisciplineInspection: async (target) => ({ success: false, error: '未实现' }),
    handleBriberyEvent: async (choice) => {},
    manageLeagueWork: async (action) => {},
  },
});

// System Slice
export const createSystemSlice: StoreSlice<Pick<GameStoreState, 'system'>> = (set, get) => ({
  system: {
    setTimeGranularity: (g) => {
      get().player.applyOptimistic({ timeGranularity: g });
      get().player.commitOptimistic();
    },
    
    setAutoAdvance: (enabled) => {
      get().player.applyOptimistic({ isRunning: enabled });
      get().player.commitOptimistic();
    },
    
    setSpeedMultiplier: (m) => {
      get().player.applyOptimistic({ speedMultiplier: m });
      get().player.commitOptimistic();
    },
    
    redeemCode: async (code) => ({ success: false, error: '未实现' }),
    
    createSaveSlot: async (label) => {},
    loadSaveSlot: async (slot) => {},
    resetGame: async () => {},
    
    advanceTime: async () => {
      const save = get().save;
      if (!save || get().isAdvancing) return;
      
      set({ isAdvancing: true });
      try {
        // TODO: 调用 GameClock.advance
        // const newSave = await gameClock.advance(save);
        // get().player.setSave(newSave);
        // get().system.setAutoAdvance(false); // 单步推进后停止
      } catch (e) {
        console.error('[SystemSlice] advanceTime failed:', e);
        get().ui.showToast('时间推进失败', 'error');
      } finally {
        set({ isAdvancing: false });
      }
    },
  },
});

// UI Slice
export const createUISlice: StoreSlice<Pick<GameStoreState, 'ui'>> = (set, get) => ({
  ui: {
    setActiveTab: (tab) => set(state => ({
      uiFlags: { ...state.uiFlags, activeTab: tab },
    })),
    
    openModal: (name) => set(state => ({
      uiFlags: { ...state.uiFlags, modals: { ...state.uiFlags.modals, [name]: true } },
    })),
    
    closeModal: (name) => set(state => {
      const modals = { ...state.uiFlags.modals };
      delete modals[name];
      return { uiFlags: { ...state.uiFlags, modals } };
    }),
    
    toggleSection: (name) => set(state => ({
      uiFlags: {
        ...state.uiFlags,
        expandedSections: { ...state.uiFlags.expandedSections, [name]: !state.uiFlags.expandedSections[name] },
      },
    })),
    
    setScrollPosition: (key, y) => set(state => ({
      uiFlags: {
        ...state.uiFlags,
        scrollPositions: { ...state.uiFlags.scrollPositions, [key]: y },
      },
    })),
    
    showToast: (message, type) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toast = { id, message, type, timestamp: Date.now() };
      set(state => ({
        uiFlags: { ...state.uiFlags, toasts: [...state.uiFlags.toasts, toast] },
      }));
      // Auto dismiss after 4s
      setTimeout(() => get().ui.dismissToast(id), 4000);
    },
    
    dismissToast: (id) => set(state => ({
      uiFlags: {
        ...state.uiFlags,
        toasts: state.uiFlags.toasts.filter(t => t.id !== id),
      },
    })),
  },
});

// ===== Combined Store Factory =====

export function createGameStore() {
  const initialState: Partial<GameStoreState> = {
    save: null,
    isLoading: true,
    lastSyncedAt: null,
    isAdvancing: false,
    pendingOps: [],
    uiFlags: initialUIState,
  };

  const store = create<GameStoreState>()(
    devtools(
      persist(
        (set, get, api) => ({
          ...initialState,
          ...createPlayerSlice(set, get, api),
          ...createCareerSlice(set, get, api),
          ...createGovernanceSlice(set, get, api),
          ...createPersonnelSlice(set, get, api),
          ...createFinanceSlice(set, get, api),
          ...createPoliticalSlice(set, get, api),
          ...createSystemSlice(set, get, api),
          ...createUISlice(set, get, api),
        }),
        {
          name: 'zhengtu-game-store',
          storage: createJSONStorage(() => localStorage),
          partialize: (state) => ({
            save: state.save,
            lastSyncedAt: state.lastSyncedAt,
            // 不持久化运行时状态
          }),
          version: 1,
          migrate: (persisted: any, version: number) => {
            if (version === 0) {
              return { ...persisted, lastSyncedAt: Date.now() };
            }
            return persisted;
          },
        }
      ),
      { name: 'ZhengTuGameStore', enabled: process.env.NODE_ENV === 'development' }
    )
  );

  return store;
}

// ===== Selectors =====

export const selectSave = (state: GameStoreState) => state.save;
export const selectIsLoading = (state: GameStoreState) => state.isLoading;
export const selectIsAdvancing = (state: GameStoreState) => state.isAdvancing;
export const selectUIFlags = (state: GameStoreState) => state.uiFlags;
export const selectPlayerActions = (state: GameStoreState) => state.player;
export const selectCareerActions = (state: GameStoreState) => state.career;
export const selectGovernanceActions = (state: GameStoreState) => state.governance;
export const selectPersonnelActions = (state: GameStoreState) => state.personnel;
export const selectFinanceActions = (state: GameStoreState) => state.finance;
export const selectPoliticalActions = (state: GameStoreState) => state.political;
export const selectSystemActions = (state: GameStoreState) => state.system;
export const selectUIActions = (state: GameStoreState) => state.ui;

// Hook helpers (使用时 import { useGameStore } from './store')
// export const useSave = () => useGameStore(selectSave);
// export const usePlayerActions = () => useGameStore(selectPlayerActions);
// ...