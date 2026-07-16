import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { StateCreator } from 'zustand';

// ===== Type Definitions =====

export interface GameStoreState {
  save: any | null;
  isLoading: boolean;
  lastSyncedAt: number | null;
  isAdvancing: boolean;
  pendingOps: any[];
  uiFlags: UIState;
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
  allocateCityFund: (project: any) => Promise<any>;
  adjustDepartmentBudget: (dept: string, delta: number) => void;
  launchFiveYearPlan: (plan: any) => Promise<any>;
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

// ===== Slice Type =====

type StoreSlice = (set: any, get: any, api: any) => Partial<GameStoreState>;

const initialUIState: UIState = {
  activeTab: 'home',
  modals: {},
  expandedSections: {},
  scrollPositions: {},
  toasts: [],
};

// ===== Slice Creators =====

function createPlayerSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    player: {
      refreshSave: async () => {
        set({ isLoading: true });
        try {
          // TODO: 调用 Repository
          set({ isLoading: false });
        } catch (e) {
          console.error('[PlayerSlice] refreshSave failed:', e);
          set({ isLoading: false });
        }
      },
      forceRefreshSave: async () => {
        await get().player.refreshSave();
      },
      applyOptimistic: (updates: any) => {
        set((state: GameStoreState) => ({
          save: state.save ? { ...state.save, ...updates } : null,
          pendingOps: [...state.pendingOps, updates],
        }));
      },
      commitOptimistic: async () => {
        const state = get() as GameStoreState;
        if (!state.save || state.pendingOps.length === 0) return;
        try {
          set({ pendingOps: [], lastSyncedAt: Date.now() });
        } catch (e) {
          console.error('[PlayerSlice] commitOptimistic failed:', e);
        }
      },
      rollbackOptimistic: () => {
        set({ pendingOps: [] });
        get().player.refreshSave();
      },
      setSave: (save: any) => set({ save, isLoading: false, lastSyncedAt: Date.now() }),
    },
  };
}

function createCareerSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    career: {
      checkPromotionReady: () => {
        const save = (get() as GameStoreState).save;
        if (!save) return { ready: false, reasons: ['无存档'] };
        return { ready: false, reasons: [] };
      },
      requestPromotion: async (path: string) => {
        return { success: false, error: '未实现', requiresFollowDecision: false, requiresSecretaryPick: false };
      },
      switchCareerLine: async (line: string) => {
        get().player.applyOptimistic({ preferredCareerLine: line });
        await get().player.commitOptimistic();
      },
      launchVote: async () => ({ success: false, error: '未实现' }),
      attendPartyCongress: async () => ({ success: false, error: '未实现' }),
    },
  };
}

function createGovernanceSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    governance: {
      executePolicy: async (policy: any) => ({ success: false, error: '未实现' }),
      allocateCityFund: async (project: any) => {
        const state = get() as GameStoreState;
        const save = state.save;
        if (!save) return { success: false, error: '无存档' };
        const currentFund = save.resources?.cityGovFund ?? 0;
        const cost = project.cost ?? 0;
        if (currentFund < cost) {
          state.ui.showToast(`城建经费不足（当前${currentFund}，需${cost}）`, 'error');
          return { success: false, error: '经费不足' };
        }
        state.player.applyOptimistic({ resources: { ...save.resources, cityGovFund: currentFund - cost } });
        await state.player.commitOptimistic();
        return { success: true };
      },
      adjustDepartmentBudget: (dept: string, delta: number) => {},
      launchFiveYearPlan: async (plan: any) => ({ success: false, error: '未实现' }),
    },
  };
}

function createPersonnelSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    personnel: {
      recruit: async (type: string) => ({ success: false, error: '未实现' }),
      appoint: async (subId: string, position: string) => ({ success: false, error: '未实现' }),
      assess: async (subId: string) => ({ success: false, error: '未实现' }),
      transfer: async (subId: string, targetCity: string) => {},
      dismiss: async (subId: string) => {},
      assignSecretary: async (subId: string) => {},
    },
  };
}

function createFinanceSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    finance: {
      investPersonal: async (template: any) => ({ success: false, error: '未实现' }),
      claimSalary: async () => {},
      manageProvidentFund: async (action: any) => {},
      tradeStocks: async (order: any) => {},
    },
  };
}

function createPoliticalSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    political: {
      joinFaction: async (faction: string) => {},
      donateToFaction: async (amount: number) => {},
      triggerDisciplineInspection: async (target: string) => ({ success: false, error: '未实现' }),
      handleBriberyEvent: async (choice: any) => {},
      manageLeagueWork: async (action: any) => {},
    },
  };
}

function createSystemSlice(set: any, get: any): Partial<GameStoreState> {
  return {
    system: {
      setTimeGranularity: (g: 'day' | 'week' | 'month') => {},
      setAutoAdvance: (enabled: boolean) => {},
      setSpeedMultiplier: (m: 1 | 2 | 4 | 8) => {},
      redeemCode: async (code: string) => ({ success: false, error: '未实现' }),
      createSaveSlot: async (label: string) => {},
      loadSaveSlot: async (slot: number) => {},
      resetGame: async () => {},
      advanceTime: async () => {
        const state = get() as GameStoreState;
        if (!state.save || state.isAdvancing) return;
        set({ isAdvancing: true });
        try {
          // TODO: 调用 GameClock.advance
        } catch (e) {
          console.error('[SystemSlice] advanceTime failed:', e);
          state.ui.showToast('时间推进失败', 'error');
        } finally {
          set({ isAdvancing: false });
        }
      },
    },
  };
}

function createUISlice(set: any, get: any): Partial<GameStoreState> {
  return {
    ui: {
      setActiveTab: (tab: string) => set((s: GameStoreState) => ({ uiFlags: { ...s.uiFlags, activeTab: tab } })),
      openModal: (name: string) => set((s: GameStoreState) => ({ uiFlags: { ...s.uiFlags, modals: { ...s.uiFlags.modals, [name]: true } } })),
      closeModal: (name: string) => set((s: GameStoreState) => {
        const modals = { ...s.uiFlags.modals };
        delete modals[name];
        return { uiFlags: { ...s.uiFlags, modals } };
      }),
      toggleSection: (name: string) => set((s: GameStoreState) => ({
        uiFlags: { ...s.uiFlags, expandedSections: { ...s.uiFlags.expandedSections, [name]: !s.uiFlags.expandedSections[name] } },
      })),
      setScrollPosition: (key: string, y: number) => set((s: GameStoreState) => ({
        uiFlags: { ...s.uiFlags, scrollPositions: { ...s.uiFlags.scrollPositions, [key]: y } },
      })),
      showToast: (message: string, type: Toast['type']) => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const toast: Toast = { id, message, type, timestamp: Date.now() };
        set((s: GameStoreState) => ({ uiFlags: { ...s.uiFlags, toasts: [...s.uiFlags.toasts, toast] } }));
        setTimeout(() => get().ui.dismissToast(id), 4000);
      },
      dismissToast: (id: string) => set((s: GameStoreState) => ({
        uiFlags: { ...s.uiFlags, toasts: s.uiFlags.toasts.filter((t: Toast) => t.id !== id) },
      })),
    },
  };
}

// ===== Combined Store Factory =====

export function createGameStore() {
  const initialState = {
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
          ...createPlayerSlice(set, get),
          ...createCareerSlice(set, get),
          ...createGovernanceSlice(set, get),
          ...createPersonnelSlice(set, get),
          ...createFinanceSlice(set, get),
          ...createPoliticalSlice(set, get),
          ...createSystemSlice(set, get),
          ...createUISlice(set, get),
        } as GameStoreState),
        {
          name: 'zhengtu-game-store',
          partialize: (state) => ({ save: state.save, lastSyncedAt: state.lastSyncedAt }),
          version: 1,
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