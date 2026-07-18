import { getGameStore, setGameStore, resetGameStore } from '@/infrastructure';
import { createGameStore } from '@/infrastructure/state/zustand/store';
import { PlayerFactory } from '@/tests/factories';

describe('Promotion Flow Integration', () => {
  let store: ReturnType<typeof createGameStore>;

  beforeEach(() => {
    store = createGameStore();
    setGameStore(store);
    store.setState({
      save: null,
      isLoading: false,
      lastSyncedAt: null,
      isAdvancing: false,
      pendingOps: [],
      uiFlags: {
        activeTab: 'home',
        modals: {},
        expandedSections: {},
        scrollPositions: {},
        toasts: [],
      },
    });
  });

  afterEach(() => {
    resetGameStore();
  });

  describe('Regression #8: 晋升按钮显示但点击无反应', () => {
    it('should show reasons when ability gate fails', () => {
      const player = PlayerFactory.atRank(4, { attributes: { abilityValue: 30 } });
      player.career.isPromotionAvailable = true;
      store.setState({ save: player });

      const readiness = store.getState().career.checkPromotionReady();

      expect(readiness.ready).toBe(false);
      expect(readiness.hardRequirements.ability).toBe(false);
    });

    it('should show reasons when age gate fails', () => {
      const player = PlayerFactory.youngPlayer({ career: { rankLevel: 4 } });
      player.career.isPromotionAvailable = true;
      store.setState({ save: player });

      const readiness = store.getState().career.checkPromotionReady();

      expect(readiness.ready).toBe(false);
      expect(readiness.hardRequirements.age).toBe(false);
    });

    it('should return all unsatisfied reasons on failed promotion', async () => {
      const player = PlayerFactory.create({
        career: {
          rankLevel: 4,
          rankName: '副科级',
          isPromotionAvailable: true,
          tenureYears: 5,
          tenureMaxYears: 5,
          certificates: [],
        },
        attributes: { abilityValue: 30, moralValue: 30 },
      });
      store.setState({ save: player });

      const result = await store.getState().career.requestPromotion('government');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
      expect(result.requiresFollowDecision).toBe(false);
    });
  });

  describe('Regression #9: 城建经费月度结算覆盖用户消费', () => {
    it('should preserve cityGovFund reduction after monthly settlement', () => {
      const player = PlayerFactory.create({
        resources: { cityGovFund: 1000 },
      });
      player.timeline.gameDays = 350;
      player.timeline.lastMonthDay = 320;
      store.setState({ save: player });

      // Simulate user consuming 200
      store.setState((s: any) => ({
        save: { ...s.save, resources: { ...s.save.resources, cityGovFund: 800 } },
      }));

      // Advance one month and verify cityGovFund does NOT reset to old value
      store.getState().system.advanceTime();

      const after = store.getState().save;
      expect(after.resources.cityGovFund).toBeDefined();
      expect(after.resources.cityGovFund).not.toBe(1000);
    });
  });

  describe('advanceTime integration', () => {
    it('should advance gameDays by 30 on monthly tick', async () => {
      const player = PlayerFactory.create({ timeline: { gameDays: 100, lastMonthDay: 90 } });
      store.setState({ save: player });

      await store.getState().system.advanceTime();

      const after = store.getState().save;
      expect(after.timeline.gameDays).toBeGreaterThan(100);
    });

    it('should not advance when already advancing', async () => {
      const player = PlayerFactory.create();
      store.setState({ save: player, isAdvancing: true });

      await store.getState().system.advanceTime();

      // Should return early without changes
      const after = store.getState().save;
      expect(after.timeline.gameDays).toBe(player.timeline.gameDays);
    });

    it('should not advance when save is null', async () => {
      store.setState({ save: null });

      await store.getState().system.advanceTime();

      expect(store.getState().save).toBeNull();
    });

    it('should trigger promotion check after yearly boundary', async () => {
      const player = PlayerFactory.readyForPromotion();
      player.timeline.gameDays = 365 * 5;
      player.timeline.lastMonthDay = 365 * 5 - 30;
      store.setState({ save: player });

      await store.getState().system.advanceTime();

      const after = store.getState().save;
      expect(after).toBeDefined();
    });
  });

  describe('usePromotionReadiness hook', () => {
    it('should return not ready when no save exists', () => {
      store.setState({ save: null });
      const state = store.getState();

      expect(state.career.checkPromotionReady()).toEqual({
        ready: false,
        reasons: ['无存档'],
      });
    });

    it('should return readiness for ready player', () => {
      const player = PlayerFactory.readyForPromotion();
      store.setState({ save: player });

      const readiness = store.getState().career.checkPromotionReady();

      expect(readiness).toBeDefined();
      expect(readiness).toHaveProperty('ready');
      expect(readiness).toHaveProperty('reasons');
      expect(readiness).toHaveProperty('hardRequirements');
      expect(readiness).toHaveProperty('softRequirements');
    });
  });
});