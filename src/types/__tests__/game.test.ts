import { getRandomCityForRank, RANK_CONFIG } from '@/types/game';

describe('getRandomCityForRank', () => {
  it('rankLevel=0 不崩溃，返回有效字符串', () => {
    const city = getRandomCityForRank(0);
    expect(typeof city).toBe('string');
    expect(city.length).toBeGreaterThan(0);
  });

  it('rankLevel=-1 不崩溃', () => {
    const city = getRandomCityForRank(-1);
    expect(typeof city).toBe('string');
    expect(city.length).toBeGreaterThan(0);
  });

  it('rankLevel=5 正常返回城市名', () => {
    const city = getRandomCityForRank(5);
    expect(typeof city).toBe('string');
    expect(city.length).toBeGreaterThan(0);
  });

  it('rankLevel=12 返回部委名', () => {
    const city = getRandomCityForRank(12);
    expect(typeof city).toBe('string');
    expect(city.length).toBeGreaterThan(0);
  });

  it('rankLevel=14 不崩溃', () => {
    const city = getRandomCityForRank(14);
    expect(typeof city).toBe('string');
    expect(city.length).toBeGreaterThan(0);
  });

  it('连续调用多次不崩溃', () => {
    for (let i = 0; i < 100; i++) {
      const city = getRandomCityForRank(0);
      expect(typeof city).toBe('string');
    }
  });
});

describe('RANK_CONFIG fallback', () => {
  it('RANK_CONFIG[1] 存在且为有效配置', () => {
    const cfg = RANK_CONFIG[1];
    expect(cfg).toBeDefined();
    expect(cfg.requiredTenureYears).toBeDefined();
    expect(cfg.requiredMerit).toBeDefined();
    expect(cfg.name).toBeDefined();
  });

  it('RANK_CONFIG[999] 为 undefined 但不影响兜底逻辑', () => {
    const cfg = RANK_CONFIG[999] ?? RANK_CONFIG[1];
    expect(cfg).toBeDefined();
    expect(cfg.requiredTenureYears).toBeGreaterThan(0);
  });
});
