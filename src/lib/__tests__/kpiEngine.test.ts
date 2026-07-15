import { computeKpi } from '@/lib/kpiEngine';
import type { KpiSaveSnapshot } from '@/types/game';

function baseSnapshot(overrides?: Partial<KpiSaveSnapshot>): KpiSaveSnapshot {
  return {
    rankLevel: 5,
    careerPath: 'government',
    moralValue: 70,
    securityIndex: 60,
    cityGdp: 60,
    cityLivelihood: 55,
    cityEcology: 50,
    cityBusiness: 45,
    bossFavor: 50,
    boss2Favor: 50,
    boss3Favor: 50,
    annualRankPct: 0.5,
    taxRevenue: 0,
    tenureYears: 2,
    meritPoints: 200,
    lineKpiScore: 50,
    inspectionRisk: 10,
    publicOpinionIndex: 60,
    ...overrides,
  };
}

describe('computeKpi', () => {
  describe('careerPath discipline — B4 regression tests', () => {
    it('纪律线 KPI 包含稳定性维度', () => {
      const result = computeKpi(baseSnapshot({ careerPath: 'discipline' }));
      const stabilityDim = result.dimensions.find(d => d.key === 'stability');
      expect(stabilityDim).toBeDefined();
    });

    it('非纪律线 KPI 不含稳定性维度', () => {
      const result = computeKpi(baseSnapshot({ careerPath: 'government' }));
      const stabilityDim = result.dimensions.find(d => d.key === 'stability');
      expect(stabilityDim).toBeUndefined();
    });

    it('纪律线有安全类一票否决', () => {
      const result = computeKpi(baseSnapshot({ careerPath: 'discipline', securityIndex: 10 }));
      expect(result.vetoItems.some(v => v.triggered)).toBe(true);
      expect(result.eligible).toBe(false);
    });

    it('非纪律线没有安全类一票否决', () => {
      const result = computeKpi(baseSnapshot({ careerPath: 'government', securityIndex: 10 }));
      const securityVeto = result.vetoItems.find(v => v.label.includes('群体性'));
      expect(securityVeto?.triggered).toBeFalsy();
    });
  });

  describe('eligibility', () => {
    it('高指标应通过晋升门槛', () => {
      const result = computeKpi(baseSnapshot({
        cityGdp: 90, cityLivelihood: 85, cityEcology: 80, cityBusiness: 88,
        moralValue: 85, bossFavor: 80,
      }));
      expect(result.eligible).toBe(true);
    });

    it('低指标应不通过晋升门槛', () => {
      const result = computeKpi(baseSnapshot({
        cityGdp: 20, cityLivelihood: 15, cityEcology: 10, cityBusiness: 5,
        moralValue: 20, bossFavor: 15,
      }));
      expect(result.eligible).toBe(false);
    });

    it('道德值归零应触发一票否决', () => {
      const result = computeKpi(baseSnapshot({ moralValue: 0 }));
      expect(result.eligible).toBe(false);
    });
  });

  describe('dimension calculation', () => {
    it('所有维度权重之和约为 1', () => {
      const result = computeKpi(baseSnapshot({ rankLevel: 5 }));
      const weightSum = result.dimensions.reduce((s, d) => s + d.weight, 0);
      expect(weightSum).toBeCloseTo(1, 2);
    });

    it('不同职级使用不同维度和权重', () => {
      const townResult = computeKpi(baseSnapshot({ rankLevel: 2 }));
      const nationalResult = computeKpi(baseSnapshot({ rankLevel: 13 }));
      expect(townResult.dimensions.length).not.toBe(nationalResult.dimensions.length);
    });

    it('高指标获得高原始分', () => {
      const high = computeKpi(baseSnapshot({ cityGdp: 95 }));
      const low = computeKpi(baseSnapshot({ cityGdp: 5 }));
      expect(high.totalScore).toBeGreaterThan(low.totalScore);
    });
  });

  describe('veto rules', () => {
    it('廉洁度低于 15 触发廉洁否决', () => {
      const result = computeKpi(baseSnapshot({ moralValue: 10 }));
      expect(result.vetoItems.some(v => v.triggered && v.label.includes('廉洁'))).toBe(true);
    });

    it('廉洁度高于 30 不触发廉洁否决', () => {
      const result = computeKpi(baseSnapshot({ moralValue: 50 }));
      expect(result.vetoItems.some(v => v.triggered && v.label.includes('廉洁'))).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('careerPath undefined 时默认视为非纪律线（兼容旧数据）', () => {
      const result = computeKpi(baseSnapshot({ careerPath: undefined }));
      expect(result.dimensions.some(d => d.key === 'stability')).toBe(false);
    });

    it('极端异常值不会导致崩溃', () => {
      const result = computeKpi(baseSnapshot({
        cityGdp: -1, cityLivelihood: 999, moralValue: -5, bossFavor: NaN,
      }));
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
    });
  });
});
