import { performMonthlySettlement, applyMonthlySettlement, GameClock } from '@/infrastructure/time/GameClock';
import { KPIEngine } from '@/domains/city/services/KPIEngine';
import { FormulaRegistry } from '@/domains/city/formulas/FormulaRegistry';
import type { RandomService } from '@/domains/shared/kernel';
import { PlayerFactory } from '@/tests/factories';

function createMockRandom(sequence: number[]): RandomService {
  let i = 0;
  return {
    next: () => sequence[i++ % sequence.length] ?? 0.5,
    nextInt: (max: number) => Math.floor((sequence[i++ % sequence.length] ?? 0.5) * max),
    nextRange: (min: number, max: number) => min + (sequence[i++ % sequence.length] ?? 0.5) * (max - min),
  };
}

describe('GameClock (Unit)', () => {
  const mockRandom = createMockRandom([0.5, 0.5, 0.5, 0.5, 0.5, 0.3, 0.7, 0.1, 0.9, 0.2, 0.8, 0.4]);
  const formulaRegistry = new FormulaRegistry();
  const kpiEngine = new KPIEngine(new Map(), formulaRegistry, mockRandom);
  const clock = new GameClock(kpiEngine, mockRandom);

  describe('performMonthlySettlement', () => {
    it('should advance gameDays by 30', () => {
      const player = PlayerFactory.create({ timeline: { gameDays: 350, lastMonthDay: 320 } });
      const city: any = {
        cityId: 'test',
        indicators: { gdp: 60, livelihood: 55, ecology: 50, business: 55, security: 60 },
        departments: [],
        fundAccount: { cityGovFund: 1000, fundBalance: 50000, taxRevenue: 100000 },
      };

      const result = performMonthlySettlement(player, city, kpiEngine);

      expect(result.newGameDays).toBe(380);
      expect(result.delta).toBeDefined();
    });

    it('should detect annual bonus month at year boundary', () => {
      const player = PlayerFactory.create({ timeline: { gameDays: 350, lastMonthDay: 320 } });
      const city: any = {
        cityId: 'test',
        indicators: { gdp: 60, livelihood: 55, ecology: 50, business: 55, security: 60 },
        departments: [],
        fundAccount: { cityGovFund: 1000, fundBalance: 50000, taxRevenue: 100000 },
      };

      const result = performMonthlySettlement(player, city, kpiEngine);

      expect(result.isAnnualBonus).toBe(true);
      expect(result.annualBonus).toBeGreaterThanOrEqual(0);
    });

    it('should check promotion at year boundary', () => {
      const player = PlayerFactory.create({ timeline: { gameDays: 350, lastMonthDay: 320 } });
      const city: any = {
        cityId: 'test',
        indicators: { gdp: 60, livelihood: 55, ecology: 50, business: 55, security: 60 },
        departments: [],
        fundAccount: { cityGovFund: 1000, fundBalance: 50000, taxRevenue: 100000 },
      };

      const result = performMonthlySettlement(player, city, kpiEngine);

      expect(result.shouldCheckPromotion).toBe(true);
    });
  });

  describe('applyMonthlySettlement', () => {
    it('should update player timeline and attributes', () => {
      const player = PlayerFactory.create({ timeline: { gameDays: 350, lastMonthDay: 320 } });
      const result = {
        newGameDays: 380,
        delta: {
          gameDays: 30,
          personalSavingsChange: 5000,
          providentFundChange: 1000,
          meritGain: 10,
          cityGovFundChange: 50,
          cityGovFundBalance: 1050,
          fundBalanceChange: 10000,
          taxRevenueChange: 50000,
          indicatorDrifts: {},
          bossFavorChange: 1,
          securityIndexChange: 0,
          publicOpinionChange: -2,
          inspectionRiskChange: 2,
          massIncidentTriggered: false,
          briberyEventTriggered: false,
        },
        isAnnualBonus: true,
        annualBonus: 6000,
        shouldCheckPromotion: true,
        massIncidentTriggered: false,
        briberyEventTriggered: false,
      };

      const updates = applyMonthlySettlement(player, result);

      expect(updates.timeline?.gameDays).toBe(380);
      expect(updates.timeline?.lastMonthDay).toBe(380);
      expect(updates.attributes?.meritPoints).toBe((player.attributes.meritPoints ?? 0) + 10);
      expect(updates.resources?.cityGovFund).toBe(1050);
    });
  });

  describe('GameClock.advanceOneMonth', () => {
    it('should return player updates and settlement', () => {
      const player = PlayerFactory.create({ timeline: { gameDays: 350, lastMonthDay: 320 } });
      const city: any = {
        cityId: 'test',
        indicators: { gdp: 60, livelihood: 55, ecology: 50, business: 55, security: 60 },
        departments: [],
        fundAccount: { cityGovFund: 1000, fundBalance: 50000, taxRevenue: 100000 },
      };

      const { playerUpdates, settlement } = clock.advanceOneMonth(player, city);

      expect(playerUpdates).toBeDefined();
      expect(settlement).toBeDefined();
      expect(settlement.newGameDays).toBe(380);
    });
  });
});