import { getRankCostMultiplier, getDeptQuota, LINE_DATA } from '@/lib/lineGameplay';

describe('getRankCostMultiplier', () => {
  it.each([
    [1, 1], [2, 1], [3, 1],
    [4, 5], [5, 5], [6, 5],
    [7, 20], [8, 20], [9, 20],
    [10, 60], [11, 60],
    [12, 200], [13, 200], [14, 200], [15, 200],
  ])('等级 %i 应返回倍率 %i', (rank, expected) => {
    expect(getRankCostMultiplier(rank)).toBe(expected);
  });
});

describe('LINE_DATA', () => {
  it('四条路线都有数据', () => {
    expect(Object.keys(LINE_DATA)).toEqual(['党务线', '行政线', '纪检线', '团派线']);
  });

  it('每条路线都有部门、KPI 和任务', () => {
    for (const line of Object.keys(LINE_DATA)) {
      expect(LINE_DATA[line].departments.length).toBeGreaterThan(0);
      expect(LINE_DATA[line].kpi.length).toBeGreaterThan(0);
      expect(LINE_DATA[line].tasks.length).toBeGreaterThan(0);
    }
  });

  it('每条路线的 KPI 权重之和为 1', () => {
    for (const line of Object.keys(LINE_DATA)) {
      const weightSum = LINE_DATA[line].kpi.reduce((s, k) => s + k.weight, 0);
      expect(weightSum).toBeCloseTo(1, 2);
    }
  });
});

describe('getDeptQuota', () => {
  const mockDept = { name: '县财政局', icon: '', desc: '', rankRange: [4, 6], actions: [] };

  it('更高等级返回更少名额', () => {
    const lowQuota = getDeptQuota(mockDept, 5, 365);
    const highQuota = getDeptQuota(mockDept, 11, 365);
    expect(highQuota).toBeLessThanOrEqual(lowQuota);
  });

  it('名额至少为 1', () => {
    for (let r = 1; r <= 15; r++) {
      expect(getDeptQuota(mockDept, r, 365)).toBeGreaterThanOrEqual(1);
    }
  });
});
